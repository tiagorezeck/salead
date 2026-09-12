// src/components/marketing/visual-canvas/FloatingContextualToolbar.tsx

import React, { useState, useRef, useEffect } from "react";
import {
  Type,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Maximize2,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  Layers,
  Sparkles,
  Palette,
  Image as ImageIcon,
  Sliders,
  ChevronDown,
  Move,
  GripVertical,
  RotateCcw,
  Upload,
  Check,
  X,
  Plus,
  Minus
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SelectedElement, ElementStyleOverrides } from "./types";
import type { Section, LPTheme } from "@/lib/lp-store";

const FONT_FAMILIES = [
  { label: "Sora (Padrão)", value: "Sora, system-ui, sans-serif" },
  { label: "Inter (Corporativo)", value: "Inter, system-ui, sans-serif" },
  { label: "Manrope (Moderno)", value: "Manrope, system-ui, sans-serif" },
  { label: "Montserrat (Impacto)", value: "Montserrat, sans-serif" },
  { label: "Playfair Display (Editorial)", value: "Playfair Display, serif" },
  { label: "Outfit (Geométrico)", value: "Outfit, sans-serif" },
  { label: "Plus Jakarta Sans (Limpo)", value: "'Plus Jakarta Sans', sans-serif" },
  { label: "Syne (Criativo)", value: "Syne, sans-serif" },
  { label: "Poppins (Popular)", value: "Poppins, sans-serif" },
  { label: "Space Grotesk (Tech)", value: "'Space Grotesk', sans-serif" },
  { label: "Cinzel (Clássico)", value: "Cinzel, serif" }
];

const PRESET_COLORS = [
  "#FF6A00", "#FFFFFF", "#0E0F12", "#3B82F6",
  "#22C55E", "#EAB308", "#A855F7", "#EC4899",
  "#06B6D4", "#F97316", "#9CA3AF", "#374151"
];

const SHADOW_PRESETS = [
  { label: "Nenhuma", value: "none" },
  { label: "Suave", value: "0 4px 12px rgba(0,0,0,0.15)" },
  { label: "Média", value: "0 8px 24px rgba(0,0,0,0.25)" },
  { label: "Glow Neon", value: "0 0 25px rgba(255,106,0,0.35)" }
];

interface FloatingContextualToolbarProps {
  selected: SelectedElement | null;
  section: Section | null;
  theme: LPTheme;
  styleOverrides?: ElementStyleOverrides;
  onUpdateStyle: (updates: Partial<ElementStyleOverrides>) => void;
  onUpdateContent: (field: string, value: any) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onBringForward?: () => void;
  onSendBackward?: () => void;
  onTriggerUpload: () => void;
  onOpenAIQuickPrompt?: (context: string) => void;
  onClose: () => void;
}

