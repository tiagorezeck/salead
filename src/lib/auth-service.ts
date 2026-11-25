// =========================================================================
// SISTEMA DE AUTENTICAÇÃO MULTI-USUÁRIO E APROVAÇÃO ADMINISTRATIVA (SALEAD)
// Fonte da verdade 100% em nuvem (cloudStore + Google Sheets/Drive).
// localStorage guarda apenas o token de sessão ativa do navegador atual.
// =========================================================================

import { cloudStore } from "@/services/cloudStorageService";
import { enableRoleInPipelinesList } from "@/lib/lead-rules";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  contact?: string;
  avatarUrl?: string;
  status: "Ativo" | "Pendente" | "Bloqueado";
  passwordHash?: string;
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
  isStandbyAdmin?: boolean;
}

export interface AuthSession {
  user: AuthUser;
  token: string;
  expiresAt: number;
}

const SESSION_KEY = "comet_local_session";
const USER_EMAIL_KEY = "comet_user_email";

// 1. ADMIN PADRÃO (STANDBY / RECUPERAÇÃO MASTER)
export const SYSTEM_STANDBY_ADMIN: AuthUser = {
  id: "system-standby-admin",
  name: "ADMINISTRADOR (STANDBY)",
  email: "admin@comet.com",
  role: "Admin Geral",
  contact: "(11) 99999-9999",
  status: "Ativo",
  isStandbyAdmin: true,
  passwordHash: "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918",
  createdAt: "2026-01-01T00:00:00.000Z",
  approvedAt: "2026-01-01T00:00:00.000Z",
};

// 2. ADMIN CADASTRADO (TITULAR DO SISTEMA)
export const DEFAULT_REGISTERED_ADMIN: AuthUser = {
  id: "327399fb-3511-41a4-bd01-cf3b803aa859",
  name: "Tiago Rezeck",
  email: "tiagorezeck@hotmail.com",
  role: "Admin Geral",
  contact: "(11) 98888-7777",
  status: "Ativo",
  passwordHash: "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918",
  createdAt: "2026-01-01T00:00:00.000Z",
  approvedAt: "2026-01-01T00:00:00.000Z",
};

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "_salead_security_salt_2026");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function normalizeSingleAdmin(
  users: AuthUser[],
  persistChanges = false
): AuthUser[] {
  if (!Array.isArray(users)) return [{ ...DEFAULT_REGISTERED_ADMIN }];

  const GHOST_IDENTIFIERS = [
    "comet public",
    "cometleads2026",
    "comet_app_worl",
    "comet_sync_wo",
    "admin-sistemas",
    "615483b3",
    "d6132ce0",
    "bc70c5d1",
  ];

  const cleaned = users.filter((u) => {
    if (!u) return false;
    if (
      u.isStandbyAdmin ||
      u.id === "system-standby-admin" ||
      u.email?.toLowerCase() === "admin@comet.com"
    ) {
      return false;
    }
    const nameLow = (u.name || "").toLowerCase();
    const emailLow = (u.email || "").toLowerCase();
    const idLow = (u.id || "").toLowerCase();

    for (const ghost of GHOST_IDENTIFIERS) {
      if (
        nameLow.includes(ghost) ||
        emailLow.includes(ghost) ||
        idLow.includes(ghost)
      ) {
        return false;
      }
    }
    return true;
  });

  const tiagoIndex = cleaned.findIndex(
    (u) =>
      u.email?.toLowerCase() === "tiagorezeck@hotmail.com" ||
      u.name?.toLowerCase().includes("tiago rezeck") ||
      u.id === "327399fb-3511-41a4-bd01-cf3b803aa859"
  );

  let changed = false;
  if (tiagoIndex === -1) {
    cleaned.unshift({ ...DEFAULT_REGISTERED_ADMIN });
    changed = true;
  } else {
    cleaned[tiagoIndex] = {
      ...cleaned[tiagoIndex],
      id: "327399fb-3511-41a4-bd01-cf3b803aa859",
      name: cleaned[tiagoIndex].name || "Tiago Rezeck",
      email: "tiagorezeck@hotmail.com",
      role: "Admin Geral",
      status: "Ativo",
    };
  }

  const result = cleaned.map((u) => {
    const isTiago =
      u.email?.toLowerCase() === "tiagorezeck@hotmail.com" ||
      u.id === "327399fb-3511-41a4-bd01-cf3b803aa859";
    if (isTiago) {
      if (u.role !== "Admin Geral") {
        changed = true;
        return { ...u, role: "Admin Geral" };
      }
      return u;
    }

    if (u.role === "Admin Geral" || (u.role as string) === "Admin") {
      changed = true;
      return { ...u, role: "Gestor" };
    }
    return u;
  });

  if (persistChanges && (changed || result.length !== users.length)) {
    saveRegisteredUsers(result);
  }

  return result.length > 0 ? result : [{ ...DEFAULT_REGISTERED_ADMIN }];
}

