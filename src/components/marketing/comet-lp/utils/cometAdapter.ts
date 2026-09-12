import { LandingPage } from "../types/landingPage";
import { PRESET_TEMPLATES } from "../data/templates";
import { uid } from "@/lib/lp-store";
import { createDefaultPhotoGridSection } from "../data/defaultPhotoGrid";

export function ensureCometLP(rawLP: any): LandingPage {
  const base = PRESET_TEMPLATES[0];
  
  if (rawLP?.hero && rawLP?.socialProof && rawLP?.bentoGrid) {
    const photoGrid = rawLP.photoGrid || createDefaultPhotoGridSection(6);
    const visibility = {
      ...base.visibility,
      ...(rawLP.visibility || {}),
      photoGrid: rawLP.visibility?.photoGrid !== undefined ? rawLP.visibility.photoGrid : true,
    };
    const currentOrder: string[] = Array.isArray(rawLP.sectionOrder) && rawLP.sectionOrder.length > 0
      ? rawLP.sectionOrder
      : base.sectionOrder;
    const sectionOrder = currentOrder.includes("photoGrid")
      ? currentOrder
      : [...currentOrder.filter((s: string) => s !== "photoGrid"), "photoGrid"];

    return {
      ...base,
      ...rawLP,
      id: rawLP.id || `lp_${uid()}`,
      title: rawLP.title || rawLP.name || "Landing Page",
      slug: rawLP.slug || (rawLP.name ? rawLP.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") : `lp-${rawLP.id}`),
      surveyId: rawLP.surveyId || rawLP.survey_id || undefined,
      externalUrl: rawLP.externalUrl || undefined,
      photoGrid,
      visibility,
      sectionOrder: sectionOrder as any,
    };
  }

  const photoGrid = rawLP?.photoGrid || createDefaultPhotoGridSection(6);
  const visibility = {
    ...base.visibility,
    ...(rawLP?.visibility || {}),
    photoGrid: rawLP?.visibility?.photoGrid !== undefined ? rawLP.visibility.photoGrid : true,
  };
  const sectionOrder = ["hero", "socialProof", "quiz", "bentoGrid", "photoGrid", "testimonials", "formSection", "faq"] as any;

  return {
    ...base,
    id: rawLP?.id || `lp_${uid()}`,
    title: rawLP?.name || rawLP?.title || "Nova Landing Page COMET",
    slug: rawLP?.slug || `lp-${rawLP?.id || uid()}`,
    surveyId: rawLP?.surveyId || rawLP?.survey_id || undefined,
    externalUrl: rawLP?.externalUrl || undefined,
    accentColor: rawLP?.accentColor || (rawLP?.theme?.primary ? "orange" : base.accentColor || "orange"),
    theme: rawLP?.theme?.mode === "dark" ? "dark" : (rawLP?.theme === "dark" ? "dark" : "light"),
    viewsCount: rawLP?.visits || rawLP?.viewsCount || 0,
    leadsCount: rawLP?.leads || rawLP?.leadsCount || 0,
    status: rawLP?.status === "Pausada" ? "draft" : "published",
    createdAt: rawLP?.created_at || rawLP?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    photoGrid,
    visibility,
    sectionOrder,
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
