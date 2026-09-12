import React, { useState, useRef } from "react";
import {
  X,
  Plus,
  Trash2,
  Copy,
  Layers,
  Sparkles,
  Image as ImageIcon,
  Shield,
  Star,
  Award,
  Zap,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Sliders,
  Move,
  Camera,
  CheckCircle2,
  HelpCircle,
  Upload,
} from "lucide-react";
import { FloatingImageElement, LandingPage } from "../types/landingPage";

export const FLOATING_STICKER_PRESETS = [
  {
    id: "guarantee_7d",
    name: "Selo Garantia 7 Dias",
    category: "Garantia & Confiança",
    imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80",
    widthPx: 140,
    targetSectionId: "hero",
  },
  {
    id: "guarantee_30d_gold",
    name: "Selo Garantia 30 Dias Ouro",
    category: "Garantia & Confiança",
    imageUrl: "https://images.unsplash.com/photo-1633158829875-e5316a358c6f?auto=format&fit=crop&w=400&q=80",
    widthPx: 160,
    targetSectionId: "formSection",
  },
  {
    id: "ssl_security",
    name: "Selo Compra 100% Segura SSL",
    category: "Garantia & Confiança",
    imageUrl: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=400&q=80",
    widthPx: 180,
    targetSectionId: "formSection",
  },
  {
    id: "review_5stars",
    name: "Badge 5.0 Estrelas & Excelência",
    category: "Autoridade & Prova Social",
    imageUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
    widthPx: 150,
    targetSectionId: "hero",
  },
  {
    id: "best_seller_badge",
    name: "Badge #1 Mais Vendido do Brasil",
    category: "Autoridade & Prova Social",
    imageUrl: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=400&q=80",
    widthPx: 140,
    targetSectionId: "hero",
  },
  {
    id: "mockup_app_3d",
    name: "Mockup App / Dashboard 3D",
    category: "Mockups & Tecnologia",
    imageUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80",
    widthPx: 260,
    targetSectionId: "hero",
  },
  {
    id: "special_offer_ribbon",
    name: "Faixa Oferta Especial / Desconto",
    category: "Urgência & Vendas",
    imageUrl: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=400&q=80",
    widthPx: 160,
    targetSectionId: "hero",
  },
];

interface FloatingImagesManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  page?: LandingPage;
  onUpdatePage?: (updater: (prev: LandingPage) => LandingPage) => void;
  images?: FloatingImageElement[];
  onUpdateImages?: (updatedList: FloatingImageElement[]) => void;
  onOpenVisualModalForImage?: (imageId: string) => void;
  onOpenImagePicker?: (target: {
    type: "hero" | "bento" | "testimonial" | "avatar";
    currentUrl: string;
    itemId?: string;
    title: string;
  }) => void;
}

