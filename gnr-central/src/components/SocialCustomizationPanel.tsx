import {
  useEffect,
  useMemo,
  useState,
} from "react";

import SocialCustomizationPreview from "./SocialCustomizationPreview";

import {
  BadgeCheck,
  Image,
  MessageSquare,
  Paintbrush,
  Save,
  Sparkles,
} from "lucide-react";

const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(
    /\/$/,
    "",
  ) || "";

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

const SLOT_META: Record<
  string,
  {
    label: string;
    type: string;
  }
> = {
  muralBackground: {
    label: "Fundo do mural",
    type: "MURAL_BACKGROUND",
  },
  commentStyle: {
    label: "Estilo dos comentários",
    type: "COMMENT_STYLE",
  },
  signature: {
    label: "Assinatura",
    type: "SIGNATURE",
  },
  reactionPack: {
    label: "Pack de reações",
    type: "REACTION_PACK",
  },
  highlightedCommentStyle: {
    label:
      "Comentário em destaque",
    type: "HIGHLIGHT_STYLE",
  },
  entryEffect: {
    label: "Efeito social",
    type: "ENTRY_EFFECT",
  },
};

export default function SocialCustomizationPanel() {
  const [catalog, setCatalog] =
    useState<any[]>([]);

  const [profile, setProfile] =
    useState<any>(null);

  const [error, setError] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [
    previewItem,
    setPreviewItem,
  ] = useState<any>(null);

  async function load() {
    try {
      const [catalogData, me] =
        await Promise.all([
          request(
            "/api/profile-social-customization/catalog",
          ),
          request(
            "/api/profile-social-customization/me",
          ),
        ]);

      setCatalog(
        catalogData.items || [],
      );

      setProfile(me);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Não foi possível carregar a personalização social.",
      );
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const owned =
    useMemo(
      () =>
        new Set(
          profile?.ownedItems || [],
        ),
      [profile?.ownedItems],
    );

  async function equip(
    slot: string,
    itemId: string | null,
  ) {
    setSaving(true);

    try {
      await request(
        "/api/profile-social-customization/me/equipped",
        {
          method: "PUT",
          body: JSON.stringify({
            slot,
            itemId,
          }),
        },
      );

      await load();
    } catch (equipError) {
      setError(
        equipError instanceof Error
          ? equipError.message
          : "Não foi possível equipar o item.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveMuralSettings() {
    setSaving(true);

    try {
      await request(
        "/api/profile-social-customization/me/mural-settings",
        {
          method: "PUT",
          body: JSON.stringify(
            profile?.muralSettings,
          ),
        },
      );

      await load();
    } finally {
      setSaving(false);
    }
  }

  if (!profile) {
    return (
      <section className="rounded-[2rem] border border-white/10 bg-[#06100c]/90 p-6 text-sm text-white/35">
        A carregar personalização social...
      </section>
    );
  }

  return (
    <section className="portal-v7-customization space-y-5">
      <div className="portal-v7-customization-hero rounded-[1.65rem] border border-primary/15 bg-[#06100c]/95 p-6">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
            <Paintbrush className="h-5 w-5" />
          </span>

          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-primary">
              Personalização social
            </p>

            <h2 className="mt-1 text-2xl font-black text-white">
              Mural, comentários e assinatura
            </h2>
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">
            {error}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {Object.entries(
          SLOT_META,
        ).map(
          ([slot, meta]) => {
            const items =
              catalog.filter(
                (item) =>
                  item.type ===
                  meta.type,
              );

            return (
              <section
                key={slot}
                className="portal-v7-customization-slot rounded-[1.4rem] border border-white/10 bg-[#06100c]/90 p-5"
              >
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-primary" />

                  <h3 className="font-black text-white">
                    {meta.label}
                  </h3>
                </div>

                <div className="mt-4 space-y-2">
                  <button
                    type="button"
                    onClick={() =>
                      void equip(
                        slot,
                        null,
                      )
                    }
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-left text-sm text-white/35"
                  >
                    Nenhum
                  </button>

                  {items.map(
                    (item) => {
                      const isOwned =
                        owned.has(
                          item.id,
                        );

                      const isEquipped =
                        profile.equipped?.[
                          slot
                        ] ===
                        item.id;

                      return (
                        <button
                          type="button"
                          key={
                            item.id
                          }
                          disabled={
                            saving
                          }
                          onClick={() => {
                            setPreviewItem(
                              item,
                            );

                            if (isOwned) {
                              void equip(
                                slot,
                                item.id,
                              );
                            }
                          }}
                          className={`w-full rounded-xl border p-4 text-left transition ${
                            isEquipped
                              ? "border-primary/30 bg-primary/10"
                              : "border-white/10 bg-black/20"
                          } ${
                            !isOwned
                              ? "border-amber-400/15 hover:border-amber-300/30"
                              : "hover:border-primary/20"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
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

                            {isEquipped && (
                              <BadgeCheck className="h-5 w-5 text-primary" />
                            )}
                          </div>

                          <p className="mt-3 text-xs leading-5 text-white/35">
                            {
                              item.description
                            }
                          </p>

                          {!isOwned && (
                            <p className="mt-3 text-[8px] font-black uppercase text-amber-300">
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
          },
        )}
      </div>

      <SocialCustomizationPreview
        catalog={catalog}
        draft={profile}
        previewItem={previewItem}
      />

      <section className="portal-v7-customization-slot rounded-[1.4rem] border border-white/10 bg-[#06100c]/90 p-5">
        <div className="flex items-center gap-3">
          <Image className="h-5 w-5 text-primary" />

          <h3 className="font-black text-white">
            Ajustes do fundo do mural
          </h3>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          <label className="text-xs text-white/40">
            Escurecimento
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={
                profile.muralSettings
                  ?.overlayOpacity ??
                0.72
              }
              onChange={(event) =>
                setProfile(
                  (current: any) => ({
                    ...current,
                    muralSettings: {
                      ...current.muralSettings,
                      overlayOpacity:
                        Number(
                          event
                            .target
                            .value,
                        ),
                    },
                  }),
                )
              }
              className="mt-3 w-full"
            />
          </label>

          <label className="text-xs text-white/40">
            Desfoque
            <input
              type="range"
              min="0"
              max="16"
              step="1"
              value={
                profile.muralSettings
                  ?.blur || 0
              }
              onChange={(event) =>
                setProfile(
                  (current: any) => ({
                    ...current,
                    muralSettings: {
                      ...current.muralSettings,
                      blur:
                        Number(
                          event
                            .target
                            .value,
                        ),
                    },
                  }),
                )
              }
              className="mt-3 w-full"
            />
          </label>

          <label className="text-xs text-white/40">
            Posição
            <select
              value={
                profile.muralSettings
                  ?.position ||
                "center"
              }
              onChange={(event) =>
                setProfile(
                  (current: any) => ({
                    ...current,
                    muralSettings: {
                      ...current.muralSettings,
                      position:
                        event
                          .target
                          .value,
                    },
                  }),
                )
              }
              className="mt-3 h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-white"
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

        <button
          type="button"
          disabled={saving}
          onClick={() =>
            void saveMuralSettings()
          }
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-[8px] font-black uppercase text-primary-foreground"
        >
          <Save className="h-4 w-4" />
          Guardar ajustes
        </button>
      </section>
    </section>
  );
}
