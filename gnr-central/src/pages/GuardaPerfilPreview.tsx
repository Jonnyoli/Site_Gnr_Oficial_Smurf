import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useRoute,
} from "wouter";

import {
  motion,
} from "framer-motion";

import {
  Activity,
  ArrowLeft,
  Award,
  BadgeCheck,
  CalendarDays,
  ChevronRight,
  Clock3,
  Crown,
  FileText,
  Gauge,
  History,
  Medal,
  Radio,
  Shield,
  ShieldAlert,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  UserRound,
  Users,
  Zap,
} from "lucide-react";

import {
  useData,
  type CarreiraEvent,
} from "../context/DataContext";

import {
  useAuth,
} from "../context/AuthContext";

import {
  Button,
} from "@/components/ui/button";

import ProfileThemeSelector from "../components/profile/ProfileThemeSelector";

type Guarda = {
  id: string;
  discordId?: string;
  nome?: string;
  numero?: string;
  avatar?: string | null;
  posto?: string;
  unidade?: string;
  estado?: string;
  isDiscordOnline?: boolean;
  isOnDuty?: boolean;
  horasTotal?: number;
  dataIngresso?: string;
  discordTags?: Array<{
    id: string;
    name: string;
    color?: string | null;
  }>;
};

type Hora = {
  id?: string;
  guardaId?: string;
  data?: string;
  dataRaw?: string;
  horaInicio?: string;
  horaFim?: string;
  horasRegistadas?: number;
  horasNormais?: number;
  horasNoturnas?: number;
  tipo?: string;
  descricao?: string;
};

type DisciplineSummary = {
  total: number;
  active: number;
  suspensions: number;
};

const API =
  import.meta.env.VITE_API_URL?.replace(
    /\/$/,
    "",
  ) || "";

function safeNumber(
  value: unknown,
) {
  const number =
    Number(value || 0);

  return Number.isFinite(
    number,
  )
    ? number
    : 0;
}

function guardId(
  guard?: Guarda,
) {
  return String(
    guard?.discordId ||
    guard?.id ||
    "",
  );
}

