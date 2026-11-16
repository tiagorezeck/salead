// src/lib/lp-store.ts
import { cloudStore } from "@/services/cloudStorageService";

export type SectionType =
  | "hero"
  | "logos"
  | "features"
  | "stats"
  | "testimonial"
  | "pricing"
  | "faq"
  | "cta"
  | "form"
  | "survey";

export interface BaseSection {
  id: string;
  type: SectionType;
  visible: boolean;
  bgImage?: string;
  bgOverlay?: "none" | "dark-50" | "dark-80" | "gradient-to-right" | "gradient-to-top" | "primary-tint" | "blur-glass";
  bgOpacity?: number;
  layoutVariant?: "default" | "centered" | "split" | "layered-images" | "glass-card" | "full-vsl";
  secondaryImage?: string;
  secondaryImagePosition?: "floating-right" | "floating-left" | "behind-main" | "corner-badge";
}

export interface HeroSection extends BaseSection {
  type: "hero";
  eyebrow: string;
  title: string;
  subtitle: string;
  ctaPrimary: string;
  ctaSecondary: string;
  image: string;
  mediaType?: "image" | "video" | "none";
  videoUrl?: string;
  videoAutoplay?: boolean;
}

export interface LogosSection extends BaseSection {
  type: "logos";
  title: string;
  logos: { id: string; label: string; logo?: string }[];
}

export interface FeaturesSection extends BaseSection {
  type: "features";
  title: string;
  subtitle: string;
  items: { id: string; icon: string; title: string; text: string; image?: string }[];
}

export interface StatsSection extends BaseSection {
  type: "stats";
  items: { id: string; value: string; label: string }[];
}

export interface TestimonialSection extends BaseSection {
  type: "testimonial";
  quote: string;
  author: string;
  role: string;
  avatar: string;
}

export interface PricingSection extends BaseSection {
  type: "pricing";
  title: string;
  plans: { id: string; name: string; price: string; per: string; features: string[]; highlight?: boolean }[];
}

export interface FaqSection extends BaseSection {
  type: "faq";
  title: string;
  items: { id: string; q: string; a: string }[];
}

export interface CtaSection extends BaseSection {
  type: "cta";
  title: string;
  subtitle: string;
  button: string;
  image?: string;
  mediaType?: "image" | "video" | "none";
  videoUrl?: string;
}

export interface FormSection extends BaseSection {
  type: "form";
  title: string;
  subtitle: string;
  fields: { id: string; label: string; type: "text" | "email" | "tel" | "textarea" }[];
  button: string;
  successMsg: string;
}

export type QuestionType =
  | "short"
  | "long"
  | "single"
  | "multi"
  | "dropdown"
  | "rating"
  | "nps"
  | "scale"
  | "yesno"
  | "date"
  | "email"
  | "phone";

export interface SurveyQuestion {
  id: string;
  type: QuestionType;
  label: string;
  description?: string;
  required: boolean;
  options?: string[];
  min?: number;
  max?: number;
  minLabel?: string;
  maxLabel?: string;
  placeholder?: string;
}

export interface SurveySection extends BaseSection {
  type: "survey";
  title: string;
  subtitle: string;
  questions: SurveyQuestion[];
  layout: "single" | "stepper";
  submitButton: string;
  successMsg: string;
  reward?: string;
}

export type Section =
  | HeroSection
  | LogosSection
  | FeaturesSection
  | StatsSection
  | TestimonialSection
  | PricingSection
  | FaqSection
  | CtaSection
  | FormSection
  | SurveySection;

export interface LPTheme {
  primary: string;
  bg: string;
  surface: string;
  text: string;
  muted: string;
  radius: number;
  font: "sora" | "manrope" | "inter";
}

export interface LP {
  id: string;
  name: string;
  slug: string;
  type: string;
  template?: string;
  status: "Ativa" | "Rascunho" | "Pausada" | "Teste";
  visits: number;
  leads: number;
  conv: number;
  theme: LPTheme;
  sections: Section[];
  updatedAt: number;
  ogImage?: string;
  favicon?: string;
  productId?: string;
  whatsappNumbers?: string[];
  config?: Record<string, any>;
}

export const DEFAULT_THEME: LPTheme = {
  primary: "#FF6A00",
  bg: "#0E0F12",
  surface: "#16181D",
  text: "#F5F6F8",
  muted: "#9AA0AA",
  radius: 14,
  font: "sora",
};

export const uid = () => Math.random().toString(36).slice(2, 9);
export const newSectionId = uid;

