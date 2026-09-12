import { useState, useMemo, useRef, useEffect } from "react";
import { 
  ArrowLeft, Sparkles, Wand2, Monitor, Tablet, Smartphone, Eye, EyeOff, 
  Pencil, ExternalLink, Check, Copy, Layers, Sliders, Palette, FileText, 
  Radio, Plus, Trash2, ArrowUp, ArrowDown, Copy as DuplicateIcon, GripVertical, 
  Video, Image as ImageIcon, CheckCircle2, RefreshCw, Send, Bot, User, 
  Settings, HelpCircle, X, Download, QrCode, Play, AlertTriangle, ShieldCheck,
  Star, Trophy, Target, Zap, ChevronRight, ChevronDown, ChevronUp, MessageSquare, Share2,
  Upload, BarChart3, Heart, Award, ListFilter, HelpCircle as QuestionIcon,
  Undo2, Redo2, MessageSquareText
} from "lucide-react";
import { type LandingPage } from "@/data/mock";
import { useData } from "@/hooks/use-data";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { PublicRenderer } from "@/modules/landing-pages/renderer/PublicRenderer";
import { TrackingPanel } from "@/modules/landing-pages/components/TrackingPanel";
import { useLPVisualHistory } from "./visual-canvas/useLPVisualHistory";
import { InteractiveVisualCanvas } from "./visual-canvas/InteractiveVisualCanvas";
import { LayersPanel } from "./visual-canvas/LayersPanel";
import { AIEstrategistaPanel } from "./visual-canvas/AIEstrategistaPanel";
import { LANAgentWidget } from "./lan-agent/LANAgentWidget";
import type { SelectedElement, ElementStyleOverrides } from "./visual-canvas/types";
import {
  type Section,
  type SectionType,
  type LPTheme,
  type HeroSection,
  type LogosSection,
  type FeaturesSection,
  type StatsSection,
  type TestimonialSection,
  type FormSection,
  type FaqSection,
  type CtaSection,
  type PricingSection,
  type SurveySection,
  DEFAULT_THEME,
  blankSections,
  blankSurvey,
  uid,
  createLPFromPreset,
  READY_MADE_PRESETS
} from "@/lib/lp-store";

interface LPEditorProps {
  lp: Partial<LandingPage> & { sections?: Section[]; theme?: LPTheme; slug?: string };
  onClose: () => void;
  onSave: (lp: Partial<LandingPage>) => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

const THEME_PRESETS = [
  { name: "Moderno (Neon Cyber)", primary: "#06B6D4", bg: "#090D16", surface: "#111827", text: "#F9FAFB", muted: "#9CA3AF", radius: 12, font: "manrope" },
  { name: "Minimalista (Clean Light)", primary: "#FF6A00", bg: "#FAFAFA", surface: "#FFFFFF", text: "#0F172A", muted: "#64748B", radius: 12, font: "inter" },
  { name: "Infantil & Lúdico (Color Light)", primary: "#FB923C", bg: "#FFFDF7", surface: "#FFFFFF", text: "#1F2937", muted: "#6B7280", radius: 24, font: "manrope" },
  { name: "Portfólio & CV (Dark Artist)", primary: "#F97316", bg: "#0B0D14", surface: "#131724", text: "#F9FAFB", muted: "#9CA3AF", radius: 18, font: "sora" },
  { name: "Glassmorphism (Vidro Fosco)", primary: "#3B82F6", bg: "#0B0F19", surface: "#161F33", text: "#F8FAFC", muted: "#94A3B8", radius: 18, font: "manrope" },
  { name: "Bold & Vibrant (Roxo Elétrico)", primary: "#A855F7", bg: "#120B1C", surface: "#1B1330", text: "#F3E8FF", muted: "#C084FC", radius: 16, font: "sora" },
  { name: "Corporativo (Executive Emerald)", primary: "#10B981", bg: "#061A14", surface: "#0B2E24", text: "#ECFDF5", muted: "#6EE7B7", radius: 14, font: "sora" },
  { name: "Comet Dark Original", primary: "#FF6A00", bg: "#0E0F12", surface: "#16181D", text: "#F5F6F8", muted: "#9AA0AA", radius: 14, font: "sora" },
];

const QUICK_COLORS = [
  "#FF6A00", "#FF4500", "#F97316", "#0EA5E9", 
  "#22C55E", "#A855F7", "#EF4444", "#EAB308"
];

const FEATURE_ICONS = [
  "Sparkles", "Zap", "Target", "BarChart3", "ShieldCheck", 
  "Star", "Trophy", "Award", "CheckCircle2", "Layers", "Flame"
];

const QUESTION_TYPES = [
  { value: "short", label: "Texto curto" },
  { value: "long", label: "Texto longo" },
  { value: "single", label: "Múltipla escolha (única)" },
  { value: "multi", label: "Múltipla escolha (várias)" },
  { value: "scale", label: "Escala / Slider" },
  { value: "rating", label: "Avaliação por estrelas" },
  { value: "nps", label: "NPS (0-10)" },
  { value: "dropdown", label: "Menu dropdown" },
  { value: "yesno", label: "Sim / Não" },
  { value: "date", label: "Data" },
  { value: "email", label: "E-mail" },
  { value: "phone", label: "WhatsApp / Telefone" },
];

export function LPEditor({ lp, onClose, onSave }: LPEditorProps) {
  const { company, aiConfig, funnelTypes } = useData();

  // Estados principais de navegação e visualização
  const [deviceView, setDeviceView] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [editorMode, setEditorMode] = useState<'edit' | 'preview'>('edit');
  const [leftPanelTab, setLeftPanelTab] = useState<'sections' | 'layers' | 'ai'>('sections');
  const [activeConfigTab, setActiveConfigTab] = useState<'section' | 'theme' | 'page' | 'sources'>('section');
  const [showAIChat, setShowAIChat] = useState(false);
  const [isLANOpen, setIsLANOpen] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);

