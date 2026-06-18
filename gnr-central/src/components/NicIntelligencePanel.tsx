import {
  AlertTriangle,
  Car,
  FileSearch,
  Gavel,
  Link2,
  Loader2,
  Network,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  UserRoundSearch,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";

type Suspect = {
  _id?: string;
  reference: string;
  name?: string | null;
  aliases?: string[];
  description?: string;
  status: string;
  discordId?: string | null;
  vehicles?: Array<{
    plate?: string | null;
    model?: string | null;
    color?: string | null;
    notes?: string;
  }>;
  notes?: string;
  addedByName?: string;
  addedAt?: string;
};

type Warrant = {
  _id?: string;
  targetReference: string;
  type: string;
  reason: string;
  status: string;
  issuedByName?: string;
  issuedAt?: string;
  expiresAt?: string | null;
};

type Interrogation = {
  _id?: string;
  subjectReference: string;
  conductedByName: string;
  startedAt?: string;
  summary: string;
  statements?: string;
  outcome?: string;
};

type RelatedInvestigation = {
  _id?: string;
  operationId: string;
  caseNumber?: string | null;
  title: string;
  relationType: string;
  reason: string;
  linkedByName?: string;
  linkedAt?: string;
};

type Props = {
  operationId: string;
  suspects?: Suspect[];
  warrants?: Warrant[];
  interrogations?: Interrogation[];
  relatedInvestigations?: RelatedInvestigation[];
  canManage?: boolean;
};

function Card({
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  title: string;
  subtitle: string;
  icon: any;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#06100d]/90 p-5">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/10 text-blue-300">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-xl font-black text-white">{title}</h3>
          <p className="mt-1 text-xs leading-6 text-white/35">{subtitle}</p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-center text-sm text-white/35">
      {text}
    </div>
  );
}

export default function NicIntelligencePanel({
  suspects = [],
  warrants = [],
  interrogations = [],
  relatedInvestigations = [],
}: Props) {
  const activeWarrants = useMemo(
    () => warrants.filter((item) => item.status === "ACTIVE"),
    [warrants],
  );

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card
        title={`Suspeitos (${suspects.length})`}
        subtitle="Pessoas, alcunhas, viaturas, matrículas e estado de identificação."
        icon={UserRoundSearch}
      >
        <div className="space-y-3">
          {suspects.length === 0 && <Empty text="Ainda não existem suspeitos associados." />}
          {suspects.map((suspect) => (
            <article
              key={suspect._id || suspect.reference}
              className="rounded-2xl border border-white/10 bg-black/25 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-black text-white">
                    {suspect.name || suspect.reference}
                  </p>
                  <p className="mt-1 text-xs text-white/35">
                    {suspect.description || "Sem descrição."}
                  </p>
                </div>
                <span className="rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-blue-300">
                  {suspect.status}
                </span>
              </div>

              {(suspect.vehicles || []).length > 0 && (
                <div className="mt-4 space-y-2">
                  {(suspect.vehicles || []).map((vehicle, index) => (
                    <div
                      key={`${suspect.reference}-vehicle-${index}`}
                      className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/55"
                    >
                      <Car className="h-4 w-4 text-blue-300" />
                      <span>
                        {[vehicle.model, vehicle.color, vehicle.plate]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      </Card>

      <Card
        title={`Mandados ativos (${activeWarrants.length})`}
        subtitle="Mandados de detenção, busca, apreensão ou localização."
        icon={Gavel}
      >
        <div className="space-y-3">
          {warrants.length === 0 && <Empty text="Ainda não existem mandados." />}
          {warrants.map((warrant) => (
            <article
              key={warrant._id || `${warrant.targetReference}-${warrant.issuedAt}`}
              className="rounded-2xl border border-white/10 bg-black/25 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-black text-white">{warrant.targetReference}</p>
                <span className="rounded-full border border-yellow-400/20 bg-yellow-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-yellow-300">
                  {warrant.status}
                </span>
              </div>
              <p className="mt-2 text-xs text-white/45">{warrant.reason}</p>
              <p className="mt-3 text-[10px] uppercase tracking-[0.12em] text-white/25">
                {warrant.type} · {warrant.issuedByName || "NIC"}
              </p>
            </article>
          ))}
        </div>
      </Card>

      <Card
        title={`Interrogatórios (${interrogations.length})`}
        subtitle="Resumos, declarações e resultados registados."
        icon={FileSearch}
      >
        <div className="space-y-3">
          {interrogations.length === 0 && <Empty text="Ainda não existem interrogatórios." />}
          {interrogations.map((item) => (
            <article
              key={item._id || `${item.subjectReference}-${item.startedAt}`}
              className="rounded-2xl border border-white/10 bg-black/25 p-4"
            >
              <p className="font-black text-white">{item.subjectReference}</p>
              <p className="mt-2 whitespace-pre-wrap text-xs leading-6 text-white/45">
                {item.summary}
              </p>
              {item.outcome && (
                <p className="mt-3 rounded-xl border border-emerald-400/15 bg-emerald-500/[0.06] px-3 py-2 text-xs text-emerald-200">
                  {item.outcome}
                </p>
              )}
            </article>
          ))}
        </div>
      </Card>

      <Card
        title={`Processos ligados (${relatedInvestigations.length})`}
        subtitle="Relações por suspeitos, veículos, armas, organizações ou prova."
        icon={Network}
      >
        <div className="space-y-3">
          {relatedInvestigations.length === 0 && (
            <Empty text="Ainda não existem processos relacionados." />
          )}
          {relatedInvestigations.map((item) => (
            <article
              key={item._id || item.operationId}
              className="rounded-2xl border border-white/10 bg-black/25 p-4"
            >
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-blue-300" />
                <p className="font-black text-white">
                  {item.caseNumber || "Processo"} — {item.title}
                </p>
              </div>
              <p className="mt-2 text-xs text-white/45">{item.reason}</p>
              <p className="mt-3 text-[10px] uppercase tracking-[0.12em] text-blue-300">
                {item.relationType}
              </p>
            </article>
          ))}
        </div>
      </Card>
    </div>
  );
}
