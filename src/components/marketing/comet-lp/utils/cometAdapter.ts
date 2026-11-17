import { LandingPage } from "../types/landingPage";
import { PRESET_TEMPLATES } from "../data/templates";
import { uid } from "@/lib/lp-store";
import { createDefaultPhotoGridSection } from "../data/defaultPhotoGrid";

export function ensureCometLP(rawLP: any): LandingPage {
  if (!rawLP) return PRESET_TEMPLATES[0];

  // 1. Unpack nested config if stringified or object
  let unpackedConfig: any = {};
  if (rawLP.config) {
    if (typeof rawLP.config === "object" && rawLP.config !== null) {
      unpackedConfig = rawLP.config;
    } else if (typeof rawLP.config === "string") {
      try { unpackedConfig = JSON.parse(rawLP.config); } catch {}
    }
  }

  // 1b. Unpack nested content if stringified or object
  let unpackedContent: any = {};
  if (rawLP.content) {
    if (typeof rawLP.content === "object" && rawLP.content !== null) {
      unpackedContent = rawLP.content;
    } else if (typeof rawLP.content === "string") {
      try { unpackedContent = JSON.parse(rawLP.content); } catch {}
    }
  }

  // Find matching template base if applicable
  const templateId = rawLP.templateId || unpackedConfig.templateId || rawLP.template;
  const base = PRESET_TEMPLATES.find(t => t.id === rawLP.id || t.id === templateId || t.slug === rawLP.slug) || PRESET_TEMPLATES[0];

  // Merge sources prioritizing rawLP properties, unpackedConfig and unpackedContent
  const source = {
    ...unpackedContent,
    ...unpackedConfig,
    ...rawLP,
  };

  const photoGrid = source.photoGrid || unpackedConfig.photoGrid || createDefaultPhotoGridSection(6);
  const visibility = {
    ...base.visibility,
    ...(unpackedContent.visibility || {}),
    ...(unpackedConfig.visibility || {}),
    ...(source.visibility || {}),
    photoGrid: source.visibility?.photoGrid !== undefined ? source.visibility.photoGrid : true,
  };

  const currentOrder: string[] = Array.isArray(source.sectionOrder) && source.sectionOrder.length > 0
    ? source.sectionOrder
    : (Array.isArray(unpackedConfig.sectionOrder) && unpackedConfig.sectionOrder.length > 0 ? unpackedConfig.sectionOrder : base.sectionOrder);
  const sectionOrder = currentOrder.includes("photoGrid")
    ? currentOrder
    : [...currentOrder.filter((s: string) => s !== "photoGrid"), "photoGrid"];

  // Ensure hero model is NEVER lost or overridden by stale nested config
  const heroModel = (
    rawLP.hero?.model ||
    rawLP.heroModel ||
    rawLP.hero_model ||
    rawLP.model ||
    source.heroModel ||
    source.hero?.model ||
    source.hero_model ||
    source.model ||
    unpackedConfig?.heroModel ||
    unpackedConfig?.hero?.model ||
    unpackedContent?.heroModel ||
    unpackedContent?.hero?.model ||
    base.hero.model ||
    "split_image"
  );

  const rawHero = (source.hero && typeof source.hero === "object" && Object.keys(source.hero).length > 0)
    ? source.hero
    : (unpackedConfig.hero || unpackedContent.hero || {});

  const hero = {
    ...base.hero,
    ...rawHero,
    model: heroModel,
    headline: rawHero.headline || source.headline || rawLP.headline || base.hero.headline,
    subheadline: rawHero.subheadline || source.subheadline || rawLP.subheadline || base.hero.subheadline,
    ctaText: rawHero.ctaText || source.ctaText || rawLP.ctaText || base.hero.ctaText,
    ctaSubtext: rawHero.ctaSubtext !== undefined ? rawHero.ctaSubtext : (source.ctaSubtext || base.hero.ctaSubtext),
    imageUrl: rawHero.imageUrl || source.imageUrl || rawLP.imageUrl || base.hero.imageUrl,
    videoUrl: rawHero.videoUrl || source.videoUrl || rawLP.videoUrl || base.hero.videoUrl,
    videoThumbnail: rawHero.videoThumbnail || source.videoThumbnail || rawLP.videoThumbnail || base.hero.videoThumbnail,
    b2bMetrics: rawHero.b2bMetrics || source.b2bMetrics || base.hero.b2bMetrics,
    socialProofAvatars: rawHero.socialProofAvatars || source.socialProofAvatars || base.hero.socialProofAvatars,
  };

  const tUpdatedAt = new Date(source.updatedAt || 0).getTime() || 0;
  const tUpdatedSnake = new Date(source.updated_at || 0).getTime() || 0;
  const resolvedUpdatedAt =
    tUpdatedAt >= tUpdatedSnake
      ? (source.updatedAt || source.updated_at || new Date().toISOString())
      : (source.updated_at || source.updatedAt || new Date().toISOString());

  return {
    ...base,
    ...source,
    id: source.id || `lp_${uid()}`,
    title: source.title || source.name || "Landing Page",
    name: source.name || source.title || "Landing Page",
    slug: source.slug || (source.name ? source.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") : `lp-${source.id || uid()}`),
    surveyId: source.surveyId || source.survey_id || unpackedConfig.surveyId || undefined,
    externalUrl: source.externalUrl || source.external_url || unpackedConfig.externalUrl || undefined,
    accentColor: source.accentColor || (source.theme?.primary ? "orange" : base.accentColor || "orange"),
    accentShade: source.accentShade || base.accentShade || "600",
    theme: source.theme?.mode === "dark" ? "dark" : (source.theme === "dark" ? "dark" : (source.theme === "light" ? "light" : base.theme || "light")),
    viewsCount: Number(source.visits ?? source.viewsCount ?? source.views_count ?? 0),
    leadsCount: Number(source.leads ?? source.leads_count ?? source.leadsCount ?? 0),
    status: source.status === "draft" || source.status === "Pausada" ? "draft" : "published",
    createdAt: source.createdAt || source.created_at || new Date().toISOString(),
    updatedAt: resolvedUpdatedAt,
    updated_at: resolvedUpdatedAt,
    heroModel,
    hero,
    socialProof: source.socialProof ? { ...base.socialProof, ...source.socialProof } : (unpackedConfig.socialProof ? { ...base.socialProof, ...unpackedConfig.socialProof } : base.socialProof),
    quiz: source.quiz ? { ...base.quiz, ...source.quiz } : (unpackedConfig.quiz ? { ...base.quiz, ...unpackedConfig.quiz } : base.quiz),
    bentoGrid: source.bentoGrid ? { ...base.bentoGrid, ...source.bentoGrid } : (unpackedConfig.bentoGrid ? { ...base.bentoGrid, ...unpackedConfig.bentoGrid } : base.bentoGrid),
    testimonials: source.testimonials ? { ...base.testimonials, ...source.testimonials } : (unpackedConfig.testimonials ? { ...base.testimonials, ...unpackedConfig.testimonials } : base.testimonials),
    formSection: source.formSection ? { ...base.formSection, ...source.formSection } : (unpackedConfig.formSection ? { ...base.formSection, ...unpackedConfig.formSection } : base.formSection),
    faq: Array.isArray(source.faq) ? source.faq : (Array.isArray(unpackedConfig.faq) ? unpackedConfig.faq : base.faq),
    headerNav: source.headerNav ? { ...base.headerNav, ...source.headerNav } : (unpackedConfig.headerNav ? { ...base.headerNav, ...unpackedConfig.headerNav } : base.headerNav),
    footer: source.footer ? { ...base.footer, ...source.footer } : (unpackedConfig.footer ? { ...base.footer, ...unpackedConfig.footer } : base.footer),
    photoGrid,
    visibility,
    sectionOrder: sectionOrder as any,
  };
}

export function createBlankCometLP(title: string, companyName?: string): LandingPage {
  const base = PRESET_TEMPLATES[0];
  const newId = `lp_${uid()}`;
  return {
    ...base,
    id: newId,
    title: title || "Nova Landing Page COMET",
    slug: `lp-${Date.now()}`,
    niche: "Negócios & Serviços",
    cityOrRegion: "Brasil",
    targetAudience: "Público Geral",
    accentColor: "orange",
    theme: "light",
    viewsCount: 0,
    leadsCount: 0,
    status: "published",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    headerNav: {
      ...base.headerNav,
      logoText: companyName ? companyName.toUpperCase() : "COMET",
    },
    hero: {
      ...base.hero,
      headline: "Transforme Visitantes em Clientes com Alta Conversão",
      subheadline: "Apresente sua oferta com clareza, direção de arte profissional e gatilhos de persuasão.",
      ctaText: "COMEÇAR AGORA",
    },
  };
}
