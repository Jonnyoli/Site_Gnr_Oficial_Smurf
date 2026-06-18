import {
  useMemo,
  useState,
} from "react";
import { Link, useRoute } from "wouter";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useData, type CarreiraEvent } from "../context/DataContext";
import { useAuth } from "../context/AuthContext";
import {
  ArrowLeft,
  Shield,
  Clock,
  BadgeCheck,
  Radio,
  Activity,
  Crown,
  Hash,
  Calendar,
  AlertTriangle,
  Tag,
  Trophy,
  TrendingUp,
  TrendingDown,
  Medal,
  ScrollText,
  Sparkles,
  History,
  UserPlus,
  UserMinus,
  PlusCircle,
  MinusCircle,
  Filter,
  Database,
  Image,
  FileSearch,
  Radar,
  Target,
  Landmark,
  Paintbrush,
  Eye,
  Sword,
  Gavel,
  Ban,
  RefreshCcw,
  ChevronRight,
  X,
  FileWarning,
  CheckCircle2,
  Printer,
  UserRound,
  BriefcaseBusiness,
  Clock3,
  ShieldCheck,
  ListChecks,
  Copy,
  FileArchive,
  LayoutPanelTop,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import GuardBiography from "../components/GuardBiography";
import ProfileSocialHub from "../components/ProfileSocialHub";
import ProfileThemeSelector from "../components/profile/ProfileThemeSelector";

type Guarda = {
  id: string;
  discordId?: string;
  nome?: string;
  numero?: string;
  avatar?: string | null;
  posto?: string;
  unidade?: string;
  estado?: string;
  discordStatus?: string;
  isDiscordOnline?: boolean;
  isOnDuty?: boolean;
  horasTotal?: number;
  dataIngresso?: string;
  roles?: string[];
  discordTags?: {
    id: string;
    name: string;
    color?: string | null;
  }[];
};

type Hora = {
  id?: string;
  guardaId?: string;
  guardaNome?: string;
  data?: string;
  dataRaw?: string;
  horaInicio?: string;
  horaFim?: string;
  horasRegistadas?: number;
  horasNormais?: number;
  horasNoturnas?: number;
  tipo?: string;
  descricao?: string;
};

type CareerFilter =
  | "TODOS"
  | "CARREIRA"
  | "UNIDADES"
  | "MEDALHAS"
  | "AUDIT_LOG";


type DisciplinaryEvent = {
  type: string;
  roleId?: string | null;
  label?: string | null;
  at: string;
  source?: string | null;
  metadata?: Record<string, unknown>;
};

type DisciplinaryRecord = {
  _id: string;
  targetDiscordId: string;
  targetName?: string | null;
  targetRank?: string | null;
  type: "FIRST_WARNING" | "SECOND_WARNING" | "SUSPENSION" | string;
  status: string;
  title: string;
  reason?: string | null;
  sanction?: string | null;
  fullContent?: string | null;
  discordMessageId?: string | null;
  discordChannelId?: string | null;
  roleId?: string | null;
  responsibleDiscordId?: string | null;
  responsibleName?: string | null;
  appliedAt: string;
  removedAt?: string | null;
  events?: DisciplinaryEvent[];
  createdAt?: string;
  updatedAt?: string;
};

type DisciplinaryResponse = {
  items: DisciplinaryRecord[];
};

type DisciplinaryTimelineEntry = {
  id: string;
  kind: "APPLIED" | "REMOVED" | "CHANGED" | "SYNCED";
  at: string;
  label: string;
  source: string;
  record: DisciplinaryRecord;
};

const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";

function getDisciplinaryTypeLabel(type: string) {
  if (type === "FIRST_WARNING") return "1.ª Repreensão";
  if (type === "SECOND_WARNING") return "2.ª Repreensão";
  if (type === "SUSPENSION") return "Suspensão de serviço";
  return "Registo disciplinar";
}

function getDisciplinaryTypeStyle(type: string) {
  if (type === "FIRST_WARNING") {
    return {
      text: "text-yellow-300",
      border: "border-yellow-400/25",
      bg: "bg-yellow-500/10",
      dot: "bg-yellow-300 shadow-[0_0_18px_rgba(253,224,71,0.7)]",
      button:
        "border-yellow-400/25 bg-yellow-500/10 text-yellow-300 hover:bg-yellow-500/15",
    };
  }

  if (type === "SECOND_WARNING") {
    return {
      text: "text-orange-300",
      border: "border-orange-400/30",
      bg: "bg-orange-500/10",
      dot: "bg-orange-300 shadow-[0_0_18px_rgba(253,186,116,0.7)]",
      button:
        "border-orange-400/25 bg-orange-500/10 text-orange-300 hover:bg-orange-500/15",
    };
  }

  if (type === "SUSPENSION") {
    return {
      text: "text-red-300",
      border: "border-red-400/35",
      bg: "bg-red-500/10",
      dot: "bg-red-300 shadow-[0_0_18px_rgba(252,165,165,0.75)]",
      button:
        "border-red-400/30 bg-red-500/15 text-red-200 hover:bg-red-500/20",
    };
  }

  return {
    text: "text-primary",
    border: "border-primary/25",
    bg: "bg-primary/10",
    dot: "bg-primary shadow-[0_0_18px_hsl(var(--primary)/0.7)]",
    button:
      "border-primary/25 bg-primary/10 text-primary hover:bg-primary/15",
  };
}

function getDisciplinaryEventStyle(kind: DisciplinaryTimelineEntry["kind"]) {
  if (kind === "REMOVED") {
    return {
      label: "Sanção retirada",
      text: "text-emerald-300",
      border: "border-emerald-400/25",
      bg: "bg-emerald-500/10",
      dot: "bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.7)]",
      icon: CheckCircle2,
    };
  }

  if (kind === "CHANGED") {
    return {
      label: "Sanção alterada",
      text: "text-blue-300",
      border: "border-blue-400/25",
      bg: "bg-blue-500/10",
      dot: "bg-blue-300 shadow-[0_0_18px_rgba(147,197,253,0.7)]",
      icon: RefreshCcw,
    };
  }

  if (kind === "SYNCED") {
    return {
      label: "Registo sincronizado",
      text: "text-cyan-300",
      border: "border-cyan-400/25",
      bg: "bg-cyan-500/10",
      dot: "bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.7)]",
      icon: Database,
    };
  }

  return {
    label: "Sanção aplicada",
    text: "text-yellow-300",
    border: "border-yellow-400/25",
    bg: "bg-yellow-500/10",
    dot: "bg-yellow-300 shadow-[0_0_18px_rgba(253,224,71,0.7)]",
    icon: Gavel,
  };
}

function formatDisciplinaryDate(value?: string | null) {
  if (!value) return "Data desconhecida";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data desconhecida";

  return date.toLocaleString("pt-PT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeDisciplinaryEventKind(type?: string | null) {
  const normalized = String(type || "").toUpperCase();

  if (
    normalized.includes("REMOVED") ||
    normalized.includes("RETIRAD") ||
    normalized.includes("REVOK")
  ) {
    return "REMOVED" as const;
  }

  if (
    normalized.includes("CHANGED") ||
    normalized.includes("UPDATED") ||
    normalized.includes("SUBSTIT")
  ) {
    return "CHANGED" as const;
  }

  if (normalized.includes("SYNC")) {
    return "SYNCED" as const;
  }

  return "APPLIED" as const;
}

async function fetchGuardDisciplinaryHistory(
  discordId: string,
): Promise<DisciplinaryResponse> {
  if (!discordId) return { items: [] };

  const response = await fetch(
    `${API_BASE_URL}/api/disciplinary/guard/${encodeURIComponent(discordId)}`,
    {
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `Não foi possível carregar o histórico disciplinar. Código ${response.status}.`,
    );
  }

  const data = await response.json();

  if (Array.isArray(data)) {
    return { items: data };
  }

  return {
    items: Array.isArray(data?.items) ? data.items : [],
  };
}

type StoreCosmetic = {
  id: string;
  name: string;
  type: "frame" | "background" | "title" | "theme" | "badge";
  label: string;
  icon: any;
  image?: string;
  frameClass?: string;
  titleClass?: string;
  badgeClass?: string;
  bgClass?: string;
};

type StoreCatalogProduct = {
  id: string;
  name?: string;
  description?: string;
  category?: string;
  image?: string | null;
  equipSlot?: string | null;
  rarity?: string;
};

type CurrentMedal = {
  id: string;
  emoji?: string;
  name: string;
  shortName?: string;
  points?: number;
  order?: number;
};

function storeProductType(
  product?: StoreCatalogProduct | null,
): StoreCosmetic["type"] | null {
  const slot =
    String(
      product?.equipSlot ||
      "",
    );

  if (
    slot === "frame" ||
    slot === "background" ||
    slot === "title" ||
    slot === "theme"
  ) {
    return slot;
  }

  if (
    slot === "badges"
  ) {
    return "badge";
  }

  const category =
    String(
      product?.category ||
      "",
    ).toUpperCase();

  if (category === "MOLDURAS") return "frame";
  if (category === "FUNDOS") return "background";
  if (category === "TITULOS") return "title";
  if (category === "TEMAS") return "theme";
  if (category === "EMBLEMAS") return "badge";

  return null;
}

function catalogProductToCosmetic(
  product?: StoreCatalogProduct | null,
): StoreCosmetic | null {
  if (!product?.id) {
    return null;
  }

  const type =
    storeProductType(
      product,
    );

  if (!type) {
    return null;
  }

  const icon =
    type === "frame"
      ? Shield
      : type === "background"
        ? Image
        : type === "title"
          ? Tag
          : type === "theme"
            ? Paintbrush
            : Medal;

  return {
    id:
      String(
        product.id,
      ),
    name:
      String(
        product.name ||
        product.id,
      ),
    label:
      String(
        product.name ||
        product.id,
      ),
    type,
    icon,
    image:
      product.image ||
      undefined,
    frameClass:
      type === "frame"
        ? "border-primary/60 bg-primary/10 shadow-[0_0_65px_hsl(var(--primary)/0.28)]"
        : undefined,
    titleClass:
      type === "title"
        ? "border-primary/25 bg-primary/10 text-primary"
        : undefined,
    badgeClass:
      type === "badge"
        ? "border-primary/25 bg-primary/10 text-primary"
        : undefined,
  };
}

const STORE_COSMETICS: StoreCosmetic[] = [
  {
    id: "frame-green",
    name: "Moldura GNR",
    label: "GNR",
    type: "frame",
    icon: Shield,
    image: "/Store/frames/GNR1_clean.png",
    frameClass:
      "border-primary/60 bg-primary/10 shadow-[0_0_55px_hsl(var(--primary)/0.22)]",
  },
  {
    id: "frame-gold",
    name: "Moldura Mérito Dourado",
    label: "Mérito",
    type: "frame",
    icon: Trophy,
    image: "/Store/frames/GNR1_clean.png",
    frameClass:
      "border-yellow-400/70 bg-yellow-500/10 shadow-[0_0_65px_rgba(250,204,21,0.28)]",
  },
  {
    id: "frame-command",
    name: "Moldura Comando-Geral",
    label: "Comando",
    type: "frame",
    icon: Crown,
    image: "/Store/frames/CG1_clean.png",
    frameClass:
      "border-yellow-300/80 bg-yellow-500/10 shadow-[0_0_80px_rgba(250,204,21,0.34)]",
  },
  {
    id: "frame-nic",
    name: "Moldura NIC — Investigação",
    label: "NIC",
    type: "frame",
    icon: FileSearch,
    image: "/Store/frames/NIC1_clean.png",
    frameClass:
      "border-blue-400/75 bg-blue-500/10 shadow-[0_0_70px_rgba(96,165,250,0.32)]",
  },
  {
    id: "frame-unt",
    name: "Moldura UNT — Trânsito",
    label: "UNT",
    type: "frame",
    icon: Radar,
    image: "/Store/frames/UNT1_clean.png",
    frameClass:
      "border-cyan-400/75 bg-cyan-500/10 shadow-[0_0_70px_rgba(34,211,238,0.32)]",
  },
  {
    id: "frame-gioe",
    name: "Moldura GIOE — Intervenção",
    label: "GIOE",
    type: "frame",
    icon: Target,
    image: "/Store/frames/GIOE1_clean.png",
    frameClass:
      "border-red-400/75 bg-red-500/10 shadow-[0_0_75px_rgba(248,113,113,0.35)]",
  },
  {
    id: "frame-ushe",
    name: "Moldura USHE — Honras",
    label: "USHE",
    type: "frame",
    icon: Landmark,
    image: "/Store/frames/CG1_clean.png",
    frameClass:
      "border-yellow-400/75 bg-yellow-500/10 shadow-[0_0_70px_rgba(250,204,21,0.32)]",
  },

  {
    id: "bg-command",
    name: "Fundo Comando-Geral",
    label: "Comando-Geral",
    type: "background",
    icon: Image,
    image: "/Store/backgrounds/CD.png",
    bgClass:
      "bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.18),transparent_34%),radial-gradient(circle_at_82%_78%,rgba(234,179,8,0.16),transparent_36%)]",
  },
  {
    id: "bg-nic",
    name: "Fundo NIC — Investigação Criminal",
    label: "Investigação Criminal",
    type: "background",
    icon: FileSearch,
    image: "/Store/badges/NIC.png",
  },
  {
    id: "bg-unt",
    name: "Fundo Patrulha Operacional",
    label: "Patrulha Operacional",
    type: "background",
    icon: Radar,
    image: "/Store/backgrounds/patrulha.png",
  },
  {
    id: "bg-tactical",
    name: "Fundo GSA — Suporte Aéreo",
    label: "GSA",
    type: "background",
    icon: Target,
    image: "/Store/backgrounds/GSA.png",
  },
  {
    id: "bg-ceremony",
    name: "Fundo Escola da Guarda",
    label: "Escola da Guarda",
    type: "background",
    icon: Landmark,
    image: "/Store/backgrounds/EG.png",
  },

  {
    id: "title-elite",
    name: "Título: Patrulheiro de Elite",
    label: "Patrulheiro de Elite",
    type: "title",
    icon: Tag,
    titleClass: "border-blue-400/25 bg-blue-500/10 text-blue-400",
  },
  {
    id: "title-guardian",
    name: "Título: Guardião da Central",
    label: "Guardião da Central",
    type: "title",
    icon: Crown,
    titleClass: "border-yellow-400/25 bg-yellow-500/10 text-yellow-400",
  },
  {
    id: "title-investigator",
    name: "Título: Investigador Nato",
    label: "Investigador Nato",
    type: "title",
    icon: FileSearch,
    titleClass: "border-blue-400/25 bg-blue-500/10 text-blue-400",
  },
  {
    id: "title-fiscalizador",
    name: "Título: Fiscalizador Nacional",
    label: "Fiscalizador Nacional",
    type: "title",
    icon: Radar,
    titleClass: "border-cyan-400/25 bg-cyan-500/10 text-cyan-400",
  },
  {
    id: "title-tactical",
    name: "Título: Operacional de Elite",
    label: "Operacional de Elite",
    type: "title",
    icon: Sword,
    titleClass: "border-red-400/25 bg-red-500/10 text-red-400",
  },
  {
    id: "title-honor",
    name: "Título: Honra e Dever",
    label: "Honra e Dever",
    type: "title",
    icon: Landmark,
    titleClass: "border-yellow-400/25 bg-yellow-500/10 text-yellow-400",
  },

  {
    id: "theme-green",
    name: "Tema Verde GNR",
    label: "Tema Verde GNR",
    type: "theme",
    icon: Paintbrush,
  },
  {
    id: "theme-blue",
    name: "Tema Investigação Azul",
    label: "Tema Investigação Azul",
    type: "theme",
    icon: Paintbrush,
  },
  {
    id: "theme-cyan",
    name: "Tema Trânsito Ciano",
    label: "Tema Trânsito Ciano",
    type: "theme",
    icon: Paintbrush,
  },
  {
    id: "theme-purple",
    name: "Tema Elite Roxo",
    label: "Tema Elite Roxo",
    type: "theme",
    icon: Paintbrush,
  },

  {
    id: "badge-nic",
    name: "Emblema Investigador Criminal",
    label: "NIC",
    type: "badge",
    icon: FileSearch,
    image: "/Store/badges/NIC.png",
    badgeClass: "border-blue-400/25 bg-blue-500/10 text-blue-400",
  },
  {
    id: "badge-unt",
    name: "Emblema Fiscalizador Nacional",
    label: "UNT",
    type: "badge",
    icon: Radar,
    image: "/Store/frames/UNT1_clean.png",
    badgeClass: "border-cyan-400/25 bg-cyan-500/10 text-cyan-400",
  },
  {
    id: "badge-gioe",
    name: "Emblema Operações Especiais",
    label: "GIOE",
    type: "badge",
    icon: Target,
    image: "/Store/badges/GIOE.png",
    badgeClass: "border-red-400/25 bg-red-500/10 text-red-400",
  },
  {
    id: "badge-ushe",
    name: "Emblema Honras de Estado",
    label: "USHE",
    type: "badge",
    icon: Landmark,
    image: "/Store/badges/MEDALHADO.png",
    badgeClass: "border-yellow-400/25 bg-yellow-500/10 text-yellow-400",
  },
  {
    id: "badge-di",
    name: "Emblema Disciplina e Inspeção",
    label: "DI",
    type: "badge",
    icon: Database,
    image: "/Store/badges/CG.png",
    badgeClass: "border-slate-300/25 bg-slate-400/10 text-slate-300",
  },
  {
    id: "badge-veteran",
    name: "Emblema Veterano",
    label: "Veterano",
    type: "badge",
    icon: Medal,
    image: "/Store/badges/VETERANO.png",
    badgeClass: "border-blue-400/25 bg-blue-500/10 text-blue-400",
  },
  {
    id: "badge-honor",
    name: "Emblema Medalhado",
    label: "Medalhado",
    type: "badge",
    icon: BadgeCheck,
    image: "/Store/badges/MEDALHADO.png",
    badgeClass: "border-yellow-400/25 bg-yellow-500/10 text-yellow-400",
  },
  {
    id: "badge-night",
    name: "Patrulheiro Noturno",
    label: "Noturno",
    type: "badge",
    icon: Eye,
    image: "/Store/badges/VETERANO.png",
    badgeClass: "border-indigo-400/25 bg-indigo-500/10 text-indigo-400",
  },
  {
    id: "exclusive-founder",
    name: "Emblema Fundador",
    label: "Fundador",
    type: "badge",
    icon: Sparkles,
    image: "/Store/badges/FUNDADOR.png",
    badgeClass: "border-cyan-300/25 bg-cyan-500/10 text-cyan-300",
  },
];

function getCosmetic(id?: string | null) {
  if (!id) return null;
  return STORE_COSMETICS.find((item) => item.id === id) || null;
}

function safeNumber(value: any) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function getGuardaId(guarda?: Guarda) {
  return String(guarda?.discordId || guarda?.id || "");
}

function getInitials(name?: string) {
  if (!name) return "??";

  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function getStatusStyle(estado?: string) {
  if (estado === "Em serviço") {
    return "border-emerald-500/25 bg-emerald-500/10 text-emerald-400";
  }

  if (estado === "Ausente") {
    return "border-red-500/25 bg-red-500/10 text-red-400";
  }

  return "border-yellow-500/25 bg-yellow-500/10 text-yellow-400";
}

function formatDate(value?: string) {
  if (!value) return "N/A";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateLong(value?: string) {
  if (!value) return "Data desconhecida";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Data desconhecida";

  return date.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function cleanRoleName(roleName?: string) {
  if (!roleName) return "Cargo desconhecido";

  return String(roleName)
    .replace(/^[^\wÀ-ÿ]+[\s|.-]*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isAuditEvent(event: CarreiraEvent) {
  return (
    event.tipo === "CARGO_ADICIONADO" ||
    event.tipo === "CARGO_REMOVIDO" ||
    event.origem?.toLowerCase().includes("audit")
  );
}

function getCareerEventStyle(tipo: CarreiraEvent["tipo"]) {
  if (tipo === "PROMOCAO") {
    return {
      label: "Promoção",
      icon: TrendingUp,
      border: "border-emerald-500/25",
      bg: "bg-emerald-500/10",
      text: "text-emerald-400",
      dot: "bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.75)]",
    };
  }

  if (tipo === "DESPROMOCAO") {
    return {
      label: "Despromoção",
      icon: TrendingDown,
      border: "border-red-500/25",
      bg: "bg-red-500/10",
      text: "text-red-400",
      dot: "bg-red-400 shadow-[0_0_18px_rgba(248,113,113,0.75)]",
    };
  }

  if (tipo === "MEDALHA") {
    return {
      label: "Medalha",
      icon: Medal,
      border: "border-yellow-500/25",
      bg: "bg-yellow-500/10",
      text: "text-yellow-400",
      dot: "bg-yellow-400 shadow-[0_0_18px_rgba(250,204,21,0.75)]",
    };
  }

  if (tipo === "ENTRADA_UNIDADE") {
    return {
      label: "Entrada em Unidade",
      icon: UserPlus,
      border: "border-blue-500/25",
      bg: "bg-blue-500/10",
      text: "text-blue-400",
      dot: "bg-blue-400 shadow-[0_0_18px_rgba(96,165,250,0.75)]",
    };
  }

  if (tipo === "SAIDA_UNIDADE") {
    return {
      label: "Saída de Unidade",
      icon: UserMinus,
      border: "border-orange-500/25",
      bg: "bg-orange-500/10",
      text: "text-orange-400",
      dot: "bg-orange-400 shadow-[0_0_18px_rgba(251,146,60,0.75)]",
    };
  }

  if (tipo === "CARGO_ADICIONADO") {
    return {
      label: "Cargo Adicionado",
      icon: PlusCircle,
      border: "border-cyan-500/25",
      bg: "bg-cyan-500/10",
      text: "text-cyan-400",
      dot: "bg-cyan-400 shadow-[0_0_18px_rgba(34,211,238,0.75)]",
    };
  }

  if (tipo === "CARGO_REMOVIDO") {
    return {
      label: "Cargo Removido",
      icon: MinusCircle,
      border: "border-pink-500/25",
      bg: "bg-pink-500/10",
      text: "text-pink-400",
      dot: "bg-pink-400 shadow-[0_0_18px_rgba(244,114,182,0.75)]",
    };
  }

  return {
    label: "Cargo",
    icon: BadgeCheck,
    border: "border-primary/25",
    bg: "bg-primary/10",
    text: "text-primary",
    dot: "bg-primary shadow-[0_0_18px_hsl(var(--primary)/0.75)]",
  };
}

function getCareerTitle(event: CarreiraEvent) {
  const role = cleanRoleName(event.roleName);
  const style = getCareerEventStyle(event.tipo);

  if (event.tipo === "MEDALHA") {
    return `Medalha atribuída: ${role}`;
  }

  if (event.tipo === "ENTRADA_UNIDADE") {
    return `Ingressou em ${role}`;
  }

  if (event.tipo === "SAIDA_UNIDADE") {
    return `Saiu de ${role}`;
  }

  if (event.tipo === "CARGO_ADICIONADO") {
    return `Cargo adicionado: ${role}`;
  }

  if (event.tipo === "CARGO_REMOVIDO") {
    return `Cargo removido: ${role}`;
  }

  if (event.tipo === "PROMOCAO") {
    return `Promoção para ${role}`;
  }

  if (event.tipo === "DESPROMOCAO") {
    return `Despromoção para ${role}`;
  }

  return `${style.label}: ${role}`;
}

function filterCareerEvents(events: CarreiraEvent[], filter: CareerFilter) {
  if (filter === "TODOS") return events;

  if (filter === "CARREIRA") {
    return events.filter(
      (event) => event.tipo === "PROMOCAO" || event.tipo === "DESPROMOCAO",
    );
  }

  if (filter === "UNIDADES") {
    return events.filter(
      (event) =>
        event.tipo === "ENTRADA_UNIDADE" || event.tipo === "SAIDA_UNIDADE",
    );
  }

  if (filter === "MEDALHAS") {
    return events.filter((event) => event.tipo === "MEDALHA");
  }

  if (filter === "AUDIT_LOG") {
    return events.filter(isAuditEvent);
  }

  return events;
}

export default function GuardaPerfil() {
const [
    dossierOpen,
    setDossierOpen,
  ] = useState(false);
const [, params] = useRoute("/guardas/:id");
  const guardaId = params?.id || "";

  const { user } = useAuth();

  const { guardas, currentHoras, horas, carreira, isLoading, storeInventory } =
    useData() as any;

  const [careerFilter, setCareerFilter] = useState<CareerFilter>("TODOS");
  const [selectedDisciplinary, setSelectedDisciplinary] =
    useState<DisciplinaryRecord | null>(null);
  const [activeProfileSection, setActiveProfileSection] =
    useState("resumo");

  function scrollToProfileSection(sectionId: string) {
    setActiveProfileSection(sectionId);
    document
      .getElementById(`perfil-${sectionId}`)
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  }

  const guarda = useMemo(() => {

  return (guardas || []).find((item: Guarda) => {
      const id = getGuardaId(item);
      return id === guardaId || String(item.id) === guardaId;
    }) as Guarda | undefined;
  }, [guardas, guardaId]);

  const guardaRealId = getGuardaId(guarda);

  const {
    data: disciplinaryData,
    isLoading: isDisciplinaryLoading,
    isError: isDisciplinaryError,
    error: disciplinaryError,
    refetch: refetchDisciplinary,
    isFetching: isDisciplinaryFetching,
  } = useQuery({
    queryKey: ["guard-disciplinary-history", guardaRealId],
    queryFn: () => fetchGuardDisciplinaryHistory(guardaRealId),
    enabled: Boolean(guardaRealId),
    refetchInterval: 60_000,
  });

  const {
    data: publicProfile,
    isLoading: isPublicProfileLoading,
    refetch: refetchPublicProfile,
  } = useQuery({
    queryKey: [
      "guard-public-profile",
      guardaRealId,
    ],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/guard-profiles/${encodeURIComponent(
          guardaRealId,
        )}`,
        {
          credentials: "include",
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        },
      );

      const payload =
        await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          payload?.error ||
            "Não foi possível carregar o perfil público.",
        );
      }

      return payload;
    },
    enabled: Boolean(guardaRealId),
    staleTime: 30_000,
  });

  const {
    data: fullProfile,
    refetch: refetchFullProfile,
  } = useQuery({
    queryKey: [
      "guard-full-profile",
      guardaRealId,
    ],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/guard-profiles/${encodeURIComponent(
          guardaRealId,
        )}/full`,
        {
          credentials: "include",
          cache: "no-store",
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
          "Não foi possível carregar o dossier completo.",
        );
      }

      return payload;
    },
    enabled:
      Boolean(
        guardaRealId,
      ),
    staleTime:
      20_000,
  });

  const {
    data: storeCatalogData,
  } = useQuery({
    queryKey: [
      "store-profile-catalog",
    ],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/store/items`,
        {
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
          "Não foi possível carregar o catálogo da loja.",
        );
      }

      return payload;
    },
    staleTime:
      60_000,
  });

  const storeCatalogItems =
    Array.isArray(
      storeCatalogData?.items,
    )
      ? storeCatalogData.items
      : [];

  const storeCosmeticsById =
    useMemo(() => {
      const entries =
        storeCatalogItems
          .map(
            (
              product: StoreCatalogProduct,
            ) => {
              const cosmetic =
                catalogProductToCosmetic(
                  product,
                );

              return cosmetic
                ? [
                    cosmetic.id,
                    cosmetic,
                  ] as const
                : null;
            },
          )
          .filter(Boolean) as Array<
            readonly [
              string,
              StoreCosmetic,
            ]
          >;

      return new Map(
        entries,
      );
    }, [
      storeCatalogItems,
    ]);

  const disciplinaryRecords = disciplinaryData?.items ?? [];

  const disciplinaryTimeline = useMemo<DisciplinaryTimelineEntry[]>(() => {
    const entries: DisciplinaryTimelineEntry[] = [];

    disciplinaryRecords.forEach((record) => {
      if (record.appliedAt) {
        entries.push({
          id: `${record._id}-applied`,
          kind: "APPLIED",
          at: record.appliedAt,
          label: `${getDisciplinaryTypeLabel(record.type)} aplicada`,
          source: "REGISTO_DISCIPLINAR",
          record,
        });
      }

      if (record.removedAt) {
        entries.push({
          id: `${record._id}-removed`,
          kind: "REMOVED",
          at: record.removedAt,
          label: `${getDisciplinaryTypeLabel(record.type)} retirada`,
          source: "DISCORD_ROLE",
          record,
        });
      }

      (record.events || []).forEach((event, index) => {
        const kind = normalizeDisciplinaryEventKind(event.type);

        const duplicatesApplied =
          kind === "APPLIED" &&
          record.appliedAt &&
          Math.abs(
            new Date(event.at).getTime() -
              new Date(record.appliedAt).getTime(),
          ) < 1_000;

        const duplicatesRemoved =
          kind === "REMOVED" &&
          record.removedAt &&
          Math.abs(
            new Date(event.at).getTime() -
              new Date(record.removedAt).getTime(),
          ) < 1_000;

        if (duplicatesApplied || duplicatesRemoved) return;

        entries.push({
          id: `${record._id}-${event.type}-${event.at}-${index}`,
          kind,
          at: event.at,
          label:
            event.label ||
            (kind === "REMOVED"
              ? `${getDisciplinaryTypeLabel(record.type)} retirada`
              : kind === "CHANGED"
                ? `${getDisciplinaryTypeLabel(record.type)} alterada`
                : kind === "SYNCED"
                  ? "Mensagem disciplinar sincronizada"
                  : `${getDisciplinaryTypeLabel(record.type)} aplicada`),
          source: event.source || "HISTÓRICO_DISCIPLINAR",
          record,
        });
      });
    });

    return entries.sort(
      (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
    );
  }, [disciplinaryRecords]);

  const disciplinaryStats = useMemo(() => {
    const active = disciplinaryRecords.filter(
      (record) => record.status === "ACTIVE",
    ).length;

    const first = disciplinaryRecords.filter(
      (record) => record.type === "FIRST_WARNING",
    ).length;

    const second = disciplinaryRecords.filter(
      (record) => record.type === "SECOND_WARNING",
    ).length;

    const suspensions = disciplinaryRecords.filter(
      (record) => record.type === "SUSPENSION",
    ).length;

    const removed = disciplinaryTimeline.filter(
      (entry) => entry.kind === "REMOVED",
    ).length;

    return {
      active,
      first,
      second,
      suspensions,
      removed,
      total: disciplinaryRecords.length,
    };
  }, [disciplinaryRecords, disciplinaryTimeline]);

  const viewerId =
    String(
      user?.id ||
      (user as any)?.discordId ||
      "",
    );

  const possibleProfileIds = [
    guardaId,
    guarda?.id,
    guarda?.discordId,
    guardaRealId,
  ]
    .map((value) =>
      String(value || ""),
    )
    .filter(Boolean);

  const isOwnProfile =
    Boolean(viewerId) &&
    possibleProfileIds.includes(
      viewerId,
    );

  /*
   * No perfil próprio, o inventário acabado de atualizar tem prioridade.
   * Isto evita o perfil público antigo esconder o fundo acabado de equipar.
   */
  const equippedStore =
    isOwnProfile
      ? (
          storeInventory?.equipped ||
          fullProfile?.cosmetics?.equipped ||
          publicProfile?.equipped ||
          {}
        )
      : (
          fullProfile?.cosmetics?.equipped ||
          publicProfile?.equipped ||
          {}
        );

  function resolveCosmetic(
    id?: string | null,
  ) {
    if (!id) {
      return null;
    }

    return (
      storeCosmeticsById.get(
        String(id),
      ) ||
      getCosmetic(
        String(id),
      ) ||
      null
    );
  }

  const equippedFrame =
    resolveCosmetic(
      equippedStore?.frame,
    );

  const equippedBackground =
    resolveCosmetic(
      equippedStore?.background,
    );

  const equippedTitle =
    resolveCosmetic(
      equippedStore?.title,
    );

  const equippedTheme =
    resolveCosmetic(
      equippedStore?.theme,
    );

  const equippedBadges =
    Array.isArray(
      equippedStore?.badges,
    )
      ? equippedStore.badges
          .map(
            (
              badgeId: string,
            ) =>
              resolveCosmetic(
                badgeId,
              ),
          )
          .filter(Boolean)
      : [];

  const currentMedals: CurrentMedal[] =
    Array.isArray(
      fullProfile?.awards?.current,
    )
      ? fullProfile.awards.current
      : [];

  const horasDoGuarda = useMemo(() => {
    return (currentHoras || []).filter((hora: Hora) => {
      return String(hora.guardaId || "") === guardaRealId;
    });
  }, [currentHoras, guardaRealId]);

  const historicoHoras = useMemo(() => {
    return (horas || []).filter((hora: Hora) => {
      return String(hora.guardaId || "") === guardaRealId;
    });
  }, [horas, guardaRealId]);

  const carreiraDoGuarda = useMemo(() => {
    return (carreira || [])
      .filter((evento: CarreiraEvent) => {
        return String(evento.userId || "") === guardaRealId;
      })
      .sort((a: CarreiraEvent, b: CarreiraEvent) => {
        return new Date(b.data).getTime() - new Date(a.data).getTime();
      });
  }, [carreira, guardaRealId]);

  const carreiraFiltrada = useMemo(() => {
    return filterCareerEvents(carreiraDoGuarda, careerFilter);
  }, [carreiraDoGuarda, careerFilter]);

  const carreiraStats = useMemo(() => {
    const promocoes = carreiraDoGuarda.filter(
      (e) => e.tipo === "PROMOCAO",
    ).length;
    const despromocoes = carreiraDoGuarda.filter(
      (e) => e.tipo === "DESPROMOCAO",
    ).length;
    const medalhas = carreiraDoGuarda.filter(
      (e) => e.tipo === "MEDALHA",
    ).length;

    const entradasUnidade = carreiraDoGuarda.filter(
      (e) => e.tipo === "ENTRADA_UNIDADE",
    ).length;

    const saidasUnidade = carreiraDoGuarda.filter(
      (e) => e.tipo === "SAIDA_UNIDADE",
    ).length;

    const auditLog = carreiraDoGuarda.filter(isAuditEvent).length;

    const primeiraEntrada =
      carreiraDoGuarda.length > 0
        ? [...carreiraDoGuarda].sort(
            (a, b) => new Date(a.data).getTime() - new Date(b.data).getTime(),
          )[0]
        : null;

    const ultimoEvento = carreiraDoGuarda[0] || null;

    return {
      promocoes,
      despromocoes,
      medalhas,
      entradasUnidade,
      saidasUnidade,
      auditLog,
      total: carreiraDoGuarda.length,
      primeiraEntrada,
      ultimoEvento,
    };
  }, [carreiraDoGuarda]);

  const filterCounts = useMemo(() => {
    return {
      TODOS: carreiraDoGuarda.length,
      CARREIRA: carreiraDoGuarda.filter(
        (e) => e.tipo === "PROMOCAO" || e.tipo === "DESPROMOCAO",
      ).length,
      UNIDADES: carreiraDoGuarda.filter(
        (e) => e.tipo === "ENTRADA_UNIDADE" || e.tipo === "SAIDA_UNIDADE",
      ).length,
      MEDALHAS: carreiraDoGuarda.filter((e) => e.tipo === "MEDALHA").length,
      AUDIT_LOG: carreiraDoGuarda.filter(isAuditEvent).length,
    };
  }, [carreiraDoGuarda]);

  const metrics = useMemo(() => {
    const totalPeriodo = horasDoGuarda.reduce(
      (acc: number, hora: Hora) => acc + safeNumber(hora.horasRegistadas),
      0,
    );

    const normais = horasDoGuarda.reduce(
      (acc: number, hora: Hora) => acc + safeNumber(hora.horasNormais),
      0,
    );

    const noturnas = horasDoGuarda.reduce(
      (acc: number, hora: Hora) => acc + safeNumber(hora.horasNoturnas),
      0,
    );

    const totalHistorico = historicoHoras.reduce(
      (acc: number, hora: Hora) => acc + safeNumber(hora.horasRegistadas),
      0,
    );

    return {
      totalPeriodo,
      normais,
      noturnas,
      totalHistorico,
      registos: horasDoGuarda.length,
    };
  }, [horasDoGuarda, historicoHoras]);

  const recentHoras = useMemo(() => {
    return [...horasDoGuarda]
      .sort((a: Hora, b: Hora) => {
        const timeA = a.dataRaw ? new Date(a.dataRaw).getTime() : 0;
        const timeB = b.dataRaw ? new Date(b.dataRaw).getTime() : 0;
        return timeB - timeA;
      })
      .slice(0, 8);
  }, [horasDoGuarda]);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-muted-foreground">
        A carregar perfil operacional...
      </div>
    );
  }

  if (!guarda) {
    return (
      <div className="space-y-6">
        <Button
          asChild
          variant="outline"
          className="rounded-2xl border-white/10"
        >
          <Link href="/guardas">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao Efetivo
          </Link>
        </Button>

        <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-8 text-red-400">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6" />
            <p className="font-black">Guarda não encontrado.</p>
          </div>
        </div>
      </div>
    );
  }

  const tags = guarda.discordTags || [];
  const ultimoEvento = carreiraStats.ultimoEvento;
  const ultimoEventoStyle = ultimoEvento
    ? getCareerEventStyle(ultimoEvento.tipo)
    : null;

  const backgroundImage = equippedBackground?.image;
  const backgroundClass = equippedBackground?.bgClass || "";

  const fullHoursSummary =
    fullProfile?.hours?.summary || {};

  const totalHours =
    safeNumber(
      fullHoursSummary.total,
    ) ||
    metrics.totalHistorico;

  const normalHours =
    safeNumber(
      fullHoursSummary.normal,
    ) ||
    metrics.normais;

  const nightHours =
    safeNumber(
      fullHoursSummary.night,
    ) ||
    metrics.noturnas;

  const activePoint =
    fullProfile?.operational?.activePoint ||
    null;

  const activeCP =
    fullProfile?.operational?.activeCP ||
    null;

  const commandedCPs =
    Array.isArray(
      fullProfile?.operational
        ?.commandedCPs,
    )
      ? fullProfile.operational
          .commandedCPs
      : [];

  const operationalPoints =
    Array.isArray(
      fullProfile?.operational
        ?.points,
    )
      ? fullProfile.operational
          .points
      : [];

  const operationalCPs =
    Array.isArray(
      fullProfile?.operational
        ?.cps,
    )
      ? fullProfile.operational
          .cps
      : [];

  const schoolStats =
    fullProfile?.school?.stats || {
      completedTrainings:
        0,
      approvedExams:
        0,
      certificates:
        0,
    };

  const awardsSummary =
    fullProfile?.awards || {
      total:
        currentMedals.length,
      points:
        0,
      topMedal:
        null,
    };

  const evaluationAverage =
    fullProfile?.evaluations
      ?.approvedAverage;

  const biography =
    String(
      fullProfile?.profile
        ?.biography ||
      publicProfile?.biography ||
      "",
    ).trim();

  const motto =
    String(
      fullProfile?.profile
        ?.motto ||
      publicProfile?.motto ||
      "",
    ).trim();

  const latestHour =
    Array.isArray(
      fullProfile?.hours?.latest,
    ) &&
    fullProfile.hours.latest
      .length > 0
      ? fullProfile.hours
          .latest[0]
      : recentHoras[0] ||
        null;

  const profileCompleteness =
    [
      guarda.nome,
      guarda.numero,
      guarda.avatar,
      guarda.posto,
      guarda.unidade,
      guarda.dataIngresso,
      biography,
      motto,
      equippedBackground,
      equippedFrame,
      equippedTitle,
      equippedBadges.length >
        0,
    ].filter(Boolean).length;

  const profileCompletionPercent =
    Math.round(
      (
        profileCompleteness /
        11
      ) *
      100,
    );

  const operationalState =
    activeCP
      ? {
          label:
            "Em patrulha",
          detail:
            activeCP?.zone ||
            activeCP?.zona ||
            activeCP?.vehicle ||
            activeCP?.viatura ||
            "Companhia de patrulha ativa",
          tone:
            "emerald",
        }
      : activePoint
        ? {
            label:
              "Em serviço",
            detail:
              activePoint?.status ||
              activePoint?.state ||
              "Ponto ativo",
            tone:
              "cyan",
          }
        : {
            label:
              guarda.isDiscordOnline
                ? "Disponível"
                : "Fora de serviço",
            detail:
              guarda.unidade ||
              "Sem unidade atribuída",
            tone:
              guarda.isDiscordOnline
                ? "emerald"
                : "neutral",
          };

  const rolePreview =
    tags.slice(
      0,
      5,
    );

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 18,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.42,
        ease: "easeOut",
      }}
      className="portal-profile-page profile-v9-interno space-y-6 pb-10"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Button
          asChild
          variant="outline"
          className="rounded-2xl border-white/10 bg-black/20 backdrop-blur-xl"
        >
          <Link href="/guardas">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao Efetivo
          </Link>
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] ${
              guarda.isOnDuty || guarda.estado === "Em serviço"
                ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
                : "border-white/10 bg-white/[0.035] text-white/45"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                guarda.isOnDuty || guarda.estado === "Em serviço"
                  ? "animate-pulse bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,.85)]"
                  : "bg-white/25"
              }`}
            />
            {guarda.isOnDuty || guarda.estado === "Em serviço"
              ? "Operacional em serviço"
              : "Fora de serviço"}
          </span>

          <Button
            type="button"
            variant="outline"
            onClick={() => window.print()}
            className="rounded-2xl border-white/10 bg-black/20 backdrop-blur-xl"
          >
            <Printer className="mr-2 h-4 w-4" />
            Imprimir dossier
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const url = window.location.href;
              navigator.clipboard?.writeText(url);
            }}
            className="rounded-2xl border-white/10 bg-black/20 backdrop-blur-xl"
          >
            <Copy className="mr-2 h-4 w-4" />
            Copiar link
          </Button>


          <Button
            type="button"
            onClick={() => setDossierOpen(true)}
            className="rounded-2xl bg-primary text-primary-foreground"
          >
            <FileArchive className="mr-2 h-4 w-4" />
            Ver dossier completo
          </Button>
        </div>
      </div>

      <ProfileSectionNavigation
        activeSection={activeProfileSection}
        onSelect={scrollToProfileSection}
      />

      <section
        id="perfil-resumo"
        className="profile-v43-shell theme-page-shell scroll-mt-28 overflow-hidden rounded-[1.7rem] border border-white/10 bg-[#1b2222] shadow-[0_36px_120px_rgba(0,0,0,.55)]"
      >
        <div className="profile-v43-cover relative min-h-[320px] overflow-hidden border-b border-white/10 md:min-h-[370px]">
          {backgroundImage ? (
            <img
              src={backgroundImage}
              alt={equippedBackground?.name || "Fundo de perfil equipado"}
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
          ) : (
            <div
              className={`absolute inset-0 ${
                backgroundClass ||
                "bg-[radial-gradient(circle_at_18%_20%,hsl(var(--primary)/.20),transparent_35%),radial-gradient(circle_at_82%_65%,rgba(234,179,8,.10),transparent_34%),linear-gradient(135deg,#07100d,#151c1a_55%,#080d0b)]"
              }`}
            />
          )}

          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,9,8,.06)_0%,rgba(6,9,8,.10)_35%,rgba(6,9,8,.18)_62%,rgba(27,34,34,.52)_100%)]" />
          <div className="profile-v43-grid absolute inset-0 opacity-20" />
        </div>

        <div className="profile-v43-content relative px-5 pb-6 pt-0 md:px-8 md:pb-8">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
            <div className="grid gap-4 lg:grid-cols-[210px_minmax(0,1fr)] lg:items-start">
              <div className="profile-v43-avatar-card theme-panel relative -mt-20 rounded-[1.6rem] border border-white/10 bg-[linear-gradient(180deg,rgba(10,14,14,.96),rgba(14,18,18,.88))] p-4 shadow-[0_26px_80px_rgba(0,0,0,.48)] md:-mt-24 md:p-5">
                <div className="absolute -inset-3 rounded-[2rem] bg-primary/12 blur-3xl" />

                <div className="profile-v43-avatar relative z-10 mx-auto h-36 w-36 overflow-hidden rounded-[1.35rem] border-4 border-[#1b2222] bg-black shadow-[0_24px_65px_rgba(0,0,0,.55)] md:h-44 md:w-44">
                  {guarda.avatar ? (
                    <img
                      src={guarda.avatar}
                      alt={guarda.nome || "Guarda"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-black/60 text-5xl font-black text-white/20">
                      {(guarda.nome || "G")
                        .slice(0, 1)
                        .toUpperCase()}
                    </div>
                  )}

                  {equippedFrame?.image && (
                    <img
                      src={equippedFrame.image}
                      alt=""
                      className="pointer-events-none absolute inset-0 h-full w-full object-contain"
                    />
                  )}
                </div>

                <div className="relative z-10 mt-4 flex flex-wrap items-center justify-center gap-2 text-center">
                  <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-[8px] font-black uppercase tracking-[.17em] text-primary">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    Militar verificado
                  </span>

                  <span
                    className={`inline-flex rounded-xl border px-3 py-1 text-[9px] font-black uppercase tracking-[.14em] ${getStatusStyle(
                      guarda.estado,
                    )}`}
                  >
                    {guarda.estado || "Folga"}
                  </span>
                </div>
              </div>

              <div className="profile-v43-identity-card theme-panel rounded-[1.45rem] border border-white/10 bg-[linear-gradient(135deg,rgba(24,31,31,.92),rgba(16,20,20,.82))] p-5 shadow-[0_24px_70px_rgba(0,0,0,.30)] md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-black/28 px-3 py-1.5 text-[8px] font-black uppercase tracking-[.18em] text-white/70">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Dossier verificado
                    </span>

                    <span
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[8px] font-black uppercase tracking-[.17em] ${
                        operationalState.tone === "emerald"
                          ? "border-emerald-400/25 bg-emerald-500/12 text-emerald-200"
                          : operationalState.tone === "cyan"
                            ? "border-cyan-400/25 bg-cyan-500/12 text-cyan-200"
                            : "border-white/15 bg-black/30 text-white/55"
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          operationalState.tone === "emerald"
                            ? "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.8)]"
                            : operationalState.tone === "cyan"
                              ? "bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,.8)]"
                              : "bg-white/30"
                        }`}
                      />
                      {operationalState.label}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="hidden rounded-full border border-white/12 bg-black/28 px-3 py-1.5 text-[8px] font-black uppercase tracking-[.15em] text-white/55 sm:inline-flex">
                      Perfil {profileCompletionPercent}% completo
                    </span>

                    {isOwnProfile && (
                      <Link
                        href="/definicoes/personalizacao-social"
                        className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-black/28 px-3 py-2 text-[8px] font-black uppercase tracking-[.15em] text-white/70 transition hover:border-primary/30 hover:text-primary"
                      >
                        <Paintbrush className="h-3.5 w-3.5" />
                        Personalizar
                      </Link>
                    )}
                  </div>
                </div>

                <h1 className="mt-5 break-words text-4xl font-black uppercase tracking-[-.045em] text-white drop-shadow-[0_7px_25px_rgba(0,0,0,.34)] md:text-5xl xl:text-6xl">
                  {guarda.numero && guarda.numero !== "N/A"
                    ? `${guarda.numero} | `
                    : ""}
                  {guarda.nome}
                </h1>

                {motto && (
                  <p className="mt-2 max-w-3xl text-sm font-bold italic leading-6 text-white/48">
                    “{motto}”
                  </p>
                )}

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/28 px-3 py-2 text-[9px] font-black uppercase tracking-[.12em] text-white/72">
                    <Crown className="h-4 w-4 text-primary" />
                    {guarda.posto || "Operacional"}
                  </span>

                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/28 px-3 py-2 text-[9px] font-black uppercase tracking-[.12em] text-white/72">
                    <Radio className="h-4 w-4 text-primary" />
                    {guarda.unidade || "Sem unidade"}
                  </span>

                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/28 px-3 py-2 text-[9px] font-black uppercase tracking-[.12em] text-white/72">
                    <Calendar className="h-4 w-4 text-primary" />
                    {formatDate(guarda.dataIngresso)}
                  </span>
                </div>
              </div>
            </div>

            <aside className="profile-v43-operational theme-panel rounded-[1.45rem] border border-white/10 bg-[linear-gradient(180deg,rgba(8,14,13,.88),rgba(8,14,13,.74))] p-5 shadow-[0_24px_70px_rgba(0,0,0,.28)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[8px] font-black uppercase tracking-[.2em] text-primary">
                    Estado operacional
                  </p>

                  <h2 className="mt-2 text-2xl font-black text-white">
                    {operationalState.label}
                  </h2>

                  <p className="mt-1 text-xs leading-5 text-white/42">
                    {operationalState.detail}
                  </p>
                </div>

                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${
                    activeCP
                      ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-300"
                      : activePoint
                        ? "border-cyan-400/25 bg-cyan-500/10 text-cyan-300"
                        : "border-white/10 bg-white/[.03] text-white/35"
                  }`}
                >
                  {activeCP ? (
                    <Radar className="h-5 w-5" />
                  ) : activePoint ? (
                    <Clock3 className="h-5 w-5" />
                  ) : (
                    <Shield className="h-5 w-5" />
                  )}
                </span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <OperationalMini
                  label="Ponto"
                  value={activePoint ? "Ativo" : "Fechado"}
                  active={Boolean(activePoint)}
                />

                <OperationalMini
                  label="CP"
                  value={activeCP ? "Ativa" : "Sem CP"}
                  active={Boolean(activeCP)}
                />

                <OperationalMini
                  label="CPs"
                  value={operationalCPs.length}
                />

                <OperationalMini
                  label="Comandadas"
                  value={commandedCPs.length}
                />
              </div>
            </aside>
          </div>
        </div>

  <div className="profile-v4-data theme-content-surface px-5 py-6 md:px-8 md:py-7">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(360px,.7fr)]">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <ProfileMetricCard
                label="Horas totais"
                value={`${totalHours.toFixed(1)}h`}
                detail={`${normalHours.toFixed(1)}h normais`}
                icon={Clock3}
                tone="emerald"
              />

              <ProfileMetricCard
                label="Horas noturnas"
                value={`${nightHours.toFixed(1)}h`}
                detail={`${metrics.registos} registos no período`}
                icon={Activity}
                tone="cyan"
              />

              <ProfileMetricCard
                label="Carreira"
                value={carreiraStats.total}
                detail={`${carreiraStats.promocoes} promoções`}
                icon={TrendingUp}
                tone="gold"
              />

              <ProfileMetricCard
                label="Disciplina"
                value={disciplinaryStats.active}
                detail={`${disciplinaryStats.total} registos totais`}
                icon={Gavel}
                tone={
                  disciplinaryStats.active > 0
                    ? "red"
                    : "emerald"
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <MiniInfo
                label="ID Militar"
                value={guardaRealId.slice(-8) || "N/A"}
                icon={<Hash className="h-4 w-4" />}
              />

              <MiniInfo
                label="Eventos"
                value={carreiraStats.total}
                icon={<History className="h-4 w-4" />}
              />

              <MiniInfo
                label="Medalhas"
                value={awardsSummary.total || currentMedals.length}
                icon={<Medal className="h-4 w-4" />}
              />

              <MiniInfo
                label="Honra"
                value={awardsSummary.points || 0}
                icon={<Trophy className="h-4 w-4" />}
              />
            </div>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
            <article className="profile-v4-intelligence rounded-[1.35rem] border border-white/10 bg-black/20 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[8px] font-black uppercase tracking-[.19em] text-primary">
                    Leitura operacional
                  </p>

                  <h3 className="mt-2 text-lg font-black text-white">
                    Dossier consolidado
                  </h3>
                </div>

                <Database className="h-5 w-5 text-primary" />
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <IntelRow
                  label="Último evento"
                  value={
                    ultimoEvento
                      ? ultimoEvento.descricao ||
                        ultimoEvento.tipo
                      : "Sem eventos registados"
                  }
                />

                <IntelRow
                  label="Último serviço"
                  value={
                    latestHour
                      ? latestHour.descricao ||
                        latestHour.tipo ||
                        formatDate(
                          latestHour.dataRaw ||
                          latestHour.data,
                        )
                      : "Sem serviço registado"
                  }
                />

                <IntelRow
                  label="Formação"
                  value={`${schoolStats.completedTrainings || 0} concluídas · ${schoolStats.approvedExams || 0} exames`}
                />

                <IntelRow
                  label="Avaliação"
                  value={
                    typeof evaluationAverage ===
                    "number"
                      ? `${evaluationAverage.toFixed(1)} valores`
                      : "Sem média aprovada"
                  }
                />
              </div>

              {biography && (
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/[.025] p-4">
                  <p className="text-[8px] font-black uppercase tracking-[.16em] text-white/30">
                    Nota biográfica
                  </p>

                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-white/50">
                    {biography}
                  </p>
                </div>
              )}
            </article>

            <article className="rounded-[1.35rem] border border-white/10 bg-black/20 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[8px] font-black uppercase tracking-[.19em] text-primary">
                    Formação e mérito
                  </p>

                  <h3 className="mt-2 text-lg font-black text-white">
                    Qualificações atuais
                  </h3>
                </div>

                <ListChecks className="h-5 w-5 text-primary" />
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3">
                <QualificationCard
                  label="Formações"
                  value={schoolStats.completedTrainings || 0}
                />

                <QualificationCard
                  label="Exames"
                  value={schoolStats.approvedExams || 0}
                />

                <QualificationCard
                  label="Certificados"
                  value={schoolStats.certificates || 0}
                />
              </div>

              {awardsSummary.topMedal && (
                <div className="mt-4 flex items-center gap-3 rounded-2xl border border-yellow-400/20 bg-yellow-500/[.07] p-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-yellow-400/20 bg-yellow-500/10 text-2xl">
                    {awardsSummary.topMedal.emoji || "🏅"}
                  </div>

                  <div className="min-w-0">
                    <p className="text-[8px] font-black uppercase tracking-[.15em] text-yellow-300">
                      Principal distinção
                    </p>

                    <p className="mt-1 truncate text-sm font-black text-white">
                      {awardsSummary.topMedal.name}
                    </p>
                  </div>
                </div>
              )}
            </article>
          </div>

          {(equippedTitle ||
            equippedBadges.length > 0 ||
            rolePreview.length > 0) && (
            <div className="mt-5 flex flex-wrap gap-2 border-t border-white/10 pt-5">
              {equippedTitle && (
                <span
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[9px] font-black uppercase tracking-[.16em] ${
                    equippedTitle.titleClass ||
                    "border-primary/25 bg-primary/10 text-primary"
                  }`}
                >
                  <equippedTitle.icon className="h-4 w-4" />
                  {equippedTitle.label}
                </span>
              )}

              {equippedBadges.map((badge: any) => {
                const Icon = badge.icon;

                return (
                  <span
                    key={badge.id}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[8px] font-black uppercase tracking-[.14em] ${
                      badge.badgeClass ||
                      "border-white/10 bg-white/[.035] text-white"
                    }`}
                  >
                    {badge.image ? (
                      <img
                        src={badge.image}
                        alt=""
                        className="h-5 w-5 rounded-md object-cover"
                      />
                    ) : (
                      <Icon className="h-3.5 w-3.5" />
                    )}
                    {badge.label}
                  </span>
                );
              })}

              {rolePreview.map((role) => (
                <span
                  key={role.id}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.025] px-3 py-2 text-[8px] font-black uppercase tracking-[.13em] text-white/40"
                >
                  <Tag className="h-3.5 w-3.5" />
                  {role.name}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="profile-v4-strip grid border-t border-white/10 sm:grid-cols-2 xl:grid-cols-5">
          <ProfileQuickStat
            label="Horas no período"
            value={`${metrics.totalPeriodo.toFixed(1)}h`}
            detail={`${metrics.registos} registos`}
            icon={Clock3}
          />

          <ProfileQuickStat
            label="Promoções"
            value={carreiraStats.promocoes}
            detail={`${carreiraStats.despromocoes} despromoções`}
            icon={TrendingUp}
          />

          <ProfileQuickStat
            label="Unidades"
            value={carreiraStats.entradasUnidade}
            detail={`${carreiraStats.saidasUnidade} saídas`}
            icon={Landmark}
          />

          <ProfileQuickStat
            label="Distinções"
            value={currentMedals.length || carreiraStats.medalhas}
            detail={`${awardsSummary.points || 0} pontos`}
            icon={Medal}
          />

          <ProfileQuickStat
            label="Cargos"
            value={tags.length}
            detail={`${operationalPoints.length} pontos históricos`}
            icon={BriefcaseBusiness}
          />
        </div>
      </section>

      {currentMedals.length > 0 && (
        <section
          id="perfil-medalhas-atuais"
          className="scroll-mt-28 rounded-[2.25rem] border border-yellow-400/15 bg-gradient-to-br from-yellow-500/[0.07] via-black/25 to-black/30 p-6 shadow-[0_24px_90px_rgba(0,0,0,.24)] md:p-7"
        >
          <SectionHeading
            eyebrow="Honra e distinções"
            title="Medalhas atualmente atribuídas"
            description="Esta lista é lida diretamente das roles atuais do militar no Discord, sem depender apenas do histórico de carreira."
            icon={Medal}
          />

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {currentMedals.map(
              (
                medal,
              ) => (
                <article
                  key={
                    medal.id
                  }
                  className="relative overflow-hidden rounded-3xl border border-yellow-400/20 bg-black/25 p-5"
                >
                  <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-yellow-400/10 blur-3xl" />

                  <div className="relative flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-yellow-400/20 bg-yellow-500/10 text-3xl">
                      {medal.emoji || "🏅"}
                    </div>

                    <div className="min-w-0">
                      <p className="font-black leading-6 text-white">
                        {medal.name}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {medal.shortName && (
                          <span className="rounded-full border border-yellow-400/20 bg-yellow-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-yellow-300">
                            {medal.shortName}
                          </span>
                        )}

                        {Number(
                          medal.points ||
                          0,
                        ) > 0 && (
                          <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-white/45">
                            {medal.points} pontos
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              ),
            )}
          </div>
        </section>
      )}

      <section className="grid gap-5 xl:grid-cols-[1.18fr_.82fr]">
        <div className="space-y-5">
          <GuardBiography
            profile={publicProfile}
            isOwnProfile={isOwnProfile}
            loading={isPublicProfileLoading}
            onSaved={() => {
              void refetchPublicProfile();
              void refetchFullProfile();
            }}
          />

          <ProfileSocialHub
            profileDiscordId={guardaRealId}
            currentUserId={String(user?.id || "")}
            profileName={guarda.nome || "Militar"}
          />

          {isOwnProfile && (
            <div className="flex justify-end">
              <Link
                href="/definicoes/personalizacao-social"
                className="inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-[8px] font-black uppercase tracking-[0.14em] text-primary transition hover:bg-primary/15"
              >
                <Paintbrush className="h-4 w-4" />
                Personalizar mural
              </Link>
            </div>
          )}
        </div>

        <div className="space-y-5">
          <PersonalizationCard
            frame={equippedFrame}
            background={equippedBackground}
            title={equippedTitle}
            theme={equippedTheme}
            badges={equippedBadges as StoreCosmetic[]}
          />

          {isOwnProfile && (
            <ProfileThemeSelector />
          )}
        </div>
      </section>

      <section
        id="perfil-horas-resumo"
        className="scroll-mt-28 rounded-[2.25rem] border border-white/10 bg-black/25 p-6 shadow-[0_24px_90px_rgba(0,0,0,.26)] md:p-7"
      >
        <SectionHeading
          eyebrow="Desempenho operacional"
          title="Horas e atividade no período"
          description="Distribuição entre serviço normal e noturno, com leitura rápida do desempenho."
          icon={Activity}
        />

        <div className="mt-6 grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
          <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
            <HourBar
              label="Horas normais"
              value={metrics.normais}
              total={Math.max(metrics.totalPeriodo, 1)}
              display={`${metrics.normais.toFixed(1)}h`}
            />

            <HourBar
              label="Horas noturnas"
              value={metrics.noturnas}
              total={Math.max(metrics.totalPeriodo, 1)}
              display={`${metrics.noturnas.toFixed(1)}h`}
            />

            <HourBar
              label="Período atual"
              value={metrics.totalPeriodo}
              total={Math.max(metrics.totalHistorico, metrics.totalPeriodo, 1)}
              display={`${metrics.totalPeriodo.toFixed(1)}h`}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <MetricCard
              title="Período"
              value={`${metrics.totalPeriodo.toFixed(1)}h`}
              subtitle="Filtro global"
              icon={<Clock className="h-5 w-5" />}
              tone="primary"
            />

            <MetricCard
              title="Histórico"
              value={`${metrics.totalHistorico.toFixed(1)}h`}
              subtitle="Total carregado"
              icon={<BadgeCheck className="h-5 w-5" />}
              tone="primary"
            />

            <MetricCard
              title="Normais"
              value={`${metrics.normais.toFixed(1)}h`}
              subtitle="10h00 às 19h00"
              icon={<Activity className="h-5 w-5" />}
              tone="green"
            />

            <MetricCard
              title="Noturnas"
              value={`${metrics.noturnas.toFixed(1)}h`}
              subtitle="19h01 às 09h59"
              icon={<Clock className="h-5 w-5" />}
              tone="blue"
            />
          </div>
        </div>
      </section>

      <DisciplinaryHistoryCard
        records={disciplinaryRecords}
        timeline={disciplinaryTimeline}
        stats={disciplinaryStats}
        isLoading={isDisciplinaryLoading}
        isError={isDisciplinaryError}
        error={
          disciplinaryError instanceof Error
            ? disciplinaryError.message
            : "Não foi possível carregar o histórico disciplinar."
        }
        isFetching={isDisciplinaryFetching}
        onRefresh={() => void refetchDisciplinary()}
        onOpen={setSelectedDisciplinary}
      />

      {selectedDisciplinary && (
        <DisciplinaryDetailsModal
          record={selectedDisciplinary}
          onClose={() => setSelectedDisciplinary(null)}
        />
      )}

      <section className="grid gap-6 xl:grid-cols-[1.12fr_.88fr]">
        <div
          id="perfil-historico"
          className="scroll-mt-28"
        >
          <CareerTimeline
            events={carreiraFiltrada}
            totalEvents={carreiraDoGuarda.length}
            filter={careerFilter}
            setFilter={setCareerFilter}
            filterCounts={filterCounts}
            currentRank={guarda.posto || "Operacional"}
            joinedAt={guarda.dataIngresso}
          />
        </div>

        <div className="space-y-6">
          <CareerSummaryCard
            carreiraStats={carreiraStats}
            currentRank={guarda.posto || "Operacional"}
          />

          <RolesCard tags={tags} />
        </div>
      </section>

      <section
        id="perfil-horas"
        className="scroll-mt-28 rounded-[2.2rem] border border-white/10 bg-black/25 p-6 shadow-[0_24px_90px_rgba(0,0,0,.25)]"
      >
        <SectionHeading
          eyebrow="Atividade recente"
          title="Últimos serviços registados"
          description="Consulta rápida aos últimos registos de horas do período selecionado."
          icon={Clock3}
        />

        {recentHoras.length > 0 ? (
          <div className="mt-6 grid gap-3 lg:grid-cols-2">
            {recentHoras.map((hora: Hora, index: number) => (
              <motion.article
                key={hora.id || index}
                initial={{
                  opacity: 0,
                  y: 10,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  delay: index * 0.035,
                }}
                className="group rounded-2xl border border-white/10 bg-white/[0.025] p-4 transition hover:border-primary/25 hover:bg-primary/[0.05]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate font-black text-white">
                      {hora.data || "N/A"} · {hora.tipo || "Serviço"}
                    </p>

                    <p className="mt-1 text-xs leading-5 text-white/35">
                      {hora.horaInicio || "N/A"} às {hora.horaFim || "N/A"}
                    </p>

                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-white/45">
                      {hora.descricao || "Serviço regular"}
                    </p>
                  </div>

                  <div className="shrink-0 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-right">
                    <p className="text-xl font-black text-primary">
                      {safeNumber(hora.horasRegistadas).toFixed(1)}h
                    </p>

                    <p className="mt-1 text-[8px] font-black uppercase tracking-[0.12em] text-primary/60">
                      Total
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                    <p className="text-[8px] font-black uppercase tracking-[0.12em] text-white/25">
                      Normais
                    </p>
                    <p className="mt-1 font-black text-white/70">
                      {safeNumber(hora.horasNormais).toFixed(1)}h
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                    <p className="text-[8px] font-black uppercase tracking-[0.12em] text-white/25">
                      Noturnas
                    </p>
                    <p className="mt-1 font-black text-white/70">
                      {safeNumber(hora.horasNoturnas).toFixed(1)}h
                    </p>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center text-sm text-white/35">
            Sem registos de horas no período atual.
          </div>
        )}
      </section>
      {dossierOpen && (
        <div
          className="fixed inset-0 z-[999999] overflow-y-auto bg-black/90 p-4 backdrop-blur-2xl"
          role="dialog"
          aria-modal="true"
        >
          <div className="mx-auto my-5 max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(145deg,rgba(18,24,24,.98),rgba(8,12,12,.98))] shadow-[0_40px_160px_rgba(0,0,0,.85)]">
            <header className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 p-6">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[.22em] text-primary">
                  Dossier completo
                </p>
                <h2 className="mt-2 text-3xl font-black text-white">
                  {guarda.numero && guarda.numero !== "N/A"
                    ? `${guarda.numero} | `
                    : ""}
                  {guarda.nome}
                </h2>
                <p className="mt-2 text-sm text-white/42">
                  Horas, CPs, cargos, avaliações, disciplina, formações, medalhas e histórico.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => setDossierOpen(false)}
                className="rounded-2xl border-white/10 bg-white/[.035]"
              >
                <X className="mr-2 h-4 w-4" />
                Fechar
              </Button>
            </header>

            <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
              <DossierStat label="Horas totais" value={`${totalHours.toFixed(1)}h`} detail={`${normalHours.toFixed(1)}h normais · ${nightHours.toFixed(1)}h noturnas`} />
              <DossierStat label="CPs" value={operationalCPs.length} detail={`${commandedCPs.length} comandadas`} />
              <DossierStat label="Carreira" value={carreiraStats.total} detail={`${carreiraStats.promocoes} promoções · ${carreiraStats.despromocoes} despromoções`} />
              <DossierStat label="Disciplina" value={disciplinaryStats.active} detail={`${disciplinaryStats.total} registos totais`} />
              <DossierStat label="Formações" value={schoolStats.completedTrainings || 0} detail={`${schoolStats.approvedExams || 0} exames · ${schoolStats.certificates || 0} certificados`} />
              <DossierStat label="Medalhas" value={awardsSummary.total || currentMedals.length} detail={`${awardsSummary.points || 0} pontos de honra`} />
              <DossierStat label="Cargos" value={tags.length} detail={rolePreview.map((role) => role.name).join(", ") || "Sem cargos destacados"} />
              <DossierStat label="Avaliações" value={typeof evaluationAverage === "number" ? evaluationAverage.toFixed(1) : "N/A"} detail="Média aprovada" />
            </div>

            <div className="grid gap-5 border-t border-white/10 p-6 xl:grid-cols-2">
              <section className="rounded-3xl border border-white/10 bg-white/[.025] p-5">
                <p className="text-[9px] font-black uppercase tracking-[.18em] text-primary">
                  Atividade recente
                </p>
                <div className="mt-4 space-y-3">
                  {[ultimoEvento, latestHour].filter(Boolean).map((entry: any, index) => (
                    <div
                      key={index}
                      className="rounded-2xl border border-white/10 bg-black/20 p-4"
                    >
                      <p className="text-sm font-black text-white">
                        {entry?.descricao || entry?.tipo || "Registo operacional"}
                      </p>
                      <p className="mt-1 text-xs text-white/35">
                        {formatDate(entry?.dataRaw || entry?.data || entry?.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-3xl border border-white/10 bg-white/[.025] p-5">
                <p className="text-[9px] font-black uppercase tracking-[.18em] text-primary">
                  Distinções principais
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {currentMedals.slice(0, 4).map((medal) => (
                    <div
                      key={medal.id}
                      className="rounded-2xl border border-yellow-400/20 bg-yellow-500/[.06] p-4"
                    >
                      <p className="text-2xl">{medal.emoji || "🏅"}</p>
                      <p className="mt-2 text-sm font-black text-white">{medal.name}</p>
                      <p className="mt-1 text-xs text-yellow-200/50">{medal.points || 0} pontos</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

    </motion.div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
  icon: Icon,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: React.ComponentType<{
    className?: string;
  }>;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-[0_0_28px_hsl(var(--primary)/.12)]">
          <Icon className="h-5 w-5" />
        </div>

        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">
            {eyebrow}
          </p>
          <h2 className="mt-2 text-2xl font-black text-white">
            {title}
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-white/40">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

function BannerQuickStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/28 px-3 py-3 text-center backdrop-blur-sm">
      <p className="text-[7px] font-black uppercase tracking-[.18em] text-white/28">
        {label}
      </p>

      <p className="mt-1 text-sm font-black text-white/80">
        {value}
      </p>
    </div>
  );
}

function DossierStat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <article className="rounded-3xl border border-white/10 bg-white/[.025] p-5">
      <p className="text-[8px] font-black uppercase tracking-[.18em] text-white/28">
        {label}
      </p>
      <p className="mt-3 text-3xl font-black text-white">
        {value}
      </p>
      <p className="mt-2 text-xs leading-5 text-white/38">
        {detail}
      </p>
    </article>
  );
}

function OperationalMini({
  label,
  value,
  active = false,
}: {
  label: string;
  value:
    | string
    | number;
  active?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-3 ${
        active
          ? "border-primary/25 bg-primary/[.08]"
          : "border-white/10 bg-white/[.025]"
      }`}
    >
      <p className="text-[7px] font-black uppercase tracking-[.16em] text-white/25">
        {label}
      </p>

      <p
        className={`mt-1 text-sm font-black ${
          active
            ? "text-primary"
            : "text-white/70"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function ProfileMetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value:
    | string
    | number;
  detail: string;
  icon: any;
  tone:
    | "emerald"
    | "cyan"
    | "gold"
    | "red";
}) {
  const tones = {
    emerald:
      "border-emerald-400/18 bg-emerald-500/[.055] text-emerald-300",
    cyan:
      "border-cyan-400/18 bg-cyan-500/[.055] text-cyan-300",
    gold:
      "border-yellow-400/18 bg-yellow-500/[.055] text-yellow-300",
    red:
      "border-red-400/18 bg-red-500/[.055] text-red-300",
  };

  return (
    <article
      className={`rounded-[1.2rem] border p-4 ${tones[tone]}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[7px] font-black uppercase tracking-[.17em] opacity-70">
            {label}
          </p>

          <p className="mt-3 text-2xl font-black text-white">
            {value}
          </p>

          <p className="mt-1 text-[10px] text-white/30">
            {detail}
          </p>
        </div>

        <Icon className="h-4 w-4" />
      </div>
    </article>
  );
}

function IntelRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.022] p-4">
      <p className="text-[7px] font-black uppercase tracking-[.17em] text-white/25">
        {label}
      </p>

      <p className="mt-2 line-clamp-2 text-sm font-bold leading-5 text-white/65">
        {value}
      </p>
    </div>
  );
}

function QualificationCard({
  label,
  value,
}: {
  label: string;
  value:
    | string
    | number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.025] p-3 text-center">
      <p className="text-xl font-black text-white">
        {value}
      </p>

      <p className="mt-1 text-[7px] font-black uppercase tracking-[.14em] text-white/25">
        {label}
      </p>
    </div>
  );
}

function ProfileQuickStat({
  label,
  value,
  detail,
  icon: Icon,
  warning = false,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: React.ComponentType<{
    className?: string;
  }>;
  warning?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 backdrop-blur-md ${
        warning
          ? "border-red-400/25 bg-red-500/[0.08]"
          : "border-white/10 bg-black/25"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[8px] font-black uppercase tracking-[0.16em] text-white/30">
          {label}
        </p>

        <Icon
          className={`h-4 w-4 ${
            warning
              ? "text-red-300"
              : "text-primary"
          }`}
        />
      </div>

      <p className="mt-3 text-2xl font-black text-white">
        {value}
      </p>

      <p
        className={`mt-1 text-[10px] font-bold ${
          warning
            ? "text-red-300/70"
            : "text-white/30"
        }`}
      >
        {detail}
      </p>
    </div>
  );
}

function OperationalStatusPanel({
  guarda,
  totalHours,
  latestEvent,
}: {
  guarda: Guarda;
  totalHours: number;
  latestEvent: string;
}) {
  const operational =
    guarda.isOnDuty ||
    guarda.estado === "Em serviço";

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/35 p-5">
      <div
        className={`absolute inset-y-0 left-0 w-1 ${
          operational
            ? "bg-emerald-400 shadow-[0_0_22px_rgba(52,211,153,.75)]"
            : "bg-primary shadow-[0_0_22px_hsl(var(--primary)/.65)]"
        }`}
      />

      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/30">
            Centro operacional
          </p>
          <p className="mt-2 text-xl font-black text-white">
            {operational
              ? "Militar em serviço"
              : "Militar disponível"}
          </p>
        </div>

        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${
            operational
              ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-300"
              : "border-primary/20 bg-primary/10 text-primary"
          }`}
        >
          {operational ? (
            <Activity className="h-5 w-5" />
          ) : (
            <Radio className="h-5 w-5" />
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
          <p className="text-[8px] font-black uppercase tracking-[0.14em] text-white/25">
            Horas acumuladas
          </p>
          <p className="mt-2 text-2xl font-black text-white">
            {totalHours.toFixed(1)}h
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
          <p className="text-[8px] font-black uppercase tracking-[0.14em] text-white/25">
            Unidade
          </p>
          <p className="mt-2 truncate text-base font-black text-white">
            {guarda.unidade || "Sem unidade"}
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-white/10 bg-black/25 p-4">
        <p className="text-[8px] font-black uppercase tracking-[0.14em] text-white/25">
          Último marco
        </p>
        <p className="mt-2 line-clamp-2 text-sm font-bold leading-5 text-white/65">
          {latestEvent}
        </p>
      </div>
    </div>
  );
}

function HourBar({
  label,
  value,
  total,
  display,
}: {
  label: string;
  value: number;
  total: number;
  display: string;
}) {
  const percentage = Math.max(
    0,
    Math.min(
      100,
      (value / Math.max(total, 1)) * 100,
    ),
  );

  return (
    <div className="mb-5 last:mb-0">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-bold text-white/55">
          {label}
        </p>

        <p className="font-black text-white">
          {display}
        </p>
      </div>

      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/5">
        <motion.div
          initial={{
            width: 0,
          }}
          animate={{
            width: `${percentage}%`,
          }}
          transition={{
            duration: 0.8,
            ease: "easeOut",
          }}
          className="h-full rounded-full bg-primary shadow-[0_0_18px_hsl(var(--primary)/.45)]"
        />
      </div>
    </div>
  );
}


function DisciplinaryHistoryCard({
  records,
  timeline,
  stats,
  isLoading,
  isError,
  error,
  isFetching,
  onRefresh,
  onOpen,
}: {
  records: DisciplinaryRecord[];
  timeline: DisciplinaryTimelineEntry[];
  stats: {
    active: number;
    first: number;
    second: number;
    suspensions: number;
    removed: number;
    total: number;
  };
  isLoading: boolean;
  isError: boolean;
  error: string;
  isFetching: boolean;
  onRefresh: () => void;
  onOpen: (record: DisciplinaryRecord) => void;
}) {
  return (
    <section id="perfil-disciplina" className="scroll-mt-28 relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#050b09]/85 p-6 shadow-[0_28px_100px_rgba(0,0,0,0.34)]">
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-yellow-500/10 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-red-500/[0.07] blur-[120px]" />

      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-yellow-400/20 bg-yellow-500/10 text-yellow-300">
            <Gavel className="h-5 w-5" />
          </div>

          <div>
            <h2 className="text-2xl font-black text-white">
              Histórico Disciplinar
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
              Aplicações, alterações e retiradas de repreensões ou suspensões
              sincronizadas automaticamente com o Discord.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isFetching}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-4 text-[10px] font-black uppercase tracking-[0.14em] text-primary transition hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCcw
            className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
          />
          {isFetching ? "A atualizar" : "Atualizar"}
        </button>
      </div>

      <div className="relative mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <DisciplinaryStat
          label="Ativos"
          value={stats.active}
          tone="green"
        />
        <DisciplinaryStat
          label="1.ª Repreensão"
          value={stats.first}
          tone="yellow"
        />
        <DisciplinaryStat
          label="2.ª Repreensão"
          value={stats.second}
          tone="orange"
        />
        <DisciplinaryStat
          label="Suspensões"
          value={stats.suspensions}
          tone="red"
        />
        <DisciplinaryStat
          label="Retiradas"
          value={stats.removed}
          tone="blue"
        />
        <DisciplinaryStat
          label="Processos"
          value={stats.total}
          tone="neutral"
        />
      </div>

      {isLoading && (
        <div className="relative mt-6 flex min-h-44 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.025]">
          <div className="text-center">
            <RefreshCcw className="mx-auto h-7 w-7 animate-spin text-primary" />
            <p className="mt-3 text-sm font-bold text-white">
              A carregar o histórico disciplinar...
            </p>
          </div>
        </div>
      )}

      {isError && (
        <div className="relative mt-6 rounded-3xl border border-red-400/20 bg-red-500/[0.07] p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
            <div>
              <p className="font-black text-white">
                Falha ao carregar o histórico
              </p>
              <p className="mt-1 text-sm text-red-100/60">{error}</p>
            </div>
          </div>
        </div>
      )}

      {!isLoading && !isError && timeline.length === 0 && (
        <div className="relative mt-6 rounded-3xl border border-white/10 bg-white/[0.025] p-6 text-center">
          <Shield className="mx-auto h-8 w-8 text-emerald-300" />
          <p className="mt-3 text-lg font-black text-white">
            Sem registos disciplinares
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Não existem repreensões, suspensões ou retiradas registadas para
            este militar.
          </p>
        </div>
      )}

      {!isLoading && !isError && timeline.length > 0 && (
        <div className="relative mt-7">
          <div className="absolute bottom-4 left-[21px] top-4 w-px bg-white/10" />

          <div className="space-y-4">
            {timeline.map((entry, index) => (
              <DisciplinaryTimelineItem
                key={entry.id}
                entry={entry}
                isLatest={index === 0}
                onOpen={() => onOpen(entry.record)}
              />
            ))}
          </div>
        </div>
      )}

      {!isLoading && !isError && records.length > 0 && (
        <p className="relative mt-5 text-[10px] font-bold uppercase tracking-[0.14em] text-white/25">
          Os processos permanecem no histórico mesmo depois de a sanção ser
          retirada.
        </p>
      )}
    </section>
  );
}

function DisciplinaryStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "green" | "yellow" | "orange" | "red" | "blue" | "neutral";
}) {
  const tones = {
    green:
      "border-emerald-400/20 bg-emerald-500/10 text-emerald-300",
    yellow:
      "border-yellow-400/20 bg-yellow-500/10 text-yellow-300",
    orange:
      "border-orange-400/20 bg-orange-500/10 text-orange-300",
    red: "border-red-400/20 bg-red-500/10 text-red-300",
    blue: "border-blue-400/20 bg-blue-500/10 text-blue-300",
    neutral: "border-white/10 bg-white/[0.035] text-white/55",
  };

  return (
    <div className={`rounded-2xl border p-4 ${tones[tone]}`}>
      <p className="text-[9px] font-black uppercase tracking-[0.14em] opacity-75">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function DisciplinaryTimelineItem({
  entry,
  isLatest,
  onOpen,
}: {
  entry: DisciplinaryTimelineEntry;
  isLatest: boolean;
  onOpen: () => void;
}) {
  const eventStyle = getDisciplinaryEventStyle(entry.kind);
  const typeStyle = getDisciplinaryTypeStyle(entry.record.type);
  const EventIcon = eventStyle.icon;

  return (
    <div className="relative flex gap-4">
      <div className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-[#050b09]">
        <span className={`h-3 w-3 rounded-full ${eventStyle.dot}`} />
      </div>

      <article
        className={`min-w-0 flex-1 rounded-3xl border p-4 ${eventStyle.border} ${eventStyle.bg}`}
      >
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-[0.13em] ${eventStyle.border} ${eventStyle.bg} ${eventStyle.text}`}
              >
                <EventIcon className="h-3.5 w-3.5" />
                {eventStyle.label}
              </span>

              <span
                className={`rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-[0.13em] ${typeStyle.border} ${typeStyle.bg} ${typeStyle.text}`}
              >
                {getDisciplinaryTypeLabel(entry.record.type)}
              </span>

              {isLatest && (
                <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.13em] text-primary">
                  Mais recente
                </span>
              )}

              {entry.record.status === "ACTIVE" && (
                <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.13em] text-emerald-300">
                  Ativo
                </span>
              )}
            </div>

            <h3 className="mt-3 text-lg font-black text-white">
              {entry.label}
            </h3>

            <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/50">
              {entry.record.reason ||
                entry.record.sanction ||
                entry.record.title}
            </p>

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[10px] font-bold uppercase tracking-[0.11em] text-white/30">
              <span>{formatDisciplinaryDate(entry.at)}</span>
              <span>
                Responsável:{" "}
                {entry.record.responsibleName || "Sincronização automática"}
              </span>
              <span>Origem: {entry.source}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpen}
            className={`inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border px-4 text-[9px] font-black uppercase tracking-[0.13em] transition ${typeStyle.button}`}
          >
            Ver processo
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </article>
    </div>
  );
}

function DisciplinaryDetailsModal({
  record,
  onClose,
}: {
  record: DisciplinaryRecord;
  onClose: () => void;
}) {
  const style = getDisciplinaryTypeStyle(record.type);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Fechar processo"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-black/80 backdrop-blur-md"
      />

      <div className="relative flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[#050a08] shadow-[0_45px_180px_rgba(0,0,0,0.88)]">
        <header className="shrink-0 border-b border-white/10 p-6">
          <div className="flex items-start justify-between gap-5">
            <div>
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-[0.14em] ${style.border} ${style.bg} ${style.text}`}
              >
                {getDisciplinaryTypeLabel(record.type)}
              </span>

              <h2 className="mt-3 text-2xl font-black uppercase text-white md:text-3xl">
                {record.title}
              </h2>

              <p className="mt-2 text-sm text-muted-foreground">
                Aplicado em {formatDisciplinaryDate(record.appliedAt)}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] text-white/40 transition hover:border-red-400/25 hover:bg-red-500/10 hover:text-red-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DisciplinaryDetail
              label="Estado"
              value={record.status === "ACTIVE" ? "Ativo" : record.status}
            />
            <DisciplinaryDetail
              label="Responsável"
              value={record.responsibleName || "Sincronização automática"}
            />
            <DisciplinaryDetail
              label="Aplicado em"
              value={formatDisciplinaryDate(record.appliedAt)}
            />
            <DisciplinaryDetail
              label="Retirado em"
              value={
                record.removedAt
                  ? formatDisciplinaryDate(record.removedAt)
                  : "Ainda não retirado"
              }
            />
          </div>

          {record.sanction && (
            <section
              className={`mt-5 rounded-2xl border p-5 ${style.border} ${style.bg}`}
            >
              <p
                className={`text-[9px] font-black uppercase tracking-[0.18em] ${style.text}`}
              >
                Sanção aplicada
              </p>
              <p className="mt-2 text-lg font-black uppercase text-white">
                {record.sanction}
              </p>
            </section>
          )}

          {record.reason && (
            <section className="mt-5 rounded-2xl border border-white/10 bg-white/[0.025] p-5">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-primary">
                Fundamentação
              </p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-white/60">
                {record.reason}
              </p>
            </section>
          )}

          {record.fullContent && (
            <section className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-5">
              <div className="flex items-center gap-2 text-primary">
                <FileWarning className="h-4 w-4" />
                <p className="text-[9px] font-black uppercase tracking-[0.18em]">
                  Publicação original
                </p>
              </div>

              <pre className="mt-4 whitespace-pre-wrap break-words font-sans text-sm leading-7 text-white/55">
                {record.fullContent}
              </pre>
            </section>
          )}

          {(record.events || []).length > 0 && (
            <section className="mt-5 rounded-2xl border border-white/10 bg-white/[0.025] p-5">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-primary">
                Eventos do processo
              </p>

              <div className="mt-4 space-y-3">
                {(record.events || []).map((event, index) => (
                  <div
                    key={`${event.type}-${event.at}-${index}`}
                    className="rounded-xl border border-white/[0.07] bg-black/20 p-4"
                  >
                    <p className="font-bold text-white">
                      {event.label || event.type}
                    </p>
                    <p className="mt-1 text-xs text-white/35">
                      {formatDisciplinaryDate(event.at)} ·{" "}
                      {event.source || "Histórico disciplinar"}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function DisciplinaryDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
      <p className="text-[9px] font-black uppercase tracking-[0.15em] text-white/30">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-bold text-white">
        {value}
      </p>
    </div>
  );
}

function PersonalizationCard({
  frame,
  background,
  title,
  theme,
  badges,
}: {
  frame: StoreCosmetic | null;
  background: StoreCosmetic | null;
  title: StoreCosmetic | null;
  theme: StoreCosmetic | null;
  badges: StoreCosmetic[];
}) {
  return (
    <section className="glass rounded-3xl border border-white/10 p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-yellow-400/20 bg-yellow-500/10 text-yellow-400">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-black text-white">
            Personalização Ativa
          </h2>
          <p className="text-sm text-muted-foreground">
            Itens equipados através da Loja da Guarda.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <CosmeticSlot label="Moldura" item={frame} fallback="Padrão" />
        <CosmeticSlot label="Fundo" item={background} fallback="Padrão" />
        <CosmeticSlot label="Título" item={title} fallback="Nenhum" />
        <CosmeticSlot label="Tema" item={theme} fallback="Padrão" />

        <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
            Emblemas
          </p>

          {badges.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {badges.map((badge) => {
                const Icon = badge.icon;

                return (
                  <span
                    key={badge.id}
                    title={badge.name}
                    className={`inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border ${
                      badge.badgeClass ||
                      "border-white/10 bg-white/[0.035] text-white"
                    }`}
                  >
                    {badge.image ? (
                      <img
                        src={badge.image}
                        alt={badge.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </span>
                );
              })}
            </div>
          ) : (
            <p className="mt-3 text-sm font-black text-white">Nenhum</p>
          )}
        </div>
      </div>
    </section>
  );
}

function CosmeticSlot({
  label,
  item,
  fallback,
}: {
  label: string;
  item: StoreCosmetic | null;
  fallback: string;
}) {
  const Icon = item?.icon || Sparkles;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025] p-4">
      {item?.image && (
        <>
          <img
            src={item.image}
            alt={item.name}
            className="absolute inset-0 h-full w-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-black/50" />
        </>
      )}

      <div className="relative">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
            {label}
          </p>
          <Icon className="h-4 w-4 text-primary" />
        </div>

        <p className="truncate text-sm font-black text-white">
          {item?.label || fallback}
        </p>
      </div>
    </div>
  );
}

function CareerTimeline({
  events,
  totalEvents,
  filter,
  setFilter,
  filterCounts,
  currentRank,
  joinedAt,
}: {
  events: CarreiraEvent[];
  totalEvents: number;
  filter: CareerFilter;
  setFilter: (filter: CareerFilter) => void;
  filterCounts: Record<CareerFilter, number>;
  currentRank: string;
  joinedAt?: string;
}) {
  const filters: {
    id: CareerFilter;
    label: string;
  }[] = [
    { id: "TODOS", label: "Todos" },
    { id: "CARREIRA", label: "Carreira" },
    { id: "UNIDADES", label: "Unidades" },
    { id: "MEDALHAS", label: "Medalhas" },
    { id: "AUDIT_LOG", label: "Audit Log" },
  ];

  return (
    <div className="glass relative overflow-hidden rounded-3xl border border-white/10 p-6">
      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-[120px]" />

      <div className="relative mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
            <ScrollText className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">
              Histórico de Carreira
            </h2>
            <p className="text-sm text-muted-foreground">
              Promoções, despromoções, medalhas, unidades e alterações do
              Discord.
            </p>
          </div>
        </div>

        <Badge className="w-fit rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-primary">
          {events.length}/{totalEvents} eventos
        </Badge>
      </div>

      <div className="relative mb-6 flex flex-wrap gap-2">
        {filters.map((item) => {
          const active = filter === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] transition-all ${
                active
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-white/10 bg-white/[0.025] text-muted-foreground hover:border-primary/25 hover:text-white"
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                {item.id === "TODOS" && <Filter className="h-3.5 w-3.5" />}
                {item.label}
                <span className="opacity-70">
                  ({filterCounts[item.id] || 0})
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {events.length > 0 ? (
        <div className="relative space-y-4">
          <div className="absolute left-[21px] top-2 h-[calc(100%-20px)] w-px bg-white/10" />

          {events.map((event, index) => (
            <CareerEventItem
              key={event.id || `${event.messageId}-${index}`}
              event={event}
              isFirst={index === 0 && filter === "TODOS"}
            />
          ))}
        </div>
      ) : (
        <div className="relative rounded-3xl border border-white/10 bg-white/[0.025] p-6">
          <div className="flex gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
              <Crown className="h-5 w-5" />
            </div>

            <div>
              <p className="text-lg font-black text-white">{currentRank}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Ainda não foram encontrados eventos neste filtro para este
                militar.
              </p>

              {joinedAt && joinedAt !== "N/A" && (
                <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-primary">
                  Entrada registada: {formatDate(joinedAt)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CareerEventItem({
  event,
  isFirst,
}: {
  event: CarreiraEvent;
  isFirst: boolean;
}) {
  const style = getCareerEventStyle(event.tipo);
  const Icon = style.icon;

  return (
    <div className="relative flex gap-4">
      <div className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-[#050b09]">
        <span className={`absolute h-3 w-3 rounded-full ${style.dot}`} />
      </div>

      <div
        className={`flex-1 rounded-3xl border p-4 ${style.border} ${style.bg}`}
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={`rounded-full px-3 py-1 ${style.border} ${style.bg} ${style.text}`}
              >
                <Icon className="mr-1 h-3.5 w-3.5" />
                {style.label}
              </Badge>

              {isFirst && (
                <Badge
                  variant="outline"
                  className="rounded-full border-accent/30 bg-accent/10 px-3 py-1 text-accent"
                >
                  Mais recente
                </Badge>
              )}

              {isAuditEvent(event) && (
                <Badge
                  variant="outline"
                  className="rounded-full border-cyan-500/25 bg-cyan-500/10 px-3 py-1 text-cyan-400"
                >
                  Audit Log
                </Badge>
              )}
            </div>

            <h3 className="text-lg font-black text-white">
              {getCareerTitle(event)}
            </h3>

            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Categoria:{" "}
              <span className="font-bold text-white">
                {event.categoria || "Geral"}
              </span>{" "}
              · Origem: {event.origem || "Histórico"}
            </p>

            {(event.executorName || event.reason) && (
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {event.executorName && (
                  <>
                    Executado por:{" "}
                    <span className="font-bold text-white">
                      {event.executorName}
                    </span>
                  </>
                )}

                {event.executorName && event.reason && " · "}

                {event.reason && (
                  <>
                    Motivo:{" "}
                    <span className="font-bold text-white">{event.reason}</span>
                  </>
                )}
              </p>
            )}
          </div>

          <div className="text-left md:text-right">
            <p className={`text-sm font-black ${style.text}`}>
              {formatDateLong(event.data)}
            </p>

            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              {event.messageId
                ? `Mensagem ${event.messageId.slice(-6)}`
                : event.channelId
                  ? `Canal ${event.channelId.slice(-6)}`
                  : "Registo interno"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CareerSummaryCard({
  carreiraStats,
  currentRank,
}: {
  carreiraStats: {
    promocoes: number;
    despromocoes: number;
    medalhas: number;
    entradasUnidade: number;
    saidasUnidade: number;
    auditLog: number;
    total: number;
    primeiraEntrada: CarreiraEvent | null;
    ultimoEvento: CarreiraEvent | null;
  };
  currentRank: string;
}) {
  return (
    <div className="glass rounded-3xl border border-white/10 p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-accent/20 bg-accent/10 text-accent">
          <Trophy className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-black text-white">Resumo da Carreira</h2>
          <p className="text-sm text-muted-foreground">
            Evolução completa do militar dentro da instituição.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <CareerStat
          label="Posto atual"
          value={currentRank}
          icon={<Crown className="h-4 w-4" />}
          tone="primary"
        />
        <CareerStat
          label="Eventos"
          value={carreiraStats.total}
          icon={<History className="h-4 w-4" />}
          tone="blue"
        />
        <CareerStat
          label="Promoções"
          value={carreiraStats.promocoes}
          icon={<TrendingUp className="h-4 w-4" />}
          tone="green"
        />
        <CareerStat
          label="Despromoções"
          value={carreiraStats.despromocoes}
          icon={<TrendingDown className="h-4 w-4" />}
          tone="red"
        />
        <CareerStat
          label="Medalhas"
          value={carreiraStats.medalhas}
          icon={<Medal className="h-4 w-4" />}
          tone="yellow"
        />
        <CareerStat
          label="Unidades"
          value={carreiraStats.entradasUnidade + carreiraStats.saidasUnidade}
          icon={<Radio className="h-4 w-4" />}
          tone="blue"
        />
        <CareerStat
          label="Audit Log"
          value={carreiraStats.auditLog}
          icon={<Database className="h-4 w-4" />}
          tone="cyan"
        />
        <CareerStat
          label="Último evento"
          value={
            carreiraStats.ultimoEvento
              ? getCareerEventStyle(carreiraStats.ultimoEvento.tipo).label
              : "N/A"
          }
          icon={<Sparkles className="h-4 w-4" />}
          tone="primary"
        />
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
          Primeiro registo encontrado
        </p>
        <p className="mt-2 text-sm font-black text-white">
          {carreiraStats.primeiraEntrada
            ? getCareerTitle(carreiraStats.primeiraEntrada)
            : "Sem registos no histórico"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {carreiraStats.primeiraEntrada
            ? formatDateLong(carreiraStats.primeiraEntrada.data)
            : "O histórico aparece assim que existirem eventos lidos dos canais ou Audit Log."}
        </p>
      </div>
    </div>
  );
}

function CareerStat({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  tone: "primary" | "green" | "yellow" | "blue" | "red" | "cyan";
}) {
  const toneMap = {
    primary: "border-primary/20 bg-primary/10 text-primary",
    green: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
    yellow: "border-yellow-500/20 bg-yellow-500/10 text-yellow-400",
    blue: "border-blue-500/20 bg-blue-500/10 text-blue-400",
    red: "border-red-500/20 bg-red-500/10 text-red-400",
    cyan: "border-cyan-500/20 bg-cyan-500/10 text-cyan-400",
  };

  return (
    <div className={`rounded-2xl border p-4 ${toneMap[tone]}`}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="truncate text-[10px] font-black uppercase tracking-[0.14em] opacity-80">
          {label}
        </p>
        {icon}
      </div>
      <p className="truncate text-lg font-black text-white">{value}</p>
    </div>
  );
}

function RolesCard({
  tags,
}: {
  tags: {
    id: string;
    name: string;
    color?: string | null;
  }[];
}) {
  return (
    <div className="glass rounded-3xl border border-white/10 p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
          <Tag className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-black text-white">Roles Discord</h2>
          <p className="text-sm text-muted-foreground">
            Cargos atuais sincronizados do Discord.
          </p>
        </div>
      </div>

      {tags.length > 0 ? (
        <div className="flex max-h-[420px] flex-wrap gap-2 overflow-y-auto pr-2">
          {tags.map((tag) => (
            <span
              key={tag.id}
              className="rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em]"
              style={{
                borderColor: tag.color || "rgba(255,255,255,0.12)",
                color: tag.color || "rgb(148,163,184)",
                backgroundColor: "rgba(255,255,255,0.035)",
              }}
              title={tag.id}
            >
              {tag.name}
            </span>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 text-sm text-muted-foreground">
          Sem roles disponíveis no perfil.
        </div>
      )}
    </div>
  );
}

function ProfileSectionNavigation({
  activeSection,
  onSelect,
}: {
  activeSection: string;
  onSelect: (sectionId: string) => void;
}) {
  const items = [
    { id: "resumo", label: "Resumo", icon: UserRound },
    { id: "carreira", label: "Carreira", icon: BriefcaseBusiness },
    { id: "horas", label: "Horas", icon: Clock3 },
    { id: "disciplina", label: "Disciplina", icon: ShieldCheck },
    { id: "historico", label: "Histórico", icon: ListChecks },
  ];

  return (
    <nav className="overflow-x-auto rounded-[1.5rem] border border-white/10 bg-[#050b09]/90 p-2 shadow-[0_16px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl print:hidden">
      <div className="flex min-w-max gap-2">
        {items.map((item) => {
          const Icon = item.icon;
          const active = activeSection === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-[9px] font-black uppercase tracking-[0.12em] transition ${
                active
                  ? "border-primary/25 bg-primary/10 text-primary"
                  : "border-white/10 bg-black/20 text-white/35 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function FrameAvatar({
  guarda,
  equippedFrame,
}: {
  guarda: Guarda;
  equippedFrame: StoreCosmetic | null;
}) {
  const frameId = equippedFrame?.id || "default";

  /**
   * Sistema de encaixe por moldura:
   * - o avatar fica por baixo;
   * - a moldura transparente fica por cima;
   * - cada moldura tem o seu próprio encaixe;
   * - object-cover mantém a foto sem deformar.
   *
   * Para afinar no futuro:
   * - left/top movem a foto dentro da moldura;
   * - h/w controlam o tamanho;
   * - avatarObjectPosition muda o foco da foto.
   */
  const frameLayouts: Record<
    string,
    {
      wrapper: string;
      frame: string;
      avatar: string;
      avatarRadius: string;
      avatarObjectPosition?: string;
      glow?: string;
      innerShadow?: string;
    }
  > = {
    default: {
      wrapper: "h-36 w-36",
      frame: "",
      avatar: "absolute inset-0 z-10",
      avatarRadius: "rounded-[2rem]",
      avatarObjectPosition: "center",
      glow: "bg-primary/15",
      innerShadow: "shadow-[0_0_45px_rgba(0,0,0,0.85)]",
    },

    "frame-green": {
      wrapper: "h-64 w-64",
      frame:
        "absolute inset-0 z-30 h-full w-full object-contain drop-shadow-[0_0_22px_rgba(16,185,129,0.24)]",
      avatar: "absolute left-[20%] top-[19%] z-10 h-[60%] w-[60%]",
      avatarRadius: "rounded-full",
      avatarObjectPosition: "center 30%",
      glow: "bg-primary/25",
      innerShadow: "shadow-[0_0_55px_rgba(0,0,0,0.92)]",
    },

    "frame-gold": {
      wrapper: "h-64 w-64",
      frame:
        "absolute inset-0 z-30 h-full w-full object-contain drop-shadow-[0_0_26px_rgba(250,204,21,0.24)]",
      avatar: "absolute left-[20%] top-[19%] z-10 h-[60%] w-[60%]",
      avatarRadius: "rounded-full",
      avatarObjectPosition: "center 30%",
      glow: "bg-yellow-400/22",
      innerShadow: "shadow-[0_0_55px_rgba(0,0,0,0.92)]",
    },

    "frame-command": {
      wrapper: "h-64 w-64",
      frame:
        "absolute inset-0 z-30 h-full w-full object-contain drop-shadow-[0_0_30px_rgba(250,204,21,0.26)]",
      avatar: "absolute left-[20%] top-[19%] z-10 h-[60%] w-[60%]",
      avatarRadius: "rounded-full",
      avatarObjectPosition: "center 30%",
      glow: "bg-yellow-400/26",
      innerShadow: "shadow-[0_0_55px_rgba(0,0,0,0.92)]",
    },

    "frame-ushe": {
      wrapper: "h-64 w-64",
      frame:
        "absolute inset-0 z-30 h-full w-full object-contain drop-shadow-[0_0_26px_rgba(250,204,21,0.22)]",
      avatar: "absolute left-[20%] top-[19%] z-10 h-[60%] w-[60%]",
      avatarRadius: "rounded-full",
      avatarObjectPosition: "center 30%",
      glow: "bg-yellow-400/22",
      innerShadow: "shadow-[0_0_55px_rgba(0,0,0,0.92)]",
    },

    "frame-nic": {
      wrapper: "h-56 w-56",
      frame:
        "absolute inset-0 z-30 h-full w-full object-contain drop-shadow-[0_0_28px_rgba(96,165,250,0.28)]",
      avatar: "absolute left-[18.5%] top-[18.5%] z-10 h-[63%] w-[63%]",
      avatarRadius: "rounded-full",
      avatarObjectPosition: "center top",
      glow: "bg-blue-400/22",
      innerShadow: "shadow-[0_0_55px_rgba(0,0,0,0.92)]",
    },

    "frame-unt": {
      wrapper: "h-56 w-56",
      frame:
        "absolute inset-0 z-30 h-full w-full object-contain drop-shadow-[0_0_28px_rgba(34,211,238,0.26)]",
      avatar: "absolute left-[20%] top-[18.5%] z-10 h-[60%] w-[60%]",
      avatarRadius: "rounded-full",
      avatarObjectPosition: "center top",
      glow: "bg-cyan-400/22",
      innerShadow: "shadow-[0_0_55px_rgba(0,0,0,0.92)]",
    },

    "frame-gioe": {
      wrapper: "h-56 w-56",
      frame:
        "absolute inset-0 z-30 h-full w-full object-contain drop-shadow-[0_0_32px_rgba(248,113,113,0.32)]",
      avatar: "absolute left-[18.5%] top-[18.5%] z-10 h-[63%] w-[63%]",
      avatarRadius: "rounded-full",
      avatarObjectPosition: "center top",
      glow: "bg-red-500/24",
      innerShadow: "shadow-[0_0_55px_rgba(0,0,0,0.92)]",
    },
  };

  const layout = frameLayouts[frameId] || frameLayouts.default;

  if (!equippedFrame?.image) {
    return (
      <div className="relative flex h-36 w-36 items-center justify-center overflow-hidden rounded-[2.2rem] border border-primary/30 bg-primary/10 text-3xl font-black text-white shadow-[0_0_55px_rgba(16,185,129,0.16)]">
        {guarda.avatar ? (
          <img
            src={guarda.avatar}
            alt={guarda.nome}
            className="h-full w-full object-cover"
          />
        ) : (
          <span>{getInitials(guarda.nome)}</span>
        )}
      </div>
    );
  }

  return (
    <div className={`relative shrink-0 ${layout.wrapper}`}>
      <div
        className={`absolute inset-5 rounded-full ${
          layout.glow || "bg-primary/20"
        } blur-2xl`}
      />

      <div
        className={`${layout.avatar} overflow-hidden ${layout.avatarRadius} border border-black/70 bg-black ${
          layout.innerShadow || "shadow-[0_0_45px_rgba(0,0,0,0.85)]"
        }`}
      >
        {guarda.avatar ? (
          <img
            src={guarda.avatar}
            alt={guarda.nome}
            className="h-full w-full object-cover"
            style={{ objectPosition: layout.avatarObjectPosition || "center" }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl font-black text-white">
            {getInitials(guarda.nome)}
          </div>
        )}
      </div>

      <img
        src={equippedFrame.image}
        alt={equippedFrame.name}
        className={layout.frame}
        onError={(event) => {
          const img = event.currentTarget;
          if (img.src.includes("_clean.png")) {
            img.src = img.src.replace("_clean.png", ".png");
          }
        }}
      />

      <div className="pointer-events-none absolute inset-0 z-50 rounded-[2.8rem] ring-1 ring-white/5" />
    </div>
  );
}

function MiniInfo({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-primary/20 bg-primary/10 p-4 text-primary">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] opacity-80">
          {label}
        </p>
        {icon}
      </div>
      <p className="truncate text-xl font-black text-white">{value}</p>
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  tone,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  tone: "primary" | "green" | "yellow" | "blue";
}) {
  const toneMap = {
    primary: "border-t-primary bg-primary/10 text-primary",
    green: "border-t-emerald-500 bg-emerald-500/10 text-emerald-400",
    yellow: "border-t-yellow-500 bg-yellow-500/10 text-yellow-400",
    blue: "border-t-blue-500 bg-blue-500/10 text-blue-400",
  };

  return (
    <div
      className={`glass rounded-3xl border border-white/10 border-t-2 p-5 ${toneMap[tone]}`}
    >
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-bold text-muted-foreground">{title}</p>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-current/10">
          {icon}
        </div>
      </div>

      <p className="truncate text-3xl font-black tracking-tight text-white">
        {value}
      </p>
      <p className="mt-2 truncate text-xs font-bold">{subtitle}</p>
    </div>
  );
}
