import type { Ticket, Manager } from "../../shared/types";
import type { DistributionResult } from "../types";

/**
 * Round Robin: назначает обращения менеджерам по очереди.
 * Логика вынесена из UI — готова к использованию в сервисах и API.
 */
export function assignTickets(tickets: Ticket[], managers: Manager[]): DistributionResult {
  const assignments: DistributionResult["assignments"] = [];
  const unassigned: string[] = [];

  if (managers.length === 0) {
    return { assignments, unassigned: tickets.map((t) => t.id) };
  }

  let managerIndex = 0;
  for (const ticket of tickets) {
    const manager = managers[managerIndex % managers.length];
    assignments.push({
      ticketId: ticket.id,
      managerId: manager.id ?? manager.name,
      managerName: manager.name,
    });
    managerIndex++;
  }

  return { assignments, unassigned };
}
