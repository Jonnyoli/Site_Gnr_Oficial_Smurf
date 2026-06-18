import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  Eye,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  Shield,
  User,
  FileText,
  Radio,
  Download,
  FileJson,
  X,
  ChevronLeft,
  ChevronRight,
  Settings,
  LogIn,
  Crown,
  Star,
  BadgeCheck,
  Users,
  Bot,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

type AuditLog = {
  _id: string;
  actorId?: string;
  actorName?: string;
  actorRank?: string;
  actorAvatar?: string | null;
  action?: string;
  module?: string;
  severity?: "info" | "success" | "warning" | "critical";
  description?: string;
  targetId?: string | null;
  targetName?: string | null;
  metadata?: Record<string, any>;
  ip?: string | null;
  userAgent?: string | null;
  createdAt?: string;
};

type SeverityFilter = "all" | "info" | "success" | "warning" | "critical";
type CargoFilter = "todos" | "comando" | "oficiais" | "sargentos" | "guardas" | "sistema";
type ModuleFilter = "all" | string;

const AUTO_REFRESH_MS = 15000;
const PAGE_SIZE = 20;

const SEVERITIES: { value: SeverityFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "info", label: "Info" },
  { value: "success", label: "Sucesso" },
  { value: "warning", label: "Avisos" },
  { value: "critical", label: "Críticos" },
];

const CARGOS: { value: CargoFilter; label: string; icon: React.ReactNode }[] = [
  { value: "todos", label: "Todos", icon: <Users className="h-3.5 w-3.5" /> },
  { value: "comando", label: "Comando", icon: <Crown className="h-3.5 w-3.5" /> },
  { value: "oficiais", label: "Oficiais", icon: <Star className="h-3.5 w-3.5" /> },
  { value: "sargentos", label: "Sargentos", icon: <BadgeCheck className="h-3.5 w-3.5" /> },
  { value: "guardas", label: "Guardas", icon: <Shield className="h-3.5 w-3.5" /> },
  { value: "sistema", label: "Sistema", icon: <Bot className="h-3.5 w-3.5" /> },
];

