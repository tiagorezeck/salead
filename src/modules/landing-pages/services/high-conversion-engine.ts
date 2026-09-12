// src/modules/landing-pages/services/high-conversion-engine.ts
/**
 * ENGINE DE DESIGN E FRONTEND DE ALTA CONVERSÃO
 * Módulo Isolado de Geração Frontend para Landing Pages.
 * 
 * Responsabilidade Única:
 * Ler parâmetros de campanha, nicho, oferta e qualificação e GERAR
 * o código HTML/Tailwind completo, compilado, responsivo e ultra-personalizado.
 */

export type LPArchetype = 
  | "DIRECT_RESPONSE_VSL"
  | "INTERACTIVE_QUIZ"
  | "SAAS_BENTO_BOX"
  | "EDITORIAL_SERVICE";

export interface ChoiceCardOption {
  id: string;
  label: string;
  sublabel?: string;
  icon?: string;
  score?: number;
}

export interface QualifierQuestion {
  id: string;
  title: string;
  subtitle?: string;
  options: ChoiceCardOption[];
  allowMultiple?: boolean;
}

export interface LPGenerationParams {
  archetype?: LPArchetype;
  campaignId?: string;
  campaignName?: string;
  niche?: string;
  objective?: "lead-generation" | "quiz-diagnosis" | "sales" | "webinar" | "waitlist" | "consulting" | "vsl";
  brandName?: string;
  headline?: string;
  subheadline?: string;
  offerDescription?: string;
  ctaText?: string;
  ctaSecondaryText?: string;
  heroImage?: string;
  videoUrl?: string;
  systemWebhookUrl?: string;
  facebookPixelId?: string;
  googleTagId?: string;
  questions?: QualifierQuestion[];
  services?: { title: string; desc: string; icon: string; tag?: string }[];
  bentoFeatures?: { title: string; desc: string; icon: string; size: "1x1" | "2x1" | "2x2"; highlight?: boolean }[];
  testimonials?: { name: string; role: string; text: string; avatar: string; stars?: number; metric?: string }[];
  faqItems?: { question: string; answer: string }[];
  socialProofItems?: string[];
  pricingPlans?: { name: string; price: string; period: string; features: string[]; isPopular?: boolean; ctaText?: string }[];
  whatsappNumber?: string;
  primaryColor?: string;
  accentColor?: string;
}

/**
 * Classifica e escolhe o arquétipo mais apropriado com base no nicho e objetivo
 */
export function detectArchetype(params: Partial<LPGenerationParams>): LPArchetype {
  if (params.archetype) return params.archetype;

  const niche = (params.niche || "").toLowerCase();
  const obj = (params.objective || "").toLowerCase();
  const offer = (params.offerDescription || "").toLowerCase();
  const prompt = `${niche} ${obj} ${offer}`;

  // 1. DIRECT RESPONSE & VSL
  if (
    obj.includes("vsl") ||
    obj.includes("sales") ||
    prompt.includes("infoproduto") ||
    prompt.includes("curso") ||
    prompt.includes("lançamento") ||
    prompt.includes("tráfego direto") ||
    prompt.includes("mentoria financeira") ||
    prompt.includes("vídeo")
  ) {
    return "DIRECT_RESPONSE_VSL";
  }

  // 2. INTERACTIVE QUIZ / QUALIFIER
  if (
    obj.includes("quiz") ||
    obj.includes("diagnosis") ||
    (params.questions && params.questions.length > 0) ||
    prompt.includes("qualificação") ||
    prompt.includes("diagnóstico") ||
    prompt.includes("pesquisa") ||
    prompt.includes("alto ticket") ||
    prompt.includes("avaliação")
  ) {
    return "INTERACTIVE_QUIZ";
  }

  // 3. SAAS & TECH BENTO-BOX
  if (
    prompt.includes("saas") ||
    prompt.includes("software") ||
    prompt.includes("plataforma") ||
    prompt.includes("app") ||
    prompt.includes("ferramenta") ||
    prompt.includes("tecnologia") ||
    prompt.includes("automação") ||
    prompt.includes("dashboard")
  ) {
    return "SAAS_BENTO_BOX";
  }

  // 4. EDITORIAL & HUMANIZED SERVICE (Clínicas, Consultorias, Imóveis, Serviços Locais)
  return "EDITORIAL_SERVICE";
}

/**
 * Perguntas de qualificação padrão caso nenhuma seja fornecida
 */
export function getDefaultQuizQuestions(niche = "Geral"): QualifierQuestion[] {
  return [
    {
      id: "q1_objective",
      title: "Qual é o seu principal objetivo neste momento?",
      subtitle: "Selecione a opção que melhor reflete a sua maior prioridade:",
      options: [
        { id: "opt_growth", label: "Acelerar Vendas & Faturamento", sublabel: "Aumentar conversão imediata", icon: "trending-up", score: 30 },
        { id: "opt_leads", label: "Gerar Leads Altamente Qualificados", sublabel: "Parar de perder tempo com curiosos", icon: "target", score: 25 },
        { id: "opt_automation", label: "Automatizar Processos Comerciais", sublabel: "Menos esforço manual, mais escala", icon: "zap", score: 25 },
        { id: "opt_brand", label: "Construir Autoridade no Mercado", sublabel: "Posicionamento premium de alto valor", icon: "award", score: 20 },
      ]
    },
    {
      id: "q2_revenue",
      title: "Qual a faixa de faturamento atual do seu negócio?",
      subtitle: "Usamos esse dado para customizar a estratégia ideal para o seu porte:",
      options: [
        { id: "rev_starter", label: "Até R$ 20.000 / mês", sublabel: "Fase de validação e início de tração", icon: "shield", score: 10 },
        { id: "rev_growing", label: "R$ 20k a R$ 100.000 / mês", sublabel: "Estrutura comercial em expansão", icon: "bar-chart-3", score: 25 },
        { id: "rev_scale", label: "R$ 100k a R$ 500.000 / mês", sublabel: "Operação madura em busca de escala", icon: "flame", score: 40 },
        { id: "rev_enterprise", label: "Acima de R$ 500.000 / mês", sublabel: "Operação consolidada / Enterprise", icon: "crown", score: 50 },
      ]
    },
    {
      id: "q3_timeline",
      title: "Em quanto tempo você precisa dessa transformação?",
      subtitle: "Nosso time organiza o cronograma de implementação baseado na sua urgência:",
      options: [
        { id: "time_now", label: "Imediatamente (Próximos 7 dias)", sublabel: "Prioridade máxima de implementação", icon: "clock", score: 35 },
        { id: "time_month", label: "Neste mês (15 a 30 dias)", sublabel: "Planejamento estruturado", icon: "calendar", score: 20 },
        { id: "time_quarter", label: "No próximo trimestre", sublabel: "Estudo de viabilidade estratégica", icon: "compass", score: 10 },
      ]
    }
  ];
}

/**
 * GERADOR PRINCIPAL DO MICROSSERVIÇO:
 * Retorna EXCLUSIVAMENTE o código HTML completo compilado e pronto para uso.
 */
export function generateHighConversionLP(params: LPGenerationParams): string {
  const archetype = detectArchetype(params);
  
  // Normalização de Parâmetros
  const brand = params.brandName || "COMET Digital";
  const campaignId = params.campaignId || "{{CAMPAIGN_ID}}";
  const webhookUrl = params.systemWebhookUrl || "{{SYSTEM_WEBHOOK_URL}}";
  const primaryColor = params.primaryColor || "#FF6A00";
  const accentColor = params.accentColor || "#00F0FF";
  const questions = params.questions && params.questions.length > 0 ? params.questions : getDefaultQuizQuestions(params.niche);

  switch (archetype) {
    case "DIRECT_RESPONSE_VSL":
      return buildDirectResponseVSLHTML({ ...params, archetype, brandName: brand, campaignId, systemWebhookUrl: webhookUrl, primaryColor, accentColor, questions });
    case "INTERACTIVE_QUIZ":
      return buildInteractiveQuizHTML({ ...params, archetype, brandName: brand, campaignId, systemWebhookUrl: webhookUrl, primaryColor, accentColor, questions });
    case "SAAS_BENTO_BOX":
      return buildSaaSBentoBoxHTML({ ...params, archetype, brandName: brand, campaignId, systemWebhookUrl: webhookUrl, primaryColor, accentColor, questions });
    case "EDITORIAL_SERVICE":
    default:
      return buildEditorialServiceHTML({ ...params, archetype, brandName: brand, campaignId, systemWebhookUrl: webhookUrl, primaryColor, accentColor, questions });
  }
}

