"use client";

import React, { useState, useEffect } from "react";
import { 
  X, Calendar, Clock, Video, MapPin, Users, Mail, Plus, Trash2, 
  CheckCircle2, AlertCircle, Link2, ExternalLink, ShieldCheck, Sparkles, RefreshCw 
} from "lucide-react";
import { type Lead } from "@/data/mock";
import { useData } from "@/hooks/use-data";
import { 
  getCalendarConnectionState, 
  connectGoogleCalendar, 
  createGoogleCalendarEvent, 
  updateGoogleCalendarEvent, 
  deleteGoogleCalendarEvent,
  type GoogleCalendarConnection, 
  type GoogleCalendarEventRecord 
} from "@/lib/google-calendar";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead;
  existingEvent?: GoogleCalendarEventRecord | null;
  onSuccess?: (record: GoogleCalendarEventRecord) => void;
}

export function ScheduleModal({ isOpen, onClose, lead, existingEvent, onSuccess }: ScheduleModalProps) {
  const { currentUser, updateLead } = useData();

  // Connection state
  const [conn, setConn] = useState<GoogleCalendarConnection>({ connected: false });
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("10:30");
  const [location, setLocation] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [createMeet, setCreateMeet] = useState(true);
  const [reminderMinutes, setReminderMinutes] = useState<number | null>(30); // 30 mins before

  // Attendees
  const [attendees, setAttendees] = useState<string[]>([]);
  const [newAttendeeInput, setNewAttendeeInput] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");

  // Load connection state on open
  useEffect(() => {
    if (isOpen) {
      const state = getCalendarConnectionState();
      setConn(state);

      const defaultDate = new Date().toISOString().split("T")[0];

      if (existingEvent) {
        // Populate form with existing event data for EDITING
        setTitle(existingEvent.title || "");
        setDescription(existingEvent.description || "");
        setDate(existingEvent.date || defaultDate);
        setStartTime(existingEvent.startTime || "10:00");
        setEndTime(existingEvent.endTime || "10:30");
        setLocation(existingEvent.location || "");
        setMeetingUrl(existingEvent.meetingUrl || "");
        setCreateMeet(!!existingEvent.meetLink);
        setAttendees(existingEvent.attendees || []);
      } else {
        // Default values for NEW scheduling
        setTitle(`Reunião: ${lead.name} — ${lead.company || "Oportunidade"}`);
        setDescription(`Alinhamento comercial com ${lead.name} (${lead.company || "Lead"}).\nContato: ${lead.whatsapp || lead.email || "Sem contato"}`);
        setDate(defaultDate);
        setStartTime("10:00");
        setEndTime("10:30");
        setLocation("");
        setMeetingUrl("");
        setCreateMeet(true);

        // Pre-fill initial attendees: lead email & seller email
        const initialList: string[] = [];
        if (currentUser?.email && currentUser.email.includes("@")) {
          initialList.push(currentUser.email);
        } else {
          initialList.push("vendedor@empresa.com");
        }
        if (lead.email && lead.email.includes("@") && !initialList.includes(lead.email)) {
          initialList.push(lead.email);
        }
        setAttendees(initialList);
      }
    }
  }, [isOpen, lead, existingEvent, currentUser]);

  if (!isOpen) return null;

  // Handle OAuth Connection
  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const res = await connectGoogleCalendar();
      setConn(res);
    } catch (err: any) {
      console.error("Erro ao conectar Google Agenda:", err);
    } finally {
      setIsConnecting(false);
    }
  };

  // Duration auto calculator helper
  const handleDurationSelect = (minutes: number) => {
    if (!startTime) return;
    const [h, m] = startTime.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return;

    const startMinutes = h * 60 + m;
    const endMinutes = startMinutes + minutes;
    const endH = Math.floor(endMinutes / 60) % 24;
    const endM = endMinutes % 60;

    const formattedEnd = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
    setEndTime(formattedEnd);
  };

  // Add attendee
  const handleAddAttendee = () => {
    const email = newAttendeeInput.trim().toLowerCase();
    if (!email) return;
    if (!email.includes("@") || !email.includes(".")) {
      toast.error("Por favor, informe um e-mail válido.");
      return;
    }
    if (attendees.includes(email)) {
      toast.info("Este e-mail já está adicionado.");
      setNewAttendeeInput("");
      return;
    }
    setAttendees([...attendees, email]);
    setNewAttendeeInput("");
  };

  // Remove attendee
  const handleRemoveAttendee = (index: number) => {
    setAttendees(attendees.filter((_, i) => i !== index));
  };

  // Save inline editing attendee
  const handleSaveEditAttendee = (index: number) => {
    const val = editingValue.trim().toLowerCase();
    if (!val || !val.includes("@")) {
      toast.error("Informe um e-mail válido.");
      return;
    }
    const updated = [...attendees];
    updated[index] = val;
    setAttendees(updated);
    setEditingIndex(null);
  };

  // Submit Schedule / Update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Informe o título do evento.");
      return;
    }
    if (!date) {
      toast.error("Informe a data do evento.");
      return;
    }
    if (!startTime || !endTime) {
      toast.error("Informe os horários de início e término.");
      return;
    }

    // Check Google Calendar OAuth connection
    const currentConn = getCalendarConnectionState();
    if (!currentConn.connected) {
      toast.error("Sua conta do Google Agenda não está conectada. Clique em 'Conectar Google Agenda' para continuar.");
      return;
    }

    setIsSubmitting(true);

    try {
      const responsibleUser = currentUser?.name || lead.owner || "Vendedor";

      const eventInput = {
        title: title.trim(),
        description: description.trim(),
        date,
        startTime,
        endTime,
        location: location.trim(),
        meetingUrl: meetingUrl.trim(),
        attendees,
        createMeet,
        reminderMinutes
      };

      let record: GoogleCalendarEventRecord;

      if (existingEvent?.googleEventId) {
        // EDIT EXISTING EVENT
        record = await updateGoogleCalendarEvent(existingEvent.googleEventId, eventInput, responsibleUser);
        toast.success("Agendamento atualizado com sucesso no Google Calendar!");
      } else {
        // CREATE NEW EVENT
        record = await createGoogleCalendarEvent(eventInput, responsibleUser);
        toast.success("Evento agendado com sucesso no Google Agenda!");
      }

      // 1. Format date for display
      const dateParts = date.split("-");
      const formattedDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : date;

      // 2. Build activity history entry
      const activityText = `REUNIÃO AGENDADA
${formattedDate} às ${startTime} - ${endTime}
Participantes (${attendees.length}): ${attendees.join(", ")}
Responsável: ${responsibleUser}
${record.meetLink ? `Google Meet: ${record.meetLink}` : "Google Meet: Não ativado"}
${record.calendarLink ? `Link do Google Agenda: ${record.calendarLink}` : ""}`;

      const newActivity = {
        id: "act_meeting_" + Date.now(),
        type: "meeting" as const,
        description: activityText,
        timestamp: new Date().toISOString(),
        user: responsibleUser,
        metadata: {
          calendarEvent: record
        }
      };

      // 3. Update lead in CRM with activity & event metadata
      const existingActivities = Array.isArray(lead.activities) ? lead.activities : [];
      const updatedLead = {
        activities: [newActivity, ...existingActivities],
        metadata: {
          ...(lead.metadata || {}),
          calendarEvent: record
        }
      };

      updateLead(lead.id, updatedLead);

      if (onSuccess) {
        onSuccess(record);
      }

      onClose();
    } catch (err: any) {
      console.error("Erro ao salvar agendamento:", err);
      toast.error(err.message || "Ocorreu um erro ao comunicar com o Google Calendar.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancel / Delete Event
  const handleCancelEvent = async () => {
    if (!existingEvent?.googleEventId) return;

    if (!confirm("Tem certeza que deseja cancelar este evento no Google Calendar e atualizar o CRM?")) {
      return;
    }

    setIsCancelling(true);

    try {
      const responsibleUser = currentUser?.name || lead.owner || "Vendedor";

      // 1. Delete on Google Calendar
      await deleteGoogleCalendarEvent(existingEvent.googleEventId);

      // 2. Update activity history
      const cancelActivity = {
        id: "act_cancel_" + Date.now(),
        type: "system" as const,
        description: `REUNIÃO CANCELADA\nO agendamento do dia ${existingEvent.date} às ${existingEvent.startTime} foi cancelado por ${responsibleUser}.`,
        timestamp: new Date().toISOString(),
        user: responsibleUser
      };

      const existingActivities = Array.isArray(lead.activities) ? lead.activities : [];
      const updatedMeta = { ...(lead.metadata || {}) };
      delete updatedMeta.calendarEvent;

      updateLead(lead.id, {
        activities: [cancelActivity, ...existingActivities],
        metadata: updatedMeta
      });

      toast.success("Evento cancelado e removido do Google Agenda.");
      onClose();
    } catch (err: any) {
      console.error("Erro ao cancelar evento:", err);
      toast.error(err.message || "Erro ao cancelar evento.");
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card border border-border w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="p-6 border-b border-border bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-primary">
                Integrador Comercial Google
              </div>
              <h2 className="font-display text-lg font-bold">
                {existingEvent ? "EDITAR AGENDAMENTO" : "AGENDAR EVENTO"}
              </h2>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-muted/60 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* STATUS DA CONEXÃO GOOGLE */}
        <div className="px-6 py-3 bg-muted/40 border-b border-border flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs">
            {conn.connected ? (
              <>
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-bold text-foreground">Google Agenda conectada:</span>
                <span className="text-muted-foreground font-mono">{conn.email}</span>
              </>
            ) : (
              <>
                <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                <span className="font-bold text-amber-500">Google Agenda não conectada</span>
              </>
            )}
          </div>

          {!conn.connected ? (
            <button
              type="button"
              onClick={handleConnect}
              disabled={isConnecting}
              className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground font-black text-[10px] uppercase tracking-wider hover:bg-primary/90 transition-all flex items-center gap-1.5 shadow-sm"
            >
              {isConnecting ? (
                <>
                  <RefreshCw className="h-3 w-3 animate-spin" /> Conectando...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-3.5 w-3.5" /> CONECTAR GOOGLE AGENDA
                </>
              )}
            </button>
          ) : (
            <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
              Sincronizado
            </span>
          )}
        </div>

        {/* FORM BODY */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto scrollbar-thin">
          
          {/* TÍTULO */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center justify-between">
              <span>Título do evento *</span>
              <span className="text-primary font-normal">Sincroniza no Google Calendar</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Reunião de Apresentação Comercial"
              className="w-full bg-muted/40 border border-border rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* DESCRIÇÃO */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Descrição
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Pauta da reunião, detalhes adicionais ou observações..."
              className="w-full bg-muted/40 border border-border rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          {/* DATA E HORÁRIOS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3 text-primary" /> Data *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-muted/40 border border-border rounded-xl px-3 py-2 text-xs font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3 text-primary" /> Início *
              </label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-muted/40 border border-border rounded-xl px-3 py-2 text-xs font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3 text-primary" /> Fim *
              </label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full bg-muted/40 border border-border rounded-xl px-3 py-2 text-xs font-bold"
              />
            </div>
          </div>

          {/* ATALHOS DE DURAÇÃO */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase font-bold text-muted-foreground mr-1">Duração rápida:</span>
            {[15, 30, 45, 60, 90, 120].map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => handleDurationSelect(mins)}
                className="px-2.5 py-1 rounded-lg bg-muted border border-border text-[10px] font-bold text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all"
              >
                {mins < 60 ? `${mins}m` : `${mins / 60}h`}
              </button>
            ))}
          </div>

          {/* LOCAL E LINK MANUAL */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3 text-primary" /> Local
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ex: Escritório / Presencial ou Endereço"
                className="w-full bg-muted/40 border border-border rounded-xl px-3 py-2 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                <Link2 className="h-3 w-3 text-primary" /> Link da Reunião (Opcional)
              </label>
              <input
                type="text"
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
                placeholder="Ex: https://zoom.us/j/123456"
                className="w-full bg-muted/40 border border-border rounded-xl px-3 py-2 text-xs"
              />
            </div>
          </div>

          {/* PARTICIPANTES */}
          <div className="space-y-2.5 p-4 bg-muted/20 border border-border rounded-2xl">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-widest text-foreground flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-primary" /> Participantes (Attendees)
              </label>
              <span className="text-[10px] text-muted-foreground font-semibold">
                {attendees.length} adicionado(s)
              </span>
            </div>

            {/* Input para adicionar participante */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="email"
                  value={newAttendeeInput}
                  onChange={(e) => setNewAttendeeInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddAttendee(); } }}
                  placeholder="e-mail: cliente@gmail.com, vendedor@empresa.com"
                  className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <button
                type="button"
                onClick={handleAddAttendee}
                className="px-4 py-2 bg-primary/10 border border-primary/30 text-primary rounded-xl text-xs font-bold hover:bg-primary hover:text-primary-foreground transition-all flex items-center gap-1 shrink-0"
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar
              </button>
            </div>

            {/* Lista de Participantes */}
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {attendees.map((email, idx) => (
                <div 
                  key={idx}
                  className="flex items-center justify-between bg-card border border-border rounded-xl px-3 py-1.5 text-xs group"
                >
                  {editingIndex === idx ? (
                    <div className="flex items-center gap-2 flex-1 mr-2">
                      <input
                        type="email"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        className="flex-1 bg-muted px-2 py-1 rounded text-xs border border-primary"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEditAttendee(idx)}
                        className="text-primary font-bold text-[10px] uppercase"
                      >
                        Salvar
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-5 w-5 rounded-full bg-primary/10 text-primary text-[9px] font-black grid place-items-center shrink-0">
                        {email[0]?.toUpperCase()}
                      </div>
                      <span className="font-mono text-muted-foreground truncate">{email}</span>
                      {idx === 0 && (
                        <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                          Organizador
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => { setEditingIndex(idx); setEditingValue(email); }}
                      className="text-muted-foreground hover:text-primary text-[10px] font-bold px-1.5 py-0.5"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttendee(idx)}
                      className="text-muted-foreground hover:text-destructive p-1 rounded hover:bg-destructive/10 transition-colors"
                      title="Remover participante"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {attendees.length === 0 && (
                <p className="text-[11px] text-muted-foreground italic text-center py-2">
                  Nenhum participante adicionado ainda.
                </p>
              )}
            </div>
          </div>

          {/* GOOGLE MEET CHECKBOX & LEMBRETES */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            
            {/* GOOGLE MEET TOGGLE */}
            <label className="flex items-center gap-3 p-3 bg-muted/20 border border-border rounded-2xl cursor-pointer hover:border-primary/40 transition-colors">
              <input
                type="checkbox"
                checked={createMeet}
                onChange={(e) => setCreateMeet(e.target.checked)}
                className="h-4 w-4 rounded text-primary focus:ring-primary border-border"
              />
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-emerald-400" />
                <div className="text-xs">
                  <div className="font-bold">Criar reunião pelo Google Meet</div>
                  <div className="text-[10px] text-muted-foreground">Gera o link de vídeo automaticamente</div>
                </div>
              </div>
            </label>

            {/* LEMBRETE */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Lembrete do Evento
              </label>
              <select
                value={reminderMinutes === null ? "default" : String(reminderMinutes)}
                onChange={(e) => {
                  const val = e.target.value;
                  setReminderMinutes(val === "default" ? null : Number(val));
                }}
                className="w-full bg-muted/40 border border-border rounded-xl px-3 py-2 text-xs font-semibold"
              >
                <option value="10">10 minutos antes</option>
                <option value="30">30 minutos antes (Padrão)</option>
                <option value="60">1 hora antes</option>
                <option value="1440">1 dia antes</option>
                <option value="default">Usar lembrete padrão do Google Agenda</option>
              </select>
            </div>
          </div>

          {/* FOOTER ACTIONS */}
          <div className="pt-6 border-t border-border flex items-center justify-between gap-3">
            {existingEvent ? (
              <button
                type="button"
                onClick={handleCancelEvent}
                disabled={isCancelling}
                className="px-4 py-2.5 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all font-bold text-xs flex items-center gap-1.5"
              >
                {isCancelling ? "Cancelando..." : "CANCELAR EVENTO"}
              </button>
            ) : <div />}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-border text-xs font-bold hover:bg-muted transition-colors"
              >
                CANCELAR
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-elegant flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" /> Processando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" /> {existingEvent ? "SALVAR ALTERAÇÕES" : "AGENDAR"}
                  </>
                )}
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
}
