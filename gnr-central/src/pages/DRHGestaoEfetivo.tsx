import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  ExternalLink,
  FileClock,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  UserPlus,
  UserX,
  UsersRound,
  X,
} from "lucide-react";

type Tab =
  | "HOURS"
  | "INACTIVITY"
  | "ABSENCES"
  | "ALERTS";

async function api(path: string) {
  const response = await fetch(path, {
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Cache-Control": "no-cache",
    },
  });

  const raw = await response.text();

  let payload: any = null;

  try {
    payload = raw ? JSON.parse(raw) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(
      payload?.error ||
        `O pedido falhou com o código ${response.status}.`,
    );
  }

  return payload;
}

function hours(value: number) {
  return `${Number(value || 0).toFixed(1)}h`;
}

function date(value?: string | null) {
  if (!value) return "Sem registo";

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "Sem registo";
  }

  return parsed.toLocaleDateString("pt-PT");
}

function dateTime(value?: string | null) {
  if (!value) return "Sem registo";

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "Sem registo";
  }

  return parsed.toLocaleString("pt-PT");
}

function inactivityTone(item: any) {
  if (item.hasAbsenceRole) {
    return {
      label: "Ausência justificada",
      className:
        "border-sky-400/20 bg-sky-500/10 text-sky-300",
    };
  }

  if (
    item.daysInactive === null ||
    item.daysInactive >= 15
  ) {
    return {
      label:
        item.daysInactive === null
          ? "Sem atividade"
          : `${item.daysInactive} dias`,
      className:
        "border-red-400/20 bg-red-500/10 text-red-300",
    };
  }

  if (item.daysInactive >= 8) {
    return {
      label: `${item.daysInactive} dias`,
      className:
        "border-orange-400/20 bg-orange-500/10 text-orange-300",
    };
  }

  return {
    label: `${item.daysInactive || 0} dias`,
    className:
      "border-amber-400/20 bg-amber-500/10 text-amber-300",
  };
}

