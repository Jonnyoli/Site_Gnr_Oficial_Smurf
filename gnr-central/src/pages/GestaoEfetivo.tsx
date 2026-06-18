import { useMemo, useState } from "react";
import { Link } from "wouter";
import {
  Award,
  Clock3,
  Grid3X3,
  List,
  Search,
  Shield,
  UserRound,
  Users,
} from "lucide-react";
import { useData } from "../context/DataContext";


const GNR_ROLE_ID = "1147878941974077478";

function roleId(value: any) {
  return typeof value === "string"
    ? value
    : String(
        value?.id ||
          value?.roleId ||
          "",
      );
}

function hasCurrentGnrRole(item: any) {
  /*
   * Compatível com respostas novas e antigas da API.
   * Só rejeita o membro quando a API diz explicitamente que saiu
   * do servidor; a ausência de isInGuild já não elimina o efetivo.
   */
  if (
    item?.isInGuild ===
    false
  ) {
    return false;
  }

  if (
    item?.isMilitar ===
    true
  ) {
    return true;
  }

  return [
    item?.roles,
    item?.discordRoles,
    item?.savedTags,
    item?.roleIds,
  ].some(
    (roles) =>
      Array.isArray(roles) &&
      roles
        .map(roleId)
        .includes(
          GNR_ROLE_ID,
        ),
  );
}

type ViewMode = "cards" | "table";
type SortMode = "hierarchy" | "name" | "hours";

function guardId(guard: any) {
  return String(
    guard?.discordId ||
      guard?.id ||
      guard?._id ||
      guard?.numero ||
      ""
  );
}

function guardName(guard: any) {
  return (
    guard?.nome ||
    guard?.displayName ||
    guard?.username ||
    "Militar"
  );
}

function guardRank(guard: any) {
  return guard?.posto || guard?.rank || "Operacional";
}

function guardUnit(guard: any) {
  return guard?.unidade || guard?.unit || "Sem unidade";
}

function currentOperationalWeek() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(
    start.getDate() -
    start.getDay(),
  );

  const end = new Date(start);
  end.setDate(
    end.getDate() + 7,
  );

  return {
    start,
    end,
  };
}

function recordDate(entry: any) {
  const value =
    entry?.dataRaw ||
    entry?.endTime ||
    entry?.data ||
    null;

  if (!value) {
    return null;
  }

  const date =
    new Date(value);

  return Number.isNaN(
    date.getTime(),
  )
    ? null
    : date;
}