function buildNoCacheUrl(url: string) {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}force=${Date.now()}`;
}

function normalize(value?: string) {
  return String(value || "").toLowerCase().trim();
}

function getCargoGroup(log: AuditLog): CargoFilter {
  const rank = normalize(log.actorRank);
  const name = normalize(log.actorName);
  const actorId = normalize(log.actorId);

  if (actorId === "sistema" || name.includes("sistema")) return "sistema";

  if (
    rank.includes("comandante geral") ||
    rank.includes("comando geral") ||
    rank.includes("tenente general") ||
    rank.includes("major general") ||
    rank.includes("brigadeiro general") ||
    rank.includes("general")
  ) {
    return "comando";
  }

  if (
    rank.includes("coronel") ||
    rank.includes("tenente coronel") ||
    rank.includes("major") ||
    rank.includes("capitão") ||
    rank.includes("capitao") ||
    rank.includes("tenente") ||
    rank.includes("alferes") ||
    rank.includes("aspirante")
  ) {
    return "oficiais";
  }

  if (
    rank.includes("sargento") ||
    rank.includes("furriel")
  ) {
    return "sargentos";
  }

  if (
    rank.includes("guarda") ||
    rank.includes("cabo") ||
    rank.includes("cfg") ||
    rank.includes("provisório") ||
    rank.includes("provisorio") ||
    rank.includes("operacional")
  ) {
    return "guardas";
  }

  return "guardas";
}

function getCargoLabel(group: CargoFilter) {
  switch (group) {
    case "comando":
      return "Comando";
    case "oficiais":
      return "Oficiais";
    case "sargentos":
      return "Sargentos";
    case "guardas":
      return "Guardas";
    case "sistema":
      return "Sistema";
    default:
      return "Todos";
  }
}

function getCargoStyle(group: CargoFilter) {
  switch (group) {
    case "comando":
      return "border-pink-500/25 bg-pink-500/10 text-pink-400";
    case "oficiais":
      return "border-purple-500/25 bg-purple-500/10 text-purple-400";
    case "sargentos":
      return "border-blue-500/25 bg-blue-500/10 text-blue-400";
    case "guardas":
      return "border-emerald-500/25 bg-emerald-500/10 text-emerald-400";
    case "sistema":
      return "border-slate-500/25 bg-slate-500/10 text-slate-400";
    default:
      return "border-white/10 bg-white/[0.035] text-muted-foreground";
  }
}

function getSeverityStyle(severity?: string) {
  switch (severity) {
    case "critical":
      return {
        label: "Crítico",
        badge: "border-red-500/25 bg-red-500/10 text-red-400",
        icon: <AlertTriangle className="h-3.5 w-3.5" />,
        tone: "red" as const,
      };

    case "warning":
      return {
        label: "Aviso",
        badge: "border-yellow-500/25 bg-yellow-500/10 text-yellow-400",
        icon: <AlertTriangle className="h-3.5 w-3.5" />,
        tone: "yellow" as const,
      };

    case "success":
      return {
        label: "Sucesso",
        badge: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400",
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
        tone: "green" as const,
      };

    default:
      return {
        label: "Info",
        badge: "border-blue-500/25 bg-blue-500/10 text-blue-400",
        icon: <Eye className="h-3.5 w-3.5" />,
        tone: "blue" as const,
      };
  }
}

function getModuleIcon(module?: string) {
  const value = normalize(module);

  if (value.includes("auth") || value.includes("autenticação")) return <LogIn className="h-4 w-4" />;
  if (value.includes("arquivo")) return <FileText className="h-4 w-4" />;
  if (value.includes("patrulha")) return <Radio className="h-4 w-4" />;
  if (value.includes("defini")) return <Settings className="h-4 w-4" />;
  if (value.includes("relatório") || value.includes("relatorio")) return <Database className="h-4 w-4" />;

  return <Activity className="h-4 w-4" />;
}

function formatDate(date?: string) {
  if (!date) return "N/A";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "N/A";

  return parsed.toLocaleString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function Auditoria() {
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState<SeverityFilter>("all");
  const [cargo, setCargo] = useState<CargoFilter>("todos");
  const [module, setModule] = useState<ModuleFilter>("all");
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const {
    data: logs = [],
    isLoading,
    isFetching,
    refetch,
    dataUpdatedAt,
  } = useQuery<AuditLog[]>({
    queryKey: ["audit-logs"],
    queryFn: async () => {
      const apiUrl = import.meta.env.VITE_API_URL || "";

      const response = await fetch(buildNoCacheUrl(`${apiUrl}/api/audit`), {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });

      if (!response.ok) {
        throw new Error("Erro ao carregar auditoria");
      }

      const payload = await response.json();
      if (Array.isArray(payload)) return payload;
      if (Array.isArray(payload?.items)) return payload.items;
      return [];
    },
    refetchInterval: AUTO_REFRESH_MS,
    refetchIntervalInBackground: true,
    staleTime: 0,
  });

  const modules = useMemo(() => {
    return [
      "all",
      ...Array.from(new Set(logs.map((log) => log.module || "Sistema"))).sort(),
    ];
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const normalizedSearch = normalize(search);

    return logs.filter((log) => {
      const logCargo = getCargoGroup(log);

      const matchesSearch =
        normalizedSearch.length === 0 ||
        normalize(log.actorName).includes(normalizedSearch) ||
        normalize(log.actorRank).includes(normalizedSearch) ||
        normalize(log.action).includes(normalizedSearch) ||
        normalize(log.module).includes(normalizedSearch) ||
        normalize(log.description).includes(normalizedSearch) ||
        normalize(log.targetName || "").includes(normalizedSearch) ||
        normalize(log.actorId || "").includes(normalizedSearch) ||
        normalize(log.targetId || "").includes(normalizedSearch) ||
        normalize(JSON.stringify(log.metadata || {})).includes(normalizedSearch);

      const matchesSeverity = severity === "all" || log.severity === severity;
      const matchesCargo = cargo === "todos" || logCargo === cargo;
      const matchesModule = module === "all" || log.module === module;

      return matchesSearch && matchesSeverity && matchesCargo && matchesModule;
    });
  }, [logs, search, severity, cargo, module]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredLogs.slice(start, start + PAGE_SIZE);
  }, [filteredLogs, currentPage]);

  function downloadFile(filename: string, content: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function exportJson() {
    downloadFile(`auditoria-${Date.now()}.json`, JSON.stringify(filteredLogs, null, 2), "application/json;charset=utf-8");
  }

  function exportCsv() {
    const rows = [["Data","Utilizador","Cargo","Ação","Módulo","Severidade","Descrição","Alvo","IP"], ...filteredLogs.map((log) => [
      formatDate(log.createdAt), log.actorName || "Sistema", log.actorRank || "", log.action || "", log.module || "Sistema", log.severity || "info", log.description || "", log.targetName || "", log.ip || ""
    ])];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";")).join("\n");
    downloadFile(`auditoria-${Date.now()}.csv`, csv, "text/csv;charset=utf-8");
  }

  const metrics = useMemo(() => {
    return {
      total: logs.length,
      critical: logs.filter((log) => log.severity === "critical").length,
      warning: logs.filter((log) => log.severity === "warning").length,
      success: logs.filter((log) => log.severity === "success").length,
      comando: logs.filter((log) => getCargoGroup(log) === "comando").length,
      oficiais: logs.filter((log) => getCargoGroup(log) === "oficiais").length,
      sargentos: logs.filter((log) => getCargoGroup(log) === "sargentos").length,
      guardas: logs.filter((log) => getCargoGroup(log) === "guardas").length,
      sistema: logs.filter((log) => getCargoGroup(log) === "sistema").length,
    };
  }, [logs]);

  const updatedText = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("pt-PT", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "A aguardar";

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="relative flex flex-col items-center gap-5 rounded-[2rem] border border-white/10 bg-[#050b09]/80 px-12 py-10 shadow-[0_24px_90px_rgba(0,0,0,0.38)] backdrop-blur-xl">
          <Loader2 className="relative h-11 w-11 animate-spin text-primary" />
          <div className="relative text-center">
            <p className="text-sm font-black uppercase tracking-[0.25em] text-white">
              Auditoria
            </p>
            <p className="mt-2 text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">
              A carregar registo de atividade...
            </p>
          </div>
        </div>
      </div>
    );
  }

  const cargoCounts: Record<CargoFilter, number> = {
    todos: logs.length,
    comando: metrics.comando,
    oficiais: metrics.oficiais,
    sargentos: metrics.sargentos,
    guardas: metrics.guardas,
    sistema: metrics.sistema,
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-8"
    >
      <section className="relative overflow-hidden rounded-[2.25rem] border border-white/10 bg-[#050b09]/80 p-8 shadow-[0_28px_120px_rgba(0,0,0,0.42)] backdrop-blur-xl">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-primary/10 blur-[110px]" />
        <div className="absolute -bottom-28 left-1/3 h-80 w-80 rounded-full bg-emerald-500/10 blur-[120px]" />

        <div className="relative flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-5 inline-flex items-center gap-3 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.25em] text-primary">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
              </span>
              Registo de Atividade
            </div>

            <h1 className="flex flex-wrap items-center gap-4 text-4xl font-black tracking-tight text-white md:text-5xl">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                <Shield className="h-8 w-8" />
              </span>
              Auditoria
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">
              Monitorização de acessos, alterações, exportações, documentos,
              patrulhas e ações sensíveis dentro da Central.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={exportCsv} variant="outline" className="h-11 rounded-2xl border border-white/10 bg-white/[0.025] text-xs font-black uppercase tracking-[0.14em] text-white hover:bg-white/[0.06]">
              <Download className="mr-2 h-4 w-4" /> CSV
            </Button>
            <Button onClick={exportJson} variant="outline" className="h-11 rounded-2xl border border-white/10 bg-white/[0.025] text-xs font-black uppercase tracking-[0.14em] text-white hover:bg-white/[0.06]">
              <FileJson className="mr-2 h-4 w-4" /> JSON
            </Button>
          <Button
            onClick={() => refetch()}
            disabled={isFetching}
            variant="outline"
            className="h-11 rounded-2xl border border-primary/20 bg-primary/10 text-xs font-black uppercase tracking-[0.16em] text-primary hover:bg-primary/20"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-4">
        <MetricCard title="Eventos" value={metrics.total} tone="primary" />
        <MetricCard title="Críticos" value={metrics.critical} tone="red" />
        <MetricCard title="Avisos" value={metrics.warning} tone="yellow" />
        <MetricCard title="Sucessos" value={metrics.success} tone="green" />
      </section>

      <section className="glass rounded-3xl border border-white/10 p-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          {CARGOS.map((item) => (
            <button
              key={item.value}
              onClick={() => setCargo(item.value)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.14em] transition-all ${
                cargo === item.value
                  ? "bg-primary text-primary-foreground shadow-[0_0_18px_rgba(16,185,129,0.22)]"
                  : "border border-white/10 bg-white/[0.035] text-muted-foreground hover:border-white/20 hover:text-white"
              }`}
            >
              {item.icon}
              {item.label}
              <span
                className={`rounded-full px-2 py-0.5 text-[9px] ${
                  cargo === item.value
                    ? "bg-black/20 text-primary-foreground"
                    : "bg-white/[0.06] text-muted-foreground"
                }`}
              >
                {cargoCounts[item.value]}
              </span>
            </button>
          ))}
        </div>

        <div className="border-t border-white/10 pt-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-md">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Pesquisar por utilizador, ação, módulo..."
                className="h-11 rounded-2xl border-white/10 bg-background/60 pl-11 text-sm"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {SEVERITIES.map((item) => (
                <button
                  key={item.value}
                  onClick={() => setSeverity(item.value)}
                  className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.14em] transition-all ${
                    severity === item.value
                      ? "bg-primary text-primary-foreground"
                      : "border border-white/10 bg-white/[0.035] text-muted-foreground hover:text-white"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <select
              value={module}
              onChange={(event) => setModule(event.target.value)}
              className="h-11 rounded-2xl border border-white/10 bg-background/80 px-4 text-xs font-bold uppercase tracking-[0.12em] text-white outline-none"
            >
              {modules.map((item) => (
                <option key={item} value={item}>
                  {item === "all" ? "Todos os módulos" : item}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-white/10 pt-4 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
          <Filter className="h-4 w-4 text-primary" />
          {filteredLogs.length} resultados · Atualizado {updatedText}
        </div>
      </section>

      <section className="space-y-4">
        {filteredLogs.length > 0 ? (
          paginatedLogs.map((log, index) => {
            const style = getSeverityStyle(log.severity);
            const logCargo = getCargoGroup(log);

            return (
              <motion.button
                type="button"
                key={log._id}
                onClick={() => setSelectedLog(log)}
                initial={{ opacity: 0, y: 14, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: index * 0.02 }}
                className="glass relative w-full overflow-hidden rounded-3xl border border-white/10 p-5 text-left transition hover:border-white/20 hover:bg-white/[0.025]"
              >
                <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex gap-4">
                    {log.actorAvatar ? (
                      <img src={log.actorAvatar} alt="" className="h-12 w-12 shrink-0 rounded-2xl object-cover" />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                        {getModuleIcon(log.module)}
                      </div>
                    )}

                    <div>
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.13em] ${style.badge}`}
                        >
                          {style.icon}
                          {style.label}
                        </Badge>

                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.13em] ${getCargoStyle(logCargo)}`}
                        >
                          {getCargoLabel(logCargo)}
                        </span>

                        <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1 text-[10px] font-black uppercase tracking-[0.13em] text-muted-foreground">
                          {log.module || "Sistema"}
                        </span>

                        <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1 text-[10px] font-black uppercase tracking-[0.13em] text-muted-foreground">
                          {log.action || "UNKNOWN"}
                        </span>
                      </div>

                      <h3 className="text-lg font-black text-white">
                        {log.description || "Evento sem descrição"}
                      </h3>

                      <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-primary" />
                          {log.actorName || "Sistema"}
                        </span>

                        <span className="inline-flex items-center gap-1.5">
                          <Shield className="h-3.5 w-3.5 text-primary" />
                          {log.actorRank || "N/A"}
                        </span>

                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-primary" />
                          {formatDate(log.createdAt)}
                        </span>

                        {log.targetName && (
                          <span className="inline-flex items-center gap-1.5">
                            <Database className="h-3.5 w-3.5 text-primary" />
                            {log.targetName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.025] px-4 py-3 text-xs text-muted-foreground">
                    <p>
                      IP: <span className="font-mono text-white">{log.ip || "N/A"}</span>
                    </p>
                  </div>
                </div>
              </motion.button>
            );
          })
        ) : (
          <div className="rounded-3xl border border-white/10 bg-white/[0.025] py-16 text-center text-muted-foreground">
            <Activity className="mx-auto mb-4 h-12 w-12 opacity-20" />
            <p className="text-lg font-black uppercase tracking-[0.18em]">
              Nenhum registo encontrado
            </p>
          </div>
        )}
      </section>

      {filteredLogs.length > PAGE_SIZE && (
        <section className="flex items-center justify-center gap-3">
          <Button variant="outline" disabled={currentPage <= 1} onClick={() => setPage(Math.max(1, currentPage - 1))} className="rounded-2xl border-white/10">
            <ChevronLeft className="mr-2 h-4 w-4" /> Anterior
          </Button>
          <div className="rounded-2xl border border-white/10 bg-white/[0.025] px-5 py-3 text-xs font-black uppercase tracking-[0.15em] text-muted-foreground">
            {currentPage} / {totalPages}
          </div>
          <Button variant="outline" disabled={currentPage >= totalPages} onClick={() => setPage(Math.min(totalPages, currentPage + 1))} className="rounded-2xl border-white/10">
            Seguinte <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </section>
      )}
      </motion.div>

      {selectedLog && (
      <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/80 p-4 backdrop-blur-md" onClick={() => setSelectedLog(null)}>
        <div className="mx-auto my-8 max-w-4xl rounded-[2rem] border border-white/10 bg-[#06100c] p-6 shadow-[0_30px_120px_rgba(0,0,0,.65)]" onClick={(event) => event.stopPropagation()}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Detalhes do evento</p>
              <h2 className="mt-2 text-3xl font-black text-white">{selectedLog.description || "Evento de auditoria"}</h2>
              <p className="mt-2 font-mono text-xs text-muted-foreground">{selectedLog._id}</p>
            </div>
            <button type="button" onClick={() => setSelectedLog(null)} className="rounded-xl border border-white/10 p-2 text-white hover:bg-white/5">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[
              ["Utilizador", selectedLog.actorName || "Sistema"],
              ["Cargo", selectedLog.actorRank || "N/A"],
              ["Ação", selectedLog.action || "UNKNOWN"],
              ["Módulo", selectedLog.module || "Sistema"],
              ["Data", formatDate(selectedLog.createdAt)],
              ["Alvo", selectedLog.targetName || selectedLog.targetId || "—"],
              ["IP", selectedLog.ip || "N/A"],
              ["Severidade", selectedLog.severity || "info"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
                <p className="mt-2 break-words text-sm font-bold text-white">{value}</p>
              </div>
            ))}
          </div>
          {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
            <section className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-5">
              <h3 className="text-sm font-black uppercase tracking-[0.15em] text-white">Metadata do evento</h3>
              <pre className="mt-4 max-h-[420px] overflow-auto whitespace-pre-wrap break-words rounded-2xl border border-white/10 bg-black/30 p-4 text-xs text-white">
                {JSON.stringify(selectedLog.metadata, null, 2)}
              </pre>
            </section>
          )}
          {selectedLog.userAgent && (
            <section className="mt-4 rounded-3xl border border-white/10 bg-black/20 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">User Agent</p>
              <p className="mt-2 break-words font-mono text-xs text-white">{selectedLog.userAgent}</p>
            </section>
          )}
        </div>
      </div>
      )}
    </>
  );
}

function MetricCard({
  title,
  value,
  tone,
}: {
  title: string;
  value: string | number;
  tone: "primary" | "red" | "yellow" | "green";
}) {
  const toneMap = {
    primary: "border-t-primary bg-primary/10 text-primary",
    red: "border-t-red-500 bg-red-500/10 text-red-400",
    yellow: "border-t-yellow-500 bg-yellow-500/10 text-yellow-400",
    green: "border-t-emerald-500 bg-emerald-500/10 text-emerald-400",
  };

  return (
    <div className={`glass rounded-3xl border border-white/10 border-t-2 p-5 ${toneMap[tone]}`}>
      <p className="text-sm font-bold text-muted-foreground">{title}</p>
      <p className="mt-4 text-3xl font-black text-white">{value}</p>
    </div>
  );
}