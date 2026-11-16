import { useState, useMemo } from "react";
import { X, ArrowRight, Layers, UserCheck, FileText, CheckCircle2, ShieldAlert, AlertCircle } from "lucide-react";
import { type Lead, type Pipeline } from "@/data/mock";
import { useData } from "@/hooks/use-data";
import { checkLeadClaimEligibility } from "@/lib/lead-rules";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface TransferLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
}

export function TransferLeadModal({ isOpen, onClose, lead }: TransferLeadModalProps) {
  const { pipelines, users, currentUser, transferLead } = useData();

  const currentPipe = useMemo(() => {
    if (!lead) return pipelines[0];
    return pipelines.find(p => p.id === (lead.pipelineId || "prospection")) || pipelines[0];
  }, [lead, pipelines]);

  const [targetPipelineId, setTargetPipelineId] = useState<string>("");
  const [targetStage, setTargetStage] = useState<string>("");
  const [targetOwner, setTargetOwner] = useState<string>("");
  const [transferNote, setTransferNote] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Define valores padrão quando o lead ou o modal abrir
  useMemo(() => {
    if (isOpen && lead) {
      // Destino padrão: primeiro pipeline diferente do atual, ou o próprio se só houver 1
      const otherPipe = pipelines.find(p => p.id !== (lead.pipelineId || "prospection")) || pipelines[0];
      if (otherPipe) {
        setTargetPipelineId(otherPipe.id);
        setTargetStage(otherPipe.stages[0]?.name || "Entrada");
      }
      setTargetOwner(lead.owner || "");
      setTransferNote("");
    }
  }, [isOpen, lead, pipelines]);

  // Atualiza a etapa padrão quando o usuário troca o pipeline de destino
  const handlePipelineChange = (newPipeId: string) => {
    setTargetPipelineId(newPipeId);
    const dest = pipelines.find(p => p.id === newPipeId);
    if (dest && dest.stages.length > 0) {
      setTargetStage(dest.stages[0].name);
    }
  };

  const eligibility = useMemo(() => {
    if (!lead) return { canClaim: true };
    return checkLeadClaimEligibility(lead, currentUser, pipelines);
  }, [lead, currentUser, pipelines]);

  if (!isOpen || !lead) return null;

  const destPipeline = pipelines.find(p => p.id === targetPipelineId) || currentPipe;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetPipelineId || !targetStage) {
      toast.error("Selecione o pipeline de destino e a etapa.");
      return;
    }

    // Validação de bloqueio de lead em andamento com outro vendedor
    if (!eligibility.canClaim && currentUser?.role !== "Admin Geral") {
      toast.error(eligibility.reason);
      return;
    }

    setIsSubmitting(true);
    try {
      await transferLead(
        lead.id,
        targetPipelineId,
        targetStage,
        targetOwner || undefined,
        transferNote.trim() || undefined
      );
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao transferir lead.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Transferir Lead de Funil
              </h3>
              <p className="text-xs text-muted-foreground">
                Mover <strong className="text-foreground">{lead.name}</strong> para outro processo comercial
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Status de Elegibilidade / Proteção Comercial */}
          <div className={cn(
            "p-3.5 rounded-xl border flex items-start gap-2.5 text-xs",
            eligibility.canClaim
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300"
              : "bg-rose-500/10 border-rose-500/20 text-rose-800 dark:text-rose-300"
          )}>
            {eligibility.canClaim ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="space-y-0.5 flex-1">
              <span className="font-bold block">
                {eligibility.canClaim ? "Transferência Liberada" : "Lead Bloqueado / Protegido"}
              </span>
              <p className="text-[11px] leading-relaxed opacity-90">
                {eligibility.reason}
              </p>
            </div>
          </div>

          {/* Visualização de Origem -> Destino */}
          <div className="p-4 rounded-xl border border-border bg-muted/30 flex items-center justify-between gap-3">
            <div className="flex-1">
              <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                Funil Atual
              </div>
              <div className="text-xs font-bold text-foreground truncate mt-0.5">
                {currentPipe?.name || "Prospecção"}
              </div>
              <div className="text-[11px] text-muted-foreground">
                Etapa: {lead.stage}
              </div>
            </div>

            <ArrowRight className="h-5 w-5 text-primary shrink-0" />

            <div className="flex-1 text-right">
              <div className="text-[10px] font-black uppercase tracking-wider text-primary">
                Novo Funil
              </div>
              <div className="text-xs font-bold text-foreground truncate mt-0.5">
                {destPipeline?.name || "Destino"}
              </div>
              <div className="text-[11px] text-primary font-semibold">
                Etapa: {targetStage || "Início"}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Pipeline de Destino */}
            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1.5">
                Pipeline / Funil Comercial de Destino *
              </label>
              <select
                value={targetPipelineId}
                onChange={(e) => handlePipelineChange(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs font-bold text-foreground focus:ring-2 focus:ring-primary/20"
                required
              >
                {pipelines.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.functionRole || "Vendas"})
                  </option>
                ))}
              </select>
            </div>

            {/* Etapa de Destino */}
            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1.5">
                Etapa Inicial no Destino *
              </label>
              <select
                value={targetStage}
                onChange={(e) => setTargetStage(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs font-bold text-foreground focus:ring-2 focus:ring-primary/20"
                required
              >
                {(destPipeline?.stages || []).map(s => (
                  <option key={s.name} value={s.name}>
                    {s.name} {s.slaHours ? `(SLA: ${s.slaHours}h)` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Novo Responsável */}
            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1.5">
                Responsável / Vendedor no Destino
              </label>
              <select
                value={targetOwner}
                onChange={(e) => setTargetOwner(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs font-bold text-foreground focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Manter responsável atual ({lead.owner || "Sem responsável"})</option>
                {users.map(u => (
                  <option key={u.id} value={u.name}>
                    {u.name} — {u.role}
                  </option>
                ))}
              </select>
            </div>

            {/* Motivo / Nota */}
            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1.5">
                Justificativa / Observação da Transferência (Opcional)
              </label>
              <textarea
                placeholder="Ex: Lead qualificado pelo SDR, agendada reunião com Closer..."
                value={transferNote}
                onChange={(e) => setTransferNote(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs focus:ring-2 focus:ring-primary/20 resize-none"
              />
            </div>
          </div>

          {/* Ações */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              {isSubmitting ? "Transferindo..." : "Confirmar Transferência"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
