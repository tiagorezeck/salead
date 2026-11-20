import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useData } from "@/hooks/use-data";
import { 
  Sparkles, ExternalLink, Eye, Users, TrendingUp, Plus, Pencil, 
  Trash2, Play, Pause, FlaskConical, Layout, CheckCircle2, ClipboardList, 
  Link as LinkIcon, Layers, Share2, Bot, Globe, ArrowRight, Zap, Target,
  Monitor, ChevronLeft, ChevronRight, ShieldCheck, MoreHorizontal,
  AlertTriangle, X, Copy
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Editor } from "@/components/marketing/comet-lp/components/Editor";
import { AIModalGenerator } from "@/components/marketing/comet-lp/components/AIModalGenerator";
import { TemplatePickerModal } from "@/components/marketing/comet-lp/components/TemplatePickerModal";
import { ExternalLPModal } from "@/components/marketing/comet-lp/components/ExternalLPModal";
import { SmartLinkModal } from "@/components/marketing/smart-link-modal";
import { ensureCometLP, createBlankCometLP } from "@/components/marketing/comet-lp/utils/cometAdapter";
import { PRESET_TEMPLATES } from "@/components/marketing/comet-lp/data/templates";
import { HERO_MODELS } from "@/components/marketing/comet-lp/components/HeroModelSelector";
import { cn } from "@/lib/utils";
import { uid } from "@/lib/lp-store";
import { cloudStore } from "@/services/cloudStorageService";

export const Route = createFileRoute("/app/landing-pages")({
  component: LPPage,
});

