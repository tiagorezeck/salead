// src/components/marketing/visual-canvas/LayersPanel.tsx

import React, { useState } from "react";
import {
  Layers,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  GripVertical,
  Trash2,
  Copy,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Type,
  Image as ImageIcon,
  CheckCircle2,
  HelpCircle,
  CreditCard,
  ListFilter,
  MessageSquare,
  ArrowUp,
  ArrowDown,
  Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCanvasOrchestratorStore } from "./useCanvasOrchestratorStore";
import type { Section, SectionType } from "@/lib/lp-store";
import type { SelectedElement } from "./types";

interface LayersPanelProps {
  sections: Section[];
  selectedElement: SelectedElement | null;
  onSelectSection: (sectionId: string) => void;
  onSelectElement: (element: SelectedElement) => void;
  onToggleVisibility: (sectionId: string) => void;
  onDuplicateSection: (sectionId: string) => void;
  onDeleteSection: (sectionId: string) => void;
  onMoveSection: (sectionId: string, direction: "up" | "down") => void;
  onAddSection: () => void;
}

export function LayersPanel({
  sections,
  selectedElement,
  onSelectSection,
  onSelectElement,
  onToggleVisibility,
  onDuplicateSection,
  onDeleteSection,
  onMoveSection,
  onAddSection
}: LayersPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const {
    elementBounds,
    toggleElementLock,
    bringToFront,
    sendToBack,
    bringForward,
    sendBackward
  } = useCanvasOrchestratorStore();

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getSectionIcon = (type: SectionType) => {
    switch (type) {
      case "hero":
        return <Sparkles className="w-3.5 h-3.5 text-[#FF6A00]" />;
      case "features":
        return <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />;
      case "stats":
        return <Sparkles className="w-3.5 h-3.5 text-emerald-400" />;
      case "testimonial":
        return <MessageSquare className="w-3.5 h-3.5 text-purple-400" />;
      case "pricing":
        return <CreditCard className="w-3.5 h-3.5 text-amber-400" />;
      case "faq":
        return <HelpCircle className="w-3.5 h-3.5 text-teal-400" />;
      case "survey":
        return <ListFilter className="w-3.5 h-3.5 text-indigo-400" />;
      default:
        return <Layers className="w-3.5 h-3.5 text-white/60" />;
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#121418] border-r border-[#23272F] select-none text-xs">
      {/* Cabeçalho do Painel de Camadas */}
      <div className="p-3.5 border-b border-[#23272F] flex items-center justify-between bg-[#16181D]">
        <div className="flex items-center gap-2 font-bold text-white tracking-wide">
          <Layers className="w-4 h-4 text-[#FF6A00]" />
          <span>Camadas & Z-Index</span>
        </div>
        <span className="text-[10px] font-mono bg-white/10 px-2 py-0.5 rounded-full text-white/70 font-semibold">
          {sections.length} seções
        </span>
      </div>

      {/* Árvore de Camadas */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin">
        {sections.map((sec, index) => {
          const isSelected = selectedElement?.sectionId === sec.id;
          const isExpanded = !!expandedSections[sec.id];
          const secBounds = elementBounds[sec.id];
          const isLocked = secBounds?.isLocked || false;
          const zIndexVal = secBounds?.zIndex ?? (index + 1) * 10;

          let snippet = sec.type.toUpperCase();
          if ("title" in sec && sec.title) snippet = sec.title;
          else if ("quote" in sec && (sec as any).author) snippet = (sec as any).author;

          return (
            <div
              key={sec.id}
              className={cn(
                "rounded-xl border transition-all overflow-hidden",
                isSelected
                  ? "bg-[#FF6A00]/10 border-[#FF6A00]/60 shadow-sm text-white"
                  : "bg-[#181B22] border-white/5 hover:border-white/20 text-white/70 hover:text-white",
                sec.visible === false && "opacity-40"
              )}
            >
              {/* Item da Seção */}
              <div
                onClick={() => onSelectSection(sec.id)}
                className="p-2.5 flex items-center gap-2 cursor-pointer group"
              >
                {/* Botão de Expandir Elementos Internos */}
                <button
                  type="button"
                  onClick={(e) => toggleExpand(sec.id, e)}
                  className="p-0.5 rounded hover:bg-white/10 text-white/50 hover:text-white"
                >
                  {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>

                {/* Ícone do Tipo */}
                <div className="p-1 rounded-lg bg-white/5 shrink-0">
                  {getSectionIcon(sec.type)}
                </div>

                {/* Nome e Título da Seção */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-black uppercase tracking-wider text-[#FF6A00]">
                      {sec.type}
                    </span>
                    <span className="text-[9px] font-mono px-1 rounded bg-white/10 text-white/60">
                      Z:{zIndexVal}
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold truncate block">
                    {snippet}
                  </span>
                </div>

                {/* Ações Rápidas da Camada */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* Reordenar */}
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveSection(sec.id, "up");
                      bringForward(sec.id);
                    }}
                    className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white disabled:opacity-20"
                    title="Subir Camada (Bring Forward)"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    disabled={index === sections.length - 1}
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveSection(sec.id, "down");
                      sendBackward(sec.id);
                    }}
                    className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white disabled:opacity-20"
                    title="Descer Camada (Send Backward)"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>

                  {/* Bloquear */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleElementLock(sec.id);
                    }}
                    className={cn("p-1 rounded hover:bg-white/10", isLocked ? "text-amber-400 opacity-100" : "text-white/40")}
                    title={isLocked ? "Desbloquear Seção" : "Bloquear Seção"}
                  >
                    {isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                  </button>

                  {/* Visibilidade */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleVisibility(sec.id);
                    }}
                    className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white"
                    title={sec.visible === false ? "Mostrar" : "Ocultar"}
                  >
                    {sec.visible === false ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              {/* Sub-elementos da Seção (quando expandido) */}
              {isExpanded && (
                <div className="bg-[#121418]/80 border-t border-white/5 p-2 pl-6 space-y-1">
                  {"title" in sec && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectElement({
                          sectionId: sec.id,
                          elementType: `${sec.type}_title` as any,
                          label: "Título Principal"
                        });
                      }}
                      className={cn(
                        "p-1.5 rounded-lg flex items-center gap-2 cursor-pointer hover:bg-white/5 transition-colors",
                        selectedElement?.elementType === `${sec.type}_title` && selectedElement.sectionId === sec.id && "bg-[#FF6A00]/20 text-white font-bold"
                      )}
                    >
                      <Type className="w-3 h-3 text-white/50" />
                      <span className="truncate text-[11px]">Título ({sec.title})</span>
                    </div>
                  )}

                  {"subtitle" in sec && sec.subtitle && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectElement({
                          sectionId: sec.id,
                          elementType: `${sec.type}_subtitle` as any,
                          label: "Subtítulo / Apoio"
                        });
                      }}
                      className={cn(
                        "p-1.5 rounded-lg flex items-center gap-2 cursor-pointer hover:bg-white/5 transition-colors",
                        selectedElement?.elementType === `${sec.type}_subtitle` && selectedElement.sectionId === sec.id && "bg-[#FF6A00]/20 text-white font-bold"
                      )}
                    >
                      <Type className="w-3 h-3 text-white/40" />
                      <span className="truncate text-[11px]">Subtítulo</span>
                    </div>
                  )}

                  {"image" in sec && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectElement({
                          sectionId: sec.id,
                          elementType: `${sec.type}_media` as any,
                          label: "Mídia / Foto Principal"
                        });
                      }}
                      className={cn(
                        "p-1.5 rounded-lg flex items-center gap-2 cursor-pointer hover:bg-white/5 transition-colors",
                        selectedElement?.elementType === `${sec.type}_media` && selectedElement.sectionId === sec.id && "bg-[#FF6A00]/20 text-white font-bold"
                      )}
                    >
                      <ImageIcon className="w-3 h-3 text-[#FF6A00]" />
                      <span className="truncate text-[11px]">Imagem / Mídia</span>
                    </div>
                  )}

                  {"ctaPrimary" in sec && sec.ctaPrimary && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectElement({
                          sectionId: sec.id,
                          elementType: "hero_cta_primary",
                          label: "Botão CTA Principal"
                        });
                      }}
                      className={cn(
                        "p-1.5 rounded-lg flex items-center gap-2 cursor-pointer hover:bg-white/5 transition-colors",
                        selectedElement?.elementType === "hero_cta_primary" && selectedElement.sectionId === sec.id && "bg-[#FF6A00]/20 text-white font-bold"
                      )}
                    >
                      <Sparkles className="w-3 h-3 text-[#FF6A00]" />
                      <span className="truncate text-[11px]">Botão CTA ({sec.ctaPrimary})</span>
                    </div>
                  )}

                  {/* Itens de Recursos / Cards */}
                  {"items" in sec && Array.isArray((sec as any).items) && (
                    <div className="space-y-0.5 pt-1">
                      <div className="text-[9px] font-black uppercase tracking-wider text-white/40 px-1.5">
                        Itens / Cards ({(sec as any).items.length})
                      </div>
                      {(sec as any).items.map((item: any, itemIdx: number) => (
                        <div
                          key={item.id || itemIdx}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectElement({
                              sectionId: sec.id,
                              elementType: `${sec.type}_card` as any,
                              subId: item.id,
                              label: item.title || item.label || item.q || `Item ${itemIdx + 1}`
                            });
                          }}
                          className={cn(
                            "p-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer hover:bg-white/5 text-white/70",
                            selectedElement?.subId === item.id && "bg-[#FF6A00]/20 text-white font-bold"
                          )}
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-[#FF6A00]" />
                          <span className="truncate text-[10px]">
                            {item.title || item.label || item.q || `Item ${itemIdx + 1}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Botão Adicionar Nova Seção */}
      <div className="p-3 border-t border-[#23272F] bg-[#121418]">
        <button
          type="button"
          onClick={onAddSection}
          className="w-full py-2.5 rounded-xl bg-[#FF6A00] hover:bg-[#FF6A00]/90 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-[#FF6A00]/20 transition-all cursor-pointer hover:scale-[1.02] active:scale-98"
        >
          <Plus className="w-4 h-4" />
          <span>Adicionar Camada / Seção</span>
        </button>
      </div>
    </div>
  );
}
