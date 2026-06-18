import { Router } from "express";
import mongoose from "mongoose";
import {
  AuditLog,
} from "../models";
import StoreInventory from "../models/StoreInventory";
import StoreTransaction from "../models/StoreTransaction";
import StorePurchaseLog from "../models/StorePurchaseLog";
import StoreProduct from "../models/StoreProduct";
import fs from "node:fs/promises";
import path from "node:path";
import { STORE_CATALOG_150 } from "../data/storeCatalog150";
import { MEGA_STORE_PRODUCTS } from "../data/storeCatalogMega";
import { FINAL_STORE_ASSETS, findFinalStoreAsset } from "../data/finalStoreAssets";

const router = Router();

/**
 * ============================================================
 * CONFIGURAÇÃO
 * ============================================================
 */

const COMMAND_GENERAL_ROLE_ID = "1147878942099906672";
const DEV_USER_ID = "713719718091030599";

const DISCORD_TOKEN =
  process.env["TOKEN"] ||
  process.env["DISCORD_TOKEN"] ||
  "";

const DISCORD_GUILD_ID = (
  process.env["GUILD_IDS"] ||
  process.env["DISCORD_GUILD_ID"] ||
  ""
)
  .split(",")[0]
  .trim();

/**
 * Coloca estes IDs no .env:
 *
 * STORE_ROLE_NIC=
 * STORE_ROLE_UNT=
 * STORE_ROLE_GIOE=
 * STORE_ROLE_USHE=
 * STORE_ROLE_DI=
 * STORE_ROLE_FOUNDER=
 */
const STORE_ROLE_IDS = {
  NIC: process.env["STORE_ROLE_NIC"] || "",
  UNT: process.env["STORE_ROLE_UNT"] || "",
  GIOE: process.env["STORE_ROLE_GIOE"] || "",
  USHE: process.env["STORE_ROLE_USHE"] || "",
  DI: process.env["STORE_ROLE_DI"] || "",
  FOUNDER: process.env["STORE_ROLE_FOUNDER"] || "",
  COMMAND_GENERAL: COMMAND_GENERAL_ROLE_ID,
} as const;

type StoreRoleKey = keyof typeof STORE_ROLE_IDS;

type StoreCategory =
  | "MOLDURAS"
  | "EMBLEMAS"
  | "FUNDOS"
  | "TITULOS"
  | "TEMAS"
  | "COLECOES"
  | "SOCIAL"
  | "EXCLUSIVOS";

type EquipSlot =
  | "frame"
  | "background"
  | "title"
  | "theme"
  | "badges";

type StoreItem = {
  id: string;
  name: string;
  description: string;
  category: StoreCategory;
  price: number;
  equipSlot?: EquipSlot;
  maxEquipped?: number;
  requiredRoleKeys?: StoreRoleKey[];
  purchasable?: boolean;
  stock?: number | null;
  soldCount?: number;
  limited?: boolean;
  rarity?:
    | "COMUM"
    | "RARO"
    | "EPICO"
    | "LENDARIO"
    | "EXCLUSIVO"
    | "INSTITUCIONAL";
  image?: string | null;
  collection?: string | null;
  featured?: boolean;
  discount?: number;
  active?: boolean;
  previewRoute?: string | null;
  sortOrder?: number;
  socialType?:
    | "MURAL_BACKGROUND"
    | "COMMENT_STYLE"
    | "SIGNATURE"
    | "REACTION_PACK"
    | "SOCIAL_BADGE"
    | "HIGHLIGHT_STYLE"
    | "ENTRY_EFFECT";
};

type StoreBundle = {
  id: string;
  name: string;
  description: string;
  itemIds: string[];
  price: number;
  oldPrice: number;
  requiredRoleKeys?: StoreRoleKey[];
};

type StoreMission = {
  id: string;
  name: string;
  description: string;
  reward: number;
  target: number;
  progressType:
    | "OWNED_ITEMS"
    | "EQUIPPED_ITEMS"
    | "LEGENDARY_ITEMS"
    | "PURCHASES";
};

/**
 * ============================================================
 * MODELOS AUXILIARES
 * ============================================================
 *
 * Estes modelos são criados aqui para não obrigar já a criar
 * novos ficheiros.
 */

const storeFavoriteSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },

    itemId: {
      type: String,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

storeFavoriteSchema.index(
  {
    userId: 1,
    itemId: 1,
  },
  {
    unique: true,
  },
);

const StoreFavorite =
  mongoose.models.StoreFavorite ||
  mongoose.model(
    "StoreFavorite",
    storeFavoriteSchema,
  );

const storeMissionClaimSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },

    missionId: {
      type: String,
      required: true,
      index: true,
    },

    reward: {
      type: Number,
      required: true,
      min: 0,
    },

    claimedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

storeMissionClaimSchema.index(
  {
    userId: 1,
    missionId: 1,
  },
  {
    unique: true,
  },
);

const StoreMissionClaim =
  mongoose.models.StoreMissionClaim ||
  mongoose.model(
    "StoreMissionClaim",
    storeMissionClaimSchema,
  );

/**
 * ============================================================
 * PRODUTOS
 * ============================================================
 */

const STORE_ITEMS: StoreItem[] = [
  {
    id: "frame-green",
    name: "Moldura Operacional",
    description:
      "Moldura institucional base da Guarda Nacional Republicana.",
    category: "MOLDURAS",
    price: 150,
    equipSlot: "frame",
  },
  {
    id: "frame-gold",
    name: "Moldura Mérito Dourado",
    description:
      "Moldura dourada destinada a militares distinguidos.",
    category: "MOLDURAS",
    price: 750,
    equipSlot: "frame",
  },
  {
    id: "frame-command",
    name: "Moldura Comando-Geral",
    description:
      "Moldura premium reservada ao Comando-Geral.",
    category: "MOLDURAS",
    price: 2500,
    equipSlot: "frame",
    requiredRoleKeys: ["COMMAND_GENERAL"],
    limited: true,
  },
  {
    id: "frame-nic",
    name: "Moldura NIC — Investigação",
    description:
      "Moldura exclusiva para elementos do NIC.",
    category: "MOLDURAS",
    price: 900,
    equipSlot: "frame",
    requiredRoleKeys: ["NIC"],
  },
  {
    id: "frame-unt",
    name: "Moldura UNT — Trânsito",
    description:
      "Moldura exclusiva para elementos da UNT.",
    category: "MOLDURAS",
    price: 650,
    equipSlot: "frame",
    requiredRoleKeys: ["UNT"],
  },
  {
    id: "frame-gioe",
    name: "Moldura GIOE — Intervenção",
    description:
      "Moldura tática reservada aos elementos do GIOE.",
    category: "MOLDURAS",
    price: 1400,
    equipSlot: "frame",
    requiredRoleKeys: ["GIOE"],
    limited: true,
  },
  {
    id: "frame-ushe",
    name: "Moldura USHE — Honras",
    description:
      "Moldura cerimonial reservada aos elementos da USHE.",
    category: "MOLDURAS",
    price: 950,
    equipSlot: "frame",
    requiredRoleKeys: ["USHE"],
  },

  {
    id: "badge-nic",
    name: "Emblema Investigador Criminal",
    description:
      "Emblema institucional de investigação criminal.",
    category: "EMBLEMAS",
    price: 700,
    equipSlot: "badges",
    maxEquipped: 3,
    requiredRoleKeys: ["NIC"],
  },
  {
    id: "badge-unt",
    name: "Emblema Fiscalizador Nacional",
    description:
      "Emblema institucional de trânsito e fiscalização.",
    category: "EMBLEMAS",
    price: 520,
    equipSlot: "badges",
    maxEquipped: 3,
    requiredRoleKeys: ["UNT"],
  },
  {
    id: "badge-gioe",
    name: "Emblema Operações Especiais",
    description:
      "Emblema tático de operações especiais.",
    category: "EMBLEMAS",
    price: 1350,
    equipSlot: "badges",
    maxEquipped: 3,
    requiredRoleKeys: ["GIOE"],
  },
  {
    id: "badge-ushe",
    name: "Emblema Honras de Estado",
    description:
      "Emblema cerimonial de representação e prestígio.",
    category: "EMBLEMAS",
    price: 800,
    equipSlot: "badges",
    maxEquipped: 3,
    requiredRoleKeys: ["USHE"],
  },
  {
    id: "badge-di",
    name: "Emblema Disciplina e Inspeção",
    description:
      "Emblema de rigor, supervisão e controlo interno.",
    category: "EMBLEMAS",
    price: 750,
    equipSlot: "badges",
    maxEquipped: 3,
    requiredRoleKeys: ["DI"],
  },
  {
    id: "badge-veteran",
    name: "Emblema Veterano",
    description:
      "Emblema de experiência e antiguidade.",
    category: "EMBLEMAS",
    price: 350,
    equipSlot: "badges",
    maxEquipped: 3,
  },
  {
    id: "badge-honor",
    name: "Emblema de Honra",
    description:
      "Emblema destinado a militares distinguidos.",
    category: "EMBLEMAS",
    price: 650,
    equipSlot: "badges",
    maxEquipped: 3,
  },
  {
    id: "badge-night",
    name: "Patrulheiro Noturno",
    description:
      "Emblema de serviço operacional noturno.",
    category: "EMBLEMAS",
    price: 420,
    equipSlot: "badges",
    maxEquipped: 3,
  },

  {
    id: "bg-command",
    name: "Fundo Comando Central",
    description:
      "Fundo premium de liderança e comando.",
    category: "FUNDOS",
    price: 800,
    equipSlot: "background",
  },
  {
    id: "bg-nic",
    name: "Fundo NIC — Investigação Criminal",
    description:
      "Fundo premium de investigação criminal.",
    category: "FUNDOS",
    price: 1200,
    equipSlot: "background",
    requiredRoleKeys: ["NIC"],
  },
  {
    id: "bg-unt",
    name: "Fundo UNT — Trânsito",
    description:
      "Fundo de trânsito, fiscalização e mobilidade.",
    category: "FUNDOS",
    price: 1100,
    equipSlot: "background",
    requiredRoleKeys: ["UNT"],
  },
  {
    id: "bg-tactical",
    name: "Fundo GIOE — Operação Tática",
    description:
      "Fundo tático de intervenção e alto risco.",
    category: "FUNDOS",
    price: 1400,
    equipSlot: "background",
    requiredRoleKeys: ["GIOE"],
  },
  {
    id: "bg-ceremony",
    name: "Fundo USHE — Honras de Estado",
    description:
      "Fundo cerimonial de representação institucional.",
    category: "FUNDOS",
    price: 1200,
    equipSlot: "background",
    requiredRoleKeys: ["USHE"],
  },

  {
    id: "title-elite",
    name: "Título: Patrulheiro de Elite",
    description:
      "Título de destaque operacional.",
    category: "TITULOS",
    price: 500,
    equipSlot: "title",
  },
  {
    id: "title-guardian",
    name: "Título: Guardião da Central",
    description:
      "Título premium de dedicação à Central.",
    category: "TITULOS",
    price: 900,
    equipSlot: "title",
  },
  {
    id: "title-investigator",
    name: "Título: Investigador Nato",
    description:
      "Título exclusivo de investigação criminal.",
    category: "TITULOS",
    price: 850,
    equipSlot: "title",
    requiredRoleKeys: ["NIC"],
  },
  {
    id: "title-fiscalizador",
    name: "Título: Fiscalizador Nacional",
    description:
      "Título exclusivo da Unidade Nacional de Trânsito.",
    category: "TITULOS",
    price: 750,
    equipSlot: "title",
    requiredRoleKeys: ["UNT"],
  },
  {
    id: "title-tactical",
    name: "Título: Operacional de Elite",
    description:
      "Título exclusivo de intervenção tática.",
    category: "TITULOS",
    price: 1300,
    equipSlot: "title",
    requiredRoleKeys: ["GIOE"],
  },
  {
    id: "title-honor",
    name: "Título: Honra e Dever",
    description:
      "Título cerimonial de honra e representação.",
    category: "TITULOS",
    price: 800,
    equipSlot: "title",
    requiredRoleKeys: ["USHE"],
  },

  {
    id: "theme-green",
    name: "Tema Verde GNR",
    description:
      "Tema institucional clássico.",
    category: "TEMAS",
    price: 250,
    equipSlot: "theme",
  },
  {
    id: "theme-blue",
    name: "Tema Investigação Azul",
    description:
      "Tema visual azul de investigação.",
    category: "TEMAS",
    price: 500,
    equipSlot: "theme",
  },
  {
    id: "theme-cyan",
    name: "Tema Trânsito Ciano",
    description:
      "Tema visual ciano de trânsito.",
    category: "TEMAS",
    price: 500,
    equipSlot: "theme",
  },
  {
    id: "theme-purple",
    name: "Tema Elite Roxo",
    description:
      "Tema especial de perfil premium.",
    category: "TEMAS",
    price: 850,
    equipSlot: "theme",
  },
  {
    id: "theme-red",
    name: "Tema GIOE Vermelho",
    description: "Tema tático vermelho de intervenção especial.",
    category: "TEMAS",
    price: 900,
    equipSlot: "theme",
  },
  {
    id: "theme-gold",
    name: "Tema Escola Dourado",
    description: "Tema cerimonial dourado da Escola da Guarda.",
    category: "TEMAS",
    price: 800,
    equipSlot: "theme",
  },
  {
    id: "theme-orange",
    name: "Tema Operacional Laranja",
    description: "Tema energético de operações e alertas.",
    category: "TEMAS",
    price: 650,
    equipSlot: "theme",
  },
  {
    id: "theme-rose",
    name: "Tema Comando Rosa",
    description: "Tema premium moderno com brilho rosa.",
    category: "TEMAS",
    price: 950,
    equipSlot: "theme",
  },
  {
    id: "theme-slate",
    name: "Tema Tático Cinzento",
    description: "Tema discreto, militar e minimalista.",
    category: "TEMAS",
    price: 600,
    equipSlot: "theme",
  },
  {
    id: "theme-white",
    name: "Tema Cerimonial Branco",
    description: "Tema elegante de honra e representação.",
    category: "TEMAS",
    price: 1100,
    equipSlot: "theme",
  },

  {
    id: "collection-nic",
    name: "Coleção NIC",
    description:
      "Coleção completa de investigação criminal.",
    category: "COLECOES",
    price: 2600,
    requiredRoleKeys: ["NIC"],
  },
  {
    id: "collection-unt",
    name: "Coleção UNT",
    description:
      "Coleção completa de trânsito e fiscalização.",
    category: "COLECOES",
    price: 2400,
    requiredRoleKeys: ["UNT"],
  },
  {
    id: "collection-gioe",
    name: "Coleção GIOE",
    description:
      "Coleção completa de intervenção e operações especiais.",
    category: "COLECOES",
    price: 3900,
    requiredRoleKeys: ["GIOE"],
  },
  {
    id: "collection-ushe",
    name: "Coleção USHE",
    description:
      "Coleção completa de honra e representação.",
    category: "COLECOES",
    price: 2800,
    requiredRoleKeys: ["USHE"],
  },

  {
    id: "exclusive-general",
    name: "Pacote Comando-Geral",
    description:
      "Pacote exclusivo reservado ao Comando-Geral.",
    category: "EXCLUSIVOS",
    price: 5000,
    requiredRoleKeys: ["COMMAND_GENERAL"],
    limited: true,
  },
  {
    id: "exclusive-founder",
    name: "Emblema Fundador",
    description:
      "Emblema reservado a membros fundadores.",
    category: "EXCLUSIVOS",
    price: 3000,
    equipSlot: "badges",
    maxEquipped: 3,
    requiredRoleKeys: ["FOUNDER"],
    limited: true,
  },

  {
    id: "mural-gioe-night",
    name: "Quartel Tático Noturno",
    description:
      "Fundo premium para o mural social inspirado em operações especiais.",
    category: "SOCIAL",
    price: 6500,
    socialType:
      "MURAL_BACKGROUND",
  },
  {
    id: "mural-paleto-sunset",
    name: "Paleto ao Pôr do Sol",
    description:
      "Paisagem premium para o mural social.",
    category: "SOCIAL",
    price: 4200,
    socialType:
      "MURAL_BACKGROUND",
  },
  {
    id: "mural-command-room",
    name: "Sala de Comando",
    description:
      "Fundo institucional de liderança e comando.",
    category: "SOCIAL",
    price: 8000,
    socialType:
      "MURAL_BACKGROUND",
    limited: true,
  },
  {
    id: "comment-carbon",
    name: "Comentário Carbono",
    description:
      "Estilo escuro e discreto para comentários.",
    category: "SOCIAL",
    price: 2200,
    socialType:
      "COMMENT_STYLE",
  },
  {
    id: "comment-gold-command",
    name: "Comentário Dourado",
    description:
      "Estilo institucional dourado para comentários.",
    category: "SOCIAL",
    price: 7000,
    socialType:
      "COMMENT_STYLE",
  },
  {
    id: "comment-neon-green",
    name: "Comentário Neon Guarda",
    description:
      "Estilo moderno em verde institucional.",
    category: "SOCIAL",
    price: 3900,
    socialType:
      "COMMENT_STYLE",
  },
  {
    id: "signature-honra-dever",
    name: "Assinatura Honra · Dever · Lealdade",
    description:
      "Assinatura institucional para comentários.",
    category: "SOCIAL",
    price: 3200,
    socialType:
      "SIGNATURE",
  },
  {
    id: "signature-operational",
    name: "Assinatura Sempre Operacional",
    description:
      "Assinatura social de presença operacional.",
    category: "SOCIAL",
    price: 1800,
    socialType:
      "SIGNATURE",
  },
  {
    id: "reaction-pack-gnr",
    name: "Pack de Reações GNR",
    description:
      "Reações Patrulha, Mérito, Águia e Comunicação.",
    category: "SOCIAL",
    price: 3500,
    socialType:
      "REACTION_PACK",
  },
  {
    id: "social-badge-veteran",
    name: "Emblema Social Veterano",
    description:
      "Emblema social apresentado nos comentários.",
    category: "SOCIAL",
    price: 6000,
    socialType:
      "SOCIAL_BADGE",
  },
  {
    id: "social-badge-leader",
    name: "Emblema Social Líder",
    description:
      "Emblema social de liderança.",
    category: "SOCIAL",
    price: 4200,
    socialType:
      "SOCIAL_BADGE",
  },
  {
    id: "highlight-official-document",
    name: "Destaque Documento Oficial",
    description:
      "Estilo premium para o comentário destacado.",
    category: "SOCIAL",
    price: 7500,
    socialType:
      "HIGHLIGHT_STYLE",
    limited: true,
  },
  {
    id: "effect-soft-glow",
    name: "Efeito Brilho Suave",
    description:
      "Efeito visual discreto para o mural social.",
    category: "SOCIAL",
    price: 2000,
    socialType:
      "ENTRY_EFFECT",
  },
];


