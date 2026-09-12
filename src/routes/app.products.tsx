import { createFileRoute } from "@tanstack/react-router";
import { Package, Plus, Search, Tag, BarChart, MoreVertical, Pencil, Trash2, Layers, TrendingUp, RefreshCw, DollarSign } from "lucide-react";
import { useState } from "react";
import { useData } from "@/hooks/use-data";
import { formatCurrency, cn } from "@/lib/utils";
import { ProductModal } from "@/components/products/product-modal";
import { type Product } from "@/data/mock";

export const Route = createFileRoute("/app/products")({ component: ProductsPage });

function ProductsPage() {
  const { products, addProduct, updateProduct, deleteProduct, initialized } = useData();
  const [search, setSearch] = useState("");
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const filtered = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  if (!initialized) return <div className="p-8 text-center">Carregando portfólio...</div>;

  const avgTicket = products.length > 0 ? products.reduce((s, p) => s + p.salePrice, 0) / products.length : 0;
  const mrr = products.filter(p => p.recurring).reduce((s, p) => s + p.salePrice, 0);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Portfólio</div>
          <h1 className="font-display text-2xl md:text-3xl font-bold mt-1">Produtos & Serviços</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie o que sua empresa vende e as estratégias de funil.</p>
        </div>
        <button 
          onClick={() => setEditingProduct({})}
          className="text-sm px-4 py-2.5 rounded-xl bg-gradient-primary text-primary-foreground font-bold shadow-elegant inline-flex items-center gap-2 hover:scale-105 transition-transform"
        >
          <Plus className="h-4 w-4" /> NOVO ITEM
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <KpiCard label="Ticket Médio" value={formatCurrency(avgTicket)} icon={Tag} />
        <KpiCard label="Itens Ativos" value={products.length.toString()} icon={Package} />
        <KpiCard label="Potencial MRR" value={formatCurrency(mrr)} icon={RefreshCw} accent />
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-muted/10">
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input 
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar no catálogo..." 
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary/20 outline-none" 
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-5 py-4 font-bold">Item</th>
                <th className="text-left px-3 py-4 font-bold">Categoria</th>
                <th className="text-right px-3 py-4 font-bold">Custo</th>
                <th className="text-right px-3 py-4 font-bold">Venda</th>
                <th className="text-center px-3 py-4 font-bold">Estratégia</th>
                <th className="text-right px-5 py-4 font-bold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-muted/30 transition-colors group">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg overflow-hidden border border-border bg-muted shrink-0">
                        <img src={p.imageUrl} className="w-full h-full object-cover" alt="" />
                      </div>
                      <div>
                        <div className="font-bold">{p.name}</div>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                          {p.recurring ? <RefreshCw className="h-2.5 w-2.5 text-primary" /> : <DollarSign className="h-2.5 w-2.5" />}
                          {p.recurring ? "Recorrente" : "Venda Única"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <span className="px-2 py-0.5 rounded-md bg-accent text-[10px] font-bold border border-border uppercase">{p.category}</span>
                  </td>
                  <td className="px-3 py-4 text-right text-muted-foreground font-mono text-xs">
                    {formatCurrency(p.costPrice)}
                  </td>
                  <td className="px-3 py-4 text-right font-display font-black text-primary">
                    {formatCurrency(p.salePrice)}
                  </td>
                  <td className="px-3 py-4 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className={cn(
                        "text-[9px] font-black px-2 py-0.5 rounded-full border",
                        p.strategy === 'Up Sell' ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                        p.strategy === 'Down Sell' ? "bg-rose-500/10 text-rose-500 border-rose-500/20" :
                        p.strategy === 'Bundle Sell' ? "bg-purple-500/10 text-purple-500 border-purple-500/20" :
                        "bg-muted text-muted-foreground border-border"
                      )}>
                        {p.strategy.toUpperCase()}
                      </span>
                      {p.relatedProductIds.length > 0 && (
                        <span className="text-[8px] text-muted-foreground flex items-center gap-0.5">
                          <Layers className="h-2 w-2" /> {p.relatedProductIds.length} links
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right relative">
                    <button 
                      onClick={() => setActiveMenu(activeMenu === p.id ? null : p.id)}
                      className="p-2 hover:bg-muted rounded-lg text-muted-foreground transition-colors"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    
                    {activeMenu === p.id && (
                      <div className="absolute right-12 top-1/2 -translate-y-1/2 bg-card border border-border rounded-xl shadow-2xl z-10 py-1 min-w-[120px] animate-in fade-in zoom-in-95">
                        <button 
                          onClick={() => { setEditingProduct(p); setActiveMenu(null); }}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-muted flex items-center gap-2"
                        >
                          <Pencil className="h-3.5 w-3.5 text-primary" /> Editar
                        </button>
                        <button 
                          onClick={() => { if(confirm("Excluir este produto?")) deleteProduct(p.id); setActiveMenu(null); }}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-muted flex items-center gap-2 text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Excluir
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editingProduct && (
        <ProductModal 
          product={editingProduct} 
          allProducts={products}
          onClose={() => setEditingProduct(null)} 
          onSave={(p) => {
            if (p.id) updateProduct(p.id, p);
            else addProduct(p);
          }} 
        />
      )}
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, accent }: any) {
  return (
    <div className="bg-gradient-surface border border-border rounded-2xl p-5 shadow-card relative overflow-hidden group">
      <div className="absolute -right-2 -bottom-2 opacity-5 group-hover:opacity-10 transition-opacity">
        <Icon className="h-16 w-16" />
      </div>
      <Icon className={`h-5 w-5 ${accent ? "text-primary" : "text-muted-foreground"}`} />
      <div className="font-display text-2xl font-black mt-3">{value}</div>
      <div className="text-[10px] text-muted-foreground mt-0.5 uppercase font-bold tracking-widest">{label}</div>
    </div>
  );
}