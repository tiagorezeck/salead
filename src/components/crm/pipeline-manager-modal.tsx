import { useState, useMemo } from "react";
import { 
  X, Plus, Trash2, ArrowUp, ArrowDown, Settings2, Layers, Clock, 
  CheckCircle2, AlertTriangle, UserCheck, Shield, ChevronRight,
  Sparkles, RefreshCw, MoveRight, HelpCircle
} from "lucide-react";
import { 
  type Pipeline, 
  type PipelineStage, 
  type StageType, 
  type StageColor, 
  type Role 
} from "@/data/mock";
import { useData } from "@/hooks/use-data";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PipelineManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  activePipelineId: string;
  onSelectPipeline: (id: string) => void;
}

const AVAILABLE_ROLES: Role[] = [
  "Admin Geral",
  "Head of Sales",
  "Marketing",
  "LDR",
  "BDR",
  "SDR",
  "Closer",
  "Hunter",
  "Seller",
  "Full Stack Seller",
  "Onboarding",
  "CS (Customer Success)",
  "Farmer",
  "CX (Customer Experience)"
];

const STAGE_TYPES: { type: StageType; label: string; desc: string; defaultColor: StageColor }[] = [
  { type: 'NORMAL', label: 'Em Andamento (Normal)', desc: 'Etapa operacional padrão', defaultColor: 'primary' },
  { type: 'GANHO', label: 'Ganho / Fechado', desc: 'Negócio ganho ou meta atingida', defaultColor: 'success' },
  { type: 'PERDIDO', label: 'Perdido / Descarte', desc: 'Lead descartado ou sem fit', defaultColor: 'destructive' },
  { type: 'STAND_BY', label: 'Stand By / Nutrição', desc: 'Aguardando tempo ou contato futuro', defaultColor: 'warning' },
  { type: 'TRANSFERENCIA', label: 'Pronto para Transferência', desc: 'Gatilho de transição entre áreas', defaultColor: 'info' },
  { type: 'CONCLUIDO', label: 'Concluído', desc: 'Ciclo operacional finalizado', defaultColor: 'purple' },
  { type: 'CANCELADO', label: 'Cancelado', desc: 'Cancelamento definitivo', defaultColor: 'rose' }
];

const STAGE_COLORS: { color: StageColor; label: string; bgCls: string }[] = [
  { color: 'primary', label: 'Padrão (Roxo)', bgCls: 'bg-primary text-primary-foreground' },
  { color: 'info', label: 'Azul (Info)', bgCls: 'bg-blue-500 text-white' },
  { color: 'success', label: 'Verde (Sucesso)', bgCls: 'bg-emerald-500 text-white' },
  { color: 'warning', label: 'Âmbar (Atenção)', bgCls: 'bg-amber-500 text-white' },
  { color: 'destructive', label: 'Vermelho (Crítico)', bgCls: 'bg-rose-500 text-white' },
  { color: 'purple', label: 'Violeta', bgCls: 'bg-purple-600 text-white' },
  { color: 'emerald', label: 'Esmeralda', bgCls: 'bg-emerald-600 text-white' },
  { color: 'amber', label: 'Laranja', bgCls: 'bg-orange-500 text-white' },
  { color: 'blue', label: 'Ciano', bgCls: 'bg-cyan-500 text-white' },
  { color: 'rose', label: 'Rosa', bgCls: 'bg-rose-600 text-white' }
];

