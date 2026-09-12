// src/components/marketing/visual-canvas/types.ts

import type { Section, LPTheme } from "@/lib/lp-store";

export type SelectedElementType =
  | "section"
  | "hero_title"
  | "hero_eyebrow"
  | "hero_subtitle"
  | "hero_cta_primary"
  | "hero_cta_secondary"
  | "hero_media"
  | "logos_title"
  | "logos_item"
  | "features_title"
  | "features_subtitle"
  | "features_card"
  | "stats_item"
  | "testimonial_quote"
  | "testimonial_author"
  | "testimonial_role"
  | "testimonial_avatar"
  | "pricing_plan"
  | "faq_item"
  | "cta_title"
  | "cta_subtitle"
  | "cta_button"
  | "cta_media"
  | "form_title"
  | "form_subtitle"
  | "form_field"
  | "form_button"
  | "survey_title"
  | "survey_subtitle"
  | "survey_question"
  | "custom_block"
  | "floating_badge"
  | "image_element"
  | "text_element";

export interface SelectedElement {
  sectionId: string;
  elementType: SelectedElementType;
  subId?: string; // id do item específico (ex: feature card id, question id, stat id)
  label: string;
}

export interface CanvasElementBounds {
  x: number;
  y: number;
  width: number | string;
  height: number | string;
  rotation?: number;
  zIndex: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  isLocked?: boolean;
  isVisible?: boolean;
  isFreeform?: boolean; // Se o elemento está posicionado livremente ou ancorado no fluxo
}

export type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

export interface DragState {
  elementId: string;
  startX: number;
  startY: number;
  initialX: number;
  initialY: number;
  currentX: number;
  currentY: number;
  isDragging: boolean;
  ghostBounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ResizeState {
  elementId: string;
  handle: ResizeHandle;
  startX: number;
  startY: number;
  initialBounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  currentBounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  isResizing: boolean;
}

export interface ElementStyleOverrides {
  fontSize?: number; // em px
  fontWeight?: 400 | 500 | 600 | 700 | 800 | 900;
  fontFamily?: string;
  color?: string;
  bg?: string;
  align?: "left" | "center" | "right" | "justify";
  letterSpacing?: number; // em em (-0.05 a 0.2)
  lineHeight?: number; // (1.0 a 2.0)
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  borderRadius?: number; // em px
  shadow?: "none" | "sm" | "md" | "lg" | "xl" | "glow";
  padding?: number; // em px
  margin?: number; // em px
  maxWidth?: number; // em px
  imageFit?: "cover" | "contain" | "fill";
  imageWidth?: number; // em px ou %
  imageHeight?: number; // em px
  opacity?: number;
  borderWidth?: number;
  borderColor?: string;
}

export interface AlignmentGuide {
  type: "vertical" | "horizontal";
  position: number;
  label?: string;
}

export type CanvasAlignmentType =
  | "left"
  | "center"
  | "right"
  | "top"
  | "middle"
  | "bottom"
  | "distribute-h"
  | "distribute-v";

export interface AIStrategyInsight {
  score: number; // 0 a 100
  conversionStrengths: string[];
  conversionWeaknesses: string[];
  recommendations: {
    title: string;
    description: string;
    impact: "Alto" | "Médio" | "Crítico";
    actionType: string;
  }[];
}
