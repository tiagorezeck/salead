"use client";

import React from 'react';
import { cn } from '@/lib/utils';

interface HeatmapProps {
  teamData: any[];
}

export function AnnualHeatmap({ teamData }: HeatmapProps) {
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  const getColor = (icp: number) => {
    if (icp >= 850) return "bg-success text-success-foreground";
    if (icp >= 650) return "bg-info text-info-foreground";
    if (icp >= 450) return "bg-warning text-warning-foreground";
    return "bg-destructive text-destructive-foreground";
  };

  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr>
            <th className="p-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border">Profissional</th>
            {months.map(m => (
              <th key={m} className="p-3 text-[10px) font-black uppercase tracking-widest text-muted-foreground text-center border-b border-border">{m}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {teamData.map((member) => {
            const name = member.name || "Membro";
            const initials = name.split(" ").map((n: string) => n[0]).join("").toUpperCase();

            return (
              <tr key={member.id} className="hover:bg-muted/30 transition-colors">
                <td className="p-3 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                      <div className="h-6 w-6 rounded-full bg-primary/10 text-primary grid place-items-center text-[8px] font-bold">
                          {initials}
                      </div>
                      <span className="text-xs font-bold">{name}</span>
                  </div>
                </td>
                {member.history.map((h: any, i: number) => (
                  <td key={i} className="p-1">
                    <div 
                      className={cn(
                          "h-8 w-12 mx-auto rounded-md flex items-center justify-center text-[10px] font-black shadow-sm transition-transform hover:scale-110 cursor-help",
                          getColor(h.icp)
                      )}
                      title={`${name} - ${h.icp} pts`}
                    >
                      {h.icp}
                    </div>
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}