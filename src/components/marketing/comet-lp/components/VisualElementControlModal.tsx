import React, { useState } from "react";
import {
  X,
  Sparkles,
  Sliders,
  Maximize2,
  Minimize2,
  RotateCcw,
  Type,
  Palette,
  Image as ImageIcon,
  Layers,
  Crop,
  Move,
  Eye,
  Sun,
  Contrast,
  Circle,
  Square,
  Shield,
  Star,
  Waves,
  Check,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  FlipHorizontal,
  FlipVertical,
  Minus,
  Plus,
  Compass,
  User,
  Tv,
  Smartphone,
  SlidersHorizontal,
} from "lucide-react";
import {
  CustomElementStyleRecord,
  VisualImageEffects,
  VisualTransform,
  VisualMaskShape,
  VisualTextCustomStyle,
  VisualMaskType,
  ElementOffset,
} from "../types/landingPage";
import {
  SHAPE_MASK_PRESETS,
  DROP_SHADOW_PRESETS,
  FONT_FAMILY_PRESETS,
  GRADIENT_TEXT_PRESETS,
} from "../utils/visualStyleHelpers";

interface VisualElementControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  elementId: string;
  elementTitle: string;
  elementType?: "text" | "image" | "card" | "floating_image" | "button";
  isText?: boolean;
  isImage?: boolean;
  currentStyle?: CustomElementStyleRecord;
  currentStyles?: CustomElementStyleRecord;
  onUpdateStyle?: (updated: CustomElementStyleRecord) => void;
  onUpdateStyles?: (updated: CustomElementStyleRecord) => void;
  onResetStyle?: () => void;
  onOpenImagePicker?: () => void;
}

type ModalTab = "transform" | "effects" | "mask" | "typography" | "layers";

