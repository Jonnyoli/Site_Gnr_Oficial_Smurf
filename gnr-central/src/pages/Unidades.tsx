import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Award,
  BadgeCheck,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Crosshair,
  Crown,
  Eye,
  FileSearch,
  Fingerprint,
  Flame,
  Gauge,
  GraduationCap,
  Landmark,
  Lock,
  MapPin,
  Plane,
  Radio,
  Route,
  Scale,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Zap,
  CalendarDays,
  ClipboardList,
  Plus,
  Trash2,
  Dumbbell,
  UserPlus,
  FileText,
  CircleCheckBig,
  CircleDashed,
  Save,
  X,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Paperclip,
  Send,
  Check,
  Gavel,
  UsersRound,
  Link2,
  ClipboardCheck,
  KeyRound,
  Stamp,
  History,
  UserCheck,
} from "lucide-react";
import { useData } from "../context/DataContext";
import UnitHubPanel from "../components/units/UnitHubPanel";

type UnitId = "GERAL" | "UNT" | "NIC" | "USHE" | "GIOE" | "GSA" | "DI";
type RealUnitId = Exclude<UnitId, "GERAL">;

type UnitConfig = {
  id: RealUnitId;
  name: string;
  short: string;
  slug: string;
  href: string;
  oldHref: string;
  roleId: string;
  discordRole: string;
  subtitle: string;
  overview: string;
  missionTitle: string;
  mission: string;
  icon: any;
  badge: string;
  clearance: string;
  tone: string;
  softTone: string;
  glow: string;
  text: string;
  button: string;
  image?: string;
  background?: string;
  motto?: string;
  functions: string[];
  objectives: string[];
  requirements: string[];
  focus: string[];
  statsLabels: string[];
  doctrine: {
    title: string;
    text: string;
    icon: any;
  }[];
};

export const UNITS: UnitConfig[] = [
  {
    id: "UNT",
    name: "Unidade Nacional de Trânsito",
    short: "UNT",
    slug: "unt",
    href: "/unidades/unt",
    oldHref: "/unt",
    roleId: "1147878941885988929",
    discordRole: "<@&1147878941885988929>",
    subtitle: "Fiscalização, segurança rodoviária, operações viárias e mobilidade.",
    overview:
      "A Unidade Nacional de Trânsito é uma unidade especializada com a missão de promover a segurança rodoviária, garantir a ordem no trânsito e atuar na prevenção de acidentes e no cumprimento das normas de circulação.",
    missionTitle: "Missão da UNT",
    mission:
      "Fiscalizar o cumprimento das normas de trânsito, realizar operações de segurança viária, executar campanhas educativas e colaborar com entidades públicas ou privadas na melhoria da mobilidade e segurança nas vias.",
    icon: Radio,
    badge: "Trânsito",
    clearance: "Rodoviário",
    tone: "border-cyan-400/25 bg-cyan-500/10",
    softTone: "border-cyan-400/15 bg-cyan-500/[0.06]",
    glow: "from-cyan-500/25 via-cyan-500/5 to-transparent",
    text: "text-cyan-300",
    button: "bg-cyan-400 text-black hover:bg-cyan-300",
    image: "/Store/frames/UNT1_clean.png",
    background: "/Store/backgrounds/patrulha.png",
    motto: "Segurança, fiscalização e responsabilidade no trânsito.",
    functions: [
      "Fiscalizar o cumprimento das normas de trânsito",
      "Realizar operações de segurança viária",
      "Reduzir acidentes e imprudências nas estradas",
      "Executar campanhas educativas de prevenção",
      "Apoiar políticas de mobilidade urbana",
    ],
    objectives: [
      "Reduzir acidentes e vítimas",
      "Promover educação rodoviária",
      "Assegurar punição de infrações",
      "Reforçar mobilidade segura",
    ],
    requirements: [
      "Boa condução",
      "Comunicação rádio",
      "Presença operacional",
      "Conhecimento de procedimentos",
    ],
    focus: ["STOPs", "CPs", "Fiscalização", "Patrulhamento"],
    statsLabels: ["STOPs", "CPs", "Patrulhas", "Operações"],
    doctrine: [
      {
        title: "Controlo viário",
        text: "Presença estratégica em vias de circulação, fiscalização e prevenção de comportamentos de risco.",
        icon: Route,
      },
      {
        title: "Educação rodoviária",
        text: "Campanhas preventivas e incentivo a uma cultura de responsabilidade no trânsito.",
        icon: Gauge,
      },
      {
        title: "Operações coordenadas",
        text: "Apoio a CPs, operações STOP e dispositivos de segurança viária.",
        icon: ShieldCheck,
      },
    ],
  },
  {
    id: "NIC",
    name: "Núcleo de Investigação Criminal",
    short: "NIC",
    slug: "nic",
    href: "/unidades/nic",
    oldHref: "/nic",
    roleId: "1296910359994564700",
    discordRole: "<@&1296910359994564700>",
    subtitle: "Investigação criminal, prova, mandados, suspeitos e análise.",
    overview:
      "O NIC é uma unidade especializada responsável pela investigação de crimes graves e complexos. Atua maioritariamente à paisana, desenvolvendo diligências, recolha de prova e apoio a processos operacionais sensíveis.",
    missionTitle: "Missão do NIC",
    mission:
      "Investigar crimes graves, recolher e preservar prova, analisar informação criminal, identificar suspeitos e apoiar outras entidades ou unidades em ações conjuntas.",
    icon: Search,
    badge: "Investigação",
    clearance: "Classificado",
    tone: "border-blue-400/25 bg-blue-500/10",
    softTone: "border-blue-400/15 bg-blue-500/[0.06]",
    glow: "from-blue-500/25 via-blue-500/5 to-transparent",
    text: "text-blue-300",
    button: "bg-blue-400 text-black hover:bg-blue-300",
    image: "/Store/frames/NIC1_clean.png",
    background: "/Store/backgrounds/NIC.png",
    motto: "Sigilo, prova e precisão operacional.",
    functions: [
      "Investigação de tráfico de droga",
      "Criminalidade violenta e grave",
      "Roubos e furtos",
      "Crimes contra pessoas",
      "Armas ilegais e explosivos",
      "Apoio a ações conjuntas",
    ],
    objectives: [
      "Recolher informação",
      "Preservar prova",
      "Apoiar investigações complexas",
      "Proteger a segurança nacional",
    ],
    requirements: [
      "Sigilo operacional",
      "Boa escrita",
      "Rigor nos relatórios",
      "Capacidade analítica",
    ],
    focus: ["Casos", "Provas", "Mandados", "Interrogatórios"],
    statsLabels: ["Casos", "Provas", "Mandados", "Suspeitos"],
    doctrine: [
      {
        title: "Recolha de prova",
        text: "Tratamento rigoroso de indícios, provas, testemunhos e informação operacional.",
        icon: FileSearch,
      },
      {
        title: "Análise criminal",
        text: "Cruzamento de dados, suspeitos, locais, mandados e linhas temporais.",
        icon: Eye,
      },
      {
        title: "Operação discreta",
        text: "Atuação reservada, sigilosa e orientada para resultados processuais.",
        icon: Lock,
      },
    ],
  },
  {
    id: "USHE",
    name: "Unidade de Segurança e Honras de Estado",
    short: "USHE",
    slug: "ushe",
    href: "/unidades/ushe",
    oldHref: "/ushe",
    roleId: "1332075102879219793",
    discordRole: "<@&1332075102879219793>",
    subtitle: "Honras de Estado, segurança protocolar, cerimónias e representação.",
    overview:
      "A USHE é uma subunidade operacional com competência para atuar em todo o território, destacando-se pela execução de serviços de segurança protocolar, honras de Estado e proteção de entidades oficiais.",
    missionTitle: "Missão da USHE",
    mission:
      "Executar honras de Estado, cerimónias oficiais, segurança e escolta de altas entidades, representação institucional e apoio a dispositivos de segurança em eventos oficiais.",
    icon: Landmark,
    badge: "Honras",
    clearance: "Protocolo",
    tone: "border-yellow-400/25 bg-yellow-500/10",
    softTone: "border-yellow-400/15 bg-yellow-500/[0.06]",
    glow: "from-yellow-500/25 via-yellow-500/5 to-transparent",
    text: "text-yellow-300",
    button: "bg-yellow-400 text-black hover:bg-yellow-300",
    image: "/Store/frames/CG1_clean.png",
    background: "/Store/backgrounds/EG.png",
    motto: "Honra, Disciplina e Excelência",
    functions: [
      "Honras de Estado e cerimónias oficiais",
      "Segurança e escolta de altas entidades",
      "Representação institucional da GNR",
      "Apoio em eventos oficiais",
      "Cumprimento de protocolos militares",
      "Cooperação em missões de segurança específica",
    ],
    objectives: [
      "Elevar a imagem institucional",
      "Garantir rigor cerimonial",
      "Proteger entidades oficiais",
      "Representar a Guarda com excelência",
    ],
    requirements: [
      "Postura exemplar",
      "Disciplina",
      "Apresentação",
      "Resistência física e mental",
    ],
    focus: ["Cerimónias", "Escoltas", "Honras", "Representação"],
    statsLabels: ["Cerimónias", "Escoltas", "Patrulhas", "Eventos"],
    doctrine: [
      {
        title: "Rigor cerimonial",
        text: "Execução exemplar de protocolos, honras e formalidades militares.",
        icon: Crown,
      },
      {
        title: "Proteção de entidades",
        text: "Escolta, segurança e acompanhamento de altas entidades e dignitários.",
        icon: ShieldCheck,
      },
      {
        title: "Representação",
        text: "Presença institucional com disciplina, postura e excelência.",
        icon: BadgeCheck,
      },
    ],
  },
  {
    id: "GIOE",
    name: "Grupo de Intervenção de Operações Especiais",
    short: "GIOE",
    slug: "gioe",
    href: "/unidades/gioe",
    oldHref: "/gioe",
    roleId: "1147878941974077473",
    discordRole: "<@&1147878941974077473>",
    subtitle: "Intervenção tática, operações especiais, rusgas e alto risco.",
    overview:
      "O GIOE é uma subunidade operacional com capacidade para atuar em qualquer ponto do território. É responsável por responder a situações complexas que excedem as capacidades técnicas e táticas das demais unidades.",
    missionTitle: "Missão da GIOE",
    mission:
      "Responder a incidentes de alto risco, apoiar o dispositivo territorial, executar operações especiais, cumprir mandados de detenção e intervir em situações de criminalidade violenta.",
    icon: Crosshair,
    badge: "Alto Risco",
    clearance: "Tático",
    tone: "border-red-400/25 bg-red-500/10",
    softTone: "border-red-400/15 bg-red-500/[0.06]",
    glow: "from-red-500/25 via-red-500/5 to-transparent",
    text: "text-red-300",
    button: "bg-red-400 text-black hover:bg-red-300",
    image: "/Store/frames/GIOE1_clean.png",
    background: "/Store/backgrounds/GSA.png",
    motto: "Prontidão Zero minutos",
    functions: [
      "Resposta tática a incidentes de alto risco",
      "Operações de contraterrorismo",
      "Cumprimento de mandados de detenção",
      "Segurança e proteção de altas patentes",
      "Investigação conjunta com o NIC",
      "Negociação em criminalidade violenta",
    ],
    objectives: [
      "Responder rapidamente a incidentes críticos",
      "Proteger forças policiais e civis",
      "Executar operações de alto risco",
      "Garantir eficácia tática máxima",
    ],
    requirements: [
      "Treino tático",
      "Força física",
      "Força mental",
      "Disciplina rádio",
    ],
    focus: ["Rusgas", "Treinos", "Operações", "Mandados"],
    statsLabels: ["Rusgas", "Treinos", "Operações", "Mandados"],
    doctrine: [
      {
        title: "Entrada tática",
        text: "Resposta a incidentes críticos, alto risco e situações de criminalidade violenta.",
        icon: Target,
      },
      {
        title: "Coordenação total",
        text: "Planeamento, comando, controlo e execução com disciplina absoluta.",
        icon: Crosshair,
      },
      {
        title: "Prontidão",
        text: "Disponibilidade operacional para atuação imediata perante ameaças complexas.",
        icon: Flame,
      },
    ],
  },
  {
    id: "GSA",
    name: "Grupo de Suporte Aéreo",
    short: "GSA",
    slug: "gsa",
    href: "/unidades/gsa",
    oldHref: "/gsa",
    roleId: "1147878941927952470",
    discordRole: "<@&1147878941927952470>",
    subtitle: "Vigilância aérea, apoio tático, resgate e reconhecimento.",
    overview:
      "O GSA é responsável por todas as operações aéreas da Guarda. Atua como apoio direto às forças no terreno, garantindo vigilância, mobilidade rápida e resposta imediata em situações complexas.",
    missionTitle: "Missão do GSA",
    mission:
      "Executar patrulhamento e vigilância aérea, apoiar subunidades em operações táticas, realizar resgate e evacuação, apoiar perseguições e formar pilotos e operadores aéreos.",
    icon: Plane,
    badge: "Aéreo",
    clearance: "Aeronáutico",
    tone: "border-emerald-400/25 bg-emerald-500/10",
    softTone: "border-emerald-400/15 bg-emerald-500/[0.06]",
    glow: "from-emerald-500/25 via-emerald-500/5 to-transparent",
    text: "text-emerald-300",
    button: "bg-emerald-400 text-black hover:bg-emerald-300",
    image: "/Store/backgrounds/GSA.png",
    background: "/Store/backgrounds/GSA.png",
    motto: "Olhos no céu, segurança no terreno.",
    functions: [
      "Patrulhamento e vigilância aérea",
      "Apoio tático a subunidades",
      "Resgate e evacuação de vítimas",
      "Apoio em perseguições",
      "Formação de pilotos e operadores",
      "Reconhecimento aéreo",
    ],
    objectives: [
      "Garantir visão aérea estratégica",
      "Aumentar rapidez de resposta",
      "Apoiar equipas terrestres",
      "Operar sob pressão com segurança",
    ],
    requirements: [
      "Responsabilidade",
      "Disciplina",
      "Coordenação",
      "Domínio de procedimentos de voo",
    ],
    focus: ["Vigilância", "Apoio aéreo", "Resgate", "Reconhecimento"],
    statsLabels: ["Voos", "Apoios", "Resgates", "Reconhecimentos"],
    doctrine: [
      {
        title: "Visão aérea",
        text: "Observação superior, reconhecimento e apoio direto às equipas no terreno.",
        icon: Eye,
      },
      {
        title: "Mobilidade rápida",
        text: "Resposta imediata em operações, perseguições e cenários críticos.",
        icon: Plane,
      },
      {
        title: "Suporte tático",
        text: "Integração com subunidades para reforço operacional e segurança.",
        icon: Shield,
      },
    ],
  },
  {
    id: "DI",
    name: "Destacamento de Intervenção",
    short: "DI",
    slug: "di",
    href: "/unidades/di",
    oldHref: "/di",
    roleId: "1187379939708780544",
    discordRole: "<@&1187379939708780544>",
    subtitle: "Ordem pública, grandes eventos, patrulhamento preventivo e intervenção.",
    overview:
      "O DI é uma subunidade especializada que atua em toda a zona territorial de Diamond, garantindo ordem pública e segurança em situações de maior exigência.",
    missionTitle: "Missão do DI",
    mission:
      "Garantir ordem pública, controlar multidões, apoiar grandes eventos, efetuar reconhecimentos prévios e patrulhar áreas sensíveis com maior incidência criminal.",
    icon: Scale,
    badge: "Intervenção",
    clearance: "Ordem Pública",
    tone: "border-slate-300/25 bg-slate-400/10",
    softTone: "border-slate-300/15 bg-slate-400/[0.06]",
    glow: "from-slate-400/20 via-slate-400/5 to-transparent",
    text: "text-slate-200",
    button: "bg-slate-200 text-black hover:bg-white",
    image: "/Store/badges/CG.png",
    background: "/Store/backgrounds/CD.png",
    motto: "Por todo o lado céleres sempre firmes",
    functions: [
      "Controlo e contenção de multidões",
      "Apoio em grandes eventos",
      "Reconhecimentos prévios",
      "Avaliação de riscos",
      "Controlo rigoroso de acessos",
      "Patrulhamento preventivo em áreas sensíveis",
    ],
    objectives: [
      "Manter ordem pública",
      "Reforçar presença dissuasora",
      "Proteger população de Diamond",
      "Atuar com versatilidade e mobilidade",
    ],
    requirements: [
      "Versatilidade",
      "Mobilidade",
      "Disponibilidade",
      "Rigor operacional",
    ],
    focus: ["Eventos", "Controlo", "Patrulhas", "Ordem pública"],
    statsLabels: ["Eventos", "Patrulhas", "Apoios", "Operações"],
    doctrine: [
      {
        title: "Ordem pública",
        text: "Controlo de multidões, segurança de eventos e contenção de situações complexas.",
        icon: Scale,
      },
      {
        title: "Presença dissuasora",
        text: "Patrulhamento preventivo em zonas sensíveis e com maior incidência criminal.",
        icon: ShieldCheck,
      },
      {
        title: "Resposta móvel",
        text: "Versatilidade, mobilidade e disponibilidade para proteger a população.",
        icon: Activity,
      },
    ],
  },
];


