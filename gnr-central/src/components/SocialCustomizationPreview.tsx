import {
  useEffect,
  useState,
} from "react";

import {
  Heart,
  Shield,
  Star,
  ThumbsUp,
  Users,
} from "lucide-react";

const BASE_REACTIONS = [
  {
    key: "LIKE",
    icon: ThumbsUp,
    count: 8,
  },
  {
    key: "SALUTE",
    icon: Users,
    count: 4,
  },
  {
    key: "SHIELD",
    icon: Shield,
    count: 3,
  },
  {
    key: "STAR",
    icon: Star,
    count: 2,
  },
];

export default function SocialCustomizationPreview({
  catalog,
  draft,
  previewItem,
}: {
  catalog: any[];
  draft: any;
  previewItem?: any | null;
}) {
  const [
    backgroundLoaded,
    setBackgroundLoaded,
  ] = useState(true);

  function findItem(
    itemId?: string | null,
  ) {
    return catalog.find(
      (item) =>
        item.id === itemId,
    );
  }

  const selected = {
    muralBackground:
      previewItem?.type ===
      "MURAL_BACKGROUND"
        ? previewItem
        : findItem(
            draft.equipped
              ?.muralBackground,
          ),

    commentStyle:
      previewItem?.type ===
      "COMMENT_STYLE"
        ? previewItem
        : findItem(
            draft.equipped
              ?.commentStyle,
          ),

    signature:
      previewItem?.type ===
      "SIGNATURE"
        ? previewItem
        : findItem(
            draft.equipped
              ?.signature,
          ),

    reactionPack:
      previewItem?.type ===
      "REACTION_PACK"
        ? previewItem
        : findItem(
            draft.equipped
              ?.reactionPack,
          ),

    highlightedStyle:
      previewItem?.type ===
      "HIGHLIGHT_STYLE"
        ? previewItem
        : findItem(
            draft.equipped
              ?.highlightedCommentStyle,
          ),

    entryEffect:
      previewItem?.type ===
      "ENTRY_EFFECT"
        ? previewItem
        : findItem(
            draft.equipped
              ?.entryEffect,
          ),
  };

  const socialBadges =
    previewItem?.type ===
    "SOCIAL_BADGE"
      ? [
          previewItem,
          ...(draft.equipped
            ?.socialBadges || [])
            .map(findItem)
            .filter(Boolean)
            .filter(
              (item: any) =>
                item.id !==
                previewItem.id,
            )
            .slice(0, 1),
        ]
      : (
          draft.equipped
            ?.socialBadges || []
        )
          .map(findItem)
          .filter(Boolean)
          .slice(0, 2);

  const overlay =
    draft.muralSettings
      ?.overlayOpacity ??
    0.72;

  const blur =
    draft.muralSettings
      ?.blur || 0;

  const position =
    draft.muralSettings
      ?.position || "center";

  const muralImageUrl =
    selected.muralBackground
      ?.imageUrl ||
    selected.muralBackground
      ?.image ||
    selected.muralBackground
      ?.previewUrl ||
    selected.muralBackground
      ?.backgroundUrl ||
    null;

  useEffect(() => {
    if (!muralImageUrl) {
      setBackgroundLoaded(true);
      return;
    }

    let cancelled = false;
    const image = new window.Image();

    image.onload = () => {
      if (!cancelled) {
        setBackgroundLoaded(true);
      }
    };

    image.onerror = () => {
      if (!cancelled) {
        setBackgroundLoaded(false);
      }
    };

    setBackgroundLoaded(false);
    image.src = muralImageUrl;

    return () => {
      cancelled = true;
    };
  }, [muralImageUrl]);

  const muralStyle =
    muralImageUrl &&
    backgroundLoaded
      ? {
          backgroundImage:
            `linear-gradient(rgba(3,11,8,${overlay}),rgba(3,11,8,${overlay})),url("${muralImageUrl}")`,
          backgroundPosition:
            position,
          backgroundSize:
            "cover",
        }
      : undefined;

  const commentClass =
    selected.commentStyle
      ?.style?.cardClass ||
    "border-white/10 bg-black/45";

  const highlightClass =
    selected.highlightedStyle
      ?.styleClass ||
    commentClass;

  const extraReactions =
    selected.reactionPack
      ?.reactions || [];

  return (
    <aside className="portal-v7-preview xl:sticky xl:top-24">
      <div className="portal-v7-preview-shell overflow-hidden rounded-[1.65rem] border border-white/10 bg-[#06100c] shadow-2xl">
        <div className="border-b border-white/10 p-5">
          <p className="text-[8px] font-black uppercase tracking-[0.16em] text-primary">
            Pré-visualização
          </p>

          <h2 className="mt-2 text-xl font-black text-white">
            O teu mural em tempo real
          </h2>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-white/10 bg-white/[.025] px-3 py-2">
              <p className="text-[7px] font-black uppercase tracking-[.15em] text-white/25">
                Equipado
              </p>
              <p className="mt-1 truncate text-[10px] font-black text-white/60">
                Visual atual
              </p>
            </div>

            <div className={`rounded-xl border px-3 py-2 ${
              previewItem
                ? "border-amber-400/20 bg-amber-500/[.07]"
                : "border-primary/20 bg-primary/[.06]"
            }`}>
              <p className={`text-[7px] font-black uppercase tracking-[.15em] ${
                previewItem
                  ? "text-amber-300"
                  : "text-primary"
              }`}>
                Preview
              </p>
              <p className="mt-1 truncate text-[10px] font-black text-white/65">
                {previewItem?.name || "Em tempo real"}
              </p>
            </div>
          </div>

          {previewItem && (
            <p className="mt-2 rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs font-black text-amber-300">
              Preview temporário:{" "}
              {previewItem.name}
            </p>
          )}
        </div>

        <div
          style={muralStyle}
          className="relative min-h-[570px] bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,.12),transparent_36%)] p-5"
        >
          {muralImageUrl &&
            backgroundLoaded &&
            blur > 0 && (
              <div
                className="pointer-events-none absolute inset-0 bg-cover"
                style={{
                  backgroundImage:
                    `linear-gradient(rgba(3,11,8,${overlay}),rgba(3,11,8,${overlay})),url("${muralImageUrl}")`,
                  backgroundPosition:
                    position,
                  filter:
                    `blur(${blur}px)`,
                  transform:
                    "scale(1.04)",
                }}
              />
            )}

          {selected.muralBackground &&
            muralImageUrl &&
            !backgroundLoaded && (
              <div className="relative mb-4 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-xs text-red-200">
                Não foi possível carregar a imagem deste fundo:
                <span className="mt-1 block break-all font-mono text-[10px] text-red-100/60">
                  {muralImageUrl}
                </span>
              </div>
            )}

          <div className="relative">
            <div className="rounded-[1.5rem] border border-white/10 bg-black/35 p-5 backdrop-blur-sm">
              <p className="text-[8px] font-black uppercase tracking-[0.15em] text-primary">
                Mural do Guarda
              </p>

              <h3 className="mt-2 text-2xl font-black text-white">
                Smurf Oliveira
              </h3>

              <p className="mt-1 text-xs text-white/35">
                Tenente-General · Comando-Geral
              </p>
            </div>

            <article
              className={`mt-5 rounded-[1.5rem] border p-5 backdrop-blur-sm ${highlightClass} ${selected.entryEffect?.effectClass || ""}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-black text-white">
                  Pedro Barrias
                </p>

                {socialBadges.map(
                  (badge: any) => (
                    <span
                      key={badge.id}
                      title={badge.name}
                      className="text-base"
                    >
                      {badge.icon}
                    </span>
                  ),
                )}

                <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-2 py-1 text-[7px] font-black uppercase text-amber-300">
                  Destaque
                </span>
              </div>

              <p className="mt-1 text-xs text-white/30">
                Sargento-Chefe · Agora
              </p>

              <p className="mt-4 text-sm leading-7 text-white/65">
                Excelente desempenho na operação. Demonstrou liderança, profissionalismo e espírito de equipa.
              </p>

              {selected.signature
                ?.text && (
                <p className="mt-4 border-t border-white/10 pt-3 text-xs font-black italic text-white/40">
                  —{" "}
                  {
                    selected
                      .signature
                      .text
                  }
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {BASE_REACTIONS.map(
                  (reaction) => {
                    const Icon =
                      reaction.icon;

                    return (
                      <span
                        key={
                          reaction.key
                        }
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-[8px] font-black text-white/40"
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {
                          reaction.count
                        }
                      </span>
                    );
                  },
                )}

                {extraReactions.map(
                  (reaction: any) => (
                    <span
                      key={
                        reaction.key
                      }
                      className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-2 text-[8px] font-black text-primary"
                    >
                      <span>
                        {
                          reaction.emoji
                        }
                      </span>
                      1
                    </span>
                  ),
                )}
              </div>
            </article>

            <article
              className={`mt-3 rounded-[1.5rem] border p-5 backdrop-blur-sm ${commentClass}`}
            >
              <div className="flex items-center gap-2">
                <p className="font-black text-white">
                  João Oliveira
                </p>

                {socialBadges.map(
                  (badge: any) => (
                    <span
                      key={
                        `normal-${badge.id}`
                      }
                      className="text-base"
                    >
                      {badge.icon}
                    </span>
                  ),
                )}
              </div>

              <p className="mt-4 text-sm leading-7 text-white/60">
                Um exemplo de comentário normal com a personalização escolhida.
              </p>

              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-[8px] font-black text-white/40">
                <Heart className="h-3.5 w-3.5" />
                6
              </div>
            </article>
          </div>
        </div>
      </div>
    </aside>
  );
}
