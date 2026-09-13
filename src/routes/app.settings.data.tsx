"use client";

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { 
  Database, ArrowLeft, Download, Upload, Trash2, AlertTriangle, 
  RefreshCw, Plus, Users, ListTodo, Package, UserCog, KanbanSquare, 
  GitBranch, ClipboardList, Zap, Megaphone, BookOpen, MessageSquare, 
  Eye, Timer, Cloud, Check, Layers, FileJson, ShieldAlert
} from "lucide-react";
import { useData } from "@/hooks/use-data";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { convertToCSV, parseCSV, downloadDataFile } from "@/lib/data-portability";
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

export const Route = createFileRoute("/app/settings/data")({
  component: DataCenterPage,
});

function DataCenterPage() {
  const navigate = useNavigate();
  const data = useData();
  const { exportData, importData, importModuleData, resetData, initialized } = data;
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const moduleFileInputRef = useRef<HTMLInputElement>(null);
  
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Estados para Backup Global
  const [pendingGlobalData, setPendingGlobalData] = useState<any>(null);
  const [showGlobalConfirm, setShowGlobalConfirm] = useState(false);

  // Estados para Módulos Individuais
  const [pendingModuleImport, setPendingModuleImport] = useState<{key: string, data: any, mode: 'merge' | 'replace'} | null>(null);
  const [showModuleImportConfirm, setShowModuleImportConfirm] = useState(false);

  // Destruturando as coleções para garantir acesso direto no map de exportação
  const { 
    leads, tasks, stageWorkflows, products, objections, landingPages, 
    users, playbooks, surveys, automations, pipelines 
  } = data;

  if (!initialized) return <div className="p-8 text-center animate-pulse font-bold text-primary">Sincronizando banco de dados...</div>;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        setPendingGlobalData(json);
        setShowGlobalConfirm(true);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } catch (err) {
        toast.error("Arquivo JSON inválido.");
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmGlobalImport = () => {
    if (!pendingGlobalData) return;
    importData(pendingGlobalData, importMode);
    toast.success(importMode === 'merge' ? "Dados mesclados com sucesso!" : "Dados sobrepostos com sucesso!");
    setPendingGlobalData(null);
    setShowGlobalConfirm(false);
  };

  const handleExportModule = (moduleKey: string, format: 'json' | 'csv') => {
    const moduleDataMap: Record<string, any> = {
      leads, tasks, stageWorkflows, products, objections, landingPages, 
      users, playbooks, surveys, automations, pipelines
    };

    const rawData = moduleDataMap[moduleKey];
    
    if (!rawData || (Array.isArray(rawData) && rawData.length === 0)) {
      toast.error(`O módulo ${moduleKey} está vazio.`);
      return;
    }

    const module = DATA_MODULES.find(m => m.key === moduleKey);
    const label = module ? module.label : moduleKey;
    const dateStr = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
    const fileName = `COMET_Comet-(${dateStr})-${label}`;
    
    try {
      if (format === 'json') {
        downloadDataFile(JSON.stringify(rawData, null, 2), `${fileName}.json`, "application/json");
      } else {
        const csvContent = convertToCSV(Array.isArray(rawData) ? rawData : [rawData]);
        if (!csvContent) {
          toast.error("Erro ao processar dados para CSV.");
          return;
        }
        downloadDataFile(csvContent, `${fileName}.csv`, "text/csv");
      }
      toast.success(`Exportação de ${label} concluída!`);
    } catch (err: any) {
      toast.error(err.message || "Falha na exportação.");
    }
  };

  const DATA_MODULES = [
    { key: 'leads', label: 'Leads (CRM)', icon: Users, csv: true },
    { key: 'tasks', label: 'Agenda de Tarefas', icon: ListTodo, csv: true },
    { key: 'stageWorkflows', label: 'Workflows Operacionais', icon: GitBranch, csv: true },
    { key: 'products', label: 'Produtos e Serviços', icon: Package, csv: true },
    { key: 'objections', label: 'Base de Objeções', icon: ShieldAlert, csv: true },
    { key: 'landingPages', label: 'Landing Pages', icon: Megaphone, csv: true },
    { key: 'users', label: 'Membros do Time', icon: UserCog, csv: true },
    { key: 'playbooks', label: 'Sales Playbooks', icon: BookOpen, csv: true },
    { key: 'surveys', label: 'Pesquisas & Diagnósticos', icon: ClipboardList, csv: false },
    { key: 'automations', label: 'Automações', icon: Zap, csv: true },
    { key: 'pipelines', label: 'Pipelines & Kanban', icon: KanbanSquare, csv: false },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8 max-w-[1200px] mx-auto animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate({ to: "/app/settings" })} className="p-2 hover:bg-muted rounded-xl transition-colors border border-border">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="font-display text-3xl font-bold">Centro de Dados</h1>
          <p className="text-sm text-muted-foreground">Portabilidade total, backups e gestão granular de registros.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-gradient-surface border border-border rounded-3xl p-6 shadow-card space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary grid place-items-center"><Database className="h-5 w-5" /></div>
                <h3 className="font-display font-bold text-lg">Módulos Individuais</h3>
              </div>
            </div>
            
            <div className="grid gap-2">
              {DATA_MODULES.map(m => (
                <div key={m.key} className="flex items-center justify-between p-4 bg-card/50 border border-border rounded-2xl group hover:border-primary/30 transition-all">
                  <div className="flex items-center gap-3">
                    <m.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="text-sm font-bold">{m.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleExportModule(m.key, 'json')} className="px-3 py-1.5 rounded-lg bg-muted text-[9px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all">JSON</button>
                    {m.csv && <button onClick={() => handleExportModule(m.key, 'csv')} className="px-3 py-1.5 rounded-lg bg-muted text-[9px] font-black uppercase tracking-widest hover:bg-success hover:text-white transition-all">CSV</button>}
                    <div className="w-px h-4 bg-border mx-1" />
                    <button onClick={() => { setPendingModuleImport({ key: m.key, data: null, mode: 'merge' }); moduleFileInputRef.current?.click(); }} className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"><Upload className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <div className="bg-primary text-primary-foreground rounded-3xl p-8 shadow-elegant space-y-6 relative overflow-hidden group">
            <Cloud className="absolute -right-4 -bottom-4 h-24 w-24 opacity-10 rotate-12 group-hover:rotate-0 transition-transform" />
            <div className="space-y-2 relative z-10">
              <h3 className="font-display text-xl font-black uppercase tracking-tight">Backup Global</h3>
              <p className="text-xs opacity-80 leading-relaxed">Exporte ou importe absolutamente todas as configurações e dados em um único arquivo JSON.</p>
            </div>
            
            <div className="space-y-4 relative z-10 pt-2">
              <button onClick={exportData} className="w-full py-4 rounded-2xl bg-white text-primary font-black text-xs uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2">
                <Download className="h-4 w-4" /> EXPORTAR TUDO (.JSON)
              </button>

              <div className="p-4 rounded-2xl bg-white/10 border border-white/20 space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 block text-center">Modo de Importação</label>
                <div className="flex bg-black/20 p-1 rounded-xl border border-white/10">
                    <button 
                      onClick={() => setImportMode('merge')}
                      className={cn(
                        "flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5",
                        importMode === 'merge' ? "bg-white text-primary shadow-lg" : "text-white/60 hover:text-white"
                      )}
                    >
                      <Plus className="h-3 w-3" /> Mesclar
                    </button>
                    <button 
                      onClick={() => setImportMode('replace')}
                      className={cn(
                        "flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5",
                        importMode === 'replace' ? "bg-destructive text-white shadow-lg" : "text-white/60 hover:text-white"
                      )}
                    >
                      <RefreshCw className="h-3 w-3" /> Sobrepor
                    </button>
                </div>
                
                <button 
                  onClick={() => fileInputRef.current?.click()} 
                  className={cn(
                    "w-full py-4 rounded-xl border-2 border-dashed font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                    importMode === 'merge' 
                      ? "border-white/30 text-white hover:bg-white/10" 
                      : "border-destructive/50 text-white hover:bg-destructive/20"
                  )}
                >
                  <Upload className="h-4 w-4" /> SELECIONAR ARQUIVO
                </button>
              </div>
            </div>
          </div>

          <div className="bg-destructive/5 border border-destructive/20 rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-destructive font-black text-[10px] uppercase tracking-widest">
              <AlertTriangle className="h-4 w-4" /> Zona de Perigo
            </div>
            <p className="text-xs text-muted-foreground">O reset cria um Checkpoint de segurança no banco de dados e abre um novo ambiente zerado. <strong className="text-foreground">A sua Base de Leads NUNCA é apagada</strong> (leads só somem se excluídos manualmente).</p>
            <button onClick={() => setShowResetConfirm(true)} className="w-full py-3 rounded-xl border border-destructive/30 text-destructive text-[10px] font-black uppercase tracking-widest hover:bg-destructive hover:text-white transition-all">LIMPAR BANCO DE DADOS</button>
          </div>
        </aside>
      </div>

      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
      <input type="file" ref={moduleFileInputRef} onChange={(e) => {
        const file = e.target.files?.[0];
        if(!file || !pendingModuleImport) return;
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result as string;
          try {
            const parsed = file.name.endsWith('.csv') ? parseCSV(content) : JSON.parse(content);
            setPendingModuleImport({...pendingModuleImport, data: parsed});
            setShowModuleImportConfirm(true);
          } catch (err) {
            toast.error("Erro ao ler arquivo modular.");
          }
        };
        reader.readAsText(file);
      }} accept=".json,.csv" className="hidden" />

      {/* Confirmação Importação Global */}
      <AlertDialog open={showGlobalConfirm} onOpenChange={setShowGlobalConfirm}>
        <AlertDialogContent className="rounded-[2rem]">
          <AlertDialogHeader className="items-center text-center">
             <AlertDialogTitle className="font-display text-xl font-black uppercase">
               {importMode === 'merge' ? 'Mesclar Backup' : 'Sobrepor Sistema'}
             </AlertDialogTitle>
             <AlertDialogDescription>
               {importMode === 'merge' 
                 ? "Os dados do arquivo serão adicionados aos registros atuais sem apagar nada." 
                 : "ATENÇÃO: Todo o sistema será resetado e substituído pelos dados deste arquivo."}
             </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmGlobalImport} 
              className={cn("text-white font-bold", importMode === 'merge' ? "bg-primary" : "bg-destructive")}
            >
              CONFIRMAR IMPORTAÇÃO
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmação Importação Modular */}
      <AlertDialog open={showModuleImportConfirm} onOpenChange={setShowModuleImportConfirm}>
        <AlertDialogContent className="rounded-[2rem]">
          <AlertDialogHeader className="items-center text-center">
             <AlertDialogTitle className="font-display text-xl font-black">ACRESCENTAR DADOS</AlertDialogTitle>
             <AlertDialogDescription>Os dados serão mesclados aos registros existentes do módulo <strong>{pendingModuleImport?.key?.toUpperCase()}</strong>.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { importModuleData(pendingModuleImport!.key, pendingModuleImport!.data, 'merge'); setShowModuleImportConfirm(false); toast.success("Módulo atualizado com sucesso!"); }} className="bg-success text-white font-bold">CONFIRMAR MESCLAGEM</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent className="rounded-[2rem]">
          <AlertDialogHeader className="items-center text-center">
            <AlertDialogTitle className="font-display text-2xl font-black text-destructive">LIMPEZA DO BANCO DE DADOS</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-left">
              <p>Antes da limpeza, o sistema irá gerar automaticamente um <strong>Checkpoint (ponto de restauração completo)</strong> e abrir um novo ambiente zerado.</p>
              <p className="font-medium text-foreground bg-primary/10 border border-primary/20 rounded-xl p-3 text-xs">
                🔒 <strong>Base de Leads 100% Protegida:</strong> Seus leads e contatos NUNCA serão apagados no reset. Um lead só é excluído se você apagá-lo manualmente na tela de Leads.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { resetData(); setShowResetConfirm(false); }} className="bg-destructive text-white font-bold">CRIAR CHECKPOINT E LIMPAR BANCO</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}