export function blankSurvey(topic = "sua experiência"): SurveySection {
  return {
    id: uid(),
    type: "survey",
    visible: true,
    title: "Responda em 2 minutos",
    subtitle: `Queremos entender ${topic} para oferecer a melhor solução personalizada.`,
    layout: "stepper",
    submitButton: "Enviar respostas",
    successMsg: "Obrigado! Recebemos suas respostas e nossa equipe entrará em contato em breve.",
    reward: "Ganhe um diagnóstico gratuito personalizado",
    questions: [
      { id: uid(), type: "short", label: "Qual é o seu nome?", required: true, placeholder: "Digite seu nome" },
      { id: uid(), type: "email", label: "Seu melhor e-mail", required: true, placeholder: "voce@empresa.com" },
      { id: uid(), type: "phone", label: "WhatsApp para contato", required: true, placeholder: "(11) 99999-0000" },
      {
        id: uid(),
        type: "single",
        label: "Qual seu principal objetivo?",
        required: true,
        options: ["Gerar mais leads", "Aumentar conversão de vendas", "Reduzir CAC", "Escalar operação comercial"],
      },
      {
        id: uid(),
        type: "multi",
        label: "Quais canais de aquisição você já usa?",
        required: false,
        options: ["Instagram", "Google Ads", "WhatsApp", "E-mail", "Indicação", "Prospecção Ativa"],
      },
      {
        id: uid(),
        type: "scale",
        label: "Qual seu investimento mensal em vendas/marketing?",
        required: true,
        min: 1000,
        max: 50000,
        minLabel: "R$ 1k",
        maxLabel: "R$ 50k+",
      },
      { id: uid(), type: "rating", label: "Como você avalia a maturidade do seu funil atual?", required: true, min: 1, max: 5 },
      { id: uid(), type: "nps", label: "Qual a probabilidade de recomendar nosso método?", required: false },
      {
        id: uid(),
        type: "dropdown",
        label: "Tamanho da sua equipe comercial",
        required: false,
        options: ["Somente eu (Eu-preendedor)", "2 a 5 pessoas", "6 a 15 pessoas", "Mais de 15 pessoas"],
      },
      { id: uid(), type: "yesno", label: "Sua empresa já utiliza algum CRM estruturado hoje?", required: true },
      { id: uid(), type: "date", label: "Quando pretende iniciar essa transformação?", required: false },
      { id: uid(), type: "long", label: "Conte-nos mais sobre o seu principal gargalo atual", required: false, placeholder: "Descreva seu maior desafio comercial..." },
    ],
  };
}

