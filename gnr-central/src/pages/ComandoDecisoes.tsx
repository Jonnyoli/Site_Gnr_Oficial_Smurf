import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Gavel,
  Loader2,
  RefreshCw,
  RotateCcw,
  XCircle,
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

  if (!response.ok) throw new Error(payload?.error || "O pedido falhou.");

  return payload;
}

export default function ComandoDecisoes() {
  const [data, setData] = useState<any>({ decisions: [], deadlines: [], summary: {} });
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      setData(await api("/api/command-center"));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Erro.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function decide(id: string, action: string) {
    const note = window.prompt("Nota da decisão:") || "";

    setWorking(id);

    try {
      await api(`/api/command-center/${id}/decide`, {
        method: "POST",
        body: JSON.stringify({ action, note }),
      });
      await load();
    } catch (decisionError) {
      setError(decisionError instanceof Error ? decisionError.message : "Erro.");
    } finally {
      setWorking("");
    }
  }

  const pending = useMemo(
    () => (data.decisions || []).filter((item: any) => item.status === "PENDING" || item.status === "CLARIFICATION"),
    [data.decisions],
  );

  return (
    <div className="space-y-6 pb-14">
      <section className="rounded-[2.6rem] border border-primary/15 bg-[#06100c]/95 p-7">
        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-primary">
          Comando-Geral
        </p>
        <h1 className="mt-3 text-4xl font-black text-white">
          Centro Executivo de Decisões
        </h1>
        <p className="mt-3 text-sm text-white/35">
          Aprovações, devoluções, rejeições, esclarecimentos e prazos.
        </p>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-red-200">
          {error}
        </div>
      )}

      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Metric label="Pendentes" value={data.summary?.pending || 0} icon={Gavel} />
        <Metric label="Urgentes" value={data.summary?.urgent || 0} icon={AlertTriangle} />
        <Metric label="Esclarecimentos" value={data.summary?.clarification || 0} icon={RotateCcw} />
        <Metric label="Prazos vencidos" value={data.summary?.overdue || 0} icon={Clock3} />
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-[8px] font-black uppercase text-white/45"
        >
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </button>
      </div>

      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <Loader2 className="h-9 w-9 animate-spin text-primary" />
        </div>
      ) : (
        <section className="space-y-4">
          {pending.map((item: any) => (
            <article
              key={item._id}
              className="rounded-[1.8rem] border border-white/10 bg-[#06100c]/90 p-5"
            >
              <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <p className="text-[8px] font-black uppercase text-primary">
                    {item.sourceDepartment} · {item.priority}
                  </p>
                  <h2 className="mt-2 text-xl font-black text-white">{item.title}</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-white/35">
                    {item.summary || "Sem resumo."}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Action
                    label="Aprovar"
                    icon={CheckCircle2}
                    disabled={working === item._id}
                    onClick={() => void decide(item._id, "APPROVED")}
                  />
                  <Action
                    label="Devolver"
                    icon={RotateCcw}
                    disabled={working === item._id}
                    onClick={() => void decide(item._id, "RETURNED")}
                  />
                  <Action
                    label="Rejeitar"
                    icon={XCircle}
                    disabled={working === item._id}
                    onClick={() => void decide(item._id, "REJECTED")}
                  />
                </div>
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
      <Icon className="h-5 w-5 text-primary" />
      <p className="mt-4 text-3xl font-black text-white">{value}</p>
      <p className="mt-1 text-[8px] font-black uppercase text-white/30">{label}</p>
    </article>
  );
}

function Action({ label, icon: Icon, disabled, onClick }: any) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[8px] font-black uppercase text-white/50 disabled:opacity-35"
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