type WeeklyGoal = {
  id: string;
  label: string;
  target: number;
};

type ApiGoal = {
  goalId: string;
  label: string;
  target: number;
  automaticValue: number;
  manualAdjustment: number;
  current: number;
  completed: boolean;
};

type ApiProgress = {
  unit: string;
  weekStart: string;
  weekEnd: string;
  goals: ApiGoal[];
  percentage: number;
  completedActions: number;
  targetActions: number;
  lastCalculatedAt: string;
};

type UnitOperationStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "APPROVED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "OFFICIAL_DOCUMENT_ISSUED";

type UnitOperationCategory =
  | "STOP"
  | "MOTORIZED_PATROL"
  | "RECRUITMENT"
  | "TRAINING"
  | "CIVIL_SECURITY"
  | "URBAN_PATROL"
  | "RAID"
  | "HIGH_RISK"
  | "INVESTIGATION"
  | "INTELLIGENCE"
  | "EAGLE"
  | "PREVENTIVE_PATROL"
  | "JOINT_OPERATION"
  | "OTHER";

type OperationAttachment = {
  filename: string;
  url: string;
  contentType?: string | null;
  size?: number;
};

type OperationParticipant = {
  discordId: string;
  name: string;
  rank?: string | null;
  role?: string | null;
  canContribute?: boolean;
};

type ApprovalRecord = {
  status: "PENDING" | "APPROVED" | "CHANGES_REQUESTED" | "REJECTED";
  actorDiscordId?: string | null;
  actorName?: string | null;
  actorRoleId?: string | null;
  note?: string;
  at?: string | null;
  code?: string | null;
};

type OperationPermissionSet = {
  view: boolean;
  edit: boolean;
  submitReport: boolean;
  directorApprove: boolean;
  commandApprove: boolean;
  delete: boolean;
  issueDocument: boolean;
};

type AuditEvent = {
  type: string;
  actorDiscordId?: string | null;
  actorName?: string | null;
  at?: string;
  metadata?: Record<string, unknown>;
};

type UnitOperation = {
  _id: string;
  caseNumber?: string | null;
  title: string;
  category: UnitOperationCategory;
  primaryUnit: string;
  supportUnits: string[];
  isPrivateInvestigation?: boolean;
  status: UnitOperationStatus;
  reportStatus?:
    | "NOT_REQUIRED"
    | "DRAFT"
    | "PENDING_DIRECTOR"
    | "CHANGES_REQUESTED"
    | "DIRECTOR_APPROVED"
    | "PENDING_COMMAND"
    | "VALIDATED"
    | "REJECTED";
  commanderDiscordId?: string | null;
  commanderName?: string | null;
  participants?: OperationParticipant[];
  location?: string | null;
  briefing?: string;
  objective?: string;
  result?: string;
  finalReport?: string;
  reportRejectionReason?: string;
  resultMetrics?: {
    arrests?: number;
    seizures?: number;
    injured?: number;
    seizedVehicles?: number;
    fines?: number;
  };
  attachments?: OperationAttachment[];
  reportAttachments?: OperationAttachment[];
  scheduledAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  createdByDiscordId?: string;
  createdByName?: string;
  reportSubmittedByDiscordId?: string | null;
  reportSubmittedByName?: string | null;
  reportSubmittedAt?: string | null;
  directorApproval?: ApprovalRecord;
  commandApproval?: ApprovalRecord;
  officialDocument?: {
    issued?: boolean;
    issuedAt?: string | null;
    issuedByDiscordId?: string | null;
    issuedByName?: string | null;
    verificationCode?: string | null;
    documentHash?: string | null;
    fileUrl?: string | null;
    version?: number;
  };
  auditEvents?: AuditEvent[];
  permissions?: OperationPermissionSet;
};

type UnitPermissions = {
  view: boolean;
  create: boolean;
  manageAll: boolean;
  delete: boolean;
  director: boolean;
  command: boolean;
};

type UnitApiResponse = {
  unit: string;
  progress: ApiProgress;
  operations: UnitOperation[];
  goals: Array<{
    goalId: string;
    label: string;
    target: number;
  }>;
  permissions: UnitPermissions;
};

type UnitSummaryResponse = {
  items: ApiProgress[];
  canManage: boolean;
};

const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";

const OPERATION_CATEGORIES: Array<{
  value: UnitOperationCategory;
  label: string;
}> = [
  { value: "STOP", label: "Operação STOP" },
  { value: "MOTORIZED_PATROL", label: "CP / Patrulha motorizada" },
  { value: "RECRUITMENT", label: "Recrutamento" },
  { value: "TRAINING", label: "Treino / Formação" },
  { value: "CIVIL_SECURITY", label: "Controlo e segurança civil" },
  { value: "URBAN_PATROL", label: "Patrulha urbana" },
  { value: "RAID", label: "Rusga" },
  { value: "HIGH_RISK", label: "Operação de alto risco" },
  { value: "INVESTIGATION", label: "Investigação" },
  { value: "INTELLIGENCE", label: "Recolha de informação / provas" },
  { value: "EAGLE", label: "Unidade Eagle" },
  { value: "PREVENTIVE_PATROL", label: "Patrulha preventiva" },
  { value: "JOINT_OPERATION", label: "Operação conjunta" },
  { value: "OTHER", label: "Outra atividade" },
];

const STATUS_META: Record<
  UnitOperationStatus,
  { label: string; className: string }
> = {
  DRAFT: {
    label: "Rascunho",
    className: "border-white/15 bg-white/[0.06] text-white/55",
  },
  SUBMITTED: {
    label: "Submetida",
    className: "border-cyan-400/20 bg-cyan-500/10 text-cyan-300",
  },
  APPROVED: {
    label: "Aprovada",
    className: "border-blue-400/20 bg-blue-500/10 text-blue-300",
  },
  IN_PROGRESS: {
    label: "Em curso",
    className: "border-yellow-400/20 bg-yellow-500/10 text-yellow-300",
  },
  COMPLETED: {
    label: "Concluída",
    className: "border-emerald-400/20 bg-emerald-500/10 text-emerald-300",
  },
  CANCELLED: {
    label: "Cancelada",
    className: "border-red-400/20 bg-red-500/10 text-red-300",
  },
  OFFICIAL_DOCUMENT_ISSUED: {
    label: "Documento emitido",
    className: "border-violet-400/20 bg-violet-500/10 text-violet-300",
  },
};

async function unitApiRequest<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(options?.body ? { "Content-Type": "application/json" } : {}),
      ...(options?.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.error || `O pedido falhou com o código ${response.status}.`,
    );
  }

  return data as T;
}

