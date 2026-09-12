import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { Command } from "cmdk";
import { 
  Search, LayoutDashboard, KanbanSquare, Users, 
  CheckSquare, Zap, Megaphone, BarChart3, Plus 
} from "lucide-react";
import { useData } from "@/hooks/use-data";

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const navigate = useNavigate();
  const { leads } = useData();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-start justify-center pt-[15vh] p-4" onClick={() => setOpen(false)}>
      <div className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <Command className="flex flex-col h-full">
          <div className="flex items-center border-b border-border px-4 py-3">
            <Search className="h-4 w-4 text-muted-foreground mr-3" />
            <Command.Input 
              autoFocus
              placeholder="O que você deseja fazer? (Busque leads, telas ou ações...)" 
              className="flex-1 bg-transparent outline-none text-sm"
            />
            <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              ESC
            </kbd>
          </div>
          <Command.List className="max-h-[400px] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">Nenhum resultado encontrado.</Command.Empty>
            
            <Command.Group heading="Navegação" className="px-2 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
              <Item icon={LayoutDashboard} label="Dashboard" onSelect={() => { navigate({ to: "/app/dashboard" }); setOpen(false); }} />
              <Item icon={KanbanSquare} label="CRM Kanban" onSelect={() => { navigate({ to: "/app/crm" }); setOpen(false); }} />
              <Item icon={Users} label="Base de Leads" onSelect={() => { navigate({ to: "/app/leads" }); setOpen(false); }} />
              <Item icon={BarChart3} label="Analytics" onSelect={() => { navigate({ to: "/app/analytics" }); setOpen(false); }} />
            </Command.Group>

            <Command.Group heading="Ações Rápidas" className="px-2 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground font-bold mt-2">
              <Item icon={Plus} label="Novo Lead" onSelect={() => { setOpen(false); }} />
              <Item icon={CheckSquare} label="Nova Tarefa" onSelect={() => { setOpen(false); }} />
              <Item icon={Megaphone} label="Nova Landing Page" onSelect={() => { setOpen(false); }} />
            </Command.Group>

            <Command.Group heading="Leads Recentes" className="px-2 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground font-bold mt-2">
              {leads.slice(0, 5).map(l => (
                <Item 
                  key={l.id} 
                  icon={Users} 
                  label={`${l.company} (${l.name})`} 
                  onSelect={() => { navigate({ to: "/app/crm" }); setOpen(false); }} 
                />
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}

function Item({ icon: Icon, label, onSelect }: { icon: any; label: string; onSelect: () => void }) {
  return (
    <Command.Item 
      onSelect={onSelect}
      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm cursor-pointer hover:bg-muted aria-selected:bg-muted transition-colors"
    >
      <Icon className="h-4 w-4 text-primary" />
      <span>{label}</span>
    </Command.Item>
  );
}