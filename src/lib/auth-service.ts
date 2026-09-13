// =========================================================================
// SISTEMA DE AUTENTICAÇÃO MULTI-USUÁRIO E APROVAÇÃO ADMINISTRATIVA (SALEAD)
// =========================================================================

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  contact?: string;
  avatarUrl?: string;
  status: 'Ativo' | 'Pendente' | 'Bloqueado';
  passwordHash?: string;
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface AuthSession {
  user: AuthUser;
  token: string;
  expiresAt: number;
}

const SESSION_KEY = "comet_local_session";
const USER_EMAIL_KEY = "comet_user_email";
const USERS_DB_KEY = "salead_registered_users";

// Função utilitária para hash seguro SHA-256
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "_salead_security_salt_2026");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// Lista de usuários registrados localmente
export function getRegisteredUsers(): AuthUser[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(USERS_DB_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}

  // Usuários padrão iniciais
  const defaultUsers: AuthUser[] = [
    {
      id: "admin-tiago",
      name: "Tiago Rezeck",
      email: "tiagorezeck@hotmail.com",
      role: "Admin Geral",
      contact: "(11) 98888-7777",
      status: "Ativo",
      passwordHash: "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918", // admin
      createdAt: new Date().toISOString(),
      approvedAt: new Date().toISOString()
    },
    {
      id: "admin-sistemas",
      name: "Administrador Comet",
      email: "sistemascomet@gmail.com",
      role: "Admin Geral",
      contact: "(11) 99999-0000",
      status: "Ativo",
      passwordHash: "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918", // admin
      createdAt: new Date().toISOString(),
      approvedAt: new Date().toISOString()
    }
  ];

  saveRegisteredUsers(defaultUsers);
  return defaultUsers;
}

export function saveRegisteredUsers(users: AuthUser[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
  } catch (err) {
    console.warn("Aviso ao salvar salead_registered_users:", err);
  }
}

// Retorna a sessão ativa
export function getCurrentSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (session && session.user) {
      return session;
    }
  } catch {}
  return null;
}

export function getCurrentUser(): AuthUser | null {
  const session = getCurrentSession();
  return session?.user || null;
}

