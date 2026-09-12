"use client";

import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, KanbanSquare, Users, Megaphone, Trophy, Zap, Settings, Bell, Search, Sparkles,
  GitBranch, Timer, BarChart3, CheckSquare, Gauge, X, AlertTriangle, Flame, Plus, BookOpen,
  Package, ChevronRight, ChevronLeft, Menu, UserCog, Target, ClipboardList, Cloud, CloudOff, RefreshCw, MonitorPlay, Activity,
  Command, Wallet, Maximize2, Minimize2, Sliders, Sun, Moon, FileSpreadsheet, ExternalLink
} from "lucide-react";
import React, { useState, useMemo, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { useData } from "@/hooks/use-data";
import { useTheme } from "@/hooks/use-theme";
import { supabase } from "@/integrations/supabase/client";
import { CommandPalette } from "./command-palette";
import { cn } from "@/lib/utils";
import { BrandLogo } from "./brand-logo";
import { BrandLogoCustomizerModal } from "./brand-logo-customizer-modal";
import { useBrandStore } from "@/lib/brand-store";
import { NewLeadModal } from "./crm/new-lead-modal";
import { NewTaskModal } from "./crm/new-task-modal";
import { LiveTransmitModal } from "./crm/live-transmit-modal";
import { GlobalDateFilter } from "./date-filter";
import { useDriveSync } from "@/hooks/use-drive-sync";
import { GoogleDriveSyncModal } from "./crm/google-drive-sync-modal";
import { SYSTEM_MODULES, DEFAULT_ROLE_MODULES } from "@/data/mock";
import { startOfMonth, endOfMonth } from "date-fns";
import { toast } from "sonner";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { leads, addLead, addTask, setDateFilter, currentUser, roleModulePermissions } = useData();
  const { syncStatus, isOnline, isConfigured, spreadsheetUrl, spreadsheetName } = useDriveSync();
  const { theme, toggleTheme } = useTheme();
  
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showNewLeadModal, setShowNewLeadModal] = useState(false);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [showLiveModal, setShowLiveModal] = useState(false);
  const [showDriveModal, setShowDriveModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [session, setSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [isPinned, setIsPinned] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const isExpanded = isPinned || isHovered;

  const [isFullscreen, setIsFullscreen] = useState(false);

  // Responsive search state (Lupa no mobile/tablet, abre para escrever ao clicar)
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Controle de Permissões: Admin Geral / Gestão
  const isAdmin = currentUser?.role === "Admin Geral" || 
                  currentUser?.role === "Admin" || 
                  currentUser?.role === "Head of Sales" || 
                  currentUser?.email === "tiagorezeck@hotmail.com" || 
                  currentUser?.email === "sistemascomet@gmail.com";

  const userRole = currentUser?.role || "Admin Geral";

  // Filtra itens de navegação conforme permissões manuais ou do cargo
  const visibleNav = useMemo(() => {
    // 1. Administradores têm acesso total a todos os módulos do sistema
    if (isAdmin) return NAV;

    // 2. Permissões individuais personalizadas atribuídas a este colaborador específico
    if (currentUser?.customPermissionsEnabled && Array.isArray(currentUser.allowedModules)) {
      return NAV.filter(item => {
        const mod = SYSTEM_MODULES.find(m => m.path === item.to);
        return mod ? currentUser.allowedModules!.includes(mod.id) : false;
      });
    }

    // 3. Permissões dinâmicas configuradas para o cargo do usuário
    const allowedForRole = (roleModulePermissions && roleModulePermissions[userRole]) 
      || DEFAULT_ROLE_MODULES[userRole] 
      || DEFAULT_ROLE_MODULES["Closer"] 
      || [];

    return NAV.filter(item => {
      const mod = SYSTEM_MODULES.find(m => m.path === item.to);
      return mod ? allowedForRole.includes(mod.id) : false;
    });
  }, [isAdmin, currentUser, userRole, roleModulePermissions]);

  useEffect(() => {
    const handleSearchClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    if (isSearchOpen) {
      document.addEventListener("mousedown", handleSearchClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleSearchClickOutside);
  }, [isSearchOpen]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement || (document as any).webkitFullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Atalho de teclado para abrir o editor do logo: Alt+L (ou clique duplo na logo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === "l" || e.key === "L")) {
        e.preventDefault();
        useBrandStore.getState().openModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        } else if ((document.documentElement as any).webkitRequestFullscreen) {
          await (document.documentElement as any).webkitRequestFullscreen();
        }
        setIsFullscreen(true);
        toast.success("Modo Tela Cheia Ativado", {
          description: "Pressione ESC ou clique novamente no botão para restaurar o tamanho normal."
        });
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
        setIsFullscreen(false);
        toast.info("Modo Normal Restaurado");
      }
    } catch (err: any) {
      console.warn("Fullscreen toggle error:", err);
      toast.info(isFullscreen ? "Modo normal" : "Modo expandido", {
        description: "Dica: você também pode usar a tecla F11 do navegador para alternar tela cheia."
      });
      setIsFullscreen(!isFullscreen);
    }
  };

  useEffect(() => {
    const local = typeof window !== "undefined" ? localStorage.getItem("comet_local_session") : null;
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session);
        setIsLoading(false);
      } else if (local) {
        try {
          setSession(JSON.parse(local));
        } catch {
          setSession({ user: { email: localStorage.getItem("comet_user_email") || "tiagorezeck@hotmail.com" } });
        }
        setIsLoading(false);
      } else {
        navigate({ to: "/login" });
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setSession(session);
      } else {
        const checkLocal = localStorage.getItem("comet_local_session");
        if (checkLocal) {
          try { setSession(JSON.parse(checkLocal)); } catch {}
        } else {
          navigate({ to: "/login" });
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    localStorage.removeItem("comet_local_session");
    localStorage.removeItem("comet_user_email");
    try {
      await supabase.auth.signOut();
    } catch {}
    toast.success("Sessão encerrada.");
    setShowLogoutDialog(false);
    navigate({ to: "/login" });
  };

  const userInitials = currentUser?.name?.substring(0, 2).toUpperCase() || "US";

  if (isLoading) return null;

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <CommandPalette />
      
      <aside 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "hidden md:flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out z-40 h-screen sticky top-0",
          isExpanded ? "w-64" : "w-20"
        )}
      >
        <div className={cn(
          "px-4 py-3 flex items-center border-b border-sidebar-border min-h-[4rem] transition-all flex-shrink-0",
          isExpanded ? "justify-between" : "justify-center"
        )}>
          <div className="flex items-center min-w-max">
            <BrandLogo size="md" showText={isExpanded} allowCustomize={true} />
          </div>
          {isExpanded && (
            <button onClick={() => setIsPinned(!isPinned)} className="p-1.5 rounded-md hover:bg-sidebar-accent text-muted-foreground transition-colors">
              {isPinned ? <ChevronLeft className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          )}
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto sidebar-scrollbar">
          {visibleNav.map((item) => {
            const active = location.pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <div key={item.to}>
                {item.section && isExpanded && (
                  <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70 px-3 mt-3 mb-1.5 first:mt-0 font-black">{item.section}</div>
                )}
                <Link to={item.to} className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all", active ? "bg-sidebar-accent text-sidebar-accent-foreground border border-primary/30 shadow-sm" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground", !isExpanded && "justify-center px-0")}>
                  <Icon className={cn("h-5 w-5 flex-shrink-0 transition-none", active ? "text-primary" : "")} />
                  {isExpanded && <span className="truncate">{item.label}</span>}
                </Link>
              </div>
            );
          })}
        </nav>
      </aside>

      {/* Menu Lateral Mobile */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div 
            className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity" 
            onClick={() => setIsMobileMenuOpen(false)} 
          />
          <aside className="relative flex flex-col w-72 max-w-[85vw] bg-sidebar border-r border-sidebar-border h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            <div className="px-4 py-3 flex items-center justify-between border-b border-sidebar-border min-h-[4rem] transition-all flex-shrink-0">
              <div className="flex items-center">
                <BrandLogo size="md" showText={true} allowCustomize={true} />
              </div>
              <button 
                onClick={() => setIsMobileMenuOpen(false)} 
                className="p-1.5 rounded-lg hover:bg-sidebar-accent text-muted-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto sidebar-scrollbar">
              {visibleNav.map((item) => {
                const active = location.pathname.startsWith(item.to);
                const Icon = item.icon;
                return (
                  <div key={item.to}>
                    {item.section && (
                      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70 px-3 mt-3 mb-1.5 first:mt-0 font-black">{item.section}</div>
                    )}
                    <Link 
                      to={item.to} 
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all", active ? "bg-sidebar-accent text-sidebar-accent-foreground border border-primary/30 shadow-sm" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground")}
                    >
                      <Icon className={cn("h-5 w-5 flex-shrink-0", active ? "text-primary" : "")} />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </div>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border bg-card/40 backdrop-blur sticky top-0 z-30 flex items-center px-3 sm:px-4 md:px-6 gap-2 sm:gap-3">
          {/* Menu Mobile Hamburger (gaveta lateral no mobile/tablet) */}
          <button 
            onClick={() => setIsMobileMenuOpen(true)} 
            className="md:hidden h-9 w-9 rounded-xl bg-muted grid place-items-center border border-border shrink-0 hover:bg-muted/80"
            title="Abrir menu lateral"
            aria-label="Menu Lateral"
          >
            <Menu className="h-5 w-5" />
          </button>
          
          {/* 1. Expandir tela */}
          <button 
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Recolher Tela Cheia (ESC)" : "Expandir para Tela Cheia"}
            aria-label={isFullscreen ? "Recolher Tela Cheia" : "Expandir para Tela Cheia"}
            className={cn(
              "h-9 w-9 flex items-center justify-center rounded-xl border transition-all group shrink-0 cursor-pointer",
              isFullscreen 
                ? "bg-primary/15 border-primary/40 text-primary hover:bg-primary/25 shadow-sm" 
                : "bg-muted border-border text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30"
            )}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
            ) : (
              <Maximize2 className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:scale-110 transition-transform" />
            )}
          </button>

          {/* 2. Pesquisa (Desktop: barra completa; Tablet/Mobile: só a lupa, que abre para escrever ao clicar) */}
          <div ref={searchContainerRef} className="relative flex items-center shrink-0">
            {/* Desktop (lg+): Barra com texto e atalho ⌘K */}
            <div 
              onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
              className="hidden lg:flex items-center gap-2.5 px-3.5 py-1.5 bg-muted/50 border border-border rounded-xl text-muted-foreground hover:bg-muted hover:border-primary/30 transition-all cursor-pointer w-44 xl:w-60 h-9 shrink-0"
              title="Buscar (⌘K)"
            >
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-xs truncate">Buscar leads, telas...</span>
              <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                <span className="text-xs">⌘</span>K
              </kbd>
            </div>

            {/* Tablet & Mobile (< lg): Só a lupa, e quando clicar abre para escrever */}
            {!isSearchOpen ? (
              <button 
                type="button"
                onClick={() => {
                  setIsSearchOpen(true);
                  setTimeout(() => searchInputRef.current?.focus(), 60);
                }}
                className="lg:hidden h-9 w-9 rounded-xl bg-muted border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/30 transition-all shrink-0 cursor-pointer"
                title="Pesquisar"
                aria-label="Abrir pesquisa"
              >
                <Search className="h-4 w-4" />
              </button>
            ) : (
              <div className="lg:hidden flex items-center gap-1.5 bg-card border border-primary/50 rounded-xl px-2.5 h-9 shadow-lg animate-in fade-in zoom-in-95 shrink-0 z-40 max-w-[170px] sm:max-w-[240px]">
                <Search className="h-3.5 w-3.5 text-primary shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Buscar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
                      setIsSearchOpen(false);
                    } else if (e.key === "Escape") {
                      setIsSearchOpen(false);
                    }
                  }}
                  className="bg-transparent border-none outline-none text-xs text-foreground placeholder:text-muted-foreground/60 w-full min-w-0"
                />
                <button
                  type="button"
                  onClick={() => {
                    setIsSearchOpen(false);
                    setSearchQuery("");
                  }}
                  className="p-0.5 rounded text-muted-foreground hover:text-foreground shrink-0"
                  title="Fechar pesquisa"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* 3. Periodo */}
          <div className="flex items-center shrink-0">
            <GlobalDateFilter />
          </div>

          {/* Espaço flexível */}
          <div className="flex-1" />

          {/* 4. Drive & Planilha - Restrito ao Administrador / Gestão Geral */}
          {isAdmin && spreadsheetUrl && (
            <a
              href={spreadsheetUrl}
              target="_blank"
              rel="noreferrer"
              title={`Abrir Planilha no Google Sheets (${spreadsheetName || 'SALEAD CRM DATABASE'})`}
              aria-label="Abrir Planilha no Google Sheets"
              className="h-9 px-2.5 sm:px-3 flex items-center gap-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-all shrink-0 cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4 shrink-0 text-emerald-500" />
              <span className="hidden md:inline">Planilhas</span>
              <ExternalLink className="h-3 w-3 opacity-60 shrink-0" />
            </a>
          )}

          {isAdmin && (
            <button 
              type="button"
              onClick={() => setShowDriveModal(true)}
              title={
                syncStatus === 'synced' ? 'Google Drive: Sincronizado (Clique para gerenciar)' : 
                syncStatus === 'syncing' ? 'Google Drive: Sincronizando...' :
                syncStatus === 'error' ? 'Google Drive: Erro na Sincronização' :
                isConfigured ? 'Google Drive: Configurado (Clique para gerenciar)' : 'Google Drive: Clique para conectar'
              }
              aria-label="Google Drive"
              className={cn(
                "h-9 w-9 flex items-center justify-center rounded-xl border transition-all shrink-0 cursor-pointer",
                syncStatus === 'synced' ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/20" : 
                syncStatus === 'syncing' ? "bg-primary/10 border-primary/30 text-primary animate-pulse" :
                syncStatus === 'error' ? "bg-destructive/10 border-destructive/30 text-destructive" :
                "bg-muted border-border text-muted-foreground/70 hover:text-foreground hover:bg-muted/80"
              )}
            >
              {syncStatus === 'synced' ? (
                <Cloud className="h-4 w-4 text-emerald-500" />
              ) : syncStatus === 'syncing' ? (
                <RefreshCw className="h-4 w-4 animate-spin text-primary" />
              ) : syncStatus === 'error' ? (
                <AlertTriangle className="h-4 w-4 text-destructive" />
              ) : (
                <Cloud className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          )}

          {/* 5. Transmitir */}
          <button 
            type="button"
            onClick={() => setShowLiveModal(true)} 
            title="Transmitir Painel em Tempo Real (Gestão à Vista)"
            aria-label="Transmitir Painel"
            className="h-9 px-2.5 sm:px-3 flex items-center gap-2 rounded-xl bg-muted border border-border text-muted-foreground text-[10px] font-black uppercase tracking-widest hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all group shrink-0 cursor-pointer"
          >
            <MonitorPlay className="h-4 w-4 text-primary group-hover:scale-110 transition-transform shrink-0" />
            <span className="hidden xl:inline">Transmitir</span>
          </button>

          {/* 6. Alternador de Tema (Modo Escuro / Modo Claro) */}
          <button
            type="button"
            onClick={toggleTheme}
            title={theme === "dark" ? "Mudar para Modo Claro" : "Mudar para Modo Escuro"}
            aria-label="Alternar Tema"
            className="h-9 w-9 rounded-xl bg-muted border border-border grid place-items-center text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors shrink-0 cursor-pointer"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4 text-warning hover:rotate-45 transition-transform" />
            ) : (
              <Moon className="h-4 w-4 text-primary hover:-rotate-12 transition-transform" />
            )}
          </button>

          {/* 7. Sino de notificação */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                type="button"
                className="h-9 w-9 rounded-xl bg-muted border border-border grid place-items-center text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors shrink-0 relative cursor-pointer"
                title="Notificações"
                aria-label="Notificações"
              >
                <Bell className="h-4 w-4" />
                <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary border-2 border-background" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 sm:w-80 rounded-2xl p-3 shadow-xl">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <span className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Notificações</span>
                <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Sistema Ativo</span>
              </div>
              <div className="py-2 space-y-2">
                <div className="p-2 rounded-xl bg-muted/40 hover:bg-muted transition-colors text-xs flex gap-2.5 items-start">
                  <div className="h-2 w-2 rounded-full bg-primary mt-1 shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground">Google Drive</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {syncStatus === 'synced' ? 'Backup e dados sincronizados com sucesso.' : 'Status de sincronização: ' + syncStatus}
                    </p>
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-muted/40 hover:bg-muted transition-colors text-xs flex gap-2.5 items-start">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 mt-1 shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground">Pipeline do CRM</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{leads?.length || 0} leads ativos no funil de vendas.</p>
                  </div>
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* 7. Ação rápida */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                type="button"
                className="h-9 px-3 sm:px-4 rounded-xl bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest shadow-elegant flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all shrink-0 cursor-pointer"
                title="Ação Rápida"
                aria-label="Ação Rápida"
              >
                <Plus className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Ação Rápida</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 shadow-xl">
              <DropdownMenuLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest px-2 py-1.5">Atalhos de Cadastro</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setShowNewLeadModal(true)} className="rounded-xl gap-2 cursor-pointer py-2.5">
                <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0"><Users className="h-4 w-4" /></div>
                <div className="flex flex-col">
                  <span className="font-bold text-xs">Novo Lead</span>
                  <span className="text-[10px] text-muted-foreground">Entrada manual no CRM</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowNewTaskModal(true)} className="rounded-xl gap-2 cursor-pointer py-2.5">
                <div className="h-8 w-8 rounded-lg bg-info/10 text-info flex items-center justify-center shrink-0"><CheckSquare className="h-4 w-4" /></div>
                <div className="flex flex-col">
                  <span className="font-bold text-xs">Agendar Tarefa</span>
                  <span className="text-[10px] text-muted-foreground">Lembrete ou follow-up</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* 8. Usuário */}
          <div className="flex items-center pl-1 sm:pl-2 border-l border-border shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button 
                  type="button"
                  className="flex items-center gap-2 p-1 rounded-xl hover:bg-muted/70 transition-all cursor-pointer shrink-0"
                  title={currentUser?.name || "Perfil do Usuário"}
                  aria-label="Perfil do Usuário"
                >
                  <div className="h-9 w-9 rounded-full bg-gradient-primary overflow-hidden border-2 border-background flex items-center justify-center shadow-sm text-xs font-bold text-primary-foreground shrink-0">
                    {userInitials}
                  </div>
                  <div className="text-left hidden xl:block">
                    <div className="text-xs font-bold leading-none truncate max-w-[110px]">{currentUser?.name || "Usuário"}</div>
                    <div className="text-[9px] text-muted-foreground mt-1 uppercase font-black tracking-widest truncate max-w-[110px]">{currentUser?.role || "Admin"}</div>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 shadow-xl">
                <DropdownMenuLabel className="px-2 py-1.5">
                  <div className="font-bold text-xs">{currentUser?.name || "Usuário"}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{currentUser?.email || session?.user?.email || "tiagorezeck@hotmail.com"}</div>
                  <div className="text-[9px] font-black uppercase tracking-wider text-primary mt-1">{currentUser?.role || "Administrador"}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowLogoutDialog(true)} className="rounded-xl gap-2 cursor-pointer py-2 text-destructive focus:text-destructive">
                  <span className="text-xs font-bold">Sair do sistema</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>

      {showNewLeadModal && <NewLeadModal onClose={() => setShowNewLeadModal(false)} onAdd={addLead} />}
      {showNewTaskModal && <NewTaskModal onClose={() => setShowNewTaskModal(false)} onAdd={addTask} />}
      {showLiveModal && <LiveTransmitModal onClose={() => setShowLiveModal(false)} />}
      {isAdmin && <GoogleDriveSyncModal isOpen={showDriveModal} onClose={() => setShowDriveModal(false)} />}
      <BrandLogoCustomizerModal />

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent className="rounded-[2rem]">
          <AlertDialogHeader><AlertDialogTitle className="font-display font-black">Deseja realmente sair?</AlertDialogTitle><AlertDialogDescription>Sua sessão será encerrada e o sistema não poderá sincronizar dados em tempo real até o próximo login.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleLogout} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold">Sair do sistema</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