function formatOperationDate(value?: string | null) {
  if (!value) return "Por definir";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Por definir";

  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

const WEEKLY_GOALS: Record<string, WeeklyGoal[]> = {
  UNT: [
    { id: "unt-stop", label: "Operação STOP", target: 1 },
    {
      id: "unt-cp",
      label: "CPs motorizadas ou patrulhas rodoviárias",
      target: 2,
    },
    {
      id: "unt-recruit-training",
      label: "Recrutamento / Treino / Formação",
      target: 1,
    },
  ],
  DI: [
    { id: "di-recruit", label: "Recrutamento", target: 1 },
    { id: "di-training", label: "Treino / Formação", target: 1 },
    {
      id: "di-civil-control",
      label: "Operações de controlo e segurança civil",
      target: 3,
    },
    {
      id: "di-ushe",
      label: "Patrulha conjunta com a USHE",
      target: 1,
    },
  ],
  USHE: [
    { id: "ushe-recruit", label: "Recrutamento", target: 1 },
    { id: "ushe-training", label: "Formação / Treino", target: 1 },
    { id: "ushe-urban", label: "Patrulhas urbanas", target: 2 },
    {
      id: "ushe-joint",
      label: "Operação conjunta com DI ou outra unidade",
      target: 1,
    },
  ],
  GIOE: [
    { id: "gioe-raids", label: "Rusgas obrigatórias", target: 2 },
    { id: "gioe-training", label: "Treino tático", target: 1 },
    {
      id: "gioe-high-risk",
      label: "Operação de alto risco ou apoio especial",
      target: 1,
    },
  ],
  NIC: [
    { id: "nic-recruit", label: "Recrutamento", target: 1 },
    {
      id: "nic-investigations",
      label: "Investigações ativas ou acompanhamentos criminais",
      target: 2,
    },
    {
      id: "nic-joint",
      label: "Operação conjunta com outra unidade",
      target: 1,
    },
    {
      id: "nic-intel",
      label: "Ações de recolha de informação/provas",
      target: 2,
    },
  ],
  GSA: [
    { id: "gsa-recruit", label: "Recrutamento", target: 1 },
    { id: "gsa-eagles", label: "Unidades Eagles obrigatórias", target: 4 },
    { id: "gsa-training", label: "Treino semanal", target: 1 },
    {
      id: "gsa-preventive",
      label: "Patrulha preventiva em zonas críticas",
      target: 1,
    },
  ],
  EG: [
    {
      id: "eg-recruitments",
      label: "Recrutamentos semanais mínimos",
      target: 2,
    },
  ],
};

const DEV_USER_ID = "713719718091030599";

function normalize(value: unknown) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getUnitById(id?: string | null) {
  const normalized = normalize(id);
  return (
    UNITS.find(
      (unit) =>
        unit.id === normalized ||
        normalize(unit.slug) === normalized ||
        normalize(unit.short) === normalized
    ) || null
  );
}

function collectRoleIds(guarda: any) {
  const values = [
    ...(Array.isArray(guarda?.roles) ? guarda.roles : []),
    ...(Array.isArray(guarda?.roleIds) ? guarda.roleIds : []),
    ...(Array.isArray(guarda?.discordRoles) ? guarda.discordRoles : []),
    ...(Array.isArray(guarda?.discordTags) ? guarda.discordTags : []),
    ...(Array.isArray(guarda?.savedTags) ? guarda.savedTags : []),
  ];

  return values.map(String);
}

function getUnitIdFromGuarda(guarda: any): RealUnitId | "OUTRA" {
  const roles = collectRoleIds(guarda);
  const byRole = UNITS.find((unit) => roles.includes(unit.roleId));

  if (byRole) return byRole.id;

  const raw = normalize(
    guarda?.unidade ||
      guarda?.unit ||
      guarda?.especialidade ||
      guarda?.division ||
      guarda?.subunidade ||
      guarda?.roleName ||
      ""
  );

  if (raw.includes("UNT") || raw.includes("TRANSITO")) return "UNT";
  if (raw.includes("NIC") || raw.includes("INVESTIGACAO")) return "NIC";
  if (raw.includes("USHE") || raw.includes("HONRAS")) return "USHE";
  if (raw.includes("GIOE")) return "GIOE";
  if (raw.includes("GSA") || raw.includes("AEREO") || raw.includes("AÉREO")) return "GSA";
  if (raw === "DI" || raw.includes("DISCIPLINA") || raw.includes("INTERVENCAO")) return "DI";

  return "OUTRA";
}

function getGuardaName(guarda: any) {
  return (
    guarda?.nome ||
    guarda?.warName ||
    guarda?.displayName ||
    guarda?.username ||
    "Militar"
  );
}

function getGuardaRank(guarda: any) {
  return (
    guarda?.posto ||
    guarda?.rank ||
    guarda?.hierarchyGroupLabel ||
    "Operacional"
  );
}

function getGuardaId(guarda: any) {
  return String(guarda?.discordId || guarda?.id || guarda?._id || "");
}

function buildUnitStats(guardas: any[], currentPatrulhas: any[], carreira: any[]) {
  const base = UNITS.reduce(
    (acc, unit) => {
      acc[unit.id] = {
        members: 0,
        active: 0,
        events: 0,
        patrols: 0,
        recentMembers: [] as any[],
      };
      return acc;
    },
    {} as Record<RealUnitId, any>
  );

  guardas.forEach((guarda: any) => {
    const unitId = getUnitIdFromGuarda(guarda);
    if (unitId === "OUTRA") return;

    base[unitId].members += 1;

    const estado = normalize(guarda?.estado || guarda?.status || guarda?.discordStatus || "");
    if (
      ["SERVICO", "SERVIÇO", "PATRULHA", "ATIVO", "ONLINE"].some((word) =>
        estado.includes(word)
      ) ||
      guarda?.isOnDuty ||
      guarda?.isDiscordOnline
    ) {
      base[unitId].active += 1;
    }

    base[unitId].recentMembers.push(guarda);
  });

  carreira.forEach((event: any) => {
    const raw = normalize(
      event?.unidade ||
        event?.unit ||
        event?.novaUnidade ||
        event?.descricao ||
        event?.roleName ||
        event?.categoria ||
        ""
    );

    const unit = UNITS.find((item) => raw.includes(item.id));
    if (unit) base[unit.id].events += 1;
  });

  currentPatrulhas.forEach((patrulha: any) => {
    const raw = normalize(
      patrulha?.unidade ||
        patrulha?.unit ||
        patrulha?.tipo ||
        patrulha?.descricao ||
        patrulha?.name ||
        ""
    );

    const unit = UNITS.find((item) => raw.includes(item.id));
    if (unit) base[unit.id].patrols += 1;
  });

  return base;
}

function useUnitContext() {
  const {
    currentPatrulhas,
    carreira,
  } =
    useData() as any;

  const [memberSummary, setMemberSummary] =
    useState<
      Record<
        RealUnitId,
        {
          members: any[];
          memberCount: number;
          activeCount: number;
        }
      >
    >({} as any);

  useEffect(() => {
    let cancelled = false;

    fetch(
      `${
        import.meta.env.VITE_API_URL?.replace(
          /\/$/,
          "",
        ) || ""
      }/api/unit-hub/summary`,
      {
        credentials:
          "include",
        headers: {
          Accept:
            "application/json",
        },
      },
    )
      .then(
        async (response) => {
          const data =
            await response
              .json()
              .catch(
                () => ({}),
              );

          if (!response.ok) {
            throw new Error(
              data?.error ||
              `Erro ${response.status}`,
            );
          }

          return data;
        },
      )
      .then((data) => {
        if (!cancelled) {
          setMemberSummary(
            data?.units ||
            {},
          );
        }
      })
      .catch((error) => {
        console.error(
          "[UNIT SUMMARY]",
          error,
        );

        if (!cancelled) {
          setMemberSummary(
            {} as any,
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const patrulhasArray =
    Array.isArray(
      currentPatrulhas,
    )
      ? currentPatrulhas
      : [];

  const carreiraArray =
    Array.isArray(
      carreira,
    )
      ? carreira
      : [];

  const unitStats =
    useMemo(() => {
      const base =
        UNITS.reduce(
          (
            acc,
            unit,
          ) => {
            const current =
              memberSummary[
                unit.id
              ];

            acc[unit.id] = {
              members:
                Number(
                  current
                    ?.memberCount ||
                  0,
                ),
              active:
                Number(
                  current
                    ?.activeCount ||
                  0,
                ),
              events: 0,
              patrols: 0,
              recentMembers:
                Array.isArray(
                  current?.members,
                )
                  ? current.members
                  : [],
            };

            return acc;
          },
          {} as Record<
            RealUnitId,
            any
          >,
        );

      carreiraArray.forEach(
        (event: any) => {
          const raw =
            normalize(
              event?.unidade ||
              event?.unit ||
              event?.novaUnidade ||
              event?.descricao ||
              event?.roleName ||
              event?.categoria ||
              "",
            );

          const unit =
            UNITS.find(
              (item) =>
                raw.includes(
                  item.id,
                ),
            );

          if (unit) {
            base[
              unit.id
            ].events += 1;
          }
        },
      );

      patrulhasArray.forEach(
        (patrulha: any) => {
          const raw =
            normalize(
              patrulha?.unidade ||
              patrulha?.unit ||
              patrulha?.tipo ||
              patrulha?.descricao ||
              patrulha?.name ||
              "",
            );

          const unit =
            UNITS.find(
              (item) =>
                raw.includes(
                  item.id,
                ),
            );

          if (unit) {
            base[
              unit.id
            ].patrols += 1;
          }
        },
      );

      return base;
    }, [
      memberSummary,
      patrulhasArray,
      carreiraArray,
    ]);

  const totals =
    useMemo(() => {
      const stats =
        Object.values(
          unitStats,
        );

      return {
        members:
          stats.reduce(
            (
              acc: number,
              stat: any,
            ) =>
              acc +
              Number(
                stat.members ||
                0,
              ),
            0,
          ),
        active:
          stats.reduce(
            (
              acc: number,
              stat: any,
            ) =>
              acc +
              Number(
                stat.active ||
                0,
              ),
            0,
          ),
        events:
          stats.reduce(
            (
              acc: number,
              stat: any,
            ) =>
              acc +
              Number(
                stat.events ||
                0,
              ),
            0,
          ),
        patrols:
          stats.reduce(
            (
              acc: number,
              stat: any,
            ) =>
              acc +
              Number(
                stat.patrols ||
                0,
              ),
            0,
          ),
      };
    }, [unitStats]);

  return {
    unitStats,
    totals,
  };
}

function getCurrentUnitFromLocation(location: string) {
  const slug = location.split("/").filter(Boolean).pop() || "";
  return getUnitById(slug);
}

export default function Unidades() {
  const [location] = useLocation();
  const unitFromRoute = location.startsWith("/unidades/") || location.match(/^\/(unt|nic|ushe|gioe|gsa|di)$/)
    ? getCurrentUnitFromLocation(location)
    : null;

  if (unitFromRoute) {
    return <UnitDetailView unit={unitFromRoute} />;
  }

  return <UnitsHub />;
}

export function UnidadeDetalhe() {
  const [location] = useLocation();
  const unit = getCurrentUnitFromLocation(location);

  if (!unit) {
    return (
      <div className="space-y-6">
        <Link
          href="/unidades"
          className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-white transition-all hover:border-primary/25 hover:bg-primary/10"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar às unidades
        </Link>

        <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-8 text-red-300">
          Unidade não encontrada.
        </div>
      </div>
    );
  }

  return <UnitDetailView unit={unit} />;
}


function UnitsHub() {
  const [selectedUnit, setSelectedUnit] = useState<RealUnitId>("GIOE");
  const { unitStats, totals } = useUnitContext();

  const selectedConfig = getUnitById(selectedUnit) || UNITS[0];
  const selectedStats = unitStats[selectedConfig.id];
  const SelectedIcon = selectedConfig.icon;

  const nextUnit = () => {
    const currentIndex = UNITS.findIndex((unit) => unit.id === selectedConfig.id);
    const nextIndex = (currentIndex + 1) % UNITS.length;
    setSelectedUnit(UNITS[nextIndex].id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="space-y-8"
    >
      <section className="relative min-h-[780px] overflow-hidden rounded-[3rem] border border-white/10 bg-black shadow-[0_48px_190px_rgba(0,0,0,0.75)]">
        <AnimatePresence mode="wait">
          {selectedConfig.background && (
            <motion.img
              key={selectedConfig.id}
              src={selectedConfig.background}
              alt={selectedConfig.short}
              initial={{ opacity: 0, scale: 1.06 }}
              animate={{ opacity: 0.42, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.6 }}
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
        </AnimatePresence>

        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/35" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/75" />
        <div className={`absolute inset-0 bg-gradient-to-br ${selectedConfig.glow}`} />
        <div className="absolute inset-0 cyber-grid-soft opacity-25" />

        <motion.div
          key={`unit-orb-${selectedConfig.id}`}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.55 }}
          className={`absolute -right-44 -top-44 h-[46rem] w-[46rem] rounded-full bg-gradient-to-br ${selectedConfig.glow} blur-[16px]`}
        />

        <div className="absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        <div className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        {selectedConfig.image && (
          <motion.img
            key={`unit-image-${selectedConfig.id}`}
            src={selectedConfig.image}
            alt={selectedConfig.short}
            initial={{ opacity: 0, x: 90, rotate: -4 }}
            animate={{ opacity: 0.24, x: 0, rotate: 0 }}
            transition={{ duration: 0.7 }}
            className="absolute -right-16 bottom-0 hidden h-[40rem] w-[40rem] object-contain lg:block"
          />
        )}

        <div className="relative grid min-h-[780px] grid-cols-1 gap-8 p-7 lg:grid-cols-[1fr_470px] xl:p-10">
          <div className="flex flex-col justify-between">
            <div>
              <div className="mb-8 flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-3 rounded-full border border-primary/25 bg-primary/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.26em] text-primary">
                  <Fingerprint className="h-4 w-4" />
                  Central cinematográfica de unidades
                </div>

                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white">
                  Sistema operacional
                </div>

                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">
                  Acesso validado
                </div>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedConfig.id}
                  initial={{ opacity: 0, y: 26 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -18 }}
                  transition={{ duration: 0.38 }}
                >
                  <div className={`mb-5 inline-flex items-center gap-3 rounded-2xl border border-current/20 bg-black/45 px-4 py-3 ${selectedConfig.text}`}>
                    <SelectedIcon className="h-5 w-5" />
                    <span className="text-[10px] font-black uppercase tracking-[0.22em]">
                      {selectedConfig.badge} · {selectedConfig.clearance}
                    </span>
                  </div>

                  <h1 className="max-w-5xl text-6xl font-black uppercase leading-[0.84] tracking-tight text-white md:text-8xl xl:text-9xl">
                    {selectedConfig.short}
                    <span className={`block text-4xl leading-none md:text-6xl xl:text-7xl ${selectedConfig.text}`}>
                      {selectedConfig.name}
                    </span>
                  </h1>

                  <p className="mt-7 max-w-3xl text-base leading-8 text-muted-foreground">
                    {selectedConfig.overview}
                  </p>

                  {selectedConfig.motto && (
                    <div className="mt-7 inline-flex max-w-full items-center gap-3 rounded-2xl border border-white/10 bg-black/45 px-5 py-4">
                      <Sparkles className={`h-5 w-5 shrink-0 ${selectedConfig.text}`} />
                      <p className="text-sm font-black uppercase tracking-[0.12em] text-white">
                        “{selectedConfig.motto}”
                      </p>
                    </div>
                  )}

                  <div className="mt-8 flex flex-wrap gap-3">
                    <Link
                      href={selectedConfig.href}
                      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-[0.18em] transition-all ${selectedConfig.button}`}
                    >
                      Aceder ao terminal
                      <ArrowRight className="h-4 w-4" />
                    </Link>

                    <button
                      type="button"
                      onClick={nextUnit}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-4 text-[10px] font-black uppercase tracking-[0.18em] text-white transition-all hover:border-primary/25 hover:bg-primary/10"
                    >
                      Próxima unidade
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
              <HeroMetric icon={Users} label="Elementos" value={totals.members} />
              <HeroMetric icon={Activity} label="Ativos" value={totals.active} />
              <HeroMetric icon={Clock3} label="Patrulhas" value={totals.patrols} />
              <HeroMetric icon={Award} label="Eventos" value={totals.events} />
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <OperationalPanel unit={selectedConfig} stats={selectedStats} />

            <div className="grid flex-1 grid-cols-1 gap-3 overflow-hidden rounded-[2.6rem] border border-white/10 bg-black/35 p-3">
              {UNITS.map((unit) => {
                const Icon = unit.icon;
                const active = selectedUnit === unit.id;

                return (
                  <button
                    key={unit.id}
                    type="button"
                    onClick={() => setSelectedUnit(unit.id)}
                    className={`group relative overflow-hidden rounded-[1.6rem] border p-4 text-left transition-all ${
                      active
                        ? `${unit.softTone} ring-2 ring-white/10`
                        : "border-white/10 bg-white/[0.025] hover:bg-white/[0.05]"
                    }`}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-r ${active ? unit.glow : "from-transparent to-transparent"}`} />
                    <div className="relative flex items-center gap-4">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-current/20 bg-black/40 ${active ? unit.text : "text-muted-foreground"}`}>
                        <Icon className="h-5 w-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-white">
                          {unit.short}
                        </p>
                        <p className="mt-1 truncate text-xs font-bold text-muted-foreground">
                          {unit.subtitle}
                        </p>
                      </div>

                      <ChevronRight className={`h-4 w-4 transition-transform group-hover:translate-x-1 ${active ? unit.text : "text-muted-foreground"}`} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {UNITS.map((unit, index) => (
          <UnitMiniPoster
            key={unit.id}
            unit={unit}
            stats={unitStats[unit.id]}
            index={index}
          />
        ))}
      </section>

      <WeeklyGoalsCommandOverview />
    </motion.div>
  );
}

function UnitMiniPoster({
  unit,
  stats,
  index,
}: {
  unit: UnitConfig;
  stats: any;
  index: number;
}) {
  const Icon = unit.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04 }}
      className={`group relative min-h-[300px] overflow-hidden rounded-[2.2rem] border ${unit.tone} bg-black shadow-[0_28px_100px_rgba(0,0,0,0.42)]`}
    >
      {unit.background && (
        <img
          src={unit.background}
          alt={unit.short}
          className="absolute inset-0 h-full w-full object-cover opacity-24 transition-transform duration-700 group-hover:scale-105"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-br from-black/86 via-black/60 to-black/88" />
      <div className={`absolute inset-0 bg-gradient-to-br ${unit.glow}`} />

      <div className="relative flex min-h-[300px] flex-col p-6">
        <div className="mb-5 flex items-start justify-between">
          <div className={`flex h-14 w-14 items-center justify-center rounded-2xl border border-current/20 bg-black/45 ${unit.text}`}>
            <Icon className="h-7 w-7" />
          </div>
          <span className={`rounded-full border border-current/20 bg-black/45 px-3 py-1 text-[9px] font-black uppercase tracking-[0.14em] ${unit.text}`}>
            {unit.badge}
          </span>
        </div>

        <h3 className="text-4xl font-black text-white">{unit.short}</h3>
        <p className="mt-2 text-sm font-bold text-muted-foreground">
          {unit.name}
        </p>

        <div className="mt-auto grid grid-cols-2 gap-3 pt-5">
          <MiniStat label="Elementos" value={stats.members} />
          <MiniStat label="Eventos" value={stats.events} />
        </div>

        <Link
          href={unit.href}
          className={`mt-4 inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-[10px] font-black uppercase tracking-[0.16em] transition-all ${unit.button}`}
        >
          Abrir
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </motion.div>
  );
}

function UnitDetailView({ unit }: { unit: UnitConfig }) {
  const { unitStats } = useUnitContext();
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    setBooting(true);
    const timeout = window.setTimeout(() => {
      setBooting(false);
    }, 1650);

    return () => window.clearTimeout(timeout);
  }, [unit.id]);

  const stats = unitStats[unit.id];
  const members = stats.recentMembers || [];
  const Icon = unit.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-8"
    >
      <AnimatePresence>
        {booting && <CinematicAccessScreen unit={unit} />}
      </AnimatePresence>

      <Link
        href="/unidades"
        className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-white transition-all hover:border-primary/25 hover:bg-primary/10"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar ao hub das unidades
      </Link>

      <section className={`relative min-h-[690px] overflow-hidden rounded-[3rem] border ${unit.tone} bg-black shadow-[0_44px_180px_rgba(0,0,0,0.68)]`}>
        {unit.background && (
          <img
            src={unit.background}
            alt={unit.short}
            className="absolute inset-0 h-full w-full object-cover opacity-38"
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/76 to-black/42" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/68" />
        <div className={`absolute inset-0 bg-gradient-to-br ${unit.glow}`} />
        <div className="absolute inset-0 cyber-grid-soft opacity-20" />

        <motion.div
          animate={{ opacity: [0.2, 0.38, 0.2], scale: [1, 1.04, 1] }}
          transition={{ duration: 5, repeat: Infinity }}
          className={`absolute -right-40 -top-40 h-[42rem] w-[42rem] rounded-full bg-gradient-to-br ${unit.glow} blur-[12px]`}
        />

        {unit.image && (
          <img
            src={unit.image}
            alt={unit.short}
            className="absolute -right-12 bottom-0 hidden h-[39rem] w-[39rem] object-contain opacity-18 xl:block"
          />
        )}

        <div className="relative grid min-h-[690px] grid-cols-1 gap-8 p-8 xl:grid-cols-[1fr_440px] xl:items-center xl:p-11">
          <div>
            <div className={`mb-7 inline-flex items-center gap-3 rounded-full border border-current/20 bg-black/45 px-4 py-2 text-[10px] font-black uppercase tracking-[0.26em] ${unit.text}`}>
              <Icon className="h-4 w-4" />
              Terminal restrito · {unit.clearance}
            </div>

            <h1 className="max-w-5xl text-6xl font-black uppercase leading-[0.86] tracking-tight text-white md:text-8xl">
              {unit.short}
              <span className={`block text-4xl md:text-6xl ${unit.text}`}>
                {unit.name}
              </span>
            </h1>

            <p className="mt-7 max-w-3xl text-base leading-8 text-muted-foreground">
              {unit.overview}
            </p>

            {unit.motto && (
              <div className="mt-7 inline-flex max-w-full items-center gap-3 rounded-2xl border border-white/10 bg-black/40 px-5 py-4">
                <Sparkles className={`h-5 w-5 shrink-0 ${unit.text}`} />
                <p className="text-sm font-black uppercase tracking-[0.12em] text-white">
                  “{unit.motto}”
                </p>
              </div>
            )}

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#manual"
                className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-[10px] font-black uppercase tracking-[0.16em] transition-all ${unit.button}`}
              >
                Abrir manual
                <ArrowRight className="h-4 w-4" />
              </a>

              <a
                href="#elementos"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-white transition-all hover:border-primary/25 hover:bg-primary/10"
              >
                Ver elementos
                <Users className="h-4 w-4" />
              </a>
            </div>
          </div>

          <OperationalPanel unit={unit} stats={stats} />
        </div>
      </section>

      <section className="sticky top-4 z-20 -mx-1 overflow-x-auto rounded-[1.6rem] border border-white/10 bg-black/45 p-2 backdrop-blur-2xl">
        <div className="flex min-w-max gap-2">
          <a href="#manual" className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-white hover:border-primary/25">
            Manual
          </a>
          <a href="#doutrina" className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-white hover:border-primary/25">
            Doutrina
          </a>
          <a href="#elementos" className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-white hover:border-primary/25">
            Elementos
          </a>
          <a href="#requisitos" className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-white hover:border-primary/25">
            Requisitos
          </a>
        </div>
      </section>

      <UnitOperationsSuite unit={unit} stats={stats} members={members} />

      <section id="manual" className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_430px]">
        <div className="space-y-5">
          <ManualSection
            unit={unit}
            title={unit.missionTitle}
            text={unit.mission}
            icon={ShieldCheck}
          />

          <InfoPanel unit={unit} title="Funções principais" items={unit.functions} />
          <InfoPanel unit={unit} title="Objetivos" items={unit.objectives} />
        </div>

        <div className="space-y-5">
          <div id="requisitos" className={`relative overflow-hidden rounded-[2.2rem] border ${unit.softTone} p-5`}>
            <div className={`absolute inset-0 bg-gradient-to-br ${unit.glow}`} />
            <div className="relative">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-current/20 bg-black/35">
                  <Zap className={`h-5 w-5 ${unit.text}`} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">
                    Requisitos
                  </p>
                  <h2 className="text-xl font-black text-white">
                    Perfil ideal
                  </h2>
                </div>
              </div>

              <div className="space-y-2">
                {unit.requirements.map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 p-3"
                  >
                    <CheckCircle2 className={`h-4 w-4 ${unit.text}`} />
                    <span className="text-sm font-bold text-white">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={`relative overflow-hidden rounded-[2.2rem] border ${unit.softTone} p-5`}>
            <div className="relative mb-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">
                  Foco operacional
                </p>
                <h2 className="text-xl font-black text-white">Áreas de atuação</h2>
              </div>
              <Icon className={`h-7 w-7 ${unit.text}`} />
            </div>

            <div className="flex flex-wrap gap-2">
              {unit.focus.map((item) => (
                <span
                  key={item}
                  className={`rounded-full border border-current/20 bg-black/35 px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] ${unit.text}`}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div id="doutrina" className={`relative overflow-hidden rounded-[2.2rem] border ${unit.softTone} p-5`}>
            <div className="relative">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">
                Doutrina
              </p>

              <div className="mt-4 space-y-3">
                {unit.doctrine.map((item) => {
                  const DoctrineIcon = item.icon;

                  return (
                    <div
                      key={item.title}
                      className="rounded-2xl border border-white/10 bg-black/25 p-4"
                    >
                      <div className="mb-2 flex items-center gap-3">
                        <DoctrineIcon className={`h-4 w-4 ${unit.text}`} />
                        <h3 className="font-black text-white">{item.title}</h3>
                      </div>
                      <p className="text-sm leading-6 text-muted-foreground">
                        {item.text}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="elementos"
        className="relative overflow-hidden rounded-[2.4rem] border border-white/10 bg-[#050b09]/85 p-6 shadow-[0_32px_130px_rgba(0,0,0,0.42)] backdrop-blur-2xl"
      >
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-[120px]" />
        <div className="relative mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.26em] text-muted-foreground">
              Elementos
            </p>
            <h2 className="mt-2 text-3xl font-black text-white">
              Militares nesta unidade
            </h2>
          </div>

          <div className={`rounded-2xl border border-current/20 bg-black/35 px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] ${unit.text}`}>
            {members.length} sincronizados
          </div>
        </div>

        <div className="relative grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {members.length > 0 ? (
            members.map((member: any) => (
              <MemberCard key={getGuardaId(member) || getGuardaName(member)} member={member} unit={unit} />
            ))
          ) : (
            <EmptyMembers unit={unit} />
          )}
        </div>
      </section>
    </motion.div>
  );
}


function WeeklyGoalsCommandOverview() {
  const [summary, setSummary] = useState<UnitSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadSummary() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await unitApiRequest<UnitSummaryResponse>(
        "/api/units/summary",
      );
      setSummary(response);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Não foi possível carregar as metas.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadSummary();
  }, []);

  const progressMap = useMemo(
    () =>
      Object.fromEntries(
        (summary?.items || []).map((item) => [item.unit, item]),
      ),
    [summary],
  );

  return (
    <section className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#050b09]/90 p-6 shadow-[0_30px_120px_rgba(0,0,0,0.42)]">
      <div className="absolute inset-0 cyber-grid-soft opacity-10" />

      <div className="relative mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-primary">
            Comando e controlo
          </p>
          <h2 className="mt-2 text-3xl font-black text-white">
            Metas semanais das unidades
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
            Dados partilhados e calculados automaticamente através do MongoDB.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadSummary()}
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-[9px] font-black uppercase tracking-[0.13em] text-primary disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Atualizar
        </button>
      </div>

      {error && (
        <div className="relative mb-5 flex items-center gap-3 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      {isLoading && !summary ? (
        <div className="relative flex min-h-56 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="relative grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[...UNITS.map((unit) => unit.id), "EG"].map((unitId) => {
            const unit = getUnitById(unitId);
            const staticGoals = WEEKLY_GOALS[unitId] || [];
            const progress = progressMap[unitId];
            const goals =
              progress?.goals?.length > 0
                ? progress.goals.map((goal) => ({
                    id: goal.goalId,
                    label: goal.label,
                    target: goal.target,
                    current: goal.current,
                    completed: goal.completed,
                  }))
                : staticGoals.map((goal) => ({
                    ...goal,
                    current: 0,
                    completed: false,
                  }));
            const Icon = unit?.icon || GraduationCap;
            const percentage = progress?.percentage || 0;

            return (
              <article
                key={unitId}
                className={`rounded-[1.8rem] border p-5 ${
                  unit?.softTone ||
                  "border-violet-400/15 bg-violet-500/[0.06]"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p
                      className={`text-[10px] font-black uppercase tracking-[0.18em] ${
                        unit?.text || "text-violet-300"
                      }`}
                    >
                      {unitId}
                    </p>
                    <h3 className="mt-2 font-black text-white">
                      {unit?.name || "Escola da Guarda"}
                    </h3>
                  </div>

                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl border border-current/20 bg-black/30 ${
                      unit?.text || "text-violet-300"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                    Cumprimento
                  </span>
                  <span className="text-2xl font-black text-white">
                    {percentage}%
                  </span>
                </div>

                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={`h-full rounded-full bg-current ${
                      unit?.text || "text-violet-300"
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                <div className="mt-5 space-y-2">
                  {goals.map((goal) => (
                    <div
                      key={goal.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                    >
                      <span className="text-xs font-bold text-white/75">
                        {goal.label}
                      </span>
                      <span
                        className={`shrink-0 rounded-lg px-2 py-1 text-[9px] font-black ${
                          goal.completed
                            ? "bg-emerald-500/10 text-emerald-300"
                            : "bg-white/[0.05] text-white/50"
                        }`}
                      >
                        {goal.current}/{goal.target}
                      </span>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function UnitOperationsSuite({
  unit,
  stats,
  members,
}: {
  unit: UnitConfig;
  stats: any;
  members: any[];
}) {
  const [activeTab, setActiveTab] = useState<
    "PAINEL" | "METAS" | "OPERACOES" | "AGENDA" | "GESTAO" | "DOCUMENTOS"
  >("PAINEL");
  const [data, setData] = useState<UnitApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOperationForm, setShowOperationForm] = useState(false);
  const [reportOperation, setReportOperation] = useState<UnitOperation | null>(null);
  const [selectedOperation, setSelectedOperation] = useState<UnitOperation | null>(null);

  const emptyOperation = () => ({
    title: "",
    category: "OTHER" as UnitOperationCategory,
    commanderDiscordId: "",
    commanderName: "",
    scheduledAt: new Date().toISOString().slice(0, 16),
    location: "",
    briefing: "",
    objective: "",
    supportUnits: [] as string[],
    participants: [] as OperationParticipant[],
    attachmentUrls: "",
  });

  const [newOperation, setNewOperation] = useState(emptyOperation());

  async function loadUnitData() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await unitApiRequest<UnitApiResponse>(
        `/api/units/${unit.id}`,
      );
      setData(response);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Não foi possível carregar os dados da unidade.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    setActiveTab("PAINEL");
    setShowOperationForm(false);
    setReportOperation(null);
    setSelectedOperation(null);
    setNewOperation(emptyOperation());
    void loadUnitData();
  }, [unit.id]);

  const progress = data?.progress;
  const goals = progress?.goals || [];
  const operations = data?.operations || [];
  const permissions = data?.permissions || {
    view: true,
    create: false,
    manageAll: false,
    delete: false,
    director: false,
    command: false,
  };

  const pendingDirector = operations.filter(
    (operation) => operation.reportStatus === "PENDING_DIRECTOR",
  ).length;

  const pendingCommand = operations.filter(
    (operation) => operation.reportStatus === "PENDING_COMMAND",
  ).length;

  const validatedOperations = operations.filter(
    (operation) => operation.reportStatus === "VALIDATED",
  ).length;

  function parseAttachmentUrls(value: string): OperationAttachment[] {
    return value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => /^https?:\/\//i.test(line))
      .map((url, index) => ({
        filename: `Anexo ${index + 1}`,
        url,
      }));
  }

  async function runMutation(
    action: () => Promise<unknown>,
    fallbackMessage: string,
  ) {
    setIsMutating(true);
    setError(null);

    try {
      await action();
      await loadUnitData();
    } catch (mutationError) {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : fallbackMessage,
      );
    } finally {
      setIsMutating(false);
    }
  }

  async function createOperation() {
    if (!permissions.create || !newOperation.title.trim()) return;

    await runMutation(
      () =>
        unitApiRequest(`/api/units/${unit.id}/operations`, {
          method: "POST",
          body: JSON.stringify({
            title: newOperation.title.trim(),
            category: newOperation.category,
            commanderDiscordId: newOperation.commanderDiscordId || null,
            commanderName: newOperation.commanderName.trim() || null,
            scheduledAt: new Date(newOperation.scheduledAt).toISOString(),
            location: newOperation.location.trim() || null,
            briefing: newOperation.briefing.trim(),
            objective: newOperation.objective.trim(),
            supportUnits: newOperation.supportUnits,
            participants: newOperation.participants,
            attachments: parseAttachmentUrls(newOperation.attachmentUrls),
          }),
        }),
      "Não foi possível criar a operação.",
    );

    setNewOperation(emptyOperation());
    setShowOperationForm(false);
  }

  async function updateOperationStatus(
    operation: UnitOperation,
    status: UnitOperationStatus,
  ) {
    if (!operation.permissions?.edit) return;

    if (status === "COMPLETED") {
      setReportOperation(operation);
      return;
    }

    await runMutation(
      () =>
        unitApiRequest(`/api/units/operations/${operation._id}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status }),
        }),
      "Não foi possível alterar o estado.",
    );
  }

  async function submitReport(
    operationId: string,
    payload: {
      result: string;
      finalReport: string;
      resultMetrics: {
        arrests: number;
        seizures: number;
        injured: number;
        seizedVehicles: number;
        fines: number;
      };
      attachments: OperationAttachment[];
    },
  ) {
    await runMutation(
      () =>
        unitApiRequest(`/api/units/operations/${operationId}/report`, {
          method: "POST",
          body: JSON.stringify(payload),
        }),
      "Não foi possível submeter o relatório final.",
    );

    setReportOperation(null);
  }

  async function approvalAction(
    operation: UnitOperation,
    phase: "director" | "command",
    action: "approve" | "request-changes",
  ) {
    const needsNote = action === "request-changes";
    const note = needsNote
      ? window.prompt("Indica claramente as correções necessárias:")
      : window.prompt("Observação da validação (opcional):") || "";

    if (needsNote && (!note || note.trim().length < 5)) return;

    await runMutation(
      () =>
        unitApiRequest(
          `/api/units/operations/${operation._id}/${phase}/${action}`,
          {
            method: "PATCH",
            body: JSON.stringify({ note: note?.trim() || "" }),
          },
        ),
      "Não foi possível concluir a validação.",
    );
  }

  async function deleteOperation(operationId: string) {
    if (!permissions.delete) return;
    if (!window.confirm("Queres mesmo apagar esta operação?")) return;

    await runMutation(
      () =>
        unitApiRequest(`/api/units/operations/${operationId}`, {
          method: "DELETE",
        }),
      "Não foi possível apagar a operação.",
    );

    setSelectedOperation(null);
  }

  async function changeGoal(goal: ApiGoal, amount: number) {
    if (!permissions.command) return;

    const nextAdjustment = Number(goal.manualAdjustment || 0) + amount;

    await runMutation(
      () =>
        unitApiRequest(
          `/api/units/${unit.id}/goals/${goal.goalId}/adjust`,
          {
            method: "PATCH",
            body: JSON.stringify({ adjustment: nextAdjustment }),
          },
        ),
      "Não foi possível ajustar a meta.",
    );
  }

  const tabs = [
    { id: "PAINEL", label: "Painel", icon: Activity },
    { id: "METAS", label: "Metas", icon: Target },
    { id: "OPERACOES", label: unit.id === "NIC" ? "Investigações" : "Operações", icon: ClipboardList },
    { id: "AGENDA", label: "Agenda", icon: CalendarDays },
    { id: "GESTAO", label: "Gestão", icon: UsersRound },
    { id: "DOCUMENTOS", label: "Documentos", icon: FileText },
  ] as const;

  if (isLoading && !data) {
    return (
      <section className="flex min-h-72 items-center justify-center rounded-[2.5rem] border border-white/10 bg-[#050b09]/92">
        <div className="text-center">
          <Loader2 className={`mx-auto h-9 w-9 animate-spin ${unit.text}`} />
          <p className="mt-4 text-sm font-black text-white">
            A carregar o centro operacional
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#050b09]/92 shadow-[0_30px_130px_rgba(0,0,0,0.44)]">
      <div className={`absolute inset-0 bg-gradient-to-br ${unit.glow} opacity-35`} />
      <div className="absolute inset-0 cyber-grid-soft opacity-[0.08]" />

      <div className="relative border-b border-white/10 p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className={`text-[10px] font-black uppercase tracking-[0.24em] ${unit.text}`}>
              Centro operacional da unidade
            </p>
            <h2 className="mt-2 text-3xl font-black text-white">
              {unit.id === "NIC"
                ? "Investigações privadas e validações"
                : "Operações, metas e relatórios"}
            </h2>
          </div>

          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const TabIcon = tab.icon;
              const active = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-[9px] font-black uppercase tracking-[0.13em] transition ${
                    active
                      ? `${unit.softTone} ${unit.text}`
                      : "border-white/10 bg-black/20 text-white/35 hover:text-white"
                  }`}
                >
                  <TabIcon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="relative p-5 md:p-6">
        {error && (
          <div className="mb-5 flex items-center gap-3 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span className="flex-1">{error}</span>
            <button type="button" onClick={() => setError(null)}>
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {activeTab === "PAINEL" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-6">
              <UnitControlMetric label="Elementos" value={stats.members} icon={Users} unit={unit} />
              <UnitControlMetric label="Ativos" value={stats.active} icon={Activity} unit={unit} />
              <UnitControlMetric label="Metas" value={`${progress?.percentage || 0}%`} icon={Target} unit={unit} />
              <UnitControlMetric label="Processos visíveis" value={operations.length} icon={ClipboardList} unit={unit} />
              <UnitControlMetric label="Pendente Diretor" value={pendingDirector} icon={UserCheck} unit={unit} />
              <UnitControlMetric label="Pendente Comando" value={pendingCommand} icon={Stamp} unit={unit} />
            </div>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_420px]">
              <WeeklyGoalsPanel
                unit={unit}
                goals={goals}
                canManage={permissions.command}
                isMutating={isMutating}
                onChange={changeGoal}
              />

              <div className={`rounded-[2rem] border ${unit.softTone} p-5`}>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                  Cadeia de validação
                </p>

                <div className="mt-5 space-y-3">
                  <ApprovalStage
                    icon={Send}
                    title="Responsável"
                    description="Abre, trabalha e submete o relatório."
                    complete
                    unit={unit}
                  />
                  <ApprovalStage
                    icon={UserCheck}
                    title="Diretor do NIC"
                    description="Primeira validação institucional."
                    complete={pendingCommand + validatedOperations > 0}
                    unit={unit}
                  />
                  <ApprovalStage
                    icon={Stamp}
                    title="Comando-Geral"
                    description="Validação final e desbloqueio das metas."
                    complete={validatedOperations > 0}
                    unit={unit}
                  />
                </div>

                <p className="mt-4 text-xs leading-6 text-white/35">
                  Os membros que não abriram nem participam numa investigação privada não a recebem da API.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "METAS" && (
          <WeeklyGoalsPanel
            unit={unit}
            goals={goals}
            canManage={permissions.command}
            isMutating={isMutating}
            onChange={changeGoal}
            expanded
          />
        )}

        {activeTab === "OPERACOES" && (
          <div className="space-y-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                  Sigilo, execução e dupla validação
                </p>
                <h3 className="mt-2 text-2xl font-black text-white">
                  {unit.id === "NIC" ? "Investigações disponíveis" : "Operações da unidade"}
                </h3>
              </div>

              {permissions.create && (
                <button
                  type="button"
                  onClick={() => setShowOperationForm(true)}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-3 text-[9px] font-black uppercase tracking-[0.13em] ${unit.button}`}
                >
                  <Plus className="h-4 w-4" />
                  {unit.id === "NIC" ? "Abrir investigação" : "Nova operação"}
                </button>
              )}
            </div>

            {showOperationForm && (
              <OperationForm
                unit={unit}
                members={members}
                value={newOperation}
                onChange={setNewOperation}
                onSave={createOperation}
                onClose={() => setShowOperationForm(false)}
                isSaving={isMutating}
              />
            )}

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {operations.length > 0 ? (
                operations.map((operation) => (
                  <OperationCard
                    key={operation._id}
                    operation={operation}
                    unit={unit}
                    isMutating={isMutating}
                    onStatus={(status) => updateOperationStatus(operation, status)}
                    onDelete={() => deleteOperation(operation._id)}
                    onOpen={() => setSelectedOperation(operation)}
                    onReport={() => setReportOperation(operation)}
                    onDirectorApprove={() => approvalAction(operation, "director", "approve")}
                    onDirectorChanges={() => approvalAction(operation, "director", "request-changes")}
                    onCommandApprove={() => approvalAction(operation, "command", "approve")}
                    onCommandChanges={() => approvalAction(operation, "command", "request-changes")}
                  />
                ))
              ) : (
                <EmptyUnitModule
                  unit={unit}
                  icon={Lock}
                  title={unit.id === "NIC" ? "Nenhuma investigação acessível" : "Sem operações registadas"}
                  text={
                    unit.id === "NIC"
                      ? "Só aparecem os processos que abriste, em que participas, ou todos os processos caso sejas Diretor do NIC ou Comando-Geral."
                      : "Quando uma operação for planeada, ficará disponível neste painel."
                  }
                />
              )}
            </div>
          </div>
        )}

        {activeTab === "AGENDA" && (
          <UnitAgenda unit={unit} operations={operations} />
        )}

        {activeTab === "GESTAO" && <UnitHubPanel unit={unit} />}

        {activeTab === "DOCUMENTOS" && <UnitDocuments unit={unit} />}
      </div>

      {reportOperation && (
        <OperationReportModal
          operation={reportOperation}
          unit={unit}
          isSaving={isMutating}
          onClose={() => setReportOperation(null)}
          onSubmit={submitReport}
        />
      )}

      {selectedOperation && (
        <OperationDetailsModal
          operation={selectedOperation}
          unit={unit}
          onClose={() => setSelectedOperation(null)}
        />
      )}
    </section>
  );
}

function ApprovalStage({
  icon: Icon,
  title,
  description,
  complete,
  unit,
}: {
  icon: any;
  title: string;
  description: string;
  complete: boolean;
  unit: UnitConfig;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 p-3">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
        complete
          ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
          : `border-current/20 bg-black/30 ${unit.text}`
      }`}>
        {complete ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
      </div>
      <div>
        <p className="text-sm font-black text-white">{title}</p>
        <p className="mt-1 text-[10px] text-white/35">{description}</p>
      </div>
    </div>
  );
}

function UnitControlMetric({
  label,
  value,
  icon: Icon,
  unit,
}: {
  label: string;
  value: string | number;
  icon: any;
  unit: UnitConfig;
}) {
  return (
    <div className={`rounded-[1.5rem] border ${unit.softTone} p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.14em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-3 text-3xl font-black text-white">{value}</p>
        </div>
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-xl border border-current/20 bg-black/25 ${unit.text}`}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
    </div>
  );
}

function WeeklyGoalsPanel({
  unit,
  goals,
  canManage,
  isMutating,
  onChange,
  expanded = false,
}: {
  unit: UnitConfig;
  goals: ApiGoal[];
  canManage: boolean;
  isMutating: boolean;
  onChange: (goal: ApiGoal, amount: number) => void;
  expanded?: boolean;
}) {
  return (
    <div className={`rounded-[2rem] border ${unit.softTone} p-5`}>
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
            Metas semanais
          </p>
          <h3 className="mt-2 text-2xl font-black text-white">
            Progresso automático
          </h3>
        </div>

        <Target className={`h-7 w-7 ${unit.text}`} />
      </div>

      <div className={`grid gap-4 ${expanded ? "xl:grid-cols-2" : ""}`}>
        {goals.map((goal) => {
          const current = Number(goal.current || 0);
          const percentage =
            goal.target > 0
              ? Math.min(100, Math.round((current / goal.target) * 100))
              : 0;

          return (
            <article
              key={goal.goalId}
              className="rounded-[1.5rem] border border-white/10 bg-black/25 p-4"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-current/20 ${
                    goal.completed
                      ? "bg-emerald-500/10 text-emerald-300"
                      : `bg-black/25 ${unit.text}`
                  }`}
                >
                  {goal.completed ? (
                    <CircleCheckBig className="h-5 w-5" />
                  ) : (
                    <CircleDashed className="h-5 w-5" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-white">{goal.label}</p>
                      <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.12em] text-white/25">
                        Automático {goal.automaticValue} · Correção{" "}
                        {goal.manualAdjustment >= 0 ? "+" : ""}
                        {goal.manualAdjustment}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 text-sm font-black ${
                        goal.completed ? "text-emerald-300" : unit.text
                      }`}
                    >
                      {current}/{goal.target}
                    </span>
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full rounded-full ${
                        goal.completed ? "bg-emerald-400" : `bg-current ${unit.text}`
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  {canManage && (
                    <div className="mt-4 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        disabled={isMutating}
                        onClick={() => onChange(goal, -1)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] text-white/50 hover:text-white disabled:opacity-40"
                      >
                        −
                      </button>

                      <button
                        type="button"
                        disabled={isMutating}
                        onClick={() => onChange(goal, 1)}
                        className={`flex h-9 w-9 items-center justify-center rounded-xl ${unit.button} disabled:opacity-40`}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function OperationForm({
  unit,
  members,
  value,
  onChange,
  onSave,
  onClose,
  isSaving,
}: {
  unit: UnitConfig;
  members: any[];
  value: {
    title: string;
    category: UnitOperationCategory;
    commanderDiscordId: string;
    commanderName: string;
    scheduledAt: string;
    location: string;
    briefing: string;
    objective: string;
    supportUnits: string[];
    participants: OperationParticipant[];
    attachmentUrls: string;
  };
  onChange: (value: any) => void;
  onSave: () => void;
  onClose: () => void;
  isSaving: boolean;
}) {
  const [memberSearch, setMemberSearch] = useState("");

  const filteredMembers = members.filter((member) => {
    const term = memberSearch.trim().toLowerCase();
    if (!term) return true;

    return (
      getGuardaName(member).toLowerCase().includes(term) ||
      getGuardaRank(member).toLowerCase().includes(term)
    );
  });

  function toggleSupportUnit(unitId: string) {
    onChange({
      ...value,
      supportUnits: value.supportUnits.includes(unitId)
        ? value.supportUnits.filter((item) => item !== unitId)
        : [...value.supportUnits, unitId],
    });
  }

  function selectCommander(discordId: string) {
    const member = members.find((item) => getGuardaId(item) === discordId);

    onChange({
      ...value,
      commanderDiscordId: discordId,
      commanderName: member ? getGuardaName(member) : "",
    });
  }

  function toggleParticipant(member: any) {
    const discordId = getGuardaId(member);
    const exists = value.participants.some(
      (participant) => participant.discordId === discordId,
    );

    onChange({
      ...value,
      participants: exists
        ? value.participants.filter(
            (participant) => participant.discordId !== discordId,
          )
        : [
            ...value.participants,
            {
              discordId,
              name: getGuardaName(member),
              rank: getGuardaRank(member),
              role: "OPERACIONAL",
            },
          ],
    });
  }

  return (
    <div className={`rounded-[2rem] border ${unit.softTone} p-5`}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground">
            Registo partilhado no MongoDB
          </p>
          <h3 className="mt-1 text-xl font-black text-white">Nova operação</h3>
        </div>

        <button type="button" onClick={onClose} className="text-white/40 hover:text-white">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <FormField label="Nome da operação">
          <input
            value={value.title}
            onChange={(event) => onChange({ ...value, title: event.target.value })}
            className="h-11 w-full rounded-xl border border-white/10 bg-black/25 px-4 text-sm text-white outline-none focus:border-primary/30"
          />
        </FormField>

        <FormField label="Categoria">
          <select
            value={value.category}
            onChange={(event) =>
              onChange({
                ...value,
                category: event.target.value as UnitOperationCategory,
              })
            }
            className="h-11 w-full rounded-xl border border-white/10 bg-[#07100d] px-4 text-sm text-white outline-none focus:border-primary/30"
          >
            {OPERATION_CATEGORIES.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Comandante">
          <select
            value={value.commanderDiscordId}
            onChange={(event) => selectCommander(event.target.value)}
            className="h-11 w-full rounded-xl border border-white/10 bg-[#07100d] px-4 text-sm text-white outline-none focus:border-primary/30"
          >
            <option value="">Selecionar comandante</option>
            {members.map((member) => (
              <option key={getGuardaId(member)} value={getGuardaId(member)}>
                {getGuardaName(member)} — {getGuardaRank(member)}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Data e hora">
          <input
            type="datetime-local"
            value={value.scheduledAt}
            onChange={(event) =>
              onChange({ ...value, scheduledAt: event.target.value })
            }
            className="h-11 w-full rounded-xl border border-white/10 bg-black/25 px-4 text-sm text-white outline-none focus:border-primary/30"
          />
        </FormField>

        <FormField label="Local">
          <input
            value={value.location}
            onChange={(event) => onChange({ ...value, location: event.target.value })}
            className="h-11 w-full rounded-xl border border-white/10 bg-black/25 px-4 text-sm text-white outline-none focus:border-primary/30"
          />
        </FormField>
      </div>

      <FormField label="Briefing">
        <textarea
          value={value.briefing}
          onChange={(event) => onChange({ ...value, briefing: event.target.value })}
          rows={3}
          placeholder="Contexto, riscos, regras de empenhamento e informação relevante..."
          className="w-full rounded-xl border border-white/10 bg-black/25 p-4 text-sm text-white outline-none focus:border-primary/30"
        />
      </FormField>

      <FormField label="Objetivo">
        <textarea
          value={value.objective}
          onChange={(event) => onChange({ ...value, objective: event.target.value })}
          rows={3}
          className="w-full rounded-xl border border-white/10 bg-black/25 p-4 text-sm text-white outline-none focus:border-primary/30"
        />
      </FormField>

      <div className="mt-4">
        <p className="mb-2 text-[9px] font-black uppercase tracking-[0.14em] text-muted-foreground">
          Unidades de apoio
        </p>

        <div className="flex flex-wrap gap-2">
          {UNITS.filter((item) => item.id !== unit.id).map((supportUnit) => {
            const selected = value.supportUnits.includes(supportUnit.id);

            return (
              <button
                key={supportUnit.id}
                type="button"
                onClick={() => toggleSupportUnit(supportUnit.id)}
                className={`rounded-xl border px-3 py-2 text-[9px] font-black uppercase tracking-[0.12em] ${
                  selected
                    ? `${supportUnit.softTone} ${supportUnit.text}`
                    : "border-white/10 bg-black/20 text-white/30"
                }`}
              >
                {supportUnit.short}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-muted-foreground">
              Participantes
            </p>
            <p className="mt-1 text-sm font-black text-white">
              {value.participants.length} selecionados
            </p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
            <input
              value={memberSearch}
              onChange={(event) => setMemberSearch(event.target.value)}
              placeholder="Pesquisar elemento..."
              className="h-10 rounded-xl border border-white/10 bg-black/25 pl-10 pr-4 text-sm text-white outline-none"
            />
          </div>
        </div>

        <div className="mt-4 grid max-h-72 grid-cols-1 gap-2 overflow-y-auto pr-1 md:grid-cols-2">
          {filteredMembers.map((member) => {
            const id = getGuardaId(member);
            const selected = value.participants.some(
              (participant) => participant.discordId === id,
            );

            return (
              <button
                key={id}
                type="button"
                onClick={() => toggleParticipant(member)}
                className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                  selected
                    ? `${unit.softTone} ${unit.text}`
                    : "border-white/10 bg-white/[0.025] text-white/50"
                }`}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-current/20 bg-black/25 text-[10px] font-black">
                  {getGuardaName(member)
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part: string) => part[0])
                    .join("")
                    .toUpperCase()}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-white">
                    {getGuardaName(member)}
                  </p>
                  <p className="truncate text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                    {getGuardaRank(member)}
                  </p>
                </div>

                {selected && <Check className="h-4 w-4" />}
              </button>
            );
          })}
        </div>
      </div>

      <FormField label="Links de anexos / clips — um por linha">
        <textarea
          value={value.attachmentUrls}
          onChange={(event) =>
            onChange({ ...value, attachmentUrls: event.target.value })
          }
          rows={3}
          placeholder="https://..."
          className="w-full rounded-xl border border-white/10 bg-black/25 p-4 font-mono text-xs text-white outline-none focus:border-primary/30"
        />
      </FormField>

      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 text-[9px] font-black uppercase tracking-[0.13em] text-white/50"
        >
          Cancelar
        </button>

        <button
          type="button"
          onClick={onSave}
          disabled={isSaving || !value.title.trim()}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-3 text-[9px] font-black uppercase tracking-[0.13em] ${unit.button} disabled:opacity-40`}
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Guardar operação
        </button>
      </div>
    </div>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="mt-3 block space-y-2">
      <span className="text-[9px] font-black uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function OperationCard({
  operation,
  unit,
  isMutating,
  onStatus,
  onDelete,
  onOpen,
  onReport,
  onDirectorApprove,
  onDirectorChanges,
  onCommandApprove,
  onCommandChanges,
}: {
  operation: UnitOperation;
  unit: UnitConfig;
  isMutating: boolean;
  onStatus: (status: UnitOperationStatus) => void;
  onDelete: () => void;
  onOpen: () => void;
  onReport: () => void;
  onDirectorApprove: () => void;
  onDirectorChanges: () => void;
  onCommandApprove: () => void;
  onCommandChanges: () => void;
}) {
  const status = STATUS_META[operation.status];
  const permissions = operation.permissions;

  const reportMeta: Record<string, { label: string; className: string }> = {
    NOT_REQUIRED: {
      label: "Sem relatório",
      className: "border-white/10 bg-white/[0.04] text-white/35",
    },
    DRAFT: {
      label: "Relatório em rascunho",
      className: "border-white/15 bg-white/[0.06] text-white/55",
    },
    PENDING_DIRECTOR: {
      label: "Aguarda Diretor NIC",
      className: "border-blue-400/20 bg-blue-500/10 text-blue-300",
    },
    CHANGES_REQUESTED: {
      label: "Correções solicitadas",
      className: "border-orange-400/20 bg-orange-500/10 text-orange-300",
    },
    DIRECTOR_APPROVED: {
      label: "Diretor aprovou",
      className: "border-cyan-400/20 bg-cyan-500/10 text-cyan-300",
    },
    PENDING_COMMAND: {
      label: "Aguarda Comando-Geral",
      className: "border-yellow-400/20 bg-yellow-500/10 text-yellow-300",
    },
    VALIDATED: {
      label: "Dupla validação concluída",
      className: "border-emerald-400/20 bg-emerald-500/10 text-emerald-300",
    },
    REJECTED: {
      label: "Relatório rejeitado",
      className: "border-red-400/20 bg-red-500/10 text-red-300",
    },
  };

  const report = reportMeta[operation.reportStatus || "NOT_REQUIRED"];

  return (
    <article className={`rounded-[1.8rem] border ${unit.softTone} p-5`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <span className={`inline-flex rounded-full border px-3 py-1 text-[8px] font-black uppercase tracking-[0.13em] ${status.className}`}>
              {status.label}
            </span>

            <span className={`inline-flex rounded-full border px-3 py-1 text-[8px] font-black uppercase tracking-[0.13em] ${report.className}`}>
              {report.label}
            </span>

            {operation.isPrivateInvestigation && (
              <span className="inline-flex items-center gap-1 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[8px] font-black uppercase tracking-[0.13em] text-violet-300">
                <Lock className="h-3 w-3" />
                Privada
              </span>
            )}
          </div>

          {operation.caseNumber && (
            <p className="mt-3 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-white/35">
              {operation.caseNumber}
            </p>
          )}

          <h4 className="mt-2 text-xl font-black text-white">
            {operation.title}
          </h4>

          <p className={`mt-1 text-[9px] font-black uppercase tracking-[0.14em] ${unit.text}`}>
            {OPERATION_CATEGORIES.find(
              (category) => category.value === operation.category,
            )?.label || operation.category}
          </p>
        </div>

        {permissions?.delete && (
          <button
            type="button"
            onClick={onDelete}
            disabled={isMutating}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-red-400/15 bg-red-500/10 text-red-300 disabled:opacity-40"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <MiniInfo label="Responsável" value={operation.createdByName || operation.commanderName || "Por definir"} />
        <MiniInfo label="Data" value={formatOperationDate(operation.scheduledAt)} />
        <MiniInfo label="Local" value={operation.location || "Por definir"} />
        <MiniInfo label="Participantes" value={String(operation.participants?.length || 0)} />
      </div>

      {operation.reportRejectionReason && (
        <div className="mt-4 rounded-xl border border-orange-400/20 bg-orange-500/10 p-3 text-xs leading-6 text-orange-200">
          <strong>Correções:</strong> {operation.reportRejectionReason}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-4">
        {operation.primaryUnit === "NIC" && (
          <Link
            href={`/unidades/nic/investigacoes/${operation._id}`}
            className="inline-flex items-center gap-2 rounded-xl border border-blue-400/20 bg-blue-500/10 px-4 py-2 text-[8px] font-black uppercase tracking-[0.11em] text-blue-300"
          >
            Abrir dossier completo
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        )}

        <button
          type="button"
          onClick={onOpen}
          className="rounded-xl border border-white/10 bg-white/[0.035] px-4 py-2 text-[8px] font-black uppercase tracking-[0.11em] text-white/55 hover:text-white"
        >
          Pré-visualizar
        </button>

        {permissions?.edit && operation.status !== "IN_PROGRESS" && operation.status !== "COMPLETED" && (
          <button
            type="button"
            onClick={() => onStatus("IN_PROGRESS")}
            disabled={isMutating}
            className={`rounded-xl px-4 py-2 text-[8px] font-black uppercase tracking-[0.11em] ${unit.button} disabled:opacity-40`}
          >
            Colocar em curso
          </button>
        )}

        {permissions?.submitReport &&
          ["IN_PROGRESS", "COMPLETED"].includes(operation.status) &&
          operation.reportStatus !== "PENDING_DIRECTOR" &&
          operation.reportStatus !== "PENDING_COMMAND" &&
          operation.reportStatus !== "VALIDATED" && (
            <button
              type="button"
              onClick={onReport}
              disabled={isMutating}
              className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-[8px] font-black uppercase tracking-[0.11em] text-emerald-300 disabled:opacity-40"
            >
              {operation.reportStatus === "CHANGES_REQUESTED"
                ? "Corrigir relatório"
                : "Submeter ao Diretor do NIC"}
            </button>
          )}

        {permissions?.directorApprove && (
          <>
            <button
              type="button"
              onClick={onDirectorApprove}
              disabled={isMutating}
              className="rounded-xl border border-blue-400/20 bg-blue-500/10 px-4 py-2 text-[8px] font-black uppercase tracking-[0.11em] text-blue-300 disabled:opacity-40"
            >
              Aprovar como Diretor
            </button>
            <button
              type="button"
              onClick={onDirectorChanges}
              disabled={isMutating}
              className="rounded-xl border border-orange-400/20 bg-orange-500/10 px-4 py-2 text-[8px] font-black uppercase tracking-[0.11em] text-orange-300 disabled:opacity-40"
            >
              Pedir correções
            </button>
          </>
        )}

        {permissions?.commandApprove && (
          <>
            <button
              type="button"
              onClick={onCommandApprove}
              disabled={isMutating}
              className="rounded-xl border border-yellow-400/20 bg-yellow-500/10 px-4 py-2 text-[8px] font-black uppercase tracking-[0.11em] text-yellow-300 disabled:opacity-40"
            >
              Validar pelo Comando
            </button>
            <button
              type="button"
              onClick={onCommandChanges}
              disabled={isMutating}
              className="rounded-xl border border-orange-400/20 bg-orange-500/10 px-4 py-2 text-[8px] font-black uppercase tracking-[0.11em] text-orange-300 disabled:opacity-40"
            >
              Pedir correções
            </button>
          </>
        )}
      </div>
    </article>
  );
}

function OperationReportModal({
  operation,
  unit,
  isSaving,
  onClose,
  onSubmit,
}: {
  operation: UnitOperation;
  unit: UnitConfig;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (
    id: string,
    payload: {
      result: string;
      finalReport: string;
      resultMetrics: {
        arrests: number;
        seizures: number;
        injured: number;
        seizedVehicles: number;
        fines: number;
      };
      attachments: OperationAttachment[];
    },
  ) => void;
}) {
  const [result, setResult] = useState(operation.result || "");
  const [finalReport, setFinalReport] = useState(operation.finalReport || "");
  const [attachmentUrls, setAttachmentUrls] = useState("");
  const [metrics, setMetrics] = useState({
    arrests: Number(operation.resultMetrics?.arrests || 0),
    seizures: Number(operation.resultMetrics?.seizures || 0),
    injured: Number(operation.resultMetrics?.injured || 0),
    seizedVehicles: Number(operation.resultMetrics?.seizedVehicles || 0),
    fines: Number(operation.resultMetrics?.fines || 0),
  });

  function submit() {
    const attachments = attachmentUrls
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((url, index) => ({
        filename: `Anexo do relatório ${index + 1}`,
        url,
      }));

    onSubmit(operation._id, {
      result,
      finalReport,
      resultMetrics: metrics,
      attachments,
    });
  }

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] border border-white/10 bg-[#07100d] p-6 shadow-[0_40px_180px_rgba(0,0,0,0.8)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className={`text-[9px] font-black uppercase tracking-[0.16em] ${unit.text}`}>
              Encerramento operacional
            </p>
            <h3 className="mt-2 text-2xl font-black text-white">
              Relatório final — {operation.title}
            </h3>
          </div>

          <button type="button" onClick={onClose} className="text-white/40 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <FormField label="Resultado resumido">
          <textarea
            value={result}
            onChange={(event) => setResult(event.target.value)}
            rows={3}
            placeholder="Objetivo cumprido, ocorrências e resultado principal..."
            className="w-full rounded-xl border border-white/10 bg-black/25 p-4 text-sm text-white outline-none"
          />
        </FormField>

        <FormField label="Relatório completo">
          <textarea
            value={finalReport}
            onChange={(event) => setFinalReport(event.target.value)}
            rows={8}
            placeholder="Descreve preparação, execução, incidentes, decisões, resultados e conclusão..."
            className="w-full rounded-xl border border-white/10 bg-black/25 p-4 text-sm text-white outline-none"
          />
        </FormField>

        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
          {[
            ["arrests", "Detenções"],
            ["seizures", "Apreensões"],
            ["injured", "Feridos"],
            ["seizedVehicles", "Viaturas"],
            ["fines", "Coimas"],
          ].map(([key, label]) => (
            <FormField key={key} label={label}>
              <input
                type="number"
                min={0}
                value={(metrics as any)[key]}
                onChange={(event) =>
                  setMetrics((previous) => ({
                    ...previous,
                    [key]: Math.max(0, Number(event.target.value || 0)),
                  }))
                }
                className="h-11 w-full rounded-xl border border-white/10 bg-black/25 px-4 text-sm text-white outline-none"
              />
            </FormField>
          ))}
        </div>

        <FormField label="Links de clips, imagens ou documentos — um por linha">
          <textarea
            value={attachmentUrls}
            onChange={(event) => setAttachmentUrls(event.target.value)}
            rows={3}
            placeholder="https://..."
            className="w-full rounded-xl border border-white/10 bg-black/25 p-4 font-mono text-xs text-white outline-none"
          />
        </FormField>

        <div className="mt-6 rounded-xl border border-yellow-400/15 bg-yellow-500/[0.06] p-4 text-xs leading-6 text-yellow-100/70">
          A operação fica concluída, mas só conta para as metas depois de o relatório ser validado pelo Comando-Geral.
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 text-[9px] font-black uppercase tracking-[0.13em] text-white/50"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={submit}
            disabled={isSaving || result.trim().length < 5 || finalReport.trim().length < 20}
            className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 text-[9px] font-black uppercase tracking-[0.13em] ${unit.button} disabled:opacity-40`}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Submeter ao Diretor do NIC
          </button>
        </div>
      </div>
    </div>
  );
}

function OperationDetailsModal({
  operation,
  unit,
  onClose,
}: {
  operation: UnitOperation;
  unit: UnitConfig;
  onClose: () => void;
}) {
  const attachments = [
    ...(operation.attachments || []),
    ...(operation.reportAttachments || []),
  ];

  const approvalCards = [
    {
      title: "Diretor do NIC",
      approval: operation.directorApproval,
      icon: UserCheck,
    },
    {
      title: "Comando-Geral",
      approval: operation.commandApproval,
      icon: Stamp,
    },
  ];

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
      <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[2rem] border border-white/10 bg-[#07100d] p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className={`text-[9px] font-black uppercase tracking-[0.16em] ${unit.text}`}>
                Dossier operacional
              </p>
              {operation.caseNumber && (
                <span className="rounded-lg border border-white/10 bg-white/[0.035] px-2 py-1 font-mono text-[8px] font-black text-white/45">
                  {operation.caseNumber}
                </span>
              )}
              {operation.isPrivateInvestigation && (
                <span className="inline-flex items-center gap-1 rounded-lg border border-violet-400/20 bg-violet-500/10 px-2 py-1 text-[8px] font-black uppercase text-violet-300">
                  <Lock className="h-3 w-3" />
                  Investigação privada
                </span>
              )}
            </div>
            <h3 className="mt-2 text-3xl font-black text-white">
              {operation.title}
            </h3>
          </div>

          <button type="button" onClick={onClose} className="text-white/40 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
          <MiniInfo label="Estado" value={STATUS_META[operation.status].label} />
          <MiniInfo label="Responsável" value={operation.createdByName || "Por definir"} />
          <MiniInfo label="Comandante" value={operation.commanderName || "Por definir"} />
          <MiniInfo label="Data" value={formatOperationDate(operation.scheduledAt)} />
          <MiniInfo label="Local" value={operation.location || "Por definir"} />
        </div>

        {operation.briefing && (
          <DetailSection title="Briefing" text={operation.briefing} />
        )}

        {operation.objective && (
          <DetailSection title="Objetivo" text={operation.objective} />
        )}

        <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
          <div className="flex items-center gap-3">
            <UsersRound className={`h-5 w-5 ${unit.text}`} />
            <h4 className="font-black text-white">
              Participantes autorizados ({operation.participants?.length || 0})
            </h4>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
            {(operation.participants || []).length > 0 ? (
              (operation.participants || []).map((participant) => (
                <div
                  key={participant.discordId}
                  className="rounded-xl border border-white/10 bg-white/[0.025] p-3"
                >
                  <p className="font-black text-white">{participant.name}</p>
                  <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                    {participant.rank || "Operacional"} ·{" "}
                    {participant.canContribute ? "Pode contribuir" : "Consulta"}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-white/30">
                Apenas o responsável, Diretor do NIC e Comando-Geral possuem acesso.
              </p>
            )}
          </div>
        </div>

        {operation.result && (
          <DetailSection title="Resultado" text={operation.result} />
        )}

        {operation.finalReport && (
          <DetailSection title="Relatório final" text={operation.finalReport} />
        )}

        {operation.reportRejectionReason && (
          <section className="mt-5 rounded-[1.5rem] border border-orange-400/20 bg-orange-500/10 p-5">
            <p className="text-[9px] font-black uppercase tracking-[0.15em] text-orange-300">
              Correções solicitadas
            </p>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-orange-100/75">
              {operation.reportRejectionReason}
            </p>
          </section>
        )}

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          {approvalCards.map(({ title, approval, icon: ApprovalIcon }) => {
            const approved = approval?.status === "APPROVED";

            return (
              <article
                key={title}
                className={`rounded-[1.5rem] border p-5 ${
                  approved
                    ? "border-emerald-400/20 bg-emerald-500/[0.07]"
                    : "border-white/10 bg-black/20"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${
                    approved
                      ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
                      : `border-current/20 bg-black/25 ${unit.text}`
                  }`}>
                    <ApprovalIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-black text-white">{title}</p>
                    <p className="mt-1 text-[9px] font-black uppercase tracking-[0.12em] text-white/30">
                      {approval?.status || "PENDING"}
                    </p>
                  </div>
                </div>

                {approval?.actorName && (
                  <p className="mt-4 text-sm font-bold text-white/70">
                    {approval.actorName}
                  </p>
                )}

                {approval?.at && (
                  <p className="mt-1 text-[10px] text-white/30">
                    {formatOperationDate(approval.at)}
                  </p>
                )}

                {approval?.code && (
                  <p className="mt-3 rounded-lg border border-white/10 bg-black/25 px-3 py-2 font-mono text-[9px] text-white/45">
                    {approval.code}
                  </p>
                )}

                {approval?.note && (
                  <p className="mt-3 text-xs leading-6 text-white/45">
                    {approval.note}
                  </p>
                )}
              </article>
            );
          })}
        </div>

        {operation.resultMetrics && (
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
            <MiniStat label="Detenções" value={operation.resultMetrics.arrests || 0} />
            <MiniStat label="Apreensões" value={operation.resultMetrics.seizures || 0} />
            <MiniStat label="Feridos" value={operation.resultMetrics.injured || 0} />
            <MiniStat label="Viaturas" value={operation.resultMetrics.seizedVehicles || 0} />
            <MiniStat label="Coimas" value={operation.resultMetrics.fines || 0} />
          </div>
        )}

        {attachments.length > 0 && (
          <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
            <div className="flex items-center gap-3">
              <Paperclip className={`h-5 w-5 ${unit.text}`} />
              <h4 className="font-black text-white">Anexos</h4>
            </div>

            <div className="mt-4 space-y-2">
              {attachments.map((attachment, index) => (
                <a
                  key={`${attachment.url}-${index}`}
                  href={attachment.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.025] p-3 text-sm font-bold text-white/70 hover:text-white"
                >
                  <Link2 className="h-4 w-4" />
                  {attachment.filename}
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
          <div className="flex items-center gap-3">
            <History className={`h-5 w-5 ${unit.text}`} />
            <h4 className="font-black text-white">
              Timeline ({operation.auditEvents?.length || 0})
            </h4>
          </div>

          <div className="mt-4 space-y-3">
            {(operation.auditEvents || [])
              .slice()
              .reverse()
              .map((event, index) => (
                <div
                  key={`${event.type}-${event.at}-${index}`}
                  className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.025] p-3"
                >
                  <div className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-current ${unit.text}`} />
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.1em] text-white">
                      {event.type.replaceAll("_", " ")}
                    </p>
                    <p className="mt-1 text-[10px] text-white/35">
                      {event.actorName || "Sistema"} · {formatOperationDate(event.at)}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {operation.officialDocument?.issued && (
          <div className="mt-5 rounded-[1.5rem] border border-violet-400/20 bg-violet-500/10 p-5">
            <div className="flex items-center gap-3 text-violet-300">
              <KeyRound className="h-5 w-5" />
              <h4 className="font-black">Documento oficial emitido</h4>
            </div>
            <p className="mt-3 font-mono text-xs text-violet-100/60">
              {operation.officialDocument.verificationCode}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailSection({ title, text }: { title: string; text: string }) {
  return (
    <section className="mt-5 rounded-[1.5rem] border border-white/10 bg-black/20 p-5">
      <p className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground">
        {title}
      </p>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-white/70">{text}</p>
    </section>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <p className="text-[8px] font-black uppercase tracking-[0.13em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 truncate font-bold text-white">{value || "—"}</p>
    </div>
  );
}

function UnitAgenda({
  unit,
  operations,
}: {
  unit: UnitConfig;
  operations: UnitOperation[];
}) {
  const sorted = [...operations].sort(
    (a, b) =>
      new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
  );

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
          Calendário operacional
        </p>
        <h3 className="mt-2 text-2xl font-black text-white">
          Operações agendadas
        </h3>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {sorted.length > 0 ? (
          sorted.map((operation) => (
            <article
              key={operation._id}
              className={`rounded-[1.6rem] border ${unit.softTone} p-4`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl border border-current/20 bg-black/25 ${unit.text}`}
                >
                  <CalendarDays className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <p className="truncate font-black text-white">
                    {operation.title}
                  </p>
                  <p className="mt-1 text-[9px] font-black uppercase tracking-[0.13em] text-muted-foreground">
                    {formatOperationDate(operation.scheduledAt)} ·{" "}
                    {STATUS_META[operation.status].label}
                  </p>
                </div>
              </div>
            </article>
          ))
        ) : (
          <EmptyUnitModule
            unit={unit}
            icon={CalendarDays}
            title="Agenda vazia"
            text="As operações criadas no MongoDB irão aparecer aqui automaticamente."
          />
        )}
      </div>
    </div>
  );
}

function UnitDocuments({ unit }: { unit: UnitConfig }) {
  return (
    <EmptyUnitModule
      unit={unit}
      icon={FileText}
      title="Documentos reservados"
      text="Este separador será ligado à biblioteca de documentos através das roles da unidade na fase seguinte."
    />
  );
}

function EmptyUnitModule({
  unit,
  icon: Icon,
  title,
  text,
}: {
  unit: UnitConfig;
  icon: any;
  title: string;
  text: string;
}) {
  return (
    <div
      className={`col-span-full rounded-[2rem] border border-dashed ${unit.softTone} p-8 text-center`}
    >
      <Icon className={`mx-auto h-10 w-10 ${unit.text}`} />
      <h4 className="mt-4 text-xl font-black text-white">{title}</h4>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
        {text}
      </p>
    </div>
  );
}

function CinematicAccessScreen({ unit }: { unit: UnitConfig }) {
  const Icon = unit.icon;

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-[99999] flex items-center justify-center overflow-hidden bg-black"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${unit.glow}`} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.08),transparent_28%)]" />
      <div className="absolute inset-0 cyber-grid-soft opacity-20" />

      <motion.div
        animate={{ y: [-220, 220, -220] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        className={`absolute left-0 right-0 h-px bg-current ${unit.text} shadow-[0_0_40px_currentColor]`}
      />

      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative w-full max-w-2xl px-6 text-center"
      >
        <div className="mx-auto mb-8 flex h-48 w-48 items-center justify-center rounded-full border border-white/10 bg-white/[0.035]">
          <div className={`relative flex h-36 w-36 items-center justify-center rounded-full border border-current/20 bg-black/60 ${unit.text}`}>
            <motion.div
              animate={{ scale: [1, 1.16, 1], opacity: [0.35, 1, 0.35] }}
              transition={{ duration: 1.35, repeat: Infinity }}
              className="absolute inset-0 rounded-full border border-current/30"
            />
            <motion.div
              animate={{ y: [-48, 48, -48] }}
              transition={{ duration: 1.7, repeat: Infinity, ease: "easeInOut" }}
              className="absolute left-6 right-6 h-px bg-current shadow-[0_0_26px_currentColor]"
            />
            <Fingerprint className="h-20 w-20" />
          </div>
        </div>

        <div className={`mx-auto mb-5 inline-flex items-center gap-3 rounded-full border border-current/20 bg-black/50 px-4 py-2 text-[10px] font-black uppercase tracking-[0.25em] ${unit.text}`}>
          <Icon className="h-4 w-4" />
          {unit.short} · verificação biométrica
        </div>

        <h1 className="text-5xl font-black uppercase tracking-tight text-white md:text-7xl">
          Terminal
          <span className={`block ${unit.text}`}>Desbloqueado</span>
        </h1>

        <div className="mt-6 space-y-2 text-xs font-black uppercase tracking-[0.24em] text-muted-foreground">
          <p>Validando credenciais Discord</p>
          <p>Confirmando role operacional</p>
          <p>A abrir canal seguro {unit.short}</p>
        </div>

        <div className="mx-auto mt-8 h-2 max-w-md overflow-hidden rounded-full bg-white/10">
          <motion.div
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 1.35, ease: "easeOut" }}
            className="h-full rounded-full bg-current"
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

function HeroMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-3xl font-black text-white">{value}</p>
      <p className="mt-1 text-[9px] font-black uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function ManualSection({
  unit,
  title,
  text,
  icon: Icon,
}: {
  unit: UnitConfig;
  title: string;
  text: string;
  icon: any;
}) {
  return (
    <div className={`relative overflow-hidden rounded-[2.2rem] border ${unit.softTone} p-6`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${unit.glow}`} />
      <div className="relative flex gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-current/20 bg-black/35">
          <Icon className={`h-5 w-5 ${unit.text}`} />
        </div>
        <div>
          <h2 className="text-2xl font-black text-white">{title}</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">{text}</p>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-[9px] font-black uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function InfoBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item}
            className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1 text-xs font-bold text-white"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function InfoPanel({
  unit,
  title,
  items,
}: {
  unit: UnitConfig;
  title: string;
  items: string[];
}) {
  return (
    <div className={`relative overflow-hidden rounded-[2.2rem] border ${unit.softTone} p-6`}>
      <div className="relative">
        <p className="mb-4 text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">
          {title}
        </p>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {items.map((item) => (
            <div
              key={item}
              className="flex gap-3 rounded-2xl border border-white/10 bg-black/25 p-4"
            >
              <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${unit.text}`} />
              <p className="text-sm leading-6 text-white">{item}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function getOperationalStatus(unit: UnitConfig) {
  const statusByUnit: Record<RealUnitId, { level: string; state: string; channel: string; protocol: string }> = {
    GIOE: {
      level: "Risco Alto",
      state: "Pronto para intervenção",
      channel: "Canal tático restrito",
      protocol: "Entrada imediata",
    },
    NIC: {
      level: "Classificado",
      state: "Investigação ativa",
      channel: "Canal reservado",
      protocol: "Sigilo operacional",
    },
    UNT: {
      level: "Fiscalização",
      state: "Patrulhamento ativo",
      channel: "Canal rodoviário",
      protocol: "Operação STOP",
    },
    USHE: {
      level: "Protocolo",
      state: "Representação ativa",
      channel: "Canal institucional",
      protocol: "Honras de Estado",
    },
    GSA: {
      level: "Apoio aéreo",
      state: "Pronto para descolagem",
      channel: "Canal aéreo",
      protocol: "Vigilância superior",
    },
    DI: {
      level: "Ordem pública",
      state: "Intervenção pronta",
      channel: "Canal de contenção",
      protocol: "Presença dissuasora",
    },
  };

  return statusByUnit[unit.id];
}

function OperationalPanel({ unit, stats }: { unit: UnitConfig; stats: any }) {
  const status = getOperationalStatus(unit);
  const Icon = unit.icon;

  return (
    <div className={`relative overflow-hidden rounded-[2.6rem] border ${unit.softTone} bg-black/50 p-6`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${unit.glow}`} />
      <div className="absolute inset-0 cyber-grid-soft opacity-10" />

      <div className="relative">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground">
              Estado operacional
            </p>
            <h2 className="mt-2 text-3xl font-black text-white">
              {status.level}
            </h2>
          </div>

          <div className={`flex h-16 w-16 items-center justify-center rounded-2xl border border-current/20 bg-black/45 ${unit.text}`}>
            <Icon className="h-8 w-8" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <MiniStat label="Elementos" value={stats.members} />
          <MiniStat label="Ativos" value={stats.active} />
          <MiniStat label="Patrulhas" value={stats.patrols} />
          <MiniStat label="Eventos" value={stats.events} />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3">
          <StatusLine unit={unit} label="Estado" value={status.state} />
          <StatusLine unit={unit} label="Canal" value={status.channel} />
          <StatusLine unit={unit} label="Protocolo" value={status.protocol} />
          <StatusLine unit={unit} label="Role Discord" value={unit.roleId} mono />
        </div>
      </div>
    </div>
  );
}

function StatusLine({
  unit,
  label,
  value,
  mono = false,
}: {
  unit: UnitConfig;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/35 px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className={`text-right text-xs font-black uppercase tracking-[0.12em] ${unit.text} ${mono ? "font-mono" : ""}`}>
        {value}
      </p>
    </div>
  );
}

function MemberCard({ member, unit }: { member: any; unit: UnitConfig }) {
  const id = getGuardaId(member);
  const estado = String(member?.estado || member?.status || member?.discordStatus || "Indefinido");

  return (
    <Link
      href={id ? `/guardas/${id}` : unit.href}
      className={`group relative overflow-hidden rounded-[2rem] border ${unit.softTone} p-4 transition-all hover:-translate-y-1`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${unit.glow} opacity-60`} />

      <div className="relative flex items-center gap-4">
        {member?.avatar ? (
          <img
            src={member.avatar}
            alt={getGuardaName(member)}
            className="h-16 w-16 rounded-2xl border border-white/10 object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.035]">
            <Shield className="h-6 w-6 text-white" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-black text-white">
            {getGuardaName(member)}
          </p>
          <p className={`mt-1 truncate text-[10px] font-black uppercase tracking-[0.14em] ${unit.text}`}>
            {getGuardaRank(member)}
          </p>
          <div className="mt-2 inline-flex rounded-full border border-white/10 bg-black/35 px-3 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-muted-foreground">
            {estado}
          </div>
        </div>

        <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}

function EmptyMembers({ unit }: { unit: UnitConfig }) {
  return (
    <div className={`col-span-full relative overflow-hidden rounded-[2.4rem] border ${unit.softTone} p-8 text-center`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${unit.glow}`} />
      <div className="relative mx-auto flex max-w-xl flex-col items-center">
        <div className={`mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border border-current/20 bg-black/35 ${unit.text}`}>
          <Users className="h-9 w-9" />
        </div>

        <h3 className="text-2xl font-black text-white">
          Nenhum elemento sincronizado
        </h3>

        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Aguardando dados do Discord ou atualização do campo unidade nos perfis.
          Quando as roles estiverem sincronizadas, os elementos aparecem aqui
          automaticamente.
        </p>
      </div>
    </div>
  );
}

export { DEV_USER_ID };
