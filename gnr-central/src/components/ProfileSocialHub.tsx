import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Award,
  Eye,
  Heart,
  MessageSquare,
  Pin,
  Send,
  Shield,
  Star,
  ThumbsUp,
  Trash2,
  Users,
} from "lucide-react";

const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(
    /\/$/,
    "",
  ) || "";

const REACTION_META: Record<
  string,
  {
    label: string;
    icon: any;
  }
> = {
  LIKE: {
    label: "Gosto",
    icon: ThumbsUp,
  },
  SALUTE: {
    label: "Saudação",
    icon: Users,
  },
  SHIELD: {
    label: "Mérito",
    icon: Shield,
  },
  STAR: {
    label: "Destaque",
    icon: Star,
  },
};

const RECOGNITION_META: Record<
  string,
  string
> = {
  LEADERSHIP: "Liderança",
  TEAMWORK: "Espírito de equipa",
  PROFESSIONALISM:
    "Profissionalismo",
  ACTIVITY: "Atividade",
  COMMUNICATION: "Comunicação",
  DISCIPLINE: "Disciplina",
  OPERATIONAL_MERIT:
    "Mérito operacional",
  TRAINING: "Formação",
};

async function request(
  path: string,
  options: RequestInit = {},
) {
  const response = await fetch(
    `${API_BASE_URL}${path}`,
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

  const payload =
    await response
      .json()
      .catch(() => null);

  if (!response.ok) {
    throw new Error(
      payload?.error ||
        "O pedido falhou.",
    );
  }

  return payload;
}

function formatDate(
  value: string,
) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "Data desconhecida";
  }

  return date.toLocaleString(
    "pt-PT",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  );
}

