import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Target,
} from "lucide-react";

export default function DashboardExecutivo() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/executive-dashboard", {
        credentials: "include",
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Falha ao carregar.");
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  if (loading) {
    return <div className="flex min-h-[65vh] items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 pb-12">
      <section className="rounded-[2.6rem] border border-primary/15 bg-[#06100c]/95 p-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">
              Comando-Geral
            </p>
            <h1 className="mt-3 text-4xl font-black text-white">
              Dashboard Executivo
            </h1>
            <p className="mt-3 text-sm text-white/40">
              Situação operacional, validações, metas e risco em tempo real.
            </p>
          </div>
          <button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-xs font-black text-white/60">
            <RefreshCw className="h-4 w-4" /> Atualizar
          </button>
        </div>
      </section>

      {error && <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-red-200">{error}</div>}

      <section className="grid grid-cols-2 gap-4 xl:grid-cols-6">
        <Metric label="Em curso" value={data?.counts?.operationsInProgress || 0} icon={Clock3} />
        <Metric label="Aguarda Diretor" value={data?.counts?.pendingDirector || 0} icon={Target} />
        <Metric label="Aguarda Comando" value={data?.counts?.pendingCommand || 0} icon={ShieldAlert} />
        <Metric label="Por emitir" value={data?.counts?.readyForDocument || 0} icon={FileCheck2} />
        <Metric label="Paradas +72h" value={data?.counts?.staleInvestigations || 0} icon={AlertTriangle} />
        <Metric label="Alertas urgentes" value={data?.counts?.urgentNotifications || 0} icon={AlertTriangle} />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Panel title="Metas semanais das unidades">
          <div className="space-y-3">
            {(data?.units || []).map((unit: any) => (
              <div key={unit._id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-black text-white">{unit.unit}</span>
                  <span className="text-sm font-black text-primary">{unit.percentage}%</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.min(100, Number(unit.percentage || 0))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Atividade recente">
          <div className="space-y-3">
            {(data?.recentOperations || []).map((operation: any) => (
              <Link
                key={operation._id}
                href={
                  operation.primaryUnit === "NIC"
                    ? `/unidades/nic/investigacoes/${operation._id}`
                    : `/unidades/${String(operation.primaryUnit).toLowerCase()}`
                }
                className="block rounded-2xl border border-white/10 bg-black/20 p-4"
              >
                <p className="font-black text-white">
                  {operation.caseNumber || operation.title}
                </p>
                <p className="mt-1 text-xs text-white/35">
                  {operation.primaryUnit} · {operation.status} · {operation.reportStatus}
                </p>
              </Link>
            ))}
          </div>
        </Panel>
      </section>
    </div>
  );
}

function Metric({ label, value, icon: Icon }: any) {
  return (
    <article className="rounded-[1.6rem] border border-white/10 bg-[#06100c]/90 p-5">
      <Icon className="h-5 w-5 text-primary" />
      <p className="mt-4 text-3xl font-black text-white">{value}</p>
      <p className="mt-1 text-[9px] font-black uppercase tracking-[0.12em] text-white/30">
        {label}
      </p>
    </article>
  );
}

function Panel({ title, children }: any) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#06100c]/90 p-5">
      <h2 className="text-xl font-black text-white">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}
