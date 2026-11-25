import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Calendar,
  CalendarCheck,
  Clock,
  MapPin,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  MessageCircle,
  ExternalLink,
  Search,
  RefreshCw,
  XCircle,
  Copy,
  Check,
  Sun,
  Moon,
  Loader2,
  AlertCircle,
  ShieldCheck,
  LayoutGrid,
  Tag,
  Mail,
  Share2,
} from "lucide-react";
import { cloudStore, type CloudDatabase } from "@/services/cloudStorageService";
import type {
  AgendaBooking,
  AgendaEvent,
  AgendaFormField,
  AgendaSlotAvailability,
  BookingSuccessResult,
  WaitlistSuccessResult,
} from "@/types/agenda";
import {
  applyBookingRescheduleToDraft,
  applyBookingStatusUpdateToDraft,
  applyPublicBookingToDraft,
  applyWaitlistToDraft,
  applyWhatsAppMask,
  buildGoogleCalendarTemplateLink,
  buildPublicAgendaPath,
  buildWhatsAppLink,
  findBookingByProtocol,
  formatDateBR,
  getEventAvailabilitySummary,
  getEventSlotsForDate,
  getEventUpcomingDates,
  isValidBRPhone,
  isValidEmail,
} from "@/lib/agenda-engine";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface PublicBookingViewProps {
  slug?: string;
}

interface StoredDeviceBooking {
  protocolo: string;
  id_agendamento: string;
  evento_nome: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  contato: string;
  criado_em: string;
}

const DEVICE_BOOKINGS_KEY = "salead_public_protocols";