export function createHighConversionPeopleSections(options?: {
  brand?: string;
  niche?: string;
  city?: string;
  painPoint?: string;
  offer?: string;
  colorMood?: string;
}): Section[] {
  const brand = options?.brand || "Minha Marca";
  const niche = options?.niche || "Negócios & Vendas";
  const city = options?.city || "Brasil";
  const painPoint = options?.painPoint || "falta de previsibilidade e leads desqualificados";
  const offer = options?.offer || "Método Exclusivo de Escala Comercial";

  return [
    // 1. HERO SECTION IMPACTANTE
    {
      id: uid(),
      type: "hero",
      visible: true,
      eyebrow: `⚡ Vagas Abertas para ${city} · ${niche}`,
      title: `Acelere seus resultados em ${city} com o método definitivo de ${niche}.`,
      subtitle: `Elimine a ${painPoint} e conquiste previsibilidade de faturamento com ${offer}. Metodologia validada por centenas de operações de alto ticket.`,
      ctaPrimary: "QUERO MINHA AVALIAÇÃO EXCLUSIVA",
      ctaSecondary: "VER DEMONSTRAÇÃO EM VÍDEO",
      image: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=1200&q=80&auto=format&fit=crop",
      mediaType: "video",
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      layoutVariant: "split",
      bgOverlay: "dark-80",
    },
    // 2. PROVA SOCIAL E NÚMEROS (MARQUEE / GRID)
    {
      id: uid(),
      type: "stats",
      visible: true,
      items: [
        { id: uid(), value: "+4.850", label: `Clientes & Alunos Atendidos em ${city}` },
        { id: uid(), value: "R$ 18.4M+", label: "Faturamento Gerado aos Parceiros" },
        { id: uid(), value: "98.7%", label: "Taxa de Satisfação e Retenção" },
        { id: uid(), value: "4.9 ★", label: "Avaliação Média no Google & Trust" },
      ],
    },
    {
      id: uid(),
      type: "logos",
      visible: true,
      title: "METODOLOGIA RECONHECIDA POR LÍDERES DO SETOR",
      logos: ["Vanguarda Tech", "Grupo Alpha", "Nexus Corp", "Prime Solutions", "Apex Global", "Titan Venture"].map((l) => ({ id: uid(), label: l })),
    },
    // 3. SEÇÃO DE QUALIFICAÇÃO / PESQUISA (QUIZ OU CARDS INTERATIVOS)
    {
      id: uid(),
      type: "survey",
      visible: true,
      title: "Descubra se este programa é para você",
      subtitle: "Responda a 3 perguntas rápidas para avaliarmos a compatibilidade da sua operação com nossa metodologia.",
      layout: "stepper",
      submitButton: "Ver Resultado & Desbloquear Condições",
      successMsg: "Perfil aprovado para atendimento prioritário! Nossos consultores entrarão em contato.",
      reward: "Diagnóstico Estratégico Gratuito + Acesso aos Casos de Estudo",
      questions: [
        {
          id: uid(),
          type: "single",
          label: `Qual é o seu momento atual em ${niche}?`,
          required: true,
          options: [
            "Iniciando e quero estruturar do jeito certo",
            "Já tenho clientes, mas quero escalar previsivelmente",
            "Faturamento consolidado acima de R$ 50k/mês",
            "Buscando profissionalizar equipe comercial e marketing"
          ]
        },
        {
          id: uid(),
          type: "single",
          label: "Qual o seu principal desafio hoje?",
          required: true,
          options: [
            `Eliminar ${painPoint}`,
            "Aumentar a taxa de fechamento de vendas",
            "Gerar leads qualificados todos os dias",
            "Automatizar processos e economizar tempo"
          ]
        },
        {
          id: uid(),
          type: "single",
          label: `Qual a sua meta de faturamento para os próximos 6 meses em ${city}?`,
          required: true,
          options: [
            "Até R$ 30.000 / mês",
            "R$ 30.000 a R$ 100.000 / mês",
            "Acima de R$ 100.000 / mês",
            "Crescimento superior a 3x o faturamento atual"
          ]
        }
      ]
    },
    // 4. ESTRUTURA DO MÉTODO / CONTEÚDO (BENTO GRID)
    {
      id: uid(),
      type: "features",
      visible: true,
      title: `A Engenharia do Método ${brand} (Bento Box)`,
      subtitle: "Arquitetura completa pensada para entregar máxima conversão, autoridade inquestionável e retenção de clientes.",
      items: [
        {
          id: uid(),
          icon: "Target",
          title: "Diagnóstico & Posicionamento Único",
          text: `Mapeamento cirúrgico da dor do cliente em ${city} para criar uma oferta irresistível de alto valor percebido.`,
        },
        {
          id: uid(),
          icon: "Zap",
          title: "Funis de Tração & Tráfego Direto",
          text: "Geração ininterrupta de oportunidades com criativos de alta retenção e páginas otimizadas para mobile.",
        },
        {
          id: uid(),
          icon: "ShieldCheck",
          title: "Qualificação & Fechamento em Escala",
          text: "Filtros inteligentes que separam curiosos de clientes com poder aquisitivo pronto para fechar.",
        },
        {
          id: uid(),
          icon: "BarChart3",
          title: "Dashboard de ROI & Métricas em Tempo Real",
          text: "Acompanhamento transparente de custo por lead, taxa de conversão e faturamento gerado em cada canal.",
        },
      ],
    },
    // 5. PROVA SOCIAL EM VÍDEO / DEPOIMENTOS
    {
      id: uid(),
      type: "testimonial",
      visible: true,
      quote: `Em menos de 30 dias com a metodologia ${brand}, triplicamos o número de agendamentos qualificados e reduzimos nosso CAC pela metade. O retorno superou todas as expectativas.`,
      author: "Dra. Carolina Mendes",
      role: `Especialista & Diretora Clínica · ${city}`,
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80",
    },
    // 6. GARANTIA & PERGUNTAS FREQUENTES
    {
      id: uid(),
      type: "faq",
      visible: true,
      title: "Perguntas Frequentes & Garantia",
      items: [
        {
          id: uid(),
          q: `Como funciona o atendimento para empresas de ${city}?`,
          a: `Nosso processo é 100% adaptado para a dinâmica local de ${city}, combinando atendimento digital ágil com estratégia personalizada para o seu público.`
        },
        {
          id: uid(),
          q: "Existe garantia de satisfação?",
          a: "Sim! Garantia incondicional de 15 dias. Se você aplicar a metodologia e achar que não é para o seu negócio, devolvemos 100% do seu investimento."
        },
        {
          id: uid(),
          q: "Quanto tempo leva para ver os primeiros resultados?",
          a: "Nossos parceiros começam a colher os primeiros leads e agendamentos nas primeiras 48 a 72 horas após o lançamento da estrutura."
        },
        {
          id: uid(),
          q: "Preciso ter conhecimento avançado em tecnologia?",
          a: "Não. Entregamos a solução pronta e validada, com treinamento completo e suporte direto para você ou sua equipe comercial."
        }
      ]
    },
    // 7. FORMULÁRIO DE CAPTURA & INTEGRATOR (FINAL CONVERSION)
    {
      id: uid(),
      type: "form",
      visible: true,
      title: `Garanta sua Condição Exclusiva para ${city}`,
      subtitle: "Preencha seus dados abaixo para que nosso especialista entre em contato pelo WhatsApp com sua proposta personalizada.",
      fields: [
        { id: uid(), label: "Nome Completo", type: "text" },
        { id: uid(), label: "WhatsApp (com DDD)", type: "tel" },
        { id: uid(), label: "Seu Melhor E-mail", type: "email" },
      ],
      button: "🔥 QUERO GARANTIR MINHA VAGA AGORA",
      successMsg: "Solicitação recebida com sucesso! Em instantes nosso especialista enviará os detalhes no seu WhatsApp.",
    },
    // CTA FINAL DE URGÊNCIA
    {
      id: uid(),
      type: "cta",
      visible: true,
      title: `Vagas limitadas para este ciclo em ${city}.`,
      subtitle: "Não deixe para depois. A oportunidade de transformar seus resultados comerciais começa com um clique.",
      button: "FALAR COM UM CONSULTOR AGORA",
    }
  ];
}

export function blankSections(brand = "Nova landing"): Section[] {
  return createHighConversionPeopleSections({ brand });
}

export function loadLPs(): LP[] {
  if (typeof window === "undefined") return [];
  try {
    return (cloudStore.getState().landingPages || []) as unknown as LP[];
  } catch {
    return [];
  }
}

export function saveLPs(lps: LP[]) {
  if (typeof window === "undefined") return;
  cloudStore.mutate(
    (draft) => {
      draft.landingPages = lps as any[];
    },
    { immediate: true }
  );
}

export function saveLP(lp: LP) {
  const stamped = { ...lp, updatedAt: Date.now() };
  cloudStore.mutate(
    (draft) => {
      const current = Array.isArray(draft.landingPages) ? [...draft.landingPages] : [];
      const idx = current.findIndex((x: any) => x.id === stamped.id);
      if (idx >= 0) current[idx] = stamped as any;
      else current.unshift(stamped as any);
      draft.landingPages = current;
    },
    { immediate: true }
  );
}

