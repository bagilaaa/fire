import { useState, useMemo } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { useManagers } from "../hooks/useManagers";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/shared/ui";
import type { Manager } from "../types";

type SortDirection = "asc" | "desc";

export function ManagersPage() {
  const { managers, loading, error } = useManagers();
  const [sortByRequests, setSortByRequests] = useState<SortDirection>("desc");

  const sortedManagers = useMemo(() => {
    const dir = sortByRequests === "asc" ? 1 : -1;
    return [...managers].sort((a: Manager, b: Manager) => (a.activeRequests - b.activeRequests) * dir);
  }, [managers, sortByRequests]);

  const toggleSort = () => setSortByRequests((prev) => (prev === "asc" ? "desc" : "asc"));

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
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <Table className="w-full">
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="px-4 py-3 text-sm font-medium text-muted-foreground">ФИО</TableHead>
                <TableHead className="px-4 py-3 text-sm font-medium text-muted-foreground">Офис</TableHead>
                <TableHead className="px-4 py-3 text-sm font-medium text-muted-foreground">Навыки</TableHead>
                <TableHead
                  className="px-4 py-3 text-sm font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground flex items-center gap-1"
                  onClick={toggleSort}
                >
                  Активных обращений
                  {sortByRequests === "desc" ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedManagers.map((manager, index) => (
                <TableRow key={index} className="border-t border-border hover:bg-muted/20 transition-colors">
                  <TableCell className="px-4 py-4">
                    <div className="text-sm font-medium text-foreground">{manager.name}</div>
                  </TableCell>
                  <TableCell className="px-4 py-4 text-sm text-muted-foreground">{manager.office}</TableCell>
                  <TableCell className="px-4 py-4">
                    <span className="text-sm text-foreground">{manager.skills.join(", ")}</span>
                  </TableCell>
                  <TableCell className="px-4 py-4">
                    <span className="text-sm text-foreground">{manager.activeRequests}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
