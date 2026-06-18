import {
  Check,
  ChevronRight,
  Coins,
  Crown,
  Lock,
  Package,
  ShoppingBag,
  Sparkles,
} from "lucide-react";

import {
  useMemo,
  useState,
} from "react";

import {
  STORE_UNITS,
  getStoreUnit,
  inferStoreUnitKey,
  type StoreUnitKey,
} from "../../config/storeUnits";

type UnitStoreItem = {
  id: string;
  name: string;
  description: string;
  category: string;
  rarity: string;
  price: number;
  image?: string;
  featured?: boolean;
  limited?: boolean;
  locked?: boolean;
  requirement?: string;
  unitKey?: StoreUnitKey;
};

export default function StoreUnitShowcase({
  items,
  credits,
  ownedItemIds,
  equipped,
  busyItemId,
  onBuy,
  onEquip,
  onPreview,
}: {
  items: UnitStoreItem[];
  credits: number;
  ownedItemIds: string[];
  equipped: any;
  busyItemId?: string | null;
  onBuy: (
    item: UnitStoreItem,
  ) => void;
  onEquip: (
    item: UnitStoreItem,
  ) => void;
  onPreview: (
    item: UnitStoreItem,
  ) => void;
}) {
  const [
    selectedUnit,
    setSelectedUnit,
  ] =
    useState<StoreUnitKey>(
      "GNR",
    );

  const itemsByUnit =
    useMemo(() => {
      const map =
        new Map<
          StoreUnitKey,
          UnitStoreItem[]
        >();

      STORE_UNITS.forEach(
        (
          unit,
        ) =>
          map.set(
            unit.key,
            [],
          ),
      );

      items.forEach(
        (
          item,
        ) => {
          const key =
            inferStoreUnitKey(
              item,
            );

          map.get(
            key,
          )?.push({
            ...item,
            unitKey:
              key,
          });
        },
      );

      return map;
    }, [
      items,
    ]);

  const unit =
    getStoreUnit(
      selectedUnit,
    );

  const selectedItems =
    (
      itemsByUnit.get(
        selectedUnit,
      ) ||
      []
    )
      .sort(
        (
          a,
          b,
        ) =>
          Number(
            Boolean(
              b.featured,
            ),
          ) -
            Number(
              Boolean(
                a.featured,
              ),
            ) ||
          b.price -
            a.price,
      )
      .slice(
        0,
        8,
      );

  const owned =
    new Set(
      ownedItemIds.map(
        String,
      ),
    );

  function isEquipped(
    item: UnitStoreItem,
  ) {
    if (
      item.category ===
      "MOLDURAS"
    ) {
      return (
        equipped?.frame ===
        item.id
      );
    }

    if (
      item.category ===
      "FUNDOS"
    ) {
      return (
        equipped?.background ===
        item.id
      );
    }

    if (
      item.category ===
      "TITULOS"
    ) {
      return (
        equipped?.title ===
        item.id
      );
    }

    if (
      item.category ===
      "TEMAS"
    ) {
      return (
        equipped?.theme ===
        item.id
      );
    }

    if (
      item.category ===
      "EMBLEMAS"
    ) {
      return (
        Array.isArray(
          equipped?.badges,
        ) &&
        equipped.badges.includes(
          item.id,
        )
      );
    }

    return false;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {STORE_UNITS.map(
          (
            candidate,
          ) => {
            const Icon =
              candidate.icon;

            const count =
              itemsByUnit.get(
                candidate.key,
              )?.length ||
              0;

            const active =
              candidate.key ===
              selectedUnit;

            return (
              <button
                key={
                  candidate.key
                }
                type="button"
                onClick={() =>
                  setSelectedUnit(
                    candidate.key,
                  )
                }
                className={`group rounded-[1.7rem] border p-4 text-left transition duration-300 ${
                  active
                    ? `${candidate.border} bg-gradient-to-br ${candidate.gradient} ${candidate.glow}`
                    : "border-white/10 bg-white/[.025] hover:-translate-y-1 hover:border-primary/25"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${
                      active
                        ? `${candidate.border} bg-black/25 ${candidate.text}`
                        : "border-white/10 bg-black/20 text-white/35"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>

                  <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[9px] font-black text-white/40">
                    {count}
                  </span>
                </div>

                <p className="mt-4 font-black text-white">
                  {candidate.shortName}
                </p>

                <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/35">
                  {candidate.description}
                </p>
              </button>
            );
          },
        )}
      </div>

      <section
        className={`relative overflow-hidden rounded-[2.3rem] border ${unit.border} bg-gradient-to-br ${unit.gradient} p-6 ${unit.glow} md:p-8`}
      >
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div
              className={`inline-flex items-center gap-2 rounded-full border ${unit.border} bg-black/20 px-4 py-2 text-[9px] font-black uppercase tracking-[.18em] ${unit.text}`}
            >
              <unit.icon className="h-4 w-4" />
              Loja da Unidade
            </div>

            <h3 className="mt-4 text-3xl font-black text-white md:text-4xl">
              {unit.name}
            </h3>

            <p
              className={`mt-2 text-sm font-black uppercase tracking-[.13em] ${unit.text}`}
            >
              {unit.slogan}
            </p>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/45">
              Coleção coordenada de fundos, molduras, emblemas,
              títulos, temas e exclusivos com identidade própria da unidade.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Stat
              label="Produtos"
              value={
                itemsByUnit.get(
                  selectedUnit,
                )?.length ||
                0
              }
              icon={
                Package
              }
            />

            <Stat
              label="Adquiridos"
              value={
                (
                  itemsByUnit.get(
                    selectedUnit,
                  ) ||
                  []
                ).filter(
                  (
                    item,
                  ) =>
                    owned.has(
                      item.id,
                    ),
                ).length
              }
              icon={
                Check
              }
            />

            <Stat
              label="Saldo"
              value={
                credits.toLocaleString(
                  "pt-PT",
                )
              }
              icon={
                Coins
              }
            />
          </div>
        </div>
      </section>

      {selectedItems.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {selectedItems.map(
            (
              item,
            ) => {
              const itemOwned =
                owned.has(
                  item.id,
                );

              const itemEquipped =
                isEquipped(
                  item,
                );

              const canAfford =
                credits >=
                  item.price;

              return (
                <article
                  key={
                    item.id
                  }
                  className="group overflow-hidden rounded-[1.8rem] border border-white/10 bg-black/25 transition duration-300 hover:-translate-y-1 hover:border-primary/25"
                >
                  <button
                    type="button"
                    onClick={() =>
                      onPreview(
                        item,
                      )
                    }
                    className="relative block h-44 w-full overflow-hidden bg-black/30 text-left"
                  >
                    {item.image ? (
                      <img
                        src={
                          item.image
                        }
                        alt={
                          item.name
                        }
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Package className="h-10 w-10 text-white/15" />
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />

                    <span className="absolute left-3 top-3 rounded-full border border-white/15 bg-black/60 px-3 py-1 text-[8px] font-black uppercase tracking-[.13em] text-white/75 backdrop-blur-md">
                      {item.category}
                    </span>

                    <span className="absolute bottom-3 left-3 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[8px] font-black uppercase tracking-[.13em] text-primary backdrop-blur-md">
                      {item.rarity}
                    </span>

                    {item.limited && (
                      <Crown className="absolute right-3 top-3 h-5 w-5 text-yellow-300" />
                    )}
                  </button>

                  <div className="p-4">
                    <p className="line-clamp-1 font-black text-white">
                      {item.name}
                    </p>

                    <p className="mt-2 line-clamp-2 min-h-10 text-xs leading-5 text-white/35">
                      {item.description}
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

                      {itemEquipped ? (
                        <span className="inline-flex items-center gap-2 rounded-xl border border-primary/25 bg-primary/10 px-3 py-2 text-xs font-black text-primary">
                          <Check className="h-4 w-4" />
                          Equipado
                        </span>
                      ) : itemOwned ? (
                        <button
                          type="button"
                          disabled={
                            busyItemId ===
                            item.id
                          }
                          onClick={() =>
                            onEquip(
                              item,
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-black text-primary-foreground disabled:opacity-40"
                        >
                          <Sparkles className="h-4 w-4" />
                          Equipar
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={
                            !canAfford ||
                            busyItemId ===
                              item.id ||
                            item.locked
                          }
                          onClick={() =>
                            onBuy(
                              item,
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-black text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {item.locked ? (
                            <Lock className="h-4 w-4" />
                          ) : (
                            <ShoppingBag className="h-4 w-4" />
                          )}
                          Comprar
                        </button>
                      )}
                    </div>

                    {item.locked &&
                      item.requirement && (
                        <p className="mt-3 rounded-xl border border-amber-400/15 bg-amber-500/[.06] p-2 text-[10px] leading-4 text-amber-200/55">
                          {item.requirement}
                        </p>
                      )}
                  </div>
                </article>
              );
            },
          )}
        </div>
      ) : (
        <div className="rounded-[2rem] border border-dashed border-white/10 bg-white/[.02] p-10 text-center">
          <Package className="mx-auto h-9 w-9 text-white/15" />

          <p className="mt-4 font-black text-white/55">
            Ainda não existem produtos classificados nesta unidade.
          </p>

          <p className="mt-2 text-sm text-white/30">
            Os produtos podem ser associados automaticamente pelo nome,
            coleção, roles obrigatórias ou pelo campo unitKey.
          </p>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value:
    | string
    | number;
  icon: any;
}) {
  return (
    <div className="min-w-[105px] rounded-2xl border border-white/10 bg-black/25 p-4">
      <Icon className="h-4 w-4 text-primary" />

      <p className="mt-3 text-xl font-black text-white">
        {value}
      </p>

      <p className="mt-1 text-[8px] font-black uppercase tracking-[.13em] text-white/30">
        {label}
      </p>
    </div>
  );
}