export function deleteLP(id: string) {
  cloudStore.mutate(
    (draft) => {
      draft.deletedLpIds = Array.from(new Set([...(draft.deletedLpIds || []), id]));
      draft.landingPages = (draft.landingPages || []).filter((x: any) => x.id !== id);
    },
    { immediate: true }
  );
}

export function getLP(id: string): LP | undefined {
  return loadLPs().find((x) => x.id === id);
}

// Gerador por Briefing Estruturado
export interface SmartBrief {
  objective: "lead-generation" | "sales" | "webinar" | "waitlist" | "quiz-diagnosis" | "event" | "launch";
  brand: string;
  niche: string;
  audience: string;
  offer: string;
  tone: "professional" | "friendly" | "urgent" | "luxury" | "technical" | "playful";
  colorMood: "orange" | "blue" | "green" | "purple" | "red" | "gold" | "mono";
  includeSurvey: boolean;
  includePricing: boolean;
  includeFaq: boolean;
  includeTestimonial: boolean;
  extraContext?: string;
}

export const COLOR_MOODS: Record<SmartBrief["colorMood"], Partial<LPTheme>> = {
  orange: { primary: "#FF6A00", bg: "#0E0F12", surface: "#16181D" },
  blue: { primary: "#0EA5E9", bg: "#0A0F1C", surface: "#111827" },
  green: { primary: "#22C55E", bg: "#0A1410", surface: "#111C18" },
  purple: { primary: "#A855F7", bg: "#120B1C", surface: "#1B1330" },
  red: { primary: "#EF4444", bg: "#140A0A", surface: "#1E1010" },
  gold: { primary: "#EAB308", bg: "#100D06", surface: "#1A1610" },
  mono: { primary: "#F5F6F8", bg: "#0A0A0A", surface: "#141414" },
};

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

export function aiGenerateSmart(brief: SmartBrief): { name: string; sections: Section[]; theme: LPTheme } {
  const title = `Alcance resultados extraordinários em ${brief.niche || brief.offer}.`;
  const subtitle = `Solução de alto impacto desenvolvida especialmente para ${brief.audience || "empresas e profissionais que buscam escala e previsibilidade"}.`;

  const sections: Section[] = [
    {
      id: uid(),
      type: "hero",
      visible: true,
      eyebrow: brief.brand.toUpperCase() || "OPERAÇÃO COMERCIAL",
      title,
      subtitle,
      ctaPrimary: brief.objective === "quiz-diagnosis" ? "Fazer diagnóstico gratuito" : "Quero começar agora",
      ctaSecondary: "Falar com consultor",
      image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&q=80&auto=format&fit=crop",
    },
    {
      id: uid(),
      type: "logos",
      visible: true,
      title: "Empresas e líderes que confiam",
      logos: ["Vanguarda Tech", "Grupo Prime", "Nexus Business", "Global Partners"].map((l) => ({ id: uid(), label: l })),
    },
    {
      id: uid(),
      type: "features",
      visible: true,
      title: "Por que essa metodologia gera resultados?",
      subtitle: brief.extraContext || "Processos validados e desenhados para máxima taxa de conversão e lucro.",
      items: [
        { id: uid(), icon: "Target", title: "Captação Qualificada", text: "Filtre curiosos e atraia tomadores de decisão prontos para comprar." },
        { id: uid(), icon: "Zap", title: "Velocidade de Atendimento", text: "Roteamento instantâneo para contato do vendedor em minutos." },
        { id: uid(), icon: "BarChart3", title: "Métricas e ROI Transparentes", text: "Acompanhe de onde veio cada lead, custo por oportunidade e conversão final." },
      ],
    },
    {
      id: uid(),
      type: "stats",
      visible: true,
      items: [
        { id: uid(), value: "3.4x", label: "Aumento médio em conversão" },
        { id: uid(), value: "-45%", label: "Redução no CAC da operação" },
        { id: uid(), value: "100%", label: "Leads organizados no Kanban" },
      ],
    }
  ];

  if (brief.includeTestimonial) {
    sections.push({
      id: uid(),
      type: "testimonial",
      visible: true,
      quote: "Depois que implementamos esse fluxo, o time comercial parou de perder tempo com leads desqualificados e nosso fechamento disparou.",
      author: "Rodrigo Silveira",
      role: "CEO & Fundador",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
    });
  }

  if (brief.includeSurvey) {
    sections.push(blankSurvey(brief.niche || brief.audience));
  } else {
    sections.push({
      id: uid(),
      type: "form",
      visible: true,
      title: `Garanta sua vaga com a ${brief.brand || "nossa equipe"}`,
      subtitle: "Preencha seus dados abaixo para receber uma análise sob medida.",
      fields: [
        { id: uid(), label: "Nome Completo", type: "text" },
        { id: uid(), label: "E-mail Corporativo", type: "email" },
        { id: uid(), label: "WhatsApp com DDD", type: "tel" },
      ],
      button: "Garantir atendimento prioritário",
      successMsg: "Tudo certo! Recebemos sua solicitação e já estamos preparando sua análise.",
    });
  }

  if (brief.includePricing) {
    sections.push({
      id: uid(),
      type: "pricing",
      visible: true,
      title: "Planos e Pacotes Disponíveis",
      plans: [
        { id: uid(), name: "Essencial", price: "R$ 980", per: "/mês", features: ["Até 500 leads/mês", "CRM integrado", "1 funil ativo", "Suporte padrão"] },
        { id: uid(), name: "Profissional", price: "R$ 2.400", per: "/mês", features: ["Leads ilimitados", "Todas as integrações", "Quiz inteligente", "Suporte prioritário"], highlight: true },
        { id: uid(), name: "Enterprise", price: "Sob Consulta", per: "personalizado", features: ["Consultoria dedicada", "Setup de máquina comercial", "SLA garantido", "Treinamento de equipe"] },
      ],
    });
  }

  if (brief.includeFaq) {
    sections.push({
      id: uid(),
      type: "faq",
      visible: true,
      title: "Dúvidas Frequentes",
      items: [
        { id: uid(), q: "Como funciona o primeiro contato?", a: "Logo após o envio, um especialista entrará em contato para alinhar os objetivos da sua empresa." },
        { id: uid(), q: "Possui garantia de satisfação?", a: "Sim, operamos com padrões rigorosos de entrega e garantia contratual de serviço." },
        { id: uid(), q: "Preciso de conhecimento técnico?", a: "Não. Entregamos toda a estrutura configurada e pronta para operar." },
      ],
    });
  }

  sections.push({
    id: uid(),
    type: "cta",
    visible: true,
    title: "Pronto para dar o próximo passo rumo ao crescimento previsível?",
    subtitle: `Comece hoje mesmo com a estrutura da ${brief.brand || "sua empresa"}.`,
    button: "Falar com nosso time agora",
  });

  const theme: LPTheme = { ...DEFAULT_THEME, ...COLOR_MOODS[brief.colorMood] };

  return {
    name: `LP · ${brief.brand} · ${brief.objective}`,
    sections,
    theme,
  };
}

