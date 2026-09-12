import { type Stage, type Lead, type PipelineStage } from "@/data/mock";
import { Pencil, Trash2, Check } from "lucide-react";
import { useState } from "react";
import { KanbanCard } from "./kanban-card";
import { formatCurrency, cn } from "@/lib/utils";

interface KanbanColumnProps {
  stage: PipelineStage;
  leads: Lead[];
  pipelineColor?: string;
  isOver: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: () => void;
  onLeadClick: (id: string) => void;
  onLeadDragStart: (id: string) => void;
  onLeadDragEnd: () => void;
  onRename: (oldName: string, newName: string) => void;
  onDelete: (stageName: string) => void;
}

export function KanbanColumn({
  stage, leads, pipelineColor, isOver, onDragOver, onDragLeave, onDrop,
  onLeadClick, onLeadDragStart, onLeadDragEnd, onRename, onDelete
}: KanbanColumnProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(stage.name);
  const total = leads.reduce((s, l) => s + l.value, 0);

  const handleCommit = () => {
    if (editValue.trim() && editValue !== stage.name) onRename(stage.name, editValue);
    setIsEditing(false);
  };

  const colorMap: Record<string, string> = {
    default: "bg-muted-foreground/40",
    primary: "bg-primary",
    info: "bg-blue-500",
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    destructive: "bg-rose-500",
    purple: "bg-violet-500",
  };

  const borderMap: Record<string, string> = {
    default: "border-t-muted-foreground/20",
    primary: "border-t-primary",
    info: "border-t-blue-500",
    success: "border-t-emerald-500",
    warning: "border-t-amber-500",
    destructive: "border-t-rose-500",
    purple: "border-t-violet-500",
  };

  const colorKey = stage.color || 'default';
  const dotColor = colorMap[colorKey];
  const topBorder = borderMap[colorKey];

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        "w-72 flex-shrink-0 flex flex-col rounded-xl border border-t-4 transition-all duration-200",
        topBorder,
        isOver ? "bg-primary/10 border-primary/60 scale-[1.02] shadow-lg" : "bg-card/40 border-border"
      )}
    >
      <div className="px-3 py-2.5 border-b border-border flex items-center gap-2 group/header">
        <div className={cn("h-2.5 w-2.5 rounded-full shadow-sm", dotColor)} />
        {isEditing ? (
          <>
            <input
              autoFocus
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleCommit}
              onKeyDown={(e) => { if (e.key === "Enter") handleCommit(); if (e.key === "Escape") setIsEditing(false); }}
              className="flex-1 bg-background border border-primary/40 rounded px-1.5 py-0.5 text-sm focus:outline-none"
            />
            <button onClick={handleCommit} className="text-success"><Check className="h-3.5 w-3.5" /></button>
          </>
        ) : (
          <>
            <div className="text-sm font-bold flex-1 truncate">{stage.name}</div>
            <span className="text-[10px] font-bold text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-md">{leads.length}</span>
            <button onClick={() => setIsEditing(true)} className="opacity-0 group-hover/header:opacity-100 text-muted-foreground hover:text-foreground transition-opacity">
              <Pencil className="h-3 w-3" />
            </button>
          </>
        )}
      </div>
      <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 border-b border-border bg-muted/5">
        {formatCurrency(total)}
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[150px]">
        {leads.map((l) => (
          <KanbanCard
            key={l.id}
            lead={l}
            color={pipelineColor}
            onClick={() => onLeadClick(l.id)}
            onDragStart={() => onLeadDragStart(l.id)}
            onDragEnd={onLeadDragEnd}
          />
        ))}
        {leads.length === 0 && (
          <div className="text-[11px] text-muted-foreground text-center py-10 border border-dashed border-border/50 rounded-lg bg-muted/5">
            {isOver ? "Solte para mover" : "Nenhum lead"}
          </div>
        )}
      </div>
    </div>
  );
}