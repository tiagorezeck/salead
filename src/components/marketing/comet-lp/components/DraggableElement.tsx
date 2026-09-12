import React, { useState, useRef, useEffect, createContext, useContext } from "react";
import {
  Move,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Sliders,
  Sparkles,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Maximize2,
  Check,
  X,
  Scaling,
  ChevronsUpDown,
  ChevronsLeftRight,
} from "lucide-react";
import { ElementOffset, CustomElementStyleRecord, TextAlign } from "../types/landingPage";
import { getMergedElementStyles } from "../utils/visualStyleHelpers";

export const EditorContext = createContext<{ hideEditToolbars?: boolean }>({ hideEditToolbars: false });

export interface DraggableElementProps {
  elementId: string;
  children: React.ReactNode;
  offset?: ElementOffset;
  onOffsetChange?: (offset: ElementOffset) => void;
  customStyle?: CustomElementStyleRecord;
  onCustomStyleChange?: (style: CustomElementStyleRecord) => void;
  onOpenVisualModal?: (elementId: string) => void;
  isEditorPreview?: boolean;
  hideEditToolbars?: boolean;
  className?: string;
  style?: React.CSSProperties;
  label?: string;
  showHandleOnHover?: boolean;
  inline?: boolean;
  widthMode?: "narrow" | "normal" | "wide" | "full";
  onChangeWidthMode?: (mode: "narrow" | "normal" | "wide" | "full") => void;
  customWidthPx?: number;
  onChangeCustomWidthPx?: (px: number | undefined) => void;
  customHeightPx?: number;
  onChangeCustomHeightPx?: (px: number | undefined) => void;
  align?: TextAlign;
  onChangeAlign?: (align: TextAlign) => void;
  onSyncWithPartner?: () => void;
  partnerLabel?: string;
}

