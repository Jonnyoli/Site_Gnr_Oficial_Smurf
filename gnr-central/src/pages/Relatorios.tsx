import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Award,
  BarChart3,
  CalendarRange,
  Clock,
  Download,
  FileSearch,
  Gauge,
  Loader2,
  Moon,
  Printer,
  RefreshCw,
  Search,
  ShieldCheck,
  Sun,
  Target,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useData } from "../context/DataContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type PeriodoFiltro =
  | "diario"
  | "semanal"
  | "mensal"
  | "personalizado";

type GuardaLike = {
  id: string;
  discordId?: string;
  nome?: string;
  posto?: string;
  rank?: string;
  numero?: string;
  horasTotal?: number;
  estado?: string;
  avatar?: string | null;
};

type HoraLike = {
  id?: string;
  guardaId?: string;
  discordId?: string;
  userId?: string;
  horasRegistadas?: number;
  horasNormais?: number;
  horasNoturnas?: number;
};

type SortKey =
  | "periodHours"
  | "previousHours"
  | "diff"
  | "totalHistory"
  | "nome";

const AUTO_REFRESH_MS = 15000;

const PERIODOS: {
  value: PeriodoFiltro;
  label: string;
}[] = [
  {
    value: "diario",
    label: "Diário",
  },
  {
    value: "semanal",
    label: "Semanal",
  },
  {
    value: "mensal",
    label: "Mensal",
  },
  {
    value: "personalizado",
    label: "Personalizado",
  },
];

function buildNoCacheUrl(url: string) {
  const separator = url.includes("?") ? "&" : "?";

  return `${url}${separator}force=${Date.now()}`;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function formatPtDate(date: Date) {
  return `${pad(date.getDate())}/${pad(
    date.getMonth() + 1,
  )}/${date.getFullYear()}`;
}

function parsePtDate(
  value: string,
  endOfDay = false,
) {
  const clean = value.trim();
  const match = clean.match(
    /^(\d{2})\/(\d{2})\/(\d{4})$/,
  );

  if (!match) {
    return null;
  }

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
    endOfDay ? 999 : 0,
  );

  const isValid =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;

  return isValid ? date : null;
}

function formatDateInput(value: string) {
  const digits = value
    .replace(/\D/g, "")
    .slice(0, 8);

  if (digits.length <= 2) {
    return digits;
  }

  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }

  return `${digits.slice(0, 2)}/${digits.slice(
    2,
    4,
  )}/${digits.slice(4)}`;
}

function getDefaultCustomRange() {
  const now = new Date();
  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    1,
  );

  return {
    start: formatPtDate(start),
    end: formatPtDate(now),
  };
}

function getPeriodRange(
  periodo: PeriodoFiltro,
  customRange: {
    start: string;
    end: string;
  },
) {
  const now = new Date();

  let start = new Date();
  let end = new Date();

  if (periodo === "diario") {
    start = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0,
    );

    end = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999,
    );
  }

  if (periodo === "semanal") {
    const currentDay = now.getDay();
    const distanceToMonday =
      currentDay === 0 ? 6 : currentDay - 1;

    start = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - distanceToMonday,
      0,
      0,
      0,
      0,
    );

    end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
  }

  if (periodo === "mensal") {
    start = new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
      0,
      0,
      0,
      0,
    );

    end = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );
  }

  if (periodo === "personalizado") {
    const parsedStart = parsePtDate(
      customRange.start,
      false,
    );

    const parsedEnd = parsePtDate(
      customRange.end,
      true,
    );

    start =
      parsedStart ||
      new Date(
        now.getFullYear(),
        now.getMonth(),
        1,
        0,
        0,
        0,
        0,
      );

    end =
      parsedEnd ||
      new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
        999,
      );
  }

  return {
    start,
    end,
    startISO: start.toISOString(),
    endISO: end.toISOString(),
    label: `${formatPtDate(start)} a ${formatPtDate(end)}`,
  };
}

function getPeriodLabel(periodo?: PeriodoFiltro) {
  switch (periodo) {
    case "diario":
      return "Diário";
    case "semanal":
      return "Semanal";
    case "mensal":
      return "Mensal";
    case "personalizado":
      return "Personalizado";
    default:
      return "Mensal";
  }
}

