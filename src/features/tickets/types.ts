export type { Ticket, TicketDetail } from "../../shared/types";

export interface TicketFilters {
  type: string[];
  segment: string[];
  language: string[];
  priorityRange: string[];
}
