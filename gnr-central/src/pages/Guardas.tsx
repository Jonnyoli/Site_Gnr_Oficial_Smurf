import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import { useData } from "../context/DataContext";
import { Guarda } from "../data/mockData";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Shield,
  Users,
  Clock,
  UserCheck,
  UserX,
  LayoutGrid,
  Table2,
  Eye,
  Filter,
  RotateCcw,
  SlidersHorizontal
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";


const GNR_ROLE_ID = "1147878941974077478";

function roleId(value: any) {
  return typeof value === "string"
    ? value
    : String(
        value?.id ||
          value?.roleId ||
          "",
      );
}

function hasCurrentGnrRole(item: any) {
  /*
   * Compatível com respostas novas e antigas da API.
   * Só rejeita o membro quando a API diz explicitamente que saiu
   * do servidor; a ausência de isInGuild já não elimina o efetivo.
   */
  if (
    item?.isInGuild ===
    false
  ) {
    return false;
  }

  if (
    item?.isMilitar ===
    true
  ) {
    return true;
  }

  return [
    item?.roles,
    item?.discordRoles,
    item?.savedTags,
    item?.roleIds,
  ].some(
    (roles) =>
      Array.isArray(roles) &&
      roles
        .map(roleId)
        .includes(
          GNR_ROLE_ID,
        ),
  );
}

type DiscordTag = {
  id: string;
  name: string;
  color?: string | null;
};

type GuardaExtended = Guarda & {
  discordId?: string;
  horasSemanaAtual?: number;
  avatar?: string | null;
  discordStatus?: string;
  isDiscordOnline?: boolean;
  isOnDuty?: boolean;
  hierarchyGroup?: string;
  hierarchyGroupLabel?: string;
  hierarchyGroupOrder?: number;
  hierarchyOrder?: number;
  rankRoleId?: string;
  groupRoleId?: string;
  roles?: string[];
  discordRoles?: string[];
  savedTags?: string[];
  discordTags?: DiscordTag[];
};

const HIERARCHY_GROUPS = {
  COMANDO_GERAL: {
    label: "Comando Geral",
    description: "Comando superior e direção estratégica da força.",
    style: "border-rose-400/25 text-rose-300 bg-rose-500/5"
  },
  OFICIAIS: {
    label: "Oficiais",
    description: "Membros da hierarquia de comando e coordenação das forças.",
    style: "border-purple-400/25 text-purple-300 bg-purple-500/5"
  },
  SARGENTOS: {
    label: "Sargentos",
    description: "Elemento de ligação fundamental no comando operacional e instrução.",
    style: "border-yellow-400/25 text-yellow-300 bg-yellow-500/5"
  },
  GUARDAS: {
    label: "Guardas",
    description: "Corpo operacional encarregue de missões terrestres e patrulhamento.",
    style: "border-emerald-400/25 text-emerald-300 bg-emerald-500/5"
  },
  CFG: {
    label: "CFG",
    description: "Militares em formação e ingresso na carreira da Guarda.",
    style: "border-cyan-400/25 text-cyan-300 bg-cyan-500/5"
  },
  SEM_POSTO: {
    label: "Sem Posto",
    description: "Elementos sem posto reconhecido através dos cargos do Discord.",
    style: "border-slate-400/25 text-slate-300 bg-slate-500/5"
  }
};

const FALLBACK_RANK_ORDER: Record<string, number> = {
  "Comandante Geral": 1,
  "Tenente General": 2,
  "Major General": 3,
  "Brigadeiro General": 4,

  "Coronel": 10,
  "Tenente Coronel": 11,
  "Major": 12,
  "Capitão": 13,
  "Tenente": 14,
  "Alferes": 15,
  "Aspirante a Oficial": 16,

  "Sargento Mor": 20,
  "Sargento Chefe": 21,
  "Primeiro Sargento": 22,
  "Segundo Sargento": 23,
  "Furriel": 24,

  "Cabo Mor": 30,
  "Cabo Chefe": 31,
  "Cabo": 32,
  "Guarda Principal": 33,
  "Guarda": 34,

  "Guarda Provisório": 40
};

const POSTO_OPTIONS = [
  "Guarda",
  "Guarda Principal",
  "Cabo",
  "Cabo Chefe",
  "Cabo Mor",
  "Guarda Provisório",
  "Furriel",
  "Segundo Sargento",
  "Primeiro Sargento",
  "Sargento Chefe",
  "Sargento Mor",
  "Alferes",
  "Tenente",
  "Capitão",
  "Major",
  "Tenente Coronel",
  "Coronel",
  "Brigadeiro General",
  "Major General",
  "Tenente General",
  "Comandante Geral"
] as const;