function LPPage() {
  const navigate = useNavigate();
  const { 
    landingPages, 
    addLandingPage, 
    updateLandingPage, 
    deleteLandingPage, 
    deleteMultipleLandingPages,
    cleanDatabaseKeepOne,
    surveys,
    company, 
    initialized, 
  } = useData();
  
  const [editingLP, setEditingLP] = useState<any | null>(null);
  const [smartLinkLP, setSmartLinkLP] = useState<{ id: string; name: string; slug?: string; lp?: any } | null>(null);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [showExternalModal, setShowExternalModal] = useState(false);
  const [selectedLPId, setSelectedLPId] = useState<string | null>(null);
  const [lpToDelete, setLpToDelete] = useState<any | null>(null);
  const [selectedLpIds, setSelectedLpIds] = useState<string[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showCleanDbConfirm, setShowCleanDbConfirm] = useState(false);

  const toggleSelectLp = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedLpIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedLpIds.length === landingPages.length) {
      setSelectedLpIds([]);
    } else {
      setSelectedLpIds(landingPages.map(p => p.id));
    }
  };

  const handleBulkDeleteExecute = async () => {
    try {
      await deleteMultipleLandingPages(selectedLpIds);
      toast.success(`${selectedLpIds.length} Landing Pages excluídas com sucesso!`);
      setSelectedLpIds([]);
    } catch (err) {
      console.error("Erro ao excluir páginas em massa:", err);
      toast.error("Erro ao excluir páginas em massa.");
    } finally {
      setShowBulkDeleteConfirm(false);
    }
  };

  const handleCleanDbExecute = async () => {
    try {
      await cleanDatabaseKeepOne();
      setSelectedLpIds([]);
    } catch (err) {
      console.error("Erro ao limpar banco de dados:", err);
      toast.error("Erro ao limpar banco de dados.");
    } finally {
      setShowCleanDbConfirm(false);
    }
  };

  const handleConfirmDelete = async (id: string) => {
    try {
      await deleteLandingPage(id);
      if (selectedLPId === id) {
        setSelectedLPId(null);
      }
      toast.success("Landing Page excluída com sucesso.");
    } catch (err) {
      console.error("Erro ao excluir:", err);
      toast.error("Erro ao excluir Landing Page.");
    } finally {
      setLpToDelete(null);
    }
  };

  // Duplicar Landing Page para testes A/B ou novas campanhas (100% autônoma, sem vinculo com a anterior)
  const handleDuplicateLP = async (lpToDuplicate: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!lpToDuplicate) return;

    try {
      const baseName = lpToDuplicate.name || lpToDuplicate.title || "Landing Page";
      const duplicateName = `${baseName} (Cópia)`;
      
      const newUuid = typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === "x" ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          });
          
      const newSlug = `lp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      // Deep clone do objeto original
      const duplicatedObject: any = JSON.parse(JSON.stringify(lpToDuplicate));

      // REMOVER completamente IDs herdados da página pai para garantir autonomia absoluta
      delete duplicatedObject.originalId;
      delete duplicatedObject._id;
      delete duplicatedObject.id;

      // Atribuir novos identificadores autônomos
      duplicatedObject.id = newUuid;
      duplicatedObject.originalId = newUuid;
      duplicatedObject.name = duplicateName;
      duplicatedObject.title = duplicateName;
      duplicatedObject.slug = newSlug;
      duplicatedObject.status = "Ativa";
      duplicatedObject.created_at = new Date().toISOString();
      duplicatedObject.updated_at = new Date().toISOString();

      if (duplicatedObject.config && typeof duplicatedObject.config === 'object') {
        duplicatedObject.config = {
          ...duplicatedObject.config,
          id: newUuid,
          client_id: newUuid,
          originalId: newUuid,
          slug: newSlug
        };
        delete duplicatedObject.config._id;
      }

      // ZERAR ABSOLUTAMENTE TODAS AS MÉTRICAS DE VISITAS, LEADS E CONVERSÃO
      duplicatedObject.visits = 0;
      duplicatedObject.leads = 0;
      duplicatedObject.conv = 0;
      duplicatedObject.viewsCount = 0;
      duplicatedObject.leadsCount = 0;
      duplicatedObject.conversions = 0;
      duplicatedObject.views_count = 0;
      duplicatedObject.leads_count = 0;

      const savedLP = await addLandingPage(duplicatedObject);
      if (savedLP) {
        setSelectedLPId(savedLP.id);
      }

      toast.success("Landing Page duplicada com sucesso!", {
        description: `Nova página "${duplicateName}" criada de forma 100% autônoma. Excluir uma não afeta a outra.`
      });
    } catch (err) {
      console.error("Erro ao duplicar Landing Page:", err);
      toast.error("Erro ao duplicar Landing Page.");
    }
  };

  // Seleciona a LP escolhida ou a primeira da lista por padrão
  const selectedLP = (selectedLPId ? landingPages.find((p) => p.id === selectedLPId) : null) || landingPages[0] || null;
  const selectedIndex = selectedLP ? landingPages.findIndex((p) => p.id === selectedLP.id) : -1;

  // Extrair os dados da Hero da Landing Page Pronta
  const heroDisplay = (() => {
    if (!selectedLP) return null;
    const isExt = Boolean(selectedLP.externalUrl || selectedLP.template === "External" || selectedLP.type === "URL Externa");

    const selLeads = Number(selectedLP.leads || selectedLP.leads_count || 0);
    const selVisits = Math.max(Number(selectedLP.visits || selectedLP.viewsCount || 0), selLeads);
    const selConv = selVisits > 0 ? Math.min(100, Math.round((selLeads / selVisits) * 100)) : 0;

    const statsObj = [
      { label: "VISITAS", value: selVisits.toLocaleString("pt-BR") },
      { label: "LEADS", value: selLeads.toString() },
      { label: "CONVERSÃO", value: `${selConv}%` },
    ];

    if (isExt) {
      return {
        isExternal: true,
        badge: selectedLP.surveyId ? "COM PESQUISA ATRIBUÍDA" : "URL EXTERNA CONECTADA",
        headline: selectedLP.name || "Landing Page Externa",
        subheadline: selectedLP.externalUrl 
          ? `Monitorando tráfego e conversões de: ${selectedLP.externalUrl}`
          : "Página externa conectada ao painel COMET para rastreamento.",
        ctaText: "ACESSAR LINK ORIGINAL",
        ctaSubtext: `Status: ${selectedLP.status || "Ativa"} • Link Rastreável`,
        image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1000&q=80",
        stats: statsObj,
      };
    }

    const cometPage = ensureCometLP(selectedLP);
    const hero = cometPage.hero;
    const activeModel = cometPage.heroModel || hero?.model || "split_image";
    const foundModel = HERO_MODELS.find((m) => m.id === activeModel);

    return {
      isExternal: false,
      model: activeModel,
      theme: cometPage.theme || selectedLP.theme || "dark",
      accentColor: cometPage.accentColor || "purple",
      modelTitle: foundModel?.title || "Modelo 1: Split com Imagem",
      badge: hero?.badgeText || (
        selectedLP.status === "Ativa" 
          ? "PÁGINA ATIVA NO AR" 
          : selectedLP.status === "Teste" 
          ? "AMBIENTE DE TESTE" 
          : "PÁGINA PAUSADA"
      ),
      headline: hero?.headline || selectedLP.name || selectedLP.title || "Landing Page de Alta Conversão",
      subheadline: hero?.subheadline || "Apresente sua oferta com direção de arte profissional e gatilhos de conversão.",
      ctaText: hero?.ctaText || "GARANTIR MEU ACESSO AGORA",
      ctaSubtext: hero?.ctaSubtext || "Sem burocracia • Acesso imediato",
      image: hero?.imageUrl || hero?.videoThumbnail || "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1000&q=80",
      stats: statsObj,
    };
  })();

  const handlePrevLP = () => {
    if (landingPages.length <= 1) return;
    const newIdx = selectedIndex > 0 ? selectedIndex - 1 : landingPages.length - 1;
    setSelectedLPId(landingPages[newIdx].id);
  };

  const handleNextLP = () => {
    if (landingPages.length <= 1) return;
    const newIdx = selectedIndex < landingPages.length - 1 ? selectedIndex + 1 : 0;
    setSelectedLPId(landingPages[newIdx].id);
  };

  // Criar Página em Branco no Novo Motor COMET
  const handleCreateBlankComet = async () => {
    const blankPage = createBlankCometLP(
      `Nova Landing Page ${landingPages.length + 1}`,
      company?.name || "COMET CRM"
    );
    const stableUuid =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : blankPage.id;
    const dbItem = {
      ...blankPage,
      id: stableUuid,
      name: blankPage.title,
      type: "COMET CRO",
      template: "COMET",
      status: "Ativa",
      visits: 0,
      leads: 0,
      conv: 0,
    };
    const savedLP = await addLandingPage(dbItem as any);
    if (savedLP) {
      setSelectedLPId(savedLP.id);
      setEditingLP(savedLP);
    }
    toast.success("Nova Landing Page criada!", {
      description: "Carregando o construtor visual COMET-LPs com 14 modelos de hero e blocos de conversão."
    });
  };

  // Selecionar Template Pré-Configurado
  const handleSelectPresetTemplate = async (tpl: any) => {
    const stableUuid =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `lp_${uid()}`;
    const tplModel = tpl?.hero?.model || tpl?.heroModel || tpl?.hero_model || "split_image";
    const newPage = {
      ...tpl,
      id: stableUuid,
      title: `${tpl.title} (Cópia)`,
      name: `${tpl.title} (Cópia)`,
      slug: `${tpl.slug || "lp"}-${uid().slice(0, 6)}`,
      heroModel: tplModel,
      hero_model: tplModel,
      hero: tpl.hero ? { ...tpl.hero, model: tplModel } : { model: tplModel },
      type: "COMET CRO",
      template: "COMET",
      status: "Ativa",
      visits: 0,
      leads: 0,
      conv: 0,
      viewsCount: 0,
      leadsCount: 0,
    };
    const savedLP = await addLandingPage(newPage as any);
    if (savedLP) {
      setSelectedLPId(savedLP.id);
      setEditingLP(savedLP);
    }
    toast.success("Template importado com sucesso!", {
      description: `Iniciando editor com o modelo de alta conversão para ${tpl.niche}.`
    });
  };

  // Salvar LP Externa por URL (Modelo 1)
  const handleSaveExternalLP = async ({ 
    name, 
    externalUrl, 
    surveyId,
    bannerUrl,
    description 
  }: { 
    name: string; 
    externalUrl: string; 
    surveyId?: string;
    bannerUrl?: string;
    description?: string;
  }) => {
    const newExternalLP = {
      id: `lp_ext_${uid()}`,
      name,
      title: name,
      externalUrl,
      surveyId: surveyId || null,
      imageUrl: bannerUrl || "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80",
      description: description || `Página externa monitorada: ${externalUrl}`,
      type: "URL Externa",
      template: "External",
      status: "Ativa",
      visits: 0,
      leads: 0,
      conv: 0,
    };
    const savedLP = await addLandingPage(newExternalLP as any);
    toast.success("Landing Page Externa conectada com sucesso!", {
      description: "Você já pode gerar links rastreados e monitorar visitas e leads deste endereço."
    });
    // Abre modal de Smart Links para facilitar compartilhamento
    if (savedLP) {
      setSmartLinkLP({ id: savedLP.id, name: savedLP.name, slug: (savedLP as any).slug, lp: savedLP });
    } else {
      setSmartLinkLP({ id: newExternalLP.id, name: newExternalLP.name, slug: (newExternalLP as any).slug, lp: newExternalLP });
    }
  };

  // Estatísticas Globais
  const totalVisits = landingPages.reduce((acc, p) => {
    const lCount = Number(p.leads || p.leads_count || 0);
    const vCount = Math.max(Number(p.visits || p.viewsCount || 0), lCount);
    return acc + vCount;
  }, 0);
  const totalLeads = landingPages.reduce((acc, p) => acc + Number(p.leads || p.leads_count || 0), 0);
  const avgConversion = totalVisits > 0 ? Math.min(100, Number((totalLeads / totalVisits) * 100)).toFixed(1) : "0.0";

  if (!initialized) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <span className="text-xs text-muted-foreground font-semibold">Sincronizando Módulo de Landing Pages...</span>
      </div>
    );
  }

  if (editingLP) {
    const cometPage = ensureCometLP(editingLP);
    return (
      <Editor
        page={cometPage}
        onSave={async (updatedPage) => {
          try {
            const activeModel = updatedPage.hero?.model || updatedPage.heroModel || updatedPage.hero_model || "split_image";
            const currentStatus = editingLP.status || "Ativa";
            const newStatus = updatedPage.status === "draft"
              ? "Pausada"
              : (currentStatus === "Teste" || currentStatus === "Pausada" ? currentStatus : "Ativa");

            const payload = {
              ...updatedPage,
              heroModel: activeModel,
              hero_model: activeModel,
              hero: {
                ...updatedPage.hero,
                model: activeModel,
              },
              name: updatedPage.title || editingLP.name,
              template: "COMET",
              status: newStatus,
              visits: updatedPage.viewsCount ?? editingLP.visits ?? 0,
              leads: updatedPage.leadsCount ?? editingLP.leads ?? 0,
              surveyId: updatedPage.surveyId || editingLP.surveyId || undefined,
            };

            const saved = await updateLandingPage(editingLP.id || updatedPage.id, payload);
            setEditingLP(saved || payload);
            toast.success("Landing Page salva e sincronizada no Google Sheets!");
          } catch (e) {
            console.error("Erro ao salvar LP:", e);
            toast.error("Erro ao salvar alterações da Landing Page.");
          }
        }}
        onBackToDashboard={() => setEditingLP(null)}
      />
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8 max-w-[1600px] mx-auto pb-24">
      {/* Top Header do Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary">MARKETING</span>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Landing Pages com IA
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Gerencie suas campanhas e crie novos funis em segundos.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAIGenerator(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-primary text-primary-foreground font-bold text-xs inline-flex items-center gap-2 shadow-elegant hover:scale-[1.02] transition-all cursor-pointer w-fit"
        >
          <Plus className="h-4 w-4" />
          <span>Nova landing</span>
        </button>
      </div>

      {/* BANNER PRINCIPAL COM PREVIEW 16:9 DA HERO & CONTROLES */}
      <div className="relative overflow-hidden rounded-3xl bg-card border border-border p-6 md:p-8 shadow-card">
        {/* Glows Decorativos de Fundo Suave */}
        <div className="absolute top-0 right-1/3 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* COLUNA ESQUERDA: IDENTIDADE, BOTÕES DE AÇÃO E MÉTRICAS CONSOLIDADAS */}
          <div className="lg:col-span-6 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span>COMET AI ENGINE V3</span>
              </div>

              <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-extrabold text-foreground tracking-tight leading-tight">
                Crie Landing Pages de <span className="text-primary font-black">Alta Conversão.</span>
              </h2>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Atualmente usando:</span>
                <span className="font-bold text-primary flex items-center gap-1.5 bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> GOOGLE
                </span>
              </div>
            </div>

            {/* BOTÕES DE AÇÃO (Substituindo os antigos inputs) */}
            <div className="space-y-2">
              <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                Ações Rápidas de Criação
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAIGenerator(true)}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-gradient-primary text-primary-foreground font-bold text-xs flex items-center justify-center gap-2 shadow-elegant cursor-pointer transition-all hover:scale-[1.02]"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Gerar com IA</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowTemplatePicker(true)}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-background border border-border hover:bg-muted font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors text-foreground shadow-sm"
                >
                  <Layout className="h-4 w-4 text-primary" />
                  <span>Templates CRO</span>
                </button>

                <button
                  type="button"
                  onClick={handleCreateBlankComet}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-background border border-border hover:bg-muted font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors text-foreground shadow-sm"
                >
                  <Plus className="h-4 w-4 text-primary" />
                  <span>Página em Branco</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowExternalModal(true)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm"
                  title="Trazer URL externa para rastrear visitas, leads e associar pesquisas"
                >
                  <Globe className="h-4 w-4 text-blue-600" />
                  <span>URL Externa (Modelo 1)</span>
                </button>
              </div>
            </div>

            {/* DADOS: MÉTRICAS CONSOLIDADAS DO MÓDULO */}
            <div className="pt-4 border-t border-border space-y-2">
              <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                Desempenho Geral do Ecossistema
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-muted/40 border border-border rounded-2xl p-3 shadow-sm hover:border-primary/40 transition-colors">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5">
                    <Layers className="h-3 w-3 text-primary" /> Total Páginas
                  </div>
                  <div className="font-display text-xl font-extrabold mt-1 text-foreground">
                    {landingPages.length}
                  </div>
                </div>

                <div className="bg-muted/40 border border-border rounded-2xl p-3 shadow-sm hover:border-primary/40 transition-colors">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5">
                    <Eye className="h-3 w-3 text-primary" /> Visitas Rastreadas
                  </div>
                  <div className="font-display text-xl font-extrabold mt-1 text-foreground">
                    {totalVisits.toLocaleString("pt-BR")}
                  </div>
                </div>

                <div className="bg-muted/40 border border-border rounded-2xl p-3 shadow-sm hover:border-emerald-400 transition-colors">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5">
                    <Users className="h-3 w-3 text-emerald-600" /> Leads Capturados
                  </div>
                  <div className="font-display text-xl font-extrabold mt-1 text-emerald-600">
                    {totalLeads.toLocaleString("pt-BR")}
                  </div>
                </div>

                <div className="bg-muted/40 border border-border rounded-2xl p-3 shadow-sm hover:border-amber-400 transition-colors">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5">
                    <TrendingUp className="h-3 w-3 text-amber-600" /> Conversão Média
                  </div>
                  <div className="font-display text-xl font-extrabold mt-1 text-amber-600">
                    {avgConversion}%
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* COLUNA DIREITA: PREVIEW DA HERO EM PROPORÇÃO 16:9 DA LP SELECIONADA */}
          <div className="lg:col-span-6 flex flex-col space-y-2.5">
            {/* Header de Controle do Preview */}
            <div className="flex items-center justify-between text-xs px-1">
              <div className="flex items-center gap-2 min-w-0">
                <Monitor className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground truncate">
                  PREVIEW DA HERO:{" "}
                  <span className="text-foreground font-extrabold">
                    {selectedLP ? (selectedLP.name || selectedLP.title || "Landing Page") : "NENHUMA LP CRIADA"}
                  </span>
                </span>
                {selectedLP && (
                  <span className={cn(
                    "text-[9px] px-2 py-0.5 rounded-full font-bold uppercase shrink-0 border flex items-center gap-1",
                    selectedLP.status === "Ativa" 
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                      : selectedLP.status === "Teste"
                      ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  )}>
                    {selectedLP.status === "Teste" && <FlaskConical className="h-2.5 w-2.5 text-purple-600 dark:text-purple-400 animate-pulse" />}
                    {selectedLP.status}
                  </span>
                )}
              </div>

              {landingPages.length > 1 && (
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Bolinhas indicadoras das LPs */}
                  <div className="hidden sm:flex items-center gap-1 mr-1">
                    {landingPages.map((lp, i) => (
                      <button
                        key={lp.id}
                        type="button"
                        onClick={() => setSelectedLPId(lp.id)}
                        className={cn(
                          "h-1.5 rounded-full transition-all cursor-pointer",
                          selectedLP?.id === lp.id ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60"
                        )}
                        title={`Visualizar ${lp.name}`}
                      />
                    ))}
                  </div>

                  <span className="text-[10px] text-muted-foreground font-semibold">
                    {selectedIndex + 1}/{landingPages.length}
                  </span>

                  <button
                    type="button"
                    onClick={handlePrevLP}
                    className="h-6 w-6 rounded-lg border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground grid place-items-center transition-colors cursor-pointer shadow-sm"
                    title="Página anterior"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={handleNextLP}
                    className="h-6 w-6 rounded-lg border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground grid place-items-center transition-colors cursor-pointer shadow-sm"
                    title="Próxima página"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* CONTAINER 16:9 COM A HERO DA LP PRONTA (SUPORTA TODOS OS 14 MODELOS) */}
            {selectedLP && heroDisplay ? (() => {
              const m = (heroDisplay as any).model || "split_image";
              const isLightPreview =
                m === "white_pro" ||
                m === "kids_school_doodle" ||
                m === "survey_hero_light" ||
                ((heroDisplay as any).theme === "light" &&
                  m !== "portfolio_dark_neon" &&
                  m !== "survey_hero_dark" &&
                  m !== "editorial_ebook" &&
                  m !== "fullscreen_slideshow");

              const containerBg =
                m === "kids_school_doodle"
                  ? "bg-[#FFFBF2] text-zinc-900 border-amber-200"
                  : m === "white_pro" || m === "survey_hero_light"
                  ? "bg-white text-zinc-900 border-zinc-200"
                  : m === "portfolio_dark_neon"
                  ? "bg-[#060913] text-white border-emerald-500/40"
                  : isLightPreview
                  ? "bg-zinc-50 text-zinc-900 border-zinc-200"
                  : "bg-[#0B0D17] text-white border-zinc-800/90";

              return (
              <div 
                onClick={() => {
                  if (!heroDisplay.isExternal) {
                    setEditingLP(selectedLP);
                  } else if (selectedLP.externalUrl) {
                    const a = document.createElement("a");
                    a.href = selectedLP.externalUrl;
                    a.target = "_blank";
                    a.rel = "noopener noreferrer";
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                  }
                }}
                className={`relative w-full aspect-video rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl border flex flex-col justify-between p-3 sm:p-4 group select-none cursor-pointer transition-colors ${containerBg}`}
              >
                {/* Fundo temático conforme modelo */}
                {m === "fullscreen_slideshow" ? (
                  <>
                    <img
                      src={heroDisplay.image}
                      alt={heroDisplay.headline}
                      className="absolute inset-0 w-full h-full object-cover opacity-45 group-hover:scale-105 transition-transform duration-700 pointer-events-none"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/65 to-black/50 pointer-events-none" />
                  </>
                ) : m === "portfolio_dark_neon" ? (
                  <>
                    <div className="absolute -top-12 -right-12 w-56 h-56 bg-emerald-500/20 blur-3xl rounded-full pointer-events-none" />
                    <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-purple-600/20 blur-3xl rounded-full pointer-events-none" />
                  </>
                ) : m === "kids_school_doodle" ? (
                  <>
                    <div className="absolute -top-10 -right-10 w-44 h-44 bg-amber-300/35 blur-2xl rounded-full pointer-events-none" />
                    <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-sky-300/35 blur-2xl rounded-full pointer-events-none" />
                  </>
                ) : (
                  <>
                    <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-64 h-36 bg-primary/20 blur-3xl rounded-full pointer-events-none" />
                    <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
                  </>
                )}

                {/* Top Pill / Badge da Hero & Modelo Visual */}
                <div className="relative z-10 flex items-center justify-between gap-2 flex-wrap">
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[8px] sm:text-[10px] font-semibold shadow ${isLightPreview ? "bg-white/90 border-zinc-200 text-zinc-700" : "bg-zinc-900/80 border-zinc-700/60 text-zinc-300"}`}>
                    <div className="flex items-center gap-0.5">
                      <span className="h-1 w-1 rounded-full bg-primary" />
                      <span className="h-1 w-1 rounded-full bg-primary" />
                      <span className="h-1 w-1 rounded-full bg-primary" />
                    </div>
                    <span className="tracking-wider uppercase truncate max-w-[180px]">{heroDisplay.badge}</span>
                  </div>

                  {!heroDisplay.isExternal && (heroDisplay as any).modelTitle && (
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[8px] sm:text-[10px] font-bold shadow ${
                      m === "portfolio_dark_neon"
                        ? "bg-emerald-950/90 border-emerald-400/50 text-emerald-300"
                        : isLightPreview
                        ? "bg-purple-50 border-purple-200 text-purple-700"
                        : "bg-purple-950/80 border-purple-500/50 text-purple-200"
                    }`}>
                      <Sparkles className="h-2.5 w-2.5 text-purple-400" />
                      <span className="tracking-wider uppercase truncate max-w-[200px]">{(heroDisplay as any).modelTitle}</span>
                    </div>
                  )}
                </div>

                {/* Corpo Visual Adaptado ao Modelo da Hero */}
                <div className="relative z-10 my-auto w-full">
                  {m === "portfolio_dark_neon" ? (
                    <div className="grid grid-cols-12 gap-3 items-center px-1">
                      <div className="col-span-7 space-y-1.5 text-left">
                        <span className="inline-block px-2 py-0.5 rounded bg-lime-400/15 border border-lime-400/40 text-lime-300 text-[8px] font-extrabold uppercase">
                          Portfólio & Neon Authority
                        </span>
                        <h3 className="font-display text-xs sm:text-sm md:text-base font-black text-white leading-tight line-clamp-2">
                          {heroDisplay.headline}
                        </h3>
                        <p className="text-[8px] sm:text-[10px] text-zinc-400 line-clamp-2">
                          {heroDisplay.subheadline}
                        </p>
                        <div className="flex items-center gap-2 pt-0.5">
                          <span className="px-2.5 py-1 rounded-full bg-lime-400 text-zinc-950 font-black text-[8px] sm:text-[10px]">
                            {heroDisplay.ctaText}
                          </span>
                        </div>
                      </div>
                      <div className="col-span-5 flex flex-col items-center justify-center gap-1.5">
                        <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-lime-400/70 shadow-[0_0_25px_rgba(163,230,53,0.35)]">
                          <img
                            src={heroDisplay.image}
                            alt={heroDisplay.headline}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-1 w-full text-center">
                          {heroDisplay.stats.map((st, i) => (
                            <div key={i} className="bg-zinc-900/90 border border-lime-400/20 rounded-md py-0.5 px-1">
                              <div className="text-[7px] sm:text-[9px] font-black text-lime-300">{st.value}</div>
                              <div className="text-[5px] sm:text-[6px] text-zinc-400 uppercase">{st.label}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : m === "kids_school_doodle" ? (
                    <div className="grid grid-cols-12 gap-3 items-center px-1">
                      <div className="col-span-7 space-y-1.5 text-left">
                        <span className="inline-block px-2 py-0.5 rounded-full bg-amber-400 text-zinc-950 text-[8px] font-black uppercase">
                          ★ Método Divertido & Criativo
                        </span>
                        <h3 className="font-display text-xs sm:text-sm md:text-base font-black text-zinc-900 leading-tight line-clamp-2">
                          {heroDisplay.headline}
                        </h3>
                        <p className="text-[8px] sm:text-[10px] text-zinc-600 line-clamp-2">
                          {heroDisplay.subheadline}
                        </p>
                        <span className="inline-block px-3 py-1 rounded-full bg-sky-500 text-white font-black text-[8px] sm:text-[10px] shadow">
                          {heroDisplay.ctaText}
                        </span>
                      </div>
                      <div className="col-span-5 flex flex-col items-center gap-1.5">
                        <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full overflow-hidden border-4 border-amber-400 shadow-lg rotate-2">
                          <img src={heroDisplay.image} alt={heroDisplay.headline} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                      </div>
                    </div>
                  ) : m === "survey_hero_light" || m === "survey_hero_dark" ? (
                    <div className="grid grid-cols-12 gap-2.5 items-center px-1">
                      <div className="col-span-6 space-y-1 text-left">
                        <h3 className={`font-display text-xs sm:text-sm font-extrabold leading-tight line-clamp-2 ${m === "survey_hero_light" ? "text-zinc-900" : "text-white"}`}>
                          {heroDisplay.headline}
                        </h3>
                        <p className={`text-[8px] sm:text-[10px] line-clamp-2 ${m === "survey_hero_light" ? "text-zinc-600" : "text-zinc-400"}`}>
                          {heroDisplay.subheadline}
                        </p>
                      </div>
                      <div className={`col-span-6 rounded-xl border p-2 sm:p-2.5 space-y-1.5 shadow-lg ${m === "survey_hero_light" ? "bg-zinc-50 border-zinc-200 text-zinc-900" : "bg-zinc-900/95 border-purple-500/40 text-white"}`}>
                        <div className="flex items-center justify-between text-[7px] sm:text-[8px] font-bold uppercase text-primary">
                          <span>Diagnóstico Rápido</span>
                          <span>Etapa 1/3</span>
                        </div>
                        <div className="w-full h-1 rounded-full bg-zinc-700/30 overflow-hidden">
                          <div className="w-1/3 h-full bg-primary rounded-full" />
                        </div>
                        <div className={`text-[8px] sm:text-[9px] font-semibold px-2 py-1 rounded-lg border ${m === "survey_hero_light" ? "bg-white border-zinc-200" : "bg-zinc-950 border-zinc-800"}`}>
                          A) Quero escalar vendas agora
                        </div>
                        <div className="bg-primary text-white text-center font-bold text-[8px] py-1 rounded-lg">
                          Avançar →
                        </div>
                      </div>
                    </div>
                  ) : m === "white_pro" ? (
                    <div className="grid grid-cols-12 gap-3 items-center px-1">
                      <div className="col-span-7 space-y-1.5 text-left">
                        <h3 className="font-display text-xs sm:text-sm md:text-base font-extrabold text-zinc-900 leading-tight line-clamp-2">
                          {heroDisplay.headline}
                        </h3>
                        <p className="text-[8px] sm:text-[10px] text-zinc-600 line-clamp-2">{heroDisplay.subheadline}</p>
                        <span className="inline-block px-3 py-1 rounded-xl bg-zinc-900 text-white font-bold text-[8px] sm:text-[10px]">
                          {heroDisplay.ctaText}
                        </span>
                      </div>
                      <div className="col-span-5 relative">
                        <div className="h-20 sm:h-28 rounded-2xl overflow-hidden border border-zinc-200 shadow-lg">
                          <img src={heroDisplay.image} alt={heroDisplay.headline} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                        <div className="mt-1 flex items-center justify-center gap-1 text-[7px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md py-0.5">
                          <ShieldCheck className="w-2.5 h-2.5" /> Padrão Executivo 4.9★
                        </div>
                      </div>
                    </div>
                  ) : m === "split_image" ? (
                    <div className="grid grid-cols-12 gap-3 items-center px-1">
                      <div className="col-span-7 space-y-1.5 text-left">
                        <h3 className={`font-display text-xs sm:text-sm md:text-base font-extrabold leading-tight line-clamp-2 ${isLightPreview ? "text-zinc-900" : "text-white"}`}>
                          {heroDisplay.headline}
                        </h3>
                        <p className={`text-[8px] sm:text-[10px] line-clamp-2 ${isLightPreview ? "text-zinc-600" : "text-zinc-400"}`}>
                          {heroDisplay.subheadline}
                        </p>
                        <span className="inline-block px-3 py-1 rounded-lg bg-gradient-primary text-white font-bold text-[8px] sm:text-[10px]">
                          {heroDisplay.ctaText}
                        </span>
                      </div>
                      <div className="col-span-5">
                        <div className="h-20 sm:h-28 rounded-xl overflow-hidden border border-zinc-700/60 shadow-lg">
                          <img src={heroDisplay.image} alt={heroDisplay.headline} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                      </div>
                    </div>
                  ) : m === "split_video" ? (
                    <div className="grid grid-cols-12 gap-3 items-center px-1">
                      <div className="col-span-6 space-y-1 text-left">
                        <h3 className={`font-display text-xs sm:text-sm font-extrabold leading-tight line-clamp-2 ${isLightPreview ? "text-zinc-900" : "text-white"}`}>
                          {heroDisplay.headline}
                        </h3>
                        <span className="inline-block px-2.5 py-1 rounded-lg bg-gradient-primary text-white font-bold text-[8px] sm:text-[10px]">
                          {heroDisplay.ctaText}
                        </span>
                      </div>
                      <div className="col-span-6 relative h-20 sm:h-28 rounded-xl overflow-hidden bg-black border border-zinc-700 flex items-center justify-center">
                        <img src={heroDisplay.image} alt={heroDisplay.headline} className="w-full h-full object-cover opacity-55" referrerPolicy="no-referrer" />
                        <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-lg border border-purple-300 absolute">
                          <Play className="w-3.5 h-3.5 ml-0.5 fill-current" />
                        </div>
                      </div>
                    </div>
                  ) : m === "split_lead_form" ? (
                    <div className="grid grid-cols-12 gap-2.5 items-center px-1">
                      <div className="col-span-6 space-y-1 text-left">
                        <h3 className={`font-display text-xs sm:text-sm font-extrabold leading-tight line-clamp-2 ${isLightPreview ? "text-zinc-900" : "text-white"}`}>
                          {heroDisplay.headline}
                        </h3>
                        <p className={`text-[8px] line-clamp-2 ${isLightPreview ? "text-zinc-600" : "text-zinc-400"}`}>{heroDisplay.subheadline}</p>
                      </div>
                      <div className="col-span-6 rounded-xl bg-zinc-950/95 border border-zinc-800 p-2 space-y-1 text-white">
                        <div className="text-[8px] font-bold text-center text-emerald-400">Cadastro Rápido</div>
                        <div className="bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 text-[7px] text-zinc-400">Seu Nome</div>
                        <div className="bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 text-[7px] text-zinc-400">WhatsApp</div>
                        <div className="bg-emerald-600 rounded text-center text-[8px] font-extrabold py-0.5">QUERO RECEBER</div>
                      </div>
                    </div>
                  ) : m === "b2b_metrics" ? (
                    <div className="space-y-2 text-center px-2">
                      <h3 className={`font-display text-xs sm:text-sm font-extrabold line-clamp-1 ${isLightPreview ? "text-zinc-900" : "text-white"}`}>
                        {heroDisplay.headline}
                      </h3>
                      <div className="grid grid-cols-3 gap-1.5">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-1.5">
                          <div className="text-[10px] sm:text-xs font-black text-purple-400">+340%</div>
                          <div className="text-[6px] sm:text-[7px] text-zinc-400 uppercase">Crescimento</div>
                        </div>
                        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-1.5">
                          <div className="text-[10px] sm:text-xs font-black text-emerald-400">99.4%</div>
                          <div className="text-[6px] sm:text-[7px] text-zinc-400 uppercase">Satisfação</div>
                        </div>
                        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-1.5">
                          <div className="text-[10px] sm:text-xs font-black text-amber-400">10 Min</div>
                          <div className="text-[6px] sm:text-[7px] text-zinc-400 uppercase">Resposta</div>
                        </div>
                      </div>
                    </div>
                  ) : m === "editorial_ebook" ? (
                    <div className="grid grid-cols-12 gap-3 items-center px-1">
                      <div className="col-span-7 space-y-1 text-left">
                        <span className="text-[7px] font-bold uppercase tracking-widest text-amber-400">Edição Especial & Guia</span>
                        <h3 className="font-display text-xs sm:text-sm font-extrabold text-white line-clamp-2">{heroDisplay.headline}</h3>
                        <span className="inline-block px-2.5 py-0.5 rounded bg-amber-500 text-zinc-950 font-black text-[8px]">{heroDisplay.ctaText}</span>
                      </div>
                      <div className="col-span-5 flex justify-center">
                        <div className="w-16 h-22 sm:w-20 sm:h-28 rounded-r-xl rounded-l-sm border-l-4 border-amber-400 bg-zinc-900 overflow-hidden shadow-2xl">
                          <img src={heroDisplay.image} alt={heroDisplay.headline} className="w-full h-full object-cover opacity-80" referrerPolicy="no-referrer" />
                        </div>
                      </div>
                    </div>
                  ) : m === "minimal_glow" ? (
                    <div className="text-center space-y-2 px-3">
                      <h3 className={`font-display text-sm sm:text-base font-black tracking-tight line-clamp-2 ${isLightPreview ? "text-zinc-900" : "text-white"}`}>
                        {heroDisplay.headline}
                      </h3>
                      <p className={`text-[9px] sm:text-xs line-clamp-1 max-w-md mx-auto ${isLightPreview ? "text-zinc-600" : "text-zinc-400"}`}>
                        {heroDisplay.subheadline}
                      </p>
                      <span className="inline-block px-4 py-1 rounded-full bg-gradient-primary text-white font-bold text-[9px] shadow-[0_0_20px_rgba(168,85,247,0.5)]">
                        {heroDisplay.ctaText}
                      </span>
                    </div>
                  ) : m === "urgency_counter" ? (
                    <div className="space-y-1.5 text-center px-2">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-950/80 border border-red-500/40 text-[8px] font-bold text-red-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                        EXPIRA EM 14 : 59 : 00
                      </div>
                      <h3 className="font-display text-xs sm:text-sm font-extrabold text-white line-clamp-2">{heroDisplay.headline}</h3>
                      <span className="inline-block px-3 py-1 rounded-lg bg-red-600 text-white font-black text-[9px]">{heroDisplay.ctaText}</span>
                    </div>
                  ) : m === "fullscreen_slideshow" ? (
                    <div className="text-center space-y-1.5 px-3">
                      <h3 className="font-display text-xs sm:text-base font-extrabold text-white drop-shadow line-clamp-2">{heroDisplay.headline}</h3>
                      <span className="inline-block px-3 py-1 rounded-lg bg-gradient-primary text-white font-bold text-[9px]">{heroDisplay.ctaText}</span>
                      <div className="flex items-center justify-center gap-1.5 pt-1">
                        <span className="w-4 h-1 rounded-full bg-white" />
                        <span className="w-1.5 h-1 rounded-full bg-white/40" />
                        <span className="w-1.5 h-1 rounded-full bg-white/40" />
                      </div>
                    </div>
                  ) : (
                    /* centered_showcase e fallback */
                    <div className="text-center space-y-1.5 px-2">
                      <h3 className={`font-display text-xs sm:text-base font-extrabold line-clamp-2 ${isLightPreview ? "text-zinc-900" : "text-white"}`}>
                        {heroDisplay.headline}
                      </h3>
                      <span className="inline-block px-3 py-1 rounded-lg bg-gradient-primary text-white font-bold text-[9px]">{heroDisplay.ctaText}</span>
                      <div className="h-12 sm:h-16 max-w-xs mx-auto rounded-lg overflow-hidden border border-zinc-700/60 mt-1">
                        <img src={heroDisplay.image} alt={heroDisplay.headline} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Barra Inferior com Métricas Reais */}
                <div className={`relative z-10 w-full rounded-xl border py-1 px-2 grid grid-cols-3 gap-1 text-center backdrop-blur-sm ${
                  isLightPreview
                    ? "bg-white/85 border-zinc-200 text-zinc-900"
                    : "bg-zinc-950/80 border-zinc-800/80 text-white"
                }`}>
                  {heroDisplay.stats.map((st, i) => (
                    <div key={i} className={`border-r last:border-none ${isLightPreview ? "border-zinc-200" : "border-zinc-800/80"}`}>
                      <div className={`text-[6px] sm:text-[8px] uppercase tracking-wider font-bold ${isLightPreview ? "text-zinc-500" : "text-zinc-400"}`}>{st.label}</div>
                      <div className="text-[8px] sm:text-[11px] font-extrabold">{st.value}</div>
                    </div>
                  ))}
                </div>

                {/* Hover Action Overlay */}
                <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity z-20 flex items-center justify-center gap-2.5 flex-wrap p-4">
                  {!heroDisplay.isExternal ? (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingLP(selectedLP);
                        }}
                        className="px-3.5 py-2 rounded-xl bg-gradient-primary text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-primary/30 hover:scale-105 transition-transform cursor-pointer"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        <span>Editar no COMET</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDuplicateLP(selectedLP, e)}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg transition-transform hover:scale-105 cursor-pointer"
                        title="Duplicar LP com contadores zerados para comparar resultados de campanhas"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        <span>Duplicar LP</span>
                      </button>
                      <Link
                        to="/lp/$id"
                        params={{ id: selectedLP.id }}
                        target="_blank"
                        onClick={(e) => {
                          e.stopPropagation();
                          try {
                            const dbState = cloudStore.getState();
                            const freshest =
                              (dbState.activePreviewPage?.id === selectedLP.id ? dbState.activePreviewPage : null) ||
                              (dbState.landingPages || []).find((p: any) => p.id === selectedLP.id) ||
                              selectedLP;
                            cloudStore.saveLandingPageOnly(freshest as any, { immediate: true }).catch(() => {});
                          } catch {}
                        }}
                        className="px-3.5 py-2 rounded-xl bg-zinc-900/90 border border-zinc-700 text-white font-bold text-xs flex items-center gap-1.5 hover:bg-zinc-800 transition-colors cursor-pointer"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>Abrir Página</span>
                      </Link>
                    </>
                  ) : (
                    <>
                      {selectedLP.externalUrl && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(selectedLP.externalUrl, "_blank");
                          }}
                          className="px-3.5 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg hover:scale-105 transition-transform cursor-pointer"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span>Abrir Link Externo</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => handleDuplicateLP(selectedLP, e)}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg transition-transform hover:scale-105 cursor-pointer"
                        title="Duplicar LP Externa com contadores zerados"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        <span>Duplicar LP</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSmartLinkLP({ id: selectedLP.id, name: selectedLP.name, slug: selectedLP.slug, lp: selectedLP });
                        }}
                        className="px-3.5 py-2 rounded-xl bg-zinc-900/90 border border-zinc-700 text-white font-bold text-xs flex items-center gap-1.5 hover:bg-zinc-800 transition-colors cursor-pointer"
                      >
                        <Share2 className="h-3.5 w-3.5" />
                        <span>Gerar UTMs</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
              );
            })() : (
              /* ESTADO VAZIO CASO NÃO EXISTA NENHUMA LP CRIADA */
              <div className="w-full aspect-video rounded-2xl md:rounded-3xl border border-dashed border-border/80 bg-muted/20 flex flex-col items-center justify-center p-6 text-center space-y-3">
                <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <Layers className="h-5 w-5" />
                </div>
                <div className="space-y-1 max-w-xs">
                  <h4 className="font-display text-sm font-bold text-foreground">Nenhuma Landing Page Pronta</h4>
                  <p className="text-xs text-muted-foreground">
                    Crie ou importe sua primeira LP para visualizar sua Hero CRO em 16:9 aqui.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAIGenerator(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-primary text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-sm hover:scale-105 transition-all cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Criar com IA</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SEÇÃO: MINHAS LANDING PAGES & FUNIS ATIVOS */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-bold flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-primary" /> Painel de Gerenciamento
            </div>
            <h2 className="font-display text-xl font-bold mt-0.5">
              Suas Landing Pages Ativas ({landingPages.length})
            </h2>
            <p className="text-xs text-muted-foreground">
              Atribua pesquisas, monitore métricas de conversão e gerencie seus funis em um só lugar.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {landingPages.length > 1 && (
              <button 
                type="button"
                onClick={() => setShowCleanDbConfirm(true)}
                className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 font-bold text-xs inline-flex items-center gap-1.5 transition-all text-amber-500 cursor-pointer"
                title="Remove todas as LPs de teste e mantém apenas 1"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Limpar e Manter Apenas 1 LP</span>
              </button>
            )}

            {landingPages.length > 0 && (
              <button
                type="button"
                onClick={toggleSelectAll}
                className="px-3 py-2 rounded-xl bg-card border border-border hover:bg-muted font-bold text-xs inline-flex items-center gap-1.5 transition-all text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                <span>{selectedLpIds.length === landingPages.length ? "Desmarcar Todas" : "Selecionar Todas"}</span>
              </button>
            )}

            <button 
              type="button"
              onClick={() => setShowExternalModal(true)}
              className="px-3.5 py-2 rounded-xl bg-card border border-border hover:bg-muted font-bold text-xs inline-flex items-center gap-1.5 transition-all shadow-sm cursor-pointer text-muted-foreground hover:text-foreground"
            >
              <Globe className="h-3.5 w-3.5 text-blue-400" /> + Conectar URL
            </button>

            <button 
              type="button"
              onClick={handleCreateBlankComet}
              className="px-4 py-2 rounded-xl bg-card border border-border hover:bg-muted font-bold text-xs inline-flex items-center gap-1.5 transition-all shadow-sm cursor-pointer text-foreground"
            >
              <Plus className="h-4 w-4 text-primary" /> Nova Página
            </button>
          </div>
        </div>

        {/* BARRA FLUTUANTE DE AÇÃO EM MASSA QUANDO HÁ ITENS SELECIONADOS */}
        {selectedLpIds.length > 0 && (
          <div className="p-4 rounded-2xl bg-zinc-900 border border-primary/40 shadow-2xl flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2 text-xs text-white font-bold">
              <span className="h-2 w-2 rounded-full bg-primary animate-ping" />
              <span>{selectedLpIds.length} {selectedLpIds.length === 1 ? "Landing Page selecionada" : "Landing Pages selecionadas"}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedLpIds([])}
                className="px-3 py-1.5 rounded-xl border border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancelar Seleção
              </button>
              <button
                type="button"
                onClick={() => setShowBulkDeleteConfirm(true)}
                className="px-4 py-1.5 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Apagar Selecionadas ({selectedLpIds.length})</span>
              </button>
            </div>
          </div>
        )}

        {landingPages.length === 0 ? (
          <div className="bg-card/40 border border-dashed border-border/80 rounded-3xl p-12 text-center space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mx-auto">
              <Bot className="h-6 w-6" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="font-display text-base font-bold text-foreground">Nenhuma Landing Page criada ainda</h3>
              <p className="text-xs text-muted-foreground">
                Gere uma página com IA em segundos, use um de nossos templates validados de alta conversão, ou traga uma URL externa.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowAIGenerator(true)}
                className="px-4 py-2 rounded-xl bg-gradient-primary text-primary-foreground font-bold text-xs inline-flex items-center gap-1.5 transition-all shadow-elegant cursor-pointer hover:scale-105"
              >
                <Sparkles className="h-3.5 w-3.5" /> Criar com IA
              </button>
              <button
                type="button"
                onClick={() => setShowTemplatePicker(true)}
                className="px-4 py-2 rounded-xl bg-background border border-border hover:bg-muted font-bold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer text-foreground shadow-sm"
              >
                <Layout className="h-3.5 w-3.5 text-primary" /> Ver Templates
              </button>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {landingPages.map((lp) => {
              const isExternal = Boolean(lp.externalUrl || lp.template === "External" || lp.type === "URL Externa");
              const linkedSurvey = surveys.find((s) => s.id === lp.surveyId);
              const isSelected = selectedLP?.id === lp.id;
              const isChecked = selectedLpIds.includes(lp.id);

              return (
                <div 
                  key={lp.id} 
                  onClick={() => setSelectedLPId(lp.id)}
                  className={cn(
                    "group bg-card border rounded-3xl p-5 shadow-card transition-all flex flex-col justify-between cursor-pointer relative",
                    isChecked && "ring-2 ring-destructive/80 border-destructive bg-destructive/5",
                    isSelected && !isChecked && "border-primary ring-2 ring-primary/20 shadow-md bg-primary/[0.02]",
                    !isSelected && !isChecked && "border-border hover:border-primary/50 hover:shadow-md"
                  )}
                >
                  <div className="space-y-4">
                    {/* Topo do Card: Checkbox de Seleção em Massa, Ícone, Status e Excluir */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        {/* Checkbox de Seleção Múltipla */}
                        <div 
                          onClick={(e) => toggleSelectLp(lp.id, e)}
                          className={cn(
                            "h-6 w-6 rounded-lg border flex items-center justify-center transition-all cursor-pointer shadow-sm",
                            isChecked 
                              ? "bg-primary border-primary text-primary-foreground font-bold" 
                              : "border-border bg-background hover:border-primary"
                          )}
                          title={isChecked ? "Desmarcar" : "Selecionar para Ação em Massa"}
                        >
                          {isChecked && <CheckCircle2 className="h-4 w-4" />}
                        </div>

                        <div className={cn(
                          "h-10 w-10 rounded-2xl grid place-items-center transition-colors",
                          isExternal ? "bg-blue-50 text-blue-600 border border-blue-100" : "bg-primary/10 text-primary border border-primary/20"
                        )}>
                          {isExternal ? (
                            <Globe className="h-5 w-5" />
                          ) : lp.surveyId ? (
                            <ClipboardList className="h-5 w-5 text-emerald-600" />
                          ) : (
                            <Sparkles className="h-5 w-5 text-primary" />
                          )}
                        </div>

                        {isSelected && (
                          <span className="text-[9px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full bg-primary text-primary-foreground flex items-center gap-1 shadow-sm animate-in fade-in">
                            <Eye className="h-3 w-3" /> No Preview
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Se a LP já rodou (possui histórico de visitas ou leads), não entra mais em Teste: alterna somente entre Ativa e Pausada
                            const hasHistory = (Number(lp.visits) || 0) > 0 || (Number(lp.leads) || 0) > 0;
                            
                            let nextStatus: "Ativa" | "Teste" | "Pausada" = "Ativa";
                            if (lp.status === "Ativa") {
                              nextStatus = hasHistory ? "Pausada" : "Teste";
                            } else if (lp.status === "Teste") {
                              nextStatus = "Pausada";
                            } else {
                              // Pausada -> Ativa
                              nextStatus = "Ativa";
                            }

                            updateLandingPage(lp.id, { status: nextStatus });
                          }} 
                          className={cn(
                            "text-[9px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer border",
                            lp.status === "Ativa" 
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" 
                              : lp.status === "Teste"
                              ? "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800"
                              : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                          )}
                          title={
                            ((Number(lp.visits) || 0) > 0 || (Number(lp.leads) || 0) > 0) && lp.status !== "Teste"
                              ? `Status atual: ${lp.status}. Esta página já possui histórico real e alterna entre Ativa e Pausada.`
                              : `Status atual: ${lp.status}. Clique para alternar (Ativa → Teste → Pausada). Ao sair de Teste para Ativa ou Pausada, zera os contadores e limpa os dados de teste.`
                          }
                        >
                          {lp.status === "Ativa" ? (
                            <Play className="h-2.5 w-2.5" />
                          ) : lp.status === "Teste" ? (
                            <FlaskConical className="h-2.5 w-2.5 text-purple-600 dark:text-purple-400 animate-pulse" />
                          ) : (
                            <Pause className="h-2.5 w-2.5" />
                          )}
                          {lp.status}
                        </button>
                        <button 
                          type="button"
                          onClick={(e) => handleDuplicateLP(lp, e)} 
                          className="h-7 w-7 rounded-lg border border-border hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-200 text-muted-foreground grid place-items-center transition-colors cursor-pointer"
                          title="Duplicar Landing Page (Criar cópia com métricas zeradas)"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button 
                          type="button"
                          onClick={(e) => { 
                            e.stopPropagation();
                            setLpToDelete(lp);
                          }} 
                          className="h-7 w-7 rounded-lg border border-border hover:bg-destructive/10 hover:text-destructive text-muted-foreground grid place-items-center transition-colors cursor-pointer"
                          title="Excluir Página"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Título e Badges de Identificação */}
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={cn(
                          "text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border inline-flex items-center gap-1",
                          isExternal 
                            ? "bg-blue-50 text-blue-700 border-blue-200" 
                            : lp.type === "Gerada por IA"
                            ? "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-700/50"
                            : "bg-primary/10 text-primary border-primary/20"
                        )}>
                          {lp.type === "Gerada por IA" && <Sparkles className="h-2.5 w-2.5 text-amber-500" />}
                          {isExternal ? "URL Externa (Modelo 1)" : (lp.type || "COMET CRO")}
                        </span>

                        {lp.surveyId && (
                          <span className="text-[8px] uppercase tracking-widest text-emerald-700 font-bold border border-emerald-200 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="h-2.5 w-2.5" /> Pesquisa Ativa
                          </span>
                        )}
                      </div>

                      <h3 className="font-display text-base font-bold truncate text-foreground">
                        {lp.name || lp.title || "Landing Page"}
                      </h3>

                      {isExternal && lp.externalUrl && (
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground truncate">
                          <LinkIcon className="h-3 w-3 shrink-0 text-blue-600" />
                          <span 
                            className="truncate hover:underline cursor-pointer" 
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(lp.externalUrl, "_blank");
                            }}
                          >
                            {lp.externalUrl}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Métricas: Visitas, Leads, Conversão */}
                    {(() => {
                      const cardLeads = Number(lp.leads || lp.leads_count || 0);
                      const cardVisits = Math.max(Number(lp.visits || lp.viewsCount || 0), cardLeads);
                      const cardConv = cardVisits > 0 ? Math.min(100, Math.round((cardLeads / cardVisits) * 100)) : 0;
                      return (
                        <div className="grid grid-cols-3 gap-2 pt-1">
                          <Stat icon={Eye} label="Visitas" value={cardVisits.toLocaleString("pt-BR")} />
                          <Stat icon={Users} label="Leads" value={cardLeads.toString()} />
                          <Stat icon={TrendingUp} label="Conv." value={`${cardConv}%`} />
                        </div>
                      );
                    })()}

                    {/* ATRIBUIÇÃO DE PESQUISA (SOLICITADO PELO USUÁRIO) */}
                    <div className="pt-3 border-t border-border space-y-1.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground font-semibold flex items-center gap-1.5">
                          <ClipboardList className="h-3.5 w-3.5 text-primary" /> Pesquisa:
                        </span>
                        {lp.surveyId ? (
                          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {linkedSurvey?.name || "Atribuída"}
                          </span>
                        ) : (
                          <span className="text-[9px] text-muted-foreground italic">
                            Nenhuma
                          </span>
                        )}
                      </div>

                      <select
                        value={lp.surveyId || ""}
                        onChange={(e) => {
                          const selectedId = e.target.value || null;
                          updateLandingPage(lp.id, { surveyId: selectedId });
                          toast.success(
                            selectedId 
                              ? "Pesquisa atribuída à Landing Page!" 
                              : "Pesquisa desvinculada."
                          );
                        }}
                        className="w-full bg-background hover:bg-muted/40 border border-border focus:border-primary rounded-xl px-2.5 py-1.5 text-xs text-foreground font-medium outline-none cursor-pointer transition-colors shadow-sm"
                      >
                        <option value="">Nenhuma pesquisa (Padrão)</option>
                        {surveys.map((s: any) => (
                          <option key={s.id} value={s.id}>
                            📋 {s.name} ({s.questions?.length || 0} perguntas)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Barra de Ações do Card */}
                  <div className="mt-5 flex items-center gap-2 pt-3 border-t border-border" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedLPId(lp.id);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className={cn(
                        "h-8 px-2.5 rounded-xl border text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm",
                        isSelected 
                          ? "border-primary bg-primary/10 text-primary" 
                          : "border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground"
                      )}
                      title="Visualizar a Hero desta LP no preview 16:9 do topo"
                    >
                      <Monitor className="h-3.5 w-3.5" />
                      <span className="text-[11px]">{isSelected ? "No Preview" : "Ver Hero"}</span>
                    </button>

                    <Link 
                      to="/lp/$id" 
                      params={{ id: lp.id }} 
                      target="_blank" 
                      onClick={(e) => {
                        e.stopPropagation();
                        try {
                          const dbState = cloudStore.getState();
                          const freshest =
                            (dbState.activePreviewPage?.id === lp.id ? dbState.activePreviewPage : null) ||
                            (dbState.landingPages || []).find((p: any) => p.id === lp.id) ||
                            lp;
                          cloudStore.saveLandingPageOnly(freshest as any, { immediate: true }).catch(() => {});
                        } catch {}
                      }}
                      className="flex-1 text-[11px] font-bold py-2 rounded-xl border border-border bg-background hover:bg-muted inline-flex items-center justify-center gap-1.5 text-foreground transition-colors shadow-sm"
                    >
                      <ExternalLink className="h-3 w-3 text-primary" /> 
                      <span>{isExternal ? "Acessar" : "Abrir"}</span>
                    </Link>

                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSmartLinkLP({ id: lp.id, name: lp.name, slug: lp.slug, lp });
                      }}
                      className="h-8 px-2.5 rounded-xl border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground grid place-items-center transition-colors cursor-pointer shadow-sm"
                      title="Gerar Links de Rastreamento (UTMs para Instagram, WhatsApp, Ads, etc.)"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                    </button>

                    <button 
                      type="button"
                      onClick={(e) => handleDuplicateLP(lp, e)}
                      className="h-8 px-2.5 rounded-xl border border-border bg-background hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-200 text-muted-foreground grid place-items-center transition-colors cursor-pointer shadow-sm"
                      title="Duplicar Landing Page (Criar cópia com métricas de visitas e leads zeradas)"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>

                    {!isExternal && (
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingLP(lp);
                        }} 
                        className="h-8 px-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                        title="Abrir no Construtor Visual COMET"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        <span>Editar</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* (Editor ativo é renderizado no early-return acima quando editingLP !== null) */}

      {/* MODAL GERADOR IA COMET ENGINE */}
      {showAIGenerator && (
        <AIModalGenerator
          isOpen={showAIGenerator}
          onClose={() => setShowAIGenerator(false)}
          onPageGenerated={async (generatedPage) => {
            const genHeroModel = generatedPage.hero?.model || generatedPage.heroModel || (generatedPage as any).hero_model || "split_image";
            const stableId =
              generatedPage.id && /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(generatedPage.id)
                ? generatedPage.id
                : (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `lp_${uid()}`);
            const newLP = {
              ...generatedPage,
              id: stableId,
              heroModel: genHeroModel,
              hero_model: genHeroModel,
              hero: generatedPage.hero ? { ...generatedPage.hero, model: genHeroModel } : { model: genHeroModel },
              name: generatedPage.title,
              title: generatedPage.title,
              status: "Ativa",
              visits: 0,
              leads: 0,
              conv: 0,
              type: "Gerada por IA",
              template: "COMET",
            };
            const savedLP = await addLandingPage(newLP as any);
            setShowAIGenerator(false);
            if (savedLP) {
              setSelectedLPId(savedLP.id);
              toast.success("Landing Page criada com IA!", {
                description: `"${savedLP.name}" foi adicionada a 'Suas Landing Pages Ativas' e carregada no Preview 16:9.`,
                action: {
                  label: "Abrir no Editor",
                  onClick: () => setEditingLP(savedLP),
                },
              });
            } else {
              setSelectedLPId(newLP.id);
              toast.success("Landing Page criada com IA!", {
                description: `"${newLP.name}" foi adicionada a 'Suas Landing Pages Ativas' e carregada no Preview 16:9.`,
                action: {
                  label: "Abrir no Editor",
                  onClick: () => setEditingLP(newLP),
                },
              });
            }
          }}
        />
      )}

      {/* MODAL SELETOR DE TEMPLATES CRO */}
      {showTemplatePicker && (
        <TemplatePickerModal
          isOpen={showTemplatePicker}
          onClose={() => setShowTemplatePicker(false)}
          onSelectTemplate={handleSelectPresetTemplate}
        />
      )}

      {/* MODAL CONECTAR URL EXTERNA (MODELO 1) */}
      {showExternalModal && (
        <ExternalLPModal
          isOpen={showExternalModal}
          onClose={() => setShowExternalModal(false)}
          surveys={surveys}
          onSaveExternalLP={handleSaveExternalLP}
        />
      )}

      {/* MODAL SMART LINKS & RASTREAMENTO */}
      {smartLinkLP && (
        <SmartLinkModal 
          lpId={smartLinkLP.id} 
          lpName={smartLinkLP.name} 
          slug={smartLinkLP.slug}
          lp={smartLinkLP.lp}
          onClose={() => setSmartLinkLP(null)} 
        />
      )}

      {/* MODAL CONFIRMAÇÃO DE EXCLUSÃO EM MASSA */}
      {showBulkDeleteConfirm && (
        <div 
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowBulkDeleteConfirm(false)}
        >
          <div 
            className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-2xl bg-destructive/10 text-destructive border border-destructive/20 grid place-items-center shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="space-y-1.5 flex-1 min-w-0">
                <h3 className="font-display text-lg font-bold text-foreground">
                  Excluir {selectedLpIds.length} Landing Pages?
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Tem certeza que deseja apagar permanentemente as <strong className="text-foreground font-semibold">{selectedLpIds.length} Landing Pages selecionadas</strong>? Esta ação é irreversível e desativará todos os links vinculados a elas.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setShowBulkDeleteConfirm(false)}
                className="px-4 py-2 rounded-xl border border-border bg-muted/40 hover:bg-muted text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleBulkDeleteExecute}
                className="px-4 py-2 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-bold flex items-center gap-1.5 shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Sim, Excluir {selectedLpIds.length} Páginas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAÇÃO DE LIMPEZA DE BANCO (MANTER APENAS 1 LP) */}
      {showCleanDbConfirm && (
        <div 
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowCleanDbConfirm(false)}
        >
          <div 
            className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 grid place-items-center shrink-0">
                <Trash2 className="h-6 w-6" />
              </div>
              <div className="space-y-1.5 flex-1 min-w-0">
                <h3 className="font-display text-lg font-bold text-foreground">
                  Limpar Banco e Manter Apenas 1 LP?
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Esta ação irá remover todas as Landing Pages de teste/fakes e manterá apenas <strong className="text-foreground font-semibold">1 Landing Page Oficial</strong> no seu painel.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setShowCleanDbConfirm(false)}
                className="px-4 py-2 rounded-xl border border-border bg-muted/40 hover:bg-muted text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCleanDbExecute}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Confirmar Limpeza (Manter Apenas 1)
              </button>
            </div>
          </div>
        </div>
      )}
      {lpToDelete && (
        <div 
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setLpToDelete(null)}
        >
          <div 
            className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-2xl bg-destructive/10 text-destructive border border-destructive/20 grid place-items-center shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="space-y-1.5 flex-1 min-w-0">
                <h3 className="font-display text-lg font-bold text-foreground">
                  Excluir Landing Page?
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Tem certeza que deseja excluir permanentemente a página <strong className="text-foreground font-semibold">"{lpToDelete.name || lpToDelete.title || "esta página"}"</strong>? Esta ação removerá a Landing Page da sua lista e desativará os links públicos.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setLpToDelete(null)}
                className="px-4 py-2 rounded-xl border border-border bg-muted/40 hover:bg-muted text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleConfirmDelete(lpToDelete.id)}
                className="px-4 py-2 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-bold flex items-center gap-1.5 shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Sim, Excluir Página
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-card/40 border border-border p-2">
      <div className="flex items-center gap-1 text-[8px] uppercase tracking-widest text-muted-foreground font-bold">
        <Icon className="h-2.5 w-2.5" /> {label}
      </div>
      <div className="font-display text-xs font-bold mt-0.5">{value}</div>
    </div>
  );
}
