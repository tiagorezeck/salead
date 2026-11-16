"use client";

import { createFileRoute, useParams } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { DeepFindSurveyViewer } from "@/components/marketing/deepfind-survey-viewer";
import { SURVEY_PRESETS } from "@/lib/survey-templates";
import { Loader2, AlertTriangle, ArrowLeft } from "lucide-react";
import { type Survey } from "@/hooks/use-data";
import { cloudStore } from "@/services/cloudStorageService";

export const Route = createFileRoute("/survey/$id")({
  component: PublicSurveyRoute,
});

function PublicSurveyRoute() {
  const { id } = useParams({ from: "/survey/$id" });
  const [survey, setSurvey] = useState<Partial<Survey> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadSurvey() {
      setLoading(true);

      // 1. Verifica se é um preset direto
      const foundPreset = SURVEY_PRESETS.find((p) => p.id === id);
      if (foundPreset) {
        if (!active) return;
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
            accentColor: foundPreset.accentColor || "#FF6B00",
          },
        });
        setLoading(false);
        return;
      }

      try {
        // 2. Verifica primeiro no estado em RAM já sincronizado do cloudStore
        const ramFound = (cloudStore.getState().surveys || []).find((s: any) => s.id === id || s.slug === id);
        if (ramFound && active) {
          setSurvey(ramFound);
          setLoading(false);
          return;
        }

        // 3. Busca direta ao vivo na nuvem Google Apps Script / API Express
        const cloudFound = await cloudStore.fetchPublicSurvey(id);
        if (cloudFound && active) {
          setSurvey(cloudFound);
          setLoading(false);
          return;
        }

        // 4. Bootstrap completo caso ainda não tenha baixado
        if (!cloudStore.getStatus().loadedFromCloud) {
          const db = await cloudStore.bootstrap();
          const bootedFound = (db.surveys || []).find((s: any) => s.id === id || s.slug === id);
          if (bootedFound && active) {
            setSurvey(bootedFound);
            setLoading(false);
            return;
          }
        }

        // 5. Fallback para preset compatível caso não encontrado
        if (active) {
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
              accentColor: defaultPreset.accentColor || "#FF6B00",
            },
          });
        }
      } catch (err: any) {
        console.error("Erro ao carregar pesquisa:", err);
        if (active) {
          const defaultPreset = SURVEY_PRESETS[0];
          setSurvey({
            id: id,
            name: defaultPreset.name,
            questions: defaultPreset.questions,
            status: "active",
          });
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadSurvey();
    return () => {
      active = false;
    };
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

