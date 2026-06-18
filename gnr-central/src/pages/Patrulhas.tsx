import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useData } from "../context/DataContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  Users,
  Car,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Radio,
  Route,
  FileClock,
  CalendarRange,
} from "lucide-react";
import { motion } from "framer-motion";

type EstadoFiltro = "todas" | "Ativa" | "Concluída" | "Cancelada";
type PeriodoFiltro = "diario" | "semanal" | "mensal" | "personalizado";

const AUTO_REFRESH_MS = 15000;

const ESTADOS: { value: EstadoFiltro; label: string }[] = [
  { value: "todas", label: "Todas" },
  { value: "Ativa", label: "Ativas" },
  { value: "Concluída", label: "Concluídas" },
  { value: "Cancelada", label: "Canceladas" },
];

const PERIODOS: { value: PeriodoFiltro; label: string }[] = [
  { value: "diario", label: "Diário" },
  { value: "semanal", label: "Semanal" },
  { value: "mensal", label: "Mensal" },
  { value: "personalizado", label: "Personalizado" },
];

function buildNoCacheUrl(url: string) {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}force=${Date.now()}`;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function formatPtDate(date: Date) {
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function parsePtDate(value: string, endOfDay = false) {
  const clean = value.trim();

  const match = clean.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);

  const date = new Date(
    year,
    month - 1,
    day,
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0
  );

  const isValid =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;

  return isValid ? date : null;
}

function formatDateInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);

  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;

  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function getDefaultCustomRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);

  return {
    start: formatPtDate(start),
    end: formatPtDate(now),
  };
}

function getPeriodRange(
  periodo: PeriodoFiltro,
  customRange: { start: string; end: string }
) {
  const now = new Date();

  let start = new Date();
  let end = new Date();

  if (periodo === "diario") {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  }

  if (periodo === "semanal") {
    const currentDay = now.getDay();
    const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;

    start = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - distanceToMonday,
      0,
      0,
      0,
      0
    );

    end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
  }

  if (periodo === "mensal") {
    start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  if (periodo === "personalizado") {
    const parsedStart = parsePtDate(customRange.start, false);
    const parsedEnd = parsePtDate(customRange.end, true);

    start =
      parsedStart ||
      new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

    end =
      parsedEnd ||
      new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  }

  return {
    start,
    end,
    startISO: start.toISOString(),
    endISO: end.toISOString(),
    label: `${formatPtDate(start)} a ${formatPtDate(end)}`,
  };
}

function getEstadoClassName(estado?: string) {
  switch (estado) {
    case "Ativa":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-400";
    case "Concluída":
      return "border-blue-500/20 bg-blue-500/10 text-blue-400";
    case "Cancelada":
      return "border-red-500/20 bg-red-500/10 text-red-400";
    default:
      return "border-slate-500/20 bg-slate-500/10 text-slate-400";
  }
}

function getEstadoIcon(estado?: string) {
  switch (estado) {
    case "Ativa":
      return <Radio className="h-3.5 w-3.5" />;
    case "Concluída":
      return <CheckCircle2 className="h-3.5 w-3.5" />;
    case "Cancelada":
      return <XCircle className="h-3.5 w-3.5" />;
    default:
      return <Clock className="h-3.5 w-3.5" />;
  }
}

function formatLastUpdated(date?: Date | null) {
  if (!date) return "A aguardar";

  return date.toLocaleTimeString("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function getInitials(name?: string) {
  if (!name) return "??";

  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function Patrulhas() {
  const {
    patrulhas,
    isLoading: isDataLoading,
    isFetching: isDataFetching,
    lastUpdated,
    refreshData,
  } = useData();

  const [searchTerm, setSearchTerm] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>("todas");
  const [periodoFiltro, setPeriodoFiltro] = useState<PeriodoFiltro>("mensal");
  const [customRange, setCustomRange] = useState(getDefaultCustomRange());

  const range = useMemo(
    () => getPeriodRange(periodoFiltro, customRange),
    [periodoFiltro, customRange]
  );

  const {
    data: patrulhasPeriodo = [],
    isLoading,
    isFetching,
    refetch,
    dataUpdatedAt,
  } = useQuery<any[]>({
    queryKey: ["patrulhas-periodo", periodoFiltro, range.startISO, range.endISO],
    queryFn: async () => {
      const apiUrl = import.meta.env.VITE_API_URL || "";

      const url =
        `${apiUrl}/api/data/patrulhas` +
        `?startDate=${encodeURIComponent(range.startISO)}` +
        `&endDate=${encodeURIComponent(range.endISO)}`;

      const response = await fetch(buildNoCacheUrl(url), {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });

      if (!response.ok) {
        throw new Error("Erro ao carregar patrulhas");
      }

      return response.json();
    },
    refetchInterval: AUTO_REFRESH_MS,
    refetchIntervalInBackground: true,
    staleTime: 0,
  });

  const sourcePatrulhas = patrulhasPeriodo || [];

  const filteredPatrulhas = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return (sourcePatrulhas || [])
      .filter((patrulha: any) => {
        if (!patrulha) return false;

        const matchesEstado =
          estadoFiltro === "todas" || patrulha.estado === estadoFiltro;

        const num = String(patrulha.numero || patrulha.number || "").toLowerCase();
        const comandante = String(patrulha.comandante || "").toLowerCase();
        const viatura = String(patrulha.viatura || "").toLowerCase();
        const estado = String(patrulha.estado || "").toLowerCase();

        const matchesSearch =
          search.length === 0 ||
          num.includes(search) ||
          comandante.includes(search) ||
          viatura.includes(search) ||
          estado.includes(search);

        return matchesEstado && matchesSearch;
      })
      .sort((a: any, b: any) => {
        const timeA = a.dataRaw
          ? new Date(a.dataRaw).getTime()
          : a.data
            ? new Date(a.data).getTime()
            : 0;

        const timeB = b.dataRaw
          ? new Date(b.dataRaw).getTime()
          : b.data
            ? new Date(b.data).getTime()
            : 0;

        return (
          (Number.isNaN(timeB) ? 0 : timeB) -
          (Number.isNaN(timeA) ? 0 : timeA)
        );
      });
  }, [sourcePatrulhas, searchTerm, estadoFiltro]);

  const metrics = useMemo(() => {
    const all = sourcePatrulhas || [];

    const ativas = all.filter((p: any) => p.estado === "Ativa").length;
    const concluidas = all.filter((p: any) => p.estado === "Concluída").length;
    const canceladas = all.filter((p: any) => p.estado === "Cancelada").length;

    const militares = all.reduce(
      (acc: number, p: any) => acc + Number(p.participantes || 0),
      0
    );

    return {
      total: all.length,
      ativas,
      concluidas,
      canceladas,
      militares,
      geralAtivas: (patrulhas || []).filter((p: any) => p.estado === "Ativa").length,
    };
  }, [sourcePatrulhas, patrulhas]);

  const updatedText = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("pt-PT", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : formatLastUpdated(lastUpdated);

  const handleRefresh = () => {
    refreshData?.();
    refetch();
  };

  if (isLoading || isDataLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="relative flex flex-col items-center gap-5 rounded-[2rem] border border-white/10 bg-[#050b09]/80 px-12 py-10 shadow-[0_24px_90px_rgba(0,0,0,0.38)] backdrop-blur-xl">
          <div className="absolute inset-0 rounded-[2rem] bg-primary/5 blur-2xl" />
          <Loader2 className="relative h-11 w-11 animate-spin text-primary" />

          <div className="relative text-center">
            <p className="text-sm font-black uppercase tracking-[0.25em] text-white">
              Patrulhas
            </p>
            <p className="mt-2 text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">
              A carregar patrulhas operacionais...
            </p>
          </div>
        </div>
      </div>
    );
  }

  const refreshing = isFetching || isDataFetching;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-8"
    >
      <section className="relative overflow-hidden rounded-[2.25rem] border border-white/10 bg-[#050b09]/80 p-8 shadow-[0_28px_120px_rgba(0,0,0,0.42)] backdrop-blur-xl">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-primary/10 blur-[110px]" />
        <div className="absolute -bottom-28 left-1/3 h-80 w-80 rounded-full bg-emerald-500/10 blur-[120px]" />
        <div className="absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-primary/45 to-transparent" />

        <div className="relative flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-3 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.25em] text-primary">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                </span>
                Patrulhamento Operacional
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                <RefreshCw
                  className={`h-3.5 w-3.5 text-primary ${
                    refreshing ? "animate-spin" : ""
                  }`}
                />
                Atualizado {updatedText}
              </div>
            </div>

            <h1 className="flex flex-wrap items-center gap-4 text-4xl font-black tracking-tight text-white md:text-5xl">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-[0_0_40px_rgba(16,185,129,0.16)]">
                <Route className="h-8 w-8" />
              </span>
              Patrulhas
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">
              Gestão e acompanhamento das patrulhas, comandantes, viaturas,
              efetivo atribuído e estado operacional no período selecionado.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 xl:w-[460px]">
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                <CalendarRange className="h-4 w-4 text-primary" />
                Seleção de período
              </div>

              <div className="flex flex-wrap gap-2">
                {PERIODOS.map((item) => (
                  <button
                    key={item.value}
                    onClick={() => setPeriodoFiltro(item.value)}
                    className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] transition-all ${
                      periodoFiltro === item.value
                        ? "bg-primary text-primary-foreground shadow-[0_0_18px_rgba(16,185,129,0.22)]"
                        : "border border-white/10 bg-white/[0.035] text-muted-foreground hover:border-white/20 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {periodoFiltro === "personalizado" && (
                <div className="mt-4">
                  <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
                    <div>
                      <p className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                        De
                      </p>
                      <Input
                        value={customRange.start}
                        onChange={(e) =>
                          setCustomRange((prev) => ({
                            ...prev,
                            start: formatDateInput(e.target.value),
                          }))
                        }
                        placeholder="dd/mm/aaaa"
                        maxLength={10}
                        className="h-10 rounded-xl border-white/10 bg-background/70 font-mono text-sm"
                      />
                    </div>

                    <div className="pb-2 text-xs font-black uppercase tracking-[0.16em] text-primary">
                      a
                    </div>

                    <div>
                      <p className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                        Até
                      </p>
                      <Input
                        value={customRange.end}
                        onChange={(e) =>
                          setCustomRange((prev) => ({
                            ...prev,
                            end: formatDateInput(e.target.value),
                          }))
                        }
                        placeholder="dd/mm/aaaa"
                        maxLength={10}
                        className="h-10 rounded-xl border-white/10 bg-background/70 font-mono text-sm"
                      />
                    </div>
                  </div>

                  <p className="mt-3 text-xs font-bold text-slate-400">
                    Personalizado:{" "}
                    <span className="font-mono text-primary">
                      {customRange.start || "xx/xx/xxxx"} a{" "}
                      {customRange.end || "xx/xx/xxxx"}
                    </span>
                  </p>
                </div>
              )}

              {periodoFiltro !== "personalizado" && (
                <p className="mt-3 text-xs font-bold text-slate-400">
                  Período atual:{" "}
                  <span className="font-mono text-primary">{range.label}</span>
                </p>
              )}
            </div>

            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              variant="outline"
              className="h-11 rounded-2xl border border-primary/20 bg-primary/10 text-xs font-black uppercase tracking-[0.16em] text-primary hover:bg-primary/20"
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              Atualizar patrulhas
            </Button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Patrulhas no Período"
          value={metrics.total}
          subtitle="Registos filtrados"
          icon={<Route className="h-5 w-5" />}
          tone="primary"
          delay={0.05}
        />

        <MetricCard
          title="Em Curso"
          value={metrics.ativas}
          subtitle={`${metrics.geralAtivas} ativas no total`}
          icon={<Radio className="h-5 w-5" />}
          tone="green"
          delay={0.1}
        />

        <MetricCard
          title="Concluídas"
          value={metrics.concluidas}
          subtitle="Patrulhas encerradas"
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="blue"
          delay={0.15}
        />

        <MetricCard
          title="Efetivo Mobilizado"
          value={metrics.militares}
          subtitle="Militares registados"
          icon={<Users className="h-5 w-5" />}
          tone="yellow"
          delay={0.2}
        />
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
        <div className="glass rounded-3xl border border-white/10 p-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-md">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por patrulha, comandante, viatura..."
                className="h-11 rounded-2xl border-white/10 bg-background/60 pl-11 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {ESTADOS.map((estado) => (
                <button
                  key={estado.value}
                  onClick={() => setEstadoFiltro(estado.value)}
                  className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.14em] transition-all ${
                    estadoFiltro === estado.value
                      ? "bg-primary text-primary-foreground shadow-[0_0_18px_rgba(16,185,129,0.22)]"
                      : "border border-white/10 bg-white/[0.035] text-muted-foreground hover:border-white/20 hover:text-white"
                  }`}
                >
                  {estado.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <SmallStateCard
            label="Ativas"
            value={metrics.ativas}
            icon={<Radio className="h-4 w-4" />}
            tone="green"
          />

          <SmallStateCard
            label="Canceladas"
            value={metrics.canceladas}
            icon={<XCircle className="h-4 w-4" />}
            tone="red"
          />
        </div>
      </section>

      <div className="glass overflow-hidden rounded-3xl border border-white/10 shadow-[0_24px_90px_rgba(0,0,0,0.30)]">
        <Table>
          <TableHeader className="bg-white/[0.025]">
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="h-14 text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
                Identificação
              </TableHead>
              <TableHead className="h-14 text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
                Comandante
              </TableHead>
              <TableHead className="h-14 text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
                Viatura
              </TableHead>
              <TableHead className="h-14 text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
                Efetivo
              </TableHead>
              <TableHead className="h-14 text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
                Data / Hora
              </TableHead>
              <TableHead className="h-14 text-right text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
                Estado
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filteredPatrulhas.length > 0 ? (
              filteredPatrulhas.map((patrulha: any, index: number) => (
                <TableRow
                  key={patrulha.id || index}
                  className="border-white/10 transition-colors hover:bg-white/[0.025]"
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-sm font-black text-primary">
                        {patrulha.numero || "N/A"}
                      </div>

                      <div>
                        <p className="font-black tracking-wide text-white">
                          Patrulha {patrulha.numero || "N/A"}
                        </p>
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                          Registo #{String(index + 1).padStart(2, "0")}
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] text-xs font-black text-white">
                        {getInitials(patrulha.comandante)}
                      </div>

                      <div>
                        <p className="font-bold text-white">
                          {patrulha.comandante || "Desconhecido"}
                        </p>
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                          Comandante
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Car className="h-4 w-4 text-primary" />
                      <span className="text-sm font-bold text-white">
                        {patrulha.viatura || "N/A"}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-muted-foreground">
                      <Users className="h-4 w-4 text-primary" />
                      {Number(patrulha.participantes || 0)} Militares
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-sm font-bold text-white">
                        <Calendar className="h-3.5 w-3.5 text-primary" />
                        {patrulha.data || "N/A"}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        Início: {patrulha.horaInicio || "N/A"}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="text-right">
                    <Badge
                      variant="outline"
                      className={`gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.13em] ${getEstadoClassName(
                        patrulha.estado
                      )}`}
                    >
                      {getEstadoIcon(patrulha.estado)}
                      {patrulha.estado || "N/A"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-44 text-center">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <FileClock className="h-10 w-10 text-slate-600" />
                    <p className="text-sm font-black uppercase tracking-[0.18em]">
                      Nenhuma patrulha encontrada
                    </p>
                    <p className="text-xs">
                      Altera o período, o filtro ou a pesquisa.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </motion.div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  tone,
  delay,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  tone: "primary" | "green" | "yellow" | "blue";
  delay: number;
}) {
  const toneMap = {
    primary: "border-t-primary bg-primary/10 text-primary",
    green: "border-t-emerald-500 bg-emerald-500/10 text-emerald-400",
    yellow: "border-t-yellow-500 bg-yellow-500/10 text-yellow-400",
    blue: "border-t-blue-500 bg-blue-500/10 text-blue-400",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay }}
    >
      <div
        className={`glass rounded-3xl border border-white/10 border-t-2 p-5 ${toneMap[tone]}`}
      >
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-bold text-muted-foreground">{title}</p>

          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-current/10">
            {icon}
          </div>
        </div>

        <p className="text-3xl font-black tracking-tight text-white">{value}</p>
        <p className="mt-2 text-xs font-bold">{subtitle}</p>
      </div>
    </motion.div>
  );
}

function SmallStateCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "green" | "red";
}) {
  const toneMap = {
    green: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
    red: "border-red-500/20 bg-red-500/10 text-red-400",
  };

  return (
    <div className={`rounded-3xl border p-4 ${toneMap[tone]}`}>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] opacity-80">
          {label}
        </p>

        {icon}
      </div>

      <p className="text-3xl font-black text-white">{value}</p>
    </div>
  );
}