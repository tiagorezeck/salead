import React from "react";
import {
  VisualImageEffects,
  VisualTransform,
  VisualMaskShape,
  VisualTextCustomStyle,
  ElementOffset,
  CustomElementStyleRecord,
} from "../types/landingPage";

export const SHAPE_MASK_PRESETS = [
  { id: "none", label: "Padrão (Sem Máscara)", icon: "Square" },
  { id: "rectangle", label: "Retângulo Puro", icon: "Square" },
  { id: "rounded", label: "Cantos Arredondados", icon: "SquareCheck" },
  { id: "circle", label: "Círculo / Oval", icon: "Circle" },
  { id: "pill", label: "Pílula / Badge", icon: "Capsule" },
  { id: "squircle", label: "Squircle (Suave)", icon: "Sparkles" },
  { id: "shield", label: "Escudo / Selo", icon: "Shield" },
  { id: "diamond", label: "Losango", icon: "Diamond" },
  { id: "hexagon", label: "Hexágono", icon: "Hexagon" },
  { id: "star", label: "Estrela Dourada", icon: "Star" },
  { id: "wave", label: "Corte em Onda", icon: "Waves" },
] as const;

export const DROP_SHADOW_PRESETS = [
  { id: "none", label: "Sem Sombra", value: undefined },
  { id: "soft", label: "Sombra Suave", x: 0, y: 10, blur: 25, spread: -5, color: "rgba(0, 0, 0, 0.25)" },
  { id: "medium", label: "Sombra Média", x: 0, y: 20, blur: 40, spread: -10, color: "rgba(0, 0, 0, 0.45)" },
  { id: "hard", label: "Sombra Intensa", x: 0, y: 25, blur: 50, spread: 0, color: "rgba(0, 0, 0, 0.75)" },
  { id: "neon_purple", label: "Glow Roxo Neon", x: 0, y: 0, blur: 30, spread: 5, color: "rgba(168, 85, 247, 0.7)" },
  { id: "neon_cyan", label: "Glow Ciano Elétrico", x: 0, y: 0, blur: 30, spread: 5, color: "rgba(6, 182, 212, 0.7)" },
  { id: "neon_emerald", label: "Glow Esmeralda", x: 0, y: 0, blur: 30, spread: 5, color: "rgba(16, 185, 129, 0.7)" },
  { id: "neon_amber", label: "Glow Dourado", x: 0, y: 0, blur: 30, spread: 5, color: "rgba(245, 158, 11, 0.7)" },
  { id: "glow_white", label: "Brilho Branco Puro", x: 0, y: 0, blur: 25, spread: 2, color: "rgba(255, 255, 255, 0.6)" },
] as const;

export const FONT_FAMILY_PRESETS = [
  { id: "inherit", label: "Padrão do Tema", value: "inherit" },
  { id: "sans", label: "Modern Sans (Inter / Plus Jakarta)", value: "'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif" },
  { id: "display", label: "Display Bold (Syne / Montserrat)", value: "'Syne', 'Montserrat', system-ui, sans-serif" },
  { id: "serif", label: "Serif Editorial (Playfair / Merriweather)", value: "'Playfair Display', 'Merriweather', Georgia, serif" },
  { id: "mono", label: "Tech Mono (JetBrains / Space)", value: "'JetBrains Mono', 'Space Grotesk', monospace" },
  { id: "futuristic", label: "Cyber Modern (Cabinet / Sora)", value: "'Sora', 'Cabinet Grotesk', system-ui, sans-serif" },
] as const;

export const GRADIENT_TEXT_PRESETS = [
  { id: "purple_cyan", label: "Roxo para Ciano", value: "linear-gradient(135deg, #A855F7 0%, #06B6D4 100%)" },
  { id: "gold_amber", label: "Ouro & Âmbar", value: "linear-gradient(135deg, #FCD34D 0%, #F59E0B 50%, #D97706 100%)" },
  { id: "emerald_teal", label: "Esmeralda & Verde Água", value: "linear-gradient(135deg, #34D399 0%, #059669 100%)" },
  { id: "sunset_fire", label: "Pôr do Sol & Fogo", value: "linear-gradient(135deg, #FF6A00 0%, #EE0979 100%)" },
  { id: "electric_blue", label: "Azul Elétrico & Roxo", value: "linear-gradient(135deg, #38BDF8 0%, #818CF8 50%, #C084FC 100%)" },
  { id: "platinum_white", label: "Platina & Branco Metálico", value: "linear-gradient(135deg, #FFFFFF 0%, #CBD5E1 50%, #94A3B8 100%)" },
  { id: "holographic", label: "Holográfico Neon", value: "linear-gradient(90deg, #F43F5E, #EC4899, #8B5CF6, #3B82F6, #10B981)" },
] as const;

/**
 * Generates CSS clip-path value based on shape mask configuration
 */
