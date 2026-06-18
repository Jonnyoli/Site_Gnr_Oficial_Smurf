import { useEffect, useMemo, useState } from "react";
import {
  ExternalLink,
  Loader2,
  Megaphone,
  Pin,
  RefreshCw,
  Search,
} from "lucide-react";

export default function Comunicados() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/announcements", {
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          payload?.error || "Não foi possível carregar os comunicados.",
        );
      }

      setItems(payload.announcements || []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Não foi possível carregar os comunicados.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();

    return items.filter((item) =>
      !term ||
      [item.title, item.content, item.authorName]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(term),
        ),
    );
  }, [items, query]);

  return (
    <div className="space-y-6 pb-14">
      <section className="rounded-[2.6rem] border border-amber-400/15 bg-[#100d06]/95 p-7">
        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-300">
          Comunicação institucional
        </p>
        <h1 className="mt-3 text-4xl font-black text-white">
          Comunicados Oficiais
        </h1>
        <p className="mt-3 text-sm text-white/35">
          Sincronizado com o canal 1229940972134207498, do mais recentemente publicado para o mais antigo.
        </p>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-red-200">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3 md:flex-row">
        <div className="flex h-14 flex-1 items-center rounded-2xl border border-white/10 bg-[#06100c]/90 px-4">
          <Search className="mr-3 h-5 w-5 text-amber-300" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Pesquisar comunicado..."
            className="h-full flex-1 bg-transparent text-sm text-white outline-none"
          />
        </div>

        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-[8px] font-black uppercase text-white/50"
        >
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </button>
      </div>

      {loading ? (
        <div className="flex min-h-[320px] items-center justify-center">
          <Loader2 className="h-9 w-9 animate-spin text-amber-300" />
        </div>
      ) : (
        <section className="space-y-4">
          {filtered.map((item) => (
            <article
              key={item.id}
              className="rounded-[1.8rem] border border-white/10 bg-[#06100c]/90 p-6"
            >
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-500/10 text-amber-300">
                  {item.pinned ? (
                    <Pin className="h-5 w-5" />
                  ) : (
                    <Megaphone className="h-5 w-5" />
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        {(item.units || []).map((unit: any) => (
                          <span
                            key={`${item.id}-${unit.key}`}
                            className="rounded-full border border-amber-400/20 bg-amber-500/10 px-2.5 py-1 text-[8px] font-black uppercase text-amber-300"
                          >
                            {unit.name || unit.key}
                          </span>
                        ))}

                        <span className="text-[8px] font-black uppercase text-white/35">
                          {item.authorName} ·{" "}
                          {new Date(item.publishedAt).toLocaleString("pt-PT")}
                        </span>
                      </div>
                      <h2 className="mt-2 text-2xl font-black text-white">
                        {item.title}
                      </h2>

                      {(item.units || []).length > 1 && (
                        <p className="mt-2 text-xs text-white/30">
                          {(item.units || [])
                            .map((unit: any) => unit.name)
                            .join(" · ")}
                        </p>
                      )}
                    </div>

                    {item.jumpUrl && (
                      <a
                        href={item.jumpUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[8px] font-black uppercase text-white/45"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Discord
                      </a>
                    )}
                  </div>

                  <p className="mt-4 whitespace-pre-line text-sm leading-7 text-white/45">
                    {item.content}
                  </p>

                  {item.attachments?.length > 0 && (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {item.attachments.map((attachment: any) => (
                        <a
                          key={attachment.id}
                          href={attachment.url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-xs text-white/55"
                        >
                          {attachment.filename}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
