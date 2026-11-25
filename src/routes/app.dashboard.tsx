"use client";

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useData } from "@/hooks/use-data";
import { 
  TrendingUp, Target, DollarSign, Users, Timer, Activity, Zap, 
  BarChart3, History, Calendar, ShieldCheck, Flame, 
  Building2, AlertTriangle, CheckCircle2, Megaphone,
  Crown, Sparkles, Clock,
  ChevronRight, MousePointer2, UserCheck, BarChart, GitBranch,
  Package, ClipboardCheck, Trophy, Lightbulb, Filter, Globe, 
  ListTodo, Phone, Briefcase, ArrowDownRight, Tag, TrendingDown, RefreshCw, CreditCard,
  PieChart, LineChart as LineIcon
} from "lucide-react";
import { useState, useMemo } from "react";
import { formatCurrency, cn } from "@/lib/utils";
import { calculateICC } from "@/lib/icc-calculation";
import { getMedal } from "@/lib/performance-score";
import { calculateCPL, calculateCAC, calculateROI } from "@/lib/finance-utils";
import { 
  BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart as RePie, Pie, Cell, AreaChart, Area, LineChart, Line, Legend
} from 'recharts';
import { isWithinInterval, isToday, isBefore, isSameDay, differenceInDays, subDays, format, startOfMonth, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { KPICard } from "@/components/dashboard/kpi-card";
import { ABCView } from "@/components/dashboard/abc-view";
import { AcquisitionView } from "@/components/dashboard/acquisition-view";
import { InsightCard } from "@/components/dashboard/insight-card";

export const Route = createFileRoute("/app/dashboard")({
  component: DashboardPage,
});

type TabID = 'operation' | 'perf' | 'intel' | 'fin' | 'ceo' | 'mkt' | 'abc' | 'acquisition';

function DashboardPage() {
  const { leads, tasks, users, initialized, dateFilter, company, landingPages, workingDays, holidays, products, marketingInvestments, agendaBookings } = useData();
  const [activeTab, setActiveTab] = useState<TabID>('ceo');

  const stats = useMemo(() => {
    if (!initialized || !dateFilter.from || !dateFilter.to) return null;

    const leadsIn = leads.filter(l => isWithinInterval(new Date(l.createdAt), { 
      start: dateFilter.from as Date, 
      end: dateFilter.to as Date 
    }));
    
    const won = leadsIn.filter(l => l.stage === "Ganho" || l.stage === "Recebimento");
    const active = leadsIn.filter(l => l.stage !== "Perdido" && l.stage !== "Ganho");
    const lost = leadsIn.filter(l => l.stage === "Perdido");

    const investmentsIn = marketingInvestments.filter(inv => {
      const start = new Date(inv.start_date);
      return isWithinInterval(start, { start: dateFilter.from as Date, end: dateFilter.to as Date });
    });

    const totalInvested = investmentsIn.reduce((acc, curr) => acc + Number(curr.amount), 0);

    let totalRevenue = 0;
    let mrrValue = 0;
    let totalCost = 0;

    won.forEach(l => {
      totalRevenue += l.value;
      const product = products.find(p => p.id === l.productId);
      if (product) {
        totalCost += (product.costPrice || 0);
        if (product.recurring) {
          mrrValue += (l.value / (product.recurrenceMonths || 12));
        }
      }
    });

    const pipelineFin = active.reduce((acc, curr) => acc + curr.value, 0);
    const lostRev = lost.reduce((acc, curr) => acc + curr.value, 0);
    
    const metaGlobal = users.reduce((acc, u) => acc + (u.goals?.find(g => g.type === 'money')?.target || 50000), 0);
    const avgTicket = won.length > 0 ? totalRevenue / won.length : 0;
    const conversion = leadsIn.length > 0 ? (won.length / leadsIn.length) * 100 : 0;
    const lossRate = leadsIn.length > 0 ? (lost.length / leadsIn.length) * 100 : 0;

    const daysInPeriod = eachDayOfInterval({ start: dateFilter.from, end: dateFilter.to });
    let cumulativeRevenue = 0;
    const performanceData = daysInPeriod.map(day => {
      const daySales = won.filter(l => isSameDay(new Date(l.wonAt || l.createdAt), day));
      cumulativeRevenue += daySales.reduce((s, l) => s + l.value, 0);
      const dayTarget = metaGlobal / Math.max(daysInPeriod.length, 1);
      const cumulativeTarget = (daysInPeriod.indexOf(day) + 1) * dayTarget;
      return {
        date: format(day, 'dd/MM'),
        receita: cumulativeRevenue,
        meta: Math.round(cumulativeTarget)
      };
    });

    const STAGES_ORDER = ["Leads", "Contato", "Qualificação", "Reunião", "Negociação", "Ganho"];
    const flowData = STAGES_ORDER.map(s => ({
      name: s,
      value: leadsIn.filter(l => l.stage === s).reduce((acc, curr) => acc + curr.value, 0)
    }));

    const getBusinessDays = (start: Date, end: Date) => {
      let count = 0;
      let cur = new Date(start);
      while (isBefore(cur, end) || isSameDay(cur, end)) {
        const day = cur.getDay();
        const dateStr = cur.toISOString().split('T')[0];
        if (workingDays.includes(day) && !holidays.includes(dateStr)) count++;
        cur.setDate(cur.getDate() + 1);
      }
      return count;
    };

    const totalDays = getBusinessDays(dateFilter.from, dateFilter.to);
    const passedDays = getBusinessDays(dateFilter.from, isBefore(new Date(), dateFilter.to) ? new Date() : dateFilter.to);
    const trendValue = passedDays > 0 ? (totalRevenue / passedDays) * totalDays : 0;
    const trendPct = metaGlobal > 0 ? (trendValue / metaGlobal) * 100 : 0;

    const periodTasks = tasks.filter(t => isWithinInterval(new Date(t.due), { start: dateFilter.from!, end: dateFilter.to! }));
    const taskRanking = users.map(u => ({
      name: u.name,
      count: periodTasks.filter(t => t.done && t.owners.includes(u.name)).length,
      avatar: u.avatar,
      avatarUrl: u.avatarUrl
    })).sort((a, b) => b.count - a.count);

    const weeklyLeads = Array.from({ length: 7 }).map((_, i) => {
      const d = subDays(new Date(), 6 - i);
      return { day: format(d, 'eee', { locale: ptBR }).toUpperCase(), count: leads.filter(l => isSameDay(new Date(l.createdAt), d)).length };
    });

    const productRanking = products.map(p => {
        const sales = won.filter(l => l.productId === p.id);
        const total = sales.reduce((acc, curr) => acc + curr.value, 0);
        return { 
          name: p.name, 
          category: p.category, 
          total, 
          count: sales.length, 
          pct: totalRevenue > 0 ? (total / totalRevenue) * 100 : 0, 
          recurring: p.recurring 
        };
    }).sort((a, b) => b.total - a.total);

    const MKT_CHANNELS = ["DIRETO", "INSTAGRAM", "FACEBOOK", "GOOGLE", "WHATSAPP", "LINKEDIN"];
    const originStats = MKT_CHANNELS.map(channel => {
      const channelLeads = leadsIn.filter(l => l.source?.toUpperCase().includes(channel));
      const channelWon = won.filter(l => l.source?.toUpperCase().includes(channel));
      const count = channelLeads.length;
      const conv = count > 0 ? (channelWon.length / count) * 100 : 0;
      return { name: channel, count, conv };
    });

    const tempCounts = {
      Q: leadsIn.filter(l => l.temperature === 'Quente').length,
      M: leadsIn.filter(l => l.temperature === 'Morno').length,
      F: leadsIn.filter(l => l.temperature === 'Frio').length
    };

    return {
      leadsIn, won, active, lost,
      revenue: totalRevenue,
      mrr: mrrValue,
      pipelineFin,
      lostRev,
      metaGlobal,
      avgTicket,
      conversion,
      lossRate,
      trendValue,
      trendPct,
      totalDays,
      passedDays,
      performanceData,
      flowData,
      productRanking,
      taskRanking,
      weeklyLeads,
      periodTasksTotal: periodTasks.length,
      periodTasksDone: periodTasks.filter(t => t.done).length,
      periodTasksPending: periodTasks.filter(t => !t.done).length,
      followupsToday: tasks.filter(t => isToday(new Date(t.due))).length,
      meetingsDone: leadsIn.filter(l => ["Reunião", "Negociação", "Ganho", "Recebimento"].includes(l.stage)).length,
      proposalsSent: leadsIn.filter(l => ["Negociação", "Ganho", "Recebimento"].includes(l.stage)).length,
      criticalSLA: leadsIn.filter(l => l.sla === 'critico' || l.sla === 'vencido').length,
      totalVisits: landingPages.reduce((acc, lp) => acc + lp.visits, 0),
      mqlLeads: leadsIn.filter(l => (l.score || 0) >= 50),
      sqlLeads: leadsIn.filter(l => ["Qualificação", "Reunião", "Negociação"].includes(l.stage)),
      margin: totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0,
      ltv: avgTicket * 12,
      inboundLeads: leadsIn.filter(l => l.captureType === 'Inbound'),
      outboundLeads: leadsIn.filter(l => l.captureType === 'Outbound'),
      manualLeads: leadsIn.filter(l => l.captureType === 'Manual' || !l.captureType),
      inboundRev: won.filter(l => l.captureType === 'Inbound').reduce((s, l) => s + l.value, 0),
      outboundRev: won.filter(l => l.captureType === 'Outbound').reduce((s, l) => s + l.value, 0),
      manualRev: won.filter(l => l.captureType === 'Manual' || !l.captureType).reduce((s, l) => s + l.value, 0),
      inboundConv: leadsIn.filter(l => l.captureType === 'Inbound').length > 0 ? (won.filter(l => l.captureType === 'Inbound').length / leadsIn.filter(l => l.captureType === 'Inbound').length) * 100 : 0,
      outboundConv: leadsIn.filter(l => l.captureType === 'Outbound').length > 0 ? (won.filter(l => l.captureType === 'Outbound').length / leadsIn.filter(l => l.captureType === 'Outbound').length) * 100 : 0,
      manualConv: leadsIn.filter(l => l.captureType === 'Manual' || !l.captureType).length > 0 ? (won.filter(l => l.captureType === 'Manual' || !l.captureType).length / leadsIn.filter(l => l.captureType === 'Manual' || !l.captureType).length) * 100 : 0,
      originStats,
      tempCounts,
      totalInvested,
      cpl: calculateCPL(totalInvested, leadsIn.length),
      cac: calculateCAC(totalInvested, won.length),
      roi: calculateROI(totalRevenue, totalInvested)
    };
  }, [leads, tasks, users, initialized, dateFilter, workingDays, holidays, landingPages, products, marketingInvestments]);

  if (!initialized || !stats) return null;

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-4 max-w-[1600px] mx-auto pb-6 overflow-hidden h-[calc(100vh-64px)] flex flex-col">
      <header className="flex flex-col xl:flex-row xl:items-center justify-start gap-3 md:gap-8 shrink-0">
        <div className="space-y-0.5 shrink-0">
          <div className="flex items-center gap-1.5 leading-none">
            <Building2 className="h-3.5 w-3.5 text-primary" />
            <span className="text-[9px] font-black uppercase tracking-0.18em text-muted-foreground">{company?.name || 'SALEAD'}</span>
          </div>
          <h1 className="font-display text-xl md:text-2xl font-bold tracking-tight whitespace-nowrap leading-none">Comando Central</h1>
        </div>
        <div className="flex items-center bg-muted/50 p-1 rounded-2xl border border-border gap-1 w-full xl:w-auto overflow-x-auto md:overflow-x-visible scrollbar-none">
          <TabBtn id="ceo" label="CEO" active={activeTab === 'ceo'} onClick={setActiveTab} icon={Crown} />
          <TabBtn id="mkt" label="MARKETING" shortLabel="MKT" active={activeTab === 'mkt'} onClick={setActiveTab} icon={Megaphone} />
          <TabBtn id="operation" label="OPERAÇÃO" shortLabel="OPER." active={activeTab === 'operation'} onClick={setActiveTab} icon={Zap} />
          <TabBtn id="perf" label="PERFORMANCE" shortLabel="PERF." active={activeTab === 'perf'} onClick={setActiveTab} icon={Trophy} />
          <TabBtn id="intel" label="INTELIGÊNCIA" shortLabel="INTEL." active={activeTab === 'intel'} onClick={setActiveTab} icon={Lightbulb} />
          <TabBtn id="abc" label="CURVA ABC" shortLabel="ABC" active={activeTab === 'abc'} onClick={setActiveTab} icon={BarChart} />
          <TabBtn id="fin" label="FINANCEIRO" shortLabel="FIN." active={activeTab === 'fin'} onClick={setActiveTab} icon={DollarSign} />
          <TabBtn id="acquisition" label="AQUISIÇÃO" shortLabel="AQUIS." active={activeTab === 'acquisition'} onClick={setActiveTab} icon={Activity} />
        </div>
      </header>

      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 overflow-hidden flex-1 flex flex-col min-h-0">
        {activeTab === 'ceo' && <CEOView stats={stats} />}
        {activeTab === 'mkt' && <MarketingView stats={stats} />}
        {activeTab === 'operation' && <OperationView stats={stats} tasks={tasks} users={users} agendaBookings={agendaBookings} />}
        {activeTab === 'perf' && <PerformanceView stats={stats} />}
        {activeTab === 'intel' && <IntelligenceView stats={stats} />}
        {activeTab === 'abc' && <ABCView stats={stats} />}
        {activeTab === 'fin' && <FinancialView stats={stats} />}
        {activeTab === 'acquisition' && <AcquisitionView stats={stats} />}
      </div>
    </div>
  );
}

