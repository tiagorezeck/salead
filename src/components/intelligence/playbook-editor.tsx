import { useState } from "react";
import { X, Save, MessageSquare, Lightbulb, Sparkles, ChevronRight, BookOpen, UserCheck, Target, Plus, Trash2, GripVertical, List, Flag, AlertTriangle, CheckCircle2 } from "lucide-react";
import { type Playbook } from "@/data/mock";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PlaybookEditorProps {
  playbook: Partial<Playbook>;
  onClose: () => void;
  onSave: (pb: Playbook) => void;
}

const ICONS = [
  { type: 'message', icon: MessageSquare, label: 'Mensagem' },
  { type: 'lightbulb', icon: Lightbulb, label: 'Ideia' },
  { type: 'sparkles', icon: Sparkles, label: 'IA/Valor' },
  { type: 'chevron', icon: ChevronRight, label: 'Ação' },
  { type: 'book', icon: BookOpen, label: 'Livro' },
] as const;

const EMPTY_PLAYBOOK: Playbook = {
  id: "",
  title: "",
  category: "Prospecção",
  objective: "",
  content: "",
  iconType: "message",
  specialty: "",
  whenToUse: "",
  expectedResult: "",
  avgDuration: "",
  initialChecklist: [],
  mandatoryQuestions: [],
  optionalQuestions: [],
  greenFlags: [],
  redFlags: [],
  commonObjections: [],
  nextAction: "",
  approvalCriteria: "",
  rejectionCriteria: "",
};