function getInitials(name?: string) {
  if (!name) {
    return "??";
  }

  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function getHoraOwnerId(hora: HoraLike) {
  return String(
    hora.guardaId ||
      hora.discordId ||
      hora.userId ||
      "",
  );
}

function getGuardaId(guarda: GuardaLike) {
  return String(
    guarda.discordId ||
      guarda.id ||
      "",
  );
}

function safeNumber(value: unknown) {
  const num = Number(value || 0);

  return Number.isFinite(num) ? num : 0;
}

function formatLastUpdated(
  date?: Date | null,
) {
  if (!date) {
    return "A aguardar";
  }

  return date.toLocaleTimeString(
    "pt-PT",
    {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    },
  );
}

function computePercentChange(
  current: number,
  previous: number,
) {
  if (previous === 0) {
    return current > 0
      ? 100
      : 0;
  }

  return (
    ((current - previous) /
      previous) *
    100
  );
}

function getPreviousRange(range: {
  start: Date;
  end: Date;
}) {
  const duration =
    range.end.getTime() -
    range.start.getTime();

  const previousEnd =
    new Date(
      range.start.getTime() - 1,
    );

  const previousStart =
    new Date(
      previousEnd.getTime() -
        duration,
    );

  return {
    start: previousStart,
    end: previousEnd,
    startISO:
      previousStart.toISOString(),
    endISO:
      previousEnd.toISOString(),
  };
}

function downloadCsv(
  filename: string,
  rows: string[][],
) {
  const content = rows
    .map((row) =>
      row
        .map((cell) =>
          `"${String(cell).replace(
            /"/g,
            '""',
          )}"`,
        )
        .join(";"),
    )
    .join("\n");

  const blob = new Blob(
    ["\uFEFF", content],
    {
      type:
        "text/csv;charset=utf-8;",
    },
  );

  const url =
    URL.createObjectURL(blob);

  const anchor =
    document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.click();

  URL.revokeObjectURL(url);
}

export default function Relatorios() {
  const {
    guardas,
    isLoading: isDataLoading,
    isFetching: isDataFetching,
    lastUpdated,
    refreshData,
  } = useData();

  const { toast } =
    useToast();

  const [
    periodoFiltro,
    setPeriodoFiltro,
  ] =
    useState<PeriodoFiltro>(
      "mensal",
    );

  const [
    customRange,
    setCustomRange,
  ] = useState(
    getDefaultCustomRange(),
  );

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    sortKey,
    setSortKey,
  ] =
    useState<SortKey>(
      "periodHours",
    );

  const range =
    useMemo(
      () =>
        getPeriodRange(
          periodoFiltro,
          customRange,
        ),
      [
        periodoFiltro,
        customRange,
      ],
    );

  const previousRange =
    useMemo(
      () =>
        getPreviousRange(
          range,
        ),
      [range],
    );

  const {
    data:
      currentHoras = [],
    isLoading:
      isCurrentLoading,
    isFetching:
      isCurrentFetching,
    refetch:
      refetchCurrent,
    dataUpdatedAt,
  } =
    useQuery<HoraLike[]>({
      queryKey: [
        "relatorios-horas-current",
        periodoFiltro,
        range.startISO,
        range.endISO,
      ],

      queryFn: async () => {
        const apiUrl =
          import.meta.env
            .VITE_API_URL ||
          "";

        const url =
          `${apiUrl}/api/data/horas` +
          `?startDate=${encodeURIComponent(
            range.startISO,
          )}` +
          `&endDate=${encodeURIComponent(
            range.endISO,
          )}`;

        const response =
          await fetch(
            buildNoCacheUrl(
              url,
            ),
            {
              cache:
                "no-store",

              credentials:
                "include",

              headers: {
                "Cache-Control":
                  "no-cache",

                Pragma:
                  "no-cache",
              },
            },
          );

        if (!response.ok) {
          throw new Error(
            "Erro ao carregar horas do período atual",
          );
        }

        return response.json();
      },

      refetchInterval:
        AUTO_REFRESH_MS,

      refetchIntervalInBackground:
        true,

      staleTime: 0,
    });

  const {
    data:
      prevHoras = [],
    isLoading:
      isPrevLoading,
    isFetching:
      isPrevFetching,
    refetch:
      refetchPrev,
  } =
    useQuery<HoraLike[]>({
      queryKey: [
        "relatorios-horas-previous",
        periodoFiltro,
        previousRange.startISO,
        previousRange.endISO,
      ],

      queryFn: async () => {
        const apiUrl =
          import.meta.env
            .VITE_API_URL ||
          "";

        const url =
          `${apiUrl}/api/data/horas` +
          `?startDate=${encodeURIComponent(
            previousRange.startISO,
          )}` +
          `&endDate=${encodeURIComponent(
            previousRange.endISO,
          )}`;

        const response =
          await fetch(
            buildNoCacheUrl(
              url,
            ),
            {
              cache:
                "no-store",

              credentials:
                "include",

              headers: {
                "Cache-Control":
                  "no-cache",

                Pragma:
                  "no-cache",
              },
            },
          );

        if (!response.ok) {
          throw new Error(
            "Erro ao carregar horas do período anterior",
          );
        }

        return response.json();
      },

      refetchInterval:
        AUTO_REFRESH_MS,

      refetchIntervalInBackground:
        true,

      staleTime: 0,
    });

  function handleRefresh() {
    refreshData?.();
    void refetchCurrent();
    void refetchPrev();
  }

  const reportData =
    useMemo(() => {
      const currentMap: Record<
        string,
        number
      > = {};

      const previousMap: Record<
        string,
        number
      > = {};

      const normalMap: Record<
        string,
        number
      > = {};

      const nightMap: Record<
        string,
        number
      > = {};

      currentHoras.forEach(
        (hora) => {
          const id =
            getHoraOwnerId(
              hora,
            );

          if (!id) {
            return;
          }

          currentMap[id] =
            (currentMap[id] ||
              0) +
            safeNumber(
              hora.horasRegistadas,
            );

          normalMap[id] =
            (normalMap[id] ||
              0) +
            safeNumber(
              hora.horasNormais,
            );

          nightMap[id] =
            (nightMap[id] ||
              0) +
            safeNumber(
              hora.horasNoturnas,
            );
        },
      );

      prevHoras.forEach(
        (hora) => {
          const id =
            getHoraOwnerId(
              hora,
            );

          if (!id) {
            return;
          }

          previousMap[id] =
            (previousMap[id] ||
              0) +
            safeNumber(
              hora.horasRegistadas,
            );
        },
      );

      const rows = (
        (guardas ||
          []) as GuardaLike[]
      )
        .map((guarda) => {
          const id =
            getGuardaId(
              guarda,
            );

          const periodHours =
            safeNumber(
              currentMap[id],
            );

          const previousHours =
            safeNumber(
              previousMap[id],
            );

          const normalHours =
            safeNumber(
              normalMap[id],
            );

          const nightHours =
            safeNumber(
              nightMap[id],
            );

          const totalHistory =
            safeNumber(
              guarda.horasTotal,
            );

          return {
            id,
            nome:
              guarda.nome ||
              "Desconhecido",
            posto:
              guarda.posto ||
              guarda.rank ||
              "Operacional",
            numero:
              guarda.numero ||
              "N/A",
            estado:
              guarda.estado ||
              "N/A",
            avatar:
              guarda.avatar ||
              null,
            periodHours,
            previousHours,
            normalHours,
            nightHours,
            totalHistory,
            diff:
              periodHours -
              previousHours,
          };
        })
        .sort(
          (a, b) =>
            b.periodHours -
            a.periodHours,
        );

      const chartData =
        rows
          .filter(
            (row) =>
              row.periodHours >
                0 ||
              row.previousHours >
                0,
          )
          .slice(0, 8)
          .map((row) => ({
            name:
              row.nome.split(
                " ",
              )[0] ||
              "N/A",

            "Período Atual":
              Number(
                row.periodHours.toFixed(
                  1,
                ),
              ),

            "Período Anterior":
              Number(
                row.previousHours.toFixed(
                  1,
                ),
              ),
          }));

      const totalCurrent =
        rows.reduce(
          (acc, row) =>
            acc +
            row.periodHours,
          0,
        );

      const totalPrevious =
        rows.reduce(
          (acc, row) =>
            acc +
            row.previousHours,
          0,
        );

      const totalNormal =
        rows.reduce(
          (acc, row) =>
            acc +
            row.normalHours,
          0,
        );

      const totalNight =
        rows.reduce(
          (acc, row) =>
            acc +
            row.nightHours,
          0,
        );

      const activeOperators =
        rows.filter(
          (row) =>
            row.periodHours > 0,
        ).length;

      const bestOperator =
        rows.find(
          (row) =>
            row.periodHours > 0,
        ) || null;

      const average =
        activeOperators > 0
          ? totalCurrent /
            activeOperators
          : 0;

      const percentChange =
        computePercentChange(
          totalCurrent,
          totalPrevious,
        );

      const serviceDistribution = [
        {
          name:
            "Horas Normais",
          value:
            Number(
              totalNormal.toFixed(
                1,
              ),
            ),
        },
        {
          name:
            "Horas Noturnas",
          value:
            Number(
              totalNight.toFixed(
                1,
              ),
            ),
        },
      ];

      return {
        rows,
        chartData,
        totalCurrent,
        totalPrevious,
        totalNormal,
        totalNight,
        activeOperators,
        bestOperator,
        average,
        percentChange,
        serviceDistribution,
      };
    }, [
      guardas,
      currentHoras,
      prevHoras,
    ]);

  const filteredRows =
    useMemo(() => {
      const normalized =
        search
          .trim()
          .toLowerCase();

      const rows =
        reportData.rows.filter(
          (row) =>
            !normalized ||
            row.nome
              .toLowerCase()
              .includes(
                normalized,
              ) ||
            row.posto
              .toLowerCase()
              .includes(
                normalized,
              ) ||
            String(
              row.numero,
            )
              .toLowerCase()
              .includes(
                normalized,
              ),
        );

      return [...rows].sort(
        (a, b) => {
          if (
            sortKey ===
            "nome"
          ) {
            return a.nome.localeCompare(
              b.nome,
              "pt",
            );
          }

          return (
            b[sortKey] -
            a[sortKey]
          );
        },
      );
    }, [
      reportData.rows,
      search,
      sortKey,
    ]);

  function handleExport() {
    const rows = [
      [
        "Posição",
        "Nome",
        "Posto",
        "Número",
        "Horas atuais",
        "Horas anteriores",
        "Diferença",
        "Horas normais",
        "Horas noturnas",
        "Histórico",
      ],

      ...filteredRows.map(
        (row, index) => [
          String(
            index + 1,
          ),
          row.nome,
          row.posto,
          row.numero,
          row.periodHours.toFixed(
            1,
          ),
          row.previousHours.toFixed(
            1,
          ),
          row.diff.toFixed(
            1,
          ),
          row.normalHours.toFixed(
            1,
          ),
          row.nightHours.toFixed(
            1,
          ),
          row.totalHistory.toFixed(
            1,
          ),
        ],
      ),
    ];

    downloadCsv(
      `relatorio-${periodoFiltro}-${range.startISO.slice(
        0,
        10,
      )}.csv`,
      rows,
    );

    toast({
      title:
        "Relatório exportado",
      description:
        "O ficheiro CSV foi gerado com sucesso.",
    });
  }

  const isLoading =
    isDataLoading ||
    isCurrentLoading ||
    isPrevLoading;

  const isFetching =
    isDataFetching ||
    isCurrentFetching ||
    isPrevFetching;

  const updatedText =
    dataUpdatedAt
      ? new Date(
          dataUpdatedAt,
        ).toLocaleTimeString(
          "pt-PT",
          {
            hour:
              "2-digit",
            minute:
              "2-digit",
            second:
              "2-digit",
          },
        )
      : formatLastUpdated(
          lastUpdated,
        );

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="relative flex flex-col items-center gap-5 rounded-[2rem] border border-white/10 bg-[#050b09]/80 px-12 py-10 shadow-[0_24px_90px_rgba(0,0,0,0.38)] backdrop-blur-xl">
          <div className="absolute inset-0 rounded-[2rem] bg-primary/5 blur-2xl" />

          <Loader2 className="relative h-11 w-11 animate-spin text-primary" />

          <div className="relative text-center">
            <p className="text-sm font-black uppercase tracking-[0.25em] text-white">
              Relatórios
            </p>

            <p className="mt-2 text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">
              A compilar atividade operacional...
            </p>
          </div>
        </div>
      </div>
    );
  }

  const hasChartData =
    reportData.chartData.length >
    0;

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 18,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.35,
      }}
      className="space-y-8 pb-12"
    >
      <section className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#050b09]/90 p-8 shadow-[0_32px_140px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(16,185,129,0.17),transparent_35%),radial-gradient(circle_at_90%_15%,rgba(59,130,246,0.10),transparent_30%)]" />

        <div className="absolute inset-0 cyber-grid-soft opacity-[0.12]" />

        <div className="relative flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-4xl">
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-3 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.25em] text-primary">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />

                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                </span>

                Centro de Inteligência
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                <RefreshCw
                  className={`h-3.5 w-3.5 text-primary ${
                    isFetching
                      ? "animate-spin"
                      : ""
                  }`}
                />

                Atualizado {updatedText}
              </div>
            </div>

            <h1 className="flex flex-wrap items-center gap-4 text-4xl font-black tracking-tight text-white md:text-5xl">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-[0_0_40px_rgba(16,185,129,0.16)]">
                <FileSearch className="h-8 w-8" />
              </span>

              Relatório Operacional
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">
              Leitura executiva do desempenho, evolução face ao período
              anterior, distribuição de serviço e auditoria individual do
              efetivo.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 xl:w-[500px]">
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                <CalendarRange className="h-4 w-4 text-primary" />

                Seleção de período
              </div>

              <div className="flex flex-wrap gap-2">
                {PERIODOS.map(
                  (item) => (
                    <button
                      key={
                        item.value
                      }
                      onClick={() =>
                        setPeriodoFiltro(
                          item.value,
                        )
                      }
                      className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] transition-all ${
                        periodoFiltro ===
                        item.value
                          ? "bg-primary text-primary-foreground shadow-[0_0_18px_rgba(16,185,129,0.22)]"
                          : "border border-white/10 bg-white/[0.035] text-muted-foreground hover:border-white/20 hover:text-white"
                      }`}
                    >
                      {item.label}
                    </button>
                  ),
                )}
              </div>

              {periodoFiltro ===
                "personalizado" && (
                <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-end gap-3">
                  <div>
                    <p className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                      De
                    </p>

                    <Input
                      value={
                        customRange.start
                      }
                      onChange={(
                        event,
                      ) =>
                        setCustomRange(
                          (
                            previous,
                          ) => ({
                            ...previous,

                            start:
                              formatDateInput(
                                event
                                  .target
                                  .value,
                              ),
                          }),
                        )
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
                      value={
                        customRange.end
                      }
                      onChange={(
                        event,
                      ) =>
                        setCustomRange(
                          (
                            previous,
                          ) => ({
                            ...previous,

                            end:
                              formatDateInput(
                                event
                                  .target
                                  .value,
                              ),
                          }),
                        )
                      }
                      placeholder="dd/mm/aaaa"
                      maxLength={10}
                      className="h-10 rounded-xl border-white/10 bg-background/70 font-mono text-sm"
                    />
                  </div>
                </div>
              )}

              <p className="mt-3 text-xs font-bold text-slate-400">
                Período atual:{" "}
                <span className="font-mono text-primary">
                  {range.label}
                </span>
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Button
                onClick={
                  handleRefresh
                }
                disabled={
                  isFetching
                }
                variant="outline"
                className="h-11 rounded-2xl border border-primary/20 bg-primary/10 text-[10px] font-black uppercase tracking-[0.14em] text-primary hover:bg-primary/20"
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${
                    isFetching
                      ? "animate-spin"
                      : ""
                  }`}
                />

                Atualizar
              </Button>

              <Button
                onClick={() =>
                  window.print()
                }
                variant="outline"
                className="h-11 rounded-2xl border border-white/10 bg-white/[0.04] text-[10px] font-black uppercase tracking-[0.14em] text-white/65 hover:bg-white/[0.08]"
              >
                <Printer className="mr-2 h-4 w-4" />

                Imprimir
              </Button>

              <Button
                onClick={
                  handleExport
                }
                className="h-11 rounded-2xl bg-primary text-[10px] font-black uppercase tracking-[0.14em] text-primary-foreground shadow-[0_0_28px_rgba(16,185,129,0.22)] hover:bg-primary/90"
              >
                <Download className="mr-2 h-4 w-4" />

                Exportar
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          title="Horas no período"
          value={`${reportData.totalCurrent.toFixed(
            1,
          )}h`}
          subtitle={`${reportData.percentChange >= 0 ? "+" : ""}${reportData.percentChange.toFixed(
            0,
          )}% vs anterior`}
          icon={
            <Clock className="h-5 w-5" />
          }
          tone="primary"
          delay={0.05}
        />

        <MetricCard
          title="Operacionais ativos"
          value={
            reportData.activeOperators
          }
          subtitle={`${getPeriodLabel(
            periodoFiltro,
          )} selecionado`}
          icon={
            <Users className="h-5 w-5" />
          }
          tone="green"
          delay={0.1}
        />

        <MetricCard
          title="Média por operacional"
          value={`${reportData.average.toFixed(
            1,
          )}h`}
          subtitle="Produtividade média"
          icon={
            <Gauge className="h-5 w-5" />
          }
          tone="blue"
          delay={0.15}
        />

        <MetricCard
          title="Horas noturnas"
          value={`${reportData.totalNight.toFixed(
            1,
          )}h`}
          subtitle="Serviço fora do período normal"
          icon={
            <Moon className="h-5 w-5" />
          }
          tone="violet"
          delay={0.2}
        />

        <MetricCard
          title="Melhor desempenho"
          value={
            reportData.bestOperator
              ? `${reportData.bestOperator.periodHours.toFixed(
                  1,
                )}h`
              : "0.0h"
          }
          subtitle={
            reportData.bestOperator
              ?.nome ||
            "Sem registos"
          }
          icon={
            <Trophy className="h-5 w-5" />
          }
          tone="yellow"
          delay={0.25}
        />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="glass overflow-hidden rounded-3xl border-white/10 shadow-[0_24px_90px_rgba(0,0,0,0.30)]">
          <CardHeader className="border-b border-white/10 bg-white/[0.025]">
            <CardTitle className="flex items-center gap-3 text-sm font-black uppercase tracking-[0.18em] text-muted-foreground">
              <TrendingUp className="h-5 w-5 text-primary" />

              Comparativo de desempenho
            </CardTitle>

            <p className="text-xs text-muted-foreground">
              Período atual vs período anterior — top 8 operacionais.
            </p>
          </CardHeader>

          <CardContent className="h-[410px] pt-6">
            {hasChartData ? (
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart
                  data={
                    reportData.chartData
                  }
                  margin={{
                    top: 20,
                    right: 30,
                    left: 0,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--border))"
                  />

                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill:
                        "hsl(var(--muted-foreground))",
                    }}
                  />

                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill:
                        "hsl(var(--muted-foreground))",
                    }}
                  />

                  <Tooltip
                    cursor={{
                      fill:
                        "hsl(var(--muted) / 0.2)",
                    }}
                    contentStyle={{
                      backgroundColor:
                        "hsl(var(--card))",
                      borderRadius:
                        "14px",
                      border:
                        "1px solid hsl(var(--border))",
                      color: "#fff",
                    }}
                  />

                  <Legend
                    iconType="circle"
                    wrapperStyle={{
                      paddingTop:
                        "20px",
                    }}
                  />

                  <Bar
                    dataKey="Período Atual"
                    fill="hsl(var(--primary))"
                    radius={[
                      8,
                      8,
                      0,
                      0,
                    ]}
                  />

                  <Bar
                    dataKey="Período Anterior"
                    fill="hsl(var(--accent))"
                    radius={[
                      8,
                      8,
                      0,
                      0,
                    ]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </CardContent>
        </Card>

        <Card className="glass overflow-hidden rounded-3xl border-white/10 shadow-[0_24px_90px_rgba(0,0,0,0.30)]">
          <CardHeader className="border-b border-white/10 bg-white/[0.025]">
            <CardTitle className="flex items-center gap-3 text-sm font-black uppercase tracking-[0.18em] text-muted-foreground">
              <Target className="h-5 w-5 text-primary" />

              Distribuição de serviço
            </CardTitle>
          </CardHeader>

          <CardContent className="h-[410px] pt-6">
            {reportData.totalNormal +
              reportData.totalNight >
            0 ? (
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <PieChart>
                  <Pie
                    data={
                      reportData.serviceDistribution
                    }
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="45%"
                    innerRadius={72}
                    outerRadius={112}
                    paddingAngle={5}
                  >
                    {reportData.serviceDistribution.map(
                      (
                        _entry,
                        index,
                      ) => (
                        <Cell
                          key={
                            index
                          }
                          fill={
                            index ===
                            0
                              ? "hsl(var(--primary))"
                              : "hsl(var(--accent))"
                          }
                        />
                      ),
                    )}
                  </Pie>

                  <Tooltip
                    contentStyle={{
                      backgroundColor:
                        "hsl(var(--card))",
                      borderRadius:
                        "14px",
                      border:
                        "1px solid hsl(var(--border))",
                      color: "#fff",
                    }}
                  />

                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card className="glass overflow-hidden rounded-3xl border-white/10 shadow-[0_24px_90px_rgba(0,0,0,0.30)]">
          <CardHeader className="border-b border-white/10 bg-white/[0.025]">
            <CardTitle className="flex items-center gap-3 text-sm font-black uppercase tracking-[0.18em] text-muted-foreground">
              <ShieldCheck className="h-5 w-5 text-primary" />

              Resumo executivo
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4 pt-6">
            <ExecutiveItem
              label="Período"
              value={
                range.label
              }
              icon={
                <CalendarRange className="h-4 w-4" />
              }
            />

            <ExecutiveItem
              label="Total atual"
              value={`${reportData.totalCurrent.toFixed(
                1,
              )}h`}
              icon={
                <Clock className="h-4 w-4" />
              }
            />

            <ExecutiveItem
              label="Total anterior"
              value={`${reportData.totalPrevious.toFixed(
                1,
              )}h`}
              icon={
                <TrendingUp className="h-4 w-4" />
              }
            />

            <ExecutiveItem
              label="Variação"
              value={`${reportData.percentChange >= 0 ? "+" : ""}${reportData.percentChange.toFixed(
                0,
              )}%`}
              icon={
                reportData.percentChange >=
                0 ? (
                  <ArrowUpRight className="h-4 w-4" />
                ) : (
                  <ArrowDownRight className="h-4 w-4" />
                )
              }
            />

            <ExecutiveItem
              label="Horas normais"
              value={`${reportData.totalNormal.toFixed(
                1,
              )}h`}
              icon={
                <Sun className="h-4 w-4" />
              }
            />

            <ExecutiveItem
              label="Horas noturnas"
              value={`${reportData.totalNight.toFixed(
                1,
              )}h`}
              icon={
                <Moon className="h-4 w-4" />
              }
            />
          </CardContent>
        </Card>

        <Card className="glass overflow-hidden rounded-3xl border-white/10 shadow-[0_24px_90px_rgba(0,0,0,0.30)]">
          <CardHeader className="border-b border-white/10 bg-white/[0.025]">
            <CardTitle className="flex items-center gap-3 text-sm font-black uppercase tracking-[0.18em] text-muted-foreground">
              <Award className="h-5 w-5 text-primary" />

              Pódio operacional
            </CardTitle>
          </CardHeader>

          <CardContent className="grid gap-4 pt-6 md:grid-cols-3">
            {reportData.rows
              .slice(0, 3)
              .map(
                (
                  row,
                  index,
                ) => (
                  <PodiumCard
                    key={
                      row.id ||
                      index
                    }
                    row={row}
                    position={
                      index + 1
                    }
                  />
                ),
              )}
          </CardContent>
        </Card>
      </section>

      <Card className="glass overflow-hidden rounded-3xl border-white/10 shadow-[0_24px_90px_rgba(0,0,0,0.30)]">
        <CardHeader className="border-b border-white/10 bg-white/[0.025]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-lg font-black tracking-wide text-white">
                Auditoria Individual
              </CardTitle>

              <p className="mt-1 text-xs text-muted-foreground">
                Pesquisa, compara e ordena os registos do período selecionado.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative min-w-[260px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />

                <Input
                  value={
                    search
                  }
                  onChange={(
                    event,
                  ) =>
                    setSearch(
                      event.target
                        .value,
                    )
                  }
                  placeholder="Pesquisar operacional..."
                  className="h-10 rounded-xl border-white/10 bg-black/20 pl-10"
                />
              </div>

              <select
                value={
                  sortKey
                }
                onChange={(
                  event,
                ) =>
                  setSortKey(
                    event.target
                      .value as SortKey,
                  )
                }
                className="h-10 rounded-xl border border-white/10 bg-black/20 px-3 text-xs font-bold text-white outline-none"
              >
                <option value="periodHours">
                  Ordenar: Atual
                </option>
                <option value="previousHours">
                  Ordenar: Anterior
                </option>
                <option value="diff">
                  Ordenar: Diferença
                </option>
                <option value="totalHistory">
                  Ordenar: Histórico
                </option>
                <option value="nome">
                  Ordenar: Nome
                </option>
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-transparent">
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="h-14 text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
                  Operacional
                </TableHead>

                <TableHead className="h-14 text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
                  Posto
                </TableHead>

                <TableHead className="h-14 text-right text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
                  Atual
                </TableHead>

                <TableHead className="h-14 text-right text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
                  Anterior
                </TableHead>

                <TableHead className="h-14 text-right text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
                  Diferença
                </TableHead>

                <TableHead className="h-14 text-right text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
                  Normal
                </TableHead>

                <TableHead className="h-14 text-right text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
                  Noturno
                </TableHead>

                <TableHead className="h-14 text-right text-xs font-black uppercase tracking-[0.18em] text-primary">
                  Histórico
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredRows.map(
                (
                  guarda,
                  index,
                ) => (
                  <TableRow
                    key={
                      guarda.id ||
                      index
                    }
                    className="border-white/10 transition-colors hover:bg-white/[0.025]"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.035] text-xs font-black text-white">
                          {guarda.avatar ? (
                            <img
                              src={
                                guarda.avatar
                              }
                              alt={
                                guarda.nome
                              }
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            getInitials(
                              guarda.nome,
                            )
                          )}
                        </div>

                        <div>
                          <p className="font-black tracking-wide text-white">
                            {
                              guarda.nome
                            }
                          </p>

                          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                            #
                            {String(
                              index +
                                1,
                            ).padStart(
                              2,
                              "0",
                            )}{" "}
                            · Nº{" "}
                            {
                              guarda.numero
                            }
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="font-bold text-muted-foreground">
                      {
                        guarda.posto
                      }
                    </TableCell>

                    <TableCell className="text-right font-mono text-white">
                      {guarda.periodHours.toFixed(
                        1,
                      )}
                      h
                    </TableCell>

                    <TableCell className="text-right font-mono text-muted-foreground">
                      {guarda.previousHours.toFixed(
                        1,
                      )}
                      h
                    </TableCell>

                    <TableCell
                      className={`text-right font-mono font-black ${
                        guarda.diff >=
                        0
                          ? "text-emerald-400"
                          : "text-red-400"
                      }`}
                    >
                      {guarda.diff >=
                      0
                        ? "+"
                        : ""}
                      {guarda.diff.toFixed(
                        1,
                      )}
                      h
                    </TableCell>

                    <TableCell className="text-right font-mono text-blue-300">
                      {guarda.normalHours.toFixed(
                        1,
                      )}
                      h
                    </TableCell>

                    <TableCell className="text-right font-mono text-violet-300">
                      {guarda.nightHours.toFixed(
                        1,
                      )}
                      h
                    </TableCell>

                    <TableCell className="text-right font-mono font-black text-primary">
                      {guarda.totalHistory.toFixed(
                        1,
                      )}
                      h
                    </TableCell>
                  </TableRow>
                ),
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
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
  tone:
    | "primary"
    | "green"
    | "yellow"
    | "blue"
    | "violet";
  delay: number;
}) {
  const toneMap = {
    primary:
      "border-t-primary bg-primary/10 text-primary",

    green:
      "border-t-emerald-500 bg-emerald-500/10 text-emerald-400",

    yellow:
      "border-t-yellow-500 bg-yellow-500/10 text-yellow-400",

    blue:
      "border-t-blue-500 bg-blue-500/10 text-blue-400",

    violet:
      "border-t-violet-500 bg-violet-500/10 text-violet-400",
  };

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 12,
        scale: 0.97,
      }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
      }}
      transition={{
        delay,
      }}
    >
      <div
        className={`glass rounded-3xl border border-white/10 border-t-2 p-5 ${toneMap[tone]}`}
      >
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-bold text-muted-foreground">
            {title}
          </p>

          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-current/10">
            {icon}
          </div>
        </div>

        <p className="truncate text-3xl font-black tracking-tight text-white">
          {value}
        </p>

        <p className="mt-2 truncate text-xs font-bold">
          {subtitle}
        </p>
      </div>
    </motion.div>
  );
}