function readDeviceBookings(): StoredDeviceBooking[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(DEVICE_BOOKINGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveDeviceBooking(entry: StoredDeviceBooking) {
  if (typeof window === "undefined") return;
  try {
    const existing = readDeviceBookings().filter((b) => b.protocolo !== entry.protocolo);
    const updated = [entry, ...existing].slice(0, 10);
    window.localStorage.setItem(DEVICE_BOOKINGS_KEY, JSON.stringify(updated));
  } catch {}
}

function getSearchParamsMap(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const sp = new URLSearchParams(window.location.search);
  const out: Record<string, string> = {};
  sp.forEach((v, k) => {
    out[k] = v;
  });
  return out;
}

function getFriendlyDayHeader(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return "";
  const dt = new Date(y, m - 1, d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  if (dt.getTime() === today.getTime()) return "Hoje";
  if (dt.getTime() === tomorrow.getTime()) return "Amanhã";
  const names = [
    "Domingo",
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
    "Sábado",
  ];
  return names[dt.getDay()] || "";
}

function formatDayMonthShort(isoDate: string): string {
  const parts = String(isoDate).slice(0, 10).split("-");
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}`;
}

function formatBRLPrice(val?: number | string): string {
  const n = Number(val || 0);
  if (!n || Number.isNaN(n)) return "";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getBookingStatusLabel(status?: string): string {
  if (status === "CANCELADO") return "Cancelado";
  if (status === "REALIZADO") return "Realizado";
  if (status === "NO_SHOW") return "Não Compareceu";
  if (status === "REMARCADO") return "Remarcado";
  return "Confirmado";
}

export const PublicBookingView: React.FC<PublicBookingViewProps> = ({ slug }) => {
  const navigate = useNavigate();
  const [db, setDb] = useState<CloudDatabase>(() => cloudStore.getState());
  const [bootstrapping, setBootstrapping] = useState<boolean>(true);
  const [darkTheme, setDarkTheme] = useState<boolean>(false);

  const qs = useMemo(() => getSearchParamsMap(), []);

  // Portal Hub filter
  const [portalFilter, setPortalFilter] = useState<"todos" | "abertos" | "espera">("todos");
  const [deviceBookings, setDeviceBookings] = useState<StoredDeviceBooking[]>(() => readDeviceBookings());

  // Wizard states
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<AgendaSlotAvailability | null>(null);

  // Form states
  const [nome, setNome] = useState(qs.nome || qs.name || "");
  const [whatsapp, setWhatsapp] = useState(
    qs.whatsapp || qs.phone ? applyWhatsAppMask(qs.whatsapp || qs.phone || "") : ""
  );
  const [email, setEmail] = useState(qs.email || "");
  const [localEscolha, setLocalEscolha] = useState(qs.local || qs.empresa || qs.company || "");
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState<BookingSuccessResult | null>(null);
  const [copiedProtocol, setCopiedProtocol] = useState(false);
  const [redirectSeconds, setRedirectSeconds] = useState<number>(8);
  const [autoRedirectPaused, setAutoRedirectPaused] = useState<boolean>(false);

  // Waitlist form states
  const [wlNome, setWlNome] = useState(qs.nome || qs.name || "");
  const [wlWhatsapp, setWlWhatsapp] = useState(
    qs.whatsapp || qs.phone ? applyWhatsAppMask(qs.whatsapp || qs.phone || "") : ""
  );
  const [wlEmail, setWlEmail] = useState(qs.email || "");
  const [wlObs, setWlObs] = useState("");
  const [wlResult, setWlResult] = useState<WaitlistSuccessResult | null>(null);

  // Meus Agendamentos Modal states
  const [myBookingsOpen, setMyBookingsOpen] = useState(false);
  const [lookupProtocol, setLookupProtocol] = useState("");
  const [lookupContact, setLookupContact] = useState("");
  const [foundLookup, setFoundLookup] = useState<{
    agendamento: AgendaBooking;
    evento: AgendaEvent | null;
  } | null>(null);
  const [lookupError, setLookupError] = useState("");
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleSlot, setRescheduleSlot] = useState<AgendaSlotAvailability | null>(null);

  const visitedEventRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const unsubscribe = cloudStore.subscribe(() => {
      if (mounted) {
        setDb({ ...cloudStore.getState() });
      }
    });

    cloudStore
      .bootstrap()
      .then(() => {
        if (mounted) setDb({ ...cloudStore.getState() });
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setBootstrapping(false);
      });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  // Reset wizard when slug changes
  useEffect(() => {
    setBookingResult(null);
    setWlResult(null);
    setStep(1);
    setSelectedDate("");
    setSelectedSlot(null);
    setRedirectSeconds(8);
    setAutoRedirectPaused(false);
  }, [slug]);

  const events = useMemo(() => db.agendaEvents || [], [db.agendaEvents]);
  const products = useMemo(() => db.products || [], [db.products]);
  const companyName = db.company?.name || "Portal de Atendimentos";
  const companyPhone = db.company?.contact || "";
  const companyEmail = db.company?.email || "";
  const companyAddress = db.company?.address || "";
  const companyDoc = db.company?.cnpj || db.company?.document || "";

  const targetEvent = useMemo(() => {
    if (!slug) return null;
    const clean = slug.trim().toLowerCase();
    return (
      events.find(
        (e) => e.slug.toLowerCase() === clean || e.id_evento.toLowerCase() === clean
      ) || null
    );
  }, [events, slug]);

  const linkedProduct = useMemo(() => {
    if (!targetEvent?.product_id) return null;
    return products.find((p: any) => p.id === targetEvent.product_id) || null;
  }, [products, targetEvent]);

  // Increment visits counter
  useEffect(() => {
    if (!targetEvent || visitedEventRef.current === targetEvent.id_evento) return;
    visitedEventRef.current = targetEvent.id_evento;
    try {
      cloudStore.mutate(
        (draft) => {
          draft.agendaEvents = (draft.agendaEvents || []).map((e) =>
            e.id_evento === targetEvent.id_evento
              ? { ...e, visitas: Number(e.visitas || 0) + 1 }
              : e
          );
        },
        { skipPush: true }
      );
    } catch {}
  }, [targetEvent]);

  useEffect(() => {
    if (targetEvent?.local_opcoes?.length && !localEscolha) {
      setLocalEscolha(targetEvent.local_opcoes[0]);
    }
  }, [targetEvent, localEscolha]);

  const eventSummary = useMemo(() => {
    if (!targetEvent) return null;
    return getEventAvailabilitySummary(db, targetEvent);
  }, [db, targetEvent]);

  const upcomingDates = useMemo(() => {
    if (!targetEvent) return [];
    return getEventUpcomingDates(db, targetEvent);
  }, [db, targetEvent]);

  const slotsForDate = useMemo(() => {
    if (!targetEvent || !selectedDate) return [];
    return getEventSlotsForDate(db, targetEvent.id_evento, selectedDate);
  }, [db, targetEvent, selectedDate]);

  const eventFields = useMemo(() => {
    if (!targetEvent) return [];
    return (db.agendaFormFields || [])
      .filter((f) => f.id_evento === targetEvent.id_evento && f.ativo !== false)
      .sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0));
  }, [db.agendaFormFields, targetEvent]);

  const portalEventsWithSummary = useMemo(() => {
    return events
      .filter((e) => e.status !== "RASCUNHO")
      .map((ev) => {
        const summary = getEventAvailabilitySummary(db, ev);
        const upcoming = getEventUpcomingDates(db, ev).filter((d) => d.vagasDia > 0);
        const prod = ev.product_id ? products.find((p: any) => p.id === ev.product_id) : null;
        return {
          ev,
          summary,
          openDaysCount: upcoming.length,
          prod,
        };
      });
  }, [events, db, products]);

  const openCount = useMemo(
    () => portalEventsWithSummary.filter((item) => item.summary.disponivel).length,
    [portalEventsWithSummary]
  );
  const waitlistCount = useMemo(
    () => portalEventsWithSummary.filter((item) => !item.summary.disponivel).length,
    [portalEventsWithSummary]
  );

  const filteredPortalEvents = useMemo(() => {
    if (portalFilter === "abertos") {
      return portalEventsWithSummary.filter((i) => i.summary.disponivel);
    }
    if (portalFilter === "espera") {
      return portalEventsWithSummary.filter((i) => !i.summary.disponivel);
    }
    return portalEventsWithSummary;
  }, [portalEventsWithSummary, portalFilter]);

  // Hydrate saved device bookings with live cloudStore records
  const hydratedDeviceBookings = useMemo(() => {
    const allBookings = db.agendaBookings || [];
    return deviceBookings.map((item) => {
      const live = allBookings.find(
        (b) =>
          b.protocolo.toUpperCase() === item.protocolo.toUpperCase() ||
          b.id_agendamento === item.id_agendamento
      );
      return {
        ...item,
        data: live?.data_agendamento || item.data,
        hora_inicio: live?.hora_inicio || item.hora_inicio,
        hora_fim: live?.hora_fim || item.hora_fim,
        status: live?.status || "CONFIRMADO",
        liveBooking: live || null,
      };
    });
  }, [deviceBookings, db.agendaBookings]);

  // Auto-redirect countdown after booking confirmation (matches Image 5)
  useEffect(() => {
    if (!bookingResult || autoRedirectPaused) return;
    if (redirectSeconds <= 0) {
      setBookingResult(null);
      navigate({ to: "/agendar" });
      return;
    }
    const timer = window.setTimeout(() => {
      setRedirectSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [bookingResult, redirectSeconds, autoRedirectPaused, navigate]);

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetEvent || !selectedDate || !selectedSlot) return;

    if (!nome.trim()) {
      toast.error("Informe seu nome completo.");
      return;
    }
    if (!isValidBRPhone(whatsapp)) {
      toast.error("Informe um número de WhatsApp válido com DDD.");
      return;
    }
    if (email.trim() && !isValidEmail(email)) {
      toast.error("Informe um e-mail válido.");
      return;
    }

    for (const f of eventFields) {
      const val = (customAnswers[f.id_campo] || "").trim();
      if (f.obrigatorio && !val) {
        toast.error(`Preencha o campo obrigatório: ${f.label}`);
        return;
      }
    }

    setSubmitting(true);
    try {
      let result: BookingSuccessResult | null = null;
      await cloudStore.mutateAndSync((draft) => {
        result = applyPublicBookingToDraft(draft, {
          slug_evento: targetEvent.slug,
          data: selectedDate,
          hora_inicio: selectedSlot.hora_inicio,
          hora_fim: selectedSlot.hora_fim,
          nome: nome.trim(),
          whatsapp: whatsapp.trim(),
          email: email.trim(),
          empresa: localEscolha.trim() || undefined,
          local: localEscolha.trim() || targetEvent.local_evento,
          respostas_customizadas: customAnswers,
          lp_id: qs.lp || undefined,
          lp_title: qs.lp_title || undefined,
          utms: {
            utm_source: qs.utm_source || qs.src || "",
            utm_medium: qs.utm_medium || "",
            utm_campaign: qs.utm_campaign || "",
            utm_content: qs.utm_content || "",
            utm_term: qs.utm_term || "",
            src: qs.src || "",
          },
        });
      });

      if (result) {
        const resObj = result as BookingSuccessResult;
        saveDeviceBooking({
          protocolo: resObj.protocolo,
          id_agendamento: resObj.id_agendamento,
          evento_nome: resObj.evento_nome,
          data: resObj.data,
          hora_inicio: resObj.hora_inicio,
          hora_fim: resObj.hora_fim,
          contato: whatsapp.trim() || email.trim(),
          criado_em: new Date().toISOString(),
        });
        setDeviceBookings(readDeviceBookings());
        setRedirectSeconds(8);
        setAutoRedirectPaused(false);
        setBookingResult(resObj);
        toast.success("Agendamento confirmado com sucesso!");
      }
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível concluir o agendamento.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetEvent) return;
    if (!wlNome.trim() || !isValidBRPhone(wlWhatsapp)) {
      toast.error("Informe nome e WhatsApp válido para entrar na lista de espera.");
      return;
    }
    setSubmitting(true);
    try {
      let res: WaitlistSuccessResult | null = null;
      await cloudStore.mutateAndSync((draft) => {
        res = applyWaitlistToDraft(draft, {
          slug_evento: targetEvent.slug,
          nome: wlNome.trim(),
          whatsapp: wlWhatsapp.trim(),
          email: wlEmail.trim() || undefined,
          observacoes: wlObs.trim() || undefined,
        });
      });
      if (res) {
        setWlResult(res);
        toast.success("Cadastro realizado na lista de espera!");
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro ao registrar na lista de espera.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLookupBooking = (e: React.FormEvent) => {
    e.preventDefault();
    setLookupError("");
    setFoundLookup(null);
    setRescheduleOpen(false);
    try {
      const res = findBookingByProtocol(db, lookupProtocol, lookupContact);
      setFoundLookup({ agendamento: res.agendamento, evento: res.evento });
      setRescheduleDate(res.agendamento.data_agendamento);
    } catch (err: any) {
      setLookupError(err?.message || "Agendamento não localizado.");
    }
  };

  const openProtocolDirect = (item: StoredDeviceBooking & { liveBooking?: AgendaBooking | null }) => {
    setLookupError("");
    setRescheduleOpen(false);
    setLookupProtocol(item.protocolo);
    setLookupContact(item.contato);
    const live =
      item.liveBooking ||
      (db.agendaBookings || []).find((b) => b.protocolo.toUpperCase() === item.protocolo.toUpperCase());
    if (live) {
      const ev = events.find((e) => e.id_evento === live.id_evento) || null;
      setFoundLookup({ agendamento: live, evento: ev });
      setRescheduleDate(live.data_agendamento);
    } else {
      setFoundLookup(null);
    }
    setMyBookingsOpen(true);
  };

  const handleCancelFoundBooking = async () => {
    if (!foundLookup) return;
    setSubmitting(true);
    try {
      await cloudStore.mutateAndSync((draft) => {
        applyBookingStatusUpdateToDraft(
          draft,
          foundLookup.agendamento.id_agendamento,
          "CANCELADO",
          "Cancelado pelo participante na página pública"
        );
      });
      const updated = findBookingByProtocol(
        cloudStore.getState(),
        foundLookup.agendamento.protocolo,
        lookupContact || foundLookup.agendamento.lead_whatsapp || foundLookup.agendamento.lead_email || ""
      );
      setFoundLookup({ agendamento: updated.agendamento, evento: updated.evento });
      toast.success("Agendamento cancelado.");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao cancelar.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmPublicReschedule = async () => {
    if (!foundLookup || !rescheduleDate || !rescheduleSlot) return;
    setSubmitting(true);
    try {
      await cloudStore.mutateAndSync((draft) => {
        applyBookingRescheduleToDraft(
          draft,
          foundLookup.agendamento.id_agendamento,
          rescheduleDate,
          rescheduleSlot.hora_inicio,
          rescheduleSlot.hora_fim
        );
      });
      const updated = findBookingByProtocol(
        cloudStore.getState(),
        foundLookup.agendamento.protocolo,
        lookupContact || foundLookup.agendamento.lead_whatsapp || foundLookup.agendamento.lead_email || ""
      );
      setFoundLookup({ agendamento: updated.agendamento, evento: updated.evento });
      setRescheduleOpen(false);
      setRescheduleSlot(null);
      toast.success("Horário remarcado com sucesso!");
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível remarcar.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderCustomField = (field: AgendaFormField) => {
    const val = customAnswers[field.id_campo] || "";
    const setVal = (next: string) =>
      setCustomAnswers((prev) => ({ ...prev, [field.id_campo]: next }));

    const inputClass =
      "w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-colors";

    if (field.tipo === "TEXTO_LONGO") {
      return (
        <textarea
          rows={3}
          required={field.obrigatorio}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder={field.placeholder || "Digite sua resposta..."}
          className={inputClass}
        />
      );
    }

    if (field.tipo === "SELECAO_UNICA") {
      return (
        <select
          required={field.obrigatorio}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          className={inputClass}
        >
          <option value="">Selecione uma opção...</option>
          {(field.opcoes || []).map((op, i) => (
            <option key={i} value={op}>
              {op}
            </option>
          ))}
        </select>
      );
    }

    if (field.tipo === "SELECAO_MULTIPLA") {
      const selectedList = val ? val.split(" | ") : [];
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(field.opcoes || []).map((op, i) => {
            const checked = selectedList.includes(op);
            return (
              <label
                key={i}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium cursor-pointer transition-colors",
                  checked
                    ? "border-orange-500 bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    const next = checked
                      ? selectedList.filter((item) => item !== op)
                      : [...selectedList, op];
                    setVal(next.join(" | "));
                  }}
                />
                <span>{op}</span>
              </label>
            );
          })}
        </div>
      );
    }

    if (field.tipo === "SIM_NAO") {
      return (
        <div className="flex items-center gap-5 pt-1">
          {["Sim", "Não"].map((opt) => {
            const active = val === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => setVal(opt)}
                className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                <span
                  className={cn(
                    "h-4 w-4 rounded-full border flex items-center justify-center transition-colors",
                    active
                      ? "border-orange-600 bg-orange-600"
                      : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  )}
                >
                  {active && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                </span>
                <span>{opt}</span>
              </button>
            );
          })}
        </div>
      );
    }

    return (
      <input
        type={
          field.tipo === "EMAIL"
            ? "email"
            : field.tipo === "NUMERO"
            ? "number"
            : field.tipo === "DATA"
            ? "date"
            : "text"
        }
        required={field.obrigatorio}
        value={val}
        onChange={(e) =>
          setVal(field.tipo === "TELEFONE" ? applyWhatsAppMask(e.target.value) : e.target.value)
        }
        placeholder={field.placeholder || ""}
        className={inputClass}
      />
    );
  };

  const renderEventThumb = (ev: AgendaEvent, size: "md" | "lg" = "lg") => {
    const dim = size === "lg" ? "h-16 w-16" : "h-14 w-14";
    if (ev.imagem_url) {
      return (
        <img
          src={ev.imagem_url}
          alt={ev.nome}
          className={cn(dim, "rounded-xl object-cover border border-slate-200/80 dark:border-slate-700 shrink-0")}
        />
      );
    }
    return (
      <div
        className={cn(
          dim,
          "rounded-xl bg-gradient-to-br from-orange-500/15 to-amber-500/10 border border-orange-200 dark:border-orange-800/50 text-orange-600 dark:text-orange-400 grid place-items-center shrink-0"
        )}
      >
        <Calendar className="h-6 w-6" />
      </div>
    );
  };

  const getModalityLabel = (tipo?: string) => {
    if (tipo === "PRESENCIAL") return "Agendamento Presencial";
    if (tipo === "HIBRIDO") return "Agendamento Híbrido";
    return "Agendamento Online";
  };

  return (
    <div className={cn(darkTheme ? "dark" : "")}>
      <div className="min-h-screen bg-[#F8F9FA] dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors flex flex-col">
        {/* Top Clean 3-Zone Header */}
        <header className="border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-30">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
            <Link
              to="/agendar"
              onClick={() => setBookingResult(null)}
              className="flex items-center gap-2.5 min-w-0 shrink-0"
            >
              {db.company?.logo ? (
                <img
                  src={db.company.logo}
                  alt={companyName}
                  className="h-8 w-8 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                />
              ) : (
                <div className="h-8 w-8 rounded-lg bg-orange-600 text-white grid place-items-center shrink-0 font-bold text-xs shadow-sm">
                  <Calendar className="h-4 w-4" />
                </div>
              )}
              <span className="text-sm sm:text-base font-extrabold tracking-tight text-slate-900 dark:text-white truncate max-w-[180px] sm:max-w-[240px]">
                {companyName}
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-6 text-xs font-semibold">
              <Link
                to="/agendar"
                onClick={() => setBookingResult(null)}
                className={cn(
                  "whitespace-nowrap transition-colors",
                  !slug
                    ? "text-orange-600 dark:text-orange-400"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                Eventos Abertos
              </Link>
              <button
                type="button"
                onClick={() => setMyBookingsOpen(true)}
                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white whitespace-nowrap cursor-pointer"
              >
                Acompanhar Protocolo
              </button>
            </nav>

            <div className="flex items-center gap-2 shrink-0">
              {slug && (
                <Link
                  to="/agendar"
                  onClick={() => setBookingResult(null)}
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-orange-200 dark:border-orange-800/60 bg-orange-50/40 dark:bg-orange-950/20 px-3 py-1.5 text-xs font-semibold text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/40 transition-colors whitespace-nowrap"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Todos os Eventos
                </Link>
              )}

              <button
                type="button"
                onClick={() => setMyBookingsOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-orange-300 transition-colors cursor-pointer whitespace-nowrap"
              >
                <CalendarCheck className="h-3.5 w-3.5 text-orange-600" />
                <span>Meus Agendamentos</span>
              </button>

              <button
                type="button"
                onClick={() => setDarkTheme((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                title="Alternar tema claro/escuro"
              >
                {darkTheme ? (
                  <>
                    <Sun className="h-3.5 w-3.5 text-amber-500" />
                    <span className="hidden sm:inline">Claro</span>
                  </>
                ) : (
                  <>
                    <Moon className="h-3.5 w-3.5 text-slate-500" />
                    <span className="hidden sm:inline">Escuro</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-7 md:py-10">
          {bootstrapping && events.length === 0 ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
              <Loader2 className="h-7 w-7 animate-spin text-orange-600" />
              <span className="text-sm font-medium">Carregando disponibilidade...</span>
            </div>
          ) : !slug ? (
            /* IMAGE 6: PORTAL HUB (/agendar) */
            <div className="space-y-8">
              {/* Top Hero Card */}
              <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2 max-w-xl">
                  <div className="text-xs font-bold text-orange-600 dark:text-orange-400">
                    Portal Público de Atendimentos · {companyName}
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight text-slate-900 dark:text-white">
                    Acompanhe seu agendamento e escolha novos eventos
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    Consulte o status do seu protocolo em tempo real, remarque ou cancele quando precisar e inscreva-se nos demais eventos abertos ou na lista de espera.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setMyBookingsOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 px-4 py-2.5 text-xs font-bold text-white transition-colors cursor-pointer"
                  >
                    <Search className="h-3.5 w-3.5" />
                    Consultar Protocolo
                  </button>

                  {companyPhone && (
                    <a
                      href={buildWhatsAppLink(
                        companyPhone,
                        `Olá! Gostaria de informações sobre agendamentos na ${companyName}.`
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white transition-colors"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      Falar no WhatsApp
                    </a>
                  )}
                </div>
              </div>

              {/* Meus Agendamentos Section */}
              <section className="space-y-3">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Meus Agendamentos
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Acompanhe suas reservas realizadas neste dispositivo ou consulte outro código de protocolo.
                  </p>
                </div>

                {hydratedDeviceBookings.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Nenhum agendamento salvo neste dispositivo ainda. Já possui um código?
                    </span>
                    <button
                      type="button"
                      onClick={() => setMyBookingsOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-orange-300 cursor-pointer w-fit"
                    >
                      <Search className="h-3.5 w-3.5 text-orange-600" />
                      Buscar por Protocolo
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {hydratedDeviceBookings.map((item) => (
                      <div
                        key={item.protocolo}
                        className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex items-center justify-between gap-4 shadow-xs"
                      >
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-1.5 text-[11px] font-bold">
                            <span className="font-mono text-orange-600 dark:text-orange-400">
                              {item.protocolo}
                            </span>
                            <span className="text-slate-300 dark:text-slate-600">•</span>
                            <span
                              className={cn(
                                item.status === "CANCELADO"
                                  ? "text-red-600 dark:text-red-400"
                                  : "text-emerald-600 dark:text-emerald-400"
                              )}
                            >
                              {getBookingStatusLabel(item.status)}
                            </span>
                          </div>
                          <div className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                            {item.evento_nome}
                          </div>
                          <div className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                            {formatDateBR(item.data)} às {item.hora_inicio}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => openProtocolDirect(item)}
                          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:border-orange-300 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shrink-0 cursor-pointer transition-colors"
                        >
                          Acompanhar / Alterar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Eventos Disponíveis & Próximas Turmas */}
              <section className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                      Eventos Disponíveis &amp; Próximas Turmas
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Inscreva-se nos eventos com agenda aberta ou deixe seu contato na lista de espera dos encerrados e pausados.
                    </p>
                  </div>

                  <div className="inline-flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1 w-fit shrink-0">
                    {(
                      [
                        { id: "todos", label: `Todos (${portalEventsWithSummary.length})` },
                        { id: "abertos", label: `Abertos (${openCount})` },
                        { id: "espera", label: `Lista de Espera (${waitlistCount})` },
                      ] as const
                    ).map((tab) => {
                      const active = portalFilter === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setPortalFilter(tab.id)}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap",
                            active
                              ? "bg-orange-600 text-white shadow-xs"
                              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                          )}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {filteredPortalEvents.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center space-y-2">
                    <Calendar className="h-7 w-7 mx-auto text-slate-400" />
                    <h3 className="text-base font-bold">Nenhum evento encontrado nesta categoria</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Alterne os filtros acima ou utilize seu protocolo em &ldquo;Meus Agendamentos&rdquo;.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredPortalEvents.map(({ ev, summary, openDaysCount, prod }) => {
                      const href = buildPublicAgendaPath(ev.slug, {
                        nome: qs.nome,
                        whatsapp: qs.whatsapp,
                        email: qs.email,
                        lp: qs.lp,
                        lp_title: qs.lp_title,
                        utm_source: qs.utm_source,
                        utm_medium: qs.utm_medium,
                        utm_campaign: qs.utm_campaign,
                      });

                      return (
                        <div
                          key={ev.id_evento}
                          className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col justify-between gap-4 shadow-sm hover:border-orange-300/80 transition-colors"
                        >
                          <div className="space-y-3">
                            <div className="flex items-start gap-3">
                              {renderEventThumb(ev, "md")}
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 text-[11px] font-bold">
                                  <span
                                    className={cn(
                                      summary.disponivel
                                        ? "text-emerald-600 dark:text-emerald-400"
                                        : "text-amber-600 dark:text-amber-400"
                                    )}
                                  >
                                    {summary.disponivel ? "Inscrições Abertas" : "Lista de Espera"}
                                  </span>
                                  <span className="text-slate-300">·</span>
                                  <span className="text-slate-500 dark:text-slate-400 font-medium tabular-nums">
                                    {ev.duracao_minutos} min
                                  </span>
                                </div>
                                <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-snug mt-0.5 line-clamp-2">
                                  {ev.nome}
                                </h3>
                              </div>
                            </div>

                            {ev.descricao && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                {ev.descricao}
                              </p>
                            )}

                            {prod && (
                              <div className="flex items-center justify-between gap-2 text-xs pt-1">
                                <span className="text-slate-600 dark:text-slate-300 truncate">
                                  {prod.name}
                                </span>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400 shrink-0 tabular-nums">
                                  {formatBRLPrice(prod.salePrice)}
                                </span>
                              </div>
                            )}

                            <div
                              className={cn(
                                "text-xs font-bold tabular-nums",
                                summary.disponivel
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-amber-600 dark:text-amber-400"
                              )}
                            >
                              {summary.disponivel
                                ? `${summary.vagasTotais} vagas em ${openDaysCount} ${
                                    openDaysCount === 1 ? "dia" : "dias"
                                  }`
                                : "Agenda sem vagas no momento"}
                            </div>
                          </div>

                          <a
                            href={href}
                            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-700 px-4 py-2.5 text-xs font-bold text-white transition-colors"
                          >
                            {summary.disponivel ? "Agendar neste Evento" : "Entrar na Lista de Espera"}
                            <ArrowRight className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          ) : !targetEvent ? (
            /* EVENTO NÃO ENCONTRADO */
            <div className="max-w-lg mx-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center space-y-4 shadow-sm">
              <AlertCircle className="h-8 w-8 text-amber-500 mx-auto" />
              <div className="space-y-1">
                <h1 className="text-xl font-bold">Evento não encontrado</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  O link acessado pode ter sido alterado ou o evento foi removido.
                </p>
              </div>
              <Link
                to="/agendar"
                className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 px-4 py-2 text-xs font-semibold text-white"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Ver todos os eventos
              </Link>
            </div>
          ) : bookingResult ? (
            /* IMAGE 5: COMPROVANTE DE CONFIRMAÇÃO + REDIRECT COUNTDOWN */
            <div className="max-w-lg mx-auto rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-7 sm:p-9 shadow-sm space-y-6">
              <div className="text-center space-y-3">
                <div className="h-12 w-12 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 grid place-items-center mx-auto">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div className="space-y-1.5">
                  <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    Obrigado pelo seu agendamento, {nome.trim().split(/\s+/)[0] || "Visitante"}!
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                    Sua vaga foi reservada com sucesso. Guarde o protocolo abaixo para acompanhar ou alterar seu atendimento na Landing Page.
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-5 text-center space-y-1">
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Número do Protocolo
                </div>
                <div className="inline-flex items-center gap-2">
                  <span className="font-mono text-lg sm:text-xl font-extrabold tracking-wide text-orange-600 dark:text-orange-400">
                    {bookingResult.protocolo}
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(bookingResult.protocolo);
                        setCopiedProtocol(true);
                        setTimeout(() => setCopiedProtocol(false), 2000);
                      } catch {}
                    }}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-orange-600 cursor-pointer"
                    title="Copiar protocolo"
                  >
                    {copiedProtocol ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500 dark:text-slate-400">Evento:</span>
                  <span className="font-bold text-slate-900 dark:text-white text-right">
                    {bookingResult.evento_nome}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500 dark:text-slate-400">Data e Horário:</span>
                  <span className="font-bold font-mono tabular-nums text-slate-900 dark:text-white text-right">
                    {formatDateBR(bookingResult.data)} às {bookingResult.hora_inicio}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500 dark:text-slate-400">Participante:</span>
                  <span className="font-bold text-slate-900 dark:text-white text-right">{nome}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500 dark:text-slate-400">WhatsApp:</span>
                  <span className="font-bold font-mono tabular-nums text-slate-900 dark:text-white text-right">
                    {whatsapp}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500 dark:text-slate-400">Local / Origem:</span>
                  <span className="font-bold text-slate-900 dark:text-white text-right">
                    {localEscolha || targetEvent.local_evento}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-orange-200 dark:border-orange-800/50 bg-orange-50/75 dark:bg-orange-950/30 p-4 space-y-1">
                <div className="text-xs font-bold text-orange-700 dark:text-orange-400">
                  Orientações do Atendimento
                </div>
                <p className="text-xs text-orange-900/80 dark:text-orange-200 leading-relaxed">
                  {bookingResult.mensagem_confirmacao ||
                    "Parabéns! Sua sessão está confirmada. Em breve entraremos em contato via WhatsApp com mais detalhes."}
                </p>
              </div>

              {/* Countdown Bar */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400">
                    {autoRedirectPaused
                      ? "Redirecionamento pausado"
                      : "Entrando no portal de eventos e acompanhamentos em:"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setAutoRedirectPaused((v) => !v)}
                    className="font-bold text-orange-600 dark:text-orange-400 tabular-nums cursor-pointer hover:underline"
                  >
                    {autoRedirectPaused ? "Retomar" : `${redirectSeconds}s`}
                  </button>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-orange-600 transition-all duration-1000 ease-linear"
                    style={{ width: `${Math.max(0, Math.min(100, ((8 - redirectSeconds) / 8) * 100))}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setBookingResult(null);
                    navigate({ to: "/agendar" });
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-700 py-3 text-xs font-bold text-white transition-colors cursor-pointer shadow-sm"
                >
                  Acompanhar Meu Agendamento e Ver Eventos
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>

                <a
                  href={buildWhatsAppLink(
                    companyPhone || whatsapp,
                    `Olá! Confirmei meu agendamento para ${bookingResult.evento_nome} (${formatDateBR(
                      bookingResult.data
                    )} às ${bookingResult.hora_inicio}). Protocolo: ${bookingResult.protocolo}`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-3 text-xs font-bold text-white transition-colors"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  Enviar Comprovante pelo WhatsApp
                </a>

                <div className="text-center pt-1">
                  <a
                    href={buildGoogleCalendarTemplateLink({
                      title: bookingResult.evento_nome,
                      description: `Protocolo: ${bookingResult.protocolo}`,
                      location: localEscolha || targetEvent.local_evento,
                      date: bookingResult.data,
                      startTime: bookingResult.hora_inicio,
                      endTime: bookingResult.hora_fim,
                    })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-orange-600"
                  >
                    <ExternalLink className="h-3 w-3" /> Adicionar lembrete ao Google Calendar
                  </a>
                </div>
              </div>
            </div>
          ) : !eventSummary?.disponivel ? (
            /* EVENTO LOTADO / PAUSADO -> LISTA DE ESPERA */
            <div className="max-w-xl mx-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-7 sm:p-9 space-y-6 shadow-sm">
              <div className="space-y-2">
                <div className="text-xs font-bold text-amber-600 dark:text-amber-400">
                  {eventSummary?.motivo === "ENCERRADO"
                    ? "Evento Encerrado"
                    : eventSummary?.motivo === "LOTADO"
                    ? "Vagas Preenchidas"
                    : "Agenda Temporariamente Fechada"}
                </div>
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                  {targetEvent.nome}
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {eventSummary?.mensagem}
                </p>
              </div>

              {wlResult ? (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" /> Cadastro Confirmado na Lista de Espera
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {wlResult.mensagem}
                  </p>
                </div>
              ) : targetEvent.permitir_lista_espera !== false ? (
                <form onSubmit={handleWaitlistSubmit} className="space-y-4 border-t border-slate-200 dark:border-slate-800 pt-5">
                  <div className="text-sm font-bold">Entrar na Lista de Espera Prioritária</div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold mb-1">Nome Completo *</label>
                      <input
                        type="text"
                        required
                        value={wlNome}
                        onChange={(e) => setWlNome(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm focus:outline-none focus:border-orange-500"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold mb-1">WhatsApp *</label>
                        <input
                          type="tel"
                          required
                          value={wlWhatsapp}
                          onChange={(e) => setWlWhatsapp(applyWhatsAppMask(e.target.value))}
                          placeholder="(11) 99999-9999"
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm focus:outline-none focus:border-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1">E-mail</label>
                        <input
                          type="email"
                          value={wlEmail}
                          onChange={(e) => setWlEmail(e.target.value)}
                          placeholder="voce@empresa.com"
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm focus:outline-none focus:border-orange-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Preferência de Horário / Observação</label>
                      <textarea
                        rows={2}
                        value={wlObs}
                        onChange={(e) => setWlObs(e.target.value)}
                        placeholder="Ex: Prefiro no período da manhã..."
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-xl bg-orange-600 hover:bg-orange-700 py-3 text-xs font-bold text-white cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? "Enviando..." : "Garantir Lugar na Lista de Espera"}
                  </button>
                </form>
              ) : null}
            </div>
          ) : (
            /* IMAGES 2, 3, 4: SINGLE EVENT 2-COLUMN WIZARD */
            <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-12">
              {/* Left Summary Column */}
              <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-slate-100 dark:border-slate-800 p-6 sm:p-7 flex flex-col justify-between gap-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3.5">
                    {renderEventThumb(targetEvent, "lg")}
                    <div className="min-w-0">
                      <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        {getModalityLabel(targetEvent.tipo_evento)} · {targetEvent.duracao_minutos} min
                      </div>
                      <h1 className="text-xl font-extrabold tracking-tight leading-snug text-slate-900 dark:text-white mt-0.5">
                        {targetEvent.nome}
                      </h1>
                    </div>
                  </div>

                  {targetEvent.descricao && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {targetEvent.descricao}
                    </p>
                  )}

                  {linkedProduct && (
                    <div className="flex items-center justify-between gap-2 text-xs pt-1">
                      <div className="flex items-center gap-1.5 min-w-0 text-slate-600 dark:text-slate-300">
                        <Tag className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">{linkedProduct.name}</span>
                      </div>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 shrink-0 tabular-nums">
                        {formatBRLPrice(linkedProduct.salePrice)}
                      </span>
                    </div>
                  )}

                  {selectedDate && (
                    <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 space-y-2.5 text-xs">
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        Resumo da seleção
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                          <Calendar className="h-3.5 w-3.5 text-orange-600" />
                          Data:
                        </span>
                        <span className="font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                          {formatDateBR(selectedDate)}
                        </span>
                      </div>
                      {selectedSlot && (
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                            <Clock className="h-3.5 w-3.5 text-orange-600" />
                            Horário:
                          </span>
                          <span className="font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                            {selectedSlot.hora_inicio} às {selectedSlot.hora_fim}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Company Contact Footer Card */}
                {(companyPhone || companyEmail || companyAddress || companyDoc) && (
                  <div className="pt-5 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                    {companyPhone && (
                      <div>
                        <a
                          href={buildWhatsAppLink(companyPhone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/30 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 transition-colors"
                        >
                          <MessageCircle className="h-3.5 w-3.5 shrink-0" />
                          <span>{companyPhone}</span>
                        </a>
                      </div>
                    )}

                    {companyEmail && (
                      <div>
                        <a
                          href={`mailto:${companyEmail}`}
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors max-w-full"
                        >
                          <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{companyEmail}</span>
                        </a>
                      </div>
                    )}

                    {companyAddress && (
                      <div className="flex items-start gap-1.5 text-[11px] text-slate-400 leading-snug pt-0.5">
                        <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <span>{companyAddress}</span>
                      </div>
                    )}

                    {companyDoc && (
                      <div className="text-[11px] text-slate-400 font-mono">
                        CNPJ: {companyDoc}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Interactive Stepper */}
              <div className="lg:col-span-8 p-6 sm:p-8 flex flex-col">
                {/* Stepper Pills */}
                <div className="grid grid-cols-3 gap-2.5 sm:gap-3 pb-5 mb-6 border-b border-slate-100 dark:border-slate-800">
                  {[
                    { num: 1 as const, label: "1. Data" },
                    { num: 2 as const, label: "2. Horário" },
                    { num: 3 as const, label: "3. Dados" },
                  ].map((s) => {
                    const active = step === s.num;
                    const completed = step > s.num;
                    const reachable =
                      s.num === 1 ||
                      (s.num === 2 && Boolean(selectedDate)) ||
                      (s.num === 3 && Boolean(selectedSlot));

                    return (
                      <button
                        key={s.num}
                        type="button"
                        disabled={!reachable}
                        onClick={() => reachable && setStep(s.num)}
                        className={cn(
                          "rounded-xl border px-3 py-2.5 flex items-center justify-center gap-2 text-xs font-semibold transition-all cursor-pointer disabled:cursor-not-allowed",
                          active
                            ? "border-orange-300 dark:border-orange-700 bg-orange-50/70 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 font-bold"
                            : completed
                            ? "border-slate-200/80 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200"
                            : "border-transparent bg-slate-50/50 dark:bg-slate-800/30 text-slate-400"
                        )}
                      >
                        <span
                          className={cn(
                            "h-5 w-5 rounded-full grid place-items-center text-[11px] font-bold shrink-0",
                            active
                              ? "bg-orange-600 text-white"
                              : completed
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                          )}
                        >
                          {completed ? <Check className="h-3 w-3" /> : s.num}
                        </span>
                        <span className="truncate">{s.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* STEP 1: DATE (IMAGE 2) */}
                {step === 1 && (
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                        Selecione o Dia do Atendimento
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Clique na data desejada para ver os horários disponíveis.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-[410px] overflow-y-auto pr-1">
                      {upcomingDates
                        .filter((d) => d.vagasDia > 0)
                        .map((d) => {
                          const isSelected = selectedDate === d.dataIso;
                          return (
                            <button
                              key={d.dataIso}
                              type="button"
                              onClick={() => {
                                setSelectedDate(d.dataIso);
                                setSelectedSlot(null);
                                setStep(2);
                              }}
                              className={cn(
                                "rounded-xl border p-4 text-center transition-all cursor-pointer",
                                isSelected
                                  ? "border-orange-500 bg-orange-50/60 dark:bg-orange-950/30 ring-1 ring-orange-400/40"
                                  : "border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-950/50 hover:border-orange-400 hover:bg-orange-50/20"
                              )}
                            >
                              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                {getFriendlyDayHeader(d.dataIso)}
                              </div>
                              <div className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white mt-1 tabular-nums">
                                {formatDayMonthShort(d.dataIso)}
                              </div>
                              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mt-1">
                                {d.diaSemana}
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* STEP 2: TIME SLOT (IMAGE 3) */}
                {step === 2 && (
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                          Horários para {formatDateBR(selectedDate)}
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Escolha o melhor horário com vagas livres.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer shrink-0 transition-colors"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" /> Trocar Dia
                      </button>
                    </div>

                    {slotsForDate.filter((s) => s.disponivel).length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 p-8 text-center text-xs text-slate-500 space-y-2">
                        <div>Nenhum horário livre restante nesta data.</div>
                        <button
                          type="button"
                          onClick={() => setStep(1)}
                          className="text-orange-600 font-semibold cursor-pointer underline"
                        >
                          Escolher outro dia
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {slotsForDate.map((slot) => {
                          const active = selectedSlot?.id_horario === slot.id_horario;
                          return (
                            <button
                              key={slot.id_horario}
                              type="button"
                              disabled={!slot.disponivel}
                              onClick={() => {
                                setSelectedSlot(slot);
                                setStep(3);
                              }}
                              className={cn(
                                "rounded-xl border px-4 py-3.5 flex items-center justify-between text-left transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
                                active
                                  ? "border-orange-500 bg-orange-50/70 dark:bg-orange-950/30"
                                  : "border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-950/50 hover:border-orange-400"
                              )}
                            >
                              <div>
                                <div className="font-mono text-sm font-bold tabular-nums text-slate-900 dark:text-white">
                                  {slot.hora_inicio} - {slot.hora_fim}
                                </div>
                                <div
                                  className={cn(
                                    "text-xs font-medium tabular-nums mt-0.5",
                                    slot.disponivel
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : "text-slate-400"
                                  )}
                                >
                                  {slot.disponivel
                                    ? `${slot.vagas_restantes} ${
                                        slot.vagas_restantes === 1 ? "vaga" : "vagas"
                                      }`
                                    : slot.motivo_bloqueio || "Indisponível"}
                                </div>
                              </div>
                              <ChevronRight className="h-4 w-4 text-orange-500 shrink-0" />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 3: LEAD & CUSTOM FORM (IMAGE 4) */}
                {step === 3 && (
                  <form onSubmit={handleConfirmBooking} className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                          Complete seus Dados
                        </h2>
                        <p className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 mt-0.5">
                          {formatDateBR(selectedDate)} · {selectedSlot?.hora_inicio} às{" "}
                          {selectedSlot?.hora_fim}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer shrink-0 transition-colors"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" /> Trocar Horário
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                          Nome Completo <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={nome}
                          onChange={(e) => setNome(e.target.value)}
                          placeholder="Seu nome completo"
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                          WhatsApp com DDD <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="tel"
                          required
                          value={whatsapp}
                          onChange={(e) => setWhatsapp(applyWhatsAppMask(e.target.value))}
                          placeholder="(11) 99999-9999"
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                          E-mail
                        </label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="seuemail@exemplo.com"
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                          Bairro / Escola / Local <span className="text-red-500">*</span>
                        </label>
                        {targetEvent.local_opcoes && targetEvent.local_opcoes.length > 0 ? (
                          <select
                            required
                            value={localEscolha}
                            onChange={(e) => setLocalEscolha(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                          >
                            {targetEvent.local_opcoes.map((loc, idx) => (
                              <option key={idx} value={loc}>
                                {loc}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            required
                            value={localEscolha}
                            onChange={(e) => setLocalEscolha(e.target.value)}
                            placeholder="Informe: Bairro / Escola / Local"
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                          />
                        )}
                      </div>
                    </div>

                    {/* Dynamic Form Builder Fields */}
                    {eventFields.length > 0 && (
                      <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Informações adicionais
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          {eventFields.map((field) => {
                            const spanFull =
                              field.tipo === "TEXTO_LONGO" ||
                              field.tipo === "SELECAO_MULTIPLA" ||
                              field.tipo === "SIM_NAO";
                            return (
                              <div key={field.id_campo} className={spanFull ? "sm:col-span-2" : ""}>
                                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                                  {field.label}{" "}
                                  {field.obrigatorio && <span className="text-red-500">*</span>}
                                </label>
                                {renderCustomField(field)}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-700 py-3.5 text-sm font-bold text-white transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Confirmando Agendamento...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4" /> Confirmar Agendamento
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200/80 dark:border-slate-800 py-5">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-4 text-xs text-slate-400">
            <span>
              © {new Date().getFullYear()} {companyName}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              Agendamento seguro
            </span>
          </div>
        </footer>

        {/* Meus Agendamentos / Protocolo Modal */}
        {myBookingsOpen && (
          <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden my-6">
              <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="text-sm font-extrabold">Consultar / Gerenciar Agendamento</div>
                <button
                  type="button"
                  onClick={() => setMyBookingsOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <form onSubmit={handleLookupBooking} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Código do Protocolo</label>
                    <input
                      type="text"
                      required
                      value={lookupProtocol}
                      onChange={(e) => setLookupProtocol(e.target.value)}
                      placeholder="Ex: PROT-202611-A1B2"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-mono uppercase focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      WhatsApp ou E-mail cadastrado
                    </label>
                    <input
                      type="text"
                      required
                      value={lookupContact}
                      onChange={(e) => setLookupContact(e.target.value)}
                      placeholder="(11) 99999-9999 ou seu@email.com"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  {lookupError && (
                    <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-600 dark:text-red-400">
                      {lookupError}
                    </div>
                  )}
                  <button
                    type="submit"
                    className="w-full rounded-xl bg-orange-600 hover:bg-orange-700 py-2.5 text-xs font-bold text-white cursor-pointer"
                  >
                    Buscar Agendamento
                  </button>
                </form>

                {foundLookup && (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-orange-600 dark:text-orange-400">
                        {foundLookup.agendamento.protocolo}
                      </span>
                      <span className="text-[11px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
                        {getBookingStatusLabel(foundLookup.agendamento.status)}
                      </span>
                    </div>
                    <div className="text-sm font-bold">
                      {foundLookup.agendamento.evento_nome || foundLookup.evento?.nome}
                    </div>
                    <div className="text-xs font-mono tabular-nums text-slate-600 dark:text-slate-400">
                      {formatDateBR(foundLookup.agendamento.data_agendamento)} ·{" "}
                      {foundLookup.agendamento.hora_inicio} — {foundLookup.agendamento.hora_fim}
                    </div>

                    {foundLookup.agendamento.status !== "CANCELADO" &&
                      foundLookup.agendamento.status !== "REALIZADO" && (
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                          {foundLookup.evento && (
                            <button
                              type="button"
                              onClick={() => setRescheduleOpen((v) => !v)}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold cursor-pointer hover:border-orange-400"
                            >
                              <RefreshCw className="h-3.5 w-3.5 text-orange-600" /> Remarcar
                            </button>
                          )}
                          {foundLookup.evento?.permite_cancelamento !== false && (
                            <button
                              type="button"
                              disabled={submitting}
                              onClick={handleCancelFoundBooking}
                              className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 cursor-pointer"
                            >
                              <XCircle className="h-3.5 w-3.5" /> Cancelar Horário
                            </button>
                          )}
                        </div>
                      )}

                    {rescheduleOpen && foundLookup.evento && (
                      <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
                        <div className="text-xs font-bold">Escolha nova data e horário:</div>
                        <select
                          value={rescheduleDate}
                          onChange={(e) => {
                            setRescheduleDate(e.target.value);
                            setRescheduleSlot(null);
                          }}
                          className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs"
                        >
                          {getEventUpcomingDates(db, foundLookup.evento)
                            .filter((d) => d.vagasDia > 0)
                            .map((d) => (
                              <option key={d.dataIso} value={d.dataIso}>
                                {d.rotulo} ({d.diaSemana}) · {d.vagasDia} vagas
                              </option>
                            ))}
                        </select>
                        <div className="grid grid-cols-3 gap-1.5">
                          {getEventSlotsForDate(db, foundLookup.evento.id_evento, rescheduleDate)
                            .filter((s) => s.disponivel)
                            .map((s) => (
                              <button
                                key={s.id_horario}
                                type="button"
                                onClick={() => setRescheduleSlot(s)}
                                className={cn(
                                  "rounded-lg border py-1.5 text-xs font-mono cursor-pointer",
                                  rescheduleSlot?.id_horario === s.id_horario
                                    ? "border-orange-600 bg-orange-600 text-white"
                                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                                )}
                              >
                                {s.hora_inicio}
                              </button>
                            ))}
                        </div>
                        <button
                          type="button"
                          disabled={!rescheduleSlot || submitting}
                          onClick={handleConfirmPublicReschedule}
                          className="w-full rounded-lg bg-orange-600 hover:bg-orange-700 py-2 text-xs font-bold text-white cursor-pointer disabled:opacity-40"
                        >
                          Confirmar Remarcação
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
