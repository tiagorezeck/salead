import { useSyncExternalStore } from "react";
import { cloudStore } from "@/services/cloudStorageService";

export const LOGO_EDITOR_ENABLED = false;

export type BrandSizePreset = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

export interface BrandSizePresetConfig {
  id: BrandSizePreset;
  label: string;
  description: string;
  iconHeight: number;
  textHeight: number;
  subFontSize: number;
  fullLogoHeight: number;
  scalePercent: number;
}

export const BRAND_SIZE_PRESETS: BrandSizePresetConfig[] = [
  {
    id: "xs",
    label: "PP — Compacto",
    description: "32px",
    iconHeight: 32,
    textHeight: 22,
    subFontSize: 8,
    fullLogoHeight: 32,
    scalePercent: 70,
  },
  {
    id: "sm",
    label: "P — Padrão Fino",
    description: "40px",
    iconHeight: 40,
    textHeight: 28,
    subFontSize: 9,
    fullLogoHeight: 40,
    scalePercent: 85,
  },
  {
    id: "md",
    label: "M — Equilibrado",
    description: "50px",
    iconHeight: 50,
    textHeight: 35,
    subFontSize: 10,
    fullLogoHeight: 50,
    scalePercent: 100,
  },
  {
    id: "lg",
    label: "G — Grande",
    description: "64px",
    iconHeight: 64,
    textHeight: 44,
    subFontSize: 12,
    fullLogoHeight: 64,
    scalePercent: 125,
  },
  {
    id: "xl",
    label: "GG — Destaque",
    description: "80px",
    iconHeight: 80,
    textHeight: 54,
    subFontSize: 14,
    fullLogoHeight: 80,
    scalePercent: 155,
  },
  {
    id: "2xl",
    label: "XG — Máximo",
    description: "98px",
    iconHeight: 98,
    textHeight: 68,
    subFontSize: 16,
    fullLogoHeight: 98,
    scalePercent: 190,
  },
];

export interface BrandLogoConfig {
  mode: "split" | "unified" | "icon_only" | "text_only";
  sizePreset: BrandSizePreset;
  scalePercent: number;

  // ==========================================
  // MODO CLARO / PADRÃO (SISTEMA DIURNO)
  // ==========================================
  iconSource: "builtin" | "custom_svg" | "custom_url";
  iconSvgRaw: string;
  iconDataUrl: string;
  iconHeightPx: number;

  textSource: "builtin" | "custom_svg" | "custom_url";
  textSvgRaw: string;
  textDataUrl: string;
  textHeightPx: number;

  fullLogoSvgRaw: string;
  fullLogoDataUrl: string;
  fullLogoHeightPx: number;

  gapPx: number;

  // ==========================================
  // MODO ESCURO (TELAS ESCURAS & LOGIN)
  // ==========================================
  darkIconSource: "inherit" | "custom_svg" | "custom_url" | "builtin";
  darkIconSvgRaw: string;
  darkIconDataUrl: string;
  darkIconHeightPx: number;

  darkTextSource: "inherit" | "custom_svg" | "custom_url" | "builtin";
  darkTextSvgRaw: string;
  darkTextDataUrl: string;
  darkTextHeightPx: number;

  darkFullLogoSvgRaw: string;
  darkFullLogoDataUrl: string;
  darkFullLogoHeightPx: number;

  darkGapPx: number;
  darkScalePercent: number;
  darkSubtitleFontSizePx: number;

  // Adaptação Automática de Cores para Modo Escuro
  autoAdaptDark: boolean;

  // Subtítulo
  subtitle: string;
  showSubtitle: boolean;
  subtitleFontSizePx: number;
}

export interface BrandStore extends BrandLogoConfig {
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;

  // Modo de exibição geral
  setMode: (mode: BrandLogoConfig["mode"]) => void;