export const FloatingImagesManagerModal: React.FC<FloatingImagesManagerModalProps> = ({
  isOpen,
  onClose,
  page,
  onUpdatePage,
  images,
  onUpdateImages,
  onOpenVisualModalForImage,
  onOpenImagePicker,
}) => {
  const [customImageUrl, setCustomImageUrl] = useState("");
  const [customImageName, setCustomImageName] = useState("");
  const [selectedSection, setSelectedSection] = useState<string>("hero");
  const [selectedPresetCategory, setSelectedPresetCategory] = useState<string>("all");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const floatingImages: FloatingImageElement[] = page?.floatingImages || images || [];

  const updateImagesList = (updater: (prevList: FloatingImageElement[]) => FloatingImageElement[]) => {
    if (onUpdatePage) {
      onUpdatePage((prev) => ({
        ...prev,
        floatingImages: updater(prev?.floatingImages || []),
      }));
    } else if (onUpdateImages) {
      onUpdateImages(updater(floatingImages));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        if (base64) {
          setCustomImageUrl(base64);
          if (!customImageName) {
            setCustomImageName(file.name.replace(/\.[^/.]+$/, ""));
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddPresetSticker = (preset: (typeof FLOATING_STICKER_PRESETS)[0]) => {
    const newSticker: FloatingImageElement = {
      id: `floating-img-${Date.now()}`,
      name: preset.name,
      imageUrl: preset.imageUrl,
      targetSectionId: selectedSection || preset.targetSectionId,
      layerPosition: "overlay",
      zIndex: 25,
      offsetX: 100 + Math.floor(Math.random() * 60),
      offsetY: 140 + Math.floor(Math.random() * 60),
      widthPx: preset.widthPx,
      effects: {
        dropShadow: {
          enabled: true,
          x: 0,
          y: 12,
          blur: 24,
          spread: -4,
          color: "rgba(0,0,0,0.5)",
          preset: "medium",
        },
      },
      mask: {
        type: "none",
      },
      isVisible: true,
      transform: {
        rotate: 0,
        scale: 1,
      },
    };

    updateImagesList((prevList) => [...prevList, newSticker]);
  };

  const handleAddCustomImage = () => {
    if (!customImageUrl.trim()) return;

    const newImage: FloatingImageElement = {
      id: `floating-img-${Date.now()}`,
      name: customImageName.trim() || `Imagem Livre #${floatingImages.length + 1}`,
      imageUrl: customImageUrl.trim(),
      targetSectionId: selectedSection,
      layerPosition: "overlay",
      zIndex: 20,
      offsetX: 100,
      offsetY: 140,
      widthPx: 220,
      effects: {
        dropShadow: {
          enabled: true,
          x: 0,
          y: 10,
          blur: 25,
          color: "rgba(0,0,0,0.45)",
          preset: "medium",
        },
      },
      mask: {
        type: "none",
      },
      isVisible: true,
      transform: {
        rotate: 0,
        scale: 1,
      },
    };

    updateImagesList((prevList) => [...prevList, newImage]);

    setCustomImageUrl("");
    setCustomImageName("");
  };

  const handleDeleteImage = (id: string) => {
    updateImagesList((prevList) => prevList.filter((img) => img.id !== id));
  };

  const handleDuplicateImage = (img: FloatingImageElement) => {
    const duplicated: FloatingImageElement = {
      ...img,
      id: `floating-img-${Date.now()}`,
      name: `${img.name || "Imagem"} (Cópia)`,
      offsetX: (img.offsetX ?? 0) + 25,
      offsetY: (img.offsetY ?? 0) + 25,
    };

    updateImagesList((prevList) => [...prevList, duplicated]);
  };

  const handleToggleVisibility = (id: string) => {
    updateImagesList((prevList) =>
      prevList.map((img) =>
        img.id === id ? { ...img, isVisible: img.isVisible === false ? true : false } : img
      )
    );
  };

  const handleToggleLock = (id: string) => {
    updateImagesList((prevList) =>
      prevList.map((img) => (img.id === id ? { ...img, isLocked: !img.isLocked } : img))
    );
  };

  const categories = ["all", "Garantia & Confiança", "Autoridade & Prova Social", "Mockups & Tecnologia", "Urgência & Vendas"];

  const filteredPresets =
    selectedPresetCategory === "all"
      ? FLOATING_STICKER_PRESETS
      : FLOATING_STICKER_PRESETS.filter((p) => p.category === selectedPresetCategory);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-full bg-zinc-950 border border-purple-500/60 rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.85)] flex flex-col max-h-[92vh] overflow-hidden text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-zinc-900 via-zinc-900/95 to-purple-950/40 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                Sistema de Imagens Livres, Selos & Overlays (PNG/JPG/SVG)
              </h3>
              <p className="text-xs text-zinc-400">
                Adicione selos, mockups 3D, badges e imagens sem moldura com posicionamento livre
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {/* Add Custom Image Section */}
          <div className="p-5 bg-purple-950/20 border border-purple-800/40 rounded-3xl space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-purple-200 flex items-center gap-2">
              <Plus className="w-4 h-4 text-purple-400" />
              <span>Inserir Nova Imagem Livre via URL ou Upload</span>
            </h4>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*,.svg"
              className="hidden"
            />

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-5 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="URL da Imagem (ou clique no upload)"
                  value={customImageUrl}
                  onChange={(e) => setCustomImageUrl(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-purple-300 border border-zinc-700 hover:border-purple-500/50 transition-colors shrink-0 cursor-pointer"
                  title="Fazer Upload do Computador (PNG, JPG, SVG)"
                >
                  <Upload className="w-4 h-4" />
                </button>
              </div>

              <div className="sm:col-span-3">
                <input
                  type="text"
                  placeholder="Nome (Ex: Selo Black Friday)"
                  value={customImageName}
                  onChange={(e) => setCustomImageName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="sm:col-span-2">
                <select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="hero">Hero (Topo)</option>
                  <option value="socialProof">Prova Social</option>
                  <option value="bentoGrid">Bento Grid</option>
                  <option value="photoGrid">Galeria de Fotos</option>
                  <option value="testimonials">Depoimentos</option>
                  <option value="formSection">Formulário</option>
                  <option value="faq">FAQ</option>
                  <option value="global">Global (Toda Página)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <button
                  type="button"
                  onClick={handleAddCustomImage}
                  disabled={!customImageUrl.trim()}
                  className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-purple-950 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar</span>
                </button>
              </div>
            </div>
          </div>

          {/* Preset Stickers & Badges Library */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>Biblioteca de Selos, Badges & Mockups Prontos</span>
              </h4>

              {/* Category Pills */}
              <div className="flex items-center gap-1 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800 overflow-x-auto">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedPresetCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors whitespace-nowrap cursor-pointer ${
                      selectedPresetCategory === cat
                        ? "bg-purple-600 text-white"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    {cat === "all" ? "Todos" : cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {filteredPresets.map((preset) => (
                <div
                  key={preset.id}
                  className="p-3 bg-zinc-900/60 border border-zinc-800/80 hover:border-purple-500/60 rounded-2xl flex flex-col justify-between space-y-2 group transition-all"
                >
                  <div className="aspect-square rounded-xl bg-zinc-950/80 overflow-hidden flex items-center justify-center p-2 relative">
                    <img
                      src={preset.imageUrl}
                      alt={preset.name}
                      className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-white truncate">{preset.name}</h5>
                    <span className="text-[10px] text-zinc-500 block">{preset.category}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddPresetSticker(preset)}
                    className="w-full py-1.5 rounded-xl bg-zinc-800 hover:bg-purple-600 text-zinc-200 hover:text-white text-[11px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Inserir na LP</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Active Floating Images List */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
              <span>Imagens Livres Ativas nesta Landing Page ({floatingImages.length})</span>
              {floatingImages.length > 0 && (
                <span className="text-purple-300 font-normal">Arraste-as livremente direto no preview</span>
              )}
            </h4>

            {floatingImages.length === 0 ? (
              <div className="p-8 text-center bg-zinc-900/30 border border-dashed border-zinc-800 rounded-3xl space-y-2">
                <ImageIcon className="w-8 h-8 text-zinc-600 mx-auto" />
                <p className="text-xs text-zinc-400">
                  Nenhuma imagem livre adicionada ainda. Escolha um selo acima ou insira uma URL personalizada.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {floatingImages.map((img, idx) => (
                  <div
                    key={img.id}
                    className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-2xl flex items-center justify-between gap-3 hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-zinc-950 overflow-hidden flex items-center justify-center p-1 border border-zinc-800 shrink-0">
                        <img
                          src={img.imageUrl}
                          alt={img.name}
                          className="max-h-full max-w-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="font-bold text-xs text-white">{img.name || `Imagem #${idx + 1}`}</h5>
                          <span className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] text-purple-300 font-mono">
                            {img.targetSectionId || "hero"}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-400 flex items-center gap-2 pt-0.5">
                          <span>Largura: {img.widthPx || 220}px</span>
                          <span>•</span>
                          <span>X: {img.offsetX ?? 0}px, Y: {img.offsetY ?? 0}px</span>
                          <span>•</span>
                          <span>Z-Index: {img.zIndex ?? 20}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleToggleVisibility(img.id)}
                        className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                          img.isVisible !== false
                            ? "bg-zinc-800 text-zinc-200 border-zinc-700"
                            : "bg-zinc-900 text-zinc-500 border-zinc-800"
                        }`}
                        title={img.isVisible !== false ? "Ocultar Imagem" : "Mostrar Imagem"}
                      >
                        {img.isVisible !== false ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleLock(img.id)}
                        className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                          img.isLocked
                            ? "bg-amber-950 text-amber-300 border-amber-800"
                            : "bg-zinc-800 text-zinc-300 border-zinc-700"
                        }`}
                        title={img.isLocked ? "Desbloquear Posição" : "Bloquear Posição"}
                      >
                        {img.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          onOpenImagePicker?.({
                            type: "hero",
                            currentUrl: img.imageUrl,
                            itemId: img.id,
                            title: `Trocar Imagem (${img.name || "Livre"})`,
                          })
                        }
                        className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-purple-300 border border-zinc-700 hover:border-purple-500 transition-colors cursor-pointer"
                        title="Trocar Foto / Arquivo"
                      >
                        <Camera className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenVisualModalForImage?.(img.id)}
                        className="px-3 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600 text-purple-200 hover:text-white border border-purple-500/40 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Editar Efeitos, Sombra, Máscara e Rotação"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>Efeitos</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDuplicateImage(img)}
                        className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors cursor-pointer"
                        title="Duplicar Imagem"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteImage(img.id)}
                        className="p-2 rounded-xl hover:bg-rose-950 text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer"
                        title="Excluir Imagem"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-zinc-900/90 border-t border-zinc-800 flex items-center justify-between">
          <span className="text-xs text-zinc-400">
            Você pode arrastar, redimensionar e girar imagens livremente na tela do preview
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-950 transition-all cursor-pointer"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