function FinancialView({ stats }: { stats: any }) {
  return (
    <div className="space-y-4 flex-1 min-h-0 overflow-y-auto pr-1 scrollbar-thin pb-6">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 shrink-0">
        <KPICard label="Receita Ganha" value={formatCurrency(stats.revenue)} icon={DollarSign} status="success" />
        <KPICard label="Investido" value={formatCurrency(stats.totalInvested)} icon={TrendingDown} status="warning" />
        <KPICard label="MRR (Mensal)" value={formatCurrency(stats.mrr)} icon={RefreshCw} status="success" />
        <KPICard label="Tendência" value={formatCurrency(stats.trendValue)} icon={TrendingUp} status={stats.trendPct >= 100 ? "success" : "warning"} />
        <KPICard label="Valor em Aberto" value={formatCurrency(stats.pipelineFin)} icon={Briefcase} />
        <KPICard label="Valor Perdido" value={formatCurrency(stats.lostRev)} icon={TrendingDown} status="destructive" />
        <KPICard label="Conversão" value={`${stats.conversion.toFixed(1)}%`} icon={Target} status="default" />
        <KPICard label="Ticket Médio" value={formatCurrency(stats.avgTicket)} icon={Tag} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-[2rem] p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" /> Performance Estratégica
            </h3>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.performanceData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="date" fontSize={9} />
                <YAxis fontSize={9} tickFormatter={(v) => `R$ ${v/1000}k`} />
                <Tooltip formatter={(value: any) => formatCurrency(value)} contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '12px' }} />
                <Area type="monotone" dataKey="meta" stroke="none" fill="var(--muted)" fillOpacity={0.15} />
                <Area type="monotone" dataKey="receita" stroke="var(--primary)" strokeWidth={3} fill="url(#colorRev)" fillOpacity={1} />
                <defs><linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--primary)" stopOpacity={0.1}/><stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/></linearGradient></defs>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-card border border-border rounded-[2rem] p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" /> Fluxo Financeiro por Etapa
            </h3>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <ReBarChart data={stats.flowData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" fontSize={9} />
                <YAxis fontSize={9} tickFormatter={(v) => `R$ ${v/1000}k`} />
                <Tooltip formatter={(value: any) => formatCurrency(value)} contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '12px' }} />
                <Bar dataKey="value" fill="var(--primary)" radius={[8, 8, 0, 0]} />
              </ReBarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
         <div className="p-5 rounded-[1.5rem] bg-success/5 border border-success/20 flex flex-col justify-between group">
            <div className="flex items-center gap-3">
               <div className="h-8 w-8 rounded-lg bg-success/10 text-success grid place-items-center"><Zap className="h-4 w-4" /></div>
               <span className="text-[9px] font-black uppercase tracking-widest text-success">Eficiência de Margem</span>
            </div>
            <div className="mt-2">
               <div className="font-display text-2xl font-black text-success">{stats.margin.toFixed(1)}%</div>
               <p className="text-[10px] text-muted-foreground mt-0.5">Margem sobre custo</p>
            </div>
         </div>
         <div className="p-5 rounded-[1.5rem] bg-primary/5 border border-primary/20 flex flex-col justify-between group">
            <div className="flex items-center gap-3">
               <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary grid place-items-center"><Users className="h-4 w-4" /></div>
               <span className="text-[9px] font-black uppercase tracking-widest text-primary">LTV Estimado (12m)</span>
            </div>
            <div className="mt-2">
               <div className="font-display text-2xl font-black text-primary">{formatCurrency(stats.ltv)}</div>
               <p className="text-[10px] text-muted-foreground mt-0.5">Valor vitalício médio</p>
            </div>
         </div>
         <div className="p-5 rounded-[1.5rem] bg-info/5 border border-info/20 flex flex-col justify-between group">
            <div className="flex items-center gap-3">
               <div className="h-10 w-10 rounded-xl bg-info/10 text-info grid place-items-center"><Timer className="h-5 w-5" /></div>
               <span className="text-[9px] font-black uppercase tracking-widest text-info">Sales Cycle (Ciclo)</span>
            </div>
            <div className="mt-2">
               <div className="font-display text-2xl font-black text-info">2.4 dias</div>
               <p className="text-[10px] text-muted-foreground mt-0.5">Tempo médio de venda</p>
            </div>
         </div>
      </div>
    </div>
  );
}

