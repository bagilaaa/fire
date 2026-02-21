import type { ToneResult } from "../../../shared/types";

/** Анализ тональности (AI). Заглушка; далее — backend API. */
export async function analyzeTone(text: string): Promise<ToneResult> {
  await new Promise((r) => setTimeout(r, 300));
  return {
    sentiment: "Нейтральная",
    priority: 5,
    language: "RU",
    type: "Обращение",
    summary: text.slice(0, 200),
    recommendation: "Ожидать ответа клиента.",
  };
}
