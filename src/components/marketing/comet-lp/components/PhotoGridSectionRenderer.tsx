import React, { useState } from "react";
import {
  PhotoGridSection,
  PhotoGridItem,
  TextAlign,
  FontSize,
  ContainerWidth,
  CardRadius,
  CardPadding,
} from "../types/landingPage";
import { InlineEditableText } from "./InlineEditableText";
import { SectionControlToolbar } from "./SectionControlToolbar";
import { DEFAULT_PHOTO_GRID_ITEMS } from "../data/defaultPhotoGrid";
import {
  Camera,
  Plus,
  Trash2,
  ExternalLink,
  ZoomIn,
  X,
  LayoutGrid,
  Sparkles,
  Sliders,
  ChevronRight,
  Maximize2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CustomElementStyleRecord } from "../types/landingPage";
import { getMergedElementStyles } from "../utils/visualStyleHelpers";

interface PhotoGridSectionRendererProps {
  section: PhotoGridSection;
  isEditorPreview?: boolean;
  deviceView?: "desktop" | "tablet" | "mobile";
  sectionIndex: number;
  totalSections: number;
  theme?: "light" | "dark" | "hybrid" | "midnight";
  accentColor?: string;
  customElementStyles?: Record<string, CustomElementStyleRecord>;
  onOpenVisualModal?: (elementId: string) => void;
  onUpdateSection: (updater: (prev: PhotoGridSection) => PhotoGridSection) => void;
  onMoveSection: (direction: "up" | "down") => void;
  onHideSection?: () => void;
  onOpenImagePicker?: (target: {
    type: "hero" | "bento" | "testimonial" | "avatar";
    currentUrl: string;
    itemId?: string;
    title: string;
  }) => void;
}

