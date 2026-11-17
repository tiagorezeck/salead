import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useBrandStore, LOGO_EDITOR_ENABLED } from "@/lib/brand-store";

export const OFFICIAL_BRAND_IMAGES = {
  logoLight: "/assets/aistudio/salead.claro_fe87b055.png",
  logoDark: "/assets/aistudio/salead.escuro_9e009b96.png",
  iconLight: "/assets/aistudio/image_6da71357.png",
  iconDark: "/assets/aistudio/image_195f4bb1.png",
} as const;

interface BrandIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number | string;
}

/**
 * Exact Vector Representation of the SALEAD Icon (Shopping Bag with Dynamic Arrow)
 * Matches logo salead icone.svg and Image 3 (Salead claro.png)
 */
/**
 * Professional Generic Vector Icon for "SALEAD"
 */
export function SaleadIcon({ className, size, isDark = false, ...props }: BrandIconProps & { isDark?: boolean }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0 select-none", className)}
      style={size ? { width: size, height: size } : undefined}
      {...props}
    >
      <defs>
        <linearGradient id="seu-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#EA580C" />
        </linearGradient>
      </defs>

      {/* Outer rounded orange box */}
      <rect
        x="8"
        y="8"
        width="84"
        height="84"
        rx="22"
        fill="url(#seu-logo-grad)"
      />

      {/* Image frame / Logo mark emblem */}
      <rect
        x="24"
        y="24"
        width="52"
        height="52"
        rx="12"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="3.5"
        strokeDasharray="6 4"
        strokeOpacity="0.85"
      />

      {/* Mountain / Diamond shape emblem */}
      <path
        d="M 34 62 L 46 44 L 56 56 L 66 48 L 72 62 Z"
        fill="#FFFFFF"
        fillOpacity="0.95"
      />
      <circle cx="62" cy="38" r="5" fill="#FFFFFF" fillOpacity="0.95" />
    </svg>
  );
}

/**
 * Vector Typography for "Seu logo Aqui"
 */
export function SaleadTextLogo({ 
  className, 
  isDark = false, 
  ...props 
}: React.SVGProps<SVGSVGElement> & { isDark?: boolean }) {
  return (
    <svg
      viewBox="0 0 290 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("select-none", className)}
      {...props}
    >
      <text
        x="0"
        y="35"
        fill={isDark ? "#F8FAFC" : "#0F172A"}
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        fontWeight="800"
        fontSize="34"
        letterSpacing="-0.5"
      >
        Seu
      </text>
      <text
        x="64"
        y="35"
        fill="#F97316"
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        fontWeight="800"
        fontSize="34"
        letterSpacing="-0.5"
      >
        logo
      </text>
      <text
        x="138"
        y="35"
        fill={isDark ? "#94A3B8" : "#64748B"}
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        fontWeight="700"
        fontSize="34"
        letterSpacing="-0.5"
      >
        Aqui
      </text>
    </svg>
  );
}

// Alias for backwards compatibility across older imports
export const CommercialThriveIcon = SaleadIcon;

export function useIsDarkMode(): boolean {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return document.documentElement.classList.contains("dark");
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const check = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    window.addEventListener("storage", check);
    return () => {
      observer.disconnect();
      window.removeEventListener("storage", check);
    };
  }, []);

  return isDark;
}

export interface BrandLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  textClassName?: string;
  subtextClassName?: string;
  variant?: "badge" | "clean" | "glass";
  allowCustomize?: boolean;
  theme?: "auto" | "light" | "dark";
}

