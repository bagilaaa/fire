import { useState, useEffect, useCallback } from "react";
import type { TicketDetail } from "../types";
import { fetchTicketById } from "../services/ticketsApi";

export function useTicketDetail(id: string | undefined) {
  const [detail, setDetail] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(!!id);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (tid: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTicketById(tid);
      setDetail(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (id) load(id);
    else {
      setDetail(null);
      setLoading(false);
    }
  }, [id, load]);

  return { detail, loading, error, refetch: () => id && load(id) };
}
