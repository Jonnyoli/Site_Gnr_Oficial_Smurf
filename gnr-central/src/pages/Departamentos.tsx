import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Crown,
  Loader2,
  Scale,
  ShieldCheck,
  Users,
} from "lucide-react";

type DepartmentItem = {
  key: "CEG" | "CSO" | "DRH";
  name: string;
  shortName: string;
  roleId: string;
  accessible: boolean;
  members?: number;
  counts?: {
    open: number;
    awaitingCommand: number;
    completed: number;
    critical: number;
  };
};

const ICONS = {
  CEG: Crown,
  CSO: Scale,
  DRH: Users,
};

const DESCRIPTIONS = {
  CEG: "Supervisão administrativa, apoio ao Comando-Geral, queixas sensíveis e fiscalização das subunidades.",
  CSO: "Promoções, reuniões semanais, propostas de CFS e controlo das avaliações dos Sargentos.",
  DRH: "Folhas de ponto, ausências, despedimentos, tickets, limpezas de cadastro e portes de armas.",
};

export default function Departamentos() {
  const [items, setItems] = useState<DepartmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/departments/overview", {
      credentials: "include",
    })
      .then(async (response) => {
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(
            payload?.error ||
              "Não foi possível carregar os departamentos.",
          );
        }

        setItems(payload.departments || []);
      })
      .catch((loadError) =>
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Não foi possível carregar os departamentos.",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <section className="relative overflow-hidden rounded-[2.8rem] border border-primary/15 bg-[#06100c]/95 p-8">
        <div className="absolute inset-0 cyber-grid-soft opacity-10" />
        <div className="relative">
          <p className="text-[9px] font-black uppercase tracking-[0.22em] text-primary">
            Administração institucional
          </p>
          <h1 className="mt-3 text-4xl font-black text-white md:text-6xl">
            Departamentos da GNR
          </h1>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-white/40">
            Conselho de Elite da Guarda, Conselho Superior de
            Oficiais e Departamento de Recursos Humanos, com
            permissões, tarefas, processos e workflows próprios.
          </p>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-red-200">
          {error}
        </div>
      )}

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {items.map((department) => {
          const Icon = ICONS[department.key];

          if (!department.accessible) {
            return (
              <article
                key={department.key}
                className="rounded-[2rem] border border-white/10 bg-[#06100c]/65 p-6 opacity-55"
              >
                <Icon className="h-8 w-8 text-white/20" />
                <h2 className="mt-5 text-2xl font-black text-white">
                  {department.name}
                </h2>
                <p className="mt-3 text-sm leading-6 text-white/30">
                  Área restrita aos membros do departamento e
                  ao Comando-Geral.
                </p>
              </article>
            );
          }

          return (
            <Link
              key={department.key}
              href={`/departamentos/${department.key.toLowerCase()}`}
              className="group rounded-[2rem] border border-white/10 bg-[#06100c]/90 p-6 transition hover:-translate-y-1 hover:border-primary/25"
            >
              <div className="flex items-start justify-between">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                  <Icon className="h-7 w-7" />
                </span>
                <ArrowRight className="h-5 w-5 text-white/15 transition group-hover:translate-x-1 group-hover:text-primary" />
              </div>

              <p className="mt-5 text-[9px] font-black uppercase tracking-[0.18em] text-primary">
                {department.shortName}
              </p>
              <h2 className="mt-2 text-2xl font-black text-white">
                {department.name}
              </h2>
              <p className="mt-3 min-h-[72px] text-sm leading-6 text-white/35">
                {DESCRIPTIONS[department.key]}
              </p>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <Metric
                  label="Membros"
                  value={department.members || 0}
                  icon={Users}
                />
                <Metric
                  label="Em aberto"
                  value={department.counts?.open || 0}
                  icon={ShieldCheck}
                />
                <Metric
                  label="Aguarda CMD"
                  value={department.counts?.awaitingCommand || 0}
                  icon={AlertTriangle}
                />
                <Metric
                  label="Concluídos"
                  value={department.counts?.completed || 0}
                  icon={CheckCircle2}
                />
              </div>
            </Link>
          );
        })}
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
}: any) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <Icon className="h-4 w-4 text-primary" />
      <p className="mt-2 text-xl font-black text-white">
        {value}
      </p>
      <p className="mt-1 text-[7px] font-black uppercase tracking-[0.1em] text-white/25">
        {label}
      </p>
    </div>
  );
}
