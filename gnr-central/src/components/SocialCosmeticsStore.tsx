import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Eye,
  Heart,
  ShoppingBag,
  Sparkles,
} from "lucide-react";

const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(
    /\/$/,
    "",
  ) || "";

async function request(path: string) {
  const response = await fetch(
    `${API_BASE_URL}${path}`,
    {
      credentials: "include",
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
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

export default function SocialCosmeticsStore({
  onPreview,
  onBuy,
  wishlistItemIds = [],
  onToggleWishlist,
}: {
  onPreview?: (item: any) => void;
  onBuy?: (item: any) => void;
  wishlistItemIds?: string[];
  onToggleWishlist?: (item: any) => void;
}) {
  const [items, setItems] =
    useState<any[]>([]);

  const [type, setType] =
    useState("ALL");

  useEffect(() => {
    void request(
      "/api/profile-social-customization/catalog",
    ).then((payload) =>
      setItems(
        payload.items || [],
      ),
    );
  }, []);

  const filtered =
    useMemo(
      () =>
        type === "ALL"
          ? items
          : items.filter(
              (item) =>
                item.type === type,
            ),
      [items, type],
    );

  return (
    <section className="portal-v7-social-store space-y-5">
      <div className="flex flex-wrap gap-2">
        {[
          ["ALL", "Todos"],
          [
            "MURAL_BACKGROUND",
            "Fundos do mural",
          ],
          [
            "COMMENT_STYLE",
            "Comentários",
          ],
          [
            "SIGNATURE",
            "Assinaturas",
          ],
          [
            "REACTION_PACK",
            "Reações",
          ],
          [
            "SOCIAL_BADGE",
            "Emblemas sociais",
          ],
          [
            "HIGHLIGHT_STYLE",
            "Destaques",
          ],
          [
            "ENTRY_EFFECT",
            "Efeitos",
          ],
        ].map(
          ([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() =>
                setType(value)
              }
              className={`rounded-full border px-4 py-2 text-[8px] font-black uppercase ${
                type === value
                  ? "border-primary/25 bg-primary/10 text-primary"
                  : "border-white/10 bg-white/[0.03] text-white/35"
              }`}
            >
              {label}
            </button>
          ),
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((item) => (
          <article
            key={item.id}
            className="overflow-hidden rounded-[1.7rem] border border-white/10 bg-[#06100c]/90"
          >
            {item.imageUrl && (
              <div
                className="h-40 bg-cover bg-center"
                style={{
                  backgroundImage: `linear-gradient(rgba(0,0,0,.15),rgba(0,0,0,.65)),url(${item.imageUrl})`,
                }}
              />
            )}

            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[8px] font-black uppercase text-primary">
                    {item.rarity}
                  </p>

                  <h3 className="mt-2 text-lg font-black text-white">
                    {item.name}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    onToggleWishlist?.(
                      item,
                    )
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]"
                >
                  <Heart
                    className={`h-4 w-4 ${
                      wishlistItemIds.includes(
                        item.id,
                      )
                        ? "fill-pink-400 text-pink-400"
                        : "text-white/30"
                    }`}
                  />
                </button>
              </div>

              <p className="mt-3 text-sm leading-6 text-white/35">
                {item.description}
              </p>

              <div className="mt-5 flex items-center justify-between">
                <p className="text-xl font-black text-white">
                  {item.price}
                  <span className="ml-1 text-xs text-white/30">
                    créditos
                  </span>
                </p>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (onPreview) {
                      onPreview(item);
                      return;
                    }

                    window.location.assign(
                      `/definicoes/personalizacao-social?preview=${encodeURIComponent(
                        item.id,
                      )}`,
                    );
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-[8px] font-black uppercase text-white/45"
                >
                  <Eye className="h-4 w-4" />
                  Experimentar
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (onBuy) {
                      onBuy(item);
                      return;
                    }

                    window.location.assign(
                      `/loja?item=${encodeURIComponent(
                        item.id,
                      )}`,
                    );
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-3 text-[8px] font-black uppercase text-primary-foreground"
                >
                  <ShoppingBag className="h-4 w-4" />
                  Comprar
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
