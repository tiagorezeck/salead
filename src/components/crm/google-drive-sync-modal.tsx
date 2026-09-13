"use client";

import React, { useState, useEffect } from "react";
import {
  Cloud,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  ExternalLink,
  Copy,
  Check,
  History,
  ShieldCheck,
  Save,
  ArrowRight,
  Database,
  Layers,
  Sparkles,
  HelpCircle,
  X,
  Code,
  Download,
  Upload,
  ClipboardList,
  Folder,
  Share2,
  Smartphone,
  Zap
} from "lucide-react";
import {
  getDriveConfig,
  saveDriveConfig,
  cleanWebAppUrl,
  testDriveConnection,
  createCheckpoint,
  listCheckpoints,
  restoreCheckpoint,
  downloadSpreadsheetAsXlsx,
  downloadJsonBackup,
  pushToGoogleDrive,
  fetchFromGoogleDrive,
  getSpreadsheetExportUrl,
  type DriveConfig,
  type DriveFileInfo,
} from "@/services/googleDriveDatabaseService";
import { SALEAD_GOOGLE_APPS_SCRIPT_CODE } from "@/lib/gdrive-apps-script-code";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useData } from "@/hooks/use-data";

interface GoogleDriveSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GoogleDriveSyncModal({ isOpen, onClose }: GoogleDriveSyncModalProps) {
  const [config, setConfig] = useState<DriveConfig>(getDriveConfig());
  const [webappUrlInput, setWebappUrlInput] = useState(config.webappUrl || "");
  const [autoSyncInput, setAutoSyncInput] = useState(config.autoSync ?? true);
  
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  
  const [isCreatingCheckpoint, setIsCreatingCheckpoint] = useState(false);
  const [isLoadingCheckpoints, setIsLoadingCheckpoints] = useState(false);
  const [checkpoints, setCheckpoints] = useState<DriveFileInfo[]>([]);
  const [isRestoring, setIsRestoring] = useState<string | null>(null);
  const [isSyncingUp, setIsSyncingUp] = useState(false);
  const [isSyncingDown, setIsSyncingDown] = useState(false);
  
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const [activeTab, setActiveTab] = useState<"connection" | "checkpoints" | "script">("connection");

  const data = useData();

  useEffect(() => {
    if (isOpen) {
      const current = getDriveConfig();
      setConfig(current);
      setWebappUrlInput(current.webappUrl || "");
      setAutoSyncInput(current.autoSync ?? true);
      setTestResult(null);

      if (current.webappUrl) {
        loadCheckpoints(current.webappUrl);
      }
    }
  }, [isOpen]);

  const loadCheckpoints = async (url: string) => {
    if (!url) return;
    setIsLoadingCheckpoints(true);
    try {
      const files = await listCheckpoints(url);
      setCheckpoints(files);
    } catch (err) {
      console.warn("Erro ao listar checkpoints:", err);
    } finally {
      setIsLoadingCheckpoints(false);
    }
  };

