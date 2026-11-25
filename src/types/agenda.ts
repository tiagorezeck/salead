export type AgendaEventStatus = "PUBLICADO" | "PAUSADO" | "ENCERRADO" | "RASCUNHO";

export type AgendaUnavailableReason = "AGENDA_FECHADA" | "LOTADO" | "ENCERRADO";

export type AgendaEventType = "PRESENCIAL" | "ONLINE" | "HIBRIDO";

export interface AgendaEvent {
  id_evento: string;
  nome: string;
  slug: string;
  descricao: string;
  local_evento: string;
  tipo_evento?: AgendaEventType;
  duracao_minutos: number;
  capacidade_padrao: number;
  dias_semana: string[]; // ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM']
  dias_antecedencia_max: number;
  imagem_url?: string;
  product_id?: string; // Vínculo com Produto do Salead
  exibir_produto_publico?: boolean;
  label_local?: string;
  local_opcoes?: string[];
  status: AgendaEventStatus;
  agenda_publica_ativa?: boolean;
  motivo_indisponivel?: AgendaUnavailableReason;
  mensagem_indisponivel?: string;
  permitir_lista_espera?: boolean;
  mensagem_confirmacao: string;
  permite_cancelamento: boolean;
  horas_antecedencia_cancelamento: number;
  visitas?: number;
  criado_em: string;
  atualizado_em: string;
}

export interface AgendaSchedule {
  id_horario: string;
  id_evento: string;
  hora_inicio: string; // HH:mm
  hora_fim: string; // HH:mm
  capacidade: number;
  dias_aplicaveis: string[]; // ['SEG', 'TER', ...]
  ativo: boolean;
}

export interface AgendaBlock {
  id_bloqueio: string;
  id_evento: string; // '*' para todos ou id específico
  data: string; // YYYY-MM-DD
  hora_inicio: string; // HH:mm ou 'ALL_DAY'
  hora_fim: string;
  motivo: string;
  criado_por: string;
  criado_em: string;
}

export type AgendaBookingStatus = "CONFIRMADO" | "REALIZADO" | "CANCELADO" | "NO_SHOW";

export type AgendaBookingOrigin = "PUBLICO" | "CRM_MANUAL";

export interface AgendaBooking {
  id_agendamento: string;
  protocolo: string;
  id_evento: string;
  evento_nome?: string;
  id_lead: string;
  lead_nome?: string;
  lead_whatsapp?: string;
  lead_email?: string;
  lead_local?: string;
  responsavel_nome?: string;
  data_agendamento: string; // YYYY-MM-DD
  hora_inicio: string; // HH:mm
  hora_fim: string; // HH:mm
  status: AgendaBookingStatus;
  origem?: AgendaBookingOrigin;
  meet_link?: string;
  calendar_link?: string;
  google_event_id?: string;
  observacoes?: string;
  lp_id?: string;
  motivo_cancelamento?: string;
  cancelado_em?: string;
  criado_em: string;
  atualizado_em?: string;
}

export type AgendaFieldType =
  | "TEXTO_CURTO"
  | "TEXTO_LONGO"
  | "TELEFONE"
  | "EMAIL"
  | "NUMERO"
  | "DATA"
  | "SELECAO_UNICA"
  | "SELECAO_MULTIPLA"
  | "SIM_NAO";

export interface AgendaFormField {
  id_campo: string;
  id_evento: string;
  nome_campo: string;
  label: string;
  tipo: AgendaFieldType;
  obrigatorio: boolean;
  placeholder?: string;
  opcoes?: string[];
  ordem: number;
  ativo: boolean;
}

export interface AgendaFormResponse {
  id_resposta: string;
  id_agendamento: string;
  id_lead: string;
  id_campo: string;
  label?: string;
  valor: string;
  criado_em: string;
}

export interface AgendaWaitlistEntry {
  id_espera: string;
  id_evento: string;
  evento_nome?: string;
  id_lead?: string;
  nome: string;
  whatsapp: string;
  email?: string;
  local?: string;
  aluno_ganhador?: string;
  motivo?: string;
  observacoes?: string;
  criado_em: string;
}

export interface AgendaSlotAvailability {
  id_horario: string;
  data: string; // YYYY-MM-DD
  hora_inicio: string;
  hora_fim: string;
  capacidade_total: number;
  agendamentos_confirmados: number;
  bloqueado: boolean;
  motivo_bloqueio?: string;
  vagas_restantes: number;
  disponivel: boolean;
}

export interface BookingSubmissionPayload {
  slug_evento: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  nome: string;
  whatsapp: string;
  email: string;
  empresa?: string;
  local?: string;
  respostas_customizadas: Record<string, string>;
  lp_id?: string;
  lp_title?: string;
  utms?: Record<string, string>;
}

export interface BookingSuccessResult {
  protocolo: string;
  id_agendamento: string;
  id_lead: string;
  id_task: string;
  evento_nome: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  responsavel_nome: string;
  mensagem_confirmacao: string;
}

export interface WaitlistSubmissionPayload {
  slug_evento: string;
  nome: string;
  whatsapp: string;
  email?: string;
  local?: string;
  aluno_ganhador?: string;
  motivo?: string;
  observacoes?: string;
}

export interface WaitlistSuccessResult {
  id_espera: string;
  id_lead: string;
  evento_nome: string;
  mensagem: string;
}

export type AgendaOtherCategory =
  | "VISITA"
  | "REUNIAO"
  | "LIGACAO"
  | "COMPROMISSO"
  | "OUTRO";

export interface AgendaCustomItem {
  id: string;
  titulo: string;
  categoria: AgendaOtherCategory;
  data: string; // YYYY-MM-DD
  hora_inicio?: string; // HH:mm
  hora_fim?: string; // HH:mm
  local?: string;
  lead_id?: string;
  lead_nome?: string;
  responsavel_nome?: string;
  descricao?: string;
  concluido: boolean;
  criado_em: string;
  atualizado_em?: string;
}

