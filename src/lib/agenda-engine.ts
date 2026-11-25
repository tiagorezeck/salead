import type {
  AgendaBlock,
  AgendaBooking,
  AgendaBookingStatus,
  AgendaEvent,
  AgendaFormField,
  AgendaFormResponse,
  AgendaSchedule,
  AgendaSlotAvailability,
  AgendaUnavailableReason,
  AgendaWaitlistEntry,
  BookingSubmissionPayload,
  BookingSuccessResult,
  WaitlistSubmissionPayload,
  WaitlistSuccessResult,
} from "@/types/agenda";
import {
  DEFAULT_LEAD_ROUTING_CONFIG,
  resolveLeadRoutingAssignment,
  type LeadRoutingConfig,
} from "@/lib/lead-rules";
import { DEFAULT_PIPELINES } from "@/data/mock";

const DAY_KEYS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SAB"] as const;

export const WEEKDAY_OPTIONS = [
  { id: "SEG", label: "Seg" },
  { id: "TER", label: "Ter" },
  { id: "QUA", label: "Qua" },
  { id: "QUI", label: "Qui" },
  { id: "SEX", label: "Sex" },
  { id: "SAB", label: "Sáb" },
  { id: "DOM", label: "Dom" },
];

export function formatDateBR(isoDate?: string): string {
  if (!isoDate) return "";
  const clean = String(isoDate).slice(0, 10);
  const parts = clean.split("-");
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function normalizeWhatsApp(phone?: string): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    return digits;
  }
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }
  return digits;
}

export function applyWhatsAppMask(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function isValidBRPhone(phone?: string): boolean {
  if (!phone) return false;
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    digits = digits.slice(2);
  }
  return digits.length === 10 || digits.length === 11;
}

export function sanitizeEmail(val: string): string {
  return val.trim().toLowerCase();
}

export function isValidEmail(email?: string): boolean {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function generateRandomCode(len = 4): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) {
    out += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return out;
}

export function slugifyText(text: string): string {
  return (text || "evento")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function buildWhatsAppLink(phone?: string, message?: string): string {
  const clean = normalizeWhatsApp(phone);
  if (!clean) {
    return message ? `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}` : "https://wa.me/";
  }
  return `https://wa.me/${clean}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
}

export function buildPublicAgendaPath(slug?: string, queryParams?: Record<string, string | undefined>): string {
  const basePath = slug ? `/agendar/${encodeURIComponent(slug)}` : "/agendar";
  if (!queryParams) return basePath;
  const search = new URLSearchParams();
  Object.entries(queryParams).forEach(([k, v]) => {
    if (v && String(v).trim().length > 0) {
      search.set(k, String(v).trim());
    }
  });
  const qs = search.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function buildGoogleCalendarTemplateLink(params: {
  title: string;
  description?: string;
  location?: string;
  date: string;
  startTime: string;
  endTime: string;
}): string {
  const d = params.date.replace(/-/g, "");
  const s = params.startTime.replace(/:/g, "") + "00";
  const e = params.endTime.replace(/:/g, "") + "00";
  const qs = new URLSearchParams({
    action: "TEMPLATE",
    text: params.title,
    dates: `${d}T${s}/${d}T${e}`,
    details: params.description || "",
    location: params.location || "",
  });
  return `https://calendar.google.com/calendar/render?${qs.toString()}`;
}

export function normalizeWeekdayList(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw
      .map((d) => String(d || "").trim().toUpperCase())
      .filter(Boolean);
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed
            .map((d) => String(d || "").trim().toUpperCase())
            .filter(Boolean);
        }
      } catch {}
    }
    return trimmed
      .split(",")
      .map((d) => d.trim().toUpperCase())
      .filter(Boolean);
  }
  return [];
}

