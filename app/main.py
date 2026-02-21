import os
import json
import asyncio
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from typing import List, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.database import init_db, get_db, AsyncSessionLocal
from app.models import Ticket, Manager, BusinessUnit
from app.schemas import (
    TicketOut, TicketDetail, ManagerOut, BusinessUnitOut,
    ProcessResponse, StatsResponse, AIQueryRequest, AIQueryResponse,
    UploadResponse,
)
from app.seeder import (
    seed_business_units, seed_managers, seed_tickets,
    load_business_units, load_managers, load_tickets,
    read_csv_bytes,
)
from app.llm import llm_analyze_ticket
from app.geo import geocode_best, is_kazakhstan
from app.routing import process_ticket_assignment, refresh_office_cache
from openai import OpenAI

# Dedicated thread pool for blocking I/O (LLM + geocoding)
_executor = ThreadPoolExecutor(max_workers=20)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    async with AsyncSessionLocal() as db:
        await seed_business_units(db)
        await seed_managers(db)
        await seed_tickets(db)
        # Pre-load office coords into memory for fast nearest-office lookup
        await refresh_office_cache(db)
    yield
    _executor.shutdown(wait=False)


app = FastAPI(
    title="Ticket Routing Service",
    version="1.0.0",
    description="AI-powered ticket classification and routing for Freedom Finance support",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────── UPLOAD ───────────────────

@app.post("/upload/business-units", response_model=UploadResponse, tags=["Upload"])
async def upload_business_units(
    file: UploadFile = File(..., description="business_units.csv"),
    replace: bool = Query(default=False, description="Delete existing records before import"),
    db: AsyncSession = Depends(get_db),
):
    """Upload business_units.csv. Columns: Офис, Адрес"""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are accepted")
    data = await file.read()
    try:
        df = read_csv_bytes(data)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to parse CSV: {e}")

    if "Офис" not in df.columns or "Адрес" not in df.columns:
        raise HTTPException(status_code=422, detail="CSV must have columns: Офис, Адрес")

    added = await load_business_units(db, df, replace=replace)
    # Refresh in-memory cache after office update
    await refresh_office_cache(db)
    return UploadResponse(
        filename=file.filename,
        rows_total=len(df),
        rows_imported=added,
        message=f"Imported {added} business units (replace={replace})",
    )


@app.post("/upload/managers", response_model=UploadResponse, tags=["Upload"])
async def upload_managers(
    file: UploadFile = File(..., description="managers.csv"),
    replace: bool = Query(default=False, description="Delete existing records before import"),
    db: AsyncSession = Depends(get_db),
):
    """Upload managers.csv. Columns: ФИО, Должность, Офис, Навыки, Количество обращений в работе"""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are accepted")
    data = await file.read()
    try:
        df = read_csv_bytes(data)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to parse CSV: {e}")

    required = {"ФИО", "Офис"}
    if not required.issubset(set(df.columns)):
        raise HTTPException(status_code=422, detail=f"CSV must have columns: {required}")

    added = await load_managers(db, df, replace=replace)
    return UploadResponse(
        filename=file.filename,
        rows_total=len(df),
        rows_imported=added,
        message=f"Imported {added} managers (replace={replace})",
    )


@app.post("/upload/tickets", response_model=UploadResponse, tags=["Upload"])
async def upload_tickets(
    file: UploadFile = File(..., description="tickets.csv"),
    replace: bool = Query(default=False, description="Delete existing records before import"),
    db: AsyncSession = Depends(get_db),
):
    """Upload tickets.csv. Required column: GUID клиента"""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are accepted")
    data = await file.read()
    try:
        df = read_csv_bytes(data)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to parse CSV: {e}")

    if "GUID клиента" not in df.columns:
        raise HTTPException(status_code=422, detail="CSV must have column: GUID клиента")

    added = await load_tickets(db, df, replace=replace)
    return UploadResponse(
        filename=file.filename,
        rows_total=len(df),
        rows_imported=added,
        message=f"Imported {added} tickets (replace={replace})",
    )


# ─────────────────── TICKETS ───────────────────

@app.get("/tickets", response_model=List[TicketOut], tags=["Tickets"])
async def list_tickets(
    skip: int = 0,
    limit: int = 50,
    office: Optional[str] = None,
    ticket_type: Optional[str] = None,
    sentiment: Optional[str] = None,
    language: Optional[str] = None,
    segment: Optional[str] = None,
    processed: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
):
    q = select(Ticket)
    if office:
        q = q.where(Ticket.office_name == office)
    if ticket_type:
        q = q.where(Ticket.ticket_type == ticket_type)
    if sentiment:
        q = q.where(Ticket.sentiment == sentiment)
    if language:
        q = q.where(Ticket.language == language)
    if segment:
        q = q.where(Ticket.segment == segment)
    if processed is True:
        q = q.where(Ticket.processed_at.isnot(None))
    elif processed is False:
        q = q.where(Ticket.processed_at.is_(None))

    q = q.order_by(Ticket.priority.desc().nullslast(), Ticket.created_at.desc())
    q = q.offset(skip).limit(limit)
    result = await db.execute(q)
    return result.scalars().all()


@app.get("/tickets/{ticket_id}", response_model=TicketDetail, tags=["Tickets"])
async def get_ticket(ticket_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Ticket)
        .options(selectinload(Ticket.assigned_manager), selectinload(Ticket.office))
        .where(Ticket.id == ticket_id)
    )
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket


