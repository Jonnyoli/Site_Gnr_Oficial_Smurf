import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useData } from "../context/DataContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Shield,
  Clock,
  FileText,
  CheckCircle2,
  Activity,
  ChevronUp,
  Users,
  MapPin,
  Search,
  Loader2,
  Database,
  Command,
  TrendingUp,
  RefreshCw,
  Wifi,
  ShieldCheck,
  AlertTriangle,
  TimerReset,
  BellRing,
  Trophy,
  FolderOpen,
  Radio,
  Eye,
  ArrowRight,
  Newspaper,
  Scale,
  ClipboardCheck,
  BarChart3,
  Zap,
  Star,
  Lock,
  Megaphone,
  Settings2,
  EyeOff,
  Eye as EyeIcon,
  LayoutGrid,
  Gauge,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { motion } from "framer-motion";
import LiveOperationalFeed from "../components/LiveOperationalFeed";
import OperationalRadar from "../components/OperationalRadar";
import MilitaryProfileCard from "../components/MilitaryProfileCard";
import QuickActions from "../components/QuickActions";
import HallOfFame from "../components/HallOfFame";
import DisciplinarySearch from "../components/DisciplinarySearch";
import PeriodSelector from "../components/PeriodSelector";

const GNR_ROLE_ID = "1147878941974077478";

type AnyGuarda = {
  id?: string;
  discordId?: string;
  nome?: string;
  estado?: string;
  unidade?: string;
  roles?: any[];
  savedTags?: any[];
  discordRoles?: any[];
  discordTags?: any[];
  rolesSource?: string;
};

function normalizeRoleId(value: any): string | null {
  if (!value) return null;

  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);

  if (typeof value === "object") {
    if (value.id) return String(value.id);
    if (value.roleId) return String(value.roleId);
    if (value._id) return String(value._id);
  }

  return null;
}

function getLiveRoleIds(guarda: AnyGuarda): string[] {
  const sources = [guarda.roles, guarda.discordRoles, guarda.discordTags];

  return sources
    .flatMap((source) => (Array.isArray(source) ? source : []))
    .map(normalizeRoleId)
    .filter((roleId): roleId is string => Boolean(roleId));
}

/**
 * Importante:
 * Não usamos savedTags no Dashboard.
 * savedTags pode ter cargos antigos guardados na base de dados.
 * O Dashboard deve contar apenas cargos atuais vindos do Discord/API.
 */
function getAllRoleIds(guarda: AnyGuarda): string[] {
  return getLiveRoleIds(guarda);
}

function hasRole(guarda: AnyGuarda, roleId: string) {
  return getAllRoleIds(guarda).includes(roleId);
}

function getGuardaId(guarda: AnyGuarda) {
  return guarda.discordId || guarda.id || "";
}