const STORE_ITEM_IMAGE_FALLBACKS: Record<string, string> = {
  "badge-di": "/Store/badges/CG.png",
  "badge-gioe": "/Store/badges/GIOE.png",
  "badge-honor": "/Store/badges/MEDALHADO.png",
  "badge-nic": "/Store/badges/NIC.png",
  "badge-night": "/Store/badges/VETERANO.png",
  "badge-unt": "/Store/frames/UNT1_clean.png",
  "badge-ushe": "/Store/badges/MEDALHADO.png",
  "badge-veteran": "/Store/badges/VETERANO.png",
  "bg-ceremony": "/Store/backgrounds/EG.png",
  "bg-command": "/Store/backgrounds/CD.png",
  "bg-nic": "/Store/backgrounds/NIC.png",
  "bg-tactical": "/Store/backgrounds/GSA.png",
  "bg-unt": "/Store/backgrounds/patrulha.png",
  "collection-gioe": "/Store/badges/GIOE.png",
  "collection-nic": "/Store/badges/NIC.png",
  "collection-unt": "/Store/frames/UNT1_clean.png",
  "collection-ushe": "/Store/badges/MEDALHADO.png",
  "exclusive-founder": "/Store/badges/FUNDADOR.png",
  "exclusive-general": "/Store/badges/CG.png",
  "frame-command": "/Store/frames/CG1_clean.png",
  "frame-gioe": "/Store/frames/GIOE1_clean.png",
  "frame-gold": "/Store/frames/GNR1_clean.png",
  "frame-green": "/Store/frames/GNR1_clean.png",
  "frame-nic": "/Store/frames/NIC1_clean.png",
  "frame-unt": "/Store/frames/UNT1_clean.png",
  "frame-ushe": "/Store/frames/CG1_clean.png",
  "mural-command-room": "/Store/backgrounds/CD.png",
  "mural-gioe-night": "/Store/backgrounds/GIOE.png",
  "mural-paleto-sunset": "/Store/backgrounds/patrulha.png",
  "social-badge-leader": "/Store/badges/CG.png",
  "social-badge-veteran": "/Store/badges/VETERANO.png",
  "theme-blue": "/Store/badges/NIC.png",
  "theme-cyan": "/Store/frames/UNT1_clean.png",
  "theme-green": "/Store/frames/GNR1_clean.png",
  "theme-purple": "/Store/badges/FUNDADOR.png",
  "title-fiscalizador": "/Store/frames/UNT1_clean.png",
  "title-honor": "/Store/badges/MEDALHADO.png",
  "title-investigator": "/Store/badges/NIC.png",
  "title-tactical": "/Store/badges/GIOE.png",
};

/**
 * ============================================================
 * PACKS
 * ============================================================
 */

const STORE_BUNDLES: StoreBundle[] = [
  {
    id: "bundle-nic",
    name: "Pack NIC",
    description:
      "Moldura, emblema, título e tema de investigação.",
    itemIds: [
      "frame-nic",
      "badge-nic",
      "title-investigator",
      "theme-blue",
    ],
    price: 2550,
    oldPrice: 2950,
    requiredRoleKeys: ["NIC"],
  },
  {
    id: "bundle-unt",
    name: "Pack UNT",
    description:
      "Moldura, emblema, título e tema de trânsito.",
    itemIds: [
      "frame-unt",
      "badge-unt",
      "title-fiscalizador",
      "theme-cyan",
    ],
    price: 2200,
    oldPrice: 2420,
    requiredRoleKeys: ["UNT"],
  },
  {
    id: "bundle-gioe",
    name: "Pack GIOE",
    description:
      "Moldura, emblema, título e fundo tático.",
    itemIds: [
      "frame-gioe",
      "badge-gioe",
      "title-tactical",
      "bg-tactical",
    ],
    price: 5000,
    oldPrice: 5450,
    requiredRoleKeys: ["GIOE"],
  },
  {
    id: "bundle-command",
    name: "Pack Comando",
    description:
      "Moldura, fundo, título e emblema de comando.",
    itemIds: [
      "frame-command",
      "bg-command",
      "title-guardian",
      "badge-di",
    ],
    price: 4600,
    oldPrice: 4950,
    requiredRoleKeys: ["COMMAND_GENERAL"],
  },
];

/**
 * ============================================================
 * MISSÕES DA LOJA
 * ============================================================
 */

const STORE_MISSIONS: StoreMission[] = [
  {
    id: "store-first-collector",
    name: "Primeira Coleção",
    description:
      "Possui pelo menos 3 itens da loja.",
    reward: 150,
    target: 3,
    progressType: "OWNED_ITEMS",
  },
  {
    id: "store-collector",
    name: "Colecionador",
    description:
      "Possui pelo menos 5 itens da loja.",
    reward: 300,
    target: 5,
    progressType: "OWNED_ITEMS",
  },
  {
    id: "store-stylish",
    name: "Perfil Estiloso",
    description:
      "Equipa pelo menos 4 elementos cosméticos.",
    reward: 250,
    target: 4,
    progressType: "EQUIPPED_ITEMS",
  },
  {
    id: "store-legendary",
    name: "Colecionador de Elite",
    description:
      "Possui pelo menos um item exclusivo.",
    reward: 500,
    target: 1,
    progressType: "LEGENDARY_ITEMS",
  },
  {
    id: "store-buyer",
    name: "Cliente Frequente",
    description:
      "Realiza pelo menos 10 compras na loja.",
    reward: 400,
    target: 10,
    progressType: "PURCHASES",
  },
];


const EXTRA_SITE_THEMES = [
  {
    id: "theme-red",
    name: "Tema GIOE Vermelho",
    description: "Tema tático de alto risco para toda a Central.",
    category: "TEMAS",
    price: 900,
    equipSlot: "theme",
    rarity: "EPICO",
    image: null,
    active: true,
  },
  {
    id: "theme-gold",
    name: "Tema Escola Dourado",
    description: "Tema cerimonial da Escola da Guarda.",
    category: "TEMAS",
    price: 950,
    equipSlot: "theme",
    rarity: "EPICO",
    image: null,
    active: true,
  },
  {
    id: "theme-orange",
    name: "Tema Operacional Laranja",
    description: "Tema energético de ação e resposta rápida.",
    category: "TEMAS",
    price: 700,
    equipSlot: "theme",
    rarity: "RARO",
    image: null,
    active: true,
  },
  {
    id: "theme-pink",
    name: "Tema Comando Rosa",
    description: "Tema moderno e exclusivo.",
    category: "TEMAS",
    price: 850,
    equipSlot: "theme",
    rarity: "EPICO",
    image: null,
    active: true,
  },
  {
    id: "theme-slate",
    name: "Tema Tático Cinzento",
    description: "Tema discreto e operacional.",
    category: "TEMAS",
    price: 650,
    equipSlot: "theme",
    rarity: "RARO",
    image: null,
    active: true,
  },
  {
    id: "theme-white",
    name: "Tema Cerimonial Branco",
    description: "Tema claro, elegante e institucional.",
    category: "TEMAS",
    price: 1000,
    equipSlot: "theme",
    rarity: "LENDARIO",
    image: null,
    active: true,
  },
  {
    id: "theme-black-gold",
    name: "Tema Comando Preto & Ouro",
    description: "Tema premium de autoridade.",
    category: "TEMAS",
    price: 1400,
    equipSlot: "theme",
    rarity: "LENDARIO",
    image: null,
    active: true,
  },
  {
    id: "theme-ice",
    name: "Tema Gelo Operacional",
    description: "Tema azul-gelo moderno e tecnológico.",
    category: "TEMAS",
    price: 900,
    equipSlot: "theme",
    rarity: "EPICO",
    image: null,
    active: true,
  },
] as const;