// --------------------------------------------------------------------------
// 1. ARQUÉTIPO DIRECT RESPONSE & VSL
// --------------------------------------------------------------------------
function buildDirectResponseVSLHTML(p: LPGenerationParams): string {
  const headline = p.headline || "O Método Definitivo para Escalar Vendas com Alta Previsibilidade e Lucro Máximo";
  const subheadline = p.subheadline || "Assista ao vídeo exclusivo de 8 minutos antes que esta apresentação saia do ar. Sem teorias, apenas a execução validada.";
  const ctaText = p.ctaText || "QUERO MEU ACESSO IMEDIATO";
  const videoUrl = p.videoUrl || "https://www.youtube.com/embed/dQw4w9WgXcQ";

  const socialProof = p.socialProofItems || [
    "+3.450 Alunos e Clientes Ativos",
    "98.4% de Aprovação Comprovada",
    "R$ 14.8M+ Gerados em Campanhas",
    "Suporte VIP 1-a-1 Incluso",
    "Garantia Incondicional de 7 Dias",
    "Acesso Imediato e Vitalício"
  ];

  const faqs = p.faqItems || [
    { question: "Como funciona o acesso imediato?", answer: "Assim que sua inscrição for confirmada, você recebe as credenciais de acesso por e-mail e pelo WhatsApp em menos de 2 minutos." },
    { question: "Preciso ter conhecimento prévio?", answer: "Não. O método foi desenhado do básico ao avançado com roteiros prontos para copiar e colar na sua operação." },
    { question: "E se eu não gostar ou não tiver resultados?", answer: "Você tem 7 dias de garantia incondicional. Se não ficar 100% satisfeito, devolvemos todo o seu investimento sem perguntas." },
    { question: "Terei suporte para tirar dúvidas?", answer: "Sim! Você conta com acompanhamento direto da nossa equipe de especialistas para destravar qualquer etapa." }
  ];

  return `<!DOCTYPE html>
<html lang="pt-BR" class="dark scroll-smooth">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHTML(p.brandName || "Oferta Especial")} | ${escapeHTML(headline)}</title>
  
  <!-- CDNs Obrigatórias -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            brand: '${p.primaryColor || "#FF6A00"}',
            accent: '${p.accentColor || "#00F0FF"}',
            darkBg: '#08090C',
            darkSurface: '#101218',
            darkBorder: '#1F2430'
          },
          fontFamily: {
            display: ['"Plus Jakarta Sans"', 'sans-serif'],
            body: ['Inter', 'sans-serif']
          },
          animation: {
            'pulse-glow': 'pulseGlow 2.5s infinite ease-in-out',
            'marquee': 'marquee 25s linear infinite'
          },
          keyframes: {
            pulseGlow: {
              '0%, 100%': { boxShadow: '0 0 25px rgba(255, 106, 0, 0.4)' },
              '50%': { boxShadow: '0 0 50px rgba(255, 106, 0, 0.75)' }
            },
            marquee: {
              '0%': { transform: 'translateX(0%)' },
              '100%': { transform: 'translateX(-50%)' }
            }
          }
        }
      }
    }
  </script>
  <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800;900&display=swap" rel="stylesheet">
  
  ${renderTrackingHeadScripts(p)}
</head>
<body class="bg-darkBg text-slate-100 font-body antialiased selection:bg-brand selection:text-white"
  x-data="directResponseApp()"
  x-init="initApp()"
>
  <!-- Background Glow Radials -->
  <div class="fixed inset-0 pointer-events-none overflow-hidden z-0">
    <div class="absolute -top-40 left-1/2 -translate-x-1/2 w-[750px] h-[550px] bg-brand/15 rounded-full blur-[140px]"></div>
    <div class="absolute top-1/3 -right-40 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[130px]"></div>
    <div class="absolute bottom-10 -left-40 w-[450px] h-[450px] bg-brand/10 rounded-full blur-[120px]"></div>
  </div>

  <!-- Top Announcement Bar -->
  <header class="relative z-20 border-b border-darkBorder/60 bg-darkSurface/80 backdrop-blur-md py-2.5 px-4 text-center">
    <div class="max-w-5xl mx-auto flex items-center justify-center gap-2 text-xs font-semibold text-amber-400">
      <span class="inline-flex items-center gap-1 bg-amber-500/20 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-extrabold text-amber-300">
        <i data-lucide="flame" class="w-3 h-3 text-amber-400"></i> OFERTA EXCLUSIVA
      </span>
      <span>Apresentação liberada por tempo limitado • Últimas vagas disponíveis</span>
    </div>
  </header>

  <main class="relative z-10">
    <!-- HERO / DIRECT VSL SECTION -->
    <section class="py-16 md:py-24 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
      <!-- Tag de Categoria -->
      <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-darkSurface border border-darkBorder text-slate-300 text-xs font-bold mb-6 shadow-sm">
        <span class="w-2 h-2 rounded-full bg-brand animate-ping"></span>
        <span class="tracking-wide uppercase">${escapeHTML(p.brandName || "MÉTODO OFICIAL")}</span>
      </div>

      <!-- Headline Gigante com Gradiente -->
      <h1 class="font-display text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.12] max-w-4xl mx-auto text-white">
        ${renderGradientHeadline(headline, p.primaryColor)}
      </h1>

      <!-- Subheadline Persuasiva -->
      <p class="mt-6 text-base sm:text-lg md:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
        ${escapeHTML(subheadline)}
      </p>

      <!-- VSL Video Wrapper com Borda Neon Suave -->
      <div class="mt-10 relative rounded-3xl p-1.5 bg-gradient-to-b from-brand/40 via-darkBorder to-darkBorder/40 shadow-2xl shadow-brand/10 max-w-4xl mx-auto">
        <div class="relative w-full aspect-video rounded-2xl overflow-hidden bg-black border border-white/10">
          <iframe 
            src="${escapeHTML(videoUrl)}" 
            title="Apresentação em Vídeo"
            class="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
          ></iframe>
        </div>
      </div>

      <!-- CTA Principal Animado -->
      <div class="mt-10 flex flex-col items-center gap-3">
        <button 
          type="button"
          @click="openCaptureModal()"
          class="w-full sm:w-auto px-10 py-5 rounded-2xl bg-gradient-to-r from-brand via-orange-500 to-amber-500 text-white font-display font-extrabold text-base md:text-lg tracking-wide uppercase shadow-xl hover:scale-105 active:scale-95 transition-all duration-300 animate-pulse-glow flex items-center justify-center gap-3 cursor-pointer"
        >
          <span>${escapeHTML(ctaText)}</span>
          <i data-lucide="arrow-right" class="w-5 h-5"></i>
        </button>
        <p class="text-xs text-slate-400 flex items-center gap-1.5">
          <i data-lucide="shield-check" class="w-4 h-4 text-emerald-400"></i>
          Garantia de 7 dias • Acesso 100% Seguro • Sem fidelidade
        </p>
      </div>
    </section>

    <!-- PROVA SOCIAL / MARQUEE DE IMPACTO -->
    <section class="py-6 border-y border-darkBorder bg-darkSurface/60 overflow-hidden">
      <div class="flex whitespace-nowrap overflow-hidden">
        <div class="flex items-center gap-8 animate-marquee text-xs uppercase font-bold tracking-widest text-slate-400">
          ${socialProof.map(item => `
            <span class="inline-flex items-center gap-2">
              <i data-lucide="check-circle-2" class="w-4 h-4 text-emerald-400 shrink-0"></i>
              ${escapeHTML(item)}
            </span>
            <span class="text-darkBorder">•</span>
          `).join('')}
          ${socialProof.map(item => `
            <span class="inline-flex items-center gap-2">
              <i data-lucide="check-circle-2" class="w-4 h-4 text-emerald-400 shrink-0"></i>
              ${escapeHTML(item)}
            </span>
            <span class="text-darkBorder">•</span>
          `).join('')}
        </div>
      </div>
    </section>

    <!-- PILARES / ENTREGÁVEIS DE VALOR -->
    <section class="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      <div class="text-center max-w-2xl mx-auto mb-12">
        <h2 class="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
          O que você recebe ao garantir sua vaga hoje:
        </h2>
        <p class="text-sm text-slate-400 mt-2">Um ecossistema completo desenhado para eliminar gargalos e acelerar resultados.</p>
      </div>

      <div class="grid md:grid-cols-3 gap-6">
        <div class="p-6 rounded-3xl bg-darkSurface border border-darkBorder hover:border-brand/40 transition-all duration-300">
          <div class="w-12 h-12 rounded-2xl bg-brand/10 border border-brand/20 text-brand flex items-center justify-center mb-4">
            <i data-lucide="zap" class="w-6 h-6"></i>
          </div>
          <h3 class="font-display text-base font-bold text-white">Método Direto ao Ponto</h3>
          <p class="text-xs text-slate-300 mt-2 leading-relaxed">Passo a passo estruturado para implementar em menos de 24 horas sem perder tempo com teorias vazias.</p>
        </div>

        <div class="p-6 rounded-3xl bg-darkSurface border border-darkBorder hover:border-brand/40 transition-all duration-300">
          <div class="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 text-accent flex items-center justify-center mb-4">
            <i data-lucide="layout-grid" class="w-6 h-6"></i>
          </div>
          <h3 class="font-display text-base font-bold text-white">Templates Prontos</h3>
          <p class="text-xs text-slate-300 mt-2 leading-relaxed">Modelos de alta conversão para você apenas preencher seus dados e começar a receber contatos qualificados.</p>
        </div>

        <div class="p-6 rounded-3xl bg-darkSurface border border-darkBorder hover:border-brand/40 transition-all duration-300">
          <div class="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
            <i data-lucide="headset" class="w-6 h-6"></i>
          </div>
          <h3 class="font-display text-base font-bold text-white">Acompanhamento & Suporte</h3>
          <p class="text-xs text-slate-300 mt-2 leading-relaxed">Canal prioritário com especialistas para responder dúvidas e otimizar cada etapa da sua campanha.</p>
        </div>
      </div>
    </section>

    <!-- FAQ EM ACCORDION ALPINE.JS -->
    <section class="py-20 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto border-t border-darkBorder">
      <div class="text-center mb-10">
        <span class="text-xs font-bold text-brand uppercase tracking-wider">Tire suas dúvidas</span>
        <h2 class="font-display text-2xl sm:text-3xl font-bold text-white mt-1">Perguntas Frequentes</h2>
      </div>

      <div class="space-y-3" x-data="{ activeAccordion: null }">
        ${faqs.map((faq, idx) => `
          <div class="rounded-2xl bg-darkSurface border border-darkBorder overflow-hidden">
            <button 
              type="button"
              @click="activeAccordion = activeAccordion === ${idx} ? null : ${idx}"
              class="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-display font-semibold text-sm sm:text-base text-white hover:text-brand transition-colors"
            >
              <span>${escapeHTML(faq.question)}</span>
              <i data-lucide="chevron-down" class="w-4 h-4 text-slate-400 transition-transform duration-200" :class="{ 'rotate-180 text-brand': activeAccordion === ${idx} }"></i>
            </button>
            <div x-show="activeAccordion === ${idx}" x-collapse class="px-5 pb-5 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-darkBorder/40 pt-3">
              ${escapeHTML(faq.answer)}
            </div>
          </div>
        `).join('')}
      </div>

      <!-- CTA Final de Fechamento -->
      <div class="mt-14 p-8 rounded-3xl bg-gradient-to-b from-darkSurface to-darkBg border border-brand/30 text-center shadow-xl">
        <h3 class="font-display text-xl sm:text-2xl font-bold text-white">Não perca esta oportunidade exclusiva</h3>
        <p class="text-xs sm:text-sm text-slate-300 mt-2 max-w-md mx-auto">Clique no botão abaixo para desbloquear seu acesso com condição promocional agora mesmo.</p>
        <button 
          type="button"
          @click="openCaptureModal()"
          class="mt-6 px-8 py-4 rounded-2xl bg-brand hover:opacity-95 text-white font-display font-bold text-sm tracking-wider uppercase shadow-lg shadow-brand/20 transition-all hover:scale-105 cursor-pointer"
        >
          ${escapeHTML(ctaText)}
        </button>
      </div>
    </section>
  </main>

  <!-- MODAL DE CAPTURA DE LEAD ALPINE.JS -->
  <div 
    x-show="showModal" 
    x-cloak
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
    @keydown.escape.window="showModal = false"
  >
    <div 
      @click.outside="showModal = false"
      x-show="showModal"
      x-transition:enter="transition ease-out duration-200"
      x-transition:enter-start="opacity-0 scale-95"
      x-transition:enter-end="opacity-100 scale-100"
      x-transition:leave="transition ease-in duration-150"
      x-transition:leave-start="opacity-100 scale-100"
      x-transition:leave-end="opacity-0 scale-95"
      class="relative w-full max-w-lg bg-darkSurface border border-darkBorder rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden"
    >
      <button 
        type="button" 
        @click="showModal = false"
        class="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
      >
        <i data-lucide="x" class="w-5 h-5"></i>
      </button>

      <!-- Estado: Sucesso -->
      <template x-if="submitted">
        <div class="text-center py-8 space-y-4">
          <div class="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
            <i data-lucide="check-circle" class="w-8 h-8"></i>
          </div>
          <h3 class="font-display text-xl font-bold text-white">Solicitação Recebida com Sucesso!</h3>
          <p class="text-xs text-slate-300 leading-relaxed">
            Seus dados foram validados. Em instantes nossa equipe entrará em contato pelo WhatsApp com suas instruções de acesso.
          </p>
          <button 
            type="button"
            @click="showModal = false"
            class="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all"
          >
            Fechar Janela
          </button>
        </div>
      </template>

      <!-- Estado: Formulário -->
      <template x-if="!submitted">
        <div>
          <div class="text-center mb-6">
            <span class="text-[10px] uppercase tracking-widest font-extrabold text-brand bg-brand/10 border border-brand/20 px-2.5 py-1 rounded-full">
              ÚLTIMO PASSO
            </span>
            <h3 class="font-display text-xl font-bold text-white mt-2">Onde devemos enviar seu acesso?</h3>
            <p class="text-xs text-slate-400 mt-1">Preencha seus dados abaixo para liberar o link exclusivo de matrícula:</p>
          </div>

          <form @submit.prevent="submitLead()" class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Seu Nome Completo</label>
              <div class="relative">
                <i data-lucide="user" class="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400"></i>
                <input 
                  type="text" 
                  x-model="leadForm.name"
                  required
                  placeholder="Ex: Carlos Eduardo"
                  class="w-full bg-darkBg border border-darkBorder focus:border-brand rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder:text-slate-500 outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Seu Melhor E-mail</label>
              <div class="relative">
                <i data-lucide="mail" class="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400"></i>
                <input 
                  type="email" 
                  x-model="leadForm.email"
                  required
                  placeholder="Ex: carlos@empresa.com.br"
                  class="w-full bg-darkBg border border-darkBorder focus:border-brand rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder:text-slate-500 outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">WhatsApp com DDD</label>
              <div class="relative">
                <i data-lucide="phone" class="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400"></i>
                <input 
                  type="tel" 
                  x-model="leadForm.phone"
                  required
                  placeholder="Ex: (11) 98765-4321"
                  class="w-full bg-darkBg border border-darkBorder focus:border-brand rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder:text-slate-500 outline-none transition-colors"
                />
              </div>
            </div>

            <button 
              type="submit"
              :disabled="loading"
              class="w-full py-4 rounded-xl bg-gradient-to-r from-brand via-orange-500 to-amber-500 text-white font-display font-extrabold text-sm uppercase tracking-wider shadow-lg hover:opacity-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span x-show="!loading">${escapeHTML(ctaText)}</span>
              <span x-show="loading" class="flex items-center gap-2">
                <i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Validando dados...
              </span>
            </button>

            <p class="text-[10px] text-center text-slate-500">
              🔒 Seus dados estão 100% seguros. Não praticamos SPAM.
            </p>
          </form>
        </div>
      </template>
    </div>
  </div>

  <!-- Footer -->
  <footer class="py-8 px-4 border-t border-darkBorder text-center text-xs text-slate-500">
    <p>© ${new Date().getFullYear()} ${escapeHTML(p.brandName || "COMET CRM")} — Todos os direitos reservados.</p>
  </footer>

  <!-- Script de Controle Alpine.js & Integração de Leads -->
  ${renderLeadSubmissionScript(p)}
</body>
</html>`;
}

