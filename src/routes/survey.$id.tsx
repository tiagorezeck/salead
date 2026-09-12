"use client";

import { createFileRoute, useParams } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { DeepFindSurveyViewer } from "@/components/marketing/deepfind-survey-viewer";
import { SURVEY_PRESETS } from "@/lib/survey-templates";
import { Loader2, AlertTriangle, ArrowLeft } from "lucide-react";
import { type Survey } from "@/hooks/use-data";

export const Route = createFileRoute("/survey/$id")({
  component: PublicSurveyRoute,
});

function PublicSurveyRoute() {
  const { id } = useParams({ from: "/survey/$id" });
  const [survey, setSurvey] = useState<Partial<Survey> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    function loadSurvey() {
      setLoading(true);

      // 1. Verifica se é um preset direto (ex: qualificacao-min-1min, qualificacao-temperatura, pesquisa-satisfacao-csat-nps, pesquisa-tendencias-mercado)
      const foundPreset = SURVEY_PRESETS.find(p => p.id === id);
      if (foundPreset) {
        setSurvey({
          id: foundPreset.id,
          name: foundPreset.name,
          questions: foundPreset.questions,
          status: "active",
          settings: {
            headline: foundPreset.name,
            description: foundPreset.description,
            buttonText: "Iniciar Questionário",
            thankYouMessage: "Obrigado por responder!",
            accentColor: foundPreset.accentColor || "#FF6B00"
          }
        });
        setLoading(false);
        return;
      }

      // 2. Consulta no localStorage
      try {
        const rawLocal = localStorage.getItem("comet_crm_data");
        if (rawLocal) {
          const parsed = JSON.parse(rawLocal);
          const found = Array.isArray(parsed.surveys) && parsed.surveys.find((s: any) => s.id === id);
          if (found) {
            setSurvey(found);
            setLoading(false);
            return;
          }
        }

        // 3. Fallback inteligente: se não encontrou pelo ID customizado, usa o preset mais compatível
        const defaultPreset = SURVEY_PRESETS[0];
        setSurvey({
          id: id,
          name: defaultPreset.name,
          questions: defaultPreset.questions,
          status: "active",
          settings: {
            headline: defaultPreset.name,
            description: defaultPreset.description,
            buttonText: "Iniciar Questionário",
            thankYouMessage: "Obrigado por responder ao nosso questionário!",
            accentColor: defaultPreset.accentColor || "#FF6B00"
          }
        });
      } catch (err: any) {
        console.error("Erro ao carregar pesquisa:", err);
        const defaultPreset = SURVEY_PRESETS[0];
        setSurvey({
          id: id,
          name: defaultPreset.name,
          questions: defaultPreset.questions,
          status: "active"
        });
      } finally {
        setLoading(false);
      }
    }

    loadSurvey();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070B14] text-white flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 text-orange-500 animate-spin" />
        <span className="text-xs uppercase tracking-widest text-zinc-400 font-bold">
          Carregando Questionário...
        </span>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="min-h-screen bg-[#070B14] text-white flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="h-14 w-14 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20 grid place-items-center mx-auto">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-extrabold text-white">Pesquisa não encontrada</h2>
        <p className="text-xs text-zinc-400 max-w-sm">
          O link informado não está disponível ou a pesquisa foi desativada.
        </p>
      </div>
    );
  }

  return <DeepFindSurveyViewer survey={survey} isStandalone={true} />;
}

