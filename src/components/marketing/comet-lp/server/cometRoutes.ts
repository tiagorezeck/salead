import { Router, Request, Response } from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI, Type } from "@google/genai";
import { applyThematicImagesToPage } from "../utils/imageResolver";
import { generateAdaptiveLandingPage } from "../utils/adaptiveGenerator";
import { SURVEY_PRESETS } from "../../../../lib/survey-templates";
import { GLOBAL_GAS_CONFIG, normalizeGasUrl } from "../../../../config/gasConfig";
function isUUID(str?: string): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

const LP_DATA_FILE = path.join(process.cwd(), "data", "landing_pages.json");
const SURVEYS_DATA_FILE = path.join(process.cwd(), "data", "surveys.json");
const RESPONSES_DATA_FILE = path.join(process.cwd(), "data", "survey_responses.json");
const LEADS_DATA_FILE = path.join(process.cwd(), "data", "leads_submissions.json");

// In-memory caches for sub-millisecond response times
let memoryLps: any[] | null = null;
let memoryLeads: any[] | null = null;
let memorySurveys: any[] | null = null;
let memoryResponses: any[] | null = null;

function ensureDataDir() {
  const dir = path.dirname(LP_DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function scheduleBackgroundWrite(filePath: string, data: any) {
  setImmediate(async () => {
    try {
      ensureDataDir();
      const tmpPath = `${filePath}.tmp.${Date.now()}`;
      await fs.promises.writeFile(tmpPath, JSON.stringify(data, null, 2), "utf-8");
      await fs.promises.rename(tmpPath, filePath);
    } catch (err) {
      console.warn(`Background safe write notice for ${filePath}:`, err);
    }
  });
}

function readStoredLeads(): any[] {
  if (memoryLeads) return memoryLeads;
  try {
    ensureDataDir();
    if (fs.existsSync(LEADS_DATA_FILE)) {
      const raw = fs.readFileSync(LEADS_DATA_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        memoryLeads = parsed;
        return memoryLeads;
      }
    }
  } catch (e) {
    console.error("Failed to read stored leads submissions:", e);
  }
  memoryLeads = [];
  return memoryLeads;
}

function writeStoredLeads(leads: any[]) {
  memoryLeads = leads;
  scheduleBackgroundWrite(LEADS_DATA_FILE, leads);
}

function normalizeSlugServer(str?: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const DEFAULT_INITIAL_LANDING_PAGES: any[] = [
  {
    id: "da43e674-83f0-499f-b4bc-036304a98b90",
    name: "Mentoria High-Ticket & CRO",
    title: "Mentoria High-Ticket & CRO",
    type: "Gerada por IA",
    template: "COMET",
    status: "Ativa",
    visits: 0,
    leads: 0,
    conv: 0,
    niche: "Mentoria High-Ticket & Infoprodutos",
    cityOrRegion: "São Paulo, SP",
    targetAudience: "Infoprodutores, Mentores e Donos de Agência faturando acima de R$ 30k/mês",
    accentColor: "purple",
    theme: "dark",
    slug: "mentoria-high-ticket-cro",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    visibility: {
      hero: true,
      socialProof: true,
      quiz: true,
      bentoGrid: true,
      testimonials: true,
      formSection: true,
      faq: true,
      stickyMobileCta: true,
    },
    sectionOrder: ["hero", "socialProof", "quiz", "bentoGrid", "testimonials", "formSection", "faq"],
    hero: {
      model: "split_image",
      badgeText: "⚡ Vagas Abertas para São Paulo - Turma VIP",
      badgeIcon: "Zap",
      headline: "Escale suas Vendas High-Ticket com Tráfego Direto e Conversão Extrema",
      subheadline: "O método definitivo para transformar leads qualificados em clientes de alto valor todos os dias com segurança e previsibilidade.",
      mediaType: "image",
      imageUrl: "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1200&q=80",
      ctaText: "QUERO ME CANDIDATAR À MENTORIA",
      ctaSubtext: "⚡ Análise de perfil em menos de 10 minutos via WhatsApp",
      countdownMinutes: 14,
      ratingScore: "4.9/5",
      ratingText: "+14.850 empresários impactados e R$ 48M+ gerados",
      socialProofAvatars: [
        { name: "Lucas M.", avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80" },
        { name: "Beatriz R.", avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80" },
        { name: "Carlos E.", avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80" },
      ],
      b2bMetrics: [
        { id: "b2b_1", value: "+340%", label: "Crescimento Médio", sublabel: "Em menos de 90 dias" },
        { id: "b2b_2", value: "99.4%", label: "Satisfação Verificada", sublabel: "Avaliações auditadas" },
        { id: "b2b_3", value: "10 Min", label: "Tempo de Resposta", sublabel: "Atendimento VIP" },
      ],
      scarcityLabel: "Vagas Restantes para São Paulo",
      scarcityRemainingSlots: 4,
      scarcityTotalSlots: 15,
    },
    socialProof: {
      marqueeTitle: "EMPRESAS E MENTORADOS QUE APROVAM NOSSO MÉTODO",
      metrics: [
        { id: "m1", value: "+R$ 48.7M", label: "Faturamento Gerado", sublabel: "Pelos mentorados em 12 meses", iconName: "TrendingUp" },
        { id: "m2", value: "3.8x", label: "ROAS Médio", sublabel: "Em tráfego direto de conversão", iconName: "Zap" },
        { id: "m3", value: "99.4%", label: "Taxa de Aprovação", sublabel: "Avaliações de alta satisfação", iconName: "ShieldCheck" },
        { id: "m4", value: "+14.850", label: "Negócios Impactados", sublabel: "Em todo território nacional", iconName: "Users" },
      ],
      marqueeLogos: ["Forbes Brasil", "Exame", "InfoMoney", "Valor Econômico", "G1 Negócios", "TechCrunch"],
    },
    quiz: {
      badge: "DIAGNÓSTICO PERSONALIZADO",
      title: "Descubra se o seu negócio está pronto para a Aceleração",
      subtitle: "Responda 3 perguntas rápidas para liberar sua condição especial.",
      questions: [
        {
          id: "q1",
          question: "Qual é o seu objetivo de faturamento mensal?",
          description: "Definimos o ritmo de acordo com sua meta.",
          options: [
            { id: "opt_1", label: "Alcançar de R$ 50k a R$ 100k/mês", iconName: "TrendingUp", badge: "Alta Demanda" },
            { id: "opt_2", label: "Escalar acima de R$ 100k/mês no perpétuo", iconName: "Zap" },
            { id: "opt_3", label: "Estruturar equipe de vendas e fechar high-ticket", iconName: "Target" },
          ],
        },
      ],
    },
    bentoGrid: {
      badge: "MÉTODO COMET CRO",
      title: "Os 4 Pilares da Escala Previsível",
      subtitle: "Engenharia de conversão aplicada para resultados reais.",
      cards: [
        { id: "b1", title: "Tráfego Direto de Alta Intenção", description: "Atraia clientes prontos para comprar sem perder tempo com curioso.", iconName: "Target" },
        { id: "b2", title: "Páginas com Direção de Arte VIP", description: "Design de elite que gera confiança imediata e autoridade indiscutível.", iconName: "Sparkles" },
        { id: "b3", title: "Qualificação Automática por Quiz", description: "Filtre os melhores clientes antes de enviar para o seu time comercial.", iconName: "Filter" },
        { id: "b4", title: "Fechamento Rápido no WhatsApp", description: "Roteiros validados e integração nativa com o COMET CRM.", iconName: "MessageCircle" },
      ],
    },
    testimonials: {
      badge: "PROVA SOCIAL AUDITADA",
      title: "Resultados Reais de Quem Aplica o Método",
      subtitle: "Mentorados que escalaram seus negócios com previsibilidade.",
      cards: [
        { id: "t1", name: "Ricardo Fonseca", role: "Mentor de Vendas B2B", company: "Fonseca Consultoria", result: "R$ 180k em 45 dias", content: "A estrutura de landing page com o quiz qualificador mudou totalmente o nível dos leads que chegam no meu WhatsApp.", avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80", rating: 5 },
        { id: "t2", name: "Mariana Costa", role: "Dermatologista & Empresária", company: "Clínica Costa", result: "Agenda lotada por 3 meses", content: "Conseguimos aumentar a taxa de conversão em 4x logo na primeira semana de veiculação das campanhas.", avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80", rating: 5 },
      ],
    },
    formSection: {
      badge: "VAGAS LIMITADAS",
      title: "Garanta seu Diagnóstico Gratuito Agora",
      subtitle: "Preencha abaixo para receber a análise estratégica do seu funil.",
      ctaButtonText: "SOLICITAR ANÁLISE NO WHATSAPP",
      guaranteeText: "🔒 Seus dados estão 100% seguros. Atendimento humano e personalizado.",
    },
    faq: [
      { question: "Para quem é indicada esta mentoria?", answer: "Para infoprodutores, mentores, consultores, clínicas e empresários que desejam escalar suas vendas com previsibilidade e tráfego pago de alta conversão." },
      { question: "Como funciona a aplicação?", answer: "Após preencher o formulário ou responder o quiz, nossa equipe analisará seu perfil e entrará em contato via WhatsApp em até 10 minutos." },
    ],
  },
  {
    id: "lp_ai_mentoria_cro",
    name: "Mentoria High-Ticket & CRO",
    title: "Mentoria High-Ticket & CRO",
    type: "Gerada por IA",
    template: "COMET",
    status: "Ativa",
    visits: 0,
    leads: 0,
    conv: 0,
    niche: "Mentoria High-Ticket & Infoprodutos",
    cityOrRegion: "São Paulo, SP",
    targetAudience: "Infoprodutores, Mentores e Donos de Agência faturando acima de R$ 30k/mês",
    accentColor: "purple",
    theme: "dark",
    slug: "mentoria-high-ticket-cro",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    visibility: {
      hero: true,
      socialProof: true,
      quiz: true,
      bentoGrid: true,
      testimonials: true,
      formSection: true,
      faq: true,
      stickyMobileCta: true,
    },
    sectionOrder: ["hero", "socialProof", "quiz", "bentoGrid", "testimonials", "formSection", "faq"],
    hero: {
      model: "split_image",
      badgeText: "⚡ Vagas Abertas para São Paulo - Turma VIP",
      badgeIcon: "Zap",
      headline: "Escale suas Vendas High-Ticket com Tráfego Direto e Conversão Extrema",
      subheadline: "O método definitivo para transformar leads qualificados em clientes de alto valor todos os dias com segurança e previsibilidade.",
      mediaType: "image",
      imageUrl: "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1200&q=80",
      ctaText: "QUERO ME CANDIDATAR À MENTORIA",
      ctaSubtext: "⚡ Análise de perfil em menos de 10 minutos via WhatsApp",
      countdownMinutes: 14,
      ratingScore: "4.9/5",
      ratingText: "+14.850 empresários impactados e R$ 48M+ gerados",
      socialProofAvatars: [
        { name: "Lucas M.", avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80" },
        { name: "Beatriz R.", avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80" },
        { name: "Carlos E.", avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80" },
      ],
      b2bMetrics: [
        { id: "b2b_1", value: "+340%", label: "Crescimento Médio", sublabel: "Em menos de 90 dias" },
        { id: "b2b_2", value: "99.4%", label: "Satisfação Verificada", sublabel: "Avaliações auditadas" },
        { id: "b2b_3", value: "10 Min", label: "Tempo de Resposta", sublabel: "Atendimento VIP" },
      ],
      scarcityLabel: "Vagas Restantes para São Paulo",
      scarcityRemainingSlots: 4,
      scarcityTotalSlots: 15,
    },
    socialProof: {
      marqueeTitle: "EMPRESAS E MENTORADOS QUE APROVAM NOSSO MÉTODO",
      metrics: [
        { id: "m1", value: "+R$ 48.7M", label: "Faturamento Gerado", sublabel: "Pelos mentorados em 12 meses", iconName: "TrendingUp" },
        { id: "m2", value: "3.8x", label: "ROAS Médio", sublabel: "Em tráfego direto de conversão", iconName: "Zap" },
        { id: "m3", value: "99.4%", label: "Taxa de Aprovação", sublabel: "Avaliações de alta satisfação", iconName: "ShieldCheck" },
        { id: "m4", value: "+14.850", label: "Negócios Impactados", sublabel: "Em todo território nacional", iconName: "Users" },
      ],
      marqueeLogos: ["Forbes Brasil", "Exame", "InfoMoney", "Valor Econômico", "G1 Negócios", "TechCrunch"],
    },
    quiz: {
      badge: "DIAGNÓSTICO PERSONALIZADO",
      title: "Descubra se o seu negócio está pronto para a Aceleração",
      subtitle: "Responda 3 perguntas rápidas para liberar sua condição especial.",
      questions: [
        {
          id: "q1",
          question: "Qual é o seu objetivo de faturamento mensal?",
          description: "Definimos o ritmo de acordo com sua meta.",
          options: [
            { id: "opt_1", label: "Alcançar de R$ 50k a R$ 100k/mês", iconName: "TrendingUp", badge: "Alta Demanda" },
            { id: "opt_2", label: "Escalar acima de R$ 100k/mês no perpétuo", iconName: "Zap" },
            { id: "opt_3", label: "Estruturar equipe de vendas e fechar high-ticket", iconName: "Target" },
          ],
        },
      ],
    },
    bentoGrid: {
      badge: "MÉTODO COMET CRO",
      title: "Os 4 Pilares da Escala Previsível",
      subtitle: "Engenharia de conversão aplicada para resultados reais.",
      cards: [
        { id: "b1", title: "Tráfego Direto de Alta Intenção", description: "Atraia clientes prontos para comprar sem perder tempo com curioso.", iconName: "Target" },
        { id: "b2", title: "Páginas com Direção de Arte VIP", description: "Design de elite que gera confiança imediata e autoridade indiscutível.", iconName: "Sparkles" },
        { id: "b3", title: "Qualificação Automática por Quiz", description: "Filtre os melhores clientes antes de enviar para o seu time comercial.", iconName: "Filter" },
        { id: "b4", title: "Fechamento Rápido no WhatsApp", description: "Roteiros validados e integração nativa com o COMET CRM.", iconName: "MessageCircle" },
      ],
    },
    testimonials: {
      badge: "PROVA SOCIAL AUDITADA",
      title: "Resultados Reais de Quem Aplica o Método",
      subtitle: "Mentorados que escalaram seus negócios com previsibilidade.",
      cards: [
        { id: "t1", name: "Ricardo Fonseca", role: "Mentor de Vendas B2B", company: "Fonseca Consultoria", result: "R$ 180k em 45 dias", content: "A estrutura de landing page com o quiz qualificador mudou totalmente o nível dos leads que chegam no meu WhatsApp.", avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80", rating: 5 },
        { id: "t2", name: "Mariana Costa", role: "Dermatologista & Empresária", company: "Clínica Costa", result: "Agenda lotada por 3 meses", content: "Conseguimos aumentar a taxa de conversão em 4x logo na primeira semana de veiculação das campanhas.", avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80", rating: 5 },
      ],
    },
    formSection: {
      badge: "VAGAS LIMITADAS",
      title: "Garanta seu Diagnóstico Gratuito Agora",
      subtitle: "Preencha abaixo para receber a análise estratégica do seu funil.",
      ctaButtonText: "SOLICITAR ANÁLISE NO WHATSAPP",
      guaranteeText: "🔒 Seus dados estão 100% seguros. Atendimento humano e personalizado.",
    },
    faq: [
      { question: "Para quem é indicada esta mentoria?", answer: "Para infoprodutores, mentores, consultores, clínicas e empresários que desejam escalar suas vendas com previsibilidade e tráfego pago de alta conversão." },
      { question: "Como funciona a aplicação?", answer: "Após preencher o formulário ou responder o quiz, nossa equipe analisará seu perfil e entrará em contato via WhatsApp em até 10 minutos." },
    ],
  }
];

function readStoredLandingPages(): any[] {
  if (memoryLps && memoryLps.length > 0) return memoryLps;
  try {
    ensureDataDir();
    if (fs.existsSync(LP_DATA_FILE)) {
      const raw = fs.readFileSync(LP_DATA_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryLps = parsed;
        return memoryLps;
      }
    }
    writeStoredLandingPages(DEFAULT_INITIAL_LANDING_PAGES);
    memoryLps = DEFAULT_INITIAL_LANDING_PAGES;
    return memoryLps;
  } catch (e) {
    console.error("Failed to read stored landing pages:", e);
  }
  memoryLps = DEFAULT_INITIAL_LANDING_PAGES;
  return memoryLps;
}

function writeStoredLandingPages(pages: any[]) {
  memoryLps = pages;
  scheduleBackgroundWrite(LP_DATA_FILE, pages);
}

const DEFAULT_SERVER_SURVEYS: any[] = SURVEY_PRESETS.map((p) => ({
  id: p.id,
  name: p.name,
  type: (p.id.includes("min") || p.id.includes("qualificacao")) ? "individual" : "mass",
  purpose: (p.id.includes("min") || p.id.includes("qualificacao")) ? "min" : "common",
  status: "active",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  questions: p.questions || [],
  settings: {
    headline: p.name,
    description: p.description,
    buttonText: "Iniciar Diagnóstico",
    thankYouMessage: "Obrigado por responder nosso diagnóstico!",
    accentColor: p.accentColor || "#FF6B00",
  },
  reward: {
    title: "Diagnóstico Completo",
    type: "whatsapp",
    value: "",
  },
  template: "Modern",
  completions: 0,
  visits: 0,
  created_at: new Date().toISOString(),
}));

function readStoredSurveys(): any[] {
  if (memorySurveys && memorySurveys.length > 0) return memorySurveys;
  let surveysList: any[] = [];
  try {
    ensureDataDir();
    if (fs.existsSync(SURVEYS_DATA_FILE)) {
      const raw = fs.readFileSync(SURVEYS_DATA_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        surveysList = parsed;
      }
    }
  } catch (e) {
    console.error("Failed to read stored surveys:", e);
  }

  const mergedMap = new Map<string, any>();
  DEFAULT_SERVER_SURVEYS.forEach((s) => mergedMap.set(s.id, s));
  surveysList.forEach((s) => {
    if (s && s.id) {
      const prev = mergedMap.get(s.id);
      mergedMap.set(s.id, { ...(prev || {}), ...s });
    }
  });

  memorySurveys = Array.from(mergedMap.values());
  return memorySurveys;
}

function writeStoredSurveys(surveys: any[]) {
  memorySurveys = surveys;
  scheduleBackgroundWrite(SURVEYS_DATA_FILE, surveys);
}

function readStoredSurveyResponses(): any[] {
  if (memoryResponses) return memoryResponses;
  try {
    ensureDataDir();
    if (fs.existsSync(RESPONSES_DATA_FILE)) {
      const raw = fs.readFileSync(RESPONSES_DATA_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        memoryResponses = parsed;
        return memoryResponses;
      }
    }
  } catch (e) {
    console.error("Failed to read stored survey responses:", e);
  }
  memoryResponses = [];
  return memoryResponses;
}

function writeStoredSurveyResponses(resps: any[]) {
  memoryResponses = resps;
  scheduleBackgroundWrite(RESPONSES_DATA_FILE, resps);
}

// ============================================================================
// GOOGLE SHEETS & DRIVE SERVER-SIDE BIDIRECTIONAL SYNC
// ============================================================================
export function getDriveWebAppUrlServer(): string {
  const envUrl = process.env.GAS_WEBAPP_URL || process.env.VITE_GAS_WEBAPP_URL || "";
  if (envUrl) return normalizeGasUrl(envUrl);
  for (const cfgName of ["drive_config.json", "server-config.json"]) {
    try {
      const driveCfgPath = path.join(process.cwd(), cfgName);
      if (fs.existsSync(driveCfgPath)) {
        const raw = JSON.parse(fs.readFileSync(driveCfgPath, "utf-8"));
        const url = raw.webappUrl || raw.WEBAPP_URL || "";
        if (url) return normalizeGasUrl(url);
      }
    } catch {}
  }
  return normalizeGasUrl(GLOBAL_GAS_CONFIG.WEBAPP_URL);
}

export function syncDriveDataToDisk(driveData: any): { leadsCount: number; pagesCount: number } {
  if (!driveData || typeof driveData !== "object") return { leadsCount: 0, pagesCount: 0 };

  const rawLeads = Array.isArray(driveData.leads) ? driveData.leads : (Array.isArray(driveData.data?.leads) ? driveData.data.leads : []);
  const rawLpLeads = Array.isArray(driveData.leads_landing_pages) ? driveData.leads_landing_pages : (Array.isArray(driveData.data?.leads_landing_pages) ? driveData.data.leads_landing_pages : []);
  const rawLps = Array.isArray(driveData.landingPages) ? driveData.landingPages : (Array.isArray(driveData.data?.landingPages) ? driveData.data.landingPages : (Array.isArray(driveData.landing_pages) ? driveData.landing_pages : []));

  let updatedLeadsCount = 0;
  if (rawLeads.length > 0 || rawLpLeads.length > 0) {
    const currentLeads = readStoredLeads();
    const leadMap = new Map<string, any>();
    
    currentLeads.forEach(l => {
      if (l.id) leadMap.set(String(l.id), l);
    });

    [...rawLeads, ...rawLpLeads].forEach(sl => {
      if (!sl) return;
      const id = String(sl.id || sl["ID Lead"] || sl.ID || `lead_sheet_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
      const existing = leadMap.get(id);
      const name = sl.name || sl.Nome || sl["Nome"] || existing?.name || "Lead Planilha";
      const email = sl.email || sl.Email || sl["Email"] || existing?.email || "";
      const phone = sl.whatsapp || sl.WhatsApp || sl["WhatsApp"] || existing?.whatsapp || "";
      const pageTitle = sl.landingPageTitle || sl["Landing Page (Título)"] || sl.pageTitle || sl.landingPage || existing?.pageTitle || "";
      const score = Number(sl.score || sl.Score || sl["Score"]) || (existing?.score ?? 85);
      const temp = sl.temperature || sl.Temperatura || sl["Temperatura"] || existing?.temperature || "Quente";

      const mergedLead = {
        ...(existing || {}),
        ...sl,
        id,
        name,
        email,
        whatsapp: phone,
        pageTitle: pageTitle || existing?.pageTitle,
        company: sl.company || sl.Empresa || sl["Empresa"] || existing?.company || (name ? `${name} (Planilha)` : "Empresa"),
        score,
        temperature: temp,
        stage: sl.stage || sl["Fase / Etapa"] || existing?.stage || "Leads",
        source: sl.source || sl.Origem || sl["Origem"] || existing?.source || "Google Sheets",
        createdAt: sl.createdAt || sl["Data Cadastro"] || sl["Data / Hora"] || existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      leadMap.set(id, mergedLead);
    });

    const mergedList = Array.from(leadMap.values());
    writeStoredLeads(mergedList);
    updatedLeadsCount = mergedList.length;
  }

  let updatedPagesCount = 0;
  if (rawLps.length > 0) {
    const currentPages = readStoredLandingPages();
    const pageMap = new Map<string, any>();
    currentPages.forEach(p => {
      if (p.id) pageMap.set(String(p.id), p);
      if (p.slug) pageMap.set(`slug:${p.slug}`, p);
    });

    rawLps.forEach(sp => {
      if (!sp) return;
      const id = String(sp.id || sp.ID || `lp_${Date.now()}`);
      const slug = String(sp.slug || sp.Slug || "");
      const existing = pageMap.get(id) || (slug ? pageMap.get(`slug:${slug}`) : null);

      const mergedPage = {
        ...(existing || {}),
        ...sp,
        id: existing?.id || id,
        name: sp.name || sp.title || sp["Título"] || existing?.name || "Landing Page",
        title: sp.title || sp.name || sp["Título"] || existing?.title || "Landing Page",
        slug: slug || existing?.slug || "",
        visits: Number(sp.visits || sp["Visitas"]) || existing?.visits || 0,
        leads: Number(sp.leads || sp["Leads"]) || existing?.leads || 0,
        conv: Number(sp.conv || sp["Conversão %"]) || existing?.conv || 0,
        status: sp.status || sp["Status"] || existing?.status || "Ativa",
        updated_at: new Date().toISOString(),
      };
      pageMap.set(mergedPage.id, mergedPage);
      if (mergedPage.slug) pageMap.set(`slug:${mergedPage.slug}`, mergedPage);
    });

    const uniquePages = Array.from(new Set(Array.from(pageMap.values())));
    writeStoredLandingPages(uniquePages);
    updatedPagesCount = uniquePages.length;
  }

  return { leadsCount: updatedLeadsCount, pagesCount: updatedPagesCount };
}

export async function forwardLeadToGoogleSheetsServer(lead: any): Promise<boolean> {
  const webappUrl = getDriveWebAppUrlServer();
  if (!webappUrl) return false;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const payload = {
      action: "SUBMIT_LP_LEAD",
      lead: {
        id: lead.id,
        landingPageId: lead.pageId || lead.landingPageId || "",
        landingPageTitle: lead.pageTitle || lead.landingPage || "Landing Page",
        name: lead.name || "",
        whatsapp: lead.whatsapp || "",
        email: lead.email || "",
        company: lead.company || "",
        source: lead.source || "Landing Page",
        answers: lead.quizAnswers || lead.metadata?.answers || {},
        utm: lead.utms || {},
        score: lead.score || 85,
        minScore: lead.minScore || "",
        minQualification: lead.minQualification || null,
        temperature: lead.temperature || "Quente",
      },
      isTest: Boolean(lead.isTest)
    };

    const res = await fetch(webappUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timeout);
    return res.ok;
  } catch (err) {
    console.warn("[Server Drive Sync] Aviso ao enviar lead para Google Sheets:", err);
    return false;
  }
}

export async function forwardSurveyResponseToGoogleSheetsServer(responsePayload: any): Promise<boolean> {
  const webappUrl = getDriveWebAppUrlServer();
  if (!webappUrl) return false;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const payload = {
      action: "SUBMIT_SURVEY_RESPONSE",
      response: responsePayload,
      isTest: Boolean(responsePayload.isTest)
    };

    const res = await fetch(webappUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timeout);
    return res.ok;
  } catch (err) {
    console.warn("[Server Drive Sync] Aviso ao enviar pesquisa para Google Sheets:", err);
    return false;
  }
}

// In-memory preview pages store for cross-device & cross-tab real-time sync
const previewPagesStore = new Map<string, any>();
let lastSavedPreviewPage: any = null;

// Unified resolver: busca no armazenamento persistente do disco, memória e presets (sem dependências externas)
export async function findLandingPageAnywhere(tokenOrId: string): Promise<any | null> {
  if (!tokenOrId) return null;
  const rawId = tokenOrId.trim();
  const normId = rawId.toLowerCase();
  const slugId = normalizeSlugServer(rawId);

  const matches = (p: any) => {
    if (!p) return false;
    if (p.id === rawId || p.id === normId || p.id === slugId) return true;
    if (p.slug === rawId || p.slug === normId || p.slug === slugId) return true;
    if (p.previewToken === rawId || p.previewToken === normId || p.previewToken === slugId) return true;
    if (p.config && (p.config.slug === rawId || p.config.slug === normId || p.config.slug === slugId || p.config.client_id === rawId)) return true;
    
    const pNameNorm = normalizeSlugServer(p.name || p.title);
    if (pNameNorm && slugId && (pNameNorm === slugId || pNameNorm.includes(slugId) || slugId.includes(pNameNorm))) return true;
    
    return false;
  };

  // 1. Memória ultra-rápida (preview store)
  let page = previewPagesStore.get(rawId) ||
    previewPagesStore.get(normId) ||
    previewPagesStore.get(slugId) ||
    Array.from(previewPagesStore.values()).find(matches);
  if (page) return page;

  // 2. Disco persistente do servidor (cache em memória)
  const diskPages = readStoredLandingPages();
  const fromDisk = diskPages.find(matches);
  if (fromDisk) {
    previewPagesStore.set(fromDisk.id, fromDisk);
    if (fromDisk.slug) previewPagesStore.set(fromDisk.slug, fromDisk);
    return fromDisk;
  }

  // 3. Presets e templates locais (instantâneo, zero latência)
  const fromPreset = PRESET_TEMPLATES.find(matches) || DEFAULT_INITIAL_LANDING_PAGES.find(matches);
  if (fromPreset) {
    previewPagesStore.set(fromPreset.id, fromPreset);
    if (fromPreset.slug) previewPagesStore.set(fromPreset.slug, fromPreset);
    return fromPreset;
  }

  return null;
}

function normalizePhoneServer(raw?: string): string {
  if (!raw) return "";
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    digits = digits.slice(2);
  }
  if (digits.length === 8 || digits.length === 9) {
    digits = "24" + digits;
  }
  if (digits.length < 10) return raw.trim();
  const ddd = digits.slice(0, 2);
  const body = digits.slice(2, 11);
  if (body.length === 9) {
    return `+55 (${ddd}) ${body.slice(0, 5)}-${body.slice(5, 9)}`;
  } else if (body.length === 8) {
    return `+55 (${ddd}) ${body.slice(0, 4)}-${body.slice(4, 8)}`;
  }
  return raw.trim();
}

async function saveLeadLocally(leadData: {
  pageId: string;
  pageTitle: string;
  name: string;
  whatsapp: string;
  email: string;
  quizAnswers: any;
  utms: any;
  source?: string;
  isTest?: boolean;
  score?: number;
  minScore?: string;
  minQualification?: any;
  temperature?: string;
}) {
  try {
    const { pageId, pageTitle, name, whatsapp, email, quizAnswers, utms, source, isTest, minScore, minQualification, temperature } = leadData;
    const cleanName = (name || "Lead Capturado").trim();
    const cleanWhatsapp = normalizePhoneServer(whatsapp);
    const cleanEmail = (email || "").trim().toLowerCase();
    const effectiveSource = source || utms?.utm_source || utms?.src || "direct";
    const parsedScore = leadData.score !== undefined && !isNaN(Number(leadData.score)) ? Number(leadData.score) : 85;
    const effectiveTemp = temperature || (minQualification?.classification === "QUENTE" ? "Quente" : minQualification?.classification === "DESCARTE" ? "Frio" : "Morno");

    const tags = [effectiveSource, utms?.utm_campaign || "inbound", "comet-lp"].filter(Boolean);
    if (isTest) {
      tags.push("leadtest", "modo-teste");
    }
    if (minScore) {
      tags.push(`min-${minScore.toLowerCase()}`);
    }

    const leadRecord = {
      name: cleanName,
      email: cleanEmail,
      whatsapp: cleanWhatsapp,
      company: `${cleanName} (LP: ${pageTitle || pageId || "Landing Page"})`,
      source: `LP: ${pageTitle || pageId} [${effectiveSource}]`,
      stage: effectiveTemp === "Quente" ? "Oportunidade" : "Leads",
      classification: isTest ? "Lead Teste" : (effectiveTemp === "Quente" ? "Lead Qualificado" : "Lead"),
      temperature: effectiveTemp,
      minScore,
      minQualification,
      tags,
      metadata: {
        capturedVia: "COMET Public Landing Page Engine (Express)",
        pageId,
        pageTitle,
        source: effectiveSource,
        utms: utms || {},
        answers: quizAnswers || {},
        isTest: Boolean(isTest),
        minScore,
        minQualification,
        score: parsedScore,
        extra: {},
        capturedAt: new Date().toISOString(),
      },
    };

    // Garante que o lead esteja salvo na base de leads persistente local do servidor
    const storedLeads = readStoredLeads();
    const existingIndex = storedLeads.findIndex(
      (l) => (cleanWhatsapp && l.whatsapp === cleanWhatsapp) || (cleanEmail && l.email && l.email.toLowerCase() === cleanEmail)
    );
    if (existingIndex !== -1) {
      const prev = storedLeads[existingIndex];
      storedLeads[existingIndex] = {
        ...prev,
        score: parsedScore,
        minScore: minScore || prev.minScore,
        minQualification: minQualification || prev.minQualification,
        temperature: effectiveTemp,
        stage: effectiveTemp === "Quente" ? "Oportunidade" : prev.stage,
        classification: isTest ? "Lead Teste" : (effectiveTemp === "Quente" ? "Lead Qualificado" : prev.classification),
        quizAnswers: { ...(prev.quizAnswers || {}), ...(quizAnswers || {}) },
        tags: Array.from(new Set([...(prev.tags || []), ...tags])),
        updatedAt: new Date().toISOString(),
        metadata: {
          ...(prev.metadata || {}),
          ...leadRecord.metadata,
          answers: { ...(prev.metadata?.answers || {}), ...(quizAnswers || {}) }
        }
      };
      writeStoredLeads(storedLeads);
    } else {
      const fullLeadItem = {
        id: `lead_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        pageId,
        pageTitle,
        name: cleanName,
        whatsapp: cleanWhatsapp,
        email: cleanEmail,
        company: leadRecord.company,
        quizAnswers: quizAnswers || {},
        utms: utms || {},
        source: effectiveSource,
        stage: effectiveTemp === "Quente" ? "Oportunidade" : "Leads",
        classification: isTest ? "Lead Teste" : (effectiveTemp === "Quente" ? "Lead Qualificado" : "Lead"),
        temperature: effectiveTemp,
        minScore,
        minQualification,
        type: "Inbound",
        tags,
        score: parsedScore,
        submittedAt: new Date().toISOString(),
        webhookStatus: "pending",
        isTest: Boolean(isTest),
        metadata: leadRecord.metadata,
      };
      storedLeads.unshift(fullLeadItem);
      writeStoredLeads(storedLeads);
      leadSubmissions.unshift(fullLeadItem);
    }

    // Atualiza contagem de leads na Landing Page persistente (disco e memória)
    try {
      const diskList = readStoredLandingPages();
      let foundLP: any = null;
      const updatedDisk = diskList.map((p) => {
        if (
          p.id === pageId ||
          p.slug === pageId ||
          p.name === pageTitle ||
          p.title === pageTitle ||
          (pageTitle && p.name && p.name.toLowerCase() === pageTitle.toLowerCase())
        ) {
          foundLP = p;
          const newLeads = Number(p.leads || p.leads_count || 0) + 1;
          const visits = Number(p.visits) || 1;
          const conv = Math.round((newLeads / visits) * 100);
          return {
            ...p,
            leads: newLeads,
            leads_count: newLeads,
            conv,
            updated_at: new Date().toISOString(),
          };
        }
        return p;
      });

      if (foundLP) {
        writeStoredLandingPages(updatedDisk);
        const updatedLP = updatedDisk.find((p) => p.id === foundLP.id);
        if (updatedLP) {
          previewPagesStore.set(updatedLP.id, updatedLP);
          if (updatedLP.slug) previewPagesStore.set(updatedLP.slug, updatedLP);
        }
      }
    } catch (e) {
      console.warn("Failed to update landing page lead count:", e);
    }

    // Encaminha lead para o Google Sheets em background
    const latestSaved = storedLeads.find((l) => (cleanEmail && l.email === cleanEmail) || (cleanWhatsapp && l.whatsapp === cleanWhatsapp));
    if (latestSaved) {
      setImmediate(() => {
        forwardLeadToGoogleSheetsServer(latestSaved);
      });
    }
  } catch (err) {
    console.error("Failed to run saveLeadLocally:", err);
  }
}

export const cometLpRouter = Router();




// In-memory submissions store for preview & testing
interface LeadSubmission {
  id: string;
  pageId: string;
  pageTitle: string;
  name: string;
  whatsapp: string;
  email: string;
  quizAnswers: Record<string, string>;
  utms: Record<string, string>;
  submittedAt: string;
  webhookStatus: "success" | "skipped" | "failed";
  webhookResponse?: string;
}

let leadSubmissions: LeadSubmission[] = readStoredLeads();

// Gemini Client initialization
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Health check
cometLpRouter.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Save / Sync preview page endpoint
cometLpRouter.post("/api/pages/preview", async (req, res) => {
  try {
    const page = req.body;
    if (!page || !page.id) {
      return res.status(400).json({ error: "Invalid page payload" });
    }

    // 1. Store in memory preview store
    previewPagesStore.set(page.id, page);
    if (page.previewToken) {
      previewPagesStore.set(page.previewToken, page);
    }
    if (page.slug) {
      previewPagesStore.set(page.slug, page);
    }
    lastSavedPreviewPage = page;

    // 2. Store on server disk
    try {
      const diskList = readStoredLandingPages();
      const updatedDisk = [page, ...diskList.filter((p) => p.id !== page.id && p.slug !== page.slug)];
      writeStoredLandingPages(updatedDisk);
    } catch (diskErr) {
      console.warn("Notice: server disk write failed in preview sync:", diskErr);
    }

    return res.json({ success: true, id: page.id, previewToken: page.previewToken });
  } catch (err: any) {
    console.error("Error saving preview page:", err);
    return res.status(500).json({ error: "Failed to save preview page" });
  }
});

// Retrieve preview page by Query string (id, pageId, token, slug)
cometLpRouter.get("/api/pages/preview", async (req, res) => {
  const tokenOrId = (req.query.id || req.query.pageId || req.query.token || req.query.slug) as string;
  if (!tokenOrId) {
    if (lastSavedPreviewPage) {
      return res.json({ success: true, page: lastSavedPreviewPage });
    }
    return res.status(400).json({ error: "Missing tokenOrId query parameter" });
  }

  const page = (await findLandingPageAnywhere(tokenOrId)) || lastSavedPreviewPage;

  if (page) {
    return res.json({ success: true, page });
  }

  return res.status(404).json({ error: "Preview page not found" });
});

// Retrieve preview page by ID or Token
cometLpRouter.get("/api/pages/preview/:tokenOrId", async (req, res) => {
  const { tokenOrId } = req.params;
  if (!tokenOrId) {
    return res.status(400).json({ error: "Missing tokenOrId" });
  }

  const page = (await findLandingPageAnywhere(tokenOrId)) || lastSavedPreviewPage;

  if (page) {
    return res.json({ success: true, page });
  }

  return res.status(404).json({ error: "Preview page not found" });
});

// Public dedicated LP resolution endpoint
cometLpRouter.get("/api/public/lp/:tokenOrId", async (req, res) => {
  const { tokenOrId } = req.params;
  if (!tokenOrId) {
    return res.status(400).json({ error: "Missing tokenOrId" });
  }

  // 1. Consulta direta ao Google Apps Script (fonte mestre em nuvem) quando configurado
  const webappUrl = getDriveWebAppUrlServer();
  if (webappUrl) {
    try {
      const urlObj = new URL(webappUrl);
      urlObj.searchParams.set("action", "GET_PUBLIC_LP");
      urlObj.searchParams.set("id", tokenOrId);
      urlObj.searchParams.set("slug", tokenOrId);
      urlObj.searchParams.set("t", Date.now().toString());
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const gasRes = await fetch(urlObj.toString(), { method: "GET", redirect: "follow", signal: controller.signal });
      clearTimeout(timeout);
      const text = await gasRes.text();
      if (text && !text.trim().startsWith("<")) {
        const parsed = JSON.parse(text);
        const cloudLp = parsed?.landingPage || parsed?.lp || parsed?.page;
        if (cloudLp && cloudLp.id) {
          previewPagesStore.set(cloudLp.id, cloudLp);
          if (cloudLp.slug) previewPagesStore.set(cloudLp.slug, cloudLp);
          return res.json({
            success: true,
            page: cloudLp,
            landingPage: cloudLp,
            survey: parsed?.survey || null,
            source: "google-cloud",
          });
        }
      }
    } catch {}
  }

  const page = await findLandingPageAnywhere(tokenOrId);
  if (page) {
    return res.json({ success: true, page, landingPage: page });
  }

  return res.status(404).json({ error: "Landing page not found" });
});

// Função auxiliar robusta para incrementar visitas em memória e disco de forma sincronizada
async function incrementLPVisits(id: string, body: any): Promise<{ success: boolean; visits: number }> {
  let updatedVisits = 1;
  const bodyLpId = body?.lpId || body?.id || body?.slug;

  const diskList = readStoredLandingPages();
  const matchIndex = diskList.findIndex(
    (p) => p.id === id || p.slug === id || (bodyLpId && (p.id === bodyLpId || p.slug === bodyLpId))
  );

  let target: any = null;
  if (matchIndex !== -1) {
    target = diskList[matchIndex];
    const currentVisits = Number(target.visits || target.viewsCount || target.views_count) || 0;
    updatedVisits = currentVisits + 1;
    const leads = Number(target.leads || target.leads_count) || 0;
    diskList[matchIndex] = {
      ...target,
      visits: updatedVisits,
      viewsCount: updatedVisits,
      views_count: updatedVisits,
      conv: Math.round((leads / updatedVisits) * 100),
      updated_at: new Date().toISOString(),
    };
    writeStoredLandingPages(diskList);
    target = diskList[matchIndex];
  } else {
    let page = previewPagesStore.get(id) || (bodyLpId ? previewPagesStore.get(bodyLpId) : null);
    if (!page) {
      page = await findLandingPageAnywhere(id);
    }
    if (page) {
      const currentVisits = Number(page.visits || page.viewsCount || page.views_count) || 0;
      updatedVisits = currentVisits + 1;
      page.visits = updatedVisits;
      page.viewsCount = updatedVisits;
      page.views_count = updatedVisits;
      const leads = Number(page.leads || page.leads_count) || 0;
      page.conv = Math.round((leads / updatedVisits) * 100);
      writeStoredLandingPages([page, ...diskList.filter((p) => p.id !== page.id)]);
      target = page;
    }
  }

  if (target) {
    previewPagesStore.set(target.id, target);
    if (target.slug) previewPagesStore.set(target.slug, target);
  }

  return { success: true, visits: updatedVisits };
}

// Função para incrementar conversões/leads de Landing Pages no servidor e disco
async function incrementLPConversion(id: string, body?: any): Promise<{ success: boolean; leads: number; conv: number }> {
  let updatedLeads = 1;
  let updatedConv = 100;
  const bodyLpId = body?.lpId || body?.id || body?.slug;

  const diskList = readStoredLandingPages();
  const matchIndex = diskList.findIndex(
    (p) => p.id === id || p.slug === id || (bodyLpId && (p.id === bodyLpId || p.slug === bodyLpId))
  );

  let target: any = null;
  if (matchIndex !== -1) {
    target = diskList[matchIndex];
    const currentLeads = Number(target.leads || target.leads_count) || 0;
    updatedLeads = currentLeads + 1;
    const currentVisits = Math.max(Number(target.visits || target.viewsCount || target.views_count) || 0, updatedLeads);
    updatedConv = Math.min(100, Math.round((updatedLeads / currentVisits) * 100));
    diskList[matchIndex] = {
      ...target,
      leads: updatedLeads,
      leads_count: updatedLeads,
      visits: currentVisits,
      viewsCount: currentVisits,
      views_count: currentVisits,
      conv: updatedConv,
      updated_at: new Date().toISOString(),
    };
    writeStoredLandingPages(diskList);
    target = diskList[matchIndex];
  } else {
    let page = previewPagesStore.get(id) || (bodyLpId ? previewPagesStore.get(bodyLpId) : null);
    if (!page) {
      page = await findLandingPageAnywhere(id);
    }
    if (page) {
      const currentLeads = Number(page.leads || page.leads_count) || 0;
      updatedLeads = currentLeads + 1;
      const currentVisits = Math.max(Number(page.visits || page.viewsCount || page.views_count) || 0, updatedLeads);
      updatedConv = Math.min(100, Math.round((updatedLeads / currentVisits) * 100));
      page.leads = updatedLeads;
      page.leads_count = updatedLeads;
      page.visits = currentVisits;
      page.viewsCount = currentVisits;
      page.conv = updatedConv;
      writeStoredLandingPages([page, ...diskList.filter((p) => p.id !== page.id)]);
      target = page;
    }
  }

  if (target) {
    previewPagesStore.set(target.id, target);
    if (target.slug) previewPagesStore.set(target.slug, target);
  }

  return { success: true, leads: updatedLeads, conv: updatedConv };
}

// Endpoint oficial para contabilizar visualizações/visitas de Landing Pages
cometLpRouter.post("/api/landing-pages/:id/visit", async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "ID ausente" });
    const result = await incrementLPVisits(id, req.body);
    return res.json(result);
  } catch (err: any) {
    console.error("Error incrementing visits:", err);
    return res.status(500).json({ error: err?.message || "Internal error" });
  }
});

// Alias para POST /api/landing-pages/visit com lpId no body
cometLpRouter.post("/api/landing-pages/visit", async (req, res) => {
  try {
    const targetId = req.body?.lpId || req.body?.id || req.body?.slug;
    if (!targetId) return res.status(400).json({ error: "lpId ou id ausente no body" });
    const result = await incrementLPVisits(targetId, req.body);
    return res.json(result);
  } catch (err: any) {
    console.error("Error incrementing visits alias:", err);
    return res.status(500).json({ error: err?.message || "Internal error" });
  }
});

// Endpoint oficial para contabilizar conversões/leads de Landing Pages
cometLpRouter.post("/api/landing-pages/:id/conversion", async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "ID ausente" });
    const result = await incrementLPConversion(id, req.body);
    return res.json(result);
  } catch (err: any) {
    console.error("Error incrementing conversion:", err);
    return res.status(500).json({ error: err?.message || "Internal error" });
  }
});

// Alias para POST /api/landing-pages/conversion com lpId no body
cometLpRouter.post("/api/landing-pages/conversion", async (req, res) => {
  try {
    const targetId = req.body?.lpId || req.body?.id || req.body?.slug;
    if (!targetId) return res.status(400).json({ error: "lpId ausente no body" });
    const result = await incrementLPConversion(targetId, req.body);
    return res.json(result);
  } catch (err: any) {
    console.error("Error incrementing conversion alias:", err);
    return res.status(500).json({ error: err?.message || "Internal error" });
  }
});

// Delete preview page from memory
cometLpRouter.delete("/api/pages/preview/:tokenOrId", (req, res) => {
  const { tokenOrId } = req.params;
  if (tokenOrId) {
    previewPagesStore.delete(tokenOrId);
    if (lastSavedPreviewPage?.id === tokenOrId || lastSavedPreviewPage?.previewToken === tokenOrId) {
      lastSavedPreviewPage = null;
    }
  }
  return res.json({ success: true });
});

// Get leads submissions (disco local persistente + cache em memória instantâneo)
cometLpRouter.get("/api/leads", async (req, res) => {
  try {
    const pageId = req.query.pageId as string;
    let list = readStoredLeads();

    // Se estiver vazio no arquivo, mas tiver em memória
    if (list.length === 0 && leadSubmissions.length > 0) {
      list = [...leadSubmissions];
      writeStoredLeads(list);
    }

    // Responde instantaneamente com a lista local de leads
    if (pageId) {
      return res.json({ leads: list.filter((l) => l.pageId === pageId) });
    } else {
      return res.json({ leads: list });
    }
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Error fetching leads" });
  }
});

// Update lead submission (e.g. stage change, notes, owner, survey qualification)
cometLpRouter.patch("/api/leads/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body || {};
    const leadsList = readStoredLeads();
    const index = leadsList.findIndex((l) => l.id === id);
    if (index !== -1) {
      leadsList[index] = {
        ...leadsList[index],
        ...updates,
        stage: updates.stage !== undefined ? updates.stage : leadsList[index].stage,
      };
      writeStoredLeads(leadsList);
      leadSubmissions = leadsList;
      return res.json({ success: true, lead: leadsList[index] });
    }
    return res.json({ success: true, lead: null });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

cometLpRouter.put("/api/leads/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body || {};
    const leadsList = readStoredLeads();
    const index = leadsList.findIndex((l) => l.id === id);
    if (index !== -1) {
      leadsList[index] = { ...leadsList[index], ...updates };
      writeStoredLeads(leadsList);
      leadSubmissions = leadsList;
      return res.json({ success: true, lead: leadsList[index] });
    }
    return res.json({ success: true, lead: null });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// Delete lead submission
cometLpRouter.delete("/api/leads/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const leadsList = readStoredLeads();
    const index = leadsList.findIndex((l) => l.id === id);
    if (index !== -1) {
      leadsList.splice(index, 1);
      writeStoredLeads(leadsList);
      leadSubmissions = leadsList;
    }
    return res.json({ success: true });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// Submit Lead endpoint with Webhook forwarding
cometLpRouter.post("/api/webhook/submit-lead", async (req, res) => {
  try {
    const { pageId, pageTitle, name, whatsapp, email, quizAnswers, utms, webhookUrl } = req.body;

    const lead: LeadSubmission = {
      id: `lead_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      pageId: pageId || "unknown",
      pageTitle: pageTitle || "Landing Page",
      name: name || "",
      whatsapp: whatsapp || "",
      email: email || "",
      quizAnswers: quizAnswers || {},
      utms: utms || {},
      submittedAt: new Date().toISOString(),
      webhookStatus: "skipped",
    };

    const targetWebhook = webhookUrl || process.env.VITE_SYSTEM_WEBHOOK_URL;

    if (targetWebhook && targetWebhook.trim().length > 0) {
      try {
        const payload = {
          event: "lead_converted",
          timestamp: lead.submittedAt,
          lead: {
            name: lead.name,
            whatsapp: lead.whatsapp,
            email: lead.email,
            quiz_diagnosis: lead.quizAnswers,
          },
          tracking: {
            page_id: lead.pageId,
            page_title: lead.pageTitle,
            ...lead.utms,
          },
        };

        const response = await fetch(targetWebhook, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "People-CRO-Builder/1.0",
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          lead.webhookStatus = "success";
          lead.webhookResponse = `Status ${response.status} OK`;
        } else {
          lead.webhookStatus = "failed";
          lead.webhookResponse = `HTTP Error ${response.status}: ${response.statusText}`;
        }
      } catch (err: any) {
        console.error("Webhook forwarding error:", err);
        lead.webhookStatus = "failed";
        lead.webhookResponse = err?.message || "Webhook delivery failed";
      }
    }

    // Persist locally
    await saveLeadLocally({
      pageId: lead.pageId,
      pageTitle: lead.pageTitle,
      name: lead.name,
      whatsapp: lead.whatsapp,
      email: lead.email,
      quizAnswers: lead.quizAnswers,
      utms: lead.utms,
    });

    leadSubmissions.unshift(lead);
    if (leadSubmissions.length > 200) {
      leadSubmissions.pop();
    }
    writeStoredLeads(leadSubmissions);

    return res.json({
      success: true,
      leadId: lead.id,
      webhookStatus: lead.webhookStatus,
      message: "Lead registrado com sucesso!",
    });
  } catch (error: any) {
    console.error("Error saving lead:", error);
    return res.status(500).json({ error: error.message || "Failed to process lead" });
  }
});

// Alias POST endpoint for /api/submit-lead
cometLpRouter.post("/api/submit-lead", async (req, res) => {
  try {
    const { pageId, pageTitle, name, whatsapp, email, quizAnswers, utms, webhookUrl, source, company, score, minScore, minQualification, temperature } = req.body || {};

    const pageIdStr = pageId || "unknown";
    const diskPages = readStoredLandingPages();
    const lp = previewPagesStore.get(pageIdStr) || diskPages.find((p) => p.id === pageIdStr || p.slug === pageIdStr);
    const isTestMode = req.body.isTest === true || (lp && lp.status === "Teste") || false;

    const leadId = `lead_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();
    const cleanPhone = whatsapp ? String(whatsapp).trim() : "";
    const cleanEmail = email ? String(email).trim().toLowerCase() : "";
    const cleanName = name ? String(name).trim() : "Lead Capturado";
    const effectivePageTitle = pageTitle || (lp && (lp.name || lp.title)) || "Landing Page";
    const effectiveSource = source || utms?.utm_source || "Landing Page";

    const parsedScore = score !== undefined && !isNaN(Number(score)) ? Number(score) : 85;
    const effectiveTemp = temperature || (minQualification?.classification === "QUENTE" ? "Quente" : minQualification?.classification === "DESCARTE" ? "Frio" : "Morno");

    const lead: any = {
      id: leadId,
      pageId: pageIdStr,
      pageTitle: effectivePageTitle,
      landingPage: effectivePageTitle,
      landingPageId: pageIdStr,
      name: cleanName,
      whatsapp: cleanPhone,
      email: cleanEmail,
      company: company || `${cleanName} (LP: ${effectivePageTitle})`,
      quizAnswers: quizAnswers || {},
      utms: utms || {},
      source: effectiveSource,
      stage: effectiveTemp === "Quente" ? "Oportunidade" : "Leads",
      classification: isTestMode ? "Lead Teste" : (effectiveTemp === "Quente" ? "Lead Qualificado" : "Lead"),
      temperature: effectiveTemp,
      minScore,
      minQualification,
      type: "Inbound",
      tags: [
        effectiveSource,
        utms?.utm_campaign ? `campanha:${utms.utm_campaign}` : null,
        "comet-lp",
        minScore ? `min-${minScore.toLowerCase()}` : null,
        isTestMode ? "leadtest" : null,
        isTestMode ? "modo-teste" : null,
      ].filter(Boolean),
      score: parsedScore,
      submittedAt: nowIso,
      createdAt: nowIso,
      webhookStatus: "pending",
      isTest: isTestMode,
      metadata: {
        ...req.body,
        pageId: pageIdStr,
        pageTitle: effectivePageTitle,
        score: parsedScore,
        minScore,
        minQualification,
        temperature: effectiveTemp,
        submittedAt: nowIso,
        isTest: isTestMode,
      },
    };

    // 1. Grava instantaneamente no arquivo de disco local e memória
    const currentLeads = readStoredLeads();
    const existingIndex = currentLeads.findIndex(
      (l) => (cleanPhone && l.whatsapp === cleanPhone) || (cleanEmail && l.email && l.email.toLowerCase() === cleanEmail)
    );
    if (existingIndex !== -1) {
      currentLeads[existingIndex] = {
        ...currentLeads[existingIndex],
        ...lead,
        id: currentLeads[existingIndex].id,
        createdAt: currentLeads[existingIndex].createdAt || nowIso,
        updatedAt: nowIso,
      };
    } else {
      currentLeads.unshift(lead);
      if (currentLeads.length > 500) {
        currentLeads.pop();
      }
    }
    writeStoredLeads(currentLeads);

    const submissionIndex = leadSubmissions.findIndex(
      (l) => (cleanPhone && l.whatsapp === cleanPhone) || (cleanEmail && l.email && l.email.toLowerCase() === cleanEmail)
    );
    if (submissionIndex !== -1) {
      leadSubmissions[submissionIndex] = {
        ...leadSubmissions[submissionIndex],
        ...lead,
        id: leadSubmissions[submissionIndex].id,
      };
    } else {
      leadSubmissions.unshift(lead);
      if (leadSubmissions.length > 500) {
        leadSubmissions.pop();
      }
    }

    // 2. Incrementa métricas da Landing Page no disco instantaneamente
    try {
      const matchIndex = diskPages.findIndex(
        (p) =>
          p.id === pageIdStr ||
          p.slug === pageIdStr ||
          (lp && (p.id === lp.id || p.slug === lp.slug))
      );
      if (matchIndex !== -1) {
        const target = diskPages[matchIndex];
        const newLeads = (Number(target.leads || target.leads_count) || 0) + 1;
        const currentVisits = Math.max(
          Number(target.visits || target.viewsCount || target.views_count) || 0,
          newLeads
        );
        diskPages[matchIndex] = {
          ...target,
          leads: newLeads,
          leads_count: newLeads,
          conv: Math.round((newLeads / currentVisits) * 100),
          updated_at: nowIso,
        };
        writeStoredLandingPages(diskPages);
        if (lp) {
          lp.leads = newLeads;
          lp.leads_count = newLeads;
          lp.conv = Math.round((newLeads / currentVisits) * 100);
          previewPagesStore.set(lp.id, lp);
          if (lp.slug) previewPagesStore.set(lp.slug, lp);
        }
      } else if (pageIdStr && pageIdStr !== "unknown" && pageIdStr !== "survey_page") {
        const newEntry = {
          id: pageIdStr,
          title: effectivePageTitle,
          name: effectivePageTitle,
          visits: 1,
          leads: 1,
          conv: 100,
          status: "Ativa",
          type: "COMET CRO",
          created_at: nowIso,
          updated_at: nowIso,
        };
        diskPages.push(newEntry);
        writeStoredLandingPages(diskPages);
        previewPagesStore.set(pageIdStr, newEntry);
      }
    } catch (lpErr) {
      console.warn("Express disk lead increment notice:", lpErr);
    }

    // 3. Responde IMEDIATAMENTE ao navegador
    res.json({
      success: true,
      leadId: lead.id,
      webhookStatus: lead.webhookStatus,
      lead,
      message: "Lead capturado e processado com sucesso!",
    });

    // 4. Webhook externa opcional em background se configurado
    const targetWebhook = webhookUrl || process.env.VITE_SYSTEM_WEBHOOK_URL;
    if (targetWebhook && targetWebhook.trim().length > 0) {
      setImmediate(async () => {
        try {
          const controller = new AbortController();
          const tId = setTimeout(() => controller.abort(), 2000);
          const payload = {
            event: "lead_converted",
            timestamp: lead.submittedAt,
            lead: {
              name: lead.name,
              whatsapp: lead.whatsapp,
              email: lead.email,
              quiz_diagnosis: lead.quizAnswers,
            },
            tracking: {
              page_id: lead.pageId,
              page_title: lead.pageTitle,
              source: effectiveSource,
              ...(utms || {}),
            },
          };
          await fetch(targetWebhook, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "User-Agent": "People-CRO-Builder/1.0",
            },
            body: JSON.stringify(payload),
            signal: controller.signal,
          }).finally(() => clearTimeout(tId));
        } catch (wErr) {
          console.warn("Background webhook delivery notice:", wErr);
        }
      });
    }
  } catch (error: any) {
    console.error("Error in /api/submit-lead:", error);
    return res.status(500).json({ error: error.message || "Failed to process lead" });
  }
});

// Helper to wait
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout de ${ms}ms em ${label}`)), ms);
    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// Candidate models in fallback order: gemini-3.8-flash is the primary standard model, followed by 3.7 and 3.1 flash lite
const CANDIDATE_MODELS = ["gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.1-flash-lite"];

// Multi-model call with timeout per model to guarantee fast response
async function callGeminiWithWaterfall(
  ai: GoogleGenAI,
  generateParams: {
    contents: string;
    systemInstruction?: string;
    responseSchema?: any;
  }
) {
  let lastError: any = null;

  for (const modelName of CANDIDATE_MODELS) {
    try {
      console.log(`[Gemini API] Solicitando modelo "${modelName}" com timeout...`);

      const callPromise = ai.models.generateContent({
        model: modelName,
        contents: generateParams.contents,
        config: {
          systemInstruction: generateParams.systemInstruction,
          responseMimeType: "application/json",
          responseSchema: generateParams.responseSchema,
        },
      });

      const response = await withTimeout(callPromise, 8000, modelName);

      if (response && response.text) {
        const trimmed = response.text.trim();
        try {
          const parsed = JSON.parse(trimmed);
          console.log(`[Gemini API] Sucesso com modelo "${modelName}"`);
          return { data: parsed, modelUsed: modelName };
        } catch (jsonErr) {
          const extracted = trimmed.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
          const parsed = JSON.parse(extracted);
          console.log(`[Gemini API] Sucesso no parse markdown com modelo "${modelName}"`);
          return { data: parsed, modelUsed: modelName };
        }
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`[Gemini API] Modelo ${modelName} indisponível ou expirou:`, err?.message || err);
      // Avança imediatamente para o próximo modelo sem travar a requisição
    }
  }

  throw lastError || new Error("Todos os modelos Gemini estão temporariamente indisponíveis.");
}

// AI Landing Page Generation Endpoint
cometLpRouter.post("/api/ai/generate-landing-page", async (req, res) => {
  try {
    const { prompt, niche, cityOrRegion, targetAudience, offerDetails, accentColor, theme, heroModel } = req.body;

    const ai = getGeminiClient();

    const systemInstruction = `Você é o LANAI, um Diretor de Arte Digital e Engenheiro de CRO (Conversion Rate Optimization) de Nível Mundial.
Seu objetivo é gerar o blueprint JSON completo de uma Landing Page ultra personalizada e estrategicamente calibrada para o nicho, público e produto fornecido.

DIRETRIZ DE NÃO REPETIÇÃO & ESCOLHA AUTÔNOMA DO MELHOR MODELO (CRÍTICO):
Você NUNCA deve gerar todas as landing pages iguais. Você deve agir como um Diretor de Arte e definir autonomamente a melhor estética visual:

1. DEFINIÇÃO DO TEMA ('theme'):
- 'light' (Clean White Pro / Sofisticação Clara): Escolha 'light' para Clínicas Médicas, Estética, Dermatologia, Odontologia, Longevidade, Psicologia, Arquitetura, Imobiliárias de Luxo ou Negócios onde o fundo claro transmite assepsia, alta confiança e requinte.
- 'dark' (Cyber Dark CRO): Escolha 'dark' para Tecnologia, Automação, Bots de WhatsApp, Plataformas SaaS, Tráfego Pago, Lançamentos e Produtos Digitais.
- 'midnight' (Preto Profundo / Luxo / Executivo): Escolha 'midnight' para Mentorias High-Ticket (R$ 5k a R$ 50k), Masterminds, Consultorias B2B Corporativas e Advocacia de Alto Padrão.
- 'hybrid' (Contraste Alternado): Escolha 'hybrid' para Treinamentos, Imersões e Cursos com blocos temáticos claros e escuros.

2. DEFINIÇÃO DO MODELO DE HERO ('hero.model'):
- 'split_image': Perfeito para produtos com fotos, clínicas, serviços locais ou mockups laterais.
- 'split_video': Ideal para lançamentos com VSL, infoprodutos, cursos e mentorias em vídeo.
- 'centered_showcase': Excelente para SaaS, IA, plataformas digitais e dashboards modernos.
- 'split_lead_form': Indicado para captura direta de leads em nichos com decisão rápida (ex: imobiliário, orçamento expresso, vagas de eventos).
- 'b2b_metrics': Excelente para Consultorias B2B, Finanças, Logística e Gestão onde números e autoridade são vitais.
- 'editorial_ebook': Ideal para materiais ricos, e-books, metodologias literárias e formações com autor.
- 'minimal_glow': Para marcas minimalistas, startups modernas e produtos de tecnologia refinada.
- 'urgency_counter': Perfeito para imersões com poucas vagas, contagem regressiva ativa e compras por impulso.
- 'white_pro': Específico para alto padrão médico e estético com cards de prova social flutuantes.
- 'fullscreen_slideshow': Para eventos, turismo e experiências visuais imersivas.

3. DEFINIÇÃO DA PALETA CROMÁTICA ('accentColor'):
- 'rose' / 'teal': Perfeito para Estética, Beleza, Cosméticos e Dermatologia.
- 'emerald': Saúde, Medicina, Finanças, Dinheiro, Investimentos e Longevidade.
- 'cyan' / 'purple': SaaS, Inteligência Artificial, Bots, Tecnologia e Inovação.
- 'amber' / 'orange': Mentorias, Liderança, Alta Conversão, Energia Solar, Alimentos e Negócios.
- 'blue' / 'indigo': B2B, Jurídico, Advocacia, Institucional e Consultoria Empresarial.
- 'gray': Minimalismo tipográfico editorial.

4. SEQUÊNCIA DAS SEÇÕES ('sectionOrder'):
- Varie a ordem conforme a consciência do lead (ex: coloque 'quiz' mais acima para qualificação imediata, ou 'bentoGrid' antes quando o método precisa ser explicado primeiro).

Regras de Copy e Estrutura:
1. Adapte fortemente a copy para a cidade/região ('${cityOrRegion || "Brasil"}') e nicho ('${niche || "Geral"}').
2. Crie badges de urgência e escassez regional autênticos.
3. Headline ultra impactante, sem clichês genéricos. Foque na dor profunda e no benefício de alto valor.
4. Subtítulo que destrói as principais objeções.
5. Crie um Quiz de Qualificação de 3 perguntas interativas que qualifique o lead e gere curiosidade.
6. Crie uma estrutura Bento Grid de 3 a 5 blocos apresentando o método / benefícios com ícones do Lucide (como Zap, ShieldCheck, Target, TrendingUp, Sparkles, Award, Users, CheckCircle, BarChart3, Rocket).
7. Crie 3 depoimentos ultra realistas com nomes brasileiros, cidades, métricas de resultado e avatar de fotos reais de alta qualidade.
8. Configure formulário com garantia (7, 15 ou 30 dias) e botão CTA gigante de ação imediata.
9. Retorne APENAS o JSON no formato solicitado.`;

    const userPromptText = `Gere uma Landing Page de alta conversão completa com DIREÇÃO DE ARTE personalizada para o seguinte briefing:
- Briefing / Ideia: ${prompt || "Programa de aceleração de resultados e mentoria premium"}
- Nicho de Mercado: ${niche || "Empreendedorismo / Serviços de Alto Valor"}
- Cidade / Região: ${cityOrRegion || "Nacional / São Paulo"}
- Público-Alvo: ${targetAudience || "Empresários, profissionais liberais e tomadores de decisão"}
- Oferta / Diferenciais: ${offerDetails || "Acesso imediato com garantia incondicional e suporte individualizado"}
- Preferência de Tema (ou auto): ${theme || "auto (LANAI decide se será claro, escuro, midnight ou hybrid)"}
- Preferência de Modelo de Hero (ou auto): ${heroModel || "auto (LANAI decide o melhor dos 10 modelos)"}
- Preferência de Cor (ou auto): ${accentColor || "auto (LANAI decide a melhor cor psicológica)"}`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        niche: { type: Type.STRING },
        cityOrRegion: { type: Type.STRING },
        targetAudience: { type: Type.STRING },
        theme: {
          type: Type.STRING,
          enum: ["light", "dark", "midnight", "hybrid"],
        },
        accentColor: {
          type: Type.STRING,
          enum: ["orange", "amber", "purple", "emerald", "cyan", "rose", "blue", "indigo", "teal", "gray"],
        },
        sectionOrder: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        hero: {
          type: Type.OBJECT,
          properties: {
            model: {
              type: Type.STRING,
              enum: [
                "split_image",
                "split_video",
                "centered_showcase",
                "split_lead_form",
                "b2b_metrics",
                "editorial_ebook",
                "minimal_glow",
                "urgency_counter",
                "white_pro",
                "fullscreen_slideshow",
              ],
            },
            badgeText: { type: Type.STRING },
            headline: { type: Type.STRING },
            subheadline: { type: Type.STRING },
            mediaType: { type: Type.STRING, enum: ["video", "image"] },
            videoUrl: { type: Type.STRING },
            videoThumbnail: { type: Type.STRING },
            imageUrl: { type: Type.STRING },
            ctaText: { type: Type.STRING },
            ctaSubtext: { type: Type.STRING },
            countdownMinutes: { type: Type.NUMBER },
            ratingText: { type: Type.STRING },
            ratingScore: { type: Type.STRING },
          },
          required: ["badgeText", "headline", "subheadline", "ctaText", "ctaSubtext"],
        },
        socialProof: {
          type: Type.OBJECT,
          properties: {
            marqueeTitle: { type: Type.STRING },
            metrics: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  value: { type: Type.STRING },
                  label: { type: Type.STRING },
                  sublabel: { type: Type.STRING },
                  iconName: { type: Type.STRING },
                },
                required: ["value", "label"],
              },
            },
            marqueeLogos: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ["metrics", "marqueeLogos"],
        },
        quiz: {
          type: Type.OBJECT,
          properties: {
            badge: { type: Type.STRING },
            title: { type: Type.STRING },
            subtitle: { type: Type.STRING },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  question: { type: Type.STRING },
                  description: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        label: { type: Type.STRING },
                        iconName: { type: Type.STRING },
                        badge: { type: Type.STRING },
                      },
                      required: ["id", "label"],
                    },
                  },
                },
                required: ["id", "question", "options"],
              },
            },
            resultTitle: { type: Type.STRING },
            resultDescription: { type: Type.STRING },
          },
          required: ["badge", "title", "subtitle", "questions"],
        },
        bentoGrid: {
          type: Type.OBJECT,
          properties: {
            badge: { type: Type.STRING },
            title: { type: Type.STRING },
            subtitle: { type: Type.STRING },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  size: {
                    type: Type.STRING,
                    enum: ["large", "tall", "wide", "standard"],
                  },
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  tag: { type: Type.STRING },
                  iconName: { type: Type.STRING },
                  metric: { type: Type.STRING },
                  imageUrl: { type: Type.STRING },
                },
                required: ["id", "title", "description", "iconName"],
              },
            },
          },
          required: ["badge", "title", "subtitle", "items"],
        },
        testimonials: {
          type: Type.OBJECT,
          properties: {
            badge: { type: Type.STRING },
            title: { type: Type.STRING },
            subtitle: { type: Type.STRING },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  role: { type: Type.STRING },
                  companyOrCity: { type: Type.STRING },
                  avatarUrl: { type: Type.STRING },
                  rating: { type: Type.NUMBER },
                  content: { type: Type.STRING },
                  resultHighlight: { type: Type.STRING },
                  verified: { type: Type.BOOLEAN },
                },
                required: ["name", "role", "content", "resultHighlight"],
              },
            },
          },
          required: ["badge", "title", "subtitle", "items"],
        },
        formSection: {
          type: Type.OBJECT,
          properties: {
            badge: { type: Type.STRING },
            title: { type: Type.STRING },
            subtitle: { type: Type.STRING },
            ctaButtonText: { type: Type.STRING },
            guaranteeDays: { type: Type.NUMBER },
            guaranteeText: { type: Type.STRING },
            securityBadges: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            offerPrice: { type: Type.STRING },
            originalPrice: { type: Type.STRING },
            installmentsText: { type: Type.STRING },
          },
          required: ["badge", "title", "subtitle", "ctaButtonText", "guaranteeText"],
        },
        faq: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              answer: { type: Type.STRING },
            },
            required: ["question", "answer"],
          },
        },
      },
      required: [
        "title",
        "niche",
        "cityOrRegion",
        "hero",
        "socialProof",
        "quiz",
        "bentoGrid",
        "testimonials",
        "formSection",
      ],
    };

    if (ai) {
      try {
        const result = await withTimeout(
          callGeminiWithWaterfall(ai, {
            contents: userPromptText,
            systemInstruction,
            responseSchema,
          }),
          12000,
          "Waterfall Total"
        );

        const enhancedData = applyThematicImagesToPage(result.data);

        return res.json({
          success: true,
          data: enhancedData,
          source: "gemini",
          modelUsed: result.modelUsed,
        });
      } catch (geminiErr: any) {
        console.warn(
          "Gemini waterfall failed or was unavailable, activating adaptive CRO engine:",
          geminiErr?.message
        );
        // Fallback to high-converting adaptive engine if all models unavailable
        const adaptivePage = generateAdaptiveLandingPage({
          prompt,
          niche,
          cityOrRegion,
          targetAudience,
          offerDetails,
          accentColor,
          theme,
          heroModel,
        });

        return res.json({
          success: true,
          data: adaptivePage,
          source: "adaptive_cro_engine",
          notice: "Página gerada pelo Motor Adaptativo de CRO devido a alta demanda temporária na nuvem.",
        });
      }
    } else {
      // Direct adaptive engine when no key
      const adaptivePage = generateAdaptiveLandingPage({
        prompt,
        niche,
        cityOrRegion,
        targetAudience,
        offerDetails,
        accentColor,
        theme,
        heroModel,
      });

      return res.json({
        success: true,
        data: adaptivePage,
        source: "adaptive_cro_engine",
      });
    }
  } catch (error: any) {
    console.error("Critical Landing page generation error:", error);
    // Even on error, provide graceful fallback
    const fallback = generateAdaptiveLandingPage(req.body || {});
    return res.json({
      success: true,
      data: fallback,
      source: "emergency_fallback",
    });
  }
});

// Endpoint do Robô LANAI para refinamento/edição da LP por Prompt
cometLpRouter.post("/api/comet-lp/refine-page", async (req, res) => {
  try {
    const { page, prompt } = req.body;
    if (!page || !prompt) {
      return res.status(400).json({ error: "Missing page or prompt" });
    }

    const ai = getGeminiClient();

    const systemInstruction = `Você é o LANAI, o Agente de IA e Diretor de Arte de CRO de Nível Mundial.
Seu objetivo é alterar a Landing Page fornecida no JSON com base na instrução exata fornecida pelo usuário.

Instrução do Usuário: "${prompt}"

Instruções de edição:
1. Modifique os campos do JSON que correspondem à solicitação (ex: se pediu para alterar a headline/título, mude 'title', 'headline', 'hero.headline'; se pediu para alterar o subtítulo, mude 'subheadline', 'hero.subheadline'; se pediu para alterar a cor, mude 'accentColor' ou 'theme'; se pediu para mudar o botão, mude 'hero.ctaText' e 'formSection.ctaButtonText').
2. Se pediu para adicionar ou reescrever depoimentos, FAQs ou perguntas no quiz, atualize esses objetos.
3. Se pediu para alterar imagens ou vídeos, atualize 'hero.imageUrl', 'hero.mediaType' e as imagens das seções.
4. Mantenha os outros campos intactos e garanta copy altamente persuasiva.
5. Retorne o JSON atualizado completo da Landing Page.`;

    if (ai) {
      try {
        const result = await callGeminiWithWaterfall(ai, {
          contents: `Landing Page Atual JSON: ${JSON.stringify(page)}\n\nInstrução de Alteração do Usuário: ${prompt}`,
          systemInstruction,
        });

        if (result && result.data) {
          const updatedPage = applyThematicImagesToPage({ ...page, ...result.data });
          return res.json({
            success: true,
            page: updatedPage,
            message: "Landing Page atualizada com sucesso pelo Robô LANAI!"
          });
        }
      } catch (err: any) {
        console.warn("LANAI refine page waterfall notice:", err?.message);
      }
    }

    // Heuristic Fallback
    const updated = JSON.parse(JSON.stringify(page || {}));
    const lowerPrompt = prompt.toLowerCase();
    updated.hero = updated.hero || {};
    updated.sections = Array.isArray(updated.sections) ? updated.sections : [];

    // Helper to extract text inside quotes or after keywords
    const extractText = (keywords: string[]) => {
      const q = prompt.match(/["'“]([^"'”]+)["'”]/);
      if (q && q[1]) return q[1].trim();
      for (const kw of keywords) {
        const idx = lowerPrompt.indexOf(kw);
        if (idx !== -1) {
          let text = prompt.substring(idx + kw.length).trim().replace(/^[:=para\s]+/i, "").trim();
          if (text.includes(".")) text = text.split(".")[0].trim();
          if (text) return text;
        }
      }
      return "";
    };

    // Headline / Título
    if (lowerPrompt.includes("headline") || lowerPrompt.includes("título") || lowerPrompt.includes("titulo")) {
      const newHeadline = extractText(["mude a headline para", "mude o título para", "título:", "headline:", "headline", "título", "titulo"]);
      if (newHeadline) {
        updated.name = newHeadline;
        updated.title = newHeadline;
        updated.headline = newHeadline;
        updated.hero.headline = newHeadline;
        updated.sections = updated.sections.map((s: any) => s.type === "hero" ? { ...s, title: newHeadline, headline: newHeadline } : s);
      }
    }

    // Subheadline / Subtítulo
    if (lowerPrompt.includes("subtítulo") || lowerPrompt.includes("subtitulo") || lowerPrompt.includes("subheadline")) {
      const newSub = extractText(["mude o subtítulo para", "subtítulo:", "subheadline:", "subtítulo", "subtitulo", "subheadline"]);
      if (newSub) {
        updated.subheadline = newSub;
        updated.hero.subheadline = newSub;
        updated.sections = updated.sections.map((s: any) => s.type === "hero" ? { ...s, subtitle: newSub, subheadline: newSub } : s);
      }
    }

    // Botão / CTA
    if (lowerPrompt.includes("botão") || lowerPrompt.includes("botao") || lowerPrompt.includes("cta")) {
      const newCta = extractText(["mude o botão para", "botão:", "cta:", "botão", "botao", "cta"]);
      if (newCta) {
        updated.ctaText = newCta;
        updated.hero.ctaText = newCta;
        if (updated.formSection) updated.formSection.ctaButtonText = newCta;
        updated.sections = updated.sections.map((s: any) => s.type === "hero" ? { ...s, ctaPrimary: newCta } : s);
      }
    }

    // Theme & Colors
    if (lowerPrompt.includes("dark") || lowerPrompt.includes("escuro")) updated.theme = "dark";
    if (lowerPrompt.includes("light") || lowerPrompt.includes("claro")) updated.theme = "light";
    if (lowerPrompt.includes("midnight") || lowerPrompt.includes("preto")) updated.theme = "midnight";
    if (lowerPrompt.includes("hybrid") || lowerPrompt.includes("híbrido")) updated.theme = "hybrid";

    if (lowerPrompt.includes("verde") || lowerPrompt.includes("emerald") || lowerPrompt.includes("esmeralda")) updated.accentColor = "emerald";
    if (lowerPrompt.includes("azul") || lowerPrompt.includes("blue")) updated.accentColor = "blue";
    if (lowerPrompt.includes("roxo") || lowerPrompt.includes("purple") || lowerPrompt.includes("púrpura")) updated.accentColor = "purple";
    if (lowerPrompt.includes("laranja") || lowerPrompt.includes("orange")) updated.accentColor = "orange";
    if (lowerPrompt.includes("ciano") || lowerPrompt.includes("cyan")) updated.accentColor = "cyan";

    if (lowerPrompt.includes("vídeo") || lowerPrompt.includes("video")) updated.hero.model = "split_video";
    if (lowerPrompt.includes("formulário") || lowerPrompt.includes("captura")) updated.hero.model = "split_lead_form";
    if (lowerPrompt.includes("contador") || lowerPrompt.includes("urgência") || lowerPrompt.includes("escassez")) updated.hero.model = "urgency_counter";

    return res.json({
      success: true,
      page: updated,
      message: "Alterações aplicadas com sucesso pelo Robô LANAI!"
    });
  } catch (err: any) {
    console.error("LANAI refine page error:", err);
    return res.status(500).json({ error: "Erro ao processar solicitação do Robô LANAI" });
  }
});

// AI Copy Refinement / Assistant Endpoint
cometLpRouter.post("/api/ai/refine-copy", async (req, res) => {
  try {
    const { action, currentText, context, tone, cityOrRegion, customInstruction } = req.body;

    const ai = getGeminiClient();

    const prompt = `Você é um copywriter de elite de Conversion Rate Optimization (CRO).
Ação solicitada: ${action || "Melhorar copy"}
Texto atual: "${currentText || ""}"
Contexto: ${context || "Landing Page de Alta Conversão"}
Tom desejado: ${tone || "Agressivo, persuasivo e focado em benefícios"}
Região/Cidade: ${cityOrRegion || "Brasil"}
Instrução adicional: ${customInstruction || "Torne mais direto, atraente e com gatilhos de urgência."}

Retorne um JSON com:
- "result": O novo texto melhorado.
- "alternatives": Uma lista com 3 alternativas adicionais de alta conversão.
- "reasoning": Breve explicação de por que converte mais (1 frase).`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        result: { type: Type.STRING },
        alternatives: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        reasoning: { type: Type.STRING },
      },
      required: ["result", "alternatives"],
    };

    if (ai) {
      try {
        const result = await callGeminiWithWaterfall(ai, {
          contents: prompt,
          responseSchema,
        });
        return res.json({ success: true, ...result.data });
      } catch (err: any) {
        console.warn("AI refine waterfall failed, using heuristic copy enhancer:", err?.message);
      }
    }

    // Heuristic Copy Enhancer Fallback
    const cleanText = (currentText || "").trim();
    const cityText = cityOrRegion ? ` em ${cityOrRegion}` : "";
    const improved = cleanText
      ? `⚡ [Aceleração Comprovada] ${cleanText}${cityText} com Garantia Total de Resultados`
      : `Transforme seus Resultados com Nossa Estrutura de Alta Conversão${cityText}`;

    return res.json({
      success: true,
      result: improved,
      alternatives: [
        `Como Multiplicar seus Resultados${cityText} em Menos de 14 Dias`,
        `O Método Definitivo para Escalar Vendas com Previsibilidade${cityText}`,
        `Últimas Vagas Abertas: Acesso Exclusivo à Metodologia de Alta Conversão`,
      ],
      reasoning: "Adiciona gatilho de escassez, especificidade geográfica e foco no benefício primário.",
    });
  } catch (err: any) {
    console.error("AI refine error:", err);
    return res.json({
      success: true,
      result: req.body?.currentText || "Transforme seus Resultados Agora",
      alternatives: [
        "Acelere seu Crescimento com o Método Comprovado",
        "A Solução Definitiva para o seu Negócio",
      ],
      reasoning: "Estrutura simplificada de alta conversão.",
    });
  }
});

// ============================================================================
// PERSISTENT LANDING PAGES REST API (SERVER-SIDE DATABASE + FILE BACKED)
// ============================================================================

// GET all landing pages
cometLpRouter.get("/api/landing-pages", async (_req, res) => {
  try {
    let pages = readStoredLandingPages();

    // Recalcula dinamicamente estatísticas garantindo consistência com os leads gravados
    const storedLeads = readStoredLeads();
    pages = pages.map((p) => {
      const pId = p.id?.toLowerCase();
      const pSlug = p.slug?.toLowerCase();
      const pName = (p.name || p.title || "").toLowerCase();

      const matchedLeadsCount = storedLeads.filter((l) => {
        const lPageId = (l.pageId || "").toLowerCase();
        const lPageTitle = (l.pageTitle || "").toLowerCase();
        const lCompany = (l.company || "").toLowerCase();
        const lSource = (l.source || "").toLowerCase();

        if (pId && (lPageId === pId || lPageTitle === pId)) return true;
        if (pSlug && (lPageId === pSlug || lSource.includes(pSlug))) return true;
        if (pName && (lPageTitle === pName || lCompany.includes(pName) || lSource.includes(pName))) return true;
        return false;
      }).length;

      const effectiveLeads = Math.max(Number(p.leads || p.leads_count) || 0, matchedLeadsCount);
      const effectiveVisits = Math.max(Number(p.visits || p.viewsCount || p.views_count) || 0, effectiveLeads);
      const effectiveConv = effectiveVisits > 0 ? Math.min(100, Math.round((effectiveLeads / effectiveVisits) * 100)) : 0;

      return {
        ...p,
        visits: effectiveVisits,
        viewsCount: effectiveVisits,
        views_count: effectiveVisits,
        leads: effectiveLeads,
        leads_count: effectiveLeads,
        conv: effectiveConv,
      };
    });

    res.json({ success: true, landingPages: pages });
  } catch (err: any) {
    console.error("Error fetching landing pages:", err);
    res.status(500).json({ error: err?.message || "Internal server error" });
  }
});

// GET single landing page
cometLpRouter.get("/api/landing-pages/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "Missing landing page id" });
    }

    const found = await findLandingPageAnywhere(id);
    if (found) {
      return res.json({ success: true, landingPage: found, page: found });
    }

    res.status(404).json({ error: "Landing page not found" });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Internal server error" });
  }
});

// POST create landing page
cometLpRouter.post("/api/landing-pages", async (req, res) => {
  try {
    const body = req.body || {};
    const fallbackId = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });

    const pageId = body.id && typeof body.id === "string" && body.id.trim() ? body.id : fallbackId;
    const effectiveHeroModel = body.heroModel || body.hero?.model || "split_image";
    const newPage = {
      ...body,
      id: pageId,
      heroModel: effectiveHeroModel,
      hero: {
        ...(body.hero || {}),
        model: effectiveHeroModel,
      },
      name: body.name || body.title || "Nova Landing Page",
      title: body.title || body.name || "Nova Landing Page",
      template: body.template || "COMET",
      status: body.status || "Ativa",
      visits: Number(body.visits) || 0,
      leads: Number(body.leads ?? body.leads_count) || 0,
      conv: Number(body.conv) || 0,
      type: body.type || "COMET CRO",
      created_at: body.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 1. Salva no arquivo do servidor
    const current = readStoredLandingPages();
    const updatedList = [newPage, ...current.filter((p) => p.id !== newPage.id && p.slug !== newPage.slug)];
    writeStoredLandingPages(updatedList);

    // 2. Cache no preview store
    previewPagesStore.set(newPage.id, newPage);
    if (newPage.slug) previewPagesStore.set(newPage.slug, newPage);
    if (newPage.previewToken) previewPagesStore.set(newPage.previewToken, newPage);

    res.json({ success: true, landingPage: newPage });
  } catch (err: any) {
    console.error("Error creating landing page:", err);
    res.status(500).json({ error: err?.message || "Internal server error" });
  }
});

// PUT update landing page
cometLpRouter.put("/api/landing-pages/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const current = readStoredLandingPages();
    const existing = current.find((p) => p.id === id || p.slug === id);

    const prevStatus = existing?.status;
    const nextStatus = body.status || existing?.status;
    const isExitingTestMode = prevStatus === "Teste" && (nextStatus === "Ativa" || nextStatus === "Pausada");

    const effectiveHeroModel = body.heroModel || body.hero?.model || existing?.heroModel || existing?.hero?.model || "split_image";
    let updatedPage = {
      ...(existing || {}),
      ...body,
      heroModel: effectiveHeroModel,
      hero: {
        ...(existing?.hero || {}),
        ...(body.hero || {}),
        model: effectiveHeroModel,
      },
      id: existing?.id || id,
      updated_at: new Date().toISOString(),
    };

    // Se saiu de Teste para Ativa, zera métricas e limpa leads de teste
    if (isExitingTestMode || (nextStatus === "Ativa" && prevStatus === "Teste")) {
      updatedPage = {
        ...updatedPage,
        visits: 0,
        leads: 0,
        conv: 0,
        leads_count: 0,
        viewsCount: 0,
      };

      try {
        const targetTitle = (existing?.name || existing?.title || updatedPage.name || updatedPage.title || "").toLowerCase();
        const targetSlug = (existing?.slug || updatedPage.slug || "").toLowerCase();
        const storedLeads = readStoredLeads();
        const cleanedLeads = storedLeads.filter((lead: any) => {
          if (lead.pageId === id || lead.pageId === updatedPage.id) return false;
          const lTitle = (lead.pageTitle || lead.landingPage || "").toLowerCase();
          const lSource = (lead.source || "").toLowerCase();
          const isTestLead = lead.isTest || lead.classification === "Lead Teste" || lead.metadata?.isTest || (lead.tags && lead.tags.includes("leadtest"));
          if (isTestLead) {
            if (targetTitle && (lTitle.includes(targetTitle) || lSource.includes(targetTitle))) return false;
            if (targetSlug && (lTitle.includes(targetSlug) || lSource.includes(targetSlug))) return false;
          }
          return true;
        });
        writeStoredLeads(cleanedLeads);
        leadSubmissions = cleanedLeads;
      } catch (cleanErr) {
        console.warn("Express notice clearing test leads on LP activation:", cleanErr);
      }
    }

    const updatedList = current.map((p) => (p.id === updatedPage.id ? updatedPage : p));
    if (!current.some((p) => p.id === updatedPage.id)) {
      updatedList.unshift(updatedPage);
    }
    writeStoredLandingPages(updatedList);

    // Cache no preview store
    previewPagesStore.set(updatedPage.id, updatedPage);
    if (updatedPage.slug) previewPagesStore.set(updatedPage.slug, updatedPage);
    if (updatedPage.previewToken) previewPagesStore.set(updatedPage.previewToken, updatedPage);

    res.json({ success: true, landingPage: updatedPage });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Internal server error" });
  }
});

// Endpoint explícito para limpar leads de teste de uma Landing Page
cometLpRouter.post("/api/landing-pages/:id/clear-test-leads", async (req, res) => {
  try {
    const { id } = req.params;
    const { pageTitle, pageSlug } = req.body || {};
    const normTitle = (pageTitle || "").trim().toLowerCase();
    const normSlug = (pageSlug || "").trim().toLowerCase();

    const storedLeads = readStoredLeads();
    const cleanedLeads = storedLeads.filter((lead: any) => {
      if (lead.pageId === id || lead.landingPageId === id) return false;
      const lTitle = (lead.pageTitle || lead.landingPage || "").trim().toLowerCase();
      const lSource = (lead.source || "").trim().toLowerCase();
      const isTestLead = lead.isTest || lead.classification === "Lead Teste" || lead.metadata?.isTest || (lead.tags && lead.tags.includes("leadtest"));
      if (isTestLead) {
        if (normTitle && (lTitle.includes(normTitle) || lSource.includes(normTitle))) return false;
        if (normSlug && (lTitle.includes(normSlug) || lSource.includes(normSlug))) return false;
      }
      return true;
    });
    writeStoredLeads(cleanedLeads);
    leadSubmissions = cleanedLeads;

    return res.json({ success: true, message: "Leads de teste excluídos com sucesso" });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to clear test leads" });
  }
});

// DELETE single landing page
cometLpRouter.delete("/api/landing-pages/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const current = readStoredLandingPages();
    const filtered = current.filter((p) => p.id !== id && p.slug !== id);
    writeStoredLandingPages(filtered);

    previewPagesStore.delete(id);

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Internal server error" });
  }
});

// POST bulk delete landing pages
cometLpRouter.post("/api/landing-pages/bulk-delete", async (req, res) => {
  try {
    const { ids } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.json({ success: true, count: 0 });
    }

    const idSet = new Set(ids);
    const current = readStoredLandingPages();
    const filtered = current.filter((p) => !idSet.has(p.id) && !idSet.has(p.slug));
    writeStoredLandingPages(filtered);

    ids.forEach((i) => previewPagesStore.delete(i));

    res.json({ success: true, count: ids.length });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Internal server error" });
  }
});

// POST clean database keeping one
cometLpRouter.post("/api/landing-pages/clean-keep-one", async (req, res) => {
  try {
    const { keepId } = req.body || {};
    const current = readStoredLandingPages();
    let kept = current.find((p) => p.id === keepId || p.slug === keepId);
    if (!kept && current.length > 0) kept = current[0];

    if (kept) {
      writeStoredLandingPages([kept]);
    } else {
      writeStoredLandingPages([]);
    }

    res.json({ success: true, kept });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Internal server error" });
  }
});

// ============================================================================
// SURVEYS & DIAGNOSTICS REST API (SERVER PERSISTENCE)
// ============================================================================

// GET all survey responses (MUST be declared BEFORE /api/surveys/:id)
cometLpRouter.get("/api/surveys/responses", async (_req, res) => {
  try {
    const list = readStoredSurveyResponses();
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Internal server error" });
  }
});

// GET all surveys
cometLpRouter.get("/api/surveys", async (_req, res) => {
  try {
    const diskSurveys = readStoredSurveys();
    res.json({ success: true, surveys: diskSurveys });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Internal server error" });
  }
});

// GET single survey by ID
cometLpRouter.get("/api/surveys/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "Missing survey ID" });

    // 0. Google Apps Script (fonte mestre em nuvem)
    const webappUrl = getDriveWebAppUrlServer();
    if (webappUrl) {
      try {
        const urlObj = new URL(webappUrl);
        urlObj.searchParams.set("action", "GET_PUBLIC_SURVEY");
        urlObj.searchParams.set("id", id);
        urlObj.searchParams.set("surveyId", id);
        urlObj.searchParams.set("t", Date.now().toString());
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const gasRes = await fetch(urlObj.toString(), { method: "GET", redirect: "follow", signal: controller.signal });
        clearTimeout(timeout);
        const text = await gasRes.text();
        if (text && !text.trim().startsWith("<")) {
          const parsed = JSON.parse(text);
          if (parsed?.survey && parsed.survey.id) {
            return res.json({ success: true, survey: parsed.survey, source: "google-cloud" });
          }
        }
      } catch {}
    }

    // 1. Disco / Memória
    const diskSurveys = readStoredSurveys();
    const foundDisk = diskSurveys.find((s) => s.id === id || s.slug === id || (s.name && s.name.toLowerCase() === id.toLowerCase()));
    if (foundDisk) {
      return res.json({ success: true, survey: foundDisk });
    }

    // 2. Preset Fallback
    const foundPreset = SURVEY_PRESETS.find(p => p.id === id || p.id.toLowerCase() === id.toLowerCase() || (p.name && p.name.toLowerCase() === id.toLowerCase()));
    if (foundPreset) {
      const asSurvey = {
        id: foundPreset.id,
        name: foundPreset.name,
        questions: foundPreset.questions || [],
        status: "active",
        type: (foundPreset.id.includes("min") || foundPreset.id.includes("qualificacao")) ? "individual" : "mass",
        purpose: (foundPreset.id.includes("min") || foundPreset.id.includes("qualificacao")) ? "min" : "common",
        settings: {
          headline: foundPreset.name,
          description: foundPreset.description,
          buttonText: "Iniciar Diagnóstico",
          thankYouMessage: "Obrigado por responder nosso diagnóstico!",
          accentColor: foundPreset.accentColor || "#FF6B00",
        },
        reward: {
          title: "Diagnóstico Completo",
          type: "whatsapp",
          value: "",
        },
        template: "Modern",
        completions: 0,
        visits: 0,
        created_at: new Date().toISOString(),
      };
      return res.json({ success: true, survey: asSurvey });
    }

    res.status(404).json({ error: "Survey not found" });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Internal server error" });
  }
});

// POST create survey
cometLpRouter.post("/api/surveys", async (req, res) => {
  try {
    const survey = req.body;
    if (!survey || !survey.id) return res.status(400).json({ error: "Missing survey id" });
    const current = readStoredSurveys();
    const updated = [survey, ...current.filter((s) => s.id !== survey.id)];
    writeStoredSurveys(updated);
    res.json({ success: true, survey });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Internal server error" });
  }
});

// PUT update survey
cometLpRouter.put("/api/surveys/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const current = readStoredSurveys();
    const existing = current.find((s) => s.id === id);
    const updatedSurvey = {
      ...(existing || {}),
      ...body,
      id,
      updated_at: new Date().toISOString(),
    };
    const updated = [updatedSurvey, ...current.filter((s) => s.id !== id)];
    writeStoredSurveys(updated);
    res.json({ success: true, survey: updatedSurvey });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Internal server error" });
  }
});

// DELETE survey
cometLpRouter.delete("/api/surveys/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const current = readStoredSurveys();
    writeStoredSurveys(current.filter((s) => s.id !== id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Internal server error" });
  }
});

// POST submit survey response
cometLpRouter.post("/api/surveys/responses", async (req, res) => {
  try {
    const body = req.body || {};
    const { surveyId, leadForm, answers, duration, extraPayload, tracking } = body;
    console.log("Submitting survey response:", { surveyId, leadForm, answers });

    const responseId = `resp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    const responseRecord = {
      id: responseId,
      surveyId: surveyId || "pesquisa_custom",
      survey_id: surveyId || "pesquisa_custom",
      leadId: leadForm?.id || extraPayload?.leadId || null,
      landingPageId: extraPayload?.landingPageId || extraPayload?.pageId || null,
      answers: answers || {},
      completedAt: nowIso,
      created_at: nowIso,
      durationSeconds: Number(duration) || 0,
      duration_seconds: Number(duration) || 0,
      leadName: leadForm?.name || extraPayload?.leadName || "Participante",
      leadWhatsapp: leadForm?.whatsapp || extraPayload?.leadWhatsapp || "",
      leadEmail: leadForm?.email || extraPayload?.leadEmail || "",
      leadCompany: leadForm?.company || extraPayload?.leadCompany || "",
      score: extraPayload?.score || body.score || null,
      temperature: extraPayload?.temperature || body.temperature || null,
      tracking: tracking || {},
    };

    // 1. Salva resposta instantaneamente na memória e disco
    const currentResponses = readStoredSurveyResponses();
    writeStoredSurveyResponses([responseRecord, ...currentResponses.slice(0, 500)]);

    // 2. Incrementa completions na pesquisa instantaneamente
    if (surveyId) {
      try {
        const diskSurveys = readStoredSurveys();
        const sIndex = diskSurveys.findIndex((s) => s.id === surveyId || s.slug === surveyId);
        if (sIndex !== -1) {
          diskSurveys[sIndex] = {
            ...diskSurveys[sIndex],
            completions: (Number(diskSurveys[sIndex].completions) || 0) + 1,
            updatedAt: nowIso,
            updated_at: nowIso,
          };
          writeStoredSurveys(diskSurveys);
        }
      } catch {}
    }

    // 3. Cadastra ou atualiza o lead na Base de Leads do CRM com qualificação MIN
    let leadRecord: any = null;
    console.log("Processing lead for survey response, leadForm:", leadForm);
    if (leadForm?.name || leadForm?.whatsapp || leadForm?.email || extraPayload?.leadName) {
      const lName = (leadForm?.name || extraPayload?.leadName || "Lead Participante").trim();
      const lPhone = normalizePhoneServer(leadForm?.whatsapp || extraPayload?.leadWhatsapp || "");
      const lEmail = (leadForm?.email || extraPayload?.leadEmail || "").trim().toLowerCase();
      const pTitle = extraPayload?.surveyName || extraPayload?.pageTitle || "Pesquisa Interativa";
      
      console.log("Normalized lead data:", { lName, lPhone, lEmail });

      // Calcula ou extrai parâmetros de pontuação e qualificação MIN
      let calculatedScore = Number(extraPayload?.score || body.score) || 75;
      let calculatedTemp: "Quente" | "Morno" | "Frio" = (extraPayload?.temperature || body.temperature || "Morno") as any;
      let minM: 0 | 1 = 0;
      let minI: 0 | 1 = 0;
      let minN: 0 | 1 = 0;

      // Análise heurística das respostas caso não venha predeterminado
      const allAnsValues = Object.values(answers || {}).map(v => String(v).toLowerCase());
      console.log("Analyzing answers for qualification:", allAnsValues);
      
      const hotKeywords = ["sim, frequentemente", "compromete o crescimento", "sim, com alta prioridade", "imediato (esta semana)", "sim, prontos para investir", "crítico e urgente", "tomador de decisão", "sim, verba já aprovada", "excelente", "superou as expectativas", "vendas", "imediato", "urgente"];
      const coldKeywords = ["não enfrento", "pouco impacto", "talvez em outro momento", "sem pressa", "ainda não temos orçamento", "impacto baixo", "apenas pesquisando", "não temos verba", "péssimo", "não atendeu", "planejamento"];

      let hotCount = 0;
      let coldCount = 0;
      allAnsValues.forEach(val => {
        if (hotKeywords.some(hk => val.includes(hk))) hotCount++;
        if (coldKeywords.some(ck => val.includes(ck))) coldCount++;
      });
      
      console.log("Qualification counts:", { hotCount, coldCount });

      if (hotCount >= 2 || calculatedTemp === "Quente") {
        calculatedTemp = "Quente";
        calculatedScore = Math.max(calculatedScore, 90);
        minM = 1; minI = 1; minN = 1;
      } else if (coldCount >= 2 || calculatedTemp === "Frio") {
        calculatedTemp = "Frio";
        calculatedScore = Math.min(calculatedScore, 35);
        minM = 0; minI = 0; minN = 0;
      } else {
        calculatedTemp = "Morno";
        calculatedScore = 65;
        minM = 1; minI = 1; minN = 0;
      }

      const minTotal = minM + minI + minN;
      const minClassification = calculatedTemp.toUpperCase() as "QUENTE" | "MORNO" | "FRIO" | "DESCARTE";
      const minScoreCode = minTotal === 3 ? "MIN" : (minTotal === 2 ? "MI" : (minTotal === 1 ? "M" : "Nenhum"));

      console.log("Final qualification:", { calculatedScore, calculatedTemp, minClassification, minScoreCode });

      const minQualification = {
        m: minM,
        i: minI,
        n: minN,
        total: minTotal,
        classification: minClassification,
      };

      const curLeads = readStoredLeads();
      const rawTargetLeadId = leadForm?.id || extraPayload?.leadId;

      const existingIndex = curLeads.findIndex(
        (l) => (rawTargetLeadId && l.id === rawTargetLeadId) ||
               (lPhone && l.whatsapp && (l.whatsapp === lPhone || l.whatsapp.replace(/\D/g, "") === lPhone.replace(/\D/g, ""))) ||
               (lEmail && l.email && l.email.toLowerCase() === lEmail)
      );

      console.log("Existing lead index found:", existingIndex);

      if (existingIndex !== -1) {
        // Atualiza o lead existente com as respostas da pesquisa e qualificação MIN
        const existing = curLeads[existingIndex];
        const combinedTags = Array.from(new Set([
          ...(existing.tags || []),
          "pesquisa-respondida",
          "min-qualificado",
          `temp-${calculatedTemp.toLowerCase()}`,
        ]));

        leadRecord = {
          ...existing,
          score: Math.max(existing.score || 0, calculatedScore),
          temperature: calculatedTemp,
          minScore: minScoreCode,
          minQualification,
          quizAnswers: { ...(existing.quizAnswers || {}), ...(answers || {}) },
          surveyAnswers: answers || {},
          tags: combinedTags,
          metadata: {
            ...(existing.metadata || {}),
            surveyId,
            surveyName: pTitle,
            surveyScore: calculatedScore,
            surveyTemperature: calculatedTemp,
            minQualification,
            surveyAnswers: answers || {},
            surveyAnsweredAt: nowIso,
          },
        };
        curLeads[existingIndex] = leadRecord;
        console.log("Lead updated in CRM base.");
      } else {
        // Cria novo lead com qualificação MIN completa
        leadRecord = {
          id: `lead_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          pageId: responseRecord.landingPageId || surveyId || "survey",
          pageTitle: pTitle,
          landingPage: pTitle,
          landingPageId: responseRecord.landingPageId || surveyId,
          name: lName,
          whatsapp: lPhone,
          email: lEmail,
          company: leadForm?.company || `${lName} (Pesquisa: ${pTitle})`,
          quizAnswers: answers || {},
          surveyAnswers: answers || {},
          utms: tracking?.utm || {},
          source: tracking?.source || `Pesquisa: ${pTitle}`,
          stage: calculatedTemp === "Quente" ? "Oportunidade" : "Leads",
          classification: "Lead",
          temperature: calculatedTemp,
          minScore: minScoreCode,
          minQualification,
          type: "Inbound",
          tags: ["pesquisa", "deepfind", "comet-lp", "min-qualificado", `temp-${calculatedTemp.toLowerCase()}`],
          score: calculatedScore,
          submittedAt: nowIso,
          createdAt: nowIso,
          webhookStatus: "pending",
          isTest: false,
          metadata: {
            surveyId,
            surveyName: pTitle,
            answers,
            duration,
            tracking,
            leadForm,
            score: calculatedScore,
            temperature: calculatedTemp,
            minQualification,
          },
        };
        curLeads.unshift(leadRecord);
        console.log("New lead created in CRM base.");
      }

      if (curLeads.length > 500) curLeads.pop();
      writeStoredLeads(curLeads);
      leadSubmissions = curLeads;
    }

    // 4. Se havia uma Landing Page vinculada, incrementa suas conversões instantaneamente
    if (responseRecord.landingPageId) {
      try {
        const diskLps = readStoredLandingPages();
        const lpIdx = diskLps.findIndex((p) => p.id === responseRecord.landingPageId || p.slug === responseRecord.landingPageId);
        if (lpIdx !== -1) {
          const target = diskLps[lpIdx];
          const newLeads = (Number(target.leads || target.leads_count) || 0) + 1;
          const visits = Math.max(Number(target.visits || target.viewsCount) || 0, newLeads);
          diskLps[lpIdx] = {
            ...target,
            leads: newLeads,
            leads_count: newLeads,
            conv: Math.round((newLeads / visits) * 100),
            updated_at: nowIso,
          };
          writeStoredLandingPages(diskLps);
          previewPagesStore.set(target.id, diskLps[lpIdx]);
          if (target.slug) previewPagesStore.set(target.slug, diskLps[lpIdx]);
        }
      } catch {}
    }

    // 5. Responde instantaneamente (< 2ms)
    res.json({
      success: true,
      responseId,
      response: responseRecord,
      leadId: leadRecord?.id || null,
      message: "Resposta da pesquisa e lead processados com sucesso!",
    });

    // 6. Sincroniza em background com o Google Sheets se configurado
    setImmediate(() => {
      forwardSurveyResponseToGoogleSheetsServer(responseRecord);
      if (leadRecord) {
        forwardLeadToGoogleSheetsServer(leadRecord);
      }
    });
  } catch (err: any) {
    console.error("Error submitting survey response:", err);
    return res.status(500).json({ error: err?.message || "Internal server error" });
  }
});

// ============================================================================
// GOOGLE SHEETS & DRIVE SERVER-SIDE SYNC ENDPOINT
// ============================================================================
cometLpRouter.all("/api/drive/sync", async (req, res) => {
  try {
    const webappUrl = getDriveWebAppUrlServer();
    const clientData = req.body?.data || req.body;

    // Se o cliente enviou um payload para sincronizar
    if (clientData && (Array.isArray(clientData.leads) || Array.isArray(clientData.landingPages))) {
      const counts = syncDriveDataToDisk(clientData);
      return res.json({ success: true, synced: true, source: "client-push", ...counts });
    }

    if (!webappUrl) {
      return res.json({ success: true, synced: false, message: "Nenhuma URL de Google Apps Script configurada no servidor." });
    }

    // Leitura remota ativa do Google Sheets
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    const fetchRes = await fetch(webappUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "FORCE_READ_SHEETS" }),
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timeout);

    const raw = await fetchRes.text();
    let parsed: any = null;
    try {
      parsed = JSON.parse(raw);
    } catch {}

    if (parsed) {
      const content = parsed.data || parsed.content || parsed;
      const counts = syncDriveDataToDisk(content);
      return res.json({ success: true, synced: true, source: "sheets-pull", ...counts, data: content });
    }

    return res.json({ success: true, synced: false, message: "Resposta não pôde ser analisada como JSON." });
  } catch (err: any) {
    return res.json({ success: false, error: err.message });
  }
});


