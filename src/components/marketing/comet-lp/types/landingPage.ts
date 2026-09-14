export type AccentColor = "orange" | "amber" | "purple" | "emerald" | "cyan" | "rose" | "blue" | "indigo" | "red" | "teal" | "gray";

export type TextAlign = "left" | "center" | "right" | "justify";
export type FontSize =
  | "4xs"
  | "3xs"
  | "2xs"
  | "xs"
  | "sm"
  | "base"
  | "md"
  | "lg"
  | "xl"
  | "2xl"
  | "3xl"
  | "4xl"
  | "5xl";
export type CardPadding = "compact" | "normal" | "spacious";
export type CardRadius = "none" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "full";
export type ContainerWidth = "narrow" | "normal" | "wide" | "full";
export type LogoColorMode = "accent" | "original" | "monochrome";

export type MediaOrientation = "horizontal" | "vertical" | "square" | "custom" | "auto";
export type MediaPosition = "right" | "left" | "center" | "top";

export interface ElementOffset {
  x: number;
  y: number;
}

export interface ButtonCustomStyle {
  text?: string;
  subtext?: string;
  widthMode?: "auto" | "full" | "custom" | "compact" | "wide";
  customWidthPx?: number;
  heightMode?: "compact" | "normal" | "large" | "xlarge" | "custom";
  customHeightPx?: number;
  customPaddingYPx?: number;
  customPaddingXPx?: number;
  fontSizePx?: number;
  borderRadius?: CardRadius;
  iconName?: string;
  offsetX?: number;
  offsetY?: number;
  // Custom Color Overrides
  customBgColorHex?: string;
  customTextColorHex?: string;
  customGradient?: string;
  // Action & Destination Configuration
  actionType?: "scroll_form" | "whatsapp" | "custom_url" | "instagram";
  whatsappNumber?: string;
  whatsappMessage?: string;
  customUrl?: string;
  instagramUsername?: string;
  openInNewTab?: boolean;
}

export type HeroModel =
  | "split_image"          // Modelo 1: Split com Imagem / Mockup Lateral
  | "split_video"          // Modelo 2: VSL Vertical & Avaliação Flutuante
  | "centered_showcase"    // Modelo 3: Vitrine Centralizada & Métricas Embutidas
  | "split_lead_form"      // Modelo 4: Captura Direta com Formulário Embutido
  | "b2b_metrics"          // Modelo 5: Consultoria / B2B com 2 Botões e Métricas de Linha
  | "editorial_ebook"      // Modelo 6: Editorial / E-book Clássico Imersivo
  | "minimal_glow"         // Modelo 7: Minimalista Tipográfico de Alta Conversão
  | "urgency_counter"      // Modelo 8: Card Flutuante com Timer de Urgência & Prova Social
  | "white_pro"            // Modelo 9: Tema White Pro (Clean High-Ticket com Card Prova Social)
  | "fullscreen_slideshow" // Modelo 10: Imagens em Slide Tela Cheia com Cronômetro de Troca
  | "kids_school_doodle"   // Modelo 11: Escola Infantil & Doodles (Ibble School - Curva Amarela & 4 Cards)
  | "portfolio_dark_neon"  // Modelo 12: Portfólio Dark & Neon Resume (Orix / Allison Parker - Watermark & Skills)
  | "survey_hero_light"    // Modelo 13: Pesquisa & Diagnóstico (Tema Claro - Form Direct Lead + Pesquisa & Brinde)
  | "survey_hero_dark";    // Modelo 14: Pesquisa & Diagnóstico (Tema Escuro - Dark Neon + Form Lead + Pesquisa & Brinde);

export interface SocialProofAvatar {
  name: string;
  avatarUrl: string;
  avatarPositionX?: number;
  avatarPositionY?: number;
  avatarZoom?: number;
}

export interface LogoItem {
  id: string;
  type: "text" | "image";
  text: string;
  imageUrl?: string;
  colorMode?: "default" | "original";
  imagePositionX?: number;
  imagePositionY?: number;
  imageZoom?: number;
}

export interface MetricItem {
  id: string;
  value: string;
  label: string;
  sublabel?: string;
  iconName?: string;
}

