"use client";

import React, { useMemo } from 'react';
import { 
  Magnet, Rocket, MousePointer2, TrendingUp, DollarSign, 
  Target, Users, ArrowUpRight, BarChart3, PieChart,
  Zap, AlertTriangle, CheckCircle2, Timer, Wallet
} from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { KPICard } from "./kpi-card";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart as RePie, Pie, Cell, Legend 
} from 'recharts';

export function AcquisitionView({ stats }: { stats: any }) {
  const data = useMemo(() => [
    { name: 'Inbound', value: stats.inboundLeads.length, rev: stats.inboundRev, color: 'var(--primary)' },
    { name: 'Outbound', value: stats.outboundLeads.length, rev: stats.outboundRev, color: 'var(--info)' },
    { name: 'Manual', value: stats.manualLeads.length, rev: stats.manualRev, color: 'var(--success)' },
  ], [stats]);

  return (
    <div className="space-y-4 flex-1 min-h-0 overflow-y-auto pr-1 scrollbar-thin pb-6">
      {/* Grade de KPIs Padronizada */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 shrink-0">
        <KPICard 
          label="Investimento Total" 
          value={formatCurrency(stats.totalInvested)} 
          subValue="Verba de tráfego"
          icon={Wallet} 
          status="default"
        />
        <KPICard 
          label="CPL (Custo Lead)" 
          value={formatCurrency(stats.cpl)} 
          subValue="Média global"
          icon={Target} 
          status={stats.cpl > 50 ? "warning" : "default"}
        />
        <KPICard 
          label="CAC (Custo Aquisição)" 
          value={formatCurrency(stats.cac)} 
          subValue="Custo por venda"
          icon={TrendingUp} 
          status={stats.cac > 500 ? "destructive" : "success"}
        />
        <KPICard 
          label="ROI Global" 
          value={`${stats.roi.toFixed(0)}%`} 
          subValue="Retorno s/ invest."
          icon={Zap} 
          status={stats.roi > 0 ? "success" : "warning"}
        />
        <KPICard 
          label="ROAS" 
          value={(stats.revenue / (stats.totalInvested || 1)).toFixed(1)} 
          subValue="Receita / Investido"
          icon={DollarSign} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <ChannelCard 
          title="Inbound (Marketing)" 
          icon={Magnet} 
          leads={stats.inboundLeads.length} 
          revenue={stats.inboundRev} 
          conversion={stats.inboundConv}
          color="primary"
        />
        <ChannelCard 
          title="Outbound (Ativo)" 
          icon={Rocket} 
          leads={stats.outboundLeads.length} 
          revenue={stats.outboundRev} 
          conversion={stats.outboundConv}
          color="info"
        />
        <ChannelCard 
          title="Manual / Referral" 
          icon={MousePointer2} 
          leads={stats.manualLeads.length} 
          revenue={stats.manualRev} 
          conversion={stats.manualConv}
          color="success"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Gráficos com Altura Ajustada */}
        <div className="bg-card border border-border rounded-[2rem] p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-sm flex items-center gap-2">
              <PieChart className="h-4 w-4 text-primary" /> Mix de Aquisição
            </h3>
            <span className="text-[9px] font-black uppercase text-muted-foreground bg-muted px-2 py-0.5 rounded">Volume Leads</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RePie>
                <Pie 
                  data={data} 
                  dataKey="value" 
                  nameKey="name" 
                  innerRadius={70} 
                  outerRadius={95} 
                  paddingAngle={6}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold' }}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '15px' }} />
              </RePie>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card border border-border rounded-[2.5rem] p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" /> ROI Estimado por Canal
            </h3>
            <span className="text-[9px] font-black uppercase text-muted-foreground bg-muted px-2 py-0.5 rounded">Receita Bruta</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.4} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} fontWeight="bold" />
                <YAxis axisLine={false} tickLine={false} fontSize={9} tickFormatter={(v) => `R$ ${v/1000}k`} />
                <Tooltip 
                  formatter={(value: any) => formatCurrency(value)}
                  contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold' }}
                  cursor={{ fill: 'var(--muted)', opacity: 0.1 }}
                />
                <Bar dataKey="rev" radius={[8, 8, 0, 0]}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChannelCard({ title, icon: Icon, leads, revenue, conversion, color }: any) {
  const colorClasses = {
    primary: "bg-primary/10 text-primary border-primary/20",
    info: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    success: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
  };

  const bgClasses = {
    primary: "bg-primary",
    info: "bg-blue-500",
    success: "bg-emerald-500"
  };

  return (
    <div className="bg-gradient-surface border border-border rounded-[1.5rem] p-4 shadow-card group hover:border-primary/40 transition-all relative overflow-hidden">
      <div className={cn("absolute top-0 right-0 w-1 h-full opacity-30", bgClasses[color as keyof typeof bgClasses])} />
      
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={cn("h-8 w-8 rounded-lg grid place-items-center shadow-sm", colorClasses[color as keyof typeof colorClasses])}>
            <Icon className="h-4 w-4" />
          </div>
          <div>
             <h3 className="font-display font-bold text-xs leading-none">{title}</h3>
             <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mt-1 block">Origem</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-black text-primary">{conversion.toFixed(1)}%</div>
        </div>
      </div>
      
      <div className="flex items-end justify-between">
        <div className="space-y-0.5">
          <div className="text-[8px] font-black text-muted-foreground uppercase">Leads</div>
          <div className="text-lg font-black leading-none">{leads}</div>
        </div>
        <div className="text-right space-y-0.5">
          <div className="text-[8px] font-black text-muted-foreground uppercase">Receita</div>
          <div className="font-display text-sm font-bold leading-none">{formatCurrency(revenue)}</div>
        </div>
      </div>
    </div>
  );
}