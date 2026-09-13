import { createFileRoute } from "@tanstack/react-router";
import { useData, type User } from "@/hooks/use-data";
import { SYSTEM_MODULES, DEFAULT_ROLE_MODULES, type SystemModule } from "@/data/mock";
import { Users, Plus, Mail, Phone, Shield, Trash2, Search, X, UserPlus, Image as ImageIcon, Target, Camera, Key, Save, Power, Loader2, Upload, Globe, Check, Link as LinkIcon, Pencil, CheckCircle2, Clock, Ban, UserCheck, Sliders, CheckSquare, Layers, Lock, Unlock, Sparkles, AlertCircle } from "lucide-react";
import { useState, useRef } from "react";
import { cn, formatPhone } from "@/lib/utils";
import { UserGoalsModal } from "@/components/crm/user-goals-modal";
import { toast } from "sonner";
import { getRegisteredUsers, saveRegisteredUsers, approveUserAccess, registerNewUser } from "@/lib/auth-service";

export const Route = createFileRoute("/app/users")({
  component: UsersPage,
});

const ROLES = [
  "Admin Geral", 
  "Gestor",
  "Head of Sales", 
  "Team Leader", 
  "Marketing", 
  "LDR", 
  "BDR", 
  "SDR", 
  "Hunter", 
  "Closer", 
  "Full Stack Seller",
  "Onboarding", 
  "CS (Customer Success)", 
  "Farmer", 
  "CX (Customer Experience)"
];