export interface HeaderNavLink {
  id: string;
  label: string;
  targetSectionId: string;
}

export interface HeaderNavConfig {
  enabled: boolean;
  logoType: "text" | "image" | "both";
  logoText: string;
  logoImageUrl?: string;
  logoImageHeightPx?: number; // e.g. 24 to 80px, default 36px
  links: HeaderNavLink[];
  ctaText: string;
  ctaTargetSectionId?: string;
  ctaUrl?: string;
  sticky?: boolean;
  fixed?: boolean;
  height?: "small" | "medium" | "large";
  bgColorHex?: string;
  bgOpacity?: number; // 0 to 100
  textColorHex?: string;
  ctaBgColorHex?: string;
  ctaTextColorHex?: string;
}

export const DEFAULT_HEADER_NAV: HeaderNavConfig = {
  enabled: true,
  logoType: "text",
  logoText: "COMET.LP",
  logoImageUrl: "",
  logoImageHeightPx: 36,
  links: [
    { id: "nav_1", label: "Início", targetSectionId: "hero" },
    { id: "nav_2", label: "Recursos", targetSectionId: "bentoGrid" },
    { id: "nav_3", label: "Depoimentos", targetSectionId: "testimonials" },
    { id: "nav_4", label: "Diagnóstico", targetSectionId: "quiz" },
    { id: "nav_5", label: "FAQ", targetSectionId: "faq" },
  ],
  ctaText: "Garantir Vaga",
  ctaTargetSectionId: "formSection",
  sticky: true,
  fixed: true,
  height: "medium",
  bgOpacity: 90,
};

export interface HeroSection {
  badgeText: string;
  badgeIcon?: string;
  headline: string;
  subheadline: string;
  mediaType: "video" | "image";
  videoUrl: string; // YouTube, Vimeo, or MP4
  videoThumbnail: string;
  imageUrl: string;
  ctaText: string;
  ctaSubtext: string;
  countdownMinutes: number;
  countdownHours?: number;
  countdownDays?: number;
  countdownSeconds?: number;
  countdownLabel?: string;
  ratingText: string;
  ratingScore: string;
  socialProofAvatars?: SocialProofAvatar[];

  // Typewriter Animated Words Effect
  typewriterEnabled?: boolean;
  typewriterPrefix?: string;
  typewriterWords?: string[];
  typewriterSuffix?: string;
  typewriterShowCursor?: boolean;
  typewriterSpeedMs?: number;
  typewriterDeleteSpeedMs?: number;
  typewriterDelayMs?: number;

  // Visual Customizations & Layout Model
  model?: HeroModel;
  align?: TextAlign;
  headlineAlign?: TextAlign;
  subheadlineAlign?: TextAlign;
  badgeAlign?: TextAlign;
  headlineSize?: FontSize;
  subheadlineSize?: FontSize;
  headlineFontSizePx?: number;
  subheadlineFontSizePx?: number;
  headlineColor?: "default" | "black" | "graphite" | "gray" | "white" | "primary" | "emerald" | "custom" | string;
  headlineCustomHex?: string;
  subheadlineColor?: "default" | "black" | "graphite" | "gray" | "white" | "primary" | "emerald" | "custom" | string;
  subheadlineCustomHex?: string;
  badgeColor?: string;
  countdownBgColor?: "default" | "dark" | "light" | "emerald" | "purple" | "amber" | "cyan" | "custom";
  countdownBgCustomHex?: string;
  countdownTextColor?: string;
  countdownTimerColor?: string;
  countdownBorderColor?: string;
  headlineWidth?: "narrow" | "normal" | "wide" | "full";
  subheadlineWidth?: "narrow" | "normal" | "wide" | "full";
  headlineWidthPercent?: number;
  subheadlineWidthPercent?: number;
  containerWidth?: ContainerWidth;