/**
 * O backend corre dentro de api-server.
 * As imagens públicas da aplicação ficam no frontend:
 * gnr-central/public/Store/catalog
 */
const CATALOG_IMAGE_DIR =
  path.resolve(
    process.cwd(),
    "..",
    "gnr-central",
    "public",
    "Store",
    "catalog",
  );

let storeItemsCache: StoreItem[] =
  [...STORE_ITEMS];

let catalogReady = false;
let catalogLoading:
  Promise<void> | null =
  null;

function slugifyProductId(
  value: string,
) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function productToStoreItem(
  product: any,
): StoreItem {
  const raw =
    product?.toObject
      ? product.toObject()
      : product;

  return {
    id:
      String(raw.id),
    name:
      String(raw.name),
    description:
      String(
        raw.description || "",
      ),
    category:
      raw.category,
    price:
      Number(raw.price || 0),
    equipSlot:
      raw.equipSlot ||
      undefined,
    maxEquipped:
      raw.maxEquipped ||
      undefined,
    requiredRoleKeys:
      Array.isArray(
        raw.requiredRoleKeys,
      )
        ? raw.requiredRoleKeys
        : [],
    purchasable:
      raw.purchasable !==
      false,
    stock:
      raw.stock === null ||
      raw.stock === undefined
        ? null
        : Number(raw.stock),
    soldCount:
      Number(raw.soldCount || 0),
    limited:
      raw.limited ===
      true,
    rarity:
      raw.rarity ||
      "COMUM",
    image:
      raw.image ||
      null,
    collection:
      raw.collection ||
      null,
    featured:
      raw.featured ===
      true,
    discount:
      Number(
        raw.discount || 0,
      ),
    active:
      raw.active !==
      false,
    previewRoute:
      raw.previewRoute ||
      null,
    sortOrder:
      Number(
        raw.sortOrder || 0,
      ),
    socialType:
      raw.socialType ||
      undefined,
  };
}

async function refreshCatalogCache() {
  const products =
    await StoreProduct.find({
      active: true,
    })
      .sort({
        sortOrder: 1,
        createdAt: 1,
      })
      .lean();

  storeItemsCache =
    products.map(
      productToStoreItem,
    );
}


async function syncMegaStoreCatalog() {
  if (!MEGA_STORE_PRODUCTS.length) {
    return;
  }

  await StoreProduct.bulkWrite(
    MEGA_STORE_PRODUCTS.map((product: any) => ({
      updateOne: {
        filter: {
          id: product.id,
        },
        update: {
          $setOnInsert: {
            id: product.id,
            soldCount: 0,
            createdBy: "MEGA_STORE_IMPORT",
          },
          $set: {
            name: product.name,
            description: product.description,
            category: product.category,
            rarity: product.rarity,
            price: product.price,
            image: product.image,
            active: product.active !== false,
            purchasable: product.purchasable !== false,
            stock: product.stock ?? null,
            limited: Boolean(product.limited),
            featured: Boolean(product.featured),
            discount: Number(product.discount || 0),
            sortOrder: Number(product.sortOrder || 0),
            collection: product.collection || null,
            requiredRoleKeys: product.requiredRoleKeys || [],
            equipSlot: product.equipSlot || null,
            metadata: product.metadata || {},
            updatedBy: "MEGA_STORE_IMPORT",
          },
        },
        upsert: true,
        setDefaultsOnInsert: false,
      },
    })),
    {
      ordered: false,
    },
  );

  console.log(
    `[STORE MEGA] ${MEGA_STORE_PRODUCTS.length} produtos sincronizados.`,
  );
}

async function syncFinalStoreAssets() {
  for (const asset of FINAL_STORE_ASSETS) {
    const normalizedAliases = [asset.name, ...asset.aliases];

    const products = await StoreProduct.find({
      active: { $ne: false },
    }).lean();

    const matchingIds = products
      .filter((product: any) => {
        const match = findFinalStoreAsset(product);
        return match?.image === asset.image;
      })
      .map((product: any) => product._id);

    if (!matchingIds.length) {
      continue;
    }

    await StoreProduct.updateMany(
      { _id: { $in: matchingIds } },
      {
        $set: {
          image: asset.image,
          category: asset.category,
          equipSlot: asset.equipSlot,
          active: true,
          purchasable: true,
          updatedBy: "FINAL_STORE_ASSETS",
        },
      },
    );
  }
}

async function ensureCatalogReady() {
  if (catalogReady) {
    return;
  }

  if (catalogLoading) {
    return catalogLoading;
  }

  catalogLoading =
    (async () => {
      /*
       * Sincroniza TODOS os produtos em cada arranque.
       * A versão anterior só inseria STORE_ITEMS quando a coleção estava vazia.
       * Por isso, numa base de dados já existente, os novos fundos, molduras,
       * emblemas e restantes produtos nunca apareciam.
       */
      const completeCatalog = [
        ...STORE_ITEMS.map(
          (item, index) => ({
            ...item,
            rarity:
              item.rarity ||
              (item.limited
                ? "EXCLUSIVO"
                : "COMUM"),
            image:
              item.image ||
              STORE_ITEM_IMAGE_FALLBACKS[item.id] ||
              null,
            active:
              item.active !== false,
            purchasable:
              item.purchasable !== false,
            stock:
              item.stock ?? null,
            soldCount:
              item.soldCount || 0,
            limited:
              item.limited === true,
            featured:
              item.featured === true,
            discount:
              item.discount || 0,
            sortOrder:
              item.sortOrder ?? index,
            collection:
              item.collection || null,
          })),
        ...EXTRA_SITE_THEMES.map(
          (item, index) => ({
            ...item,
            purchasable: true,
            stock: null,
            soldCount: 0,
            limited: false,
            featured: true,
            discount: 0,
            sortOrder: 900 + index,
          })),
        ...STORE_CATALOG_150,
      ];

      const uniqueCatalog = [
        ...new Map(
          completeCatalog.map(
            (item) => [
              item.id,
              item,
            ],
          ),
        ).values(),
      ];

      await StoreProduct.bulkWrite(
        uniqueCatalog.map(
          (item: any) => ({
            updateOne: {
              filter: {
                id: item.id,
              },
              update: {
                $set: {
                  name: item.name,
                  description:
                    item.description || "",
                  category: item.category,
                  price:
                    Number(item.price || 0),
                  equipSlot:
                    item.equipSlot || null,
                  maxEquipped:
                    item.maxEquipped || null,
                  requiredRoleKeys:
                    Array.isArray(item.requiredRoleKeys)
                      ? item.requiredRoleKeys
                      : [],
                  purchasable:
                    item.purchasable !== false,
                  stock:
                    item.stock ?? null,
                  limited:
                    item.limited === true,
                  rarity:
                    item.rarity || "COMUM",
                  image:
                    item.image || null,
                  collection:
                    item.collection || null,
                  featured:
                    item.featured === true,
                  discount:
                    Number(item.discount || 0),
                  active:
                    item.active !== false,
                  previewRoute:
                    item.previewRoute || null,
                  sortOrder:
                    Number(item.sortOrder || 0),
                  socialType:
                    item.socialType || null,
                  updatedBy:
                    "SYSTEM_CATALOG_SYNC_150",
                },
                $setOnInsert: {
                  soldCount:
                    Number(item.soldCount || 0),
                  createdBy:
                    "SYSTEM_CATALOG_SYNC_150",
                },
              },
              upsert: true,
              setDefaultsOnInsert: false,
            },
          }),
        ),
        {
          ordered: false,
        },
      );

      await syncMegaStoreCatalog();
      await syncFinalStoreAssets();
      await refreshCatalogCache();
      catalogReady = true;
    })()
      .catch((error) => {
        catalogReady = false;
        throw error;
      })
      .finally(() => {
        catalogLoading = null;
      });

  return catalogLoading;
}

async function createStoreAudit(
  req: any,
  data: {
    action: string;
    severity?:
      | "info"
      | "success"
      | "warning"
      | "critical";
    description: string;
    targetId?: string | null;
    targetName?: string | null;
    metadata?: Record<string, any>;
  },
) {
  try {
    const current =
      getSessionUser(req);

    await AuditLog.create({
      actorId:
        getSessionUserId(req) ||
        "SYSTEM",
      actorName:
        current?.displayName ||
        current?.global_name ||
        current?.username ||
        "Sistema",
      actorRank:
        isCommandGeneral(req)
          ? "Comando-Geral"
          : null,
      action:
        data.action,
      module:
        "Loja",
      severity:
        data.severity ||
        "info",
      description:
        data.description,
      targetId:
        data.targetId ||
        null,
      targetName:
        data.targetName ||
        null,
      metadata:
        data.metadata ||
        {},
      ip:
        req.ip ||
        req.socket
          ?.remoteAddress ||
        null,
      userAgent:
        req.get?.(
          "user-agent",
        ) ||
        null,
    });
  } catch (error) {
    console.error(
      "[STORE AUDIT]",
      error,
    );
  }
}

/**
 * ============================================================
 * AUTENTICAÇÃO E PERMISSÕES
 * ============================================================
 */

function getSessionUser(req: any) {
  return req.session?.user || null;
}

function getSessionUserId(req: any) {
  return String(getSessionUser(req)?.id || "");
}

function getSessionRoles(req: any): string[] {
  const roles = getSessionUser(req)?.roles;

  if (!Array.isArray(roles)) {
    return [];
  }

  return roles.map(String);
}

function requireAuth(req: any, res: any) {
  const userId = getSessionUserId(req);

  if (!userId) {
    res.status(401).json({
      error: "Não autenticado.",
    });

    return null;
  }

  return userId;
}

function isCommandGeneral(req: any) {
  const userId = getSessionUserId(req);
  const roles = getSessionRoles(req);

  return (
    userId === DEV_USER_ID ||
    roles.includes(COMMAND_GENERAL_ROLE_ID)
  );
}

function requireCommandGeneral(req: any, res: any) {
  if (!isCommandGeneral(req)) {
    res.status(403).json({
      error:
        "Apenas o Comando-Geral pode executar esta ação.",
    });

    return false;
  }

  return true;
}

async function fetchDiscordMemberRoles(
  userId: string,
): Promise<string[]> {
  if (!DISCORD_TOKEN || !DISCORD_GUILD_ID) {
    return [];
  }

  try {
    const response = await fetch(
      `https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members/${userId}`,
      {
        headers: {
          Authorization: `Bot ${DISCORD_TOKEN}`,
        },
      },
    );

    if (!response.ok) {
      return [];
    }

    const member = (await response.json()) as {
      roles?: string[];
    };

    return Array.isArray(member.roles)
      ? member.roles.map(String)
      : [];
  } catch (error) {
    console.error(
      "[STORE] Erro ao consultar roles Discord:",
      error,
    );

    return [];
  }
}

function resolveRequiredRoleIds(
  roleKeys?: StoreRoleKey[],
) {
  if (!roleKeys?.length) {
    return [];
  }

  return roleKeys
    .map((roleKey) => STORE_ROLE_IDS[roleKey])
    .filter(Boolean);
}

function canAccessRestrictedProduct(
  userId: string,
  userRoles: string[],
  roleKeys?: StoreRoleKey[],
) {
  if (
    userId === DEV_USER_ID ||
    userRoles.includes(COMMAND_GENERAL_ROLE_ID)
  ) {
    return true;
  }

  if (!roleKeys?.length) {
    return true;
  }

  const requiredRoleIds =
    resolveRequiredRoleIds(roleKeys);

  /**
   * Falha fechada:
   * se uma role necessária não estiver configurada no .env,
   * o produto fica bloqueado.
   */
  if (requiredRoleIds.length === 0) {
    return false;
  }

  return requiredRoleIds.some((roleId) =>
    userRoles.includes(roleId),
  );
}

/**
 * ============================================================
 * FUNÇÕES AUXILIARES
 * ============================================================
 */

function getStoreItem(itemId: string) {
  return (
    storeItemsCache.find(
      (item) =>
        item.id ===
        itemId,
    ) ||
    null
  );
}

function getStoreBundle(bundleId: string) {
  return (
    STORE_BUNDLES.find(
      (bundle) => bundle.id === bundleId,
    ) || null
  );
}

function getStoreMission(missionId: string) {
  return (
    STORE_MISSIONS.find(
      (mission) => mission.id === missionId,
    ) || null
  );
}

async function getOrCreateInventory(userId: string) {
  let inventory = await StoreInventory.findOne({
    userId,
  });

  if (!inventory) {
    inventory = await StoreInventory.create({
      userId,
      credits: 500,
      ownedItems: [
        "frame-green",
        "theme-green",
      ],
      equipped: {
        frame: "frame-green",
        background: null,
        title: null,
        theme: "theme-green",
        badges: [],
      },
    });
  }

  return inventory;
}

function normalizeInventory(inventory: any) {
  return {
    userId: inventory.userId,
    credits: Number(inventory.credits || 0),

    ownedItems: Array.isArray(inventory.ownedItems)
      ? inventory.ownedItems
      : [],

    equipped: {
      frame: inventory.equipped?.frame || null,
      background:
        inventory.equipped?.background || null,
      title: inventory.equipped?.title || null,
      theme: inventory.equipped?.theme || null,
      badges: Array.isArray(
        inventory.equipped?.badges,
      )
        ? inventory.equipped.badges
        : [],
    },

    lastCalculatedAt:
      inventory.lastCalculatedAt || null,

    updatedAt: inventory.updatedAt || null,
  };
}

