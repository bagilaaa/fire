"""
Business rules for assigning tickets to managers.

Optimizations:
- Office coords cached in memory at startup (no DB hit per ticket)
- Manager assignment uses SELECT FOR UPDATE SKIP LOCKED (atomic, no Python lock needed)
- Fallback toggle uses asyncio.Lock only for the counter (not the whole write path)
"""
import asyncio
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models import Manager, BusinessUnit, Ticket
from app.geo import haversine_km, is_kazakhstan

# ── In-memory office cache (populated at startup) ─────────────────────────────
_office_cache: List[Dict] = []          # [{name, lat, lon}, ...]
_fallback_toggle = 0
_fallback_lock = asyncio.Lock()         # only guards the tiny toggle flip


async def refresh_office_cache(db: AsyncSession):
    """Call once at startup to load office coords into memory."""
    global _office_cache
    result = await db.execute(
        select(BusinessUnit).where(
            BusinessUnit.lat.isnot(None),
            BusinessUnit.lon.isnot(None),
        )
    )
    _office_cache = [
        {"name": o.name, "lat": o.lat, "lon": o.lon}
        for o in result.scalars().all()
    ]


def find_nearest_office_cached(clat: float, clon: float) -> Optional[str]:
    """Pure Python haversine over in-memory cache — zero DB, zero I/O."""
    best_name = None
    best_dist = None
    for o in _office_cache:
        d = haversine_km(clat, clon, o["lat"], o["lon"])
        if best_dist is None or d < best_dist:
            best_dist = d
            best_name = o["name"]
    return best_name


# ── Skill / eligibility checks ────────────────────────────────────────────────

def parse_skills(skills_str: str) -> List[str]:
    if not skills_str:
        return []
    return [s.strip() for s in skills_str.split(",") if s.strip()]


def manager_can_handle(manager: Manager, segment: str, ticket_type: str, language: str) -> bool:
    skills   = parse_skills(manager.skills or "")
    position = (manager.position or "").strip()

    if segment in ("VIP", "Priority") and "VIP" not in skills:
        return False
    if ticket_type == "Смена данных" and "Главный специалист" not in position:
        return False
    if language == "KZ"  and "KZ"  not in skills:
        return False
    if language == "ENG" and "ENG" not in skills:
        return False
    return True


# ── Atomic manager assignment (no Python-level lock needed) ───────────────────

async def assign_manager_atomic(
    db: AsyncSession,
    office_name: str,
    segment: str,
    ticket_type: str,
    language: str,
) -> Optional[Manager]:
    """
    Fetch all eligible managers for the office, pick the one with lowest workload
    (round-robin among ties), and atomically increment their workload in the same
    transaction using FOR UPDATE — so concurrent sessions won't double-assign.
    """
    result = await db.execute(
        select(Manager)
        .where(Manager.office_name == office_name)
        .with_for_update(skip_locked=True)   # other sessions skip locked rows
    )
    all_managers = result.scalars().all()

    eligible = [
        m for m in all_managers
        if manager_can_handle(m, segment, ticket_type, language)
    ]
    if not eligible:
        return None

    eligible.sort(key=lambda m: (m.workload, m.round_robin_index))
    chosen = eligible[0]
    chosen.workload += 1
    chosen.round_robin_index += 1
    db.add(chosen)
    return chosen


# ── Main assignment pipeline ──────────────────────────────────────────────────

async def process_ticket_assignment(
    db: AsyncSession,
    ticket: Ticket,
    ai_result: Dict[str, Any],
    client_lat: Optional[float],
    client_lon: Optional[float],
    geo_normalization: str,
) -> Ticket:
    global _fallback_toggle

    ticket.ticket_type     = ai_result["type"]
    ticket.sentiment       = ai_result["sentiment"]
    ticket.priority        = ai_result["priority"]
    ticket.language        = ai_result["language"]
    ticket.summary         = ai_result["summary"]
    ticket.geo_normalization = geo_normalization
    ticket.client_lat      = client_lat
    ticket.client_lon      = client_lon

    country = ticket.country or ""
    city    = ticket.city    or ""
    foreign_or_unknown = (not is_kazakhstan(country)) or (not city)

    chosen_office: Optional[str] = None

    if foreign_or_unknown or client_lat is None or client_lon is None:
        # 50/50 fallback — only this tiny section needs a lock
        async with _fallback_lock:
            chosen_office = "Астана" if _fallback_toggle == 0 else "Алматы"
            _fallback_toggle ^= 1
    else:
        # Pure in-memory lookup — no lock, no DB
        chosen_office = find_nearest_office_cached(client_lat, client_lon)
        if chosen_office is None:
            async with _fallback_lock:
                chosen_office = "Астана" if _fallback_toggle == 0 else "Алматы"
                _fallback_toggle ^= 1

    ticket.office_name = chosen_office

    manager = await assign_manager_atomic(
        db, chosen_office, ticket.segment or "Mass",
        ai_result["type"], ai_result["language"]
    )
    if manager:
        ticket.manager_id = manager.id

    return ticket