export default function ProfileSocialHub({
  profileDiscordId,
  currentUserId,
  profileName,
}: {
  profileDiscordId: string;
  currentUserId: string;
  profileName: string;
}) {
  const [data, setData] =
    useState<any>({
      comments: [],
      recognitions: [],
      recognitionSummary: {},
      visits: {
        total: 0,
        week: 0,
      },
      permissions: {},
    });

  const [loading, setLoading] =
    useState(true);

  const [content, setContent] =
    useState("");

  const [category, setCategory] =
    useState("COMMENT");

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState("");

  async function load() {
    if (!profileDiscordId) return;

    setLoading(true);
    setError("");

    try {
      const payload =
        await request(
          `/api/profile-social/${encodeURIComponent(
            profileDiscordId,
          )}`,
        );

      setData(payload);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Não foi possível carregar o mural.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!profileDiscordId) return;

    void request(
      `/api/profile-social/${encodeURIComponent(
        profileDiscordId,
      )}/visit`,
      {
        method: "POST",
      },
    ).catch(() => null);

    void load();
  }, [profileDiscordId]);

  const recognitionEntries =
    useMemo(
      () =>
        Object.entries(
          data.recognitionSummary ||
            {},
        ).sort(
          (a: any, b: any) =>
            Number(b[1]) -
            Number(a[1]),
        ),
      [data.recognitionSummary],
    );

  async function submitComment() {
    if (!content.trim()) return;

    setBusy(true);

    try {
      await request(
        `/api/profile-social/${encodeURIComponent(
          profileDiscordId,
        )}/comments`,
        {
          method: "POST",
          body: JSON.stringify({
            content,
            category,
          }),
        },
      );

      setContent("");
      await load();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Não foi possível publicar.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function react(
    commentId: string,
    emoji: string,
  ) {
    await request(
      `/api/profile-social/comments/${commentId}/react`,
      {
        method: "POST",
        body: JSON.stringify({
          emoji,
        }),
      },
    );

    await load();
  }

  async function removeComment(
    commentId: string,
  ) {
    if (
      !window.confirm(
        "Remover este comentário?",
      )
    ) {
      return;
    }

    await request(
      `/api/profile-social/comments/${commentId}`,
      {
        method: "DELETE",
      },
    );

    await load();
  }

  async function pinComment(
    commentId: string,
  ) {
    await request(
      `/api/profile-social/comments/${commentId}/pin`,
      {
        method: "POST",
      },
    );

    await load();
  }

  async function recognize(
    type: string,
  ) {
    const note =
      window.prompt(
        "Pequena nota opcional:",
      ) || "";

    try {
      await request(
        `/api/profile-social/${encodeURIComponent(
          profileDiscordId,
        )}/recognitions`,
        {
          method: "POST",
          body: JSON.stringify({
            type,
            note,
          }),
        },
      );

      await load();
    } catch (recognitionError) {
      setError(
        recognitionError instanceof Error
          ? recognitionError.message
          : "Não foi possível reconhecer.",
      );
    }
  }

  const muralBackground =
    data.customization?.muralBackground;

  const muralSettings =
    data.customization?.muralSettings || {};

  const muralStyle =
    muralBackground?.imageUrl
      ? {
          backgroundImage: `linear-gradient(rgba(4,12,9,${muralSettings.overlayOpacity ?? 0.72}), rgba(4,12,9,${muralSettings.overlayOpacity ?? 0.72})), url(${muralBackground.imageUrl})`,
          backgroundPosition:
            muralSettings.position || "center",
          backgroundSize: "cover",
        }
      : undefined;

  return (
    <section
      id="perfil-mural"
      style={muralStyle}
      className="scroll-mt-28 space-y-5 rounded-[2.2rem] border border-white/10 p-5 md:p-6"
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Metric
          icon={MessageSquare}
          label="Comentários"
          value={
            data.comments?.length ||
            0
          }
        />

        <Metric
          icon={Award}
          label="Reconhecimentos"
          value={
            data.recognitions?.length ||
            0
          }
        />

        <Metric
          icon={Eye}
          label="Visitas"
          value={
            data.visits?.total ||
            0
          }
          detail={`${data.visits?.week || 0} esta semana`}
        />
      </div>

      {error && (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_340px]">
        <div className="space-y-4 rounded-[2rem] border border-white/10 bg-[#06100c]/90 p-5">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-primary">
              Mural do Guarda
            </p>

            <h2 className="mt-2 text-2xl font-black text-white">
              Comentários e elogios
            </h2>

            <p className="mt-2 text-sm text-white/35">
              Deixa uma mensagem no perfil de {profileName}.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="flex flex-wrap gap-2">
              {[
                ["COMMENT", "Comentário"],
                ["PRAISE", "Elogio"],
                ["THANKS", "Agradecimento"],
                ["TEAM", "Equipa"],
                ["OPERATION", "Operação"],
              ].map(
                ([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setCategory(value)
                    }
                    className={`rounded-full border px-3 py-2 text-[8px] font-black uppercase ${
                      category === value
                        ? "border-primary/25 bg-primary/10 text-primary"
                        : "border-white/10 bg-white/[0.03] text-white/35"
                    }`}
                  >
                    {label}
                  </button>
                ),
              )}
            </div>

            <textarea
              value={content}
              onChange={(event) =>
                setContent(
                  event.target.value,
                )
              }
              maxLength={500}
              rows={4}
              placeholder="Escreve uma mensagem positiva, profissional e respeitosa..."
              className="mt-4 w-full resize-none rounded-xl border border-white/10 bg-black/25 p-4 text-sm leading-6 text-white outline-none focus:border-primary/40"
            />

            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-xs text-white/25">
                {content.length}/500
              </span>

              <button
                type="button"
                disabled={
                  busy ||
                  !content.trim()
                }
                onClick={() =>
                  void submitComment()
                }
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-[8px] font-black uppercase text-primary-foreground disabled:opacity-35"
              >
                <Send className="h-4 w-4" />
                Publicar
              </button>
            </div>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-white/10 p-10 text-center text-sm text-white/30">
              A carregar mural...
            </div>
          ) : data.comments?.length ? (
            <div className="space-y-3">
              {data.comments.map(
                (comment: any) => (
                  <CommentCard
                    key={comment._id}
                    comment={comment}
                    currentUserId={
                      currentUserId
                    }
                    isOwnProfile={
                      data.permissions
                        ?.isOwnProfile
                    }
                    canModerate={
                      data.permissions
                        ?.canModerate
                    }
                    onReact={react}
                    onRemove={
                      removeComment
                    }
                    onPin={pinComment}
                    featured={
                      String(
                        data.customization
                          ?.featuredCommentId ||
                          "",
                      ) ===
                      String(
                        comment._id,
                      )
                    }
                    highlightedStyle={
                      data.customization
                        ?.highlightedCommentStyle
                    }
                  />
                ),
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-white/30">
              Este perfil ainda não tem comentários.
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-[1.8rem] border border-white/10 bg-[#06100c]/90 p-5">
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-primary">
              Reconhecimentos
            </p>

            <h3 className="mt-2 text-xl font-black text-white">
              Reputação interna
            </h3>

            <div className="mt-4 space-y-2">
              {recognitionEntries.length ? (
                recognitionEntries.map(
                  ([type, count]: any) => (
                    <div
                      key={type}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3"
                    >
                      <span className="text-xs font-black text-white/55">
                        {RECOGNITION_META[
                          type
                        ] || type}
                      </span>

                      <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[8px] font-black text-primary">
                        {count}
                      </span>
                    </div>
                  ),
                )
              ) : (
                <p className="rounded-xl border border-dashed border-white/10 p-5 text-center text-xs text-white/25">
                  Ainda sem reconhecimentos.
                </p>
              )}
            </div>
          </div>

          {profileDiscordId !==
            currentUserId && (
            <div className="rounded-[1.8rem] border border-white/10 bg-[#06100c]/90 p-5">
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-primary">
                Reconhecer
              </p>

              <p className="mt-2 text-sm leading-6 text-white/35">
                Escolhe uma qualidade profissional que se destaque neste militar.
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2">
                {Object.entries(
                  RECOGNITION_META,
                ).map(
                  ([type, label]) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() =>
                        void recognize(
                          type,
                        )
                      }
                      className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-[8px] font-black uppercase text-white/40 transition hover:border-primary/25 hover:bg-primary/10 hover:text-primary"
                    >
                      {label}
                    </button>
                  ),
                )}
              </div>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

function CommentCard({
  comment,
  currentUserId,
  isOwnProfile,
  canModerate,
  onReact,
  onRemove,
  onPin,
  featured,
  highlightedStyle,
}: any) {
  const grouped =
    Object.keys(
      REACTION_META,
    ).map((emoji) => ({
      emoji,
      count:
        comment.reactions?.filter(
          (item: any) =>
            item.emoji === emoji,
        ).length || 0,
      selected:
        comment.reactions?.some(
          (item: any) =>
            item.emoji === emoji &&
            item.userDiscordId ===
              currentUserId,
        ),
    }));

  const canDelete =
    comment.authorDiscordId ===
      currentUserId ||
    canModerate;

  const canPin =
    isOwnProfile ||
    canModerate;

  const commentStyle =
    comment.socialStyle?.commentStyle;

  const signature =
    comment.socialStyle?.signature;

  const socialBadges =
    comment.socialStyle?.badges || [];

  const extraReactions =
    comment.socialStyle?.reactionPack
      ?.reactions || [];

  const cardClass =
    featured &&
    highlightedStyle?.styleClass
      ? highlightedStyle.styleClass
      : commentStyle?.style?.cardClass ||
        "border-white/10 bg-black/20";

  return (
    <article className={`rounded-[1.5rem] border p-5 ${cardClass}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-black text-white">
              {comment.authorName}
            </p>

            {socialBadges.map(
              (badge: any) => (
                <span
                  key={badge.id}
                  title={badge.name}
                  className="text-sm"
                >
                  {badge.icon}
                </span>
              ),
            )}

            {featured && (
              <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-2.5 py-1 text-[7px] font-black uppercase text-amber-300">
                Destaque
              </span>
            )}

            {comment.authorRank && (
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[7px] font-black uppercase text-white/35">
                {comment.authorRank}
              </span>
            )}

            {comment.pinned && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/20 bg-amber-500/10 px-2.5 py-1 text-[7px] font-black uppercase text-amber-300">
                <Pin className="h-3 w-3" />
                Fixado
              </span>
            )}
          </div>

          <p className="mt-1 text-xs text-white/25">
            {formatDate(
              comment.createdAt,
            )}
            {comment.editedAt
              ? " · editado"
              : ""}
          </p>
        </div>

        <div className="flex gap-2">
          {canPin && (
            <button
              type="button"
              onClick={() =>
                void onPin(
                  comment._id,
                )
              }
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-white/30 hover:text-amber-300"
            >
              <Pin className="h-4 w-4" />
            </button>
          )}

          {canDelete && (
            <button
              type="button"
              onClick={() =>
                void onRemove(
                  comment._id,
                )
              }
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-red-400/15 bg-red-500/[0.06] text-red-300/60 hover:text-red-300"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <p className="mt-4 whitespace-pre-line text-sm leading-7 text-white/55">
        {comment.content}
      </p>

      {signature?.text && (
        <p className="mt-4 border-t border-white/10 pt-3 text-xs font-black italic text-white/35">
          — {signature.text}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {grouped.map(
          ({
            emoji,
            count,
            selected,
          }) => {
            const meta =
              REACTION_META[
                emoji
              ];

            const Icon =
              meta.icon;

            return (
              <button
                key={emoji}
                type="button"
                onClick={() =>
                  void onReact(
                    comment._id,
                    emoji,
                  )
                }
                title={meta.label}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[8px] font-black uppercase ${
                  selected
                    ? "border-primary/25 bg-primary/10 text-primary"
                    : "border-white/10 bg-white/[0.03] text-white/35"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {count}
              </button>
            );
          },
        )}

        {extraReactions.map(
          (reaction: any) => {
            const count =
              comment.reactions?.filter(
                (item: any) =>
                  item.emoji ===
                  reaction.key,
              ).length || 0;

            const selected =
              comment.reactions?.some(
                (item: any) =>
                  item.emoji ===
                    reaction.key &&
                  item.userDiscordId ===
                    currentUserId,
              );

            return (
              <button
                key={reaction.key}
                type="button"
                onClick={() =>
                  void onReact(
                    comment._id,
                    reaction.key,
                  )
                }
                title={reaction.label}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[8px] font-black uppercase ${
                  selected
                    ? "border-primary/25 bg-primary/10 text-primary"
                    : "border-white/10 bg-white/[0.03] text-white/35"
                }`}
              >
                <span>{reaction.emoji}</span>
                {count}
              </button>
            );
          },
        )}
      </div>
    </article>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  detail,
}: any) {
  return (
    <article className="rounded-[1.5rem] border border-white/10 bg-[#06100c]/90 p-5">
      <Icon className="h-5 w-5 text-primary" />

      <p className="mt-4 text-3xl font-black text-white">
        {value}
      </p>

      <p className="mt-1 text-[8px] font-black uppercase tracking-[0.12em] text-white/25">
        {label}
      </p>

      {detail && (
        <p className="mt-2 text-xs text-white/25">
          {detail}
        </p>
      )}
    </article>
  );
}
