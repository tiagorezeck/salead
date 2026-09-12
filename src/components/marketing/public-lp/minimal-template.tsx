"use client";

import React from 'react';
import { Download } from "lucide-react";
import { InteractionCard } from "./interaction-card";
import { EditableText } from "../editable-text";
import { useData } from "@/hooks/use-data";
import { cn } from "@/lib/utils";

interface MinimalTemplateProps {
  lp: any;
  s: any;
  isSurvey: boolean;
  surveyStep: number;
  submitted: boolean;
  form: any;
  setForm: (form: any) => void;
  handleSubmit: (e: React.FormEvent) => void;
  handleNextSurvey: (answer?: string | string[]) => void;
  editable?: boolean;
  onUpdateField?: (field: string, value: any) => void;
}

export function MinimalTemplate({ 
  lp, s, isSurvey, surveyStep, submitted, form, setForm, handleSubmit, handleNextSurvey,
  editable = false, onUpdateField
}: MinimalTemplateProps) {
  const { company } = useData();
  const logoStyle = lp.logoStyle || 'template';
  const logoSize = lp.logoSize || 1;
  const spacingScale = lp.spacing || 1;

  return (
    <div className="w-full max-w-3xl mx-auto text-center flex-1 flex flex-col justify-center px-6 py-4">
      {/* Header Text Section */}
      <div 
        className="flex flex-col items-center"
        style={{ gap: `${spacingScale * 0.75}rem`, marginBottom: `${spacingScale * 1.5}rem` }}
      >
        <EditableText 
          editable={editable}
          value={lp.badgeText || "LIMITED TIME OFFER"}
          onChange={(v) => onUpdateField?.('badgeText', v)}
          className="text-[10px] font-black tracking-[0.4em] uppercase opacity-60"
        />
        <EditableText 
          editable={editable}
          value={lp.headline}
          onChange={(v) => onUpdateField?.('headline', v)}
          className="font-display font-black leading-[1.1] tracking-tighter uppercase"
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
          className="max-w-lg mx-auto leading-relaxed"
          style={{ 
            fontSize: `${(lp.descriptionSize || 1) * 1}rem`,
            color: lp.descriptionColor || "rgba(255,255,255,0.6)"
          }}
          multiline
        />
      </div>
      
      {/* Interaction Section */}
      <div className="flex flex-col items-center">
        {/* Ícone de Download aumentado e com margem superior para descer */}
        <div 
          className="h-14 w-14 rounded-full border-2 flex items-center justify-center animate-bounce"
          style={{ 
            borderColor: lp.primaryColor || "#00a3ff", 
            color: lp.primaryColor || "#00a3ff", 
            marginTop: `${spacingScale * 1.5}rem`,
            marginBottom: `${spacingScale * 1.5}rem` 
          }}
        >
          <Download className="h-7 w-7" />
        </div>
        
        <div className="w-full max-w-md mx-auto">
          <InteractionCard 
            lp={lp} s={s} isSurvey={isSurvey} surveyStep={surveyStep} 
            submitted={submitted} form={form} setForm={setForm} 
            handleSubmit={handleSubmit} handleNextSurvey={handleNextSurvey} 
          />
        </div>
      </div>

      {/* Footer */}
      <footer 
        className="flex flex-col items-center"
        style={{ marginTop: `${spacingScale * 3}rem`, gap: `${spacingScale * 1}rem` }}
      >
        {company?.logo && (
          <img 
            src={company.logo} 
            alt={company.name} 
            style={{ height: `${logoSize * 1.2}rem` }}
            className={cn(
              "object-contain transition-all",
              logoStyle === 'template' ? "opacity-20 grayscale" : "opacity-100"
            )} 
          />
        )}
        <EditableText 
          editable={editable}
          value={lp.footerText || `© ${new Date().getFullYear()} ${company?.name || 'SALEAD'}`}
          onChange={(v) => onUpdateField?.('footerText', v)}
          className="text-[8px] font-black uppercase tracking-[0.3em] opacity-20 text-white"
        />
      </footer>
    </div>
  );
}