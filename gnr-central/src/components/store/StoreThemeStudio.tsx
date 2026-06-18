import {
  Check,
  ChevronRight,
  Coins,
  LayoutDashboard,
  Lock,
  Paintbrush,
  ShoppingBag,
  Sparkles,
} from "lucide-react";

import {
  SITE_THEME_LIST,
} from "../theme/premiumThemes";

type ThemeStoreItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  image?: string;
};

export default function StoreThemeStudio({
  storeItems,
  ownedItemIds,
  equippedThemeId,
  credits,
  onBuy,
  onEquip,
  onOpenCatalog,
}: {
  storeItems: ThemeStoreItem[];
  ownedItemIds: string[];
  equippedThemeId?: string | null;
  credits: number;
  onBuy: (
    item: ThemeStoreItem,
  ) => void;
  onEquip: (
    item: ThemeStoreItem,
  ) => void;
  onOpenCatalog: () => void;
}) {
  const itemMap =
    new Map(
      storeItems.map(
        (item) => [
          item.id,
          item,
        ],
      ),
    );

  const owned =
    new Set(
      ownedItemIds,
    );

  return (
    <section className="relative overflow-hidden rounded-[2.4rem] border border-white/10 bg-black/30 p-5 shadow-[0_30px_120px_rgba(0,0,0,.32)] md:p-7">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_18%,hsl(var(--primary)/.18),transparent_28%),radial-gradient(circle_at_92%_80%,hsl(var(--accent)/.12),transparent_34%)]" />

      <div className="relative">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-2 text-[9px] font-black uppercase tracking-[.18em] text-primary">
              <Paintbrush className="h-4 w-4" />
              Theme Studio
            </div>

            <h2 className="mt-4 text-3xl font-black tracking-tight text-white md:text-4xl">
              Muda a Central inteira
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/45">
              Estes temas não mudam apenas cores. Alguns alteram também a
              densidade, cantos, composição, sidebar, topbar e atmosfera geral.
            </p>
          </div>

          <button
            type="button"
            onClick={
              onOpenCatalog
            }
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-primary/25 bg-primary/10 px-5 py-3 text-xs font-black uppercase tracking-[.12em] text-primary transition hover:bg-primary hover:text-primary-foreground"
          >
            Ver todos os temas
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-7 flex gap-4 overflow-x-auto pb-3">
          {SITE_THEME_LIST.map(
            (theme) => {
              const item =
                itemMap.get(
                  theme.id,
                ) || {
                  id:
                    theme.id,
                  name:
                    theme.name,
                  description:
                    theme.description,
                  price:
                    theme.price,
                  image:
                    theme.image,
                };

              const isOwned =
                owned.has(
                  theme.id,
                );

              const isEquipped =
                equippedThemeId ===
                theme.id;

              const canAfford =
                credits >=
                item.price;

              return (
                <article
                  key={
                    theme.id
                  }
                  className={`group min-w-[286px] max-w-[286px] overflow-hidden rounded-[1.8rem] border transition duration-300 ${
                    isEquipped
                      ? "border-primary/45 bg-primary/[.09] shadow-[0_0_38px_var(--site-theme-glow)]"
                      : "border-white/10 bg-black/25 hover:-translate-y-1 hover:border-primary/30"
                  }`}
                >
                  <div className="relative h-40 overflow-hidden">
                    <img
                      src={
                        theme.image
                      }
                      alt={
                        theme.name
                      }
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                    <span className="absolute left-3 top-3 rounded-full border border-white/15 bg-black/55 px-3 py-1 text-[8px] font-black uppercase tracking-[.14em] text-white backdrop-blur-md">
                      {theme.tag}
                    </span>

                    <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/55 px-3 py-1 text-[8px] font-black uppercase tracking-[.12em] text-white/85 backdrop-blur-md">
                      <LayoutDashboard className="h-3 w-3" />
                      {theme.layout}
                    </span>

                    {isEquipped && (
                      <span className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-4 w-4" />
                      </span>
                    )}
                  </div>

                  <div className="p-4">
                    <p className="font-black text-white">
                      {theme.name}
                    </p>

                    <p className="mt-2 min-h-10 text-xs leading-5 text-white/38">
                      {theme.description}
                    </p>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-lg font-black text-primary">
                          {item.price.toLocaleString(
                            "pt-PT",
                          )}
                        </p>

                        <p className="text-[8px] font-black uppercase tracking-[.12em] text-white/25">
                          créditos
                        </p>
                      </div>

                      {isEquipped ? (
                        <span className="inline-flex items-center gap-2 rounded-xl border border-primary/25 bg-primary/10 px-3 py-2 text-xs font-black text-primary">
                          <Check className="h-4 w-4" />
                          Equipado
                        </span>
                      ) : isOwned ? (
                        <button
                          type="button"
                          onClick={() =>
                            onEquip(
                              item,
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-black text-primary-foreground"
                        >
                          <Sparkles className="h-4 w-4" />
                          Aplicar
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={
                            !canAfford
                          }
                          onClick={() =>
                            onBuy(
                              item,
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-black text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {canAfford ? (
                            <ShoppingBag className="h-4 w-4" />
                          ) : (
                            <Lock className="h-4 w-4" />
                          )}
                          Comprar
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            },
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs text-white/40">
          <Coins className="h-4 w-4 text-primary" />
          Saldo atual:
          <strong className="text-white">
            {credits.toLocaleString(
              "pt-PT",
            )} créditos
          </strong>
          <span className="text-white/20">
            ·
          </span>
          <span>
            O tema comprado fica disponível no GuardaPerfil.
          </span>
        </div>
      </div>
    </section>
  );
}
