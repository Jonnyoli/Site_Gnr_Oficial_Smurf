import { useEffect, useMemo, useState } from "react";
import DRHGestaoEfetivo from "./DRHGestaoEfetivo";
import {
  Activity,
  ClipboardCheck,
  Clock3,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  UserMinus,
  UsersRound,
} from "lucide-react";

async function api(path: string) {
  const response = await fetch(path, {
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) throw new Error(payload?.error || "O pedido falhou.");

  return payload;
}

export default function DRHCentro() {
  const [data, setData] = useState<any>({ processes: [], summary: {} });
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] =
    useState<"PROCESSES" | "WORKFORCE">("WORKFORCE");

  async function load() {
    setLoading(true);
    setError("");

    try {
      setData(await api("/api/drh"));
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
    const term = query.trim().toLowerCase();

    return (data.processes || []).filter((item: any) =>
      !term ||
      [item.processNumber, item.title, item.subjectName, item.type, item.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [data.processes, query]);

  return (
    <div className="space-y-6 pb-14">
      <section className="rounded-[2.6rem] border border-emerald-400/15 bg-[#06100c]/95 p-7">
        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300">
          Departamento de Recursos Humanos
        </p>
        <h1 className="mt-3 text-4xl font-black text-white">
          Centro de Recursos Humanos
        </h1>
        <p className="mt-3 text-sm text-white/35">
          Gestão do efetivo, processos administrativos, ausências,
          despedimentos, portes, folhas de ponto e cadastro.
        </p>
      </section>

      <section className="rounded-[1.7rem] border border-white/10 bg-[#06100c]/90 p-2">
        <div className="flex flex-col gap-2 md:flex-row">
          <button
            type="button"
            onClick={() => setActiveSection("WORKFORCE")}
            className={`group flex flex-1 items-center gap-4 rounded-2xl border px-5 py-4 text-left transition ${
              activeSection === "WORKFORCE"
                ? "border-emerald-400/25 bg-emerald-500/10"
                : "border-transparent bg-transparent hover:border-white/10 hover:bg-white/[0.03]"
            }`}
          >
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
                activeSection === "WORKFORCE"
                  ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
                  : "border-white/10 bg-black/20 text-white/25"
              }`}
            >
              <Activity className="h-5 w-5" />
            </span>

            <div>
              <p className="text-sm font-black text-white">
                Gestão do Efetivo
              </p>
              <p className="mt-1 text-xs text-white/30">
                Horas, inatividade e ausências
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection("PROCESSES")}
            className={`group flex flex-1 items-center gap-4 rounded-2xl border px-5 py-4 text-left transition ${
              activeSection === "PROCESSES"
                ? "border-emerald-400/25 bg-emerald-500/10"
                : "border-transparent bg-transparent hover:border-white/10 hover:bg-white/[0.03]"
            }`}
          >
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
                activeSection === "PROCESSES"
                  ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
                  : "border-white/10 bg-black/20 text-white/25"
              }`}
            >
              <ClipboardCheck className="h-5 w-5" />
            </span>

            <div>
              <p className="text-sm font-black text-white">
                Processos Administrativos
              </p>
              <p className="mt-1 text-xs text-white/30">
                Ausências, despedimentos, portes e cadastro
              </p>
            </div>
          </button>
        </div>
      </section>

      {activeSection === "WORKFORCE" ? (
        <section className="space-y-6">
          <div className="flex flex-col gap-3 border-b border-white/10 pb-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.14em] text-emerald-300">
                Categoria ativa
              </p>
              <h2 className="mt-2 text-2xl font-black text-white">
                Gestão do Efetivo
              </h2>
              <p className="mt-2 text-sm text-white/30">
                Dados oficiais do efetivo, organizados por patente.
              </p>
            </div>
          </div>

          <DRHGestaoEfetivo embedded />
        </section>
      ) : (
        <section className="space-y-6">
          <div className="border-b border-white/10 pb-5">
            <p className="text-[8px] font-black uppercase tracking-[0.14em] text-emerald-300">
              Categoria ativa
            </p>
            <h2 className="mt-2 text-2xl font-black text-white">
              Processos Administrativos
            </h2>
            <p className="mt-2 text-sm text-white/30">
              Registos, ausências, despedimentos, portes e limpezas de cadastro.
            </p>
          </div>

      {error && (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-red-200">
          {error}
        </div>
      )}

      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Metric label="Processos" value={data.summary?.total || 0} icon={ClipboardCheck} />
        <Metric label="Ausências" value={data.summary?.absences || 0} icon={UsersRound} />
        <Metric label="Despedimentos" value={data.summary?.dismissals || 0} icon={UserMinus} />
        <Metric label="Comando" value={data.summary?.awaitingCommand || 0} icon={ShieldCheck} />
      </section>

      <div className="flex h-13 items-center rounded-2xl border border-white/10 bg-[#06100c]/90 px-4">
        <Search className="mr-3 h-5 w-5 text-emerald-300" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Pesquisar processo, militar ou tipo..."
          className="h-full flex-1 bg-transparent text-sm text-white outline-none"
        />
        <button type="button" onClick={() => void load()}>
          <RefreshCw className="h-5 w-5 text-white/35" />
        </button>
      </div>

      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <Loader2 className="h-9 w-9 animate-spin text-emerald-300" />
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
                  <p className="text-[8px] font-black uppercase text-emerald-300">
                    {item.processNumber} · {item.type}
                  </p>
                  <h2 className="mt-2 text-xl font-black text-white">{item.title}</h2>
                  <p className="mt-1 text-sm text-white/35">{item.subjectName}</p>
                </div>
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[7px] font-black uppercase text-white/45">
                  {item.status}
                </span>
              </div>

              {item.type === "RECORD_CLEANUP" && (
                <div className="mt-5 rounded-xl border border-emerald-400/15 bg-emerald-500/[0.05] p-4">
                  <p className="text-[8px] font-black uppercase text-white/25">
                    Valor calculado
                  </p>
                  <p className="mt-1 text-2xl font-black text-emerald-300">
                    {Number(item.recordCleanup?.calculatedAmount || 0).toLocaleString("pt-PT")} €
                  </p>
                </div>
              )}
            </article>
          ))}
        </section>
      )}
        </section>
      )}
    </div>
  );
}

function Metric({ label, value, icon: Icon }: any) {
  return (
    <article className="rounded-[1.6rem] border border-white/10 bg-[#06100c]/90 p-5">
      <Icon className="h-5 w-5 text-emerald-300" />
      <p className="mt-4 text-3xl font-black text-white">{value}</p>
      <p className="mt-1 text-[8px] font-black uppercase text-white/30">{label}</p>
    </article>
  );
}
