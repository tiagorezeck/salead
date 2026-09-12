import { useState } from "react";
import { Sparkles, Wand2, X, Target, Palette, CheckCircle2, ArrowRight } from "lucide-react";
import { type SmartBrief, createLPFromSmartBrief, COLOR_MOODS } from "@/lib/lp-store";
import { toast } from "sonner";

interface SmartBriefModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (lp: any) => void;
  defaultBrand?: string;
}

export function SmartBriefModal({ isOpen, onClose, onCreated, defaultBrand = "Minha Empresa" }: SmartBriefModalProps) {
  const [step, setStep] = useState(1);
  const [brief, setBrief] = useState<SmartBrief>({
    brand: defaultBrand,
    objective: "lead-generation",
    niche: "Consultoria Empresarial",
    audience: "Empresários, diretores e gestores de vendas",
    offer: "Diagnóstico e Estruturação de Máquina Comercial",
    tone: "professional",
    colorMood: "orange",
    includeSurvey: true,
    includePricing: false,
    includeFaq: true,
    includeTestimonial: true,
    extraContext: "Metodologia comprovada para aumento de previsibilidade e ICC."
  });

  if (!isOpen) return null;

  const handleGenerate = () => {
    try {
      const newLp = createLPFromSmartBrief(brief);
      toast.success("Landing Page gerada pela IA!", {
        description: `Página "${newLp.name}" pronta com blocos e seções inteligentes.`
      });
      onCreated(newLp);
      onClose();
    } catch (err: any) {
      toast.error(`Erro ao gerar: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-border bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary grid place-items-center">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Gerador Inteligente de Landing Pages (IA)</h2>
              <p className="text-xs text-muted-foreground">Preencha o briefing estratégico e receba a estrutura completa pronta para converter.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nome da Marca / Empresa</label>
                <input
                  value={brief.brand}
                  onChange={(e) => setBrief({ ...brief, brand: e.target.value })}
                  placeholder="Ex: COMET Consultoria"
                  className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Objetivo Principal</label>
                <select
                  value={brief.objective}
                  onChange={(e) => setBrief({ ...brief, objective: e.target.value as any })}
                  className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                >
                  <option value="lead-generation">Captação de Leads (Contato Comercial)</option>
                  <option value="quiz-diagnosis">Diagnóstico Interativo / Quiz</option>
                  <option value="sales">Apresentação de Oferta / Vendas</option>
                  <option value="webinar">Inscrição em Webinar / Masterclass</option>
                  <option value="waitlist">Lista de Espera / Lançamento</option>
                </select>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nicho de Mercado</label>
                <input
                  value={brief.niche}
                  onChange={(e) => setBrief({ ...brief, niche: e.target.value })}
                  placeholder="Ex: Clínicas Médicas, B2B SaaS, Varejo"
                  className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Público-Alvo (Decisor)</label>
                <input
                  value={brief.audience}
                  onChange={(e) => setBrief({ ...brief, audience: e.target.value })}
                  placeholder="Ex: Sócios, Diretores Comerciais, C-Level"
                  className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Oferta / Proposta de Valor Central</label>
              <textarea
                value={brief.offer}
                onChange={(e) => setBrief({ ...brief, offer: e.target.value })}
                placeholder="Ex: Sessão Estratégica Gratuita para diagnosticar gargalos comerciais e desenhar plano de ação."
                rows={2}
                className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Tom de Voz e Paleta */}
          <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t border-border">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tom de Voz da Comunicação</label>
              <select
                value={brief.tone}
                onChange={(e) => setBrief({ ...brief, tone: e.target.value as any })}
                className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
              >
                <option value="professional">Corporativo & Autoritário</option>
                <option value="urgent">Direto & Urgente (Ação Imediata)</option>
                <option value="luxury">Sofisticado & Premium</option>
                <option value="friendly">Próximo & Consultivo</option>
                <option value="technical">Técnico & Especialista</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Paleta de Cores</label>
              <div className="flex gap-2 items-center pt-1">
                {(Object.keys(COLOR_MOODS) as Array<keyof typeof COLOR_MOODS>).map((mood) => {
                  const isSel = brief.colorMood === mood;
                  const color = COLOR_MOODS[mood]?.primary || "#fff";
                  return (
                    <button
                      key={mood}
                      type="button"
                      onClick={() => setBrief({ ...brief, colorMood: mood })}
                      className={`h-7 w-7 rounded-full border-2 transition-all cursor-pointer ${
                        isSel ? "border-foreground scale-110 shadow-md" : "border-transparent opacity-60 hover:opacity-100"
                      }`}
                      style={{ background: color }}
                      title={mood}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Seções Opcionais */}
          <div className="space-y-3 pt-4 border-t border-border">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
              Seções Estratégicas a Incluir
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <label className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                brief.includeSurvey ? "border-primary/50 bg-primary/10 text-primary" : "border-border bg-card hover:bg-muted"
              }`}>
                <input
                  type="checkbox"
                  checked={brief.includeSurvey}
                  onChange={(e) => setBrief({ ...brief, includeSurvey: e.target.checked })}
                  className="hidden"
                />
                <CheckCircle2 className={`h-4 w-4 shrink-0 ${brief.includeSurvey ? "text-primary font-bold" : "text-muted-foreground"}`} />
                <span>Quiz / Diagnóstico</span>
              </label>

              <label className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                brief.includeTestimonial ? "border-primary/50 bg-primary/10 text-primary" : "border-border bg-card hover:bg-muted"
              }`}>
                <input
                  type="checkbox"
                  checked={brief.includeTestimonial}
                  onChange={(e) => setBrief({ ...brief, includeTestimonial: e.target.checked })}
                  className="hidden"
                />
                <CheckCircle2 className={`h-4 w-4 shrink-0 ${brief.includeTestimonial ? "text-primary font-bold" : "text-muted-foreground"}`} />
                <span>Depoimentos</span>
              </label>

              <label className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                brief.includeFaq ? "border-primary/50 bg-primary/10 text-primary" : "border-border bg-card hover:bg-muted"
              }`}>
                <input
                  type="checkbox"
                  checked={brief.includeFaq}
                  onChange={(e) => setBrief({ ...brief, includeFaq: e.target.checked })}
                  className="hidden"
                />
                <CheckCircle2 className={`h-4 w-4 shrink-0 ${brief.includeFaq ? "text-primary font-bold" : "text-muted-foreground"}`} />
                <span>Perguntas (FAQ)</span>
              </label>

              <label className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                brief.includePricing ? "border-primary/50 bg-primary/10 text-primary" : "border-border bg-card hover:bg-muted"
              }`}>
                <input
                  type="checkbox"
                  checked={brief.includePricing}
                  onChange={(e) => setBrief({ ...brief, includePricing: e.target.checked })}
                  className="hidden"
                />
                <CheckCircle2 className={`h-4 w-4 shrink-0 ${brief.includePricing ? "text-primary font-bold" : "text-muted-foreground"}`} />
                <span>Tabela de Preços</span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/30 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            className="px-6 py-2.5 rounded-xl bg-gradient-primary text-primary-foreground text-xs font-bold shadow-elegant inline-flex items-center gap-2 hover:scale-105 transition-all cursor-pointer"
          >
            <Wand2 className="h-4 w-4" /> Gerar Landing Page com IA
          </button>
        </div>
      </div>
    </div>
  );
}