@app.post("/tickets/process", response_model=ProcessResponse, tags=["Tickets"])
async def process_all_tickets(
    limit: int = Query(default=100, description="Max tickets to process"),
    concurrency: int = Query(default=15, description="Parallel workers"),
    db: AsyncSession = Depends(get_db),
):
    """
    Process unanalyzed tickets with maximum concurrency.

    Optimizations:
    - LLM + geocoding run concurrently in a dedicated thread pool
    - Office lookup is pure in-memory (no DB per ticket)
    - DB writes use SELECT FOR UPDATE SKIP LOCKED (no Python lock needed)
    - Each ticket gets its own DB session (no contention)
    """
    result = await db.execute(
        select(Ticket).where(Ticket.processed_at.is_(None)).limit(limit)
    )
    tickets = result.scalars().all()

    semaphore = asyncio.Semaphore(concurrency)
    loop = asyncio.get_event_loop()
    processed_count = 0
    failed_count = 0
    counter_lock = asyncio.Lock()

    async def process_one(ticket: Ticket):
        nonlocal processed_count, failed_count
        async with semaphore:
            try:
                # ── 1 & 2. LLM + Geocoding IN PARALLEL via thread pool ────────
                country = ticket.country or ""
                region  = ticket.region  or ""
                city    = ticket.city    or ""
                street  = ticket.street  or ""
                house   = ticket.house   or ""

                geo_parts = [p for p in [country, region, city, street, house] if p]
                geo_normalization = ", ".join(geo_parts)

                # Fire both blocking calls simultaneously
                llm_future = loop.run_in_executor(
                    _executor, llm_analyze_ticket, ticket.description or ""
                )

                if is_kazakhstan(country) and city:
                    queries = [
                        f"{country}, {region}, {city}, {street}, {house}",
                        f"{city}, {region}, Казахстан",
                        f"{city}, Казахстан",
                    ]
                    geo_future = loop.run_in_executor(
                        _executor, lambda: geocode_best(queries, sleep_sec=0.0)
                    )
                else:
                    geo_future = asyncio.sleep(0)  # instant no-op

                # Await both — total time = max(llm_time, geo_time) not sum
                results = await asyncio.gather(llm_future, geo_future)
                ai = results[0]
                geo_result = results[1]
                clat, clon = geo_result if isinstance(geo_result, tuple) else (None, None)

                # ── 3. DB write — own session, atomic manager lock via FOR UPDATE ──
                async with AsyncSessionLocal() as write_db:
                    async with write_db.begin():
                        t = await write_db.get(Ticket, ticket.id)
                        if t is None or t.processed_at is not None:
                            return
                        await process_ticket_assignment(
                            write_db, t, ai, clat, clon, geo_normalization
                        )
                        t.processed_at = datetime.utcnow()
                        write_db.add(t)
                        # commit happens automatically at end of begin() block

                async with counter_lock:
                    processed_count += 1

            except Exception as e:
                print(f"Error processing ticket {ticket.client_guid}: {e}")
                async with counter_lock:
                    failed_count += 1

    await asyncio.gather(*[process_one(t) for t in tickets])

    return ProcessResponse(
        processed=processed_count,
        failed=failed_count,
        message=f"Processed {processed_count} tickets, {failed_count} failed.",
    )


# ─────────────────── MANAGERS ───────────────────

