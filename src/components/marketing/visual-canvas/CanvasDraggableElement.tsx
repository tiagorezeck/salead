// src/components/marketing/visual-canvas/CanvasDraggableElement.tsx

import React, { useRef, useEffect, useState } from "react";
import { Move, Lock, Eye, EyeOff, Sparkles, Maximize2, Layers, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCanvasOrchestratorStore } from "./useCanvasOrchestratorStore";
import type { ResizeHandle, SelectedElement } from "./types";

interface CanvasDraggableElementProps {
  id: string;
  sectionId: string;
  elementType: SelectedElement["elementType"];
  subId?: string;
  label: string;
  children: React.ReactNode;
  className?: string;
  defaultPosition?: { x: number; y: number };
  defaultDimensions?: { width?: number | string; height?: number | string };
  defaultZIndex?: number;
  allowFreeformDrag?: boolean;
  onDoubleClick?: (e: React.MouseEvent) => void;
}

export function CanvasDraggableElement({
  id,
  sectionId,
  elementType,
  subId,
  label,
  children,
  className,
  defaultPosition = { x: 0, y: 0 },
  defaultDimensions = { width: "100%", height: "auto" },
  defaultZIndex = 10,
  allowFreeformDrag = true,
  onDoubleClick
}: CanvasDraggableElementProps) {
  const elementRef = useRef<HTMLDivElement>(null);

  const {
    elementBounds,
    selectedElement,
    selectedElementIds,
    hoveredElementId,
    dragState,
    resizeState,
    editorMode,
    isFreeformMode,
    registerElementBounds,
    selectElement,
    setHoveredElement,
    startDrag,
    startResize,
    toggleElementLock,
    updateElementBounds
  } = useCanvasOrchestratorStore();

  const elementKey = id;
  
  // Verificação precisa de seleção de elemento específico
  const isSelected = 
    selectedElementIds.includes(elementKey) || 
    (selectedElement?.sectionId === sectionId && 
     selectedElement?.elementType === elementType && 
     (subId ? selectedElement?.subId === subId : !selectedElement?.subId));

  const isHovered = hoveredElementId === elementKey;
  const isCurrentlyDragging = dragState?.elementId === elementKey && dragState.isDragging;
  const isCurrentlyResizing = resizeState?.elementId === elementKey && resizeState.isResizing;

  const bounds = elementBounds[elementKey] || {
    x: defaultPosition.x,
    y: defaultPosition.y,
    width: defaultDimensions.width,
    height: defaultDimensions.height,
    zIndex: defaultZIndex,
    rotation: 0,
    isLocked: false,
    isVisible: true,
    isFreeform: true
  };

  // Registro inicial de bounds no orquestrador
  useEffect(() => {
    registerElementBounds(elementKey, {
      x: defaultPosition.x,
      y: defaultPosition.y,
      width: defaultDimensions.width,
      height: defaultDimensions.height,
      zIndex: defaultZIndex,
      isFreeform: true
    });
  }, [elementKey, defaultPosition.x, defaultPosition.y, defaultDimensions.width, defaultDimensions.height, defaultZIndex, registerElementBounds]);

  if (bounds.isVisible === false && editorMode === "preview") {
    return null;
  }

  // Tratamento de Início de Arraste (Drag & Drop)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (editorMode !== "edit" || bounds.isLocked) return;
    if ((e.target as HTMLElement).closest(".no-drag-handle")) return;

    e.stopPropagation();

    selectElement(
      {
        sectionId,
        elementType,
        subId,
        label
      },
      e.shiftKey
    );

    // Inicia imediatamente o arraste
    startDrag(elementKey, e.clientX, e.clientY, bounds);
  };

  // Início de Redimensionamento pelas Alças
  const handleResizeStart = (handle: ResizeHandle, e: React.MouseEvent) => {
    if (editorMode !== "edit" || bounds.isLocked) return;
    e.stopPropagation();
    e.preventDefault();

    startResize(elementKey, handle, e.clientX, e.clientY, bounds);
  };

  const handleResetPosition = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateElementBounds(elementKey, { x: 0, y: 0, isFreeform: false });
  };

  const resizeHandles: ResizeHandle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

  const handleClasses: Record<ResizeHandle, string> = {
    nw: "-top-1.5 -left-1.5 cursor-nwse-resize",
    n: "-top-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize",
    ne: "-top-1.5 -right-1.5 cursor-nesw-resize",
    e: "top-1/2 -right-1.5 -translate-y-1/2 cursor-ew-resize",
    se: "-bottom-1.5 -right-1.5 cursor-nwse-resize",
    s: "-bottom-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize",
    sw: "-bottom-1.5 -left-1.5 cursor-nesw-resize",
    w: "top-1/2 -left-1.5 -translate-y-1/2 cursor-ew-resize"
  };

  // Posição dinâmica calculada
  const currentX = isCurrentlyDragging && dragState ? dragState.currentX : bounds.x;
  const currentY = isCurrentlyDragging && dragState ? dragState.currentY : bounds.y;
  const currentW = isCurrentlyResizing && resizeState ? resizeState.currentBounds.width : bounds.width;
  const currentH = isCurrentlyResizing && resizeState ? resizeState.currentBounds.height : bounds.height;

  const hasOffset = currentX !== 0 || currentY !== 0;

  return (
    <div
      ref={elementRef}
      id={`canvas-elem-${elementKey}`}
      onMouseEnter={() => editorMode === "edit" && setHoveredElement(elementKey)}
      onMouseLeave={() => editorMode === "edit" && setHoveredElement(null)}
      onMouseDown={handleMouseDown}
      onDoubleClick={(e) => {
        if (editorMode === "edit" && onDoubleClick) {
          e.stopPropagation();
          onDoubleClick(e);
        }
      }}
      style={{
        zIndex: bounds.zIndex,
        ...(hasOffset || isCurrentlyDragging
          ? {
              transform: `translate3d(${currentX}px, ${currentY}px, 0px)`,
              willChange: "transform"
            }
          : {}),
        ...(currentW && currentW !== "100%" && currentW !== "auto"
          ? { width: typeof currentW === "number" ? `${currentW}px` : currentW }
          : {}),
        ...(currentH && currentH !== "auto"
          ? { height: typeof currentH === "number" ? `${currentH}px` : currentH }
          : {}),
        opacity: bounds.isVisible === false ? 0.35 : 1
      }}
      className={cn(
        "relative transition-[box-shadow,opacity] select-none",
        editorMode === "edit" && "cursor-move group/drag",
        editorMode === "edit" && isHovered && !isSelected && "outline-dashed outline-1 outline-[#FF6A00]/60 ring-1 ring-[#FF6A00]/20 rounded-lg",
        isSelected && editorMode === "edit" && "ring-2 ring-[#FF6A00] shadow-lg rounded-lg",
        isCurrentlyDragging && "opacity-90 shadow-2xl scale-[1.01] z-50 ring-2 ring-[#FF6A00]",
        className
      )}
    >
      {/* Indicador de Badge e Ações de Camada ao Selecionar */}
      {isSelected && editorMode === "edit" && (
        <>
          {/* Badge Superior Esquerdo com Nome do Elemento, Coordenadas e Camada Z-Index */}
          <div className="absolute -top-7 left-0 z-40 bg-[#FF6A00] text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded shadow-lg flex items-center gap-1.5 no-drag-handle pointer-events-auto whitespace-nowrap">
            <Move className="w-2.5 h-2.5" />
            <span>{label}</span>
            <span className="opacity-80 text-[8px] bg-black/30 px-1 rounded flex items-center gap-0.5">
              <Layers className="w-2 h-2" />
              Z:{bounds.zIndex}
            </span>
            {hasOffset && (
              <span className="text-[8px] font-mono opacity-80">
                ({Math.round(currentX)}, {Math.round(currentY)})
              </span>
            )}
            {bounds.isLocked && <Lock className="w-2.5 h-2.5 text-amber-300" />}
          </div>

          {/* Botões de Ação Rápida no Topo Direito (Resetar Posição e Trava) */}
          <div className="absolute -top-7 right-0 z-40 flex items-center gap-1 bg-[#16181D] border border-white/20 p-0.5 rounded shadow-lg no-drag-handle pointer-events-auto">
            {hasOffset && (
              <button
                type="button"
                onClick={handleResetPosition}
                className="p-1 rounded text-[10px] text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                title="Resetar Posição Original (0, 0)"
              >
                <RotateCcw className="w-2.5 h-2.5" />
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleElementLock(elementKey);
              }}
              className={cn(
                "p-1 rounded text-[10px] transition-colors",
                bounds.isLocked ? "bg-amber-500/20 text-amber-300" : "text-white/60 hover:text-white hover:bg-white/10"
              )}
              title={bounds.isLocked ? "Destravar Elemento" : "Travar Posição"}
            >
              <Lock className="w-2.5 h-2.5" />
            </button>
          </div>

          {/* 8 Alças de Redimensionamento */}
          {!bounds.isLocked &&
            resizeHandles.map((handle) => (
              <div
                key={handle}
                onMouseDown={(e) => handleResizeStart(handle, e)}
                className={cn(
                  "absolute w-2.5 h-2.5 bg-[#FF6A00] border-2 border-white rounded-xs z-40 shadow-sm no-drag-handle hover:scale-125 transition-transform",
                  handleClasses[handle]
                )}
              />
            ))}
        </>
      )}

      {/* Conteúdo do Elemento */}
      <div className="w-full h-full pointer-events-auto">{children}</div>
    </div>
  );
}
