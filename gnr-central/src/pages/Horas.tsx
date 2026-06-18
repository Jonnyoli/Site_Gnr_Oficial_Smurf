import { useMemo, useState } from "react";
import { useData } from "../context/DataContext";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Plus,
  CheckCircle2,
  Clock,
  Search,
  CalendarDays,
  Moon,
  ShieldCheck,
  Loader2,
  FileClock,
  RefreshCw,
  Sun,
  SplitSquareHorizontal,
  CalendarRange,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

const AUTO_REFRESH_MS = 15000;

type PeriodType = "diario" | "semanal" | "mensal" | "personalizado";
type TipoFiltro = "todos" | "Normal" | "Noturno" | "Misto";

const FILTERS: { value: TipoFiltro; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "Normal", label: "Normal" },
  { value: "Noturno", label: "Noturno" },
  { value: "Misto", label: "Misto" },
];

const PERIODS: { value: PeriodType; label: string }[] = [
  { value: "diario", label: "Diário" },
  { value: "semanal", label: "Semanal" },
  { value: "mensal", label: "Mensal" },
  { value: "personalizado", label: "Personalizado" },
];

const horaSchema = z.object({
  guardaId: z.string().min(1, "Selecione um guarda"),
  data: z.string().min(10, "Data inválida"),
  horasRegistadas: z.coerce.number().min(1).max(24),
  descricao: z.string().min(5, "A descrição deve ter pelo menos 5 caracteres"),
});

type HoraRow = {
  id: string;
  guardaId?: string;
  guardaNome?: string;
  data?: string;
  dataRaw?: string | null;
  horaInicio?: string;
  horaFim?: string;
  horasRegistadas?: number;
  horasNormais?: number;
  horasNoturnas?: number;
  tipo?: "Normal" | "Noturno" | "Misto" | string;
  descricao?: string;
  aprovado?: boolean;
};

