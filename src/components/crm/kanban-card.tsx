import { type Lead, SLA_CONFIG, CLASSIFICATION_CONFIG } from "@/data/mock";
import { MoreVertical, MessageCircle, Phone, Paperclip, Thermometer, Target, UserCheck, Zap, BookOpen, Ban, RefreshCw, CreditCard, Flame, Calendar as CalendarIcon, Video, Sparkles, Globe, ArrowRight, Layers } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { calculateLeadScore, calculateLeadTemperature, getScoreColor } from "@/lib/scoring";
import { useData } from "@/hooks/use-data";
import { getLeadMoment } from "@/lib/lead-status-utils";
import { getMinClassificationBadge, calculateMinQualification } from "@/lib/min-qualification";

interface KanbanCardProps {
  lead: Lead;
  color?: string;
  stages?: string[];
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (e: React.MouseEvent | React.ChangeEvent) => void;
  onClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onMarkLost?: (e: React.MouseEvent) => void;
  onSchedule?: (e: React.MouseEvent) => void;
  onMoveStage?: (stage: string) => void;
  onTransfer?: (e: React.MouseEvent) => void;
}

export function KanbanCard({ 
  lead, 
  color = 'primary', 
  stages = [],
  selectable = false,
  selected = false,
  onToggleSelect,
  onClick, 
  onDragStart, 
  onDragEnd, 
  onMarkLost, 
  onSchedule,
  onMoveStage,
  onTransfer
}: KanbanCardProps) {
  const { products, agendaBookings, agendaEvents } = useData();
  const sla = SLA_CONFIG[lead.sla] || SLA_CONFIG.ok;
  const classification = CLASSIFICATION_CONFIG[lead.classification || "Lead"];
  
  const score = calculateLeadScore(lead);
  const temp = calculateLeadTemperature(score, lead);
  const tempColor = getScoreColor(score);

  const linkedProduct = products.find(p => p.id === lead.productId);
  const moment = getLeadMoment(lead, products);
  const MomentIcon = moment.icon;

  const minObj = lead.minQualification || (lead.minScore && lead.minScore !== "Nenhum" ? calculateMinQualification(
    lead.minScore.includes("M") ? 1 : 0,
    lead.minScore.includes("I") ? 1 : 0,
    lead.minScore.includes("N") ? 1 : 0
  ) : undefined);

  const minBadge = getMinClassificationBadge(minObj);

  const cleanPhone = lead.whatsapp?.replace(/\D/g, "") || "";
  const ownerName = lead.owner || "Sem Responsável";
  const initials = ownerName.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();

  const scheduledEvent = lead.metadata?.calendarEvent;

  const matchedBooking = (agendaBookings || []).find(
    (b) =>
      b.id_lead === lead.id ||
      (b.lead_email && lead.email && b.lead_email.toLowerCase() === lead.email.toLowerCase())
  );
  const matchedAgendaEvent = (agendaEvents || []).find(
    (ev) =>
      (lead.metadata?.eventId && ev.id_evento === lead.metadata.eventId) ||
      (matchedBooking?.id_evento && ev.id_evento === matchedBooking.id_evento) ||
      (lead.metadata?.eventSlug && ev.slug === lead.metadata.eventSlug) ||
      (Array.isArray(lead.tags) && lead.tags.some((t) => String(t).toLowerCase() === ev.slug.toLowerCase()))
  );
  const linkedEventName =
    lead.metadata?.eventName ||
    matchedBooking?.evento_nome ||
    matchedAgendaEvent?.nome ||
    scheduledEvent?.eventName ||
    (typeof lead.source === "string" && lead.source.startsWith("Agenda Pública:")
      ? lead.source.replace("Agenda Pública:", "").split("(")[0].trim()
      : typeof lead.source === "string" && lead.source.startsWith("Lista de Espera:")
      ? lead.source.replace("Lista de Espera:", "").trim()
      : "");

  const currentStageIdx = stages.indexOf(lead.stage);
  const nextStage = currentStageIdx !== -1 && currentStageIdx < stages.length - 1 ? stages[currentStageIdx + 1] : null;

  return (
    <div
      draggable
      onDragStart={(e) => {
        try {
          e.dataTransfer.setData("text/plain", lead.id);
          e.dataTransfer.setData("application/json", JSON.stringify({ id: lead.id, stage: lead.stage }));
          e.dataTransfer.effectAllowed = "move";
        } catch {}
        onDragStart(e);
      }}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={cn(
        "cursor-grab active:cursor-grabbing bg-gradient-surface border rounded-lg p-3 hover:shadow-elegant transition-all group relative overflow-hidden",
        selected ? "border-primary ring-2 ring-primary/30" : "border-primary/20 hover:border-primary/60",
        lead.stage === "Perdido" && "opacity-60 grayscale-[0.5]"
      )}
    >
      <div className={cn("absolute left-0 top-0 bottom-0 w-1", lead.stage === "Perdido" ? "bg-muted-foreground" : "bg-primary")} />

      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            {selectable && (
              <input
                type="checkbox"
                checked={selected}
                onChange={(e) => {
                  e.stopPropagation();
                  onToggleSelect?.(e);
                }}
                onClick={(e) => e.stopPropagation()}
                aria-label={`Selecionar ${lead.name}`}
                className="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer"
              />
            )}
            <div className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter shadow-sm border", moment.bgColor, moment.color, "border-current/10")}>
              <MomentIcon className="h-2.5 w-2.5" />
              {moment.label}
            </div>
            {linkedEventName && (
              <div
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 max-w-full truncate"
                title={`Evento: ${linkedEventName}`}
              >
                <CalendarIcon className="h-2.5 w-2.5 shrink-0" />
                <span className="truncate">{linkedEventName}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className={`text-[8px] px-1 py-0 rounded font-black uppercase tracking-tighter ${classification.cls}`}>
              {classification.label}
            </span>
            <div className="text-sm font-bold truncate">{lead.name}</div>
          </div>
          <div className="text-[10px] text-muted-foreground truncate">
            {lead.company} {lead.source && `· ${lead.source}`}
          </div>
        </div>
        <div className={cn("text-[9px] font-black px-1.5 py-0.5 rounded shrink-0 border flex items-center gap-1", minBadge.bg, minBadge.text, minBadge.border)}>
          <span>{minBadge.emoji}</span>
          <span>{minBadge.label}</span>
        </div>
      </div>

      {/* AGENDAMENTO GOOGLE CALENDAR BADGE */}
      {scheduledEvent ? (
        <div 
          onClick={(e) => { e.stopPropagation(); onSchedule?.(e); }}
          className="mt-2.5 p-1.5 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-between text-[9px] font-bold text-primary hover:bg-primary/20 transition-all cursor-pointer"
          title="Clique para ver / editar agendamento no Google Calendar"
        >
          <div className="flex items-center gap-1.5 truncate">
            <CalendarIcon className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {scheduledEvent.date} às {scheduledEvent.startTime}
            </span>
          </div>
          {scheduledEvent.meetLink && (
            <div className="flex items-center gap-1 px-1 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-[8px] font-black uppercase shrink-0">
              <Video className="h-2.5 w-2.5" /> Meet
            </div>
          )}
        </div>
      ) : (
        <div className="mt-2 flex items-center justify-between">
          <button
            onClick={(e) => { e.stopPropagation(); onSchedule?.(e); }}
            className="px-2 py-1 rounded bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground border border-primary/20 text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1"
            title="Agendar no Google Calendar"
          >
            <CalendarIcon className="h-3 w-3" /> + AGENDAR
          </button>
        </div>
      )}

      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
        <div className={cn("flex items-center gap-1 text-[9px] font-bold", tempColor)}>
          <Thermometer className="h-3 w-3" /> {temp}
        </div>

        {lead.isCustomer || lead.classification === 'Cliente' || lead.stage === 'Ganho' || lead.stage === 'Recebimento' ? (
          <div className="flex items-center gap-1 text-[9px] font-black text-emerald-500 uppercase bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
            <Sparkles className="h-2.5 w-2.5" /> Cliente
          </div>
        ) : lead.isRecurring || lead.type === 'Recorrente' || (Number(lead.lpVisits || 0) > 1) ? (
          <div className="flex items-center gap-1 text-[9px] font-black text-purple-400 uppercase bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
            <RefreshCw className="h-2.5 w-2.5" /> Recorrência
          </div>
        ) : null}

        {Boolean(Number(lead.lpVisits || 0) > 0 || lead.landingPage) && (
          <div className="flex items-center gap-1 text-[9px] font-medium text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border" title={`${lead.lpVisits || 1} visita(s) a Landing Pages`}>
            <Globe className="h-2.5 w-2.5 text-primary/70" /> {lead.lpVisits || 1} LP{Number(lead.lpVisits || 1) > 1 ? 's' : ''}
          </div>
        )}
        
        {linkedProduct?.recurring ? (
           <div className="flex items-center gap-1 text-[9px] font-black text-primary uppercase bg-primary/5 px-1.5 rounded border border-primary/20">
              <RefreshCw className="h-2.5 w-2.5 animate-spin-slow" /> Recorrente
           </div>
        ) : linkedProduct?.installments && linkedProduct.installments > 1 ? (
           <div className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground">
              <CreditCard className="h-3 w-3" /> {linkedProduct.installments}x
           </div>
        ) : null}

        <div className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground">
          <Target className="h-3 w-3" /> {lead.type || "Novo"}
        </div>
      </div>

      <div className="mt-2.5 flex items-center justify-between">
        <div className="space-y-0.5">
           <div className="font-display text-xs font-bold">{formatCurrency(lead.value)}</div>
           {linkedProduct?.recurring && (
             <div className="text-[8px] font-black text-muted-foreground uppercase">{formatCurrency(lead.value / (linkedProduct.recurrenceMonths || 12))}/mês</div>
           )}
        </div>
        <div className={`inline-flex items-center gap-1 text-[10px] ${sla.text}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${sla.dot}`} />
          {sla.label}
        </div>
      </div>

      <div className="mt-2 pt-2 border-t border-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <a 
            href={`tel:${cleanPhone}`} 
            onClick={(e) => e.stopPropagation()}
            className="text-muted-foreground hover:text-primary transition-colors"
            title="Ligar para o lead"
          >
            <Phone className="h-3.5 w-3.5" />
          </a>
          <a 
            href={`https://wa.me/${cleanPhone}`} 
            target="_blank" 
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-muted-foreground hover:text-success transition-colors"
            title="Abrir WhatsApp"
          >
            <MessageCircle className="h-3.5 w-3.5" />
          </a>
          <Link 
            to="/playbook/view" 
            search={{ leadId: lead.id }}
            target="_blank"
            onClick={(e) => e.stopPropagation()}
            className="text-muted-foreground hover:text-primary transition-colors"
            title="Abrir Copiloto de Vendas (Nova Aba)"
          >
            <BookOpen className="h-3.5 w-3.5" />
          </Link>
          {lead.stage !== "Perdido" && lead.stage !== "Ganho" && (
            <button 
              onClick={onMarkLost}
              className="text-muted-foreground hover:text-destructive transition-colors"
              title="Marcar como Perdido"
            >
              <Ban className="h-3.5 w-3.5" />
            </button>
          )}

          {onTransfer && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTransfer(e);
              }}
              className="text-muted-foreground hover:text-primary transition-colors cursor-pointer"
              title="Transferir de Pipeline / Funil"
            >
              <Layers className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Atalho de Avançar Etapa Direto no Card */}
          {nextStage && onMoveStage && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMoveStage(nextStage);
              }}
              className="px-1.5 py-0.5 rounded bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground border border-primary/30 text-[8px] font-black uppercase tracking-tight flex items-center gap-0.5 transition-all"
              title={`Mover diretamente para: ${nextStage}`}
            >
              <span>{nextStage.length > 12 ? nextStage.substring(0, 10) + '..' : nextStage}</span>
              <ArrowRight className="h-2.5 w-2.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <div className="text-[10px] text-muted-foreground truncate max-w-[60px]">{ownerName.split(" ")[0]}</div>
          <div className="h-5 w-5 rounded-full bg-gradient-primary grid place-items-center text-[9px] font-bold text-primary-foreground">
            {initials}
          </div>
        </div>
      </div>
    </div>
  );
}