function normalizeUnitName(value?: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function matchesUnit(
  guarda: AnyGuarda,
  aliases: string[],
) {
  const unit = normalizeUnitName(guarda.unidade);

  return aliases.some((alias) =>
    unit.includes(normalizeUnitName(alias)),
  );
}

function formatLastUpdated(date?: Date | null) {
  if (!date) return "A aguardar atualização";

  return date.toLocaleTimeString("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function computePercentChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? "+100%" : "0%";

  const diff = current - previous;
  const pct = (diff / previous) * 100;

  return `${pct >= 0 ? "+" : ""}${pct.toFixed(0)}%`;
}

export default function Dashboard() {
  const {
    guardas,
    currentHoras,
    prevHoras,
    currentArquivos,
    prevArquivos,
    isLoading,
    isFetching,
    lastUpdated,
    refreshData,
  } = useData();

  const [hideZeroCards, setHideZeroCards] = useState(() => {
    return (
      window.localStorage.getItem(
        "gnr-dashboard-hide-zero",
      ) === "true"
    );
  });

  const [compactMode, setCompactMode] = useState(() => {
    return (
      window.localStorage.getItem(
        "gnr-dashboard-compact",
      ) === "true"
    );
  });

  useEffect(() => {
    window.localStorage.setItem(
      "gnr-dashboard-hide-zero",
      String(hideZeroCards),
    );
  }, [hideZeroCards]);

  useEffect(() => {
    window.localStorage.setItem(
      "gnr-dashboard-compact",
      String(compactMode),
    );
  }, [compactMode]);

  const dashboardGuardas = useMemo(() => {
    return ((guardas || []) as AnyGuarda[]).filter((guarda) => {
      const isLiveDiscordData = guarda.rolesSource === "discord_live";
      const hasGnrRole = hasRole(guarda, GNR_ROLE_ID);

      return isLiveDiscordData && hasGnrRole;
    });
  }, [guardas]);

  const dashboardGuardaIds = useMemo(() => {
    return new Set(dashboardGuardas.map(getGuardaId).filter(Boolean));
  }, [dashboardGuardas]);

  const filteredCurrentHoras = useMemo(() => {
    return (currentHoras || []).filter((hora: any) => {
      const id = hora.guardaId || hora.discordId || hora.userId || hora.id;
      return dashboardGuardaIds.has(String(id));
    });
  }, [currentHoras, dashboardGuardaIds]);

  const filteredPrevHoras = useMemo(() => {
    return (prevHoras || []).filter((hora: any) => {
      const id = hora.guardaId || hora.discordId || hora.userId || hora.id;
      return dashboardGuardaIds.has(String(id));
    });
  }, [prevHoras, dashboardGuardaIds]);

  const metrics = useMemo(() => {
    const emServico = dashboardGuardas.filter(
      (g) => g.estado === "Em serviço"
    ).length;

    const folga = dashboardGuardas.filter((g) => g.estado === "Folga").length;
    const ausente = dashboardGuardas.filter((g) => g.estado === "Ausente").length;

    const totalHoras = filteredCurrentHoras.reduce(
      (acc: number, curr: any) => acc + Number(curr.horasRegistadas || 0),
      0
    );

    const prevTotalHoras = filteredPrevHoras.reduce(
      (acc: number, curr: any) => acc + Number(curr.horasRegistadas || 0),
      0
    );

    const patrulha = dashboardGuardas.filter((g) =>
      matchesUnit(g, ["Patrulha", "USHE"]),
    ).length;

    const operacoes = dashboardGuardas.filter((g) =>
      matchesUnit(g, ["Operações", "Operacoes", "GIOE", "DI"]),
    ).length;

    const investigacao = dashboardGuardas.filter((g) =>
      matchesUnit(g, ["Investigação", "Investigacao", "NIC"]),
    ).length;

    const transito = dashboardGuardas.filter((g) =>
      matchesUnit(g, ["Trânsito", "Transito", "UNT"]),
    ).length;

    const operacionaisAtivosPercent =
      dashboardGuardas.length > 0
        ? Math.round((emServico / dashboardGuardas.length) * 100)
        : 0;

    return {
      total: dashboardGuardas.length,
      emServico,
      folga,
      ausente,
      totalHoras,
      prevTotalHoras,
      arquivos: currentArquivos.length,
      prevArquivos: prevArquivos.length,
      patrulha,
      operacoes,
      investigacao,
      transito,
      operacionaisAtivosPercent,
    };
  }, [
    dashboardGuardas,
    filteredCurrentHoras,
    filteredPrevHoras,
    currentArquivos,
    prevArquivos,
  ]);

  const hoursChangeStr = `${computePercentChange(
    metrics.totalHoras,
    metrics.prevTotalHoras
  )} vs período anterior`;

  const filesChangeStr = `${computePercentChange(
    metrics.arquivos,
    metrics.prevArquivos
  )} vs período anterior`;

  const guardasPorEstado = [
    {
      name: "Em serviço",
      value: metrics.emServico,
      color: "hsl(var(--primary))",
    },
    {
      name: "Folga",
      value: metrics.folga,
      color: "hsl(var(--accent))",
    },
    {
      name: "Ausente",
      value: metrics.ausente,
      color: "hsl(var(--destructive))",
    },
  ];

  const operationalNotices = useMemo(
    () =>
      [
        metrics.ausente > 0
          ? {
              label: `${metrics.ausente} militar${
                metrics.ausente === 1 ? "" : "es"
              } ausente${
                metrics.ausente === 1 ? "" : "s"
              }`,
              href: "/guardas",
              tone: "red" as const,
            }
          : null,
        metrics.emServico === 0
          ? {
              label: "Nenhum militar em serviço",
              href: "/guardas",
              tone: "yellow" as const,
            }
          : null,
        metrics.total === 0
          ? {
              label:
                "Sincronização do efetivo sem resultados",
              href: "/definicoes",
              tone: "yellow" as const,
            }
          : null,
        metrics.arquivos === 0
          ? {
              label: "Sem arquivos no período atual",
              href: "/arquivos",
              tone: "blue" as const,
            }
          : null,
      ].filter(Boolean) as Array<{
        label: string;
        href: string;
        tone: "red" | "yellow" | "blue";
      }>,
    [
      metrics.ausente,
      metrics.emServico,
      metrics.total,
      metrics.arquivos,
    ],
  );

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="relative flex flex-col items-center gap-5 rounded-[2rem] border border-white/10 bg-[#050b09]/80 px-12 py-10 shadow-[0_24px_90px_rgba(0,0,0,0.38)] backdrop-blur-xl">
          <div className="absolute inset-0 rounded-[2rem] bg-primary/5 blur-2xl" />
          <Loader2 className="relative h-11 w-11 animate-spin text-primary" />
          <div className="relative text-center">
            <p className="text-sm font-black uppercase tracking-[0.25em] text-white">
              Central GNR
            </p>
            <p className="mt-2 text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">
              A carregar portal operacional...
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
      className="portal-v7-dashboard space-y-7"
    >
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
        <PortalHero
          isFetching={isFetching}
          lastUpdated={lastUpdated}
          refreshData={refreshData}
          total={metrics.total}
          emServico={metrics.emServico}
          totalHoras={metrics.totalHoras}
          arquivos={metrics.arquivos}
        />

        <RightCommandPanel
          isFetching={isFetching}
          refreshData={refreshData}
          lastUpdated={lastUpdated}
          total={metrics.total}
          emServico={metrics.emServico}
          folga={metrics.folga}
          ausente={metrics.ausente}
          percent={metrics.operacionaisAtivosPercent}
        />
      </section>

      <DashboardControlBar
        hideZeroCards={hideZeroCards}
        compactMode={compactMode}
        setHideZeroCards={setHideZeroCards}
        setCompactMode={setCompactMode}
        isFetching={isFetching}
        lastUpdated={lastUpdated}
        refreshData={refreshData}
      />

      {operationalNotices.length > 0 && (
        <OperationalNoticeStrip
          notices={operationalNotices}
        />
      )}

      <section
        className={`grid grid-cols-1 gap-5 md:grid-cols-2 ${
          compactMode ? "xl:grid-cols-4" : "xl:grid-cols-4"
        }`}
      >
        {(!hideZeroCards || metrics.total > 0) && (
          <StatCard
            delay={0.05}
            title="Efetivo Autorizado"
            value={metrics.total}
            subtitle="Militares com tag GNR ativa"
            icon={<Shield className="h-5 w-5" />}
            tone="primary"
            href="/guardas"
            compact={compactMode}
          />
        )}

        {(!hideZeroCards || metrics.emServico > 0) && (
          <StatCard
            delay={0.1}
            title="Em Serviço"
            value={metrics.emServico}
            subtitle={`${metrics.operacionaisAtivosPercent}% do efetivo ativo`}
            icon={<CheckCircle2 className="h-5 w-5" />}
            tone="green"
            href="/guardas"
            compact={compactMode}
          />
        )}

        {(!hideZeroCards || metrics.totalHoras > 0) && (
          <StatCard
            delay={0.15}
            title="Horas Registadas"
            value={`${metrics.totalHoras.toFixed(1)}h`}
            subtitle={hoursChangeStr}
            icon={<Clock className="h-5 w-5" />}
            tone="yellow"
            href="/horas"
            compact={compactMode}
          />
        )}

        {(!hideZeroCards || metrics.arquivos > 0) && (
          <StatCard
            delay={0.2}
            title="Arquivos"
            value={metrics.arquivos}
            subtitle={filesChangeStr}
            icon={<FileText className="h-5 w-5" />}
            tone="blue"
            href="/arquivos"
            compact={compactMode}
          />
        )}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <PortalStories />

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.08fr_0.92fr]">
            <MilitaryProfileCard />

            <OperationalStateCard
              emServico={metrics.emServico}
              folga={metrics.folga}
              ausente={metrics.ausente}
              percent={metrics.operacionaisAtivosPercent}
            />
          </section>

          <HallOfFame />

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="xl:col-span-2"
            >
              <DistributionChart guardasPorEstado={guardasPorEstado} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex h-full flex-col gap-6"
            >
              <QuickActions />
              <DisciplinarySearch />
            </motion.div>
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="xl:col-span-2"
            >
              <OperationalRadar />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex h-full flex-col gap-6"
            >
              <LiveOperationalFeed />

              <UnitsCard
                total={metrics.total}
                patrulha={metrics.patrulha}
                operacoes={metrics.operacoes}
                investigacao={metrics.investigacao}
                transito={metrics.transito}
              />
            </motion.div>
          </section>
        </div>

        <aside className="space-y-6">
          <QuickAccessPortal />
          <RankingSideCard />
          <AnnouncementsPanel />
        </aside>
      </section>
    </motion.div>
  );
}