// Lista de usuários em memória RAM sincronizada com a nuvem (zero localStorage)
export function getRegisteredUsers(): AuthUser[] {
  const cloudUsers = cloudStore.getState().users;
  const users = Array.isArray(cloudUsers) ? [...cloudUsers] : [];
  if (users.length === 0) {
    return [{ ...DEFAULT_REGISTERED_ADMIN }];
  }
  return normalizeSingleAdmin(users, false);
}

export function saveRegisteredUsers(users: AuthUser[]): void {
  const normalized = normalizeSingleAdmin(users, false);
  cloudStore.mutate(
    (draft) => {
      draft.users = normalized;
    },
    { immediate: true }
  );
}

export function saveRegisteredUser(user: AuthUser): void {
  const users = [...getRegisteredUsers()];
  const existingIdx = users.findIndex(
    (u) => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase()
  );
  if (existingIdx >= 0) {
    users[existingIdx] = { ...users[existingIdx], ...user };
  } else {
    users.push(user);
  }
  saveRegisteredUsers(users);
}

export function removeRegisteredUser(userIdOrEmail: string): void {
  const users = getRegisteredUsers();
  const filtered = users.filter(
    (u) =>
      u.id !== userIdOrEmail &&
      u.email.toLowerCase() !== userIdOrEmail.toLowerCase()
  );
  saveRegisteredUsers(filtered);
}

// Sessão do usuário autenticado (único estado persistido no browser além de tema/sidebar)
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

