"use client";

import { createFileRoute } from "@tanstack/react-router";
import { useData } from "@/hooks/use-data";
import { 
  DollarSign, Plus, Search, Calendar, Tag, Megaphone, 
  Trash2, Pencil, TrendingUp, Filter, BarChart3, ArrowUpRight,
  TrendingDown, Zap, Magnet, Rocket, MousePointer2
} from "lucide-react";
import { useState, useMemo } from "react";
import { formatCurrency, cn } from "@/lib/utils";
import { InvestmentModal } from "@/components/dashboard/investment-modal";
import { toast } from "sonner";
import { format, isWithinInterval } from "date-fns";

export const Route = createFileRoute("/app/investments")({
  component: InvestmentsPage,
});

function InvestmentsPage() {
  const { marketingInvestments, deleteMarketingInvestment, initialized, dateFilter, landingPages } = useData();
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return marketingInvestments.filter(inv => {
      const matchesSearch = inv.channel.toLowerCase().includes(search.toLowerCase()) || 
                           inv.description?.toLowerCase().includes(search.toLowerCase());
      
      const inPeriod = dateFilter.from && dateFilter.to 
        ? isWithinInterval(new Date(inv.start_date), { start: dateFilter.from, end: dateFilter.to })
        : true;

      return matchesSearch && inPeriod;
    });
  }, [marketingInvestments, search, dateFilter]);

  const totalPeriod = filtered.reduce((acc, curr) => acc + Number(curr.amount), 0);

  if (!initialized) return <div className="p-8 text-center animate-pulse">Sincronizando finanças...</div>;

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Marketing & Tráfego</div>
          <h1 className="font-display text-2xl md:text-3xl font-bold mt-1">Investimentos</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie os custos de aquisição e verba de anúncios por canal.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="text-sm px-4 py-2.5 rounded-xl bg-gradient-primary text-primary-foreground font-bold shadow-elegant inline-flex items-center gap-2 hover:scale-105 transition-transform"
        >
          <Plus className="h-4 w-4" /> NOVO LANÇAMENTO
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <KpiCard label="Total no Período" value={formatCurrency(totalPeriod)} icon={DollarSign} accent />
        <KpiCard label="Lançamentos" value={filtered.length.toString()} icon={Tag} />
        <KpiCard label="Canais Ativos" value={new Set(filtered.map(i => i.channel)).size.toString()} icon={Filter} />
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex flex-wrap items-center justify-between gap-4 bg-muted/10">
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input 
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por canal ou descrição..." 
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary/20 outline-none" 
            />
          </div>
          <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Filtrado por: <span className="text-primary">{dateFilter.label}</span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-5 py-4 font-bold">Data</th>
                <th className="text-left px-3 py-4 font-bold">Canal</th>
                <th className="text-left px-3 py-4 font-bold">Campanha / LP</th>
                <th className="text-left px-3 py-4 font-bold">Descrição</th>
                <th className="text-right px-3 py-4 font-bold">Valor</th>
                <th className="text-right px-5 py-4 font-bold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((inv) => {
                const lp = landingPages.find(p => p.id === inv.landing_page_id);
                return (
                  <tr key={inv.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="font-medium text-xs">
                        {format(new Date(inv.start_date), 'dd/MM/yyyy')}
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <span className={cn(
                        "px-2 py-0.5 rounded-md text-[10px] font-black border border-border uppercase flex items-center gap-1.5 w-fit",
                        inv.channel.includes('Google') ? "bg-blue-500/10 text-blue-500" :
                        inv.channel.includes('Facebook') || inv.channel.includes('Instagram') ? "bg-pink-500/10 text-pink-500" :
                        inv.channel.includes('LinkedIn') ? "bg-indigo-500/10 text-indigo-500" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {inv.channel}
                      </span>
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex items-center gap-2">
                        {lp ? (
                          <>
                            <Megaphone className="h-3 w-3 text-primary" />
                            <span className="text-xs font-bold truncate max-w-[150px]">{lp.name}</span>
                          </>
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic">Geral / Sem LP</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <div className="text-xs text-muted-foreground truncate max-w-[200px]" title={inv.description}>
                        {inv.description || "—"}
                      </div>
                    </td>
                    <td className="px-3 py-4 text-right">
                      <div className="font-display font-black text-primary text-base">
                        {formatCurrency(Number(inv.amount))}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button 
                        onClick={() => { if(confirm("Excluir este lançamento?")) deleteMarketingInvestment(inv.id); }}
                        className="p-2 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground italic">
                    Nenhum investimento registrado para este período.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && <InvestmentModal onClose={() => setShowModal(false)} />}
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, accent }: any) {
  return (
    <div className="bg-gradient-surface border border-border rounded-2xl p-5 shadow-card relative overflow-hidden group">
      <div className="absolute -right-2 -bottom-2 opacity-5 group-hover:opacity-10 transition-opacity">
        <Icon className="h-16 w-16" />
      </div>
      <Icon className={`h-5 w-5 ${accent ? "text-primary" : "text-muted-foreground"}`} />
      <div className="font-display text-2xl font-black mt-3">{value}</div>
      <div className="text-[10px] text-muted-foreground mt-0.5 uppercase font-bold tracking-widest">{label}</div>
    </div>
  );
}