  // Controles Modo Claro
  setSizePreset: (preset: BrandSizePreset) => void;
  setScalePercent: (scale: number) => void;
  setIconFile: (svgRaw: string, dataUrl: string, isSvg: boolean) => void;
  setTextFile: (svgRaw: string, dataUrl: string, isSvg: boolean) => void;
  setFullLogoFile: (svgRaw: string, dataUrl: string, isSvg: boolean) => void;
  clearLightIcon: () => void;
  clearLightText: () => void;
  clearLightFullLogo: () => void;
  setIconHeightPx: (height: number) => void;
  setTextHeightPx: (height: number) => void;
  setFullLogoHeightPx: (height: number) => void;
  setGapPx: (gap: number) => void;

  // Controles Modo Escuro
  setDarkIconFile: (svgRaw: string, dataUrl: string, isSvg: boolean) => void;
  setDarkTextFile: (svgRaw: string, dataUrl: string, isSvg: boolean) => void;
  setDarkFullLogoFile: (svgRaw: string, dataUrl: string, isSvg: boolean) => void;
  clearDarkIcon: () => void;
  clearDarkText: () => void;
  clearDarkFullLogo: () => void;
  setDarkIconHeightPx: (height: number) => void;
  setDarkTextHeightPx: (height: number) => void;
  setDarkFullLogoHeightPx: (height: number) => void;
  setDarkGapPx: (gap: number) => void;
  setDarkScalePercent: (scale: number) => void;
  setDarkSubtitleFontSizePx: (size: number) => void;

  // Sincronizações & Resets
  copyLightSizesToDark: () => void;
  copyDarkSizesToLight: () => void;
  resetDarkModeToDefault: () => void;
  resetLightModeToDefault: () => void;
  resetToDefault: () => void;

  // Subtítulo e Utilitários
  setAutoAdaptDark: (auto: boolean) => void;
  setSubtitle: (subtitle: string) => void;
  setShowSubtitle: (show: boolean) => void;
  setSubtitleFontSizePx: (size: number) => void;
  deleteSubtitle: () => void;
  setOnlyImageMode: () => void;
  setLogoAndNameMode: () => void;
  setFullMode: () => void;
}

const DEFAULT_CONFIG: BrandLogoConfig = {
  mode: "split",
  sizePreset: "md",
  scalePercent: 100,

  // Modo Claro (Opções 1, 2, 3 do sistema - logos escuros para fundo claro)
  iconSource: "builtin",
  iconSvgRaw: "",
  iconDataUrl: "",
  iconHeightPx: 50,

  textSource: "builtin",
  textSvgRaw: "",
  textDataUrl: "",
  textHeightPx: 35,

  fullLogoSvgRaw: "",
  fullLogoDataUrl: "",
  fullLogoHeightPx: 50,
  gapPx: 12,

  // Modo Escuro (Usa inherit para vetor nativo limpo em SVG puro)
  darkIconSource: "inherit",
  darkIconSvgRaw: "",
  darkIconDataUrl: "",
  darkIconHeightPx: 50,

  darkTextSource: "inherit",
  darkTextSvgRaw: "",
  darkTextDataUrl: "",
  darkTextHeightPx: 35,

  darkFullLogoSvgRaw: "",
  darkFullLogoDataUrl: "",
  darkFullLogoHeightPx: 50,
  darkGapPx: 12,
  darkScalePercent: 100,
  darkSubtitleFontSizePx: 10,

  autoAdaptDark: true,

  subtitle: "",
  showSubtitle: false,
  subtitleFontSizePx: 10,
};

function extractBrandConfig(raw: any): Partial<BrandLogoConfig> | null {
  if (!raw || typeof raw !== "object") return null;
  const data = "state" in raw ? raw.state : raw;
  return data && typeof data === "object" ? data : null;
}

function loadInitialState(): BrandLogoConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try {
    const cloudDb = cloudStore.getState();
    const fromCloud = extractBrandConfig(cloudDb.brandIdentity || cloudDb.company?.logo_config);
    if (fromCloud) {
      return { ...DEFAULT_CONFIG, ...fromCloud };
    }
  } catch (err) {
    console.error("Failed to load brand settings from cloudStore", err);
  }
  return DEFAULT_CONFIG;
}

let state: BrandStore;
const listeners = new Set<() => void>();
let isSyncingFromCloud = false;

