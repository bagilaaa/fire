import type { Ticket } from "../types";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/shared/ui";

const segmentClass: Record<string, string> = {
  VIP: "bg-primary text-white",
  Priority: "bg-orange-500 text-white",
};

export function TicketTable({
  tickets,
  getSegmentColor = (s: string) => segmentClass[s] ?? "bg-muted text-muted-foreground",
}: {
  tickets: Ticket[];
  getSegmentColor?: (segment: string) => string;
}) {
  return (
    <div className="bg-card border border-border rounded-lg">
      <Table className="w-full">
        <TableHeader className="bg-muted/30">
          <TableRow>
            <TableHead className="px-4 py-3 text-sm font-medium text-muted-foreground">ID</TableHead>
            <TableHead className="px-4 py-3 text-sm font-medium text-muted-foreground">Сегмент</TableHead>
            <TableHead className="px-4 py-3 text-sm font-medium text-muted-foreground">Тип</TableHead>
            <TableHead className="px-4 py-3 text-sm font-medium text-muted-foreground">Тональность</TableHead>
            <TableHead className="px-4 py-3 text-sm font-medium text-muted-foreground">Приоритет</TableHead>
            <TableHead className="px-4 py-3 text-sm font-medium text-muted-foreground">Язык</TableHead>
            <TableHead className="px-4 py-3 text-sm font-medium text-muted-foreground">Офис</TableHead>
            <TableHead className="px-4 py-3 text-sm font-medium text-muted-foreground">Менеджер</TableHead>
            <TableHead className="px-4 py-3 text-sm font-medium text-muted-foreground w-[280px] max-w-[280px]">ИИ Summary</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((request) => (
            <TableRow key={request.id} className="border-t border-border hover:bg-muted/20 transition-colors">
              <TableCell className="px-4 py-3 text-sm font-medium text-foreground">{request.id}</TableCell>
              <TableCell className="px-4 py-3 text-sm text-foreground">{request.segment}</TableCell>
              <TableCell className="px-4 py-3 text-sm text-foreground">{request.type}</TableCell>
              <TableCell className="px-4 py-3 text-sm text-muted-foreground">{request.sentiment}</TableCell>
              <TableCell className="px-4 py-3">
                <span className={request.priority >= 8 ? "text-sm font-semibold text-foreground" : "text-sm text-muted-foreground"}>
                  {request.priority}
                </span>
              </TableCell>
              <TableCell className="px-4 py-3 text-sm text-muted-foreground">{request.language}</TableCell>
              <TableCell className="px-4 py-3 text-sm text-muted-foreground">{request.office}</TableCell>
              <TableCell className="px-4 py-3 text-sm text-foreground">{request.manager}</TableCell>
              <TableCell className="px-4 py-3 text-sm text-muted-foreground w-[280px] max-w-[280px] whitespace-normal break-words align-top">
                {request.aiSummary ?? "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
