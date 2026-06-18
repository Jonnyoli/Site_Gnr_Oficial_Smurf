import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CheckCircle2,
  Loader2,
  Shield,
  Target,
  TrendingUp,
} from "lucide-react";
import { useData } from "../context/DataContext";

export default function EstatisticasUnidades() {
  const { guardas, currentPatrulhas } = useData() as any;
  const [progress, setProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/units/progress", { credentials: "include" })
      .then((response) => response.json())
      .then((data) => setProgress(data?.items || []))
      .finally(() => setLoading(false));
  }, []);

  const guards = Array.isArray(guardas) ? guardas : guardas?.items || [];
  const patrols = Array.isArray(currentPatrulhas)
    ? currentPatrulhas
    : currentPatrulhas?.items || [];

  const rows = useMemo(() => {
    const units = ["UNT", "DI", "USHE", "GIOE", "NIC", "GSA", "EG"];

    return units.map((unit) => {
      const members = guards.filter((guard: any) =>
        String(guard?.unidade || guard?.unit || "").toUpperCase().includes(unit),
      ).length;
      const unitPatrols = patrols.filter((item: any) =>
        String(item?.unidade || item?.unit || item?.tipo || "").toUpperCase().includes(unit),
      ).length;
      const item = progress.find((entry: any) => entry.unit === unit);

      return {
        unit,
        members,
        patrols: unitPatrols,
        percentage: Number(item?.percentage || 0),
        completed: Number(item?.completedActions || 0),
        target: Number(item?.targetActions || 0),
      };
    });
  }, [guards, patrols, progress]);

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 pb-12">
      <section className="rounded-[2.6rem] border border-primary/15 bg-[#06100c]/95 p-7">
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">
          Análise operacional
        </p>
        <h1 className="mt-3 text-4xl font-black text-white">
          Estatísticas das Unidades
        </h1>
        <p className="mt-3 text-sm text-white/40">
          Efetivo, patrulhas e cumprimento semanal comparados por unidade.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => (
          <article key={row.unit} className="rounded-[1.8rem] border border-white/10 bg-[#06100c]/90 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-black text-white">{row.unit}</h2>
              </div>
              <span className="text-lg font-black text-primary">{row.percentage}%</span>
            </div>

            <div className="mt-5 h-2 rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.min(100, row.percentage)}%` }}
              />
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <Info label="Efetivo" value={row.members} icon={Shield} />
              <Info label="Patrulhas" value={row.patrols} icon={TrendingUp} />
              <Info label="Metas" value={`${row.completed}/${row.target}`} icon={Target} />
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

function Info({ label, value, icon: Icon }: any) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-center">
      <Icon className="mx-auto h-4 w-4 text-primary" />
      <p className="mt-2 text-lg font-black text-white">{value}</p>
      <p className="mt-1 text-[7px] font-black uppercase tracking-[0.1em] text-white/25">{label}</p>
    </div>
  );
}
