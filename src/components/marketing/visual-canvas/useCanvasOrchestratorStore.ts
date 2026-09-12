// src/components/marketing/visual-canvas/useCanvasOrchestratorStore.ts

import { create } from "zustand";
import type {
  CanvasElementBounds,
  ResizeHandle,
  DragState,
  ResizeState,
  AlignmentGuide,
  CanvasAlignmentType,
  SelectedElement,
  ElementStyleOverrides
} from "./types";

export interface CanvasOrchestratorState {
  // 1. Registro espacial e dimensional dos elementos no Canvas
  elementBounds: Record<string, CanvasElementBounds>;
  
  // 2. Registro de sobreposições de estilos visuais
  elementStyles: Record<string, ElementStyleOverrides>;

  // 3. Ordem de camadas Z-Index
  layerOrder: string[]; // IDs ordenados do fundo para o topo

  // 4. Estados de Seleção e Foco
  selectedElement: SelectedElement | null;
  selectedElementIds: string[];
  hoveredElementId: string | null;

  // 5. Estados Interativos de Drag-and-Drop e Redimensionamento
  dragState: DragState | null;
  resizeState: ResizeState | null;
  activeGuides: AlignmentGuide[];

  // 6. Configurações e Ferramentas do Canvas
  zoom: number; // 50% a 150%
  pan: { x: number; y: number };
  deviceView: "desktop" | "tablet" | "mobile";
  editorMode: "edit" | "preview";
  snapEnabled: boolean;
  snapGridSize: number; // tamanho da grade magnética em px (ex: 8)
  guidesEnabled: boolean;
  gridVisible: boolean;
  isFreeformMode: boolean; // Modo livre absoluto ou fluxo estruturado de dobras

  // 7. Ações de Posicionamento, Dimensões e Transformação
  registerElementBounds: (elementId: string, bounds: Partial<CanvasElementBounds>) => void;
  updateElementBounds: (elementId: string, updates: Partial<CanvasElementBounds>) => void;
  setElementPosition: (elementId: string, position: { x: number; y: number }, snap?: boolean) => void;
  setElementDimensions: (elementId: string, dimensions: { width?: number | string; height?: number | string }) => void;
  batchUpdateBounds: (updates: Record<string, Partial<CanvasElementBounds>>) => void;
  toggleElementLock: (elementId: string) => void;
  toggleElementVisibility: (elementId: string) => void;

  // 8. Ações de Gestão de Camadas e Z-Index
  bringToFront: (elementId: string) => void;
  sendToBack: (elementId: string) => void;
  bringForward: (elementId: string) => void;
  sendBackward: (elementId: string) => void;
  setElementZIndex: (elementId: string, zIndex: number) => void;
  reorderLayers: (newLayerOrder: string[]) => void;

  // 9. Orquestração de Drag & Drop
  startDrag: (elementId: string, clientX: number, clientY: number, initialBounds?: CanvasElementBounds) => void;
  updateDrag: (clientX: number, clientY: number, containerBounds?: { width: number; height: number }) => void;
  endDrag: () => void;

  // 10. Orquestração de Redimensionamento
  startResize: (
    elementId: string,
    handle: ResizeHandle,
    clientX: number,
    clientY: number,
    initialBounds?: CanvasElementBounds
  ) => void;
  updateResize: (clientX: number, clientY: number, lockAspectRatio?: boolean) => void;
  endResize: () => void;

  // 11. Ações de Seleção
  selectElement: (element: SelectedElement | null, multi?: boolean) => void;
  selectElementById: (elementId: string, multi?: boolean) => void;
  deselectAll: () => void;
  setHoveredElement: (elementId: string | null) => void;

  // 12. Ferramentas de Alinhamento e Distribuição Espacial
  alignSelected: (alignment: CanvasAlignmentType) => void;

  // 13. Ações de Configuração do Canvas
  setZoom: (zoom: number | ((prev: number) => number)) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  setPan: (pan: { x: number; y: number }) => void;
  setDeviceView: (device: "desktop" | "tablet" | "mobile") => void;
  setEditorMode: (mode: "edit" | "preview") => void;
  toggleSnap: () => void;
  setSnapGridSize: (size: number) => void;
  toggleGuides: () => void;
  toggleGrid: () => void;
  toggleFreeformMode: () => void;