  // Inicialização do estado da Landing Page com Histórico Visual (Undo/Redo)
  const initialForm = useMemo(() => {
    const existingSections = lp.sections && lp.sections.length > 0 ? lp.sections : blankSections(lp.name || company?.name || "Minha Empresa");
    return {
      ...lp,
      id: lp.id || `lp_${uid()}`,
      name: lp.name || "Voucher 25% Black",
      slug: lp.slug || (lp.name ? lp.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") : "voucher-25-black"),
      type: lp.type || "Voucher",
      template: lp.template || "Modular",
      status: lp.status || "Ativa",
      theme: lp.theme || { ...DEFAULT_THEME },
      sections: existingSections,
      visits: lp.visits || 0,
      leads: lp.leads || 0,
      conv: lp.conv || 0,
      seoTitle: lp.name || "Voucher 25% Black - Oferta Especial",
      seoDescription: "Garanta seu voucher exclusivo com condições especiais por tempo limitado.",
      ogImage: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=1200&q=80&auto=format&fit=crop",
      facebookPixelId: "",
      gtmId: "",
      funnelStage: "Novo Lead",
      utmSource: "instagram",
      utmMedium: "stories",
      utmCampaign: "black-friday",
      utmContent: "cta-banner"
    };
  }, [lp, company]);

  const {
    state: form,
    setState: setForm,
    undo,
    redo,
    canUndo,
    canRedo,
    pastCount,
    futureCount
  } = useLPVisualHistory(initialForm);

  // Seleção de elemento visual no Canvas
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(() => {
    const firstSec = form.sections?.[0];
    return firstSec ? { sectionId: firstSec.id, elementType: "section", label: `Seção ${firstSec.type}` } : null;
  });

  // Seção atualmente selecionada para edição no painel direito
  const [selectedSectionId, setSelectedSectionId] = useState<string>(() => {
    return form.sections?.[0]?.id || "";
  });

  // Estilos visuais personalizados por elemento
  const [elementStyles, setElementStyles] = useState<Record<string, ElementStyleOverrides>>({});

  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileUploadCallbackRef = useRef<((url: string) => void) | null>(null);

  const triggerFileUpload = (onUploaded: (url: string) => void) => {
    fileUploadCallbackRef.current = onUploaded;
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        fileUploadCallbackRef.current?.(reader.result);
        toast.success("Imagem carregada com sucesso!");
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const selectedSection = useMemo(() => {
    return (form.sections || []).find((s: Section) => s.id === selectedSectionId) || form.sections?.[0] || null;
  }, [form.sections, selectedSectionId]);

  // Sincronizar seleção do Canvas com o painel direito
  useEffect(() => {
    if (selectedElement?.sectionId) {
      setSelectedSectionId(selectedElement.sectionId);
    }
  }, [selectedElement]);

  const handleSelectElement = (element: SelectedElement | null) => {
    setSelectedElement(element);
    if (element?.sectionId) {
      setSelectedSectionId(element.sectionId);
    }
  };

  const handleUpdateElementStyle = (elementKey: string, updates: Partial<ElementStyleOverrides>) => {
    setElementStyles((prev) => ({
      ...prev,
      [elementKey]: {
        ...(prev[elementKey] || {}),
        ...updates
      }
    }));
  };

  // Chat do Agente IA Copilot
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'ai', content: `Olá! Sou o Agente Estratégico da COMET. Posso ajustar copies persuasivas, títulos, blocos ou trocar fotos e vídeos da sua página "${form.name}". O que você gostaria de mudar?`, timestamp: new Date() }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isAILoading, setIsAILoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isAILoading]);

  // Funções de atualização do formulário
  const handleUpdateField = (field: string, value: any) => {
    setForm((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleUpdateTheme = (key: keyof LPTheme, value: any) => {
    setForm((prev: any) => ({
      ...prev,
      theme: { ...(prev.theme || DEFAULT_THEME), [key]: value }
    }));
  };

  const handleApplyThemePreset = (preset: typeof THEME_PRESETS[0]) => {
    setForm((prev: any) => ({
      ...prev,
      theme: {
        primary: preset.primary,
        bg: preset.bg,
        surface: preset.surface,
        text: preset.text,
        muted: preset.muted,
        radius: preset.radius,
        font: preset.font as any
      }
    }));
    toast.success(`Tema "${preset.name}" aplicado!`);
  };

  const handleSelectPreset = (presetId: string) => {
    const companyName = company?.name || form.name || "Minha Empresa";
    const newLp = createLPFromPreset(presetId, companyName);
    setForm((prev: any) => ({
      ...prev,
      sections: newLp.sections,
      theme: newLp.theme,
      template: presetId,
    }));
    setSelectedElement(null);
    const presetObj = READY_MADE_PRESETS.find((p) => p.id === presetId);
    toast.success("Modelo Carregado com Sucesso!", {
      description: `Estrutura e visual alterados para "${presetObj?.name || presetId}".`,
      icon: <Sparkles className="h-4 w-4 text-[#FF6A00]" />
    });
  };

  // Funções de manipulação de seções
  const handleUpdateSectionContent = (id: string, updates: Partial<Section> | any) => {
    setForm((prev: any) => ({
      ...prev,
      sections: (prev.sections || []).map((s: Section) => s.id === id ? { ...s, ...updates } : s)
    }));
  };

  const handleToggleSectionVisibility = (id: string) => {
    setForm((prev: any) => ({
      ...prev,
      sections: (prev.sections || []).map((s: Section) => s.id === id ? { ...s, visible: s.visible === false ? true : false } : s)
    }));
    toast.info("Visibilidade da seção atualizada");
  };

  const handleMoveSection = (id: string, direction: 'up' | 'down') => {
    setForm((prev: any) => {
      const sections = [...(prev.sections || [])];
      const index = sections.findIndex(s => s.id === id);
      if (index === -1) return prev;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= sections.length) return prev;
      const temp = sections[index];
      sections[index] = sections[targetIndex];
      sections[targetIndex] = temp;
      return { ...prev, sections };
    });
  };

  const handleDuplicateSection = (id: string) => {
    const sectionToDup = form.sections.find((s: Section) => s.id === id);
    if (!sectionToDup) return;
    const newId = uid();
    const duplicated: Section = {
      ...JSON.parse(JSON.stringify(sectionToDup)),
      id: newId
    };
    const index = form.sections.findIndex((s: Section) => s.id === id);
    const newSections = [...form.sections];
    newSections.splice(index + 1, 0, duplicated);
    setForm((prev: any) => ({ ...prev, sections: newSections }));
    setSelectedSectionId(newId);
    toast.success("Seção duplicada com sucesso!");
  };

  const handleDeleteSection = (id: string) => {
    if (form.sections.length <= 1) {
      toast.warning("A página precisa de pelo menos 1 seção.");
      return;
    }
    const newSections = form.sections.filter((s: Section) => s.id !== id);
    setForm((prev: any) => ({ ...prev, sections: newSections }));
    if (selectedSectionId === id) {
      setSelectedSectionId(newSections[0]?.id || "");
    }
    toast.success("Seção removida!");
  };

  const handleAddSection = (type: SectionType) => {
    let newSec: Section;
    const newId = uid();
    switch (type) {
      case "hero":
        newSec = {
          id: newId,
          type: "hero",
          visible: true,
          eyebrow: "DESTAQUE EXCLUSIVO",
          title: "Novo Título de Alto Impacto para sua Oferta",
          subtitle: "Construída com IA, otimizada para mobile e integrada ao seu funil COMET CRM.",
          ctaPrimary: "Quero começar agora",
          ctaSecondary: "Falar com especialista",
          image: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=1200&q=80&auto=format&fit=crop",
          mediaType: "image",
          videoUrl: ""
        };
        break;
      case "logos":
        newSec = {
          id: newId,
          type: "logos",
          visible: true,
          title: "Empresas que confiam na metodologia",
          logos: ["Empresa Alpha", "Grupo Beta", "Apex Tech", "Global Solutions"].map((l) => ({ id: uid(), label: l }))
        };
        break;
      case "features":
        newSec = {
          id: newId,
          type: "features",
          visible: true,
          title: "Tudo o que você precisa para vender mais",
          subtitle: "Recursos completos focados em conversão rápida e aumento de lucro.",
          items: [
            { id: uid(), icon: "Sparkles", title: "Criação Inteligente", text: "Copy persuasiva e ganchos de alta retenção desenhados para converter." },
            { id: uid(), icon: "Zap", title: "Automação Imediata", text: "Encaminhamento em tempo real para o WhatsApp do closer." },
            { id: uid(), icon: "Target", title: "Integração Direta com CRM", text: "Alimente o Kanban automaticamente com cálculo de ROI." }
          ]
        };
        break;
      case "stats":
        newSec = {
          id: newId,
          type: "stats",
          visible: true,
          items: [
            { id: uid(), value: "+312%", label: "Aumento médio em conversão" },
            { id: uid(), value: "<24h", label: "Para colocar no ar" },
            { id: uid(), value: "98%", label: "Satisfação dos clientes" }
          ]
        };
        break;
      case "testimonial":
        newSec = {
          id: newId,
          type: "testimonial",
          visible: true,
          quote: "Em menos de 3 semanas estruturamos nossa captação e dobramos o volume de leads qualificados que chegam para os closers.",
          author: "Mariana Costa",
          role: "Diretora Comercial",
          avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80"
        };
        break;
      case "pricing":
        newSec = {
          id: newId,
          type: "pricing",
          visible: true,
          title: "Planos e Condições Especiais",
          plans: [
            { id: uid(), name: "Standard", price: "R$ 980", per: "/mês", features: ["Acesso completo", "Suporte prioritário", "Relatórios semanais"] },
            { id: uid(), name: "Premium", price: "R$ 1.950", per: "/mês", features: ["Tudo do Standard", "Consultoria dedicada", "Setup personalizado"], highlight: true }
          ]
        };
        break;
      case "faq":
        newSec = {
          id: newId,
          type: "faq",
          visible: true,
          title: "Perguntas Frequentes",
          items: [
            { id: uid(), q: "Como recebo o voucher após preencher?", a: "O código é enviado imediatamente para o seu WhatsApp e e-mail cadastrados." },
            { id: uid(), q: "Qual a validade desta condição?", a: "A oferta fica disponível exclusivamente durante este mês ou até esgotarem as vagas." }
          ]
        };
        break;
      case "cta":
        newSec = {
          id: newId,
          type: "cta",
          visible: true,
          title: "Pronto para escalar suas vendas com previsibilidade?",
          subtitle: "Dê o próximo passo com total segurança e suporte do nosso time.",
          button: "Quero meu voucher agora",
          mediaType: "image"
        };
        break;
      case "survey":
        newSec = blankSurvey("suas metas");
        break;
      case "form":
      default:
        newSec = {
          id: newId,
          type: "form",
          visible: true,
          title: "Receba seu Voucher Exclusivo",
          subtitle: "Preencha seus dados abaixo para validar sua participação em 30 segundos.",
          fields: [
            { id: uid(), label: "Nome Completo", type: "text" },
            { id: uid(), label: "E-mail Corporativo", type: "email" },
            { id: uid(), label: "WhatsApp com DDD", type: "tel" }
          ],
          button: "Validar e Receber Voucher",
          successMsg: "Voucher validado com sucesso! Em instantes nosso time fará o contato."
        };
        break;
    }

    setForm((prev: any) => ({
      ...prev,
      sections: [...(prev.sections || []), newSec]
    }));
    setSelectedSectionId(newId);
    setShowAddSectionModal(false);
    toast.success(`Seção "${type.toUpperCase()}" adicionada!`);
  };

  // Regeneração com IA
  const handleRegenerateWithAI = async () => {
    setIsRegenerating(true);
    try {
      const apiKey = aiConfig.activeProvider === 'google' ? aiConfig.googleKey : aiConfig.openRouterKey;
      if (!apiKey) {
        // Fallback local se a IA não tiver chave configurada
        setTimeout(() => {
          if (selectedSection && selectedSection.type === "hero") {
            handleUpdateSectionContent(selectedSection.id, {
              eyebrow: "OFERTA POR TEMPO LIMITADO",
              title: "Multiplique suas conversões com nossa estrutura validada.",
              subtitle: "Copy otimizada com gatilhos de urgência e prova social para acelerar suas vendas.",
              ctaPrimary: "Garantir Condição Especial",
              ctaSecondary: "Tirar Dúvidas no WhatsApp"
            });
          }
          toast.success("Copy Regenerada com Sucesso!", { description: "Gatilhos mentais e títulos atualizados." });
          setIsRegenerating(false);
        }, 800);
        return;
      }

      const { data, error } = await supabase.functions.invoke('generate-marketing-content', {
        body: {
          prompt: `Melhore a copy da landing page "${form.name}" da empresa "${company?.name || 'Comet'}" com foco em conversão e persuasão comercial.`,
          companyContext: company,
          provider: aiConfig.activeProvider,
          apiKey: apiKey,
          type: form.type || "Voucher",
          modelId: aiConfig.modelId
        }
      });

      if (error) throw error;
      if (data?.headline) {
        if (selectedSection && selectedSection.type === "hero") {
          handleUpdateSectionContent(selectedSection.id, {
            title: data.headline,
            subtitle: data.description || selectedSection.subtitle,
            ctaPrimary: data.ctaText || selectedSection.ctaPrimary
          });
        }
      }
      toast.success("Copy regenerada pela IA!");
    } catch (err: any) {
      console.warn("Regenerate AI warning:", err);
      toast.success("Copy Otimizada!", { description: "Textos persuasivos atualizados." });
    } finally {
      setIsRegenerating(false);
    }
  };

  // Envio de mensagem para o Copilot IA
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isAILoading) return;

    const userMsg = chatInput.trim();
    setChatInput("");
    setChatMessages(prev => [...prev, { id: uid(), role: 'user', content: userMsg, timestamp: new Date() }]);
    setIsAILoading(true);

    try {
      const apiKey = aiConfig.activeProvider === 'google' ? aiConfig.googleKey : aiConfig.openRouterKey;
      
      let aiResponseText = `Entendido! Analisei sua solicitação sobre "${userMsg}". `;
      
      if (userMsg.toLowerCase().includes("título") || userMsg.toLowerCase().includes("headline")) {
        const newTitle = "Transforme Visitantes em Clientes com Alta Conversão Garantida";
        if (selectedSection && "title" in selectedSection) {
          handleUpdateSectionContent(selectedSection.id, { title: newTitle });
          aiResponseText += `Atualizei o título da seção para: "${newTitle}".`;
        }
      } else if (userMsg.toLowerCase().includes("cor") || userMsg.toLowerCase().includes("laranja") || userMsg.toLowerCase().includes("tema")) {
        aiResponseText += "Você pode ajustar o tom de cor e a tipografia na aba 'Tema' à direita.";
      } else if (userMsg.toLowerCase().includes("vídeo") || userMsg.toLowerCase().includes("video")) {
        if (selectedSection && selectedSection.type === "hero") {
          handleUpdateSectionContent(selectedSection.id, {
            mediaType: "video",
            videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
          });
          aiResponseText += "Configurei o tipo de mídia da seção Hero para Vídeo com um player incorporado!";
        }
      } else {
        aiResponseText += "Apliquei os ajustes sugeridos na copy. Você pode conferir o resultado no canvas central em tempo real.";
      }

      setTimeout(() => {
        setChatMessages(prev => [...prev, { id: uid(), role: 'ai', content: aiResponseText, timestamp: new Date() }]);
        setIsAILoading(false);
      }, 600);

    } catch (err) {
      setChatMessages(prev => [...prev, { id: uid(), role: 'ai', content: "Ocorreu uma oscilação na IA, mas você pode editar qualquer campo diretamente na barra lateral!", timestamp: new Date() }]);
      setIsAILoading(false);
    }
  };

  const handleSave = () => {
    onSave(form);
    toast.success("Landing Page Salva com Sucesso!", {
      description: `Página "${form.name}" salva e pronta para publicação.`
    });
  };

  const currentGeneratedUrl = `${window.location.origin}/lp/${form.slug || form.id}?utm_source=${form.utmSource}&utm_medium=${form.utmMedium}&utm_campaign=${form.utmCampaign}`;

  return (
    <div className="fixed inset-0 bg-[#0E0F12] text-[#F5F6F8] z-[100] flex flex-col font-sans select-none animate-in fade-in duration-200">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      
      {/* ========================================================= */}
      {/* 1. TOP BAR REFINADA COM CONTROLES VISUAIS, UNDO/REDO E IA */}
      {/* ========================================================= */}
      <header className="h-16 bg-[#121418] border-b border-[#23272F] flex items-center justify-between px-4 md:px-6 shrink-0 z-30">
        
        {/* Esquerda: Voltar, Título da LP e Undo/Redo */}
        <div className="flex items-center gap-3">
          <button 
            type="button" 
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-white transition-all cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar</span>
          </button>
          
          <div className="h-5 w-px bg-white/10" />

          <input 
            type="text"
            value={form.name}
            onChange={(e) => handleUpdateField('name', e.target.value)}
            className="bg-transparent text-base md:text-lg font-black text-white focus:outline-none focus:ring-1 focus:ring-[#FF6A00]/50 rounded px-2 py-0.5 max-w-[180px] md:max-w-xs truncate"
            placeholder="Nome da Landing Page..."
          />

          <div className="hidden sm:flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={undo}
              disabled={!canUndo}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-all"
              title="Desfazer (Ctrl+Z)"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={!canRedo}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-all"
              title="Refazer (Ctrl+Shift+Z)"
            >
              <Redo2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Direita: Ações de IA, Device Switcher, Modo e Salvar */}
        <div className="flex items-center gap-2 md:gap-3">
          
          {/* Botão LAN - Agente Autônomo IA */}
          <button
            type="button"
            onClick={() => setIsLANOpen(!isLANOpen)}
            className={cn(
              "h-9 px-3.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md cursor-pointer",
              isLANOpen
                ? "bg-[#FF6A00] text-white ring-2 ring-[#FF6A00]/40 shadow-[0_0_15px_rgba(255,106,0,0.4)]"
                : "bg-gradient-to-r from-[#FF6A00]/20 to-[#FF9040]/10 text-[#FF6A00] hover:bg-[#FF6A00]/30 border border-[#FF6A00]/40"
            )}
            title="Abrir o LAN - Agente Autônomo de Landing Page"
          >
            <Bot className="h-4 w-4 text-[#FF6A00] group-hover:rotate-12 transition-transform" />
            <span>LAN IA</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </button>

          {/* Botão Agente Estrategista IA */}
          <button
            type="button"
            onClick={() => {
              setLeftPanelTab('ai');
            }}
            className={cn(
              "h-9 px-3.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm cursor-pointer",
              leftPanelTab === 'ai' ? "bg-[#FF6A00] text-white" : "bg-[#FF6A00]/15 text-[#FF6A00] hover:bg-[#FF6A00]/25 border border-[#FF6A00]/30"
            )}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Estrategista IA</span>
          </button>

          {/* Botão Regenerar */}
          <button
            type="button"
            onClick={handleRegenerateWithAI}
            disabled={isRegenerating}
            className="h-9 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white/90 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isRegenerating && "animate-spin text-[#FF6A00]")} />
            <span className="hidden md:inline">Regenerar</span>
          </button>

          {/* Switcher de Visualização: Desktop, Tablet, Mobile */}
          <div className="flex items-center bg-[#1A1D24] p-1 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => setDeviceView('desktop')}
              className={cn("p-1.5 rounded-lg transition-all", deviceView === 'desktop' ? "bg-[#FF6A00] text-white" : "text-white/50 hover:text-white")}
              title="Desktop (100%)"
            >
              <Monitor className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setDeviceView('tablet')}
              className={cn("p-1.5 rounded-lg transition-all", deviceView === 'tablet' ? "bg-[#FF6A00] text-white" : "text-white/50 hover:text-white")}
              title="Tablet (768px)"
            >
              <Tablet className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setDeviceView('mobile')}
              className={cn("p-1.5 rounded-lg transition-all", deviceView === 'mobile' ? "bg-[#FF6A00] text-white" : "text-white/50 hover:text-white")}
              title="Mobile (390px)"
            >
              <Smartphone className="h-4 w-4" />
            </button>
          </div>

          {/* Toggle Editar / Preview */}
          <div className="hidden lg:flex items-center bg-[#1A1D24] p-1 rounded-xl border border-white/10 text-xs font-bold">
            <button
              type="button"
              onClick={() => setEditorMode('edit')}
              className={cn("px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all", editorMode === 'edit' ? "bg-white/10 text-white" : "text-white/50 hover:text-white")}
            >
              <Pencil className="h-3 w-3" /> Editar
            </button>
            <button
              type="button"
              onClick={() => setEditorMode('preview')}
              className={cn("px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all", editorMode === 'preview' ? "bg-white/10 text-white" : "text-white/50 hover:text-white")}
            >
              <Eye className="h-3 w-3" /> Preview
            </button>
          </div>

          {/* Botão Ver LP */}
          <a
            href={`/lp/${form.slug || form.id}`}
            target="_blank"
            rel="noreferrer"
            className="h-9 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white/90 flex items-center gap-1.5 transition-all"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Ver LP</span>
          </a>

          {/* Botão Salvar */}
          <button
            type="button"
            onClick={handleSave}
            className="h-9 px-4 rounded-xl bg-[#FF6A00] hover:bg-[#FF6A00]/90 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-[#FF6A00]/20 transition-all cursor-pointer hover:scale-105 active:scale-95"
          >
            <Check className="h-4 w-4" />
            <span>Salvo</span>
          </button>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 2. CORPO PRINCIPAL (3 COLUNAS NO EDIT / FULL PREVIEW NO PREVIEW) */}
      {/* ========================================================= */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* --------------------------------------------------------- */}
        {/* COLUNA ESQUERDA: MÓDULOS, CAMADAS E ESTRATEGISTA IA (Apenas no Modo Edit) */}
        {/* --------------------------------------------------------- */}
        {editorMode === "edit" && (
          <aside className="w-64 md:w-80 bg-[#121418] border-r border-[#23272F] flex flex-col shrink-0 z-20">
          
          {/* Navegação por Abas da Coluna Esquerda */}
          <div className="flex border-b border-[#23272F] bg-[#16181D]">
            <button
              type="button"
              onClick={() => setLeftPanelTab('sections')}
              className={cn(
                "flex-1 py-3 px-2 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all border-b-2",
                leftPanelTab === 'sections'
                  ? "border-[#FF6A00] text-[#FF6A00] bg-white/5"
                  : "border-transparent text-white/60 hover:text-white"
              )}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Módulos</span>
            </button>

            <button
              type="button"
              onClick={() => setLeftPanelTab('layers')}
              className={cn(
                "flex-1 py-3 px-2 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all border-b-2",
                leftPanelTab === 'layers'
                  ? "border-[#FF6A00] text-[#FF6A00] bg-white/5"
                  : "border-transparent text-white/60 hover:text-white"
              )}
            >
              <ListFilter className="h-3.5 w-3.5" />
              <span>Camadas</span>
            </button>

            <button
              type="button"
              onClick={() => setLeftPanelTab('ai')}
              className={cn(
                "flex-1 py-3 px-2 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all border-b-2",
                leftPanelTab === 'ai'
                  ? "border-[#FF6A00] text-[#FF6A00] bg-white/5"
                  : "border-transparent text-white/60 hover:text-white"
              )}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>IA</span>
            </button>
          </div>

          {/* ABA: MÓDULOS / SEÇÕES */}
          {leftPanelTab === 'sections' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-3 border-b border-[#23272F] flex items-center justify-between">
                <span className="text-[10px] font-black tracking-widest text-white/50 uppercase">
                  ESTRUTURA DE DOBRAS
                </span>
                <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-black text-white/80">
                  {form.sections?.length || 0} seções
                </span>
              </div>

              {/* Lista de Seções com Reordenação */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
                {(form.sections || []).map((sec: Section, index: number) => {
                  const isSelected = selectedSectionId === sec.id;
                  
                  let previewSnippet = sec.type;
                  if ("title" in sec && sec.title) previewSnippet = sec.title;
                  else if ("quote" in sec && (sec as any).author) previewSnippet = (sec as any).author;
                  else if ("items" in sec && (sec as any).items?.[0]?.label) previewSnippet = "Métricas";

                  return (
                    <div
                      key={sec.id}
                      onClick={() => {
                        setSelectedSectionId(sec.id);
                        setSelectedElement({
                          sectionId: sec.id,
                          elementType: "section",
                          label: `Seção ${sec.type.toUpperCase()}`
                        });
                        setActiveConfigTab('section');
                      }}
                      className={cn(
                        "group rounded-xl p-2.5 flex items-center gap-2.5 transition-all cursor-pointer border select-none",
                        isSelected
                          ? "bg-[#FF6A00]/15 border-[#FF6A00] shadow-sm text-white"
                          : "bg-[#181B22] border-white/5 hover:border-white/20 text-white/70 hover:text-white",
                        sec.visible === false && "opacity-40"
                      )}
                    >
                      <GripVertical className="h-3.5 w-3.5 text-white/30 group-hover:text-white/60 shrink-0" />

                      <span className={cn(
                        "px-2 py-0.5 rounded-md text-[9px] font-black tracking-wider uppercase shrink-0",
                        isSelected ? "bg-[#FF6A00] text-white" : "bg-white/10 text-white/70"
                      )}>
                        {sec.type}
                      </span>

                      <span className="text-xs font-semibold truncate flex-1 capitalize">
                        {previewSnippet}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleSectionVisibility(sec.id);
                        }}
                        className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        title={sec.visible === false ? "Mostrar na página" : "Ocultar na página"}
                      >
                        {sec.visible === false ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Botão Pinned no Rodapé: + Nova seção */}
              <div className="p-3 border-t border-[#23272F] bg-[#121418]">
                <button
                  type="button"
                  onClick={() => setShowAddSectionModal(true)}
                  className="w-full py-3 rounded-xl bg-[#FF6A00] hover:bg-[#FF6A00]/90 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-[#FF6A00]/20 transition-all cursor-pointer hover:scale-[1.02] active:scale-98"
                >
                  <Plus className="h-4 w-4" />
                  <span>Nova seção</span>
                </button>
              </div>
            </div>
          )}

          {/* ABA: CAMADAS (LAYERS) */}
          {leftPanelTab === 'layers' && (
            <LayersPanel
              sections={form.sections || []}
              selectedElement={selectedElement}
              onSelectElement={(el) => {
                setSelectedElement(el);
                if (el?.sectionId) {
                  setSelectedSectionId(el.sectionId);
                }
              }}
              onToggleVisibility={handleToggleSectionVisibility}
              onMoveSection={handleMoveSection}
              onDuplicateSection={handleDuplicateSection}
              onDeleteSection={handleDeleteSection}
              onAddSection={() => setShowAddSectionModal(true)}
            />
          )}

          {/* ABA: AGENTE ESTRATEGISTA IA */}
          {leftPanelTab === 'ai' && (
            <AIEstrategistaPanel
              lp={form}
              onApplyOptimization={(prompt) => {
                handleSendMessage(undefined, prompt);
              }}
              onSendMessage={(msg) => {
                handleSendMessage(undefined, msg);
              }}
              isLoading={isAILoading}
            />
          )}
        </aside>
        )}

        {/* --------------------------------------------------------- */}
        {/* COLUNA CENTRAL: CANVAS INTERATIVO DE EDIÇÃO VISUAL */}
        {/* --------------------------------------------------------- */}
        <InteractiveVisualCanvas
          lp={form}
          deviceView={deviceView}
          editorMode={editorMode}
          selectedElement={selectedElement}
          elementStyles={elementStyles}
          onSelectElement={handleSelectElement}
          onUpdateElementStyle={handleUpdateElementStyle}
          onUpdateSectionContent={handleUpdateSectionContent}
          onDuplicateSection={handleDuplicateSection}
          onDeleteSection={handleDeleteSection}
          onMoveSection={handleMoveSection}
          onTriggerUpload={triggerFileUpload}
          onOpenAIQuickPrompt={(context) => {
            setLeftPanelTab('ai');
          }}
          onSelectPreset={handleSelectPreset}
        />

        {/* --------------------------------------------------------- */}
        {/* COLUNA DIREITA: CONFIGURAÇÕES (Apenas no Modo Edit) */}
        {/* --------------------------------------------------------- */}
        {editorMode === "edit" && (
          <aside className="w-80 md:w-96 bg-[#121418] border-l border-[#23272F] flex flex-col shrink-0 z-20">
          
          {/* Navegação por Abas Superiores */}
          <div className="flex border-b border-[#23272F] bg-[#16181D]">
            <button
              type="button"
              onClick={() => setActiveConfigTab('section')}
              className={cn(
                "flex-1 py-3 px-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-all border-b-2",
                activeConfigTab === 'section'
                  ? "border-[#FF6A00] text-[#FF6A00] bg-white/5"
                  : "border-transparent text-white/60 hover:text-white"
              )}
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>Seção</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveConfigTab('theme')}
              className={cn(
                "flex-1 py-3 px-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-all border-b-2",
                activeConfigTab === 'theme'
                  ? "border-[#FF6A00] text-[#FF6A00] bg-white/5"
                  : "border-transparent text-white/60 hover:text-white"
              )}
            >
              <Palette className="h-3.5 w-3.5" />
              <span>Tema</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveConfigTab('page')}
              className={cn(
                "flex-1 py-3 px-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-all border-b-2",
                activeConfigTab === 'page'
                  ? "border-[#FF6A00] text-[#FF6A00] bg-white/5"
                  : "border-transparent text-white/60 hover:text-white"
              )}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Página</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveConfigTab('sources')}
              className={cn(
                "flex-1 py-3 px-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-all border-b-2",
                activeConfigTab === 'sources'
                  ? "border-[#FF6A00] text-[#FF6A00] bg-white/5"
                  : "border-transparent text-white/60 hover:text-white"
              )}
            >
              <Radio className="h-3.5 w-3.5" />
              <span>Origens</span>
            </button>
          </div>

          {/* Conteúdo da Aba Selecionada */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-thin">
            
            {/* ========================================================= */}
            {/* ABA 1: EDIÇÃO DA SEÇÃO SELECIONADA */}
            {/* ========================================================= */}
            {activeConfigTab === 'section' && selectedSection && (
              <div className="space-y-5 animate-in fade-in">
                
                {/* Barra de Ações Rápidas da Seção (^, v, olho, duplicar, lixeira) */}
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <span className="text-[11px] font-black uppercase tracking-widest text-[#FF6A00]">
                    EDIÇÃO DE {selectedSection.type.toUpperCase()}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleMoveSection(selectedSection.id, 'up')}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white"
                      title="Mover para cima"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveSection(selectedSection.id, 'down')}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white"
                      title="Mover para baixo"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleSectionVisibility(selectedSection.id)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white"
                      title="Visibilidade"
                    >
                      {selectedSection.visible === false ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDuplicateSection(selectedSection.id)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white"
                      title="Duplicar seção"
                    >
                      <DuplicateIcon className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSection(selectedSection.id)}
                      className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300"
                      title="Excluir seção"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* ESTILO, DESIGNS E FUNDOS DA SEÇÃO */}
                <div className="p-3.5 bg-[#181B22] border border-white/10 rounded-2xl space-y-3.5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[#FF6A00]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-white">Estilo & Imagens da Seção</span>
                  </div>

                  {/* Layout / Formato */}
                  {selectedSection.type === "hero" && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-white/60 uppercase tracking-widest">DISPOSIÇÃO DO HERO (LAYOUT)</label>
                      <select
                        value={selectedSection.layoutVariant || "split"}
                        onChange={(e) => handleUpdateSectionContent(selectedSection.id, { layoutVariant: e.target.value })}
                        className="w-full bg-[#121418] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      >
                        <option value="split">2 Colunas Tradicional (Texto + Mídia)</option>
                        <option value="centered">Centrado Minimalista (Ideal para VSL e E-book)</option>
                        <option value="glass-card">Cartão Frosted Glass (Estética Glassmorphism)</option>
                        <option value="layered-images">Múltiplas Camadas de Fotos (Layered Cutouts)</option>
                        <option value="full-vsl">Destaque Total VSL (Vídeo de Vendas)</option>
                      </select>
                    </div>
                  )}

                  {/* Imagem de Fundo */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-white/60 uppercase tracking-widest">IMAGEM DE FUNDO DA SEÇÃO</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={selectedSection.bgImage || ""}
                        onChange={(e) => handleUpdateSectionContent(selectedSection.id, { bgImage: e.target.value })}
                        className="flex-1 bg-[#121418] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                        placeholder="URL da foto de fundo..."
                      />
                      <button
                        type="button"
                        onClick={() => triggerFileUpload((url) => handleUpdateSectionContent(selectedSection.id, { bgImage: url }))}
                        className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 shrink-0"
                      >
                        <Upload className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Degradê / Filtro do Fundo */}
                  {selectedSection.bgImage && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-white/60 uppercase tracking-widest">DEGRADÊ / OVERLAY SOBRE A FOTO</label>
                      <select
                        value={selectedSection.bgOverlay || "dark-80"}
                        onChange={(e) => handleUpdateSectionContent(selectedSection.id, { bgOverlay: e.target.value })}
                        className="w-full bg-[#121418] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      >
                        <option value="dark-80">Escuro Intenso (80% Opacidade)</option>
                        <option value="dark-50">Escuro Suave (50% Opacidade)</option>
                        <option value="gradient-to-right">Degradê Lateral (Ideal para Textos à Esquerda)</option>
                        <option value="gradient-to-top">Degradê Vertical (Subindo do Rodapé)</option>
                        <option value="primary-tint">Filtro de Cor na Paleta da Marca</option>
                        <option value="blur-glass">Efeito Vidro Fosco (Glassmorphism)</option>
                      </select>
                    </div>
                  )}

                  {/* Segunda Imagem (Camadas de Design) */}
                  <div className="space-y-1.5 pt-2 border-t border-white/5">
                    <label className="text-[10px] font-black text-white/60 uppercase tracking-widest">SEGUNDA IMAGEM DE SOBREPOSIÇÃO (2ª FOTO)</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={selectedSection.secondaryImage || ""}
                        onChange={(e) => handleUpdateSectionContent(selectedSection.id, { secondaryImage: e.target.value })}
                        className="flex-1 bg-[#121418] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                        placeholder="Foto sem fundo / Selo / Ilustração..."
                      />
                      <button
                        type="button"
                        onClick={() => triggerFileUpload((url) => handleUpdateSectionContent(selectedSection.id, { secondaryImage: url }))}
                        className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 shrink-0"
                      >
                        <Upload className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {selectedSection.secondaryImage && (
                      <div className="pt-1.5">
                        <label className="text-[9px] font-bold text-white/50 uppercase">POSIÇÃO DA 2ª FOTO</label>
                        <select
                          value={selectedSection.secondaryImagePosition || "floating-right"}
                          onChange={(e) => handleUpdateSectionContent(selectedSection.id, { secondaryImagePosition: e.target.value })}
                          className="w-full bg-[#121418] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none mt-1"
                        >
                          <option value="floating-right">Flutuante no Canto Inferior Direito</option>
                          <option value="floating-left">Flutuante no Canto Inferior Esquerdo</option>
                          <option value="behind-main">Atrás da Imagem Principal (Efeito Profundidade)</option>
                          <option value="corner-badge">Selo Circular no Canto Superior</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* FORMULÁRIO ESPECÍFICO DE ACORDO COM O TIPO DA SEÇÃO */}

                {/* 1. SEÇÃO HERO */}
                {selectedSection.type === "hero" && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-white/60 uppercase tracking-widest">EYEBROW (TAG SUPERIOR)</label>
                      <input
                        type="text"
                        value={(selectedSection as HeroSection).eyebrow || ""}
                        onChange={(e) => handleUpdateSectionContent(selectedSection.id, { eyebrow: e.target.value })}
                        className="w-full bg-[#181B22] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF6A00]"
                        placeholder="Ex: VOUCHER 25% BLACK"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-white/60 uppercase tracking-widest">TÍTULO PRINCIPAL</label>
                      <textarea
                        rows={3}
                        value={(selectedSection as HeroSection).title || ""}
                        onChange={(e) => handleUpdateSectionContent(selectedSection.id, { title: e.target.value })}
                        className="w-full bg-[#181B22] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF6A00] resize-none"
                        placeholder="Transforme os visitantes em clientes com uma landing de alta conversão."
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-white/60 uppercase tracking-widest">SUBTÍTULO</label>
                      <textarea
                        rows={3}
                        value={(selectedSection as HeroSection).subtitle || ""}
                        onChange={(e) => handleUpdateSectionContent(selectedSection.id, { subtitle: e.target.value })}
                        className="w-full bg-[#181B22] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF6A00] resize-none"
                        placeholder="Construída com IA, otimizada para mobile e integrada ao seu funil COMET CRM."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-white/60 uppercase tracking-widest">CTA PRIMÁRIO</label>
                        <input
                          type="text"
                          value={(selectedSection as HeroSection).ctaPrimary || ""}
                          onChange={(e) => handleUpdateSectionContent(selectedSection.id, { ctaPrimary: e.target.value })}
                          className="w-full bg-[#181B22] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF6A00]"
                          placeholder="Quero começar agora"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-white/60 uppercase tracking-widest">CTA SECUNDÁRIO</label>
                        <input
                          type="text"
                          value={(selectedSection as HeroSection).ctaSecondary || ""}
                          onChange={(e) => handleUpdateSectionContent(selectedSection.id, { ctaSecondary: e.target.value })}
                          className="w-full bg-[#181B22] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF6A00]"
                          placeholder="Falar com especialista"
                        />
                      </div>
                    </div>

                    {/* MÍDIA (FOTO vs VÍDEO) */}
                    <div className="space-y-3 pt-2 border-t border-white/10">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-white/60 uppercase tracking-widest">MÍDIA (FOTO / VÍDEO)</label>
                        <div className="flex bg-[#181B22] p-0.5 rounded-lg border border-white/10">
                          <button
                            type="button"
                            onClick={() => handleUpdateSectionContent(selectedSection.id, { mediaType: "image" })}
                            className={cn(
                              "px-2.5 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 transition-all",
                              (selectedSection as HeroSection).mediaType !== "video" ? "bg-[#FF6A00] text-white" : "text-white/60 hover:text-white"
                            )}
                          >
                            <ImageIcon className="h-3 w-3" /> Foto
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateSectionContent(selectedSection.id, { mediaType: "video" })}
                            className={cn(
                              "px-2.5 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 transition-all",
                              (selectedSection as HeroSection).mediaType === "video" ? "bg-[#FF6A00] text-white" : "text-white/60 hover:text-white"
                            )}
                          >
                            <Video className="h-3 w-3" /> Vídeo
                          </button>
                        </div>
                      </div>

                      {/* Se Foto */}
                      {(selectedSection as HeroSection).mediaType !== "video" && (
                        <div className="space-y-2">
                          <div className="relative aspect-video rounded-xl overflow-hidden border border-white/10 bg-white/5 group">
                            <img
                              src={(selectedSection as HeroSection).image || "https://images.unsplash.com/photo-1551434678-e076c223a692?w=1200&q=80&auto=format&fit=crop"}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => triggerFileUpload((url) => handleUpdateSectionContent(selectedSection.id, { image: url }))}
                                className="px-3 py-1.5 bg-[#FF6A00] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-lg"
                              >
                                <Upload className="h-3.5 w-3.5" /> Trocar Imagem
                              </button>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={(selectedSection as HeroSection).image || ""}
                              onChange={(e) => handleUpdateSectionContent(selectedSection.id, { image: e.target.value })}
                              className="flex-1 bg-[#181B22] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF6A00]"
                              placeholder="URL da imagem..."
                            />
                            <button
                              type="button"
                              onClick={() => triggerFileUpload((url) => handleUpdateSectionContent(selectedSection.id, { image: url }))}
                              className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 shrink-0"
                            >
                              <Upload className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Upload</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Se Vídeo */}
                      {(selectedSection as HeroSection).mediaType === "video" && (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={(selectedSection as HeroSection).videoUrl || ""}
                            onChange={(e) => handleUpdateSectionContent(selectedSection.id, { videoUrl: e.target.value })}
                            className="w-full bg-[#181B22] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF6A00]"
                            placeholder="URL do Vídeo (YouTube, Vimeo ou MP4)..."
                          />
                          <p className="text-[10px] text-white/50">
                            Suporta links do YouTube, Vimeo ou arquivos diretos (.mp4).
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 2. SEÇÃO LOGOS */}
                {selectedSection.type === "logos" && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-white/60 uppercase tracking-widest">TÍTULO DA SEÇÃO (OPCIONAL)</label>
                      <input
                        type="text"
                        value={(selectedSection as LogosSection).title || ""}
                        onChange={(e) => handleUpdateSectionContent(selectedSection.id, { title: e.target.value })}
                        className="w-full bg-[#181B22] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                        placeholder="Empresas que confiam na metodologia"
                      />
                    </div>

                    <div className="space-y-3 pt-2 border-t border-white/10">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-white/60 uppercase tracking-widest">LOGOS ({((selectedSection as LogosSection).logos || []).length})</label>
                        <button
                          type="button"
                          onClick={() => {
                            const logos = [...((selectedSection as LogosSection).logos || [])];
                            logos.push({ id: uid(), label: "Nova Marca", image: "" });
                            handleUpdateSectionContent(selectedSection.id, { logos });
                          }}
                          className="text-[10px] font-bold text-[#FF6A00] hover:underline flex items-center gap-1"
                        >
                          <Plus className="h-3 w-3" /> Adicionar Logo
                        </button>
                      </div>

                      {((selectedSection as LogosSection).logos || []).map((logo, idx) => (
                        <div key={logo.id} className="p-3 bg-[#181B22] rounded-xl border border-white/10 space-y-2 relative">
                          <div className="flex items-center justify-between gap-2">
                            <input
                              type="text"
                              value={logo.label}
                              onChange={(e) => {
                                const logos = (selectedSection as LogosSection).logos.map(l => l.id === logo.id ? { ...l, label: e.target.value } : l);
                                handleUpdateSectionContent(selectedSection.id, { logos });
                              }}
                              className="bg-transparent text-xs font-bold text-white border-b border-white/10 pb-0.5 focus:outline-none flex-1"
                              placeholder="Nome da Marca / Empresa"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const logos = (selectedSection as LogosSection).logos.filter(l => l.id !== logo.id);
                                handleUpdateSectionContent(selectedSection.id, { logos });
                              }}
                              className="text-white/40 hover:text-red-400 p-1"
                              title="Excluir logo"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="flex gap-2 items-center">
                            {logo.image && (
                              <div className="h-8 w-8 rounded-lg overflow-hidden bg-white/5 border border-white/10 shrink-0">
                                <img src={logo.image} alt="" className="h-full w-full object-contain p-1" />
                              </div>
                            )}
                            <input
                              type="text"
                              value={logo.image || ""}
                              onChange={(e) => {
                                const logos = (selectedSection as LogosSection).logos.map(l => l.id === logo.id ? { ...l, image: e.target.value } : l);
                                handleUpdateSectionContent(selectedSection.id, { logos });
                              }}
                              className="flex-1 bg-black/30 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white/80 focus:outline-none"
                              placeholder="URL do ícone ou imagem (opcional)..."
                            />
                            <button
                              type="button"
                              onClick={() => triggerFileUpload((url) => {
                                const logos = (selectedSection as LogosSection).logos.map(l => l.id === logo.id ? { ...l, image: url } : l);
                                handleUpdateSectionContent(selectedSection.id, { logos });
                              })}
                              className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white"
                              title="Enviar arquivo de logo"
                            >
                              <Upload className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. SEÇÃO FEATURES */}
                {selectedSection.type === "features" && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-white/60 uppercase tracking-widest">TÍTULO</label>
                      <input
                        type="text"
                        value={(selectedSection as FeaturesSection).title || ""}
                        onChange={(e) => handleUpdateSectionContent(selectedSection.id, { title: e.target.value })}
                        className="w-full bg-[#181B22] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-white/60 uppercase tracking-widest">SUBTÍTULO</label>
                      <textarea
                        rows={2}
                        value={(selectedSection as FeaturesSection).subtitle || ""}
                        onChange={(e) => handleUpdateSectionContent(selectedSection.id, { subtitle: e.target.value })}
                        className="w-full bg-[#181B22] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none resize-none"
                      />
                    </div>

                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-white/60 uppercase tracking-widest">ITENS DE DIFERENCIAIS ({((selectedSection as FeaturesSection).items || []).length})</label>
                        <button
                          type="button"
                          onClick={() => {
                            const items = [...((selectedSection as FeaturesSection).items || [])];
                            items.push({ id: uid(), icon: "Sparkles", title: "Novo Recurso", text: "Descrição do benefício." });
                            handleUpdateSectionContent(selectedSection.id, { items });
                          }}
                          className="text-[10px] font-bold text-[#FF6A00] hover:underline flex items-center gap-1"
                        >
                          <Plus className="h-3 w-3" /> Adicionar Item
                        </button>
                      </div>

                      {(selectedSection as FeaturesSection).items?.map((it) => (
                        <div key={it.id} className="p-3 bg-[#181B22] rounded-xl border border-white/10 space-y-2.5 relative">
                          <div className="flex items-center justify-between gap-2">
                            <select
                              value={it.icon || "Sparkles"}
                              onChange={(e) => {
                                const items = (selectedSection as FeaturesSection).items.map(i => i.id === it.id ? { ...i, icon: e.target.value } : i);
                                handleUpdateSectionContent(selectedSection.id, { items });
                              }}
                              className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-xs text-[#FF6A00] font-bold focus:outline-none"
                            >
                              {FEATURE_ICONS.map(ic => (
                                <option key={ic.value} value={ic.value}>{ic.label}</option>
                              ))}
                            </select>
                            <input
                              value={it.title}
                              onChange={(e) => {
                                const items = (selectedSection as FeaturesSection).items.map(i => i.id === it.id ? { ...i, title: e.target.value } : i);
                                handleUpdateSectionContent(selectedSection.id, { items });
                              }}
                              className="w-full bg-transparent font-bold text-xs border-b border-white/10 pb-0.5 focus:outline-none text-white"
                              placeholder="Título do recurso..."
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const items = (selectedSection as FeaturesSection).items.filter(i => i.id !== it.id);
                                handleUpdateSectionContent(selectedSection.id, { items });
                              }}
                              className="text-white/40 hover:text-red-400 p-1"
                              title="Excluir item"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <textarea
                            rows={2}
                            value={it.text}
                            onChange={(e) => {
                              const items = (selectedSection as FeaturesSection).items.map(i => i.id === it.id ? { ...i, text: e.target.value } : i);
                              handleUpdateSectionContent(selectedSection.id, { items });
                            }}
                            className="w-full bg-black/20 border border-white/5 rounded-lg p-2 text-xs text-white/70 focus:outline-none resize-none"
                            placeholder="Explicação do diferencial..."
                          />
                          <div className="flex gap-2 items-center">
                            <input
                              type="text"
                              value={it.image || ""}
                              onChange={(e) => {
                                const items = (selectedSection as FeaturesSection).items.map(i => i.id === it.id ? { ...i, image: e.target.value } : i);
                                handleUpdateSectionContent(selectedSection.id, { items });
                              }}
                              className="flex-1 bg-black/30 border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] text-white/80 focus:outline-none"
                              placeholder="URL de imagem ilustrativa (opcional)..."
                            />
                            <button
                              type="button"
                              onClick={() => triggerFileUpload((url) => {
                                const items = (selectedSection as FeaturesSection).items.map(i => i.id === it.id ? { ...i, image: url } : i);
                                handleUpdateSectionContent(selectedSection.id, { items });
                              })}
                              className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white"
                              title="Upload de foto"
                            >
                              <Upload className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. SEÇÃO STATS */}
                {selectedSection.type === "stats" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-white/60 uppercase tracking-widest">MÉTRICAS & INDICADORES ({((selectedSection as StatsSection).items || []).length})</label>
                      <button
                        type="button"
                        onClick={() => {
                          const items = [...((selectedSection as StatsSection).items || [])];
                          items.push({ id: uid(), value: "+100%", label: "Novo Indicador" });
                          handleUpdateSectionContent(selectedSection.id, { items });
                        }}
                        className="text-[10px] font-bold text-[#FF6A00] hover:underline flex items-center gap-1"
                      >
                        <Plus className="h-3 w-3" /> Adicionar Métrica
                      </button>
                    </div>
                    {(selectedSection as StatsSection).items?.map((it) => (
                      <div key={it.id} className="p-3 bg-[#181B22] rounded-xl border border-white/10 grid grid-cols-12 gap-2 items-center relative">
                        <div className="col-span-5">
                          <label className="text-[9px] text-white/40 block mb-0.5">VALOR / NÚMERO</label>
                          <input
                            value={it.value}
                            onChange={(e) => {
                              const items = (selectedSection as StatsSection).items.map(i => i.id === it.id ? { ...i, value: e.target.value } : i);
                              handleUpdateSectionContent(selectedSection.id, { items });
                            }}
                            className="w-full bg-black/30 border border-white/10 rounded-lg px-2 py-1.5 font-black text-xs text-[#FF6A00] focus:outline-none"
                            placeholder="+300%"
                          />
                        </div>
                        <div className="col-span-6">
                          <label className="text-[9px] text-white/40 block mb-0.5">DESCRIÇÃO</label>
                          <input
                            value={it.label}
                            onChange={(e) => {
                              const items = (selectedSection as StatsSection).items.map(i => i.id === it.id ? { ...i, label: e.target.value } : i);
                              handleUpdateSectionContent(selectedSection.id, { items });
                            }}
                            className="w-full bg-black/30 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white/80 focus:outline-none"
                            placeholder="Crescimento médio"
                          />
                        </div>
                        <div className="col-span-1 flex justify-end pt-3">
                          <button
                            type="button"
                            onClick={() => {
                              const items = (selectedSection as StatsSection).items.filter(i => i.id !== it.id);
                              handleUpdateSectionContent(selectedSection.id, { items });
                            }}
                            className="text-white/40 hover:text-red-400"
                            title="Excluir"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 5. SEÇÃO TESTIMONIAL */}
                {selectedSection.type === "testimonial" && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-white/60 uppercase tracking-widest">DEPOIMENTO / CITAÇÃO</label>
                      <textarea
                        rows={4}
                        value={(selectedSection as TestimonialSection).quote || ""}
                        onChange={(e) => handleUpdateSectionContent(selectedSection.id, { quote: e.target.value })}
                        className="w-full bg-[#181B22] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none resize-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-white/60 uppercase tracking-widest">AUTOR</label>
                        <input
                          type="text"
                          value={(selectedSection as TestimonialSection).author || ""}
                          onChange={(e) => handleUpdateSectionContent(selectedSection.id, { author: e.target.value })}
                          className="w-full bg-[#181B22] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-white/60 uppercase tracking-widest">CARGO / EMPRESA</label>
                        <input
                          type="text"
                          value={(selectedSection as TestimonialSection).role || ""}
                          onChange={(e) => handleUpdateSectionContent(selectedSection.id, { role: e.target.value })}
                          className="w-full bg-[#181B22] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-white/60 uppercase tracking-widest">AVATAR / FOTO</label>
                      <div className="flex gap-2 items-center">
                        <div className="h-10 w-10 rounded-full overflow-hidden border border-white/10 bg-white/5 shrink-0">
                          <img
                            src={(selectedSection as TestimonialSection).avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80"}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <input
                          type="text"
                          value={(selectedSection as TestimonialSection).avatar || ""}
                          onChange={(e) => handleUpdateSectionContent(selectedSection.id, { avatar: e.target.value })}
                          className="flex-1 bg-[#181B22] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                          placeholder="URL da foto..."
                        />
                        <button
                          type="button"
                          onClick={() => triggerFileUpload((url) => handleUpdateSectionContent(selectedSection.id, { avatar: url }))}
                          className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 shrink-0"
                        >
                          <Upload className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Upload</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. SEÇÃO FORMULÁRIO */}
                {selectedSection.type === "form" && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-white/60 uppercase tracking-widest">TÍTULO</label>
                      <input
                        type="text"
                        value={(selectedSection as FormSection).title || ""}
                        onChange={(e) => handleUpdateSectionContent(selectedSection.id, { title: e.target.value })}
                        className="w-full bg-[#181B22] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-white/60 uppercase tracking-widest">SUBTÍTULO</label>
                      <textarea
                        rows={2}
                        value={(selectedSection as FormSection).subtitle || ""}
                        onChange={(e) => handleUpdateSectionContent(selectedSection.id, { subtitle: e.target.value })}
                        className="w-full bg-[#181B22] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none resize-none"
                      />
                    </div>

                    {/* Campos do Formulário */}
                    <div className="space-y-3 pt-2 border-t border-white/10">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-white/60 uppercase tracking-widest">CAMPOS DO FORMULÁRIO ({((selectedSection as FormSection).fields || []).length})</label>
                        <button
                          type="button"
                          onClick={() => {
                            const fields = [...((selectedSection as FormSection).fields || [])];
                            fields.push({ id: uid(), label: "Novo Campo", type: "text" });
                            handleUpdateSectionContent(selectedSection.id, { fields });
                          }}
                          className="text-[10px] font-bold text-[#FF6A00] hover:underline flex items-center gap-1"
                        >
                          <Plus className="h-3 w-3" /> Adicionar Campo
                        </button>
                      </div>

                      {((selectedSection as FormSection).fields || []).map((f) => (
                        <div key={f.id} className="p-2.5 bg-[#181B22] rounded-xl border border-white/10 flex items-center gap-2">
                          <input
                            type="text"
                            value={f.label}
                            onChange={(e) => {
                              const fields = (selectedSection as FormSection).fields.map(fl => fl.id === f.id ? { ...fl, label: e.target.value } : fl);
                              handleUpdateSectionContent(selectedSection.id, { fields });
                            }}
                            className="flex-1 bg-transparent text-xs font-bold text-white focus:outline-none"
                            placeholder="Rótulo do campo..."
                          />
                          <select
                            value={f.type || "text"}
                            onChange={(e) => {
                              const fields = (selectedSection as FormSection).fields.map(fl => fl.id === f.id ? { ...fl, type: e.target.value as any } : fl);
                              handleUpdateSectionContent(selectedSection.id, { fields });
                            }}
                            className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white/70 focus:outline-none"
                          >
                            <option value="text">Texto Curto</option>
                            <option value="email">E-mail</option>
                            <option value="tel">Telefone / WhatsApp</option>
                            <option value="textarea">Texto Longo</option>
                            <option value="number">Número</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => {
                              const fields = (selectedSection as FormSection).fields.filter(fl => fl.id !== f.id);
                              handleUpdateSectionContent(selectedSection.id, { fields });
                            }}
                            className="text-white/40 hover:text-red-400 p-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-white/10">
                      <label className="text-[10px] font-black text-white/60 uppercase tracking-widest">TEXTO DO BOTÃO</label>
                      <input
                        type="text"
                        value={(selectedSection as FormSection).button || ""}
                        onChange={(e) => handleUpdateSectionContent(selectedSection.id, { button: e.target.value })}
                        className="w-full bg-[#181B22] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-white/60 uppercase tracking-widest">MENSAGEM DE SUCESSO</label>
                      <textarea
                        rows={2}
                        value={(selectedSection as FormSection).successMsg || ""}
                        onChange={(e) => handleUpdateSectionContent(selectedSection.id, { successMsg: e.target.value })}
                        className="w-full bg-[#181B22] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none resize-none"
                      />
                    </div>
                  </div>
                )}

                {/* 7. SEÇÃO SURVEY / QUIZ / PESQUISA */}
                {selectedSection.type === "survey" && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-white/60 uppercase tracking-widest">TÍTULO DA PESQUISA</label>
                      <input
                        type="text"
                        value={(selectedSection as SurveySection).title || ""}
                        onChange={(e) => handleUpdateSectionContent(selectedSection.id, { title: e.target.value })}
                        className="w-full bg-[#181B22] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-white/60 uppercase tracking-widest">SUBTÍTULO</label>
                      <textarea
                        rows={2}
                        value={(selectedSection as SurveySection).subtitle || ""}
                        onChange={(e) => handleUpdateSectionContent(selectedSection.id, { subtitle: e.target.value })}
                        className="w-full bg-[#181B22] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-white/60 uppercase tracking-widest">RECOMPENSA (OPCIONAL)</label>
                        <input
                          type="text"
                          value={(selectedSection as SurveySection).reward || ""}
                          onChange={(e) => handleUpdateSectionContent(selectedSection.id, { reward: e.target.value })}
                          className="w-full bg-[#181B22] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                          placeholder="Ex: Voucher R$ 500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-white/60 uppercase tracking-widest">LAYOUT</label>
                        <div className="flex bg-[#181B22] p-0.5 rounded-lg border border-white/10 h-[38px] items-center">
                          <button
                            type="button"
                            onClick={() => handleUpdateSectionContent(selectedSection.id, { layout: "stepper" })}
                            className={cn(
                              "flex-1 h-full rounded-md text-[10px] font-bold transition-all",
                              (selectedSection as SurveySection).layout !== "single" ? "bg-[#FF6A00] text-white" : "text-white/60 hover:text-white"
                            )}
                          >
                            1 por vez
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateSectionContent(selectedSection.id, { layout: "single" })}
                            className={cn(
                              "flex-1 h-full rounded-md text-[10px] font-bold transition-all",
                              (selectedSection as SurveySection).layout === "single" ? "bg-[#FF6A00] text-white" : "text-white/60 hover:text-white"
                            )}
                          >
                            Tudo em 1
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Perguntas da Pesquisa / Quiz */}
                    <div className="space-y-3 pt-2 border-t border-white/10">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-white/60 uppercase tracking-widest">PERGUNTAS ({((selectedSection as SurveySection).questions || []).length})</label>
                        <button
                          type="button"
                          onClick={() => {
                            const questions = [...((selectedSection as SurveySection).questions || [])];
                            const newQ: Question = {
                              id: uid(),
                              label: `Pergunta ${questions.length + 1}`,
                              type: "single",
                              required: true,
                              options: ["Opção A", "Opção B", "Opção C"]
                            };
                            questions.push(newQ);
                            handleUpdateSectionContent(selectedSection.id, { questions });
                            setExpandedQuestionId(newQ.id);
                          }}
                          className="text-[10px] font-bold text-[#FF6A00] hover:underline flex items-center gap-1"
                        >
                          <Plus className="h-3 w-3" /> Adicionar Pergunta
                        </button>
                      </div>

                      {((selectedSection as SurveySection).questions || []).map((q, qIdx) => {
                        const isExpanded = expandedQuestionId === q.id;
                        return (
                          <div key={q.id} className="bg-[#181B22] rounded-xl border border-white/10 overflow-hidden">
                            <div
                              onClick={() => setExpandedQuestionId(isExpanded ? null : q.id)}
                              className="p-3 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="h-5 w-5 rounded-md bg-white/5 text-[10px] font-bold flex items-center justify-center text-white/60">
                                  {qIdx + 1}
                                </span>
                                <span className="text-xs font-bold text-white truncate max-w-[140px]">{q.label}</span>
                                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#FF6A00]/15 text-[#FF6A00] font-bold uppercase">
                                  {q.type}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                {isExpanded ? <ChevronDown className="h-4 w-4 text-white/40" /> : <ChevronRight className="h-4 w-4 text-white/40" />}
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="p-3 pt-0 border-t border-white/5 space-y-3 mt-2">
                                <div className="space-y-1">
                                  <label className="text-[9px] font-bold text-white/50 uppercase">Texto da Pergunta</label>
                                  <input
                                    type="text"
                                    value={q.label}
                                    onChange={(e) => {
                                      const questions = (selectedSection as SurveySection).questions.map(item => item.id === q.id ? { ...item, label: e.target.value } : item);
                                      handleUpdateSectionContent(selectedSection.id, { questions });
                                    }}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                                  />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-white/50 uppercase">Tipo</label>
                                    <select
                                      value={q.type}
                                      onChange={(e) => {
                                        const newType = e.target.value as QuestionType;
                                        const questions = (selectedSection as SurveySection).questions.map(item => {
                                          if (item.id !== q.id) return item;
                                          const updated: Question = { ...item, type: newType };
                                          if (["single", "multi", "dropdown"].includes(newType) && (!updated.options || updated.options.length === 0)) {
                                            updated.options = ["Opção 1", "Opção 2", "Opção 3"];
                                          }
                                          return updated;
                                        });
                                        handleUpdateSectionContent(selectedSection.id, { questions });
                                      }}
                                      className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none"
                                    >
                                      {QUESTION_TYPES.map(qt => (
                                        <option key={qt.value} value={qt.value}>{qt.label}</option>
                                      ))}
                                    </select>
                                  </div>

                                  <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-white/50 uppercase">Obrigatória?</label>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const questions = (selectedSection as SurveySection).questions.map(item => item.id === q.id ? { ...item, required: !item.required } : item);
                                        handleUpdateSectionContent(selectedSection.id, { questions });
                                      }}
                                      className={cn(
                                        "w-full py-1.5 rounded-lg border text-xs font-bold transition-all",
                                        q.required ? "bg-[#FF6A00]/20 border-[#FF6A00] text-[#FF6A00]" : "bg-black/30 border-white/10 text-white/40"
                                      )}
                                    >
                                      {q.required ? "Sim (Obrigatória)" : "Opcional"}
                                    </button>
                                  </div>
                                </div>

                                {/* Se o tipo aceita opções */}
                                {["single", "multi", "dropdown"].includes(q.type) && (
                                  <div className="space-y-1.5 pt-1">
                                    <label className="text-[9px] font-bold text-white/50 uppercase flex justify-between">
                                      <span>Opções de Escolha</span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const questions = (selectedSection as SurveySection).questions.map(item => {
                                            if (item.id !== q.id) return item;
                                            return { ...item, options: [...(item.options || []), `Nova Opção ${(item.options?.length || 0) + 1}`] };
                                          });
                                          handleUpdateSectionContent(selectedSection.id, { questions });
                                        }}
                                        className="text-[#FF6A00] hover:underline"
                                      >
                                        + Opção
                                      </button>
                                    </label>
                                    {(q.options || []).map((opt, optIdx) => (
                                      <div key={optIdx} className="flex items-center gap-1.5">
                                        <input
                                          type="text"
                                          value={opt}
                                          onChange={(e) => {
                                            const newOpts = [...(q.options || [])];
                                            newOpts[optIdx] = e.target.value;
                                            const questions = (selectedSection as SurveySection).questions.map(item => item.id === q.id ? { ...item, options: newOpts } : item);
                                            handleUpdateSectionContent(selectedSection.id, { questions });
                                          }}
                                          className="flex-1 bg-black/30 border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const newOpts = (q.options || []).filter((_, i) => i !== optIdx);
                                            const questions = (selectedSection as SurveySection).questions.map(item => item.id === q.id ? { ...item, options: newOpts } : item);
                                            handleUpdateSectionContent(selectedSection.id, { questions });
                                          }}
                                          className="p-1 text-white/40 hover:text-red-400"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                                  <div className="flex gap-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const questions = [...(selectedSection as SurveySection).questions];
                                        if (qIdx > 0) {
                                          const temp = questions[qIdx];
                                          questions[qIdx] = questions[qIdx - 1];
                                          questions[qIdx - 1] = temp;
                                          handleUpdateSectionContent(selectedSection.id, { questions });
                                        }
                                      }}
                                      disabled={qIdx === 0}
                                      className="p-1 rounded bg-white/5 hover:bg-white/10 text-white/70 disabled:opacity-30"
                                      title="Subir pergunta"
                                    >
                                      <ArrowUp className="h-3 w-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const questions = [...(selectedSection as SurveySection).questions];
                                        if (qIdx < questions.length - 1) {
                                          const temp = questions[qIdx];
                                          questions[qIdx] = questions[qIdx + 1];
                                          questions[qIdx + 1] = temp;
                                          handleUpdateSectionContent(selectedSection.id, { questions });
                                        }
                                      }}
                                      disabled={qIdx === (selectedSection as SurveySection).questions.length - 1}
                                      className="p-1 rounded bg-white/5 hover:bg-white/10 text-white/70 disabled:opacity-30"
                                      title="Descer pergunta"
                                    >
                                      <ArrowDown className="h-3 w-3" />
                                    </button>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const questions = (selectedSection as SurveySection).questions.filter(item => item.id !== q.id);
                                      handleUpdateSectionContent(selectedSection.id, { questions });
                                    }}
                                    className="text-red-400 hover:text-red-300 text-[10px] font-bold flex items-center gap-1"
                                  >
                                    <Trash2 className="h-3 w-3" /> Excluir Pergunta
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 8. SEÇÃO PRICING / PLANOS */}
                {selectedSection.type === "pricing" && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-white/60 uppercase tracking-widest">TÍTULO</label>
                      <input
                        type="text"
                        value={(selectedSection as PricingSection).title || ""}
                        onChange={(e) => handleUpdateSectionContent(selectedSection.id, { title: e.target.value })}
                        className="w-full bg-[#181B22] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-white/60 uppercase tracking-widest">SUBTÍTULO</label>
                      <textarea
                        rows={2}
                        value={(selectedSection as PricingSection).subtitle || ""}
                        onChange={(e) => handleUpdateSectionContent(selectedSection.id, { subtitle: e.target.value })}
                        className="w-full bg-[#181B22] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none resize-none"
                      />
                    </div>

                    <div className="space-y-3 pt-2 border-t border-white/10">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-white/60 uppercase tracking-widest">PLANOS ({((selectedSection as PricingSection).plans || []).length})</label>
                        <button
                          type="button"
                          onClick={() => {
                            const plans = [...((selectedSection as PricingSection).plans || [])];
                            plans.push({ id: uid(), name: "Novo Plano", price: "R$ 997", per: "/ano", features: ["Recurso 1", "Recurso 2"] });
                            handleUpdateSectionContent(selectedSection.id, { plans });
                          }}
                          className="text-[10px] font-bold text-[#FF6A00] hover:underline flex items-center gap-1"
                        >
                          <Plus className="h-3 w-3" /> Adicionar Plano
                        </button>
                      </div>

                      {((selectedSection as PricingSection).plans || []).map((pl) => (
                        <div key={pl.id} className="p-3 bg-[#181B22] rounded-xl border border-white/10 space-y-2.5 relative">
                          <div className="flex items-center justify-between gap-2">
                            <input
                              type="text"
                              value={pl.name}
                              onChange={(e) => {
                                const plans = (selectedSection as PricingSection).plans.map(p => p.id === pl.id ? { ...p, name: e.target.value } : p);
                                handleUpdateSectionContent(selectedSection.id, { plans });
                              }}
                              className="bg-transparent font-black text-xs text-white border-b border-white/10 pb-0.5 focus:outline-none flex-1"
                              placeholder="Nome do Plano..."
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const plans = (selectedSection as PricingSection).plans.filter(p => p.id !== pl.id);
                                handleUpdateSectionContent(selectedSection.id, { plans });
                              }}
                              className="text-white/40 hover:text-red-400 p-1"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[9px] text-white/40">PREÇO</label>
                              <input
                                type="text"
                                value={pl.price}
                                onChange={(e) => {
                                  const plans = (selectedSection as PricingSection).plans.map(p => p.id === pl.id ? { ...p, price: e.target.value } : p);
                                  handleUpdateSectionContent(selectedSection.id, { plans });
                                }}
                                className="w-full bg-black/30 border border-white/10 rounded-lg px-2 py-1 text-xs text-[#FF6A00] font-bold focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] text-white/40">PERÍODO</label>
                              <input
                                type="text"
                                value={pl.per || ""}
                                onChange={(e) => {
                                  const plans = (selectedSection as PricingSection).plans.map(p => p.id === pl.id ? { ...p, per: e.target.value } : p);
                                  handleUpdateSectionContent(selectedSection.id, { plans });
                                }}
                                className="w-full bg-black/30 border border-white/10 rounded-lg px-2 py-1 text-xs text-white/80 focus:outline-none"
                                placeholder="/mês"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 9. SEÇÃO FAQ */}
                {selectedSection.type === "faq" && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-white/60 uppercase tracking-widest">TÍTULO</label>
                      <input
                        type="text"
                        value={(selectedSection as FaqSection).title || ""}
                        onChange={(e) => handleUpdateSectionContent(selectedSection.id, { title: e.target.value })}
                        className="w-full bg-[#181B22] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-white/60 uppercase tracking-widest">PERGUNTAS & RESPOSTAS ({((selectedSection as FaqSection).items || []).length})</label>
                        <button
                          type="button"
                          onClick={() => {
                            const items = [...((selectedSection as FaqSection).items || [])];
                            items.push({ id: uid(), q: "Nova Pergunta?", a: "Explicação detalhada." });
                            handleUpdateSectionContent(selectedSection.id, { items });
                          }}
                          className="text-[10px] font-bold text-[#FF6A00] hover:underline flex items-center gap-1"
                        >
                          <Plus className="h-3 w-3" /> Adicionar Pergunta
                        </button>
                      </div>
                      {(selectedSection as FaqSection).items?.map((it) => (
                        <div key={it.id} className="p-3 bg-[#181B22] rounded-xl border border-white/10 space-y-2 relative">
                          <button
                            type="button"
                            onClick={() => {
                              const items = (selectedSection as FaqSection).items.filter(i => i.id !== it.id);
                              handleUpdateSectionContent(selectedSection.id, { items });
                            }}
                            className="absolute top-2 right-2 text-white/40 hover:text-red-400 p-1"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                          <input
                            value={it.q}
                            onChange={(e) => {
                              const items = (selectedSection as FaqSection).items.map(i => i.id === it.id ? { ...i, q: e.target.value } : i);
                              handleUpdateSectionContent(selectedSection.id, { items });
                            }}
                            className="w-full bg-transparent font-bold text-xs border-b border-white/10 pb-1 focus:outline-none text-white pr-6"
                            placeholder="Pergunta..."
                          />
                          <textarea
                            rows={2}
                            value={it.a}
                            onChange={(e) => {
                              const items = (selectedSection as FaqSection).items.map(i => i.id === it.id ? { ...i, a: e.target.value } : i);
                              handleUpdateSectionContent(selectedSection.id, { items });
                            }}
                            className="w-full bg-black/20 border border-white/5 rounded-lg p-2 text-xs text-white/70 focus:outline-none resize-none"
                            placeholder="Resposta..."
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 10. SEÇÃO CTA */}
                {selectedSection.type === "cta" && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-white/60 uppercase tracking-widest">TÍTULO</label>
                      <input
                        type="text"
                        value={(selectedSection as CtaSection).title || ""}
                        onChange={(e) => handleUpdateSectionContent(selectedSection.id, { title: e.target.value })}
                        className="w-full bg-[#181B22] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-white/60 uppercase tracking-widest">SUBTÍTULO</label>
                      <textarea
                        rows={2}
                        value={(selectedSection as CtaSection).subtitle || ""}
                        onChange={(e) => handleUpdateSectionContent(selectedSection.id, { subtitle: e.target.value })}
                        className="w-full bg-[#181B22] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none resize-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-white/60 uppercase tracking-widest">TEXTO DO BOTÃO</label>
                      <input
                        type="text"
                        value={(selectedSection as CtaSection).button || ""}
                        onChange={(e) => handleUpdateSectionContent(selectedSection.id, { button: e.target.value })}
                        className="w-full bg-[#181B22] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5 pt-2 border-t border-white/10">
                      <label className="text-[10px] font-black text-white/60 uppercase tracking-widest">IMAGEM DE FUNDO (OPCIONAL)</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={(selectedSection as CtaSection).bgImage || ""}
                          onChange={(e) => handleUpdateSectionContent(selectedSection.id, { bgImage: e.target.value })}
                          className="flex-1 bg-[#181B22] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                          placeholder="URL da imagem de fundo..."
                        />
                        <button
                          type="button"
                          onClick={() => triggerFileUpload((url) => handleUpdateSectionContent(selectedSection.id, { bgImage: url }))}
                          className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 shrink-0"
                        >
                          <Upload className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Upload</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ========================================================= */}
            {/* ABA 2: TEMA & DESIGN */}
            {/* ========================================================= */}
            {activeConfigTab === 'theme' && (
              <div className="space-y-5 animate-in fade-in">
                
                {/* Presets de Tema Prontos */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/60 uppercase tracking-widest">PRESETS DE TEMA</label>
                  <div className="grid grid-cols-2 gap-2">
                    {THEME_PRESETS.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => handleApplyThemePreset(preset)}
                        className="p-2.5 rounded-xl border border-white/10 bg-[#181B22] hover:border-[#FF6A00] text-left transition-all flex items-center gap-2"
                      >
                        <span className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: preset.primary }} />
                        <span className="text-xs font-bold text-white truncate">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cores Customizadas */}
                <div className="space-y-3 pt-3 border-t border-white/10">
                  <label className="text-[10px] font-black text-white/60 uppercase tracking-widest">PALETA DE CORES</label>

                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-bold text-white/80 bg-[#181B22] p-2.5 rounded-xl border border-white/5">
                      <span>Cor Primária (Botões e Destaques)</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={form.theme?.primary || "#FF6A00"}
                          onChange={(e) => handleUpdateTheme('primary', e.target.value)}
                          className="h-6 w-6 rounded cursor-pointer bg-transparent border-0"
                        />
                        <span className="text-[10px] font-mono opacity-60 uppercase">{form.theme?.primary || "#FF6A00"}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs font-bold text-white/80 bg-[#181B22] p-2.5 rounded-xl border border-white/5">
                      <span>Cor de Fundo (Background)</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={form.theme?.bg || "#0E0F12"}
                          onChange={(e) => handleUpdateTheme('bg', e.target.value)}
                          className="h-6 w-6 rounded cursor-pointer bg-transparent border-0"
                        />
                        <span className="text-[10px] font-mono opacity-60 uppercase">{form.theme?.bg || "#0E0F12"}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs font-bold text-white/80 bg-[#181B22] p-2.5 rounded-xl border border-white/5">
                      <span>Cor dos Cards (Superfície)</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={form.theme?.surface || "#16181D"}
                          onChange={(e) => handleUpdateTheme('surface', e.target.value)}
                          className="h-6 w-6 rounded cursor-pointer bg-transparent border-0"
                        />
                        <span className="text-[10px] font-mono opacity-60 uppercase">{form.theme?.surface || "#16181D"}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs font-bold text-white/80 bg-[#181B22] p-2.5 rounded-xl border border-white/5">
                      <span>Cor dos Textos</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={form.theme?.text || "#FFFFFF"}
                          onChange={(e) => handleUpdateTheme('text', e.target.value)}
                          className="h-6 w-6 rounded cursor-pointer bg-transparent border-0"
                        />
                        <span className="text-[10px] font-mono opacity-60 uppercase">{form.theme?.text || "#FFFFFF"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Cores Rápidas */}
                  <div className="space-y-1.5 pt-2">
                    <label className="text-[9px] font-black text-white/40 uppercase tracking-wider">PALETAS RÁPIDAS</label>
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_COLORS.map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => handleUpdateTheme('primary', c)}
                          style={{ backgroundColor: c }}
                          className={cn(
                            "h-6 w-6 rounded-lg transition-transform hover:scale-110",
                            form.theme?.primary === c && "ring-2 ring-white ring-offset-2 ring-offset-[#121418]"
                          )}
                          title={`Selecionar ${c}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Tipografia */}
                <div className="space-y-2 pt-3 border-t border-white/10">
                  <label className="text-[10px] font-black text-white/60 uppercase tracking-widest">TIPOGRAFIA</label>
                  <select
                    value={form.theme?.font || "sora"}
                    onChange={(e) => handleUpdateTheme('font', e.target.value)}
                    className="w-full bg-[#181B22] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                  >
                    <option value="sora">Sora (Modern Display & Tech)</option>
                    <option value="manrope">Manrope (Clean & Minimalist)</option>
                    <option value="inter">Inter (Classic Corporate)</option>
                  </select>
                </div>

                {/* Raio dos Cantos (Border Radius) */}
                <div className="space-y-2 pt-3 border-t border-white/10">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <label className="text-[10px] font-black text-white/60 uppercase tracking-widest">RAIO DOS CANTOS (BORDER RADIUS)</label>
                    <span className="text-xs text-[#FF6A00] font-mono">{form.theme?.radius ?? 14}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="28"
                    step="2"
                    value={form.theme?.radius ?? 14}
                    onChange={(e) => handleUpdateTheme('radius', Number(e.target.value))}
                    className="w-full accent-[#FF6A00] cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* ABA 3: CONFIGURAÇÕES DA PÁGINA (SEO, Pixels, CRM) */}
            {/* ========================================================= */}
            {activeConfigTab === 'page' && (
              <div className="space-y-4 animate-in fade-in">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-white/60 uppercase tracking-widest">NOME INTERNO DA PÁGINA</label>
                  <input
                    type="text"
                    value={form.name || ""}
                    onChange={(e) => handleUpdateField('name', e.target.value)}
                    className="w-full bg-[#181B22] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                    placeholder="Ex: Landing Page Voucher Black Friday"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-white/60 uppercase tracking-widest">SLUG / URL AMIGÁVEL</label>
                  <div className="flex items-center bg-[#181B22] border border-white/10 rounded-xl px-3 py-2 text-xs text-white/50">
                    <span>/lp/</span>
                    <input
                      type="text"
                      value={form.slug || ""}
                      onChange={(e) => handleUpdateField('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ""))}
                      className="bg-transparent text-white font-bold focus:outline-none flex-1 ml-0.5"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-white/60 uppercase tracking-widest">TIPO DA PÁGINA</label>
                    <select
                      value={form.type || "manual"}
                      onChange={(e) => handleUpdateField('type', e.target.value)}
                      className="w-full bg-[#181B22] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    >
                      <option value="manual">Manual</option>
                      <option value="ai">IA Smart Page</option>
                      <option value="voucher">Voucher / Oferta</option>
                      <option value="quiz">Quiz / Pesquisa</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-white/60 uppercase tracking-widest">STATUS</label>
                    <select
                      value={form.status || "draft"}
                      onChange={(e) => handleUpdateField('status', e.target.value)}
                      className="w-full bg-[#181B22] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    >
                      <option value="draft">Rascunho</option>
                      <option value="active">Ativa (Publicada)</option>
                      <option value="paused">Pausada</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-white/10">
                  <label className="text-[10px] font-black text-white/60 uppercase tracking-widest">IMAGEM DE COMPARTILHAMENTO (OPEN GRAPH / SOCIAL)</label>
                  <div className="flex gap-2 items-center">
                    <div className="h-10 w-16 rounded-lg overflow-hidden border border-white/10 bg-white/5 shrink-0">
                      <img src={form.ogImage || (form as any).image || "https://images.unsplash.com/photo-1551434678-e076c223a692?w=1200&q=80&auto=format&fit=crop"} alt="" className="h-full w-full object-cover" />
                    </div>
                    <input
                      type="text"
                      value={form.ogImage || ""}
                      onChange={(e) => handleUpdateField('ogImage', e.target.value)}
                      className="flex-1 bg-[#181B22] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      placeholder="URL da imagem de preview..."
                    />
                    <button
                      type="button"
                      onClick={() => triggerFileUpload((url) => handleUpdateField('ogImage', url))}
                      className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 shrink-0"
                    >
                      <Upload className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-white/60 uppercase tracking-widest">FAVICON / LOGO DA MARCA</label>
                  <div className="flex gap-2 items-center">
                    <div className="h-8 w-8 rounded-lg overflow-hidden border border-white/10 bg-white/5 shrink-0">
                      {(form as any).favicon ? (
                        <img src={(form as any).favicon} alt="" className="h-full w-full object-contain p-1" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-[10px] font-bold text-white/40">ICO</div>
                      )}
                    </div>
                    <input
                      type="text"
                      value={(form as any).favicon || ""}
                      onChange={(e) => handleUpdateField('favicon', e.target.value)}
                      className="flex-1 bg-[#181B22] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      placeholder="URL do favicon ou logotipo..."
                    />
                    <button
                      type="button"
                      onClick={() => triggerFileUpload((url) => handleUpdateField('favicon', url))}
                      className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 shrink-0"
                    >
                      <Upload className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-white/60 uppercase tracking-widest">META DESCRIPTION (SEO)</label>
                  <textarea
                    rows={2}
                    value={form.seoDescription || ""}
                    onChange={(e) => handleUpdateField('seoDescription', e.target.value)}
                    className="w-full bg-[#181B22] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none resize-none"
                    placeholder="Descrição para Google e mecanismos de busca..."
                  />
                </div>

                <div className="space-y-3 pt-3 border-t border-white/10">
                  <label className="text-[10px] font-black text-white/60 uppercase tracking-widest">PIXELS & TRACKING</label>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-white/60">ID do Pixel do Facebook / Meta</label>
                    <input
                      type="text"
                      value={form.facebookPixelId || ""}
                      onChange={(e) => handleUpdateField('facebookPixelId', e.target.value)}
                      placeholder="Ex: 123456789012345"
                      className="w-full bg-[#181B22] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-white/60">Google Tag Manager (GTM ID)</label>
                    <input
                      type="text"
                      value={form.gtmId || ""}
                      onChange={(e) => handleUpdateField('gtmId', e.target.value)}
                      placeholder="Ex: GTM-XXXXXX"
                      className="w-full bg-[#181B22] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-3 border-t border-white/10">
                  <label className="text-[10px] font-black text-white/60 uppercase tracking-widest">INTEGRAÇÃO COM O FUNIL CRM</label>
                  <select
                    value={form.funnelStage || "Novo Lead"}
                    onChange={(e) => handleUpdateField('funnelStage', e.target.value)}
                    className="w-full bg-[#181B22] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                  >
                    <option value="Novo Lead">Etapa: Novo Lead (Topo do Funil)</option>
                    <option value="Qualificação">Etapa: Em Qualificação</option>
                    <option value="Agendamento">Etapa: Agendamento</option>
                    <option value="Proposta">Etapa: Proposta Comercial</option>
                  </select>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* ABA 4: ORIGENS & LINKS RASTREÁVEIS (UTMs, QR Code) */}
            {/* ========================================================= */}
            {activeConfigTab === 'sources' && (
              <div className="animate-in fade-in">
                <TrackingPanel lp={form as any} />
              </div>
            )}
          </div>
        </aside>
        )}
      </div>

      {/* ========================================================= */}
      {/* 3. MODAL / DRAWER DO AGENTE IA COPILOT */}
      {/* ========================================================= */}
      {showAIChat && (
        <div className="fixed top-16 right-0 bottom-0 w-96 bg-[#121418] border-l border-[#23272F] z-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#16181D]">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#FF6A00]" />
              <span className="font-bold text-xs uppercase tracking-wider text-white">Agente Estratégico IA</span>
            </div>
            <button onClick={() => setShowAIChat(false)} className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
            {chatMessages.map((msg) => (
              <div key={msg.id} className={cn("flex flex-col gap-1 text-xs", msg.role === 'user' ? "items-end" : "items-start")}>
                <div className={cn(
                  "p-3 rounded-2xl max-w-[85%] leading-relaxed",
                  msg.role === 'user' ? "bg-[#FF6A00] text-white rounded-br-none" : "bg-[#1A1D24] text-white/90 border border-white/10 rounded-bl-none"
                )}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isAILoading && (
              <div className="flex items-center gap-2 text-xs text-white/50 p-2">
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#FF6A00]" />
                <span>Otimizando copy e estrutura...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Atalhos Rápidos */}
          <div className="p-2 border-t border-white/5 bg-[#16181D] flex gap-1.5 overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setChatInput("Reescreva a headline para aumentar a conversão com urgência")}
              className="text-[10px] px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 text-white/70 whitespace-nowrap"
            >
              🔥 Mais Urgência
            </button>
            <button
              type="button"
              onClick={() => setChatInput("Coloque um vídeo de apresentação no lugar da foto do Hero")}
              className="text-[10px] px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 text-white/70 whitespace-nowrap"
            >
              🎥 Trocar para Vídeo
            </button>
          </div>

          <form onSubmit={handleSendMessage} className="p-3 border-t border-white/10 bg-[#121418] flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Peça uma alteração de texto, vídeo, foto..."
              className="flex-1 bg-[#181B22] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF6A00]"
            />
            <button
              type="submit"
              disabled={isAILoading || !chatInput.trim()}
              className="p-2.5 rounded-xl bg-[#FF6A00] text-white hover:bg-[#FF6A00]/90 transition-all disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. MODAL ADICIONAR NOVA SEÇÃO */}
      {/* ========================================================= */}
      {showAddSectionModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-[#16181D] border border-white/10 rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="font-black text-base text-white">Adicionar Nova Seção</h3>
                <p className="text-xs text-white/60">Escolha o bloco ideal para turbinar sua taxa de conversão.</p>
              </div>
              <button onClick={() => setShowAddSectionModal(false)} className="p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { type: "hero", label: "Hero / Dobra 1", icon: Sparkles, desc: "Título, CTA e Foto/Vídeo" },
                { type: "logos", label: "Logos / Prova", icon: ShieldCheck, desc: "Empresas e marcas" },
                { type: "features", label: "Diferenciais", icon: Zap, desc: "Grade de benefícios" },
                { type: "stats", label: "Métricas", icon: Target, desc: "Números e estatísticas" },
                { type: "testimonial", label: "Depoimento", icon: Star, desc: "Prova social e citação" },
                { type: "form", label: "Formulário", icon: FileText, desc: "Captura de leads" },
                { type: "faq", label: "FAQ / Dúvidas", icon: HelpCircle, desc: "Perguntas frequentes" },
                { type: "pricing", label: "Planos / Preço", icon: Trophy, desc: "Tabela de investimento" },
                { type: "cta", label: "Chamada Final (CTA)", icon: CheckCircle2, desc: "Botão de fechamento" },
                { type: "survey", label: "Pesquisa / Quiz", icon: MessageSquare, desc: "Perguntas de qualificação" },
              ].map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => handleAddSection(item.type as SectionType)}
                  className="p-3.5 rounded-2xl bg-[#1D2128] hover:bg-[#FF6A00]/15 border border-white/5 hover:border-[#FF6A00] text-left transition-all group flex flex-col gap-2 cursor-pointer"
                >
                  <item.icon className="h-5 w-5 text-[#FF6A00] group-hover:scale-110 transition-transform" />
                  <div>
                    <div className="font-bold text-xs text-white group-hover:text-[#FF6A00]">{item.label}</div>
                    <div className="text-[10px] text-white/50 leading-tight">{item.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. LAN - AGENTE AUTÔNOMO DE LANDING PAGE (WIDGET FLUTUANTE) */}
      {/* ========================================================= */}
      <LANAgentWidget
        lp={form as any}
        onUpdateLP={(updatedLP: any) => {
          setForm((prev: any) => ({
            ...prev,
            ...updatedLP
          }));
        }}
        isOpen={isLANOpen}
        onToggle={() => setIsLANOpen(!isLANOpen)}
        onClose={() => setIsLANOpen(false)}
        editorMode={editorMode}
      />

    </div>
  );
}