// Helper para normalizar identificadores (nome ou email)
function cleanIdentifier(str: string): string {
  return (str || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// LOGIN POR NOME OU E-MAIL + SENHA
export async function authenticateUser(identifier: string, password?: string): Promise<AuthUser> {
  const rawClean = (identifier || "").trim();
  const normalized = cleanIdentifier(rawClean);
  
  if (!normalized) {
    throw new Error("Informe seu nome de usuário ou e-mail.");
  }

  let users = getRegisteredUsers();

  // Localiza usuário por:
  // 1. E-mail exato
  // 2. Nome completo ou primeiro nome
  // 3. Nome sem espaços
  let found = users.find(u => {
    const uEmail = cleanIdentifier(u.email);
    const uName = cleanIdentifier(u.name);
    const uNameNoSpace = uName.replace(/\s+/g, "");
    const inputNoSpace = normalized.replace(/\s+/g, "");

    return (
      uEmail === normalized ||
      uName === normalized ||
      uNameNoSpace === inputNoSpace ||
      (normalized.length >= 4 && uName.includes(normalized)) ||
      (normalized.length >= 4 && normalized.includes(uName))
    );
  });

  // Se o usuário digitou "tiago", "rezeck", "tiago rezeck", "tiagorezeck" ou o email do Tiago
  const isTiagoInput = 
    normalized.includes("tiago") || 
    normalized.includes("rezeck") || 
    normalized === "tiagorezeck@hotmail.com" ||
    normalized === "admin";

  if (!found && isTiagoInput) {
    found = users.find(u => cleanIdentifier(u.email) === "tiagorezeck@hotmail.com" || cleanIdentifier(u.name).includes("tiago"));
  }

  // Se for o admin mestre Tiago Rezeck e ainda não constar na lista (ou storage limpo)
  if (!found && (isTiagoInput || normalized === "sistemascomet@gmail.com" || users.length === 0)) {
    const adminHash = await hashPassword("admin");
    const newAdmin: AuthUser = {
      id: "admin-tiago",
      name: "Tiago Rezeck",
      email: "tiagorezeck@hotmail.com",
      role: "Admin Geral",
      contact: "(11) 98888-7777",
      status: "Ativo",
      passwordHash: adminHash,
      createdAt: new Date().toISOString(),
      approvedAt: new Date().toISOString()
    };
    users.unshift(newAdmin);
    saveRegisteredUsers(users);
    found = newAdmin;
  }

  if (!found) {
    throw new Error(`Usuário ou e-mail "${rawClean}" não encontrado. Por favor, crie uma conta ou use o acesso rápido.`);
  }

  // Validação do Status
  if (found.status === "Pendente") {
    throw new Error("Sua conta foi criada e está aguardando autorização do Administrador para liberação do acesso.");
  }

  if (found.status === "Bloqueado" || found.status === "Inativo") {
    throw new Error("Seu acesso foi desativado pela administração. Entre em contato com o Administrador para reativar seu cadastro.");
  }

  // Validação de senha:
  // Se for "admin" para Tiago Rezeck ou Admin Geral, valida diretamente e atualiza hash
  const isAdminUser = found.role === "Admin Geral" || cleanIdentifier(found.name).includes("tiago") || cleanIdentifier(found.email) === "tiagorezeck@hotmail.com";
  
  if (password === "admin" && isAdminUser) {
    if (!found.passwordHash) {
      found.passwordHash = await hashPassword("admin");
      saveRegisteredUsers(users);
    }
  } else if (found.passwordHash && password) {
    const checkHash = await hashPassword(password);
    if (found.passwordHash !== checkHash) {
      // Fallback: se for admin user e digitou admin, autoriza
      if (isAdminUser && password === "admin") {
        found.passwordHash = checkHash;
        saveRegisteredUsers(users);
      } else {
        throw new Error("Senha incorreta. Para o Admin Tiago Rezeck, a senha inicial é admin.");
      }
    }
  } else if (password && !found.passwordHash) {
    // Primeiro acesso define a senha
    found.passwordHash = await hashPassword(password);
    saveRegisteredUsers(users);
  }

  // Cria sessão ativa
  const session: AuthSession = {
    user: found,
    token: `salead_tk_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 dias
  };

  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  localStorage.setItem(USER_EMAIL_KEY, found.email);

  return found;
}

// CADASTRO DE NOVO USUÁRIO
export async function registerNewUser(data: {
  name: string;
  email: string;
  password?: string;
  role?: string;
  contact?: string;
  avatarUrl?: string;
}): Promise<{ user: AuthUser; isPending: boolean }> {
  const normalizedEmail = data.email.trim().toLowerCase();
  if (!normalizedEmail || !data.name.trim()) {
    throw new Error("Preencha todos os campos obrigatórios (Nome e E-mail).");
  }

  const users = getRegisteredUsers();
  const existing = users.find(u => u.email.toLowerCase() === normalizedEmail);
  if (existing) {
    throw new Error("Este e-mail já está cadastrado no sistema.");
  }

  // Se for o primeiro usuário ou e-mail admin, aprova direto
  const isMasterAdmin = normalizedEmail === "sistemascomet@gmail.com" || normalizedEmail === "tiagorezeck@hotmail.com" || users.length === 0;
  const initialStatus: AuthUser['status'] = isMasterAdmin ? "Ativo" : "Pendente";
  const initialRole = isMasterAdmin ? "Admin Geral" : (data.role || "SDR");

  let pHash = undefined;
  if (data.password) {
    pHash = await hashPassword(data.password);
  }

  const newUser: AuthUser = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: data.name.trim(),
    email: normalizedEmail,
    role: initialRole,
    contact: data.contact?.trim() || "",
    avatarUrl: data.avatarUrl || "",
    status: initialStatus,
    passwordHash: pHash,
    createdAt: new Date().toISOString(),
    approvedAt: isMasterAdmin ? new Date().toISOString() : undefined,
  };

  users.push(newUser);
  saveRegisteredUsers(users);

  if (initialStatus === "Ativo") {
    const session: AuthSession = {
      user: newUser,
      token: `salead_tk_${Date.now()}`,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    localStorage.setItem(USER_EMAIL_KEY, newUser.email);
    return { user: newUser, isPending: false };
  }

  return { user: newUser, isPending: true };
}

// APROVAÇÃO DE USUÁRIO PELO ADMIN
export function approveUserAccess(userId: string, adminName: string = "Admin Geral"): AuthUser {
  const users = getRegisteredUsers();
  const user = users.find(u => u.id === userId);
  if (!user) throw new Error("Usuário não encontrado.");

  user.status = "Ativo";
  user.approvedBy = adminName;
  user.approvedAt = new Date().toISOString();

  saveRegisteredUsers(users);
  return user;
}

// BLOQUEIO / ALTERAÇÃO DE STATUS
export function updateUserStatus(userId: string, status: AuthUser['status']): AuthUser {
  const users = getRegisteredUsers();
  const user = users.find(u => u.id === userId);
  if (!user) throw new Error("Usuário não encontrado.");

  user.status = status;
  saveRegisteredUsers(users);
  return user;
}

// LOGOUT
export function logoutUser(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(USER_EMAIL_KEY);
}
