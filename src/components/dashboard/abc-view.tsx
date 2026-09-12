"use client";

import React, { useMemo } from 'react';
import { useData } from "@/hooks/use-data";
import { formatCurrency, cn } from "@/lib/utils";
import { isWithinInterval } from "date-fns";
import { 
  Package, Users, ChevronDown, ChevronRight, 
  Search, Maximize2, Filter, TrendingUp 
} from "lucide-react";

interface ABCItem {
  id: string;
  name: string;
  value: number;
  pct: number;
  class: 'A' | 'B' | 'C';
}

export function ABCView({ stats }: { stats: any }) {
  const { leads, products, dateFilter } = useData();

  // Lógica de cálculo Curva ABC
  const calculateABC = (type: 'product' | 'client'): { items: ABCItem[], totals: any } => {
    // VALIDAÇÃO DE DATA SEGURA
    if (!dateFilter.from || !dateFilter.to) return { items: [], totals: { A: [], B: [], C: [], totalRevenue: 0 } };

    const wonLeads = leads.filter(l => 
      isWithinInterval(new Date(l.createdAt), { start: dateFilter.from!, end: dateFilter.to! }) &&
      (l.stage === "Ganho" || l.stage === "Recebimento")
    );

    const revenueMap: Record<string, number> = {};
    const nameMap: Record<string, string> = {};

    wonLeads.forEach((l: any) => {
      const id = type === 'product' ? (l.productId || 'other') : l.company;
      const name = type === 'product' 
        ? (products.find(p => p.id === l.productId)?.name || "Outros / Sem Produto") 
        : l.company;
      
      revenueMap[id] = (revenueMap[id] || 0) + l.value;
      nameMap[id] = name;
    });

    const sorted = Object.entries(revenueMap)
      .map(([id, value]) => ({ id, name: nameMap[id], value }))
      .sort((a, b) => b.value - a.value);

    const totalRevenue = sorted.reduce((acc, curr) => acc + curr.value, 0);
    let cumulative = 0;

    const items: ABCItem[] = sorted.map(item => {
      cumulative += item.value;
      const pct = totalRevenue > 0 ? (item.value / totalRevenue) * 100 : 0;
      const cumPct = (cumulative / totalRevenue) * 100;
      
      let cls: 'A' | 'B' | 'C' = 'C';
      if (cumPct <= 81) cls = 'A';
      else if (cumPct <= 96) cls = 'B';
      
      return { ...item, pct, class: cls };
    });

    return {
      items,
      totals: {
        A: items.filter(i => i.class === 'A'),
        B: items.filter(i => i.class === 'B'),
        C: items.filter(i => i.class === 'C'),
        totalRevenue
      }
    };
  };

  const productABC = useMemo(() => calculateABC('product'), [leads, products, dateFilter]);
  const clientABC = useMemo(() => calculateABC('client'), [leads, dateFilter]);

  return (
    <div className="grid lg:grid-cols-2 gap-6 h-full min-h-0 overflow-y-auto pr-2 pb-10 scrollbar-thin">
      <ABCTable 
        title="Classificação ABC — Produtos/Serviços" 
        icon={Package} 
        data={productABC} 
      />
      <ABCTable 
        title="Classificação ABC — Clientes" 
        icon={Users} 
        data={clientABC} 
      />
    </div>
  );
}

