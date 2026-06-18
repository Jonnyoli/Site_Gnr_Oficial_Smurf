import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  AnimatePresence,
  motion,
} from "framer-motion";

import {
  Archive,
  ArrowRight,
  BookOpen,
  Bot,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  ExternalLink,
  File,
  FileArchive,
  FileText,
  Filter,
  FolderOpen,
  GraduationCap,
  Image as ImageIcon,
  Loader2,
  Lock,
  Maximize2,
  Megaphone,
  MessageSquareText,
  Newspaper,
  Paperclip,
  Pin,
  Play,
  RefreshCcw,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Tag,
  UserRound,
  Video,
  X,
} from "lucide-react";

/**
 * ============================================================
 * TIPOS
 * ============================================================
 */

type Attachment = {
  id?: string | null;
  filename: string;
  url: string;
  proxyUrl?: string | null;
  contentType?: string | null;
  size?: number;
  width?: number | null;
  height?: number | null;
};

type EmbedField = {
  name: string;
  value: string;
  inline?: boolean;
};

type DiscordEmbed = {
  title?: string | null;
  description?: string | null;
  url?: string | null;
  color?: number | null;
  timestamp?: string | null;
  authorName?: string | null;
  authorIconUrl?: string | null;
  thumbnailUrl?: string | null;
  imageUrl?: string | null;
  footerText?: string | null;
  footerIconUrl?: string | null;
  fields?: EmbedField[];
};

type ThreadMessage = {
  discordMessageId: string;
  discordChannelId: string;
  authorDiscordId?: string | null;
  authorName: string;
  authorAvatarUrl?: string | null;
  content: string;
  cleanContent?: string;
  attachments: Attachment[];
  embeds?: DiscordEmbed[];
  publishedAt: string;
  editedAt?: string | null;
  pinned?: boolean;
  isStarterMessage?: boolean;
  isBot?: boolean;
  isWebhook?: boolean;
  webhookId?: string | null;
  discordUrl?: string | null;
  metadata?: Record<string, unknown>;
};

type DocumentItem = {
  _id: string;
  discordMessageId?: string;
  discordChannelId?: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  visibility: string;
  allowedRoleIds: string[];
  featured: boolean;
  pinned: boolean;
  archived: boolean;
  authorDiscordId?: string | null;
  authorName: string;
  content: string;
  attachments: Attachment[];
  messages?: ThreadMessage[];
  messageCount?: number;
  totalAttachmentCount?: number;
  lastMessageAt?: string | null;
  discordUrl?: string | null;
  publishedAt: string;
  editedAt?: string | null;
  lastSyncedAt: string;
};

type DocumentsResponse = {
  items: DocumentItem[];
  total: number;
  page: number;
  limit: number;
  canManage: boolean;
  channelId: string;
  categoryStats: Array<{
    _id: string;
    count: number;
  }>;
};

type StatsResponse = {
  total: number;
  featured: number;
  attachments: number;
  recent: number;
  categories: number;
};

type AttachmentKind =
  | "IMAGE"
  | "VIDEO"
  | "PDF"
  | "FILE";

/**
 * ============================================================
 * CONFIGURAÇÃO
 * ============================================================
 */

const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") ||
  (import.meta.env.DEV
    ? "http://localhost:3000"
    : "");

const CATEGORIES = [
  "ALL",
  "REGULAMENTOS",
  "GUIAS",
  "MODELOS",
  "FORMACAO",
  "PROCEDIMENTOS",
  "LEGISLACAO",
  "COMUNICADOS",
  "RELATORIOS",
  "OUTROS",
] as const;

const CATEGORY_META: Record<
  string,
  {
    label: string;
    description: string;
    icon: any;
    color: string;
  }
> = {
  REGULAMENTOS: {
    label: "Regulamentos",
    description:
      "Normas e regulamentos internos.",
    icon: ShieldCheck,
    color:
      "border-emerald-400/20 bg-emerald-500/10 text-emerald-300",
  },

  GUIAS: {
    label: "Guias e Manuais",
    description:
      "Materiais rápidos de consulta.",
    icon: BookOpen,
    color:
      "border-blue-400/20 bg-blue-500/10 text-blue-300",
  },

  MODELOS: {
    label: "Modelos",
    description:
      "Minutas e documentos reutilizáveis.",
    icon: FileText,
    color:
      "border-cyan-400/20 bg-cyan-500/10 text-cyan-300",
  },

  FORMACAO: {
    label: "Formação",
    description:
      "Conteúdos de cursos e instrução.",
    icon: GraduationCap,
    color:
      "border-violet-400/20 bg-violet-500/10 text-violet-300",
  },

  PROCEDIMENTOS: {
    label: "Procedimentos",
    description:
      "Processos e instruções operacionais.",
    icon: CheckCircle2,
    color:
      "border-orange-400/20 bg-orange-500/10 text-orange-300",
  },

  LEGISLACAO: {
    label: "Legislação",
    description:
      "Leis, artigos e enquadramento jurídico.",
    icon: Scale,
    color:
      "border-yellow-400/20 bg-yellow-500/10 text-yellow-300",
  },

  COMUNICADOS: {
    label: "Comunicados",
    description:
      "Informações e ordens internas.",
    icon: Megaphone,
    color:
      "border-red-400/20 bg-red-500/10 text-red-300",
  },

  RELATORIOS: {
    label: "Relatórios",
    description:
      "Relatórios e registos de atividade.",
    icon: Newspaper,
    color:
      "border-sky-400/20 bg-sky-500/10 text-sky-300",
  },

  OUTROS: {
    label: "Outros",
    description:
      "Outros conteúdos disponíveis.",
    icon: FileArchive,
    color:
      "border-white/10 bg-white/[0.05] text-white/50",
  },
};

/**
 * ============================================================
 * API
 * ============================================================
 */

async function apiRequest<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(
    `${API_BASE_URL}${path}`,
    {
      credentials: "include",

      headers: {
        Accept: "application/json",

        ...(options?.body
          ? {
              "Content-Type":
                "application/json",
            }
          : {}),

        ...(options?.headers || {}),
      },

      ...options,
    },
  );

  const data =
    await response
      .json()
      .catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.error ||
        `Pedido falhou com o código ${response.status}.`,
    );
  }

  return data as T;
}

