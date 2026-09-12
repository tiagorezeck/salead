import React, { useState, useRef, useEffect } from "react";
import {
  FloatingImageElement,
  VisualTransform,
  VisualImageEffects,
  VisualMaskShape,
  VisualMaskType,
  ElementOffset,
} from "../types/landingPage";
import {
  getEffectsCss,
  getMaskClipPath,
  getTransformCss,
} from "../utils/visualStyleHelpers";
import {
  Move,
  RotateCw,
  Sliders,
  Trash2,
  Copy,
  Layers,
  ArrowUp,
  ArrowDown,
  Maximize2,
  Camera,
  GripHorizontal,
  Crop,
  Shapes,
  Sparkles,
  Circle,
  Square,
  Shield,
  Star,
  Hexagon,
  User,
  Tv,
  Smartphone,
  RotateCcw,
  Check,
  Scan,
  X,
  SlidersHorizontal,
  AlignCenter,
  AlignLeft,
  AlignRight,
  Columns,
  LayoutTemplate,
  Shrink,
  Expand,
  Maximize,
} from "lucide-react";

interface InteractiveFloatingImageProps {
  image?: FloatingImageElement;
  element?: FloatingImageElement;
  isEditorPreview?: boolean;
  deviceView?: "desktop" | "tablet" | "mobile";
  isSelected?: boolean;
  onSelect?: () => void;
  onDeselect?: () => void;
  onUpdateImage?: (updated: FloatingImageElement) => void;
  onUpdate?: (updated: FloatingImageElement) => void;
  onDeleteImage?: (id: string) => void;
  onDelete?: () => void;
  onDuplicateImage?: (image: FloatingImageElement) => void;
  onOpenVisualModal?: (imageId: string) => void;
  onOpenImagePicker?: (target: {
    type: "hero" | "bento" | "testimonial" | "avatar";
    currentUrl: string;
    itemId?: string;
    title: string;
  }) => void;
}

const QUICK_SHAPE_PRESETS: { id: VisualMaskType; label: string; icon: React.ReactNode }[] = [
  { id: "none", label: "Padrão", icon: <Square className="w-3 h-3 text-zinc-400" /> },
  { id: "circle", label: "Círculo", icon: <Circle className="w-3 h-3 text-purple-400" /> },
  { id: "rounded", label: "Cantos Arredondados", icon: <Square className="w-3 h-3 text-cyan-400 rounded-sm" /> },
  { id: "shield", label: "Escudo", icon: <Shield className="w-3 h-3 text-amber-400" /> },
  { id: "star", label: "Estrela", icon: <Star className="w-3 h-3 text-yellow-400" /> },
  { id: "hexagon", label: "Hexágono", icon: <Hexagon className="w-3 h-3 text-emerald-400" /> },
  { id: "pill", label: "Pílula / Badge", icon: <span className="w-3 h-1.5 rounded-full bg-rose-400 inline-block" /> },
];