export function PlaybookEditor({ playbook, onClose, onSave }: PlaybookEditorProps) {
  const [form, setForm] = useState<Playbook>({
    ...EMPTY_PLAYBOOK,
    ...playbook,
    initialChecklist: playbook.initialChecklist || [],
    mandatoryQuestions: playbook.mandatoryQuestions || [],
    optionalQuestions: playbook.optionalQuestions || [],
    greenFlags: playbook.greenFlags || [],
    redFlags: playbook.redFlags || [],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      toast.error("Título e conteúdo são obrigatórios.");
      return;
    }
    onSave(form);
    onClose();
  };

  const renderArraySection = <T,>({
    label,
    icon: Icon,
    items,
    onAdd,
    onRemove,
    onUpdate,
    renderItem,
    emptyText = "Nenhum item adicionado.",
    itemType = "item"
  }: {
    label: string;
    icon: any;
    items: T[];
    onAdd: () => void;
    onRemove: (index: number) => void;
    onUpdate: (index: number, value: T) => void;
    renderItem: (item: T, index: number, onChange: (val: T) => void) => React.ReactNode;
    emptyText?: string;
    itemType?: string;
  }) => (
    <div className="space-y-4 pb-6 border-b border-border">
      <div className="flex items-center justify-between">
        <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" /> {label}
        </label>
        <button type="button" onClick={onAdd} className="text-[10px] font-black bg-primary text-primary-foreground px-2 py-1 rounded hover:bg-primary/90 transition-colors flex items-center gap-1">
          <Plus className="h-3 w-3" /> Adicionar {itemType}
        </button>
      </div>
      {items.length > 0 ? (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={index} className="bg-muted/30 border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 group relative">
              <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab shrink-0" />
              <div className="flex-1 min-w-0">{renderItem(item, index, (val) => onUpdate(index, val))}</div>
              <button type="button" onClick={() => onRemove(index)} className="p-2 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-4 text-center text-sm text-muted-foreground border-2 border-dashed border-border rounded-xl">{emptyText}</div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-background border border-border rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        <div className="p-5 border-b border-border flex items-center justify-between bg-gradient-surface">
          <h2 className="font-display text-lg font-bold">{form.id ? "Editar Playbook" : "Novo Playbook"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="space-y-6 border-b border-border pb-6">
            <h3 className="text-[11px] uppercase tracking-widest text-primary font-bold flex items-center gap-2"><BookOpen className="h-4 w-4" /> Identificação</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Título do Playbook</label>
                <input required value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Ex: Qualificação Profunda (Discovery)" className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Especialidade / Função</label>
                <input value={form.specialty} onChange={e => setForm({...form, specialty: e.target.value})} placeholder="Ex: LDR — Lead Development Representative" className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Categoria</label>
                <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none">
                  <option>Prospecção</option>
                  <option>SDR (Qualificação)</option>
                  <option>Closer (Fechamento)</option>
                  <option>Demonstração</option>
                  <option>Negociação</option>
                  <option>Pós-venda</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Ícone Representativo</label>
                <div className="flex gap-2">
                  {ICONS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button key={item.type} type="button" onClick={() => setForm({...form, iconType: item.type})} className={`h-10 w-10 rounded-lg border flex items-center justify-center transition-all ${form.iconType === item.type ? "bg-primary/10 border-primary text-primary" : "bg-muted/50 border-border text-muted-foreground hover:bg-muted"}`} title={item.label}>
                        <Icon className="h-5 w-5" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Tempo Médio da Etapa</label>
              <input value={form.avgDuration} onChange={e => setForm({...form, avgDuration: e.target.value})} placeholder="Ex: 30-45 min" className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>

          <div className="space-y-6 border-b border-border pb-6">
            <h3 className="text-[11px] uppercase tracking-widest text-primary font-bold flex items-center gap-2"><Target className="h-4 w-4" /> Objetivo & Contexto</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Objetivo Principal</label>
                <textarea value={form.objective} onChange={e => setForm({...form, objective: e.target.value})} placeholder="Qual o resultado esperado?" className="w-full bg-muted/50 border border-border rounded-lg px-3 py-3 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Quando Utilizar</label>
                <textarea value={form.whenToUse} onChange={e => setForm({...form, whenToUse: e.target.value})} placeholder="Cenário ideal de aplicação..." className="w-full bg-muted/50 border border-border rounded-lg px-3 py-3 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Resultado Esperado</label>
                <textarea value={form.expectedResult} onChange={e => setForm({...form, expectedResult: e.target.value})} placeholder="O que define sucesso nesta etapa?" className="w-full bg-muted/50 border border-border rounded-lg px-3 py-3 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {renderArraySection({
              label: "Checklist Inicial (Pré-requisitos)",
              icon: List,
              items: form.initialChecklist,
              onAdd: () => setForm({ ...form, initialChecklist: [...form.initialChecklist, { id: `c-${Date.now()}`, text: "" }] }),
              onRemove: (idx) => setForm({ ...form, initialChecklist: form.initialChecklist.filter((_, i) => i !== idx) }),
              onUpdate: (idx, val) => setForm({ ...form, initialChecklist: form.initialChecklist.map((v, i) => i === idx ? val : v) }),
              renderItem: (item, _, onChange) => (
                <input value={item.text} onChange={e => onChange({ ...item, text: e.target.value })} className="flex-1 bg-transparent border-none text-sm font-medium focus:ring-0 p-0" placeholder="Item do checklist..." />
              ),
              itemType: "checklist"
            })}

            {renderArraySection({
              label: "Perguntas Obrigatórias",
              icon: CheckCircle2,
              items: form.mandatoryQuestions,
              onAdd: () => setForm({ ...form, mandatoryQuestions: [...form.mandatoryQuestions, { id: `q-${Date.now()}`, text: "", type: 'mandatory' }] }),
              onRemove: (idx) => setForm({ ...form, mandatoryQuestions: form.mandatoryQuestions.filter((_, i) => i !== idx) }),
              onUpdate: (idx, val) => setForm({ ...form, mandatoryQuestions: form.mandatoryQuestions.map((v, i) => i === idx ? val : v) }),
              renderItem: (item, _, onChange) => (
                <input value={item.text} onChange={e => onChange({ ...item, text: e.target.value })} className="flex-1 bg-transparent border-none text-sm font-medium focus:ring-0 p-0" placeholder="Pergunta obrigatória..." />
              ),
              itemType: "pergunta"
            })}

            {renderArraySection({
              label: "Perguntas Opcionais",
              icon: List,
              items: form.optionalQuestions,
              onAdd: () => setForm({ ...form, optionalQuestions: [...form.optionalQuestions, { id: `q-${Date.now()}`, text: "", type: 'optional' }] }),
              onRemove: (idx) => setForm({ ...form, optionalQuestions: form.optionalQuestions.filter((_, i) => i !== idx) }),
              onUpdate: (idx, val) => setForm({ ...form, optionalQuestions: form.optionalQuestions.map((v, i) => i === idx ? val : v) }),
              renderItem: (item, _, onChange) => (
                <input value={item.text} onChange={e => onChange({ ...item, text: e.target.value })} className="flex-1 bg-transparent border-none text-sm font-medium focus:ring-0 p-0" placeholder="Pergunta opcional..." />
              ),
              itemType: "pergunta"
            })}

            <div className="grid sm:grid-cols-2 gap-6">
              {renderArraySection({
                label: "Green Flags",
                icon: Flag,
                items: form.greenFlags,
                onAdd: () => setForm({ ...form, greenFlags: [...form.greenFlags, { id: `g-${Date.now()}`, text: "" }] }),
                onRemove: (idx) => setForm({ ...form, greenFlags: form.greenFlags.filter((_, i) => i !== idx) }),
                onUpdate: (idx, val) => setForm({ ...form, greenFlags: form.greenFlags.map((v, i) => i === idx ? val : v) }),
                renderItem: (item, _, onChange) => (
                  <input value={item.text} onChange={e => onChange({ ...item, text: e.target.value })} className="flex-1 bg-transparent border-none text-sm font-medium focus:ring-0 p-0 text-success" placeholder="Sinal verde..." />
                ),
                itemType: "flag"
              })}

              {renderArraySection({
                label: "Red Flags",
                icon: AlertTriangle,
                items: form.redFlags,
                onAdd: () => setForm({ ...form, redFlags: [...form.redFlags, { id: `r-${Date.now()}`, text: "" }] }),
                onRemove: (idx) => setForm({ ...form, redFlags: form.redFlags.filter((_, i) => i !== idx) }),
                onUpdate: (idx, val) => setForm({ ...form, redFlags: form.redFlags.map((v, i) => i === idx ? val : v) }),
                renderItem: (item, _, onChange) => (
                  <input value={item.text} onChange={e => onChange({ ...item, text: e.target.value })} className="flex-1 bg-transparent border-none text-sm font-medium focus:ring-0 p-0 text-destructive" placeholder="Sinal vermelho..." />
                ),
                itemType: "flag"
              })}
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-border">
            <h3 className="text-[11px] uppercase tracking-widest text-primary font-bold flex items-center gap-2"><UserCheck className="h-4 w-4" /> Decisão & Conteúdo</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Próxima Ação</label>
                <input value={form.nextAction} onChange={e => setForm({...form, nextAction: e.target.value})} className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Critério de Aprovação</label>
                <input value={form.approvalCriteria} onChange={e => setForm({...form, approvalCriteria: e.target.value})} className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Script / Conteúdo</label>
              <textarea required value={form.content} onChange={e => setForm({...form, content: e.target.value})} className="w-full bg-muted/50 border border-border rounded-lg px-3 py-3 text-sm min-h-[200px] font-mono" />
            </div>
          </div>
        </form>

        <div className="p-6 border-t border-border bg-muted/10 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium">Cancelar</button>
          <button type="button" onClick={handleSubmit} className="flex-1 py-2.5 rounded-lg bg-gradient-primary text-primary-foreground font-bold text-sm shadow-elegant flex items-center justify-center gap-2">
            <Save className="h-4 w-4" /> Salvar Playbook
          </button>
        </div>
      </div>
    </div>
  );
}