function buildNoCacheUrl(url: string) {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}force=${Date.now()}`;
}

function toDateInputValue(date: Date) {
  return date.toISOString().split("T")[0];
}

function getDefaultCustomRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return {
    start: toDateInputValue(start),
    end: toDateInputValue(end),
  };
}

function getPeriodRange(
  period: PeriodType,
  customRange: { start: string; end: string }
) {
  const now = new Date();

  let start = new Date();
  let end = new Date();

  if (period === "diario") {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  }

  if (period === "semanal") {
    const currentDay = now.getDay();
    const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;

    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - distanceToMonday, 0, 0, 0, 0);

    end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
  }

  if (period === "mensal") {
    start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  if (period === "personalizado") {
    start = customRange.start
      ? new Date(`${customRange.start}T00:00:00`)
      : new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

    end = customRange.end
      ? new Date(`${customRange.end}T23:59:59`)
      : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  }

  return {
    start,
    end,
    startISO: start.toISOString(),
    endISO: end.toISOString(),
    label: `${start.toLocaleDateString("pt-PT")} → ${end.toLocaleDateString("pt-PT")}`,
  };
}

function getTipoBadgeClassName(tipo?: string) {
  switch (tipo) {
    case "Normal":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-400";
    case "Noturno":
      return "border-blue-500/20 bg-blue-500/10 text-blue-400";
    case "Misto":
      return "border-yellow-500/20 bg-yellow-500/10 text-yellow-400";
    default:
      return "border-slate-500/20 bg-slate-500/10 text-slate-400";
  }
}

function getTipoIcon(tipo?: string) {
  switch (tipo) {
    case "Normal":
      return <Sun className="h-3.5 w-3.5" />;
    case "Noturno":
      return <Moon className="h-3.5 w-3.5" />;
    case "Misto":
      return <SplitSquareHorizontal className="h-3.5 w-3.5" />;
    default:
      return <Clock className="h-3.5 w-3.5" />;
  }
}

function formatDate(date?: string) {
  if (!date || date === "N/A") return "N/A";

  const parsed = new Date(`${date}T12:00:00`);

  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
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

export default function Horas() {
  const { guardas, addHora, isLoading: isDataLoading, refreshData } = useData();
  const { toast } = useToast();

  const [period, setPeriod] = useState<PeriodType>("mensal");
  const [customRange, setCustomRange] = useState(getDefaultCustomRange());
  const [filterTipo, setFilterTipo] = useState<TipoFiltro>("todos");
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);

  const range = useMemo(() => getPeriodRange(period, customRange), [period, customRange]);

  const {
    data: horas = [],
    isLoading,
    isFetching,
    refetch,
    dataUpdatedAt,
  } = useQuery<HoraRow[]>({
    queryKey: ["horas-periodo-normal-noturno", period, range.startISO, range.endISO],
    queryFn: async () => {
      const apiUrl = import.meta.env.VITE_API_URL || "";

      const url =
        `${apiUrl}/api/data/horas` +
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
        throw new Error("Erro ao carregar horas");
      }

      return response.json();
    },
    refetchInterval: AUTO_REFRESH_MS,
    refetchIntervalInBackground: true,
    staleTime: 0,
  });

  const form = useForm<z.infer<typeof horaSchema>>({
    resolver: zodResolver(horaSchema),
    defaultValues: {
      guardaId: "",
      data: new Date().toISOString().split("T")[0],
      horasRegistadas: 8,
      descricao: "",
    },
  });

  const filteredHoras = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return (horas || [])
      .filter((hora) => {
        if (!hora) return false;

        const matchesTipo = filterTipo === "todos" || hora.tipo === filterTipo;

        const matchesSearch =
          normalizedSearch.length === 0 ||
          String(hora.guardaNome || "").toLowerCase().includes(normalizedSearch) ||
          String(hora.guardaId || "").toLowerCase().includes(normalizedSearch) ||
          String(hora.descricao || "").toLowerCase().includes(normalizedSearch);

        return matchesTipo && matchesSearch;
      })
      .sort((a, b) => {
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
  }, [horas, filterTipo, search]);

  const metrics = useMemo(() => {
    const totalHoras = filteredHoras.reduce(
      (acc, hora) => acc + Number(hora.horasRegistadas || 0),
      0
    );

    const normal = filteredHoras.reduce(
      (acc, hora) => acc + Number(hora.horasNormais || 0),
      0
    );

    const noturno = filteredHoras.reduce(
      (acc, hora) => acc + Number(hora.horasNoturnas || 0),
      0
    );

    const mistos = filteredHoras.filter((hora) => hora.tipo === "Misto").length;
    const aprovados = filteredHoras.filter((hora) => hora.aprovado).length;
    const pendentes = filteredHoras.filter((hora) => !hora.aprovado).length;

    return {
      totalRegistos: filteredHoras.length,
      totalHoras,
      normal,
      noturno,
      mistos,
      aprovados,
      pendentes,
    };
  }, [filteredHoras]);

  const lastUpdatedText = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("pt-PT", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "A aguardar";

  const onSubmit = (values: z.infer<typeof horaSchema>) => {
    const guarda = guardas.find(
      (g: any) => String(g.id) === String(values.guardaId)
    );

    if (!guarda) {
      toast({
        title: "Operacional não encontrado",
        description: "Não foi possível associar este registo a um guarda.",
        variant: "destructive",
      });

      return;
    }

    addHora({
      ...values,
      tipo: "Normal",
      guardaNome: guarda.nome,
      aprovado: false,
    });

    toast({
      title: "Horas registadas",
      description:
        "O registo foi submetido. A divisão Normal/Noturno é calculada automaticamente nos pontos fechados.",
    });

    setIsFormOpen(false);
    form.reset({
      guardaId: "",
      data: new Date().toISOString().split("T")[0],
      horasRegistadas: 8,
      descricao: "",
    });

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
              Horas de Serviço
            </p>
            <p className="mt-2 text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">
              A carregar registos do período...
            </p>
          </div>
        </div>
      </div>
    );
  }

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
                Horas por período
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                <RefreshCw
                  className={`h-3.5 w-3.5 text-primary ${
                    isFetching ? "animate-spin" : ""
                  }`}
                />
                Atualizado {lastUpdatedText}
              </div>
            </div>

            <h1 className="flex flex-wrap items-center gap-4 text-4xl font-black tracking-tight text-white md:text-5xl">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-[0_0_40px_rgba(16,185,129,0.16)]">
                <Clock className="h-8 w-8" />
              </span>
              Horas de Serviço
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">
              Consulta de registos fechados por período. O sistema divide
              automaticamente as horas em Normal e Noturno: Normal das 10:00 às
              19:00; Noturno das 19:01 às 09:59.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 xl:w-[460px]">
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                <CalendarRange className="h-4 w-4 text-primary" />
                Seleção de período
              </div>

              <div className="flex flex-wrap gap-2">
                {PERIODS.map((item) => (
                  <button
                    key={item.value}
                    onClick={() => setPeriod(item.value)}
                    className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] transition-all ${
                      period === item.value
                        ? "bg-primary text-primary-foreground shadow-[0_0_18px_rgba(16,185,129,0.22)]"
                        : "border border-white/10 bg-white/[0.035] text-muted-foreground hover:border-white/20 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {period === "personalizado" && (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <p className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                      De
                    </p>
                    <Input
                      type="date"
                      value={customRange.start}
                      onChange={(e) =>
                        setCustomRange((prev) => ({
                          ...prev,
                          start: e.target.value,
                        }))
                      }
                      className="h-10 rounded-xl border-white/10 bg-background/70"
                    />
                  </div>

                  <div>
                    <p className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                      Até
                    </p>
                    <Input
                      type="date"
                      value={customRange.end}
                      onChange={(e) =>
                        setCustomRange((prev) => ({
                          ...prev,
                          end: e.target.value,
                        }))
                      }
                      className="h-10 rounded-xl border-white/10 bg-background/70"
                    />
                  </div>
                </div>
              )}

              <p className="mt-3 text-xs font-bold text-slate-400">
                Período atual: <span className="text-primary">{range.label}</span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => refetch()}
                disabled={isFetching}
                variant="outline"
                className="h-11 rounded-2xl border border-primary/20 bg-primary/10 text-xs font-black uppercase tracking-[0.16em] text-primary hover:bg-primary/20"
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
                />
                Atualizar
              </Button>

              <Button
                onClick={() => setIsFormOpen(true)}
                className="h-11 rounded-2xl bg-primary text-xs font-black uppercase tracking-[0.16em] text-primary-foreground shadow-[0_0_28px_rgba(16,185,129,0.22)] hover:bg-primary/90"
              >
                <Plus className="mr-2 h-4 w-4" />
                Registar
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total de Horas"
          value={`${metrics.totalHoras.toFixed(1)}h`}
          subtitle={`${metrics.totalRegistos} registos`}
          icon={<Clock className="h-5 w-5" />}
          tone="primary"
          delay={0.05}
        />

        <MetricCard
          title="Horas Normais"
          value={`${metrics.normal.toFixed(1)}h`}
          subtitle="10:00 às 19:00"
          icon={<Sun className="h-5 w-5" />}
          tone="green"
          delay={0.1}
        />

        <MetricCard
          title="Horas Noturnas"
          value={`${metrics.noturno.toFixed(1)}h`}
          subtitle="19:01 às 09:59"
          icon={<Moon className="h-5 w-5" />}
          tone="blue"
          delay={0.15}
        />

        <MetricCard
          title="Turnos Mistos"
          value={String(metrics.mistos)}
          subtitle="Normal + Noturno"
          icon={<SplitSquareHorizontal className="h-5 w-5" />}
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
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar por operacional, descrição ou ID..."
                className="h-11 rounded-2xl border-white/10 bg-background/60 pl-11 text-sm"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setFilterTipo(filter.value)}
                  className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.14em] transition-all ${
                    filterTipo === filter.value
                      ? "bg-primary text-primary-foreground shadow-[0_0_18px_rgba(16,185,129,0.22)]"
                      : "border border-white/10 bg-white/[0.035] text-muted-foreground hover:border-white/20 hover:text-white"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <SmallStateCard
            label="Aprovados"
            value={metrics.aprovados}
            icon={<CheckCircle2 className="h-4 w-4" />}
            tone="green"
          />
          <SmallStateCard
            label="Pendentes"
            value={metrics.pendentes}
            icon={<Clock className="h-4 w-4" />}
            tone="yellow"
          />
        </div>
      </section>

      <div className="glass overflow-hidden rounded-3xl border border-white/10 shadow-[0_24px_90px_rgba(0,0,0,0.30)]">
        <Table>
          <TableHeader className="bg-white/[0.025]">
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="h-14 text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
                Data
              </TableHead>
              <TableHead className="h-14 text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
                Operacional
              </TableHead>
              <TableHead className="h-14 text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
                Horário
              </TableHead>
              <TableHead className="h-14 text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
                Total
              </TableHead>
              <TableHead className="h-14 text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
                Normal
              </TableHead>
              <TableHead className="h-14 text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
                Noturno
              </TableHead>
              <TableHead className="h-14 text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
                Tipo
              </TableHead>
              <TableHead className="h-14 w-1/4 text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
                Descrição
              </TableHead>
              <TableHead className="h-14 text-right text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
                Estado
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filteredHoras.length > 0 ? (
              filteredHoras.map((hora, index) => (
                <TableRow
                  key={hora.id}
                  className="border-white/10 transition-colors hover:bg-white/[0.025]"
                >
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-primary" />
                      {formatDate(hora.data)}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] text-xs font-black text-white">
                        {getInitials(hora.guardaNome)}
                      </div>

                      <div>
                        <p className="font-black tracking-wide text-white">
                          {hora.guardaNome || "Desconhecido"}
                        </p>
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                          Registo #{String(index + 1).padStart(2, "0")}
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {hora.horaInicio || "N/A"} → {hora.horaFim || "N/A"}
                  </TableCell>

                  <TableCell>
                    <span className="font-mono text-lg font-black text-white">
                      {Number(hora.horasRegistadas || 0).toFixed(1)}
                    </span>
                    <span className="ml-1 text-xs text-muted-foreground">h</span>
                  </TableCell>

                  <TableCell>
                    <span className="font-mono text-sm font-black text-emerald-400">
                      {Number(hora.horasNormais || 0).toFixed(1)}h
                    </span>
                  </TableCell>

                  <TableCell>
                    <span className="font-mono text-sm font-black text-blue-400">
                      {Number(hora.horasNoturnas || 0).toFixed(1)}h
                    </span>
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.13em] ${getTipoBadgeClassName(
                        hora.tipo
                      )}`}
                    >
                      {getTipoIcon(hora.tipo)}
                      {hora.tipo || "N/A"}
                    </Badge>
                  </TableCell>

                  <TableCell className="max-w-[220px] truncate text-muted-foreground">
                    {hora.descricao || "Sem descrição"}
                  </TableCell>

                  <TableCell className="text-right">
                    {hora.aprovado ? (
                      <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-emerald-400">
                        <CheckCircle2 className="h-4 w-4" />
                        Aprovado
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 rounded-full border border-yellow-500/20 bg-yellow-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-yellow-400">
                        <Clock className="h-4 w-4" />
                        Pendente
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="h-44 text-center">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <FileClock className="h-10 w-10 text-slate-600" />
                    <p className="text-sm font-black uppercase tracking-[0.18em]">
                      Nenhum registo encontrado
                    </p>
                    <p className="text-xs">
                      Altera o período, o filtro ou regista novas horas de serviço.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="border-white/10 bg-[#050b09]/95 text-white glass sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl font-black tracking-tight">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                <Plus className="h-5 w-5" />
              </span>
              Registar Horas
            </DialogTitle>

            <DialogDescription className="text-muted-foreground">
              Registo manual. A divisão Normal/Noturno é aplicada
              automaticamente nos pontos fechados pelo sistema.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="guardaId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground">
                      Operacional
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-2xl border-white/10 bg-background/70">
                          <SelectValue placeholder="Seleciona o operacional" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="border-white/10 bg-card">
                        {guardas.map((g: any) => (
                          <SelectItem key={g.id} value={g.id}>
                            <span className="mr-2 font-mono text-primary">
                              {g.numero}
                            </span>
                            {g.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="data"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground">
                        Data do Serviço
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          className="rounded-2xl border-white/10 bg-background/70"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="horasRegistadas"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground">
                        Número de Horas
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max="24"
                          className="rounded-2xl border-white/10 bg-background/70"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="descricao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground">
                      Descrição
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Resumo da atividade desenvolvida"
                        className="rounded-2xl border-white/10 bg-background/70"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-2xl border-white/10 hover:bg-white/5"
                  onClick={() => setIsFormOpen(false)}
                >
                  Cancelar
                </Button>

                <Button
                  type="submit"
                  className="rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Submeter Registo
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
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
  value: string;
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
  tone: "green" | "yellow";
}) {
  const toneMap = {
    green: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
    yellow: "border-yellow-500/20 bg-yellow-500/10 text-yellow-400",
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