function cleanIdentifier(str: string): string {
  return (str || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// LOGIN POR NOME OU E-MAIL + SENHA
export async function authenticateUser(
  identifier: string,
  password?: string
): Promise<AuthUser> {
  const rawClean = (identifier || "").trim();
  const normalized = cleanIdentifier(rawClean);

  if (!normalized) {
    throw new Error("Informe seu nome de usuário ou e-mail.");
  }

  const trimmedPass = (password || "").trim();

  // 1. ADMIN PADRÃO (STANDBY / RECUPERAÇÃO MASTER)
  const isStandbyLogin =
    rawClean.toUpperCase() === "ADMIN" ||
    normalized === "admin" ||
    normalized === "admin@comet.com" ||
    normalized === "administrador" ||
    normalized === "standby";

  if (isStandbyLogin) {
    const isStandbyPassMatch =
      trimmedPass.toUpperCase() === "ADMIN" ||
      trimmedPass === "admin" ||
      trimmedPass === "1234" ||
      trimmedPass === "123456";

    if (!isStandbyPassMatch) {
      throw new Error(
        "Senha incorreta para o Administrador Standby. Digite a senha ADMIN."
      );
    }

    const session: AuthSession = {
      user: { ...SYSTEM_STANDBY_ADMIN },
      token: `standby_tk_${Date.now()}`,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    };

    if (typeof window !== "undefined") {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      localStorage.setItem(USER_EMAIL_KEY, SYSTEM_STANDBY_ADMIN.email);
    }
    return SYSTEM_STANDBY_ADMIN;
  }

  // Garante que a lista de usuários da nuvem foi carregada antes de validar credenciais
  if (!cloudStore.getStatus().loadedFromCloud) {
    await cloudStore.bootstrap().catch(() => {});
  }

  let users = getRegisteredUsers();

  const isTiagoInput =
    normalized.includes("tiago") ||
    normalized.includes("rezeck") ||
    normalized === "tiagorezeck@hotmail.com";

  let found = users.find((u) => {
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

  if (!found && isTiagoInput) {
    found = { ...DEFAULT_REGISTERED_ADMIN };
    users = [
      found,
      ...users.filter((u) => u.email?.toLowerCase() !== "tiagorezeck@hotmail.com"),
    ];
    saveRegisteredUsers(users);
  }

  if (!found) {
    throw new Error(
      `Usuário ou e-mail "${rawClean}" não encontrado. Por favor, verifique seus dados ou cadastre-se.`
    );
  }

  if (found.status === "Pendente") {
    throw new Error(
      "Sua conta foi criada e está aguardando autorização do Administrador para liberação do acesso."
    );
  }

  if (found.status === "Bloqueado" || (found.status as string) === "Inativo") {
    throw new Error(
      "Seu acesso foi desativado pela administração. Entre em contato com o Administrador para reativar seu cadastro."
    );
  }

  const isTiagoUser =
    found.email?.toLowerCase() === "tiagorezeck@hotmail.com" ||
    cleanIdentifier(found.name).includes("tiago");
  const isPassValid =
    trimmedPass.toUpperCase() === "ADMIN" ||
    trimmedPass === "admin" ||
    trimmedPass === "1234" ||
    trimmedPass === "123456";

  if (isTiagoUser) {
    if (found.passwordHash && trimmedPass) {
      const checkHash = await hashPassword(trimmedPass);
      if (found.passwordHash !== checkHash && !isPassValid) {
        throw new Error(
          "Senha incorreta. Use a senha cadastrada, ADMIN ou 1234."
        );
      }
    } else if (!isPassValid && trimmedPass) {
      throw new Error("Senha incorreta. A senha padrão do Admin é ADMIN ou 1234.");
    }
  } else if (found.passwordHash && trimmedPass) {
    const checkHash = await hashPassword(trimmedPass);
    if (found.passwordHash !== checkHash) {
      throw new Error("Senha incorreta.");
    }
  } else if (trimmedPass && !found.passwordHash) {
    found = { ...found, passwordHash: await hashPassword(trimmedPass) };
    saveRegisteredUser(found);
  }

  const session: AuthSession = {
    user: found,
    token: `salead_tk_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  };

  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    localStorage.setItem(USER_EMAIL_KEY, found.email);
  }

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

  if (!cloudStore.getStatus().loadedFromCloud) {
    await cloudStore.bootstrap().catch(() => {});
  }

  const users = [...getRegisteredUsers()];
  const existing = users.find((u) => u.email.toLowerCase() === normalizedEmail);
  if (existing) {
    throw new Error("Este e-mail já está cadastrado no sistema.");
  }

  const isTiago = normalizedEmail === "tiagorezeck@hotmail.com";
  const finalRole = isTiago
    ? "Admin Geral"
    : data.role === "Admin Geral" || data.role === "Admin"
    ? "Gestor"
    : data.role || "SDR";

  const initialStatus: AuthUser["status"] = isTiago ? "Ativo" : "Pendente";

  let pHash: string | undefined = undefined;
  if (data.password) {
    pHash = await hashPassword(data.password);
  }

  const newUser: AuthUser = {
    id: isTiago
      ? "327399fb-3511-41a4-bd01-cf3b803aa859"
      : `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: data.name.trim(),
    email: normalizedEmail,
    role: finalRole,
    contact: data.contact?.trim() || "",
    avatarUrl: data.avatarUrl || "",
    status: initialStatus,
    passwordHash: pHash,
    createdAt: new Date().toISOString(),
    approvedAt: isTiago ? new Date().toISOString() : undefined,
  };

  users.push(newUser);
  saveRegisteredUsers(users);

  // Habilita automaticamente o cargo cadastrado no pipeline correspondente
  cloudStore.mutate(
    (draft) => {
      draft.pipelines = enableRoleInPipelinesList(draft.pipelines || [], finalRole);
    },
    { immediate: true }
  );

  if (initialStatus === "Ativo") {
    const session: AuthSession = {
      user: newUser,
      token: `salead_tk_${Date.now()}`,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    };
    if (typeof window !== "undefined") {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      localStorage.setItem(USER_EMAIL_KEY, newUser.email);
    }
    return { user: newUser, isPending: false };
  }

  return { user: newUser, isPending: true };
}

// APROVAÇÃO DE USUÁRIO PELO ADMIN
export function approveUserAccess(
  userId: string,
  adminName: string = "Admin Geral"
): AuthUser {
  const users = [...getRegisteredUsers()];
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1) throw new Error("Usuário não encontrado.");

  const updated: AuthUser = {
    ...users[idx],
    status: "Ativo",
    approvedBy: adminName,
    approvedAt: new Date().toISOString(),
  };
  users[idx] = updated;
  saveRegisteredUsers(users);

  cloudStore.mutate(
    (draft) => {
      draft.pipelines = enableRoleInPipelinesList(draft.pipelines || [], updated.role);
    },
    { immediate: true }
  );

  return updated;
}

// BLOQUEIO / ALTERAÇÃO DE STATUS
export function updateUserStatus(
  userId: string,
  status: AuthUser["status"]
): AuthUser {
  const users = [...getRegisteredUsers()];
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1) throw new Error("Usuário não encontrado.");

  const updated: AuthUser = { ...users[idx], status };
  users[idx] = updated;
  saveRegisteredUsers(users);
  return updated;
}

// LOGOUT
export function logoutUser(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(USER_EMAIL_KEY);
}
