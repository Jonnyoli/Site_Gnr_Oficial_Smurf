import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  ArrowUpCircle,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Download,
  ExternalLink,
  FileText,
  FileWarning,
  Gavel,
  History,
  Image as ImageIcon,
  Loader2,
  Megaphone,
  Paperclip,
  Pencil,
  Play,
  Plus,
  RefreshCcw,
  RotateCcw,
  Save,
  Search,
  Shield,
  ShieldAlert,
  SlidersHorizontal,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

type DisciplinaryEvent = {
  type: string;
  roleId: string | null;
  label: string;
  at: string;
  source: string;
  actorDiscordId?: string | null;
  actorName?: string | null;
  metadata?: Record<string, unknown>;
};

type DisciplinaryAttachment = {
  id?: string;
  filename: string;
  url: string;
  proxyUrl?: string | null;
  proxy_url?: string | null;
  contentType?: string | null;
  content_type?: string | null;
  size?: number | null;
  width?: number | null;
  height?: number | null;
  source?: "SITE" | "DISCORD" | "EXTERNAL";
};

type DisciplinaryItem = {
  _id: string;
  targetDiscordId: string;
  targetName: string | null;
  targetRank: string | null;
  type: string;
  status: string;
  title: string;
  reason: string | null;
  sanction: string | null;
  fullContent: string;
  managedBySite?: boolean;
  visibility?: string;
  discordMessageId: string | null;
  discordChannelId: string | null;
  roleId: string | null;
  responsibleDiscordId: string | null;
  responsibleName: string | null;
  createdByDiscordId?: string | null;
  createdByName?: string | null;
  updatedByDiscordId?: string | null;
  updatedByName?: string | null;
  removedByDiscordId?: string | null;
  removedByName?: string | null;
  appliedAt: string | null;
  removedAt: string | null;
  replacedAt?: string | null;
  events: DisciplinaryEvent[];
  attachments?: DisciplinaryAttachment[];
  createdAt: string;
  updatedAt: string;
};

type DisciplinaryPermissions = {
  view: boolean;
  manage: boolean;
  delete: boolean;
};

type DisciplinaryResponse = {
  items: DisciplinaryItem[];
  total?: number;
  page?: number;
  limit?: number;
  permissions?: DisciplinaryPermissions;
};

type FilterType =
  | "ALL"
  | "FIRST_WARNING"
  | "SECOND_WARNING"
  | "SUSPENSION";

type StatusFilter =
  | "ALL"
  | "ACTIVE"
  | "DRAFT"
  | "REMOVED"
  | "REPLACED";

type TypeStyle = {
  label: string;
  border: string;
  borderHover: string;
  cardBackground: string;
  softBackground: string;
  iconBackground: string;
  iconBorder: string;
  glow: string;
  dot: string;
  accentLine: string;
  button: string;
  status: string;
};

type EditorMode = "CREATE" | "EDIT";

type EditorForm = {
  targetDiscordId: string;
  targetName: string;
  targetRank: string;
  type: "FIRST_WARNING" | "SECOND_WARNING" | "SUSPENSION";
  status: "DRAFT" | "ACTIVE";
  title: string;
  reason: string;
  sanction: string;
  fullContent: string;
  visibility: "PUBLIC" | "COMMAND_ONLY" | "PRIVATE";
};

const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") ||
  (import.meta.env.DEV ? "http://localhost:3000" : "");

const DEFAULT_PERMISSIONS: DisciplinaryPermissions = {
  view: false,
  manage: false,
  delete: false,
};

const TYPE_DEFAULTS: Record<
  EditorForm["type"],
  { title: string; sanction: string }
> = {
  FIRST_WARNING: {
    title: "1.ª REPREENSÃO ESCRITA",
    sanction: "1 - REPREENSÃO ESCRITA",
  },
  SECOND_WARNING: {
    title: "2.ª REPREENSÃO ESCRITA",
    sanction: "2 - REPREENSÃO ESCRITA",
  },
  SUSPENSION: {
    title: "SUSPENSÃO DE SERVIÇO",
    sanction: "SUSPENSÃO DE SERVIÇO",
  },
};

function makeEmptyForm(): EditorForm {
  return {
    targetDiscordId: "",
    targetName: "",
    targetRank: "",
    type: "FIRST_WARNING",
    status: "ACTIVE",
    title: TYPE_DEFAULTS.FIRST_WARNING.title,
    reason: "",
    sanction: TYPE_DEFAULTS.FIRST_WARNING.sanction,
    fullContent: "",
    visibility: "COMMAND_ONLY",
  };
}

function getTypeLabel(type: string) {
  switch (type) {
    case "FIRST_WARNING":
      return "1.ª Repreensão";
    case "SECOND_WARNING":
      return "2.ª Repreensão";
    case "SUSPENSION":
      return "Suspensão de serviço";
    default:
      return "Registo disciplinar";
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "ACTIVE":
      return "Ativo";
    case "DRAFT":
      return "Rascunho";
    case "REMOVED":
      return "Retirado";
    case "REPLACED":
      return "Substituído";
    default:
      return status;
  }
}

function getTypeNumber(type: string) {
  switch (type) {
    case "FIRST_WARNING":
      return "01";
    case "SECOND_WARNING":
      return "02";
    case "SUSPENSION":
      return "03";
    default:
      return "00";
  }
}

function getTypeStyle(type: string): TypeStyle {
  switch (type) {
    case "FIRST_WARNING":
      return {
        label: "text-yellow-200",
        border: "border-yellow-400/30",
        borderHover: "hover:border-yellow-300/55",
        cardBackground:
          "bg-[linear-gradient(145deg,rgba(37,31,4,0.92),rgba(7,16,13,0.96)_48%)]",
        softBackground: "bg-yellow-400/15",
        iconBackground:
          "bg-[linear-gradient(145deg,rgba(250,204,21,0.22),rgba(113,63,18,0.15))]",
        iconBorder: "border-yellow-300/40",
        glow: "bg-yellow-400/20",
        dot: "bg-yellow-300",
        accentLine:
          "bg-[linear-gradient(90deg,rgba(250,204,21,0.95),rgba(250,204,21,0.10),transparent)]",
        button:
          "border-yellow-300/35 bg-yellow-400/15 text-yellow-200 hover:border-yellow-200/60 hover:bg-yellow-400/25",
        status:
          "border-yellow-300/25 bg-yellow-400/10 text-yellow-200",
      };

    case "SECOND_WARNING":
      return {
        label: "text-orange-200",
        border: "border-orange-400/35",
        borderHover: "hover:border-orange-300/65",
        cardBackground:
          "bg-[linear-gradient(145deg,rgba(52,21,4,0.94),rgba(12,12,9,0.97)_50%)]",
        softBackground: "bg-orange-500/15",
        iconBackground:
          "bg-[linear-gradient(145deg,rgba(249,115,22,0.25),rgba(124,45,18,0.18))]",
        iconBorder: "border-orange-300/45",
        glow: "bg-orange-500/25",
        dot: "bg-orange-300",
        accentLine:
          "bg-[linear-gradient(90deg,rgba(249,115,22,1),rgba(249,115,22,0.12),transparent)]",
        button:
          "border-orange-300/40 bg-orange-500/15 text-orange-200 hover:border-orange-200/65 hover:bg-orange-500/25",
        status:
          "border-orange-300/25 bg-orange-500/10 text-orange-200",
      };

    case "SUSPENSION":
      return {
        label: "text-red-200",
        border: "border-red-500/45",
        borderHover: "hover:border-red-400/75",
        cardBackground:
          "bg-[linear-gradient(145deg,rgba(55,5,10,0.97),rgba(16,6,9,0.98)_55%)]",
        softBackground: "bg-red-500/20",
        iconBackground:
          "bg-[linear-gradient(145deg,rgba(239,68,68,0.32),rgba(127,29,29,0.22))]",
        iconBorder: "border-red-400/55",
        glow: "bg-red-500/30",
        dot: "bg-red-300",
        accentLine:
          "bg-[linear-gradient(90deg,rgba(239,68,68,1),rgba(239,68,68,0.18),transparent)]",
        button:
          "border-red-400/45 bg-red-500/20 text-red-200 hover:border-red-300/75 hover:bg-red-500/30",
        status:
          "border-red-400/35 bg-red-500/15 text-red-200",
      };

    default:
      return {
        label: "text-primary",
        border: "border-primary/20",
        borderHover: "hover:border-primary/40",
        cardBackground: "bg-[#07100d]/90",
        softBackground: "bg-primary/10",
        iconBackground: "bg-primary/10",
        iconBorder: "border-primary/25",
        glow: "bg-primary/10",
        dot: "bg-primary",
        accentLine:
          "bg-[linear-gradient(90deg,rgba(16,185,129,0.9),transparent)]",
        button:
          "border-primary/20 bg-primary/10 text-primary hover:bg-primary/15",
        status:
          "border-primary/20 bg-primary/10 text-primary",
      };
  }
}