/**
 * ============================================================
 * UTILITÁRIOS
 * ============================================================
 */

function formatDate(
  value?: string | null,
) {
  if (!value) {
    return "Data desconhecida";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Data desconhecida";
  }

  return new Intl.DateTimeFormat(
    "pt-PT",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  ).format(date);
}

function formatDateTime(
  value?: string | null,
) {
  if (!value) {
    return "Data desconhecida";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Data desconhecida";
  }

  return new Intl.DateTimeFormat(
    "pt-PT",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date);
}

function formatBytes(
  value = 0,
) {
  if (!value) {
    return "Tamanho desconhecido";
  }

  const units = [
    "B",
    "KB",
    "MB",
    "GB",
  ];

  const index = Math.min(
    Math.floor(
      Math.log(value) /
        Math.log(1024),
    ),
    units.length - 1,
  );

  return `${(
    value /
    1024 ** index
  ).toFixed(index === 0 ? 0 : 1)} ${
    units[index]
  }`;
}

function getAttachmentType(
  attachment: Attachment,
): AttachmentKind {
  const type = String(
    attachment.contentType || "",
  ).toLowerCase();

  const filename =
    String(
      attachment.filename || "",
    ).toLowerCase();

  if (
    type.startsWith("image/") ||
    /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(
      filename,
    )
  ) {
    return "IMAGE";
  }

  if (
    type.startsWith("video/") ||
    /\.(mp4|webm|mov|m4v|avi)$/i.test(
      filename,
    )
  ) {
    return "VIDEO";
  }

  if (
    type === "application/pdf" ||
    filename.endsWith(".pdf")
  ) {
    return "PDF";
  }

  return "FILE";
}

function getAttachmentUrl(
  attachment: Attachment,
) {
  return (
    attachment.proxyUrl ||
    attachment.url
  );
}

function getAllMessages(
  item: DocumentItem,
): ThreadMessage[] {
  if (
    Array.isArray(item.messages) &&
    item.messages.length > 0
  ) {
    return [...item.messages].sort(
      (a, b) =>
        new Date(
          a.publishedAt || 0,
        ).getTime() -
        new Date(
          b.publishedAt || 0,
        ).getTime(),
    );
  }

  /**
   * Compatibilidade com documentos antigos.
   */
  return [
    {
      discordMessageId:
        item.discordMessageId ||
        item._id,

      discordChannelId:
        item.discordChannelId ||
        "",

      authorDiscordId:
        item.authorDiscordId ||
        null,

      authorName:
        item.authorName ||
        "Utilizador Discord",

      authorAvatarUrl: null,

      content:
        item.content ||
        item.description ||
        "",

      cleanContent:
        item.content ||
        item.description ||
        "",

      attachments:
        Array.isArray(
          item.attachments,
        )
          ? item.attachments
          : [],

      embeds: [],

      publishedAt:
        item.publishedAt,

      editedAt:
        item.editedAt ||
        null,

      pinned:
        item.pinned,

      isStarterMessage:
        true,

      isBot:
        false,

      isWebhook:
        false,

      discordUrl:
        item.discordUrl ||
        null,
    },
  ];
}

function getAllAttachments(
  item: DocumentItem,
) {
  const messages =
    getAllMessages(item);

  const attachments =
    messages.flatMap(
      (message) =>
        Array.isArray(
          message.attachments,
        )
          ? message.attachments
          : [],
    );

  if (
    attachments.length === 0 &&
    Array.isArray(item.attachments)
  ) {
    return item.attachments;
  }

  const unique =
    new Map<string, Attachment>();

  for (const attachment of attachments) {
    const key =
      attachment.id ||
      attachment.url ||
      attachment.filename;

    if (!unique.has(key)) {
      unique.set(
        key,
        attachment,
      );
    }
  }

  return [
    ...unique.values(),
  ];
}

function getDocumentPreviewImage(
  item: DocumentItem,
) {
  const allAttachments =
    getAllAttachments(item);

  const image =
    allAttachments.find(
      (attachment) =>
        getAttachmentType(
          attachment,
        ) === "IMAGE",
    );

  if (image) {
    return getAttachmentUrl(image);
  }

  const messages =
    getAllMessages(item);

  for (const message of messages) {
    const embedImage =
      message.embeds?.find(
        (embed) =>
          embed.imageUrl ||
          embed.thumbnailUrl,
      );

    if (embedImage) {
      return (
        embedImage.imageUrl ||
        embedImage.thumbnailUrl ||
        null
      );
    }
  }

  return null;
}

function getDocumentMessageCount(
  item: DocumentItem,
) {
  return (
    item.messageCount ||
    getAllMessages(item).length
  );
}

function getDocumentAttachmentCount(
  item: DocumentItem,
) {
  return (
    item.totalAttachmentCount ??
    getAllAttachments(item).length
  );
}

function getInitials(
  name: string,
) {
  return String(name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) =>
      part.charAt(0).toUpperCase(),
    )
    .join("");
}

/**
 * ============================================================
 * PÁGINA PRINCIPAL
 * ============================================================
 */