export function getMaskClipPath(mask?: VisualMaskShape): string | undefined {
  if (!mask || !mask.type || mask.type === "none") return undefined;

  switch (mask.type) {
    case "rectangle":
      return "inset(0% round 0px)";
    case "rounded":
      return `inset(0% round ${mask.borderRadius ?? 24}px)`;
    case "circle":
      return "circle(50% at 50% 50%)";
    case "pill":
      return "inset(0% round 9999px)";
    case "squircle":
      return `inset(0% round ${mask.borderRadius ?? 32}px)`;
    case "shield":
      return "polygon(0% 0%, 100% 0%, 100% 75%, 50% 100%, 0% 75%)";
    case "diamond":
      return "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)";
    case "hexagon":
      return "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)";
    case "star":
      return "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)";
    case "wave":
      return "polygon(0% 0%, 100% 0%, 100% 85%, 75% 95%, 50% 85%, 25% 95%, 0% 85%)";
    case "blob":
      return "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)";
    case "custom":
      return mask.customClipPath || undefined;
    default:
      return undefined;
  }
}

/**
 * Builds CSS filter & appearance properties from VisualImageEffects
 */
export function getEffectsCss(effects?: VisualImageEffects): React.CSSProperties {
  if (!effects) return {};

  const filters: string[] = [];

  if (effects.blur !== undefined && effects.blur > 0) {
    filters.push(`blur(${effects.blur}px)`);
  }
  if (effects.brightness !== undefined && effects.brightness !== 100) {
    filters.push(`brightness(${effects.brightness}%)`);
  }
  if (effects.contrast !== undefined && effects.contrast !== 100) {
    filters.push(`contrast(${effects.contrast}%)`);
  }
  if (effects.saturate !== undefined && effects.saturate !== 100) {
    filters.push(`saturate(${effects.saturate}%)`);
  }
  if (effects.grayscale !== undefined && effects.grayscale > 0) {
    filters.push(`grayscale(${effects.grayscale}%)`);
  }
  if (effects.sepia !== undefined && effects.sepia > 0) {
    filters.push(`sepia(${effects.sepia}%)`);
  }
  if (effects.hueRotate !== undefined && effects.hueRotate !== 0) {
    filters.push(`hue-rotate(${effects.hueRotate}deg)`);
  }
  if (effects.invert !== undefined && effects.invert > 0) {
    filters.push(`invert(${effects.invert}%)`);
  }

  // Drop Shadow
  if (effects.dropShadow?.enabled !== false && effects.dropShadow) {
    const ds = effects.dropShadow;
    const x = ds.x ?? 0;
    const y = ds.y ?? 10;
    const blur = ds.blur ?? 20;
    const color = ds.color ?? "rgba(0,0,0,0.5)";
    filters.push(`drop-shadow(${x}px ${y}px ${blur}px ${color})`);
  }

  // Glow
  if (effects.glow?.enabled && effects.glow.color) {
    const intensity = effects.glow.intensity ?? 16;
    filters.push(`drop-shadow(0px 0px ${intensity}px ${effects.glow.color})`);
  }

  const cssStyle: React.CSSProperties = {};

  if (filters.length > 0) {
    cssStyle.filter = filters.join(" ");
  }

  if (effects.opacity !== undefined && effects.opacity < 100) {
    cssStyle.opacity = Math.max(0, Math.min(1, effects.opacity / 100));
  }

  if (effects.border?.enabled && effects.border.width) {
    cssStyle.border = `${effects.border.width}px ${effects.border.style || "solid"} ${effects.border.color || "rgba(255,255,255,0.2)"}`;
  }

  return cssStyle;
}

/**
 * Builds CSS transform string and dimensions from VisualTransform & ElementOffset
 */
export function getTransformCss(
  transform?: VisualTransform,
  offset?: ElementOffset
): React.CSSProperties {
  const transformParts: string[] = [];

  const offsetX = offset?.x ?? 0;
  const offsetY = offset?.y ?? 0;
  if (offsetX !== 0 || offsetY !== 0) {
    transformParts.push(`translate(${offsetX}px, ${offsetY}px)`);
  }

  const scale = transform?.scale ?? 1;
  const scaleX = (transform?.scaleX ?? 1) * scale;
  const scaleY = (transform?.scaleY ?? 1) * scale;
  if (scaleX !== 1 || scaleY !== 1) {
    transformParts.push(`scale(${scaleX}, ${scaleY})`);
  }

  const rotate = transform?.rotate ?? 0;
  if (rotate !== 0) {
    transformParts.push(`rotate(${rotate}deg)`);
  }

  const skewX = transform?.skewX ?? 0;
  const skewY = transform?.skewY ?? 0;
  if (skewX !== 0 || skewY !== 0) {
    transformParts.push(`skew(${skewX}deg, ${skewY}deg)`);
  }

  const style: React.CSSProperties = {
    maxWidth: "100%",
    boxSizing: "border-box",
  };

  if (transformParts.length > 0) {
    style.transform = transformParts.join(" ");
  }

  if (transform?.customWidthPx) {
    style.width = `min(${transform.customWidthPx}px, 100%)`;
  }
  if (transform?.customHeightPx) {
    style.height = `${transform.customHeightPx}px`;
    style.maxHeight = "100%";
  }

  if (transform?.aspectRatio && transform.aspectRatio !== "auto") {
    style.aspectRatio = transform.aspectRatio.replace("/", " / ");
  }

  return style;
}

