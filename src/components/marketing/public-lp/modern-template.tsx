"use client";

import React from 'react';
import { MousePointer2, ShieldCheck, Zap, Star, ArrowRight, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { EditableText } from "../editable-text";
import { useData } from "@/hooks/use-data";

interface ModernTemplateProps {
  lp: any;
  s: any;
  setShowCard: (show: boolean) => void;
  editable?: boolean;
  onUpdateField?: (field: string, value: any) => void;
}

export function ModernTemplate({ lp, s, setShowCard, editable = false, onUpdateField }: ModernTemplateProps) {
  const { company } = useData();
  const features = lp.features || [];
  const stats = lp.stats || [];
  const spacingScale = lp.spacing || 1;
  const primaryColor = lp.primaryColor || "#f97316";
  const headlineColor = lp.headlineColor || "#ffffff";
  const descriptionColor = lp.descriptionColor || "#a1a1aa";
  const logoStyle = lp.logoStyle || 'template';
  const logoSize = lp.logoSize || 1;

  return (
    <div className="w-full min-h-screen flex flex-col selection:bg-primary selection:text-white">
      {/* Hero Section */}
      <section 
        className="relative px-6 overflow-hidden flex flex-col items-center"
        style={{ 
          paddingTop: `${spacingScale * 6}rem`, 
          paddingBottom: `${spacingScale * 6}rem` 
        }}
      >
        {/* Animated Background Orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 blur-[120px] rounded-full animate-pulse-slow" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 blur-[120px] rounded-full animate-pulse-slow delay-700" />

        <div 
          className={cn(
            "max-w-7xl mx-auto text-center relative z-10 flex flex-col items-center",
            lp.layout === 'reverse' ? "flex-col-reverse" : "flex-col"
          )}
          style={{ gap: `${spacingScale * 2.5}rem` }}
        >
          {/* Trust Badge with staggered animation */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm animate-in fade-in slide-in-from-top-4 duration-1000">
            <div className="flex -space-x-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-6 w-6 rounded-full border-2 border-[#050508] shadow-lg overflow-hidden" style={{ backgroundColor: primaryColor }}>
                    <div className="w-full h-full bg-black/20" />
                </div>
              ))}
            </div>
            <EditableText 
              editable={editable}
              value={lp.badgeText || "CONFIADO POR MAIS DE 500 EMPRESAS"}
              onChange={(v) => onUpdateField?.('badgeText', v)}
              className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70"
            />
          </div>

          <div className="max-w-4xl mx-auto space-y-8">
            <EditableText 
              editable={editable}
              value={lp.headline}
              onChange={(v) => onUpdateField?.('headline', v)}
              className="font-display font-black leading-[1.1] tracking-tight animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-200"
              style={{ 
                fontSize: `${(lp.headlineSize || 1) * 4.5}rem`,
                color: headlineColor
              }}
              multiline
            />
            <EditableText 
              editable={editable}
              value={lp.description}
              onChange={(v) => onUpdateField?.('description', v)}
              className="max-w-2xl mx-auto leading-relaxed text-lg animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-300"
              style={{ 
                fontSize: `${(lp.descriptionSize || 1) * 1.25}rem`,
                color: descriptionColor
              }}
              multiline
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-4 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-500">
            <button 
              onClick={() => setShowCard(true)}
              className={cn("group w-full sm:w-auto px-12 py-6 rounded-2xl text-sm font-black uppercase tracking-widest shadow-[0_20px_50px_-10px_rgba(var(--primary),0.5)] transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3", s.button)}
              style={{ backgroundColor: primaryColor }}
            >
              <EditableText 
                editable={editable}
                value={lp.ctaText || "Começar agora"}
                onChange={(v) => onUpdateField?.('ctaText', v)}
              />
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </button>
            <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-white/40">
              <ShieldCheck className="h-4 w-4 text-success" /> Setup instantâneo sem cartão
            </div>
          </div>

          {/* Floating UI Preview with Hover Effect */}
          <div 
            className="max-w-5xl mx-auto px-6 relative animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-700"
            style={{ width: `${(lp.imageWidth || 1) * 100}%` }}
          >
            <div className="relative group rounded-3xl border border-white/10 bg-[#121214]/50 backdrop-blur-xl p-3 shadow-2xl transition-transform duration-700 hover:-rotate-1">
              <div className="rounded-2xl overflow-hidden aspect-video relative bg-black">
                {lp.videoUrl ? (
                  <video className="w-full h-full object-cover" poster={lp.imageUrl} controls>
                    <source src={lp.videoUrl} type="video/mp4" />
                  </video>
                ) : (
                  <img 
                    src={lp.imageUrl} 
                    className="w-full h-full object-cover opacity-90 transition-transform duration-1000 group-hover:scale-105" 
                    alt="Preview" 
                    style={{ 
                      transform: `scale(${lp.imageZoom || 1})`,
                      objectPosition: `${lp.imagePosX || 50}% ${lp.imagePosY || 50}%`
                    }}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#050508] via-transparent to-transparent pointer-events-none" />
                
                {/* Floating Stats Cards */}
                <div className="absolute bottom-8 left-8 right-8 grid grid-cols-3 gap-4 pointer-events-none">
                  {stats.map((stat: any, i: number) => (
                    <div 
                        key={stat.id} 
                        className={cn(
                            "bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 transform transition-transform duration-500",
                            i === 0 ? "hover:scale-110" : i === 1 ? "translate-y-4 hover:translate-y-0" : "hover:scale-110"
                        )}
                    >
                      <EditableText 
                        editable={editable}
                        value={stat.label}
                        onChange={(v) => {
                          const next = [...stats];
                          next[i].label = v;
                          onUpdateField?.('stats', next);
                        }}
                        className="text-[10px] uppercase font-black text-white/50 tracking-widest mb-1"
                      />
                      <EditableText 
                        editable={editable}
                        value={stat.value}
                        onChange={(v) => {
                          const next = [...stats];
                          next[i].value = v;
                          onUpdateField?.('stats', next);
                        }}
                        className="text-2xl font-black"
                        style={{ color: primaryColor }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Ambient Glow */}
            <div className="absolute -inset-20 blur-[150px] -z-10 opacity-40 transition-opacity duration-700 group-hover:opacity-60" style={{ backgroundColor: `${primaryColor}44` }} />
          </div>
        </div>
      </section>

      {/* Enhanced Features Grid */}
      <section className="py-32 px-6 max-w-7xl mx-auto w-full relative">
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((f: any, i: number) => (
            <div 
                key={f.id} 
                className="group p-10 rounded-[2.5rem] bg-white/[0.03] border border-white/5 hover:border-primary/40 hover:bg-white/[0.05] transition-all duration-500 animate-in fade-in zoom-in-95"
                style={{ animationDelay: `${800 + (i * 150)}ms` }}
            >
              <div className="h-14 w-14 rounded-2xl bg-white/5 flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-primary/10 transition-all duration-500" style={{ color: primaryColor }}>
                {i === 0 ? <Zap className="h-7 w-7" /> : i === 1 ? <Users className="h-7 w-7" /> : <Star className="h-7 w-7" />}
              </div>
              <EditableText 
                editable={editable}
                value={f.title}
                onChange={(v) => {
                  const next = [...features];
                  next[i].title = v;
                  onUpdateField?.('features', next);
                }}
                className="font-display text-2xl font-bold text-white mb-4"
              />
              <EditableText 
                editable={editable}
                value={f.desc}
                onChange={(v) => {
                  const next = [...features];
                  next[i].desc = v;
                  onUpdateField?.('features', next);
                }}
                className="text-white/50 leading-relaxed font-medium"
                multiline
              />
            </div>
          ))}
        </div>
      </section>

      <footer className="py-20 px-6 border-t border-white/5 flex flex-col items-center gap-8 bg-black/20">
        {company?.logo && (
          <img 
            src={company.logo} 
            alt={company.name} 
            style={{ height: `${logoSize * 2.5}rem` }}
            className={cn(
              "object-contain transition-all duration-500",
              logoStyle === 'template' ? "opacity-30 grayscale hover:opacity-100 hover:grayscale-0" : "opacity-100"
            )} 
          />
        )}
        <div className="flex flex-col items-center gap-4">
            <EditableText 
            editable={editable}
            value={lp.footerText || `© ${new Date().getFullYear()} ${company?.name || 'SALEAD'} — PERFORMANCE COMERCIAL PREVISÍVEL`}
            onChange={(v) => onUpdateField?.('footerText', v)}
            className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30 text-white text-center"
            />
            <div className="h-1 w-12 bg-primary/20 rounded-full" />
        </div>
      </footer>
    </div>
  );
}