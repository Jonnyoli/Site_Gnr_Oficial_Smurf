import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock,
  Database,
  FileText,
  Loader2,
  Radio,
  RefreshCw,
  Search,
  Shield,
  Zap,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

type AlertItem = {
  id: string;
  type: "info" | "success" | "warning" | "critical";
  color: "blue" | "green" | "yellow" | "red";
  title: string;
  module: string;
  action: string;
  description: string;
  actorName?: string;
  targetName?: string;
  createdAt?: string;
  metadata?: Record<string, any>;
};

const AUTO_REFRESH_MS = 15000;

function buildNoCacheUrl(url: string) {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}force=${Date.now()}`;
}

function getAlertStyle(type?: string) {
  switch (type) {
    case "critical":
      return {
        badge: "border-red-500/25 bg-red-500/10 text-red-400",
        icon: <Shield className="h-4 w-4" />,
        label: "Crítico",
      };

    case "warning":
      return {
        badge: "border-yellow-500/25 bg-yellow-500/10 text-yellow-400",
        icon: <AlertTriangle className="h-4 w-4" />,
        label: "Aviso",
      };

    case "success":
      return {
        badge: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400",
        icon: <CheckCircle2 className="h-4 w-4" />,
        label: "Sucesso",
      };

    default:
      return {
        badge: "border-blue-500/25 bg-blue-500/10 text-blue-400",
        icon: <Bell className="h-4 w-4" />,
        label: "Info",
      };
  }
}

function getModuleIcon(module?: string) {
  const value = String(module || "").toLowerCase();

  if (value.includes("hora")) return <Clock className="h-5 w-5" />;
  if (value.includes("patrulha")) return <Radio className="h-5 w-5" />;
  if (value.includes("arquivo")) return <FileText className="h-5 w-5" />;
  if (value.includes("discord")) return <Zap className="h-5 w-5" />;

  return <Database className="h-5 w-5" />;
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
  });
}

export default function Alertas() {
  const [search, setSearch] = useState("");

  const {
    data: auditAlerts = [],
    isLoading: isAuditLoading,
    isFetching: isAuditFetching,
    refetch: refetchAudit,
  } = useQuery<AlertItem[]>({
    queryKey: ["alerts-audit"],
    queryFn: async () => {
      const apiUrl = import.meta.env.VITE_API_URL || "";

      const response = await fetch(buildNoCacheUrl(`${apiUrl}/api/alerts`), {
        cache: "no-store",
      });

      if (!response.ok) throw new Error("Erro ao carregar alertas");

      return response.json();
    },
    refetchInterval: AUTO_REFRESH_MS,
    refetchIntervalInBackground: true,
    staleTime: 0,
  });

  const {
    data: liveAlerts = [],
    isLoading: isLiveLoading,
    isFetching: isLiveFetching,
    refetch: refetchLive,
  } = useQuery<AlertItem[]>({
    queryKey: ["alerts-live"],
    queryFn: async () => {
      const apiUrl = import.meta.env.VITE_API_URL || "";

      const response = await fetch(buildNoCacheUrl(`${apiUrl}/api/alerts/live`), {
        cache: "no-store",
      });

      if (!response.ok) throw new Error("Erro ao carregar alertas live");

      return response.json();
    },
    refetchInterval: AUTO_REFRESH_MS,
    refetchIntervalInBackground: true,
    staleTime: 0,
  });

  const isLoading = isAuditLoading || isLiveLoading;
  const isFetching = isAuditFetching || isLiveFetching;

  const allAlerts = useMemo(() => {
    const map = new Map<string, AlertItem>();

    [...liveAlerts, ...auditAlerts].forEach((alert) => {
      map.set(alert.id, alert);
    });

    return Array.from(map.values()).sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;

      return timeB - timeA;
    });
  }, [auditAlerts, liveAlerts]);

  const filteredAlerts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return allAlerts.filter((alert) => {
      return (
        normalizedSearch.length === 0 ||
        alert.title.toLowerCase().includes(normalizedSearch) ||
        alert.description.toLowerCase().includes(normalizedSearch) ||
        alert.module.toLowerCase().includes(normalizedSearch) ||
        alert.action.toLowerCase().includes(normalizedSearch) ||
        String(alert.targetName || "").toLowerCase().includes(normalizedSearch)
      );
    });
  }, [allAlerts, search]);

  const metrics = useMemo(() => {
    return {
      total: allAlerts.length,
      critical: allAlerts.filter((alert) => alert.type === "critical").length,
      warning: allAlerts.filter((alert) => alert.type === "warning").length,
      success: allAlerts.filter((alert) => alert.type === "success").length,
    };
  }, [allAlerts]);

  const refreshAll = () => {
    refetchAudit();
    refetchLive();
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="relative flex flex-col items-center gap-5 rounded-[2rem] border border-white/10 bg-[#050b09]/80 px-12 py-10">
          <Loader2 className="relative h-11 w-11 animate-spin text-primary" />
          <div className="relative text-center">
            <p className="text-sm font-black uppercase tracking-[0.25em] text-white">
              Centro de Alertas
            </p>
            <p className="mt-2 text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">
              A carregar alertas operacionais...
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

        <div className="relative flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-5 inline-flex items-center gap-3 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.25em] text-primary">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
              </span>
              Notificações Reais
            </div>

            <h1 className="flex flex-wrap items-center gap-4 text-4xl font-black tracking-tight text-white md:text-5xl">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                <Bell className="h-8 w-8" />
              </span>
              Centro de Alertas
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">
              Alertas automáticos de horas, patrulhas, documentos, auditoria e
              eventos críticos da Central.
            </p>
          </div>

          <Button
            onClick={refreshAll}
            disabled={isFetching}
            variant="outline"
            className="h-11 rounded-2xl border border-primary/20 bg-primary/10 text-xs font-black uppercase tracking-[0.16em] text-primary hover:bg-primary/20"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-4">
        <MetricCard title="Total" value={metrics.total} tone="primary" />
        <MetricCard title="Críticos" value={metrics.critical} tone="red" />
        <MetricCard title="Avisos" value={metrics.warning} tone="yellow" />
        <MetricCard title="Sucessos" value={metrics.success} tone="green" />
      </section>

      <section className="glass rounded-3xl border border-white/10 p-4">
        <div className="relative w-full xl:max-w-md">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Pesquisar alertas..."
            className="h-11 rounded-2xl border-white/10 bg-background/60 pl-11 text-sm"
          />
        </div>
      </section>

      <section className="space-y-4">
        {filteredAlerts.length > 0 ? (
          filteredAlerts.map((alert, index) => {
            const style = getAlertStyle(alert.type);

            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: 14, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: index * 0.02 }}
                className="glass rounded-3xl border border-white/10 p-5"
              >
                <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                      {getModuleIcon(alert.module)}
                    </div>

                    <div>
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.13em] ${style.badge}`}
                        >
                          {style.icon}
                          {style.label}
                        </Badge>

                        <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1 text-[10px] font-black uppercase tracking-[0.13em] text-muted-foreground">
                          {alert.module}
                        </span>
                      </div>

                      <h3 className="text-lg font-black text-white">
                        {alert.title}
                      </h3>

                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {alert.description}
                      </p>

                      <p className="mt-2 text-xs text-muted-foreground">
                        {formatDate(alert.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="rounded-3xl border border-white/10 bg-white/[0.025] py-16 text-center text-muted-foreground">
            <Bell className="mx-auto mb-4 h-12 w-12 opacity-20" />
            <p className="text-lg font-black uppercase tracking-[0.18em]">
              Sem alertas
            </p>
          </div>
        )}
      </section>
    </motion.div>
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