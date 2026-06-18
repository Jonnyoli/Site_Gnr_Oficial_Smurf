import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  FileText,
  Loader2,
  MapPin,
  Search,
  Shield,
  UserRound,
} from "lucide-react";
import { useData } from "../context/DataContext";

type RemoteResults = {
  operations: any[];
  documents: any[];
};

function queryFromLocation(location: string) {
  const index = location.indexOf("?");
  if (index < 0) return "";
  return new URLSearchParams(location.slice(index + 1)).get("q") || "";
}

export default function PesquisaGlobal() {
  const [location] = useLocation();
  const { guardas } = useData() as any;
  const [query, setQuery] = useState(() => queryFromLocation(location));
  const [remote, setRemote] = useState<RemoteResults>({
    operations: [],
    documents: [],
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setQuery(queryFromLocation(location));
  }, [location]);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setRemote({ operations: [], documents: [] });
      return;
    }

    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/global-search?q=${encodeURIComponent(term)}`,
          { credentials: "include" },
        );
        const data = await response.json();
        if (response.ok) setRemote(data);
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => window.clearTimeout(timer);
  }, [query]);

  const localGuards = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (term.length < 2) return [];

    const list = Array.isArray(guardas)
      ? guardas
      : guardas?.items || guardas?.data || [];

    return list
      .filter((guard: any) =>
        [
          guard?.nome,
          guard?.displayName,
          guard?.username,
          guard?.posto,
          guard?.rank,
          guard?.unidade,
          guard?.discordId,
          guard?.numero,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value).toLowerCase().includes(term),
          ),
      )
      .slice(0, 30);
  }, [guardas, query]);

  return (
    <div className="space-y-6 pb-12">
      <section className="rounded-[2.6rem] border border-primary/15 bg-[#06100c]/95 p-7">
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">
          Pesquisa transversal
        </p>
        <h1 className="mt-3 text-4xl font-black text-white">
          Pesquisa Global Inteligente
        </h1>

        <div className="mt-6 flex h-14 items-center rounded-2xl border border-white/10 bg-black/30 px-4">
          <Search className="mr-3 h-5 w-5 text-primary" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Militar, processo, documento, local ou código..."
            className="h-full flex-1 bg-transparent text-sm text-white outline-none"
          />
          {loading && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
        </div>
      </section>

      <ResultSection title="Efetivo" icon={UserRound} count={localGuards.length}>
        {localGuards.map((guard: any) => {
          const id = String(guard?.discordId || guard?.id || guard?._id || "");
          return (
            <Link
              key={id}
              href={`/guardas/${id}`}
              className="rounded-2xl border border-white/10 bg-black/20 p-4 hover:border-primary/25"
            >
              <p className="font-black text-white">
                {guard?.nome || guard?.displayName || guard?.username || "Militar"}
              </p>
              <p className="mt-1 text-xs text-white/35">
                {guard?.posto || guard?.rank || "Operacional"} ·{" "}
                {guard?.unidade || "Sem unidade"}
              </p>
            </Link>
          );
        })}
      </ResultSection>

      <ResultSection
        title="Operações e investigações"
        icon={Shield}
        count={remote.operations.length}
      >
        {remote.operations.map((item) => (
          <Link
            key={item._id}
            href={
              item.primaryUnit === "NIC"
                ? `/unidades/nic/investigacoes/${item._id}`
                : `/unidades/${String(item.primaryUnit).toLowerCase()}`
            }
            className="rounded-2xl border border-white/10 bg-black/20 p-4 hover:border-blue-400/25"
          >
            <p className="font-black text-white">
              {item.caseNumber || item.title}
            </p>
            <p className="mt-1 text-xs text-white/35">
              {item.title} · {item.primaryUnit} · {item.status}
            </p>
            {item.location && (
              <p className="mt-2 flex items-center gap-2 text-[10px] text-white/25">
                <MapPin className="h-3.5 w-3.5" />
                {item.location}
              </p>
            )}
          </Link>
        ))}
      </ResultSection>

      <ResultSection
        title="Documentos"
        icon={FileText}
        count={remote.documents.length}
      >
        {remote.documents.map((item) => (
          <Link
            key={item._id}
            href="/documentos"
            className="rounded-2xl border border-white/10 bg-black/20 p-4 hover:border-violet-400/25"
          >
            <p className="font-black text-white">{item.title}</p>
            <p className="mt-1 line-clamp-2 text-xs text-white/35">
              {item.description || item.category}
            </p>
          </Link>
        ))}
      </ResultSection>
    </div>
  );
}

function ResultSection({
  title,
  icon: Icon,
  count,
  children,
}: {
  title: string;
  icon: any;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#06100c]/90 p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-black text-white">{title}</h2>
        </div>
        <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-black text-white">
          {count}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {count > 0 ? children : (
          <p className="text-sm text-white/30">Sem resultados nesta categoria.</p>
        )}
      </div>
    </section>
  );
}