export const VisualElementControlModal: React.FC<VisualElementControlModalProps> = ({
  isOpen,
  onClose,
  elementId,
  elementTitle,
  elementType,
  isText,
  isImage,
  currentStyle,
  currentStyles,
  onUpdateStyle,
  onUpdateStyles,
  onResetStyle,
  onOpenImagePicker,
}) => {
  const activeStyles: CustomElementStyleRecord = currentStyles || currentStyle || {};

  const handleUpdateRecord = (updated: CustomElementStyleRecord) => {
    if (onUpdateStyles) {
      onUpdateStyles(updated);
    } else if (onUpdateStyle) {
      onUpdateStyle(updated);
    }
  };

  const resolvedElementType =
    elementType ||
    (isText ? "text" : isImage ? "image" : elementId.includes("text") || elementId.includes("headline") || elementId.includes("title") || elementId.includes("description") ? "text" : "image");

  const defaultTab: ModalTab =
    resolvedElementType === "text"
      ? "typography"
      : resolvedElementType === "image" || resolvedElementType === "floating_image"
      ? "effects"
      : "transform";

  const [activeTab, setActiveTab] = useState<ModalTab>(defaultTab);

  if (!isOpen) return null;

  const textStyle: VisualTextCustomStyle = activeStyles.textStyle || {};
  const effects: VisualImageEffects = activeStyles.imageEffects || {};
  const transform: VisualTransform = activeStyles.transform || {};
  const mask: VisualMaskShape = activeStyles.mask || { type: "none" };
  const offset: ElementOffset = activeStyles.offset || { x: 0, y: 0 };
  const zIndex = activeStyles.zIndex ?? 10;

  // Partial updaters
  const updateTextStyle = (partial: Partial<VisualTextCustomStyle>) => {
    handleUpdateRecord({
      ...activeStyles,
      textStyle: { ...textStyle, ...partial },
    });
  };

  const updateEffects = (partial: Partial<VisualImageEffects>) => {
    handleUpdateRecord({
      ...activeStyles,
      imageEffects: { ...effects, ...partial },
    });
  };

  const updateTransform = (partial: Partial<VisualTransform>) => {
    handleUpdateRecord({
      ...activeStyles,
      transform: { ...transform, ...partial },
    });
  };

  const updateMask = (partial: Partial<VisualMaskShape>) => {
    handleUpdateRecord({
      ...activeStyles,
      mask: { ...mask, ...partial },
    });
  };

  const updateOffset = (partial: Partial<ElementOffset>) => {
    handleUpdateRecord({
      ...activeStyles,
      offset: { ...offset, ...partial },
    });
  };

  const updateZIndex = (newZ: number) => {
    handleUpdateRecord({
      ...activeStyles,
      zIndex: newZ,
    });
  };

  const handleResetAll = () => {
    if (onResetStyle) {
      onResetStyle();
    } else {
      handleUpdateRecord({
        textStyle: undefined,
        imageEffects: undefined,
        transform: undefined,
        mask: undefined,
        offset: { x: 0, y: 0 },
        zIndex: 10,
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative max-w-2xl w-full bg-zinc-950 border border-purple-500/60 rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.85)] flex flex-col max-h-[92vh] overflow-hidden text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-zinc-900 via-zinc-900/95 to-purple-950/40 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">{elementTitle}</h3>
                <span className="px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 font-mono text-[10px] border border-purple-800 uppercase font-bold">
                  {elementType}
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Controle criativo total: cores, efeitos, filtros, máscaras e transformações
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetAll}
              className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-amber-950 hover:text-amber-300 text-zinc-400 border border-zinc-800 hover:border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Restaurar estilos originais do elemento"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Resetar</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-zinc-800 bg-zinc-900/50 px-4 py-2 gap-1.5 overflow-x-auto">
          {resolvedElementType === "text" && (
            <button
              type="button"
              onClick={() => setActiveTab("typography")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "typography"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-950"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
              }`}
            >
              <Type className="w-4 h-4" />
              <span>Cores & Tipografia</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab("effects")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "effects"
                ? "bg-purple-600 text-white shadow-md shadow-purple-950"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>Efeitos, Sombra & Glow</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("mask")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "mask"
                ? "bg-purple-600 text-white shadow-md shadow-purple-950"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
            }`}
          >
            <Crop className="w-4 h-4" />
            <span>Recorte & Máscaras</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("transform")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "transform"
                ? "bg-purple-600 text-white shadow-md shadow-purple-950"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Transformação & Rotação</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("layers")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "layers"
                ? "bg-purple-600 text-white shadow-md shadow-purple-950"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Camadas & Z-Index</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {/* TAB 1: TYPOGRAPHY & COLORS */}
          {activeTab === "typography" && (
            <div className="space-y-6">
              {/* Custom Text Color & Palette */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
                  <span>Cor do Texto (Sólida)</span>
                  <span className="font-mono text-purple-300">{textStyle.customColorHex || "Padrão"}</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={textStyle.customColorHex || "#FFFFFF"}
                    onChange={(e) => updateTextStyle({ customColorHex: e.target.value, customGradient: undefined })}
                    className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-700 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={textStyle.customColorHex || ""}
                    placeholder="#FFFFFF"
                    onChange={(e) => updateTextStyle({ customColorHex: e.target.value, customGradient: undefined })}
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-purple-500"
                  />
                  {textStyle.customColorHex && (
                    <button
                      type="button"
                      onClick={() => updateTextStyle({ customColorHex: undefined })}
                      className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs text-zinc-400"
                    >
                      Remover
                    </button>
                  )}
                </div>

                {/* Quick Swatches */}
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  {["#FFFFFF", "#F8FAFC", "#FCD34D", "#38BDF8", "#A855F7", "#34D399", "#F43F5E", "#FB923C"].map(
                    (hex) => (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => updateTextStyle({ customColorHex: hex, customGradient: undefined })}
                        className="w-6 h-6 rounded-full border border-white/20 transition-transform hover:scale-125 shadow cursor-pointer"
                        style={{ backgroundColor: hex }}
                      />
                    )
                  )}
                </div>
              </div>

              {/* Text Gradient Presets */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
                  <span>Gradiente de Texto (Degradê)</span>
                  {textStyle.customGradient && (
                    <button
                      type="button"
                      onClick={() => updateTextStyle({ customGradient: undefined })}
                      className="text-[10px] text-amber-400 hover:underline"
                    >
                      Remover Gradiente
                    </button>
                  )}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {GRADIENT_TEXT_PRESETS.map((grad) => (
                    <button
                      key={grad.id}
                      type="button"
                      onClick={() => updateTextStyle({ customGradient: grad.value, customColorHex: undefined })}
                      className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer ${
                        textStyle.customGradient === grad.value
                          ? "border-purple-500 bg-purple-950/40 ring-2 ring-purple-500/40"
                          : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-700"
                      }`}
                    >
                      <div
                        className="h-4 rounded-md mb-1.5"
                        style={{ background: grad.value }}
                      />
                      <span className="text-[11px] truncate block text-zinc-300">{grad.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Family & Size */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Família Tipográfica
                  </label>
                  <select
                    value={textStyle.fontFamily || "inherit"}
                    onChange={(e) => updateTextStyle({ fontFamily: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    {FONT_FAMILY_PRESETS.map((f) => (
                      <option key={f.id} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Tamanho da Fonte (px)
                    </label>
                    <span className="font-mono text-purple-300 text-xs font-bold">
                      {textStyle.fontSizePx ? `${textStyle.fontSizePx}px` : "Padrão"}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="120"
                    step="1"
                    value={textStyle.fontSizePx || 24}
                    onChange={(e) => updateTextStyle({ fontSizePx: Number(e.target.value) })}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Weight, Letter-spacing & Line-height */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Peso (Weight)
                  </label>
                  <select
                    value={textStyle.fontWeight || 600}
                    onChange={(e) => updateTextStyle({ fontWeight: Number(e.target.value) })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="300">300 - Light</option>
                    <option value="400">400 - Normal</option>
                    <option value="500">500 - Medium</option>
                    <option value="600">600 - SemiBold</option>
                    <option value="700">700 - Bold</option>
                    <option value="800">800 - ExtraBold</option>
                    <option value="900">900 - Black</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Espaçamento Letras
                  </label>
                  <input
                    type="number"
                    min="-2"
                    max="10"
                    step="0.5"
                    value={textStyle.letterSpacing ?? 0}
                    onChange={(e) => updateTextStyle({ letterSpacing: Number(e.target.value) })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs font-mono text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Altura Linha
                  </label>
                  <input
                    type="number"
                    min="0.8"
                    max="2.5"
                    step="0.1"
                    value={textStyle.lineHeight ?? 1.3}
                    onChange={(e) => updateTextStyle({ lineHeight: Number(e.target.value) })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs font-mono text-white"
                  />
                </div>
              </div>

              {/* Text Transform & Decoration */}
              <div className="flex items-center gap-3">
                <div className="flex-1 space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Transformação de Texto
                  </label>
                  <div className="flex items-center bg-zinc-900 rounded-xl p-1 border border-zinc-800 gap-1">
                    {(["none", "uppercase", "lowercase", "capitalize"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => updateTextStyle({ textTransform: mode })}
                        className={`flex-1 py-1 rounded-lg text-xs font-bold capitalize transition-colors cursor-pointer ${
                          textStyle.textTransform === mode
                            ? "bg-purple-600 text-white"
                            : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        {mode === "none" ? "Normal" : mode}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: EFFECTS, DROP SHADOW & GLOW */}
          {activeTab === "effects" && (
            <div className="space-y-6">
              {/* Opacity & Blur Sliders */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 p-3 bg-zinc-900/60 rounded-2xl border border-zinc-800">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Opacidade</span>
                    </label>
                    <span className="font-mono text-cyan-300 font-bold text-xs">
                      {effects.opacity ?? 100}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={effects.opacity ?? 100}
                    onChange={(e) => updateEffects({ opacity: Number(e.target.value) })}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                <div className="space-y-2 p-3 bg-zinc-900/60 rounded-2xl border border-zinc-800">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      <span>Desfoque (Blur)</span>
                    </label>
                    <span className="font-mono text-purple-300 font-bold text-xs">
                      {effects.blur ?? 0}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="40"
                    value={effects.blur ?? 0}
                    onChange={(e) => updateEffects({ blur: Number(e.target.value) })}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Drop Shadow Presets */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Presets de Sombra / Glow
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {DROP_SHADOW_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        if (preset.id === "none") {
                          updateEffects({ dropShadow: undefined });
                        } else {
                          updateEffects({
                            dropShadow: {
                              enabled: true,
                              x: preset.x,
                              y: preset.y,
                              blur: preset.blur,
                              spread: preset.spread,
                              color: preset.color,
                              preset: preset.id as any,
                            },
                          });
                        }
                      }}
                      className={`p-3 rounded-2xl border text-left text-xs font-bold transition-all cursor-pointer ${
                        effects.dropShadow?.preset === preset.id
                          ? "border-purple-500 bg-purple-950/40 ring-2 ring-purple-500/40 text-white"
                          : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-white hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{preset.label}</span>
                        {effects.dropShadow?.preset === preset.id && (
                          <Check className="w-3.5 h-3.5 text-purple-400" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Drop Shadow Fine-tuning */}
              {effects.dropShadow && (
                <div className="p-4 bg-purple-950/20 border border-purple-800/40 rounded-2xl space-y-4">
                  <h4 className="text-xs font-bold text-purple-200 uppercase tracking-wider">
                    Ajuste Fino de Sombra (Drop-Shadow)
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] text-zinc-400">Eixo X ({effects.dropShadow.x ?? 0}px)</label>
                      <input
                        type="number"
                        min="-50"
                        max="50"
                        value={effects.dropShadow.x ?? 0}
                        onChange={(e) =>
                          updateEffects({
                            dropShadow: { ...effects.dropShadow, x: Number(e.target.value) },
                          })
                        }
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-2 py-1 text-xs font-mono text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-zinc-400">Eixo Y ({effects.dropShadow.y ?? 10}px)</label>
                      <input
                        type="number"
                        min="-50"
                        max="50"
                        value={effects.dropShadow.y ?? 10}
                        onChange={(e) =>
                          updateEffects({
                            dropShadow: { ...effects.dropShadow, y: Number(e.target.value) },
                          })
                        }
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-2 py-1 text-xs font-mono text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-zinc-400">Raio Blur ({effects.dropShadow.blur ?? 20}px)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={effects.dropShadow.blur ?? 20}
                        onChange={(e) =>
                          updateEffects({
                            dropShadow: { ...effects.dropShadow, blur: Number(e.target.value) },
                          })
                        }
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-2 py-1 text-xs font-mono text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-zinc-400">Cor / Alpha</label>
                      <input
                        type="text"
                        value={effects.dropShadow.color || "rgba(0,0,0,0.5)"}
                        onChange={(e) =>
                          updateEffects({
                            dropShadow: { ...effects.dropShadow, color: e.target.value },
                          })
                        }
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-2 py-1 text-xs font-mono text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Image Color Filters (Brightness, Contrast, Saturation, Grayscale) */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Filtros de Imagem & Calibração
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 p-3 bg-zinc-900/60 rounded-2xl border border-zinc-800">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Brilho</span>
                      <span className="font-mono text-purple-300 font-bold">{effects.brightness ?? 100}%</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="200"
                      value={effects.brightness ?? 100}
                      onChange={(e) => updateEffects({ brightness: Number(e.target.value) })}
                      className="w-full accent-purple-500 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1.5 p-3 bg-zinc-900/60 rounded-2xl border border-zinc-800">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Contraste</span>
                      <span className="font-mono text-purple-300 font-bold">{effects.contrast ?? 100}%</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="200"
                      value={effects.contrast ?? 100}
                      onChange={(e) => updateEffects({ contrast: Number(e.target.value) })}
                      className="w-full accent-purple-500 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1.5 p-3 bg-zinc-900/60 rounded-2xl border border-zinc-800">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Saturação</span>
                      <span className="font-mono text-purple-300 font-bold">{effects.saturate ?? 100}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={effects.saturate ?? 100}
                      onChange={(e) => updateEffects({ saturate: Number(e.target.value) })}
                      className="w-full accent-purple-500 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1.5 p-3 bg-zinc-900/60 rounded-2xl border border-zinc-800">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Escala de Cinza (P&B)</span>
                      <span className="font-mono text-purple-300 font-bold">{effects.grayscale ?? 0}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={effects.grayscale ?? 0}
                      onChange={(e) => updateEffects({ grayscale: Number(e.target.value) })}
                      className="w-full accent-purple-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CROPPING & SHAPE MASKS */}
          {activeTab === "mask" && (
            <div className="space-y-6">
              {/* Geometric Shape Masks */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Forma da Máscara Geométrica
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {SHAPE_MASK_PRESETS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => updateMask({ type: m.id as VisualMaskType })}
                      className={`p-3 rounded-2xl border text-center text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-2 ${
                        mask.type === m.id
                          ? "border-purple-500 bg-purple-950/40 text-white ring-2 ring-purple-500/40"
                          : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-white hover:border-zinc-700"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-purple-600/20 text-purple-300 flex items-center justify-center">
                        {m.id === "circle" ? (
                          <Circle className="w-5 h-5" />
                        ) : m.id === "shield" ? (
                          <Shield className="w-5 h-5" />
                        ) : m.id === "star" ? (
                          <Star className="w-5 h-5" />
                        ) : m.id === "wave" ? (
                          <Waves className="w-5 h-5" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </div>
                      <span className="text-[11px] truncate block">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Rounded Corners Radius Slider if rounded / squircle */}
              {(mask.type === "rounded" || mask.type === "squircle" || mask.type === "rectangle") && (
                <div className="p-4 bg-zinc-900/60 rounded-2xl border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Raio dos Cantos (Border Radius)
                    </label>
                    <span className="font-mono text-purple-300 font-bold text-xs">
                      {mask.borderRadius ?? 24}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={mask.borderRadius ?? 24}
                    onChange={(e) => updateMask({ borderRadius: Number(e.target.value) })}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                </div>
              )}

              {/* Internal Image Crop, Framing & Focus */}
              <div className="p-4 bg-zinc-900/60 rounded-2xl border border-zinc-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Crop className="w-4 h-4 text-purple-400" />
                    <span>Enquadramento Interno & Zoom da Foto</span>
                  </h4>
                  {onOpenImagePicker && (
                    <button
                      type="button"
                      onClick={onOpenImagePicker}
                      className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1 shadow"
                    >
                      <ImageIcon className="w-3 h-3" />
                      <span>Trocar Imagem</span>
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Proporções Rápidas de Corte
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        updateTransform({
                          aspectRatio: "3/4",
                          objectFit: "cover",
                          imagePositionY: 0,
                          cropFocus: "top",
                        })
                      }
                      className="p-2 rounded-xl bg-purple-950/50 hover:bg-purple-900/60 border border-purple-500/50 text-left transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                        <User className="w-3.5 h-3.5 text-cyan-300" />
                        <span>Meio Corpo</span>
                      </div>
                      <div className="text-[10px] text-purple-300">Busto 3:4 (Topo)</div>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        updateTransform({
                          aspectRatio: "1/1",
                          objectFit: "cover",
                        })
                      }
                      className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-left transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                        <Square className="w-3.5 h-3.5 text-purple-400" />
                        <span>Quadrado</span>
                      </div>
                      <div className="text-[10px] text-zinc-400">1:1 Simétrico</div>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        updateTransform({
                          aspectRatio: "16/9",
                          objectFit: "cover",
                        })
                      }
                      className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-left transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                        <Tv className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Retangular</span>
                      </div>
                      <div className="text-[10px] text-zinc-400">16:9 Widescreen</div>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        updateTransform({
                          aspectRatio: "9/16",
                          objectFit: "cover",
                          imagePositionY: 0,
                        })
                      }
                      className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-left transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                        <Smartphone className="w-3.5 h-3.5 text-pink-400" />
                        <span>Stories</span>
                      </div>
                      <div className="text-[10px] text-zinc-400">9:16 Vertical</div>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        updateTransform({
                          aspectRatio: "4/3",
                          objectFit: "cover",
                        })
                      }
                      className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-left transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                        <Tv className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Foto 4:3</span>
                      </div>
                      <div className="text-[10px] text-zinc-400">Retângulo Foto</div>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        updateTransform({
                          aspectRatio: "auto",
                          objectFit: "contain",
                          imagePositionY: 50,
                          imagePositionX: 50,
                          imageZoom: 100,
                          cropFocus: undefined,
                        })
                      }
                      className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-left transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-300">
                        <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Foto Completa</span>
                      </div>
                      <div className="text-[10px] text-zinc-500">Sem recorte</div>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Foco Horizontal (X)</span>
                      <span className="font-mono text-purple-300">{transform.imagePositionX ?? 50}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={transform.imagePositionX ?? 50}
                      onChange={(e) => updateTransform({ imagePositionX: Number(e.target.value) })}
                      className="w-full accent-purple-500 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Foco Vertical (Y)</span>
                      <span className="font-mono text-purple-300">{transform.imagePositionY ?? 50}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={transform.imagePositionY ?? 50}
                      onChange={(e) => updateTransform({ imagePositionY: Number(e.target.value) })}
                      className="w-full accent-purple-500 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Zoom Interno</span>
                      <span className="font-mono text-purple-300">{transform.imageZoom ?? 100}%</span>
                    </div>
                    <input
                      type="range"
                      min="100"
                      max="250"
                      value={transform.imageZoom ?? 100}
                      onChange={(e) => updateTransform({ imageZoom: Number(e.target.value) })}
                      className="w-full accent-purple-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Object Fit & Aspect Ratio */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Ajuste da Imagem (Object Fit)
                  </label>
                  <select
                    value={transform.objectFit || "cover"}
                    onChange={(e) => updateTransform({ objectFit: e.target.value as any })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="cover">Preencher e Cortar (Cover - Padrão)</option>
                    <option value="contain">Conter Inteira Sem Cortar (Contain)</option>
                    <option value="fill">Esticar (Fill)</option>
                    <option value="none">Tamanho Original (None)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Proporção Fixa (Aspect Ratio)
                  </label>
                  <select
                    value={transform.aspectRatio || "auto"}
                    onChange={(e) => updateTransform({ aspectRatio: e.target.value as any })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="auto">Automático / Livre</option>
                    <option value="1/1">1:1 - Quadrado Perfeito</option>
                    <option value="16/9">16:9 - Widescreen / Vídeo</option>
                    <option value="9/16">9:16 - Vertical / Stories / Reels</option>
                    <option value="4/5">4:5 - Retrato Instagram</option>
                    <option value="4/3">4:3 - Foto Clássica</option>
                    <option value="21/9">21:9 - Cinema Ultrawide</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TRANSFORMATION, ROTATION & SCALE */}
          {activeTab === "transform" && (
            <div className="space-y-6">
              {/* Rotation Controls */}
              <div className="p-4 bg-zinc-900/60 rounded-2xl border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-purple-400" />
                    <span>Rotação Livre (0° a 360°)</span>
                  </label>
                  <span className="font-mono text-purple-300 font-bold text-xs">
                    {transform.rotate ?? 0}°
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={transform.rotate ?? 0}
                  onChange={(e) => updateTransform({ rotate: Number(e.target.value) })}
                  className="w-full accent-purple-500 cursor-pointer"
                />

                {/* Quick 90° snaps */}
                <div className="flex items-center gap-2 pt-1">
                  {[0, 45, 90, 180, 270].map((deg) => (
                    <button
                      key={deg}
                      type="button"
                      onClick={() => updateTransform({ rotate: deg })}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                        transform.rotate === deg
                          ? "bg-purple-600 text-white"
                          : "bg-zinc-800 text-zinc-400 hover:text-white"
                      }`}
                    >
                      {deg}°
                    </button>
                  ))}
                </div>
              </div>

              {/* Scale & Flips */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-zinc-900/60 rounded-2xl border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Escala / Zoom
                    </label>
                    <span className="font-mono text-purple-300 font-bold text-xs">
                      {Math.round((transform.scale ?? 1) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="2.5"
                    step="0.05"
                    value={transform.scale ?? 1}
                    onChange={(e) => updateTransform({ scale: Number(e.target.value) })}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                </div>

                <div className="p-4 bg-zinc-900/60 rounded-2xl border border-zinc-800 space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">
                    Espelhar Elemento
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        updateTransform({
                          scaleX: (transform.scaleX ?? 1) === 1 ? -1 : 1,
                        })
                      }
                      className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                        (transform.scaleX ?? 1) === -1
                          ? "bg-purple-600 text-white"
                          : "bg-zinc-800 text-zinc-400 hover:text-white"
                      }`}
                    >
                      <FlipHorizontal className="w-3.5 h-3.5" />
                      <span>Espelhar H</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateTransform({
                          scaleY: (transform.scaleY ?? 1) === 1 ? -1 : 1,
                        })
                      }
                      className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                        (transform.scaleY ?? 1) === -1
                          ? "bg-purple-600 text-white"
                          : "bg-zinc-800 text-zinc-400 hover:text-white"
                      }`}
                    >
                      <FlipVertical className="w-3.5 h-3.5" />
                      <span>Espelhar V</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Dimensions (Custom Width & Height in px) */}
              <div className="p-4 bg-zinc-900/60 rounded-2xl border border-zinc-800 space-y-3">
                <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                  Dimensões Customizadas (Largura & Altura em px)
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-zinc-400">Largura (px)</label>
                    <input
                      type="number"
                      placeholder="Auto"
                      value={transform.customWidthPx || ""}
                      onChange={(e) =>
                        updateTransform({
                          customWidthPx: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs font-mono text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-zinc-400">Altura (px)</label>
                    <input
                      type="number"
                      placeholder="Auto"
                      value={transform.customHeightPx || ""}
                      onChange={(e) =>
                        updateTransform({
                          customHeightPx: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs font-mono text-white"
                    />
                  </div>
                </div>

                {/* Quick Presets for Width */}
                <div className="pt-2 border-t border-zinc-800/60 space-y-1.5">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    Presets Rápidos de Largura
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateTransform({ customWidthPx: 1200, customHeightPx: undefined })}
                      className="px-2 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-medium text-center transition-all cursor-pointer"
                    >
                      1200px (Largo)
                    </button>
                    <button
                      type="button"
                      onClick={() => updateTransform({ customWidthPx: 800, customHeightPx: undefined })}
                      className="px-2 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-medium text-center transition-all cursor-pointer"
                    >
                      800px (Médio)
                    </button>
                    <button
                      type="button"
                      onClick={() => updateTransform({ customWidthPx: undefined, customHeightPx: undefined })}
                      className="px-2 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-medium text-center transition-all cursor-pointer"
                    >
                      Auto / Original
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: LAYERS & Z-INDEX */}
          {activeTab === "layers" && (
            <div className="space-y-6">
              {/* Z-Index Level & Ordering */}
              <div className="p-5 bg-zinc-900/60 rounded-2xl border border-zinc-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-purple-400" />
                      <span>Ordem de Camadas (Z-Index)</span>
                    </h4>
                    <p className="text-xs text-zinc-400 pt-0.5">
                      Controle se o elemento fica na frente ou atrás de outros componentes
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-xl bg-purple-950 text-purple-300 font-mono text-xs font-bold border border-purple-800">
                    Z-Index: {zIndex}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <button
                    type="button"
                    onClick={() => updateZIndex(zIndex + 10)}
                    className="p-3 rounded-xl bg-purple-600/30 hover:bg-purple-600 text-purple-200 hover:text-white border border-purple-500/40 text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer"
                  >
                    <ArrowUp className="w-4 h-4" />
                    <span>Trazer p/ Frente (+10)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => updateZIndex(zIndex + 1)}
                    className="p-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Subir 1 Camada (+1)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => updateZIndex(Math.max(1, zIndex - 1))}
                    className="p-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer"
                  >
                    <Minus className="w-4 h-4" />
                    <span>Descer 1 Camada (-1)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => updateZIndex(1)}
                    className="p-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer"
                  >
                    <ArrowDown className="w-4 h-4" />
                    <span>Enviar p/ Fundo (Z:1)</span>
                  </button>
                </div>
              </div>

              {/* Coordinate Offsets (X, Y) */}
              <div className="p-5 bg-zinc-900/60 rounded-2xl border border-zinc-800 space-y-4">
                <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Move className="w-4 h-4 text-cyan-400" />
                  <span>Deslocamento Livre em Pixels (Offsets)</span>
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-zinc-400">Offset X ({offset.x}px)</label>
                    <input
                      type="number"
                      value={offset.x}
                      onChange={(e) => updateOffset({ x: Number(e.target.value) })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-zinc-400">Offset Y ({offset.y}px)</label>
                    <input
                      type="number"
                      value={offset.y}
                      onChange={(e) => updateOffset({ y: Number(e.target.value) })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-white"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => updateOffset({ x: 0, y: 0 })}
                    className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300 transition-colors cursor-pointer"
                  >
                    Centralizar (Reset 0, 0)
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-zinc-900/90 border-t border-zinc-800 flex items-center justify-between">
          <span className="text-xs text-zinc-400">
            Alterações refletem em tempo real no canvas e exportação
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-950 transition-all cursor-pointer"
          >
            Concluir & Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
