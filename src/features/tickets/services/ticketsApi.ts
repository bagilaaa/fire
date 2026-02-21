import { apiGet, apiPost, apiUpload } from "@/shared/api/client";
import type { Ticket, TicketDetail } from "../types";

interface TicketOut {
  id: number;
  client_guid: string;
  client_gender: string | null;
  segment: string | null;
  country: string | null;
  city: string | null;
  description: string | null;
  ticket_type: string | null;
  sentiment: string | null;
  priority: number | null;
  language: string | null;
  summary: string | null;
  geo_normalization: string | null;
  client_lat: number | null;
  client_lon: number | null;
  office_name: string | null;
  manager_id: number | null;
  created_at: string | null;
  processed_at: string | null;
}

interface ManagerOut {
  id: number;
  full_name: string;
  position: string | null;
  office_name: string | null;
  skills: string | null;
  workload: number;
}

interface BusinessUnitOut {
  id: number;
  name: string;
  address: string | null;
  lat: number | null;
  lon: number | null;
}

interface TicketDetailOut extends TicketOut {
  assigned_manager: ManagerOut | null;
  office: BusinessUnitOut | null;
}

interface UploadResponse {
  filename: string;
  rows_total: number;
  rows_imported: number;
  message: string;
}

interface ProcessResponse {
  processed: number;
  failed: number;
  message: string;
}

function mapTicket(t: TicketOut, managerName?: string): Ticket {
  return {
    id: String(t.id),
    segment: t.segment ?? "",
    type: t.ticket_type ?? "",
    sentiment: t.sentiment ?? "",
    priority: t.priority ?? 0,
    language: t.language ?? "",
    office: t.office_name ?? "",
    manager: managerName ?? (t.manager_id ? `#${t.manager_id}` : "—"),
    status: t.processed_at ? "Обработано" : "Новое",
    aiSummary: t.summary ?? undefined,
  };
}

export async function fetchTickets(): Promise<Ticket[]> {
  const [tickets, managers] = await Promise.all([
    apiGet<TicketOut[]>("/tickets?limit=500"),
    apiGet<ManagerOut[]>("/managers"),
  ]);

  const managerMap = new Map<number, string>();
  managers.forEach((m) => managerMap.set(m.id, m.full_name));

  return tickets.map((t) =>
    mapTicket(t, t.manager_id ? managerMap.get(t.manager_id) : undefined)
  );
}

export async function fetchTicketById(
  id: string
): Promise<TicketDetail | null> {
  try {
    const t = await apiGet<TicketDetailOut>(`/tickets/${id}`);
    return {
      id: String(t.id),
      segment: t.segment ?? "",
      type: t.ticket_type ?? "",
      sentiment: t.sentiment ?? "",
      priority: t.priority ?? 0,
      language: t.language ?? "",
      office: t.office_name ?? "",
      manager:
        t.assigned_manager?.full_name ??
        (t.manager_id ? `#${t.manager_id}` : "—"),
      status: t.processed_at ? "Обработано" : "Новое",
      aiSummary: t.summary ?? undefined,
      guid: t.client_guid,
      summary: t.summary ?? undefined,
      recommendation: t.summary ?? undefined,
      clientInfo: {
        gender: t.client_gender ?? undefined,
        address:
          [t.city, t.country].filter(Boolean).join(", ") || undefined,
        coordinates:
          t.client_lat != null && t.client_lon != null
            ? `${t.client_lat}, ${t.client_lon}`
            : undefined,
      },
    };
  } catch {
    return null;
  }
}

export async function uploadTicketsCsv(
  file: File,
  replace = false
): Promise<UploadResponse> {
  return apiUpload<UploadResponse>(
    "/upload/tickets",
    file,
    replace ? { replace: "true" } : undefined
  );
}

export async function processTickets(
  limit = 100,
  concurrency = 15
): Promise<ProcessResponse> {
  return apiPost<ProcessResponse>(
    `/tickets/process?limit=${limit}&concurrency=${concurrency}`
  );
}
