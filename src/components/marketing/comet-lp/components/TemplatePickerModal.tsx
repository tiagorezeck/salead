import React from "react";
import { PRESET_TEMPLATES } from "../data/templates";
import { LandingPage } from "../types/landingPage";
import { X, Sparkles, Check, ArrowRight, Layers, Eye } from "lucide-react";
import { THEME_CONFIGS } from "../utils/theme";
import { cn } from "@/lib/utils";

interface TemplatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: LandingPage) => void;
}

export const TemplatePickerModal: React.FC<TemplatePickerModalProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-card-foreground">
        {/* Header */}
        <div className="flex items-center justify-between pb-5 border-b border-border">
          <div>
            <div className="text-xs uppercase tracking-widest text-primary font-bold flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> COMET Engine Templates
            </div>
            <h2 className="text-xl font-bold text-foreground mt-1">Escolha um Template de Alta Conversão</h2>
            <p className="text-xs text-muted-foreground">
              Templates validados com estrutura completa de Hero, Prova Social, Bento Grid, Quiz e Formulário CRO.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full border border-border hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Templates Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 py-6 overflow-y-auto pr-1">
          {PRESET_TEMPLATES.map((tpl) => {
            const isLight = tpl.theme === "light";
            const previewImg = tpl.hero.imageUrl || tpl.hero.videoThumbnail;

            return (
              <div
                key={tpl.id}
                className="group relative bg-background border border-border hover:border-primary/60 rounded-2xl overflow-hidden flex flex-col justify-between transition-all hover:shadow-lg shadow-sm"
              >
                {/* Visual Thumbnail */}
                {previewImg && (
                  <div className="relative h-32 w-full overflow-hidden bg-muted border-b border-border">
                    <img 
                      src={previewImg} 
                      alt={tpl.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-background/90 backdrop-blur text-primary border border-border shadow-xs">
                        {tpl.niche}
                      </span>
                    </div>
                    <div className="absolute top-2.5 right-2.5">
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border shadow-xs flex items-center gap-1 backdrop-blur",
                        isLight ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30" : "bg-zinc-900/90 text-zinc-300 border-zinc-700"
                      )}>
                        <span>{isLight ? "☀️ Modo Claro" : "🌙 Modo Escuro"}</span>
                      </span>
                    </div>
                  </div>
                )}

                <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                  <div>
                    {!previewImg && (
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                          {tpl.niche}
                        </span>
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">
                          {isLight ? "☀️ Modo Claro" : "🌙 Modo Escuro"}
                        </span>
                      </div>
                    )}

                    <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2">
                      {tpl.title}
                    </h3>

                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1.5">
                      {tpl.hero.subheadline}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-2">
                    <span className="text-[9px] bg-muted text-muted-foreground px-2 py-0.5 rounded font-medium border border-border">
                      {tpl.hero.mediaType === "video" ? "VSL Vídeo" : "Visual & Imagens"}
                    </span>
                    <span className="text-[9px] bg-muted text-muted-foreground px-2 py-0.5 rounded font-medium border border-border">Quiz Interativo</span>
                    <span className="text-[9px] bg-muted text-muted-foreground px-2 py-0.5 rounded font-medium border border-border">Bento Grid</span>
                  </div>
                </div>

                <div className="p-4 pt-0">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectTemplate(tpl);
                      onClose();
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-primary/20 hover:scale-[1.02]"
                  >
                    <span>Usar Este Template</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