// --------------------------------------------------------------------------
// 2. ARQUÉTIPO INTERACTIVE QUIZ / QUALIFIER
// --------------------------------------------------------------------------
function buildInteractiveQuizHTML(p: LPGenerationParams): string {
  const headline = p.headline || "Descubra o Potencial de Escala da Sua Operação em 60 Segundos";
  const subheadline = p.subheadline || "Responda a 3 perguntas rápidas e receba um diagnóstico exclusivo e plano de ação personalizado.";
  const questions = p.questions && p.questions.length > 0 ? p.questions : getDefaultQuizQuestions(p.niche);

  return `<!DOCTYPE html>
<html lang="pt-BR" class="dark scroll-smooth">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHTML(p.brandName || "Diagnóstico Interativo")} | ${escapeHTML(headline)}</title>
  
  <!-- CDNs Obrigatórias -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            brand: '${p.primaryColor || "#00F0FF"}',
            brandDark: '#00B4D8',
            surface: '#12141A',
            cardBg: '#181B24',
            lineBorder: '#232836'
          },
          fontFamily: {
            display: ['"Outfit"', 'sans-serif'],
            body: ['Inter', 'sans-serif']
          }
        }
      }
    }
  </script>
  <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@500;600;700;800&display=swap" rel="stylesheet">
  
  ${renderTrackingHeadScripts(p)}
</head>
<body 
  class="bg-[#0B0C10] text-slate-100 font-body antialiased min-h-screen flex flex-col justify-between"
  x-data="interactiveQuizApp()"
  x-init="initApp()"
>
  <!-- Background Glow -->
  <div class="fixed inset-0 pointer-events-none overflow-hidden z-0">
    <div class="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-brand/10 rounded-full blur-[140px]"></div>
  </div>

  <!-- Header -->
  <header class="relative z-20 border-b border-lineBorder/70 bg-surface/70 backdrop-blur-md py-4 px-6">
    <div class="max-w-6xl mx-auto flex items-center justify-between">
      <div class="flex items-center gap-2 font-display font-bold text-sm tracking-wide text-white">
        <span class="h-8 w-8 rounded-xl bg-brand/15 text-brand flex items-center justify-center border border-brand/30">
          <i data-lucide="sparkles" class="w-4 h-4"></i>
        </span>
        <span>${escapeHTML(p.brandName || "QUIZ DIAGNÓSTICO")}</span>
      </div>
      <div class="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
        <i data-lucide="shield" class="w-3.5 h-3.5 text-emerald-400"></i>
        <span>Diagnóstico 100% Gratuito</span>
      </div>
    </div>
  </header>

  <!-- MAIN CONTAINER -->
  <main class="relative z-10 flex-1 py-12 md:py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
    <!-- Hero Compacto -->
    <div class="text-center mb-10">
      <span class="text-xs uppercase font-extrabold tracking-widest text-brand bg-brand/10 border border-brand/20 px-3 py-1 rounded-full">
        AVALIAÇÃO DE MATURIDADE COMERCIAL
      </span>
      <h1 class="font-display text-2xl sm:text-4xl md:text-5xl font-extrabold text-white mt-3 leading-tight tracking-tight">
        ${escapeHTML(headline)}
      </h1>
      <p class="text-xs sm:text-sm text-slate-300 mt-2 max-w-xl mx-auto">
        ${escapeHTML(subheadline)}
      </p>
    </div>

    <!-- CARD DO QUIZ INTERATIVO (MULTI-STEP COM CHOICE CARDS) -->
    <div class="bg-surface border border-lineBorder rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
      <!-- Barra de Progresso Animada -->
      <div class="mb-8">
        <div class="flex items-center justify-between text-xs text-slate-400 font-bold mb-2">
          <span>ETAPA <strong class="text-brand" x-text="currentStep + 1"></strong> DE <strong>${questions.length + 1}</strong></span>
          <span x-text="Math.round(((currentStep + 1) / (${questions.length + 1})) * 100) + '% CONCLUÍDO'"></span>
        </div>
        <div class="w-full h-2 bg-darkBg rounded-full overflow-hidden border border-lineBorder">
          <div 
            class="h-full bg-gradient-to-r from-brand to-teal-400 transition-all duration-500"
            :style="'width: ' + (((currentStep + 1) / (${questions.length + 1})) * 100) + '%'"
          ></div>
        </div>
      </div>

      <!-- PERGUNTAS DINÂMICAS VIA ALPINE.JS -->
      ${questions.map((q, qIndex) => `
        <div x-show="currentStep === ${qIndex}" x-transition:enter="transition ease-out duration-300" x-transition:enter-start="opacity-0 translate-y-3" x-transition:enter-end="opacity-100 translate-y-0">
          <div class="mb-6">
            <h2 class="font-display text-lg sm:text-2xl font-bold text-white">${escapeHTML(q.title)}</h2>
            ${q.subtitle ? `<p class="text-xs sm:text-sm text-slate-400 mt-1">${escapeHTML(q.subtitle)}</p>` : ''}
          </div>

          <!-- GRID DE CHOICE CARDS -->
          <div class="grid sm:grid-cols-2 gap-3.5">
            ${q.options.map(opt => `
              <button 
                type="button"
                @click="selectOption('${q.id}', '${opt.id}', ${opt.score || 0})"
                class="p-4 sm:p-5 rounded-2xl bg-cardBg border border-lineBorder text-left transition-all duration-200 group flex items-start gap-3.5 cursor-pointer"
                :class="{ 
                  'border-brand bg-brand/10 ring-2 ring-brand/30 shadow-lg shadow-brand/10': isSelected('${q.id}', '${opt.id}'),
                  'hover:border-slate-500 hover:bg-cardBg/80': !isSelected('${q.id}', '${opt.id}')
                }"
              >
                <div 
                  class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition-colors"
                  :class="isSelected('${q.id}', '${opt.id}') ? 'bg-brand text-black font-bold' : 'bg-darkBg text-slate-400 group-hover:text-white border border-lineBorder'"
                >
                  <i data-lucide="${opt.icon || 'check'}" class="w-4 h-4"></i>
                </div>
                <div class="flex-1">
                  <div class="font-display text-sm font-bold text-white group-hover:text-brand transition-colors">${escapeHTML(opt.label)}</div>
                  ${opt.sublabel ? `<div class="text-[11px] text-slate-400 mt-0.5 leading-relaxed">${escapeHTML(opt.sublabel)}</div>` : ''}
                </div>
              </button>
            `).join('')}
          </div>
        </div>
      `).join('')}

      <!-- ETAPA FINAL: FORMULÁRIO DE DESBLOQUEIO DE RESULTADO -->
      <div x-show="currentStep === ${questions.length}" x-transition:enter="transition ease-out duration-300" x-transition:enter-start="opacity-0 translate-y-3" x-transition:enter-end="opacity-100 translate-y-0">
        
        <!-- ESTADO DE SUCESSO -->
        <template x-if="submitted">
          <div class="text-center py-10 space-y-4">
            <div class="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
              <i data-lucide="check-circle-2" class="w-8 h-8"></i>
            </div>
            <h2 class="font-display text-2xl font-bold text-white">Diagnóstico Concluído com Sucesso!</h2>
            <p class="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
              Obrigado por responder. Seu relatório estratégico foi gerado e enviado para o WhatsApp informado com a pontuação calculada.
            </p>
          </div>
        </template>

        <!-- FORMULÁRIO FINAL -->
        <template x-if="!submitted">
          <div>
            <div class="text-center mb-6">
              <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold mb-2">
                <i data-lucide="unlock" class="w-3.5 h-3.5"></i> RESPOSTAS VALIDADAS
              </div>
              <h2 class="font-display text-xl sm:text-2xl font-bold text-white">Onde devemos enviar seu Diagnóstico?</h2>
              <p class="text-xs text-slate-400 mt-1">Preencha seus dados de contato para desbloquear o relatório detalhado:</p>
            </div>

            <form @submit.prevent="submitLead()" class="space-y-4 max-w-md mx-auto">
              <div>
                <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Seu Nome Completo</label>
                <div class="relative">
                  <i data-lucide="user" class="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400"></i>
                  <input 
                    type="text" 
                    x-model="leadForm.name"
                    required
                    placeholder="Digite seu nome"
                    class="w-full bg-darkBg border border-lineBorder focus:border-brand rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder:text-slate-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">E-mail Corporativo</label>
                <div class="relative">
                  <i data-lucide="mail" class="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400"></i>
                  <input 
                    type="email" 
                    x-model="leadForm.email"
                    required
                    placeholder="voce@empresa.com"
                    class="w-full bg-darkBg border border-lineBorder focus:border-brand rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder:text-slate-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">WhatsApp para Envio do Relatório</label>
                <div class="relative">
                  <i data-lucide="phone" class="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400"></i>
                  <input 
                    type="tel" 
                    x-model="leadForm.phone"
                    required
                    placeholder="(DDD) 99999-9999"
                    class="w-full bg-darkBg border border-lineBorder focus:border-brand rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder:text-slate-500 outline-none"
                  />
                </div>
              </div>

              <button 
                type="submit"
                :disabled="loading"
                class="w-full py-4 rounded-xl bg-gradient-to-r from-brand to-teal-400 text-slate-950 font-display font-extrabold text-sm uppercase tracking-wider shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
              >
                <span x-show="!loading">DESBLOQUEAR MEU DIAGNÓSTICO AGORA</span>
                <span x-show="loading" class="flex items-center gap-2">
                  <i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Processando respostas...
                </span>
              </button>
            </form>
          </div>
        </template>
      </div>

      <!-- Navegação de Voltar -->
      <div class="mt-8 pt-4 border-t border-lineBorder/60 flex items-center justify-between text-xs text-slate-400">
        <button 
          type="button"
          x-show="currentStep > 0 && !submitted"
          @click="currentStep--"
          class="inline-flex items-center gap-1 hover:text-white font-medium cursor-pointer"
        >
          <i data-lucide="arrow-left" class="w-3.5 h-3.5"></i> Voltar pergunta anterior
        </button>
        <span class="ml-auto text-[11px]">Garantia de Privacidade • Dados Protegidos</span>
      </div>
    </div>
  </main>

  <!-- Footer -->
  <footer class="py-6 border-t border-lineBorder text-center text-xs text-slate-500">
    <p>© ${new Date().getFullYear()} ${escapeHTML(p.brandName || "COMET")} — Todos os direitos reservados.</p>
  </footer>

  <!-- Alpine.js Quiz State & Lead Dispatch Script -->
  ${renderLeadSubmissionScript(p)}
</body>
</html>`;
}

