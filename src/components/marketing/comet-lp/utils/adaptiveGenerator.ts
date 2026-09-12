// Adaptive Heuristic CRO Landing Page Generator
// Portable for both client-side and server-side zero-downtime execution
import { applyThematicImagesToPage } from "./imageResolver";

export interface AdaptiveLandingPageParams {
  prompt?: string;
  niche?: string;
  cityOrRegion?: string;
  targetAudience?: string;
  offerDetails?: string;
  accentColor?: string;
  theme?: string;
  heroModel?: string;
}

export function generateAdaptiveLandingPage(params: AdaptiveLandingPageParams) {
  const niche = params.niche || "Mentoria & Serviços de Alto Impacto";
  const city = params.cityOrRegion || "São Paulo e Região";
  const audience = params.targetAudience || "Empresários, Profissionais e Líderes";
  const rawPrompt = params.prompt || "Solução completa e aceleradora de resultados";

  const fullContext = `${niche} ${rawPrompt} ${audience}`.toLowerCase();

  // 1. Intelligent Domain Archetype Detection
  const isHealthOrClinic = /médic|saúde|clínic|odonto|dentist|dermatolog|estétic|psicolog|nutri|hospital|fisioterap|harmoniza|beleza|longevidade/i.test(fullContext);
  const isSaaSOrTech = /saas|software|app|plataforma|ia|inteligência artificial|bot|whatsapp|automação|tech|dev|dashboard|cloud|cyber/i.test(fullContext);
  const isHighTicketMentorship = /mentoria|mastermind|high-ticket|high ticket|coaching|liderança|executiv|imersão|aceleração/i.test(fullContext);
  const isB2BConsulting = /consultoria|b2b|gestão|processos|corporativ|empresarial|financeir|contábil|tributári|advocacia|advogad|jurídic/i.test(fullContext);
  const isEbookOrCourse = /ebook|e-book|livro|curso|formação|treinamento|certificação|aula|método/i.test(fullContext);
  const isRealEstateOrSolar = /imóve|imobiliár|corretor|solar|energia|engenharia|construção|arquitet|casa|terreno/i.test(fullContext);
  const isEventsOrUrgency = /evento|congresso|imersão|vagas|workshop|presencial|show|encontro/i.test(fullContext);

  // 2. Intelligent Theme Selection (Light / Dark / Midnight / Hybrid)
  let chosenTheme: "light" | "dark" | "midnight" | "hybrid" = "dark";
  if (params.theme && ["light", "dark", "midnight", "hybrid"].includes(params.theme) && params.theme !== "auto") {
    chosenTheme = params.theme as any;
  } else {
    if (isHealthOrClinic) {
      chosenTheme = "light"; // White Pro / Clean Medical aesthetic
    } else if (isRealEstateOrSolar) {
      chosenTheme = "dark";
    } else if (isB2BConsulting) {
      chosenTheme = "midnight";
    } else if (isSaaSOrTech) {
      chosenTheme = "dark";
    } else if (isHighTicketMentorship) {
      chosenTheme = "midnight";
    } else {
      chosenTheme = "dark";
    }
  }

  // 3. Intelligent Accent Color Selection
  let chosenColor = params.accentColor;
  if (!chosenColor || chosenColor === "auto") {
    if (isHealthOrClinic) {
      chosenColor = /estétic|harmoniza|beleza/i.test(fullContext) ? "rose" : "emerald";
    } else if (isSaaSOrTech) {
      chosenColor = "cyan";
    } else if (isHighTicketMentorship) {
      chosenColor = "purple";
    } else if (isB2BConsulting) {
      chosenColor = /jurídic|advogad/i.test(fullContext) ? "blue" : "indigo";
    } else if (isRealEstateOrSolar) {
      chosenColor = /solar|energia/i.test(fullContext) ? "amber" : "emerald";
    } else if (isEbookOrCourse) {
      chosenColor = "orange";
    } else {
      chosenColor = "purple";
    }
  }

  // 4. Intelligent Hero Model Selection
  let chosenHeroModel: string = "split_image";
  if (params.heroModel && params.heroModel !== "auto") {
    chosenHeroModel = params.heroModel;
  } else {
    if (isHealthOrClinic) {
      chosenHeroModel = chosenTheme === "light" ? "white_pro" : "split_image";
    } else if (isSaaSOrTech) {
      chosenHeroModel = "centered_showcase";
    } else if (isHighTicketMentorship) {
      chosenHeroModel = "b2b_metrics";
    } else if (isB2BConsulting) {
      chosenHeroModel = "b2b_metrics";
    } else if (isEbookOrCourse) {
      chosenHeroModel = "editorial_ebook";
    } else if (isEventsOrUrgency) {
      chosenHeroModel = "urgency_counter";
    } else if (isRealEstateOrSolar) {
      chosenHeroModel = "split_lead_form";
    } else {
      chosenHeroModel = "split_image";
    }
  }

  // 5. Intelligent Strategic Section Ordering
  let chosenSectionOrder: Array<"hero" | "socialProof" | "quiz" | "bentoGrid" | "testimonials" | "formSection" | "faq">;
  if (isSaaSOrTech) {
    chosenSectionOrder = ["hero", "socialProof", "bentoGrid", "quiz", "testimonials", "formSection", "faq"];
  } else if (isHighTicketMentorship || isB2BConsulting) {
    chosenSectionOrder = ["hero", "socialProof", "quiz", "bentoGrid", "testimonials", "formSection", "faq"];
  } else if (isHealthOrClinic || isRealEstateOrSolar) {
    chosenSectionOrder = ["hero", "quiz", "socialProof", "bentoGrid", "testimonials", "formSection", "faq"];
  } else {
    chosenSectionOrder = ["hero", "socialProof", "quiz", "bentoGrid", "testimonials", "formSection", "faq"];
  }

  const isVideoModel = chosenHeroModel === "split_video";

  const rawPage = {
    title: `Aceleração CRO • ${niche}`,
    niche: niche,
    cityOrRegion: city,
    targetAudience: audience,
    accentColor: chosenColor,
    theme: chosenTheme,
    sectionOrder: chosenSectionOrder,
    hero: {
      model: chosenHeroModel,
      badgeText: `⚡ Exclusivo para ${city} • Vagas Abertas`,
      headline: `Multiplique seus Resultados com a Metodologia Definitiva para ${niche}`,
      subheadline: `Elimine a estagnação e implemente um ecossistema comprovado para atrair clientes de alto valor em ${city}.`,
      mediaType: isVideoModel ? "video" : "image",
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      videoThumbnail: "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1200&q=80",
      imageUrl: "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1200&q=80",
      ctaText: "QUERO MEU DIAGNÓSTICO GRATUITO AGORA",
      ctaSubtext: "⚡ Análise personalizada em menos de 2 minutos via WhatsApp",
      countdownMinutes: 15,
      ratingScore: "4.9/5",
      ratingText: "+14.500 clientes acelerados",
      socialProofAvatars: [
        { name: "Gabriel S.", avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80" },
        { name: "Mariana C.", avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80" },
        { name: "Rodrigo F.", avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80" },
      ],
      b2bMetrics: [
        { id: "b2bm_1", value: "+340%", label: "Média de Crescimento", sublabel: "Validado no primeiro trimestre" },
        { id: "b2bm_2", value: "99.4%", label: "Satisfação de Clientes", sublabel: "Em mais de 50 cidades" },
        { id: "b2bm_3", value: "10 Min", label: "Tempo de Resposta", sublabel: "Atendimento direto e consultivo" },
      ],
      showcaseMetrics: [
        { id: "sm_1", value: "99.9%", label: "Eficiência Operacional" },
        { id: "sm_2", value: "3.8x", label: "Aceleração de Retorno" },
        { id: "sm_3", value: "24/7", label: "Disponibilidade Contínua" },
      ],
      scarcityLabel: `Vagas Restantes para ${city}`,
      scarcityRemainingSlots: 6,
      scarcityTotalSlots: 20,
    },
    socialProof: {
      marqueeTitle: "EMPRESAS E LÍDERES QUE VALIDAM E APROVAM NOSSO MÉTODO",
      metrics: [
        { id: "m1", value: "+18.900", label: "Leads Qualificados", sublabel: "Gerados nos últimos 90 dias", iconName: "Users" },
        { id: "m2", value: "99.4%", label: "Taxa de Satisfação", sublabel: "Avaliações 5 estrelas verificadas", iconName: "ShieldCheck" },
        { id: "m3", value: "3.8x", label: "Aceleração Média", sublabel: "Retorno sobre investimento", iconName: "TrendingUp" },
        { id: "m4", value: "24/7", label: "Atendimento & Suporte", sublabel: "Acompanhamento direto", iconName: "Zap" },
      ],
      marqueeLogos: ["Forbes Brasil", "Exame", "InfoMoney", "Valor Econômico", "G1 Negócios", "Bloomberg Línea"],
    },
    quiz: {
      badge: "DIAGNÓSTICO PERSONALIZADO CRO",
      title: `Descubra se o seu perfil é ideal para o nosso programa em ${city}`,
      subtitle: "Responda 3 perguntas rápidas para liberar sua condição exclusiva com bônus de aceleração.",
      questions: [
        {
          id: "q1",
          question: "Qual é o principal desafio que você enfrenta hoje?",
          description: "Isso define o diagnóstico exato da sua aceleração.",
          options: [
            { id: "o1", label: "Escalar vendas com previsibilidade e lucro", iconName: "TrendingUp", badge: "Mais Escolhida" },
            { id: "o2", label: "Atrair clientes qualificados dispostos a pagar mais", iconName: "Target", badge: "Alta Prioridade" },
            { id: "o3", label: "Profissionalizar processos e economizar tempo", iconName: "ShieldCheck" },
          ],
        },
        {
          id: "q2",
          question: "Em quanto tempo você deseja ver os primeiros resultados?",
          description: "Nossa metodologia é adaptada para aceleração imediata.",
          options: [
            { id: "o4", label: "Imediatamente (nos próximos 7 a 14 dias)", iconName: "Zap", badge: "Aceleração Total" },
            { id: "o5", label: "Em até 30 dias com base sólida", iconName: "CheckCircle" },
            { id: "o6", label: "Estou estruturando para os próximos 60 dias", iconName: "Award" },
          ],
        },
        {
          id: "q3",
          question: `Qual é o seu nível de compromisso com a expansão em ${city}?`,
          description: "Selecionamos apenas perfis realmente comprometidos.",
          options: [
            { id: "o7", label: "100% comprometido em executar o plano", iconName: "Sparkles", badge: "Perfil VIP" },
            { id: "o8", label: "Quero conhecer a proposta e tirar dúvidas", iconName: "HelpCircle" },
          ],
        },
      ],
      resultTitle: "Perfil Qualificado com Sucesso! 🎉",
      resultDescription: `Seu diagnóstico foi aprovado para a turma exclusiva de ${city}. Finalize o cadastro abaixo para garantir as condições especiais.`,
    },
    bentoGrid: {
      badge: "ARQUITETURA DO MÉTODO COMPROVADO",
      title: "Como funciona o ecossistema de alta conversão",
      subtitle: "Uma esteira inteligente em blocos desenhada para transformar interesse em faturamento real.",
      items: [
        {
          id: "b1",
          size: "large",
          title: "Funil de Vendas de Alta Conversão",
          description: `Estrutura de páginas rápidas e persuasivas que convertem tráfego frio em clientes fiéis em ${city}.`,
          tag: "Pilar Principal",
          iconName: "Zap",
          metric: "+340% Conversão",
        },
        {
          id: "b2",
          size: "tall",
          title: "Qualificação Automática via Quiz",
          description: "Filtre curiosos e receba apenas leads prontos para comprar, prontos no seu WhatsApp.",
          tag: "Automação",
          iconName: "Target",
          metric: "98% Retenção",
        },
        {
          id: "b3",
          size: "standard",
          title: "Acompanhamento Individual",
          description: "Suporte dedicado e plano de ação passo a passo para garantir execução sem erros.",
          tag: "Suporte VIP",
          iconName: "CheckCircle",
        },
        {
          id: "b4",
          size: "standard",
          title: "Garantia Incondicional Blindada",
          description: "Risco zero: se você não aprovar os resultados nos primeiros 15 dias, devolvemos 100% do valor.",
          tag: "Segurança Total",
          iconName: "ShieldCheck",
        },
      ],
    },
    testimonials: {
      badge: "PROVA REAL & RESULTADOS",
      title: "Quem aplicou o método, transformou seus resultados",
      subtitle: `Veja depoimentos reais de pessoas e empresas que escalaram com a nossa estrutura em ${city}.`,
      items: [
        {
          id: "t1",
          name: "Dr. Marcelo Fagundes",
          role: "Diretor Clínico",
          companyOrCity: city,
          avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
          rating: 5,
          content: "A estrutura de Quiz e a copy regionalizada aumentaram nossa taxa de agendamento em 240% logo no primeiro mês.",
          resultHighlight: "+R$ 142.000 em 45 dias",
          verified: true,
        },
        {
          id: "t2",
          name: "Camila Nogueira",
          role: "Fundadora & Mentora",
          companyOrCity: "São Paulo, SP",
          avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80",
          rating: 5,
          content: "O formulário integrado ao WhatsApp economizou horas da minha equipe e aumentou drasticamente o comparecimento nas reuniões.",
          resultHighlight: "Taxa de 89% de Comparecimento",
          verified: true,
        },
        {
          id: "t3",
          name: "Renato Silveira",
          role: "Empresário & Investidor",
          companyOrCity: city,
          avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
          rating: 5,
          content: "Design impecável com alta autoridade. Nossos clientes elogiam a sofisticação da página diariamente.",
          resultHighlight: "3.6x Mais Vendas",
          verified: true,
        },
      ],
    },
    formSection: {
      badge: `ETAPA FINAL • VAGAS LIMITADAS PARA ${city.toUpperCase()}`,
      title: "Preencha seus dados para receber o diagnóstico completo",
      subtitle: "Nossa equipe entrará em contato via WhatsApp em menos de 10 minutos com o seu plano personalizado.",
      ctaButtonText: "QUERO GARANTIR MINHA CONDIÇÃO ESPECIAL",
      guaranteeDays: 15,
      guaranteeText: "Garantia Incondicional de 15 Dias: Risco absolutamente zero para testar e validar.",
      securityBadges: [
        "Criptografia SSL 256-bit",
        "Atendimento Prioritário no WhatsApp",
        "Privacidade de Dados 100% Protegida",
        "Acesso Imediato aos Bônus",
      ],
      offerPrice: "R$ 497",
      originalPrice: "R$ 1.997",
      installmentsText: "ou 12x de R$ 49,90",
    },
    faq: [
      {
        id: "f1",
        question: "Como recebo o acesso e o diagnóstico após me cadastrar?",
        answer: "Assim que preencher seus dados, você receberá a confirmação imediatamente e nossa equipe enviará seu plano exclusivo diretamente no seu WhatsApp.",
      },
      {
        id: "f2",
        question: "Existe alguma garantia caso eu não fique satisfeito?",
        answer: "Sim! Você conta com 15 dias de garantia incondicional blindada. Se não gostar por qualquer motivo, basta uma mensagem para receber 100% do seu dinheiro de volta.",
      },
      {
        id: "f3",
        question: `O método funciona especificamente para o mercado de ${city}?`,
        answer: `Sim! Toda a nossa esteira foi desenvolvida e validada considerando as particularidades regionais e o perfil de clientes de ${city}.`,
      },
      {
        id: "f4",
        question: "Preciso de conhecimento técnico ou equipe para aplicar?",
        answer: "Não. A solução é 100% pronta para uso, intuitiva e acompanhada por suporte individual passo a passo.",
      },
    ],
  };

  return applyThematicImagesToPage(rawPage);
}
