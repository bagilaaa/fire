"""
Seeder: loads DataFrames into DB.
Can be called from startup (using file paths) or from upload endpoints (using in-memory DataFrames).
"""
import io
import math
import os
import asyncio
import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.models import BusinessUnit, Manager, Ticket
from app.geo import geocode_best, simplify_address

DATA_DIR = os.getenv("DATA_DIR", "/app/data")


def clean_text(v) -> str:
    if v is None:
        return ""
    s = str(v).strip()
    return "" if not s or s.lower() == "nan" else s


def clean_house(v) -> str:
    if v is None:
        return ""
    if isinstance(v, float):
        if math.isnan(v):
            return ""
        return str(int(v)) if v.is_integer() else str(v)
    s = str(v).strip()
    if not s or s.lower() == "nan":
        return ""
    if s.endswith(".0") and s[:-2].isdigit():
        return s[:-2]
    return s


def read_csv_bytes(data: bytes) -> pd.DataFrame:
    df = pd.read_csv(io.BytesIO(data))
    df.columns = [c.strip() for c in df.columns]
    return df


def read_csv_path(path: str) -> pd.DataFrame:
    df = pd.read_csv(path)
    df.columns = [c.strip() for c in df.columns]
    return df


# ─── Business Units ───────────────────────────────────────────────────────────

async def load_business_units(db: AsyncSession, df: pd.DataFrame, replace: bool = False):
    if replace:
        await db.execute(delete(BusinessUnit))
        await db.commit()

    loop = asyncio.get_event_loop()
    added = 0
    for _, row in df.iterrows():
        name = clean_text(row.get("Офис"))
        addr = clean_text(row.get("Адрес"))
        if not name:
            continue

        existing = await db.execute(select(BusinessUnit).where(BusinessUnit.name == name))
        if existing.scalar_one_or_none():
            continue

        full      = f"{name}, {addr}, Казахстан"
        simp      = f"{name}, {simplify_address(addr)}, Казахстан"
        city_only = f"{name}, Казахстан"

        lat, lon = await loop.run_in_executor(
            None, lambda q=full, s=simp, c=city_only: geocode_best([q, s, c], sleep_sec=0.5)
        )

        db.add(BusinessUnit(name=name, address=addr, lat=lat, lon=lon))
        added += 1

    await db.commit()
    return added


async def seed_business_units(db: AsyncSession):
    path = os.path.join(DATA_DIR, "business_units.csv")
    if not os.path.exists(path):
        return
    df = read_csv_path(path)
    n = await load_business_units(db, df)
    print(f"✓ Business units seeded ({n} added)")


# ─── Managers ─────────────────────────────────────────────────────────────────

async def load_managers(db: AsyncSession, df: pd.DataFrame, replace: bool = False):
    if replace:
        await db.execute(delete(Manager))
        await db.commit()

    added = 0
    for _, row in df.iterrows():
        name     = clean_text(row.get("ФИО"))
        position = clean_text(row.get("Должность"))
        office   = clean_text(row.get("Офис"))
        skills   = clean_text(row.get("Навыки"))
        try:
            workload = int(row.get("Количество обращений в работе", 0))
        except Exception:
            workload = 0

        if not name:
            continue

        existing = await db.execute(select(Manager).where(Manager.full_name == name))
        if existing.scalar_one_or_none():
            continue

        db.add(Manager(
            full_name=name,
            position=position,
            office_name=office,
            skills=skills,
            workload=workload,
        ))
        added += 1

    await db.commit()
    return added


async def seed_managers(db: AsyncSession):
    path = os.path.join(DATA_DIR, "managers.csv")
    if not os.path.exists(path):
        return
    df = read_csv_path(path)
    n = await load_managers(db, df)
    print(f"✓ Managers seeded ({n} added)")


# ─── Tickets ──────────────────────────────────────────────────────────────────

async def load_tickets(db: AsyncSession, df: pd.DataFrame, replace: bool = False):
    if replace:
        await db.execute(delete(Ticket))
        await db.commit()

    desc_col = "Описание" if "Описание" in df.columns else "Описание "

    added = 0
    for _, row in df.iterrows():
        guid = clean_text(row.get("GUID клиента"))
        if not guid:
            continue

        existing = await db.execute(select(Ticket).where(Ticket.client_guid == guid))
        if existing.scalar_one_or_none():
            continue

        db.add(Ticket(
            client_guid=guid,
            client_gender=clean_text(row.get("Пол клиента")),
            client_dob=clean_text(row.get("Дата рождения")),
            description=clean_text(row.get(desc_col, "")),
            attachment=clean_text(row.get("Вложения")),
            segment=clean_text(row.get("Сегмент клиента")),
            country=clean_text(row.get("Страна")),
            region=clean_text(row.get("Область")),
            city=clean_text(row.get("Населённый пункт")),
            street=clean_text(row.get("Улица")),
            house=clean_house(row.get("Дом")),
        ))
        added += 1

    await db.commit()
    return added


async def seed_tickets(db: AsyncSession):
    path = os.path.join(DATA_DIR, "tickets.csv")
    if not os.path.exists(path):
        return
    df = read_csv_path(path)
    n = await load_tickets(db, df)
    print(f"✓ Tickets seeded ({n} added)")