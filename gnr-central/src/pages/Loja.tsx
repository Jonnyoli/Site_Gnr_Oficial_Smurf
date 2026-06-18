import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  motion,
} from "framer-motion";
import {
  AlertTriangle,
  BadgeCheck,
  Car,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Coins,
  Crown,
  Eye,
  FileSearch,
  Flame,
  Gem,
  Gift,
  GraduationCap,
  Heart,
  History,
  Image,
  Landmark,
  LayoutGrid,
  Link,
  Loader2,
  Lock,
  Medal,
  MessageSquare,
  Package,
  Paintbrush,
  Plane,
  Radar,
  ReactNode,
  RefreshCcw,
  Scale,
  Search,
  Shield,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Star,
  Stars,
  Sword,
  Tag,
  Target,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import { hasUsableStoreImage, resolveFinalStoreAsset } from "../config/finalStoreAssets";

type StoreSection =
  | "DESTAQUES"
  | "CATALOGO"
  | "PACKS"
  | "SOCIAL"
  | "INVENTARIO"
  | "MISSOES"
  | "HISTORICO";

type StoreCategory =
  | "TODOS"
  | "MOLDURAS"
  | "EMBLEMAS"
  | "FUNDOS"
  | "TITULOS"
  | "TEMAS"
  | "COLECOES"
  | "SOCIAL"
  | "EXCLUSIVOS";

type StoreRarity =
  | "COMUM"
  | "RARO"
  | "EPICO"
  | "LENDARIO"
  | "EXCLUSIVO"
  | "INSTITUCIONAL";

type StoreItem = {
  id: string;
  name: string;
  description: string;
  category: Exclude<StoreCategory, "TODOS">;
  rarity: StoreRarity;
  price: number;
  stock?: number | null;
  soldCount?: number;
  purchasable?: boolean;
  icon: any;
  preview: string;
  image?: string;
  collection?: string;
  locked?: boolean;
  requirement?: string;
  featured?: boolean;
  limited?: boolean;
  discount?: number;
  socialType?:
    | "MURAL_BACKGROUND"
    | "COMMENT_STYLE"
    | "SIGNATURE"
    | "REACTION_PACK"
    | "SOCIAL_BADGE"
    | "HIGHLIGHT_STYLE"
    | "ENTRY_EFFECT";
  previewRoute?: string;
  tagline?: string;
  bestFor?: string;
  features?: string[];
  tags?: string[];
  displayBadge?: string;
};

type StoreBundle = {
  id: string;
  name: string;
  description: string;
  unit: string;
  icon: any;
  image?: string;
  className: string;
  itemIds: string[];
  price: number;
  oldPrice?: number;
  locked?: boolean;
  requirement?: string;
};

type StoreMission = {
  id: string;
  name: string;
  description: string;
  reward: number;
  progress: number;
  target: number;
  icon: any;
  tone: "primary" | "gold" | "blue" | "red" | "cyan";
};

const DEV_USER_ID = "713719718091030599";

const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";

const STORE_ITEMS: StoreItem[] = [
  {
    id: "frame-green",
    name: "Moldura GNR",
    description: "Moldura institucional base da Guarda Nacional Republicana.",
    category: "MOLDURAS",
    rarity: "COMUM",
    price: 150,
    icon: Shield,
    preview: "border-primary/50 bg-primary/10",
    image: "/Store/frames/GNR1_clean.png",
    collection: "Coleção GNR",
    featured: true,
  },
  {
    id: "frame-gold",
    name: "Moldura Mérito Dourado",
    description: "Moldura dourada para militares distinguidos por mérito.",
    category: "MOLDURAS",
    rarity: "EPICO",
    price: 750,
    icon: Trophy,
    preview: "border-yellow-400/60 bg-yellow-500/10",
    image: "/Store/frames/GNR1_clean.png",
    collection: "Coleção Mérito",
    featured: true,
  },
  {
    id: "frame-command",
    name: "Moldura Comando-Geral",
    description: "Moldura premium reservada ao Alto Comando.",
    category: "MOLDURAS",
    rarity: "EXCLUSIVO",
    price: 2500,
    icon: Crown,
    preview: "border-yellow-300/70 bg-gradient-to-br from-yellow-500/20 to-primary/10",
    image: "/Store/frames/CG1_clean.png",
    locked: true,
    requirement: "Requer Comando-Geral",
    collection: "Coleção Comando",
    featured: true,
    limited: true,
  },
  {
    id: "frame-nic",
    name: "Moldura NIC — Investigação",
    description: "Visual classificado para elementos de investigação criminal.",
    category: "MOLDURAS",
    rarity: "EPICO",
    price: 900,
    icon: FileSearch,
    preview: "border-blue-400/60 bg-blue-500/10",
    image: "/Store/frames/NIC1_clean.png",
    locked: true,
    requirement: "Requer role NIC",
    collection: "Coleção NIC",
  },
  {
    id: "frame-unt",
    name: "Moldura UNT — Trânsito",
    description: "Moldura com estética de radar, estrada e fiscalização.",
    category: "MOLDURAS",
    rarity: "RARO",
    price: 650,
    icon: Radar,
    preview: "border-cyan-400/60 bg-cyan-500/10",
    image: "/Store/frames/UNT1_clean.png",
    locked: true,
    requirement: "Requer role UNT",
    collection: "Coleção UNT",
  },
  {
    id: "frame-gioe",
    name: "Moldura GIOE — Intervenção",
    description: "Moldura tática para operações especiais e alto risco.",
    category: "MOLDURAS",
    rarity: "LENDARIO",
    price: 1400,
    icon: Target,
    preview: "border-red-400/60 bg-red-500/10",
    image: "/Store/frames/GIOE1_clean.png",
    locked: true,
    requirement: "Requer role GIOE",
    collection: "Coleção GIOE",
    featured: true,
    limited: true,
  },
  {
    id: "frame-ushe",
    name: "Moldura USHE — Honras",
    description: "Moldura cerimonial dourada para Honras de Estado.",
    category: "MOLDURAS",
    rarity: "EPICO",
    price: 950,
    icon: Landmark,
    preview: "border-yellow-400/60 bg-yellow-500/10",
    image: "/Store/frames/CG1_clean.png",
    locked: true,
    requirement: "Requer role USHE",
    collection: "Coleção Honra",
  },
  {
    id: "badge-nic",
    name: "Emblema NIC",
    description: "Emblema de investigação, análise e recolha de prova.",
    category: "EMBLEMAS",
    rarity: "EPICO",
    price: 700,
    icon: FileSearch,
    preview: "border-blue-400/60 bg-blue-500/10",
    image: "/Store/badges/NIC.png",
    locked: true,
    requirement: "Requer role NIC",
    collection: "Coleção NIC",
    featured: true,
  },
  {
    id: "badge-unt",
    name: "Emblema Fiscalizador Nacional",
    description: "Emblema para elementos da Unidade Nacional de Trânsito.",
    category: "EMBLEMAS",
    rarity: "RARO",
    price: 520,
    icon: Radar,
    preview: "border-cyan-400/60 bg-cyan-500/10",
    image: "/Store/frames/UNT1_clean.png",
    locked: true,
    requirement: "Requer role UNT",
    collection: "Coleção UNT",
  },
  {
    id: "badge-gioe",
    name: "Emblema GIOE",
    description: "Símbolo de intervenção tática, precisão e alto risco.",
    category: "EMBLEMAS",
    rarity: "LENDARIO",
    price: 1350,
    icon: Target,
    preview: "border-red-400/60 bg-red-500/10",
    image: "/Store/badges/GIOE.png",
    locked: true,
    requirement: "Requer role GIOE",
    collection: "Coleção GIOE",
    featured: true,
  },
  {
    id: "badge-ushe",
    name: "Emblema Honras de Estado",
    description: "Emblema de representação, cerimónia e prestígio.",
    category: "EMBLEMAS",
    rarity: "EPICO",
    price: 800,
    icon: Landmark,
    preview: "border-yellow-400/60 bg-yellow-500/10",
    image: "/Store/badges/MEDALHADO.png",
    locked: true,
    requirement: "Requer role USHE",
    collection: "Coleção Honra",
  },
  {
    id: "badge-di",
    name: "Emblema Disciplina e Inspeção",
    description: "Símbolo de rigor, controlo interno e supervisão.",
    category: "EMBLEMAS",
    rarity: "EPICO",
    price: 750,
    icon: Scale,
    preview: "border-slate-300/60 bg-slate-400/10",
    image: "/Store/badges/CG.png",
    locked: true,
    requirement: "Requer role DI",
  },
  {
    id: "badge-veteran",
    name: "Emblema Veterano",
    description: "Símbolo de experiência, honra e presença prolongada.",
    category: "EMBLEMAS",
    rarity: "RARO",
    price: 350,
    icon: Medal,
    preview: "border-blue-400/50 bg-blue-500/10",
    image: "/Store/badges/VETERANO.png",
    featured: true,
  },
  {
    id: "badge-honor",
    name: "Emblema Medalhado",
    description: "Reservado a militares com mérito operacional reconhecido.",
    category: "EMBLEMAS",
    rarity: "EPICO",
    price: 650,
    icon: BadgeCheck,
    preview: "border-yellow-400/60 bg-yellow-500/10",
    image: "/Store/badges/MEDALHADO.png",
    featured: true,
  },
  {
    id: "badge-night",
    name: "Patrulheiro Noturno",
    description: "Emblema para quem acumula serviço noturno.",
    category: "EMBLEMAS",
    rarity: "RARO",
    price: 420,
    icon: Eye,
    preview: "border-indigo-400/60 bg-indigo-500/10",
    image: "/Store/badges/VETERANO.png",
  },
  {
    id: "bg-command",
    name: "Fundo Comando-Geral",
    description: "Background premium de comando, decisão e liderança.",
    category: "FUNDOS",
    rarity: "EPICO",
    price: 800,
    icon: Image,
    preview: "border-primary/40 bg-gradient-to-br from-primary/15 to-yellow-500/10",
    image: "/Store/backgrounds/CD.png",
    collection: "Coleção Comando",
    featured: true,
  },
  {
    id: "bg-nic",
    name: "Fundo NIC — Investigação Criminal",
    description: "Banner premium de investigação criminal para perfil do militar.",
    category: "FUNDOS",
    rarity: "EPICO",
    price: 1200,
    icon: Search,
    preview: "border-blue-400/50 bg-blue-500/10",
    image: "/Store/backgrounds/NIC.png",
    locked: true,
    requirement: "Requer role NIC",
    collection: "Coleção NIC",
  },
  {
    id: "bg-unt",
    name: "Fundo Patrulha Operacional",
    description: "Banner premium de patrulhamento, estrada e atividade operacional.",
    category: "FUNDOS",
    rarity: "EPICO",
    price: 1100,
    icon: Car,
    preview: "border-cyan-400/50 bg-cyan-500/10",
    image: "/Store/backgrounds/patrulha.png",
    collection: "Coleção Operacional",
    featured: true,
  },
  {
    id: "bg-tactical",
    name: "Fundo GSA — Suporte Aéreo",
    description: "Banner tático de suporte aéreo, vigilância e resposta rápida.",
    category: "FUNDOS",
    rarity: "LENDARIO",
    price: 1400,
    icon: Plane,
    preview: "border-red-400/50 bg-red-500/10",
    image: "/Store/backgrounds/GSA.png",
    collection: "Coleção GSA",
    featured: true,
  },
  {
    id: "bg-ceremony",
    name: "Fundo Escola da Guarda",
    description: "Banner de formação, disciplina e crescimento institucional.",
    category: "FUNDOS",
    rarity: "EPICO",
    price: 1200,
    icon: GraduationCap,
    preview: "border-yellow-400/50 bg-yellow-500/10",
    image: "/Store/backgrounds/EG.png",
    collection: "Coleção Escola",
    featured: true,
  },
  {
    id: "title-elite",
    name: "Título: Patrulheiro de Elite",
    description: "Título visível debaixo do nome no perfil.",
    category: "TITULOS",
    rarity: "RARO",
    price: 500,
    icon: Tag,
    preview: "border-blue-400/40 bg-blue-500/10",
  },
  {
    id: "title-guardian",
    name: "Título: Guardião da Central",
    description: "Título exclusivo para presença e dedicação.",
    category: "TITULOS",
    rarity: "EPICO",
    price: 900,
    icon: Crown,
    preview: "border-yellow-400/50 bg-yellow-500/10",
  },
  {
    id: "title-investigator",
    name: "Título: Investigador Nato",
    description: "Para militares ligados à investigação criminal.",
    category: "TITULOS",
    rarity: "EPICO",
    price: 850,
    icon: FileSearch,
    preview: "border-blue-400/50 bg-blue-500/10",
    image: "/Store/badges/NIC.png",
    locked: true,
    requirement: "Requer role NIC",
    collection: "Coleção NIC",
  },
  {
    id: "title-fiscalizador",
    name: "Título: Fiscalizador Nacional",
    description: "Título reservado a militares da Unidade Nacional de Trânsito.",
    category: "TITULOS",
    rarity: "RARO",
    price: 750,
    icon: Radar,
    preview: "border-cyan-400/50 bg-cyan-500/10",
    image: "/Store/frames/UNT1_clean.png",
    locked: true,
    requirement: "Requer role UNT",
    collection: "Coleção UNT",
  },
  {
    id: "title-tactical",
    name: "Título: Operacional de Elite",
    description: "Título reservado a forças de intervenção.",
    category: "TITULOS",
    rarity: "LENDARIO",
    price: 1300,
    icon: Sword,
    preview: "border-red-400/50 bg-red-500/10",
    image: "/Store/badges/GIOE.png",
    locked: true,
    requirement: "Requer role GIOE",
    collection: "Coleção GIOE",
  },
  {
    id: "title-honor",
    name: "Título: Honra e Dever",
    description: "Título cerimonial para representação e prestígio.",
    category: "TITULOS",
    rarity: "EPICO",
    price: 800,
    icon: Landmark,
    preview: "border-yellow-400/50 bg-yellow-500/10",
    image: "/Store/badges/MEDALHADO.png",
    collection: "Coleção Honra",
  },
  {
    id: "theme-green",
    name: "Tema Verde GNR",
    description: "Tema clássico institucional para o perfil.",
    category: "TEMAS",
    rarity: "COMUM",
    price: 250,
    icon: Paintbrush,
    preview: "border-primary/50 bg-primary/10",
    image: "/Store/frames/GNR1_clean.png",
  },
  {
    id: "theme-blue",
    name: "Tema Investigação Azul",
    description: "Tema visual para perfis de investigação.",
    category: "TEMAS",
    rarity: "RARO",
    price: 500,
    icon: Paintbrush,
    preview: "border-blue-400/50 bg-blue-500/10",
    image: "/Store/badges/NIC.png",
  },
  {
    id: "theme-cyan",
    name: "Tema Trânsito Ciano",
    description: "Tema visual para perfis de trânsito e fiscalização.",
    category: "TEMAS",
    rarity: "RARO",
    price: 500,
    icon: Paintbrush,
    preview: "border-cyan-400/50 bg-cyan-500/10",
    image: "/Store/frames/UNT1_clean.png",
  },
  {
    id: "theme-purple",
    name: "Tema Elite Roxo",
    description: "Tema especial para perfis de destaque.",
    category: "TEMAS",
    rarity: "EPICO",
    price: 850,
    icon: Gem,
    preview: "border-purple-400/50 bg-purple-500/10",
    image: "/Store/badges/FUNDADOR.png",
  },
  {
    id: "collection-nic",
    name: "Coleção NIC",
    description: "Conjunto completo de investigação criminal.",
    category: "COLECOES",
    rarity: "EPICO",
    price: 2600,
    icon: FileSearch,
    preview: "border-blue-400/60 bg-blue-500/10",
    image: "/Store/badges/NIC.png",
    locked: true,
    requirement: "Requer role NIC",
    collection: "Coleção NIC",
  },
  {
    id: "collection-unt",
    name: "Coleção UNT",
    description: "Conjunto completo de trânsito, fiscalização e mobilidade.",
    category: "COLECOES",
    rarity: "EPICO",
    price: 2400,
    icon: Radar,
    preview: "border-cyan-400/60 bg-cyan-500/10",
    image: "/Store/frames/UNT1_clean.png",
    locked: true,
    requirement: "Requer role UNT",
    collection: "Coleção UNT",
  },
  {
    id: "collection-gioe",
    name: "Coleção GIOE",
    description: "Pacote lendário de intervenção e operações especiais.",
    category: "COLECOES",
    rarity: "LENDARIO",
    price: 3900,
    icon: Target,
    preview: "border-red-400/60 bg-red-500/10",
    image: "/Store/badges/GIOE.png",
    locked: true,
    requirement: "Requer role GIOE",
    collection: "Coleção GIOE",
    featured: true,
  },
  {
    id: "collection-ushe",
    name: "Coleção Honra",
    description: "Pacote cerimonial de honra, representação e prestígio.",
    category: "COLECOES",
    rarity: "EPICO",
    price: 2800,
    icon: Landmark,
    preview: "border-yellow-400/60 bg-yellow-500/10",
    image: "/Store/badges/MEDALHADO.png",
    collection: "Coleção Honra",
  },
  {
    id: "exclusive-general",
    name: "Pacote Comando-Geral",
    description: "Conjunto exclusivo para oficiais superiores.",
    category: "EXCLUSIVOS",
    rarity: "EXCLUSIVO",
    price: 5000,
    icon: Crown,
    preview: "border-yellow-300/70 bg-yellow-500/10",
    image: "/Store/badges/CG.png",
    locked: true,
    requirement: "Requer Comando-Geral",
    collection: "Coleção Comando",
    limited: true,
  },
  {
    id: "exclusive-founder",
    name: "Emblema Fundador",
    description: "Item limitado para membros históricos da Central.",
    category: "EXCLUSIVOS",
    rarity: "EXCLUSIVO",
    price: 3000,
    icon: Sparkles,
    preview: "border-cyan-300/70 bg-cyan-500/10",
    image: "/Store/badges/FUNDADOR.png",
    locked: true,
    requirement: "Item limitado",
    limited: true,
  },

  {
    id: "mural-gioe-night",
    name: "Quartel Tático Noturno",
    description:
      "Fundo premium para o mural social, inspirado em operações especiais e ambiente tático noturno.",
    category: "SOCIAL",
    rarity: "LENDARIO",
    price: 6500,
    icon: Target,
    preview:
      "border-red-400/50 bg-gradient-to-br from-red-950/80 to-black",
    image: "/Store/backgrounds/GIOE.png",
    collection: "Personalização Social",
    featured: true,
    socialType: "MURAL_BACKGROUND",
    previewRoute:
      "/definicoes/personalizacao-social",
  },
  {
    id: "mural-paleto-sunset",
    name: "Paleto ao Pôr do Sol",
    description:
      "Paisagem premium e relaxada para transformar o mural num espaço pessoal e exclusivo.",
    category: "SOCIAL",
    rarity: "EPICO",
    price: 4200,
    icon: Image,
    preview:
      "border-orange-400/40 bg-gradient-to-br from-orange-950/70 to-black",
    image: "/Store/backgrounds/patrulha.png",
    collection: "Personalização Social",
    featured: true,
    socialType: "MURAL_BACKGROUND",
    previewRoute:
      "/definicoes/personalizacao-social",
  },
  {
    id: "mural-command-room",
    name: "Sala de Comando",
    description:
      "Fundo institucional reservado a perfis de liderança, direção e comando.",
    category: "SOCIAL",
    rarity: "EXCLUSIVO",
    price: 8000,
    icon: Crown,
    preview:
      "border-yellow-400/50 bg-gradient-to-br from-yellow-950/70 to-black",
    image: "/Store/backgrounds/CD.png",
    collection: "Personalização Social",
    limited: true,
    socialType: "MURAL_BACKGROUND",
    previewRoute:
      "/definicoes/personalizacao-social",
  },
  {
    id: "comment-carbon",
    name: "Comentário Carbono",
    description:
      "Estilo escuro e discreto que acompanha todos os comentários publicados pelo utilizador.",
    category: "SOCIAL",
    rarity: "RARO",
    price: 2200,
    icon: MessageSquare,
    preview:
      "border-slate-400/30 bg-gradient-to-br from-slate-950 to-slate-900",
    collection: "Comentários Premium",
    socialType: "COMMENT_STYLE",
    previewRoute:
      "/definicoes/personalizacao-social",
  },
  {
    id: "comment-gold-command",
    name: "Comentário Dourado",
    description:
      "Cartão institucional dourado, com brilho discreto e presença premium no mural.",
    category: "SOCIAL",
    rarity: "LENDARIO",
    price: 7000,
    icon: Crown,
    preview:
      "border-yellow-400/40 bg-gradient-to-br from-yellow-950/80 to-black",
    collection: "Comentários Premium",
    featured: true,
    socialType: "COMMENT_STYLE",
    previewRoute:
      "/definicoes/personalizacao-social",
  },
  {
    id: "comment-neon-green",
    name: "Comentário Neon Guarda",
    description:
      "Visual moderno em verde institucional para destacar a presença social do militar.",
    category: "SOCIAL",
    rarity: "EPICO",
    price: 3900,
    icon: Sparkles,
    preview:
      "border-primary/40 bg-gradient-to-br from-emerald-950/80 to-black",
    collection: "Comentários Premium",
    socialType: "COMMENT_STYLE",
    previewRoute:
      "/definicoes/personalizacao-social",
  },
  {
    id: "signature-honra-dever",
    name: "Assinatura Honra · Dever · Lealdade",
    description:
      "Assinatura institucional apresentada automaticamente no fim dos comentários.",
    category: "SOCIAL",
    rarity: "EPICO",
    price: 3200,
    icon: Medal,
    preview:
      "border-yellow-400/30 bg-yellow-500/10",
    collection: "Assinaturas",
    socialType: "SIGNATURE",
    previewRoute:
      "/definicoes/personalizacao-social",
  },
  {
    id: "signature-operational",
    name: "Assinatura Sempre Operacional",
    description:
      "Assinatura curta e marcante para militares com forte presença operacional.",
    category: "SOCIAL",
    rarity: "RARO",
    price: 1800,
    icon: Zap,
    preview:
      "border-primary/30 bg-primary/10",
    collection: "Assinaturas",
    socialType: "SIGNATURE",
    previewRoute:
      "/definicoes/personalizacao-social",
  },
  {
    id: "reaction-pack-gnr",
    name: "Pack de Reações GNR",
    description:
      "Adiciona Patrulha, Mérito, Águia e Comunicação às reações dos teus comentários.",
    category: "SOCIAL",
    rarity: "EPICO",
    price: 3500,
    icon: Stars,
    preview:
      "border-primary/30 bg-gradient-to-br from-primary/15 to-cyan-500/10",
    collection: "Reações Sociais",
    featured: true,
    socialType: "REACTION_PACK",
    previewRoute:
      "/definicoes/personalizacao-social",
  },
  {
    id: "social-badge-veteran",
    name: "Emblema Social Veterano",
    description:
      "Emblema apresentado junto ao nome do autor em todos os comentários.",
    category: "SOCIAL",
    rarity: "LENDARIO",
    price: 6000,
    icon: Medal,
    preview:
      "border-blue-400/35 bg-blue-500/10",
    image: "/Store/badges/VETERANO.png",
    collection: "Emblemas Sociais",
    socialType: "SOCIAL_BADGE",
    previewRoute:
      "/definicoes/personalizacao-social",
  },
  {
    id: "social-badge-leader",
    name: "Emblema Social Líder",
    description:
      "Símbolo social de liderança, responsabilidade e exemplo dentro da força.",
    category: "SOCIAL",
    rarity: "EPICO",
    price: 4200,
    icon: Shield,
    preview:
      "border-purple-400/35 bg-purple-500/10",
    image: "/Store/badges/CG.png",
    collection: "Emblemas Sociais",
    socialType: "SOCIAL_BADGE",
    previewRoute:
      "/definicoes/personalizacao-social",
  },
  {
    id: "highlight-official-document",
    name: "Destaque Documento Oficial",
    description:
      "Transforma o comentário fixado no perfil num documento institucional premium.",
    category: "SOCIAL",
    rarity: "EXCLUSIVO",
    price: 7500,
    icon: FileSearch,
    preview:
      "border-yellow-400/35 bg-gradient-to-br from-[#251c08] to-black",
    collection: "Destaques do Mural",
    limited: true,
    socialType: "HIGHLIGHT_STYLE",
    previewRoute:
      "/definicoes/personalizacao-social",
  },
  {
    id: "effect-soft-glow",
    name: "Efeito Brilho Suave",
    description:
      "Efeito de entrada discreto para dar vida ao mural sem prejudicar a leitura.",
    category: "SOCIAL",
    rarity: "RARO",
    price: 2000,
    icon: Sparkles,
    preview:
      "border-cyan-400/30 bg-cyan-500/10",
    collection: "Efeitos Sociais",
    socialType: "ENTRY_EFFECT",
    previewRoute:
      "/definicoes/personalizacao-social",
  },
  {
    id: "frame-emerald-ops",
    name: "Moldura Emerald Ops",
    description: "Moldura tática esmeralda com recortes operacionais.",
    category: "MOLDURAS",
    rarity: "RARO",
    price: 420,
    icon: Shield,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/frames/frame-emerald-ops.svg",
    collection: "Ultra Store Collection",
    featured: false,
    
  },
  {
    id: "frame-command-imperial",
    name: "Moldura Comando Imperial",
    description: "Ouro, verde e insígnias do Comando-Geral.",
    category: "MOLDURAS",
    rarity: "LENDARIO",
    price: 1200,
    icon: Shield,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/frames/frame-command-imperial.svg",
    collection: "Ultra Store Collection",
    featured: true,
    
  },
  {
    id: "frame-gioe-redline",
    name: "Moldura GIOE Redline",
    description: "Carmesim de intervenção e detalhes de alto risco.",
    category: "MOLDURAS",
    rarity: "EPICO",
    price: 850,
    icon: Shield,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/frames/frame-gioe-redline.svg",
    collection: "Ultra Store Collection",
    featured: false,
    
  },
  {
    id: "frame-nic-intel",
    name: "Moldura NIC Intelligence",
    description: "Linhas azuis, dados e leitura criminal.",
    category: "MOLDURAS",
    rarity: "EPICO",
    price: 760,
    icon: Shield,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/frames/frame-nic-intel.svg",
    collection: "Ultra Store Collection",
    featured: false,
    
  },
  {
    id: "frame-gsa-flight",
    name: "Moldura GSA Flight",
    description: "Traços aeronáuticos e iluminação de cockpit.",
    category: "MOLDURAS",
    rarity: "EPICO",
    price: 740,
    icon: Shield,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/frames/frame-gsa-flight.svg",
    collection: "Ultra Store Collection",
    featured: false,
    
  },
  {
    id: "frame-unt-highway",
    name: "Moldura UNT Highway",
    description: "Ciano rodoviário e marcações de trânsito.",
    category: "MOLDURAS",
    rarity: "RARO",
    price: 620,
    icon: Shield,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/frames/frame-unt-highway.svg",
    collection: "Ultra Store Collection",
    featured: false,
    
  },
  {
    id: "frame-ushe-honor",
    name: "Moldura USHE Honra",
    description: "Ouro cerimonial e acabamento de gala.",
    category: "MOLDURAS",
    rarity: "EPICO",
    price: 900,
    icon: Shield,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/frames/frame-ushe-honor.svg",
    collection: "Ultra Store Collection",
    featured: false,
    
  },
  {
    id: "frame-school-academy",
    name: "Moldura Academia",
    description: "Moldura da Escola da Guarda para formadores e formandos.",
    category: "MOLDURAS",
    rarity: "RARO",
    price: 560,
    icon: Shield,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/frames/frame-school-academy.svg",
    collection: "Ultra Store Collection",
    featured: false,
    
  },
  {
    id: "frame-carbon-elite",
    name: "Moldura Carbon Elite",
    description: "Carbono e aço para perfis discretos e premium.",
    category: "MOLDURAS",
    rarity: "EPICO",
    price: 820,
    icon: Shield,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/frames/frame-carbon-elite.svg",
    collection: "Ultra Store Collection",
    featured: false,
    
  },
  {
    id: "frame-arctic-command",
    name: "Moldura Arctic Command",
    description: "Branco polar, azul glacial e acabamento moderno.",
    category: "MOLDURAS",
    rarity: "EPICO",
    price: 880,
    icon: Shield,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/frames/frame-arctic-command.svg",
    collection: "Ultra Store Collection",
    featured: false,
    
  },
  {
    id: "frame-neon-lisbon",
    name: "Moldura Neon Lisbon",
    description: "Magenta e azul elétrico com efeito urbano.",
    category: "MOLDURAS",
    rarity: "LENDARIO",
    price: 980,
    icon: Shield,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/frames/frame-neon-lisbon.svg",
    collection: "Ultra Store Collection",
    featured: true,
    
  },
  {
    id: "frame-legacy-1911",
    name: "Moldura Legacy 1911",
    description: "Estética histórica, latão e verde antigo.",
    category: "MOLDURAS",
    rarity: "EPICO",
    price: 850,
    icon: Shield,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/frames/frame-legacy-1911.svg",
    collection: "Ultra Store Collection",
    featured: false,
    
  },
  {
    id: "frame-cyber-sentinel",
    name: "Moldura Cyber Sentinel",
    description: "Circuitos verdes e linhas de segurança digital.",
    category: "MOLDURAS",
    rarity: "LENDARIO",
    price: 1050,
    icon: Shield,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/frames/frame-cyber-sentinel.svg",
    collection: "Ultra Store Collection",
    featured: true,
    
  },
  {
    id: "frame-ocean-patrol",
    name: "Moldura Ocean Patrol",
    description: "Azul atlântico e turquesa costeiro.",
    category: "MOLDURAS",
    rarity: "EPICO",
    price: 690,
    icon: Shield,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/frames/frame-ocean-patrol.svg",
    collection: "Ultra Store Collection",
    featured: false,
    
  },
  {
    id: "frame-blackout",
    name: "Moldura Blackout",
    description: "Preto total e vermelho de operações secretas.",
    category: "MOLDURAS",
    rarity: "LENDARIO",
    price: 1100,
    icon: Shield,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/frames/frame-blackout.svg",
    collection: "Ultra Store Collection",
    featured: true,
    
  },
  {
    id: "frame-medal-vault",
    name: "Moldura Cofre de Mérito",
    description: "Moldura exclusiva para militares altamente condecorados.",
    category: "MOLDURAS",
    rarity: "EXCLUSIVO",
    price: 1500,
    icon: Shield,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/frames/frame-medal-vault.svg",
    collection: "Ultra Store Collection",
    featured: true,
    
  },
  {
    id: "badge-founder-elite",
    name: "Fundador Elite",
    description: "Emblema de fundador com acabamento premium.",
    category: "EMBLEMAS",
    rarity: "EPICO",
    price: 500,
    icon: Medal,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/badges/badge-founder-elite.svg",
    collection: "Ultra Store Collection",
    featured: false,
    
  },
  {
    id: "badge-veteran-gold",
    name: "Veterano Dourado",
    description: "Distinção para percursos longos e exemplares.",
    category: "EMBLEMAS",
    rarity: "RARO",
    price: 420,
    icon: Medal,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/badges/badge-veteran-gold.svg",
    collection: "Ultra Store Collection",
    featured: false,
    
  },
  {
    id: "badge-command-star",
    name: "Estrela do Comando",
    description: "Emblema reservado ao Comando-Geral.",
    category: "EMBLEMAS",
    rarity: "EXCLUSIVO",
    price: 1100,
    icon: Medal,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/badges/badge-command-star.svg",
    collection: "Ultra Store Collection",
    featured: true,
    
  },
  {
    id: "badge-nic-detective",
    name: "Olho NIC",
    description: "Distinção de investigação e inteligência criminal.",
    category: "EMBLEMAS",
    rarity: "EPICO",
    price: 480,
    icon: Medal,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/badges/badge-nic-detective.svg",
    collection: "Ultra Store Collection",
    featured: false,
    
  },
  {
    id: "badge-gioe-breach",
    name: "Breacher GIOE",
    description: "Distinção operacional para intervenção de alto risco.",
    category: "EMBLEMAS",
    rarity: "EPICO",
    price: 620,
    icon: Medal,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/badges/badge-gioe-breach.svg",
    collection: "Ultra Store Collection",
    featured: false,
    
  },
  {
    id: "badge-gsa-wings",
    name: "Asas GSA",
    description: "Emblema de operações e suporte aéreo.",
    category: "EMBLEMAS",
    rarity: "EPICO",
    price: 540,
    icon: Medal,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/badges/badge-gsa-wings.svg",
    collection: "Ultra Store Collection",
    featured: false,
    
  },
  {
    id: "badge-unt-road",
    name: "Patrulheiro UNT",
    description: "Distinção de fiscalização e patrulhamento rodoviário.",
    category: "EMBLEMAS",
    rarity: "RARO",
    price: 390,
    icon: Medal,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/badges/badge-unt-road.svg",
    collection: "Ultra Store Collection",
    featured: false,
    
  },
  {
    id: "badge-ushe-honor",
    name: "Honra USHE",
    description: "Distinção cerimonial e de representação.",
    category: "EMBLEMAS",
    rarity: "EPICO",
    price: 520,
    icon: Medal,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/badges/badge-ushe-honor.svg",
    collection: "Ultra Store Collection",
    featured: false,
    
  },
  {
    id: "badge-school-instructor",
    name: "Instrutor de Elite",
    description: "Distinção de excelência pedagógica.",
    category: "EMBLEMAS",
    rarity: "RARO",
    price: 460,
    icon: Medal,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/badges/badge-school-instructor.svg",
    collection: "Ultra Store Collection",
    featured: false,
    
  },
  {
    id: "badge-medal-merit",
    name: "Distinção de Mérito",
    description: "Emblema de mérito institucional.",
    category: "EMBLEMAS",
    rarity: "LENDARIO",
    price: 700,
    icon: Medal,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/badges/badge-medal-merit.svg",
    collection: "Ultra Store Collection",
    featured: true,
    
  },
  {
    id: "badge-service-exemplary",
    name: "Serviço Exemplar",
    description: "Reconhecimento por profissionalismo e disciplina.",
    category: "EMBLEMAS",
    rarity: "EPICO",
    price: 620,
    icon: Medal,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/badges/badge-service-exemplary.svg",
    collection: "Ultra Store Collection",
    featured: false,
    
  },
  {
    id: "badge-cyber-watch",
    name: "Sentinela Cyber",
    description: "Distinção de segurança e sistemas.",
    category: "EMBLEMAS",
    rarity: "EPICO",
    price: 650,
    icon: Medal,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/badges/badge-cyber-watch.svg",
    collection: "Ultra Store Collection",
    featured: false,
    
  },
  {
    id: "badge-ocean-rescue",
    name: "Resgate Costeiro",
    description: "Emblema de salvamento e apoio marítimo.",
    category: "EMBLEMAS",
    rarity: "EPICO",
    price: 530,
    icon: Medal,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/badges/badge-ocean-rescue.svg",
    collection: "Ultra Store Collection",
    featured: false,
    
  },
  {
    id: "badge-black-ops",
    name: "Black Ops",
    description: "Distinção especial de operações classificadas.",
    category: "EMBLEMAS",
    rarity: "EXCLUSIVO",
    price: 1200,
    icon: Medal,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/badges/badge-black-ops.svg",
    collection: "Ultra Store Collection",
    featured: true,
    
  },
  {
    id: "badge-collector",
    name: "Colecionador",
    description: "Emblema para quem domina a Loja da Guarda.",
    category: "EMBLEMAS",
    rarity: "RARO",
    price: 450,
    icon: Medal,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/badges/badge-collector.svg",
    collection: "Ultra Store Collection",
    featured: false,
    
  },
  {
    id: "badge-community",
    name: "Espírito de Equipa",
    description: "Reconhecimento social e de camaradagem.",
    category: "EMBLEMAS",
    rarity: "RARO",
    price: 340,
    icon: Medal,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/badges/badge-community.svg",
    collection: "Ultra Store Collection",
    featured: false,
    
  },
  {
    id: "badge-guardian",
    name: "Guardião",
    description: "Distinção de proteção e compromisso.",
    category: "EMBLEMAS",
    rarity: "EPICO",
    price: 580,
    icon: Medal,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/badges/badge-guardian.svg",
    collection: "Ultra Store Collection",
    featured: false,
    
  },
  {
    id: "badge-tactical-master",
    name: "Mestre Tático",
    description: "Emblema para domínio operacional.",
    category: "EMBLEMAS",
    rarity: "LENDARIO",
    price: 800,
    icon: Medal,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/badges/badge-tactical-master.svg",
    collection: "Ultra Store Collection",
    featured: true,
    
  },
  {
    id: "badge-academic-honor",
    name: "Honra Académica",
    description: "Distinção da Escola da Guarda.",
    category: "EMBLEMAS",
    rarity: "EPICO",
    price: 520,
    icon: Medal,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/badges/badge-academic-honor.svg",
    collection: "Ultra Store Collection",
    featured: false,
    
  },
  {
    id: "badge-legend",
    name: "Lenda da Guarda",
    description: "O emblema máximo de prestígio da Loja.",
    category: "EMBLEMAS",
    rarity: "EXCLUSIVO",
    price: 2000,
    icon: Medal,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/badges/badge-legend.svg",
    collection: "Ultra Store Collection",
    featured: true,
    
  },
  {
    id: "bg-paleto-sunset",
    name: "Paleto ao Pôr do Sol",
    description: "Costa de Paleto iluminada por um pôr do sol cinematográfico.",
    category: "FUNDOS",
    rarity: "RARO",
    price: 360,
    icon: Image,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/backgrounds/bg-paleto-sunset.svg",
    collection: "Ultra Store Collection",
    featured: false,
    
  },
  {
    id: "bg-night-operation",
    name: "Operação Noturna",
    description: "Operação tática sob luzes urbanas e chuva intensa.",
    category: "FUNDOS",
    rarity: "EPICO",
    price: 520,
    icon: Image,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/backgrounds/bg-night-operation.svg",
    collection: "Ultra Store Collection",
    featured: false,
    
  },
  {
    id: "bg-rain-barracks",
    name: "Quartel sob Chuva",
    description: "Quartel da Guarda sob chuva, reflexos e iluminação institucional.",
    category: "FUNDOS",
    rarity: "RARO",
    price: 420,
    icon: Image,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/backgrounds/bg-rain-barracks.svg",
    collection: "Ultra Store Collection",
    featured: false,
    
  },
  {
    id: "bg-command-room",
    name: "Sala de Comando",
    description: "Centro operacional de alto nível com painéis e mapas estratégicos.",
    category: "FUNDOS",
    rarity: "EPICO",
    price: 650,
    icon: Image,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/backgrounds/bg-command-room.svg",
    collection: "Ultra Store Collection",
    featured: false,
    
  },
  {
    id: "bg-urban-patrol",
    name: "Patrulha Urbana",
    description: "Cidade ativa, viaturas em patrulha e presença policial.",
    category: "FUNDOS",
    rarity: "RARO",
    price: 350,
    icon: Image,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/backgrounds/bg-urban-patrol.svg",
    collection: "Ultra Store Collection",
    featured: false,
    
  },
  {
    id: "bg-mountain-alert",
    name: "Serra em Alerta",
    description: "Operação de vigilância em terreno montanhoso.",
    category: "FUNDOS",
    rarity: "RARO",
    price: 390,
    icon: Image,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/backgrounds/bg-mountain-alert.svg",
    collection: "Ultra Store Collection",
    featured: false,
    
  },
  {
    id: "bg-san-andreas-coast",
    name: "Costa de San Andreas",
    description: "Paisagem costeira premium inspirada no serviço marítimo.",
    category: "FUNDOS",
    rarity: "EPICO",
    price: 440,
    icon: Image,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/backgrounds/bg-san-andreas-coast.svg",
    collection: "Ultra Store Collection",
    featured: false,
    
  },
  {
    id: "bg-guard-ceremony",
    name: "Cerimónia da Guarda",
    description: "Honras, formação e solenidade institucional.",
    category: "FUNDOS",
    rarity: "LENDARIO",
    price: 700,
    icon: Image,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/backgrounds/bg-guard-ceremony.svg",
    collection: "Ultra Store Collection",
    featured: true,
    
  },
  {
    id: "bg-air-hangar",
    name: "Hangar Operacional",
    description: "Hangar do GSA com aeronaves prontas para missão.",
    category: "FUNDOS",
    rarity: "EPICO",
    price: 580,
    icon: Image,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/backgrounds/bg-air-hangar.svg",
    collection: "Ultra Store Collection",
    featured: false,
    
  },
  {
    id: "bg-investigation",
    name: "Investigação em Curso",
    description: "Quadro de provas, ficheiros e ambiente de investigação criminal.",
    category: "FUNDOS",
    rarity: "EPICO",
    price: 540,
    icon: Image,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/backgrounds/bg-investigation.svg",
    collection: "Ultra Store Collection",
    featured: false,
    
  },
  {
    id: "bg-border-watch",
    name: "Vigilância de Fronteira",
    description: "Posto de observação e controlo territorial.",
    category: "FUNDOS",
    rarity: "RARO",
    price: 460,
    icon: Image,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/backgrounds/bg-border-watch.svg",
    collection: "Ultra Store Collection",
    featured: false,
    
  },
  {
    id: "bg-highway-control",
    name: "Controlo Rodoviário",
    description: "Operação UNT numa autoestrada ao anoitecer.",
    category: "FUNDOS",
    rarity: "RARO",
    price: 460,
    icon: Image,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/backgrounds/bg-highway-control.svg",
    collection: "Ultra Store Collection",
    featured: false,
    
  },
  {
    id: "bg-gioe-breach",
    name: "Entrada GIOE",
    description: "Equipa de intervenção preparada para entrada tática.",
    category: "FUNDOS",
    rarity: "LENDARIO",
    price: 720,
    icon: Image,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/backgrounds/bg-gioe-breach.svg",
    collection: "Ultra Store Collection",
    featured: true,
    
  },
  {
    id: "bg-nic-office",
    name: "Gabinete NIC",
    description: "Ambiente reservado de análise criminal e inteligência.",
    category: "FUNDOS",
    rarity: "EPICO",
    price: 620,
    icon: Image,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/backgrounds/bg-nic-office.svg",
    collection: "Ultra Store Collection",
    featured: false,
    
  },
  {
    id: "bg-school-parade",
    name: "Parada da Escola",
    description: "Formação cerimonial e disciplina na Escola da Guarda.",
    category: "FUNDOS",
    rarity: "RARO",
    price: 480,
    icon: Image,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/backgrounds/bg-school-parade.svg",
    collection: "Ultra Store Collection",
    featured: false,
    
  },
  {
    id: "bg-dawn-patrol",
    name: "Patrulha ao Amanhecer",
    description: "Primeiras luzes do dia durante uma patrulha rural.",
    category: "FUNDOS",
    rarity: "RARO",
    price: 390,
    icon: Image,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/backgrounds/bg-dawn-patrol.svg",
    collection: "Ultra Store Collection",
    featured: false,
    
  },
  {
    id: "bg-command-gold",
    name: "Comando Imperial",
    description: "Comando-Geral em preto, ouro e verde institucional.",
    category: "FUNDOS",
    rarity: "LENDARIO",
    price: 900,
    icon: Image,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/backgrounds/bg-command-gold.svg",
    collection: "Ultra Store Collection",
    featured: true,
    
  },
  {
    id: "bg-cyber-center",
    name: "Centro Cyber",
    description: "Centro de segurança digital com terminais ativos.",
    category: "FUNDOS",
    rarity: "LENDARIO",
    price: 780,
    icon: Image,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/backgrounds/bg-cyber-center.svg",
    collection: "Ultra Store Collection",
    featured: true,
    
  },
  {
    id: "bg-ocean-rescue",
    name: "Resgate Costeiro",
    description: "Operação de salvamento junto à costa.",
    category: "FUNDOS",
    rarity: "EPICO",
    price: 520,
    icon: Image,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/backgrounds/bg-ocean-rescue.svg",
    collection: "Ultra Store Collection",
    featured: false,
    
  },
  {
    id: "bg-arctic-base",
    name: "Base Arctic",
    description: "Posto avançado em ambiente polar e tecnológico.",
    category: "FUNDOS",
    rarity: "LENDARIO",
    price: 760,
    icon: Image,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/backgrounds/bg-arctic-base.svg",
    collection: "Ultra Store Collection",
    featured: true,
    
  },
  {
    id: "bg-carbon-command",
    name: "Carbon Command",
    description: "Sala de comando escura com acabamentos em carbono.",
    category: "FUNDOS",
    rarity: "EPICO",
    price: 680,
    icon: Image,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/backgrounds/bg-carbon-command.svg",
    collection: "Ultra Store Collection",
    featured: false,
    
  },
  {
    id: "bg-neon-city",
    name: "Cidade Neon",
    description: "Patrulha noturna com iluminação magenta e azul.",
    category: "FUNDOS",
    rarity: "LENDARIO",
    price: 820,
    icon: Image,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/backgrounds/bg-neon-city.svg",
    collection: "Ultra Store Collection",
    featured: true,
    
  },
  {
    id: "bg-legacy-guard",
    name: "Legado da Guarda",
    description: "Composição histórica com brasão e tons clássicos.",
    category: "FUNDOS",
    rarity: "LENDARIO",
    price: 740,
    icon: Image,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/backgrounds/bg-legacy-guard.svg",
    collection: "Ultra Store Collection",
    featured: true,
    
  },
  {
    id: "bg-storm-response",
    name: "Resposta à Tempestade",
    description: "Operação de emergência em condições meteorológicas extremas.",
    category: "FUNDOS",
    rarity: "EPICO",
    price: 590,
    icon: Image,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/backgrounds/bg-storm-response.svg",
    collection: "Ultra Store Collection",
    featured: false,
    
  },
  {
    id: "title-operational-elite",
    name: "Elite Operacional",
    description: "Título premium para perfis operacionais.",
    category: "TITULOS",
    rarity: "RARO",
    price: 280,
    icon: Tag,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/titles/title-operational-elite.svg",
    collection: "Ultra Store Collection",
    featured: false,
    
  },
  {
    id: "title-command-authority",
    name: "Autoridade do Comando",
    description: "Título reservado a lideranças superiores.",
    category: "TITULOS",
    rarity: "EXCLUSIVO",
    price: 780,
    icon: Tag,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/titles/title-command-authority.svg",
    collection: "Ultra Store Collection",
    featured: true,
    
  },
  {
    id: "title-night-guardian",
    name: "Guardião da Noite",
    description: "Título para patrulhas e operações noturnas.",
    category: "TITULOS",
    rarity: "RARO",
    price: 360,
    icon: Tag,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/titles/title-night-guardian.svg",
    collection: "Ultra Store Collection",
    featured: false,
    
  },
  {
    id: "title-criminal-intel",
    name: "Inteligência Criminal",
    description: "Título NIC para investigação e análise.",
    category: "TITULOS",
    rarity: "EPICO",
    price: 420,
    icon: Tag,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/titles/title-criminal-intel.svg",
    collection: "Ultra Store Collection",
    featured: false,
    
  },
  {
    id: "title-air-superiority",
    name: "Superioridade Aérea",
    description: "Título do GSA para operações aéreas.",
    category: "TITULOS",
    rarity: "EPICO",
    price: 430,
    icon: Tag,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/titles/title-air-superiority.svg",
    collection: "Ultra Store Collection",
    featured: false,
    
  },
  {
    id: "title-road-sentinel",
    name: "Sentinela Rodoviário",
    description: "Título UNT de fiscalização e segurança.",
    category: "TITULOS",
    rarity: "RARO",
    price: 340,
    icon: Tag,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/titles/title-road-sentinel.svg",
    collection: "Ultra Store Collection",
    featured: false,
    
  },
  {
    id: "title-honor-guard",
    name: "Guarda de Honra",
    description: "Título cerimonial da USHE.",
    category: "TITULOS",
    rarity: "EPICO",
    price: 460,
    icon: Tag,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/titles/title-honor-guard.svg",
    collection: "Ultra Store Collection",
    featured: false,
    
  },
  {
    id: "title-master-instructor",
    name: "Mestre Formador",
    description: "Título da Escola da Guarda.",
    category: "TITULOS",
    rarity: "RARO",
    price: 390,
    icon: Tag,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/titles/title-master-instructor.svg",
    collection: "Ultra Store Collection",
    featured: false,
    
  },
  {
    id: "title-black-operator",
    name: "Operador Blackout",
    description: "Título de operações secretas.",
    category: "TITULOS",
    rarity: "LENDARIO",
    price: 820,
    icon: Tag,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/titles/title-black-operator.svg",
    collection: "Ultra Store Collection",
    featured: true,
    
  },
  {
    id: "title-cyber-sentinel",
    name: "Sentinela Digital",
    description: "Título de segurança e tecnologia.",
    category: "TITULOS",
    rarity: "EPICO",
    price: 520,
    icon: Tag,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/titles/title-cyber-sentinel.svg",
    collection: "Ultra Store Collection",
    featured: false,
    
  },
  {
    id: "title-legacy",
    name: "Legado Vivo",
    description: "Título histórico e institucional.",
    category: "TITULOS",
    rarity: "EPICO",
    price: 480,
    icon: Tag,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/titles/title-legacy.svg",
    collection: "Ultra Store Collection",
    featured: false,
    
  },
  {
    id: "title-merit-legend",
    name: "Lenda de Mérito",
    description: "Título máximo para perfis condecorados.",
    category: "TITULOS",
    rarity: "EXCLUSIVO",
    price: 1200,
    icon: Tag,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/titles/title-merit-legend.svg",
    collection: "Ultra Store Collection",
    featured: true,
    
  },
  {
    id: "title-ocean-guardian",
    name: "Guardião Atlântico",
    description: "Título de patrulha costeira.",
    category: "TITULOS",
    rarity: "EPICO",
    price: 420,
    icon: Tag,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/titles/title-ocean-guardian.svg",
    collection: "Ultra Store Collection",
    featured: false,
    
  },
  {
    id: "title-neon-patrol",
    name: "Patrulha Neon",
    description: "Título urbano e exclusivo.",
    category: "TITULOS",
    rarity: "EPICO",
    price: 560,
    icon: Tag,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/titles/title-neon-patrol.svg",
    collection: "Ultra Store Collection",
    featured: false,
    
  },
  {
    id: "social-entry-tactical",
    name: "Entrada Tática",
    description: "Efeito de entrada com linhas operacionais.",
    category: "SOCIAL",
    rarity: "EPICO",
    price: 420,
    icon: Sparkles,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/social/social-entry-tactical.svg",
    collection: "Experiência Social",
    featured: false,
    socialType: "ENTRY_EFFECT",
    previewRoute: "/definicoes/personalizacao-social",
  },
  {
    id: "social-pulse-green",
    name: "Pulso Verde",
    description: "Pulso institucional aplicado ao perfil.",
    category: "SOCIAL",
    rarity: "RARO",
    price: 320,
    icon: Sparkles,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/social/social-pulse-green.svg",
    collection: "Experiência Social",
    featured: false,
    socialType: "HIGHLIGHT_STYLE",
    previewRoute: "/definicoes/personalizacao-social",
  },
  {
    id: "social-command-line",
    name: "Linha de Comando",
    description: "Destaque dourado no mural e perfil.",
    category: "SOCIAL",
    rarity: "EPICO",
    price: 480,
    icon: Sparkles,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/social/social-command-line.svg",
    collection: "Experiência Social",
    featured: false,
    socialType: "HIGHLIGHT_STYLE",
    previewRoute: "/definicoes/personalizacao-social",
  },
  {
    id: "social-radar-nic",
    name: "Radar NIC",
    description: "Efeito animado de investigação.",
    category: "SOCIAL",
    rarity: "EPICO",
    price: 520,
    icon: Sparkles,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/social/social-radar-nic.svg",
    collection: "Experiência Social",
    featured: false,
    socialType: "ENTRY_EFFECT",
    previewRoute: "/definicoes/personalizacao-social",
  },
  {
    id: "social-operational-alert",
    name: "Alerta Operacional",
    description: "Entrada visual de estado crítico.",
    category: "SOCIAL",
    rarity: "EPICO",
    price: 560,
    icon: Sparkles,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/social/social-operational-alert.svg",
    collection: "Experiência Social",
    featured: false,
    socialType: "ENTRY_EFFECT",
    previewRoute: "/definicoes/personalizacao-social",
  },
  {
    id: "social-ceremonial-glow",
    name: "Brilho Cerimonial",
    description: "Brilho de honra em comentários e perfil.",
    category: "SOCIAL",
    rarity: "EPICO",
    price: 490,
    icon: Sparkles,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/social/social-ceremonial-glow.svg",
    collection: "Experiência Social",
    featured: false,
    socialType: "COMMENT_STYLE",
    previewRoute: "/definicoes/personalizacao-social",
  },
  {
    id: "social-reaction-salute",
    name: "Reação Continência",
    description: "Pack de reação de continência.",
    category: "SOCIAL",
    rarity: "RARO",
    price: 180,
    icon: Sparkles,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/social/social-reaction-salute.svg",
    collection: "Experiência Social",
    featured: false,
    socialType: "REACTION_PACK",
    previewRoute: "/definicoes/personalizacao-social",
  },
  {
    id: "social-reaction-badge",
    name: "Reação Distintivo",
    description: "Pack de reações de mérito.",
    category: "SOCIAL",
    rarity: "RARO",
    price: 180,
    icon: Sparkles,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/social/social-reaction-badge.svg",
    collection: "Experiência Social",
    featured: false,
    socialType: "REACTION_PACK",
    previewRoute: "/definicoes/personalizacao-social",
  },
  {
    id: "social-reaction-siren",
    name: "Reação Sirene",
    description: "Pack de reações operacionais.",
    category: "SOCIAL",
    rarity: "RARO",
    price: 180,
    icon: Sparkles,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/social/social-reaction-siren.svg",
    collection: "Experiência Social",
    featured: false,
    socialType: "REACTION_PACK",
    previewRoute: "/definicoes/personalizacao-social",
  },
  {
    id: "social-reaction-investigation",
    name: "Reação Investigação",
    description: "Pack de reações NIC.",
    category: "SOCIAL",
    rarity: "RARO",
    price: 210,
    icon: Sparkles,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/social/social-reaction-investigation.svg",
    collection: "Experiência Social",
    featured: false,
    socialType: "REACTION_PACK",
    previewRoute: "/definicoes/personalizacao-social",
  },
  {
    id: "social-signature-command",
    name: "Assinatura Comando",
    description: "Assinatura premium para mensagens públicas.",
    category: "SOCIAL",
    rarity: "EPICO",
    price: 380,
    icon: Sparkles,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/social/social-signature-command.svg",
    collection: "Experiência Social",
    featured: false,
    socialType: "SIGNATURE",
    previewRoute: "/definicoes/personalizacao-social",
  },
  {
    id: "social-signature-elite",
    name: "Assinatura Elite",
    description: "Assinatura tática e discreta.",
    category: "SOCIAL",
    rarity: "EPICO",
    price: 360,
    icon: Sparkles,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/social/social-signature-elite.svg",
    collection: "Experiência Social",
    featured: false,
    socialType: "SIGNATURE",
    previewRoute: "/definicoes/personalizacao-social",
  },
  {
    id: "social-comment-neon",
    name: "Comentário Neon",
    description: "Estilo urbano para comentários.",
    category: "SOCIAL",
    rarity: "RARO",
    price: 330,
    icon: Sparkles,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/social/social-comment-neon.svg",
    collection: "Experiência Social",
    featured: false,
    socialType: "COMMENT_STYLE",
    previewRoute: "/definicoes/personalizacao-social",
  },
  {
    id: "social-comment-cyber",
    name: "Comentário Cyber",
    description: "Estilo digital com grelha de segurança.",
    category: "SOCIAL",
    rarity: "EPICO",
    price: 390,
    icon: Sparkles,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/social/social-comment-cyber.svg",
    collection: "Experiência Social",
    featured: false,
    socialType: "COMMENT_STYLE",
    previewRoute: "/definicoes/personalizacao-social",
  },
  {
    id: "social-mural-command",
    name: "Mural Comando",
    description: "Fundo social dourado e institucional.",
    category: "SOCIAL",
    rarity: "EPICO",
    price: 450,
    icon: Sparkles,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/social/social-mural-command.svg",
    collection: "Experiência Social",
    featured: false,
    socialType: "MURAL_BACKGROUND",
    previewRoute: "/definicoes/personalizacao-social",
  },
  {
    id: "social-mural-ocean",
    name: "Mural Atlântico",
    description: "Fundo social costeiro e moderno.",
    category: "SOCIAL",
    rarity: "EPICO",
    price: 420,
    icon: Sparkles,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/social/social-mural-ocean.svg",
    collection: "Experiência Social",
    featured: false,
    socialType: "MURAL_BACKGROUND",
    previewRoute: "/definicoes/personalizacao-social",
  },
  {
    id: "exclusive-command-vault",
    name: "Cofre do Comando",
    description: "Pack exclusivo com moldura, fundo, emblema e assinatura.",
    category: "EXCLUSIVOS",
    rarity: "EXCLUSIVO",
    price: 3500,
    icon: Crown,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/exclusives/exclusive-command-vault.svg",
    collection: "Ultra Store Collection",
    featured: true,
    locked: true,
    requirement: "Edição exclusiva / requisito institucional",
  },
  {
    id: "exclusive-gioe-black",
    name: "GIOE Black Edition",
    description: "Coleção de intervenção preta e carmesim.",
    category: "EXCLUSIVOS",
    rarity: "EXCLUSIVO",
    price: 2800,
    icon: Crown,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/exclusives/exclusive-gioe-black.svg",
    collection: "Ultra Store Collection",
    featured: true,
    locked: true,
    requirement: "Edição exclusiva / requisito institucional",
  },
  {
    id: "exclusive-nic-classified",
    name: "NIC Classified",
    description: "Coleção classificada de investigação criminal.",
    category: "EXCLUSIVOS",
    rarity: "EXCLUSIVO",
    price: 2600,
    icon: Crown,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/exclusives/exclusive-nic-classified.svg",
    collection: "Ultra Store Collection",
    featured: true,
    locked: true,
    requirement: "Edição exclusiva / requisito institucional",
  },
  {
    id: "exclusive-gsa-ace",
    name: "GSA Ace",
    description: "Coleção aérea para pilotos de elite.",
    category: "EXCLUSIVOS",
    rarity: "EXCLUSIVO",
    price: 2500,
    icon: Crown,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/exclusives/exclusive-gsa-ace.svg",
    collection: "Ultra Store Collection",
    featured: true,
    locked: true,
    requirement: "Edição exclusiva / requisito institucional",
  },
  {
    id: "exclusive-ushe-royal",
    name: "USHE Royal",
    description: "Coleção cerimonial máxima.",
    category: "EXCLUSIVOS",
    rarity: "EXCLUSIVO",
    price: 2900,
    icon: Crown,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/exclusives/exclusive-ushe-royal.svg",
    collection: "Ultra Store Collection",
    featured: true,
    locked: true,
    requirement: "Edição exclusiva / requisito institucional",
  },
  {
    id: "exclusive-school-master",
    name: "Mestre da Escola",
    description: "Coleção premium para direção e formadores.",
    category: "EXCLUSIVOS",
    rarity: "EXCLUSIVO",
    price: 2300,
    icon: Crown,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/exclusives/exclusive-school-master.svg",
    collection: "Ultra Store Collection",
    featured: true,
    locked: true,
    requirement: "Edição exclusiva / requisito institucional",
  },
  {
    id: "exclusive-cyber-zero",
    name: "Cyber Zero",
    description: "Coleção digital de edição limitada.",
    category: "EXCLUSIVOS",
    rarity: "EXCLUSIVO",
    price: 3200,
    icon: Crown,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/exclusives/exclusive-cyber-zero.svg",
    collection: "Ultra Store Collection",
    featured: true,
    locked: true,
    requirement: "Edição exclusiva / requisito institucional",
  },
  {
    id: "exclusive-legendary-guard",
    name: "Lenda da Guarda",
    description: "A coleção máxima da Loja Institucional.",
    category: "EXCLUSIVOS",
    rarity: "EXCLUSIVO",
    price: 5000,
    icon: Crown,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/exclusives/exclusive-legendary-guard.svg",
    collection: "Ultra Store Collection",
    featured: true,
    locked: true,
    requirement: "Edição exclusiva / requisito institucional",
  },

  {
    id: "bg150-paleto-aurora",
    name: "Paleto Aurora",
    description: "Fundo cinematográfico Paleto Aurora, criado para dar profundidade e identidade ao perfil.",
    category: "FUNDOS",
    rarity: "RARO",
    price: 260,
    icon: Image,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/backgrounds-150/bg150-paleto-aurora.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "background",
  },
  {
    id: "bg150-chuva-em-los-santos",
    name: "Chuva em Los Santos",
    description: "Fundo cinematográfico Chuva em Los Santos, criado para dar profundidade e identidade ao perfil.",
    category: "FUNDOS",
    rarity: "EPICO",
    price: 355,
    icon: Image,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/backgrounds-150/bg150-chuva-em-los-santos.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "background",
  },
  {
    id: "bg150-posto-da-serra",
    name: "Posto da Serra",
    description: "Fundo cinematográfico Posto da Serra, criado para dar profundidade e identidade ao perfil.",
    category: "FUNDOS",
    rarity: "LENDARIO",
    price: 750,
    icon: Image,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/backgrounds-150/bg150-posto-da-serra.svg",
    collection: "Catálogo 150",
    featured: true,
    equipSlot: "background",
  },
  {
    id: "bg150-operacao-no-porto",
    name: "Operação no Porto",
    description: "Fundo cinematográfico Operação no Porto, criado para dar profundidade e identidade ao perfil.",
    category: "FUNDOS",
    rarity: "RARO",
    price: 545,
    icon: Image,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/backgrounds-150/bg150-operacao-no-porto.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "background",
  },
  {
    id: "bg150-comando-ao-amanhecer",
    name: "Comando ao Amanhecer",
    description: "Fundo cinematográfico Comando ao Amanhecer, criado para dar profundidade e identidade ao perfil.",
    category: "FUNDOS",
    rarity: "EPICO",
    price: 640,
    icon: Image,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/backgrounds-150/bg150-comando-ao-amanhecer.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "background",
  },
  {
    id: "bg150-patrulha-na-autoestrada",
    name: "Patrulha na Autoestrada",
    description: "Fundo cinematográfico Patrulha na Autoestrada, criado para dar profundidade e identidade ao perfil.",
    category: "FUNDOS",
    rarity: "LENDARIO",
    price: 1035,
    icon: Image,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/backgrounds-150/bg150-patrulha-na-autoestrada.svg",
    collection: "Catálogo 150",
    featured: true,
    equipSlot: "background",
  },
  {
    id: "bg150-vigilancia-costeira",
    name: "Vigilância Costeira",
    description: "Fundo cinematográfico Vigilância Costeira, criado para dar profundidade e identidade ao perfil.",
    category: "FUNDOS",
    rarity: "RARO",
    price: 830,
    icon: Image,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/backgrounds-150/bg150-vigilancia-costeira.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "background",
  },
  {
    id: "bg150-hangar-em-alerta",
    name: "Hangar em Alerta",
    description: "Fundo cinematográfico Hangar em Alerta, criado para dar profundidade e identidade ao perfil.",
    category: "FUNDOS",
    rarity: "EPICO",
    price: 260,
    icon: Image,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/backgrounds-150/bg150-hangar-em-alerta.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "background",
  },
  {
    id: "bg150-gabinete-classificado",
    name: "Gabinete Classificado",
    description: "Fundo cinematográfico Gabinete Classificado, criado para dar profundidade e identidade ao perfil.",
    category: "FUNDOS",
    rarity: "LENDARIO",
    price: 655,
    icon: Image,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/backgrounds-150/bg150-gabinete-classificado.svg",
    collection: "Catálogo 150",
    featured: true,
    equipSlot: "background",
  },
  {
    id: "bg150-parada-de-honra",
    name: "Parada de Honra",
    description: "Fundo cinematográfico Parada de Honra, criado para dar profundidade e identidade ao perfil.",
    category: "FUNDOS",
    rarity: "RARO",
    price: 450,
    icon: Image,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/backgrounds-150/bg150-parada-de-honra.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "background",
  },
  {
    id: "bg150-cidade-sob-sirenes",
    name: "Cidade sob Sirenes",
    description: "Fundo cinematográfico Cidade sob Sirenes, criado para dar profundidade e identidade ao perfil.",
    category: "FUNDOS",
    rarity: "EPICO",
    price: 545,
    icon: Image,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/backgrounds-150/bg150-cidade-sob-sirenes.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "background",
  },
  {
    id: "bg150-base-florestal",
    name: "Base Florestal",
    description: "Fundo cinematográfico Base Florestal, criado para dar profundidade e identidade ao perfil.",
    category: "FUNDOS",
    rarity: "LENDARIO",
    price: 940,
    icon: Image,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/backgrounds-150/bg150-base-florestal.svg",
    collection: "Catálogo 150",
    featured: true,
    equipSlot: "background",
  },
  {
    id: "bg150-controlo-de-fronteira",
    name: "Controlo de Fronteira",
    description: "Fundo cinematográfico Controlo de Fronteira, criado para dar profundidade e identidade ao perfil.",
    category: "FUNDOS",
    rarity: "RARO",
    price: 735,
    icon: Image,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/backgrounds-150/bg150-controlo-de-fronteira.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "background",
  },
  {
    id: "bg150-tunel-operacional",
    name: "Túnel Operacional",
    description: "Fundo cinematográfico Túnel Operacional, criado para dar profundidade e identidade ao perfil.",
    category: "FUNDOS",
    rarity: "EPICO",
    price: 830,
    icon: Image,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/backgrounds-150/bg150-tunel-operacional.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "background",
  },
  {
    id: "bg150-barragem-em-seguranca",
    name: "Barragem em Segurança",
    description: "Fundo cinematográfico Barragem em Segurança, criado para dar profundidade e identidade ao perfil.",
    category: "FUNDOS",
    rarity: "LENDARIO",
    price: 560,
    icon: Image,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/backgrounds-150/bg150-barragem-em-seguranca.svg",
    collection: "Catálogo 150",
    featured: true,
    equipSlot: "background",
  },
  {
    id: "bg150-quartel-neon",
    name: "Quartel Neon",
    description: "Fundo cinematográfico Quartel Neon, criado para dar profundidade e identidade ao perfil.",
    category: "FUNDOS",
    rarity: "RARO",
    price: 355,
    icon: Image,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/backgrounds-150/bg150-quartel-neon.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "background",
  },
  {
    id: "bg150-centro-de-crise",
    name: "Centro de Crise",
    description: "Fundo cinematográfico Centro de Crise, criado para dar profundidade e identidade ao perfil.",
    category: "FUNDOS",
    rarity: "EPICO",
    price: 450,
    icon: Image,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/backgrounds-150/bg150-centro-de-crise.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "background",
  },
  {
    id: "bg150-perseguicao-noturna",
    name: "Perseguição Noturna",
    description: "Fundo cinematográfico Perseguição Noturna, criado para dar profundidade e identidade ao perfil.",
    category: "FUNDOS",
    rarity: "LENDARIO",
    price: 845,
    icon: Image,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/backgrounds-150/bg150-perseguicao-noturna.svg",
    collection: "Catálogo 150",
    featured: true,
    equipSlot: "background",
  },
  {
    id: "bg150-resgate-na-montanha",
    name: "Resgate na Montanha",
    description: "Fundo cinematográfico Resgate na Montanha, criado para dar profundidade e identidade ao perfil.",
    category: "FUNDOS",
    rarity: "RARO",
    price: 640,
    icon: Image,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/backgrounds-150/bg150-resgate-na-montanha.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "background",
  },
  {
    id: "bg150-operacao-blackout",
    name: "Operação Blackout",
    description: "Fundo cinematográfico Operação Blackout, criado para dar profundidade e identidade ao perfil.",
    category: "FUNDOS",
    rarity: "EPICO",
    price: 735,
    icon: Image,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/backgrounds-150/bg150-operacao-blackout.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "background",
  },
  {
    id: "bg150-costa-ao-luar",
    name: "Costa ao Luar",
    description: "Fundo cinematográfico Costa ao Luar, criado para dar profundidade e identidade ao perfil.",
    category: "FUNDOS",
    rarity: "LENDARIO",
    price: 1130,
    icon: Image,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/backgrounds-150/bg150-costa-ao-luar.svg",
    collection: "Catálogo 150",
    featured: true,
    equipSlot: "background",
  },
  {
    id: "bg150-academia-ao-por-do-sol",
    name: "Academia ao Pôr do Sol",
    description: "Fundo cinematográfico Academia ao Pôr do Sol, criado para dar profundidade e identidade ao perfil.",
    category: "FUNDOS",
    rarity: "RARO",
    price: 260,
    icon: Image,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/backgrounds-150/bg150-academia-ao-por-do-sol.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "background",
  },
  {
    id: "bg150-sala-cyber",
    name: "Sala Cyber",
    description: "Fundo cinematográfico Sala Cyber, criado para dar profundidade e identidade ao perfil.",
    category: "FUNDOS",
    rarity: "EPICO",
    price: 355,
    icon: Image,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/backgrounds-150/bg150-sala-cyber.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "background",
  },
  {
    id: "bg150-patrulha-arctic",
    name: "Patrulha Arctic",
    description: "Fundo cinematográfico Patrulha Arctic, criado para dar profundidade e identidade ao perfil.",
    category: "FUNDOS",
    rarity: "LENDARIO",
    price: 750,
    icon: Image,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/backgrounds-150/bg150-patrulha-arctic.svg",
    collection: "Catálogo 150",
    featured: true,
    equipSlot: "background",
  },
  {
    id: "bg150-comando-carbono",
    name: "Comando Carbono",
    description: "Fundo cinematográfico Comando Carbono, criado para dar profundidade e identidade ao perfil.",
    category: "FUNDOS",
    rarity: "RARO",
    price: 545,
    icon: Image,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/backgrounds-150/bg150-comando-carbono.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "background",
  },
  {
    id: "bg150-cerimonia-imperial",
    name: "Cerimónia Imperial",
    description: "Fundo cinematográfico Cerimónia Imperial, criado para dar profundidade e identidade ao perfil.",
    category: "FUNDOS",
    rarity: "EPICO",
    price: 640,
    icon: Image,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/backgrounds-150/bg150-cerimonia-imperial.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "background",
  },
  {
    id: "bg150-investigacao-forense",
    name: "Investigação Forense",
    description: "Fundo cinematográfico Investigação Forense, criado para dar profundidade e identidade ao perfil.",
    category: "FUNDOS",
    rarity: "LENDARIO",
    price: 1035,
    icon: Image,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/backgrounds-150/bg150-investigacao-forense.svg",
    collection: "Catálogo 150",
    featured: true,
    equipSlot: "background",
  },
  {
    id: "bg150-operacao-tempestade",
    name: "Operação Tempestade",
    description: "Fundo cinematográfico Operação Tempestade, criado para dar profundidade e identidade ao perfil.",
    category: "FUNDOS",
    rarity: "RARO",
    price: 830,
    icon: Image,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/backgrounds-150/bg150-operacao-tempestade.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "background",
  },
  {
    id: "bg150-comboio-de-intervencao",
    name: "Comboio de Intervenção",
    description: "Fundo cinematográfico Comboio de Intervenção, criado para dar profundidade e identidade ao perfil.",
    category: "FUNDOS",
    rarity: "EPICO",
    price: 260,
    icon: Image,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/backgrounds-150/bg150-comboio-de-intervencao.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "background",
  },
  {
    id: "bg150-guarda-do-atlantico",
    name: "Guarda do Atlântico",
    description: "Fundo cinematográfico Guarda do Atlântico, criado para dar profundidade e identidade ao perfil.",
    category: "FUNDOS",
    rarity: "LENDARIO",
    price: 655,
    icon: Image,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/backgrounds-150/bg150-guarda-do-atlantico.svg",
    collection: "Catálogo 150",
    featured: true,
    equipSlot: "background",
  },
  {
    id: "frame150-moldura-esmeralda-prime",
    name: "Moldura Esmeralda Prime",
    description: "Moldura Esmeralda Prime com acabamento premium, brilho adaptativo e recorte transparente.",
    category: "MOLDURAS",
    rarity: "RARO",
    price: 380,
    icon: Shield,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/frames-150/frame150-moldura-esmeralda-prime.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "frame",
  },
  {
    id: "frame150-moldura-ouro-de-comando",
    name: "Moldura Ouro de Comando",
    description: "Moldura Ouro de Comando com acabamento premium, brilho adaptativo e recorte transparente.",
    category: "MOLDURAS",
    rarity: "EPICO",
    price: 475,
    icon: Shield,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/frames-150/frame150-moldura-ouro-de-comando.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "frame",
  },
  {
    id: "frame150-moldura-carmesim-tatica",
    name: "Moldura Carmesim Tática",
    description: "Moldura Carmesim Tática com acabamento premium, brilho adaptativo e recorte transparente.",
    category: "MOLDURAS",
    rarity: "LENDARIO",
    price: 870,
    icon: Shield,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/frames-150/frame150-moldura-carmesim-tatica.svg",
    collection: "Catálogo 150",
    featured: true,
    equipSlot: "frame",
  },
  {
    id: "frame150-moldura-nic-cipher",
    name: "Moldura NIC Cipher",
    description: "Moldura NIC Cipher com acabamento premium, brilho adaptativo e recorte transparente.",
    category: "MOLDURAS",
    rarity: "RARO",
    price: 665,
    icon: Shield,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/frames-150/frame150-moldura-nic-cipher.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "frame",
  },
  {
    id: "frame150-moldura-gsa-horizon",
    name: "Moldura GSA Horizon",
    description: "Moldura GSA Horizon com acabamento premium, brilho adaptativo e recorte transparente.",
    category: "MOLDURAS",
    rarity: "EPICO",
    price: 760,
    icon: Shield,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/frames-150/frame150-moldura-gsa-horizon.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "frame",
  },
  {
    id: "frame150-moldura-unt-signal",
    name: "Moldura UNT Signal",
    description: "Moldura UNT Signal com acabamento premium, brilho adaptativo e recorte transparente.",
    category: "MOLDURAS",
    rarity: "LENDARIO",
    price: 1155,
    icon: Shield,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/frames-150/frame150-moldura-unt-signal.svg",
    collection: "Catálogo 150",
    featured: true,
    equipSlot: "frame",
  },
  {
    id: "frame150-moldura-ushe-imperial",
    name: "Moldura USHE Imperial",
    description: "Moldura USHE Imperial com acabamento premium, brilho adaptativo e recorte transparente.",
    category: "MOLDURAS",
    rarity: "RARO",
    price: 950,
    icon: Shield,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/frames-150/frame150-moldura-ushe-imperial.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "frame",
  },
  {
    id: "frame150-moldura-academia-magna",
    name: "Moldura Academia Magna",
    description: "Moldura Academia Magna com acabamento premium, brilho adaptativo e recorte transparente.",
    category: "MOLDURAS",
    rarity: "EPICO",
    price: 380,
    icon: Shield,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/frames-150/frame150-moldura-academia-magna.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "frame",
  },
  {
    id: "frame150-moldura-carbon-phantom",
    name: "Moldura Carbon Phantom",
    description: "Moldura Carbon Phantom com acabamento premium, brilho adaptativo e recorte transparente.",
    category: "MOLDURAS",
    rarity: "LENDARIO",
    price: 775,
    icon: Shield,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/frames-150/frame150-moldura-carbon-phantom.svg",
    collection: "Catálogo 150",
    featured: true,
    equipSlot: "frame",
  },
  {
    id: "frame150-moldura-arctic-halo",
    name: "Moldura Arctic Halo",
    description: "Moldura Arctic Halo com acabamento premium, brilho adaptativo e recorte transparente.",
    category: "MOLDURAS",
    rarity: "RARO",
    price: 570,
    icon: Shield,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/frames-150/frame150-moldura-arctic-halo.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "frame",
  },
  {
    id: "frame150-moldura-cyber-grid",
    name: "Moldura Cyber Grid",
    description: "Moldura Cyber Grid com acabamento premium, brilho adaptativo e recorte transparente.",
    category: "MOLDURAS",
    rarity: "EPICO",
    price: 665,
    icon: Shield,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/frames-150/frame150-moldura-cyber-grid.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "frame",
  },
  {
    id: "frame150-moldura-ocean-crest",
    name: "Moldura Ocean Crest",
    description: "Moldura Ocean Crest com acabamento premium, brilho adaptativo e recorte transparente.",
    category: "MOLDURAS",
    rarity: "LENDARIO",
    price: 1060,
    icon: Shield,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/frames-150/frame150-moldura-ocean-crest.svg",
    collection: "Catálogo 150",
    featured: true,
    equipSlot: "frame",
  },
  {
    id: "frame150-moldura-sandstorm",
    name: "Moldura Sandstorm",
    description: "Moldura Sandstorm com acabamento premium, brilho adaptativo e recorte transparente.",
    category: "MOLDURAS",
    rarity: "RARO",
    price: 855,
    icon: Shield,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/frames-150/frame150-moldura-sandstorm.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "frame",
  },
  {
    id: "frame150-moldura-blackout-x",
    name: "Moldura Blackout X",
    description: "Moldura Blackout X com acabamento premium, brilho adaptativo e recorte transparente.",
    category: "MOLDURAS",
    rarity: "EPICO",
    price: 950,
    icon: Shield,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/frames-150/frame150-moldura-blackout-x.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "frame",
  },
  {
    id: "frame150-moldura-aurora-pulse",
    name: "Moldura Aurora Pulse",
    description: "Moldura Aurora Pulse com acabamento premium, brilho adaptativo e recorte transparente.",
    category: "MOLDURAS",
    rarity: "LENDARIO",
    price: 680,
    icon: Shield,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/frames-150/frame150-moldura-aurora-pulse.svg",
    collection: "Catálogo 150",
    featured: true,
    equipSlot: "frame",
  },
  {
    id: "frame150-moldura-legacy-brass",
    name: "Moldura Legacy Brass",
    description: "Moldura Legacy Brass com acabamento premium, brilho adaptativo e recorte transparente.",
    category: "MOLDURAS",
    rarity: "RARO",
    price: 475,
    icon: Shield,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/frames-150/frame150-moldura-legacy-brass.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "frame",
  },
  {
    id: "frame150-moldura-neon-city",
    name: "Moldura Neon City",
    description: "Moldura Neon City com acabamento premium, brilho adaptativo e recorte transparente.",
    category: "MOLDURAS",
    rarity: "EPICO",
    price: 570,
    icon: Shield,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/frames-150/frame150-moldura-neon-city.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "frame",
  },
  {
    id: "frame150-moldura-steel-core",
    name: "Moldura Steel Core",
    description: "Moldura Steel Core com acabamento premium, brilho adaptativo e recorte transparente.",
    category: "MOLDURAS",
    rarity: "LENDARIO",
    price: 965,
    icon: Shield,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/frames-150/frame150-moldura-steel-core.svg",
    collection: "Catálogo 150",
    featured: true,
    equipSlot: "frame",
  },
  {
    id: "frame150-moldura-merito-supremo",
    name: "Moldura Mérito Supremo",
    description: "Moldura Mérito Supremo com acabamento premium, brilho adaptativo e recorte transparente.",
    category: "MOLDURAS",
    rarity: "RARO",
    price: 760,
    icon: Shield,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/frames-150/frame150-moldura-merito-supremo.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "frame",
  },
  {
    id: "frame150-moldura-fundador-1911",
    name: "Moldura Fundador 1911",
    description: "Moldura Fundador 1911 com acabamento premium, brilho adaptativo e recorte transparente.",
    category: "MOLDURAS",
    rarity: "EPICO",
    price: 855,
    icon: Shield,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/frames-150/frame150-moldura-fundador-1911.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "frame",
  },
  {
    id: "frame150-moldura-sentinela",
    name: "Moldura Sentinela",
    description: "Moldura Sentinela com acabamento premium, brilho adaptativo e recorte transparente.",
    category: "MOLDURAS",
    rarity: "LENDARIO",
    price: 1250,
    icon: Shield,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/frames-150/frame150-moldura-sentinela.svg",
    collection: "Catálogo 150",
    featured: true,
    equipSlot: "frame",
  },
  {
    id: "frame150-moldura-guardiao-atlantico",
    name: "Moldura Guardião Atlântico",
    description: "Moldura Guardião Atlântico com acabamento premium, brilho adaptativo e recorte transparente.",
    category: "MOLDURAS",
    rarity: "RARO",
    price: 380,
    icon: Shield,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/frames-150/frame150-moldura-guardiao-atlantico.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "frame",
  },
  {
    id: "frame150-moldura-mestre-instrutor",
    name: "Moldura Mestre Instrutor",
    description: "Moldura Mestre Instrutor com acabamento premium, brilho adaptativo e recorte transparente.",
    category: "MOLDURAS",
    rarity: "EPICO",
    price: 475,
    icon: Shield,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/frames-150/frame150-moldura-mestre-instrutor.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "frame",
  },
  {
    id: "frame150-moldura-operador-elite",
    name: "Moldura Operador Elite",
    description: "Moldura Operador Elite com acabamento premium, brilho adaptativo e recorte transparente.",
    category: "MOLDURAS",
    rarity: "LENDARIO",
    price: 870,
    icon: Shield,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/frames-150/frame150-moldura-operador-elite.svg",
    collection: "Catálogo 150",
    featured: true,
    equipSlot: "frame",
  },
  {
    id: "frame150-moldura-lenda-gnr",
    name: "Moldura Lenda GNR",
    description: "Moldura Lenda GNR com acabamento premium, brilho adaptativo e recorte transparente.",
    category: "MOLDURAS",
    rarity: "RARO",
    price: 665,
    icon: Shield,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/frames-150/frame150-moldura-lenda-gnr.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "frame",
  },
  {
    id: "badge150-emblema-aguia-operacional",
    name: "Emblema Águia Operacional",
    description: "Emblema Águia Operacional, uma distinção visual criada para representar mérito e especialização.",
    category: "EMBLEMAS",
    rarity: "RARO",
    price: 300,
    icon: Medal,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/badges-150/badge150-emblema-aguia-operacional.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "badges",
  },
  {
    id: "badge150-emblema-estrela-dourada",
    name: "Emblema Estrela Dourada",
    description: "Emblema Estrela Dourada, uma distinção visual criada para representar mérito e especialização.",
    category: "EMBLEMAS",
    rarity: "EPICO",
    price: 395,
    icon: Medal,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/badges-150/badge150-emblema-estrela-dourada.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "badges",
  },
  {
    id: "badge150-emblema-escudo-carmesim",
    name: "Emblema Escudo Carmesim",
    description: "Emblema Escudo Carmesim, uma distinção visual criada para representar mérito e especialização.",
    category: "EMBLEMAS",
    rarity: "LENDARIO",
    price: 790,
    icon: Medal,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/badges-150/badge150-emblema-escudo-carmesim.svg",
    collection: "Catálogo 150",
    featured: true,
    equipSlot: "badges",
  },
  {
    id: "badge150-emblema-olho-classificado",
    name: "Emblema Olho Classificado",
    description: "Emblema Olho Classificado, uma distinção visual criada para representar mérito e especialização.",
    category: "EMBLEMAS",
    rarity: "RARO",
    price: 585,
    icon: Medal,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/badges-150/badge150-emblema-olho-classificado.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "badges",
  },
  {
    id: "badge150-emblema-asas-de-elite",
    name: "Emblema Asas de Elite",
    description: "Emblema Asas de Elite, uma distinção visual criada para representar mérito e especialização.",
    category: "EMBLEMAS",
    rarity: "EPICO",
    price: 680,
    icon: Medal,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/badges-150/badge150-emblema-asas-de-elite.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "badges",
  },
  {
    id: "badge150-emblema-rota-segura",
    name: "Emblema Rota Segura",
    description: "Emblema Rota Segura, uma distinção visual criada para representar mérito e especialização.",
    category: "EMBLEMAS",
    rarity: "LENDARIO",
    price: 1075,
    icon: Medal,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/badges-150/badge150-emblema-rota-segura.svg",
    collection: "Catálogo 150",
    featured: true,
    equipSlot: "badges",
  },
  {
    id: "badge150-emblema-honra-cerimonial",
    name: "Emblema Honra Cerimonial",
    description: "Emblema Honra Cerimonial, uma distinção visual criada para representar mérito e especialização.",
    category: "EMBLEMAS",
    rarity: "RARO",
    price: 870,
    icon: Medal,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/badges-150/badge150-emblema-honra-cerimonial.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "badges",
  },
  {
    id: "badge150-emblema-mestre-da-escola",
    name: "Emblema Mestre da Escola",
    description: "Emblema Mestre da Escola, uma distinção visual criada para representar mérito e especialização.",
    category: "EMBLEMAS",
    rarity: "EPICO",
    price: 300,
    icon: Medal,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/badges-150/badge150-emblema-mestre-da-escola.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "badges",
  },
  {
    id: "badge150-emblema-carbono",
    name: "Emblema Carbono",
    description: "Emblema Carbono, uma distinção visual criada para representar mérito e especialização.",
    category: "EMBLEMAS",
    rarity: "LENDARIO",
    price: 695,
    icon: Medal,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/badges-150/badge150-emblema-carbono.svg",
    collection: "Catálogo 150",
    featured: true,
    equipSlot: "badges",
  },
  {
    id: "badge150-emblema-floco-de-comando",
    name: "Emblema Floco de Comando",
    description: "Emblema Floco de Comando, uma distinção visual criada para representar mérito e especialização.",
    category: "EMBLEMAS",
    rarity: "RARO",
    price: 490,
    icon: Medal,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/badges-150/badge150-emblema-floco-de-comando.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "badges",
  },
  {
    id: "badge150-emblema-sentinela-cyber",
    name: "Emblema Sentinela Cyber",
    description: "Emblema Sentinela Cyber, uma distinção visual criada para representar mérito e especialização.",
    category: "EMBLEMAS",
    rarity: "EPICO",
    price: 585,
    icon: Medal,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/badges-150/badge150-emblema-sentinela-cyber.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "badges",
  },
  {
    id: "badge150-emblema-guardiao-costeiro",
    name: "Emblema Guardião Costeiro",
    description: "Emblema Guardião Costeiro, uma distinção visual criada para representar mérito e especialização.",
    category: "EMBLEMAS",
    rarity: "LENDARIO",
    price: 980,
    icon: Medal,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/badges-150/badge150-emblema-guardiao-costeiro.svg",
    collection: "Catálogo 150",
    featured: true,
    equipSlot: "badges",
  },
  {
    id: "badge150-emblema-operacao-deserto",
    name: "Emblema Operação Deserto",
    description: "Emblema Operação Deserto, uma distinção visual criada para representar mérito e especialização.",
    category: "EMBLEMAS",
    rarity: "RARO",
    price: 775,
    icon: Medal,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/badges-150/badge150-emblema-operacao-deserto.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "badges",
  },
  {
    id: "badge150-emblema-black-operator",
    name: "Emblema Black Operator",
    description: "Emblema Black Operator, uma distinção visual criada para representar mérito e especialização.",
    category: "EMBLEMAS",
    rarity: "EPICO",
    price: 870,
    icon: Medal,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/badges-150/badge150-emblema-black-operator.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "badges",
  },
  {
    id: "badge150-emblema-aurora",
    name: "Emblema Aurora",
    description: "Emblema Aurora, uma distinção visual criada para representar mérito e especialização.",
    category: "EMBLEMAS",
    rarity: "LENDARIO",
    price: 600,
    icon: Medal,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/badges-150/badge150-emblema-aurora.svg",
    collection: "Catálogo 150",
    featured: true,
    equipSlot: "badges",
  },
  {
    id: "badge150-emblema-legado-1911",
    name: "Emblema Legado 1911",
    description: "Emblema Legado 1911, uma distinção visual criada para representar mérito e especialização.",
    category: "EMBLEMAS",
    rarity: "RARO",
    price: 395,
    icon: Medal,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/badges-150/badge150-emblema-legado-1911.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "badges",
  },
  {
    id: "badge150-emblema-patrulha-neon",
    name: "Emblema Patrulha Neon",
    description: "Emblema Patrulha Neon, uma distinção visual criada para representar mérito e especialização.",
    category: "EMBLEMAS",
    rarity: "EPICO",
    price: 490,
    icon: Medal,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/badges-150/badge150-emblema-patrulha-neon.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "badges",
  },
  {
    id: "badge150-emblema-steel-watch",
    name: "Emblema Steel Watch",
    description: "Emblema Steel Watch, uma distinção visual criada para representar mérito e especialização.",
    category: "EMBLEMAS",
    rarity: "LENDARIO",
    price: 885,
    icon: Medal,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/badges-150/badge150-emblema-steel-watch.svg",
    collection: "Catálogo 150",
    featured: true,
    equipSlot: "badges",
  },
  {
    id: "badge150-emblema-merito-absoluto",
    name: "Emblema Mérito Absoluto",
    description: "Emblema Mérito Absoluto, uma distinção visual criada para representar mérito e especialização.",
    category: "EMBLEMAS",
    rarity: "RARO",
    price: 680,
    icon: Medal,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/badges-150/badge150-emblema-merito-absoluto.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "badges",
  },
  {
    id: "badge150-emblema-servico-distinto",
    name: "Emblema Serviço Distinto",
    description: "Emblema Serviço Distinto, uma distinção visual criada para representar mérito e especialização.",
    category: "EMBLEMAS",
    rarity: "EPICO",
    price: 775,
    icon: Medal,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/badges-150/badge150-emblema-servico-distinto.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "badges",
  },
  {
    id: "badge150-emblema-coragem",
    name: "Emblema Coragem",
    description: "Emblema Coragem, uma distinção visual criada para representar mérito e especialização.",
    category: "EMBLEMAS",
    rarity: "LENDARIO",
    price: 1170,
    icon: Medal,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/badges-150/badge150-emblema-coragem.svg",
    collection: "Catálogo 150",
    featured: true,
    equipSlot: "badges",
  },
  {
    id: "badge150-emblema-lideranca",
    name: "Emblema Liderança",
    description: "Emblema Liderança, uma distinção visual criada para representar mérito e especialização.",
    category: "EMBLEMAS",
    rarity: "RARO",
    price: 300,
    icon: Medal,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/badges-150/badge150-emblema-lideranca.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "badges",
  },
  {
    id: "badge150-emblema-investigador",
    name: "Emblema Investigador",
    description: "Emblema Investigador, uma distinção visual criada para representar mérito e especialização.",
    category: "EMBLEMAS",
    rarity: "EPICO",
    price: 395,
    icon: Medal,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/badges-150/badge150-emblema-investigador.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "badges",
  },
  {
    id: "badge150-emblema-piloto-tatico",
    name: "Emblema Piloto Tático",
    description: "Emblema Piloto Tático, uma distinção visual criada para representar mérito e especialização.",
    category: "EMBLEMAS",
    rarity: "LENDARIO",
    price: 790,
    icon: Medal,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/badges-150/badge150-emblema-piloto-tatico.svg",
    collection: "Catálogo 150",
    featured: true,
    equipSlot: "badges",
  },
  {
    id: "badge150-emblema-lenda-institucional",
    name: "Emblema Lenda Institucional",
    description: "Emblema Lenda Institucional, uma distinção visual criada para representar mérito e especialização.",
    category: "EMBLEMAS",
    rarity: "RARO",
    price: 585,
    icon: Medal,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/badges-150/badge150-emblema-lenda-institucional.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "badges",
  },
  {
    id: "title150-comando-em-acao",
    name: "Comando em Ação",
    description: "Título Comando em Ação para destacar o percurso e a presença institucional.",
    category: "TITULOS",
    rarity: "RARO",
    price: 240,
    icon: Tag,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/titles-150/title150-comando-em-acao.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "title",
  },
  {
    id: "title150-sentinela-da-guarda",
    name: "Sentinela da Guarda",
    description: "Título Sentinela da Guarda para destacar o percurso e a presença institucional.",
    category: "TITULOS",
    rarity: "EPICO",
    price: 335,
    icon: Tag,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/titles-150/title150-sentinela-da-guarda.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "title",
  },
  {
    id: "title150-operador-de-elite",
    name: "Operador de Elite",
    description: "Título Operador de Elite para destacar o percurso e a presença institucional.",
    category: "TITULOS",
    rarity: "LENDARIO",
    price: 730,
    icon: Tag,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/titles-150/title150-operador-de-elite.svg",
    collection: "Catálogo 150",
    featured: true,
    equipSlot: "title",
  },
  {
    id: "title150-mestre-da-investigacao",
    name: "Mestre da Investigação",
    description: "Título Mestre da Investigação para destacar o percurso e a presença institucional.",
    category: "TITULOS",
    rarity: "RARO",
    price: 525,
    icon: Tag,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/titles-150/title150-mestre-da-investigacao.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "title",
  },
  {
    id: "title150-as-dos-ceus",
    name: "Ás dos Céus",
    description: "Título Ás dos Céus para destacar o percurso e a presença institucional.",
    category: "TITULOS",
    rarity: "EPICO",
    price: 620,
    icon: Tag,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/titles-150/title150-as-dos-ceus.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "title",
  },
  {
    id: "title150-guardiao-da-estrada",
    name: "Guardião da Estrada",
    description: "Título Guardião da Estrada para destacar o percurso e a presença institucional.",
    category: "TITULOS",
    rarity: "LENDARIO",
    price: 1015,
    icon: Tag,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/titles-150/title150-guardiao-da-estrada.svg",
    collection: "Catálogo 150",
    featured: true,
    equipSlot: "title",
  },
  {
    id: "title150-honra-e-servico",
    name: "Honra e Serviço",
    description: "Título Honra e Serviço para destacar o percurso e a presença institucional.",
    category: "TITULOS",
    rarity: "RARO",
    price: 810,
    icon: Tag,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/titles-150/title150-honra-e-servico.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "title",
  },
  {
    id: "title150-mestre-da-academia",
    name: "Mestre da Academia",
    description: "Título Mestre da Academia para destacar o percurso e a presença institucional.",
    category: "TITULOS",
    rarity: "EPICO",
    price: 240,
    icon: Tag,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/titles-150/title150-mestre-da-academia.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "title",
  },
  {
    id: "title150-sombra-tatica",
    name: "Sombra Tática",
    description: "Título Sombra Tática para destacar o percurso e a presença institucional.",
    category: "TITULOS",
    rarity: "LENDARIO",
    price: 635,
    icon: Tag,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/titles-150/title150-sombra-tatica.svg",
    collection: "Catálogo 150",
    featured: true,
    equipSlot: "title",
  },
  {
    id: "title150-comando-polar",
    name: "Comando Polar",
    description: "Título Comando Polar para destacar o percurso e a presença institucional.",
    category: "TITULOS",
    rarity: "RARO",
    price: 430,
    icon: Tag,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/titles-150/title150-comando-polar.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "title",
  },
  {
    id: "title150-sentinela-digital",
    name: "Sentinela Digital",
    description: "Título Sentinela Digital para destacar o percurso e a presença institucional.",
    category: "TITULOS",
    rarity: "EPICO",
    price: 525,
    icon: Tag,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/titles-150/title150-sentinela-digital.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "title",
  },
  {
    id: "title150-guardiao-do-atlantico",
    name: "Guardião do Atlântico",
    description: "Título Guardião do Atlântico para destacar o percurso e a presença institucional.",
    category: "TITULOS",
    rarity: "LENDARIO",
    price: 920,
    icon: Tag,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/titles-150/title150-guardiao-do-atlantico.svg",
    collection: "Catálogo 150",
    featured: true,
    equipSlot: "title",
  },
  {
    id: "title150-forca-do-terreno",
    name: "Força do Terreno",
    description: "Título Força do Terreno para destacar o percurso e a presença institucional.",
    category: "TITULOS",
    rarity: "RARO",
    price: 715,
    icon: Tag,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/titles-150/title150-forca-do-terreno.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "title",
  },
  {
    id: "title150-operador-blackout",
    name: "Operador Blackout",
    description: "Título Operador Blackout para destacar o percurso e a presença institucional.",
    category: "TITULOS",
    rarity: "EPICO",
    price: 810,
    icon: Tag,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/titles-150/title150-operador-blackout.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "title",
  },
  {
    id: "title150-comando-aurora",
    name: "Comando Aurora",
    description: "Título Comando Aurora para destacar o percurso e a presença institucional.",
    category: "TITULOS",
    rarity: "LENDARIO",
    price: 540,
    icon: Tag,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/titles-150/title150-comando-aurora.svg",
    collection: "Catálogo 150",
    featured: true,
    equipSlot: "title",
  },
  {
    id: "title150-legado-vivo",
    name: "Legado Vivo",
    description: "Título Legado Vivo para destacar o percurso e a presença institucional.",
    category: "TITULOS",
    rarity: "RARO",
    price: 335,
    icon: Tag,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/titles-150/title150-legado-vivo.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "title",
  },
  {
    id: "title150-patrulha-neon",
    name: "Patrulha Neon",
    description: "Título Patrulha Neon para destacar o percurso e a presença institucional.",
    category: "TITULOS",
    rarity: "EPICO",
    price: 430,
    icon: Tag,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/titles-150/title150-patrulha-neon.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "title",
  },
  {
    id: "title150-steel-commander",
    name: "Steel Commander",
    description: "Título Steel Commander para destacar o percurso e a presença institucional.",
    category: "TITULOS",
    rarity: "LENDARIO",
    price: 825,
    icon: Tag,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/titles-150/title150-steel-commander.svg",
    collection: "Catálogo 150",
    featured: true,
    equipSlot: "title",
  },
  {
    id: "title150-merito-supremo",
    name: "Mérito Supremo",
    description: "Título Mérito Supremo para destacar o percurso e a presença institucional.",
    category: "TITULOS",
    rarity: "RARO",
    price: 620,
    icon: Tag,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/titles-150/title150-merito-supremo.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "title",
  },
  {
    id: "title150-lenda-da-gnr",
    name: "Lenda da GNR",
    description: "Título Lenda da GNR para destacar o percurso e a presença institucional.",
    category: "TITULOS",
    rarity: "EPICO",
    price: 715,
    icon: Tag,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/titles-150/title150-lenda-da-gnr.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "title",
  },
  {
    id: "social150-entrada-radar-verde",
    name: "Entrada Radar Verde",
    description: "Entrada Radar Verde, um efeito social premium para mural, comentários e perfil.",
    category: "SOCIAL",
    rarity: "RARO",
    price: 220,
    icon: Sparkles,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/social-150/social150-entrada-radar-verde.svg",
    collection: "Catálogo 150",
    featured: false,
    socialType: "ENTRY_EFFECT",
    previewRoute: "/definicoes/personalizacao-social",
  },
  {
    id: "social150-entrada-ouro-imperial",
    name: "Entrada Ouro Imperial",
    description: "Entrada Ouro Imperial, um efeito social premium para mural, comentários e perfil.",
    category: "SOCIAL",
    rarity: "EPICO",
    price: 315,
    icon: Sparkles,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/social-150/social150-entrada-ouro-imperial.svg",
    collection: "Catálogo 150",
    featured: false,
    socialType: "COMMENT_STYLE",
    previewRoute: "/definicoes/personalizacao-social",
  },
  {
    id: "social150-entrada-red-alert",
    name: "Entrada Red Alert",
    description: "Entrada Red Alert, um efeito social premium para mural, comentários e perfil.",
    category: "SOCIAL",
    rarity: "LENDARIO",
    price: 710,
    icon: Sparkles,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/social-150/social150-entrada-red-alert.svg",
    collection: "Catálogo 150",
    featured: true,
    socialType: "SIGNATURE",
    previewRoute: "/definicoes/personalizacao-social",
  },
  {
    id: "social150-entrada-cipher-blue",
    name: "Entrada Cipher Blue",
    description: "Entrada Cipher Blue, um efeito social premium para mural, comentários e perfil.",
    category: "SOCIAL",
    rarity: "RARO",
    price: 505,
    icon: Sparkles,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/social-150/social150-entrada-cipher-blue.svg",
    collection: "Catálogo 150",
    featured: false,
    socialType: "REACTION_PACK",
    previewRoute: "/definicoes/personalizacao-social",
  },
  {
    id: "social150-entrada-flight-deck",
    name: "Entrada Flight Deck",
    description: "Entrada Flight Deck, um efeito social premium para mural, comentários e perfil.",
    category: "SOCIAL",
    rarity: "EPICO",
    price: 600,
    icon: Sparkles,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/social-150/social150-entrada-flight-deck.svg",
    collection: "Catálogo 150",
    featured: false,
    socialType: "MURAL_BACKGROUND",
    previewRoute: "/definicoes/personalizacao-social",
  },
  {
    id: "social150-entrada-road-pulse",
    name: "Entrada Road Pulse",
    description: "Entrada Road Pulse, um efeito social premium para mural, comentários e perfil.",
    category: "SOCIAL",
    rarity: "LENDARIO",
    price: 995,
    icon: Sparkles,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/social-150/social150-entrada-road-pulse.svg",
    collection: "Catálogo 150",
    featured: true,
    socialType: "HIGHLIGHT_STYLE",
    previewRoute: "/definicoes/personalizacao-social",
  },
  {
    id: "social150-entrada-honra-real",
    name: "Entrada Honra Real",
    description: "Entrada Honra Real, um efeito social premium para mural, comentários e perfil.",
    category: "SOCIAL",
    rarity: "RARO",
    price: 790,
    icon: Sparkles,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/social-150/social150-entrada-honra-real.svg",
    collection: "Catálogo 150",
    featured: false,
    socialType: "ENTRY_EFFECT",
    previewRoute: "/definicoes/personalizacao-social",
  },
  {
    id: "social150-entrada-academia-viva",
    name: "Entrada Academia Viva",
    description: "Entrada Academia Viva, um efeito social premium para mural, comentários e perfil.",
    category: "SOCIAL",
    rarity: "EPICO",
    price: 220,
    icon: Sparkles,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/social-150/social150-entrada-academia-viva.svg",
    collection: "Catálogo 150",
    featured: false,
    socialType: "COMMENT_STYLE",
    previewRoute: "/definicoes/personalizacao-social",
  },
  {
    id: "social150-entrada-carbon-fade",
    name: "Entrada Carbon Fade",
    description: "Entrada Carbon Fade, um efeito social premium para mural, comentários e perfil.",
    category: "SOCIAL",
    rarity: "LENDARIO",
    price: 615,
    icon: Sparkles,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/social-150/social150-entrada-carbon-fade.svg",
    collection: "Catálogo 150",
    featured: true,
    socialType: "SIGNATURE",
    previewRoute: "/definicoes/personalizacao-social",
  },
  {
    id: "social150-entrada-arctic-scan",
    name: "Entrada Arctic Scan",
    description: "Entrada Arctic Scan, um efeito social premium para mural, comentários e perfil.",
    category: "SOCIAL",
    rarity: "RARO",
    price: 410,
    icon: Sparkles,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/social-150/social150-entrada-arctic-scan.svg",
    collection: "Catálogo 150",
    featured: false,
    socialType: "REACTION_PACK",
    previewRoute: "/definicoes/personalizacao-social",
  },
  {
    id: "social150-comentario-cyber-grid",
    name: "Comentário Cyber Grid",
    description: "Comentário Cyber Grid, um efeito social premium para mural, comentários e perfil.",
    category: "SOCIAL",
    rarity: "EPICO",
    price: 505,
    icon: Sparkles,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/social-150/social150-comentario-cyber-grid.svg",
    collection: "Catálogo 150",
    featured: false,
    socialType: "MURAL_BACKGROUND",
    previewRoute: "/definicoes/personalizacao-social",
  },
  {
    id: "social150-comentario-ocean-wave",
    name: "Comentário Ocean Wave",
    description: "Comentário Ocean Wave, um efeito social premium para mural, comentários e perfil.",
    category: "SOCIAL",
    rarity: "LENDARIO",
    price: 900,
    icon: Sparkles,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/social-150/social150-comentario-ocean-wave.svg",
    collection: "Catálogo 150",
    featured: true,
    socialType: "HIGHLIGHT_STYLE",
    previewRoute: "/definicoes/personalizacao-social",
  },
  {
    id: "social150-comentario-sandstorm",
    name: "Comentário Sandstorm",
    description: "Comentário Sandstorm, um efeito social premium para mural, comentários e perfil.",
    category: "SOCIAL",
    rarity: "RARO",
    price: 695,
    icon: Sparkles,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/social-150/social150-comentario-sandstorm.svg",
    collection: "Catálogo 150",
    featured: false,
    socialType: "ENTRY_EFFECT",
    previewRoute: "/definicoes/personalizacao-social",
  },
  {
    id: "social150-comentario-blackout",
    name: "Comentário Blackout",
    description: "Comentário Blackout, um efeito social premium para mural, comentários e perfil.",
    category: "SOCIAL",
    rarity: "EPICO",
    price: 790,
    icon: Sparkles,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/social-150/social150-comentario-blackout.svg",
    collection: "Catálogo 150",
    featured: false,
    socialType: "COMMENT_STYLE",
    previewRoute: "/definicoes/personalizacao-social",
  },
  {
    id: "social150-comentario-aurora",
    name: "Comentário Aurora",
    description: "Comentário Aurora, um efeito social premium para mural, comentários e perfil.",
    category: "SOCIAL",
    rarity: "LENDARIO",
    price: 520,
    icon: Sparkles,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/social-150/social150-comentario-aurora.svg",
    collection: "Catálogo 150",
    featured: true,
    socialType: "SIGNATURE",
    previewRoute: "/definicoes/personalizacao-social",
  },
  {
    id: "social150-assinatura-legacy",
    name: "Assinatura Legacy",
    description: "Assinatura Legacy, um efeito social premium para mural, comentários e perfil.",
    category: "SOCIAL",
    rarity: "RARO",
    price: 315,
    icon: Sparkles,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/social-150/social150-assinatura-legacy.svg",
    collection: "Catálogo 150",
    featured: false,
    socialType: "REACTION_PACK",
    previewRoute: "/definicoes/personalizacao-social",
  },
  {
    id: "social150-assinatura-neon",
    name: "Assinatura Neon",
    description: "Assinatura Neon, um efeito social premium para mural, comentários e perfil.",
    category: "SOCIAL",
    rarity: "EPICO",
    price: 410,
    icon: Sparkles,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/social-150/social150-assinatura-neon.svg",
    collection: "Catálogo 150",
    featured: false,
    socialType: "MURAL_BACKGROUND",
    previewRoute: "/definicoes/personalizacao-social",
  },
  {
    id: "social150-assinatura-steel",
    name: "Assinatura Steel",
    description: "Assinatura Steel, um efeito social premium para mural, comentários e perfil.",
    category: "SOCIAL",
    rarity: "LENDARIO",
    price: 805,
    icon: Sparkles,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/social-150/social150-assinatura-steel.svg",
    collection: "Catálogo 150",
    featured: true,
    socialType: "HIGHLIGHT_STYLE",
    previewRoute: "/definicoes/personalizacao-social",
  },
  {
    id: "social150-pack-reacoes-operacionais",
    name: "Pack Reações Operacionais",
    description: "Pack Reações Operacionais, um efeito social premium para mural, comentários e perfil.",
    category: "SOCIAL",
    rarity: "RARO",
    price: 600,
    icon: Sparkles,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/social-150/social150-pack-reacoes-operacionais.svg",
    collection: "Catálogo 150",
    featured: false,
    socialType: "ENTRY_EFFECT",
    previewRoute: "/definicoes/personalizacao-social",
  },
  {
    id: "social150-pack-reacoes-de-merito",
    name: "Pack Reações de Mérito",
    description: "Pack Reações de Mérito, um efeito social premium para mural, comentários e perfil.",
    category: "SOCIAL",
    rarity: "EPICO",
    price: 695,
    icon: Sparkles,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/social-150/social150-pack-reacoes-de-merito.svg",
    collection: "Catálogo 150",
    featured: false,
    socialType: "COMMENT_STYLE",
    previewRoute: "/definicoes/personalizacao-social",
  },
  {
    id: "collection150-colecao-guarda-operacional-ii",
    name: "Coleção Guarda Operacional II",
    description: "Coleção Guarda Operacional II reúne uma identidade visual completa e coordenada.",
    category: "COLECOES",
    rarity: "EPICO",
    price: 1300,
    icon: Package,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/collections-150/collection150-colecao-guarda-operacional-ii.svg",
    collection: "Catálogo 150",
    featured: false,
  },
  {
    id: "collection150-colecao-comando-supremo",
    name: "Coleção Comando Supremo",
    description: "Coleção Comando Supremo reúne uma identidade visual completa e coordenada.",
    category: "COLECOES",
    rarity: "LENDARIO",
    price: 1695,
    icon: Package,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/collections-150/collection150-colecao-comando-supremo.svg",
    collection: "Catálogo 150",
    featured: true,
  },
  {
    id: "collection150-colecao-gioe-blackline",
    name: "Coleção GIOE Blackline",
    description: "Coleção GIOE Blackline reúne uma identidade visual completa e coordenada.",
    category: "COLECOES",
    rarity: "EPICO",
    price: 1490,
    icon: Package,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/collections-150/collection150-colecao-gioe-blackline.svg",
    collection: "Catálogo 150",
    featured: false,
  },
  {
    id: "collection150-colecao-nic-cipher",
    name: "Coleção NIC Cipher",
    description: "Coleção NIC Cipher reúne uma identidade visual completa e coordenada.",
    category: "COLECOES",
    rarity: "LENDARIO",
    price: 1885,
    icon: Package,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/collections-150/collection150-colecao-nic-cipher.svg",
    collection: "Catálogo 150",
    featured: true,
  },
  {
    id: "collection150-colecao-gsa-horizon",
    name: "Coleção GSA Horizon",
    description: "Coleção GSA Horizon reúne uma identidade visual completa e coordenada.",
    category: "COLECOES",
    rarity: "EPICO",
    price: 1680,
    icon: Package,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/collections-150/collection150-colecao-gsa-horizon.svg",
    collection: "Catálogo 150",
    featured: false,
  },
  {
    id: "collection150-colecao-unt-signal",
    name: "Coleção UNT Signal",
    description: "Coleção UNT Signal reúne uma identidade visual completa e coordenada.",
    category: "COLECOES",
    rarity: "LENDARIO",
    price: 2075,
    icon: Package,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/collections-150/collection150-colecao-unt-signal.svg",
    collection: "Catálogo 150",
    featured: true,
  },
  {
    id: "collection150-colecao-ushe-imperial",
    name: "Coleção USHE Imperial",
    description: "Coleção USHE Imperial reúne uma identidade visual completa e coordenada.",
    category: "COLECOES",
    rarity: "EPICO",
    price: 1870,
    icon: Package,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/collections-150/collection150-colecao-ushe-imperial.svg",
    collection: "Catálogo 150",
    featured: false,
  },
  {
    id: "collection150-colecao-academia-magna",
    name: "Coleção Academia Magna",
    description: "Coleção Academia Magna reúne uma identidade visual completa e coordenada.",
    category: "COLECOES",
    rarity: "LENDARIO",
    price: 1600,
    icon: Package,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/collections-150/collection150-colecao-academia-magna.svg",
    collection: "Catálogo 150",
    featured: true,
  },
  {
    id: "collection150-colecao-cyber-sentinel-ii",
    name: "Coleção Cyber Sentinel II",
    description: "Coleção Cyber Sentinel II reúne uma identidade visual completa e coordenada.",
    category: "COLECOES",
    rarity: "EPICO",
    price: 1395,
    icon: Package,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/collections-150/collection150-colecao-cyber-sentinel-ii.svg",
    collection: "Catálogo 150",
    featured: false,
  },
  {
    id: "collection150-colecao-legado-1911-ii",
    name: "Coleção Legado 1911 II",
    description: "Coleção Legado 1911 II reúne uma identidade visual completa e coordenada.",
    category: "COLECOES",
    rarity: "LENDARIO",
    price: 1790,
    icon: Package,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/collections-150/collection150-colecao-legado-1911-ii.svg",
    collection: "Catálogo 150",
    featured: true,
  },
  {
    id: "exclusive150-cofre-comando-absoluto",
    name: "Cofre Comando Absoluto",
    description: "Cofre Comando Absoluto, edição rara reservada a perfis de elevado prestígio.",
    category: "EXCLUSIVOS",
    rarity: "EXCLUSIVO",
    price: 2200,
    icon: Crown,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/exclusives-150/exclusive150-cofre-comando-absoluto.svg",
    collection: "Catálogo 150",
    featured: true,
    locked: true,
    requirement: "Edição exclusiva ou requisito institucional",
  },
  {
    id: "exclusive150-gioe-nightfall-edition",
    name: "GIOE Nightfall Edition",
    description: "GIOE Nightfall Edition, edição rara reservada a perfis de elevado prestígio.",
    category: "EXCLUSIVOS",
    rarity: "EXCLUSIVO",
    price: 2295,
    icon: Crown,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/exclusives-150/exclusive150-gioe-nightfall-edition.svg",
    collection: "Catálogo 150",
    featured: true,
    locked: true,
    requirement: "Edição exclusiva ou requisito institucional",
  },
  {
    id: "exclusive150-nic-ultra-classified",
    name: "NIC Ultra Classified",
    description: "NIC Ultra Classified, edição rara reservada a perfis de elevado prestígio.",
    category: "EXCLUSIVOS",
    rarity: "EXCLUSIVO",
    price: 2390,
    icon: Crown,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/exclusives-150/exclusive150-nic-ultra-classified.svg",
    collection: "Catálogo 150",
    featured: true,
    locked: true,
    requirement: "Edição exclusiva ou requisito institucional",
  },
  {
    id: "exclusive150-gsa-squadron-one",
    name: "GSA Squadron One",
    description: "GSA Squadron One, edição rara reservada a perfis de elevado prestígio.",
    category: "EXCLUSIVOS",
    rarity: "EXCLUSIVO",
    price: 2485,
    icon: Crown,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/exclusives-150/exclusive150-gsa-squadron-one.svg",
    collection: "Catálogo 150",
    featured: true,
    locked: true,
    requirement: "Edição exclusiva ou requisito institucional",
  },
  {
    id: "exclusive150-ushe-crown-edition",
    name: "USHE Crown Edition",
    description: "USHE Crown Edition, edição rara reservada a perfis de elevado prestígio.",
    category: "EXCLUSIVOS",
    rarity: "EXCLUSIVO",
    price: 2580,
    icon: Crown,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/exclusives-150/exclusive150-ushe-crown-edition.svg",
    collection: "Catálogo 150",
    featured: true,
    locked: true,
    requirement: "Edição exclusiva ou requisito institucional",
  },
  {
    id: "exclusive150-academia-master-vault",
    name: "Academia Master Vault",
    description: "Academia Master Vault, edição rara reservada a perfis de elevado prestígio.",
    category: "EXCLUSIVOS",
    rarity: "EXCLUSIVO",
    price: 2675,
    icon: Crown,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/exclusives-150/exclusive150-academia-master-vault.svg",
    collection: "Catálogo 150",
    featured: true,
    locked: true,
    requirement: "Edição exclusiva ou requisito institucional",
  },
  {
    id: "exclusive150-cyber-sentinel-zero",
    name: "Cyber Sentinel Zero",
    description: "Cyber Sentinel Zero, edição rara reservada a perfis de elevado prestígio.",
    category: "EXCLUSIVOS",
    rarity: "EXCLUSIVO",
    price: 2770,
    icon: Crown,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/exclusives-150/exclusive150-cyber-sentinel-zero.svg",
    collection: "Catálogo 150",
    featured: true,
    locked: true,
    requirement: "Edição exclusiva ou requisito institucional",
  },
  {
    id: "exclusive150-ocean-guardian-prime",
    name: "Ocean Guardian Prime",
    description: "Ocean Guardian Prime, edição rara reservada a perfis de elevado prestígio.",
    category: "EXCLUSIVOS",
    rarity: "EXCLUSIVO",
    price: 2200,
    icon: Crown,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/exclusives-150/exclusive150-ocean-guardian-prime.svg",
    collection: "Catálogo 150",
    featured: true,
    locked: true,
    requirement: "Edição exclusiva ou requisito institucional",
  },
  {
    id: "exclusive150-legacy-founders-edition",
    name: "Legacy Founders Edition",
    description: "Legacy Founders Edition, edição rara reservada a perfis de elevado prestígio.",
    category: "EXCLUSIVOS",
    rarity: "EXCLUSIVO",
    price: 2295,
    icon: Crown,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/exclusives-150/exclusive150-legacy-founders-edition.svg",
    collection: "Catálogo 150",
    featured: true,
    locked: true,
    requirement: "Edição exclusiva ou requisito institucional",
  },
  {
    id: "exclusive150-lenda-suprema-da-guarda",
    name: "Lenda Suprema da Guarda",
    description: "Lenda Suprema da Guarda, edição rara reservada a perfis de elevado prestígio.",
    category: "EXCLUSIVOS",
    rarity: "EXCLUSIVO",
    price: 2390,
    icon: Crown,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/exclusives-150/exclusive150-lenda-suprema-da-guarda.svg",
    collection: "Catálogo 150",
    featured: true,
    locked: true,
    requirement: "Edição exclusiva ou requisito institucional",
  },
  {
    id: "theme150-forest-command",
    name: "Forest Command",
    description: "Tema global Forest Command, com cores, superfícies e layout próprios.",
    category: "TEMAS",
    rarity: "EPICO",
    price: 900,
    icon: Paintbrush,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/themes-150/theme150-forest-command.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "theme",
  },
  {
    id: "theme150-royal-crimson",
    name: "Royal Crimson",
    description: "Tema global Royal Crimson, com cores, superfícies e layout próprios.",
    category: "TEMAS",
    rarity: "LENDARIO",
    price: 1295,
    icon: Paintbrush,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/themes-150/theme150-royal-crimson.svg",
    collection: "Catálogo 150",
    featured: true,
    equipSlot: "theme",
  },
  {
    id: "theme150-deep-intelligence",
    name: "Deep Intelligence",
    description: "Tema global Deep Intelligence, com cores, superfícies e layout próprios.",
    category: "TEMAS",
    rarity: "EPICO",
    price: 1090,
    icon: Paintbrush,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/themes-150/theme150-deep-intelligence.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "theme",
  },
  {
    id: "theme150-sky-marshal",
    name: "Sky Marshal",
    description: "Tema global Sky Marshal, com cores, superfícies e layout próprios.",
    category: "TEMAS",
    rarity: "LENDARIO",
    price: 1485,
    icon: Paintbrush,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/themes-150/theme150-sky-marshal.svg",
    collection: "Catálogo 150",
    featured: true,
    equipSlot: "theme",
  },
  {
    id: "theme150-highway-pulse",
    name: "Highway Pulse",
    description: "Tema global Highway Pulse, com cores, superfícies e layout próprios.",
    category: "TEMAS",
    rarity: "EPICO",
    price: 1280,
    icon: Paintbrush,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/themes-150/theme150-highway-pulse.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "theme",
  },
  {
    id: "theme150-ceremonial-ivory",
    name: "Ceremonial Ivory",
    description: "Tema global Ceremonial Ivory, com cores, superfícies e layout próprios.",
    category: "TEMAS",
    rarity: "LENDARIO",
    price: 1675,
    icon: Paintbrush,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/themes-150/theme150-ceremonial-ivory.svg",
    collection: "Catálogo 150",
    featured: true,
    equipSlot: "theme",
  },
  {
    id: "theme150-academy-scholar",
    name: "Academy Scholar",
    description: "Tema global Academy Scholar, com cores, superfícies e layout próprios.",
    category: "TEMAS",
    rarity: "EPICO",
    price: 1470,
    icon: Paintbrush,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/themes-150/theme150-academy-scholar.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "theme",
  },
  {
    id: "theme150-quantum-purple",
    name: "Quantum Purple",
    description: "Tema global Quantum Purple, com cores, superfícies e layout próprios.",
    category: "TEMAS",
    rarity: "LENDARIO",
    price: 1200,
    icon: Paintbrush,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/themes-150/theme150-quantum-purple.svg",
    collection: "Catálogo 150",
    featured: true,
    equipSlot: "theme",
  },
  {
    id: "theme150-titanium-ops",
    name: "Titanium Ops",
    description: "Tema global Titanium Ops, com cores, superfícies e layout próprios.",
    category: "TEMAS",
    rarity: "EPICO",
    price: 995,
    icon: Paintbrush,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/themes-150/theme150-titanium-ops.svg",
    collection: "Catálogo 150",
    featured: false,
    equipSlot: "theme",
  },
  {
    id: "theme150-solar-guard",
    name: "Solar Guard",
    description: "Tema global Solar Guard, com cores, superfícies e layout próprios.",
    category: "TEMAS",
    rarity: "LENDARIO",
    price: 1390,
    icon: Paintbrush,
    preview: "border-primary/40 bg-primary/10",
    image: "/Store/themes-150/theme150-solar-guard.svg",
    collection: "Catálogo 150",
    featured: true,
    equipSlot: "theme",
  },

];

const MAIN_SECTIONS: { id: StoreSection; label: string; icon: any; description: string }[] = [
  { id: "DESTAQUES", label: "Destaques", icon: Flame, description: "Itens em rotação e novidades" },
  { id: "CATALOGO", label: "Catálogo", icon: LayoutGrid, description: "Molduras, fundos, emblemas e temas" },
  { id: "PACKS", label: "Packs", icon: Package, description: "Coleções completas de unidade" },
  { id: "SOCIAL", label: "Personalização Social", icon: Paintbrush, description: "Mural, comentários, emblemas e reações" },
  { id: "INVENTARIO", label: "Inventário", icon: Gift, description: "Itens comprados e favoritos" },
  { id: "MISSOES", label: "Missões", icon: Stars, description: "Objetivos para ganhar créditos" },
  { id: "HISTORICO", label: "Histórico", icon: History, description: "Transações e ações da loja" },
];

const CATEGORIES: { id: StoreCategory; label: string; icon: any }[] = [
  { id: "TODOS", label: "Todos", icon: LayoutGrid },
  { id: "MOLDURAS", label: "Molduras", icon: Shield },
  { id: "EMBLEMAS", label: "Emblemas", icon: Medal },
  { id: "FUNDOS", label: "Fundos", icon: Image },
  { id: "TITULOS", label: "Títulos", icon: Tag },
  { id: "TEMAS", label: "Temas", icon: Paintbrush },
  { id: "COLECOES", label: "Coleções", icon: Package },
  { id: "SOCIAL", label: "Mural e Social", icon: Paintbrush },
  { id: "EXCLUSIVOS", label: "Exclusivos", icon: Crown },
];

const STORE_BUNDLES: StoreBundle[] = [
  {
    id: "bundle-nic",
    name: "Pack NIC",
    description: "Investigação completa: moldura, emblema, título e tema azul.",
    unit: "NIC",
    icon: FileSearch,
    image: "/Store/frames/NIC1_clean.png",
    className: "border-blue-400/25 bg-blue-500/10 text-blue-400",
    itemIds: ["frame-nic", "badge-nic", "title-investigator", "theme-blue"],
    price: 2550,
    oldPrice: 2950,
    locked: true,
    requirement: "Requer role NIC",
  },
  {
    id: "bundle-unt",
    name: "Pack UNT",
    description: "Fiscalização completa: moldura, emblema, título e tema ciano.",
    unit: "UNT",
    icon: Radar,
    image: "/Store/frames/UNT1_clean.png",
    className: "border-cyan-400/25 bg-cyan-500/10 text-cyan-400",
    itemIds: ["frame-unt", "badge-unt", "title-fiscalizador", "theme-cyan"],
    price: 2200,
    oldPrice: 2420,
    locked: true,
    requirement: "Requer role UNT",
  },
  {
    id: "bundle-gioe",
    name: "Pack GIOE",
    description: "Intervenção lendária: moldura, emblema, título e fundo tático.",
    unit: "GIOE",
    icon: Target,
    image: "/Store/frames/GIOE1_clean.png",
    className: "border-red-400/25 bg-red-500/10 text-red-400",
    itemIds: ["frame-gioe", "badge-gioe", "title-tactical", "bg-tactical"],
    price: 5000,
    oldPrice: 5450,
    locked: true,
    requirement: "Requer role GIOE",
  },
  {
    id: "bundle-command",
    name: "Pack Comando",
    description: "Prestígio máximo: moldura Comando, fundo e título Guardião.",
    unit: "CG",
    icon: Crown,
    image: "/Store/frames/CG1_clean.png",
    className: "border-yellow-400/25 bg-yellow-500/10 text-yellow-400",
    itemIds: ["frame-command", "bg-command", "title-guardian", "badge-di"],
    price: 4600,
    oldPrice: 4950,
    locked: true,
    requirement: "Requer Comando-Geral",
  },
  {
    id: "collection-operational",
    name: "Coleção Operacional",
    description: "Coleção completa com identidade visual coordenada.",
    unit: "GNR",
    icon: Package,
    image: "/Store/backgrounds/bg-urban-patrol.svg",
    className: "border-primary/25 bg-primary/10",
    itemIds: ["frame-emerald-ops", "badge-guardian", "title-operational-elite", "bg-urban-patrol"],
    price: 1200,
    oldPrice: 1536,
  },
  {
    id: "collection-command-imperial",
    name: "Coleção Comando Imperial",
    description: "Coleção completa com identidade visual coordenada.",
    unit: "GNR",
    icon: Package,
    image: "/Store/backgrounds/bg-command-gold.svg",
    className: "border-primary/25 bg-primary/10",
    itemIds: ["frame-command-imperial", "badge-command-star", "title-command-authority", "bg-command-gold"],
    price: 3100,
    oldPrice: 3968,
  },
  {
    id: "collection-gioe-redline",
    name: "Coleção GIOE Redline",
    description: "Coleção completa com identidade visual coordenada.",
    unit: "GNR",
    icon: Package,
    image: "/Store/backgrounds/bg-gioe-breach.svg",
    className: "border-primary/25 bg-primary/10",
    itemIds: ["frame-gioe-redline", "badge-gioe-breach", "title-black-operator", "bg-gioe-breach"],
    price: 2500,
    oldPrice: 3200,
  },
  {
    id: "collection-nic-intel",
    name: "Coleção NIC Intelligence",
    description: "Coleção completa com identidade visual coordenada.",
    unit: "GNR",
    icon: Package,
    image: "/Store/backgrounds/bg-investigation.svg",
    className: "border-primary/25 bg-primary/10",
    itemIds: ["frame-nic-intel", "badge-nic-detective", "title-criminal-intel", "bg-investigation"],
    price: 2200,
    oldPrice: 2816,
  },
  {
    id: "collection-gsa-flight",
    name: "Coleção GSA Flight",
    description: "Coleção completa com identidade visual coordenada.",
    unit: "GNR",
    icon: Package,
    image: "/Store/backgrounds/bg-air-hangar.svg",
    className: "border-primary/25 bg-primary/10",
    itemIds: ["frame-gsa-flight", "badge-gsa-wings", "title-air-superiority", "bg-air-hangar"],
    price: 2200,
    oldPrice: 2816,
  },
  {
    id: "collection-unt-road",
    name: "Coleção UNT Highway",
    description: "Coleção completa com identidade visual coordenada.",
    unit: "GNR",
    icon: Package,
    image: "/Store/backgrounds/bg-highway-control.svg",
    className: "border-primary/25 bg-primary/10",
    itemIds: ["frame-unt-highway", "badge-unt-road", "title-road-sentinel", "bg-highway-control"],
    price: 1800,
    oldPrice: 2304,
  },
  {
    id: "collection-ushe-honor",
    name: "Coleção USHE Honra",
    description: "Coleção completa com identidade visual coordenada.",
    unit: "GNR",
    icon: Package,
    image: "/Store/backgrounds/bg-guard-ceremony.svg",
    className: "border-primary/25 bg-primary/10",
    itemIds: ["frame-ushe-honor", "badge-ushe-honor", "title-honor-guard", "bg-guard-ceremony"],
    price: 2400,
    oldPrice: 3072,
  },
  {
    id: "collection-school-academy",
    name: "Coleção Escola da Guarda",
    description: "Coleção completa com identidade visual coordenada.",
    unit: "GNR",
    icon: Package,
    image: "/Store/backgrounds/bg-school-parade.svg",
    className: "border-primary/25 bg-primary/10",
    itemIds: ["frame-school-academy", "badge-school-instructor", "title-master-instructor", "bg-school-parade"],
    price: 1900,
    oldPrice: 2432,
  },
  {
    id: "collection-cyber",
    name: "Coleção Cyber Sentinel",
    description: "Coleção completa com identidade visual coordenada.",
    unit: "GNR",
    icon: Package,
    image: "/Store/backgrounds/bg-cyber-center.svg",
    className: "border-primary/25 bg-primary/10",
    itemIds: ["frame-cyber-sentinel", "badge-cyber-watch", "title-cyber-sentinel", "bg-cyber-center"],
    price: 2700,
    oldPrice: 3456,
  },
  {
    id: "collection-neon",
    name: "Coleção Neon Lisbon",
    description: "Coleção completa com identidade visual coordenada.",
    unit: "GNR",
    icon: Package,
    image: "/Store/backgrounds/bg-neon-city.svg",
    className: "border-primary/25 bg-primary/10",
    itemIds: ["frame-neon-lisbon", "badge-collector", "title-neon-patrol", "bg-neon-city"],
    price: 2600,
    oldPrice: 3328,
  },

];


const ITEM_EDITORIAL: Record<
  string,
  {
    tagline: string;
    bestFor: string;
    features: string[];
    tags: string[];
    displayBadge?: string;
  }
> = {
  "frame-green": {
    tagline: "A identidade clássica da Guarda, sem excessos.",
    bestFor: "Perfis institucionais e militares que preferem um visual limpo.",
    features: [
      "Acabamento verde institucional",
      "Compatível com qualquer fundo",
      "Visual discreto e oficial",
    ],
    tags: ["GNR", "Institucional", "Clássico"],
    displayBadge: "Essencial",
  },
  "frame-gold": {
    tagline: "O mérito deixa de ser apenas histórico e passa a ser visível.",
    bestFor: "Militares medalhados, distinguidos e perfis de cerimónia.",
    features: [
      "Contorno dourado de prestígio",
      "Destaque imediato no perfil",
      "Combina com títulos e emblemas",
    ],
    tags: ["Mérito", "Dourado", "Prestígio"],
    displayBadge: "Mais desejado",
  },
  "frame-command": {
    tagline: "Autoridade, direção e presença reservadas ao Alto Comando.",
    bestFor: "Oficiais-generais e elementos do Comando-Geral.",
    features: [
      "Identidade exclusiva de comando",
      "Acabamento premium",
      "Disponibilidade condicionada ao cargo",
    ],
    tags: ["Comando", "Exclusivo", "Liderança"],
    displayBadge: "Exclusivo",
  },
  "frame-nic": {
    tagline: "Uma assinatura visual construída para investigação criminal.",
    bestFor: "Inspetores, direção e equipas do Núcleo de Investigação Criminal.",
    features: [
      "Estética classificada em azul",
      "Identificação imediata da unidade",
      "Combinação ideal com o fundo NIC",
    ],
    tags: ["NIC", "Investigação", "Classificado"],
    displayBadge: "Unidade",
  },
  "frame-unt": {
    tagline: "Fiscalização, mobilidade e estrada num único acabamento.",
    bestFor: "Militares da Unidade Nacional de Trânsito.",
    features: [
      "Identidade ciano de fiscalização",
      "Visual inspirado em radar",
      "Integração com a coleção UNT",
    ],
    tags: ["UNT", "Trânsito", "Radar"],
  },
  "frame-gioe": {
    tagline: "Presença tática para quem entra onde os outros recuam.",
    bestFor: "Operacionais do GIOE e perfis de alto risco.",
    features: [
      "Acabamento vermelho tático",
      "Visual de intervenção especial",
      "Edição de unidade limitada",
    ],
    tags: ["GIOE", "Tático", "Alto risco"],
    displayBadge: "Lendário",
  },
  "frame-ushe": {
    tagline: "Cerimónia, rigor e representação de Estado.",
    bestFor: "Elementos de Honras de Estado e perfis cerimoniais.",
    features: [
      "Detalhes dourados",
      "Perfil de representação",
      "Combina com emblemas de mérito",
    ],
    tags: ["USHE", "Honras", "Cerimónia"],
  },
  "badge-nic": {
    tagline: "Investigação, análise e prova reunidas num símbolo.",
    bestFor: "Membros da NIC que pretendem identificar a especialidade.",
    features: [
      "Emblema oficial de unidade",
      "Visível no perfil",
      "Integração com a coleção NIC",
    ],
    tags: ["NIC", "Prova", "Investigação"],
  },
  "badge-gioe": {
    tagline: "Um símbolo reservado a intervenção, precisão e sangue-frio.",
    bestFor: "Operacionais GIOE e perfis táticos.",
    features: [
      "Símbolo de intervenção",
      "Raridade lendária",
      "Forte presença visual",
    ],
    tags: ["GIOE", "Elite", "Intervenção"],
    displayBadge: "Elite",
  },
  "badge-veteran": {
    tagline: "Tempo de serviço transformado em distinção.",
    bestFor: "Militares experientes e membros históricos.",
    features: [
      "Símbolo de experiência",
      "Visual versátil",
      "Compatível com qualquer coleção",
    ],
    tags: ["Veterano", "Experiência", "Histórico"],
    displayBadge: "Popular",
  },
  "badge-honor": {
    tagline: "Para quem não precisa de explicar o mérito: basta mostrá-lo.",
    bestFor: "Militares com distinções e histórico de excelência.",
    features: [
      "Destaque dourado",
      "Identidade de mérito",
      "Ideal para perfis cerimoniais",
    ],
    tags: ["Medalhado", "Mérito", "Honra"],
  },
  "bg-command": {
    tagline: "O ambiente onde decisões deixam de ser hipótese e passam a ordem.",
    bestFor: "Perfis de direção, comando e liderança institucional.",
    features: [
      "Cenário de sala de comando",
      "Profundidade cinematográfica",
      "Destaque premium no perfil",
    ],
    tags: ["Comando", "Direção", "Premium"],
    displayBadge: "Premium",
  },
  "bg-nic": {
    tagline: "Cada detalhe conta. Cada prova deixa rasto.",
    bestFor: "Perfis NIC, investigadores e equipas de análise criminal.",
    features: [
      "Ambiente de investigação",
      "Tonalidade azul classificada",
      "Combina com moldura e emblema NIC",
    ],
    tags: ["NIC", "Caso", "Investigação"],
  },
  "bg-unt": {
    tagline: "Estrada, patrulhamento e presença operacional contínua.",
    bestFor: "Militares de patrulha e fiscalização rodoviária.",
    features: [
      "Cenário operacional",
      "Visual dinâmico",
      "Boa legibilidade do perfil",
    ],
    tags: ["Patrulha", "Estrada", "Operacional"],
    displayBadge: "Recomendado",
  },
  "bg-tactical": {
    tagline: "Vigilância aérea e resposta rápida sobre o terreno.",
    bestFor: "Perfis ligados a suporte aéreo e operações coordenadas.",
    features: [
      "Composição tática",
      "Atmosfera de missão",
      "Raridade lendária",
    ],
    tags: ["GSA", "Aéreo", "Tático"],
  },
  "bg-ceremony": {
    tagline: "Onde se formam os militares que amanhã lideram a Guarda.",
    bestFor: "Formandos, instrutores e direção da Escola da Guarda.",
    features: [
      "Identidade académica",
      "Ambiente institucional",
      "Ideal para perfis de formação",
    ],
    tags: ["Escola", "Formação", "Disciplina"],
  },
  "title-elite": {
    tagline: "Um título curto para um percurso que fala por si.",
    bestFor: "Militares com forte atividade de patrulhamento.",
    features: [
      "Visível sob o nome",
      "Aplicação imediata",
      "Combina com estilos operacionais",
    ],
    tags: ["Elite", "Patrulha", "Título"],
  },
  "title-guardian": {
    tagline: "Para quem protege a estrutura que mantém toda a Guarda ligada.",
    bestFor: "Membros ativos, gestores e responsáveis da Central.",
    features: [
      "Título de prestígio",
      "Identidade de liderança",
      "Boa combinação com o Pack Comando",
    ],
    tags: ["Central", "Guardião", "Comando"],
  },
  "title-investigator": {
    tagline: "A investigação não termina quando o suspeito foge.",
    bestFor: "Inspetores e elementos da NIC.",
    features: [
      "Título de especialidade",
      "Exclusivo da unidade",
      "Integração com a coleção NIC",
    ],
    tags: ["NIC", "Investigador", "Especialidade"],
  },
  "theme-green": {
    tagline: "O verde institucional aplicado a toda a presença digital.",
    bestFor: "Qualquer militar que procure consistência visual.",
    features: [
      "Paleta GNR",
      "Visual equilibrado",
      "Compatibilidade universal",
    ],
    tags: ["Verde", "GNR", "Tema"],
    displayBadge: "Boa entrada",
  },
  "theme-purple": {
    tagline: "Um acabamento raro para perfis que não passam despercebidos.",
    bestFor: "Perfis de destaque, fundadores e colecionadores.",
    features: [
      "Paleta roxa premium",
      "Contraste elevado",
      "Visual exclusivo",
    ],
    tags: ["Roxo", "Elite", "Destaque"],
  },
  "collection-nic": {
    tagline: "A identidade completa de investigação criminal num só conjunto.",
    bestFor: "Elementos NIC que pretendem um perfil totalmente coerente.",
    features: [
      "Moldura NIC",
      "Emblema de investigação",
      "Título e tema de unidade",
    ],
    tags: ["NIC", "Pack", "Completo"],
    displayBadge: "Coleção completa",
  },
  "collection-gioe": {
    tagline: "A coleção mais agressiva da loja, criada para intervenção.",
    bestFor: "Operacionais GIOE e colecionadores de itens lendários.",
    features: [
      "Identidade tática completa",
      "Itens lendários",
      "Visual de alto risco",
    ],
    tags: ["GIOE", "Lendário", "Intervenção"],
    displayBadge: "Topo de gama",
  },
  "exclusive-general": {
    tagline: "O nível máximo de distinção disponível na Central.",
    bestFor: "Oficiais superiores e membros do Comando-Geral.",
    features: [
      "Conjunto exclusivo",
      "Identidade de autoridade",
      "Disponibilidade restrita",
    ],
    tags: ["Comando", "Exclusivo", "General"],
    displayBadge: "Ultra exclusivo",
  },
  "mural-gioe-night": {
    tagline: "Depois do anoitecer, começa a verdadeira operação.",
    bestFor: "Murais táticos, operacionais e perfis GIOE.",
    features: [
      "Cenário noturno cinematográfico",
      "Contraste pensado para comentários",
      "Atmosfera de operação especial",
    ],
    tags: ["GIOE", "Noite", "Tático"],
    displayBadge: "Destaque social",
  },
  "mural-paleto-sunset": {
    tagline: "Paleto Bay em tons dourados, entre serviço e tranquilidade.",
    bestFor: "Perfis pessoais, paisagens e murais mais descontraídos.",
    features: [
      "Pôr do sol cinematográfico",
      "Tons quentes",
      "Excelente para fotografias e comentários",
    ],
    tags: ["Paleto", "Pôr do sol", "Paisagem"],
    displayBadge: "Mais relaxado",
  },
  "mural-command-room": {
    tagline: "Uma sala reservada a decisões, estratégia e autoridade.",
    bestFor: "Direção, Comando-Geral e perfis de liderança.",
    features: [
      "Ambiente de comando",
      "Acabamento exclusivo",
      "Visual institucional premium",
    ],
    tags: ["Comando", "Estratégia", "Exclusivo"],
    displayBadge: "Exclusivo social",
  },
  "comment-carbon": {
    tagline: "Discreto, técnico e sem ruído visual.",
    bestFor: "Comentários profissionais e perfis minimalistas.",
    features: [
      "Textura carbono escura",
      "Leitura confortável",
      "Compatível com qualquer mural",
    ],
    tags: ["Carbono", "Escuro", "Minimalista"],
  },
  "comment-gold-command": {
    tagline: "Cada comentário assume o peso de uma comunicação oficial.",
    bestFor: "Comando, direção e comentários de destaque.",
    features: [
      "Contorno dourado",
      "Brilho discreto",
      "Presença institucional",
    ],
    tags: ["Dourado", "Comando", "Premium"],
    displayBadge: "Mais prestigiado",
  },
  "comment-neon-green": {
    tagline: "O verde da Guarda com uma presença mais moderna.",
    bestFor: "Militares ativos e perfis com identidade institucional forte.",
    features: [
      "Neon verde controlado",
      "Contraste moderno",
      "Destaque sem perder legibilidade",
    ],
    tags: ["Neon", "Verde", "Moderno"],
  },
  "signature-honra-dever": {
    tagline: "Três palavras que resumem toda a instituição.",
    bestFor: "Comentários formais, perfis de comando e cerimónia.",
    features: [
      "Assinatura automática",
      "Tom institucional",
      "Aplicada em todos os comentários",
    ],
    tags: ["Honra", "Dever", "Lealdade"],
  },
  "signature-operational": {
    tagline: "Curta, direta e feita para quem está sempre no terreno.",
    bestFor: "Perfis operacionais e comentários rápidos.",
    features: [
      "Assinatura compacta",
      "Tom operacional",
      "Boa legibilidade",
    ],
    tags: ["Operacional", "Direto", "Assinatura"],
  },
  "reaction-pack-gnr": {
    tagline: "As reações da Guarda, finalmente dentro do mural.",
    bestFor: "Qualquer perfil social que procure mais interação.",
    features: [
      "Patrulha",
      "Mérito",
      "Águia e comunicação",
    ],
    tags: ["Reações", "GNR", "Mural"],
    displayBadge: "Interativo",
  },
  "social-badge-veteran": {
    tagline: "Experiência visível ao lado de cada comentário.",
    bestFor: "Veteranos e membros históricos da Guarda.",
    features: [
      "Aparece junto ao nome",
      "Visível em todos os comentários",
      "Símbolo de longevidade",
    ],
    tags: ["Veterano", "Social", "Histórico"],
  },
  "social-badge-leader": {
    tagline: "Liderança reconhecida em cada intervenção social.",
    bestFor: "Comandantes, diretores e chefias.",
    features: [
      "Emblema junto ao nome",
      "Identidade de liderança",
      "Compatível com outro emblema social",
    ],
    tags: ["Líder", "Comando", "Social"],
  },
  "highlight-official-document": {
    tagline: "O comentário fixado passa a parecer um documento oficial.",
    bestFor: "Comunicados, reconhecimentos e mensagens importantes.",
    features: [
      "Visual de documento",
      "Destaque dourado",
      "Ideal para comentário principal",
    ],
    tags: ["Documento", "Destaque", "Oficial"],
  },
  "effect-soft-glow": {
    tagline: "Movimento suficiente para chamar atenção, sem distrair.",
    bestFor: "Murais modernos e novidades de perfil.",
    features: [
      "Entrada animada discreta",
      "Efeito leve",
      "Não prejudica a leitura",
    ],
    tags: ["Brilho", "Animação", "Entrada"],
  },
};

function getEditorialContent(
  item: StoreItem,
) {
  const exact =
    ITEM_EDITORIAL[item.id];

  if (exact) {
    return exact;
  }

  const categoryDefaults: Record<
    string,
    {
      tagline: string;
      bestFor: string;
      features: string[];
      tags: string[];
    }
  > = {
    MOLDURAS: {
      tagline:
        "Um acabamento de perfil criado para reforçar a tua identidade.",
      bestFor:
        "Militares que pretendem destacar o avatar e a unidade.",
      features: [
        "Aplicação no perfil",
        "Compatível com fundos",
        "Equipamento imediato",
      ],
      tags: ["Moldura", "Perfil", "Identidade"],
    },
    EMBLEMAS: {
      tagline:
        "Uma distinção visual para representar percurso, unidade ou mérito.",
      bestFor:
        "Colecionadores e militares com identidade de unidade.",
      features: [
        "Visível no perfil",
        "Pode integrar coleções",
        "Identidade imediata",
      ],
      tags: ["Emblema", "Distinção", "Coleção"],
    },
    FUNDOS: {
      tagline:
        "Um cenário completo para transformar a apresentação do perfil.",
      bestFor:
        "Perfis que procuram maior impacto visual.",
      features: [
        "Imagem de fundo premium",
        "Boa legibilidade",
        "Combina com molduras",
      ],
      tags: ["Fundo", "Perfil", "Visual"],
    },
    TITULOS: {
      tagline:
        "Uma frase curta para dizer quem és antes de qualquer apresentação.",
      bestFor:
        "Militares que pretendem destacar função ou personalidade.",
      features: [
        "Visível sob o nome",
        "Equipamento simples",
        "Compatível com qualquer tema",
      ],
      tags: ["Título", "Perfil", "Identidade"],
    },
    TEMAS: {
      tagline:
        "Uma linguagem visual consistente aplicada a todo o perfil.",
      bestFor:
        "Utilizadores que valorizam coerência e personalização.",
      features: [
        "Paleta temática",
        "Acabamento completo",
        "Aplicação imediata",
      ],
      tags: ["Tema", "Cores", "Personalização"],
    },
    COLECOES: {
      tagline:
        "Vários elementos combinados para criar uma identidade completa.",
      bestFor:
        "Militares que querem um conjunto coerente de unidade.",
      features: [
        "Conjunto coordenado",
        "Melhor relação visual",
        "Identidade completa",
      ],
      tags: ["Coleção", "Pack", "Unidade"],
    },
    SOCIAL: {
      tagline:
        "Personalização que acompanha o mural e os teus comentários.",
      bestFor:
        "Utilizadores ativos na área social da Central.",
      features: [
        "Preview em tempo real",
        "Aplicação no mural",
        "Personalização social",
      ],
      tags: ["Social", "Mural", "Comentários"],
    },
    EXCLUSIVOS: {
      tagline:
        "Uma peça rara, criada para poucos perfis.",
      bestFor:
        "Colecionadores, chefias e membros elegíveis.",
      features: [
        "Disponibilidade restrita",
        "Elevada raridade",
        "Forte presença visual",
      ],
      tags: ["Exclusivo", "Raro", "Prestígio"],
    },
  };

  return (
    categoryDefaults[item.category] ||
    categoryDefaults.EXCLUSIVOS
  );
}

function getThemeFamily(item: StoreItem) {
  const haystack =
    `${item.id} ${item.name} ${item.collection || ""} ${item.description || ""}`
      .toLowerCase();

  if (
    haystack.includes("nic") ||
    haystack.includes("intelligence") ||
    haystack.includes("intel") ||
    haystack.includes("quantum") ||
    haystack.includes("cyber")
  ) {
    return "Investigação";
  }

  if (
    haystack.includes("gioe") ||
    haystack.includes("blackout") ||
    haystack.includes("crimson") ||
    haystack.includes("tactical") ||
    haystack.includes("ops")
  ) {
    return "Operacionais";
  }

  if (
    haystack.includes("comando") ||
    haystack.includes("dourado") ||
    haystack.includes("ceremonial") ||
    haystack.includes("ivory")
  ) {
    return "Premium";
  }

  if (
    haystack.includes("academy") ||
    haystack.includes("scholar") ||
    haystack.includes("legacy") ||
    haystack.includes("institucional")
  ) {
    return "Institucionais";
  }

  if (
    haystack.includes("unt") ||
    haystack.includes("ushe") ||
    haystack.includes("gsa") ||
    haystack.includes("patrol") ||
    haystack.includes("guard")
  ) {
    return "Unidades";
  }

  return "Experimentais";
}

const THEME_FAMILIES = [
  "Institucionais",
  "Operacionais",
  "Unidades",
  "Premium",
  "Investigação",
  "Experimentais",
];

function getThemeImpact(item: StoreItem) {
  if (item.category !== "TEMAS") {
    return [
      "Perfil",
      "Inventário",
      "Pré-visualização",
    ];
  }

  return [
    "Fundo global",
    "Sidebar",
    "Topbar",
    "Cards",
    "Inputs",
    "Player",
  ];
}

function getItemSearchText(
  item: StoreItem,
) {
  const editorial =
    getEditorialContent(item);

  return [
    item.name,
    item.description,
    item.category,
    item.collection,
    item.requirement,
    editorial.tagline,
    editorial.bestFor,
    ...editorial.tags,
    ...editorial.features,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}


function getRarityStyle(rarity: StoreRarity) {
  if (rarity === "COMUM") {
    return {
      label: "Comum",
      className: "border-slate-400/25 bg-slate-400/10 text-slate-300",
      glow: "shadow-[0_0_45px_rgba(148,163,184,0.12)]",
    };
  }

  if (rarity === "RARO") {
    return {
      label: "Raro",
      className: "border-blue-400/25 bg-blue-500/10 text-blue-400",
      glow: "shadow-[0_0_55px_rgba(96,165,250,0.18)]",
    };
  }

  if (rarity === "EPICO") {
    return {
      label: "Épico",
      className: "border-purple-400/25 bg-purple-500/10 text-purple-400",
      glow: "shadow-[0_0_65px_rgba(192,132,252,0.20)]",
    };
  }

  if (rarity === "LENDARIO") {
    return {
      label: "Lendário",
      className: "border-yellow-400/25 bg-yellow-500/10 text-yellow-400",
      glow: "shadow-[0_0_75px_rgba(250,204,21,0.24)]",
    };
  }

  if (rarity === "INSTITUCIONAL") {
    return {
      label: "Institucional",
      className: "border-primary/25 bg-primary/10 text-primary",
      glow: "shadow-[0_0_60px_hsl(var(--primary)/0.16)]",
    };
  }

  return {
    label: "Exclusivo",
    className: "border-cyan-300/30 bg-cyan-500/10 text-cyan-300",
    glow: "shadow-[0_0_85px_rgba(103,232,249,0.22)]",
  };
}

function getEquipSlot(item: StoreItem) {
  if (item.category === "MOLDURAS") return "frame";
  if (item.category === "FUNDOS") return "background";
  if (item.category === "TITULOS") return "title";
  if (item.category === "TEMAS") return "theme";
  if (item.category === "EMBLEMAS") return "badges";
  if (item.id === "exclusive-founder") return "badges";

  return null;
}

function isItemEquipped(item: StoreItem, equipped: any) {
  const slot = getEquipSlot(item);

  if (!slot) return false;

  if (slot === "badges") {
    return Array.isArray(equipped?.badges) && equipped.badges.includes(item.id);
  }

  return equipped?.[slot] === item.id;
}

function getItemById(id?: string | null) {
  if (!id) return null;
  return STORE_ITEMS.find((item) => item.id === id) || null;
}

function getToneClasses(tone: StoreMission["tone"]) {
  const tones = {
    primary: "border-primary/25 bg-primary/10 text-primary",
    gold: "border-yellow-400/25 bg-yellow-500/10 text-yellow-400",
    blue: "border-blue-400/25 bg-blue-500/10 text-blue-400",
    red: "border-red-400/25 bg-red-500/10 text-red-400",
    cyan: "border-cyan-400/25 bg-cyan-500/10 text-cyan-400",
  };

  return tones[tone];
}

export default function Loja() {
  const { user } = useAuth();

  const {
    currentHoras,
    currentPatrulhas,
    carreira,
    storeInventory,
    isLoadingStore,
    isFetchingStore,
    buyStoreItem,
    equipStoreItem,
  } = useData() as any;

  const [activeSection, setActiveSection] = useState<StoreSection>("DESTAQUES");
  const [selectedCategory, setSelectedCategory] = useState<StoreCategory>("TODOS");
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [storeError, setStoreError] = useState<string | null>(null);
  const [storeSuccess, setStoreSuccess] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<StoreItem | null>(null);

  useEffect(() => {
    return () => {
      window.dispatchEvent(
        new CustomEvent(
          "gnr:theme-preview-clear",
        ),
      );
    };
  }, []);
  const [autoEquipAfterBuy, setAutoEquipAfterBuy] = useState(true);
  const [favoriteItemIds, setFavoriteItemIds] = useState<string[]>([]);
  const [catalogItems, setCatalogItems] = useState<any[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [
    selectedThemeFamily,
    setSelectedThemeFamily,
  ] = useState("Todos");


  useEffect(() => {
    let cancelled = false;

    async function loadCatalog() {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/store/items`,
          {
            credentials: "include",
            headers: {
              Accept: "application/json",
            },
          },
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error ||
            "Não foi possível carregar o catálogo.",
          );
        }

        if (!cancelled) {
          setCatalogItems(
            Array.isArray(data.items)
              ? data.items
              : [],
          );
        }
      } catch (error) {
        console.error(
          "[LOJA] Erro ao carregar catálogo:",
          error,
        );
      } finally {
        if (!cancelled) {
          setCatalogLoading(false);
        }
      }
    }

    void loadCatalog();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const backendFavorites =
      storeInventory?.favoriteItemIds;

    if (Array.isArray(backendFavorites)) {
      setFavoriteItemIds(
        backendFavorites.map(String),
      );
    }
  }, [storeInventory?.favoriteItemIds]);

  const userId = String(user?.id || "");
  const isDevUser = userId === DEV_USER_ID;

  const ownedItemIds = storeInventory?.ownedItems || [];
  const equipped = storeInventory?.equipped || {};
  const storeCredits = Number(storeInventory?.credits || 0);

  const totalHoras = useMemo(() => {
    if (!Array.isArray(currentHoras)) return 0;

    return currentHoras
      .filter((h: any) => String(h?.guardaId || h?.discordId || "") === userId)
      .reduce((acc: number, h: any) => acc + Number(h?.horasRegistadas || 0), 0);
  }, [currentHoras, userId]);

  const totalPatrulhas = useMemo(() => {
    if (!Array.isArray(currentPatrulhas)) return 0;

    return currentPatrulhas.filter((p: any) => {
      const participants = [
        p?.guardaId,
        p?.discordId,
        p?.userId,
        ...(Array.isArray(p?.participantes) ? p.participantes : []),
      ];

      return participants.map(String).includes(userId);
    }).length;
  }, [currentPatrulhas, userId]);

  const totalMedalhas = useMemo(() => {
    if (!Array.isArray(carreira)) return 0;

    return carreira.filter(
      (event: any) => String(event?.userId || "") === userId && event?.tipo === "MEDALHA"
    ).length;
  }, [carreira, userId]);

  const totalEventos = useMemo(() => {
    if (!Array.isArray(carreira)) return 0;

    return carreira.filter((event: any) => String(event?.userId || "") === userId).length;
  }, [carreira, userId]);

  const missions = useMemo<StoreMission[]>(() => {
    return [
      {
        id: "hours-weekly",
        name: "Turno Operacional",
        description: "Completa 5 horas de serviço no período atual.",
        reward: 100,
        progress: Math.min(totalHoras, 5),
        target: 5,
        icon: Clock3,
        tone: "primary",
      },
      {
        id: "patrol-weekly",
        name: "Patrulhamento Ativo",
        description: "Participa em 2 patrulhas registadas.",
        reward: 150,
        progress: Math.min(totalPatrulhas, 2),
        target: 2,
        icon: Car,
        tone: "cyan",
      },
      {
        id: "medal-career",
        name: "Mérito Reconhecido",
        description: "Recebe pelo menos 1 medalha no histórico.",
        reward: 500,
        progress: Math.min(totalMedalhas, 1),
        target: 1,
        icon: Medal,
        tone: "gold",
      },
      {
        id: "career-events",
        name: "Carreira em Movimento",
        description: "Alcança 10 eventos de carreira registados.",
        reward: 300,
        progress: Math.min(totalEventos, 10),
        target: 10,
        icon: History,
        tone: "blue",
      },
    ];
  }, [totalHoras, totalPatrulhas, totalMedalhas, totalEventos]);

  const normalizedItems = useMemo(() => {
    const visualById =
      new Map(
        STORE_ITEMS.map(
          (item) => [
            item.id,
            item,
          ],
        ),
      );

    const source =
      catalogItems.length > 0
        ? catalogItems
        : STORE_ITEMS;

    return source.map((raw: any) => {
      const visual =
        visualById.get(
          raw.id,
        );

      const category =
        raw.category as StoreItem["category"];

      const iconByCategory: Record<string, any> = {
        MOLDURAS: Shield,
        EMBLEMAS: Medal,
        FUNDOS: Image,
        TITULOS: Tag,
        TEMAS: Paintbrush,
        COLECOES: Package,
        SOCIAL: Sparkles,
        EXCLUSIVOS: Crown,
      };

      const finalAsset = resolveFinalStoreAsset(raw);

      const baseItem: StoreItem = {
        ...(visual || {}),
        ...raw,
        category: finalAsset?.category || raw.category,
        equipSlot: finalAsset?.equipSlot || raw.equipSlot,
        icon:
          visual?.icon ||
          iconByCategory[category] ||
          ShoppingBag,
        preview:
          visual?.preview ||
          "border-primary/30 bg-primary/10",
        rarity:
          raw.rarity ||
          visual?.rarity ||
          "COMUM",
        image:
          raw.image ||
          raw.imageUrl ||
          raw.previewImage ||
          raw.thumbnail ||
          raw.thumbnailUrl ||
          raw.asset ||
          raw.assetPath ||
          finalAsset?.image ||
          visual?.image,
        locked:
          raw.locked ===
          true,
        requirement:
          raw.requirement ||
          (
            Array.isArray(
              raw.requiredRoleKeys,
            ) &&
            raw.requiredRoleKeys.length >
              0
              ? `Requer ${raw.requiredRoleKeys.join(" / ")}`
              : undefined
          ),
      };

      const editorial =
        getEditorialContent(
          baseItem,
        );

      const item: StoreItem = {
        ...baseItem,
        name:
          visual?.name ||
          raw.name,
        description:
          visual?.description ||
          raw.description,
        image:
          raw.image ||
          raw.imageUrl ||
          visual?.image,
        tagline:
          raw.tagline ||
          visual?.tagline ||
          editorial.tagline,
        bestFor:
          raw.bestFor ||
          visual?.bestFor ||
          editorial.bestFor,
        features:
          Array.isArray(
            raw.features,
          )
            ? raw.features
            : visual?.features ||
              editorial.features,
        tags:
          Array.isArray(
            raw.tags,
          )
            ? raw.tags
            : visual?.tags ||
              editorial.tags,
        displayBadge:
          raw.displayBadge ||
          visual?.displayBadge ||
          editorial.displayBadge,
      };

      if (!isDevUser) {
        return item;
      }

      return {
        ...item,
        locked: false,
        requirement: undefined,
      };
    });
  }, [
    isDevUser,
    catalogItems,
  ]);

  const normalizedBundles = useMemo(() => {
    return STORE_BUNDLES.map((bundle) => {
      if (!isDevUser) return bundle;

      return {
        ...bundle,
        locked: false,
        requirement: undefined,
      };
    });
  }, [isDevUser]);

  const filteredItems = useMemo(() => {
    const query =
      catalogSearch
        .trim()
        .toLowerCase();

    return normalizedItems.filter(
      (item) => {
        const matchesCategory =
          selectedCategory ===
            "TODOS" ||
          item.category ===
            selectedCategory;

        const matchesSearch =
          !query ||
          getItemSearchText(
            item,
          ).includes(
            query,
          );

        return (
          matchesCategory &&
          matchesSearch
        );
      },
    );
  }, [
    selectedCategory,
    normalizedItems,
    catalogSearch,
  ]);

  const featuredItems = normalizedItems.filter((item) => item.featured).slice(0, 4);
  const weeklyItem = normalizedItems.find((item) => item.id === "frame-gioe") || normalizedItems[0];
  const ownedStoreItems = normalizedItems.filter((item) => ownedItemIds.includes(item.id));
  const favoriteStoreItems = normalizedItems.filter((item) => favoriteItemIds.includes(item.id));

  const ownedItems = ownedItemIds.length;
  const equippedItems =
    Number(Boolean(equipped?.frame)) +
    Number(Boolean(equipped?.background)) +
    Number(Boolean(equipped?.title)) +
    Number(Boolean(equipped?.theme)) +
    (Array.isArray(equipped?.badges) ? equipped.badges.length : 0);

  const exclusiveItems = normalizedItems.filter((item) => item.rarity === "EXCLUSIVO").length;
  const inventoryCompletion = Math.round(
    (ownedStoreItems.length / Math.max(normalizedItems.length, 1)) * 100
  );

  const categoryStats = useMemo(() => {
    return CATEGORIES.filter((category) => category.id !== "TODOS").map((category) => {
      const items = normalizedItems.filter((item) => item.category === category.id);
      const owned = items.filter((item) => ownedItemIds.includes(item.id)).length;
      return { ...category, count: items.length, owned };
    });
  }, [normalizedItems, ownedItemIds]);

  const achievementStats = [
    {
      id: "collector",
      title: "Colecionador",
      description: "Compra 5 itens na loja.",
      current: Math.min(ownedStoreItems.length, 5),
      target: 5,
      icon: Gift,
      tone: "primary" as const,
    },
    {
      id: "style",
      title: "Perfil Estiloso",
      description: "Equipa moldura, fundo, tema e emblema.",
      current: Math.min(equippedItems, 4),
      target: 4,
      icon: Sparkles,
      tone: "gold" as const,
    },
    {
      id: "legendary",
      title: "Lendário",
      description: "Possui pelo menos 1 item lendário.",
      current: ownedStoreItems.some((item) => item.rarity === "LENDARIO") ? 1 : 0,
      target: 1,
      icon: Flame,
      tone: "red" as const,
    },
    {
      id: "wallet",
      title: "Magnata da Guarda",
      description: "Acumula 5000 créditos de mérito.",
      current: Math.min(storeCredits, 5000),
      target: 5000,
      icon: Coins,
      tone: "cyan" as const,
    },
  ];

  async function handleBuy(item: StoreItem, options?: { equipAfter?: boolean }) {
    setBusyItemId(item.id);
    setStoreError(null);
    setStoreSuccess(null);

    try {
      const result = await buyStoreItem(item.id);
      const shouldEquip = options?.equipAfter ?? autoEquipAfterBuy;

      if (shouldEquip && getEquipSlot(item)) {
        await equipStoreItem(item.id);
        setStoreSuccess(`${item.name} comprado e equipado com sucesso.`);
      } else {
        setStoreSuccess(result?.message || "Item comprado com sucesso.");
      }
    } catch (error: any) {
      setStoreError(error?.message || "Erro ao comprar item.");
    } finally {
      setBusyItemId(null);
    }
  }

  async function handleEquip(item: StoreItem) {
    setBusyItemId(item.id);
    setStoreError(null);
    setStoreSuccess(null);

    try {
      const result = await equipStoreItem(item.id);

      if (
        item.category ===
        "TEMAS"
      ) {
        clearGlobalThemePreview();
      }

      setStoreSuccess(result?.message || "Item equipado com sucesso.");
    } catch (error: any) {
      setStoreError(error?.message || "Erro ao equipar item.");
    } finally {
      setBusyItemId(null);
    }
  }

  async function handleBuyBundle(bundle: StoreBundle) {
    setBusyItemId(bundle.id);
    setStoreError(null);
    setStoreSuccess(null);

    try {
      const missingItems = bundle.itemIds.filter((itemId) => !ownedItemIds.includes(itemId));

      for (const itemId of missingItems) {
        await buyStoreItem(itemId);
      }

      const firstEquipable = bundle.itemIds.map(getItemById).find((item) => item && getEquipSlot(item));

      if (firstEquipable) {
        await equipStoreItem(firstEquipable.id);
      }

      setStoreSuccess(`${bundle.name} comprado com sucesso.`);
    } catch (error: any) {
      setStoreError(
        error?.message ||
          "Erro ao comprar pack. Confirma se tens créditos suficientes e se os itens existem no backend."
      );
    } finally {
      setBusyItemId(null);
    }
  }

  async function toggleFavorite(itemId: string) {
    const previous =
      favoriteItemIds;

    setFavoriteItemIds((current) =>
      current.includes(itemId)
        ? current.filter(
            (id) => id !== itemId,
          )
        : [...current, itemId],
    );

    try {
      const response = await fetch(
        `/api/store/favorites/${encodeURIComponent(
          itemId,
        )}`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        },
      );

      const payload =
        await response
          .json()
          .catch(() => null);

      if (!response.ok) {
        throw new Error(
          payload?.error ||
            "Erro ao atualizar favoritos.",
        );
      }

      if (
        Array.isArray(
          payload?.itemIds,
        )
      ) {
        setFavoriteItemIds(
          payload.itemIds.map(String),
        );
      }
    } catch (error: any) {
      setFavoriteItemIds(previous);
      setStoreError(
        error?.message ||
          "Erro ao atualizar favoritos.",
      );
    }
  }

  function clearGlobalThemePreview() {
    window.dispatchEvent(
      new CustomEvent(
        "gnr:theme-preview-clear",
      ),
    );
  }

  function openItemPreview(item: StoreItem) {
    if (item.category === "SOCIAL") {
      window.location.assign(
        `/definicoes/personalizacao-social?preview=${encodeURIComponent(
          item.id,
        )}`,
      );
      return;
    }

    if (
      item.category ===
      "TEMAS"
    ) {
      window.dispatchEvent(
        new CustomEvent(
          "gnr:theme-preview",
          {
            detail: {
              themeId:
                item.id,
            },
          },
        ),
      );
    }

    setPreviewItem(item);
  }

  function closeItemPreview() {
    clearGlobalThemePreview();
    setPreviewItem(null);
  }

  function openCatalog(category?: StoreCategory) {
    if (category) setSelectedCategory(category);
    setActiveSection("CATALOGO");
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="portal-v7-store space-y-7"
    >
      <section className="portal-v7-store-hero theme-panel relative overflow-hidden rounded-[1.75rem] border border-white/10 shadow-[0_40px_150px_rgba(0,0,0,0.50)] backdrop-blur-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(234,179,8,0.16),transparent_34%),radial-gradient(circle_at_86%_80%,rgba(16,185,129,0.18),transparent_38%)]" />
        <div className="absolute inset-0 cyber-grid-soft opacity-25" />

        <div className="relative grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_480px]">
          <div className="p-7 md:p-9">
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-3 rounded-full border border-yellow-400/25 bg-yellow-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.25em] text-yellow-400">
                <ShoppingBag className="h-4 w-4" />
                Loja Institucional
              </div>

              {isDevUser && (
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">
                  <Zap className="h-4 w-4" />
                  Modo Teste Ativo
                </div>
              )}
            </div>

            <p className="mb-4 text-[10px] font-black uppercase tracking-[0.42em] text-primary">
              Créditos de Mérito
            </p>

            <h1 className="text-5xl font-black uppercase leading-[0.92] tracking-tight text-white md:text-7xl">
              Loja da
              <span className="block text-yellow-400">Guarda</span>
            </h1>

            <p className="mt-6 max-w-3xl text-sm leading-7 text-muted-foreground md:text-[15px]">
              Descobre identidades de unidade, coleções operacionais e personalização social criada para dar ao teu perfil uma presença única dentro da Central. Experimenta, combina e constrói um visual à altura do teu percurso.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-xs font-bold text-white">
                <input
                  type="checkbox"
                  checked={autoEquipAfterBuy}
                  onChange={(event) => setAutoEquipAfterBuy(event.target.checked)}
                  className="h-4 w-4 accent-yellow-400"
                />
                Comprar e equipar automaticamente
              </label>

              <button
                type="button"
                onClick={() => openCatalog("TODOS")}
                className="inline-flex items-center gap-2 rounded-2xl bg-yellow-400 px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-black transition-all hover:-translate-y-0.5"
              >
                Abrir catálogo
                <ChevronRight className="h-4 w-4" />
              </button>

              <Link
                href="/guardas"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-white transition-all hover:border-primary/25 hover:bg-primary/10"
              >
                Ver efetivo
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            {(storeError || storeSuccess) && (
              <div
                className={`mt-6 rounded-2xl border px-4 py-3 text-sm font-bold ${
                  storeError
                    ? "border-red-400/25 bg-red-500/10 text-red-300"
                    : "border-primary/25 bg-primary/10 text-primary"
                }`}
              >
                {storeError || storeSuccess}
              </div>
            )}
          </div>

          <div className="relative border-t border-white/10 p-7 xl:border-l xl:border-t-0">
            <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-yellow-500/10 blur-[120px]" />

            <div className="relative rounded-[2.2rem] border border-yellow-400/20 bg-yellow-500/10 p-6">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-400">
                    Saldo disponível
                  </p>
                  <p className="mt-2 text-5xl font-black text-white">
                    {isLoadingStore ? "..." : storeCredits.toLocaleString("pt-PT")}
                  </p>
                  <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">
                    Créditos de Mérito
                  </p>
                </div>

                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-yellow-400/25 bg-black/25 text-yellow-400">
                  {isFetchingStore ? <Loader2 className="h-8 w-8 animate-spin" /> : <Coins className="h-8 w-8" />}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <WalletStat label="Horas" value={`${totalHoras.toFixed(1)}h`} />
                <WalletStat label="Patrulhas" value={totalPatrulhas} />
                <WalletStat label="Medalhas" value={totalMedalhas} />
              </div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                  Economia
                </p>
                <p className="mt-2 text-sm leading-6 text-white">
                  +10 por hora validada · +25 por patrulha · +100 por medalha
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <SummaryCard icon={<Gift className="h-5 w-5" />} label="Itens comprados" value={ownedItems} tone="primary" />
        <SummaryCard icon={<Sparkles className="h-5 w-5" />} label="Equipados" value={equippedItems} tone="gold" />
        <SummaryCard icon={<Lock className="h-5 w-5" />} label="Exclusivos" value={exclusiveItems} tone="blue" />
      </section>

      {isDevUser && (
        <section className="store-v9-admin rounded-[2rem] border border-white/10 bg-black/20 p-5 shadow-[0_22px_80px_rgba(0,0,0,.25)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[.22em] text-primary">
                Administração rápida
              </p>
              <h2 className="mt-2 text-2xl font-black text-white">
                Gestão simples da loja
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-white/42">
                Painel visual preparado para ligar ao backend de administração: criar, editar, ocultar, dar itens, gerir packs, stock e histórico.
              </p>
            </div>

            <Link
              href="/definicoes"
              className="inline-flex items-center gap-2 rounded-2xl border border-primary/20 bg-primary/[.08] px-4 py-3 text-[10px] font-black uppercase tracking-[.14em] text-primary"
            >
              Abrir definições
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[
              ["Criar item", "Nome, preço, raridade, imagem e categoria.", Package],
              ["Editar catálogo", "Ocultar, restaurar, stock e destaque.", SlidersHorizontal],
              ["Criar pack", "Tema + fundo + moldura + emblema.", Gift],
              ["Dar a guarda", "Atribuir item ou créditos manualmente.", BadgeCheck],
            ].map(([title, text, Icon]: any) => (
              <article
                key={title}
                className="rounded-2xl border border-white/10 bg-white/[.025] p-4"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/[.08] text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="mt-4 font-black text-white">{title}</p>
                <p className="mt-1 text-xs leading-5 text-white/36">{text}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="theme-panel relative overflow-hidden rounded-[2.2rem] border border-white/10 p-3 shadow-[0_24px_90px_rgba(0,0,0,0.36)] backdrop-blur-2xl">
        <div className="flex flex-wrap gap-2">
          {MAIN_SECTIONS.map((section) => {
            const Icon = section.icon;
            const active = activeSection === section.id;

            return (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                className={`group flex min-w-[150px] flex-1 items-center gap-3 rounded-[1.7rem] border px-4 py-4 text-left transition-all ${
                  active
                    ? "border-primary/35 bg-primary text-black shadow-[0_0_45px_hsl(var(--primary)/0.22)]"
                    : "border-white/10 bg-white/[0.035] text-muted-foreground hover:border-primary/20 hover:bg-primary/10 hover:text-white"
                }`}
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${
                    active ? "border-black/10 bg-black/10 text-black" : "border-white/10 bg-black/20 text-primary"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>

                <span className="min-w-0">
                  <span className="block text-[11px] font-black uppercase tracking-[0.18em]">{section.label}</span>
                  <span className={`mt-1 block truncate text-xs ${active ? "text-black/70" : "text-muted-foreground"}`}>
                    {section.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {activeSection === "DESTAQUES" && (
        <SectionShell
          eyebrow="Entrada Principal"
          title="Destaques da Loja"
          description="Uma seleção editorial com os artigos mais marcantes, coleções recomendadas e a rotação especial da semana."
        >
          <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1fr)_520px]">
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-2">
                {featuredItems.map((item) => (
                  <FeaturedItem key={item.id} item={item} onPreview={() => openItemPreview(item)} />
                ))}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {categoryStats.map((category) => (
                  <CategoryTile
                    key={category.id}
                    category={category}
                    onClick={() => openCatalog(category.id)}
                  />
                ))}
              </div>
            </div>

            <WeeklyHighlight item={weeklyItem} onPreview={() => openItemPreview(weeklyItem)} />
          </div>
        </SectionShell>
      )}

      {activeSection === "CATALOGO" && (
        <SectionShell
          eyebrow="Catálogo"
          title="Itens disponíveis"
          description="Explora a coleção completa por categoria, unidade, raridade ou estilo. Cada item inclui contexto, aplicação e pré-visualização."
        >
          <div className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
              <input
                type="search"
                value={catalogSearch}
                onChange={(event) =>
                  setCatalogSearch(
                    event.target.value,
                  )
                }
                placeholder="Pesquisar por nome, unidade, coleção, estilo ou raridade..."
                className="h-14 w-full rounded-2xl border border-white/10 bg-black/25 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-primary/30 focus:bg-primary/[0.04]"
              />
            </label>

            <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-5 text-xs font-black uppercase tracking-[0.14em] text-white/40">
              {filteredItems.length} itens encontrados
            </div>
          </div>

          <div className="mb-6 flex flex-wrap gap-2">
            {CATEGORIES.map((category) => {
              const Icon = category.icon;
              const active = selectedCategory === category.id;

              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setSelectedCategory(category.id)}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em] transition-all ${
                    active
                      ? "border-yellow-400/30 bg-yellow-500/10 text-yellow-400"
                      : "border-white/10 bg-white/[0.03] text-muted-foreground hover:border-primary/25 hover:text-white"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {category.label}
                </button>
              );
            })}
          </div>

          {selectedCategory === "TEMAS" && (
            <div className="store-v9-theme-families mb-6 rounded-[1.5rem] border border-white/10 bg-black/18 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[8px] font-black uppercase tracking-[.22em] text-primary">
                    Galeria de temas globais
                  </p>
                  <p className="mt-1 text-xs text-white/38">
                    Separa os temas por identidade e vê o impacto no site inteiro.
                  </p>
                </div>

                <span className="rounded-full border border-primary/20 bg-primary/[.07] px-3 py-1.5 text-[8px] font-black uppercase tracking-[.14em] text-primary">
                  Preview global
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {["Todos", ...THEME_FAMILIES].map((family) => (
                  <button
                    key={family}
                    type="button"
                    onClick={() => setSelectedThemeFamily(family)}
                    className={`rounded-full border px-4 py-2 text-[9px] font-black uppercase tracking-[.13em] transition ${
                      selectedThemeFamily === family
                        ? "border-primary/35 bg-primary/[.14] text-primary"
                        : "border-white/10 bg-white/[.025] text-white/35 hover:border-primary/20 hover:text-white"
                    }`}
                  >
                    {family}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="store-v9-grid grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredItems.map((item) => (
              <StoreItemCard
                key={item.id}
                item={item}
                credits={storeCredits}
                owned={ownedItemIds.includes(item.id)}
                equipped={isItemEquipped(item, equipped)}
                busy={busyItemId === item.id}
                onBuy={() => handleBuy(item)}
                onEquip={() => handleEquip(item)}
                onPreview={() => openItemPreview(item)}
                favorite={favoriteItemIds.includes(item.id)}
                onToggleFavorite={() => void toggleFavorite(item.id)}
              />
            ))}
          </div>

          {filteredItems.length === 0 && (
            <div className="mt-5 rounded-[2rem] border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
              <Search className="mx-auto h-8 w-8 text-white/20" />
              <h3 className="mt-4 text-xl font-black text-white">
                Nenhum item encontrado
              </h3>
              <p className="mt-2 text-sm text-white/35">
                Experimenta outro nome, unidade ou categoria.
              </p>
              <button
                type="button"
                onClick={() => {
                  setCatalogSearch("");
                  setSelectedCategory("TODOS");
                }}
                className="mt-5 rounded-xl border border-primary/25 bg-primary/10 px-5 py-3 text-[9px] font-black uppercase tracking-[0.14em] text-primary"
              >
                Limpar pesquisa
              </button>
            </div>
          )}
        </SectionShell>
      )}

      {activeSection === "SOCIAL" && (
        <SectionShell
          eyebrow="Personalização Social"
          title="Transforma o teu mural"
          description="Fundos exclusivos, comentários premium, assinaturas, emblemas, reações e efeitos ligados diretamente às definições sociais."
          side={
            <Link
              href="/definicoes/personalizacao-social"
              className="inline-flex items-center gap-2 rounded-2xl border border-primary/25 bg-primary/10 px-5 py-3 text-[9px] font-black uppercase tracking-[0.14em] text-primary transition hover:bg-primary/15"
            >
              <Paintbrush className="h-4 w-4" />
              Personalizar agora
            </Link>
          }
        >
          <div className="mb-6 overflow-hidden rounded-[2rem] border border-primary/20 bg-gradient-to-br from-primary/10 via-black/20 to-purple-500/10 p-6">
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_340px] xl:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-2 text-[9px] font-black uppercase tracking-[0.16em] text-primary">
                  <Sparkles className="h-4 w-4" />
                  Nova coleção
                </div>

                <h3 className="mt-4 text-3xl font-black text-white">
                  A tua identidade em toda a Central
                </h3>

                <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
                  Os estilos comprados acompanham o teu mural e os comentários que deixas nos perfis de outros militares. Experimenta antes de comprar e configura tudo com preview em tempo real.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {[
                    "Fundos do mural",
                    "Comentários",
                    "Assinaturas",
                    "Reações",
                    "Emblemas sociais",
                    "Efeitos",
                  ].map((label) => (
                    <span
                      key={label}
                      className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-[8px] font-black uppercase text-white/45"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-white/10 bg-black/30 p-5">
                <p className="text-[8px] font-black uppercase tracking-[0.16em] text-primary">
                  Como funciona
                </p>

                <div className="mt-4 space-y-3">
                  {[
                    ["1", "Escolhe um item"],
                    ["2", "Experimenta no preview"],
                    ["3", "Compra com créditos"],
                    ["4", "Equipa nas definições sociais"],
                  ].map(([number, text]) => (
                    <div
                      key={number}
                      className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-black text-primary-foreground">
                        {number}
                      </span>

                      <span className="text-sm font-black text-white/60">
                        {text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {normalizedItems
              .filter(
                (item) =>
                  item.category ===
                  "SOCIAL",
              )
              .map((item) => (
                <StoreItemCard
                  key={item.id}
                  item={item}
                  credits={storeCredits}
                  owned={ownedItemIds.includes(
                    item.id,
                  )}
                  equipped={false}
                  busy={
                    busyItemId === item.id
                  }
                  onBuy={() =>
                    handleBuy(item, {
                      equipAfter: false,
                    })
                  }
                  onEquip={() =>
                    openItemPreview(item)
                  }
                  onPreview={() =>
                    openItemPreview(item)
                  }
                  favorite={favoriteItemIds.includes(
                    item.id,
                  )}
                  onToggleFavorite={() =>
                    void toggleFavorite(
                      item.id,
                    )
                  }
                />
              ))}
          </div>
        </SectionShell>
      )}

      {activeSection === "PACKS" && (
        <SectionShell
          eyebrow="Packs de Unidade"
          title="Compra conjuntos completos"
          description="Packs separam melhor as coleções e deixam a loja mais organizada."
        >
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-4">
            {normalizedBundles.map((bundle) => (
              <BundleCard
                key={bundle.id}
                bundle={bundle}
                ownedItemIds={ownedItemIds}
                busy={busyItemId === bundle.id}
                credits={storeCredits}
                onBuy={() => handleBuyBundle(bundle)}
              />
            ))}
          </div>
        </SectionShell>
      )}

      {activeSection === "INVENTARIO" && (
        <SectionShell
          eyebrow="O Meu Inventário"
          title="Comprados, favoritos e conquistas"
          description="Tudo o que é pessoal fica numa área própria e não fica misturado com o catálogo."
          side={
            <div className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-right">
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-muted-foreground">Coleção completa</p>
              <p className="text-2xl font-black text-primary">{inventoryCompletion}%</p>
            </div>
          }
        >
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_480px]">
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <InventoryMetric label="Comprados" value={ownedStoreItems.length} icon={<Gift className="h-5 w-5" />} tone="primary" />
                <InventoryMetric label="Favoritos" value={favoriteStoreItems.length} icon={<Sparkles className="h-5 w-5" />} tone="gold" />
                <InventoryMetric
                  label="Por desbloquear"
                  value={Math.max(normalizedItems.length - ownedStoreItems.length, 0)}
                  icon={<Lock className="h-5 w-5" />}
                  tone="blue"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <InventoryShelf
                  title="Últimas aquisições"
                  empty="Ainda não tens itens comprados."
                  items={ownedStoreItems.slice(0, 6)}
                  onPreview={openItemPreview}
                />
                <InventoryShelf
                  title="Lista de desejos"
                  empty="Marca itens como favoritos para aparecerem aqui."
                  items={favoriteStoreItems.slice(0, 6)}
                  onPreview={openItemPreview}
                />
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/[0.025] p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-yellow-400/20 bg-yellow-500/10 text-yellow-400">
                  <Trophy className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">Conquistas da Loja</h3>
                  <p className="text-sm text-muted-foreground">Objetivos para dar vida à economia.</p>
                </div>
              </div>

              <div className="space-y-3">
                {achievementStats.map((achievement) => (
                  <AchievementCard key={achievement.id} achievement={achievement} />
                ))}
              </div>
            </div>
          </div>
        </SectionShell>
      )}

      {activeSection === "MISSOES" && (
        <SectionShell
          eyebrow="Missões Semanais"
          title="Ganha créditos pela atividade"
          description="Missões ficam isoladas numa aba própria, para não poluir a loja principal."
          side={
            <span className="w-fit rounded-full border border-primary/25 bg-primary/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-primary">
              Recompensas visuais
            </span>
          }
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {missions.map((mission) => (
              <MissionCard key={mission.id} mission={mission} />
            ))}
          </div>
        </SectionShell>
      )}

      {activeSection === "HISTORICO" && (
        <SectionShell
          eyebrow="Histórico"
          title="Transações da Loja"
          description="Zona preparada para ligar ao backend e mostrar compras, equipamentos e créditos."
        >
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_380px]">
            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-yellow-400/20 bg-yellow-500/10 text-yellow-400">
                  <History className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white">Últimas ações</h3>
                  <p className="text-sm text-muted-foreground">A aguardar ligação à rota de transações.</p>
                </div>
              </div>

              <div className="space-y-3">
                <HistoryRow icon={<ShoppingBag className="h-4 w-4" />} title="Compras futuras" text="Aqui vai aparecer: Comprou Moldura GIOE — 1400 créditos." />
                <HistoryRow icon={<BadgeCheck className="h-4 w-4" />} title="Equipamentos futuros" text="Aqui vai aparecer: Equipou Fundo Comando-Geral." />
                <HistoryRow icon={<Coins className="h-4 w-4" />} title="Créditos futuros" text="Aqui vai aparecer: Recebeu +500 créditos por medalha." />
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-red-400/20 bg-red-500/10 text-red-300">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-black text-white">Backend sugerido</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Para completar esta aba, cria uma rota tipo
                <span className="mx-1 font-black text-white">/api/store/transactions/me</span>
                e puxa compras/equipamentos da coleção StoreTransaction.
              </p>
            </div>
          </div>
        </SectionShell>
      )}

      {previewItem &&
        previewItem.category !== "SOCIAL" && (
        <PreviewModal
          item={previewItem}
          equipped={equipped}
          owned={ownedItemIds.includes(previewItem.id)}
          credits={storeCredits}
          busy={busyItemId === previewItem.id}
          onClose={closeItemPreview}
          onBuy={() => handleBuy(previewItem)}
          onEquip={() => handleEquip(previewItem)}
        />
      )}
    </motion.div>
  );
}

function SectionShell({
  eyebrow,
  title,
  description,
  side,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  side?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="theme-panel relative overflow-hidden rounded-[2.4rem] border border-white/10 p-6 shadow-[0_32px_130px_rgba(0,0,0,0.42)] backdrop-blur-2xl">
      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-[120px]" />

      <div className="relative mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.26em] text-muted-foreground">{eyebrow}</p>
          <h2 className="mt-2 text-3xl font-black text-white">{title}</h2>
          {description && <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>}
        </div>

        {side}
      </div>

      <div className="relative">{children}</div>
    </section>
  );
}

function WalletStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
      <p className="text-lg font-black text-white">{value}</p>
      <p className="mt-1 text-[9px] font-black uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  tone: "primary" | "gold" | "blue";
}) {
  const tones = {
    primary: "border-primary/20 bg-primary/10 text-primary",
    gold: "border-yellow-400/20 bg-yellow-500/10 text-yellow-400",
    blue: "border-blue-400/20 bg-blue-500/10 text-blue-400",
  };

  return (
    <div className="theme-panel rounded-[2rem] border border-white/10 p-5">
      <div className="mb-5 flex items-center justify-between">
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${tones[tone]}`}>{icon}</div>
        <p className="text-4xl font-black text-white">{value}</p>
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
    </div>
  );
}

function FeaturedItem({ item, onPreview }: { item: StoreItem; onPreview: () => void }) {
  const rarity = getRarityStyle(item.rarity);
  const Icon = item.icon;

  return (
    <button
      type="button"
      onClick={onPreview}
      className={`group relative min-h-[260px] overflow-hidden rounded-[2.1rem] border border-yellow-400/20 bg-yellow-500/10 p-6 text-left transition-all hover:-translate-y-1 hover:border-yellow-400/35 hover:bg-yellow-500/[0.12] ${rarity.glow}`}
    >
      <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-yellow-500/20 blur-[90px]" />
      {item.image && (
        <>
          <img
            src={item.image}
            alt={item.name}
            className="absolute inset-0 h-full w-full object-cover opacity-20 transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/88 via-black/62 to-black/35" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/85 to-transparent" />
        </>
      )}

      <div className="relative flex h-full flex-col justify-between gap-5">
        <div className="flex items-start justify-between gap-3">
          <div className={`relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border ${item.preview}`}>
            {item.image && <img src={item.image} alt={item.name} className="absolute inset-0 h-full w-full object-cover" />}
            <div className="absolute inset-0 bg-black/40" />
            <Icon className="relative h-7 w-7 text-white" />
          </div>

          <div className="flex flex-col items-end gap-2">
            <span className="rounded-full border border-yellow-400/25 bg-black/45 px-3 py-1 text-[8px] font-black uppercase tracking-[0.14em] text-yellow-400 backdrop-blur-md">
              Destaque
            </span>
            <span className={`rounded-full border px-3 py-1 text-[8px] font-black uppercase tracking-[0.14em] ${rarity.className}`}>
              {rarity.label}
            </span>
          </div>
        </div>

        <div className="min-w-0">
          <h3 className="line-clamp-2 text-2xl font-black leading-tight text-white">{item.name}</h3>
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">{item.description}</p>
        </div>
      </div>
    </button>
  );
}

function CategoryTile({
  category,
  onClick,
}: {
  category: { id: StoreCategory; label: string; icon: any; count: number; owned: number };
  onClick: () => void;
}) {
  const Icon = category.icon;
  const percent = Math.round((category.owned / Math.max(category.count, 1)) * 100);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-[2rem] border border-white/10 bg-white/[0.03] p-5 text-left transition-all hover:-translate-y-1 hover:border-primary/25 hover:bg-primary/10"
    >
      <div className="mb-5 flex items-center justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
      </div>
      <h3 className="text-xl font-black text-white">{category.label}</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        {category.owned}/{category.count} comprados
      </p>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
      </div>
    </button>
  );
}

function WeeklyHighlight({ item, onPreview }: { item: StoreItem; onPreview: () => void }) {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-red-400/20 bg-red-500/10 p-6">
      {item.image && (
        <>
          <img src={item.image} alt={item.name} className="absolute inset-0 h-full w-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/40" />
        </>
      )}

      <div className="relative">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-red-400/25 bg-red-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-red-300">
          <Flame className="h-3.5 w-3.5" />
          Destaque da Semana
        </div>
        <h3 className="text-2xl font-black text-white">{item.name}</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Item em rotação especial. Usa a pré-visualização para ver como fica no teu perfil antes de comprar.
        </p>
        <div className="mt-5 flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/35 p-4">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-muted-foreground">Termina em</p>
            <p className="mt-1 text-lg font-black text-white">3 dias</p>
          </div>
          <button type="button" onClick={onPreview} className="rounded-2xl bg-red-400 px-4 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-black">
            Pré-visualizar
          </button>
        </div>
      </div>
    </div>
  );
}

function StoreItemCard({
  item,
  credits,
  owned,
  equipped,
  busy,
  favorite,
  onBuy,
  onEquip,
  onPreview,
  onToggleFavorite,
}: {
  item: StoreItem;
  credits: number;
  owned: boolean;
  equipped: boolean;
  busy: boolean;
  favorite: boolean;
  onBuy: () => void;
  onEquip: () => void;
  onPreview: () => void;
  onToggleFavorite: () => void;
}) {
  const rarity = getRarityStyle(item.rarity);
  const Icon = item.icon;
  const soldOut =
    item.stock !== null &&
    item.stock !== undefined &&
    item.stock <= 0;

  const canBuy =
    !item.locked &&
    !owned &&
    item.purchasable !== false &&
    !soldOut &&
    credits >= item.price;
  const insufficient =
    !item.locked &&
    !owned &&
    item.purchasable !== false &&
    !soldOut &&
    credits < item.price;
  const isSocial =
    item.category === "SOCIAL";

  const editorial =
    getEditorialContent(item);

  const tagline =
    item.tagline ||
    editorial.tagline;

  const bestFor =
    item.bestFor ||
    editorial.bestFor;

  const tags =
    item.tags ||
    editorial.tags;

  return (
    <div className={`group relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] p-5 transition-all hover:-translate-y-1 hover:border-yellow-400/25 hover:bg-yellow-500/[0.045] ${rarity.glow}`}>
      <div className="absolute -right-20 -top-20 h-52 w-52 rounded-full bg-yellow-500/10 blur-[95px] opacity-0 transition-opacity group-hover:opacity-100" />

      <div className="relative">
        <div className={`relative mb-5 flex h-44 items-center justify-center overflow-hidden rounded-[1.5rem] border ${item.preview}`}>
          {item.image && (
            <>
              <img src={item.image} alt={item.name} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/25" />
              <div className="absolute left-4 top-4 rounded-full border border-white/10 bg-black/50 px-3 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-white backdrop-blur-md">
                {item.displayBadge ||
                  (item.category === "SOCIAL"
                    ? "Personalização Social"
                    : "Item Premium")}
              </div>
            </>
          )}

          <button
            type="button"
            onClick={onToggleFavorite}
            className={`absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-xl border backdrop-blur-md ${
              favorite ? "border-yellow-400/30 bg-yellow-500/20 text-yellow-400" : "border-white/10 bg-black/45 text-white"
            }`}
            title="Guardar favorito"
          >
            <Heart className={`h-4 w-4 ${favorite ? "fill-current" : ""}`} />
          </button>

          <div className={`relative flex h-24 w-24 items-center justify-center rounded-[2rem] border border-white/10 bg-black/45 text-white shadow-[0_0_55px_rgba(0,0,0,0.35)] ${item.image ? "backdrop-blur-md" : ""}`}>
            <Icon className="h-11 w-11" />
            {item.locked && (
              <div className="absolute -right-2 -top-2 flex h-9 w-9 items-center justify-center rounded-xl border border-red-400/25 bg-red-500/20 text-red-400">
                <Lock className="h-4 w-4" />
              </div>
            )}
            {equipped && (
              <div className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-xl border border-primary/25 bg-primary/20 text-primary">
                <BadgeCheck className="h-4 w-4" />
              </div>
            )}
          </div>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-[0.14em] ${rarity.className}`}>
            {rarity.label}
          </span>
          <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-muted-foreground">
            {item.category}
          </span>
          {item.collection && (
            <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-primary">
              {item.collection}
            </span>
          )}
          {item.limited && (
            <span className="rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-red-300">
              Limitado
            </span>
          )}
        </div>

        <h3 className="text-2xl font-black text-white">{item.name}</h3>

        <p className="mt-2 text-sm font-black leading-6 text-white/70">
          {tagline}
        </p>

        <p className="mt-2 min-h-[48px] text-sm leading-6 text-muted-foreground">
          {item.description}
        </p>

        <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
          <p className="text-[8px] font-black uppercase tracking-[0.14em] text-primary">
            Ideal para
          </p>
          <p className="mt-1 text-xs leading-5 text-white/45">
            {bestFor}
          </p>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {tags.slice(0, 3).map(
            (tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-white/35"
              >
                {tag}
              </span>
            ),
          )}
        </div>

        {item.requirement && (
          <p className="mt-3 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300">
            {item.requirement}
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-muted-foreground">Preço</p>
            <p className="mt-1 flex items-center gap-2 text-2xl font-black text-yellow-400">
              <Coins className="h-5 w-5" />
              {item.price}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onPreview}
              className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-white transition-all hover:border-primary/25 hover:bg-primary/10"
            >
              Preview
            </button>

            {busy ? (
              <button type="button" disabled className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                A processar
              </button>
            ) : equipped ? (
              <button type="button" onClick={onEquip} className="rounded-2xl border border-primary/25 bg-primary/10 px-4 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-primary">
                Equipado
              </button>
            ) : owned && isSocial ? (
              <button
                type="button"
                onClick={onPreview}
                className="rounded-2xl border border-primary/25 bg-primary/10 px-4 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-primary"
              >
                Personalizar
              </button>
            ) : owned ? (
              <button type="button" onClick={onEquip} className="rounded-2xl border border-blue-400/25 bg-blue-500/10 px-4 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-blue-400">
                Equipar
              </button>
            ) : item.locked ? (
              <button type="button" disabled className="rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-red-400">
                Bloqueado
              </button>
            ) : insufficient ? (
              <button type="button" disabled className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                Sem créditos
              </button>
            ) : canBuy ? (
              <button type="button" onClick={onBuy} className="rounded-2xl bg-yellow-400 px-4 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-black transition-all hover:-translate-y-0.5">
                Comprar
              </button>
            ) : (
              <button type="button" disabled className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                Indisponível
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function BundleCard({
  bundle,
  ownedItemIds,
  busy,
  credits,
  onBuy,
}: {
  bundle: StoreBundle;
  ownedItemIds: string[];
  busy: boolean;
  credits: number;
  onBuy: () => void;
}) {
  const Icon = bundle.icon;
  const ownedCount = bundle.itemIds.filter((itemId) => ownedItemIds.includes(itemId)).length;
  const complete = ownedCount === bundle.itemIds.length;
  const insufficient = credits < bundle.price;

  return (
    <div className={`group relative overflow-hidden rounded-[2rem] border p-5 ${bundle.className}`}>
      {bundle.image && (
        <>
          <img src={bundle.image} alt={bundle.name} className="absolute inset-0 h-full w-full object-cover opacity-25 transition-transform duration-500 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/55 to-black/35" />
        </>
      )}

      <div className="relative">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-current/20 bg-black/35 backdrop-blur-md">
            <Icon className="h-7 w-7" />
          </div>
          <span className="rounded-full border border-current/20 bg-black/35 px-3 py-1 text-[9px] font-black uppercase tracking-[0.14em] backdrop-blur-md">
            {ownedCount}/{bundle.itemIds.length}
          </span>
        </div>

        <h3 className="text-2xl font-black text-white">{bundle.name}</h3>
        <p className="mt-2 min-h-[66px] text-sm leading-6 text-muted-foreground">{bundle.description}</p>

        {bundle.requirement && (
          <p className="mt-3 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300">
            {bundle.requirement}
          </p>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          {bundle.itemIds.map((itemId) => {
            const item = getItemById(itemId);
            const ItemIcon = item?.icon || Package;
            const owned = ownedItemIds.includes(itemId);
            return (
              <span
                key={itemId}
                title={item?.name || itemId}
                className={`flex h-9 w-9 items-center justify-center rounded-xl border ${
                  owned ? "border-primary/25 bg-primary/15 text-primary" : "border-white/10 bg-black/35 text-white"
                } backdrop-blur-md`}
              >
                <ItemIcon className="h-4 w-4" />
              </span>
            );
          })}
        </div>

        <div className="mt-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-muted-foreground">Preço pack</p>
            <p className="mt-1 flex items-center gap-2 text-2xl font-black text-yellow-400">
              <Coins className="h-5 w-5" />
              {bundle.price}
            </p>
            {bundle.oldPrice && <p className="text-xs font-bold text-muted-foreground line-through">{bundle.oldPrice}</p>}
          </div>

          {busy ? (
            <button type="button" disabled className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              A processar
            </button>
          ) : complete ? (
            <button type="button" disabled className="rounded-2xl border border-primary/25 bg-primary/10 px-4 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-primary">
              Completo
            </button>
          ) : bundle.locked ? (
            <button type="button" disabled className="rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-red-400">
              Bloqueado
            </button>
          ) : insufficient ? (
            <button type="button" disabled className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">
              Sem créditos
            </button>
          ) : (
            <button type="button" onClick={onBuy} className="rounded-2xl bg-yellow-400 px-4 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-black transition-all hover:-translate-y-0.5">
              Comprar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function MissionCard({ mission }: { mission: StoreMission }) {
  const Icon = mission.icon;
  const percent = Math.min(100, Math.round((mission.progress / mission.target) * 100));
  const complete = mission.progress >= mission.target;

  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${getToneClasses(mission.tone)}`}>
          <Icon className="h-5 w-5" />
        </div>
        <span className="rounded-full border border-yellow-400/20 bg-yellow-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-yellow-400">
          +{mission.reward}
        </span>
      </div>

      <h3 className="text-lg font-black text-white">{mission.name}</h3>
      <p className="mt-2 min-h-[48px] text-sm leading-6 text-muted-foreground">{mission.description}</p>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.14em]">
          <span className="text-muted-foreground">Progresso</span>
          <span className={complete ? "text-primary" : "text-white"}>{mission.progress.toFixed(mission.target <= 2 ? 0 : 1)}/{mission.target}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs font-bold text-muted-foreground">
        {complete ? (
          <>
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Missão concluída
          </>
        ) : (
          <>
            <RefreshCcw className="h-4 w-4" />
            Continua a atividade
          </>
        )}
      </div>
    </div>
  );
}

