import { createFileRoute, useLocation, useRouter } from "@tanstack/react-router";
import { useData } from "@/hooks/use-data";
import { 
    Crown, Flame, TrendingUp, Target, Zap, Trophy, Medal, Star, 
    ChevronDown, Filter, Calendar, Users, LayoutGrid, 
    ArrowUpRight, ArrowDownRight, Award, History, BarChart3,
    ArrowRight, Info, Activity, Sparkles, Timer,
    User, DollarSign, Percent, ArrowUp, ArrowDown, ClipboardCheck, Search
} from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { useState, useMemo, useEffect } from "react";
import { calculateICP, getMedal, generateHistory } from "@/lib/performance-score";
import { PerformanceRadar } from "@/components/performance/radar-chart";
import { AnnualHeatmap } from "@/components/performance/heatmap";
import { GoalCard } from "@/components/performance/goal-card";
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { isWithinInterval } from "date-fns";

export const Route = createFileRoute("/app/performance")({ component: PerformancePage });

function PerformancePage() {
  const { team, leads, tasks, users, initialized, dateFilter, visibility } = useData();
  const location = useLocation();
  
  const [view, setView] = useState<'matrix' | 'ranking' | 'podium' | 'goals'>('ranking');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    if (url.includes('perf-podium')) setView('podium');
    else if (url.includes('perf-goals')) setView('goals');
    else if (url.includes('perf-matrix')) setView('matrix');
    else setView('ranking');
  }, [location.href]);

  useEffect(() => {
    if (initialized && !selectedUserId && users.length > 0) {
      setSelectedUserId(users[0].id);
    }
  }, [initialized, users, selectedUserId]);

  const selectedUser = useMemo(() => 
    users.find(u => u.id === selectedUserId) || users[0],
    [users, selectedUserId]
  );

  const hasData = leads.length > 0 && users.length > 0;

  const podiumData = useMemo(() => {
    // VALIDAÇÃO DE DATA SEGURA
    if (!initialized || !hasData || !dateFilter.from || !dateFilter.to) return [];
    
    return team.map(member => {
      const wonLeads = leads.filter(l => {
        if (l.owner !== member.name) return false;
        if (l.stage !== "Ganho" && l.stage !== "Recebimento") return false;
        const compareDate = l.wonAt ? new Date(l.wonAt) : new Date(l.createdAt);
        return isWithinInterval(compareDate, { 
          start: dateFilter.from as Date, 
          end: dateFilter.to as Date 
        });
      });

      const revenue = wonLeads.reduce((acc, curr) => acc + curr.value, 0);
      const periodLeads = leads.filter(l => 
        l.owner === member.name && 
        isWithinInterval(new Date(l.createdAt), { 
          start: dateFilter.from as Date, 
          end: dateFilter.to as Date 
        })
      );
      
      const conv = periodLeads.length > 0 ? (wonLeads.length / periodLeads.length) * 100 : 0;
      const icp = calculateICP(member, leads, tasks, 1, 1);

      return { ...member, revenue, conv, icpTotal: icp.total, leads: periodLeads.length };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [team, leads, initialized, dateFilter, tasks, hasData]);

  const calculatedTeam = useMemo(() => {
    if (!team.length || !hasData) return [];
    const teamRevenues = team.map(member => leads.filter(l => l.owner === member.name && (l.stage === "Ganho" || l.stage === "Recebimento")).reduce((acc, curr) => acc + curr.value, 0));
    const maxRevenue = Math.max(...teamRevenues, 1);
    const wonLeads = leads.filter(l => l.stage === "Ganho" || l.stage === "Recebimento");
    const avgTicket = wonLeads.length > 0 ? wonLeads.reduce((acc, curr) => acc + curr.value, 0) / wonLeads.length : 1;

    return team.map(member => {
      const icp = calculateICP(member, leads, tasks, maxRevenue, avgTicket);
      const history = generateHistory(member.id);
      return { ...member, icp, history, totalAnual: history.reduce((acc, h) => acc + h.icp, 0), rankVariation: 0 };
    }).sort((a, b) => b.icp.total - a.icp.total);
  }, [team, leads, tasks, hasData]);

  if (!initialized) return <div className="p-8 text-center font-display font-bold text-primary animate-pulse">Sincronizando Performance Comet...</div>;

  const champion = calculatedTeam[0];
  const annualChampion = [...calculatedTeam].sort((a, b) => b.totalAnual - a.totalAnual)[0];

  if (!hasData) {
    return (
      <div className="p-8 h-[calc(100vh-100px)] flex flex-col items-center justify-center text-center space-y-6">
        <div className="h-24 w-24 rounded-full bg-muted grid place-items-center"><Trophy className="h-12 w-12 text-muted-foreground/30" /></div>
        <div className="max-w-md space-y-2">
           <h2 className="font-display text-2xl font-bold">Sem dados para análise</h2>
           <p className="text-sm text-muted-foreground">Cadastre novos leads e membros da equipe para começar a gerar índices de performance comercial.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-8 pb-20">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-black text-primary uppercase tracking-[0.2em]">
            <Sparkles className="h-3 w-3" /> Gestão de Elite
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-black tracking-tight">Performance Comet</h1>
          <p className="text-sm text-muted-foreground">Análise sincronizada com o período: <span className="text-primary font-bold">{dateFilter.label}</span></p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {view === 'goals' && (
            <div className="relative animate-in fade-in zoom-in-95 duration-300">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-primary" />
              <select 
                value={selectedUserId || ""} 
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="pl-9 pr-10 py-2.5 bg-card border-2 border-primary/20 rounded-xl text-[10px] font-black uppercase tracking-widest appearance-none focus:outline-none focus:border-primary shadow-sm cursor-pointer transition-all hover:border-primary/40"
              >
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-primary pointer-events-none" />
            </div>
          )}

          <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-xl border border-border">
            {visibility.performance.ranking && <FilterBtn active={view === 'ranking'} onClick={() => setView('ranking')} icon={Trophy} label="RANKING" />}
            {visibility.performance.podium && <FilterBtn active={view === 'podium'} onClick={() => setView('podium')} icon={Medal} label="PÓDIO" />}
            {visibility.performance.goals && <FilterBtn active={view === 'goals'} onClick={() => setView('goals')} icon={ClipboardCheck} label="METAS" />}
            {visibility.performance.matrix && <FilterBtn active={view === 'matrix'} onClick={() => setView('matrix')} icon={LayoutGrid} label="MATRIZ" />}
          </div>
        </div>
      </header>

      {view === 'goals' && visibility.performance.goals && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
           {selectedUser && dateFilter.from && dateFilter.to && (
             <GoalCard 
               user={selectedUser} 
               leads={leads} 
               tasks={tasks} 
               dateRange={{ from: dateFilter.from, to: dateFilter.to }} 
             />
           )}
        </div>
      )}

      {view === 'ranking' && visibility.performance.ranking && (
        <div className="space-y-10 animate-in fade-in duration-700">
          <div className="grid lg:grid-cols-[1fr_400px] gap-8">
            <div className="bg-card border border-border rounded-[2.5rem] shadow-card overflow-hidden">
                <div className="p-6 border-b border-border bg-muted/10 flex items-center justify-between"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-xl bg-primary/10 text-primary grid place-items-center"><Trophy className="h-5 w-5" /></div><h2 className="font-display text-xl font-bold">Hall da Performance</h2></div><span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Ranking Geral</span></div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/30 text-[10px] font-black uppercase tracking-widest text-muted-foreground"><tr><th className="px-6 py-4 text-left">Pos</th><th className="px-6 py-4 text-left">Membro</th><th className="px-6 py-4 text-center">Medalha</th><th className="px-6 py-4 text-right">Índice ICP-COMET</th></tr></thead>
                        <tbody className="divide-y divide-border">
                            {calculatedTeam.map((m, i) => (
                                <tr key={m.id} className="group hover:bg-muted/20 transition-colors">
                                    <td className="px-6 py-5"><span className={cn("font-display font-black text-lg", i === 0 ? "text-[var(--gold)]" : i === 1 ? "text-muted-foreground" : i === 2 ? "text-primary" : "text-muted-foreground/30")}>#{i+1}</span></td>
                                    <td className="px-6 py-5"><div className="flex items-center gap-4"><div className="h-11 w-11 rounded-full border-2 border-background shadow-sm overflow-hidden bg-muted">{m.avatarUrl ? <img src={m.avatarUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-primary flex items-center justify-center text-[10px] font-bold text-white">{m.avatar}</div>}</div><div><div className="font-bold text-base leading-none">{m.name}</div><div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1.5">{m.role}</div></div></div></td>
                                    <td className="px-6 py-5 text-center">{i < 3 ? (<span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm", i === 0 ? "bg-[var(--gold)]/10 text-[var(--gold)]" : i === 1 ? "bg-slate-500/10 text-slate-500" : "bg-primary/10 text-primary")}>{getMedal(i + 1)}</span>) : (<span className="text-[10px] font-black text-muted-foreground opacity-40">{i < 10 ? "TOP 10" : ""}</span>)}</td>
                                    <td className="px-6 py-5 text-right"><div className="flex flex-col items-end gap-2"><span className="font-display font-black text-2xl text-gradient">{m.icp.total}</span><div className="w-32 h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full bg-gradient-primary" style={{ width: `${(m.icp.total / 1000) * 100}%` }} /></div></div></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterBtn({ active, onClick, icon: Icon, label }: any) {
  return (<button onClick={onClick} className={cn("px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-2", active ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground")}><Icon className="h-3.5 w-3.5" /> {label}</button>);
}

function PodiumAvatar({ user, rank }: { user: any, rank: number }) {
    const colors = ["border-[var(--gold)] shadow-[0_0_20px_rgba(234,179,8,0.3)]", "border-slate-400 shadow-[0_0_20px_rgba(148,163,184,0.3)]", "border-orange-800/40 shadow-[0_0_20px_rgba(154,52,18,0.2)]"];
    return (<div className={cn("rounded-full border-4 overflow-hidden bg-muted transition-all duration-500", rank === 1 ? "h-24 w-24 md:h-32 md:w-32" : "h-20 w-20 md:h-24 md:w-24", colors[rank - 1])}>{user.avatarUrl ? (<img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />) : (<div className="w-full h-full flex items-center justify-center font-black text-xl">{user.avatar}</div>)}</div>);
}