import os
import json
import time
from typing import Dict, Any
from openai import OpenAI

CATEGORIES = [
    "Жалоба", "Смена данных", "Консультация", "Претензия",
    "Неработоспособность приложения", "Мошеннические действия", "Спам",
]
SENTIMENTS = ["Позитивный", "Нейтральный", "Негативный"]
LANGS = ["KZ", "ENG", "RU"]

_client: OpenAI = None


def get_openai_client() -> OpenAI:
    global _client
    if _client is None:
        api_key = os.getenv("OPENAI_API_KEY", "")
        _client = OpenAI(api_key=api_key)
    return _client


def llm_analyze_ticket(text: str, max_retries: int = 4) -> Dict[str, Any]:
    text = (text or "").strip()
    if not text:
        return {
            "type": "Консультация",
            "sentiment": "Нейтральный",
            "priority": 4,
            "language": "RU",
            "summary": "Текст обращения отсутствует. Запросить у клиента уточнение сути и деталей.",
        }

    if len(text) > 8000:
        text = text[:8000] + "…"

    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    instructions = (
        "Ты — NLP модуль службы поддержки.\n"
        "Проанализируй текст обращения и верни JSON строго по схеме.\n\n"
        "Правила:\n"
        f"- type: строго одна категория из списка: {', '.join(CATEGORIES)}.\n"
        f"- sentiment: строго одно из: {', '.join(SENTIMENTS)}.\n"
        "- priority: целое 1..10.\n"
        "  Спам: 1-2; Консультация: 3-5; Жалоба/Смена данных: 5-7; "
        "Неработоспособность приложения: 7-9; Претензия: 8-10; Мошенничество: 9-10.\n"
        f"- language: строго KZ/ENG/RU. Если сомневаешься — RU.\n"
        "- summary: 1-2 предложения: суть + следующий шаг. Без 'Менеджеру:'.\n"
        "Никакого текста вне JSON."
    )

    json_schema = {
        "type": "json_schema",
        "name": "ticket_analysis",
        "strict": True,
        "schema": {
            "type": "object",
            "properties": {
                "type": {"type": "string", "enum": CATEGORIES},
                "sentiment": {"type": "string", "enum": SENTIMENTS},
                "priority": {"type": "integer", "minimum": 1, "maximum": 10},
                "language": {"type": "string", "enum": LANGS},
                "summary": {"type": "string"},
            },
            "required": ["type", "sentiment", "priority", "language", "summary"],
            "additionalProperties": False,
        },
    }

    client = get_openai_client()
    last_err = None

    for attempt in range(max_retries):
        try:
            resp = client.responses.create(
                model=model,
                instructions=instructions,
                input=text,
                temperature=0,
                text={"format": json_schema},
            )
            out = (resp.output_text or "").strip()
            if not out:
                raise ValueError("Empty model output")
            return json.loads(out)
        except Exception as e:
            last_err = e
            # Fallback: try chat completions API
            try:
                resp2 = client.chat.completions.create(
                    model=model,
                    messages=[
                        {"role": "system", "content": instructions},
                        {"role": "user", "content": text},
                    ],
                    temperature=0,
                    response_format={"type": "json_object"},
                )
                out = resp2.choices[0].message.content.strip()
                return json.loads(out)
            except Exception as e2:
                last_err = e2
                time.sleep(1.5 ** attempt)

    return {
        "type": "Консультация",
        "sentiment": "Нейтральный",
        "priority": 4,
        "language": "RU",
        "summary": f"Не удалось обработать автоматически ({type(last_err).__name__}). Нужна ручная проверка.",
    }