function serializeBrandConfig(s: BrandStore): BrandLogoConfig {
  return {
    mode: s.mode,
    sizePreset: s.sizePreset,
    scalePercent: s.scalePercent,
    iconSource: s.iconSource,
    iconSvgRaw: s.iconSvgRaw,
    iconDataUrl: s.iconDataUrl,
    iconHeightPx: s.iconHeightPx,
    textSource: s.textSource,
    textSvgRaw: s.textSvgRaw,
    textDataUrl: s.textDataUrl,
    textHeightPx: s.textHeightPx,
    fullLogoSvgRaw: s.fullLogoSvgRaw,
    fullLogoDataUrl: s.fullLogoDataUrl,
    fullLogoHeightPx: s.fullLogoHeightPx,
    gapPx: s.gapPx,
    darkIconSource: s.darkIconSource,
    darkIconSvgRaw: s.darkIconSvgRaw,
    darkIconDataUrl: s.darkIconDataUrl,
    darkIconHeightPx: s.darkIconHeightPx,
    darkTextSource: s.darkTextSource,
    darkTextSvgRaw: s.darkTextSvgRaw,
    darkTextDataUrl: s.darkTextDataUrl,
    darkTextHeightPx: s.darkTextHeightPx,
    darkFullLogoSvgRaw: s.darkFullLogoSvgRaw,
    darkFullLogoDataUrl: s.darkFullLogoDataUrl,
    darkFullLogoHeightPx: s.darkFullLogoHeightPx,
    darkGapPx: s.darkGapPx,
    darkScalePercent: s.darkScalePercent,
    darkSubtitleFontSizePx: s.darkSubtitleFontSizePx,
    autoAdaptDark: s.autoAdaptDark,
    subtitle: s.subtitle,
    showSubtitle: s.showSubtitle,
    subtitleFontSizePx: s.subtitleFontSizePx,
  };
}

function syncBrandSettingsToCloud(data: BrandLogoConfig) {
  if (typeof window === "undefined") return;
  cloudStore.mutate((draft) => {
    draft.brandIdentity = data;
    draft.company = {
      ...(draft.company || {}),
      logo_config: data,
      updatedAt: new Date().toISOString(),
    };
  });
}

function notify() {
  if (typeof window !== "undefined" && !isSyncingFromCloud) {
    try {
      const persistedData = serializeBrandConfig(state);
      syncBrandSettingsToCloud(persistedData);
    } catch {
      // ignore
    }
  }
  listeners.forEach((listener) => listener());
}

function updateState(partial: Partial<BrandStore>) {
  state = { ...state, ...partial };
  notify();
}

const initialConfig = loadInitialState();

if (typeof window !== "undefined") {
  cloudStore.subscribe(() => {
    const cloudDb = cloudStore.getState();
    const fromCloud = extractBrandConfig(cloudDb.brandIdentity || cloudDb.company?.logo_config);
    if (!fromCloud) return;
    const nextMerged = { ...DEFAULT_CONFIG, ...fromCloud };
    const currentSerialized = JSON.stringify(serializeBrandConfig(state));
    const nextSerialized = JSON.stringify(nextMerged);
    if (currentSerialized !== nextSerialized) {
      isSyncingFromCloud = true;
      state = { ...state, ...nextMerged };
      listeners.forEach((listener) => listener());
      isSyncingFromCloud = false;
    }
  });
}