function DashboardControlBar({
  hideZeroCards,
  compactMode,
  setHideZeroCards,
  setCompactMode,
  isFetching,
  lastUpdated,
  refreshData,
}: {
  hideZeroCards: boolean;
  compactMode: boolean;
  setHideZeroCards: (value: boolean) => void;
  setCompactMode: (value: boolean) => void;
  isFetching: boolean;
  lastUpdated?: Date | null;
  refreshData?: () => void;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-[1.6rem] border border-white/10 bg-[#06100c]/80 p-3 backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-[9px] font-black uppercase tracking-[0.13em] text-primary">
          <Gauge className="h-4 w-4" />
          Painel operacional
        </span>

        <span className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-[9px] font-black uppercase tracking-[0.12em] text-white/35">
          Atualizado {formatLastUpdated(lastUpdated)}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setCompactMode(!compactMode)}
          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[9px] font-black uppercase tracking-[0.12em] transition ${
            compactMode
              ? "border-primary/25 bg-primary/10 text-primary"
              : "border-white/10 bg-black/20 text-white/40"
          }`}
        >
          <LayoutGrid className="h-4 w-4" />
          Compacto
        </button>

        <button
          type="button"
          onClick={() => setHideZeroCards(!hideZeroCards)}
          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[9px] font-black uppercase tracking-[0.12em] transition ${
            hideZeroCards
              ? "border-primary/25 bg-primary/10 text-primary"
              : "border-white/10 bg-black/20 text-white/40"
          }`}
        >
          {hideZeroCards ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <EyeIcon className="h-4 w-4" />
          )}
          Ocultar vazios
        </button>

        <button
          type="button"
          onClick={() => refreshData?.()}
          disabled={isFetching}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-[9px] font-black uppercase tracking-[0.12em] text-white/55 transition hover:border-primary/25 hover:text-primary disabled:opacity-40"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              isFetching ? "animate-spin" : ""
            }`}
          />
          Atualizar
        </button>
      </div>
    </section>
  );
}

function OperationalNoticeStrip({
  notices,
}: {
  notices: Array<{
    label: string;
    href: string;
    tone: "red" | "yellow" | "blue";
  }>;
}) {
  const toneMap = {
    red: "border-red-400/20 bg-red-500/[0.07] text-red-300",
    yellow:
      "border-amber-400/20 bg-amber-500/[0.07] text-amber-300",
    blue: "border-blue-400/20 bg-blue-500/[0.07] text-blue-300",
  };

  return (
    <section className="flex gap-3 overflow-x-auto rounded-[1.6rem] border border-white/10 bg-[#06100c]/75 p-3">
      {notices.map((notice) => (
        <Link
          key={`${notice.href}-${notice.label}`}
          href={notice.href}
          className={`group inline-flex min-w-max items-center gap-3 rounded-xl border px-4 py-3 text-xs font-black ${toneMap[notice.tone]}`}
        >
          <AlertTriangle className="h-4 w-4" />
          {notice.label}
          <ArrowRight className="h-4 w-4 opacity-40 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
        </Link>
      ))}
    </section>
  );
}

function PortalHero({
  isFetching,
  lastUpdated,
  refreshData,
  total,
  emServico,
  totalHoras,
  arquivos,
}: {
  isFetching: boolean;
  lastUpdated?: Date | null;
  refreshData?: () => void;
  total: number;
  emServico: number;
  totalHoras: number;
  arquivos: number;
}) {
  return (
    <section className="relative min-h-[360px] overflow-hidden rounded-[2.4rem] border border-white/10 bg-[#050b09]/85 p-8 shadow-[0_32px_130px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.16),transparent_32%),radial-gradient(circle_at_88%_76%,rgba(234,179,8,0.12),transparent_34%)]" />
      <div className="absolute inset-0 cyber-grid-soft opacity-40" />
      <div className="absolute -right-28 -top-28 h-96 w-96 rounded-full bg-primary/10 blur-[130px]" />
      <div className="absolute -bottom-32 left-1/4 h-96 w-96 rounded-full bg-accent/10 blur-[140px]" />
      <div className="absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

      <div className="relative flex h-full flex-col justify-between gap-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="badge-premium">
              <span className="status-dot mr-2" />
              Sistema ativo
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
              <RefreshCw
                className={`h-3.5 w-3.5 text-primary ${
                  isFetching ? "animate-spin" : ""
                }`}
              />
              Auto-refresh 15s
            </div>
          </div>

          <Button
            onClick={() => refreshData?.()}
            disabled={isFetching}
            className="h-10 rounded-2xl border border-primary/20 bg-primary/10 text-xs font-black uppercase tracking-[0.18em] text-primary hover:bg-primary/20"
            variant="outline"
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
            />
            Atualizar
          </Button>
        </div>

        <div>
          <p className="mb-4 text-[10px] font-black uppercase tracking-[0.42em] text-primary">
            Guarda Nacional Republicana
          </p>

          <h1 className="max-w-5xl text-5xl font-black uppercase leading-[0.98] tracking-tight text-white md:text-6xl xl:text-7xl">
            Central
            <span className="block portal-gradient-text">Operacional</span>
          </h1>

          <p className="mt-6 max-w-3xl text-sm leading-7 text-muted-foreground md:text-[15px]">
            Portal de comando para monitorização do efetivo autorizado,
            atividade em serviço, horas registadas, arquivo central e unidades
            operacionais em tempo real.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <HeroMetric
            label="Efetivo"
            value={total}
            icon={<Shield className="h-4 w-4" />}
            href="/guardas"
          />
          <HeroMetric
            label="Serviço"
            value={emServico}
            icon={<CheckCircle2 className="h-4 w-4" />}
            href="/guardas"
          />
          <HeroMetric
            label="Horas"
            value={`${totalHoras.toFixed(1)}h`}
            icon={<Clock className="h-4 w-4" />}
            href="/horas"
          />
          <HeroMetric
            label="Arquivos"
            value={arquivos}
            icon={<FolderOpen className="h-4 w-4" />}
            href="/arquivos"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <StatusPill icon={<Wifi className="h-3.5 w-3.5" />} label="Live Updates" />
          <StatusPill icon={<Database className="h-3.5 w-3.5" />} label="Base de Dados Ativa" />
          <StatusPill icon={<ShieldCheck className="h-3.5 w-3.5" />} label="Tag GNR Validada" />
          <StatusPill icon={<TimerReset className="h-3.5 w-3.5" />} label={`Atualizado ${formatLastUpdated(lastUpdated)}`} />
        </div>
      </div>
    </section>
  );
}

function RightCommandPanel({
  isFetching,
  refreshData,
  lastUpdated,
  total,
  emServico,
  folga,
  ausente,
  percent,
}: {
  isFetching: boolean;
  refreshData?: () => void;
  lastUpdated?: Date | null;
  total: number;
  emServico: number;
  folga: number;
  ausente: number;
  percent: number;
}) {
  return (
    <aside className="portal-panel p-5">
      <div className="mb-5">
        <p className="badge-gold w-fit">
          <Command className="mr-2 h-3.5 w-3.5" />
          Painel rápido
        </p>

        <h2 className="mt-4 text-2xl font-black text-white">
          Centro de Comando
        </h2>

        <p className="mt-2 text-xs leading-6 text-muted-foreground">
          Ajusta o período, atualiza dados e acompanha o estado operacional.
        </p>
      </div>

      <PeriodSelector />

      <Button
        onClick={() => refreshData?.()}
        disabled={isFetching}
        className="mt-4 h-11 w-full rounded-2xl border border-primary/20 bg-primary/10 text-xs font-black uppercase tracking-[0.18em] text-primary hover:bg-primary/20"
        variant="outline"
      >
        <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
        Atualizar agora
      </Button>

      <div className="my-5 divider-glow" />

      <div className="grid grid-cols-3 gap-3">
        <StateMiniCard label="Serviço" value={emServico} tone="green" />
        <StateMiniCard label="Folga" value={folga} tone="yellow" />
        <StateMiniCard label="Ausente" value={ausente} tone="red" />
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
            Taxa operacional
          </span>
          <span className="text-xs font-black text-primary">{percent}%</span>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-primary shadow-[0_0_18px_rgba(16,185,129,0.6)] transition-all duration-700"
            style={{ width: `${percent}%` }}
          />
        </div>

        <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {total} militares autorizados
        </p>
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
        <div className="flex items-center gap-3">
          <Lock className="h-4 w-4 text-primary" />
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-white">
              Sistema protegido
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Última atualização: {formatLastUpdated(lastUpdated)}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function PortalStories() {
  const stories = [
    {
      title: "Efetivo",
      text: "Consulta de militares, cargos e estado operacional.",
      icon: <Shield className="h-5 w-5" />,
      href: "/guardas",
      tone: "primary",
    },
    {
      title: "Patrulhas",
      text: "Registo e controlo das CPs ativas e concluídas.",
      icon: <MapPin className="h-5 w-5" />,
      href: "/patrulhas",
      tone: "blue",
    },
    {
      title: "Arquivos",
      text: "Transcripts, relatórios e documentos arquivados.",
      icon: <FolderOpen className="h-5 w-5" />,
      href: "/arquivos",
      tone: "yellow",
    },
  ];

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground">
          Acesso Operacional
        </p>

        <Link
          href="/comando"
          className="text-[10px] font-black uppercase tracking-[0.18em] text-primary hover:text-white"
        >
          Ver central
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {stories.map((story, index) => (
          <motion.div
            key={story.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 * index }}
          >
            <Link
              href={story.href}
              className="group block overflow-hidden rounded-3xl border border-white/10 bg-[#08120e]/80 p-5 shadow-[0_18px_70px_rgba(0,0,0,0.26)] transition-all hover:-translate-y-1 hover:border-primary/30 hover:bg-[#0b1812]"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                  {story.icon}
                </div>

                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
              </div>

              <h3 className="mt-5 text-xl font-black text-white">
                {story.title}
              </h3>

              <p className="mt-2 text-xs leading-6 text-muted-foreground">
                {story.text}
              </p>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function QuickAccessPortal() {
  const links = [
    { href: "/legislacao", label: "Legislação", icon: <Scale className="h-4 w-4" /> },
    { href: "/documentos", label: "Documentos", icon: <FileText className="h-4 w-4" /> },
    { href: "/relatorios", label: "Relatórios", icon: <BarChart3 className="h-4 w-4" /> },
    { href: "/auditoria", label: "Auditoria", icon: <Eye className="h-4 w-4" /> },
    { href: "/alertas", label: "Alertas", icon: <BellRing className="h-4 w-4" /> },
    { href: "/ponto", label: "Folha de Ponto", icon: <ClipboardCheck className="h-4 w-4" /> },
  ];

  return (
    <Card className="glass overflow-hidden border-white/10">
      <CardHeader className="border-b border-white/10">
        <CardTitle className="flex items-center gap-3 text-sm font-black uppercase tracking-[0.18em] text-muted-foreground">
          <Zap className="h-4 w-4 text-primary" />
          Acesso Rápido
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-4">
        <div className="space-y-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 transition-all hover:border-primary/25 hover:bg-primary/10"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                {link.icon}
              </span>

              <span className="flex-1 text-sm font-bold text-white">
                {link.label}
              </span>

              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function RankingSideCard() {
  return (
    <Card className="glass overflow-hidden border-white/10">
      <CardHeader className="border-b border-white/10">
        <CardTitle className="flex items-center gap-3 text-sm font-black uppercase tracking-[0.18em] text-muted-foreground">
          <Trophy className="h-4 w-4 text-accent" />
          Ranking Operacional
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3 pt-4">
        <RankingRow pos={1} name="Quadro Mensal" value="Horas" />
        <RankingRow pos={2} name="Efetivo Ativo" value="Serviço" />
        <RankingRow pos={3} name="Arquivos" value="Registos" />

        <Link
          href="/honra"
          className="mt-2 flex items-center justify-center gap-2 rounded-2xl border border-accent/20 bg-accent/10 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-accent hover:bg-accent/20"
        >
          Ver quadro de honra
          <ArrowRight className="h-4 w-4" />
        </Link>
      </CardContent>
    </Card>
  );
}

function AnnouncementsPanel() {
  return (
    <Card className="glass overflow-hidden border-white/10">
      <CardHeader className="border-b border-white/10">
        <CardTitle className="flex items-center gap-3 text-sm font-black uppercase tracking-[0.18em] text-muted-foreground">
          <Newspaper className="h-4 w-4 text-primary" />
          Mural Operacional
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3 pt-4">
        <Announcement
          icon={<Megaphone className="h-4 w-4" />}
          title="Avisos"
          text="Consulta rápida dos comunicados internos."
          href="/avisos"
        />

        <Announcement
          icon={<BellRing className="h-4 w-4" />}
          title="Alertas"
          text="Eventos recentes e notificações do sistema."
          href="/alertas"
        />

        <Announcement
          icon={<Radio className="h-4 w-4" />}
          title="Unidades"
          text="Estado e acesso às unidades operacionais."
          href="/unidades"
        />
      </CardContent>
    </Card>
  );
}

function OperationalStateCard({
  emServico,
  folga,
  ausente,
  percent,
}: {
  emServico: number;
  folga: number;
  ausente: number;
  percent: number;
}) {
  return (
    <Card className="glass overflow-hidden border-white/10">
      <CardHeader className="border-b border-white/10">
        <CardTitle className="flex items-center gap-3 text-sm font-black uppercase tracking-[0.18em] text-muted-foreground">
          <Activity className="h-4 w-4 text-primary" />
          Estado Operacional
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-6">
        <div className="grid grid-cols-3 gap-3">
          <StateMiniCard label="Serviço" value={emServico} tone="green" />
          <StateMiniCard label="Folga" value={folga} tone="yellow" />
          <StateMiniCard label="Ausente" value={ausente} tone="red" />
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
              Taxa operacional
            </span>
            <span className="text-xs font-black text-primary">{percent}%</span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-primary shadow-[0_0_18px_rgba(16,185,129,0.6)] transition-all duration-700"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DistributionChart({
  guardasPorEstado,
}: {
  guardasPorEstado: { name: string; value: number; color: string }[];
}) {
  return (
    <Card className="glass h-full overflow-hidden border-white/10">
      <CardHeader className="flex flex-row items-center justify-between border-b border-white/10">
        <div>
          <CardTitle className="text-lg font-black tracking-wide text-white">
            Distribuição do Efetivo
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Leitura em tempo real dos militares com tag GNR validada.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5">
          <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">
            Live
          </span>
        </div>
      </CardHeader>

      <CardContent className="h-80 pt-6">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={guardasPorEstado}
            layout="vertical"
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              horizontal
              vertical={false}
              stroke="hsl(var(--border))"
            />
            <XAxis
              type="number"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis
              dataKey="name"
              type="category"
              axisLine={false}
              tickLine={false}
              tick={{
                fill: "hsl(var(--foreground))",
                fontWeight: 600,
              }}
            />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted) / 0.25)" }}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                borderRadius: "14px",
                border: "1px solid hsl(var(--border))",
                color: "#fff",
              }}
            />
            <Bar dataKey="value" radius={[0, 10, 10, 0]} maxBarSize={44}>
              {guardasPorEstado.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function UnitsCard({
  total,
  patrulha,
  operacoes,
  investigacao,
  transito,
}: {
  total: number;
  patrulha: number;
  operacoes: number;
  investigacao: number;
  transito: number;
}) {
  return (
    <Card className="glass overflow-hidden border-white/10">
      <CardHeader className="border-b border-white/10">
        <CardTitle className="flex items-center gap-3 text-sm font-black uppercase tracking-[0.18em] text-muted-foreground">
          <Users className="h-4 w-4 text-primary" />
          Unidades Operacionais
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-6">
        <div className="grid grid-cols-2 gap-4">
          <UnitCard icon={<MapPin className="h-4 w-4" />} label="Patrulha" value={patrulha} tone="blue" />
          <UnitCard icon={<Shield className="h-4 w-4" />} label="Operações" value={operacoes} tone="green" />
          <UnitCard icon={<Search className="h-4 w-4" />} label="Investigação" value={investigacao} tone="purple" />
          <UnitCard icon={<Activity className="h-4 w-4" />} label="Trânsito" value={transito} tone="yellow" />
        </div>

        {total === 0 && (
          <div className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
              <p className="text-xs leading-6 text-amber-200">
                Nenhum militar com a tag GNR foi encontrado. Verifica a
                sincronização do Discord ou a tag configurada.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function HeroMetric({
  label,
  value,
  icon,
  href,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-white/10 bg-white/[0.045] p-4 transition hover:-translate-y-0.5 hover:border-primary/25 hover:bg-primary/[0.07]"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-primary">{icon}</span>
        <span className="text-2xl font-black text-white">
          {value}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </p>
        <ArrowRight className="h-3.5 w-3.5 text-white/15 transition group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>
    </Link>
  );
}

function StatusPill({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
      <span className="text-primary">{icon}</span>
      {label}
    </div>
  );
}

function StatCard({
  delay,
  title,
  value,
  subtitle,
  icon,
  tone,
  href,
  compact = false,
}: {
  delay: number;
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  tone: "primary" | "green" | "yellow" | "blue";
  href: string;
  compact?: boolean;
}) {
  const toneMap = {
    primary: {
      border: "border-t-primary",
      bg: "bg-primary/10",
      text: "text-primary",
      glow: "hover:shadow-[0_0_38px_rgba(34,197,94,0.20)]",
    },
    green: {
      border: "border-t-emerald-500",
      bg: "bg-emerald-500/10",
      text: "text-emerald-400",
      glow: "hover:shadow-[0_0_38px_rgba(16,185,129,0.20)]",
    },
    yellow: {
      border: "border-t-amber-500",
      bg: "bg-amber-500/10",
      text: "text-amber-400",
      glow: "hover:shadow-[0_0_38px_rgba(245,158,11,0.20)]",
    },
    blue: {
      border: "border-t-blue-500",
      bg: "bg-blue-500/10",
      text: "text-blue-400",
      glow: "hover:shadow-[0_0_38px_rgba(59,130,246,0.20)]",
    },
  };

  const selected = toneMap[tone];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay }}
    >
      <Link href={href} className="block h-full">
        <Card
          className={`glass group h-full overflow-hidden border-t-2 ${selected.border} transition-all duration-500 hover:-translate-y-1.5 ${selected.glow}`}
        >
          <CardHeader
            className={`flex flex-row items-center justify-between ${
              compact ? "pb-1 pt-4" : "pb-2"
            }`}
          >
            <CardTitle className="text-sm font-semibold text-muted-foreground">
              {title}
            </CardTitle>

            <div
              className={`flex items-center justify-center rounded-2xl ${selected.bg} ${selected.text} ${
                compact ? "h-9 w-9" : "h-10 w-10"
              }`}
            >
              {icon}
            </div>
          </CardHeader>

          <CardContent className={compact ? "pb-4" : undefined}>
            <div
              className={`font-black tracking-tight text-white ${
                compact ? "text-2xl" : "text-3xl"
              }`}
            >
              {value}
            </div>

            <div
              className={`mt-3 flex items-center gap-1 text-xs font-semibold ${selected.text}`}
            >
              {subtitle.includes("vs") ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronUp className="h-3.5 w-3.5" />
              )}
              <span className="min-w-0 flex-1 truncate">
                {subtitle}
              </span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}

function StateMiniCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "green" | "yellow" | "red";
}) {
  const toneMap = {
    green: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
    yellow: "border-amber-500/20 bg-amber-500/10 text-amber-400",
    red: "border-red-500/20 bg-red-500/10 text-red-400",
  };

  return (
    <div className={`rounded-2xl border p-4 text-center ${toneMap[tone]}`}>
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] opacity-80">
        {label}
      </p>
    </div>
  );
}

function UnitCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "blue" | "green" | "purple" | "yellow";
}) {
  const toneMap = {
    blue: "border-blue-500/20 bg-blue-500/10 text-blue-400",
    green: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
    purple: "border-purple-500/20 bg-purple-500/10 text-purple-400",
    yellow: "border-amber-500/20 bg-amber-500/10 text-amber-400",
  };

  return (
    <div className="group rounded-2xl border border-white/10 bg-background/40 p-4 transition-all hover:-translate-y-1 hover:bg-white/[0.04]">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl border ${toneMap[tone]}`}
        >
          {icon}
        </div>

        <div>
          <p className="text-2xl font-black leading-none text-white">{value}</p>
          <p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
            {label}
          </p>
        </div>
      </div>
    </div>
  );
}

function RankingRow({
  pos,
  name,
  value,
}: {
  pos: number;
  name: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-accent/25 bg-accent/10 text-sm font-black text-accent">
        #{pos}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-white">{name}</p>
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {value}
        </p>
      </div>

      <Star className="h-4 w-4 text-accent" />
    </div>
  );
}

function Announcement({
  icon,
  title,
  text,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4 transition-all hover:border-primary/25 hover:bg-primary/10"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-white">{title}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p>
      </div>

      <ArrowRight className="mt-1 h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
    </Link>
  );
}