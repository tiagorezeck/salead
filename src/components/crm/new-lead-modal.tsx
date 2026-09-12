import { SOURCES, type SLA, type Classification, type LeadType, type Strategy, type DecisionRole, type MINScore, type CaptureType } from "@/data/mock";
import { X, Flame, Sparkles, User, Building2, DollarSign, Globe, Check, AlertCircle } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useData } from "@/hooks/use-data";
import { calculateMinQualification, getMinClassificationBadge, type MinScoreValue } from "@/lib/min-qualification";
import { type LeadStatusCode, LEAD_STATUS_CONFIG } from "@/lib/lead-status-utils";
import { MaskedInput } from "@/components/ui/masked-input";
import { validatePhone, validateEmail, normalizePhone, parseCurrencyBR } from "@/lib/validators";

interface NewLeadModalProps {
  onClose: () => void;
  onAdd: (l: any) => void;
}

export function NewLeadModal({ onClose, onAdd }: NewLeadModalProps) {
  const { users, landingPages, currentUser } = useData();

  // 1. Dados do Lead
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [personType, setPersonType] = useState<'PF' | 'PJ'>('PJ');
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [revenue, setRevenue] = useState<string>("");
  const [email, setEmail] = useState("");

  // Status Comercial (Código Visual)
  const [statusCode, setStatusCode] = useState<LeadStatusCode>('novo');

  // 2. Qualificação MIN (Opcional no cadastro inicial)
  const [minM, setMinM] = useState<MinScoreValue | null>(null);
  const [minI, setMinI] = useState<MinScoreValue | null>(null);
  const [minN, setMinN] = useState<MinScoreValue | null>(null);

  // 3. Dados Comerciais (Opcionais)
  const [value, setValue] = useState<string>("");
  const [capag, setCapag] = useState<string>("");
  const [owner, setOwner] = useState(currentUser?.name || users[0]?.name || "Admin");

  // 4. Origem (Obrigatória)
  const [source, setSource] = useState("Instagram");
  const [landingPage, setLandingPage] = useState("");
  const [lpVisits, setLpVisits] = useState<number>(1);

  // Cálculo automático do MIN
  const minResult = useMemo(() => {
    if (minM === null && minI === null && minN === null) return undefined;
    return calculateMinQualification(minM, minI, minN);
  }, [minM, minI, minN]);

  const minBadge = useMemo(() => getMinClassificationBadge(minResult), [minResult]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validações obrigatórias: Nome, WhatsApp, Origem
    if (!name.trim()) {
      toast.error("Por favor, preencha o Nome do lead.");
      return;
    }
    
    // Validação Rígida de Telefone no Padrão Brasileiro
    const phoneCheck = validatePhone(whatsapp);
    if (!phoneCheck.isValid) {
      toast.error(phoneCheck.error || "Telefone inválido. Formato exigido: +55 (XX) XXXXX-XXXX");
      return;
    }

    // Validação Rígida de E-mail (se fornecido)
    let cleanEmail = email.trim().toLowerCase();
    if (cleanEmail) {
      const emailCheck = validateEmail(cleanEmail);
      if (!emailCheck.isValid) {
        toast.error(emailCheck.error || "E-mail inválido.");
        return;
      }
      cleanEmail = emailCheck.normalized;
    }

    if (!source.trim()) {
      toast.error("Por favor, selecione a Origem do lead.");
      return;
    }
    if (source === "Landing Page" && !landingPage && landingPages.length > 0) {
      toast.error("Por favor, selecione a Landing Page de origem.");
      return;
    }

    const now = new Date().toISOString();

    // Determinar minScore legado para manter compatibilidade com kanban/filtros legados
    let legacyMinScore: MINScore = "Nenhum";
    if (minM === 1 && minI === 1 && minN === 1) legacyMinScore = "MIN";
    else if (minM === 1 && minI === 1) legacyMinScore = "MI";
    else if (minM === 1 && minN === 1) legacyMinScore = "MN";
    else if (minI === 1 && minN === 1) legacyMinScore = "IN";
    else if (minM === 1) legacyMinScore = "M";
    else if (minI === 1) legacyMinScore = "I";
    else if (minN === 1) legacyMinScore = "N";

    const isCustomer = statusCode === 'cliente_recorrente';
    const isRecurring = statusCode === 'recorrente_sem_compra' || isCustomer || lpVisits > 1;
    const isDisqualified = statusCode === 'desqualificado';
    const isDeleted = statusCode === 'excluido';

    const payload = {
      name: name.trim(),
      whatsapp: phoneCheck.normalized,
      email: cleanEmail,
      personType,
      company: personType === 'PJ' ? company.trim() : (company.trim() || name.trim()),
      role: role.trim(),
      revenue: revenue ? parseCurrencyBR(String(revenue)) || revenue : "",
      capag: capag ? Number(capag) || capag : "",
      value: value ? parseCurrencyBR(String(value)) || 0 : 0,
      owner: owner || "Admin",
      source,
      landingPage: source === "Landing Page" ? landingPage : undefined,
      stage: isCustomer ? "Ganho" : isDisqualified ? "Descarte" : "Leads",
      status: isDeleted ? "Excluido" : isDisqualified ? "Desqualificado" : "Ativo",
      captureType: (source === "Landing Page" ? "Inbound" : "Manual") as CaptureType,
      classification: (isCustomer ? "Cliente" : "Lead") as Classification,
      temperature: isCustomer ? "Quente" : isDisqualified ? "Frio" : minResult ? (minResult.classification === "QUENTE" ? "Quente" : minResult.classification === "MORNO" ? "Morno" : "Frio") : "Frio",
      type: (isRecurring ? "Recorrente" : "Novo") as LeadType,
      isCustomer: Boolean(isCustomer),
      isRecurring: Boolean(isRecurring),
      lpVisits: Number(lpVisits) || (source === "Landing Page" ? 1 : 0),
      decisionRole: "Não Decisor" as DecisionRole,
      minScore: legacyMinScore,
      minQualification: minResult,
      strategy: "Nenhuma" as Strategy,
      sla: "ok" as SLA,
      score: isCustomer ? 95 : isDisqualified ? 0 : minResult ? (minResult.total === 3 ? 60 : minResult.total === 2 ? 40 : 20) : 0,
      lastInteraction: isCustomer ? "Cliente já comprou anteriormente" : "Sem contato",
      createdAt: now,
      activities: [
        {
          id: `act-${Date.now()}`,
          type: "system",
          description: `Lead cadastrado como [${LEAD_STATUS_CONFIG[statusCode].visualCodeName} - ${LEAD_STATUS_CONFIG[statusCode].label}] via ${source} com ${lpVisits} visita(s) a LPs.`,
          timestamp: new Date().toLocaleString("pt-BR"),
          user: currentUser?.name || "Sistema"
        }
      ]
    };

    onAdd(payload);
    toast.success("Lead cadastrado com sucesso!");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-background border border-border rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-gradient-surface">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <h2 className="font-display text-lg font-bold">Novo Cadastro de Lead</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Cadastro rápido. Apenas <strong className="text-foreground font-semibold">Nome</strong>, <strong className="text-foreground font-semibold">WhatsApp</strong> e <strong className="text-foreground font-semibold">Origem</strong> são obrigatórios.
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Formulário com Grupos Organizados */}
        <form onSubmit={handleSubmit} className="p-5 space-y-6 overflow-y-auto flex-1">
          
          {/* GRUPO 1: DADOS DO LEAD */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-1.5">
              <div className="text-[11px] font-black uppercase text-foreground tracking-wider flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-primary" /> 1. Dados do Lead
              </div>
              <div className="flex items-center gap-1 bg-muted p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => setPersonType('PJ')}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[10px] font-bold transition-all",
                    personType === 'PJ' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Pessoa Jurídica (PJ)
                </button>
                <button
                  type="button"
                  onClick={() => setPersonType('PF')}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[10px] font-bold transition-all",
                    personType === 'PF' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Pessoa Física (PF)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-foreground">
                  Nome do Lead <span className="text-destructive">*</span>
                </label>
                <input
                  required
                  type="text"
                  placeholder="Ex: João da Silva"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-foreground">
                  WhatsApp <span className="text-destructive">*</span>
                </label>
                <MaskedInput
                  maskType="phone"
                  required
                  placeholder="+55 (24) 99999-9999"
                  value={whatsapp}
                  onChange={(val) => setWhatsapp(val)}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">
                  E-mail (opcional)
                </label>
                <MaskedInput
                  maskType="email"
                  placeholder="exemplo@empresa.com"
                  value={email}
                  onChange={(val) => setEmail(val)}
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">
                  {personType === 'PJ' ? "Empresa" : "Empresa / Negócio (opcional)"}
                </label>
                <input
                  type="text"
                  placeholder={personType === 'PJ' ? "Ex: Tech Solutions" : "Opcional"}
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full bg-muted/40 border border-border rounded-xl px-3 py-2 text-sm focus:border-primary outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">
                  Cargo (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Diretor, Gerente"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-muted/40 border border-border rounded-xl px-3 py-2 text-sm focus:border-primary outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">
                  {personType === 'PJ' ? "Faturamento (R$)" : "Remuneração / Renda (R$)"}
                </label>
                <input
                  type="number"
                  placeholder="Opcional"
                  value={revenue}
                  onChange={(e) => setRevenue(e.target.value)}
                  className="w-full bg-muted/40 border border-border rounded-xl px-3 py-2 text-sm focus:border-primary outline-none"
                />
              </div>
            </div>
          </div>

          {/* GRUPO 2: QUALIFICAÇÃO MIN (Opcional, com cálculo automático) */}
          <div className="space-y-3 p-3.5 rounded-2xl bg-muted/20 border border-border">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-[11px] font-black uppercase text-foreground tracking-wider flex items-center gap-1.5">
                  <Flame className="h-3.5 w-3.5 text-primary" /> 2. Qualificação MIN (Opcional)
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Classificação calculada automaticamente pelo somatório de Momento, Interesse e Necessidade.
                </p>
              </div>

              {/* Badge de Classificação Automática */}
              <div className={cn(
                "px-2.5 py-1 rounded-xl border flex items-center gap-1.5 shadow-sm text-xs font-black uppercase",
                minBadge.bg, minBadge.text, minBadge.border
              )}>
                <span>{minBadge.emoji}</span>
                <span>{minBadge.label}</span>
                <span className="text-[10px] opacity-80">({minBadge.scoreText})</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              {/* M - Momento */}
              <div className="p-2.5 rounded-xl bg-background border border-border flex flex-col justify-between gap-2">
                <div>
                  <div className="text-xs font-bold text-foreground flex items-center gap-1">
                    <span className="h-4 w-4 rounded-full bg-primary/10 text-primary grid place-items-center text-[10px] font-black">M</span>
                    Momento
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">É a hora certa para compra?</div>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setMinM(minM === 1 ? null : 1)}
                    className={cn(
                      "py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1",
                      minM === 1 ? "bg-emerald-500 text-white border-emerald-500 shadow-sm" : "bg-muted/40 border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {minM === 1 && <Check className="h-3 w-3" />} Sim (1)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMinM(minM === 0 ? null : 0)}
                    className={cn(
                      "py-1.5 rounded-lg text-xs font-bold border transition-all",
                      minM === 0 ? "bg-zinc-700 text-white border-zinc-700 shadow-sm" : "bg-muted/40 border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Não (0)
                  </button>
                </div>
              </div>

              {/* I - Interesse */}
              <div className="p-2.5 rounded-xl bg-background border border-border flex flex-col justify-between gap-2">
                <div>
                  <div className="text-xs font-bold text-foreground flex items-center gap-1">
                    <span className="h-4 w-4 rounded-full bg-primary/10 text-primary grid place-items-center text-[10px] font-black">I</span>
                    Interesse
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">Demonstrou desejo claro?</div>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setMinI(minI === 1 ? null : 1)}
                    className={cn(
                      "py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1",
                      minI === 1 ? "bg-emerald-500 text-white border-emerald-500 shadow-sm" : "bg-muted/40 border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {minI === 1 && <Check className="h-3 w-3" />} Sim (1)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMinI(minI === 0 ? null : 0)}
                    className={cn(
                      "py-1.5 rounded-lg text-xs font-bold border transition-all",
                      minI === 0 ? "bg-zinc-700 text-white border-zinc-700 shadow-sm" : "bg-muted/40 border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Não (0)
                  </button>
                </div>
              </div>

              {/* N - Necessidade */}
              <div className="p-2.5 rounded-xl bg-background border border-border flex flex-col justify-between gap-2">
                <div>
                  <div className="text-xs font-bold text-foreground flex items-center gap-1">
                    <span className="h-4 w-4 rounded-full bg-primary/10 text-primary grid place-items-center text-[10px] font-black">N</span>
                    Necessidade
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">Possui a dor que resolvemos?</div>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setMinN(minN === 1 ? null : 1)}
                    className={cn(
                      "py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1",
                      minN === 1 ? "bg-emerald-500 text-white border-emerald-500 shadow-sm" : "bg-muted/40 border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {minN === 1 && <Check className="h-3 w-3" />} Sim (1)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMinN(minN === 0 ? null : 0)}
                    className={cn(
                      "py-1.5 rounded-lg text-xs font-bold border transition-all",
                      minN === 0 ? "bg-zinc-700 text-white border-zinc-700 shadow-sm" : "bg-muted/40 border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Não (0)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* GRUPO 3: DADOS COMERCIAIS */}
          <div className="space-y-3">
            <div className="text-[11px] font-black uppercase text-foreground tracking-wider flex items-center gap-1.5 border-b border-border pb-1.5">
              <DollarSign className="h-3.5 w-3.5 text-primary" /> 3. Dados Comerciais (Opcionais)
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">
                  Capag (Capacidade de Pag.)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Alta, R$ 50k, etc."
                  value={capag}
                  onChange={(e) => setCapag(e.target.value)}
                  className="w-full bg-muted/40 border border-border rounded-xl px-3 py-2 text-sm focus:border-primary outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">
                  Valor Estimado (R$)
                </label>
                <input
                  type="number"
                  placeholder="0,00"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="w-full bg-muted/40 border border-border rounded-xl px-3 py-2 text-sm focus:border-primary outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">
                  Responsável
                </label>
                <select
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:border-primary outline-none"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.name}>{u.name}</option>
                  ))}
                  {users.length === 0 && <option value="Admin">Admin</option>}
                </select>
              </div>
            </div>
          </div>

          {/* GRUPO 4: ORIGEM */}
          <div className="space-y-3">
            <div className="text-[11px] font-black uppercase text-foreground tracking-wider flex items-center gap-1.5 border-b border-border pb-1.5">
              <Globe className="h-3.5 w-3.5 text-primary" /> 4. Origem <span className="text-destructive">*</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-foreground">
                  Canal de Origem <span className="text-destructive">*</span>
                </label>
                <select
                  required
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:border-primary outline-none font-medium"
                >
                  {SOURCES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {source === "Landing Page" && (
                <div className="space-y-1 animate-in fade-in">
                  <label className="text-[11px] font-bold text-foreground">
                    Landing Page de Entrada <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={landingPage}
                    onChange={(e) => setLandingPage(e.target.value)}
                    className="w-full bg-background border border-primary/50 rounded-xl px-3 py-2 text-sm focus:border-primary outline-none font-medium"
                  >
                    <option value="">Selecione a Landing Page</option>
                    {landingPages.map((lp) => (
                      <option key={lp.id} value={lp.title || lp.name}>{lp.title || lp.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Status Inicial & Visitas a LPs */}
            <div className="space-y-1 pt-1">
              <label className="text-[11px] font-bold text-foreground">
                Status Inicial do Lead
              </label>
              <select
                value={statusCode}
                onChange={(e) => {
                  const code = e.target.value as LeadStatusCode;
                  setStatusCode(code);
                  if (code === 'recorrente_sem_compra' && lpVisits < 2) {
                    setLpVisits(2);
                  }
                }}
                className="w-full bg-muted/40 border border-border rounded-xl px-3 py-2 text-sm focus:border-primary outline-none font-medium"
              >
                <option value="novo">🟢 Lead - Novo (1º contato)</option>
                <option value="recorrente_sem_compra">🟡 Recorrente (Nunca comprou)</option>
                <option value="cliente_recorrente">🔵 Cliente Recorrente (Já comprou)</option>
                <option value="desqualificado">🔴 Desqualificado</option>
                <option value="excluido">❌ Excluído</option>
              </select>
            </div>

            <div className="space-y-1 pt-1">
              <label className="text-[11px] font-bold text-foreground flex items-center justify-between">
                <span>Número de Visitas a LPs</span>
                <span className="text-[10px] font-normal text-muted-foreground">Histórico</span>
              </label>
              <input
                type="number"
                min="1"
                max="999"
                value={lpVisits}
                onChange={(e) => setLpVisits(Math.max(1, Number(e.target.value) || 1))}
                className="w-full bg-muted/40 border border-border rounded-xl px-3 py-2 text-sm focus:border-primary outline-none font-bold"
              />
            </div>

            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 bg-muted/30 p-2.5 rounded-xl border border-border/50">
              <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>A <strong>Data de Entrada</strong> será gravada automaticamente pelo sistema com a data/hora atual.</span>
            </div>
          </div>

          {/* Ações */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-gradient-primary text-primary-foreground font-bold text-sm shadow-elegant hover:opacity-95 transition-all flex items-center gap-2"
            >
              <Check className="h-4 w-4" /> Salvar Lead
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
