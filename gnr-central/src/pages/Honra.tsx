import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useData } from "../context/DataContext";
import {
  Trophy,
  Medal,
  Crown,
  Star,
  Clock,
  RefreshCw,
  Calendar,
  ArrowRight,
  Shield,
  AlertTriangle,
  Loader2,
  Gem,
  Award,
  Timer,
} from "lucide-react";
import { motion } from "framer-motion";

type RankingHorasItem = {
  id: string;
  name: string;
  rank: string;
  numero?: string;
  avatar?: string | null;
  hours: number;
  pos: number;
};

type MedalMeta = {
  id: string;
  emoji: string;
  name: string;
  shortName: string;
  points: number;
  order: number;
};

type MedalRankingItem = {
  id: string;
  name: string;
  rank: string;
  numero?: string;
  avatar?: string | null;
  medals: MedalMeta[];
  medalCount: number;
  points: number;
  topMedal?: MedalMeta;
};

type PeriodMode = "semanal" | "mensal" | "personalizado";
type ActiveTab = "medalhas" | "horas";

const MEDALS: MedalMeta[] = [
  {
    id: "1168345896405184654",
    emoji: "🏆",
    name: "Medalha da Ordem Militar da Torre e Espada, do Valor, Lealdade e Mérito",
    shortName: "Torre e Espada",
    points: 600,
    order: 1,
  },
  {
    id: "1168346129214214214",
    emoji: "🏅",
    name: "Medalha da Ordem Militar de Cristo",
    shortName: "Cristo",
    points: 500,
    order: 2,
  },
  {
    id: "1168346179298410576",
    emoji: "🏅",
    name: "Medalha da Ordem Militar de Avis",
    shortName: "Avis",
    points: 400,
    order: 3,
  },
  {
    id: "1168346223388917882",
    emoji: "🥇",
    name: "Medalha da Ordem do Infante D. Henrique",
    shortName: "Infante D. Henrique",
    points: 300,
    order: 4,
  },
  {
    id: "1168346580387115048",
    emoji: "🥈",
    name: "Medalha da Ordem da Liberdade",
    shortName: "Liberdade",
    points: 200,
    order: 5,
  },
  {
    id: "1370560745368060045",
    emoji: "🥉",
    name: "Medalha por Serviços Distintos de Segurança Pública",
    shortName: "Serviços Distintos",
    points: 100,
    order: 6,
  },
];

function toDateInputValue(date: Date) {
  return date.toISOString().split("T")[0];
}

function getWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(now.setDate(diff));
  start.setHours(0, 0, 0, 0);
  return start;
}

function getMonthStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
}

function getEndOfToday() {
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  return now;
}

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

function getRoleIds(guarda: any): string[] {
  const sources = [
    guarda?.roles,
    guarda?.roleIds,
    guarda?.discordRoles,
    guarda?.discordTags,
    guarda?.savedTags,
    guarda?.currentRoles,
    guarda?.memberRoles,
  ];

  return [
    ...new Set(
      sources
        .flatMap(
          (
            source,
          ) =>
            Array.isArray(
              source,
            )
              ? source
              : [],
        )
        .map(
          normalizeRoleId,
        )
        .filter(
          (
            roleId,
          ): roleId is string =>
            Boolean(
              roleId,
            ),
        ),
    ),
  ];
}

function getGuardaName(guarda: any) {
  return (
    guarda?.nome ||
    guarda?.warName ||
    guarda?.displayName ||
    guarda?.username ||
    "Militar"
  );
}

function getGuardaRank(guarda: any) {
  return (
    guarda?.posto ||
    guarda?.rank ||
    guarda?.hierarchyGroupLabel ||
    "Operacional"
  );
}

function getGuardaId(guarda: any) {
  return String(guarda?.discordId || guarda?.id || guarda?._id || "");
}