  // 14. Gerenciador de Estilos por Elemento
  setElementStyle: (elementKey: string, updates: Partial<ElementStyleOverrides>) => void;
  resetElementStyles: () => void;
}

// Funções auxiliares para snap e cálculo magnético
const snapValue = (val: number, gridSize: number): number => {
  return Math.round(val / gridSize) * gridSize;
};

const DEFAULT_BOUNDS: CanvasElementBounds = {
  x: 0,
  y: 0,
  width: "100%",
  height: "auto",
  rotation: 0,
  zIndex: 10,
  minWidth: 40,
  minHeight: 20,
  isLocked: false,
  isVisible: true,
  isFreeform: false
};

export const useCanvasOrchestratorStore = create<CanvasOrchestratorState>((set, get) => ({
  elementBounds: {},
  elementStyles: {},
  layerOrder: [],
  selectedElement: null,
  selectedElementIds: [],
  hoveredElementId: null,
  dragState: null,
  resizeState: null,
  activeGuides: [],
  zoom: 100,
  pan: { x: 0, y: 0 },
  deviceView: "desktop",
  editorMode: "edit",
  snapEnabled: true,
  snapGridSize: 8,
  guidesEnabled: true,
  gridVisible: false,
  isFreeformMode: false,

  // -------------------------------------------------------------
  // REGISTRO E ATUALIZAÇÃO DE BOUNDS
  // -------------------------------------------------------------
  registerElementBounds: (elementId, bounds) => {
    set((state) => {
      const current = state.elementBounds[elementId] || DEFAULT_BOUNDS;
      const updatedBounds = {
        ...current,
        ...bounds,
        zIndex: bounds.zIndex ?? current.zIndex ?? (state.layerOrder.length + 1) * 10
      };

      const newLayerOrder = state.layerOrder.includes(elementId)
        ? state.layerOrder
        : [...state.layerOrder, elementId];

      return {
        elementBounds: {
          ...state.elementBounds,
          [elementId]: updatedBounds
        },
        layerOrder: newLayerOrder
      };
    });
  },

  updateElementBounds: (elementId, updates) => {
    set((state) => {
      const current = state.elementBounds[elementId] || DEFAULT_BOUNDS;
      return {
        elementBounds: {
          ...state.elementBounds,
          [elementId]: {
            ...current,
            ...updates
          }
        }
      };
    });
  },

  setElementPosition: (elementId, position, snap = true) => {
    const { snapEnabled, snapGridSize } = get();
    let finalX = position.x;
    let finalY = position.y;

    if (snap && snapEnabled) {
      finalX = snapValue(finalX, snapGridSize);
      finalY = snapValue(finalY, snapGridSize);
    }

    set((state) => {
      const current = state.elementBounds[elementId] || DEFAULT_BOUNDS;
      if (current.isLocked) return state;

      return {
        elementBounds: {
          ...state.elementBounds,
          [elementId]: {
            ...current,
            x: finalX,
            y: finalY
          }
        }
      };
    });
  },

  setElementDimensions: (elementId, dimensions) => {
    const { snapEnabled, snapGridSize } = get();

    set((state) => {
      const current = state.elementBounds[elementId] || DEFAULT_BOUNDS;
      if (current.isLocked) return state;

      let finalWidth = dimensions.width ?? current.width;
      let finalHeight = dimensions.height ?? current.height;

      if (typeof finalWidth === "number" && snapEnabled) {
        finalWidth = snapValue(finalWidth, snapGridSize);
      }
      if (typeof finalHeight === "number" && snapEnabled) {
        finalHeight = snapValue(finalHeight, snapGridSize);
      }

      return {
        elementBounds: {
          ...state.elementBounds,
          [elementId]: {
            ...current,
            width: finalWidth,
            height: finalHeight
          }
        }
      };
    });
  },

  batchUpdateBounds: (updates) => {
    set((state) => {
      const newBounds = { ...state.elementBounds };
      for (const [id, boundUpdate] of Object.entries(updates)) {
        newBounds[id] = {
          ...(newBounds[id] || DEFAULT_BOUNDS),
          ...boundUpdate
        };
      }
      return { elementBounds: newBounds };
    });
  },

  toggleElementLock: (elementId) => {
    set((state) => {
      const current = state.elementBounds[elementId] || DEFAULT_BOUNDS;
      return {
        elementBounds: {
          ...state.elementBounds,
          [elementId]: {
            ...current,
            isLocked: !current.isLocked
          }
        }
      };
    });
  },

  toggleElementVisibility: (elementId) => {
    set((state) => {
      const current = state.elementBounds[elementId] || DEFAULT_BOUNDS;
      return {
        elementBounds: {
          ...state.elementBounds,
          [elementId]: {
            ...current,
            isVisible: current.isVisible === false ? true : false
          }
        }
      };
    });
  },

  // -------------------------------------------------------------
  // Z-INDEX E ORDENAÇÃO DE CAMADAS
  // -------------------------------------------------------------
  bringToFront: (elementId) => {
    set((state) => {
      const currentOrder = state.layerOrder.filter((id) => id !== elementId);
      const newOrder = [...currentOrder, elementId];

      const newBounds = { ...state.elementBounds };
      newOrder.forEach((id, index) => {
        if (newBounds[id]) {
          newBounds[id] = {
            ...newBounds[id],
            zIndex: (index + 1) * 10
          };
        }
      });

      return {
        layerOrder: newOrder,
        elementBounds: newBounds
      };
    });
  },

  sendToBack: (elementId) => {
    set((state) => {
      const currentOrder = state.layerOrder.filter((id) => id !== elementId);
      const newOrder = [elementId, ...currentOrder];

      const newBounds = { ...state.elementBounds };
      newOrder.forEach((id, index) => {
        if (newBounds[id]) {
          newBounds[id] = {
            ...newBounds[id],
            zIndex: (index + 1) * 10
          };
        }
      });

      return {
        layerOrder: newOrder,
        elementBounds: newBounds
      };
    });
  },

  bringForward: (elementId) => {
    set((state) => {
      const idx = state.layerOrder.indexOf(elementId);
      if (idx === -1 || idx === state.layerOrder.length - 1) return state;

      const newOrder = [...state.layerOrder];
      const temp = newOrder[idx];
      newOrder[idx] = newOrder[idx + 1];
      newOrder[idx + 1] = temp;

      const newBounds = { ...state.elementBounds };
      newOrder.forEach((id, index) => {
        if (newBounds[id]) {
          newBounds[id] = {
            ...newBounds[id],
            zIndex: (index + 1) * 10
          };
        }
      });

      return {
        layerOrder: newOrder,
        elementBounds: newBounds
      };
    });
  },

  sendBackward: (elementId) => {
    set((state) => {
      const idx = state.layerOrder.indexOf(elementId);
      if (idx <= 0) return state;

      const newOrder = [...state.layerOrder];
      const temp = newOrder[idx];
      newOrder[idx] = newOrder[idx - 1];
      newOrder[idx - 1] = temp;

      const newBounds = { ...state.elementBounds };
      newOrder.forEach((id, index) => {
        if (newBounds[id]) {
          newBounds[id] = {
            ...newBounds[id],
            zIndex: (index + 1) * 10
          };
        }
      });

      return {
        layerOrder: newOrder,
        elementBounds: newBounds
      };
    });
  },

  setElementZIndex: (elementId, zIndex) => {
    set((state) => {
      const current = state.elementBounds[elementId] || DEFAULT_BOUNDS;
      return {
        elementBounds: {
          ...state.elementBounds,
          [elementId]: {
            ...current,
            zIndex
          }
        }
      };
    });
  },

  reorderLayers: (newLayerOrder) => {
    set((state) => {
      const newBounds = { ...state.elementBounds };
      newLayerOrder.forEach((id, index) => {
        if (newBounds[id]) {
          newBounds[id] = {
            ...newBounds[id],
            zIndex: (index + 1) * 10
          };
        }
      });

      return {
        layerOrder: newLayerOrder,
        elementBounds: newBounds
      };
    });
  },

  // -------------------------------------------------------------
  // ORQUESTRAÇÃO DE DRAG & DROP
  // -------------------------------------------------------------
  startDrag: (elementId, clientX, clientY, initialBounds) => {
    const state = get();
    const current = initialBounds || state.elementBounds[elementId] || DEFAULT_BOUNDS;
    if (current.isLocked) return;

    const initX = typeof current.x === "number" ? current.x : 0;
    const initY = typeof current.y === "number" ? current.y : 0;
    const initW = typeof current.width === "number" ? current.width : 200;
    const initH = typeof current.height === "number" ? current.height : 100;

    set({
      dragState: {
        elementId,
        startX: clientX,
        startY: clientY,
        initialX: initX,
        initialY: initY,
        currentX: initX,
        currentY: initY,
        isDragging: true,
        ghostBounds: {
          x: initX,
          y: initY,
          width: initW,
          height: initH
        }
      },
      activeGuides: []
    });
  },

  updateDrag: (clientX, clientY, containerBounds) => {
    const { dragState, zoom, snapEnabled, snapGridSize, guidesEnabled, elementBounds } = get();
    if (!dragState || !dragState.isDragging) return;

    const scale = zoom / 100;
    const deltaX = (clientX - dragState.startX) / scale;
    const deltaY = (clientY - dragState.startY) / scale;

    let targetX = dragState.initialX + deltaX;
    let targetY = dragState.initialY + deltaY;

    const guides: AlignmentGuide[] = [];

    // Snap magnético com outros elementos
    if (snapEnabled && guidesEnabled) {
      const ghostW = dragState.ghostBounds?.width || 100;
      const ghostH = dragState.ghostBounds?.height || 50;
      const snapThreshold = 6;

      // Snap magnético ao centro do container
      if (containerBounds) {
        const centerX = containerBounds.width / 2;
        const elemCenterX = targetX + ghostW / 2;
        if (Math.abs(elemCenterX - centerX) < snapThreshold) {
          targetX = centerX - ghostW / 2;
          guides.push({ type: "vertical", position: centerX, label: "Centro da Página" });
        }
      }

      // Alinhamento com outros elementos
      Object.entries(elementBounds).forEach(([otherId, otherBounds]) => {
        if (otherId === dragState.elementId || !otherBounds.isVisible) return;
        if (typeof otherBounds.x !== "number" || typeof otherBounds.y !== "number") return;
        const otherW = typeof otherBounds.width === "number" ? otherBounds.width : 100;
        const otherH = typeof otherBounds.height === "number" ? otherBounds.height : 50;

        // Alinhamento à Esquerda
        if (Math.abs(targetX - otherBounds.x) < snapThreshold) {
          targetX = otherBounds.x;
          guides.push({ type: "vertical", position: otherBounds.x, label: "Alinhar à Esquerda" });
        }
        // Alinhamento ao Topo
        if (Math.abs(targetY - otherBounds.y) < snapThreshold) {
          targetY = otherBounds.y;
          guides.push({ type: "horizontal", position: otherBounds.y, label: "Alinhar ao Topo" });
        }
      });

      // Grade magnética de fallback
      if (guides.length === 0) {
        targetX = snapValue(targetX, snapGridSize);
        targetY = snapValue(targetY, snapGridSize);
      }
    }

    set({
      dragState: {
        ...dragState,
        currentX: targetX,
        currentY: targetY,
        ghostBounds: {
          ...(dragState.ghostBounds || { width: 100, height: 50 }),
          x: targetX,
          y: targetY
        }
      },
      activeGuides: guides
    });
  },

  endDrag: () => {
    const { dragState } = get();
    if (!dragState) return;

    if (dragState.isDragging) {
      set((state) => {
        const current = state.elementBounds[dragState.elementId] || DEFAULT_BOUNDS;
        return {
          elementBounds: {
            ...state.elementBounds,
            [dragState.elementId]: {
              ...current,
              x: dragState.currentX,
              y: dragState.currentY,
              isFreeform: true
            }
          },
          dragState: null,
          activeGuides: []
        };
      });
    } else {
      set({ dragState: null, activeGuides: [] });
    }
  },

  // -------------------------------------------------------------
  // ORQUESTRAÇÃO DE REDIMENSIONAMENTO (RESIZING)
  // -------------------------------------------------------------
  startResize: (elementId, handle, clientX, clientY, initialBounds) => {
    const state = get();
    const current = initialBounds || state.elementBounds[elementId] || DEFAULT_BOUNDS;
    if (current.isLocked) return;

    const initX = typeof current.x === "number" ? current.x : 0;
    const initY = typeof current.y === "number" ? current.y : 0;
    const initW = typeof current.width === "number" ? current.width : 200;
    const initH = typeof current.height === "number" ? current.height : 100;

    const boundsObj = {
      x: initX,
      y: initY,
      width: initW,
      height: initH
    };

    set({
      resizeState: {
        elementId,
        handle,
        startX: clientX,
        startY: clientY,
        initialBounds: boundsObj,
        currentBounds: boundsObj,
        isResizing: true
      },
      activeGuides: []
    });
  },

  updateResize: (clientX, clientY, lockAspectRatio = false) => {
    const { resizeState, zoom, snapEnabled, snapGridSize } = get();
    if (!resizeState || !resizeState.isResizing) return;

    const scale = zoom / 100;
    const deltaX = (clientX - resizeState.startX) / scale;
    const deltaY = (clientY - resizeState.startY) / scale;

    const { initialBounds, handle } = resizeState;
    let newX = initialBounds.x;
    let newY = initialBounds.y;
    let newW = initialBounds.width;
    let newH = initialBounds.height;

    const minW = 40;
    const minH = 20;

    // Ajuste com base na alça acionada
    if (handle.includes("e")) {
      newW = Math.max(minW, initialBounds.width + deltaX);
    }
    if (handle.includes("s")) {
      newH = Math.max(minH, initialBounds.height + deltaY);
    }
    if (handle.includes("w")) {
      const possibleW = Math.max(minW, initialBounds.width - deltaX);
      newX = initialBounds.x + (initialBounds.width - possibleW);
      newW = possibleW;
    }
    if (handle.includes("n")) {
      const possibleH = Math.max(minH, initialBounds.height - deltaY);
      newY = initialBounds.y + (initialBounds.height - possibleH);
      newH = possibleH;
    }

    // Trava de proporção de aspecto (ex: para mídias/imagens)
    if (lockAspectRatio && initialBounds.width > 0 && initialBounds.height > 0) {
      const ratio = initialBounds.width / initialBounds.height;
      if (handle.includes("e") || handle.includes("w")) {
        newH = newW / ratio;
      } else {
        newW = newH * ratio;
      }
    }

    if (snapEnabled) {
      newW = snapValue(newW, snapGridSize);
      newH = snapValue(newH, snapGridSize);
      newX = snapValue(newX, snapGridSize);
      newY = snapValue(newY, snapGridSize);
    }

    set({
      resizeState: {
        ...resizeState,
        currentBounds: {
          x: newX,
          y: newY,
          width: newW,
          height: newH
        }
      }
    });
  },

  endResize: () => {
    const { resizeState } = get();
    if (!resizeState) return;

    if (resizeState.isResizing) {
      set((state) => {
        const current = state.elementBounds[resizeState.elementId] || DEFAULT_BOUNDS;
        return {
          elementBounds: {
            ...state.elementBounds,
            [resizeState.elementId]: {
              ...current,
              x: resizeState.currentBounds.x,
              y: resizeState.currentBounds.y,
              width: resizeState.currentBounds.width,
              height: resizeState.currentBounds.height
            }
          },
          resizeState: null,
          activeGuides: []
        };
      });
    } else {
      set({ resizeState: null, activeGuides: [] });
    }
  },

  // -------------------------------------------------------------
  // SELEÇÃO E FOCO
  // -------------------------------------------------------------
  selectElement: (element, multi = false) => {
    set((state) => {
      if (!element) {
        return {
          selectedElement: null,
          selectedElementIds: []
        };
      }

      const key = `${element.sectionId}_${element.elementType}${element.subId ? `_${element.subId}` : ""}`;

      let newIds = [key];
      if (multi) {
        newIds = state.selectedElementIds.includes(key)
          ? state.selectedElementIds.filter((id) => id !== key)
          : [...state.selectedElementIds, key];
      }

      return {
        selectedElement: element,
        selectedElementIds: newIds
      };
    });
  },

  selectElementById: (elementId, multi = false) => {
    set((state) => {
      const parts = elementId.split("_");
      const sectionId = parts[0];
      const elementType = parts[1] as any;
      const subId = parts[2];

      const selectedEl: SelectedElement = {
        sectionId,
        elementType: elementType || "section",
        subId,
        label: `Elemento ${elementType || "Seção"}`
      };

      let newIds = [elementId];
      if (multi) {
        newIds = state.selectedElementIds.includes(elementId)
          ? state.selectedElementIds.filter((id) => id !== elementId)
          : [...state.selectedElementIds, elementId];
      }

      return {
        selectedElement: selectedEl,
        selectedElementIds: newIds
      };
    });
  },

  deselectAll: () => {
    set({
      selectedElement: null,
      selectedElementIds: [],
      hoveredElementId: null
    });
  },

  setHoveredElement: (elementId) => {
    set({ hoveredElementId: elementId });
  },

  // -------------------------------------------------------------
  // ALINHAMENTO E DISTRIBUIÇÃO ESPACIAL
  // -------------------------------------------------------------
  alignSelected: (alignment) => {
    const { selectedElementIds, elementBounds } = get();
    if (selectedElementIds.length < 2 && alignment !== "center" && alignment !== "middle") return;

    const elementsToAlign = selectedElementIds.map((id) => ({
      id,
      bounds: elementBounds[id] || DEFAULT_BOUNDS
    }));

    const updates: Record<string, Partial<CanvasElementBounds>> = {};

    if (alignment === "left") {
      const minX = Math.min(...elementsToAlign.map((e) => (typeof e.bounds.x === "number" ? e.bounds.x : 0)));
      elementsToAlign.forEach((e) => {
        updates[e.id] = { x: minX };
      });
    } else if (alignment === "right") {
      const maxRight = Math.max(
        ...elementsToAlign.map((e) => {
          const x = typeof e.bounds.x === "number" ? e.bounds.x : 0;
          const w = typeof e.bounds.width === "number" ? e.bounds.width : 100;
          return x + w;
        })
      );
      elementsToAlign.forEach((e) => {
        const w = typeof e.bounds.width === "number" ? e.bounds.width : 100;
        updates[e.id] = { x: maxRight - w };
      });
    } else if (alignment === "top") {
      const minY = Math.min(...elementsToAlign.map((e) => (typeof e.bounds.y === "number" ? e.bounds.y : 0)));
      elementsToAlign.forEach((e) => {
        updates[e.id] = { y: minY };
      });
    } else if (alignment === "bottom") {
      const maxBottom = Math.max(
        ...elementsToAlign.map((e) => {
          const y = typeof e.bounds.y === "number" ? e.bounds.y : 0;
          const h = typeof e.bounds.height === "number" ? e.bounds.height : 50;
          return y + h;
        })
      );
      elementsToAlign.forEach((e) => {
        const h = typeof e.bounds.height === "number" ? e.bounds.height : 50;
        updates[e.id] = { y: maxBottom - h };
      });
    }

    get().batchUpdateBounds(updates);
  },

  // -------------------------------------------------------------
  // CONTROLES DO CANVAS
  // -------------------------------------------------------------
  setZoom: (zoom) => {
    set((state) => {
      const newZoom = typeof zoom === "function" ? zoom(state.zoom) : zoom;
      return { zoom: Math.min(150, Math.max(50, newZoom)) };
    });
  },

  zoomIn: () => {
    set((state) => ({ zoom: Math.min(150, state.zoom + 15) }));
  },

  zoomOut: () => {
    set((state) => ({ zoom: Math.max(50, state.zoom - 15) }));
  },

  resetZoom: () => {
    set({ zoom: 100, pan: { x: 0, y: 0 } });
  },

  setPan: (pan) => {
    set({ pan });
  },

  setDeviceView: (deviceView) => {
    set({ deviceView });
  },

  setEditorMode: (editorMode) => {
    set({ editorMode });
  },

  toggleSnap: () => {
    set((state) => ({ snapEnabled: !state.snapEnabled }));
  },

  setSnapGridSize: (snapGridSize) => {
    set({ snapGridSize });
  },

  toggleGuides: () => {
    set((state) => ({ guidesEnabled: !state.guidesEnabled }));
  },

  toggleGrid: () => {
    set((state) => ({ gridVisible: !state.gridVisible }));
  },

  toggleFreeformMode: () => {
    set((state) => ({ isFreeformMode: !state.isFreeformMode }));
  },

  // -------------------------------------------------------------
  // ESTILOS POR ELEMENTO
  // -------------------------------------------------------------
  setElementStyle: (elementKey, updates) => {
    set((state) => ({
      elementStyles: {
        ...state.elementStyles,
        [elementKey]: {
          ...(state.elementStyles[elementKey] || {}),
          ...updates
        }
      }
    }));
  },

  resetElementStyles: () => {
    set({ elementStyles: {} });
  }
}));
