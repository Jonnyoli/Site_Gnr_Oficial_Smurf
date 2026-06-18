import {
  ReactNode,
  type,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  BellRing,
  Building2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Command,
  Crosshair,
  FileText,
  Flame,
  FolderOpen,
  Gauge,
  LayoutDashboard,
  MapPin,
  Megaphone,
  Newspaper,
  Play,
  Radio,
  Shield,
  ShieldAlert,
  Sparkles,
  Star,
  Target,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  Zap,
  CheckCircle2,
  Eye,
  Settings2,
  UserRound,
  BriefcaseBusiness,
  Bookmark,
  FileCheck2,
  History,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";

const GNR_ROLE_ID = "1147878941974077478";
const COMMAND_GENERAL_ROLE_ID = "1147878942099906672";
const NIC_DIRECTOR_ROLE_ID = "1296910327879045130";
const DEV_USER_ID = "713719718091030599";

type HomePreferences = {
  showPersonalSummary: boolean;
  showFavorites: boolean;
  showNotifications: boolean;
  showActivePatrols: boolean;
};

type OperationalNotification = {
  _id: string;
  title: string;
  message: string;
  createdAt: string;
  readAt?: string | null;
  actionUrl?: string | null;
  priority?: "NORMAL" | "ATTENTION" | "URGENT";
};

type HeroSlide = {
  id: string;
  eyebrow: string;
  title: string;
  accent: string;
  description: string;
  image: string;
  href: string;
  buttonLabel: string;
  icon: any;
  tone: "green" | "red" | "gold" | "blue";
};

type Tone = "green" | "red" | "gold" | "blue" | "cyan";

const HERO_SLIDES: HeroSlide[] = [
  {
    id: "central",
    eyebrow: "Central Operacional",
    title: "Comando em tempo real",
    accent: "Decisão. Coordenação. Resposta.",
    description:
      "Uma central viva para acompanhar o efetivo, patrulhas, alertas e operações em curso.",
    image: "/Store/backgrounds/CD.png",
    href: "/comando",
    buttonLabel: "Abrir Centro de Comando",
    icon: Command,
    tone: "green",
  },
  {
    id: "gioe",
    eyebrow: "Operações Especiais",
    title: "Prontidão para o inesperado",
    accent: "Precisão. Disciplina. Impacto.",
    description:
      "Visual cinematográfico inspirado em cenários de alto risco e intervenção tática.",
    image: "/Store/backgrounds/GSA.png",
    href: "/gioe",
    buttonLabel: "Explorar GIOE",
    icon: Crosshair,
    tone: "red",
  },
  {
    id: "patrulha",
    eyebrow: "Presença no Terreno",
    title: "A operação começa aqui",
    accent: "Rua. Estrada. Vigilância.",
    description:
      "Do patrulhamento diário à resposta imediata, acompanha a atividade operacional da Guarda.",
    image: "/Store/backgrounds/patrulha.png",
    href: "/patrulhas",
    buttonLabel: "Ver Patrulhas",
    icon: Radio,
    tone: "blue",
  },
  {
    id: "escola",
    eyebrow: "Escola da Guarda",
    title: "Formar para servir",
    accent: "Conhecimento. Mérito. Evolução.",
    description:
      "Uma visão institucional dedicada à formação, disciplina e crescimento dos militares.",
    image: "/Store/backgrounds/EG.png",
    href: "/honra",
    buttonLabel: "Ver Quadro de Honra",
    icon: Trophy,
    tone: "gold",
  },
];

function TodayStat({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: any;
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-3xl border border-white/10 bg-white/[.025] p-5 transition hover:-translate-y-0.5 hover:border-primary/25 hover:bg-primary/[.045]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/[.08] text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <ArrowRight className="h-4 w-4 text-white/20 transition group-hover:text-primary" />
      </div>
      <p className="mt-4 text-3xl font-black text-white">
        {value}
      </p>
      <p className="mt-1 text-[9px] font-black uppercase tracking-[.16em] text-white/32">
        {label}
      </p>
    </Link>
  );
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
    guarda?.discordRoles,
    guarda?.discordTags,
  ];

  return sources
    .flatMap((source) =>
      Array.isArray(source) ? source : [],
    )
    .map(normalizeRoleId)
    .filter((roleId): roleId is string =>
      Boolean(roleId),
    );
}

function hasRole(guarda: any, roleId: string) {
  return getRoleIds(guarda).includes(roleId);
}

