"use client";

import React, { useState, useRef } from "react";
import { Sparkles, ShieldCheck, ArrowRight, Mail, Lock, Loader2, User, Phone, Camera, Shield, Link as LinkIcon, Upload, Eye, EyeOff, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { cn, formatPhone } from "@/lib/utils";
import { BrandLogo } from "@/components/brand-logo";
import { authenticateUser, registerNewUser } from "@/lib/auth-service";

const ROLES = [
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

export function LoginForm() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [photoMode, setPhotoMode] = useState<'upload' | 'link'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [role, setRole] = useState("SDR"); 
  const [avatarUrl, setAvatarUrl] = useState("");
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setAvatarUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setPendingMessage(null);

    try {
      if (isRegistering) {
        const userEmail = email.trim();
        const userName = name.trim();

        if (!userName) {
          throw new Error("Informe seu nome completo para o cadastro.");
        }
        if (!userEmail) {
          throw new Error("Informe seu e-mail corporativo para o cadastro.");
        }

        const res = await registerNewUser({
          name: userName,
          email: userEmail,
          password: password || "admin",
          role,
          contact,
          avatarUrl
        });

        if (res.isPending) {
          setPendingMessage("Cadastro realizado com sucesso! Sua conta está aguardando autorização do Administrador para liberação do acesso.");
          toast.info("Aguardando Aprovação do Administrador", {
            description: "O administrador do sistema precisa aprovar seu cadastro na aba Usuários."
          });
          setIsRegistering(false);
          setPassword("");
        } else {
          toast.success("Acesso Liberado!", { description: `Bem-vindo, ${res.user.name}!` });
          setTimeout(() => { window.location.href = "/app/dashboard"; }, 400);
        }
        return;
      }

      // Modo Login (aceita Nome de Usuário ou E-mail)
      const identifier = email.trim() || "Tiago Rezeck";
      const pass = password || "admin";

      const user = await authenticateUser(identifier, pass);
      toast.success("Login realizado com sucesso!", { description: `Bem-vindo de volta, ${user.name}!` });
      setTimeout(() => {
        window.location.href = "/app/dashboard";
      }, 350);

    } catch (error: any) {
      if (error.message?.includes("aguardando autorização")) {
        setPendingMessage(error.message);
      }
      toast.error(error.message || "Erro na autenticação.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-8 animate-in fade-in duration-500">
      {/* Mobile Branding Header */}
      <div className="flex lg:hidden justify-center pb-2">
        <BrandLogo size="lg" textClassName="text-white text-xl" subtextClassName="text-white/40" />
      </div>

      <div className="text-center space-y-2">
        <h2 className="font-display text-3xl font-black uppercase tracking-tight text-zinc-900 dark:text-white">
          {isRegistering ? "Criar Perfil" : "Entrar no Sistema"}
        </h2>
        <p className="text-sm text-zinc-500 dark:text-muted-foreground">
          {isRegistering 
            ? "Preencha seus dados. O acesso será validado pelo Administrador." 
            : "Acesse sua conta corporativa no SALEAD CRM."}
        </p>
      </div>

      {pendingMessage && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs flex items-start gap-3">
          <Clock className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-sm">Aguardando Autorização</div>
            <p className="mt-1 leading-relaxed">{pendingMessage}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleAccess} className="space-y-4">
        {isRegistering && (
          <>
            {/* Foto de Perfil */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative group">
                <div className="h-20 w-20 rounded-2xl bg-muted border-2 border-dashed border-border overflow-hidden flex items-center justify-center">
                  {avatarUrl ? (
                    <img src={avatarUrl} className="w-full h-full object-cover" alt="Preview" />
                  ) : (
                    <Camera className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => photoMode === 'upload' ? fileInputRef.current?.click() : null}
                  className="absolute -bottom-1.5 -right-1.5 h-7 w-7 rounded-lg bg-primary text-white grid place-items-center shadow border-2 border-background cursor-pointer"
                >
                  <Upload className="h-3.5 w-3.5" />
                </button>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
              </div>
              <div className="flex bg-muted p-0.5 rounded-lg border border-border">
                <button
                  type="button"
                  onClick={() => setPhotoMode('upload')}
                  className={cn("px-2.5 py-1 text-[10px] font-black uppercase rounded-md transition-all", photoMode === 'upload' ? "bg-primary text-white" : "text-muted-foreground")}
                >
                  Upload
                </button>
                <button
                  type="button"
                  onClick={() => setPhotoMode('link')}
                  className={cn("px-2.5 py-1 text-[10px] font-black uppercase rounded-md transition-all", photoMode === 'link' ? "bg-primary text-white" : "text-muted-foreground")}
                >
                  Link
                </button>
              </div>
              {photoMode === 'link' && (
                <input
                  placeholder="URL da imagem (https://...)"
                  value={avatarUrl.startsWith('data:') ? '' : avatarUrl}
                  onChange={e => setAvatarUrl(e.target.value)}
                  className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20"
                />
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Nome Completo</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full bg-muted/40 border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">WhatsApp</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    value={contact}
                    onChange={(e) => setContact(formatPhone(e.target.value))}
                    placeholder="(00) 00000-0000"
                    className="w-full bg-muted/40 border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Cargo / Função</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-muted/40 border border-border rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
          </>
        )}

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            {isRegistering ? "E-mail Corporativo" : "Nome de Usuário ou E-mail"}
          </label>
          <div className="relative">
            {isRegistering ? (
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            ) : (
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            )}
            <input
              type={isRegistering ? "email" : "text"}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={isRegistering ? "seu.email@empresa.com" : "Tiago Rezeck ou tiagorezeck@hotmail.com"}
              className="w-full bg-muted/40 border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {!isRegistering && (
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs">
              <div className="min-w-0 pr-2">
                <div className="font-bold text-foreground flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>Admin do Sistema</span>
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                  Usuário: <strong>Tiago Rezeck</strong> • Senha: <strong>admin</strong>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEmail("Tiago Rezeck");
                  setPassword("admin");
                }}
                className="px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-[11px] font-bold hover:bg-primary/90 transition-all cursor-pointer shrink-0 shadow-sm"
              >
                Preencher
              </button>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-500/10 border border-zinc-500/20 text-xs">
              <div className="min-w-0 pr-2">
                <div className="font-bold text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-400 shrink-0" />
                  <span>Admin Standby (Emergência)</span>
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                  Usuário: <strong>ADMIN</strong> • Senha: <strong>ADMIN</strong>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEmail("ADMIN");
                  setPassword("ADMIN");
                }}
                className="px-2 py-1 rounded-lg bg-muted border border-border text-foreground text-[11px] font-bold hover:bg-muted/80 transition-all cursor-pointer shrink-0 shadow-sm"
              >
                Preencher
              </button>
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Senha de Acesso</label>
            {!isRegistering && (
              <span 
                onClick={() => {
                  setEmail("tiagorezeck@hotmail.com");
                  setPassword("admin");
                }}
                className="text-[11px] text-primary/80 hover:text-primary cursor-pointer"
              >
                Usar senha padrão (admin)
              </span>
            )}
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-muted/40 border border-border rounded-xl pl-10 pr-10 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-xl bg-gradient-primary text-primary-foreground font-black text-xs uppercase tracking-widest shadow-elegant flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              {isRegistering ? "SOLICITAR CADASTRO" : "ACESSAR O SISTEMA"}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <div className="text-center pt-2">
        <button
          type="button"
          onClick={() => {
            setIsRegistering(!isRegistering);
            setPendingMessage(null);
          }}
          className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors cursor-pointer"
        >
          {isRegistering ? "Já possui conta? Clique para entrar" : "Não tem conta? Cadastre-se aqui"}
        </button>
      </div>
    </div>
  );
}