function ABCTable({ title, icon: Icon, data }: { title: string, icon: any, data: any }) {
  const { totals, items } = data;
  
  const revenueA = totals.A.reduce((s: number, i: any) => s + i.value, 0);
  const revenueB = totals.B.reduce((s: number, i: any) => s + i.value, 0);
  const revenueC = totals.C.reduce((s: number, i: any) => s + i.value, 0);

  return (
    <div className="bg-card border border-border rounded-[2.5rem] shadow-card flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-display font-bold text-sm text-muted-foreground">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
           <button className="p-1.5 hover:bg-muted rounded-lg"><Search className="h-4 w-4 text-muted-foreground" /></button>
           <button className="px-3 py-1.5 rounded-xl border border-border flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:bg-muted">
             <Maximize2 className="h-3 w-3" /> Expandir
           </button>
        </div>
      </div>

      {/* Mini Cards de Quantidade */}
      <div className="px-6 py-4 grid grid-cols-3 gap-2 shrink-0">
        <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-center">
           <div className="font-display font-black text-2xl text-amber-600">{totals.A.length}</div>
           <div className="text-[10px] font-bold text-muted-foreground uppercase">Classe A</div>
        </div>
        <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 text-center">
           <div className="font-display font-black text-2xl text-blue-600">{totals.B.length}</div>
           <div className="text-[10px] font-bold text-muted-foreground uppercase">Classe B</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-500/5 border border-slate-500/10 text-center">
           <div className="font-display font-black text-2xl text-slate-600">{totals.C.length}</div>
           <div className="text-[10px] font-bold text-muted-foreground uppercase">Classe C</div>
        </div>
      </div>

      {/* Seção Classe A (Destaque) */}
      <div className="flex-1 overflow-y-auto px-6 space-y-4">
        <div className="rounded-2xl border border-amber-500/20 overflow-hidden bg-amber-500/[0.02]">
          <div className="p-4 bg-amber-500/5 flex items-center justify-between border-b border-amber-500/10">
            <div className="flex items-center gap-3">
              <ChevronDown className="h-4 w-4 text-amber-600" />
              <span className="text-[10px] font-black bg-amber-500 text-white px-2 py-0.5 rounded uppercase">Classe A</span>
              <span className="text-[10px] font-bold text-muted-foreground">80% da receita</span>
            </div>
            <div className="text-right">
              <div className="font-display font-black text-amber-700">{formatCurrency(revenueA)}</div>
              <div className="text-[9px] font-bold text-amber-600/60 uppercase">80,0%</div>
            </div>
          </div>
          
          <table className="w-full text-xs">
            <thead className="bg-muted/30 text-[9px] font-black uppercase text-muted-foreground border-b border-border">
              <tr>
                <th className="px-4 py-2 text-left"># Item</th>
                <th className="px-4 py-2 text-right">Valor</th>
                <th className="px-2 py-2 text-center">%</th>
                <th className="px-2 py-2 text-center">Meses</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {totals.A.slice(0, 15).map((item: any, idx: number) => (
                <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-2.5 font-medium flex items-center gap-2">
                    <span className="text-muted-foreground text-[10px]">{idx + 1}.</span>
                    <span className="truncate max-w-[150px] uppercase font-bold">{item.name}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono font-bold">{formatCurrency(item.value)}</td>
                  <td className="px-2 py-2.5 text-center text-muted-foreground">({item.pct.toFixed(1)}%)</td>
                  <td className="px-2 py-2.5 text-center text-muted-foreground">1</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Classe B & C Minimizado */}
        <div className="p-4 rounded-2xl border border-blue-500/20 bg-blue-500/[0.02] flex items-center justify-between">
           <div className="flex items-center gap-3">
              <ChevronRight className="h-4 w-4 text-blue-600" />
              <span className="text-[10px] font-black bg-blue-500 text-white px-2 py-0.5 rounded uppercase">Classe B</span>
              <span className="text-[10px] font-bold text-muted-foreground">15% da receita</span>
           </div>
           <div className="text-right">
              <div className="font-display font-black text-blue-700">{formatCurrency(revenueB)}</div>
              <div className="text-[9px] font-bold text-blue-600/60 uppercase">15,0%</div>
           </div>
        </div>

        <div className="p-4 rounded-2xl border border-border bg-muted/5 flex items-center justify-between">
           <div className="flex items-center gap-3">
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <span className="text-[10px] font-black bg-muted text-muted-foreground px-2 py-0.5 rounded uppercase border border-border">Classe C</span>
              <span className="text-[10px] font-bold text-muted-foreground">5% da receita</span>
           </div>
           <div className="text-right">
              <div className="font-display font-black text-muted-foreground">{formatCurrency(revenueC)}</div>
              <div className="text-[9px] font-bold text-muted-foreground/60 uppercase">5,0%</div>
           </div>
        </div>
      </div>

      {/* Footer Progress Bar */}
      <div className="p-6 border-t border-border shrink-0 space-y-3">
        <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Distribuição de Receita</div>
        <div className="h-4 w-full bg-muted rounded-full overflow-hidden flex shadow-inner">
           <div className="h-full bg-amber-500" style={{ width: '80%' }} />
           <div className="h-full bg-blue-500" style={{ width: '15%' }} />
           <div className="h-full bg-slate-400" style={{ width: '5%' }} />
        </div>
        <div className="flex items-center justify-between text-[8px] font-black text-muted-foreground uppercase tracking-widest px-1">
           <span>Classe A: {totals.A.length} itens</span>
           <span>Classe B: {totals.B.length} itens</span>
           <span>Classe C: {totals.C.length} itens</span>
        </div>
      </div>
    </div>
  );
}