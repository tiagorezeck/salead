import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { 
  Shield, Users, Workflow, Bell, FileText, Database, Moon, Sun, Palette, 
  Download, Upload, Trash2, AlertTriangle, X, Save, Plus, GitBranch, 
  Timer, LayoutGrid, Check, Calendar as CalendarIcon, Building2, 
  Image as ImageIcon, Sparkles, Eye, Phone, Mail, MapPin, Globe, Cloud, 
  CheckCircle2, BookOpen, MonitorPlay, Trophy, Medal, ClipboardCheck, 
  Layout, KanbanSquare, ChevronDown, ListTodo, Package, Megaphone, Zap, 
  MessageSquare, UserCog, ClipboardList, RefreshCw, Bot, ArrowUpRight, Sliders,
  Settings, KeyRound
} from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { 
  useData, 
  type VisibilitySettings, 
  type Lead, 
  type Task, 
  type User, 
  type Product, 
  type LandingPage, 
  type Survey, 
  type SurveyResponse, 
  type Pipeline, 
  type StageWorkflow, 
  type Playbook, 
  type Objection,
  type SLAThresholds
} from "@/hooks/use-data";
import { type PipelineStage, SYSTEM_MODULES, DEFAULT_ROLE_MODULES, type SystemModule } from "@/data/mock";
import { getEffectiveEnabledRolesForPipeline } from "@/lib/lead-rules";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { GDriveSettingsModal } from "@/components/crm/gdrive-settings-modal";
import { AISettingsModal } from "@/components/automation/ai-settings-modal";
import { useAIConfig } from "@/hooks/useAIConfig";
import { useBrandStore, LOGO_EDITOR_ENABLED } from "@/lib/brand-store";
import { getDriveConfig, initializeSharedDriveConfig, type DriveConfig } from "@/services/googleDriveDatabaseService";
import { 
  getCalendarConnectionState, 
  connectGoogleCalendar, 
  disconnectGoogleCalendar, 
  type GoogleCalendarConnection 
} from "@/lib/google-calendar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const PIPELINE_COLORS = [
  { id: 'primary', bg: 'bg-primary', label: 'Laranja Comet' },
  { id: 'blue', bg: 'bg-blue-500', label: 'Azul' },
  { id: 'green', bg: 'bg-emerald-500', label: 'Verde' },
  { id: 'purple', bg: 'bg-violet-500', label: 'Roxo' },
  { id: 'rose', bg: 'bg-rose-500', label: 'Rosa' },
  { id: 'amber', bg: 'bg-amber-500', label: 'Âmbar' },
];

const STAGE_COLORS: { id: PipelineStage['color']; bg: string }[] = [
  { id: 'default', bg: 'bg-muted' },
  { id: 'primary', bg: 'bg-primary' },
  { id: 'info', bg: 'bg-blue-500' },
  { id: 'success', bg: 'bg-emerald-500' },
  { id: 'warning', bg: 'bg-amber-500' },
  { id: 'destructive', bg: 'bg-rose-500' },
  { id: 'purple', bg: 'bg-violet-500' },
];

const WEEK_DAYS = [
  { id: 0, label: "Dom" },
  { id: 1, label: "Seg" },
  { id: 2, label: "Ter" },
  { id: 3, label: "Qua" },
  { id: 4, label: "Qui" },
  { id: 5, label: "Sex" },
  { id: 6, label: "Sáb" },
];

const ROLES = [
  "Admin Geral", 
  "Head of Sales", 
  "Team Leader", 
  "Marketing", 
  "LDR", 
  "BDR", 
  "SDR", 
  "Hunter", 
  "Closer", 
  "Full Stack Seller",
  "Onboarding", 
  "CS (Customer Success)", 
  "Farmer", 
  "CX (Customer Experience)"
];

export const Route = createFileRoute("/app/settings/")({
  component: SettingsIndexPage,
});

