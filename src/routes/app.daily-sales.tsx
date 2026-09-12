import { createFileRoute } from "@tanstack/react-router";
import { useData, type UserGoal } from "@/hooks/use-data";
import { Target, Calendar as CalendarIcon, ArrowUpRight, ArrowDownRight, CheckCircle2, Users as UsersIcon, ChevronDown, ChevronLeft, ChevronRight, LayoutGrid, Coffee } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { formatCurrency, cn } from "@/lib/utils";

export const Route = createFileRoute("/app/daily-sales")({
  component: DailySalesPage,
});

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

function DailySalesPage() {
  const { currentUser, leads, users, workingDays, holidays, initialized } = useData();
  
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedUserId, setSelectedUserId] = useState<string | "team">("");

  const isAdmin = currentUser?.role === "Admin Geral";
  const currentMonth = viewDate.getMonth();
  const currentYear = viewDate.getFullYear();
  const isCurrentMonth = new Date().getMonth() === currentMonth && new Date().getFullYear() === currentYear;

  useEffect(() => {
    if (initialized && currentUser && !selectedUserId) {
      setSelectedUserId(currentUser.id);
    }
  }, [initialized, currentUser, selectedUserId]);

  const businessDays = useMemo(() => {
    const days = [];
    const date = new Date(currentYear, currentMonth, 1);
    while (date.getMonth() === currentMonth) {
      const dayOfWeek = date.getDay();
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      
      if (workingDays.includes(dayOfWeek) && !holidays.includes(dateStr)) {
        days.push(date.getDate());
      }
      date.setDate(date.getDate() + 1);
    }
    return days;
  }, [currentMonth, currentYear, workingDays, holidays]);

  const allDaysInMonth = useMemo(() => {
    const days = [];
    const date = new Date(currentYear, currentMonth, 1);
    while (date.getMonth() === currentMonth) {
      days.push(date.getDate());
      date.setDate(date.getDate() + 1);
    }
    return days;
  }, [currentMonth, currentYear]);

  const viewUser = useMemo(() => {
    if (selectedUserId === "team") return null;
    return users.find(u => u.id === selectedUserId) || currentUser;
  }, [users, selectedUserId, currentUser]);

  const dailyResults = useMemo(() => {
    const results: Record<number, number> = {};
    
    const filteredLeads = leads.filter(l => {
      if (!l.wonAt) return false;
      const wonDate = new Date(l.wonAt);
      if (wonDate.getMonth() !== currentMonth || wonDate.getFullYear() !== currentYear) return false;
      
      if (selectedUserId === "team") return true;
      return l.owner === viewUser?.name;
    });

    filteredLeads.forEach(l => {
      const day = new Date(l.wonAt!).getDate();
      results[day] = (results[day] || 0) + l.value;
    });

    return results;
  }, [leads, viewUser, selectedUserId, currentMonth, currentYear]);

  const handlePrevMonth = () => {
    setViewDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  };

  const handleNextMonth = () => {
    const now = new Date();
    if (currentYear < now.getFullYear() || (currentYear === now.getFullYear() && currentMonth < now.getMonth())) {
      setViewDate(prev => {
        const d = new Date(prev);
        d.setMonth(d.getMonth() + 1);
        return d;
      });
    }
  };

  if (!initialized || (!viewUser && selectedUserId !== "team")) return <div className="p-8 text-center">Sincronizando metas...</div>;

  const moneyGoal = selectedUserId === "team" 
    ? users.reduce((acc, u) => acc + (u.goals?.find((g: UserGoal) => g.type === 'money')?.target || 0), 0)
    : (viewUser?.goals?.find((g: UserGoal) => g.type === 'money')?.target || 0);

  const totalRealizado = Object.values(dailyResults).reduce((acc, curr) => acc + curr, 0);
  const pctAtingido = moneyGoal > 0 ? (totalRealizado / moneyGoal) * 100 : 0;
  
  const today = new Date().getDate();
  const diasDecorridos = isCurrentMonth 
    ? businessDays.filter(d => d <= today).length 
    : businessDays.length;
  
  const diasRestantes = businessDays.length - diasDecorridos;
  const mediaDiariaAtual = diasDecorridos > 0 ? totalRealizado / diasDecorridos : 0;
  const tendencia = mediaDiariaAtual * businessDays.length;
  const metaRestante = Math.max(0, moneyGoal - totalRealizado);
  const esforcoDiarioNecessario = diasRestantes > 0 ? metaRestante / diasRestantes : 0;
  const metaDiariaOriginal = businessDays.length > 0 ? moneyGoal / businessDays.length : 0;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1200px] mx-auto space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Performance Comercial</div>
          <div className="flex items-center gap-4">
            <h1 className="font-display text-2xl md:text-3xl font-bold">
              {selectedUserId === "team" ? "Visão Geral do Time" : `Meta de: ${viewUser?.name}`}
            </h1>
            <div className="flex items-center bg-muted/50 rounded-xl p-1 border border-border">
              <button onClick={handlePrevMonth} className="p-1.5 hover:bg-background rounded-lg transition-all"><ChevronLeft className="h-4 w-4" /></button>
              <div className="px-3 text-xs font-black uppercase tracking-widest min-w-[140px] text-center">
                {MONTHS[currentMonth]} {currentYear}
              </div>
              <button onClick={handleNextMonth} disabled={isCurrentMonth} className={cn("p-1.5 rounded-lg transition-all", isCurrentMonth ? "opacity-20 cursor-not-allowed" : "hover:bg-background")}><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          {isAdmin && (
            <div className="relative group w-full sm:w-auto">
              <div className="absolute -top-6 left-0 text-[9px] font-black text-primary uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Alterar Visualização</div>
              <select 
                value={selectedUserId} 
                onChange={(e) => setSelectedUserId(e.target.value as any)} 
                className="w-full pl-10 pr-10 py-3 rounded-xl bg-card border-2 border-primary/20 text-sm font-bold appearance-none focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary cursor-pointer transition-all shadow-sm hover:border-primary/40"
              >
                <option value="team">Visão Geral (Time)</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
              </select>
              {selectedUserId === "team" ? <LayoutGrid className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" /> : <UsersIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />}
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary pointer-events-none" />
            </div>
          )}
          
          <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-card border border-border shadow-sm w-full sm:w-auto">
            <div className="h-9 w-9 rounded-full bg-gradient-primary grid place-items-center text-[10px] font-bold text-white overflow-hidden border-2 border-background shadow-sm">
              {selectedUserId === "team" ? (
                <LayoutGrid className="h-4 w-4" />
              ) : (
                viewUser?.avatarUrl ? (
                  <img src={viewUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  viewUser?.avatar
                )
              )}
            </div>
            <div className="text-xs pr-2">
              <div className="font-bold leading-tight">
                {selectedUserId === "team" ? "Operação Comet" : viewUser?.name}
              </div>
              <div className="text-[10px] text-muted-foreground font-medium">
                {selectedUserId === "team" ? "Consolidado Geral" : viewUser?.role}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-gradient-surface border border-border rounded-2xl p-5 shadow-card">
          <div className="text-[10px] uppercase font-bold text-muted-foreground mb-4">Progresso da Meta {selectedUserId === "team" && "(Time)"}</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">{formatCurrency(totalRealizado)}</span>
            <span className="text-xs text-muted-foreground">de {formatCurrency(moneyGoal)}</span>
          </div>
          <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-gradient-primary transition-all duration-1000" style={{ width: `${Math.min(pctAtingido, 100)}%` }} />
          </div>
          <div className="mt-2 text-[10px] font-bold text-right text-primary">{pctAtingido.toFixed(1)}%</div>
        </div>

        <div className="bg-gradient-surface border border-border rounded-2xl p-5 shadow-card">
          <div className="text-[10px] uppercase font-bold text-muted-foreground mb-4">Tendência de Fechamento</div>
          <div className="text-2xl font-bold">{formatCurrency(tendencia)}</div>
          <div className={cn("mt-2 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full", tendencia >= moneyGoal ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive")}>
            {tendencia >= moneyGoal ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {tendencia >= moneyGoal ? "Acima da Meta" : "Abaixo da Meta"}
          </div>
        </div>

        <div className="bg-primary text-primary-foreground rounded-2xl p-5 shadow-elegant relative overflow-hidden">
          <div className="text-[10px] uppercase font-bold opacity-80">{isCurrentMonth ? "Esforço Diário Necessário" : "Resultado Final"}</div>
          <div className="text-2xl font-black mt-2">{isCurrentMonth ? formatCurrency(esforcoDiarioNecessario) : formatCurrency(totalRealizado)}</div>
          <p className="text-[10px] mt-2 opacity-90">{isCurrentMonth ? `Faltam ${diasRestantes} dias úteis.` : `Mês encerrado.`}</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-3xl shadow-card overflow-hidden">
        <div className="p-6 border-b border-border bg-muted/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            <h3 className="font-display font-bold">Calendário de Vendas {selectedUserId === "team" && "(Consolidado)"}</h3>
          </div>
          <div className="text-[10px] font-bold text-muted-foreground uppercase">{businessDays.length} Dias Úteis Configurados</div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {allDaysInMonth.map((day) => {
              const date = new Date(currentYear, currentMonth, day);
              const dayOfWeek = date.getDay();
              const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              
              const isWorkingDay = workingDays.includes(dayOfWeek) && !holidays.includes(dateStr);
              const realizadoDia = dailyResults[day] || 0;
              const isRecorded = realizadoDia > 0;
              const isSuccess = isRecorded && realizadoDia >= metaDiariaOriginal;
              const isToday = new Date().getDate() === day && isCurrentMonth;

              return (
                <div 
                  key={day}
                  className={cn(
                    "relative rounded-2xl border p-4 transition-all h-32 flex flex-col justify-between",
                    isToday ? "ring-2 ring-primary ring-offset-2" : "",
                    !isWorkingDay ? "bg-muted/10 border-dashed border-border opacity-40" :
                    !isRecorded ? "bg-muted/20 border-border" :
                    isSuccess ? "bg-blue-500/5 border-blue-500/30" : "bg-rose-500/5 border-rose-500/30"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "text-xs font-black uppercase", 
                      isToday ? "text-primary" : "text-slate-600"
                    )}>
                      DIA {day} {isToday && "(HOJE)"}
                    </span>
                    {!isWorkingDay ? (
                      <Coffee className="h-4 w-4 text-muted-foreground" />
                    ) : isRecorded && (
                      <div className={cn("h-2.5 w-2.5 rounded-full", isSuccess ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" : "bg-rose-500")} />
                    )}
                  </div>

                  <div className="flex-1 flex flex-col justify-center">
                    {isWorkingDay ? (
                      <div className="space-y-1">
                        <div className={cn("text-base font-bold", isRecorded ? "text-slate-900" : "text-slate-500")}>
                          {isRecorded ? formatCurrency(realizadoDia) : "R$ 0,00"}
                        </div>
                        <div className="text-xs text-slate-700 font-bold uppercase">Meta: {formatCurrency(metaDiariaOriginal)}</div>
                      </div>
                    ) : (
                      <div className="text-[11px] font-bold text-muted-foreground uppercase text-center">Folga / Feriado</div>
                    )}
                  </div>
                  
                  {isSuccess && isWorkingDay && (
                    <div className="absolute bottom-2 right-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}