export const DraggableElement: React.FC<DraggableElementProps> = ({
  elementId,
  children,
  offset = { x: 0, y: 0 },
  onOffsetChange,
  customStyle,
  onCustomStyleChange,
  onOpenVisualModal,
  isEditorPreview = false,
  hideEditToolbars,
  className = "",
  style,
  label,
  showHandleOnHover = true,
  inline = false,
  widthMode,
  onChangeWidthMode,
  customWidthPx: propsCustomWidthPx,
  onChangeCustomWidthPx,
  customHeightPx: propsCustomHeightPx,
  onChangeCustomHeightPx,
  align,
  onChangeAlign,
  onSyncWithPartner,
  partnerLabel,
}) => {
  const context = useContext(EditorContext);
  const effectiveHideEditToolbars = hideEditToolbars ?? context.hideEditToolbars;
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDir, setResizeDir] = useState<"e" | "s" | "se" | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isSelected, setIsSelected] = useState(false);
  const [showSizeMenu, setShowSizeMenu] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const startDragRef = useRef<{ startX: number; startY: number; initialOffsetX: number; initialOffsetY: number }>({
    startX: 0,
    startY: 0,
    initialOffsetX: 0,
    initialOffsetY: 0,
  });

  const startResizeRef = useRef<{
    startX: number;
    startY: number;
    initialWidth: number;
    initialHeight: number;
  }>({
    startX: 0,
    startY: 0,
    initialWidth: 0,
    initialHeight: 0,
  });

  const currentX = offset?.x ?? 0;
  const currentY = offset?.y ?? 0;

  // Active custom width & height
  const effectiveCustomWidthPx =
    propsCustomWidthPx ?? customStyle?.transform?.customWidthPx;
  const effectiveCustomHeightPx =
    propsCustomHeightPx ?? customStyle?.transform?.customHeightPx;

  // Compute merged styles from effects, transformations and offsets
  const mergedStyles = getMergedElementStyles({
    ...customStyle,
    offset: { x: currentX, y: currentY },
    transform: {
      ...(customStyle?.transform || {}),
      customWidthPx: effectiveCustomWidthPx,
      customHeightPx: effectiveCustomHeightPx,
    },
  });

  // Handle Dragging
  const handleStartDrag = (e: React.MouseEvent) => {
    if (!isEditorPreview) return;
    const target = e.target as HTMLElement;
    if (target.closest(".no-drag-handle, input, textarea, button, select, [contenteditable='true'], [data-inline-editable='true']")) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();

    setIsDragging(true);
    setIsSelected(true);
    startDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialOffsetX: currentX,
      initialOffsetY: currentY,
    };
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startDragRef.current.startX;
      const deltaY = e.clientY - startDragRef.current.startY;

      const newX = Math.round(startDragRef.current.initialOffsetX + deltaX);
      const newY = Math.round(startDragRef.current.initialOffsetY + deltaY);

      // Free movement across canvas (-2500px to +2500px)
      const clampedX = Math.max(-2500, Math.min(2500, newX));
      const clampedY = Math.max(-2500, Math.min(2500, newY));

      if (onOffsetChange) {
        onOffsetChange({ x: clampedX, y: clampedY });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, onOffsetChange]);

  // Handle Resizing (Width & Height)
  const handleStartResize = (e: React.MouseEvent, dir: "e" | "s" | "se") => {
    if (!isEditorPreview) return;
    e.preventDefault();
    e.stopPropagation();

    const rect = containerRef.current?.getBoundingClientRect();
    const currentW = rect ? Math.round(rect.width) : (effectiveCustomWidthPx || 400);
    const currentH = rect ? Math.round(rect.height) : (effectiveCustomHeightPx || 100);

    setIsResizing(true);
    setResizeDir(dir);
    setIsSelected(true);

    startResizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialWidth: currentW,
      initialHeight: currentH,
    };
  };

  useEffect(() => {
    if (!isResizing || !resizeDir) return;

    const handleResizeMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startResizeRef.current.startX;
      const deltaY = e.clientY - startResizeRef.current.startY;

      let newWidth = startResizeRef.current.initialWidth;
      let newHeight = startResizeRef.current.initialHeight;

      if (resizeDir === "e" || resizeDir === "se") {
        newWidth = Math.max(120, Math.min(2400, Math.round(startResizeRef.current.initialWidth + deltaX)));
        if (onChangeCustomWidthPx) {
          onChangeCustomWidthPx(newWidth);
        }
      }

      if (resizeDir === "s" || resizeDir === "se") {
        newHeight = Math.max(30, Math.min(2000, Math.round(startResizeRef.current.initialHeight + deltaY)));
        if (onChangeCustomHeightPx) {
          onChangeCustomHeightPx(newHeight);
        }
      }

      if (onCustomStyleChange) {
        onCustomStyleChange({
          ...(customStyle || { id: elementId }),
          transform: {
            ...(customStyle?.transform || {}),
            customWidthPx: resizeDir === "e" || resizeDir === "se" ? newWidth : effectiveCustomWidthPx,
            customHeightPx: resizeDir === "s" || resizeDir === "se" ? newHeight : effectiveCustomHeightPx,
          },
        });
      }
    };

    const handleResizeEnd = () => {
      setIsResizing(false);
      setResizeDir(null);
    };

    window.addEventListener("mousemove", handleResizeMove);
    window.addEventListener("mouseup", handleResizeEnd);

    return () => {
      window.removeEventListener("mousemove", handleResizeMove);
      window.removeEventListener("mouseup", handleResizeEnd);
    };
  }, [
    isResizing,
    resizeDir,
    elementId,
    customStyle,
    effectiveCustomWidthPx,
    effectiveCustomHeightPx,
    onChangeCustomWidthPx,
    onChangeCustomHeightPx,
    onCustomStyleChange,
  ]);

  // Click outside and Escape key to deselect
  useEffect(() => {
    if (!isEditorPreview) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsSelected(false);
        setShowSizeMenu(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsSelected(false);
        setShowSizeMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isEditorPreview]);

  const handleNudge = (dx: number, dy: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onOffsetChange) {
      onOffsetChange({
        x: Math.max(-2500, Math.min(2500, currentX + dx)),
        y: Math.max(-2500, Math.min(2500, currentY + dy)),
      });
    }
  };

  const handleResetPosition = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onOffsetChange) {
      onOffsetChange({ x: 0, y: 0 });
    }
  };

  const handleResetDimensions = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onChangeCustomWidthPx) onChangeCustomWidthPx(undefined);
    if (onChangeCustomHeightPx) onChangeCustomHeightPx(undefined);
    if (onChangeWidthMode) onChangeWidthMode("normal");
    if (onCustomStyleChange) {
      onCustomStyleChange({
        ...(customStyle || { id: elementId }),
        transform: {
          ...(customStyle?.transform || {}),
          customWidthPx: undefined,
          customHeightPx: undefined,
        },
      });
    }
  };

  // Alignment container class: ensures true centering in the middle of the page when align is center
  const alignmentContainerClass =
    align === "center"
      ? "flex flex-col items-center justify-center text-center mx-auto"
      : align === "right"
      ? "flex flex-col items-end text-right ml-auto"
      : align === "justify"
      ? "flex flex-col items-stretch text-justify mx-auto"
      : "flex flex-col items-start text-left mr-auto";

  if (!isEditorPreview) {
    return (
      <div
        className={`${inline ? "inline-block" : "w-full"} ${alignmentContainerClass} ${className}`}
        style={{
          ...mergedStyles.containerStyle,
          ...(effectiveCustomWidthPx ? { width: `min(${effectiveCustomWidthPx}px, 100%)` } : {}),
          ...(effectiveCustomHeightPx ? { minHeight: `${effectiveCustomHeightPx}px` } : {}),
          ...style,
        }}
      >
        {children}
      </div>
    );
  }

  const hasOffset = currentX !== 0 || currentY !== 0;
  const hasCustomSize = !!effectiveCustomWidthPx || !!effectiveCustomHeightPx;
  const hasCustomStyles = !!(
    customStyle?.transform ||
    customStyle?.imageEffects ||
    customStyle?.textStyle ||
    customStyle?.mask
  );

  const isBarActive = isHovered || isDragging || isResizing || isSelected;

  return (
    <div
      ref={containerRef}
      onMouseDown={(e) => {
        if (isEditorPreview) {
          setIsSelected(true);
          handleStartDrag(e);
        }
      }}
      onClick={(e) => {
        if (isEditorPreview) {
          setIsSelected(true);
        }
      }}
      className={`relative group/movable transition-transform ${
        inline ? "inline-block" : "w-full"
      } ${alignmentContainerClass} ${className} ${
        isSelected
          ? "ring-2 ring-indigo-500/80 ring-offset-2 ring-offset-zinc-950/40 rounded-xl"
          : isHovered
          ? "outline-1 outline-dashed outline-indigo-500/50 rounded-xl"
          : ""
      }`}
      style={{
        ...mergedStyles.containerStyle,
        ...(effectiveCustomWidthPx ? { width: `min(${effectiveCustomWidthPx}px, 100%)` } : {}),
        ...(effectiveCustomHeightPx ? { minHeight: `${effectiveCustomHeightPx}px` } : {}),
        ...style,
        transition: isDragging || isResizing ? "none" : "transform 0.1s ease-out",
        overflow: "visible",
        zIndex: isBarActive ? 99999 : (mergedStyles.containerStyle?.zIndex ?? style?.zIndex ?? "auto"),
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        if (!isDragging && !isResizing) {
          setIsHovered(false);
        }
      }}
    >
      {children}

      {/* ========================================================================= */}
      {/* INTERACTIVE RESIZE HANDLES (Right, Bottom, Corner)                        */}
      {/* ========================================================================= */}
      {isBarActive && (
        <>
          {/* Right Handle (Width) */}
          <div
            onMouseDown={(e) => handleStartResize(e, "e")}
            className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-9 bg-indigo-600 hover:bg-indigo-400 border border-white rounded-full cursor-ew-resize z-50 flex items-center justify-center shadow-lg transition-transform hover:scale-125"
            title="Clique e arraste para redimensionar a LARGURA"
          >
            <ChevronsLeftRight className="w-2.5 h-2.5 text-white" />
          </div>

          {/* Bottom Handle (Height) */}
          <div
            onMouseDown={(e) => handleStartResize(e, "s")}
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 h-4 w-9 bg-indigo-600 hover:bg-indigo-400 border border-white rounded-full cursor-ns-resize z-50 flex items-center justify-center shadow-lg transition-transform hover:scale-125"
            title="Clique e arraste para redimensionar a ALTURA"
          >
            <ChevronsUpDown className="w-2.5 h-2.5 text-white" />
          </div>

          {/* Bottom-Right Corner Handle (Both) */}
          <div
            onMouseDown={(e) => handleStartResize(e, "se")}
            className="absolute -right-2 -bottom-2 w-5 h-5 bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 border-2 border-white rounded-full cursor-nwse-resize z-50 flex items-center justify-center shadow-xl transition-transform hover:scale-125"
            title="Clique e arraste para redimensionar LARGURA e ALTURA simultaneamente"
          >
            <Scaling className="w-2.5 h-2.5 text-white" />
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* FLOATING CONTROL & ALIGNMENT TOOLBAR                                      */}
      {/* ========================================================================= */}
      {isBarActive && !effectiveHideEditToolbars && (
        <div
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 flex flex-wrap items-center gap-1 p-1 rounded-2xl bg-zinc-950/98 border border-indigo-500/80 shadow-2xl backdrop-blur-xl text-xs font-semibold text-white pointer-events-auto animate-in fade-in zoom-in-95 duration-100 whitespace-nowrap"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drag Handle Button */}
          <div
            onMouseDown={handleStartDrag}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-move select-none shadow-md transition-colors"
            title="Clique e arraste em qualquer direção para mover e posicionar livremente na seção"
          >
            <Move className="w-3.5 h-3.5 text-cyan-300" />
            <span className="text-[10px]">{label || "Mover"}</span>
          </div>

          {/* Reset Position & Dimensions Button */}
          {(hasOffset || hasCustomSize) && (
            <button
              type="button"
              onClick={(e) => {
                handleResetPosition(e);
                handleResetDimensions(e);
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-amber-300 border border-amber-500/30 text-[10px] font-bold cursor-pointer transition-colors"
              title="Restaurar Posição e Tamanho Originais"
            >
              <RotateCcw className="w-3 h-3 text-amber-400" />
              <span>Restaurar</span>
            </button>
          )}

          {/* Quick Width Controls */}
          {onChangeWidthMode && (
            <div className="flex items-center gap-0.5 bg-zinc-900 rounded-xl p-0.5 border border-zinc-800">
              <span className="text-[9px] uppercase font-bold text-zinc-400 px-1 flex items-center gap-0.5">
                <Maximize2 className="w-2.5 h-2.5 text-purple-400" />
                Largura:
              </span>
              {[
                { id: "narrow", label: "Estreito" },
                { id: "normal", label: "Normal" },
                { id: "wide", label: "Largo" },
                { id: "full", label: "100%" },
              ].map((w) => {
                const isSelectedMode = (widthMode || "normal") === w.id;
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => onChangeWidthMode(w.id as any)}
                    className={`px-1.5 py-0.5 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer ${
                      isSelectedMode
                        ? "bg-purple-600 text-white font-bold shadow"
                        : "text-zinc-400 hover:text-white"
                    }`}
                    title={`Largura da caixa: ${w.label}`}
                  >
                    {w.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Quick Size (Width/Height) Popover Toggle */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowSizeMenu(!showSizeMenu)}
              className={`flex items-center gap-1 px-2 py-1 rounded-xl text-[10px] font-bold transition-colors cursor-pointer ${
                hasCustomSize || showSizeMenu
                  ? "bg-purple-600 text-white shadow"
                  : "bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800"
              }`}
              title="Ajustar Dimensões Manuais (Largura & Altura em Pixels)"
            >
              <Scaling className="w-3 h-3 text-cyan-300" />
              <span>Dimensões</span>
            </button>

            {showSizeMenu && (
              <div
                onMouseDown={(e) => e.stopPropagation()}
                className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 p-3 rounded-2xl bg-zinc-950/98 border border-purple-500/80 shadow-2xl backdrop-blur-xl flex flex-col gap-2 min-w-[220px] animate-in fade-in zoom-in-95 duration-100"
              >
                <div className="flex items-center justify-between text-[11px] font-bold text-zinc-300 pb-1 border-b border-zinc-800">
                  <span>Ajuste de Tamanho</span>
                  <button
                    type="button"
                    onClick={handleResetDimensions}
                    className="text-[9px] text-amber-400 hover:text-amber-300 font-medium cursor-pointer"
                  >
                    Redefinir
                  </button>
                </div>

                {/* Width Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-zinc-400">
                    <span>Largura (px)</span>
                    <span className="font-mono text-cyan-300 font-bold">
                      {effectiveCustomWidthPx ? `${effectiveCustomWidthPx}px` : "Automático"}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="160"
                    max="1600"
                    step="10"
                    value={effectiveCustomWidthPx || 700}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (onChangeCustomWidthPx) onChangeCustomWidthPx(val);
                      if (onCustomStyleChange) {
                        onCustomStyleChange({
                          ...(customStyle || { id: elementId }),
                          transform: {
                            ...(customStyle?.transform || {}),
                            customWidthPx: val,
                          },
                        });
                      }
                    }}
                    className="w-full accent-cyan-500 bg-zinc-900 h-1.5 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Height Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-zinc-400">
                    <span>Altura Mínima (px)</span>
                    <span className="font-mono text-purple-300 font-bold">
                      {effectiveCustomHeightPx ? `${effectiveCustomHeightPx}px` : "Automático"}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="1000"
                    step="10"
                    value={effectiveCustomHeightPx || 120}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (onChangeCustomHeightPx) onChangeCustomHeightPx(val);
                      if (onCustomStyleChange) {
                        onCustomStyleChange({
                          ...(customStyle || { id: elementId }),
                          transform: {
                            ...(customStyle?.transform || {}),
                            customHeightPx: val,
                          },
                        });
                      }
                    }}
                    className="w-full accent-purple-500 bg-zinc-900 h-1.5 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="flex justify-between gap-1 pt-1 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => {
                      if (onChangeCustomWidthPx) onChangeCustomWidthPx(undefined);
                      if (onChangeCustomHeightPx) onChangeCustomHeightPx(undefined);
                    }}
                    className="flex-1 py-1 text-[10px] rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-center cursor-pointer"
                  >
                    Auto
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSizeMenu(false)}
                    className="flex-1 py-1 text-[10px] rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-center cursor-pointer"
                  >
                    Pronto
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Text Alignment Controls */}
          {onChangeAlign && (
            <div className="flex items-center gap-0.5 bg-zinc-900 rounded-xl p-0.5 border border-zinc-800">
              {[
                { id: "left", label: "Esquerda", icon: AlignLeft },
                { id: "center", label: "Centro", icon: AlignCenter },
                { id: "right", label: "Direita", icon: AlignRight },
                { id: "justify", label: "Justificado", icon: AlignJustify },
              ].map((item) => {
                const Icon = item.icon;
                const isSelectedAlign = align === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (onOffsetChange) onOffsetChange({ x: 0, y: currentY });
                      onChangeAlign(item.id as TextAlign);
                    }}
                    className={`p-1 rounded-lg transition-colors cursor-pointer ${
                      isSelectedAlign
                        ? "bg-purple-600 text-white"
                        : "text-zinc-400 hover:text-white"
                    }`}
                    title={`Alinhar: ${item.label}`}
                  >
                    <Icon className="w-3 h-3" />
                  </button>
                );
              })}
            </div>
          )}

          {/* Partner Sync Button */}
          {onSyncWithPartner && (
            <button
              type="button"
              onClick={onSyncWithPartner}
              className="flex items-center gap-1 px-2 py-1 rounded-xl bg-purple-950/80 hover:bg-purple-600 text-purple-200 hover:text-white border border-purple-500/40 text-[10px] font-bold transition-colors cursor-pointer"
              title={partnerLabel ? `Alinhar posição com ${partnerLabel}` : "Alinhar elementos"}
            >
              <Sparkles className="w-2.5 h-2.5 text-yellow-300" />
              <span>{partnerLabel ? `Alinhar ao ${partnerLabel}` : "Alinhar"}</span>
            </button>
          )}

          {/* Visual Styling Inspector Trigger */}
          {onOpenVisualModal && (
            <button
              type="button"
              onClick={() => onOpenVisualModal(elementId)}
              className={`flex items-center gap-1 px-2 py-1 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                hasCustomStyles
                  ? "bg-purple-600 text-white shadow"
                  : "bg-zinc-900 hover:bg-purple-950 text-purple-300 hover:text-white border border-zinc-800 hover:border-purple-500/40"
              }`}
              title="Ajustar cores, efeitos, filtros, sombras, recorte e rotação"
            >
              <Sliders className="w-3 h-3" />
              <span className="text-[10px]">Estilo</span>
            </button>
          )}

          {/* Coordinate Badge */}
          {hasOffset && (
            <span className="px-1.5 py-0.5 rounded-lg bg-zinc-900 font-mono text-[9px] text-cyan-300 border border-zinc-800">
              X:{currentX > 0 ? `+${currentX}` : currentX} Y:{currentY > 0 ? `+${currentY}` : currentY}
            </span>
          )}

          {/* Precision Nudge Buttons */}
          <div className="flex items-center gap-0.5 bg-zinc-900 rounded-xl p-0.5 border border-zinc-800">
            <button
              type="button"
              onClick={(e) => handleNudge(-10, 0, e)}
              className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
              title="Mover 10px para a Esquerda"
            >
              <ArrowLeft className="w-2.5 h-2.5" />
            </button>
            <button
              type="button"
              onClick={(e) => handleNudge(0, -10, e)}
              className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
              title="Mover 10px para Cima"
            >
              <ArrowUp className="w-2.5 h-2.5" />
            </button>
            <button
              type="button"
              onClick={(e) => handleNudge(0, 10, e)}
              className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
              title="Mover 10px para Baixo"
            >
              <ArrowDown className="w-2.5 h-2.5" />
            </button>
            <button
              type="button"
              onClick={(e) => handleNudge(10, 0, e)}
              className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
              title="Mover 10px para a Direita"
            >
              <ArrowRight className="w-2.5 h-2.5" />
            </button>
          </div>

          {/* Reset Position Button */}
          {hasOffset && (
            <button
              type="button"
              onClick={handleResetPosition}
              className="p-1 rounded-lg bg-amber-950/80 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-500/50 cursor-pointer"
              title="Restaurar posição original padrão (0, 0)"
            >
              <RotateCcw className="w-2.5 h-2.5" />
            </button>
          )}

          {/* Concluir / Desmarcar Button */}
          <button
            type="button"
            onClick={() => {
              setIsSelected(false);
              setShowSizeMenu(false);
            }}
            className="px-2 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] transition-colors cursor-pointer flex items-center gap-1 shadow"
            title="Concluir e Desmarcar Elemento (Esc)"
          >
            <Check className="w-3 h-3" />
            <span>Concluir</span>
          </button>
        </div>
      )}

      {/* Floating Dragging Tooltip */}
      {isDragging && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 px-3 py-1.5 rounded-2xl bg-indigo-950/95 border border-cyan-400 text-white font-mono text-xs font-bold shadow-2xl flex items-center gap-1.5 pointer-events-none whitespace-nowrap">
          <Move className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
          <span>
            X: {currentX > 0 ? `+${currentX}px` : `${currentX}px`} | Y:{" "}
            {currentY > 0 ? `+${currentY}px` : `${currentY}px`}
          </span>
        </div>
      )}

      {/* Floating Resizing Tooltip */}
      {isResizing && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 px-3 py-1.5 rounded-2xl bg-purple-950/95 border border-purple-400 text-white font-mono text-xs font-bold shadow-2xl flex items-center gap-1.5 pointer-events-none whitespace-nowrap">
          <Scaling className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
          <span>
            {effectiveCustomWidthPx ? `L: ${effectiveCustomWidthPx}px` : "L: Auto"}{" "}
            × {effectiveCustomHeightPx ? `A: ${effectiveCustomHeightPx}px` : "A: Auto"}
          </span>
        </div>
      )}
    </div>
  );
};