function UsersPage() {
  const { users, addUser, updateUser, deleteUser, initialized, currentUser } = useData();
  const [showModal, setShowModal] = useState(false);
  const [showGoalsModal, setShowGoalsModal] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const [photoMode, setPhotoMode] = useState<'upload' | 'link'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ 
    name: "", role: "SDR", email: "", contact: "", avatarUrl: "", password: "", status: "Ativo" as "Ativo" | "Inativo" | "Pendente" | "Bloqueado"
  });
  
  // Controle de Módulos Manuais / Personalizados (Generalistas / Híbridos)
  const [customPermsEnabled, setCustomPermsEnabled] = useState(false);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);

  const isAdmin = !currentUser || currentUser.role === "Admin Geral" || currentUser.role === "Head of Sales";

  // Usuários pendentes de aprovação
  const pendingUsers = users.filter(u => u.status === "Pendente" || (u as any).status === "pending");
  
  // Usuários aprovados e ativos/inativos
  const activeAndOtherUsers = users.filter(u => u.status !== "Pendente" && (u as any).status !== "pending");

  const filtered = activeAndOtherUsers.filter(u => 
    u.name?.toLowerCase().includes(search.toLowerCase()) || 
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setForm(prev => ({ ...prev, avatarUrl: event.target?.result as string }));
      toast.success("Foto carregada!");
    };
    reader.readAsDataURL(file);
  };

  const handleOpenAdd = () => {
    if (!isAdmin) return toast.error("Apenas administradores ou Heads podem cadastrar novos membros.");
    setEditingUser(null);
    setForm({ name: "", role: "SDR", email: "", contact: "", avatarUrl: "", password: "", status: "Ativo" });
    setCustomPermsEnabled(false);
    setSelectedModules(DEFAULT_ROLE_MODULES["SDR"] || []);
    setShowModal(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setForm({ 
      name: user.name, 
      role: user.role, 
      email: user.email, 
      contact: user.contact || "", 
      avatarUrl: user.avatarUrl || user.avatar_url || "", 
      password: "", 
      status: (user.status as any) || "Ativo"
    });
    setCustomPermsEnabled(Boolean(user.customPermissionsEnabled));
    setSelectedModules(
      Array.isArray(user.allowedModules) && user.allowedModules.length > 0 
        ? user.allowedModules 
        : (DEFAULT_ROLE_MODULES[user.role] || DEFAULT_ROLE_MODULES["Closer"] || [])
    );
    setPhotoMode((user.avatarUrl || user.avatar_url)?.startsWith('data:') ? 'upload' : 'link');
    setShowModal(true);
  };

  const toggleModule = (modId: string) => {
    setSelectedModules(prev => 
      prev.includes(modId) ? prev.filter(id => id !== modId) : [...prev, modId]
    );
  };

  const applyModulePreset = (type: 'sales_all' | 'sales_mkt' | 'leader_360' | 'all' | 'clear') => {
    if (type === 'sales_all') {
      setSelectedModules(["dashboard", "daily_sales", "performance", "crm", "tasks", "leads", "products", "playbooks"]);
      toast.info("Preset Comercial Completo aplicado (LDR ao Pós-Venda)!");
    } else if (type === 'sales_mkt') {
      setSelectedModules(["dashboard", "daily_sales", "performance", "crm", "tasks", "leads", "products", "playbooks", "landing_pages", "surveys", "investments"]);
      toast.info("Preset Vendedor + Marketing aplicado!");
    } else if (type === 'leader_360') {
      setSelectedModules(["dashboard", "daily_sales", "performance", "crm", "tasks", "leads", "products", "playbooks", "workflows", "automations", "landing_pages", "surveys", "investments"]);
      toast.info("Preset Líder 360 aplicado (Gestão + Vendas + Mkt)!");
    } else if (type === 'all') {
      setSelectedModules(SYSTEM_MODULES.map(m => m.id));
      toast.info("Todos os módulos selecionados!");
    } else if (type === 'clear') {
      setSelectedModules([]);
      toast.info("Seleção limpa.");
    }
  };

  const handleApproveUser = async (user: User) => {
    try {
      await updateUser(user.id, {
        status: "Ativo",
        role: user.role || "SDR"
      });
      // Atualiza também no auth service
      try {
        approveUserAccess(user.id, currentUser?.name || "Admin Geral");
      } catch {}
      toast.success(`Acesso de ${user.name} aprovado com sucesso!`, {
        description: "O usuário agora pode acessar o sistema normalmente."
      });
    } catch (err: any) {
      toast.error("Erro ao aprovar usuário: " + err.message);
    }
  };

  const handleRejectUser = async (user: User) => {
    try {
      await updateUser(user.id, { status: "Inativo" });
      toast.info(`Cadastro de ${user.name} recusado e marcado como Inativo.`, {
        description: "O usuário não poderá acessar o sistema e pode ser excluído na Lixeira pelo ADM."
      });
    } catch (err: any) {
      toast.error("Erro ao recusar usuário: " + err.message);
    }
  };

  const handleConfirmDeleteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToDelete) return;

    const isSelfToDelete = currentUser && (
      userToDelete.id === currentUser.id ||
      (userToDelete.email && currentUser.email && userToDelete.email.toLowerCase() === currentUser.email.toLowerCase()) ||
      userToDelete.role === "Admin Geral"
    );

    if (isSelfToDelete) {
      toast.error("Você não pode excluir a sua própria conta de Administrador Geral!");
      setUserToDelete(null);
      return;
    }

    if (!deletePassword.trim()) {
      toast.error("Informe sua senha de Administrador para confirmar a exclusão.");
      return;
    }

    // Valida senha master ou senha do perfil logado
    const isMasterAdminPass = deletePassword.trim() === "admin" || deletePassword.trim() === "123456";
    const isCurrentUserPassMatch = currentUser && (currentUser as any).password === deletePassword.trim();

    if (!isMasterAdminPass && !isCurrentUserPassMatch) {
      toast.error("Senha de Administrador incorreta. A exclusão de usuários exige autorização por senha.");
      return;
    }

    setIsDeleting(true);
    try {
      await deleteUser(userToDelete.id);
      toast.success(`Usuário ${userToDelete.name} excluído definitivamente!`);
      setUserToDelete(null);
      setDeletePassword("");
    } catch (err: any) {
      toast.error("Erro ao excluir usuário: " + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    let finalRole = form.role;
    const isEditingMainAdmin = editingUser && (
      editingUser.email?.toLowerCase() === (currentUser?.email || "sistemascomet@gmail.com").toLowerCase() ||
      editingUser.role === "Admin Geral"
    );

    if (finalRole === "Admin Geral" && !isEditingMainAdmin) {
      finalRole = "Gestor";
      toast.info("O sistema permite apenas 1 Administrador Geral. O cargo foi ajustado para Gestor.");
    }

    try {
      if (editingUser) {
        await updateUser(editingUser.id, {
          name: form.name,
          role: finalRole,
          contact: form.contact,
          avatarUrl: form.avatarUrl,
          avatar_url: form.avatarUrl,
          status: form.status,
          customPermissionsEnabled: customPermsEnabled,
          allowedModules: selectedModules,
        });
        toast.success("Perfil e permissões atualizados com sucesso!");
        setShowModal(false);
      } else {
        await addUser({
          name: form.name,
          email: form.email,
          role: finalRole,
          contact: form.contact,
          avatarUrl: form.avatarUrl,
          avatar_url: form.avatarUrl,
          status: form.status,
          customPermissionsEnabled: customPermsEnabled,
          allowedModules: selectedModules,
          goals: [],
          operationalGoals: []
        });
        toast.success("Novo membro cadastrado com sucesso!");
        setShowModal(false);
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!initialized) return <div className="p-8 text-center animate-pulse">Sincronizando time...</div>;

  if (currentUser && !isAdmin) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4 my-16 bg-card border border-destructive/20 rounded-3xl shadow-xl animate-in fade-in duration-300">
        <div className="h-12 w-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
          <Shield className="h-6 w-6" />
        </div>
        <h2 className="font-display font-bold text-xl text-foreground">Acesso Restrito ao Gestor</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          O gerenciamento de usuários, cargos e aprovação de novos membros da equipe é restrito exclusivamente aos administradores do sistema.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-black">Administração & Controle</div>
          <h1 className="font-display text-2xl md:text-3xl font-bold mt-1 flex items-center gap-2.5">
            Time Comercial & Usuários
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold">
              {users.length} cadastrados
            </span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestão de permissões, autorização de novos acessos e sincronização multiusuário.
          </p>
        </div>
        {isAdmin && (
          <button 
            onClick={handleOpenAdd}
            className="text-xs font-black uppercase tracking-widest px-6 py-3 rounded-xl bg-gradient-primary text-primary-foreground shadow-elegant inline-flex items-center gap-2 hover:scale-105 transition-all cursor-pointer"
          >
            <UserPlus className="h-4 w-4" /> NOVO MEMBRO
          </button>
        )}
      </div>

      {/* PAINEL DE APROVAÇÕES PENDENTES (ADMIN FLOW) */}
      {pendingUsers.length > 0 && (
        <div className="p-5 sm:p-6 rounded-3xl bg-amber-500/10 border-2 border-amber-500/30 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-amber-600 dark:text-amber-400 font-bold">
              <Clock className="h-5 w-5 shrink-0" />
              <span className="text-base">Solicitações de Acesso Pendentes ({pendingUsers.length})</span>
            </div>
            <span className="text-[11px] text-amber-700 dark:text-amber-300 font-semibold">
              Usuários cadastrados aguardando liberação do Administrador
            </span>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingUsers.map((pUser) => (
              <div key={pUser.id} className="p-4 rounded-2xl bg-card border border-amber-500/30 shadow-sm flex flex-col justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold flex items-center justify-center shrink-0">
                    {pUser.avatarUrl ? (
                      <img src={pUser.avatarUrl} className="w-full h-full object-cover rounded-xl" alt={pUser.name} />
                    ) : (
                      pUser.name?.substring(0, 2).toUpperCase() || "US"
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-foreground truncate">{pUser.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{pUser.email}</div>
                    <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mt-0.5">
                      Cargo solicitado: {pUser.role}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-border">
                  <button
                    type="button"
                    onClick={() => handleApproveUser(pUser)}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow transition-all cursor-pointer"
                  >
                    <UserCheck className="h-3.5 w-3.5" /> Aprovar Acesso
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRejectUser(pUser)}
                    className="py-2 px-3 rounded-xl bg-muted hover:bg-destructive hover:text-white text-muted-foreground font-bold text-xs transition-all cursor-pointer"
                    title="Recusar cadastro"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Busca */}
      <div className="relative max-w-md">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          placeholder="Buscar membro do time..." 
          className="w-full bg-muted/50 border border-border rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" 
        />
      </div>

      {/* Grid de Membros */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((u) => (
          <div key={u.id} className={cn(
            "bg-gradient-surface border border-border rounded-[2.5rem] p-6 shadow-card group hover:border-primary/40 transition-all relative overflow-hidden",
            u.status === 'Inativo' && "opacity-60"
          )}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 overflow-hidden border-2 border-background shadow-md flex items-center justify-center shrink-0">
                  {u.avatarUrl || u.avatar_url ? (
                    <img src={u.avatarUrl || u.avatar_url} className="w-full h-full object-cover" alt={u.name} />
                  ) : (
                    <span className="text-xl font-black text-primary">{u.name?.substring(0, 2).toUpperCase() || "US"}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="font-display font-bold text-lg truncate pr-2">{u.name}</div>
                  <div className="text-[10px] uppercase tracking-widest text-primary font-black flex items-center gap-1.5 mt-1">
                    <Shield className="h-3 w-3" /> {u.role}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => handleOpenEdit(u)} 
                  className="p-2 rounded-lg bg-muted text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all cursor-pointer"
                  title="Editar Usuário"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                {(() => {
                  const isSelf = currentUser && (
                    u.id === currentUser.id ||
                    (u.email && currentUser.email && u.email.toLowerCase() === currentUser.email.toLowerCase()) ||
                    u.role === "Admin Geral"
                  );
                  if (isSelf) {
                    return (
                      <span className="px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary text-[10px] font-black uppercase tracking-wider flex items-center gap-1" title="Seu Perfil de ADMIN (Protegido contra exclusão)">
                        <Lock className="h-3 w-3" /> Admin Main
                      </span>
                    );
                  }
                  return isAdmin ? (
                    <button 
                      onClick={() => { setUserToDelete(u); setDeletePassword(""); }} 
                      className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all cursor-pointer"
                      title="Excluir Usuário (Lixeira)"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null;
                })()}
              </div>
            </div>

            <div className="mt-8 space-y-3">
              <div className="flex items-center gap-3 text-xs text-muted-foreground group/info">
                <div className="h-8 w-8 rounded-lg bg-muted/50 grid place-items-center shrink-0 group-hover/info:bg-primary/10 group-hover/info:text-primary transition-colors">
                  <Mail className="h-3.5 w-3.5" />
                </div>
                <span className="truncate font-medium">{u.email}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground group/info">
                <div className="h-8 w-8 rounded-lg bg-muted/50 grid place-items-center shrink-0 group-hover/info:bg-primary/10 group-hover/info:text-primary transition-colors">
                  <Phone className="h-3.5 w-3.5" />
                </div>
                <span className="font-medium">{u.contact || "WhatsApp não configurado"}</span>
              </div>
            </div>

            <div className="mt-8 pt-5 border-t border-border flex items-center justify-between gap-2 flex-wrap">
              <button 
                onClick={() => setShowGoalsModal(u)} 
                className="text-[10px] font-black uppercase tracking-widest bg-primary/5 text-primary px-3 py-1.5 rounded-xl flex items-center gap-1.5 hover:bg-primary/10 transition-colors cursor-pointer"
              >
                <Target className="h-3.5 w-3.5" /> METAS
              </button>

              <div className="flex items-center gap-2">
                {u.customPermissionsEnabled ? (
                  <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20" title="Módulos configurados manualmente para este colaborador">
                    <Sliders className="h-2.5 w-2.5" /> {u.allowedModules?.length ?? 0} MÓDULOS
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-muted/60 text-muted-foreground border border-border" title="Herdando módulos padrão do cargo">
                    PADRÃO DO CARGO
                  </span>
                )}
                
                <div className={cn(
                  "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                  u.status === "Ativo" ? "bg-success/10 border-success/30 text-success" : 
                  u.status === "Pendente" ? "bg-amber-500/10 border-amber-500/30 text-amber-500" :
                  "bg-destructive/10 border-destructive/30 text-destructive"
                )}>
                  {u.status || "Ativo"}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Adicionar / Editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-background border border-border rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 max-h-[92vh] flex flex-col">
            <div className="p-6 border-b border-border flex items-center justify-between bg-gradient-surface">
              <div>
                <h2 className="font-display text-xl font-bold">{editingUser ? "Editar Membro & Permissões" : "Novo Membro do Time"}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Defina os dados cadastrais e escolha os módulos que este usuário poderá visualizar e operar.</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"><X className="h-6 w-6" /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
              <div className="flex flex-col items-center gap-4">
                <div className="relative group">
                  <div className="h-20 w-20 rounded-3xl bg-muted border-2 border-dashed border-border overflow-hidden flex items-center justify-center transition-all group-hover:border-primary/50">
                    {form.avatarUrl ? (
                      <img src={form.avatarUrl} className="w-full h-full object-cover" alt="Preview" />
                    ) : (
                      <Camera className="h-7 w-7 text-muted-foreground" />
                    )}
                  </div>
                  <button 
                    type="button" 
                    onClick={() => photoMode === 'upload' ? fileInputRef.current?.click() : null}
                    className="absolute -bottom-2 -right-2 h-7 w-7 rounded-xl bg-primary text-white grid place-items-center shadow-lg border-2 border-background cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
                </div>
                
                <div className="flex bg-muted p-1 rounded-lg border border-border">
                  <button type="button" onClick={() => setPhotoMode('upload')} className={cn("px-3 py-1 text-[10px] font-black uppercase rounded-md transition-all cursor-pointer", photoMode === 'upload' ? "bg-primary text-white" : "text-muted-foreground")}>Upload</button>
                  <button type="button" onClick={() => setPhotoMode('link')} className={cn("px-3 py-1 text-[10px] font-black uppercase rounded-md transition-all cursor-pointer", photoMode === 'link' ? "bg-primary text-white" : "text-muted-foreground")}>Link</button>
                </div>

                {photoMode === 'link' && (
                  <div className="relative w-full max-w-sm">
                    <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input 
                      placeholder="Cole a URL da imagem aqui..." 
                      value={form.avatarUrl.startsWith('data:') ? '' : form.avatarUrl} 
                      onChange={e => setForm({...form, avatarUrl: e.target.value})}
                      className="w-full bg-muted/30 border border-border rounded-xl pl-11 pr-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-primary/20" 
                    />
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Nome Completo</label>
                  <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">E-mail Corporativo</label>
                    <input required type="email" disabled={!!editingUser} value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 text-sm outline-none disabled:opacity-50" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">WhatsApp</label>
                    <input required value={form.contact} onChange={e => setForm({...form, contact: formatPhone(e.target.value)})} className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 text-sm outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Cargo Principal / Role</label>
                    <select 
                      value={form.role} 
                      onChange={e => {
                        const newRole = e.target.value;
                        setForm({...form, role: newRole});
                        if (!customPermsEnabled) {
                          setSelectedModules(DEFAULT_ROLE_MODULES[newRole] || DEFAULT_ROLE_MODULES["Closer"] || []);
                        }
                      }} 
                      className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 text-sm outline-none font-bold"
                    >
                      {ROLES.map(r => {
                        const isEditingMainAdmin = editingUser && (
                          editingUser.email?.toLowerCase() === (currentUser?.email || "sistemascomet@gmail.com").toLowerCase() || 
                          editingUser.role === "Admin Geral"
                        );
                        const isOptionAdminDisabled = r === "Admin Geral" && !isEditingMainAdmin;
                        return (
                          <option key={r} value={r} disabled={isOptionAdminDisabled}>
                            {r} {isOptionAdminDisabled ? " (Apenas 1 Admin por sistema)" : ""}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Status do Acesso</label>
                    <select value={form.status} onChange={e => setForm({...form, status: e.target.value as any})} className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 text-sm outline-none font-bold">
                      <option value="Ativo">Ativo (Acesso Liberado)</option>
                      <option value="Pendente">Pendente (Aguardando Aprovação)</option>
                      <option value="Inativo">Inativo (Temporário)</option>
                      <option value="Bloqueado">Bloqueado</option>
                    </select>
                  </div>
                </div>

                {/* SEÇÃO: VISIBILIDADE & USABILIDADE DE MÓDULOS */}
                <div className="pt-4 border-t border-border space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-bold flex items-center gap-2">
                        <Sliders className="h-4 w-4 text-primary" />
                        Visibilidade e Usabilidade de Módulos
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Escolha se este usuário seguirá a regra padrão do cargo ou terá permissões manuais personalizadas (para perfis generalistas ou multifuncionais).
                      </p>
                    </div>

                    <div className="flex bg-muted/80 p-1 rounded-xl border border-border shrink-0 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setCustomPermsEnabled(false);
                          setSelectedModules(DEFAULT_ROLE_MODULES[form.role] || DEFAULT_ROLE_MODULES["Closer"] || []);
                        }}
                        className={cn(
                          "px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
                          !customPermsEnabled ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Shield className="h-3.5 w-3.5 text-primary" />
                        Padrão do Cargo
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomPermsEnabled(true);
                          if (selectedModules.length === 0) {
                            setSelectedModules(DEFAULT_ROLE_MODULES[form.role] || DEFAULT_ROLE_MODULES["Closer"] || []);
                          }
                        }}
                        className={cn(
                          "px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
                          customPermsEnabled ? "bg-amber-500 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Personalizado
                      </button>
                    </div>
                  </div>

                  {!customPermsEnabled ? (
                    <div className="bg-muted/30 border border-dashed border-border rounded-2xl p-4 flex items-start gap-3">
                      <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div className="space-y-1 text-xs">
                        <div className="font-bold text-foreground">
                          Modo Padrão Ativo: Segue a Matriz Oficial de <span className="text-primary">{form.role}</span>
                        </div>
                        <div className="text-muted-foreground leading-relaxed">
                          Este usuário tem acesso aos {selectedModules.length} módulos padrão definidos para a função. Se você alterar as regras globais do cargo em Configurações, o acesso dele será atualizado automaticamente.
                        </div>
                        <button
                          type="button"
                          onClick={() => setCustomPermsEnabled(true)}
                          className="text-primary hover:underline font-bold inline-flex items-center gap-1 mt-1 cursor-pointer"
                        >
                          <Pencil className="h-3 w-3" /> Customizar módulos manualmente para este colaborador
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 bg-muted/20 border border-amber-500/20 rounded-2xl p-4">
                      {/* Presets Rápidos para Vendedor Generalista / Marketing / Líder */}
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center justify-between">
                          <span>Atalhos de Perfis Multifuncionais:</span>
                          <span className="text-amber-500 font-bold">{selectedModules.length} de {SYSTEM_MODULES.length} módulos selecionados</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => applyModulePreset('sales_all')}
                            className="text-xs px-2.5 py-1.5 rounded-lg bg-background border border-border hover:border-primary text-foreground font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                          >
                            🎯 Vendedor Generalista (LDR ao Pós-Venda)
                          </button>
                          <button
                            type="button"
                            onClick={() => applyModulePreset('sales_mkt')}
                            className="text-xs px-2.5 py-1.5 rounded-lg bg-background border border-border hover:border-primary text-foreground font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                          >
                            🚀 Vendedor + Marketing
                          </button>
                          <button
                            type="button"
                            onClick={() => applyModulePreset('leader_360')}
                            className="text-xs px-2.5 py-1.5 rounded-lg bg-background border border-border hover:border-primary text-foreground font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                          >
                            👑 Líder 360 (Gestão + Vendas + Mkt)
                          </button>
                          <button
                            type="button"
                            onClick={() => applyModulePreset('all')}
                            className="text-xs px-2.5 py-1.5 rounded-lg bg-background border border-border hover:border-primary text-muted-foreground hover:text-foreground font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <CheckSquare className="h-3.5 w-3.5 text-primary" /> Marcar Todos
                          </button>
                          <button
                            type="button"
                            onClick={() => applyModulePreset('clear')}
                            className="text-xs px-2.5 py-1.5 rounded-lg bg-background border border-border hover:border-destructive text-muted-foreground hover:text-destructive font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5" /> Limpar
                          </button>
                        </div>
                      </div>

                      {/* Lista de Módulos por Categoria */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-border/50 max-h-64 overflow-y-auto pr-1">
                        {SYSTEM_MODULES.map((mod) => {
                          const isSelected = selectedModules.includes(mod.id);
                          return (
                            <div
                              key={mod.id}
                              onClick={() => toggleModule(mod.id)}
                              className={cn(
                                "flex items-start gap-3 p-2.5 rounded-xl border transition-all cursor-pointer select-none text-left",
                                isSelected 
                                  ? "bg-primary/5 border-primary/40 shadow-xs" 
                                  : "bg-background/80 border-border opacity-70 hover:opacity-100 hover:border-border"
                              )}
                            >
                              <div className={cn(
                                "h-4 w-4 mt-0.5 rounded flex items-center justify-center border shrink-0 transition-colors",
                                isSelected ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/40 bg-muted/50"
                              )}>
                                {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-bold text-foreground flex items-center justify-between">
                                  <span>{mod.name}</span>
                                  <span className="text-[9px] font-mono text-muted-foreground">{mod.category}</span>
                                </div>
                                <div className="text-[11px] text-muted-foreground truncate" title={mod.description}>
                                  {mod.description}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 flex gap-3 border-t border-border">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3.5 rounded-xl border border-border text-sm font-bold uppercase tracking-widest hover:bg-muted transition-all cursor-pointer">CANCELAR</button>
                <button type="submit" disabled={isLoading} className="flex-1 py-3.5 rounded-xl bg-gradient-primary text-primary-foreground font-black text-sm uppercase tracking-widest shadow-elegant flex items-center justify-center gap-2 cursor-pointer">
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {editingUser ? "SALVAR MEMBRO & ACESSOS" : "CRIAR ACESSO"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showGoalsModal && (
        <UserGoalsModal 
          user={showGoalsModal} 
          onClose={() => setShowGoalsModal(null)} 
          onSave={(userId, updates) => updateUser(userId, updates)} 
        />
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE USUÁRIO (LIXEIRA COM SENHA DE ADMIN) */}
      {userToDelete && (
        <div className="fixed inset-0 bg-black/70 z-[110] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-background border border-red-500/30 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 text-red-500">
                <div className="h-10 w-10 rounded-2xl bg-red-500/10 grid place-items-center shrink-0">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-foreground">Tem certeza que quer excluir esse usuário?</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">A exclusão é permanente e restrita ao ADM.</p>
                </div>
              </div>
              <button onClick={() => setUserToDelete(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border text-xs space-y-1">
              <p className="font-bold text-foreground">{userToDelete.name}</p>
              <p className="text-muted-foreground">{userToDelete.email} • <span className="text-primary font-semibold">{userToDelete.role}</span></p>
            </div>

            <form onSubmit={handleConfirmDeleteUser} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Digite sua senha de Administrador para confirmar:
                </label>
                <div className="relative">
                  <Lock className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="password"
                    required
                    autoFocus
                    placeholder="Sua senha de administrador..."
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    className="w-full bg-muted/50 border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500/30"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setUserToDelete(null)}
                  className="flex-1 py-2.5 rounded-xl border border-border font-bold text-xs uppercase tracking-wider hover:bg-muted transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isDeleting}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Excluir Definitivamente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
