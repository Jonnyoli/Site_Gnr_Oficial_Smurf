import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";

async function api(path: string, options: RequestInit = {}) {
  const response = await fetch(path, {
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
    ...options,
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error || "O pedido falhou.");
  }

  return payload;
}

export default function CEGFiscalizacoes() {
  const [data, setData] = useState<any>({ inspections: [], summary: {} });
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      setData(await api("/api/ceg"));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Erro.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const term = query.toLowerCase().trim();

    return (data.inspections || []).filter((item: any) =>
      !term ||
      [item.inspectionNumber, item.title, item.unit, item.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [data.inspections, query]);

  return (
    <div className="space-y-6 pb-14">
      <section className="rounded-[2.6rem] border border-amber-400/15 bg-[#100d06]/95 p-7">
        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-300">
          Conselho de Elite da Guarda
        </p>
        <h1 className="mt-3 text-4xl font-black text-white">
          Fiscalização das Unidades
        </h1>
        <p className="mt-3 text-sm text-white/35">
          Cumprimento de metas, incidentes, recomendações e pareceres oficiais.
        </p>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-red-200">
          {error}
        </div>
      )}

      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Metric label="Fiscalizações" value={data.summary?.total || 0} icon={ClipboardCheck} />
        <Metric label="Em atenção" value={data.summary?.attention || 0} icon={AlertTriangle} />
        <Metric label="Críticas" value={data.summary?.critical || 0} icon={ShieldCheck} />
        <Metric label="Comando" value={data.summary?.pendingCommand || 0} icon={BarChart3} />
      </section>

      <div className="flex flex-col gap-3 md:flex-row">
        <div className="flex h-13 flex-1 items-center rounded-2xl border border-white/10 bg-[#06100c]/90 px-4">
          <Search className="mr-3 h-5 w-5 text-amber-300" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Pesquisar fiscalização, unidade ou estado..."
            className="h-full flex-1 bg-transparent text-sm text-white outline-none"
          />
        </div>

        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-[8px] font-black uppercase text-white/45"
        >
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </button>
      </div>

      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <Loader2 className="h-9 w-9 animate-spin text-amber-300" />
        </div>
      ) : (
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {filtered.map((item: any) => (
            <article
              key={item._id}
              className="rounded-[1.8rem] border border-white/10 bg-[#06100c]/90 p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[8px] font-black uppercase text-amber-300">
                    {item.inspectionNumber} · {item.unit}
                  </p>
                  <h2 className="mt-2 text-xl font-black text-white">{item.title}</h2>
                </div>
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[7px] font-black uppercase text-white/45">
                  {item.status}
                </span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                <Info label="Metas" value={`${item.metrics?.goalsPercentage || 0}%`} />
                <Info label="Operações" value={item.metrics?.operations || 0} />
                <Info label="Treinos" value={item.metrics?.trainings || 0} />
                <Info label="Incidentes" value={item.metrics?.incidents || 0} />
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

function Metric({ label, value, icon: Icon }: any) {
  return (
    <article className="rounded-[1.6rem] border border-white/10 bg-[#06100c]/90 p-5">
      <Icon className="h-5 w-5 text-amber-300" />
      <p className="mt-4 text-3xl font-black text-white">{value}</p>
      <p className="mt-1 text-[8px] font-black uppercase text-white/30">{label}</p>
    </article>
  );
}

function Info({ label, value }: any) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <p className="text-[7px] font-black uppercase text-white/25">{label}</p>
      <p className="mt-1 text-sm font-black text-white">{value}</p>
    </div>
  );
}