export default function GestaoEfetivo() {
  const data = useData() as any;

  const [query, setQuery] = useState("");
  const [unit, setUnit] = useState("ALL");
  const [rank, setRank] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [sort, setSort] = useState<SortMode>("hierarchy");
  const [view, setView] = useState<ViewMode>("cards");

  const rawGuards = Array.isArray(data.guardas)
    ? data.guardas
    : data.guardas?.items ||
      data.guardas?.data ||
      [];

  const hours = Array.isArray(data.currentHoras)
    ? data.currentHoras
    : data.currentHoras?.items || [];

  const guards = useMemo(() => {
    const map = new Map<string, any>();

    rawGuards
      .filter(hasCurrentGnrRole)
      .forEach((guard: any, index: number) => {
      const id = guardId(guard) || `${guardName(guard)}-${index}`;
      map.set(id, { ...(map.get(id) || {}), ...guard });
    });

    return [...map.values()];
  }, [rawGuards]);

  function totalHoursFor(id: string) {
    const guard =
      guards.find(
        (item: any) =>
          guardId(item) === id,
      );

    const backendWeeklyHours =
      Number(
        guard?.horasSemanaAtual ??
        guard?.horasSemanais,
      );

    if (
      Number.isFinite(
        backendWeeklyHours,
      )
    ) {
      return backendWeeklyHours;
    }

    const {
      start,
      end,
    } =
      currentOperationalWeek();

    return hours
      .filter(
        (entry: any) => {
          const sameGuard =
            String(
              entry?.discordId ||
              entry?.userId ||
              entry?.guardaId ||
              "",
            ) === id;

          const date =
            recordDate(entry);

          return (
            sameGuard &&
            date &&
            date >= start &&
            date < end
          );
        },
      )
      .reduce(
        (
          sum: number,
          entry: any,
        ) =>
          sum +
          Number(
            entry?.horasRegistadas ||
            entry?.horas ||
            entry?.hours ||
            0,
          ),
        0,
      );
  }

  const units = useMemo(
    () => [...new Set(guards.map(guardUnit))].filter(Boolean).sort(),
    [guards]
  );

  const ranks = useMemo(
    () => [...new Set(guards.map(guardRank))].filter(Boolean).sort(),
    [guards]
  );

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();

    return guards
      .filter((guard: any) => {
        const matchesSearch =
          !term ||
          [
            guardName(guard),
            guardRank(guard),
            guardUnit(guard),
            guard?.discordId,
            guard?.numero,
          ]
            .filter(Boolean)
            .some((value) =>
              String(value).toLowerCase().includes(term)
            );

        return (
          matchesSearch &&
          (unit === "ALL" || guardUnit(guard) === unit) &&
          (rank === "ALL" || guardRank(guard) === rank) &&
          (status === "ALL" ||
            String(guard?.estado || guard?.status || "") === status)
        );
      })
      .sort((a: any, b: any) => {
        if (sort === "name") {
          return guardName(a).localeCompare(guardName(b), "pt-PT");
        }

        if (sort === "hours") {
          return totalHoursFor(guardId(b)) - totalHoursFor(guardId(a));
        }

        return (
          Number(a?.hierarchyOrder || 999) -
            Number(b?.hierarchyOrder || 999) ||
          guardName(a).localeCompare(guardName(b), "pt-PT")
        );
      });
  }, [guards, query, unit, rank, status, sort, hours]);

  return (
    <div className="space-y-6 pb-12">
      <section className="rounded-[2.6rem] border border-primary/15 bg-[#06100c]/95 p-7">
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">
          Recursos humanos
        </p>
        <h1 className="mt-3 text-4xl font-black text-white">
          Gestão Avançada do Efetivo
        </h1>
        <p className="mt-3 text-sm text-white/40">
          Pesquisa, filtros, horas, unidades e acesso imediato à ficha individual.
        </p>
      </section>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Metric label="Militares" value={guards.length} icon={Users} />
        <Metric
          label="Com unidade"
          value={guards.filter((guard: any) => guardUnit(guard) !== "Sem unidade").length}
          icon={Shield}
        />
        <Metric
          label="Acima de 40h"
          value={guards.filter((guard: any) => totalHoursFor(guardId(guard)) > 40).length}
          icon={Clock3}
        />
        <Metric
          label="Com patente"
          value={guards.filter((guard: any) => guardRank(guard) !== "Operacional").length}
          icon={Award}
        />
      </section>

      <section className="space-y-4 rounded-[1.8rem] border border-white/10 bg-[#06100c]/90 p-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_180px_180px_170px_170px]">
          <div className="flex h-12 items-center rounded-xl border border-white/10 bg-black/25 px-4">
            <Search className="mr-3 h-4 w-4 text-primary" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Militar, patente, unidade, NIM ou Discord ID..."
              className="h-full min-w-0 flex-1 bg-transparent text-sm text-white outline-none"
            />
          </div>

          <SelectFilter value={unit} onChange={setUnit} allLabel="Todas as unidades" values={units} />
          <SelectFilter value={rank} onChange={setRank} allLabel="Todos os postos" values={ranks} />
          <SelectFilter
            value={status}
            onChange={setStatus}
            allLabel="Todos os estados"
            values={["Em serviço", "Folga", "Ausente"]}
          />

          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as SortMode)}
            className="h-12 rounded-xl border border-white/10 bg-black/25 px-3 text-sm text-white outline-none"
          >
            <option value="hierarchy">Hierarquia</option>
            <option value="name">Nome</option>
            <option value="hours">Horas</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3">
          <p className="text-xs text-white/35">
            <strong className="text-white">{filtered.length}</strong>{" "}
            resultado{filtered.length === 1 ? "" : "s"}
          </p>

          <div className="flex rounded-xl border border-white/10 bg-black/20 p-1">
            <button
              type="button"
              onClick={() => setView("cards")}
              className={`rounded-lg p-2 ${
                view === "cards"
                  ? "bg-primary/10 text-primary"
                  : "text-white/30"
              }`}
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setView("table")}
              className={`rounded-lg p-2 ${
                view === "table"
                  ? "bg-primary/10 text-primary"
                  : "text-white/30"
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {view === "cards" ? (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((guard: any) => {
            const id = guardId(guard);
            const total = totalHoursFor(id);

            return (
              <Link
                key={id}
                href={`/guardas/${id}`}
                className="group rounded-[1.7rem] border border-white/10 bg-[#06100c]/90 p-5 transition hover:-translate-y-1 hover:border-primary/25"
              >
                <div className="flex items-start gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                    <UserRound className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-black text-white group-hover:text-primary">
                      {guardName(guard)}
                    </p>
                    <p className="mt-1 text-xs text-primary">
                      {guardRank(guard)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <Info label="Unidade" value={guardUnit(guard)} />
                  <Info label="Horas semana" value={`${total.toFixed(1)}h`} />
                  <Info label="Estado" value={guard?.estado || guard?.status || "—"} />
                  <Info label="NIM" value={guard?.numero || "—"} />
                </div>
              </Link>
            );
          })}
        </section>
      ) : (
        <section className="overflow-hidden rounded-[1.8rem] border border-white/10 bg-[#06100c]/90">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="border-b border-white/10 bg-black/20">
                <tr className="text-left text-[9px] font-black uppercase tracking-[0.12em] text-white/30">
                  <th className="px-5 py-4">Militar</th>
                  <th className="px-5 py-4">Posto</th>
                  <th className="px-5 py-4">Unidade</th>
                  <th className="px-5 py-4">Estado</th>
                  <th className="px-5 py-4">Semana (dom–sáb)</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((guard: any) => {
                  const id = guardId(guard);

                  return (
                    <tr
                      key={id}
                      className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.025]"
                    >
                      <td className="px-5 py-4">
                        <Link href={`/guardas/${id}`} className="font-black text-white hover:text-primary">
                          {guardName(guard)}
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-sm text-white/55">{guardRank(guard)}</td>
                      <td className="px-5 py-4 text-sm text-white/55">{guardUnit(guard)}</td>
                      <td className="px-5 py-4 text-sm text-white/55">
                        {guard?.estado || guard?.status || "—"}
                      </td>
                      <td className="px-5 py-4 text-sm font-black text-primary">
                        {totalHoursFor(id).toFixed(1)}h
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function SelectFilter({
  value,
  onChange,
  allLabel,
  values,
}: {
  value: string;
  onChange: (value: string) => void;
  allLabel: string;
  values: string[];
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-12 rounded-xl border border-white/10 bg-black/25 px-3 text-sm text-white outline-none"
    >
      <option value="ALL">{allLabel}</option>
      {values.map((item) => (
        <option key={item} value={item}>
          {item}
        </option>
      ))}
    </select>
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <p className="text-[8px] font-black uppercase tracking-[0.1em] text-white/25">
        {label}
      </p>
      <p className="mt-1 truncate text-xs font-black text-white">{value}</p>
    </div>
  );
}
