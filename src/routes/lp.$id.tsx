"use client";

import { createFileRoute, useParams } from "@tanstack/react-router";
import { getDeletedLandingPageIds, getInitialAILandingPages } from "@/hooks/use-data";
import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { 
  X, 
  MessageCircle, 
  Loader2, 
  Globe, 
  ExternalLink, 
  ClipboardList, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft,
  User,
  Phone,
  Mail,
  Building2,
  Sparkles,
  Send,
  ShieldCheck,
  Check,
  ArrowRight,
  MessageSquare
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const LandingPageRenderer = lazy(() =>
  import("@/components/marketing/comet-lp/components/LandingPageRenderer").then((m) => ({
    default: m.LandingPageRenderer,
  }))
);
const DeepFindSurveyViewer = lazy(() =>
  import("@/components/marketing/deepfind-survey-viewer").then((m) => ({
    default: m.DeepFindSurveyViewer,
  }))
);
import { ensureCometLP } from "@/components/marketing/comet-lp/utils/cometAdapter";
import { fetchPageFromServerPreview } from "@/components/marketing/comet-lp/utils/storage";
import { LPTrackingCapture, getStoredTracking } from "@/components/marketing/lp-tracking-capture";
import { PublicRenderer } from "@/modules/landing-pages/renderer/PublicRenderer";
import { getLPModule, parseUtm } from "@/modules/landing-pages";
import { PRESET_TEMPLATES } from "@/components/marketing/comet-lp/data/templates";
import { 
  submitLpLeadToDrive, 
  recordLpVisitToDrive,
} from "@/services/googleDriveDatabaseService";
import { cloudStore } from "@/services/cloudStorageService";

const SURVEY_PRESETS: any[] = [
  {
    id: "survey-diagnostico-vendas",
    name: "Diagnóstico de Performance de Vendas",
    description: "Qualificação e mapeamento de maturidade comercial",
    accentColor: "#FF6B00",
  },
  {
    id: "survey-qualificacao-lead",
    name: "Qualificação Rápida de Lead",
    description: "Pesquisa de pré-atendimento para filtro de ICP",
    accentColor: "#8B5CF6",
  }
];

export const Route = createFileRoute("/lp/$id")({
  component: PublicLPPage,
  errorComponent: ({ error }: any) => (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 space-y-5 shadow-2xl relative overflow-hidden">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-zinc-800/80 border border-zinc-700/50 text-purple-400 flex items-center justify-center shadow-inner">
          <AlertCircle className="w-7 h-7" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-lg font-bold text-zinc-100">Erro ao carregar página</h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Ocorreu uma instabilidade momentânea ao carregar os dados desta Landing Page.
          </p>
        </div>
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") window.location.reload();
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-lg cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 rotate-90 sm:rotate-0" /> Tentar Novamente
          </button>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") window.history.back();
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 text-xs font-bold transition-all cursor-pointer"
          >
            Voltar
          </button>
        </div>
      </div>
    </div>
  ),
});

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

function getLpTs(p: any): number {
  if (!p || typeof p !== "object") return 0;
  const t1 = p.updatedAt ? new Date(p.updatedAt).getTime() : 0;
  const t2 = p.updated_at ? new Date(p.updated_at).getTime() : 0;
  const t3 = p.createdAt ? new Date(p.createdAt).getTime() : 0;
  return Math.max(Number.isFinite(t1) ? t1 : 0, Number.isFinite(t2) ? t2 : 0, Number.isFinite(t3) ? t3 : 0);
}

function hasFullLpContent(p: any): boolean {
  if (!p || typeof p !== "object") return false;
  if (p.externalUrl || p.external_url || p.type === "URL Externa" || p.template === "External") return true;
  if (p.hero && typeof p.hero === "object" && (p.hero.headline || p.hero.ctaText || p.hero.model)) return true;
  if (Array.isArray(p.bentoGrid?.items) && p.bentoGrid.items.length > 0) return true;
  if (typeof p["Config JSON"] === "string" && p["Config JSON"].trim().startsWith("{")) return true;
  return false;
}

function PublicLPPage() {
  const { id } = useParams({ from: "/lp/$id" });
  const [cloudSnapshot, setCloudSnapshot] = useState(() => cloudStore.getState());
  useEffect(() => {
    return cloudStore.subscribe(() => {
      setCloudSnapshot(cloudStore.getState());
    });
  }, []);
  const products = cloudSnapshot.products || [];
  const pipelines = cloudSnapshot.pipelines || [];
  const surveys = cloudSnapshot.surveys || [];
  const leads = cloudSnapshot.leads || [];

  const [lp, setLp] = useState<any>(null);
  const [assignedSurvey, setAssignedSurvey] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showSurveyModal, setShowSurveyModal] = useState(false);
  const [surveyAnswers, setSurveyAnswers] = useState<Record<string, any>>({});
  const [surveySubmitted, setSurveySubmitted] = useState(false);
  const visitTracked = useRef(false);

  useEffect(() => {
    let isMounted = true;

    async function loadContent() {
      if (!id) {
        if (isMounted) setLoading(false);
        return;
      }

      const normId = normalizeSlug(id);

      // =====================================================================
      // PASSO 0: FAST-PATH INSTANTÂNEO (SESSIONSTORAGE CACHE & PRESETS)
      // Custo 0ms - Elimina o tempo de espera de rede de 5-8 segundos
      // =====================================================================
      if (typeof window !== "undefined") {
        try {
          const cachedStr = sessionStorage.getItem(`lp_cache_${id}`) || sessionStorage.getItem(`lp_cache_${normId}`);
          if (cachedStr) {
            const cachedLp = JSON.parse(cachedStr);
            if (cachedLp && hasFullLpContent(cachedLp)) {
              if (isMounted) {
                setLp(cachedLp);
                setLoading(false);
                // Executa registro de visita e rastreamento em segundo plano sem bloquear o render
                setTimeout(() => {
                  if (typeof recordVisitForLP === "function") recordVisitForLP(cachedLp).catch(() => {});
                }, 10);
              }
              return;
            }
          }
        } catch {}

        // Verificação instantânea em Presets e Templates AI
        const numIdx = parseInt(id, 10);
        if (!isNaN(numIdx) && numIdx > 0 && numIdx <= PRESET_TEMPLATES.length) {
          const presetByIndex = PRESET_TEMPLATES[numIdx - 1];
          if (presetByIndex && isMounted) {
            setLp(presetByIndex);
            setLoading(false);
            try { sessionStorage.setItem(`lp_cache_${id}`, JSON.stringify(presetByIndex)); } catch {}
            setTimeout(() => recordVisitForLP(presetByIndex).catch(() => {}), 10);
            return;
          }
        }

        const presetMatch = PRESET_TEMPLATES.find((p) => p.id === id || p.slug === id || normalizeSlug(p.id) === normId);
        if (presetMatch && isMounted) {
          setLp(presetMatch);
          setLoading(false);
          try { sessionStorage.setItem(`lp_cache_${id}`, JSON.stringify(presetMatch)); } catch {}
          setTimeout(() => recordVisitForLP(presetMatch).catch(() => {}), 10);
          return;
        }

        const aiTemplates = getInitialAILandingPages();
        const aiMatch = aiTemplates.find((p) => p.id === id || p.slug === id || normalizeSlug(p.id) === normId);
        if (aiMatch && isMounted) {
          setLp(aiMatch);
          setLoading(false);
          try { sessionStorage.setItem(`lp_cache_${id}`, JSON.stringify(aiMatch)); } catch {}
          setTimeout(() => recordVisitForLP(aiMatch).catch(() => {}), 10);
          return;
        }
      }

      const deletedIds = new Set(getDeletedLandingPageIds());
      if (deletedIds.has(id)) {
        if (isMounted) {
          setLp(null);
          setLoading(false);
        }
        return;
      }

      const recordVisitForLP = async (targetLp: any) => {
        if (visitTracked.current || !targetLp) return;
        visitTracked.current = true;

        const targetId = targetLp.id || targetLp.slug || id;
        const currentVisits = Number(targetLp.visits || targetLp.viewsCount || targetLp.views_count) || 0;
        const newVisits = currentVisits + 1;

        // 1. Atualiza estado local da página no React
        if (isMounted) {
          setLp((prev: any) => {
            const base = prev || targetLp;
            const leads = Number(base.leads || base.leads_count) || 0;
            const updatedVisits = Math.max(newVisits, leads);
            return {
              ...base,
              visits: updatedVisits,
              viewsCount: updatedVisits,
              views_count: updatedVisits,
              conv: updatedVisits > 0 ? Math.min(100, Math.round((leads / updatedVisits) * 100)) : 0
            };
          });
        }

        // 2. Atualiza estado em RAM e sincroniza com Google Sheets/Drive via cloudStore (0% localStorage)
        if (typeof window !== "undefined") {
          try {
            cloudStore.mutate((draft) => {
              const list = Array.isArray(draft.landingPages) ? draft.landingPages : [];
              draft.landingPages = list.map((p: any) => {
                if (p && (p.id === targetLp.id || p.id === id || p.slug === targetLp.slug || p.slug === id)) {
                  const lpLeads = Number(p.leads || p.leads_count) || 0;
                  const updatedVisits = Math.max(newVisits, lpLeads);
                  return {
                    ...p,
                    visits: updatedVisits,
                    viewsCount: updatedVisits,
                    views_count: updatedVisits,
                    conv: updatedVisits > 0 ? Math.min(100, Math.round((lpLeads / updatedVisits) * 100)) : 0,
                    updated_at: new Date().toISOString()
                  };
                }
                return p;
              });

              if (draft.activePreviewPage && (draft.activePreviewPage.id === targetLp.id || draft.activePreviewPage.id === id || draft.activePreviewPage.slug === targetLp.slug || draft.activePreviewPage.slug === id)) {
                const lpLeads = Number(draft.activePreviewPage.leads || draft.activePreviewPage.leads_count) || 0;
                const updatedVisits = Math.max(newVisits, lpLeads);
                draft.activePreviewPage = {
                  ...draft.activePreviewPage,
                  visits: updatedVisits,
                  viewsCount: updatedVisits,
                  views_count: updatedVisits,
                  conv: updatedVisits > 0 ? Math.min(100, Math.round((lpLeads / updatedVisits) * 100)) : 0,
                };
              }
            }, { skipPush: true });

            window.dispatchEvent(new CustomEvent("lp_visit_incremented", { detail: { id: targetId, visits: newVisits } }));
          } catch (csErr) {
            console.warn("Aviso ao atualizar visitas no cloudStore:", csErr);
          }
        }

        // 3. Notifica o Servidor Express e Vercel Serverless (API do Backend)
        try {
          fetch(`/api/landing-pages/${encodeURIComponent(targetId)}/visit`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lpId: targetLp.id, id, slug: targetLp.slug, title: targetLp.title || targetLp.name })
          }).catch(() => {});
        } catch {}

        // 3b. Sincroniza visita diretamente com o Google Drive e Google Sheets (em tempo real)
        try {
          recordLpVisitToDrive({
            lpId: targetLp.id,
            id: String(id),
            slug: targetLp.slug,
            pageTitle: targetLp.title || targetLp.name
          }).catch(() => {});
        } catch {}

        // 4. Registra evento de Analytics
        try {
          if (typeof window !== "undefined") {
            const { source, utm } = parseUtm(window.location.search);
            getLPModule().analytics.track({
              lpId: targetLp.id || id,
              slug: targetLp.slug || targetLp.id || id,
              type: "visit",
              source,
              utm,
              referrer: document.referrer || undefined,
            });
          }
        } catch {}
      };

      const matchesTarget = (p: any) => {
        if (!p) return false;
        if (deletedIds.has(p.id) || deletedIds.has(p.slug)) return false;
        if (p.id === id || p.slug === id || p.previewToken === id || p.originalId === id) return true;
        if (p.name && normalizeSlug(p.name) === normId) return true;
        if (p.title && normalizeSlug(p.title) === normId) return true;
        return false;
      };

      try {
        // =====================================================================
        // PASSO 1: BUSCA SÍNCRONA EM MEMÓRIA RAM (cloudStore)
        // =====================================================================
        const db = cloudStore.getState();
        let foundInRam: any = null;
        if (db.activePreviewPage && matchesTarget(db.activePreviewPage)) {
          foundInRam = db.activePreviewPage;
        } else if (Array.isArray(db.landingPages)) {
          foundInRam = db.landingPages.find(matchesTarget) || null;
        }

        const ramIsComplete = Boolean(foundInRam && hasFullLpContent(foundInRam));
        if (foundInRam && ramIsComplete && isMounted) {
          setLp(foundInRam);
          setLoading(false);
          try { sessionStorage.setItem(`lp_cache_${id}`, JSON.stringify(foundInRam)); } catch {}
          recordVisitForLP(foundInRam).catch(() => {});
          if (cloudStore.getStatus().pendingWrite) {
            return;
          }
        }

        // =====================================================================
        // PASSO 2: BUSCA PARALELA RÁPIDA (SERVIDOR + APPS SCRIPT CACHE/SHEETS)
        // Renderiza imediatamente assim que a primeira fonte completa responder
        // =====================================================================
        let bestPage: any = ramIsComplete ? foundInRam : null;
        let bestTime = ramIsComplete ? getLpTs(foundInRam) : 0;
        let visitRecorded = ramIsComplete;

        const applyRemoteIfNewer = (candidate: any) => {
          if (!candidate || deletedIds.has(candidate.id) || !isMounted) return;
          const candFull = hasFullLpContent(candidate);
          const bestFull = hasFullLpContent(bestPage);
          if (bestPage && bestFull && !candFull) return;

          const candTime = getLpTs(candidate);
          const candModel = candidate.hero?.model || candidate.heroModel || candidate.hero_model || "split_image";
          const bestModel = bestPage?.hero?.model || bestPage?.heroModel || bestPage?.hero_model || "split_image";
          const isTieBreakUpgrade =
            candTime === bestTime && candModel !== "split_image" && bestModel === "split_image";
          const isCompletenessUpgrade = Boolean(candFull && !bestFull);

          if (!bestPage || isCompletenessUpgrade || (!cloudStore.getStatus().pendingWrite && (candTime > bestTime || isTieBreakUpgrade))) {
            bestPage = candidate;
            bestTime = candTime;
            setLp(candidate);
            setLoading(false);
            if (candFull) {
              try { sessionStorage.setItem(`lp_cache_${id}`, JSON.stringify(candidate)); } catch {}
            }
            if (!visitRecorded) {
              visitRecorded = true;
              recordVisitForLP(candidate).catch(() => {});
            }
          }
        };

        try {
          await Promise.race([
            Promise.allSettled([
              fetchPageFromServerPreview(id, { bypassCache: true })
                .then((srvPage) => applyRemoteIfNewer(srvPage))
                .catch(() => {}),
              cloudStore
                .fetchPublicLP(id, { preferSheets: !ramIsComplete, bypassCache: true })
                .then((cloudPage) => applyRemoteIfNewer(cloudPage))
                .catch(() => {}),
            ]),
            new Promise((resolve) => setTimeout(resolve, 9000)),
          ]);
        } catch (srvErr) {
          console.error("Step 2 (Cloud/Sheets Fetch) error:", srvErr);
        }

        if (bestPage && hasFullLpContent(bestPage)) return;

        // =====================================================================
        // PASSO 3: BOOTSTRAP COMPLETO DO GOOGLE SHEETS / DRIVE SE PASSO 2 NÃO ACHOU COMPLETO
        // =====================================================================
        if (!cloudStore.getStatus().loadedFromCloud || !bestPage || !hasFullLpContent(bestPage)) {
          try {
            const booted: any = await Promise.race([
              cloudStore.bootstrap(),
              new Promise((resolve) => setTimeout(() => resolve(null), 8000)),
            ]);
            const liveMatch = booted
              ? (booted.activePreviewPage && matchesTarget(booted.activePreviewPage) ? booted.activePreviewPage : null) ||
                (Array.isArray(booted.landingPages) ? booted.landingPages.find(matchesTarget) : null)
              : null;

            if (liveMatch && isMounted) {
              applyRemoteIfNewer(liveMatch);
              if (!bestPage) {
                setLp(liveMatch);
                setLoading(false);
                recordVisitForLP(liveMatch).catch(() => {});
              }
              if (hasFullLpContent(liveMatch)) return;
            }
          } catch (liveErr) {
            console.error("Step 3 (Bootstrap Cloud) error:", liveErr);
          }
        }

        if (bestPage && isMounted) {
          setLp(bestPage);
          setLoading(false);
          if (!visitRecorded) recordVisitForLP(bestPage).catch(() => {});
          return;
        }

        // =====================================================================
        // PASSO 4: RESOLUÇÃO EM TEMPLATES PRÉ-CONFIGURADOS (APENAS SE ID EXATO OU ÍNDICE NUMÉRICO)
        // =====================================================================
        const numIdx = parseInt(id, 10);
        if (!isNaN(numIdx) && numIdx > 0 && numIdx <= PRESET_TEMPLATES.length) {
          const presetByIndex = PRESET_TEMPLATES[numIdx - 1];
          if (presetByIndex && isMounted) {
            setLp(presetByIndex);
            setLoading(false);
            recordVisitForLP(presetByIndex).catch(() => {});
            return;
          }
        }

        const presetMatch = PRESET_TEMPLATES.find((p) => {
          if (p.id === id || p.slug === id) return true;
          if (normalizeSlug(p.id) === normId) return true;
          return false;
        });

        if (presetMatch && isMounted) {
          setLp(presetMatch);
          setLoading(false);
          recordVisitForLP(presetMatch).catch(() => {});
          return;
        }

        const aiTemplates = getInitialAILandingPages();
        const aiMatch = aiTemplates.find((p) => {
          if (p.id === id || p.slug === id) return true;
          if (normalizeSlug(p.id) === normId) return true;
          return false;
        });

        if (aiMatch && isMounted) {
          setLp(aiMatch);
          setLoading(false);
          recordVisitForLP(aiMatch).catch(() => {});
          return;
        }

        // Se não encontrou de forma alguma
        if (isMounted) {
          setLp(null);
          setLoading(false);
        }
      } catch (err) {
        console.error("Erro ao carregar LP pública:", err);
        if (isMounted) setLoading(false);
      }
    }

    loadContent();

    const pollLatestUpdates = async () => {
      if (!isMounted || !id || (typeof document !== "undefined" && document.visibilityState === "hidden")) return;
      if (cloudStore.getStatus().pendingWrite) return;
      try {
        const [srvRes, cldRes] = await Promise.allSettled([
          fetchPageFromServerPreview(id, { bypassCache: true }),
          cloudStore.fetchPublicLP(id, { bypassCache: true }),
        ]);
        const candidates = [
          srvRes.status === "fulfilled" ? srvRes.value : null,
          cldRes.status === "fulfilled" ? cldRes.value : null,
        ].filter(Boolean);
        if (!isMounted || candidates.length === 0) return;
        setLp((prev: any) => {
          let next = prev;
          for (const cand of candidates) {
            const candFull = hasFullLpContent(cand);
            const nextFull = hasFullLpContent(next);
            if (next && nextFull && !candFull) continue;
            const prevTime = getLpTs(next);
            const candTime = getLpTs(cand);
            const prevModel = next?.hero?.model || next?.heroModel || next?.hero_model || "split_image";
            const candModel = cand?.hero?.model || cand?.heroModel || cand?.hero_model || "split_image";
            const isUpgrade =
              !next ||
              Boolean(candFull && !nextFull) ||
              candTime > prevTime ||
              (candTime === prevTime && candModel !== "split_image" && prevModel === "split_image");
            if (isUpgrade) next = cand;
          }
          return next;
        });
      } catch {}
    };

    const pollTimer = typeof window !== "undefined" ? window.setInterval(pollLatestUpdates, 12000) : null;
    const handleVisibilityOrFocus = () => {
      if (typeof document === "undefined" || document.visibilityState === "visible") {
        pollLatestUpdates();
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("focus", handleVisibilityOrFocus);
      document.addEventListener("visibilitychange", handleVisibilityOrFocus);
    }

    const unsubscribe = cloudStore.subscribe(() => {
      if (!isMounted || !id) return;
      const deletedSet = new Set(getDeletedLandingPageIds());
      if (deletedSet.has(id)) return;
      const normId = normalizeSlug(id);
      const db = cloudStore.getState();
      const matches = (p: any) => {
        if (!p || deletedSet.has(p.id) || deletedSet.has(p.slug)) return false;
        if (p.id === id || p.slug === id || p.previewToken === id || p.originalId === id) return true;
        if (p.name && normalizeSlug(p.name) === normId) return true;
        if (p.title && normalizeSlug(p.title) === normId) return true;
        return false;
      };
      const liveMatch =
        (db.activePreviewPage && matches(db.activePreviewPage) ? db.activePreviewPage : null) ||
        (Array.isArray(db.landingPages) ? db.landingPages.find(matches) : null);
      if (liveMatch) {
        setLp((prev: any) => {
          if (!prev) return liveMatch;
          const candFull = hasFullLpContent(liveMatch);
          const prevFull = hasFullLpContent(prev);
          if (prevFull && !candFull) return prev;
          const prevTime = getLpTs(prev);
          const nextTime = getLpTs(liveMatch);
          const prevModel = prev.hero?.model || prev.heroModel || prev.hero_model || "split_image";
          const nextModel = liveMatch.hero?.model || liveMatch.heroModel || liveMatch.hero_model || "split_image";
          const isUpgrade =
            Boolean(candFull && !prevFull) ||
            nextTime > prevTime ||
            (nextTime === prevTime && nextModel !== "split_image" && prevModel === "split_image");
          return isUpgrade ? liveMatch : prev;
        });
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
      if (pollTimer !== null) window.clearInterval(pollTimer);
      if (typeof window !== "undefined") {
        window.removeEventListener("focus", handleVisibilityOrFocus);
        document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      }
    };
  }, [id]);

  // Carrega a pesquisa vinculada se houver surveyId ou constrói a partir do quiz da LP
  useEffect(() => {
    const surveyId = lp?.surveyId || (lp as any)?.config?.surveyId || (lp as any)?.minSurveyId || (lp as any)?.survey_id;
    
    if (surveyId) {
      // 1. Procura no array local primeiro
      const foundInLocal = surveys.find((s) => s.id === surveyId || s.slug === surveyId);
      if (foundInLocal) {
        setAssignedSurvey(foundInLocal);
        return;
      }

      // 2. Procura nos presets pré-configurados
      const foundPreset = SURVEY_PRESETS.find((p) => p.id === surveyId);
      if (foundPreset) {
        setAssignedSurvey({
          ...foundPreset,
          status: "active",
          settings: {
            headline: foundPreset.name,
            description: foundPreset.description,
            buttonText: "Iniciar Diagnóstico",
            thankYouMessage: "Obrigado por responder nosso diagnóstico!",
            accentColor: foundPreset.accentColor || "#FF6B00",
          },
        });
        return;
      }

      // 3. Busca direta na nuvem Google Apps Script / API Express (/api/surveys/:id) com fallback para o quiz próprio da LP
      cloudStore
        .fetchPublicSurvey(surveyId)
        .then((cloudSurvey) => {
          if (cloudSurvey) {
            setAssignedSurvey(cloudSurvey);
          } else if (lp?.quiz?.questions && lp.quiz.questions.length > 0) {
            setAssignedSurvey({
              id: surveyId,
              name: lp.name || lp.title || "Diagnóstico Personalizado",
              description: lp.hero?.subheadline || "",
              questions: lp.quiz.questions,
              settings: {
                headline: lp.quiz.title || lp.name || "Diagnóstico",
                description: lp.quiz.subtitle || lp.hero?.subheadline || "",
                buttonText: lp.hero?.ctaText || "Iniciar",
                thankYouMessage: lp.quiz.resultDescription || "Obrigado!",
              },
            });
          }
        })
        .catch(() => {
          if (lp?.quiz?.questions && lp.quiz.questions.length > 0) {
            setAssignedSurvey({
              id: surveyId,
              name: lp.name || lp.title || "Diagnóstico Personalizado",
              description: lp.hero?.subheadline || "",
              questions: lp.quiz.questions,
              settings: {
                headline: lp.quiz.title || lp.name || "Diagnóstico",
                description: lp.quiz.subtitle || lp.hero?.subheadline || "",
                buttonText: lp.hero?.ctaText || "Iniciar",
                thankYouMessage: lp.quiz.resultDescription || "Obrigado!",
              },
            });
          }
        });
      return;
    }

    // Se NÃO houver surveyId explícito, mas a LP possui quiz customizado próprio (lp.quiz), constrói a pesquisa a partir do quiz da página
    if (lp?.quiz?.questions && lp.quiz.questions.length > 0) {
      setAssignedSurvey({
        id: `survey_${lp.id || "local"}`,
        name: lp.name || lp.title || "Diagnóstico da Página",
        description: lp.hero?.subheadline || "",
        questions: lp.quiz.questions,
        settings: {
          headline: lp.quiz.title || lp.name || "Diagnóstico",
          description: lp.quiz.subtitle || lp.hero?.subheadline || "",
          buttonText: lp.hero?.ctaText || "Iniciar",
          thankYouMessage: lp.quiz.resultDescription || "Obrigado!",
        }
      });
      return;
    }

    setAssignedSurvey(undefined);
  }, [lp?.surveyId, (lp as any)?.config?.surveyId, (lp as any)?.minSurveyId, (lp as any)?.survey_id, lp?.quiz, surveys]);

  // Verifica se há parâmetros de pesquisa/cadastro na URL para abrir o fluxo do sistema
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const hasSurveyParam = searchParams ? (
    searchParams.get("survey") === "true" ||
    searchParams.get("cadastro") === "true" ||
    searchParams.get("register") === "true" ||
    searchParams.get("open_survey") === "true" ||
    searchParams.get("leads") === "true" ||
    searchParams.get("pesquisa") === "true" ||
    searchParams.get("acao") === "cadastro" ||
    searchParams.get("action") === "register" ||
    searchParams.get("acao") === "pesquisa" ||
    searchParams.get("form") === "true"
  ) : false;

  // Helper para formatar e mesclar parâmetros UTM na URL externa
  const buildRedirectUrl = (targetUrl: string, currentSearch: string) => {
    try {
      let raw = targetUrl.trim();
      if (!/^https?:\/\//i.test(raw)) {
        raw = `https://${raw}`;
      }
      const dest = new URL(raw);
      if (currentSearch) {
        const currentParams = new URLSearchParams(currentSearch);
        currentParams.forEach((val, key) => {
          if (!dest.searchParams.has(key)) {
            dest.searchParams.set(key, val);
          }
        });
      }
      return dest.toString();
    } catch {
      return targetUrl.startsWith("http") ? targetUrl : `https://${targetUrl}`;
    }
  };

  const hasAttachedSurvey = Boolean(lp?.surveyId || (lp as any)?.config?.surveyId || (lp as any)?.minSurveyId || (lp as any)?.survey_id || assignedSurvey);

  const isExternalLP = Boolean(
    lp?.externalUrl &&
    String(lp.externalUrl).trim() !== "" &&
    String(lp.externalUrl) !== "null" &&
    String(lp.externalUrl) !== "undefined" &&
    (lp.type === "URL Externa" || lp.template === "External" || lp.isExternal === true) &&
    !lp.hero
  );

  // Redirecionamento automático para LPs com URL externa APENAS se NÃO houver pesquisa vinculada e NÃO for ação de formulário
  useEffect(() => {
    if (isExternalLP && !hasAttachedSurvey && !hasSurveyParam && typeof window !== "undefined") {
      const finalUrl = buildRedirectUrl(lp.externalUrl, window.location.search);
      // Timeout gracioso para garantir registro da visita
      const timer = setTimeout(() => {
        window.location.replace(finalUrl);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isExternalLP, lp, hasAttachedSurvey, hasSurveyParam]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white font-bold gap-4">
        <div className="w-12 h-12 rounded-2xl bg-purple-600/20 text-purple-400 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
        <span className="text-xs text-zinc-400 font-medium">Carregando landing page...</span>
      </div>
    );
  }

  if (!lp) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 space-y-5 shadow-2xl relative overflow-hidden">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-zinc-800/80 border border-zinc-700/50 text-purple-400 flex items-center justify-center shadow-inner">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-bold text-zinc-100">Página Temporariamente Indisponível</h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              O link acessado não pôde ser carregado no momento ou o identificador <span className="text-purple-400 font-mono font-medium">"{id}"</span> foi modificado.
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") window.location.reload();
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-lg cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 rotate-90 sm:rotate-0" /> Tentar Novamente
            </button>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") window.history.back();
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 text-xs font-bold transition-all cursor-pointer"
            >
              Voltar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // CASO 1: LANDING PAGE EXTERNA (MODELO 1)
  // ============================================================================
  if (isExternalLP) {
    if (!hasAttachedSurvey && !hasSurveyParam) {
      // Caso 1A: Redirecionamento automático e limpo para evitar iframes/cortes
      return (
        <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white font-bold gap-6 p-6 text-center select-none relative overflow-hidden">
          <LPTrackingCapture />
          {/* Círculos abstratos de iluminação */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-1/4 left-1/3 w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

          <div className="relative z-10 space-y-6 max-w-md">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-xl relative">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-purple-500/20 to-blue-500/20 opacity-50" />
              <Globe className="h-9 w-9 text-purple-400 animate-pulse relative z-10" />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-zinc-950 flex items-center justify-center">
                <Loader2 className="h-2.5 w-2.5 animate-spin text-white" />
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] tracking-wider font-bold text-purple-400 uppercase">Acesso Autorizado</span>
              <h2 className="text-xl font-black text-zinc-100 tracking-tight">Redirecionando você...</h2>
              <p className="text-xs text-zinc-400 font-normal leading-relaxed max-w-xs mx-auto">
                Estamos levando você para o site oficial da página de destino com segurança.
              </p>
            </div>

            <div className="p-4 bg-zinc-900/50 border border-zinc-800/80 rounded-2xl space-y-1">
              <span className="text-[10px] text-zinc-500 block uppercase font-bold">Destino Oficial</span>
              <span className="text-xs text-zinc-300 font-medium truncate block max-w-[280px] mx-auto">
                {lp.name}
              </span>
            </div>

            <div className="pt-4 border-t border-zinc-900">
              <a
                href={lp.externalUrl}
                className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 underline font-normal transition-all"
              >
                Clique aqui para acessar diretamente se não redirecionar <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      );
    }

    // Caso 1B: Cadastro/Pesquisa Ativada (Se houver pesquisa vinculada, abre DeepFindSurveyViewer; se não houver, abre formulário direto de alta conversão)
    if (!assignedSurvey) {
      return (
        <div className="min-h-screen w-full relative flex flex-col bg-zinc-950 text-white selection:bg-purple-600/30">
          <LPTrackingCapture />
          {/* Efeitos visuais modernos ao fundo */}
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none -mr-40 -mt-40" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none -ml-40 -mb-40" />

          <div className="max-w-xl mx-auto w-full p-4 md:p-8 flex-1 flex flex-col justify-center relative z-10">
            <DirectExternalLeadForm 
              lp={lp} 
              pipelines={pipelines} 
              onComplete={() => {
                toast.success("✅ Inscrição realizada com sucesso!");
              }}
            />
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen w-full relative flex flex-col bg-zinc-950 text-white selection:bg-purple-600/30">
        <LPTrackingCapture />
        
        {/* Efeitos visuais modernos ao fundo */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-600/5 rounded-full blur-[140px] pointer-events-none -mr-40 -mt-40" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none -ml-40 -mb-40" />

        <div className="max-w-4xl mx-auto w-full p-4 md:p-8 flex-1 flex flex-col justify-center relative z-10">
          <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Inscrição & Diagnóstico</span>
                </div>
                <h1 className="text-base font-extrabold text-zinc-100 truncate max-w-sm sm:max-w-md">{lp.name}</h1>
              </div>
              <div>
                <a
                  href={lp.externalUrl}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-all border border-zinc-700/50 hover:border-zinc-600"
                >
                  <span>Ir para o Site Oficial</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            <div className="rounded-2xl overflow-hidden bg-zinc-950/40 border border-zinc-800/80 p-1">
              <Suspense
                fallback={
                  <div className="py-12 flex items-center justify-center text-zinc-400">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                }
              >
                <DeepFindSurveyViewer
                  survey={assignedSurvey}
                onComplete={async (answers, score, contactInfo) => {
                  const tracking = getStoredTracking();
                  const { source, utm } = parseUtm(typeof window !== "undefined" ? window.location.search : "");
                  const defaultPipeline = pipelines.find((p) => p.name?.toUpperCase().includes("PROSPECÇÃO")) || pipelines[0];
                  const effectiveSource = source || utm?.utm_source || "direct";

                  const leadName = contactInfo?.name || "Lead Capturado (Pesquisa)";
                  const leadEmail = contactInfo?.email || "";
                  const leadWhatsapp = contactInfo?.whatsapp || "";

                  // Verifica se o lead já foi cadastrado anteriormente ou se já é cliente
                  let isCustomer = false;
                  let priorVisits = 0;
                  try {
                    const cleanPhone = (leadWhatsapp || "").replace(/\D/g, "");
                    const normEmail = (leadEmail || "").trim().toLowerCase();
                    const allPrior = (leads as any[]) || [];
                    
                    const match = allPrior.find((x: any) => {
                      if (normEmail && x.email && x.email.trim().toLowerCase() === normEmail) return true;
                      if (cleanPhone && x.whatsapp && x.whatsapp.replace(/\D/g, "") === cleanPhone) return true;
                      return false;
                    });

                    if (match) {
                      priorVisits = Number(match.lpVisits || match.metadata?.lpVisits || 1);
                      if (match.stage === "Ganho" || match.stage === "Recebimento" || match.classification === "Cliente" || match.isCustomer) {
                        isCustomer = true;
                      }
                    }
                  } catch {}

                  const totalLpVisits = priorVisits + 1;
                  const isRecurring = isCustomer || totalLpVisits > 1;

                  const tags = [effectiveSource, utm?.utm_campaign || "inbound", "comet-lp", "pesquisa-externa"].filter(Boolean);
                  if (isCustomer) tags.push("cliente");
                  if (isRecurring) tags.push("recorrência");
                  if (lp.status === "Teste") tags.push("leadtest", "modo-teste");

                  const leadRecord = {
                    name: leadName,
                    email: leadEmail,
                    whatsapp: leadWhatsapp,
                    company: "",
                    source: effectiveSource,
                    landing_page: lp.name || lp.title || lp.id,
                    product_id: lp.productId || null,
                    pipeline_id: defaultPipeline?.id || null,
                    stage: "Leads",
                    classification: lp.status === "Teste" ? "Lead Teste" : (isCustomer ? "Cliente" : "Lead"),
                    temperature: "Quente",
                    type: isRecurring ? "Recorrente" : "Inbound",
                    tags,
                    lpVisits: totalLpVisits,
                    isCustomer,
                    isRecurring,
                    isTest: lp.status === "Teste",
                    metadata: {
                      capturedVia: "COMET External Survey Link Engine",
                      source: effectiveSource,
                      utm,
                      answers: answers || {},
                      tracking,
                      pageTitle: lp.name || lp.title,
                      capturedAt: new Date().toISOString(),
                      lpVisits: totalLpVisits,
                      isCustomer,
                      isRecurring,
                      isTest: lp.status === "Teste",
                    },
                  };

                  // 1. Grava diretamente no Google Sheets / Drive + RAM (sem duplicar chamadas LockService)
                  cloudStore.mutate(
                    (draft) => {
                      const newLead = {
                        id: `lead_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                        ...leadRecord,
                        createdAt: new Date().toISOString(),
                      };
                      draft.leads = [newLead, ...(draft.leads || [])];
                    },
                    { skipPush: true }
                  );

                  Promise.allSettled([
                    submitLpLeadToDrive({
                      landingPageId: lp.id,
                      landingPageTitle: lp.name || lp.title || "Landing Page",
                      name: leadName,
                      email: leadEmail,
                      whatsapp: leadWhatsapp,
                      company: `${leadName} (LP: ${lp.name || lp.title})`,
                      source: effectiveSource,
                      utm,
                      answers: answers || {},
                      isTest: lp.status === "Teste",
                    }),
                    fetch("/api/surveys/responses", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        surveyId: assignedSurvey?.id || lp.surveyId,
                        leadForm: {
                          name: leadName,
                          whatsapp: leadWhatsapp,
                          email: leadEmail,
                        },
                        answers,
                        duration: 0,
                        extraPayload: {
                          landingPageId: lp.id,
                          pageTitle: lp.name || lp.title,
                        },
                        tracking: {
                          source: effectiveSource,
                          utm,
                        },
                      }),
                    }),
                    fetch(`/api/landing-pages/${encodeURIComponent(lp.id)}/conversion`, {
                      method: "POST",
                    }),
                  ]).catch((dbErr) => {
                    console.warn("Background lead submission notice:", dbErr);
                  });

                  toast.success("✅ Cadastro e respostas enviadas com sucesso!");
                }}
              />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // CASO 2: MOTOR COMET DE ALTA CONVERSÃO (CRO COM GRAVAÇÃO INTEGRADA DE LEADS)
  // ============================================================================
  const cometPage = ensureCometLP(lp);

  return (
    <div className={cn("min-h-screen w-full relative", cometPage.theme === "dark" ? "bg-zinc-950 text-white" : "bg-white text-zinc-900")}>
      <LPTrackingCapture />

      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-purple-500" />
          </div>
        }
      >
        <LandingPageRenderer
          page={cometPage}
          assignedSurvey={assignedSurvey}
        onLeadSubmit={async (lead) => {
          const tracking = getStoredTracking();
          const { source, utm } = parseUtm(typeof window !== "undefined" ? window.location.search : "");
          const defaultPipeline = pipelines.find((p) => p.name?.toUpperCase().includes("PROSPECÇÃO")) || pipelines[0];

          const effectiveSource = source || utm?.utm_source || "direct";

          // Verifica se o lead já foi cadastrado anteriormente ou se já é cliente (para sabermos que é recorrência)
          let isCustomer = false;
          let priorVisits = 0;
          try {
            const cleanPhone = (lead.whatsapp || "").replace(/\D/g, "");
            const normEmail = (lead.email || "").trim().toLowerCase();
            const allPrior = (leads as any[]) || [];
            
            const match = allPrior.find((x: any) => {
              if (normEmail && x.email && x.email.trim().toLowerCase() === normEmail) return true;
              if (cleanPhone && x.whatsapp && x.whatsapp.replace(/\D/g, "") === cleanPhone) return true;
              return false;
            });

            if (match) {
              priorVisits = Number(match.lpVisits || match.metadata?.lpVisits || 1);
              if (match.stage === "Ganho" || match.stage === "Recebimento" || match.classification === "Cliente" || match.isCustomer) {
                isCustomer = true;
              }
            }
          } catch {}

          const totalLpVisits = priorVisits + 1;
          const isRecurring = isCustomer || totalLpVisits > 1;

          const tags = [effectiveSource, utm?.utm_campaign || "inbound", "comet-lp"].filter(Boolean);
          if (isCustomer) tags.push("cliente");
          if (isRecurring) tags.push("recorrência");
          if (lp.status === "Teste") tags.push("leadtest", "modo-teste");

          const linkedProductIds = lp.productIds && lp.productIds.length > 0 ? lp.productIds : (lp.productId ? [lp.productId] : []);
          const primaryProductId = linkedProductIds[0] || null;
          const totalDealValue = linkedProductIds.reduce((sum, id) => {
            const p = products.find(prod => prod.id === id);
            return sum + (p ? Number(p.salePrice || 0) : 0);
          }, 0);

          const leadRecord = {
            name: lead.name || "Lead Capturado",
            email: lead.email || "",
            whatsapp: lead.whatsapp || "",
            company: lead.company || `${lead.name || "Lead"} (LP: ${lp.name || lp.title})`,
            source: effectiveSource,
            landing_page: lp.name || lp.title || lp.id,
            product_id: primaryProductId,
            value: totalDealValue,
            pipeline_id: defaultPipeline?.id || null,
            stage: "Leads",
            classification: lp.status === "Teste" ? "Lead Teste" : (isCustomer ? "Cliente" : "Lead"),
            temperature: "Quente",
            type: isRecurring ? "Recorrente" : "Inbound",
            tags,
            lpVisits: totalLpVisits,
            isCustomer,
            isRecurring,
            isTest: lp.status === "Teste",
            metadata: {
              capturedVia: "COMET High-Conversion Engine",
              source: effectiveSource,
              utm,
              answers: lead.quizAnswers || {},
              tracking,
              pageTitle: lp.name || lp.title,
              capturedAt: new Date().toISOString(),
              lpVisits: totalLpVisits,
              isCustomer,
              isRecurring,
              isTest: lp.status === "Teste",
            },
          };

          // 1. Grava diretamente no banco de dados do sistema (Express / Arquivo do Banco de Dados de Leads)
          try {
            await fetch("/api/submit-lead", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                pageId: lp.id,
                pageTitle: lp.name || lp.title,
                name: lead.name,
                whatsapp: lead.whatsapp,
                email: lead.email,
                quizAnswers: lead.quizAnswers,
                utms: utm,
                source: effectiveSource,
                webhookUrl: (cometPage as any).settings?.webhookUrl,
                isTest: lp.status === "Teste",
              }),
            });
          } catch (dbErr) {
            console.warn("Direct database submit notice:", dbErr);
          }

          // Persistência imediata no cloudStore (RAM + Push imediato Apps Script/Sheets)
          if (typeof window !== "undefined") {
            try {
              const fullLeadRecord = {
                id: `lead_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                ...leadRecord,
                createdAt: new Date().toISOString(),
                activities: [
                  {
                    id: `act_${Date.now()}`,
                    type: "conversion",
                    description: `Capturado via Landing Page ${lp.name || lp.title}`,
                    timestamp: new Date().toISOString(),
                  }
                ],
              };

              cloudStore.mutate(
                (draft) => {
                  draft.leads = [fullLeadRecord, ...(draft.leads || []).filter((x: any) => x.id !== fullLeadRecord.id)];
                  draft.landingPages = (draft.landingPages || []).map((p: any) =>
                    p && (p.id === lp.id || (lp.slug && p.slug === lp.slug))
                      ? { ...p, leads: (Number(p.leads || p.leads_count) || 0) + 1 }
                      : p
                  );
                },
                { skipPush: true }
              );

              window.dispatchEvent(new CustomEvent("lead-submitted", { detail: fullLeadRecord }));
            } catch (storageErr) {
              console.warn("Cloud persistence notice in LP submit:", storageErr);
            }
          }

          // 2. Gravação atômica única no Google Apps Script / Sheets (SUBMIT_LP_LEAD) + webhook Express
          fetch(`/api/landing-pages/${encodeURIComponent(lp.id)}/conversion`, {
            method: "POST",
          }).catch(() => {});

          submitLpLeadToDrive({
            landingPageId: lp.id,
            landingPageTitle: lp.name || lp.title || "Landing Page",
            name: lead.name || "",
            email: lead.email || "",
            whatsapp: lead.whatsapp || "",
            company: lead.company || `${lead.name || "Lead"} (LP: ${lp.name || lp.title})`,
            source: effectiveSource,
            utm,
            answers: lead.quizAnswers || {},
            isTest: lp.status === "Teste",
          })
            .then(() => cloudStore.pullNow(false).catch(() => {}))
            .catch((gErr) => console.warn("Google Drive background sync notice:", gErr));

          // 5. Notifica Analytics de Conversão da LP
          try {
            getLPModule().analytics.track({
              lpId: lp.id,
              slug: lp.slug || lp.id,
              type: "conversion" as any,
              source: effectiveSource,
              utm,
              leadId: leadRecord.name,
            } as any);
          } catch {}

          toast.success("✅ Dados enviados com sucesso! Entraremos em contato em breve.");
        }}
      />
      </Suspense>
    </div>
  );
}

// ============================================================================
// COMPONENTE DE FORMULÁRIO DIRETO DE ALTA CONVERSÃO (LPS EXTERNAS / BRIDGE)
// ============================================================================
interface DirectExternalLeadFormProps {
  lp: any;
  pipelines: any[];
  onComplete: () => void;
}

function DirectExternalLeadForm({ lp, pipelines, onComplete }: DirectExternalLeadFormProps) {
  const leads = cloudStore.getState().leads || [];
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Formatação em tempo real do telefone/whatsapp
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, "");
    if (v.length > 11) v = v.substring(0, 11);
    if (v.length > 10) {
      v = v.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
    } else if (v.length > 6) {
      v = v.replace(/^(\d{2})(\d{4})(\d{0,4})$/, "($1) $2-$3");
    } else if (v.length > 2) {
      v = v.replace(/^(\d{2})(\d{0,5})$/, "($1) $2");
    }
    setWhatsapp(v);
  };

  const { source, utm } = parseUtm(typeof window !== "undefined" ? window.location.search : "");
  const tracking = getStoredTracking();
  const effectiveSource = source || utm?.utm_source || "direct";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Por favor, preencha o seu nome completo.");
      return;
    }
    const cleanPhone = whatsapp.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      toast.error("Por favor, informe um WhatsApp válido com DDD.");
      return;
    }

    setIsSubmitting(true);

    try {
      const defaultPipeline = pipelines.find((p) => p.name?.toUpperCase().includes("PROSPECÇÃO")) || pipelines[0];

      // Checa se o lead já existia anteriormente diretamente no banco de dados
      let isCustomer = false;
      let priorVisits = 0;
      try {
        const normEmail = email.trim().toLowerCase();
        const allPrior = (leads as any[]) || [];
        
        const match = allPrior.find((x: any) => {
          if (normEmail && x.email && x.email.trim().toLowerCase() === normEmail) return true;
          if (cleanPhone && x.whatsapp && x.whatsapp.replace(/\D/g, "") === cleanPhone) return true;
          return false;
        });

        if (match) {
          priorVisits = Number(match.lpVisits || match.metadata?.lpVisits || 1);
          if (match.stage === "Ganho" || match.stage === "Recebimento" || match.classification === "Cliente" || match.isCustomer) {
            isCustomer = true;
          }
        }
      } catch {}

      const totalLpVisits = priorVisits + 1;
      const isRecurring = isCustomer || totalLpVisits > 1;

      const tags = [
        effectiveSource, 
        utm?.utm_campaign ? `campanha:${utm.utm_campaign}` : null,
        "comet-lp", 
        "lp-externa", 
        "cadastro-direto"
      ].filter(Boolean) as string[];

      if (isCustomer) tags.push("cliente");
      if (isRecurring) tags.push("recorrência");
      if (lp.status === "Teste") tags.push("leadtest", "modo-teste");

      const leadRecord = {
        name: name.trim(),
        email: email.trim(),
        whatsapp: whatsapp.trim(),
        company: notes.trim() || `${name.trim()} (LP: ${lp.name || lp.title})`,
        source: effectiveSource,
        landing_page: lp.name || lp.title || lp.id,
        product_id: lp.productId || null,
        pipeline_id: defaultPipeline?.id || null,
        stage: "Leads",
        classification: lp.status === "Teste" ? "Lead Teste" : (isCustomer ? "Cliente" : "Lead"),
        temperature: "Quente",
        type: isRecurring ? "Recorrente" : "Inbound",
        tags,
        lpVisits: totalLpVisits,
        isCustomer,
        isRecurring,
        isTest: lp.status === "Teste",
        metadata: {
          capturedVia: "COMET Direct Bridge Lead Form",
          source: effectiveSource,
          utm,
          tracking,
          notes: notes.trim(),
          pageTitle: lp.name || lp.title,
          capturedAt: new Date().toISOString(),
          lpVisits: totalLpVisits,
          isCustomer,
          isRecurring,
          isTest: lp.status === "Teste",
        },
      };

      // 1. Grava diretamente no banco de dados do sistema (Express / API)
      try {
        await fetch("/api/submit-lead", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pageId: lp.id,
            pageTitle: lp.name || lp.title,
            name: name.trim(),
            whatsapp: whatsapp.trim(),
            email: email.trim(),
            quizAnswers: { observacoes: notes.trim() },
            utms: utm,
            source: effectiveSource,
            isTest: lp.status === "Teste",
          }),
        });

        fetch(`/api/landing-pages/${encodeURIComponent(lp.id)}/conversion`, {
          method: "POST",
        }).catch(() => {});
      } catch (dbErr) {
        console.warn("Direct database submit notice:", dbErr);
      }

      // Persistência imediata no cloudStore (RAM + Push imediato Apps Script/Sheets)
      if (typeof window !== "undefined") {
        try {
          const fullLeadRecord = {
            id: `lead_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            ...leadRecord,
            createdAt: new Date().toISOString(),
            activities: [
              {
                id: `act_${Date.now()}`,
                type: "conversion",
                description: `Capturado via formulário bridge na LP ${lp.name || lp.title}`,
                timestamp: new Date().toISOString(),
              }
            ],
          };

          cloudStore.mutate(
            (draft) => {
              draft.leads = [fullLeadRecord, ...(draft.leads || []).filter((x: any) => x.id !== fullLeadRecord.id)];
              draft.landingPages = (draft.landingPages || []).map((p: any) =>
                p && (p.id === lp.id || (lp.slug && p.slug === lp.slug))
                  ? { ...p, leads: (Number(p.leads || p.leads_count) || 0) + 1 }
                  : p
              );
            },
            { skipPush: true }
          );

          window.dispatchEvent(new CustomEvent("lead-submitted", { detail: fullLeadRecord }));
        } catch (storageErr) {
          console.warn("Cloud persistence notice in Direct form submit:", storageErr);
        }
      }

      // 2. Gravação atômica única no Google Apps Script / Google Sheets
      submitLpLeadToDrive({
        landingPageId: lp.id,
        landingPageTitle: lp.name || lp.title || "Landing Page",
        name: name.trim(),
        email: email.trim(),
        whatsapp: whatsapp.trim(),
        company: notes.trim() || `${name.trim()} (LP: ${lp.name || lp.title})`,
        source: effectiveSource,
        utm,
        answers: { observacoes: notes.trim() },
        isTest: lp.status === "Teste",
      })
        .then(() => cloudStore.pullNow(false).catch(() => {}))
        .catch((gErr) => {
          console.warn("Google Drive direct sync notice:", gErr);
        });

      // 3. Analytics
      try {
        getLPModule().analytics.track({
          lpId: lp.id,
          slug: lp.slug || lp.id,
          type: "conversion" as any,
          source: effectiveSource,
          utm,
          leadId: leadRecord.name,
        } as any);
      } catch {}

      setIsSubmitted(true);
      onComplete();
    } catch (err) {
      console.error("Erro ao enviar lead:", err);
      toast.error("Ocorreu um erro ao salvar o cadastro. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    const safeName = name ? String(name) : "Visitante";
    const safePhone = whatsapp ? String(whatsapp) : "";
    const safeCleanPhone = safePhone.replace(/\D/g, "");
    const safeEmail = email ? String(email) : "";
    const safeSource = effectiveSource ? String(effectiveSource) : "Direto";

    return (
      <div className="bg-zinc-900/70 backdrop-blur-xl border border-zinc-800 rounded-3xl p-8 md:p-10 shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-300">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/10">
          <CheckCircle2 className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            Inscrição Confirmada
          </span>
          <h2 className="text-2xl font-black text-zinc-100 tracking-tight">Obrigado, {safeName.split(" ")[0]}!</h2>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
            Seus dados foram recebidos com sucesso. Nossa equipe entrará em contato via WhatsApp em breve.
          </p>
        </div>

        <div className="p-4 bg-zinc-950/50 border border-zinc-800/80 rounded-2xl text-left space-y-2 text-xs">
          <div className="flex items-center justify-between text-zinc-400">
            <span>WhatsApp Cadastrado:</span>
            <span className="font-semibold text-zinc-200">{safePhone}</span>
          </div>
          {safeEmail && (
            <div className="flex items-center justify-between text-zinc-400">
              <span>E-mail:</span>
              <span className="font-semibold text-zinc-200 truncate max-w-[200px]">{safeEmail}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-zinc-400 pt-1 border-t border-zinc-800/60">
            <span>Origem:</span>
            <span className="font-bold text-purple-400 capitalize">{safeSource}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <a
            href={`https://wa.me/55${safeCleanPhone}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-600/20 cursor-pointer"
          >
            <MessageCircle className="h-4 w-4" />
            <span>Falar no WhatsApp</span>
          </a>

          {lp?.externalUrl && (
            <a
              href={lp.externalUrl}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-all border border-zinc-700/50"
            >
              <span>Voltar ao Site Oficial</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/70 backdrop-blur-xl border border-zinc-800 rounded-3xl p-6 sm:p-8 md:p-10 shadow-2xl space-y-6">
      
      {/* Header do Formulário */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              Cadastro de Interesse
            </span>
            {effectiveSource && effectiveSource !== "direct" && (
              <span className="text-[9px] font-bold text-purple-300 bg-purple-950/80 border border-purple-800 px-2 py-0.5 rounded-full capitalize">
                Via {effectiveSource}
              </span>
            )}
          </div>
          <h1 className="text-lg sm:text-xl font-black text-zinc-100 tracking-tight">
            {lp.name || "Preencha seus dados para continuar"}
          </h1>
          <p className="text-xs text-zinc-400">
            Cadastre-se para receber atendimento exclusivo e materiais complementares.
          </p>
        </div>

        {lp.externalUrl && (
          <a
            href={lp.externalUrl}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-all border border-zinc-700/50 shrink-0 self-start sm:self-center"
          >
            <span>Ver Site</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      {/* Inputs */}
      <form onSubmit={handleSubmit} className="space-y-4">
        
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-purple-400" /> Nome Completo
            </span>
            <span className="text-[10px] text-purple-400 font-semibold">Obrigatório</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: João da Silva"
            className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 rounded-xl px-4 py-3 text-xs text-zinc-100 placeholder:text-zinc-600 outline-none transition-colors shadow-inner"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-purple-400" /> WhatsApp com DDD
            </span>
            <span className="text-[10px] text-purple-400 font-semibold">Obrigatório</span>
          </label>
          <input
            type="tel"
            required
            value={whatsapp}
            onChange={handlePhoneChange}
            placeholder="(11) 99999-9999"
            className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 rounded-xl px-4 py-3 text-xs text-zinc-100 placeholder:text-zinc-600 outline-none transition-colors shadow-inner font-mono"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5 text-purple-400" /> E-mail (Opcional)
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="joao@empresa.com.br"
            className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 rounded-xl px-4 py-3 text-xs text-zinc-100 placeholder:text-zinc-600 outline-none transition-colors shadow-inner"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-purple-400" /> Empresa ou Mensagem (Opcional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex: Tenho interesse em consultoria"
            className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 rounded-xl px-4 py-3 text-xs text-zinc-100 placeholder:text-zinc-600 outline-none transition-colors shadow-inner"
          />
        </div>

        {/* Botão de Envio */}
        <div className="pt-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-purple-600/25 hover:shadow-purple-600/40 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Processando Inscrição...</span>
              </>
            ) : (
              <>
                <span>Enviar Cadastro</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>

        <div className="flex items-center justify-center gap-2 text-[10px] text-zinc-500 pt-2">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          <span>Seus dados estão protegidos e não enviamos spam.</span>
        </div>
      </form>

    </div>
  );
}