export const PhotoGridSectionRenderer: React.FC<PhotoGridSectionRendererProps> = ({
  section,
  isEditorPreview = false,
  deviceView = "desktop",
  sectionIndex,
  totalSections,
  theme = "dark",
  accentColor = "#FF6A00",
  customElementStyles,
  onOpenVisualModal,
  onUpdateSection,
  onMoveSection,
  onHideSection,
  onOpenImagePicker,
}) => {
  const [selectedPhotoForZoom, setSelectedPhotoForZoom] = useState<PhotoGridItem | null>(null);
  const isLight = theme === "light";

  const photoCount = section.photoCount || 6;
  const items = (section.items || []).slice(0, photoCount);
  const columns = section.columns || (photoCount === 3 ? 3 : photoCount === 12 ? 4 : 3);
  const layoutStyle = section.layoutStyle || "cards";

  const getColsClass = () => {
    if (deviceView === "mobile") {
      return "grid-cols-1";
    }
    if (deviceView === "tablet") {
      return "grid-cols-1 sm:grid-cols-2";
    }
    switch (columns) {
      case 2:
        return "grid-cols-1 md:grid-cols-2";
      case 4:
        return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";
      case 3:
      default:
        return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
    }
  };

  const handleChangePhotoCount = (count: 3 | 6 | 9 | 12) => {
    onUpdateSection((prev) => {
      let currentItems = [...(prev.items || [])];
      if (currentItems.length < count) {
        // fill with defaults
        const needed = count - currentItems.length;
        const pool = DEFAULT_PHOTO_GRID_ITEMS.filter(
          (d) => !currentItems.some((ci) => ci.id === d.id)
        );
        for (let i = 0; i < needed; i++) {
          const itemToAdd = pool[i % pool.length] || DEFAULT_PHOTO_GRID_ITEMS[0];
          currentItems.push({
            ...itemToAdd,
            id: `photo-${Date.now()}-${i}`,
          });
        }
      }
      return {
        ...prev,
        photoCount: count,
        columns: count === 3 ? 3 : count === 12 ? 4 : 3,
        items: currentItems,
      };
    });
  };

  const handleAddNewItem = () => {
    onUpdateSection((prev) => {
      const currentItems = [...(prev.items || [])];
      const nextIndex = currentItems.length + 1;
      const sample = DEFAULT_PHOTO_GRID_ITEMS[(nextIndex - 1) % DEFAULT_PHOTO_GRID_ITEMS.length];
      const newItem: PhotoGridItem = {
        id: `photo-${Date.now()}`,
        imageUrl: sample.imageUrl,
        title: `Novo Projeto #${nextIndex}`,
        caption: "Insira aqui uma legenda detalhada explicando o contexto, resultados ou diferenciais desta foto.",
        tag: "Destaque",
        linkText: "Ver Detalhes",
      };
      return {
        ...prev,
        items: [...currentItems, newItem],
      };
    });
  };

  const handleDeleteItem = (itemId: string) => {
    onUpdateSection((prev) => ({
      ...prev,
      items: (prev.items || []).filter((it) => it.id !== itemId),
    }));
  };

  return (
    <section
      id="portfolio-exploration"
      className={cn(
        "relative py-16 sm:py-24 px-4 sm:px-6 transition-colors duration-300",
        isLight ? "bg-slate-50 text-slate-900" : "bg-[#090C12] text-zinc-100"
      )}
    >
      {/* Background Decorative Touches */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div 
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[350px] rounded-full blur-[140px] opacity-15"
          style={{ backgroundColor: accentColor }}
        />
      </div>

      <div className="relative max-w-6xl mx-auto w-full space-y-12">
        {/* Editor Toolbar */}
        {isEditorPreview && (
          <div className="space-y-3">
            <SectionControlToolbar
              sectionId="photoGrid"
              sectionTitle="GRADE DE FOTOS COM LEGENDA EXPLICATIVA (3, 6, 9, 12 FOTOS)"
              icon={<LayoutGrid className="w-3.5 h-3.5 text-purple-400" />}
              sectionIndex={sectionIndex}
              totalSections={totalSections}
              onMoveSection={onMoveSection}
              onHideSection={onHideSection}
              containerWidth={section.containerWidth || "normal"}
              onChangeContainerWidth={(w) =>
                onUpdateSection((prev) => ({ ...prev, containerWidth: w }))
              }
            />

            {/* Quick Count & Column Selectors */}
            <div className="p-3 bg-purple-950/40 border border-purple-800/40 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-purple-200">Quantidade de Fotos:</span>
                <div className="flex items-center bg-black/40 p-1 rounded-xl border border-purple-700/50 gap-1">
                  {([3, 6, 9, 12] as const).map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => handleChangePhotoCount(cnt)}
                      className={cn(
                        "px-3 py-1 rounded-lg font-black text-xs transition-all cursor-pointer",
                        photoCount === cnt
                          ? "bg-purple-600 text-white shadow-md shadow-purple-600/40 scale-105"
                          : "text-zinc-400 hover:text-white hover:bg-white/10"
                      )}
                    >
                      {cnt} Fotos
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-400 font-medium">Colunas:</span>
                  <div className="flex items-center bg-black/40 p-1 rounded-xl border border-zinc-800 gap-1">
                    {([2, 3, 4] as const).map((col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => onUpdateSection((prev) => ({ ...prev, columns: col }))}
                        className={cn(
                          "px-2.5 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                          columns === col
                            ? "bg-zinc-700 text-white"
                            : "text-zinc-400 hover:text-white"
                        )}
                      >
                        {col} Col
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-zinc-400 font-medium">Estilo:</span>
                  <select
                    value={layoutStyle}
                    onChange={(e) =>
                      onUpdateSection((prev) => ({
                        ...prev,
                        layoutStyle: e.target.value as any,
                      }))
                    }
                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1 text-zinc-200 font-medium text-xs focus:outline-none focus:border-purple-500"
                  >
                    <option value="cards">Cards Clássicos com Legenda</option>
                    <option value="overlay_caption">Legenda Sobreposta (Hover)</option>
                    <option value="polaroid">Estilo Polaroid & Moldura</option>
                    <option value="mosaic">Mosaico Criativo & Destaque</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleAddNewItem}
                  className="px-3 py-1 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Foto</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          {section.badge && (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-primary/10 text-primary border border-primary/20 shadow-xs">
              <Sparkles className="w-3 h-3" />
              <InlineEditableText
                value={section.badge}
                isEditorPreview={isEditorPreview}
                onChange={(val) => onUpdateSection((prev) => ({ ...prev, badge: val }))}
              />
            </div>
          )}

          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            <InlineEditableText
              value={section.title}
              isEditorPreview={isEditorPreview}
              onChange={(val) => onUpdateSection((prev) => ({ ...prev, title: val }))}
            />
          </h2>

          <div 
            className="w-16 h-1 mx-auto rounded-full mt-2" 
            style={{ backgroundColor: accentColor }} 
          />

          {section.subtitle && (
            <div className={cn(
              "text-sm sm:text-base font-normal max-w-2xl mx-auto leading-relaxed pt-1",
              isLight ? "text-slate-600" : "text-zinc-400"
            )}>
              <InlineEditableText
                value={section.subtitle}
                isEditorPreview={isEditorPreview}
                onChange={(val) => onUpdateSection((prev) => ({ ...prev, subtitle: val }))}
              />
            </div>
          )}
        </div>

        {/* Photo Grid Container */}
        <div className={cn("grid gap-6 sm:gap-8", getColsClass())}>
          {items.map((item, index) => {
            const itemKey = `photoGrid_item_${item.id || index}`;
            const itemStyle = customElementStyles?.[itemKey];
            const mergedStyles = getMergedElementStyles(itemStyle);

            return (
              <div
                key={item.id || index}
                className={cn(
                  "group relative flex flex-col rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl",
                  isLight
                    ? "bg-white border border-slate-200/80 shadow-sm hover:border-primary/40 hover:-translate-y-1"
                    : "bg-zinc-900/90 border border-zinc-800/80 hover:border-primary/40 hover:-translate-y-1"
                )}
                style={mergedStyles.containerStyle}
              >
                {/* Photo Thumbnail */}
                <div className="relative aspect-4/3 w-full overflow-hidden bg-zinc-800/50">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                    loading="lazy"
                    style={mergedStyles.imageStyle}
                  />

                  {/* Gradient Overlay for subtle depth */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  {/* Category Tag */}
                  {item.tag && (
                    <div className="absolute top-3 left-3 z-10">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-black/75 backdrop-blur-md text-white border border-white/15 shadow-sm">
                        {item.tag}
                      </span>
                    </div>
                  )}

                  {/* Zoom Lightbox Trigger */}
                  <button
                    type="button"
                    onClick={() => setSelectedPhotoForZoom(item)}
                    className="absolute bottom-3 right-3 p-2 rounded-xl bg-black/75 hover:bg-primary text-white backdrop-blur-md border border-white/20 opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg cursor-pointer hover:scale-110"
                    title="Ampliar Foto e Detalhes"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>

                  {/* Image Tools: Change & Effects (Editor Mode) */}
                  {isEditorPreview && (
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 z-20">
                      {onOpenVisualModal && (
                        <button
                          type="button"
                          onClick={() => onOpenVisualModal(itemKey)}
                          className="p-2 rounded-xl bg-purple-950/90 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/50 shadow-lg cursor-pointer transition-all hover:scale-105"
                          title="Ajustar Efeitos, Sombra, Filtros e Recorte desta Foto"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          onOpenImagePicker?.({
                            type: "bento",
                            currentUrl: item.imageUrl,
                            itemId: item.id,
                            title: `Trocar Foto #${index + 1} (${item.title})`,
                          })
                        }
                        className="p-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-lg cursor-pointer transition-all hover:scale-105"
                        title="Alterar Imagem da Foto"
                      >
                        <Camera className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Explanatory Caption & Title Area */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    {/* Tag Editor (in editor mode) */}
                    {isEditorPreview && (
                      <div className="flex items-center justify-between text-[11px] text-zinc-400">
                        <span className="font-bold">Tag / Categoria:</span>
                        <input
                          type="text"
                          value={item.tag || ""}
                          placeholder="Ex: UI/UX, Fotografia..."
                          onChange={(e) => {
                            const val = e.target.value;
                            onUpdateSection((prev) => {
                              const next = [...(prev.items || [])];
                              next[index] = { ...next[index], tag: val };
                              return { ...prev, items: next };
                            });
                          }}
                          className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-white text-[10px] w-28 focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    )}

                    <h3 className={cn(
                      "font-bold text-base leading-snug tracking-tight group-hover:text-primary transition-colors",
                      isLight ? "text-slate-900" : "text-white"
                    )}>
                      <InlineEditableText
                        value={item.title}
                        isEditorPreview={isEditorPreview}
                        onChange={(val) => {
                          onUpdateSection((prev) => {
                            const next = [...(prev.items || [])];
                            next[index] = { ...next[index], title: val };
                            return { ...prev, items: next };
                          });
                        }}
                      />
                    </h3>

                    <div className={cn(
                      "text-xs leading-relaxed line-clamp-3",
                      isLight ? "text-slate-600" : "text-zinc-400"
                    )}>
                      <InlineEditableText
                        value={item.caption}
                        isEditorPreview={isEditorPreview}
                        onChange={(val) => {
                          onUpdateSection((prev) => {
                            const next = [...(prev.items || [])];
                            next[index] = { ...next[index], caption: val };
                            return { ...prev, items: next };
                          });
                        }}
                      />
                    </div>
                  </div>

                  {/* Action Link / Lightbox prompt */}
                  <div className={cn(
                    "pt-3 border-t flex items-center justify-between text-xs font-bold",
                    isLight ? "border-slate-100" : "border-zinc-800/80"
                  )}>
                    <button
                      type="button"
                      onClick={() => setSelectedPhotoForZoom(item)}
                      className="inline-flex items-center gap-1.5 text-primary hover:underline cursor-pointer group-hover:translate-x-0.5 transition-transform"
                    >
                      <span>{item.linkText || "Ver Detalhes"}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete Item (Editor Mode) */}
                    {isEditorPreview && items.length > 3 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                        title="Remover esta foto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lightbox / Zoom Modal */}
      {selectedPhotoForZoom && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setSelectedPhotoForZoom(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-zinc-900 border border-zinc-700/80 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setSelectedPhotoForZoom(null)}
              className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-black/70 text-white hover:bg-white hover:text-black transition-all cursor-pointer shadow-lg"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Photo Container */}
            <div className="md:w-3/5 bg-black flex items-center justify-center overflow-hidden min-h-[300px]">
              <img
                src={selectedPhotoForZoom.imageUrl}
                alt={selectedPhotoForZoom.title}
                className="w-full h-full object-contain max-h-[75vh]"
              />
            </div>

            {/* Caption & Info Panel */}
            <div className="md:w-2/5 p-6 sm:p-8 flex flex-col justify-between bg-zinc-900 text-white overflow-y-auto space-y-6">
              <div className="space-y-4">
                {selectedPhotoForZoom.tag && (
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-primary/20 text-primary border border-primary/30">
                    {selectedPhotoForZoom.tag}
                  </span>
                )}

                <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">
                  {selectedPhotoForZoom.title}
                </h3>

                <div className="w-12 h-1 bg-primary rounded-full" />

                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Legenda Explicativa & Contexto
                  </h4>
                  <p className="text-sm text-zinc-300 leading-relaxed font-normal">
                    {selectedPhotoForZoom.caption}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
                <span className="text-xs text-zinc-500">Galeria SALEAD</span>
                <button
                  type="button"
                  onClick={() => setSelectedPhotoForZoom(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