  const handleTestConnection = async () => {
    const cleanUrl = cleanWebAppUrl(webappUrlInput.trim());
    if (!cleanUrl) {
      toast.error("Insira a URL do Web App do Google Apps Script.");
      return;
    }
    setWebappUrlInput(cleanUrl);

    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testDriveConnection(cleanUrl);
      setTestResult({ 
        success: res.success, 
        message: res.message,
        spreadsheetUrl: res.spreadsheetUrl,
        spreadsheetName: res.spreadsheetName 
      });
      if (res.success) {
        toast.success("Conexão estabelecida com sucesso!", {
          description: `Planilha pronta: ${res.spreadsheetName || 'SALEAD CRM DATABASE'}`
        });
        setConfig(getDriveConfig());
        loadCheckpoints(cleanUrl);
      } else {
        toast.error("Falha ao conectar:", { description: res.message });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message });
      toast.error(err.message);
    } finally {
      setIsTesting(false);
    }
  };

  const handleConectarESincronizar = async () => {
    const cleanUrl = cleanWebAppUrl(webappUrlInput.trim());
    if (!cleanUrl) {
      toast.error("Insira a URL do Web App do Google Apps Script.");
      return;
    }
    setWebappUrlInput(cleanUrl);

    const updated = saveDriveConfig({
      webappUrl: cleanUrl,
      autoSync: autoSyncInput
    });
    setConfig(updated);

    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testDriveConnection(cleanUrl);
      setTestResult({ 
        success: res.success, 
        message: res.message,
        spreadsheetUrl: res.spreadsheetUrl,
        spreadsheetName: res.spreadsheetName 
      });
      if (res.success) {
        toast.success("Conectado com o Google Drive!", {
          description: `Planilha pronta: ${res.spreadsheetName || 'SALEAD CRM DATABASE'}`
        });
        setConfig(getDriveConfig());
        loadCheckpoints(cleanUrl);

        // Envia o banco local inicial para criar as abas no Sheets e a pasta no Drive
        try {
          const currentDb = {
            leads: data.leads,
            users: data.users,
            landingPages: data.landingPages,
            products: data.products,
            surveys: data.surveys,
            tasks: data.tasks,
            pipelines: data.pipelines,
            playbooks: data.playbooks,
            company: data.company,
            exportedAt: new Date().toISOString()
          };
          await pushToGoogleDrive(cleanUrl, currentDb);
          toast.success("Dados locais sincronizados no Google Sheets e Drive com sucesso!");
          setConfig(getDriveConfig());
        } catch (syncErr: any) {
          console.warn("Aviso na sincronização inicial:", syncErr.message);
        }
      } else {
        toast.error("Falha na validação do link:", { description: res.message });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message });
      toast.error(err.message);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubirBancoRaiz = async () => {
    const targetUrl = config.webappUrl || webappUrlInput.trim();
    if (!targetUrl) {
      toast.error("Conecte a URL do Google Apps Script antes de subir o banco.");
      return;
    }

    setIsSyncingUp(true);
    try {
      const currentDb = {
        leads: data.leads,
        users: data.users,
        landingPages: data.landingPages,
        products: data.products,
        surveys: data.surveys,
        tasks: data.tasks,
        pipelines: data.pipelines,
        playbooks: data.playbooks,
        company: data.company,
        exportedAt: new Date().toISOString()
      };

      await pushToGoogleDrive(targetUrl, currentDb);
      toast.success("Banco de dados local enviado para o Google Drive e Sheets com sucesso!");
      setConfig(getDriveConfig());
    } catch (err: any) {
      toast.error("Erro ao subir banco para o Drive: " + err.message);
    } finally {
      setIsSyncingUp(false);
    }
  };

  const handleBaixarBancoRaiz = async () => {
    const targetUrl = config.webappUrl || webappUrlInput.trim();
    if (!targetUrl) {
      toast.error("Conecte a URL do Google Apps Script antes de baixar o banco.");
      return;
    }

    if (!confirm("Deseja baixar os dados mais recentes do Google Drive e atualizar sua tela?")) {
      return;
    }

    setIsSyncingDown(true);
    try {
      const remoteData = await fetchFromGoogleDrive<any>(targetUrl);
      if (remoteData) {
        toast.success("Dados baixados com sucesso do Google Drive!", {
          description: "Atualizando a visualização..."
        });
        setTimeout(() => {
          window.location.reload();
        }, 800);
      } else {
        toast.info("Nenhum dado encontrado no banco remoto do Drive.");
      }
    } catch (err: any) {
      toast.error("Erro ao baixar dados do Drive: " + err.message);
    } finally {
      setIsSyncingDown(false);
    }
  };

  const handleCopyShareLink = () => {
    const activeUrl = config.webappUrl || webappUrlInput.trim();
    const currentOrigin = typeof window !== "undefined" ? window.location.origin : "";
    
    let shareUrl = `${currentOrigin}/app/dashboard`;
    if (activeUrl) {
      shareUrl += `?drive_url=${encodeURIComponent(activeUrl)}`;
    }

    navigator.clipboard.writeText(shareUrl);
    setCopiedShareLink(true);
    toast.success("Link direto copiado!", {
      description: "Abra este link no celular ou em outro PC para usar o sistema conectado instantaneamente."
    });
    setTimeout(() => setCopiedShareLink(false), 2500);
  };

  const handleCreateCheckpoint = async () => {
    if (!config.webappUrl) {
      toast.error("Conecte a URL do Google Apps Script antes de gerar um checkpoint.");
      return;
    }

    setIsCreatingCheckpoint(true);
    try {
      const currentDb = {
        leads: data.leads,
        users: data.users,
        landingPages: data.landingPages,
        products: data.products,
        surveys: data.surveys,
        tasks: data.tasks,
        pipelines: data.pipelines,
        playbooks: data.playbooks,
        company: data.company,
        exportedAt: new Date().toISOString()
      };

      const fileName = await createCheckpoint(config.webappUrl, currentDb);
      toast.success("Checkpoint criado com sucesso!", {
        description: `Arquivo salvo: ${fileName}`
      });
      loadCheckpoints(config.webappUrl);
    } catch (err: any) {
      toast.error("Falha ao criar checkpoint: " + err.message);
    } finally {
      setIsCreatingCheckpoint(false);
    }
  };

  const handleRestoreCheckpoint = async (fileName: string) => {
    if (!confirm(`Deseja restaurar o banco de dados para o estado de "${fileName}"? Os dados atuais serão substituídos pelo snapshot.`)) {
      return;
    }

    setIsRestoring(fileName);
    try {
      await restoreCheckpoint(config.webappUrl, fileName);
      toast.success("Checkpoint restaurado com sucesso!", {
        description: "Os dados foram atualizados no Google Drive e no sistema."
      });
      window.location.reload();
    } catch (err: any) {
      toast.error("Falha na restauração: " + err.message);
    } finally {
      setIsRestoring(null);
    }
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(SALEAD_GOOGLE_APPS_SCRIPT_CODE);
    setCopiedCode(true);
    toast.success("Código do Google Apps Script copiado para a área de transferência!");
    setTimeout(() => setCopiedCode(false), 2500);
  };

  if (!isOpen) return null;

  const currentUser = data.currentUser;
  const isAdmin = currentUser?.role === "Admin Geral" || 
                  currentUser?.role === "Admin" || 
                  currentUser?.role === "Head of Sales" || 
                  currentUser?.email === "tiagorezeck@hotmail.com" || 
                  currentUser?.email === "sistemascomet@gmail.com";

  if (!isAdmin) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
        <div className="bg-card border border-destructive/30 rounded-3xl p-6 max-w-md w-full text-center space-y-4 shadow-2xl">
          <div className="h-12 w-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h3 className="font-bold text-lg text-foreground">Acesso Restrito ao Administrador</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            As configurações de infraestrutura de banco de dados, sincronização do Google Drive e planilhas são restritas à gestão da empresa.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-bold text-xs uppercase tracking-wider cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  const folderDisplayName = config.folderName || 'SALEAD / AppDatabase_Data';
  const lastSyncDateStr = config.lastSyncTimestamp 
    ? new Date(config.lastSyncTimestamp).toLocaleString('pt-BR') 
    : 'Nunca sincronizado';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-card border border-border w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 shadow-sm">
              <Cloud className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg sm:text-xl text-foreground flex items-center gap-2">
                Banco de Dados no Google Drive
              </h2>
              <p className="text-xs text-muted-foreground">
                Sincronização em nuvem e pontos de restauração automáticos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted grid place-items-center transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border px-4 sm:px-6 gap-2 bg-muted/10">
          <button
            onClick={() => setActiveTab("connection")}
            className={cn(
              "px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer",
              activeTab === "connection"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Cloud className="h-3.5 w-3.5" /> Conexão & Painel
          </button>
          <button
            onClick={() => setActiveTab("checkpoints")}
            className={cn(
              "px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer",
              activeTab === "checkpoints"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <History className="h-3.5 w-3.5" /> Restauração & Checkpoints
          </button>
          <button
            onClick={() => setActiveTab("script")}
            className={cn(
              "px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer",
              activeTab === "script"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Code className="h-3.5 w-3.5" /> Código Apps Script
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {activeTab === "connection" && (
            <div className="space-y-6">
              {/* Card de Identificação da Pasta e Auto-Sync */}
              <div className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center shrink-0 shadow-sm">
                    <Folder className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-foreground">
                      Pasta: {folderDisplayName} / app_database.json
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Última Sincronização: <strong>{lastSyncDateStr}</strong>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn(
                    "px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 border shadow-sm",
                    config.webappUrl && (config.syncStatus === 'synced' || config.autoSync)
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                      : "bg-muted text-muted-foreground border-border"
                  )}>
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    {config.webappUrl && (config.syncStatus === 'synced' || config.autoSync) 
                      ? "AUTO-SYNC ATIVADO" 
                      : "SINCRONIZAÇÃO LOCAL"}
                  </span>
                </div>
              </div>

              {/* Grid com 3 Cards: Google Sheets, Restauração e Outros Aparelhos */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {/* 1. Google Sheets */}
                <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider">
                      <FileSpreadsheet className="h-4 w-4" /> Google Sheets
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Abra as planilhas e tabelas do banco diretamente no Google.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (config.spreadsheetUrl) {
                        window.open(config.spreadsheetUrl, "_blank", "noopener,noreferrer");
                      } else {
                        toast.error("Conecte a URL do Web App primeiro para gerar a planilha.");
                      }
                    }}
                    disabled={!config.spreadsheetUrl}
                    className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> ABRIR PLANILHA
                  </button>
                </div>

                {/* 2. Restauração */}
                <div className="p-4 rounded-2xl border border-indigo-500/30 bg-indigo-500/5 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-wider">
                      <History className="h-4 w-4" /> Restauração
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Gere cópias duplicadas do banco ou restaure versões anteriores.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("checkpoints")}
                    className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow transition-all cursor-pointer"
                  >
                    <History className="h-3.5 w-3.5" /> CHECKPOINTS
                  </button>
                </div>

                {/* 3. Outros Aparelhos */}
                <div className="p-4 rounded-2xl border border-sky-500/30 bg-sky-500/5 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-bold text-xs uppercase tracking-wider">
                      <Share2 className="h-4 w-4" /> Outros Aparelhos
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Copie este link para abrir conectado em celulares ou outros PCs.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyShareLink}
                    className="w-full py-2.5 px-3 rounded-xl bg-zinc-900 dark:bg-zinc-800 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow transition-all cursor-pointer"
                  >
                    {copiedShareLink ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedShareLink ? "LINK COPIADO!" : "COPIAR LINK"}
                  </button>
                </div>
              </div>

              {/* Passo a Passo Rápido (3 Minutos) */}
              <div className="p-5 rounded-2xl border border-border bg-muted/20 space-y-3.5">
                <div className="flex items-center gap-2 text-xs font-bold text-foreground uppercase tracking-wider">
                  <HelpCircle className="h-4 w-4 text-primary" /> Passo a Passo Rápido (3 Minutos)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-card border border-border space-y-1 shadow-sm">
                    <div className="flex items-center gap-2 font-bold text-xs text-foreground">
                      <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-black flex items-center justify-center shrink-0">1</span>
                      Criar Script
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Acesse a aba <strong>Código Apps Script</strong> para copiar o código, ou abra <strong>script.new</strong> para colar no editor.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-card border border-border space-y-1 shadow-sm">
                    <div className="flex items-center gap-2 font-bold text-xs text-foreground">
                      <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-black flex items-center justify-center shrink-0">2</span>
                      Implantar WebApp
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Clique em <strong>Implantar &gt; Nova implantação</strong>. No ícone de engrenagem, selecione <strong>App da Web</strong>.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-card border border-border space-y-1 shadow-sm">
                    <div className="flex items-center gap-2 font-bold text-xs text-foreground">
                      <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-black flex items-center justify-center shrink-0">3</span>
                      Acesso & URL
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Em <em>Quem pode acessar</em> selecione <strong>Qualquer pessoa</strong>. Conclua, copie a URL gerada (termina em <code>/exec</code>) e cole abaixo!
                    </p>
                  </div>
                </div>
              </div>

              {/* Input URL e Botão Conectar & Sincronizar */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
                    URL do WebApp do Apps Script
                  </label>
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTesting || !webappUrlInput.trim()}
                    className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-40"
                  >
                    <Sparkles className="h-3 w-3" /> Testar Conexão / Ping
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="url"
                    value={webappUrlInput}
                    onChange={(e) => setWebappUrlInput(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="flex-1 bg-muted/50 border border-border rounded-xl px-4 py-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={handleConectarESincronizar}
                    disabled={isTesting || !webappUrlInput.trim()}
                    className="px-5 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    {isTesting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                    CONECTAR & SINCRONIZAR
                  </button>
                </div>

                {testResult && (
                  <div className={cn(
                    "p-4 rounded-xl text-xs border space-y-2 shadow-sm transition-all",
                    testResult.success
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                      : "bg-destructive/10 border-destructive/20 text-destructive dark:text-red-400"
                  )}>
                    <div className="flex items-start gap-2.5">
                      {testResult.success ? (
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 shrink-0 text-destructive dark:text-red-400 mt-0.5" />
                      )}
                      <div className="flex-1 space-y-1">
                        <p className="font-semibold leading-relaxed">{testResult.message}</p>
                        {testResult.success && testResult.spreadsheetUrl && (
                          <div className="pt-2">
                            <a 
                              href={testResult.spreadsheetUrl} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] shadow-sm transition-colors"
                            >
                              <ExternalLink className="h-3.5 w-3.5" /> Abrir Planilha do Sheets Criada
                            </a>
                          </div>
                        )}
                        {!testResult.success && (
                          <div className="pt-2 mt-2 border-t border-destructive/20 text-[11px] space-y-1 text-muted-foreground dark:text-red-300/80">
                            <p className="font-bold text-foreground">💡 Dica de Auditoria e Resolução:</p>
                            <ul className="list-disc pl-4 space-y-0.5">
                              <li>No <strong>Google Apps Script</strong>, clique em <strong>Implantar</strong> &gt; <strong>Gerenciar implantações</strong> &gt; Editar (ícone de lápis ✏️).</li>
                              <li>Certifique-se de definir <strong>Executar como: Eu</strong> e <strong>Quem pode acessar: Qualquer pessoa (Anyone)</strong>.</li>
                              <li>Clique em <strong>Implantar</strong> e certifique-se de que a URL termina em <code>/exec</code>.</li>
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "checkpoints" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-foreground">Pontos de Restauração (Checkpoints)</h3>
                  <p className="text-xs text-muted-foreground">
                    Crie snapshots completos do banco e reverta para qualquer ponto anterior com segurança.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCreateCheckpoint}
                  disabled={isCreatingCheckpoint || !config.webappUrl}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5 disabled:opacity-50 hover:scale-105 transition-all cursor-pointer"
                >
                  {isCreatingCheckpoint ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                  Criar Checkpoint Agora
                </button>
              </div>

              {/* Downloads Rápidos de Backup */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const ok = downloadSpreadsheetAsXlsx(config);
                    if (ok) {
                      toast.success("Download da planilha XLSX iniciado!");
                    } else {
                      toast.error("Conecte a planilha para gerar exportação XLSX.");
                    }
                  }}
                  disabled={!config.spreadsheetUrl && !config.spreadsheetId}
                  className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-40 shadow-sm"
                >
                  <Download className="h-4 w-4" /> Baixar Planilha (.xlsx)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const backupPayload = {
                      leads: data.leads,
                      landingPages: data.landingPages,
                      surveys: data.surveys,
                      users: data.users,
                      products: data.products,
                      tasks: data.tasks,
                      pipelines: data.pipelines,
                      playbooks: data.playbooks,
                      company: data.company,
                      backupTimestamp: new Date().toISOString()
                    };
                    downloadJsonBackup(backupPayload, "salead_crm_backup");
                    toast.success("Backup do banco local baixado com sucesso!");
                  }}
                  className="p-3.5 rounded-xl border border-border bg-muted/60 hover:bg-muted text-foreground font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                >
                  <Database className="h-4 w-4 text-primary" /> Baixar Snapshot Local (.json)
                </button>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {isLoadingCheckpoints ? (
                  <div className="p-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin text-primary" /> Buscando checkpoints no Google Drive...
                  </div>
                ) : checkpoints.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-border rounded-2xl text-xs text-muted-foreground">
                    Nenhum checkpoint encontrado no Drive. Clique no botão acima para criar o primeiro snapshot.
                  </div>
                ) : (
                  checkpoints.map((cp) => (
                    <div
                      key={cp.id}
                      className="p-3.5 rounded-xl bg-muted/40 border border-border flex items-center justify-between hover:bg-muted/60 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Database className="h-4 w-4 text-primary shrink-0" />
                        <div>
                          <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
                            {cp.name}
                            {cp.isRoot && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-primary/20 text-primary uppercase font-black">
                                Banco Ativo
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {new Date(cp.lastUpdated).toLocaleString("pt-BR")} • {(cp.size / 1024).toFixed(1)} KB
                          </div>
                        </div>
                      </div>

                      {!cp.isRoot && (
                        <button
                          type="button"
                          onClick={() => handleRestoreCheckpoint(cp.name)}
                          disabled={isRestoring === cp.name}
                          className="px-3 py-1.5 bg-muted hover:bg-primary hover:text-primary-foreground rounded-lg text-[11px] font-bold border border-border transition-all cursor-pointer"
                        >
                          {isRestoring === cp.name ? "Restaurando..." : "Restaurar"}
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === "script" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-foreground">Instruções do Google Apps Script</h3>
                  <p className="text-xs text-muted-foreground">
                    Copie este código e cole no seu projeto do Google Apps Script para criar o banco em nuvem.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyScript}
                  className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5 hover:scale-105 transition-all cursor-pointer"
                >
                  {copiedCode ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedCode ? "Copiado!" : "Copiar Code.gs"}
                </button>
              </div>

              {/* Acesso rápido links */}
              <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/40 border border-border rounded-xl text-xs">
                <span className="text-muted-foreground font-bold mr-1">Acesso rápido:</span>
                <a
                  href="https://script.new"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-card border border-border hover:bg-muted text-foreground flex items-center gap-1.5 transition-colors font-semibold text-xs shadow-sm"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-orange-500" /> script.new (Criar Novo Projeto)
                </a>
                <a
                  href="https://script.google.com/home"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-card border border-border hover:bg-muted text-foreground flex items-center gap-1.5 transition-colors font-semibold text-xs shadow-sm"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-blue-500" /> script.google.com (Painel de Projetos)
                </a>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                <span className="flex items-center gap-1.5 font-bold text-foreground">
                  <Code className="h-3.5 w-3.5 text-primary" /> Código do Motor Google Apps Script (Code.gs)
                </span>
                <span className="text-[10px] font-mono font-bold bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/20">
                  720+ linhas • Motor Completo & Multitabelas
                </span>
              </div>

              <div className="relative rounded-2xl overflow-hidden border border-border bg-[#0d1117] p-4 text-[11px] font-mono text-emerald-400 max-h-80 overflow-y-auto shadow-inner">
                <pre className="whitespace-pre">{SALEAD_GOOGLE_APPS_SCRIPT_CODE}</pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

