import { type SurveyQuestion } from "@/hooks/use-data";

export interface SurveyPreset {
  id: string;
  name: string;
  badge: string;
  category: string;
  description: string;
  timeEstimate: string;
  accentColor?: string;
  questions: SurveyQuestion[];
}

export const SURVEY_PRESETS: SurveyPreset[] = [
  {
    id: "qualificacao-min-1min",
    name: "Qualificação MIN (Momento, Interesse, Necessidade)",
    badge: "1 Minuto • Alta Conversão",
    category: "Qualificação Comercial",
    description: "6 perguntas ultra-objetivas para qualificar o lead em menos de 1 minuto e identificar Momento, Interesse e Necessidade de compra.",
    timeEstimate: "~1 min",
    accentColor: "#FF6B00",
    questions: [
      {
        id: "min-q1",
        type: "single",
        category: "NECESSIDADE DO PROJETO",
        question: "Você perde vendas ou tempo por falta de um processo comercial organizado e estruturado?",
        options: ["Não enfrento esse problema", "Às vezes acontecem perdas", "Sim, frequentemente"],
        mapToProfile: "minScore",
        required: true
      },
      {
        id: "min-q2",
        type: "single",
        category: "NECESSIDADE DO PROJETO",
        question: "Se esse gargalo não for solucionado nos próximos 3 meses, qual o impacto no seu faturamento?",
        options: ["Pouco impacto no resultado", "Perco dinheiro e oportunidades", "Compromete o crescimento da empresa"],
        mapToProfile: "minScore",
        required: true
      },
      {
        id: "min-q3",
        type: "single",
        category: "INTERESSE COMERCIAL",
        question: "Você gostaria de ver uma demonstração prática de como nossa solução resolve esse cenário?",
        options: ["Talvez em outro momento", "Sim, tenho interesse em conhecer", "Sim, com alta prioridade para fechar"],
        mapToProfile: "strategy",
        required: true
      },
      {
        id: "min-q4",
        type: "single",
        category: "INTERESSE COMERCIAL",
        question: "Você já utiliza ou testou alguma ferramenta ou consultoria concorrente?",
        options: ["Nunca testamos nada parecido", "Usamos outra solução e queremos trocar", "Estamos comparando alternativas de mercado"],
        mapToProfile: "type",
        required: true
      },
      {
        id: "min-q5",
        type: "single",
        category: "MOMENTO DE COMPRA",
        question: "Qual é o momento ideal para iniciar a implementação da solução na sua empresa?",
        options: ["Sem pressa (longo prazo)", "Próximos 30 dias", "Imediato (esta semana)"],
        mapToProfile: "decisionRole",
        required: true
      },
      {
        id: "min-q6",
        type: "single",
        category: "MOMENTO DE COMPRA & ORÇAMENTO",
        question: "A sua empresa possui condições financeiras e orçamento disponível para investir agora?",
        options: ["Ainda não temos orçamento", "Depende da proposta comercial", "Sim, prontos para investir"],
        mapToProfile: "minScore",
        required: true
      }
    ]
  },
  {
    id: "qualificacao-temperatura",
    name: "Qualificação de Leads (Quente, Morno, Frio)",
    badge: "Termômetro Comercial",
    category: "Qualificação de Leads",
    description: "Identifique o nível de prontidão do lead para compra (Quente, Morno ou Frio) e priorize o atendimento dos vendedores.",
    timeEstimate: "~2 min",
    accentColor: "#F59E0B",
    questions: [
      {
        id: "temp-q1",
        type: "single",
        category: "IMPACTO E DOR DO NEGÓCIO",
        question: "O quanto o problema atual impacta diretamente os resultados e lucros da sua empresa?",
        options: ["Impacto baixo / Não urgente (Frio)", "Impacto moderado nos processos (Morno)", "Impacto crítico e urgente no faturamento (Quente)"],
        mapToProfile: "minScore",
        required: true
      },
      {
        id: "temp-q2",
        type: "single",
        category: "PODER DE DECISÃO",
        question: "Qual o seu papel no processo de aprovação e contratação de novas ferramentas ou serviços?",
        options: ["Apenas pesquisando para a equipe (Frio)", "Influencio e recomendo a decisão (Morno)", "Sou o tomador de decisão final (Quente)"],
        mapToProfile: "decisionRole",
        required: true
      },
      {
        id: "temp-q3",
        type: "single",
        category: "PRAZO DE IMPLEMENTAÇÃO",
        question: "Quando você gostaria de ter esta solução rodando na sua operação?",
        options: ["Apenas planejando para o futuro (Frio)", "Nos próximos 30 a 60 dias (Morno)", "Imediatamente / Esta semana (Quente)"],
        mapToProfile: "strategy",
        required: true
      },
      {
        id: "temp-q4",
        type: "single",
        category: "VERBA E ORÇAMENTO",
        question: "Já existe verba reservada ou orçamento aprovado para contratação?",
        options: ["Não temos verba no momento (Frio)", "Precisa ser aprovado internamente (Morno)", "Sim, verba já aprovada e disponível (Quente)"],
        mapToProfile: "type",
        required: true
      }
    ]
  },
  {
    id: "pesquisa-satisfacao-csat-nps",
    name: "Pesquisa de Satisfação (CSAT & NPS)",
    badge: "Experiência do Cliente",
    category: "Pós-Venda & Retenção",
    description: "Avalie a experiência do cliente com perguntas de atendimento, entrega e lealdade no padrão CSAT e NPS.",
    timeEstimate: "~2 min",
    accentColor: "#10B981",
    questions: [
      {
        id: "csat-q1",
        type: "satisfaction",
        category: "ATENDIMENTO E SUPORTE",
        question: "Como você avalia a clareza, cortesia e agilidade do nosso time de atendimento?",
        options: ["Péssimo", "Insatisfatório", "Satisfatório", "Muito bom", "Excelente"],
        required: true
      },
      {
        id: "csat-q2",
        type: "single",
        category: "QUALIDADE DA ENTREGA",
        question: "A solução ou serviço entregue atendeu às suas expectativas e objetivos iniciais?",
        options: ["Não atendeu", "Parcialmente", "Totalmente satisfatório", "Superou as expectativas"],
        required: true
      },
      {
        id: "csat-q3",
        type: "single",
        category: "RESOLUÇÃO DE PROBLEMAS",
        question: "Quando você precisou de suporte, ajustes ou esclarecimentos, quão ágil foi o retorno?",
        options: ["Sem suporte adequado", "Demorado", "Dentro do prazo esperado", "Imediato e eficiente"],
        required: true
      },
      {
        id: "csat-q4",
        type: "nps",
        category: "LEALDADE E RECOMENDAÇÃO (NPS)",
        question: "De 0 a 10, qual a probabilidade de você recomendar nossa empresa para um colega ou parceiro de negócios?",
        required: true
      },
      {
        id: "csat-q5",
        type: "long_text",
        category: "FEEDBACK QUALITATIVO",
        question: "O que podemos melhorar para tornar sua experiência ainda melhor?",
        required: false
      }
    ]
  },
  {
    id: "pesquisa-tendencias-mercado",
    name: "Pesquisa de Mercado (Tendências e Desafios)",
    badge: "Tendências de Mercado",
    category: "Inteligência de Mercado",
    description: "Descubra os principais desafios, projeção de investimentos, ferramentas atuais e metas de crescimento do seu mercado.",
    timeEstimate: "~2 min",
    accentColor: "#3B82F6",
    questions: [
      {
        id: "mkt-q1",
        type: "single",
        category: "DESAFIOS ESTRATÉGICOS",
        question: "Qual é o principal obstáculo para o crescimento da sua operação no momento?",
        options: [
          "Geração de Leads Qualificados",
          "Baixa Conversão em Vendas",
          "Gestão e Processos Manuais Lentos",
          "Falta de Tecnologia e Automações"
        ],
        required: true
      },
      {
        id: "mkt-q2",
        type: "single",
        category: "TENDÊNCIAS E INVESTIMENTOS",
        question: "Sua empresa planeja investir em novas tecnologias, consultorias ou softwares neste semestre?",
        options: [
          "Sem previsão no momento",
          "Em análise pela diretoria",
          "Sim, orçamento de até R$ 5k/mês",
          "Sim, orçamento acima de R$ 10k/mês"
        ],
        required: true
      },
      {
        id: "mkt-q3",
        type: "single",
        category: "TECNOLOGIA E PROCESSOS ATUAIS",
        question: "Como você gerencia o relacionamento com clientes e processos hoje?",
        options: [
          "Planilhas manuais (Excel / Google Sheets)",
          "Anotações físicas e conversas de WhatsApp",
          "Software básico sem integração",
          "CRM integrado com automações"
        ],
        required: true
      },
      {
        id: "mkt-q4",
        type: "single",
        category: "METAS DE CRESCIMENTO",
        question: "Qual é a sua principal meta de faturamento e expansão para os próximos 12 meses?",
        options: [
          "Manter estabilidade e consolidação",
          "Crescer até 30% no ano",
          "Dobrar de tamanho (100% de alta)",
          "Expansão agressiva (2x ou mais)"
        ],
        required: true
      }
    ]
  }
];