function ExecutiveItem({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
          {icon}
        </div>

        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </p>
      </div>

      <p className="text-sm font-black text-white">
        {value}
      </p>
    </div>
  );
}

function PodiumCard({
  row,
  position,
}: {
  row: {
    nome: string;
    posto: string;
    avatar: string | null;
    periodHours: number;
    diff: number;
  };
  position: number;
}) {
  const medalClass =
    position === 1
      ? "border-yellow-400/25 bg-yellow-500/10 text-yellow-300"
      : position === 2
        ? "border-slate-300/20 bg-slate-300/10 text-slate-200"
        : "border-orange-400/20 bg-orange-500/10 text-orange-300";

  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 text-center">
      <div
        className={`mx-auto flex h-10 w-10 items-center justify-center rounded-xl border text-sm font-black ${medalClass}`}
      >
        {position}
      </div>

      <div className="mx-auto mt-4 flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] font-black text-white">
        {row.avatar ? (
          <img
            src={row.avatar}
            alt={row.nome}
            className="h-full w-full object-cover"
          />
        ) : (
          getInitials(
            row.nome,
          )
        )}
      </div>

      <p className="mt-4 truncate font-black text-white">
        {row.nome}
      </p>

      <p className="mt-1 truncate text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
        {row.posto}
      </p>

      <p className="mt-4 text-2xl font-black text-primary">
        {row.periodHours.toFixed(
          1,
        )}
        h
      </p>

      <p
        className={`mt-1 text-xs font-black ${
          row.diff >= 0
            ? "text-emerald-400"
            : "text-red-400"
        }`}
      >
        {row.diff >= 0
          ? "+"
          : ""}
        {row.diff.toFixed(
          1,
        )}
        h
      </p>
    </article>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-muted-foreground">
      <BarChart3 className="h-12 w-12 text-slate-600" />

      <p className="text-sm font-black uppercase tracking-[0.18em]">
        Sem dados no período
      </p>

      <p className="max-w-md text-xs leading-6">
        Nenhum dado de serviço registado no período selecionado.
      </p>
    </div>
  );
}
