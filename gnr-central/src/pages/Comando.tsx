import { useMemo } from "react";
import { Link } from "wouter";
import { useData } from "../context/DataContext";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BellRing,
  CheckCircle2,
  Clock,
  Command,
  Database,
  FileText,
  FileCheck2,
  FolderOpen,
  Loader2,
  Lock,
  MapPin,
  Radio,
  RefreshCw,
  Shield,
  ShieldCheck,
  Siren,
  Terminal,
  TimerReset,
  Trophy,
  Users,
  Wifi,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";

const GNR_ROLE_ID = "1147878941974077478";

type AnyGuarda = {
  id?: string;
  discordId?: string;
  nome?: string;
  avatar?: string | null;
  estado?: string;
  unidade?: string;
  posto?: string;
  rank?: string;
  numero?: string;
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

function hasRole(guarda: AnyGuarda, roleId: string) {
  return getLiveRoleIds(guarda).includes(roleId);
}

function getGuardaId(guarda: AnyGuarda) {
  return guarda.discordId || guarda.id || "";
}

function getGuardaNome(guarda: AnyGuarda) {
  return guarda.nome || "Militar";
}

function getGuardaPosto(guarda: AnyGuarda) {
  return guarda.posto || guarda.rank || "Operacional";
}

function formatTime(date?: Date | null) {
  if (!date) return "A aguardar";

  return date.toLocaleTimeString("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function Comando() {
  const {
    guardas,
    currentHoras,
    currentArquivos,
    currentPatrulhas,
    isLoading,
    isFetching,
    lastUpdated,
    refreshData,
  } = useData() as any;

  const gnrGuardas = useMemo(() => {
    return ((guardas || []) as AnyGuarda[]).filter((guarda) => {
      const isLiveDiscordData = guarda.rolesSource === "discord_live";
      const hasGnrRole = hasRole(guarda, GNR_ROLE_ID);

      return isLiveDiscordData && hasGnrRole;
    });
  }, [guardas]);

  const guardaIds = useMemo(() => {
    return new Set(gnrGuardas.map(getGuardaId).filter(Boolean));
  }, [gnrGuardas]);

  const horasFiltradas = useMemo(() => {
    return (currentHoras || []).filter((hora: any) => {
      const id = hora.guardaId || hora.discordId || hora.userId || hora.id;
      return guardaIds.has(String(id));
    });
  }, [currentHoras, guardaIds]);

  const metrics = useMemo(() => {
    const emServico = gnrGuardas.filter((g) => g.estado === "Em serviço");
    const folga = gnrGuardas.filter((g) => g.estado === "Folga");
    const ausente = gnrGuardas.filter((g) => g.estado === "Ausente");

    const totalHoras = horasFiltradas.reduce(
      (acc: number, curr: any) => acc + Number(curr.horasRegistadas || 0),
      0
    );

    const patrulhas = Array.isArray(currentPatrulhas) ? currentPatrulhas : [];
    const patrulhasAtivas = patrulhas.filter(
      (p: any) => p.estado === "Ativa" || p.status === "ABERTO"
    );

    const taxa =
      gnrGuardas.length > 0
        ? Math.round((emServico.length / gnrGuardas.length) * 100)
        : 0;

    const porUnidade = {
      patrulha: gnrGuardas.filter((g) => g.unidade === "Patrulha").length,
      comando: gnrGuardas.filter((g) => g.unidade === "Comando Geral").length,
      investigacao: gnrGuardas.filter((g) => g.unidade === "Investigação").length,
      transito: gnrGuardas.filter((g) => g.unidade === "Trânsito").length,
      operacoes: gnrGuardas.filter((g) => g.unidade === "Operações").length,
    };

    return {
      total: gnrGuardas.length,
      emServico,
      folga,
      ausente,
      totalHoras,
      arquivos: currentArquivos?.length || 0,
      patrulhas: patrulhas.length,
      patrulhasAtivas,
      taxa,
      porUnidade,
    };
  }, [gnrGuardas, horasFiltradas, currentArquivos, currentPatrulhas]);

  const alertas = useMemo(() => {
    const data = [];

    if (metrics.taxa <= 10) {
      data.push({
        type: "critico",
        title: "Taxa operacional reduzida",
        text: `${metrics.taxa}% do efetivo encontra-se em serviço.`,
        icon: <Siren className="h-5 w-5" />,
      });
    }

    if (metrics.emServico.length === 0) {
      data.push({
        type: "aviso",
        title: "Sem militares em serviço",
        text: "Não existem pontos abertos neste momento.",
        icon: <AlertTriangle className="h-5 w-5" />,
      });
    }

    if (metrics.patrulhasAtivas.length === 0) {
      data.push({
        type: "info",
        title: "Sem patrulhas ativas",
        text: "Não existem CPs ativas no período atual.",
        icon: <Radio className="h-5 w-5" />,
      });
    }

    if (data.length === 0) {
      data.push({
        type: "sucesso",
        title: "Sistema operacional estável",
        text: "Não existem alertas críticos no momento.",
        icon: <CheckCircle2 className="h-5 w-5" />,
      });
    }

    return data;
  }, [metrics]);

  const serviceNow = metrics.emServico.slice(0, 6);
  const patrolsNow = metrics.patrulhasAtivas.slice(0, 6);
  const recentHours = horasFiltradas.slice(0, 6);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="rounded-[2rem] border border-white/10 bg-[#050b09]/80 px-12 py-10 text-center shadow-[0_24px_90px_rgba(0,0,0,0.38)] backdrop-blur-xl">
          <Loader2 className="mx-auto h-11 w-11 animate-spin text-primary" />
          <p className="mt-5 text-sm font-black uppercase tracking-[0.25em] text-white">
            Centro de Comando
          </p>
          <p className="mt-2 text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">
            A carregar dados operacionais...
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-7"
    >
      <section className="relative overflow-hidden rounded-[2.4rem] border border-white/10 bg-[#050b09]/85 p-8 shadow-[0_32px_130px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.16),transparent_32%),radial-gradient(circle_at_88%_76%,rgba(234,179,8,0.12),transparent_34%)]" />
        <div className="absolute inset-0 cyber-grid-soft opacity-35" />
        <div className="absolute -right-28 -top-28 h-96 w-96 rounded-full bg-primary/10 blur-[130px]" />
        <div className="absolute -bottom-32 left-1/4 h-96 w-96 rounded-full bg-accent/10 blur-[140px]" />

        <div className="relative grid grid-cols-1 gap-8 xl:grid-cols-[1fr_380px]">
          <div>
            <div className="mb-5 inline-flex items-center gap-3 rounded-full border border-primary/25 bg-primary/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.25em] text-primary">
              <Command className="h-4 w-4" />
              Central de decisão
            </div>

            <h1 className="max-w-5xl text-5xl font-black uppercase leading-[0.98] tracking-tight text-white md:text-6xl xl:text-7xl">
              Centro de
              <span className="block portal-gradient-text">Comando</span>
            </h1>

            <p className="mt-6 max-w-3xl text-sm leading-7 text-muted-foreground md:text-[15px]">
              Painel operacional para controlo do efetivo, patrulhas, alertas,
              arquivos, atividade recente e estado geral da Central GNR.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
              <HeroMetric icon={<Shield className="h-4 w-4" />} label="Efetivo" value={metrics.total} />
              <HeroMetric icon={<CheckCircle2 className="h-4 w-4" />} label="Serviço" value={metrics.emServico.length} />
              <HeroMetric icon={<Radio className="h-4 w-4" />} label="Patrulhas" value={metrics.patrulhasAtivas.length} />
              <HeroMetric icon={<FolderOpen className="h-4 w-4" />} label="Arquivos" value={metrics.arquivos} />
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-black/25 p-5">
            <p className="mb-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-primary">
              <Terminal className="h-4 w-4" />
              Estado do sistema
            </p>

            <div className="space-y-3">
              <SystemRow label="API" value="Online" icon={<Database className="h-4 w-4" />} />
              <SystemRow label="Discord" value="Live" icon={<Wifi className="h-4 w-4" />} />
              <SystemRow label="Auditoria" value="Ativa" icon={<Lock className="h-4 w-4" />} />
              <SystemRow label="Última sync" value={formatTime(lastUpdated)} icon={<TimerReset className="h-4 w-4" />} />
            </div>

            <button
              onClick={() => refreshData?.()}
              disabled={isFetching}
              className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-primary/10 text-xs font-black uppercase tracking-[0.18em] text-primary transition-all hover:bg-primary/20 disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
              Atualizar central
            </button>
          </div>
        </div>
      </section>

      <Link
        href="/comando/aprovacoes"
        className="group relative block overflow-hidden rounded-[2rem] border border-yellow-400/20 bg-[linear-gradient(135deg,rgba(234,179,8,0.10),rgba(16,185,129,0.06))] p-6 shadow-[0_28px_120px_rgba(0,0,0,0.34)] transition-all hover:-translate-y-1 hover:border-yellow-400/35"
      >
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-yellow-500/10 blur-[90px]" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-yellow-400/20 bg-yellow-500/10 text-yellow-300">
              <FileCheck2 className="h-6 w-6" />
            </span>

            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-yellow-300">
                Área reservada
              </p>
              <h2 className="mt-1 text-2xl font-black text-white">
                Centro de Aprovações
              </h2>
              <p className="mt-2 text-sm text-white/40">
                Relatórios do NIC, validações institucionais e documentos oficiais.
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-2 self-start rounded-xl border border-yellow-400/20 bg-yellow-500/10 px-4 py-3 text-[9px] font-black uppercase tracking-[0.12em] text-yellow-300 md:self-auto">
            Entrar
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </span>
        </div>
      </Link>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Efetivo autorizado" value={metrics.total} subtitle="Militares com tag GNR ativa" icon={<Users className="h-5 w-5" />} tone="primary" />
        <StatCard title="Em serviço" value={metrics.emServico.length} subtitle={`${metrics.taxa}% de taxa operacional`} icon={<Activity className="h-5 w-5" />} tone="green" />
        <StatCard title="Horas registadas" value={`${metrics.totalHoras.toFixed(1)}h`} subtitle="Período atual" icon={<Clock className="h-5 w-5" />} tone="yellow" />
        <StatCard title="Arquivos" value={metrics.arquivos} subtitle="Documentos e transcripts" icon={<FileText className="h-5 w-5" />} tone="blue" />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_390px]">
        <div className="space-y-6">
          <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Panel title="Militares em Serviço" icon={<ShieldCheck className="h-4 w-4" />} actionHref="/guardas">
              {serviceNow.length > 0 ? (
                <div className="space-y-3">
                  {serviceNow.map((guarda) => (
                    <ServiceMember key={getGuardaId(guarda)} guarda={guarda} />
                  ))}
                </div>
              ) : (
                <EmptyMini text="Nenhum militar em serviço neste momento." />
              )}
            </Panel>

            <Panel title="Patrulhas Ativas" icon={<MapPin className="h-4 w-4" />} actionHref="/patrulhas">
              {patrolsNow.length > 0 ? (
                <div className="space-y-3">
                  {patrolsNow.map((patrulha: any) => (
                    <PatrolRow key={patrulha.id || patrulha._id} patrulha={patrulha} />
                  ))}
                </div>
              ) : (
                <EmptyMini text="Nenhuma patrulha ativa encontrada." />
              )}
            </Panel>
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <Panel title="Efetivo por Unidade" icon={<Users className="h-4 w-4" />} actionHref="/unidades">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <UnitMetric label="Comando" value={metrics.porUnidade.comando} />
                <UnitMetric label="Patrulha" value={metrics.porUnidade.patrulha} />
                <UnitMetric label="Investigação" value={metrics.porUnidade.investigacao} />
                <UnitMetric label="Trânsito" value={metrics.porUnidade.transito} />
                <UnitMetric label="Operações" value={metrics.porUnidade.operacoes} />
                <UnitMetric label="Total" value={metrics.total} />
              </div>
            </Panel>

            <Panel title="Atividade Recente" icon={<Zap className="h-4 w-4" />} actionHref="/horas">
              {recentHours.length > 0 ? (
                <div className="space-y-3">
                  {recentHours.map((hora: any) => (
                    <ActivityRow key={hora.id} hora={hora} />
                  ))}
                </div>
              ) : (
                <EmptyMini text="Ainda não existem registos de horas neste período." />
              )}
            </Panel>
          </section>
        </div>

        <aside className="space-y-6">
          <CommandActions />
          <AlertsPanel alertas={alertas} />
          <OperationalRate percent={metrics.taxa} total={metrics.total} service={metrics.emServico.length} />
        </aside>
      </section>
    </motion.div>
  );
}

