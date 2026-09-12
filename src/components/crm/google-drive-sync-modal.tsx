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
  ClipboardList
} from "lucide-react";
import {
  getDriveConfig,
  saveDriveConfig,
  testDriveConnection,
  createCheckpoint,
  listCheckpoints,
  restoreCheckpoint,
  downloadSpreadsheetAsXlsx,
  downloadJsonBackup,
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
  
  const [copiedCode, setCopiedCode] = useState(false);
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
    if (!webappUrlInput.trim()) {
      toast.error("Insira a URL do Web App do Google Apps Script.");
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testDriveConnection(webappUrlInput);
      setTestResult({ success: res.success, message: res.message });
      if (res.success) {
        toast.success("Conexão estabelecida com sucesso!", {
          description: `Planilha pronta: ${res.spreadsheetName || 'SALEAD CRM DATABASE'}`
        });
        setConfig(getDriveConfig());
        loadCheckpoints(webappUrlInput);
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

  const handleSaveSettings = () => {
    const updated = saveDriveConfig({
      webappUrl: webappUrlInput.trim(),
      autoSync: autoSyncInput
    });
    setConfig(updated);
    toast.success("Configurações salvas!");
    if (webappUrlInput.trim()) {
      handleTestConnection();
    }
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-card border border-border w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-border flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Cloud className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg sm:text-xl text-foreground flex items-center gap-2">
                Google Drive & Sheets Database
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  Tempo Real
                </span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Persistência completa em nuvem no seu Google Drive com tabelas automáticas no Google Sheets.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted grid place-items-center transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border px-4 sm:px-6 gap-2 bg-muted/10">
          <button
            onClick={() => setActiveTab("connection")}
            className={cn(
              "px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2",
              activeTab === "connection"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Cloud className="h-3.5 w-3.5" /> Conexão & Planilha
          </button>
          <button
            onClick={() => setActiveTab("checkpoints")}
            className={cn(
              "px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2",
              activeTab === "checkpoints"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <History className="h-3.5 w-3.5" /> Checkpoints & Backups
          </button>
          <button
            onClick={() => setActiveTab("script")}
            className={cn(
              "px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2",
              activeTab === "script"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Code className="h-3.5 w-3.5" /> Código Apps Script (Code.gs)
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {activeTab === "connection" && (
            <div className="space-y-5">
              {/* Status Banner */}
              <div className={cn(
                "p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3",
                config.webappUrl && config.syncStatus === 'synced'
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                  : config.webappUrl
                  ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
                  : "bg-muted/50 border-border text-muted-foreground"
              )}>
                <div className="flex items-center gap-3">
                  {config.webappUrl && config.syncStatus === 'synced' ? (
                    <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0" />
                  ) : (
                    <Cloud className="h-6 w-6 text-primary shrink-0" />
                  )}
                  <div>
                    <div className="font-bold text-sm text-foreground">
                      {config.webappUrl && config.syncStatus === 'synced'
                        ? "Google Drive e Sheets Conectados"
                        : config.webappUrl
                        ? "Configurado (Aguardando Verificação)"
                        : "Modo Local Offline (Sem Web App configurado)"}
                    </div>
                    <div className="text-xs opacity-90 text-muted-foreground mt-0.5">
                      {config.spreadsheetName ? (
                        <span>Planilha vinculada: <strong>{config.spreadsheetName}</strong></span>
                      ) : (
                        <span>Cole a URL do Web App do Google Apps Script abaixo para ativar a nuvem.</span>
                      )}
                    </div>
                  </div>
                </div>

                {config.spreadsheetUrl && (
                  <a
                    href={config.spreadsheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5 shadow hover:bg-primary/90 transition-all shrink-0 justify-center"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" /> Abrir no Google Sheets <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              {/* Quick Actions: Abrir Planilhas e Baixar Backups */}
              <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                    <span className="font-bold text-xs text-foreground uppercase tracking-wider">Acesso Direto e Downloads de Backup</span>
                  </div>
                  {config.spreadsheetUrl && (
                    <span className="text-[10px] text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      Google Sheets Ativo
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (!config.spreadsheetUrl) {
                        toast.error("Conecte a URL do Web App primeiro para gerar a planilha.");
                        return;
                      }
                      window.open(config.spreadsheetUrl, "_blank", "noopener,noreferrer");
                    }}
                    disabled={!config.spreadsheetUrl}
                    className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition-all disabled:opacity-40 cursor-pointer shadow-sm text-center"
                  >
                    <div className="flex items-center gap-1">
                      <FileSpreadsheet className="h-4 w-4" />
                      <span>Abrir Planilhas</span>
                      <ExternalLink className="h-3 w-3 opacity-70" />
                    </div>
                    <span className="text-[10px] font-normal opacity-80">Acessar no Google Sheets</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!config.spreadsheetUrl && !config.spreadsheetId) {
                        toast.error("Conecte a URL do Web App primeiro para baixar a planilha.");
                        return;
                      }
                      const ok = downloadSpreadsheetAsXlsx(config);
                      if (ok) {
                        toast.success("Download da planilha XLSX iniciado!");
                      } else {
                        toast.error("Não foi possível gerar a URL de exportação da planilha.");
                      }
                    }}
                    disabled={!config.spreadsheetUrl && !config.spreadsheetId}
                    className="p-3 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition-all disabled:opacity-40 cursor-pointer shadow-sm text-center"
                  >
                    <div className="flex items-center gap-1">
                      <Download className="h-4 w-4" />
                      <span>Baixar Planilha (.xlsx)</span>
                    </div>
                    <span className="text-[10px] font-normal opacity-80">Excel com todas as abas</span>
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
                    className="p-3 rounded-xl border border-border bg-muted/60 hover:bg-muted text-foreground font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm text-center"
                  >
                    <div className="flex items-center gap-1">
                      <Database className="h-4 w-4 text-primary" />
                      <span>Baixar Backup (.json)</span>
                    </div>
                    <span className="text-[10px] font-normal text-muted-foreground">Snapshot seguro completo</span>
                  </button>
                </div>

                {config.spreadsheetUrl && (
                  <div className="pt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="truncate max-w-[320px] sm:max-w-md font-mono text-[10px]">
                      {config.spreadsheetUrl}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(config.spreadsheetUrl || "");
                        toast.success("Link da planilha copiado!");
                      }}
                      className="text-primary hover:underline font-bold flex items-center gap-1 shrink-0 ml-2"
                    >
                      <Copy className="h-3 w-3" /> Copiar Link
                    </button>
                  </div>
                )}
              </div>

              {/* Informações da Estrutura de LPs e Pesquisas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-muted/30 border border-border space-y-1">
                  <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-primary" /> Motor de Landing Pages
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Todas as páginas criadas ficam sincronizadas na aba <strong>Landing_Pages</strong> e acessíveis por todos os usuários. Leads simultâneos são salvos em <strong>Leads_LandingPages</strong> com proteção contra concorrência.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-muted/30 border border-border space-y-1">
                  <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
                    <ClipboardList className="h-3.5 w-3.5 text-emerald-500" /> Pesquisas em Abas Separadas
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Cada pesquisa gera uma aba dedicada exclusiva (ex: <strong>Pesq - CSAT</strong>, <strong>Pesq - Qualificação</strong>) com colunas para cada pergunta, além do histórico consolidado em <strong>Respostas_Gerais</strong>.
                  </p>
                </div>
              </div>

              {/* Form Config */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                    URL do App da Web (Google Apps Script)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={webappUrlInput}
                      onChange={(e) => setWebappUrlInput(e.target.value)}
                      placeholder="https://script.google.com/macros/s/.../exec"
                      className="flex-1 bg-muted/50 border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={isTesting || !webappUrlInput.trim()}
                      className="px-4 py-2.5 bg-muted hover:bg-muted/80 text-foreground border border-border rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 transition-all cursor-pointer shrink-0"
                    >
                      {isTesting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-primary" />}
                      Testar Ping
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    URL gerada ao publicar o código em <strong>script.google.com</strong> como App da Web com acesso para "Qualquer pessoa".
                  </p>
                </div>

                {testResult && (
                  <div className={cn(
                    "p-3 rounded-xl text-xs border flex items-center gap-2",
                    testResult.success
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                      : "bg-destructive/10 border-destructive/20 text-destructive"
                  )}>
                    {testResult.success ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
                    <span>{testResult.message}</span>
                  </div>
                )}

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/40 border border-border">
                  <div>
                    <div className="font-bold text-xs text-foreground">Sincronização Automática em Background</div>
                    <div className="text-[11px] text-muted-foreground">
                      Salva alterações no Drive a cada mudança e verifica novos dados a cada 6s para multi-usuários.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoSyncInput}
                    onChange={(e) => setAutoSyncInput(e.target.checked)}
                    className="h-4 w-4 accent-primary rounded cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center gap-1.5 shadow-md hover:bg-primary/90 transition-all cursor-pointer"
                >
                  <Save className="h-3.5 w-3.5" /> Salvar Configurações
                </button>
              </div>
            </div>
          )}

          {activeTab === "checkpoints" && (
            <div className="space-y-4">
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
                  className="px-4 py-2 bg-gradient-primary text-primary-foreground font-bold text-xs rounded-xl shadow flex items-center gap-1.5 disabled:opacity-50 hover:scale-105 transition-all cursor-pointer"
                >
                  {isCreatingCheckpoint ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                  Criar Checkpoint Agora
                </button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {isLoadingCheckpoints ? (
                  <div className="p-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin text-primary" /> Buscando checkpoints no Google Drive...
                  </div>
                ) : checkpoints.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-border rounded-xl text-xs text-muted-foreground">
                    Nenhum checkpoint encontrado no Drive. Clique no botão acima para criar o primeiro snapshot.
                  </div>
                ) : (
                  checkpoints.map((cp) => (
                    <div
                      key={cp.id}
                      className="p-3 rounded-xl bg-muted/40 border border-border flex items-center justify-between hover:bg-muted/60 transition-colors"
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
            <div className="space-y-4">
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
                  className="px-4 py-2 bg-primary text-primary-foreground font-bold text-xs rounded-xl shadow flex items-center gap-1.5 hover:scale-105 transition-all cursor-pointer"
                >
                  {copiedCode ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedCode ? "Copiado!" : "Copiar Code.gs"}
                </button>
              </div>

              {/* Steps */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-muted/50 border border-border">
                  <div className="font-bold text-primary mb-1">1. Acesse</div>
                  <p className="text-[11px] text-muted-foreground">Abra <strong>script.new</strong> no navegador com sua conta Google.</p>
                </div>
                <div className="p-2.5 rounded-xl bg-muted/50 border border-border">
                  <div className="font-bold text-primary mb-1">2. Cole</div>
                  <p className="text-[11px] text-muted-foreground">Substitua o conteúdo de <code>Code.gs</code> pelo código abaixo.</p>
                </div>
                <div className="p-2.5 rounded-xl bg-muted/50 border border-border">
                  <div className="font-bold text-primary mb-1">3. Implante</div>
                  <p className="text-[11px] text-muted-foreground">Clique em <strong>Implantar &gt; Nova implantação</strong> como <strong>App da Web</strong>.</p>
                </div>
                <div className="p-2.5 rounded-xl bg-muted/50 border border-border">
                  <div className="font-bold text-primary mb-1">4. Conecte</div>
                  <p className="text-[11px] text-muted-foreground">Defina quem pode acessar como <strong>Qualquer pessoa</strong> e cole a URL aqui.</p>
                </div>
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