export function createLPFromSmartBrief(brief: SmartBrief): LP {
  const gen = aiGenerateSmart(brief);
  const id = `lp-${Date.now().toString(36)}`;
  const lp: LP = {
    id,
    name: gen.name,
    slug: id,
    type: "IA Smart",
    status: "Ativa",
    visits: 0,
    leads: 0,
    conv: 0,
    theme: gen.theme,
    sections: gen.sections,
    updatedAt: Date.now(),
  };
  saveLP(lp);
  return lp;
}

export function createBlankLP(name = "Nova Landing Modular"): LP {
  const id = `lp-${Date.now().toString(36)}`;
  const lp: LP = {
    id,
    name,
    slug: id,
    type: "Modular",
    status: "Ativa",
    visits: 0,
    leads: 0,
    conv: 0,
    theme: { ...DEFAULT_THEME },
    sections: blankSections(name),
    updatedAt: Date.now(),
  };
  saveLP(lp);
  return lp;
}

export interface PresetTemplateInfo {
  id: string;
  name: string;
  type: string;
  category: string;
  badge: string;
  description: string;
  image: string;
  theme: LPTheme;
  sectionsCount: number;
}

export const READY_MADE_PRESETS: PresetTemplateInfo[] = [
  {
    id: "template-moderno",
    name: "Modelo Moderno",
    type: "Digital & Tech",
    category: "Estilo Moderno",
    badge: "MODERNO",
    description: "Design cósmico escuro com selo +500 empresas, oferta de 25% OFF, botão gradiente com tag de segurança, chips de métricas sobre a imagem e cards de velocidade, gestão e experiência VIP.",
    image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80&auto=format&fit=crop",
    theme: { ...DEFAULT_THEME, primary: "#FF6A00", bg: "#0B0C10", surface: "#12141A", text: "#FFFFFF", muted: "#9CA3AF", radius: 16, font: "sora" },
    sectionsCount: 3,
  },
  {
    id: "template-minimalista",
    name: "Modelo Minimalista",
    type: "Clean & Lead Capture",
    category: "Estilo Minimalista",
    badge: "MINIMALISTA",
    description: "Visual escuro com imagem de fundo sutil, cabeçalho de 25% OFF e modal de formulário limpo com botão ciano vibrante para liberação de acesso imediato.",
    image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80&auto=format&fit=crop",
    theme: { ...DEFAULT_THEME, primary: "#00A3FF", bg: "#0E1015", surface: "#181B22", text: "#FFFFFF", muted: "#9CA3AF", radius: 12, font: "inter" },
    sectionsCount: 2,
  },
  {
    id: "template-glassmorphism",
    name: "Modelo Glassmorphism",
    type: "Luxo & Design",
    category: "Estilo Glassmorphism",
    badge: "GLASSMORPHISM",
    description: "Layout em 2 colunas com barras e brilhos de vidro translúcido, botão pílula laranja em contraste e card de imagem com brilho neon suave.",
    image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80&auto=format&fit=crop",
    theme: { ...DEFAULT_THEME, primary: "#FF6A00", bg: "#0B0E14", surface: "#141A26", text: "#FFFFFF", muted: "#9CA3AF", radius: 20, font: "manrope" },
    sectionsCount: 3,
  },
  {
    id: "template-bold",
    name: "Modelo Bold & Vibrant",
    type: "Oferta & Vendas",
    category: "Estilo Bold",
    badge: "BOLD & VIBRANT",
    description: "Design vibrante em grade laranja com tipografia pesada e inclinada, pílula preta de prova social, botão preto e card de foto inclinado com borda dupla.",
    image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80&auto=format&fit=crop",
    theme: { ...DEFAULT_THEME, primary: "#000000", bg: "#FF5500", surface: "#E04800", text: "#FFFFFF", muted: "#FFE4D6", radius: 24, font: "sora" },
    sectionsCount: 3,
  },
  {
    id: "template-corporativo",
    name: "Modelo Corporativo",
    type: "Executive B2B",
    category: "Estilo Corporativo",
    badge: "CORPORATIVO",
    description: "Visual executivo refinado em fundo preto sóbrio, player de vídeo com avaliação 4.9/5, tópicos numerados 01, 02, 03 e banner de CTA em card escuro.",
    image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80&auto=format&fit=crop",
    theme: { ...DEFAULT_THEME, primary: "#FF6A00", bg: "#0B0C0E", surface: "#121418", text: "#FFFFFF", muted: "#9CA3AF", radius: 16, font: "sora" },
    sectionsCount: 4,
  },
  {
    id: "template-infantil",
    name: "Modelo Infantil & Lúdico",
    type: "Kids, Educação & Família",
    category: "Estilo Infantil (Modo Claro)",
    badge: "INFANTIL COLORIDO",
    description: "Layout vibrante e lúdico em modo claro, com balões decorativos, paleta pastel e alegre, cards com cantos super arredondados, galeria de fotos infantis e foco em acolhimento familiar.",
    image: "https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=800&q=80&auto=format&fit=crop",
    theme: { ...DEFAULT_THEME, primary: "#FB923C", bg: "#FFFDF7", surface: "#FFFFFF", text: "#1F2937", muted: "#6B7280", radius: 24, font: "manrope" },
    sectionsCount: 4,
  },
  {
    id: "template-portfolio-pessoal",
    name: "Modelo Portfólio & CV Criativo",
    type: "Artista, Designer & Profissional Liberal",
    category: "Estilo Portfólio (Modo Escuro)",
    badge: "PORTFÓLIO & CV",
    description: "Layout escuro elegante com foto de perfil e status de disponibilidade, vitrine de trabalhos em cards cinematográficos, linha do tempo de experiência e formulário para contratação e propostas.",
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=80&auto=format&fit=crop",
    theme: { ...DEFAULT_THEME, primary: "#F97316", bg: "#0B0D14", surface: "#131724", text: "#F9FAFB", muted: "#9CA3AF", radius: 18, font: "sora" },
    sectionsCount: 4,
  },
];