const HIDDEN_TAGS = [
  "@everyone",
  "COMANDO-GERAL",
  "COMANDO GERAL",
  "OFICIAIS",
  "SARGENTOS",
  "GUARDAS",
  "CFG",

  "Comandante Geral",
  "Tenente General",
  "Major General",
  "Brigadeiro General",

  "Coronel",
  "Tenente Coronel",
  "Major",
  "Capitão",
  "Tenente",
  "Tenenete",
  "Alferes",
  "Aspirante a Oficial",

  "Sargento Mor",
  "Sargento Chefe",
  "Primeiro Sargento",
  "Segundo Sargento",
  "Furriel",

  "Cabo Mor",
  "Cabo Chefe",
  "Cabo",
  "Guarda Principal",
  "Guarda",
  "Guarda Provisório"
];

function getHierarchyOrder(guarda: GuardaExtended) {
  return guarda.hierarchyOrder ?? FALLBACK_RANK_ORDER[guarda.posto] ?? 999;
}

function getHierarchyGroup(guarda: GuardaExtended) {
  if (guarda.hierarchyGroup) return guarda.hierarchyGroup;

  const order = getHierarchyOrder(guarda);

  if (order < 10) return "COMANDO_GERAL";
  if (order < 20) return "OFICIAIS";
  if (order < 30) return "SARGENTOS";
  if (order < 40) return "GUARDAS";
  if (order < 50) return "CFG";

  return "SEM_POSTO";
}

const guardaSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  numero: z.string().min(3, "Número inválido"),
  posto: z.string().min(2, "Posto inválido"),
  unidade: z.enum(["Patrulha", "Investigação", "Trânsito", "Operações"]),
  horasDiarias: z.coerce.number().min(0).max(24),
  horasSemanais: z.coerce.number().min(0).max(168),
  horasMensais: z.coerce.number().min(0).max(720),
  estado: z.enum(["Em serviço", "Folga", "Ausente"]),
  dataIngresso: z.string().min(10)
});

const estadoOptions = ["todos", "Em serviço", "Folga", "Ausente"];

