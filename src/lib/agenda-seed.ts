import type { AgendaEvent, AgendaFormField, AgendaSchedule } from "@/types/agenda";

export function createStarterAgendaSeed(): {
  events: AgendaEvent[];
  schedules: AgendaSchedule[];
  fields: AgendaFormField[];
} {
  const nowIso = new Date().toISOString();
  const today = new Date();
  const future = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);
  const toIso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const starterEvent: AgendaEvent = {
    id_evento: "EVT-001",
    slug: "mentoria-comercial-estrategica",
    nome: "Mentoria Comercial Estratégica",
    descricao:
      "Sessão de diagnóstico e planejamento para aceleração de vendas e captação de clientes.",
    imagem_url:
      "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=180&auto=format&fit=crop&q=80",
    tipo_evento: "ONLINE",
    local_evento: "Sala Virtual (Google Meet / WhatsApp)",
    label_local: "Bairro / Escola / Local",
    local_opcoes: [],
    exibir_produto_publico: true,
    data_inicio: toIso(today),
    data_fim: toIso(future),
    dias_semana: ["SEG", "TER", "QUA", "QUI", "SEX", "SAB", "DOM"],
    duracao_minutos: 60,
    capacidade_padrao: 5,
    dias_antecedencia_max: 30,
    agenda_publica_ativa: true,
    permitir_lista_espera: true,
    permite_cancelamento: true,
    horas_antecedencia_cancelamento: 24,
    mensagem_confirmacao:
      "Parabéns! Sua sessão estratégica está confirmada. Em breve entraremos em contato via WhatsApp com o link da sala virtual.",
    status: "PUBLICADO",
    visitas: 0,
    criado_em: nowIso,
    atualizado_em: nowIso,
  };

  const starterSchedules: AgendaSchedule[] = [
    {
      id_horario: "SCH-001",
      id_evento: "EVT-001",
      hora_inicio: "09:00",
      hora_fim: "10:00",
      capacidade: 5,
      dias_aplicaveis: ["SEG", "TER", "QUA", "QUI", "SEX", "SAB", "DOM"],
      ativo: true,
      criado_em: nowIso,
      atualizado_em: nowIso,
    },
    {
      id_horario: "SCH-002",
      id_evento: "EVT-001",
      hora_inicio: "10:00",
      hora_fim: "11:00",
      capacidade: 5,
      dias_aplicaveis: ["SEG", "TER", "QUA", "QUI", "SEX", "SAB", "DOM"],
      ativo: true,
      criado_em: nowIso,
      atualizado_em: nowIso,
    },
  ];

  const starterFields: AgendaFormField[] = [
    {
      id_campo: "FLD-001",
      id_evento: "EVT-001",
      nome_campo: "cargo_ou_funcao",
      label: "Qual é o seu cargo ou função atual?",
      tipo: "TEXTO_CURTO",
      obrigatorio: true,
      placeholder: "Ex: Gerente Comercial, Fundador, Diretor",
      ordem: 1,
      ativo: true,
    },
    {
      id_campo: "FLD-002",
      id_evento: "EVT-001",
      nome_campo: "faturamento_mensal",
      label: "Qual é a faixa de faturamento médio mensal da sua empresa?",
      tipo: "SELECAO_UNICA",
      obrigatorio: true,
      opcoes: [
        "Até R$ 50 mil",
        "De R$ 50 mil a R$ 150 mil",
        "De R$ 150 mil a R$ 500 mil",
        "Acima de R$ 500 mil",
      ],
      ordem: 2,
      ativo: true,
    },
    {
      id_campo: "FLD-003",
      id_evento: "EVT-001",
      nome_campo: "equipe_comercial",
      label: "Você já possui equipe de vendas ativa?",
      tipo: "SIM_NAO",
      obrigatorio: false,
      ordem: 3,
      ativo: true,
    },
  ];

  return {
    events: [starterEvent],
    schedules: starterSchedules,
    fields: starterFields,
  };
}
