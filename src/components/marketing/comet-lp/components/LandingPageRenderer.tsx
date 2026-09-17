import React, { useState, useEffect, useMemo } from "react";
import {
  LandingPage,
  QuizOption,
  QuizQuestion,
  BentoItem,
  TestimonialItem,
  FaqItem,
  MetricItem,
  TextAlign,
  FontSize,
  CardRadius,
  CardPadding,
  ContainerWidth,
  HeroModel,
  ElementOffset,
  ButtonCustomStyle,
  DEFAULT_HEADER_NAV,
} from "../types/landingPage";
import { THEME_CONFIGS } from "../utils/theme";
import { DynamicIcon } from "./DynamicIcon";
import { InlineEditableText } from "./InlineEditableText";
import { DraggableElement, EditorContext } from "./DraggableElement";
import { VisualEditableButton } from "./VisualEditableButton";
import { formatBrazilianPhone, extractUrlUtms } from "../utils/formUtils";
import { POPULAR_LOGO_PRESETS } from "./LogoManagerModal";
import { SectionControlToolbar } from "./SectionControlToolbar";
import { HeroModelSelector, HERO_MODELS } from "./HeroModelSelector";
import { HeroMediaCard } from "./HeroMediaCard";
import { DraggableFloatingCard } from "./DraggableFloatingCard";
import { HeaderNavbar } from "./HeaderNavbar";
import { TypewriterHeadline } from "./TypewriterHeadline";
import { PhotoGridSectionRenderer } from "./PhotoGridSectionRenderer";
import { createDefaultPhotoGridSection } from "../data/defaultPhotoGrid";
import { InteractiveFloatingImage } from "./InteractiveFloatingImage";
import { FloatingTalkWhatsAppWidget } from "./FloatingTalkWhatsAppWidget";
import { LeadFormFieldsModal, DEFAULT_LEAD_FIELDS } from "./LeadFormFieldsModal";
import confetti from "canvas-confetti";
import {
  CheckCircle2,
  ShieldCheck,
  Star,
  Play,
  Volume2,
  ArrowRight,
  Sparkles,
  Lock,
  Clock,
  Send,
  Zap,
  Check,
  ChevronDown,
  Building,
  Flame,
  Camera,
  Plus,
  Trash2,
  Copy,
  Palette,
  MessageSquare,
  MoveLeft,
  MoveRight,
  ArrowUp,
  ArrowDown,
  GripVertical,
  Sliders,
  HelpCircle,
  TrendingUp,
  Layout,
  Video,
  Smartphone,
  Briefcase,
  BookOpen,
  PhoneCall,
  Download,
  Users,
  Target,
  Award,
  Calendar,
  ClipboardList,
  Gift,
  Maximize2,
  X,
  FileSpreadsheet,
  FileText,
  FileBox,
} from "lucide-react";
import { DeepFindSurveyViewer } from "@/components/marketing/deepfind-survey-viewer";
import { submitLpLeadToDrive } from "@/services/googleDriveDatabaseService";

interface LandingPageRendererProps {
  page: LandingPage;
  isEditorPreview?: boolean;
  hideEditToolbars?: boolean;
  showSectionToolbars?: boolean;
  deviceView?: "desktop" | "tablet" | "mobile";
  onUpdatePage?: (updater: (prev: LandingPage) => LandingPage) => void;
  onEditField?: (section: string, field: string, value: any) => void;
  selectedField?: string | null;
  activeSection?: string;
  onSelectSection?: (sectionId: string) => void;
  onOpenImagePicker?: (target: {
    type: "hero" | "bento" | "testimonial" | "avatar";
    currentUrl: string;
    itemId?: string;
    title: string;
  }) => void;
  onOpenLogoManager?: () => void;
  onOpenIconPicker?: (target: {
    currentIcon: string;
    onSelect: (icon: string) => void;
    title: string;
  }) => void;
  onLeadSubmit?: (lead: any) => void;
  assignedSurvey?: any;
  onOpenVisualModal?: (elementId: string) => void;
  selectedFloatingImageId?: string | null;
  onSelectFloatingImage?: (id: string | null) => void;
}

// Helpers for dynamic styling classes
export const getAlignClass = (align?: TextAlign) => {
  switch (align) {
    case "left":
      return "text-left items-start justify-start";
    case "right":
      return "text-right items-end justify-end";
    case "justify":
      return "text-justify items-start";
    case "center":
    default:
      return "text-center items-center justify-center";
  }
};

export const getHeadingAlignClass = (align?: TextAlign) => {
  switch (align) {
    case "left":
      return "text-left items-start flex flex-col justify-start mr-auto w-full";
    case "right":
      return "text-right items-end flex flex-col justify-end ml-auto w-full";
    case "justify":
      return "text-justify items-stretch flex flex-col mx-auto w-full";
    case "center":
    default:
      return "text-center items-center flex flex-col justify-center mx-auto w-full";
  }
};

export const getTextWidthClass = (width?: "narrow" | "normal" | "wide" | "full" | ContainerWidth) => {
  switch (width) {
    case "narrow":
      return "max-w-xl w-full";
    case "wide":
      return "max-w-5xl w-full";
    case "full":
      return "w-full max-w-full";
    case "normal":
    default:
      return "max-w-3xl w-full";
  }
};

export const getHeadlineSizeClass = (size?: FontSize) => {
  switch (size) {
    case "4xs":
      return "text-xs sm:text-xs md:text-sm"; // ~8-12px
    case "3xs":
      return "text-xs sm:text-sm md:text-base"; // ~10-14px
    case "2xs":
      return "text-sm sm:text-base md:text-lg"; // ~12-16px
    case "xs":
      return "text-base sm:text-lg md:text-xl"; // ~14-18px
    case "sm":
      return "text-lg sm:text-xl md:text-2xl"; // ~18-22px
    case "base":
    case "md":
      return "text-xl sm:text-2xl md:text-3xl"; // ~20-28px
    case "lg":
      return "text-2xl sm:text-3xl md:text-4xl"; // ~24-36px
    case "xl":
      return "text-3xl sm:text-4xl md:text-5xl"; // ~30-48px
    case "2xl":
      return "text-4xl sm:text-5xl md:text-6xl"; // ~36-60px
    case "3xl":
      return "text-5xl sm:text-6xl md:text-7xl"; // ~48-72px
    case "4xl":
      return "text-6xl sm:text-7xl md:text-8xl"; // ~60-84px
    case "5xl":
      return "text-7xl sm:text-8xl md:text-9xl"; // ~72-96px
    default:
      return "text-2xl sm:text-3xl md:text-4xl";
  }
};

export const getSubheadlineSizeClass = (size?: FontSize) => {
  switch (size) {
    case "4xs":
      return "text-[10px] sm:text-[10px]";
    case "3xs":
      return "text-[11px] sm:text-xs";
    case "2xs":
      return "text-xs sm:text-xs";
    case "xs":
      return "text-xs sm:text-sm";
    case "sm":
      return "text-sm sm:text-base";
    case "base":
    case "md":
      return "text-base sm:text-lg";
    case "lg":
      return "text-lg sm:text-xl";
    case "xl":
      return "text-xl sm:text-2xl";
    case "2xl":
    case "3xl":
    case "4xl":
    case "5xl":
      return "text-2xl sm:text-3xl";
    default:
      return "text-sm sm:text-base";
  }
};

export const FONT_SIZE_STEPS: FontSize[] = [
  "4xs",
  "3xs",
  "2xs",
  "xs",
  "sm",
  "base",
  "lg",
  "xl",
  "2xl",
  "3xl",
  "4xl",
  "5xl",
];

export const getNextFontSize = (
  current: FontSize = "base",
  direction: "up" | "down"
): FontSize => {
  const idx = FONT_SIZE_STEPS.indexOf(current);
  if (idx === -1) return direction === "up" ? "lg" : "sm";
  const newIdx =
    direction === "up"
      ? Math.min(FONT_SIZE_STEPS.length - 1, idx + 1)
      : Math.max(0, idx - 1);
  return FONT_SIZE_STEPS[newIdx];
};

export const getRadiusClass = (radius?: CardRadius) => {
  switch (radius) {
    case "none":
      return "rounded-none";
    case "sm":
      return "rounded-lg";
    case "md":
      return "rounded-xl";
    case "lg":
      return "rounded-2xl";
    case "2xl":
      return "rounded-[2rem]";
    case "3xl":
      return "rounded-[2.5rem]";
    case "full":
      return "rounded-full";
    case "xl":
    default:
      return "rounded-3xl";
  }
};

export const getPaddingClass = (padding?: CardPadding) => {
  switch (padding) {
    case "compact":
      return "p-4 sm:p-5";
    case "spacious":
      return "p-8 sm:p-12";
    case "normal":
    default:
      return "p-6 sm:p-8";
  }
};

export const getContainerWidthClass = (width?: ContainerWidth) => {
  switch (width) {
    case "narrow":
      return "max-w-4xl";
    case "wide":
      return "max-w-7xl";
    case "full":
      return "max-w-full px-4 sm:px-10";
    case "normal":
    default:
      return "max-w-6xl";
  }
};

export const getThemeCardBgClass = (color: string, theme: string) => {
  if (theme !== "light") return "bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-md hover:border-zinc-700/80";
  switch (color) {
    case "purple": return "bg-white border border-purple-200/90 shadow-md shadow-purple-950/5 hover:border-purple-400 text-zinc-900";
    case "emerald": return "bg-white border border-emerald-200/90 shadow-md shadow-emerald-950/5 hover:border-emerald-400 text-zinc-900";
    case "cyan": return "bg-white border border-cyan-200/90 shadow-md shadow-cyan-950/5 hover:border-cyan-400 text-zinc-900";
    case "amber": return "bg-white border border-amber-200/90 shadow-md shadow-amber-950/5 hover:border-amber-400 text-zinc-900";
    case "rose": return "bg-white border border-rose-200/90 shadow-md shadow-rose-950/5 hover:border-rose-400 text-zinc-900";
    case "orange": return "bg-white border border-orange-200/90 shadow-md shadow-orange-950/5 hover:border-orange-400 text-zinc-900";
    case "blue": return "bg-white border border-blue-200/90 shadow-md shadow-blue-950/5 hover:border-blue-400 text-zinc-900";
    case "indigo": return "bg-white border border-indigo-200/90 shadow-md shadow-indigo-950/5 hover:border-indigo-400 text-zinc-900";
    case "red": return "bg-white border border-red-200/90 shadow-md shadow-red-950/5 hover:border-red-400 text-zinc-900";
    case "teal": return "bg-white border border-teal-200/90 shadow-md shadow-teal-950/5 hover:border-teal-400 text-zinc-900";
    case "gray": return "bg-white border border-zinc-200/90 shadow-md shadow-zinc-950/5 hover:border-zinc-400 text-zinc-900";
    default: return "bg-white border border-zinc-200/90 shadow-md text-zinc-900";
  }
};

export const getBentoSizeClasses = (
  size?: "large" | "tall" | "wide" | "standard",
  isMobileView?: boolean,
  isTabletView?: boolean
) => {
  if (isMobileView) {
    return "col-span-1 row-span-1 w-full min-w-0";
  }
  if (isTabletView) {
    switch (size) {
      case "wide":
      case "large":
        return "col-span-1 sm:col-span-2 row-span-1 w-full min-w-0";
      default:
        return "col-span-1 row-span-1 w-full min-w-0";
    }
  }
  switch (size) {
    case "wide":
      return "col-span-1 md:col-span-2 row-span-1 w-full min-w-0";
    case "tall":
      return "col-span-1 row-span-1 md:row-span-2 w-full min-w-0";
    case "large":
      return "col-span-1 md:col-span-2 md:row-span-2 w-full min-w-0";
    case "standard":
    default:
      return "col-span-1 row-span-1 w-full min-w-0";
  }
};

export const CARD_PRESET_GRADIENTS = [
  { id: "default", label: "Padrão Tema", gradient: "", colorHex: "#27272a" },
  { id: "orange", label: "Laranja Degradê (Sunset)", gradient: "bg-gradient-to-br from-orange-950/90 via-amber-950/70 to-zinc-950 border-orange-500/70 text-orange-200 shadow-orange-500/20", colorHex: "#ea580c" },
  { id: "purple", label: "Roxo Cyber", gradient: "bg-gradient-to-br from-purple-950/90 via-fuchsia-950/70 to-zinc-950 border-purple-500/70 text-purple-200 shadow-purple-500/20", colorHex: "#a855f7" },
  { id: "emerald", label: "Verde Esmeralda", gradient: "bg-gradient-to-br from-emerald-950/90 via-teal-950/70 to-zinc-950 border-emerald-500/70 text-emerald-200 shadow-emerald-500/20", colorHex: "#10b981" },
  { id: "cyan", label: "Azul Elétrico", gradient: "bg-gradient-to-br from-cyan-950/90 via-blue-950/70 to-zinc-950 border-cyan-500/70 text-cyan-200 shadow-cyan-500/20", colorHex: "#06b6d4" },
  { id: "rose", label: "Vermelho Fogo", gradient: "bg-gradient-to-br from-rose-950/90 via-red-950/70 to-zinc-950 border-rose-500/70 text-rose-200 shadow-rose-500/20", colorHex: "#f43f5e" },
  { id: "gold", label: "Dourado Premium", gradient: "bg-gradient-to-br from-amber-950/90 via-yellow-950/70 to-zinc-950 border-amber-500/70 text-amber-200 shadow-amber-500/20", colorHex: "#eab308" },
  { id: "dark", label: "Midnight Dark", gradient: "bg-zinc-950 border-zinc-800 text-white shadow-xl", colorHex: "#09090b" },
];

interface HeroHeadlineBlockProps {
  page: LandingPageData;
  updateP: React.Dispatch<React.SetStateAction<LandingPageData>>;
  theme: any;
  headlineAlign?: TextAlign;
  isEditorPreview: boolean;
  defaultColorClass?: string;
  className?: string;
}

export const HeroHeadlineBlock: React.FC<HeroHeadlineBlockProps> = ({
  page,
  updateP,
  theme,
  headlineAlign,
  isEditorPreview,
  defaultColorClass,
  className = "",
}) => {
  const resolvedAlign = headlineAlign || page.hero.headlineAlign || page.hero.align || "left";
  const mode = page.hero.headlineColor || "default";

  let colorClass = "";
  let explicitColorHex: string | undefined = undefined;

  if (mode === "black") {
    colorClass = "text-black";
    explicitColorHex = "#000000";
  } else if (mode === "graphite") {
    colorClass = "text-zinc-800";
    explicitColorHex = "#27272a";
  } else if (mode === "gray") {
    colorClass = "text-zinc-500";
    explicitColorHex = "#64748b";
  } else if (mode === "white") {
    colorClass = "text-white";
    explicitColorHex = "#ffffff";
  } else if (mode === "primary" || mode === "emerald" || mode === "system") {
    explicitColorHex = page.hero.headlineCustomHex || page.customAccentHex || theme.primaryHex || "#10b981";
  } else if (mode === "custom" && page.hero.headlineCustomHex) {
    explicitColorHex = page.hero.headlineCustomHex;
  } else if (typeof mode === "string" && mode.startsWith("#")) {
    explicitColorHex = mode;
  } else {
    colorClass = defaultColorClass || (page.theme === "light" ? "text-zinc-900" : "text-white");
  }

  const containerStyle: React.CSSProperties = {
    fontSize: page.hero.headlineFontSizePx ? `${page.hero.headlineFontSizePx}px` : undefined,
    lineHeight: page.hero.headlineFontSizePx && page.hero.headlineFontSizePx < 28 ? "1.25" : undefined,
    color: explicitColorHex,
  };

  return (
    <div
      className={`font-bold ${getHeadlineSizeClass(
        page.hero.headlineSize
      )} ${getTextWidthClass(page.hero.headlineWidth || "full")} ${getHeadingAlignClass(resolvedAlign)} leading-[1.12] tracking-tight ${colorClass} ${className}`}
      style={containerStyle}
    >
      {page.hero.typewriterEnabled ? (
        <TypewriterHeadline
          prefix={page.hero.typewriterPrefix || ""}
          words={page.hero.typewriterWords && page.hero.typewriterWords.length > 0 ? page.hero.typewriterWords : ["Curso", "Carreira", "Vida", "Profissão", "Competência"]}
          suffix={page.hero.typewriterSuffix || ""}
          showCursor={page.hero.typewriterShowCursor !== false}
          speedMs={page.hero.typewriterSpeedMs || 90}
          deleteSpeedMs={page.hero.typewriterDeleteSpeedMs || 45}
          delayMs={page.hero.typewriterDelayMs || 1800}
          accentClass={page.theme === "light" ? "" : (theme.gradientText ? `bg-gradient-to-r ${theme.gradientText} bg-clip-text text-transparent` : theme.iconText)}
          accentHex={explicitColorHex || page.customAccentHex || theme.primaryHex || "#10b981"}
          cursorColorHex={explicitColorHex || page.customAccentHex || theme.primaryHex || "#10b981"}
          isEditorPreview={isEditorPreview}
          className="font-bold tracking-tight"
        />
      ) : (
        <InlineEditableText
          value={page.hero.headline}
          onChange={(newVal) =>
            updateP((p) => ({ ...p, hero: { ...p.hero, headline: newVal } }))
          }
          align={headlineAlign}
          onAlignChange={(newAlign) =>
            updateP((p) => ({
              ...p,
              hero: { ...p.hero, headlineAlign: newAlign },
            }))
          }
          fontSize={page.hero.headlineSize || "base"}
          onFontSizeChange={(newSize) =>
            updateP((p) => ({
              ...p,
              hero: { ...p.hero, headlineSize: newSize },
            }))
          }
          fontSizePx={page.hero.headlineFontSizePx}
          onFontSizePxChange={(newPx) =>
            updateP((p) => ({
              ...p,
              hero: { ...p.hero, headlineFontSizePx: newPx },
            }))
          }
          onIncreaseFontSize={() =>
            updateP((p) => ({
              ...p,
              hero: {
                ...p.hero,
                headlineFontSizePx: (p.hero.headlineFontSizePx || 48) + 2,
              },
            }))
          }
          onDecreaseFontSize={() =>
            updateP((p) => ({
              ...p,
              hero: {
                ...p.hero,
                headlineFontSizePx: Math.max(
                  12,
                  (p.hero.headlineFontSizePx || 48) - 2
                ),
              },
            }))
          }
          isEditorPreview={isEditorPreview}
          tag="h1"
          style={{ color: explicitColorHex }}
          className="w-full"
          placeholder="Digite sua headline de alto impacto aqui..."
          fieldLabel="Headline Hero"
          nicheContext={page.niche}
        />
      )}
    </div>
  );
};