// --------------------------------------------------------------------------
// 3. ARQUÉTIPO SAAS & TECH BENTO-BOX
// --------------------------------------------------------------------------
function buildSaaSBentoBoxHTML(p: LPGenerationParams): string {
  const headline = p.headline || "A Plataforma Tudo-em-Um para Escalar sua Máquina Comercial";
  const subheadline = p.subheadline || "Unifique CRM, automação de leads e inteligência de vendas em uma interface fluida, rápida e sem atritos.";
  const ctaText = p.ctaText || "TESTAR GRATUITAMENTE POR 14 DIAS";

  const features = p.bentoFeatures || [
    { title: "Roteamento Inteligente de Leads", desc: "Distribua oportunidades para o melhor vendedor em menos de 3 segundos com SLA auditado.", icon: "zap", size: "2x1", highlight: true },
    { title: "Pipelines Customizáveis", desc: "Kanban dinâmico com métricas de tempo em cada etapa.", icon: "layout", size: "1x1" },
    { title: "Playbooks de Vendas Integrados", desc: "Scripts e orientações na tela durante o atendimento do consultor.", icon: "book-open", size: "1x1" },
    { title: "Métricas & Analytics de Conversão", desc: "Acompanhe de onde vem o seu ROI em tempo real com rastreamento profundo de canais e campanhas UTM.", icon: "bar-chart-2", size: "2x2" },
    { title: "Automação Multi-Canal", desc: "Disparos e lembretes automáticos no WhatsApp e E-mail.", icon: "bot", size: "2x1" }
  ];

  return `<!DOCTYPE html>
<html lang="pt-BR" class="dark scroll-smooth">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHTML(p.brandName || "Plataforma SaaS")} | ${escapeHTML(headline)}</title>
  
  <!-- CDNs Obrigatórias -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            brand: '${p.primaryColor || "#3B82F6"}',
            brandDark: '#1D4ED8',
            surface: '#11141D',
            cardDark: '#161B26',
            zincBorder: '#232938'
          },
          fontFamily: {
            display: ['"Outfit"', 'sans-serif'],
            body: ['Inter', 'sans-serif']
          }
        }
      }
    }
  </script>
  <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@600;700;800&display=swap" rel="stylesheet">
  
  ${renderTrackingHeadScripts(p)}
</head>
<body 
  class="bg-[#090B10] text-slate-100 font-body antialiased selection:bg-brand selection:text-white"
  x-data="directResponseApp()"
  x-init="initApp()"
>
  <!-- Background Grid Effect -->
  <div class="fixed inset-0 pointer-events-none opacity-20 bg-[radial-gradient(#3B82F6_1px,transparent_1px)] [background-size:24px_24px] z-0"></div>

  <!-- Header -->
  <header class="relative z-20 border-b border-zincBorder/80 bg-surface/70 backdrop-blur-md py-4 px-6">
    <div class="max-w-7xl mx-auto flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="h-9 w-9 rounded-xl bg-brand/10 border border-brand/30 text-brand flex items-center justify-center font-black">
          <i data-lucide="box" class="w-5 h-5"></i>
        </div>
        <span class="font-display font-bold text-base text-white">${escapeHTML(p.brandName || "COMET OS")}</span>
      </div>

      <button 
        type="button"
        @click="openCaptureModal()"
        class="px-4 py-2 rounded-xl bg-brand hover:bg-brandDark text-white text-xs font-bold transition-all shadow-md cursor-pointer"
      >
        Começar Grátis
      </button>
    </div>
  </header>

  <main class="relative z-10">
    <!-- HERO SPLIT 50/50 -->
    <section class="py-20 md:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div class="grid lg:grid-cols-12 gap-12 items-center">
        <!-- Lado Esquerdo: Copy -->
        <div class="lg:col-span-7 space-y-6 text-left">
          <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand/10 border border-brand/30 text-brand text-xs font-bold">
            <i data-lucide="sparkles" class="w-3.5 h-3.5"></i>
            <span>NOVA VERSÃO 3.0 DISPONÍVEL</span>
          </div>

          <h1 class="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.12]">
            ${escapeHTML(headline)}
          </h1>

          <p class="text-base sm:text-lg text-slate-300 leading-relaxed max-w-xl">
            ${escapeHTML(subheadline)}
          </p>

          <div class="flex flex-wrap items-center gap-4 pt-2">
            <button 
              type="button"
              @click="openCaptureModal()"
              class="px-8 py-4 rounded-2xl bg-brand hover:bg-brandDark text-white font-display font-bold text-sm tracking-wide shadow-xl shadow-brand/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              ${escapeHTML(ctaText)}
            </button>
            <span class="text-xs text-slate-400 flex items-center gap-1.5">
              <i data-lucide="check" class="w-4 h-4 text-emerald-400"></i> Sem cartão de crédito
            </span>
          </div>
        </div>

        <!-- Lado Direito: Mockup Glassmorphism Form -->
        <div class="lg:col-span-5">
          <div class="bg-cardDark/90 border border-zincBorder rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative">
            <div class="flex items-center gap-2 mb-6 pb-4 border-b border-zincBorder">
              <span class="w-3 h-3 rounded-full bg-rose-500/80"></span>
              <span class="w-3 h-3 rounded-full bg-amber-500/80"></span>
              <span class="w-3 h-3 rounded-full bg-emerald-500/80"></span>
              <span class="text-[11px] text-slate-400 font-mono ml-2">quick_access.sh</span>
            </div>

            <h3 class="font-display font-bold text-lg text-white mb-1">Crie sua Conta Gratuita</h3>
            <p class="text-xs text-slate-400 mb-6">Liberamos o ambiente completo em menos de 1 minuto.</p>

            <form @submit.prevent="submitLead()" class="space-y-4">
              <div>
                <label class="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">Nome Completo</label>
                <input 
                  type="text" 
                  x-model="leadForm.name"
                  required
                  placeholder="Seu nome"
                  class="w-full bg-surface border border-zincBorder focus:border-brand rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 outline-none"
                />
              </div>

              <div>
                <label class="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">E-mail Corporativo</label>
                <input 
                  type="email" 
                  x-model="leadForm.email"
                  required
                  placeholder="voce@suaempresa.com"
                  class="w-full bg-surface border border-zincBorder focus:border-brand rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 outline-none"
                />
              </div>

              <div>
                <label class="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">WhatsApp</label>
                <input 
                  type="tel" 
                  x-model="leadForm.phone"
                  required
                  placeholder="(DDD) 99999-9999"
                  class="w-full bg-surface border border-zincBorder focus:border-brand rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 outline-none"
                />
              </div>

              <button 
                type="submit"
                :disabled="loading"
                class="w-full py-3.5 rounded-xl bg-brand hover:bg-brandDark text-white font-display font-bold text-xs uppercase tracking-wider shadow-lg transition-all cursor-pointer disabled:opacity-50"
              >
                <span x-show="!loading">CRIAR CONTA & DESBLOQUEAR ACESSO</span>
                <span x-show="loading" class="flex items-center justify-center gap-2">
                  <i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Criando workspace...
                </span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>

    <!-- GRID BENTO BOX DE RECURSOS -->
    <section class="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-zincBorder">
      <div class="text-center max-w-2xl mx-auto mb-16">
        <span class="text-xs uppercase font-extrabold tracking-widest text-brand">ARQUITETURA MODERNA</span>
        <h2 class="font-display text-3xl sm:text-4xl font-extrabold text-white mt-1">
          Feito para Equipes que Buscam Alta Performance
        </h2>
      </div>

      <!-- GRID BENTO -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        ${features.map(f => {
          const isWide = f.size === "2x1" || f.size === "2x2";
          return `
            <div class="${isWide ? 'md:col-span-2' : 'md:col-span-1'} p-8 rounded-3xl bg-cardDark border border-zincBorder hover:border-brand/50 transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div class="w-12 h-12 rounded-2xl bg-brand/10 border border-brand/30 text-brand flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <i data-lucide="${f.icon || 'star'}" class="w-6 h-6"></i>
                </div>
                <h3 class="font-display text-xl font-bold text-white mb-2">${escapeHTML(f.title)}</h3>
                <p class="text-xs sm:text-sm text-slate-300 leading-relaxed">${escapeHTML(f.desc)}</p>
              </div>
              <div class="mt-6 pt-4 border-t border-zincBorder/60 flex items-center gap-2 text-xs font-semibold text-brand">
                <span>Saiba mais</span>
                <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </section>

    <!-- TABELA COMPARATIVA -->
    <section class="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto border-t border-zincBorder">
      <div class="text-center mb-12">
        <h2 class="font-display text-2xl sm:text-3xl font-bold text-white">Por que escolher nossa plataforma?</h2>
        <p class="text-xs text-slate-400 mt-1">Veja a diferença prática em relação aos métodos tradicionais:</p>
      </div>

      <div class="overflow-x-auto rounded-3xl border border-zincBorder bg-cardDark">
        <table class="w-full text-left text-xs sm:text-sm">
          <thead>
            <tr class="border-b border-zincBorder bg-surface">
              <th class="p-4 font-bold text-white">Critério de Avaliação</th>
              <th class="p-4 font-bold text-brand bg-brand/5 border-x border-zincBorder">Nossa Plataforma</th>
              <th class="p-4 font-bold text-slate-400">CRMs Antigos / Planilhas</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-zincBorder text-slate-300">
            <tr>
              <td class="p-4 font-medium">Tempo de Setup</td>
              <td class="p-4 font-bold text-emerald-400 bg-brand/5 border-x border-zincBorder">Menos de 15 minutos</td>
              <td class="p-4 text-slate-500">Semanas de consultoria</td>
            </tr>
            <tr>
              <td class="p-4 font-medium">Automação de Follow-up</td>
              <td class="p-4 font-bold text-emerald-400 bg-brand/5 border-x border-zincBorder">Nativa no WhatsApp & E-mail</td>
              <td class="p-4 text-slate-500">Requer plugins caros</td>
            </tr>
            <tr>
              <td class="p-4 font-medium">Qualificação com Quiz</td>
              <td class="p-4 font-bold text-emerald-400 bg-brand/5 border-x border-zincBorder">Inclusa sem custo extra</td>
              <td class="p-4 text-slate-500">Ferramentas de terceiros</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </main>

  <!-- MODAL DE CAPTURA ALPINE.JS -->
  <div 
    x-show="showModal" 
    x-cloak
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
    @keydown.escape.window="showModal = false"
  >
    <div 
      @click.outside="showModal = false"
      class="w-full max-w-md bg-cardDark border border-zincBorder rounded-3xl p-6 sm:p-8 shadow-2xl relative"
    >
      <button 
        type="button" 
        @click="showModal = false"
        class="absolute top-4 right-4 text-slate-400 hover:text-white p-2"
      >
        <i data-lucide="x" class="w-5 h-5"></i>
      </button>

      <h3 class="font-display font-bold text-xl text-white mb-1">Comece seu Teste Gratuito</h3>
      <p class="text-xs text-slate-400 mb-6">Preencha os dados abaixo para receber seu login:</p>

      <form @submit.prevent="submitLead()" class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-300 uppercase mb-1">Nome</label>
          <input 
            type="text" 
            x-model="leadForm.name"
            required
            class="w-full bg-surface border border-zincBorder rounded-xl p-3 text-xs text-white"
          />
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-300 uppercase mb-1">E-mail</label>
          <input 
            type="email" 
            x-model="leadForm.email"
            required
            class="w-full bg-surface border border-zincBorder rounded-xl p-3 text-xs text-white"
          />
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-300 uppercase mb-1">WhatsApp</label>
          <input 
            type="tel" 
            x-model="leadForm.phone"
            required
            class="w-full bg-surface border border-zincBorder rounded-xl p-3 text-xs text-white"
          />
        </div>
        <button 
          type="submit"
          :disabled="loading"
          class="w-full py-4 rounded-xl bg-brand text-white font-bold text-xs uppercase"
        >
          DESBLOQUEAR ACESSO AGORA
        </button>
      </form>
    </div>
  </div>

  <!-- Footer -->
  <footer class="py-8 px-4 border-t border-zincBorder text-center text-xs text-slate-500">
    <p>© ${new Date().getFullYear()} ${escapeHTML(p.brandName || "COMET")} — Todos os direitos reservados.</p>
  </footer>

  <!-- Script de Envio -->
  ${renderLeadSubmissionScript(p)}
</body>
</html>`;
}

// --------------------------------------------------------------------------
// 4. ARQUÉTIPO EDITORIAL & HUMANIZED SERVICE
// --------------------------------------------------------------------------
function buildEditorialServiceHTML(p: LPGenerationParams): string {
  const headline = p.headline || "Excelência, Cuidado e Resultados Comprovados para Transformar sua Vida";
  const subheadline = p.subheadline || "Atendimento humanizado e personalizado com especialistas dedicados a entender suas necessidades.";
  const ctaText = p.ctaText || "AGENDAR UMA CONSULTA / AVALIAÇÃO";
  const heroImage = p.heroImage || "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1200&q=80&auto=format&fit=crop";

  const services = p.services || [
    { title: "Avaliação Personalizada", desc: "Diagnóstico completo das necessidades com plano de acompanhamento exclusivo.", icon: "heart-pulse", tag: "Mais Procurado" },
    { title: "Tratamentos Avançados", desc: "Tecnologia de ponta e metodologia validada para máxima segurança e eficácia.", icon: "sparkles" },
    { title: "Acompanhamento Contínuo", desc: "Suporte individual para garantir a consistência e evolução dos seus resultados.", icon: "user-check" },
  ];

  const testimonials = p.testimonials || [
    { name: "Dra. Carolina Mendes", role: "Paciente / Cliente", text: "O atendimento superou todas as minhas expectativas. O cuidado e atenção aos detalhes fizeram toda a diferença.", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80&auto=format&fit=crop", stars: 5 },
    { name: "Marcos Vinicius", role: "Cliente Satisfeito", text: "Profissionalismo impecável desde a recepção até a entrega final do resultado. Recomendo de olhos fechados.", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80&auto=format&fit=crop", stars: 5 }
  ];

  return `<!DOCTYPE html>
<html lang="pt-BR" class="scroll-smooth">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHTML(p.brandName || "Atendimento Especializado")} | ${escapeHTML(headline)}</title>
  
  <!-- CDNs Obrigatórias -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            brand: '${p.primaryColor || "#059669"}',
            brandDark: '#047857',
            creamBg: '#FBFBFA',
            warmSurface: '#FFFFFF',
            warmBorder: '#E8E8E3',
            darkText: '#18181B'
          },
          fontFamily: {
            display: ['"Playfair Display"', 'serif'],
            body: ['"Plus Jakarta Sans"', 'sans-serif']
          }
        }
      }
    }
  </script>
  <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;0,800;1,600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  
  ${renderTrackingHeadScripts(p)}
