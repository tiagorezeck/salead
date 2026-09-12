"use client";

import React from 'react';
import { MapPin, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { EditableText } from "../editable-text";
import { useData } from "@/hooks/use-data";

interface GlassTemplateProps {
  lp: any;
  s: any;
  isSurvey: boolean;
  setShowCard: (show: boolean) => void;
  editable?: boolean;
  onUpdateField?: (field: string, value: any) => void;
}

export function GlassTemplate({ lp, s, isSurvey, setShowCard, editable = false, onUpdateField }: GlassTemplateProps) {
  const { company } = useData();
  const spacingScale = lp.spacing || 1;
  const logoStyle = lp.logoStyle || 'template';
  const logoSize = lp.logoSize || 1;
  const primaryColor = lp.primaryColor || "#00e5ff";

  return (
    <div className="w-full flex flex-col min-h-screen overflow-y-auto">
      <div 
        className={cn(
          "w-full max-w-7xl mx-auto px-6 md:px-12 flex flex-col items-center justify-center gap-12 md:gap-20 flex-1",
          lp.layout === 'reverse' ? "md:flex-row-reverse" : "md:flex-row"
        )}
        style={{ 
          paddingTop: `${spacingScale * 4}rem`, 
          paddingBottom: `${spacingScale * 4}rem` 
        }}
      >
        {/* Text Content */}
        <div className="flex-1 w-full max-w-2xl space-y-10 animate-in fade-in slide-in-from-left duration-1000">
          <div style={{ gap: `${spacingScale * 1.5}rem`, display: 'flex', flexDirection: 'column' }}>
            <div className="inline-flex items-center gap-2">
              <div className="h-1 w-8 rounded-full" style={{ backgroundColor: primaryColor }} />
              <EditableText 
                editable={editable}
                value={lp.badgeText || "OFERTA EXCLUSIVA"}
                onChange={(v) => onUpdateField?.('badgeText', v)}
                className="font-black text-[10px] md:text-xs uppercase tracking-[0.3em]"
                style={{ color: primaryColor }}
              />
            </div>
            
            <EditableText 
              editable={editable}
              value={lp.headline}
              onChange={(v) => onUpdateField?.('headline', v)}
              className="font-display font-black leading-[1.1] tracking-tight"
              style={{ 
                fontSize: `${(lp.headlineSize || 1) * 3.5}rem`,
                color: lp.headlineColor || "#ffffff"
              }}
              multiline
            />
            
            <EditableText 
              editable={editable}
              value={lp.description}
              onChange={(v) => onUpdateField?.('description', v)}
              className="leading-relaxed opacity-80"
              style={{ 
                fontSize: `${(lp.descriptionSize || 1) * 1.125}rem`,
                color: lp.descriptionColor || "#ffffff"
              }}
              multiline
            />
          </div>

          <button 
            onClick={() => setShowCard(true)}
            className="group relative px-10 py-5 rounded-2xl text-sm font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.3)]"
            style={{ backgroundColor: primaryColor, color: s.button.includes('text-black') ? '#000000' : '#ffffff' }}
          >
            <div className="relative z-10 flex items-center gap-3">
              <EditableText 
                editable={editable}
                value={lp.ctaText || (isSurvey ? "INICIAR PESQUISA" : "QUERO MEU ACESSO AGORA")}
                onChange={(v) => onUpdateField?.('ctaText', v)}
              />
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          </button>
        </div>
        
        {/* Media Content */}
        <div 
          className="flex-1 w-full animate-in fade-in slide-in-from-right duration-1000"
          style={{ maxWidth: `${(lp.imageWidth || 1) * 50}%` }}
        >
          <div className="relative w-full rounded-[2rem] p-2 bg-white/5 border border-white/10 backdrop-blur-sm shadow-2xl">
            <div className="relative aspect-video w-full rounded-[1.5rem] overflow-hidden bg-black/20">
              {lp.videoUrl ? (
                <video className="w-full h-full object-cover" poster={lp.imageUrl} controls>
                  <source src={lp.videoUrl} type="video/mp4" />
                </video>
              ) : (
                <img 
                  src={lp.imageUrl} 
                  className="w-full h-full object-cover" 
                  alt="Visual" 
                  style={{ 
                    transform: `scale(${lp.imageZoom || 1})`,
                    objectPosition: `${lp.imagePosX || 50}% ${lp.imagePosY || 50}%`
                  }}
                />
              )}
            </div>
            {/* Decorative Glow */}
            <div className="absolute -inset-4 blur-2xl -z-10 opacity-20 rounded-[3rem]" style={{ backgroundColor: primaryColor }} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-16 px-6 border-t border-white/5 flex flex-col items-center gap-8 mt-auto">
        {company?.logo && (
          <img 
            src={company.logo} 
            alt={company.name} 
            style={{ height: `${logoSize * 2}rem` }}
            className={cn(
              "object-contain transition-all",
              logoStyle === 'template' ? "opacity-30 grayscale hover:opacity-60" : "opacity-100"
            )} 
          />
        )}
        <EditableText 
          editable={editable}
          value={lp.footerText || `© ${new Date().getFullYear()} ${company?.name || 'SALEAD'}`}
          onChange={(v) => onUpdateField?.('footerText', v)}
          className="text-[10px] font-black uppercase tracking-[0.4em] opacity-20 text-white"
        />
      </footer>
    </div>
  );
}