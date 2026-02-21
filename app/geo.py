import math
import re
import time
import json
import os
import requests
from typing import Optional, Tuple, Dict, Any, List

NOMINATIM_USER_AGENT = "tickets-routing/1.0"
CACHE_FILE = "/tmp/geocode_cache.json"

_cache: Dict[str, Any] = {}


def _load_cache():
    global _cache
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                _cache = json.load(f)
        except Exception:
            _cache = {}


def _save_cache():
    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(_cache, f, ensure_ascii=False, indent=2)


_load_cache()


def remove_control_chars(s: str) -> str:
    return re.sub(r"[\x00-\x1f\x7f]", " ", s)


def normalize_ru_address(s: str) -> str:
    s = remove_control_chars(s)
    s = s.replace("«", '"').replace("»", '"')
    s = re.sub(r"\s+", " ", s).strip()
    repl = {
        "пр-т": "проспект",
        "пр.": "проспект",
        "ул.": "улица",
        "д.": "дом",
        "зд.": "здание",
        "мкр": "микрорайон",
        "БЦ": "бизнес центр",
        "Бизнес-центр": "бизнес центр",
    }
    for k, v in repl.items():
        s = re.sub(rf"\b{re.escape(k)}\b", v, s, flags=re.IGNORECASE)
    return re.sub(r"\s+", " ", s).strip()


def simplify_address(s: str) -> str:
    s = normalize_ru_address(s)
    patterns = [
        r"\b\d+\s*этаж\b", r"\bэтаж\b",
        r"\bофис\s*№?\s*\w+\b", r"\bоф\.\s*\w+\b",
        r"\bНП\s*\d+\b", r"\bправое\s*крыло\b", r"\bлевое\s*крыло\b",
    ]
    for p in patterns:
        s = re.sub(p, "", s, flags=re.IGNORECASE)
    s = re.sub(r"\s*,\s*", ", ", s)
    s = re.sub(r"(,\s*){2,}", ", ", s)
    return re.sub(r"\s+", " ", s).strip(" ,")


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def geocode_single(query: str, sleep_sec: float = 1.0) -> Tuple[Optional[float], Optional[float]]:
    query = normalize_ru_address(query.strip())
    if not query:
        return None, None

    if query in _cache:
        v = _cache[query]
        return v.get("lat"), v.get("lon")

    url = "https://nominatim.openstreetmap.org/search"
    params = {"format": "json", "limit": 1, "q": query}
    headers = {"User-Agent": NOMINATIM_USER_AGENT, "Accept-Language": "ru,en"}

    lat = lon = None
    try:
        resp = requests.get(url, params=params, headers=headers, timeout=25)
        resp.raise_for_status()
        data = resp.json()
        if data:
            lat = float(data[0]["lat"])
            lon = float(data[0]["lon"])
    except Exception:
        pass

    _cache[query] = {"lat": lat, "lon": lon}
    _save_cache()
    time.sleep(max(0.0, sleep_sec))
    return lat, lon


def geocode_best(queries: List[str], sleep_sec: float = 1.0) -> Tuple[Optional[float], Optional[float]]:
    for q in queries:
        if not q.strip():
            continue
        lat, lon = geocode_single(q, sleep_sec)
        if lat is not None and lon is not None:
            return lat, lon
    return None, None


def is_kazakhstan(country: str) -> bool:
    c = normalize_ru_address(country).lower()
    return "казахстан" in c or "kazakhstan" in c