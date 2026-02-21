import { useState } from "react";
import { useTickets } from "../hooks/useTickets";
import { useTicketFilters } from "../hooks/useTicketFilters";
import { TicketTable } from "../components/TicketTable";
import { TicketFilters } from "../components/TicketFilters";
import { Input } from "@/shared/ui";
import { Search } from "lucide-react";

export function RequestsPage() {
  const [search, setSearch] = useState("");
  const { tickets, loading, error } = useTickets();
  const { filters, setFilter, clearAll, activeCount, filteredTickets } = useTicketFilters(tickets);

  const filteredBySearch = search.trim()
    ? filteredTickets.filter(
        (t) =>
          t.id.toLowerCase().includes(search.toLowerCase()) ||
          t.manager.toLowerCase().includes(search.toLowerCase()) ||
          t.office.toLowerCase().includes(search.toLowerCase())
      )
    : filteredTickets;

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-[1440px] mx-auto">
          <p className="text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="max-w-[1440px] mx-auto">
          <p className="text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-[1440px] mx-auto">
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <TicketFilters
            filters={filters}
            setFilter={setFilter}
            clearAll={clearAll}
            activeCount={activeCount}
          />
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <Input
              placeholder="Поиск..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <TicketTable tickets={filteredBySearch} />
      </div>
    </div>
  );
}