export function PipelineManagerModal({
  isOpen,
  onClose,
  activePipelineId,
  onSelectPipeline
}: PipelineManagerModalProps) {
  const { 
    pipelines, 
    addPipeline, 
    updatePipeline, 
    deletePipeline, 
    savePipelineStages,
    deletePipelineStage,
    transferEntirePipeline,
    leads,
    users
  } = useData();

  const [activeTab, setActiveTab] = useState<'stages' | 'pipelines' | 'transfer'>('stages');
  const [selectedPipeId, setSelectedPipeId] = useState<string>(activePipelineId || pipelines[0]?.id || "");

  // Estado para criar/editar pipeline
  const [isCreatingPipe, setIsCreatingPipe] = useState(false);
  const [newPipeName, setNewPipeName] = useState("");
  const [newPipeCode, setNewPipeCode] = useState("");
  const [newPipeRole, setNewPipeRole] = useState<Role>("Closer");
  const [newPipeDesc, setNewPipeDesc] = useState("");
  const [newPipeColor, setNewPipeColor] = useState("primary");

  // Estado para edição de etapas do pipeline selecionado
  const currentPipeline = useMemo(() => {
    return pipelines.find(p => p.id === selectedPipeId) || pipelines[0];
  }, [pipelines, selectedPipeId]);

  const [localStages, setLocalStages] = useState<PipelineStage[]>([]);
  const [isAddingStage, setIsAddingStage] = useState(false);
  const [newStageName, setNewStageName] = useState("");
  const [newStageType, setNewStageType] = useState<StageType>('NORMAL');
  const [newStageColor, setNewStageColor] = useState<StageColor>('primary');
  const [newStageSla, setNewStageSla] = useState<number>(24);

  // Estado de exclusão de etapa com fallback
  const [deletingStage, setDeletingStage] = useState<string | null>(null);
  const [fallbackStage, setFallbackStage] = useState<string>("");

  // Estado de transferência em lote
  const [batchSourcePipe, setBatchSourcePipe] = useState<string>(activePipelineId || pipelines[0]?.id || "");
  const [batchTargetPipe, setBatchTargetPipe] = useState<string>("");
  const [batchTargetStage, setBatchTargetStage] = useState<string>("");
  const [batchTargetOwner, setBatchTargetOwner] = useState<string>("");
  const [batchNote, setBatchNote] = useState<string>("");

  // Sincroniza localStages quando o pipeline selecionado muda
  useMemo(() => {
    if (currentPipeline && currentPipeline.stages) {
      setLocalStages([...currentPipeline.stages]);
    }
  }, [currentPipeline]);

  if (!isOpen) return null;

  // Reordenar etapas
  const handleMoveStage = (index: number, direction: 'up' | 'down') => {
    const newIdx = direction === 'up' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= localStages.length) return;
    const updated = [...localStages];
    const [moved] = updated.splice(index, 1);
    updated.splice(newIdx, 0, moved);
    setLocalStages(updated);
  };

  // Salvar etapas modificadas
  const handleSaveStages = async () => {
    if (!currentPipeline) return;
    if (localStages.length === 0) {
      toast.error("O pipeline precisa ter pelo menos uma etapa.");
      return;
    }
    await savePipelineStages(currentPipeline.id, localStages);
    toast.success("Etapas e SLAs do pipeline atualizados!");
  };

  // Adicionar nova etapa
  const handleAddStage = () => {
    if (!newStageName.trim()) {
      toast.error("Informe o nome da etapa.");
      return;
    }
    const exists = localStages.some(s => s.name.toLowerCase() === newStageName.trim().toLowerCase());
    if (exists) {
      toast.error("Já existe uma etapa com este nome.");
      return;
    }

    const newStg: PipelineStage = {
      name: newStageName.trim(),
      order: localStages.length + 1,
      type: newStageType,
      color: newStageColor,
      slaHours: Number(newStageSla) || 24,
      active: true
    };

    setLocalStages([...localStages, newStg]);
    setNewStageName("");
    setNewStageSla(24);
    setIsAddingStage(false);
    toast.info("Etapa adicionada. Clique em 'Salvar Alterações' para confirmar.");
  };

  // Confirmar exclusão de etapa com fallback
  const handleConfirmDeleteStage = async () => {
    if (!currentPipeline || !deletingStage) return;
    if (!fallbackStage && localStages.filter(s => s.name !== deletingStage).length > 0) {
      toast.error("Selecione a etapa de destino para os leads existentes.");
      return;
    }

    await deletePipelineStage(currentPipeline.id, deletingStage, fallbackStage);
    setLocalStages(prev => prev.filter(s => s.name !== deletingStage));
    setDeletingStage(null);
    setFallbackStage("");
  };

  // Criar novo pipeline
  const handleCreatePipeline = async () => {
    if (!newPipeName.trim()) {
      toast.error("Informe o nome do novo pipeline.");
      return;
    }

    const defaultStages: PipelineStage[] = [
      { name: "Entrada", order: 1, type: "NORMAL", color: "primary", slaHours: 24, active: true },
      { name: "Em Atendimento", order: 2, type: "NORMAL", color: "info", slaHours: 48, active: true },
      { name: "Proposta", order: 3, type: "NORMAL", color: "warning", slaHours: 72, active: true },
      { name: "Ganho", order: 4, type: "GANHO", color: "success", slaHours: 0, active: true },
      { name: "Perdido", order: 5, type: "PERDIDO", color: "destructive", slaHours: 0, active: true }
    ];

    const generatedId = `pipe_${Date.now()}`;
    await addPipeline({
      id: generatedId,
      name: newPipeName.trim(),
      code: newPipeCode.trim().toUpperCase() || `PIPE_${Date.now()}`,
      functionRole: newPipeRole,
      description: newPipeDesc.trim(),
      color: newPipeColor,
      stages: defaultStages,
      active: true
    });

    setIsCreatingPipe(false);
    setNewPipeName("");
    setNewPipeCode("");
    setNewPipeDesc("");
    setSelectedPipeId(generatedId);
    onSelectPipeline(generatedId);
  };

  // Executar transferência em lote
  const handleBatchTransfer = async () => {
    if (!batchSourcePipe || !batchTargetPipe || !batchTargetStage) {
      toast.error("Preencha o pipeline de origem, pipeline de destino e a etapa.");
      return;
    }
    if (batchSourcePipe === batchTargetPipe) {
      toast.error("O pipeline de destino deve ser diferente do de origem.");
      return;
    }

    await transferEntirePipeline(
      batchSourcePipe, 
      batchTargetPipe, 
      batchTargetStage, 
      batchTargetOwner || undefined, 
      batchNote || undefined
    );

    setBatchNote("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                Gestão de Pipelines & Processos Comerciais
                <span className="text-[10px] uppercase tracking-wider font-black px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  Salead
                </span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Configure funis por função (SDR, Closer, Onboarding, CS, etc.), etapas, prazos de SLA e regras de transição.
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

        {/* Abas Superiores */}
        <div className="flex items-center border-b border-border px-5 bg-muted/10 gap-2">
          <button
            onClick={() => setActiveTab('stages')}
            className={cn(
              "px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer",
              activeTab === 'stages' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Settings2 className="h-3.5 w-3.5" />
            Etapas & SLAs ({currentPipeline?.name})
          </button>

          <button
            onClick={() => setActiveTab('pipelines')}
            className={cn(
              "px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer",
              activeTab === 'pipelines' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Layers className="h-3.5 w-3.5" />
            Todos os Pipelines ({pipelines.length})
          </button>

          <button
            onClick={() => setActiveTab('transfer')}
            className={cn(
              "px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer",
              activeTab === 'transfer' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <MoveRight className="h-3.5 w-3.5" />
            Transferência em Lote de Funil
          </button>
        </div>

        {/* Conteúdo Principal com Rolagem */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 scrollbar-thin">
          
          {/* ABA 1: ETAPAS & SLAS DO PIPELINE */}
          {activeTab === 'stages' && (
            <div className="space-y-6">
              {/* Seletor de Pipeline Atual */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border bg-muted/20">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground">Pipeline Selecionado:</span>
                  <select
                    value={selectedPipeId}
                    onChange={(e) => {
                      setSelectedPipeId(e.target.value);
                      onSelectPipeline(e.target.value);
                    }}
                    className="px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-bold text-foreground focus:ring-2 focus:ring-primary/20"
                  >
                    {pipelines.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.functionRole || "Comercial"})</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    Total de leads neste funil: <strong>{leads.filter(l => (l.pipelineId || 'prospection') === selectedPipeId).length}</strong>
                  </span>
                </div>
              </div>

              {/* Lista de Etapas e Reordenação */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                    Sequência das Etapas no Kanban
                  </h3>
                  <button
                    onClick={() => setIsAddingStage(true)}
                    className="px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Nova Etapa
                  </button>
                </div>

                <div className="border border-border rounded-xl divide-y divide-border/60 overflow-hidden bg-card">
                  {localStages.map((stage, idx) => {
                    const stgType = STAGE_TYPES.find(t => t.type === stage.type) || STAGE_TYPES[0];
                    const leadCount = leads.filter(l => (l.pipelineId || 'prospection') === selectedPipeId && l.stage === stage.name).length;

                    return (
                      <div key={stage.name} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/20 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="h-6 w-6 rounded-md bg-muted text-muted-foreground text-xs font-black flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <div className={cn("h-3 w-3 rounded-full shrink-0", 
                            stage.color === 'primary' ? "bg-primary" :
                            stage.color === 'success' ? "bg-emerald-500" :
                            stage.color === 'destructive' ? "bg-rose-500" :
                            stage.color === 'warning' ? "bg-amber-500" :
                            stage.color === 'info' ? "bg-blue-500" :
                            stage.color === 'purple' ? "bg-purple-600" : "bg-primary"
                          )} />
                          <div>
                            <div className="text-xs font-bold text-foreground flex items-center gap-2">
                              <span>{stage.name}</span>
                              <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                                {stgType.label}
                              </span>
                            </div>
                            <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-muted-foreground" />
                                SLA: {stage.slaHours ? `${stage.slaHours} horas` : "Sem limite"}
                              </span>
                              <span>·</span>
                              <span>{leadCount} {leadCount === 1 ? 'lead' : 'leads'} ativos</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 self-end sm:self-center">
                          {/* Mover Para Cima */}
                          <button
                            onClick={() => handleMoveStage(idx, 'up')}
                            disabled={idx === 0}
                            title="Mover para cima"
                            className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>

                          {/* Mover Para Baixo */}
                          <button
                            onClick={() => handleMoveStage(idx, 'down')}
                            disabled={idx === localStages.length - 1}
                            title="Mover para baixo"
                            className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>

                          {/* Excluir Etapa */}
                          <button
                            onClick={() => {
                              setDeletingStage(stage.name);
                              const rem = localStages.filter(s => s.name !== stage.name);
                              setFallbackStage(rem[0]?.name || "");
                            }}
                            title="Excluir etapa"
                            className="p-1.5 rounded-lg border border-rose-500/20 text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer ml-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Botão de Salvar Alterações de Etapas */}
              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Fechar
                </button>
                <button
                  onClick={handleSaveStages}
                  className="px-5 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all cursor-pointer"
                >
                  Salvar Alterações de Etapas
                </button>
              </div>

              {/* Modal Inline: Adicionar Etapa */}
              {isAddingStage && (
                <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-primary flex items-center gap-2">
                      <Plus className="h-4 w-4" /> Cadastrar Nova Etapa
                    </h4>
                    <button onClick={() => setIsAddingStage(false)} className="text-muted-foreground hover:text-foreground">
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-muted-foreground block mb-1">Nome da Etapa</label>
                      <input
                        type="text"
                        placeholder="Ex: Demonstração Realizada"
                        value={newStageName}
                        onChange={(e) => setNewStageName(e.target.value)}
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-bold focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-muted-foreground block mb-1">Tipo da Etapa</label>
                      <select
                        value={newStageType}
                        onChange={(e) => setNewStageType(e.target.value as StageType)}
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-bold focus:ring-2 focus:ring-primary/20"
                      >
                        {STAGE_TYPES.map(t => (
                          <option key={t.type} value={t.type}>{t.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-muted-foreground block mb-1">SLA Limite (Horas)</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="24"
                        value={newStageSla}
                        onChange={(e) => setNewStageSla(Number(e.target.value) || 0)}
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-bold focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      onClick={() => setIsAddingStage(false)}
                      className="px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleAddStage}
                      className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-bold cursor-pointer"
                    >
                      Inserir Etapa
                    </button>
                  </div>
                </div>
              )}

              {/* Modal Inline: Exclusão com Fallback */}
              {deletingStage && (
                <div className="p-4 rounded-xl border border-rose-500/40 bg-rose-500/10 space-y-3">
                  <div className="flex items-center gap-2 text-rose-600 font-bold text-xs">
                    <AlertTriangle className="h-4 w-4" /> Excluir Etapa "{deletingStage}"
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Se existirem leads nesta etapa, para qual etapa eles devem ser movidos automaticamente?
                  </p>
                  <div className="flex items-center gap-3">
                    <select
                      value={fallbackStage}
                      onChange={(e) => setFallbackStage(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-bold"
                    >
                      {localStages.filter(s => s.name !== deletingStage).map(s => (
                        <option key={s.name} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => setDeletingStage(null)}
                      className="px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleConfirmDeleteStage}
                      className="px-4 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold"
                    >
                      Confirmar Exclusão
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ABA 2: TODOS OS PIPELINES DO SISTEMA */}
          {activeTab === 'pipelines' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                    Pipelines Ativos na Plataforma ({pipelines.length})
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Organize os times de ponta a ponta: Prospecção, Fechamento, Onboarding e Pós-Venda.
                  </p>
                </div>
                <button
                  onClick={() => setIsCreatingPipe(true)}
                  className="px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" /> Criar Pipeline
                </button>
              </div>

              {/* Formulário de Criação de Pipeline */}
              {isCreatingPipe && (
                <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-primary flex items-center gap-2">
                      <Plus className="h-4 w-4" /> Novo Pipeline Comercial
                    </h4>
                    <button onClick={() => setIsCreatingPipe(false)} className="text-muted-foreground hover:text-foreground">
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-muted-foreground block mb-1">Nome do Funil</label>
                      <input
                        type="text"
                        placeholder="Ex: Closer Enterprise"
                        value={newPipeName}
                        onChange={(e) => setNewPipeName(e.target.value)}
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-muted-foreground block mb-1">Função Comercial Responsável</label>
                      <select
                        value={newPipeRole}
                        onChange={(e) => setNewPipeRole(e.target.value as Role)}
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-bold"
                      >
                        {AVAILABLE_ROLES.map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-muted-foreground block mb-1">Código Único (Identificador)</label>
                      <input
                        type="text"
                        placeholder="CLOSER_ENT"
                        value={newPipeCode}
                        onChange={(e) => setNewPipeCode(e.target.value)}
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-bold uppercase"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-muted-foreground block mb-1">Descrição / Finalidade</label>
                      <input
                        type="text"
                        placeholder="Processo de negociação de contas grandes..."
                        value={newPipeDesc}
                        onChange={(e) => setNewPipeDesc(e.target.value)}
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-bold"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      onClick={() => setIsCreatingPipe(false)}
                      className="px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleCreatePipeline}
                      className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-bold cursor-pointer"
                    >
                      Criar Pipeline
                    </button>
                  </div>
                </div>
              )}

              {/* Grid dos Pipelines */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {pipelines.map(pipe => {
                  const pipeLeads = leads.filter(l => (l.pipelineId || 'prospection') === pipe.id);
                  const isSelected = pipe.id === selectedPipeId;

                  return (
                    <div 
                      key={pipe.id}
                      className={cn(
                        "p-4 rounded-xl border transition-all flex flex-col justify-between space-y-3 bg-card",
                        isSelected ? "border-primary ring-2 ring-primary/20 shadow-md" : "border-border hover:border-border/80"
                      )}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                            <h4 className="font-bold text-sm text-foreground">{pipe.name}</h4>
                          </div>
                          <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                            {pipe.functionRole || "Vendas"}
                          </span>
                        </div>
                        {pipe.description && (
                          <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                            {pipe.description}
                          </p>
                        )}
                      </div>

                      <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>{pipe.stages?.length || 0} etapas</span>
                        <span className="font-bold text-foreground">{pipeLeads.length} leads</span>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => {
                            setSelectedPipeId(pipe.id);
                            onSelectPipeline(pipe.id);
                            setActiveTab('stages');
                          }}
                          className="flex-1 py-1.5 bg-muted hover:bg-muted/80 text-foreground rounded-lg text-xs font-bold text-center transition-colors cursor-pointer"
                        >
                          Configurar Etapas
                        </button>

                        {!pipe.is_default && (
                          <button
                            onClick={() => {
                              if (confirm(`Deseja realmente remover o pipeline "${pipe.name}"?`)) {
                                deletePipeline(pipe.id);
                              }
                            }}
                            title="Excluir pipeline"
                            className="p-1.5 text-muted-foreground hover:text-rose-500 transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ABA 3: TRANSFERÊNCIA EM LOTE DE CARTEIRA */}
          {activeTab === 'transfer' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-2">
                <h3 className="text-xs font-bold text-primary flex items-center gap-2">
                  <MoveRight className="h-4 w-4" /> Transferência em Lote de Funil Comercial
                </h3>
                <p className="text-xs text-muted-foreground">
                  Mova todos os leads de um pipeline para outro (ex: após encerramento de campanhas, transição de SDR para Closer, ou migração de carteira).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-muted-foreground block mb-1">Pipeline de Origem</label>
                  <select
                    value={batchSourcePipe}
                    onChange={(e) => setBatchSourcePipe(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs font-bold"
                  >
                    {pipelines.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({leads.filter(l => (l.pipelineId || 'prospection') === p.id).length} leads)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-muted-foreground block mb-1">Pipeline de Destino</label>
                  <select
                    value={batchTargetPipe}
                    onChange={(e) => {
                      setBatchTargetPipe(e.target.value);
                      const target = pipelines.find(p => p.id === e.target.value);
                      if (target && target.stages.length > 0) {
                        setBatchTargetStage(target.stages[0].name);
                      }
                    }}
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs font-bold"
                  >
                    <option value="">Selecione o destino...</option>
                    {pipelines.filter(p => p.id !== batchSourcePipe).map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-muted-foreground block mb-1">Etapa de Entrada no Destino</label>
                  <select
                    value={batchTargetStage}
                    onChange={(e) => setBatchTargetStage(e.target.value)}
                    disabled={!batchTargetPipe}
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs font-bold disabled:opacity-50"
                  >
                    <option value="">Selecione a etapa...</option>
                    {(pipelines.find(p => p.id === batchTargetPipe)?.stages || []).map(s => (
                      <option key={s.name} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-muted-foreground block mb-1">Novo Responsável (Opcional)</label>
                  <select
                    value={batchTargetOwner}
                    onChange={(e) => setBatchTargetOwner(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs font-bold"
                  >
                    <option value="">Manter responsável atual</option>
                    {users.map(u => (
                      <option key={u.id} value={u.name}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">Observação / Justificativa</label>
                <input
                  type="text"
                  placeholder="Ex: Migração trimestral para o time de Closers..."
                  value={batchNote}
                  onChange={(e) => setBatchNote(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs font-bold"
                />
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Leads impactados: <strong>{leads.filter(l => (l.pipelineId || 'prospection') === batchSourcePipe).length}</strong>
                </span>

                <button
                  onClick={handleBatchTransfer}
                  disabled={!batchTargetPipe || !batchTargetStage}
                  className="px-6 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all cursor-pointer"
                >
                  Executar Transferência de Carteira
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