</head>
<body 
  class="bg-creamBg text-darkText font-body antialiased selection:bg-brand selection:text-white"
  x-data="directResponseApp()"
  x-init="initApp()"
>
  <!-- Header Sofisticado -->
  <header class="border-b border-warmBorder bg-warmSurface/80 backdrop-blur-md sticky top-0 z-30 py-4 px-6">
    <div class="max-w-6xl mx-auto flex items-center justify-between">
      <div class="font-display font-bold text-xl tracking-tight text-darkText">
        ${escapeHTML(p.brandName || "Espaço & Saúde")}
      </div>
      <button 
        type="button"
        @click="openCaptureModal()"
        class="px-5 py-2.5 rounded-full bg-brand hover:bg-brandDark text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
      >
        Agendar Horário
      </button>
    </div>
  </header>

  <main>
    <!-- HERO EDITORIAL COM FOTO HUMANA E CARD EM OVERLAY -->
    <section class="py-16 md:py-24 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      <div class="grid lg:grid-cols-12 gap-10 items-center">
        <div class="lg:col-span-6 space-y-6">
          <span class="inline-block text-xs font-bold tracking-[0.2em] text-brand uppercase">
            ATENDIMENTO HUMANIZADO & EXCLUSIVO
          </span>
          <h1 class="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-darkText leading-[1.15] tracking-tight">
            ${escapeHTML(headline)}
          </h1>
          <p class="text-base sm:text-lg text-slate-600 leading-relaxed">
            ${escapeHTML(subheadline)}
          </p>
          <div class="pt-2 flex flex-wrap items-center gap-4">
            <button 
              type="button"
              @click="openCaptureModal()"
              class="px-8 py-4 rounded-full bg-brand hover:bg-brandDark text-white font-semibold text-sm shadow-lg shadow-brand/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              ${escapeHTML(ctaText)}
            </button>
          </div>
        </div>

        <div class="lg:col-span-6 relative">
          <div class="aspect-[4/3] rounded-3xl overflow-hidden border border-warmBorder shadow-2xl">
            <img src="${escapeHTML(heroImage)}" alt="Atendimento Especializado" class="w-full h-full object-cover" />
          </div>
          <!-- Card Flutuante de Avaliação -->
          <div class="absolute -bottom-6 -left-6 bg-warmSurface border border-warmBorder rounded-2xl p-4 shadow-xl flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <i data-lucide="star" class="w-5 h-5 fill-amber-500 text-amber-500"></i>
            </div>
            <div>
              <div class="font-bold text-xs text-darkText">Nota 4.9 de 5.0</div>
              <div class="text-[11px] text-slate-500">+1.200 atendimentos realizados</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- GRADE DE SERVIÇOS EM CARDS EXPANSÍVEIS -->
    <section class="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto border-t border-warmBorder">
      <div class="text-center max-w-xl mx-auto mb-14">
        <span class="text-xs font-bold uppercase tracking-widest text-brand">NOSSAS ESPECIALIDADES</span>
        <h2 class="font-display text-3xl sm:text-4xl font-bold text-darkText mt-1">Serviços Desenhados Para Você</h2>
      </div>

      <div class="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
        ${services.map(s => `
          <div class="p-6 rounded-3xl bg-warmSurface border border-warmBorder hover:border-brand/50 shadow-sm transition-all duration-300 group">
            <div class="w-12 h-12 rounded-2xl bg-brand/10 text-brand flex items-center justify-center mb-5">
              <i data-lucide="${s.icon || 'check'}" class="w-6 h-6"></i>
            </div>
            ${s.tag ? `<span class="text-[10px] font-extrabold uppercase tracking-wider text-brand bg-brand/10 px-2 py-0.5 rounded-full mb-2 inline-block">${escapeHTML(s.tag)}</span>` : ''}
            <h3 class="font-display text-lg font-bold text-darkText mb-2">${escapeHTML(s.title)}</h3>
            <p class="text-xs text-slate-600 leading-relaxed">${escapeHTML(s.desc)}</p>
          </div>
        `).join('')}
      </div>
    </section>

    <!-- DEPOIMENTOS DE CLIENTES COM AVALIAÇÃO -->
    <section class="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto border-t border-warmBorder">
      <div class="text-center mb-12">
        <h2 class="font-display text-3xl font-bold text-darkText">O Que Nossos Clientes Dizem</h2>
      </div>

      <div class="grid md:grid-cols-2 gap-6">
        ${testimonials.map(t => `
          <div class="p-8 rounded-3xl bg-warmSurface border border-warmBorder shadow-sm space-y-4">
            <div class="flex items-center gap-1 text-amber-500">
              ${Array(t.stars || 5).fill(0).map(() => `<i data-lucide="star" class="w-4 h-4 fill-amber-400"></i>`).join('')}
            </div>
            <p class="text-xs sm:text-sm text-slate-700 italic leading-relaxed">"${escapeHTML(t.text)}"</p>
            <div class="flex items-center gap-3 pt-2 border-t border-warmBorder">
              <img src="${escapeHTML(t.avatar)}" alt="${escapeHTML(t.name)}" class="w-10 h-10 rounded-full object-cover" />
              <div>
                <div class="font-bold text-xs text-darkText">${escapeHTML(t.name)}</div>
                <div class="text-[11px] text-slate-500">${escapeHTML(t.role)}</div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </section>

    <!-- SEÇÃO FINAL DE FORMULÁRIO INTEGRADO -->
    <section class="py-20 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto border-t border-warmBorder text-center">
      <h2 class="font-display text-3xl font-bold text-darkText">Agende sua Sessão Conosco</h2>
      <p class="text-xs text-slate-600 mt-2">Nossa equipe entrará em contato para confirmar o melhor horário.</p>

      <div class="mt-8 bg-warmSurface border border-warmBorder rounded-3xl p-6 sm:p-8 shadow-xl text-left max-w-lg mx-auto">
        <form @submit.prevent="submitLead()" class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Nome Completo</label>
            <input 
              type="text" 
              x-model="leadForm.name"
              required
              class="w-full bg-creamBg border border-warmBorder rounded-xl p-3 text-xs text-darkText"
              placeholder="Digite seu nome"
            />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">E-mail</label>
            <input 
              type="email" 
              x-model="leadForm.email"
              required
              class="w-full bg-creamBg border border-warmBorder rounded-xl p-3 text-xs text-darkText"
              placeholder="voce@email.com"
            />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">WhatsApp</label>
            <input 
              type="tel" 
              x-model="leadForm.phone"
              required
              class="w-full bg-creamBg border border-warmBorder rounded-xl p-3 text-xs text-darkText"
              placeholder="(DDD) 99999-9999"
            />
          </div>
          <button 
            type="submit"
            :disabled="loading"
            class="w-full py-4 rounded-xl bg-brand hover:bg-brandDark text-white font-bold text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer"
          >
            SOLICITAR AGENDAMENTO PRIORITÁRIO
          </button>
        </form>
      </div>
    </section>
  </main>

  <!-- Modal de Captura -->
  <div 
    x-show="showModal" 
    x-cloak
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
  >
    <div @click.outside="showModal = false" class="w-full max-w-md bg-warmSurface border border-warmBorder rounded-3xl p-6 shadow-2xl relative">
      <button @click="showModal = false" class="absolute top-4 right-4 text-slate-400 p-2"><i data-lucide="x" class="w-4 h-4"></i></button>
      <h3 class="font-display font-bold text-xl text-darkText mb-4">Agendar Atendimento</h3>
      <form @submit.prevent="submitLead()" class="space-y-3">
        <input type="text" x-model="leadForm.name" required placeholder="Nome Completo" class="w-full bg-creamBg border border-warmBorder rounded-xl p-3 text-xs" />
        <input type="email" x-model="leadForm.email" required placeholder="E-mail" class="w-full bg-creamBg border border-warmBorder rounded-xl p-3 text-xs" />
        <input type="tel" x-model="leadForm.phone" required placeholder="WhatsApp" class="w-full bg-creamBg border border-warmBorder rounded-xl p-3 text-xs" />
        <button type="submit" class="w-full py-3.5 rounded-xl bg-brand text-white font-bold text-xs uppercase">ENVIAR DADOS</button>
      </form>
    </div>
  </div>

  <footer class="py-8 border-t border-warmBorder text-center text-xs text-slate-400">
    <p>© ${new Date().getFullYear()} ${escapeHTML(p.brandName || "Atendimento")} — Todos os direitos reservados.</p>
  </footer>

  ${renderLeadSubmissionScript(p)}
</body>
</html>`;
}

// --------------------------------------------------------------------------
// SCRIPTS DE RASTREAMENTO, UTMS E SUBMISSÃO DE LEADS
// --------------------------------------------------------------------------
function renderTrackingHeadScripts(p: LPGenerationParams): string {
  const pixel = p.facebookPixelId;
  const gtm = p.googleTagId;

  let out = "";
  if (pixel) {
    out += `
    <!-- Meta Pixel Code -->
    <script>
      !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
      n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
      document,'script','https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '${escapeHTML(pixel)}');
      fbq('track', 'PageView');
    </script>
    <!-- End Meta Pixel Code -->`;
  }

  if (gtm) {
    out += `
    <!-- Google Tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=${escapeHTML(gtm)}"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${escapeHTML(gtm)}');
    </script>`;
  }

  return out;
}

function renderLeadSubmissionScript(p: LPGenerationParams): string {
  const webhookUrl = p.systemWebhookUrl || "{{SYSTEM_WEBHOOK_URL}}";
  const campaignId = p.campaignId || "{{CAMPAIGN_ID}}";
  const whatsappNumber = p.whatsappNumber || "";

  return `
  <script>
    function directResponseApp() {
      return {
        showModal: false,
        submitted: false,
        loading: false,
        leadForm: { name: '', email: '', phone: '' },
        answers: {},
        utmParams: {},

        initApp() {
          this.parseUtms();
          this.$nextTick(() => {
            if (window.lucide) window.lucide.createIcons();
          });
        },

        openCaptureModal() {
          this.showModal = true;
          this.$nextTick(() => {
            if (window.lucide) window.lucide.createIcons();
          });
        },

        parseUtms() {
          const p = new URLSearchParams(window.location.search);
          this.utmParams = {
            utm_source: p.get('utm_source') || p.get('src') || 'direct',
            utm_medium: p.get('utm_medium') || 'organic',
            utm_campaign: p.get('utm_campaign') || 'landing-page',
            utm_term: p.get('utm_term') || '',
            utm_content: p.get('utm_content') || ''
          };
        },

        async submitLead() {
          this.loading = true;

          const payload = {
            campaign_id: "${campaignId}",
            lead_data: {
              name: this.leadForm.name,
              email: this.leadForm.email,
              phone: this.leadForm.phone
            },
            qualification_answers: this.answers,
            utm_params: this.utmParams
          };

          try {
            // Disparo para o Webhook do Sistema
            await fetch("${webhookUrl}", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload)
            });

            // Pixels de Conversão
            if (window.fbq) fbq('track', 'Lead');
            if (window.gtag) gtag('event', 'generate_lead', { event_category: 'Lead', event_label: '${campaignId}' });

            this.submitted = true;

            ${whatsappNumber ? `
              setTimeout(() => {
                const msg = encodeURIComponent("Olá! Preenchi o formulário na página com meus dados e gostaria de atendimento.");
                window.open("https://wa.me/${whatsappNumber}?text=" + msg, "_blank");
              }, 1200);
            ` : ''}

          } catch (err) {
            console.error("Erro no envio:", err);
            // Fallback de sucesso para experiência do usuário
            this.submitted = true;
          } finally {
            this.loading = false;
            this.$nextTick(() => {
              if (window.lucide) window.lucide.createIcons();
            });
          }
        }
      };
    }

    function interactiveQuizApp() {
      return {
        currentStep: 0,
        totalSteps: ${(p.questions?.length || 3) + 1},
        answers: {},
        leadForm: { name: '', email: '', phone: '' },
        loading: false,
        submitted: false,
        utmParams: {},

        initApp() {
          this.parseUtms();
          this.$nextTick(() => {
            if (window.lucide) window.lucide.createIcons();
          });
        },

        parseUtms() {
          const p = new URLSearchParams(window.location.search);
          this.utmParams = {
            utm_source: p.get('utm_source') || p.get('src') || 'direct',
            utm_medium: p.get('utm_medium') || 'organic',
            utm_campaign: p.get('utm_campaign') || 'quiz-qualifier'
          };
        },

        selectOption(questionId, optionId, score) {
          this.answers[questionId] = { optionId, score, answeredAt: new Date().toISOString() };
          setTimeout(() => {
            this.currentStep++;
            this.$nextTick(() => {
              if (window.lucide) window.lucide.createIcons();
            });
          }, 250);
        },

        isSelected(questionId, optionId) {
          return this.answers[questionId] && this.answers[questionId].optionId === optionId;
        },

        async submitLead() {
          this.loading = true;

          const payload = {
            campaign_id: "${campaignId}",
            lead_data: {
              name: this.leadForm.name,
              email: this.leadForm.email,
              phone: this.leadForm.phone
            },
            qualification_answers: this.answers,
            utm_params: this.utmParams
          };

          try {
            await fetch("${webhookUrl}", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload)
            });

            if (window.fbq) fbq('track', 'Lead');
            if (window.gtag) gtag('event', 'generate_lead');

            this.submitted = true;
          } catch (err) {
            console.error("Erro no envio:", err);
            this.submitted = true;
          } finally {
            this.loading = false;
            this.$nextTick(() => {
              if (window.lucide) window.lucide.createIcons();
            });
          }
        }
      };
    }

    document.addEventListener("DOMContentLoaded", () => {
      if (window.lucide) window.lucide.createIcons();
    });
  </script>
  `;
}

function escapeHTML(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderGradientHeadline(headline: string, primaryColor = "#FF6A00"): string {
  const parts = headline.split(" ");
  if (parts.length <= 3) {
    return escapeHTML(headline);
  }
  
  // Destaca as últimas palavras com gradiente
  const regular = parts.slice(0, -3).join(" ");
  const highlighted = parts.slice(-3).join(" ");

  return `${escapeHTML(regular)} <span class="text-transparent bg-clip-text bg-gradient-to-r from-brand via-orange-400 to-amber-300">${escapeHTML(highlighted)}</span>`;
}
