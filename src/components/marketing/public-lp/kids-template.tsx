"use client";

import React from 'react';
import {
  Sparkles,
  Star,
  Heart,
  Smile,
  Palette,
  Rocket,
  ShieldCheck,
  ArrowRight,
  Music,
  Sun,
  Award,
  CheckCircle2,
  Phone,
  Mail,
  Clock,
  BookOpen,
  Maximize2,
  GraduationCap,
  Lightbulb
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EditableText } from "../editable-text";
import { useData } from "@/hooks/use-data";

interface KidsTemplateProps {
  lp: any;
  s: any;
  setShowCard: (show: boolean) => void;
  editable?: boolean;
  onUpdateField?: (field: string, value: any) => void;
}

export function KidsTemplate({ lp, s, setShowCard, editable = false, onUpdateField }: KidsTemplateProps) {
  const { company } = useData();
  const features = lp.features || [
    { title: "Professores Especialistas", text: "Educadores apaixonados com formação lúdica e pedagógica contínua.", icon: GraduationCap, color: "text-emerald-500", border: "border-emerald-200" },
    { title: "Estrutura Completa", text: "Salas temáticas, pisos emborrachados e materiais 100% certificados.", icon: BookOpen, color: "text-cyan-500", border: "border-cyan-200" },
    { title: "Diversão & Alegria", text: "Oficinas de artes, música, teatro e contação de histórias todos os dias.", icon: Smile, color: "text-orange-500", border: "border-orange-200" },
    { title: "100% Amor & Cuidado", text: "Acompanhamento socioemocional e nutrição saudável balanceada.", icon: Lightbulb, color: "text-amber-500", border: "border-amber-200" }
  ];
  const stats = lp.stats || [
    { value: "+1.500", label: "Crianças Atendidas" },
    { value: "5.0 ★", label: "Avaliação dos Pais" },
    { value: "100%", label: "Ambiente Seguro" },
    { value: "12 Anos", label: "De Experiência" }
  ];
  const spacingScale = lp.spacing || 1;
  const heroImage = lp.heroImage || "https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?auto=format&fit=crop&w=1000&q=80";

  return (
    <div className="w-full min-h-screen flex flex-col bg-white text-zinc-800 font-sans selection:bg-amber-400 selection:text-indigo-950 relative overflow-x-hidden">
      {/* Top Header Contact Bar */}
      <header className="border-b border-zinc-100 py-2.5 px-6 bg-zinc-50/80 text-xs font-semibold text-zinc-600">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-6">
            <span className="flex items-center gap-1.5 text-zinc-700">
              <Phone className="w-3.5 h-3.5 text-cyan-500" />
              <span>(11) 98765-4321</span>
            </span>
            <span className="hidden sm:flex items-center gap-1.5 text-zinc-700">
              <Mail className="w-3.5 h-3.5 text-orange-500" />
              <span>contato@escola.com.br</span>
            </span>
            <span className="hidden md:flex items-center gap-1.5 text-zinc-700">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>Seg - Sex: 07h às 19h</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-amber-600 font-bold">Matrículas 2026 Abertas</span>
            <div className="h-3 w-px bg-zinc-300" />
            <span className="text-xs text-zinc-500">Unidade Jardins & Moema</span>
          </div>
        </div>
      </header>

      {/* Main Navigation Bar */}
      <nav className="px-6 py-4 bg-white/95 backdrop-blur sticky top-0 z-40 border-b border-zinc-100 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black tracking-tight font-display text-indigo-950">
              ibble <span className="text-amber-500">school</span>
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-8 text-sm font-bold text-zinc-700">
            <a href="#hero" className="text-amber-500 hover:text-amber-600 transition-colors">Início</a>
            <a href="#sobre" className="hover:text-amber-500 transition-colors">Sobre Nós</a>
            <a href="#atividades" className="hover:text-amber-500 transition-colors">Atividades</a>
            <a href="#diferenciais" className="hover:text-amber-500 transition-colors">Diferenciais</a>
            <a href="#contato" className="hover:text-amber-500 transition-colors">Contato</a>
          </div>

          <button
            onClick={() => setShowCard(true)}
            className="px-6 py-2.5 rounded-full bg-amber-400 hover:bg-amber-300 text-indigo-950 font-black text-xs sm:text-sm shadow-md transition-all hover:scale-105 cursor-pointer"
          >
            AGENDAR VISITA
          </button>
        </div>
      </nav>

      {/* Hero Section (Ibble School Style) */}
      <section 
        id="hero"
        className="relative px-6 z-10 max-w-7xl mx-auto w-full"
        style={{ 
          paddingTop: `${spacingScale * 3.5}rem`, 
          paddingBottom: `${spacingScale * 4}rem` 
        }}
      >
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Text Content */}
          <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-black text-xs shadow-xs">
              <Sparkles className="h-4 w-4 text-amber-600" />
              <EditableText 
                editable={editable}
                value={lp.badgeText || "🎈 A MELHOR ESCOLA & RECREAÇÃO INFANTIL"}
                onChange={(v) => onUpdateField?.('badgeText', v)}
              />
            </div>

            <div className="space-y-1">
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-indigo-950 leading-[1.1] tracking-tight font-display">
                <EditableText 
                  editable={editable}
                  value={lp.title || "The Best school"}
                  onChange={(v) => onUpdateField?.('title', v)}
                />
              </h1>
              <div className="text-3xl sm:text-5xl lg:text-6xl font-black text-amber-500 font-display">
                for your kid
              </div>
            </div>

            <p className="text-base sm:text-lg text-zinc-600 font-medium max-w-xl leading-relaxed">
              <EditableText 
                editable={editable}
                value={lp.subtitle || "Desenvolvimento cognitivo e afetivo com atividades lúdicas, oficinas artísticas e muito carinho em cada detalhe."}
                onChange={(v) => onUpdateField?.('subtitle', v)}
              />
            </p>

            {/* Differential Bullets with Colored Dots */}
            <ul className="space-y-2.5 text-sm sm:text-base font-semibold text-zinc-700 text-left max-w-lg mx-auto lg:mx-0">
              {[
                { dot: "bg-amber-400", text: "Metodologia lúdica aprovada por pedagogos" },
                { dot: "bg-cyan-500", text: "Ambiente climatizado, seguro e monitorado 24h" },
                { dot: "bg-emerald-500", text: "Oficinas criativas de música, artes e teatro" },
                { dot: "bg-rose-400", text: "Socialização e acolhimento socioemocional" },
              ].map((b, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className={`w-3 h-3 rounded-full ${b.dot} shadow-xs shrink-0`} />
                  <span>{b.text}</span>
                </li>
              ))}
            </ul>

            {/* Double Action Buttons */}
            <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-4">
              <button
                onClick={() => setShowCard(true)}
                className="px-8 py-4 rounded-full bg-cyan-500 hover:bg-cyan-400 text-white font-black text-base shadow-lg shadow-cyan-500/25 hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
              >
                <span>{lp.ctaButtonText || "MATRICULAR MEU FILHO"}</span>
                <ArrowRight className="h-5 w-5" />
              </button>

              <button
                onClick={() => setShowCard(true)}
                className="px-8 py-4 rounded-full bg-amber-400 hover:bg-amber-300 text-indigo-950 font-black text-base shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                <span>CONHECER ESPAÇO</span>
              </button>
            </div>
          </div>

          {/* Right Column: Organic Curved Yellow Shape + Happy Kids + Doodles */}
          <div className="lg:col-span-6 relative flex items-center justify-center">
            {/* Organic Yellow Shape Backdrop */}
            <div className="absolute inset-0 bg-gradient-to-tr from-amber-400 via-amber-300 to-yellow-400 rounded-[3.5rem] lg:rounded-[5rem] transform -rotate-3 scale-95 shadow-xl" />

            {/* Playful Stickers & Doodles */}
            <div className="absolute top-4 left-4 z-20 px-3.5 py-1.5 bg-white rounded-2xl text-indigo-950 font-black text-xs shadow-md rotate-[-8deg] border border-amber-200">
              ABC 123 ✏️
            </div>
            <div className="absolute top-6 right-6 z-20 px-3.5 py-1.5 bg-yellow-100 rounded-full text-amber-900 font-black text-xs shadow-md rotate-[12deg] border border-amber-300 flex items-center gap-1">
              ⭐ 5.0 Estrelas
            </div>
            <div className="absolute bottom-6 left-6 z-20 px-4 py-2 bg-indigo-950 text-white rounded-2xl font-bold text-xs shadow-xl flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Turmas Limitadas</span>
            </div>

            {/* Hero Photo */}
            <div className="relative z-10 p-3 sm:p-5 w-full flex items-center justify-center">
              <img
                src={heroImage}
                alt="Crianças Felizes na Escola"
                className="rounded-3xl max-h-[500px] w-full object-cover shadow-2xl border-4 border-white"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 4 Feature Cards Ribbon (Matching image 1) */}
      <section id="diferenciais" className="px-6 py-10 bg-zinc-50 border-y border-zinc-100">
        <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feat: any, idx: number) => {
            const IconComp = feat.icon || Sparkles;
            return (
              <div 
                key={idx}
                className="bg-white p-6 sm:p-8 rounded-3xl border border-zinc-200 shadow-sm hover:shadow-lg transition-all text-center space-y-3 group hover:-translate-y-1"
              >
                <div className={`w-14 h-14 mx-auto rounded-2xl bg-zinc-50 border flex items-center justify-center ${feat.border} group-hover:scale-110 transition-transform`}>
                  <IconComp className={`w-7 h-7 ${feat.color}`} />
                </div>
                <h3 className="text-base sm:text-lg font-black text-zinc-900 leading-snug">{feat.title}</h3>
                <p className="text-xs sm:text-sm text-zinc-500 font-medium leading-relaxed">{feat.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Welcome / About Section (Matching Image 1 bottom) */}
      <section id="sobre" className="px-6 py-16 max-w-7xl mx-auto w-full">
        <div className="grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6 space-y-5 text-center lg:text-left">
            <div className="text-cyan-600 font-black text-xs uppercase tracking-wider">
              Childcare Kindergarten
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-indigo-950 font-display leading-tight">
              Welcome To Ibble School
            </h2>
            <p className="text-zinc-600 text-sm sm:text-base leading-relaxed">
              Aqui, cada criança é ouvida, acolhida e incentivada a explorar seu potencial máximo através de brincadeiras estruturadas, arte e convivência harmoniosa.
            </p>
            <p className="text-zinc-500 text-xs sm:text-sm leading-relaxed">
              Nossa equipe multidisciplinar acompanha a evolução individual, garantindo estímulo adequado para cada fase do desenvolvimento infantil.
            </p>
            <button
              onClick={() => setShowCard(true)}
              className="px-8 py-3.5 rounded-full bg-cyan-500 hover:bg-cyan-400 text-white font-black text-sm shadow-md transition-all hover:scale-105 cursor-pointer"
            >
              CONHECER PROPOSTA
            </button>
          </div>

          <div className="lg:col-span-6 relative flex items-center justify-center">
            {/* Oval/Egg-shaped organic mask image */}
            <div className="relative rounded-[4rem] overflow-hidden border-4 border-amber-300 shadow-2xl max-w-md w-full">
              <img
                src="https://images.unsplash.com/photo-1587654780291-39c9404d746b?auto=format&fit=crop&w=800&q=80"
                alt="Professora com crianças"
                className="w-full h-80 object-cover"
              />
              <div className="absolute top-4 right-4 bg-white/90 p-2 rounded-full shadow-md text-zinc-800">
                <Maximize2 className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Ribbon */}
      <section className="px-6 py-10 bg-amber-400 text-indigo-950">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {stats.map((stat: any, idx: number) => (
            <div key={idx} className="space-y-1 bg-white/30 backdrop-blur rounded-2xl p-5 border border-white/40 shadow-xs">
              <div className="text-3xl sm:text-5xl font-black tracking-tight">{stat.value}</div>
              <div className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-indigo-900">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Playful Bottom CTA Banner */}
      <section id="contato" className="px-6 py-16 max-w-5xl mx-auto w-full">
        <div className="rounded-[2.5rem] bg-gradient-to-r from-amber-400 via-orange-400 to-pink-500 p-8 sm:p-12 text-white text-center shadow-2xl relative overflow-hidden border-4 border-white">
          <div className="relative z-10 space-y-6 max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-4xl font-black font-display">
              Venha Conhecer de Perto o Nosso Espaço!
            </h2>
            <p className="text-white/90 text-sm sm:text-base font-medium">
              Agende agora uma aula experimental gratuita para o seu pequeno se divertir e fazer novos amigos!
            </p>
            <button
              onClick={() => setShowCard(true)}
              className="px-8 py-4 rounded-full bg-white hover:bg-yellow-50 text-indigo-950 font-black text-base shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <Sparkles className="h-5 w-5 text-amber-500" />
              <span>QUERO UMA EXPERIÊNCIA GRATUITA</span>
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 text-center text-xs font-bold text-zinc-400 border-t border-zinc-200">
        <EditableText 
          editable={editable}
          value={lp.footerText || `© ${new Date().getFullYear()} ${company?.name || 'Ibble School'} — A MELHOR ESCOLA PARA O SEU FILHO`}
          onChange={(v) => onUpdateField?.('footerText', v)}
        />
      </footer>
    </div>
  );
}