  // Media Card Dimensions & Placement (Drag-to-Resize & Orientation)
  mediaPosition?: MediaPosition;
  mediaOrientation?: MediaOrientation;
  mediaAspectRatio?: "16/9" | "9/16" | "4/5" | "1/1" | "4/3" | "21/9" | "auto";
  mediaWidthPercent?: number; // e.g. 25% to 75% column width (default ~42% / 5 columns)
  mediaMaxHeightPx?: number; // e.g. 250px to 850px
  mediaCustomWidthPx?: number;
  mediaCustomHeightPx?: number;
  mediaOffsetY?: number; // Vertical offset in px (e.g. -200px to +200px)
  mediaObjectFit?: "cover" | "contain" | "fill";
  mediaBorderRadius?: CardRadius;
  imagePositionX?: number; // Horizontal focus 0% to 100%
  imagePositionY?: number; // Vertical focus 0% to 100% (e.g. 20% to center faces)
  imageZoom?: number; // Zoom level 100% to 300%

  // Extra model-specific fields
  secondaryCtaText?: string;
  secondaryCtaUrl?: string;
  secondaryCtaIcon?: string;
  ctaStyle?: ButtonCustomStyle;
  secondaryCtaStyle?: ButtonCustomStyle;

  // Slideshow Config (Modelo 10: Fullscreen Slideshow)
  slideshowImages?: string[];
  slideshowIntervalSeconds?: number; // 1, 3, 5, 8, etc. Default 3
  slideshowOverlayOpacity?: number; // 0 to 100
  slideshowAutoplay?: boolean;
  
  // Model 3 Showcase Metrics
  showcaseMetrics?: Array<{ id: string; value: string; label: string; sublabel?: string }>;
  
  // Model 5 Scarcity & Authority Metrics
  scarcityLabel?: string;
  scarcityRemainingSlots?: number;
  scarcityTotalSlots?: number;
  b2bMetrics?: Array<{ id: string; value: string; label: string; sublabel?: string }>;

  // Model 4 Direct Lead Form
  leadFormTitle?: string;
  leadFormSubtitle?: string;
  leadFormButtonText?: string;

  // Model 6 Editorial E-book
  authorName?: string;
  availableFormats?: string;
}

export type MarqueeSpeed = "stopped" | "slow" | "medium" | "fast";

export interface SocialProofSection {
  marqueeTitle: string;
  metrics: MetricItem[];
  marqueeLogos: string[];
  logoItems?: LogoItem[];
  marqueeSpeed?: MarqueeSpeed;
  // Visual Customizations
  logoColorMode?: LogoColorMode;
  logoSize?: "xs" | "sm" | "md" | "lg" | "xl";
  align?: TextAlign;
  headlineSize?: FontSize;
  containerWidth?: ContainerWidth;
  cardRadius?: CardRadius;
  cardPadding?: CardPadding;
}

export interface QuizOption {
  id: string;
  label: string;
  iconName?: string;
  badge?: string;
  description?: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  description?: string;
  options: QuizOption[];
}

export interface QuizSection {
  badge: string;
  title: string;
  subtitle: string;
  questions: QuizQuestion[];
  resultTitle: string;
  resultDescription: string;
  // Visual Customizations
  align?: TextAlign;
  headlineSize?: FontSize;
  containerWidth?: ContainerWidth;
  cardRadius?: CardRadius;
  cardPadding?: CardPadding;
}

export interface BentoItem {
  id: string;
  size: "large" | "tall" | "wide" | "standard";
  title: string;
  description: string;
  tag?: string;
  iconName: string;
  metric?: string;
  imageUrl?: string;
  imagePositionX?: number;
  imagePositionY?: number;
  imageZoom?: number;
  // Custom Color Overrides
  customBgColorHex?: string;
  customGradient?: string;
  customTextColorHex?: string;
  // Custom Button
  buttonText?: string;
  buttonUrl?: string;
  buttonStyle?: "primary" | "secondary" | "outline" | "none";
}

export interface BentoGridSection {
  badge: string;
  title: string;
  subtitle: string;
  items: BentoItem[];
  // Visual Customizations
  align?: TextAlign;
  headlineSize?: FontSize;
  containerWidth?: ContainerWidth;
  cardRadius?: CardRadius;
  cardPadding?: CardPadding;
  columns?: 2 | 3 | 4;
}