function countEquippedItems(inventory: any) {
  const equipped = inventory?.equipped || {};

  return (
    Number(Boolean(equipped.frame)) +
    Number(Boolean(equipped.background)) +
    Number(Boolean(equipped.title)) +
    Number(Boolean(equipped.theme)) +
    (Array.isArray(equipped.badges)
      ? equipped.badges.length
      : 0)
  );
}

async function createTransaction(data: {
  userId: string;
  type:
    | "BUY"
    | "EQUIP"
    | "UNEQUIP"
    | "CREDITS_ADD"
    | "CREDITS_REMOVE"
    | "GIFT"
    | "MISSION_REWARD"
    | "REFUND";
  itemId?: string | null;
  amount: number;
  beforeCredits: number;
  afterCredits: number;
  reason: string;
  createdBy: string;
  metadata?: Record<string, any>;
}) {
  try {
    await StoreTransaction.create({
      userId: data.userId,
      type: data.type,
      itemId: data.itemId || null,
      amount: data.amount,
      beforeCredits: data.beforeCredits,
      afterCredits: data.afterCredits,
      reason: data.reason,
      createdBy: data.createdBy,
      metadata: data.metadata || {},
    });
  } catch (error) {
    console.error(
      "[STORE] Erro ao criar transação:",
      error,
    );
  }
}

async function createPurchaseLog(data: {
  userId: string;
  itemId: string;
  action: "BOUGHT" | "EQUIPPED" | "UNEQUIPPED";
  metadata?: Record<string, unknown>;
}) {
  try {
    await StorePurchaseLog.create({
      userId: data.userId,
      itemId: data.itemId,
      action: data.action,
      metadata: data.metadata || {},
    });
  } catch (error) {
    console.error(
      "[STORE] Erro ao criar log de compra:",
      error,
    );
  }
}

function sanitizeLimit(value: unknown, fallback = 50) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(parsed, 1), 200);
}

async function calculateMissionProgress(
  userId: string,
  inventory: any,
  mission: StoreMission,
) {
  const ownedItems = Array.isArray(
    inventory.ownedItems,
  )
    ? inventory.ownedItems
    : [];

  if (mission.progressType === "OWNED_ITEMS") {
    return ownedItems.length;
  }

  if (mission.progressType === "EQUIPPED_ITEMS") {
    return countEquippedItems(inventory);
  }

  if (mission.progressType === "LEGENDARY_ITEMS") {
    return ownedItems.filter((itemId: string) => {
      const item = getStoreItem(itemId);

      return (
        item?.category === "EXCLUSIVOS" ||
        item?.limited === true
      );
    }).length;
  }

  if (mission.progressType === "PURCHASES") {
    return StoreTransaction.countDocuments({
      userId,
      type: "BUY",
    });
  }

  return 0;
}

/**
 * ============================================================
 * CATÁLOGO
 * ============================================================
 */


const STORE_LOW_STOCK_THRESHOLD = Number(
  process.env.STORE_LOW_STOCK_THRESHOLD || 5,
);

const MAX_CREDIT_ADJUSTMENT = Number(
  process.env.STORE_MAX_CREDIT_ADJUSTMENT || 100000,
);

async function resolveStoreUsers(
  userIds: string[],
) {
  const ids = [
    ...new Set(
      userIds.map(String).filter(Boolean),
    ),
  ];

  if (!ids.length) {
    return new Map<string, any>();
  }

  try {
    const users = await mongoose.connection.db
      ?.collection("users")
      .find({
        discordId: { $in: ids },
      })
      .project({
        discordId: 1,
        warName: 1,
        displayName: 1,
        username: 1,
        avatarUrl: 1,
        badgeNumber: 1,
        callsignNumber: 1,
      })
      .toArray();

    return new Map(
      (users || []).map((user: any) => [
        String(user.discordId),
        {
          userId: String(user.discordId),
          name:
            user.warName ||
            user.displayName ||
            user.username ||
            String(user.discordId),
          avatarUrl: user.avatarUrl || null,
          badgeNumber: user.badgeNumber || null,
          callsignNumber: user.callsignNumber || null,
        },
      ]),
    );
  } catch (error) {
    console.error("[STORE USERS]", error);
    return new Map<string, any>();
  }
}

async function calculateReconciliation(
  userId: string,
  inventory?: any,
) {
  const currentInventory =
    inventory ||
    (await StoreInventory.findOne({ userId }).lean());

  if (!currentInventory) {
    return {
      userId,
      currentCredits: 0,
      expectedCredits: 0,
      difference: 0,
      status: "OK" as const,
      startingCredits: 0,
      transactionCount: 0,
      chainErrors: [],
    };
  }

  const transactions = await StoreTransaction.find({
    userId,
  })
    .sort({ createdAt: 1, _id: 1 })
    .lean();

  const currentCredits = Number(
    currentInventory.credits || 0,
  );

  if (!transactions.length) {
    return {
      userId,
      currentCredits,
      expectedCredits: currentCredits,
      difference: 0,
      status: "OK" as const,
      startingCredits: currentCredits,
      transactionCount: 0,
      chainErrors: [],
    };
  }

  const startingCredits = Number(
    transactions[0].beforeCredits || 0,
  );

  const expectedCredits = transactions.reduce(
    (total: number, transaction: any) =>
      total + Number(transaction.amount || 0),
    startingCredits,
  );

  const chainErrors: any[] = [];
  let previousAfter = startingCredits;

  transactions.forEach((transaction: any, index: number) => {
    const before = Number(transaction.beforeCredits || 0);
    const after = Number(transaction.afterCredits || 0);
    const amount = Number(transaction.amount || 0);

    if (index > 0 && before !== previousAfter) {
      chainErrors.push({
        transactionId: String(transaction._id),
        expectedBefore: previousAfter,
        actualBefore: before,
      });
    }

    if (after !== before + amount) {
      chainErrors.push({
        transactionId: String(transaction._id),
        expectedAfter: before + amount,
        actualAfter: after,
      });
    }

    previousAfter = after;
  });

  const difference = currentCredits - expectedCredits;
  const status =
    difference === 0 && chainErrors.length === 0
      ? "OK"
      : "MISMATCH";

  return {
    userId,
    currentCredits,
    expectedCredits,
    difference,
    status,
    startingCredits,
    transactionCount: transactions.length,
    chainErrors,
  };
}

async function saveReconciliationResult(
  result: Awaited<ReturnType<typeof calculateReconciliation>>,
) {
  await StoreInventory.updateOne(
    { userId: result.userId },
    {
      $set: {
        lastReconciledAt: new Date(),
        lastReconciliationStatus: result.status,
        lastReconciliationDifference: result.difference,
      },
    },
  );
}

async function auditReconciliationMismatch(
  req: any,
  result: Awaited<ReturnType<typeof calculateReconciliation>>,
  targetName?: string,
) {
  if (result.status !== "MISMATCH") return;

  await createStoreAudit(req, {
    action: "STORE_RECONCILIATION_MISMATCH",
    severity: "critical",
    description:
      `Foi detetada uma discrepância de ${result.difference} créditos na conta de ${targetName || result.userId}.`,
    targetId: result.userId,
    targetName: targetName || result.userId,
    metadata: result,
  });
}

async function registerStoreFailure(
  req: any,
  data: {
    action: string;
    description: string;
    targetId?: string | null;
    targetName?: string | null;
    metadata?: Record<string, any>;
  },
) {
  await createStoreAudit(req, {
    action: data.action,
    severity: "warning",
    description: data.description,
    targetId: data.targetId || null,
    targetName: data.targetName || null,
    metadata: data.metadata || {},
  });
}

router.use(async (_req, res, next) => {
  try {
    await ensureCatalogReady();
    next();
  } catch (error) {
    console.error(
      "[STORE CATALOG INIT]",
      error,
    );

    res.status(500).json({
      error:
        "Não foi possível inicializar o catálogo da loja.",
    });
  }
});


router.get(
  "/catalog/admin",
  async (req, res) => {
    try {
      if (
        !requireAuth(req, res)
      ) {
        return;
      }

      if (
        !requireCommandGeneral(
          req,
          res,
        )
      ) {
        return;
      }

      const products =
        await StoreProduct.find()
          .sort({
            sortOrder: 1,
            createdAt: 1,
          })
          .lean();

      res.json({
        items:
          products.map(
            productToStoreItem,
          ),
      });
    } catch (error: any) {
      res.status(500).json({
        error:
          error.message ||
          "Não foi possível carregar o catálogo.",
      });
    }
  },
);

router.post(
  "/catalog/upload-image",
  async (req, res) => {
    try {
      if (
        !requireAuth(req, res)
      ) {
        return;
      }

      if (
        !requireCommandGeneral(
          req,
          res,
        )
      ) {
        return;
      }

      const dataUrl =
        String(
          req.body?.dataUrl ||
          "",
        );

      const match =
        dataUrl.match(
          /^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/i,
        );

      if (!match) {
        return void res.status(400).json({
          error:
            "Imagem inválida. Usa PNG, JPG ou WEBP.",
        });
      }

      const extension =
        match[1].toLowerCase() ===
        "jpeg"
          ? "jpg"
          : match[1].toLowerCase();

      const buffer =
        Buffer.from(
          match[2],
          "base64",
        );

      const MAX_IMAGE_BYTES =
        12 * 1024 * 1024;

      if (
        buffer.length >
        MAX_IMAGE_BYTES
      ) {
        return void res.status(413).json({
          error:
            "A imagem não pode ultrapassar 12 MB.",
          maxBytes:
            MAX_IMAGE_BYTES,
          receivedBytes:
            buffer.length,
        });
      }

      if (
        buffer.length <
        100
      ) {
        return void res.status(400).json({
          error:
            "O ficheiro de imagem está vazio ou corrompido.",
        });
      }

      await fs.mkdir(
        CATALOG_IMAGE_DIR,
        {
          recursive: true,
        },
      );

      const baseName =
        slugifyProductId(
          req.body?.fileName ||
          "produto",
        ) ||
        "produto";

      const filename =
        `${Date.now()}-${baseName}.${extension}`;

      await fs.writeFile(
        path.join(
          CATALOG_IMAGE_DIR,
          filename,
        ),
        buffer,
      );

      res.status(201).json({
        ok: true,
        image:
          `/Store/catalog/${filename}`,
        filename,
        size:
          buffer.length,
        mimeType:
          `image/${extension === "jpg" ? "jpeg" : extension}`,
      });
    } catch (error: any) {
      res.status(500).json({
        error:
          error.message ||
          "Não foi possível guardar a imagem.",
      });
    }
  },
);

router.post(
  "/catalog",
  async (req, res) => {
    try {
      const actorId =
        requireAuth(req, res);

      if (!actorId) {
        return;
      }

      if (
        !requireCommandGeneral(
          req,
          res,
        )
      ) {
        return;
      }

      const id =
        slugifyProductId(
          req.body?.id ||
          req.body?.name ||
          "",
        );

      if (!id) {
        return void res.status(400).json({
          error:
            "Nome ou ID do produto inválido.",
        });
      }

      const price =
        Number(
          req.body?.price,
        );

      if (
        !Number.isSafeInteger(
          price,
        ) ||
        price < 0 ||
        price > 1_000_000
      ) {
        return void res.status(400).json({
          error:
            "Preço inválido.",
        });
      }

      const product =
        await StoreProduct.create({
          id,
          name:
            String(
              req.body?.name ||
              "",
            ).trim(),
          description:
            String(
              req.body?.description ||
              "",
            ).trim(),
          category:
            req.body?.category,
          rarity:
            req.body?.rarity ||
            "COMUM",
          price,
          image:
            req.body?.image ||
            null,
          collection:
            req.body?.collection ||
            null,
          equipSlot:
            req.body?.equipSlot ||
            null,
          maxEquipped:
            req.body?.maxEquipped ||
            null,
          requiredRoleKeys:
            Array.isArray(
              req.body?.requiredRoleKeys,
            )
              ? req.body.requiredRoleKeys
              : [],
          purchasable:
            req.body?.purchasable !==
            false,
          stock:
            req.body?.stock === null ||
            req.body?.stock === "" ||
            req.body?.stock === undefined
              ? null
              : Math.max(
                  0,
                  Math.floor(
                    Number(req.body.stock),
                  ),
                ),
          soldCount:
            0,
          limited:
            req.body?.limited ===
            true,
          featured:
            req.body?.featured ===
            true,
          active:
            req.body?.active !==
            false,
          discount:
            Number(
              req.body?.discount ||
              0,
            ),
          socialType:
            req.body?.socialType ||
            null,
          previewRoute:
            req.body?.previewRoute ||
            null,
          sortOrder:
            Number(
              req.body?.sortOrder ||
              0,
            ),
          createdBy:
            actorId,
          updatedBy:
            actorId,
        });

      await refreshCatalogCache();

      await createStoreAudit(
        req,
        {
          action:
            "STORE_PRODUCT_CREATED",
          severity:
            "success",
          description:
            `${getSessionUser(req)?.username || actorId} adicionou o produto ${product.name}.`,
          targetId:
            product.id,
          targetName:
            product.name,
          metadata: {
            product:
              product.toObject(),
          },
        },
      );

      res.status(201).json({
        item:
          productToStoreItem(
            product,
          ),
      });
    } catch (error: any) {
      if (
        error?.code ===
        11000
      ) {
        return void res.status(409).json({
          error:
            "Já existe um produto com este ID.",
        });
      }

      res.status(500).json({
        error:
          error.message ||
          "Não foi possível criar o produto.",
      });
    }
  },
);

