import React, { useState, useEffect } from 'react';
import { 
  getDriveConfig, 
  saveDriveConfig, 
  listCheckpoints, 
  createCheckpoint, 
  restoreCheckpoint, 
  testDriveConnection,
  pushToGoogleDrive,
  fetchFromGoogleDrive,
  DriveFileInfo 
} from './googleDriveDatabaseService';
import { 
  Cloud, 
  Save, 
  RefreshCw, 
  History, 
  CheckCircle2, 
  AlertCircle, 
  FolderTree, 
  FileSpreadsheet, 
  FileJson, 
  ExternalLink, 
  Copy, 
  Check, 
  X, 
  Plus, 
  ShieldCheck,
  Download,
  Upload,
  Share2,
  Folder,
  Zap
} from 'lucide-react';
import { SALEAD_GOOGLE_APPS_SCRIPT_CODE } from '@/lib/gdrive-apps-script-code';
import { toast } from 'sonner';

export interface DriveSyncManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentData: any;
  onDataRestored: (data: any) => void;
}

export const DriveSyncManagerModal: React.FC<DriveSyncManagerModalProps> = ({
  isOpen,
  onClose,
  currentData,
  onDataRestored
}) => {
  const [webappUrl, setWebappUrl] = useState('');
  const [autoSync, setAutoSync] = useState(true);
  const [checkpoints, setCheckpoints] = useState<DriveFileInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [activeTab, setActiveTab] = useState<'manager' | 'guide' | 'structure'>('manager');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string | undefined>(undefined);
  const [syncingUp, setSyncingUp] = useState(false);
  const [syncingDown, setSyncingDown] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const config = getDriveConfig();
      setWebappUrl(config.webappUrl || '');
      setAutoSync(config.autoSync ?? true);
      setSpreadsheetUrl(config.spreadsheetUrl);
      if (config.webappUrl) {
        carregarCheckpoints(config.webappUrl);
      }
    }
  }, [isOpen]);

  const carregarCheckpoints = async (url: string) => {
    try {
      setLoading(true);
      const files = await listCheckpoints(url);
      setCheckpoints(files.filter(f => !f.isRoot));
    } catch (err: any) {
      setStatusMessage({ text: 'Erro ao carregar checkpoints: ' + err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleTestarConexao = async () => {
    if (!webappUrl.trim()) {
      setStatusMessage({ text: 'Informe a URL do Web App primeiro.', type: 'error' });
      return;
    }
    try {
      setTesting(true);
      setStatusMessage({ text: 'Testando conexão com o Google Apps Script...', type: 'info' });
      const res = await testDriveConnection(webappUrl);
      if (res.success) {
        setStatusMessage({ text: res.message || 'Conexão ativa com sucesso no Google Drive!', type: 'success' });
        if (res.spreadsheetUrl) setSpreadsheetUrl(res.spreadsheetUrl);
        carregarCheckpoints(webappUrl);
      } else {
        setStatusMessage({ text: res.message, type: 'error' });
      }
    } catch (err: any) {
      setStatusMessage({ text: 'Erro ao testar: ' + err.message, type: 'error' });
    } finally {
      setTesting(false);
    }
  };

  const handleSalvarConfig = async () => {
    if (!webappUrl.trim()) {
      setStatusMessage({ text: 'Informe a URL do Apps Script primeiro.', type: 'error' });
      return;
    }
    saveDriveConfig({ webappUrl, autoSync });
    setStatusMessage({ text: 'Configuração salva com sucesso! Sincronização configurada.', type: 'success' });
    carregarCheckpoints(webappUrl);
  };

  const handleCriarCheckpoint = async () => {
    if (!webappUrl) {
      setStatusMessage({ text: 'Informe a URL do Apps Script primeiro.', type: 'error' });
      return;
    }
    try {
      setLoading(true);
      setStatusMessage({ text: 'Criando checkpoint e snapshot no Google Drive...', type: 'info' });
      const fileName = await createCheckpoint(webappUrl, currentData);
      setStatusMessage({ text: `Checkpoint criado com sucesso: ${fileName}`, type: 'success' });
      carregarCheckpoints(webappUrl);
    } catch (err: any) {
      setStatusMessage({ text: 'Erro ao criar checkpoint: ' + err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubirBancoRaiz = async () => {
    if (!webappUrl.trim()) {
      setStatusMessage({ text: 'Informe a URL do Web App primeiro.', type: 'error' });
      return;
    }
    try {
      setSyncingUp(true);
      await pushToGoogleDrive(webappUrl.trim(), currentData);
      setStatusMessage({ text: 'Banco de dados enviado para o Google Drive e Sheets com sucesso!', type: 'success' });
      toast.success('Banco raiz enviado para o Drive e Sheets!');
    } catch (err: any) {
      setStatusMessage({ text: 'Erro ao subir banco: ' + err.message, type: 'error' });
    } finally {
      setSyncingUp(false);
    }
  };

  const handleBaixarBancoRaiz = async () => {
    if (!webappUrl.trim()) {
      setStatusMessage({ text: 'Informe a URL do Web App primeiro.', type: 'error' });
      return;
    }
    if (!window.confirm('Deseja baixar os dados mais recentes do Google Drive?')) return;
    try {
      setSyncingDown(true);
      const remoteData = await fetchFromGoogleDrive<any>(webappUrl.trim());
      if (remoteData) {
        onDataRestored(remoteData);
        setStatusMessage({ text: 'Banco raiz baixado com sucesso do Google Drive!', type: 'success' });
        toast.success('Banco raiz baixado do Google Drive!');
      } else {
        setStatusMessage({ text: 'Nenhum dado encontrado no banco remoto.', type: 'info' });
      }
    } catch (err: any) {
      setStatusMessage({ text: 'Erro ao baixar dados: ' + err.message, type: 'error' });
    } finally {
      setSyncingDown(false);
    }
  };

  const handleCopyShareLink = () => {
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    let shareUrl = `${currentOrigin}/app/dashboard`;
    if (webappUrl.trim()) {
      shareUrl += `?drive_url=${encodeURIComponent(webappUrl.trim())}`;
    }
    navigator.clipboard.writeText(shareUrl);
    setCopiedShareLink(true);
    toast.success('Link de sincronização para celular e outros computadores copiado!');
    setTimeout(() => setCopiedShareLink(false), 2500);
  };

  const handleRestaurar = async (fileName: string) => {
    if (!window.confirm(`Deseja restaurar o ponto "${fileName}"? Os dados atuais da aplicação serão substituídos pelo snapshot.`)) return;
    try {
      setLoading(true);
      setStatusMessage({ text: `Restaurando dados do ponto "${fileName}"...`, type: 'info' });
      const restored = await restoreCheckpoint(webappUrl, fileName);
      onDataRestored(restored);
      setStatusMessage({ text: `Banco de dados restaurado com sucesso a partir de ${fileName}!`, type: 'success' });
    } catch (err: any) {
      setStatusMessage({ text: 'Erro na restauração: ' + err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCopiarCodigo = () => {
    navigator.clipboard.writeText(SALEAD_GOOGLE_APPS_SCRIPT_CODE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-foreground">
        
        {/* Top Header */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Cloud className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
                Motor Google Drive & Sheets
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  SALEAD Cloud
                </span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Checkpoints, sincronização em tempo real e persistência no Google Drive.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted grid place-items-center transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs de Navegação */}
        <div className="flex border-b border-border px-5 gap-2 bg-muted/10 text-xs font-bold">
          <button
            onClick={() => setActiveTab('manager')}
            className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'manager' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Cloud className="h-3.5 w-3.5" /> Conexão & Checkpoints
          </button>
          <button
            onClick={() => setActiveTab('structure')}
            className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'structure' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <FolderTree className="h-3.5 w-3.5" /> Estrutura no Drive (SALEAD)
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'guide' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" /> Guia de Implantação
          </button>
        </div>

        {/* Conteúdo Principal */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          
          {activeTab === 'manager' && (
            <>
              {/* Campo URL do Apps Script */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  URL da Implantação do WebApp (Google Apps Script):
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={webappUrl}
                    onChange={(e) => setWebappUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="flex-1 bg-muted/40 border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleTestarConexao}
                    disabled={testing || !webappUrl.trim()}
                    className="px-3.5 py-2.5 bg-muted hover:bg-muted/80 text-foreground border border-border rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 transition-all cursor-pointer shrink-0"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 text-primary ${testing ? 'animate-spin' : ''}`} />
                    Testar
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Cole aqui a URL gerada na publicação do Web App com permissão "Qualquer pessoa" (Anyone).
                </p>
              </div>

              {/* Opção de Auto-Sync */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border">
                <input
                  type="checkbox"
                  id="autoSync"
                  checked={autoSync}
                  onChange={(e) => setAutoSync(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20 cursor-pointer"
                />
                <label htmlFor="autoSync" className="text-xs text-foreground font-medium cursor-pointer select-none">
                  Sincronização automática em segundo plano (Auto-Save, Atualização Instantânea & Polling)
                </label>
              </div>

              {/* Links de Acesso Rápido e Outros Aparelhos */}
              <div className="p-3.5 rounded-2xl bg-muted/40 border border-border space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-orange-500" />
                    <span className="text-xs font-bold text-foreground uppercase tracking-wider">Acesso Rápido & Outros Aparelhos</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyShareLink}
                    className="px-3 py-1.5 rounded-xl bg-zinc-900 dark:bg-zinc-800 hover:bg-black text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                  >
                    {copiedShareLink ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Share2 className="h-3.5 w-3.5" />}
                    {copiedShareLink ? 'Link Direto Copiado!' : 'Copiar Link Celular / PC'}
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <a
                    href="https://script.new"
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-card border border-border hover:bg-muted text-foreground text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-orange-500" /> script.new (Criar Novo Projeto)
                  </a>
                  <a
                    href="https://script.google.com/home"
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-card border border-border hover:bg-muted text-foreground text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-blue-500" /> script.google.com (Painel de Projetos)
                  </a>
                </div>
              </div>

              {/* Botões de Ação Principais */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={handleBaixarBancoRaiz}
                  disabled={syncingDown || !webappUrl.trim()}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {syncingDown ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                  Baixar Banco Raiz do Drive
                </button>

                <button
                  type="button"
                  onClick={handleSubirBancoRaiz}
                  disabled={syncingUp || !webappUrl.trim()}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {syncingUp ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  Subir Banco Raiz para o Drive
                </button>
              </div>

              {/* Botões Secundários */}
              <div className="flex flex-wrap gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleSalvarConfig}
                  className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  <Save className="h-3.5 w-3.5" /> Salvar Conexão
                </button>
                <button
                  type="button"
                  onClick={handleCriarCheckpoint}
                  disabled={loading || !webappUrl.trim()}
                  className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  <Plus className="h-3.5 w-3.5" /> Criar Checkpoint
                </button>
                {spreadsheetUrl && (
                  <a
                    href={spreadsheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2.5 bg-muted hover:bg-muted/80 text-foreground border border-border rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ml-auto"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" /> Abrir Planilha <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              {/* Mensagem de Status */}
              {statusMessage && (
                <div className={`p-3 rounded-xl text-xs border flex items-center gap-2 ${
                  statusMessage.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    : statusMessage.type === 'error'
                    ? 'bg-destructive/10 border-destructive/20 text-destructive'
                    : 'bg-muted/60 border-border text-foreground'
                }`}>
                  {statusMessage.type === 'success' ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  ) : statusMessage.type === 'error' ? (
                    <AlertCircle className="h-4 w-4 shrink-0" />
                  ) : (
                    <RefreshCw className="h-4 w-4 shrink-0 animate-spin" />
                  )}
                  <span>{statusMessage.text}</span>
                </div>
              )}

              {/* Lista de Checkpoints */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <History className="h-3.5 w-3.5 text-primary" /> Pontos de Restauração (Checkpoints no Drive):
                  </h3>
                  <button
                    type="button"
                    onClick={() => webappUrl && carregarCheckpoints(webappUrl)}
                    disabled={loading || !webappUrl}
                    className="text-[11px] text-primary hover:underline font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} /> Atualizar Lista
                  </button>
                </div>

                {loading ? (
                  <div className="p-8 text-center bg-muted/20 border border-border rounded-2xl">
                    <RefreshCw className="h-6 w-6 animate-spin text-primary mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">Carregando checkpoints do Drive...</p>
                  </div>
                ) : checkpoints.length === 0 ? (
                  <div className="p-6 text-center bg-muted/20 border border-dashed border-border rounded-2xl">
                    <p className="text-xs text-muted-foreground">Nenhum checkpoint manual criado ainda no Google Drive.</p>
                    <p className="text-[11px] text-muted-foreground/70 mt-1">
                      Clique em "Criar Checkpoint Agora" para gerar uma versão de segurança do banco.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
                    {checkpoints.map((cp) => (
                      <div
                        key={cp.id}
                        className="flex items-center justify-between p-3 bg-muted/30 border border-border rounded-xl hover:border-primary/40 transition-all"
                      >
                        <div className="min-w-0 pr-3">
                          <strong className="text-xs text-foreground truncate block font-mono">
                            {cp.name}
                          </strong>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                            {new Date(cp.lastUpdated).toLocaleString('pt-BR')} • {(cp.size / 1024).toFixed(1)} KB
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRestaurar(cp.name)}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 shadow-xs"
                        >
                          Restaurar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ABA: ESTRUTURA DE PASTAS NO GOOGLE DRIVE */}
          {activeTab === 'structure' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-3">
                <div className="flex items-center gap-2">
                  <FolderTree className="h-4 w-4 text-primary" />
                  <h3 className="font-bold text-xs text-foreground uppercase tracking-wider">
                    Como os Dados Ficam Organizados no Google Drive
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Ao receber o primeiro salvamento ou criação de checkpoint, o script cria automaticamente uma pasta raiz chamada <strong className="text-primary font-bold">SALEAD</strong> no seu Google Drive, mantendo todas as pastas e arquivos contidos nela de forma limpa e organizada:
                </p>

                {/* Árvore de Diretórios Visual */}
                <div className="bg-background/80 border border-border rounded-2xl p-4 font-mono text-xs space-y-2 text-foreground">
                  <div className="flex items-center gap-2 text-primary font-bold">
                    <span>📁</span> <span>SALEAD/</span> <span className="text-[10px] font-sans text-muted-foreground font-normal">(Pasta raiz principal no Google Drive)</span>
                  </div>

                  <div className="pl-6 space-y-2 border-l-2 border-primary/20 ml-2">
                    <div className="flex items-center gap-2 font-bold text-amber-500">
                      <span>📁</span> <span>AppDatabase_Data/</span>
                    </div>

                    <div className="pl-6 space-y-1.5 border-l-2 border-amber-500/20 ml-2 font-normal text-[11px]">
                      <div className="flex items-center gap-2">
                        <FileJson className="h-3.5 w-3.5 text-sky-400" />
                        <span className="text-sky-400 font-bold">database_root.json</span>
                        <span className="text-muted-foreground font-sans text-[10px]">— Arquivo mestre JSON de alta velocidade</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-bold">APP_DATABASE_SHEETS</span>
                        <span className="text-muted-foreground font-sans text-[10px]">— Planilha com abas: Leads, Usuários, LPs, Pesquisas, etc.</span>
                      </div>

                      <div className="flex items-center gap-2 text-purple-400 font-bold pt-1">
                        <span>📁</span> <span>Backups/</span>
                        <span className="text-muted-foreground font-sans font-normal text-[10px]">— Snapshots automáticos diários e backups JSON</span>
                      </div>

                      <div className="flex items-center gap-2 text-amber-400 font-bold">
                        <span>📁</span> <span>Midia/</span>
                        <span className="text-muted-foreground font-sans font-normal text-[10px]">— Imagens e anexos Base64 com links públicos diretos</span>
                      </div>

                      <div className="flex items-center gap-2 text-muted-foreground">
                        <FileJson className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>checkpoint_YYYY-MM-DD_HH-mm.json</span>
                        <span className="font-sans text-[10px]">— Pontos de restauração manuais</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-xs space-y-1.5">
                <div className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" /> Vantagens dessa Arquitetura:
                </div>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 text-[11px] leading-relaxed">
                  <li><strong>Nenhum lixo no seu Drive:</strong> tudo fica confinado dentro da pasta única <span className="font-bold text-foreground">SALEAD</span>.</li>
                  <li><strong>Portabilidade para outros projetos:</strong> você pode reutilizar esse mesmo motor e este componente em qualquer outro aplicativo.</li>
                  <li><strong>Tabelamento automático:</strong> planilhas prontas para visualização, filtros e relatórios no Google Sheets.</li>
                </ul>
              </div>
            </div>
          )}

          {/* ABA: GUIA DE IMPLANTAÇÃO */}
          {activeTab === 'guide' && (
            <div className="space-y-4 text-xs">
              <div className="space-y-3 p-4 rounded-2xl bg-muted/30 border border-border">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-foreground">
                    Guia Rápido de Publicação no Google Apps Script
                  </h3>
                  <button
                    type="button"
                    onClick={handleCopiarCodigo}
                    className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all hover:opacity-90"
                  >
                    {copiedCode ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedCode ? 'Código Copiado!' : 'Copiar Código Code.gs'}
                  </button>
                </div>

                <ol className="list-decimal list-inside space-y-2 text-muted-foreground leading-relaxed">
                  <li>Acesse <a href="https://script.new" target="_blank" rel="noreferrer" className="text-primary underline font-bold">script.new</a> (ou script.google.com) e crie um novo projeto.</li>
                  <li>Apague o código padrão e cole o código completo fornecido no arquivo <strong>Código.gs</strong>.</li>
                  <li>Clique em <strong>Implantar (Deploy)</strong> &gt; <strong>Nova Implantação (New Deployment)</strong>.</li>
                  <li>Escolha o tipo: <strong>App da Web (Web App)</strong>.</li>
                  <li>
                    Configure os campos exatamente assim:
                    <ul className="list-disc list-inside pl-4 pt-1 space-y-1 text-[11px]">
                      <li><strong>Descrição:</strong> Motor de Banco & Sheets v1</li>
                      <li><strong>Executar como:</strong> Eu (seu-email@gmail.com)</li>
                      <li><strong>Quem pode acessar:</strong> Qualquer pessoa (Anyone) <em>(necessário para o fetch da sua aplicação frontend conseguir se comunicar com a API)</em>.</li>
                    </ul>
                  </li>
                  <li>Clique em <strong>Implantar</strong> e autorize o acesso à sua conta Google.</li>
                  <li>Copie a <strong>URL do App da Web</strong> gerada (terminada em <code>/exec</code>).</li>
                  <li>Cole a URL no campo de conexão desta tela e clique em <strong>Salvar Conexão</strong>!</li>
                </ol>
              </div>
            </div>
          )}

        </div>

        {/* Rodapé */}
        <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">
            Pasta Raiz no Drive: <strong className="text-foreground">SALEAD / AppDatabase_Data</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-bold text-xs uppercase tracking-wider cursor-pointer transition-colors"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