export default function DRHGestaoEfetivo({ embedded = false }: { embedded?: boolean }) {
  const [data, setData] = useState<any>({
    roster: [],
    inactive: [],
    absences: [],
    summary: {},
  });

  const [tab, setTab] =
    useState<Tab>("HOURS");

  const [query, setQuery] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [selectedMember, setSelectedMember] =
    useState<any>(null);

  const [memberDetails, setMemberDetails] =
    useState<any>(null);

  const [memberLoading, setMemberLoading] =
    useState(false);

  const [rankFilter, setRankFilter] =
    useState("ALL");

  const [unitFilter, setUnitFilter] =
    useState("ALL");

  async function load(force = false) {
    setLoading(true);
    setError("");

    try {
      const payload = await api(
        `/api/drh-workforce/snapshot${
          force
            ? `?force=${Date.now()}`
            : ""
        }`,
      );

      setData(payload);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Não foi possível carregar os dados.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const source = useMemo(() => {
    if (tab === "INACTIVITY") {
      return data.inactive || [];
    }

    if (tab === "ABSENCES") {
      return data.absences || [];
    }

    if (tab === "ALERTS") {
      return data.alerts || [];
    }

    return data.roster || [];
  }, [data, tab]);

  const rankOptions = useMemo(
    () => [
      "ALL",
      ...new Set(
        (data.roster || [])
          .map((item: any) => item.rank)
          .filter(Boolean),
      ),
    ],
    [data.roster],
  );

  const unitOptions = useMemo(
    () => [
      "ALL",
      ...new Set(
        (data.roster || [])
          .map((item: any) => item.unit)
          .filter(Boolean),
      ),
    ],
    [data.roster],
  );

  const filtered = useMemo(() => {
    const term =
      query.trim().toLowerCase();

    if (tab === "ALERTS") {
      return source.filter((item: any) =>
        !term ||
        [
          item.subjectName,
          item.title,
          item.description,
          item.type,
          item.severity,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value)
              .toLowerCase()
              .includes(term),
          ),
      );
    }

    return source
      .filter((item: any) => {
        const matchesSearch =
          !term ||
          [
            item.name,
            item.rank,
            item.unit,
            item.discordId,
            item.state,
          ]
            .filter(Boolean)
            .some((value) =>
              String(value)
                .toLowerCase()
                .includes(term),
            );

        const matchesRank =
          rankFilter === "ALL" ||
          item.rank === rankFilter;

        const matchesUnit =
          unitFilter === "ALL" ||
          item.unit === unitFilter;

        return (
          matchesSearch &&
          matchesRank &&
          matchesUnit
        );
      })
      .sort((a: any, b: any) => {
        const orderA = Number(
          a.rankOrder ?? 9999,
        );
        const orderB = Number(
          b.rankOrder ?? 9999,
        );

        if (orderA !== orderB) {
          return orderA - orderB;
        }

        return String(a.name || "").localeCompare(
          String(b.name || ""),
          "pt-PT",
        );
      });
  }, [
    source,
    query,
    rankFilter,
    unitFilter,
    tab,
  ]);

  async function openMember(member: any) {
    // O modal abre imediatamente; os detalhes são carregados depois.
    setSelectedMember(member);
    setMemberDetails(null);
    setMemberLoading(true);
    setError("");

    try {
      const payload = await api(
        `/api/drh-workforce/member/${member.discordId}`,
      );

      setMemberDetails(payload);

      if (payload?.member) {
        setSelectedMember(payload.member);
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Não foi possível abrir o militar.",
      );
    } finally {
      setMemberLoading(false);
    }
  }

  async function resolveAlert(alert: any) {
    const note =
      window.prompt(
        "Nota de resolução:",
      ) || "";

    await fetch(
      `/api/drh-workforce/alerts/${alert._id}/resolve`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ note }),
      },
    );

    await load(true);
  }

  async function createProcess(
    member: any,
    type: string,
  ) {
    const description =
      window.prompt(
        "Descrição do processo:",
      ) || "";

    const response = await fetch(
      `/api/drh-workforce/member/${member.discordId}/process`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type,
          description,
        }),
      },
    );

    const payload =
      await response.json();

    if (!response.ok) {
      throw new Error(
        payload?.error ||
          "Não foi possível criar o processo.",
      );
    }

    await openMember(member);
    await load(true);
  }

  async function addNote(member: any) {
    const note =
      window.prompt(
        "Nota interna do DRH:",
      );

    if (!note) return;

    const response = await fetch(
      `/api/drh-workforce/member/${member.discordId}/notes`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ note }),
      },
    );

    const payload =
      await response.json();

    if (!response.ok) {
      throw new Error(
        payload?.error ||
          "Não foi possível guardar a nota.",
      );
    }

    await openMember(member);
  }

  return (
    <div className={embedded ? "space-y-6" : "space-y-6 pb-14"}>
      {!embedded && (
      <section className="relative overflow-hidden rounded-[2.6rem] border border-emerald-400/15 bg-[#06100c]/95 p-7">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(16,185,129,0.12),transparent_34%),radial-gradient(circle_at_90%_90%,rgba(34,197,94,0.06),transparent_32%)]" />

        <div className="relative">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300">
            Departamento de Recursos Humanos
          </p>

          <div className="mt-3 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h1 className="text-4xl font-black text-white">
                Gestão do Efetivo
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/35">
                Todos os militares com a role oficial do efetivo, mapa de
                inatividade superior a cinco dias e lista de ausências.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href="/api/drh-workforce/report"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-4 text-[8px] font-black uppercase text-white/45"
              >
                <Download className="h-4 w-4" />
                Exportar relatório
              </a>

              <button
                type="button"
                onClick={() => void load(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-5 py-4 text-[8px] font-black uppercase text-emerald-300"
              >
                <RefreshCw className="h-4 w-4" />
                Sincronizar dados
              </button>
            </div>
          </div>
        </div>
      </section>
      )}

      {error && (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      <section className="grid grid-cols-2 gap-4 xl:grid-cols-6">
        <Metric
          label="Efetivo"
          value={data.summary?.total || 0}
          icon={UsersRound}
        />
        <Metric
          label="Horas semana"
          value={hours(
            data.summary?.weekHours || 0,
          )}
          icon={Clock3}
        />
        <Metric
          label="Inativos +5 dias"
          value={
            data.summary
              ?.inactiveOverFiveDays || 0
          }
          icon={UserX}
        />
        <Metric
          label="Ausências ativas"
          value={
            data.summary
              ?.activeAbsences || 0
          }
          icon={CalendarDays}
        />
        <Metric
          label="Folhas abertas"
          value={
            data.summary?.openShifts || 0
          }
          icon={FileClock}
        />

        <Metric
          label="Alertas ativos"
          value={
            data.alertsSummary?.total || 0
          }
          icon={AlertTriangle}
        />
      </section>

      <section className="rounded-[1.6rem] border border-white/10 bg-[#06100c]/90 p-2">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
          <TabButton
            active={tab === "HOURS"}
            title="Horas do Efetivo"
            description="Horas totais, semanais e mensais."
            icon={Clock3}
            onClick={() => setTab("HOURS")}
          />

          <TabButton
            active={tab === "INACTIVITY"}
            title="Mapa de Inatividade"
            description="Sem atividade há cinco ou mais dias."
            icon={AlertTriangle}
            onClick={() =>
              setTab("INACTIVITY")
            }
          />

          <TabButton
            active={tab === "ABSENCES"}
            title="Ausências"
            description="Dados automáticos dos tickets oficiais."
            icon={UserCheck}
            onClick={() =>
              setTab("ABSENCES")
            }
          />

          <TabButton
            active={tab === "ALERTS"}
            title="Alertas do DRH"
            description="Situações que exigem intervenção."
            icon={AlertTriangle}
            onClick={() =>
              setTab("ALERTS")
            }
          />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 rounded-2xl border border-white/10 bg-[#06100c]/90 p-3 lg:grid-cols-[1fr_230px_230px]">
        <div className="flex h-12 items-center rounded-xl border border-white/10 bg-black/20 px-4">
          <Search className="mr-3 h-5 w-5 text-emerald-300" />

          <input
            value={query}
            onChange={(event) =>
              setQuery(event.target.value)
            }
            placeholder={
              tab === "ALERTS"
                ? "Pesquisar alerta, militar ou gravidade..."
                : "Pesquisar militar, patente, unidade ou Discord ID..."
            }
            className="h-full flex-1 bg-transparent text-sm text-white outline-none"
          />

          <span className="text-[8px] font-black uppercase text-white/25">
            {filtered.length} resultados
          </span>
        </div>

        {tab !== "ALERTS" && (
          <>
            <select
              value={rankFilter}
              onChange={(event) =>
                setRankFilter(event.target.value)
              }
              className="h-12 rounded-xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
            >
              {rankOptions.map((rank: string) => (
                <option key={rank} value={rank}>
                  {rank === "ALL"
                    ? "Todas as patentes"
                    : rank}
                </option>
              ))}
            </select>

            <select
              value={unitFilter}
              onChange={(event) =>
                setUnitFilter(event.target.value)
              }
              className="h-12 rounded-xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
            >
              {unitOptions.map((unit: string) => (
                <option key={unit} value={unit}>
                  {unit === "ALL"
                    ? "Todas as unidades"
                    : unit}
                </option>
              ))}
            </select>
          </>
        )}
      </section>

      {loading ? (
        <div className="flex min-h-[350px] items-center justify-center">
          <Loader2 className="h-9 w-9 animate-spin text-emerald-300" />
        </div>
      ) : tab === "HOURS" ? (
        <HoursView
          items={filtered}
          onOpen={openMember}
        />
      ) : tab === "INACTIVITY" ? (
        <InactivityView
          items={filtered}
          onOpen={openMember}
        />
      ) : tab === "ABSENCES" ? (
        <AbsencesView
          items={filtered}
          onOpen={openMember}
        />
      ) : (
        <AlertsView
          items={filtered}
          onOpen={(alert: any) => {
            const member = (
              data.roster || []
            ).find(
              (item: any) =>
                item.discordId ===
                alert.subjectDiscordId,
            );

            if (member) {
              void openMember(member);
            }
          }}
          onResolve={resolveAlert}
        />
      )}

      <p className="text-center text-[8px] font-black uppercase tracking-[0.1em] text-white/20">
        Última sincronização:{" "}
        {dateTime(data.generatedAt)}
      </p>

      {selectedMember && (
        <MemberModal
          member={selectedMember}
          details={memberDetails}
          loading={memberLoading}
          onClose={() => {
            setSelectedMember(null);
            setMemberDetails(null);
          }}
          onCreateProcess={createProcess}
          onAddNote={addNote}
        />
      )}
    </div>
  );
}

function HoursView({ items, onOpen }: any) {
  return (
    <section className="overflow-hidden rounded-[1.8rem] border border-white/10 bg-[#06100c]/90">
      <div className="hidden grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 border-b border-white/10 px-5 py-4 text-[8px] font-black uppercase text-white/25 lg:grid">
        <span>Militar e patente</span>
        <span>Semana</span>
        <span>Mês</span>
        <span>Total</span>
        <span>Turnos</span>
        <span>Último ponto</span>
      </div>

      <div className="divide-y divide-white/5">
        {items.map((item: any) => (
          <button
            type="button"
            key={item.discordId}
            onClick={() => onOpen(item)}
            className="grid w-full grid-cols-1 gap-4 px-5 py-5 text-left transition hover:bg-white/[0.025] lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] lg:items-center"
          >
            <Person item={item} />

            <Data
              label="Semana"
              value={hours(item.weekHours)}
            />

            <Data
              label="Mês"
              value={hours(item.monthHours)}
            />

            <Data
              label="Total acumulado"
              value={hours(item.totalHours)}
            />

            <Data
              label="Turnos"
              value={`${item.shifts} ${
                item.openShifts
                  ? `· ${item.openShifts} aberto(s)`
                  : ""
              }`}
            />

            <Data
              label="Último ponto"
              value={date(item.lastPointAt)}
            />
          </button>
        ))}
      </div>
    </section>
  );
}

function InactivityView({ items, onOpen }: any) {
  return (
    <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {items.map((item: any) => {
        const tone =
          inactivityTone(item);

        return (
          <button
            type="button"
            key={item.discordId}
            onClick={() => onOpen(item)}
            className="w-full rounded-[1.7rem] border border-white/10 bg-[#06100c]/90 p-5 text-left transition hover:border-emerald-400/20"
          >
            <div className="flex items-start justify-between gap-4">
              <Person item={item} />

              <span
                className={`rounded-full border px-3 py-2 text-[7px] font-black uppercase ${tone.className}`}
              >
                {tone.label}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Info
                label="Última atividade"
                value={date(
                  item.lastActivityAt,
                )}
              />

              <Info
                label="Último ponto"
                value={date(
                  item.lastPointAt,
                )}
              />

              <Info
                label="Última CP"
                value={date(
                  item.lastPatrolAt,
                )}
              />

              <Info
                label="Ausência"
                value={
                  item.hasAbsenceRole
                    ? "Justificada"
                    : "Não"
                }
              />
            </div>
          </button>
        );
      })}
    </section>
  );
}

function AbsencesView({ items, onOpen }: any) {
  const stateLabel = (state: string) => {
    const labels: Record<string, string> = {
      ACTIVE: "Ausência ativa",
      ROLE_WITHOUT_TICKET: "Role sem ticket",
      TICKET_WITHOUT_ROLE: "Ticket sem role",
      ENDED_ROLE_ACTIVE: "Regresso ultrapassado",
      CLOSED_TICKET_ROLE_ACTIVE: "Ticket fechado · role ativa",
      REVIEW: "Rever",
    };

    return labels[state] || "Ausência";
  };

  return (
    <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {items.map((item: any) => (
        <article
          key={item.discordId}
          className="rounded-[1.7rem] border border-sky-400/15 bg-[#06100c]/90 p-5"
        >
          <button
            type="button"
            onClick={() => onOpen(item)}
            className="w-full text-left"
          >
            <div className="flex items-start justify-between gap-4">
              <Person item={item} />

              <span className="rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-2 text-[7px] font-black uppercase text-sky-300">
                {stateLabel(item.absenceState)}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Info
                label="Início"
                value={date(
                  item.absence?.periodStart,
                )}
              />

              <Info
                label="Regresso"
                value={date(
                  item.absence?.periodEnd,
                )}
              />

              <Info
                label="Dias restantes"
                value={
                  item.absence?.daysRemaining === null ||
                  item.absence?.daysRemaining === undefined
                    ? "Sem registo"
                    : item.absence.daysRemaining < 0
                      ? `${Math.abs(item.absence.daysRemaining)} dias em atraso`
                      : `${item.absence.daysRemaining} dias`
                }
              />

              <Info
                label="Origem"
                value={
                  item.absence?.source ===
                  "DISCORD_TICKET"
                    ? "Ticket Discord"
                    : item.absence?.source ===
                        "DRH_PROCESS"
                      ? "Processo DRH"
                      : "Sem dados"
                }
              />
            </div>

            <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
              <p className="text-[7px] font-black uppercase tracking-[0.08em] text-white/25">
                Motivo
              </p>

              <p className="mt-2 text-sm leading-6 text-white/50">
                {item.absence?.reason ||
                  item.absence?.description ||
                  "Sem motivo identificado no ticket."}
              </p>
            </div>
          </button>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-white/25">
              {item.absence?.openedByName
                ? `Aberto por ${item.absence.openedByName}`
                : "Responsável não identificado"}
            </div>

            {item.absence?.ticketUrl && (
              <a
                href={item.absence.ticketUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-sky-400/20 bg-sky-500/10 px-4 py-3 text-[8px] font-black uppercase text-sky-300"
              >
                <ExternalLink className="h-4 w-4" />
                Abrir ticket
              </a>
            )}
          </div>
        </article>
      ))}
    </section>
  );
}

function AlertsView({
  items,
  onOpen,
  onResolve,
}: any) {
  const tone = (severity: string) => {
    if (severity === "CRITICAL") {
      return "border-red-400/20 bg-red-500/10 text-red-300";
    }

    if (severity === "HIGH") {
      return "border-orange-400/20 bg-orange-500/10 text-orange-300";
    }

    if (severity === "MEDIUM") {
      return "border-amber-400/20 bg-amber-500/10 text-amber-300";
    }

    return "border-sky-400/20 bg-sky-500/10 text-sky-300";
  };

  return (
    <section className="space-y-3">
      {items.map((alert: any) => (
        <article
          key={alert._id}
          className="rounded-[1.6rem] border border-white/10 bg-[#06100c]/90 p-5"
        >
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex gap-4">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${tone(alert.severity)}`}>
                <AlertTriangle className="h-5 w-5" />
              </span>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-black text-white">
                    {alert.title}
                  </p>

                  <span className={`rounded-full border px-2.5 py-1 text-[7px] font-black uppercase ${tone(alert.severity)}`}>
                    {alert.severity}
                  </span>
                </div>

                <p className="mt-1 text-sm text-emerald-300">
                  {alert.subjectName}
                </p>

                <p className="mt-2 text-sm leading-6 text-white/35">
                  {alert.description}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onOpen(alert)}
                className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[8px] font-black uppercase text-white/45"
              >
                Abrir ficha
              </button>

              <button
                type="button"
                onClick={() => void onResolve(alert)}
                className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-[8px] font-black uppercase text-emerald-300"
              >
                Resolver
              </button>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}

function MemberModal({
  member,
  details,
  loading,
  onClose,
  onCreateProcess,
  onAddNote,
}: any) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[2rem] border border-white/10 bg-[#06100c] shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-white/10 bg-[#06100c]/95 p-6 backdrop-blur">
          <div>
            <p className="text-[8px] font-black uppercase tracking-[0.14em] text-emerald-300">
              Ficha individual do militar
            </p>

            <h2 className="mt-2 text-3xl font-black text-white">
              {member.name}
            </h2>

            <p className="mt-2 text-sm text-white/40">
              {member.rank} · {member.unit} · {member.discordId}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/45"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex min-h-[420px] items-center justify-center">
            <Loader2 className="h-9 w-9 animate-spin text-emerald-300" />
          </div>
        ) : (
          <div className="space-y-6 p-6">
            <section className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
              <Info label="Semana" value={hours(member.weekHours)} />
              <Info label="Mês" value={hours(member.monthHours)} />
              <Info label="Total" value={hours(member.totalHours)} />
              <Info label="Turnos" value={member.shifts} />
              <Info label="CPs recentes" value={member.recentPatrols?.length || 0} />
              <Info
                label="Inatividade"
                value={
                  member.daysInactive === null
                    ? "Sem registo"
                    : `${member.daysInactive} dias`
                }
              />
            </section>

            <section className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-black/20 p-4">
              <ActionButton
                label="Abrir ausência"
                icon={CalendarDays}
                onClick={() =>
                  void onCreateProcess(
                    member,
                    "ABSENCE",
                  )
                }
              />
              <ActionButton
                label="Iniciar despedimento"
                icon={UserX}
                onClick={() =>
                  void onCreateProcess(
                    member,
                    "DISMISSAL",
                  )
                }
              />
              <ActionButton
                label="Emitir porte"
                icon={ShieldCheck}
                onClick={() =>
                  void onCreateProcess(
                    member,
                    "WEAPONS_PERMIT_ISSUE",
                  )
                }
              />
              <ActionButton
                label="Revogar porte"
                icon={ShieldCheck}
                onClick={() =>
                  void onCreateProcess(
                    member,
                    "WEAPONS_PERMIT_REVOKE",
                  )
                }
              />
              <ActionButton
                label="Adicionar nota"
                icon={FileText}
                onClick={() =>
                  void onAddNote(member)
                }
              />
            </section>

            <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <Panel title="Últimas folhas de ponto">
                {(member.recentPoints || []).length ? (
                  member.recentPoints.map((point: any) => (
                    <Row
                      key={point._id}
                      title={`${dateTime(point.startTime)} → ${dateTime(point.endTime)}`}
                      subtitle={`${hours(point.hours)} · ${point.tipo || "Normal"}`}
                    />
                  ))
                ) : (
                  <Empty text="Sem folhas de ponto." />
                )}
              </Panel>

              <Panel title="Últimas patrulhas">
                {(member.recentPatrols || []).length ? (
                  member.recentPatrols.map((patrol: any) => (
                    <Row
                      key={patrol._id}
                      title={patrol.number || "CP"}
                      subtitle={`${dateTime(patrol.startTime)} · ${patrol.vehicle || "Sem viatura"}`}
                    />
                  ))
                ) : (
                  <Empty text="Sem patrulhas registadas." />
                )}
              </Panel>

              <Panel title="Ausência atual">
                {member.absence ? (
                  <>
                    <Row
                      title={
                        member.absence.reason ||
                        "Ausência registada"
                      }
                      subtitle={`${date(member.absence.periodStart)} → ${date(member.absence.periodEnd)} · ${member.absence.status || "Sem estado"}`}
                    />

                    {member.absence.ticketUrl && (
                      <a
                        href={member.absence.ticketUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl border border-sky-400/20 bg-sky-500/10 px-4 py-3 text-[8px] font-black uppercase text-sky-300"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Abrir ticket no Discord
                      </a>
                    )}
                  </>
                ) : (
                  <Empty text="Sem ausência ativa." />
                )}
              </Panel>

              <Panel title="Processos do DRH">
                {(details?.member?.processes || []).length ? (
                  details.member.processes.map((process: any) => (
                    <Row
                      key={process._id}
                      title={`${process.processNumber} · ${process.title}`}
                      subtitle={`${process.type} · ${process.status}`}
                    />
                  ))
                ) : (
                  <Empty text="Sem processos." />
                )}
              </Panel>

              <Panel title="Alertas ativos">
                {(details?.alerts || []).length ? (
                  details.alerts.map((alert: any) => (
                    <Row
                      key={alert._id}
                      title={alert.title}
                      subtitle={`${alert.severity} · ${alert.description}`}
                    />
                  ))
                ) : (
                  <Empty text="Sem alertas ativos." />
                )}
              </Panel>
            </section>

            <Panel title="Notas internas">
              {(details?.notes || []).length ? (
                details.notes.map((note: any) => (
                  <Row
                    key={note._id}
                    title={note.createdByName}
                    subtitle={`${dateTime(note.createdAt)} · ${note.note}`}
                  />
                ))
              ) : (
                <Empty text="Sem notas internas." />
              )}
            </Panel>
          </div>
        )}
      </div>
    </div>
  );
}

function ActionButton({
  label,
  icon: Icon,
  onClick,
}: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[8px] font-black uppercase text-white/50 transition hover:border-emerald-400/20 hover:text-emerald-300"
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function Panel({
  title,
  children,
}: any) {
  return (
    <section className="rounded-[1.5rem] border border-white/10 bg-black/20 p-5">
      <h3 className="font-black text-white">
        {title}
      </h3>

      <div className="mt-4 space-y-3">
        {children}
      </div>
    </section>
  );
}

function Row({
  title,
  subtitle,
}: any) {
  return (
    <article className="rounded-xl border border-white/10 bg-[#06100c]/70 p-4">
      <p className="text-sm font-black text-white">
        {title}
      </p>

      <p className="mt-1 text-xs leading-5 text-white/35">
        {subtitle}
      </p>
    </article>
  );
}

function Empty({ text }: any) {
  return (
    <p className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-white/25">
      {text}
    </p>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
}: any) {
  return (
    <article className="rounded-[1.6rem] border border-white/10 bg-[#06100c]/90 p-5">
      <Icon className="h-5 w-5 text-emerald-300" />

      <p className="mt-4 text-2xl font-black text-white">
        {value}
      </p>

      <p className="mt-1 text-[8px] font-black uppercase tracking-[0.1em] text-white/30">
        {label}
      </p>
    </article>
  );
}

function TabButton({
  active,
  title,
  description,
  icon: Icon,
  onClick,
}: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-4 py-3 text-left transition ${
        active
          ? "border-emerald-400/25 bg-emerald-500/10"
          : "border-white/10 bg-black/20 hover:border-white/20"
      }`}
    >
      <Icon
        className={`h-5 w-5 ${
          active
            ? "text-emerald-300"
            : "text-white/25"
        }`}
      />

      <p className="mt-3 font-black text-white">
        {title}
      </p>

      <p className="mt-1 text-xs leading-5 text-white/30">
        {description}
      </p>
    </button>
  );
}

function Person({ item }: any) {
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <p className="truncate font-black text-white">
          {item.name}
        </p>

        <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[7px] font-black uppercase text-emerald-300">
          {item.rank || "Sem patente"}
        </span>
      </div>

      <p className="mt-2 truncate text-xs text-white/40">
        {item.unit || "Sem unidade"}
      </p>

      <p className="mt-1 truncate text-[8px] text-white/20">
        {item.discordId}
      </p>
    </div>
  );
}

function Data({
  label,
  value,
}: any) {
  return (
    <div>
      <p className="text-[7px] font-black uppercase text-white/20 lg:hidden">
        {label}
      </p>

      <p className="mt-1 text-sm font-black text-white/65">
        {value}
      </p>
    </div>
  );
}

function Info({
  label,
  value,
}: any) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <p className="text-[7px] font-black uppercase tracking-[0.08em] text-white/25">
        {label}
      </p>

      <p className="mt-1 truncate text-xs font-black text-white">
        {value}
      </p>
    </div>
  );
}