export function BrandLogo({
  className,
  size = "md",
  showText = true,
  subtextClassName,
  variant = "clean",
  allowCustomize = false,
  theme = "auto",
}: BrandLogoProps) {
  const store = useBrandStore();
  const isSystemDark = useIsDarkMode();
  const isDark = theme === "dark" ? true : theme === "light" ? false : isSystemDark;
  const canCustomize = LOGO_EDITOR_ENABLED && allowCustomize;

  if (!LOGO_EDITOR_ENABLED) {
    const scaleFactor =
      size === "sm" ? 0.78 : size === "lg" ? 1.35 : size === "xl" ? 1.65 : 1;

    const imgSrc = showText
      ? isDark
        ? OFFICIAL_BRAND_IMAGES.logoDark
        : OFFICIAL_BRAND_IMAGES.logoLight
      : isDark
      ? OFFICIAL_BRAND_IMAGES.iconDark
      : OFFICIAL_BRAND_IMAGES.iconLight;

    const baseHeight = showText ? (isDark ? 42 : 54) : isDark ? 32 : 30;
    const heightPx = Math.round(baseHeight * scaleFactor);

    return (
      <div
        className={cn(
          "flex items-center justify-center select-none shrink-0 max-w-full",
          className
        )}
      >
        <img
          src={imgSrc}
          alt="SALEAD"
          style={{ height: `${heightPx}px`, width: "auto" }}
          className="max-w-full object-contain select-none"
          draggable={false}
        />
      </div>
    );
  }

  const baseIcon = isDark ? (store.darkIconHeightPx || store.iconHeightPx || 50) : (store.iconHeightPx || 50);
  const baseText = isDark ? (store.darkTextHeightPx || store.textHeightPx || 35) : (store.textHeightPx || 35);
  const baseFull = isDark ? (store.darkFullLogoHeightPx || store.fullLogoHeightPx || 50) : (store.fullLogoHeightPx || 50);
  const currentGap = isDark ? (store.darkGapPx !== undefined ? store.darkGapPx : store.gapPx) : store.gapPx;
  const currentSubFontSize = isDark ? (store.darkSubtitleFontSizePx || store.subtitleFontSizePx) : store.subtitleFontSizePx;

  const sizeMap = {
    sm: { iconHeight: Math.round(baseIcon * 0.75), textHeight: Math.round(baseText * 0.75), sub: "text-[8px]" },
    md: { iconHeight: baseIcon, textHeight: baseText, sub: "text-[10px]" },
    lg: { iconHeight: Math.round(baseIcon * 1.3), textHeight: Math.round(baseText * 1.3), sub: "text-[12px]" },
    xl: { iconHeight: Math.round(baseIcon * 1.6), textHeight: Math.round(baseText * 1.6), sub: "text-sm" },
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  // Unified mode (icon + text together)
  if (store.mode === "unified") {
    const hasDarkFull = isDark && (store.darkFullLogoSvgRaw || store.darkFullLogoDataUrl);
    const svgRaw = hasDarkFull ? store.darkFullLogoSvgRaw : store.fullLogoSvgRaw;
    const dataUrl = hasDarkFull ? store.darkFullLogoDataUrl : store.fullLogoDataUrl;

    if (svgRaw || dataUrl) {
      return (
        <div 
          className={cn(
            "flex items-center select-none shrink-0 group relative",
            canCustomize && "cursor-pointer",
            className
          )}
          onDoubleClick={canCustomize ? (e) => {
            e.stopPropagation();
            store.openModal();
          } : undefined}
          title={canCustomize ? "Dê um clique duplo (2x) para personalizar a logo" : undefined}
        >
          <div style={{ height: `${baseFull}px` }} className="flex items-center">
            {svgRaw ? (
              <div
                className={cn(
                  "h-full w-auto flex items-center [&>svg]:h-full [&>svg]:w-auto [&>svg]:object-contain",
                  isDark && !hasDarkFull && store.autoAdaptDark && "filter brightness-0 invert"
                )}
                dangerouslySetInnerHTML={{ __html: svgRaw }}
              />
            ) : (
              <img
                src={dataUrl}
                alt="Logo"
                className={cn(
                  "h-full w-auto object-contain",
                  isDark && !hasDarkFull && store.autoAdaptDark && "filter brightness-0 invert"
                )}
              />
            )}
          </div>
        </div>
      );
    }
  }

  // Render Icon (custom SVG, custom Image, or Builtin)
  const renderIcon = () => {
    // Dark mode specific override
    if (isDark && store.darkIconSource === "custom_svg" && store.darkIconSvgRaw) {
      return (
        <div
          style={{ height: `${currentSize.iconHeight}px` }}
          className="w-auto flex items-center [&>svg]:h-full [&>svg]:w-auto [&>svg]:object-contain"
          dangerouslySetInnerHTML={{ __html: store.darkIconSvgRaw }}
        />
      );
    }
    if (isDark && store.darkIconSource === "custom_url" && store.darkIconDataUrl) {
      return (
        <img
          src={store.darkIconDataUrl}
          alt="Ícone"
          style={{ height: `${currentSize.iconHeight}px` }}
          className="w-auto object-contain"
        />
      );
    }

    // Standard Icon
    if (store.iconSource === "custom_svg" && store.iconSvgRaw) {
      return (
        <div
          style={{ height: `${currentSize.iconHeight}px` }}
          className="w-auto flex items-center [&>svg]:h-full [&>svg]:w-auto [&>svg]:object-contain"
          dangerouslySetInnerHTML={{ __html: store.iconSvgRaw }}
        />
      );
    }
    if (store.iconSource === "custom_url" && store.iconDataUrl) {
      return (
        <img
          src={store.iconDataUrl}
          alt="Ícone"
          style={{ height: `${currentSize.iconHeight}px` }}
          className="w-auto object-contain"
        />
      );
    }
    return (
      <div style={{ height: `${currentSize.iconHeight}px` }} className="w-auto flex items-center">
        <SaleadIcon isDark={isDark} className="h-full w-auto object-contain filter drop-shadow-sm" />
      </div>
    );
  };

  // Render Text (custom SVG, custom Image, or Builtin)
  const renderText = () => {
    // Dark mode specific override
    if (isDark && store.darkTextSource === "custom_svg" && store.darkTextSvgRaw) {
      return (
        <div
          style={{ height: `${currentSize.textHeight}px` }}
          className="w-auto flex items-center [&>svg]:h-full [&>svg]:w-auto [&>svg]:object-contain"
          dangerouslySetInnerHTML={{ __html: store.darkTextSvgRaw }}
        />
      );
    }
    if (isDark && store.darkTextSource === "custom_url" && store.darkTextDataUrl) {
      return (
        <img
          src={store.darkTextDataUrl}
          alt="SALEAD"
          style={{ height: `${currentSize.textHeight}px` }}
          className="w-auto object-contain"
        />
      );
    }

    // Standard Text
    if (store.textSource === "custom_svg" && store.textSvgRaw) {
      return (
        <div
          style={{ height: `${currentSize.textHeight}px` }}
          className={cn(
            "w-auto flex items-center [&>svg]:h-full [&>svg]:w-auto [&>svg]:object-contain",
            isDark && store.autoAdaptDark && "filter brightness-0 invert"
          )}
          dangerouslySetInnerHTML={{ __html: store.textSvgRaw }}
        />
      );
    }
    if (store.textSource === "custom_url" && store.textDataUrl) {
      return (
        <img
          src={store.textDataUrl}
          alt="SALEAD"
          style={{ height: `${currentSize.textHeight}px` }}
          className={cn(
            "w-auto object-contain",
            isDark && store.autoAdaptDark && "filter brightness-0 invert"
          )}
        />
      );
    }
    return (
      <div style={{ height: `${currentSize.textHeight}px` }} className="w-auto flex items-center">
        <SaleadTextLogo isDark={isDark} className="h-full w-auto object-contain" />
      </div>
    );
  };

  const shouldShowIcon = store.mode !== "text_only";
  const shouldShowText = showText && store.mode !== "icon_only";

  return (
    <div 
      className={cn(
        "flex items-center select-none shrink-0 group relative",
        canCustomize && "cursor-pointer",
        className
      )}
      style={{ gap: `${currentGap || 12}px` }}
      onDoubleClick={canCustomize ? (e) => {
        e.stopPropagation();
        store.openModal();
      } : undefined}
      title={canCustomize ? "Dê um clique duplo (2x) para personalizar a logo" : undefined}
    >
      {/* Icon Symbol */}
      {shouldShowIcon && (
        <div
          className={cn(
            "relative flex items-center justify-center shrink-0 transition-transform",
            variant === "badge" && "p-1 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-orange-500/30 shadow-sm",
            variant === "glass" && "p-1 rounded-xl bg-background/80 backdrop-blur border border-border shadow-sm",
            variant === "clean" && "p-0"
          )}
        >
          {renderIcon()}
        </div>
      )}

      {/* Styled Vector Brand Typography */}
      {shouldShowText && (
        <div className="flex flex-col justify-center min-w-0">
          {renderText()}
          {store.showSubtitle && Boolean(store.subtitle && store.subtitle.trim().length > 0) && (
            <span 
              className={cn(
                "font-normal tracking-[0.05em] select-none transition-colors",
                isDark ? "text-zinc-200" : "text-[#2D3136]",
                !currentSubFontSize && currentSize.sub,
                subtextClassName
              )}
              style={
                currentSubFontSize
                  ? { fontSize: `${currentSubFontSize}px`, marginTop: "3px" }
                  : { marginTop: "3px" }
              }
            >
              {store.subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function BrandIconOnly({ 
  className, 
  size = "md", 
  theme = "auto" 
}: { 
  className?: string; 
  size?: "sm" | "md" | "lg"; 
  theme?: "auto" | "light" | "dark" 
}) {
  const store = useBrandStore();
  const isSystemDark = useIsDarkMode();
  const isDark = theme === "dark" ? true : theme === "light" ? false : isSystemDark;

  if (!LOGO_EDITOR_ENABLED) {
    const iconHeightMap = { sm: 24, md: isDark ? 32 : 30, lg: 40 };
    return (
      <img
        src={isDark ? OFFICIAL_BRAND_IMAGES.iconDark : OFFICIAL_BRAND_IMAGES.iconLight}
        alt="SALEAD"
        style={{ height: `${iconHeightMap[size]}px`, width: "auto" }}
        className={cn("shrink-0 max-w-full object-contain select-none", className)}
        draggable={false}
      />
    );
  }

  const heightMap = { sm: 28, md: store.iconHeightPx || 36, lg: 44 };
  const h = heightMap[size];

  if (isDark && store.darkIconSource === "custom_svg" && store.darkIconSvgRaw) {
    return (
      <div 
        style={{ height: `${h}px` }} 
        className={cn("shrink-0 flex items-center [&>svg]:h-full [&>svg]:w-auto [&>svg]:object-contain", className)}
        dangerouslySetInnerHTML={{ __html: store.darkIconSvgRaw }}
      />
    );
  }

  if (isDark && store.darkIconSource === "custom_url" && store.darkIconDataUrl) {
    return (
      <img
        src={store.darkIconDataUrl}
        alt="Ícone"
        style={{ height: `${h}px` }}
        className={cn("shrink-0 w-auto object-contain", className)}
      />
    );
  }

  if (store.iconSource === "custom_svg" && store.iconSvgRaw) {
    return (
      <div 
        style={{ height: `${h}px` }} 
        className={cn("shrink-0 flex items-center [&>svg]:h-full [&>svg]:w-auto [&>svg]:object-contain", className)}
        dangerouslySetInnerHTML={{ __html: store.iconSvgRaw }}
      />
    );
  }

  if (store.iconSource === "custom_url" && store.iconDataUrl) {
    return (
      <img
        src={store.iconDataUrl}
        alt="Ícone"
        style={{ height: `${h}px` }}
        className={cn("shrink-0 w-auto object-contain", className)}
      />
    );
  }

  return (
    <div style={{ height: `${h}px` }} className={cn("shrink-0 relative flex items-center justify-center", className)}>
      <SaleadIcon isDark={isDark} className="h-full w-auto object-contain filter drop-shadow-sm" />
    </div>
  );
}
