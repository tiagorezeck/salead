import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  useBrandStore,
  BRAND_SIZE_PRESETS,
  type BrandSizePreset,
} from "@/lib/brand-store";
import { BrandLogo } from "@/components/brand-logo";
import {
  Upload,
  Sliders,
  RotateCcw,
  Check,
  Sparkles,
  Eye,
  Trash2,
  Layers,
  Type,
  Image as ImageIcon,
  Copy,
  Sun,
  Moon,
  Contrast,
  CheckCircle2,
  FileCode,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type EditingMode = "dark" | "light";
type SubTab = "sizes" | "files" | "format";

export function BrandLogoCustomizerModal() {
  const store = useBrandStore();
  const { isModalOpen, closeModal } = store;

  // Active editing target: Dark mode vs Light mode
  const [editingMode, setEditingMode] = useState<EditingMode>("dark");
  const [subTab, setSubTab] = useState<SubTab>("sizes");

  // SVG Paste input states for Light Mode
  const [lightIconPasteText, setLightIconPasteText] = useState("");
  const [lightTextPasteText, setLightTextPasteText] = useState("");
  const [lightFullPasteText, setLightFullPasteText] = useState("");
  const [showLightPasteIcon, setShowLightPasteIcon] = useState(false);
  const [showLightPasteText, setShowLightPasteText] = useState(false);
  const [showLightPasteFull, setShowLightPasteFull] = useState(false);

  // SVG Paste input states for Dark Mode
  const [darkIconPasteText, setDarkIconPasteText] = useState("");
  const [darkTextPasteText, setDarkTextPasteText] = useState("");
  const [darkFullPasteText, setDarkFullPasteText] = useState("");
  const [showDarkPasteIcon, setShowDarkPasteIcon] = useState(false);
  const [showDarkPasteText, setShowDarkPasteText] = useState(false);
  const [showDarkPasteFull, setShowDarkPasteFull] = useState(false);

  // File input refs
  const lightIconFileRef = useRef<HTMLInputElement>(null);
  const lightTextFileRef = useRef<HTMLInputElement>(null);
  const lightFullFileRef = useRef<HTMLInputElement>(null);

  const darkIconFileRef = useRef<HTMLInputElement>(null);
  const darkTextFileRef = useRef<HTMLInputElement>(null);
  const darkFullFileRef = useRef<HTMLInputElement>(null);

  // Active size values depending on selected editing mode
  const activeIconHeight = editingMode === "dark" ? (store.darkIconHeightPx || 50) : (store.iconHeightPx || 50);
  const activeTextHeight = editingMode === "dark" ? (store.darkTextHeightPx || 35) : (store.textHeightPx || 35);
  const activeFullLogoHeight = editingMode === "dark" ? (store.darkFullLogoHeightPx || 50) : (store.fullLogoHeightPx || 50);
  const activeGap = editingMode === "dark" ? (store.darkGapPx !== undefined ? store.darkGapPx : 12) : (store.gapPx || 12);
  const activeSubtitleFontSize = editingMode === "dark" ? (store.darkSubtitleFontSizePx || 10) : (store.subtitleFontSizePx || 10);
  const activeScale = editingMode === "dark" ? (store.darkScalePercent || 100) : (store.scalePercent || 100);

  // Handlers for adjusting active sizes
  const handleIconHeightChange = (height: number) => {
    if (editingMode === "dark") {
      store.setDarkIconHeightPx(height);
    } else {
      store.setIconHeightPx(height);
    }
  };

  const handleTextHeightChange = (height: number) => {
    if (editingMode === "dark") {
      store.setDarkTextHeightPx(height);
    } else {
      store.setTextHeightPx(height);
    }
  };

  const handleFullLogoHeightChange = (height: number) => {
    if (editingMode === "dark") {
      store.setDarkFullLogoHeightPx(height);
    } else {
      store.setFullLogoHeightPx(height);
    }
  };

  const handleGapChange = (gap: number) => {
    if (editingMode === "dark") {
      store.setDarkGapPx(gap);
    } else {
      store.setGapPx(gap);
    }
  };

  const handleSubtitleFontSizeChange = (size: number) => {
    if (editingMode === "dark") {
      store.setDarkSubtitleFontSizePx(size);
    } else {
      store.setSubtitleFontSizePx(size);
    }
  };

  const handleApplyPreset = (preset: (typeof BRAND_SIZE_PRESETS)[0]) => {
    if (editingMode === "dark") {
      store.setDarkScalePercent(preset.scalePercent);
      store.setDarkIconHeightPx(preset.iconHeight);
      store.setDarkTextHeightPx(preset.textHeight);
      store.setDarkSubtitleFontSizePx(preset.subFontSize);
      store.setDarkFullLogoHeightPx(preset.fullLogoHeight);
      toast.success(`Preset "${preset.label}" aplicado ao Modo Escuro!`);
    } else {
      store.setSizePreset(preset.id as BrandSizePreset);
      toast.success(`Preset "${preset.label}" aplicado ao Modo Claro!`);
    }
  };

  // Upload handler for Light Mode
  const handleLightFileUpload = (file: File, type: "icon" | "text" | "full") => {
    const isSvg = file.type.includes("svg") || file.name.toLowerCase().endsWith(".svg");
    if (isSvg) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const svgContent = e.target?.result as string;
        if (type === "icon") {
          store.setIconFile(svgContent, "", true);
          toast.success("Ícone SVG (Modo Claro) carregado!");
        } else if (type === "text") {
          store.setTextFile(svgContent, "", true);
          toast.success("Tipografia SVG (Modo Claro) carregada!");
        } else {
          store.setFullLogoFile(svgContent, "", true);
          toast.success("Logo Completo SVG (Modo Claro) carregado!");
        }
      };
      reader.readAsText(file);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        if (type === "icon") {
          store.setIconFile("", dataUrl, false);
          toast.success("Ícone PNG (Modo Claro) carregado!");
        } else if (type === "text") {
          store.setTextFile("", dataUrl, false);
          toast.success("Tipografia PNG (Modo Claro) carregada!");
        } else {
          store.setFullLogoFile("", dataUrl, false);
          toast.success("Logo Completo PNG (Modo Claro) carregado!");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Upload handler for Dark Mode
  const handleDarkFileUpload = (file: File, type: "icon" | "text" | "full") => {
    const isSvg = file.type.includes("svg") || file.name.toLowerCase().endsWith(".svg");
    if (isSvg) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const svgContent = e.target?.result as string;
        if (type === "icon") {
          store.setDarkIconFile(svgContent, "", true);
          toast.success("Ícone SVG (Modo Escuro) carregado!");
        } else if (type === "text") {
          store.setDarkTextFile(svgContent, "", true);
          toast.success("Tipografia SVG (Modo Escuro) carregada!");
        } else {
          store.setDarkFullLogoFile(svgContent, "", true);
          toast.success("Logo Completo SVG (Modo Escuro) carregado!");
        }
      };
      reader.readAsText(file);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        if (type === "icon") {
          store.setDarkIconFile("", dataUrl, false);
          toast.success("Ícone PNG (Modo Escuro) carregado!");
        } else if (type === "text") {
          store.setDarkTextFile("", dataUrl, false);
          toast.success("Tipografia PNG (Modo Escuro) carregada!");
        } else {
          store.setDarkFullLogoFile("", dataUrl, false);
          toast.success("Logo Completo PNG (Modo Escuro) carregado!");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleApplyPastedSvg = (type: "icon" | "text" | "full") => {
    if (editingMode === "light") {
      if (type === "icon") {
        if (!lightIconPasteText.trim().startsWith("<svg")) {
          toast.error("O código colado deve começar com <svg...>");
          return;
        }
        store.setIconFile(lightIconPasteText.trim(), "", true);
        setShowLightPasteIcon(false);
        setLightIconPasteText("");
        toast.success("SVG do Ícone (Modo Claro) aplicado!");
      } else if (type === "text") {
        if (!lightTextPasteText.trim().startsWith("<svg")) {
          toast.error("O código colado deve começar com <svg...>");
          return;
        }
        store.setTextFile(lightTextPasteText.trim(), "", true);
        setShowLightPasteText(false);
        setLightTextPasteText("");
        toast.success("SVG do Texto (Modo Claro) aplicado!");
      } else {
        if (!lightFullPasteText.trim().startsWith("<svg")) {
          toast.error("O código colado deve começar com <svg...>");
          return;
        }
        store.setFullLogoFile(lightFullPasteText.trim(), "", true);
        setShowLightPasteFull(false);
        setLightFullPasteText("");
        toast.success("SVG do Logo Completo (Modo Claro) aplicado!");
      }
    } else {
      if (type === "icon") {
        if (!darkIconPasteText.trim().startsWith("<svg")) {
          toast.error("O código colado deve começar com <svg...>");
          return;
        }
        store.setDarkIconFile(darkIconPasteText.trim(), "", true);
        setShowDarkPasteIcon(false);
        setDarkIconPasteText("");
        toast.success("SVG do Ícone (Modo Escuro) aplicado!");
      } else if (type === "text") {
        if (!darkTextPasteText.trim().startsWith("<svg")) {
          toast.error("O código colado deve começar com <svg...>");
          return;
        }
        store.setDarkTextFile(darkTextPasteText.trim(), "", true);
        setShowDarkPasteText(false);
        setDarkTextPasteText("");
        toast.success("SVG do Texto (Modo Escuro) aplicado!");
      } else {
        if (!darkFullPasteText.trim().startsWith("<svg")) {
          toast.error("O código colado deve começar com <svg...>");
          return;
        }
        store.setDarkFullLogoFile(darkFullPasteText.trim(), "", true);
        setShowDarkPasteFull(false);
        setDarkFullPasteText("");
        toast.success("SVG do Logo Completo (Modo Escuro) aplicado!");
      }
    }
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 gap-0 border-border bg-card text-card-foreground shadow-2xl rounded-2xl">
        {/* Header */}
        <div className="p-5 border-b border-border bg-gradient-to-r from-muted/40 via-card to-muted/20">
          <DialogHeader className="text-left space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-500 shadow-sm">
                  <Sliders className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold font-display tracking-tight flex items-center gap-2">
                    Editor de Logotipo & Dimensões
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      Multi-Modo
                    </span>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Selecione o modo abaixo para configurar individualmente o logotipo, arquivos e dimensões exatas de cada tema.
                  </DialogDescription>
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* MASTER MODE SELECTOR (Modo Escuro vs Modo Claro) */}
          <div className="mt-4 grid grid-cols-2 gap-3 p-1 bg-background/80 border border-border rounded-xl">
            <button
              onClick={() => setEditingMode("dark")}
              className={cn(
                "flex items-center justify-between px-4 py-3 rounded-lg text-xs font-bold transition-all relative",
                editingMode === "dark"
                  ? "bg-zinc-900 text-white shadow-md border border-orange-500/50"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              )}
            >
              <div className="flex items-center gap-2.5">
                <div className={cn(
                  "h-7 w-7 rounded-lg flex items-center justify-center transition-colors",
                  editingMode === "dark" ? "bg-orange-500 text-white" : "bg-muted text-muted-foreground"
                )}>
                  <Moon className="h-4 w-4" />
                </div>
                <div className="text-left">
                  <div className="font-extrabold text-[13px] flex items-center gap-1.5">
                    Modo Escuro & Login
                    {editingMode === "dark" && (
                      <span className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                    )}
                  </div>
                  <div className="text-[10px] font-normal opacity-80">
                    {store.darkIconSource === "inherit" && !store.darkFullLogoSvgRaw && !store.darkFullLogoDataUrl
                      ? "Vetor Imagem 3 (Oficial)"
                      : "Personalizado ativo"} • {store.darkIconHeightPx || 50}px / {store.darkTextHeightPx || 35}px
                  </div>
                </div>
              </div>
              {editingMode === "dark" && (
                <div className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  Editando
                </div>
              )}
            </button>

            <button
              onClick={() => setEditingMode("light")}
              className={cn(
                "flex items-center justify-between px-4 py-3 rounded-lg text-xs font-bold transition-all relative",
                editingMode === "light"
                  ? "bg-orange-500/15 text-orange-600 dark:text-orange-400 shadow-md border border-orange-500/50"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              )}
            >
              <div className="flex items-center gap-2.5">
                <div className={cn(
                  "h-7 w-7 rounded-lg flex items-center justify-center transition-colors",
                  editingMode === "light" ? "bg-orange-500 text-white" : "bg-muted text-muted-foreground"
                )}>
                  <Sun className="h-4 w-4" />
                </div>
                <div className="text-left">
                  <div className="font-extrabold text-[13px] flex items-center gap-1.5">
                    Modo Claro (Diurno)
                    {editingMode === "light" && (
                      <span className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                    )}
                  </div>
                  <div className="text-[10px] font-normal opacity-80">
                    {store.iconSource === "builtin" && !store.fullLogoSvgRaw && !store.fullLogoDataUrl
                      ? "Vetor Oficial Diurno"
                      : "Personalizado ativo"} • {store.iconHeightPx || 50}px / {store.textHeightPx || 35}px
                  </div>
                </div>
              </div>
              {editingMode === "light" && (
                <div className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  Editando
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Sub-Tabs for the Selected Mode */}
        <div className="flex border-b border-border bg-muted/20 px-5 gap-4">
          <button
            onClick={() => setSubTab("sizes")}
            className={cn(
              "py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all",
              subTab === "sizes"
                ? "border-orange-500 text-orange-500"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Sliders className="h-3.5 w-3.5" />
            Dimensões & Ajustes Finos (Pixels)
          </button>
          <button
            onClick={() => setSubTab("files")}
            className={cn(
              "py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all",
              subTab === "files"
                ? "border-orange-500 text-orange-500"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Upload className="h-3.5 w-3.5" />
            Upload de Arquivos ({editingMode === "dark" ? "Modo Escuro" : "Modo Claro"})
          </button>
          <button
            onClick={() => setSubTab("format")}
            className={cn(
              "py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all",
              subTab === "format"
                ? "border-orange-500 text-orange-500"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Layers className="h-3.5 w-3.5" />
            Formato & Subtítulo
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-6">
          {/* TAB 1: DIMENSÕES & AJUSTES FINOS */}
          {subTab === "sizes" && (
            <div className="space-y-6">
              {/* Context Banner */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-orange-500/10 border border-orange-500/25">
                <div className="flex items-center gap-2.5">
                  {editingMode === "dark" ? (
                    <Moon className="h-4 w-4 text-orange-400" />
                  ) : (
                    <Sun className="h-4 w-4 text-orange-500" />
                  )}
                  <span className="text-xs font-bold">
                    Editando tamanhos específicos para o{" "}
                    <span className="text-orange-400 underline">
                      {editingMode === "dark" ? "Modo Escuro & Login" : "Modo Claro (Diurno)"}
                    </span>
                  </span>
                </div>
                <button
                  onClick={() => {
                    if (editingMode === "dark") {
                      store.copyLightSizesToDark();
                      toast.success("Medidas do Modo Claro copiadas para o Modo Escuro!");
                    } else {
                      store.copyDarkSizesToLight();
                      toast.success("Medidas do Modo Escuro copiadas para o Modo Claro!");
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background/80 hover:bg-background border border-border text-[11px] font-semibold text-foreground transition-colors"
                >
                  <Copy className="h-3 w-3 text-primary" />
                  {editingMode === "dark" ? "Copiar medidas do Modo Claro" : "Copiar medidas do Modo Escuro"}
                </button>
              </div>

              {/* Sliders Grid */}
              <div className="grid md:grid-cols-2 gap-5">
                {/* 1. Altura do Ícone */}
                <div className="bg-background/60 border border-border rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
                        <ImageIcon className="h-3.5 w-3.5" />
                      </div>
                      <label className="text-xs font-bold text-foreground">
                        Altura do Ícone / Símbolo
                      </label>
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={16}
                        max={160}
                        value={activeIconHeight}
                        onChange={(e) => handleIconHeightChange(Number(e.target.value))}
                        className="w-16 text-right text-xs font-mono font-bold bg-muted/50 border border-border rounded px-1.5 py-0.5"
                      />
                      <span className="text-xs text-muted-foreground font-mono">px</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={18}
                    max={120}
                    step={1}
                    value={activeIconHeight}
                    onChange={(e) => handleIconHeightChange(Number(e.target.value))}
                    className="w-full accent-orange-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>18px (Compacto)</span>
                    <span className="font-bold text-orange-400">{activeIconHeight}px</span>
                    <span>120px (Grande)</span>
                  </div>
                </div>

                {/* 2. Altura do Texto / Nome */}
                <div className="bg-background/60 border border-border rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
                        <Type className="h-3.5 w-3.5" />
                      </div>
                      <label className="text-xs font-bold text-foreground">
                        Altura do Texto (SALEAD)
                      </label>
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={12}
                        max={140}
                        value={activeTextHeight}
                        onChange={(e) => handleTextHeightChange(Number(e.target.value))}
                        className="w-16 text-right text-xs font-mono font-bold bg-muted/50 border border-border rounded px-1.5 py-0.5"
                      />
                      <span className="text-xs text-muted-foreground font-mono">px</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={14}
                    max={90}
                    step={1}
                    value={activeTextHeight}
                    onChange={(e) => handleTextHeightChange(Number(e.target.value))}
                    className="w-full accent-orange-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>14px (Discreto)</span>
                    <span className="font-bold text-orange-400">{activeTextHeight}px</span>
                    <span>90px (Destaque)</span>
                  </div>
                </div>

                {/* 3. Espaçamento / Gap */}
                <div className="bg-background/60 border border-border rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
                        <Sliders className="h-3.5 w-3.5" />
                      </div>
                      <label className="text-xs font-bold text-foreground">
                        Distância entre Ícone e Nome
                      </label>
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={60}
                        value={activeGap}
                        onChange={(e) => handleGapChange(Number(e.target.value))}
                        className="w-16 text-right text-xs font-mono font-bold bg-muted/50 border border-border rounded px-1.5 py-0.5"
                      />
                      <span className="text-xs text-muted-foreground font-mono">px</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={40}
                    step={1}
                    value={activeGap}
                    onChange={(e) => handleGapChange(Number(e.target.value))}
                    className="w-full accent-orange-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>0px (Junto)</span>
                    <span className="font-bold text-orange-400">{activeGap}px</span>
                    <span>40px (Espaçado)</span>
                  </div>
                </div>

                {/* 4. Altura do Logo Completo Unificado */}
                <div className="bg-background/60 border border-border rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
                        <Layers className="h-3.5 w-3.5" />
                      </div>
                      <label className="text-xs font-bold text-foreground">
                        Altura do Logo Unificado (Arquivo Único)
                      </label>
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={16}
                        max={180}
                        value={activeFullLogoHeight}
                        onChange={(e) => handleFullLogoHeightChange(Number(e.target.value))}
                        className="w-16 text-right text-xs font-mono font-bold bg-muted/50 border border-border rounded px-1.5 py-0.5"
                      />
                      <span className="text-xs text-muted-foreground font-mono">px</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={120}
                    step={1}
                    value={activeFullLogoHeight}
                    onChange={(e) => handleFullLogoHeightChange(Number(e.target.value))}
                    className="w-full accent-orange-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>20px</span>
                    <span className="font-bold text-orange-400">{activeFullLogoHeight}px</span>
                    <span>120px</span>
                  </div>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="space-y-2.5 pt-2">
                <div className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Presets Rápidos de Proporção para {editingMode === "dark" ? "Modo Escuro" : "Modo Claro"}:
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {BRAND_SIZE_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => handleApplyPreset(preset)}
                      className={cn(
                        "p-2.5 rounded-xl border text-left transition-all hover:scale-[1.02] flex flex-col justify-between",
                        activeIconHeight === preset.iconHeight
                          ? "bg-orange-500/15 border-orange-500 text-orange-400 shadow-sm"
                          : "bg-background/60 border-border text-muted-foreground hover:text-foreground hover:bg-muted/40"
                      )}
                    >
                      <div className="text-xs font-bold">{preset.label.split("—")[0]}</div>
                      <div className="text-[10px] font-mono opacity-80 mt-1">{preset.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: UPLOAD DE ARQUIVOS */}
          {subTab === "files" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-orange-500/10 border border-orange-500/25">
                <div className="flex items-center gap-2.5">
                  {editingMode === "dark" ? (
                    <Moon className="h-4 w-4 text-orange-400" />
                  ) : (
                    <Sun className="h-4 w-4 text-orange-500" />
                  )}
                  <span className="text-xs font-bold">
                    Uploads e Arquivos para o{" "}
                    <span className="text-orange-400 underline">
                      {editingMode === "dark" ? "Modo Escuro & Login" : "Modo Claro (Diurno)"}
                    </span>
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  Suporta arquivos SVG vetoriais, PNG transparentes e WebP
                </span>
              </div>

              {/* 3 Upload Slots */}
              <div className="grid md:grid-cols-3 gap-5">
                {/* SLOT 1: LOGO COMPLETO UNIFICADO */}
                <div className="bg-background/60 border border-border rounded-2xl p-4 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold flex items-center gap-1.5">
                        <Layers className="h-3.5 w-3.5 text-orange-400" />
                        Logo Completo (1 arquivo)
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-muted">
                        Unificado
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Ícone e Texto juntos em uma única imagem ou SVG.
                    </p>
                  </div>

                  {/* Status */}
                  <div className="p-2.5 rounded-xl bg-muted/40 border border-border text-[11px] space-y-1">
                    <div className="text-[10px] uppercase font-bold text-muted-foreground">Status Atual:</div>
                    <div className="font-semibold text-foreground truncate">
                      {editingMode === "dark"
                        ? store.darkFullLogoSvgRaw
                          ? "SVG Personalizado (Escuro)"
                          : store.darkFullLogoDataUrl
                          ? "PNG Personalizado (Escuro)"
                          : "Padrão Vetorial Oficial (Modo Escuro)"
                        : store.fullLogoSvgRaw
                        ? "SVG Personalizado (Claro)"
                        : store.fullLogoDataUrl
                        ? "PNG Personalizado (Claro)"
                        : "Padrão Vetorial Oficial (Modo Claro)"}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2">
                    <button
                      onClick={() =>
                        editingMode === "dark"
                          ? darkFullFileRef.current?.click()
                          : lightFullFileRef.current?.click()
                      }
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-all shadow-sm"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Fazer Upload
                    </button>
                    <input
                      type="file"
                      ref={editingMode === "dark" ? darkFullFileRef : lightFullFileRef}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (editingMode === "dark") handleDarkFileUpload(file, "full");
                          else handleLightFileUpload(file, "full");
                        }
                      }}
                      accept=".svg,image/png,image/webp,image/jpeg"
                      className="hidden"
                    />

                    {(editingMode === "dark" ? store.darkFullLogoSvgRaw || store.darkFullLogoDataUrl : store.fullLogoSvgRaw || store.fullLogoDataUrl) && (
                      <button
                        onClick={() => {
                          if (editingMode === "dark") {
                            store.clearDarkFullLogo();
                            toast.success("Logo Completo do Modo Escuro redefinido para padrão!");
                          } else {
                            store.clearLightFullLogo();
                            toast.success("Logo Completo do Modo Claro redefinido!");
                          }
                        }}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive text-[11px] font-semibold transition-all"
                      >
                        <Trash2 className="h-3 w-3" />
                        Remover e Voltar ao Padrão
                      </button>
                    )}
                  </div>
                </div>

                {/* SLOT 2: ÍCONE / SÍMBOLO SEPARADO */}
                <div className="bg-background/60 border border-border rounded-2xl p-4 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold flex items-center gap-1.5">
                        <ImageIcon className="h-3.5 w-3.5 text-orange-400" />
                        Ícone / Símbolo Isolado
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-muted">
                        Símbolo
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Apenas a sacola / símbolo dinâmico sem texto.
                    </p>
                  </div>

                  {/* Status */}
                  <div className="p-2.5 rounded-xl bg-muted/40 border border-border text-[11px] space-y-1">
                    <div className="text-[10px] uppercase font-bold text-muted-foreground">Status Atual:</div>
                    <div className="font-semibold text-foreground truncate">
                      {editingMode === "dark"
                        ? store.darkIconSource === "custom_svg"
                          ? "Ícone SVG (Escuro)"
                          : store.darkIconSource === "custom_url"
                          ? "Ícone PNG (Escuro)"
                          : "Ícone Vetorial Oficial"
                        : store.iconSource === "custom_svg"
                        ? "Ícone SVG (Claro)"
                        : store.iconSource === "custom_url"
                        ? "Ícone PNG (Claro)"
                        : "Ícone Vetorial Oficial"}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2">
                    <button
                      onClick={() =>
                        editingMode === "dark"
                          ? darkIconFileRef.current?.click()
                          : lightIconFileRef.current?.click()
                      }
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-all shadow-sm"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Fazer Upload
                    </button>
                    <input
                      type="file"
                      ref={editingMode === "dark" ? darkIconFileRef : lightIconFileRef}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (editingMode === "dark") handleDarkFileUpload(file, "icon");
                          else handleLightFileUpload(file, "icon");
                        }
                      }}
                      accept=".svg,image/png,image/webp,image/jpeg"
                      className="hidden"
                    />

                    {(editingMode === "dark" ? store.darkIconSource !== "inherit" : store.iconSource !== "builtin") && (
                      <button
                        onClick={() => {
                          if (editingMode === "dark") {
                            store.clearDarkIcon();
                            toast.success("Ícone do Modo Escuro redefinido para padrão!");
                          } else {
                            store.clearLightIcon();
                            toast.success("Ícone do Modo Claro redefinido!");
                          }
                        }}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive text-[11px] font-semibold transition-all"
                      >
                        <Trash2 className="h-3 w-3" />
                        Remover e Voltar ao Padrão
                      </button>
                    )}
                  </div>
                </div>

                {/* SLOT 3: TIPOGRAFIA / NOME SEPARADO */}
                <div className="bg-background/60 border border-border rounded-2xl p-4 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold flex items-center gap-1.5">
                        <Type className="h-3.5 w-3.5 text-orange-400" />
                        Tipografia / SALEAD Isolado
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-muted">
                        Nome
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Apenas a tipografia SALEAD sem o ícone.
                    </p>
                  </div>

                  {/* Status */}
                  <div className="p-2.5 rounded-xl bg-muted/40 border border-border text-[11px] space-y-1">
                    <div className="text-[10px] uppercase font-bold text-muted-foreground">Status Atual:</div>
                    <div className="font-semibold text-foreground truncate">
                      {editingMode === "dark"
                        ? store.darkTextSource === "custom_svg"
                          ? "Texto SVG (Escuro)"
                          : store.darkTextSource === "custom_url"
                          ? "Texto PNG (Escuro)"
                          : "Tipografia Vetorial Oficial"
                        : store.textSource === "custom_svg"
                        ? "Texto SVG (Claro)"
                        : store.textSource === "custom_url"
                        ? "Texto PNG (Claro)"
                        : "Tipografia Vetorial Oficial"}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2">
                    <button
                      onClick={() =>
                        editingMode === "dark"
                          ? darkTextFileRef.current?.click()
                          : lightTextFileRef.current?.click()
                      }
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-all shadow-sm"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Fazer Upload
                    </button>
                    <input
                      type="file"
                      ref={editingMode === "dark" ? darkTextFileRef : lightTextFileRef}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (editingMode === "dark") handleDarkFileUpload(file, "text");
                          else handleLightFileUpload(file, "text");
                        }
                      }}
                      accept=".svg,image/png,image/webp,image/jpeg"
                      className="hidden"
                    />

                    {(editingMode === "dark" ? store.darkTextSource !== "inherit" : store.textSource !== "builtin") && (
                      <button
                        onClick={() => {
                          if (editingMode === "dark") {
                            store.clearDarkText();
                            toast.success("Texto do Modo Escuro redefinido para padrão!");
                          } else {
                            store.clearLightText();
                            toast.success("Texto do Modo Claro redefinido!");
                          }
                        }}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive text-[11px] font-semibold transition-all"
                      >
                        <Trash2 className="h-3 w-3" />
                        Remover e Voltar ao Padrão
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: FORMATO & SUBTÍTULO */}
          {subTab === "format" && (
            <div className="space-y-6">
              {/* Formato de Exibição */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-foreground">
                  Estrutura de Exibição do Logotipo
                </label>
                <div className="grid sm:grid-cols-4 gap-3">
                  <button
                    onClick={() => store.setFullMode()}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all",
                      store.mode === "split" && store.showSubtitle
                        ? "bg-orange-500/15 border-orange-500 text-orange-400 font-bold"
                        : "bg-background/60 border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <div className="text-xs font-bold">Ícone + Nome + Subtítulo</div>
                    <div className="text-[10px] opacity-70 mt-1">Completo Oficial</div>
                  </button>

                  <button
                    onClick={() => store.setLogoAndNameMode()}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all",
                      store.mode === "split" && !store.showSubtitle
                        ? "bg-orange-500/15 border-orange-500 text-orange-400 font-bold"
                        : "bg-background/60 border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <div className="text-xs font-bold">Ícone + Nome</div>
                    <div className="text-[10px] opacity-70 mt-1">Sem subtítulo</div>
                  </button>

                  <button
                    onClick={() => store.setOnlyImageMode()}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all",
                      store.mode === "icon_only"
                        ? "bg-orange-500/15 border-orange-500 text-orange-400 font-bold"
                        : "bg-background/60 border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <div className="text-xs font-bold">Apenas Ícone</div>
                    <div className="text-[10px] opacity-70 mt-1">Símbolo isolado</div>
                  </button>

                  <button
                    onClick={() => store.setMode("text_only")}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all",
                      store.mode === "text_only"
                        ? "bg-orange-500/15 border-orange-500 text-orange-400 font-bold"
                        : "bg-background/60 border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <div className="text-xs font-bold">Apenas Nome</div>
                    <div className="text-[10px] opacity-70 mt-1">SALEAD isolado</div>
                  </button>
                </div>
              </div>

              {/* Subtítulo Input */}
              <div className="bg-background/60 border border-border rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground">
                    Texto do Subtítulo
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={store.showSubtitle}
                      onChange={(e) => store.setShowSubtitle(e.target.checked)}
                      className="rounded accent-orange-500"
                    />
                    <span className="text-xs text-muted-foreground">Exibir subtítulo</span>
                  </label>
                </div>

                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      value={store.subtitle}
                      onChange={(e) => store.setSubtitle(e.target.value)}
                      placeholder="Ex: Prospecção e Vendas"
                      className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground">Tamanho:</span>
                      <input
                        type="number"
                        min={7}
                        max={24}
                        value={activeSubtitleFontSize}
                        onChange={(e) => handleSubtitleFontSizeChange(Number(e.target.value))}
                        className="w-16 bg-muted/40 border border-border rounded px-2 py-1 text-xs font-mono font-bold"
                      />
                      <span className="text-xs text-muted-foreground font-mono">px</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Adaptação de cores */}
              <div className="p-4 rounded-xl bg-muted/30 border border-border flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-foreground">Adaptação Inteligente de Contraste</div>
                  <div className="text-[11px] text-muted-foreground">Inverte automaticamente logos escuros em fundos escuros quando nenhum arquivo específico de modo escuro é fornecido.</div>
                </div>
                <input
                  type="checkbox"
                  checked={store.autoAdaptDark}
                  onChange={(e) => store.setAutoAdaptDark(e.target.checked)}
                  className="h-4 w-4 rounded accent-orange-500 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* REAL-TIME SPLIT PREVIEWS (Modo Escuro e Modo Claro Lado a Lado) */}
          <div className="space-y-3 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-foreground flex items-center gap-2">
                <Eye className="h-4 w-4 text-orange-400" />
                Pré-visualização em Tempo Real (Ambos os Modos)
              </div>
              <span className="text-[10px] text-muted-foreground">
                As alterações refletem instantaneamente em todo o sistema
              </span>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Preview Modo Escuro */}
              <div
                onClick={() => setEditingMode("dark")}
                className={cn(
                  "p-6 rounded-2xl bg-zinc-950 border transition-all cursor-pointer relative overflow-hidden flex flex-col items-center justify-center min-h-[160px]",
                  editingMode === "dark"
                    ? "border-orange-500 shadow-lg ring-2 ring-orange-500/20"
                    : "border-zinc-800 hover:border-zinc-700 opacity-90"
                )}
              >
                <div className="absolute top-2.5 left-3 flex items-center gap-1.5 text-[10px] font-bold text-zinc-400">
                  <Moon className="h-3 w-3 text-orange-400" />
                  MODO ESCURO & LOGIN
                </div>
                {editingMode === "dark" && (
                  <div className="absolute top-2.5 right-3 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/40">
                    Foco Ativo
                  </div>
                )}
                <div className="py-4">
                  <BrandLogo theme="dark" allowCustomize={false} />
                </div>
              </div>

              {/* Preview Modo Claro */}
              <div
                onClick={() => setEditingMode("light")}
                className={cn(
                  "p-6 rounded-2xl bg-white border transition-all cursor-pointer relative overflow-hidden flex flex-col items-center justify-center min-h-[160px]",
                  editingMode === "light"
                    ? "border-orange-500 shadow-lg ring-2 ring-orange-500/20"
                    : "border-zinc-200 hover:border-zinc-300 opacity-90"
                )}
              >
                <div className="absolute top-2.5 left-3 flex items-center gap-1.5 text-[10px] font-bold text-zinc-700">
                  <Sun className="h-3 w-3 text-orange-500" />
                  MODO CLARO (DIURNO)
                </div>
                {editingMode === "light" && (
                  <div className="absolute top-2.5 right-3 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-600 border border-orange-500/40">
                    Foco Ativo
                  </div>
                )}
                <div className="py-4">
                  <BrandLogo theme="light" allowCustomize={false} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border bg-muted/20 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (editingMode === "dark") {
                  store.resetDarkModeToDefault();
                  toast.success("Modo Escuro restaurado para o padrão vetorial oficial!");
                } else {
                  store.resetLightModeToDefault();
                  toast.success("Modo Claro restaurado para o padrão vetorial oficial!");
                }
              }}
              className="px-3 py-2 rounded-xl border border-border bg-background hover:bg-muted text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restaurar Padrão do {editingMode === "dark" ? "Modo Escuro" : "Modo Claro"}
            </button>
            <button
              onClick={() => {
                store.resetToDefault();
                toast.success("Todos os modos foram restaurados para os padrões originais!");
              }}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-destructive flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Resetar Tudo
            </button>
          </div>

          <button
            onClick={() => {
              closeModal();
              toast.success("Configurações do logotipo salvas com sucesso!");
            }}
            className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
          >
            <Check className="h-4 w-4" />
            Concluir & Salvar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