function initials(
  value?: string,
) {
  if (!value) {
    return "??";
  }

  return value
    .split(" ")
    .filter(Boolean)
    .map(
      (part) =>
        part[0],
    )
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatDate(
  value?: string,
) {
  if (!value) {
    return "Sem data";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return date.toLocaleDateString(
    "pt-PT",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  );
}

function formatHours(
  value: number,
) {
  return `${value.toFixed(1)}h`;
}

function getCareerLabel(
  event: CarreiraEvent,
) {
  const role =
    String(
      event.roleName ||
      "",
    )
      .replace(
        /^[^\wÀ-ÿ]+[\s|.-]*/g,
        "",
      )
      .trim();

  if (
    event.tipo ===
    "PROMOCAO"
  ) {
    return `Promoção para ${role}`;
  }

  if (
    event.tipo ===
    "DESPROMOCAO"
  ) {
    return `Despromoção para ${role}`;
  }

  if (
    event.tipo ===
    "ENTRADA_UNIDADE"
  ) {
    return `Ingressou em ${role}`;
  }

  if (
    event.tipo ===
    "SAIDA_UNIDADE"
  ) {
    return `Saiu de ${role}`;
  }

  if (
    event.tipo ===
    "MEDALHA"
  ) {
    return `Medalha atribuída: ${role}`;
  }

  return role ||
    "Atualização de carreira";
}

function getCareerIcon(
  type: string,
) {
  if (
    type === "PROMOCAO"
  ) {
    return TrendingUp;
  }

  if (
    type === "MEDALHA"
  ) {
    return Medal;
  }

  if (
    type ===
    "ENTRADA_UNIDADE"
  ) {
    return Users;
  }

  if (
    type ===
    "DESPROMOCAO"
  ) {
    return ShieldAlert;
  }

  return History;
}

function getRankProgress(
  rank?: string,
) {
  const normalized =
    String(
      rank || "",
    ).toLowerCase();

  const ladder = [
    "guarda provisório",
    "guarda",
    "guarda principal",
    "cabo",
    "cabo-chefe",
    "sargento",
    "sargento-chefe",
    "alferes",
    "tenente",
    "capitão",
    "major",
    "tenente-coronel",
    "coronel",
    "brigadeiro-general",
    "major-general",
    "tenente-general",
    "general",
  ];

  const index =
    ladder.findIndex(
      (item) =>
        normalized.includes(
          item,
        ),
    );

  if (index < 0) {
    return {
      current: rank ||
        "Operacional",
      next:
        "Progressão definida pelo Comando",
      percentage: 52,
    };
  }

  return {
    current:
      ladder[index],
    next:
      ladder[
        Math.min(
          index + 1,
          ladder.length - 1,
        )
      ],
    percentage:
      Math.min(
        96,
        22 +
          index *
            4.6,
      ),
  };
}

export default function GuardaPerfilPreview() {
  const [
    ,
    params,
  ] =
    useRoute(
      "/guardas/:id/preview",
    );

  const {
    user,
  } =
    useAuth();

  const {
    guardas,
    currentHoras,
    horas,
    carreira,
    isLoading,
    storeInventory,
  } =
    useData() as any;

  const guardaId =
    String(
      params?.id ||
      "",
    );

  const [discipline, setDiscipline] =
    useState<DisciplineSummary>({
      total: 0,
      active: 0,
      suspensions: 0,
    });

  const [activeSection, setActiveSection] =
    useState("overview");

  const guarda =
    useMemo(
      () =>
        (
          Array.isArray(
            guardas,
          )
            ? guardas
            : []
        ).find(
          (
            item: Guarda,
          ) =>
            guardId(item) ===
              guardaId ||
            String(
              item.id,
            ) ===
              guardaId,
        ) as
          | Guarda
          | undefined,
      [
        guardas,
        guardaId,
      ],
    );

  const discordId =
    guardId(
      guarda,
    );

  const ownProfile =
    Boolean(
      user?.id,
    ) &&
    String(
      user?.id,
    ) ===
      discordId;

  const periodHours =
    useMemo(
      () =>
        (
          Array.isArray(
            currentHoras,
          )
            ? currentHoras
            : []
        ).filter(
          (item: Hora) =>
            String(
              item.guardaId ||
              "",
            ) ===
            discordId,
        ),
      [
        currentHoras,
        discordId,
      ],
    );

  const allHours =
    useMemo(
      () =>
        (
          Array.isArray(
            horas,
          )
            ? horas
            : []
        ).filter(
          (item: Hora) =>
            String(
              item.guardaId ||
              "",
            ) ===
            discordId,
        ),
      [
        horas,
        discordId,
      ],
    );

  const career =
    useMemo(
      () =>
        (
          Array.isArray(
            carreira,
          )
            ? carreira
            : []
        )
          .filter(
            (
              item: CarreiraEvent,
            ) =>
              String(
                item.userId ||
                "",
              ) ===
              discordId,
          )
          .sort(
            (
              a: CarreiraEvent,
              b: CarreiraEvent,
            ) =>
              new Date(
                b.data,
              ).getTime() -
              new Date(
                a.data,
              ).getTime(),
          ),
      [
        carreira,
        discordId,
      ],
    );

  const metrics =
    useMemo(() => {
      const period =
        periodHours.reduce(
          (
            total: number,
            item: Hora,
          ) =>
            total +
            safeNumber(
              item.horasRegistadas,
            ),
          0,
        );

      const normal =
        periodHours.reduce(
          (
            total: number,
            item: Hora,
          ) =>
            total +
            safeNumber(
              item.horasNormais,
            ),
          0,
        );

      const night =
        periodHours.reduce(
          (
            total: number,
            item: Hora,
          ) =>
            total +
            safeNumber(
              item.horasNoturnas,
            ),
          0,
        );

      const historical =
        allHours.reduce(
          (
            total: number,
            item: Hora,
          ) =>
            total +
            safeNumber(
              item.horasRegistadas,
            ),
          0,
        );

      const promotions =
        career.filter(
          (
            item: CarreiraEvent,
          ) =>
            item.tipo ===
            "PROMOCAO",
        ).length;

      const medals =
        career.filter(
          (
            item: CarreiraEvent,
          ) =>
            item.tipo ===
            "MEDALHA",
        ).length;

      return {
        period,
        normal,
        night,
        historical,
        promotions,
        medals,
        services:
          periodHours.length,
      };
    }, [
      periodHours,
      allHours,
      career,
    ]);

  const recentHours =
    useMemo(
      () =>
        [
          ...periodHours,
        ]
          .sort(
            (
              a: Hora,
              b: Hora,
            ) =>
              new Date(
                b.dataRaw ||
                0,
              ).getTime() -
              new Date(
                a.dataRaw ||
                0,
              ).getTime(),
          )
          .slice(
            0,
            5,
          ),
      [
        periodHours,
      ],
    );

  const rankProgress =
    getRankProgress(
      guarda?.posto,
    );

  useEffect(() => {
    if (!discordId) {
      return;
    }

    let cancelled =
      false;

    fetch(
      `${API}/api/disciplinary/guard/${encodeURIComponent(
        discordId,
      )}`,
      {
        credentials:
          "include",
        headers: {
          Accept:
            "application/json",
        },
      },
    )
      .then(
        async (
          response,
        ) => {
          if (
            !response.ok
          ) {
            throw new Error(
              String(
                response.status,
              ),
            );
          }

          return response.json();
        },
      )
      .then(
        (
          payload,
        ) => {
          if (
            cancelled
          ) {
            return;
          }

          const items =
            Array.isArray(
              payload,
            )
              ? payload
              : Array.isArray(
                    payload?.items,
                  )
                ? payload.items
                : [];

          setDiscipline({
            total:
              items.length,
            active:
              items.filter(
                (
                  item: any,
                ) =>
                  item.status ===
                  "ACTIVE",
              ).length,
            suspensions:
              items.filter(
                (
                  item: any,
                ) =>
                  item.type ===
                  "SUSPENSION",
              ).length,
          });
        },
      )
      .catch(
        () => {
          if (
            !cancelled
          ) {
            setDiscipline({
              total: 0,
              active: 0,
              suspensions: 0,
            });
          }
        },
      );

    return () => {
      cancelled =
        true;
    };
  }, [
    discordId,
  ]);

  useEffect(() => {
    const ids = [
      "overview",
      "performance",
      "career",
      "activity",
    ];

    const observers =
      ids.map(
        (id) => {
          const element =
            document.getElementById(
              `profile-v2-${id}`,
            );

          if (!element) {
            return null;
          }

          const observer =
            new IntersectionObserver(
              (
                entries,
              ) => {
                const visible =
                  entries.find(
                    (
                      entry,
                    ) =>
                      entry.isIntersecting,
                  );

                if (
                  visible
                ) {
                  setActiveSection(
                    id,
                  );
                }
              },
              {
                rootMargin:
                  "-28% 0px -58% 0px",
                threshold:
                  0.01,
              },
            );

          observer.observe(
            element,
          );

          return observer;
        },
      );

    return () => {
      observers.forEach(
        (
          observer,
        ) =>
          observer?.disconnect(),
      );
    };
  }, [
    isLoading,
    guarda,
  ]);

  if (
    isLoading
  ) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Activity className="mx-auto h-9 w-9 animate-pulse text-primary" />
          <p className="mt-4 text-sm font-black uppercase tracking-[.16em] text-white/45">
            A preparar dossier operacional
          </p>
        </div>
      </div>
    );
  }

  if (!guarda) {
    return (
      <div className="rounded-3xl border border-red-400/20 bg-red-500/10 p-8">
        <p className="font-black text-red-200">
          Guarda não encontrado.
        </p>
      </div>
    );
  }

  const operational =
    guarda.isOnDuty ||
    guarda.estado ===
      "Em serviço";

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 16,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      className="space-y-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          asChild
          variant="outline"
          className="rounded-2xl border-white/10"
        >
          <Link
            href={`/guardas/${discordId}`}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Perfil atual
          </Link>
        </Button>

        <div className="rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-[10px] font-black uppercase tracking-[.17em] text-primary">
          Pré-visualização V2
        </div>
      </div>

      <nav className="sticky top-[74px] z-40 overflow-x-auto rounded-2xl border border-white/10 bg-black/55 p-2 backdrop-blur-xl">
        <div className="flex min-w-max gap-2">
          {[
            [
              "overview",
              "Resumo",
            ],
            [
              "performance",
              "Desempenho",
            ],
            [
              "career",
              "Carreira",
            ],
            [
              "activity",
              "Atividade",
            ],
          ].map(
            ([
              id,
              label,
            ]) => (
              <button
                key={id}
                type="button"
                onClick={() =>
                  document
                    .getElementById(
                      `profile-v2-${id}`,
                    )
                    ?.scrollIntoView({
                      behavior:
                        "smooth",
                      block:
                        "start",
                    })
                }
                className={`rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-[.13em] transition ${
                  activeSection ===
                  id
                    ? "bg-primary text-primary-foreground"
                    : "text-white/45 hover:bg-white/5 hover:text-white"
                }`}
              >
                {label}
              </button>
            ),
          )}
        </div>
      </nav>

      <section
        id="profile-v2-overview"
        className="scroll-mt-36 relative overflow-hidden rounded-[2.4rem] border border-primary/20 bg-black/35 p-6 shadow-[0_35px_150px_rgba(0,0,0,.45)] md:p-8"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,hsl(var(--primary)/.20),transparent_34%),radial-gradient(circle_at_85%_80%,rgba(250,204,21,.08),transparent_30%)]" />
        <div className="absolute inset-0 opacity-20 [background-size:38px_38px] [background-image:linear-gradient(to_right,rgba(255,255,255,.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.04)_1px,transparent_1px)]" />

        <div className="relative grid gap-8 xl:grid-cols-[1.15fr_.85fr]">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <div className="relative shrink-0">
              <div className="absolute -inset-4 rounded-full bg-primary/20 blur-2xl" />

              {guarda.avatar ? (
                <img
                  src={
                    guarda.avatar
                  }
                  alt={
                    guarda.nome ||
                    "Guarda"
                  }
                  className="relative h-36 w-36 rounded-[2rem] border border-primary/35 object-cover shadow-[0_0_60px_hsl(var(--primary)/.25)]"
                />
              ) : (
                <div className="relative flex h-36 w-36 items-center justify-center rounded-[2rem] border border-primary/35 bg-primary/10 text-4xl font-black text-primary">
                  {initials(
                    guarda.nome,
                  )}
                </div>
              )}

              <span
                className={`absolute -bottom-2 -right-2 rounded-xl border px-3 py-1 text-[9px] font-black uppercase tracking-[.14em] ${
                  operational
                    ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-300"
                    : "border-amber-400/30 bg-amber-500/15 text-amber-300"
                }`}
              >
                {operational
                  ? "Em serviço"
                  : guarda.estado ||
                    "Fora de serviço"}
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[9px] font-black uppercase tracking-[.15em] text-primary">
                  Dossier operacional
                </span>

                {guarda.isDiscordOnline && (
                  <span className="rounded-full border border-blue-400/25 bg-blue-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-[.15em] text-blue-300">
                    Discord online
                  </span>
                )}
              </div>

              <h1 className="mt-4 text-4xl font-black tracking-tight text-white md:text-6xl">
                {guarda.numero &&
                guarda.numero !==
                  "N/A"
                  ? `${guarda.numero} | `
                  : ""}
                {guarda.nome}
              </h1>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-2 text-xs font-black text-primary">
                  <Crown className="h-4 w-4" />
                  {guarda.posto ||
                    "Operacional"}
                </span>

                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.035] px-4 py-2 text-xs font-bold text-white/55">
                  <Radio className="h-4 w-4" />
                  {guarda.unidade ||
                    "Sem unidade"}
                </span>

                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.035] px-4 py-2 text-xs font-bold text-white/55">
                  <CalendarDays className="h-4 w-4" />
                  Ingresso{" "}
                  {formatDate(
                    guarda.dataIngresso,
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <HeroMetric
              label="Horas totais"
              value={formatHours(
                metrics.historical,
              )}
              icon={
                <Clock3 className="h-5 w-5" />
              }
            />

            <HeroMetric
              label="Serviços"
              value={
                metrics.services
              }
              icon={
                <Activity className="h-5 w-5" />
              }
            />

            <HeroMetric
              label="Promoções"
              value={
                metrics.promotions
              }
              icon={
                <TrendingUp className="h-5 w-5" />
              }
            />

            <HeroMetric
              label="Medalhas"
              value={
                metrics.medals
              }
              icon={
                <Medal className="h-5 w-5" />
              }
            />
          </div>
        </div>

        <div className="relative mt-8 grid gap-4 lg:grid-cols-3">
          <StatusPanel
            title="Estado operacional"
            icon={
              operational
                ? Zap
                : Radio
            }
            tone={
              operational
                ? "green"
                : "amber"
            }
          >
            <p className="text-2xl font-black text-white">
              {operational
                ? "Ativo em serviço"
                : "Disponível para mobilização"}
            </p>

            <p className="mt-2 text-sm leading-6 text-white/45">
              {operational
                ? "O militar encontra-se com ponto operacional ativo."
                : "Sem serviço ativo registado neste momento."}
            </p>
          </StatusPanel>

          <StatusPanel
            title="Situação disciplinar"
            icon={
              discipline.active >
              0
                ? ShieldAlert
                : Shield
            }
            tone={
              discipline.active >
              0
                ? "red"
                : "green"
            }
          >
            <p className="text-2xl font-black text-white">
              {discipline.active >
              0
                ? `${discipline.active} processo(s) ativo(s)`
                : "Situação regular"}
            </p>

            <p className="mt-2 text-sm leading-6 text-white/45">
              {discipline.total} registos no histórico ·{" "}
              {discipline.suspensions} suspensões.
            </p>
          </StatusPanel>

          <StatusPanel
            title="Presença institucional"
            icon={
              BadgeCheck
            }
            tone="blue"
          >
            <p className="text-2xl font-black text-white">
              {guarda.discordTags
                ?.length ||
                0}{" "}
              cargos Discord
            </p>

            <p className="mt-2 text-sm leading-6 text-white/45">
              Posto, unidade e especializações sincronizadas.
            </p>
          </StatusPanel>
        </div>
      </section>

      <section
        id="profile-v2-performance"
        className="scroll-mt-36 grid gap-6 xl:grid-cols-[1fr_.9fr]"
      >
        <article className="rounded-[2rem] border border-white/10 bg-black/25 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.17em] text-primary">
                Desempenho operacional
              </p>

              <h2 className="mt-2 text-2xl font-black text-white">
                Distribuição de horas
              </h2>
            </div>

            <Gauge className="h-7 w-7 text-primary" />
          </div>

          <div className="mt-7 space-y-5">
            <ProgressRow
              label="Horas normais"
              value={
                metrics.normal
              }
              total={
                Math.max(
                  metrics.period,
                  1,
                )
              }
              display={formatHours(
                metrics.normal,
              )}
            />

            <ProgressRow
              label="Horas noturnas"
              value={
                metrics.night
              }
              total={
                Math.max(
                  metrics.period,
                  1,
                )
              }
              display={formatHours(
                metrics.night,
              )}
            />

            <ProgressRow
              label="Período atual"
              value={
                metrics.period
              }
              total={
                Math.max(
                  metrics.historical,
                  metrics.period,
                  1,
                )
              }
              display={formatHours(
                metrics.period,
              )}
            />
          </div>

          <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-4">
            <SmallMetric
              label="Período"
              value={formatHours(
                metrics.period,
              )}
            />

            <SmallMetric
              label="Normais"
              value={formatHours(
                metrics.normal,
              )}
            />

            <SmallMetric
              label="Noturnas"
              value={formatHours(
                metrics.night,
              )}
            />

            <SmallMetric
              label="Registos"
              value={
                metrics.services
              }
            />
          </div>
        </article>

        <article className="rounded-[2rem] border border-white/10 bg-black/25 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.17em] text-primary">
                Progressão
              </p>

              <h2 className="mt-2 text-2xl font-black text-white">
                Percurso hierárquico
              </h2>
            </div>

            <Target className="h-7 w-7 text-primary" />
          </div>

          <div className="mt-7 rounded-3xl border border-primary/20 bg-primary/[.07] p-5">
            <p className="text-xs font-black uppercase tracking-[.14em] text-primary">
              Posto atual
            </p>

            <p className="mt-2 text-3xl font-black capitalize text-white">
              {rankProgress.current}
            </p>

            <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/5">
              <motion.div
                initial={{
                  width: 0,
                }}
                animate={{
                  width: `${rankProgress.percentage}%`,
                }}
                transition={{
                  duration: 0.9,
                }}
                className="h-full rounded-full bg-primary shadow-[0_0_20px_hsl(var(--primary)/.5)]"
              />
            </div>

            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-white/35">
                Evolução estimada
              </span>

              <span className="font-black text-primary">
                {Math.round(
                  rankProgress.percentage,
                )}
                %
              </span>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.025] p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ChevronRight className="h-5 w-5" />
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[.14em] text-white/30">
                Próxima referência
              </p>

              <p className="mt-1 font-black capitalize text-white">
                {rankProgress.next}
              </p>
            </div>
          </div>

          <p className="mt-4 text-xs leading-5 text-white/30">
            A progressão real continua dependente da avaliação do Comando e dos órgãos competentes.
          </p>
        </article>
      </section>

      <section
        id="profile-v2-career"
        className="scroll-mt-36 grid gap-6 xl:grid-cols-[1.15fr_.85fr]"
      >
        <article className="rounded-[2rem] border border-white/10 bg-black/25 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
              <History className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-xl font-black text-white">
                Últimos marcos da carreira
              </h2>

              <p className="text-sm text-white/35">
                Promoções, unidades e distinções.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {career
              .slice(
                0,
                6,
              )
              .map(
                (
                  event: CarreiraEvent,
                  index: number,
                ) => {
                  const Icon =
                    getCareerIcon(
                      event.tipo,
                    );

                  return (
                    <motion.div
                      key={`${event.tipo}-${event.data}-${index}`}
                      initial={{
                        opacity: 0,
                        x: -10,
                      }}
                      animate={{
                        opacity: 1,
                        x: 0,
                      }}
                      transition={{
                        delay:
                          index *
                          0.04,
                      }}
                      className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[.025] p-4"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate font-black text-white">
                          {getCareerLabel(
                            event,
                          )}
                        </p>

                        <p className="mt-1 text-xs text-white/35">
                          {formatDate(
                            event.data,
                          )}
                        </p>
                      </div>
                    </motion.div>
                  );
                },
              )}

            {career.length ===
              0 && (
              <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-white/35">
                Sem eventos de carreira registados.
              </div>
            )}
          </div>
        </article>

        <article className="rounded-[2rem] border border-white/10 bg-black/25 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
              <Award className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-xl font-black text-white">
                Identidade institucional
              </h2>

              <p className="text-sm text-white/35">
                Cargos e especializações atuais.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {(guarda.discordTags ||
              [])
              .slice(
                0,
                18,
              )
              .map(
                (
                  tag,
                ) => (
                  <span
                    key={
                      tag.id
                    }
                    className="rounded-full border border-white/10 bg-white/[.035] px-3 py-2 text-[10px] font-black text-white/60"
                  >
                    {
                      tag.name
                    }
                  </span>
                ),
              )}

            {!guarda.discordTags
              ?.length && (
              <p className="text-sm text-white/35">
                Sem cargos sincronizados.
              </p>
            )}
          </div>

          <div className="mt-7 grid grid-cols-2 gap-3">
            <SmallMetric
              label="Eventos"
              value={
                career.length
              }
            />

            <SmallMetric
              label="Medalhas"
              value={
                metrics.medals
              }
            />

            <SmallMetric
              label="Promoções"
              value={
                metrics.promotions
              }
            />

            <SmallMetric
              label="Cargos"
              value={
                guarda.discordTags
                  ?.length ||
                0
              }
            />
          </div>
        </article>
      </section>

      <section
        id="profile-v2-activity"
        className="scroll-mt-36 grid gap-6 xl:grid-cols-[1fr_.9fr]"
      >
        <article className="rounded-[2rem] border border-white/10 bg-black/25 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
              <Clock3 className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-xl font-black text-white">
                Serviços recentes
              </h2>

              <p className="text-sm text-white/35">
                Últimos registos no período selecionado.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {recentHours.map(
              (
                item,
                index,
              ) => (
                <div
                  key={
                    item.id ||
                    index
                  }
                  className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[.025] p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-black text-white">
                      {item.data ||
                        formatDate(
                          item.dataRaw,
                        )}
                    </p>

                    <p className="mt-1 text-xs text-white/35">
                      {item.horaInicio ||
                        "—"}{" "}
                      às{" "}
                      {item.horaFim ||
                        "—"}{" "}
                      ·{" "}
                      {item.tipo ||
                        "Serviço"}
                    </p>
                  </div>

                  <p className="text-xl font-black text-primary">
                    {formatHours(
                      safeNumber(
                        item.horasRegistadas,
                      ),
                    )}
                  </p>
                </div>
              ),
            )}

            {recentHours.length ===
              0 && (
              <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-white/35">
                Sem serviços no período atual.
              </div>
            )}
          </div>
        </article>

        <article className="rounded-[2rem] border border-white/10 bg-black/25 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-xl font-black text-white">
                Ações rápidas
              </h2>

              <p className="text-sm text-white/35">
                Atalhos para o dossier atual.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-3">
            <QuickAction
              icon={
                UserRound
              }
              title="Abrir perfil atual"
              description="Voltar à versão completa em produção."
              href={`/guardas/${discordId}`}
            />

            <QuickAction
              icon={
                ShieldAlert
              }
              title="Histórico disciplinar"
              description={`${discipline.total} processos registados.`}
              href={`/guardas/${discordId}#perfil-disciplina`}
            />

            <QuickAction
              icon={
                History
              }
              title="Carreira completa"
              description={`${career.length} eventos disponíveis.`}
              href={`/guardas/${discordId}#perfil-historico`}
            />
          </div>
        </article>
      </section>

      {ownProfile && (
        <ProfileThemeSelector />
      )}

      <section className="rounded-[2rem] border border-primary/20 bg-primary/[.07] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="h-5 w-5" />

              <p className="text-[10px] font-black uppercase tracking-[.17em]">
                Conceito V2
              </p>
            </div>

            <h2 className="mt-2 text-2xl font-black text-white">
              Um dossier mais visual, rápido e operacional
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/45">
              Esta pré-visualização usa os dados já existentes e não substitui o perfil atual.
            </p>
          </div>

          <span className="rounded-full border border-primary/25 bg-primary/10 px-4 py-2 text-[10px] font-black uppercase tracking-[.15em] text-primary">
            Seguro para testar
          </span>
        </div>
      </section>
    </motion.div>
  );
}

