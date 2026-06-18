import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  AlertTriangle,
  Award,
  Bell,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  Clock3,
  Command,
  ExternalLink,
  Eye,
  FileText,
  Flame,
  GraduationCap,
  Hash,
  Heart,
  HelpCircle,
  Loader2,
  Lock,
  MessageCircle,
  MoreHorizontal,
  Pin,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Send,
  Shield,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  ThumbsUp,
  UserRound,
  UsersRound,
  X,
  Zap,
} from "lucide-react";

import {
  useData,
} from "../context/DataContext";

type FeedTab =
  | "RECENT"
  | "POPULAR"
  | "OFFICIAL"
  | "UNANSWERED"
  | "BOOKMARKED"
  | "MENTIONS"
  | "MINE";

type Category =
  | "ALL"
  | "GENERAL"
  | "OPERATIONAL"
  | "TRAINING"
  | "PATROL"
  | "SUGGESTIONS"
  | "PROCEDURES"
  | "ACHIEVEMENTS"
  | "COMMAND";

const API_BASE =
  import.meta.env.VITE_API_URL?.replace(
    /\/$/,
    "",
  ) || "";

const CATEGORIES = [
  {
    key: "GENERAL",
    label: "Informações gerais",
    description:
      "Temas institucionais e assuntos de interesse comum.",
    icon: FileText,
    tone:
      "text-emerald-300 bg-emerald-500/10 border-emerald-400/20",
  },
  {
    key: "OPERATIONAL",
    label: "Operacional",
    description:
      "Operações, ocorrências e coordenação de serviço.",
    icon: Shield,
    tone:
      "text-blue-300 bg-blue-500/10 border-blue-400/20",
  },
  {
    key: "TRAINING",
    label: "Formação",
    description:
      "Escola da Guarda, cursos e partilha de conhecimento.",
    icon: GraduationCap,
    tone:
      "text-violet-300 bg-violet-500/10 border-violet-400/20",
  },
  {
    key: "PATROL",
    label: "Patrulhamento",
    description:
      "Procedimentos, experiências e organização de patrulhas.",
    icon: Radio,
    tone:
      "text-cyan-300 bg-cyan-500/10 border-cyan-400/20",
  },
  {
    key: "SUGGESTIONS",
    label: "Sugestões",
    description:
      "Ideias para melhorar a instituição e a Central.",
    icon: Sparkles,
    tone:
      "text-amber-300 bg-amber-500/10 border-amber-400/20",
  },
  {
    key: "PROCEDURES",
    label: "Procedimentos",
    description:
      "Regulamentos, normas e esclarecimentos operacionais.",
    icon: ShieldCheck,
    tone:
      "text-orange-300 bg-orange-500/10 border-orange-400/20",
  },
  {
    key: "ACHIEVEMENTS",
    label: "Conquistas",
    description:
      "Promoções, medalhas, eventos e destaques.",
    icon: Award,
    tone:
      "text-yellow-300 bg-yellow-500/10 border-yellow-400/20",
  },
  {
    key: "COMMAND",
    label: "Comando",
    description:
      "Discussões reservadas e orientações superiores.",
    icon: Command,
    tone:
      "text-fuchsia-300 bg-fuchsia-500/10 border-fuchsia-400/20",
  },
] as const;

const REACTIONS = [
  {
    key: "LIKE",
    label: "Gosto",
    icon: ThumbsUp,
  },
  {
    key: "SHIELD",
    label: "Útil",
    icon: Shield,
  },
  {
    key: "CHECK",
    label: "Concordo",
    icon: CheckCircle2,
  },
  {
    key: "FIRE",
    label: "Destaque",
    icon: Flame,
  },
] as const;

async function api(
  path: string,
  options: RequestInit = {},
) {
  const response = await fetch(
    `${API_BASE}${path}`,
    {
      credentials: "include",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(options.body
          ? {
              "Content-Type":
                "application/json",
            }
          : {}),
      },
      ...options,
    },
  );

  const raw = await response.text();
  let payload: any = null;

  if (raw.trim()) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    throw new Error(
      payload?.error ||
        `O pedido falhou (${response.status}).`,
    );
  }

  return payload;
}

function guardId(guard: any) {
  return String(
    guard?.discordId ||
      guard?.id ||
      guard?._id ||
      "",
  );
}

function guardName(guard: any) {
  return (
    guard?.nome ||
    guard?.warName ||
    guard?.displayName ||
    guard?.username ||
    "Militar"
  );
}

function guardRank(guard: any) {
  return (
    guard?.posto ||
    guard?.rank ||
    guard?.hierarchyGroupLabel ||
    "Guarda"
  );
}

function guardAvatar(guard: any) {
  return (
    guard?.avatar ||
    guard?.avatarUrl ||
    null
  );
}

function relativeDate(value: string) {
  const date = new Date(value);
  const seconds = Math.floor(
    (Date.now() - date.getTime()) /
      1000,
  );

  if (seconds < 60) {
    return "agora";
  }

  if (seconds < 3600) {
    return `há ${Math.floor(
      seconds / 60,
    )} min`;
  }

  if (seconds < 86400) {
    return `há ${Math.floor(
      seconds / 3600,
    )} h`;
  }

  return date.toLocaleDateString(
    "pt-PT",
    {
      day: "2-digit",
      month: "short",
      year:
        date.getFullYear() !==
        new Date().getFullYear()
          ? "numeric"
          : undefined,
    },
  );
}

function categoryInfo(
  key: string,
) {
  return (
    CATEGORIES.find(
      (item) =>
        item.key === key,
    ) || CATEGORIES[0]
  );
}

function extractMentionIds(
  content: string,
) {
  return [
    ...new Set(
      [
        ...String(
          content || "",
        ).matchAll(
          /@\[([^\]]+)\]\((\d{15,25})\)/g,
        ),
      ].map(
        (match) => match[2],
      ),
    ),
  ];
}

function displayMentionText(
  content: string,
) {
  return String(
    content || "",
  ).replace(
    /@\[([^\]]+)\]\((\d{15,25})\)/g,
    "@$1",
  );
}

