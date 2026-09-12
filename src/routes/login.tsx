import React, { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, Sun, Moon } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { BrandLogo } from "@/components/brand-logo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [isClient, setIsClient] = useState(false);
  const [loginTheme, setLoginTheme] = useState<"dark" | "light">(() => {
    if (typeof window === "undefined") return "dark";
    const stored = localStorage.getItem("comet_theme");
    return stored === "light" ? "light" : "dark";
  });

  useEffect(() => {
    setIsClient(true);
    const local = localStorage.getItem("comet_local_session");
    if (local) {
      navigate({ to: "/app/dashboard" });
      return;
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate({ to: "/app/dashboard" });
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate({ to: "/app/dashboard" });
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (loginTheme === "dark") {
      document.documentElement.classList.add("dark");
      localStorage.setItem("comet_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("comet_theme", "light");
    }
  }, [loginTheme]);

  const toggleLoginTheme = () => {
    setLoginTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  if (!isClient) return null;

  const isDark = loginTheme === "dark";

  return (
    <div className={cn("min-h-screen grid lg:grid-cols-2 relative transition-colors duration-300", isDark ? "bg-[#050508] text-white" : "bg-zinc-50 text-zinc-900")}>
      {/* Botão de Alternar Modo Claro / Escuro na tela de login */}
      <div className="absolute top-5 right-5 z-50">
        <button
          type="button"
          onClick={toggleLoginTheme}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border shadow-sm transition-all cursor-pointer backdrop-blur-md",
            isDark 
              ? "bg-white/10 hover:bg-white/15 text-white border-white/15" 
              : "bg-white hover:bg-zinc-100 text-zinc-800 border-zinc-200"
          )}
          title={`Alternar para modo ${isDark ? "claro" : "escuro"}`}
        >
          {isDark ? (
            <>
              <Sun className="h-3.5 w-3.5 text-amber-400" />
              <span>Modo Claro</span>
            </>
          ) : (
            <>
              <Moon className="h-3.5 w-3.5 text-primary" />
              <span>Modo Escuro</span>
            </>
          )}
        </button>
      </div>

      {/* Lado Esquerdo: Branding */}
      <div className={cn(
        "relative hidden lg:flex flex-col justify-between p-12 overflow-hidden border-r transition-colors duration-300",
        isDark ? "bg-[#0a0a0c] border-white/5" : "bg-white border-zinc-200"
      )}>
        <div className={cn(
          "absolute top-0 left-0 w-full h-full pointer-events-none",
          isDark 
            ? "bg-[radial-gradient(circle_at_20%_20%,rgba(249,115,22,0.15),transparent_50%)]"
            : "bg-[radial-gradient(circle_at_20%_20%,rgba(249,115,22,0.08),transparent_50%)]"
        )} />
        
        <div className="relative flex items-center gap-3">
          <BrandLogo 
            size="lg" 
            theme={loginTheme} 
            allowCustomize={false}
          />
        </div>

        <div className="relative space-y-6 max-w-sm">
          <h2 className={cn(
            "font-display text-5xl font-black leading-[0.95] tracking-tighter uppercase",
            isDark ? "text-white" : "text-zinc-900"
          )}>
            Potencialize sua <span className="text-primary">máquina de crescimento comercial.</span>
          </h2>
          <div className={cn(
            "flex items-start gap-4 p-5 rounded-3xl border backdrop-blur-md transition-colors",
            isDark ? "bg-white/5 border-white/10" : "bg-zinc-50 border-zinc-200 shadow-sm"
          )}>
            <ShieldCheck className="h-6 w-6 text-primary shrink-0" />
            <div>
              <div className={cn("text-sm font-bold", isDark ? "text-white" : "text-zinc-900")}>Segurança Enterprise</div>
              <div className={cn("text-xs leading-relaxed", isDark ? "text-white/50" : "text-zinc-500")}>
                Seus dados e de seus clientes protegidos com criptografia de ponta a ponta.
              </div>
            </div>
          </div>
        </div>

        <div className={cn(
          "relative text-[10px] font-bold uppercase tracking-[0.4em]",
          isDark ? "text-white/30" : "text-zinc-400"
        )}>
          © {new Date().getFullYear()} SALEAD — PROSPECÇÃO E VENDAS
        </div>
      </div>

      {/* Lado Direito: Formulário */}
      <div className="flex items-center justify-center p-6 sm:p-12 relative">
        <div className={cn(
          "absolute inset-0 lg:hidden pointer-events-none",
          isDark 
            ? "bg-[radial-gradient(circle_at_50%_0%,rgba(249,115,22,0.1),transparent_70%)]" 
            : "bg-[radial-gradient(circle_at_50%_0%,rgba(249,115,22,0.05),transparent_70%)]"
        )} />
        <LoginForm />
      </div>
    </div>
  );
}