function HeroMetric({
  label,
  value,
  icon,
}: {
  label: string;
  value:
    | string
    | number;
  icon:
    React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4 backdrop-blur-md">
      <div className="text-primary">
        {icon}
      </div>

      <p className="mt-4 text-3xl font-black text-white">
        {value}
      </p>

      <p className="mt-1 text-[9px] font-black uppercase tracking-[.14em] text-white/30">
        {label}
      </p>
    </div>
  );
}

function StatusPanel({
  title,
  icon: Icon,
  tone,
  children,
}: {
  title: string;
  icon:
    React.ComponentType<{
      className?: string;
    }>;
  tone:
    | "green"
    | "amber"
    | "red"
    | "blue";
  children:
    React.ReactNode;
}) {
  const tones = {
    green:
      "border-emerald-400/20 bg-emerald-500/[.07] text-emerald-300",
    amber:
      "border-amber-400/20 bg-amber-500/[.07] text-amber-300",
    red:
      "border-red-400/20 bg-red-500/[.07] text-red-300",
    blue:
      "border-blue-400/20 bg-blue-500/[.07] text-blue-300",
  };

  return (
    <article
      className={`rounded-2xl border p-5 ${tones[tone]}`}
    >
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.15em]">
        <Icon className="h-4 w-4" />
        {title}
      </div>

      <div className="mt-4">
        {children}
      </div>
    </article>
  );
}