export const InteractiveFloatingImage: React.FC<InteractiveFloatingImageProps> = ({
  image,
  element,
  isEditorPreview = false,
  deviceView = "desktop",
  isSelected: propsIsSelected,
  onSelect,
  onDeselect,
  onUpdateImage,
  onUpdate,
  onDeleteImage,
  onDelete,
  onDuplicateImage,
  onOpenVisualModal,
  onOpenImagePicker,
}) => {
  const activeImage = image || element;
  if (!activeImage) return null;

  const handleUpdate = (updated: FloatingImageElement) => {
    if (onUpdateImage) {
      onUpdateImage(updated);
    } else if (onUpdate) {
      onUpdate(updated);
    }
  };

  const handleDelete = () => {
    if (onDeleteImage) {
      onDeleteImage(activeImage.id);
    } else if (onDelete) {
      onDelete();
    }
  };

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<"se" | "s" | "e">("se");
  const [isRotating, setIsRotating] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [internalSelected, setInternalSelected] = useState(false);
  const isSelected = propsIsSelected !== undefined ? propsIsSelected : internalSelected;
  const [isShapeMenuOpen, setIsShapeMenuOpen] = useState(false);
  const [isCropMenuOpen, setIsCropMenuOpen] = useState(false);
  const [isFitMenuOpen, setIsFitMenuOpen] = useState(false);
  const [isPanCropActive, setIsPanCropActive] = useState(false);
  const [isPanning, setIsPanning] = useState(false);

  const handleDeselect = () => {
    setInternalSelected(false);
    setIsShapeMenuOpen(false);
    setIsCropMenuOpen(false);
    setIsFitMenuOpen(false);
    setIsPanCropActive(false);
    if (onDeselect) {
      onDeselect();
    }
  };

  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeImageRef = useRef(activeImage);
  activeImageRef.current = activeImage;

  const handleUpdateRef = useRef(handleUpdate);
  handleUpdateRef.current = handleUpdate;

  // Graceful hover enter/leave to prevent toolbar from disappearing when cursor moves to it
  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      if (!isDragging && !isResizing && !isRotating && !isCropMenuOpen && !isShapeMenuOpen && !isFitMenuOpen && !isPanCropActive) {
        setIsHovered(false);
      }
    }, 300);
  };

  // Close selection & popovers when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleDeselect();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onDeselect]);

  // Keyboard shortcut: Delete or Backspace to remove selected floating image; Escape to deselect
  useEffect(() => {
    if (!isSelected) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.getAttribute("contenteditable") === "true")
      ) {
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        e.stopPropagation();
        handleDelete();
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        handleDeselect();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSelected, activeImage.id, onDeselect]);

  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
  }>({
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
  });

  const resizeStartRef = useRef<{
    startX: number;
    startY: number;
    initialWidth: number;
    initialHeight: number;
    direction: "se" | "s" | "e";
  }>({
    startX: 0,
    startY: 0,
    initialWidth: 0,
    initialHeight: 0,
    direction: "se",
  });

  const rotateStartRef = useRef<{
    centerX: number;
    centerY: number;
    initialAngle: number;
  }>({
    centerX: 0,
    centerY: 0,
    initialAngle: 0,
  });

  const panStartRef = useRef<{
    startX: number;
    startY: number;
    initPosX: number;
    initPosY: number;
  }>({
    startX: 0,
    startY: 0,
    initPosX: 50,
    initPosY: 50,
  });

  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [resizeDimensions, setResizeDimensions] = useState<{ width: number; height: number } | null>(null);
  const [liveRotate, setLiveRotate] = useState<number | null>(null);
  const [livePan, setLivePan] = useState<{ posX: number; posY: number } | null>(null);

  const dragPendingRef = useRef(false);
  const hasMovedThresholdRef = useRef(false);
  const latestResizeRef = useRef<{ width: number; height: number } | null>(null);
  const latestRotateRef = useRef<number | null>(null);
  const latestPanRef = useRef<{ posX: number; posY: number } | null>(null);

  const currentX = dragOffset ? dragOffset.x : (activeImage.offsetX ?? 100);
  const currentY = dragOffset ? dragOffset.y : (activeImage.offsetY ?? 120);
  const widthPx = resizeDimensions ? resizeDimensions.width : (activeImage.widthPx || 220);
  const heightPx = resizeDimensions ? resizeDimensions.height : activeImage.heightPx;
  const currentRotate = liveRotate !== null ? liveRotate : (activeImage.transform?.rotate ?? 0);
  const currentScale = activeImage.transform?.scale ?? 1;

  // Drag handler (Move entire floating element)
  const handleStartDrag = (e: React.MouseEvent) => {
    if (!isEditorPreview || activeImage.isLocked || isPanCropActive) return;
    const target = e.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest(".no-drag") ||
      target.closest(".resize-handle") ||
      target.closest(".rotate-handle") ||
      target.closest("input")
    ) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();

    dragPendingRef.current = true;
    hasMovedThresholdRef.current = false;

    const initX = typeof activeImageRef.current.offsetX === "number" ? activeImageRef.current.offsetX : 100;
    const initY = typeof activeImageRef.current.offsetY === "number" ? activeImageRef.current.offsetY : 120;

    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: initX,
      initialY: initY,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragPendingRef.current) return;

      const deltaX = e.clientX - dragStartRef.current.startX;
      const deltaY = e.clientY - dragStartRef.current.startY;

      // Only move if mouse exceeds movement threshold (prevents sudden jump on click)
      if (!hasMovedThresholdRef.current) {
        if (Math.hypot(deltaX, deltaY) < 3) {
          return;
        }
        hasMovedThresholdRef.current = true;
        setIsDragging(true);
        setInternalSelected(true);
      }

      const newX = Math.round(dragStartRef.current.initialX + deltaX);
      const newY = Math.max(0, Math.round(dragStartRef.current.initialY + deltaY));

      setDragOffset({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      if (dragPendingRef.current) {
        dragPendingRef.current = false;
        if (hasMovedThresholdRef.current) {
          hasMovedThresholdRef.current = false;
          setIsDragging(false);
          setDragOffset((latest) => {
            if (latest) {
              handleUpdateRef.current({
                ...activeImageRef.current,
                offsetX: latest.x,
                offsetY: latest.y,
              });
            }
            return null;
          });
        } else {
          setIsDragging(false);
          setDragOffset(null);
        }
      }
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  // Multi-direction resize & free-form crop handler with ultra-smooth local state
  const handleStartResize = (e: React.MouseEvent, direction: "se" | "s" | "e" = "se") => {
    if (!isEditorPreview || activeImage.isLocked) return;
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeDirection(direction);

    const rect = containerRef.current?.getBoundingClientRect();
    const currentRenderedHeight = rect?.height || heightPx || widthPx;
    const initW = rect?.width || widthPx;

    resizeStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialWidth: initW,
      initialHeight: currentRenderedHeight,
      direction,
    };
    latestResizeRef.current = { width: initW, height: currentRenderedHeight };
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const { startX, startY, initialWidth, initialHeight, direction } = resizeStartRef.current;
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      let newWidth = initialWidth;
      let newHeight = initialHeight;

      if (direction === "e" || direction === "se") {
        newWidth = Math.max(30, Math.round(initialWidth + deltaX));
      }

      if (direction === "s" || direction === "se") {
        newHeight = Math.max(30, Math.round(initialHeight + deltaY));
      }

      latestResizeRef.current = { width: newWidth, height: newHeight };
      setResizeDimensions({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      if (latestResizeRef.current) {
        const finalRes = latestResizeRef.current;
        latestResizeRef.current = null;
        setResizeDimensions(null);
        handleUpdateRef.current({
          ...activeImageRef.current,
          widthPx: finalRes.width,
          heightPx: finalRes.height,
          fitMode: "custom",
          transform: {
            ...activeImageRef.current.transform,
            objectFit: "cover",
            aspectRatio: "custom",
          },
        });
      } else {
        setResizeDimensions(null);
      }
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  // Rotation handler (top handle) with local transient state
  const handleStartRotate = (e: React.MouseEvent) => {
    if (!isEditorPreview || activeImage.isLocked) return;
    e.preventDefault();
    e.stopPropagation();
    setIsRotating(true);

    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const initialAngle = (Math.atan2(e.clientY - centerY, e.clientX - centerX) * 180) / Math.PI;

      rotateStartRef.current = {
        centerX,
        centerY,
        initialAngle: initialAngle - (activeImageRef.current.transform?.rotate ?? 0),
      };
      latestRotateRef.current = activeImageRef.current.transform?.rotate ?? 0;
    }
  };

  useEffect(() => {
    if (!isRotating) return;

    const handleMouseMove = (e: MouseEvent) => {
      const { centerX, centerY, initialAngle } = rotateStartRef.current;
      const currentMouseAngle = (Math.atan2(e.clientY - centerY, e.clientX - centerX) * 180) / Math.PI;
      let angle = Math.round(currentMouseAngle - initialAngle);
      if (angle < 0) angle += 360;
      angle = angle % 360;

      // Snap to 0, 45, 90, 180, 270 if close
      if (Math.abs(angle - 0) < 5 || Math.abs(angle - 360) < 5) angle = 0;
      if (Math.abs(angle - 45) < 4) angle = 45;
      if (Math.abs(angle - 90) < 5) angle = 90;
      if (Math.abs(angle - 180) < 5) angle = 180;
      if (Math.abs(angle - 270) < 5) angle = 270;

      latestRotateRef.current = angle;
      setLiveRotate(angle);
    };

    const handleMouseUp = () => {
      setIsRotating(false);
      if (latestRotateRef.current !== null) {
        const finalAngle = latestRotateRef.current;
        latestRotateRef.current = null;
        setLiveRotate(null);
        handleUpdateRef.current({
          ...activeImageRef.current,
          transform: {
            ...activeImageRef.current.transform,
            rotate: finalAngle,
          },
        });
      } else {
        setLiveRotate(null);
      }
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isRotating]);

  // Interactive Pan Mode (drag inside crop frame with local transient state)
  const handleStartPan = (e: React.MouseEvent) => {
    if (!isEditorPreview || !isPanCropActive) return;
    e.preventDefault();
    e.stopPropagation();
    setIsPanning(true);
    panStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initPosX: activeImageRef.current.transform?.imagePositionX ?? 50,
      initPosY:
        activeImageRef.current.transform?.imagePositionY ??
        (activeImageRef.current.transform?.cropFocus === "top" ? 0 : 50),
    };
    latestPanRef.current = {
      posX: panStartRef.current.initPosX,
      posY: panStartRef.current.initPosY,
    };
  };

  useEffect(() => {
    if (!isPanning) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - panStartRef.current.startX;
      const deltaY = e.clientY - panStartRef.current.startY;
      const containerW = containerRef.current?.clientWidth || 220;
      const containerH = containerRef.current?.clientHeight || 220;

      const percentDeltaX = Math.round((-deltaX / containerW) * 100);
      const percentDeltaY = Math.round((-deltaY / containerH) * 100);

      const newPosX = Math.max(0, Math.min(100, panStartRef.current.initPosX + percentDeltaX));
      const newPosY = Math.max(0, Math.min(100, panStartRef.current.initPosY + percentDeltaY));

      latestPanRef.current = { posX: newPosX, posY: newPosY };
      setLivePan({ posX: newPosX, posY: newPosY });
    };

    const handleMouseUp = () => {
      setIsPanning(false);
      if (latestPanRef.current) {
        const finalPan = latestPanRef.current;
        latestPanRef.current = null;
        setLivePan(null);
        handleUpdateRef.current({
          ...activeImageRef.current,
          transform: {
            ...activeImageRef.current.transform,
            imagePositionX: finalPan.posX,
            imagePositionY: finalPan.posY,
            cropFocus: "custom",
            objectFit: "cover",
          },
        });
      } else {
        setLivePan(null);
      }
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isPanning]);

  // Quick Crop Presets (Bust / Half-body, Square, Landscape, Stories, Free)
  const applyCropPreset = (preset: "bust" | "square" | "portrait" | "landscape" | "classic" | "free" | "reset") => {
    const currentW = activeImage.widthPx || 260;

    if (preset === "reset") {
      handleUpdate({
        ...activeImage,
        heightPx: undefined,
        transform: {
          ...activeImage.transform,
          aspectRatio: "auto",
          objectFit: "contain",
          imagePositionX: 50,
          imagePositionY: 50,
          imageZoom: 100,
          cropFocus: undefined,
        },
      });
      setIsPanCropActive(false);
      return;
    }

    if (preset === "bust") {
      // Half-body / bust: Focus on top (head & chest), cuts off lower body/legs cleanly
      handleUpdate({
        ...activeImage,
        heightPx: Math.round(currentW * 1.33), // 3:4 portrait
        transform: {
          ...activeImage.transform,
          aspectRatio: "3/4",
          objectFit: "cover",
          imagePositionY: 0, // Top focus (cuts legs)
          imagePositionX: 50,
          cropFocus: "top",
        },
      });
      return;
    }

    if (preset === "square") {
      handleUpdate({
        ...activeImage,
        heightPx: currentW,
        transform: {
          ...activeImage.transform,
          aspectRatio: "1/1",
          objectFit: "cover",
          imagePositionY: activeImage.transform?.imagePositionY ?? 50,
          imagePositionX: activeImage.transform?.imagePositionX ?? 50,
        },
      });
      return;
    }

    if (preset === "landscape") {
      handleUpdate({
        ...activeImage,
        heightPx: Math.round((currentW * 9) / 16),
        transform: {
          ...activeImage.transform,
          aspectRatio: "16/9",
          objectFit: "cover",
          imagePositionY: activeImage.transform?.imagePositionY ?? 50,
          imagePositionX: activeImage.transform?.imagePositionX ?? 50,
        },
      });
      return;
    }

    if (preset === "portrait") {
      handleUpdate({
        ...activeImage,
        heightPx: Math.round((currentW * 16) / 9),
        transform: {
          ...activeImage.transform,
          aspectRatio: "9/16",
          objectFit: "cover",
          imagePositionY: activeImage.transform?.imagePositionY ?? 0,
          imagePositionX: activeImage.transform?.imagePositionX ?? 50,
        },
      });
      return;
    }

    if (preset === "classic") {
      handleUpdate({
        ...activeImage,
        heightPx: Math.round((currentW * 3) / 4),
        transform: {
          ...activeImage.transform,
          aspectRatio: "4/3",
          objectFit: "cover",
          imagePositionY: activeImage.transform?.imagePositionY ?? 50,
          imagePositionX: activeImage.transform?.imagePositionX ?? 50,
        },
      });
      return;
    }

    if (preset === "free") {
      const rect = containerRef.current?.getBoundingClientRect();
      handleUpdate({
        ...activeImage,
        heightPx: activeImage.heightPx || Math.round(rect?.height || currentW),
        transform: {
          ...activeImage.transform,
          aspectRatio: "custom",
          objectFit: "cover",
        },
      });
    }
  };

  // Crop camera focus point (Top / Face, Center, Base / Feet)
  const applyCropFocus = (focus: "top" | "center" | "bottom") => {
    const yVal = focus === "top" ? 0 : focus === "center" ? 50 : 100;
    handleUpdate({
      ...activeImage,
      transform: {
        ...activeImage.transform,
        imagePositionY: yVal,
        cropFocus: focus,
        objectFit: "cover",
      },
    });
  };

  // Quick Fit & Responsiveness Presets
  const applyFitPreset = (
    preset:
      | "full_width"
      | "fit_container"
      | "original"
      | "center"
      | "align_left"
      | "align_right"
      | "half_col"
      | "mobile_safe"
      | "reset_position"
  ) => {
    const parentW = containerRef.current?.parentElement?.clientWidth || (typeof window !== "undefined" ? window.innerWidth : 1200);
    const currentW = activeImage.widthPx || 260;

    switch (preset) {
      case "full_width": {
        // De Lado a Lado (100% da tela / Sangrado total)
        handleUpdate({
          ...activeImage,
          fitMode: "full_width",
          offsetX: 0,
          widthPx: parentW,
          heightPx: undefined,
          responsiveAlign: "center",
          transform: {
            ...activeImage.transform,
            aspectRatio: "auto",
            objectFit: "cover",
            scale: 1,
            rotate: 0,
          },
        });
        break;
      }
      case "fit_container": {
        // Encaixar no tamanho do container padrão da LP (100% responsivo)
        const targetW = Math.min(1100, Math.max(300, parentW - 32));
        handleUpdate({
          ...activeImage,
          widthPx: targetW,
          heightPx: undefined,
          offsetX: Math.max(0, Math.round((parentW - targetW) / 2)),
          fitMode: "fit_container",
          responsiveAlign: "center",
          transform: {
            ...activeImage.transform,
            aspectRatio: "auto",
            objectFit: "contain",
            scale: 1,
            rotate: 0,
          },
        });
        break;
      }
      case "original": {
        // Restaurar proporções originais da imagem sem corte
        handleUpdate({
          ...activeImage,
          heightPx: undefined,
          fitMode: "original",
          transform: {
            ...activeImage.transform,
            aspectRatio: "auto",
            objectFit: "contain",
            imageZoom: 100,
            imagePositionX: 50,
            imagePositionY: 50,
            cropFocus: undefined,
          },
        });
        setIsPanCropActive(false);
        break;
      }
      case "center": {
        // Centralizar horizontalmente dentro da página
        const centeredX = Math.max(0, Math.round((parentW - currentW) / 2));
        handleUpdate({
          ...activeImage,
          offsetX: centeredX,
          responsiveAlign: "center",
        });
        break;
      }
      case "align_left": {
        handleUpdate({
          ...activeImage,
          offsetX: 0,
          responsiveAlign: "left",
        });
        break;
      }
      case "align_right": {
        const rightX = Math.max(0, parentW - currentW);
        handleUpdate({
          ...activeImage,
          offsetX: rightX,
          responsiveAlign: "right",
        });
        break;
      }
      case "half_col": {
        // Encaixar em meia coluna (50% do container)
        const halfW = Math.round(parentW * 0.48);
        handleUpdate({
          ...activeImage,
          widthPx: halfW,
          fitMode: "custom",
        });
        break;
      }
      case "mobile_safe": {
        // Trava anti-overflow para telas menores / mobile
        const safeW = Math.min(currentW, 340);
        handleUpdate({
          ...activeImage,
          widthPx: safeW,
          offsetX: Math.max(12, Math.min(activeImage.offsetX ?? 100, parentW - safeW - 12)),
          responsiveClamped: true,
        });
        break;
      }
      case "reset_position": {
        handleUpdate({
          ...activeImage,
          offsetX: 40,
          offsetY: 120,
          fitMode: "custom",
          transform: {
            ...activeImage.transform,
            rotate: 0,
            scale: 1,
          },
        });
        break;
      }
    }
    setIsFitMenuOpen(false);
  };

  // Dimension & format label for top badge
  const getFormatLabel = () => {
    if (activeImage.fitMode === "full_width") return "De Lado a Lado (100% Tela Cheia)";
    if (activeImage.fitMode === "fit_container") return "Encaixado no Container (100%)";
    if (!heightPx) return "Proporção Original";
    const ratio = widthPx / (heightPx || 1);
    if (activeImage.transform?.cropFocus === "top") return "Meio Corpo (Topo)";
    if (Math.abs(ratio - 1) < 0.08) return "1:1 Quadrado";
    if (Math.abs(ratio - 16 / 9) < 0.09) return "16:9 Retangular";
    if (Math.abs(ratio - 9 / 16) < 0.09) return "9:16 Stories";
    if (Math.abs(ratio - 4 / 3) < 0.09) return "4:3 Retangular";
    if (Math.abs(ratio - 3 / 4) < 0.09) return "3:4 Retrato";
    if (ratio > 1.2) return "Retangular Horizontal";
    if (ratio < 0.8) return "Retangular Vertical";
    return "Recorte Livre";
  };

  if (activeImage.isVisible === false) {
    return null;
  }

  // Effects & Masks CSS
  const effectsCss = getEffectsCss(activeImage.effects);
  const clipPath = getMaskClipPath(activeImage.mask);
  const hasShapeMask = Boolean(activeImage.mask && activeImage.mask.type && activeImage.mask.type !== "none");
  const isSquareShape =
    hasShapeMask &&
    (activeImage.mask?.type === "circle" ||
      activeImage.mask?.type === "diamond" ||
      activeImage.mask?.type === "star" ||
      activeImage.mask?.type === "hexagon" ||
      activeImage.mask?.type === "shield");

  const isCropped = Boolean(
    heightPx ||
      (activeImage.transform?.aspectRatio && activeImage.transform.aspectRatio !== "auto") ||
      activeImage.transform?.cropFocus ||
      (activeImage.transform?.imageZoom && activeImage.transform.imageZoom > 100) ||
      activeImage.transform?.imagePositionY !== undefined
  );

  const posX = activeImage.transform?.imagePositionX ?? 50;
  const posY = activeImage.transform?.imagePositionY ?? (activeImage.transform?.cropFocus === "top" ? 0 : 50);
  const zoom = activeImage.transform?.imageZoom ?? 100;

  const isFullWidth = activeImage.fitMode === "full_width";
  const isFitContainer = activeImage.fitMode === "fit_container";
  const parentWidth = containerRef.current?.parentElement?.clientWidth || (typeof window !== "undefined" ? window.innerWidth : 1200);

  const isMobile = deviceView === "mobile" || parentWidth < 500;
  const isTablet = deviceView === "tablet" || (parentWidth >= 500 && parentWidth < 800);

  // Auto-clamp dimensions so images never overflow container boundaries on mobile
  const responsiveMaxWidth = isMobile ? Math.max(160, parentWidth - 24) : undefined;
  const effectiveWidthPx = responsiveMaxWidth ? Math.min(widthPx, responsiveMaxWidth) : widthPx;

  // Responsive translation with full-width / container / free placement across the entire screen
  const safeClampedX = isFullWidth || isFitContainer
    ? 0
    : isMobile
    ? (activeImage.responsiveAlign === "center"
        ? Math.max(0, Math.round((parentWidth - effectiveWidthPx) / 2))
        : currentX)
    : activeImage.responsiveAlign === "center" && (activeImage.offsetX === undefined || activeImage.offsetX === 0)
    ? Math.max(0, Math.round((parentWidth - effectiveWidthPx) / 2))
    : currentX;

  const transformStyle: React.CSSProperties = isFullWidth
    ? {
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        transform: `translate3d(0px, ${currentY}px, 0px) rotate(${currentRotate}deg) scale(${(activeImage.transform?.scaleX ?? 1) * currentScale}, ${(activeImage.transform?.scaleY ?? 1) * currentScale})`,
        transformOrigin: "center center",
        width: "100%",
        maxWidth: "100%",
        height: heightPx ? `${heightPx}px` : "auto",
        zIndex: activeImage.zIndex ?? 20,
        boxSizing: "border-box",
      }
    : isFitContainer
    ? {
        position: "absolute",
        left: 0,
        top: 0,
        transform: `translate3d(${safeClampedX}px, ${currentY}px, 0px) rotate(${currentRotate}deg) scale(${(activeImage.transform?.scaleX ?? 1) * currentScale}, ${(activeImage.transform?.scaleY ?? 1) * currentScale})`,
        transformOrigin: "center center",
        width: "100%",
        maxWidth: "100%",
        height: heightPx ? `${heightPx}px` : "auto",
        zIndex: activeImage.zIndex ?? 20,
        boxSizing: "border-box",
      }
    : {
        position: "absolute",
        left: 0,
        top: 0,
        transform: `translate3d(${safeClampedX}px, ${currentY}px, 0px) rotate(${currentRotate}deg) scale(${(activeImage.transform?.scaleX ?? 1) * currentScale}, ${(activeImage.transform?.scaleY ?? 1) * currentScale})`,
        transformOrigin: "center center",
        width: `${effectiveWidthPx}px`,
        maxWidth: isMobile ? "100%" : "none",
        height: heightPx ? `${heightPx}px` : "auto",
        zIndex: activeImage.zIndex ?? 20,
        boxSizing: "border-box",
      };

  // Published / non-editor view
  if (!isEditorPreview) {
    return (
      <div className="pointer-events-auto select-none" style={transformStyle}>
        <div style={effectsCss} className="w-full h-full relative">
          {hasShapeMask ? (
            <div
              className="w-full relative overflow-hidden"
              style={{
                clipPath,
                WebkitClipPath: clipPath,
                aspectRatio: isSquareShape ? "1 / 1" : undefined,
                height: isSquareShape ? `${widthPx}px` : heightPx ? `${heightPx}px` : "auto",
              }}
            >
              <img
                src={activeImage.imageUrl}
                alt={activeImage.altText || activeImage.name || "Imagem"}
                className="w-full h-full object-cover pointer-events-none"
                style={{
                  objectPosition: `${posX}% ${posY}%`,
                  transform: zoom > 100 ? `scale(${zoom / 100})` : undefined,
                  transformOrigin: `${posX}% ${posY}%`,
                }}
                referrerPolicy="no-referrer"
              />
            </div>
          ) : isCropped ? (
            <div
              className="w-full relative overflow-hidden rounded-xl"
              style={{
                height: heightPx ? `${heightPx}px` : "auto",
                aspectRatio:
                  activeImage.transform?.aspectRatio && activeImage.transform.aspectRatio !== "auto"
                    ? activeImage.transform.aspectRatio.replace("/", " / ")
                    : undefined,
              }}
            >
              <img
                src={activeImage.imageUrl}
                alt={activeImage.altText || activeImage.name || "Imagem"}
                className="w-full h-full object-cover pointer-events-none"
                style={{
                  objectPosition: `${posX}% ${posY}%`,
                  transform: zoom > 100 ? `scale(${zoom / 100})` : undefined,
                  transformOrigin: `${posX}% ${posY}%`,
                }}
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            <img
              src={activeImage.imageUrl}
              alt={activeImage.altText || activeImage.name || "Imagem"}
              className="w-full h-auto object-contain pointer-events-none rounded-xl"
              referrerPolicy="no-referrer"
            />
          )}
        </div>
      </div>
    );
  }

  const showActiveControls =
    isHovered ||
    isDragging ||
    isResizing ||
    isRotating ||
    isSelected ||
    isCropMenuOpen ||
    isShapeMenuOpen ||
    isPanCropActive;
  const currentZIndex = activeImage.zIndex ?? 20;
  const isBehindContent = currentZIndex <= 10;

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleStartDrag}
      onDragStart={(e) => e.preventDefault()}
      draggable={false}
      onClick={(e) => {
        e.stopPropagation();
        setInternalSelected(true);
        onSelect?.();
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setIsPanCropActive((prev) => !prev);
      }}
      className={`pointer-events-auto group/floating select-none cursor-grab active:cursor-grabbing transition-shadow ${
        showActiveControls ? "ring-2 ring-purple-500/90 shadow-2xl rounded-2xl" : "hover:ring-1 hover:ring-purple-400/50"
      }`}
      style={{
        ...transformStyle,
        transition: isDragging || isResizing || isRotating ? "none" : "box-shadow 0.15s ease",
        zIndex: showActiveControls ? 99999 : (transformStyle.zIndex ?? currentZIndex),
      }}
    >
      {/* Visual Image with Clean Effects, Cropping and Shape Mask Clipping */}
      <div style={effectsCss} className="w-full h-full relative select-none">
        {hasShapeMask ? (
          <div
            className="w-full relative overflow-hidden transition-all select-none"
            style={{
              clipPath,
              WebkitClipPath: clipPath,
              aspectRatio: isSquareShape ? "1 / 1" : undefined,
              height: isSquareShape ? `${widthPx}px` : heightPx ? `${heightPx}px` : "auto",
            }}
          >
            <img
              src={activeImage.imageUrl}
              alt={activeImage.altText || activeImage.name || "Imagem"}
              className="w-full h-full object-cover pointer-events-none select-none"
              style={{
                objectPosition: `${posX}% ${posY}%`,
                transform: zoom > 100 ? `scale(${zoom / 100})` : undefined,
                transformOrigin: `${posX}% ${posY}%`,
              }}
              referrerPolicy="no-referrer"
              draggable={false}
            />
          </div>
        ) : isCropped ? (
          <div
            className="w-full relative overflow-hidden rounded-xl select-none"
            style={{
              height: heightPx ? `${heightPx}px` : "auto",
              aspectRatio:
                activeImage.transform?.aspectRatio && activeImage.transform.aspectRatio !== "auto"
                  ? activeImage.transform.aspectRatio.replace("/", " / ")
                  : undefined,
            }}
          >
            <img
              src={activeImage.imageUrl}
              alt={activeImage.altText || activeImage.name || "Imagem"}
              className="w-full h-full object-cover pointer-events-none select-none"
              style={{
                objectPosition: `${posX}% ${posY}%`,
                transform: zoom > 100 ? `scale(${zoom / 100})` : undefined,
                transformOrigin: `${posX}% ${posY}%`,
              }}
              referrerPolicy="no-referrer"
              draggable={false}
            />
          </div>
        ) : (
          <img
            src={activeImage.imageUrl}
            alt={activeImage.altText || activeImage.name || "Imagem"}
            className="w-full h-auto object-contain pointer-events-none rounded-xl select-none"
            referrerPolicy="no-referrer"
            draggable={false}
          />
        )}

        {/* Interactive Pan Crop Overlay (Rule of Thirds grid) */}
        {isPanCropActive && (
          <div
            onMouseDown={handleStartPan}
            className="absolute inset-0 z-30 cursor-grab active:cursor-grabbing rounded-xl overflow-hidden border-2 border-amber-400 bg-black/25 select-none animate-in fade-in duration-150"
            title="Clique e arraste para posicionar a pessoa ou foto dentro do enquadramento"
          >
            <div className="w-full h-full grid grid-cols-3 grid-rows-3 pointer-events-none">
              <div className="border-r border-b border-amber-300/40" />
              <div className="border-r border-b border-amber-300/40" />
              <div className="border-b border-amber-300/40" />
              <div className="border-r border-b border-amber-300/40" />
              <div className="border-r border-b border-amber-300/40" />
              <div className="border-b border-amber-300/40" />
              <div className="border-r border-amber-300/40" />
              <div className="border-r border-amber-300/40" />
              <div />
            </div>

            <div className="absolute top-2 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full bg-zinc-950/90 text-amber-300 text-[10px] font-bold border border-amber-500/60 shadow-lg pointer-events-none flex items-center gap-1.5 whitespace-nowrap backdrop-blur-md">
              <Move className="w-3 h-3" />
              <span>Arraste para enquadrar a foto</span>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsPanCropActive(false);
              }}
              className="absolute bottom-2 right-2 px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-[10px] font-bold shadow-lg flex items-center gap-1 cursor-pointer pointer-events-auto"
            >
              <Check className="w-3 h-3 stroke-[3]" />
              <span>Concluir</span>
            </button>
          </div>
        )}
      </div>

      {/* Editor Controls & Handles */}
      {showActiveControls && (
        <>
          {/* Real-time Dimensions & Crop Format Badge */}
          <div className="absolute -top-7 left-0 z-40 px-2 py-0.5 rounded-lg bg-zinc-950/95 border border-purple-500/70 shadow-lg text-[10px] font-mono text-cyan-300 flex items-center gap-1.5 backdrop-blur-md pointer-events-none whitespace-nowrap">
            <Scan className="w-2.5 h-2.5 text-purple-400" />
            <span>
              {widthPx} × {heightPx || "auto"} px
            </span>
            <span className="text-zinc-600">·</span>
            <span className="text-amber-300 font-sans font-bold">{getFormatLabel()}</span>
          </div>

          {/* Top Rotation Handle */}
          <div
            onMouseDown={handleStartRotate}
            className="rotate-handle absolute -top-7 left-1/2 -translate-x-1/2 z-40 w-6 h-6 rounded-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center cursor-grab shadow-lg transition-transform hover:scale-125 border border-white/40"
            title="Girar Imagem (0° a 360°)"
          >
            <RotateCw className="w-3 h-3 text-cyan-300 pointer-events-none" />
          </div>

          {/* Right Handle: Width Crop / Expansion (Make more square or rectangular) */}
          <div
            onMouseDown={(e) => handleStartResize(e, "e")}
            className="resize-handle absolute top-1/2 -right-2.5 -translate-y-1/2 z-40 w-5 h-8 rounded-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center cursor-ew-resize shadow-lg transition-transform hover:scale-125 border border-white/40"
            title="Cortar Largura Livremente (Mais quadrado / Mais retangular)"
          >
            <GripHorizontal className="w-3 h-3 text-cyan-300 rotate-90 pointer-events-none" />
          </div>

          {/* Bottom Handle: Height Crop / Vertical Framing (Ideal for Half-body!) */}
          <div
            onMouseDown={(e) => handleStartResize(e, "s")}
            className="resize-handle absolute -bottom-2.5 left-1/2 -translate-x-1/2 z-40 w-8 h-5 rounded-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center cursor-ns-resize shadow-lg transition-transform hover:scale-125 border border-white/40"
            title="Cortar Altura Livremente (Subir para meio corpo / Cortar pernas / Ajustar altura)"
          >
            <GripHorizontal className="w-3 h-3 text-cyan-300 pointer-events-none" />
          </div>

          {/* Bottom Right Handle: Free 2D Resize (Both Width & Height) */}
          <div
            onMouseDown={(e) => handleStartResize(e, "se")}
            className="resize-handle absolute -bottom-2.5 -right-2.5 z-40 w-6 h-6 rounded-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center cursor-se-resize shadow-lg transition-transform hover:scale-125 border border-white/40"
            title="Redimensionar Largura e Altura Livremente"
          >
            <Maximize2 className="w-3 h-3 text-white pointer-events-none" />
          </div>

          {/* Floating Contextual Toolbar */}
          <div
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className="no-drag absolute top-full mt-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 p-1 rounded-2xl bg-zinc-950/98 border border-purple-500/80 shadow-2xl backdrop-blur-xl text-xs font-semibold text-white pointer-events-auto whitespace-nowrap animate-in fade-in zoom-in-95 duration-100 before:absolute before:-top-3 before:left-0 before:right-0 before:h-3 before:content-['']"
          >
            {/* Drag Handle Button */}
            <div
              onMouseDown={handleStartDrag}
              className="flex items-center gap-1 px-2 py-1 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold cursor-move shadow transition-colors"
              title="Clique e arraste para mover"
            >
              <Move className="w-3 h-3 text-cyan-300" />
              <span className="text-[10px]">{activeImage.name || "Mover"}</span>
            </div>

            {/* Position & Layer Badge */}
            <span
              className={`px-1.5 py-0.5 rounded-lg font-mono text-[9px] border flex items-center gap-1 ${
                isBehindContent
                  ? "bg-amber-950/80 text-amber-300 border-amber-800/60"
                  : "bg-zinc-900 text-cyan-300 border-zinc-800"
              }`}
              title={isBehindContent ? "Camada atrás do conteúdo da página" : "Camada na frente do conteúdo"}
            >
              <span>{isBehindContent ? "Atrás" : "Frente"}</span>
              <span className="text-zinc-400">Z:{currentZIndex}</span>
            </span>

            {/* Section Attachment Selector */}
            <div
              className="flex items-center gap-1 bg-zinc-900/90 border border-zinc-700/80 rounded-lg px-2 py-0.5 text-zinc-300"
              title="Anexar imagem a uma seção da página (mudar de seção transfere a imagem automaticamente)"
            >
              <span className="text-[9px] text-zinc-400 font-semibold uppercase tracking-wider">Seção:</span>
              <select
                value={activeImage.targetSectionId || "hero"}
                onChange={(e) => {
                  e.stopPropagation();
                  const newSec = e.target.value;
                  const updated = {
                    ...activeImage,
                    targetSectionId: newSec,
                    offsetY: 20,
                    offsetX: 20,
                  };
                  setActiveImage(updated);
                  onUpdateImage?.(updated);
                  onUpdate?.(updated);
                }}
                className="bg-transparent text-purple-300 font-bold text-[10px] outline-none cursor-pointer pr-1"
              >
                <option value="hero" className="bg-zinc-950 text-white">Hero Principal</option>
                <option value="socialProof" className="bg-zinc-950 text-white">Prova Social</option>
                <option value="quiz" className="bg-zinc-950 text-white">Quiz & Diagnóstico</option>
                <option value="bentoGrid" className="bg-zinc-950 text-white">Bento Grid</option>
                <option value="photoGrid" className="bg-zinc-950 text-white">Galeria / Fotos</option>
                <option value="testimonials" className="bg-zinc-950 text-white">Depoimentos</option>
                <option value="formSection" className="bg-zinc-950 text-white">Formulário</option>
                <option value="faq" className="bg-zinc-950 text-white">FAQ / Dúvidas</option>
              </select>
            </div>

            {/* DEDICATED FIT & RESPONSIVENESS BUTTON */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsFitMenuOpen(!isFitMenuOpen);
                  setIsCropMenuOpen(false);
                  setIsShapeMenuOpen(false);
                }}
                className={`px-2 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 font-bold ${
                  activeImage.fitMode === "fit_container" || isFitMenuOpen
                    ? "bg-cyan-500 text-zinc-950 shadow-md"
                    : "hover:bg-zinc-800 text-cyan-300 hover:text-white"
                }`}
                title="Encaixar na página e ajustar responsividade (100% responsivo, tamanho original, centralizar)"
              >
                <Maximize className="w-3.5 h-3.5 stroke-[2.5]" />
                <span className="text-[10px]">Encaixar</span>
              </button>

              {/* DEDICATED FIT & RESPONSIVENESS POPOVER PANEL */}
              {isFitMenuOpen && (
                <div
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 z-50 p-3.5 rounded-2xl bg-zinc-950/98 border border-cyan-500/80 shadow-2xl backdrop-blur-xl flex flex-col gap-3 w-80 sm:w-88 animate-in fade-in zoom-in-95 duration-100 text-white select-none"
                >
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <div className="flex items-center gap-1.5">
                      <LayoutTemplate className="w-4 h-4 text-cyan-400" />
                      <div>
                        <div className="text-xs font-bold text-white">Encaixe & Responsividade</div>
                        <div className="text-[10px] text-zinc-400">Ajuste automático ao layout e aos dispositivos</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsFitMenuOpen(false)}
                      className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Primary 1-Click Fit Presets */}
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => applyFitPreset("full_width")}
                      className={`w-full p-2.5 rounded-xl border text-left transition-all hover:scale-[1.01] cursor-pointer ${
                        activeImage.fitMode === "full_width"
                          ? "bg-emerald-950/80 border-emerald-500 text-emerald-200 ring-2 ring-emerald-500/30"
                          : "bg-zinc-900 hover:bg-zinc-850 border-emerald-500/50 text-white"
                      }`}
                      title="Atravessa a landing page de ponta a ponta (100% largura total da tela sem travas)"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                          <Expand className="w-4 h-4" />
                          <span>↔️ De Lado a Lado (100% Tela Cheia)</span>
                        </div>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-900/60 text-emerald-300 font-mono">
                          Sangrado
                        </span>
                      </div>
                      <div className="text-[10px] text-zinc-400 pt-0.5">
                        Ocupa 100% da largura da tela sem limite de tamanho ou bordas
                      </div>
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => applyFitPreset("fit_container")}
                        className={`p-2.5 rounded-xl border text-left transition-all hover:scale-[1.02] cursor-pointer ${
                          activeImage.fitMode === "fit_container"
                            ? "bg-cyan-950/80 border-cyan-500 text-cyan-200 ring-2 ring-cyan-500/30"
                            : "bg-zinc-900 hover:bg-zinc-850 border-zinc-750 text-white"
                        }`}
                        title="Encaixa a imagem na largura do container padrão da página"
                      >
                        <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300">
                          <Maximize className="w-3.5 h-3.5" />
                          <span>No Container</span>
                        </div>
                        <div className="text-[10px] text-zinc-400 pt-0.5">
                          Largura da LP (Responsivo)
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => applyFitPreset("original")}
                        className={`p-2.5 rounded-xl border text-left transition-all hover:scale-[1.02] cursor-pointer ${
                          activeImage.fitMode === "original"
                            ? "bg-purple-950/80 border-purple-500 text-purple-200 ring-2 ring-purple-500/30"
                            : "bg-zinc-900 hover:bg-zinc-850 border-zinc-750 text-white"
                        }`}
                        title="Restaura a imagem para sua proporção original sem cortes artificiais"
                      >
                        <div className="flex items-center gap-1.5 text-xs font-bold text-purple-300">
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Tamanho Original</span>
                        </div>
                        <div className="text-[10px] text-zinc-400 pt-0.5">
                          Proporção natural da foto
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Alignment & Column Fitting */}
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      Alinhamento & Colunas Rápidas
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => applyFitPreset("center")}
                        className="px-2 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-left transition-all hover:scale-[1.02] cursor-pointer"
                        title="Centralizar no meio da página"
                      >
                        <div className="flex items-center gap-1 text-[11px] font-bold text-white">
                          <AlignCenter className="w-3 h-3 text-cyan-300" />
                          <span>Centralizar</span>
                        </div>
                        <div className="text-[9px] text-zinc-400">Meio da tela</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => applyFitPreset("half_col")}
                        className="px-2 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-left transition-all hover:scale-[1.02] cursor-pointer"
                        title="Encaixar em meia página (50% da largura)"
                      >
                        <div className="flex items-center gap-1 text-[11px] font-bold text-white">
                          <Columns className="w-3 h-3 text-purple-300" />
                          <span>Meia Coluna</span>
                        </div>
                        <div className="text-[9px] text-zinc-400">50% da largura</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => applyFitPreset("mobile_safe")}
                        className="px-2 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-left transition-all hover:scale-[1.02] cursor-pointer"
                        title="Ajusta largura máxima para evitar estouro em celulares"
                      >
                        <div className="flex items-center gap-1 text-[11px] font-bold text-white">
                          <Smartphone className="w-3 h-3 text-pink-300" />
                          <span>Modo Celular</span>
                        </div>
                        <div className="text-[9px] text-zinc-400">Trava anti-overflow</div>
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => applyFitPreset("align_left")}
                        className="px-2 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-left transition-all hover:scale-[1.02] cursor-pointer"
                        title="Encostar na borda esquerda da página"
                      >
                        <div className="flex items-center gap-1 text-[10px] font-medium">
                          <AlignLeft className="w-3 h-3 text-emerald-400" />
                          <span>Borda Esquerda</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => applyFitPreset("align_right")}
                        className="px-2 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-left transition-all hover:scale-[1.02] cursor-pointer"
                        title="Encostar na borda direita da página"
                      >
                        <div className="flex items-center gap-1 text-[10px] font-medium">
                          <AlignRight className="w-3 h-3 text-emerald-400" />
                          <span>Borda Direita</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => applyFitPreset("reset_position")}
                        className="px-2 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-left transition-all hover:scale-[1.02] cursor-pointer"
                        title="Restaurar posição e escala padrão"
                      >
                        <div className="flex items-center gap-1 text-[10px] font-medium">
                          <RotateCcw className="w-3 h-3 text-amber-400" />
                          <span>Resetar</span>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Reset Position */}
                  <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
                    <span className="text-[10px] text-zinc-400">
                      Dimensão atual: {widthPx}px {heightPx ? `× ${heightPx}px` : "(auto)"}
                    </span>
                    <button
                      type="button"
                      onClick={() => applyFitPreset("reset_position")}
                      className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer border border-zinc-800"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Resetar Posição</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* DEDICATED CROP & PROPORTION BUTTON */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsCropMenuOpen(!isCropMenuOpen);
                  setIsShapeMenuOpen(false);
                }}
                className={`px-2 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 font-bold ${
                  heightPx || isCropMenuOpen
                    ? "bg-amber-500 text-zinc-950 shadow-md"
                    : "hover:bg-zinc-800 text-amber-300 hover:text-white"
                }`}
                title="Cortar de Forma Livre (Meio corpo, Quadrado, Retangular, Foco do rosto)"
              >
                <Crop className="w-3.5 h-3.5 stroke-[2.5]" />
                <span className="text-[10px]">Cortar</span>
              </button>

              {/* DEDICATED CROP POPOVER PANEL */}
              {isCropMenuOpen && (
                <div
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 z-50 p-3.5 rounded-2xl bg-zinc-950/98 border border-amber-500/80 shadow-2xl backdrop-blur-xl flex flex-col gap-3 w-80 sm:w-88 animate-in fade-in zoom-in-95 duration-100 text-white select-none"
                >
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <div className="flex items-center gap-1.5">
                      <Crop className="w-4 h-4 text-amber-400" />
                      <div>
                        <div className="text-xs font-bold text-white">Recorte & Proporção Livre</div>
                        <div className="text-[10px] text-zinc-400">Corte livre, meio corpo, quadrado ou retângulo</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsCropMenuOpen(false)}
                      className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Quick Presets (1-Click) */}
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      Proporções Rápidas
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => applyCropPreset("bust")}
                        className="px-2 py-1.5 rounded-xl bg-purple-950/70 hover:bg-purple-900/80 border border-purple-500/50 text-purple-200 text-left transition-all hover:scale-[1.02] cursor-pointer"
                        title="Ideal para pessoas: corta na cintura e foca na cabeça/tronco"
                      >
                        <div className="flex items-center gap-1 text-[11px] font-bold text-white">
                          <User className="w-3 h-3 text-cyan-300" />
                          <span>Meio Corpo</span>
                        </div>
                        <div className="text-[9px] text-purple-300 opacity-80">Busto 3:4 (Topo)</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => applyCropPreset("square")}
                        className="px-2 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-left transition-all hover:scale-[1.02] cursor-pointer"
                      >
                        <div className="flex items-center gap-1 text-[11px] font-bold text-white">
                          <Square className="w-3 h-3 text-purple-400" />
                          <span>Quadrado</span>
                        </div>
                        <div className="text-[9px] text-zinc-400">1:1 Simétrico</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => applyCropPreset("landscape")}
                        className="px-2 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-left transition-all hover:scale-[1.02] cursor-pointer"
                      >
                        <div className="flex items-center gap-1 text-[11px] font-bold text-white">
                          <Tv className="w-3 h-3 text-emerald-400" />
                          <span>Retangular</span>
                        </div>
                        <div className="text-[9px] text-zinc-400">16:9 Widescreen</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => applyCropPreset("portrait")}
                        className="px-2 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-left transition-all hover:scale-[1.02] cursor-pointer"
                      >
                        <div className="flex items-center gap-1 text-[11px] font-bold text-white">
                          <Smartphone className="w-3 h-3 text-pink-400" />
                          <span>Stories</span>
                        </div>
                        <div className="text-[9px] text-zinc-400">9:16 Vertical</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => applyCropPreset("classic")}
                        className="px-2 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-left transition-all hover:scale-[1.02] cursor-pointer"
                      >
                        <div className="flex items-center gap-1 text-[11px] font-bold text-white">
                          <Tv className="w-3 h-3 text-cyan-400" />
                          <span>Foto 4:3</span>
                        </div>
                        <div className="text-[9px] text-zinc-400">Retângulo foto</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => applyCropPreset("free")}
                        className="px-2 py-1.5 rounded-xl bg-amber-950/70 hover:bg-amber-900/80 border border-amber-500/50 text-amber-200 text-left transition-all hover:scale-[1.02] cursor-pointer"
                      >
                        <div className="flex items-center gap-1 text-[11px] font-bold text-white">
                          <SlidersHorizontal className="w-3 h-3 text-amber-300" />
                          <span>Livre</span>
                        </div>
                        <div className="text-[9px] text-amber-300 opacity-80">Use as alças</div>
                      </button>
                    </div>
                  </div>

                  {/* Focus Point for Person / Subject */}
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                      <span>Foco do Enquadramento (Pessoa)</span>
                      <span className="text-[9px] font-mono text-purple-300">Y: {posY}%</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
                      <button
                        type="button"
                        onClick={() => applyCropFocus("top")}
                        className={`py-1 px-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                          posY <= 15
                            ? "bg-purple-600 text-white shadow"
                            : "text-zinc-400 hover:text-white"
                        }`}
                        title="Foca na cabeça e rosto (corta as pernas)"
                      >
                        <User className="w-3 h-3" />
                        <span>Topo / Rosto</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => applyCropFocus("center")}
                        className={`py-1 px-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                          posY > 15 && posY < 85
                            ? "bg-purple-600 text-white shadow"
                            : "text-zinc-400 hover:text-white"
                        }`}
                        title="Centralizado simetricamente"
                      >
                        <span>Centro</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => applyCropFocus("bottom")}
                        className={`py-1 px-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                          posY >= 85
                            ? "bg-purple-600 text-white shadow"
                            : "text-zinc-400 hover:text-white"
                        }`}
                        title="Foca na base / pés"
                      >
                        <span>Base / Pés</span>
                      </button>
                    </div>
                  </div>

                  {/* Sliders for Precision Height, Width & Pan */}
                  <div className="space-y-2 pt-1 border-t border-zinc-800/80">
                    {/* Height Slider */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-zinc-300">
                        <span>Altura do Recorte</span>
                        <span className="font-mono text-amber-300 font-bold">{heightPx || widthPx} px</span>
                      </div>
                      <input
                        type="range"
                        min="40"
                        max="2000"
                        step="5"
                        value={heightPx || widthPx}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          handleUpdate({
                            ...activeImage,
                            heightPx: val,
                            transform: {
                              ...activeImage.transform,
                              objectFit: "cover",
                              aspectRatio: "custom",
                            },
                          });
                        }}
                        className="w-full accent-amber-500 bg-zinc-900 h-1.5 rounded-lg cursor-pointer"
                      />
                      <div className="flex justify-between text-[9px] text-zinc-500">
                        <span>Baixo (Mais quadrado/retangular)</span>
                        <span>Alto (Corpo inteiro / Grande)</span>
                      </div>
                    </div>

                    {/* Width Slider */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-zinc-300">
                        <span>Largura</span>
                        <span className="font-mono text-amber-300 font-bold">{widthPx} px</span>
                      </div>
                      <input
                        type="range"
                        min="40"
                        max="2600"
                        step="10"
                        value={widthPx}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          handleUpdate({
                            ...activeImage,
                            widthPx: val,
                          });
                        }}
                        className="w-full accent-amber-500 bg-zinc-900 h-1.5 rounded-lg cursor-pointer"
                      />
                      <div className="flex justify-between text-[9px] text-zinc-500">
                        <span>Compacto (40px)</span>
                        <span>Largo / Tela Cheia (2600px)</span>
                      </div>
                    </div>

                    {/* Vertical Position (Fine tuning where body is sliced) */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-zinc-300">
                        <span>Posição Vertical da Foto (Y)</span>
                        <span className="font-mono text-purple-300 font-bold">{posY}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={posY}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          handleUpdate({
                            ...activeImage,
                            transform: {
                              ...activeImage.transform,
                              imagePositionY: val,
                              cropFocus: "custom",
                              objectFit: "cover",
                            },
                          });
                        }}
                        className="w-full accent-purple-500 bg-zinc-900 h-1.5 rounded-lg cursor-pointer"
                      />
                      <div className="flex justify-between text-[9px] text-zinc-500">
                        <span>0% (Cabeça/Topo)</span>
                        <span>50% (Tronco)</span>
                        <span>100% (Pés)</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons: Mouse Pan & Reset */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setIsPanCropActive(!isPanCropActive)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                        isPanCropActive
                          ? "bg-amber-500 text-zinc-950 shadow"
                          : "bg-zinc-900 hover:bg-zinc-800 text-amber-300 border border-zinc-700"
                      }`}
                      title="Clique para arrastar a foto com o mouse dentro do enquadramento"
                    >
                      <Move className="w-3 h-3" />
                      <span>{isPanCropActive ? "Modo Arrastar Ativo" : "Enquadrar c/ Mouse"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => applyCropPreset("reset")}
                      className="px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer border border-zinc-800"
                      title="Desfazer recorte e voltar à foto original completa"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Foto Original</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Shape Mask Dropdown Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsShapeMenuOpen(!isShapeMenuOpen);
                  setIsCropMenuOpen(false);
                }}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                  hasShapeMask || isShapeMenuOpen
                    ? "bg-purple-600 text-white shadow-sm"
                    : "hover:bg-zinc-800 text-zinc-300 hover:text-white"
                }`}
                title="Recortar em Formas (Círculo, Escudo, Estrela, etc.)"
              >
                <Shapes className="w-3.5 h-3.5 text-cyan-300" />
              </button>

              {/* Quick Shape Mask Popover */}
              {isShapeMenuOpen && (
                <div
                  onMouseDown={(e) => e.stopPropagation()}
                  className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 p-2 rounded-2xl bg-zinc-950/98 border border-purple-500/80 shadow-2xl backdrop-blur-xl flex flex-col gap-1 min-w-[170px] animate-in fade-in zoom-in-95 duration-100"
                >
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-1 pb-1 border-b border-zinc-800">
                    Formato Geométrico
                  </div>
                  <div className="grid grid-cols-1 gap-1 pt-1">
                    {QUICK_SHAPE_PRESETS.map((preset) => {
                      const isCurrent = (activeImage.mask?.type || "none") === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            handleUpdate({
                              ...activeImage,
                              mask: {
                                type: preset.id,
                                borderRadius: preset.id === "rounded" ? 24 : undefined,
                              },
                            });
                            setIsShapeMenuOpen(false);
                          }}
                          className={`flex items-center gap-2 px-2 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer text-left ${
                            isCurrent
                              ? "bg-purple-600 text-white font-bold"
                              : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
                          }`}
                        >
                          {preset.icon}
                          <span>{preset.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Change Image Trigger */}
            <button
              type="button"
              onClick={() =>
                onOpenImagePicker?.({
                  type: "hero",
                  currentUrl: activeImage.imageUrl,
                  itemId: activeImage.id,
                  title: `Trocar Imagem (${activeImage.name || "Livre"})`,
                })
              }
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
              title="Trocar Arquivo / Foto"
            >
              <Camera className="w-3.5 h-3.5 text-purple-400" />
            </button>

            {/* Effects & Full Modal Trigger */}
            <button
              type="button"
              onClick={() => onOpenVisualModal?.(activeImage.id)}
              className="p-1.5 rounded-lg hover:bg-purple-950 text-purple-300 hover:text-white transition-colors cursor-pointer"
              title="Efeitos, Sombra, Máscara e Filtros Avançados"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>

            {/* Layer Up / Trazer para Frente */}
            <button
              type="button"
              onClick={() =>
                handleUpdate({
                  ...activeImage,
                  zIndex: currentZIndex >= 10 ? currentZIndex + 5 : 20,
                })
              }
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
              title="Trazer para Frente do Conteúdo (+Camada)"
            >
              <ArrowUp className="w-3 h-3" />
            </button>

            {/* Layer Down / Enviar para Trás */}
            <button
              type="button"
              onClick={() =>
                handleUpdate({
                  ...activeImage,
                  zIndex: currentZIndex > 10 ? 5 : Math.max(0, currentZIndex - 2),
                })
              }
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
              title="Enviar para Trás do Conteúdo (-Camada)"
            >
              <ArrowDown className="w-3 h-3" />
            </button>

            {/* Duplicate */}
            <button
              type="button"
              onClick={() => onDuplicateImage?.(activeImage)}
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
              title="Duplicar Imagem"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>

            {/* Delete with Delete key hint */}
            <button
              type="button"
              onClick={handleDelete}
              className="p-1.5 rounded-lg hover:bg-rose-950 text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer flex items-center gap-1"
              title="Excluir Imagem (Tecla Delete)"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="text-[9px] font-mono opacity-60">Del</span>
            </button>

            {/* Deselect / Concluir Edição */}
            <button
              type="button"
              onClick={handleDeselect}
              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors cursor-pointer flex items-center gap-1 shadow-md"
              title="Concluir e Desmarcar Imagem (Esc)"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Concluir</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
