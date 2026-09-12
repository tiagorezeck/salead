// src/components/marketing/visual-canvas/InteractiveSectionCanvas.tsx

import React, { useState, useRef } from "react";
import {
  Sparkles,
  Type,
  Image as ImageIcon,
  CheckCircle2,
  HelpCircle,
  CreditCard,
  ListFilter,
  MessageSquare,
  Upload,
  Pencil,
  Plus,
  Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CanvasDraggableElement } from "./CanvasDraggableElement";
import type {
  Section,
  HeroSection,
  LogosSection,
  FeaturesSection,
  StatsSection,
  TestimonialSection,
  FormSection,
  FaqSection,
  CtaSection,
  PricingSection,
  SurveySection,
  LPTheme
} from "@/lib/lp-store";
import type { ElementStyleOverrides, SelectedElement } from "./types";

interface InteractiveSectionCanvasProps {
  section: Section;
  theme: LPTheme;
  elementStyles: Record<string, ElementStyleOverrides>;
  onUpdateSectionContent: (sectionId: string, updates: Partial<Section> | any) => void;
  onTriggerUpload: (onUploaded: (url: string) => void) => void;
  onSelectElement: (element: SelectedElement | null) => void;
  selectedElement: SelectedElement | null;
  editorMode: "edit" | "preview";
}

// Inline Editable Text Component for Canvas
function InlineText({
  value,
  onChange,
  className,
  style,
  multiline = false,
  isEditing,
  setIsEditing
}: {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  style?: React.CSSProperties;
  multiline?: boolean;
  isEditing: boolean;
  setIsEditing: (val: boolean) => void;
}) {
  const [localVal, setLocalVal] = useState(value);

  React.useEffect(() => {
    setLocalVal(value);
  }, [value]);

  if (isEditing) {
    return multiline ? (
      <textarea
        autoFocus
        value={localVal}
        onChange={(e) => setLocalVal(e.target.value)}
        onBlur={() => {
          setIsEditing(false);
          if (localVal !== value) onChange(localVal);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setLocalVal(value);
            setIsEditing(false);
          }
        }}
        className={cn(
          "w-full bg-[#16181D]/90 text-white border-2 border-[#FF6A00] rounded-lg p-2 outline-none no-drag-handle shadow-2xl resize-none",
          className
        )}
        style={style}
        rows={3}
      />
    ) : (
      <input
        autoFocus
        type="text"
        value={localVal}
        onChange={(e) => setLocalVal(e.target.value)}
        onBlur={() => {
          setIsEditing(false);
          if (localVal !== value) onChange(localVal);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === "Escape") {
            setIsEditing(false);
            if (localVal !== value) onChange(localVal);
          }
        }}
        className={cn(
          "w-full bg-[#16181D]/90 text-white border-2 border-[#FF6A00] rounded-lg px-2 py-1 outline-none no-drag-handle shadow-2xl",
          className
        )}
        style={style}
      />
    );
  }

  return (
    <div className={cn("inline-block", className)} style={style}>
      {value || <span className="opacity-40 italic">[Clique duas vezes para editar texto]</span>}
    </div>
  );
}

function CanvasSectionWrapper({
  section,
  children
}: {
  section: Section;
  children: React.ReactNode;
}) {
  const bgImage = section.bgImage;
  const overlay = section.bgOverlay || "dark-80";
  const opacity = (section.bgOpacity ?? 100) / 100;

  return (
    <div className="relative overflow-hidden w-full">
      {bgImage && (
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden" style={{ opacity }}>
          <img src={bgImage} alt="" className="w-full h-full object-cover object-center" />
          {overlay === "dark-50" && <div className="absolute inset-0 bg-black/50" />}
          {overlay === "dark-80" && <div className="absolute inset-0 bg-black/80" />}
          {overlay === "gradient-to-right" && (
            <div className="absolute inset-0 bg-gradient-to-r from-[#0E0F12] via-[#0E0F12]/85 to-transparent" />
          )}
          {overlay === "gradient-to-top" && (
            <div className="absolute inset-0 bg-gradient-to-t from-[#0E0F12] via-[#0E0F12]/85 to-transparent" />
          )}
          {overlay === "primary-tint" && (
            <div className="absolute inset-0 bg-[#FF6A00]/20 mix-blend-overlay" />
          )}
          {overlay === "blur-glass" && (
            <div className="absolute inset-0 backdrop-blur-xl bg-black/60 border-b border-white/10" />
          )}
        </div>
      )}
      <div className="relative z-10 w-full">
        {children}
      </div>
    </div>
  );
}