router.patch(
  "/catalog/:id",
  async (req, res) => {
    try {
      const actorId =
        requireAuth(req, res);

      if (!actorId) {
        return;
      }

      if (
        !requireCommandGeneral(
          req,
          res,
        )
      ) {
        return;
      }

      const previous =
        await StoreProduct.findOne({
          id:
            String(
              req.params.id,
            ),
        }).lean();

      if (!previous) {
        return void res.status(404).json({
          error:
            "Produto não encontrado.",
        });
      }

      const allowed = [
        "name",
        "description",
        "category",
        "rarity",
        "price",
        "image",
        "collection",
        "equipSlot",
        "maxEquipped",
        "requiredRoleKeys",
        "purchasable",
        "stock",
        "limited",
        "featured",
        "active",
        "discount",
        "socialType",
        "previewRoute",
        "sortOrder",
      ];

      const update: Record<string, any> = {
        updatedBy:
          actorId,
      };

      for (
        const key
        of allowed
      ) {
        if (
          Object.prototype.hasOwnProperty.call(
            req.body || {},
            key,
          )
        ) {
          update[key] =
            req.body[key];
        }
      }

      if (
        update.price !==
        undefined
      ) {
        const price =
          Number(
            update.price,
          );

        if (
          !Number.isSafeInteger(
            price,
          ) ||
          price < 0 ||
          price > 1_000_000
        ) {
          return void res.status(400).json({
            error:
              "Preço inválido.",
          });
        }

        update.price =
          price;
      }

      if (
        Object.prototype.hasOwnProperty.call(
          update,
          "stock",
        )
      ) {
        if (
          update.stock === null ||
          update.stock === ""
        ) {
          update.stock = null;
        } else {
          const stock =
            Number(update.stock);

          if (
            !Number.isSafeInteger(stock) ||
            stock < 0 ||
            stock > 1_000_000
          ) {
            return void res.status(400).json({
              error: "Stock inválido.",
            });
          }

          update.stock = stock;
        }
      }

      const product =
        await StoreProduct.findOneAndUpdate(
          {
            id:
              String(
                req.params.id,
              ),
          },
          {
            $set:
              update,
          },
          {
            new: true,
            runValidators:
              true,
          },
        );

      await refreshCatalogCache();

      await createStoreAudit(
        req,
        {
          action:
            "STORE_PRODUCT_UPDATED",
          severity:
            "warning",
          description:
            `${getSessionUser(req)?.username || actorId} alterou o produto ${product?.name || req.params.id}.`,
          targetId:
            String(
              req.params.id,
            ),
          targetName:
            product?.name ||
            previous.name,
          metadata: {
            previous,
            next:
              product?.toObject?.() ||
              product,
          },
        },
      );

      if (
        Object.prototype.hasOwnProperty.call(update, "stock") &&
        previous.stock !== product?.stock
      ) {
        await createStoreAudit(req, {
          action: "STORE_STOCK_CHANGED",
          severity: "warning",
          description:
            `${getSessionUser(req)?.username || actorId} alterou o stock de ${product?.name || previous.name}.`,
          targetId: String(req.params.id),
          targetName: product?.name || previous.name,
          metadata: {
            previousStock: previous.stock ?? null,
            nextStock: product?.stock ?? null,
          },
        });
      }

      res.json({
        item:
          productToStoreItem(
            product,
          ),
      });
    } catch (error: any) {
      res.status(500).json({
        error:
          error.message ||
          "Não foi possível atualizar o produto.",
      });
    }
  },
);

router.delete(
  "/catalog/:id",
  async (req, res) => {
    try {
      const actorId =
        requireAuth(req, res);

      if (!actorId) {
        return;
      }

      if (
        !requireCommandGeneral(
          req,
          res,
        )
      ) {
        return;
      }

      const product =
        await StoreProduct.findOneAndUpdate(
          {
            id:
              String(
                req.params.id,
              ),
          },
          {
            $set: {
              active:
                false,
              purchasable:
                false,
              updatedBy:
                actorId,
              archivedAt:
                new Date(),
              archivedBy:
                actorId,
            },
          },
          {
            new: true,
          },
        );

      if (!product) {
        return void res.status(404).json({
          error:
            "Produto não encontrado.",
        });
      }

      await refreshCatalogCache();

      await createStoreAudit(
        req,
        {
          action:
            "STORE_PRODUCT_DISABLED",
          severity:
            "warning",
          description:
            `${getSessionUser(req)?.username || actorId} retirou o produto ${product.name} do catálogo.`,
          targetId:
            product.id,
          targetName:
            product.name,
          metadata: {
            active:
              false,
          },
        },
      );

      res.json({
        ok: true,
        item:
          productToStoreItem(
            product,
          ),
      });
    } catch (error: any) {
      res.status(500).json({
        error:
          error.message ||
          "Não foi possível retirar o produto.",
      });
    }
  },
);


router.post(
  "/catalog/:id/restore",
  async (req, res) => {
    try {
      const actorId = requireAuth(req, res);
      if (!actorId) return;

      if (!requireCommandGeneral(req, res)) {
        return;
      }

      const product =
        await StoreProduct.findOneAndUpdate(
          { id: String(req.params.id) },
          {
            $set: {
              active: true,
              purchasable:
                req.body?.purchasable !== false,
              updatedBy: actorId,
              archivedAt: null,
              archivedBy: null,
            },
          },
          {
            new: true,
            runValidators: true,
          },
        );

      if (!product) {
        return void res.status(404).json({
          error: "Produto não encontrado.",
        });
      }

      await refreshCatalogCache();

      await createStoreAudit(req, {
        action: "STORE_PRODUCT_RESTORED",
        severity: "success",
        description:
          `${getSessionUser(req)?.username || actorId} reativou o produto ${product.name}.`,
        targetId: product.id,
        targetName: product.name,
        metadata: {
          active: true,
          purchasable: product.purchasable,
          stock: product.stock,
        },
      });

      res.json({
        ok: true,
        item: productToStoreItem(product),
      });
    } catch (error: any) {
      res.status(500).json({
        error:
          error.message ||
          "Não foi possível reativar o produto.",
      });
    }
  },
);


/**
 * ============================================================
 * CENTRO ADMINISTRATIVO DA LOJA
 * ============================================================
 */

router.get("/admin/summary", async (req, res) => {
  try {
    const actorId = requireAuth(req, res);
    if (!actorId) return;
    if (!requireCommandGeneral(req, res)) return;

    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      products,
      creditsSpentAgg,
      purchases24h,
      inventoryCount,
      lockedCount,
      mismatchCount,
    ] = await Promise.all([
      StoreProduct.find({}).lean(),
      StoreTransaction.aggregate([
        { $match: { type: "BUY", amount: { $lt: 0 } } },
        { $group: { _id: null, total: { $sum: { $abs: "$amount" } } } },
      ]),
      StoreTransaction.countDocuments({
        type: "BUY",
        createdAt: { $gte: last24h },
      }),
      StoreInventory.countDocuments({}),
      StoreInventory.countDocuments({ purchasesLocked: true }),
      StoreInventory.countDocuments({
        lastReconciliationStatus: "MISMATCH",
      }),
    ]);

    const activeProducts = products.filter(
      (product: any) => product.active !== false,
    );
    const hiddenProducts = products.filter(
      (product: any) => product.active === false,
    );
    const soldOutProducts = activeProducts.filter(
      (product: any) =>
        product.stock !== null &&
        product.stock !== undefined &&
        Number(product.stock) <= 0,
    );
    const totalSold = products.reduce(
      (total: number, product: any) =>
        total + Number(product.soldCount || 0),
      0,
    );

    const alerts: any[] = [];

    for (const product of products as any[]) {
      if (
        product.active !== false &&
        product.stock !== null &&
        product.stock !== undefined &&
        Number(product.stock) > 0 &&
        Number(product.stock) <= STORE_LOW_STOCK_THRESHOLD
      ) {
        alerts.push({
          type: "LOW_STOCK",
          severity: "warning",
          productId: product.id,
          productName: product.name,
          message: `${product.name} tem apenas ${product.stock} unidade(s).`,
        });
      }

      if (!product.image) {
        alerts.push({
          type: "MISSING_IMAGE",
          severity: "info",
          productId: product.id,
          productName: product.name,
          message: `${product.name} não tem imagem.`,
        });
      }

      if (!product.category) {
        alerts.push({
          type: "MISSING_CATEGORY",
          severity: "warning",
          productId: product.id,
          productName: product.name,
          message: `${product.name} não tem categoria.`,
        });
      }

      const requiredRoleKeys = Array.isArray(product.requiredRoleKeys)
        ? product.requiredRoleKeys
        : [];
      const missingRoles = requiredRoleKeys.filter(
        (key: StoreRoleKey) => !STORE_ROLE_IDS[key],
      );

      if (missingRoles.length) {
        alerts.push({
          type: "ROLE_NOT_CONFIGURED",
          severity: "critical",
          productId: product.id,
          productName: product.name,
          message:
            `${product.name} depende de role(s) não configurada(s): ${missingRoles.join(", ")}.`,
          metadata: { missingRoles },
        });
      }
    }

    res.json({
      metrics: {
        activeProducts: activeProducts.length,
        hiddenProducts: hiddenProducts.length,
        soldOutProducts: soldOutProducts.length,
        totalSold,
        creditsSpent: Number(creditsSpentAgg[0]?.total || 0),
        purchasesLast24h: purchases24h,
        inventoryCount,
        lockedAccounts: lockedCount,
        reconciliationMismatches: mismatchCount,
      },
      alerts,
      updatedAt: now,
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || "Não foi possível carregar o centro administrativo.",
    });
  }
});

router.get("/admin/users", async (req, res) => {
  try {
    const actorId = requireAuth(req, res);
    if (!actorId) return;
    if (!requireCommandGeneral(req, res)) return;

    const query = String(req.query.q || "").trim().toLowerCase();
    const limit = Math.min(Math.max(Number(req.query.limit || 50), 1), 100);

    const inventories = await StoreInventory.find({})
      .sort({ updatedAt: -1 })
      .limit(query ? 500 : limit)
      .lean();

    const users = await resolveStoreUsers(
      inventories.map((inventory: any) => String(inventory.userId)),
    );

    const items = inventories
      .map((inventory: any) => {
        const user = users.get(String(inventory.userId)) || {
          userId: String(inventory.userId),
          name: String(inventory.userId),
          avatarUrl: null,
        };

        return {
          ...user,
          credits: Number(inventory.credits || 0),
          ownedItems: Array.isArray(inventory.ownedItems)
            ? inventory.ownedItems.length
            : 0,
          purchasesLocked: inventory.purchasesLocked === true,
          purchasesLockedReason: inventory.purchasesLockedReason || null,
          lastReconciledAt: inventory.lastReconciledAt || null,
          reconciliationStatus:
            inventory.lastReconciliationStatus || "NOT_CHECKED",
          reconciliationDifference:
            Number(inventory.lastReconciliationDifference || 0),
          updatedAt: inventory.updatedAt,
        };
      })
      .filter((item: any) => {
        if (!query) return true;
        return [item.name, item.userId, item.badgeNumber, item.callsignNumber]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      })
      .slice(0, limit);

    res.json({ items });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || "Não foi possível pesquisar militares.",
    });
  }
});