function getLocalTodayIso(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getWeekdayKey(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return "SEG";
  const dt = new Date(y, m - 1, d);
  return DAY_KEYS[dt.getDay()] || "SEG";
}

export function getDefaultUnavailableMessage(reason?: AgendaUnavailableReason): string {
  if (reason === "ENCERRADO") {
    return "Este evento já foi encerrado. Cadastre-se na lista de espera para ser avisado sobre próximas turmas ou edições.";
  }
  if (reason === "LOTADO") {
    return "Todas as vagas disponíveis para este período foram preenchidas. Entre na lista de espera para receber aviso caso abra uma vaga.";
  }
  return "A agenda pública deste evento está temporariamente fechada. Cadastre seus dados na lista de espera para prioridade no atendimento.";
}

export function getEventSlotsForDate(
  db: {
    agendaEvents?: AgendaEvent[];
    agendaSchedules?: AgendaSchedule[];
    agendaBlocks?: AgendaBlock[];
    agendaBookings?: AgendaBooking[];
  },
  idEvento: string,
  isoDate: string
): AgendaSlotAvailability[] {
  const events = Array.isArray(db.agendaEvents) ? db.agendaEvents : [];
  const schedules = Array.isArray(db.agendaSchedules) ? db.agendaSchedules : [];
  const blocks = Array.isArray(db.agendaBlocks) ? db.agendaBlocks : [];
  const bookings = Array.isArray(db.agendaBookings) ? db.agendaBookings : [];

  const evento = events.find((e) => e.id_evento === idEvento);
  if (!evento) return [];

  const weekday = getWeekdayKey(isoDate);
  const eventDays = normalizeWeekdayList(evento.dias_semana);
  if (eventDays.length > 0 && !eventDays.includes(weekday)) {
    return [];
  }

  const eventSchedules = schedules
    .filter((s) => {
      if (s.id_evento !== idEvento || s.ativo === false) return false;
      const slotDays = normalizeWeekdayList(s.dias_aplicaveis);
      if (slotDays.length > 0) {
        // Se dias_aplicaveis não possui nenhuma interseção com dias_semana do evento
        // (bug legado quando o usuário alterou dias da semana após abrir o modal),
        // herda automaticamente os dias_semana do evento.
        if (eventDays.length > 0 && !slotDays.some((d) => eventDays.includes(d))) {
          return true;
        }
        return slotDays.includes(weekday);
      }
      return true;
    })
    .sort((a, b) => String(a.hora_inicio || "").localeCompare(String(b.hora_inicio || "")));

  const dayAllBlock = blocks.find(
    (b) =>
      (b.id_evento === "*" || b.id_evento === idEvento) &&
      b.data === isoDate &&
      b.hora_inicio === "ALL_DAY"
  );

  const now = new Date();
  const todayIso = getLocalTodayIso(now);

  return eventSchedules.map((slot) => {
    const slotBlock =
      dayAllBlock ||
      blocks.find(
        (b) =>
          (b.id_evento === "*" || b.id_evento === idEvento) &&
          b.data === isoDate &&
          b.hora_inicio === slot.hora_inicio
      );

    const confirmedCount = bookings.filter(
      (b) =>
        b.id_evento === idEvento &&
        b.data_agendamento === isoDate &&
        b.hora_inicio === slot.hora_inicio &&
        b.status !== "CANCELADO"
    ).length;

    const capacity = Number(slot.capacidade || evento.capacidade_padrao || 1);
    const remaining = Math.max(0, capacity - confirmedCount);

    let isPastSlot = false;
    if (isoDate < todayIso) {
      isPastSlot = true;
    } else if (isoDate === todayIso) {
      const [sh, sm] = String(slot.hora_inicio || "00:00").split(":").map(Number);
      const slotMinutes = (sh || 0) * 60 + (sm || 0);
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      if (slotMinutes <= currentMinutes + 15) {
        isPastSlot = true;
      }
    }

    const blocked = Boolean(slotBlock || isPastSlot);
    const reason = slotBlock?.motivo || (isPastSlot ? "Horário já encerrado" : undefined);

    return {
      id_horario: slot.id_horario,
      data: isoDate,
      hora_inicio: slot.hora_inicio,
      hora_fim: slot.hora_fim,
      capacidade_total: capacity,
      agendamentos_confirmados: confirmedCount,
      bloqueado: blocked,
      motivo_bloqueio: reason,
      vagas_restantes: blocked ? 0 : remaining,
      disponivel: !blocked && remaining > 0,
    };
  });
}

export function getEventUpcomingDates(
  db: {
    agendaEvents?: AgendaEvent[];
    agendaSchedules?: AgendaSchedule[];
    agendaBlocks?: AgendaBlock[];
    agendaBookings?: AgendaBooking[];
  },
  evento: AgendaEvent
): Array<{ dataIso: string; diaSemana: string; rotulo: string; vagasDia: number }> {
  const rawMaxDays = Math.min(Math.max(Number(evento.dias_antecedencia_max || 30), 1), 120);
  const eventDays = normalizeWeekdayList(evento.dias_semana);
  const base = new Date();
  const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  const scanDates = (daysLimit: number) => {
    const out: Array<{ dataIso: string; diaSemana: string; rotulo: string; vagasDia: number }> = [];
    for (let i = 0; i < daysLimit; i++) {
      const dt = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
      const yyyy = dt.getFullYear();
      const mm = String(dt.getMonth() + 1).padStart(2, "0");
      const dd = String(dt.getDate()).padStart(2, "0");
      const dataIso = `${yyyy}-${mm}-${dd}`;
      const weekday = DAY_KEYS[dt.getDay()];

      if (eventDays.length > 0 && !eventDays.includes(weekday)) {
        continue;
      }

      const slots = getEventSlotsForDate(db, evento.id_evento, dataIso);
      if (slots.length === 0) continue;

      const vagasDia = slots.reduce((sum, s) => sum + (s.disponivel ? s.vagas_restantes : 0), 0);
      out.push({
        dataIso,
        diaSemana: weekday,
        rotulo: `${dd} ${monthNames[dt.getMonth()]}`,
        vagasDia,
      });
    }
    return out;
  };

  let out = scanDates(rawMaxDays);
  // Se janela curta (< 7 dias, ex: usuário configurou 1 dia para um evento de sábado) não alcança o próximo dia da semana escolhido,
  // garante alcance mínimo de 7 dias para exibir pelo menos a próxima ocorrência válida.
  if (out.length === 0 && rawMaxDays < 7) {
    out = scanDates(7);
  }

  return out;
}

export function getEventAvailabilitySummary(
  db: {
    agendaEvents?: AgendaEvent[];
    agendaSchedules?: AgendaSchedule[];
    agendaBlocks?: AgendaBlock[];
    agendaBookings?: AgendaBooking[];
  },
  evento: AgendaEvent
): {
  disponivel: boolean;
  motivo: AgendaUnavailableReason;
  mensagem: string;
  vagasTotais: number;
  proximoDia?: { dataIso: string; rotulo: string };
} {
  if (evento.status === "ENCERRADO") {
    return {
      disponivel: false,
      motivo: "ENCERRADO",
      mensagem: evento.mensagem_indisponivel || getDefaultUnavailableMessage("ENCERRADO"),
      vagasTotais: 0,
    };
  }

  if (evento.status === "PAUSADO" || evento.status === "RASCUNHO" || evento.agenda_publica_ativa === false) {
    const motivo = evento.motivo_indisponivel || "AGENDA_FECHADA";
    return {
      disponivel: false,
      motivo,
      mensagem: evento.mensagem_indisponivel || getDefaultUnavailableMessage(motivo),
      vagasTotais: 0,
    };
  }

  const dates = getEventUpcomingDates(db, evento);
  const vagasTotais = dates.reduce((acc, d) => acc + d.vagasDia, 0);
  const firstOpen = dates.find((d) => d.vagasDia > 0);

  if (!firstOpen || vagasTotais <= 0) {
    const reason: AgendaUnavailableReason = dates.length > 0 ? "LOTADO" : "AGENDA_FECHADA";
    return {
      disponivel: false,
      motivo: reason,
      mensagem: evento.mensagem_indisponivel || getDefaultUnavailableMessage(reason),
      vagasTotais: 0,
    };
  }

  return {
    disponivel: true,
    motivo: "AGENDA_FECHADA",
    mensagem: "",
    vagasTotais,
    proximoDia: { dataIso: firstOpen.dataIso, rotulo: firstOpen.rotulo },
  };
}

function resolveBookingLeadOwnerAndPipeline(draft: any): {
  pipelineId: string;
  stage: string;
  owner: string;
  nextRoutingIndex?: number;
  nextRoleCursors?: Record<string, number>;
} {
  const rawPipelines: any[] = Array.isArray(draft.pipelines) && draft.pipelines.length > 0
    ? draft.pipelines
    : DEFAULT_PIPELINES;
  const pipelines: any[] = DEFAULT_PIPELINES.map((def) => {
    const found = rawPipelines.find((p: any) => p.id === def.id);
    return found ? { ...def, ...found } : { ...def };
  });
  rawPipelines.forEach((p: any) => {
    if (p?.id && !pipelines.some((m) => m.id === p.id)) pipelines.push(p);
  });

  const users: any[] = Array.isArray(draft.users) ? draft.users : [];
  const leads: any[] = Array.isArray(draft.leads) ? draft.leads : [];
  const rawRouting: LeadRoutingConfig = draft.leadRoutingConfig || DEFAULT_LEAD_ROUTING_CONFIG;

  // Para agendamentos de eventos públicos (reunião marcada), o destino comercial natural é SDR
  // caso a regra global esteja apontada para LDR/BDR/prospecção fria ou vazia.
  const sdrPipe =
    pipelines.find((p) => p.id === "sdr") ||
    pipelines.find((p) => String(p.functionRole || "").toUpperCase() === "SDR");
  const isColdOrUnsetTarget =
    rawRouting.targetRole === "LDR" ||
    rawRouting.targetRole === "BDR" ||
    rawRouting.targetRole === "Qualquer" ||
    !rawRouting.targetRole ||
    rawRouting.targetPipelineId === "prospection";

  const bookingRouting: LeadRoutingConfig =
    rawRouting.routingMode === "temperature_rules"
      ? rawRouting
      : isColdOrUnsetTarget
      ? {
          ...rawRouting,
          routingMode: "single_role",
          targetRole: "SDR",
          targetPipelineId: sdrPipe?.id || "sdr",
          targetStage:
            sdrPipe?.stages?.find((s: any) => {
              const nm = String(s?.name || "").toLowerCase();
              return nm.includes("reuni") || nm.includes("agend");
            })?.name ||
            sdrPipe?.stages?.[0]?.name ||
            "Agendamento de Reunião",
        }
      : rawRouting;

  const resolved = resolveLeadRoutingAssignment({
    config: bookingRouting,
    leadData: { temperature: "Quente" },
    pipelines,
    users,
    existingLeads: leads,
  });

  const targetPipeline =
    pipelines.find((p) => p.id === resolved.targetPipelineId) ||
    sdrPipe ||
    pipelines.find((p) => p.active !== false) ||
    pipelines[0];

  const pipelineId = targetPipeline?.id || resolved.targetPipelineId || "sdr";
  const stages: any[] = Array.isArray(targetPipeline?.stages) ? targetPipeline.stages : [];
  const meetingStage = stages.find((s) => {
    const name = String(s?.name || "").toLowerCase();
    return name.includes("reuni") || name.includes("agend");
  });

  const stage = meetingStage?.name || resolved.targetStage || stages[0]?.name || "Agendamento de Reunião";

  return {
    pipelineId,
    stage,
    owner: resolved.assignedOwner,
    nextRoutingIndex: resolved.nextLastAssignedIndex,
    nextRoleCursors: resolved.nextRoleCursors,
  };
}

/**
 * Executa toda a automação confirmada no CRM do Salead quando um visitante conclui um agendamento público:
 * 1. Valida anti-overbooking na grade do evento
 * 2. Cria ou atualiza o Lead no CRM do Salead (com regras de roteamento SDR/Vendedor + estágio Reunião)
 * 3. Registra o Agendamento (agendaBookings) + metadados da reunião no cartão do Lead
 * 4. Cria uma Tarefa pendente para o responsável na aba Tarefas
 */
export function applyPublicBookingToDraft(
  draft: any,
  payload: BookingSubmissionPayload
): BookingSuccessResult {
  const events: AgendaEvent[] = Array.isArray(draft.agendaEvents) ? draft.agendaEvents : [];
  const bookings: AgendaBooking[] = Array.isArray(draft.agendaBookings) ? draft.agendaBookings : [];
  const fields: AgendaFormField[] = Array.isArray(draft.agendaFormFields) ? draft.agendaFormFields : [];
  const responses: AgendaFormResponse[] = Array.isArray(draft.agendaFormResponses) ? draft.agendaFormResponses : [];
  const leads: any[] = Array.isArray(draft.leads) ? draft.leads : [];
  const tasks: any[] = Array.isArray(draft.tasks) ? draft.tasks : [];
  const products: any[] = Array.isArray(draft.products) ? draft.products : [];

  const targetSlug = (payload.slug_evento || "").trim().toLowerCase();
  const evento = events.find(
    (e) => e.slug.toLowerCase() === targetSlug || e.id_evento.toLowerCase() === targetSlug
  );

  if (!evento) {
    throw new Error("Evento não encontrado para agendamento.");
  }

  const summary = getEventAvailabilitySummary(draft, evento);
  if (!summary.disponivel) {
    throw new Error(summary.mensagem || "Este evento não está aceitando agendamentos no momento.");
  }

  const slots = getEventSlotsForDate(draft, evento.id_evento, payload.data);
  const targetSlot = slots.find((s) => s.hora_inicio === payload.hora_inicio);
  if (!targetSlot || !targetSlot.disponivel || targetSlot.vagas_restantes <= 0) {
    throw new Error("Este horário acabou de preencher todas as vagas. Selecione outro horário disponível.");
  }

  const nowIso = new Date().toISOString();
  const ym = nowIso.slice(0, 7).replace("-", "");
  const idAgendamento = `AGD-${ym}-${generateRandomCode(4)}`;
  const protocolo = `PROT-${ym}-${generateRandomCode(4)}`;

  const cleanPhone = (payload.whatsapp || "").replace(/\D/g, "");
  const normEmail = sanitizeEmail(payload.email || "");

  // 1. Buscar lead existente por E-mail ou WhatsApp
  const existingLeadIdx = leads.findIndex((l) => {
    if (!l) return false;
    const lEmail = sanitizeEmail(l.email || "");
    const lPhone = (l.whatsapp || "").replace(/\D/g, "");
    if (normEmail && lEmail && lEmail === normEmail) return true;
    if (cleanPhone.length >= 8 && lPhone.length >= 8) {
      if (lPhone === cleanPhone || lPhone.slice(-8) === cleanPhone.slice(-8)) return true;
    }
    return false;
  });

  const linkedProduct = evento.product_id
    ? products.find((p) => p.id === evento.product_id)
    : undefined;

  const routingResolved = resolveBookingLeadOwnerAndPipeline(draft);
  if (draft.leadRoutingConfig) {
    draft.leadRoutingConfig = {
      ...draft.leadRoutingConfig,
      ...(typeof routingResolved.nextRoutingIndex === "number"
        ? { lastAssignedIndex: routingResolved.nextRoutingIndex }
        : {}),
      ...(routingResolved.nextRoleCursors
        ? { roleCursors: routingResolved.nextRoleCursors }
        : {}),
    };
  }

  // Montar texto das respostas personalizadas
  const customLines: string[] = [];
  const customResponsesEntities: AgendaFormResponse[] = [];
  Object.entries(payload.respostas_customizadas || {}).forEach(([fieldId, val]) => {
    if (!String(val || "").trim()) return;
    const fieldDef = fields.find((f) => f.id_campo === fieldId);
    const label = fieldDef?.label || fieldId;
    customLines.push(`${label}: ${val}`);
    customResponsesEntities.push({
      id_resposta: `RSP-${generateRandomCode(6)}`,
      id_agendamento: idAgendamento,
      id_lead: existingLeadIdx >= 0 ? leads[existingLeadIdx].id : "",
      id_campo: fieldId,
      label,
      valor: String(val),
      criado_em: nowIso,
    });
  });

  const sourceTag = payload.utms?.utm_source || payload.utms?.src || "Agenda Pública";
  const calendarLink = buildGoogleCalendarTemplateLink({
    title: `${evento.nome} — ${payload.nome}`,
    description: `Protocolo: ${protocolo}\nParticipante: ${payload.nome}\nWhatsApp: ${payload.whatsapp}\n${customLines.join("\n")}`,
    location: payload.local || evento.local_evento || "Online",
    date: payload.data,
    startTime: payload.hora_inicio,
    endTime: payload.hora_fim || targetSlot.hora_fim,
  });

  let leadId = "";
  let ownerName = routingResolved.owner;

  if (existingLeadIdx >= 0) {
    const prevLead = leads[existingLeadIdx];
    leadId = prevLead.id;
    const prevOwnerClean = String(prevLead.owner || "").trim();
    const isGenericOwner =
      !prevOwnerClean ||
      prevOwnerClean === "Sem dono" ||
      prevOwnerClean === "Sem responsável" ||
      prevOwnerClean === "Inbound LP" ||
      prevOwnerClean === "Não atribuído";
    const isMovingFromProspection = !prevLead.pipelineId || prevLead.pipelineId === "prospection";

    ownerName =
      !isGenericOwner && !isMovingFromProspection
        ? prevLead.owner
        : routingResolved.owner && routingResolved.owner !== "Sem responsável"
        ? routingResolved.owner
        : prevOwnerClean || routingResolved.owner;

    const meetingRecord = {
      googleEventId: protocolo,
      title: `${evento.nome} (${protocolo})`,
      description: [
        payload.local ? `Local informado: ${payload.local}` : "",
        ...customLines,
      ]
        .filter(Boolean)
        .join("\n"),
      date: payload.data,
      startTime: payload.hora_inicio,
      endTime: payload.hora_fim || targetSlot.hora_fim,
      location: payload.local || evento.local_evento || "Online",
      attendees: [normEmail].filter(Boolean),
      calendarLink,
      responsibleUser: ownerName,
      createdAt: nowIso,
      status: "confirmed" as const,
      protocolo,
      bookingId: idAgendamento,
      eventId: evento.id_evento,
      eventName: evento.nome,
      eventSlug: evento.slug,
    };

    const newActivity = {
      id: `act_agd_${Date.now()}`,
      type: "meeting",
      description: `AGENDAMENTO PÚBLICO CONFIRMADO (${protocolo})\nEvento: ${evento.nome}\nData: ${formatDateBR(payload.data)} às ${payload.hora_inicio} - ${payload.hora_fim || targetSlot.hora_fim}${
        payload.local ? `\nLocal: ${payload.local}` : ""
      }${customLines.length ? `\n\nRespostas:\n${customLines.join("\n")}` : ""}`,
      timestamp: nowIso,
      user: ownerName,
      metadata: { calendarEvent: meetingRecord },
    };

    const existingTags = Array.isArray(prevLead.tags) ? prevLead.tags : [];
    const nextTags = Array.from(new Set([...existingTags, "agendado", evento.slug, sourceTag].filter(Boolean)));

    const isWon = prevLead.stage === "Ganho" || prevLead.stage === "Recebimento";

    leads[existingLeadIdx] = {
      ...prevLead,
      name: payload.nome.trim() || prevLead.name,
      whatsapp: payload.whatsapp.trim() || prevLead.whatsapp,
      email: normEmail || prevLead.email,
      company: payload.empresa?.trim() || prevLead.company,
      pipelineId: isWon ? prevLead.pipelineId : routingResolved.pipelineId,
      stage: isWon ? prevLead.stage : routingResolved.stage,
      owner: ownerName,
      temperature: "Quente",
      productId: prevLead.productId || linkedProduct?.id,
      value: Number(prevLead.value || 0) || Number(linkedProduct?.salePrice || 0),
      tags: nextTags,
      lastInteraction: `Agendou ${evento.nome} (${formatDateBR(payload.data)} ${payload.hora_inicio})`,
      activities: [newActivity, ...(Array.isArray(prevLead.activities) ? prevLead.activities : [])],
      metadata: {
        ...(prevLead.metadata || {}),
        calendarEvent: meetingRecord,
        lastBookingProtocol: protocolo,
        eventId: evento.id_evento,
        eventName: evento.nome,
        eventSlug: evento.slug,
      },
    };
  } else {
    leadId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `lead_agd_${Date.now()}_${generateRandomCode(4)}`;

    const meetingRecord = {
      googleEventId: protocolo,
      title: `${evento.nome} (${protocolo})`,
      description: [
        payload.local ? `Local informado: ${payload.local}` : "",
        ...customLines,
      ]
        .filter(Boolean)
        .join("\n"),
      date: payload.data,
      startTime: payload.hora_inicio,
      endTime: payload.hora_fim || targetSlot.hora_fim,
      location: payload.local || evento.local_evento || "Online",
      attendees: [normEmail].filter(Boolean),
      calendarLink,
      responsibleUser: ownerName,
      createdAt: nowIso,
      status: "confirmed" as const,
      protocolo,
      bookingId: idAgendamento,
    };

    const newLead = {
      id: leadId,
      name: payload.nome.trim(),
      company: payload.empresa?.trim() || payload.local?.trim() || evento.nome,
      email: normEmail,
      whatsapp: payload.whatsapp.trim(),
      value: Number(linkedProduct?.salePrice || 0),
      stage: routingResolved.stage,
      pipelineId: routingResolved.pipelineId,
      owner: ownerName,
      source: payload.lp_title ? `LP: ${payload.lp_title} -> Agenda (${evento.nome})` : `Agenda Pública: ${evento.nome} (${sourceTag})`,
      classification: "Lead",
      temperature: "Quente",
      type: "Inbound",
      strategy: "Agendamento Direto",
      decisionRole: "Decisor",
      minScore: "Aprovado",
      landingPage: payload.lp_title || evento.nome,
      productId: linkedProduct?.id,
      tags: ["agendado", evento.slug, sourceTag, payload.utms?.utm_campaign || ""].filter(Boolean),
      score: 90,
      sla: "ok",
      status: "Ativo",
      lastInteraction: `Agendou ${evento.nome} (${formatDateBR(payload.data)} ${payload.hora_inicio})`,
      createdAt: nowIso,
      activities: [
        {
          id: `act_agd_${Date.now()}`,
          type: "meeting",
          description: `AGENDAMENTO PÚBLICO CONFIRMADO (${protocolo})\nEvento: ${evento.nome}\nData: ${formatDateBR(payload.data)} às ${payload.hora_inicio} - ${payload.hora_fim || targetSlot.hora_fim}${
            payload.local ? `\nLocal: ${payload.local}` : ""
          }${customLines.length ? `\n\nRespostas:\n${customLines.join("\n")}` : ""}`,
          timestamp: nowIso,
          user: ownerName,
          metadata: { calendarEvent: meetingRecord },
        },
      ],
      completedCheckpoints: [],
      lpVisits: 1,
      metadata: {
        calendarEvent: meetingRecord,
        lastBookingProtocol: protocolo,
        eventId: evento.id_evento,
        eventName: evento.nome,
        eventSlug: evento.slug,
        utms: payload.utms || {},
        local: payload.local || "",
        customAnswers: payload.respostas_customizadas || {},
      },
    };

    leads.unshift(newLead);
  }

  // Vincular id_lead nas respostas
  customResponsesEntities.forEach((r) => {
    r.id_lead = leadId;
  });

  // 2. Criar registro unificado em agendaBookings
  const newBooking: AgendaBooking = {
    id_agendamento: idAgendamento,
    protocolo,
    id_evento: evento.id_evento,
    evento_nome: evento.nome,
    id_lead: leadId,
    lead_nome: payload.nome.trim(),
    lead_whatsapp: payload.whatsapp.trim(),
    lead_email: normEmail,
    lead_local: payload.local?.trim() || evento.local_evento,
    responsavel_nome: ownerName,
    data_agendamento: payload.data,
    hora_inicio: payload.hora_inicio,
    hora_fim: payload.hora_fim || targetSlot.hora_fim,
    status: "CONFIRMADO",
    origem: "PUBLICO",
    calendar_link: calendarLink,
    observacoes: customLines.join(" | "),
    lp_id: payload.lp_id,
    criado_em: nowIso,
    atualizado_em: nowIso,
  };

  // 3. Criar Tarefa Pendente na aba Tarefas do Minha Agenda
  const idTask = `task_agd_${idAgendamento}`;
  const newTask = {
    id: idTask,
    title: `Reunião: ${evento.nome} (${payload.hora_inicio})`,
    lead: payload.nome.trim(),
    leadId,
    owners: [ownerName],
    due: payload.data,
    dueDate: payload.data,
    priority: "alta",
    done: false,
    createdAt: nowIso,
    subtasks: [
      { id: `st_${Date.now()}_1`, title: `Confirmar presença via WhatsApp (${payload.whatsapp})`, done: false },
      { id: `st_${Date.now()}_2`, title: `Protocolo ${protocolo} — ${formatDateBR(payload.data)} às ${payload.hora_inicio}`, done: false },
    ],
  };

  // Incrementar contagem de leads da LP caso tenha vindo de uma LP
  if (payload.lp_id && Array.isArray(draft.landingPages)) {
    draft.landingPages = draft.landingPages.map((lp: any) => {
      if (lp && (lp.id === payload.lp_id || lp.slug === payload.lp_id)) {
        const nextLeads = Number(lp.leads || lp.leadsCount || 0) + 1;
        return { ...lp, leads: nextLeads, leadsCount: nextLeads };
      }
      return lp;
    });
  }

  draft.leads = leads;
  draft.agendaBookings = [newBooking, ...bookings];
  draft.agendaFormResponses = [...customResponsesEntities, ...responses];
  draft.tasks = [newTask, ...tasks.filter((t) => t.id !== idTask)];

  return {
    protocolo,
    id_agendamento: idAgendamento,
    id_lead: leadId,
    id_task: idTask,
    evento_nome: evento.nome,
    data: payload.data,
    hora_inicio: payload.hora_inicio,
    hora_fim: payload.hora_fim || targetSlot.hora_fim,
    responsavel_nome: ownerName,
    mensagem_confirmacao:
      evento.mensagem_confirmacao ||
      "Seu agendamento foi confirmado com sucesso! Nossa equipe entrará em contato.",
  };
}

export function applyWaitlistToDraft(
  draft: any,
  payload: WaitlistSubmissionPayload
): WaitlistSuccessResult {
  const events: AgendaEvent[] = Array.isArray(draft.agendaEvents) ? draft.agendaEvents : [];
  const waitlist: AgendaWaitlistEntry[] = Array.isArray(draft.agendaWaitlist) ? draft.agendaWaitlist : [];
  const leads: any[] = Array.isArray(draft.leads) ? draft.leads : [];
  const tasks: any[] = Array.isArray(draft.tasks) ? draft.tasks : [];

  const targetSlug = (payload.slug_evento || "").trim().toLowerCase();
  const evento = events.find(
    (e) => e.slug.toLowerCase() === targetSlug || e.id_evento.toLowerCase() === targetSlug
  );
  if (!evento) {
    throw new Error("Evento não encontrado para cadastro na lista de espera.");
  }

  const nowIso = new Date().toISOString();
  const cleanPhone = (payload.whatsapp || "").replace(/\D/g, "");
  const normEmail = sanitizeEmail(payload.email || "");

  const existingIdx = leads.findIndex((l) => {
    if (!l) return false;
    const lEmail = sanitizeEmail(l.email || "");
    const lPhone = (l.whatsapp || "").replace(/\D/g, "");
    if (normEmail && lEmail && lEmail === normEmail) return true;
    if (cleanPhone.length >= 8 && lPhone.length >= 8 && (lPhone === cleanPhone || lPhone.slice(-8) === cleanPhone.slice(-8))) return true;
    return false;
  });

  const routingResolved = resolveBookingLeadOwnerAndPipeline(draft);
  let leadId = "";
  let ownerName = routingResolved.owner;

  if (existingIdx >= 0) {
    const prevLead = leads[existingIdx];
    leadId = prevLead.id;
    const prevOwnerClean = String(prevLead.owner || "").trim();
    const isGenericOwner =
      !prevOwnerClean ||
      prevOwnerClean === "Sem dono" ||
      prevOwnerClean === "Sem responsável" ||
      prevOwnerClean === "Inbound LP";
    ownerName = isGenericOwner ? ownerName : prevLead.owner;
    const prevTags = Array.isArray(prevLead.tags) ? prevLead.tags : [];
    const isWon = prevLead.stage === "Ganho" || prevLead.stage === "Recebimento";
    leads[existingIdx] = {
      ...prevLead,
      pipelineId: isWon ? prevLead.pipelineId : (prevLead.pipelineId || routingResolved.pipelineId),
      stage: isWon ? prevLead.stage : (prevLead.pipelineId === "prospection" || !prevLead.pipelineId ? routingResolved.stage : prevLead.stage),
      owner: ownerName,
      tags: Array.from(new Set([...prevTags, "lista-espera", evento.slug])),
      lastInteraction: `Entrou na lista de espera de ${evento.nome}`,
      metadata: {
        ...(prevLead.metadata || {}),
        eventId: evento.id_evento,
        eventName: evento.nome,
        eventSlug: evento.slug,
      },
      activities: [
        {
          id: `act_wl_${Date.now()}`,
          type: "note",
          description: `LISTA DE ESPERA (${evento.nome}): ${payload.observacoes || "Solicitou aviso quando abrir vaga."}`,
          timestamp: nowIso,
          user: ownerName,
        },
        ...(Array.isArray(prevLead.activities) ? prevLead.activities : []),
      ],
    };
  } else {
    leadId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `lead_wl_${Date.now()}_${generateRandomCode(4)}`;

    leads.unshift({
      id: leadId,
      name: payload.nome.trim(),
      company: payload.local?.trim() || evento.nome,
      email: normEmail,
      whatsapp: payload.whatsapp.trim(),
      value: 0,
      stage: routingResolved.stage,
      pipelineId: routingResolved.pipelineId,
      owner: ownerName,
      source: `Lista de Espera: ${evento.nome}`,
      classification: "Lead",
      temperature: "Morno",
      type: "Inbound",
      status: "Ativo",
      tags: ["lista-espera", evento.slug],
      lastInteraction: `Entrou na lista de espera (${evento.nome})`,
      createdAt: nowIso,
      metadata: {
        eventId: evento.id_evento,
        eventName: evento.nome,
        eventSlug: evento.slug,
      },
      activities: [
        {
          id: `act_wl_${Date.now()}`,
          type: "note",
          description: `Cadastro na lista de espera para ${evento.nome}. ${payload.observacoes || ""}`,
          timestamp: nowIso,
          user: ownerName,
        },
      ],
      completedCheckpoints: [],
    });
  }

  const entry: AgendaWaitlistEntry = {
    id_espera: `WLT-${generateRandomCode(6)}`,
    id_evento: evento.id_evento,
    evento_nome: evento.nome,
    id_lead: leadId,
    nome: payload.nome.trim(),
    whatsapp: payload.whatsapp.trim(),
    email: normEmail,
    local: payload.local?.trim(),
    aluno_ganhador: payload.aluno_ganhador?.trim(),
    motivo: payload.motivo,
    observacoes: payload.observacoes?.trim(),
    criado_em: nowIso,
  };

  const idTask = `task_wl_${entry.id_espera}`;
  tasks.unshift({
    id: idTask,
    title: `Contato Lista de Espera: ${evento.nome}`,
    lead: payload.nome.trim(),
    leadId,
    owners: [ownerName],
    due: nowIso.slice(0, 10),
    dueDate: nowIso.slice(0, 10),
    priority: "media",
    done: false,
    createdAt: nowIso,
    subtasks: [],
  });

  draft.leads = leads;
  draft.agendaWaitlist = [entry, ...waitlist];
  draft.tasks = tasks;

  return {
    id_espera: entry.id_espera,
    id_lead: leadId,
    evento_nome: evento.nome,
    mensagem: "Cadastro realizado na lista de espera! Você será avisado assim que novas vagas forem liberadas.",
  };
}

export function findBookingByProtocol(
  db: {
    agendaBookings?: AgendaBooking[];
    agendaEvents?: AgendaEvent[];
    leads?: any[];
  },
  protocolo: string,
  contatoVerificacao: string
): { agendamento: AgendaBooking; evento: AgendaEvent | null; lead: any | null } {
  const protClean = protocolo.trim().toUpperCase();
  const contatoClean = contatoVerificacao.trim().toLowerCase();
  const contatoDigits = normalizeWhatsApp(contatoClean);

  const bookings = Array.isArray(db.agendaBookings) ? db.agendaBookings : [];
  const events = Array.isArray(db.agendaEvents) ? db.agendaEvents : [];
  const leads = Array.isArray(db.leads) ? db.leads : [];

  const agd = bookings.find((b) => b.protocolo.toUpperCase() === protClean);
  if (!agd) {
    throw new Error("Protocolo não encontrado. Confira o código do seu comprovante.");
  }

  const lead = leads.find((l) => l.id === agd.id_lead) || null;
  const evento = events.find((e) => e.id_evento === agd.id_evento) || null;

  const phoneCandidates = [agd.lead_whatsapp, lead?.whatsapp].map(normalizeWhatsApp).filter(Boolean);
  const emailCandidates = [agd.lead_email, lead?.email].map((x) => String(x || "").trim().toLowerCase()).filter(Boolean);

  const matchZap =
    Boolean(contatoDigits) &&
    phoneCandidates.some((d) => d === contatoDigits || d.slice(-8) === contatoDigits.slice(-8));
  const matchEmail = Boolean(contatoClean) && emailCandidates.includes(contatoClean);

  if (!matchZap && !matchEmail) {
    throw new Error("O WhatsApp ou e-mail informado não confere com este código de protocolo.");
  }

  return { agendamento: agd, evento, lead };
}

export function applyBookingStatusUpdateToDraft(
  draft: any,
  idAgendamento: string,
  novoStatus: AgendaBookingStatus,
  motivo?: string
) {
  const nowIso = new Date().toISOString();
  const bookings: AgendaBooking[] = Array.isArray(draft.agendaBookings) ? draft.agendaBookings : [];
  const target = bookings.find((b) => b.id_agendamento === idAgendamento);
  if (!target) return;

  target.status = novoStatus;
  target.atualizado_em = nowIso;
  if (novoStatus === "CANCELADO") {
    target.motivo_cancelamento = motivo || "Cancelado";
    target.cancelado_em = nowIso;
  } else {
    target.motivo_cancelamento = undefined;
    target.cancelado_em = undefined;
  }

  // Sincronizar tarefa associada se concluído ou cancelado
  if (Array.isArray(draft.tasks)) {
    const taskId = `task_agd_${idAgendamento}`;
    draft.tasks = draft.tasks.map((t: any) => {
      if (t.id === taskId) {
        if (novoStatus === "REALIZADO") {
          return { ...t, done: true, completedAt: nowIso };
        }
        if (novoStatus === "CANCELADO") {
          return { ...t, done: true, title: `[CANCELADO] ${t.title.replace(/^\[CANCELADO\]\s*/i, "")}`, completedAt: nowIso };
        }
      }
      return t;
    });
  }

  // Sincronizar status no metadata do Lead vinculado
  if (Array.isArray(draft.leads) && target.id_lead) {
    draft.leads = draft.leads.map((l: any) => {
      if (l.id !== target.id_lead) return l;
      const prevCal = l.metadata?.calendarEvent;
      return {
        ...l,
        metadata: {
          ...(l.metadata || {}),
          ...(prevCal
            ? {
                calendarEvent: {
                  ...prevCal,
                  status: novoStatus === "CANCELADO" ? "cancelled" : "confirmed",
                },
              }
            : {}),
        },
        activities: [
          {
            id: `act_st_${Date.now()}`,
            type: "meeting",
            description: `Status do agendamento ${target.protocolo} atualizado para ${novoStatus}.${motivo ? ` Motivo: ${motivo}` : ""}`,
            timestamp: nowIso,
            user: target.responsavel_nome || "Sistema",
          },
          ...(Array.isArray(l.activities) ? l.activities : []),
        ],
      };
    });
  }
}

export function applyBookingRescheduleToDraft(
  draft: any,
  idAgendamento: string,
  novaData: string,
  novaHoraInicio: string,
  novaHoraFim: string
): AgendaBooking {
  const bookings: AgendaBooking[] = Array.isArray(draft.agendaBookings) ? draft.agendaBookings : [];
  const target = bookings.find((b) => b.id_agendamento === idAgendamento);
  if (!target) {
    throw new Error("Agendamento não encontrado.");
  }

  if (target.id_evento && target.id_evento !== "CRM-MANUAL") {
    const slots = getEventSlotsForDate(draft, target.id_evento, novaData);
    const slot = slots.find((s) => s.hora_inicio === novaHoraInicio);
    if (!slot || !slot.disponivel) {
      throw new Error("O novo horário selecionado não possui vagas disponíveis.");
    }
  }

  const nowIso = new Date().toISOString();
  const oldLabel = `${formatDateBR(target.data_agendamento)} ${target.hora_inicio}`;
  target.data_agendamento = novaData;
  target.hora_inicio = novaHoraInicio;
  target.hora_fim = novaHoraFim;
  target.status = "CONFIRMADO";
  target.atualizado_em = nowIso;

  if (Array.isArray(draft.tasks)) {
    const taskId = `task_agd_${idAgendamento}`;
    draft.tasks = draft.tasks.map((t: any) =>
      t.id === taskId
        ? {
            ...t,
            due: novaData,
            dueDate: novaData,
            done: false,
            title: `Reunião: ${target.evento_nome || "Evento"} (${novaHoraInicio})`,
          }
        : t
    );
  }

  if (Array.isArray(draft.leads) && target.id_lead) {
    draft.leads = draft.leads.map((l: any) => {
      if (l.id !== target.id_lead) return l;
      const prevCal = l.metadata?.calendarEvent || {};
      return {
        ...l,
        metadata: {
          ...(l.metadata || {}),
          calendarEvent: {
            ...prevCal,
            date: novaData,
            startTime: novaHoraInicio,
            endTime: novaHoraFim,
            status: "confirmed",
          },
        },
        activities: [
          {
            id: `act_resch_${Date.now()}`,
            type: "meeting",
            description: `Reagendamento (${target.protocolo}): alterado de ${oldLabel} para ${formatDateBR(novaData)} às ${novaHoraInicio}.`,
            timestamp: nowIso,
            user: target.responsavel_nome || "Sistema",
          },
          ...(Array.isArray(l.activities) ? l.activities : []),
        ],
      };
    });
  }

  return target;
}

/**
 * Sincroniza reuniões criadas/editadas manualmente no CRM (ScheduleModal)
 * diretamente para a coleção unificada agendaBookings e para Tarefas em Minha Agenda.
 */
export function syncManualCrmMeetingToDraft(
  draft: any,
  lead: { id: string; name: string; whatsapp?: string; email?: string; owner?: string },
  record: {
    googleEventId: string;
    title: string;
    description?: string;
    date: string;
    startTime: string;
    endTime: string;
    location?: string;
    meetLink?: string;
    calendarLink?: string;
    responsibleUser?: string;
    status?: "confirmed" | "cancelled";
  },
  isCancelled = false
) {
  const nowIso = new Date().toISOString();
  const bookings: AgendaBooking[] = Array.isArray(draft.agendaBookings) ? draft.agendaBookings : [];
  const tasks: any[] = Array.isArray(draft.tasks) ? draft.tasks : [];

  const manualBookingId = `AGD-CRM-${lead.id}`;
  const existingIdx = bookings.findIndex(
    (b) =>
      b.id_agendamento === manualBookingId ||
      (record.googleEventId && b.google_event_id === record.googleEventId) ||
      (record.googleEventId && b.protocolo === record.googleEventId)
  );

  const ownerName = record.responsibleUser || lead.owner || "Responsável";

  const nextBooking: AgendaBooking = {
    id_agendamento: existingIdx >= 0 ? bookings[existingIdx].id_agendamento : manualBookingId,
    protocolo: existingIdx >= 0 ? bookings[existingIdx].protocolo : `CRM-${generateRandomCode(5)}`,
    id_evento: existingIdx >= 0 ? bookings[existingIdx].id_evento : "CRM-MANUAL",
    evento_nome: record.title || `Reunião: ${lead.name}`,
    id_lead: lead.id,
    lead_nome: lead.name,
    lead_whatsapp: lead.whatsapp || "",
    lead_email: lead.email || "",
    lead_local: record.location || "Online / Reunião CRM",
    responsavel_nome: ownerName,
    data_agendamento: record.date,
    hora_inicio: record.startTime,
    hora_fim: record.endTime,
    status: isCancelled ? "CANCELADO" : "CONFIRMADO",
    origem: existingIdx >= 0 ? bookings[existingIdx].origem || "CRM_MANUAL" : "CRM_MANUAL",
    meet_link: record.meetLink || undefined,
    calendar_link: record.calendarLink || undefined,
    google_event_id: record.googleEventId || undefined,
    observacoes: record.description || "",
    criado_em: existingIdx >= 0 ? bookings[existingIdx].criado_em : nowIso,
    atualizado_em: nowIso,
  };

  if (existingIdx >= 0) {
    bookings[existingIdx] = nextBooking;
  } else {
    bookings.unshift(nextBooking);
  }
  draft.agendaBookings = bookings;

  const taskId = `task_agd_${nextBooking.id_agendamento}`;
  const existingTaskIdx = tasks.findIndex((t) => t.id === taskId);
  const taskPayload = {
    id: taskId,
    title: isCancelled
      ? `[CANCELADO] ${record.title || "Reunião CRM"}`
      : `Reunião: ${record.title || lead.name} (${record.startTime})`,
    lead: lead.name,
    leadId: lead.id,
    owners: [ownerName],
    due: record.date,
    dueDate: record.date,
    priority: "alta",
    done: isCancelled,
    createdAt: existingTaskIdx >= 0 ? tasks[existingTaskIdx].createdAt : nowIso,
    completedAt: isCancelled ? nowIso : undefined,
    subtasks: existingTaskIdx >= 0 ? tasks[existingTaskIdx].subtasks || [] : [],
  };

  if (existingTaskIdx >= 0) {
    tasks[existingTaskIdx] = { ...tasks[existingTaskIdx], ...taskPayload };
  } else if (!isCancelled) {
    tasks.unshift(taskPayload);
  }
  draft.tasks = tasks;
}