function ProgressRow({
  label,
  value,
  total,
  display,
}: {
  label: string;
  value: number;
  total: number;
  display: string;
}) {
  const percent =
    Math.max(
      0,
      Math.min(
        100,
        value /
          Math.max(
            total,
            1,
          ) *
          100,
      ),
    );

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-bold text-white/55">
          {label}
        </p>

        <p className="font-black text-white">
          {display}
        </p>
      </div>

      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
        <motion.div
          initial={{
            width: 0,
          }}
          animate={{
            width: `${percent}%`,
          }}
          transition={{
            duration: 0.8,
          }}
          className="h-full rounded-full bg-primary shadow-[0_0_15px_hsl(var(--primary)/.45)]"
        />
      </div>
    </div>
  );
}

function SmallMetric({
  label,
  value,
}: {
  label: string;
  value:
    | string
    | number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
      <p className="text-[9px] font-black uppercase tracking-[.14em] text-white/30">
        {label}
      </p>

      <p className="mt-2 text-xl font-black text-white">
        {value}
      </p>
    </div>
  );
}

function QuickAction({
  icon: Icon,
  title,
  description,
  href,
}: {
  icon:
    React.ComponentType<{
      className?: string;
    }>;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[.025] p-4 transition hover:border-primary/30 hover:bg-primary/[.07]"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-black text-white">
          {title}
        </p>

        <p className="mt-1 text-xs text-white/35">
          {description}
        </p>
      </div>

      <ChevronRight className="h-5 w-5 text-white/20 transition group-hover:translate-x-1 group-hover:text-primary" />
    </Link>
  );
}
