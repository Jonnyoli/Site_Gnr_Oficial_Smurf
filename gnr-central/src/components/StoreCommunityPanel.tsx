import {
  useEffect,
  useState,
} from "react";

import {
  Gift,
  Heart,
  Inbox,
  Send,
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

export default function StoreCommunityPanel({
  ownedItemIds = [],
  onInventoryChanged,
}: {
  ownedItemIds?: string[];
  onInventoryChanged?: () =>
    Promise<unknown> | unknown;
}) {
  const [data, setData] =
    useState<any>({
      wishlist: [],
      sent: [],
      received: [],
    });

  const [recipientId, setRecipientId] =
    useState("");

  const [itemId, setItemId] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  async function load() {
    try {
      setData(
        await request(
          "/api/store-social/me",
        ),
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Não foi possível carregar a área social.",
      );
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function sendGift() {
    try {
      await request(
        "/api/store-social/gifts",
        {
          method: "POST",
          body: JSON.stringify({
            recipientDiscordId:
              recipientId,
            itemId,
            message,
          }),
        },
      );

      setRecipientId("");
      setItemId("");
      setMessage("");
      await load();
    } catch (giftError) {
      setError(
        giftError instanceof Error
          ? giftError.message
          : "Não foi possível enviar o presente.",
      );
    }
  }

  async function answerGift(
    giftId: string,
    action:
      | "accept"
      | "decline",
  ) {
    try {
      await request(
        `/api/store-social/gifts/${giftId}/${action}`,
        {
          method: "POST",
        },
      );

      await load();
      await onInventoryChanged?.();
    } catch (answerError) {
      setError(
        answerError instanceof Error
          ? answerError.message
          : "Não foi possível responder ao presente.",
      );
    }
  }

  return (
    <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      <div className="rounded-[2rem] border border-white/10 bg-[#06100c]/90 p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-pink-400/20 bg-pink-500/10 text-pink-300">
            <Gift className="h-5 w-5" />
          </span>

          <div>
            <p className="text-[8px] font-black uppercase tracking-[0.15em] text-pink-300">
              Presentes
            </p>

            <h3 className="mt-1 text-xl font-black text-white">
              Oferecer um item
            </h3>
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">
            {error}
          </p>
        )}

        <div className="mt-5 space-y-3">
          <input
            value={recipientId}
            onChange={(event) =>
              setRecipientId(
                event.target.value,
              )
            }
            placeholder="Discord ID do destinatário"
            className="h-12 w-full rounded-xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
          />

          <select
            value={itemId}
            onChange={(event) =>
              setItemId(
                event.target.value,
              )
            }
            className="h-12 w-full rounded-xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
          >
            <option value="">
              Escolher item do inventário
            </option>

            {ownedItemIds.map(
              (ownedId) => (
                <option
                  key={ownedId}
                  value={ownedId}
                >
                  {ownedId}
                </option>
              ),
            )}
          </select>

          <textarea
            value={message}
            onChange={(event) =>
              setMessage(
                event.target.value,
              )
            }
            maxLength={250}
            rows={3}
            placeholder="Mensagem opcional..."
            className="w-full resize-none rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white outline-none"
          />

          <button
            type="button"
            disabled={
              !recipientId.trim() ||
              !itemId
            }
            onClick={() =>
              void sendGift()
            }
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-[8px] font-black uppercase text-primary-foreground disabled:opacity-35"
          >
            <Send className="h-4 w-4" />
            Enviar presente
          </button>
        </div>
      </div>

      <div className="rounded-[2rem] border border-white/10 bg-[#06100c]/90 p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
            <Inbox className="h-5 w-5" />
          </span>

          <div>
            <p className="text-[8px] font-black uppercase tracking-[0.15em] text-primary">
              Caixa de presentes
            </p>

            <h3 className="mt-1 text-xl font-black text-white">
              Recebidos
            </h3>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {data.received?.length ? (
            data.received.map(
              (gift: any) => (
                <article
                  key={gift._id}
                  className="rounded-xl border border-white/10 bg-black/20 p-4"
                >
                  <p className="font-black text-white">
                    {gift.itemId}
                  </p>

                  <p className="mt-1 text-xs text-white/35">
                    De {gift.senderName}
                  </p>

                  {gift.message && (
                    <p className="mt-3 text-sm leading-6 text-white/50">
                      {gift.message}
                    </p>
                  )}

                  {gift.status ===
                    "SENT" && (
                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          void answerGift(
                            gift._id,
                            "accept",
                          )
                        }
                        className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-2 text-[8px] font-black uppercase text-primary"
                      >
                        Aceitar
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          void answerGift(
                            gift._id,
                            "decline",
                          )
                        }
                        className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-[8px] font-black uppercase text-white/40"
                      >
                        Recusar
                      </button>
                    </div>
                  )}

                  {gift.status !==
                    "SENT" && (
                    <span className="mt-4 inline-block rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[7px] font-black uppercase text-white/35">
                      {gift.status}
                    </span>
                  )}
                </article>
              ),
            )
          ) : (
            <p className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-white/25">
              Ainda não recebeste presentes.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
