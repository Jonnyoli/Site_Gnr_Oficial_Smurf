import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  BadgeCheck,
  Eye,
  Image,
  Lock,
  MessageSquare,
  Paintbrush,
  RotateCcw,
  Save,
  Shield,
  ShoppingBag,
  Sparkles,
} from "lucide-react";

import {
  Link,
} from "wouter";

import SocialCustomizationPreview from "../components/SocialCustomizationPreview";

const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(
    /\/$/,
    "",
  ) || "";

type Section =
  | "MURAL"
  | "COMMENTS"
  | "BADGES"
  | "REACTIONS"
  | "PRIVACY";

const SECTION_META = [
  {
    key: "MURAL",
    label: "Mural",
    icon: Image,
  },
  {
    key: "COMMENTS",
    label: "Comentários",
    icon: MessageSquare,
  },
  {
    key: "BADGES",
    label: "Emblemas",
    icon: BadgeCheck,
  },
  {
    key: "REACTIONS",
    label: "Reações",
    icon: Sparkles,
  },
  {
    key: "PRIVACY",
    label: "Privacidade",
    icon: Lock,
  },
] as const;

const TYPE_BY_SLOT: Record<
  string,
  string
> = {
  muralBackground:
    "MURAL_BACKGROUND",
  commentStyle:
    "COMMENT_STYLE",
  signature:
    "SIGNATURE",
  reactionPack:
    "REACTION_PACK",
  highlightedCommentStyle:
    "HIGHLIGHT_STYLE",
  entryEffect:
    "ENTRY_EFFECT",
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

function clone<T>(
  value: T,
): T {
  return JSON.parse(
    JSON.stringify(value),
  );
}

export default function SocialCustomizationSettings() {
  const [catalog, setCatalog] =
    useState<any[]>([]);

  const [saved, setSaved] =
    useState<any>(null);

  const [draft, setDraft] =
    useState<any>(null);

  const [section, setSection] =
    useState<Section>("MURAL");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [
    localPreviewItem,
    setLocalPreviewItem,
  ] = useState<any>(null);

  const previewId =
    new URLSearchParams(
      window.location.search,
    ).get("preview");

  const urlPreviewItem =
    useMemo(
      () =>
        catalog.find(
          (item) =>
            item.id ===
            previewId,
        ) || null,
      [catalog, previewId],
    );

  const previewItem =
    localPreviewItem ||
    urlPreviewItem;

  async function load() {
    setLoading(true);
    setError("");

    try {
      const [
        catalogPayload,
        me,
      ] = await Promise.all([
        request(
          "/api/profile-social-customization/catalog",
        ),
        request(
          "/api/profile-social-customization/me",
        ),
      ]);

      setCatalog(
        catalogPayload.items ||
          [],
      );

      setSaved(me);
      setDraft(clone(me));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Não foi possível carregar as definições.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const owned =
    useMemo(
      () =>
        new Set(
          draft?.ownedItems || [],
        ),
      [draft?.ownedItems],
    );

  const dirty =
    useMemo(
      () =>
        saved &&
        draft &&
        JSON.stringify({
          equipped:
            saved.equipped,
          muralSettings:
            saved.muralSettings,
          privacy:
            saved.privacy,
        }) !==
          JSON.stringify({
            equipped:
              draft.equipped,
            muralSettings:
              draft.muralSettings,
            privacy:
              draft.privacy,
          }),
      [saved, draft],
    );

  function updateSlot(
    slot: string,
    itemId: string | null,
  ) {
    setDraft(
      (current: any) => ({
        ...current,
        equipped: {
          ...current.equipped,
          [slot]: itemId,
        },
      }),
    );
  }

  function toggleBadge(
    badgeId: string,
  ) {
    setDraft(
      (current: any) => {
        const existing =
          current.equipped
            ?.socialBadges || [];

        const next =
          existing.includes(
            badgeId,
          )
            ? existing.filter(
                (id: string) =>
                  id !== badgeId,
              )
            : [
                ...existing,
                badgeId,
              ].slice(-2);

        return {
          ...current,
          equipped: {
            ...current.equipped,
            socialBadges: next,
          },
        };
      },
    );
  }

  function updateMural(
    key: string,
    value: any,
  ) {
    setDraft(
      (current: any) => ({
        ...current,
        muralSettings: {
          ...current.muralSettings,
          [key]: value,
        },
      }),
    );
  }

  function updatePrivacy(
    key: string,
    value: any,
  ) {
    setDraft(
      (current: any) => ({
        ...current,
        privacy: {
          ...current.privacy,
          [key]: value,
        },
      }),
    );
  }

  async function save() {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload =
        await request(
          "/api/profile-social-customization/me",
          {
            method: "PUT",
            body: JSON.stringify({
              equipped:
                draft.equipped,
              muralSettings:
                draft.muralSettings,
              privacy:
                draft.privacy,
            }),
          },
        );

      const next = {
        ...draft,
        ...payload.customization,
        ownedItems:
          draft.ownedItems,
      };

      setSaved(clone(next));
      setDraft(clone(next));
      setLocalPreviewItem(null);
      setSuccess(
        "Personalização guardada com sucesso.",
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Não foi possível guardar.",
      );
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setDraft(clone(saved));
    setLocalPreviewItem(null);
    setSuccess("");
    setError("");
  }

  if (
    loading ||
    !draft
  ) {
    return (
      <div className="flex min-h-[520px] items-center justify-center text-sm text-white/35">
        A carregar Personalização Social...
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-14">
      <section className="rounded-[2.6rem] border border-primary/15 bg-[#06100c]/95 p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-primary">
              Definições
            </p>

            <h1 className="mt-3 text-4xl font-black text-white">
              Personalização Social
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/35">
              Configura o mural, comentários, assinatura, emblemas e privacidade sem ocupar espaço no perfil.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/loja"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-[8px] font-black uppercase text-white/50"
            >
              <ShoppingBag className="h-4 w-4" />
              Abrir loja
            </Link>

            <button
              type="button"
              disabled={!dirty}
              onClick={reset}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-[8px] font-black uppercase text-white/50 disabled:opacity-30"
            >
              <RotateCcw className="h-4 w-4" />
              Repor
            </button>

            <button
              type="button"
              disabled={
                saving ||
                !dirty
              }
              onClick={() =>
                void save()
              }
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-[8px] font-black uppercase text-primary-foreground disabled:opacity-35"
            >
              <Save className="h-4 w-4" />
              Guardar
            </button>
          </div>
        </div>
      </section>

      {previewItem && (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-black text-amber-200">
              Pré-visualização temporária:{" "}
              {previewItem.name}
            </p>

            <p className="mt-1 text-xs text-amber-100/55">
              Este item ainda não será equipado nem guardado.
            </p>
          </div>

          <Link
            href={`/loja?item=${encodeURIComponent(
              previewItem.id,
            )}`}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-[8px] font-black uppercase text-amber-200"
          >
            <ShoppingBag className="h-4 w-4" />
            Comprar item
          </Link>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
          {success}
        </div>
      )}

      <section className="rounded-[1.7rem] border border-white/10 bg-[#06100c]/90 p-2">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          {SECTION_META.map(
            (item) => {
              const Icon =
                item.icon;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() =>
                    setSection(
                      item.key,
                    )
                  }
                  className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-4 text-[8px] font-black uppercase transition ${
                    section ===
                    item.key
                      ? "border-primary/25 bg-primary/10 text-primary"
                      : "border-transparent text-white/35 hover:border-white/10 hover:bg-white/[0.03]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            },
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <main className="space-y-5">
          {section ===
            "MURAL" && (
            <>
              <ItemSelector
                title="Fundo do mural"
                description="Imagem aplicada apenas à área social do teu perfil."
                type={
                  TYPE_BY_SLOT
                    .muralBackground
                }
                selected={
                  draft.equipped
                    ?.muralBackground
                }
                catalog={catalog}
                owned={owned}
                onSelect={(
                  itemId,
                ) =>
                  updateSlot(
                    "muralBackground",
                    itemId,
                  )
                }
                onPreview={
                  setLocalPreviewItem
                }
              />

              <ItemSelector
                title="Comentário em destaque"
                description="Visual usado no comentário principal do mural."
                type={
                  TYPE_BY_SLOT
                    .highlightedCommentStyle
                }
                selected={
                  draft.equipped
                    ?.highlightedCommentStyle
                }
                catalog={catalog}
                owned={owned}
                onSelect={(
                  itemId,
                ) =>
                  updateSlot(
                    "highlightedCommentStyle",
                    itemId,
                  )
                }
                onPreview={
                  setLocalPreviewItem
                }
              />

              <ItemSelector
                title="Efeito de entrada"
                description="Efeito visual discreto aplicado ao mural."
                type={
                  TYPE_BY_SLOT
                    .entryEffect
                }
                selected={
                  draft.equipped
                    ?.entryEffect
                }
                catalog={catalog}
                owned={owned}
                onSelect={(
                  itemId,
                ) =>
                  updateSlot(
                    "entryEffect",
                    itemId,
                  )
                }
                onPreview={
                  setLocalPreviewItem
                }
              />

              <section className="rounded-[1.7rem] border border-white/10 bg-[#06100c]/90 p-5">
                <h2 className="text-lg font-black text-white">
                  Ajustes da imagem
                </h2>

                <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
                  <RangeField
                    label="Escurecimento"
                    min={0}
                    max={1}
                    step={0.05}
                    value={
                      draft
                        .muralSettings
                        ?.overlayOpacity ??
                      0.72
                    }
                    onChange={(
                      value,
                    ) =>
                      updateMural(
                        "overlayOpacity",
                        value,
                      )
                    }
                  />

                  <RangeField
                    label="Desfoque"
                    min={0}
                    max={16}
                    step={1}
                    value={
                      draft
                        .muralSettings
                        ?.blur || 0
                    }
                    onChange={(
                      value,
                    ) =>
                      updateMural(
                        "blur",
                        value,
                      )
                    }
                  />

                  <label className="text-xs font-black text-white/45">
                    Posição
                    <select
                      value={
                        draft
                          .muralSettings
                          ?.position ||
                        "center"
                      }
                      onChange={(
                        event,
                      ) =>
                        updateMural(
                          "position",
                          event
                            .target
                            .value,
                        )
                      }
                      className="mt-3 h-12 w-full rounded-xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
                    >
                      <option value="center">
                        Centro
                      </option>
                      <option value="top">
                        Topo
                      </option>
                      <option value="bottom">
                        Fundo
                      </option>
                      <option value="left">
                        Esquerda
                      </option>
                      <option value="right">
                        Direita
                      </option>
                    </select>
                  </label>
                </div>
              </section>
            </>
          )}

          {section ===
            "COMMENTS" && (
            <>
              <ItemSelector
                title="Estilo dos comentários"
                description="Acompanha os comentários que publicas noutros perfis."
                type={
                  TYPE_BY_SLOT
                    .commentStyle
                }
                selected={
                  draft.equipped
                    ?.commentStyle
                }
                catalog={catalog}
                owned={owned}
                onSelect={(
                  itemId,
                ) =>
                  updateSlot(
                    "commentStyle",
                    itemId,
                  )
                }
                onPreview={
                  setLocalPreviewItem
                }
              />

              <ItemSelector
                title="Assinatura"
                description="Texto apresentado no final dos teus comentários."
                type={
                  TYPE_BY_SLOT
                    .signature
                }
                selected={
                  draft.equipped
                    ?.signature
                }
                catalog={catalog}
                owned={owned}
                onSelect={(
                  itemId,
                ) =>
                  updateSlot(
                    "signature",
                    itemId,
                  )
                }
                onPreview={
                  setLocalPreviewItem
                }
              />
            </>
          )}

          {section ===
            "BADGES" && (
            <section className="rounded-[1.7rem] border border-white/10 bg-[#06100c]/90 p-5">
              <h2 className="text-lg font-black text-white">
                Emblemas nos comentários
              </h2>

              <p className="mt-2 text-sm text-white/35">
                Escolhe até dois. A ordem de seleção define a apresentação.
              </p>

              <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                {catalog
                  .filter(
                    (item) =>
                      item.type ===
                      "SOCIAL_BADGE",
                  )
                  .map(
                    (item) => {
                      const isOwned =
                        owned.has(
                          item.id,
                        );

                      const selected =
                        (
                          draft
                            .equipped
                            ?.socialBadges ||
                          []
                        ).includes(
                          item.id,
                        );

                      return (
                        <button
                          key={
                            item.id
                          }
                          type="button"
                          onClick={() => {
                            setLocalPreviewItem(
                              item,
                            );

                            if (isOwned) {
                              toggleBadge(
                                item.id,
                              );
                            }
                          }}
                          className={`rounded-xl border p-4 text-left ${
                            selected
                              ? "border-primary/30 bg-primary/10"
                              : "border-white/10 bg-black/20"
                          } ${
                            !isOwned
                              ? "border-amber-400/15 hover:border-amber-300/30"
                              : ""
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">
                              {
                                item.icon
                              }
                            </span>

                            <div>
                              <p className="font-black text-white">
                                {
                                  item.name
                                }
                              </p>

                              <p className="mt-1 text-xs text-white/30">
                                {isOwned
                                  ? selected
                                    ? "Equipado"
                                    : "Disponível"
                                  : "Clica para pré-visualizar"}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    },
                  )}
              </div>
            </section>
          )}

          {section ===
            "REACTIONS" && (
            <ItemSelector
              title="Pack de reações"
              description="Adiciona reações temáticas aos teus comentários."
              type={
                TYPE_BY_SLOT
                  .reactionPack
              }
              selected={
                draft.equipped
                  ?.reactionPack
              }
              catalog={catalog}
              owned={owned}
              onSelect={(
                itemId,
              ) =>
                updateSlot(
                  "reactionPack",
                  itemId,
                )
              }
            />
          )}

          {section ===
            "PRIVACY" && (
            <section className="rounded-[1.7rem] border border-white/10 bg-[#06100c]/90 p-5">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-primary" />

                <h2 className="text-lg font-black text-white">
                  Privacidade social
                </h2>
              </div>

              <label className="mt-5 block text-xs font-black text-white/45">
                Quem pode comentar
                <select
                  value={
                    draft.privacy
                      ?.comments ||
                    "EVERYONE"
                  }
                  onChange={(
                    event,
                  ) =>
                    updatePrivacy(
                      "comments",
                      event
                        .target
                        .value,
                    )
                  }
                  className="mt-3 h-12 w-full rounded-xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
                >
                  <option value="EVERYONE">
                    Todos os militares
                  </option>
                  <option value="UNIT">
                    Apenas a minha unidade
                  </option>
                  <option value="PATROL_PARTNERS">
                    Companheiros de patrulha
                  </option>
                  <option value="DISABLED">
                    Comentários desativados
                  </option>
                </select>
              </label>

              <div className="mt-5 space-y-3">
                <ToggleField
                  label="Mostrar coleção no perfil"
                  checked={
                    draft.privacy
                      ?.showCollection !==
                    false
                  }
                  onChange={(
                    value,
                  ) =>
                    updatePrivacy(
                      "showCollection",
                      value,
                    )
                  }
                />

                <ToggleField
                  label="Mostrar número de visitas"
                  checked={
                    draft.privacy
                      ?.showVisits !==
                    false
                  }
                  onChange={(
                    value,
                  ) =>
                    updatePrivacy(
                      "showVisits",
                      value,
                    )
                  }
                />
              </div>
            </section>
          )}
        </main>

        <SocialCustomizationPreview
          catalog={catalog}
          draft={draft}
          previewItem={
            previewItem
          }
        />
      </div>

      <div className="sticky bottom-4 z-40 flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#06100c]/95 p-4 shadow-2xl backdrop-blur md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-black text-white">
            {dirty
              ? "Existem alterações por guardar."
              : "A personalização está guardada."}
          </p>

          <p className="mt-1 text-xs text-white/30">
            O preview muda imediatamente; a API só é atualizada ao guardar.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={!dirty}
            onClick={reset}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-[8px] font-black uppercase text-white/45 disabled:opacity-30"
          >
            <RotateCcw className="h-4 w-4" />
            Repor
          </button>

          <button
            type="button"
            disabled={
              saving ||
              !dirty
            }
            onClick={() =>
              void save()
            }
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-[8px] font-black uppercase text-primary-foreground disabled:opacity-35"
          >
            <Save className="h-4 w-4" />
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

function ItemSelector({
  title,
  description,
  type,
  selected,
  catalog,
  owned,
  onSelect,
  onPreview,
}: any) {
  const items =
    catalog.filter(
      (item: any) =>
        item.type === type,
    );

  return (
    <section className="rounded-[1.7rem] border border-white/10 bg-[#06100c]/90 p-5">
      <h2 className="text-lg font-black text-white">
        {title}
      </h2>

      <p className="mt-2 text-sm text-white/35">
        {description}
      </p>

      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
        <button
          type="button"
          onClick={() => {
            onPreview?.(null);
            onSelect(null);
          }}
          className={`rounded-xl border p-4 text-left ${
            !selected
              ? "border-primary/30 bg-primary/10"
              : "border-white/10 bg-black/20"
          }`}
        >
          <p className="font-black text-white">
            Nenhum
          </p>

          <p className="mt-1 text-xs text-white/30">
            Usar o estilo padrão.
          </p>
        </button>

        {items.map(
          (item: any) => {
            const isOwned =
              owned.has(item.id);

            const isSelected =
              selected === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onPreview?.(
                    item,
                  );

                  if (isOwned) {
                    onSelect(
                      item.id,
                    );
                  }
                }}
                className={`rounded-xl border p-4 text-left transition ${
                  isSelected
                    ? "border-primary/30 bg-primary/10"
                    : "border-white/10 bg-black/20"
                } ${
                  !isOwned
                    ? "border-amber-400/15 hover:border-amber-300/30"
                    : "hover:border-primary/20"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-white">
                      {
                        item.name
                      }
                    </p>

                    <p className="mt-1 text-xs text-white/30">
                      {
                        item.rarity
                      }{" "}
                      ·{" "}
                      {
                        item.price
                      }{" "}
                      créditos
                    </p>
                  </div>

                  {isSelected && (
                    <BadgeCheck className="h-5 w-5 text-primary" />
                  )}
                </div>

                <p className="mt-3 text-xs leading-5 text-white/35">
                  {
                    item.description
                  }
                </p>

                {!isOwned && (
                  <p className="mt-3 inline-flex items-center gap-2 text-[8px] font-black uppercase text-amber-300">
                    <ShoppingBag className="h-3.5 w-3.5" />
                    Pré-visualizar · Comprar na loja
                  </p>
                )}
              </button>
            );
          },
        )}
      </div>
    </section>
  );
}

function RangeField({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: any) {
  return (
    <label className="text-xs font-black text-white/45">
      <div className="flex items-center justify-between">
        <span>{label}</span>
        <span className="text-primary">
          {value}
        </span>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) =>
          onChange(
            Number(
              event.target.value,
            ),
          )
        }
        className="mt-4 w-full"
      />
    </label>
  );
}

function ToggleField({
  label,
  checked,
  onChange,
}: any) {
  return (
    <button
      type="button"
      onClick={() =>
        onChange(!checked)
      }
      className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-4 text-left"
    >
      <span className="text-sm font-black text-white/55">
        {label}
      </span>

      <span
        className={`relative h-6 w-11 rounded-full transition ${
          checked
            ? "bg-primary"
            : "bg-white/10"
        }`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
            checked
              ? "left-6"
              : "left-1"
          }`}
        />
      </span>
    </button>
  );
}