state = {
  ...initialConfig,
  isModalOpen: false,

  openModal: () => {
    if (!LOGO_EDITOR_ENABLED) return;
    updateState({ isModalOpen: true });
  },
  closeModal: () => updateState({ isModalOpen: false }),

  setMode: (mode) => updateState({ mode }),

  // Modo Claro Sizing
  setSizePreset: (presetId) => {
    const found = BRAND_SIZE_PRESETS.find((p) => p.id === presetId);
    if (!found) return;
    updateState({
      sizePreset: presetId,
      scalePercent: found.scalePercent,
      iconHeightPx: found.iconHeight,
      textHeightPx: found.textHeight,
      subtitleFontSizePx: found.subFontSize,
      fullLogoHeightPx: found.fullLogoHeight,
    });
  },

  setScalePercent: (scalePercent) => {
    const clampedScale = Math.max(50, Math.min(220, scalePercent));
    const factor = clampedScale / 100;
    const baseIcon = 50;
    const baseText = 35;
    const baseSub = 10;
    const baseFull = 50;

    updateState({
      scalePercent: clampedScale,
      iconHeightPx: Math.round(baseIcon * factor),
      textHeightPx: Math.round(baseText * factor),
      subtitleFontSizePx: Math.max(7, Math.round(baseSub * factor)),
      fullLogoHeightPx: Math.round(baseFull * factor),
    });
  },

  setIconFile: (svgRaw, dataUrl, isSvg) =>
    updateState({
      iconSource: isSvg && svgRaw ? "custom_svg" : "custom_url",
      iconSvgRaw: svgRaw,
      iconDataUrl: dataUrl,
    }),

  setTextFile: (svgRaw, dataUrl, isSvg) =>
    updateState({
      textSource: isSvg && svgRaw ? "custom_svg" : "custom_url",
      textSvgRaw: svgRaw,
      textDataUrl: dataUrl,
    }),

  setFullLogoFile: (svgRaw, dataUrl) =>
    updateState({
      mode: "unified",
      fullLogoSvgRaw: svgRaw,
      fullLogoDataUrl: dataUrl,
    }),

  clearLightIcon: () =>
    updateState({
      iconSource: "builtin",
      iconSvgRaw: "",
      iconDataUrl: "",
    }),

  clearLightText: () =>
    updateState({
      textSource: "builtin",
      textSvgRaw: "",
      textDataUrl: "",
    }),

  clearLightFullLogo: () =>
    updateState({
      fullLogoSvgRaw: "",
      fullLogoDataUrl: "",
    }),

  setIconHeightPx: (height) => updateState({ iconHeightPx: Math.max(16, Math.min(160, height)) }),
  setTextHeightPx: (height) => updateState({ textHeightPx: Math.max(12, Math.min(140, height)) }),
  setFullLogoHeightPx: (height) => updateState({ fullLogoHeightPx: Math.max(16, Math.min(180, height)) }),
  setGapPx: (gapPx) => updateState({ gapPx: Math.max(0, Math.min(60, gapPx)) }),

  // Modo Escuro Actions
  setDarkIconFile: (svgRaw, dataUrl, isSvg) =>
    updateState({
      darkIconSource: isSvg && svgRaw ? "custom_svg" : "custom_url",
      darkIconSvgRaw: svgRaw,
      darkIconDataUrl: dataUrl,
    }),

  setDarkTextFile: (svgRaw, dataUrl, isSvg) =>
    updateState({
      darkTextSource: isSvg && svgRaw ? "custom_svg" : "custom_url",
      darkTextSvgRaw: svgRaw,
      darkTextDataUrl: dataUrl,
    }),

  setDarkFullLogoFile: (svgRaw, dataUrl) =>
    updateState({
      mode: "unified",
      darkFullLogoSvgRaw: svgRaw,
      darkFullLogoDataUrl: dataUrl,
    }),

  clearDarkIcon: () =>
    updateState({
      darkIconSource: "inherit",
      darkIconSvgRaw: "",
      darkIconDataUrl: "",
    }),

  clearDarkText: () =>
    updateState({
      darkTextSource: "inherit",
      darkTextSvgRaw: "",
      darkTextDataUrl: "",
    }),

  clearDarkFullLogo: () =>
    updateState({
      darkFullLogoSvgRaw: "",
      darkFullLogoDataUrl: "",
    }),

  setDarkIconHeightPx: (height) => updateState({ darkIconHeightPx: Math.max(16, Math.min(160, height)) }),
  setDarkTextHeightPx: (height) => updateState({ darkTextHeightPx: Math.max(12, Math.min(140, height)) }),
  setDarkFullLogoHeightPx: (height) => updateState({ darkFullLogoHeightPx: Math.max(16, Math.min(180, height)) }),
  setDarkGapPx: (gapPx) => updateState({ darkGapPx: Math.max(0, Math.min(60, gapPx)) }),
  setDarkScalePercent: (scalePercent) => {
    const clampedScale = Math.max(50, Math.min(220, scalePercent));
    const factor = clampedScale / 100;
    const baseIcon = 50;
    const baseText = 35;
    const baseSub = 10;
    const baseFull = 50;

    updateState({
      darkScalePercent: clampedScale,
      darkIconHeightPx: Math.round(baseIcon * factor),
      darkTextHeightPx: Math.round(baseText * factor),
      darkSubtitleFontSizePx: Math.max(7, Math.round(baseSub * factor)),
      darkFullLogoHeightPx: Math.round(baseFull * factor),
    });
  },
  setDarkSubtitleFontSizePx: (size) => updateState({ darkSubtitleFontSizePx: Math.max(7, Math.min(24, size)) }),

  copyLightSizesToDark: () =>
    updateState({
      darkIconHeightPx: state.iconHeightPx,
      darkTextHeightPx: state.textHeightPx,
      darkFullLogoHeightPx: state.fullLogoHeightPx,
      darkGapPx: state.gapPx,
      darkScalePercent: state.scalePercent,
      darkSubtitleFontSizePx: state.subtitleFontSizePx,
    }),

  copyDarkSizesToLight: () =>
    updateState({
      iconHeightPx: state.darkIconHeightPx,
      textHeightPx: state.darkTextHeightPx,
      fullLogoHeightPx: state.darkFullLogoHeightPx,
      gapPx: state.darkGapPx,
      scalePercent: state.darkScalePercent,
      subtitleFontSizePx: state.darkSubtitleFontSizePx,
    }),

  resetDarkModeToDefault: () =>
    updateState({
      darkIconSource: "inherit",
      darkIconSvgRaw: "",
      darkIconDataUrl: "",
      darkIconHeightPx: 50,
      darkTextSource: "inherit",
      darkTextSvgRaw: "",
      darkTextDataUrl: "",
      darkTextHeightPx: 35,
      darkFullLogoSvgRaw: "",
      darkFullLogoDataUrl: "",
      darkFullLogoHeightPx: 50,
      darkGapPx: 12,
      darkScalePercent: 100,
      darkSubtitleFontSizePx: 10,
    }),

  resetLightModeToDefault: () =>
    updateState({
      iconSource: "builtin",
      iconSvgRaw: "",
      iconDataUrl: "",
      iconHeightPx: 50,
      textSource: "builtin",
      textSvgRaw: "",
      textDataUrl: "",
      textHeightPx: 35,
      fullLogoSvgRaw: "",
      fullLogoDataUrl: "",
      fullLogoHeightPx: 50,
      gapPx: 12,
      scalePercent: 100,
      subtitleFontSizePx: 10,
    }),

  setAutoAdaptDark: (autoAdaptDark) => updateState({ autoAdaptDark }),
  setSubtitle: (subtitle) => updateState({ subtitle, showSubtitle: subtitle.trim().length > 0 }),
  setShowSubtitle: (showSubtitle) => updateState({ showSubtitle }),
  setSubtitleFontSizePx: (subtitleFontSizePx) =>
    updateState({ subtitleFontSizePx: Math.max(7, Math.min(24, subtitleFontSizePx)) }),
  deleteSubtitle: () => updateState({ subtitle: "", showSubtitle: false }),
  setOnlyImageMode: () => updateState({ mode: "icon_only", showSubtitle: false }),
  setLogoAndNameMode: () => updateState({ mode: "split", showSubtitle: false }),
  setFullMode: () => updateState({ mode: "split", showSubtitle: true }),

  resetToDefault: () => updateState({ ...DEFAULT_CONFIG }),
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return state;
}

export function useBrandStore(): BrandStore;
export function useBrandStore<T>(selector: (s: BrandStore) => T): T;
export function useBrandStore<T>(selector?: (s: BrandStore) => T): T | BrandStore {
  const current = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return selector ? selector(current) : current;
}

useBrandStore.getState = () => state;
useBrandStore.subscribe = subscribe;
