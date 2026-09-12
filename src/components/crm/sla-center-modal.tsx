import { X, Clock, AlertTriangle, Flame, Zap } from "lucide-react";
import { useData } from "@/hooks/use-data";
import { cn, formatCurrency } from "@/lib/utils";

interface SLACenterModalProps {
  onClose: () => void;
}

export function SLACenterModal({ onClose }: SLACenterModalProps) {
  const { leads } = useData();

  const buckets = {
    vencido: leads.filter(l => l.sla === "vencido"),
    critico: leads.filter(l => l.sla === "critico"),
    alerta: leads.filter(l => l.sla === "alerta"),
    ok: leads.filter(l => l.sla === "ok"),
  };

  const criticalLeads = [...buckets.vencido, ...buckets.critico];

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-background border border-border rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
        <div className="p-6 border-b border-border flex items-center justify-between bg-gradient-surface">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary grid place-items-center">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold">SLA Center</h2>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Monitoramento de Prazos e Acordos</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-2"><X className="h-6 w-6" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <BucketCard label="Vencidos" count={buckets.vencido.length} icon={Flame} color="text-destructive" bg="bg-destructive/10" />
            <BucketCard label="Críticos" count={buckets.critico.length} icon={AlertTriangle} color="text-destructive" bg="bg-destructive/10" />
            <BucketCard label="Em Alerta" count={buckets.alerta.length} icon={Clock} color="text-warning" bg="bg-warning/10" />
            <BucketCard label="No Prazo" count={buckets.ok.length} icon={Zap} color="text-success" bg="bg-success/10" />
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-destructive">
              <Flame className="h-4 w-4" /> Ação Imediata Necessária ({criticalLeads.length})
            </div>
            
            <div className="border border-border rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-[10px] uppercase font-black text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-3">Lead</th>
                    <th className="text-left px-4 py-3">Responsável</th>
                    <th className="text-right px-4 py-3">SLA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {criticalLeads.map(l => (
                    <tr key={l.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold">{l.company}</div>
                        <div className="text-[10px] text-muted-foreground">{l.name}</div>
                      </td>
                      <td className="px-4 py-3 text-xs font-medium">{l.owner}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={cn(
                          "text-[9px] font-black uppercase px-2 py-1 rounded-full",
                          l.sla === 'vencido' ? "bg-destructive text-white" : "bg-destructive/15 text-destructive animate-pulse"
                        )}>{l.sla}</span>
                      </td>
                    </tr>
                  ))}
                  {criticalLeads.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground text-xs">Nenhum lead crítico no momento. Bom trabalho!</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-border bg-muted/10 flex justify-end">
          <button onClick={onClose} className="px-6 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-elegant">FECHAR</button>
        </div>
      </div>
    </div>
  );
}

function BucketCard({ label, count, icon: Icon, color, bg }: any) {
  return (
    <div className="p-4 rounded-2xl border border-border bg-card shadow-sm">
      <div className={cn("h-8 w-8 rounded-lg grid place-items-center mb-3", bg, color)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="font-display text-2xl font-black">{count}</div>
      <div className="text-[9px] font-bold uppercase text-muted-foreground tracking-wider">{label}</div>
    </div>
  );
}