export function createLPFromPreset(presetId: string, companyName = "Minha Empresa"): LP {
  const preset = READY_MADE_PRESETS.find((p) => p.id === presetId) || READY_MADE_PRESETS[0];
  const id = `lp-${Date.now().toString(36)}`;
  
  let sections: Section[] = [];

  if (presetId === "template-moderno") {
    // Imagens 1 & 2 do Usuário
    sections = [
      {
        id: uid(),
        type: "hero",
        visible: true,
        eyebrow: "+500 EMPRESAS ESCALANDO COM COMET",
        title: "25% OFF para transformar sua estética em 90 dias.",
        subtitle: "Resgate seu voucher exclusivo e fale com nossa consultora pelo WhatsApp.",
        ctaPrimary: "QUERO MEU VOUCHER AGORA",
        ctaSecondary: "✔ Sem cartões • Setup em 5min",
        image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1200&q=80&auto=format&fit=crop",
        layoutVariant: "layered-images",
        mediaType: "image",
      },
      {
        id: uid(),
        type: "stats",
        visible: true,
        items: [
          { id: uid(), value: "+42%", label: "CONVERSÃO" },
          { id: uid(), value: "14min", label: "SLA MÉDIO" },
          { id: uid(), value: "12.4x", label: "ROI ESTIMADO" },
        ],
      },
      {
        id: uid(),
        type: "features",
        visible: true,
        title: "Diferenciais do Nosso Método",
        subtitle: "Recursos projetados para alta performance e velocidade comercial.",
        items: [
          { id: uid(), icon: "Zap", title: "Velocidade de Resposta", text: "Reduza o tempo de primeiro contato para menos de 5 minutos." },
          { id: uid(), icon: "Users", title: "Gestão de Time", text: "Saiba exatamente quem está performando na sua operação." },
          { id: uid(), icon: "Star", title: "Experiência VIP", text: "Trate seus melhores leads com a prioridade que eles merecem." },
        ],
      },
      {
        id: uid(),
        type: "cta",
        visible: true,
        title: "Pronto para o próximo nível?",
        subtitle: "Resgate seu voucher exclusivo com desconto pelo WhatsApp.",
        button: "Garantir Voucher de Desconto",
      },
    ];
  } else if (presetId === "template-minimalista") {
    // Imagem 3 do Usuário
    sections = [
      {
        id: uid(),
        type: "hero",
        visible: true,
        eyebrow: "+500 EMPRESAS ESCALANDO COM COMET",
        title: "25% OFF PARA TRANSFORMAR SUA ESTÉTICA EM 90 DIAS.",
        subtitle: "Resgate seu voucher exclusivo e fale com nossa consultora pelo WhatsApp.",
        ctaPrimary: "RECEBER MATERIAL AGORA →",
        ctaSecondary: "",
        image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1200&q=80&auto=format&fit=crop",
        layoutVariant: "centered",
        mediaType: "image",
      },
      {
        id: uid(),
        type: "form",
        visible: true,
        title: "Quase lá!",
        subtitle: "Preencha seus dados para liberar o acesso.",
        successMsg: "Obrigado por se cadastrar!",
        fields: [
          { id: uid(), label: "NOME COMPLETO", type: "text" },
          { id: uid(), label: "E-MAIL CORPORATIVO", type: "email" },
          { id: uid(), label: "WHATSAPP", type: "tel" },
        ],
        button: "RECEBER MATERIAL AGORA →",
      },
    ];
  } else if (presetId === "template-glassmorphism") {
    // Imagem 4 do Usuário
    sections = [
      {
        id: uid(),
        type: "hero",
        visible: true,
        eyebrow: "— +500 EMPRESAS ESCALANDO COM COMET",
        title: "25% OFF para transformar sua estética em 90 dias.",
        subtitle: "Resgate seu voucher exclusivo e fale com nossa consultora pelo WhatsApp.",
        ctaPrimary: "QUERO MEU VOUCHER AGORA ›",
        ctaSecondary: "",
        image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1200&q=80&auto=format&fit=crop",
        layoutVariant: "glass-card",
        bgOverlay: "blur-glass",
        mediaType: "image",
      },
      {
        id: uid(),
        type: "features",
        visible: true,
        title: "Recursos de Alta Conversão",
        subtitle: "Arquitetura Glassmorphism projetada para engajar o visitante.",
        items: [
          { id: uid(), icon: "Zap", title: "Velocidade de Resposta", text: "Reduza o tempo de primeiro contato para menos de 5 minutos." },
          { id: uid(), icon: "Users", title: "Gestão de Time", text: "Saiba exatamente quem está performando na sua operação." },
          { id: uid(), icon: "Star", title: "Experiência VIP", text: "Trate seus melhores leads com a prioridade que eles merecem." },
        ],
      },
      {
        id: uid(),
        type: "cta",
        visible: true,
        title: "Pronto para o próximo nível?",
        subtitle: "As vagas são limitadas para garantir o acompanhamento individual.",
        button: "QUERO MEU VOUCHER AGORA",
      },
    ];
  } else if (presetId === "template-bold") {
    // Imagem 5 do Usuário
    sections = [
      {
        id: uid(),
        type: "hero",
        visible: true,
        eyebrow: "🔥 +500 EMPRESAS ESCALANDO COM COMET",
        title: "25% OFF PARA TRANSFORMAR SUA ESTÉTICA EM 90 DIAS.",
        subtitle: "Resgate seu voucher exclusivo e fale com nossa consultora pelo WhatsApp.",
        ctaPrimary: "QUERO MEU VOUCHER AGORA →",
        ctaSecondary: "",
        image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1200&q=80&auto=format&fit=crop",
        layoutVariant: "full-vsl",
        mediaType: "image",
      },
      {
        id: uid(),
        type: "features",
        visible: true,
        title: "O QUE VOCÊ VAI DOMINAR",
        subtitle: "Um currículo desenhado para transformar amadores em profissionais de alta performance.",
        items: [
          { id: uid(), icon: "Zap", title: "Velocidade de Resposta", text: "Reduza o tempo de primeiro contato para menos de 5 minutos." },
          { id: uid(), icon: "Users", title: "Gestão de Time", text: "Saiba exatamente quem está performando na sua operação." },
          { id: uid(), icon: "Star", title: "Experiência VIP", text: "Trate seus melhores leads com a prioridade que eles merecem." },
        ],
      },
      {
        id: uid(),
        type: "cta",
        visible: true,
        title: "PRONTO PARA O PRÓXIMO NÍVEL?",
        subtitle: "As vagas são limitadas para garantir a qualidade do suporte.",
        button: "GARANTIR MINHA VAGA COM DESCONTO",
      },
    ];
  } else if (presetId === "template-corporativo") {
    // Imagens 6, 7 & 8 do Usuário
    sections = [
      {
        id: uid(),
        type: "hero",
        visible: true,
        eyebrow: "● +500 EMPRESAS ESCALANDO COM COMET",
        title: "25% OFF PARA TRANSFORMAR SUA ESTÉTICA EM 90 DIAS.",
        subtitle: "Resgate seu voucher exclusivo e fale com nossa consultora pelo WhatsApp.",
        ctaPrimary: "QUERO MEU VOUCHER AGORA",
        ctaSecondary: "✔ ACESSO VITALÍCIO",
        image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1200&q=80&auto=format&fit=crop",
        layoutVariant: "split",
        mediaType: "video",
      },
      {
        id: uid(),
        type: "features",
        visible: true,
        title: "O QUE VOCÊ VAI DOMINAR",
        subtitle: "Um currículo desenhado para transformar amadores em profissionais de alta performance.",
        items: [
          { id: uid(), icon: "Zap", title: "VELOCIDADE DE RESPOSTA", text: "Reduza o tempo de primeiro contato para menos de 5 minutos." },
          { id: uid(), icon: "Users", title: "GESTÃO DE TIME", text: "Saiba exatamente quem está performando na sua operação." },
          { id: uid(), icon: "Star", title: "EXPERIÊNCIA VIP", text: "Trate seus melhores leads com a prioridade que eles merecem." },
        ],
      },
      {
        id: uid(),
        type: "cta",
        visible: true,
        title: "PRONTO PARA O PRÓXIMO NÍVEL?",
        subtitle: "As vagas são limitadas para garantir a qualidade do suporte e acompanhamento individual.",
        button: "GARANTIR MINHA VAGA COM DESCONTO",
      },
    ];
  } else if (presetId === "template-infantil") {
    sections = [
      {
        id: uid(),
        type: "hero",
        visible: true,
        eyebrow: "🎈 ESPAÇO LÚDICO, RECREAÇÃO & APRENDIZADO INFANTIL",
        title: "Onde a Imaginação e o Sorriso do Seu Filho Ganham Vida!",
        subtitle: "Ambiente 100% seguro, acolhedor e estimulante com oficinas de artes, música, recreação dirigida e pedagogia afetiva para todas as idades.",
        ctaPrimary: "AGENDAR VIVÊNCIA GRATUITA",
        ctaSecondary: "✔ Sem custo • Monitores Pedagógicos Certificados",
        image: "https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=1200&q=80&auto=format&fit=crop",
        layoutVariant: "split",
        mediaType: "image",
      },
      {
        id: uid(),
        type: "stats",
        visible: true,
        items: [
          { id: uid(), value: "+1.500", label: "Crianças Atendidas" },
          { id: uid(), value: "5.0 ★", label: "Avaliação dos Pais" },
          { id: uid(), value: "100%", label: "Ambiente Seguro" },
          { id: uid(), value: "12 Anos", label: "De Experiência" },
        ],
      },
      {
        id: uid(),
        type: "features",
        visible: true,
        title: "NOSSAS OFICINAS & ATIVIDADES LÚDICAS",
        subtitle: "Atividades cuidadosamente preparadas para desenvolver imaginação, empatia e coordenação motora.",
        items: [
          { id: uid(), icon: "Palette", title: "OFICINAS CRIATIVAS DE ARTE", text: "Pintura em tela, argila, colagem e contação de histórias com materiais atóxicos." },
          { id: uid(), icon: "Music", title: "MÚSICA, TEATRO & DANÇA", text: "Estímulo sensorial, ritmo e desinibição com jogos teatrais e instrumentos musicais." },
          { id: uid(), icon: "ShieldCheck", title: "ESPAÇO 100% SEGURO", text: "Pisos emborrachados, brinquedos certificados e acompanhamento pedagógico constante." },
        ],
      },
      {
        id: uid(),
        type: "cta",
        visible: true,
        title: "VENHA CONHECER DE PERTO NOSSO ESPAÇO!",
        subtitle: "Agende agora uma aula experimental gratuita para o seu pequeno se divertir e fazer novos amigos.",
        button: "QUERO UMA EXPERIÊNCIA GRATUITA",
      },
    ];
  } else if (presetId === "template-portfolio-pessoal") {
    sections = [
      {
        id: uid(),
        type: "hero",
        visible: true,
        eyebrow: "🟢 DISPONÍVEL PARA NOVOS PROJETOS & CONSULTORIAS",
        title: "Transformando Visões em Experiências Visuais de Alto Impacto.",
        subtitle: "Designer, Artista Visual e Consultor Estratégico auxiliando marcas e fundadores a alcançarem um posicionamento estético de elite.",
        ctaPrimary: "SOLICITAR PROPOSTA / ORÇAMENTO",
        ctaSecondary: "✔ Atendimento Direto • Clientes em 14 Países",
        image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1200&q=80&auto=format&fit=crop",
        layoutVariant: "split",
        mediaType: "image",
      },
      {
        id: uid(),
        type: "stats",
        visible: true,
        items: [
          { id: uid(), value: "+120", label: "Projetos Entregues" },
          { id: uid(), value: "9 Anos", label: "De Trajetória" },
          { id: uid(), value: "14 Países", label: "Clientes Atendidos" },
          { id: uid(), value: "100%", label: "Entregas no Prazo" },
        ],
      },
      {
        id: uid(),
        type: "features",
        visible: true,
        title: "ESPECIALIDADES & ENTREGÁVEIS",
        subtitle: "Soluções visuais sob medida que unem rigor estético e resultados de negócio mensuráveis.",
        items: [
          { id: uid(), icon: "Sparkles", title: "BRANDING & IDENTIDADE", text: "Ecossistema de marca completo, manual de aplicação e direção conceitual." },
          { id: uid(), icon: "Layers", title: "DESIGN DE PRODUTO & UI/UX", text: "Interfaces intuitivas, micro-interações fluidas e sistemas de design escaláveis." },
          { id: uid(), icon: "Award", title: "DIREÇÃO DE ARTE & CONSULTORIA", text: "Mentoria criativa e curadoria visual de excelência para lançamentos de destaque." },
        ],
      },
      {
        id: uid(),
        type: "cta",
        visible: true,
        title: "VAMOS CRIAR ALGO EXTRAORDINÁRIO JUNTOS?",
        subtitle: "Receba uma estimativa detalhada de escopo, prazo e investimento em até 24 horas.",
        button: "INICIAR CONVERSA / SOLICITAR PROPOSTA",
      },
    ];
  } else {
    sections = blankSections(companyName);
  }

  const lp: LP = {
    id,
    name: `${preset.name} · ${companyName}`,
    slug: id,
    type: preset.type,
    template: preset.name,
    status: "Ativa",
    visits: 0,
    leads: 0,
    conv: 0,
    theme: preset.theme,
    sections,
    updatedAt: Date.now(),
  };

  saveLP(lp);
  return lp;
}

