"use client";

import React, { useState } from 'react';
import { 
  Sparkles, 
  Star, 
  Award, 
  Briefcase, 
  ExternalLink, 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck, 
  Mail, 
  MapPin, 
  Send, 
  Layers, 
  UserCheck,
  Download,
  GraduationCap,
  Calendar,
  Phone,
  Globe,
  Heart,
  Music,
  Compass,
  Bike,
  Smile,
  X,
  Maximize2,
  ChevronRight,
  ChevronLeft,
  LayoutGrid
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EditableText } from "../editable-text";
import { useData } from "@/hooks/use-data";
import confetti from "canvas-confetti";

interface PortfolioTemplateProps {
  lp: any;
  s: any;
  setShowCard: (show: boolean) => void;
  editable?: boolean;
  onUpdateField?: (field: string, value: any) => void;
}

export function PortfolioTemplate({ lp, s, setShowCard, editable = false, onUpdateField }: PortfolioTemplateProps) {
  const { company } = useData();
  const [photoCountFilter, setPhotoCountFilter] = useState<3 | 6 | 9 | 12>(6);
  const [selectedPhotoZoom, setSelectedPhotoZoom] = useState<any | null>(null);
  const [currentTestimonialIdx, setCurrentTestimonialIdx] = useState(0);
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactForm, setContactForm] = useState({ name: "", email: "", message: "" });

  const primaryColor = lp.primaryColor || "#FF6A00";
  const authorName = lp.authorName || lp.title || "JONATHON DOE";
  const authorRole = lp.authorRole || "UI/UX DESIGNER & ARTISTA VISUAL";
  const avatarImage = lp.avatarImage || lp.hero?.imageUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80";

  // Gallery Photos (with explanatory captions!)
  const galleryPhotos = lp.galleryPhotos || [
    {
      id: "p1",
      title: "Identidade Visual & Branding Global",
      caption: "Criação de ecossistema de marca completo com tipografia exclusiva e diretrizes para expansão em 14 países.",
      category: "Branding",
      image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: "p2",
      title: "Design de Produto & Dashboard SaaS",
      caption: "Interface modular de alta densidade desenhada no Figma, otimizando o fluxo diário e aumentando retenção em +140%.",
      category: "UI/UX Design",
      image: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: "p3",
      title: "Direção de Arte & Ensaio Fotográfico",
      caption: "Produção fotográfica e estética visual de alta sofisticação para lançamento de coleção exclusiva.",
      category: "Fotografia",
      image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: "p4",
      title: "Aplicativo Mobile de Alta Conversão",
      caption: "Design system mobile nativo com microinterações fluidas e taxa de conclusão de onboarding de 94%.",
      category: "Mobile App",
      image: "https://images.unsplash.com/photo-1522542550221-31fd19575a2d?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: "p5",
      title: "Landing Pages de Alta Performance",
      caption: "Desenvolvimento de páginas de captura focadas em CRO, gerando mais de 5.000 leads qualificados em 30 dias.",
      category: "Web & CRO",
      image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: "p6",
      title: "Consultoria & Design System",
      caption: "Documentação de componentes reutilizáveis, governança de tokens e alinhamento ágil com o time de engenharia.",
      category: "Design System",
      image: "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: "p7",
      title: "Estratégia de Criativos & Mídia",
      caption: "Direção criativa de anúncios em vídeo e estáticos com retorno sobre investimento (ROAS) de 4.8x comprovado.",
      category: "Marketing",
      image: "https://images.unsplash.com/photo-1542744094-3a31f272c490?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: "p8",
      title: "Ilustrações 3D & Animações Digitais",
      caption: "Modelagem tridimensional e motion design que elevaram o tempo de permanência no website em +65%.",
      category: "3D & Motion",
      image: "https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: "p9",
      title: "Experiência de Checkout & E-commerce",
      caption: "Redesenho da etapa de pagamento com testes A/B que reduziram o abandono de carrinho em 22%.",
      category: "E-commerce",
      image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: "p10",
      title: "Facilitação de Design Sprint",
      caption: "Workshops imersivos de 5 dias com executivos para prototipagem rápida e validação de novas oportunidades.",
      category: "Workshop",
      image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: "p11",
      title: "Pesquisas de Usabilidade e UX Research",
      caption: "Entrevistas em profundidade com usuários reais para desvendar fricções críticas na navegação.",
      category: "UX Research",
      image: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: "p12",
      title: "Design Editorial & Publicações de Luxo",
      caption: "Diagramação de livros conceituais e relatórios anuais com acabamentos gráficos nobres e tiragem limitada.",
      category: "Editorial",
      image: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=800&q=80",
    },
  ];

  const visiblePhotos = galleryPhotos.slice(0, photoCountFilter);

  // Testimonials
  const testimonials = [
    {
      name: "Marcus Vinicius",
      role: "CEO na Vianna Tech",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
      content: "O trabalho entregue superou todas as expectativas. O refinamento visual e a preocupação com a experiência do usuário transformaram completamente o posicionamento do nosso produto no mercado internacional.",
    },
    {
      name: "Camila Rodrigues",
      role: "Head de Produto no Lumina App",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
      content: "Profissional extremamente comprometido, com visão estratégica e execução impecável. Entregou todos os prazos com rigor absoluto e facilidade de comunicação.",
    },
    {
      name: "Eduardo Torres",
      role: "Diretor Criativo na Studio Bravo",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80",
      content: "A capacidade de traduzir conceitos abstratos em interfaces elegantes e de alta conversão é rara. Recomendo de olhos fechados para qualquer marca exigente.",
    },
  ];

  // Blog / Latest Updates
  const blogPosts = [
    {
      title: "Como Escolher a Identidade Certa para seu Produto",
      date: "14 FEV 2026",
      category: "Branding",
      image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=600&q=80",
      summary: "Princípios essenciais para construir uma marca memorável que atrai clientes de alto valor.",
    },
    {
      title: "Checklist Completo de UX para Landing Pages",
      date: "08 FEV 2026",
      category: "UI/UX",
      image: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=600&q=80",
      summary: "Os 10 erros mais comuns na arquitetura de páginas e como corrigi-los para dobrar sua conversão.",
    },
    {
      title: "Tendências de Design e Tipografia para 2026",
      date: "02 FEV 2026",
      category: "Tendências",
      image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80",
      summary: "O retorno do minimalismo expressivo, grids dinâmicos e microinterações táteis nos produtos modernos.",
    },
  ];

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email) return;
    setContactSubmitted(true);
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  return (
    <div className="w-full min-h-screen flex flex-col bg-white text-slate-900 font-sans selection:bg-orange-500 selection:text-white">
      
      {/* 1. TOP HEADER NAVIGATION */}
      <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-xs">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          {/* Brand / Logo */}
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black tracking-tight text-slate-900 font-display">
              {authorName.split(" ")[0]}<span className="text-orange-500">.</span>
            </span>
          </div>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-wider text-slate-600">
            <a href="#home" className="hover:text-orange-500 transition-colors">Home</a>
            <a href="#about" className="hover:text-orange-500 transition-colors">Sobre Mim</a>
            <a href="#qualifications" className="hover:text-orange-500 transition-colors">Qualificações</a>
            <a href="#portfolio" className="hover:text-orange-500 transition-colors">Portfólio</a>
            <a href="#testimonials" className="hover:text-orange-500 transition-colors">Depoimentos</a>
            <a href="#blog" className="hover:text-orange-500 transition-colors">Artigos</a>
            <a href="#contact" className="hover:text-orange-500 transition-colors">Contato</a>
          </nav>

          {/* Action Button */}
          <div>
            <button
              type="button"
              onClick={() => setShowCard(true)}
              className="px-5 py-2.5 rounded-full bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-orange-500/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              Falar Comigo
            </button>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section id="home" className="relative bg-[#F4F7FC] pt-12 sm:pt-20 pb-28 sm:pb-36 px-6 overflow-hidden">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-12 gap-10 items-center relative z-10">
          
          {/* Left Text */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-600 font-extrabold text-xs uppercase tracking-wider">
              <span>HI, I AM</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight leading-[1.08] font-display">
              <EditableText
                editable={editable}
                value={authorName}
                onChange={(v) => onUpdateField?.('authorName', v)}
              />
            </h1>

            <div className="text-lg sm:text-xl font-bold text-orange-500 uppercase tracking-wide">
              <EditableText
                editable={editable}
                value={authorRole}
                onChange={(v) => onUpdateField?.('authorRole', v)}
              />
            </div>

            <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-xl">
              <EditableText
                editable={editable}
                value={lp.subtitle || "Olá e seja bem-vindo ao meu portfólio. Transformo visões estratégicas em identidades memoráveis, produtos digitais de alta performance e experiências visuais marcantes."}
                onChange={(v) => onUpdateField?.('subtitle', v)}
              />
            </p>

            {/* Social Icons */}
            <div className="flex items-center justify-center lg:justify-start gap-3 pt-1">
              {["Twitter", "Linkedin", "Instagram", "Github"].map((social, i) => (
                <div
                  key={i}
                  className="w-9 h-9 rounded-full bg-white border border-slate-200 text-slate-600 hover:text-orange-500 hover:border-orange-500/50 flex items-center justify-center text-xs font-bold shadow-2xs transition-all cursor-pointer hover:scale-110"
                >
                  {social[0]}
                </div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-4">
              <button
                type="button"
                onClick={() => setShowCard(true)}
                className="px-8 py-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs uppercase tracking-widest flex items-center gap-2.5 shadow-lg shadow-orange-500/25 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>DOWNLOAD CV / PROPOSTA</span>
              </button>

              <a
                href="#portfolio"
                className="px-6 py-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all hover:border-orange-500/40"
              >
                <span>Ver Portfólio</span>
                <ArrowRight className="w-4 h-4 text-orange-500" />
              </a>
            </div>
          </div>

          {/* Right Portrait Photo */}
          <div className="lg:col-span-5 flex justify-center relative">
            <div className="relative w-72 sm:w-96 aspect-4/5 rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-slate-200">
              <img
                src={avatarImage}
                alt={authorName}
                className="w-full h-full object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Floating 3-Metrics Card overlapping bottom of Hero */}
        <div className="max-w-4xl mx-auto mt-12 sm:mt-16 bg-white rounded-2xl p-6 sm:p-8 shadow-xl border border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-6 relative z-20">
          <div className="flex items-center gap-4 justify-center sm:justify-start sm:border-r border-slate-100 sm:pr-6">
            <div className="w-12 h-12 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center font-black text-lg shrink-0">
              🏆
            </div>
            <div>
              <div className="text-xl font-black text-slate-900">8+ Anos</div>
              <div className="text-xs text-slate-500 font-medium">Experiência Profissional</div>
            </div>
          </div>

          <div className="flex items-center gap-4 justify-center sm:justify-start sm:border-r border-slate-100 sm:pr-6">
            <div className="w-12 h-12 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center font-black text-lg shrink-0">
              📄
            </div>
            <div>
              <div className="text-xl font-black text-slate-900">+120</div>
              <div className="text-xs text-slate-500 font-medium">Projetos Concluídos</div>
            </div>
          </div>

          <div className="flex items-center gap-4 justify-center sm:justify-start">
            <div className="w-12 h-12 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center font-black text-lg shrink-0">
              👥
            </div>
            <div>
              <div className="text-xl font-black text-slate-900">95+</div>
              <div className="text-xs text-slate-500 font-medium">Clientes Satisfeitos</div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. ABOUT ME SECTION */}
      <section id="about" className="py-20 sm:py-28 px-6 bg-white border-b border-slate-100">
        <div className="max-w-5xl mx-auto space-y-12">
          
          <div className="text-center space-y-2">
            <span className="text-xs font-bold text-orange-500 uppercase tracking-widest">Apresentação</span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">Sobre Mim</h2>
            <div className="w-12 h-1 bg-orange-500 mx-auto rounded-full mt-2" />
          </div>

          <div className="grid md:grid-cols-12 gap-10 items-start">
            {/* Bio Paragraphs */}
            <div className="md:col-span-7 space-y-4 text-slate-600 text-sm sm:text-base leading-relaxed">
              <p>
                Sou designer multidisciplinar, especialista em transformar requisitos complexos de negócio em interfaces limpas, elegantes e altamente lucrativas.
              </p>
              <p>
                Com mais de 8 anos de atuação no mercado digital, já liderei a concepção visual de plataformas SaaS, marcas internacionais e campanhas publicitárias em mais de 14 países.
              </p>
              <p className="font-semibold text-slate-800">
                Minha filosofia une obsessão estética com métricas claras de negócio: cada cor, grid e microinteração existe para gerar resultados tangíveis.
              </p>
            </div>

            {/* Personal Details & Interests */}
            <div className="md:col-span-5 bg-slate-50 rounded-2xl p-6 border border-slate-200/80 space-y-6">
              <div className="space-y-3 text-xs text-slate-700">
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-orange-500 shrink-0" />
                  <span className="font-semibold">+55 (11) 98765-4321</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-orange-500 shrink-0" />
                  <span className="font-semibold">contato@jonathondoe.com</span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-orange-500 shrink-0" />
                  <span className="font-semibold">São Paulo, SP • Atendimento Global</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-900">Interesses & Hobbies:</div>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 text-xs font-medium text-slate-700">
                    <Compass className="w-3.5 h-3.5 text-orange-500" /> Viagens
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 text-xs font-medium text-slate-700">
                    <Music className="w-3.5 h-3.5 text-orange-500" /> Música
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 text-xs font-medium text-slate-700">
                    <Bike className="w-3.5 h-3.5 text-orange-500" /> Ciclismo
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 text-xs font-medium text-slate-700">
                    <Smile className="w-3.5 h-3.5 text-orange-500" /> Cinema & Arte
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. QUALIFICATION / MY PROFILE SECTION */}
      <section id="qualifications" className="py-20 sm:py-28 px-6 bg-[#F8FAFC]">
        <div className="max-w-5xl mx-auto space-y-16">
          
          <div className="text-center space-y-2">
            <span className="text-xs font-bold text-orange-500 uppercase tracking-widest">Currículo & Trajetória</span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">Meu Perfil Profissional</h2>
            <div className="w-12 h-1 bg-orange-500 mx-auto rounded-full mt-2" />
          </div>

          {/* Timeline Columns: Experience vs Education */}
          <div className="grid md:grid-cols-2 gap-12">
            
            {/* Work Experience */}
            <div className="space-y-6">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200">
                <Briefcase className="w-5 h-5 text-orange-500" />
                <h3 className="font-black text-lg text-slate-900 uppercase tracking-wide">Experiência Profissional</h3>
              </div>

              <div className="space-y-8 pl-4 border-l-2 border-orange-500/30">
                <div className="relative pl-6 space-y-1">
                  <div className="absolute -left-[29px] top-1 w-4 h-4 rounded-full bg-orange-500 border-4 border-white shadow-xs" />
                  <span className="text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-700">
                    2022 — Presente
                  </span>
                  <h4 className="text-base font-bold text-slate-900 pt-1">Diretor Criativo & Lead Designer</h4>
                  <div className="text-xs text-orange-600 font-semibold">Studio Autoral & Clientes Globais</div>
                  <p className="text-xs text-slate-600 pt-1 leading-relaxed">
                    Liderança na criação de marcas, produtos digitais de alta performance e consultoria estratégica para fundadores.
                  </p>
                </div>

                <div className="relative pl-6 space-y-1">
                  <div className="absolute -left-[29px] top-1 w-4 h-4 rounded-full bg-orange-500 border-4 border-white shadow-xs" />
                  <span className="text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700">
                    2019 — 2022
                  </span>
                  <h4 className="text-base font-bold text-slate-900 pt-1">Senior UI/UX Designer</h4>
                  <div className="text-xs text-slate-500 font-semibold">Agência de Inovação Digital</div>
                  <p className="text-xs text-slate-600 pt-1 leading-relaxed">
                    Arquitetura de informação, testes de usabilidade e prototipagem de produtos em larga escala.
                  </p>
                </div>

                <div className="relative pl-6 space-y-1">
                  <div className="absolute -left-[29px] top-1 w-4 h-4 rounded-full bg-orange-500 border-4 border-white shadow-xs" />
                  <span className="text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700">
                    2016 — 2019
                  </span>
                  <h4 className="text-base font-bold text-slate-900 pt-1">Designer Gráfico & Artista Visual</h4>
                  <div className="text-xs text-slate-500 font-semibold">Projetos Editoriais & Culturais</div>
                  <p className="text-xs text-slate-600 pt-1 leading-relaxed">
                    Criação de identidades visuais, diagramação de catálogos e direção de arte para eventos.
                  </p>
                </div>
              </div>
            </div>

            {/* Education */}
            <div className="space-y-6">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200">
                <GraduationCap className="w-5 h-5 text-orange-500" />
                <h3 className="font-black text-lg text-slate-900 uppercase tracking-wide">Formação Acadêmica</h3>
              </div>

              <div className="space-y-8 pl-4 border-l-2 border-orange-500/30">
                <div className="relative pl-6 space-y-1">
                  <div className="absolute -left-[29px] top-1 w-4 h-4 rounded-full bg-orange-500 border-4 border-white shadow-xs" />
                  <span className="text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-700">
                    2018 — 2020
                  </span>
                  <h4 className="text-base font-bold text-slate-900 pt-1">Pós-Graduação em Design de Interação</h4>
                  <div className="text-xs text-orange-600 font-semibold">Universidade de Design & Tecnologia</div>
                  <p className="text-xs text-slate-600 pt-1 leading-relaxed">
                    Especialização em arquitetura da informação, psicologia cognitiva e design centrado no ser humano.
                  </p>
                </div>

                <div className="relative pl-6 space-y-1">
                  <div className="absolute -left-[29px] top-1 w-4 h-4 rounded-full bg-orange-500 border-4 border-white shadow-xs" />
                  <span className="text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700">
                    2014 — 2018
                  </span>
                  <h4 className="text-base font-bold text-slate-900 pt-1">Bacharelado em Design Gráfico</h4>
                  <div className="text-xs text-slate-500 font-semibold">Faculdade de Belas Artes</div>
                  <p className="text-xs text-slate-600 pt-1 leading-relaxed">
                    Fundamentos de tipografia clássica, teoria das cores, composição espacial e direção de arte.
                  </p>
                </div>

                <div className="relative pl-6 space-y-1">
                  <div className="absolute -left-[29px] top-1 w-4 h-4 rounded-full bg-orange-500 border-4 border-white shadow-xs" />
                  <span className="text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700">
                    2021
                  </span>
                  <h4 className="text-base font-bold text-slate-900 pt-1">Certificação Internacional em Design System</h4>
                  <div className="text-xs text-slate-500 font-semibold">Global Design Institute</div>
                  <p className="text-xs text-slate-600 pt-1 leading-relaxed">
                    Domínio avançado de tokens, padronização em Figma e governança de componentes.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Skill Progress Bars & Languages */}
          <div className="pt-10 border-t border-slate-200 grid md:grid-cols-2 gap-10">
            
            {/* Skills */}
            <div className="space-y-4">
              <h4 className="font-black text-sm uppercase tracking-wider text-slate-900">Especialidades & Skills</h4>
              
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span>UI/UX & PRODUCT DESIGN</span>
                    <span className="text-orange-600">95%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500 rounded-full w-[95%]" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span>FIGMA & PROTOTIPAGEM AVANÇADA</span>
                    <span className="text-orange-600">92%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500 rounded-full w-[92%]" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span>BRANDING & IDENTIDADE VISUAL</span>
                    <span className="text-orange-600">90%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500 rounded-full w-[90%]" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span>FRONTEND & LANDING PAGES CRO</span>
                    <span className="text-orange-600">85%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500 rounded-full w-[85%]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Languages & References */}
            <div className="space-y-4">
              <h4 className="font-black text-sm uppercase tracking-wider text-slate-900">Idiomas & Referências</h4>
              
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span>PORTUGUÊS (NATIVO)</span>
                    <span className="text-orange-600">100%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-slate-800 rounded-full w-[100%]" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span>INGLÊS (FLUENTE / PROFISSIONAL)</span>
                    <span className="text-orange-600">95%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-slate-800 rounded-full w-[95%]" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span>ESPANHOL (INTERMEDIÁRIO)</span>
                    <span className="text-orange-600">80%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-slate-800 rounded-full w-[80%]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. PORTFOLIO EXPLORATION (PHOTO GRID SECTION WITH 3, 6, 9, 12 SELECTOR!) */}
      <section id="portfolio" className="py-20 sm:py-28 px-6 bg-white border-b border-slate-100">
        <div className="max-w-6xl mx-auto space-y-12">
          
          <div className="text-center space-y-2">
            <span className="text-xs font-bold text-orange-500 uppercase tracking-widest">Galeria & Obras</span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">PORTFOLIO EXPLORATION</h2>
            <div className="w-12 h-1 bg-orange-500 mx-auto rounded-full mt-2" />
            <p className="text-slate-600 text-sm max-w-xl mx-auto pt-1">
              Conheça alguns dos projetos mais expressivos desenvolvidos para marcas, produtos e clientes ao redor do mundo.
            </p>
          </div>

          {/* Photo Count Quick Selector (3, 6, 9, 12 Fotos) */}
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs font-bold text-slate-500 mr-2">Exibir Fotos:</span>
            {([3, 6, 9, 12] as const).map((cnt) => (
              <button
                key={cnt}
                type="button"
                onClick={() => setPhotoCountFilter(cnt)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer",
                  photoCountFilter === cnt
                    ? "bg-orange-500 text-white shadow-md shadow-orange-500/25 scale-105"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {cnt} Fotos
              </button>
            ))}
          </div>

          {/* Photo Grid with Explanatory Captions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {visiblePhotos.map((photo: any, index: number) => (
              <div
                key={photo.id || index}
                className="group relative bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden flex flex-col justify-between hover:shadow-xl hover:border-orange-500/50 transition-all duration-300 hover:-translate-y-1"
              >
                {/* Image Container */}
                <div className="relative aspect-4/3 w-full overflow-hidden bg-slate-200">
                  <img
                    src={photo.image}
                    alt={photo.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />

                  {/* Category Tag Badge */}
                  <div className="absolute top-3 left-3 z-10">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-black/75 backdrop-blur-md text-white border border-white/20">
                      {photo.category}
                    </span>
                  </div>

                  {/* Orange Hover Overlay */}
                  <div className="absolute inset-0 bg-orange-500/85 text-white p-6 flex flex-col justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-orange-100">
                        {photo.category}
                      </span>
                      <h4 className="text-lg font-black leading-tight pt-1">
                        {photo.title}
                      </h4>
                    </div>

                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setSelectedPhotoZoom(photo)}
                        className="px-4 py-2 rounded-xl bg-white text-orange-600 font-extrabold text-xs flex items-center gap-1.5 shadow-md cursor-pointer hover:bg-slate-100"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span>Ver Detalhes</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Explanatory Caption Card */}
                <div className="p-5 space-y-2 flex-1 flex flex-col justify-between">
                  <div className="space-y-1">
                    <h3 className="font-bold text-base text-slate-900 group-hover:text-orange-600 transition-colors leading-snug">
                      {photo.title}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                      {photo.caption}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setSelectedPhotoZoom(photo)}
                      className="text-xs font-bold text-orange-600 hover:text-orange-700 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>Ler Legenda Completa</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. TESTIMONIAL SECTION */}
      <section id="testimonials" className="py-20 sm:py-28 px-6 bg-[#F4F7FC]">
        <div className="max-w-4xl mx-auto space-y-10 text-center">
          
          <div className="space-y-2">
            <span className="text-xs font-bold text-orange-500 uppercase tracking-widest">Avaliações</span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">TESTIMONIAL</h2>
            <div className="w-12 h-1 bg-orange-500 mx-auto rounded-full mt-2" />
          </div>

          {/* Testimonial Quote Box */}
          <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-xl border border-slate-100 space-y-6 relative">
            <div className="text-4xl text-orange-500 font-serif">“</div>
            
            <p className="text-base sm:text-lg text-slate-700 italic leading-relaxed max-w-2xl mx-auto">
              {testimonials[currentTestimonialIdx].content}
            </p>

            <div className="space-y-1">
              <div className="font-black text-slate-900 text-base">
                {testimonials[currentTestimonialIdx].name}
              </div>
              <div className="text-xs text-orange-600 font-bold uppercase tracking-wider">
                {testimonials[currentTestimonialIdx].role}
              </div>
            </div>

            {/* Testimonial Switchers */}
            <div className="flex items-center justify-center gap-4 pt-4">
              <button
                type="button"
                onClick={() =>
                  setCurrentTestimonialIdx((prev) =>
                    prev === 0 ? testimonials.length - 1 : prev - 1
                  )
                }
                className="w-10 h-10 rounded-full bg-slate-100 hover:bg-orange-500 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3">
                {testimonials.map((t, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentTestimonialIdx(idx)}
                    className={cn(
                      "w-10 h-10 rounded-full overflow-hidden border-2 transition-all cursor-pointer",
                      currentTestimonialIdx === idx
                        ? "border-orange-500 ring-4 ring-orange-500/20 scale-110"
                        : "border-slate-300 opacity-60 hover:opacity-100"
                    )}
                  >
                    <img src={t.avatar} alt={t.name} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() =>
                  setCurrentTestimonialIdx((prev) =>
                    prev === testimonials.length - 1 ? 0 : prev + 1
                  )
                }
                className="w-10 h-10 rounded-full bg-slate-100 hover:bg-orange-500 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 7. LATEST UPDATES / BLOG SECTION */}
      <section id="blog" className="py-20 sm:py-28 px-6 bg-white border-b border-slate-100">
        <div className="max-w-6xl mx-auto space-y-12">
          
          <div className="text-center space-y-2">
            <span className="text-xs font-bold text-orange-500 uppercase tracking-widest">Publicações & Insights</span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">LATEST UPDATES</h2>
            <div className="w-12 h-1 bg-orange-500 mx-auto rounded-full mt-2" />
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {blogPosts.map((post, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group"
              >
                <div>
                  <div className="relative aspect-16/10 overflow-hidden bg-slate-100">
                    <img
                      src={post.image}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  
                  <div className="p-6 space-y-2">
                    <div className="text-[11px] font-bold text-orange-600 uppercase tracking-wider">
                      {post.date} • {post.category}
                    </div>
                    <h3 className="font-bold text-base text-slate-900 group-hover:text-orange-600 transition-colors">
                      {post.title}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                      {post.summary}
                    </p>
                  </div>
                </div>

                <div className="p-6 pt-0">
                  <button
                    type="button"
                    onClick={() => setShowCard(true)}
                    className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer"
                  >
                    READ MORE
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. CONTACT WITH ME SECTION */}
      <section id="contact" className="py-20 sm:py-28 px-6 bg-[#F4F7FC]">
        <div className="max-w-5xl mx-auto space-y-12">
          
          <div className="text-center space-y-2">
            <span className="text-xs font-bold text-orange-500 uppercase tracking-widest">Vamos Conversar</span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">CONTACT WITH ME</h2>
            <div className="w-12 h-1 bg-orange-500 mx-auto rounded-full mt-2" />
          </div>

          <div className="grid md:grid-cols-12 gap-8 items-start">
            
            {/* Form */}
            <div className="md:col-span-7 bg-white rounded-2xl p-6 sm:p-8 shadow-lg border border-slate-100 space-y-4">
              {contactSubmitted ? (
                <div className="text-center py-10 space-y-3">
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-2xl">
                    ✓
                  </div>
                  <h3 className="text-lg font-black text-slate-900">Mensagem Enviada com Sucesso!</h3>
                  <p className="text-xs text-slate-600 max-w-sm mx-auto">
                    Agradeço o contato. Responderei no seu e-mail em até 24 horas úteis.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Seu Nome</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Maria Silva"
                      value={contactForm.name}
                      onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-orange-500 bg-slate-50/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Seu E-mail</label>
                    <input
                      type="email"
                      required
                      placeholder="maria@empresa.com"
                      value={contactForm.email}
                      onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-orange-500 bg-slate-50/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Mensagem / Escopo do Projeto</label>
                    <textarea
                      rows={4}
                      required
                      placeholder="Conte um pouco sobre o projeto, expectativas e prazo..."
                      value={contactForm.message}
                      onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-orange-500 bg-slate-50/50"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 transition-all cursor-pointer hover:scale-[1.02] active:scale-95"
                  >
                    <Send className="w-4 h-4" />
                    <span>SEND MESSAGE</span>
                  </button>
                </form>
              )}
            </div>

            {/* Orange Info Cards */}
            <div className="md:col-span-5 space-y-4">
              
              <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="text-xs">
                  <div className="font-bold text-slate-900">Localização</div>
                  <div className="text-slate-500">São Paulo, Brasil • Atendimento Global</div>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5" />
                </div>
                <div className="text-xs">
                  <div className="font-bold text-slate-900">Telefone / WhatsApp</div>
                  <div className="text-slate-500">+55 (11) 98765-4321</div>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div className="text-xs">
                  <div className="font-bold text-slate-900">E-mail Direto</div>
                  <div className="text-slate-500">contato@jonathondoe.com</div>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0">
                  <Globe className="w-5 h-5" />
                </div>
                <div className="text-xs">
                  <div className="font-bold text-slate-900">Website & Portfólio</div>
                  <div className="text-slate-500">www.jonathondoe.com</div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* 9. FOOTER */}
      <footer className="py-8 px-6 bg-[#0B132B] text-slate-400 text-xs">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            Copyright © 2026 {authorName}. All Rights Reserved.
          </div>
          <div className="flex items-center gap-4">
            {["Twitter", "Facebook", "LinkedIn", "Instagram"].map((net, i) => (
              <span key={i} className="hover:text-orange-400 cursor-pointer transition-colors">
                {net}
              </span>
            ))}
          </div>
        </div>
      </footer>

      {/* Zoom / Lightbox Modal for Photo with Explanatory Caption */}
      {selectedPhotoZoom && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setSelectedPhotoZoom(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedPhotoZoom(null)}
              className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-black/70 text-white hover:bg-orange-500 transition-all cursor-pointer shadow-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="md:w-3/5 bg-slate-900 flex items-center justify-center overflow-hidden min-h-[300px]">
              <img
                src={selectedPhotoZoom.image}
                alt={selectedPhotoZoom.title}
                className="w-full h-full object-contain max-h-[75vh]"
              />
            </div>

            <div className="md:w-2/5 p-6 sm:p-8 flex flex-col justify-between bg-white text-slate-900 overflow-y-auto space-y-6">
              <div className="space-y-4">
                <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-orange-100 text-orange-700">
                  {selectedPhotoZoom.category}
                </span>

                <h3 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                  {selectedPhotoZoom.title}
                </h3>

                <div className="w-12 h-1 bg-orange-500 rounded-full" />

                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Legenda Explicativa do Projeto
                  </h4>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {selectedPhotoZoom.caption}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPhotoZoom(null);
                    setShowCard(true);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-md transition-colors"
                >
                  Solicitar Proposta Semelhante
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