@app.get("/managers", response_model=List[ManagerOut], tags=["Managers"])
async def list_managers(
    office: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    q = select(Manager)
    if office:
        q = q.where(Manager.office_name == office)
    q = q.order_by(Manager.office_name, Manager.workload)
    result = await db.execute(q)
    return result.scalars().all()


# ─────────────────── OFFICES ───────────────────

@app.get("/offices", response_model=List[BusinessUnitOut], tags=["Offices"])
async def list_offices(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(BusinessUnit).order_by(BusinessUnit.name))
    return result.scalars().all()


# ─────────────────── STATS ───────────────────

@app.get("/stats", response_model=StatsResponse, tags=["Analytics"])
async def get_stats(db: AsyncSession = Depends(get_db)):
    total = (await db.execute(select(func.count()).select_from(Ticket))).scalar()
    processed_count = (
        await db.execute(
            select(func.count()).select_from(Ticket).where(Ticket.processed_at.isnot(None))
        )
    ).scalar()

    by_type_rows = (await db.execute(
        select(Ticket.ticket_type, func.count())
        .where(Ticket.ticket_type.isnot(None))
        .group_by(Ticket.ticket_type)
    )).all()

    by_sent_rows = (await db.execute(
        select(Ticket.sentiment, func.count())
        .where(Ticket.sentiment.isnot(None))
        .group_by(Ticket.sentiment)
    )).all()

    by_office_rows = (await db.execute(
        select(Ticket.office_name, func.count())
        .where(Ticket.office_name.isnot(None))
        .group_by(Ticket.office_name)
    )).all()

    by_lang_rows = (await db.execute(
        select(Ticket.language, func.count())
        .where(Ticket.language.isnot(None))
        .group_by(Ticket.language)
    )).all()

    return StatsResponse(
        total_tickets=total,
        processed_tickets=processed_count,
        by_type={r[0]: r[1] for r in by_type_rows},
        by_sentiment={r[0]: r[1] for r in by_sent_rows},
        by_office={r[0]: r[1] for r in by_office_rows},
        by_language={r[0]: r[1] for r in by_lang_rows},
    )


# ─────────────────── AI ASSISTANT ───────────────────

@app.post("/ai/query", response_model=AIQueryResponse, tags=["Analytics"])
async def ai_query(request: AIQueryRequest, db: AsyncSession = Depends(get_db)):
    """AI assistant: natural language → analytics + optional chart data."""
    stats_result = await get_stats(db)

    tickets_result = await db.execute(
        select(Ticket).where(Ticket.processed_at.isnot(None)).limit(200)
    )
    tickets = tickets_result.scalars().all()

    data_summary = {
        "total_tickets": stats_result.total_tickets,
        "processed_tickets": stats_result.processed_tickets,
        "by_type": stats_result.by_type,
        "by_sentiment": stats_result.by_sentiment,
        "by_office": stats_result.by_office,
        "by_language": stats_result.by_language,
        "tickets_sample": [
            {
                "city": t.city, "office": t.office_name, "type": t.ticket_type,
                "sentiment": t.sentiment, "priority": t.priority,
                "language": t.language, "segment": t.segment,
            }
            for t in tickets
        ],
    }

    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY", ""))
    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    system_prompt = """Ты — аналитик данных службы поддержки Freedom Finance.
У тебя есть данные об обращениях клиентов.
Отвечай на вопросы пользователя на основе предоставленных данных.
Если вопрос подразумевает построение графика, верни JSON в поле chart_data со структурой:
{
  "chart_type": "bar"|"pie"|"line",
  "title": "...",
  "labels": [...],
  "values": [...],
  "x_label": "...",
  "y_label": "..."
}
Верни ответ в формате JSON: {"answer": "...", "chart_data": null или объект выше}.
Отвечай на русском языке."""

    try:
        resp = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Данные:\n{json.dumps(data_summary, ensure_ascii=False)}\n\nВопрос: {request.query}"},
            ],
            temperature=0.3,
            response_format={"type": "json_object"},
        )
        result = json.loads(resp.choices[0].message.content)
        return AIQueryResponse(
            answer=result.get("answer", ""),
            chart_data=result.get("chart_data"),
        )
    except Exception as e:
        return AIQueryResponse(answer=f"Ошибка при обработке запроса: {e}", chart_data=None)


@app.get("/health", tags=["System"])
async def health():
    return {"status": "ok", "service": "ticket-routing"}