export default function Honra() {
  const { guardas } = useData();

  const [activeTab, setActiveTab] = useState<ActiveTab>("medalhas");

  const [period, setPeriod] = useState<PeriodMode>("mensal");
  const [startDate, setStartDate] = useState(toDateInputValue(getMonthStart()));
  const [endDate, setEndDate] = useState(toDateInputValue(getEndOfToday()));
  const [rankingHoras, setRankingHoras] = useState<RankingHorasItem[]>([]);
  const [loadingHoras, setLoadingHoras] = useState(true);
  const [errorHoras, setErrorHoras] = useState("");

  const medalRanking = useMemo<MedalRankingItem[]>(() => {
    return ((guardas || []) as any[])
      .map((guarda) => {
        const roleIds = getRoleIds(guarda);

        const medals = MEDALS.filter((medal) =>
          roleIds.includes(medal.id)
        ).sort((a, b) => a.order - b.order);

        const medalCount = medals.length;
        const points = medals.reduce((acc, medal) => acc + medal.points, 0);

        return {
          id: getGuardaId(guarda),
          name: getGuardaName(guarda),
          rank: getGuardaRank(guarda),
          numero: guarda?.numero || guarda?.callsignNumber || "N/A",
          avatar: guarda?.avatar || null,
          medals,
          medalCount,
          points,
          topMedal: medals[0],
        };
      })
      .filter((item) => item.id && item.medalCount > 0)
      .sort((a, b) => {
        if (b.medalCount !== a.medalCount) return b.medalCount - a.medalCount;
        if (b.points !== a.points) return b.points - a.points;

        const aBest = a.topMedal?.order || 999;
        const bBest = b.topMedal?.order || 999;

        if (aBest !== bBest) return aBest - bBest;

        return a.name.localeCompare(b.name);
      });
  }, [guardas]);

  const medalStats = useMemo(() => {
    const totalMedals = medalRanking.reduce(
      (acc, item) => acc + item.medalCount,
      0
    );

    const totalPoints = medalRanking.reduce(
      (acc, item) => acc + item.points,
      0
    );

    const top = medalRanking[0];

    return {
      totalMilitares: medalRanking.length,
      totalMedals,
      totalPoints,
      topName: top?.name || "Sem destaque",
    };
  }, [medalRanking]);

  const periodLabel = useMemo(() => {
    if (period === "semanal") return "Ranking semanal de horas";
    if (period === "mensal") return "Ranking mensal de horas";
    return "Ranking personalizado de horas";
  }, [period]);

  useEffect(() => {
    if (period === "semanal") {
      setStartDate(toDateInputValue(getWeekStart()));
      setEndDate(toDateInputValue(getEndOfToday()));
    }

    if (period === "mensal") {
      setStartDate(toDateInputValue(getMonthStart()));
      setEndDate(toDateInputValue(getEndOfToday()));
    }
  }, [period]);

  async function loadRankingHoras() {
    setLoadingHoras(true);
    setErrorHoras("");

    try {
      const apiUrl = import.meta.env.VITE_API_URL || "";

      const params = new URLSearchParams();

      if (startDate) {
        params.set("startDate", `${startDate}T00:00:00.000Z`);
      }

      if (endDate) {
        params.set("endDate", `${endDate}T23:59:59.999Z`);
      }

      const response = await fetch(
        `${apiUrl}/api/data/ranking-mensal?${params.toString()}`,
        {
          credentials: "include",
          cache: "no-store",
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Erro ao carregar ranking de horas.");
      }

      const data = await response.json();
      setRankingHoras(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setErrorHoras(err?.message || "Erro ao carregar ranking de horas.");
    } finally {
      setLoadingHoras(false);
    }
  }

  useEffect(() => {
    loadRankingHoras();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  const topMedalOne = medalRanking[0];
  const topMedalTwo = medalRanking[1];
  const topMedalThree = medalRanking[2];

  const topHourOne = rankingHoras[0];
  const topHourTwo = rankingHoras[1];
  const topHourThree = rankingHoras[2];

  const totalHours = rankingHoras.reduce(
    (acc, item) => acc + Number(item.hours || 0),
    0
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-7"
    >
      <section className="relative overflow-hidden rounded-[2.4rem] border border-white/10 bg-[#050b09]/85 p-8 shadow-[0_32px_130px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(250,204,21,0.16),transparent_32%),radial-gradient(circle_at_88%_76%,rgba(16,185,129,0.13),transparent_34%)]" />
        <div className="absolute inset-0 cyber-grid-soft opacity-35" />
        <div className="absolute -right-28 -top-28 h-96 w-96 rounded-full bg-accent/10 blur-[130px]" />
        <div className="absolute -bottom-32 left-1/4 h-96 w-96 rounded-full bg-primary/10 blur-[140px]" />

        <div className="relative flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-5 inline-flex items-center gap-3 rounded-full border border-accent/25 bg-accent/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.25em] text-accent">
              <Trophy className="h-4 w-4" />
              Quadro de Honra
            </div>

            <h1 className="max-w-5xl text-5xl font-black uppercase leading-[0.98] tracking-tight text-white md:text-6xl xl:text-7xl">
              Mérito
              <span className="block portal-gradient-text">Operacional</span>
            </h1>

            <p className="mt-6 max-w-3xl text-sm leading-7 text-muted-foreground md:text-[15px]">
              Consulta o reconhecimento institucional por medalhas e a
              classificação operacional por horas registadas.
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-black/25 p-3">
            <div className="grid grid-cols-2 gap-2">
              <TabButton
                active={activeTab === "medalhas"}
                onClick={() => setActiveTab("medalhas")}
                icon={<Medal className="h-4 w-4" />}
                title="Medalhas"
                subtitle="Principal"
              />

              <TabButton
                active={activeTab === "horas"}
                onClick={() => setActiveTab("horas")}
                icon={<Clock className="h-4 w-4" />}
                title="Horas"
                subtitle="Secundário"
              />
            </div>
          </div>
        </div>
      </section>

      {activeTab === "medalhas" ? (
        <MedalhasTab
          medalRanking={medalRanking}
          medalStats={medalStats}
          topOne={topMedalOne}
          topTwo={topMedalTwo}
          topThree={topMedalThree}
        />
      ) : (
        <HorasTab
          period={period}
          setPeriod={setPeriod}
          startDate={startDate}
          endDate={endDate}
          setStartDate={setStartDate}
          setEndDate={setEndDate}
          loadRankingHoras={loadRankingHoras}
          rankingHoras={rankingHoras}
          loadingHoras={loadingHoras}
          errorHoras={errorHoras}
          periodLabel={periodLabel}
          totalHours={totalHours}
          topOne={topHourOne}
          topTwo={topHourTwo}
          topThree={topHourThree}
        />
      )}
    </motion.div>
  );
}

function MedalhasTab({
  medalRanking,
  medalStats,
  topOne,
  topTwo,
  topThree,
}: {
  medalRanking: MedalRankingItem[];
  medalStats: {
    totalMilitares: number;
    totalMedals: number;
    totalPoints: number;
    topName: string;
  };
  topOne?: MedalRankingItem;
  topTwo?: MedalRankingItem;
  topThree?: MedalRankingItem;
}) {
  return (
    <div className="space-y-7">
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_390px]">
        <div className="relative overflow-hidden rounded-[2.2rem] border border-white/10 bg-[#050b09]/80 p-6 shadow-[0_28px_120px_rgba(0,0,0,0.34)] backdrop-blur-2xl">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/10 blur-[120px]" />

          <div className="relative">
            <div className="mb-5 inline-flex items-center gap-3 rounded-full border border-accent/25 bg-accent/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-accent">
              <Award className="h-4 w-4" />
              Classificação principal
            </div>

            <h2 className="text-4xl font-black uppercase text-white">
              Medalhas
              <span className="block portal-gradient-text">
                Institucionais
              </span>
            </h2>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">
              Quem tiver mais medalhas aparece primeiro. Em caso de empate, conta
              a importância da medalha pela ordem definida.
            </p>

            <div className="mt-7 grid grid-cols-1 gap-3 md:grid-cols-4">
              <HeroMetric
                icon={<Trophy className="h-4 w-4" />}
                label="Militares"
                value={medalStats.totalMilitares}
              />
              <HeroMetric
                icon={<Medal className="h-4 w-4" />}
                label="Medalhas"
                value={medalStats.totalMedals}
              />
              <HeroMetric
                icon={<Star className="h-4 w-4" />}
                label="Mérito"
                value={medalStats.totalPoints}
              />
              <HeroMetric
                icon={<Crown className="h-4 w-4" />}
                label="Destaque"
                value={medalStats.topName}
              />
            </div>
          </div>
        </div>

        <MedalsOrderCard />
      </section>

      {medalRanking.length === 0 ? (
        <EmptyMedalsState />
      ) : (
        <>
          <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <MedalPodiumCard
              item={topTwo}
              place={2}
              tone="silver"
              delay={0.05}
            />
            <MedalPodiumCard
              item={topOne}
              place={1}
              tone="gold"
              delay={0}
              featured
            />
            <MedalPodiumCard
              item={topThree}
              place={3}
              tone="bronze"
              delay={0.1}
            />
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
            <div className="rounded-[2rem] border border-white/10 bg-[#050b09]/80 shadow-[0_28px_120px_rgba(0,0,0,0.34)] backdrop-blur-2xl">
              <div className="flex items-center justify-between border-b border-white/10 p-5">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">
                    Classificação principal
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-white">
                    Ranking por Medalhas
                  </h2>
                </div>

                <div className="rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-accent">
                  {medalRanking.length} militares
                </div>
              </div>

              <div className="divide-y divide-white/10">
                {medalRanking.map((item, index) => (
                  <MedalRankingLine key={item.id} item={item} index={index} />
                ))}
              </div>
            </div>

            <aside className="space-y-6">
              <SideInfoCard
                icon={<Crown className="h-5 w-5" />}
                title="Destaque principal"
                value={medalStats.topName}
                text="Militar com maior número de medalhas e melhor pontuação."
              />

              <SideInfoCard
                icon={<Medal className="h-5 w-5" />}
                title="Total de medalhas"
                value={String(medalStats.totalMedals)}
                text="Soma de todas as medalhas encontradas nos cargos Discord."
              />

              <Link
                href="/guardas"
                className="group flex items-center justify-between rounded-[2rem] border border-primary/20 bg-primary/10 p-5 text-primary transition-all hover:bg-primary/20"
              >
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.16em]">
                    Ver efetivo
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Consultar cargos e perfis militares
                  </p>
                </div>

                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </aside>
          </section>
        </>
      )}
    </div>
  );
}

function HorasTab({
  period,
  setPeriod,
  startDate,
  endDate,
  setStartDate,
  setEndDate,
  loadRankingHoras,
  rankingHoras,
  loadingHoras,
  errorHoras,
  periodLabel,
  totalHours,
  topOne,
  topTwo,
  topThree,
}: {
  period: PeriodMode;
  setPeriod: (period: PeriodMode) => void;
  startDate: string;
  endDate: string;
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;
  loadRankingHoras: () => void;
  rankingHoras: RankingHorasItem[];
  loadingHoras: boolean;
  errorHoras: string;
  periodLabel: string;
  totalHours: number;
  topOne?: RankingHorasItem;
  topTwo?: RankingHorasItem;
  topThree?: RankingHorasItem;
}) {
  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-[2.2rem] border border-white/10 bg-[#050b09]/80 p-6 shadow-[0_28px_120px_rgba(0,0,0,0.34)] backdrop-blur-2xl">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-[120px]" />

        <div className="relative grid grid-cols-1 gap-6 xl:grid-cols-[1fr_390px]">
          <div>
            <div className="mb-4 inline-flex items-center gap-3 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-primary">
              <Clock className="h-4 w-4" />
              Categoria secundária
            </div>

            <h2 className="text-4xl font-black uppercase text-white">
              Ranking
              <span className="block portal-gradient-text">de Horas</span>
            </h2>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">
              Classificação operacional baseada nas horas fechadas durante o
              período selecionado.
            </p>

            <div className="mt-7 grid grid-cols-1 gap-3 md:grid-cols-3">
              <HeroMetric
                icon={<Timer className="h-4 w-4" />}
                label="Total horas"
                value={`${totalHours.toFixed(1)}h`}
              />
              <HeroMetric
                icon={<Trophy className="h-4 w-4" />}
                label="Militares"
                value={rankingHoras.length}
              />
              <HeroMetric
                icon={<Calendar className="h-4 w-4" />}
                label="Período"
                value={period === "personalizado" ? "Custom" : period}
              />
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-black/25 p-4">
            <p className="mb-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-primary">
              <Calendar className="h-4 w-4" />
              Filtro de período
            </p>

            <div className="grid grid-cols-3 gap-2">
              <PeriodButton
                active={period === "semanal"}
                onClick={() => setPeriod("semanal")}
              >
                Semanal
              </PeriodButton>

              <PeriodButton
                active={period === "mensal"}
                onClick={() => setPeriod("mensal")}
              >
                Mensal
              </PeriodButton>

              <PeriodButton
                active={period === "personalizado"}
                onClick={() => setPeriod("personalizado")}
              >
                Custom
              </PeriodButton>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3">
              <label className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                  Início
                </span>
                <input
                  type="date"
                  value={startDate}
                  disabled={period !== "personalizado"}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-white outline-none disabled:opacity-55"
                />
              </label>

              <label className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                  Fim
                </span>
                <input
                  type="date"
                  value={endDate}
                  disabled={period !== "personalizado"}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-white outline-none disabled:opacity-55"
                />
              </label>
            </div>

            <button
              onClick={loadRankingHoras}
              disabled={loadingHoras}
              className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-primary/10 text-xs font-black uppercase tracking-[0.18em] text-primary transition-all hover:bg-primary/20 disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${loadingHoras ? "animate-spin" : ""}`}
              />
              Atualizar
            </button>
          </div>
        </div>
      </section>

      {errorHoras && (
        <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-5 text-red-200">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-black">Erro no ranking de horas</p>
              <p className="mt-1 text-sm opacity-80">{errorHoras}</p>
            </div>
          </div>
        </div>
      )}

      {loadingHoras ? (
        <div className="flex h-[320px] items-center justify-center rounded-[2rem] border border-white/10 bg-white/[0.035]">
          <div className="text-center">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
            <p className="mt-4 text-xs font-black uppercase tracking-[0.22em] text-muted-foreground">
              A calcular ranking de horas...
            </p>
          </div>
        </div>
      ) : rankingHoras.length === 0 ? (
        <EmptyHoursState />
      ) : (
        <>
          <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <HoursPodiumCard
              item={topTwo}
              place={2}
              tone="silver"
              delay={0.05}
            />
            <HoursPodiumCard
              item={topOne}
              place={1}
              tone="gold"
              delay={0}
              featured
            />
            <HoursPodiumCard
              item={topThree}
              place={3}
              tone="bronze"
              delay={0.1}
            />
          </section>

          <div className="rounded-[2rem] border border-white/10 bg-[#050b09]/80 shadow-[0_28px_120px_rgba(0,0,0,0.34)] backdrop-blur-2xl">
            <div className="flex items-center justify-between border-b border-white/10 p-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">
                  {periodLabel}
                </p>
                <h2 className="mt-1 text-2xl font-black text-white">
                  Classificação por Horas
                </h2>
              </div>

              <div className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-primary">
                {totalHours.toFixed(1)}h
              </div>
            </div>

            <div className="divide-y divide-white/10">
              {rankingHoras.map((item, index) => (
                <HoursRankingLine key={item.id} item={item} index={index} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  title,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`group flex min-w-[170px] items-center gap-3 rounded-2xl px-4 py-4 text-left transition-all ${
        active
          ? "bg-primary text-primary-foreground shadow-[0_0_28px_hsl(var(--primary)/0.24)]"
          : "border border-white/10 bg-white/[0.035] text-muted-foreground hover:bg-white/[0.06] hover:text-white"
      }`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          active ? "bg-black/15" : "bg-white/[0.04]"
        }`}
      >
        {icon}
      </span>

      <span>
        <span className="block text-xs font-black uppercase tracking-[0.18em]">
          {title}
        </span>
        <span
          className={`mt-1 block text-[9px] font-black uppercase tracking-[0.16em] ${
            active ? "text-black/55" : "text-muted-foreground"
          }`}
        >
          {subtitle}
        </span>
      </span>
    </button>
  );
}

function PeriodButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl px-3 py-3 text-[10px] font-black uppercase tracking-[0.14em] transition-all ${
        active
          ? "bg-primary text-primary-foreground shadow-[0_0_24px_hsl(var(--primary)/0.25)]"
          : "border border-white/10 bg-white/[0.035] text-muted-foreground hover:bg-white/[0.06] hover:text-white"
      }`}
    >
      {children}
    </button>
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
        <span className="text-accent">{icon}</span>
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

function MedalsOrderCard() {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-black/25 p-5">
      <p className="mb-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-accent">
        <Gem className="h-4 w-4" />
        Ordem das medalhas
      </p>

      <div className="space-y-2">
        {MEDALS.map((medal) => (
          <div
            key={medal.id}
            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent/20 bg-accent/10 text-lg">
              {medal.emoji}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-white">
                {medal.shortName}
              </p>
              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                {medal.points} pts
              </p>
            </div>

            <span className="text-[10px] font-black text-accent">
              #{medal.order}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MedalPodiumCard({
  item,
  place,
  tone,
  delay,
  featured,
}: {
  item?: MedalRankingItem;
  place: number;
  tone: "gold" | "silver" | "bronze";
  delay: number;
  featured?: boolean;
}) {
  const toneMap = {
    gold: {
      border: "border-accent/30",
      bg: "bg-accent/10",
      text: "text-accent",
      icon: <Crown className="h-7 w-7" />,
    },
    silver: {
      border: "border-slate-300/25",
      bg: "bg-slate-300/10",
      text: "text-slate-200",
      icon: <Medal className="h-7 w-7" />,
    },
    bronze: {
      border: "border-orange-400/25",
      bg: "bg-orange-400/10",
      text: "text-orange-300",
      icon: <Medal className="h-7 w-7" />,
    },
  };

  const selected = toneMap[tone];

  if (!item) {
    return (
      <div className="rounded-[2rem] border border-white/10 bg-white/[0.025] p-6 opacity-45">
        <p className="text-sm text-muted-foreground">Sem dados para #{place}</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay }}
      className={`relative overflow-hidden rounded-[2rem] border ${selected.border} ${selected.bg} p-6 shadow-[0_28px_100px_rgba(0,0,0,0.35)] ${
        featured ? "xl:-mt-6 xl:min-h-[340px]" : "xl:mt-8 xl:min-h-[310px]"
      }`}
    >
      <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-[80px]" />

      <div className="relative flex flex-col items-center text-center">
        <div
          className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border ${selected.border} ${selected.bg} ${selected.text}`}
        >
          {selected.icon}
        </div>

        <div
          className={`mb-5 rounded-full border ${selected.border} ${selected.bg} px-4 py-1 text-xs font-black uppercase tracking-[0.18em] ${selected.text}`}
        >
          #{place} Lugar
        </div>

        <div className="relative mb-5">
          {item.avatar ? (
            <img
              src={item.avatar}
              alt={item.name}
              className={`rounded-[1.5rem] border object-cover ${
                featured ? "h-28 w-28" : "h-24 w-24"
              } ${selected.border}`}
            />
          ) : (
            <div
              className={`flex rounded-[1.5rem] border ${
                featured ? "h-28 w-28" : "h-24 w-24"
              } ${selected.border} items-center justify-center bg-black/25`}
            >
              <Shield className={`h-10 w-10 ${selected.text}`} />
            </div>
          )}
        </div>

        <h3 className="max-w-full truncate text-2xl font-black text-white">
          {item.name}
        </h3>

        <p
          className={`mt-2 text-[10px] font-black uppercase tracking-[0.18em] ${selected.text}`}
        >
          {item.rank}
        </p>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {item.medals.map((medal) => (
            <span
              key={medal.id}
              title={medal.name}
              className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-lg"
            >
              {medal.emoji}
            </span>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-black/25 px-6 py-4">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
            Medalhas / Mérito
          </p>
          <p className="mt-1 text-3xl font-black text-white">
            {item.medalCount} · {item.points}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function HoursPodiumCard({
  item,
  place,
  tone,
  delay,
  featured,
}: {
  item?: RankingHorasItem;
  place: number;
  tone: "gold" | "silver" | "bronze";
  delay: number;
  featured?: boolean;
}) {
  const toneMap = {
    gold: {
      border: "border-accent/30",
      bg: "bg-accent/10",
      text: "text-accent",
      icon: <Crown className="h-7 w-7" />,
    },
    silver: {
      border: "border-slate-300/25",
      bg: "bg-slate-300/10",
      text: "text-slate-200",
      icon: <Medal className="h-7 w-7" />,
    },
    bronze: {
      border: "border-orange-400/25",
      bg: "bg-orange-400/10",
      text: "text-orange-300",
      icon: <Medal className="h-7 w-7" />,
    },
  };

  const selected = toneMap[tone];

  if (!item) {
    return (
      <div className="rounded-[2rem] border border-white/10 bg-white/[0.025] p-6 opacity-45">
        <p className="text-sm text-muted-foreground">Sem dados para #{place}</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay }}
      className={`relative overflow-hidden rounded-[2rem] border ${selected.border} ${selected.bg} p-6 shadow-[0_28px_100px_rgba(0,0,0,0.35)] ${
        featured ? "xl:-mt-6 xl:min-h-[330px]" : "xl:mt-8 xl:min-h-[300px]"
      }`}
    >
      <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-[80px]" />

      <div className="relative flex flex-col items-center text-center">
        <div
          className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border ${selected.border} ${selected.bg} ${selected.text}`}
        >
          {selected.icon}
        </div>

        <div
          className={`mb-5 rounded-full border ${selected.border} ${selected.bg} px-4 py-1 text-xs font-black uppercase tracking-[0.18em] ${selected.text}`}
        >
          #{place} Lugar
        </div>

        {item.avatar ? (
          <img
            src={item.avatar}
            alt={item.name}
            className={`mb-5 rounded-[1.5rem] border object-cover ${
              featured ? "h-28 w-28" : "h-24 w-24"
            } ${selected.border}`}
          />
        ) : (
          <div
            className={`mb-5 flex rounded-[1.5rem] border ${
              featured ? "h-28 w-28" : "h-24 w-24"
            } ${selected.border} items-center justify-center bg-black/25`}
          >
            <Shield className={`h-10 w-10 ${selected.text}`} />
          </div>
        )}

        <h3 className="max-w-full truncate text-2xl font-black text-white">
          {item.name}
        </h3>

        <p
          className={`mt-2 text-[10px] font-black uppercase tracking-[0.18em] ${selected.text}`}
        >
          {item.rank}
        </p>

        <div className="mt-6 rounded-2xl border border-white/10 bg-black/25 px-6 py-4">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
            Total registado
          </p>
          <p className="mt-1 text-3xl font-black text-white">
            {Number(item.hours || 0).toFixed(1)}h
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function MedalRankingLine({
  item,
  index,
}: {
  item: MedalRankingItem;
  index: number;
}) {
  return (
    <Link
      href={`/guardas/${item.id}`}
      className="group flex items-center gap-4 p-5 transition-all hover:bg-white/[0.035]"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-black text-white">
        #{index + 1}
      </div>

      {item.avatar ? (
        <img
          src={item.avatar}
          alt={item.name}
          className="h-12 w-12 rounded-2xl border border-white/10 object-cover"
        />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-primary/10 text-primary">
          <Shield className="h-5 w-5" />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-black text-white">{item.name}</p>
        <p className="mt-1 truncate text-[10px] font-black uppercase tracking-[0.16em] text-primary">
          {item.rank} {item.numero ? `· ${item.numero}` : ""}
        </p>
      </div>

      <div className="hidden flex-wrap justify-end gap-2 md:flex">
        {item.medals.map((medal) => (
          <span
            key={medal.id}
            title={medal.name}
            className="rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-sm text-accent"
          >
            {medal.emoji} {medal.shortName}
          </span>
        ))}
      </div>

      <div className="w-24 text-right">
        <p className="text-xl font-black text-white">{item.medalCount}</p>
        <p className="text-[9px] font-black uppercase tracking-[0.16em] text-muted-foreground">
          Medalhas
        </p>
      </div>

      <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
    </Link>
  );
}

function HoursRankingLine({
  item,
  index,
}: {
  item: RankingHorasItem;
  index: number;
}) {
  return (
    <Link
      href={`/guardas/${item.id}`}
      className="group flex items-center gap-4 p-5 transition-all hover:bg-white/[0.035]"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-black text-white">
        #{index + 1}
      </div>

      {item.avatar ? (
        <img
          src={item.avatar}
          alt={item.name}
          className="h-12 w-12 rounded-2xl border border-white/10 object-cover"
        />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-primary/10 text-primary">
          <Shield className="h-5 w-5" />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-black text-white">{item.name}</p>
        <p className="mt-1 truncate text-[10px] font-black uppercase tracking-[0.16em] text-primary">
          {item.rank} {item.numero ? `· ${item.numero}` : ""}
        </p>
      </div>

      <div className="text-right">
        <p className="text-xl font-black text-white">
          {Number(item.hours || 0).toFixed(1)}h
        </p>
        <p className="text-[9px] font-black uppercase tracking-[0.16em] text-muted-foreground">
          Registado
        </p>
      </div>

      <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
    </Link>
  );
}

function SideInfoCard({
  icon,
  title,
  value,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  text: string;
}) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-[#050b09]/80 p-5 shadow-[0_24px_90px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        {icon}
      </div>

      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </p>

      <p className="mt-2 truncate text-3xl font-black text-white">{value}</p>

      <p className="mt-3 text-xs leading-6 text-muted-foreground">{text}</p>
    </div>
  );
}

function EmptyMedalsState() {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-10 text-center">
      <Trophy className="mx-auto h-12 w-12 text-muted-foreground/40" />
      <h2 className="mt-5 text-2xl font-black text-white">
        Ainda não há medalhas atribuídas
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-muted-foreground">
        Nenhum militar possui uma das medalhas configuradas nos cargos Discord.
        Confirma se os IDs das roles estão corretos e se a sincronização do
        Discord está ativa.
      </p>
    </div>
  );
}

function EmptyHoursState() {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-10 text-center">
      <Clock className="mx-auto h-12 w-12 text-muted-foreground/40" />
      <h2 className="mt-5 text-2xl font-black text-white">
        Sem ranking de horas neste período
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-muted-foreground">
        Não existem horas fechadas para apresentar. Experimenta mudar o período
        ou confirma se existem pontos fechados.
      </p>
    </div>
  );
}