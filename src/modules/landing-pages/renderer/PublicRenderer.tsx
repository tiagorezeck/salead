// src/modules/landing-pages/renderer/PublicRenderer.tsx

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type {
  LP,
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
  SurveyQuestion,
} from "@/lib/lp-store";

export interface PublicRendererProps {
  lp: LP & { rawHtml?: string; compiledHtml?: string };
  onLead?: (data: Record<string, unknown>, meta: { section: string }) => void;
  onCtaClick?: (label: string) => void;
  className?: string;
}

export function PublicRenderer({ lp, onLead, onCtaClick, className }: PublicRendererProps) {
  const style = useMemo(
    () => ({
      fontFamily:
        lp?.theme?.font === "sora"
          ? "Sora, system-ui, sans-serif"
          : lp?.theme?.font === "manrope"
          ? "Manrope, system-ui, sans-serif"
          : "Inter, system-ui, sans-serif",
      ["--lp-primary" as string]: lp?.theme?.primary || "#FF6A00",
      ["--lp-bg" as string]: lp?.theme?.bg || "#0E0F12",
      ["--lp-surface" as string]: lp?.theme?.surface || "#16181D",
      ["--lp-text" as string]: lp?.theme?.text || "#F5F6F8",
      ["--lp-muted" as string]: lp?.theme?.muted || "#9AA0AA",
      ["--lp-radius" as string]: `${lp?.theme?.radius ?? 14}px`,
      background: lp?.theme?.bg || "#0E0F12",
      color: lp?.theme?.text || "#F5F6F8",
    }),
    [lp?.theme],
  );

  // Renderização de HTML Standalone Compilado pelo Engine de Alta Conversão
  if (lp.rawHtml || lp.compiledHtml || (lp as any).customHtml) {
    const rawCode = lp.rawHtml || lp.compiledHtml || (lp as any).customHtml;
    return (
      <iframe
        srcDoc={rawCode}
        title={lp.name || "Landing Page"}
        className={cn("w-full h-full min-h-screen border-0 bg-transparent", className)}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
      />
    );
  }

  const visibleSections = (lp.sections || []).filter((s) => s.visible !== false);

  return (
    <div style={style as React.CSSProperties} className={`min-h-screen w-full flex flex-col font-sans ${className || ""}`}>
      <div className="flex-1">
        {visibleSections.map((s) => (
          <SectionView key={s.id} section={s} onLead={onLead} onCtaClick={onCtaClick} />
        ))}
      </div>
      <footer className="px-6 py-10 text-center text-xs opacity-60 border-t border-white/5" style={{ background: "var(--lp-bg)" }}>
        <p>© {new Date().getFullYear()} · {lp.name} — Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}

function SectionBackgroundWrapper({
  section,
  children,
  className = ""
}: {
  section: Section;
  children: React.ReactNode;
  className?: string;
}) {
  const bgImage = section.bgImage;
  const overlay = section.bgOverlay || "dark-80";
  const opacity = (section.bgOpacity ?? 100) / 100;

  return (
    <div className={cn("relative overflow-hidden w-full", className)}>
      {/* Imagem de Fundo e Overlay de Degradê se houver bgImage */}
      {bgImage && (
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden" style={{ opacity }}>
          <img
            src={bgImage}
            alt=""
            className="w-full h-full object-cover object-center"
          />
          {overlay === "dark-50" && <div className="absolute inset-0 bg-black/50" />}
          {overlay === "dark-80" && <div className="absolute inset-0 bg-black/80" />}
          {overlay === "gradient-to-right" && (
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--lp-bg,#0E0F12)] via-[var(--lp-bg,#0E0F12)]/85 to-transparent" />
          )}
          {overlay === "gradient-to-top" && (
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--lp-bg,#0E0F12)] via-[var(--lp-bg,#0E0F12)]/85 to-transparent" />
          )}
          {overlay === "primary-tint" && (
            <div className="absolute inset-0 bg-[var(--lp-primary)]/20 mix-blend-overlay" />
          )}
          {overlay === "blur-glass" && (
            <div className="absolute inset-0 backdrop-blur-xl bg-black/60 border-b border-white/10" />
          )}
        </div>
      )}

      {/* Conteúdo da Seção */}
      <div className="relative z-10 w-full">
        {children}
      </div>
    </div>
  );
}

function SectionView({
  section,
  onLead,
  onCtaClick,
}: {
  section: Section;
  onLead?: PublicRendererProps["onLead"];
  onCtaClick?: PublicRendererProps["onCtaClick"];
}) {
  let content: React.ReactNode = null;

  switch (section.type) {
    case "hero":        content = <HeroView s={section} onCta={onCtaClick} />; break;
    case "logos":       content = <LogosView s={section} />; break;
    case "features":    content = <FeaturesView s={section} />; break;
    case "stats":       content = <StatsView s={section} />; break;
    case "testimonial": content = <TestimonialView s={section} />; break;
    case "form":        content = <FormView s={section} onLead={onLead} />; break;
    case "faq":         content = <FaqView s={section} />; break;
    case "cta":         content = <CtaView s={section} onCta={onCtaClick} />; break;
    case "pricing":     content = <PricingView s={section} />; break;
    case "survey":      content = <SurveyView s={section} onLead={onLead} />; break;
    default:            content = null; break;
  }

  if (!content) return null;

  return (
    <SectionBackgroundWrapper section={section}>
      {content}
    </SectionBackgroundWrapper>
  );
}

function MediaRenderer({ mediaType, image, videoUrl, videoAutoplay, alt = "Mídia da Campanha" }: { mediaType?: "image" | "video" | "none"; image?: string; videoUrl?: string; videoAutoplay?: boolean; alt?: string }) {
  if (mediaType === "none") return null;

  if (mediaType === "video" || (!image && videoUrl)) {
    if (!videoUrl) {
      return (
        <div className="w-full h-full flex items-center justify-center text-white/30 font-medium text-sm p-4 text-center">
          Adicione uma URL de vídeo (YouTube, Vimeo ou MP4)
        </div>
      );
    }

    // YouTube
    const ytMatch = videoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    if (ytMatch) {
      return (
        <iframe
          src={`https://www.youtube.com/embed/${ytMatch[1]}${videoAutoplay ? '?autoplay=1&mute=1' : '?autoplay=0'}&rel=0`}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={alt}
        />
      );
    }

    // Vimeo
    const vimeoMatch = videoUrl.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vimeoMatch) {
      return (
        <iframe
          src={`https://player.vimeo.com/video/${vimeoMatch[1]}${videoAutoplay ? '?autoplay=1&muted=1' : ''}`}
          className="w-full h-full border-0"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          title={alt}
        />
      );
    }

    // Direct MP4 / WebM
    return (
      <video
        src={videoUrl}
        controls
        autoPlay={videoAutoplay}
        muted={videoAutoplay}
        loop={videoAutoplay}
        className="w-full h-full object-cover"
      />
    );
  }

  // Image fallback / default
  if (image) {
    return <img src={image} alt={alt} className="w-full h-full object-cover" />;
  }

  return (
    <div className="w-full h-full flex items-center justify-center text-white/30 font-medium text-sm">
      Imagem da Campanha
    </div>
  );
}

