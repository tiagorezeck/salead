"use client";

import React from 'react';
import { CheckCircle2, Play, Users, Star, ArrowRight, ShieldCheck, Trophy, Zap, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { EditableText } from "../editable-text";
import { useData } from "@/hooks/use-data";
import { type LPBrand } from "@/data/mock";

interface CorporateTemplateProps {
  lp: any;
  s: any;
  setShowCard: (show: boolean) => void;
  editable?: boolean;
  onUpdateField?: (field: string, value: any) => void;
}

const STUDENT_AVATARS = [
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=100&q=80"
];

export function CorporateTemplate({ lp, s, setShowCard, editable = false, onUpdateField }: CorporateTemplateProps) {
  const { company } = useData();
  const features = lp.features || [];
  const trustItems = lp.trustItems || [];
  const brands = lp.brands || [];
  const spacingScale = lp.spacing || 1;
  const logoStyle = lp.logoStyle || 'template';
  const logoSize = lp.logoSize || 1;
  const primaryColor = lp.primaryColor || "#f97316";

  return (
    <div className="w-full bg-[#050508] text-white selection:bg-primary selection:text-white font-sans">
      {/* Hero Section */}
      <section 
        className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden"
        style={{ 
          paddingTop: `${spacingScale * 5}rem`, 
          paddingBottom: `${spacingScale * 8}rem` 
        }}
      >
        {/* Subtle executive background light */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_50%_30%,rgba(139,92,246,0.08),transparent_70%)] pointer-events-none" />
        
        <div 
          className={cn(
            "max-w-7xl mx-auto w-full grid lg:grid-cols-12 gap-16 items-center relative z-10",
            lp.layout === 'reverse' ? "flex-row-reverse" : ""
          )}
        >
          <div 
            className={cn(
              "lg:col-span-7 space-y-10 animate-in fade-in slide-in-from-left duration-1000",
              lp.layout === 'reverse' ? "lg:order-2" : "lg:order-1"
            )}
          >
            <div style={{ gap: `${spacingScale * 1.25}rem`, display: 'flex', flexDirection: 'column' }}>
              <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md self-start">
                <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
                <EditableText 
                  editable={editable}
                  value={lp.badgeText || "FORMAÇÃO EXECUTIVA EM ALTA PERFORMANCE"}
                  onChange={(v) => onUpdateField?.('badgeText', v)}
                  className="text-[10px] font-black uppercase tracking-[0.25em] text-white/70"
                />
              </div>
              <EditableText 
                editable={editable}
                value={lp.headline || "Domine a Operação que Gera Resultados Previsíveis."}
                onChange={(v) => onUpdateField?.('headline', v)}
                className="font-display font-black leading-[1.05] tracking-tight uppercase"
                style={{ 
                  fontSize: `${(lp.headlineSize || 1) * 4.5}rem`,
                  color: lp.headlineColor || "#ffffff"
                }}
                multiline
              />
              <EditableText 
                editable={editable}
                value={lp.description || "A metodologia definitiva para gestores e profissionais que buscam previsibilidade, escala real e o controle total do funil comercial de ponta a ponta."}
                onChange={(v) => onUpdateField?.('description', v)}
                className="leading-relaxed max-w-2xl text-lg text-white/60 font-medium"
                style={{ 
                  fontSize: `${(lp.descriptionSize || 1) * 1.25}rem`,
                  color: lp.descriptionColor || "rgba(255,255,255,0.6)"
                }}
                multiline
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6">
              <button 
                onClick={() => setShowCard(true)}
                className={cn("group w-full sm:w-auto px-12 py-6 rounded-xl text-sm font-black uppercase tracking-widest shadow-[0_20px_50px_-15px_rgba(var(--primary),0.4)] transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3", s.button)}
                style={{ backgroundColor: primaryColor }}
              >
                <EditableText 
                  editable={editable}
                  value={lp.ctaText || "QUERO MINHA VAGA AGORA"}
                  onChange={(v) => onUpdateField?.('ctaText', v)}
                />
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </button>
              <div className="flex items-center gap-4 px-5 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors duration-500">
                <div className="flex -space-x-3">
                  {STUDENT_AVATARS.map((url, i) => (
                    <div key={i} className="h-8 w-8 rounded-full border-2 border-[#050508] overflow-hidden bg-muted shadow-lg">
                      <img src={url} alt="User" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
                <EditableText 
                  editable={editable}
                  value={lp.studentsText || "+2.400 PROFISSIONAIS FORMADOS"}
                  onChange={(v) => onUpdateField?.('studentsText', v)}
                  className="text-[10px] font-black text-white/50 uppercase tracking-widest"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 pt-6 border-t border-white/5">
              {trustItems.map((item: any, i: number) => (
                <div key={item.id} className="flex items-center gap-3 group">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center transition-transform group-hover:scale-110" style={{ color: primaryColor }}>
                    {i === 0 ? <ShieldCheck className="h-4 w-4" /> : i === 1 ? <Trophy className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
                  </div>
                  <EditableText 
                    editable={editable}
                    value={item.label}
                    onChange={(v) => {
                      const next = [...trustItems];
                      next[i].label = v;
                      onUpdateField?.('trustItems', next);
                    }}
                    className="text-[10px] font-black uppercase tracking-widest text-white/40 group-hover:text-white/70 transition-colors"
                  />
                </div>
              ))}
            </div>
          </div>

          <div 
            className={cn(
              "lg:col-span-5 relative animate-in fade-in slide-in-from-right duration-1000",
              lp.layout === 'reverse' ? "lg:order-1" : "lg:order-2"
            )}
          >
            <div 
              className="relative group mx-auto"
              style={{ maxWidth: `${(lp.imageWidth || 1) * 100}%` }}
            >
              <div className="relative rounded-[2.5rem] border border-white/10 bg-[#121214] p-3 shadow-3xl overflow-hidden transition-transform duration-700 hover:scale-[1.02]">
                <div className="aspect-[3/4.5] rounded-[2rem] overflow-hidden relative">
                  {lp.videoUrl ? (
                    <video className="w-full h-full object-cover" poster={lp.imageUrl} controls>
                      <source src={lp.videoUrl} type="video/mp4" />
                    </video>
                  ) : (
                    <img 
                      src={lp.imageUrl} 
                      className="w-full h-full object-cover opacity-80 transition-transform duration-1000 group-hover:scale-105" 
                      alt="Corporate Preview" 
                      style={{ 
                        transform: `scale(${lp.imageZoom || 1})`,
                        objectPosition: `${lp.imagePosX || 50}% ${lp.imagePosY || 50}%`
                      }}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
                  {!lp.videoUrl && (
                    <button className="absolute inset-0 m-auto h-20 w-20 rounded-full bg-primary/90 text-white flex items-center justify-center shadow-2xl hover:scale-110 transition-all duration-500 backdrop-blur-sm border-2 border-white/20">
                      <Play className="h-8 w-8 fill-current ml-1" />
                    </button>
                  )}
                </div>
              </div>
              
              {/* Performance Indicator Card */}
              <div className="absolute -bottom-8 -left-8 bg-white p-5 rounded-[2rem] shadow-3xl hidden md:block animate-bounce-slow border border-white/20">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-success/10 text-success flex items-center justify-center">
                    <Star className="h-6 w-6 fill-current" />
                  </div>
                  <div>
                    <EditableText 
                      editable={editable}
                      value={lp.ratingLabel || "NÍVEL DE SATISFAÇÃO"}
                      onChange={(v) => onUpdateField?.('ratingLabel', v)}
                      className="text-[9px] font-black text-black/30 uppercase tracking-widest"
                    />
                    <EditableText 
                      editable={editable}
                      value={lp.ratingValue || "4.9 de 5.0"}
                      onChange={(v) => onUpdateField?.('ratingValue', v)}
                      className="text-xl font-black text-black"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Grid */}
      <section className="py-24 border-y border-white/5 bg-white/[0.01]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <EditableText 
              editable={editable}
              value={lp.brandsTitle || "Empresas e executivos que utilizam nossa metodologia"}
              onChange={(v) => onUpdateField?.('brandsTitle', v)}
              className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20"
            />
          </div>
          <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24">
            {brands.map((brand: LPBrand) => (
              <div key={brand.id} className="h-10 md:h-14 w-auto flex items-center justify-center transform transition-all duration-500 hover:scale-110 hover:brightness-200">
                {brand.logoUrl ? (
                  <img 
                    src={brand.logoUrl} 
                    alt="Brand" 
                    className={cn(
                      "h-full object-contain transition-all",
                      brand.style === 'template' ? "opacity-20 grayscale brightness-0 invert" : "opacity-100"
                    )} 
                  />
                ) : (
                  <div className="h-full aspect-video bg-white/5 rounded-xl border border-white/10 flex items-center justify-center">
                    <ImageIcon className="h-5 w-5 text-white/10" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features / Modules with coordinated animations */}
      <section className="py-40 px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-24 space-y-6">
          <EditableText 
            editable={editable}
            value={lp.featuresTitle || "O QUE VOCÊ VAI DOMINAR"}
            onChange={(v) => onUpdateField?.('featuresTitle', v)}
            className="font-display text-4xl md:text-6xl font-black uppercase tracking-tight"
          />
          <div className="h-1.5 w-24 bg-primary mx-auto rounded-full" />
          <EditableText 
            editable={editable}
            value={lp.featuresSubtitle || "Um currículo rigoroso desenhado para transformar gestores comuns em líderes de alta performance comercial."}
            onChange={(v) => onUpdateField?.('featuresSubtitle', v)}
            className="text-xl text-white/40 leading-relaxed font-medium"
            multiline
          />
        </div>

        <div className="grid md:grid-cols-3 gap-10">
          {features.map((f: any, i: number) => (
            <div key={f.id} className="group p-10 rounded-[3rem] bg-white/[0.02] border border-white/5 hover:border-primary/40 hover:bg-white/[0.04] transition-all duration-700">
              <div className="h-16 w-16 rounded-[1.5rem] bg-primary/10 text-primary flex items-center justify-center mb-8 group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-xl" style={{ backgroundColor: `${primaryColor}22`, color: primaryColor }}>
                <span className="font-display font-black text-2xl">0{i + 1}</span>
              </div>
              <EditableText 
                editable={editable}
                value={f.title}
                onChange={(v) => {
                  const next = [...features];
                  next[i].title = v;
                  onUpdateField?.('features', next);
                }}
                className="font-display text-2xl font-bold mb-5 uppercase tracking-tight"
              />
              <EditableText 
                editable={editable}
                value={f.desc}
                onChange={(v) => {
                  const next = [...features];
                  next[i].desc = v;
                  onUpdateField?.('features', next);
                }}
                className="text-white/40 leading-relaxed font-medium"
                multiline
              />
            </div>
          ))}
        </div>
      </section>

      {/* High-Impact Final CTA */}
      <section className="py-40 px-6">
        <div className="max-w-6xl mx-auto rounded-[4rem] bg-gradient-to-br from-white/[0.05] to-transparent border border-white/10 p-16 md:p-28 text-center relative overflow-hidden group">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(var(--primary),0.15),transparent_70%)] pointer-events-none" />
          <div className="relative z-10 space-y-12">
            <div className="space-y-6">
                <EditableText 
                editable={editable}
                value={lp.finalCtaTitle || "ESTÁ PRONTO PARA LIDERAR O MERCADO?"}
                onChange={(v) => onUpdateField?.('finalCtaTitle', v)}
                className="font-display text-5xl md:text-8xl font-black uppercase leading-[0.95] tracking-tighter"
                multiline
                />
                <EditableText 
                editable={editable}
                value={lp.finalCtaSubtitle || "As vagas são estritamente limitadas para garantir a qualidade do acompanhamento executivo individual."}
                onChange={(v) => onUpdateField?.('finalCtaSubtitle', v)}
                className="text-xl text-white/50 max-w-3xl mx-auto font-medium"
                multiline
                />
            </div>
            <button 
              onClick={() => setShowCard(true)}
              className={cn("group px-14 py-7 rounded-2xl text-sm font-black uppercase tracking-[0.2em] shadow-3xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-4 mx-auto", s.button)}
              style={{ backgroundColor: primaryColor }}
            >
              <EditableText 
                editable={editable}
                value={lp.finalCtaButtonText || "GARANTIR MINHA VAGA COM CONDIÇÃO EXCLUSIVA"}
                onChange={(v) => onUpdateField?.('finalCtaButtonText', v)}
              />
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
          
          {/* Subtle decoration elements */}
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-primary/10 blur-3xl rounded-full" />
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-blue-500/10 blur-3xl rounded-full" />
        </div>
      </section>

      {/* Footer */}
      <footer className="py-24 px-6 border-t border-white/5 flex flex-col items-center gap-10">
        {company?.logo && (
          <img 
            src={company.logo} 
            alt={company.name} 
            style={{ height: `${logoSize * 3}rem` }}
            className={cn(
              "object-contain transition-all duration-700",
              logoStyle === 'template' ? "opacity-20 grayscale hover:opacity-80" : "opacity-100"
            )} 
          />
        )}
        <div className="flex flex-col items-center gap-5">
            <EditableText 
            editable={editable}
            value={lp.footerText || `© ${new Date().getFullYear()} ${company?.name || 'SALEAD'} — PERFORMANCE COMERCIAL DE ELITE`}
            onChange={(v) => onUpdateField?.('footerText', v)}
            className="text-[10px] font-black uppercase tracking-[0.5em] opacity-20 text-white text-center"
            />
            <div className="flex items-center gap-8">
                <div className="h-px w-12 bg-white/10" />
                <Star className="h-4 w-4 text-white/10" />
                <div className="h-px w-12 bg-white/10" />
            </div>
        </div>
      </footer>
    </div>
  );
}