export default function Inicio() {
  const { user } = useAuth();

  const {
    guardas,
    currentHoras,
    currentArquivos,
    currentPatrulhas,
  } = useData() as any;

  const [currentSlide, setCurrentSlide] = useState(0);
  const [carouselPaused, setCarouselPaused] =
    useState(false);
  const [videoMuted, setVideoMuted] = useState(true);
  const [videoAvailable, setVideoAvailable] =
    useState(true);
  const [showPreferences, setShowPreferences] =
    useState(false);
  const [notifications, setNotifications] = useState<
    OperationalNotification[]
  >([]);
  const [preferences, setPreferences] =
    useState<HomePreferences>(() => {
      try {
        const stored = window.localStorage.getItem(
          "gnr-home-preferences",
        );

        return stored
          ? JSON.parse(stored)
          : {
              showPersonalSummary: true,
              showFavorites: true,
              showNotifications: true,
              showActivePatrols: true,
            };
      } catch {
        return {
          showPersonalSummary: true,
          showFavorites: true,
          showNotifications: true,
          showActivePatrols: true,
        };
      }
    });

  useEffect(() => {
    if (carouselPaused) return;

    const interval = window.setInterval(() => {
      setCurrentSlide((current) =>
        (current + 1) % HERO_SLIDES.length,
      );
    }, 6500);

    return () => window.clearInterval(interval);
  }, [carouselPaused]);

  useEffect(() => {
    window.localStorage.setItem(
      "gnr-home-preferences",
      JSON.stringify(preferences),
    );
  }, [preferences]);

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;

    async function loadNotifications() {
      try {
        const response = await fetch(
          "/api/operational-notifications",
          {
            credentials: "include",
          },
        );

        if (!response.ok) return;

        const payload = await response.json();

        if (!cancelled) {
          setNotifications(
            Array.isArray(payload?.items)
              ? payload.items.slice(0, 5)
              : [],
          );
        }
      } catch {
        // A página inicial continua funcional sem notificações.
      }
    }

    void loadNotifications();

    const interval = window.setInterval(
      () => void loadNotifications(),
      30_000,
    );

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [user?.id]);

  const efetivosGnr = useMemo(() => {
    if (!Array.isArray(guardas)) return [];

    return guardas.filter((guarda: any) =>
      hasRole(guarda, GNR_ROLE_ID),
    );
  }, [guardas]);

  const efetivoIds = useMemo(
    () =>
      new Set(
        efetivosGnr
          .map((guarda: any) =>
            String(
              guarda?.discordId ||
                guarda?.id ||
                guarda?._id ||
                "",
            ),
          )
          .filter(Boolean),
      ),
    [efetivosGnr],
  );

  const totalGuardas = efetivosGnr.length;

  const currentHorasFiltradas = useMemo(() => {
    if (!Array.isArray(currentHoras)) return [];

    return currentHoras.filter((item: any) => {
      const id = String(
        item?.guardaId ||
          item?.discordId ||
          item?.userId ||
          item?.id ||
          "",
      );

      return efetivoIds.size === 0
        ? true
        : efetivoIds.has(id);
    });
  }, [currentHoras, efetivoIds]);

  const totalHoras = useMemo(
    () =>
      currentHorasFiltradas.reduce(
        (acc: number, item: any) =>
          acc +
          Number(item.horasRegistadas || 0),
        0,
      ),
    [currentHorasFiltradas],
  );

  const totalArquivos = Array.isArray(currentArquivos)
    ? currentArquivos.length
    : 0;

  const totalPatrulhas = Array.isArray(currentPatrulhas)
    ? currentPatrulhas.length
    : 0;

  const activePatrols = useMemo(() => {
    if (!Array.isArray(currentPatrulhas)) return [];

    return currentPatrulhas
      .filter((patrulha: any) => {
        const state = String(
          patrulha?.status ||
            patrulha?.estado ||
            "",
        ).toLowerCase();

        return (
          state.includes("ativo") ||
          state.includes("curso") ||
          state.includes("aberta")
        );
      })
      .slice(0, 4);
  }, [currentPatrulhas]);

  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12
      ? "Bom dia"
      : currentHour < 19
        ? "Boa tarde"
        : "Boa noite";

  const displayName =
    user?.displayName ||
    user?.global_name ||
    user?.username ||
    "Militar";

  const rank = user?.rank || "Operacional";

  const userRoleIds = useMemo(
    () =>
      Array.isArray(user?.roles)
        ? user.roles.map(String)
        : [],
    [user?.roles],
  );

  const isCommand =
    String(user?.id || "") === DEV_USER_ID ||
    userRoleIds.includes(COMMAND_GENERAL_ROLE_ID);

  const isNicDirector =
    userRoleIds.includes(NIC_DIRECTOR_ROLE_ID);

  const userGuard = useMemo(() => {
    const userId = String(user?.id || "");

    return efetivosGnr.find(
      (guarda: any) =>
        String(
          guarda?.discordId ||
            guarda?.id ||
            guarda?._id ||
            "",
        ) === userId,
    );
  }, [efetivosGnr, user?.id]);

  const personalHours = useMemo(() => {
    const userId = String(user?.id || "");

    return currentHorasFiltradas
      .filter(
        (item: any) =>
          String(
            item?.guardaId ||
              item?.discordId ||
              item?.userId ||
              item?.id ||
              "",
          ) === userId,
      )
      .reduce(
        (total: number, item: any) =>
          total + Number(item?.horasRegistadas || 0),
        0,
      );
  }, [currentHorasFiltradas, user?.id]);

  const personalPatrols = useMemo(() => {
    const userId = String(user?.id || "");

    return Array.isArray(currentPatrulhas)
      ? currentPatrulhas.filter((patrulha: any) => {
          const candidates = [
            patrulha?.discordId,
            patrulha?.guardaId,
            patrulha?.responsavelDiscordId,
            patrulha?.createdByDiscordId,
            ...(Array.isArray(patrulha?.participantes)
              ? patrulha.participantes.map(
                  (participant: any) =>
                    participant?.discordId ||
                    participant?.id,
                )
              : []),
          ]
            .filter(Boolean)
            .map(String);

          return candidates.includes(userId);
        }).length
      : 0;
  }, [currentPatrulhas, user?.id]);

  const unreadNotifications = notifications.filter(
    (item) => !item.readAt,
  ).length;

  const favoriteHrefs = useMemo(() => {
    try {
      const stored = window.localStorage.getItem(
        "gnr-sidebar-favorites",
      );

      return stored
        ? (JSON.parse(stored) as string[])
        : [];
    } catch {
      return [];
    }
  }, []);

  const favoriteItems = useMemo(
    () =>
      [
        {
          href: "/dashboard",
          label: "Dashboard",
          icon: LayoutDashboard,
          allowed: true,
        },
        {
          href: "/comando",
          label: "Centro de Comando",
          icon: Command,
          allowed: isCommand,
        },
        {
          href: "/comando/aprovacoes",
          label: "Aprovações",
          icon: FileCheck2,
          allowed: isCommand || isNicDirector,
        },
        {
          href: "/guardas",
          label: "Efetivo",
          icon: Users,
          allowed: true,
        },
        {
          href: "/horas",
          label: "Horas",
          icon: Clock3,
          allowed: true,
        },
        {
          href: "/patrulhas",
          label: "Patrulhas",
          icon: Radio,
          allowed: true,
        },
        {
          href: "/documentos",
          label: "Documentos",
          icon: FileText,
          allowed: true,
        },
        {
          href: "/unidades/nic",
          label: "NIC",
          icon: Crosshair,
          allowed: true,
        },
        {
          href: "/honra",
          label: "Honra",
          icon: Trophy,
          allowed: true,
        },
      ].filter(
        (item) =>
          item.allowed &&
          favoriteHrefs.includes(item.href),
      ),
    [
      favoriteHrefs,
      isCommand,
      isNicDirector,
    ],
  );

  const slide = HERO_SLIDES[currentSlide];

  function goToSlide(index: number) {
    setCurrentSlide(
      (index + HERO_SLIDES.length) %
        HERO_SLIDES.length,
    );
  }

  const todayCenterStats =
    useMemo(() => {
      const guards =
        Array.isArray(guardas)
          ? guardas
          : [];

      const service =
        guards.filter(
          (guard: any) =>
            guard?.isOnDuty ||
            guard?.estado === "Em serviço" ||
            guard?.estado === "Serviço",
        ).length;

      const points =
        Array.isArray(currentHoras)
          ? currentHoras.filter(
              (entry: any) =>
                !entry?.fim &&
                !entry?.endedAt &&
                entry?.status !== "FECHADO",
            ).length
          : 0;

      const patrols =
        Array.isArray(currentPatrulhas)
          ? currentPatrulhas.filter(
              (entry: any) =>
                !entry?.fim &&
                !entry?.endedAt &&
                entry?.status !== "FECHADO",
            ).length
          : 0;

      const alerts =
        notifications.filter(
          (notification) =>
            !notification.readAt,
        ).length;

      return {
        service,
        points,
        patrols,
        alerts,
      };
    }, [
      guardas,
      currentHoras,
      currentPatrulhas,
      notifications,
    ]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="portal-home-page portal-v7-home space-y-7 pb-10"
    >
      <section className="portal-home-hero relative min-h-[600px] overflow-hidden rounded-[1.65rem] border border-white/10 bg-black shadow-[0_45px_180px_rgba(0,0,0,0.58)]">
        {videoAvailable && (
          <video
            autoPlay
            loop
            muted={videoMuted}
            playsInline
            preload="metadata"
            poster="/Store/backgrounds/CD.png"
            onError={() => setVideoAvailable(false)}
            className="absolute inset-0 h-full w-full object-cover"
          >
            <source
              src="/videos/gnr-central.mp4"
              type="video/mp4"
            />
          </video>
        )}

        {!videoAvailable && (
          <img
            src="/Store/backgrounds/CD.png"
            alt="GNR Central"
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}

        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.96)_0%,rgba(0,0,0,0.74)_45%,rgba(0,0,0,0.30)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.35)_55%,rgba(0,0,0,0.92))]" />
        <div className="absolute inset-0 cyber-grid-soft opacity-[0.16]" />
        <div className="pointer-events-none absolute -right-24 top-10 h-[440px] w-[440px] rounded-full border border-primary/15" />
        <div className="pointer-events-none absolute -right-5 top-24 h-[330px] w-[330px] rounded-full border border-primary/10" />

        <div className="relative z-10 flex min-h-[600px] flex-col justify-between p-7 md:p-10 xl:p-12">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-3 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300 backdrop-blur-xl">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                </span>
                Sistema Operacional Ativo
              </div>

              <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-black/25 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/55 backdrop-blur-xl md:inline-flex">
                <Activity className="h-3.5 w-3.5 text-primary" />
                Central ligada
              </div>
            </div>

            {videoAvailable && (
              <button
                type="button"
                onClick={() =>
                  setVideoMuted((current) => !current)
                }
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-black/30 text-white/65 backdrop-blur-xl transition hover:border-primary/30 hover:text-primary"
                aria-label={
                  videoMuted
                    ? "Ativar som"
                    : "Desativar som"
                }
              >
                {videoMuted ? (
                  <VolumeX className="h-5 w-5" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </button>
            )}
          </div>

          <div className="max-w-5xl py-14">
            <div className="mb-5 flex items-center gap-3 text-primary">
              <span className="h-px w-10 bg-primary" />
              <p className="text-[10px] font-black uppercase tracking-[0.42em]">
                Guarda Nacional Republicana
              </p>
            </div>

            <h1 className="max-w-5xl text-5xl font-black uppercase leading-[0.88] tracking-[-0.055em] text-white md:text-7xl xl:text-[6.6rem]">
              Central
              <span className="block bg-[linear-gradient(90deg,#22c55e,#d4af37,#ffffff)] bg-clip-text text-transparent">
                GNR
              </span>
            </h1>

            <p className="mt-6 max-w-3xl text-base leading-7 text-white/58 md:text-lg">
              {greeting},{" "}
              <span className="font-black text-white">
                {displayName}
              </span>
              . Bem-vindo à plataforma institucional onde
              operação, comando e mérito se encontram.
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/38">
              <span>{rank}</span>
              <span className="h-1 w-1 rounded-full bg-white/30" />
              <span>{totalGuardas} militares</span>
              <span className="h-1 w-1 rounded-full bg-white/30" />
              <span>{totalPatrulhas} patrulhas registadas</span>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              {isCommand && (
                <HeroAction
                  href="/comando"
                  label="Entrar no Comando"
                  icon={<Command className="h-4 w-4" />}
                  primary
                />
              )}

              {!isCommand && isNicDirector && (
                <HeroAction
                  href="/comando/aprovacoes"
                  label="Abrir Aprovações"
                  icon={<FileCheck2 className="h-4 w-4" />}
                  primary
                />
              )}

              <HeroAction
                href="/dashboard"
                label="Abrir Dashboard"
                icon={
                  <LayoutDashboard className="h-4 w-4" />
                }
                primary={!isCommand && !isNicDirector}
              />

              <button
                type="button"
                onClick={() => {
                  document
                    .getElementById("cinematic-carousel")
                    ?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });
                }}
                className="inline-flex h-12 items-center gap-3 rounded-2xl border border-white/15 bg-black/25 px-5 text-[10px] font-black uppercase tracking-[0.16em] text-white/75 backdrop-blur-xl transition hover:border-white/25 hover:bg-white/10"
              >
                <Play className="h-4 w-4" />
                Explorar Central
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <HeroMetric
              href="/guardas"
              label="Efetivo"
              value={totalGuardas}
              icon={<Users className="h-4 w-4" />}
            />
            <HeroMetric
              href="/horas"
              label="Horas"
              value={`${totalHoras.toFixed(1)}h`}
              icon={<Clock3 className="h-4 w-4" />}
            />
            <HeroMetric
              href="/patrulhas"
              label="Patrulhas"
              value={totalPatrulhas}
              icon={<Radio className="h-4 w-4" />}
            />
            <HeroMetric
              href="/arquivos"
              label="Arquivos"
              value={totalArquivos}
              icon={<FolderOpen className="h-4 w-4" />}
            />
          </div>
        </div>
      </section>

      <section className="portal-home-grid grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.38fr)_minmax(330px,0.62fr)]">
        <div className="rounded-[2.4rem] border border-white/10 bg-[#050b09]/90 p-6 shadow-[0_28px_110px_rgba(0,0,0,0.34)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                <UserRound className="h-6 w-6" />
              </div>

              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">
                  Resumo pessoal
                </p>
                <h2 className="mt-1 text-2xl font-black text-white">
                  {displayName}
                </h2>
                <p className="mt-1 text-sm text-white/35">
                  {userGuard?.posto ||
                    userGuard?.rank ||
                    rank}
                  {userGuard?.unidade
                    ? ` · ${userGuard.unidade}`
                    : ""}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setShowPreferences((current) => !current)
              }
              className="inline-flex items-center gap-2 self-start rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[9px] font-black uppercase tracking-[0.12em] text-white/45 transition hover:text-white"
            >
              <Settings2 className="h-4 w-4" />
              Personalizar
            </button>
          </div>

          {showPreferences && (
            <HomePreferencesPanel
              preferences={preferences}
              setPreferences={setPreferences}
            />
          )}

          {preferences.showPersonalSummary && (
            <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
              <PersonalMetric
                href="/horas"
                label="As minhas horas"
                value={`${personalHours.toFixed(1)}h`}
                icon={<Clock3 className="h-4 w-4" />}
              />
              <PersonalMetric
                href="/patrulhas"
                label="Patrulhas"
                value={personalPatrols}
                icon={<Radio className="h-4 w-4" />}
              />
              <PersonalMetric
                href="/alertas"
                label="Notificações"
                value={unreadNotifications}
                icon={<BellRing className="h-4 w-4" />}
              />
              <PersonalMetric
                href="/guardas"
                label="Estado"
                value={
                  userGuard?.estado ||
                  userGuard?.status ||
                  "Operacional"
                }
                icon={<BadgeCheck className="h-4 w-4" />}
              />
            </div>
          )}

          {preferences.showFavorites && (
            <div className="mt-6 border-t border-white/10 pt-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.17em] text-yellow-300">
                    Favoritos
                  </p>
                  <p className="mt-1 text-xs text-white/30">
                    Sincronizados com a sidebar.
                  </p>
                </div>
                <Bookmark className="h-4 w-4 text-yellow-300" />
              </div>

              {favoriteItems.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {favoriteItems.map((item) => {
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="group flex items-center gap-3 rounded-2xl border border-yellow-400/10 bg-yellow-500/[0.035] p-4 transition hover:-translate-y-0.5 hover:border-yellow-400/25"
                      >
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-yellow-400/15 bg-yellow-500/10 text-yellow-300">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-black text-white">
                          {item.label}
                        </span>
                        <ArrowRight className="h-4 w-4 text-white/15 transition group-hover:translate-x-0.5 group-hover:text-yellow-300" />
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center">
                  <Star className="mx-auto h-6 w-6 text-white/15" />
                  <p className="mt-3 text-sm font-black text-white/55">
                    Ainda não tens favoritos
                  </p>
                  <p className="mt-1 text-xs text-white/25">
                    Usa a estrela da sidebar para fixar módulos.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-6">
          {preferences.showNotifications && (
            <section className="rounded-[2.4rem] border border-white/10 bg-[#050b09]/90 p-6 shadow-[0_28px_110px_rgba(0,0,0,0.34)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-primary">
                    Notificações
                  </p>
                  <h3 className="mt-1 text-xl font-black text-white">
                    Pendentes para ti
                  </h3>
                </div>
                <BellRing className="h-5 w-5 text-primary" />
              </div>

              <div className="mt-5 space-y-3">
                {notifications.length > 0 ? (
                  notifications.map((notification) => (
                    <Link
                      key={notification._id}
                      href={
                        notification.actionUrl ||
                        "/comando/aprovacoes"
                      }
                      className="group block rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:border-primary/20"
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                            notification.priority === "URGENT"
                              ? "bg-red-400"
                              : notification.priority === "ATTENTION"
                                ? "bg-yellow-400"
                                : "bg-primary"
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black text-white">
                            {notification.title}
                          </p>
                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/35">
                            {notification.message}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-white/15 transition group-hover:translate-x-0.5 group-hover:text-primary" />
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center">
                    <CheckCircle2 className="mx-auto h-7 w-7 text-emerald-300" />
                    <p className="mt-3 text-sm font-black text-white">
                      Tudo tratado
                    </p>
                    <p className="mt-1 text-xs text-white/25">
                      Não existem notificações pendentes.
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}

          {preferences.showActivePatrols && (
            <section className="rounded-[2.4rem] border border-white/10 bg-[#050b09]/90 p-6 shadow-[0_28px_110px_rgba(0,0,0,0.34)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-blue-300">
                    Continuação rápida
                  </p>
                  <h3 className="mt-1 text-xl font-black text-white">
                    Patrulhas em curso
                  </h3>
                </div>
                <History className="h-5 w-5 text-blue-300" />
              </div>

              <div className="mt-5 space-y-3">
                {activePatrols.length > 0 ? (
                  activePatrols.map((patrulha: any, index: number) => (
                    <Link
                      key={
                        patrulha?._id ||
                        patrulha?.id ||
                        index
                      }
                      href="/patrulhas"
                      className="group block rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:border-blue-400/20"
                    >
                      <p className="text-sm font-black text-white">
                        {patrulha?.titulo ||
                          patrulha?.title ||
                          patrulha?.nome ||
                          `Patrulha ${index + 1}`}
                      </p>
                      <p className="mt-1 text-xs text-white/35">
                        {patrulha?.local ||
                          patrulha?.location ||
                          patrulha?.zona ||
                          "Local não indicado"}
                      </p>
                    </Link>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center">
                    <Radio className="mx-auto h-7 w-7 text-white/15" />
                    <p className="mt-3 text-sm font-black text-white/55">
                      Sem patrulhas ativas
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </section>

      <section
        id="cinematic-carousel"
        onMouseEnter={() => setCarouselPaused(true)}
        onMouseLeave={() => setCarouselPaused(false)}
        className="relative overflow-hidden rounded-[2.6rem] border border-white/10 bg-[#050b09] shadow-[0_35px_140px_rgba(0,0,0,0.48)]"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.985 }}
            transition={{ duration: 0.65 }}
            className="relative min-h-[560px]"
          >
            <img
              src={slide.image}
              alt={slide.title}
              className="absolute inset-0 h-full w-full object-cover"
            />

            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.94)_0%,rgba(0,0,0,0.78)_45%,rgba(0,0,0,0.28)_100%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.55)_72%,rgba(0,0,0,0.92))]" />

            <div className="relative flex min-h-[560px] items-end p-7 md:p-10 xl:p-12">
              <div className="max-w-4xl">
                <SlideEyebrow
                  tone={slide.tone}
                  icon={<slide.icon className="h-4 w-4" />}
                >
                  {slide.eyebrow}
                </SlideEyebrow>

                <h2 className="mt-5 max-w-4xl text-4xl font-black uppercase leading-[0.95] tracking-[-0.04em] text-white md:text-6xl">
                  {slide.title}
                </h2>

                <p className="mt-4 text-sm font-black uppercase tracking-[0.26em] text-white/45">
                  {slide.accent}
                </p>

                <p className="mt-5 max-w-2xl text-sm leading-7 text-white/58 md:text-base">
                  {slide.description}
                </p>

                <Link
                  href={slide.href}
                  className="mt-7 inline-flex h-12 items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-5 text-[10px] font-black uppercase tracking-[0.16em] text-white backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/15 hover:text-primary"
                >
                  {slide.buttonLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        <button
          type="button"
          onClick={() => goToSlide(currentSlide - 1)}
          className="absolute left-5 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-2xl border border-white/15 bg-black/35 text-white/70 backdrop-blur-xl transition hover:border-primary/30 hover:text-primary"
          aria-label="Slide anterior"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={() => goToSlide(currentSlide + 1)}
          className="absolute right-5 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-2xl border border-white/15 bg-black/35 text-white/70 backdrop-blur-xl transition hover:border-primary/30 hover:text-primary"
          aria-label="Slide seguinte"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        <div className="absolute bottom-6 right-6 flex items-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 py-2 backdrop-blur-xl">
          {HERO_SLIDES.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => goToSlide(index)}
              className={`h-2 rounded-full transition-all ${
                index === currentSlide
                  ? "w-8 bg-primary"
                  : "w-2 bg-white/30 hover:bg-white/60"
              }`}
              aria-label={`Abrir slide ${index + 1}`}
            />
          ))}
        </div>

        <div className="absolute bottom-6 left-6 rounded-full border border-white/10 bg-black/35 px-4 py-2 text-[9px] font-black uppercase tracking-[0.18em] text-white/45 backdrop-blur-xl">
          {String(currentSlide + 1).padStart(2, "0")} /{" "}
          {String(HERO_SLIDES.length).padStart(2, "0")}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Efetivo ativo"
          value={totalGuardas}
          description="Militares reconhecidos pela role GNR"
          icon={<Users className="h-5 w-5" />}
          tone="green"
        />
        <KpiCard
          title="Patrulhas"
          value={totalPatrulhas}
          description={`${activePatrols.length} atualmente em curso`}
          icon={<Radio className="h-5 w-5" />}
          tone="blue"
        />
        <KpiCard
          title="Horas registadas"
          value={`${totalHoras.toFixed(1)}h`}
          description="Total validado no período atual"
          icon={<Gauge className="h-5 w-5" />}
          tone="gold"
        />
        <KpiCard
          title="Arquivo Central"
          value={totalArquivos}
          description="Documentos e registos disponíveis"
          icon={<FolderOpen className="h-5 w-5" />}
          tone="cyan"
        />
      </section>

      <section className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
        <div className="rounded-[2.4rem] border border-white/10 bg-[#050b09]/90 p-6 shadow-[0_28px_110px_rgba(0,0,0,0.34)]">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.26em] text-primary">
                Central Operacional
              </p>
              <h2 className="mt-2 text-3xl font-black text-white">
                Módulos em destaque
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Acesso rápido às áreas principais da plataforma.
              </p>
            </div>

            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-primary"
            >
              Ver dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <FeaturePortal
              href="/comando"
              icon={<Command className="h-5 w-5" />}
              title="Centro de Comando"
              description="Visão estratégica, alertas e decisão operacional."
              tone="green"
            />
            <FeaturePortal
              href="/guardas"
              icon={<Shield className="h-5 w-5" />}
              title="Efetivo"
              description="Militares, patentes, unidades e perfis."
              tone="blue"
            />
            <FeaturePortal
              href="/patrulhas"
              icon={<MapPin className="h-5 w-5" />}
              title="Patrulhas"
              description="Registos, acompanhamento e atividade no terreno."
              tone="cyan"
            />
            <FeaturePortal
              href="/avisos"
              icon={<Megaphone className="h-5 w-5" />}
              title="Avisos"
              description="Processos disciplinares e comunicações prioritárias."
              tone="red"
            />
            <FeaturePortal
              href="/honra"
              icon={<Trophy className="h-5 w-5" />}
              title="Quadro de Honra"
              description="Mérito, medalhas e destaque institucional."
              tone="gold"
            />
            <FeaturePortal
              href="/arquivos"
              icon={<FileText className="h-5 w-5" />}
              title="Arquivo Central"
              description="Documentos, transcripts e registos internos."
              tone="blue"
            />
          </div>
        </div>

        <div className="space-y-6">
          <section className="overflow-hidden rounded-[2.4rem] border border-red-400/20 bg-[linear-gradient(145deg,rgba(45,5,8,0.94),rgba(7,10,8,0.96))] p-6 shadow-[0_28px_110px_rgba(0,0,0,0.34)]">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-400/25 bg-red-500/15 text-red-300">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-red-300">
                  Estado de alerta
                </p>
                <h3 className="mt-1 text-xl font-black text-white">
                  Central sem incidentes críticos
                </h3>
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-white/45">
              Todos os serviços principais encontram-se operacionais.
              Consulta os Alertas para acompanhar ocorrências e avisos
              prioritários.
            </p>

            <Link
              href="/alertas"
              className="mt-5 inline-flex items-center gap-2 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-[9px] font-black uppercase tracking-[0.14em] text-red-300"
            >
              Abrir alertas
              <ArrowRight className="h-4 w-4" />
            </Link>
          </section>

          <section className="rounded-[2.4rem] border border-yellow-400/20 bg-[linear-gradient(145deg,rgba(40,30,5,0.94),rgba(7,10,8,0.96))] p-6 shadow-[0_28px_110px_rgba(0,0,0,0.34)]">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-yellow-400/25 bg-yellow-500/15 text-yellow-300">
                <Star className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-yellow-300">
                  Destaque institucional
                </p>
                <h3 className="mt-1 text-xl font-black text-white">
                  Mérito e reconhecimento
                </h3>
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-white/45">
              Consulta o Quadro de Honra e acompanha medalhas,
              distinções e progressão dos militares.
            </p>

            <Link
              href="/honra"
              className="mt-5 inline-flex items-center gap-2 rounded-xl border border-yellow-400/20 bg-yellow-500/10 px-4 py-3 text-[9px] font-black uppercase tracking-[0.14em] text-yellow-300"
            >
              Ver distinções
              <ArrowRight className="h-4 w-4" />
            </Link>
          </section>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <NewsFeature
          href="/noticias"
          eyebrow="Atualizações"
          title="Notícias da Central"
          description="Publicações, novidades e informação institucional em destaque."
          image="/Store/backgrounds/patrulha.png"
          icon={<Newspaper className="h-5 w-5" />}
          tone="green"
        />

        <NewsFeature
          href="/avisos"
          eyebrow="Comunicação prioritária"
          title="Avisos e comunicados"
          description="Ordens de serviço, comunicações urgentes e informação relevante."
          image="/Store/backgrounds/CD.png"
          icon={<BellRing className="h-5 w-5" />}
          tone="gold"
        />
      </section>
    </motion.div>
  );
}

function HomePreferencesPanel({
  preferences,
  setPreferences,
}: {
  preferences: HomePreferences;
  setPreferences: (
    value: HomePreferences,
  ) => void;
}) {
  const options = [
    {
      key: "showPersonalSummary",
      label: "Resumo pessoal",
      description: "Horas, patrulhas, estado e notificações.",
    },
    {
      key: "showFavorites",
      label: "Favoritos",
      description: "Atalhos sincronizados com a sidebar.",
    },
    {
      key: "showNotifications",
      label: "Notificações",
      description: "Pendências operacionais e aprovações.",
    },
    {
      key: "showActivePatrols",
      label: "Continuação rápida",
      description: "Patrulhas e atividade em curso.",
    },
  ] as const;

  return (
    <div className="mt-5 rounded-[1.6rem] border border-primary/15 bg-primary/[0.035] p-4">
      <div className="mb-4 flex items-center gap-2">
        <Settings2 className="h-4 w-4 text-primary" />
        <p className="text-[9px] font-black uppercase tracking-[0.16em] text-primary">
          Personalizar início
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {options.map((option) => {
          const enabled = preferences[option.key];

          return (
            <button
              key={option.key}
              type="button"
              onClick={() =>
                setPreferences({
                  ...preferences,
                  [option.key]: !enabled,
                })
              }
              className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition ${
                enabled
                  ? "border-primary/20 bg-primary/10"
                  : "border-white/10 bg-black/20"
              }`}
            >
              <span
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${
                  enabled
                    ? "border-primary/25 bg-primary/10 text-primary"
                    : "border-white/10 bg-white/[0.03] text-white/25"
                }`}
              >
                {enabled ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOffIcon />
                )}
              </span>

              <span>
                <span className="block text-sm font-black text-white">
                  {option.label}
                </span>
                <span className="mt-1 block text-xs leading-5 text-white/30">
                  {option.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EyeOffIcon() {
  return (
    <span className="relative h-4 w-4">
      <Eye className="h-4 w-4" />
      <span className="absolute left-1/2 top-1/2 h-px w-5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-current" />
    </span>
  );
}

function PersonalMetric({
  href,
  label,
  value,
  icon,
}: {
  href: string;
  label: string;
  value: string | number;
  icon: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:-translate-y-0.5 hover:border-primary/20"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
          {icon}
        </span>
        <ArrowRight className="h-4 w-4 text-white/15 transition group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>

      <p className="mt-4 text-xl font-black text-white">
        {value}
      </p>
      <p className="mt-1 text-[8px] font-black uppercase tracking-[0.12em] text-white/30">
        {label}
      </p>
    </Link>
  );
}

function HeroAction({
  href,
  label,
  icon,
  primary = false,
}: {
  href: string;
  label: string;
  icon: ReactNode;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex h-12 items-center gap-3 rounded-2xl px-5 text-[10px] font-black uppercase tracking-[0.16em] transition hover:-translate-y-0.5 ${
        primary
          ? "bg-primary text-primary-foreground shadow-[0_0_35px_rgba(16,185,129,0.28)] hover:bg-primary/90"
          : "border border-white/15 bg-black/25 text-white/75 backdrop-blur-xl hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
      }`}
    >
      {icon}
      {label}
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}

function HeroMetric({
  href,
  label,
  value,
  icon,
}: {
  href: string;
  label: string;
  value: string | number;
  icon: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-white/12 bg-black/30 p-4 backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-primary/25 hover:bg-primary/[0.06]"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
          {icon}
        </span>
        <span className="text-2xl font-black text-white">
          {value}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-[9px] font-black uppercase tracking-[0.17em] text-white/40">
          {label}
        </p>
        <ArrowRight className="h-3.5 w-3.5 text-white/15 transition group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>
    </Link>
  );
}

function SlideEyebrow({
  tone,
  icon,
  children,
}: {
  tone: HeroSlide["tone"];
  icon: ReactNode;
  children: ReactNode;
}) {
  const styles = {
    green:
      "border-emerald-400/25 bg-emerald-500/10 text-emerald-300",
    red: "border-red-400/25 bg-red-500/10 text-red-300",
    gold: "border-yellow-400/25 bg-yellow-500/10 text-yellow-300",
    blue: "border-blue-400/25 bg-blue-500/10 text-blue-300",
  };

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[9px] font-black uppercase tracking-[0.2em] backdrop-blur-xl ${styles[tone]}`}
    >
      {icon}
      {children}
    </div>
  );
}

function KpiCard({
  title,
  value,
  description,
  icon,
  tone,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: ReactNode;
  tone: Tone;
}) {
  const styles = {
    green:
      "border-emerald-400/20 bg-emerald-500/10 text-emerald-300",
    red: "border-red-400/20 bg-red-500/10 text-red-300",
    gold: "border-yellow-400/20 bg-yellow-500/10 text-yellow-300",
    blue: "border-blue-400/20 bg-blue-500/10 text-blue-300",
    cyan: "border-cyan-400/20 bg-cyan-500/10 text-cyan-300",
  };

  return (
    <motion.article
      whileHover={{ y: -4 }}
      className="rounded-[2rem] border border-white/10 bg-[#050b09]/88 p-5 shadow-[0_20px_70px_rgba(0,0,0,0.28)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">
            {title}
          </p>
          <p className="mt-3 text-4xl font-black text-white">
            {value}
          </p>
          <p className="mt-2 text-xs leading-5 text-white/30">
            {description}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${styles[tone]}`}
        >
          {icon}
        </div>
      </div>
    </motion.article>
  );
}

function FeaturePortal({
  href,
  icon,
  title,
  description,
  tone,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
  tone: Tone;
}) {
  const styles = {
    green:
      "border-emerald-400/20 bg-emerald-500/10 text-emerald-300",
    red: "border-red-400/20 bg-red-500/10 text-red-300",
    gold: "border-yellow-400/20 bg-yellow-500/10 text-yellow-300",
    blue: "border-blue-400/20 bg-blue-500/10 text-blue-300",
    cyan: "border-cyan-400/20 bg-cyan-500/10 text-cyan-300",
  };

  return (
    <Link
      href={href}
      className="group rounded-[1.7rem] border border-white/[0.08] bg-white/[0.025] p-5 transition hover:-translate-y-1 hover:border-white/15 hover:bg-white/[0.04]"
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${styles[tone]}`}
        >
          {icon}
        </div>

        <ArrowRight className="h-4 w-4 text-white/20 transition group-hover:translate-x-1 group-hover:text-primary" />
      </div>

      <h3 className="mt-5 text-xl font-black text-white">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-6 text-white/35">
        {description}
      </p>
    </Link>
  );
}

function NewsFeature({
  href,
  eyebrow,
  title,
  description,
  image,
  icon,
  tone,
}: {
  href: string;
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  icon: ReactNode;
  tone: "green" | "gold";
}) {
  return (
    <Link
      href={href}
      className="group relative min-h-[320px] overflow-hidden rounded-[2.4rem] border border-white/10"
    >
      <img
        src={image}
        alt={title}
        className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.92),rgba(0,0,0,0.55),rgba(0,0,0,0.25))]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.84))]" />

      <div className="relative flex min-h-[320px] flex-col justify-end p-6 md:p-8">
        <div
          className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border ${
            tone === "green"
              ? "border-emerald-400/25 bg-emerald-500/15 text-emerald-300"
              : "border-yellow-400/25 bg-yellow-500/15 text-yellow-300"
          }`}
        >
          {icon}
        </div>

        <p className="text-[9px] font-black uppercase tracking-[0.22em] text-white/40">
          {eyebrow}
        </p>
        <h3 className="mt-2 text-3xl font-black text-white">
          {title}
        </h3>
        <p className="mt-3 max-w-xl text-sm leading-6 text-white/50">
          {description}
        </p>

        <div className="mt-5 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-primary">
          Consultar
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
        </div>
      </div>
    </Link>
  );
}
