import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Calendar,
  CalendarCheck,
  CalendarClock,
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
  BellRing,
  PauseCircle,
  X,
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
  initialThankYou?: boolean;
}

interface StoredDeviceBooking {
  protocolo: string;
  id_agendamento: string;
  evento_nome: string;
  slug_evento?: string;
  nome?: string;
  whatsapp?: string;
  email?: string;
  local?: string;
  mensagem_confirmacao?: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  contato: string;
  criado_em: string;
}

interface StoredLeadProfile {
  nome: string;
  whatsapp: string;
  email: string;
  local: string;
}

const DEVICE_BOOKINGS_KEY = "salead_public_protocols";
const LEAD_PROFILE_KEY = "salead_public_lead_profile_v1";
const PUBLIC_THEME_KEY = "agenda_public_theme";

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
    const updated = [entry, ...existing].slice(0, 12);
    window.localStorage.setItem(DEVICE_BOOKINGS_KEY, JSON.stringify(updated));
  } catch {}
}

function readLeadProfile(): StoredLeadProfile {
  if (typeof window === "undefined") return { nome: "", whatsapp: "", email: "", local: "" };
  try {
    const raw = window.localStorage.getItem(LEAD_PROFILE_KEY);
    if (!raw) return { nome: "", whatsapp: "", email: "", local: "" };
    const parsed = JSON.parse(raw);
    return {
      nome: typeof parsed?.nome === "string" ? parsed.nome : "",
      whatsapp: typeof parsed?.whatsapp === "string" ? parsed.whatsapp : "",
      email: typeof parsed?.email === "string" ? parsed.email : "",
      local: typeof parsed?.local === "string" ? parsed.local : "",
    };
  } catch {
    return { nome: "", whatsapp: "", email: "", local: "" };
  }
}

function saveLeadProfile(profile: StoredLeadProfile) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LEAD_PROFILE_KEY, JSON.stringify(profile));
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