export interface TestimonialItem {
  id: string;
  name: string;
  role: string;
  companyOrCity: string;
  avatarUrl: string;
  avatarPositionX?: number;
  avatarPositionY?: number;
  avatarZoom?: number;
  rating: number;
  content: string;
  resultHighlight: string;
  verified: boolean;
  videoUrl?: string;
  videoDuration?: string;
  screenshotUrl?: string;
  screenshotPositionX?: number;
  screenshotPositionY?: number;
  screenshotZoom?: number;
  // Custom Color Overrides
  customBgColorHex?: string;
  customGradient?: string;
  customTextColorHex?: string;
}

export interface TestimonialsSection {
  badge: string;
  title: string;
  subtitle: string;
  items: TestimonialItem[];
  // Visual Customizations
  align?: TextAlign;
  headlineSize?: FontSize;
  containerWidth?: ContainerWidth;
  cardRadius?: CardRadius;
  cardPadding?: CardPadding;
  columns?: 2 | 3 | 4;
}

export type LeadFieldType = "text" | "tel" | "email" | "select" | "number" | "radio";

export interface LeadFormField {
  id: string;
  label: string;
  type: LeadFieldType;
  placeholder?: string;
  required?: boolean;
  options?: string[]; // Opções para dropdown / múltipla escolha (ex: faixas de faturamento)
  enabled?: boolean;
  helpText?: string;
}