export default function Documentos() {
  const [
    documents,
    setDocuments,
  ] = useState<DocumentItem[]>(
    [],
  );

  const [
    stats,
    setStats,
  ] = useState<StatsResponse>({
    total: 0,
    featured: 0,
    attachments: 0,
    recent: 0,
    categories: 0,
  });

  const [
    categoryStats,
    setCategoryStats,
  ] = useState<
    DocumentsResponse["categoryStats"]
  >([]);

  const [
    canManage,
    setCanManage,
  ] = useState(false);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    category,
    setCategory,
  ] = useState("ALL");

  const [
    selected,
    setSelected,
  ] =
    useState<DocumentItem | null>(
      null,
    );

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isSyncing,
    setIsSyncing,
  ] = useState(false);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  async function loadDocuments() {
    setIsLoading(true);
    setError(null);

    try {
      const params =
        new URLSearchParams();

      if (search.trim()) {
        params.set(
          "q",
          search.trim(),
        );
      }

      if (category !== "ALL") {
        params.set(
          "category",
          category,
        );
      }

      params.set(
        "limit",
        "120",
      );

      const [
        documentsResponse,
        statsResponse,
      ] = await Promise.all([
        apiRequest<DocumentsResponse>(
          `/api/documents?${params.toString()}`,
        ),

        apiRequest<StatsResponse>(
          "/api/documents/stats",
        ),
      ]);

      setDocuments(
        documentsResponse.items ||
          [],
      );

      setCategoryStats(
        documentsResponse.categoryStats ||
          [],
      );

      setCanManage(
        documentsResponse.canManage ===
          true,
      );

      setStats(
        statsResponse,
      );

      /**
       * Atualiza o documento aberto após sincronização.
       */
      if (selected) {
        const refreshed =
          documentsResponse.items.find(
            (item) =>
              item._id ===
              selected._id,
          );

        if (refreshed) {
          setSelected(
            refreshed,
          );
        }
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Não foi possível carregar os documentos.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const timeout =
      window.setTimeout(() => {
        void loadDocuments();
      }, 250);

    return () =>
      window.clearTimeout(
        timeout,
      );
  }, [search, category]);

  async function syncDocuments() {
    setIsSyncing(true);
    setError(null);

    try {
      await apiRequest(
        "/api/documents/sync",
        {
          method: "POST",

          body: JSON.stringify(
            {},
          ),
        },
      );

      await loadDocuments();
    } catch (syncError) {
      setError(
        syncError instanceof Error
          ? syncError.message
          : "Não foi possível sincronizar o canal.",
      );
    } finally {
      setIsSyncing(false);
    }
  }

  const featuredDocuments =
    useMemo(
      () =>
        documents
          .filter(
            (item) =>
              item.featured ||
              item.pinned,
          )
          .slice(0, 5),
      [documents],
    );

  const normalDocuments =
    useMemo(
      () =>
        documents.filter(
          (item) =>
            !item.featured &&
            !item.pinned,
        ),
      [documents],
    );

  const categoryCountMap =
    useMemo(
      () =>
        Object.fromEntries(
          categoryStats.map(
            (item) => [
              item._id,
              item.count,
            ],
          ),
        ),
      [categoryStats],
    );

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 16,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      className="space-y-7 pb-12"
    >
      <section className="relative overflow-hidden rounded-[2.6rem] border border-white/10 bg-[#050b09]/95 p-8 shadow-[0_38px_150px_rgba(0,0,0,0.45)] md:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_22%,rgba(16,185,129,0.18),transparent_34%),radial-gradient(circle_at_86%_20%,rgba(59,130,246,0.10),transparent_30%)]" />

        <div className="absolute inset-0 cyber-grid-soft opacity-[0.12]" />

        <div className="absolute -right-20 -top-24 h-80 w-80 rounded-full border border-primary/10" />

        <div className="relative flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-4xl">
            <div className="mb-5 inline-flex items-center gap-3 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.23em] text-primary">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70" />

                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
              </span>

              Biblioteca sincronizada
            </div>

            <div className="flex items-start gap-5">
              <div className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-[1.4rem] border border-primary/20 bg-primary/10 text-primary sm:flex">
                <FolderOpen className="h-8 w-8" />
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">
                  Arquivo institucional
                </p>

                <h1 className="mt-2 text-4xl font-black tracking-[-0.04em] text-white md:text-5xl">
                  Documentos da Central
                </h1>

                <p className="mt-4 max-w-3xl text-sm leading-7 text-white/45">
                  Consulta as publicações completas,
                  todas as mensagens, imagens, vídeos,
                  PDFs e anexos diretamente no site.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                void loadDocuments()
              }
              className="inline-flex h-12 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-5 text-[10px] font-black uppercase tracking-[0.15em] text-white/55 transition hover:border-primary/20 hover:text-primary"
            >
              <RefreshCcw className="h-4 w-4" />

              Atualizar
            </button>

            {canManage && (
              <button
                type="button"
                onClick={() =>
                  void syncDocuments()
                }
                disabled={
                  isSyncing
                }
                className="inline-flex h-12 items-center gap-3 rounded-2xl border border-primary/30 bg-primary/15 px-6 text-[10px] font-black uppercase tracking-[0.15em] text-primary transition hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSyncing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}

                {isSyncing
                  ? "A sincronizar..."
                  : "Sincronizar Discord"}
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 xl:grid-cols-5">
        <StatCard
          label="Documentos"
          value={stats.total}
          icon={
            <FileText className="h-5 w-5" />
          }
          tone="green"
        />

        <StatCard
          label="Destaques"
          value={stats.featured}
          icon={
            <Star className="h-5 w-5" />
          }
          tone="gold"
        />

        <StatCard
          label="Anexos"
          value={stats.attachments}
          icon={
            <Paperclip className="h-5 w-5" />
          }
          tone="blue"
        />

        <StatCard
          label="Esta semana"
          value={stats.recent}
          icon={
            <Newspaper className="h-5 w-5" />
          }
          tone="cyan"
        />

        <StatCard
          label="Categorias"
          value={stats.categories}
          icon={
            <Archive className="h-5 w-5" />
          }
          tone="violet"
        />
      </section>

      {featuredDocuments.length >
        0 && (
        <FeaturedCarousel
          items={
            featuredDocuments
          }
          onOpen={
            setSelected
          }
        />
      )}

      <section className="rounded-[2rem] border border-white/10 bg-[#050b09]/90 p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative w-full xl:max-w-2xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/30" />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Pesquisar por título, autor, categoria ou conteúdo..."
              className="h-14 w-full rounded-2xl border border-white/10 bg-black/25 pl-12 pr-12 text-sm text-white outline-none placeholder:text-white/25 focus:border-primary/30"
            />

            {search && (
              <button
                type="button"
                onClick={() =>
                  setSearch("")
                }
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.16em] text-white/30">
            <Filter className="h-4 w-4" />

            {documents.length} resultados
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {CATEGORIES.map(
            (value) => {
              const meta =
                value === "ALL"
                  ? {
                      label:
                        "Todos",

                      icon:
                        FolderOpen,

                      color:
                        "border-primary/20 bg-primary/10 text-primary",
                    }
                  : CATEGORY_META[
                      value
                    ];

              const Icon =
                meta.icon;

              const count =
                value === "ALL"
                  ? stats.total
                  : Number(
                      categoryCountMap[
                        value
                      ] || 0,
                    );

              return (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setCategory(
                      value,
                    )
                  }
                  className={`inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-[9px] font-black uppercase tracking-[0.12em] transition ${
                    category ===
                    value
                      ? meta.color
                      : "border-white/[0.08] bg-white/[0.025] text-white/35 hover:border-white/15 hover:text-white/65"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />

                  {meta.label}

                  <span className="rounded-md bg-black/20 px-1.5 py-0.5 text-[8px]">
                    {count}
                  </span>
                </button>
              );
            },
          )}
        </div>
      </section>

      {isLoading && (
        <LoadingState />
      )}

      {error &&
        !isLoading && (
          <ErrorState
            message={error}
            onRetry={() =>
              void loadDocuments()
            }
          />
        )}

      {!isLoading &&
        !error &&
        documents.length === 0 && (
          <EmptyState />
        )}

      {!isLoading &&
        !error &&
        normalDocuments.length >
          0 && (
          <section>
            <div className="mb-5">
              <p className="text-[10px] font-black uppercase tracking-[0.23em] text-primary">
                Biblioteca
              </p>

              <h2 className="mt-2 text-3xl font-black text-white">
                Todos os documentos
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
              {normalDocuments.map(
                (item) => (
                  <DocumentCard
                    key={
                      item._id
                    }
                    item={item}
                    onOpen={() =>
                      setSelected(
                        item,
                      )
                    }
                  />
                ),
              )}
            </div>
          </section>
        )}

      {selected && (
        <DocumentDrawer
          item={selected}
          onClose={() =>
            setSelected(null)
          }
        />
      )}
    </motion.div>
  );
}

/**
 * ============================================================
 * CARROSSEL
 * ============================================================
 */

function FeaturedCarousel({
  items,
  onOpen,
}: {
  items: DocumentItem[];
  onOpen: (
    item: DocumentItem,
  ) => void;
}) {
  const [
    index,
    setIndex,
  ] = useState(0);

  useEffect(() => {
    if (items.length <= 1) {
      return;
    }

    const interval =
      window.setInterval(() => {
        setIndex(
          (current) =>
            (current + 1) %
            items.length,
        );
      }, 6500);

    return () =>
      window.clearInterval(
        interval,
      );
  }, [items.length]);

  useEffect(() => {
    if (index >= items.length) {
      setIndex(0);
    }
  }, [items.length, index]);

  const item =
    items[index];

  if (!item) {
    return null;
  }

  const preview =
    getDocumentPreviewImage(
      item,
    );

  const messageCount =
    getDocumentMessageCount(
      item,
    );

  const attachmentCount =
    getDocumentAttachmentCount(
      item,
    );

  return (
    <section className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-black shadow-[0_30px_120px_rgba(0,0,0,0.4)]">
      <AnimatePresence mode="wait">
        <motion.div
          key={item._id}
          initial={{
            opacity: 0,
            scale: 1.015,
          }}
          animate={{
            opacity: 1,
            scale: 1,
          }}
          exit={{
            opacity: 0,
          }}
          transition={{
            duration: 0.5,
          }}
          className="relative min-h-[460px]"
        >
          {preview ? (
            <img
              src={preview}
              alt={item.title}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(16,185,129,0.22),transparent_35%),linear-gradient(145deg,#06100d,#030706)]" />
          )}

          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.94),rgba(0,0,0,0.65)_55%,rgba(0,0,0,0.30))]" />

          <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.9))]" />

          <div className="relative flex min-h-[460px] items-end p-8 md:p-10">
            <div className="max-w-3xl">
              <div className="mb-4 flex flex-wrap gap-2">
                <Badge
                  category={
                    item.category
                  }
                />

                {item.pinned && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-yellow-400/20 bg-yellow-500/10 px-3 py-1 text-[8px] font-black uppercase tracking-[0.14em] text-yellow-300">
                    <Pin className="h-3 w-3" />

                    Fixado
                  </span>
                )}
              </div>

              <h2 className="text-4xl font-black leading-tight text-white md:text-5xl">
                {item.title}
              </h2>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/55">
                {item.description ||
                  "Documento institucional disponível para consulta."}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-4 text-[10px] font-bold uppercase tracking-[0.13em] text-white/35">
                <span>
                  {item.authorName}
                </span>

                <span>
                  {formatDate(
                    item.publishedAt,
                  )}
                </span>

                <span className="inline-flex items-center gap-1.5">
                  <MessageSquareText className="h-3.5 w-3.5" />

                  {messageCount} mensagens
                </span>

                <span className="inline-flex items-center gap-1.5">
                  <Paperclip className="h-3.5 w-3.5" />

                  {attachmentCount} anexos
                </span>
              </div>

              <button
                type="button"
                onClick={() =>
                  onOpen(item)
                }
                className="mt-7 inline-flex h-12 items-center gap-3 rounded-2xl border border-primary/25 bg-primary/15 px-6 text-[10px] font-black uppercase tracking-[0.15em] text-primary transition hover:bg-primary/20"
              >
                Ler publicação completa

                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {items.length > 1 && (
        <>
          <button
            type="button"
            onClick={() =>
              setIndex(
                (
                  index -
                  1 +
                  items.length
                ) %
                  items.length,
              )
            }
            className="absolute left-5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-2xl border border-white/15 bg-black/35 text-white/60 backdrop-blur-xl hover:text-primary"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() =>
              setIndex(
                (index + 1) %
                  items.length,
              )
            }
            className="absolute right-5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-2xl border border-white/15 bg-black/35 text-white/60 backdrop-blur-xl hover:text-primary"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="absolute bottom-6 right-6 flex gap-2 rounded-full border border-white/10 bg-black/35 px-3 py-2 backdrop-blur-xl">
            {items.map(
              (
                slide,
                slideIndex,
              ) => (
                <button
                  key={
                    slide._id
                  }
                  type="button"
                  onClick={() =>
                    setIndex(
                      slideIndex,
                    )
                  }
                  className={`h-2 rounded-full transition ${
                    slideIndex ===
                    index
                      ? "w-8 bg-primary"
                      : "w-2 bg-white/30"
                  }`}
                />
              ),
            )}
          </div>
        </>
      )}
    </section>
  );
}

/**
 * ============================================================
 * CARTÃO
 * ============================================================
 */

function DocumentCard({
  item,
  onOpen,
}: {
  item: DocumentItem;
  onOpen: () => void;
}) {
  const meta =
    CATEGORY_META[
      item.category
    ] ||
    CATEGORY_META.OUTROS;

  const Icon =
    meta.icon;

  const image =
    getDocumentPreviewImage(
      item,
    );

  const messageCount =
    getDocumentMessageCount(
      item,
    );

  const attachmentCount =
    getDocumentAttachmentCount(
      item,
    );

  return (
    <motion.article
      whileHover={{
        y: -5,
      }}
      className="group overflow-hidden rounded-[2rem] border border-white/10 bg-[#050b09]/88 shadow-[0_20px_75px_rgba(0,0,0,0.30)]"
    >
      <div className="relative h-48 overflow-hidden border-b border-white/10 bg-black/25">
        {image ? (
          <img
            src={image}
            alt={item.title}
            className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_50%_20%,rgba(16,185,129,0.17),transparent_45%)]">
            <Icon className="h-14 w-14 text-white/12" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />

        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <Badge
            category={
              item.category
            }
          />

          {item.pinned && (
            <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-yellow-400/20 bg-yellow-500/15 text-yellow-300 backdrop-blur-xl">
              <Pin className="h-3.5 w-3.5" />
            </span>
          )}
        </div>

        <div className="absolute bottom-4 right-4 flex gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/45 px-3 py-1 text-[8px] font-black uppercase tracking-[0.13em] text-white/50 backdrop-blur-xl">
            <MessageSquareText className="h-3 w-3" />

            {messageCount}
          </span>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/45 px-3 py-1 text-[8px] font-black uppercase tracking-[0.13em] text-white/50 backdrop-blur-xl">
            <Paperclip className="h-3 w-3" />

            {attachmentCount}
          </span>
        </div>
      </div>

      <div className="p-5">
        <h3 className="line-clamp-2 text-xl font-black text-white">
          {item.title}
        </h3>

        <p className="mt-3 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-white/38">
          {item.description ||
            "Documento institucional disponível para consulta."}
        </p>

        <div className="mt-5 flex items-center justify-between gap-4 border-t border-white/[0.07] pt-4">
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-white/55">
              {item.authorName}
            </p>

            <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.12em] text-white/22">
              {formatDate(
                item.publishedAt,
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={onOpen}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-4 text-[9px] font-black uppercase tracking-[0.13em] text-primary transition hover:bg-primary/15"
          >
            Ler tudo

            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.article>
  );
}

/**
 * ============================================================
 * PAINEL DO DOCUMENTO
 * ============================================================
 */

function DocumentDrawer({
  item,
  onClose,
}: {
  item: DocumentItem;
  onClose: () => void;
}) {
  const messages =
    getAllMessages(item);

  const attachmentCount =
    getDocumentAttachmentCount(
      item,
    );

  useEffect(() => {
    const previous =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    const handleEscape = (
      event: KeyboardEvent,
    ) => {
      if (
        event.key ===
        "Escape"
      ) {
        onClose();
      }
    };

    window.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      document.body.style.overflow =
        previous;

      window.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[9999]">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 h-full w-full bg-black/85 backdrop-blur-md"
        aria-label="Fechar documento"
      />

      <motion.aside
        initial={{
          x: "100%",
        }}
        animate={{
          x: 0,
        }}
        exit={{
          x: "100%",
        }}
        transition={{
          type: "spring",
          damping: 28,
          stiffness: 240,
        }}
        className="absolute right-0 top-0 flex h-[100dvh] w-full max-w-[1080px] flex-col overflow-hidden border-l border-white/10 bg-[#050a08] shadow-[-35px_0_140px_rgba(0,0,0,0.9)]"
      >
        <header className="relative shrink-0 overflow-hidden border-b border-white/10 p-6 md:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_0%,rgba(16,185,129,0.14),transparent_35%)]" />

          <div className="relative flex items-start justify-between gap-5">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  category={
                    item.category
                  }
                />

                {item.pinned && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-yellow-400/20 bg-yellow-500/10 px-3 py-1 text-[8px] font-black uppercase tracking-[0.14em] text-yellow-300">
                    <Pin className="h-3 w-3" />

                    Fixado
                  </span>
                )}

                {item.visibility !==
                  "PUBLIC" && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1 text-[8px] font-black uppercase tracking-[0.14em] text-red-300">
                    <Lock className="h-3 w-3" />

                    Restrito
                  </span>
                )}
              </div>

              <h2 className="mt-4 text-2xl font-black leading-tight text-white md:text-4xl">
                {item.title}
              </h2>

              <div className="mt-4 flex flex-wrap items-center gap-4 text-[10px] font-bold uppercase tracking-[0.12em] text-white/30">
                <span className="inline-flex items-center gap-2">
                  <UserRound className="h-3.5 w-3.5" />

                  {item.authorName}
                </span>

                <span className="inline-flex items-center gap-2">
                  <Clock3 className="h-3.5 w-3.5" />

                  {formatDateTime(
                    item.publishedAt,
                  )}
                </span>

                <span className="inline-flex items-center gap-2">
                  <MessageSquareText className="h-3.5 w-3.5" />

                  {messages.length} mensagens
                </span>

                <span className="inline-flex items-center gap-2">
                  <Paperclip className="h-3.5 w-3.5" />

                  {attachmentCount} anexos
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/40 transition hover:border-red-400/20 hover:bg-red-500/10 hover:text-red-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[940px] p-5 md:p-8">
            {item.description && (
              <section className="rounded-[1.5rem] border border-primary/15 bg-primary/[0.045] p-5">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">
                  Resumo da publicação
                </p>

                <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-white/58">
                  {item.description}
                </p>
              </section>
            )}

            {item.tags?.length >
              0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {item.tags.map(
                  (tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[9px] font-bold text-white/35"
                    >
                      <Tag className="h-3 w-3" />

                      {tag}
                    </span>
                  ),
                )}
              </div>
            )}

            <div className="my-7 flex items-center gap-4">
              <div className="h-px flex-1 bg-white/10" />

              <span className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-white/25">
                <MessageSquareText className="h-4 w-4" />

                Conteúdo completo
              </span>

              <div className="h-px flex-1 bg-white/10" />
            </div>

            <section className="space-y-5">
              {messages.map(
                (
                  message,
                  index,
                ) => (
                  <ThreadMessageCard
                    key={
                      message.discordMessageId ||
                      `${item._id}-${index}`
                    }
                    message={
                      message
                    }
                    index={
                      index
                    }
                  />
                ),
              )}
            </section>

            {messages.length ===
              0 && (
              <section className="rounded-[1.5rem] border border-dashed border-white/10 bg-black/20 p-8 text-center">
                <MessageSquareText className="mx-auto h-10 w-10 text-white/15" />

                <p className="mt-4 font-black text-white">
                  Sem conteúdo disponível
                </p>

                <p className="mt-2 text-sm text-white/30">
                  Sincroniza novamente para importar todas as mensagens.
                </p>
              </section>
            )}

            {item.discordUrl && (
              <div className="mt-8 flex justify-center">
                <a
                  href={
                    item.discordUrl
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-indigo-400/20 bg-indigo-500/10 px-5 text-[9px] font-black uppercase tracking-[0.13em] text-indigo-300 transition hover:bg-indigo-500/15"
                >
                  <ExternalLink className="h-4 w-4" />

                  Abrir publicação original
                </a>
              </div>
            )}

            <div className="h-10" />
          </div>
        </div>
      </motion.aside>
    </div>
  );
}

/**
 * ============================================================
 * MENSAGEM DA THREAD
 * ============================================================
 */

function ThreadMessageCard({
  message,
  index,
}: {
  message: ThreadMessage;
  index: number;
}) {
  const content =
    message.cleanContent ||
    message.content ||
    "";

  const hasContent =
    content.trim().length > 0;

  const attachments =
    Array.isArray(
      message.attachments,
    )
      ? message.attachments
      : [];

  const embeds =
    Array.isArray(
      message.embeds,
    )
      ? message.embeds
      : [];

  const isStarter =
    message.isStarterMessage ||
    index === 0;

  return (
    <article
      className={`overflow-hidden rounded-[1.7rem] border ${
        isStarter
          ? "border-primary/20 bg-primary/[0.035]"
          : "border-white/10 bg-white/[0.02]"
      }`}
    >
      <header className="flex items-start gap-4 border-b border-white/[0.07] p-5">
        <UserAvatar
          name={
            message.authorName
          }
          avatarUrl={
            message.authorAvatarUrl
          }
          isBot={
            message.isBot
          }
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-black text-white">
              {message.authorName ||
                "Utilizador Discord"}
            </p>

            {message.isBot && (
              <span className="inline-flex items-center gap-1 rounded-md border border-blue-400/20 bg-blue-500/10 px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.1em] text-blue-300">
                <Bot className="h-2.5 w-2.5" />

                Bot
              </span>
            )}

            {isStarter && (
              <span className="rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.1em] text-primary">
                Publicação inicial
              </span>
            )}

            {message.pinned && (
              <Pin className="h-3.5 w-3.5 text-yellow-300" />
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-2 text-[9px] font-bold uppercase tracking-[0.1em] text-white/22">
            <span>
              {formatDateTime(
                message.publishedAt,
              )}
            </span>

            {message.editedAt && (
              <>
                <span>•</span>

                <span>
                  Editado
                </span>
              </>
            )}
          </div>
        </div>

        {message.discordUrl && (
          <a
            href={
              message.discordUrl
            }
            target="_blank"
            rel="noreferrer"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] text-white/25 transition hover:border-indigo-400/20 hover:text-indigo-300"
            title="Abrir esta mensagem no Discord"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </header>

      <div className="space-y-4 p-5">
        {hasContent && (
          <DiscordContent
            content={content}
          />
        )}

        {embeds.map(
          (
            embed,
            embedIndex,
          ) => (
            <DiscordEmbedViewer
              key={`${message.discordMessageId}-embed-${embedIndex}`}
              embed={embed}
            />
          ),
        )}

        {attachments.map(
          (
            attachment,
            attachmentIndex,
          ) => (
            <AttachmentViewer
              key={
                attachment.id ||
                `${message.discordMessageId}-${attachmentIndex}`
              }
              attachment={
                attachment
              }
            />
          ),
        )}

        {!hasContent &&
          embeds.length === 0 &&
          attachments.length ===
            0 && (
            <p className="text-sm italic text-white/25">
              Mensagem sem conteúdo visível.
            </p>
          )}
      </div>
    </article>
  );
}

/**
 * ============================================================
 * CONTEÚDO DISCORD
 * ============================================================
 */

function DiscordContent({
  content,
}: {
  content: string;
}) {
  const lines =
    String(content)
      .replace(/\r/g, "")
      .split("\n");

  return (
    <div className="space-y-2 text-sm leading-7 text-white/62">
      {lines.map(
        (
          line,
          index,
        ) => {
          const trimmed =
            line.trim();

          if (!trimmed) {
            return (
              <div
                key={index}
                className="h-2"
              />
            );
          }

          if (
            trimmed.startsWith(
              "### ",
            )
          ) {
            return (
              <h4
                key={index}
                className="pt-2 text-base font-black text-white"
              >
                {trimmed.slice(
                  4,
                )}
              </h4>
            );
          }

          if (
            trimmed.startsWith(
              "## ",
            )
          ) {
            return (
              <h3
                key={index}
                className="pt-3 text-lg font-black text-white"
              >
                {trimmed.slice(
                  3,
                )}
              </h3>
            );
          }

          if (
            trimmed.startsWith(
              "# ",
            )
          ) {
            return (
              <h2
                key={index}
                className="pt-3 text-xl font-black text-white"
              >
                {trimmed.slice(
                  2,
                )}
              </h2>
            );
          }

          if (
            trimmed.startsWith(
              "> ",
            )
          ) {
            return (
              <blockquote
                key={index}
                className="rounded-r-xl border-l-2 border-primary/45 bg-primary/[0.04] px-4 py-2 text-white/50"
              >
                {renderInlineText(
                  trimmed.slice(
                    2,
                  ),
                )}
              </blockquote>
            );
          }

          if (
            /^[-*•]\s+/.test(
              trimmed,
            )
          ) {
            return (
              <div
                key={index}
                className="flex gap-3"
              >
                <span className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />

                <p>
                  {renderInlineText(
                    trimmed.replace(
                      /^[-*•]\s+/,
                      "",
                    ),
                  )}
                </p>
              </div>
            );
          }

          if (
            /^\d+\.\s+/.test(
              trimmed,
            )
          ) {
            const match =
              trimmed.match(
                /^(\d+)\.\s+(.*)$/,
              );

            return (
              <div
                key={index}
                className="flex gap-3"
              >
                <span className="flex h-6 min-w-6 items-center justify-center rounded-md bg-primary/10 px-1 text-[9px] font-black text-primary">
                  {match?.[1]}
                </span>

                <p>
                  {renderInlineText(
                    match?.[2] ||
                      trimmed,
                  )}
                </p>
              </div>
            );
          }

          if (
            trimmed.startsWith(
              "```",
            ) ||
            trimmed.endsWith(
              "```",
            )
          ) {
            return null;
          }

          return (
            <p key={index}>
              {renderInlineText(
                trimmed,
              )}
            </p>
          );
        },
      )}
    </div>
  );
}