export default function Guardas() {
  const { guardas, addGuarda, updateGuarda, removeGuarda, isLoading } = useData();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterEstado, setFilterEstado] = useState<string>("todos");
  const [filterUnidade, setFilterUnidade] = useState<string>("todas");
  const [filterPosto, setFilterPosto] = useState<string>("todos");
  const [sortBy, setSortBy] = useState<"hierarquia" | "nome" | "horas" | "estado">("hierarquia");
  const [viewMode, setViewMode] = useState<"table" | "hierarchy">(() =>
    window.localStorage.getItem("gnr-efetivo-view") === "table"
      ? "table"
      : "hierarchy"
  );

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [editingGuarda, setEditingGuarda] = useState<Guarda | null>(null);
  const [guardaToDelete, setGuardaToDelete] = useState<string | null>(null);

  useEffect(() => {
    window.localStorage.setItem("gnr-efetivo-view", viewMode);
  }, [viewMode]);

  const normalizedGuardas = useMemo(() => {
    const map = new Map<string, GuardaExtended>();

    ((guardas || []) as GuardaExtended[]).forEach((guarda, index) => {
      if (!guarda || !hasCurrentGnrRole(guarda)) return;

      const key = String(
        guarda.discordId ||
          guarda.id ||
          guarda.numero ||
          `${guarda.nome || "militar"}-${index}`
      );

      map.set(key, {
        ...(map.get(key) || {}),
        ...guarda,
      });
    });

    return [...map.values()];
  }, [guardas]);

  const availableUnits = useMemo(
    () =>
      [...new Set(
        normalizedGuardas
          .map((guarda) => String(guarda.unidade || "").trim())
          .filter(Boolean)
      )].sort((a, b) => a.localeCompare(b, "pt-PT")),
    [normalizedGuardas]
  );

  const availableRanks = useMemo(
    () =>
      [...new Set(
        normalizedGuardas
          .map((guarda) => String(guarda.posto || "").trim())
          .filter(Boolean)
      )].sort(
        (a, b) =>
          (FALLBACK_RANK_ORDER[a] ?? 999) -
          (FALLBACK_RANK_ORDER[b] ?? 999)
      ),
    [normalizedGuardas]
  );

  const form = useForm<z.infer<typeof guardaSchema>>({
    resolver: zodResolver(guardaSchema),
    defaultValues: {
      nome: "",
      numero: "",
      posto: "Guarda",
      unidade: "Patrulha",
      horasDiarias: 8,
      horasSemanais: 40,
      horasMensais: 160,
      estado: "Em serviço",
      dataIngresso: new Date().toISOString().split("T")[0]
    }
  });

  const filteredGuardas = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return normalizedGuardas
      .filter((g) => {
        const searchable = [
          g.nome,
          g.numero,
          g.posto,
          g.unidade,
          g.discordId,
          ...(g.discordTags || []).map((tag) => tag.name),
        ]
          .filter(Boolean)
          .map((value) => String(value).toLowerCase());

        const matchesSearch =
          !search ||
          searchable.some((value) => value.includes(search));

        const matchesEstado =
          filterEstado === "todos" || g.estado === filterEstado;

        const matchesUnidade =
          filterUnidade === "todas" || g.unidade === filterUnidade;

        const matchesPosto =
          filterPosto === "todos" || g.posto === filterPosto;

        return (
          matchesSearch &&
          matchesEstado &&
          matchesUnidade &&
          matchesPosto
        );
      })
      .sort((a, b) => {
        if (sortBy === "nome") {
          return String(a.nome || "").localeCompare(
            String(b.nome || ""),
            "pt-PT"
          );
        }

        if (sortBy === "horas") {
          return (
            Number(
              b.horasSemanaAtual ??
              b.horasSemanais ??
              0,
            ) -
            Number(
              a.horasSemanaAtual ??
              a.horasSemanais ??
              0,
            )
          );
        }

        if (sortBy === "estado") {
          const order: Record<string, number> = {
            "Em serviço": 0,
            Folga: 1,
            Ausente: 2,
          };

          return (
            (order[a.estado] ?? 9) -
              (order[b.estado] ?? 9) ||
            String(a.nome || "").localeCompare(
              String(b.nome || ""),
              "pt-PT"
            )
          );
        }

        const orderA = getHierarchyOrder(a);
        const orderB = getHierarchyOrder(b);

        if (orderA !== orderB) return orderA - orderB;

        return String(a.nome || "").localeCompare(
          String(b.nome || ""),
          "pt-PT"
        );
      });
  }, [
    normalizedGuardas,
    searchTerm,
    filterEstado,
    filterUnidade,
    filterPosto,
    sortBy,
  ]);

  const stats = useMemo(() => {
    const list = normalizedGuardas;

    return {
      total: list.length,
      emServico: list.filter((g) => g.estado === "Em serviço").length,
      folga: list.filter((g) => g.estado === "Folga").length,
      ausente: list.filter((g) => g.estado === "Ausente").length
    };
  }, [guardas]);

  const comandoGeral = filteredGuardas.filter((g) => getHierarchyGroup(g) === "COMANDO_GERAL");
  const oficiais = filteredGuardas.filter((g) => getHierarchyGroup(g) === "OFICIAIS");
  const sargentos = filteredGuardas.filter((g) => getHierarchyGroup(g) === "SARGENTOS");
  const guardasGrupo = filteredGuardas.filter((g) => getHierarchyGroup(g) === "GUARDAS");
  const cfg = filteredGuardas.filter((g) => getHierarchyGroup(g) === "CFG");
  const semPosto = filteredGuardas.filter((g) => getHierarchyGroup(g) === "SEM_POSTO");

  const getProfileId = (guarda: GuardaExtended) => {
    return String(guarda.discordId || guarda.id || "");
  };

  const openProfile = (guarda: GuardaExtended) => {
    const profileId = getProfileId(guarda);

    if (!profileId) return;

    navigate(`/guardas/${profileId}`);
  };

  const getInitials = (nome?: string) => {
    if (!nome) return "G";

    return nome
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const isDiscordOnline = (guarda: GuardaExtended) => {
    return guarda.isDiscordOnline || guarda.discordStatus === "online";
  };

  const getAvatarUrl = (guarda: GuardaExtended) => {
    return guarda.avatar || null;
  };

  const getPostoColor = (posto: string) => {
    switch (posto) {
      case "Comandante Geral":
      case "Tenente General":
      case "Major General":
      case "Brigadeiro General":
        return "border-rose-400/40 text-rose-300 bg-rose-500/10";

      case "Coronel":
      case "Tenente Coronel":
      case "Major":
      case "Capitão":
        return "border-purple-400/40 text-purple-300 bg-purple-500/10";

      case "Tenente":
      case "Alferes":
      case "Aspirante a Oficial":
        return "border-blue-400/40 text-blue-300 bg-blue-500/10";

      case "Sargento Mor":
      case "Sargento Chefe":
      case "Primeiro Sargento":
      case "Segundo Sargento":
      case "Furriel":
      case "Sargento":
        return "border-amber-400/40 text-amber-300 bg-amber-500/10";

      case "Cabo Mor":
      case "Cabo Chefe":
      case "Cabo":
        return "border-orange-400/40 text-orange-300 bg-orange-500/10";

      case "Guarda Provisório":
      case "CFG":
        return "border-cyan-400/40 text-cyan-300 bg-cyan-500/10";

      default:
        return "border-slate-400/30 text-slate-300 bg-slate-500/10";
    }
  };

  const getEstadoStyles = (estado: string) => {
    switch (estado) {
      case "Em serviço":
        return {
          dot: "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)] animate-pulse",
          badge: "border-emerald-400/20 bg-emerald-500/10 text-emerald-300",
          glow: "bg-emerald-500/20"
        };

      case "Folga":
        return {
          dot: "bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.7)]",
          badge: "border-yellow-400/20 bg-yellow-500/10 text-yellow-300",
          glow: "bg-yellow-500/20"
        };

      default:
        return {
          dot: "bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.7)]",
          badge: "border-red-400/20 bg-red-500/10 text-red-300",
          glow: "bg-red-500/20"
        };
    }
  };

  const getUnidadeDot = (unidade: string) => {
    switch (unidade) {
      case "Investigação":
        return "bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]";
      case "Trânsito":
        return "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]";
      case "Operações":
        return "bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.8)]";
      default:
        return "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]";
    }
  };

  const getCleanTagName = (name: string) => {
    return name
      .replace(/^[-|•\s]+/g, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  const shouldShowTag = (tagName: string) => {
    const clean = getCleanTagName(tagName);

    if (!clean) return false;

    return !HIDDEN_TAGS.some(
      (hidden) => hidden.toLowerCase() === clean.toLowerCase()
    );
  };

  const getVisibleTags = (guarda: GuardaExtended) => {
    return (guarda.discordTags || [])
      .filter((tag) => tag?.name && shouldShowTag(tag.name))
      .map((tag) => ({
        ...tag,
        name: getCleanTagName(tag.name)
      }))
      .slice(0, 5);
  };

  const openAddForm = () => {
    setEditingGuarda(null);

    form.reset({
      nome: "",
      numero: "",
      posto: "Guarda",
      unidade: "Patrulha",
      horasDiarias: 8,
      horasSemanais: 40,
      horasMensais: 160,
      estado: "Em serviço",
      dataIngresso: new Date().toISOString().split("T")[0]
    });

    setIsFormOpen(true);
  };

  const openEditForm = (guarda: Guarda) => {
    setEditingGuarda(guarda);

    form.reset({
      nome: guarda.nome,
      numero: guarda.numero,
      posto: guarda.posto,
      unidade: guarda.unidade,
      horasDiarias: guarda.horasDiarias,
      horasSemanais: guarda.horasSemanais,
      horasMensais: guarda.horasMensais,
      estado: guarda.estado,
      dataIngresso: guarda.dataIngresso
    });

    setIsFormOpen(true);
  };

  const confirmDelete = (id: string) => {
    setGuardaToDelete(id);
    setIsAlertOpen(true);
  };

  const handleDelete = () => {
    if (guardaToDelete) {
      removeGuarda(guardaToDelete);

      toast({
        title: "Guarda removido",
        description: "O guarda foi removido do sistema com sucesso."
      });
    }

    setIsAlertOpen(false);
  };

  const onSubmit = (values: z.infer<typeof guardaSchema>) => {
    if (editingGuarda) {
      updateGuarda(editingGuarda.id, {
        ...values,
        horasTotal: editingGuarda.horasTotal
      });

      toast({
        title: "Guarda atualizado",
        description: "As informações do guarda foram atualizadas."
      });
    } else {
      addGuarda({
        ...values,
        horasTotal: 0
      });

      toast({
        title: "Guarda adicionado",
        description: "O novo guarda foi registado no sistema."
      });
    }

    setIsFormOpen(false);
  };

  const renderAvatar = (guarda: GuardaExtended, size: "sm" | "lg" = "lg") => {
    const avatar = getAvatarUrl(guarda);
    const online = isDiscordOnline(guarda);

    const wrapperSize = size === "lg" ? "h-14 w-14" : "h-9 w-9";
    const imageRadius = size === "lg" ? "rounded-2xl" : "rounded-xl";
    const textSize = size === "lg" ? "text-sm" : "text-xs";
    const statusSize = size === "lg" ? "h-4 w-4 -bottom-1 -right-1" : "h-3 w-3 -bottom-0.5 -right-0.5";
    const borderColor = size === "lg" ? "border-[#07100d]" : "border-[#050b09]";

    return (
      <div className={`relative shrink-0 ${wrapperSize}`}>
        {avatar ? (
          <img
            src={avatar}
            alt={guarda.nome}
            className={`${wrapperSize} ${imageRadius} border border-white/10 object-cover shadow-inner`}
            loading="lazy"
          />
        ) : (
          <div className={`flex ${wrapperSize} ${imageRadius} items-center justify-center border border-white/10 bg-white/[0.045] ${textSize} font-black text-white shadow-inner`}>
            {getInitials(guarda.nome)}
          </div>
        )}

        <div
          className={`absolute ${statusSize} rounded-full border-2 ${borderColor} ${
            online
              ? "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]"
              : "bg-slate-600"
          }`}
          title={online ? "Online no Discord" : "Offline no Discord"}
        />
      </div>
    );
  };

  const renderDiscordStatus = (guarda: GuardaExtended) => {
    const online = isDiscordOnline(guarda);

    return (
      <div className="flex items-center gap-2">
        <div
          className={`h-2 w-2 rounded-full ${
            online
              ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]"
              : "bg-slate-600"
          }`}
        />

        <span
          className={`text-[10px] font-black uppercase tracking-[0.16em] ${
            online ? "text-emerald-300" : "text-slate-600"
          }`}
        >
          {online ? "Online" : "Offline"}
        </span>
      </div>
    );
  };

  const renderDiscordTags = (guarda: GuardaExtended, compact = false) => {
    const tags = getVisibleTags(guarda);

    if (tags.length === 0) return null;

    return (
      <div className={`flex flex-wrap gap-1.5 ${compact ? "mt-1" : "mt-3"}`}>
        {tags.map((tag) => (
          <span
            key={tag.id}
            className={`max-w-[190px] truncate rounded-full border border-white/10 bg-white/[0.045] font-black uppercase tracking-[0.12em] text-slate-300 ${
              compact ? "px-2 py-0.5 text-[7px]" : "px-2.5 py-1 text-[8px]"
            }`}
            title={tag.name}
          >
            {tag.name}
          </span>
        ))}
      </div>
    );
  };

  const renderGuardCard = (guarda: GuardaExtended) => {
    const estadoStyles = getEstadoStyles(guarda.estado);
    const visibleTags = getVisibleTags(guarda);

    return (
      <motion.div
        key={guarda.id}
        whileHover={{ y: -6, scale: 1.01 }}
        transition={{ duration: 0.18 }}
        onClick={() => openProfile(guarda)}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openProfile(guarda);
          }
        }}
        className="group relative min-h-[230px] cursor-pointer overflow-hidden rounded-3xl border border-white/8 bg-[#07100d]/75 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl transition-all hover:border-emerald-400/25 hover:bg-[#091610]/90"
      >
        <div className={`absolute -right-8 -top-8 h-28 w-28 rounded-full ${estadoStyles.glow} blur-[50px] opacity-50 transition-all group-hover:opacity-80`} />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

        <div className="relative flex items-start justify-between gap-4">
          <div className="flex min-w-0 gap-4">
            {renderAvatar(guarda, "lg")}

            <div className="min-w-0">
              <h4 className="truncate text-base font-black tracking-wide text-white transition-colors group-hover:text-emerald-300">
                {guarda.nome}
              </h4>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded-lg border border-emerald-400/15 bg-emerald-400/10 px-2 py-1 font-mono text-[10px] font-black text-emerald-300">
                  {guarda.numero}
                </span>

                <Badge
                  variant="outline"
                  className={`h-5 px-2 text-[8px] font-black uppercase tracking-[0.16em] ${getPostoColor(guarda.posto)}`}
                >
                  {guarda.posto}
                </Badge>
              </div>

              <div className="mt-2">
                {renderDiscordStatus(guarda)}
              </div>
            </div>
          </div>

          <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              variant="ghost"
              size="icon"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                openProfile(guarda);
              }}
              className="h-8 w-8 rounded-xl text-slate-400 hover:bg-emerald-500/10 hover:text-emerald-300"
              title="Ver perfil"
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                openEditForm(guarda);
              }}
              className="h-8 w-8 rounded-xl text-slate-400 hover:bg-white/10 hover:text-white"
              title="Editar"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                confirmDelete(guarda.id);
              }}
              className="h-8 w-8 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-300"
              title="Remover"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {visibleTags.length > 0 && renderDiscordTags(guarda)}

        <div className="relative mt-5 h-px w-full bg-white/8" />

        <div className="relative mt-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${getUnidadeDot(guarda.unidade)}`} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              {guarda.unidade}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-slate-400">
              <strong className="text-white">
                {Number(
                  guarda.horasSemanaAtual ??
                  guarda.horasSemanais ??
                  0,
                ).toFixed(1)}
              </strong>h
            </span>

            <div className={`flex items-center gap-2 rounded-full border px-3 py-1 ${estadoStyles.badge}`}>
              <div className={`h-1.5 w-1.5 rounded-full ${estadoStyles.dot}`} />

              <span className="text-[10px] font-black">
                {guarda.estado}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderHierarchyGroup = (
    title: string,
    description: string,
    titleBadgeStyle: string,
    groupGuardas: GuardaExtended[]
  ) => {
    return (
      <section className="relative z-10 w-full space-y-6">
        <div className="flex flex-col items-center text-center">
          <span className={`rounded-full border px-5 py-2 text-[11px] font-black uppercase tracking-[0.25em] shadow-lg ${titleBadgeStyle}`}>
            {title}
          </span>

          <p className="mt-3 max-w-xl text-xs leading-6 text-slate-500">
            {description}
          </p>
        </div>

        {groupGuardas.length > 0 ? (
          <div className="grid w-full grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
            {groupGuardas.map(renderGuardCard)}
          </div>
        ) : (
          <div className="rounded-3xl border border-white/8 bg-white/[0.025] p-8 text-center text-xs font-bold uppercase tracking-[0.18em] text-slate-600">
            Nenhum militar deste escalão encontrado
          </div>
        )}
      </section>
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-emerald-400" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-8"
    >
      <section className="relative overflow-hidden rounded-[2rem] border border-white/8 bg-[#050b09]/70 p-6 shadow-[0_20px_90px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-500/10 blur-[100px]" />
        <div className="absolute -bottom-24 left-1/4 h-72 w-72 rounded-full bg-yellow-500/5 blur-[110px]" />

        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.28em] text-emerald-400">
              <Shield className="h-4 w-4" />
              Efetivo operacional
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <h1 className="text-4xl font-black tracking-tight text-white">
                Efetivo
              </h1>

              <Badge className="border border-emerald-400/25 bg-emerald-500/10 px-3 py-1 text-sm font-black text-emerald-300">
                {stats.total} operacionais registados
              </Badge>
            </div>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">
              Gestão de militares, escalões, estados operacionais e informação de serviço.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:w-[620px]">
            <MiniStat icon={<Users className="h-4 w-4" />} label="Total" value={stats.total} />
            <MiniStat icon={<UserCheck className="h-4 w-4" />} label="Serviço" value={stats.emServico} tone="green" />
            <MiniStat icon={<Clock className="h-4 w-4" />} label="Folga" value={stats.folga} tone="yellow" />
            <MiniStat icon={<UserX className="h-4 w-4" />} label="Ausente" value={stats.ausente} tone="red" />
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-[1.8rem] border border-white/10 bg-[#06100c]/80 p-4 backdrop-blur-xl">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {estadoOptions.map((estado) => (
              <button
                key={estado}
                type="button"
                onClick={() => setFilterEstado(estado)}
                className={`rounded-full px-4 py-2 text-sm font-bold transition-all ${
                  filterEstado === estado
                    ? "bg-emerald-500 text-black shadow-[0_0_22px_rgba(16,185,129,0.28)]"
                    : "border border-white/8 bg-white/[0.025] text-slate-400 hover:border-emerald-400/25 hover:text-white"
                }`}
              >
                {estado === "todos" ? "Todos" : estado}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex gap-2 rounded-full border border-white/8 bg-white/[0.025] p-1">
              <button
                type="button"
                onClick={() => setViewMode("hierarchy")}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.16em] transition-all ${
                  viewMode === "hierarchy"
                    ? "bg-emerald-500 text-black"
                    : "text-slate-500 hover:text-white"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Hierarquia
              </button>

              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.16em] transition-all ${
                  viewMode === "table"
                    ? "bg-emerald-500 text-black"
                    : "text-slate-500 hover:text-white"
                }`}
              >
                <Table2 className="h-3.5 w-3.5" />
                Tabela
              </button>
            </div>

            <Button
              onClick={openAddForm}
              data-testid="button-add-guarda"
              className="h-11 rounded-full bg-emerald-500 px-6 font-black text-black shadow-[0_0_28px_rgba(16,185,129,0.28)] hover:bg-emerald-400"
            >
              <Plus className="mr-2 h-5 w-5" />
              Adicionar Guarda
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(250px,1fr)_190px_190px_180px_auto]">
          <div className="relative">
            <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Nome, NIM, posto, unidade, tag ou Discord ID..."
              className="h-11 rounded-xl border-white/10 bg-black/25 pl-11 text-white placeholder:text-slate-600"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              data-testid="input-search-guardas"
            />
          </div>

          <select
            value={filterUnidade}
            onChange={(event) => setFilterUnidade(event.target.value)}
            className="h-11 rounded-xl border border-white/10 bg-black/25 px-3 text-sm text-white outline-none"
          >
            <option value="todas">Todas as unidades</option>
            {availableUnits.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>

          <select
            value={filterPosto}
            onChange={(event) => setFilterPosto(event.target.value)}
            className="h-11 rounded-xl border border-white/10 bg-black/25 px-3 text-sm text-white outline-none"
          >
            <option value="todos">Todos os postos</option>
            {availableRanks.map((rank) => (
              <option key={rank} value={rank}>
                {rank}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(event) =>
              setSortBy(
                event.target.value as
                  | "hierarquia"
                  | "nome"
                  | "horas"
                  | "estado"
              )
            }
            className="h-11 rounded-xl border border-white/10 bg-black/25 px-3 text-sm text-white outline-none"
          >
            <option value="hierarquia">Ordenar: hierarquia</option>
            <option value="nome">Ordenar: nome</option>
            <option value="horas">Ordenar: horas</option>
            <option value="estado">Ordenar: estado</option>
          </select>

          <button
            type="button"
            onClick={() => {
              setSearchTerm("");
              setFilterEstado("todos");
              setFilterUnidade("todas");
              setFilterPosto("todos");
              setSortBy("hierarquia");
            }}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-4 text-[9px] font-black uppercase tracking-[0.12em] text-white/45 hover:text-white"
          >
            <RotateCcw className="h-4 w-4" />
            Limpar
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3">
          <div className="flex items-center gap-2 text-xs text-white/35">
            <Filter className="h-4 w-4 text-emerald-300" />
            <strong className="text-white">
              {filteredGuardas.length}
            </strong>
            resultado{filteredGuardas.length === 1 ? "" : "s"} de{" "}
            {normalizedGuardas.length}
          </div>

          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.12em] text-white/25">
            <SlidersHorizontal className="h-4 w-4" />
            Filtros combinados
          </div>
        </div>
      </section>

      {viewMode === "table" ? (
        <div className="overflow-hidden rounded-3xl border border-white/8 bg-[#050b09]/70 shadow-xl backdrop-blur-xl">
          <Table>
            <TableHeader className="bg-white/[0.025]">
              <TableRow className="border-white/8 hover:bg-transparent">
                <TableHead className="h-12 text-xs font-black uppercase tracking-[0.18em] text-slate-500">Operacional</TableHead>
                <TableHead className="h-12 text-xs font-black uppercase tracking-[0.18em] text-slate-500">NIM</TableHead>
                <TableHead className="h-12 text-xs font-black uppercase tracking-[0.18em] text-slate-500">Posto</TableHead>
                <TableHead className="h-12 text-xs font-black uppercase tracking-[0.18em] text-slate-500">Unidade</TableHead>
                <TableHead className="h-12 text-right text-xs font-black uppercase tracking-[0.18em] text-slate-500">Horas</TableHead>
                <TableHead className="h-12 text-xs font-black uppercase tracking-[0.18em] text-slate-500">Estado</TableHead>
                <TableHead className="h-12 text-right text-xs font-black uppercase tracking-[0.18em] text-slate-500">Ações</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredGuardas.length > 0 ? (
                filteredGuardas.map((guarda) => {
                  const estadoStyles = getEstadoStyles(guarda.estado);

                  return (
                    <TableRow
                      key={guarda.id}
                      onClick={() => openProfile(guarda)}
                      className="group cursor-pointer border-white/8 transition-colors hover:bg-white/[0.025]"
                    >
                      <TableCell>
                        <div className="flex items-start gap-3">
                          {renderAvatar(guarda, "sm")}

                          <div>
                            <span className="block font-black tracking-wide text-white group-hover:text-emerald-300">
                              {guarda.nome}
                            </span>

                            <div className="mt-1">
                              {renderDiscordStatus(guarda)}
                            </div>

                            {renderDiscordTags(guarda, true)}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <span className="rounded-lg border border-emerald-400/15 bg-emerald-400/10 px-2 py-1 font-mono text-xs font-black text-emerald-300">
                          {guarda.numero}
                        </span>
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline" className={`text-[9px] font-black uppercase tracking-[0.14em] ${getPostoColor(guarda.posto)}`}>
                          {guarda.posto}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${getUnidadeDot(guarda.unidade)}`} />

                          <span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-300">
                            {guarda.unidade}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="text-right">
                        <span className="font-mono font-black text-white">
                          {Number(
                          guarda.horasSemanaAtual ??
                          guarda.horasSemanais ??
                          0,
                        ).toFixed(1)}
                        </span>

                        <span className="ml-1 text-xs text-slate-500">h</span>
                      </TableCell>

                      <TableCell>
                        <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 ${estadoStyles.badge}`}>
                          <div className={`h-1.5 w-1.5 rounded-full ${estadoStyles.dot}`} />

                          <span className="text-[10px] font-black">
                            {guarda.estado}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              openProfile(guarda);
                            }}
                            className="h-8 w-8 rounded-xl text-slate-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                            title="Ver perfil"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              openEditForm(guarda);
                            }}
                            className="h-8 w-8 rounded-xl text-slate-400 hover:bg-white/10 hover:text-white"
                            data-testid={`button-edit-${guarda.id}`}
                            title="Editar"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              confirmDelete(guarda.id);
                            }}
                            className="h-8 w-8 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-300"
                            data-testid={`button-delete-${guarda.id}`}
                            title="Remover"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                    Nenhum operacional encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="relative my-4 flex w-full flex-col items-center gap-12">
          <div className="absolute bottom-4 left-1/2 top-4 hidden w-px -translate-x-1/2 bg-gradient-to-b from-rose-400/20 via-purple-400/20 via-yellow-400/20 to-emerald-400/20 opacity-60 md:block" />

          {renderHierarchyGroup(
            HIERARCHY_GROUPS.COMANDO_GERAL.label,
            HIERARCHY_GROUPS.COMANDO_GERAL.description,
            HIERARCHY_GROUPS.COMANDO_GERAL.style,
            comandoGeral
          )}

          {renderHierarchyGroup(
            HIERARCHY_GROUPS.OFICIAIS.label,
            HIERARCHY_GROUPS.OFICIAIS.description,
            HIERARCHY_GROUPS.OFICIAIS.style,
            oficiais
          )}

          {renderHierarchyGroup(
            HIERARCHY_GROUPS.SARGENTOS.label,
            HIERARCHY_GROUPS.SARGENTOS.description,
            HIERARCHY_GROUPS.SARGENTOS.style,
            sargentos
          )}

          {renderHierarchyGroup(
            HIERARCHY_GROUPS.GUARDAS.label,
            HIERARCHY_GROUPS.GUARDAS.description,
            HIERARCHY_GROUPS.GUARDAS.style,
            guardasGrupo
          )}

          {renderHierarchyGroup(
            HIERARCHY_GROUPS.CFG.label,
            HIERARCHY_GROUPS.CFG.description,
            HIERARCHY_GROUPS.CFG.style,
            cfg
          )}

          {semPosto.length > 0 &&
            renderHierarchyGroup(
              HIERARCHY_GROUPS.SEM_POSTO.label,
              HIERARCHY_GROUPS.SEM_POSTO.description,
              HIERARCHY_GROUPS.SEM_POSTO.style,
              semPosto
            )}
        </div>
      )}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="border-white/10 bg-[#050b09] text-white shadow-2xl sm:max-w-[620px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight">
              {editingGuarda ? "Editar Operacional" : "Adicionar Operacional"}
            </DialogTitle>

            <DialogDescription className="text-slate-500">
              Preencha os detalhes no sistema central.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-400">Nome Completo</FormLabel>

                      <FormControl>
                        <Input className="border-white/10 bg-black/30" placeholder="Nome do guarda" {...field} />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="numero"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-400">NIM</FormLabel>

                      <FormControl>
                        <Input className="border-white/10 bg-black/30 font-mono text-emerald-300" placeholder="GNR-XXX" {...field} />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="posto"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-400">Posto</FormLabel>

                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="border-white/10 bg-black/30">
                            <SelectValue placeholder="Selecione o posto" />
                          </SelectTrigger>
                        </FormControl>

                        <SelectContent className="border-white/10 bg-[#050b09]">
                          {POSTO_OPTIONS.map((posto) => (
                            <SelectItem key={posto} value={posto}>
                              {posto}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="unidade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-400">Unidade</FormLabel>

                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="border-white/10 bg-black/30">
                            <SelectValue placeholder="Selecione a unidade" />
                          </SelectTrigger>
                        </FormControl>

                        <SelectContent className="border-white/10 bg-[#050b09]">
                          <SelectItem value="Patrulha">Patrulha</SelectItem>
                          <SelectItem value="Investigação">Investigação</SelectItem>
                          <SelectItem value="Trânsito">Trânsito</SelectItem>
                          <SelectItem value="Operações">Operações</SelectItem>
                        </SelectContent>
                      </Select>

                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="estado"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-400">Estado</FormLabel>

                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="border-white/10 bg-black/30">
                            <SelectValue placeholder="Selecione o estado" />
                          </SelectTrigger>
                        </FormControl>

                        <SelectContent className="border-white/10 bg-[#050b09]">
                          <SelectItem value="Em serviço">Em serviço</SelectItem>
                          <SelectItem value="Folga">Folga</SelectItem>
                          <SelectItem value="Ausente">Ausente</SelectItem>
                        </SelectContent>
                      </Select>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dataIngresso"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-400">Data de Ingresso</FormLabel>

                      <FormControl>
                        <Input type="date" className="border-white/10 bg-black/30" {...field} />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  className="border-white/10 bg-transparent hover:bg-white/5"
                  onClick={() => setIsFormOpen(false)}
                >
                  Cancelar
                </Button>

                <Button
                  type="submit"
                  className="bg-emerald-500 font-black text-black hover:bg-emerald-400"
                >
                  Confirmar
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent className="border-white/10 bg-[#050b09] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Guarda</AlertDialogTitle>

            <AlertDialogDescription className="text-slate-500">
              Tem a certeza que pretende remover este operacional? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 bg-transparent hover:bg-white/5">
              Cancelar
            </AlertDialogCancel>

            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 text-white hover:bg-red-500"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}

function MiniStat({
  icon,
  label,
  value,
  tone = "default"
}: {
  icon: ReactNode;
  label: string;
  value: number;
  tone?: "default" | "green" | "yellow" | "red";
}) {
  const toneMap = {
    default: "text-slate-300 bg-white/[0.035] border-white/8",
    green: "text-emerald-300 bg-emerald-500/10 border-emerald-400/15",
    yellow: "text-yellow-300 bg-yellow-500/10 border-yellow-400/15",
    red: "text-red-300 bg-red-500/10 border-red-400/15"
  };

  return (
    <div className={`rounded-2xl border p-4 ${toneMap[tone]}`}>
      <div className="mb-3 flex items-center justify-between">
        <span>{icon}</span>
        <span className="text-2xl font-black text-white">{value}</span>
      </div>

      <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-75">
        {label}
      </p>
    </div>
  );
}