router.get("/admin/users/:userId", async (req, res) => {
  try {
    const actorId = requireAuth(req, res);
    if (!actorId) return;
    if (!requireCommandGeneral(req, res)) return;

    const targetUserId = String(req.params.userId || "").trim();
    const inventory = await getOrCreateInventory(targetUserId);
    const users = await resolveStoreUsers([targetUserId]);
    const user = users.get(targetUserId) || {
      userId: targetUserId,
      name: targetUserId,
      avatarUrl: null,
    };

    const history = await StoreTransaction.find({ userId: targetUserId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const reconciliation = await calculateReconciliation(
      targetUserId,
      inventory.toObject ? inventory.toObject() : inventory,
    );

    res.json({
      user,
      inventory: normalizeInventory(inventory),
      security: {
        purchasesLocked: inventory.purchasesLocked === true,
        purchasesLockedReason: inventory.purchasesLockedReason || null,
        purchasesLockedAt: inventory.purchasesLockedAt || null,
        purchasesLockedBy: inventory.purchasesLockedBy || null,
      },
      reconciliation,
      history,
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || "Não foi possível carregar a conta da loja.",
    });
  }
});

router.post("/admin/users/:userId/credits", async (req, res) => {
  try {
    const actorId = requireAuth(req, res);
    if (!actorId) return;
    if (!requireCommandGeneral(req, res)) return;

    const targetUserId = String(req.params.userId || "").trim();
    const operation = String(req.body?.operation || "").toUpperCase();
    const amount = Number(req.body?.amount || 0);
    const reason = String(req.body?.reason || "").trim();

    if (!targetUserId) {
      return void res.status(400).json({ error: "Utilizador em falta." });
    }

    if (!["ADD", "REMOVE"].includes(operation)) {
      return void res.status(400).json({ error: "Operação inválida." });
    }

    if (
      !Number.isSafeInteger(amount) ||
      amount <= 0 ||
      amount > MAX_CREDIT_ADJUSTMENT
    ) {
      return void res.status(400).json({
        error: `A quantidade deve estar entre 1 e ${MAX_CREDIT_ADJUSTMENT}.`,
      });
    }

    if (reason.length < 5) {
      return void res.status(400).json({
        error: "Indica um motivo com pelo menos 5 caracteres.",
      });
    }

    const current = await getOrCreateInventory(targetUserId);
    const beforeCredits = Number(current.credits || 0);
    const signedAmount = operation === "ADD" ? amount : -amount;

    if (operation === "REMOVE" && beforeCredits < amount) {
      return void res.status(400).json({
        error: "O utilizador não possui créditos suficientes.",
      });
    }

    const inventory = await StoreInventory.findOneAndUpdate(
      {
        userId: targetUserId,
        ...(operation === "REMOVE"
          ? { credits: { $gte: amount } }
          : {}),
      },
      { $inc: { credits: signedAmount } },
      { new: true, runValidators: true },
    );

    if (!inventory) {
      return void res.status(409).json({
        error: "Não foi possível atualizar os créditos.",
      });
    }

    await createTransaction({
      userId: targetUserId,
      type: operation === "ADD" ? "CREDITS_ADD" : "CREDITS_REMOVE",
      itemId: null,
      amount: signedAmount,
      beforeCredits,
      afterCredits: Number(inventory.credits || 0),
      reason,
      createdBy: actorId,
      metadata: { source: "STORE_ADMIN" },
    });

    const users = await resolveStoreUsers([targetUserId]);
    const targetName = users.get(targetUserId)?.name || targetUserId;

    await createStoreAudit(req, {
      action:
        operation === "ADD"
          ? "STORE_CREDITS_ADDED"
          : "STORE_CREDITS_REMOVED",
      severity: operation === "ADD" ? "success" : "warning",
      description:
        `${getSessionUser(req)?.username || actorId} ${operation === "ADD" ? "adicionou" : "removeu"} ${amount} créditos a ${targetName}.`,
      targetId: targetUserId,
      targetName,
      metadata: {
        amount: signedAmount,
        beforeCredits,
        afterCredits: Number(inventory.credits || 0),
        reason,
      },
    });

    const reconciliation = await calculateReconciliation(
      targetUserId,
      inventory.toObject ? inventory.toObject() : inventory,
    );
    await saveReconciliationResult(reconciliation);
    await auditReconciliationMismatch(req, reconciliation, targetName);

    res.json({
      ok: true,
      inventory: normalizeInventory(inventory),
      reconciliation,
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || "Não foi possível ajustar os créditos.",
    });
  }
});

router.post("/admin/users/:userId/lock", async (req, res) => {
  try {
    const actorId = requireAuth(req, res);
    if (!actorId) return;
    if (!requireCommandGeneral(req, res)) return;

    const targetUserId = String(req.params.userId || "").trim();
    const locked = req.body?.locked === true;
    const reason = String(req.body?.reason || "").trim();

    if (locked && reason.length < 5) {
      return void res.status(400).json({
        error: "É obrigatório indicar o motivo do bloqueio.",
      });
    }

    await getOrCreateInventory(targetUserId);
    const inventory = await StoreInventory.findOneAndUpdate(
      { userId: targetUserId },
      {
        $set: {
          purchasesLocked: locked,
          purchasesLockedReason: locked ? reason : null,
          purchasesLockedAt: locked ? new Date() : null,
          purchasesLockedBy: locked ? actorId : null,
        },
      },
      { new: true },
    );

    const users = await resolveStoreUsers([targetUserId]);
    const targetName = users.get(targetUserId)?.name || targetUserId;

    await createStoreAudit(req, {
      action: locked ? "STORE_ACCOUNT_LOCKED" : "STORE_ACCOUNT_UNLOCKED",
      severity: locked ? "warning" : "success",
      description: locked
        ? `As compras de ${targetName} foram bloqueadas.`
        : `As compras de ${targetName} foram desbloqueadas.`,
      targetId: targetUserId,
      targetName,
      metadata: { locked, reason: locked ? reason : null },
    });

    res.json({
      ok: true,
      inventory: inventory ? normalizeInventory(inventory) : null,
      security: {
        purchasesLocked: inventory?.purchasesLocked === true,
        purchasesLockedReason: inventory?.purchasesLockedReason || null,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || "Não foi possível alterar o bloqueio.",
    });
  }
});

router.post("/admin/users/:userId/reconcile", async (req, res) => {
  try {
    const actorId = requireAuth(req, res);
    if (!actorId) return;
    if (!requireCommandGeneral(req, res)) return;

    const targetUserId = String(req.params.userId || "").trim();
    const inventory = await getOrCreateInventory(targetUserId);
    const users = await resolveStoreUsers([targetUserId]);
    const targetName = users.get(targetUserId)?.name || targetUserId;

    const reconciliation = await calculateReconciliation(
      targetUserId,
      inventory.toObject ? inventory.toObject() : inventory,
    );
    await saveReconciliationResult(reconciliation);

    await createStoreAudit(req, {
      action:
        reconciliation.status === "OK"
          ? "STORE_RECONCILIATION_OK"
          : "STORE_RECONCILIATION_MISMATCH",
      severity: reconciliation.status === "OK" ? "success" : "critical",
      description:
        reconciliation.status === "OK"
          ? `A conta de ${targetName} foi reconciliada sem discrepâncias.`
          : `A conta de ${targetName} apresenta uma discrepância de ${reconciliation.difference} créditos.`,
      targetId: targetUserId,
      targetName,
      metadata: reconciliation,
    });

    res.json({ ok: true, reconciliation });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || "Não foi possível reconciliar a conta.",
    });
  }
});

router.post("/admin/reconcile-all", async (req, res) => {
  try {
    const actorId = requireAuth(req, res);
    if (!actorId) return;
    if (!requireCommandGeneral(req, res)) return;

    const inventories = await StoreInventory.find({}).lean();
    const users = await resolveStoreUsers(
      inventories.map((inventory: any) => String(inventory.userId)),
    );

    const results: any[] = [];

    for (const inventory of inventories as any[]) {
      const result = await calculateReconciliation(
        String(inventory.userId),
        inventory,
      );
      await saveReconciliationResult(result);
      results.push(result);

      if (result.status === "MISMATCH") {
        await auditReconciliationMismatch(
          req,
          result,
          users.get(String(inventory.userId))?.name,
        );
      }
    }

    const mismatches = results.filter(
      (result) => result.status === "MISMATCH",
    );

    await createStoreAudit(req, {
      action: "STORE_RECONCILIATION_ALL",
      severity: mismatches.length ? "critical" : "success",
      description: mismatches.length
        ? `A reconciliação global encontrou ${mismatches.length} conta(s) com discrepâncias.`
        : `A reconciliação global validou ${results.length} conta(s) sem discrepâncias.`,
      metadata: {
        checked: results.length,
        mismatches: mismatches.map((item) => ({
          userId: item.userId,
          difference: item.difference,
        })),
      },
    });

    res.json({
      ok: true,
      checked: results.length,
      mismatchCount: mismatches.length,
      mismatches,
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || "Não foi possível executar a reconciliação global.",
    });
  }
});

router.get("/items", async (req, res) => {
  const userId = getSessionUserId(req);
  const userRoles = getSessionRoles(req);

  const items = storeItemsCache.map((item) => ({
    ...item,

    requiredRoleKeys:
      item.requiredRoleKeys || [],

    requiredRoleIds:
      resolveRequiredRoleIds(
        item.requiredRoleKeys,
      ),

    locked:
      userId
        ? !canAccessRestrictedProduct(
            userId,
            userRoles,
            item.requiredRoleKeys,
          )
        : Boolean(item.requiredRoleKeys?.length),

    purchasable:
      item.purchasable !== false,
  }));

  res.json({
    items,
    bundles: STORE_BUNDLES.map((bundle) => ({
      ...bundle,

      requiredRoleIds:
        resolveRequiredRoleIds(
          bundle.requiredRoleKeys,
        ),

      locked:
        userId
          ? !canAccessRestrictedProduct(
              userId,
              userRoles,
              bundle.requiredRoleKeys,
            )
          : Boolean(
              bundle.requiredRoleKeys?.length,
            ),
    })),
  });
});

/**
 * ============================================================
 * INVENTÁRIO
 * ============================================================
 */

router.get("/me", async (req, res) => {
  try {
    const userId = requireAuth(req, res);

    if (!userId) return;

    const inventory =
      await getOrCreateInventory(userId);

    const favorites = await StoreFavorite.find({
      userId,
    })
      .sort({
        createdAt: -1,
      })
      .lean();

    res.json({
      ...normalizeInventory(inventory),

      favoriteItemIds: favorites.map(
        (favorite: any) => favorite.itemId,
      ),
    });
  } catch (error: any) {
    console.error("[STORE /me] Erro:", error);

    res.status(500).json({
      error:
        error.message ||
        "Erro ao carregar a loja.",
    });
  }
});

/**
 * ============================================================
 * HISTÓRICO
 * ============================================================
 */

router.get(
  "/transactions/me",
  async (req, res) => {
    try {
      const userId = requireAuth(req, res);

      if (!userId) return;

      const limit = sanitizeLimit(
        req.query.limit,
        50,
      );

      const transactions =
        await StoreTransaction.find({
          userId,
        })
          .sort({
            createdAt: -1,
          })
          .limit(limit)
          .lean();

      const items = transactions.map(
        (transaction: any) => {
          const item = transaction.itemId
            ? getStoreItem(
                String(transaction.itemId),
              )
            : null;

          return {
            ...transaction,
            itemName:
              item?.name ||
              transaction.itemId ||
              null,
          };
        },
      );

      res.json({
        items,
        total: await StoreTransaction.countDocuments({
          userId,
        }),
      });
    } catch (error: any) {
      console.error(
        "[STORE /transactions/me] Erro:",
        error,
      );

      res.status(500).json({
        error:
          error.message ||
          "Erro ao carregar o histórico.",
      });
    }
  },
);

/**
 * ============================================================
 * FAVORITOS
 * ============================================================
 */

router.get("/favorites", async (req, res) => {
  try {
    const userId = requireAuth(req, res);

    if (!userId) return;

    const favorites = await StoreFavorite.find({
      userId,
    })
      .sort({
        createdAt: -1,
      })
      .lean();

    res.json({
      itemIds: favorites.map(
        (favorite: any) => favorite.itemId,
      ),
    });
  } catch (error: any) {
    console.error(
      "[STORE /favorites] Erro:",
      error,
    );

    res.status(500).json({
      error:
        error.message ||
        "Erro ao carregar favoritos.",
    });
  }
});

router.post(
  "/favorites/:itemId",
  async (req, res) => {
    try {
      const userId = requireAuth(req, res);

      if (!userId) return;

      const itemId = String(
        req.params.itemId || "",
      );

      const item = getStoreItem(itemId);

      if (!item) {
        res.status(404).json({
          error: "Item não encontrado.",
        });

        return;
      }

      const existing =
        await StoreFavorite.findOne({
          userId,
          itemId,
        });

      let favorite = false;

      if (existing) {
        await existing.deleteOne();
      } else {
        await StoreFavorite.create({
          userId,
          itemId,
        });

        favorite = true;
      }

      const favorites = await StoreFavorite.find({
        userId,
      }).lean();

      res.json({
        ok: true,
        favorite,
        itemId,
        itemIds: favorites.map(
          (entry: any) => entry.itemId,
        ),
        message: favorite
          ? "Item adicionado aos favoritos."
          : "Item removido dos favoritos.",
      });
    } catch (error: any) {
      console.error(
        "[STORE /favorites/:itemId] Erro:",
        error,
      );

      res.status(500).json({
        error:
          error.message ||
          "Erro ao atualizar favoritos.",
      });
    }
  },
);

/**
 * ============================================================
 * COMPRAR ITEM
 * ============================================================
 */

router.post("/buy", async (req, res) => {
  try {
    const userId = requireAuth(req, res);

    if (!userId) return;

    const itemId = String(
      req.body?.itemId || "",
    );

    const item = getStoreItem(itemId);

    if (!item) {
      res.status(404).json({
        error: "Item não encontrado.",
      });

      return;
    }

    if (item.purchasable === false) {
      res.status(403).json({
        error:
          "Este item não se encontra disponível para compra.",
      });

      return;
    }

    if (
      item.stock !== null &&
      Number(item.stock) <= 0
    ) {
      res.status(409).json({
        error: "Este produto encontra-se esgotado.",
      });

      return;
    }

    const userRoles = getSessionRoles(req);

    if (
      !canAccessRestrictedProduct(
        userId,
        userRoles,
        item.requiredRoleKeys,
      )
    ) {
      res.status(403).json({
        error:
          "Não tens a role necessária para comprar este item.",
      });

      return;
    }

    await getOrCreateInventory(userId);

    const currentInventory =
      await StoreInventory.findOne({
        userId,
      });

    if (currentInventory?.purchasesLocked) {
      await registerStoreFailure(req, {
        action: "STORE_PURCHASE_FAILED",
        description: "Foi bloqueada uma tentativa de compra numa conta suspensa.",
        targetId: userId,
        targetName: userId,
        metadata: {
          itemId: item.id,
          reason: currentInventory.purchasesLockedReason,
          failure: "ACCOUNT_LOCKED",
        },
      });

      return void res.status(423).json({
        error:
          currentInventory.purchasesLockedReason ||
          "As compras desta conta encontram-se temporariamente bloqueadas.",
      });
    }

    if (!currentInventory) {
      throw new Error(
        "Não foi possível criar o inventário.",
      );
    }

    const ownedItems = Array.isArray(
      currentInventory.ownedItems,
    )
      ? currentInventory.ownedItems
      : [];

    if (ownedItems.includes(item.id)) {
      res.status(409).json({
        error: "Já tens este item.",
        inventory:
          normalizeInventory(currentInventory),
      });

      return;
    }

    const beforeCredits = Number(
      currentInventory.credits || 0,
    );

    if (beforeCredits < item.price) {
      res.status(400).json({
        error: "Créditos insuficientes.",
        inventory:
          normalizeInventory(currentInventory),
      });

      return;
    }

    let stockReserved = false;

    if (item.stock !== null) {
      const stockProduct =
        await StoreProduct.findOneAndUpdate(
          {
            id: item.id,
            active: true,
            purchasable: true,
            stock: { $gt: 0 },
          },
          {
            $inc: {
              stock: -1,
              soldCount: 1,
            },
          },
          { new: true },
        );

      if (!stockProduct) {
        await refreshCatalogCache();

        return void res.status(409).json({
          error: "Este produto acabou de esgotar.",
        });
      }

      stockReserved = true;
    }

    const inventory =
      await StoreInventory.findOneAndUpdate(
        {
          userId,
          credits: {
            $gte: item.price,
          },
          ownedItems: {
            $ne: item.id,
          },
        },
        {
          $inc: {
            credits: -item.price,
          },

          $addToSet: {
            ownedItems: item.id,
          },
        },
        {
          new: true,
        },
      );

    if (!inventory) {
      if (stockReserved) {
        await StoreProduct.updateOne(
          { id: item.id },
          {
            $inc: {
              stock: 1,
              soldCount: -1,
            },
          },
        );
      }

      res.status(409).json({
        error:
          "A compra não pôde ser concluída. Atualiza a loja e tenta novamente.",
      });

      return;
    }

    if (stockReserved) {
      await refreshCatalogCache();
    }

    await createTransaction({
      userId,
      type: "BUY",
      itemId: item.id,
      amount: -item.price,
      beforeCredits,
      afterCredits: Number(
        inventory.credits || 0,
      ),
      reason: `Compra do item ${item.name}`,
      createdBy: userId,
    });

    await createPurchaseLog({
      userId,
      itemId: item.id,
      action: "BOUGHT",
      metadata: {
        itemName: item.name,
        price: item.price,
      },
    });

    await createStoreAudit(req, {
      action: "STORE_ITEM_BOUGHT",
      severity: "success",
      description: `${getSessionUser(req)?.username || userId} comprou ${item.name}.`,
      targetId: item.id,
      targetName: item.name,
      metadata: {
        userId,
        price: item.price,
        beforeCredits,
        afterCredits: Number(inventory.credits || 0),
        stockManaged: item.stock !== null,
      },
    });

    res.json({
      ok: true,
      message: "Item comprado com sucesso.",
      item,
      inventory: normalizeInventory(inventory),
    });
  } catch (error: any) {
    console.error(
      "[STORE /buy] Erro:",
      error,
    );

    await registerStoreFailure(req, {
      action: "STORE_PURCHASE_FAILED",
      description: "Ocorreu um erro ao processar uma compra na loja.",
      targetId: String(req.body?.itemId || "") || null,
      metadata: {
        error: error.message || String(error),
        userId: getSessionUserId(req),
      },
    });

    res.status(500).json({
      error:
        error.message ||
        "Erro ao comprar item.",
    });
  }
});

/**
 * ============================================================
 * COMPRAR PACK
 * ============================================================
 */

router.post(
  "/buy-bundle",
  async (req, res) => {
    try {
      const userId = requireAuth(req, res);

      if (!userId) return;

      const bundleId = String(
        req.body?.bundleId || "",
      );

      const bundle =
        getStoreBundle(bundleId);

      if (!bundle) {
        res.status(404).json({
          error: "Pack não encontrado.",
        });

        return;
      }

      const userRoles = getSessionRoles(req);

      if (
        !canAccessRestrictedProduct(
          userId,
          userRoles,
          bundle.requiredRoleKeys,
        )
      ) {
        res.status(403).json({
          error:
            "Não tens a role necessária para comprar este pack.",
        });

        return;
      }

      const currentInventory =
        await getOrCreateInventory(userId);

      const ownedItems = Array.isArray(
        currentInventory.ownedItems,
      )
        ? currentInventory.ownedItems
        : [];

      const missingItemIds =
        bundle.itemIds.filter(
          (itemId) =>
            !ownedItems.includes(itemId),
        );

      if (missingItemIds.length === 0) {
        res.status(409).json({
          error:
            "Já tens todos os itens deste pack.",
          inventory:
            normalizeInventory(currentInventory),
        });

        return;
      }

      /**
       * Reduz o preço quando o utilizador já possui
       * parte dos itens do pack.
       */
      const missingNormalPrice =
        missingItemIds.reduce(
          (total, itemId) => {
            const item =
              getStoreItem(itemId);

            return total + Number(item?.price || 0);
          },
          0,
        );

      const discountRatio =
        bundle.oldPrice > 0
          ? bundle.price / bundle.oldPrice
          : 1;

      const finalPrice = Math.max(
        1,
        Math.round(
          missingNormalPrice * discountRatio,
        ),
      );

      const beforeCredits = Number(
        currentInventory.credits || 0,
      );

      if (beforeCredits < finalPrice) {
        res.status(400).json({
          error: "Créditos insuficientes.",
          requiredCredits: finalPrice,
          inventory:
            normalizeInventory(currentInventory),
        });

        return;
      }

      const inventory =
        await StoreInventory.findOneAndUpdate(
          {
            userId,
            credits: {
              $gte: finalPrice,
            },
          },
          {
            $inc: {
              credits: -finalPrice,
            },

            $addToSet: {
              ownedItems: {
                $each: missingItemIds,
              },
            },
          },
          {
            new: true,
          },
        );

      if (!inventory) {
        res.status(409).json({
          error:
            "O pack não pôde ser comprado. Atualiza a loja e tenta novamente.",
        });

        return;
      }

      await createTransaction({
        userId,
        type: "BUY",
        itemId: bundle.id,
        amount: -finalPrice,
        beforeCredits,
        afterCredits: Number(
          inventory.credits || 0,
        ),
        reason: `Compra do pack ${bundle.name}`,
        createdBy: userId,
      });

      for (const itemId of missingItemIds) {
        const item =
          getStoreItem(itemId);

        await createPurchaseLog({
          userId,
          itemId,
          action: "BOUGHT",
          metadata: {
            itemName:
              item?.name || itemId,
            bundleId: bundle.id,
            bundleName: bundle.name,
          },
        });
      }

      res.json({
        ok: true,
        message:
          "Pack comprado com sucesso.",
        bundle,
        purchasedItemIds: missingItemIds,
        chargedCredits: finalPrice,
        inventory: normalizeInventory(inventory),
      });
    } catch (error: any) {
      console.error(
        "[STORE /buy-bundle] Erro:",
        error,
      );

      res.status(500).json({
        error:
          error.message ||
          "Erro ao comprar o pack.",
      });
    }
  },
);

/**
 * ============================================================
 * EQUIPAR ITEM
 * ============================================================
 */

router.post("/equip", async (req, res) => {
  try {
    const userId = requireAuth(req, res);

    if (!userId) return;

    const itemId = String(
      req.body?.itemId || "",
    );

    const item = getStoreItem(itemId);

    if (!item) {
      res.status(404).json({
        error: "Item não encontrado.",
      });

      return;
    }

    if (!item.equipSlot) {
      res.status(400).json({
        error:
          "Este item não pode ser equipado.",
      });

      return;
    }

    const inventory =
      await getOrCreateInventory(userId);

    const ownedItems = Array.isArray(
      inventory.ownedItems,
    )
      ? inventory.ownedItems
      : [];

    if (!ownedItems.includes(item.id)) {
      res.status(400).json({
        error:
          "Tens de comprar este item antes de o equipar.",
        inventory:
          normalizeInventory(inventory),
      });

      return;
    }

    if (!inventory.equipped) {
      inventory.equipped = {};
    }

    const beforeCredits = Number(
      inventory.credits || 0,
    );

    if (item.equipSlot === "badges") {
      const currentBadges = Array.isArray(
        inventory.equipped.badges,
      )
        ? inventory.equipped.badges
        : [];

      if (currentBadges.includes(item.id)) {
        res.status(409).json({
          error:
            "Este emblema já está equipado.",
          inventory:
            normalizeInventory(inventory),
        });

        return;
      }

      const maxEquipped =
        item.maxEquipped || 3;

      if (
        currentBadges.length >= maxEquipped
      ) {
        res.status(400).json({
          error: `Só podes equipar ${maxEquipped} emblemas em simultâneo.`,
          inventory:
            normalizeInventory(inventory),
        });

        return;
      }

      inventory.equipped.badges = [
        ...currentBadges,
        item.id,
      ];
    } else {
      inventory.equipped[item.equipSlot] =
        item.id;
    }

    await inventory.save();

    await createTransaction({
      userId,
      type: "EQUIP",
      itemId: item.id,
      amount: 0,
      beforeCredits,
      afterCredits: beforeCredits,
      reason: `Equipado item ${item.name}`,
      createdBy: userId,
    });

    await createPurchaseLog({
      userId,
      itemId: item.id,
      action: "EQUIPPED",
      metadata: {
        itemName: item.name,
        equipSlot: item.equipSlot,
      },
    });

    res.json({
      ok: true,
      message:
        "Item equipado com sucesso.",
      inventory: normalizeInventory(inventory),
    });
  } catch (error: any) {
    console.error(
      "[STORE /equip] Erro:",
      error,
    );

    res.status(500).json({
      error:
        error.message ||
        "Erro ao equipar item.",
    });
  }
});

/**
 * ============================================================
 * DESEQUIPAR ITEM
 * ============================================================
 */

router.post(
  "/unequip",
  async (req, res) => {
    try {
      const userId = requireAuth(req, res);

      if (!userId) return;

      const slot = String(
        req.body?.slot || "",
      ) as EquipSlot;

      const itemId = String(
        req.body?.itemId || "",
      );

      const validSlots: EquipSlot[] = [
        "frame",
        "background",
        "title",
        "theme",
        "badges",
      ];

      if (!validSlots.includes(slot)) {
        res.status(400).json({
          error:
            "Slot de equipamento inválido.",
        });

        return;
      }

      const inventory =
        await getOrCreateInventory(userId);

      if (!inventory.equipped) {
        inventory.equipped = {};
      }

      let removedItemId: string | null =
        null;

      if (slot === "badges") {
        if (!itemId) {
          res.status(400).json({
            error:
              "Indica o emblema que pretendes remover.",
          });

          return;
        }

        const currentBadges = Array.isArray(
          inventory.equipped.badges,
        )
          ? inventory.equipped.badges
          : [];

        if (!currentBadges.includes(itemId)) {
          res.status(409).json({
            error:
              "Este emblema não se encontra equipado.",
          });

          return;
        }

        inventory.equipped.badges =
          currentBadges.filter(
            (badgeId: string) =>
              badgeId !== itemId,
          );

        removedItemId = itemId;
      } else {
        const currentItemId =
          inventory.equipped[slot];

        if (!currentItemId) {
          res.status(409).json({
            error:
              "Não existe nenhum item equipado neste slot.",
          });

          return;
        }

        removedItemId = String(
          currentItemId,
        );

        inventory.equipped[slot] = null;
      }

      await inventory.save();

      const removedItem =
        getStoreItem(removedItemId);

      const credits = Number(
        inventory.credits || 0,
      );

      await createTransaction({
        userId,
        type: "UNEQUIP",
        itemId: removedItemId,
        amount: 0,
        beforeCredits: credits,
        afterCredits: credits,
        reason: `Desequipado item ${
          removedItem?.name || removedItemId
        }`,
        createdBy: userId,
      });

      await createPurchaseLog({
        userId,
        itemId: removedItemId,
        action: "UNEQUIPPED",
        metadata: {
          itemName:
            removedItem?.name ||
            removedItemId,
          equipSlot: slot,
        },
      });

      res.json({
        ok: true,
        message:
          "Item desequipado com sucesso.",
        inventory: normalizeInventory(inventory),
      });
    } catch (error: any) {
      console.error(
        "[STORE /unequip] Erro:",
        error,
      );

      res.status(500).json({
        error:
          error.message ||
          "Erro ao desequipar item.",
      });
    }
  },
);

/**
 * ============================================================
 * MISSÕES
 * ============================================================
 */

router.get(
  "/missions/me",
  async (req, res) => {
    try {
      const userId = requireAuth(req, res);

      if (!userId) return;

      const inventory =
        await getOrCreateInventory(userId);

      const claims =
        await StoreMissionClaim.find({
          userId,
        }).lean();

      const claimedMissionIds =
        new Set(
          claims.map(
            (claim: any) =>
              claim.missionId,
          ),
        );

      const missions = await Promise.all(
        STORE_MISSIONS.map(
          async (mission) => {
            const rawProgress =
              await calculateMissionProgress(
                userId,
                inventory,
                mission,
              );

            const progress = Math.min(
              rawProgress,
              mission.target,
            );

            return {
              ...mission,
              progress,
              completed:
                rawProgress >=
                mission.target,
              claimed:
                claimedMissionIds.has(
                  mission.id,
                ),
            };
          },
        ),
      );

      res.json({
        missions,
      });
    } catch (error: any) {
      console.error(
        "[STORE /missions/me] Erro:",
        error,
      );

      res.status(500).json({
        error:
          error.message ||
          "Erro ao carregar missões.",
      });
    }
  },
);

router.post(
  "/missions/:missionId/claim",
  async (req, res) => {
    try {
      const userId = requireAuth(req, res);

      if (!userId) return;

      const missionId = String(
        req.params.missionId || "",
      );

      const mission =
        getStoreMission(missionId);

      if (!mission) {
        res.status(404).json({
          error: "Missão não encontrada.",
        });

        return;
      }

      const inventory =
        await getOrCreateInventory(userId);

      const existingClaim =
        await StoreMissionClaim.findOne({
          userId,
          missionId,
        });

      if (existingClaim) {
        res.status(409).json({
          error:
            "Esta recompensa já foi reclamada.",
        });

        return;
      }

      const progress =
        await calculateMissionProgress(
          userId,
          inventory,
          mission,
        );

      if (progress < mission.target) {
        res.status(400).json({
          error:
            "Ainda não concluíste esta missão.",
          progress,
          target: mission.target,
        });

        return;
      }

      const beforeCredits = Number(
        inventory.credits || 0,
      );

      const updatedInventory =
        await StoreInventory.findOneAndUpdate(
          {
            userId,
          },
          {
            $inc: {
              credits: mission.reward,
            },
          },
          {
            new: true,
          },
        );

      if (!updatedInventory) {
        throw new Error(
          "Inventário não encontrado.",
        );
      }

      try {
        await StoreMissionClaim.create({
          userId,
          missionId,
          reward: mission.reward,
        });
      } catch (claimError: any) {
        /**
         * Evita dupla recompensa em pedidos simultâneos.
         */
        if (claimError?.code === 11000) {
          await StoreInventory.findOneAndUpdate(
            {
              userId,
            },
            {
              $inc: {
                credits: -mission.reward,
              },
            },
          );

          res.status(409).json({
            error:
              "Esta recompensa já foi reclamada.",
          });

          return;
        }

        throw claimError;
      }

      await createTransaction({
        userId,
        type: "CREDITS_ADD",
        itemId: null,
        amount: mission.reward,
        beforeCredits,
        afterCredits: Number(
          updatedInventory.credits || 0,
        ),
        reason: `Recompensa da missão ${mission.name}`,
        createdBy: userId,
      });

      res.json({
        ok: true,
        message:
          "Recompensa reclamada com sucesso.",
        reward: mission.reward,
        inventory:
          normalizeInventory(updatedInventory),
      });
    } catch (error: any) {
      console.error(
        "[STORE /missions/:missionId/claim] Erro:",
        error,
      );

      res.status(500).json({
        error:
          error.message ||
          "Erro ao reclamar recompensa.",
      });
    }
  },
);

/**
 * ============================================================
 * OFERECER ITEM
 * ============================================================
 *
 * O comprador paga o preço e o destinatário recebe o item.
 */

router.post("/gift", async (req, res) => {
  try {
    const userId = requireAuth(req, res);

    if (!userId) return;

    const targetUserId = String(
      req.body?.targetUserId || "",
    ).trim();

    const itemId = String(
      req.body?.itemId || "",
    ).trim();

    if (!targetUserId) {
      res.status(400).json({
        error:
          "Indica o Discord ID do destinatário.",
      });

      return;
    }

    if (targetUserId === userId) {
      res.status(400).json({
        error:
          "Não podes oferecer um item a ti próprio.",
      });

      return;
    }

    const item = getStoreItem(itemId);

    if (!item) {
      res.status(404).json({
        error: "Item não encontrado.",
      });

      return;
    }

    if (item.purchasable === false) {
      res.status(403).json({
        error:
          "Este item não está disponível para oferta.",
      });

      return;
    }

    const targetRoles =
      await fetchDiscordMemberRoles(
        targetUserId,
      );

    if (
      !canAccessRestrictedProduct(
        targetUserId,
        targetRoles,
        item.requiredRoleKeys,
      )
    ) {
      res.status(403).json({
        error:
          "O destinatário não possui a role necessária para receber este item.",
      });

      return;
    }

    const senderInventory =
      await getOrCreateInventory(userId);

    const targetInventory =
      await getOrCreateInventory(
        targetUserId,
      );

    const targetOwnedItems =
      Array.isArray(
        targetInventory.ownedItems,
      )
        ? targetInventory.ownedItems
        : [];

    if (
      targetOwnedItems.includes(item.id)
    ) {
      res.status(409).json({
        error:
          "O destinatário já possui este item.",
      });

      return;
    }

    const beforeCredits = Number(
      senderInventory.credits || 0,
    );

    if (beforeCredits < item.price) {
      res.status(400).json({
        error: "Créditos insuficientes.",
        inventory:
          normalizeInventory(senderInventory),
      });

      return;
    }

    const chargedSender =
      await StoreInventory.findOneAndUpdate(
        {
          userId,
          credits: {
            $gte: item.price,
          },
        },
        {
          $inc: {
            credits: -item.price,
          },
        },
        {
          new: true,
        },
      );

    if (!chargedSender) {
      res.status(409).json({
        error:
          "Não foi possível processar o pagamento.",
      });

      return;
    }

    const updatedTarget =
      await StoreInventory.findOneAndUpdate(
        {
          userId: targetUserId,
          ownedItems: {
            $ne: item.id,
          },
        },
        {
          $addToSet: {
            ownedItems: item.id,
          },
        },
        {
          new: true,
        },
      );

    if (!updatedTarget) {
      /**
       * Reembolso automático caso a entrega falhe.
       */
      await StoreInventory.findOneAndUpdate(
        {
          userId,
        },
        {
          $inc: {
            credits: item.price,
          },
        },
      );

      res.status(409).json({
        error:
          "Não foi possível entregar o presente. Os créditos foram devolvidos.",
      });

      return;
    }

    await createTransaction({
      userId,
      type: "BUY",
      itemId: item.id,
      amount: -item.price,
      beforeCredits,
      afterCredits: Number(
        chargedSender.credits || 0,
      ),
      reason: `Presente para ${targetUserId}: ${item.name}`,
      createdBy: userId,
    });

    await createPurchaseLog({
      userId: targetUserId,
      itemId: item.id,
      action: "BOUGHT",
      metadata: {
        itemName: item.name,
        giftedBy: userId,
        price: item.price,
      },
    });

    res.json({
      ok: true,
      message:
        "Presente enviado com sucesso.",
      item,
      targetUserId,
      inventory:
        normalizeInventory(chargedSender),
    });
  } catch (error: any) {
    console.error(
      "[STORE /gift] Erro:",
      error,
    );

    res.status(500).json({
      error:
        error.message ||
        "Erro ao oferecer item.",
    });
  }
});

/**
 * ============================================================
 * ADMINISTRAÇÃO DE CRÉDITOS
 * ============================================================
 */

router.post(
  "/credits/add",
  async (req, res) => {
    try {
      const userId = requireAuth(req, res);

      if (!userId) return;

      if (
        !requireCommandGeneral(req, res)
      ) {
        return;
      }

      const targetUserId = String(
        req.body?.userId || userId,
      ).trim();

      const amount = Number(
        req.body?.amount || 0,
      );

      const reason = String(req.body?.reason || "").trim();

      if (reason.length < 5) {
        res.status(400).json({
          error: "É obrigatório indicar um motivo com pelo menos 5 caracteres.",
        });
        return;
      }

      if (!targetUserId) {
        res.status(400).json({
          error:
            "Discord ID do utilizador em falta.",
        });

        return;
      }

      if (
        !Number.isSafeInteger(amount) ||
        amount <= 0 ||
        amount > MAX_CREDIT_ADJUSTMENT
      ) {
        res.status(400).json({
          error: "Quantidade inválida.",
        });

        return;
      }

      await getOrCreateInventory(
        targetUserId,
      );

      const currentInventory =
        await StoreInventory.findOne({
          userId: targetUserId,
        });

      if (!currentInventory) {
        throw new Error(
          "Inventário não encontrado.",
        );
      }

      const beforeCredits = Number(
        currentInventory.credits || 0,
      );

      const inventory =
        await StoreInventory.findOneAndUpdate(
          {
            userId: targetUserId,
          },
          {
            $inc: {
              credits: amount,
            },
          },
          {
            new: true,
          },
        );

      if (!inventory) {
        throw new Error(
          "Não foi possível atualizar os créditos.",
        );
      }

      await createTransaction({
        userId: targetUserId,
        type: "CREDITS_ADD",
        itemId: null,
        amount,
        beforeCredits,
        afterCredits: Number(inventory.credits || 0),
        reason,
        createdBy: userId,
        metadata: { source: "LEGACY_ADMIN_ENDPOINT" },
      });

      const users = await resolveStoreUsers([targetUserId]);
      const targetName = users.get(targetUserId)?.name || targetUserId;

      await createStoreAudit(req, {
        action: "STORE_CREDITS_ADDED",
        severity: "success",
        description: `${getSessionUser(req)?.username || userId} adicionou ${amount} créditos a ${targetName}.`,
        targetId: targetUserId,
        targetName,
        metadata: {
          amount,
          beforeCredits,
          afterCredits: Number(inventory.credits || 0),
          reason,
        },
      });

      res.json({
        ok: true,
        message:
          "Créditos adicionados com sucesso.",
        inventory:
          normalizeInventory(inventory),
      });
    } catch (error: any) {
      console.error(
        "[STORE /credits/add] Erro:",
        error,
      );

      res.status(500).json({
        error:
          error.message ||
          "Erro ao adicionar créditos.",
      });
    }
  },
);

router.post(
  "/credits/remove",
  async (req, res) => {
    try {
      const userId = requireAuth(req, res);

      if (!userId) return;

      if (
        !requireCommandGeneral(req, res)
      ) {
        return;
      }

      const targetUserId = String(
        req.body?.userId || "",
      ).trim();

      const amount = Number(
        req.body?.amount || 0,
      );

      const reason = String(req.body?.reason || "").trim();

      if (reason.length < 5) {
        res.status(400).json({
          error: "É obrigatório indicar um motivo com pelo menos 5 caracteres.",
        });
        return;
      }

      if (!targetUserId) {
        res.status(400).json({
          error:
            "Discord ID do utilizador em falta.",
        });

        return;
      }

      if (
        !Number.isSafeInteger(amount) ||
        amount <= 0 ||
        amount > MAX_CREDIT_ADJUSTMENT
      ) {
        res.status(400).json({
          error: "Quantidade inválida.",
        });

        return;
      }

      const inventory =
        await getOrCreateInventory(
          targetUserId,
        );

      const beforeCredits = Number(
        inventory.credits || 0,
      );

      if (beforeCredits < amount) {
        res.status(400).json({
          error:
            "O utilizador não possui créditos suficientes.",
          inventory:
            normalizeInventory(inventory),
        });

        return;
      }

      const updatedInventory =
        await StoreInventory.findOneAndUpdate(
          {
            userId: targetUserId,
            credits: {
              $gte: amount,
            },
          },
          {
            $inc: {
              credits: -amount,
            },
          },
          {
            new: true,
          },
        );

      if (!updatedInventory) {
        res.status(409).json({
          error:
            "Não foi possível remover os créditos.",
        });

        return;
      }

      await createTransaction({
        userId: targetUserId,
        type: "CREDITS_REMOVE",
        itemId: null,
        amount: -amount,
        beforeCredits,
        afterCredits: Number(updatedInventory.credits || 0),
        reason,
        createdBy: userId,
        metadata: { source: "LEGACY_ADMIN_ENDPOINT" },
      });

      const users = await resolveStoreUsers([targetUserId]);
      const targetName = users.get(targetUserId)?.name || targetUserId;

      await createStoreAudit(req, {
        action: "STORE_CREDITS_REMOVED",
        severity: "warning",
        description: `${getSessionUser(req)?.username || userId} removeu ${amount} créditos a ${targetName}.`,
        targetId: targetUserId,
        targetName,
        metadata: {
          amount: -amount,
          beforeCredits,
          afterCredits: Number(updatedInventory.credits || 0),
          reason,
        },
      });

      res.json({
        ok: true,
        message:
          "Créditos removidos com sucesso.",
        inventory:
          normalizeInventory(updatedInventory),
      });
    } catch (error: any) {
      console.error(
        "[STORE /credits/remove] Erro:",
        error,
      );

      res.status(500).json({
        error:
          error.message ||
          "Erro ao remover créditos.",
      });
    }
  },
);

export default router;