function renderInlineText(
  text: string,
) {
  const parts =
    text.split(
      /(\*\*[^*]+\*\*|`[^`]+`|https?:\/\/[^\s]+)/g,
    );

  return parts.map(
    (
      part,
      index,
    ) => {
      if (
        part.startsWith(
          "**",
        ) &&
        part.endsWith(
          "**",
        )
      ) {
        return (
          <strong
            key={index}
            className="font-black text-white"
          >
            {part.slice(
              2,
              -2,
            )}
          </strong>
        );
      }

      if (
        part.startsWith(
          "`",
        ) &&
        part.endsWith(
          "`",
        )
      ) {
        return (
          <code
            key={index}
            className="rounded-md border border-white/10 bg-black/35 px-1.5 py-0.5 font-mono text-[0.9em] text-primary"
          >
            {part.slice(
              1,
              -1,
            )}
          </code>
        );
      }

      if (
        /^https?:\/\//.test(
          part,
        )
      ) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noreferrer"
            className="break-all text-blue-300 underline decoration-blue-300/30 underline-offset-4"
          >
            {part}
          </a>
        );
      }

      return part;
    },
  );
}

/**
 * ============================================================
 * EMBED DISCORD
 * ============================================================
 */

function DiscordEmbedViewer({
  embed,
}: {
  embed: DiscordEmbed;
}) {
  const borderColor =
    embed.color
      ? `#${Number(
          embed.color,
        )
          .toString(16)
          .padStart(6, "0")}`
      : undefined;

  return (
    <section
      className="overflow-hidden rounded-[1.3rem] border border-white/10 bg-black/25"
      style={{
        borderLeftColor:
          borderColor,
        borderLeftWidth:
          borderColor
            ? 4
            : undefined,
      }}
    >
      <div className="p-5">
        {embed.authorName && (
          <div className="mb-3 flex items-center gap-2">
            {embed.authorIconUrl && (
              <img
                src={
                  embed.authorIconUrl
                }
                alt=""
                className="h-6 w-6 rounded-full object-cover"
              />
            )}

            <p className="text-xs font-bold text-white/60">
              {embed.authorName}
            </p>
          </div>
        )}

        {embed.title && (
          <h4 className="text-base font-black text-white">
            {embed.url ? (
              <a
                href={
                  embed.url
                }
                target="_blank"
                rel="noreferrer"
                className="hover:text-primary"
              >
                {embed.title}
              </a>
            ) : (
              embed.title
            )}
          </h4>
        )}

        {embed.description && (
          <div className="mt-3">
            <DiscordContent
              content={
                embed.description
              }
            />
          </div>
        )}

        {embed.fields &&
          embed.fields.length >
            0 && (
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              {embed.fields.map(
                (
                  field,
                  index,
                ) => (
                  <div
                    key={index}
                    className={`rounded-xl border border-white/[0.07] bg-white/[0.025] p-3 ${
                      field.inline
                        ? ""
                        : "md:col-span-2"
                    }`}
                  >
                    <p className="text-xs font-black text-white">
                      {field.name}
                    </p>

                    <div className="mt-2 text-xs leading-5 text-white/45">
                      <DiscordContent
                        content={
                          field.value
                        }
                      />
                    </div>
                  </div>
                ),
              )}
            </div>
          )}

        {embed.thumbnailUrl && (
          <img
            src={
              embed.thumbnailUrl
            }
            alt=""
            className="mt-4 max-h-48 rounded-xl object-contain"
          />
        )}

        {embed.imageUrl && (
          <img
            src={
              embed.imageUrl
            }
            alt=""
            className="mt-4 max-h-[620px] w-full rounded-xl object-contain"
          />
        )}

        {embed.footerText && (
          <div className="mt-4 flex items-center gap-2 text-[9px] text-white/25">
            {embed.footerIconUrl && (
              <img
                src={
                  embed.footerIconUrl
                }
                alt=""
                className="h-5 w-5 rounded-full"
              />
            )}

            <span>
              {embed.footerText}
            </span>

            {embed.timestamp && (
              <>
                <span>•</span>

                <span>
                  {formatDateTime(
                    embed.timestamp,
                  )}
                </span>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * ============================================================
 * ANEXOS
 * ============================================================
 */

function AttachmentViewer({
  attachment,
}: {
  attachment: Attachment;
}) {
  const type =
    getAttachmentType(
      attachment,
    );

  const url =
    getAttachmentUrl(
      attachment,
    );

  return (
    <article className="overflow-hidden rounded-[1.4rem] border border-white/10 bg-black/25">
      {type ===
        "IMAGE" && (
        <a
          href={
            attachment.url
          }
          target="_blank"
          rel="noreferrer"
          className="group relative block"
        >
          <img
            src={url}
            alt={
              attachment.filename
            }
            className="max-h-[720px] w-full bg-black/30 object-contain"
          />

          <span className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black/45 text-white/50 opacity-0 backdrop-blur-xl transition group-hover:opacity-100">
            <Maximize2 className="h-4 w-4" />
          </span>
        </a>
      )}

      {type ===
        "VIDEO" && (
        <div className="relative">
          <video
            src={url}
            controls
            playsInline
            preload="metadata"
            className="aspect-video max-h-[720px] w-full bg-black object-contain"
          />

          <span className="pointer-events-none absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/45 px-3 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-white/50 backdrop-blur-xl">
            <Play className="h-3 w-3" />

            Vídeo
          </span>
        </div>
      )}

      {type ===
        "PDF" && (
        <div>
          <iframe
            src={url}
            title={
              attachment.filename
            }
            className="h-[75vh] min-h-[620px] w-full bg-white"
          />
        </div>
      )}

      {type ===
        "FILE" && (
        <div className="flex min-h-48 items-center justify-center bg-black/30 p-8">
          <div className="text-center">
            <File className="mx-auto h-12 w-12 text-primary" />

            <p className="mt-4 break-all font-black text-white">
              {attachment.filename}
            </p>

            <p className="mt-2 text-xs text-white/30">
              Este tipo de ficheiro não possui pré-visualização integrada.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {type ===
              "IMAGE" && (
              <ImageIcon className="h-4 w-4 shrink-0 text-blue-300" />
            )}

            {type ===
              "VIDEO" && (
              <Video className="h-4 w-4 shrink-0 text-violet-300" />
            )}

            {type ===
              "PDF" && (
              <FileText className="h-4 w-4 shrink-0 text-red-300" />
            )}

            {type ===
              "FILE" && (
              <File className="h-4 w-4 shrink-0 text-white/35" />
            )}

            <p className="truncate text-sm font-bold text-white">
              {attachment.filename}
            </p>
          </div>

          <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.12em] text-white/25">
            {attachment.contentType ||
              type}{" "}
            ·{" "}
            {formatBytes(
              attachment.size,
            )}
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          <a
            href={
              attachment.url
            }
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-[9px] font-black uppercase tracking-[0.13em] text-white/55 transition hover:border-white/20 hover:text-white"
          >
            <ExternalLink className="h-4 w-4" />

            Abrir
          </a>

          <a
            href={
              attachment.url
            }
            download={
              attachment.filename
            }
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-4 text-[9px] font-black uppercase tracking-[0.13em] text-primary transition hover:bg-primary/15"
          >
            <Download className="h-4 w-4" />

            Guardar
          </a>
        </div>
      </div>
    </article>
  );
}

/**
 * ============================================================
 * AVATAR
 * ============================================================
 */

function UserAvatar({
  name,
  avatarUrl,
  isBot,
}: {
  name: string;
  avatarUrl?: string | null;
  isBot?: boolean;
}) {
  if (avatarUrl) {
    return (
      <div className="relative shrink-0">
        <img
          src={avatarUrl}
          alt={name}
          className="h-11 w-11 rounded-2xl border border-white/10 object-cover"
        />

        {isBot && (
          <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-md border-2 border-[#050a08] bg-blue-500 text-white">
            <Bot className="h-2.5 w-2.5" />
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-xs font-black text-primary">
      {getInitials(name)}
    </div>
  );
}

/**
 * ============================================================
 * COMPONENTES AUXILIARES
 * ============================================================
 */

function Badge({
  category,
}: {
  category: string;
}) {
  const meta =
    CATEGORY_META[
      category
    ] ||
    CATEGORY_META.OUTROS;

  const Icon =
    meta.icon;

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[8px] font-black uppercase tracking-[0.14em] backdrop-blur-xl ${meta.color}`}
    >
      <Icon className="h-3 w-3" />

      {meta.label}
    </span>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  tone:
    | "green"
    | "gold"
    | "blue"
    | "cyan"
    | "violet";
}) {
  const styles = {
    green:
      "border-emerald-400/20 bg-emerald-500/10 text-emerald-300",

    gold:
      "border-yellow-400/20 bg-yellow-500/10 text-yellow-300",

    blue:
      "border-blue-400/20 bg-blue-500/10 text-blue-300",

    cyan:
      "border-cyan-400/20 bg-cyan-500/10 text-cyan-300",

    violet:
      "border-violet-400/20 bg-violet-500/10 text-violet-300",
  };

  return (
    <article className="rounded-[1.7rem] border border-white/10 bg-[#050b09]/88 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/30">
            {label}
          </p>

          <p className="mt-4 text-4xl font-black text-white">
            {value}
          </p>
        </div>

        <span
          className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${styles[tone]}`}
        >
          {icon}
        </span>
      </div>
    </article>
  );
}

function LoadingState() {
  return (
    <section className="flex min-h-[340px] items-center justify-center rounded-[2rem] border border-white/10 bg-[#050b09]/75">
      <div className="text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />

        <p className="mt-4 font-black text-white">
          A carregar a biblioteca
        </p>

        <p className="mt-2 text-sm text-white/30">
          A preparar mensagens e anexos.
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
    <section className="rounded-[2rem] border border-red-400/20 bg-red-500/[0.06] p-7">
      <p className="font-black text-white">
        Não foi possível carregar os documentos
      </p>

      <p className="mt-2 text-sm text-red-100/55">
        {message}
      </p>

      <button
        type="button"
        onClick={onRetry}
        className="mt-5 rounded-xl border border-red-400/20 bg-red-500/10 px-5 py-3 text-[9px] font-black uppercase tracking-[0.13em] text-red-300"
      >
        Tentar novamente
      </button>
    </section>
  );
}

function EmptyState() {
  return (
    <section className="flex min-h-[340px] items-center justify-center rounded-[2rem] border border-dashed border-white/10 bg-[#050b09]/75 p-8 text-center">
      <div>
        <FileText className="mx-auto h-12 w-12 text-white/15" />

        <h2 className="mt-5 text-xl font-black text-white">
          Nenhum documento encontrado
        </h2>

        <p className="mt-2 text-sm text-white/35">
          Sincroniza o canal Discord ou altera os filtros.
        </p>
      </div>
    </section>
  );
}