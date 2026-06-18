import {
  useMemo,
  useState,
} from "react";

import {
  Check,
  LayoutDashboard,
  Loader2,
  Lock,
  Paintbrush,
  Sparkles,
} from "lucide-react";

import {
  useData,
} from "../../context/DataContext";

import {
  DEFAULT_SITE_THEME_ID,
  SITE_THEME_LIST,
} from "../theme/premiumThemes";

export default function ProfileThemeSelector() {
  const {
    storeInventory,
    equipStoreItem,
    refreshStore,
  } =
    useData() as any;

  const [
    busy,
    setBusy,
  ] =
    useState<string | null>(
      null,
    );

  const [
    message,
    setMessage,
  ] =
    useState("");

  const owned =
    useMemo(
      () =>
        new Set(
          (
            storeInventory
              ?.ownedItems ||
            []
          ).map(String),
        ),
      [
        storeInventory
          ?.ownedItems,
      ],
    );

  const equipped =
    String(
      storeInventory
        ?.equipped
        ?.theme ||
      DEFAULT_SITE_THEME_ID,
    );

  async function selectTheme(
    themeId: string,
  ) {
    if (!owned.has(themeId)) {
      setMessage(
        "Adquire este tema na Loja antes de o aplicar.",
      );

      return;
    }

    setBusy(themeId);
    setMessage("");

    try {
      await equipStoreItem(
        themeId,
      );

      await refreshStore();

      setMessage(
        "Tema e layout aplicados a toda a Central.",
      );
    } catch (error: any) {
      setMessage(
        error?.message ||
        "Não foi possível aplicar o tema.",
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="rounded-[2rem] border border-white/10 bg-black/20 p-6">
      <div className="flex items-center gap-3 text-primary">
        <Paintbrush className="h-5 w-5" />

        <span className="text-[10px] font-black uppercase tracking-[.18em]">
          Personalização premium
        </span>
      </div>

      <h2 className="mt-3 text-2xl font-black text-white">
        Tema e layout da Central
      </h2>

      <p className="mt-2 max-w-3xl text-sm leading-6 text-white/45">
        Alguns temas mudam apenas a identidade visual. Outros alteram também
        a densidade, cantos, sidebar, topbar e organização visual das páginas.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {SITE_THEME_LIST.map(
          (theme) => {
            const isOwned =
              owned.has(
                theme.id,
              );

            const isEquipped =
              equipped ===
              theme.id;

            return (
              <button
                key={
                  theme.id
                }
                type="button"
                disabled={
                  !isOwned ||
                  Boolean(busy)
                }
                onClick={() =>
                  void selectTheme(
                    theme.id,
                  )
                }
                className={`group relative overflow-hidden rounded-[1.7rem] border p-3 text-left transition duration-300 ${
                  isEquipped
                    ? "border-primary/50 bg-primary/10 shadow-[0_0_42px_var(--site-theme-glow)]"
                    : "border-white/10 bg-black/25 hover:-translate-y-1 hover:border-primary/30"
                } disabled:cursor-not-allowed disabled:opacity-55`}
              >
                <div className="relative overflow-hidden rounded-2xl border border-white/10">
                  <img
                    src={
                      theme.image
                    }
                    alt={
                      theme.name
                    }
                    className="h-36 w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                  />

                  <span className="absolute left-3 top-3 rounded-full border border-white/15 bg-black/55 px-3 py-1 text-[8px] font-black uppercase tracking-[.16em] text-white backdrop-blur-md">
                    {theme.tag}
                  </span>

                  <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/55 px-3 py-1 text-[8px] font-black uppercase tracking-[.12em] text-white/80 backdrop-blur-md">
                    <LayoutDashboard className="h-3 w-3" />
                    {theme.layout}
                  </span>

                  {isEquipped && (
                    <span className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                      <Check className="h-4 w-4" />
                    </span>
                  )}
                </div>

                <div className="px-1 pb-1 pt-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-white">
                        {theme.name}
                      </p>

                      <p className="mt-1 text-[9px] font-black uppercase tracking-[.13em] text-primary">
                        {theme.rarity}
                      </p>
                    </div>

                    <span className="rounded-full border border-white/10 bg-black/25 px-2 py-1 text-[9px] font-black text-white/45">
                      {theme.price}
                    </span>
                  </div>

                  <p className="mt-3 min-h-10 text-xs leading-5 text-white/40">
                    {theme.description}
                  </p>

                  <div className="mt-4 flex items-center gap-2 text-xs font-black">
                    {busy ===
                    theme.id ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        A aplicar
                      </>
                    ) : isEquipped ? (
                      <>
                        <Check className="h-4 w-4 text-primary" />
                        <span className="text-primary">
                          Equipado
                        </span>
                      </>
                    ) : isOwned ? (
                      <>
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span className="text-white/60">
                          Aplicar
                        </span>
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4 text-white/30" />
                        <span className="text-white/30">
                          Adquirir na Loja
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </button>
            );
          },
        )}
      </div>

      {message && (
        <p className="mt-5 rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white/60">
          {message}
        </p>
      )}
    </section>
  );
}
