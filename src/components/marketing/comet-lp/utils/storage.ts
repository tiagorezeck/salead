import { LandingPage, LeadSubmission, DEFAULT_HEADER_NAV } from "../types/landingPage";
import { PRESET_TEMPLATES } from "../data/templates";
import { cloudStore } from "@/services/cloudStorageService";

function normalizePage(page: LandingPage): LandingPage {
  const activeModel = page.heroModel || page.hero?.model || (page.hero as any)?.model || "split_image";
  return {
    ...page,
    heroModel: activeModel,
    hero: page.hero ? { ...page.hero, model: activeModel } : page.hero,
    headerNav: page.headerNav
      ? {
          ...DEFAULT_HEADER_NAV,
          ...page.headerNav,
          links: page.headerNav.links && page.headerNav.links.length > 0
            ? page.headerNav.links
            : DEFAULT_HEADER_NAV.links,
        }
      : { ...DEFAULT_HEADER_NAV, logoText: page.title ? page.title.split(" ")[0].toUpperCase() : "COMET.LP" },
  };
}

export function loadSavedLandingPages(): LandingPage[] {
  if (typeof window === "undefined") return PRESET_TEMPLATES.map(normalizePage);

  try {
    const db = cloudStore.getState();
    const deletedSet = new Set((db.deletedLpIds || []).map(String));
    const mergedMap = new Map<string, LandingPage>();

    for (const p of (db.landingPages || []) as any[]) {
      if (!p || (!p.id && !p.slug)) continue;
      if (deletedSet.has(String(p.id)) || (p.slug && deletedSet.has(String(p.slug)))) continue;
      const itemKey = String(p.id || p.slug);
      const existing = mergedMap.get(itemKey);
      if (!existing) {
        mergedMap.set(itemKey, normalizePage(p));
      } else {
        const existingTime = new Date(existing.updatedAt || (existing as any).updated_at || 0).getTime();
        const newTime = new Date(p.updatedAt || p.updated_at || 0).getTime();
        if (newTime >= existingTime) {
          mergedMap.set(itemKey, normalizePage({ ...existing, ...p }));
        }
      }
    }

    if (db.activePreviewPage && (db.activePreviewPage.id || db.activePreviewPage.slug)) {
      const active = db.activePreviewPage;
      if (!deletedSet.has(String(active.id)) && !(active.slug && deletedSet.has(String(active.slug)))) {
        const itemKey = String(active.id || active.slug);
        const existing = mergedMap.get(itemKey);
        const existingTime = new Date(existing?.updatedAt || (existing as any)?.updated_at || 0).getTime();
        const activeTime = new Date(active.updatedAt || active.updated_at || 0).getTime();
        if (!existing || activeTime >= existingTime) {
          mergedMap.set(itemKey, normalizePage({ ...(existing || {}), ...active }));
        }
      }
    }

    const results = Array.from(mergedMap.values());
    if (results.length > 0) {
      return results;
    }

    return PRESET_TEMPLATES.map(normalizePage);
  } catch (err) {
    console.error("Failed to load landing pages from cloudStore:", err);
    return PRESET_TEMPLATES.map(normalizePage);
  }
}

export function saveLandingPages(pages: LandingPage[]): void {
  if (typeof window === "undefined") return;
  try {
    const normalized = pages.map(normalizePage);
    cloudStore.mutate((draft) => {
      draft.landingPages = normalized as any[];
    });
  } catch (err) {
    console.error("Failed to save landing pages to cloudStore:", err);
  }
}

