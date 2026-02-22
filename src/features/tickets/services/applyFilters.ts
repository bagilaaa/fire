import type { Ticket } from "../types";
import type { TicketFilters } from "../types";

const PRIORITY_RANGE_MAP: Record<string, [number, number]> = {
  "Низкий (1–4)": [1, 4],
  "Низкий (1-4)": [1, 4],
  "Средний (5–7)": [5, 7],
  "Средний (5-7)": [5, 7],
  "Высокий (8–10)": [8, 10],
  "Высокий (8-10)": [8, 10],
};

function getPriorityRange(label: string): [number, number] | null {
  return PRIORITY_RANGE_MAP[label.trim()] ?? null;
}

function matchesPriorityRange(priority: number, rangeLabels: string[]): boolean {
  if (rangeLabels.length === 0) return true;
  return rangeLabels.some((label) => {
    const range = getPriorityRange(label);
    if (!range) return false;
    const [min, max] = range;
    return priority >= min && priority <= max;
  });
}

function includesIgnoreCase(arr: string[], value: string): boolean {
  const lower = value.trim().toLowerCase();
  return arr.some((item) => item.trim().toLowerCase() === lower);
}

export function applyFilters(tickets: Ticket[], filters: TicketFilters): Ticket[] {
  return tickets.filter((ticket) => {
    if (filters.type.length > 0 && !includesIgnoreCase(filters.type, ticket.type)) return false;
    if (filters.segment.length > 0 && !includesIgnoreCase(filters.segment, ticket.segment)) return false;
    if (filters.language.length > 0 && !includesIgnoreCase(filters.language, ticket.language)) return false;
    if (!matchesPriorityRange(ticket.priority, filters.priorityRange)) return false;
    return true;
  });
}

export function countActiveFilters(filters: TicketFilters): number {
  return (
    filters.type.length +
    filters.segment.length +
    filters.language.length +
    filters.priorityRange.length
  );
}