export function FloatingContextualToolbar({
  selected,
  section,
  theme,
  styleOverrides = {},
  onUpdateStyle,
  onUpdateContent,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onBringForward,
  onSendBackward,
  onTriggerUpload,
  onOpenAIQuickPrompt,
  onClose
}: FloatingContextualToolbarProps) {
  const [activeSubMenu, setActiveSubMenu] = useState<"none" | "typography" | "color" | "spacing" | "media">("none");
  const [customColor, setCustomColor] = useState(styleOverrides.color || theme.primary);

  // Estado de Arraste Livre da Barra de Ferramentas
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingToolbar, setIsDraggingToolbar] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number }>({
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0
  });

  const handleStartDrag = (e: React.MouseEvent | React.TouchEvent) => {
    if ((e.target as HTMLElement).closest("button, select, input, .no-drag")) return;
    e.preventDefault();
    e.stopPropagation();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    dragStartRef.current = {
      startX: clientX,
      startY: clientY,
      initialX: pos.x,
      initialY: pos.y
    };
    setIsDraggingToolbar(true);
  };

  useEffect(() => {
    if (!isDraggingToolbar) return;

    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

      const deltaX = clientX - dragStartRef.current.startX;
      const deltaY = clientY - dragStartRef.current.startY;

      setPos({
        x: dragStartRef.current.initialX + deltaX,
        y: dragStartRef.current.initialY + deltaY
      });
    };

    const handleMouseUp = () => {
      setIsDraggingToolbar(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleMouseMove);
    window.addEventListener("touchend", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleMouseMove);
      window.removeEventListener("touchend", handleMouseUp);
    };
  }, [isDraggingToolbar]);

  if (!selected || !section) return null;

  const isTextElement = selected.elementType.includes("title") ||
    selected.elementType.includes("subtitle") ||
    selected.elementType.includes("eyebrow") ||
    selected.elementType.includes("quote") ||
    selected.elementType.includes("text") ||
    selected.elementType.includes("author") ||
    selected.elementType.includes("role") ||
    selected.elementType.includes("button") ||
    selected.elementType.includes("cta") ||
    selected.elementType.includes("custom_block");

  const isMediaElement = selected.elementType.includes("media") || selected.elementType.includes("avatar") || selected.elementType.includes("image");

  return (
    <div
      id="floating-contextual-toolbar"
      style={{
        transform: `translate3d(${pos.x}px, ${pos.y}px, 0px)`,
        willChange: "transform"
      }}
      className="sticky top-4 z-50 flex flex-col items-center gap-1.5 animate-in fade-in slide-in-from-top-3 duration-150 max-w-full"
    >
      {/* Barra Principal de Ferramentas - Arrastável */}
      <div className="bg-[#16181D]/95 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl p-1.5 flex flex-wrap items-center gap-1.5 text-white text-xs select-none">
        
        {/* Alça de Arraste (Grip Handle) */}
        <div
          onMouseDown={handleStartDrag}
          onTouchStart={handleStartDrag}
          className="p-1.5 flex items-center justify-center cursor-grab active:cursor-grabbing text-white/40 hover:text-[#FF6A00] rounded-lg hover:bg-white/10 transition-colors"
          title="Clique e arraste este painel para mover para qualquer lugar da tela"
        >
          <GripVertical className="w-4 h-4" />
        </div>

        {/* Resetar Posição se estiver movido */}
        {(pos.x !== 0 || pos.y !== 0) && (
          <button
            type="button"
            onClick={() => setPos({ x: 0, y: 0 })}
            className="p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
            title="Centralizar Painel (Resetar Posição)"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        )}

        {/* Tag do Elemento Selecionado */}
        <div className="px-2.5 py-1 rounded-xl bg-[#FF6A00]/20 border border-[#FF6A00]/40 text-[#FF6A00] font-black text-[10px] uppercase tracking-wider flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          <span className="max-w-[100px] truncate">{selected.label || selected.elementType}</span>
        </div>

        <div className="h-5 w-[1px] bg-white/10 mx-0.5 hidden sm:block" />

        {/* ========================================================= */}
        {/* FERRAMENTAS DIRETAS DE TIPOGRAFIA (MUDAR FONTE, TAMANHO, COR & POSIÇÃO) */}
        {/* ========================================================= */}
        {isTextElement && (
          <>
            {/* 1. MUDAR FONTE (Font Family Dropdown) */}
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl px-1.5 py-0.5">
              <Type className="w-3.5 h-3.5 text-[#FF6A00] shrink-0" />
              <select
                value={styleOverrides.fontFamily || ""}
                onChange={(e) => onUpdateStyle({ fontFamily: e.target.value })}
                className="bg-transparent text-[11px] font-semibold text-white focus:outline-none cursor-pointer border-0 max-w-[125px] truncate"
                title="Mudar Fonte da Letra"
              >
                <option value="" className="bg-[#16181D] text-white/50">Fonte Padrão</option>
                {FONT_FAMILIES.map((f) => (
                  <option key={f.value} value={f.value} className="bg-[#16181D] text-white font-medium">
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. AUMENTAR E DIMINUIR TAMANHO DA FONTE */}
            <div className="flex items-center gap-0.5 bg-white/5 border border-white/10 rounded-xl p-0.5" title="Ajustar Tamanho da Fonte">
              <button
                type="button"
                onClick={() => onUpdateStyle({ fontSize: Math.max(10, (styleOverrides.fontSize || 20) - 2) })}
                className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                title="Diminuir Fonte (-2px)"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <input
                type="number"
                min={8}
                max={120}
                value={styleOverrides.fontSize || 20}
                onChange={(e) => onUpdateStyle({ fontSize: Number(e.target.value) })}
                className="w-10 bg-[#111317] border border-white/15 rounded-md text-center text-[11px] font-mono font-bold text-white focus:outline-none focus:border-[#FF6A00] py-0.5"
                title="Tamanho exato em px"
              />
              <button
                type="button"
                onClick={() => onUpdateStyle({ fontSize: Math.min(120, (styleOverrides.fontSize || 20) + 2) })}
                className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                title="Aumentar Fonte (+2px)"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 3. POSIÇÃO / ALINHAMENTO DO TEXTO (Esquerda, Centralizado, Direita e Justificado) */}
            <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-0.5">
              <button
                type="button"
                onClick={() => onUpdateStyle({ align: "left" })}
                className={cn(
                  "p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-all",
                  styleOverrides.align === "left" && "bg-white/20 text-[#FF6A00] font-bold"
                )}
                title="Alinhar à Esquerda"
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onUpdateStyle({ align: "center" })}
                className={cn(
                  "p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-all",
                  (!styleOverrides.align || styleOverrides.align === "center") && "bg-white/20 text-[#FF6A00] font-bold"
                )}
                title="Centralizar"
              >
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onUpdateStyle({ align: "right" })}
                className={cn(
                  "p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-all",
                  styleOverrides.align === "right" && "bg-white/20 text-[#FF6A00] font-bold"
                )}
                title="Alinhar à Direita"
              >
                <AlignRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onUpdateStyle({ align: "justify" })}
                className={cn(
                  "p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-all",
                  styleOverrides.align === "justify" && "bg-white/20 text-[#FF6A00] font-bold"
                )}
                title="Justificar Texto"
              >
                <AlignJustify className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 4. MUDAR COR DA LETRA */}
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl px-1.5 py-1" title="Mudar Cor da Letra">
              <Palette className="w-3.5 h-3.5 text-[#FF6A00]" />
              <label className="cursor-pointer flex items-center gap-1">
                <input
                  type="color"
                  value={styleOverrides.color || customColor || "#FFFFFF"}
                  onChange={(e) => {
                    setCustomColor(e.target.value);
                    onUpdateStyle({ color: e.target.value });
                  }}
                  className="w-5 h-5 rounded-md cursor-pointer border-0 bg-transparent p-0"
                  title="Seletor de Cor da Letra"
                />
              </label>
            </div>
          </>
        )}

        <div className="h-5 w-[1px] bg-white/10 mx-0.5 hidden sm:block" />

        {/* Sub-menus estendidos: Cores Gerais / Sombra */}
        <button
          type="button"
          onClick={() => setActiveSubMenu(activeSubMenu === "color" ? "none" : "color")}
          className={cn(
            "p-1.5 rounded-xl flex items-center gap-1 font-semibold hover:bg-white/10 transition-colors",
            activeSubMenu === "color" && "bg-white/15 text-[#FF6A00]"
          )}
          title="Paleta de Cores & Efeitos de Sombra"
        >
          <Palette className="w-4 h-4" />
          <span className="hidden lg:inline text-[11px]">Paleta</span>
          <ChevronDown className="w-3 h-3 opacity-60" />
        </button>

        {/* Mídia / Imagem */}
        {isMediaElement && (
          <button
            type="button"
            onClick={() => setActiveSubMenu(activeSubMenu === "media" ? "none" : "media")}
            className={cn(
              "p-1.5 rounded-xl flex items-center gap-1 font-semibold hover:bg-white/10 transition-colors",
              activeSubMenu === "media" && "bg-white/15 text-[#FF6A00]"
            )}
            title="Ajustes de Imagem / Mídia"
          >
            <ImageIcon className="w-4 h-4" />
            <span className="hidden lg:inline text-[11px]">Mídia</span>
            <ChevronDown className="w-3 h-3 opacity-60" />
          </button>
        )}

        {/* Espaçamento & Dimensões */}
        <button
          type="button"
          onClick={() => setActiveSubMenu(activeSubMenu === "spacing" ? "none" : "spacing")}
          className={cn(
            "p-1.5 rounded-xl flex items-center gap-1 font-semibold hover:bg-white/10 transition-colors",
            activeSubMenu === "spacing" && "bg-white/15 text-[#FF6A00]"
          )}
          title="Dimensões, Raio dos Cantos e Padding"
        >
          <Sliders className="w-4 h-4" />
          <span className="hidden lg:inline text-[11px]">Design</span>
          <ChevronDown className="w-3 h-3 opacity-60" />
        </button>

        <div className="h-5 w-[1px] bg-white/10 mx-0.5 hidden sm:block" />

        {/* Assistente IA Contextual */}
        {onOpenAIQuickPrompt && (
          <button
            type="button"
            onClick={() => onOpenAIQuickPrompt(selected.label || selected.elementType)}
            className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-[#FF6A00] to-orange-500 hover:from-[#FF6A00]/90 hover:to-orange-600 text-white font-bold text-[11px] flex items-center gap-1 shadow-md shadow-[#FF6A00]/20 transition-all hover:scale-105 active:scale-95"
            title="Pedir à IA para reescrever ou melhorar este elemento"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">IA Copilot</span>
          </button>
        )}

        <div className="h-5 w-[1px] bg-white/10 mx-0.5 hidden sm:block" />

        {/* Mover Seção Cima / Baixo */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={onMoveUp}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            title="Mover Seção para Cima"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            title="Mover Seção para Baixo"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Duplicar & Excluir */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={onDuplicate}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            title="Duplicar Seção (Ctrl+D)"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
            title="Excluir Elemento / Seção (Del)"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Fechar Seleção */}
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white ml-0.5"
          title="Desselecionar"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ========================================================= */}
      {/* SUB-MENU FLUTUANTE DE CORES & SOMBRA */}
      {/* ========================================================= */}
      {activeSubMenu === "color" && (
        <div className="bg-[#181B22]/98 backdrop-blur-xl border border-white/15 shadow-2xl rounded-2xl p-3.5 flex flex-col gap-3 text-white text-xs w-[340px] animate-in fade-in zoom-in-95 duration-100">
          <div>
            <label className="block text-[10px] text-white/50 uppercase font-black tracking-wider mb-1.5">
              Cor do Elemento / Texto
            </label>
            <div className="flex flex-wrap items-center gap-1.5">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setCustomColor(c);
                    onUpdateStyle({ color: c });
                  }}
                  className="w-6 h-6 rounded-lg border border-white/20 transition-transform hover:scale-110 flex items-center justify-center cursor-pointer shadow-sm"
                  style={{ backgroundColor: c }}
                >
                  {styleOverrides.color === c && <Check className="w-3 h-3 text-white mix-blend-difference" />}
                </button>
              ))}
              <input
                type="color"
                value={customColor}
                onChange={(e) => {
                  setCustomColor(e.target.value);
                  onUpdateStyle({ color: e.target.value });
                }}
                className="w-6 h-6 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                title="Cor Personalizada"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-white/50 uppercase font-black tracking-wider mb-1.5">
              Efeito de Sombra / Destaque
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {SHADOW_PRESETS.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => onUpdateStyle({ shadow: s.value as any })}
                  className={cn(
                    "px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold text-center transition-all",
                    styleOverrides.shadow === s.value
                      ? "bg-[#FF6A00]/20 border-[#FF6A00] text-white"
                      : "bg-[#111317] border-white/10 text-white/70 hover:text-white"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-MENU FLUTUANTE DE MÍDIA / IMAGEM */}
      {/* ========================================================= */}
      {activeSubMenu === "media" && (
        <div className="bg-[#181B22]/98 backdrop-blur-xl border border-white/15 shadow-2xl rounded-2xl p-3.5 flex flex-col gap-3 text-white text-xs w-[350px] animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onTriggerUpload}
              className="flex-1 py-2 px-3 rounded-xl bg-[#FF6A00] hover:bg-[#FF6A00]/90 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-[#FF6A00]/20 transition-all cursor-pointer hover:scale-[1.02]"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Trocar Foto / Upload</span>
            </button>
          </div>

          <div>
            <label className="block text-[10px] text-white/50 uppercase font-black tracking-wider mb-1">
              Enquadramento (Object Fit)
            </label>
            <div className="grid grid-cols-3 gap-1 bg-[#111317] border border-white/10 rounded-xl p-1">
              {(["cover", "contain", "fill"] as const).map((fit) => (
                <button
                  key={fit}
                  type="button"
                  onClick={() => onUpdateStyle({ imageFit: fit })}
                  className={cn(
                    "py-1 rounded-lg text-[10px] font-bold capitalize transition-all",
                    (styleOverrides.imageFit || "cover") === fit
                      ? "bg-[#FF6A00] text-white"
                      : "text-white/60 hover:text-white"
                  )}
                >
                  {fit}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-MENU FLUTUANTE DE DESIGN, RAIO & PADDING */}
      {/* ========================================================= */}
      {activeSubMenu === "spacing" && (
        <div className="bg-[#181B22]/98 backdrop-blur-xl border border-white/15 shadow-2xl rounded-2xl p-3.5 flex flex-col gap-3 text-white text-xs w-[340px] animate-in fade-in zoom-in-95 duration-100">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] text-white/50 uppercase font-black tracking-wider">
                Raio dos Cantos (Radius)
              </label>
              <span className="font-mono text-[10px] text-white/80 font-bold">{styleOverrides.borderRadius ?? 16}px</span>
            </div>
            <input
              type="range"
              min={0}
              max={48}
              step={2}
              value={styleOverrides.borderRadius ?? 16}
              onChange={(e) => onUpdateStyle({ borderRadius: Number(e.target.value) })}
              className="w-full accent-[#FF6A00] cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] text-white/50 uppercase font-black tracking-wider">
                Espaçamento Interno (Padding)
              </label>
              <span className="font-mono text-[10px] text-white/80 font-bold">{styleOverrides.padding ?? 24}px</span>
            </div>
            <input
              type="range"
              min={8}
              max={64}
              step={4}
              value={styleOverrides.padding ?? 24}
              onChange={(e) => onUpdateStyle({ padding: Number(e.target.value) })}
              className="w-full accent-[#FF6A00] cursor-pointer"
            />
          </div>
        </div>
      )}
    </div>
  );
}
