import type { Ticket } from "../types";

export interface CsvParseResult {
  tickets: Ticket[];
  errors: string[];
  totalRows: number;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') inQuotes = !inQuotes;
    else if ((c === "," && !inQuotes) || c === "\n" || c === "\r") {
      result.push(current.trim());
      current = "";
      if (c !== ",") break;
    } else current += c;
  }
  result.push(current.trim());
  return result;
}

function parseRowToTicket(headers: string[], values: string[]): Ticket | null {
  const map: Record<string, string> = {};
  headers.forEach((h, i) => {
    map[h.toLowerCase().trim()] = values[i]?.trim() ?? "";
  });
  const id = map["id"] || map["id обращения"] || "";
  const priorityStr = map["priority"] || map["приоритет"] || "0";
  const priority = parseInt(priorityStr, 10) || 0;
  if (!id) return null;
  return {
    id,
    segment: map["segment"] || map["сегмент"] || "",
    type: map["type"] || map["тип"] || "",
    sentiment: map["sentiment"] || map["тональность"] || "",
    priority,
    language: map["language"] || map["язык"] || "",
    office: map["office"] || map["офис"] || "",
    manager: map["manager"] || map["менеджер"] || "",
    status: map["status"] || map["статус"] || "",
    aiSummary: map["aisummary"] || map["ai_summary"] || map["ии summary"] || undefined,
  };
}

export async function parseCsvFile(file: File): Promise<CsvParseResult> {
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const errors: string[] = [];
  const tickets: Ticket[] = [];

  if (lines.length < 2) {
    return { tickets: [], errors: ["Файл пуст или содержит только заголовок"], totalRows: lines.length };
  }

  const headers = parseCsvLine(lines[0]);

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    if (values.every((v) => !v.trim())) continue;
    const ticket = parseRowToTicket(headers, values);
    if (ticket) tickets.push(ticket);
    else errors.push(`Строка ${i + 1}: не удалось сопоставить данные (нужен id)`);
  }

  return { tickets, errors, totalRows: lines.length - 1 };
}

export function validateTickets(tickets: Ticket[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const seenIds = new Set<string>();
  tickets.forEach((t, idx) => {
    if (!t.id) errors.push(`Строка ${idx + 1}: отсутствует id`);
    if (seenIds.has(t.id)) errors.push(`Дубликат id: ${t.id}`);
    seenIds.add(t.id);
  });
  return { valid: errors.length === 0, errors };
}
