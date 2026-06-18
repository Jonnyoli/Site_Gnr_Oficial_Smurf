import {
  Crown,
  FileSearch,
  GraduationCap,
  Landmark,
  Plane,
  Radar,
  Shield,
  Sword,
  Target,
} from "lucide-react";

export type StoreUnitKey =
  | "GNR"
  | "COMANDO"
  | "NIC"
  | "GIOE"
  | "GSA"
  | "UNT"
  | "USHE"
  | "DI"
  | "ESCOLA";

export type StoreUnitDefinition = {
  key: StoreUnitKey;
  name: string;
  shortName: string;
  description: string;
  slogan: string;
  icon: any;
  gradient: string;
  border: string;
  text: string;
  glow: string;
  keywords: string[];
};

export const STORE_UNITS: StoreUnitDefinition[] = [
  {
    key: "GNR",
    name: "Guarda Nacional Republicana",
    shortName: "GNR",
    description:
      "Identidade institucional, patrulhamento e serviço público.",
    slogan:
      "Pela Lei e Pela Grei",
    icon: Shield,
    gradient:
      "from-emerald-500/20 via-green-950/20 to-black",
    border:
      "border-emerald-400/25",
    text:
      "text-emerald-300",
    glow:
      "shadow-[0_0_55px_rgba(52,211,153,.12)]",
    keywords: [
      "gnr",
      "guarda",
      "operacional",
      "patrulha",
      "institucional",
    ],
  },
  {
    key: "COMANDO",
    name: "Comando-Geral",
    shortName: "Comando",
    description:
      "Liderança, estratégia, autoridade e coordenação superior.",
    slogan:
      "Liderar com Honra",
    icon: Crown,
    gradient:
      "from-yellow-500/20 via-amber-950/20 to-black",
    border:
      "border-yellow-400/25",
    text:
      "text-yellow-300",
    glow:
      "shadow-[0_0_55px_rgba(250,204,21,.12)]",
    keywords: [
      "comando",
      "comando-geral",
      "command",
      "direção",
      "direcao",
      "general",
      "imperial",
    ],
  },
  {
    key: "NIC",
    name: "Núcleo de Investigação Criminal",
    shortName: "NIC",
    description:
      "Investigação, prova, inteligência e análise criminal.",
    slogan:
      "Investigar para Proteger",
    icon: FileSearch,
    gradient:
      "from-blue-500/20 via-slate-950/20 to-black",
    border:
      "border-blue-400/25",
    text:
      "text-blue-300",
    glow:
      "shadow-[0_0_55px_rgba(96,165,250,.13)]",
    keywords: [
      "nic",
      "investigação",
      "investigacao",
      "criminal",
      "intelligence",
      "classified",
      "detetive",
      "detective",
      "prova",
    ],
  },
  {
    key: "GIOE",
    name: "Grupo de Intervenção de Operações Especiais",
    shortName: "GIOE",
    description:
      "Intervenção tática, alto risco e resposta especial.",
    slogan:
      "Prontidão, Impacto e Precisão",
    icon: Target,
    gradient:
      "from-red-500/20 via-rose-950/20 to-black",
    border:
      "border-red-400/25",
    text:
      "text-red-300",
    glow:
      "shadow-[0_0_55px_rgba(248,113,113,.13)]",
    keywords: [
      "gioe",
      "operações especiais",
      "operacoes especiais",
      "tático",
      "tatico",
      "intervenção",
      "intervencao",
      "breach",
      "blackout",
      "redline",
    ],
  },
  {
    key: "GSA",
    name: "Grupo de Suporte Aéreo",
    shortName: "GSA",
    description:
      "Vigilância aérea, mobilidade rápida e apoio especializado.",
    slogan:
      "Olhos no Céu, Segurança no Terreno",
    icon: Plane,
    gradient:
      "from-sky-500/20 via-cyan-950/20 to-black",
    border:
      "border-sky-400/25",
    text:
      "text-sky-300",
    glow:
      "shadow-[0_0_55px_rgba(125,211,252,.13)]",
    keywords: [
      "gsa",
      "aéreo",
      "aereo",
      "helicóptero",
      "helicoptero",
      "flight",
      "aviation",
      "hangar",
      "sky",
    ],
  },
  {
    key: "UNT",
    name: "Unidade Nacional de Trânsito",
    shortName: "UNT",
    description:
      "Fiscalização, segurança rodoviária e mobilidade.",
    slogan:
      "Segurança em Movimento",
    icon: Radar,
    gradient:
      "from-cyan-500/20 via-slate-950/20 to-black",
    border:
      "border-cyan-400/25",
    text:
      "text-cyan-300",
    glow:
      "shadow-[0_0_55px_rgba(34,211,238,.13)]",
    keywords: [
      "unt",
      "trânsito",
      "transito",
      "rodoviário",
      "rodoviario",
      "fiscalização",
      "fiscalizacao",
      "highway",
      "road",
      "radar",
    ],
  },
  {
    key: "USHE",
    name: "Unidade de Segurança e Honras de Estado",
    shortName: "USHE",
    description:
      "Honra, protocolo, tradição e representação institucional.",
    slogan:
      "Honra, Disciplina e Tradição",
    icon: Landmark,
    gradient:
      "from-yellow-500/20 via-emerald-950/20 to-black",
    border:
      "border-yellow-300/25",
    text:
      "text-yellow-200",
    glow:
      "shadow-[0_0_55px_rgba(253,224,71,.12)]",
    keywords: [
      "ushe",
      "honra",
      "honras",
      "cerimonial",
      "cerimónia",
      "cerimonia",
      "royal",
      "protocolo",
      "estado",
    ],
  },
  {
    key: "DI",
    name: "Destacamento de Intervenção",
    shortName: "DI",
    description:
      "Controlo, intervenção, segurança e resposta operacional.",
    slogan:
      "Resposta, Controlo e Intervenção",
    icon: Sword,
    gradient:
      "from-slate-400/20 via-zinc-950/20 to-black",
    border:
      "border-slate-300/25",
    text:
      "text-slate-200",
    glow:
      "shadow-[0_0_55px_rgba(148,163,184,.12)]",
    keywords: [
      " di ",
      "di-",
      "intervenção",
      "intervencao",
      "disciplina",
      "inspeção",
      "inspecao",
      "controlo",
    ],
  },
  {
    key: "ESCOLA",
    name: "Escola da Guarda",
    shortName: "Escola",
    description:
      "Formação, exames, mérito académico e carreira.",
    slogan:
      "Formar para Servir",
    icon: GraduationCap,
    gradient:
      "from-orange-500/20 via-green-950/20 to-black",
    border:
      "border-orange-400/25",
    text:
      "text-orange-300",
    glow:
      "shadow-[0_0_55px_rgba(251,146,60,.12)]",
    keywords: [
      "escola",
      "academia",
      "formador",
      "formação",
      "formacao",
      "instrutor",
      "académico",
      "academico",
      "school",
    ],
  },
];

export function inferStoreUnitKey(
  item: any,
): StoreUnitKey {
  const explicit =
    String(
      item?.unitKey ||
      item?.metadata?.unitKey ||
      "",
    ).toUpperCase();

  if (
    STORE_UNITS.some(
      (
        unit,
      ) =>
        unit.key === explicit,
    )
  ) {
    return explicit as StoreUnitKey;
  }

  const searchText = [
    item?.id,
    item?.name,
    item?.description,
    item?.collection,
    item?.requirement,
    ...(Array.isArray(
      item?.requiredRoleKeys,
    )
      ? item.requiredRoleKeys
      : []),
    ...(Array.isArray(
      item?.tags,
    )
      ? item.tags
      : []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  for (
    const unit of
    STORE_UNITS.filter(
      (
        value,
      ) =>
        value.key !== "GNR",
    )
  ) {
    if (
      unit.keywords.some(
        (
          keyword,
        ) =>
          searchText.includes(
            keyword,
          ),
      )
    ) {
      return unit.key;
    }
  }

  return "GNR";
}

export function getStoreUnit(
  key?: string | null,
) {
  return (
    STORE_UNITS.find(
      (
        unit,
      ) =>
        unit.key === key,
    ) ||
    STORE_UNITS[0]
  );
}