export interface FormSection {
  badge: string;
  title: string;
  subtitle: string;
  ctaButtonText: string;
  ctaStyle?: ButtonCustomStyle;
  guaranteeDays: number;
  guaranteeText: string;
  securityBadges: string[];
  offerPrice?: string;
  originalPrice?: string;
  installmentsText?: string;
  whatsappHelpNumber?: string;
  // Campos e perguntas customizáveis do Lead (nome, telefone, email, etc.)
  fields?: LeadFormField[];
  // Modo de exibição do formulário: 'inline' (visível na LP) ou 'modal' (card flutuante quando clica no botão)
  displayMode?: "inline" | "modal";
  // Brinde atrelado (ebook, pdf, planilha xlsx, pptx, etc.)
  gift?: {
    enabled?: boolean;
    type?: "ebook" | "pdf" | "spreadsheet" | "presentation" | "other";
    title?: string;
    description?: string;
    downloadUrl?: string;
    fileName?: string;
    buttonText?: string;
  };
  // Visual Customizations
  align?: TextAlign;
  headlineSize?: FontSize;
  cardRadius?: CardRadius;
  cardPadding?: CardPadding;
  cardWidth?: ContainerWidth;
  containerWidth?: ContainerWidth;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface FaqSectionConfig {
  title?: string;
  subtitle?: string;
  align?: TextAlign;
  headlineSize?: FontSize;
  containerWidth?: ContainerWidth;
  cardRadius?: CardRadius;
  cardPadding?: CardPadding;
}

export interface PhotoGridItem {
  id: string;
  imageUrl: string;
  title: string;
  caption: string; // legenda explicativa
  tag?: string;
  linkText?: string;
  linkUrl?: string;
  imagePositionX?: number;
  imagePositionY?: number;
  imageZoom?: number;
  customBgColorHex?: string;
  customTextColorHex?: string;
}

export interface PhotoGridSection {
  badge: string;
  title: string;
  subtitle: string;
  photoCount: 3 | 6 | 9 | 12; // 3, 6, 9, 12 fotos com legenda explicativa
  columns?: 2 | 3 | 4;
  layoutStyle?: "cards" | "overlay_caption" | "polaroid" | "mosaic";
  items: PhotoGridItem[];
  // Visual Customizations
  align?: TextAlign;
  headlineSize?: FontSize;
  containerWidth?: ContainerWidth;
  cardRadius?: CardRadius;
  cardPadding?: CardPadding;
}

export interface SectionVisibility {
  hero: boolean;
  socialProof: boolean;
  quiz: boolean;
  bentoGrid: boolean;
  photoGrid?: boolean;
  testimonials: boolean;
  formSection: boolean;
  faq: boolean;
  stickyMobileCta: boolean;
}

// Visual Customizations & Creative Control Interfaces
export type VisualMaskType =
  | "none"
  | "rectangle"
  | "rounded"
  | "circle"
  | "pill"
  | "squircle"
  | "diamond"
  | "hexagon"
  | "star"
  | "wave"
  | "blob"
  | "shield"
  | "custom";

export interface VisualMaskShape {
  type?: VisualMaskType;
  borderRadius?: number; // 0-120px
  customClipPath?: string;
}

export interface VisualDropShadow {
  enabled?: boolean;
  x?: number; // px (-50 to 50)
  y?: number; // px (-50 to 50)
  blur?: number; // px (0 to 100)
  spread?: number; // px (-20 to 50)
  color?: string; // hex / rgba
  preset?: "none" | "soft" | "medium" | "hard" | "neon_purple" | "neon_cyan" | "neon_emerald" | "neon_amber" | "glow_white";
}

export interface VisualImageEffects {
  opacity?: number; // 0 to 100%
  blur?: number; // 0 to 50px
  brightness?: number; // 0 to 200%
  contrast?: number; // 0 to 200%
  saturate?: number; // 0 to 200%
  grayscale?: number; // 0 to 100%
  sepia?: number; // 0 to 100%
  hueRotate?: number; // 0 to 360deg
  invert?: number; // 0 to 100%
  dropShadow?: VisualDropShadow;
  glow?: {
    enabled?: boolean;
    color?: string;
    intensity?: number; // px
  };
  border?: {
    enabled?: boolean;
    width?: number; // px
    style?: "solid" | "dashed" | "dotted" | "double";
    color?: string;
  };
  gradientOverlay?: {
    enabled?: boolean;
    type?: "linear" | "radial";
    direction?: string; // e.g. "to bottom", "135deg"
    fromColor?: string;
    toColor?: string;
    opacity?: number; // 0 to 100
  };
}

export interface VisualTransform {
  scale?: number; // 0.1 to 3.0 (10% to 300%)
  scaleX?: number; // 1 or -1 (flip horizontal)
  scaleY?: number; // 1 or -1 (flip vertical)
  rotate?: number; // 0 to 360 degrees
  skewX?: number;
  skewY?: number;
  widthMode?: "auto" | "full" | "custom";
  customWidthPx?: number;
  customHeightPx?: number;
  aspectRatio?: "auto" | "1/1" | "16/9" | "9/16" | "4/5" | "4/3" | "21/9" | "custom";
  objectFit?: "cover" | "contain" | "fill" | "none" | "scale-down";
  // Internal crop and zoom
  imagePositionX?: number; // 0 to 100%
  imagePositionY?: number; // 0 to 100%
  imageZoom?: number; // 100% to 300%
  cropFocus?: "top" | "center" | "bottom" | "custom";
}

export interface VisualTextCustomStyle {
  customColorHex?: string;
  customGradient?: string;
  fontFamily?: string;
  fontSizePx?: number;
  fontWeight?: number; // 100 to 900
  letterSpacing?: number; // -2 to 10px
  lineHeight?: number; // 0.8 to 2.5
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  textDecoration?: "none" | "underline" | "line-through";
  textShadow?: string;
  glowColor?: string;
  glowIntensity?: number;
  opacity?: number; // 0 to 100
  blur?: number; // 0 to 30px
  backgroundColor?: string;
  backgroundGradient?: string;
  backgroundPadding?: number; // px
  borderRadius?: number; // px
}

export interface FloatingImageElement {
  id: string;
  name?: string;
  imageUrl: string;
  targetSectionId?: string; // 'hero', 'socialProof', 'bentoGrid', 'photoGrid', 'testimonials', 'global', etc.
  layerPosition?: "background" | "overlay" | "foreground" | "fixed";
  zIndex?: number; // 1 to 100
  offsetX: number; // px
  offsetY: number; // px
  offsetXPercent?: number; // 0 to 100%
  offsetYPercent?: number; // 0 to 100%
  widthPx: number; // e.g. 220px
  widthPercent?: number; // % of container width (e.g. 100 for full width)
  heightPx?: number;
  fitMode?: "original" | "fit_container" | "full_width" | "contain" | "custom";
  responsiveAlign?: "left" | "center" | "right" | "custom";
  responsiveClamped?: boolean;
  transform?: VisualTransform;
  effects?: VisualImageEffects;
  mask?: VisualMaskShape;
  isLocked?: boolean;
  isVisible?: boolean;
  linkUrl?: string;
  altText?: string;
}

export interface CustomElementStyleRecord {
  textStyle?: VisualTextCustomStyle;
  imageEffects?: VisualImageEffects;
  transform?: VisualTransform;
  mask?: VisualMaskShape;
  offset?: ElementOffset;
  zIndex?: number;
}

export interface TalkWhatsAppConfig {
  enabled: boolean;
  phoneNumber: string; // e.g. "5524999999999" or "(24) 99999-9999"
  defaultMessage: string; // e.g. "Olá! Vi a landing page e gostaria de saber mais informações."
  buttonLabel?: string; // e.g. "Falar no WhatsApp"
  // Floating TALK Widget
  floatingWidgetEnabled?: boolean;
  floatingWidgetPosition?: "bottom-right" | "bottom-left";
  floatingWidgetBadgeText?: string; // e.g. "Online Agora"
  floatingWidgetGreeting?: string; // e.g. "Olá! Tem alguma dúvida? Clique aqui para conversar comigo no WhatsApp."
  floatingWidgetAvatarUrl?: string;
  applyToAllCtaButtons?: boolean;
}

export const DEFAULT_TALK_CONFIG: TalkWhatsAppConfig = {
  enabled: true,
  phoneNumber: "5511999999999",
  defaultMessage: "Olá! Vi a sua página e gostaria de mais informações sobre disponibilidade e valores.",
  buttonLabel: "Falar com Atendente no WhatsApp",
  floatingWidgetEnabled: true,
  floatingWidgetPosition: "bottom-right",
  floatingWidgetBadgeText: "Online Agora",
  floatingWidgetGreeting: "Olá! Posso te ajudar com alguma dúvida? Chame no WhatsApp!",
  floatingWidgetAvatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
  applyToAllCtaButtons: false,
};

export interface LandingPage {
  id: string;
  title: string;
  slug: string;
  niche: string;
  cityOrRegion: string;
  targetAudience: string;
  accentColor: AccentColor;
  accentShade?: "light" | "normal" | "dark";
  customAccentHex?: string;
  theme: "light" | "dark" | "hybrid" | "midnight";
  headerNav?: HeaderNavConfig;
  talkConfig?: TalkWhatsAppConfig;
  