export const LandingPageRenderer: React.FC<LandingPageRendererProps> = ({
  page,
  isEditorPreview = false,
  hideEditToolbars = false,
  showSectionToolbars = true,
  deviceView = "desktop",
  onUpdatePage,
  activeSection,
  onSelectSection,
  onOpenHeroModelSelector,
  onOpenImagePicker,
  onOpenLogoManager,
  onOpenIconPicker,
  onLeadSubmit,
  assignedSurvey,
  onOpenVisualModal,
  selectedFloatingImageId,
  onSelectFloatingImage,
}) => {
  const showSectionTools = isEditorPreview && showSectionToolbars;
  const isMobile = deviceView === "mobile";
  const isTablet = deviceView === "tablet";
  const theme = THEME_CONFIGS[page.accentColor] || THEME_CONFIGS.purple;

  // Pinned active element selection & draggable floating editor card
  const [pinnedCardId, setPinnedCardId] = useState<string | null>(null);
  const [isSurveyModalOpen, setIsSurveyModalOpen] = useState(false);
  const [isSurveyLeadFormOpen, setIsSurveyLeadFormOpen] = useState(false);
  const [surveyLeadData, setSurveyLeadData] = useState<{
    name: string;
    email: string;
    whatsapp: string;
    company?: string;
  } | null>(null);

  const [leadCaptureFormInput, setLeadCaptureFormInput] = useState({
    name: "",
    email: "",
    whatsapp: "",
    company: "",
  });

  const openSurveyFlow = () => {
    // O formulário da LP é o processo principal de cadastro do lead
    if (!leadName && !leadPhone) {
      setIsLeadModalOpen(true);
    } else {
      setIsSurveyModalOpen(true);
    }
  };

  const handleConfirmSurveyLead = (e: React.FormEvent) => {
    e.preventDefault();
    const name = leadCaptureFormInput.name.trim();
    const email = leadCaptureFormInput.email.trim();
    const whatsapp = leadCaptureFormInput.whatsapp.trim();

    if (!name || !whatsapp) {
      toast.error("Por favor, preencha seu Nome e WhatsApp para continuar.");
      return;
    }

    // Email validation
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        toast.error("Por favor, insira um endereço de e-mail válido.");
        return;
      }
    }

    // Phone validation (xx) xxxxx-xxxx (10 or 11 digits)
    const cleanPhone = whatsapp.replace(/\D/g, "");
    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      toast.error("Por favor, insira um número de WhatsApp válido com DDD: (xx) xxxxx-xxxx");
      return;
    }

    const payload = {
      name,
      email,
      whatsapp,
      company: leadCaptureFormInput.company.trim(),
      source: "Survey Direct Lead Form",
      quizAnswers: {},
    };

    if (onLeadSubmit) {
      try {
        onLeadSubmit(payload);
      } catch (err) {
        console.warn("Erro ao registrar lead pré-pesquisa:", err);
      }
    }

    setSurveyLeadData({
      name,
      email,
      whatsapp,
      company: leadCaptureFormInput.company.trim(),
    });

    setLeadName(name);
    setLeadEmail(email);
    setLeadPhone(whatsapp);

    setIsSurveyLeadFormOpen(false);

    // Se houver pesquisa vinculada E for uma pesquisa ativa cadastrada (purpose === min ou diferente do padrão fictício), inicia pesquisa
    const hasRealSurvey = assignedSurvey && (assignedSurvey.id !== "default-survey-hero" || lp?.surveyId);
    if (hasRealSurvey) {
      setIsSurveyModalOpen(true);
      toast.success("✅ Cadastro confirmado! Iniciando pesquisa...");
    } else {
      setIsSubmitted(true);
      toast.success("✅ Cadastro concluído com sucesso!");
    }
  };
  const [floatingCardConfig, setFloatingCardConfig] = useState<{
    type: "bento" | "testimonial" | "quiz" | "metric" | "faq" | "hero_media";
    id: string;
    title: string;
    index: number;
  } | null>(null);

  // Deselect card when clicking outside cards or floating panel
  useEffect(() => {
    if (!pinnedCardId && !floatingCardConfig) return;

    const handleWindowClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Keep selection if clicking inside a floating card, modal, or any selectable card
      if (
        target.closest("[data-floating-card]") ||
        target.closest("[data-modal]") ||
        target.closest(".group\\/bento") ||
        target.closest(".group\\/test")
      ) {
        return;
      }

      setPinnedCardId(null);
      setFloatingCardConfig(null);
    };

    const timer = setTimeout(() => {
      window.addEventListener("click", handleWindowClick);
    }, 50);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("click", handleWindowClick);
    };
  }, [pinnedCardId, floatingCardConfig]);

  // Safe page updater helper
  const updateP = (fn: (prev: LandingPage) => LandingPage) => {
    if (onUpdatePage) {
      onUpdatePage(fn);
    }
  };

  // Drag & Move element offset helpers
  const getElementOffset = (id: string): ElementOffset => {
    return page.elementOffsets?.[id] || { x: 0, y: 0 };
  };

  const setElementOffset = (id: string, offset: ElementOffset) => {
    updateP((p) => ({
      ...p,
      elementOffsets: {
        ...(p.elementOffsets || {}),
        [id]: offset,
      },
    }));
  };

  const setElementCustomStyle = (id: string, style: CustomElementStyleRecord) => {
    updateP((p) => ({
      ...p,
      customElementStyles: {
        ...(p.customElementStyles || {}),
        [id]: style,
      },
    }));
  };

  const getDraggableProps = (id: string) => {
    const customStyle = page.customElementStyles?.[id];
    return {
      elementId: id,
      offset: getElementOffset(id),
      onOffsetChange: (o: ElementOffset) => setElementOffset(id, o),
      customStyle,
      onCustomStyleChange: (s: CustomElementStyleRecord) => setElementCustomStyle(id, s),
      customWidthPx: customStyle?.transform?.customWidthPx,
      onChangeCustomWidthPx: (w?: number) =>
        setElementCustomStyle(id, {
          ...(page.customElementStyles?.[id] || { id }),
          transform: {
            ...(page.customElementStyles?.[id]?.transform || {}),
            customWidthPx: w,
          },
        }),
      customHeightPx: customStyle?.transform?.customHeightPx,
      onChangeCustomHeightPx: (h?: number) =>
        setElementCustomStyle(id, {
          ...(page.customElementStyles?.[id] || { id }),
          transform: {
            ...(page.customElementStyles?.[id]?.transform || {}),
            customHeightPx: h,
          },
        }),
    };
  };

  // Button style helpers
  const getButtonStyle = (buttonId: string, fallback?: ButtonCustomStyle): ButtonCustomStyle => {
    return page.customButtonStyles?.[buttonId] || fallback || {};
  };

  const setButtonStyle = (buttonId: string, style: ButtonCustomStyle) => {
    updateP((p) => ({
      ...p,
      customButtonStyles: {
        ...(p.customButtonStyles || {}),
        [buttonId]: style,
      },
    }));
  };

  // Section order array fallback
  const sectionOrder = page.sectionOrder || [
    "hero",
    "socialProof",
    "quiz",
    "bentoGrid",
    "testimonials",
    "formSection",
    "faq",
  ];

  // Helper to reorder sections
  const handleMoveSection = (secName: string, direction: "up" | "down") => {
    const idx = sectionOrder.indexOf(secName);
    if (idx === -1) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= sectionOrder.length) return;

    const newOrder = [...sectionOrder];
    const [moved] = newOrder.splice(idx, 1);
    newOrder.splice(targetIdx, 0, moved);

    updateP((p) => ({ ...p, sectionOrder: newOrder }));
  };

  // Quiz interactive state
  const [currentQuizStep, setCurrentQuizStep] = useState(0);
  const [selectedQuizAnswers, setSelectedQuizAnswers] = useState<Record<string, QuizOption>>({});
  const [quizCompleted, setQuizCompleted] = useState(false);

  // Form submission state
  const [leadName, setLeadName] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [customFormAnswers, setCustomFormAnswers] = useState<Record<string, string>>({});
  const [isLeadFormFieldsModalOpen, setIsLeadFormFieldsModalOpen] = useState(false);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Campos limpos padrão: apenas Nome, WhatsApp e E-mail (removido faturamento conforme solicitado pelo usuário)
  const cleanFormFields = useMemo(() => {
    const rawFields =
      page.formSection.fields && page.formSection.fields.length > 0
        ? page.formSection.fields
        : DEFAULT_LEAD_FIELDS;
    return rawFields.filter(
      (f) => f.id !== "revenue" && !f.label.toLowerCase().includes("faturamento")
    );
  }, [page.formSection.fields]);

  // Video modal / active player
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isHeroModelModalOpen, setIsHeroModelModalOpen] = useState(false);

  // FAQ open toggles
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Slideshow state for Model 10 (fullscreen_slideshow)
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isSlideshowPlaying, setIsSlideshowPlaying] = useState(true);

  const slideshowImages = (page.hero?.slideshowImages && page.hero.slideshowImages.length > 0)
    ? page.hero.slideshowImages
    : [
        "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80",
        "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1600&q=80",
        "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=80",
      ];

  const slideIntervalSec = page.hero?.slideshowIntervalSeconds || 3;

  useEffect(() => {
    if (!isSlideshowPlaying || page.hero?.model !== "fullscreen_slideshow") return;
    const interval = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % slideshowImages.length);
    }, Math.max(1, slideIntervalSec) * 1000);
    return () => clearInterval(interval);
  }, [isSlideshowPlaying, slideshowImages.length, slideIntervalSec, page.hero?.model]);

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState({
    minutes: page.hero?.countdownMinutes || 14,
    seconds: 59,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { minutes: prev.minutes - 1, seconds: 59 };
        }
        return { minutes: 14, seconds: 59 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleQuizOptionSelect = (questionId: string, option: QuizOption, stepIndex: number) => {
    if (isEditorPreview) return;

    const updated = { ...selectedQuizAnswers, [questionId]: option };
    setSelectedQuizAnswers(updated);

    if (stepIndex < (page.quiz?.questions?.length || 0) - 1) {
      setTimeout(() => {
        setCurrentQuizStep(stepIndex + 1);
      }, 250);
    } else {
      setTimeout(() => {
        setQuizCompleted(true);
        try {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.7 },
          });
        } catch {}
      }, 250);
    }
  };

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const enabledFields = cleanFormFields.filter((f) => f.enabled !== false);

    // Validate required fields
    for (const f of enabledFields) {
      if (!f.required) continue;
      let val = "";
      if (f.id === "name") val = leadName;
      else if (f.id === "phone") val = leadPhone;
      else if (f.id === "email") val = leadEmail;
      else val = customFormAnswers[f.id] || "";

      if (!val || val.trim().length === 0) {
        setSubmitError(`Por favor, preencha o campo obrigatório "${f.label}".`);
        return;
      }
    }

    setIsSubmitting(true);
    setSubmitError("");

    const quizSummary: Record<string, string> = {};
    (Object.entries(selectedQuizAnswers) as [string, QuizOption][]).forEach(([qId, opt]) => {
      quizSummary[qId] = opt?.label || "";
    });

    const utms = extractUrlUtms();

    // Map custom qualification responses
    const qualificationAnswers: Record<string, string> = {};
    enabledFields.forEach((f) => {
      if (f.id !== "name" && f.id !== "phone" && f.id !== "email") {
        qualificationAnswers[f.label || f.id] = customFormAnswers[f.id] || "";
      }
    });

    const isTest = (page as any).status === "Teste";

    const payload = {
      pageId: page.id,
      pageTitle: page.title,
      name: leadName,
      whatsapp: leadPhone,
      email: leadEmail,
      qualificationAnswers,
      customFields: customFormAnswers,
      quizAnswers: quizSummary,
      utms,
      isTest,
      submittedAt: new Date().toISOString(),
      webhookStatus: "pending",
    };

    try {
      if (page.webhookUrl) {
        fetch(page.webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          mode: "no-cors",
        }).catch(() => {});
        payload.webhookStatus = "sent";
      }

      // 1. Notifica callback da página se disponível, ou executa submissão direta
      if (onLeadSubmit) {
        try {
          onLeadSubmit(payload);
        } catch (e) {
          console.warn("onLeadSubmit callback notice:", e);
        }
      } else {
        // Submissão direta se a página for renderizada isoladamente
        try {
          fetch("/api/submit-lead", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }).catch(() => {});
        } catch (apiErr) {
          console.warn("Direct database API lead save notice:", apiErr);
        }

        // Persistência local imediata e sincronização com a base do CRM (Vercel SPA & Local)
        if (typeof window !== "undefined") {
          try {
            const effectiveSource = utms?.utm_source || utms?.src || "Landing Page Form";
            const newLeadObj = {
              id: `lead_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              name: leadName || "Lead Capturado",
              company: `${leadName || "Lead"} (LP: ${page.title || page.id || "Landing Page"})`,
              email: leadEmail || "",
              whatsapp: leadPhone || "",
              value: 0,
              stage: "Leads",
              owner: "Inbound LP",
              source: `LP: ${page.title || page.id || "Landing Page"} [${effectiveSource}]`,
              classification: isTest ? "Lead Teste" : "Lead",
              temperature: "Quente",
              type: "Inbound",
              strategy: "CRO Auto",
              decisionRole: "Decisor",
              minScore: "Aprovado",
              landingPage: page.title || page.id,
              tags: [effectiveSource, utms?.utm_campaign || "inbound", "comet-lp", isTest ? "leadtest" : ""].filter(Boolean),
              score: 85,
              sla: "ok",
              lastInteraction: "Formulário enviado na LP",
              createdAt: new Date().toISOString(),
              activities: [
                {
                  id: `act_${Date.now()}`,
                  type: "conversion",
                  description: `Capturado via formulário na LP ${page.title || page.id}`,
                  timestamp: new Date().toISOString(),
                }
              ],
              completedCheckpoints: [],
              status: "Ativo",
              personType: "PJ",
              role: "",
              revenue: "",
              capag: "",
              lpVisits: 1,
              isCustomer: false,
              isRecurring: false,
              metadata: payload,
            };

            const rawLoc = localStorage.getItem("comet_local_leads");
            const curLoc = rawLoc ? JSON.parse(rawLoc) : [];
            localStorage.setItem("comet_local_leads", JSON.stringify([newLeadObj, ...curLoc.filter((x: any) => x.id !== newLeadObj.id)]));

            const rawQueue = localStorage.getItem("comet_inbound_leads_queue");
            const curQueue = rawQueue ? JSON.parse(rawQueue) : [];
            localStorage.setItem("comet_inbound_leads_queue", JSON.stringify([newLeadObj, ...curQueue]));

            window.dispatchEvent(new CustomEvent("lead-submitted", { detail: newLeadObj }));
            window.dispatchEvent(new StorageEvent("storage", { key: "comet_local_leads" }));
          } catch (stErr) {
            console.warn("Storage persistence notice:", stErr);
          }
        }

        // Sincronização em background com o Google Drive (não-bloqueante)
        submitLpLeadToDrive({
          id: `lead_${Date.now()}`,
          name: leadName,
          whatsapp: leadPhone,
          email: leadEmail,
          pageId: page.id,
          pageTitle: page.title,
          landingPageId: page.id,
          landingPageTitle: page.title,
          quizAnswers: quizSummary,
          utms,
          source: utms?.utm_source || "Landing Page Form",
          submittedAt: new Date().toISOString(),
          isTest,
        }).catch(() => {});
      }

      // Configura dados do lead para qualquer pesquisa ou brinde posterior
      setSurveyLeadData({
        name: leadName,
        email: leadEmail,
        whatsapp: leadPhone,
      });

      // Fecha modal de formulário se estava aberto
      setIsLeadModalOpen(false);

      // FLUXO UNIFICADO:
      // Se tiver pesquisa vinculada -> abre pesquisa (DeepFind)
      // Se não tiver pesquisa mas tiver brinde -> abre modal de brinde
      // Se nenhum -> exibe tela de sucesso padrão
      if (assignedSurvey) {
        setIsSurveyModalOpen(true);
      } else if (page.formSection?.gift?.enabled) {
        setIsGiftModalOpen(true);
        setIsSubmitted(true);
      } else {
        setIsSubmitted(true);
      }

      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
        });
      } catch {}
    } catch (err: any) {
      console.error("Submission failed:", err);
      // Tentativa de gravação direta de emergência no banco de dados (sem localStorage)
      try {
        await fetch("/api/submit-lead", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch {}
      setIsSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const scrollToSection = (id: string) => {
    // Se o formulário estiver em modo modal/flutuante e o destino for o formulário ou quiz, abre o card flutuante
    if (
      page.formSection?.displayMode === "modal" &&
      (id === "form-section" || id === "quiz-section")
    ) {
      setIsLeadModalOpen(true);
      return;
    }

    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const visibility = page.visibility || {
    hero: true,
    socialProof: true,
    quiz: true,
    bentoGrid: true,
    testimonials: true,
    formSection: true,
    faq: true,
    stickyMobileCta: true,
  };

  // Render floating images anchored directly to a specific section
  const renderSectionFloatingImages = (secId: string) => {
    if (!page.floatingImages || page.floatingImages.length === 0) return null;

    const activeSections = sectionOrder.filter((s) => visibility[s as keyof typeof visibility] !== false);
    const firstActiveSection = activeSections[0] || "hero";

    const sectionImages = page.floatingImages.filter((img) => {
      const rawTarget = img.targetSectionId || "hero";
      if (rawTarget === secId) return true;
      // If target section is disabled or nonexistent, attach to the first active section so images are never lost
      if (!activeSections.includes(rawTarget as any) && secId === firstActiveSection) {
        return true;
      }
      return false;
    });

    if (sectionImages.length === 0) return null;

    return (
      <div className="pointer-events-none absolute inset-0 overflow-visible z-20">
        {sectionImages.map((img) => {
          const isSelected = selectedFloatingImageId === img.id;
          const effectiveZIndex = isSelected ? 55 : (img.zIndex ?? 20);
          return (
            <div key={img.id} className="pointer-events-auto" style={{ zIndex: effectiveZIndex }}>
              <InteractiveFloatingImage
                image={img}
                element={img}
                isEditorPreview={isEditorPreview}
                isSelected={isSelected}
                deviceView={deviceView}
                onSelect={() => onSelectFloatingImage?.(img.id)}
                onDeselect={() => onSelectFloatingImage?.(null)}
                onUpdateImage={(updated) => {
                  updateP((prev) => ({
                    ...prev,
                    floatingImages: (prev.floatingImages || []).map((item) =>
                      item.id === img.id ? { ...item, ...updated } : item
                    ),
                  }));
                }}
                onUpdate={(updated) => {
                  updateP((prev) => ({
                    ...prev,
                    floatingImages: (prev.floatingImages || []).map((item) =>
                      item.id === img.id ? { ...item, ...updated } : item
                    ),
                  }));
                }}
                onDeleteImage={() => {
                  updateP((prev) => ({
                    ...prev,
                    floatingImages: (prev.floatingImages || []).filter((item) => item.id !== img.id),
                  }));
                }}
                onDelete={() => {
                  updateP((prev) => ({
                    ...prev,
                    floatingImages: (prev.floatingImages || []).filter((item) => item.id !== img.id),
                  }));
                }}
                onDuplicateImage={(itemToDup) => {
                  const duplicated: FloatingImageElement = {
                    ...itemToDup,
                    id: `floating-img-${Date.now()}`,
                    name: `${itemToDup.name || "Imagem"} (Cópia)`,
                    offsetX: (itemToDup.offsetX ?? 0) + 25,
                    offsetY: (itemToDup.offsetY ?? 0) + 25,
                  };
                  updateP((prev) => ({
                    ...prev,
                    floatingImages: [...(prev.floatingImages || []), duplicated],
                  }));
                }}
                onOpenVisualModal={(imgId) => onOpenVisualModal?.(imgId || img.id)}
                onOpenImagePicker={onOpenImagePicker}
              />
            </div>
          );
        })}
      </div>
    );
  };

  // Render individual sections
  const renderSection = (secName: string) => {
    switch (secName) {
      case "hero":
        if (!visibility.hero || !page.hero) return null;
        const heroIndex = sectionOrder.indexOf("hero");
        const currentHeroModel: HeroModel = page.hero.model || "split_image";

        return (
          <section
            key="hero"
            id="hero-section"
            onClick={() => isEditorPreview && onSelectSection?.("hero")}
            className={`pt-8 md:pt-14 pb-16 px-4 sm:px-6 ${getContainerWidthClass(
              page.hero.containerWidth
            )} mx-auto relative ${
              showSectionTools
                ? "cursor-pointer ring-1 ring-zinc-800/80 hover:ring-purple-500/50 rounded-3xl transition-all p-4 mb-6"
                : ""
            } ${activeSection === "hero" && showSectionTools ? "ring-2 ring-purple-500 bg-purple-950/10 shadow-2xl z-[999]" : "z-10"}`}
          >
            {/* Quick Floating Controls Bar in Editor */}
            {showSectionTools && (
              <SectionControlToolbar
                sectionId="hero"
                sectionTitle="SEÇÃO HERO / HEADLINE PRINCIPAL"
                icon={<Sparkles className="w-3.5 h-3.5 text-purple-400" />}
                sectionIndex={heroIndex}
                totalSections={sectionOrder.length}
                onMoveSection={(dir) => handleMoveSection("hero", dir)}
                containerWidth={page.hero.containerWidth || "normal"}
                onChangeContainerWidth={(w) =>
                  updateP((p) => ({ ...p, hero: { ...p.hero, containerWidth: w } }))
                }
                headlineSize={page.hero.headlineSize || "lg"}
                onChangeHeadlineSize={(sz) =>
                  updateP((p) => ({ ...p, hero: { ...p.hero, headlineSize: sz } }))
                }
                align={page.hero.align || "center"}
                onChangeAlign={(a) =>
                  updateP((p) => ({ ...p, hero: { ...p.hero, align: a } }))
                }
                onHideSection={() =>
                  updateP((p) => ({ ...p, visibility: { ...p.visibility, hero: false } }))
                }
                customActions={
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (onOpenHeroModelSelector) {
                          onOpenHeroModelSelector();
                        } else {
                          setIsHeroModelModalOpen(true);
                        }
                      }}
                      className="px-2.5 py-1 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px] flex items-center gap-1.5 shadow-lg shadow-purple-900/40 transition-colors cursor-pointer"
                      title="Escolher Modelo de Hero"
                    >
                      <Layout className="w-3.5 h-3.5" />
                      <span>Modelo: {HERO_MODELS.find(m => m.id === currentHeroModel)?.title.split(":")[0] || "Hero"}</span>
                    </button>
                  </div>
                }
              />
            )}

            {/* Hero Model Switcher Modal */}
            {isHeroModelModalOpen && (
              <div
                className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
                onClick={() => setIsHeroModelModalOpen(false)}
              >
                <div
                  className="bg-zinc-900 border border-zinc-700 rounded-3xl p-6 max-w-3xl w-full shadow-2xl text-left max-h-[90vh] overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-4">
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-400" />
                        <span>Escolher Modelo da Seção Hero</span>
                      </h3>
                      <p className="text-xs text-zinc-400">
                        Alterne entre os 6 formatos de alta conversão para transformar o topo da sua página.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsHeroModelModalOpen(false)}
                      className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center text-sm font-bold cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  <HeroModelSelector
                    currentModel={currentHeroModel}
                    onSelectModel={(newModel) => {
                      updateP((p) => ({
                        ...p,
                        hero: {
                          ...p.hero,
                          model: newModel,
                        },
                      }));
                      setIsHeroModelModalOpen(false);
                    }}
                    accentColor={page.accentColor}
                  />
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* MODEL 1: SPLIT WITH IMAGE / MOCKUP                                       */}
            {/* ========================================================================= */}
            {currentHeroModel === "split_image" && (() => {
              const isMediaLeft = page.hero.mediaPosition === "left";
              const mediaWidthPct = page.hero.mediaWidthPercent || 44;
              const textWidthPct = 100 - mediaWidthPct;
              const heroAlign = page.hero.align || "left";
              const headlineAlign = page.hero.headlineAlign || heroAlign;
              const subheadlineAlign = page.hero.subheadlineAlign || heroAlign;

              const textBlock = (
                <div
                  className={`flex flex-col ${getAlignClass(heroAlign)} w-full`}
                  style={{
                    flex: `1 1 ${Math.max(30, textWidthPct)}%`,
                    minWidth: "min(100%, 300px)",
                  }}
                >
                  {/* Badge */}
                  <DraggableElement
                    elementId="hero-badge"
                    offset={getElementOffset("hero-badge")}
                    onOffsetChange={(o) => setElementOffset("hero-badge", o)}
                    isEditorPreview={isEditorPreview}
                    label="Badge"
                    inline
                    className="mb-6"
                  >
                    <div
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
                        page.theme === "light"
                          ? "text-xs sm:text-sm font-semibold shadow-sm"
                          : "bg-zinc-900/90 backdrop-blur-md border border-zinc-800 text-xs sm:text-sm font-semibold shadow-xl shadow-black/40 hover:border-zinc-700 transition-colors"
                      }`}
                      style={
                        page.theme === "light" && (page.customAccentHex || theme.primaryHex)
                          ? {
                              backgroundColor: `${page.customAccentHex || theme.primaryHex}12`,
                              borderColor: `${page.customAccentHex || theme.primaryHex}30`,
                              color: page.customAccentHex || theme.primaryHex,
                            }
                          : undefined
                      }
                    >
                      <span className={`w-2 h-2 rounded-full ${theme.badgeBg} animate-ping`} />
                      <button
                        type="button"
                        onClick={(e) => {
                          if (isEditorPreview) {
                            e.stopPropagation();
                            onOpenIconPicker?.({
                              currentIcon: page.hero.badgeIcon || "Zap",
                              onSelect: (newIcon) => {
                                updateP((p) => ({ ...p, hero: { ...p.hero, badgeIcon: newIcon } }));
                              },
                              title: "Escolher Ícone do Badge",
                            });
                          }
                        }}
                        className={`flex items-center gap-1 ${
                          isEditorPreview ? "hover:scale-110 cursor-pointer p-0.5 rounded bg-zinc-800" : ""
                        }`}
                        title={isEditorPreview ? "Clique para trocar o ícone" : undefined}
                      >
                        <DynamicIcon name={page.hero.badgeIcon || "Zap"} className={`w-4 h-4 ${theme.iconText}`} />
                      </button>
                      <InlineEditableText
                        value={page.hero.badgeText}
                        onChange={(newVal) =>
                          updateP((p) => ({ ...p, hero: { ...p.hero, badgeText: newVal } }))
                        }
                        isEditorPreview={isEditorPreview}
                        tag="span"
                        className={theme.badgeText}
                        placeholder="Texto do Badge..."
                        fieldLabel="Badge"
                        nicheContext={page.niche}
                      />
                    </div>
                  </DraggableElement>

                  {/* Headline */}
                  <DraggableElement
                    elementId="hero-headline"
                    offset={getElementOffset("hero-headline")}
                    onOffsetChange={(o) => setElementOffset("hero-headline", o)}
                    isEditorPreview={isEditorPreview}
                    label="Título Principal"
                    className="mb-6"
                    widthMode={page.hero.headlineWidth || "full"}
                    onChangeWidthMode={(w) =>
                      updateP((p) => ({ ...p, hero: { ...p.hero, headlineWidth: w } }))
                    }
                    align={headlineAlign}
                    onChangeAlign={(newAlign) =>
                      updateP((p) => ({ ...p, hero: { ...p.hero, headlineAlign: newAlign } }))
                    }
                    onSyncWithPartner={() => {
                      const subOffset = getElementOffset("hero-subheadline");
                      setElementOffset("hero-headline", subOffset);
                      updateP((p) => ({ ...p, hero: { ...p.hero, headlineAlign: subheadlineAlign } }));
                    }}
                    partnerLabel="Subtítulo"
                  >
                    <HeroHeadlineBlock
                      page={page}
                      updateP={updateP}
                      theme={theme}
                      headlineAlign={headlineAlign}
                      isEditorPreview={isEditorPreview}
                    />
                  </DraggableElement>

                  {/* Subheadline */}
                  <DraggableElement
                    elementId="hero-subheadline"
                    offset={getElementOffset("hero-subheadline")}
                    onOffsetChange={(o) => setElementOffset("hero-subheadline", o)}
                    isEditorPreview={isEditorPreview}
                    label="Subtítulo"
                    className="mb-8"
                    widthMode={page.hero.subheadlineWidth || "full"}
                    onChangeWidthMode={(w) =>
                      updateP((p) => ({ ...p, hero: { ...p.hero, subheadlineWidth: w } }))
                    }
                    align={subheadlineAlign}
                    onChangeAlign={(newAlign) =>
                      updateP((p) => ({ ...p, hero: { ...p.hero, subheadlineAlign: newAlign } }))
                    }
                    onSyncWithPartner={() => {
                      const headOffset = getElementOffset("hero-headline");
                      setElementOffset("hero-subheadline", headOffset);
                      updateP((p) => ({ ...p, hero: { ...p.hero, subheadlineAlign: headlineAlign } }));
                    }}
                    partnerLabel="Título"
                  >
                    {/* Subheadline Color & Styling */}
                    {(() => {
                      const subMode = page.hero.subheadlineColor || "default";
                      let subColorClass = "";
                      let subExplicitHex: string | undefined = undefined;
                      if (subMode === "black") {
                        subColorClass = "text-black";
                        subExplicitHex = "#000000";
                      } else if (subMode === "graphite") {
                        subColorClass = "text-zinc-800";
                        subExplicitHex = "#27272a";
                      } else if (subMode === "gray") {
                        subColorClass = "text-zinc-500";
                        subExplicitHex = "#64748b";
                      } else if (subMode === "white") {
                        subColorClass = "text-white";
                        subExplicitHex = "#ffffff";
                      } else if (subMode === "primary" || subMode === "emerald" || subMode === "system") {
                        subExplicitHex = page.hero.subheadlineCustomHex || page.customAccentHex || theme.primaryHex || "#10b981";
                      } else if (subMode === "custom" && page.hero.subheadlineCustomHex) {
                        subExplicitHex = page.hero.subheadlineCustomHex;
                      } else if (typeof subMode === "string" && subMode.startsWith("#")) {
                        subExplicitHex = subMode;
                      } else {
                        subColorClass = page.theme === "light" ? "text-zinc-600" : "text-zinc-400";
                      }

                      return (
                        <div
                          className={`leading-relaxed font-normal ${getTextWidthClass(page.hero.subheadlineWidth || "full")} ${subColorClass} ${getSubheadlineSizeClass(page.hero.subheadlineSize)} ${getHeadingAlignClass(subheadlineAlign)}`}
                          style={{
                            fontSize: page.hero.subheadlineFontSizePx ? `${page.hero.subheadlineFontSizePx}px` : undefined,
                            color: subExplicitHex,
                          }}
                        >
                          <InlineEditableText
                            value={page.hero.subheadline}
                            onChange={(newVal) =>
                              updateP((p) => ({ ...p, hero: { ...p.hero, subheadline: newVal } }))
                            }
                            align={subheadlineAlign}
                            onAlignChange={(newAlign) =>
                              updateP((p) => ({
                                ...p,
                                hero: { ...p.hero, subheadlineAlign: newAlign },
                              }))
                            }
                            fontSize={page.hero.subheadlineSize || "base"}
                            onFontSizeChange={(newSize) =>
                              updateP((p) => ({
                                ...p,
                                hero: { ...p.hero, subheadlineSize: newSize },
                              }))
                            }
                            fontSizePx={page.hero.subheadlineFontSizePx}
                            onFontSizePxChange={(newPx) =>
                              updateP((p) => ({
                                ...p,
                                hero: { ...p.hero, subheadlineFontSizePx: newPx },
                              }))
                            }
                            onIncreaseFontSize={() =>
                              updateP((p) => ({
                                ...p,
                                hero: {
                                  ...p.hero,
                                  subheadlineSize: getNextFontSize(p.hero.subheadlineSize || "base", "up"),
                                },
                              }))
                            }
                            onDecreaseFontSize={() =>
                              updateP((p) => ({
                                ...p,
                                hero: {
                                  ...p.hero,
                                  subheadlineSize: getNextFontSize(p.hero.subheadlineSize || "base", "down"),
                                },
                              }))
                            }
                            isEditorPreview={isEditorPreview}
                            tag="p"
                            multiline={true}
                            placeholder="Insira a subheadline explicativa..."
                            fieldLabel="Subheadline"
                            nicheContext={page.niche}
                          />
                        </div>
                      );
                    })()}
                  </DraggableElement>

                  {/* Urgency Pill & Social Proof Avatars */}
                  <DraggableElement
                    elementId="hero-urgency"
                    offset={getElementOffset("hero-urgency")}
                    onOffsetChange={(o) => setElementOffset("hero-urgency", o)}
                    isEditorPreview={isEditorPreview}
                    label="Prova Social & Cronômetro"
                    className="mb-8"
                  >
                    <div className={`flex flex-wrap items-center gap-4 sm:gap-6 text-xs sm:text-sm ${
                      page.theme === "light" ? "text-zinc-700" : "text-zinc-300"
                    }`}>
                      <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl shadow-sm ${
                        page.hero.countdownBgColor === "dark"
                          ? "bg-zinc-950/90 border border-zinc-800"
                          : page.hero.countdownBgColor === "light"
                          ? "bg-white border border-zinc-200"
                          : page.hero.countdownBgColor === "emerald"
                          ? "bg-emerald-950/80 border border-emerald-500/40"
                          : page.hero.countdownBgColor === "purple"
                          ? "bg-purple-950/80 border border-purple-500/40"
                          : page.hero.countdownBgColor === "amber"
                          ? "bg-amber-950/80 border border-amber-500/40"
                          : page.hero.countdownBgColor === "cyan"
                          ? "bg-cyan-950/80 border border-cyan-500/40"
                          : page.theme === "light"
                          ? "bg-zinc-100 border border-zinc-200"
                          : "bg-zinc-900/80 border border-zinc-800"
                      }`}
                      style={{
                        backgroundColor: page.hero.countdownBgCustomHex || undefined,
                        borderColor: page.hero.countdownBorderColor || undefined,
                      }}
                      >
                        <Clock className="w-4 h-4 animate-pulse" style={{ color: page.customAccentHex || theme.primaryHex }} />
                        <span style={{ color: page.hero.countdownTextColor || undefined }}>
                          <InlineEditableText
                            value={page.hero.countdownLabel || "Oferta expira em:"}
                            onChange={(newVal) =>
                              updateP((p) => ({ ...p, hero: { ...p.hero, countdownLabel: newVal } }))
                            }
                            isEditorPreview={isEditorPreview}
                            tag="span"
                            placeholder="Oferta expira em..."
                          />{" "}
                          <strong 
                            className="font-mono font-bold tracking-wider"
                            style={{ color: page.hero.countdownTimerColor || page.customAccentHex || theme.primaryHex }}
                          >
                            {page.hero.countdownDays ? `${page.hero.countdownDays}d ` : ""}
                            {page.hero.countdownHours ? `${String(page.hero.countdownHours).padStart(2, "0")}:` : ""}
                            {String(timeLeft.minutes).padStart(2, "0")}:{String(timeLeft.seconds).padStart(2, "0")}
                          </strong>
                        </span>
                      </div>

                      {page.hero.socialProofAvatars && page.hero.socialProofAvatars.length > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-2">
                            {page.hero.socialProofAvatars.map((av, i) => (
                              <img
                                key={i}
                                src={av.avatarUrl}
                                alt={av.name}
                                className="w-7 h-7 rounded-full border-2 border-zinc-900 object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ))}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-zinc-400">
                            <span className="text-amber-400 font-bold flex items-center">
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 mr-0.5" />
                              {page.hero.ratingScore || "4.9"}
                            </span>
                            <span>
                              (
                              <InlineEditableText
                                value={page.hero.ratingText || "4.9/5 estrelas • 1.200+ clientes"}
                                onChange={(newVal) =>
                                  updateP((p) => ({ ...p, hero: { ...p.hero, ratingText: newVal } }))
                                }
                                isEditorPreview={isEditorPreview}
                                tag="span"
                                placeholder="Avaliação e Prova..."
                              />
                              )
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </DraggableElement>

                  {/* Primary CTA with Visual Editable Button */}
                  <DraggableElement
                    elementId="hero-cta-group"
                    offset={getElementOffset("hero-cta-group")}
                    onOffsetChange={(o) => setElementOffset("hero-cta-group", o)}
                    isEditorPreview={isEditorPreview}
                    label="Botão de Ação CTA"
                    className="w-full max-w-md space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 w-full">
                      <div className="flex-[1.2]">
                        <VisualEditableButton
                          buttonId="hero-primary-cta"
                          text={page.hero.ctaText || "QUERO GARANTIR MINHA VAGA"}
                          onTextChange={(newText) =>
                            updateP((p) => ({ ...p, hero: { ...p.hero, ctaText: newText } }))
                          }
                          buttonStyle={getButtonStyle("hero-primary-cta", page.hero.ctaStyle)}
                          onStyleChange={(s) => {
                            setButtonStyle("hero-primary-cta", s);
                            updateP((p) => ({ ...p, hero: { ...p.hero, ctaStyle: s } }));
                          }}
                          isEditorPreview={isEditorPreview}
                          onClick={() => {
                            if (!isEditorPreview) scrollToSection("form-section");
                          }}
                          themeGlow={theme.ctaGlow}
                          accentColor={page.accentColor}
                          customAccentHex={page.customAccentHex}
                          nicheContext={page.niche}
                        />
                      </div>

                      <div className="flex-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (!isEditorPreview) {
                              const phone = page.formSection?.whatsappHelpNumber?.replace(/\D/g, "") || "5511999999999";
                              window.open(`https://wa.me/${phone}?text=Olá,%20gostaria%20de%20saber%20mais%20sobre.`, "_blank");
                            }
                          }}
                          className={`w-full py-4 px-6 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                            page.theme === "light"
                              ? "bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-200 shadow-sm"
                              : "bg-zinc-900/90 hover:bg-zinc-800 text-white border border-zinc-800"
                          }`}
                        >
                          <DynamicIcon name={page.hero.secondaryCtaIcon || "MessageSquare"} className={`w-4 h-4 ${page.theme === "light" ? "text-zinc-600" : "text-zinc-400"}`} />
                          <InlineEditableText
                            value={page.hero.secondaryCtaText || "Falar com Consultor"}
                            onChange={(newVal) =>
                              updateP((p) => ({ ...p, hero: { ...p.hero, secondaryCtaText: newVal } }))
                            }
                            isEditorPreview={isEditorPreview}
                            tag="span"
                            placeholder="Texto secundário..."
                          />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2.5 w-full">
                      {(page.hero.ctaSubtext || isEditorPreview) && (
                        <div className={`flex items-center justify-center sm:justify-start gap-2 text-xs ${
                          page.theme === "light" ? "text-zinc-500" : "text-zinc-400"
                        } font-medium`}>
                          <ShieldCheck className="w-4 h-4 text-emerald-500" />
                          <InlineEditableText
                            value={page.hero.ctaSubtext || ""}
                            onChange={(newVal) =>
                              updateP((p) => ({ ...p, hero: { ...p.hero, ctaSubtext: newVal } }))
                            }
                            isEditorPreview={isEditorPreview}
                            tag="span"
                            placeholder="Garantia ou micro-copy..."
                          />
                        </div>
                      )}

                      {/* Clean checklist at bottom of Hero */}
                      <div className={`flex flex-wrap items-center gap-4 sm:gap-6 text-xs font-semibold ${
                        page.theme === "light" ? "text-zinc-700" : "text-zinc-300"
                      } pt-1`}>
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2
                            className="w-4 h-4"
                            style={{ color: page.customAccentHex || theme.primaryHex }}
                          />
                          <span>Certificado Reconhecido</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2
                            className="w-4 h-4"
                            style={{ color: page.customAccentHex || theme.primaryHex }}
                          />
                          <span>Foco na Prática</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2
                            className="w-4 h-4"
                            style={{ color: page.customAccentHex || theme.primaryHex }}
                          />
                          <span>Suporte Individual</span>
                        </div>
                      </div>
                    </div>
                  </DraggableElement>
                </div>
              );

              const mediaBlock = (
                <div
                  className="w-full flex justify-center items-center"
                  style={{
                    flex: `0 0 ${Math.max(25, mediaWidthPct)}%`,
                    maxWidth: "100%",
                  }}
                >
                  <HeroMediaCard
                    hero={page.hero}
                    onUpdateHero={(updated) =>
                      updateP((p) => ({
                        ...p,
                        hero: {
                          ...p.hero,
                          ...(typeof updated === "function" ? updated(p.hero) : updated),
                        },
                      }))
                    }
                    isEditorPreview={isEditorPreview}
                    themeGlow={theme.neonGlow}
                    onOpenImagePicker={onOpenImagePicker}
                    customStyle={page.customElementStyles?.["hero-media"]}
                    onOpenVisualModal={() => onOpenVisualModal?.("hero-media")}
                  />
                </div>
              );

              return (
                <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-center w-full">
                  {isMediaLeft ? (
                    <>
                      {mediaBlock}
                      {textBlock}
                    </>
                  ) : (
                    <>
                      {textBlock}
                      {mediaBlock}
                    </>
                  )}
                </div>
              );
            })()}

            {/* ========================================================================= */}
            {/* MODEL 2: SPLIT WITH VERTICAL VSL / VIDEO + FLOATING RATING                */}
            {/* ========================================================================= */}
            {currentHeroModel === "split_video" && (() => {
              const isMediaLeft = page.hero.mediaPosition === "left";
              const mediaWidthPct = page.hero.mediaWidthPercent || 38;
              const textWidthPct = 100 - mediaWidthPct;
              const heroAlign = page.hero.align || "left";
              const headlineAlign = page.hero.headlineAlign || heroAlign;
              const subheadlineAlign = page.hero.subheadlineAlign || heroAlign;

              const textBlock = (
                <div
                  className={`flex flex-col ${getAlignClass(heroAlign)} w-full`}
                  style={{
                    flex: `1 1 ${Math.max(30, textWidthPct)}%`,
                    minWidth: "min(100%, 300px)",
                  }}
                >
                  {/* Badge */}
                  <DraggableElement
                    elementId="hero2-badge"
                    offset={getElementOffset("hero2-badge")}
                    onOffsetChange={(o) => setElementOffset("hero2-badge", o)}
                    isEditorPreview={isEditorPreview}
                    label="Badge"
                    inline
                    className="mb-6"
                  >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/90 backdrop-blur-md border border-zinc-800 text-xs sm:text-sm font-semibold shadow-xl shadow-black/40">
                      <span className={`w-2 h-2 rounded-full ${theme.badgeBg} animate-ping`} />
                      <DynamicIcon name={page.hero.badgeIcon || "Video"} className={`w-4 h-4 ${theme.iconText}`} />
                      <InlineEditableText
                        value={page.hero.badgeText}
                        onChange={(newVal) =>
                          updateP((p) => ({ ...p, hero: { ...p.hero, badgeText: newVal } }))
                        }
                        isEditorPreview={isEditorPreview}
                        tag="span"
                        className={theme.badgeText}
                        placeholder="Texto do Badge..."
                        fieldLabel="Badge"
                        nicheContext={page.niche}
                      />
                    </div>
                  </DraggableElement>

                  {/* Headline */}
                  <DraggableElement
                    elementId="hero2-headline"
                    offset={getElementOffset("hero2-headline")}
                    onOffsetChange={(o) => setElementOffset("hero2-headline", o)}
                    isEditorPreview={isEditorPreview}
                    label="Título Principal"
                    className="mb-6"
                    widthMode={page.hero.headlineWidth || "full"}
                    onChangeWidthMode={(w) =>
                      updateP((p) => ({ ...p, hero: { ...p.hero, headlineWidth: w } }))
                    }
                    align={headlineAlign}
                    onChangeAlign={(newAlign) =>
                      updateP((p) => ({ ...p, hero: { ...p.hero, headlineAlign: newAlign } }))
                    }
                    onSyncWithPartner={() => {
                      const subOffset = getElementOffset("hero2-subheadline");
                      setElementOffset("hero2-headline", subOffset);
                      updateP((p) => ({ ...p, hero: { ...p.hero, headlineAlign: subheadlineAlign } }));
                    }}
                    partnerLabel="Subtítulo"
                  >
                    <HeroHeadlineBlock
                      page={page}
                      updateP={updateP}
                      theme={theme}
                      headlineAlign={headlineAlign}
                      isEditorPreview={isEditorPreview}
                      defaultColorClass="text-white"
                    />
                  </DraggableElement>

                  {/* Subheadline */}
                  <DraggableElement
                    elementId="hero2-subheadline"
                    offset={getElementOffset("hero2-subheadline")}
                    onOffsetChange={(o) => setElementOffset("hero2-subheadline", o)}
                    isEditorPreview={isEditorPreview}
                    label="Subtítulo"
                    className="mb-8"
                    widthMode={page.hero.subheadlineWidth || "full"}
                    onChangeWidthMode={(w) =>
                      updateP((p) => ({ ...p, hero: { ...p.hero, subheadlineWidth: w } }))
                    }
                    align={subheadlineAlign}
                    onChangeAlign={(newAlign) =>
                      updateP((p) => ({ ...p, hero: { ...p.hero, subheadlineAlign: newAlign } }))
                    }
                    onSyncWithPartner={() => {
                      const headOffset = getElementOffset("hero2-headline");
                      setElementOffset("hero2-subheadline", headOffset);
                      updateP((p) => ({ ...p, hero: { ...p.hero, subheadlineAlign: headlineAlign } }));
                    }}
                    partnerLabel="Título"
                  >
                    <div
                      className={`text-zinc-400 ${getSubheadlineSizeClass(
                        page.hero.subheadlineSize
                      )} ${getTextWidthClass(page.hero.subheadlineWidth || "full")} ${getHeadingAlignClass(subheadlineAlign)} leading-relaxed font-normal`}
                      style={{
                        fontSize: page.hero.subheadlineFontSizePx ? `${page.hero.subheadlineFontSizePx}px` : undefined,
                      }}
                    >
                      <InlineEditableText
                        value={page.hero.subheadline}
                        onChange={(newVal) =>
                          updateP((p) => ({ ...p, hero: { ...p.hero, subheadline: newVal } }))
                        }
                        align={subheadlineAlign}
                        onAlignChange={(newAlign) =>
                          updateP((p) => ({
                            ...p,
                            hero: { ...p.hero, subheadlineAlign: newAlign },
                          }))
                        }
                        fontSize={page.hero.subheadlineSize || "base"}
                        onFontSizeChange={(newSize) =>
                          updateP((p) => ({
                            ...p,
                            hero: { ...p.hero, subheadlineSize: newSize },
                          }))
                        }
                        fontSizePx={page.hero.subheadlineFontSizePx}
                        onFontSizePxChange={(newPx) =>
                          updateP((p) => ({
                            ...p,
                            hero: { ...p.hero, subheadlineFontSizePx: newPx },
                          }))
                        }
                        onIncreaseFontSize={() =>
                          updateP((p) => ({
                            ...p,
                            hero: {
                              ...p.hero,
                              subheadlineSize: getNextFontSize(p.hero.subheadlineSize || "base", "up"),
                            },
                          }))
                        }
                        onDecreaseFontSize={() =>
                          updateP((p) => ({
                            ...p,
                            hero: {
                              ...p.hero,
                              subheadlineSize: getNextFontSize(p.hero.subheadlineSize || "base", "down"),
                            },
                          }))
                        }
                        isEditorPreview={isEditorPreview}
                        tag="p"
                        multiline={true}
                        placeholder="Insira a subheadline explicativa..."
                        fieldLabel="Subheadline"
                        nicheContext={page.niche}
                      />
                    </div>
                  </DraggableElement>

                  {/* CTA Button + Social Avatars Side-by-Side */}
                  <DraggableElement
                    elementId="hero2-cta-group"
                    offset={getElementOffset("hero2-cta-group")}
                    onOffsetChange={(o) => setElementOffset("hero2-cta-group", o)}
                    isEditorPreview={isEditorPreview}
                    label="Botão de Ação & Prova Social"
                    className="w-full space-y-3 mb-4"
                  >
                    <div className="w-full flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                      <div className="flex-1">
                        <VisualEditableButton
                          buttonId="hero2-primary-cta"
                          text={page.hero.ctaText || "QUERO COMEÇAR AGORA"}
                          onTextChange={(newText) =>
                            updateP((p) => ({ ...p, hero: { ...p.hero, ctaText: newText } }))
                          }
                          buttonStyle={getButtonStyle("hero2-primary-cta", page.hero.ctaStyle)}
                          onStyleChange={(s) => {
                            setButtonStyle("hero2-primary-cta", s);
                            updateP((p) => ({ ...p, hero: { ...p.hero, ctaStyle: s } }));
                          }}
                          isEditorPreview={isEditorPreview}
                          onClick={() => {
                            if (!isEditorPreview) scrollToSection("form-section");
                          }}
                          themeGlow={theme.ctaGlow}
                          accentColor={page.accentColor}
                          customAccentHex={page.customAccentHex}
                          nicheContext={page.niche}
                        />
                      </div>

                      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 shrink-0">
                        <div className="flex -space-x-2">
                          {(page.hero.socialProofAvatars || []).slice(0, 3).map((av, idx) => (
                            <img
                              key={idx}
                              src={av.avatarUrl}
                              alt={av.name}
                              className="w-8 h-8 rounded-full border-2 border-zinc-900 object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ))}
                        </div>
                        <div className="text-xs">
                          <div className="font-bold text-white flex items-center gap-1">
                            <Users className="w-3 h-3 text-purple-400" />
                            <span>+2.400 Alunos</span>
                          </div>
                          <p className="text-[11px] text-zinc-400">Turmas ativas em 2026</p>
                        </div>
                      </div>
                    </div>

                    {(page.hero.ctaSubtext || isEditorPreview) && (
                      <div className="flex items-center gap-2 text-xs text-zinc-400 font-medium">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <InlineEditableText
                          value={page.hero.ctaSubtext || ""}
                          onChange={(newVal) =>
                            updateP((p) => ({ ...p, hero: { ...p.hero, ctaSubtext: newVal } }))
                          }
                          isEditorPreview={isEditorPreview}
                          tag="span"
                          placeholder="Garantia..."
                        />
                      </div>
                    )}
                  </DraggableElement>
                </div>
              );

              const mediaBlock = (
                <div
                  className="w-full flex justify-center items-center relative"
                  style={{
                    flex: `0 0 ${Math.max(25, mediaWidthPct)}%`,
                    maxWidth: "100%",
                  }}
                >
                  <HeroMediaCard
                    hero={page.hero}
                    onUpdateHero={(updated) =>
                      updateP((p) => ({
                        ...p,
                        hero: {
                          ...p.hero,
                          ...(typeof updated === "function" ? updated(p.hero) : updated),
                        },
                      }))
                    }
                    isEditorPreview={isEditorPreview}
                    themeGlow={theme.neonGlow}
                    onOpenImagePicker={onOpenImagePicker}
                    customStyle={page.customElementStyles?.["hero-media"]}
                    onOpenVisualModal={() => onOpenVisualModal?.("hero-media")}
                  />

                  {/* Floating Review Badge */}
                  <div className="absolute -bottom-4 -left-2 sm:-left-4 z-20 px-4 py-3 rounded-2xl bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/80 shadow-2xl flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold">
                      <Star className="w-5 h-5 fill-amber-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1 font-extrabold text-white text-sm">
                        <InlineEditableText
                          value={page.hero.ratingScore || "4.9 / 5.0"}
                          onChange={(newVal) =>
                            updateP((p) => ({ ...p, hero: { ...p.hero, ratingScore: newVal } }))
                          }
                          isEditorPreview={isEditorPreview}
                          tag="span"
                        />
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400/20" />
                      </div>
                      <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">
                        <InlineEditableText
                          value={page.hero.ratingText || "+3.200 procedimentos realizados com excelência"}
                          onChange={(newVal) =>
                            updateP((p) => ({ ...p, hero: { ...p.hero, ratingText: newVal } }))
                          }
                          isEditorPreview={isEditorPreview}
                          tag="div"
                          placeholder="+3.200 procedimentos..."
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );

              return (
                <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-center w-full">
                  {isMediaLeft ? (
                    <>
                      {mediaBlock}
                      {textBlock}
                    </>
                  ) : (
                    <>
                      {textBlock}
                      {mediaBlock}
                    </>
                  )}
                </div>
              );
            })()}

            {/* ========================================================================= */}
            {/* MODEL 3: CENTERED SHOWCASE WITH EMBEDDED METRICS BAR                     */}
            {/* ========================================================================= */}
            {currentHeroModel === "centered_showcase" && (() => {
              const heroAlign = page.hero.align || "center";
              const headlineAlign = page.hero.headlineAlign || heroAlign;
              const subheadlineAlign = page.hero.subheadlineAlign || heroAlign;

              return (
                <div className={`max-w-5xl mx-auto flex flex-col ${getAlignClass(heroAlign)} w-full`}>
                  {/* Badge */}
                  <DraggableElement
                    elementId="hero3-badge"
                    offset={getElementOffset("hero3-badge")}
                    onOffsetChange={(o) => setElementOffset("hero3-badge", o)}
                    isEditorPreview={isEditorPreview}
                    label="Badge"
                    inline
                    className="mb-6"
                  >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/90 backdrop-blur-md border border-zinc-800 text-xs sm:text-sm font-semibold shadow-xl shadow-black/40">
                      <span className={`w-2 h-2 rounded-full ${theme.badgeBg} animate-ping`} />
                      <DynamicIcon name={page.hero.badgeIcon || "Zap"} className={`w-4 h-4 ${theme.iconText}`} />
                      <InlineEditableText
                        value={page.hero.badgeText}
                        onChange={(newVal) =>
                          updateP((p) => ({ ...p, hero: { ...p.hero, badgeText: newVal } }))
                        }
                        isEditorPreview={isEditorPreview}
                        tag="span"
                        className={theme.badgeText}
                        placeholder="Texto do Badge..."
                      />
                    </div>
                  </DraggableElement>

                  {/* Headline */}
                  <DraggableElement
                    elementId="hero3-headline"
                    offset={getElementOffset("hero3-headline")}
                    onOffsetChange={(o) => setElementOffset("hero3-headline", o)}
                    isEditorPreview={isEditorPreview}
                    label="Título Principal"
                    className="mb-6"
                    widthMode={page.hero.headlineWidth || "full"}
                    onChangeWidthMode={(w) =>
                      updateP((p) => ({ ...p, hero: { ...p.hero, headlineWidth: w } }))
                    }
                    align={headlineAlign}
                    onChangeAlign={(newAlign) =>
                      updateP((p) => ({ ...p, hero: { ...p.hero, headlineAlign: newAlign } }))
                    }
                    onSyncWithPartner={() => {
                      const subOffset = getElementOffset("hero3-subheadline");
                      setElementOffset("hero3-headline", subOffset);
                      updateP((p) => ({ ...p, hero: { ...p.hero, headlineAlign: subheadlineAlign } }));
                    }}
                    partnerLabel="Subtítulo"
                  >
                    <HeroHeadlineBlock
                      page={page}
                      updateP={updateP}
                      theme={theme}
                      headlineAlign={headlineAlign}
                      isEditorPreview={isEditorPreview}
                      defaultColorClass="text-white"
                    />
                  </DraggableElement>

                  {/* Subheadline */}
                  <DraggableElement
                    elementId="hero3-subheadline"
                    offset={getElementOffset("hero3-subheadline")}
                    onOffsetChange={(o) => setElementOffset("hero3-subheadline", o)}
                    isEditorPreview={isEditorPreview}
                    label="Subtítulo"
                    className="mb-8"
                    widthMode={page.hero.subheadlineWidth || "full"}
                    onChangeWidthMode={(w) =>
                      updateP((p) => ({ ...p, hero: { ...p.hero, subheadlineWidth: w } }))
                    }
                    align={subheadlineAlign}
                    onChangeAlign={(newAlign) =>
                      updateP((p) => ({ ...p, hero: { ...p.hero, subheadlineAlign: newAlign } }))
                    }
                    onSyncWithPartner={() => {
                      const headOffset = getElementOffset("hero3-headline");
                      setElementOffset("hero3-subheadline", headOffset);
                      updateP((p) => ({ ...p, hero: { ...p.hero, subheadlineAlign: headlineAlign } }));
                    }}
                    partnerLabel="Título"
                  >
                    <div
                      className={`text-zinc-400 ${getSubheadlineSizeClass(
                        page.hero.subheadlineSize
                      )} ${getTextWidthClass(page.hero.subheadlineWidth || "full")} ${getHeadingAlignClass(subheadlineAlign)} leading-relaxed font-normal`}
                      style={{
                        fontSize: page.hero.subheadlineFontSizePx ? `${page.hero.subheadlineFontSizePx}px` : undefined,
                      }}
                    >
                      <InlineEditableText
                        value={page.hero.subheadline}
                        onChange={(newVal) =>
                          updateP((p) => ({ ...p, hero: { ...p.hero, subheadline: newVal } }))
                        }
                        align={subheadlineAlign}
                        onAlignChange={(newAlign) =>
                          updateP((p) => ({
                            ...p,
                            hero: { ...p.hero, subheadlineAlign: newAlign },
                          }))
                        }
                        fontSize={page.hero.subheadlineSize || "base"}
                        onFontSizeChange={(newSize) =>
                          updateP((p) => ({
                            ...p,
                            hero: { ...p.hero, subheadlineSize: newSize },
                          }))
                        }
                        fontSizePx={page.hero.subheadlineFontSizePx}
                        onFontSizePxChange={(newPx) =>
                          updateP((p) => ({
                            ...p,
                            hero: { ...p.hero, subheadlineFontSizePx: newPx },
                          }))
                        }
                        onIncreaseFontSize={() =>
                          updateP((p) => ({
                            ...p,
                            hero: {
                              ...p.hero,
                              subheadlineSize: getNextFontSize(p.hero.subheadlineSize || "base", "up"),
                            },
                          }))
                        }
                        onDecreaseFontSize={() =>
                          updateP((p) => ({
                            ...p,
                            hero: {
                              ...p.hero,
                              subheadlineSize: getNextFontSize(p.hero.subheadlineSize || "base", "down"),
                            },
                          }))
                        }
                        isEditorPreview={isEditorPreview}
                        tag="p"
                        multiline={true}
                        placeholder="Insira a subheadline explicativa..."
                      />
                    </div>
                  </DraggableElement>

                  {/* Centered CTA */}
                  <DraggableElement
                    elementId="hero3-cta-group"
                    offset={getElementOffset("hero3-cta-group")}
                    onOffsetChange={(o) => setElementOffset("hero3-cta-group", o)}
                    isEditorPreview={isEditorPreview}
                    label="Botão de Ação CTA"
                    className="max-w-md w-full space-y-3 mb-10 mx-auto"
                  >
                    <VisualEditableButton
                      buttonId="hero3-primary-cta"
                      text={page.hero.ctaText || "QUERO GARANTIR ACESSO"}
                      onTextChange={(newText) =>
                        updateP((p) => ({ ...p, hero: { ...p.hero, ctaText: newText } }))
                      }
                      buttonStyle={getButtonStyle("hero3-primary-cta", page.hero.ctaStyle)}
                      onStyleChange={(s) => {
                        setButtonStyle("hero3-primary-cta", s);
                        updateP((p) => ({ ...p, hero: { ...p.hero, ctaStyle: s } }));
                      }}
                      isEditorPreview={isEditorPreview}
                      onClick={() => {
                        if (!isEditorPreview) scrollToSection("form-section");
                      }}
                      themeGlow={theme.ctaGlow}
                      accentColor={page.accentColor}
                      customAccentHex={page.customAccentHex}
                      nicheContext={page.niche}
                    />

                    {(page.hero.ctaSubtext || isEditorPreview) && (
                      <div className="flex items-center justify-center gap-4 text-xs text-zinc-400 font-medium">
                        <span className="flex items-center gap-1">
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                          <InlineEditableText
                            value={page.hero.ctaSubtext || ""}
                            onChange={(newVal) =>
                              updateP((p) => ({ ...p, hero: { ...p.hero, ctaSubtext: newVal } }))
                            }
                            isEditorPreview={isEditorPreview}
                            tag="span"
                            placeholder="Micro-copy..."
                          />
                        </span>
                      </div>
                    )}
                  </DraggableElement>

                  {/* Large Showcase Card with HeroMediaCard and Embedded Bottom Metrics */}
                  <div className="w-full flex flex-col items-center">
                    <HeroMediaCard
                      hero={page.hero}
                      theme={page.theme}
                      onUpdateHero={(updated) =>
                        updateP((p) => ({
                          ...p,
                          hero: {
                            ...p.hero,
                            ...(typeof updated === "function" ? updated(p.hero) : updated),
                          },
                        }))
                      }
                      isEditorPreview={isEditorPreview}
                      themeGlow={theme.neonGlow}
                      onOpenImagePicker={onOpenImagePicker}
                      customStyle={page.customElementStyles?.["hero-media"]}
                      onOpenVisualModal={() => onOpenVisualModal?.("hero-media")}
                    />

                    {/* Embedded Bottom Metrics Bar */}
                    <div className="w-full max-w-4xl grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-zinc-800 bg-zinc-950/95 backdrop-blur-md rounded-2xl border border-zinc-800/80 p-3.5 sm:p-5 text-center mt-4 shadow-xl">
                      <div className="px-2">
                        <div className="text-xl sm:text-2xl font-black text-purple-400">
                          <InlineEditableText
                            value={page.hero.b2bMetrics?.[0]?.value || "+42%"}
                            onChange={(newVal) =>
                              updateP((p) => {
                                const list = [...(p.hero.b2bMetrics || [{ id: "m1", value: "+42%", label: "Taxa de Conversão" }, { id: "m2", value: "14min", label: "SLA de Resposta" }, { id: "m3", value: "12.4x", label: "ROI Estimado" }])];
                                list[0] = { ...list[0], value: newVal };
                                return { ...p, hero: { ...p.hero, b2bMetrics: list } };
                              })
                            }
                            isEditorPreview={isEditorPreview}
                            tag="span"
                          />
                        </div>
                        <div className="text-[10px] sm:text-xs text-zinc-400 font-semibold uppercase tracking-wider mt-0.5">
                          <InlineEditableText
                            value={page.hero.b2bMetrics?.[0]?.label || "Conversão Média"}
                            onChange={(newVal) =>
                              updateP((p) => {
                                const list = [...(p.hero.b2bMetrics || [{ id: "m1", value: "+42%", label: "Taxa de Conversão" }, { id: "m2", value: "14min", label: "SLA de Resposta" }, { id: "m3", value: "12.4x", label: "ROI Estimado" }])];
                                list[0] = { ...list[0], label: newVal };
                                return { ...p, hero: { ...p.hero, b2bMetrics: list } };
                              })
                            }
                            isEditorPreview={isEditorPreview}
                            tag="span"
                          />
                        </div>
                      </div>

                      <div className="px-2">
                        <div className="text-xl sm:text-2xl font-black text-emerald-400">
                          <InlineEditableText
                            value={page.hero.b2bMetrics?.[1]?.value || "14min"}
                            onChange={(newVal) =>
                              updateP((p) => {
                                const list = [...(p.hero.b2bMetrics || [{ id: "m1", value: "+42%", label: "Taxa de Conversão" }, { id: "m2", value: "14min", label: "SLA de Resposta" }, { id: "m3", value: "12.4x", label: "ROI Estimado" }])];
                                list[1] = { ...list[1], value: newVal };
                                return { ...p, hero: { ...p.hero, b2bMetrics: list } };
                              })
                            }
                            isEditorPreview={isEditorPreview}
                            tag="span"
                          />
                        </div>
                        <div className="text-[10px] sm:text-xs text-zinc-400 font-semibold uppercase tracking-wider mt-0.5">
                          <InlineEditableText
                            value={page.hero.b2bMetrics?.[1]?.label || "SLA de Resposta"}
                            onChange={(newVal) =>
                              updateP((p) => {
                                const list = [...(p.hero.b2bMetrics || [{ id: "m1", value: "+42%", label: "Taxa de Conversão" }, { id: "m2", value: "14min", label: "SLA de Resposta" }, { id: "m3", value: "12.4x", label: "ROI Estimado" }])];
                                list[1] = { ...list[1], label: newVal };
                                return { ...p, hero: { ...p.hero, b2bMetrics: list } };
                              })
                            }
                            isEditorPreview={isEditorPreview}
                            tag="span"
                          />
                        </div>
                      </div>

                      <div className="px-2">
                        <div className="text-xl sm:text-2xl font-black text-amber-400">
                          <InlineEditableText
                            value={page.hero.b2bMetrics?.[2]?.value || "12.4x"}
                            onChange={(newVal) =>
                              updateP((p) => {
                                const list = [...(p.hero.b2bMetrics || [{ id: "m1", value: "+42%", label: "Taxa de Conversão" }, { id: "m2", value: "14min", label: "SLA de Resposta" }, { id: "m3", value: "12.4x", label: "ROI Estimado" }])];
                                list[2] = { ...list[2], value: newVal };
                                return { ...p, hero: { ...p.hero, b2bMetrics: list } };
                              })
                            }
                            isEditorPreview={isEditorPreview}
                            tag="span"
                          />
                        </div>
                        <div className="text-[10px] sm:text-xs text-zinc-400 font-semibold uppercase tracking-wider mt-0.5">
                          <InlineEditableText
                            value={page.hero.b2bMetrics?.[2]?.label || "ROI Médio"}
                            onChange={(newVal) =>
                              updateP((p) => {
                                const list = [...(p.hero.b2bMetrics || [{ id: "m1", value: "+42%", label: "Taxa de Conversão" }, { id: "m2", value: "14min", label: "SLA de Resposta" }, { id: "m3", value: "12.4x", label: "ROI Estimado" }])];
                                list[2] = { ...list[2], label: newVal };
                                return { ...p, hero: { ...p.hero, b2bMetrics: list } };
                              })
                            }
                            isEditorPreview={isEditorPreview}
                            tag="span"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ========================================================================= */}
            {/* MODEL 4: SPLIT WITH EMBEDDED LEAD CAPTURE FORM (E-BOOK / LEAD MAGNET)     */}
            {/* ========================================================================= */}
            {currentHeroModel === "split_lead_form" && (() => {
              const isMediaLeft = page.hero.mediaPosition !== "right"; // default left for ebook
              const mediaWidthPct = page.hero.mediaWidthPercent || 40;
              const formWidthPct = 100 - mediaWidthPct;
              const heroAlign = page.hero.align || "left";
              const headlineAlign = page.hero.headlineAlign || heroAlign;
              const subheadlineAlign = page.hero.subheadlineAlign || heroAlign;

              const mediaBlock = (
                <div
                  className="w-full flex justify-center items-center"
                  style={{
                    flex: `0 0 ${Math.max(25, mediaWidthPct)}%`,
                    maxWidth: "100%",
                  }}
                >
                  <HeroMediaCard
                    hero={page.hero}
                    onUpdateHero={(updated) =>
                      updateP((p) => ({
                        ...p,
                        hero: {
                          ...p.hero,
                          ...(typeof updated === "function" ? updated(p.hero) : updated),
                        },
                      }))
                    }
                    isEditorPreview={isEditorPreview}
                    themeGlow={theme.neonGlow}
                    onOpenImagePicker={onOpenImagePicker}
                    customStyle={page.customElementStyles?.["hero-media"]}
                    onOpenVisualModal={() => onOpenVisualModal?.("hero-media")}
                  />
                </div>
              );

              const formBlock = (
                <div
                  className={`flex flex-col ${getAlignClass(heroAlign)} w-full`}
                  style={{
                    flex: `1 1 ${Math.max(30, formWidthPct)}%`,
                    minWidth: "min(100%, 300px)",
                  }}
                >
                  {/* Badge */}
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/90 backdrop-blur-md border border-zinc-800 text-xs sm:text-sm font-semibold mb-4 shadow-xl">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <BookOpen className="w-4 h-4 text-emerald-400" />
                    <InlineEditableText
                      value={page.hero.badgeText || "MATERIAL EXCLUSIVO & GRATUITO"}
                      onChange={(newVal) =>
                        updateP((p) => ({ ...p, hero: { ...p.hero, badgeText: newVal } }))
                      }
                      isEditorPreview={isEditorPreview}
                      tag="span"
                      className="text-emerald-300"
                      placeholder="Badge..."
                    />
                  </div>

                  {/* Headline */}
                  <DraggableElement
                    elementId="hero4-headline"
                    offset={getElementOffset("hero4-headline")}
                    onOffsetChange={(o) => setElementOffset("hero4-headline", o)}
                    isEditorPreview={isEditorPreview}
                    label="Título Principal"
                    className="mb-4"
                    widthMode={page.hero.headlineWidth || "full"}
                    onChangeWidthMode={(w) =>
                      updateP((p) => ({ ...p, hero: { ...p.hero, headlineWidth: w } }))
                    }
                    align={headlineAlign}
                    onChangeAlign={(newAlign) =>
                      updateP((p) => ({ ...p, hero: { ...p.hero, headlineAlign: newAlign } }))
                    }
                    onSyncWithPartner={() => {
                      const subOffset = getElementOffset("hero4-subheadline");
                      setElementOffset("hero4-headline", subOffset);
                      updateP((p) => ({ ...p, hero: { ...p.hero, headlineAlign: subheadlineAlign } }));
                    }}
                    partnerLabel="Subtítulo"
                  >
                    <HeroHeadlineBlock
                      page={page}
                      updateP={updateP}
                      theme={theme}
                      headlineAlign={headlineAlign}
                      isEditorPreview={isEditorPreview}
                      defaultColorClass="text-white"
                    />
                  </DraggableElement>

                  {/* Subheadline */}
                  <DraggableElement
                    elementId="hero4-subheadline"
                    offset={getElementOffset("hero4-subheadline")}
                    onOffsetChange={(o) => setElementOffset("hero4-subheadline", o)}
                    isEditorPreview={isEditorPreview}
                    label="Subtítulo"
                    className="mb-6"
                    widthMode={page.hero.subheadlineWidth || "full"}
                    onChangeWidthMode={(w) =>
                      updateP((p) => ({ ...p, hero: { ...p.hero, subheadlineWidth: w } }))
                    }
                    align={subheadlineAlign}
                    onChangeAlign={(newAlign) =>
                      updateP((p) => ({ ...p, hero: { ...p.hero, subheadlineAlign: newAlign } }))
                    }
                    onSyncWithPartner={() => {
                      const headOffset = getElementOffset("hero4-headline");
                      setElementOffset("hero4-subheadline", headOffset);
                      updateP((p) => ({ ...p, hero: { ...p.hero, subheadlineAlign: headlineAlign } }));
                    }}
                    partnerLabel="Título"
                  >
                    <div
                      className={`text-zinc-400 ${getSubheadlineSizeClass(
                        page.hero.subheadlineSize
                      )} ${getTextWidthClass(page.hero.subheadlineWidth || "full")} ${getHeadingAlignClass(subheadlineAlign)} leading-relaxed`}
                      style={{
                        fontSize: page.hero.subheadlineFontSizePx ? `${page.hero.subheadlineFontSizePx}px` : undefined,
                      }}
                    >
                    <InlineEditableText
                      value={page.hero.subheadline || "Preencha o formulário abaixo e receba seu exemplar completo imediatamente via WhatsApp e E-mail."}
                      onChange={(newVal) =>
                        updateP((p) => ({ ...p, hero: { ...p.hero, subheadline: newVal } }))
                      }
                      align={subheadlineAlign}
                      onAlignChange={(newAlign) =>
                        updateP((p) => ({
                          ...p,
                          hero: { ...p.hero, subheadlineAlign: newAlign },
                        }))
                      }
                      fontSize={page.hero.subheadlineSize || "base"}
                      onFontSizeChange={(newSize) =>
                        updateP((p) => ({
                          ...p,
                          hero: { ...p.hero, subheadlineSize: newSize },
                        }))
                      }
                      fontSizePx={page.hero.subheadlineFontSizePx}
                      onFontSizePxChange={(newPx) =>
                        updateP((p) => ({
                          ...p,
                          hero: { ...p.hero, subheadlineFontSizePx: newPx },
                        }))
                      }
                      onIncreaseFontSize={() =>
                        updateP((p) => ({
                          ...p,
                          hero: {
                            ...p.hero,
                            subheadlineSize: getNextFontSize(p.hero.subheadlineSize || "base", "up"),
                          },
                        }))
                      }
                      onDecreaseFontSize={() =>
                        updateP((p) => ({
                          ...p,
                          hero: {
                            ...p.hero,
                            subheadlineSize: getNextFontSize(p.hero.subheadlineSize || "base", "down"),
                          },
                        }))
                      }
                      isEditorPreview={isEditorPreview}
                      tag="p"
                      multiline={true}
                      placeholder="Subheadline..."
                    />
                  </div>
                  </DraggableElement>

                  {/* Embedded Form Box */}
                  <div className="w-full rounded-3xl bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 p-6 sm:p-7 shadow-2xl space-y-4">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <InlineEditableText
                        value={page.hero.leadFormTitle || "Preencha seus dados para download gratuito"}
                        onChange={(newVal) =>
                          updateP((p) => ({ ...p, hero: { ...p.hero, leadFormTitle: newVal } }))
                        }
                        isEditorPreview={isEditorPreview}
                        tag="span"
                      />
                    </h4>

                    {isSubmitted ? (
                      <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-center space-y-2">
                        <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                        <h5 className="font-bold text-white text-base">Material Enviado com Sucesso!</h5>
                        <p className="text-xs text-zinc-300">
                          Verifique sua caixa de entrada e seu WhatsApp para acessar seu material.
                        </p>
                      </div>
                    ) : (
                      <form onSubmit={handleLeadSubmit} className="space-y-3">
                        {submitError && (
                          <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-xs text-red-300">
                            {submitError}
                          </div>
                        )}

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                            Nome Completo *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Seu nome completo"
                            value={leadName}
                            onChange={(e) => setLeadName(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-purple-500 transition-colors"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                              WhatsApp com DDD *
                            </label>
                            <input
                              type="tel"
                              required
                              placeholder="(11) 99999-9999"
                              value={leadPhone}
                              onChange={(e) => setLeadPhone(formatBrazilianPhone(e.target.value))}
                              className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-purple-500 transition-colors"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                              E-mail Corporativo *
                            </label>
                            <input
                              type="email"
                              required
                              placeholder="seu@email.com"
                              value={leadEmail}
                              onChange={(e) => setLeadEmail(e.target.value)}
                              className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-purple-500 transition-colors"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className={`w-full py-4 rounded-2xl ${theme.ctaBg} hover:opacity-95 text-white font-extrabold text-base shadow-xl ${theme.ctaGlow} flex items-center justify-center gap-2 transition-all cursor-pointer mt-2`}
                        >
                          <Download className="w-5 h-5 text-white" />
                          <span>{isSubmitting ? "Enviando..." : (page.hero.ctaText || "RECEBER MATERIAL AGORA")}</span>
                        </button>

                        <div className="flex items-center justify-center gap-2 text-[11px] text-zinc-400 pt-1">
                          <Lock className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Seus dados estão 100% seguros e confidenciais.</span>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              );

              return (
                <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-center w-full">
                  {isMediaLeft ? (
                    <>
                      {mediaBlock}
                      {formBlock}
                    </>
                  ) : (
                    <>
                      {formBlock}
                      {mediaBlock}
                    </>
                  )}
                </div>
              );
            })()}

            {/* ========================================================================= */}
            {/* MODEL 5: B2B & CONSULTANCY WITH DUAL CTAS, METRICS & SCARCITY BAR        */}
            {/* ========================================================================= */}
            {currentHeroModel === "b2b_metrics" && (() => {
              const isMediaLeft = page.hero.mediaPosition === "left";
              const mediaWidthPct = page.hero.mediaWidthPercent || 42;
              const textWidthPct = 100 - mediaWidthPct;
              const heroAlign = page.hero.align || "left";
              const headlineAlign = page.hero.headlineAlign || heroAlign;
              const subheadlineAlign = page.hero.subheadlineAlign || heroAlign;

              const textBlock = (
                <div
                  className={`flex flex-col ${getAlignClass(heroAlign)} space-y-6 w-full`}
                  style={{
                    flex: `1 1 ${Math.max(30, textWidthPct)}%`,
                    minWidth: "min(100%, 300px)",
                  }}
                >
                  {/* Badge */}
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/90 backdrop-blur-md border border-zinc-800 text-xs sm:text-sm font-semibold shadow-xl">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <InlineEditableText
                      value={page.hero.badgeText || "TRANSFORMAÇÃO EMPRESARIAL COMPROVADA"}
                      onChange={(newVal) =>
                        updateP((p) => ({ ...p, hero: { ...p.hero, badgeText: newVal } }))
                      }
                      isEditorPreview={isEditorPreview}
                      tag="span"
                      className="text-purple-300"
                    />
                  </div>

                  {/* Headline */}
                  <DraggableElement
                    elementId="hero5-headline"
                    offset={getElementOffset("hero5-headline")}
                    onOffsetChange={(o) => setElementOffset("hero5-headline", o)}
                    isEditorPreview={isEditorPreview}
                    label="Título Principal"
                    widthMode={page.hero.headlineWidth || "full"}
                    onChangeWidthMode={(w) =>
                      updateP((p) => ({ ...p, hero: { ...p.hero, headlineWidth: w } }))
                    }
                    align={headlineAlign}
                    onChangeAlign={(newAlign) =>
                      updateP((p) => ({ ...p, hero: { ...p.hero, headlineAlign: newAlign } }))
                    }
                    onSyncWithPartner={() => {
                      const subOffset = getElementOffset("hero5-subheadline");
                      setElementOffset("hero5-headline", subOffset);
                      updateP((p) => ({ ...p, hero: { ...p.hero, headlineAlign: subheadlineAlign } }));
                    }}
                    partnerLabel="Subtítulo"
                  >
                    <HeroHeadlineBlock
                      page={page}
                      updateP={updateP}
                      theme={theme}
                      headlineAlign={headlineAlign}
                      isEditorPreview={isEditorPreview}
                      defaultColorClass="text-white"
                    />
                  </DraggableElement>

                  {/* Subheadline */}
                  <DraggableElement
                    elementId="hero5-subheadline"
                    offset={getElementOffset("hero5-subheadline")}
                    onOffsetChange={(o) => setElementOffset("hero5-subheadline", o)}
                    isEditorPreview={isEditorPreview}
                    label="Subtítulo"
                    widthMode={page.hero.subheadlineWidth || "full"}
                    onChangeWidthMode={(w) =>
                      updateP((p) => ({ ...p, hero: { ...p.hero, subheadlineWidth: w } }))
                    }
                    align={subheadlineAlign}
                    onChangeAlign={(newAlign) =>
                      updateP((p) => ({ ...p, hero: { ...p.hero, subheadlineAlign: newAlign } }))
                    }
                    onSyncWithPartner={() => {
                      const headOffset = getElementOffset("hero5-headline");
                      setElementOffset("hero5-subheadline", headOffset);
                      updateP((p) => ({ ...p, hero: { ...p.hero, subheadlineAlign: headlineAlign } }));
                    }}
                    partnerLabel="Título"
                  >
                    <div
                      className={`text-zinc-400 ${getSubheadlineSizeClass(
                        page.hero.subheadlineSize
                      )} ${getTextWidthClass(page.hero.subheadlineWidth || "full")} ${getHeadingAlignClass(subheadlineAlign)} leading-relaxed`}
                      style={{
                        fontSize: page.hero.subheadlineFontSizePx ? `${page.hero.subheadlineFontSizePx}px` : undefined,
                      }}
                    >
                      <InlineEditableText
                        value={page.hero.subheadline || "Acelere a eficiência operacional e os lucros da sua organização com metodologia validada em mais de 25 grandes empresas."}
                        onChange={(newVal) =>
                          updateP((p) => ({ ...p, hero: { ...p.hero, subheadline: newVal } }))
                        }
                        align={subheadlineAlign}
                        onAlignChange={(newAlign) =>
                          updateP((p) => ({
                            ...p,
                            hero: { ...p.hero, subheadlineAlign: newAlign },
                          }))
                        }
                        fontSize={page.hero.subheadlineSize || "base"}
                        onFontSizeChange={(newSize) =>
                          updateP((p) => ({
                            ...p,
                            hero: { ...p.hero, subheadlineSize: newSize },
                          }))
                        }
                        fontSizePx={page.hero.subheadlineFontSizePx}
                        onFontSizePxChange={(newPx) =>
                          updateP((p) => ({
                            ...p,
                            hero: { ...p.hero, subheadlineFontSizePx: newPx },
                          }))
                        }
                        onIncreaseFontSize={() =>
                          updateP((p) => ({
                            ...p,
                            hero: {
                              ...p.hero,
                              subheadlineSize: getNextFontSize(p.hero.subheadlineSize || "base", "up"),
                            },
                          }))
                        }
                        onDecreaseFontSize={() =>
                          updateP((p) => ({
                            ...p,
                            hero: {
                              ...p.hero,
                              subheadlineSize: getNextFontSize(p.hero.subheadlineSize || "base", "down"),
                            },
                          }))
                        }
                        isEditorPreview={isEditorPreview}
                        tag="p"
                        multiline={true}
                      />
                    </div>
                  </DraggableElement>

                  {/* Authority Metrics Row */}
                  <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 py-4 border-y border-zinc-800/80">
                    <div>
                      <div className="text-xl sm:text-2xl font-black text-white">
                        <InlineEditableText
                          value={page.hero.b2bMetrics?.[0]?.value || "10+"}
                          onChange={(newVal) =>
                            updateP((p) => {
                              const list = [...(p.hero.b2bMetrics || [{ id: "m1", value: "10+", label: "Anos de Experiência" }, { id: "m2", value: "25+", label: "Empresas Atendidas" }, { id: "m3", value: "+300", label: "Pessoas Transformadas" }])];
                              list[0] = { ...list[0], value: newVal };
                              return { ...p, hero: { ...p.hero, b2bMetrics: list } };
                            })
                          }
                          isEditorPreview={isEditorPreview}
                          tag="span"
                        />
                      </div>
                      <div className="text-[11px] text-zinc-400 font-medium">
                        <InlineEditableText
                          value={page.hero.b2bMetrics?.[0]?.label || "Anos de Experiência"}
                          onChange={(newVal) =>
                            updateP((p) => {
                              const list = [...(p.hero.b2bMetrics || [{ id: "m1", value: "10+", label: "Anos de Experiência" }, { id: "m2", value: "25+", label: "Empresas Atendidas" }, { id: "m3", value: "+300", label: "Pessoas Transformadas" }])];
                              list[0] = { ...list[0], label: newVal };
                              return { ...p, hero: { ...p.hero, b2bMetrics: list } };
                            })
                          }
                          isEditorPreview={isEditorPreview}
                          tag="span"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="text-xl sm:text-2xl font-black text-purple-400">
                        <InlineEditableText
                          value={page.hero.b2bMetrics?.[1]?.value || "25+"}
                          onChange={(newVal) =>
                            updateP((p) => {
                              const list = [...(p.hero.b2bMetrics || [{ id: "m1", value: "10+", label: "Anos de Experiência" }, { id: "m2", value: "25+", label: "Empresas Atendidas" }, { id: "m3", value: "+300", label: "Pessoas Transformadas" }])];
                              list[1] = { ...list[1], value: newVal };
                              return { ...p, hero: { ...p.hero, b2bMetrics: list } };
                            })
                          }
                          isEditorPreview={isEditorPreview}
                          tag="span"
                        />
                      </div>
                      <div className="text-[11px] text-zinc-400 font-medium">
                        <InlineEditableText
                          value={page.hero.b2bMetrics?.[1]?.label || "Empresas Atendidas"}
                          onChange={(newVal) =>
                            updateP((p) => {
                              const list = [...(p.hero.b2bMetrics || [{ id: "m1", value: "10+", label: "Anos de Experiência" }, { id: "m2", value: "25+", label: "Empresas Atendidas" }, { id: "m3", value: "+300", label: "Pessoas Transformadas" }])];
                              list[1] = { ...list[1], label: newVal };
                              return { ...p, hero: { ...p.hero, b2bMetrics: list } };
                            })
                          }
                          isEditorPreview={isEditorPreview}
                          tag="span"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="text-xl sm:text-2xl font-black text-emerald-400">
                        <InlineEditableText
                          value={page.hero.b2bMetrics?.[2]?.value || "+300"}
                          onChange={(newVal) =>
                            updateP((p) => {
                              const list = [...(p.hero.b2bMetrics || [{ id: "m1", value: "10+", label: "Anos de Experiência" }, { id: "m2", value: "25+", label: "Empresas Atendidas" }, { id: "m3", value: "+300", label: "Pessoas Transformadas" }])];
                              list[2] = { ...list[2], value: newVal };
                              return { ...p, hero: { ...p.hero, b2bMetrics: list } };
                            })
                          }
                          isEditorPreview={isEditorPreview}
                          tag="span"
                        />
                      </div>
                      <div className="text-[11px] text-zinc-400 font-medium">
                        <InlineEditableText
                          value={page.hero.b2bMetrics?.[2]?.label || "Pessoas Transformadas"}
                          onChange={(newVal) =>
                            updateP((p) => {
                              const list = [...(p.hero.b2bMetrics || [{ id: "m1", value: "10+", label: "Anos de Experiência" }, { id: "m2", value: "25+", label: "Empresas Atendidas" }, { id: "m3", value: "+300", label: "Pessoas Transformadas" }])];
                              list[2] = { ...list[2], label: newVal };
                              return { ...p, hero: { ...p.hero, b2bMetrics: list } };
                            })
                          }
                          isEditorPreview={isEditorPreview}
                          tag="span"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Dual Action Buttons */}
                  <div className="w-full flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (!isEditorPreview) scrollToSection("form-section");
                      }}
                      className={`flex-1 py-4 px-6 rounded-2xl ${theme.ctaBg} hover:opacity-95 text-white font-extrabold text-sm sm:text-base shadow-xl ${theme.ctaGlow} flex items-center justify-center gap-2 cursor-pointer`}
                    >
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <InlineEditableText
                        value={page.hero.ctaText || "Agendar uma Reunião"}
                        onChange={(newVal) =>
                          updateP((p) => ({ ...p, hero: { ...p.hero, ctaText: newVal } }))
                        }
                        isEditorPreview={isEditorPreview}
                        tag="span"
                      />
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (!isEditorPreview) {
                          const phone = page.formSection?.whatsappHelpNumber?.replace(/\D/g, "") || "5511999999999";
                          window.open(`https://wa.me/${phone}?text=Olá,%20gostaria%20de%20saber%20mais%20sobre%20a%20consultoria.`, "_blank");
                        }
                      }}
                      className="py-4 px-6 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-sm sm:text-base border border-zinc-700 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4 text-emerald-400" />
                      <InlineEditableText
                        value={page.hero.secondaryCtaText || "Fale no WhatsApp"}
                        onChange={(newVal) =>
                          updateP((p) => ({ ...p, hero: { ...p.hero, secondaryCtaText: newVal } }))
                        }
                        isEditorPreview={isEditorPreview}
                        tag="span"
                      />
                    </button>
                  </div>
                </div>
              );

              const mediaBlock = (
                <div
                  className="w-full flex justify-center items-center relative"
                  style={{
                    flex: `0 0 ${Math.max(25, mediaWidthPct)}%`,
                    maxWidth: "100%",
                  }}
                >
                  <HeroMediaCard
                    hero={page.hero}
                    onUpdateHero={(updated) =>
                      updateP((p) => ({
                        ...p,
                        hero: {
                          ...p.hero,
                          ...(typeof updated === "function" ? updated(p.hero) : updated),
                        },
                      }))
                    }
                    isEditorPreview={isEditorPreview}
                    themeGlow={theme.neonGlow}
                    onOpenImagePicker={onOpenImagePicker}
                    customStyle={page.customElementStyles?.["hero-media"]}
                    onOpenVisualModal={() => onOpenVisualModal?.("hero-media")}
                  />

                  {/* Scarcity Card Floating */}
                  <div className="absolute -bottom-4 -right-2 sm:-right-4 z-20 p-4 rounded-2xl bg-zinc-900/95 backdrop-blur-xl border border-zinc-700 shadow-2xl max-w-xs w-full space-y-2 pointer-events-none">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-zinc-300 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-purple-400" />
                        <InlineEditableText
                          value={page.hero.scarcityLabel || "TURMA DE MARÇO"}
                          onChange={(newVal) =>
                            updateP((p) => ({ ...p, hero: { ...p.hero, scarcityLabel: newVal } }))
                          }
                          isEditorPreview={isEditorPreview}
                          tag="span"
                        />
                      </span>
                      <span className="text-emerald-400 font-extrabold">18 vagas restantes</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                      <div className="w-3/4 h-full rounded-full bg-emerald-400 animate-pulse" />
                    </div>
                  </div>
                </div>
              );

              return (
                <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-center w-full">
                  {isMediaLeft ? (
                    <>
                      {mediaBlock}
                      {textBlock}
                    </>
                  ) : (
                    <>
                      {textBlock}
                      {mediaBlock}
                    </>
                  )}
                </div>
              );
            })()}

            {/* ========================================================================= */}
            {/* MODEL 6: EDITORIAL & AUTHOR WITH FULL IMMERSIVE BACKGROUND               */}
            {/* ========================================================================= */}
            {currentHeroModel === "editorial_ebook" && (() => {
              const heroAlign = page.hero.align || "center";
              const headlineAlign = page.hero.headlineAlign || heroAlign;
              const subheadlineAlign = page.hero.subheadlineAlign || heroAlign;

              return (
                <div
                  className={`relative rounded-3xl overflow-hidden p-8 sm:p-16 border border-zinc-800/80 bg-zinc-950 flex flex-col ${getAlignClass(
                    heroAlign
                  )} min-h-[520px]`}
                  style={{
                    backgroundImage: `linear-gradient(to bottom, rgba(9, 9, 11, 0.75), rgba(9, 9, 11, 0.95)), url('${page.hero.imageUrl}')`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                >
                  {isEditorPreview && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenImagePicker?.({
                          type: "hero",
                          currentUrl: page.hero.imageUrl,
                          title: "Trocar Fundo Editorial",
                        });
                      }}
                      className="absolute top-4 right-4 z-20 px-3 py-1.5 rounded-xl bg-black/80 hover:bg-purple-600 text-white text-xs font-bold flex items-center gap-1.5 backdrop-blur-md border border-white/20 shadow-2xl transition-colors cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Trocar Fundo</span>
                    </button>
                  )}

                  {/* Author Name Tag */}
                  <div className="text-xs uppercase tracking-[0.3em] font-extrabold text-purple-400 mb-4">
                    <InlineEditableText
                      value={page.hero.authorName || "LANE EMERY"}
                      onChange={(newVal) =>
                        updateP((p) => ({ ...p, hero: { ...p.hero, authorName: newVal } }))
                      }
                      isEditorPreview={isEditorPreview}
                      tag="span"
                    />
                  </div>

                  {/* Editorial Title */}
                  <DraggableElement
                    elementId="hero6-headline"
                    offset={getElementOffset("hero6-headline")}
                    onOffsetChange={(o) => setElementOffset("hero6-headline", o)}
                    isEditorPreview={isEditorPreview}
                    label="Título Editorial"
                    className="mb-6"
                    widthMode={page.hero.headlineWidth || "full"}
                    onChangeWidthMode={(w) =>
                      updateP((p) => ({ ...p, hero: { ...p.hero, headlineWidth: w } }))
                    }
                    align={headlineAlign}
                    onChangeAlign={(newAlign) =>
                      updateP((p) => ({ ...p, hero: { ...p.hero, headlineAlign: newAlign } }))
                    }
                    onSyncWithPartner={() => {
                      const subOffset = getElementOffset("hero6-subheadline");
                      setElementOffset("hero6-headline", subOffset);
                      updateP((p) => ({ ...p, hero: { ...p.hero, headlineAlign: subheadlineAlign } }));
                    }}
                    partnerLabel="Subtítulo"
                  >
                    <HeroHeadlineBlock
                      page={page}
                      updateP={updateP}
                      theme={theme}
                      headlineAlign={headlineAlign}
                      isEditorPreview={isEditorPreview}
                      defaultColorClass="text-white"
                      className="font-serif font-normal"
                    />
                  </DraggableElement>

                  {/* Subtitle */}
                  <DraggableElement
                    elementId="hero6-subheadline"
                    offset={getElementOffset("hero6-subheadline")}
                    onOffsetChange={(o) => setElementOffset("hero6-subheadline", o)}
                    isEditorPreview={isEditorPreview}
                    label="Subtítulo Editorial"
                    className="mb-8"
                    widthMode={page.hero.subheadlineWidth || "full"}
                    onChangeWidthMode={(w) =>
                      updateP((p) => ({ ...p, hero: { ...p.hero, subheadlineWidth: w } }))
                    }
                    align={subheadlineAlign}
                    onChangeAlign={(newAlign) =>
                      updateP((p) => ({ ...p, hero: { ...p.hero, subheadlineAlign: newAlign } }))
                    }
                    onSyncWithPartner={() => {
                      const headOffset = getElementOffset("hero6-headline");
                      setElementOffset("hero6-subheadline", headOffset);
                      updateP((p) => ({ ...p, hero: { ...p.hero, subheadlineAlign: headlineAlign } }));
                    }}
                    partnerLabel="Título"
                  >
                    <div
                      className={`text-zinc-300 ${getSubheadlineSizeClass(
                        page.hero.subheadlineSize
                      )} ${getTextWidthClass(page.hero.subheadlineWidth || "full")} ${getHeadingAlignClass(subheadlineAlign)} leading-relaxed font-light`}
                      style={{
                        fontSize: page.hero.subheadlineFontSizePx ? `${page.hero.subheadlineFontSizePx}px` : undefined,
                      }}
                    >
                      <InlineEditableText
                        value={page.hero.subheadline || "A comprehensive exploration into the philosophical foundations and pragmatic methodologies of modern education."}
                        onChange={(newVal) =>
                          updateP((p) => ({ ...p, hero: { ...p.hero, subheadline: newVal } }))
                        }
                        align={subheadlineAlign}
                        onAlignChange={(newAlign) =>
                          updateP((p) => ({
                            ...p,
                            hero: { ...p.hero, subheadlineAlign: newAlign },
                          }))
                        }
                        fontSize={page.hero.subheadlineSize || "base"}
                        onFontSizeChange={(newSize) =>
                          updateP((p) => ({
                            ...p,
                            hero: { ...p.hero, subheadlineSize: newSize },
                          }))
                        }
                        fontSizePx={page.hero.subheadlineFontSizePx}
                        onFontSizePxChange={(newPx) =>
                          updateP((p) => ({
                            ...p,
                            hero: { ...p.hero, subheadlineFontSizePx: newPx },
                          }))
                        }
                        onIncreaseFontSize={() =>
                          updateP((p) => ({
                            ...p,
                            hero: {
                              ...p.hero,
                              subheadlineSize: getNextFontSize(p.hero.subheadlineSize || "base", "up"),
                            },
                          }))
                        }
                        onDecreaseFontSize={() =>
                          updateP((p) => ({
                            ...p,
                            hero: {
                              ...p.hero,
                              subheadlineSize: getNextFontSize(p.hero.subheadlineSize || "base", "down"),
                            },
                          }))
                        }
                        isEditorPreview={isEditorPreview}
                        tag="p"
                        multiline={true}
                      />
                    </div>
                  </DraggableElement>

                  {/* Format Badge */}
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-xs text-zinc-300 mb-8">
                    <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                    <InlineEditableText
                      value={page.hero.formatBadge || "Disponível em PDF, ePub, Mobi & TXT"}
                      onChange={(newVal) =>
                        updateP((p) => ({ ...p, hero: { ...p.hero, formatBadge: newVal } }))
                      }
                      isEditorPreview={isEditorPreview}
                      tag="span"
                    />
                  </div>

                  {/* Download CTA Button */}
                  <VisualEditableButton
                    buttonId="hero-m6-cta"
                    text={page.hero.ctaText || "Download Ebook"}
                    onTextChange={(newVal) =>
                      updateP((p) => ({ ...p, hero: { ...p.hero, ctaText: newVal } }))
                    }
                    buttonStyle={getButtonStyle("hero-m6-cta")}
                    onStyleChange={(s) => setButtonStyle("hero-m6-cta", s)}
                    isEditorPreview={isEditorPreview}
                    onClick={() => {
                      if (!isEditorPreview) scrollToSection("form-section");
                    }}
                    variant="outline"
                    defaultIcon="arrow"
                    accentColor={page.accentColor}
                    customAccentHex={page.customAccentHex}
                    nicheContext={page.niche}
                  />

                  {/* Media / Press Bar */}
                  <div className="mt-12 pt-8 border-t border-white/10 w-full max-w-3xl flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-[11px] uppercase tracking-widest text-zinc-400 font-semibold">
                    <span>FALTNER WEEKLY</span>
                    <span>•</span>
                    <span>THE PLEW</span>
                    <span>•</span>
                    <span>HARWINN GAZETTE</span>
                    <span>•</span>
                    <span>SANTA SOLANA POST</span>
                  </div>
                </div>
              );
            })()}

            {/* ========================================================================= */}
            {/* MODEL 7: MINIMAL GLOW & DIRECT HEADLINE FOCUS                             */}
            {/* ========================================================================= */}
            {currentHeroModel === "minimal_glow" && (() => {
              const heroAlign = page.hero.align || "center";
              const headlineAlign = page.hero.headlineAlign || heroAlign;
              const subheadlineAlign = page.hero.subheadlineAlign || heroAlign;

              return (
                <div className={`flex flex-col ${getAlignClass(heroAlign)} max-w-4xl mx-auto py-6 sm:py-10 space-y-6 sm:space-y-8 w-full`}>
                  {/* Glowing Top Badge */}
                  <DraggableElement
                    {...getDraggableProps("hero-badge")}
                    align={headlineAlign}
                    onChangeAlign={(a) => {
                      updateP((p) => ({ ...p, hero: { ...p.hero, align: a, headlineAlign: a, subheadlineAlign: a } }));
                    }}
                    isEditorPreview={isEditorPreview}
                    label="Badge"
                    inline
                    className="mb-2"
                  >
                    <div
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
                        page.theme === "light"
                          ? "bg-purple-50 border border-purple-200 text-purple-700 shadow-sm"
                          : "bg-zinc-900/90 backdrop-blur-md border border-purple-500/40 text-purple-300 shadow-xl shadow-purple-950/40"
                      }`}
                    >
                      <Sparkles className="w-4 h-4 text-purple-500 animate-pulse" />
                      <InlineEditableText
                        value={page.hero.badgeText || "MÉTODO VALIDADO & EXCLUSIVO"}
                        onChange={(newVal) =>
                          updateP((p) => ({ ...p, hero: { ...p.hero, badgeText: newVal } }))
                        }
                        align={headlineAlign}
                        onAlignChange={(newAlign) =>
                          updateP((p) => ({ ...p, hero: { ...p.hero, headlineAlign: newAlign } }))
                        }
                        isEditorPreview={isEditorPreview}
                        tag="span"
                        className="text-xs sm:text-sm font-extrabold tracking-wide"
                      />
                    </div>
                  </DraggableElement>

                  {/* Headline */}
                  <DraggableElement
                    {...getDraggableProps("hero-headline")}
                    align={headlineAlign}
                    onChangeAlign={(newAlign) => {
                      updateP((p) => ({ ...p, hero: { ...p.hero, headlineAlign: newAlign, align: newAlign } }));
                    }}
                    isEditorPreview={isEditorPreview}
                    label="Título Principal"
                    className="w-full"
                    widthMode={page.hero.headlineWidth || "full"}
                    onChangeWidthMode={(w) =>
                      updateP((p) => ({ ...p, hero: { ...p.hero, headlineWidth: w } }))
                    }
                  >
                    <HeroHeadlineBlock
                      page={page}
                      updateP={updateP}
                      theme={theme}
                      headlineAlign={headlineAlign}
                      isEditorPreview={isEditorPreview}
                      className="font-black"
                    />
                  </DraggableElement>

                  {/* Subheadline */}
                  <DraggableElement
                    {...getDraggableProps("hero-subheadline")}
                    align={subheadlineAlign}
                    onChangeAlign={(newAlign) => {
                      updateP((p) => ({ ...p, hero: { ...p.hero, subheadlineAlign: newAlign } }));
                    }}
                    isEditorPreview={isEditorPreview}
                    label="Subtítulo"
                    className="w-full max-w-2xl mx-auto"
                    widthMode={page.hero.subheadlineWidth || "normal"}
                    onChangeWidthMode={(w) =>
                      updateP((p) => ({ ...p, hero: { ...p.hero, subheadlineWidth: w } }))
                    }
                  >
                    <div
                      className={`${
                        page.theme === "light" ? "text-zinc-600 font-medium" : "text-zinc-400"
                      } ${getSubheadlineSizeClass(
                        page.hero.subheadlineSize
                      )} ${getHeadingAlignClass(subheadlineAlign)} w-full leading-relaxed`}
                      style={{
                        fontSize: page.hero.subheadlineFontSizePx ? `${page.hero.subheadlineFontSizePx}px` : undefined,
                      }}
                    >
                      <InlineEditableText
                        value={page.hero.subheadline || "Tudo o que você precisa para estruturar, escalar e converter com máxima eficiência e sem desperdício de tempo."}
                        onChange={(newVal) =>
                          updateP((p) => ({ ...p, hero: { ...p.hero, subheadline: newVal } }))
                        }
                        align={subheadlineAlign}
                        onAlignChange={(newAlign) => {
                          updateP((p) => ({ ...p, hero: { ...p.hero, subheadlineAlign: newAlign } }));
                        }}
                        fontSize={page.hero.subheadlineSize || "base"}
                        onFontSizeChange={(newSize) =>
                          updateP((p) => ({ ...p, hero: { ...p.hero, subheadlineSize: newSize } }))
                        }
                        fontSizePx={page.hero.subheadlineFontSizePx}
                        onFontSizePxChange={(newPx) =>
                          updateP((p) => ({ ...p, hero: { ...p.hero, subheadlineFontSizePx: newPx } }))
                        }
                        isEditorPreview={isEditorPreview}
                        tag="p"
                        multiline={true}
                      />
                    </div>
                  </DraggableElement>

                  {/* Dual CTA Center */}
                  <DraggableElement
                    {...getDraggableProps("hero-cta-group")}
                    align={heroAlign}
                    onChangeAlign={(newAlign) => {
                      updateP((p) => ({ ...p, hero: { ...p.hero, align: newAlign } }));
                    }}
                    isEditorPreview={isEditorPreview}
                    label="Botões de Ação"
                    className="w-full max-w-md mx-auto pt-2"
                  >
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
                      <button
                        type="button"
                        onClick={() => {
                          if (!isEditorPreview) scrollToSection("form-section");
                        }}
                        className={`w-full sm:w-auto flex-1 py-4 px-8 rounded-2xl ${theme.ctaBg} hover:opacity-95 text-white font-extrabold text-base shadow-xl ${theme.ctaGlow} flex items-center justify-center gap-2 cursor-pointer transition-transform hover:scale-105`}
                      >
                        <Sparkles className="w-5 h-5 text-amber-300" />
                        <InlineEditableText
                          value={page.hero.ctaText || "Começar Agora"}
                          onChange={(newVal) =>
                            updateP((p) => ({ ...p, hero: { ...p.hero, ctaText: newVal } }))
                          }
                          isEditorPreview={isEditorPreview}
                          tag="span"
                        />
                        <ArrowRight className="w-5 h-5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (!isEditorPreview) scrollToSection("bento-section");
                        }}
                        className={`w-full sm:w-auto py-4 px-6 rounded-2xl ${
                          page.theme === "light"
                            ? "bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-300"
                            : "bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 border border-zinc-700"
                        } font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors`}
                      >
                        <span>Conhecer Estrutura</span>
                      </button>
                    </div>
                  </DraggableElement>

                  {/* Trust Rating & Social Proof Mini-Row */}
                  <DraggableElement
                    elementId="hero-rating"
                    offset={getElementOffset("hero-rating")}
                    onOffsetChange={(o) => setElementOffset("hero-rating", o)}
                    align={heroAlign}
                    isEditorPreview={isEditorPreview}
                    label="Selo de Avaliações"
                    className="w-full pt-4"
                  >
                    <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-xs">
                      <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                        <span>★★★★★</span>
                        <span className={page.theme === "light" ? "text-zinc-800" : "text-zinc-300"}>4.9/5 (500+ Avaliações)</span>
                      </div>
                      <span className={page.theme === "light" ? "text-zinc-300" : "text-zinc-700"}>•</span>
                      <div className="flex items-center gap-1.5 text-emerald-500 font-bold">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Garantia Incondicional de 7 Dias</span>
                      </div>
                    </div>
                  </DraggableElement>
                </div>
              );
            })()}

            {/* ========================================================================= */}
            {/* MODEL 8: URGENCY COUNTER & SCARCITY HERO                                  */}
            {/* ========================================================================= */}
            {currentHeroModel === "urgency_counter" && (() => {
              const heroAlign = page.hero.align || "center";
              const headlineAlign = page.hero.headlineAlign || heroAlign;
              const subheadlineAlign = page.hero.subheadlineAlign || heroAlign;

              return (
                <div className={`flex flex-col ${getAlignClass(heroAlign)} max-w-4xl mx-auto text-center py-6 sm:py-10 space-y-6`}>
                  {/* Urgent Flashing Scarcity Header */}
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-600/20 border border-rose-500 text-rose-400 text-xs sm:text-sm font-extrabold animate-pulse">
                    <Zap className="w-4 h-4 text-amber-300" />
                    <InlineEditableText
                      value={page.hero.badgeText || "⚡ OFERTA RELÂMPAGO POR TEMPO LIMITADO"}
                      onChange={(newVal) =>
                        updateP((p) => ({ ...p, hero: { ...p.hero, badgeText: newVal } }))
                      }
                      isEditorPreview={isEditorPreview}
                      tag="span"
                    />
                  </div>

                  {/* Scarcity Countdown Boxes */}
                  <div className="p-4 sm:p-6 rounded-3xl bg-zinc-950/90 border border-amber-500/50 shadow-2xl max-w-lg mx-auto w-full space-y-3">
                    <p className="text-xs uppercase tracking-widest text-amber-400 font-extrabold flex items-center justify-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      <span>O DESCONTO ESPECIAL ENCERRA EM:</span>
                    </p>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="p-2.5 rounded-2xl bg-zinc-900 border border-zinc-800">
                        <span className="block text-xl sm:text-2xl font-black text-white">00</span>
                        <span className="text-[10px] uppercase text-zinc-400 font-bold">Dias</span>
                      </div>
                      <div className="p-2.5 rounded-2xl bg-zinc-900 border border-zinc-800">
                        <span className="block text-xl sm:text-2xl font-black text-white">05</span>
                        <span className="text-[10px] uppercase text-zinc-400 font-bold">Horas</span>
                      </div>
                      <div className="p-2.5 rounded-2xl bg-zinc-900 border border-zinc-800">
                        <span className="block text-xl sm:text-2xl font-black text-amber-400">42</span>
                        <span className="text-[10px] uppercase text-zinc-400 font-bold">Minutos</span>
                      </div>
                      <div className="p-2.5 rounded-2xl bg-zinc-900 border border-zinc-800">
                        <span className="block text-xl sm:text-2xl font-black text-rose-500 animate-pulse">19</span>
                        <span className="text-[10px] uppercase text-zinc-400 font-bold">Segundos</span>
                      </div>
                    </div>
                  </div>

                  {/* Headline */}
                  <HeroHeadlineBlock
                    page={page}
                    updateP={updateP}
                    theme={theme}
                    headlineAlign={headlineAlign}
                    isEditorPreview={isEditorPreview}
                    className="font-black"
                  />

                  {/* Subheadline */}
                  <div
                    className={`${
                      page.theme === "light" ? "text-zinc-600 font-medium" : "text-zinc-400"
                    } ${getSubheadlineSizeClass(
                      page.hero.subheadlineSize
                    )} ${getHeadingAlignClass(subheadlineAlign)} max-w-2xl mx-auto leading-relaxed`}
                    style={{
                      fontSize: page.hero.subheadlineFontSizePx ? `${page.hero.subheadlineFontSizePx}px` : undefined,
                    }}
                  >
                    <InlineEditableText
                      value={page.hero.subheadline || "Acesso vitalício, todos os bônus inclusos e garantia blindada. Condição exclusiva para os próximos 10 inscritos."}
                      onChange={(newVal) =>
                        updateP((p) => ({ ...p, hero: { ...p.hero, subheadline: newVal } }))
                      }
                      align={subheadlineAlign}
                      onAlignChange={(newAlign) =>
                        updateP((p) => ({ ...p, hero: { ...p.hero, subheadlineAlign: newAlign } }))
                      }
                      fontSize={page.hero.subheadlineSize || "base"}
                      onFontSizeChange={(newSize) =>
                        updateP((p) => ({ ...p, hero: { ...p.hero, subheadlineSize: newSize } }))
                      }
                      fontSizePx={page.hero.subheadlineFontSizePx}
                      onFontSizePxChange={(newPx) =>
                        updateP((p) => ({ ...p, hero: { ...p.hero, subheadlineFontSizePx: newPx } }))
                      }
                      isEditorPreview={isEditorPreview}
                      tag="p"
                      multiline={true}
                    />
                  </div>

                  {/* Urgency Progress Bar */}
                  <div className="max-w-md mx-auto w-full space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className={page.theme === "light" ? "text-zinc-700" : "text-zinc-300"}>Vagas Preenchidas: 93%</span>
                      <span className="text-rose-500 font-extrabold animate-pulse">Apenas 7 vagas restantes!</span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-zinc-800 overflow-hidden p-0.5 border border-zinc-700">
                      <div className="w-[93%] h-full rounded-full bg-gradient-to-r from-amber-500 to-rose-500 shadow-lg shadow-rose-500/50" />
                    </div>
                  </div>

                  {/* CTA Button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!isEditorPreview) scrollToSection("form-section");
                      }}
                      className={`w-full max-w-md mx-auto py-5 px-8 rounded-2xl ${theme.ctaBg} hover:opacity-95 text-white font-black text-base sm:text-lg shadow-2xl ${theme.ctaGlow} flex items-center justify-center gap-2 cursor-pointer transition-transform hover:scale-105 animate-bounce`}
                    >
                      <Sparkles className="w-5 h-5 text-amber-300" />
                      <InlineEditableText
                        value={page.hero.ctaText || "GARANTIR MINHA VAGA COM 60% OFF"}
                        onChange={(newVal) =>
                          updateP((p) => ({ ...p, hero: { ...p.hero, ctaText: newVal } }))
                        }
                        isEditorPreview={isEditorPreview}
                        tag="span"
                      />
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* ========================================================================= */}
            {/* MODEL 9: TEMA WHITE PRO (CLEAN HIGH-TICKET COM CARD DE PROVA SOCIAL)     */}
            {/* ========================================================================= */}
            {currentHeroModel === "white_pro" && (() => {
              const heroAlign = page.hero.align || "left";
              const headlineAlign = page.hero.headlineAlign || heroAlign;
              const subheadlineAlign = page.hero.subheadlineAlign || heroAlign;
              const isMediaLeft = page.hero.mediaPosition === "left";

              const textBlock = (
                <div className={`flex flex-col ${getAlignClass(heroAlign)} flex-1 w-full space-y-6`}>
                  {/* Badge Tag */}
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-800 text-xs sm:text-sm font-semibold shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-purple-600 animate-ping" />
                    <DynamicIcon name={page.hero.badgeIcon || "Sparkles"} className="w-4 h-4 text-purple-600" />
                    <InlineEditableText
                      value={page.hero.badgeText || "White Pro • Estrutura de Alta Conversão"}
                      onChange={(newVal) =>
                        updateP((p) => ({ ...p, hero: { ...p.hero, badgeText: newVal } }))
                      }
                      isEditorPreview={isEditorPreview}
                      tag="span"
                      className="text-zinc-900 font-bold"
                      placeholder="Texto do Badge..."
                    />
                  </div>

                  {/* Headline */}
                  <HeroHeadlineBlock
                    page={page}
                    updateP={updateP}
                    theme={theme}
                    headlineAlign={headlineAlign}
                    isEditorPreview={isEditorPreview}
                    defaultColorClass="text-zinc-950"
                    className="font-black"
                  />

                  {/* Subheadline */}
                  <div
                    className={`text-zinc-600 ${getSubheadlineSizeClass(
                      page.hero.subheadlineSize
                    )} ${getHeadingAlignClass(subheadlineAlign)} leading-relaxed font-normal w-full max-w-2xl`}
                    style={{
                      fontSize: page.hero.subheadlineFontSizePx ? `${page.hero.subheadlineFontSizePx}px` : undefined,
                    }}
                  >
                    <InlineEditableText
                      value={page.hero.subheadline || "Um ecossistema clean, rápido e otimizado com design minimalista de alta performance. Desenvolvido para marcas que prezam por autoridade."}
                      onChange={(newVal) =>
                        updateP((p) => ({ ...p, hero: { ...p.hero, subheadline: newVal } }))
                      }
                      align={subheadlineAlign}
                      fontSize={page.hero.subheadlineSize || "base"}
                      isEditorPreview={isEditorPreview}
                      tag="p"
                      multiline={true}
                    />
                  </div>

                  {/* CTA Buttons Row */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full max-w-md pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!isEditorPreview) scrollToSection("form-section");
                      }}
                      className="flex-1 py-4 px-8 rounded-2xl bg-zinc-950 hover:bg-zinc-800 text-white font-extrabold text-sm sm:text-base shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.02]"
                    >
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <InlineEditableText
                        value={page.hero.ctaText || "ACESSAR AGORA"}
                        onChange={(newVal) =>
                          updateP((p) => ({ ...p, hero: { ...p.hero, ctaText: newVal } }))
                        }
                        isEditorPreview={isEditorPreview}
                        tag="span"
                      />
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (!isEditorPreview) scrollToSection("quiz-section");
                      }}
                      className="py-4 px-6 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-300 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <span>Fazer Diagnóstico</span>
                    </button>
                  </div>

                  {/* Micro proof check items */}
                  <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-zinc-700 pt-2">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-purple-600" />
                      <span>Design White Pro 100% Responsivo</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-purple-600" />
                      <span>Carregamento Ultra-Rápido</span>
                    </div>
                  </div>
                </div>
              );

              const cardBlock = (
                <div className="w-full lg:w-[460px] flex flex-col gap-4">
                  <div className="p-6 rounded-3xl bg-white border border-zinc-200/90 shadow-2xl shadow-zinc-200/80 space-y-5">
                    <HeroMediaCard
                      hero={page.hero}
                      onUpdateHero={(updated) =>
                        updateP((p) => ({
                          ...p,
                          hero: {
                            ...p.hero,
                            ...(typeof updated === "function" ? updated(p.hero) : updated),
                          },
                        }))
                      }
                      isEditorPreview={isEditorPreview}
                      themeGlow="shadow-purple-500/10"
                      onOpenImagePicker={onOpenImagePicker}
                    />

                    {/* Authority Card Info */}
                    <div className="pt-2 border-t border-zinc-100 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-full bg-purple-100 border border-purple-200 flex items-center justify-center font-bold text-purple-700 text-sm">
                            ★
                          </div>
                          <div>
                            <p className="text-xs font-bold text-zinc-900">4.9/5 Nota de Excelência</p>
                            <p className="text-[11px] text-zinc-500">Base auditada de membros VIP</p>
                          </div>
                        </div>
                        <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200">
                          100% Verificado
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );

              return (
                <div className="p-6 sm:p-12 rounded-3xl bg-white border border-zinc-200 shadow-xl my-4">
                  <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12 w-full">
                    {isMediaLeft ? (
                      <>
                        {cardBlock}
                        {textBlock}
                      </>
                    ) : (
                      <>
                        {textBlock}
                        {cardBlock}
                      </>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* ========================================================================= */}
            {/* MODEL 10: FULLSCREEN SLIDESHOW (IMAGENS EM SLIDE COM CONTROLE DE TEMPO)    */}
            {/* ========================================================================= */}
            {currentHeroModel === "fullscreen_slideshow" && (() => {
              const heroAlign = page.hero.align || "center";
              const headlineAlign = page.hero.headlineAlign || heroAlign;
              const subheadlineAlign = page.hero.subheadlineAlign || heroAlign;
              const currentImage = slideshowImages[currentSlideIndex % slideshowImages.length];
              const overlayOpacity = (page.hero.slideshowOverlayOpacity ?? 55) / 100;

              return (
                <div className="relative w-full rounded-3xl overflow-hidden min-h-[600px] sm:min-h-[750px] flex flex-col justify-between p-6 sm:p-12 text-white border border-zinc-800 shadow-2xl transition-all duration-700 bg-zinc-950">
                  {/* Slide Image Backdrop with Smooth Transition */}
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-all duration-1000 transform scale-105"
                    style={{ backgroundImage: `url('${currentImage}')` }}
                  />
                  {/* Overlay Scrim */}
                  <div
                    className="absolute inset-0 bg-black transition-opacity duration-300"
                    style={{ opacity: overlayOpacity }}
                  />

                  {/* Top Bar: Configuration Card & Autoplay Status in Editor Preview */}
                  <div className="relative z-20 flex flex-wrap items-center justify-between gap-3 w-full pb-4">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-xs font-bold text-white shadow-xl">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Slide {currentSlideIndex + 1} de {slideshowImages.length}</span>
                      <span className="text-zinc-400">•</span>
                      <span className="text-purple-300">{slideIntervalSec}s por slide</span>
                    </div>

                    {/* Slideshow Control Toolbar in Editor */}
                    {isEditorPreview && (
                      <div className="flex flex-wrap items-center gap-2 bg-zinc-900/95 backdrop-blur-xl border border-purple-500/60 p-2 rounded-2xl shadow-2xl text-xs">
                        <span className="font-extrabold text-purple-300 px-2 flex items-center gap-1">
                          <Sliders className="w-3.5 h-3.5 text-purple-400" />
                          <span>Tempo do Slide:</span>
                        </span>

                        {/* Interval selector buttons: 1s, 3s, 5s, 8s */}
                        {[1, 3, 5, 8, 10].map((sec) => (
                          <button
                            key={sec}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateP((p) => ({
                                ...p,
                                hero: { ...p.hero, slideshowIntervalSeconds: sec },
                              }));
                            }}
                            className={`px-2.5 py-1 rounded-xl font-bold cursor-pointer transition-all ${
                              slideIntervalSec === sec
                                ? "bg-purple-600 text-white shadow"
                                : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                            }`}
                          >
                            {sec}s
                          </button>
                        ))}

                        <div className="h-4 w-px bg-zinc-700 mx-1" />

                        {/* Opacity selector */}
                        <span className="font-semibold text-zinc-400 px-1">Escurecer:</span>
                        {[30, 50, 70].map((op) => (
                          <button
                            key={op}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateP((p) => ({
                                ...p,
                                hero: { ...p.hero, slideshowOverlayOpacity: op },
                              }));
                            }}
                            className={`px-2 py-0.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                              (page.hero.slideshowOverlayOpacity ?? 55) === op
                                ? "bg-purple-600 text-white"
                                : "bg-zinc-800 text-zinc-400 hover:text-white"
                            }`}
                          >
                            {op}%
                          </button>
                        ))}

                        <div className="h-4 w-px bg-zinc-700 mx-1" />

                        {/* Add Image Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onOpenImagePicker) {
                              onOpenImagePicker({
                                type: "hero",
                                currentUrl: currentImage,
                                title: "Adicionar Imagem ao Slideshow",
                              });
                            } else {
                              const url = prompt("Insira a URL da nova imagem do slide:");
                              if (url) {
                                updateP((p) => ({
                                  ...p,
                                  hero: {
                                    ...p.hero,
                                    slideshowImages: [...slideshowImages, url],
                                  },
                                }));
                              }
                            }
                          }}
                          className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          title="Adicionar Foto"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Foto</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Center Content Box */}
                  <div className="relative z-20 my-auto max-w-3xl mx-auto text-center space-y-6">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-xs sm:text-sm font-semibold shadow-2xl">
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <InlineEditableText
                        value={page.hero.badgeText || "Experiência Imersiva em Slide"}
                        onChange={(newVal) =>
                          updateP((p) => ({ ...p, hero: { ...p.hero, badgeText: newVal } }))
                        }
                        isEditorPreview={isEditorPreview}
                        tag="span"
                        className="text-white font-bold"
                      />
                    </div>

                    <HeroHeadlineBlock
                      page={page}
                      updateP={updateP}
                      theme={theme}
                      headlineAlign={headlineAlign}
                      isEditorPreview={isEditorPreview}
                      defaultColorClass="text-white"
                      className="font-black drop-shadow-2xl"
                    />

                    <div
                      className={`text-zinc-200 ${getSubheadlineSizeClass(
                        page.hero.subheadlineSize
                      )} text-center leading-relaxed font-normal max-w-2xl mx-auto drop-shadow`}
                      style={{
                        fontSize: page.hero.subheadlineFontSizePx ? `${page.hero.subheadlineFontSizePx}px` : undefined,
                      }}
                    >
                      <InlineEditableText
                        value={page.hero.subheadline || "Fotografia de alta definição, transição suave programada e layout responsivo. Ideal para marcas focadas no poder da imagem."}
                        onChange={(newVal) =>
                          updateP((p) => ({ ...p, hero: { ...p.hero, subheadline: newVal } }))
                        }
                        align="center"
                        fontSize={page.hero.subheadlineSize || "base"}
                        isEditorPreview={isEditorPreview}
                        tag="p"
                        multiline={true}
                      />
                    </div>

                    <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
                      <button
                        type="button"
                        onClick={() => {
                          if (!isEditorPreview) scrollToSection("form-section");
                        }}
                        className={`w-full sm:w-auto py-5 px-10 rounded-2xl ${theme.ctaBg} hover:opacity-95 text-white font-black text-base shadow-2xl ${theme.ctaGlow} flex items-center justify-center gap-2 cursor-pointer transition-transform hover:scale-105`}
                      >
                        <Sparkles className="w-5 h-5 text-amber-300" />
                        <InlineEditableText
                          value={page.hero.ctaText || "GARANTIR MINHA VAGA"}
                          onChange={(newVal) =>
                            updateP((p) => ({ ...p, hero: { ...p.hero, ctaText: newVal } }))
                          }
                          isEditorPreview={isEditorPreview}
                          tag="span"
                        />
                        <ArrowRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Bottom Navigation Dots & Manual Slide Arrows */}
                  <div className="relative z-20 flex items-center justify-between w-full pt-6">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentSlideIndex((prev) =>
                          prev === 0 ? slideshowImages.length - 1 : prev - 1
                        );
                      }}
                      className="p-3 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 transition-all cursor-pointer hover:scale-110"
                      title="Slide Anterior"
                    >
                      <MoveLeft className="w-5 h-5" />
                    </button>

                    {/* Dots indicator */}
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/60 border border-white/20 backdrop-blur-md">
                      {slideshowImages.map((_, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentSlideIndex(idx);
                          }}
                          className={`h-2.5 rounded-full transition-all cursor-pointer ${
                            currentSlideIndex % slideshowImages.length === idx
                              ? "w-8 bg-purple-500"
                              : "w-2.5 bg-zinc-500 hover:bg-zinc-300"
                          }`}
                        />
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentSlideIndex((prev) => (prev + 1) % slideshowImages.length);
                      }}
                      className="p-3 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 transition-all cursor-pointer hover:scale-110"
                      title="Próximo Slide"
                    >
                      <MoveRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* ========================================================================= */}
            {/* MODEL 11: IBBLE SCHOOL / ESCOLA INFANTIL PLAYFUL COM CURVA AMARELA E CARDS */}
            {/* ========================================================================= */}
            {currentHeroModel === "kids_school_doodle" && (() => {
              const heroAlign = page.hero.align || "left";
              const headlineAlign = page.hero.headlineAlign || heroAlign;
              const subheadlineAlign = page.hero.subheadlineAlign || heroAlign;

              return (
                <div className="relative w-full rounded-3xl overflow-hidden bg-white border border-amber-200/80 shadow-2xl transition-all text-zinc-900 p-6 sm:p-10 lg:p-12">
                  {/* Playful background doodles and top bar */}
                  <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">
                    {/* Left column */}
                    <div className="lg:col-span-6 space-y-6 text-left">
                      {/* Eyebrow badge */}
                      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-black text-xs shadow-sm">
                        <Sparkles className="w-4 h-4 text-amber-600" />
                        <InlineEditableText
                          value={page.hero.badgeText || "🎈 A MELHOR ESCOLA PARA O SEU FILHO"}
                          onChange={(newVal) => updateP((p) => ({ ...p, hero: { ...p.hero, badgeText: newVal } }))}
                          isEditorPreview={isEditorPreview}
                          tag="span"
                          className="font-bold uppercase tracking-wider text-amber-800"
                        />
                      </div>

                      {/* Headline */}
                      <HeroHeadlineBlock
                        page={page}
                        updateP={updateP}
                        theme={theme}
                        headlineAlign={headlineAlign}
                        isEditorPreview={isEditorPreview}
                        defaultColorClass="text-indigo-950"
                        className="font-black font-display"
                      />

                      {/* Subheadline & Feature Bullets */}
                      <div className={`text-zinc-600 ${getSubheadlineSizeClass(page.hero.subheadlineSize)} ${getHeadingAlignClass(subheadlineAlign)} font-medium leading-relaxed`}>
                        <InlineEditableText
                          value={page.hero.subheadline || "Desenvolvimento integral com carinho, metodologia lúdica e um ambiente 100% acolhedor e seguro."}
                          onChange={(newVal) => updateP((p) => ({ ...p, hero: { ...p.hero, subheadline: newVal } }))}
                          align={subheadlineAlign}
                          fontSize={page.hero.subheadlineSize || "base"}
                          isEditorPreview={isEditorPreview}
                          tag="span"
                        />
                      </div>

                      {/* Cheerful Colored Dots Differential Bullets */}
                      <ul className="space-y-2 text-sm sm:text-base font-semibold text-zinc-700">
                        {[
                          { dot: "bg-emerald-500", text: "Professores especialistas e apaixonados pela infância" },
                          { dot: "bg-cyan-500", text: "Ambiente lúdico 100% monitorado e seguro" },
                          { dot: "bg-amber-500", text: "Oficinas criativas de arte, música e teatro" },
                          { dot: "bg-rose-500", text: "Alimentação saudável balanceada por nutricionista" },
                        ].map((item, idx) => (
                          <li key={idx} className="flex items-center gap-3">
                            <span className={`w-3 h-3 rounded-full ${item.dot} shadow-sm shrink-0`} />
                            <span>{item.text}</span>
                          </li>
                        ))}
                      </ul>

                      {/* Action Buttons (Cyan button + Yellow button) */}
                      <div className="flex flex-wrap items-center gap-4 pt-2">
                        <button
                          type="button"
                          onClick={() => { if (!isEditorPreview) scrollToSection("form-section"); }}
                          className="px-8 py-4 rounded-full bg-cyan-500 hover:bg-cyan-400 text-white font-black text-base shadow-lg shadow-cyan-500/30 transition-all hover:scale-105 cursor-pointer flex items-center gap-2"
                        >
                          <InlineEditableText
                            value={page.hero.ctaText || "MATRICULAR MEU FILHO"}
                            onChange={(newVal) => updateP((p) => ({ ...p, hero: { ...p.hero, ctaText: newVal } }))}
                            isEditorPreview={isEditorPreview}
                            tag="span"
                          />
                          <ArrowRight className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => { if (!isEditorPreview) scrollToSection("features-section"); }}
                          className="px-7 py-4 rounded-full bg-amber-400 hover:bg-amber-300 text-indigo-950 font-black text-base shadow-md transition-all hover:scale-105 cursor-pointer flex items-center gap-2"
                        >
                          <span>CONHECER ESPAÇO</span>
                        </button>
                      </div>
                    </div>

                    {/* Right column: Cheerful cutout with yellow organic shape and doodles */}
                    <div className="lg:col-span-6 relative flex items-center justify-center">
                      {/* Organic Yellow Shape Backdrop */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-amber-400 via-amber-300 to-yellow-400 rounded-[3rem] lg:rounded-[4rem] transform -rotate-2 scale-95 shadow-xl opacity-95" />

                      {/* Doodles & Stickers */}
                      <div className="absolute top-4 left-6 z-20 px-3 py-1 bg-white/90 backdrop-blur-md rounded-2xl text-indigo-900 font-black text-xs shadow-md rotate-[-8deg] border border-amber-200">
                        ABC 123 ✏️
                      </div>
                      <div className="absolute top-6 right-6 z-20 px-3 py-1.5 bg-yellow-100 rounded-full text-amber-900 font-black text-xs shadow-md rotate-[10deg] border border-amber-300 flex items-center gap-1">
                        ⭐ 5.0 Estrelas
                      </div>
                      <div className="absolute bottom-6 left-8 z-20 px-4 py-2 bg-indigo-950 text-white rounded-2xl font-bold text-xs shadow-xl flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Matrículas 2026 Abertas</span>
                      </div>

                      {/* Main Photo */}
                      <div className="relative z-10 p-4 w-full flex items-center justify-center">
                        <img
                          src={page.hero.mediaUrl || "https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?auto=format&fit=crop&w=1000&q=80"}
                          alt="Crianças Felizes na Escola"
                          className="rounded-3xl max-h-[480px] w-full object-cover shadow-2xl border-4 border-white transform hover:scale-[1.02] transition-transform duration-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 4 Floating Feature Cards in bottom row */}
                  <div className="mt-12 pt-8 border-t border-amber-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 relative z-10">
                    {[
                      { title: "Professores Especialistas", subtitle: "Equipe pedagógica qualificada", color: "text-emerald-500 border-emerald-200 bg-emerald-50/50", icon: "🎨" },
                      { title: "Estrutura Completa", subtitle: "Salas temáticas e climatizadas", color: "text-cyan-500 border-cyan-200 bg-cyan-50/50", icon: "📚" },
                      { title: "Diversão & Alegria", subtitle: "Atividades recreativas diárias", color: "text-amber-500 border-amber-200 bg-amber-50/50", icon: "🎪" },
                      { title: "100% Cuidado & Amor", subtitle: "Acolhimento humanizado", color: "text-rose-500 border-rose-200 bg-rose-50/50", icon: "💡" },
                    ].map((card, i) => (
                      <div key={i} className={`p-5 rounded-2xl border bg-white shadow-sm hover:shadow-md transition-all text-center space-y-2 ${card.color}`}>
                        <div className="text-3xl mb-1">{card.icon}</div>
                        <h4 className="font-black text-sm sm:text-base text-zinc-900">{card.title}</h4>
                        <p className="text-xs text-zinc-500 font-medium leading-snug">{card.subtitle}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* ========================================================================= */}
            {/* MODEL 12: PORTFÓLIO DARK & NEON RESUME (ORIX / ALLISON PARKER CV)        */}
            {/* ========================================================================= */}
            {currentHeroModel === "portfolio_dark_neon" && (() => {
              const heroAlign = page.hero.align || "left";
              const headlineAlign = page.hero.headlineAlign || heroAlign;
              const subheadlineAlign = page.hero.subheadlineAlign || heroAlign;

              return (
                <div className="relative w-full rounded-3xl overflow-hidden bg-[#0A0C14] border border-purple-500/30 shadow-2xl transition-all text-white p-6 sm:p-10 lg:p-14 space-y-12">
                  {/* Background Watermark Initial & Purple Neon Glows */}
                  <div className="absolute top-10 right-10 text-[180px] sm:text-[280px] font-black text-purple-900/15 pointer-events-none select-none font-display leading-none">
                    A
                  </div>
                  <div className="absolute top-1/4 right-1/4 w-72 h-72 rounded-full bg-purple-600/20 blur-[100px] pointer-events-none" />

                  {/* Main Hero Grid */}
                  <div className="grid lg:grid-cols-12 gap-10 items-center relative z-10">
                    {/* Left Column: Bio & Contacts */}
                    <div className="lg:col-span-7 space-y-6 text-left">
                      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-950/80 border border-purple-500/40 text-purple-300 font-black text-xs tracking-widest uppercase">
                        <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                        <InlineEditableText
                          value={page.hero.badgeText || "HELLO I'M"}
                          onChange={(newVal) => updateP((p) => ({ ...p, hero: { ...p.hero, badgeText: newVal } }))}
                          isEditorPreview={isEditorPreview}
                          tag="span"
                        />
                      </div>

                      <div className="space-y-2">
                        <HeroHeadlineBlock
                          page={page}
                          updateP={updateP}
                          theme={theme}
                          headlineAlign={headlineAlign}
                          isEditorPreview={isEditorPreview}
                          defaultColorClass="text-white"
                          className="font-black font-display"
                        />
                        <div
                          className={`text-zinc-400 ${getSubheadlineSizeClass(
                            page.hero.subheadlineSize
                          )} ${getHeadingAlignClass(subheadlineAlign)} font-bold leading-relaxed`}
                          style={{
                            fontSize: page.hero.subheadlineFontSizePx ? `${page.hero.subheadlineFontSizePx}px` : undefined,
                          }}
                        >
                          <InlineEditableText
                            value={page.hero.subheadline || "Web Designer & Photographer"}
                            onChange={(newVal) =>
                              updateP((p) => ({ ...p, hero: { ...p.hero, subheadline: newVal } }))
                            }
                            align={subheadlineAlign}
                            fontSize={page.hero.subheadlineSize || "base"}
                            isEditorPreview={isEditorPreview}
                            tag="p"
                          />
                        </div>
                      </div>

                      {/* Contact Highlight Pill */}
                      <div className="inline-block px-4 py-2 rounded-xl bg-purple-950/60 border border-purple-500/50 text-purple-300 font-mono text-sm sm:text-base font-semibold shadow-lg">
                        infoname@domain.com
                      </div>

                      <p className="text-xs sm:text-sm text-zinc-400 font-medium">
                        36 East 8th Street, New York, NY 10003, United States
                      </p>

                      {/* Social Icons + Download CV Button */}
                      <div className="flex flex-wrap items-center gap-4 pt-2">
                        <div className="flex items-center gap-2">
                          {["facebook", "twitter", "vimeo", "linkedin"].map((net, i) => (
                            <button
                              key={i}
                              type="button"
                              className="w-10 h-10 rounded-full bg-zinc-900 hover:bg-purple-600 border border-zinc-800 hover:border-purple-400 flex items-center justify-center text-zinc-300 hover:text-white transition-all cursor-pointer"
                            >
                              <span className="capitalize font-bold text-xs">{net[0].toUpperCase()}</span>
                            </button>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => { if (!isEditorPreview) scrollToSection("form-section"); }}
                          className="px-6 py-3 rounded-full bg-purple-600 hover:bg-purple-500 border border-purple-400 text-white font-black text-sm shadow-xl shadow-purple-600/30 transition-all hover:scale-105 cursor-pointer flex items-center gap-2"
                        >
                          <InlineEditableText
                            value={page.hero.ctaText || "DOWNLOAD CV"}
                            onChange={(newVal) => updateP((p) => ({ ...p, hero: { ...p.hero, ctaText: newVal } }))}
                            isEditorPreview={isEditorPreview}
                            tag="span"
                          />
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Right Column: Creative Cutout Portrait & Neon Radial Element */}
                    <div className="lg:col-span-5 relative flex items-center justify-center">
                      {/* Neon Radial Wheel Backdrop */}
                      <div className="absolute -right-6 top-1/2 -translate-y-1/2 w-48 h-48 sm:w-64 sm:h-64 rounded-full border-8 border-purple-500/30 border-dashed animate-spin-slow pointer-events-none" />

                      <div className="relative z-10 w-full max-w-sm rounded-3xl overflow-hidden border border-purple-500/40 bg-zinc-900/80 shadow-2xl p-2">
                        <img
                          src={page.hero.mediaUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1000&auto=format&fit=crop&q=80"}
                          alt="Portrait Creative"
                          className="rounded-2xl w-full object-cover max-h-[440px]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* About My Resume Section Overlay */}
                  <div className="pt-10 border-t border-purple-900/40 space-y-8 relative z-10">
                    <div className="text-center space-y-2">
                      <div className="inline-flex items-center gap-1.5 text-purple-400 text-xs font-black tracking-widest uppercase">
                        <span className="w-2 h-2 rounded-full bg-purple-500" />
                        WHO I AM
                      </div>
                      <h3 className="text-2xl sm:text-4xl font-black text-white font-display">
                        About My Resume
                      </h3>
                    </div>

                    {/* Details List + Team Workshop Photo */}
                    <div className="grid md:grid-cols-12 gap-6 items-center">
                      {/* Info Pills */}
                      <div className="md:col-span-6 space-y-2.5">
                        {[
                          { label: "Age:", value: "29" },
                          { label: "Residence:", value: "USA" },
                          { label: "Address:", value: "88 Some Street, Some Town" },
                          { label: "E-mail:", value: "email@example.com" },
                          { label: "Phone:", value: "+0123 123 456 789" },
                          { label: "Freelance:", value: "Available 🟢" },
                        ].map((row, i) => (
                          <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs sm:text-sm">
                            <span className="text-zinc-400 font-bold">{row.label}</span>
                            <span className="text-white font-semibold">{row.value}</span>
                          </div>
                        ))}
                      </div>

                      {/* Grayscale Meeting Photo */}
                      <div className="md:col-span-6 rounded-2xl overflow-hidden border border-zinc-800 shadow-xl max-h-64">
                        <img
                          src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=80"
                          alt="Creative Workshop"
                          className="w-full h-full object-cover grayscale contrast-125"
                        />
                      </div>
                    </div>

                    {/* 4 Glowing Neon Percentage Boxes */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        { pct: "50%", title: "Graphic Design" },
                        { pct: "75%", title: "Development" },
                        { pct: "38%", title: "Marketing Ideas" },
                        { pct: "63%", title: "Web Management" },
                      ].map((box, i) => (
                        <div key={i} className="p-6 rounded-2xl bg-zinc-900/90 border-2 border-purple-500/60 shadow-lg shadow-purple-900/20 text-center space-y-1 hover:border-purple-400 transition-colors">
                          <div className="text-2xl sm:text-3xl font-black text-white font-display">
                            {box.pct}
                          </div>
                          <div className="text-xs text-zinc-400 font-bold uppercase tracking-wider">
                            {box.title}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ========================================================================= */}
            {/* MODEL 13: PESQUISA & DIAGNÓSTICO (TEMA CLARO - MODELO PESQUISA CLARA)    */}
            {/* ========================================================================= */}
            {currentHeroModel === "survey_hero_light" && (() => {
              const heroAlign = page.hero.align || "left";
              const headlineAlign = page.hero.headlineAlign || heroAlign;
              const subheadlineAlign = page.hero.subheadlineAlign || heroAlign;

              return (
                <div className="relative w-full rounded-3xl overflow-hidden bg-slate-50 border border-slate-200/90 shadow-xl transition-all text-slate-900 p-6 sm:p-10 lg:p-14 space-y-10">
                  {/* Decorative Light Elements */}
                  <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-100/60 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
                  <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-100/50 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

                  <div className="grid lg:grid-cols-12 gap-10 items-center relative z-10">
                    {/* Left Column: Hero Content */}
                    <div className="lg:col-span-7 space-y-6 text-left">
                      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 font-extrabold text-xs tracking-wider uppercase shadow-sm">
                        <ClipboardList className="w-4 h-4 text-indigo-600 animate-pulse" />
                        <InlineEditableText
                          value={page.hero.badgeText || "📋 PESQUISA & BRINDE EXCLUSIVO"}
                          onChange={(newVal) => updateP((p) => ({ ...p, hero: { ...p.hero, badgeText: newVal } }))}
                          isEditorPreview={isEditorPreview}
                          tag="span"
                        />
                      </div>

                      <div className="space-y-3">
                        <HeroHeadlineBlock
                          page={page}
                          updateP={updateP}
                          theme={theme}
                          headlineAlign={headlineAlign}
                          isEditorPreview={isEditorPreview}
                          defaultColorClass="text-slate-900"
                          className="font-extrabold font-display leading-tight"
                        />
                        <div
                          className={`text-slate-600 ${getSubheadlineSizeClass(
                            page.hero.subheadlineSize
                          )} ${getHeadingAlignClass(subheadlineAlign)} font-medium leading-relaxed`}
                          style={{
                            fontSize: page.hero.subheadlineFontSizePx ? `${page.hero.subheadlineFontSizePx}px` : undefined,
                          }}
                        >
                          <InlineEditableText
                            value={page.hero.subheadline || "Participe da pesquisa, informe seu WhatsApp para registro e libere seu presente/voucher imediatamente ao concluir."}
                            onChange={(newVal) => updateP((p) => ({ ...p, hero: { ...p.hero, subheadline: newVal } }))}
                            align={subheadlineAlign}
                            fontSize={page.hero.subheadlineSize || "base"}
                            isEditorPreview={isEditorPreview}
                            tag="p"
                          />
                        </div>
                      </div>

                      {/* Action Button: Opens Lead Registration Card */}
                      <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                        <button
                          type="button"
                          onClick={openSurveyFlow}
                          className="px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold text-base shadow-lg shadow-indigo-600/30 transition-all cursor-pointer flex items-center justify-center gap-3 border border-indigo-500"
                        >
                          <ClipboardList className="w-5 h-5 text-indigo-200" />
                          <InlineEditableText
                            value={page.hero.ctaText || "INICIAR PESQUISA & RESGATAR BRINDE"}
                            onChange={(newVal) => updateP((p) => ({ ...p, hero: { ...p.hero, ctaText: newVal } }))}
                            isEditorPreview={isEditorPreview}
                            tag="span"
                          />
                          <ArrowRight className="w-5 h-5 text-indigo-200" />
                        </button>
                      </div>

                      {/* Micro Proof Items */}
                      <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center gap-6 text-xs text-slate-500 font-semibold">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Leva menos de 2 minutos</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-indigo-600" />
                          <span>100% Gratuito e Seguro</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Gift className="w-4 h-4 text-amber-500" />
                          <span>Brinde Liberado na Hora</span>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Gift & Survey Preview Box */}
                    <div className="lg:col-span-5 relative">
                      <div className="relative z-10 rounded-3xl bg-white border border-slate-200 p-6 shadow-2xl space-y-5 text-slate-900">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                          <div className="flex items-center gap-3">
                            <div className="p-3 rounded-2xl bg-amber-100 text-amber-700 border border-amber-200">
                              <Gift className="w-6 h-6" />
                            </div>
                            <div>
                              <h4 className="font-bold text-sm text-slate-900">Brinde de Participação</h4>
                              <p className="text-xs text-slate-500">Resgaste ao concluir as perguntas</p>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-bold">
                            100% Liberado
                          </span>
                        </div>

                        {/* Gift Preview Card Image or Mockup */}
                        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 p-6 text-white text-center space-y-3 shadow-md">
                          <div className="w-12 h-12 mx-auto rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white">
                            <Sparkles className="w-6 h-6 text-amber-300" />
                          </div>
                          <h5 className="font-extrabold text-base sm:text-lg">Voucher & Kit Digital de Presente</h5>
                          <p className="text-xs text-indigo-100">
                            Responda o formulário para liberar o download em PDF ou cupom exclusivo.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={openSurveyFlow}
                          className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-2"
                        >
                          <ClipboardList className="w-4 h-4 text-amber-400" />
                          <span>Preencher Nome e WhatsApp para Começar</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ========================================================================= */}
            {/* MODEL 14: PESQUISA & DIAGNÓSTICO (TEMA ESCURO - DARK NEON)                 */}
            {/* ========================================================================= */}
            {currentHeroModel === "survey_hero_dark" && (() => {
              const heroAlign = page.hero.align || "left";
              const headlineAlign = page.hero.headlineAlign || heroAlign;
              const subheadlineAlign = page.hero.subheadlineAlign || heroAlign;

              return (
                <div className="relative w-full rounded-3xl overflow-hidden bg-[#070B14] border border-purple-500/30 shadow-2xl transition-all text-white p-6 sm:p-10 lg:p-14 space-y-10">
                  {/* Ambient Neon Backdrops */}
                  <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-600/15 rounded-full blur-[140px] pointer-events-none -mr-40 -mt-40" />
                  <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none -ml-40 -mb-40" />

                  <div className="grid lg:grid-cols-12 gap-10 items-center relative z-10">
                    {/* Left Column: Hero Content */}
                    <div className="lg:col-span-7 space-y-6 text-left">
                      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-950/80 border border-purple-500/40 text-purple-300 font-extrabold text-xs tracking-widest uppercase shadow-lg shadow-purple-900/20">
                        <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                        <InlineEditableText
                          value={page.hero.badgeText || "⚡ PESQUISA VIP DE QUALIFICAÇÃO & BRINDE"}
                          onChange={(newVal) => updateP((p) => ({ ...p, hero: { ...p.hero, badgeText: newVal } }))}
                          isEditorPreview={isEditorPreview}
                          tag="span"
                        />
                      </div>

                      <div className="space-y-3">
                        <HeroHeadlineBlock
                          page={page}
                          updateP={updateP}
                          theme={theme}
                          headlineAlign={headlineAlign}
                          isEditorPreview={isEditorPreview}
                          defaultColorClass="text-white"
                          className="font-extrabold font-display leading-tight"
                        />
                        <div
                          className={`text-zinc-300 ${getSubheadlineSizeClass(
                            page.hero.subheadlineSize
                          )} ${getHeadingAlignClass(subheadlineAlign)} font-medium leading-relaxed`}
                          style={{
                            fontSize: page.hero.subheadlineFontSizePx ? `${page.hero.subheadlineFontSizePx}px` : undefined,
                          }}
                        >
                          <InlineEditableText
                            value={page.hero.subheadline || "Cadastre seu Nome, Email e WhatsApp para iniciar a pesquisa e liberar o presente exclusivo na tela de conclusão."}
                            onChange={(newVal) => updateP((p) => ({ ...p, hero: { ...p.hero, subheadline: newVal } }))}
                            align={subheadlineAlign}
                            fontSize={page.hero.subheadlineSize || "base"}
                            isEditorPreview={isEditorPreview}
                            tag="p"
                          />
                        </div>
                      </div>

                      {/* Action Button: Opens Lead Registration Card */}
                      <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                        <button
                          type="button"
                          onClick={openSurveyFlow}
                          className="px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 active:scale-95 text-white font-extrabold text-base shadow-2xl shadow-purple-600/40 transition-all cursor-pointer flex items-center justify-center gap-3 border border-purple-400/30"
                        >
                          <Gift className="w-5 h-5 text-amber-300" />
                          <InlineEditableText
                            value={page.hero.ctaText || "INICIAR PESQUISA & LIBERAR BRINDE"}
                            onChange={(newVal) => updateP((p) => ({ ...p, hero: { ...p.hero, ctaText: newVal } }))}
                            isEditorPreview={isEditorPreview}
                            tag="span"
                          />
                          <ArrowRight className="w-5 h-5 text-purple-200" />
                        </button>
                      </div>

                      {/* Micro Proof */}
                      <div className="pt-4 border-t border-zinc-800/80 flex flex-wrap items-center gap-6 text-xs text-zinc-400 font-semibold">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                          <span className="text-zinc-200">+2.850 Respostas Gravadas</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-purple-400" />
                          <span>Garantia de Qualidade & Privacidade</span>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Dark Glassmorphism Reward Box */}
                    <div className="lg:col-span-5 relative">
                      <div className="relative z-10 rounded-3xl bg-zinc-900/90 border border-purple-500/30 p-6 shadow-2xl backdrop-blur-xl space-y-5 text-white">
                        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                          <div className="flex items-center gap-3">
                            <div className="p-3 rounded-2xl bg-purple-900/50 text-amber-400 border border-purple-500/40">
                              <Gift className="w-6 h-6" />
                            </div>
                            <div>
                              <h4 className="font-bold text-sm text-zinc-100">Presente VIP</h4>
                              <p className="text-xs text-zinc-400">Liberado ao concluir as perguntas</p>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold">
                            Acesso Imediato
                          </span>
                        </div>

                        {/* Dark Card Reward Preview */}
                        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-purple-950/80 via-zinc-900 to-purple-900/60 border border-purple-500/30 p-6 text-center space-y-3 shadow-inner">
                          <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
                            <Gift className="w-6 h-6" />
                          </div>
                          <h5 className="font-extrabold text-base sm:text-lg text-white">Voucher VIP & Material Exclusivo</h5>
                          <p className="text-xs text-zinc-300">
                            Cadastre seus dados para acionar o questionário e resgatar o voucher na última tela.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={openSurveyFlow}
                          className="w-full py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-2 border border-purple-400/30 shadow-lg"
                        >
                          <ClipboardList className="w-4 h-4 text-amber-300" />
                          <span>Abrir Formulário para Iniciar</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
            {renderSectionFloatingImages("hero")}
          </section>
        );

      case "socialProof":
        if (!visibility.socialProof || !page.socialProof) return null;
        const socialIndex = sectionOrder.indexOf("socialProof");
        return (
          <section
            key="socialProof"
            id="social-proof-section"
            onClick={() => isEditorPreview && onSelectSection?.("socialProof")}
            className={`py-14 px-4 sm:px-6 ${getContainerWidthClass(
              page.socialProof.containerWidth
            )} mx-auto relative ${
              showSectionTools
                ? "cursor-pointer ring-1 ring-zinc-800/80 hover:ring-purple-500/50 rounded-3xl transition-all p-4 mb-6"
                : ""
            } ${activeSection === "socialProof" && showSectionTools ? "ring-2 ring-purple-500 bg-purple-950/10 shadow-2xl z-[999]" : "z-10"}`}
          >
            {/* Quick Floating Controls Bar in Editor */}
            {showSectionTools && (
              <SectionControlToolbar
                sectionId="socialProof"
                sectionTitle="PROVA SOCIAL, LOGOS & MÉTRICAS"
                icon={<Building className="w-3.5 h-3.5 text-purple-400" />}
                sectionIndex={socialIndex}
                totalSections={sectionOrder.length}
                onMoveSection={(dir) => handleMoveSection("socialProof", dir)}
                containerWidth={page.socialProof.containerWidth || "normal"}
                onChangeContainerWidth={(w) =>
                  updateP((p) => ({ ...p, socialProof: { ...p.socialProof, containerWidth: w } }))
                }
                align={page.socialProof.align || "center"}
                onChangeAlign={(a) =>
                  updateP((p) => ({ ...p, socialProof: { ...p.socialProof, align: a } }))
                }
                cardPadding={page.socialProof.cardPadding || "normal"}
                onChangeCardPadding={(pad) =>
                  updateP((p) => ({ ...p, socialProof: { ...p.socialProof, cardPadding: pad } }))
                }
                cardRadius={page.socialProof.cardRadius || "xl"}
                onChangeCardRadius={(rad) =>
                  updateP((p) => ({ ...p, socialProof: { ...p.socialProof, cardRadius: rad } }))
                }
                onHideSection={() =>
                  updateP((p) => ({ ...p, visibility: { ...p.visibility, socialProof: false } }))
                }
                customActions={
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenLogoManager?.();
                    }}
                    className="px-2.5 py-1 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer shadow"
                  >
                    <Palette className="w-3 h-3" />
                    Logos & Cores
                  </button>
                }
              />
            )}

            {/* Marquee Title */}
            <div className={`mb-8 ${getHeadingAlignClass(page.socialProof.align)}`}>
              <InlineEditableText
                value={page.socialProof.marqueeTitle || "CONFIADO POR MAIS DE 500+ EMPRESAS LÍDERES NO BRASIL"}
                onChange={(newVal) =>
                  updateP((p) => ({ ...p, socialProof: { ...p.socialProof, marqueeTitle: newVal } }))
                }
                isEditorPreview={isEditorPreview}
                tag="h2"
                className={`text-xs sm:text-sm font-extrabold uppercase tracking-widest ${
                  page.theme === "light" ? "text-[#2D3136]" : "text-zinc-400"
                } max-w-xl mx-auto`}
                placeholder="Título da Prova Social..."
              />
            </div>

            {/* Animated or Static Logo Marquee */}
            {(() => {
              const speedKey = page.socialProof.marqueeSpeed || "medium";
              const isStopped = speedKey === "stopped";
              const maskClass = isStopped ? "" : "mask-gradient";

              return (
                <div className={`relative overflow-hidden py-4 mb-14 border-y rounded-2xl ${maskClass} ${
                  page.theme === "light"
                    ? "border-zinc-200/80 bg-zinc-100/50"
                    : "border-zinc-800/60 bg-zinc-950/40"
                }`}>
                  {(() => {
                    const logoSizeKey = page.socialProof.logoSize || "sm";
                    const imgHeightClass =
                      logoSizeKey === "xs"
                        ? "h-5 sm:h-6"
                        : logoSizeKey === "md"
                        ? "h-10 sm:h-12"
                        : logoSizeKey === "lg"
                        ? "h-14 sm:h-16"
                        : logoSizeKey === "xl"
                        ? "h-20 sm:h-24"
                        : "h-7 sm:h-8";

                    const iconSizeClass =
                      logoSizeKey === "xs"
                        ? "w-3.5 h-3.5"
                        : logoSizeKey === "md"
                        ? "w-6 h-6"
                        : logoSizeKey === "lg"
                        ? "w-8 h-8"
                        : logoSizeKey === "xl"
                        ? "w-10 h-10"
                        : "w-4.5 h-4.5";

                    const textSizeClass =
                      logoSizeKey === "xs"
                        ? "text-xs"
                        : logoSizeKey === "md"
                        ? "text-base sm:text-lg font-extrabold"
                        : logoSizeKey === "lg"
                        ? "text-xl sm:text-2xl font-extrabold"
                        : logoSizeKey === "xl"
                        ? "text-2xl sm:text-3xl font-black"
                        : "text-sm sm:text-base font-bold";

                    const gapClass =
                      logoSizeKey === "xs"
                        ? "gap-6 sm:gap-8 pr-6 sm:pr-8"
                        : logoSizeKey === "md"
                        ? "gap-12 sm:gap-14 pr-12 sm:pr-14"
                        : logoSizeKey === "lg"
                        ? "gap-14 sm:gap-18 pr-14 sm:pr-18"
                        : logoSizeKey === "xl"
                        ? "gap-16 sm:gap-22 pr-16 sm:pr-22"
                        : "gap-10 sm:gap-12 pr-10 sm:pr-12";

                    const renderLogosGroup = (keyPrefix: string, isStaticMode = false) => {
                      const logoItems = page.socialProof.logoItems;
                      if (logoItems && logoItems.length > 0) {
                        let listToRender = logoItems;
                        if (!isStaticMode) {
                          let expanded = [...logoItems];
                          while (expanded.length < 8) {
                            expanded = [...expanded, ...logoItems];
                          }
                          listToRender = expanded;
                        }

                        return listToRender.map((item, idx) => {
                          const mode = item.colorMode || page.socialProof.logoColorMode || "accent";
                          if (item.type === "image" && item.imageUrl) {
                            return (
                              <div key={`${keyPrefix}-${item.id || idx}-${idx}`} className="flex items-center gap-2 py-1 shrink-0">
                                <img
                                  src={item.imageUrl}
                                  alt={item.text}
                                  className={`${imgHeightClass} w-auto object-contain transition-all ${
                                    mode === "original"
                                      ? "filter opacity-90 hover:opacity-100"
                                      : mode === "monochrome"
                                      ? (page.theme === "light" ? "filter grayscale contrast-200 brightness-0 opacity-90 hover:opacity-100" : "filter grayscale contrast-200 brightness-200 opacity-80")
                                      : (page.theme === "light" ? "filter contrast-125 opacity-90" : "filter brightness-200 contrast-125 opacity-90")
                                  }`}
                                />
                              </div>
                            );
                          }
                          return (
                            <div
                              key={`${keyPrefix}-${item.id || idx}-${idx}`}
                              className={`flex items-center gap-2 transition-all duration-300 py-1 shrink-0 ${
                                mode === "accent"
                                  ? `opacity-90 hover:opacity-100 ${theme.iconText}`
                                  : mode === "monochrome"
                                  ? (page.theme === "light" ? "opacity-90 hover:opacity-100 text-[#2D3136] font-bold" : "opacity-60 hover:opacity-100 text-zinc-400")
                                  : (page.theme === "light" ? "opacity-95 hover:opacity-100 text-[#2D3136] font-extrabold" : "opacity-80 hover:opacity-100 text-zinc-200")
                              }`}
                            >
                              <DynamicIcon name="Building" className={iconSizeClass} />
                              <span className={`${textSizeClass} tracking-tight whitespace-nowrap`}>
                                {item.text}
                              </span>
                            </div>
                          );
                        });
                      }

                      const rawLogos =
                        page.socialProof.marqueeLogos && page.socialProof.marqueeLogos.length > 0
                          ? page.socialProof.marqueeLogos
                          : POPULAR_LOGO_PRESETS.map((p) => p.name).slice(0, 6);

                      let listToRender = rawLogos;
                      if (!isStaticMode) {
                        let expandedRaw = [...rawLogos];
                        while (expandedRaw.length < 8) {
                          expandedRaw = [...expandedRaw, ...rawLogos];
                        }
                        listToRender = expandedRaw;
                      }

                      return listToRender.map((logoName, idx) => (
                        <div
                          key={`${keyPrefix}-${idx}`}
                          className={`flex items-center gap-2 transition-all duration-300 py-1 shrink-0 ${
                            (page.socialProof.logoColorMode || "original") === "accent"
                              ? `opacity-90 hover:opacity-100 ${theme.iconText}`
                              : page.theme === "light"
                              ? "opacity-95 hover:opacity-100 text-[#2D3136] font-extrabold"
                              : "opacity-70 hover:opacity-100 text-zinc-300"
                          }`}
                        >
                          <DynamicIcon name="Building" className={iconSizeClass} />
                          <span className={`${textSizeClass} tracking-tight whitespace-nowrap`}>
                            {logoName}
                          </span>
                        </div>
                      ));
                    };

                    if (isStopped) {
                      return (
                        <div className="w-full flex flex-wrap items-center justify-center gap-6 sm:gap-10 md:gap-14 px-4 select-none">
                          {renderLogosGroup("static", true)}
                        </div>
                      );
                    }

                    const speedAnimationClass =
                      speedKey === "slow"
                        ? "animate-marquee-slow"
                        : speedKey === "fast"
                        ? "animate-marquee-fast"
                        : "animate-marquee-medium";

                    return (
                      <div className={`flex w-max ${speedAnimationClass} items-center select-none`}>
                        <div className={`flex items-center ${gapClass} shrink-0`}>
                          {renderLogosGroup("t1")}
                        </div>
                        <div className={`flex items-center ${gapClass} shrink-0`} aria-hidden="true">
                          {renderLogosGroup("t2")}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })()}

            {/* Numerical Proof Metric Cards */}
            <div className={`grid ${isMobile ? "grid-cols-1" : isTablet ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"} gap-3 sm:gap-4 max-w-6xl mx-auto`}>
              {page.socialProof.metrics?.map((metric, idx) => (
                <div
                  key={metric.id || idx}
                  className={`${getPaddingClass(page.socialProof.cardPadding)} ${getRadiusClass(
                    page.socialProof.cardRadius
                  )} ${getThemeCardBgClass(page.accentColor, page.theme)} relative group/card flex flex-col justify-between hover:border-purple-500/40 transition-all ${getAlignClass(
                    page.socialProof.align
                  )}`}
                  style={page.theme === "light" && page.customAccentHex ? {
                    backgroundColor: `${page.customAccentHex}10`,
                    borderColor: `${page.customAccentHex}35`
                  } : undefined}
                >
                  {/* Metric Action Controls in Editor */}
                  {isEditorPreview && (
                    <div className="opacity-0 group-hover/card:opacity-100 transition-opacity absolute top-2 right-2 z-20 flex items-center gap-1 p-0.5 rounded-lg bg-zinc-950/95 border border-zinc-800 shadow-xl">
                      {/* Move Left */}
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (idx > 0) {
                            const next = [...page.socialProof.metrics];
                            const [m] = next.splice(idx, 1);
                            next.splice(idx - 1, 0, m);
                            updateP((p) => ({ ...p, socialProof: { ...p.socialProof, metrics: next } }));
                          }
                        }}
                        className={`p-1 rounded bg-zinc-900 ${
                          idx === 0 ? "opacity-30 cursor-not-allowed" : "text-zinc-300 hover:text-white hover:bg-purple-600 cursor-pointer"
                        }`}
                        title="Mover Métrica para a Esquerda"
                      >
                        <MoveLeft className="w-3 h-3" />
                      </button>

                      {/* Move Right */}
                      <button
                        type="button"
                        disabled={idx >= (page.socialProof.metrics?.length || 0) - 1}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (idx < (page.socialProof.metrics?.length || 0) - 1) {
                            const next = [...page.socialProof.metrics];
                            const [m] = next.splice(idx, 1);
                            next.splice(idx + 1, 0, m);
                            updateP((p) => ({ ...p, socialProof: { ...p.socialProof, metrics: next } }));
                          }
                        }}
                        className={`p-1 rounded bg-zinc-900 ${
                          idx >= (page.socialProof.metrics?.length || 0) - 1
                            ? "opacity-30 cursor-not-allowed"
                            : "text-zinc-300 hover:text-white hover:bg-purple-600 cursor-pointer"
                        }`}
                        title="Mover Métrica para a Direita"
                      >
                        <MoveRight className="w-3 h-3" />
                      </button>

                      {/* Duplicate */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const copy = { ...metric, id: `metric_${Date.now()}` };
                          const next = [
                            ...page.socialProof.metrics.slice(0, idx + 1),
                            copy,
                            ...page.socialProof.metrics.slice(idx + 1),
                          ];
                          updateP((p) => ({ ...p, socialProof: { ...p.socialProof, metrics: next } }));
                        }}
                        className="p-1 rounded bg-zinc-900 text-zinc-300 hover:text-white hover:bg-purple-600 cursor-pointer"
                        title="Duplicar Métrica"
                      >
                        <Copy className="w-3 h-3" />
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateP((p) => ({
                            ...p,
                            socialProof: {
                              ...p.socialProof,
                              metrics: p.socialProof.metrics.filter((_, i) => i !== idx),
                            },
                          }));
                        }}
                        className="p-1 rounded bg-zinc-900 text-red-400 hover:text-white hover:bg-red-600 cursor-pointer"
                        title="Excluir Métrica"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  <div
                    className={`text-2xl sm:text-3xl font-extrabold mb-1 ${
                      page.theme === "light" ? "font-black" : theme.headingGradient || "text-white"
                    }`}
                    style={page.theme === "light" ? { color: page.customAccentHex || theme.primaryHex } : undefined}
                  >
                    <InlineEditableText
                      value={metric.value}
                      onChange={(newVal) =>
                        updateP((p) => {
                          const nextMetrics = [...page.socialProof.metrics];
                          nextMetrics[idx] = { ...nextMetrics[idx], value: newVal };
                          return { ...p, socialProof: { ...p.socialProof, metrics: nextMetrics } };
                        })
                      }
                      isEditorPreview={isEditorPreview}
                      tag="span"
                      placeholder="Ex: R$ 10M+"
                    />
                  </div>

                  <div className={`text-xs sm:text-sm font-semibold mb-0.5 ${page.theme === "light" ? "text-zinc-950" : "text-zinc-200"}`}>
                    <InlineEditableText
                      value={metric.label}
                      onChange={(newVal) =>
                        updateP((p) => {
                          const nextMetrics = [...page.socialProof.metrics];
                          nextMetrics[idx] = { ...nextMetrics[idx], label: newVal };
                          return { ...p, socialProof: { ...p.socialProof, metrics: nextMetrics } };
                        })
                      }
                      isEditorPreview={isEditorPreview}
                      tag="div"
                      placeholder="Ex: Gerados para Clientes"
                    />
                  </div>

                  {metric.sublabel && (
                    <div className={`text-[11px] ${page.theme === "light" ? "text-zinc-700" : "text-zinc-500"}`}>
                      <InlineEditableText
                        value={metric.sublabel}
                        onChange={(newVal) =>
                          updateP((p) => {
                            const nextMetrics = [...page.socialProof.metrics];
                            nextMetrics[idx] = { ...nextMetrics[idx], sublabel: newVal };
                            return { ...p, socialProof: { ...p.socialProof, metrics: nextMetrics } };
                          })
                        }
                        isEditorPreview={isEditorPreview}
                        tag="span"
                        placeholder="Sublabel..."
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add Metric Button in Editor */}
            {isEditorPreview && (
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const newMetric: MetricItem = {
                      id: `metric_${Date.now()}`,
                      value: "+99.8%",
                      label: "Nova Métrica de Impacto",
                      sublabel: "Comprovado em testes reais",
                    };
                    updateP((p) => ({
                      ...p,
                      socialProof: {
                        ...p.socialProof,
                        metrics: [...(p.socialProof.metrics || []), newMetric],
                      },
                    }));
                  }}
                  className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-purple-400 border border-purple-500/30 text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Adicionar Nova Métrica</span>
                </button>
              </div>
            )}
            {renderSectionFloatingImages("socialProof")}
          </section>
        );

      case "quiz":
        if (!visibility.quiz || !page.quiz?.questions || page.quiz.questions.length === 0) return null;
        const quizIndex = sectionOrder.indexOf("quiz");
        const currentQ = page.quiz.questions[currentQuizStep] || page.quiz.questions[0];

        return (
          <section
            key="quiz"
            id="quiz-section"
            onClick={() => isEditorPreview && onSelectSection?.("quiz")}
            className={`py-16 px-4 sm:px-6 ${getContainerWidthClass(
              page.quiz.containerWidth
            )} mx-auto relative ${
              showSectionTools
                ? "cursor-pointer ring-1 ring-zinc-800/80 hover:ring-purple-500/50 rounded-3xl transition-all p-4 mb-6"
                : ""
            } ${activeSection === "quiz" && showSectionTools ? "ring-2 ring-purple-500 bg-purple-950/10 shadow-2xl z-[999]" : "z-10"}`}
          >
            {/* Quick Floating Controls Bar in Editor */}
            {showSectionTools && (
              <SectionControlToolbar
                sectionId="quiz"
                sectionTitle="QUIZ DE QUALIFICAÇÃO CRO"
                icon={<Flame className="w-3.5 h-3.5 text-purple-400" />}
                sectionIndex={quizIndex}
                totalSections={sectionOrder.length}
                onMoveSection={(dir) => handleMoveSection("quiz", dir)}
                containerWidth={page.quiz.containerWidth || "normal"}
                onChangeContainerWidth={(w) =>
                  updateP((p) => ({ ...p, quiz: { ...p.quiz, containerWidth: w } }))
                }
                align={page.quiz.align || "center"}
                onChangeAlign={(a) =>
                  updateP((p) => ({ ...p, quiz: { ...p.quiz, align: a } }))
                }
                cardPadding={page.quiz.cardPadding || "normal"}
                onChangeCardPadding={(pad) =>
                  updateP((p) => ({ ...p, quiz: { ...p.quiz, cardPadding: pad } }))
                }
                cardRadius={page.quiz.cardRadius || "xl"}
                onChangeCardRadius={(rad) =>
                  updateP((p) => ({ ...p, quiz: { ...p.quiz, cardRadius: rad } }))
                }
                onHideSection={() =>
                  updateP((p) => ({ ...p, visibility: { ...p.visibility, quiz: false } }))
                }
                customActions={
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const newQ: QuizQuestion = {
                        id: `q_${Date.now()}`,
                        question: "Qual é o seu principal desafio atualmente?",
                        description: "Selecione a opção mais aderente ao seu negócio:",
                        options: [
                          { id: "opt1", label: "Gerar leads qualificados", badge: "Alta Escala", iconName: "TrendingUp" },
                          { id: "opt2", label: "Aumentar a conversão da página", badge: "Conversão", iconName: "Zap" },
                        ],
                      };
                      updateP((p) => ({
                        ...p,
                        quiz: { ...p.quiz, questions: [...p.quiz.questions, newQ] },
                      }));
                      setCurrentQuizStep(page.quiz.questions.length);
                    }}
                    className="px-2.5 py-1 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer shadow"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Pergunta</span>
                  </button>
                }
              />
            )}

            {/* Quiz Title & Subtitle */}
            <div className={`mb-10 ${getHeadingAlignClass(page.quiz.align)}`}>
              <DraggableElement
                {...getDraggableProps("quiz-badge")}
                align={page.quiz.align || "center"}
                onChangeAlign={(a) => {
                  updateP((p) => ({ ...p, quiz: { ...p.quiz, align: a } }));
                }}
                isEditorPreview={isEditorPreview}
                label="Badge do Quiz"
                inline
                className="mb-3"
              >
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                  page.theme === "light"
                    ? "bg-amber-100 border border-amber-200 text-amber-700"
                    : "bg-zinc-900 border border-zinc-800 text-amber-400"
                }`}>
                  <Flame className="w-3.5 h-3.5" />
                  <span>DIAGNÓSTICO ESTRATÉGICO PERSONALIZADO</span>
                </div>
              </DraggableElement>

              <DraggableElement
                {...getDraggableProps("quiz-title")}
                align={page.quiz.align || "center"}
                onChangeAlign={(a) => {
                  updateP((p) => ({ ...p, quiz: { ...p.quiz, align: a } }));
                }}
                isEditorPreview={isEditorPreview}
                label="Título do Quiz"
                className="w-full mb-3"
              >
                <div className={`text-2xl sm:text-4xl font-extrabold ${
                  page.theme === "light" ? "text-zinc-900" : "text-white"
                } w-full text-center`}>
                  <InlineEditableText
                    value={page.quiz.title || "Descubra o Plano Ideal Para o Seu Negócio"}
                    onChange={(newVal) =>
                      updateP((p) => ({ ...p, quiz: { ...p.quiz, title: newVal } }))
                    }
                    align={page.quiz.align || "center"}
                    onAlignChange={(newAlign) =>
                      updateP((p) => ({ ...p, quiz: { ...p.quiz, align: newAlign } }))
                    }
                    isEditorPreview={isEditorPreview}
                    tag="h2"
                    placeholder="Título do Quiz..."
                    fieldLabel="Título do Quiz"
                  />
                </div>
              </DraggableElement>

              <DraggableElement
                {...getDraggableProps("quiz-subtitle")}
                align={page.quiz.align || "center"}
                onChangeAlign={(a) => {
                  updateP((p) => ({ ...p, quiz: { ...p.quiz, align: a } }));
                }}
                isEditorPreview={isEditorPreview}
                label="Subtítulo do Quiz"
                className="w-full max-w-2xl mx-auto"
              >
                <div className={`text-sm sm:text-base w-full ${
                  page.theme === "light" ? "text-zinc-600" : "text-zinc-400"
                } text-center`}>
                  <InlineEditableText
                    value={page.quiz.subtitle || "Responda a perguntas rápidas para desbloquear sua condição exclusiva:"}
                    onChange={(newVal) =>
                      updateP((p) => ({ ...p, quiz: { ...p.quiz, subtitle: newVal } }))
                    }
                    align={page.quiz.align || "center"}
                    onAlignChange={(newAlign) =>
                      updateP((p) => ({ ...p, quiz: { ...p.quiz, align: newAlign } }))
                    }
                    isEditorPreview={isEditorPreview}
                    tag="p"
                    placeholder="Subtítulo do Quiz..."
                  />
                </div>
              </DraggableElement>
            </div>

            {/* Step Switcher Bar in Editor with Move Questions */}
            {isEditorPreview && (
              <div className="flex items-center justify-center gap-2 mb-6 p-2 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex-wrap">
                <span className="text-xs text-zinc-400 font-semibold mr-1">Etapas:</span>
                {page.quiz.questions.map((_, qIdx) => (
                  <div key={qIdx} className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentQuizStep(qIdx);
                      }}
                      className={`px-3 py-1 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                        currentQuizStep === qIdx
                          ? "bg-purple-600 text-white shadow"
                          : "bg-zinc-800 text-zinc-400 hover:text-white"
                      }`}
                    >
                      Etapa {qIdx + 1}
                    </button>

                    {/* Move question left/right */}
                    {currentQuizStep === qIdx && page.quiz.questions.length > 1 && (
                      <div className="flex items-center gap-0.5 bg-zinc-950 rounded-lg p-0.5 border border-zinc-800">
                        <button
                          type="button"
                          disabled={qIdx === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (qIdx > 0) {
                              const qs = [...page.quiz.questions];
                              const [m] = qs.splice(qIdx, 1);
                              qs.splice(qIdx - 1, 0, m);
                              updateP((p) => ({ ...p, quiz: { ...p.quiz, questions: qs } }));
                              setCurrentQuizStep(qIdx - 1);
                            }
                          }}
                          className="p-1 text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer"
                          title="Mover Pergunta para Trás"
                        >
                          <MoveLeft className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          disabled={qIdx >= page.quiz.questions.length - 1}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (qIdx < page.quiz.questions.length - 1) {
                              const qs = [...page.quiz.questions];
                              const [m] = qs.splice(qIdx, 1);
                              qs.splice(qIdx + 1, 0, m);
                              updateP((p) => ({ ...p, quiz: { ...p.quiz, questions: qs } }));
                              setCurrentQuizStep(qIdx + 1);
                            }
                          }}
                          className="p-1 text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer"
                          title="Mover Pergunta para Frente"
                        >
                          <MoveRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Active Question Box */}
            <div
              className={`max-w-2xl mx-auto ${getRadiusClass(page.quiz.cardRadius)} ${getPaddingClass(
                page.quiz.cardPadding
              )} ${
                page.theme === "light"
                  ? "bg-white border border-zinc-200 shadow-xl"
                  : "bg-zinc-900/80 border border-zinc-800/90 backdrop-blur-xl shadow-2xl"
              } relative`}
            >
              {/* Question counter & progress */}
              <div className={`flex items-center justify-between mb-6 pb-4 border-b ${
                page.theme === "light" ? "border-zinc-100" : "border-zinc-800"
              }`}>
                <span className={`text-xs font-bold uppercase tracking-wider ${
                  page.theme === "light" ? "text-purple-600" : "text-purple-400"
                }`}>
                  Etapa {currentQuizStep + 1} de {page.quiz.questions.length}
                </span>
                <div className="flex gap-1.5">
                  {page.quiz.questions.map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        idx === currentQuizStep
                          ? "w-8 shadow-sm"
                          : idx < currentQuizStep
                          ? (page.theme === "light" ? "w-4 bg-zinc-300" : "w-4 bg-zinc-700")
                          : (page.theme === "light" ? "w-4 bg-zinc-200" : "w-4 bg-zinc-800")
                      }`}
                      style={
                        idx === currentQuizStep
                          ? { backgroundColor: page.customAccentHex || theme.primaryHex }
                          : undefined
                      }
                    />
                  ))}
                </div>
              </div>

              {/* Question Text */}
              <div className="text-lg sm:text-2xl font-bold text-white mb-2">
                <InlineEditableText
                  value={currentQ.question}
                  onChange={(newVal) =>
                    updateP((p) => {
                      const nextQ = [...p.quiz.questions];
                      nextQ[currentQuizStep] = { ...nextQ[currentQuizStep], question: newVal };
                      return { ...p, quiz: { ...p.quiz, questions: nextQ } };
                    })
                  }
                  isEditorPreview={isEditorPreview}
                  tag="h3"
                  placeholder="Texto da pergunta..."
                  fieldLabel="Pergunta"
                />
              </div>

              {currentQ.description && (
                <div className={`text-xs sm:text-sm mb-6 ${
                  page.theme === "light" ? "text-zinc-600" : "text-zinc-400"
                }`}>
                  <InlineEditableText
                    value={currentQ.description}
                    onChange={(newVal) =>
                      updateP((p) => {
                        const nextQ = [...p.quiz.questions];
                        nextQ[currentQuizStep] = { ...nextQ[currentQuizStep], description: newVal };
                        return { ...p, quiz: { ...p.quiz, questions: nextQ } };
                      })
                    }
                    isEditorPreview={isEditorPreview}
                    tag="p"
                    placeholder="Instrução ou descrição da etapa..."
                  />
                </div>
              )}

              {/* Options List */}
              <div className="space-y-3 mb-6">
                {currentQ.options?.map((opt, optIdx) => {
                  const isSelected = selectedQuizAnswers[currentQ.id]?.id === opt.id;
                  return (
                    <div
                      key={opt.id || optIdx}
                      onClick={() => handleQuizOptionSelect(currentQ.id, opt, currentQuizStep)}
                      className={`p-4 rounded-2xl border transition-all relative group/opt flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? (page.theme === "light"
                              ? `${theme.badgeBg} ${theme.border} shadow-sm`
                              : `bg-zinc-900/90 ${theme.border} shadow-lg`)
                          : (page.theme === "light"
                              ? "bg-white border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
                              : "bg-zinc-950/60 border-zinc-800/90 hover:border-zinc-700 hover:bg-zinc-900/40")
                      }`}
                    >
                      <div className="flex items-center gap-3.5 flex-1 pr-2">
                        {opt.iconName && (
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            page.theme === "light"
                              ? `bg-zinc-100 border border-zinc-200 ${theme.iconText}`
                              : `bg-zinc-900 border border-zinc-800 ${theme.iconText}`
                          }`}>
                            <DynamicIcon name={opt.iconName} className="w-5 h-5" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className={`font-bold text-sm sm:text-base ${
                            page.theme === "light" ? "text-zinc-950" : "text-white"
                          }`}>
                            <InlineEditableText
                              value={opt.label}
                              onChange={(newVal) =>
                                updateP((p) => {
                                  const nextQ = [...p.quiz.questions];
                                  const nextOpts = [...nextQ[currentQuizStep].options];
                                  nextOpts[optIdx] = { ...nextOpts[optIdx], label: newVal };
                                  nextQ[currentQuizStep].options = nextOpts;
                                  return { ...p, quiz: { ...p.quiz, questions: nextQ } };
                                })
                              }
                              isEditorPreview={isEditorPreview}
                              tag="span"
                              placeholder="Opção..."
                            />
                          </div>
                          {opt.description && (
                            <div className={`text-xs mt-0.5 ${
                              page.theme === "light" ? "text-zinc-600" : "text-zinc-400"
                            }`}>
                              <InlineEditableText
                                value={opt.description}
                                onChange={(newVal) =>
                                  updateP((p) => {
                                    const nextQ = [...p.quiz.questions];
                                    const nextOpts = [...nextQ[currentQuizStep].options];
                                    nextOpts[optIdx] = { ...nextOpts[optIdx], description: newVal };
                                    nextQ[currentQuizStep].options = nextOpts;
                                    return { ...p, quiz: { ...p.quiz, questions: nextQ } };
                                  })
                                }
                                isEditorPreview={isEditorPreview}
                                tag="span"
                                placeholder="Sub-detalhes..."
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Badge and Editor Actions */}
                      <div className="flex items-center gap-2">
                        {opt.badge && (
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            page.theme === "light"
                              ? "bg-purple-50 border-purple-200 text-purple-600"
                              : "bg-purple-950 border border-purple-500/40 text-purple-300"
                          }`}>
                            {opt.badge}
                          </span>
                        )}

                        {isEditorPreview && (
                          <div className="flex items-center gap-1 opacity-0 group-hover/opt:opacity-100 transition-opacity">
                            {/* Move Up */}
                            <button
                              type="button"
                              disabled={optIdx === 0}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (optIdx > 0) {
                                  const nextQ = [...page.quiz.questions];
                                  const nextOpts = [...nextQ[currentQuizStep].options];
                                  const [m] = nextOpts.splice(optIdx, 1);
                                  nextOpts.splice(optIdx - 1, 0, m);
                                  nextQ[currentQuizStep].options = nextOpts;
                                  updateP((p) => ({ ...p, quiz: { ...p.quiz, questions: nextQ } }));
                                }
                              }}
                              className="p-1 rounded bg-zinc-900 text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer"
                              title="Subir Opção"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>

                            {/* Move Down */}
                            <button
                              type="button"
                              disabled={optIdx >= currentQ.options.length - 1}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (optIdx < currentQ.options.length - 1) {
                                  const nextQ = [...page.quiz.questions];
                                  const nextOpts = [...nextQ[currentQuizStep].options];
                                  const [m] = nextOpts.splice(optIdx, 1);
                                  nextOpts.splice(optIdx + 1, 0, m);
                                  nextQ[currentQuizStep].options = nextOpts;
                                  updateP((p) => ({ ...p, quiz: { ...p.quiz, questions: nextQ } }));
                                }
                              }}
                              className="p-1 rounded bg-zinc-900 text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer"
                              title="Descer Opção"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>

                            {/* Delete Option */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const nextQ = [...page.quiz.questions];
                                nextQ[currentQuizStep].options = nextQ[currentQuizStep].options.filter(
                                  (_, i) => i !== optIdx
                                );
                                updateP((p) => ({ ...p, quiz: { ...p.quiz, questions: nextQ } }));
                              }}
                              className="p-1 rounded bg-zinc-900 text-red-400 hover:text-white hover:bg-red-600 cursor-pointer"
                              title="Excluir Opção"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Option in Editor */}
              {isEditorPreview && (
                <div className="flex justify-center mb-4">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const nextQ = [...page.quiz.questions];
                      const newOpt: QuizOption = {
                        id: `opt_${Date.now()}`,
                        label: "Nova Alternativa Estratégica",
                        badge: "Novo",
                        iconName: "CheckCircle2",
                      };
                      nextQ[currentQuizStep].options.push(newOpt);
                      updateP((p) => ({ ...p, quiz: { ...p.quiz, questions: nextQ } }));
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-purple-400 border border-purple-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Adicionar Opção a Esta Pergunta</span>
                  </button>
                </div>
              )}
            </div>
            {renderSectionFloatingImages("quiz")}
          </section>
        );

      case "bentoGrid":
        if (!visibility.bentoGrid || !page.bentoGrid?.items || page.bentoGrid.items.length === 0)
          return null;

        const bentoIndex = sectionOrder.indexOf("bentoGrid");
        const bentoCols = page.bentoGrid.columns || 3;
        const bentoColsClass = isMobile
          ? "grid-cols-1"
          : isTablet
          ? "grid-cols-1 sm:grid-cols-2"
          : bentoCols === 2
          ? "grid-cols-1 md:grid-cols-2"
          : bentoCols === 4
          ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
          : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";

        return (
          <section
            key="bentoGrid"
            id="bento-section"
            onClick={() => isEditorPreview && onSelectSection?.("bentoGrid")}
            className={`py-16 px-4 sm:px-6 ${getContainerWidthClass(
              page.bentoGrid.containerWidth
            )} mx-auto relative ${
              showSectionTools
                ? "cursor-pointer ring-1 ring-zinc-800/80 hover:ring-purple-500/50 rounded-3xl transition-all p-4 mb-6"
                : ""
            } ${activeSection === "bentoGrid" && showSectionTools ? "ring-2 ring-purple-500 bg-purple-950/10 shadow-2xl z-[999]" : "z-10"}`}
          >
            {/* Quick Floating Controls Bar in Editor */}
            {showSectionTools && (
              <SectionControlToolbar
                sectionId="bentoGrid"
                sectionTitle="BENTO GRID & DIFERENCIAIS"
                icon={<Sliders className="w-3.5 h-3.5 text-purple-400" />}
                sectionIndex={bentoIndex}
                totalSections={sectionOrder.length}
                onMoveSection={(dir) => handleMoveSection("bentoGrid", dir)}
                containerWidth={page.bentoGrid.containerWidth || "normal"}
                onChangeContainerWidth={(w) =>
                  updateP((p) => ({ ...p, bentoGrid: { ...p.bentoGrid, containerWidth: w } }))
                }
                columns={page.bentoGrid.columns || 3}
                onChangeColumns={(cols) =>
                  updateP((p) => ({ ...p, bentoGrid: { ...p.bentoGrid, columns: cols } }))
                }
                align={page.bentoGrid.align || "center"}
                onChangeAlign={(a) =>
                  updateP((p) => ({ ...p, bentoGrid: { ...p.bentoGrid, align: a } }))
                }
                cardPadding={page.bentoGrid.cardPadding || "normal"}
                onChangeCardPadding={(pad) =>
                  updateP((p) => ({ ...p, bentoGrid: { ...p.bentoGrid, cardPadding: pad } }))
                }
                cardRadius={page.bentoGrid.cardRadius || "xl"}
                onChangeCardRadius={(rad) =>
                  updateP((p) => ({ ...p, bentoGrid: { ...p.bentoGrid, cardRadius: rad } }))
                }
                onHideSection={() =>
                  updateP((p) => ({ ...p, visibility: { ...p.visibility, bentoGrid: false } }))
                }
              />
            )}

            {/* Header */}
            <div className={`mb-12 ${getHeadingAlignClass(page.bentoGrid.align)}`}>
              <DraggableElement
                {...getDraggableProps("bento-badge")}
                align={page.bentoGrid.align || "center"}
                onChangeAlign={(a) => {
                  updateP((p) => ({ ...p, bentoGrid: { ...p.bentoGrid, align: a } }));
                }}
                isEditorPreview={isEditorPreview}
                label="Badge dos Diferenciais"
                inline
                className="mb-3"
              >
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                  page.theme === "light"
                    ? "bg-zinc-100 border border-zinc-200 text-zinc-800"
                    : "bg-zinc-900 border border-zinc-800 text-purple-400"
                }`}>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>TECNOLOGIA & METODOLOGIA ÚNICA</span>
                </div>
              </DraggableElement>

              <DraggableElement
                {...getDraggableProps("bento-title")}
                align={page.bentoGrid.align || "center"}
                onChangeAlign={(a) => {
                  updateP((p) => ({ ...p, bentoGrid: { ...p.bentoGrid, align: a } }));
                }}
                isEditorPreview={isEditorPreview}
                label="Título dos Diferenciais"
                className="w-full mb-3"
              >
                <div className={`text-2xl sm:text-4xl font-extrabold ${
                  page.theme === "light" ? "text-zinc-900" : "text-white"
                } w-full text-center`}>
                  <InlineEditableText
                    value={page.bentoGrid.title || "Por Que Este Método Supera Qualquer Outro"}
                    onChange={(newVal) =>
                      updateP((p) => ({ ...p, bentoGrid: { ...p.bentoGrid, title: newVal } }))
                    }
                    align={page.bentoGrid.align || "center"}
                    onAlignChange={(newAlign) =>
                      updateP((p) => ({ ...p, bentoGrid: { ...p.bentoGrid, align: newAlign } }))
                    }
                    isEditorPreview={isEditorPreview}
                    tag="h2"
                    placeholder="Título do Bento Grid..."
                    fieldLabel="Título dos Diferenciais"
                  />
                </div>
              </DraggableElement>

              <DraggableElement
                {...getDraggableProps("bento-subtitle")}
                align={page.bentoGrid.align || "center"}
                onChangeAlign={(a) => {
                  updateP((p) => ({ ...p, bentoGrid: { ...p.bentoGrid, align: a } }));
                }}
                isEditorPreview={isEditorPreview}
                label="Subtítulo dos Diferenciais"
                className="w-full max-w-2xl mx-auto"
              >
                <div className={`text-sm sm:text-base w-full ${
                  page.theme === "light" ? "text-zinc-600" : "text-zinc-400"
                } text-center`}>
                  <InlineEditableText
                    value={page.bentoGrid.subtitle || "Uma estrutura validada para gerar previsibilidade, autoridade e conversão máxima:"}
                    onChange={(newVal) =>
                      updateP((p) => ({ ...p, bentoGrid: { ...p.bentoGrid, subtitle: newVal } }))
                    }
                    align={page.bentoGrid.align || "center"}
                    onAlignChange={(newAlign) =>
                      updateP((p) => ({ ...p, bentoGrid: { ...p.bentoGrid, align: newAlign } }))
                    }
                    isEditorPreview={isEditorPreview}
                    tag="p"
                    placeholder="Subtítulo do Bento Grid..."
                  />
                </div>
              </DraggableElement>
            </div>

            {/* Bento Grid Container */}
            <div className={`grid ${bentoColsClass} gap-4 sm:gap-6 auto-rows-[minmax(240px,auto)]`}>
              {page.bentoGrid.items.map((item, idx) => {
                const isPinned = pinnedCardId === item.id;
                return (
                  <div
                    key={item.id || idx}
                    onClick={(e) => {
                      if (isEditorPreview) {
                        e.stopPropagation();
                        setPinnedCardId(item.id);
                        setFloatingCardConfig({
                          type: "bento",
                          id: item.id,
                          title: item.title || `Card Bento #${idx + 1}`,
                          index: idx,
                        });
                      }
                    }}
                    style={{
                      backgroundColor: item.customBgColorHex && !item.customGradient ? item.customBgColorHex : undefined,
                      color: item.customTextColorHex ? item.customTextColorHex : undefined,
                    }}
                    className={`${getPaddingClass(page.bentoGrid.cardPadding)} ${getRadiusClass(
                      page.bentoGrid.cardRadius
                    )} ${
                      item.customGradient
                        ? item.customGradient
                        : getThemeCardBgClass(page.accentColor, page.theme)
                    } flex flex-col justify-between relative group/bento hover:border-purple-500/50 hover:bg-zinc-900/80 transition-all cursor-pointer ${getBentoSizeClasses(
                      item.size,
                      isMobile,
                      isTablet
                    )} ${
                      isPinned
                        ? "ring-2 ring-purple-500 border-purple-500 shadow-[0_0_35px_rgba(168,85,247,0.4)] scale-[1.01]"
                        : ""
                    }`}
                  >
                    {/* Pinned Card Indicator Badge */}
                    {isPinned && isEditorPreview && (
                      <div className="absolute -top-3 left-4 z-40 px-3 py-0.5 rounded-full bg-purple-600 text-white font-bold text-[10px] flex items-center gap-1.5 shadow-xl border border-purple-400">
                        <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" />
                        <span>CARD SELECIONADO & FIXADO</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPinnedCardId(null);
                            setFloatingCardConfig(null);
                          }}
                          className="ml-1 text-purple-200 hover:text-white font-bold text-xs"
                          title="Desafixar Card"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  {/* Floating Action Controls on Card in Editor */}
                  {isEditorPreview && (
                    <div className="opacity-0 group-hover/bento:opacity-100 transition-opacity absolute top-3 right-3 z-30 flex items-center gap-1 p-1 rounded-xl bg-zinc-950/95 border border-zinc-800 backdrop-blur-md shadow-2xl">
                      {/* Move Left / Previous */}
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (idx > 0) {
                            const nextItems = [...page.bentoGrid.items];
                            const [moved] = nextItems.splice(idx, 1);
                            nextItems.splice(idx - 1, 0, moved);
                            updateP((p) => ({
                              ...p,
                              bentoGrid: { ...p.bentoGrid, items: nextItems },
                            }));
                          }
                        }}
                        className={`p-1.5 rounded-lg bg-zinc-900 ${
                          idx === 0
                            ? "opacity-30 cursor-not-allowed"
                            : "text-zinc-300 hover:text-white hover:bg-purple-600 cursor-pointer"
                        }`}
                        title="Mover Card para a Esquerda / Cima"
                      >
                        <MoveLeft className="w-3.5 h-3.5" />
                      </button>

                      {/* Move Right / Next */}
                      <button
                        type="button"
                        disabled={idx >= page.bentoGrid.items.length - 1}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (idx < page.bentoGrid.items.length - 1) {
                            const nextItems = [...page.bentoGrid.items];
                            const [moved] = nextItems.splice(idx, 1);
                            nextItems.splice(idx + 1, 0, moved);
                            updateP((p) => ({
                              ...p,
                              bentoGrid: { ...p.bentoGrid, items: nextItems },
                            }));
                          }
                        }}
                        className={`p-1.5 rounded-lg bg-zinc-900 ${
                          idx >= page.bentoGrid.items.length - 1
                            ? "opacity-30 cursor-not-allowed"
                            : "text-zinc-300 hover:text-white hover:bg-purple-600 cursor-pointer"
                        }`}
                        title="Mover Card para a Direita / Baixo"
                      >
                        <MoveRight className="w-3.5 h-3.5" />
                      </button>

                      {/* Quick Size Toggle Selector */}
                      <div className="flex items-center bg-zinc-900 rounded-lg p-0.5 border border-zinc-800">
                        {[
                          { id: "standard", label: "1x1", title: "Padrão (1 Coluna)" },
                          { id: "wide", label: "2x1", title: "Largo (2 Colunas)" },
                          { id: "tall", label: "1x2", title: "Alto (2 Linhas)" },
                          { id: "large", label: "2x2", title: "Destaque (2x2)" },
                        ].map((sz) => {
                          const isSelected = (item.size || "standard") === sz.id;
                          return (
                            <button
                              key={sz.id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateP((p) => {
                                  const nextItems = [...p.bentoGrid.items];
                                  nextItems[idx] = { ...nextItems[idx], size: sz.id as any };
                                  return { ...p, bentoGrid: { ...p.bentoGrid, items: nextItems } };
                                });
                              }}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                                isSelected
                                  ? "bg-purple-600 text-white"
                                  : "text-zinc-400 hover:text-white"
                              }`}
                              title={`Tamanho: ${sz.title}`}
                            >
                              {sz.label}
                            </button>
                          );
                        })}
                      </div>

                      {/* Change Image Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenImagePicker?.({
                            type: "bento",
                            currentUrl: item.imageUrl || "",
                            itemId: item.id,
                            title: `Trocar Imagem de "${item.title}"`,
                          });
                        }}
                        className="p-1.5 rounded-lg bg-zinc-900 text-zinc-300 hover:text-white hover:bg-purple-600 cursor-pointer"
                        title="Trocar Imagem do Card"
                      >
                        <Camera className="w-3.5 h-3.5" />
                      </button>

                      {/* Duplicate Card */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const copyItem: BentoItem = {
                            ...item,
                            id: `bento_${Date.now()}`,
                            title: `${item.title} (Cópia)`,
                          };
                          updateP((p) => ({
                            ...p,
                            bentoGrid: {
                              ...p.bentoGrid,
                              items: [
                                ...p.bentoGrid.items.slice(0, idx + 1),
                                copyItem,
                                ...p.bentoGrid.items.slice(idx + 1),
                              ],
                            },
                          }));
                        }}
                        className="p-1.5 rounded-lg bg-zinc-900 text-zinc-300 hover:text-white hover:bg-purple-600 cursor-pointer"
                        title="Duplicar Card"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Card */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateP((p) => ({
                            ...p,
                            bentoGrid: {
                              ...p.bentoGrid,
                              items: p.bentoGrid.items.filter((_, i) => i !== idx),
                            },
                          }));
                        }}
                        className="p-1.5 rounded-lg bg-zinc-900 text-red-400 hover:text-white hover:bg-red-600 cursor-pointer"
                        title="Excluir Card"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <div>
                    {/* Top Icon & Tag */}
                    <div className="flex items-center justify-between mb-4">
                      <button
                        type="button"
                        onClick={(e) => {
                          if (isEditorPreview) {
                            e.stopPropagation();
                            onOpenIconPicker?.({
                              currentIcon: item.iconName || "Zap",
                              onSelect: (newIcon) => {
                                updateP((p) => {
                                  const nextItems = [...p.bentoGrid.items];
                                  nextItems[idx] = { ...nextItems[idx], iconName: newIcon };
                                  return { ...p, bentoGrid: { ...p.bentoGrid, items: nextItems } };
                                });
                              },
                              title: `Escolher Ícone de "${item.title}"`,
                            });
                          }
                        }}
                        className={`w-12 h-12 rounded-2xl ${
                          page.theme === "light" ? "bg-white border-zinc-200 shadow-sm" : "bg-zinc-950 border-zinc-800"
                        } border flex items-center justify-center ${
                          isEditorPreview ? "hover:scale-110 cursor-pointer hover:border-purple-500" : ""
                        }`}
                        title={isEditorPreview ? "Clique para trocar o ícone" : undefined}
                      >
                        <DynamicIcon
                          name={item.iconName || "Zap"}
                          className="w-6 h-6"
                          style={{ color: page.customAccentHex || theme.primaryHex }}
                        />
                      </button>

                      {item.tag && (
                        <div
                          className={`px-3 py-1 rounded-full text-xs font-bold ${
                            page.theme === "light"
                              ? "bg-white border border-zinc-200 shadow-sm"
                              : `${theme.badgeBg} border ${theme.badgeBorder} ${theme.badgeText}`
                          }`}
                          style={
                            page.theme === "light"
                              ? {
                                  color: page.customAccentHex || theme.primaryHex,
                                  borderColor: `${page.customAccentHex || theme.primaryHex}40`,
                                }
                              : undefined
                          }
                        >
                          <InlineEditableText
                            value={item.tag}
                            onChange={(newVal) =>
                              updateP((p) => {
                                const nextItems = [...p.bentoGrid.items];
                                nextItems[idx] = { ...nextItems[idx], tag: newVal };
                                return { ...p, bentoGrid: { ...p.bentoGrid, items: nextItems } };
                              })
                            }
                            isEditorPreview={isEditorPreview}
                            tag="span"
                            placeholder="Tag..."
                          />
                        </div>
                      )}
                    </div>

                    {/* Card Title */}
                    <div className={`text-xl sm:text-2xl font-bold mb-2 ${
                      page.theme === "light" ? "text-zinc-950" : "text-white"
                    }`}>
                      <InlineEditableText
                        value={item.title}
                        onChange={(newVal) =>
                          updateP((p) => {
                            const nextItems = [...p.bentoGrid.items];
                            nextItems[idx] = { ...nextItems[idx], title: newVal };
                            return { ...p, bentoGrid: { ...p.bentoGrid, items: nextItems } };
                          })
                        }
                        isEditorPreview={isEditorPreview}
                        tag="h3"
                        placeholder="Título do Card..."
                        fieldLabel="Título do Diferencial"
                      />
                    </div>

                    {/* Card Description */}
                    <div className={`text-sm sm:text-base leading-relaxed mb-4 ${
                      page.theme === "light" ? "text-zinc-800" : "text-zinc-400"
                    }`}>
                      <InlineEditableText
                        value={item.description}
                        onChange={(newVal) =>
                          updateP((p) => {
                            const nextItems = [...p.bentoGrid.items];
                            nextItems[idx] = { ...nextItems[idx], description: newVal };
                            return { ...p, bentoGrid: { ...p.bentoGrid, items: nextItems } };
                          })
                        }
                        isEditorPreview={isEditorPreview}
                        tag="p"
                        multiline={true}
                        placeholder="Descrição detalhada..."
                      />
                    </div>
                  </div>

                  {/* Optional Image or Metric preview */}
                  <div>
                    {item.imageUrl && (
                      <div className="rounded-2xl overflow-hidden mb-4 border border-zinc-800 bg-zinc-950 aspect-video relative group/img">
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="w-full h-full object-cover transition-transform duration-300"
                          style={{
                            objectPosition: `${item.imagePositionX ?? 50}% ${item.imagePositionY ?? 50}%`,
                            transform: `scale(${(item.imageZoom ?? 100) / 100})`,
                            transformOrigin: `${item.imagePositionX ?? 50}% ${item.imagePositionY ?? 50}%`,
                          }}
                          referrerPolicy="no-referrer"
                        />
                        {isEditorPreview && (
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenImagePicker?.({
                                  type: "bento",
                                  currentUrl: item.imageUrl || "",
                                  itemId: item.id,
                                  title: `Trocar Imagem de "${item.title}"`,
                                });
                              }}
                              className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-lg"
                            >
                              <Camera className="w-3.5 h-3.5" />
                              <span>Trocar Foto</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateP((p) => {
                                  const nextItems = [...p.bentoGrid.items];
                                  nextItems[idx] = { ...nextItems[idx], imageUrl: undefined };
                                  return { ...p, bentoGrid: { ...p.bentoGrid, items: nextItems } };
                                });
                              }}
                              className="p-1.5 rounded-xl bg-red-600/80 hover:bg-red-500 text-white text-xs font-bold cursor-pointer shadow-lg"
                              title="Remover Imagem do Card"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {item.metric && (
                      <div className={`pt-4 border-t flex items-baseline gap-2 ${
                        page.theme === "light" ? "border-zinc-200" : "border-zinc-800/80"
                      }`}>
                        <span className={`text-2xl font-extrabold ${
                          page.theme === "light" ? "text-zinc-900" : theme.headingGradient
                        }`}>
                          <InlineEditableText
                            value={item.metric}
                            onChange={(newVal) =>
                              updateP((p) => {
                                const nextItems = [...p.bentoGrid.items];
                                nextItems[idx] = { ...nextItems[idx], metric: newVal };
                                return { ...p, bentoGrid: { ...p.bentoGrid, items: nextItems } };
                              })
                            }
                            isEditorPreview={isEditorPreview}
                            tag="span"
                            placeholder="+45%"
                          />
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Bento Card bottom Button */}
                  {(item.buttonText || isEditorPreview) && (
                    <div className={`mt-4 pt-3 border-t w-full ${
                      page.theme === "light" ? "border-zinc-100" : "border-zinc-800/40"
                    }`}>
                      <a
                        href={isEditorPreview ? undefined : (item.buttonUrl || "#")}
                        target={item.buttonUrl?.startsWith("http") ? "_blank" : undefined}
                        rel="noopener noreferrer"
                        onClick={(e) => {
                          if (isEditorPreview) {
                            e.preventDefault();
                            e.stopPropagation();
                            setPinnedCardId(item.id);
                            setFloatingCardConfig({
                              type: "bento",
                              id: item.id,
                              title: item.title || `Card Bento #${idx + 1}`,
                              index: idx,
                            });
                          }
                        }}
                        className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          item.buttonStyle === "secondary"
                            ? (page.theme === "light"
                                ? "bg-white border border-zinc-200 text-zinc-800 hover:bg-zinc-50"
                                : "bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800")
                            : (item.buttonStyle === "outline"
                                ? "bg-transparent border border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                                : "bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-900/20")
                        }`}
                        style={
                          item.buttonStyle !== "secondary" && item.buttonStyle !== "outline" && (page.customAccentHex || theme.primaryHex)
                            ? { backgroundColor: page.customAccentHex || theme.primaryHex }
                            : undefined
                        }
                      >
                        <InlineEditableText
                          value={item.buttonText || (isEditorPreview ? "Adicionar botão" : "")}
                          onChange={(newVal) =>
                            updateP((p) => {
                              const nextItems = [...p.bentoGrid.items];
                              nextItems[idx] = { ...nextItems[idx], buttonText: newVal };
                              return { ...p, bentoGrid: { ...p.bentoGrid, items: nextItems } };
                            })
                          }
                          isEditorPreview={isEditorPreview}
                          tag="span"
                          placeholder="Texto do botão..."
                        />
                        <DynamicIcon name="ArrowRight" className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
            </div>

            {/* Add Bento Card Button in Editor */}
            {isEditorPreview && (
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const newBento: BentoItem = {
                      id: `bento_${Date.now()}`,
                      size: "standard",
                      title: "Novo Diferencial Competitivo",
                      description: "Descreva o benefício exclusivo que transforma os resultados do seu cliente.",
                      iconName: "Sparkles",
                      tag: "Exclusivo",
                      metric: "+450% Escala",
                    };
                    updateP((p) => ({
                      ...p,
                      bentoGrid: {
                        ...p.bentoGrid,
                        items: [...p.bentoGrid.items, newBento],
                      },
                    }));
                  }}
                  className="px-5 py-2.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-purple-400 border border-purple-500/40 text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xl"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Adicionar Novo Card ao Bento Grid</span>
                </button>
              </div>
            )}
            {renderSectionFloatingImages("bentoGrid")}
          </section>
        );

      case "photoGrid":
        if (visibility.photoGrid === false) return null;
        const photoGridData = page.photoGrid || createDefaultPhotoGridSection(6);
        const photoGridIndex = sectionOrder.indexOf("photoGrid");

        return (
          <div
            key="photoGrid"
            onClick={() => isEditorPreview && onSelectSection?.("photoGrid")}
            className={`relative ${
              isEditorPreview && activeSection === "photoGrid"
                ? "ring-2 ring-purple-500 rounded-3xl overflow-hidden shadow-2xl my-4 z-[999]"
                : "z-10"
            }`}
          >
            <PhotoGridSectionRenderer
              section={photoGridData}
              isEditorPreview={isEditorPreview}
              deviceView={deviceView}
              sectionIndex={photoGridIndex >= 0 ? photoGridIndex : 3}
              totalSections={sectionOrder.length}
              theme={page.theme}
              accentColor={page.customAccentHex || THEME_CONFIGS[page.accentColor]?.hex || "#FF6A00"}
              onUpdateSection={(updater) => {
                updateP((p) => {
                  const currentSec = p.photoGrid || createDefaultPhotoGridSection(6);
                  const updatedSec = updater(currentSec);
                  return { ...p, photoGrid: updatedSec };
                });
              }}
              onMoveSection={(dir) => handleMoveSection("photoGrid", dir)}
              onHideSection={() =>
                updateP((p) => ({
                  ...p,
                  visibility: { ...p.visibility, photoGrid: false },
                }))
              }
              onOpenImagePicker={onOpenImagePicker}
              customElementStyles={page.customElementStyles}
              onOpenVisualModal={onOpenVisualModal}
            />
            {renderSectionFloatingImages("photoGrid")}
          </div>
        );

      case "testimonials":
        if (
          !visibility.testimonials ||
          !page.testimonials?.items ||
          page.testimonials.items.length === 0
        )
          return null;

        const testIndex = sectionOrder.indexOf("testimonials");
        const testCols = page.testimonials.columns || 3;
        const testColsClass = isMobile
          ? "grid-cols-1"
          : isTablet
          ? "grid-cols-1 sm:grid-cols-2"
          : testCols === 2
          ? "grid-cols-1 md:grid-cols-2"
          : testCols === 4
          ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
          : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";

        return (
          <section
            key="testimonials"
            id="testimonials-section"
            onClick={() => isEditorPreview && onSelectSection?.("testimonials")}
            className={`py-16 px-4 sm:px-6 ${getContainerWidthClass(
              page.testimonials.containerWidth
            )} mx-auto relative ${
              showSectionTools
                ? "cursor-pointer ring-1 ring-zinc-800/80 hover:ring-purple-500/50 rounded-3xl transition-all p-4 mb-6"
                : ""
            } ${activeSection === "testimonials" && showSectionTools ? "ring-2 ring-purple-500 bg-purple-950/10 shadow-2xl z-[999]" : "z-10"}`}
          >
            {/* Quick Floating Controls Bar in Editor */}
            {showSectionTools && (
              <SectionControlToolbar
                sectionId="testimonials"
                sectionTitle="DEPOIMENTOS & CASOS DE SUCESSO"
                icon={<Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
                sectionIndex={testIndex}
                totalSections={sectionOrder.length}
                onMoveSection={(dir) => handleMoveSection("testimonials", dir)}
                containerWidth={page.testimonials.containerWidth || "normal"}
                onChangeContainerWidth={(w) =>
                  updateP((p) => ({ ...p, testimonials: { ...p.testimonials, containerWidth: w } }))
                }
                columns={page.testimonials.columns || 3}
                onChangeColumns={(cols) =>
                  updateP((p) => ({ ...p, testimonials: { ...p.testimonials, columns: cols } }))
                }
                align={page.testimonials.align || "center"}
                onChangeAlign={(a) =>
                  updateP((p) => ({ ...p, testimonials: { ...p.testimonials, align: a } }))
                }
                cardPadding={page.testimonials.cardPadding || "normal"}
                onChangeCardPadding={(pad) =>
                  updateP((p) => ({ ...p, testimonials: { ...p.testimonials, cardPadding: pad } }))
                }
                cardRadius={page.testimonials.cardRadius || "xl"}
                onChangeCardRadius={(rad) =>
                  updateP((p) => ({ ...p, testimonials: { ...p.testimonials, cardRadius: rad } }))
                }
                onHideSection={() =>
                  updateP((p) => ({ ...p, visibility: { ...p.visibility, testimonials: false } }))
                }
              />
            )}

            {/* Header */}
            <div className={`mb-12 ${getHeadingAlignClass(page.testimonials.align)}`}>
              <DraggableElement
                {...getDraggableProps("testimonials-badge")}
                align={page.testimonials.align || "center"}
                onChangeAlign={(a) => {
                  updateP((p) => ({ ...p, testimonials: { ...p.testimonials, align: a } }));
                }}
                isEditorPreview={isEditorPreview}
                label="Badge dos Depoimentos"
                inline
                className="mb-3"
              >
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                  page.theme === "light"
                    ? "bg-amber-100 border border-amber-200 text-amber-700"
                    : "bg-zinc-900 border border-zinc-800 text-amber-400"
                }`}>
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <span>CASOS DE SUCESSO COMPROVADOS</span>
                </div>
              </DraggableElement>

              <DraggableElement
                {...getDraggableProps("testimonials-title")}
                align={page.testimonials.align || "center"}
                onChangeAlign={(a) => {
                  updateP((p) => ({ ...p, testimonials: { ...p.testimonials, align: a } }));
                }}
                isEditorPreview={isEditorPreview}
                label="Título dos Depoimentos"
                className="w-full mb-3"
              >
                <div className={`text-2xl sm:text-4xl font-extrabold ${
                  page.theme === "light" ? "text-zinc-900" : "text-white"
                } w-full text-center`}>
                  <InlineEditableText
                    value={page.testimonials.title || "O Que Quem Já Chegou Lá Está Dizendo"}
                    onChange={(newVal) =>
                      updateP((p) => ({ ...p, testimonials: { ...p.testimonials, title: newVal } }))
                    }
                    align={page.testimonials.align || "center"}
                    onAlignChange={(newAlign) =>
                      updateP((p) => ({ ...p, testimonials: { ...p.testimonials, align: newAlign } }))
                    }
                    isEditorPreview={isEditorPreview}
                    tag="h2"
                    placeholder="Título dos Depoimentos..."
                    fieldLabel="Título dos Depoimentos"
                  />
                </div>
              </DraggableElement>

              <DraggableElement
                {...getDraggableProps("testimonials-subtitle")}
                align={page.testimonials.align || "center"}
                onChangeAlign={(a) => {
                  updateP((p) => ({ ...p, testimonials: { ...p.testimonials, align: a } }));
                }}
                isEditorPreview={isEditorPreview}
                label="Subtítulo dos Depoimentos"
                className="w-full max-w-2xl mx-auto"
              >
                <div className={`text-sm sm:text-base w-full ${
                  page.theme === "light" ? "text-zinc-600" : "text-zinc-400"
                } text-center`}>
                  <InlineEditableText
                    value={page.testimonials.subtitle || "Resultados auditados e depoimentos reais dos nossos parceiros e mentorados:"}
                    onChange={(newVal) =>
                      updateP((p) => ({ ...p, testimonials: { ...p.testimonials, subtitle: newVal } }))
                    }
                    align={page.testimonials.align || "center"}
                    onAlignChange={(newAlign) =>
                      updateP((p) => ({ ...p, testimonials: { ...p.testimonials, align: newAlign } }))
                    }
                    isEditorPreview={isEditorPreview}
                    tag="p"
                    placeholder="Subtítulo dos Depoimentos..."
                  />
                </div>
              </DraggableElement>
            </div>

            {/* Testimonials Grid */}
            <div className={`grid ${testColsClass} gap-4 sm:gap-6`}>
              {page.testimonials.items.map((item, idx) => {
                const isPinned = pinnedCardId === item.id;
                return (
                  <div
                    key={item.id || idx}
                    onClick={(e) => {
                      if (isEditorPreview) {
                        e.stopPropagation();
                        setPinnedCardId(item.id);
                        setFloatingCardConfig({
                          type: "testimonial",
                          id: item.id,
                          title: `Depoimento: ${item.name}`,
                          index: idx,
                        });
                      }
                    }}
                    style={{
                      backgroundColor: item.customBgColorHex && !item.customGradient ? item.customBgColorHex : undefined,
                      color: item.customTextColorHex ? item.customTextColorHex : undefined,
                    }}
                    className={`${getPaddingClass(page.testimonials.cardPadding)} ${getRadiusClass(
                      page.testimonials.cardRadius
                    )} ${
                      item.customGradient
                        ? item.customGradient
                        : (page.theme === "light"
                            ? "bg-white border border-zinc-200 shadow-sm hover:shadow-md"
                            : "bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-xl")
                    } flex flex-col justify-between relative group/test hover:border-purple-500/40 hover:bg-zinc-900/80 transition-all cursor-pointer ${
                      isPinned
                        ? "ring-2 ring-purple-500 border-purple-500 shadow-[0_0_35px_rgba(168,85,247,0.4)] scale-[1.01]"
                        : ""
                    }`}
                  >
                    {/* Pinned Card Indicator Badge */}
                    {isPinned && isEditorPreview && (
                      <div className="absolute -top-3 left-4 z-40 px-3 py-0.5 rounded-full bg-purple-600 text-white font-bold text-[10px] flex items-center gap-1.5 shadow-xl border border-purple-400">
                        <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" />
                        <span>CARD SELECIONADO & FIXADO</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPinnedCardId(null);
                            setFloatingCardConfig(null);
                          }}
                          className="ml-1 text-purple-200 hover:text-white font-bold text-xs"
                          title="Desafixar Card"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  {/* Floating Action Controls on Card in Editor */}
                  {isEditorPreview && (
                    <div className="opacity-0 group-hover/test:opacity-100 transition-opacity absolute top-3 right-3 z-30 flex items-center gap-1 p-1 rounded-xl bg-zinc-950/95 border border-zinc-800 backdrop-blur-md shadow-2xl">
                      {/* Move Left */}
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (idx > 0) {
                            const next = [...page.testimonials.items];
                            const [m] = next.splice(idx, 1);
                            next.splice(idx - 1, 0, m);
                            updateP((p) => ({ ...p, testimonials: { ...p.testimonials, items: next } }));
                          }
                        }}
                        className={`p-1.5 rounded-lg bg-zinc-900 ${
                          idx === 0
                            ? "opacity-30 cursor-not-allowed"
                            : "text-zinc-300 hover:text-white hover:bg-purple-600 cursor-pointer"
                        }`}
                        title="Mover Depoimento para a Esquerda"
                      >
                        <MoveLeft className="w-3.5 h-3.5" />
                      </button>

                      {/* Move Right */}
                      <button
                        type="button"
                        disabled={idx >= page.testimonials.items.length - 1}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (idx < page.testimonials.items.length - 1) {
                            const next = [...page.testimonials.items];
                            const [m] = next.splice(idx, 1);
                            next.splice(idx + 1, 0, m);
                            updateP((p) => ({ ...p, testimonials: { ...p.testimonials, items: next } }));
                          }
                        }}
                        className={`p-1.5 rounded-lg bg-zinc-900 ${
                          idx >= page.testimonials.items.length - 1
                            ? "opacity-30 cursor-not-allowed"
                            : "text-zinc-300 hover:text-white hover:bg-purple-600 cursor-pointer"
                        }`}
                        title="Mover Depoimento para a Direita"
                      >
                        <MoveRight className="w-3.5 h-3.5" />
                      </button>

                      {/* Change Avatar Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenImagePicker?.({
                            type: "testimonial",
                            currentUrl: item.avatarUrl || "",
                            itemId: item.id,
                            title: `Trocar Foto de "${item.name}"`,
                          });
                        }}
                        className="p-1.5 rounded-lg bg-zinc-900 text-zinc-300 hover:text-white hover:bg-purple-600 cursor-pointer"
                        title="Trocar Foto do Depoimento"
                      >
                        <Camera className="w-3.5 h-3.5" />
                      </button>

                      {/* Duplicate */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const copyItem: TestimonialItem = {
                            ...item,
                            id: `test_${Date.now()}`,
                            name: `${item.name} (Cópia)`,
                          };
                          updateP((p) => ({
                            ...p,
                            testimonials: {
                              ...p.testimonials,
                              items: [
                                ...p.testimonials.items.slice(0, idx + 1),
                                copyItem,
                                ...p.testimonials.items.slice(idx + 1),
                              ],
                            },
                          }));
                        }}
                        className="p-1.5 rounded-lg bg-zinc-900 text-zinc-300 hover:text-white hover:bg-purple-600 cursor-pointer"
                        title="Duplicar Depoimento"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateP((p) => ({
                            ...p,
                            testimonials: {
                              ...p.testimonials,
                              items: p.testimonials.items.filter((_, i) => i !== idx),
                            },
                          }));
                        }}
                        className="p-1.5 rounded-lg bg-zinc-900 text-red-400 hover:text-white hover:bg-red-600 cursor-pointer"
                        title="Excluir Depoimento"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <div>
                    {/* Stars Rating (Interactive in editor) */}
                    <div className="flex items-center gap-1 mb-4">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          disabled={!isEditorPreview}
                          onClick={(e) => {
                            if (isEditorPreview) {
                              e.stopPropagation();
                              updateP((p) => {
                                const nextItems = [...p.testimonials.items];
                                nextItems[idx] = { ...nextItems[idx], rating: star };
                                return { ...p, testimonials: { ...p.testimonials, items: nextItems } };
                              });
                            }
                          }}
                          className={`${isEditorPreview ? "hover:scale-125 cursor-pointer p-0.5" : ""}`}
                        >
                          <Star
                            className={`w-4 h-4 ${
                              star <= (item.rating || 5)
                                ? "fill-amber-400 text-amber-400"
                                : (page.theme === "light" ? "text-zinc-200" : "text-zinc-700")
                            }`}
                          />
                        </button>
                      ))}
                    </div>

                    {/* Testimonial Quote */}
                    <div className={`text-sm sm:text-base leading-relaxed mb-6 font-medium italic ${
                      page.theme === "light" ? "text-zinc-700" : "text-zinc-300"
                    }`}>
                      <InlineEditableText
                        value={item.content}
                        onChange={(newVal) =>
                          updateP((p) => {
                            const nextItems = [...p.testimonials.items];
                            nextItems[idx] = { ...nextItems[idx], content: newVal };
                            return { ...p, testimonials: { ...p.testimonials, items: nextItems } };
                          })
                        }
                        isEditorPreview={isEditorPreview}
                        tag="p"
                        multiline={true}
                        placeholder="Depoimento do cliente..."
                        fieldLabel="Depoimento"
                      />
                    </div>
                  </div>

                  {/* Author Meta */}
                  <div className={`flex items-center gap-3 pt-4 border-t ${
                    page.theme === "light" ? "border-zinc-100" : "border-zinc-800/80"
                  }`}>
                    <button
                      type="button"
                      onClick={(e) => {
                        if (isEditorPreview) {
                          e.stopPropagation();
                          onOpenImagePicker?.({
                            type: "testimonial",
                            currentUrl: item.avatarUrl || "",
                            itemId: item.id,
                            title: `Trocar Foto de "${item.name}"`,
                          });
                        }
                      }}
                      className={`relative ${isEditorPreview ? "hover:opacity-80 cursor-pointer" : ""}`}
                    >
                      <img
                        src={item.avatarUrl}
                        alt={item.name}
                        className="w-11 h-11 rounded-full object-cover border-2 border-purple-500/40"
                        style={{
                          objectPosition: `${item.imagePositionX ?? 50}% ${item.imagePositionY ?? 50}%`,
                          transform: `scale(${(item.imageZoom ?? 100) / 100})`,
                          transformOrigin: `${item.imagePositionX ?? 50}% ${item.imagePositionY ?? 50}%`,
                        }}
                        referrerPolicy="no-referrer"
                      />
                      {isEditorPreview && (
                        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <Camera className="w-3.5 h-3.5 text-white" />
                        </div>
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className={`font-bold text-sm truncate ${
                        page.theme === "light" ? "text-zinc-900" : "text-white"
                      }`}>
                        <InlineEditableText
                          value={item.name}
                          onChange={(newVal) =>
                            updateP((p) => {
                              const nextItems = [...p.testimonials.items];
                              nextItems[idx] = { ...nextItems[idx], name: newVal };
                              return { ...p, testimonials: { ...p.testimonials, items: nextItems } };
                            })
                          }
                          isEditorPreview={isEditorPreview}
                          tag="span"
                          placeholder="Nome..."
                        />
                      </div>
                      <div className={`text-xs truncate ${
                        page.theme === "light" ? "text-zinc-500" : "text-zinc-400"
                      }`}>
                        <InlineEditableText
                          value={item.companyOrCity || item.role || "Cliente Verificado"}
                          onChange={(newVal) =>
                            updateP((p) => {
                              const nextItems = [...p.testimonials.items];
                              nextItems[idx] = { ...nextItems[idx], companyOrCity: newVal };
                              return { ...p, testimonials: { ...p.testimonials, items: nextItems } };
                            })
                          }
                          isEditorPreview={isEditorPreview}
                          tag="span"
                          placeholder="Cargo / Empresa..."
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            </div>

            {/* Add Testimonial Button in Editor */}
            {isEditorPreview && (
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const newTest: TestimonialItem = {
                      id: `test_${Date.now()}`,
                      name: "Juliana Mendes",
                      role: "CEO & Fundadora",
                      companyOrCity: "Mendes Tech - São Paulo, SP",
                      content:
                        "Implementamos a metodologia e em menos de 30 dias triplicamos a taxa de conversão das nossas campanhas.",
                      avatarUrl:
                        "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
                      rating: 5,
                      resultHighlight: "3x Mais Vendas",
                      verified: true,
                    };
                    updateP((p) => ({
                      ...p,
                      testimonials: {
                        ...p.testimonials,
                        items: [...p.testimonials.items, newTest],
                      },
                    }));
                  }}
                  className="px-5 py-2.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-purple-400 border border-purple-500/40 text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xl"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Adicionar Novo Depoimento</span>
                </button>
              </div>
            )}
            {renderSectionFloatingImages("testimonials")}
          </section>
        );

      case "formSection":
        if (!visibility.formSection || !page.formSection) return null;
        const formIndex = sectionOrder.indexOf("formSection");
        return (
          <section
            key="formSection"
            id="form-section"
            onClick={() => isEditorPreview && onSelectSection?.("formSection")}
            className={`py-16 px-4 sm:px-6 ${getContainerWidthClass(
              page.formSection.containerWidth || page.formSection.cardWidth
            )} mx-auto relative ${
              showSectionTools
                ? "cursor-pointer ring-1 ring-zinc-800/80 hover:ring-purple-500/50 rounded-3xl transition-all p-4 mb-6"
                : ""
            } ${activeSection === "formSection" && showSectionTools ? "ring-2 ring-purple-500 bg-purple-950/10 shadow-2xl z-[999]" : "z-10"}`}
          >
            {/* Quick Floating Controls Bar in Editor */}
            {showSectionTools && (
              <SectionControlToolbar
                sectionId="formSection"
                sectionTitle="FORMULÁRIO DE OFERTA & CONVERSÃO"
                icon={<Lock className="w-3.5 h-3.5 text-emerald-400" />}
                sectionIndex={formIndex}
                totalSections={sectionOrder.length}
                onMoveSection={(dir) => handleMoveSection("formSection", dir)}
                containerWidth={page.formSection.containerWidth || page.formSection.cardWidth || "normal"}
                onChangeContainerWidth={(w) =>
                  updateP((p) => ({
                    ...p,
                    formSection: { ...p.formSection, containerWidth: w, cardWidth: w },
                  }))
                }
                align={page.formSection.align || "center"}
                onChangeAlign={(a) =>
                  updateP((p) => ({ ...p, formSection: { ...p.formSection, align: a } }))
                }
                cardPadding={page.formSection.cardPadding || "normal"}
                onChangeCardPadding={(pad) =>
                  updateP((p) => ({ ...p, formSection: { ...p.formSection, cardPadding: pad } }))
                }
                cardRadius={page.formSection.cardRadius || "xl"}
                onChangeCardRadius={(rad) =>
                  updateP((p) => ({ ...p, formSection: { ...p.formSection, cardRadius: rad } }))
                }
                onHideSection={() =>
                  updateP((p) => ({ ...p, visibility: { ...p.visibility, formSection: false } }))
                }
              />
            )}

            <div
              className={`max-w-2xl mx-auto ${getRadiusClass(
                page.formSection.cardRadius
              )} ${getPaddingClass(
                page.formSection.cardPadding
              )} ${
                page.theme === "light"
                  ? "bg-white border border-zinc-200 shadow-xl"
                  : "bg-zinc-900/90 border border-zinc-800 backdrop-blur-2xl shadow-2xl"
              } relative overflow-hidden`}
            >
              {/* Glowing Background Accent */}
              <div
                className="absolute -top-32 -right-32 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none"
                style={{ backgroundColor: theme.primaryColor }}
              />

              {isSubmitted ? (
                <div className="text-center py-10 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto">
                    <Check className="w-8 h-8" />
                  </div>
                  <h3 className={`text-2xl font-bold ${page.theme === "light" ? "text-zinc-950" : "text-white"}`}>Solicitação Enviada com Sucesso!</h3>
                  <p className={`text-sm max-w-md mx-auto ${page.theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}>
                    Nossa equipe executiva entrará em contato via WhatsApp e e-mail nos próximos minutos para dar continuidade ao seu atendimento.
                  </p>
                  {page.formSection.gift?.enabled && (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setIsGiftModalOpen(true)}
                        className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-sm shadow-lg shadow-amber-500/20 inline-flex items-center gap-2 cursor-pointer transition-all hover:scale-105"
                      >
                        <Gift className="w-4 h-4" />
                        <span>{page.formSection.gift.buttonText || "Baixar Meu Brinde / Material Exclusivo"}</span>
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsSubmitted(false)}
                    className={`px-6 py-2.5 rounded-xl text-xs font-bold cursor-pointer ${
                      page.theme === "light"
                        ? "bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-200"
                        : "bg-zinc-800 hover:bg-zinc-700 text-white"
                    }`}
                  >
                    Enviar Outro Contato
                  </button>
                </div>
              ) : (
                <>
                  {/* Form Header */}
                  <div className={`mb-8 ${getHeadingAlignClass(page.formSection.align)}`}>
                    <DraggableElement
                      {...getDraggableProps("form-badge")}
                      isEditorPreview={isEditorPreview}
                      label="Selo SSL"
                      inline
                      className="mb-3"
                    >
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                        page.theme === "light"
                          ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                          : "bg-zinc-950 border border-zinc-800 text-emerald-400"
                      }`}>
                        <Lock className="w-3.5 h-3.5" />
                        <span>CONEXÃO CRIPTOGRAFADA SSL 256-BIT</span>
                      </div>
                    </DraggableElement>

                    <DraggableElement
                      {...getDraggableProps("form-title")}
                      isEditorPreview={isEditorPreview}
                      label="Título do Formulário"
                      className="mb-2"
                    >
                      <div className={`text-2xl sm:text-3xl font-extrabold ${
                        page.theme === "light" ? "text-zinc-950" : "text-white"
                      }`}>
                        <InlineEditableText
                          value={page.formSection.title || "Garanta Sua Condição Exclusiva Agora"}
                          onChange={(newVal) =>
                            updateP((p) => ({ ...p, formSection: { ...p.formSection, title: newVal } }))
                          }
                          isEditorPreview={isEditorPreview}
                          tag="h2"
                          placeholder="Título do Formulário..."
                          fieldLabel="Título do Formulário"
                        />
                      </div>
                    </DraggableElement>

                    <DraggableElement
                      {...getDraggableProps("form-subtitle")}
                      isEditorPreview={isEditorPreview}
                      label="Subtítulo do Formulário"
                    >
                      <div className={`text-xs sm:text-sm ${
                        page.theme === "light" ? "text-zinc-600" : "text-zinc-400"
                      }`}>
                        <InlineEditableText
                          value={page.formSection.subtitle || "Preencha seus dados abaixo para receber acesso prioritário:"}
                          onChange={(newVal) =>
                            updateP((p) => ({ ...p, formSection: { ...p.formSection, subtitle: newVal } }))
                          }
                          isEditorPreview={isEditorPreview}
                          tag="p"
                          placeholder="Subtítulo do Formulário..."
                        />
                      </div>
                    </DraggableElement>
                  </div>

                  {submitError && (
                    <div className="mb-6 p-3 rounded-xl bg-red-950/60 border border-red-800 text-xs text-red-300">
                      {submitError}
                    </div>
                  )}

                  {/* Editor Quick Configuration Banner for Form Questions */}
                  {isEditorPreview && (
                    <div className="mb-4 p-2.5 rounded-2xl bg-purple-950/40 border border-purple-500/50 text-purple-200 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs">
                        <Sliders className="w-4 h-4 text-purple-400 shrink-0" />
                        <div>
                          <div className="font-bold text-white text-xs">Perguntas de Qualificação do Lead</div>
                          <div className="text-[10px] text-zinc-400">
                            {cleanFormFields.filter((f) => f.enabled !== false).length} perguntas ativas (Nome, WhatsApp, E-mail, etc.)
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsLeadFormFieldsModalOpen(true)}
                        className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md hover:scale-[1.02]"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Configurar Formulário, Exibição & Brinde</span>
                      </button>
                    </div>
                  )}

                  {page.formSection.displayMode === "modal" ? (
                    <div className="rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-purple-950/40 border border-purple-500/30 p-8 sm:p-10 shadow-2xl space-y-6 text-center relative overflow-hidden">
                      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-950/80 border border-purple-500/40 text-purple-300 font-extrabold text-xs tracking-wider uppercase mx-auto">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <span>{page.formSection.badge || "ACESSO PRIORITÁRIO"}</span>
                      </div>

                      <div className="space-y-3 max-w-xl mx-auto">
                        <h3 className="text-2xl sm:text-3xl font-extrabold text-white font-display leading-tight">
                          {page.formSection.title || "Garanta Sua Condição Exclusiva Agora"}
                        </h3>
                        <p className="text-sm text-zinc-300 leading-relaxed">
                          {page.formSection.subtitle || "Clique no botão abaixo para preencher seus dados de forma rápida e garantir seu acesso prioritário."}
                        </p>
                      </div>

                      {/* Badges / Benefícios */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl mx-auto pt-2">
                        <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 flex items-center justify-center gap-2 text-xs text-zinc-300 font-medium">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>Preenchimento em 30s</span>
                        </div>
                        {page.formSection.gift?.enabled && (
                          <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 flex items-center justify-center gap-2 text-xs text-amber-300 font-medium">
                            <Gift className="w-4 h-4 text-amber-400 shrink-0" />
                            <span>Brinde Exclusivo</span>
                          </div>
                        )}
                        {assignedSurvey && (
                          <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 flex items-center justify-center gap-2 text-xs text-purple-300 font-medium">
                            <ClipboardList className="w-4 h-4 text-purple-400 shrink-0" />
                            <span>Diagnóstico VIP</span>
                          </div>
                        )}
                        <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 flex items-center justify-center gap-2 text-xs text-zinc-300 font-medium">
                          <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0" />
                          <span>100% Seguro</span>
                        </div>
                      </div>

                      <div className="pt-3">
                        <button
                          type="button"
                          onClick={() => setIsLeadModalOpen(true)}
                          className="w-full sm:w-auto px-10 py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-base shadow-xl shadow-purple-600/30 active:scale-95 transition-all cursor-pointer inline-flex items-center justify-center gap-3 border border-white/20"
                        >
                          <span>{page.formSection.ctaButtonText || "ABRIR FORMULÁRIO DE CADASTRO"}</span>
                          <ArrowRight className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Banners informativos se há pesquisa ou brinde atrelado */}
                      {assignedSurvey && (
                        <div className="p-3.5 rounded-2xl bg-purple-950/40 border border-purple-500/40 text-purple-200 flex items-center gap-3 text-xs text-left">
                          <ClipboardList className="w-5 h-5 text-amber-400 shrink-0 animate-pulse" />
                          <div>
                            <span className="font-bold text-white block">Diagnóstico & Pesquisa Vinculada</span>
                            <span className="text-zinc-300 text-[11px]">
                              Preencha seus dados de contato abaixo. Ao enviar, você responderá a uma rápida pesquisa e receberá seu diagnóstico.
                            </span>
                          </div>
                        </div>
                      )}

                      {page.formSection.gift?.enabled && (
                        <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/40 text-amber-200 flex items-center gap-3 text-xs text-left">
                          <Gift className="w-5 h-5 text-amber-400 shrink-0" />
                          <div>
                            <span className="font-bold text-white block">
                              Brinde Exclusivo: {page.formSection.gift.title || "Material Gratuito Liberado"}
                            </span>
                            <span className="text-zinc-300 text-[11px]">
                              {page.formSection.gift.description || "Preencha o formulário para liberar seu download imediatamente."}
                            </span>
                          </div>
                        </div>
                      )}

                      <form onSubmit={handleLeadSubmit} className="space-y-4">
                      {cleanFormFields
                      .filter((f) => f.enabled !== false)
                      .map((field) => {
                        if (field.id === "name") {
                          return (
                            <div key={field.id}>
                              <label
                                className={`block text-xs font-semibold mb-1.5 ${
                                  page.theme === "light" ? "text-zinc-700" : "text-zinc-300"
                                }`}
                              >
                                {field.label} {field.required && "*"}
                              </label>
                              <input
                                type="text"
                                required={field.required}
                                value={leadName}
                                onChange={(e) => setLeadName(e.target.value)}
                                placeholder={field.placeholder || "Ex: Carlos Eduardo Silva"}
                                className={`w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-purple-500 transition-colors ${
                                  page.theme === "light"
                                    ? "bg-white border border-zinc-300 text-zinc-900 placeholder-zinc-400"
                                    : "bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-500"
                                }`}
                              />
                            </div>
                          );
                        }

                        if (field.id === "phone") {
                          return (
                            <div key={field.id}>
                              <label
                                className={`block text-xs font-semibold mb-1.5 ${
                                  page.theme === "light" ? "text-zinc-700" : "text-zinc-300"
                                }`}
                              >
                                {field.label} {field.required && "*"}
                              </label>
                              <input
                                type="tel"
                                required={field.required}
                                value={leadPhone}
                                onChange={(e) => setLeadPhone(formatBrazilianPhone(e.target.value))}
                                placeholder={field.placeholder || "(11) 98765-4321"}
                                className={`w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-purple-500 transition-colors ${
                                  page.theme === "light"
                                    ? "bg-white border border-zinc-300 text-zinc-900 placeholder-zinc-400"
                                    : "bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-500"
                                }`}
                              />
                            </div>
                          );
                        }

                        if (field.id === "email") {
                          return (
                            <div key={field.id}>
                              <label
                                className={`block text-xs font-semibold mb-1.5 ${
                                  page.theme === "light" ? "text-zinc-700" : "text-zinc-300"
                                }`}
                              >
                                {field.label} {field.required && "*"}
                              </label>
                              <input
                                type="email"
                                required={field.required}
                                value={leadEmail}
                                onChange={(e) => setLeadEmail(e.target.value)}
                                placeholder={field.placeholder || "carlos@empresa.com.br"}
                                className={`w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-purple-500 transition-colors ${
                                  page.theme === "light"
                                    ? "bg-white border border-zinc-300 text-zinc-900 placeholder-zinc-400"
                                    : "bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-500"
                                }`}
                              />
                            </div>
                          );
                        }

                        if (field.type === "select") {
                          return (
                            <div key={field.id}>
                              <label
                                className={`block text-xs font-semibold mb-1.5 ${
                                  page.theme === "light" ? "text-zinc-700" : "text-zinc-300"
                                }`}
                              >
                                {field.label} {field.required && "*"}
                              </label>
                              <select
                                required={field.required}
                                value={customFormAnswers[field.id] || ""}
                                onChange={(e) =>
                                  setCustomFormAnswers((prev) => ({
                                    ...prev,
                                    [field.id]: e.target.value,
                                  }))
                                }
                                className={`w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-purple-500 transition-colors cursor-pointer ${
                                  page.theme === "light"
                                    ? "bg-white border border-zinc-300 text-zinc-900"
                                    : "bg-zinc-950 border border-zinc-800 text-white"
                                }`}
                              >
                                <option value="">{field.placeholder || "Selecione uma opção..."}</option>
                                {(field.options || []).map((opt, optIdx) => (
                                  <option key={optIdx} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            </div>
                          );
                        }

                        return (
                          <div key={field.id}>
                            <label
                              className={`block text-xs font-semibold mb-1.5 ${
                                page.theme === "light" ? "text-zinc-700" : "text-zinc-300"
                              }`}
                            >
                              {field.label} {field.required && "*"}
                            </label>
                            <input
                              type={
                                field.type === "number"
                                  ? "number"
                                  : field.type === "tel"
                                  ? "tel"
                                  : "text"
                              }
                              required={field.required}
                              value={customFormAnswers[field.id] || ""}
                              onChange={(e) =>
                                setCustomFormAnswers((prev) => ({
                                  ...prev,
                                  [field.id]: e.target.value,
                                }))
                              }
                              placeholder={field.placeholder || ""}
                              className={`w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-purple-500 transition-colors ${
                                page.theme === "light"
                                  ? "bg-white border border-zinc-300 text-zinc-900 placeholder-zinc-400"
                                  : "bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-500"
                              }`}
                            />
                          </div>
                        );
                      })}

                    <div className="pt-2">
                      <VisualEditableButton
                        buttonId="form-submit-cta"
                        text={page.formSection.ctaButtonText || "Quero Garantir Minha Vaga Agora"}
                        onTextChange={(newVal) =>
                          updateP((p) => ({
                            ...p,
                            formSection: { ...p.formSection, ctaButtonText: newVal },
                          }))
                        }
                        buttonStyle={getButtonStyle("form-submit-cta")}
                        onStyleChange={(s) => setButtonStyle("form-submit-cta", s)}
                        isEditorPreview={isEditorPreview}
                        themeGlow={theme.ctaGlow}
                        accentColor={page.accentColor}
                        customAccentHex={page.customAccentHex}
                        nicheContext={page.niche}
                        type="submit"
                        disabled={isSubmitting}
                        loading={isSubmitting}
                      />
                    </div>

                    {/* Guarantee Text */}
                    <div className={`pt-4 text-center text-xs flex items-center justify-center gap-2 ${
                      page.theme === "light" ? "text-zinc-500" : "text-zinc-400"
                    }`}>
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <InlineEditableText
                        value={page.formSection.guaranteeText || "Seus dados estão 100% seguros e protegidos pela LGPD."}
                        onChange={(newVal) =>
                          updateP((p) => ({
                            ...p,
                            formSection: { ...p.formSection, guaranteeText: newVal },
                          }))
                        }
                        isEditorPreview={isEditorPreview}
                        tag="span"
                        placeholder="Texto da garantia..."
                      />
                    </div>
                  </form>
                  </div>
                  )}
                </>
              )}
            </div>
            {renderSectionFloatingImages("formSection")}
          </section>
        );

      case "faq":
        if (!visibility.faq || !page.faq || page.faq.length === 0) return null;
        const faqIndex = sectionOrder.indexOf("faq");
        return (
          <section
            key="faq"
            id="faq-section"
            onClick={() => isEditorPreview && onSelectSection?.("faq")}
            className={`py-16 px-4 sm:px-6 max-w-5xl mx-auto relative ${
              showSectionTools
                ? "cursor-pointer ring-1 ring-zinc-800/80 hover:ring-purple-500/50 rounded-3xl transition-all p-4 mb-6"
                : ""
            } ${activeSection === "faq" && showSectionTools ? "ring-2 ring-purple-500 bg-purple-950/10 shadow-2xl z-[999]" : "z-10"}`}
          >
            {/* Quick Floating Controls Bar in Editor */}
            {showSectionTools && (
              <SectionControlToolbar
                sectionId="faq"
                sectionTitle="FAQ - PERGUNTAS FREQUENTES"
                icon={<HelpCircle className="w-3.5 h-3.5 text-purple-400" />}
                sectionIndex={faqIndex}
                totalSections={sectionOrder.length}
                onMoveSection={(dir) => handleMoveSection("faq", dir)}
                onHideSection={() =>
                  updateP((p) => ({ ...p, visibility: { ...p.visibility, faq: false } }))
                }
              />
            )}

            {/* Header */}
            <div className="text-center mb-12">
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-3 ${
                page.theme === "light"
                  ? "bg-purple-50 border border-purple-200 text-purple-700"
                  : "bg-zinc-900 border border-zinc-800 text-purple-400"
              }`}>
                <HelpCircle className="w-3.5 h-3.5" />
                <span>TIRE TODAS AS SUAS DÚVIDAS</span>
              </div>

              <h2 className={`text-2xl sm:text-4xl font-extrabold mb-3 ${
                page.theme === "light" ? "text-zinc-900" : "text-white"
              }`}>
                Perguntas Frequentes
              </h2>
              <p className={`text-sm sm:text-base max-w-2xl mx-auto ${
                page.theme === "light" ? "text-zinc-600" : "text-zinc-400"
              }`}>
                Tudo o que você precisa saber antes de dar o próximo passo:
              </p>
            </div>

            {/* Accordion FAQ Items */}
            <div className="max-w-3xl mx-auto space-y-3">
              {page.faq.map((item, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div
                    key={item.id || idx}
                    className={`rounded-2xl border transition-all overflow-hidden relative group/faq ${
                      page.theme === "light"
                        ? "bg-white border-zinc-200 shadow-sm hover:border-zinc-300"
                        : "bg-zinc-900/70 border border-zinc-800/90 backdrop-blur-xl"
                    }`}
                  >
                    {/* Move & Delete FAQ Buttons in Editor */}
                    {isEditorPreview && (
                      <div className="opacity-0 group-hover/faq:opacity-100 transition-opacity absolute top-3 right-12 z-20 flex items-center gap-1 p-0.5 rounded-lg bg-zinc-950/95 border border-zinc-800 shadow-xl">
                        {/* Move Up */}
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (idx > 0) {
                              const nextFaq = [...page.faq];
                              const [m] = nextFaq.splice(idx, 1);
                              nextFaq.splice(idx - 1, 0, m);
                              updateP((p) => ({ ...p, faq: nextFaq }));
                            }
                          }}
                          className={`p-1 rounded bg-zinc-900 ${
                            idx === 0 ? "opacity-30 cursor-not-allowed" : "text-zinc-400 hover:text-white cursor-pointer"
                          }`}
                          title="Subir Pergunta"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>

                        {/* Move Down */}
                        <button
                          type="button"
                          disabled={idx >= page.faq.length - 1}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (idx < page.faq.length - 1) {
                              const nextFaq = [...page.faq];
                              const [m] = nextFaq.splice(idx, 1);
                              nextFaq.splice(idx + 1, 0, m);
                              updateP((p) => ({ ...p, faq: nextFaq }));
                            }
                          }}
                          className={`p-1 rounded bg-zinc-900 ${
                            idx >= page.faq.length - 1 ? "opacity-30 cursor-not-allowed" : "text-zinc-400 hover:text-white cursor-pointer"
                          }`}
                          title="Descer Pergunta"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>

                        {/* Duplicate */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const copy = { ...item, id: `faq_${Date.now()}`, question: `${item.question} (Cópia)` };
                            const next = [
                              ...page.faq.slice(0, idx + 1),
                              copy,
                              ...page.faq.slice(idx + 1),
                            ];
                            updateP((p) => ({ ...p, faq: next }));
                          }}
                          className="p-1 rounded bg-zinc-900 text-zinc-400 hover:text-white cursor-pointer"
                          title="Duplicar Pergunta"
                        >
                          <Copy className="w-3 h-3" />
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateP((p) => ({
                              ...p,
                              faq: p.faq.filter((_, i) => i !== idx),
                            }));
                          }}
                          className="p-1 rounded bg-zinc-900 text-red-400 hover:text-white hover:bg-red-600 cursor-pointer"
                          title="Excluir Pergunta"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    <div
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className="p-5 sm:p-6 flex items-center justify-between cursor-pointer select-none"
                    >
                      <div className={`text-base sm:text-lg font-bold pr-4 flex-1 ${
                        page.theme === "light" ? "text-zinc-900" : "text-white"
                      }`}>
                        <InlineEditableText
                          value={item.question}
                          onChange={(newVal) =>
                            updateP((p) => {
                              const nextFaq = [...page.faq];
                              nextFaq[idx] = { ...nextFaq[idx], question: newVal };
                              return { ...p, faq: nextFaq };
                            })
                          }
                          isEditorPreview={isEditorPreview}
                          tag="h3"
                          placeholder="Pergunta..."
                          fieldLabel="Pergunta"
                        />
                      </div>
                      <ChevronDown
                        className={`w-5 h-5 transition-transform duration-300 flex-shrink-0 ${
                          isOpen
                            ? "rotate-180 text-purple-500"
                            : (page.theme === "light" ? "text-zinc-400" : "text-zinc-500")
                        }`}
                      />
                    </div>

                    {(isOpen || isEditorPreview) && (
                      <div className={`px-5 sm:px-6 pb-6 pt-1 text-sm sm:text-base leading-relaxed border-t ${
                        page.theme === "light"
                          ? "text-zinc-600 border-zinc-100"
                          : "text-zinc-400 border-zinc-800/60"
                      }`}>
                        <InlineEditableText
                          value={item.answer}
                          onChange={(newVal) =>
                            updateP((p) => {
                              const nextFaq = [...page.faq];
                              nextFaq[idx] = { ...nextFaq[idx], answer: newVal };
                              return { ...p, faq: nextFaq };
                            })
                          }
                          isEditorPreview={isEditorPreview}
                          tag="p"
                          multiline={true}
                          placeholder="Resposta detalhada e persuasiva..."
                          fieldLabel="Resposta"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Add FAQ Button in Editor */}
            {isEditorPreview && (
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const newFaq: FaqItem = {
                      id: `faq_${Date.now()}`,
                      question: "Como funciona a garantia incondicional de satisfação?",
                      answer:
                        "Se por qualquer motivo dentro do prazo legal você não ficar 100% satisfeito com a entrega, basta um único e-mail para reembolsarmos 100% do seu investimento.",
                    };
                    updateP((p) => ({
                      ...p,
                      faq: [...p.faq, newFaq],
                    }));
                  }}
                  className="px-5 py-2.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-purple-400 border border-purple-500/40 text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xl"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Adicionar Nova Pergunta Frequente</span>
                </button>
              </div>
            )}
            {renderSectionFloatingImages("faq")}
          </section>
        );

      default:
        return null;
    }
  };

  return (
    <EditorContext.Provider value={{ hideEditToolbars }}>
      <div
        className={`min-h-screen ${
          page.theme === "light"
            ? "bg-white text-zinc-900"
            : "bg-zinc-950 text-white"
        } font-sans selection:bg-purple-500 selection:text-white relative overflow-x-hidden`}
        style={
          page.backgroundType === "solid" && page.backgroundColorHex
            ? { backgroundColor: page.backgroundColorHex }
            : page.backgroundType === "gradient" && page.backgroundGradient
            ? { background: page.backgroundGradient }
            : page.backgroundType === "image" && page.backgroundImageUrl
            ? {
                backgroundImage: `url(${page.backgroundImageUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : page.theme === "light"
            ? {
                backgroundColor: "#ffffff",
                background: `radial-gradient(ellipse at 50% 0%, ${theme.primaryHex}0a 0%, transparent 65%), #ffffff`,
              }
            : {
                background: `radial-gradient(ellipse at 50% 0%, ${theme.glowColor} 0%, transparent 60%), #09090b`,
              }
        }
      >
      {/* Background Gradients */}
      {page.theme !== "light" && (
        <div className="fixed inset-0 pointer-events-none z-0">
          <div
            className="absolute top-1/4 -left-48 w-96 h-96 rounded-full blur-[140px] opacity-15"
            style={{ backgroundColor: theme.primaryColor }}
          />
          <div
            className="absolute top-2/3 -right-48 w-96 h-96 rounded-full blur-[140px] opacity-15"
            style={{ backgroundColor: theme.secondaryColor }}
          />
        </div>
      )}

      {/* Main Content Area */}
      <div className="relative z-10">
        {/* HEADER NAVBAR (MENU SUPERIOR DE REPARTIÇÕES) */}
        {(() => {
          const navConfig = page.headerNav || DEFAULT_HEADER_NAV;
          if (!navConfig.enabled && !isEditorPreview) return null;
          return (
            <HeaderNavbar
              config={navConfig}
              accentColor={page.accentColor}
              customAccentHex={page.customAccentHex}
              theme={page.theme}
              isEditorPreview={isEditorPreview}
              onUpdateConfig={(newNav) => updateP((p) => ({ ...p, headerNav: newNav }))}
              onSelectSection={onSelectSection}
              onOpenImagePicker={onOpenImagePicker}
            />
          );
        })()}
        {sectionOrder.map((secName) => renderSection(secName))}

        {/* Footer */}
        <footer className="py-12 px-4 sm:px-6 border-t border-zinc-900 bg-zinc-950/80 text-center text-xs text-zinc-500">
          <div className="max-w-4xl mx-auto space-y-3">
            <div className="font-bold text-sm text-zinc-300">
              <InlineEditableText
                value={page.title || "Landing Page Oficial"}
                onChange={(newVal) => updateP((p) => ({ ...p, title: newVal }))}
                isEditorPreview={isEditorPreview}
                tag="span"
                placeholder="Nome da Empresa..."
              />
            </div>
            <div>
              <InlineEditableText
                value="Todos os direitos reservados. Este site não faz parte nem é endossado pelo Facebook, Google ou qualquer entidade governamental."
                onChange={() => {}}
                isEditorPreview={false}
                tag="p"
                className="max-w-2xl mx-auto leading-relaxed"
              />
            </div>
            <div className="pt-2 text-[11px] text-zinc-600">
              © {new Date().getFullYear()} — Plataforma construída para alta conversão e escala.
            </div>
          </div>
        </footer>
      </div>

      {/* Sticky Mobile CTA Bar */}
      {visibility.stickyMobileCta && (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 p-3 bg-zinc-950/90 backdrop-blur-lg border-t border-zinc-800 z-40">
          <button
            type="button"
            onClick={() => {
              if (!isEditorPreview) {
                scrollToSection("form-section");
              }
            }}
            className={`w-full py-3.5 px-4 rounded-xl ${theme.ctaBg} text-white font-extrabold text-sm shadow-xl flex items-center justify-center gap-2`}
          >
            <span>{page.hero?.ctaText}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Draggable Floating Edit Panel for Selected Card */}
      {isEditorPreview && floatingCardConfig && (
        <DraggableFloatingCard
          isOpen={Boolean(floatingCardConfig)}
          title={floatingCardConfig.title}
          badge="PAINEL FLUTUANTE DE EDIÇÃO"
          icon={Sliders}
          initialX={Math.min(typeof window !== "undefined" ? window.innerWidth - 440 : 600, 60)}
          initialY={140}
          widthClass="w-96 sm:w-[420px]"
          onClose={() => {
            setFloatingCardConfig(null);
            setPinnedCardId(null);
          }}
        >
          {/* 1. BENTO CARD FLOATING EDITOR */}
          {floatingCardConfig.type === "bento" && (() => {
            const bentoIdx = page.bentoGrid.items.findIndex((i) => i.id === floatingCardConfig.id);
            if (bentoIdx === -1) return <p className="text-xs text-zinc-400">Card não encontrado.</p>;
            const item = page.bentoGrid.items[bentoIdx];

            return (
              <div className="space-y-4 text-xs">
                {/* Title */}
                <div className="space-y-1">
                  <label className="block text-zinc-300 font-bold">Título do Card</label>
                  <input
                    type="text"
                    value={item.title}
                    onChange={(e) => {
                      const newVal = e.target.value;
                      updateP((p) => {
                        const next = [...p.bentoGrid.items];
                        next[bentoIdx] = { ...next[bentoIdx], title: newVal };
                        return { ...p, bentoGrid: { ...p.bentoGrid, items: next } };
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-purple-500 font-medium"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="block text-zinc-300 font-bold">Descrição</label>
                  <textarea
                    rows={3}
                    value={item.description}
                    onChange={(e) => {
                      const newVal = e.target.value;
                      updateP((p) => {
                        const next = [...p.bentoGrid.items];
                        next[bentoIdx] = { ...next[bentoIdx], description: newVal };
                        return { ...p, bentoGrid: { ...p.bentoGrid, items: next } };
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-purple-500 font-medium"
                  />
                </div>

                {/* Tag & Metric */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="block text-zinc-300 font-bold">Selo / Tag</label>
                    <input
                      type="text"
                      value={item.tag || ""}
                      onChange={(e) => {
                        const newVal = e.target.value;
                        updateP((p) => {
                          const next = [...p.bentoGrid.items];
                          next[bentoIdx] = { ...next[bentoIdx], tag: newVal };
                          return { ...p, bentoGrid: { ...p.bentoGrid, items: next } };
                        });
                      }}
                      placeholder="Ex: Exclusivo"
                      className="w-full px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-zinc-300 font-bold">Métrica / Destaque</label>
                    <input
                      type="text"
                      value={item.metric || ""}
                      onChange={(e) => {
                        const newVal = e.target.value;
                        updateP((p) => {
                          const next = [...p.bentoGrid.items];
                          next[bentoIdx] = { ...next[bentoIdx], metric: newVal };
                          return { ...p, bentoGrid: { ...p.bentoGrid, items: next } };
                        });
                      }}
                      placeholder="Ex: +450%"
                      className="w-full px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                {/* Custom Card Color & Gradient Preset Selector */}
                <div className="space-y-2 pt-2 border-t border-zinc-800/80">
                  <div className="flex items-center justify-between">
                    <label className="block text-zinc-300 font-bold">Estilo de Cor do Card</label>
                    {(item.customGradient || item.customBgColorHex) && (
                      <button
                        type="button"
                        onClick={() => {
                          updateP((p) => {
                            const next = [...p.bentoGrid.items];
                            next[bentoIdx] = {
                              ...next[bentoIdx],
                              customGradient: undefined,
                              customBgColorHex: undefined,
                              customTextColorHex: undefined,
                            };
                            return { ...p, bentoGrid: { ...p.bentoGrid, items: next } };
                          });
                        }}
                        className="text-[10px] text-purple-400 hover:text-purple-300 underline cursor-pointer"
                      >
                        Resetar Cor
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {CARD_PRESET_GRADIENTS.map((preset) => {
                      const isSel = (item.customGradient || "") === preset.gradient;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            updateP((p) => {
                              const next = [...p.bentoGrid.items];
                              next[bentoIdx] = {
                                ...next[bentoIdx],
                                customGradient: preset.gradient || undefined,
                              };
                              return { ...p, bentoGrid: { ...p.bentoGrid, items: next } };
                            });
                          }}
                          className={`px-2.5 py-2 rounded-xl border text-[11px] font-bold text-left flex items-center gap-2 cursor-pointer transition-all ${
                            isSel
                              ? "border-purple-500 bg-purple-950/40 text-white ring-1 ring-purple-500"
                              : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700"
                          }`}
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0"
                            style={{ backgroundColor: preset.colorHex }}
                          />
                          <span className="truncate">{preset.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Manual Hex Override */}
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <div>
                      <label className="block text-[10px] text-zinc-400 font-bold mb-1">Fundo (Hex)</label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={item.customBgColorHex || "#18181b"}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateP((p) => {
                              const next = [...p.bentoGrid.items];
                              next[bentoIdx] = {
                                ...next[bentoIdx],
                                customBgColorHex: val,
                                customGradient: undefined,
                              };
                              return { ...p, bentoGrid: { ...p.bentoGrid, items: next } };
                            });
                          }}
                          className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 cursor-pointer p-0.5"
                        />
                        <input
                          type="text"
                          value={item.customBgColorHex || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateP((p) => {
                              const next = [...p.bentoGrid.items];
                              next[bentoIdx] = {
                                ...next[bentoIdx],
                                customBgColorHex: val,
                                customGradient: undefined,
                              };
                              return { ...p, bentoGrid: { ...p.bentoGrid, items: next } };
                            });
                          }}
                          placeholder="#18181b"
                          className="w-full px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-white font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-zinc-400 font-bold mb-1">Texto (Hex)</label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={item.customTextColorHex || "#ffffff"}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateP((p) => {
                              const next = [...p.bentoGrid.items];
                              next[bentoIdx] = {
                                ...next[bentoIdx],
                                customTextColorHex: val,
                              };
                              return { ...p, bentoGrid: { ...p.bentoGrid, items: next } };
                            });
                          }}
                          className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 cursor-pointer p-0.5"
                        />
                        <input
                          type="text"
                          value={item.customTextColorHex || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateP((p) => {
                              const next = [...p.bentoGrid.items];
                              next[bentoIdx] = {
                                ...next[bentoIdx],
                                customTextColorHex: val,
                              };
                              return { ...p, bentoGrid: { ...p.bentoGrid, items: next } };
                            });
                          }}
                          placeholder="#ffffff"
                          className="w-full px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-white font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Media & Icon Pickers */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/80">
                  <button
                    type="button"
                    onClick={() => {
                      onOpenIconPicker?.({
                        currentIcon: item.iconName || "Zap",
                        onSelect: (newIcon) => {
                          updateP((p) => {
                            const next = [...p.bentoGrid.items];
                            next[bentoIdx] = { ...next[bentoIdx], iconName: newIcon };
                            return { ...p, bentoGrid: { ...p.bentoGrid, items: next } };
                          });
                        },
                        title: `Trocar Ícone: ${item.title}`,
                      });
                    }}
                    className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-purple-300 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Trocar Ícone</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onOpenImagePicker?.({
                        type: "bento",
                        currentUrl: item.imageUrl || "",
                        itemId: item.id,
                        title: `Trocar Imagem de "${item.title}"`,
                      });
                    }}
                    className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-purple-300 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Trocar Foto</span>
                  </button>
                </div>

                {/* Column Size Selector */}
                <div className="space-y-1.5 pt-2 border-t border-zinc-800/80">
                  <label className="block text-zinc-300 font-bold">Proporção / Colunas no Grid</label>
                  <div className="grid grid-cols-4 gap-1">
                    {[
                      { id: "standard", label: "1x1", title: "Padrão" },
                      { id: "wide", label: "2x1", title: "Largo" },
                      { id: "tall", label: "1x2", title: "Alto" },
                      { id: "large", label: "2x2", title: "Destaque 2x2" },
                    ].map((sz) => {
                      const isSel = (item.size || "standard") === sz.id;
                      return (
                        <button
                          key={sz.id}
                          type="button"
                          onClick={() => {
                            updateP((p) => {
                              const next = [...p.bentoGrid.items];
                              next[bentoIdx] = { ...next[bentoIdx], size: sz.id as any };
                              return { ...p, bentoGrid: { ...p.bentoGrid, items: next } };
                            });
                          }}
                          className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            isSel
                              ? "bg-purple-600 text-white shadow"
                              : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
                          }`}
                        >
                          {sz.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Botão de Ação CTA do Card */}
                <div className="space-y-3 pt-3 border-t border-zinc-800/80">
                  <h4 className="text-zinc-200 font-bold flex items-center gap-1.5 text-xs">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    <span>Botão de Ação CTA (Opcional)</span>
                  </h4>

                  <div className="space-y-1.5">
                    <label className="block text-zinc-400 font-semibold">Texto do Botão</label>
                    <input
                      type="text"
                      value={item.buttonText || ""}
                      onChange={(e) => {
                        const newVal = e.target.value;
                        updateP((p) => {
                          const next = [...p.bentoGrid.items];
                          next[bentoIdx] = { ...next[bentoIdx], buttonText: newVal };
                          return { ...p, bentoGrid: { ...p.bentoGrid, items: next } };
                        });
                      }}
                      placeholder="Ex: Saber Mais, Comprar Ebook, etc."
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-purple-500 font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <label className="block text-zinc-400 font-semibold">Link de Destino / URL</label>
                      <input
                        type="text"
                        value={item.buttonUrl || ""}
                        onChange={(e) => {
                          const newVal = e.target.value;
                          updateP((p) => {
                            const next = [...p.bentoGrid.items];
                            next[bentoIdx] = { ...next[bentoIdx], buttonUrl: newVal };
                            return { ...p, bentoGrid: { ...p.bentoGrid, items: next } };
                          });
                        }}
                        placeholder="Ex: #form-section ou https://..."
                        className="w-full px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-zinc-400 font-semibold">Estilo do Botão</label>
                      <select
                        value={item.buttonStyle || "primary"}
                        onChange={(e) => {
                          const newVal = e.target.value;
                          updateP((p) => {
                            const next = [...p.bentoGrid.items];
                            next[bentoIdx] = { ...next[bentoIdx], buttonStyle: newVal as any };
                            return { ...p, bentoGrid: { ...p.bentoGrid, items: next } };
                          });
                        }}
                        className="w-full px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-purple-500 cursor-pointer text-xs"
                      >
                        <option value="primary">Destaque (Cor Principal)</option>
                        <option value="secondary">Neutro (Cinza/Branco)</option>
                        <option value="outline">Borda / Contorno</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* 2. TESTIMONIAL FLOATING EDITOR */}
          {floatingCardConfig.type === "testimonial" && (() => {
            const testIdx = page.testimonials.items.findIndex((i) => i.id === floatingCardConfig.id);
            if (testIdx === -1) return <p className="text-xs text-zinc-400">Depoimento não encontrado.</p>;
            const item = page.testimonials.items[testIdx];

            return (
              <div className="space-y-4 text-xs">
                {/* Name & Role */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="block text-zinc-300 font-bold">Nome do Cliente</label>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateP((p) => {
                          const next = [...p.testimonials.items];
                          next[testIdx] = { ...next[testIdx], name: val };
                          return { ...p, testimonials: { ...p.testimonials, items: next } };
                        });
                      }}
                      className="w-full px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-zinc-300 font-bold">Cargo / Cidade</label>
                    <input
                      type="text"
                      value={item.companyOrCity || item.role || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateP((p) => {
                          const next = [...p.testimonials.items];
                          next[testIdx] = { ...next[testIdx], companyOrCity: val, role: val };
                          return { ...p, testimonials: { ...p.testimonials, items: next } };
                        });
                      }}
                      className="w-full px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-1">
                  <label className="block text-zinc-300 font-bold">Depoimento Completo</label>
                  <textarea
                    rows={3}
                    value={item.content}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateP((p) => {
                        const next = [...p.testimonials.items];
                        next[testIdx] = { ...next[testIdx], content: val };
                        return { ...p, testimonials: { ...p.testimonials, items: next } };
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-purple-500 font-medium"
                  />
                </div>

                {/* Result highlight */}
                <div className="space-y-1">
                  <label className="block text-zinc-300 font-bold">Resultado de Destaque</label>
                  <input
                    type="text"
                    value={item.resultHighlight || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateP((p) => {
                        const next = [...p.testimonials.items];
                        next[testIdx] = { ...next[testIdx], resultHighlight: val };
                        return { ...p, testimonials: { ...p.testimonials, items: next } };
                      });
                    }}
                    placeholder="Ex: +300% de Lucro em 30 Dias"
                    className="w-full px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-purple-500 font-bold"
                  />
                </div>

                {/* Preset Colors */}
                <div className="space-y-2 pt-2 border-t border-zinc-800/80">
                  <label className="block text-zinc-300 font-bold">Estilo de Cor do Card</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {CARD_PRESET_GRADIENTS.map((preset) => {
                      const isSel = (item.customGradient || "") === preset.gradient;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            updateP((p) => {
                              const next = [...p.testimonials.items];
                              next[testIdx] = {
                                ...next[testIdx],
                                customGradient: preset.gradient || undefined,
                              };
                              return { ...p, testimonials: { ...p.testimonials, items: next } };
                            });
                          }}
                          className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold text-left flex items-center gap-2 cursor-pointer transition-all ${
                            isSel
                              ? "border-purple-500 bg-purple-950/40 text-white ring-1 ring-purple-500"
                              : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700"
                          }`}
                        >
                          <span
                            className="w-3 h-3 rounded-full border border-white/20 shrink-0"
                            style={{ backgroundColor: preset.colorHex }}
                          />
                          <span className="truncate">{preset.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Photo upload button */}
                <div className="pt-2 border-t border-zinc-800/80 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      onOpenImagePicker?.({
                        type: "testimonial",
                        currentUrl: item.avatarUrl || "",
                        itemId: item.id,
                        title: `Trocar Foto de "${item.name}"`,
                      });
                    }}
                    className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Trocar Foto do Cliente</span>
                  </button>
                </div>
              </div>
            );
          })()}
        </DraggableFloatingCard>
      )}

      {/* Floating TALK WhatsApp Widget */}
      <FloatingTalkWhatsAppWidget
        talkConfig={page.talkConfig}
        niche={page.niche}
        city={page.cityOrRegion}
        isEditorPreview={isEditorPreview}
      />

      {/* Lead Form Fields & Qualification Questions Modal */}
      {isLeadFormFieldsModalOpen && (
        <LeadFormFieldsModal
          isOpen={isLeadFormFieldsModalOpen}
          onClose={() => setIsLeadFormFieldsModalOpen(false)}
          fields={page.formSection.fields || DEFAULT_LEAD_FIELDS}
          displayMode={page.formSection.displayMode || "inline"}
          gift={page.formSection.gift}
          onSave={(newFields, displayMode, gift) => {
            updateP((p) => ({
              ...p,
              formSection: {
                ...p.formSection,
                fields: newFields,
                displayMode,
                gift,
              },
            }));
          }}
        />
      )}

      {/* Modal Card de Cadastro de Lead Pré-Pesquisa */}
      {isSurveyLeadFormOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-zinc-950 border border-zinc-800/80 rounded-2xl p-5 shadow-2xl text-white space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div>
                <h3 className="font-extrabold text-lg text-white font-display">Identificação</h3>
                <p className="text-[11px] text-zinc-400 font-medium">Preencha seus dados para iniciar.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsSurveyLeadFormOpen(false)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs font-bold transition-colors cursor-pointer uppercase tracking-wider"
              >
                <span>FECHAR</span>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleConfirmSurveyLead} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Tiago Rezeck"
                  value={leadCaptureFormInput.name}
                  onChange={(e) => setLeadCaptureFormInput({ ...leadCaptureFormInput, name: e.target.value })}
                  className="w-full px-3.5 py-3 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-white placeholder-zinc-500 text-xs font-medium outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1">
                  E-mail Corporativo / Principal *
                </label>
                <input
                  type="email"
                  required
                  placeholder="tiagorezeck@hotmail.com"
                  value={leadCaptureFormInput.email}
                  onChange={(e) => setLeadCaptureFormInput({ ...leadCaptureFormInput, email: e.target.value })}
                  className="w-full px-3.5 py-3 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-white placeholder-zinc-500 text-xs font-medium outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1">
                  WhatsApp com DDD *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="(24) 99938-2195"
                  value={leadCaptureFormInput.whatsapp}
                  onChange={(e) => setLeadCaptureFormInput({ ...leadCaptureFormInput, whatsapp: formatBrazilianPhone(e.target.value) })}
                  className="w-full px-3.5 py-3 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-white placeholder-zinc-500 text-xs font-medium outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Você possui ou representa uma empresa?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setLeadCaptureFormInput({ ...leadCaptureFormInput, company: "Pessoa Física" })}
                    className={cn(
                      "p-2.5 rounded-xl border text-[11px] font-bold transition-all text-left cursor-pointer",
                      leadCaptureFormInput.company === "Pessoa Física" || !leadCaptureFormInput.company
                        ? "border-orange-500 bg-orange-500/10 text-orange-300 ring-1 ring-orange-500/50"
                        : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:border-zinc-700"
                    )}
                  >
                    Não, sou PF
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeadCaptureFormInput({ ...leadCaptureFormInput, company: "Empresa / CNPJ" })}
                    className={cn(
                      "p-2.5 rounded-xl border text-[11px] font-bold transition-all text-left cursor-pointer",
                      leadCaptureFormInput.company === "Empresa / CNPJ" || (leadCaptureFormInput.company && leadCaptureFormInput.company !== "Pessoa Física")
                        ? "border-orange-500 bg-orange-500/10 text-orange-300 ring-1 ring-orange-500/50"
                        : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:border-zinc-700"
                    )}
                  >
                    Sim, Empresa
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:opacity-95 active:scale-95 text-white font-extrabold text-xs shadow-lg shadow-orange-500/30 transition-all cursor-pointer flex items-center justify-center gap-2 border border-orange-400/30"
                >
                  <span>CONCLUIR CADASTRO</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <p className="text-[10px] text-center text-zinc-500 font-medium">
                🔒 Seus dados serão gravados com segurança na base.
              </p>
            </form>
          </div>
        </div>
      )}

      {/* Pesquisa & Diagnóstico em Página Inteira, Sem Rolagem */}
      {isSurveyModalOpen && (
        <div className="fixed inset-0 w-screen h-screen z-[99999] bg-[#070B14] text-white flex flex-col overflow-hidden animate-in fade-in duration-200">
          <div className="absolute top-4 right-4 z-30">
            <button
              type="button"
              onClick={() => setIsSurveyModalOpen(false)}
              className="p-2.5 rounded-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer shadow-lg"
              title="Fechar Pesquisa"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 w-full h-full flex flex-col overflow-hidden">
              {(() => {
                const surveyToUse = assignedSurvey || {
                  id: "default-survey-hero",
                  title: page.title ? `Pesquisa: ${page.title}` : "Pesquisa de Qualificação",
                  name: "Pesquisa & Diagnóstico Exclusivo",
                  description: "Responda 3 perguntas rápidas para liberar seu presente / voucher exclusivo na tela final.",
                  status: "active",
                  questions: [
                    {
                      id: "q1",
                      title: "Qual seu principal objetivo atualmente?",
                      type: "single",
                      required: true,
                      options: [
                        { id: "o1", label: "Aumentar faturamento e escalar vendas", value: "vendas", score: 10 },
                        { id: "o2", label: "Otimizar tempo e processos operacionais", value: "processos", score: 8 },
                        { id: "o3", label: "Melhorar posicionamento no mercado", value: "posicionamento", score: 9 },
                      ],
                    },
                    {
                      id: "q2",
                      title: "Qual o seu maior gargalo ou desafio hoje?",
                      type: "single",
                      required: true,
                      options: [
                        { id: "o1", label: "Falta de leads e tráfego qualificado", value: "leads", score: 10 },
                        { id: "o2", label: "Baixa conversão nas vendas", value: "conversao", score: 8 },
                        { id: "o3", label: "Gestão e automação do funil", value: "automacao", score: 9 },
                      ],
                    },
                    {
                      id: "q3",
                      title: "Em quanto tempo quer implementar a aceleração?",
                      type: "single",
                      required: true,
                      options: [
                        { id: "o1", label: "Imediatamente (nos próximos 7 dias)", value: "imediato", score: 10 },
                        { id: "o2", label: "Nos próximos 30 dias", value: "30dias", score: 8 },
                        { id: "o3", label: "Estudo e planejamento futuro", value: "planejamento", score: 5 },
                      ],
                    },
                  ],
                  settings: {
                    headline: "Diagnóstico & Pesquisa Exclusiva",
                    description: "Obrigado por participar! Seu cadastro e respostas foram gravados. Liberamos seu presente/voucher exclusivo abaixo.",
                    buttonText: "Iniciar Pesquisa",
                    thankYouMessage: "Pesquisa concluída com sucesso! Seu brinde / voucher foi liberado.",
                    giftTitle: "Voucher & Presente VIP Liberado",
                    giftDescription: "Clique abaixo para baixar seu material exclusivo em PDF ou resgatar seu cupom.",
                    giftButtonText: "Baixar Presente em PDF / Resgatar Voucher",
                    giftDownloadUrl: "#download-gift",
                    accentColor: page.accentColor || "#FF6B00",
                  },
                };
                return (
                  <DeepFindSurveyViewer
                    survey={surveyToUse}
                    leadData={surveyLeadData || { name: leadName, email: leadEmail, whatsapp: leadPhone }}
                    onComplete={(answers, calculatedScore, leadContact) => {
                      const payload = {
                        name: leadContact?.name || surveyLeadData?.name || leadName || "Lead Qualificado",
                        email: leadContact?.email || surveyLeadData?.email || leadEmail || "",
                        whatsapp: leadContact?.whatsapp || surveyLeadData?.whatsapp || leadPhone || "",
                        quizAnswers: answers,
                        score: calculatedScore,
                        source: "comet-survey-flow",
                      };
                      if (onLeadSubmit) {
                        try { onLeadSubmit(payload); } catch {}
                      }
                      setIsSubmitted(true);
                      setIsSurveyModalOpen(false);
                      if (page.formSection?.gift?.enabled) {
                        setIsGiftModalOpen(true);
                      }
                      try {
                        confetti({
                          particleCount: 120,
                          spread: 80,
                          origin: { y: 0.6 },
                        });
                      } catch {}
                    }}
                  />
                );
              })()}
          </div>
        </div>
      )}

      {/* Modal Flutuante de Cadastro de Lead (quando displayMode === 'modal' ou chamado por CTA) */}
      {isLeadModalOpen && (
        <div className="fixed inset-0 z-[99998] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-white space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-zinc-800 pb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-950/80 border border-purple-500/40 text-purple-300 text-[10px] font-extrabold uppercase tracking-wider mb-1.5">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>{page.formSection?.badge || "Acesso Exclusivo"}</span>
                </div>
                <h3 className="font-extrabold text-xl text-white font-display">
                  {page.formSection?.title || "Garanta Sua Vaga"}
                </h3>
                <p className="text-xs text-zinc-400">
                  {page.formSection?.subtitle || "Preencha seus dados abaixo para continuar com segurança."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsLeadModalOpen(false)}
                className="p-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {assignedSurvey && (
              <div className="p-3 rounded-xl bg-purple-950/50 border border-purple-500/30 text-xs text-purple-200 flex items-center gap-2.5">
                <ClipboardList className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Após preencher, você responderá a uma rápida pesquisa e receberá seu diagnóstico.</span>
              </div>
            )}

            {page.formSection?.gift?.enabled && (
              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-200 flex items-center gap-2.5">
                <Gift className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Brinde liberado após o envio: {page.formSection.gift.title || "Material Gratuito"}.</span>
              </div>
            )}

            {submitError && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-xs text-red-300">
                {submitError}
              </div>
            )}

            <form onSubmit={handleLeadSubmit} className="space-y-4">
              {cleanFormFields
                .filter((f) => f.enabled !== false)
                .map((field) => {
                  if (field.id === "name") {
                    return (
                      <div key={field.id}>
                        <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                          {field.label} {field.required && "*"}
                        </label>
                        <input
                          type="text"
                          required={field.required}
                          value={leadName}
                          onChange={(e) => setLeadName(e.target.value)}
                          placeholder={field.placeholder || "Ex: Carlos Eduardo Silva"}
                          className="w-full px-4 py-3 rounded-xl text-sm bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    );
                  }
                  if (field.id === "phone") {
                    return (
                      <div key={field.id}>
                        <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                          {field.label} {field.required && "*"}
                        </label>
                        <input
                          type="tel"
                          required={field.required}
                          value={leadPhone}
                          onChange={(e) => setLeadPhone(formatBrazilianPhone(e.target.value))}
                          placeholder={field.placeholder || "(11) 98765-4321"}
                          className="w-full px-4 py-3 rounded-xl text-sm bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    );
                  }
                  if (field.id === "email") {
                    return (
                      <div key={field.id}>
                        <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                          {field.label} {field.required && "*"}
                        </label>
                        <input
                          type="email"
                          required={field.required}
                          value={leadEmail}
                          onChange={(e) => setLeadEmail(e.target.value)}
                          placeholder={field.placeholder || "carlos@empresa.com.br"}
                          className="w-full px-4 py-3 rounded-xl text-sm bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    );
                  }
                  return (
                    <div key={field.id}>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                        {field.label} {field.required && "*"}
                      </label>
                      <input
                        type={field.type === "number" ? "number" : field.type === "tel" ? "tel" : "text"}
                        required={field.required}
                        value={customFormAnswers[field.id] || ""}
                        onChange={(e) =>
                          setCustomFormAnswers((prev) => ({
                            ...prev,
                            [field.id]: e.target.value,
                          }))
                        }
                        placeholder={field.placeholder || ""}
                        className="w-full px-4 py-3 rounded-xl text-sm bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  );
                })}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-sm shadow-xl shadow-purple-600/30 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 border border-white/20"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span>{page.formSection?.ctaButtonText || "CONFIRMAR E CONTINUAR"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="pt-2 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>{page.formSection?.guaranteeText || "Seus dados estão 100% seguros e protegidos."}</span>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Download / Entrega do Brinde Atrelado */}
      {isGiftModalOpen && page.formSection?.gift && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-gradient-to-b from-zinc-900 via-zinc-950 to-zinc-950 border border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl text-white text-center space-y-5">
            <div className="absolute top-4 right-4">
              <button
                type="button"
                onClick={() => setIsGiftModalOpen(false)}
                className="p-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20 animate-bounce">
              <Gift className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Material Exclusivo Liberado</span>
              </div>
              <h3 className="text-2xl font-black text-white font-display leading-tight">
                {page.formSection.gift.title || "Parabéns! Seu Brinde Está Pronto"}
              </h3>
              <p className="text-xs text-zinc-300 leading-relaxed max-w-sm mx-auto">
                {page.formSection.gift.description || "Clique no botão abaixo para baixar seu brinde exclusivo agora mesmo."}
              </p>
            </div>

            {/* Badges do formato */}
            <div className="p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-center gap-3 text-xs text-zinc-300">
              <FileText className="w-4 h-4 text-amber-400" />
              <span className="font-bold uppercase tracking-wider text-amber-300">
                Formato: {page.formSection.gift.fileType || "PDF"}
              </span>
              <span>•</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Acesso Imediato
              </span>
            </div>

            <div className="pt-2">
              <a
                href={page.formSection.gift.downloadUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  toast.success("Download iniciado com sucesso!");
                }}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-sm shadow-xl shadow-amber-500/30 inline-flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-98 cursor-pointer"
              >
                <Download className="w-5 h-5" />
                <span>{page.formSection.gift.buttonText || "BAIXAR MATERIAL AGORA"}</span>
              </a>
            </div>

            <button
              type="button"
              onClick={() => setIsGiftModalOpen(false)}
              className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors font-semibold cursor-pointer"
            >
              Fechar esta janela
            </button>
          </div>
        </div>
      )}

      {/* Botão Flutuante de Diagnóstico se a LP possui pesquisa vinculada */}
      {assignedSurvey && !isEditorPreview && !isSurveyModalOpen && (
        <div className="fixed bottom-6 right-6 z-40 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <button
            type="button"
            onClick={openSurveyFlow}
            className="px-4 py-2.5 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white font-bold text-xs shadow-2xl shadow-purple-600/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 border border-white/20 cursor-pointer"
            title="Abrir Pesquisa / Diagnóstico"
          >
            <ClipboardList className="h-4 w-4 text-purple-200" />
            <span>Responder Diagnóstico</span>
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
          </button>
        </div>
      )}
        </div>
    </EditorContext.Provider>
  );
};
