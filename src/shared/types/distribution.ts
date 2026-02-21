/** Результат назначения одного обращения */
export interface TicketAssignment {
  ticketId: string;
  managerId: string;
  managerName: string;
}

/** Результат распределения обращений (Round Robin и др.) */
export interface DistributionResult {
  assignments: TicketAssignment[];
  unassigned: string[];
}