  // Custom Background Options
  backgroundType?: "default" | "solid" | "gradient" | "image";
  backgroundColorHex?: string;
  backgroundGradient?: string;
  backgroundImageUrl?: string;
  backgroundImageOverlayOpacity?: number;

  createdAt: string;
  updatedAt: string;
  previewToken?: string;
  webhookUrl?: string;
  surveyId?: string;
  productId?: string;
  productIds?: string[];
  useMinQualification?: boolean;
  minSurveyId?: string;
  additionalSurveyIds?: string[];
  status: "published" | "draft";
  viewsCount: number;
  leadsCount: number;

  // Sections
  hero: HeroSection;
  socialProof: SocialProofSection;
  quiz: QuizSection;
  bentoGrid: BentoGridSection;
  photoGrid?: PhotoGridSection;
  testimonials: TestimonialsSection;
  formSection: FormSection;
  faq: FaqItem[];
  
  // Customization & Creative Overrides
  visibility: SectionVisibility;
  sectionOrder: Array<"hero" | "socialProof" | "quiz" | "bentoGrid" | "photoGrid" | "testimonials" | "formSection" | "faq">;
  elementOffsets?: Record<string, ElementOffset>;
  customButtonStyles?: Record<string, ButtonCustomStyle>;
  elementFontSizes?: Record<string, number>;
  customElementStyles?: Record<string, CustomElementStyleRecord>;
  floatingImages?: FloatingImageElement[];
}

export interface LeadSubmission {
  id: string;
  pageId: string;
  pageTitle: string;
  name: string;
  whatsapp: string;
  email: string;
  quizAnswers: Record<string, string>;
  utms: Record<string, string>;
  submittedAt: string;
  webhookStatus: "success" | "skipped" | "failed";
  webhookResponse?: string;
}