export default function Forum() {
  const { guardas } =
    useData() as any;

  const [items, setItems] =
    useState<any[]>([]);

  const [access, setAccess] =
    useState<any>({
      canModerate: false,
    });

  const [categoryStats, setCategoryStats] =
    useState<any[]>([]);

  const [total, setTotal] =
    useState(0);

  const [unread, setUnread] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [tab, setTab] =
    useState<FeedTab>("RECENT");

  const [category, setCategory] =
    useState<Category>("ALL");

  const [search, setSearch] =
    useState("");

  const [debouncedSearch, setDebouncedSearch] =
    useState("");

  const [composerOpen, setComposerOpen] =
    useState(false);

  const [selectedPost, setSelectedPost] =
    useState<any>(null);

  const [notificationsOpen, setNotificationsOpen] =
    useState(false);

  const [notifications, setNotifications] =
    useState<any[]>([]);

  const [busy, setBusy] =
    useState("");

  useEffect(() => {
    const timeout =
      window.setTimeout(
        () =>
          setDebouncedSearch(
            search,
          ),
        300,
      );

    return () =>
      window.clearTimeout(
        timeout,
      );
  }, [search]);

  async function load(
    silent = false,
  ) {
    if (!silent) {
      setLoading(true);
    }

    setError("");

    try {
      const query =
        new URLSearchParams({
          tab,
          category,
          search:
            debouncedSearch,
          limit: "30",
        });

      const [
        feed,
        accessPayload,
      ] = await Promise.all([
        api(
          `/api/forum/feed?${query}`,
        ),
        api(
          "/api/forum/access",
        ),
      ]);

      setItems(
        feed?.items || [],
      );

      setTotal(
        feed?.total || 0,
      );

      setCategoryStats(
        feed?.categoryStats ||
          [],
      );

      setUnread(
        feed?.unreadNotifications ||
          0,
      );

      setAccess(
        accessPayload || {},
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Não foi possível carregar o Fórum.",
      );
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    void load();
  }, [
    tab,
    category,
    debouncedSearch,
  ]);

  useEffect(() => {
    const interval =
      window.setInterval(() => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          void load(true);
        }
      }, 20_000);

    return () =>
      window.clearInterval(
        interval,
      );
  }, [
    tab,
    category,
    debouncedSearch,
  ]);

  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search,
      );

    const postId =
      params.get("post");

    if (postId) {
      void openPost(postId);
    }
  }, []);

  async function openPost(
    id: string,
  ) {
    setBusy(`open-${id}`);

    try {
      const payload =
        await api(
          `/api/forum/posts/${id}`,
        );

      setSelectedPost(
        payload?.item,
      );
    } catch (openError) {
      setError(
        openError instanceof Error
          ? openError.message
          : "Não foi possível abrir a publicação.",
      );
    } finally {
      setBusy("");
    }
  }

  function updateItem(
    item: any,
  ) {
    setItems((current) =>
      current.map((post) =>
        post._id === item._id
          ? item
          : post,
      ),
    );

    if (
      selectedPost?._id ===
      item._id
    ) {
      setSelectedPost(item);
    }
  }

  async function react(
    post: any,
    key: string,
  ) {
    setBusy(
      `reaction-${post._id}-${key}`,
    );

    try {
      const payload =
        await api(
          `/api/forum/posts/${post._id}/reactions`,
          {
            method: "POST",
            body:
              JSON.stringify({
                key,
              }),
          },
        );

      updateItem(
        payload.item,
      );
    } catch (reactionError) {
      setError(
        reactionError instanceof Error
          ? reactionError.message
          : "Não foi possível reagir.",
      );
    } finally {
      setBusy("");
    }
  }

  async function bookmark(
    post: any,
  ) {
    try {
      const payload =
        await api(
          `/api/forum/posts/${post._id}/bookmark`,
          {
            method: "POST",
          },
        );

      const updated = {
        ...post,
        bookmarked:
          payload.bookmarked,
      };

      updateItem(updated);
    } catch (bookmarkError) {
      setError(
        bookmarkError instanceof Error
          ? bookmarkError.message
          : "Não foi possível guardar.",
      );
    }
  }

  async function moderate(
    post: any,
    action: string,
  ) {
    try {
      const payload =
        await api(
          `/api/forum/posts/${post._id}/moderate`,
          {
            method: "PATCH",
            body:
              JSON.stringify({
                action,
              }),
          },
        );

      updateItem(
        payload.item,
      );

      setSuccess(
        "Ação de moderação concluída.",
      );
    } catch (moderationError) {
      setError(
        moderationError instanceof Error
          ? moderationError.message
          : "Não foi possível moderar.",
      );
    }
  }

  async function loadNotifications() {
    try {
      const payload =
        await api(
          "/api/forum/notifications",
        );

      setNotifications(
        payload?.items || [],
      );

      setUnread(
        payload?.unread || 0,
      );

      setNotificationsOpen(
        true,
      );
    } catch (notificationError) {
      setError(
        notificationError instanceof Error
          ? notificationError.message
          : "Não foi possível carregar as notificações.",
      );
    }
  }

  async function readNotifications() {
    await api(
      "/api/forum/notifications/read",
      {
        method: "POST",
        body: JSON.stringify({
          ids: [],
        }),
      },
    );

    setUnread(0);

    setNotifications(
      (current) =>
        current.map((item) => ({
          ...item,
          readAt:
            item.readAt ||
            new Date().toISOString(),
        })),
    );
  }

  const statsByCategory =
    useMemo(
      () =>
        Object.fromEntries(
          categoryStats.map(
            (item) => [
              item._id,
              item,
            ],
          ),
        ),
      [categoryStats],
    );

  const featured =
    items.filter(
      (item) =>
        item.isPinned ||
        item.isHighlighted ||
        item.isOfficial,
    );

  return (
    <div className="space-y-6 pb-20">
      <section className="relative overflow-hidden rounded-[2.8rem] border border-primary/20 bg-[#04110c]/95 p-7 md:p-9">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(34,197,94,0.20),transparent_32%),radial-gradient(circle_at_88%_20%,rgba(59,130,246,0.13),transparent_34%),linear-gradient(115deg,transparent_46%,rgba(255,255,255,0.025)_46%,rgba(255,255,255,0.025)_54%,transparent_54%)]" />
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full border border-primary/10" />
        <div className="absolute -right-5 -top-5 h-48 w-48 rounded-full border border-primary/10" />

        <div className="relative flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.18em] text-primary">
              <CircleDot className="h-3.5 w-3.5" />
              Rede interna operacional
            </div>

            <h1 className="mt-5 text-4xl font-black tracking-[-0.04em] text-white md:text-6xl">
              Fórum
              <span className="block bg-gradient-to-r from-primary via-emerald-300 to-blue-300 bg-clip-text text-transparent">
                Interno da Guarda
              </span>
            </h1>

            <p className="mt-5 max-w-3xl text-sm leading-7 text-white/45">
              Discussões operacionais, regulamentos, formação, ideias e
              decisões institucionais com menções diretas a guardas e unidades.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                void load()
              }
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-black/25 px-5 py-4 text-[8px] font-black uppercase tracking-[0.1em] text-white/45 transition hover:text-white"
            >
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </button>

            <button
              type="button"
              onClick={() =>
                void loadNotifications()
              }
              className="relative inline-flex h-13 w-13 items-center justify-center rounded-2xl border border-white/10 bg-black/25 text-white/45 transition hover:text-white"
            >
              <Bell className="h-5 w-5" />

              {unread > 0 && (
                <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-[#04110c] bg-red-500 px-1.5 text-[8px] font-black text-white">
                  {unread > 99
                    ? "99+"
                    : unread}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() =>
                setComposerOpen(
                  true,
                )
              }
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-emerald-400 px-6 py-4 text-[9px] font-black uppercase tracking-[0.11em] text-[#02140c] shadow-[0_0_35px_rgba(34,197,94,0.18)] transition hover:-translate-y-0.5"
            >
              <Plus className="h-4 w-4" />
              Criar publicação
            </button>
          </div>
        </div>
      </section>

      {error && (
        <Feedback
          tone="error"
          message={error}
          onClose={() =>
            setError("")
          }
        />
      )}

      {success && (
        <Feedback
          tone="success"
          message={success}
          onClose={() =>
            setSuccess("")
          }
        />
      )}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <TopMetric
          label="Publicações"
          value={total}
          icon={FileText}
          tone="green"
        />

        <TopMetric
          label="Em destaque"
          value={featured.length}
          icon={Star}
          tone="amber"
        />

        <TopMetric
          label="Menções novas"
          value={unread}
          icon={Bell}
          tone="red"
        />

        <TopMetric
          label="Categorias ativas"
          value={
            categoryStats.length
          }
          icon={Hash}
          tone="blue"
        />
      </section>

      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[270px_minmax(0,1fr)_310px]">
        <aside className="space-y-4 2xl:sticky 2xl:top-5 2xl:self-start">
          <section className="rounded-[2rem] border border-white/10 bg-[#06100c]/92 p-4">
            <p className="px-2 text-[8px] font-black uppercase tracking-[0.15em] text-primary">
              Categorias
            </p>

            <button
              type="button"
              onClick={() =>
                setCategory("ALL")
              }
              className={`mt-3 flex w-full items-center justify-between rounded-2xl border p-3 text-left transition ${
                category === "ALL"
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-transparent text-white/40 hover:bg-white/[0.035] hover:text-white/65"
              }`}
            >
              <span className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-current/15 bg-current/5">
                  <Zap className="h-4 w-4" />
                </span>

                <span className="text-xs font-black">
                  Tudo
                </span>
              </span>

              <span className="text-[8px] font-black">
                {total}
              </span>
            </button>

            <div className="mt-2 space-y-1">
              {CATEGORIES.map(
                ({
                  key,
                  label,
                  icon: Icon,
                  tone,
                }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() =>
                      setCategory(
                        key as Category,
                      )
                    }
                    className={`flex w-full items-center justify-between rounded-2xl border p-3 text-left transition ${
                      category === key
                        ? tone
                        : "border-transparent text-white/35 hover:bg-white/[0.035] hover:text-white/65"
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-current/15 bg-current/5">
                        <Icon className="h-4 w-4" />
                      </span>

                      <span className="truncate text-xs font-black">
                        {label}
                      </span>
                    </span>

                    <span className="text-[8px] font-black">
                      {statsByCategory[
                        key
                      ]?.posts || 0}
                    </span>
                  </button>
                ),
              )}
            </div>
          </section>

          <section className="rounded-[1.7rem] border border-blue-400/15 bg-blue-500/[0.04] p-5">
            <div className="flex items-start gap-3">
              <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-blue-300" />

              <div>
                <p className="text-sm font-black text-white">
                  Menções inteligentes
                </p>

                <p className="mt-2 text-xs leading-6 text-white/35">
                  Escreve{" "}
                  <strong className="text-blue-300">
                    @
                  </strong>{" "}
                  para pesquisar e mencionar qualquer guarda no título, publicação ou comentário.
                </p>
              </div>
            </div>
          </section>
        </aside>

        <main className="min-w-0 space-y-4">
          <section className="rounded-[1.8rem] border border-white/10 bg-[#06100c]/92 p-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="flex h-12 min-w-0 flex-1 items-center rounded-2xl border border-white/10 bg-black/25 px-4 focus-within:border-primary/30">
                <Search className="mr-3 h-4 w-4 text-primary" />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value,
                    )
                  }
                  placeholder="Pesquisar tópicos, regulamentos, autores..."
                  className="h-full min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/20"
                />

                {search && (
                  <button
                    type="button"
                    onClick={() =>
                      setSearch("")
                    }
                    className="text-white/25 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="flex gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-black/20 p-1.5">
                {[
                  ["RECENT", "Recentes"],
                  ["POPULAR", "Populares"],
                  ["OFFICIAL", "Oficiais"],
                  ["UNANSWERED", "Sem resposta"],
                  ["MENTIONS", "Menções"],
                  ["BOOKMARKED", "Guardados"],
                  ["MINE", "Meus"],
                ].map(
                  ([
                    key,
                    label,
                  ]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() =>
                        setTab(
                          key as FeedTab,
                        )
                      }
                      className={`shrink-0 rounded-xl px-3 py-2.5 text-[7px] font-black uppercase tracking-[0.08em] transition ${
                        tab === key
                          ? "bg-primary/12 text-primary"
                          : "text-white/30 hover:bg-white/[0.04] hover:text-white/60"
                      }`}
                    >
                      {label}
                    </button>
                  ),
                )}
              </div>
            </div>
          </section>

          {loading ? (
            <LoadingState />
          ) : items.length ? (
            items.map((post) => (
              <PostCard
                key={post._id}
                post={post}
                canModerate={
                  access.canModerate
                }
                busy={busy}
                onOpen={() =>
                  void openPost(
                    post._id,
                  )
                }
                onReact={(key) =>
                  void react(
                    post,
                    key,
                  )
                }
                onBookmark={() =>
                  void bookmark(post)
                }
                onModerate={(action) =>
                  void moderate(
                    post,
                    action,
                  )
                }
              />
            ))
          ) : (
            <EmptyState
              onCreate={() =>
                setComposerOpen(
                  true,
                )
              }
            />
          )}
        </main>

        <aside className="space-y-4 2xl:sticky 2xl:top-5 2xl:self-start">
          <section className="rounded-[2rem] border border-white/10 bg-[#06100c]/92 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.15em] text-primary">
                  Em destaque
                </p>

                <h2 className="mt-2 text-xl font-black text-white">
                  Tópicos importantes
                </h2>
              </div>

              <Star className="h-5 w-5 text-amber-300" />
            </div>

            <div className="mt-5 space-y-2">
              {featured
                .slice(0, 5)
                .map((post) => (
                  <button
                    key={post._id}
                    type="button"
                    onClick={() =>
                      void openPost(
                        post._id,
                      )
                    }
                    className="w-full rounded-2xl border border-white/8 bg-black/20 p-3 text-left transition hover:border-primary/20"
                  >
                    <div className="flex items-center gap-2">
                      {post.isOfficial && (
                        <ShieldCheck className="h-3.5 w-3.5 text-yellow-300" />
                      )}

                      {post.isPinned && (
                        <Pin className="h-3.5 w-3.5 text-primary" />
                      )}

                      <p className="line-clamp-2 text-xs font-black leading-5 text-white/70">
                        {post.title}
                      </p>
                    </div>

                    <p className="mt-2 text-[8px] text-white/20">
                      {post.authorName} ·{" "}
                      {post.commentCount} respostas
                    </p>
                  </button>
                ))}

              {!featured.length && (
                <p className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-xs text-white/25">
                  Ainda não existem tópicos destacados.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-[#06100c]/92 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.15em] text-primary">
                  Comunidade
                </p>

                <h2 className="mt-2 text-xl font-black text-white">
                  Atividade interna
                </h2>
              </div>

              <UsersRound className="h-5 w-5 text-primary" />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <SmallStat
                label="Tópicos"
                value={total}
              />

              <SmallStat
                label="Categorias"
                value={
                  categoryStats.length
                }
              />

              <SmallStat
                label="Oficiais"
                value={
                  items.filter(
                    (post) =>
                      post.isOfficial,
                  ).length
                }
              />

              <SmallStat
                label="Resolvidos"
                value={
                  items.filter(
                    (post) =>
                      post.status ===
                      "RESOLVED",
                  ).length
                }
              />
            </div>
          </section>
        </aside>
      </div>

      {composerOpen && (
        <Composer
          guards={
            guardas || []
          }
          canModerate={
            access.canModerate
          }
          onClose={() =>
            setComposerOpen(
              false,
            )
          }
          onCreated={(item) => {
            setItems(
              (current) => [
                item,
                ...current,
              ],
            );

            setTotal(
              (current) =>
                current + 1,
            );

            setComposerOpen(
              false,
            );

            setSuccess(
              "Publicação criada com sucesso.",
            );
          }}
        />
      )}

      {selectedPost && (
        <PostDetail
          post={selectedPost}
          guards={
            guardas || []
          }
          canModerate={
            access.canModerate
          }
          busy={busy}
          onClose={() =>
            setSelectedPost(
              null,
            )
          }
          onUpdate={updateItem}
          onReact={(key) =>
            void react(
              selectedPost,
              key,
            )
          }
          onBookmark={() =>
            void bookmark(
              selectedPost,
            )
          }
          onModerate={(action) =>
            void moderate(
              selectedPost,
              action,
            )
          }
          onError={setError}
        />
      )}

      {notificationsOpen && (
        <NotificationsPanel
          items={notifications}
          onClose={() =>
            setNotificationsOpen(
              false,
            )
          }
          onRead={() =>
            void readNotifications()
          }
          onOpenPost={(
            postId,
          ) => {
            setNotificationsOpen(
              false,
            );

            void openPost(
              postId,
            );
          }}
        />
      )}
    </div>
  );
}

function PostCard({
  post,
  canModerate,
  busy,
  onOpen,
  onReact,
  onBookmark,
  onModerate,
}: any) {
  const category =
    categoryInfo(
      post.category,
    );

  const Icon =
    category.icon;

  return (
    <article className={`group overflow-hidden rounded-[2rem] border bg-[#06100c]/94 shadow-[0_24px_80px_rgba(0,0,0,0.18)] transition hover:-translate-y-0.5 ${
      post.isOfficial
        ? "border-yellow-400/25"
        : post.isPinned
          ? "border-primary/25"
          : "border-white/10"
    }`}>
      {(post.isOfficial ||
        post.isPinned ||
        post.status ===
          "RESOLVED") && (
        <div className="flex flex-wrap items-center gap-2 border-b border-white/8 bg-white/[0.025] px-5 py-2.5">
          {post.isOfficial && (
            <Badge
              icon={ShieldCheck}
              label="Publicação oficial"
              tone="yellow"
            />
          )}

          {post.isPinned && (
            <Badge
              icon={Pin}
              label="Fixada"
              tone="green"
            />
          )}

          {post.status ===
            "RESOLVED" && (
            <Badge
              icon={CheckCircle2}
              label="Resolvida"
              tone="blue"
            />
          )}

          {post.status ===
            "LOCKED" && (
            <Badge
              icon={Lock}
              label="Fechada"
              tone="red"
            />
          )}
        </div>
      )}

      <div className="p-5 md:p-6">
        <div className="flex items-start gap-4">
          <Avatar
            src={
              post.authorAvatarUrl
            }
            name={
              post.authorName
            }
          />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className="font-black text-white">
                {post.authorName}
              </p>

              <span className="text-white/15">
                •
              </span>

              <p className="text-[8px] font-black uppercase tracking-[0.08em] text-primary">
                {post.authorRank}
              </p>

              <span className="text-white/15">
                •
              </span>

              <p className="text-[8px] text-white/25">
                {post.authorUnit}
              </p>

              <span className="text-white/15">
                •
              </span>

              <p className="text-[8px] text-white/25">
                {relativeDate(
                  post.createdAt,
                )}
              </p>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[7px] font-black uppercase tracking-[0.06em] ${category.tone}`}>
                <Icon className="h-3 w-3" />
                {category.label}
              </span>

              {(post.tags || []).map(
                (tag: string) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/8 bg-black/20 px-2.5 py-1 text-[7px] font-black text-white/30"
                  >
                    #{tag}
                  </span>
                ),
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={
                onBookmark
              }
              className={`flex h-10 w-10 items-center justify-center rounded-xl border transition ${
                post.bookmarked
                  ? "border-primary/25 bg-primary/10 text-primary"
                  : "border-white/8 bg-black/20 text-white/25 hover:text-white"
              }`}
            >
              {post.bookmarked ? (
                <BookmarkCheck className="h-4 w-4" />
              ) : (
                <Bookmark className="h-4 w-4" />
              )}
            </button>

            {canModerate && (
              <ModerationMenu
                post={post}
                onAction={
                  onModerate
                }
              />
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onOpen}
          className="mt-5 block w-full text-left"
        >
          <h2 className="text-xl font-black leading-tight text-white transition group-hover:text-primary md:text-2xl">
            {post.title}
          </h2>

          <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-sm leading-7 text-white/45">
            {displayMentionText(
              post.content,
            )}
          </p>
        </button>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-white/8 pt-4">
          <div className="flex flex-wrap gap-2">
            {REACTIONS.map(
              ({
                key,
                label,
                icon: ReactionIcon,
              }) => (
                <button
                  key={key}
                  type="button"
                  disabled={
                    busy ===
                    `reaction-${post._id}-${key}`
                  }
                  onClick={() =>
                    onReact(key)
                  }
                  title={label}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[8px] font-black transition ${
                    post.reacted?.[
                      key
                    ]
                      ? "border-primary/25 bg-primary/10 text-primary"
                      : "border-white/8 bg-black/20 text-white/30 hover:text-white/60"
                  }`}
                >
                  <ReactionIcon className="h-3.5 w-3.5" />

                  {post
                    .reactionCounts?.[
                    key
                  ] || 0}
                </button>
              ),
            )}
          </div>

          <button
            type="button"
            onClick={onOpen}
            className="flex items-center gap-4 text-[8px] font-black uppercase tracking-[0.06em] text-white/25 transition hover:text-primary"
          >
            <span className="inline-flex items-center gap-1.5">
              <MessageCircle className="h-4 w-4" />
              {post.commentCount}
            </span>

            <span className="inline-flex items-center gap-1.5">
              <Eye className="h-4 w-4" />
              {post.views || 0}
            </span>

            <span>Abrir tópico</span>
          </button>
        </div>
      </div>
    </article>
  );
}

function Composer({
  guards,
  canModerate,
  onClose,
  onCreated,
}: any) {
  const [title, setTitle] =
    useState("");

  const [content, setContent] =
    useState("");

  const [category, setCategory] =
    useState("GENERAL");

  const [tags, setTags] =
    useState("");

  const [visibility, setVisibility] =
    useState("ALL");

  const [isOfficial, setIsOfficial] =
    useState(false);

  const [isPinned, setIsPinned] =
    useState(false);

  const [publishDiscord, setPublishDiscord] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  async function submit() {
    setSaving(true);
    setError("");

    try {
      const payload =
        await api(
          "/api/forum/posts",
          {
            method: "POST",
            body:
              JSON.stringify({
                title,
                content,
                category,
                tags: tags
                  .split(",")
                  .map(
                    (item) =>
                      item.trim(),
                  )
                  .filter(Boolean),
                visibility,
                mentionUserIds:
                  extractMentionIds(
                    content,
                  ),
                commentsEnabled:
                  true,
                isOfficial:
                  canModerate &&
                  isOfficial,
                isPinned:
                  canModerate &&
                  isPinned,
                publishDiscord,
              }),
          },
        );

      onCreated(
        payload.item,
      );
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Não foi possível publicar.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
      <div className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-[2.3rem] border border-primary/20 bg-[#05100c] shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-white/8 bg-[#05100c]/95 p-6 backdrop-blur-xl">
          <div>
            <p className="text-[8px] font-black uppercase tracking-[0.15em] text-primary">
              Nova discussão
            </p>

            <h2 className="mt-2 text-3xl font-black text-white">
              Criar publicação
            </h2>

            <p className="mt-2 text-sm text-white/35">
              Usa @ para mencionar diretamente um guarda.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 text-white/35 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 p-6 xl:grid-cols-[1fr_300px]">
          <div className="space-y-5">
            {error && (
              <Feedback
                tone="error"
                message={error}
                onClose={() =>
                  setError("")
                }
              />
            )}

            <label className="block">
              <span className="text-[8px] font-black uppercase tracking-[0.12em] text-white/35">
                Título
              </span>

              <input
                value={title}
                onChange={(event) =>
                  setTitle(
                    event.target.value,
                  )
                }
                maxLength={160}
                placeholder="Um título claro e objetivo..."
                className="mt-3 h-14 w-full rounded-2xl border border-white/10 bg-black/25 px-4 text-lg font-black text-white outline-none focus:border-primary/30"
              />

              <p className="mt-2 text-right text-[8px] text-white/20">
                {title.length}/160
              </p>
            </label>

            <MentionEditor
              value={content}
              onChange={setContent}
              guards={guards}
              placeholder="Partilha a informação, escreve @ para mencionar um guarda..."
              minHeight="260px"
            />

            <label className="block">
              <span className="text-[8px] font-black uppercase tracking-[0.12em] text-white/35">
                Etiquetas
              </span>

              <input
                value={tags}
                onChange={(event) =>
                  setTags(
                    event.target.value,
                  )
                }
                placeholder="patrulha, regulamento, formação..."
                className="mt-3 h-12 w-full rounded-2xl border border-white/10 bg-black/25 px-4 text-sm text-white outline-none focus:border-primary/30"
              />

              <p className="mt-2 text-[8px] text-white/20">
                Separa as etiquetas por vírgulas.
              </p>
            </label>
          </div>

          <aside className="space-y-4">
            <OptionSection title="Categoria">
              <select
                value={category}
                onChange={(event) =>
                  setCategory(
                    event.target.value,
                  )
                }
                className="h-12 w-full rounded-xl border border-white/10 bg-black/25 px-3 text-sm text-white outline-none"
              >
                {CATEGORIES.map(
                  (item) => (
                    <option
                      key={
                        item.key
                      }
                      value={
                        item.key
                      }
                    >
                      {
                        item.label
                      }
                    </option>
                  ),
                )}
              </select>
            </OptionSection>

            <OptionSection title="Visibilidade">
              <select
                value={visibility}
                onChange={(event) =>
                  setVisibility(
                    event.target.value,
                  )
                }
                className="h-12 w-full rounded-xl border border-white/10 bg-black/25 px-3 text-sm text-white outline-none"
              >
                <option value="ALL">
                  Toda a Guarda
                </option>

                <option value="UNIT">
                  Apenas a minha unidade
                </option>

                {canModerate && (
                  <option value="COMMAND">
                    Comando
                  </option>
                )}
              </select>
            </OptionSection>

            {canModerate && (
              <OptionSection title="Publicação institucional">
                <Toggle
                  label="Publicação oficial"
                  checked={
                    isOfficial
                  }
                  onChange={
                    setIsOfficial
                  }
                />

                <Toggle
                  label="Fixar no topo"
                  checked={
                    isPinned
                  }
                  onChange={
                    setIsPinned
                  }
                />

                <Toggle
                  label="Enviar para Discord"
                  checked={
                    publishDiscord
                  }
                  onChange={
                    setPublishDiscord
                  }
                />
              </OptionSection>
            )}

            <section className="rounded-2xl border border-primary/15 bg-primary/[0.04] p-4">
              <p className="text-[8px] font-black uppercase tracking-[0.12em] text-primary">
                Pré-visualização
              </p>

              <p className="mt-3 line-clamp-2 font-black text-white">
                {title ||
                  "Título da publicação"}
              </p>

              <p className="mt-2 line-clamp-5 whitespace-pre-wrap text-xs leading-5 text-white/35">
                {displayMentionText(
                  content,
                ) ||
                  "O conteúdo aparecerá aqui."}
              </p>

              <p className="mt-3 text-[8px] text-primary">
                {
                  extractMentionIds(
                    content,
                  ).length
                }{" "}
                menções detetadas
              </p>
            </section>

            <button
              type="button"
              disabled={
                saving ||
                title.trim()
                  .length < 4 ||
                content.trim()
                  .length < 5
              }
              onClick={() =>
                void submit()
              }
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-emerald-400 px-5 py-4 text-[9px] font-black uppercase tracking-[0.12em] text-[#02150d] disabled:cursor-not-allowed disabled:opacity-35"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}

              Publicar tópico
            </button>
          </aside>
        </div>
      </div>
    </div>
  );
}

function PostDetail({
  post,
  guards,
  canModerate,
  busy,
  onClose,
  onUpdate,
  onReact,
  onBookmark,
  onModerate,
  onError,
}: any) {
  const [comment, setComment] =
    useState("");

  const [replyingTo, setReplyingTo] =
    useState<any>(null);

  const [saving, setSaving] =
    useState(false);

  async function submitComment() {
    setSaving(true);

    try {
      const payload =
        await api(
          `/api/forum/posts/${post._id}/comments`,
          {
            method: "POST",
            body:
              JSON.stringify({
                content: comment,
                mentionUserIds:
                  extractMentionIds(
                    comment,
                  ),
                parentCommentId:
                  replyingTo?._id ||
                  null,
              }),
          },
        );

      onUpdate(payload.item);
      setComment("");
      setReplyingTo(null);
    } catch (commentError) {
      onError(
        commentError instanceof Error
          ? commentError.message
          : "Não foi possível comentar.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function markSolution(
    commentId: string,
  ) {
    try {
      const payload =
        await api(
          `/api/forum/posts/${post._id}/comments/${commentId}/solution`,
          {
            method: "POST",
          },
        );

      onUpdate(payload.item);
    } catch (solutionError) {
      onError(
        solutionError instanceof Error
          ? solutionError.message
          : "Não foi possível marcar a solução.",
      );
    }
  }

  const category =
    categoryInfo(
      post.category,
    );

  const CategoryIcon =
    category.icon;

  return (
    <div className="fixed inset-0 z-[240] flex justify-end bg-black/80 backdrop-blur-sm">
      <div className="h-full w-full max-w-5xl overflow-y-auto border-l border-white/10 bg-[#04100b] shadow-2xl">
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-white/8 bg-[#04100b]/95 px-5 py-4 backdrop-blur-xl">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-[8px] font-black uppercase text-white/40 hover:text-white"
          >
            <X className="h-4 w-4" />
            Fechar
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={
                onBookmark
              }
              className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
                post.bookmarked
                  ? "border-primary/25 bg-primary/10 text-primary"
                  : "border-white/10 text-white/30"
              }`}
            >
              {post.bookmarked ? (
                <BookmarkCheck className="h-4 w-4" />
              ) : (
                <Bookmark className="h-4 w-4" />
              )}
            </button>

            {canModerate && (
              <ModerationMenu
                post={post}
                onAction={
                  onModerate
                }
              />
            )}
          </div>
        </div>

        <article className="p-5 md:p-8">
          <div className="flex items-start gap-4">
            <Avatar
              src={
                post.authorAvatarUrl
              }
              name={
                post.authorName
              }
              large
            />

            <div className="min-w-0 flex-1">
              <p className="font-black text-white">
                {post.authorName}
              </p>

              <p className="mt-1 text-[8px] font-black uppercase text-primary">
                {post.authorRank} ·{" "}
                {post.authorUnit}
              </p>

              <p className="mt-1 text-[8px] text-white/25">
                Publicado{" "}
                {relativeDate(
                  post.createdAt,
                )}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[8px] font-black uppercase ${category.tone}`}>
              <CategoryIcon className="h-3.5 w-3.5" />
              {category.label}
            </span>

            {post.isOfficial && (
              <Badge
                icon={ShieldCheck}
                label="Oficial"
                tone="yellow"
              />
            )}

            {post.isPinned && (
              <Badge
                icon={Pin}
                label="Fixada"
                tone="green"
              />
            )}

            {post.status ===
              "RESOLVED" && (
              <Badge
                icon={CheckCircle2}
                label="Resolvida"
                tone="blue"
              />
            )}
          </div>

          <h1 className="mt-5 text-3xl font-black leading-tight text-white md:text-5xl">
            {post.title}
          </h1>

          <MentionContent
            content={
              post.content
            }
          />

          <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-y border-white/8 py-4">
            <div className="flex flex-wrap gap-2">
              {REACTIONS.map(
                ({
                  key,
                  label,
                  icon: ReactionIcon,
                }) => (
                  <button
                    key={key}
                    type="button"
                    disabled={
                      busy ===
                      `reaction-${post._id}-${key}`
                    }
                    onClick={() =>
                      onReact(key)
                    }
                    className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[8px] font-black ${
                      post.reacted?.[
                        key
                      ]
                        ? "border-primary/25 bg-primary/10 text-primary"
                        : "border-white/10 bg-black/20 text-white/35"
                    }`}
                  >
                    <ReactionIcon className="h-4 w-4" />
                    {label}
                    <span>
                      {post
                        .reactionCounts?.[
                        key
                      ] || 0}
                    </span>
                  </button>
                ),
              )}
            </div>

            <div className="flex gap-4 text-[8px] font-black uppercase text-white/25">
              <span className="inline-flex items-center gap-1.5">
                <Eye className="h-4 w-4" />
                {post.views || 0}
              </span>

              <span className="inline-flex items-center gap-1.5">
                <MessageCircle className="h-4 w-4" />
                {post.commentCount || 0}
              </span>
            </div>
          </div>

          <section className="mt-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.14em] text-primary">
                  Discussão
                </p>

                <h2 className="mt-2 text-2xl font-black text-white">
                  Comentários
                </h2>
              </div>

              <MessageCircle className="h-5 w-5 text-primary" />
            </div>

            <div className="mt-5 space-y-3">
              {(post.comments || [])
                .filter(
                  (item: any) =>
                    !item.deletedAt,
                )
                .map(
                  (item: any) => (
                    <CommentCard
                      key={item._id}
                      item={item}
                      isPostAuthor={
                        item.authorId ===
                        post.authorId
                      }
                      onReply={() => {
                        setReplyingTo(
                          item,
                        );

                        setComment(
                          `@[${item.authorName}](${item.authorId}) `,
                        );
                      }}
                      onSolution={() =>
                        void markSolution(
                          item._id,
                        )
                      }
                    />
                  ),
                )}

              {!post.comments?.length && (
                <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center">
                  <MessageCircle className="mx-auto h-8 w-8 text-white/15" />

                  <p className="mt-3 text-sm text-white/30">
                    Ainda ninguém respondeu. Sê o primeiro.
                  </p>
                </div>
              )}
            </div>

            {post.commentsEnabled &&
              post.status !==
                "LOCKED" && (
                <div className="mt-6 rounded-[1.8rem] border border-white/10 bg-[#06150f] p-4">
                  {replyingTo && (
                    <div className="mb-3 flex items-center justify-between rounded-xl border border-blue-400/15 bg-blue-500/[0.04] px-3 py-2">
                      <p className="text-xs text-blue-200">
                        A responder a{" "}
                        <strong>
                          {
                            replyingTo.authorName
                          }
                        </strong>
                      </p>

                      <button
                        type="button"
                        onClick={() => {
                          setReplyingTo(
                            null,
                          );
                          setComment("");
                        }}
                        className="text-blue-300/50 hover:text-blue-300"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  <MentionEditor
                    value={comment}
                    onChange={
                      setComment
                    }
                    guards={guards}
                    placeholder="Escreve um comentário ou usa @ para mencionar..."
                    minHeight="120px"
                  />

                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      disabled={
                        saving ||
                        comment.trim()
                          .length < 2
                      }
                      onClick={() =>
                        void submitComment()
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-[8px] font-black uppercase text-[#02140c] disabled:opacity-35"
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}

                      Publicar resposta
                    </button>
                  </div>
                </div>
              )}
          </section>
        </article>
      </div>
    </div>
  );
}

function MentionEditor({
  value,
  onChange,
  guards,
  placeholder,
  minHeight,
}: any) {
  const textareaRef =
    useRef<HTMLTextAreaElement | null>(
      null,
    );

  const [mentionQuery, setMentionQuery] =
    useState<string | null>(
      null,
    );

  const [mentionStart, setMentionStart] =
    useState<number | null>(
      null,
    );

  function handleChange(
    nextValue: string,
    cursor: number,
  ) {
    onChange(nextValue);

    const before =
      nextValue.slice(
        0,
        cursor,
      );

    const match =
      before.match(
        /(?:^|\s)@([^\s@()]*)$/,
      );

    if (match) {
      setMentionQuery(
        match[1] || "",
      );

      setMentionStart(
        cursor -
          match[1].length -
          1,
      );
    } else {
      setMentionQuery(null);
      setMentionStart(null);
    }
  }

  const suggestions =
    useMemo(() => {
      if (
        mentionQuery === null
      ) {
        return [];
      }

      const query =
        mentionQuery
          .trim()
          .toLowerCase();

      return (
        (guards || []) as any[]
      )
        .filter(
          (guard) =>
            guardId(guard) &&
            guard?.bot !== true,
        )
        .filter((guard) => {
          if (!query) return true;

          return [
            guardName(guard),
            guardRank(guard),
            guardId(guard),
          ]
            .filter(Boolean)
            .some((item) =>
              String(item)
                .toLowerCase()
                .includes(query),
            );
        })
        .slice(0, 8);
    }, [
      guards,
      mentionQuery,
    ]);

  function selectGuard(
    guard: any,
  ) {
    if (
      mentionStart === null
    ) {
      return;
    }

    const textarea =
      textareaRef.current;

    const cursor =
      textarea?.selectionStart ??
      value.length;

    const mention =
      `@[${guardName(guard)}](${guardId(guard)}) `;

    const next =
      value.slice(
        0,
        mentionStart,
      ) +
      mention +
      value.slice(cursor);

    onChange(next);
    setMentionQuery(null);
    setMentionStart(null);

    window.setTimeout(() => {
      const nextCursor =
        mentionStart +
        mention.length;

      textarea?.focus();

      textarea?.setSelectionRange(
        nextCursor,
        nextCursor,
      );
    }, 0);
  }

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) =>
          handleChange(
            event.target.value,
            event.target.selectionStart,
          )
        }
        onClick={(event) => {
          const target =
            event.currentTarget;

          handleChange(
            target.value,
            target.selectionStart,
          );
        }}
        maxLength={12000}
        placeholder={placeholder}
        style={{
          minHeight,
        }}
        className="w-full resize-y rounded-2xl border border-white/10 bg-black/25 p-4 text-sm leading-7 text-white outline-none placeholder:text-white/15 focus:border-primary/30"
      />

      {mentionQuery !==
        null &&
        suggestions.length >
          0 && (
          <div className="absolute left-3 right-3 top-full z-40 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-primary/20 bg-[#07130e] p-2 shadow-2xl">
            <p className="px-3 py-2 text-[7px] font-black uppercase tracking-[0.12em] text-primary">
              Mencionar guarda
            </p>

            {suggestions.map(
              (guard) => (
                <button
                  key={guardId(
                    guard,
                  )}
                  type="button"
                  onMouseDown={(
                    event,
                  ) => {
                    event.preventDefault();

                    selectGuard(
                      guard,
                    );
                  }}
                  className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition hover:bg-primary/8"
                >
                  <Avatar
                    src={guardAvatar(
                      guard,
                    )}
                    name={guardName(
                      guard,
                    )}
                    small
                  />

                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black text-white">
                      {guardName(
                        guard,
                      )}
                    </span>

                    <span className="mt-0.5 block truncate text-[7px] font-black uppercase text-primary">
                      {guardRank(
                        guard,
                      )}
                    </span>
                  </span>
                </button>
              ),
            )}
          </div>
        )}

      <div className="mt-2 flex items-center justify-between">
        <p className="text-[8px] text-white/20">
          Escreve @ para mencionar.
        </p>

        <p className="text-[8px] text-white/20">
          {value.length}/12000
        </p>
      </div>
    </div>
  );
}

function MentionContent({
  content,
}: {
  content: string;
}) {
  const parts =
    String(content || "").split(
      /(@\[[^\]]+\]\(\d{15,25}\))/g,
    );

  return (
    <div className="mt-6 whitespace-pre-wrap text-[15px] leading-8 text-white/60">
      {parts.map(
        (part, index) => {
          const match =
            part.match(
              /^@\[([^\]]+)\]\((\d{15,25})\)$/,
            );

          if (!match) {
            return (
              <Fragment
                key={index}
              >
                {part}
              </Fragment>
            );
          }

          return (
            <a
              key={index}
              href={`/guardas/${match[2]}`}
              className="mx-0.5 rounded-md bg-blue-500/10 px-1.5 py-0.5 font-black text-blue-300 hover:bg-blue-500/20"
            >
              @{match[1]}
            </a>
          );
        },
      )}
    </div>
  );
}

function CommentCard({
  item,
  isPostAuthor,
  onReply,
  onSolution,
}: any) {
  return (
    <article className={`rounded-[1.6rem] border p-4 ${
      item.isSolution
        ? "border-emerald-400/25 bg-emerald-500/[0.045]"
        : "border-white/10 bg-black/20"
    }`}>
      <div className="flex items-start gap-3">
        <Avatar
          src={
            item.authorAvatarUrl
          }
          name={
            item.authorName
          }
          small
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-black text-white">
              {item.authorName}
            </p>

            <span className="text-[7px] font-black uppercase text-primary">
              {item.authorRank}
            </span>

            {isPostAuthor && (
              <Badge
                icon={Star}
                label="Autor"
                tone="green"
              />
            )}

            {item.isSolution && (
              <Badge
                icon={CheckCircle2}
                label="Solução"
                tone="blue"
              />
            )}
          </div>

          <p className="mt-1 text-[8px] text-white/20">
            {relativeDate(
              item.createdAt,
            )}
          </p>

          <MentionContent
            content={
              item.content
            }
          />

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onReply}
              className="rounded-xl border border-white/8 bg-black/20 px-3 py-2 text-[7px] font-black uppercase text-white/30 hover:text-white"
            >
              Responder
            </button>

            {!item.isSolution && (
              <button
                type="button"
                onClick={onSolution}
                className="rounded-xl border border-emerald-400/15 bg-emerald-500/[0.04] px-3 py-2 text-[7px] font-black uppercase text-emerald-300/70 hover:text-emerald-300"
              >
                Marcar solução
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function ModerationMenu({
  post,
  onAction,
}: any) {
  const [open, setOpen] =
    useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() =>
          setOpen(
            (current) =>
              !current,
          )
        }
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/8 bg-black/20 text-white/25 hover:text-white"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-52 rounded-2xl border border-white/10 bg-[#07130e] p-2 shadow-2xl">
          {[
            [
              "PIN",
              post.isPinned
                ? "Desafixar"
                : "Fixar",
            ],
            [
              "OFFICIAL",
              post.isOfficial
                ? "Retirar oficial"
                : "Tornar oficial",
            ],
            [
              "HIGHLIGHT",
              post.isHighlighted
                ? "Retirar destaque"
                : "Destacar",
            ],
            [
              "RESOLVE",
              post.status ===
                "RESOLVED"
                ? "Reabrir"
                : "Marcar resolvido",
            ],
            [
              "LOCK",
              post.status ===
                "LOCKED"
                ? "Desbloquear"
                : "Bloquear",
            ],
            [
              "ARCHIVE",
              "Arquivar",
            ],
          ].map(
            ([
              action,
              label,
            ]) => (
              <button
                key={action}
                type="button"
                onClick={() => {
                  setOpen(false);
                  onAction(action);
                }}
                className="w-full rounded-xl px-3 py-2.5 text-left text-[8px] font-black uppercase text-white/40 hover:bg-white/[0.04] hover:text-white"
              >
                {label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}

function NotificationsPanel({
  items,
  onClose,
  onRead,
  onOpenPost,
}: any) {
  return (
    <div className="fixed inset-0 z-[260] flex justify-end bg-black/70 backdrop-blur-sm">
      <aside className="h-full w-full max-w-md overflow-y-auto border-l border-white/10 bg-[#04100b]">
        <div className="sticky top-0 flex items-center justify-between border-b border-white/8 bg-[#04100b]/95 p-5 backdrop-blur-xl">
          <div>
            <p className="text-[8px] font-black uppercase tracking-[0.14em] text-primary">
              Centro pessoal
            </p>

            <h2 className="mt-2 text-2xl font-black text-white">
              Notificações
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-white/35"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4">
          <button
            type="button"
            onClick={onRead}
            className="mb-4 w-full rounded-xl border border-primary/15 bg-primary/[0.04] px-4 py-3 text-[8px] font-black uppercase text-primary"
          >
            Marcar tudo como lido
          </button>

          <div className="space-y-2">
            {items.map(
              (item: any) => (
                <button
                  key={item._id}
                  type="button"
                  onClick={() =>
                    onOpenPost(
                      item.postId,
                    )
                  }
                  className={`w-full rounded-2xl border p-4 text-left ${
                    item.readAt
                      ? "border-white/8 bg-black/15"
                      : "border-primary/20 bg-primary/[0.045]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Bell className={`mt-0.5 h-4 w-4 ${
                      item.readAt
                        ? "text-white/20"
                        : "text-primary"
                    }`} />

                    <div>
                      <p className="text-sm font-black text-white">
                        {item.title}
                      </p>

                      <p className="mt-2 text-xs leading-5 text-white/35">
                        {item.message}
                      </p>

                      <p className="mt-2 text-[8px] text-white/20">
                        {relativeDate(
                          item.createdAt,
                        )}
                      </p>
                    </div>
                  </div>
                </button>
              ),
            )}

            {!items.length && (
              <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-white/25">
                Sem notificações.
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

function TopMetric({
  label,
  value,
  icon: Icon,
  tone,
}: any) {
  const tones: any = {
    green:
      "border-primary/15 bg-primary/[0.045] text-primary",
    amber:
      "border-amber-400/15 bg-amber-500/[0.045] text-amber-300",
    red:
      "border-red-400/15 bg-red-500/[0.045] text-red-300",
    blue:
      "border-blue-400/15 bg-blue-500/[0.045] text-blue-300",
  };

  return (
    <article className={`rounded-[1.7rem] border p-5 ${tones[tone]}`}>
      <div className="flex items-center justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-current/15 bg-black/15">
          <Icon className="h-5 w-5" />
        </span>

        <ActivityDot />
      </div>

      <p className="mt-5 text-3xl font-black text-white">
        {value}
      </p>

      <p className="mt-1 text-[8px] font-black uppercase tracking-[0.12em] text-white/25">
        {label}
      </p>
    </article>
  );
}

function ActivityDot() {
  return (
    <span className="relative flex h-3 w-3">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-20" />
      <span className="relative inline-flex h-3 w-3 rounded-full bg-current opacity-50" />
    </span>
  );
}

function SmallStat({
  label,
  value,
}: any) {
  return (
    <div className="rounded-2xl border border-white/8 bg-black/20 p-4 text-center">
      <p className="text-xl font-black text-white">
        {value}
      </p>

      <p className="mt-1 text-[7px] font-black uppercase text-white/25">
        {label}
      </p>
    </div>
  );
}

function Avatar({
  src,
  name,
  large = false,
  small = false,
}: any) {
  const size = large
    ? "h-14 w-14"
    : small
      ? "h-9 w-9"
      : "h-12 w-12";

  return src ? (
    <img
      src={src}
      alt=""
      className={`${size} shrink-0 rounded-2xl border border-primary/20 object-cover`}
    />
  ) : (
    <span className={`flex ${size} shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary`}>
      <UserRound className={small ? "h-4 w-4" : "h-5 w-5"} />
    </span>
  );
}

function Badge({
  icon: Icon,
  label,
  tone,
}: any) {
  const tones: any = {
    yellow:
      "border-yellow-400/20 bg-yellow-500/10 text-yellow-300",
    green:
      "border-primary/20 bg-primary/10 text-primary",
    blue:
      "border-blue-400/20 bg-blue-500/10 text-blue-300",
    red:
      "border-red-400/20 bg-red-500/10 text-red-300",
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[7px] font-black uppercase ${tones[tone]}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

function OptionSection({
  title,
  children,
}: any) {
  return (
    <section className="rounded-2xl border border-white/8 bg-black/20 p-4">
      <p className="text-[8px] font-black uppercase tracking-[0.12em] text-white/30">
        {title}
      </p>

      <div className="mt-3 space-y-3">
        {children}
      </div>
    </section>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: any) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4">
      <span className="text-xs text-white/45">
        {label}
      </span>

      <button
        type="button"
        onClick={() =>
          onChange(!checked)
        }
        className={`relative h-6 w-11 rounded-full transition ${
          checked
            ? "bg-primary"
            : "bg-white/10"
        }`}
      >
        <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
          checked
            ? "left-6"
            : "left-1"
        }`} />
      </button>
    </label>
  );
}

function Feedback({
  tone,
  message,
  onClose,
}: any) {
  const success =
    tone === "success";

  return (
    <div className={`flex items-start justify-between gap-4 rounded-2xl border p-4 text-sm ${
      success
        ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
        : "border-red-400/20 bg-red-500/10 text-red-200"
    }`}>
      <div className="flex items-start gap-3">
        {success ? (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
        ) : (
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        )}

        <p>{message}</p>
      </div>

      <button
        type="button"
        onClick={onClose}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[2rem] border border-white/8 bg-[#06100c]/70">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />

      <p className="mt-4 text-[8px] font-black uppercase tracking-[0.15em] text-white/25">
        A carregar o Fórum
      </p>
    </div>
  );
}

function EmptyState({
  onCreate,
}: any) {
  return (
    <div className="rounded-[2rem] border border-dashed border-white/10 bg-[#06100c]/60 p-14 text-center">
      <MessageCircle className="mx-auto h-11 w-11 text-white/15" />

      <h2 className="mt-5 text-2xl font-black text-white">
        Ainda não existem publicações
      </h2>

      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-white/30">
        Abre a primeira discussão desta categoria e começa a partilha interna.
      </p>

      <button
        type="button"
        onClick={onCreate}
        className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-[8px] font-black uppercase text-[#02140c]"
      >
        <Plus className="h-4 w-4" />
        Criar publicação
      </button>
    </div>
  );
}
