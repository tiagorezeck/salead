// src/components/marketing/visual-canvas/InteractiveVisualCanvas.tsx

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Sparkles,
  Type,
  Image as ImageIcon,
  Move,
  Maximize2,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  Check,
  Plus,
  Minus,
  RotateCcw,
  Sliders,
  ZoomIn,
  ZoomOut,
  Monitor,
  Tablet,
  Smartphone,
  Grid,
  Magnet,
  Layers,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignVerticalSpaceAround,
  Lock,
  Unlock,
  Eye,
  EyeOff
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PublicRenderer } from "@/modules/landing-pages/renderer/PublicRenderer";
import { FloatingContextualToolbar } from "./FloatingContextualToolbar";
import { CanvasDraggableElement } from "./CanvasDraggableElement";
import { InteractiveSectionCanvas } from "./InteractiveSectionCanvas";
import { useCanvasOrchestratorStore } from "./useCanvasOrchestratorStore";
import type { SelectedElement, ElementStyleOverrides, AlignmentGuide } from "./types";
import type { Section, LP, LPTheme } from "@/lib/lp-store";
import { READY_MADE_PRESETS } from "@/lib/lp-store";

interface InteractiveVisualCanvasProps {
  lp: LP;
  deviceView: "desktop" | "tablet" | "mobile";
  editorMode: "edit" | "preview";
  selectedElement: SelectedElement | null;
  elementStyles: Record<string, ElementStyleOverrides>;
  onSelectElement: (element: SelectedElement | null) => void;
  onUpdateElementStyle: (elementKey: string, updates: Partial<ElementStyleOverrides>) => void;
  onUpdateSectionContent: (sectionId: string, updates: Partial<Section> | any) => void;
  onDuplicateSection: (sectionId: string) => void;
  onDeleteSection: (sectionId: string) => void;
  onMoveSection: (sectionId: string, direction: "up" | "down") => void;
  onTriggerUpload: (onUploaded: (url: string) => void) => void;
  onOpenAIQuickPrompt?: (context: string) => void;
  onSelectPreset?: (presetId: string) => void;
}

