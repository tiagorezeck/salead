"use client";

import React, { useState } from "react";
import { X, DollarSign, Calendar, Tag, Megaphone, Save, Info } from "lucide-react";
import { useData } from "@/hooks/use-data";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface InvestmentModalProps {
  onClose: () => void;
}

const CHANNELS = ["Google Ads", "Facebook Ads", "Instagram", "LinkedIn Ads", "Outbound Ativo", "Outros"];

export function InvestmentModal({ onClose }: InvestmentModalProps) {
  const { addMarketingInvestment, landingPages } = useData();
  const [form, setForm] = useState({
    amount: 0,
    channel: CHANNELS[0],
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    landing_page_id: "",
    description: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.amount <= 0) return toast.error("O valor deve ser maior que zero.");
    
    await addMarketingInvestment({
      amount: form.amount,
      channel: form.channel,
      start_date: form.start_date,
      end_date: form.end_date,
      landing_page_id: form.landing_page_id || null,
      description: form.description
    });
    
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-background border border-border rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95">
        <div className="p-6 border-b border-border flex items-center justify-between bg-gradient-surface">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary grid place-items-center">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold">Lançar Investimento</h2>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Custo de Aquisição & Tráfego</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg transition-colors"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-muted-foreground">Valor Investido (R$)</label>
            <div className="relative">
              <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
              <input 
                required 
                type="number" 
                step="0.01"
                value={form.amount} 
                onChange={e => setForm({...form, amount: Number(e.target.value)})}
                className="w-full bg-muted/50 border border-border rounded-2xl pl-12 pr-4 py-4 text-xl font-black focus:ring-2 focus:ring-primary/20 outline-none" 
                placeholder="0,00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-muted-foreground">Canal de Origem</label>
              <select 
                value={form.channel} 
                onChange={e => setForm({...form, channel: e.target.value})}
                className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm font-bold"
              >
                {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-muted-foreground">Campanha / LP (Opcional)</label>
              <select 
                value={form.landing_page_id} 
                onChange={e => setForm({...form, landing_page_id: e.target.value})}
                className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm"
              >
                <option value="">Geral / Sem LP</option>
                {landingPages.map(lp => <option key={lp.id} value={lp.id}>{lp.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-muted-foreground">Data Início</label>
              <input 
                type="date" 
                value={form.start_date} 
                onChange={e => setForm({...form, start_date: e.target.value})}
                className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-muted-foreground">Data Fim</label>
              <input 
                type="date" 
                value={form.end_date} 
                onChange={e => setForm({...form, end_date: e.target.value})}
                className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm" 
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-muted-foreground">Notas Adicionais</label>
            <textarea 
              value={form.description} 
              onChange={e => setForm({...form, description: e.target.value})}
              placeholder="Ex: Verba extra para promoção de feriado..."
              className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm min-h-[80px] resize-none"
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-4 rounded-2xl border border-border text-xs font-black uppercase tracking-widest hover:bg-muted transition-all">Cancelar</button>
            <button type="submit" className="flex-1 py-4 rounded-2xl bg-gradient-primary text-primary-foreground font-black text-xs uppercase tracking-widest shadow-elegant hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
              <Save className="h-4 w-4" /> SALVAR CUSTO
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}