import * as React from "react";
import { ChevronLeft, ChevronRight, CalendarDays, Check, X } from "lucide-react";
import { startOfDay, endOfDay, isBefore, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DayPicker, type DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { useData } from "@/hooks/use-data";
import { 
  type PeriodType, 
  getPeriodLabel, 
  shiftPeriod, 
  getQuickRange 
} from "@/lib/date-utils";

const SHORTCUTS: { label: string; type: PeriodType }[] = [
  { label: "Hoje", type: 'today' },
  { label: "Esta semana", type: 'thisWeek' },
  { label: "Este mês", type: 'thisMonth' },
  { label: "Este ano", type: 'thisYear' },
  { label: "Últimos 30 dias", type: 'last30' },
  { label: "Últimos 12 meses", type: 'last12' },
  { label: "Todo o período", type: 'all' },
  { label: "Período personalizado", type: 'custom' },
];

export function GlobalDateFilter() {
  const { dateFilter, setDateFilter } = useData();
  const [isOpen, setIsOpen] = React.useState(false);
  const [view, setView] = React.useState<'menu' | 'custom'>('menu');
  const containerRef = React.useRef<HTMLDivElement>(null);
  
  const [tempRange, setTempRange] = React.useState<DateRange | undefined>({
    from: dateFilter.from,
    to: dateFilter.to
  });

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  React.useEffect(() => {
    if (isOpen) {
      setTempRange({ from: dateFilter.from, to: dateFilter.to });
    }
  }, [isOpen, dateFilter.from, dateFilter.to]);

  const handleShift = (direction: 'prev' | 'next') => {
    // VALIDAÇÃO DE DATA OBRIGATÓRIA PARA SHIFT
    if (!dateFilter.from || !dateFilter.to) return;

    const { newStartDate, newEndDate } = shiftPeriod(
      dateFilter.from,
      dateFilter.to,
      direction,
      dateFilter.type as PeriodType
    );
    
    setDateFilter({
      from: newStartDate,
      to: newEndDate,
      type: dateFilter.type,
      label: getPeriodLabel(newStartDate, newEndDate)
    });
  };

  const applyShortcut = (shortcut: typeof SHORTCUTS[0]) => {
    if (shortcut.type !== 'custom') {
      const range = getQuickRange(shortcut.type);
      if (range) {
        setDateFilter({
          from: range.startDate,
          to: range.endDate,
          type: shortcut.type,
          label: shortcut.label
        });
        setIsOpen(false);
      }
    } else {
      setView('custom');
    }
  };

  const applyCustomRange = () => {
    if (tempRange?.from && tempRange?.to) {
      const start = startOfDay(tempRange.from);
      const end = endOfDay(tempRange.to);
      
      setDateFilter({
        from: start,
        to: end,
        type: 'custom',
        label: getPeriodLabel(start, end)
      });
      setIsOpen(false);
      setView('menu');
    }
  };

  return (
    <div className="flex items-center gap-1 bg-muted/50 border border-border rounded-xl p-1" ref={containerRef}>
      <button 
        onClick={() => handleShift('prev')}
        className="p-1.5 hover:bg-background rounded-lg transition-all text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      
      <div className="relative">
        <button 
          onClick={() => { setIsOpen(!isOpen); setView('menu'); }}
          className="px-3 py-1.5 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:bg-background rounded-lg transition-all min-w-[160px] justify-center"
        >
          <CalendarDays className="h-3.5 w-3.5 text-primary" />
          {dateFilter.label}
          <ChevronRight className={cn("h-3 w-3 transition-transform", isOpen ? "rotate-90" : "")} />
        </button>

        {isOpen && (
          <div className={cn(
            "absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white border border-border rounded-2xl shadow-2xl z-[100] overflow-hidden animate-in fade-in zoom-in-95 flex",
            view === 'menu' ? "w-64" : "w-auto"
          )}>
            <div className="w-48 border-r border-border bg-slate-50/50 p-2 flex flex-col gap-0.5">
              {SHORTCUTS.map((s) => (
                <button
                  key={s.label}
                  onClick={() => applyShortcut(s)}
                  className={cn(
                    "w-full text-left px-4 py-2.5 text-sm font-semibold rounded-xl transition-all flex items-center justify-between group",
                    dateFilter.type === s.type ? "bg-blue-50 text-blue-600" : "text-slate-600 hover:bg-slate-100"
                  )}
                >
                  {s.label}
                  {dateFilter.type === s.type && <Check className="h-3.5 w-3.5" />}
                </button>
              ))}
            </div>

            {view === 'custom' && (
              <div className="flex flex-col bg-white">
                <div className="p-6 relative">
                  <DayPicker
                    mode="range"
                    selected={tempRange}
                    onSelect={setTempRange}
                    numberOfMonths={2}
                    locale={ptBR}
                    className="p-0"
                    classNames={{
                      months: "flex flex-col sm:flex-row gap-10",
                      month: "space-y-4",
                      caption: "flex justify-center pt-1 relative items-center px-10 mb-6",
                      caption_label: "text-xs font-bold text-slate-900 uppercase tracking-widest",
                      nav: "flex items-center",
                      button_previous: "absolute left-4 top-7 h-8 w-8 bg-white p-0 opacity-50 hover:opacity-100 border border-slate-200 rounded-full flex items-center justify-center z-10 shadow-sm",
                      button_next: "absolute right-4 top-7 h-8 w-8 bg-white p-0 opacity-50 hover:opacity-100 border border-slate-200 rounded-full flex items-center justify-center z-10 shadow-sm",
                      month_grid: "w-full border-collapse",
                      weekdays: "flex w-full mb-3",
                      weekday: "text-slate-400 w-11 font-bold text-[10px] uppercase text-center flex-shrink-0",
                      week: "flex w-full mt-1",
                      day: "h-11 w-11 p-0 font-bold text-slate-900 text-xs hover:bg-slate-100 rounded-xl transition-all flex items-center justify-center flex-shrink-0 cursor-pointer select-none",
                      selected: "!text-white",
                      range_start: "!bg-blue-600 !text-white !rounded-xl z-10 shadow-md",
                      range_end: "!bg-blue-600 !text-white !rounded-xl z-10 shadow-md",
                      range_middle: "!bg-blue-500/15 !text-blue-700 !rounded-none",
                      today: "text-blue-600 font-black underline decoration-2 underline-offset-4",
                      outside: "text-slate-300 opacity-30",
                      disabled: "text-slate-300 opacity-30",
                      hidden: "invisible",
                    }}
                    components={{
                      Chevron: (props) => {
                        if (props.orientation === 'left') return <ChevronLeft className="h-5 w-5" />;
                        return <ChevronRight className="h-5 w-5" />;
                      }
                    }}
                  />
                </div>
                <div className="p-4 border-t border-border flex justify-end items-center gap-3 bg-slate-50/30">
                  <button onClick={() => setView('menu')} className="px-4 py-2 text-[10px] font-bold text-slate-500 hover:text-slate-800 transition-all">CANCELAR</button>
                  <button onClick={applyCustomRange} disabled={!tempRange?.from || !tempRange?.to} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg disabled:opacity-50 transition-all hover:bg-blue-700 flex items-center gap-2">APLICAR PERÍODO</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <button 
        onClick={() => handleShift('next')}
        className="p-1.5 rounded-lg transition-all text-muted-foreground hover:text-foreground"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}