function InventoryMetric({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  tone: "primary" | "gold" | "blue";
}) {
  const tones = {
    primary: "border-primary/20 bg-primary/10 text-primary",
    gold: "border-yellow-400/20 bg-yellow-500/10 text-yellow-400",
    blue: "border-blue-400/20 bg-blue-500/10 text-blue-400",
  };

  return (
    <div className="rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${tones[tone]}`}>{icon}</div>
        <p className="text-3xl font-black text-white">{value}</p>
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
    </div>
  );
}

function InventoryShelf({
  title,
  empty,
  items,
  onPreview,
}: {
  title: string;
  empty: string;
  items: StoreItem[];
  onPreview: (item: StoreItem) => void;
}) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.025] p-5">
      <h3 className="text-xl font-black text-white">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onPreview(item)}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-3 text-left transition-all hover:border-primary/25 hover:bg-primary/10"
              >
                <div className={`relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border ${item.preview}`}>
                  {item.image && <img src={item.image} alt={item.name} className="absolute inset-0 h-full w-full object-cover opacity-50" />}
                  <div className="absolute inset-0 bg-black/35" />
                  <Icon className="relative h-5 w-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-white">{item.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{item.category}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AchievementCard({
  achievement,
}: {
  achievement: {
    id: string;
    title: string;
    description: string;
    current: number;
    target: number;
    icon: any;
    tone: StoreMission["tone"];
  };
}) {
  const Icon = achievement.icon;
  const percent = Math.min(100, Math.round((achievement.current / achievement.target) * 100));
  const complete = achievement.current >= achievement.target;

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${getToneClasses(achievement.tone)}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <h4 className="font-black text-white">{achievement.title}</h4>
            {complete && <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />}
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{achievement.description}</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
          </div>
          <p className="mt-2 text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">
            {achievement.current}/{achievement.target}
          </p>
        </div>
      </div>
    </div>
  );
}

