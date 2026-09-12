"use client";

import { createFileRoute, useSearch, useNavigate } from "@tanstack/react-router";
import { useData } from "@/hooks/use-data";
import { useState, useMemo, useEffect } from "react";
import { MonitorPlay, Zap, LayoutDashboard, KanbanSquare, Gauge, Target, Users, CheckSquare, ClipboardList, Maximize2, Calendar, Trophy, Medal, ClipboardCheck, Layout } from "lucide-react";
import { cn } from "@/lib/utils";

// Importando os objetos Route reais de cada arquivo
import { Route as DashboardRoute } from "./app.dashboard";
import { Route as CRMRoute } from "./app.crm";
import { Route as PerformanceRoute } from "./app.performance";
import { Route as DailySalesRoute } from "./app.daily-sales";
import { Route as LeadsRoute } from "./app.leads";
import { Route as TasksRoute } from "./app.tasks";
import { Route as SurveysRoute } from "./app.surveys.index";

export const Route = createFileRoute("/live")({
  component: LiveTransmissionPage,
  validateSearch: (search: Record<string, unknown>) => ({
    tabs: (search.tabs as string) || "dashboard",
  }),
});

const ICON_MAP: Record<string, any> = {
  'dashboard': LayoutDashboard,
  'crm': KanbanSquare,
  'perf-ranking': Trophy,
  'perf-goals': ClipboardCheck,
  'perf-podium': Medal,
  'perf-matrix': Layout,
  'daily-sales': Target,
  'leads': Users,
  'tasks': CheckSquare,
  'surveys': ClipboardList,
};

const LABEL_MAP: Record<string, string> = {
  'dashboard': 'Dashboard',
  'crm': 'CRM Kanban',
  'perf-ranking': 'Ranking',
  'perf-goals': 'Metas',
  'perf-podium': 'Pódio',
  'perf-matrix': 'Matriz',
  'daily-sales': 'Meta Diária',
  'leads': 'Base de Leads',
  'tasks': 'Agenda',
  'surveys': 'Pesquisas',
};

type TabId = keyof typeof ICON_MAP;

function LiveTransmissionPage() {
  const { tabs } = useSearch({ from: "/live" });
  const navigate = useNavigate();
  const { initialized } = useData();
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [now, setNow] = useState(new Date());

  const activeTabsList = useMemo(() => tabs.split(",") as TabId[], [tabs]);

  useEffect(() => {
    if (activeTabsList.length > 0 && !activeTab) {
      setActiveTab(activeTabsList[0]);
    }
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, [activeTabsList, activeTab]);

  // Função para mudar a aba e atualizar a URL para que as sub-páginas reajam
  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    // Atualiza a URL mantendo a lista de abas mas sinalizando qual a ativa (via manipulação leve da URL)
    // No modo Start/Router, usamos o navigate para manter a reatividade
    navigate({
      to: '/live',
      search: { tabs: tabs }, // Mantemos o parâmetro original, mas a PerformancePage vai ler window.location.href
      replace: true
    });
  };

  const PageComponent = useMemo(() => {
    let baseTab = activeTab;

    if (activeTab.startsWith('perf-')) {
       baseTab = 'performance';
    }

    switch (baseTab) {
      case 'dashboard': return DashboardRoute.options.component;
      case 'crm': return CRMRoute.options.component;
      case 'performance': return PerformanceRoute.options.component;
      case 'daily-sales': return DailySalesRoute.options.component;
      case 'leads': return LeadsRoute.options.component;
      case 'tasks': return TasksRoute.options.component;
      case 'surveys': return SurveysRoute.options.component;
      default: return null;
    }
  }, [activeTab]);

  if (!initialized) return (
    <div className="min-h-screen bg-[#050508] flex items-center justify-center text-primary font-black animate-pulse uppercase tracking-[0.3em]">
      Iniciando Feed COMET LIVE...
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans overflow-hidden">
      <header className="h-16 border-b border-border bg-card/40 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-primary grid place-items-center shadow-elegant">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-black text-sm tracking-tight">COMET LIVE</span>
                <div className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse ml-2" />
              </div>
              <div className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Painel em Tempo Real</div>
            </div>
          </div>
          <div className="h-8 w-px bg-border mx-2" />
          <nav className="flex items-center gap-1.5">
            {activeTabsList.map(tabId => {
              const Icon = ICON_MAP[tabId] || LayoutDashboard;
              const active = activeTab === tabId;
              return (
                <button
                  key={tabId}
                  onClick={() => handleTabChange(tabId)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all",
                    active ? "bg-primary text-primary-foreground shadow-elegant scale-105" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">{LABEL_MAP[tabId]}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right flex flex-col items-end">
            <div className="text-xl font-display font-black tabular-nums leading-none">
              {now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </div>
            <div className="flex items-center gap-2 mt-1">
               <Calendar className="h-2.5 w-2.5 text-primary" />
               <span className="text-[8px] text-muted-foreground uppercase tracking-widest font-black">{now.toLocaleDateString("pt-BR", { weekday: 'long', day: '2-digit', month: 'long' })}</span>
            </div>
          </div>
          <button onClick={() => { if(document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); }} className="h-9 w-9 rounded-xl bg-muted/50 border border-border grid place-items-center text-muted-foreground hover:text-primary transition-colors">
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-auto bg-muted/5 scrollbar-thin">
        <div className="animate-in fade-in duration-500">
            {PageComponent && <PageComponent />}
        </div>
      </main>

      <footer className="h-8 border-t border-border bg-card/20 px-6 flex items-center justify-between shrink-0">
         <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-success" />
            <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Sincronização Ativa com Banco de Dados</span>
         </div>
         <div className="text-[8px] font-black text-muted-foreground/30 uppercase tracking-[0.3em]">COMET COMMERCIAL OS — LIVE MONITORING</div>
      </footer>
    </div>
  );
}