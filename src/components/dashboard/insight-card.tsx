"use client";

import React from 'react';
import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";

interface InsightCardProps {
  title: string;
  desc: string;
  icon: LucideIcon;
  variant?: 'destructive' | 'success' | 'warning' | 'info' | 'default';
}

export function InsightCard({ title, desc, icon: Icon, variant = 'default' }: InsightCardProps) {
  const styles = {
    destructive: "bg-destructive/5 border-destructive/20 text-destructive",
    success: "bg-success/5 border-success/20 text-success",
    warning: "bg-warning/5 border-warning/20 text-warning",
    info: "bg-info/5 border-info/20 text-info",
    default: "bg-muted/30 border-border text-muted-foreground"
  };

  return (
    <div className={cn(
      "p-6 rounded-[2.5rem] border-2 flex items-center gap-6 transition-all hover:scale-[1.01] group cursor-default",
      styles[variant]
    )}>
      <div className="h-12 w-12 rounded-2xl bg-current opacity-10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
        <Icon className="h-6 w-6" />
      </div>
      <div className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 absolute opacity-100 pointer-events-none">
        <Icon className="h-6 w-6" />
      </div>
      <div className="space-y-1">
        <h4 className="font-display font-black text-xl leading-none tracking-tight">{title}</h4>
        <p className="text-sm font-medium opacity-80 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}