function getStatusStyle(status: string) {
  switch (status) {
    case "ACTIVE":
      return "border-emerald-400/20 bg-emerald-500/10 text-emerald-300";
    case "DRAFT":
      return "border-sky-400/20 bg-sky-500/10 text-sky-300";
    case "REMOVED":
      return "border-white/10 bg-white/[0.05] text-white/45";
    case "REPLACED":
      return "border-violet-400/20 bg-violet-500/10 text-violet-300";
    default:
      return "border-white/10 bg-white/[0.04] text-white/35";
  }
}

function formatDate(dateString: string | null) {
  if (!dateString) return "Sem data";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "Data inválida";
  }

  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatShortDate(dateString: string | null) {
  if (!dateString) return "Sem data";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "Data inválida";
  }

  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function extractLegacyTarget(item: DisciplinaryItem) {
  const normalized = (item.fullContent || "")
    .replace(/[⁨⁩]/g, "")
    .replace(/``/g, "`");

  const match = normalized.match(
    /Guarda(?:s)?\s+visado(?:s)?\s*:?\s*[\r\n\s]*`?\s*([^`,;\n]+?)(?:,\s*([^`;\n]+))?\s*`?(?:;|\n|$)/i,
  );

  return {
    name: match?.[1]?.trim() || null,
    rank: match?.[2]?.trim() || null,
  };
}

function getDisplayName(item: DisciplinaryItem) {
  if (item.targetName?.trim()) {
    return item.targetName.trim();
  }

  const legacy = extractLegacyTarget(item);

  if (legacy.name) {
    return legacy.name;
  }

  return `Utilizador ${item.targetDiscordId}`;
}

function getDisplayRank(item: DisciplinaryItem) {
  if (item.targetRank?.trim()) {
    return item.targetRank.trim();
  }

  const legacy = extractLegacyTarget(item);

  if (legacy.rank) {
    return legacy.rank;
  }

  return "Patente não identificada";
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function cleanMarkdownPreview(value: string | null) {
  if (!value) return "";

  return value
    .replace(/<@!?\d+>/g, "")
    .replace(/<@&\d+>/g, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[#>*_`~-]/g, " ")
    .replace(/[⁨⁩]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getAttachmentContentType(attachment: DisciplinaryAttachment) {
  return (
    attachment.contentType ||
    attachment.content_type ||
    ""
  ).toLowerCase();
}

function getAttachmentPreviewUrl(attachment: DisciplinaryAttachment) {
  return (
    attachment.proxyUrl ||
    attachment.proxy_url ||
    attachment.url
  );
}

function isVideoAttachment(attachment: DisciplinaryAttachment) {
  const contentType = getAttachmentContentType(attachment);
  const filename = attachment.filename.toLowerCase();

  return (
    contentType.startsWith("video/") ||
    /\.(mp4|webm|mov|m4v|avi)$/i.test(filename)
  );
}

function isImageAttachment(attachment: DisciplinaryAttachment) {
  const contentType = getAttachmentContentType(attachment);
  const filename = attachment.filename.toLowerCase();

  return (
    contentType.startsWith("image/") ||
    /\.(png|jpe?g|gif|webp|bmp)$/i.test(filename)
  );
}

function isPdfAttachment(attachment: DisciplinaryAttachment) {
  const contentType = getAttachmentContentType(attachment);
  const filename = attachment.filename.toLowerCase();

  return (
    contentType === "application/pdf" ||
    filename.endsWith(".pdf")
  );
}

function formatFileSize(size?: number | null) {
  if (!size || size <= 0) return "Tamanho desconhecido";

  const units = ["B", "KB", "MB", "GB"];
  const unitIndex = Math.min(
    Math.floor(Math.log(size) / Math.log(1024)),
    units.length - 1,
  );
  const value = size / 1024 ** unitIndex;

  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

async function apiRequest<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(options?.body
        ? { "Content-Type": "application/json" }
        : {}),
      ...(options?.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.error ||
        `O pedido falhou com o código ${response.status}.`,
    );
  }

  return data as T;
}

async function fetchDisciplinaryNotices(): Promise<DisciplinaryResponse> {
  return apiRequest<DisciplinaryResponse>("/api/disciplinary");
}

export default function Avisos() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<FilterType>("ALL");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("ALL");
  const [selectedItem, setSelectedItem] =
    useState<DisciplinaryItem | null>(null);
  const [editor, setEditor] = useState<{
    mode: EditorMode;
    item?: DisciplinaryItem;
  } | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    kind: "REMOVE" | "REACTIVATE" | "DELETE";
    item: DisciplinaryItem;
  } | null>(null);
  const [replaceItem, setReplaceItem] =
    useState<DisciplinaryItem | null>(null);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ["disciplinary-notices"],
    queryFn: fetchDisciplinaryNotices,
    refetchInterval: 60_000,
  });

  const permissions =
    data?.permissions || DEFAULT_PERMISSIONS;
  const items = data?.items ?? [];

  const showToast = (
    type: "success" | "error",
    message: string,
  ) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 4000);
  };

  const invalidateDisciplinary = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["disciplinary-notices"],
    });

    await queryClient.invalidateQueries({
      queryKey: ["guard-disciplinary-history"],
    });
  };

  const createMutation = useMutation({
    mutationFn: (form: EditorForm) =>
      apiRequest<{ item: DisciplinaryItem; message: string }>(
        "/api/disciplinary",
        {
          method: "POST",
          body: JSON.stringify(form),
        },
      ),
    onSuccess: async (response) => {
      setEditor(null);
      showToast("success", response.message);
      await invalidateDisciplinary();
    },
    onError: (mutationError) => {
      showToast(
        "error",
        mutationError instanceof Error
          ? mutationError.message
          : "Não foi possível criar o processo.",
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      form,
    }: {
      id: string;
      form: EditorForm;
    }) =>
      apiRequest<{ item: DisciplinaryItem; message: string }>(
        `/api/disciplinary/${id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            targetName: form.targetName,
            targetRank: form.targetRank,
            title: form.title,
            reason: form.reason,
            sanction: form.sanction,
            fullContent: form.fullContent,
            visibility: form.visibility,
          }),
        },
      ),
    onSuccess: async (response) => {
      setEditor(null);
      setSelectedItem(response.item);
      showToast("success", response.message);
      await invalidateDisciplinary();
    },
    onError: (mutationError) => {
      showToast(
        "error",
        mutationError instanceof Error
          ? mutationError.message
          : "Não foi possível atualizar o processo.",
      );
    },
  });

  const removeMutation = useMutation({
    mutationFn: (item: DisciplinaryItem) =>
      apiRequest<{ item: DisciplinaryItem; message: string }>(
        `/api/disciplinary/${item._id}/remove`,
        {
          method: "POST",
          body: JSON.stringify({}),
        },
      ),
    onSuccess: async (response) => {
      setConfirmAction(null);
      setSelectedItem(response.item);
      showToast("success", response.message);
      await invalidateDisciplinary();
    },
    onError: (mutationError) => {
      showToast(
        "error",
        mutationError instanceof Error
          ? mutationError.message
          : "Não foi possível retirar a sanção.",
      );
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: (item: DisciplinaryItem) =>
      apiRequest<{ item: DisciplinaryItem; message: string }>(
        `/api/disciplinary/${item._id}/reactivate`,
        {
          method: "POST",
          body: JSON.stringify({}),
        },
      ),
    onSuccess: async (response) => {
      setConfirmAction(null);
      setSelectedItem(response.item);
      showToast("success", response.message);
      await invalidateDisciplinary();
    },
    onError: (mutationError) => {
      showToast(
        "error",
        mutationError instanceof Error
          ? mutationError.message
          : "Não foi possível reativar a sanção.",
      );
    },
  });

  const replaceMutation = useMutation({
    mutationFn: ({
      item,
      type,
      reason,
    }: {
      item: DisciplinaryItem;
      type: EditorForm["type"];
      reason: string;
    }) =>
      apiRequest<{
        item: DisciplinaryItem;
        message: string;
      }>(`/api/disciplinary/${item._id}/replace`, {
        method: "POST",
        body: JSON.stringify({
          type,
          reason: reason || item.reason,
          targetName: getDisplayName(item),
          targetRank: getDisplayRank(item),
        }),
      }),
    onSuccess: async (response) => {
      setReplaceItem(null);
      setSelectedItem(response.item);
      showToast("success", response.message);
      await invalidateDisciplinary();
    },
    onError: (mutationError) => {
      showToast(
        "error",
        mutationError instanceof Error
          ? mutationError.message
          : "Não foi possível substituir a sanção.",
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (item: DisciplinaryItem) =>
      apiRequest<{ message: string }>(
        `/api/disciplinary/${item._id}`,
        {
          method: "DELETE",
        },
      ),
    onSuccess: async (response) => {
      setConfirmAction(null);
      setSelectedItem(null);
      showToast("success", response.message);
      await invalidateDisciplinary();
    },
    onError: (mutationError) => {
      showToast(
        "error",
        mutationError instanceof Error
          ? mutationError.message
          : "Não foi possível apagar o processo.",
      );
    },
  });

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const bDate = new Date(
        b.appliedAt || b.createdAt,
      ).getTime();
      const aDate = new Date(
        a.appliedAt || a.createdAt,
      ).getTime();

      return bDate - aDate;
    });
  }, [items]);

  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return sortedItems.filter((item) => {
      const matchesType =
        typeFilter === "ALL" || item.type === typeFilter;
      const matchesStatus =
        statusFilter === "ALL" ||
        item.status === statusFilter;

      if (!matchesType || !matchesStatus) return false;
      if (!normalizedSearch) return true;

      const searchableText = [
        getDisplayName(item),
        getDisplayRank(item),
        item.targetDiscordId,
        item.title,
        item.reason,
        item.sanction,
        item.responsibleName,
        item.fullContent,
        getStatusLabel(item.status),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedSearch);
    });
  }, [search, sortedItems, statusFilter, typeFilter]);

  const activeCount = items.filter(
    (item) => item.status === "ACTIVE",
  ).length;
  const draftCount = items.filter(
    (item) => item.status === "DRAFT",
  ).length;
  const removedCount = items.filter(
    (item) => item.status === "REMOVED",
  ).length;
  const firstWarningCount = items.filter(
    (item) => item.type === "FIRST_WARNING",
  ).length;
  const secondWarningCount = items.filter(
    (item) => item.type === "SECOND_WARNING",
  ).length;
  const suspensionCount = items.filter(
    (item) => item.type === "SUSPENSION",
  ).length;
  const uniqueGuardsCount = new Set(
    items.map((item) => item.targetDiscordId),
  ).size;

  const actionPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    removeMutation.isPending ||
    reactivateMutation.isPending ||
    replaceMutation.isPending ||
    deleteMutation.isPending;

  return (
    <div className="space-y-6 pb-10">
      <section className="relative overflow-hidden rounded-[2.4rem] border border-white/[0.08] bg-[#06100c]/90 px-7 py-8 shadow-[0_35px_130px_rgba(0,0,0,0.5)] md:px-9">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(16,185,129,0.16),transparent_35%),radial-gradient(circle_at_92%_25%,rgba(234,179,8,0.10),transparent_30%)]" />
        <div className="pointer-events-none absolute inset-0 cyber-grid-soft opacity-[0.12]" />
        <div className="pointer-events-none absolute -right-28 -top-36 h-96 w-96 rounded-full bg-primary/10 blur-[125px]" />

        <div className="relative flex flex-col gap-7 xl:flex-row xl:items-center xl:justify-between">
          <div className="max-w-4xl">
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                </span>

                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">
                  Gestão disciplinar ativa
                </span>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
                <History className="h-3.5 w-3.5" />
                {items.length} processos
              </div>

              {permissions.manage && (
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-primary">
                  <Gavel className="h-3.5 w-3.5" />
                  Gestão autorizada
                </div>
              )}
            </div>

            <div className="flex items-start gap-5">
              <div className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-[1.4rem] border border-primary/20 bg-primary/10 text-primary shadow-[0_0_45px_rgba(16,185,129,0.13)] sm:flex">
                <ShieldAlert className="h-8 w-8" />
              </div>

              <div>
                <p className="mb-2 text-[10px] font-black uppercase tracking-[0.3em] text-primary">
                  Conselho disciplinar
                </p>

                <h1 className="text-4xl font-black tracking-[-0.04em] text-white md:text-5xl">
                  Avisos disciplinares
                </h1>

                <p className="mt-3 max-w-3xl text-sm leading-7 text-white/45">
                  Criação, edição, retirada, substituição e consulta de
                  processos disciplinares geridos diretamente na Central.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 xl:justify-end">
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isFetching}
              className="inline-flex h-12 items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-5 text-[10px] font-black uppercase tracking-[0.16em] text-white/55 transition hover:border-primary/20 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCcw
                className={`h-4 w-4 ${
                  isFetching ? "animate-spin" : ""
                }`}
              />
              Atualizar
            </button>

            {permissions.manage && (
              <button
                type="button"
                onClick={() => setEditor({ mode: "CREATE" })}
                className="inline-flex h-12 items-center justify-center gap-3 rounded-2xl border border-primary/30 bg-primary/15 px-6 text-[10px] font-black uppercase tracking-[0.17em] text-primary transition hover:border-primary/50 hover:bg-primary/20"
              >
                <Plus className="h-4 w-4" />
                Novo processo
              </button>
            )}

            {dataUpdatedAt > 0 && (
              <p className="w-full text-right text-[9px] font-bold uppercase tracking-[0.12em] text-white/20">
                Atualizado às{" "}
                {new Date(dataUpdatedAt).toLocaleTimeString(
                  "pt-PT",
                  {
                    hour: "2-digit",
                    minute: "2-digit",
                  },
                )}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 xl:grid-cols-6">
        <OverviewCard
          label="Ativos"
          value={activeCount}
          description="Em vigor"
          icon={Shield}
          variant="green"
        />
        <OverviewCard
          label="Militares"
          value={uniqueGuardsCount}
          description="Visados"
          icon={UserRound}
          variant="neutral"
        />
        <OverviewCard
          label="1.ª Repreensão"
          value={firstWarningCount}
          description="Primeiro nível"
          icon={AlertTriangle}
          variant="yellow"
        />
        <OverviewCard
          label="2.ª Repreensão"
          value={secondWarningCount}
          description="Segundo nível"
          icon={FileWarning}
          variant="orange"
        />
        <OverviewCard
          label="Suspensões"
          value={suspensionCount}
          description="Medida máxima"
          icon={Clock3}
          variant="red"
        />
        <OverviewCard
          label="Retirados"
          value={removedCount}
          description={`${draftCount} rascunhos`}
          icon={CheckCircle2}
          variant="blue"
        />
      </section>

      <section className="relative rounded-[1.7rem] border border-white/[0.08] bg-[#06100c]/90 p-4 shadow-[0_22px_70px_rgba(0,0,0,0.35)]">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
            <div className="relative w-full 2xl:max-w-2xl">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/30" />

              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Pesquisar por militar, patente, Discord ID, responsável ou motivo..."
                className="h-14 w-full rounded-2xl border border-white/[0.08] bg-black/25 pl-12 pr-12 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-primary/35 focus:bg-black/35 focus:ring-4 focus:ring-primary/[0.06]"
              />

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-4 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-white/30 transition hover:bg-white/5 hover:text-white"
                  aria-label="Limpar pesquisa"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/30">
              <SlidersHorizontal className="h-4 w-4" />
              Filtros
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <FilterButton
              active={typeFilter === "ALL"}
              onClick={() => setTypeFilter("ALL")}
              count={items.length}
            >
              Todos os tipos
            </FilterButton>
            <FilterButton
              active={typeFilter === "FIRST_WARNING"}
              onClick={() => setTypeFilter("FIRST_WARNING")}
              count={firstWarningCount}
            >
              1.ª Repreensão
            </FilterButton>
            <FilterButton
              active={typeFilter === "SECOND_WARNING"}
              onClick={() => setTypeFilter("SECOND_WARNING")}
              count={secondWarningCount}
            >
              2.ª Repreensão
            </FilterButton>
            <FilterButton
              active={typeFilter === "SUSPENSION"}
              onClick={() => setTypeFilter("SUSPENSION")}
              count={suspensionCount}
            >
              Suspensões
            </FilterButton>

            <div className="mx-1 hidden w-px bg-white/10 md:block" />

            {(
              [
                ["ALL", "Todos os estados"],
                ["ACTIVE", "Ativos"],
                ["DRAFT", "Rascunhos"],
                ["REMOVED", "Retirados"],
                ["REPLACED", "Substituídos"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatusFilter(value)}
                className={`rounded-xl border px-4 py-3 text-[9px] font-black uppercase tracking-[0.13em] transition ${
                  statusFilter === value
                    ? "border-cyan-400/25 bg-cyan-500/10 text-cyan-300"
                    : "border-white/[0.08] bg-white/[0.025] text-white/35 hover:border-white/15 hover:text-white/65"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="flex items-center justify-between px-1">
        <div>
          <p className="text-sm font-black text-white">
            Processos disciplinares
          </p>
          <p className="mt-1 text-xs text-white/35">
            {filteredItems.length} resultado
            {filteredItems.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="hidden items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-white/25 sm:flex">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          Fonte oficial: Central
        </div>
      </div>

      {isLoading && <LoadingState />}

      {isError && (
        <ErrorState
          message={
            error instanceof Error
              ? error.message
              : "Ocorreu um erro desconhecido."
          }
          onRetry={() => void refetch()}
        />
      )}

      {!isLoading && !isError && filteredItems.length === 0 && (
        <EmptyState
          hasSearch={Boolean(
            search ||
              typeFilter !== "ALL" ||
              statusFilter !== "ALL",
          )}
          onReset={() => {
            setSearch("");
            setTypeFilter("ALL");
            setStatusFilter("ALL");
          }}
        />
      )}

      {!isLoading && !isError && filteredItems.length > 0 && (
        <section className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
          {filteredItems.map((item) => (
            <NoticeCard
              key={item._id}
              item={item}
              permissions={permissions}
              onOpen={() => setSelectedItem(item)}
              onEdit={() => setEditor({ mode: "EDIT", item })}
            />
          ))}
        </section>
      )}

      {selectedItem && (
        <NoticeDrawer
          item={selectedItem}
          permissions={permissions}
          onClose={() => setSelectedItem(null)}
          onEdit={() =>
            setEditor({
              mode: "EDIT",
              item: selectedItem,
            })
          }
          onRemove={() =>
            setConfirmAction({
              kind: "REMOVE",
              item: selectedItem,
            })
          }
          onReactivate={() =>
            setConfirmAction({
              kind: "REACTIVATE",
              item: selectedItem,
            })
          }
          onReplace={() => setReplaceItem(selectedItem)}
          onDelete={() =>
            setConfirmAction({
              kind: "DELETE",
              item: selectedItem,
            })
          }
        />
      )}

      {editor && (
        <DisciplinaryEditor
          mode={editor.mode}
          item={editor.item}
          isPending={
            createMutation.isPending ||
            updateMutation.isPending
          }
          onClose={() => setEditor(null)}
          onSubmit={(form) => {
            if (editor.mode === "CREATE") {
              createMutation.mutate(form);
              return;
            }

            if (editor.item) {
              updateMutation.mutate({
                id: editor.item._id,
                form,
              });
            }
          }}
        />
      )}

      {replaceItem && (
        <ReplaceModal
          item={replaceItem}
          isPending={replaceMutation.isPending}
          onClose={() => setReplaceItem(null)}
          onSubmit={(type, reason) =>
            replaceMutation.mutate({
              item: replaceItem,
              type,
              reason,
            })
          }
        />
      )}

      {confirmAction && (
        <ConfirmationModal
          kind={confirmAction.kind}
          item={confirmAction.item}
          isPending={actionPending}
          onClose={() => setConfirmAction(null)}
          onConfirm={() => {
            if (confirmAction.kind === "REMOVE") {
              removeMutation.mutate(confirmAction.item);
            } else if (
              confirmAction.kind === "REACTIVATE"
            ) {
              reactivateMutation.mutate(
                confirmAction.item,
              );
            } else {
              deleteMutation.mutate(confirmAction.item);
            }
          }}
        />
      )}

      {toast && <ToastMessage toast={toast} />}
    </div>
  );
}

function OverviewCard({
  label,
  value,
  description,
  icon: Icon,
  variant,
}: {
  label: string;
  value: number;
  description: string;
  icon: typeof Shield;
  variant:
    | "green"
    | "yellow"
    | "orange"
    | "red"
    | "blue"
    | "neutral";
}) {
  const variants = {
    green: {
      icon: "border-emerald-400/20 bg-emerald-500/10 text-emerald-300",
      glow: "bg-emerald-500/10",
    },
    yellow: {
      icon: "border-yellow-400/20 bg-yellow-500/10 text-yellow-300",
      glow: "bg-yellow-500/10",
    },
    orange: {
      icon: "border-orange-400/20 bg-orange-500/10 text-orange-300",
      glow: "bg-orange-500/10",
    },
    red: {
      icon: "border-red-400/20 bg-red-500/10 text-red-300",
      glow: "bg-red-500/10",
    },
    blue: {
      icon: "border-blue-400/20 bg-blue-500/10 text-blue-300",
      glow: "bg-blue-500/10",
    },
    neutral: {
      icon: "border-white/10 bg-white/[0.05] text-white/55",
      glow: "bg-white/[0.04]",
    },
  };

  const style = variants[variant];

  return (
    <article className="group relative overflow-hidden rounded-[1.7rem] border border-white/[0.075] bg-[#07100d]/80 p-5 shadow-[0_16px_55px_rgba(0,0,0,0.24)] transition hover:-translate-y-0.5 hover:border-white/[0.13]">
      <div
        className={`pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full ${style.glow} blur-[75px]`}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-white/40">
            {label}
          </p>
          <p className="mt-4 text-4xl font-black tracking-[-0.04em] text-white">
            {value}
          </p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/25">
            {description}
          </p>
        </div>
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${style.icon}`}
        >
          <Icon className="h-[18px] w-[18px]" />
        </div>
      </div>
    </article>
  );
}

function FilterButton({
  active,
  onClick,
  count,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-[9px] font-black uppercase tracking-[0.13em] transition ${
        active
          ? "border-primary/30 bg-primary/15 text-primary"
          : "border-white/[0.08] bg-white/[0.025] text-white/40 hover:border-white/15 hover:text-white/70"
      }`}
    >
      {children}
      <span className="rounded-md bg-black/20 px-1.5 py-0.5 text-[8px]">
        {count}
      </span>
    </button>
  );
}

function NoticeCard({
  item,
  permissions,
  onOpen,
  onEdit,
}: {
  item: DisciplinaryItem;
  permissions: DisciplinaryPermissions;
  onOpen: () => void;
  onEdit: () => void;
}) {
  const style = getTypeStyle(item.type);
  const displayName = getDisplayName(item);
  const displayRank = getDisplayRank(item);
  const preview =
    cleanMarkdownPreview(item.reason) ||
    cleanMarkdownPreview(item.fullContent);

  return (
    <article
      className={`group relative overflow-hidden rounded-[1.8rem] border ${style.border} ${style.borderHover} ${style.cardBackground} shadow-[0_22px_85px_rgba(0,0,0,0.34)] transition duration-300 hover:-translate-y-1 ${
        item.status !== "ACTIVE" ? "opacity-80" : ""
      }`}
    >
      <div
        className={`absolute left-0 top-0 h-1 w-full ${style.accentLine}`}
      />
      <div
        className={`pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full ${style.glow} blur-[100px]`}
      />

      <div className="relative p-5 md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <div
              className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${style.iconBorder} ${style.iconBackground}`}
            >
              <ShieldAlert className={`h-5 w-5 ${style.label}`} />
              <span
                className={`absolute -bottom-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-md border border-[#07100d] px-1 text-[7px] font-black ${style.softBackground} ${style.label}`}
              >
                {getTypeNumber(item.type)}
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-2 rounded-full border ${style.border} ${style.softBackground} px-3 py-1 text-[8px] font-black uppercase tracking-[0.15em] ${style.label}`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${style.dot}`}
                  />
                  {getTypeLabel(item.type)}
                </span>

                <span
                  className={`rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.13em] ${getStatusStyle(
                    item.status,
                  )}`}
                >
                  {getStatusLabel(item.status)}
                </span>
              </div>

              <h2
                className={`mt-3 line-clamp-1 text-xl font-black uppercase tracking-[-0.025em] ${
                  item.type === "SUSPENSION"
                    ? "text-red-100"
                    : "text-white"
                }`}
              >
                {item.type === "SUSPENSION"
                  ? `⛔ ${item.title}`
                  : item.title}
              </h2>
            </div>
          </div>

          <div className="hidden gap-2 sm:flex">
            {permissions.manage && (
              <button
                type="button"
                onClick={onEdit}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/40 transition hover:border-primary/25 hover:bg-primary/10 hover:text-primary"
                aria-label="Editar processo"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onOpen}
              className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-4 text-[9px] font-black uppercase tracking-[0.14em] transition ${style.button}`}
            >
              Abrir
              <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-black/20 p-3.5">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${style.iconBorder} ${style.softBackground} text-xs font-black ${style.label}`}
          >
            {getInitials(displayName) || "GN"}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black text-white">
              {displayName}
            </p>

            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-white/35">
              <span className="flex items-center gap-1.5">
                <BadgeCheck className="h-3.5 w-3.5" />
                {displayRank}
              </span>
              <span className="font-mono">
                {item.targetDiscordId}
              </span>
            </div>
          </div>
        </div>

        <p className="mt-4 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-white/48">
          {preview ||
            "O conteúdo completo deste processo está disponível nos detalhes."}
        </p>

        <div className="mt-5 flex flex-col gap-3 border-t border-white/[0.07] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-bold text-white/30">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-primary" />
              {formatShortDate(
                item.appliedAt || item.createdAt,
              )}
            </span>

            <span className="flex items-center gap-1.5">
              <UserRound className="h-3.5 w-3.5 text-primary" />
              {item.responsibleName ||
                item.createdByName ||
                "Não identificado"}
            </span>
          </div>

          <button
            type="button"
            onClick={onOpen}
            className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-4 text-[9px] font-black uppercase tracking-[0.14em] transition sm:hidden ${style.button}`}
          >
            Consultar processo
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}

function NoticeDrawer({
  item,
  permissions,
  onClose,
  onEdit,
  onRemove,
  onReactivate,
  onReplace,
  onDelete,
}: {
  item: DisciplinaryItem;
  permissions: DisciplinaryPermissions;
  onClose: () => void;
  onEdit: () => void;
  onRemove: () => void;
  onReactivate: () => void;
  onReplace: () => void;
  onDelete: () => void;
}) {
  const style = getTypeStyle(item.type);
  const displayName = getDisplayName(item);
  const displayRank = getDisplayRank(item);
  const attachments = Array.isArray(item.attachments)
    ? item.attachments.filter(
        (attachment) =>
          attachment &&
          attachment.filename &&
          attachment.url,
      )
    : [];

  useBodyLock(onClose);

  return createPortal(
    <div className="fixed inset-0 z-[9999]">
      <button
        type="button"
        aria-label="Fechar processo"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-black/80 backdrop-blur-md"
      />

      <aside className="absolute right-0 top-0 flex h-[100dvh] w-full max-w-[900px] flex-col overflow-hidden border-l border-white/10 bg-[#050a08] shadow-[-40px_0_150px_rgba(0,0,0,0.88)]">
        <div
          className={`pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full ${style.glow} blur-[120px]`}
        />
        <div
          className={`pointer-events-none absolute left-0 top-0 h-1 w-full ${style.accentLine}`}
        />

        <header className="relative z-10 shrink-0 border-b border-white/[0.08] bg-[#050a08]/95 px-5 py-5 backdrop-blur-xl md:px-8 md:py-6">
          <div className="flex items-start justify-between gap-5">
            <div className="flex min-w-0 items-start gap-4">
              <div
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border ${style.iconBorder} ${style.iconBackground}`}
              >
                <ShieldAlert className={`h-6 w-6 ${style.label}`} />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full border ${style.border} ${style.softBackground} px-3 py-1 text-[8px] font-black uppercase tracking-[0.15em] ${style.label}`}
                  >
                    {getTypeLabel(item.type)}
                  </span>

                  <span
                    className={`rounded-full border px-3 py-1 text-[8px] font-black uppercase tracking-[0.14em] ${getStatusStyle(
                      item.status,
                    )}`}
                  >
                    {getStatusLabel(item.status)}
                  </span>
                </div>

                <h2
                  className={`mt-3 break-words text-2xl font-black uppercase tracking-[-0.03em] md:text-3xl ${
                    item.type === "SUSPENSION"
                      ? "text-red-100"
                      : "text-white"
                  }`}
                >
                  {item.type === "SUSPENSION"
                    ? `⛔ ${item.title}`
                    : item.title}
                </h2>

                <p className="mt-2 text-xs text-white/35">
                  Processo oficial da Central
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] text-white/40 transition hover:border-red-400/25 hover:bg-red-500/10 hover:text-red-300"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {(permissions.manage || permissions.delete) && (
            <div className="mt-5 flex flex-wrap gap-2">
              {permissions.manage && (
                <button
                  type="button"
                  onClick={onEdit}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-4 text-[9px] font-black uppercase tracking-[0.13em] text-primary transition hover:bg-primary/15"
                >
                  <Pencil className="h-4 w-4" />
                  Editar
                </button>
              )}

              {permissions.manage &&
                item.status === "ACTIVE" && (
                  <>
                    <button
                      type="button"
                      onClick={onRemove}
                      className="inline-flex h-10 items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 text-[9px] font-black uppercase tracking-[0.13em] text-emerald-300 transition hover:bg-emerald-500/15"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Retirar
                    </button>

                    <button
                      type="button"
                      onClick={onReplace}
                      className="inline-flex h-10 items-center gap-2 rounded-xl border border-orange-400/20 bg-orange-500/10 px-4 text-[9px] font-black uppercase tracking-[0.13em] text-orange-300 transition hover:bg-orange-500/15"
                    >
                      <ArrowUpCircle className="h-4 w-4" />
                      Substituir
                    </button>
                  </>
                )}

              {permissions.manage &&
                (item.status === "REMOVED" ||
                  item.status === "DRAFT") && (
                  <button
                    type="button"
                    onClick={onReactivate}
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-blue-400/20 bg-blue-500/10 px-4 text-[9px] font-black uppercase tracking-[0.13em] text-blue-300 transition hover:bg-blue-500/15"
                  >
                    <RotateCcw className="h-4 w-4" />
                    {item.status === "DRAFT"
                      ? "Aplicar"
                      : "Reativar"}
                  </button>
                )}

              {permissions.delete && (
                <button
                  type="button"
                  onClick={onDelete}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-red-400/20 bg-red-500/10 px-4 text-[9px] font-black uppercase tracking-[0.13em] text-red-300 transition hover:bg-red-500/15"
                >
                  <Trash2 className="h-4 w-4" />
                  Apagar definitivamente
                </button>
              )}
            </div>
          )}
        </header>

        <div className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 md:px-8 md:py-6">
          <section className="rounded-[1.6rem] border border-white/[0.08] bg-white/[0.025] p-5">
            <div className="flex items-center gap-4">
              <div
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border ${style.iconBorder} ${style.softBackground} text-sm font-black ${style.label}`}
              >
                {getInitials(displayName) || "GN"}
              </div>

              <div className="min-w-0">
                <p className="break-words text-lg font-black text-white">
                  {displayName}
                </p>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.13em] text-white/35">
                  {displayRank}
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DetailItem
                label="Discord ID"
                value={item.targetDiscordId}
                mono
              />
              <DetailItem
                label="Aplicado em"
                value={formatDate(item.appliedAt)}
              />
              <DetailItem
                label="Responsável"
                value={
                  item.responsibleName ||
                  item.createdByName ||
                  "Não identificado"
                }
              />
              <DetailItem
                label="Estado"
                value={getStatusLabel(item.status)}
              />
              {item.removedAt && (
                <DetailItem
                  label="Retirado em"
                  value={formatDate(item.removedAt)}
                />
              )}
              <DetailItem
                label="Visibilidade"
                value={item.visibility || "COMMAND_ONLY"}
              />
            </div>
          </section>

          {item.sanction && (
            <section
              className={`mt-5 rounded-[1.5rem] border p-5 ${style.border} ${style.softBackground}`}
            >
              <div className="flex items-center gap-3">
                <FileWarning className={`h-5 w-5 ${style.label}`} />
                <p
                  className={`text-[9px] font-black uppercase tracking-[0.2em] ${style.label}`}
                >
                  Sanção aplicada
                </p>
              </div>
              <p className="mt-3 text-base font-black uppercase text-white">
                {item.sanction}
              </p>
            </section>
          )}

          {attachments.length > 0 && (
            <section className="mt-5 rounded-[1.5rem] border border-cyan-400/15 bg-cyan-500/[0.035] p-5">
              <div className="flex items-center gap-3">
                <Paperclip className="h-5 w-5 text-cyan-300" />
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-300">
                    Provas e anexos
                  </p>
                  <p className="mt-1 text-xs text-white/30">
                    {attachments.length} ficheiro
                    {attachments.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                {attachments.map((attachment, index) => (
                  <AttachmentPreview
                    key={
                      attachment.id ||
                      `${attachment.filename}-${index}`
                    }
                    attachment={attachment}
                  />
                ))}
              </div>
            </section>
          )}

          {item.reason && (
            <section className="mt-5 rounded-[1.5rem] border border-white/[0.08] bg-white/[0.025] p-5">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">
                Fundamentação
              </p>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-white/60">
                {item.reason}
              </p>
            </section>
          )}

          {item.fullContent && (
            <section className="mt-5 rounded-[1.5rem] border border-white/[0.08] bg-black/20 p-5">
              <div className="flex items-center gap-3">
                <Megaphone className="h-5 w-5 text-primary" />
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">
                  Publicação original
                </p>
              </div>

              <pre className="mt-5 whitespace-pre-wrap break-words font-sans text-sm leading-7 text-white/60">
                {item.fullContent}
              </pre>
            </section>
          )}

          <section className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DetailItem
              label="Mensagem Discord"
              value={
                item.discordMessageId ||
                "Sem mensagem associada"
              }
              mono
            />
            <DetailItem
              label="Canal Discord"
              value={
                item.discordChannelId ||
                "Sem canal associado"
              }
              mono
            />
            <DetailItem
              label="Role disciplinar"
              value={item.roleId || "Sem role associada"}
              mono
            />
            <DetailItem
              label="Última atualização"
              value={formatDate(item.updatedAt)}
            />
          </section>

          {item.events?.length > 0 && (
            <section className="mt-5 rounded-[1.5rem] border border-white/[0.08] bg-white/[0.025] p-5">
              <div className="flex items-center gap-3">
                <History className="h-5 w-5 text-primary" />
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">
                  Histórico do processo
                </p>
              </div>

              <div className="mt-5 space-y-4">
                {[...item.events]
                  .sort(
                    (a, b) =>
                      new Date(b.at).getTime() -
                      new Date(a.at).getTime(),
                  )
                  .map((event, index) => (
                    <div
                      key={`${event.type}-${event.at}-${index}`}
                      className="relative flex gap-4"
                    >
                      <div className="flex flex-col items-center">
                        <span className="mt-1 h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_18px_rgba(16,185,129,0.5)]" />
                        {index < item.events.length - 1 && (
                          <span className="mt-2 h-full w-px bg-white/10" />
                        )}
                      </div>

                      <div className="pb-4">
                        <p className="text-sm font-bold text-white">
                          {event.label}
                        </p>
                        <p className="mt-1 text-xs text-white/30">
                          {formatDate(event.at)} ·{" "}
                          {event.actorName ||
                            event.source ||
                            "Sistema"}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </section>
          )}

          <div className="h-8" />
        </div>
      </aside>
    </div>,
    document.body,
  );
}

function DisciplinaryEditor({
  mode,
  item,
  isPending,
  onClose,
  onSubmit,
}: {
  mode: EditorMode;
  item?: DisciplinaryItem;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (form: EditorForm) => void;
}) {
  const [form, setForm] = useState<EditorForm>(() => {
    if (!item) return makeEmptyForm();

    return {
      targetDiscordId: item.targetDiscordId,
      targetName: getDisplayName(item),
      targetRank: getDisplayRank(item),
      type: item.type as EditorForm["type"],
      status:
        item.status === "DRAFT" ? "DRAFT" : "ACTIVE",
      title: item.title || "",
      reason: item.reason || "",
      sanction: item.sanction || "",
      fullContent: item.fullContent || "",
      visibility:
        (item.visibility as EditorForm["visibility"]) ||
        "COMMAND_ONLY",
    };
  });

  useBodyLock(onClose);

  const setField = <K extends keyof EditorForm>(
    key: K,
    value: EditorForm[K],
  ) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleTypeChange = (
    type: EditorForm["type"],
  ) => {
    const previousDefaults = TYPE_DEFAULTS[form.type];
    const nextDefaults = TYPE_DEFAULTS[type];

    setForm((current) => ({
      ...current,
      type,
      title:
        !current.title ||
        current.title === previousDefaults.title
          ? nextDefaults.title
          : current.title,
      sanction:
        !current.sanction ||
        current.sanction === previousDefaults.sanction
          ? nextDefaults.sanction
          : current.sanction,
    }));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();

    if (
      !form.targetDiscordId.trim() ||
      !form.title.trim()
    ) {
      return;
    }

    onSubmit({
      ...form,
      targetDiscordId: form.targetDiscordId.trim(),
      targetName: form.targetName.trim(),
      targetRank: form.targetRank.trim(),
      title: form.title.trim(),
      reason: form.reason.trim(),
      sanction: form.sanction.trim(),
      fullContent: form.fullContent.trim(),
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar formulário"
        className="absolute inset-0 h-full w-full cursor-default bg-black/85 backdrop-blur-md"
      />

      <form
        onSubmit={submit}
        className="relative flex max-h-[94dvh] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[#050a08] shadow-[0_45px_180px_rgba(0,0,0,0.9)]"
      >
        <header className="flex shrink-0 items-start justify-between gap-5 border-b border-white/10 p-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-primary">
              {mode === "CREATE" ? (
                <Plus className="h-3.5 w-3.5" />
              ) : (
                <Pencil className="h-3.5 w-3.5" />
              )}
              {mode === "CREATE"
                ? "Novo processo"
                : "Editar processo"}
            </div>

            <h2 className="mt-3 text-2xl font-black text-white md:text-3xl">
              {mode === "CREATE"
                ? "Criar processo disciplinar"
                : "Atualizar processo disciplinar"}
            </h2>
            <p className="mt-2 text-sm text-white/35">
              Os dados ficam guardados na Central.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/40 transition hover:bg-red-500/10 hover:text-red-300"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <FormField label="Discord ID do militar" required>
              <input
                value={form.targetDiscordId}
                onChange={(event) =>
                  setField(
                    "targetDiscordId",
                    event.target.value,
                  )
                }
                disabled={mode === "EDIT"}
                className="form-input"
                placeholder="Ex.: 934052926861738034"
              />
            </FormField>

            <FormField label="Nome do militar">
              <input
                value={form.targetName}
                onChange={(event) =>
                  setField("targetName", event.target.value)
                }
                className="form-input"
                placeholder="Nome completo"
              />
            </FormField>

            <FormField label="Patente">
              <input
                value={form.targetRank}
                onChange={(event) =>
                  setField("targetRank", event.target.value)
                }
                className="form-input"
                placeholder="Ex.: Alferes"
              />
            </FormField>

            <FormField label="Tipo de sanção" required>
              <select
                value={form.type}
                onChange={(event) =>
                  handleTypeChange(
                    event.target.value as EditorForm["type"],
                  )
                }
                disabled={mode === "EDIT"}
                className="form-input"
              >
                <option value="FIRST_WARNING">
                  1.ª Repreensão
                </option>
                <option value="SECOND_WARNING">
                  2.ª Repreensão
                </option>
                <option value="SUSPENSION">
                  Suspensão de serviço
                </option>
              </select>
            </FormField>

            {mode === "CREATE" && (
              <FormField label="Estado inicial">
                <select
                  value={form.status}
                  onChange={(event) =>
                    setField(
                      "status",
                      event.target.value as EditorForm["status"],
                    )
                  }
                  className="form-input"
                >
                  <option value="ACTIVE">
                    Aplicar imediatamente
                  </option>
                  <option value="DRAFT">
                    Guardar como rascunho
                  </option>
                </select>
              </FormField>
            )}

            <FormField label="Visibilidade">
              <select
                value={form.visibility}
                onChange={(event) =>
                  setField(
                    "visibility",
                    event.target.value as EditorForm["visibility"],
                  )
                }
                className="form-input"
              >
                <option value="COMMAND_ONLY">
                  Apenas Comando
                </option>
                <option value="PUBLIC">Público interno</option>
                <option value="PRIVATE">Privado</option>
              </select>
            </FormField>

            <div className="md:col-span-2">
              <FormField label="Título" required>
                <input
                  value={form.title}
                  onChange={(event) =>
                    setField("title", event.target.value)
                  }
                  className="form-input"
                  placeholder="Título do processo"
                />
              </FormField>
            </div>

            <div className="md:col-span-2">
              <FormField label="Sanção aplicada">
                <input
                  value={form.sanction}
                  onChange={(event) =>
                    setField("sanction", event.target.value)
                  }
                  className="form-input"
                  placeholder="Descrição resumida da sanção"
                />
              </FormField>
            </div>

            <div className="md:col-span-2">
              <FormField label="Fundamentação / factos apurados">
                <textarea
                  value={form.reason}
                  onChange={(event) =>
                    setField("reason", event.target.value)
                  }
                  rows={8}
                  className="form-input resize-y"
                  placeholder="Descreve os factos, artigos aplicados e fundamentação..."
                />
              </FormField>
            </div>

            <div className="md:col-span-2">
              <FormField label="Conteúdo integral / publicação">
                <textarea
                  value={form.fullContent}
                  onChange={(event) =>
                    setField(
                      "fullContent",
                      event.target.value,
                    )
                  }
                  rows={12}
                  className="form-input resize-y font-mono text-xs"
                  placeholder="Conteúdo completo da publicação..."
                />
              </FormField>
            </div>
          </div>
        </div>

        <footer className="flex shrink-0 flex-col-reverse gap-3 border-t border-white/10 bg-[#050a08]/95 p-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="h-11 rounded-xl border border-white/10 bg-white/[0.04] px-5 text-[10px] font-black uppercase tracking-[0.14em] text-white/45 transition hover:text-white disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={
              isPending ||
              !form.targetDiscordId.trim() ||
              !form.title.trim()
            }
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-primary/25 bg-primary/15 px-6 text-[10px] font-black uppercase tracking-[0.14em] text-primary transition hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {mode === "CREATE"
              ? "Criar processo"
              : "Guardar alterações"}
          </button>
        </footer>
      </form>

      <style>{`
        .form-input {
          width: 100%;
          border-radius: 0.875rem;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(0,0,0,0.25);
          padding: 0.875rem 1rem;
          color: white;
          outline: none;
          transition: 160ms ease;
        }

        .form-input:focus {
          border-color: hsl(var(--primary) / 0.40);
          box-shadow: 0 0 0 4px hsl(var(--primary) / 0.07);
        }

        .form-input:disabled {
          cursor: not-allowed;
          opacity: 0.45;
        }

        .form-input option {
          background: #07100d;
          color: white;
        }
      `}</style>
    </div>,
    document.body,
  );
}

function ReplaceModal({
  item,
  isPending,
  onClose,
  onSubmit,
}: {
  item: DisciplinaryItem;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (
    type: EditorForm["type"],
    reason: string,
  ) => void;
}) {
  const allowedTypes = (
    [
      "FIRST_WARNING",
      "SECOND_WARNING",
      "SUSPENSION",
    ] as const
  ).filter((type) => type !== item.type);

  const [type, setType] = useState<EditorForm["type"]>(
    allowedTypes[0] || "SECOND_WARNING",
  );
  const [reason, setReason] = useState(
    item.reason || "",
  );

  useBodyLock(onClose);

  return createPortal(
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-black/85 backdrop-blur-md"
      />

      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(type, reason.trim());
        }}
        className="relative w-full max-w-xl rounded-[2rem] border border-orange-400/20 bg-[#080b09] p-6 shadow-[0_40px_160px_rgba(0,0,0,0.9)]"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-400/20 bg-orange-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-orange-300">
              <ArrowUpCircle className="h-3.5 w-3.5" />
              Substituir sanção
            </div>
            <h2 className="mt-3 text-2xl font-black text-white">
              Alterar nível disciplinar
            </h2>
            <p className="mt-2 text-sm text-white/40">
              O processo atual passa a substituído e será criado um
              novo processo ativo.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-white/40 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 space-y-5">
          <FormField label="Novo tipo de sanção">
            <select
              value={type}
              onChange={(event) =>
                setType(
                  event.target.value as EditorForm["type"],
                )
              }
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
            >
              {allowedTypes.map((allowedType) => (
                <option
                  key={allowedType}
                  value={allowedType}
                  className="bg-[#07100d]"
                >
                  {getTypeLabel(allowedType)}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Fundamentação da substituição">
            <textarea
              value={reason}
              onChange={(event) =>
                setReason(event.target.value)
              }
              rows={6}
              className="w-full resize-y rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
            />
          </FormField>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="h-11 rounded-xl border border-white/10 px-5 text-[10px] font-black uppercase tracking-[0.13em] text-white/45"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-orange-400/25 bg-orange-500/15 px-5 text-[10px] font-black uppercase tracking-[0.13em] text-orange-300 disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowUpCircle className="h-4 w-4" />
            )}
            Confirmar substituição
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}

function ConfirmationModal({
  kind,
  item,
  isPending,
  onClose,
  onConfirm,
}: {
  kind: "REMOVE" | "REACTIVATE" | "DELETE";
  item: DisciplinaryItem;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  useBodyLock(onClose);

  const config = {
    REMOVE: {
      title: "Retirar sanção",
      description:
        "A sanção deixa de estar ativa, mas o processo permanece no histórico do militar.",
      confirm: "Retirar sanção",
      icon: CheckCircle2,
      button:
        "border-emerald-400/25 bg-emerald-500/15 text-emerald-300",
    },
    REACTIVATE: {
      title:
        item.status === "DRAFT"
          ? "Aplicar sanção"
          : "Reativar sanção",
      description:
        item.status === "DRAFT"
          ? "O rascunho passa a processo ativo."
          : "A sanção retirada volta a ficar ativa.",
      confirm:
        item.status === "DRAFT"
          ? "Aplicar sanção"
          : "Reativar sanção",
      icon: RotateCcw,
      button:
        "border-blue-400/25 bg-blue-500/15 text-blue-300",
    },
    DELETE: {
      title: "Apagar definitivamente",
      description:
        "Esta ação remove o processo da base de dados. Deixa de aparecer nos Avisos e no perfil do militar. Não pode ser anulada.",
      confirm: "Apagar definitivamente",
      icon: Trash2,
      button:
        "border-red-400/30 bg-red-500/15 text-red-300",
    },
  }[kind];

  const Icon = config.icon;

  return createPortal(
    <div className="fixed inset-0 z-[10002] flex items-center justify-center p-4">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-black/85 backdrop-blur-md"
      />

      <div className="relative w-full max-w-lg rounded-[2rem] border border-white/10 bg-[#080b09] p-6 shadow-[0_40px_160px_rgba(0,0,0,0.9)]">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
          <Icon className="h-6 w-6 text-white/70" />
        </div>

        <h2 className="mt-5 text-2xl font-black text-white">
          {config.title}
        </h2>

        <p className="mt-3 text-sm leading-6 text-white/45">
          {config.description}
        </p>

        <div className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-4">
          <p className="text-sm font-black text-white">
            {item.title}
          </p>
          <p className="mt-1 text-xs text-white/35">
            {getDisplayName(item)} ·{" "}
            {getTypeLabel(item.type)}
          </p>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="h-11 rounded-xl border border-white/10 px-5 text-[10px] font-black uppercase tracking-[0.13em] text-white/45"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-5 text-[10px] font-black uppercase tracking-[0.13em] disabled:opacity-50 ${config.button}`}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Icon className="h-4 w-4" />
            )}
            {config.confirm}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function FormField({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.14em] text-white/40">
        {label}
        {required && (
          <span className="ml-1 text-red-300">*</span>
        )}
      </span>
      {children}
    </label>
  );
}

function AttachmentPreview({
  attachment,
}: {
  attachment: DisciplinaryAttachment;
}) {
  const previewUrl = getAttachmentPreviewUrl(attachment);
  const isVideo = isVideoAttachment(attachment);
  const isImage = isImageAttachment(attachment);
  const isPdf = isPdfAttachment(attachment);

  return (
    <article className="overflow-hidden rounded-2xl border border-white/[0.08] bg-black/25">
      {isVideo && (
        <video
          src={attachment.url}
          controls
          preload="metadata"
          playsInline
          className="aspect-video max-h-[520px] w-full bg-black object-contain"
        />
      )}

      {isImage && (
        <a
          href={attachment.url}
          target="_blank"
          rel="noreferrer"
          className="block bg-black/40"
        >
          <img
            src={previewUrl}
            alt={attachment.filename}
            loading="lazy"
            className="max-h-[520px] w-full object-contain"
          />
        </a>
      )}

      {!isVideo && !isImage && (
        <div className="flex min-h-36 items-center justify-center bg-black/30 p-6">
          <div className="text-center">
            {isPdf ? (
              <FileText className="mx-auto h-10 w-10 text-red-300" />
            ) : (
              <Paperclip className="mx-auto h-9 w-9 text-cyan-300" />
            )}
            <p className="mt-3 text-sm font-black text-white">
              {isPdf ? "Documento PDF" : "Ficheiro anexado"}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-white/[0.08] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {isVideo ? (
              <Play className="h-4 w-4 shrink-0 text-cyan-300" />
            ) : isImage ? (
              <ImageIcon className="h-4 w-4 shrink-0 text-cyan-300" />
            ) : (
              <Paperclip className="h-4 w-4 shrink-0 text-cyan-300" />
            )}
            <p className="truncate text-sm font-bold text-white">
              {attachment.filename}
            </p>
          </div>

          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/25">
            {getAttachmentContentType(attachment) ||
              "Tipo desconhecido"}{" "}
            · {formatFileSize(attachment.size)}
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          <a
            href={attachment.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-[9px] font-black uppercase tracking-[0.13em] text-white/55 transition hover:text-cyan-200"
          >
            <ExternalLink className="h-4 w-4" />
            Abrir
          </a>

          <a
            href={attachment.url}
            download={attachment.filename}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-4 text-[9px] font-black uppercase tracking-[0.13em] text-cyan-300"
          >
            <Download className="h-4 w-4" />
            Guardar
          </a>
        </div>
      </div>
    </article>
  );
}

function DetailItem({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-black/20 p-4">
      <p className="text-[8px] font-black uppercase tracking-[0.17em] text-white/30">
        {label}
      </p>
      <p
        className={`mt-2 break-words text-sm font-bold text-white/75 ${
          mono ? "font-mono text-xs" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function ToastMessage({
  toast,
}: {
  toast: {
    type: "success" | "error";
    message: string;
  };
}) {
  return createPortal(
    <div
      className={`fixed bottom-6 right-6 z-[11000] flex max-w-md items-start gap-3 rounded-2xl border p-4 shadow-[0_25px_90px_rgba(0,0,0,0.7)] backdrop-blur-xl ${
        toast.type === "success"
          ? "border-emerald-400/25 bg-[#07130f]/95 text-emerald-200"
          : "border-red-400/25 bg-[#16090a]/95 text-red-200"
      }`}
    >
      {toast.type === "success" ? (
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
      ) : (
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
      )}
      <p className="text-sm font-bold">{toast.message}</p>
    </div>,
    document.body,
  );
}

function useBodyLock(onClose: () => void) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);
}

function LoadingState() {
  return (
    <section className="flex min-h-[340px] items-center justify-center rounded-[2rem] border border-white/[0.08] bg-[#07100d]/70">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
        <p className="mt-5 text-sm font-black text-white">
          A carregar os processos disciplinares
        </p>
      </div>
    </section>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <section className="rounded-[2rem] border border-red-400/20 bg-red-500/[0.055] p-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-red-400/20 bg-red-500/10 text-red-300">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">
              Falha ao carregar os registos
            </h2>
            <p className="mt-2 text-sm leading-6 text-red-100/55">
              {message}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onRetry}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-red-400/20 bg-red-500/10 px-5 text-[9px] font-black uppercase tracking-[0.14em] text-red-300"
        >
          <RefreshCcw className="h-4 w-4" />
          Tentar novamente
        </button>
      </div>
    </section>
  );
}

function EmptyState({
  hasSearch,
  onReset,
}: {
  hasSearch: boolean;
  onReset: () => void;
}) {
  return (
    <section className="flex min-h-[330px] items-center justify-center rounded-[2rem] border border-dashed border-white/[0.1] bg-[#07100d]/65 p-8 text-center">
      <div>
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.035] text-white/30">
          <FileWarning className="h-7 w-7" />
        </div>

        <h2 className="mt-5 text-xl font-black text-white">
          Nenhum processo encontrado
        </h2>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/35">
          {hasSearch
            ? "Não existem registos que correspondam aos filtros ou à pesquisa."
            : "Ainda não existem processos disciplinares guardados."}
        </p>

        {hasSearch && (
          <button
            type="button"
            onClick={onReset}
            className="mt-5 rounded-xl border border-primary/20 bg-primary/10 px-5 py-3 text-[9px] font-black uppercase tracking-[0.14em] text-primary"
          >
            Limpar filtros
          </button>
        )}
      </div>
    </section>
  );
}