const NAV: { to: string; label: string; icon: typeof LayoutDashboard; section?: string }[] = [
  // Gestão a Vista
  { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard, section: "Gestão a Vista" },
  { to: "/app/daily-sales", label: "Meta Diária", icon: Target },
  { to: "/app/performance", label: "Performance", icon: Gauge },

  // Operação
  { to: "/app/crm", label: "CRM Pipeline", icon: KanbanSquare, section: "Operação" },
  { to: "/app/tasks", label: "Minha Agenda", icon: CheckSquare },

  // Cadastros
  { to: "/app/users", label: "Time", icon: UserCog, section: "Cadastros" },
  { to: "/app/leads", label: "Base de Leads", icon: Users },
  { to: "/app/products", label: "Produtos e Serviços", icon: Package },

  // Planejamento
  { to: "/app/playbooks", label: "Playbook", icon: BookOpen, section: "Planejamento" },
  { to: "/app/workflows", label: "Workflow", icon: GitBranch },
  { to: "/app/automations", label: "Automações", icon: Zap },

  // Marketing
  { to: "/app/landing-pages", label: "Landing Page", icon: Megaphone, section: "Marketing" },
  { to: "/app/surveys", label: "Pesquisa", icon: ClipboardList },
  { to: "/app/investments", label: "Investimentos", icon: Wallet },

  // Administração
  { to: "/app/settings", label: "Configurações", icon: Settings, section: "Administração" },
];