export function saveSingleLandingPage(page: LandingPage): LandingPage[] {
  const pages = loadSavedLandingPages();
  const normalizedInput = normalizePage(page);
  const index = pages.findIndex((p) => p.id === normalizedInput.id || (normalizedInput.slug && p.slug === normalizedInput.slug));
  const pageWithUpdatedTimestamp: LandingPage = {
    ...normalizedInput,
    updatedAt: new Date().toISOString(),
  };

  let updated: LandingPage[];
  if (index >= 0) {
    updated = [...pages];
    updated[index] = normalizePage({ ...updated[index], ...pageWithUpdatedTimestamp });
  } else {
    updated = [pageWithUpdatedTimestamp, ...pages];
  }

  cloudStore.mutate((draft) => {
    draft.landingPages = updated as any[];
    draft.activePreviewPage = pageWithUpdatedTimestamp;
  });

  // Sincronização assíncrona com cache de preview do servidor
  syncPageWithServerPreview(pageWithUpdatedTimestamp).catch(() => {});

  return updated;
}

export async function syncPageWithServerPreview(page: LandingPage): Promise<boolean> {
  try {
    const res = await fetch("/api/pages/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(normalizePage(page)),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchPageFromServerPreview(tokenOrId: string): Promise<LandingPage | null> {
  if (!tokenOrId) return null;
  const cleanId = encodeURIComponent(tokenOrId.trim());

  const fetchEndpoint = async (url: string): Promise<LandingPage | null> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    try {
      const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        const pageData = data?.page || data?.landingPage || (data?.id && (data?.hero || data?.title || data?.name) ? data : null);
        if (pageData && (pageData.title || pageData.name || pageData.hero)) {
          return normalizePage(pageData);
        }
      }
    } catch {
      clearTimeout(timeoutId);
    }
    return null;
  };

  try {
    const [cloudResult, apiResults] = await Promise.all([
      cloudStore.fetchPublicLP(tokenOrId, { preferSheets: true }).catch(() => null),
      Promise.allSettled([
        fetchEndpoint(`/api/public/lp/${cleanId}`),
        fetchEndpoint(`/api/pages/preview/${cleanId}`),
      ]),
    ]);

    const candidates: Array<{ page: LandingPage; fromCloud: boolean }> = [];
    if (cloudResult) {
      candidates.push({ page: normalizePage(cloudResult as any), fromCloud: true });
    }
    for (const r of apiResults) {
      if (r.status === "fulfilled" && r.value) {
        candidates.push({ page: r.value, fromCloud: false });
      }
    }

    if (candidates.length > 0) {
      candidates.sort((a, b) => {
        const tA = new Date(a.page.updatedAt || (a.page as any).updated_at || 0).getTime();
        const tB = new Date(b.page.updatedAt || (b.page as any).updated_at || 0).getTime();
        if (tB !== tA) return tB - tA;
        return Number(b.fromCloud) - Number(a.fromCloud);
      });
      return candidates[0].page;
    }
  } catch {}

  return null;
}

export const syncPageToServerPreview = syncPageWithServerPreview;

export const saveLandingPageToStorage = saveSingleLandingPage;

export function deleteLandingPage(id: string): LandingPage[] {
  const pages = loadSavedLandingPages();
  const updated = pages.filter((p) => p.id !== id && p.slug !== id);

  cloudStore.mutate(
    (draft) => {
      draft.deletedLpIds = Array.from(new Set([...(draft.deletedLpIds || []), id]));
      draft.landingPages = updated as any[];
      if (draft.activePreviewPage?.id === id || draft.activePreviewPage?.slug === id) {
        draft.activePreviewPage = null;
      }
    },
    { immediate: true }
  );

  if (typeof window !== "undefined") {
    fetch(`/api/pages/preview/${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
  }

  return updated;
}

export const deleteLandingPageFromStorage = deleteLandingPage;

export function duplicateLandingPage(page: LandingPage): LandingPage {
  const newPage: LandingPage = {
    ...JSON.parse(JSON.stringify(page)),
    id: `page_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    title: `${page.title} (Cópia)`,
    slug: `${page.slug}-copia`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    viewsCount: 0,
    leadsCount: 0,
  };
  saveSingleLandingPage(newPage);
  return newPage;
}

export function loadStoredLeads(): LeadSubmission[] {
  return [];
}

export function recordLocalLead(_lead: LeadSubmission): void {
  // Desativado: leads agora são gravados 100% direto no cloudStore e Google Sheets
}