/**
 * Builds CSS for text typography, colors, gradients and shadow
 */
export function getTextStyleCss(textStyle?: VisualTextCustomStyle): React.CSSProperties {
  if (!textStyle) return {};

  const style: React.CSSProperties = {};

  if (textStyle.customColorHex && !textStyle.customGradient) {
    style.color = textStyle.customColorHex;
  }

  if (textStyle.customGradient) {
    style.backgroundImage = textStyle.customGradient;
    style.WebkitBackgroundClip = "text";
    style.WebkitTextFillColor = "transparent";
    style.backgroundClip = "text";
    style.color = "transparent";
    style.display = "inline-block";
  }

  if (textStyle.fontFamily && textStyle.fontFamily !== "inherit") {
    style.fontFamily = textStyle.fontFamily;
  }

  if (textStyle.fontSizePx) {
    style.fontSize = `${textStyle.fontSizePx}px`;
  }

  if (textStyle.fontWeight) {
    style.fontWeight = textStyle.fontWeight;
  }

  if (textStyle.letterSpacing !== undefined && textStyle.letterSpacing !== 0) {
    style.letterSpacing = `${textStyle.letterSpacing}px`;
  }

  if (textStyle.lineHeight) {
    style.lineHeight = textStyle.lineHeight;
  }

  if (textStyle.textTransform && textStyle.textTransform !== "none") {
    style.textTransform = textStyle.textTransform;
  }

  if (textStyle.textDecoration && textStyle.textDecoration !== "none") {
    style.textDecoration = textStyle.textDecoration;
  }

  if (textStyle.opacity !== undefined && textStyle.opacity < 100) {
    style.opacity = Math.max(0, Math.min(1, textStyle.opacity / 100));
  }

  if (textStyle.blur !== undefined && textStyle.blur > 0) {
    style.filter = `blur(${textStyle.blur}px)`;
  }

  if (textStyle.textShadow) {
    style.textShadow = textStyle.textShadow;
  } else if (textStyle.glowColor && textStyle.glowIntensity) {
    style.textShadow = `0 0 ${textStyle.glowIntensity}px ${textStyle.glowColor}`;
  }

  if (textStyle.backgroundColor || textStyle.backgroundGradient) {
    if (textStyle.backgroundGradient) {
      style.background = textStyle.backgroundGradient;
    } else if (textStyle.backgroundColor) {
      style.backgroundColor = textStyle.backgroundColor;
    }
    if (textStyle.backgroundPadding) {
      style.padding = `${textStyle.backgroundPadding}px ${textStyle.backgroundPadding * 1.5}px`;
    }
    if (textStyle.borderRadius) {
      style.borderRadius = `${textStyle.borderRadius}px`;
    }
  }

  return style;
}

/**
 * Combines all visual styles for an element into unified CSSProperties
 */
export function getMergedElementStyles(
  record?: CustomElementStyleRecord
): {
  containerStyle: React.CSSProperties;
  imageStyle: React.CSSProperties;
  textStyle: React.CSSProperties;
  clipPath?: string;
} {
  if (!record) {
    return {
      containerStyle: {},
      imageStyle: {},
      textStyle: {},
      clipPath: undefined,
    };
  }

  const transformStyle = getTransformCss(record.transform, record.offset);
  const effectsStyle = getEffectsCss(record.imageEffects);
  const textStyle = getTextStyleCss(record.textStyle);
  const clipPath = getMaskClipPath(record.mask);

  const containerStyle: React.CSSProperties = {
    ...transformStyle,
    zIndex: record.zIndex,
  };

  const imageStyle: React.CSSProperties = {
    ...effectsStyle,
    clipPath,
    WebkitClipPath: clipPath,
    objectFit: record.transform?.objectFit || "cover",
    objectPosition: record.transform?.imagePositionX !== undefined && record.transform?.imagePositionY !== undefined
      ? `${record.transform.imagePositionX}% ${record.transform.imagePositionY}%`
      : undefined,
  };

  if (record.transform?.imageZoom && record.transform.imageZoom > 100) {
    imageStyle.transform = `scale(${record.transform.imageZoom / 100})`;
  }

  return {
    containerStyle,
    imageStyle,
    textStyle,
    clipPath,
  };
}