function MarketingView({ stats }: { stats: any }) {
  const mqlPct = stats.leadsIn.length > 0 ? (stats.mqlLeads.length / stats.leadsIn.length) * 100 : 0;
  const sqlPct = stats.mqlLeads.length > 0 ? (stats.sqlLeads.length / stats.mqlLeads.length) * 100 : 0;
  const clientPct = stats.sqlLeads.length > 0 ? (stats.won.length / stats.sqlLeads.length) * 100 : 0;
  
  const mktFunnel = [
    { name: "VISITANTES", value: stats.totalVisits, color: "bg-[#F8F9FA] text-[#64748b]" },
    { name: "LEADS", value: stats.leadsIn.length, conv: stats.totalVisits > 0 ? (stats.leadsIn.length / stats.totalVisits) * 100 : 0, color: "bg-[#FFF5F0] text-[#f97316]" },
    { name: "QUALIFICADO MKT (MQL)", value: stats.mqlLeads.length, conv: mqlPct, color: "bg-[#FFEBE5] text-[#f97316]" },
    { name: "QUALIFICADO VENDAS (SQL)", value: stats.sqlLeads.length, conv: sqlPct, color: "bg-[#FFDCCF] text-[#f97316]" },
    { name: "CLIENTES", value: stats.won.length, conv: clientPct, color: "bg-primary text-white" }
  ];

  const PIPELINE_STAGES = ["LEADS", "CONTATO", "QUALIFICAÇÃO", "REUNIÃO", "NEGOCIAÇÃO", "GANHO"];
  const pipelineFunnel = PIPELINE_STAGES.map((s, i) => {
    const leadsInStage = stats.leadsIn.filter((l: any) => l.stage?.toUpperCase() === s);
    const count = leadsInStage.length;
    const value = leadsInStage.reduce((acc: number, curr: any) => acc + curr.value, 0);
    const prevCount = i > 0 ? stats.leadsIn.filter((l: any) => l.stage?.toUpperCase() === PIPELINE_STAGES[i-1]).length : 0;
    const conv = (i > 0 && prevCount > 0) ? (count / prevCount) * 100 : 0;
    
    const colors = [
        "bg-[#FFF5F0] text-[#f97316]", 
        "bg-[#FFEBE5] text-[#f97316]", 
        "bg-[#FFDCCF] text-[#f97316]", 
        "bg-[#FFCDBF] text-[#f97316]", 
        "bg-[#FFBFAA] text-[#f97316]", 
        "bg-primary text-white"        
    ];

    return { name: s, count, value, conv, color: colors[i] };
  });

  return (
    <div className="h-full flex flex-col gap-3 min-h-0 overflow-y-auto pr-2 pb-6 scrollbar-thin">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 shrink-0">
        <KPICard label="Visitantes" value={stats.totalVisits.toLocaleString()} icon={MousePointer2} className="py-2" />
        <KPICard label="Leads Totais" value={stats.leadsIn.length} icon={Users} className="py-2" />
        <KPICard label="MQL (Mkt)" value={stats.mqlLeads.length} icon={UserCheck} className="py-2" />
        <KPICard label="CPL" value={formatCurrency(stats.cpl)} icon={DollarSign} className="py-2" status={stats.cpl > 0 ? "warning" : "default"} />
        <KPICard label="CAC" value={formatCurrency(stats.cac)} icon={TrendingUp} className="py-2" status={stats.cac > 0 ? "destructive" : "default"} />
        <KPICard label="ROI Global" value={`${stats.roi.toFixed(0)}%`} icon={Zap} className="py-2" status={stats.roi > 0 ? "success" : "default"} />
        <KPICard label="Investido" value={formatCurrency(stats.totalInvested)} icon={DollarSign} className="py-2" />
      </div>

      <div className="grid lg:grid-cols-4 gap-3 items-stretch flex-1 min-h-0">
        <div className="bg-card border border-border rounded-[2.5rem] p-4 shadow-card flex flex-col min-h-0">
          <h3 className="font-display text-sm font-bold flex items-center gap-2 mb-4 shrink-0"><Filter className="h-4 w-4 text-primary" /> Esteira de Marketing</h3>
          <div className="flex-1 flex flex-col gap-2 overflow-y-auto scrollbar-none pb-2">
            {mktFunnel.map((step, i) => (
              <div key={step.name} className={cn(
                "p-3 rounded-2xl border border-border/30 transition-all shrink-0",
                step.color
              )}>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-1.5 min-w-[100px]">
                    <span className="text-[8px] font-black uppercase tracking-widest opacity-70 truncate">{step.name}:</span>
                    <span className="font-display font-black text-[11px]">{step.value.toLocaleString()}</span>
                  </div>
                  <div className="flex-1 text-center">
                    {i > 0 && <span className="text-[10px] font-black">{(step.conv ?? 0).toFixed(1)}%</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-[2.5rem] p-4 shadow-card flex flex-col min-h-0">
          <h3 className="font-display text-sm font-bold flex items-center gap-2 mb-4 shrink-0"><GitBranch className="h-4 w-4 text-primary" /> Etapas de Vendas</h3>
          <div className="flex-1 flex flex-col gap-2 overflow-y-auto scrollbar-none pb-2">
            {pipelineFunnel.map((step, i) => (
              <div key={step.name} className={cn(
                "p-3 rounded-2xl border border-border/30 transition-all shrink-0 mx-auto",
                step.color
              )} style={{ width: `${100 - (i * 5)}%` }}>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-1 min-w-[90px]">
                    <span className="text-[8px] font-black uppercase tracking-tighter opacity-70 truncate">{step.name}:</span>
                    <span className="font-display font-black text-[11px]">{step.count}</span>
                  </div>
                  <div className="flex-1 text-center font-bold text-[9px] opacity-90 px-1 truncate">
                    {formatCurrency(step.value)}
                  </div>
                  <div className="min-w-[40px] text-right">
                    <span className="text-[10px] font-black">{i > 0 ? `${step.conv.toFixed(0)}%` : '—'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 min-h-0">
           <StatBox label="Maior Gargalo" value="Qualificação" sub="Perda de 42%" icon={AlertTriangle} status="destructive" vertical className="py-2" />
           <StatBox label="Melhor Conversão" value="Negociação" sub="92% de eficiência" icon={CheckCircle2} status="success" vertical className="py-2" />
           <StatBox label="Etapa mais Lenta" value="Reunião" sub="Média 4.2 dias" icon={Clock} vertical className="py-2" />
           
           <div className="bg-card border border-border rounded-[2rem] p-4 shadow-card space-y-3 flex-1 flex flex-col justify-center">
              <div className="flex items-center justify-between">
                <div className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">QUALIDADE</div>
                <Sparkles className="h-3 w-3 text-primary opacity-50" />
              </div>
              <h4 className="font-display text-xs font-bold leading-none">Temperatura</h4>
              <div className="flex gap-2">
                 <div className="flex-1 bg-destructive/10 rounded-xl p-2 text-center border border-destructive/20">
                    <div className="text-sm font-black text-destructive">{stats.tempCounts.Q}</div>
                    <div className="text-[8px] font-black text-destructive/60 uppercase">Quente</div>
                 </div>
                 <div className="flex-1 bg-warning/10 rounded-xl p-2 text-center border border-warning/20">
                    <div className="text-sm font-black text-warning">{stats.tempCounts.M}</div>
                    <div className="text-[8px] font-black text-warning/60 uppercase">Morno</div>
                 </div>
                 <div className="flex-1 bg-info/10 rounded-xl p-2 text-center border border-info/20">
                    <div className="text-sm font-black text-info">{stats.tempCounts.F}</div>
                    <div className="text-[8px] font-black text-info/60 uppercase">Frio</div>
                 </div>
              </div>
           </div>
        </div>

        <div className="bg-card border border-border rounded-[2.5rem] p-4 shadow-card flex flex-col h-full overflow-hidden">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              <h3 className="font-display text-sm font-bold">Origem dos Leads</h3>
            </div>
          </div>
          <div className="space-y-4 overflow-y-auto scrollbar-none flex-1 pr-1">
            {stats.originStats.map((item: any) => (
              <div key={item.name} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="text-[8px] font-black uppercase tracking-widest text-foreground">{item.name}</div>
                  <div className="text-right leading-none">
                    <div className="text-[11px] font-black text-primary">{item.count} L</div>
                    <div className="text-[8px] font-bold text-muted-foreground uppercase">{item.conv.toFixed(1)}% CONV.</div>
                  </div>
                </div>
                <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                   <div className="h-full bg-primary" style={{ width: `${Math.min(100, (item.count / Math.max(stats.leadsIn.length, 1)) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CEOView({ stats }: { stats: any }) {
  return (
    <div className="space-y-6 flex-1 min-h-0 overflow-y-auto pr-1 scrollbar-thin">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Receita Realizada" value={formatCurrency(stats.revenue)} icon={DollarSign} delta={`${((stats.revenue / stats.metaGlobal) * 100).toFixed(1)}% da meta`} isPositive={stats.revenue > 0} />
        <KPICard label="ROI Global" value={`${stats.roi.toFixed(0)}%`} subValue={`Retorno sobre ${formatCurrency(stats.totalInvested)}`} icon={Zap} status={stats.roi > 0 ? "success" : "warning"} />
        <KPICard label="MRR (Assinaturas)" value={formatCurrency(stats.mrr)} icon={RefreshCw} status="success" />
        <KPICard label="SLA Crítico" value={stats.criticalSLA} icon={Timer} status={stats.criticalSLA > 0 ? "destructive" : "success"} />
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card border border-border rounded-[2.5rem] p-8 shadow-card flex flex-col justify-center text-center space-y-4">
          <div className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground">Progresso da Meta Global</div>
          <div className="font-display text-7xl font-black text-primary leading-none">{((stats.revenue / stats.metaGlobal) * 100).toFixed(1)}%</div>
          <div className="h-4 w-full bg-muted rounded-full overflow-hidden"><div className="h-full bg-gradient-primary transition-all duration-1000" style={{ width: `${Math.min(100, (stats.revenue / stats.metaGlobal) * 100)}%` }} /></div>
          <p className="text-sm text-muted-foreground font-medium">Meta: {formatCurrency(stats.metaGlobal)} | Restam {formatCurrency(Math.max(0, stats.metaGlobal - stats.revenue))}</p>
        </div>
        <div className="bg-card border border-border rounded-[2.5rem] p-6 shadow-card flex flex-col min-h-[400px]">
          <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="font-display text-lg font-bold flex items-center gap-2"><Package className="h-5 w-5 text-primary" /> Venda de Produtos</h3>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto scrollbar-none pr-1">
            {stats.productRanking.map((p: any, i: number) => (
              <div key={p.name} className="space-y-1.5 group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-[9px] font-black w-4 h-4 rounded flex items-center justify-center shrink-0", i === 0 ? "bg-[var(--gold)] text-white" : "bg-muted text-muted-foreground")}>{i + 1}</span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate group-hover:text-primary transition-colors flex items-center gap-1">{p.name}</div>
                      <div className="text-[8px] font-bold text-muted-foreground uppercase">{p.category} · {p.count} vendas</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-black">{formatCurrency(p.total)}</div>
                    <div className="text-[8px] font-bold text-primary">{p.pct.toFixed(1)}%</div>
                  </div>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden"><div className={cn("h-full transition-all duration-1000", i === 0 ? "bg-primary" : "bg-primary/40")} style={{ width: `${p.pct}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function OperationView({ stats, tasks, users, agendaBookings = [] }: { stats: any, tasks: any[], users: any[], agendaBookings?: any[] }) {
  const navigate = useNavigate();
  const now = new Date();
  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const todayBookings = agendaBookings.filter(b => b.status !== "CANCELADO" && b.data_agendamento === todayIso);
  const todayTasks = tasks.filter(t => !t.done && isToday(new Date(t.due)));
  const totalTodayCount = todayBookings.length + todayTasks.length;

  return (
    <div className="h-full flex flex-col gap-4 min-h-0 overflow-y-auto pr-2 scrollbar-thin pb-6">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 shrink-0">
        <KPICard label="Tarefas Total" value={stats.periodTasksTotal} icon={ListTodo} />
        <KPICard label="Tarefas Concluídas" value={stats.periodTasksDone} icon={CheckCircle2} status="success" />
        <KPICard label="Tarefas Pendentes" value={stats.periodTasksPending} icon={Clock} status="warning" />
        <KPICard label="Follow-ups Hoje" value={stats.followupsToday} icon={Phone} />
        <KPICard label="Reuniões Realizadas" value={stats.meetingsDone} icon={Users} status="default" />
        <KPICard label="Propostas Enviadas" value={stats.proposalsSent} icon={Megaphone} />
        <KPICard label="SLA Crítico" value={stats.criticalSLA} icon={Timer} status={stats.criticalSLA > 0 ? "destructive" : "success"} />
      </div>
      <div className="grid lg:grid-cols-[1fr_320px_350px] gap-4 items-stretch flex-1 min-h-0">
        <div className="space-y-4 flex flex-col min-h-0">
          <div className="bg-card border border-border rounded-[2.5rem] p-5 shadow-card flex flex-col h-[280px]">
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 mb-6"><Activity className="h-4 w-4 text-primary" /> Atividades por Vendedor</h3>
            <div className="flex-1 min-0">
              <ResponsiveContainer width="100%" height="100%">
                <ReBarChart data={users.map(u => ({ name: u.name, val: tasks.filter(t => t.owners.includes(u.name)).length }))}>
                  <XAxis dataKey="name" fontSize={10} hide />
                  <Tooltip cursor={{fill: 'var(--primary)', opacity: 0.05}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-elegant)' }} />
                  <Bar dataKey="val" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                </ReBarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-card border border-border rounded-[2.5rem] p-5 shadow-card flex flex-col flex-1">
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 mb-6"><History className="h-4 w-4 text-primary" /> VOLUME SEMANAL</h3>
            <div className="flex-1 min-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.weeklyLeads}>
                  <XAxis dataKey="day" axisLine={false} tickLine={false} fontSize={10} tick={{fill: 'var(--muted-foreground)'}} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-elegant)' }} />
                  <Line type="monotone" dataKey="count" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4, fill: 'var(--primary)', strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-[2.5rem] p-6 shadow-card flex flex-col min-h-0">
          <div className="flex items-center gap-2 mb-6"><div className="h-8 w-8 rounded-xl bg-primary/10 text-primary grid place-items-center"><Trophy className="h-4 w-4" /></div><h3 className="font-display text-sm font-bold">Ranking Realizadas</h3></div>
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-none">{stats.taskRanking?.map((item: any, i: number) => (<div key={item.name} className="flex items-center justify-between group"><div className="flex items-center gap-3"><div className="relative shrink-0"><div className="h-9 w-9 rounded-full bg-muted border border-border overflow-hidden flex items-center justify-center">{item.avatarUrl ? <img src={item.avatarUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-[10px] font-black text-muted-foreground">{item.avatar}</span>}</div></div><div className="min-w-0"><div className="text-xs font-bold truncate group-hover:text-primary transition-colors">{item.name}</div><div className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">{item.count} concluídas</div></div></div><div className="text-right shrink-0"><div className="font-display font-black text-base leading-none">{item.count}</div></div></div>))}</div>
        </div>
        <div className="bg-card border border-border rounded-[2.5rem] p-6 shadow-card flex flex-col min-h-0 overflow-hidden">
          <div className="flex items-center justify-between shrink-0 mb-6 px-1">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary grid place-items-center"><Calendar className="h-4 w-4" /></div>
              <h3 className="font-display text-sm font-bold">Agenda Hoje</h3>
            </div>
            <button
              type="button"
              onClick={() => navigate({ to: "/app/tasks", search: { tab: "agendamentos" } as any })}
              className="text-[9px] font-black bg-primary/20 text-primary px-2.5 py-1 rounded-full uppercase hover:bg-primary/30 transition-colors cursor-pointer tabular-nums"
            >
              {totalTodayCount} COMPROMISSOS
            </button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
            {todayBookings.map((b: any) => (
              <button
                type="button"
                key={b.id_agendamento}
                onClick={() => navigate({ to: "/app/tasks", search: { tab: "agendamentos", bookingId: b.id_agendamento } as any })}
                className="w-full text-left p-3 bg-primary/5 border border-primary/20 rounded-2xl flex items-center gap-3 group hover:border-primary/50 transition-all shrink-0 cursor-pointer"
              >
                <div className="h-8 w-8 rounded-lg bg-background border border-primary/20 grid place-items-center shrink-0">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold truncate">{b.hora_inicio} · {b.evento_nome || "Reunião"}</div>
                  <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider truncate">{b.lead_nome} · {b.protocolo}</div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0" />
              </button>
            ))}
            {todayTasks.map(t => (
              <button
                type="button"
                key={t.id}
                onClick={() => navigate({ to: "/app/tasks", search: { tab: "tarefas", lead: t.lead } as any })}
                className="w-full text-left p-3 bg-muted/30 border border-border rounded-2xl flex items-center gap-3 group hover:border-primary/40 transition-all shrink-0 cursor-pointer"
              >
                <div className="h-8 w-8 rounded-lg bg-background border border-border grid place-items-center shrink-0 group-hover:bg-primary/10 transition-colors">
                  <Calendar className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold truncate">{t.title}</div>
                  <div className="text-[8px] text-muted-foreground uppercase font-black tracking-widest truncate">{t.lead}</div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0" />
              </button>
            ))}
            {totalTodayCount === 0 && (
              <div className="py-10 text-center text-xs text-muted-foreground">
                Nenhum compromisso para hoje. Clique acima para abrir Minha Agenda.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PerformanceView({ stats }: { stats: any }) {
  const { dateFilter, users, leads, tasks } = useData();

  const performanceTableData = useMemo(() => {
    if (!stats || !dateFilter.from || !dateFilter.to) return [];

    return users.map(user => {
      const userLeads = leads.filter(l => 
        l.owner === user.name && 
        isWithinInterval(new Date(l.createdAt), { start: dateFilter.from!, end: dateFilter.to! })
      );
      
      const wonLeads = userLeads.filter(l => l.stage === "Ganho" || l.stage === "Recebimento");
      const lostLeads = userLeads.filter(l => l.stage === "Perdido");

      const revenue = wonLeads.reduce((s, l) => s + l.value, 0);
      const lostValue = lostLeads.reduce((s, l) => s + l.value, 0);
      const metaValue = user.goals?.find((g: any) => g.type === 'money')?.target || 50000;
      
      const metaPct = metaValue > 0 ? (revenue / metaValue) * 100 : 0;
      const convPct = userLeads.length > 0 ? (wonLeads.length / userLeads.length) * 100 : 0;
      const avgTicket = wonLeads.length > 0 ? revenue / wonLeads.length : 0;

      const trendValue = stats.passedDays > 0 ? (revenue / stats.passedDays) * stats.totalDays : 0;
      const trendPct = metaValue > 0 ? (trendValue / metaValue) * 100 : 0;

      const icc = calculateICC(user, leads, tasks);

      return {
        user,
        revenue,
        lostValue,
        metaPct,
        convPct,
        avgTicket,
        trendValue,
        trendPct,
        icc
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [users, leads, tasks, stats, dateFilter]);

  return (
    <div className="space-y-6 flex-1 min-h-0 overflow-y-auto pr-1 scrollbar-thin">
      <div className="bg-card border border-border rounded-[2.5rem] shadow-card overflow-hidden">
        <div className="p-6 border-b border-border bg-muted/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary grid place-items-center">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold">Hall da Performance</h2>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Ranking Geral do Período</p>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-6 py-4 text-left">Pos</th>
                <th className="px-6 py-4 text-left">Membro</th>
                <th className="px-4 py-4 text-center">Medalha</th>
                <th className="px-4 py-4 text-right">Meta %</th>
                <th className="px-4 py-4 text-right">Conv. %</th>
                <th className="px-4 py-4 text-right">Ticket Médio</th>
                <th className="px-4 py-4 text-right">Receita</th>
                <th className="px-4 py-4 text-right text-primary">Tendência ($)</th>
                <th className="px-4 py-4 text-right text-primary">Tendência (%)</th>
                <th className="px-4 py-4 text-right text-destructive">Perda</th>
                <th className="px-6 py-4 text-right">ICC Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {performanceTableData.map((item, i) => (
                  <tr key={item.user.id} className="group hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-5"><span className={cn("font-display font-black text-lg", i === 0 ? "text-[var(--gold)]" : i === 1 ? "text-muted-foreground" : i === 2 ? "text-primary" : "text-muted-foreground/30")}>#{i+1}</span></td>
                    <td className="px-6 py-5"><div className="flex items-center gap-4"><div className="h-11 w-11 rounded-full border-2 border-background shadow-sm overflow-hidden bg-muted">{item.user.avatarUrl ? <img src={item.user.avatarUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-primary flex items-center justify-center text-[10px] font-bold text-white">{item.user.avatar}</div>}</div><div><div className="font-bold text-base leading-none">{item.user.name}</div><div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1.5">{item.user.role}</div></div></div></td>
                    <td className="px-4 py-5 text-center">{i < 3 ? (<span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm border", i === 0 ? "bg-[var(--gold)]/10 text-[var(--gold)] border-[var(--gold)]/20" : i === 1 ? "bg-slate-500/10 text-slate-500 border-slate-500/20" : "bg-primary/10 text-primary border-primary/20")}>{i === 0 ? "🥇 OURO" : i === 1 ? "🥈 PRATA" : "🥉 BRONZE"}</span>) : null}</td>
                    <td className="px-4 py-5 text-right font-mono text-xs font-bold">{item.metaPct.toFixed(1)}%</td>
                    <td className="px-4 py-5 text-right font-mono text-xs font-bold text-primary">{item.convPct.toFixed(1)}%</td>
                    <td className="px-4 py-5 text-right font-mono text-xs font-medium text-muted-foreground">{formatCurrency(item.avgTicket)}</td>
                    <td className="px-4 py-5 text-right font-mono text-sm font-black">{formatCurrency(item.revenue)}</td>
                    <td className="px-4 py-5 text-right font-mono text-xs font-semibold text-primary">{formatCurrency(item.trendValue)}</td>
                    <td className="px-4 py-5 text-right font-mono text-xs font-semibold text-primary">{item.trendPct.toFixed(1)}%</td>
                    <td className="px-4 py-5 text-right font-mono text-xs font-semibold text-destructive">{formatCurrency(item.lostValue)}</td>
                    <td className="px-6 py-5 text-right"><div className="flex flex-col items-end gap-2"><span className={cn("font-display font-black text-2xl leading-none", item.icc.color)}>{item.icc.score}</span><div className="w-32 h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full bg-gradient-primary" style={{ width: `${item.icc.score}%` }} /></div></div></td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function IntelligenceView({ stats }: { stats: any }) {
  return (
    <div className="grid lg:grid-cols-[1.2fr_1fr] gap-6 flex-1 min-h-0 overflow-y-auto pr-2 scrollbar-thin pb-6">
      <div className="space-y-6">
        <div className="px-2"><div className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Insights da Operação</div></div>
        <div className="space-y-3">
          <InsightCard title="SLA Vencido" desc={`${stats.criticalSLA} leads sem resposta há mais de 72h.`} icon={Timer} variant="destructive" />
          <InsightCard title="Oportunidade" desc="A conversão em 'Negociação' subiu 18% esta semana." icon={Sparkles} variant="success" />
          <InsightCard title="Meta em Risco" desc={`Restam ${stats.totalDays - stats.passedDays} dias e falta ${Math.max(0, 100 - stats.trendPct).toFixed(0)}% para bater a meta global.`} icon={Target} variant="warning" />
          <InsightCard title="Dica Operacional" desc="A melhor eficiência em diagnóstico está com o time de SDR." icon={Lightbulb} variant="default" />
          <InsightCard title="Gargalo Detectado" desc="O tempo médio na etapa de 'Qualificação' aumentou 2 dias." icon={Activity} variant="default" />
        </div>
      </div>
      <div className="bg-card border border-border rounded-[2.5rem] p-8 shadow-card flex flex-col items-center justify-center text-center relative">
        <h3 className="font-display font-bold text-lg absolute top-8 left-8">Distribuição de Alertas</h3>
        <div className="h-72 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <RePie>
              <Pie data={[{ name: 'Crítico/Vencido', value: stats.criticalSLA, color: '#ef4444' }, { name: 'Em Alerta', value: stats.leadsIn.filter((l:any) => l.sla === 'alerta').length, color: '#f59e0b' }, { name: 'No Prazo', value: stats.leadsIn.filter((l:any) => l.sla === 'ok').length, color: '#10b981' }]} dataKey="value" innerRadius={70} outerRadius={100} paddingAngle={5}>
                {[{ color: '#ef4444' }, { color: '#f59e0b' }, { color: '#10b981' }].map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '12px', fontSize: '10px' }} />
            </RePie>
          </ResponsiveContainer>
        </div>
        <div className="mt-8"><p className="text-[11px] italic text-muted-foreground font-medium max-w-xs leading-relaxed">"Priorize a resolução de leads em SLA Crítico para evitar churn e garantir a saúde do funil comercial."</p></div>
      </div>
    </div>
  );
}

function TabBtn({ id, label, shortLabel, active, onClick, icon: Icon }: any) {
  return (
    <button onClick={() => onClick(id)} className={cn("px-4 py-2 flex items-center justify-center gap-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all min-w-fit flex-shrink-0", active ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground")}>
      <Icon className="h-4 w-4 shrink-0" />
      <span className="hidden lg:inline">{label}</span>
      <span className="lg:hidden">{shortLabel || label}</span>
    </button>
  );
}

function StatBox({ label, value, sub, icon: Icon, status, vertical, className }: any) {
  const statusColors = { success: "text-success border-success/30 bg-success/5", destructive: "text-destructive border-destructive/30 bg-destructive/5", default: "text-muted-foreground border-border bg-muted/5" };
  const color = status ? (statusColors[status as keyof typeof statusColors] || statusColors.default) : statusColors.default;
  return (
    <div className={cn("border-2 rounded-2xl transition-all", color, vertical ? "p-4 flex flex-col items-center text-center justify-center gap-1" : "p-3 flex items-center gap-4", className)}>
      <Icon className={cn(vertical ? "h-5 w-5" : "h-5 w-5")} />
      <div>
        <div className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60">{label}</div>
        <div className={cn("font-display font-black leading-tight", vertical ? "text-lg mt-1" : "text-base")}>{value}</div>
        <div className="text-[9px] font-medium opacity-80 mt-0.5">{sub}</div>
      </div>
    </div>
  );
}