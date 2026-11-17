import { LandingPage, LeadSubmission, DEFAULT_HEADER_NAV } from "../types/landingPage";
import { PRESET_TEMPLATES } from "../data/templates";
import { cloudStore } from "@/services/cloudStorageService";

function getLpTs(p: any): number {
  if (!p || typeof p !== "object") return 0;
  const t1 = p.updatedAt ? new Date(p.updatedAt).getTime() : 0;
  const t2 = p.updated_at ? new Date(p.updated_at).getTime() : 0;
  const t3 = p.createdAt ? new Date(p.createdAt).getTime() : 0;
  return Math.max(Number.isFinite(t1) ? t1 : 0, Number.isFinite(t2) ? t2 : 0, Number.isFinite(t3) ? t3 : 0);
}

function isCorruptedLeadRow(p: any): boolean {
  if (!p || typeof p !== "object") return true;
  if (p.hero || p.externalUrl || p.external_url || p.heroModel) return false;
  const statusStr = String(p.status || "").trim().toLowerCase();
  return statusStr === "novo lead";
}

function normalizePage(page: LandingPage): LandingPage {
  const activeModel =
    (page as any).heroModel ||
    page.hero?.model ||
    (page as any).hero_model ||
    (page as any).model ||
    "split_image";

  const rawUpdatedAt = (page as any).updatedAt;
  const rawUpdatedSnake = (page as any).updated_at;
  const t1 = rawUpdatedAt ? new Date(rawUpdatedAt).getTime() : 0;
  const t2 = rawUpdatedSnake ? new Date(rawUpdatedSnake).getTime() : 0;
  const resolvedUpdated =
    (Number.isFinite(t1) ? t1 : 0) >= (Number.isFinite(t2) ? t2 : 0)
      ? (rawUpdatedAt || rawUpdatedSnake)
      : (rawUpdatedSnake || rawUpdatedAt);

  return {
    ...page,
    heroModel: activeModel,
    hero: page.hero ? { ...page.hero, model: activeModel } : page.hero,
    ...(resolvedUpdated ? { updatedAt: resolvedUpdated, updated_at: resolvedUpdated } : {}),
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
      if (!p || (!p.id && !p.slug) || isCorruptedLeadRow(p)) continue;
      if (deletedSet.has(String(p.id)) || (p.slug && deletedSet.has(String(p.slug)))) continue;
      const itemKey = String(p.id || p.slug);
      const existing = mergedMap.get(itemKey);
      if (!existing) {
        mergedMap.set(itemKey, normalizePage(p));
      } else {
        const existingTime = getLpTs(existing);
        const newTime = getLpTs(p);
        if (newTime >= existingTime) {
          mergedMap.set(itemKey, normalizePage({ ...existing, ...p }));
        }
      }
    }

    if (db.activePreviewPage && (db.activePreviewPage.id || db.activePreviewPage.slug) && !isCorruptedLeadRow(db.activePreviewPage)) {
      const active = db.activePreviewPage;
      if (!deletedSet.has(String(active.id)) && !(active.slug && deletedSet.has(String(active.slug)))) {
        const itemKey = String(active.id || active.slug);
        const existing = mergedMap.get(itemKey);
        const existingTime = getLpTs(existing);
        const activeTime = getLpTs(active);
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
    const normalized = pages.filter((p) => !isCorruptedLeadRow(p)).map(normalizePage);
    cloudStore.mutate((draft) => {
      draft.landingPages = normalized as any[];
    });
  } catch (err) {
    console.error("Failed to save landing pages to cloudStore:", err);
  }
}

export function saveSingleLandingPage(page: LandingPage, options: { immediate?: boolean } = {}): LandingPage[] {
  const pages = loadSavedLandingPages();
  const nowIso = new Date().toISOString();
  const normalizedInput = normalizePage({
    ...page,
    updatedAt: nowIso,
    updated_at: nowIso,
  } as any);
  const index = pages.findIndex((p) => p.id === normalizedInput.id || (normalizedInput.slug && p.slug === normalizedInput.slug));

  const pageWithUpdatedTimestamp: LandingPage = index >= 0
    ? normalizePage({ ...pages[index], ...normalizedInput, updatedAt: nowIso, updated_at: nowIso } as any)
    : normalizedInput;

  const updated = index >= 0
    ? pages.map((p, idx) => (idx === index ? pageWithUpdatedTimestamp : p))
    : [pageWithUpdatedTimestamp, ...pages];

  // Grava atomicamente no RAM, /api/pages/preview e Google Sheets (sem reescrever todas as 8 abas!)
  cloudStore.saveLandingPageOnly(pageWithUpdatedTimestamp as any, { immediate: options.immediate === true }).catch(() => {});

  return updated;
}

export async function syncPageWithServerPreview(page: LandingPage): Promise<boolean> {
  try {
    const nowIso = new Date().toISOString();
    const payload = normalizePage({
      ...page,
      updatedAt: (page as any).updatedAt || (page as any).updated_at || nowIso,
      updated_at: (page as any).updated_at || (page as any).updatedAt || nowIso,
    } as any);
    const res = await fetch("/api/pages/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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
    const timeoutId = setTimeout(() => controller.abort(), 2800);
    try {
      const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        const pageData = data?.page || data?.landingPage || (data?.id && (data?.hero || data?.title || data?.name) ? data : null);
        if (pageData && !isCorruptedLeadRow(pageData) && (pageData.title || pageData.name || pageData.hero)) {
          return normalizePage(pageData);
        }
      }
    } catch {
      clearTimeout(timeoutId);
    }
    return null;
  };

  try {
    const apiResults = await Promise.allSettled([
      fetchEndpoint(`/api/public/lp/${cleanId}`),
      fetchEndpoint(`/api/pages/preview/${cleanId}`),
    ]);

    const candidates: LandingPage[] = [];
    for (const r of apiResults) {
      if (r.status === "fulfilled" && r.value) {
        candidates.push(r.value);
      }
    }

    if (candidates.length > 0) {
      candidates.sort((a, b) => getLpTs(b) - getLpTs(a));
      return candidates[0];
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

