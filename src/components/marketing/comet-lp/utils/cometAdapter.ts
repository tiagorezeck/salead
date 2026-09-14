import { LandingPage } from "../types/landingPage";
import { PRESET_TEMPLATES } from "../data/templates";
import { uid } from "@/lib/lp-store";
import { createDefaultPhotoGridSection } from "../data/defaultPhotoGrid";

export function ensureCometLP(rawLP: any): LandingPage {
  const base = PRESET_TEMPLATES[0];
  if (!rawLP) return base;

  // Unpack nested config if coming directly from Supabase raw row
  const source = rawLP.config && typeof rawLP.config === "object"
    ? { ...rawLP.config, ...rawLP }
    : rawLP;

  const photoGrid = source.photoGrid || createDefaultPhotoGridSection(6);
  const visibility = {
    ...base.visibility,
    ...(source.visibility || {}),
    photoGrid: source.visibility?.photoGrid !== undefined ? source.visibility.photoGrid : true,
  };

  const currentOrder: string[] = Array.isArray(source.sectionOrder) && source.sectionOrder.length > 0
    ? source.sectionOrder
    : base.sectionOrder;
  const sectionOrder = currentOrder.includes("photoGrid")
    ? currentOrder
    : [...currentOrder.filter((s: string) => s !== "photoGrid"), "photoGrid"];

  // Ensure hero model is NEVER lost or overridden
  const heroModel = source.hero?.model || source.heroModel || source.model || base.hero.model || "split_image";

  const hero = {
    ...base.hero,
    ...(source.hero || {}),
    model: heroModel,
    b2bMetrics: source.hero?.b2bMetrics || base.hero.b2bMetrics,
    socialProofAvatars: source.hero?.socialProofAvatars || base.hero.socialProofAvatars,
  };

  return {
    ...base,
    ...source,
    id: source.id || `lp_${uid()}`,
    title: source.title || source.name || "Landing Page",
    name: source.name || source.title || "Landing Page",
    slug: source.slug || (source.name ? source.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") : `lp-${source.id || uid()}`),
    surveyId: source.surveyId || source.survey_id || undefined,
    externalUrl: source.externalUrl || source.external_url || undefined,
    accentColor: source.accentColor || (source.theme?.primary ? "orange" : base.accentColor || "orange"),
    accentShade: source.accentShade || base.accentShade || "600",
    theme: source.theme?.mode === "dark" ? "dark" : (source.theme === "dark" ? "dark" : (source.theme === "light" ? "light" : base.theme || "light")),
    viewsCount: Number(source.visits ?? source.viewsCount ?? 0),
    leadsCount: Number(source.leads ?? source.leads_count ?? source.leadsCount ?? 0),
    status: source.status === "draft" || source.status === "Pausada" ? "draft" : "published",
    createdAt: source.created_at || source.createdAt || new Date().toISOString(),
    updatedAt: source.updated_at || source.updatedAt || new Date().toISOString(),
    hero,
    socialProof: source.socialProof ? { ...base.socialProof, ...source.socialProof } : base.socialProof,
    quiz: source.quiz ? { ...base.quiz, ...source.quiz } : base.quiz,
    bentoGrid: source.bentoGrid ? { ...base.bentoGrid, ...source.bentoGrid } : base.bentoGrid,
    testimonials: source.testimonials ? { ...base.testimonials, ...source.testimonials } : base.testimonials,
    formSection: source.formSection ? { ...base.formSection, ...source.formSection } : base.formSection,
    faq: Array.isArray(source.faq) ? source.faq : base.faq,
    headerNav: source.headerNav ? { ...base.headerNav, ...source.headerNav } : base.headerNav,
    footer: source.footer ? { ...base.footer, ...source.footer } : base.footer,
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