export function InteractiveSectionCanvas({
  section,
  theme,
  elementStyles,
  onUpdateSectionContent,
  onTriggerUpload,
  onSelectElement,
  selectedElement,
  editorMode
}: InteractiveSectionCanvasProps) {
  const [activeEditingKey, setActiveEditingKey] = useState<string | null>(null);

  const getCustomStyle = (key: string): React.CSSProperties => {
    const ov: any = elementStyles[key] || {};
    return {
      ...(ov.color ? { color: ov.color } : {}),
      ...(ov.backgroundColor ? { backgroundColor: ov.backgroundColor } : {}),
      ...(ov.fontSize ? { fontSize: `${ov.fontSize}px` } : {}),
      ...(ov.fontWeight ? { fontWeight: ov.fontWeight } : {}),
      ...(ov.fontFamily ? { fontFamily: ov.fontFamily } : {}),
      ...(ov.align ? { textAlign: ov.align } : ov.textAlign ? { textAlign: ov.textAlign } : {}),
      ...(ov.borderRadius ? { borderRadius: `${ov.borderRadius}px` } : {}),
      ...(ov.boxShadow ? { boxShadow: ov.boxShadow } : {})
    };
  };

  const renderSectionContent = () => {
    switch (section.type) {
    case "hero": {
      const s = section as HeroSection;
      const eyebrowKey = `${s.id}_hero_eyebrow`;
      const titleKey = `${s.id}_hero_title`;
      const subtitleKey = `${s.id}_hero_subtitle`;
      const cta1Key = `${s.id}_hero_cta_primary`;
      const cta2Key = `${s.id}_hero_cta_secondary`;
      const mediaKey = `${s.id}_hero_media`;

      return (
        <section className="relative px-6 md:px-12 py-16 md:py-24 grid md:grid-cols-2 gap-10 items-center max-w-7xl mx-auto min-h-[500px]">
          <div className="space-y-4">
            {/* Eyebrow / Tag */}
            {s.eyebrow !== undefined && (
              <CanvasDraggableElement
                id={eyebrowKey}
                sectionId={s.id}
                elementType="hero_eyebrow"
                label="Tag / Eyebrow"
                onDoubleClick={() => setActiveEditingKey(eyebrowKey)}
              >
                <div
                  className="text-xs font-bold tracking-[0.2em] uppercase"
                  style={{ color: theme.primary, ...getCustomStyle(eyebrowKey) }}
                >
                  <InlineText
                    value={s.eyebrow || "NOVIDADE EXCLUSIVA"}
                    onChange={(val) => onUpdateSectionContent(s.id, { eyebrow: val })}
                    isEditing={activeEditingKey === eyebrowKey}
                    setIsEditing={(editing) => setActiveEditingKey(editing ? eyebrowKey : null)}
                  />
                </div>
              </CanvasDraggableElement>
            )}

            {/* Título Principal */}
            <CanvasDraggableElement
              id={titleKey}
              sectionId={s.id}
              elementType="hero_title"
              label="Título Principal"
              onDoubleClick={() => setActiveEditingKey(titleKey)}
            >
              <h1
                className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight tracking-tight text-white"
                style={getCustomStyle(titleKey)}
              >
                <InlineText
                  value={s.title}
                  onChange={(val) => onUpdateSectionContent(s.id, { title: val })}
                  isEditing={activeEditingKey === titleKey}
                  setIsEditing={(editing) => setActiveEditingKey(editing ? titleKey : null)}
                />
              </h1>
            </CanvasDraggableElement>

            {/* Subtítulo / Descrição */}
            <CanvasDraggableElement
              id={subtitleKey}
              sectionId={s.id}
              elementType="hero_subtitle"
              label="Subtítulo / Apoio"
              onDoubleClick={() => setActiveEditingKey(subtitleKey)}
            >
              <p
                className="text-base md:text-lg opacity-80 leading-relaxed text-white/80"
                style={getCustomStyle(subtitleKey)}
              >
                <InlineText
                  value={s.subtitle || ""}
                  multiline
                  onChange={(val) => onUpdateSectionContent(s.id, { subtitle: val })}
                  isEditing={activeEditingKey === subtitleKey}
                  setIsEditing={(editing) => setActiveEditingKey(editing ? subtitleKey : null)}
                />
              </p>
            </CanvasDraggableElement>

            {/* Botões CTA */}
            <div className="flex flex-wrap items-center gap-3.5 pt-4">
              {s.ctaPrimary && (
                <CanvasDraggableElement
                  id={cta1Key}
                  sectionId={s.id}
                  elementType="hero_cta_primary"
                  label="Botão CTA Principal"
                  onDoubleClick={() => setActiveEditingKey(cta1Key)}
                  className="w-auto inline-block"
                >
                  <button
                    type="button"
                    className="px-6 py-3.5 rounded-[var(--lp-radius,14px)] font-bold text-white shadow-xl hover:opacity-90 active:scale-95 transition-all cursor-pointer inline-flex items-center justify-center gap-2"
                    style={{
                      background: theme.primary,
                      borderRadius: `${theme.radius || 14}px`,
                      ...getCustomStyle(cta1Key)
                    }}
                  >
                    <InlineText
                      value={s.ctaPrimary}
                      onChange={(val) => onUpdateSectionContent(s.id, { ctaPrimary: val })}
                      isEditing={activeEditingKey === cta1Key}
                      setIsEditing={(editing) => setActiveEditingKey(editing ? cta1Key : null)}
                    />
                  </button>
                </CanvasDraggableElement>
              )}

              {s.ctaSecondary && (
                <CanvasDraggableElement
                  id={cta2Key}
                  sectionId={s.id}
                  elementType="hero_cta_secondary"
                  label="Botão CTA Secundário"
                  onDoubleClick={() => setActiveEditingKey(cta2Key)}
                  className="w-auto inline-block"
                >
                  <button
                    type="button"
                    className="px-6 py-3.5 rounded-[var(--lp-radius,14px)] font-medium border border-white/20 hover:bg-white/5 active:scale-95 transition-all cursor-pointer text-white"
                    style={{
                      borderRadius: `${theme.radius || 14}px`,
                      ...getCustomStyle(cta2Key)
                    }}
                  >
                    <InlineText
                      value={s.ctaSecondary}
                      onChange={(val) => onUpdateSectionContent(s.id, { ctaSecondary: val })}
                      isEditing={activeEditingKey === cta2Key}
                      setIsEditing={(editing) => setActiveEditingKey(editing ? cta2Key : null)}
                    />
                  </button>
                </CanvasDraggableElement>
              )}
            </div>
          </div>

          {/* Mídia / Imagem Hero Draggable & Resizable */}
          <CanvasDraggableElement
            id={mediaKey}
            sectionId={s.id}
            elementType="hero_media"
            label="Imagem / Vídeo Principal"
            defaultDimensions={{ width: "100%", height: "auto" }}
          >
            <div
              className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-white/10 bg-white/5 shadow-2xl group/media cursor-pointer"
              style={getCustomStyle(mediaKey)}
            >
              {s.image ? (
                <img
                  src={s.image}
                  alt={s.title}
                  className="w-full h-full object-cover pointer-events-none"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-6 text-center text-white/50">
                  <ImageIcon className="w-12 h-12 text-[#FF6A00]/80" />
                  <span className="text-sm font-semibold">Imagem da Campanha</span>
                </div>
              )}

              {/* Botão Flutuante para Trocar Imagem e Dropzone Drag-and-Drop */}
              <div 
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const file = e.dataTransfer.files?.[0];
                  if (file && file.type.startsWith("image/")) {
                    const reader = new FileReader();
                    reader.onload = () => {
                      onUpdateSectionContent(s.id, { image: reader.result as string });
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="absolute inset-0 bg-black/50 opacity-0 group-hover/media:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 no-drag-handle"
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTriggerUpload((url) => onUpdateSectionContent(s.id, { image: url }));
                  }}
                  className="px-3.5 py-2 rounded-xl bg-[#FF6A00] text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-xl hover:scale-105 transition-all cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Trocar Imagem</span>
                </button>
                <span className="text-[10px] text-white/80 font-medium bg-black/60 px-2 py-0.5 rounded-md">
                  Ou arraste e solte uma imagem aqui
                </span>
              </div>
            </div>
          </CanvasDraggableElement>
        </section>
      );
    }

    case "features": {
      const s = section as FeaturesSection;
      const titleKey = `${s.id}_features_title`;
      const subtitleKey = `${s.id}_features_subtitle`;

      return (
        <section
          className="px-6 md:px-12 py-16 md:py-24"
          style={{ background: theme.surface || "#16181D" }}
        >
          <div className="max-w-3xl mx-auto text-center space-y-3 mb-12">
            <CanvasDraggableElement
              id={titleKey}
              sectionId={s.id}
              elementType="features_title"
              label="Título de Recursos"
              onDoubleClick={() => setActiveEditingKey(titleKey)}
            >
              <h2
                className="text-2xl md:text-4xl font-extrabold tracking-tight text-white"
                style={getCustomStyle(titleKey)}
              >
                <InlineText
                  value={s.title}
                  onChange={(val) => onUpdateSectionContent(s.id, { title: val })}
                  isEditing={activeEditingKey === titleKey}
                  setIsEditing={(editing) => setActiveEditingKey(editing ? titleKey : null)}
                />
              </h2>
            </CanvasDraggableElement>

            {s.subtitle && (
              <CanvasDraggableElement
                id={subtitleKey}
                sectionId={s.id}
                elementType="features_subtitle"
                label="Subtítulo de Recursos"
                onDoubleClick={() => setActiveEditingKey(subtitleKey)}
              >
                <p
                  className="opacity-80 text-base md:text-lg text-white/80"
                  style={getCustomStyle(subtitleKey)}
                >
                  <InlineText
                    value={s.subtitle}
                    onChange={(val) => onUpdateSectionContent(s.id, { subtitle: val })}
                    isEditing={activeEditingKey === subtitleKey}
                    setIsEditing={(editing) => setActiveEditingKey(editing ? subtitleKey : null)}
                  />
                </p>
              </CanvasDraggableElement>
            )}
          </div>

          {/* Cards de Recursos Draggable */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {(s.items || []).map((it, idx) => {
              const cardKey = `${s.id}_features_card_${it.id}`;
              return (
                <CanvasDraggableElement
                  key={it.id}
                  id={cardKey}
                  sectionId={s.id}
                  elementType="features_card"
                  subId={it.id}
                  label={`Card ${idx + 1} (${it.title})`}
                >
                  <div
                    className="p-6 rounded-[var(--lp-radius,14px)] border border-white/10 bg-white/[0.03] hover:border-white/20 transition-all h-full"
                    style={{
                      borderRadius: `${theme.radius || 14}px`,
                      ...getCustomStyle(cardKey)
                    }}
                  >
                    <div
                      className="h-12 w-12 rounded-xl grid place-items-center font-bold text-xl mb-4"
                      style={{
                        background: `color-mix(in oklab, ${theme.primary} 20%, transparent)`,
                        color: theme.primary
                      }}
                    >
                      ★
                    </div>
                    <h3 className="font-bold text-lg text-white mb-2">{it.title}</h3>
                    <p className="text-sm opacity-75 leading-relaxed text-white/70">{it.text}</p>
                  </div>
                </CanvasDraggableElement>
              );
            })}
          </div>
        </section>
      );
    }

    case "stats": {
      const s = section as StatsSection;
      return (
        <section className="px-6 md:px-12 py-16" style={{ background: theme.bg || "#0E0F12" }}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-4xl mx-auto text-center">
            {(s.items || []).map((it, idx) => {
              const statKey = `${s.id}_stats_item_${it.id}`;
              return (
                <CanvasDraggableElement
                  key={it.id}
                  id={statKey}
                  sectionId={s.id}
                  elementType={"stats_card" as any}
                  subId={it.id}
                  label={`Métrica ${idx + 1}`}
                >
                  <div
                    className="p-6 rounded-2xl border border-white/10 bg-white/[0.02]"
                    style={getCustomStyle(statKey)}
                  >
                    <div
                      className="text-4xl md:text-5xl font-extrabold tracking-tight"
                      style={{ color: theme.primary }}
                    >
                      {it.value}
                    </div>
                    <div className="mt-2 text-xs md:text-sm uppercase tracking-wider font-semibold opacity-75 text-white/80">
                      {it.label}
                    </div>
                  </div>
                </CanvasDraggableElement>
              );
            })}
          </div>
        </section>
      );
    }

    case "testimonial": {
      const s = section as TestimonialSection;
      const quoteKey = `${s.id}_testimonial_quote`;
      const authorKey = `${s.id}_testimonial_author`;

      return (
        <section
          className="px-6 md:px-12 py-16 md:py-20"
          style={{ background: theme.surface || "#16181D" }}
        >
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div
              className="flex justify-center gap-1.5 text-xl tracking-widest"
              style={{ color: theme.primary }}
            >
              ★★★★★
            </div>

            <CanvasDraggableElement
              id={quoteKey}
              sectionId={s.id}
              elementType="testimonial_quote"
              label="Depoimento / Citação"
              onDoubleClick={() => setActiveEditingKey(quoteKey)}
            >
              <p
                className="text-xl md:text-2xl font-medium leading-relaxed italic text-white"
                style={getCustomStyle(quoteKey)}
              >
                <InlineText
                  value={s.quote}
                  multiline
                  onChange={(val) => onUpdateSectionContent(s.id, { quote: val })}
                  isEditing={activeEditingKey === quoteKey}
                  setIsEditing={(editing) => setActiveEditingKey(editing ? quoteKey : null)}
                />
              </p>
            </CanvasDraggableElement>

            <CanvasDraggableElement
              id={authorKey}
              sectionId={s.id}
              elementType="testimonial_author"
              label="Autor & Cargo"
            >
              <div className="flex items-center justify-center gap-3.5">
                {s.avatar && (
                  <img
                    src={s.avatar}
                    alt=""
                    className="h-14 w-14 rounded-full object-cover border-2 border-white/10 shadow-lg"
                  />
                )}
                <div className="text-left">
                  <div className="font-bold text-white text-base">{s.author}</div>
                  <div className="text-xs opacity-70 text-white/70">{s.role}</div>
                </div>
              </div>
            </CanvasDraggableElement>
          </div>
        </section>
      );
    }

    case "pricing": {
      const s = section as PricingSection;
      const titleKey = `${s.id}_pricing_title`;

      return (
        <section className="px-6 md:px-12 py-16 md:py-24" style={{ background: theme.bg || "#0E0F12" }}>
          <div className="max-w-3xl mx-auto text-center mb-12">
            <CanvasDraggableElement
              id={titleKey}
              sectionId={s.id}
              elementType={"pricing_title" as any}
              label="Título de Preços"
              onDoubleClick={() => setActiveEditingKey(titleKey)}
            >
              <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight text-white">
                <InlineText
                  value={s.title || "Planos & Preços"}
                  onChange={(val) => onUpdateSectionContent(s.id, { title: val })}
                  isEditing={activeEditingKey === titleKey}
                  setIsEditing={(editing) => setActiveEditingKey(editing ? titleKey : null)}
                />
              </h2>
            </CanvasDraggableElement>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {(s.plans || []).map((p, idx) => {
              const planKey = `${s.id}_pricing_plan_${p.id}`;
              return (
                <CanvasDraggableElement
                  key={p.id}
                  id={planKey}
                  sectionId={s.id}
                  elementType={"pricing_card" as any}
                  subId={p.id}
                  label={`Plano ${p.name}`}
                >
                  <div
                    className={cn(
                      "p-8 rounded-[var(--lp-radius,14px)] border transition-all h-full flex flex-col justify-between",
                      p.highlight
                        ? "bg-[#181B22] border-[#FF6A00] shadow-2xl shadow-[#FF6A00]/10 ring-2 ring-[#FF6A00]"
                        : "bg-white/[0.03] border-white/10"
                    )}
                    style={{
                      borderRadius: `${theme.radius || 14}px`,
                      ...getCustomStyle(planKey)
                    }}
                  >
                    <div>
                      {p.highlight && (
                        <span className="text-[10px] font-black uppercase tracking-wider bg-[#FF6A00] text-white px-2.5 py-1 rounded-full mb-3 inline-block">
                          Mais Popular
                        </span>
                      )}
                      <h3 className="text-xl font-bold text-white">{p.name}</h3>
                      <div className="mt-4 flex items-baseline gap-1">
                        <span className="text-3xl md:text-4xl font-black text-white">{p.price}</span>
                        <span className="text-xs opacity-70 text-white/70">/{(p as any).period || p.per}</span>
                      </div>
                      <ul className="mt-6 space-y-3 text-sm opacity-80 text-white/80">
                        {(p.features || []).map((f, fIdx) => (
                          <li key={fIdx} className="flex items-center gap-2">
                            <span style={{ color: theme.primary }}>✓</span>
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button
                      type="button"
                      className="mt-8 w-full py-3 rounded-xl font-bold text-white transition-all cursor-pointer"
                      style={{
                        background: p.highlight ? theme.primary : "rgba(255,255,255,0.1)"
                      }}
                    >
                      {(p as any).cta || "Assinar Agora"}
                    </button>
                  </div>
                </CanvasDraggableElement>
              );
            })}
          </div>
        </section>
      );
    }

    case "cta": {
      const s = section as CtaSection;
      const titleKey = `${s.id}_cta_title`;
      const subtitleKey = `${s.id}_cta_subtitle`;
      const buttonKey = `${s.id}_cta_button`;

      return (
        <section
          className="px-6 md:px-12 py-16 md:py-24"
          style={{ background: theme.surface || "#16181D" }}
        >
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <CanvasDraggableElement
              id={titleKey}
              sectionId={s.id}
              elementType="cta_title"
              label="Título CTA"
              onDoubleClick={() => setActiveEditingKey(titleKey)}
            >
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white">
                <InlineText
                  value={s.title}
                  onChange={(val) => onUpdateSectionContent(s.id, { title: val })}
                  isEditing={activeEditingKey === titleKey}
                  setIsEditing={(editing) => setActiveEditingKey(editing ? titleKey : null)}
                />
              </h2>
            </CanvasDraggableElement>

            {s.subtitle && (
              <CanvasDraggableElement
                id={subtitleKey}
                sectionId={s.id}
                elementType="cta_subtitle"
                label="Subtítulo CTA"
                onDoubleClick={() => setActiveEditingKey(subtitleKey)}
              >
                <p className="text-base md:text-xl opacity-80 max-w-2xl mx-auto text-white/80">
                  <InlineText
                    value={s.subtitle}
                    onChange={(val) => onUpdateSectionContent(s.id, { subtitle: val })}
                    isEditing={activeEditingKey === subtitleKey}
                    setIsEditing={(editing) => setActiveEditingKey(editing ? subtitleKey : null)}
                  />
                </p>
              </CanvasDraggableElement>
            )}

            <CanvasDraggableElement
              id={buttonKey}
              sectionId={s.id}
              elementType="cta_button"
              label="Botão de Ação CTA"
              className="w-auto inline-block"
            >
              <button
                type="button"
                className="px-8 py-4 rounded-[var(--lp-radius,14px)] font-black text-white text-base shadow-2xl hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                style={{
                  background: theme.primary,
                  borderRadius: `${theme.radius || 14}px`,
                  ...getCustomStyle(buttonKey)
                }}
              >
                {(s as any).ctaPrimary || (s as any).buttonText || "Começar Agora"}
              </button>
            </CanvasDraggableElement>
          </div>
        </section>
      );
    }

    case "logos": {
      const s = section as LogosSection;
      const titleKey = `${s.id}_logos_title`;

      return (
        <section className="px-6 md:px-12 py-10 border-y border-white/5" style={{ background: theme.bg || "#0E0F12" }}>
          {s.title && (
            <div className="max-w-xl mx-auto text-center mb-6">
              <CanvasDraggableElement
                id={titleKey}
                sectionId={s.id}
                elementType="section"
                label="Título de Logos"
                onDoubleClick={() => setActiveEditingKey(titleKey)}
              >
                <div className="text-xs uppercase tracking-[0.2em] opacity-70 font-semibold text-white/80">
                  <InlineText
                    value={s.title}
                    onChange={(val) => onUpdateSectionContent(s.id, { title: val })}
                    isEditing={activeEditingKey === titleKey}
                    setIsEditing={(editing) => setActiveEditingKey(editing ? titleKey : null)}
                  />
                </div>
              </CanvasDraggableElement>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4 opacity-80 max-w-5xl mx-auto">
            {(s.logos || []).map((l, idx) => {
              const logoKey = `${s.id}_logos_item_${l.id}`;
              return (
                <CanvasDraggableElement
                  key={l.id}
                  id={logoKey}
                  sectionId={s.id}
                  elementType="section"
                  subId={l.id}
                  label={`Logo ${l.label || idx + 1}`}
                  className="w-auto inline-block"
                >
                  <div className="font-bold text-lg md:text-xl tracking-tight text-white/80 px-3 py-1.5 rounded-lg border border-transparent hover:border-white/10">
                    {l.label}
                  </div>
                </CanvasDraggableElement>
              );
            })}
          </div>
        </section>
      );
    }

    case "faq": {
      const s = section as FaqSection;
      const titleKey = `${s.id}_faq_title`;

      return (
        <section className="px-6 md:px-12 py-16 md:py-24" style={{ background: theme.surface || "#16181D" }}>
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="text-center">
              <CanvasDraggableElement
                id={titleKey}
                sectionId={s.id}
                elementType={"faq_title" as any}
                label="Título FAQ"
                onDoubleClick={() => setActiveEditingKey(titleKey)}
              >
                <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight text-white">
                  <InlineText
                    value={s.title || "Perguntas Frequentes"}
                    onChange={(val) => onUpdateSectionContent(s.id, { title: val })}
                    isEditing={activeEditingKey === titleKey}
                    setIsEditing={(editing) => setActiveEditingKey(editing ? titleKey : null)}
                  />
                </h2>
              </CanvasDraggableElement>
            </div>

            <div className="space-y-4">
              {(s.items || []).map((it, idx) => {
                const itemKey = `${s.id}_faq_item_${it.id}`;
                return (
                  <CanvasDraggableElement
                    key={it.id}
                    id={itemKey}
                    sectionId={s.id}
                    elementType="faq_item"
                    subId={it.id}
                    label={`Pergunta ${idx + 1}`}
                  >
                    <div
                      className="p-5 rounded-[var(--lp-radius,14px)] border border-white/10 bg-white/[0.02]"
                      style={{
                        borderRadius: `${theme.radius || 14}px`,
                        ...getCustomStyle(itemKey)
                      }}
                    >
                      <h3 className="font-bold text-base text-white">{it.q}</h3>
                      <p className="mt-2 text-sm opacity-80 leading-relaxed text-white/70">{it.a}</p>
                    </div>
                  </CanvasDraggableElement>
                );
              })}
            </div>
          </div>
        </section>
      );
    }

    case "form": {
      const s = section as FormSection;
      const formCardKey = `${s.id}_form_box`;
      const titleKey = `${s.id}_form_title`;
      const subtitleKey = `${s.id}_form_subtitle`;

      return (
        <section className="px-6 md:px-12 py-16 md:py-24" style={{ background: theme.bg || "#0E0F12" }}>
          <div className="max-w-xl mx-auto">
            <CanvasDraggableElement
              id={formCardKey}
              sectionId={s.id}
              elementType={"form_card" as any}
              label="Caixa de Formulário de Captura"
            >
              <div
                className="rounded-[var(--lp-radius,14px)] border border-white/10 bg-white/[0.04] p-6 md:p-10 backdrop-blur shadow-2xl space-y-6"
                style={{
                  borderRadius: `${theme.radius || 14}px`,
                  ...getCustomStyle(formCardKey)
                }}
              >
                <div>
                  <CanvasDraggableElement
                    id={titleKey}
                    sectionId={s.id}
                    elementType="form_title"
                    label="Título do Formulário"
                    onDoubleClick={() => setActiveEditingKey(titleKey)}
                  >
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
                      <InlineText
                        value={s.title}
                        onChange={(val) => onUpdateSectionContent(s.id, { title: val })}
                        isEditing={activeEditingKey === titleKey}
                        setIsEditing={(editing) => setActiveEditingKey(editing ? titleKey : null)}
                      />
                    </h2>
                  </CanvasDraggableElement>

                  {s.subtitle && (
                    <CanvasDraggableElement
                      id={subtitleKey}
                      sectionId={s.id}
                      elementType="form_subtitle"
                      label="Subtítulo do Formulário"
                      onDoubleClick={() => setActiveEditingKey(subtitleKey)}
                    >
                      <p className="mt-2 opacity-75 text-sm md:text-base leading-relaxed text-white/70">
                        <InlineText
                          value={s.subtitle}
                          onChange={(val) => onUpdateSectionContent(s.id, { subtitle: val })}
                          isEditing={activeEditingKey === subtitleKey}
                          setIsEditing={(editing) => setActiveEditingKey(editing ? titleKey : null)}
                        />
                      </p>
                    </CanvasDraggableElement>
                  )}
                </div>

                <div className="space-y-4">
                  {(s.fields || []).map((f) => (
                    <div key={f.id}>
                      <label className="block text-xs font-semibold uppercase tracking-wider opacity-75 mb-1.5 text-white/80">
                        {f.label}
                      </label>
                      <div className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-3 text-sm text-white/50">
                        Campo {f.label} ({f.type})
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    className="w-full py-4 rounded-xl font-bold text-white shadow-xl text-sm uppercase tracking-wider cursor-pointer"
                    style={{ background: theme.primary }}
                  >
                    {(s as any).button || (s as any).buttonText || "Enviar Solicitação"}
                  </button>
                </div>
              </div>
            </CanvasDraggableElement>
          </div>
        </section>
      );
    }

    default:
      return (
        <div className="p-8 text-center text-white/60">
          <CanvasDraggableElement
            id={`${section.id}_generic_box`}
            sectionId={section.id}
            elementType="section"
            label={`Seção ${section.type}`}
          >
            <div className="p-8 rounded-2xl border border-white/10 bg-white/5">
              <span className="font-bold text-white uppercase">{section.type}</span>
            </div>
          </CanvasDraggableElement>
        </div>
      );
    }
  };

  return (
    <CanvasSectionWrapper section={section}>
      {renderSectionContent()}
    </CanvasSectionWrapper>
  );
}
