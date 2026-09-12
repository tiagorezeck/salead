// src/modules/landing-pages/index.ts

export { localStorageProvider, type StorageProvider } from "./providers/storage-provider";
export {
  createLocalAnalytics,
  type AnalyticsProvider,
  type AnalyticsEvent,
  type AnalyticsEventType,
  type ChannelStats,
  type LPStats,
} from "./providers/analytics-provider";

export {
  configureLPModule,
  getLPModule,
  type LPModuleAdapters,
  type AuthAdapter,
  type CrmAdapter,
  type LeadPayload,
  type LPUser,
} from "./integration";

export {
  DEFAULT_CHANNELS,
  UTM_KEYS,
  buildTrackingUrl,
  parseUtm,
  type Channel,
  type UtmKey,
  type ParsedUtm,
  type BuildTrackingUrlInput,
} from "./services/tracking";

export { PublicRenderer, type PublicRendererProps } from "./renderer/PublicRenderer";
export { TrackingPanel } from "./components/TrackingPanel";

export {
  generateHighConversionLP,
  detectArchetype,
  getDefaultQuizQuestions,
  type LPArchetype,
  type LPGenerationParams,
  type QualifierQuestion,
  type ChoiceCardOption,
} from "./services/high-conversion-engine";

export {
  loadLPs,
  saveLPs,
  saveLP,
  deleteLP,
  getLP,
  createBlankLP,
  createLPFromSmartBrief,
  aiGenerateSmart,
  blankSections,
  blankSurvey,
  newSectionId,
  DEFAULT_THEME,
  COLOR_MOODS,
  type LP,
  type LPTheme,
  type Section,
  type SectionType,
  type HeroSection,
  type LogosSection,
  type FeaturesSection,
  type StatsSection,
  type TestimonialSection,
  type FormSection,
  type FaqSection,
  type CtaSection,
  type PricingSection,
  type SurveySection,
  type SurveyQuestion,
  type QuestionType,
  type SmartBrief,
} from "@/lib/lp-store";