function HeroMetric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-primary">{icon}</span>
        <span className="truncate text-right text-2xl font-black text-white">
          {value}
        </span>
      </div>

      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function SystemRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-black uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 truncate text-sm font-black text-white">{value}</p>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  tone,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  tone: "primary" | "green" | "yellow" | "blue";
}) {
  const toneMap = {
    primary: "border-primary/25 bg-primary/10 text-primary",
    green: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400",
    yellow: "border-amber-500/25 bg-amber-500/10 text-amber-400",
    blue: "border-blue-500/25 bg-blue-500/10 text-blue-400",
  };

  return (
    <div className="glass group rounded-[2rem] p-6 transition-all hover:-translate-y-1">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-bold text-muted-foreground">{title}</p>
          <p className="mt-5 text-3xl font-black text-white">{value}</p>
          <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-primary">
            {subtitle}
          </p>
        </div>

        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${toneMap[tone]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function Panel({
  title,
  icon,
  actionHref,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  actionHref?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-[#050b09]/80 shadow-[0_28px_120px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
      <div className="flex items-center justify-between border-b border-white/10 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {icon}
          </div>

          <h2 className="text-sm font-black uppercase tracking-[0.18em] text-white">
            {title}
          </h2>
        </div>

        {actionHref && (
          <Link
            href={actionHref}
            className="flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.14em] text-primary hover:text-white"
          >
            Ver
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>

      <div className="p-5">{children}</div>
    </div>
  );
}

function ServiceMember({ guarda }: { guarda: AnyGuarda }) {
  return (
    <Link
      href={`/guardas/${getGuardaId(guarda)}`}
      className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3 transition-all hover:border-primary/25 hover:bg-primary/10"
    >
      {guarda.avatar ? (
        <img
          src={guarda.avatar}
          alt={getGuardaNome(guarda)}
          className="h-12 w-12 rounded-2xl border border-white/10 object-cover"
        />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-primary/10 text-primary">
          <Shield className="h-5 w-5" />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-white">
          {getGuardaNome(guarda)}
        </p>
        <p className="mt-1 truncate text-[10px] font-black uppercase tracking-[0.14em] text-primary">
          {getGuardaPosto(guarda)}
        </p>
      </div>

      <div className="h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary))]" />
    </Link>
  );
}

function PatrolRow({ patrulha }: { patrulha: any }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <MapPin className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-white">
          CP {patrulha.numero || patrulha.number || "N/A"}
        </p>
        <p className="mt-1 truncate text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">
          {patrulha.comandante || patrulha.commander || "Comandante desconhecido"}
        </p>
      </div>

      <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-primary">
        Ativa
      </span>
    </div>
  );
}

function ActivityRow({ hora }: { hora: any }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
        <Clock className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-white">
          {hora.guardaNome || "Militar"}
        </p>
        <p className="mt-1 truncate text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">
          {hora.data || "Sem data"} · {hora.tipo || "Serviço"}
        </p>
      </div>

      <span className="text-sm font-black text-white">
        {Number(hora.horasRegistadas || 0).toFixed(1)}h
      </span>
    </div>
  );
}

function UnitMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function CommandActions() {
  const actions = [
    {
      href: "/guardas",
      label: "Efetivo",
      icon: <Users className="h-4 w-4" />,
    },
    {
      href: "/patrulhas",
      label: "Patrulhas",
      icon: <MapPin className="h-4 w-4" />,
    },
    {
      href: "/comando/aprovacoes",
      label: "Centro de Aprovações",
      icon: <FileCheck2 className="h-4 w-4" />,
    },
    {
      href: "/auditoria",
      label: "Auditoria",
      icon: <ShieldCheck className="h-4 w-4" />,
    },
    {
      href: "/alertas",
      label: "Alertas",
      icon: <BellRing className="h-4 w-4" />,
    },
    {
      href: "/relatorios",
      label: "Relatórios",
      icon: <Trophy className="h-4 w-4" />,
    },
  ];

  return (
    <div className="rounded-[2rem] border border-white/10 bg-[#050b09]/80 p-5 shadow-[0_28px_120px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
      <p className="mb-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-primary">
        <Command className="h-4 w-4" />
        Ações de comando
      </p>

      <div className="space-y-2">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 transition-all hover:border-primary/25 hover:bg-primary/10"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              {action.icon}
            </span>

            <span className="flex-1 text-sm font-black text-white">
              {action.label}
            </span>

            <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
          </Link>
        ))}
      </div>
    </div>
  );
}

function AlertsPanel({ alertas }: { alertas: any[] }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-[#050b09]/80 p-5 shadow-[0_28px_120px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
      <p className="mb-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-accent">
        <BellRing className="h-4 w-4" />
        Alertas operacionais
      </p>

      <div className="space-y-3">
        {alertas.map((alerta, index) => (
          <AlertRow key={`${alerta.title}-${index}`} alerta={alerta} />
        ))}
      </div>
    </div>
  );
}

function AlertRow({ alerta }: { alerta: any }) {
  const toneMap: Record<string, string> = {
    critico: "border-red-500/25 bg-red-500/10 text-red-400",
    aviso: "border-amber-500/25 bg-amber-500/10 text-amber-400",
    info: "border-blue-500/25 bg-blue-500/10 text-blue-400",
    sucesso: "border-primary/25 bg-primary/10 text-primary",
  };

  const tone = toneMap[alerta.type] || toneMap.info;

  return (
    <div className={`rounded-2xl border p-4 ${tone}`}>
      <div className="flex gap-3">
        <div className="mt-0.5 shrink-0">{alerta.icon}</div>

        <div>
          <p className="text-sm font-black text-white">{alerta.title}</p>
          <p className="mt-1 text-xs leading-5 opacity-80">{alerta.text}</p>
        </div>
      </div>
    </div>
  );
}

function OperationalRate({
  percent,
  total,
  service,
}: {
  percent: number;
  total: number;
  service: number;
}) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-[#050b09]/80 p-5 shadow-[0_28px_120px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
      <p className="mb-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-primary">
        <Activity className="h-4 w-4" />
        Taxa operacional
      </p>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-5xl font-black text-white">{percent}%</p>
          <p className="mt-2 text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">
            {service} em serviço / {total} total
          </p>
        </div>
      </div>

      <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-primary shadow-[0_0_18px_hsl(var(--primary)/0.7)] transition-all duration-700"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function EmptyMini({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}