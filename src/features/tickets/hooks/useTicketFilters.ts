import { useState, useMemo, useCallback } from "react";
import type { Ticket } from "../types";
import type { TicketFilters } from "../types";
import { applyFilters, countActiveFilters } from "../services/applyFilters";

const INITIAL_FILTERS: TicketFilters = {
  type: [],
  segment: [],
  language: [],
  priorityRange: [],
};

export function useTicketFilters(tickets: Ticket[]) {
  const [filters, setFilters] = useState<TicketFilters>(INITIAL_FILTERS);

  const activeCount = useMemo(() => countActiveFilters(filters), [filters]);

  const filteredTickets = useMemo(
    () => applyFilters(tickets, filters),
    [tickets, filters]
  );

  const setFilter = useCallback(<K extends keyof TicketFilters>(key: K, value: TicketFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearAll = useCallback(() => {
    setFilters(INITIAL_FILTERS);
  }, []);

  return {
    filters,
    setFilter,
    clearAll,
    activeCount,
    filteredTickets,
  };
}
