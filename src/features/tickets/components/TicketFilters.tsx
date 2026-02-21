import { useState } from "react";
import { Filter } from "lucide-react";
import { Button, Popover, PopoverTrigger, PopoverContent, Checkbox } from "@/shared/ui";
import type { TicketFilters as TicketFiltersType } from "../types";
import { cn } from "@/shared/ui/utils";

const FILTER_CATEGORIES = ["type", "segment", "language", "priorityRange"] as const;
const CATEGORY_LABELS: Record<(typeof FILTER_CATEGORIES)[number], string> = {
  type: "Тип",
  segment: "Сегмент",
  language: "Язык",
  priorityRange: "Приоритет",
};

const FILTER_OPTIONS: Record<(typeof FILTER_CATEGORIES)[number], string[]> = {
  type: [
    "Жалоба",
    "Смена данных",
    "Консультация",
    "Претензия",
    "Неработоспособность приложения",
    "Мошеннические действия",
    "Спам",
  ],
  segment: ["VIP", "Priority", "Mass"],
  language: ["RU", "EN", "KZ"],
  priorityRange: ["Низкий (1–4)", "Средний (5–7)", "Высокий (8–10)"],
};

type FilterCategory = (typeof FILTER_CATEGORIES)[number];

export function TicketFilters({
  filters,
  setFilter,
  clearAll,
  activeCount,
}: {
  filters: TicketFiltersType;
  setFilter: <K extends keyof TicketFiltersType>(key: K, value: TicketFiltersType[K]) => void;
  clearAll: () => void;
  activeCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<FilterCategory>("type");

  const handleToggle = (category: FilterCategory, value: string) => {
    const current = filters[category];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    setFilter(category, next);
  };

  const handleClearAll = () => {
    clearAll();
  };

  const handleApply = () => {
    setOpen(false);
  };

  return (
    <div className="mb-6 flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="relative gap-2">
            <Filter size={16} />
            Фильтр
            {activeCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
                {activeCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[480px] p-0" align="start" onCloseAutoFocus={(e) => e.preventDefault()}>
          <div className="flex">
            <div className="w-[140px] shrink-0 border-r border-border py-2">
              {FILTER_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "w-full px-4 py-2 text-left text-sm transition-colors",
                    activeCategory === cat
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
            <div className="min-h-[200px] flex-1 overflow-y-auto p-4">
              <div className="space-y-2">
                {FILTER_OPTIONS[activeCategory].map((value) => (
                  <label
                    key={value}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={filters[activeCategory].includes(value)}
                      onCheckedChange={() => handleToggle(activeCategory, value)}
                    />
                    <span className="text-sm text-foreground">{value}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-border p-3">
            <Button variant="ghost" size="sm" onClick={handleClearAll}>
              Очистить всё
            </Button>
            <Button size="sm" onClick={handleApply}>
              Применить
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