function HeroView({ s, onCta }: { s: HeroSection; onCta?: (l: string) => void }) {
  const variant = s.layoutVariant || "split";
  const hasSecondary = !!s.secondaryImage;

  // 1. Variante Centrada (Minimalista / Direta)
  if (variant === "centered") {
    return (
      <section className="relative px-6 md:px-12 py-20 md:py-28 max-w-5xl mx-auto text-center">
        {s.eyebrow && (
          <div className="text-xs font-bold tracking-[0.2em] uppercase mb-3" style={{ color: "var(--lp-primary)" }}>
            {s.eyebrow}
          </div>
        )}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight tracking-tight max-w-4xl mx-auto">
          {s.title}
        </h1>
        <p className="mt-5 text-base md:text-xl opacity-80 leading-relaxed max-w-2xl mx-auto whitespace-pre-line">
          {s.subtitle}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          {s.ctaPrimary && (
            <button
              onClick={() => onCta?.(s.ctaPrimary)}
              className="px-8 py-4 rounded-[var(--lp-radius)] font-bold text-white shadow-2xl hover:opacity-90 active:scale-95 transition-all cursor-pointer text-base"
              style={{ background: "var(--lp-primary)" }}
            >
              {s.ctaPrimary}
            </button>
          )}
          {s.ctaSecondary && (
            <button
              onClick={() => onCta?.(s.ctaSecondary)}
              className="px-8 py-4 rounded-[var(--lp-radius)] font-medium border border-white/20 hover:bg-white/5 active:scale-95 transition-all cursor-pointer text-base"
            >
              {s.ctaSecondary}
            </button>
          )}
        </div>

        {s.image && (
          <div className="mt-12 relative max-w-4xl mx-auto">
            <div className="relative aspect-[16/9] rounded-3xl overflow-hidden border border-white/10 bg-white/5 shadow-2xl">
              <MediaRenderer
                mediaType={s.mediaType}
                image={s.image}
                videoUrl={s.videoUrl}
                videoAutoplay={s.videoAutoplay}
                alt={s.title}
              />
            </div>
            {hasSecondary && (
              <div className="absolute -bottom-6 -right-6 w-48 sm:w-64 aspect-video rounded-2xl overflow-hidden border-2 border-white/20 bg-black/60 backdrop-blur-xl shadow-2xl z-20">
                <img src={s.secondaryImage} alt="" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        )}
      </section>
    );
  }

  // 2. Variante Glass Card (Glassmorphism Frosted Container)
  if (variant === "glass-card") {
    return (
      <section className="relative px-6 md:px-12 py-16 md:py-24 max-w-6xl mx-auto">
        <div className="rounded-3xl border border-white/20 bg-white/10 backdrop-blur-2xl p-8 sm:p-12 md:p-16 shadow-[0_20px_50px_rgba(0,0,0,0.5)] grid md:grid-cols-2 gap-10 items-center">
          <div>
            {s.eyebrow && (
              <div className="inline-block px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase mb-4 bg-white/10 border border-white/20 text-white">
                {s.eyebrow}
              </div>
            )}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight tracking-tight text-white">
              {s.title}
            </h1>
            <p className="mt-4 text-base md:text-lg opacity-85 leading-relaxed text-white/90 whitespace-pre-line">
              {s.subtitle}
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              {s.ctaPrimary && (
                <button
                  onClick={() => onCta?.(s.ctaPrimary)}
                  className="px-7 py-4 rounded-[var(--lp-radius)] font-bold text-white shadow-xl hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                  style={{ background: "var(--lp-primary)" }}
                >
                  {s.ctaPrimary}
                </button>
              )}
              {s.ctaSecondary && (
                <button
                  onClick={() => onCta?.(s.ctaSecondary)}
                  className="px-7 py-4 rounded-[var(--lp-radius)] font-medium border border-white/20 bg-white/5 hover:bg-white/10 active:scale-95 transition-all cursor-pointer text-white"
                >
                  {s.ctaSecondary}
                </button>
              )}
            </div>
          </div>

          <div className="relative">
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-white/20 bg-black/40 backdrop-blur shadow-2xl">
              <MediaRenderer
                mediaType={s.mediaType}
                image={s.image}
                videoUrl={s.videoUrl}
                videoAutoplay={s.videoAutoplay}
                alt={s.title}
              />
            </div>
            {hasSecondary && (
              <div className="absolute -bottom-6 -left-6 w-44 sm:w-56 aspect-square rounded-2xl overflow-hidden border-2 border-white/20 bg-black/70 backdrop-blur-xl shadow-2xl p-2 z-20">
                <img src={s.secondaryImage} alt="" className="w-full h-full object-cover rounded-xl" />
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  // 3. Variante VSL (Vídeo de Vendas Principal)
  if (variant === "full-vsl") {
    return (
      <section className="relative px-6 md:px-12 py-16 md:py-24 max-w-5xl mx-auto text-center">
        {s.eyebrow && (
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest bg-[#FF6A00]/20 text-[#FF6A00] border border-[#FF6A00]/30 mb-4">
            🔥 {s.eyebrow}
          </div>
        )}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black leading-tight tracking-tight text-white max-w-4xl mx-auto">
          {s.title}
        </h1>
        <p className="mt-4 text-base md:text-lg opacity-80 max-w-2xl mx-auto text-white/80 whitespace-pre-line">
          {s.subtitle}
        </p>

        {/* Video / Player Container com Borda Neon */}
        <div className="mt-8 relative max-w-4xl mx-auto">
          <div className="relative aspect-video rounded-3xl overflow-hidden border-2 border-[var(--lp-primary)] shadow-[0_0_35px_rgba(255,106,0,0.3)] bg-black">
            <MediaRenderer
              mediaType={s.mediaType || "video"}
              image={s.image}
              videoUrl={s.videoUrl}
              videoAutoplay={s.videoAutoplay}
              alt={s.title}
            />
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          {s.ctaPrimary && (
            <button
              onClick={() => onCta?.(s.ctaPrimary)}
              className="w-full sm:w-auto px-10 py-5 rounded-[var(--lp-radius)] font-black text-white text-lg shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer uppercase tracking-wider"
              style={{ background: "var(--lp-primary)" }}
            >
              {s.ctaPrimary}
            </button>
          )}
          {s.ctaSecondary && (
            <button
              onClick={() => onCta?.(s.ctaSecondary)}
              className="w-full sm:w-auto px-8 py-5 rounded-[var(--lp-radius)] font-bold text-white/80 border border-white/20 hover:bg-white/10 transition-all cursor-pointer text-base"
            >
              {s.ctaSecondary}
            </button>
          )}
        </div>
      </section>
    );
  }

  // 4. Variante Layered Images ou Default Split
  const hasMedia = s.mediaType !== "none" && (!!s.image || !!s.videoUrl);

  if (!hasMedia) {
    return (
      <section className="relative px-6 md:px-12 py-20 md:py-28 max-w-5xl mx-auto text-center">
        {s.eyebrow && <div className="text-xs font-bold tracking-[0.2em] uppercase mb-3" style={{ color: "var(--lp-primary)" }}>{s.eyebrow}</div>}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight tracking-tight max-w-4xl mx-auto">{s.title}</h1>
        <p className="mt-5 text-base md:text-xl opacity-80 leading-relaxed max-w-3xl mx-auto whitespace-pre-line">{s.subtitle}</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          {s.ctaPrimary && (
            <button
              onClick={() => onCta?.(s.ctaPrimary)}
              className="px-8 py-4 rounded-[var(--lp-radius)] font-bold text-white shadow-2xl hover:opacity-90 active:scale-95 transition-all cursor-pointer text-base"
              style={{ background: "var(--lp-primary)" }}
            >
              {s.ctaPrimary}
            </button>
          )}
          {s.ctaSecondary && (
            <button
              onClick={() => onCta?.(s.ctaSecondary)}
              className="px-8 py-4 rounded-[var(--lp-radius)] font-medium border border-white/20 hover:bg-white/5 active:scale-95 transition-all cursor-pointer text-base"
            >
              {s.ctaSecondary}
            </button>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="relative px-6 md:px-12 py-16 md:py-24 grid md:grid-cols-2 gap-10 items-center max-w-7xl mx-auto">
      <div>
        {s.eyebrow && <div className="text-xs font-bold tracking-[0.2em] uppercase mb-2" style={{ color: "var(--lp-primary)" }}>{s.eyebrow}</div>}
        <h1 className="mt-2 text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight tracking-tight">{s.title}</h1>
        <p className="mt-4 text-base md:text-lg opacity-80 leading-relaxed whitespace-pre-line">{s.subtitle}</p>
        <div className="mt-8 flex flex-wrap gap-3.5">
          {s.ctaPrimary && (
            <button
              onClick={() => onCta?.(s.ctaPrimary)}
              className="px-6 py-3.5 rounded-[var(--lp-radius)] font-bold text-white shadow-xl hover:opacity-90 active:scale-95 transition-all cursor-pointer"
              style={{ background: "var(--lp-primary)" }}
            >
              {s.ctaPrimary}
            </button>
          )}
          {s.ctaSecondary && (
            <button
              onClick={() => onCta?.(s.ctaSecondary)}
              className="px-6 py-3.5 rounded-[var(--lp-radius)] font-medium border border-white/20 hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
            >
              {s.ctaSecondary}
            </button>
          )}
        </div>
      </div>

      <div className="relative">
        {/* Main Image Box */}
        <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-white/10 bg-white/5 shadow-2xl z-10">
          <MediaRenderer
            mediaType={s.mediaType}
            image={s.image}
            videoUrl={s.videoUrl}
            videoAutoplay={s.videoAutoplay}
            alt={s.title}
          />
        </div>

        {/* Layered Multi-Image (Segunda Foto com Transparência/Sombra/Amostra) */}
        {hasSecondary && (
          <div
            className={cn(
              "absolute z-20 w-48 sm:w-60 aspect-video rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl backdrop-blur-md bg-black/60 p-1.5 transition-all hover:scale-105",
              s.secondaryImagePosition === "floating-left" && "-bottom-6 -left-6",
              s.secondaryImagePosition === "behind-main" && "-top-6 -right-6 -z-10 opacity-75",
              s.secondaryImagePosition === "corner-badge" && "-top-4 -left-4 w-28 sm:w-36 aspect-square rounded-full border-4 border-[var(--lp-primary)] shadow-2xl",
              (!s.secondaryImagePosition || s.secondaryImagePosition === "floating-right") && "-bottom-6 -right-6"
            )}
          >
            <img
              src={s.secondaryImage}
              alt=""
              className={cn(
                "w-full h-full object-cover",
                s.secondaryImagePosition === "corner-badge" ? "rounded-full" : "rounded-xl"
              )}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function LogosView({ s }: { s: LogosSection }) {
  return (
    <section className="px-6 md:px-12 py-10 border-y border-white/5" style={{ background: "var(--lp-bg)" }}>
      {s.title && <div className="text-center text-xs uppercase tracking-[0.2em] opacity-70 mb-6 font-semibold">{s.title}</div>}
      <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4 opacity-80 max-w-5xl mx-auto">
        {(s.logos || []).map((l) => (
          <div key={l.id} className="font-bold text-lg md:text-xl tracking-tight text-white/80">
            {l.label}
          </div>
        ))}
      </div>
    </section>
  );
}

function FeaturesView({ s }: { s: FeaturesSection }) {
  return (
    <section className="px-6 md:px-12 py-16 md:py-24" style={{ background: "var(--lp-surface)" }}>
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight">{s.title}</h2>
        {s.subtitle && <p className="mt-3 opacity-80 text-base md:text-lg">{s.subtitle}</p>}
      </div>
      <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {(s.items || []).map((it) => (
          <div key={it.id} className="p-6 rounded-[var(--lp-radius)] border border-white/10 bg-white/[0.03] hover:border-white/20 transition-all">
            <div
              className="h-12 w-12 rounded-xl grid place-items-center font-bold text-xl mb-4"
              style={{ background: "color-mix(in oklab, var(--lp-primary) 18%, transparent)", color: "var(--lp-primary)" }}
            >
              ★
            </div>
            <h3 className="font-bold text-lg text-white">{it.title}</h3>
            <p className="mt-2 text-sm opacity-75 leading-relaxed">{it.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function StatsView({ s }: { s: StatsSection }) {
  return (
    <section className="px-6 md:px-12 py-16" style={{ background: "var(--lp-bg)" }}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-4xl mx-auto text-center">
        {(s.items || []).map((it) => (
          <div key={it.id} className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
            <div className="text-4xl md:text-5xl font-extrabold tracking-tight" style={{ color: "var(--lp-primary)" }}>{it.value}</div>
            <div className="mt-2 text-xs md:text-sm uppercase tracking-wider font-semibold opacity-75">{it.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function TestimonialView({ s }: { s: TestimonialSection }) {
  return (
    <section className="px-6 md:px-12 py-16 md:py-20" style={{ background: "var(--lp-surface)" }}>
      <div className="max-w-3xl mx-auto text-center">
        <div className="flex justify-center gap-1.5 mb-6 text-xl tracking-widest" style={{ color: "var(--lp-primary)" }}>★★★★★</div>
        <p className="text-xl md:text-2xl font-medium leading-relaxed italic">"{s.quote}"</p>
        <div className="mt-8 flex items-center justify-center gap-3.5">
          {s.avatar && <img src={s.avatar} alt="" className="h-14 w-14 rounded-full object-cover border-2 border-white/10 shadow-lg" />}
          <div className="text-left">
            <div className="font-bold text-white text-base">{s.author}</div>
            <div className="text-xs opacity-70">{s.role}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FormView({ s, onLead }: { s: FormSection; onLead?: PublicRendererProps["onLead"] }) {
  const [data, setData] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);
  return (
    <section className="px-6 md:px-12 py-16 md:py-24" style={{ background: "linear-gradient(135deg, var(--lp-surface), var(--lp-bg))" }}>
      <div className="max-w-xl mx-auto rounded-[var(--lp-radius)] border border-white/10 bg-white/[0.04] p-6 md:p-10 backdrop-blur shadow-2xl">
        {sent ? (
          <div className="text-center py-10 space-y-4">
            <div className="h-16 w-16 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 grid place-items-center text-3xl font-bold">✓</div>
            <h3 className="text-2xl font-bold text-white">Solicitação Recebida!</h3>
            <p className="opacity-80 text-sm">{s.successMsg}</p>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onLead?.(data, { section: "form" });
              setSent(true);
            }}
          >
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">{s.title}</h2>
            {s.subtitle && <p className="mt-2 opacity-75 text-sm md:text-base leading-relaxed">{s.subtitle}</p>}
            <div className="mt-6 space-y-4">
              {(s.fields || []).map((f) => (
                <div key={f.id}>
                  <label className="block text-xs font-semibold uppercase tracking-wider opacity-75 mb-1.5">{f.label}</label>
                  {f.type === "textarea" ? (
                    <textarea
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-[var(--lp-radius)] px-3.5 py-3 text-sm text-white focus:outline-none focus:border-white/30"
                      rows={3}
                      onChange={(e) => setData((d) => ({ ...d, [f.label]: e.target.value }))}
                    />
                  ) : (
                    <input
                      required
                      type={f.type}
                      className="w-full bg-white/5 border border-white/10 rounded-[var(--lp-radius)] px-3.5 py-3 text-sm text-white focus:outline-none focus:border-white/30"
                      onChange={(e) => setData((d) => ({ ...d, [f.label]: e.target.value }))}
                    />
                  )}
                </div>
              ))}
            </div>
            <button
              type="submit"
              className="mt-6 w-full py-3.5 rounded-[var(--lp-radius)] font-bold text-white shadow-xl hover:opacity-90 active:scale-98 transition-all cursor-pointer text-base"
              style={{ background: "var(--lp-primary)" }}
            >
              {s.button}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

function FaqView({ s }: { s: FaqSection }) {
  return (
    <section className="px-6 md:px-12 py-16 md:py-20" style={{ background: "var(--lp-bg)" }}>
      <h2 className="text-2xl md:text-4xl font-extrabold text-center tracking-tight">{s.title}</h2>
      <div className="mt-10 max-w-3xl mx-auto space-y-3.5">
        {(s.items || []).map((it) => (
          <details key={it.id} className="p-5 rounded-[var(--lp-radius)] border border-white/10 bg-white/[0.03] group transition-all">
            <summary className="font-semibold text-base cursor-pointer text-white list-none flex items-center justify-between">
              <span>{it.q}</span>
              <span className="text-sm font-bold opacity-60 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <p className="mt-3 text-sm opacity-75 leading-relaxed pt-2 border-t border-white/5">{it.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function CtaView({ s, onCta }: { s: CtaSection; onCta?: (l: string) => void }) {
  return (
    <section
      className="px-6 md:px-12 py-16 md:py-24 text-center relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, var(--lp-primary), color-mix(in oklab, var(--lp-primary) 60%, black))`,
        color: "#fff",
      }}
    >
      <div className="max-w-3xl mx-auto relative z-10">
        <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight">{s.title}</h2>
        {s.subtitle && <p className="mt-4 opacity-90 text-base md:text-lg max-w-xl mx-auto leading-relaxed">{s.subtitle}</p>}
        <button
          onClick={() => onCta?.(s.button)}
          className="mt-8 px-8 py-4 rounded-[var(--lp-radius)] font-bold bg-white text-black shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer text-base"
        >
          {s.button}
        </button>
      </div>
    </section>
  );
}

function PricingView({ s }: { s: PricingSection }) {
  return (
    <section className="px-6 md:px-12 py-16 md:py-24" style={{ background: "var(--lp-surface)" }}>
      <h2 className="text-2xl md:text-4xl font-extrabold text-center tracking-tight">{s.title}</h2>
      <div className="mt-12 grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {(s.plans || []).map((p) => (
          <div
            key={p.id}
            className={`rounded-[var(--lp-radius)] p-8 border bg-white/[0.03] flex flex-col justify-between transition-all ${
              p.highlight ? "border-[color:var(--lp-primary)] shadow-2xl scale-105 bg-white/[0.05]" : "border-white/10 hover:border-white/20"
            }`}
          >
            <div>
              <div className="text-xs uppercase tracking-widest font-bold opacity-80" style={{ color: p.highlight ? "var(--lp-primary)" : "inherit" }}>
                {p.name}
              </div>
              <div className="mt-4 flex items-baseline gap-1.5">
                <div className="text-4xl font-black text-white">{p.price}</div>
                <div className="opacity-60 text-sm font-medium">{p.per}</div>
              </div>
              <ul className="mt-6 space-y-3 text-sm">
                {(p.features || []).map((f, fi) => (
                  <li key={fi} className="flex items-start gap-2.5 opacity-85">
                    <span style={{ color: "var(--lp-primary)" }} className="font-bold">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
            <button
              className="mt-8 w-full py-3 rounded-[var(--lp-radius)] font-bold text-sm text-white cursor-pointer transition-all hover:opacity-90"
              style={{ background: p.highlight ? "var(--lp-primary)" : "rgba(255,255,255,0.1)" }}
            >
              Selecionar {p.name}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function SurveyView({ s, onLead }: { s: SurveySection; onLead?: PublicRendererProps["onLead"] }) {
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const questions = s.questions || [];

  function isValid(q: SurveyQuestion) {
    if (!q.required) return true;
    const v = answers[q.id];
    if (v == null) return false;
    if (typeof v === "string") return v.trim().length > 0;
    if (Array.isArray(v)) return v.length > 0;
    return true;
  }

  function submit() {
    onLead?.(answers, { section: "survey" });
    setDone(true);
  }

  if (done) {
    return (
      <section className="px-6 md:px-12 py-20 text-center" style={{ background: "var(--lp-surface)" }}>
        <div className="max-w-lg mx-auto space-y-4">
          <div className="text-5xl animate-bounce">🎉</div>
          <h2 className="text-3xl font-extrabold text-white">Respostas Enviadas com Sucesso!</h2>
          <p className="opacity-80 text-base leading-relaxed">{s.successMsg}</p>
          {s.reward && (
            <div className="mt-6 inline-block rounded-[var(--lp-radius)] border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-amber-300">
              🎁 Recompensa: {s.reward}
            </div>
          )}
        </div>
      </section>
    );
  }

  if (questions.length === 0) return null;

  const isStepper = s.layout === "stepper";
  const current = questions[step] || questions[0];

  return (
    <section className="px-6 md:px-12 py-16 md:py-24" style={{ background: "var(--lp-surface)" }}>
      <div className="max-w-xl mx-auto rounded-[var(--lp-radius)] border border-white/10 bg-white/[0.04] p-6 md:p-10 shadow-2xl backdrop-blur">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">{s.title}</h2>
        {s.subtitle && <p className="mt-2 opacity-75 text-sm md:text-base leading-relaxed">{s.subtitle}</p>}

        {isStepper && (
          <div className="mt-6">
            <div className="flex justify-between text-xs opacity-70 mb-2 uppercase tracking-wider font-semibold">
              <span>Etapa {step + 1} de {questions.length}</span>
              <span>{Math.round(((step + 1) / questions.length) * 100)}%</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-300"
                style={{ width: `${((step + 1) / questions.length) * 100}%`, background: "var(--lp-primary)" }}
              />
            </div>
          </div>
        )}

        <div className="mt-8 space-y-6">
          {(isStepper ? [current] : questions).map((q) => (
            <div key={q.id} className="space-y-3">
              <div className="text-base font-semibold text-white">
                {q.label} {q.required && <span style={{ color: "var(--lp-primary)" }}>*</span>}
              </div>
              {q.description && <div className="text-xs opacity-60 leading-relaxed">{q.description}</div>}
              
              {/* Renderização condicional por tipo de questão */}
              {q.type === "single" || q.type === "dropdown" ? (
                <div className="grid gap-2">
                  {(q.options || []).map((opt) => {
                    const isSelected = answers[q.id] === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                        className={`w-full text-left px-4 py-3 rounded-[var(--lp-radius)] border text-sm font-medium transition-all cursor-pointer ${
                          isSelected
                            ? "border-[color:var(--lp-primary)] bg-[color:var(--lp-primary)]/20 text-white"
                            : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              ) : q.type === "multi" ? (
                <div className="grid gap-2">
                  {(q.options || []).map((opt) => {
                    const list = (answers[q.id] as string[]) || [];
                    const isSelected = list.includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          const next = isSelected ? list.filter((x) => x !== opt) : [...list, opt];
                          setAnswers((a) => ({ ...a, [q.id]: next }));
                        }}
                        className={`w-full text-left px-4 py-3 rounded-[var(--lp-radius)] border text-sm font-medium transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? "border-[color:var(--lp-primary)] bg-[color:var(--lp-primary)]/20 text-white"
                            : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
                        }`}
                      >
                        <span>{opt}</span>
                        {isSelected && <span className="font-bold">✓</span>}
                      </button>
                    );
                  })}
                </div>
              ) : q.type === "rating" || q.type === "nps" ? (
                <div className="flex flex-wrap gap-2 justify-center py-2">
                  {[1, 2, 3, 4, 5, ...(q.type === "nps" ? [6, 7, 8, 9, 10] : [])].map((num) => {
                    const isSelected = answers[q.id] === num;
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setAnswers((a) => ({ ...a, [q.id]: num }))}
                        className={`h-11 w-11 rounded-[var(--lp-radius)] font-bold text-sm border transition-all cursor-pointer ${
                          isSelected
                            ? "border-[color:var(--lp-primary)] bg-[color:var(--lp-primary)] text-white shadow-lg scale-105"
                            : "border-white/10 bg-white/5 text-white hover:bg-white/10"
                        }`}
                      >
                        {num}
                      </button>
                    );
                  })}
                </div>
              ) : q.type === "yesno" ? (
                <div className="grid grid-cols-2 gap-3">
                  {["Sim", "Não"].map((opt) => {
                    const isSelected = answers[q.id] === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                        className={`py-3.5 rounded-[var(--lp-radius)] font-bold text-sm border transition-all cursor-pointer ${
                          isSelected
                            ? "border-[color:var(--lp-primary)] bg-[color:var(--lp-primary)]/20 text-white"
                            : "border-white/10 bg-white/5 text-white hover:bg-white/10"
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              ) : q.type === "long" ? (
                <textarea
                  placeholder={q.placeholder}
                  value={(answers[q.id] as string) ?? ""}
                  onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-[var(--lp-radius)] px-3.5 py-3 text-sm text-white focus:outline-none focus:border-white/30"
                  rows={3}
                />
              ) : (
                <input
                  type={q.type === "email" ? "email" : q.type === "phone" ? "tel" : q.type === "date" ? "date" : "text"}
                  placeholder={q.placeholder}
                  value={(answers[q.id] as string) ?? ""}
                  onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-[var(--lp-radius)] px-3.5 py-3 text-sm text-white focus:outline-none focus:border-white/30"
                />
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 flex items-center justify-between gap-3 pt-4 border-t border-white/10">
          {isStepper && step > 0 ? (
            <button
              onClick={() => setStep((v) => v - 1)}
              className="px-5 py-2.5 rounded-[var(--lp-radius)] text-sm font-medium border border-white/20 hover:bg-white/5 cursor-pointer"
            >
              Voltar
            </button>
          ) : (
            <span />
          )}
          {isStepper && step < questions.length - 1 ? (
            <button
              disabled={!isValid(current)}
              onClick={() => setStep((v) => v + 1)}
              className="px-6 py-2.5 rounded-[var(--lp-radius)] text-sm font-bold text-white disabled:opacity-40 cursor-pointer shadow-lg"
              style={{ background: "var(--lp-primary)" }}
            >
              Continuar →
            </button>
          ) : (
            <button
              disabled={questions.some((q) => !isValid(q))}
              onClick={submit}
              className="px-6 py-2.5 rounded-[var(--lp-radius)] text-sm font-bold text-white disabled:opacity-40 cursor-pointer shadow-lg"
              style={{ background: "var(--lp-primary)" }}
            >
              {s.submitButton || "Enviar Respostas"}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
