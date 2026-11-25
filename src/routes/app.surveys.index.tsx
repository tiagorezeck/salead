import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useData, type Survey } from "@/hooks/use-data";
import { 
  Plus, Search, ClipboardList, Users, TrendingUp, ExternalLink, 
  MoreVertical, Pencil, Trash2, Play, Pause, BarChart3, UserCheck, Globe,
  Copy, Check, Sparkles, Flame, Zap, Star, Clock, Eye, RotateCcw
} from "lucide-react";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { SURVEY_PRESETS, type SurveyPreset } from "@/lib/survey-templates";
import { SurveyResults } from "@/components/marketing/survey-results";
import { SurveyEditorModal } from "@/components/marketing/survey-editor-modal";

export const Route = createFileRoute("/app/surveys/")({
  component: SurveysPage,
});

export function SurveysPage() {
  const navigate = useNavigate();
  const { surveys, surveyResponses = [], addSurvey, updateSurvey, deleteSurvey, clearSurveyResponses, initialized } = useData();
  const [search, setSearch] = useState("");
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [confirmClearId, setConfirmClearId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(null);
  const [editingSurvey, setEditingSurvey] = useState<Survey | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const getCompletionsCount = (s: Survey) => {
    const matching = surveyResponses.filter((r: any) => 
      r.surveyId === s.id || 
      r.survey_id === s.id || 
      r.survey_name === s.name || 
      r.surveyTitle === s.name ||
      ((s as any).slug && (r.surveyId === (s as any).slug || r.survey_id === (s as any).slug))
    );
    return Math.max(s.completions || 0, matching.length);
  };

  const filtered = surveys.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
  const selectedSurvey = surveys.find(s => s.id === selectedSurveyId);

  const stats = useMemo(() => {
    const totalCompletions = surveys.reduce((acc, s) => acc + getCompletionsCount(s), 0);
    const totalVisits = surveys.reduce((acc, s) => acc + (s.visits || 0), 0);
    const effectiveVisits = Math.max(totalVisits, totalCompletions);
    const avgConv = effectiveVisits > 0 ? (totalCompletions / effectiveVisits) * 100 : 0;
    
    return {
      completions: Math.max(totalCompletions, surveyResponses.length),
      active: surveys.filter(s => s.status === 'active').length,
      conversion: avgConv.toFixed(1)
    };
  }, [surveys, surveyResponses]);

  const handleCopyLink = (surveyId: string) => {
    const url = `${window.location.origin}/survey/${surveyId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(surveyId);
    toast.success("Link público copiado para a área de transferência!");
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleQuickCreate = async (preset: SurveyPreset) => {
    const existing = surveys.find(s => s.id === preset.id || s.name === preset.name);
    if (existing) {
      setEditingSurvey({
        ...existing,
        questions: (existing.questions && existing.questions.length > 0)
          ? JSON.parse(JSON.stringify(existing.questions))
          : JSON.parse(JSON.stringify(preset.questions || []))
      });
      toast.success(`Abrindo questionário "${preset.name}" para edição.`);
      return;
    }

    const payload: Survey = {
      id: preset.id,
      name: preset.name,
      status: "active",
      createdAt: new Date().toISOString(),
      visits: 0,
      completions: 0,
      questions: JSON.parse(JSON.stringify(preset.questions || [])),
      type: preset.id.includes("min") || preset.id.includes("qualificacao") ? "individual" : "mass",
      settings: {
        headline: preset.name,
        description: preset.description,
        buttonText: "Iniciar Diagnóstico",
        thankYouMessage: "Obrigado por responder!",
        accentColor: preset.accentColor || "#FF6B00"
      },
      reward: {
        title: "Diagnóstico Completo",
        type: "whatsapp",
        value: ""
      }
    };
    
    try {
      const created = await addSurvey(payload);
      setEditingSurvey(created || payload);
      toast.success(`Pesquisa "${preset.name}" carregada no editor com sucesso!`);
    } catch {
      setEditingSurvey(payload);
    }
  };

  if (!initialized) return <div className="p-8 text-center animate-pulse">Carregando pesquisas...</div>;

  if (selectedSurvey) {
    return (
      <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto">
        <SurveyResults survey={selectedSurvey} onBack={() => setSelectedSurveyId(null)} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8 max-w-[1600px] mx-auto pb-20">
      {/* Top Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase font-black tracking-widest text-primary flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Marketing & Pesquisas Interativas
          </div>
          <h1 className="font-display text-2xl md:text-3xl font-bold mt-1">Pesquisas & Questionários</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Questionários e pesquisas interativas com design moderno para qualificar contatos, medir satisfação e coletar respostas.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link 
            to="/app/surveys/create"
            className="text-xs px-5 py-2.5 rounded-xl bg-gradient-primary text-primary-foreground font-black uppercase tracking-wider shadow-elegant inline-flex items-center gap-2 hover:scale-105 transition-transform"
          >
            <Plus className="h-4 w-4" /> Criar Pesquisa
          </Link>
        </div>
      </div>

      {/* Quick Starter Modelos Prontos */}
      <div className="space-y-3">
        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-primary" /> Modelos Prontos Recomendados
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {SURVEY_PRESETS.map((preset) => (
            <div 
              key={preset.id}
              className="bg-card border border-border hover:border-primary/40 rounded-2xl p-4 flex flex-col justify-between space-y-3 transition-all group"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-primary/15 text-primary uppercase">
                    {preset.badge}
                  </span>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium">
                    <Clock className="h-3 w-3" /> {preset.timeEstimate}
                  </span>
                </div>
                <h4 className="font-bold text-sm mt-2 text-foreground group-hover:text-primary transition-colors">{preset.name}</h4>
                <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{preset.description}</p>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <Link
                  to="/survey/$id"
                  params={{ id: preset.id }}
                  target="_blank"
                  className="flex-1 py-1.5 px-2 rounded-lg bg-muted text-foreground text-[11px] font-bold text-center hover:bg-muted/80 flex items-center justify-center gap-1"
                >
                  <Eye className="h-3 w-3" /> Testar
                </Link>
                <button
                  type="button"
                  onClick={() => handleQuickCreate(preset)}
                  className="flex-1 py-1.5 px-2 rounded-lg bg-primary/10 text-primary text-[11px] font-bold text-center hover:bg-primary/20 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="h-3 w-3" /> Usar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard label="Total de Respostas" value={stats.completions.toString()} icon={ClipboardList} />
        <KpiCard label="Pesquisas Ativas" value={stats.active.toString()} icon={Play} accent />
        <KpiCard label="Taxa de Conclusão Média" value={`${stats.conversion}%`} icon={TrendingUp} />
      </div>

      {/* Survey List Table */}
      <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex flex-wrap items-center justify-between gap-3 bg-muted/10">
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input 
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar pesquisa..." 
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary/20 outline-none" 
            />
          </div>
          <div className="text-xs text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? 'pesquisa listada' : 'pesquisas listadas'}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="text-left px-5 py-4">Pesquisa / Questionário</th>
                <th className="text-left px-3 py-4">Perguntas</th>
                <th className="text-center px-3 py-4">Status</th>
                <th className="text-right px-3 py-4">Respostas</th>
                <th className="text-right px-5 py-4">Ações & Visualização</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-muted/30 transition-colors group">
                  <td className="px-5 py-4">
                    <div>
                      <div className="font-bold text-foreground flex items-center gap-2">
                        {s.name}
                        {s.id.includes("min") && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-500 border border-orange-500/20">
                            MIN (~1 min)
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5 font-mono">
                        <Globe className="h-3 w-3 text-primary" /> /survey/{s.id}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <span className="text-xs font-bold text-muted-foreground">
                      {s.questions?.length || 0} questões
                    </span>
                  </td>
                  <td className="px-3 py-4 text-center">
                    <button 
                      onClick={() => updateSurvey(s.id, { status: s.status === 'active' ? 'paused' : 'active' })}
                      className={cn(
                        "text-[9px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider inline-flex items-center gap-1 cursor-pointer",
                        s.status === 'active' ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                      )}
                    >
                      {s.status === 'active' ? <Play className="h-2.5 w-2.5" /> : <Pause className="h-2.5 w-2.5" />}
                      {s.status === 'active' ? "Ativa" : "Pausada"}
                    </button>
                  </td>
                  <td className="px-3 py-4 text-right font-display font-black text-primary text-base">
                    {getCompletionsCount(s)}
                  </td>
                  <td className="px-5 py-4 text-right relative">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link 
                        to="/survey/$id" 
                        params={{ id: s.id }}
                        target="_blank"
                        className="px-2.5 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1"
                        title="Testar no Modo DeepFind"
                      >
                        <Eye className="h-3.5 w-3.5" /> Testar
                      </Link>

                      <button
                        onClick={() => handleCopyLink(s.id)}
                        className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        title="Copiar Link Público"
                      >
                        {copiedId === s.id ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                      </button>

                      <button 
                        onClick={() => {
                          setActiveMenu(activeMenu === s.id ? null : s.id);
                          setConfirmClearId(null);
                          setConfirmDeleteId(null);
                        }}
                        className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground transition-colors cursor-pointer"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                    
                    {activeMenu === s.id && (
                      <div className="absolute right-12 top-1/2 -translate-y-1/2 bg-card border border-border rounded-xl shadow-2xl z-20 py-1 min-w-[180px] animate-in fade-in zoom-in-95 text-left">
                        <button 
                          onClick={() => { setSelectedSurveyId(s.id); setActiveMenu(null); }}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-muted flex items-center gap-2 cursor-pointer font-medium"
                        >
                          <BarChart3 className="h-3.5 w-3.5 text-blue-500" /> Ver Respostas
                        </button>
                        <button 
                          onClick={() => { 
                            const matchingPreset = SURVEY_PRESETS.find(p => p.id === s.id || p.name === s.name);
                            const qList = (s.questions && s.questions.length > 0) 
                              ? s.questions 
                              : (matchingPreset?.questions || []);
                            setEditingSurvey({ ...s, questions: JSON.parse(JSON.stringify(qList)) }); 
                            setActiveMenu(null); 
                          }}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-muted flex items-center gap-2 cursor-pointer font-medium"
                        >
                          <Pencil className="h-3.5 w-3.5 text-primary" /> Editar Perguntas
                        </button>

                        {confirmClearId === s.id ? (
                          <div className="px-3 py-2 bg-amber-500/10 border-y border-amber-500/20 space-y-1.5">
                            <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                              Zerar respostas de teste?
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={async () => {
                                  await clearSurveyResponses(s.id);
                                  setConfirmClearId(null);
                                  setActiveMenu(null);
                                }}
                                className="flex-1 py-1 rounded bg-amber-600 text-white text-[10px] font-bold cursor-pointer"
                              >
                                Confirmar
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmClearId(null)}
                                className="px-2 py-1 rounded border border-border text-[10px] font-semibold cursor-pointer"
                              >
                                Não
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button 
                            type="button"
                            onClick={() => {
                              setConfirmDeleteId(null);
                              setConfirmClearId(s.id);
                            }}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center gap-2 cursor-pointer font-medium"
                          >
                            <RotateCcw className="h-3.5 w-3.5" /> Apagar Respostas
                          </button>
                        )}

                        {confirmDeleteId === s.id ? (
                          <div className="px-3 py-2 bg-destructive/10 border-t border-destructive/20 space-y-1.5">
                            <div className="text-[10px] font-bold text-destructive">
                              Excluir pesquisa?
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={async () => {
                                  await deleteSurvey(s.id);
                                  setConfirmDeleteId(null);
                                  setActiveMenu(null);
                                }}
                                className="flex-1 py-1 rounded bg-destructive text-white text-[10px] font-bold cursor-pointer"
                              >
                                Excluir
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-2 py-1 rounded border border-border text-[10px] font-semibold cursor-pointer"
                              >
                                Não
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button 
                            type="button"
                            onClick={() => {
                              setConfirmClearId(null);
                              setConfirmDeleteId(s.id);
                            }}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-destructive/10 text-destructive flex items-center gap-2 cursor-pointer font-medium"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Excluir
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-muted-foreground">
                    Nenhuma pesquisa encontrada. Escolha um dos modelos acima para criar a sua.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingSurvey && (
        <SurveyEditorModal 
          survey={editingSurvey} 
          onClose={() => setEditingSurvey(null)} 
          onSave={(updated) => updateSurvey(editingSurvey.id, updated)} 
        />
      )}
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, accent }: any) {
  return (
    <div className="bg-gradient-surface border border-border rounded-2xl p-5 shadow-card relative overflow-hidden group">
      <div className="absolute -right-2 -bottom-2 opacity-5 group-hover:opacity-10 transition-opacity">
        <Icon className="h-16 w-16" />
      </div>
      <Icon className={`h-5 w-5 ${accent ? "text-primary" : "text-muted-foreground"}`} />
      <div className="font-display text-2xl font-black mt-3">{value}</div>
      <div className="text-[10px] text-muted-foreground mt-0.5 uppercase font-bold tracking-widest">{label}</div>
    </div>
  );
}