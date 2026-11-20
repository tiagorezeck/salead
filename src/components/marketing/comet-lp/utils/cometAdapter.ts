import { LandingPage } from "../types/landingPage";
import { PRESET_TEMPLATES } from "../data/templates";
import { uid } from "@/lib/lp-store";
import { createDefaultPhotoGridSection } from "../data/defaultPhotoGrid";

function parseMultiColumnConfigJsonAdapter(rawLP: any): any {
  const col1 = rawLP["Config JSON"] ?? rawLP.configJson ?? rawLP.config;
  if (typeof col1 === "object" && col1 !== null) return col1;
  const col2 = rawLP["Config JSON (Cont.)"] ?? "";
  const col3 = rawLP["Config JSON (Cont. 2)"] ?? "";
  const combined =
    (typeof col1 === "string" ? col1 : "") +
    (typeof col2 === "string" ? col2 : "") +
    (typeof col3 === "string" ? col3 : "");
  if (combined.trim().startsWith("{")) {
    try {
      return JSON.parse(combined);
    } catch {}
  }
  return {};
}

export function ensureCometLP(rawLP: any): LandingPage {
  if (!rawLP) return PRESET_TEMPLATES[0];

  // 1. Unpack nested config (including multi-column Config JSON from Sheets) if stringified or object
  const unpackedConfig: any = parseMultiColumnConfigJsonAdapter(rawLP);

  // 1b. Unpack nested content if stringified or object
  let unpackedContent: any = {};
  if (rawLP.content) {
    if (typeof rawLP.content === "object" && rawLP.content !== null) {
      unpackedContent = rawLP.content;
    } else if (typeof rawLP.content === "string") {
      try { unpackedContent = JSON.parse(rawLP.content); } catch {}
    }
  }

  // Find matching preset template base only if rawLP actually matches a preset
  const templateId = rawLP.templateId || unpackedConfig.templateId || rawLP.template;
  const matchedPreset = PRESET_TEMPLATES.find(
    (t) => t.id === rawLP.id || t.id === templateId || (rawLP.slug && t.slug === rawLP.slug)
  );
  const base = matchedPreset || PRESET_TEMPLATES[0];
  const isUserCustomLP = !matchedPreset;

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

  const resolvedPageTitle = source.title || source.name || "Landing Page";
  const defaultBrandWord = resolvedPageTitle
    .replace(/[^a-zA-Z0-9À-ÿ\s]/g, " ")
    .trim()
    .split(/\s+/)[0]
    ?.toUpperCase() || "COMET";

  const resolvedMediaType: "image" | "video" =
    rawHero.mediaType ||
    source.mediaType ||
    (heroModel === "split_video" ? "video" : isUserCustomLP ? "image" : base.hero.mediaType);

  const neutralHeroImage =
    "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1200&q=80";

  const heroBase = isUserCustomLP
    ? {
        ...base.hero,
        badgeText: source.niche ? `⚡ ${source.niche}` : "⚡ Oferta Exclusiva",
        headline: resolvedPageTitle,
        subheadline: source.targetAudience
          ? `Solução desenhada para ${source.targetAudience}.`
          : "Apresente sua proposta de valor com alta conversão e clareza.",
        ctaText: "QUERO SABER MAIS AGORA",
        ctaSubtext: "",
        mediaType: resolvedMediaType,
        videoUrl: "",
        videoThumbnail: neutralHeroImage,
        imageUrl: neutralHeroImage,
      }
    : base.hero;

  const mergedSlideshowImages =
    Array.isArray(rawHero.slideshowImages) && rawHero.slideshowImages.length > 0
      ? rawHero.slideshowImages
      : Array.isArray(source.slideshowImages) && source.slideshowImages.length > 0
        ? source.slideshowImages
        : Array.isArray(unpackedConfig.hero?.slideshowImages) && unpackedConfig.hero.slideshowImages.length > 0
          ? unpackedConfig.hero.slideshowImages
          : base.hero.slideshowImages;

  const resolvedVideoUrl =
    rawHero.videoUrl !== undefined
      ? rawHero.videoUrl
      : source.videoUrl !== undefined
        ? source.videoUrl
        : heroBase.videoUrl;

  const hero = {
    ...heroBase,
    ...rawHero,
    model: heroModel,
    mediaType: resolvedMediaType,
    headline: rawHero.headline || source.headline || rawLP.headline || heroBase.headline,
    subheadline: rawHero.subheadline || source.subheadline || rawLP.subheadline || heroBase.subheadline,
    ctaText: rawHero.ctaText || source.ctaText || rawLP.ctaText || heroBase.ctaText,
    ctaSubtext: rawHero.ctaSubtext !== undefined ? rawHero.ctaSubtext : (source.ctaSubtext !== undefined ? source.ctaSubtext : heroBase.ctaSubtext),
    imageUrl: rawHero.imageUrl || source.imageUrl || rawLP.imageUrl || heroBase.imageUrl,
    videoUrl: isUserCustomLP && resolvedVideoUrl?.includes("dQw4w9WgXcQ") ? "" : resolvedVideoUrl,
    videoThumbnail: rawHero.videoThumbnail || source.videoThumbnail || rawLP.videoThumbnail || rawHero.imageUrl || heroBase.videoThumbnail,
    b2bMetrics: rawHero.b2bMetrics || source.b2bMetrics || base.hero.b2bMetrics,
    socialProofAvatars: rawHero.socialProofAvatars || source.socialProofAvatars || base.hero.socialProofAvatars,
    ...(mergedSlideshowImages ? { slideshowImages: mergedSlideshowImages } : {}),
  };

  const tUpdatedAt = new Date(source.updatedAt || 0).getTime() || 0;
  const tUpdatedSnake = new Date(source.updated_at || 0).getTime() || 0;
  const resolvedUpdatedAt =
    tUpdatedAt >= tUpdatedSnake
      ? (source.updatedAt || source.updated_at || new Date().toISOString())
      : (source.updated_at || source.updatedAt || new Date().toISOString());

  const candidateTheme = typeof source.theme === "object" ? source.theme?.mode : source.theme;
  const resolvedTheme: LandingPage["theme"] =
    candidateTheme === "light" || candidateTheme === "dark" || candidateTheme === "midnight" || candidateTheme === "hybrid"
      ? candidateTheme
      : isUserCustomLP
        ? "dark"
        : (base.theme || "light");

  const resolvedHeaderNavBase = isUserCustomLP
    ? { ...base.headerNav, logoText: defaultBrandWord }
    : base.headerNav;

  const resolvedSlug =
    source.slug ||
    (source.name
      ? String(source.name)
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
      : `lp-${source.id || uid()}`);

  const resolvedSocialProof = isUserCustomLP
    ? {
        ...base.socialProof,
        marqueeTitle: `${defaultBrandWord} • RESULTADOS COMPROVADOS`,
      }
    : base.socialProof;

  return {
    ...base,
    ...source,
    id: source.id || `lp_${uid()}`,
    title: resolvedPageTitle,
    name: source.name || resolvedPageTitle,
    slug: resolvedSlug,
    surveyId: source.surveyId || source.survey_id || unpackedConfig.surveyId || undefined,
    externalUrl: source.externalUrl || source.external_url || unpackedConfig.externalUrl || undefined,
    accentColor: source.accentColor || (source.theme?.primary ? "orange" : isUserCustomLP ? "purple" : base.accentColor || "orange"),
    accentShade: source.accentShade || base.accentShade || "600",
    theme: resolvedTheme,
    viewsCount: Number(source.visits ?? source.viewsCount ?? source.views_count ?? 0),
    leadsCount: Number(source.leads ?? source.leads_count ?? source.leadsCount ?? 0),
    status: source.status === "draft" || source.status === "Pausada" ? "draft" : "published",
    createdAt: source.createdAt || source.created_at || new Date().toISOString(),
    updatedAt: resolvedUpdatedAt,
    updated_at: resolvedUpdatedAt,
    heroModel,
    hero_model: heroModel,
    hero,
    socialProof: source.socialProof ? { ...resolvedSocialProof, ...source.socialProof } : (unpackedConfig.socialProof ? { ...resolvedSocialProof, ...unpackedConfig.socialProof } : resolvedSocialProof),
    quiz: source.quiz ? { ...base.quiz, ...source.quiz } : (unpackedConfig.quiz ? { ...base.quiz, ...unpackedConfig.quiz } : base.quiz),
    bentoGrid: source.bentoGrid ? { ...base.bentoGrid, ...source.bentoGrid } : (unpackedConfig.bentoGrid ? { ...base.bentoGrid, ...unpackedConfig.bentoGrid } : base.bentoGrid),
    testimonials: source.testimonials ? { ...base.testimonials, ...source.testimonials } : (unpackedConfig.testimonials ? { ...base.testimonials, ...unpackedConfig.testimonials } : base.testimonials),
    formSection: source.formSection ? { ...base.formSection, ...source.formSection } : (unpackedConfig.formSection ? { ...base.formSection, ...unpackedConfig.formSection } : base.formSection),
    faq: Array.isArray(source.faq) ? source.faq : (Array.isArray(unpackedConfig.faq) ? unpackedConfig.faq : base.faq),
    headerNav: source.headerNav ? { ...resolvedHeaderNavBase, ...source.headerNav } : (unpackedConfig.headerNav ? { ...resolvedHeaderNavBase, ...unpackedConfig.headerNav } : resolvedHeaderNavBase),
    footer: source.footer ? { ...base.footer, ...source.footer } : (unpackedConfig.footer ? { ...base.footer, ...unpackedConfig.footer } : base.footer),
    photoGrid,
    visibility,
    sectionOrder: sectionOrder as any,
  };
}

export function createBlankCometLP(title: string, companyName?: string): LandingPage {
  const base = PRESET_TEMPLATES[0];
  const newId = `lp_${uid()}`;
  const nowIso = new Date().toISOString();
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
    heroModel: "split_image",
    hero_model: "split_image",
    viewsCount: 0,
    leadsCount: 0,
    status: "published",
    createdAt: nowIso,
    updatedAt: nowIso,
    updated_at: nowIso,
    ...(base.headerNav
      ? {
          headerNav: {
            ...base.headerNav,
            logoText: companyName ? companyName.toUpperCase() : "COMET",
          },
        }
      : {}),
    hero: {
      ...base.hero,
      model: "split_image",
      mediaType: "image",
      videoUrl: "",
      badgeText: "⚡ Nova Página de Alta Conversão",
      headline: "Transforme Visitantes em Clientes com Alta Conversão",
      subheadline: "Apresente sua oferta com clareza, direção de arte profissional e gatilhos de persuasão.",
      ctaText: "COMEÇAR AGORA",
      ctaSubtext: "",
    },
  };
}
