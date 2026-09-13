"use client";

import { createFileRoute, useParams } from "@tanstack/react-router";
import { useData, getDeletedLandingPageIds, getInitialAILandingPages, mapLeadToDb } from "@/hooks/use-data";
import { useState, useEffect, useRef } from "react";
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
import { supabase } from "@/integrations/supabase/client";

import { LandingPageRenderer } from "@/components/marketing/comet-lp/components/LandingPageRenderer";
import { DeepFindSurveyViewer } from "@/components/marketing/deepfind-survey-viewer";
import { ensureCometLP } from "@/components/marketing/comet-lp/utils/cometAdapter";
import { recordLocalLead, fetchPageFromServerPreview } from "@/components/marketing/comet-lp/utils/storage";
import { LPTrackingCapture, getStoredTracking } from "@/components/marketing/lp-tracking-capture";
import { PublicRenderer } from "@/modules/landing-pages/renderer/PublicRenderer";
import { getLPModule, parseUtm } from "@/modules/landing-pages";
import { PRESET_TEMPLATES } from "@/components/marketing/comet-lp/data/templates";
import { submitLpLeadToDrive } from "@/services/googleDriveDatabaseService";

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

function PublicLPPage() {
  const { id } = useParams({ from: "/lp/$id" });
  const { products, pipelines, surveys } = useData();

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

      const deletedIds = new Set(getDeletedLandingPageIds());
      if (deletedIds.has(id)) {
        if (isMounted) {
          setLp(null);
          setLoading(false);
        }
        return;
      }

      const normId = normalizeSlug(id);

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
            return {
              ...base,
              visits: newVisits,
              viewsCount: newVisits,
              views_count: newVisits,
              conv: Math.round((leads / newVisits) * 100)
            };
          });
        }

        // 2. Atualiza LocalStorage em todas as chaves de Landing Page do sistema
        if (typeof window !== "undefined") {
          try {
            const localKeys = ["comet_local_landing_pages", "people_cro_landing_pages_v1", "app:lps:v1"];
            for (const key of localKeys) {
              const raw = localStorage.getItem(key);
              if (raw) {
                const list = JSON.parse(raw);
                if (Array.isArray(list)) {
                  const updatedList = list.map((p: any) => {
                    if (p && (p.id === targetLp.id || p.id === id || p.slug === targetLp.slug || p.slug === id)) {
                      const leads = Number(p.leads || p.leads_count) || 0;
                      return {
                        ...p,
                        visits: newVisits,
                        viewsCount: newVisits,
                        views_count: newVisits,
                        conv: Math.round((leads / newVisits) * 100),
                        updated_at: new Date().toISOString()
                      };
                    }
                    return p;
                  });
                  localStorage.setItem(key, JSON.stringify(updatedList));
                }
              }
            }

            const activePrev = localStorage.getItem("active_preview_page");
            if (activePrev) {
              const parsed = JSON.parse(activePrev);
              if (parsed && (parsed.id === targetLp.id || parsed.id === id || parsed.slug === targetLp.slug || parsed.slug === id)) {
                const leads = Number(parsed.leads || parsed.leads_count) || 0;
                localStorage.setItem("active_preview_page", JSON.stringify({
                  ...parsed,
                  visits: newVisits,
                  viewsCount: newVisits,
                  views_count: newVisits,
                  conv: Math.round((leads / newVisits) * 100)
                }));
              }
            }

            window.dispatchEvent(new Event("storage"));
            window.dispatchEvent(new CustomEvent("lp_visit_incremented", { detail: { id: targetId, visits: newVisits } }));
          } catch (lsErr) {
            console.warn("Aviso ao atualizar visitas no LocalStorage:", lsErr);
          }
        }

        // 3. Notifica o Servidor Express (API do Backend)
        try {
          fetch(`/api/landing-pages/${encodeURIComponent(targetId)}/visit`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lpId: targetLp.id, id, slug: targetLp.slug })
          }).catch(() => {});
        } catch {}

        // 4. Atualiza no Supabase (Banco de dados remoto)
        try {
          if (isUUID(targetLp.id)) {
            await supabase.from("landing_pages").update({ visits: newVisits }).eq("id", targetLp.id);
          } else if (targetLp.name || targetLp.title) {
            const pageName = targetLp.name || targetLp.title;
            const { data: sbRow } = await supabase.from("landing_pages").select("id, visits").eq("name", pageName).maybeSingle();
            if (sbRow?.id) {
              const curV = Number(sbRow.visits) || 0;
              await supabase.from("landing_pages").update({ visits: curV + 1 }).eq("id", sbRow.id);
            }
          }
        } catch (vErr) {
          console.warn("Aviso ao incrementar visitas no Supabase:", vErr);
        }

        // 5. Registra evento de Analytics
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

      try {
        // =====================================================================
        // PASSO 1: BUSCA NO SERVIDOR EXPRESS / API (PERSISTENTE E EM MEMÓRIA)
        // =====================================================================
        try {
          const serverPage = await fetchPageFromServerPreview(id);
          if (serverPage && !deletedIds.has(serverPage.id) && isMounted) {
            setLp(serverPage);
            setLoading(false);
            await recordVisitForLP(serverPage);
            return;
          }
        } catch (srvErr) {
          console.info("Server fetch notice:", srvErr);
        }

        // =====================================================================
        // PASSO 2: BUSCA NO SUPABASE (BANCO DE DADOS REMOTO)
        // =====================================================================
        let foundData: any = null;

        // 2.1 Se o ID for UUID válido, busca direto por ID
        if (isUUID(id)) {
          const { data, error } = await supabase
            .from("landing_pages")
            .select("*")
            .eq("id", id)
            .maybeSingle();

          if (data && !error && !deletedIds.has(data.id)) {
            foundData = data;
          }
        }

        // 2.2 Se não encontrou por UUID ou o parâmetro for slug/nome, busca no JSONB config ou coluna name
        if (!foundData) {
          try {
            const { data: byQuery } = await supabase
              .from("landing_pages")
              .select("*")
              .or(`config->>slug.eq.${id},config->>client_id.eq.${id},name.eq.${id}`)
              .limit(1);

            if (byQuery && byQuery.length > 0) {
              const candidate = byQuery[0];
              if (!deletedIds.has(candidate.id)) {
                foundData = candidate;
              }
            }
          } catch (e) {
            console.warn("Supabase query por slug/name notice:", e);
          }
        }

        // 2.3 Se ainda não encontrou, busca em lista para correspondência flexível
        if (!foundData) {
          try {
            const { data: allRows } = await supabase.from("landing_pages").select("*").limit(50);
            if (allRows && allRows.length > 0) {
              const match = allRows.find((p) => {
                if (deletedIds.has(p.id)) return false;
                if (p.id === id) return true;
                if (p.config?.slug === id || (p.config?.slug && normalizeSlug(p.config.slug) === normId)) return true;
                if (p.config?.client_id === id) return true;
                if (p.name && (p.name === id || normalizeSlug(p.name) === normId)) return true;
                return false;
              });
              if (match) foundData = match;
            }
          } catch {}
        }

        if (foundData) {
          const mappedLP = {
            id: foundData.id,
            name: foundData.name,
            title: foundData.name,
            template: foundData.template,
            status: foundData.status,
            visits: Number(foundData.visits) || 0,
            leads: Number(foundData.leads || foundData.leads_count) || 0,
            ...(typeof foundData.config === "object" ? foundData.config : {}),
            surveyId: foundData.config?.surveyId || foundData.survey_id || undefined,
            externalUrl: foundData.config?.externalUrl || foundData.external_url || undefined,
          };

          if (isMounted) {
            setLp(mappedLP);
            setLoading(false);
          }

          await recordVisitForLP(mappedLP);
          return;
        }

        // =====================================================================
        // PASSO 3: BUSCA NO ARMAZENAMENTO LOCAL (SE FOR ACESSADO NA MESMA SESSÃO)
        // =====================================================================
        try {
          const localKeys = ["active_preview_page", "people_cro_landing_pages_v1", "comet_local_landing_pages", "app:lps:v1"];
          for (const key of localKeys) {
            const rawLocal = localStorage.getItem(key);
            if (!rawLocal) continue;

            let parsed = JSON.parse(rawLocal);
            if (!parsed) continue;

            if (!Array.isArray(parsed)) {
              parsed = [parsed];
            }

            if (Array.isArray(parsed)) {
              const localMatch = parsed.find((p: any) => {
                if (!p) return false;
                if (deletedIds.has(p.id) || deletedIds.has(p.slug)) return false;
                if (p.id === id || p.slug === id || p.previewToken === id) return true;
                if (p.name && normalizeSlug(p.name) === normId) return true;
                if (p.title && normalizeSlug(p.title) === normId) return true;
                return false;
              });

              if (localMatch && isMounted) {
                setLp(localMatch);
                setLoading(false);
                await recordVisitForLP(localMatch);
                return;
              }
            }
          }
        } catch {}

        // =====================================================================
        // PASSO 4: RESOLUÇÃO EM TEMPLATES PRÉ-CONFIGURADOS (PRESETS & AI LPs)
        // =====================================================================
        const presetMatch = PRESET_TEMPLATES.find((p) => {
          if (p.id === id || p.slug === id) return true;
          if (normalizeSlug(p.id) === normId || normalizeSlug(p.title) === normId) return true;
          return false;
        });

        if (presetMatch && isMounted) {
          setLp(presetMatch);
          setLoading(false);
          await recordVisitForLP(presetMatch);

          // Sincroniza em segundo plano no Supabase se ainda não existir
          try {
            const dbPayload = {
              name: presetMatch.title,
              template: (presetMatch as any).template || "COMET",
              status: "Ativa",
              config: { ...presetMatch, slug: presetMatch.slug || id },
            };
            (supabase.from("landing_pages").insert([dbPayload]) as any);
          } catch {}
          return;
        }

        const aiTemplates = getInitialAILandingPages();
        const aiMatch = aiTemplates.find((p) => {
          if (p.id === id || p.slug === id) return true;
          if (normalizeSlug(p.id) === normId || normalizeSlug(p.title || p.name) === normId) return true;
          return false;
        });

        if (aiMatch && isMounted) {
          setLp(aiMatch);
          setLoading(false);
          await recordVisitForLP(aiMatch);
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

    return () => {
      isMounted = false;
    };
  }, [id]);

  // Carrega a pesquisa vinculada se houver surveyId ou atribui a pesquisa de qualificação padrão
  useEffect(() => {
    const surveyId = lp?.surveyId || (lp as any)?.config?.surveyId || (lp as any)?.minSurveyId || (lp as any)?.survey_id;
    if (!surveyId) {
      if (surveys && surveys.length > 0) {
        setAssignedSurvey(surveys[0]);
      } else if (SURVEY_PRESETS && SURVEY_PRESETS.length > 0) {
        setAssignedSurvey({
          ...SURVEY_PRESETS[0],
          status: "active",
          settings: {
            headline: SURVEY_PRESETS[0].name,
            description: SURVEY_PRESETS[0].description,
            buttonText: "Iniciar Diagnóstico",
            thankYouMessage: "Obrigado por responder nosso diagnóstico!",
            accentColor: SURVEY_PRESETS[0].accentColor || "#FF6B00",
          },
        });
      }
      return;
    }

    // 1. Procura no array local primeiro
    const foundInLocal = surveys.find((s) => s.id === surveyId);
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

    // 3. Procura no localStorage de surveys
    try {
      const rawStored = localStorage.getItem("surveys");
      if (rawStored) {
        const parsed = JSON.parse(rawStored);
        if (Array.isArray(parsed)) {
          const match = parsed.find((s: any) => s.id === surveyId);
          if (match) {
            setAssignedSurvey(match);
            return;
          }
        }
      }
    } catch {}

    // 4. Busca na API Express (/api/surveys/:id)
    fetch(`/api/surveys/${encodeURIComponent(surveyId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.survey) {
          setAssignedSurvey(data.survey);
        }
      })
      .catch(() => {});

    // 5. Busca no Supabase
    (supabase
      .from("surveys")
      .select("*")
      .eq("id", surveyId)
      .maybeSingle() as any)
      ?.then(({ data }: any) => {
        if (data) setAssignedSurvey(data);
      });
  }, [lp?.surveyId, (lp as any)?.config?.surveyId, (lp as any)?.minSurveyId, (lp as any)?.survey_id, surveys]);

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

  // Redirecionamento automático para LPs com URL externa APENAS se NÃO houver pesquisa vinculada e NÃO for ação de formulário
  useEffect(() => {
    if (lp?.externalUrl && !hasAttachedSurvey && !hasSurveyParam && typeof window !== "undefined") {
      const finalUrl = buildRedirectUrl(lp.externalUrl, window.location.search);
      // Timeout gracioso para garantir registro da visita
      const timer = setTimeout(() => {
        window.location.replace(finalUrl);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [lp, hasAttachedSurvey, hasSurveyParam]);

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
  if (lp.externalUrl) {
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
                    const rawL = localStorage.getItem("comet_local_leads") || "[]";
                    const rawQ = localStorage.getItem("comet_inbound_leads_queue") || "[]";
                    const allPrior = [...JSON.parse(rawL), ...JSON.parse(rawQ)];
                    
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
                    classification: isCustomer ? "Cliente" : "Lead",
                    temperature: "Quente",
                    type: isRecurring ? "Recorrente" : "Inbound",
                    tags,
                    lpVisits: totalLpVisits,
                    isCustomer,
                    isRecurring,
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
                    },
                  };

                  // 1. Salva localmente para compatibilidade offline / instantânea
                  try {
                    recordLocalLead({
                      id: `lead_${Date.now()}`,
                      pageId: lp.id,
                      pageTitle: lp.name || lp.title || "Landing Page",
                      name: leadName,
                      whatsapp: leadWhatsapp,
                      email: leadEmail,
                      quizAnswers: answers || {},
                      utms: (utm as Record<string, string>) || {},
                      submittedAt: new Date().toISOString(),
                      webhookStatus: "pending" as any,
                    });
                  } catch {}

                  // 2. Envia para os endpoints de capturas de leads e respostas da pesquisa
                  try {
                    fetch("/api/submit-lead", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        pageId: lp.id,
                        pageTitle: lp.name || lp.title,
                        name: leadName,
                        whatsapp: leadWhatsapp,
                        email: leadEmail,
                        quizAnswers: answers,
                        utms: utm,
                        source: effectiveSource,
                      }),
                    }).catch(() => {});

                    fetch(`/api/landing-pages/${encodeURIComponent(lp.id)}/conversion`, {
                      method: "POST",
                    }).catch(() => {});

                    fetch("/api/surveys/responses", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        surveyId: assignedSurvey.id || lp.surveyId,
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
                    }).catch(() => {});

                    fetch(`/api/landing-pages/${encodeURIComponent(lp.id)}/conversion`, {
                      method: "POST",
                    }).catch(() => {});

                    // Envia para Google Drive / Google Sheets em tempo real
                    submitLpLeadToDrive({
                      landingPageId: lp.id,
                      landingPageTitle: lp.name || lp.title || "Landing Page",
                      name: leadName || "",
                      email: leadEmail || "",
                      whatsapp: leadWhatsapp || "",
                      source: effectiveSource,
                      utm,
                      answers,
                    }).catch(() => {});
                  } catch {}

                  // 3. Atualiza contagem no localStorage
                  try {
                    const updateLpList = (storageKey: string) => {
                      const raw = localStorage.getItem(storageKey);
                      if (!raw) return;
                      const list = JSON.parse(raw);
                      if (!Array.isArray(list)) return;
                      const updated = list.map((p: any) => {
                        if (p.id === lp.id || p.slug === lp.slug) {
                          const newLeads = (p.leads || p.leads_count || 0) + 1;
                          const currentVisits = Number(p.visits || p.viewsCount || 0);
                          const newVisits = Math.max(currentVisits, newLeads);
                          const newConv = newVisits > 0 ? Math.min(100, Math.round((newLeads / newVisits) * 100)) : 0;
                          return {
                            ...p,
                            leads: newLeads,
                            leads_count: newLeads,
                            visits: newVisits,
                            viewsCount: newVisits,
                            conv: newConv,
                          };
                        }
                        return p;
                      });
                      localStorage.setItem(storageKey, JSON.stringify(updated));
                    };
                    updateLpList("comet_local_landing_pages");
                    updateLpList("people_cro_landing_pages_v1");
                    updateLpList("app:lps:v1");
                  } catch {}

                  // 4. Tenta gravar diretamente no Supabase e incrementar leads_count
                  try {
                    await supabase.from("leads").insert([leadRecord]);
                    if (isUUID(lp.id)) {
                      await supabase.from("landing_pages").update({ leads_count: (lp.leads_count || lp.leads || 0) + 1 }).eq("id", lp.id);
                    }
                  } catch (err) {
                    console.warn("Supabase lead direct insert notice:", err);
                  }

                  toast.success("✅ Cadastro e respostas enviadas com sucesso!");
                }}
              />
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
            const rawL = localStorage.getItem("comet_local_leads") || "[]";
            const rawQ = localStorage.getItem("comet_inbound_leads_queue") || "[]";
            const allPrior = [...JSON.parse(rawL), ...JSON.parse(rawQ)];
            
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
            company: lead.company || "",
            source: effectiveSource,
            landing_page: lp.name || lp.title || lp.id,
            product_id: primaryProductId,
            value: totalDealValue,
            pipeline_id: defaultPipeline?.id || null,
            stage: "Leads",
            classification: isCustomer ? "Cliente" : "Lead",
            temperature: "Quente",
            type: isRecurring ? "Recorrente" : "Inbound",
            tags,
            lpVisits: totalLpVisits,
            isCustomer,
            isRecurring,
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
            },
          };

          // 1. Salva localmente no armazenamento do Comet LP
          try {
            recordLocalLead({
              id: `lead_${Date.now()}`,
              pageId: lp.id,
              pageTitle: lp.name || lp.title || "Landing Page",
              name: lead.name || "",
              whatsapp: lead.whatsapp || "",
              email: lead.email || "",
              quizAnswers: lead.quizAnswers || {},
              utms: (utm as Record<string, string>) || {},
              submittedAt: new Date().toISOString(),
              webhookStatus: "pending" as any,
            });
          } catch {}

          // 2. Registra na fila persistente de leads inbound para sincronização garantida
          try {
            const rawQueue = localStorage.getItem("comet_inbound_leads_queue") || "[]";
            const queue = JSON.parse(rawQueue);
            queue.unshift({
              ...leadRecord,
              id: `lead_queue_${Date.now()}`,
              rawLead: lead,
            });
            localStorage.setItem("comet_inbound_leads_queue", JSON.stringify(queue.slice(0, 100)));
          } catch {}

          // 3. Incrementa contagem de leads da LP no localStorage
          try {
            const updateLpStorage = (key: string) => {
              const rawLps = localStorage.getItem(key);
              if (rawLps) {
                const lpsList = JSON.parse(rawLps);
                if (Array.isArray(lpsList)) {
                  const updatedLps = lpsList.map((p: any) => {
                    if (p.id === lp.id || p.slug === lp.slug) {
                      const newLeads = (p.leads || p.leads_count || 0) + 1;
                      const currentVisits = Number(p.visits || p.viewsCount || 0);
                      const newVisits = Math.max(currentVisits, newLeads);
                      const newConv = newVisits > 0 ? Math.min(100, Math.round((newLeads / newVisits) * 100)) : 0;
                      return {
                        ...p,
                        leads: newLeads,
                        leads_count: newLeads,
                        visits: newVisits,
                        viewsCount: newVisits,
                        conv: newConv,
                      };
                    }
                    return p;
                  });
                  localStorage.setItem(key, JSON.stringify(updatedLps));
                }
              }
            };
            updateLpStorage("comet_local_landing_pages");
            updateLpStorage("people_cro_landing_pages_v1");
            updateLpStorage("app:lps:v1");
          } catch {}

          // 4. Envia para o endpoint de lead capture (compatível com Vercel e Express)
          try {
            fetch("/api/submit-lead", {
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
              }),
            }).catch(() => {});

            fetch(`/api/landing-pages/${encodeURIComponent(lp.id)}/conversion`, {
              method: "POST",
            }).catch(() => {});
          } catch {}

          // 5. Encaminha para o endpoint de webhook local
          try {
            fetch("/api/webhook/submit-lead", {
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
                webhookUrl: (cometPage as any).settings?.webhookUrl,
              }),
            }).catch(() => {});
          } catch {}

          // Envia para Google Drive / Google Sheets em tempo real
          try {
            submitLpLeadToDrive({
              landingPageId: lp.id,
              landingPageTitle: lp.name || lp.title || "Landing Page",
              name: lead.name || "",
              email: lead.email || "",
              whatsapp: lead.whatsapp || "",
              company: lead.company || "",
              source: effectiveSource,
              utm,
              answers: lead.quizAnswers || {},
            }).catch(() => {});
          } catch {}

          // 6. Grava diretamente no Supabase e atualiza leads_count e visits em tempo real
          try {
            const dbPayload = mapLeadToDb(leadRecord);
            await supabase.from("leads").insert([dbPayload]);
            
            if (isUUID(lp.id)) {
              const { data: lpRow } = await supabase.from("landing_pages").select("leads_count, visits").eq("id", lp.id).maybeSingle();
              const curLeads = Number(lpRow?.leads_count) || 0;
              const curVisits = Number(lpRow?.visits) || 0;
              const nextLeads = curLeads + 1;
              const nextVisits = Math.max(curVisits, nextLeads);
              await supabase.from("landing_pages").update({ leads_count: nextLeads, visits: nextVisits }).eq("id", lp.id);
            } else if (lp.name) {
              const { data: lpRow } = await supabase.from("landing_pages").select("id, leads_count, visits").eq("name", lp.name).maybeSingle();
              if (lpRow) {
                const curLeads = Number(lpRow?.leads_count) || 0;
                const curVisits = Number(lpRow?.visits) || 0;
                const nextLeads = curLeads + 1;
                const nextVisits = Math.max(curVisits, nextLeads);
                await supabase.from("landing_pages").update({ leads_count: nextLeads, visits: nextVisits }).eq("id", lpRow.id);
              }
            }
          } catch (err) {
            console.warn("Supabase lead direct insert notice:", err);
          }

          // 7. Notifica Analytics de Conversão da LP
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

      // Checa se o lead já existia anteriormente
      let isCustomer = false;
      let priorVisits = 0;
      try {
        const normEmail = email.trim().toLowerCase();
        const rawL = localStorage.getItem("comet_local_leads") || "[]";
        const rawQ = localStorage.getItem("comet_inbound_leads_queue") || "[]";
        const allPrior = [...JSON.parse(rawL), ...JSON.parse(rawQ)];
        
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

      const leadRecord = {
        name: name.trim(),
        email: email.trim(),
        whatsapp: whatsapp.trim(),
        company: notes.trim() || "",
        source: effectiveSource,
        landing_page: lp.name || lp.title || lp.id,
        product_id: lp.productId || null,
        pipeline_id: defaultPipeline?.id || null,
        stage: "Leads",
        classification: isCustomer ? "Cliente" : "Lead",
        temperature: "Quente",
        type: isRecurring ? "Recorrente" : "Inbound",
        tags,
        lpVisits: totalLpVisits,
        isCustomer,
        isRecurring,
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
        },
      };

      // 1. Grava no localStorage de leads
      try {
        recordLocalLead({
          id: `lead_${Date.now()}`,
          pageId: lp.id,
          pageTitle: lp.name || lp.title || "Landing Page",
          name: name.trim(),
          whatsapp: whatsapp.trim(),
          email: email.trim(),
          quizAnswers: { observacoes: notes.trim() },
          utms: (utm as Record<string, string>) || {},
          submittedAt: new Date().toISOString(),
          webhookStatus: "pending" as any,
        });
      } catch {}

      // 2. Fila local de leads inbound
      try {
        const rawQueue = localStorage.getItem("comet_inbound_leads_queue") || "[]";
        const queue = JSON.parse(rawQueue);
        queue.unshift({
          ...leadRecord,
          id: `lead_queue_${Date.now()}`,
        });
        localStorage.setItem("comet_inbound_leads_queue", JSON.stringify(queue.slice(0, 100)));
      } catch {}

      // 3. Atualiza contagem de leads da LP no localStorage
      try {
        const updateLpList = (storageKey: string) => {
          const raw = localStorage.getItem(storageKey);
          if (!raw) return;
          const list = JSON.parse(raw);
          if (!Array.isArray(list)) return;
          const updated = list.map((p: any) => {
            if (p.id === lp.id || p.slug === lp.slug) {
              const newLeads = (p.leads || p.leads_count || 0) + 1;
              const visits = p.visits || 1;
              return {
                ...p,
                leads: newLeads,
                leads_count: newLeads,
                conv: Math.round((newLeads / visits) * 100),
              };
            }
            return p;
          });
          localStorage.setItem(storageKey, JSON.stringify(updated));
        };
        updateLpList("comet_local_landing_pages");
        updateLpList("people_cro_landing_pages_v1");
        updateLpList("app:lps:v1");
      } catch {}

      // 4. API Endpoints
      try {
        fetch("/api/submit-lead", {
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
          }),
        }).catch(() => {});

        fetch(`/api/landing-pages/${encodeURIComponent(lp.id)}/conversion`, {
          method: "POST",
        }).catch(() => {});
      } catch {}

      // 5. Gravação no Supabase
      try {
        await supabase.from("leads").insert([leadRecord]);
        if (isUUID(lp.id)) {
          await supabase.from("landing_pages").update({ 
            leads_count: (lp.leads_count || lp.leads || 0) + 1 
          }).eq("id", lp.id);
        }
      } catch (err) {
        console.warn("Supabase lead direct insert notice:", err);
      }

      // 6. Analytics
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
    return (
      <div className="bg-zinc-900/70 backdrop-blur-xl border border-zinc-800 rounded-3xl p-8 md:p-10 shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-300">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/10">
          <CheckCircle2 className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            Inscrição Confirmada
          </span>
          <h2 className="text-2xl font-black text-zinc-100 tracking-tight">Obrigado, {name.split(" ")[0]}!</h2>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
            Seus dados foram recebidos com sucesso. Nossa equipe entrará em contato via WhatsApp em breve.
          </p>
        </div>

        <div className="p-4 bg-zinc-950/50 border border-zinc-800/80 rounded-2xl text-left space-y-2 text-xs">
          <div className="flex items-center justify-between text-zinc-400">
            <span>WhatsApp Cadastrado:</span>
            <span className="font-semibold text-zinc-200">{whatsapp}</span>
          </div>
          {email && (
            <div className="flex items-center justify-between text-zinc-400">
              <span>E-mail:</span>
              <span className="font-semibold text-zinc-200 truncate max-w-[200px]">{email}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-zinc-400 pt-1 border-t border-zinc-800/60">
            <span>Origem:</span>
            <span className="font-bold text-purple-400 capitalize">{effectiveSource}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <a
            href={`https://wa.me/55${whatsapp.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-600/20 cursor-pointer"
          >
            <MessageCircle className="h-4 w-4" />
            <span>Falar no WhatsApp</span>
          </a>

          {lp.externalUrl && (
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
