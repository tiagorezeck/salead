import { LandingPage, LeadSubmission, DEFAULT_HEADER_NAV } from "../types/landingPage";
import { PRESET_TEMPLATES } from "../data/templates";

const STORAGE_KEY = "people_cro_landing_pages_v1";
const LEADS_STORAGE_KEY = "people_cro_leads_v1";

function normalizePage(page: LandingPage): LandingPage {
  return {
    ...page,
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
    const keys = ["comet_local_landing_pages", "people_cro_landing_pages_v1", "app:lps:v1"];
    const mergedMap = new Map<string, LandingPage>();

    for (const key of keys) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const p of parsed) {
            if (p && (p.id || p.slug)) {
              const itemKey = p.id || p.slug;
              if (!mergedMap.has(itemKey)) {
                mergedMap.set(itemKey, normalizePage(p));
              } else {
                // Se já existir, mantém a versão com timestamp mais recente
                const existing = mergedMap.get(itemKey)!;
                const existingTime = new Date(existing.updatedAt || (existing as any).updated_at || 0).getTime();
                const newTime = new Date(p.updatedAt || p.updated_at || 0).getTime();
                if (newTime >= existingTime) {
                  mergedMap.set(itemKey, normalizePage({ ...existing, ...p }));
                }
              }
            }
          }
        }
      } catch {}
    }

    // Se houver uma página ativa de preview editada, integra ela
    try {
      const activeRaw = localStorage.getItem("active_preview_page");
      if (activeRaw) {
        const active = JSON.parse(activeRaw);
        if (active && (active.id || active.slug)) {
          const itemKey = active.id || active.slug;
          mergedMap.set(itemKey, normalizePage(active));
        }
      }
    } catch {}

    const results = Array.from(mergedMap.values());
    if (results.length > 0) {
      return results;
    }

    // Seed com presets caso esteja totalmente vazio
    const normalized = PRESET_TEMPLATES.map(normalizePage);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      localStorage.setItem("comet_local_landing_pages", JSON.stringify(normalized));
    } catch {}
    return normalized;
  } catch (err) {
    console.error("Failed to load landing pages from storage:", err);
    return PRESET_TEMPLATES.map(normalizePage);
  }
}

export function saveLandingPages(pages: LandingPage[]): void {
  if (typeof window === "undefined") return;
  try {
    const serialized = JSON.stringify(pages);
    localStorage.setItem(STORAGE_KEY, serialized);
    localStorage.setItem("comet_local_landing_pages", serialized);
    localStorage.setItem("app:lps:v1", serialized);
  } catch (err) {
    console.error("Failed to save landing pages to storage:", err);
  }
}

export function saveSingleLandingPage(page: LandingPage): LandingPage[] {
  const pages = loadSavedLandingPages();
  const index = pages.findIndex((p) => p.id === page.id || (page.slug && p.slug === page.slug));
  let updated: LandingPage[];
  const pageWithUpdatedTimestamp: LandingPage = {
    ...page,
    updatedAt: new Date().toISOString(),
    ...(page as any),
  };

  if (index >= 0) {
    updated = [...pages];
    updated[index] = { ...updated[index], ...pageWithUpdatedTimestamp };
  } else {
    updated = [pageWithUpdatedTimestamp, ...pages];
  }

  saveLandingPages(updated);

  try {
    localStorage.setItem("active_preview_page", JSON.stringify(pageWithUpdatedTimestamp));
  } catch {}

  // Sincronização assíncrona imediata com o servidor (preview + persistência física)
  syncPageWithServerPreview(pageWithUpdatedTimestamp).catch(() => {});
  try {
    fetch(`/api/landing-pages/${encodeURIComponent(page.id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pageWithUpdatedTimestamp),
    }).catch(() => {});
  } catch {}

  return updated;
}

export async function syncPageWithServerPreview(page: LandingPage): Promise<boolean> {
  try {
    const res = await fetch("/api/pages/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(page),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchPageFromServerPreview(tokenOrId: string): Promise<LandingPage | null> {
  if (!tokenOrId) return null;
  const cleanId = encodeURIComponent(tokenOrId.trim());

  // Executa buscas simultâneas em paralelo com timeout de 2.5 segundos para máxima velocidade
  const fetchEndpoint = async (url: string): Promise<LandingPage | null> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        const pageData = data?.page || data?.landingPage;
        if (pageData && (pageData.title || pageData.name)) {
          return normalizePage(pageData);
        }
      }
    } catch {
      clearTimeout(timeoutId);
    }
    return null;
  };

  try {
    const results = await Promise.allSettled([
      fetchEndpoint(`/api/public/lp/${cleanId}`),
      fetchEndpoint(`/api/landing-pages/${cleanId}`),
      fetchEndpoint(`/api/pages/preview?id=${cleanId}`),
      fetchEndpoint(`/api/pages/preview/${cleanId}`),
    ]);

    for (const r of results) {
      if (r.status === "fulfilled" && r.value) {
        return r.value;
      }
    }
  } catch {}

  return null;
}

export const syncPageToServerPreview = syncPageWithServerPreview;

export const saveLandingPageToStorage = saveSingleLandingPage;

export function deleteLandingPage(id: string): LandingPage[] {
  const pages = loadSavedLandingPages();
  const updated = pages.filter((p) => p.id !== id);
  saveLandingPages(updated);

  // Sync with global deletion tracking
  if (typeof window !== "undefined") {
    try {
      const rawDel = localStorage.getItem("comet_deleted_lp_ids");
      const delList = rawDel ? JSON.parse(rawDel) : [];
      if (Array.isArray(delList) && !delList.includes(id)) {
        delList.push(id);
        localStorage.setItem("comet_deleted_lp_ids", JSON.stringify(delList));
      }
    } catch {}

    try {
      const cometRaw = localStorage.getItem("comet_local_landing_pages");
      if (cometRaw) {
        const cometList = JSON.parse(cometRaw);
        if (Array.isArray(cometList)) {
          localStorage.setItem("comet_local_landing_pages", JSON.stringify(cometList.filter((p: any) => p.id !== id)));
        }
      }
    } catch {}

    try {
      const v1Raw = localStorage.getItem("app:lps:v1");
      if (v1Raw) {
        const v1List = JSON.parse(v1Raw);
        if (Array.isArray(v1List)) {
          localStorage.setItem("app:lps:v1", JSON.stringify(v1List.filter((p: any) => p.id !== id)));
        }
      }
    } catch {}

    try {
      const activePrev = localStorage.getItem("active_preview_page");
      if (activePrev) {
        const parsed = JSON.parse(activePrev);
        if (parsed?.id === id) {
          localStorage.removeItem("active_preview_page");
        }
      }
    } catch {}

    // Limpa preview em memória do servidor
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

export function recordLocalLead(lead: LeadSubmission): void {
  // Desativado: leads agora são gravados 100% direto no banco de dados
}

