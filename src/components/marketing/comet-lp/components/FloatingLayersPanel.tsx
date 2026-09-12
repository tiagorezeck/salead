import React, { useState, useRef, useEffect } from "react";
import { FloatingImageElement } from "../types/landingPage";
import {
  Layers,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  Trash2,
  Sliders,
  Plus,
  ChevronsUp,
  ChevronsDown,
  Sparkles,
  Eye,
  CheckCircle2,
  GripVertical,
  Move,
  X,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { getMaskClipPath } from "../utils/visualStyleHelpers";

interface FloatingLayersPanelProps {
  images: FloatingImageElement[];
  selectedImageId: string | null;
  onSelectImage: (id: string | null) => void;
  onUpdateImages: (images: FloatingImageElement[]) => void;
  onOpenVisualModal: (id: string) => void;
  onOpenInsertImage: () => void;
  isSidebarCollapsed?: boolean;
}

export const FloatingLayersPanel: React.FC<FloatingLayersPanelProps> = ({
  images,
  selectedImageId,
  onSelectImage,
  onUpdateImages,
  onOpenVisualModal,
  onOpenInsertImage,
  isSidebarCollapsed = false,
}) => {
  // Always start collapsed by default as requested
  const [isCollapsed, setIsCollapsed] = useState(true);
  const hasUserDraggedRef = useRef(false);

  const calculateDefaultPosition = (sidebarCollapsed: boolean) => {
    const isClient = typeof window !== "undefined";
    if (!isClient) return { x: 396, y: 520 };

    // When the sidebar is open, it has width sm:w-96 (384px) or w-80 (320px)
    // We position it immediately adjacent to the sidebar with a neat margin, as seen in the reference screenshot
    const sidebarWidth = sidebarCollapsed ? 0 : (window.innerWidth >= 640 ? 384 : 320);
    const initX = Math.max(16, Math.min(window.innerWidth - 340, sidebarWidth + 12));
    // Vertically placed at ~62% of viewport height (lower-mid region, matching screenshot)
    const initY = Math.max(120, Math.min(window.innerHeight - 100, Math.round(window.innerHeight * 0.62)));
    return { x: initX, y: initY };
  };

  // Draggable position state
  const [position, setPosition] = useState<{ x: number; y: number }>(() =>
    calculateDefaultPosition(isSidebarCollapsed)
  );

  useEffect(() => {
    if (!hasUserDraggedRef.current) {
      setPosition(calculateDefaultPosition(isSidebarCollapsed));
    }
  }, [isSidebarCollapsed]);
  
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number }>({
    startX: 0,
    startY: 0,
    initX: position.x,
    initY: position.y,
  });

  const handleMouseDownHeader = (e: React.MouseEvent) => {
    e.stopPropagation();
    hasUserDraggedRef.current = true;
    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: position.x,
      initY: position.y,
    };
  };

  const handleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPosition((prev) => {
      const isClient = typeof window !== "undefined";
      if (!isClient) return prev;
      const maxY = Math.max(70, window.innerHeight - 440);
      return {
        x: Math.max(10, Math.min(window.innerWidth - 340, prev.x)),
        y: Math.max(70, Math.min(prev.y, maxY)),
      };
    });
    setIsCollapsed(false);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStartRef.current.startX;
      const deltaY = e.clientY - dragStartRef.current.startY;
      const newX = Math.max(10, Math.min(window.innerWidth - 320, dragStartRef.current.initX + deltaX));
      const newY = Math.max(10, Math.min(window.innerHeight - 80, dragStartRef.current.initY + deltaY));
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  const sortedImages = [...images].sort((a, b) => {
    const zA = a.zIndex ?? 20;
    const zB = b.zIndex ?? 20;
    return zB - zA; // Descending: top/front (high z-index) first, bottom/back (low z-index) last
  });

  const handleUpdateZIndex = (id: string, newZ: number) => {
    const clampedZ = Math.max(1, Math.min(100, newZ));
    const updated = images.map((img) =>
      img.id === id ? { ...img, zIndex: clampedZ } : img
    );
    onUpdateImages(updated);
  };

  const handleBringToFront = (id: string) => {
    handleUpdateZIndex(id, 45);
    onSelectImage(id);
  };

  const handleSendToBack = (id: string) => {
    handleUpdateZIndex(id, 5);
    onSelectImage(id);
  };

  const handleStepUp = (id: string, currentZ: number) => {
    handleUpdateZIndex(id, currentZ + 5);
    onSelectImage(id);
  };

  const handleStepDown = (id: string, currentZ: number) => {
    handleUpdateZIndex(id, currentZ - 5);
    onSelectImage(id);
  };

  const handleDeleteImage = (id: string) => {
    const filtered = images.filter((img) => img.id !== id);
    onUpdateImages(filtered);
    if (selectedImageId === id) {
      onSelectImage(null);
    }
  };

  if (isCollapsed) {
    return (
      <div
        style={{
          position: "fixed",
          left: `${position.x}px`,
          top: `${position.y}px`,
          zIndex: 50,
        }}
        className="select-none"
      >
        <div
          onMouseDown={handleMouseDownHeader}
          className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-zinc-950/95 hover:bg-zinc-900 border border-purple-500/80 text-purple-300 hover:text-white text-xs font-bold shadow-[0_10px_30px_rgba(168,85,247,0.35)] backdrop-blur-xl transition-all cursor-move hover:scale-105"
        >
          <GripVertical className="w-3.5 h-3.5 text-purple-400 opacity-70" />
          <button
            type="button"
            onClick={handleExpand}
            className="flex items-center gap-1.5 pr-1 cursor-pointer"
            title="Expandir Gerenciador de Camadas"
          >
            <Layers className="w-4 h-4 text-purple-400" />
            <span>Camadas ({images.length})</span>
            <ChevronUp className="w-3.5 h-3.5 text-zinc-400" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 50,
      }}
      className={`w-80 max-w-[calc(100vw-2rem)] rounded-2xl bg-zinc-950/98 border border-purple-500/80 shadow-[0_20px_50px_rgba(0,0,0,0.85)] backdrop-blur-2xl flex flex-col overflow-hidden text-white transition-shadow ${
        isDragging ? "ring-2 ring-purple-500 shadow-purple-500/40" : ""
      } select-none animate-in fade-in duration-150`}
    >
      {/* Draggable Header Handle */}
      <div
        onMouseDown={handleMouseDownHeader}
        className="flex items-center justify-between px-3 py-2.5 border-b border-zinc-800/80 bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-purple-950/50 cursor-move"
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <GripVertical className="w-4 h-4 text-purple-400 shrink-0" />
          <div className="p-1 rounded-lg bg-purple-950/80 border border-purple-800/50 text-purple-300 shrink-0">
            <Layers className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
              <span>Camadas & Profundidade</span>
              <span className="px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-mono">
                {images.length}
              </span>
            </div>
            <div className="text-[9px] text-zinc-400 truncate">
              Arraste para mover o painel
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0" onMouseDown={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={onOpenInsertImage}
            className="p-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
            title="Inserir Nova Imagem / Sticker"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Minimizar painel de camadas"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Layer Stack Items */}
      <div className="max-h-64 overflow-y-auto p-2 space-y-1.5 divide-y-0 select-text">
        {sortedImages.length === 0 ? (
          <div className="p-4 text-center space-y-2 select-none">
            <p className="text-xs text-zinc-400">
              Nenhuma imagem flutuante inserida ainda.
            </p>
            <button
              type="button"
              onClick={onOpenInsertImage}
              className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 mx-auto transition-colors cursor-pointer shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Inserir Imagem</span>
            </button>
          </div>
        ) : (
          sortedImages.map((img, index) => {
            const z = img.zIndex ?? 20;
            const isSelected = selectedImageId === img.id;
            const isBehind = z <= 10;
            const isFront = z >= 30;
            const isTopLevel = index === 0;
            const isBottomLevel = index === sortedImages.length - 1;
            const clipPath = getMaskClipPath(img.mask?.type || "none", img.mask?.customPath);

            return (
              <div
                key={img.id}
                onClick={() => onSelectImage(img.id)}
                className={`p-2 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? "bg-purple-950/70 border-purple-500 shadow-md shadow-purple-950/60 ring-1 ring-purple-500"
                    : "bg-zinc-900/60 border-zinc-800/80 hover:bg-zinc-900 hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  {/* Left: Thumbnail and info */}
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {/* Thumbnail preview */}
                    <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-zinc-950 border border-zinc-700/60 shrink-0 flex items-center justify-center">
                      <div
                        className="w-full h-full"
                        style={clipPath ? { clipPath, WebkitClipPath: clipPath } : undefined}
                      >
                        <img
                          src={img.imageUrl}
                          alt={img.name || "Imagem"}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      {isSelected && (
                        <div className="absolute inset-0 bg-purple-600/30 ring-1 ring-purple-400" />
                      )}
                    </div>

                    {/* Image details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white truncate">
                          {img.name || `Imagem #${index + 1}`}
                        </span>
                        {isSelected && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        )}
                      </div>

                      {/* Depth and Section indicator badges */}
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-purple-950/70 text-purple-300 border border-purple-800/50">
                          {img.targetSectionId === "socialProof"
                            ? "Prova Social"
                            : img.targetSectionId === "quiz"
                            ? "Quiz"
                            : img.targetSectionId === "bentoGrid"
                            ? "Bento Grid"
                            : img.targetSectionId === "photoGrid"
                            ? "Galeria"
                            : img.targetSectionId === "testimonials"
                            ? "Depoimentos"
                            : img.targetSectionId === "formSection"
                            ? "Formulário"
                            : img.targetSectionId === "faq"
                            ? "FAQ"
                            : "Hero Principal"}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono border ${
                            isBehind
                              ? "bg-rose-950/80 text-rose-300 border-rose-800/60"
                              : isFront
                              ? "bg-purple-950/80 text-cyan-300 border-purple-700/60"
                              : "bg-amber-950/80 text-amber-300 border-amber-800/60"
                          }`}
                        >
                          {isBehind
                            ? "Fundo (Atrás)"
                            : isFront
                            ? "Frente (Sobreposto)"
                            : "Meio"}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-mono">
                          z:{z}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Layer depth quick controls */}
                  <div
                    className="flex items-center gap-0.5 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Step Up (+5 depth) */}
                    <button
                      type="button"
                      onClick={() => handleStepUp(img.id, z)}
                      className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                      title="Subir camada (+ profundidade)"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>

                    {/* Step Down (-5 depth) */}
                    <button
                      type="button"
                      onClick={() => handleStepDown(img.id, z)}
                      className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                      title="Descer camada (- profundidade)"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>

                    {/* Bring all the way to front (z: 45) */}
                    <button
                      type="button"
                      onClick={() => handleBringToFront(img.id)}
                      className={`p-1 rounded-lg transition-colors cursor-pointer ${
                        isFront && isTopLevel
                          ? "text-cyan-400 opacity-60"
                          : "text-zinc-400 hover:text-cyan-300 hover:bg-zinc-800"
                      }`}
                      title="Trazer para frente de tudo (Topo)"
                    >
                      <ChevronsUp className="w-3.5 h-3.5" />
                    </button>

                    {/* Send all the way to back (z: 5) */}
                    <button
                      type="button"
                      onClick={() => handleSendToBack(img.id)}
                      className={`p-1 rounded-lg transition-colors cursor-pointer ${
                        isBehind && isBottomLevel
                          ? "text-rose-400 opacity-60"
                          : "text-zinc-400 hover:text-rose-300 hover:bg-zinc-800"
                      }`}
                      title="Enviar para trás de tudo (Fundo)"
                    >
                      <ChevronsDown className="w-3.5 h-3.5" />
                    </button>

                    {/* Edit visual styles / shape crop */}
                    <button
                      type="button"
                      onClick={() => onOpenVisualModal(img.id)}
                      className="p-1 rounded-lg hover:bg-zinc-800 text-purple-400 hover:text-purple-300 transition-colors cursor-pointer"
                      title="Personalizar visual, recorte e efeitos"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => handleDeleteImage(img.id)}
                      className="p-1 rounded-lg hover:bg-rose-950/60 text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer"
                      title="Excluir imagem"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Panel Footer Tip */}
      <div className="p-2.5 border-t border-zinc-800/80 bg-zinc-950/90 text-[10px] text-zinc-400 flex items-center justify-between gap-2">
        <span className="truncate">
          💡 Clique na camada para selecionar
        </span>
        {selectedImageId && (
          <button
            type="button"
            onClick={() => onSelectImage(null)}
            className="text-purple-400 hover:text-purple-300 underline text-[10px] cursor-pointer whitespace-nowrap"
          >
            Desmarcar
          </button>
        )}
      </div>
    </div>
  );
};