function SettingsIndexPage() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { aiConfig, isConfigured } = useAIConfig();
  const isAIConfigured = isConfigured();
  const [driveConfig, setDriveConfig] = useState<DriveConfig | null>(null);
  const [calendarConn, setCalendarConn] = useState<GoogleCalendarConnection>({ connected: false });
  const [isConnectingCalendar, setIsConnectingCalendar] = useState(false);

  const data = useData();
  const { 
    pipelines, addPipeline, updatePipeline, deletePipeline,
    rolePermissions, updateRolePermissions,
    roleModulePermissions, updateRoleModulePermissions, resetRoleModulePermissions,
    slaThresholds, setSlaThresholds,
    workingDays, setWorkingDays,
    holidays, setHolidays,
    company, setCompany,
    visibility, setVisibility,
    resetData
  } = data;
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<"empresa" | "kanban" | "permissoes" | "sla" | "integracoes" | "dados">("empresa");
  const [empresaSubTab, setEmpresaSubTab] = useState<"dados" | "jornada" | "aparencia">("dados");
  const [newHoliday, setNewHoliday] = useState("");
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    const loadDrive = async () => {
      const cfg = await initializeSharedDriveConfig();
      setDriveConfig(cfg);
    };
    loadDrive();
    setCalendarConn(getCalendarConnectionState());

    const handleDriveUpdate = (e: any) => {
      if (e.detail) {
        setDriveConfig(e.detail);
      }
    };
    window.addEventListener('salead_drive_config_updated', handleDriveUpdate);
    return () => window.removeEventListener('salead_drive_config_updated', handleDriveUpdate);
  }, [activeModal]);

  const handleToggleCalendar = async () => {
    if (calendarConn.connected) {
      if (confirm("Deseja desconectar sua conta do Google Agenda?")) {
        disconnectGoogleCalendar();
        setCalendarConn({ connected: false });
        toast.info("Google Agenda desconectada.");
      }
    } else {
      setIsConnectingCalendar(true);
      try {
        const res = await connectGoogleCalendar();
        setCalendarConn(res);
      } catch (e: any) {
        console.warn("Conexão com Google Agenda não concluída:", e?.message || e);
      } finally {
        setIsConnectingCalendar(false);
      }
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setCompany({ ...company, logo: base64 });
      toast.success("Logo atualizada!");
    };
    reader.readAsDataURL(file);
  };

  const toggleWorkingDay = (dayId: number) => {
    if (workingDays.includes(dayId)) {
      if (workingDays.length === 1) return toast.error("Selecione ao menos 1 dia.");
      setWorkingDays(workingDays.filter((d: number) => d !== dayId));
    } else {
      setWorkingDays([...workingDays, dayId].sort());
    }
  };

  const executeReset = () => {
    resetData();
    setShowResetConfirm(false);
    toast.success("Sistema resetado.");
  };

  const getProviderName = () => {
    switch (aiConfig.activeProvider) {
      case "google": return "Google Gemini";
      case "openrouter": return "OpenRouter";
      case "custom_paid": return "API Paga / OpenAI";
      default: return "OpenRouter";
    }
  };

  const { currentUser } = data;
  const isAdmin = !currentUser || 
                  currentUser.role === "Admin Geral" || 
                  currentUser.role === "Admin" || 
                  currentUser.role === "Head of Sales" || 
                  currentUser.email === "tiagorezeck@hotmail.com" || 
                  currentUser.email === "sistemascomet@gmail.com";

  if (currentUser && !isAdmin) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4 my-16 bg-card border border-destructive/20 rounded-3xl shadow-xl animate-in fade-in duration-300">
        <div className="h-12 w-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
          <Shield className="h-6 w-6" />
        </div>
        <h2 className="font-display font-bold text-xl text-foreground">Acesso Restrito ao Gestor</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          O painel de configurações gerais, integrações, Google Drive, inteligência artificial e funis é restrito aos administradores do sistema.
        </p>
        <button
          type="button"
          onClick={() => navigate({ to: "/app/dashboard" })}
          className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider shadow-sm hover:opacity-90 cursor-pointer"
        >
          Voltar ao Dashboard
        </button>
      </div>
    );
  }

  const driveConnected = Boolean(driveConfig?.connected || (driveConfig?.webappUrl && driveConfig.webappUrl.length > 0));

  const TOP_TABS = [
    { id: "empresa" as const, label: "Empresa", icon: Building2 },
    { id: "kanban" as const, label: "Kanban", icon: LayoutGrid },
    { id: "permissoes" as const, label: "Permissões", icon: Shield },
    { id: "sla" as const, label: "SLA & Alertas", icon: Timer },
    { id: "integracoes" as const, label: "Integrações", icon: KeyRound },
    { id: "dados" as const, label: "Dados", icon: Database },
  ];

  const EMPRESA_SUBTABS = [
    { id: "dados" as const, label: "Dados da Empresa", icon: FileText },
    { id: "jornada" as const, label: "Jornada", icon: CalendarIcon },
    { id: "aparencia" as const, label: "Aparência", icon: Palette },
  ];

  const SECTION_META = {
    empresa: {
      icon: Building2,
      title: "Empresa",
      subtitle: "Gerencie a identidade, jornada de trabalho e aparência da empresa.",
    },
    kanban: {
      icon: LayoutGrid,
      title: "Pipelines & Kanban",
      subtitle: "Crie e organize diferentes tipos de funis (Vendas, CS, Operação).",
    },
    permissoes: {
      icon: Eye,
      title: "Visibilidade & Módulos",
      subtitle: "Configure manualmente quais módulos do sistema e etapas Kanban cada cargo pode ver e usar.",
    },
    sla: {
      icon: Timer,
      title: "SLA & Alertas",
      subtitle: "Defina os tempos de resposta para leads em cada nível.",
    },
    integracoes: {
      icon: Zap,
      title: "Integrações",
      subtitle: "Conecte seus serviços externos de inteligência artificial e sincronização em nuvem.",
    },
    dados: {
      icon: Database,
      title: "Centro de Dados",
      subtitle: "Gestão completa de backups, exportação modular e portabilidade de dados.",
    },
  }[activeSection];

  const ActiveSectionIcon = SECTION_META.icon;

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto pb-20">
      {/* HEADER PRINCIPAL DA PÁGINA */}
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/15 flex items-center justify-center text-primary shrink-0">
          <Settings className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground">Configurações</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gerencie as preferências globais, pipelines, permissões e integrações.</p>
        </div>
      </div>

      {/* BARRA HORIZONTAL DE CATEGORIAS */}
      <div className="bg-card border border-border rounded-[1.5rem] p-2 shadow-sm">
        <nav aria-label="Seções de configurações" className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
          {TOP_TABS.map((tab) => {
            const TabIcon = tab.icon;
            const isActive = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSection(tab.id)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1.5 px-3 py-3 rounded-2xl transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <TabIcon className={cn("h-5 w-5", isActive ? "text-primary-foreground" : "text-primary")} />
                <span className="text-[11px] font-bold uppercase tracking-wider">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* SUB-CABEÇALHO DA SEÇÃO ATIVA + SUB-ABAS À DIREITA */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-1">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center text-primary shrink-0">
            <ActiveSectionIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-lg font-bold text-foreground leading-tight">{SECTION_META.title}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{SECTION_META.subtitle}</p>
          </div>
        </div>

        {activeSection === "empresa" && (
          <div className="inline-flex items-center p-1.5 rounded-2xl bg-card border border-border shadow-xs gap-1 overflow-x-auto max-w-full shrink-0">
            {EMPRESA_SUBTABS.map((sub) => {
              const SubIcon = sub.icon;
              const isSubActive = empresaSubTab === sub.id;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setEmpresaSubTab(sub.id)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0",
                    isSubActive
                      ? "bg-muted/70 dark:bg-muted text-primary border border-border/70 shadow-2xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  )}
                >
                  <SubIcon className={cn("h-3.5 w-3.5", isSubActive ? "text-primary" : "text-muted-foreground")} />
                  <span>{sub.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {activeSection === "kanban" && (
          <button
            type="button"
            onClick={() => setActiveModal("pipelines")}
            className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider shadow-sm hover:opacity-95 transition-opacity cursor-pointer inline-flex items-center gap-2 whitespace-nowrap shrink-0 self-start lg:self-auto"
          >
            <LayoutGrid className="h-4 w-4" />
            Gerenciar Pipelines
          </button>
        )}

        {activeSection === "permissoes" && (
          <button
            type="button"
            onClick={() => setActiveModal("permissions")}
            className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider shadow-sm hover:opacity-95 transition-opacity cursor-pointer inline-flex items-center gap-2 whitespace-nowrap shrink-0 self-start lg:self-auto"
          >
            <Eye className="h-4 w-4" />
            Configurar Permissões
          </button>
        )}

        {activeSection === "sla" && (
          <button
            type="button"
            onClick={() => setActiveModal("sla")}
            className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider shadow-sm hover:opacity-95 transition-opacity cursor-pointer inline-flex items-center gap-2 whitespace-nowrap shrink-0 self-start lg:self-auto"
          >
            <Timer className="h-4 w-4" />
            Editar Tempos de SLA
          </button>
        )}

        {activeSection === "dados" && (
          <button
            type="button"
            onClick={() => navigate({ to: "/app/settings/data" })}
            className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider shadow-sm hover:opacity-95 transition-opacity cursor-pointer inline-flex items-center gap-2 whitespace-nowrap shrink-0 self-start lg:self-auto"
          >
            <Database className="h-4 w-4" />
            Abrir Centro de Dados
          </button>
        )}
      </div>

      {/* CONTEÚDO PRINCIPAL EM CONTAINER ÚNICO ARREDONDADO */}
      {activeSection === "empresa" && (
        <div className="bg-card border border-border rounded-[1.75rem] p-6 md:p-8 shadow-sm">
          {empresaSubTab === "dados" && (
            <div>
              {/* Bloco Superior: Logomarca e Identidade */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-6 pb-7 mb-7 border-b border-border">
                <div className="relative w-28 h-28 shrink-0 group">
                  <div className="h-28 w-28 rounded-[1.5rem] bg-muted/60 border border-border overflow-hidden flex items-center justify-center transition-colors group-hover:border-primary/40">
                    {company?.logo ? (
                      <img src={company.logo} alt="Logo da Empresa" className="w-full h-full object-contain p-3" />
                    ) : (
                      <ImageIcon className="h-9 w-9 text-muted-foreground/50" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    title="Alterar Logomarca"
                    className="absolute -bottom-1.5 -right-1.5 h-9 w-9 rounded-xl bg-primary text-primary-foreground shadow-md flex items-center justify-center hover:scale-105 transition-transform cursor-pointer border-2 border-card"
                  >
                    <ImageIcon className="h-4 w-4" />
                  </button>
                  <input type="file" ref={logoInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
                </div>

                <div className="space-y-1.5 min-w-0">
                  <h3 className="text-base font-bold text-foreground">Logomarca e Identidade</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-md">
                    Esta imagem aparecerá na identidade visual da empresa, materiais comerciais e relatórios do sistema.
                  </p>
                </div>
              </div>

              {/* Faixa de Status Informativa */}
              <div className="rounded-2xl bg-emerald-500/8 dark:bg-emerald-500/10 border border-emerald-500/20 p-4 mb-7 flex items-start sm:items-center gap-3.5">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Phone className="h-4 w-4" />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wide text-foreground">
                      Contato & Identidade da Empresa
                    </span>
                    <span className={cn(
                      "text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-md",
                      (company?.contact || company?.email)
                        ? "bg-emerald-600 text-white"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {(company?.contact || company?.email) ? "Configurado" : "Pendente"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Contato principal: <strong className="text-foreground font-semibold">{company?.contact || "Não informado"}</strong>
                    {" · "}
                    E-mail: <strong className="text-foreground font-semibold">{company?.email || "Não informado"}</strong>
                  </p>
                </div>
              </div>

              {/* Campos do Perfil da Empresa */}
              <div className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-[11px] uppercase tracking-wider font-bold text-foreground/80 block">
                      Nome da Empresa*
                    </label>
                    <input
                      value={company?.name || ""}
                      onChange={(e) => setCompany({ ...company, name: e.target.value })}
                      placeholder="Nome da sua empresa"
                      className="w-full bg-muted/50 dark:bg-muted/30 border border-border rounded-2xl px-4 py-3 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] uppercase tracking-wider font-bold text-foreground/80 block">
                      Setor
                    </label>
                    <input
                      value={company?.sector || ""}
                      onChange={(e) => setCompany({ ...company, sector: e.target.value })}
                      placeholder="Ex: Tecnologia, Consultoria, Educação"
                      className="w-full bg-muted/50 dark:bg-muted/30 border border-border rounded-2xl px-4 py-3 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-[11px] uppercase tracking-wider font-bold text-foreground/80 flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-primary" />
                      <span>Celular / WhatsApp</span>
                    </label>
                    <input
                      value={company?.contact || ""}
                      onChange={(e) => setCompany({ ...company, contact: e.target.value })}
                      placeholder="+55 (00) 00000-0000"
                      className="w-full bg-muted/50 dark:bg-muted/30 border border-border rounded-2xl px-4 py-3 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] uppercase tracking-wider font-bold text-foreground/80 flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-primary" />
                      <span>E-mail</span>
                    </label>
                    <input
                      value={company?.email || ""}
                      onChange={(e) => setCompany({ ...company, email: e.target.value })}
                      placeholder="contato@empresa.com"
                      className="w-full bg-muted/50 dark:bg-muted/30 border border-border rounded-2xl px-4 py-3 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] uppercase tracking-wider font-bold text-foreground/80 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <span>Propósito (IA)</span>
                  </label>
                  <textarea
                    value={company?.purpose || ""}
                    onChange={(e) => setCompany({ ...company, purpose: e.target.value })}
                    placeholder="Descreva a proposta de valor e o público-alvo da empresa..."
                    className="w-full bg-muted/50 dark:bg-muted/30 border border-border rounded-2xl px-4 py-3.5 text-sm text-foreground min-h-[110px] resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          {empresaSubTab === "jornada" && (
            <div className="space-y-7">
              <div className="pb-6 border-b border-border space-y-4">
                <div>
                  <h3 className="text-base font-bold text-foreground">Dias Úteis de Operação</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Selecione os dias da semana considerados para cálculos de SLA e jornada comercial.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {WEEK_DAYS.map((day) => {
                    const selected = workingDays.includes(day.id);
                    return (
                      <button
                        key={day.id}
                        type="button"
                        onClick={() => toggleWorkingDay(day.id)}
                        className={cn(
                          "px-5 py-2.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer",
                          selected
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-muted/40 border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-foreground">Feriados e Dias Não Úteis</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Marque datas específicas em que o atendimento comercial não opera.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 max-w-md">
                  <input
                    type="date"
                    value={newHoliday}
                    onChange={(e) => setNewHoliday(e.target.value)}
                    className="flex-1 bg-muted/50 dark:bg-muted/30 border border-border rounded-2xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newHoliday) return;
                      setHolidays([...holidays, newHoliday].sort());
                      setNewHoliday("");
                    }}
                    className="px-6 py-2.5 rounded-2xl bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider cursor-pointer hover:opacity-95 transition-opacity whitespace-nowrap"
                  >
                    Marcar Dia
                  </button>
                </div>
                {Array.isArray(holidays) && holidays.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {holidays.map((h: string) => (
                      <span
                        key={h}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/50 border border-border text-xs font-mono text-foreground"
                      >
                        {h}
                        <button
                          type="button"
                          onClick={() => setHolidays(holidays.filter((d: string) => d !== h))}
                          className="text-muted-foreground hover:text-destructive cursor-pointer"
                          title="Remover data"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {empresaSubTab === "aparencia" && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-bold text-foreground">Aparência & Identidade Visual</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Alterne entre tema claro e escuro ou personalize dimensões de exibição da marca.
                </p>
              </div>

              <div className="space-y-4">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="w-full flex items-center justify-between p-5 rounded-2xl bg-muted/40 border border-border hover:border-primary/40 transition-all text-sm font-semibold cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="h-10 w-10 rounded-xl bg-card border border-border flex items-center justify-center shrink-0">
                      {theme === "dark" ? <Moon className="h-5 w-5 text-primary" /> : <Sun className="h-5 w-5 text-warning" />}
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-foreground">
                        {theme === "dark" ? "Modo Escuro Ativo" : "Modo Claro Ativo"}
                      </div>
                      <div className="text-xs font-normal text-muted-foreground">
                        Clique para alternar a aparência da interface
                      </div>
                    </div>
                  </div>
                  <div
                    className={cn(
                      "h-6 w-11 rounded-full relative transition-colors border border-border shrink-0",
                      theme === "dark" ? "bg-primary/20 border-primary/40" : "bg-muted"
                    )}
                  >
                    <div
                      className={cn(
                        "absolute top-0.5 w-4 h-4 rounded-full transition-all bg-primary shadow-sm",
                        theme === "dark" ? "left-6" : "left-1 bg-white"
                      )}
                    />
                  </div>
                </button>

                {LOGO_EDITOR_ENABLED && (
                  <button
                    type="button"
                    onClick={() => useBrandStore.getState().openModal()}
                    className="w-full flex items-center justify-between p-5 rounded-2xl bg-primary/8 border border-primary/25 hover:border-primary/50 hover:bg-primary/12 transition-all text-sm font-bold text-primary cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-sm shrink-0">
                        <Sliders className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <div className="text-foreground font-bold">Personalizar Logotipo & Dimensões</div>
                        <div className="text-xs font-normal text-muted-foreground">
                          Editar logotipo e tamanhos para Modo Escuro e Claro
                        </div>
                      </div>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-primary shrink-0" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {activeSection === "integracoes" && (
        <div className="bg-card border border-border rounded-[1.75rem] p-6 md:p-8 shadow-sm">
          <div className="grid md:grid-cols-3 gap-5">
            {/* Card Integração: LAN AI Agent */}
            <div
              onClick={() => setActiveModal("ai")}
              className="group bg-muted/25 hover:bg-muted/40 border border-border hover:border-primary/40 rounded-2xl p-6 transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-2xl bg-emerald-500/12 border border-emerald-500/25 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-display text-base font-bold text-foreground">LANAI — Agente de IA</h3>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                          {isAIConfigured ? "Ativo" : "Pendente"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">Criador Autônomo de Landing Pages & LLMs</p>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed mb-5">
                  Conecte modelos de linguagem do OpenRouter, Google Gemini ou APIs Pagas (OpenAI GPT-4o, Claude, DeepSeek) para gerar e reestruturar Landing Pages com autonomia total.
                </p>

                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-muted-foreground">Provedor Ativo</div>
                    <div className="text-xs font-bold text-foreground truncate mt-0.5">{getProviderName()}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-muted-foreground">Modelo em Uso</div>
                    <div className="text-xs font-bold text-foreground truncate mt-0.5">{aiConfig.modelName || aiConfig.modelId}</div>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-border flex items-center justify-between">
                <span className="text-[11px] font-bold text-primary group-hover:underline">
                  Configurar Chaves & Modelos
                </span>
                <span className="text-[11px] text-muted-foreground font-mono tabular-nums">
                  {aiConfig.customModels[aiConfig.activeProvider]?.length || 0} modelos
                </span>
              </div>
            </div>

            {/* Card Integração: Google Drive */}
            <div
              onClick={() => setActiveModal("gdrive")}
              className="group bg-muted/25 hover:bg-muted/40 border border-border hover:border-blue-500/40 rounded-2xl p-6 transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-2xl bg-blue-500/12 border border-blue-500/25 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                      <Cloud className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-display text-base font-bold text-foreground">Google Drive</h3>
                        <span
                          className={cn(
                            "text-[10px] uppercase font-bold px-2 py-0.5 rounded-md",
                            driveConnected
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {driveConnected ? "Conectado" : "Desconectado"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">Nuvem & Backup Automático de Dados</p>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-blue-500 shrink-0 transition-colors" />
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed mb-5">
                  Sincronize seus dados com o Google Drive para backups em tempo real, restauração de snapshots do CRM, histórico de pipelines e relatórios em nuvem com segurança.
                </p>

                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-muted-foreground">Status do Backup</div>
                    <div className="text-xs font-bold text-foreground truncate mt-0.5">
                      {driveConnected ? "Sincronização Ativa" : "Aguardando Conexão"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-muted-foreground">Pasta Destino</div>
                    <div className="text-xs font-bold text-foreground truncate mt-0.5 font-mono">
                      {driveConfig?.folderId ? driveConfig.folderId.slice(0, 10) + "..." : "Raiz Google Drive"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-border flex items-center justify-between">
                <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 group-hover:underline">
                  Configurar Google Drive & Backups
                </span>
                <span className="text-[11px] text-muted-foreground font-mono">OAuth 2.0</span>
              </div>
            </div>

            {/* Card Integração: Google Agenda */}
            <div
              onClick={handleToggleCalendar}
              className="group bg-muted/25 hover:bg-muted/40 border border-border hover:border-primary/40 rounded-2xl p-6 transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-2xl bg-primary/12 border border-primary/25 flex items-center justify-center text-primary shrink-0">
                      <CalendarIcon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-display text-base font-bold text-foreground">Google Agenda</h3>
                        <span
                          className={cn(
                            "text-[10px] uppercase font-bold px-2 py-0.5 rounded-md",
                            calendarConn.connected
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {calendarConn.connected ? "Conectado" : "Desconectado"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">Agendamento & Google Meet Automático</p>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed mb-5">
                  Crie e sincronize reuniões comerciais direto no Google Calendar dos clientes e vendedores com link de vídeo do Google Meet gerado automaticamente.
                </p>

                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-muted-foreground">Status da Agenda</div>
                    <div className="text-xs font-bold text-foreground truncate mt-0.5">
                      {calendarConn.connected ? "OAuth Ativo" : "Não Conectado"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-muted-foreground">Conta Conectada</div>
                    <div className="text-xs font-bold text-foreground truncate mt-0.5 font-mono">
                      {calendarConn.connected ? calendarConn.email : "Nenhuma"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-border flex items-center justify-between">
                <span className="text-[11px] font-bold text-primary group-hover:underline">
                  {isConnectingCalendar
                    ? "Conectando..."
                    : calendarConn.connected
                    ? "Gerenciar / Desconectar Agenda"
                    : "Conectar Google Agenda com OAuth"}
                </span>
                <span className="text-[11px] text-muted-foreground font-mono">Calendar API</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSection === "kanban" && (
        <div className="bg-card border border-border rounded-[1.75rem] p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border">
            <div>
              <h3 className="text-base font-bold text-foreground">Funis, Etapas e Cargos Habilitados</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Habilite ou desabilite quais cargos acessam cada pipeline. Ao cadastrar um novo login com um cargo, o sistema habilita o acesso automaticamente.
              </p>
            </div>
            <span className="text-xs font-mono tabular-nums text-muted-foreground">
              {pipelines.length} {pipelines.length === 1 ? "pipeline ativo" : "pipelines ativos"}
            </span>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {pipelines.map((pipe) => {
              const enabledRoles = getEffectiveEnabledRolesForPipeline(pipe);
              const toggleableRoles = ROLES.filter((r) => r !== "Admin Geral" && r !== "Head of Sales");

              const handleToggleRole = (roleName: string) => {
                const isEnabled = enabledRoles.includes(roleName);
                const nextRoles = isEnabled
                  ? enabledRoles.filter((r) => r !== roleName)
                  : [...enabledRoles, roleName];
                updatePipeline(pipe.id, { enabledRoles: nextRoles });
                toast.success(
                  isEnabled
                    ? `Cargo "${roleName}" desabilitado em ${pipe.name}.`
                    : `Cargo "${roleName}" habilitado em ${pipe.name}.`
                );
              };

              return (
                <div
                  key={pipe.id}
                  className="text-left p-5 rounded-2xl bg-muted/25 border border-border hover:border-primary/40 transition-all space-y-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <span className="font-display font-bold text-sm text-foreground block">{pipe.name}</span>
                      <span className="text-[11px] font-mono tabular-nums text-muted-foreground">
                        {pipe.stages.length} etapas · Cargo principal: {pipe.functionRole || "Comercial"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveModal("pipelines")}
                      className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 text-[11px] font-bold transition-colors cursor-pointer shrink-0"
                    >
                      Editar Etapas
                    </button>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-border/70">
                    <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                      Cargos habilitados nesta pipeline ({enabledRoles.length})
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {toggleableRoles.map((roleName) => {
                        const isOn = enabledRoles.includes(roleName);
                        return (
                          <button
                            key={roleName}
                            type="button"
                            onClick={() => handleToggleRole(roleName)}
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1 cursor-pointer",
                              isOn
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 shadow-2xs"
                                : "bg-background text-muted-foreground border-border opacity-60 hover:opacity-100"
                            )}
                            title={isOn ? `Clique para desabilitar ${roleName}` : `Clique para habilitar ${roleName}`}
                          >
                            {isOn ? <Check className="h-2.5 w-2.5" /> : <Plus className="h-2.5 w-2.5 opacity-60" />}
                            <span>{roleName}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/50">
                    {pipe.stages.map((st, idx) => (
                      <span
                        key={`${pipe.id}-${idx}`}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-background border border-border text-muted-foreground font-medium"
                      >
                        {st.name}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeSection === "permissoes" && (
        <div className="bg-card border border-border rounded-[1.75rem] p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border">
            <div>
              <h3 className="text-base font-bold text-foreground">Matriz de Visibilidade por Cargo</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Controle quais módulos laterais, etapas do Kanban e telas de Performance cada cargo acessa.
              </p>
            </div>
            <span className="text-xs font-mono tabular-nums text-muted-foreground">
              {ROLES.length} cargos · {SYSTEM_MODULES.length} módulos
            </span>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {ROLES.map((role) => {
              const mods = (roleModulePermissions?.[role] || DEFAULT_ROLE_MODULES[role] || DEFAULT_ROLE_MODULES["Closer"] || []).length;
              const stages = (rolePermissions?.[role] || []).length;
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => setActiveModal("permissions")}
                  className="text-left p-4 rounded-2xl bg-muted/25 border border-border hover:border-primary/40 hover:bg-muted/40 transition-all cursor-pointer flex items-center justify-between gap-3"
                >
                  <span className="text-sm font-bold text-foreground truncate">{role}</span>
                  <span className="text-xs font-mono tabular-nums text-muted-foreground shrink-0">
                    {mods} mód · {stages} etapas
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {activeSection === "sla" && (
        <div className="bg-card border border-border rounded-[1.75rem] p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border">
            <div>
              <h3 className="text-base font-bold text-foreground">Limites de Tempo de Resposta (SLA)</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Define quando os leads disparam avisos visuais de alerta, crítico ou vencido.
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-muted/30 border border-border space-y-1.5">
              <div className="text-[11px] uppercase tracking-wider font-bold text-amber-600 dark:text-amber-400">Alerta</div>
              <div className="text-2xl font-display font-extrabold tabular-nums text-foreground">{slaThresholds.alerta}h</div>
              <p className="text-xs text-muted-foreground">Primeiro aviso de atendimento pendente</p>
            </div>
            <div className="p-5 rounded-2xl bg-muted/30 border border-border space-y-1.5">
              <div className="text-[11px] uppercase tracking-wider font-bold text-orange-600 dark:text-orange-400">Crítico</div>
              <div className="text-2xl font-display font-extrabold tabular-nums text-foreground">{slaThresholds.critico}h</div>
              <p className="text-xs text-muted-foreground">Prioridade máxima para abordagem</p>
            </div>
            <div className="p-5 rounded-2xl bg-muted/30 border border-border space-y-1.5">
              <div className="text-[11px] uppercase tracking-wider font-bold text-destructive">Vencido</div>
              <div className="text-2xl font-display font-extrabold tabular-nums text-foreground">{slaThresholds.vencido}h</div>
              <p className="text-xs text-muted-foreground">Lead fora do prazo configurado</p>
            </div>
          </div>
        </div>
      )}

      {activeSection === "dados" && (
        <div className="bg-card border border-border rounded-[1.75rem] p-6 md:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <h3 className="text-base font-bold text-foreground">Portabilidade, Backups e Exportação Modular</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Exporte todo o banco de dados em JSON, baixe módulos individuais em CSV ou JSON e restaure backups com segurança sem perder leads.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate({ to: "/app/settings/data" })}
              className="px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider shadow-sm hover:opacity-95 transition-opacity cursor-pointer inline-flex items-center gap-2 whitespace-nowrap shrink-0 self-start md:self-auto"
            >
              <Database className="h-4 w-4" />
              Acessar Centro de Dados
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {activeModal === "pipelines" && (
        <PipelineManagerModal pipelines={pipelines} onAdd={addPipeline} onUpdate={updatePipeline} onDelete={deletePipeline} onClose={() => setActiveModal(null)} />
      )}

      {activeModal === "permissions" && (
        <PermissionsModal 
          permissions={rolePermissions} 
          pipelines={pipelines} 
          visibility={visibility} 
          roleModulePermissions={roleModulePermissions}
          onSaveRoleModules={updateRoleModulePermissions}
          onResetRoleModules={resetRoleModulePermissions}
          onSaveVisibility={setVisibility} 
          onSavePerms={updateRolePermissions} 
          onClose={() => setActiveModal(null)} 
        />
      )}

      {activeModal === "sla" && (
        <SLAModal thresholds={slaThresholds} onSave={(t: SLAThresholds) => { setSlaThresholds(t); setActiveModal(null); }} onClose={() => setActiveModal(null)} />
      )}

      {activeModal === "gdrive" && (
        <GDriveSettingsModal onClose={() => setActiveModal(null)} />
      )}

      {activeModal === "ai" && (
        <AISettingsModal onClose={() => setActiveModal(null)} />
      )}

      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent className="rounded-[2rem]">
          <AlertDialogHeader className="items-center text-center">
            <AlertDialogTitle className="font-display text-2xl font-black text-destructive">LIMPEZA TOTAL</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza? Isso apagará leads, tarefas e históricos permanentemente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={executeReset} className="bg-destructive text-white font-bold">SIM, APAGAR TUDO</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PermissionsModal({ 
  permissions, 
  pipelines, 
  visibility, 
  roleModulePermissions,
  onSaveRoleModules,
  onResetRoleModules,
  onSaveVisibility, 
  onSavePerms, 
  onClose 
}: { 
  permissions: Record<string, string[]>; 
  pipelines: Pipeline[]; 
  visibility: VisibilitySettings; 
  roleModulePermissions?: Record<string, string[]>;
  onSaveRoleModules?: (role: string, modules: string[]) => void;
  onResetRoleModules?: (role: string) => void;
  onSaveVisibility: (v: VisibilitySettings) => void; 
  onSavePerms: (role: string, stages: string[]) => void; 
  onClose: () => void;
}) {
  const [selectedRole, setSelectedRole] = useState(ROLES[0]);
  const [activeTab, setActiveTab] = useState<'modules' | 'kanban' | 'performance'>('modules');
  const [localPerms, setLocalPerms] = useState({ ...permissions });
  const [localVisibility, setLocalVisibility] = useState<VisibilitySettings>({ ...visibility });
  const [localRoleModules, setLocalRoleModules] = useState<Record<string, string[]>>(() => {
    const initial: Record<string, string[]> = {};
    ROLES.forEach(r => {
      initial[r] = roleModulePermissions?.[r] || DEFAULT_ROLE_MODULES[r] || DEFAULT_ROLE_MODULES["Closer"] || [];
    });
    return initial;
  });

  const currentRoleModules = localRoleModules[selectedRole] || DEFAULT_ROLE_MODULES[selectedRole] || [];

  const toggleModule = (modId: string) => {
    const current = localRoleModules[selectedRole] || DEFAULT_ROLE_MODULES[selectedRole] || [];
    const next = current.includes(modId) 
      ? current.filter(id => id !== modId) 
      : [...current, modId];
    setLocalRoleModules({ ...localRoleModules, [selectedRole]: next });
  };

  const applyModulePreset = (preset: 'sales_all' | 'sales_mkt' | 'leader_360' | 'all' | 'reset') => {
    let next: string[] = [];
    if (preset === 'sales_all') {
      next = ["dashboard", "daily_sales", "performance", "crm", "tasks", "leads", "products", "playbooks"];
    } else if (preset === 'sales_mkt') {
      next = ["dashboard", "daily_sales", "performance", "crm", "tasks", "leads", "products", "playbooks", "landing_pages", "surveys", "investments"];
    } else if (preset === 'leader_360') {
      next = ["dashboard", "daily_sales", "performance", "crm", "tasks", "leads", "products", "playbooks", "workflows", "automations", "landing_pages", "surveys", "investments"];
    } else if (preset === 'all') {
      next = SYSTEM_MODULES.map(m => m.id);
    } else if (preset === 'reset') {
      next = DEFAULT_ROLE_MODULES[selectedRole] || DEFAULT_ROLE_MODULES["Closer"] || [];
    }
    setLocalRoleModules({ ...localRoleModules, [selectedRole]: next });
    toast.info(`Preset aplicado para ${selectedRole}!`);
  };

  const toggleStage = (stage: string) => {
    const current = localPerms[selectedRole] || [];
    const next = current.includes(stage) ? current.filter((s: string) => s !== stage) : [...current, stage];
    setLocalPerms({ ...localPerms, [selectedRole]: next });
  };

  const togglePipeline = (pipeline: Pipeline) => {
    const current = localPerms[selectedRole] || [];
    const pipelineStages = pipeline.stages.map(s => s.name);
    const allSelected = pipelineStages.every(s => current.includes(s));
    
    let next;
    if (allSelected) {
      next = current.filter(s => !pipelineStages.includes(s));
    } else {
      next = Array.from(new Set([...current, ...pipelineStages]));
    }
    setLocalPerms({ ...localPerms, [selectedRole]: next });
  };

  const togglePerformanceModule = (key: keyof VisibilitySettings['performance']) => {
    setLocalVisibility(prev => ({ ...prev, performance: { ...prev.performance, [key]: !prev.performance[key] } }));
  };

  const handleSave = () => { 
    onSavePerms(selectedRole, localPerms[selectedRole] || []); 
    if (onSaveRoleModules) {
      // Salva para todos os cargos que foram editados
      Object.entries(localRoleModules).forEach(([r, mods]) => {
        onSaveRoleModules(r, mods);
      });
    }
    onSaveVisibility(localVisibility); 
    toast.success("Permissões e visibilidade de módulos salvas com sucesso!"); 
    onClose(); 
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-background border border-border rounded-[2rem] w-full max-w-6xl h-[88vh] shadow-2xl overflow-hidden flex">
        {/* Painel lateral: Seleção de Cargo */}
        <div className="w-64 border-r border-border bg-muted/30 flex flex-col shrink-0">
          <div className="p-4 border-b border-border font-bold text-xs uppercase tracking-widest text-muted-foreground">
            Cargos do Time
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {ROLES.map(r => {
              const modCount = (localRoleModules[r] || DEFAULT_ROLE_MODULES[r] || []).length;
              return (
                <button 
                  key={r} 
                  onClick={() => setSelectedRole(r)} 
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer",
                    selectedRole === r ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted text-foreground"
                  )}
                >
                  <span className="truncate pr-2">{r}</span>
                  <span className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full font-mono font-bold shrink-0",
                    selectedRole === r ? "bg-white/20 text-white" : "bg-muted-foreground/15 text-muted-foreground"
                  )}>
                    {modCount} mods
                  </span>
                </button>
              );
            })}
          </div>
          <div className="p-3 border-t border-border text-[11px] text-muted-foreground bg-background/50">
            Dica: No menu <strong className="text-foreground">Membros</strong> você pode personalizar exceções individuais.
          </div>
        </div>

        {/* Conteúdo Principal */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header do Modal com Abas */}
          <div className="p-5 border-b border-border flex items-center justify-between bg-gradient-surface">
            <div>
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" />
                <h2 className="font-display text-lg font-bold">Configuração de Visibilidade & Acessos</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">
                  {selectedRole}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Escolha o que os colaboradores com a função <strong className="text-foreground">{selectedRole}</strong> podem enxergar e utilizar no sistema.
              </p>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Barra de Abas */}
          <div className="px-6 border-b border-border bg-muted/20 flex gap-2 pt-2">
            <button
              onClick={() => setActiveTab('modules')}
              className={cn(
                "px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer",
                activeTab === 'modules' 
                  ? "border-primary text-primary bg-background/80 rounded-t-xl" 
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutGrid className="h-4 w-4" />
              Módulos do Sistema ({currentRoleModules.length}/{SYSTEM_MODULES.length})
            </button>
            <button
              onClick={() => setActiveTab('kanban')}
              className={cn(
                "px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer",
                activeTab === 'kanban' 
                  ? "border-primary text-primary bg-background/80 rounded-t-xl" 
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <KanbanSquare className="h-4 w-4" />
              Estágios Kanban ({localPerms[selectedRole]?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('performance')}
              className={cn(
                "px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer",
                activeTab === 'performance' 
                  ? "border-primary text-primary bg-background/80 rounded-t-xl" 
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Trophy className="h-4 w-4" />
              Visibilidade Performance
            </button>
          </div>

          {/* Área de rolagem das abas */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 scrollbar-thin">
            
            {/* ABA 1: MÓDULOS DO SISTEMA */}
            {activeTab === 'modules' && (
              <div className="space-y-6">
                <div className="bg-muted/30 border border-border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Sliders className="h-4 w-4 text-primary" />
                      Módulos Habilitados para {selectedRole}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Marque ou desmarque os módulos que aparecerão no menu lateral e nas rotas para este cargo.
                    </p>
                  </div>

                  {/* Presets Rápidos */}
                  <div className="flex flex-wrap gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => applyModulePreset('sales_all')}
                      className="text-[11px] px-2.5 py-1.5 rounded-lg bg-background border border-border hover:border-primary text-foreground font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Habilita todo o fluxo comercial: Dashboard, Vendas, Performance, CRM, Tarefas, Leads, Produtos e Playbooks"
                    >
                      🎯 Vendedor Generalista
                    </button>
                    <button
                      type="button"
                      onClick={() => applyModulePreset('sales_mkt')}
                      className="text-[11px] px-2.5 py-1.5 rounded-lg bg-background border border-border hover:border-primary text-foreground font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Habilita Comercial + Landing Pages, Pesquisas e Tráfego/Investimentos"
                    >
                      🚀 Comercial + Mkt
                    </button>
                    <button
                      type="button"
                      onClick={() => applyModulePreset('leader_360')}
                      className="text-[11px] px-2.5 py-1.5 rounded-lg bg-background border border-border hover:border-primary text-foreground font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Habilita Comercial + Mkt + Workflows + Automações"
                    >
                      👑 Líder 360
                    </button>
                    <button
                      type="button"
                      onClick={() => applyModulePreset('all')}
                      className="text-[11px] px-2.5 py-1.5 rounded-lg bg-background border border-border hover:border-primary text-foreground font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      ⚡ Todos
                    </button>
                    <button
                      type="button"
                      onClick={() => applyModulePreset('reset')}
                      className="text-[11px] px-2.5 py-1.5 rounded-lg bg-background border border-border hover:border-destructive text-muted-foreground hover:text-destructive font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Volta aos módulos originais do cargo"
                    >
                      <RefreshCw className="h-3 w-3" /> Padrão
                    </button>
                  </div>
                </div>

                {/* Grid dos Módulos do Sistema */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {SYSTEM_MODULES.map((mod) => {
                    const isAllowed = currentRoleModules.includes(mod.id);
                    return (
                      <div
                        key={mod.id}
                        onClick={() => toggleModule(mod.id)}
                        className={cn(
                          "p-4 rounded-2xl border transition-all text-left flex items-start gap-3.5 cursor-pointer select-none",
                          isAllowed 
                            ? "bg-primary/5 border-primary/40 shadow-xs ring-1 ring-primary/20" 
                            : "bg-muted/20 border-border opacity-65 hover:opacity-100 hover:border-border"
                        )}
                      >
                        <div className={cn(
                          "h-5 w-5 mt-0.5 rounded-md flex items-center justify-center border shrink-0 transition-colors",
                          isAllowed ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30 bg-muted/60"
                        )}>
                          {isAllowed && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                        </div>

                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-foreground truncate">{mod.name}</span>
                            <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-muted border border-border text-muted-foreground shrink-0">
                              {mod.category}
                            </span>
                          </div>
                          <div className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
                            {mod.description}
                          </div>
                          <div className="text-[10px] font-mono text-muted-foreground/80 pt-0.5">
                            {mod.path}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ABA 2: ESTÁGIOS KANBAN */}
            {activeTab === 'kanban' && (
              <section className="space-y-8">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <KanbanSquare className="h-4 w-4 text-primary" /> Estágios Kanban Permitidos para: {selectedRole}
                  </h3>
                  <span className="text-xs text-muted-foreground font-mono">
                    {localPerms[selectedRole]?.length || 0} estágios visíveis
                  </span>
                </div>
                
                <div className="grid gap-8">
                  {pipelines.map(pipe => {
                    const currentRolePerms = localPerms[selectedRole] || [];
                    const isAllSelected = pipe.stages.every(s => currentRolePerms.includes(s.name));
                    
                    return (
                      <div key={pipe.id} className="space-y-3 p-4 rounded-2xl bg-muted/20 border border-border">
                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-2">
                             <div className={cn("h-3 w-3 rounded-full", 
                               pipe.color === 'primary' ? "bg-primary" : 
                               pipe.color === 'blue' ? "bg-blue-500" : 
                               pipe.color === 'green' ? "bg-emerald-500" : "bg-muted"
                             )} />
                             <h4 className="font-display font-black text-sm uppercase tracking-wider">{pipe.name}</h4>
                           </div>
                           <button 
                            type="button"
                            onClick={() => togglePipeline(pipe)}
                            className={cn(
                              "text-[10px] font-black uppercase px-3 py-1.5 rounded-lg border transition-all cursor-pointer",
                              isAllSelected ? "bg-primary text-white border-primary" : "bg-background text-muted-foreground border-border hover:bg-primary/10 hover:text-primary"
                            )}
                           >
                             {isAllSelected ? "Deselecionar Pipeline" : "Selecionar Tudo"}
                           </button>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2">
                          {pipe.stages.map(stage => {
                            const isAllowed = currentRolePerms.includes(stage.name);
                            return (
                              <button 
                                key={stage.name} 
                                type="button"
                                onClick={() => toggleStage(stage.name)} 
                                className={cn(
                                  "flex items-center justify-between p-3 rounded-xl border transition-all text-left cursor-pointer", 
                                  isAllowed ? "bg-primary/5 border-primary/40 text-primary shadow-xs font-bold" : "bg-background/80 border-border text-muted-foreground hover:bg-muted"
                                )}
                              >
                                <span className="text-[11px] truncate pr-2">{stage.name}</span>
                                {isAllowed && <Check className="h-3.5 w-3.5 shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ABA 3: VISIBILIDADE PERFORMANCE */}
            {activeTab === 'performance' && (
              <section className="space-y-6">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-primary" /> Módulos de Performance Global
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ative ou desative as telas da área de Performance visíveis aos usuários.
                  </p>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <ToggleButton icon={Trophy} label="Ranking de Vendas" active={localVisibility.performance.ranking} onClick={() => togglePerformanceModule('ranking')} />
                  <ToggleButton icon={Medal} label="Pódio de Campeões" active={localVisibility.performance.podium} onClick={() => togglePerformanceModule('podium')} />
                  <ToggleButton icon={ClipboardCheck} label="Metas e Desempenho" active={localVisibility.performance.goals} onClick={() => togglePerformanceModule('goals')} />
                  <ToggleButton icon={Layout} label="Matriz de Acessos" active={localVisibility.performance.matrix} onClick={() => togglePerformanceModule('matrix')} />
                </div>
              </section>
            )}

          </div>

          {/* Rodapé com botões de Ação */}
          <div className="p-5 border-t border-border bg-muted/10 flex items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground hidden sm:block">
              As alterações nos módulos refletirão no menu lateral de todos os membros de <strong className="text-foreground">{selectedRole}</strong>.
            </div>
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="px-5 py-3 rounded-xl border border-border text-xs font-bold uppercase tracking-widest hover:bg-muted cursor-pointer transition-colors">
                Cancelar
              </button>
              <button onClick={handleSave} className="px-8 py-3 rounded-xl bg-gradient-primary text-primary-foreground font-black text-xs uppercase tracking-widest shadow-elegant hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-2">
                <Save className="h-4 w-4" />
                SALVAR PERMISSÕES
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToggleButton({ icon: Icon, label, active, onClick }: { icon: any; label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn("flex items-center justify-between p-4 rounded-xl border transition-all text-left", active ? "bg-primary/5 border-primary/30 text-primary" : "bg-muted/30 border-border text-muted-foreground hover:bg-muted")}>
      <div className="flex items-center gap-3"><Icon className="h-4 w-4" /><span className="text-xs font-bold">{label}</span></div>
      <div className={cn("w-10 h-5 rounded-full relative transition-colors", active ? "bg-primary" : "bg-muted")}><div className={cn("absolute top-1 w-3 h-3 bg-white rounded-full transition-all", active ? "left-6" : "left-1")} /></div>
    </button>
  );
}

function PipelineManagerModal({ pipelines, onAdd, onUpdate, onDelete, onClose }: { pipelines: Pipeline[]; onAdd: (name: string) => void; onUpdate: (id: string, updates: Partial<Pipeline>) => void; onDelete: (id: string) => void; onClose: () => void }) {
  const [selectedId, setSelectedId] = useState(pipelines[0]?.id);
  const active = pipelines.find((p) => p.id === selectedId);
  const [newStage, setNewStage] = useState("");
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-background border border-border rounded-2xl w-full max-w-5xl h-[85vh] shadow-2xl overflow-hidden flex">
        <div className="w-64 border-r border-border bg-muted/30 flex flex-col"><div className="p-4 border-b border-border flex items-center justify-between font-bold text-xs uppercase tracking-widest text-muted-foreground"><span>Pipelines</span><button onClick={() => onAdd("Novo Funil")} className="p-1 hover:bg-primary/10 text-primary rounded"><Plus className="h-4 w-4" /></button></div><div className="flex-1 overflow-y-auto p-2 space-y-1">{pipelines.map((p) => (<button key={p.id} onClick={() => setSelectedId(p.id)} className={cn("w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all", selectedId === p.id ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>{p.name}</button>))}</div></div>
        <div className="flex-1 flex flex-col">
          <div className="p-5 border-b border-border flex items-center justify-between"><div className="flex items-center gap-2"><LayoutGrid className="h-5 w-5 text-primary" /><h2 className="font-display text-lg font-bold">Editar Pipeline</h2></div><button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button></div>
          {active ? (<div className="flex-1 overflow-y-auto p-6 space-y-8">
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-1.5"><label className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground">Nome</label><input value={active.name} onChange={e => onUpdate(active.id, { name: e.target.value })} className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm font-bold" /></div>
              <div className="space-y-1.5"><label className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground">Cor Global</label><div className="flex gap-2">{PIPELINE_COLORS.map(c => (<button key={c.id} onClick={() => onUpdate(active.id, { color: c.id })} className={cn("h-8 w-8 rounded-full border-2", c.bg, active.color === c.id ? "border-foreground scale-110" : "border-transparent")} />))}</div></div>
            </div>
            <div className="space-y-2.5">
              <label className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground">
                Cargos Habilitados nesta Pipeline
              </label>
              <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-muted/20 border border-border">
                {ROLES.filter((r) => r !== "Admin Geral" && r !== "Head of Sales").map((roleName) => {
                  const enabledList = getEffectiveEnabledRolesForPipeline(active);
                  const isOn = enabledList.includes(roleName);
                  return (
                    <button
                      key={roleName}
                      type="button"
                      onClick={() => {
                        const nextRoles = isOn
                          ? enabledList.filter((r) => r !== roleName)
                          : [...enabledList, roleName];
                        onUpdate(active.id, { enabledRoles: nextRoles });
                      }}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1 cursor-pointer",
                        isOn
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40"
                          : "bg-background text-muted-foreground border-border opacity-60 hover:opacity-100"
                      )}
                    >
                      {isOn ? <Check className="h-2.5 w-2.5" /> : <Plus className="h-2.5 w-2.5" />}
                      <span>{roleName}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground">Etapas</label>
              <div className="space-y-2">
                {active.stages.map((s: PipelineStage, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-muted/30 border border-border rounded-xl group">
                    <input value={s.name} onChange={e => { const next = [...active.stages]; next[i].name = e.target.value; onUpdate(active.id, { stages: next }); }} className="flex-1 bg-transparent border-none text-sm font-medium" />
                    <div className="flex gap-1.5">{STAGE_COLORS.map(sc => (<button key={sc.id} onClick={() => { const next = [...active.stages]; next[i].color = sc.id; onUpdate(active.id, { stages: next }); }} className={cn("h-6 w-6 rounded-full border transition-all", sc.bg, (s.color || 'default') === sc.id ? "ring-2 ring-offset-2 ring-primary" : "opacity-40 hover:opacity-100")} />))}</div>
                    <button onClick={() => { const next = active.stages.filter((_, idx: number) => idx !== i); onUpdate(active.id, { stages: next }); }} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-2"><input value={newStage} onChange={e => setNewStage(e.target.value)} placeholder="Nova etapa..." className="flex-1 bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm" onKeyDown={e => { if(e.key === 'Enter' && newStage.trim()){ onUpdate(active.id, { stages: [...active.stages, { name: newStage, color: 'default' }] }); setNewStage(""); } }} /><button onClick={() => { if(newStage.trim()){ onUpdate(active.id, { stages: [...active.stages, { name: newStage, color: 'default' }] }); setNewStage(""); } }} className="px-4 py-2 rounded-lg bg-primary text-white font-bold text-xs uppercase tracking-widest">ADICIONAR</button></div>
            </div>
          </div>) : (<div className="flex-1 grid place-items-center text-muted-foreground">Selecione um pipeline para editar.</div>)}
          <div className="p-6 border-t border-border bg-muted/10 flex justify-end"><button onClick={onClose} className="px-8 py-2.5 rounded-lg bg-primary text-white font-black text-xs uppercase tracking-widest shadow-elegant">FECHAR</button></div>
        </div>
      </div>
    </div>
  );
}

function SLAModal({ thresholds, onSave, onClose }: { thresholds: SLAThresholds; onSave: (t: SLAThresholds) => void; onClose: () => void }) {
  const [local, setLocal] = useState<SLAThresholds>({ ...thresholds });
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"><div className="bg-background border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"><div className="p-5 border-b border-border flex items-center justify-between"><div className="flex items-center gap-2"><Timer className="h-5 w-5 text-primary" /><h2 className="font-display text-lg font-bold">Configurar SLA</h2></div><button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg"><X className="h-5 w-5" /></button></div><div className="p-6 space-y-6"><SLARow label="Alerta" color="text-warning" value={local.alerta} onChange={(v: number) => setLocal({...local, alerta: v})} /><SLARow label="Crítico" color="text-destructive" value={local.critico} onChange={(v: number) => setLocal({...local, critico: v})} /><SLARow label="Vencido" color="text-destructive" value={local.vencido} onChange={(v: number) => setLocal({...local, vencido: v})} /><div className="pt-4 flex gap-3"><button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium">Cancelar</button><button onClick={() => onSave(local)} className="flex-1 py-2.5 rounded-lg bg-primary text-white font-bold text-sm">SALVAR</button></div></div></div></div>
  );
}

function SLARow({ label, color, value, onChange }: { label: string; color: string; value: number; onChange: (v: number) => void }) {
  return (<div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border"><div className="flex items-center gap-2"><div className={cn("h-2 w-2 rounded-full", color)} /><span className="text-sm font-bold">{label}</span></div><div className="flex items-center gap-2"><input type="number" value={value} onChange={e => onChange(Number(e.target.value))} className="w-16 bg-background border border-border rounded px-2 py-1 text-sm text-center font-mono" /><span className="text-[10px] uppercase font-bold text-muted-foreground">Horas</span></div></div>);
}