export function InteractiveVisualCanvas({
  lp,
  deviceView,
  editorMode,
  selectedElement,
  elementStyles,
  onSelectElement,
  onUpdateElementStyle,
  onUpdateSectionContent,
  onDuplicateSection,
  onDeleteSection,
  onMoveSection,
  onTriggerUpload,
  onOpenAIQuickPrompt,
  onSelectPreset
}: InteractiveVisualCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const outerWrapperRef = useRef<HTMLDivElement>(null);

  // Integração com a camada de orquestração Zustand
  const {
    zoom,
    setZoom,
    zoomIn,
    zoomOut,
    resetZoom,
    snapEnabled,
    toggleSnap,
    guidesEnabled,
    toggleGuides,
    gridVisible,
    toggleGrid,
    isFreeformMode,
    toggleFreeformMode,
    dragState,
    resizeState,
    activeGuides,
    updateDrag,
    endDrag,
    updateResize,
    endResize,
    bringToFront,
    sendToBack,
    bringForward,
    sendBackward,
    alignSelected,
    elementBounds
  } = useCanvasOrchestratorStore();

  const selectedSection = (lp.sections || []).find((s) => s.id === selectedElement?.sectionId) || null;
  const currentElementKey = selectedElement
    ? `${selectedElement.sectionId}_${selectedElement.elementType}${selectedElement.subId ? `_${selectedElement.subId}` : ""}`
    : "";
  const currentOverrides = currentElementKey ? elementStyles[currentElementKey] || {} : {};

  // Listener global de movimento de mouse para Drag and Drop e Redimensionamento
  const handleWindowMouseMove = useCallback(
    (e: MouseEvent) => {
      if (dragState && dragState.isDragging) {
        const containerRect = canvasRef.current?.getBoundingClientRect();
        updateDrag(e.clientX, e.clientY, containerRect ? { width: containerRect.width, height: containerRect.height } : undefined);
      } else if (resizeState && resizeState.isResizing) {
        updateResize(e.clientX, e.clientY, e.shiftKey);
      }
    },
    [dragState, resizeState, updateDrag, updateResize]
  );

  const handleWindowMouseUp = useCallback(() => {
    if (dragState?.isDragging) {
      endDrag();
    }
    if (resizeState?.isResizing) {
      endResize();
    }
  }, [dragState, resizeState, endDrag, endResize]);

  useEffect(() => {
    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);
    };
  }, [handleWindowMouseMove, handleWindowMouseUp]);

  // Desselecionar ao clicar no fundo vazio
  const handleCanvasBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).id === "canvas-outer-wrapper") {
      onSelectElement(null);
    }
  };

  const handleUpdateStyle = (updates: Partial<ElementStyleOverrides>) => {
    if (!currentElementKey) return;
    onUpdateElementStyle(currentElementKey, updates);
  };

  return (
    <div
      ref={outerWrapperRef}
      id="canvas-outer-wrapper"
      onClick={handleCanvasBackgroundClick}
      className={cn(
        "flex-1 w-full bg-[#08090B] flex flex-col items-center justify-start overflow-y-auto min-h-0 relative select-none scrollbar-thin",
        editorMode === "preview" && deviceView === "desktop" ? "p-0" : "p-4 md:p-8"
      )}
    >
      {/* Barra Flutuante de Controle e Orquestração do Canvas (Apenas no Modo Edit) */}
      {editorMode === "edit" && (
        <div className="sticky top-0 z-30 mb-4 bg-[#16181D]/90 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl px-3 py-1.5 flex flex-wrap items-center gap-3 text-xs text-white/80 select-none">
          
          {/* Controles de Zoom */}
          <div className="flex items-center gap-1 bg-white/5 rounded-xl p-0.5">
            <button
              type="button"
              onClick={zoomOut}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
              title="Diminuir Zoom"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[11px] font-bold px-1.5 text-white">{zoom}%</span>
            <button
              type="button"
              onClick={zoomIn}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
              title="Aumentar Zoom"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={resetZoom}
              className="px-1.5 py-0.5 text-[10px] font-bold text-[#FF6A00] hover:bg-white/10 rounded"
              title="Ajustar 100%"
            >
              100%
            </button>
          </div>

          <div className="h-4 w-[1px] bg-white/10 hidden sm:block" />

          {/* Ferramentas de Precisão: Grade, Snap Magnético e Guias */}
          <div className="flex items-center gap-1 bg-white/5 rounded-xl p-0.5">
            <button
              type="button"
              onClick={toggleSnap}
              className={cn(
                "px-2 py-1 rounded-lg flex items-center gap-1 text-[11px] font-bold transition-all",
                snapEnabled ? "bg-[#FF6A00]/20 text-[#FF6A00]" : "text-white/40 hover:text-white"
              )}
              title="Alinhamento Magnético (Snap 8px)"
            >
              <Magnet className="w-3 h-3" />
              <span className="hidden md:inline">Snap</span>
            </button>

            <button
              type="button"
              onClick={toggleGrid}
              className={cn(
                "px-2 py-1 rounded-lg flex items-center gap-1 text-[11px] font-bold transition-all",
                gridVisible ? "bg-[#FF6A00]/20 text-[#FF6A00]" : "text-white/40 hover:text-white"
              )}
              title="Exibir Grade Espacial"
            >
              <Grid className="w-3 h-3" />
              <span className="hidden md:inline">Grade</span>
            </button>

            <button
              type="button"
              onClick={toggleFreeformMode}
              className={cn(
                "px-2 py-1 rounded-lg flex items-center gap-1 text-[11px] font-bold transition-all",
                isFreeformMode ? "bg-[#FF6A00] text-white" : "text-white/50 hover:text-white"
              )}
              title="Modo de Posicionamento Livre Drag & Drop"
            >
              <Move className="w-3 h-3" />
              <span className="hidden md:inline">Livre</span>
            </button>
          </div>

          <div className="h-4 w-[1px] bg-white/10 hidden sm:block" />

          {/* Seleção de Modelo Pronto */}
          <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-2 py-1">
            <Sparkles className="w-3.5 h-3.5 text-[#FF6A00] shrink-0" />
            <span className="text-[10px] font-bold text-white/50 uppercase hidden md:inline">Modelo:</span>
            <select
              value={lp.template || ""}
              onChange={(e) => {
                if (e.target.value && onSelectPreset) {
                  onSelectPreset(e.target.value);
                }
              }}
              className="bg-transparent text-[11px] font-bold text-white focus:outline-none cursor-pointer border-0 pr-1 max-w-[160px] truncate"
              title="Mudar Modelo Pronto da Landing Page"
            >
              <option value="" disabled className="bg-[#16181D] text-white/50">-- Alterar Modelo --</option>
              {READY_MADE_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id} className="bg-[#16181D] text-white font-medium">
                  {preset.name}
                </option>
              ))}
            </select>
          </div>

          {/* Ações Rápidas de Camada / Z-Index se houver elemento selecionado */}
          {selectedElement && (
            <>
              <div className="h-4 w-[1px] bg-white/10 hidden sm:block" />
              <div className="flex items-center gap-1 bg-white/5 rounded-xl p-0.5">
                <button
                  type="button"
                  onClick={() => currentElementKey && bringToFront(currentElementKey)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white"
                  title="Trazer para a Frente (Z-Index Top)"
                >
                  <Layers className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => currentElementKey && sendToBack(currentElementKey)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white"
                  title="Enviar para Trás (Z-Index Bottom)"
                >
                  <Layers className="w-3.5 h-3.5 rotate-180" />
                </button>
              </div>
            </>
          )}

          <div className="h-4 w-[1px] bg-white/10 hidden sm:block" />

          {/* Indicador de Status do Orquestrador */}
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-white/70">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Editor Visual Ativo</span>
          </div>
        </div>
      )}

      {/* Barra de Ferramentas Flutuante Contextual sobre o elemento selecionado */}
      {selectedElement && selectedSection && editorMode === "edit" && (
        <FloatingContextualToolbar
          selected={selectedElement}
          section={selectedSection}
          theme={lp.theme}
          styleOverrides={currentOverrides}
          onUpdateStyle={handleUpdateStyle}
          onUpdateContent={(field, val) => onUpdateSectionContent(selectedSection.id, { [field]: val })}
          onDuplicate={() => onDuplicateSection(selectedSection.id)}
          onDelete={() => onDeleteSection(selectedSection.id)}
          onMoveUp={() => onMoveSection(selectedSection.id, "up")}
          onMoveDown={() => onMoveSection(selectedSection.id, "down")}
          onBringForward={() => currentElementKey && bringForward(currentElementKey)}
          onSendBackward={() => currentElementKey && sendBackward(currentElementKey)}
          onTriggerUpload={() => {
            onTriggerUpload((url) => {
              if (selectedSection.type === "hero") {
                onUpdateSectionContent(selectedSection.id, { image: url, mediaType: "image" });
              } else if (selectedSection.type === "cta") {
                onUpdateSectionContent(selectedSection.id, { image: url, mediaType: "image" });
              }
            });
          }}
          onOpenAIQuickPrompt={onOpenAIQuickPrompt}
          onClose={() => onSelectElement(null)}
        />
      )}

      {/* Frame do Canvas com Escala e Dimensões Responsivas */}
      <div
        ref={canvasRef}
        style={{
          transform: editorMode === "preview" && deviceView === "desktop" ? "none" : `scale(${zoom / 100})`,
          transformOrigin: "top center",
          transition: "transform 0.2s ease, width 0.3s ease",
          backgroundColor: lp.theme?.bg || "#0E0F12"
        }}
        className={cn(
          "w-full transition-all",
          editorMode === "edit"
            ? cn(
                "rounded-2xl shadow-2xl relative border border-white/10 mb-28",
                deviceView === "desktop" && "max-w-6xl",
                deviceView === "tablet" && "max-w-[768px] border-2 border-white/20 my-4",
                deviceView === "mobile" && "max-w-[390px] border-8 border-[#23272F] rounded-[48px] my-6 shadow-black/80",
                gridVisible && "bg-[radial-gradient(#ffffff15_1px,transparent_1px)] [background-size:16px_16px]"
              )
            : cn(
                deviceView === "desktop" && "max-w-none w-full shadow-none border-none rounded-none mb-0",
                deviceView === "tablet" && "max-w-[768px] border-2 border-white/20 my-4 rounded-2xl shadow-2xl mb-12",
                deviceView === "mobile" && "max-w-[390px] border-8 border-[#23272F] rounded-[48px] my-6 shadow-black/80 mb-12"
              )
        )}
      >
        {/* Moldura de Smartphone se estiver no modo Mobile */}
        {deviceView === "mobile" && (
          <div className="w-full bg-[#181B22] py-2 px-6 flex justify-between items-center text-[10px] text-white/50 border-b border-white/10 select-none">
            <span>9:41</span>
            <div className="w-24 h-4 bg-black rounded-full" />
            <span>5G 100%</span>
          </div>
        )}

        {/* Linhas Guias Magnéticas de Alinhamento Dinâmicas */}
        {activeGuides.map((guide, idx) => (
          <div
            key={idx}
            style={
              guide.type === "vertical"
                ? { left: `${guide.position}px`, top: 0, bottom: 0, width: "1px" }
                : { top: `${guide.position}px`, left: 0, right: 0, height: "1px" }
            }
            className="absolute bg-[#FF6A00] pointer-events-none z-50 shadow-[0_0_8px_#FF6A00]"
          >
            {guide.label && (
              <span className="absolute top-1 left-1 bg-[#FF6A00] text-white text-[9px] font-black uppercase px-1 rounded shadow">
                {guide.label}
              </span>
            )}
          </div>
        ))}

        {/* Renderizador de Seções Interativas com Draggable Wrapper */}
        <div className="w-full">
          {(lp.sections || []).filter((s) => s.visible !== false).map((sec, index) => {
            const isSectionSelected = selectedElement?.sectionId === sec.id;
            const secKey = sec.id;
            const secBounds = elementBounds[secKey];

            return (
              <div
                key={sec.id}
                onClick={(e) => {
                  if (editorMode === "edit") {
                    e.stopPropagation();
                    if (!selectedElement || selectedElement.sectionId !== sec.id) {
                      onSelectElement({
                        sectionId: sec.id,
                        elementType: "section",
                        label: `Seção ${sec.type.toUpperCase()}`
                      });
                    }
                  }
                }}
                className={cn(
                  "relative group transition-all",
                  editorMode === "edit" && "cursor-pointer hover:outline-dashed hover:outline-1 hover:outline-white/30",
                  isSectionSelected && editorMode === "edit" && "ring-2 ring-[#FF6A00] ring-offset-2 ring-offset-[#0E0F12]"
                )}
              >
                {/* Bounding Box Visual e Alças ao Selecionar Seção */}
                {isSectionSelected && editorMode === "edit" && (
                  <>
                    {/* Alças de Redimensionamento dos Cantos */}
                    <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-[#FF6A00] border-2 border-white rounded-sm z-30 pointer-events-none" />
                    <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-[#FF6A00] border-2 border-white rounded-sm z-30 pointer-events-none" />
                    <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-[#FF6A00] border-2 border-white rounded-sm z-30 pointer-events-none" />
                    <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-[#FF6A00] border-2 border-white rounded-sm z-30 pointer-events-none" />

                    {/* Alças dos Meios */}
                    <div className="absolute top-1/2 -left-1.5 w-3 h-3 bg-[#FF6A00] border-2 border-white rounded-sm z-30 pointer-events-none -translate-y-1/2" />
                    <div className="absolute top-1/2 -right-1.5 w-3 h-3 bg-[#FF6A00] border-2 border-white rounded-sm z-30 pointer-events-none -translate-y-1/2" />
                    <div className="absolute -top-1.5 left-1/2 w-3 h-3 bg-[#FF6A00] border-2 border-white rounded-sm z-30 pointer-events-none -translate-x-1/2" />
                    <div className="absolute -bottom-1.5 left-1/2 w-3 h-3 bg-[#FF6A00] border-2 border-white rounded-sm z-30 pointer-events-none -translate-x-1/2" />

                    {/* Tag com Nome da Seção e Camada Z-Index */}
                    <div className="absolute top-2 left-3 z-30 bg-[#FF6A00] text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md shadow-lg flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3" />
                      <span>{sec.type}</span>
                      {secBounds?.zIndex && (
                        <span className="opacity-80 text-[8px] bg-black/30 px-1 rounded">
                          Z:{secBounds.zIndex}
                        </span>
                      )}
                    </div>

                    {/* Botões de Ação Rápida no Canto Direito da Seção */}
                    <div className="absolute top-2 right-3 z-30 flex items-center gap-1 bg-[#16181D]/90 backdrop-blur-md border border-white/15 p-1 rounded-xl shadow-xl">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMoveSection(sec.id, "up");
                        }}
                        className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white"
                        title="Subir Seção"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMoveSection(sec.id, "down");
                        }}
                        className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white"
                        title="Descer Seção"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDuplicateSection(sec.id);
                        }}
                        className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white"
                        title="Duplicar Seção (Ctrl+D)"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSection(sec.id);
                        }}
                        className="p-1 rounded-lg hover:bg-red-500/20 text-red-400 hover:text-red-300"
                        title="Excluir Seção"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}

                {/* Renderização da Seção: Interativa com Drag & Drop de Textos e Imagens em Modo Edit */}
                <div className="pointer-events-auto">
                  {editorMode === "edit" ? (
                    <InteractiveSectionCanvas
                      section={sec}
                      theme={lp.theme || { primary: "#FF6A00", bg: "#0E0F12", surface: "#16181D", text: "#F5F6F8", radius: 14 }}
                      elementStyles={elementStyles}
                      onUpdateSectionContent={onUpdateSectionContent}
                      onTriggerUpload={onTriggerUpload}
                      onSelectElement={onSelectElement}
                      selectedElement={selectedElement}
                      editorMode={editorMode}
                    />
                  ) : (
                    <PublicRenderer
                      lp={{
                        ...lp,
                        sections: [sec]
                      }}
                      className="min-h-0"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