export const PublicBookingView: React.FC<PublicBookingViewProps> = ({
  slug,
  initialThankYou = false,
}) => {
  const navigate = useNavigate();
  const [db, setDb] = useState<CloudDatabase>(() => cloudStore.getState());
  const [bootstrapping, setBootstrapping] = useState<boolean>(true);
  const [resolvingSlug, setResolvingSlug] = useState<boolean>(Boolean(slug));

  // Public theme state — synchronizes directly with <html>.dark and root wrapper
  const [darkTheme, setDarkTheme] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(PUBLIC_THEME_KEY) === "dark";
  });

  const applyPublicThemeToDom = (isDark: boolean) => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", isDark);
      document.documentElement.style.colorScheme = isDark ? "dark" : "light";
      document.body.style.backgroundColor = isDark ? "#0a0a0a" : "#f5f5f5";
      document.body.style.color = isDark ? "#f5f5f5" : "#171717";
    }
    try {
      window.localStorage.setItem(PUBLIC_THEME_KEY, isDark ? "dark" : "light");
    } catch {}
  };

  useLayoutEffect(() => {
    applyPublicThemeToDom(darkTheme);
  }, [darkTheme]);

  useEffect(() => {
    return () => {
      if (typeof window === "undefined" || typeof document === "undefined") return;
      const nextPath = window.location.pathname || "";
      const stillPublic =
        nextPath === "/agendar" || nextPath.startsWith("/agendar/") || nextPath === "/obrigado";
      if (!stillPublic) {
        const appTheme = window.localStorage.getItem("comet_theme");
        const restoreDark = appTheme !== "light";
        document.documentElement.classList.toggle("dark", restoreDark);
        document.documentElement.style.colorScheme = restoreDark ? "dark" : "light";
        document.body.style.backgroundColor = "";
        document.body.style.color = "";
      }
    };
  }, []);

  const handleTogglePublicTheme = () => {
    setDarkTheme((prev) => {
      const next = !prev;
      applyPublicThemeToDom(next);
      return next;
    });
  };

  const qs = useMemo(() => getSearchParamsMap(), []);
  const savedProfile = useMemo(() => readLeadProfile(), []);

  // Portal Hub state
  const [portalFilter, setPortalFilter] = useState<"todos" | "abertos" | "espera">("todos");
  const [deviceBookings, setDeviceBookings] = useState<StoredDeviceBooking[]>(() => readDeviceBookings());
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
  const [logoError, setLogoError] = useState(false);

  // Wizard states
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<AgendaSlotAvailability | null>(null);

  // Form states
  const [nome, setNome] = useState(qs.nome || qs.name || savedProfile.nome || "");
  const [whatsapp, setWhatsapp] = useState(
    qs.whatsapp || qs.phone
      ? applyWhatsAppMask(qs.whatsapp || qs.phone || "")
      : savedProfile.whatsapp || ""
  );
  const [email, setEmail] = useState(qs.email || savedProfile.email || "");
  const [localEscolha, setLocalEscolha] = useState(
    qs.local || qs.empresa || qs.company || savedProfile.local || ""
  );
  const [localOutro, setLocalOutro] = useState("");
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});
  const [lgpdAceito, setLgpdAceito] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Booking Confirmation / Thank You view states
  const [bookingResult, setBookingResult] = useState<BookingSuccessResult | null>(() => {
    if (!initialThankYou) return null;
    const saved = readDeviceBookings();
    const match = slug
      ? saved.find(
          (b) =>
            (b.slug_evento || "").toLowerCase() === slug.trim().toLowerCase() ||
            b.evento_nome.toLowerCase() === slug.trim().toLowerCase()
        )
      : saved[0];
    if (!match) return null;
    const ageMs = Date.now() - new Date(match.criado_em).getTime();
    if (Number.isFinite(ageMs) && ageMs <= 30 * 60 * 1000) {
      return {
        protocolo: match.protocolo,
        id_agendamento: match.id_agendamento,
        id_lead: "",
        id_task: "",
        evento_nome: match.evento_nome,
        data: match.data,
        hora_inicio: match.hora_inicio,
        hora_fim: match.hora_fim,
        responsavel_nome: "",
        mensagem_confirmacao:
          match.mensagem_confirmacao ||
          "Seu horário está confirmado! Nossa equipe entrará em contato pelo WhatsApp para enviar os detalhes.",
      };
    }
    return null;
  });
  const [thankYouParticipant, setThankYouParticipant] = useState<{
    nome: string;
    whatsapp: string;
    local: string;
  } | null>(() => {
    if (!initialThankYou) return null;
    const saved = readDeviceBookings();
    const match = slug
      ? saved.find((b) => (b.slug_evento || "").toLowerCase() === slug.trim().toLowerCase())
      : saved[0];
    if (!match) return null;
    return {
      nome: match.nome || savedProfile.nome || "",
      whatsapp: match.whatsapp || match.contato || "",
      local: match.local || savedProfile.local || "",
    };
  });
  const [copiedProtocol, setCopiedProtocol] = useState(false);
  const [redirectSeconds, setRedirectSeconds] = useState<number>(8);
  const [autoRedirectPaused, setAutoRedirectPaused] = useState<boolean>(Boolean(initialThankYou));

  // Waitlist form & Portal Waitlist Modal states
  const [waitlistModalEvent, setWaitlistModalEvent] = useState<AgendaEvent | null>(null);
  const [wlNome, setWlNome] = useState(qs.nome || qs.name || savedProfile.nome || "");
  const [wlWhatsapp, setWlWhatsapp] = useState(
    qs.whatsapp || qs.phone
      ? applyWhatsAppMask(qs.whatsapp || qs.phone || "")
      : savedProfile.whatsapp || ""
  );
  const [wlEmail, setWlEmail] = useState(qs.email || savedProfile.email || "");
  const [wlLocal, setWlLocal] = useState(qs.local || savedProfile.local || "");
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

    const matchesSlugInState = (state: CloudDatabase, rawSlug?: string): boolean => {
      if (!rawSlug) return true;
      let clean = rawSlug.trim().toLowerCase();
      try {
        clean = decodeURIComponent(rawSlug).trim().toLowerCase();
      } catch {}
      return (state.agendaEvents || []).some(
        (e: any) =>
          String(e?.slug || "").trim().toLowerCase() === clean ||
          String(e?.id_evento || "").trim().toLowerCase() === clean
      );
    };

    const loadAll = async () => {
      if (slug && !matchesSlugInState(cloudStore.getState(), slug)) {
        setResolvingSlug(true);
      }

      await Promise.allSettled([
        cloudStore.fetchPublicAgendaFromServer(slug),
        cloudStore.bootstrap(),
      ]);

      if (!mounted) return;
      let current = cloudStore.getState();
      setDb({ ...current });

      // Se abriu /agendar/:slug recém-criado e ainda não apareceu, força leitura fresca sem cache
      if (slug && !matchesSlugInState(current, slug)) {
        await Promise.allSettled([
          cloudStore.fetchPublicAgendaFromServer(slug),
          cloudStore.pullNow(false, true),
        ]);
        if (!mounted) return;
        current = cloudStore.getState();
        setDb({ ...current });

        if (!matchesSlugInState(current, slug)) {
          await cloudStore.pullNow(true, true).catch(() => null);
          if (!mounted) return;
          setDb({ ...cloudStore.getState() });
        }
      }

      if (mounted) {
        setBootstrapping(false);
        setResolvingSlug(false);
      }
    };

    loadAll();

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [slug]);

  // Reset wizard when slug or initialThankYou route changes
  useEffect(() => {
    if (!initialThankYou) {
      setBookingResult(null);
      setThankYouParticipant(null);
      setRedirectSeconds(8);
      setAutoRedirectPaused(false);
    }
    setWlResult(null);
    setStep(1);
    setSelectedDate("");
    setSelectedSlot(null);
  }, [slug, initialThankYou]);

  const events = useMemo(() => db.agendaEvents || [], [db.agendaEvents]);
  const products = useMemo(() => db.products || [], [db.products]);
  const companyName = db.company?.name || "Portal de Atendimentos";
  const companyPhone = db.company?.contact || "";
  const companyEmail = db.company?.email || "";
  const companyAddress = db.company?.address || "";
  const companyDoc = db.company?.cnpj || db.company?.document || "";

  useEffect(() => {
    setLogoError(false);
  }, [db.company?.logo]);

  const targetEvent = useMemo(() => {
    if (!slug) return null;
    let clean = slug.trim().toLowerCase();
    try {
      clean = decodeURIComponent(slug).trim().toLowerCase();
    } catch {}
    return (
      events.find(
        (e) =>
          String(e?.slug || "").trim().toLowerCase() === clean ||
          String(e?.id_evento || "").trim().toLowerCase() === clean
      ) || null
    );
  }, [events, slug]);

  const linkedProduct = useMemo(() => {
    if (!targetEvent?.product_id || targetEvent.exibir_produto_publico === false) return null;
    return products.find((p: any) => p.id === targetEvent.product_id) || null;
  }, [products, targetEvent]);

  // Increment visits counter on direct booking visit
  useEffect(() => {
    if (initialThankYou || !targetEvent || visitedEventRef.current === targetEvent.id_evento) return;
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
  }, [targetEvent, initialThankYou]);

  // Default local option when event has fixed options and no previous selection
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
        const prod =
          ev.product_id && ev.exibir_produto_publico !== false
            ? products.find((p: any) => p.id === ev.product_id)
            : null;
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

  const goToPortal = () => {
    setBookingResult(null);
    setThankYouParticipant(null);
    setWaitlistModalEvent(null);
    navigate({ to: "/agendar" });
  };

  // Auto-redirect countdown after booking confirmation (matches Image 4)
  useEffect(() => {
    if (!bookingResult || autoRedirectPaused) return;
    if (redirectSeconds <= 0) {
      goToPortal();
      return;
    }
    const timer = window.setTimeout(() => {
      setRedirectSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [bookingResult, redirectSeconds, autoRedirectPaused]);

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

    const hasLocalOpts = Boolean(targetEvent.local_opcoes && targetEvent.local_opcoes.length > 0);
    const localFinal =
      hasLocalOpts && localEscolha === "__OUTRO__"
        ? localOutro.trim()
        : localEscolha.trim();
    const localFieldLabel = targetEvent.label_local?.trim() || "Bairro / Escola / Local";

    if (!localFinal) {
      toast.error(`Informe: ${localFieldLabel}.`);
      return;
    }

    for (const f of eventFields) {
      const val = (customAnswers[f.id_campo] || "").trim();
      if (f.obrigatorio && !val) {
        toast.error(`Preencha o campo obrigatório: ${f.label}`);
        return;
      }
      if (val && f.tipo === "TELEFONE" && !isValidBRPhone(val)) {
        toast.error(`Informe um telefone válido para "${f.label}".`);
        return;
      }
      if (val && f.tipo === "EMAIL" && !isValidEmail(val)) {
        toast.error(`Informe um e-mail válido para "${f.label}".`);
        return;
      }
    }

    if (!lgpdAceito) {
      toast.error("Confirme a autorização de tratamento de dados para continuar.");
      return;
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
          empresa: localFinal,
          local: localFinal || targetEvent.local_evento,
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
          slug_evento: targetEvent.slug,
          nome: nome.trim(),
          whatsapp: whatsapp.trim(),
          email: email.trim().toLowerCase(),
          local: localFinal,
          mensagem_confirmacao: resObj.mensagem_confirmacao,
          data: resObj.data,
          hora_inicio: resObj.hora_inicio,
          hora_fim: resObj.hora_fim,
          contato: whatsapp.trim() || email.trim(),
          criado_em: new Date().toISOString(),
        });
        saveLeadProfile({
          nome: nome.trim(),
          whatsapp: whatsapp.trim(),
          email: email.trim().toLowerCase(),
          local: localFinal,
        });
        setWlNome(nome.trim());
        setWlWhatsapp(whatsapp.trim());
        setWlEmail(email.trim().toLowerCase());
        setWlLocal(localFinal);
        setDeviceBookings(readDeviceBookings());
        setThankYouParticipant({
          nome: nome.trim(),
          whatsapp: whatsapp.trim(),
          local: localFinal,
        });
        setRedirectSeconds(8);
        setAutoRedirectPaused(false);
        setBookingResult(resObj);
        toast.success("Agendamento confirmado com sucesso!");

        if (typeof window !== "undefined") {
          window.history.replaceState(
            {},
            "",
            `/agendar/${encodeURIComponent(targetEvent.slug)}/obrigado${window.location.search}`
          );
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível concluir o agendamento.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleWaitlistSubmit = async (e: React.FormEvent, evTarget?: AgendaEvent | null) => {
    e.preventDefault();
    const ev = evTarget || targetEvent || waitlistModalEvent;
    if (!ev) return;
    if (!wlNome.trim() || !isValidBRPhone(wlWhatsapp)) {
      toast.error("Informe nome e WhatsApp válido para entrar na lista de espera.");
      return;
    }
    if (wlEmail.trim() && !isValidEmail(wlEmail)) {
      toast.error("Informe um e-mail válido.");
      return;
    }
    setSubmitting(true);
    try {
      let res: WaitlistSuccessResult | null = null;
      await cloudStore.mutateAndSync((draft) => {
        res = applyWaitlistToDraft(draft, {
          slug_evento: ev.slug,
          nome: wlNome.trim(),
          whatsapp: wlWhatsapp.trim(),
          email: wlEmail.trim() || undefined,
          local: wlLocal.trim() || undefined,
          observacoes: wlObs.trim() || undefined,
        });
      });
      if (res) {
        saveLeadProfile({
          nome: wlNome.trim(),
          whatsapp: wlWhatsapp.trim(),
          email: wlEmail.trim().toLowerCase(),
          local: wlLocal.trim(),
        });
        setWlResult(res);
        toast.success("Cadastro realizado na lista de espera!");
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro ao registrar na lista de espera.");
    } finally {
      setSubmitting(false);
    }
  };

  const openWaitlistModalForEvent = (ev: AgendaEvent) => {
    const latestProfile = readLeadProfile();
    setWlNome((prev) => prev || nome || latestProfile.nome);
    setWlWhatsapp((prev) => prev || whatsapp || latestProfile.whatsapp);
    setWlEmail((prev) => prev || email || latestProfile.email);
    setWlLocal((prev) => prev || localEscolha || latestProfile.local);
    setWlObs("");
    setWlResult(null);
    setWaitlistModalEvent(ev);
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
      "w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950 px-3.5 py-2 text-sm sm:text-xs text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-colors";

    if (field.tipo === "TEXTO_LONGO") {
      return (
        <textarea
          rows={2}
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
                    : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-neutral-700 dark:text-neutral-200"
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
                className="inline-flex items-center gap-2 text-xs font-medium text-neutral-700 dark:text-neutral-200 cursor-pointer"
              >
                <span
                  className={cn(
                    "h-4 w-4 rounded-full border flex items-center justify-center transition-colors",
                    active
                      ? "border-orange-600 bg-orange-600"
                      : "border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950"
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
    const dim = size === "lg" ? "w-14 h-14 sm:w-16 sm:h-16 rounded-2xl" : "w-12 h-12 rounded-xl";
    const hasImg = Boolean(ev.imagem_url) && !imgErrors[ev.id_evento];
    if (hasImg && ev.imagem_url) {
      return (
        <img
          src={ev.imagem_url}
          alt={ev.nome}
          referrerPolicy="no-referrer"
          onError={() => setImgErrors((prev) => ({ ...prev, [ev.id_evento]: true }))}
          className={cn(
            dim,
            "object-cover border border-neutral-200 dark:border-neutral-800 shrink-0 bg-neutral-50 dark:bg-neutral-950"
          )}
        />
      );
    }
    return (
      <div
        className={cn(
          dim,
          "bg-orange-600 text-white font-bold text-lg flex items-center justify-center shrink-0"
        )}
      >
        {ev.nome.charAt(0).toUpperCase()}
      </div>
    );
  };

  const getModalityLabel = (tipo?: string) => {
    if (tipo === "PRESENCIAL") return "Agendamento Presencial";
    if (tipo === "HIBRIDO") return "Agendamento Híbrido";
    return "Agendamento Online";
  };

  // Top Header shared across Portal Hub & Event Booking (exact 3-zone Agenda-Ativa design)
  const renderTopBar = () => (
    <header className="w-full bg-white/85 dark:bg-neutral-900/85 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 sticky top-0 z-30 shrink-0">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
        <button
          type="button"
          onClick={goToPortal}
          className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer"
        >
          {db.company?.logo && !logoError ? (
            <img
              src={db.company.logo}
              alt={companyName}
              referrerPolicy="no-referrer"
              onError={() => setLogoError(true)}
              className="w-8 h-8 rounded-lg object-cover border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-orange-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
              {companyName.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="text-sm sm:text-base font-bold tracking-tight text-neutral-900 dark:text-white whitespace-nowrap truncate max-w-[180px] sm:max-w-[260px]">
            {companyName}
          </span>
        </button>

        <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-neutral-600 dark:text-neutral-300">
          <button
            type="button"
            onClick={goToPortal}
            className={cn(
              "whitespace-nowrap transition-colors cursor-pointer",
              !slug
                ? "text-orange-600 dark:text-orange-400 font-semibold"
                : "hover:text-neutral-900 dark:hover:text-white"
            )}
          >
            Eventos Abertos
          </button>
          <button
            type="button"
            onClick={() => {
              setLookupError("");
              setMyBookingsOpen(true);
            }}
            className="whitespace-nowrap hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            Acompanhar Protocolo
          </button>
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          {(slug || bookingResult) && (
            <button
              type="button"
              onClick={goToPortal}
              className="px-3 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-xl text-xs font-medium hidden sm:flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-orange-500 shrink-0" />
              <span>Todos os Eventos</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setLookupError("");
              setMyBookingsOpen(true);
            }}
            className="px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:border-orange-500 flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <CalendarClock className="w-3.5 h-3.5 text-orange-500 shrink-0" />
            <span>Meus Agendamentos</span>
          </button>

          <button
            type="button"
            onClick={handleTogglePublicTheme}
            title={darkTheme ? "Mudar para Modo Claro" : "Mudar para Modo Escuro"}
            className="px-2.5 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors flex items-center gap-1.5 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer"
          >
            {darkTheme ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Claro</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-500" />
                <span className="hidden sm:inline">Escuro</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );

  // Loading state — não exibe "não encontrado" antes da sincronização real terminar
  if ((slug && !targetEvent && (bootstrapping || resolvingSlug)) || (!slug && bootstrapping && !cloudStore.getStatus().loadedFromCloud)) {
    return (
      <div
        data-theme={darkTheme ? "dark" : "light"}
        style={{ colorScheme: darkTheme ? "dark" : "light" }}
        className={cn(
          darkTheme && "dark",
          "min-h-screen bg-neutral-100 dark:bg-neutral-950 px-4 flex items-center justify-center text-neutral-900 dark:text-neutral-100 transition-colors"
        )}
      >
        <div className="max-w-sm w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 shadow-sm text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900/60 text-orange-600 dark:text-orange-400 flex items-center justify-center mx-auto">
            <Loader2 className="w-7 h-7 animate-spin" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-neutral-900 dark:text-white">
              Carregando portal de eventos
            </h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Buscando agendas, vagas e eventos disponíveis em tempo real...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Dedicated Thank-You screen (Image 4: /agendar/$slug/obrigado & post-booking receipt)
  if (bookingResult) {
    const pNome = thankYouParticipant?.nome || nome || "";
    const pWhatsapp = thankYouParticipant?.whatsapp || whatsapp || "";
    const pLocal =
      thankYouParticipant?.local ||
      (localEscolha === "__OUTRO__" ? localOutro.trim() : localEscolha.trim()) ||
      targetEvent?.local_evento ||
      "";
    const primeiroNome = pNome.trim().split(/\s+/)[0] || "Cliente";
    const progressPercent = Math.max(0, Math.min(100, (redirectSeconds / 8) * 100));
    const waConfirmLink = buildWhatsAppLink(
      companyPhone || pWhatsapp,
      `Olá! Meu nome é *${pNome || "Participante"}* e acabei de confirmar meu agendamento para o evento *${bookingResult.evento_nome}* no dia *${formatDateBR(bookingResult.data)}* às *${bookingResult.hora_inicio}*.\n\nMeu Protocolo é: *${bookingResult.protocolo}*.`
    );

    return (
      <div
        data-theme={darkTheme ? "dark" : "light"}
        style={{ colorScheme: darkTheme ? "dark" : "light" }}
        className={cn(
          darkTheme && "dark",
          "min-h-screen bg-neutral-100 dark:bg-neutral-950 py-6 sm:py-10 px-4 sm:px-6 flex items-center justify-center text-neutral-900 dark:text-neutral-100 transition-colors"
        )}
      >
        <div className="max-w-lg w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-5 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
              Obrigado pelo seu agendamento, {primeiroNome}!
            </h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Sua vaga foi reservada com sucesso. Guarde o protocolo abaixo para acompanhar ou alterar seu atendimento na Landing Page.
            </p>
          </div>

          <div className="py-3 px-4 border-y border-neutral-200 dark:border-neutral-800 space-y-1">
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium block">
              Número do Protocolo
            </span>
            <div className="inline-flex items-center justify-center gap-2">
              <p className="text-lg font-bold font-mono tabular-nums text-orange-600 dark:text-orange-400 tracking-wider">
                {bookingResult.protocolo}
              </p>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(bookingResult.protocolo);
                    setCopiedProtocol(true);
                    setTimeout(() => setCopiedProtocol(false), 2000);
                  } catch {}
                }}
                className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:text-orange-600 cursor-pointer"
                title="Copiar protocolo"
              >
                {copiedProtocol ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          <div className="text-left text-xs space-y-2 text-neutral-700 dark:text-neutral-300">
            <div className="flex items-center justify-between gap-2">
              <span className="text-neutral-500 dark:text-neutral-400 shrink-0">Evento:</span>
              <strong className="text-neutral-900 dark:text-white text-right truncate">
                {bookingResult.evento_nome}
              </strong>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-neutral-500 dark:text-neutral-400 shrink-0">Data e Horário:</span>
              <strong className="font-mono tabular-nums text-neutral-900 dark:text-white text-right">
                {formatDateBR(bookingResult.data)} às {bookingResult.hora_inicio}
              </strong>
            </div>
            {pNome && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-neutral-500 dark:text-neutral-400 shrink-0">Participante:</span>
                <span className="text-neutral-900 dark:text-white text-right truncate">{pNome}</span>
              </div>
            )}
            {pWhatsapp && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-neutral-500 dark:text-neutral-400 shrink-0">WhatsApp:</span>
                <span className="font-mono tabular-nums text-neutral-900 dark:text-white">
                  {pWhatsapp}
                </span>
              </div>
            )}
            {pLocal && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-neutral-500 dark:text-neutral-400 shrink-0">Local / Origem:</span>
                <span className="text-neutral-900 dark:text-white font-medium text-right truncate">
                  {pLocal}
                </span>
              </div>
            )}
          </div>

          <div className="p-3.5 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/50 rounded-xl text-left text-xs text-orange-900 dark:text-orange-200">
            <p className="font-semibold mb-1">Orientações do Atendimento</p>
            <p className="leading-relaxed">
              {bookingResult.mensagem_confirmacao ||
                "Parabéns! Sua sessão está confirmada. Em breve entraremos em contato via WhatsApp."}
            </p>
          </div>

          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-600 dark:text-neutral-400">
                {autoRedirectPaused
                  ? "Visualização manual do comprovante"
                  : "Entrando no portal de eventos e acompanhamentos em:"}
              </span>
              <button
                type="button"
                onClick={() => setAutoRedirectPaused((v) => !v)}
                className="font-mono tabular-nums font-bold text-orange-600 dark:text-orange-400 cursor-pointer hover:underline"
              >
                {autoRedirectPaused ? "Retomar" : `${redirectSeconds}s`}
              </button>
            </div>
            <div className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-500 transition-all duration-1000 ease-linear"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="space-y-2.5 pt-1">
            <button
              type="button"
              onClick={goToPortal}
              className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <span>Acompanhar Meu Agendamento e Ver Eventos</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <a
              href={waConfirmLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <Share2 className="w-4 h-4" />
              <span>Enviar Comprovante pelo WhatsApp</span>
            </a>

            <div className="pt-1">
              <a
                href={buildGoogleCalendarTemplateLink({
                  title: bookingResult.evento_nome,
                  description: `Protocolo: ${bookingResult.protocolo}`,
                  location: pLocal,
                  date: bookingResult.data,
                  startTime: bookingResult.hora_inicio,
                  endTime: bookingResult.hora_fim,
                })}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[11px] font-medium text-neutral-500 dark:text-neutral-400 hover:text-orange-600"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Adicionar lembrete ao Google Calendar</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Self-service modal (Meus Agendamentos / Protocol Lookup / Reschedule / Cancel)
  const renderSelfServiceModal = () => {
    if (!myBookingsOpen) return null;
    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <div className="w-full max-w-lg rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-2xl overflow-hidden my-6">
          <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-orange-500" />
              <div className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white">
                Consultar, Cancelar ou Remarcar
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMyBookingsOpen(false)}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            <form onSubmit={handleLookupBooking} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Número do Protocolo *
                </label>
                <input
                  type="text"
                  required
                  value={lookupProtocol}
                  onChange={(e) => setLookupProtocol(e.target.value.toUpperCase())}
                  placeholder="Ex: PROT-202611-ABCD"
                  className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 px-3 py-2.5 text-xs font-mono uppercase text-neutral-900 dark:text-white focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  WhatsApp ou E-mail cadastrado *
                </label>
                <input
                  type="text"
                  required
                  value={lookupContact}
                  onChange={(e) => setLookupContact(e.target.value)}
                  placeholder="(11) 99999-9999 ou seu@email.com"
                  className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 px-3 py-2.5 text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-orange-500"
                />
              </div>
              {lookupError && (
                <div className="rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/60 p-2.5 text-xs text-rose-700 dark:text-rose-300">
                  {lookupError}
                </div>
              )}
              <button
                type="submit"
                className="w-full rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-800 dark:hover:bg-neutral-700 py-2.5 text-xs font-semibold text-white flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Localizar Agendamento</span>
              </button>
            </form>

            {foundLookup && (
              <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-orange-600 dark:text-orange-400">
                    {foundLookup.agendamento.protocolo}
                  </span>
                  <span
                    className={cn(
                      "text-[11px] font-bold uppercase",
                      foundLookup.agendamento.status === "CANCELADO"
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-emerald-600 dark:text-emerald-400"
                    )}
                  >
                    {getBookingStatusLabel(foundLookup.agendamento.status)}
                  </span>
                </div>
                <div className="text-sm font-bold text-neutral-900 dark:text-white">
                  {foundLookup.agendamento.evento_nome || foundLookup.evento?.nome}
                </div>
                <div className="text-xs font-mono tabular-nums text-neutral-600 dark:text-neutral-400">
                  {formatDateBR(foundLookup.agendamento.data_agendamento)} ·{" "}
                  {foundLookup.agendamento.hora_inicio} — {foundLookup.agendamento.hora_fim}
                </div>

                {foundLookup.agendamento.status !== "CANCELADO" &&
                  foundLookup.agendamento.status !== "REALIZADO" && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
                      {foundLookup.evento && (
                        <button
                          type="button"
                          onClick={() => setRescheduleOpen((v) => !v)}
                          className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-neutral-800 dark:text-neutral-200 cursor-pointer hover:border-orange-500"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-orange-600" /> Remarcar
                        </button>
                      )}
                      {foundLookup.evento?.permite_cancelamento !== false && (
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={handleCancelFoundBooking}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Cancelar Horário
                        </button>
                      )}
                    </div>
                  )}

                {rescheduleOpen && foundLookup.evento && (
                  <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 space-y-2.5">
                    <div className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                      Escolha nova data e horário:
                    </div>
                    <select
                      value={rescheduleDate}
                      onChange={(e) => {
                        setRescheduleDate(e.target.value);
                        setRescheduleSlot(null);
                      }}
                      className="w-full rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-2.5 py-1.5 text-xs text-neutral-900 dark:text-white"
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
                                : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200"
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
                      className="w-full rounded-lg bg-orange-600 hover:bg-orange-500 py-2 text-xs font-bold text-white cursor-pointer disabled:opacity-40"
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
    );
  };

  // Mode 1: Portal Hub (/agendar or /obrigado fallback when no fresh receipt)
  if (!slug || initialThankYou) {
    return (
      <div
        data-theme={darkTheme ? "dark" : "light"}
        style={{ colorScheme: darkTheme ? "dark" : "light" }}
        className={cn(
          darkTheme && "dark",
          "min-h-screen bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col transition-colors"
        )}
      >
        {renderTopBar()}

        <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
          {/* Editorial Hero Card */}
          <section className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <p className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                Portal Público de Atendimentos · {companyName}
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white text-balance">
                Acompanhe seu agendamento e escolha novos eventos
              </h1>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Consulte o status do seu protocolo em tempo real, remarque ou cancele quando precisar e inscreva-se nos demais eventos abertos ou na lista de espera.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setLookupError("");
                  setMyBookingsOpen(true);
                }}
                className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
              >
                <Search className="w-3.5 h-3.5 text-orange-400" />
                <span>Consultar Protocolo</span>
              </button>

              {companyPhone && (
                <a
                  href={buildWhatsAppLink(
                    companyPhone,
                    `Olá! Preciso de atendimento sobre um evento (${companyName}).`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Falar no WhatsApp</span>
                </a>
              )}
            </div>
          </section>

          {/* Meus Agendamentos */}
          <section id="meus-agendamentos" className="space-y-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-neutral-900 dark:text-white">
                Meus Agendamentos
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Acompanhe suas reservas realizadas neste dispositivo ou consulte outro código de protocolo.
              </p>
            </div>

            {hydratedDeviceBookings.length === 0 ? (
              <div className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                    <CalendarClock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-white">
                      Você ainda não possui agendamentos recentes salvos neste navegador
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Se já fez um agendamento em outro dispositivo, consulte usando seu código de protocolo.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setLookupError("");
                    setMyBookingsOpen(true);
                  }}
                  className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-white rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Buscar por Protocolo
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {hydratedDeviceBookings.map((item) => (
                  <div
                    key={item.protocolo}
                    className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-mono font-bold text-orange-600 dark:text-orange-400">
                          {item.protocolo}
                        </span>
                        <span aria-hidden="true" className="text-neutral-400">
                          ·
                        </span>
                        <span
                          className={cn(
                            "font-semibold",
                            item.status === "CANCELADO"
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-emerald-600 dark:text-emerald-400"
                          )}
                        >
                          {getBookingStatusLabel(item.status)}
                        </span>
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white truncate">
                        {item.evento_nome}
                      </h3>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 font-mono tabular-nums">
                        {formatDateBR(item.data)} às {item.hora_inicio}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openProtocolDirect(item)}
                      className="px-3.5 py-2 bg-neutral-100 hover:bg-orange-600 text-neutral-800 hover:text-white dark:bg-neutral-800 dark:hover:bg-orange-600 dark:text-neutral-200 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
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
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-neutral-900 dark:text-white">
                  Eventos Disponíveis &amp; Próximas Turmas
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Inscreva-se nos eventos com agenda aberta ou deixe seu contato na lista de espera dos encerrados e pausados.
                </p>
              </div>

              <div className="flex items-center gap-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-1 rounded-xl shrink-0 w-fit">
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
                        "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer",
                        active
                          ? "bg-orange-600 text-white font-semibold"
                          : "text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white"
                      )}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {filteredPortalEvents.length === 0 ? (
              <div className="p-10 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-center space-y-2">
                <Calendar className="w-8 h-8 text-neutral-400 mx-auto" />
                <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                  Nenhum evento encontrado neste filtro
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Alterne para &quot;Todos&quot; ou consulte seu agendamento por protocolo.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredPortalEvents.map(({ ev, summary, openDaysCount, prod }) => {
                  const statusTitle = summary.disponivel
                    ? "Inscrições Abertas"
                    : summary.motivo === "ENCERRADO"
                    ? "Encerrado"
                    : summary.motivo === "LOTADO"
                    ? "Vagas Esgotadas"
                    : "Agenda Fechada";

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
                    <article
                      key={ev.id_evento}
                      className="p-5 sm:p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm flex flex-col justify-between gap-5"
                    >
                      <div className="space-y-3.5">
                        <div className="flex items-start gap-3.5">
                          {renderEventThumb(ev, "md")}
                          <div className="min-w-0 flex-1 space-y-1">
                            <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                              <span
                                className={cn(
                                  "font-semibold",
                                  summary.disponivel
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : summary.motivo === "ENCERRADO"
                                    ? "text-rose-600 dark:text-rose-400"
                                    : "text-amber-600 dark:text-amber-400"
                                )}
                              >
                                {statusTitle}
                              </span>
                              <span aria-hidden="true"> · </span>
                              <span className="font-mono tabular-nums">{ev.duracao_minutos} min</span>
                            </p>
                            <h3 className="text-base font-bold tracking-tight text-neutral-900 dark:text-white leading-snug line-clamp-2">
                              {ev.nome}
                            </h3>
                          </div>
                        </div>

                        <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed line-clamp-3">
                          {ev.descricao ||
                            "Atendimento programado com agendamento online de data e horário."}
                        </p>

                        {prod && (
                          <div className="pt-2.5 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-2 text-xs">
                            <span className="text-neutral-600 dark:text-neutral-300 font-medium truncate">
                              {prod.name}
                            </span>
                            {Number(prod.salePrice || 0) > 0 && (
                              <span className="font-mono tabular-nums font-bold text-emerald-700 dark:text-emerald-400 shrink-0">
                                {formatBRLPrice(prod.salePrice)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="space-y-3 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                        <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                          {summary.disponivel ? (
                            <span className="font-mono tabular-nums text-emerald-700 dark:text-emerald-400 font-semibold">
                              {summary.vagasTotais} vaga{summary.vagasTotais !== 1 ? "s" : ""} em{" "}
                              {openDaysCount} dia{openDaysCount !== 1 ? "s" : ""}
                            </span>
                          ) : (
                            <span>
                              {ev.permitir_lista_espera !== false
                                ? "Cadastre-se para ser avisado na reabertura"
                                : "Indisponível no momento"}
                            </span>
                          )}
                        </div>

                        {summary.disponivel ? (
                          <a
                            href={href}
                            onClick={(e) => {
                              e.preventDefault();
                              navigate({
                                to: "/agendar/$slug",
                                params: { slug: ev.slug },
                                search: Object.keys(qs).length > 0 ? (qs as any) : undefined,
                              });
                            }}
                            className="w-full py-2.5 px-4 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm"
                          >
                            <span>Agendar neste Evento</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openWaitlistModalForEvent(ev)}
                            className="w-full py-2.5 px-4 bg-neutral-100 hover:bg-amber-50 dark:bg-neutral-800 dark:hover:bg-amber-950/40 border border-neutral-200 dark:border-neutral-700 hover:border-amber-400 text-neutral-800 dark:text-neutral-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                          >
                            {summary.motivo === "ENCERRADO" ? (
                              <PauseCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            ) : (
                              <BellRing className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            )}
                            <span>
                              {summary.motivo === "ENCERRADO"
                                ? "Encerrado · Ver Aviso / Lista de Espera"
                                : summary.motivo === "LOTADO"
                                ? "Vagas Esgotadas · Avise-me"
                                : "Agenda Fechada · Lista de Espera"}
                            </span>
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </main>

        <footer className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 border-t border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-neutral-500 dark:text-neutral-400">
          <span>
            © {new Date().getFullYear()} {companyName}
            {companyAddress ? ` · ${companyAddress}` : ""}
            {companyDoc ? ` · CNPJ ${companyDoc}` : ""}
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-500 shrink-0" />
            <span>Agendamento oficial e acompanhamentos</span>
          </span>
        </footer>

        {/* Portal Waitlist Modal */}
        {waitlistModalEvent &&
          (() => {
            const wSummary = getEventAvailabilitySummary(db, waitlistModalEvent);
            const wStatusTitle =
              wSummary.motivo === "ENCERRADO"
                ? "Evento Encerrado"
                : wSummary.motivo === "LOTADO"
                ? "Vagas Esgotadas"
                : "Agenda Fechada";
            return (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-4 shadow-2xl">
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-neutral-200 dark:border-neutral-800">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/70 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <AlertCircle className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                          {wStatusTitle}
                        </p>
                        <h3 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white truncate">
                          {waitlistModalEvent.nome}
                        </h3>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setWaitlistModalEvent(null)}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-4 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl text-xs sm:text-sm text-amber-950 dark:text-amber-100 leading-relaxed">
                    {wSummary.mensagem}
                  </div>

                  {wlResult ? (
                    <div className="p-5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-center space-y-3">
                      <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto" />
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                          Interesse registrado com sucesso!
                        </h4>
                        <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
                          {wlResult.mensagem}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setWaitlistModalEvent(null)}
                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold cursor-pointer"
                      >
                        Voltar para os Eventos
                      </button>
                    </div>
                  ) : waitlistModalEvent.permitir_lista_espera !== false ? (
                    <form
                      onSubmit={(e) => handleWaitlistSubmit(e, waitlistModalEvent)}
                      className="space-y-3 text-xs"
                    >
                      <div className="flex items-center gap-1.5 text-neutral-800 dark:text-neutral-200 font-semibold">
                        <BellRing className="w-3.5 h-3.5 text-orange-500" />
                        <span>Cadastre-se para nossa equipe avisar quando a agenda abrir:</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                            Nome Completo *
                          </label>
                          <input
                            type="text"
                            required
                            value={wlNome}
                            onChange={(e) => setWlNome(e.target.value)}
                            placeholder="Seu nome completo"
                            className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:border-orange-500"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                            WhatsApp com DDD *
                          </label>
                          <input
                            type="tel"
                            required
                            value={wlWhatsapp}
                            onChange={(e) => setWlWhatsapp(applyWhatsAppMask(e.target.value))}
                            placeholder="(11) 99999-9999"
                            className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-xl font-mono text-neutral-900 dark:text-white focus:outline-none focus:border-orange-500"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                            E-mail
                          </label>
                          <input
                            type="email"
                            value={wlEmail}
                            onChange={(e) => setWlEmail(e.target.value)}
                            placeholder="seuemail@exemplo.com"
                            className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:border-orange-500"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                            {waitlistModalEvent.label_local?.trim() || "Bairro / Escola / Local"}
                          </label>
                          <input
                            type="text"
                            value={wlLocal}
                            onChange={(e) => setWlLocal(e.target.value)}
                            placeholder="Onde você prefere ou atua"
                            className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:border-orange-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                          Observação (opcional)
                        </label>
                        <input
                          type="text"
                          value={wlObs}
                          onChange={(e) => setWlObs(e.target.value)}
                          placeholder="Ex: Prefiro atendimento no período da manhã"
                          className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:border-orange-500"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-2.5 px-4 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Registrando interesse...</span>
                          </>
                        ) : (
                          <>
                            <BellRing className="w-4 h-4" />
                            <span>Avise-me Quando Abrir</span>
                          </>
                        )}
                      </button>
                    </form>
                  ) : (
                    <div className="flex items-center gap-2 pt-1">
                      {companyPhone && (
                        <a
                          href={buildWhatsAppLink(
                            companyPhone,
                            `Olá! Tenho interesse no evento ${waitlistModalEvent.nome}.`
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span>Falar com o Atendimento</span>
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => setWaitlistModalEvent(null)}
                        className="px-4 py-2.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 rounded-xl text-xs font-semibold cursor-pointer"
                      >
                        Fechar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

        {renderSelfServiceModal()}
      </div>
    );
  }

  // Mode 2: Single Event Booking Wizard (/agendar/$slug — Images 1, 2, 3)
  return (
    <div
      data-theme={darkTheme ? "dark" : "light"}
      style={{ colorScheme: darkTheme ? "dark" : "light" }}
      className={cn(
        darkTheme && "dark",
        "min-h-screen md:h-screen md:overflow-hidden bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col transition-colors"
      )}
    >
      {renderTopBar()}

      <main className="flex-1 min-h-0 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 md:py-4 flex flex-col">
        {!targetEvent ? (
          <div className="flex-1 flex items-center justify-center py-8">
            <div className="max-w-lg w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 sm:p-10 text-center space-y-4 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-400 mx-auto flex items-center justify-center">
                <Calendar className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h1 className="text-lg font-bold text-neutral-900 dark:text-white">
                  {slug ? `Evento "${slug}" não encontrado` : "Nenhum evento selecionado"}
                </h1>
                <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
                  Você pode visualizar todos os eventos disponíveis e acompanhar agendamentos na Landing Page.
                </p>
              </div>
              <button
                type="button"
                onClick={goToPortal}
                className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer"
              >
                <LayoutGrid className="w-4 h-4" />
                <span>Ver Todos os Eventos</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-0 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm grid grid-cols-1 md:grid-cols-12 overflow-hidden">
            {/* Left Sidebar Column */}
            <aside className="md:col-span-5 lg:col-span-4 border-b md:border-b-0 md:border-r border-neutral-200 dark:border-neutral-800 p-5 sm:p-6 lg:p-7 flex flex-col justify-between gap-4 md:overflow-y-auto bg-neutral-50/70 dark:bg-neutral-950/30">
              <div className="space-y-4">
                <div className="flex items-start gap-3.5">
                  {renderEventThumb(targetEvent, "lg")}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                      <span>{getModalityLabel(targetEvent.tipo_evento)}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{targetEvent.duracao_minutos} min</span>
                    </div>
                    <h1 className="text-lg sm:text-xl lg:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white leading-snug text-balance">
                      {targetEvent.nome}
                    </h1>
                  </div>
                </div>

                {targetEvent.descricao && (
                  <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
                    {targetEvent.descricao}
                  </p>
                )}

                {linkedProduct && (
                  <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-neutral-700 dark:text-neutral-200 font-medium min-w-0">
                      <Tag className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="truncate">{linkedProduct.name}</span>
                    </div>
                    {Number(linkedProduct.salePrice || 0) > 0 && (
                      <div className="text-right font-mono tabular-nums font-bold text-emerald-700 dark:text-emerald-400 shrink-0">
                        {formatBRLPrice(linkedProduct.salePrice)}
                      </div>
                    )}
                  </div>
                )}

                {(selectedDate || selectedSlot) && (
                  <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 space-y-2 text-xs">
                    <p className="font-semibold text-neutral-800 dark:text-neutral-200">
                      Resumo da seleção
                    </p>
                    {selectedDate && (
                      <div className="flex items-center justify-between gap-2 text-neutral-600 dark:text-neutral-300">
                        <span className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
                          <Calendar className="w-3.5 h-3.5 text-orange-500" />
                          <span>Data:</span>
                        </span>
                        <strong className="font-mono tabular-nums text-neutral-900 dark:text-white">
                          {formatDateBR(selectedDate)}
                        </strong>
                      </div>
                    )}
                    {selectedSlot && (
                      <div className="flex items-center justify-between gap-2 text-neutral-600 dark:text-neutral-300">
                        <span className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
                          <Clock className="w-3.5 h-3.5 text-orange-500" />
                          <span>Horário:</span>
                        </span>
                        <strong className="font-mono tabular-nums text-neutral-900 dark:text-white">
                          {selectedSlot.hora_inicio} às {selectedSlot.hora_fim}
                        </strong>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {(companyPhone || companyEmail || companyAddress || companyDoc) && (
                <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 space-y-2.5 text-xs">
                  <div className="flex flex-wrap gap-2">
                    {companyPhone && (
                      <a
                        href={buildWhatsAppLink(
                          companyPhone,
                          `Olá! Gostaria de informações sobre ${targetEvent.nome} (${companyName}).`
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800/80 rounded-lg text-emerald-700 dark:text-emerald-300 font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
                      >
                        <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                        <span className="font-mono tabular-nums">{companyPhone}</span>
                      </a>
                    )}

                    {companyEmail && (
                      <a
                        href={`mailto:${companyEmail}`}
                        className="px-3 py-1.5 bg-white hover:bg-neutral-100 dark:bg-neutral-900 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-lg text-neutral-700 dark:text-neutral-300 inline-flex items-center gap-1.5 transition-colors truncate max-w-full"
                      >
                        <Mail className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span className="truncate">{companyEmail}</span>
                      </a>
                    )}
                  </div>

                  {(companyAddress || companyDoc) && (
                    <div className="space-y-1 text-[11px] text-neutral-500 dark:text-neutral-400 leading-snug">
                      {companyAddress && (
                        <div className="flex items-start gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0 mt-0.5" />
                          <span>{companyAddress}</span>
                        </div>
                      )}
                      {companyDoc && (
                        <p className="font-mono tabular-nums text-neutral-400 dark:text-neutral-500">
                          CNPJ: {companyDoc}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </aside>

            {/* Right Interactive Column */}
            <section className="md:col-span-7 lg:col-span-8 p-5 sm:p-6 lg:p-8 flex flex-col min-h-0">
              {eventSummary && !eventSummary.disponivel ? (
                <div className="flex-1 min-h-0 md:overflow-y-auto flex flex-col justify-center py-2">
                  <div className="max-w-lg mx-auto w-full space-y-5">
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <AlertCircle className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                          {eventSummary.motivo === "ENCERRADO"
                            ? "Evento Encerrado"
                            : eventSummary.motivo === "LOTADO"
                            ? "Vagas Preenchidas"
                            : "Agenda Fechada"}
                        </p>
                        <h2 className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight">
                          Novas reservas temporariamente indisponíveis
                        </h2>
                        <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
                          {eventSummary.mensagem}
                        </p>
                      </div>
                    </div>

                    {wlResult ? (
                      <div className="p-5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-center space-y-3">
                        <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto" />
                        <p className="text-xs sm:text-sm font-medium text-emerald-900 dark:text-emerald-200">
                          {wlResult.mensagem}
                        </p>
                        <button
                          type="button"
                          onClick={goToPortal}
                          className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-semibold cursor-pointer"
                        >
                          Explorar Outros Eventos Abertos
                        </button>
                      </div>
                    ) : targetEvent.permitir_lista_espera !== false ? (
                      <form
                        onSubmit={(e) => handleWaitlistSubmit(e, targetEvent)}
                        className="p-5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl space-y-3 text-xs"
                      >
                        <div className="flex items-center gap-2 font-semibold text-neutral-800 dark:text-neutral-200">
                          <BellRing className="w-4 h-4 text-orange-500" />
                          <span>Entrar na Lista de Espera</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                              Nome Completo *
                            </label>
                            <input
                              type="text"
                              required
                              value={wlNome}
                              onChange={(e) => setWlNome(e.target.value)}
                              placeholder="Seu nome completo"
                              className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:border-orange-500"
                            />
                          </div>
                          <div>
                            <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                              WhatsApp com DDD *
                            </label>
                            <input
                              type="tel"
                              required
                              value={wlWhatsapp}
                              onChange={(e) => setWlWhatsapp(applyWhatsAppMask(e.target.value))}
                              placeholder="(11) 99999-9999"
                              className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-xl font-mono text-neutral-900 dark:text-white focus:outline-none focus:border-orange-500"
                            />
                          </div>
                          <div>
                            <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                              E-mail
                            </label>
                            <input
                              type="email"
                              value={wlEmail}
                              onChange={(e) => setWlEmail(e.target.value)}
                              placeholder="seuemail@exemplo.com"
                              className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:border-orange-500"
                            />
                          </div>
                          <div>
                            <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                              {targetEvent.label_local?.trim() || "Bairro / Escola / Local"}
                            </label>
                            <input
                              type="text"
                              value={wlLocal}
                              onChange={(e) => setWlLocal(e.target.value)}
                              placeholder="Onde você prefere ou atua"
                              className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:border-orange-500"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                            Observação (opcional)
                          </label>
                          <input
                            type="text"
                            value={wlObs}
                            onChange={(e) => setWlObs(e.target.value)}
                            placeholder="Ex: Prefiro atendimento no período da manhã"
                            className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:border-orange-500"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={submitting}
                          className="w-full py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer"
                        >
                          {submitting ? "Registrando..." : "Garantir Lugar na Lista de Espera"}
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
              ) : (
                <>
                  {/* Stepper Pills */}
                  <div className="flex items-center gap-2 pb-4 mb-5 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
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
                            "flex-1 py-2 px-3 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer disabled:cursor-not-allowed",
                            active
                              ? "bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300 font-semibold border border-orange-200 dark:border-orange-800/70"
                              : completed
                              ? "bg-neutral-50 dark:bg-neutral-950 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-transparent"
                              : "text-neutral-400 dark:text-neutral-600 opacity-60 border border-transparent"
                          )}
                        >
                          <span
                            className={cn(
                              "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                              active
                                ? "bg-orange-600 text-white"
                                : completed
                                ? "bg-emerald-600 text-white"
                                : "bg-neutral-300 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-300"
                            )}
                          >
                            {completed ? <Check className="w-3 h-3" /> : s.num}
                          </span>
                          <span className="truncate">{s.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Active Step Content (Internal Scroll on Desktop) */}
                  <div className="flex-1 min-h-0 md:overflow-y-auto pr-1">
                    {/* STEP 1: DATA (Image 1) */}
                    {step === 1 && (
                      <div className="space-y-4">
                        <div>
                          <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white tracking-tight">
                            Selecione o Dia do Atendimento
                          </h2>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                            Clique na data desejada para ver os horários disponíveis.
                          </p>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
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
                                    "p-3.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center min-h-[84px] cursor-pointer",
                                    isSelected
                                      ? "bg-orange-600 border-orange-600 text-white shadow-sm"
                                      : "bg-neutral-50 dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 hover:border-orange-500 hover:bg-orange-50/60 dark:hover:bg-neutral-900"
                                  )}
                                >
                                  <span className="text-[11px] font-medium opacity-80">
                                    {getFriendlyDayHeader(d.dataIso)}
                                  </span>
                                  <span className="text-lg font-bold font-mono tabular-nums mt-0.5">
                                    {formatDayMonthShort(d.dataIso)}
                                  </span>
                                  <span
                                    className={cn(
                                      "text-[10px] uppercase mt-0.5",
                                      isSelected
                                        ? "text-white/80"
                                        : "text-neutral-500 dark:text-neutral-400"
                                    )}
                                  >
                                    {d.diaSemana}
                                  </span>
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    )}

                    {/* STEP 2: HORÁRIO (Image 2) */}
                    {step === 2 && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white tracking-tight">
                              Horários para {formatDateBR(selectedDate)}
                            </h2>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                              Escolha o melhor horário com vagas livres.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setStep(1)}
                            className="px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span>Trocar Dia</span>
                          </button>
                        </div>

                        {slotsForDate.filter((s) => s.disponivel).length === 0 ? (
                          <div className="rounded-xl border border-dashed border-neutral-300 dark:border-neutral-800 p-8 text-center text-xs text-neutral-500 space-y-2">
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
                                      : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950/60 hover:border-orange-500"
                                  )}
                                >
                                  <div>
                                    <div className="font-mono text-sm font-bold tabular-nums text-neutral-900 dark:text-white">
                                      {slot.hora_inicio} - {slot.hora_fim}
                                    </div>
                                    <div
                                      className={cn(
                                        "text-xs font-medium tabular-nums mt-0.5",
                                        slot.disponivel
                                          ? "text-emerald-600 dark:text-emerald-400"
                                          : "text-neutral-400"
                                      )}
                                    >
                                      {slot.disponivel
                                        ? `${slot.vagas_restantes} ${
                                            slot.vagas_restantes === 1 ? "vaga" : "vagas"
                                          }`
                                        : slot.motivo_bloqueio || "Indisponível"}
                                    </div>
                                  </div>
                                  <ChevronRight className="w-4 h-4 text-orange-500 shrink-0" />
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* STEP 3: DADOS (Image 3) */}
                    {step === 3 && (
                      <form onSubmit={handleConfirmBooking} className="space-y-3.5 pb-1">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white tracking-tight">
                              Complete seus Dados
                            </h2>
                            <p className="text-xs font-mono tabular-nums text-neutral-500 dark:text-neutral-400 mt-0.5">
                              {formatDateBR(selectedDate)} · {selectedSlot?.hora_inicio} às{" "}
                              {selectedSlot?.hora_fim}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setStep(2)}
                            className="px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span>Trocar Horário</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
                              Nome Completo <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              value={nome}
                              onChange={(e) => setNome(e.target.value)}
                              placeholder="Seu nome completo"
                              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-xl text-sm sm:text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-orange-500"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
                              WhatsApp com DDD <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="tel"
                              required
                              maxLength={15}
                              value={whatsapp}
                              onChange={(e) => setWhatsapp(applyWhatsAppMask(e.target.value))}
                              placeholder="(11) 99999-9999"
                              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-xl text-sm sm:text-xs font-mono text-neutral-900 dark:text-white focus:outline-none focus:border-orange-500"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
                              E-mail
                            </label>
                            <input
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="seuemail@exemplo.com"
                              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-xl text-sm sm:text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-orange-500"
                            />
                          </div>

                          <div>
                            {(() => {
                              const labelLocalCampo =
                                targetEvent.label_local?.trim() || "Bairro / Escola / Local";
                              const temOpcoesLocal =
                                Array.isArray(targetEvent.local_opcoes) &&
                                targetEvent.local_opcoes.length > 0;
                              return (
                                <>
                                  <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
                                    {labelLocalCampo} <span className="text-rose-500">*</span>
                                  </label>
                                  {temOpcoesLocal ? (
                                    <div className="space-y-2">
                                      <select
                                        required
                                        value={localEscolha}
                                        onChange={(e) => setLocalEscolha(e.target.value)}
                                        className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-xl text-sm sm:text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-orange-500"
                                      >
                                        <option value="">Selecione...</option>
                                        {targetEvent.local_opcoes!.map((loc, idx) => (
                                          <option key={idx} value={loc}>
                                            {loc}
                                          </option>
                                        ))}
                                        <option value="__OUTRO__">Outro (digitar)...</option>
                                      </select>
                                      {localEscolha === "__OUTRO__" && (
                                        <input
                                          type="text"
                                          required
                                          value={localOutro}
                                          onChange={(e) => setLocalOutro(e.target.value)}
                                          placeholder={`Informe: ${labelLocalCampo}`}
                                          className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-xl text-sm sm:text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-orange-500"
                                        />
                                      )}
                                    </div>
                                  ) : (
                                    <input
                                      type="text"
                                      required
                                      value={localEscolha}
                                      onChange={(e) => setLocalEscolha(e.target.value)}
                                      placeholder={`Informe: ${labelLocalCampo}`}
                                      className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-xl text-sm sm:text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-orange-500"
                                    />
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Informações adicionais */}
                        {eventFields.length > 0 && (
                          <div className="space-y-3 pt-2 border-t border-neutral-200 dark:border-neutral-800">
                            <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                              Informações adicionais
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {eventFields.map((field) => {
                                const spanFull =
                                  field.tipo === "TEXTO_LONGO" ||
                                  field.tipo === "SELECAO_MULTIPLA" ||
                                  field.tipo === "SIM_NAO";
                                return (
                                  <div
                                    key={field.id_campo}
                                    className={spanFull ? "sm:col-span-2" : ""}
                                  >
                                    <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
                                      {field.label}{" "}
                                      {field.obrigatorio && <span className="text-rose-500">*</span>}
                                    </label>
                                    {renderCustomField(field)}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* LGPD */}
                        <div className="flex items-start gap-2 pt-1">
                          <input
                            type="checkbox"
                            id="chk-lgpd"
                            required
                            checked={lgpdAceito}
                            onChange={(e) => setLgpdAceito(e.target.checked)}
                            className="rounded bg-neutral-100 dark:bg-neutral-950 border-neutral-300 dark:border-neutral-700 text-orange-600 focus:ring-0 mt-0.5 cursor-pointer"
                          />
                          <label
                            htmlFor="chk-lgpd"
                            className="text-[11px] text-neutral-500 dark:text-neutral-400 cursor-pointer leading-tight"
                          >
                            Autorizo a coleta e tratamento dos meus dados para fins de confirmação e realização deste atendimento.
                          </label>
                        </div>

                        <button
                          type="submit"
                          disabled={submitting}
                          className="w-full py-3 px-6 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
                        >
                          {submitting ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Verificando Vagas e Confirmando...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Confirmar Agendamento</span>
                            </>
                          )}
                        </button>
                      </form>
                    )}
                  </div>
                </>
              )}
            </section>
          </div>
        )}
      </main>

      <footer className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-3 pt-1 flex flex-wrap items-center justify-between gap-2 text-[11px] text-neutral-400 dark:text-neutral-500 shrink-0">
        <span>
          © {new Date().getFullYear()} {companyName}
        </span>
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-500 shrink-0" />
          <span>Agendamento seguro</span>
        </span>
      </footer>

      {renderSelfServiceModal()}
    </div>
  );
};
