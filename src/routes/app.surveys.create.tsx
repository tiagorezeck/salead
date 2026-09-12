import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useData, type Survey } from "@/hooks/use-data";
import { SURVEY_PRESETS, type SurveyPreset } from "@/lib/survey-templates";
import { 
  ArrowLeft, Plus, ClipboardList, Target, MessageSquare, 
  Search, BarChart3, Star, Zap, ChevronRight, Wand2, Clock,
  Sparkles, Flame, CheckCircle2
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { SurveyEditorModal } from "@/components/marketing/survey-editor-modal";

export const Route = createFileRoute("/app/surveys/create")({
  component: CreateSurveyPage,
});

function CreateSurveyPage() {
  const navigate = useNavigate();
  const { addSurvey } = useData();
  const [selectedTemplate, setSelectedTemplate] = useState<Partial<Survey> | null>(null);

  const handleCreateFromTemplate = (preset: SurveyPreset) => {
    const templateData: Partial<Survey> = {
      name: preset.name,
      questions: JSON.parse(JSON.stringify(preset.questions || [])),
      type: preset.id.includes("min") || preset.id.includes("qualificacao") ? "individual" : "mass",
      settings: {
        headline: preset.name,
        description: preset.description,
        buttonText: "Iniciar Questionário",
        thankYouMessage: "Obrigado por responder ao nosso questionário!",
        accentColor: preset.accentColor || "#FF6B00"
      },
      reward: {
        title: "Confirmação de Respostas",
        type: "whatsapp",
        value: ""
      }
    };
    setSelectedTemplate(templateData);
  };

  const handleCreateEmpty = () => {
    const emptyData: Partial<Survey> = { 
      name: "Nova Pesquisa Personalizada",
      questions: [
        {
          id: `q-1`,
          type: "single",
          category: "GERAL",
          question: "Qual é a sua principal prioridade no momento?",
          options: ["Crescimento", "Organização", "Inovação"],
          required: true,
          mapToProfile: "minScore"
        }
      ],
      type: "individual",
      settings: {
        headline: "Nova Pesquisa",
        description: "Responda as perguntas a seguir para registrar sua participação.",
        buttonText: "Iniciar Questionário",
        thankYouMessage: "Obrigado por responder ao nosso questionário!",
        accentColor: "#FF6B00"
      }
    };
    setSelectedTemplate(emptyData);
  };

  if (selectedTemplate) {
    return (
      <SurveyEditorModal 
        survey={selectedTemplate} 
        onClose={() => navigate({ to: "/app/surveys" })} 
        onSave={() => navigate({ to: "/app/surveys" })} 
      />
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate({ to: "/app/surveys" })} 
          className="p-2.5 hover:bg-muted rounded-xl transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <div className="text-[10px] uppercase font-black tracking-widest text-primary">Modelos Estratégicos</div>
          <h1 className="font-display text-2xl md:text-3xl font-bold">Criar Nova Pesquisa</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Escolha um dos 4 modelos prontos de alta conversão ou comece em branco.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Começar do Zero */}
        <button 
          onClick={handleCreateEmpty}
          className="group p-6 rounded-3xl bg-card border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left flex flex-col justify-between h-72 cursor-pointer"
        >
          <div className="h-12 w-12 rounded-2xl bg-muted grid place-items-center group-hover:bg-primary/10 transition-colors">
            <Plus className="h-6 w-6 text-muted-foreground group-hover:text-primary" />
          </div>
          <div>
            <h3 className="font-display text-lg font-bold text-foreground">Começar do Zero</h3>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">Crie perguntas personalizadas, opções livres e lógicas sob medida para o seu público.</p>
          </div>
          <div className="text-xs font-black text-primary uppercase tracking-wider flex items-center gap-1">
            Criar em branco <ChevronRight className="h-3.5 w-3.5" />
          </div>
        </button>

        {/* 4 Modelos Prontos */}
        {SURVEY_PRESETS.map((preset) => {
          const isMin = preset.id.includes("min");
          const isTemp = preset.id.includes("temperatura");
          const isCsat = preset.id.includes("satisfacao");
          const isMkt = preset.id.includes("mercado");

          return (
            <button 
              key={preset.id}
              onClick={() => handleCreateFromTemplate(preset)}
              className="group p-6 rounded-3xl bg-gradient-surface border border-border hover:border-primary/50 hover:shadow-elegant transition-all text-left flex flex-col justify-between h-72 cursor-pointer relative overflow-hidden"
            >
              <div className="flex items-start justify-between">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary grid place-items-center group-hover:scale-110 transition-transform">
                  {isMin ? <Zap className="h-6 w-6 text-orange-500" /> :
                   isTemp ? <Flame className="h-6 w-6 text-amber-500" /> :
                   isCsat ? <Star className="h-6 w-6 text-emerald-500" /> :
                   <BarChart3 className="h-6 w-6 text-blue-500" />}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[9px] font-black px-2.5 py-1 rounded-full bg-primary/15 text-primary border border-primary/20 uppercase tracking-tight">
                    {preset.badge}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {preset.timeEstimate}
                  </span>
                </div>
              </div>

              <div>
                <div className="text-[10px] uppercase font-black text-muted-foreground tracking-wider">{preset.category}</div>
                <h3 className="font-display text-base font-bold text-foreground mt-0.5 group-hover:text-primary transition-colors">{preset.name}</h3>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed line-clamp-2">{preset.description}</p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/60">
                <span className="text-[11px] font-bold text-muted-foreground">
                  {preset.questions.length} perguntas
                </span>
                <div className="flex items-center gap-1 text-xs font-black text-primary uppercase tracking-wider group-hover:translate-x-1 transition-transform">
                  Usar Modelo <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
