"use client";

import React from 'react';
import { Sparkles, Zap, Rocket, ArrowRight, Flame, Target, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { EditableText } from "../editable-text";
import { useData } from "@/hooks/use-data";

interface BoldTemplateProps {
  lp: any;
  s: any;
  isSurvey: boolean;
  setShowCard: (show: boolean) => void;
  editable?: boolean;
  onUpdateField?: (field: string, value: any) => void;
}

export function BoldTemplate({ lp, s, isSurvey, setShowCard, editable = false, onUpdateField }: BoldTemplateProps) {
  const { company } = useData();
  const spacingScale = lp.spacing || 1;
  const primaryColor = lp.primaryColor || "#f97316";
  const secondaryColor = lp.secondaryColor || "#ea580c";
  const headlineColor = lp.headlineColor || "#ffffff";
  const descriptionColor = lp.descriptionColor || "#ffffff";
  const logoStyle = lp.logoStyle || 'template';
  const logoSize = lp.logoSize || 1;

  return (
    <div 
      className="w-full min-h-screen flex flex-col relative overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
    >
      {/* Background Elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-0 w-full h-full opacity-20">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="bold-grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="2"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#bold-grid)" />
          </svg>
        </div>
      </div>

      <main 
        className="flex-1 flex flex-col items-center justify-center px-6 relative z-10"
        style={{ 
          paddingTop: `${spacingScale * 2.5}rem`, 
          paddingBottom: `${spacingScale * 2.5}rem` 
        }}
      >
        <div 
          className={cn(
            "max-w-6xl w-full grid gap-12 items-center",
            lp.layout === 'reverse' ? "lg:grid-cols-[1fr_1.2fr]" : "lg:grid-cols-[1.2fr_1fr]"
          )}
        >
          
          <div 
            className={cn(
              "space-y-8 text-center lg:text-left",
              lp.layout === 'reverse' ? "lg:order-2" : "lg:order-1"
            )}
          >
            <div style={{ gap: `${spacingScale * 1}rem`, display: 'flex', flexDirection: 'column' }}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black text-white text-[10px] font-black uppercase tracking-[0.3em] self-center lg:self-start">
                <Flame className="h-3.5 w-3.5" style={{ color: primaryColor }} /> 
                <EditableText 
                  editable={editable}
                  value={lp.badgeText || "Oferta por tempo limitado"}
                  onChange={(v) => onUpdateField?.('badgeText', v)}
                />
              </div>
              <EditableText 
                editable={editable}
                value={lp.headline}
                onChange={(v) => onUpdateField?.('headline', v)}
                className="font-display font-black leading-[0.9] tracking-tighter uppercase italic"
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
                className="font-bold leading-tight max-w-xl"
                style={{ 
                  fontSize: `${(lp.descriptionSize || 1) * 1.25}rem`,
                  color: descriptionColor
                }}
                multiline
              />
            </div>

            <button 
              onClick={() => setShowCard(true)}
              className="w-full sm:w-auto px-12 py-6 rounded-full bg-black text-white font-black uppercase tracking-widest text-sm shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              <EditableText 
                editable={editable}
                value={lp.ctaText || (isSurvey ? "Começar Agora" : "Quero meu acesso")}
                onChange={(v) => onUpdateField?.('ctaText', v)}
              />
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>

          <div 
            className={cn(
              "relative flex justify-center items-center",
              lp.layout === 'reverse' ? "lg:order-1" : "lg:order-2"
            )}
          >
            <div 
              className="relative w-full group"
              style={{ maxWidth: `${(lp.imageWidth || 1) * 24}rem` }}
            >
              <div className="bg-white p-2 rounded-[2.5rem] shadow-2xl transform rotate-3 group-hover:rotate-0 transition-transform duration-700">
                <div className="rounded-[2rem] overflow-hidden aspect-[3/4] relative border-4 border-black bg-muted">
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
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="py-12 px-6 relative z-10 flex flex-col items-center gap-6">
        {company?.logo && (
          <img 
            src={company.logo} 
            alt={company.name} 
            style={{ height: `${logoSize * 2}rem` }}
            className={cn(
              "object-contain transition-all",
              logoStyle === 'template' ? "brightness-0 invert opacity-40" : "opacity-100"
            )} 
          />
        )}
        <EditableText 
          editable={editable}
          value={lp.footerText || `© ${new Date().getFullYear()} ${company?.name || 'SALEAD'}`}
          onChange={(v) => onUpdateField?.('footerText', v)}
          className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 text-white"
        />
      </footer>
    </div>
  );
}