import { useState } from "react";
import { FileSearch, Loader2, Search } from "lucide-react";

export default function PesquisaDepartamentos() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function runSearch() {
    if (query.trim().length < 2) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/department-search?q=${encodeURIComponent(query.trim())}`,
        {
          credentials: "include",
          cache: "no-store",
          headers: { Accept: "application/json" },
        },
      );

      const payload = await response.json();

      if (!response.ok) throw new Error(payload?.error || "Pesquisa falhou.");

      setResults(payload.results || []);
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "Erro.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 pb-14">
      <section className="rounded-[2.6rem] border border-sky-400/15 bg-[#06100c]/95 p-7">
        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-sky-300">
          Pesquisa administrativa
        </p>
        <h1 className="mt-3 text-4xl font-black text-white">
          Pesquisa Transversal
        </h1>
        <p className="mt-3 text-sm text-white/35">
          Procura processos, militares, documentos, decisões e códigos.
        </p>
      </section>

      <div className="flex h-14 items-center rounded-2xl border border-white/10 bg-[#06100c]/90 px-4">
        <Search className="mr-3 h-5 w-5 text-sky-300" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && void runSearch()}
          placeholder="Nome, Discord ID, processo, documento ou código..."
          className="h-full flex-1 bg-transparent text-sm text-white outline-none"
        />
        <button
          type="button"
          onClick={() => void runSearch()}
          className="rounded-xl bg-sky-500 px-5 py-3 text-[8px] font-black uppercase text-white"
        >
          Pesquisar
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[250px] items-center justify-center">
          <Loader2 className="h-9 w-9 animate-spin text-sky-300" />
        </div>
      ) : (
        <section className="space-y-3">
          {results.map((item) => (
            <article
              key={`${item.type}-${item.id}`}
              className="rounded-[1.5rem] border border-white/10 bg-[#06100c]/90 p-5"
            >
              <div className="flex items-center gap-4">
                <FileSearch className="h-5 w-5 text-sky-300" />
                <div>
                  <p className="font-black text-white">{item.title}</p>
                  <p className="mt-1 text-xs text-white/35">{item.subtitle}</p>
                </div>
                <span className="ml-auto rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[7px] font-black uppercase text-white/45">
                  {item.status}
                </span>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
