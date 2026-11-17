"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createFileRoute, useSearch, useNavigate } from "@tanstack/react-router";
import { LandingPageRenderer } from "@/components/marketing/comet-lp/components/LandingPageRenderer";
import { PRESET_TEMPLATES } from "@/components/marketing/comet-lp/data/templates";
import { ensureCometLP } from "@/components/marketing/comet-lp/utils/cometAdapter";
import { getInitialAILandingPages } from "@/hooks/use-data";
import { submitLpLeadToDrive } from "@/services/googleDriveDatabaseService";
import { fetchPageFromServerPreview } from "@/components/marketing/comet-lp/utils/storage";
import { cloudStore } from "@/services/cloudStorageService";
import { parseUtm } from "@/modules/landing-pages";
import { getStoredTracking } from "@/components/marketing/lp-tracking-capture";
import {
  ExternalLink,
  Copy,
  Check,
  Smartphone,
  Tablet,
  Monitor,
  ArrowLeft,
  Loader2,
  Sparkles,
  AlertCircle,
  Eye,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function isUUID(str?: string): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

function normalizeSlug(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const Route = createFileRoute("/preview")({
  component: PreviewPage,
  validateSearch: (search: Record<string, unknown>) => ({
    pageId: (search.pageId as string) || "",
    token: (search.token as string) || "",
    id: (search.id as string) || "",
    slug: (search.slug as string) || "",
    v: (search.v as string | number) || "",
    device: (search.device as "desktop" | "tablet" | "mobile") || "desktop",
    toolbar: (search.toolbar as string) || "true",
  }),
});

export function PreviewPage() {
  const search = useSearch({ from: "/preview" });
  const navigate = useNavigate();

  const targetId = (search.pageId || search.token || search.id || search.slug || "").trim();

  const [page, setPage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">(search.device || "desktop");
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPublic, setCopiedPublic] = useState(false);
  const [showToolbar, setShowToolbar] = useState(search.toolbar !== "false");

  useEffect(() => {
    let isMounted = true;

    const findMatchingPage = (list: any[], searchId: string) => {
      const normTarget = normalizeSlug(searchId);
      return list.find((p: any) => {
        if (!p) return false;
        if (p.id === searchId || p.slug === searchId || p.previewToken === searchId) return true;
        if (p.name && normalizeSlug(p.name) === normTarget) return true;
        if (p.title && normalizeSlug(p.title) === normTarget) return true;
        return false;
      });
    };

    async function resolvePage() {
      const db = cloudStore.getState();

      if (!targetId) {
        if (db.activePreviewPage && isMounted) {
          setPage(db.activePreviewPage);
          setLoading(false);
          return;
        }
        if (Array.isArray(db.landingPages) && db.landingPages.length > 0 && isMounted) {
          setPage(db.landingPages[0]);
          setLoading(false);
          return;
        }

        if (!cloudStore.getStatus().loadedFromCloud) {
          try {
            const booted = await cloudStore.bootstrap();
            if (booted.activePreviewPage && isMounted) {
              setPage(booted.activePreviewPage);
              setLoading(false);
              return;
            }
            if (Array.isArray(booted.landingPages) && booted.landingPages.length > 0 && isMounted) {
              setPage(booted.landingPages[0]);
              setLoading(false);
              return;
            }
          } catch {}
        }

        if (PRESET_TEMPLATES.length > 0 && isMounted) {
          setPage(PRESET_TEMPLATES[0]);
          setLoading(false);
          return;
        }

        if (isMounted) {
          setErrorMsg("Nenhuma Landing Page selecionada para visualização.");
          setLoading(false);
        }
        return;
      }

      setErrorMsg(null);

      // PASSO 1: Busca instantânea no estado em RAM do cloudStore
      let ramFound: any = null;
      if (db.activePreviewPage && findMatchingPage([db.activePreviewPage], targetId)) {
        ramFound = db.activePreviewPage;
      } else if (Array.isArray(db.landingPages)) {
        ramFound = findMatchingPage(db.landingPages, targetId);
      }

      if (ramFound && isMounted) {
        setPage(ramFound);
        setLoading(false);
      }

      // PASSO 2: Busca ao vivo no Google Apps Script (GET_PUBLIC_LP) e servidor Express
      try {
        const [cloudPage, serverPage] = await Promise.all([
          cloudStore.fetchPublicLP(targetId).catch(() => null),
          fetchPageFromServerPreview(targetId).catch(() => null),
        ]);
        const remoteBest = cloudPage || serverPage;
        if (remoteBest && isMounted) {
          const ramTime = new Date((ramFound as any)?.updatedAt || (ramFound as any)?.updated_at || (ramFound as any)?.createdAt || 0).getTime();
          const remoteTime = new Date((remoteBest as any)?.updatedAt || (remoteBest as any)?.updated_at || (remoteBest as any)?.createdAt || 0).getTime();
          if (!ramFound || remoteTime >= ramTime) {
            setPage(remoteBest);
            setLoading(false);
            return;
          }
        }
      } catch {}

      if (ramFound && isMounted) {
        setLoading(false);
        return;
      }

      // PASSO 3: Bootstrap completo da nuvem se outro navegador acabou de abrir a aba
      if (!cloudStore.getStatus().loadedFromCloud) {
        try {
          const booted = await cloudStore.bootstrap();
          const bootedMatch =
            (booted.activePreviewPage && findMatchingPage([booted.activePreviewPage], targetId)) ||
            findMatchingPage(booted.landingPages || [], targetId);
          if (bootedMatch && isMounted) {
            setPage(bootedMatch);
            setLoading(false);
            return;
          }
        } catch {}
      }

      // PASSO 4: Fallback para templates pré-configurados apenas por ID/slug exato
      const normTarget = normalizeSlug(targetId);
      const presetFound = PRESET_TEMPLATES.find((p) => {
        if (p.id === targetId || p.slug === targetId) return true;
        if (normalizeSlug(p.id) === normTarget || normalizeSlug(p.title) === normTarget) return true;
        return false;
      });

      if (presetFound && isMounted) {
        setPage(presetFound);
        setLoading(false);
        return;
      }

      const aiTemplates = getInitialAILandingPages();
      const aiFound = aiTemplates.find((p) => {
        if (p.id === targetId || p.slug === targetId) return true;
        if (normalizeSlug(p.id) === normTarget || normalizeSlug(p.title || p.name) === normTarget) return true;
        return false;
      });

      if (aiFound && isMounted) {
        setPage(aiFound);
        setLoading(false);
        return;
      }

      if (isMounted) {
        setErrorMsg(`A Landing Page solicitada ("${targetId}") ainda não foi sincronizada ou não foi encontrada.`);
        setLoading(false);
      }
    }

    resolvePage();

    const unsubscribe = cloudStore.subscribe(() => {
      if (!isMounted) return;
      const db = cloudStore.getState();
      if (!targetId) {
        if (db.activePreviewPage) setPage(db.activePreviewPage);
        return;
      }
      const match =
        (db.activePreviewPage && findMatchingPage([db.activePreviewPage], targetId)) ||
        findMatchingPage(db.landingPages || [], targetId);
      if (match) {
        setPage((prev: any) => {
          const prevTime = new Date(prev?.updatedAt || prev?.updated_at || 0).getTime();
          const nextTime = new Date(match?.updatedAt || match?.updated_at || 0).getTime();
          return !prev || nextTime >= prevTime ? match : prev;
        });
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [targetId]);

  const publicUrl = useMemo(() => {
    if (!page) return "";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const slugToUse = page.slug || page.id;
    return `${origin}/lp/${slugToUse}`;
  }, [page]);

  const previewShareUrl = useMemo(() => {
    if (typeof window !== "undefined") {
      return window.location.href;
    }
    return "";
  }, []);

  const handleCopyPreview = () => {
    if (!previewShareUrl) return;
    navigator.clipboard.writeText(previewShareUrl);
    setCopiedLink(true);
    toast.success("Link de Teste copiado para a área de transferência!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyPublic = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    setCopiedPublic(true);
    toast.success("Link Público Oficial copiado com sucesso!");
    setTimeout(() => setCopiedPublic(false), 2000);
  };

  const handleLeadSubmit = async (leadData: any) => {
    const { source, utm } = parseUtm(typeof window !== "undefined" ? window.location.search : "");
    const tracking = getStoredTracking();

    const payload = {
      pageId: page?.id || targetId,
      pageTitle: page?.title || page?.name || "Página Preview",
      name: leadData.name || "Lead Teste Preview",
      whatsapp: leadData.whatsapp || "",
      email: leadData.email || "",
      quizAnswers: leadData.quizAnswers || {},
      utms: { ...utm, utm_source: utm.utm_source || "preview-test" },
      source: source || "preview-test",
      webhookUrl: page?.settings?.webhookUrl || page?.webhookUrl,
      metadata: {
        isTestPreview: true,
        device,
        submittedAt: new Date().toISOString(),
        tracking,
      },
    };

    // Persiste imediatamente no cloudStore + API do servidor
    const newLeadObj = {
      id: `lead_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: leadData.name || "Lead Teste Preview",
      company: `${leadData.name || "Lead Teste"} (Preview: ${page?.title || page?.name || "LP"})`,
      email: leadData.email || "",
      whatsapp: leadData.whatsapp || "",
      stage: "Leads",
      source: source || "preview-test",
      classification: "Lead Teste",
      temperature: "Quente",
      type: "Inbound",
      landingPage: page?.title || page?.name || targetId,
      tags: ["preview-test", "leadtest", source || "direct"].filter(Boolean),
      createdAt: new Date().toISOString(),
      metadata: payload.metadata,
    };

    cloudStore.mutate(
      (draft) => {
        draft.leads = [newLeadObj, ...(draft.leads || []).filter((l: any) => l.id !== newLeadObj.id)];
      },
      { skipPush: true }
    );
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("lead-submitted", { detail: newLeadObj }));
    }

    try {
      await fetch("/api/submit-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      try {
        await fetch("/api/webhook/submit-lead", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch {}
    }

    try {
      await submitLpLeadToDrive({
        landingPageId: page?.id || targetId,
        landingPageTitle: page?.title || page?.name || "Página Preview",
        name: leadData.name || "Lead Teste Preview",
        email: leadData.email || "",
        whatsapp: leadData.whatsapp || "",
        company: `${leadData.name || "Lead Teste"} (Preview: ${page?.title || page?.name || "LP"})`,
        source: source || "preview-test",
        utm,
        answers: leadData.quizAnswers || {},
        isTest: true,
      });
    } catch (gErr) {
      console.warn("Google Drive test lead sync notice:", gErr);
    }

    toast.success("✅ Lead de Teste registrado com sucesso no CRM!", {
      description: "Os dados foram computados e integrados às métricas.",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-zinc-950 flex flex-col items-center justify-center text-white gap-4 p-6">
        <div className="relative">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-purple-600 to-indigo-500 animate-pulse flex items-center justify-center shadow-2xl shadow-purple-500/20">
            <Loader2 className="w-8 h-8 animate-spin text-white" />
          </div>
        </div>
        <div className="text-center space-y-1">
          <h2 className="text-base font-bold text-zinc-100">Carregando visualização oficial...</h2>
          <p className="text-xs text-zinc-400">Sincronizando modelos, mídias e formulário de conversão.</p>
        </div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="min-h-screen w-full bg-zinc-950 flex flex-col items-center justify-center text-white p-6">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center space-y-5 shadow-2xl">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center border border-red-500/20">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-100">Landing Page Não Encontrada</h2>
            <p className="text-xs text-zinc-400 mt-2">
              {errorMsg || "Não conseguimos localizar essa página no banco de dados ou no cache local."}
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => navigate({ to: "/app/landing-pages" })}
              className="w-full py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar ao Painel de LPs
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <RefreshCw className="w-4 h-4" /> Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-zinc-950 text-white flex flex-col relative overflow-x-hidden">
      {/* Top Preview Control Bar */}
      {showToolbar && (
        <header className="sticky top-0 z-50 w-full bg-zinc-900/95 backdrop-blur-md border-b border-zinc-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate({ to: "/app/landing-pages" })}
              className="h-8 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Voltar ao Editor"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Editor</span>
            </button>

            <div className="h-4 w-px bg-zinc-700" />

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Preview Oficial
              </span>
              <span className="text-xs font-bold text-zinc-200 truncate max-w-[180px] sm:max-w-xs">
                {page.title || page.name || "Landing Page"}
              </span>
            </div>
          </div>

          {/* Device viewport switchers */}
          <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800">
            <button
              type="button"
              onClick={() => setDevice("desktop")}
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer",
                device === "desktop" ? "bg-purple-600 text-white shadow-sm" : "text-zinc-400 hover:text-white"
              )}
              title="Visualização Desktop"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Desktop</span>
            </button>
            <button
              type="button"
              onClick={() => setDevice("tablet")}
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer",
                device === "tablet" ? "bg-purple-600 text-white shadow-sm" : "text-zinc-400 hover:text-white"
              )}
              title="Visualização Tablet (768px)"
            >
              <Tablet className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Tablet</span>
            </button>
            <button
              type="button"
              onClick={() => setDevice("mobile")}
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer",
                device === "mobile" ? "bg-purple-600 text-white shadow-sm" : "text-zinc-400 hover:text-white"
              )}
              title="Visualização Celular (390px)"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Mobile</span>
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyPreview}
              className="h-8 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Copiar Link de Teste"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
              <span className="hidden lg:inline">Copiar Teste</span>
            </button>

            {publicUrl && (
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="h-8 px-3 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-purple-500/20"
                title="Abrir Link Público Oficial em nova aba"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Link Público</span>
              </a>
            )}

            <button
              type="button"
              onClick={() => setShowToolbar(false)}
              className="h-8 px-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 text-[10px] transition-all cursor-pointer"
              title="Ocultar barra de ferramentas"
            >
              Ocultar Barra
            </button>
          </div>
        </header>
      )}

      {/* Floating button to restore toolbar if hidden */}
      {!showToolbar && (
        <button
          type="button"
          onClick={() => setShowToolbar(true)}
          className="fixed top-3 right-3 z-50 px-3 py-1.5 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white text-xs font-bold flex items-center gap-1.5 shadow-2xl backdrop-blur-md cursor-pointer transition-all"
        >
          <Eye className="w-3.5 h-3.5 text-purple-400" />
          <span>Mostrar Barra de Teste</span>
        </button>
      )}

      {/* Main Container with Device Viewport Emulation */}
      <main className="flex-1 w-full flex justify-center items-start bg-zinc-950 py-0 overflow-x-hidden">
        <div
          className={cn(
            "transition-all duration-300 w-full min-h-screen",
            device === "mobile" && "max-w-[420px] my-6 rounded-[2.5rem] border-8 border-zinc-800 shadow-2xl overflow-hidden bg-white",
            device === "tablet" && "max-w-[820px] my-6 rounded-3xl border-8 border-zinc-800 shadow-2xl overflow-hidden bg-white",
            device === "desktop" && "max-w-full"
          )}
        >
          <LandingPageRenderer
            page={ensureCometLP(page)}
            deviceView={device}
            isEditorPreview={false}
            onLeadSubmit={handleLeadSubmit}
          />
        </div>
      </main>
    </div>
  );
}
