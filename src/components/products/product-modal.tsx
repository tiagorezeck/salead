import { useState, useRef } from "react";
import { X, Save, Package, Image as ImageIcon, DollarSign, TrendingUp, Link as LinkIcon, Trash2, Upload, Globe, Calendar, CreditCard } from "lucide-react";
import { type Product, type Strategy } from "@/data/mock";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ProductModalProps {
  product?: Partial<Product>;
  allProducts: Product[];
  onClose: () => void;
  onSave: (p: Partial<Product>) => void;
}

const STRATEGIES: Strategy[] = ["Up Sell", "Down Sell", "Cross Sell", "Bundle Sell", "Nenhuma"];

export function ProductModal({ product, allProducts, onClose, onSave }: ProductModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageTab, setImageTab] = useState<'link' | 'upload'>('link');
  
  const [form, setForm] = useState({
    name: product?.name || "",
    category: product?.category || "",
    costPrice: product?.costPrice || 0,
    salePrice: product?.salePrice || 0,
    recurring: product?.recurring || false,
    recurrenceMonths: product?.recurrenceMonths || 12,
    installments: product?.installments || 1,
    imageUrl: product?.imageUrl || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80",
    strategy: product?.strategy || "Nenhuma",
    relatedProductIds: product?.relatedProductIds || []
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setForm({ ...form, imageUrl: base64 });
      toast.success("Imagem carregada com sucesso!");
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.category) {
      toast.error("Nome e categoria são obrigatórios.");
      return;
    }
    onSave({ ...product, ...form });
    toast.success(product?.id ? "Produto atualizado!" : "Produto cadastrado!");
    onClose();
  };

  const toggleRelated = (id: string) => {
    const next = form.relatedProductIds.includes(id)
      ? form.relatedProductIds.filter(x => x !== id)
      : [...form.relatedProductIds, id];
    setForm({ ...form, relatedProductIds: next });
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-background border border-border rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-border flex items-center justify-between bg-gradient-surface">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary grid place-items-center">
              <Package className="h-5 w-5" />
            </div>
            <h2 className="font-display text-lg font-bold">{product?.id ? "Editar Item" : "Novo Item no Portfólio"}</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Nome do Produto / Serviço</label>
                <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/30 outline-none" placeholder="Ex: Consultoria VIP" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Categoria</label>
                <input required value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/30 outline-none" placeholder="Ex: Software, Mentoria..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Preço de Custo</label>
                  <div className="relative">
                    <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input type="number" value={form.costPrice} onChange={e => setForm({...form, costPrice: Number(e.target.value)})} className="w-full bg-muted/50 border border-border rounded-lg pl-8 pr-3 py-2 text-sm outline-none" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Preço de Venda</label>
                  <div className="relative">
                    <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-primary" />
                    <input type="number" value={form.salePrice} onChange={e => setForm({...form, salePrice: Number(e.target.value)})} className="w-full bg-muted/50 border border-border rounded-lg pl-8 pr-3 py-2 text-sm font-bold outline-none" />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Imagem do Produto</label>
                  <div className="flex bg-muted rounded-lg p-0.5 border border-border scale-90">
                    <button type="button" onClick={() => setImageTab('link')} className={cn("px-2 py-1 rounded-md text-[9px] font-black uppercase transition-all", imageTab === 'link' ? "bg-background shadow-sm text-primary" : "text-muted-foreground")}>Link</button>
                    <button type="button" onClick={() => setImageTab('upload')} className={cn("px-2 py-1 rounded-md text-[9px] font-black uppercase transition-all", imageTab === 'upload' ? "bg-background shadow-sm text-primary" : "text-muted-foreground")}>Upload</button>
                  </div>
                </div>

                {imageTab === 'link' ? (
                  <div className="relative">
                    <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input value={form.imageUrl.startsWith('data:') ? "" : form.imageUrl} onChange={e => setForm({...form, imageUrl: e.target.value})} className="w-full bg-muted/50 border border-border rounded-lg pl-8 pr-3 py-2 text-sm outline-none" placeholder="https://..." />
                  </div>
                ) : (
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full py-2.5 border-2 border-dashed border-border rounded-xl flex items-center justify-center gap-2 hover:bg-muted transition-all">
                    <Upload className="h-4 w-4 text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Escolher Arquivo</span>
                  </button>
                )}
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />

                <div className="mt-2 aspect-video rounded-xl border border-border overflow-hidden bg-muted group relative">
                  <img src={form.imageUrl} className="w-full h-full object-cover" alt="Preview" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <ImageIcon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 pt-4 border-t border-border">
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Cobrança Recorrente?</label>
                  </div>
                  <button type="button" onClick={() => setForm({...form, recurring: !form.recurring})} className={cn("w-12 h-6 rounded-full transition-colors relative", form.recurring ? "bg-primary" : "bg-muted")}>
                    <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all", form.recurring ? "left-7" : "left-1")} />
                  </button>
                </div>
                
                {form.recurring && (
                  <div className="space-y-1.5 animate-in slide-in-from-top-2">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Meses de Recorrência (Mensalidades)</label>
                    <input type="number" value={form.recurrenceMonths} onChange={e => setForm({...form, recurrenceMonths: Number(e.target.value)})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none" placeholder="Ex: 12" />
                    <p className="text-[8px] text-muted-foreground italic">Duração do contrato ou curso em meses.</p>
                  </div>
                )}

                {!form.recurring && (
                  <div className="space-y-1.5 animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-primary" />
                      <label className="text-[10px] uppercase font-bold text-muted-foreground">Parcelamento Máximo</label>
                    </div>
                    <input type="number" value={form.installments} onChange={e => setForm({...form, installments: Number(e.target.value)})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none" placeholder="Ex: 12" />
                    <p className="text-[8px] text-muted-foreground italic">Vezes sem juros ou permitidas no cartão.</p>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Estratégia de Venda</label>
                <div className="flex flex-wrap gap-2">
                  {STRATEGIES.map(s => (
                    <button key={s} type="button" onClick={() => setForm({...form, strategy: s})} className={cn("px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all", form.strategy === s ? "bg-primary text-primary-foreground border-primary" : "bg-muted/30 border-border text-muted-foreground hover:bg-muted")}>{s}</button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-2">
                <LinkIcon className="h-3 w-3" /> Linkar com outros produtos
              </label>
              <div className="max-h-40 overflow-y-auto border border-border rounded-xl bg-muted/20 p-2 space-y-1">
                {allProducts.filter(p => p.id !== product?.id).map(p => (
                  <button key={p.id} type="button" onClick={() => toggleRelated(p.id)} className={cn("w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-all", form.relatedProductIds.includes(p.id) ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted")}>
                    {p.name}
                    {form.relatedProductIds.includes(p.id) && <div className="h-1.5 w-1.5 rounded-full bg-primary" />}
                  </button>
                ))}
                {allProducts.length <= 1 && <div className="text-[10px] text-muted-foreground text-center py-4">Nenhum outro produto cadastrado.</div>}
              </div>
              <p className="text-[9px] text-muted-foreground italic">Use para definir o que é Upsell de quê, ou compor um Bundle.</p>
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">Cancelar</button>
            <button type="submit" className="flex-1 py-3 rounded-xl bg-gradient-primary text-primary-foreground font-bold text-sm shadow-elegant flex items-center justify-center gap-2">
              <Save className="h-4 w-4" /> SALVAR PRODUTO
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}