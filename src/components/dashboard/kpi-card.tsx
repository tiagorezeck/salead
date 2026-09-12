"use client";

import React from 'react';
import { cn } from "@/lib/utils";
import { type LucideIcon, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface KPICardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon: LucideIcon;
  delta?: string;
  isPositive?: boolean;
  status?: "success" | "warning" | "destructive" | "default";
  className?: string;
}

export function KPICard({ label, value, subValue, icon: Icon, delta, isPositive, status, className }: KPICardProps) {
  const statusColors = {
    success: "text-success bg-success/10 border-success/20",
    warning: "text-warning bg-warning/10 border-warning/20",
    destructive: "text-destructive bg-destructive/10 border-destructive/20",
    default: "text-muted-foreground bg-muted/50 border-border"
  };

  return (
    <div className={cn("bg-gradient-surface border border-border rounded-2xl p-3 shadow-card group transition-all hover:border-primary/30", className)}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={cn("p-1.5 rounded-full border shrink-0", status ? statusColors[status] : "bg-primary/10 text-primary border-primary/20")}>
            <Icon className="h-3.5 w-3.5" />
          </div>
          <div className="text-[9px] uppercase font-black tracking-widest text-muted-foreground truncate group-hover:text-primary transition-colors">
            {label}
          </div>
        </div>
        {delta && (
          <div className={cn("flex items-center gap-0.5 text-[8px] font-black px-1.5 py-0.5 rounded-full shrink-0", isPositive ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive")}>
            {isPositive ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
            {delta}
          </div>
        )}
      </div>
      
      <div className="space-y-0">
        <div className="font-display text-xl font-bold tracking-tight leading-tight">{value}</div>
        {subValue && <div className="text-[8px] text-muted-foreground font-medium truncate opacity-70">{subValue}</div>}
      </div>
    </div>
  );
}