function HistoryRow({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <p className="font-black text-white">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

function PreviewModal({
  item,
  equipped,
  owned,
  credits,
  busy,
  onClose,
  onBuy,
  onEquip,
}: {
  item: StoreItem;
  equipped: any;
  owned: boolean;
  credits: number;
  busy: boolean;
  onClose: () => void;
  onBuy: () => void;
  onEquip: () => void;
}) {
  useEffect(() => {
    const previousOverflow =
      document.body.style.overflow;

    const previousPaddingRight =
      document.body.style.paddingRight;

    const scrollbarWidth =
      window.innerWidth -
      document.documentElement.clientWidth;

    document.body.style.overflow =
      "hidden";

    if (scrollbarWidth > 0) {
      document.body.style.paddingRight =
        `${scrollbarWidth}px`;
    }

    const handleKeyDown =
      (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          onClose();
        }
      };

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      document.body.style.paddingRight =
        previousPaddingRight;

      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [onClose]);

  const rarity = getRarityStyle(item.rarity);
  const soldOut =
    item.stock !== null &&
    item.stock !== undefined &&
    item.stock <= 0;

  const canBuy =
    !item.locked &&
    !owned &&
    item.purchasable !== false &&
    !soldOut &&
    credits >= item.price;
  const insufficient =
    !item.locked &&
    !owned &&
    item.purchasable !== false &&
    !soldOut &&
    credits < item.price;

  const previewFrame =
    item.category === "MOLDURAS"
      ? item
      : getItemById(equipped?.frame) || getItemById("frame-green");

  const previewBackground =
    item.category === "FUNDOS"
      ? item
      : getItemById(equipped?.background) || getItemById("bg-command");

  const previewTitle =
    item.category === "TITULOS" ? item : getItemById(equipped?.title);

  const isEquipable = Boolean(getEquipSlot(item));
  const isGlobalTheme =
    item.category ===
    "TEMAS";

  function compareWithEquippedTheme() {
    if (!isGlobalTheme) {
      return;
    }

    window.dispatchEvent(
      new CustomEvent(
        "gnr:theme-preview-clear",
      ),
    );

    window.setTimeout(
      () => {
        window.dispatchEvent(
          new CustomEvent(
            "gnr:theme-preview",
            {
              detail: {
                themeId:
                  item.id,
              },
            },
          ),
        );
      },
      1800,
    );
  }

  const impactItems =
    getThemeImpact(item);

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      data-store-preview-modal
      role="dialog"
      aria-modal="true"
      aria-label={`Pré-visualização de ${item.name}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-[999999] overflow-y-auto overflow-x-hidden bg-black/92 p-3 backdrop-blur-2xl md:p-5"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.22 }}
        className="theme-modal relative mx-auto my-3 w-full max-w-[1180px] overflow-hidden rounded-[2.2rem] border border-white/10 shadow-[0_40px_180px_rgba(0,0,0,0.85)] md:my-5"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-40 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/70 text-white backdrop-blur-md transition-all hover:bg-white/10"
          aria-label="Fechar pré-visualização"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="relative min-h-[500px] overflow-hidden p-5 sm:p-7 xl:min-h-[620px]">
            {previewBackground?.image && (
              <>
                <img
                  src={previewBackground.image}
                  alt={previewBackground.name}
                  className="absolute inset-0 h-full w-full object-cover opacity-60"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/92 via-black/58 to-black/78" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#050b09] via-[#050b09]/20 to-black/35" />
              </>
            )}

            <div className="absolute inset-0 cyber-grid-soft opacity-20" />
            <div className="absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-primary/15 blur-[120px]" />
            <div className="absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-yellow-500/10 blur-[120px]" />

            <div className="relative flex h-full min-w-0 flex-col justify-center xl:pr-2">
              <div className="mb-6 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-primary backdrop-blur-md">
                  <Shield className="h-4 w-4" />
                  Pré-visualização ao vivo
                </span>

                <span className={`rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] backdrop-blur-md ${rarity.className}`}>
                  {rarity.label}
                </span>

                {isGlobalTheme && (
                  <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-primary backdrop-blur-md">
                    Tema global
                  </span>
                )}
              </div>

              <div className="mx-auto w-full max-w-[700px] rounded-[2.2rem] border border-white/10 bg-black/25 p-5 shadow-[0_0_80px_rgba(0,0,0,0.35)] backdrop-blur-md sm:p-7">
                <div className="flex flex-col items-center gap-6 md:flex-row md:items-center md:justify-center">
                  <div className="relative h-52 w-52 shrink-0 sm:h-60 sm:w-60 xl:h-64 xl:w-64">
                    <div className="absolute left-[20%] top-[19%] z-10 h-[60%] w-[60%] overflow-hidden rounded-full bg-black shadow-[0_0_45px_rgba(0,0,0,0.85)]">
                      <img
                        src="/Store/preview-avatar.png"
                        alt="Avatar preview"
                        className="h-full w-full object-cover"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                      <div className="flex h-full w-full items-center justify-center text-3xl font-black text-white">
                        GNR
                      </div>
                    </div>

                    {previewFrame?.image && (
                      <img
                        src={previewFrame.image}
                        alt={previewFrame.name}
                        className="absolute inset-0 z-20 h-full w-full object-contain drop-shadow-[0_0_35px_rgba(0,0,0,0.75)]"
                      />
                    )}
                  </div>

                  <div className="min-w-0 text-center md:text-left">
                    <p className="text-[10px] font-black uppercase tracking-[0.26em] text-primary">
                      Perfil Operacional
                    </p>

                    <h3 className="mt-3 max-w-full text-4xl font-black leading-[0.95] tracking-tight text-white sm:text-5xl">
                      02 | Smurf Oliveira
                    </h3>

                    <div className="mt-5 flex flex-wrap justify-center gap-2 md:justify-start">
                      <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-black text-primary">
                        Tenente General
                      </span>
                      <span className="rounded-full border border-white/10 bg-black/35 px-3 py-1 text-xs font-bold text-muted-foreground">
                        Patrulha
                      </span>
                      {previewTitle && (
                        <span className="rounded-full border border-yellow-400/25 bg-yellow-500/10 px-3 py-1 text-xs font-black text-yellow-400">
                          {previewTitle.name.replace("Título: ", "")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mx-auto mt-5 grid w-full max-w-[700px] grid-cols-1 gap-3 sm:grid-cols-3">
                <PreviewStat label="Moldura" value={previewFrame?.name || "Padrão"} />
                <PreviewStat label="Fundo" value={previewBackground?.name || "Padrão"} />
                <PreviewStat label="Tipo" value={item.category} />
              </div>
            </div>
          </div>

          <aside className="theme-sidebar border-t border-white/10 p-6 xl:border-l xl:border-t-0 xl:p-7">
            {isGlobalTheme && (
              <div className="mb-5 rounded-2xl border border-primary/20 bg-primary/[.07] p-4">
                <p className="text-[8px] font-black uppercase tracking-[.18em] text-primary">
                  Pré-visualização global ativa
                </p>

                <p className="mt-2 text-xs leading-5 text-white/50">
                  Este tema está temporariamente aplicado à Central inteira: fundo, sidebar, topbar, cartões, inputs, modais e player. Fecha para repor o tema equipado.
                </p>

                <button
                  type="button"
                  onClick={compareWithEquippedTheme}
                  className="mt-3 w-full rounded-xl border border-white/10 bg-white/[.035] px-3 py-2 text-[8px] font-black uppercase tracking-[.14em] text-white/55 transition hover:border-primary/25 hover:text-primary"
                >
                  Comparar com atual
                </button>

                <div className="mt-3 grid grid-cols-2 gap-2 text-[8px] font-black uppercase tracking-[.12em] text-white/35">
                  <span className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">Fundo global</span>
                  <span className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">Navegação</span>
                  <span className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">Painéis</span>
                  <span className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">Player</span>
                </div>
              </div>
            )}

            <div className="mb-5 flex flex-wrap gap-2 pr-12 lg:pr-0">
              <span className={`rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-[0.14em] ${rarity.className}`}>
                {rarity.label}
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                {item.category}
              </span>
              {item.limited && (
                <span className="rounded-full border border-red-400/25 bg-red-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-red-300">
                  Limitado
                </span>
              )}
            </div>

            <h2 className="text-3xl font-black leading-tight text-white">
              {item.name}
            </h2>

            <p className="mt-3 text-base font-black leading-7 text-white/75">
              {tagline}
            </p>

            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              {item.description}
            </p>

            <div className="mt-5 rounded-2xl border border-primary/15 bg-primary/[0.06] p-4">
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-primary">
                Ideal para
              </p>
              <p className="mt-2 text-sm leading-6 text-white/55">
                {bestFor}
              </p>
            </div>

            <div className="mt-5">
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                O que oferece
              </p>

              <div className="mt-3 space-y-2">
                {(isGlobalTheme ? impactItems : features).map(
                  (feature) => (
                    <div
                      key={feature}
                      className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.025] px-3 py-2"
                    >
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                      <span className="text-xs font-bold text-white/55">
                        {feature}
                      </span>
                    </div>
                  ),
                )}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {tags.map(
                (tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-white/35"
                  >
                    {tag}
                  </span>
                ),
              )}
            </div>

            {item.requirement && (
              <p className="mt-4 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300">
                {item.requirement}
              </p>
            )}

            <div className="mt-6 rounded-2xl border border-yellow-400/20 bg-yellow-500/10 p-5">
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-muted-foreground">Preço</p>
              <p className="mt-1 flex items-center gap-2 text-3xl font-black text-yellow-400">
                <Coins className="h-6 w-6" />
                {item.price}
              </p>
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                Estado
              </p>
              <p className="mt-2 text-sm font-bold text-white">
                {owned ? "Já tens este item no inventário." : isEquipable ? "Pode ser comprado e equipado no perfil." : "Item cosmético de coleção."}
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              {busy ? (
                <button type="button" disabled className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-4 text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  A processar
                </button>
              ) : owned ? (
                <button type="button" onClick={onEquip} className="rounded-2xl bg-primary px-4 py-4 text-[10px] font-black uppercase tracking-[0.14em] text-black transition-all hover:-translate-y-0.5">
                  Equipar agora
                </button>
              ) : item.locked ? (
                <button type="button" disabled className="rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-4 text-[10px] font-black uppercase tracking-[0.14em] text-red-400">
                  Bloqueado
                </button>
              ) : insufficient ? (
                <button type="button" disabled className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-4 text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                  Sem créditos suficientes
                </button>
              ) : canBuy ? (
                <button type="button" onClick={onBuy} className="rounded-2xl bg-yellow-400 px-4 py-4 text-[10px] font-black uppercase tracking-[0.14em] text-black transition-all hover:-translate-y-0.5">
                  Comprar e equipar
                </button>
              ) : null}

              <button type="button" onClick={onClose} className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-4 text-[10px] font-black uppercase tracking-[0.14em] text-white transition-all hover:bg-white/[0.07]">
                Fechar
              </button>
            </div>
          </aside>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}

function PreviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-black/35 p-3 backdrop-blur-md">
      <p className="text-[8px] font-black uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-xs font-black text-white">{value}</p>
    </div>
  );
}
