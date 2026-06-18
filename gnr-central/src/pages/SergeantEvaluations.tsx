import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Activity,
  AlertTriangle,
  Award,
  BadgeCheck,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  ExternalLink,
  FileText,
  Gauge,
  History,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  UserRound,
  X,
  XCircle,
} from "lucide-react";

import {
  useData,
} from "../context/DataContext";


const GNR_ROLE_ID = "1147878941974077478";

function hasCurrentGnrRole(item: any) {
  return [
    item?.roles,
    item?.discordRoles,
    item?.savedTags,
    item?.roleIds,
  ].some(
    (roles) =>
      Array.isArray(roles) &&
      roles.map(String).includes(GNR_ROLE_ID),
  );
}

type EvaluationType =
  | "STANDARD"
  | "ADVANCED_360";

type Status =
  | "PENDING"
  | "APPROVED"
  | "REJECTED";

type Tab =
  | "NEW"
  | "MINE"
  | "PENDING"
  | "APPROVED"
  | "REJECTED";

type ScoreValue = {
  value: number | null;
  notApplicable: boolean;
};

const STANDARD_SCORES = [
  ["radio", "Rádio"],
  ["conduct", "Conduta"],
  ["detention", "Detenções"],
  ["incident", "Incidente"],
] as const;

const ADVANCED_SCORES = [
  ["offensiveDriving", "Condução ofensiva"],
  ["shootingWeapons", "Tiro e armamento"],
  ["tacticalPositioning", "Tático/posição"],
  ["radioCommunications", "Rádio/comunicações"],
  ["postureConduct", "Postura e conduta"],
  ["leadershipInitiative", "Liderança/iniciativa"],
  ["stressManagement", "Gestão de stress"],
  ["argumentationLegislation", "Argumentação/legislação"],
] as const;

const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(
    /\/$/,
    "",
  ) || "";

async function request(
  path: string,
  options: RequestInit = {},
) {
  const response = await fetch(
    `${API_BASE_URL}${path}`,
    {
      credentials: "include",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(options.body
          ? {
              "Content-Type":
                "application/json",
            }
          : {}),
      },
      ...options,
    },
  );

  const raw = await response.text();
  let payload: any = null;

  if (raw.trim()) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    throw new Error(
      payload?.error ||
        payload?.message ||
        `O pedido falhou (${response.status}).`,
    );
  }

  return payload;
}

function emptyScores(
  fields: readonly string[],
) {
  return Object.fromEntries(
    fields.map((field) => [
      field,
      {
        value: 0,
        notApplicable: false,
      },
    ]),
  );
}

function userId(
  guard: any,
) {
  return String(
    guard?.discordId ||
      guard?.id ||
      guard?._id ||
      "",
  );
}

function userName(
  guard: any,
) {
  return (
    guard?.nome ||
    guard?.warName ||
    guard?.displayName ||
    guard?.username ||
    "Militar"
  );
}

function userRank(
  guard: any,
) {
  return (
    guard?.posto ||
    guard?.rank ||
    guard?.hierarchyGroupLabel ||
    "Guarda"
  );
}

function userUnit(
  guard: any,
) {
  return (
    guard?.unidade ||
    guard?.unit ||
    guard?.currentUnit ||
    "Patrulha"
  );
}

function userAvatar(
  guard: any,
) {
  return (
    guard?.avatar ||
    guard?.avatarUrl ||
    null
  );
}

function formatDate(
  value?: string,
) {
  if (!value) return "—";

  return new Date(
    value,
  ).toLocaleString(
    "pt-PT",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  );
}

function averageOfScores(
  values: Record<string, ScoreValue>,
  fields: readonly (readonly [string, string])[],
) {
  const valid = fields
    .map(([field]) => values[field])
    .filter(
      (item) =>
        item &&
        !item.notApplicable &&
        Number.isFinite(item.value),
    )
    .map((item) => Number(item.value));

  if (!valid.length) return null;

  return (
    valid.reduce(
      (total, value) =>
        total + value,
      0,
    ) / valid.length
  );
}

function statusLabel(
  status: Status,
) {
  if (status === "APPROVED") {
    return "Aprovada";
  }

  if (status === "REJECTED") {
    return "Reprovada";
  }

  return "Pendente";
}

export default function SergeantEvaluations() {
  const { guardas } =
    useData() as any;

  const [items, setItems] =
    useState<any[]>([]);

  const [stats, setStats] =
    useState<any>({});

  const [permissions, setPermissions] =
    useState<any>({
      canCreate: false,
      canApprove: false,
    });

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [lastSync, setLastSync] =
    useState<Date | null>(null);

  const [activeTab, setActiveTab] =
    useState<Tab>("NEW");

  const [type, setType] =
    useState<EvaluationType>(
      "ADVANCED_360",
    );

  const [search, setSearch] =
    useState("");

  const [historySearch, setHistorySearch] =
    useState("");

  const [selectedId, setSelectedId] =
    useState("");

  const [theme, setTheme] =
    useState("");

  const [expandedId, setExpandedId] =
    useState<string | null>(null);

  const [standard, setStandard] =
    useState<any>({
      ...emptyScores(
        STANDARD_SCORES.map(
          ([field]) => field,
        ),
      ),
      detentionsSummary: "",
      incidentSummary: "",
      observations: "",
      finalOpinion: "",
    });

  const [advanced, setAdvanced] =
    useState<any>({
      ...emptyScores(
        ADVANCED_SCORES.map(
          ([field]) => field,
        ),
      ),
      patrolSummary: "",
      behavioralAnalysis: "",
      strengths: "",
      improvements: "",
      promotionOpinion: "",
      occurrences: "",
      approaches: "",
    });

  const [rejecting, setRejecting] =
    useState<any>(null);

  const [rejectReason, setRejectReason] =
    useState("");

  async function load(
    silent = false,
  ) {
    if (!silent) {
      setLoading(true);
    }

    setError("");

    try {
      const [
        listPayload,
        statsPayload,
      ] = await Promise.all([
        request(
          "/api/sergeant-evaluations",
        ),
        request(
          "/api/sergeant-evaluations/stats",
        ),
      ]);

      setItems(
        listPayload?.items || [],
      );

      setPermissions(
        listPayload?.permissions ||
          {},
      );

      setStats(
        statsPayload || {},
      );

      setLastSync(new Date());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Não foi possível carregar as avaliações.",
      );
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    void load();

    const interval =
      window.setInterval(() => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          void load(true);
        }
      }, 15_000);

    return () =>
      window.clearInterval(
        interval,
      );
  }, []);

  const guards =
    useMemo(() => {
      const term =
        search
          .trim()
          .toLowerCase();

      return (
        (guardas || []) as any[]
      )
        .filter(
          (guard) =>
            userId(guard) &&
            guard?.bot !== true &&
            hasCurrentGnrRole(guard),
        )
        .filter((guard) => {
          if (!term) return true;

          return [
            userName(guard),
            userRank(guard),
            userUnit(guard),
            userId(guard),
            guard?.numero,
            guard?.callsignNumber,
          ]
            .filter(Boolean)
            .some((value) =>
              String(value)
                .toLowerCase()
                .includes(term),
            );
        })
        .sort((a, b) =>
          userName(a).localeCompare(
            userName(b),
            "pt-PT",
          ),
        );
    }, [guardas, search]);

  const selected =
    guards.find(
      (guard) =>
        userId(guard) ===
        selectedId,
    );

  const counts = useMemo(
    () => ({
      mine: items.length,
      pending: items.filter(
        (item) =>
          item.status ===
          "PENDING",
      ).length,
      approved: items.filter(
        (item) =>
          item.status ===
          "APPROVED",
      ).length,
      rejected: items.filter(
        (item) =>
          item.status ===
          "REJECTED",
      ).length,
    }),
    [items],
  );

  const visibleItems =
    useMemo(() => {
      let next = items;

      if (
        activeTab ===
        "PENDING"
      ) {
        next = items.filter(
          (item) =>
            item.status ===
            "PENDING",
        );
      }

      if (
        activeTab ===
        "APPROVED"
      ) {
        next = items.filter(
          (item) =>
            item.status ===
            "APPROVED",
        );
      }

      if (
        activeTab ===
        "REJECTED"
      ) {
        next = items.filter(
          (item) =>
            item.status ===
            "REJECTED",
        );
      }

      const term =
        historySearch
          .trim()
          .toLowerCase();

      if (!term) return next;

      return next.filter(
        (item) =>
          [
            item.evaluatedName,
            item.evaluatedRank,
            item.evaluatorName,
            item.theme,
            item.source,
          ]
            .filter(Boolean)
            .some((value) =>
              String(value)
                .toLowerCase()
                .includes(term),
            ),
      );
    }, [
      items,
      activeTab,
      historySearch,
    ]);

  const liveAverage =
    useMemo(
      () =>
        averageOfScores(
          type === "STANDARD"
            ? standard
            : advanced,
          type === "STANDARD"
            ? STANDARD_SCORES
            : ADVANCED_SCORES,
        ),
      [
        type,
        standard,
        advanced,
      ],
    );

  const completion =
    useMemo(() => {
      const textFields =
        type === "STANDARD"
          ? [
              standard.detentionsSummary,
              standard.incidentSummary,
              standard.observations,
              standard.finalOpinion,
            ]
          : [
              advanced.patrolSummary,
              advanced.behavioralAnalysis,
              advanced.strengths,
              advanced.improvements,
              advanced.promotionOpinion,
              advanced.occurrences,
              advanced.approaches,
            ];

      const completedText =
        textFields.filter(
          (value) =>
            String(value || "")
              .trim()
              .length >= 3,
        ).length;

      const base =
        selectedId ? 1 : 0;

      const themed =
        theme.trim().length >= 3
          ? 1
          : 0;

      const total =
        2 + textFields.length;

      return Math.round(
        ((base +
          themed +
          completedText) /
          total) *
          100,
      );
    }, [
      type,
      selectedId,
      theme,
      standard,
      advanced,
    ]);

  function resetForm() {
    setSelectedId("");
    setTheme("");

    setStandard({
      ...emptyScores(
        STANDARD_SCORES.map(
          ([field]) => field,
        ),
      ),
      detentionsSummary: "",
      incidentSummary: "",
      observations: "",
      finalOpinion: "",
    });

    setAdvanced({
      ...emptyScores(
        ADVANCED_SCORES.map(
          ([field]) => field,
        ),
      ),
      patrolSummary: "",
      behavioralAnalysis: "",
      strengths: "",
      improvements: "",
      promotionOpinion: "",
      occurrences: "",
      approaches: "",
    });
  }

  function setScore(
    target:
      | "standard"
      | "advanced",
    field: string,
    value: string,
  ) {
    const next =
      value === "N/A"
        ? {
            value: null,
            notApplicable: true,
          }
        : {
            value:
              Number(value),
            notApplicable: false,
          };

    if (
      target ===
      "standard"
    ) {
      setStandard(
        (current: any) => ({
          ...current,
          [field]: next,
        }),
      );
      return;
    }

    setAdvanced(
      (current: any) => ({
        ...current,
        [field]: next,
      }),
    );
  }

  async function submit() {
    if (!selected) {
      setError(
        "Seleciona o militar a avaliar.",
      );
      return;
    }

    if (
      theme.trim().length < 3
    ) {
      setError(
        "Indica um tema válido para a avaliação.",
      );
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload =
        await request(
          "/api/sergeant-evaluations",
          {
            method: "POST",
            body:
              JSON.stringify({
                type,
                evaluatedDiscordId:
                  userId(selected),
                evaluatedName:
                  userName(selected),
                evaluatedRank:
                  userRank(selected),
                evaluatedAvatarUrl:
                  userAvatar(selected),
                theme,
                standard:
                  type ===
                  "STANDARD"
                    ? standard
                    : undefined,
                advanced:
                  type ===
                  "ADVANCED_360"
                    ? advanced
                    : undefined,
              }),
          },
        );

      setSuccess(
        payload?.discordPublished
          ? "Avaliação submetida e publicada no Discord."
          : `Avaliação guardada. ${
              payload?.warning ||
              "A publicação Discord ficou pendente."
            }`,
      );

      resetForm();
      setActiveTab("MINE");
      await load();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Não foi possível submeter.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function approve(
    item: any,
  ) {
    if (
      !window.confirm(
        `Aprovar a avaliação de ${item.evaluatedName}?`,
      )
    ) {
      return;
    }

    try {
      await request(
        `/api/sergeant-evaluations/${item._id}/approve`,
        {
          method: "POST",
        },
      );

      setSuccess(
        `Avaliação de ${item.evaluatedName} aprovada.`,
      );

      await load();
    } catch (approveError) {
      setError(
        approveError instanceof Error
          ? approveError.message
          : "Não foi possível aprovar.",
      );
    }
  }

  async function reject() {
    if (!rejecting) return;

    try {
      await request(
        `/api/sergeant-evaluations/${rejecting._id}/reject`,
        {
          method: "POST",
          body:
            JSON.stringify({
              reason:
                rejectReason,
            }),
        },
      );

      setSuccess(
        `Avaliação de ${rejecting.evaluatedName} reprovada.`,
      );

      setRejecting(null);
      setRejectReason("");
      await load();
    } catch (rejectError) {
      setError(
        rejectError instanceof Error
          ? rejectError.message
          : "Não foi possível reprovar.",
      );
    }
  }

  const tabs: Array<{
    key: Tab;
    label: string;
    count?: number;
    icon: any;
  }> = [
    {
      key: "NEW",
      label: "Nova avaliação",
      icon: Target,
    },
    {
      key: "MINE",
      label: "Histórico",
      count: counts.mine,
      icon: History,
    },
    {
      key: "PENDING",
      label: "Pendentes",
      count: counts.pending,
      icon: AlertTriangle,
    },
    {
      key: "APPROVED",
      label: "Aprovadas",
      count: counts.approved,
      icon: CheckCircle2,
    },
    {
      key: "REJECTED",
      label: "Reprovadas",
      count: counts.rejected,
      icon: XCircle,
    },
  ];

  return (
    <div className="space-y-6 pb-16">
      <section className="relative overflow-hidden rounded-[2.8rem] border border-primary/20 bg-[#04110c]/95 p-7 md:p-9">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(34,197,94,0.18),transparent_34%),radial-gradient(circle_at_88%_10%,rgba(168,85,247,0.16),transparent_32%),linear-gradient(125deg,transparent_45%,rgba(255,255,255,0.025)_45%,rgba(255,255,255,0.025)_55%,transparent_55%)]" />
        <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full border border-primary/10" />
        <div className="absolute -bottom-12 -right-12 h-56 w-56 rounded-full border border-primary/10" />

        <div className="relative flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.18em] text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Centro operacional da classe
            </div>

            <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-[-0.04em] text-white md:text-6xl">
              Avaliações dos
              <span className="block bg-gradient-to-r from-primary via-emerald-300 to-violet-300 bg-clip-text text-transparent">
                Sargentos
              </span>
            </h1>

            <p className="mt-5 max-w-3xl text-sm leading-7 text-white/45">
              Avaliação normal e avançada 360.º, histórico individual,
              publicação Discord e validação sincronizada com o CSO.
            </p>
          </div>

          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <div className="rounded-2xl border border-white/10 bg-black/25 px-5 py-3">
              <p className="text-[7px] font-black uppercase tracking-[0.14em] text-white/25">
                Sincronização
              </p>

              <p className="mt-1 flex items-center gap-2 text-xs font-black text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.8)]" />
                {lastSync
                  ? `Atualizado às ${lastSync.toLocaleTimeString("pt-PT", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`
                  : "A sincronizar"}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                void load()
              }
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-primary/10 px-5 py-4 text-[8px] font-black uppercase tracking-[0.12em] text-primary transition hover:-translate-y-0.5 hover:bg-primary/15"
            >
              <RefreshCw className="h-4 w-4" />
              Atualizar dados
            </button>
          </div>
        </div>
      </section>

      {error && (
        <Feedback
          tone="error"
          message={error}
          onClose={() =>
            setError("")
          }
        />
      )}

      {success && (
        <Feedback
          tone="success"
          message={success}
          onClose={() =>
            setSuccess("")
          }
        />
      )}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Metric
          label="Avaliações"
          value={stats.total || 0}
          icon={BarChart3}
          tone="primary"
        />

        <Metric
          label="Pendentes"
          value={stats.pending || 0}
          icon={AlertTriangle}
          tone="amber"
        />

        <Metric
          label="Aprovadas"
          value={stats.approved || 0}
          icon={CheckCircle2}
          tone="emerald"
        />

        <Metric
          label="Reprovadas"
          value={stats.rejected || 0}
          icon={XCircle}
          tone="red"
        />

        <Metric
          label="Média oficial"
          value={
            stats.officialAverage ??
            "—"
          }
          icon={Star}
          tone="violet"
        />

        <Metric
          label="Taxa aprovação"
          value={
            stats.total
              ? `${Math.round(
                  ((stats.approved || 0) /
                    stats.total) *
                    100,
                )}%`
              : "—"
          }
          icon={TrendingUp}
          tone="blue"
        />
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-[#06100c]/90 p-2 shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          {tabs.map(
            ({
              key,
              label,
              count,
              icon: Icon,
            }) => (
              <button
                key={key}
                type="button"
                onClick={() =>
                  setActiveTab(
                    key,
                  )
                }
                className={`group flex min-h-[62px] items-center justify-center gap-2 rounded-2xl border px-3 text-[8px] font-black uppercase tracking-[0.08em] transition ${
                  activeTab === key
                    ? "border-primary/30 bg-primary/12 text-primary shadow-[inset_0_0_30px_rgba(34,197,94,0.06)]"
                    : "border-transparent text-white/35 hover:border-white/10 hover:bg-white/[0.03] hover:text-white/65"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>

                {count !== undefined && (
                  <span className="rounded-full border border-current/20 bg-black/20 px-2 py-0.5 text-[7px]">
                    {count}
                  </span>
                )}
              </button>
            ),
          )}
        </div>
      </section>

      {loading ? (
        <LoadingState />
      ) : activeTab === "NEW" ? (
        <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[380px_minmax(0,1fr)_290px]">
          <section className="rounded-[2.1rem] border border-white/10 bg-[#06100c]/92 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.22)]">
            <SectionLabel>
              Militar avaliado
            </SectionLabel>

            <div className="mt-4 flex h-12 items-center rounded-2xl border border-white/10 bg-black/25 px-4 focus-within:border-primary/30">
              <Search className="mr-3 h-4 w-4 text-primary" />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                placeholder="Nome, patente, unidade ou ID..."
                className="h-full min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/20"
              />
            </div>

            <p className="mt-3 text-[8px] font-black uppercase tracking-[0.12em] text-white/20">
              {guards.length} militares encontrados
            </p>

            <div className="mt-4 max-h-[700px] space-y-2 overflow-y-auto pr-1">
              {guards.map(
                (guard) => {
                  const id =
                    userId(guard);

                  const selectedGuard =
                    id ===
                    selectedId;

                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() =>
                        setSelectedId(
                          id,
                        )
                      }
                      className={`group flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition ${
                        selectedGuard
                          ? "border-primary/35 bg-primary/12 shadow-[0_0_30px_rgba(34,197,94,0.06)]"
                          : "border-white/8 bg-black/20 hover:border-white/15 hover:bg-white/[0.035]"
                      }`}
                    >
                      <Avatar
                        src={userAvatar(
                          guard,
                        )}
                        name={userName(
                          guard,
                        )}
                        selected={
                          selectedGuard
                        }
                      />

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-black text-white">
                          {userName(
                            guard,
                          )}
                        </span>

                        <span className="mt-1 block truncate text-[8px] font-black uppercase tracking-[0.08em] text-primary">
                          {userRank(
                            guard,
                          )}
                        </span>

                        <span className="mt-1 block truncate text-[8px] text-white/25">
                          {userUnit(
                            guard,
                          )}
                        </span>
                      </span>

                      <ChevronRight
                        className={`h-4 w-4 transition ${
                          selectedGuard
                            ? "text-primary"
                            : "text-white/15 group-hover:text-white/45"
                        }`}
                      />
                    </button>
                  );
                },
              )}
            </div>
          </section>

          <section className="space-y-5 rounded-[2.1rem] border border-white/10 bg-[#06100c]/92 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.22)] md:p-7">
            <div className="flex flex-col gap-4 border-b border-white/8 pb-6 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <SectionLabel>
                  Modelo de avaliação
                </SectionLabel>

                <h2 className="mt-3 text-2xl font-black text-white">
                  Construir avaliação
                </h2>

                <p className="mt-2 text-sm text-white/35">
                  Preenche os critérios, confirma a média e submete ao CSO.
                </p>
              </div>

              <div className="rounded-2xl border border-primary/20 bg-primary/8 px-5 py-4 text-center">
                <p className="text-3xl font-black text-white">
                  {liveAverage ===
                  null
                    ? "—"
                    : liveAverage.toFixed(
                        2,
                      )}
                </p>

                <p className="mt-1 text-[7px] font-black uppercase tracking-[0.12em] text-primary">
                  Média em direto
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <TypeCard
                active={
                  type === "STANDARD"
                }
                icon={ClipboardCheck}
                title="Avaliação normal"
                description="Rádio, conduta, detenções e incidentes."
                tone="blue"
                onClick={() =>
                  setType(
                    "STANDARD",
                  )
                }
              />

              <TypeCard
                active={
                  type ===
                  "ADVANCED_360"
                }
                icon={ShieldCheck}
                title="Avaliação 360.º"
                description="Oito eixos, relatório detalhado e parecer."
                tone="violet"
                onClick={() =>
                  setType(
                    "ADVANCED_360",
                  )
                }
              />
            </div>

            <label className="block">
              <span className="text-[8px] font-black uppercase tracking-[0.12em] text-white/35">
                Tema da avaliação
              </span>

              <input
                value={theme}
                maxLength={200}
                onChange={(event) =>
                  setTheme(
                    event.target.value,
                  )
                }
                placeholder="Ex.: Patrulha urbana, operação tática, fiscalização..."
                className="mt-3 h-13 w-full rounded-2xl border border-white/10 bg-black/25 px-4 text-sm text-white outline-none transition focus:border-primary/30"
              />

              <span className="mt-2 block text-right text-[8px] text-white/20">
                {theme.length}/200
              </span>
            </label>

            <div>
              <SectionLabel>
                Critérios de avaliação
              </SectionLabel>

              <ScoreGrid
                fields={
                  type ===
                  "STANDARD"
                    ? STANDARD_SCORES
                    : ADVANCED_SCORES
                }
                values={
                  type ===
                  "STANDARD"
                    ? standard
                    : advanced
                }
                onChange={(
                  field,
                  value,
                ) =>
                  setScore(
                    type ===
                    "STANDARD"
                      ? "standard"
                      : "advanced",
                    field,
                    value,
                  )
                }
              />
            </div>

            {type === "STANDARD" ? (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <TextArea
                  label="Resumo das detenções"
                  value={
                    standard.detentionsSummary
                  }
                  onChange={(
                    value,
                  ) =>
                    setStandard(
                      (current: any) => ({
                        ...current,
                        detentionsSummary:
                          value,
                      }),
                    )
                  }
                />

                <TextArea
                  label="Resumo de incidentes"
                  value={
                    standard.incidentSummary
                  }
                  onChange={(
                    value,
                  ) =>
                    setStandard(
                      (current: any) => ({
                        ...current,
                        incidentSummary:
                          value,
                      }),
                    )
                  }
                />

                <TextArea
                  label="Observações"
                  value={
                    standard.observations
                  }
                  onChange={(
                    value,
                  ) =>
                    setStandard(
                      (current: any) => ({
                        ...current,
                        observations:
                          value,
                      }),
                    )
                  }
                />

                <TextArea
                  label="Parecer final"
                  value={
                    standard.finalOpinion
                  }
                  onChange={(
                    value,
                  ) =>
                    setStandard(
                      (current: any) => ({
                        ...current,
                        finalOpinion:
                          value,
                      }),
                    )
                  }
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {[
                  [
                    "patrolSummary",
                    "Resumo da patrulha",
                  ],
                  [
                    "behavioralAnalysis",
                    "Análise comportamental",
                  ],
                  [
                    "strengths",
                    "Pontos fortes",
                  ],
                  [
                    "improvements",
                    "Pontos a melhorar",
                  ],
                  [
                    "promotionOpinion",
                    "Parecer / promoção",
                  ],
                  [
                    "occurrences",
                    "Ocorrências",
                  ],
                  [
                    "approaches",
                    "Abordagens",
                  ],
                ].map(
                  ([
                    field,
                    label,
                  ]) => (
                    <TextArea
                      key={field}
                      label={label}
                      value={
                        advanced[
                          field
                        ]
                      }
                      onChange={(
                        value,
                      ) =>
                        setAdvanced(
                          (
                            current: any,
                          ) => ({
                            ...current,
                            [field]:
                              value,
                          }),
                        )
                      }
                    />
                  ),
                )}
              </div>
            )}
          </section>

          <aside className="space-y-4 2xl:sticky 2xl:top-6 2xl:self-start">
            <section className="overflow-hidden rounded-[2rem] border border-primary/20 bg-[#06100c]/95 shadow-[0_24px_80px_rgba(0,0,0,0.25)]">
              <div className="border-b border-white/8 bg-gradient-to-r from-primary/12 to-violet-500/8 p-5">
                <SectionLabel>
                  Pré-visualização
                </SectionLabel>

                <h3 className="mt-3 text-xl font-black text-white">
                  Resumo da submissão
                </h3>
              </div>

              <div className="space-y-5 p-5">
                {selected ? (
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={userAvatar(
                        selected,
                      )}
                      name={userName(
                        selected,
                      )}
                      selected
                    />

                    <div className="min-w-0">
                      <p className="truncate font-black text-white">
                        {userName(
                          selected,
                        )}
                      </p>

                      <p className="mt-1 truncate text-[8px] font-black uppercase text-primary">
                        {userRank(
                          selected,
                        )}
                      </p>

                      <p className="mt-1 truncate text-xs text-white/25">
                        {userUnit(
                          selected,
                        )}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 p-5 text-center">
                    <UserRound className="mx-auto h-7 w-7 text-white/15" />
                    <p className="mt-3 text-xs text-white/30">
                      Seleciona um militar.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <PreviewStat
                    label="Modelo"
                    value={
                      type ===
                      "ADVANCED_360"
                        ? "360.º"
                        : "Normal"
                    }
                  />

                  <PreviewStat
                    label="Média"
                    value={
                      liveAverage ===
                      null
                        ? "—"
                        : liveAverage.toFixed(
                            2,
                          )
                    }
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[8px] font-black uppercase tracking-[0.12em] text-white/30">
                      Preenchimento
                    </p>

                    <p className="text-xs font-black text-primary">
                      {completion}%
                    </p>
                  </div>

                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-violet-400 transition-all duration-300"
                      style={{
                        width: `${completion}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                  <p className="text-[8px] font-black uppercase tracking-[0.12em] text-white/25">
                    Tema
                  </p>

                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-white/55">
                    {theme.trim() ||
                      "Ainda não definido."}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={
                    saving ||
                    !selected ||
                    theme.trim()
                      .length < 3
                  }
                  onClick={() =>
                    void submit()
                  }
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-emerald-400 px-5 py-4 text-[9px] font-black uppercase tracking-[0.12em] text-[#02150d] shadow-[0_0_35px_rgba(34,197,94,0.18)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Target className="h-4 w-4" />
                  )}

                  {saving
                    ? "A submeter..."
                    : "Submeter ao CSO"}
                </button>
              </div>
            </section>

            <section className="rounded-[1.6rem] border border-violet-400/15 bg-violet-500/[0.05] p-5">
              <div className="flex items-start gap-3">
                <Gauge className="mt-0.5 h-5 w-5 text-violet-300" />

                <div>
                  <p className="text-sm font-black text-white">
                    Controlo de qualidade
                  </p>

                  <p className="mt-2 text-xs leading-6 text-white/35">
                    Confirma que as notas correspondem ao relatório e que os pontos a melhorar são objetivos.
                  </p>
                </div>
              </div>
            </section>
          </aside>
        </div>
      ) : (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 rounded-[1.7rem] border border-white/10 bg-[#06100c]/90 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <SectionLabel>
                Arquivo operacional
              </SectionLabel>

              <p className="mt-2 text-sm text-white/35">
                {visibleItems.length} avaliações nesta categoria.
              </p>
            </div>

            <div className="flex h-12 w-full items-center rounded-2xl border border-white/10 bg-black/25 px-4 lg:max-w-md">
              <Search className="mr-3 h-4 w-4 text-primary" />

              <input
                value={
                  historySearch
                }
                onChange={(event) =>
                  setHistorySearch(
                    event.target.value,
                  )
                }
                placeholder="Pesquisar guarda, avaliador ou tema..."
                className="h-full min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/20"
              />
            </div>
          </div>

          {visibleItems.length ? (
            visibleItems.map(
              (item) => (
                <EvaluationCard
                  key={item._id}
                  item={item}
                  expanded={
                    expandedId ===
                    item._id
                  }
                  onToggle={() =>
                    setExpandedId(
                      expandedId ===
                        item._id
                        ? null
                        : item._id,
                    )
                  }
                  canApprove={
                    permissions.canApprove
                  }
                  onApprove={() =>
                    void approve(item)
                  }
                  onReject={() =>
                    setRejecting(
                      item,
                    )
                  }
                />
              ),
            )
          ) : (
            <EmptyState />
          )}
        </section>
      )}

      {rejecting && (
        <RejectModal
          item={rejecting}
          reason={rejectReason}
          onReasonChange={
            setRejectReason
          }
          onCancel={() => {
            setRejecting(null);
            setRejectReason("");
          }}
          onConfirm={() =>
            void reject()
          }
        />
      )}
    </div>
  );
}

function ScoreGrid({
  fields,
  values,
  onChange,
}: {
  fields: readonly (readonly [string, string])[];
  values: Record<string, ScoreValue>;
  onChange: (
    field: string,
    value: string,
  ) => void;
}) {
  return (
    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
      {fields.map(
        ([field, label]) => {
          const current =
            values[field];

          const value =
            current?.notApplicable
              ? "N/A"
              : String(
                  current?.value ??
                    0,
                );

          return (
            <article
              key={field}
              className="rounded-2xl border border-white/10 bg-black/20 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-black text-white/60">
                  {label}
                </p>

                <span className="rounded-lg border border-primary/15 bg-primary/8 px-2.5 py-1 text-xs font-black text-primary">
                  {value ===
                  "N/A"
                    ? "N/A"
                    : `${value}/10`}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-6 gap-1.5">
                {Array.from(
                  { length: 11 },
                  (_, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() =>
                        onChange(
                          field,
                          String(index),
                        )
                      }
                      className={`h-9 rounded-lg border text-[9px] font-black transition ${
                        value ===
                        String(index)
                          ? "border-primary/35 bg-primary/15 text-primary"
                          : "border-white/8 bg-white/[0.025] text-white/30 hover:border-white/15 hover:text-white/65"
                      }`}
                    >
                      {index}
                    </button>
                  ),
                )}

                <button
                  type="button"
                  onClick={() =>
                    onChange(
                      field,
                      "N/A",
                    )
                  }
                  className={`h-9 rounded-lg border text-[8px] font-black transition ${
                    value ===
                    "N/A"
                      ? "border-violet-400/30 bg-violet-500/10 text-violet-300"
                      : "border-white/8 bg-white/[0.025] text-white/30 hover:border-white/15"
                  }`}
                >
                  N/A
                </button>
              </div>
            </article>
          );
        },
      )}
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (
    value: string,
  ) => void;
}) {
  return (
    <label className="block rounded-2xl border border-white/8 bg-black/15 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[8px] font-black uppercase tracking-[0.12em] text-white/35">
          {label}
        </span>

        <span className="text-[8px] text-white/20">
          {String(value || "").length}
        </span>
      </div>

      <textarea
        value={value}
        maxLength={2500}
        onChange={(event) =>
          onChange(
            event.target.value,
          )
        }
        rows={5}
        placeholder="Regista informação objetiva, clara e relevante..."
        className="mt-3 w-full resize-y bg-transparent text-sm leading-6 text-white outline-none placeholder:text-white/15"
      />
    </label>
  );
}

function EvaluationCard({
  item,
  expanded,
  onToggle,
  canApprove,
  onApprove,
  onReject,
}: {
  item: any;
  expanded: boolean;
  onToggle: () => void;
  canApprove: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const status =
    item.status as Status;

  const tone =
    status === "APPROVED"
      ? "border-emerald-400/20"
      : status ===
          "REJECTED"
        ? "border-red-400/20"
        : "border-amber-400/20";

  const details =
    item.type ===
    "ADVANCED_360"
      ? item.advanced
      : item.standard;

  return (
    <article className={`overflow-hidden rounded-[2rem] border bg-[#06100c]/92 shadow-[0_20px_70px_rgba(0,0,0,0.18)] ${tone}`}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full flex-col gap-5 p-5 text-left lg:flex-row lg:items-center lg:justify-between"
      >
        <div className="flex min-w-0 items-center gap-4">
          <Avatar
            src={
              item.evaluatedAvatarUrl
            }
            name={
              item.evaluatedName
            }
            selected={
              status ===
              "APPROVED"
            }
          />

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge
                status={status}
              />

              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[7px] font-black uppercase tracking-[0.08em] text-white/35">
                {item.type ===
                "ADVANCED_360"
                  ? "Avançada 360.º"
                  : "Normal"}
              </span>

              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[7px] font-black uppercase tracking-[0.08em] text-white/35">
                {item.source ===
                "SITE"
                  ? "Site"
                  : "Discord"}
              </span>
            </div>

            <h2 className="mt-3 truncate text-xl font-black text-white">
              {item.evaluatedName}
            </h2>

            <p className="mt-1 text-[8px] font-black uppercase tracking-[0.1em] text-primary">
              {item.evaluatedRank}
            </p>

            <p className="mt-3 line-clamp-1 text-sm text-white/45">
              {item.theme}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-center">
            <p className="text-2xl font-black text-white">
              {item.average ??
                "N/A"}
            </p>

            <p className="mt-1 text-[7px] font-black uppercase text-white/25">
              Média
            </p>
          </div>

          <ChevronDown
            className={`h-5 w-5 text-white/30 transition ${
              expanded
                ? "rotate-180 text-primary"
                : ""
            }`}
          />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-white/8 p-5">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_260px]">
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <Detail
                  label="Avaliador"
                  value={
                    item.evaluatorName
                  }
                />

                <Detail
                  label="Data"
                  value={formatDate(
                    item.createdAt,
                  )}
                />

                <Detail
                  label="Classificação"
                  value={
                    item.classification ||
                    "—"
                  }
                />
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {Object.entries(
                  details || {},
                )
                  .filter(
                    ([, value]) =>
                      typeof value ===
                      "string",
                  )
                  .map(
                    ([
                      key,
                      value,
                    ]) => (
                      <Detail
                        key={key}
                        label={
                          key.replace(
                            /([A-Z])/g,
                            " $1",
                          )
                        }
                        value={
                          String(value) ||
                          "Sem registo"
                        }
                        large
                      />
                    ),
                  )}
              </div>
            </div>

            <aside className="space-y-3">
              {item.discord
                ?.jumpUrl && (
                <a
                  href={
                    item.discord
                      .jumpUrl
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[8px] font-black uppercase text-white/45 transition hover:text-white"
                >
                  <ExternalLink className="h-4 w-4" />
                  Abrir no Discord
                </a>
              )}

              {status ===
                "PENDING" &&
                canApprove && (
                  <>
                    <button
                      type="button"
                      onClick={
                        onApprove
                      }
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-[8px] font-black uppercase text-emerald-300"
                    >
                      <Check className="h-4 w-4" />
                      Aprovar avaliação
                    </button>

                    <button
                      type="button"
                      onClick={
                        onReject
                      }
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-[8px] font-black uppercase text-red-300"
                    >
                      <X className="h-4 w-4" />
                      Reprovar avaliação
                    </button>
                  </>
                )}
            </aside>
          </div>
        </div>
      )}
    </article>
  );
}

function TypeCard({
  active,
  icon: Icon,
  title,
  description,
  tone,
  onClick,
}: {
  active: boolean;
  icon: any;
  title: string;
  description: string;
  tone: "blue" | "violet";
  onClick: () => void;
}) {
  const activeClass =
    tone === "blue"
      ? "border-blue-400/30 bg-blue-500/10 shadow-[inset_0_0_30px_rgba(59,130,246,0.05)]"
      : "border-violet-400/30 bg-violet-500/10 shadow-[inset_0_0_30px_rgba(139,92,246,0.05)]";

  const iconClass =
    tone === "blue"
      ? "text-blue-300"
      : "text-violet-300";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-5 text-left transition hover:-translate-y-0.5 ${
        active
          ? activeClass
          : "border-white/10 bg-black/20 hover:border-white/15"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl border border-current/15 bg-current/5 ${iconClass}`}>
          <Icon className="h-5 w-5" />
        </span>

        {active && (
          <BadgeCheck className="h-5 w-5 text-primary" />
        )}
      </div>

      <p className="mt-4 font-black text-white">
        {title}
      </p>

      <p className="mt-2 text-xs leading-5 text-white/35">
        {description}
      </p>
    </button>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number | string;
  icon: any;
  tone:
    | "primary"
    | "amber"
    | "emerald"
    | "red"
    | "violet"
    | "blue";
}) {
  const tones = {
    primary:
      "border-primary/15 bg-primary/[0.05] text-primary",
    amber:
      "border-amber-400/15 bg-amber-500/[0.05] text-amber-300",
    emerald:
      "border-emerald-400/15 bg-emerald-500/[0.05] text-emerald-300",
    red:
      "border-red-400/15 bg-red-500/[0.05] text-red-300",
    violet:
      "border-violet-400/15 bg-violet-500/[0.05] text-violet-300",
    blue:
      "border-blue-400/15 bg-blue-500/[0.05] text-blue-300",
  };

  return (
    <article className={`group rounded-[1.7rem] border p-5 transition hover:-translate-y-0.5 ${tones[tone]}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-current/15 bg-black/15">
          <Icon className="h-5 w-5" />
        </span>

        <Activity className="h-4 w-4 opacity-20 transition group-hover:opacity-50" />
      </div>

      <p className="mt-5 text-3xl font-black text-white">
        {value}
      </p>

      <p className="mt-1 text-[8px] font-black uppercase tracking-[0.12em] text-white/25">
        {label}
      </p>
    </article>
  );
}

function Avatar({
  src,
  name,
  selected = false,
}: {
  src?: string | null;
  name: string;
  selected?: boolean;
}) {
  return src ? (
    <span className={`relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl border ${
      selected
        ? "border-primary/40"
        : "border-white/10"
    }`}>
      <img
        src={src}
        alt=""
        className="h-full w-full object-cover"
      />

      {selected && (
        <span className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full border-2 border-[#06100c] bg-primary" />
      )}
    </span>
  ) : (
    <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${
      selected
        ? "border-primary/30 bg-primary/10 text-primary"
        : "border-white/10 bg-black/20 text-white/25"
    }`}>
      <UserRound className="h-5 w-5" />
    </span>
  );
}

function StatusBadge({
  status,
}: {
  status: Status;
}) {
  const tone =
    status === "APPROVED"
      ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
      : status ===
          "REJECTED"
        ? "border-red-400/20 bg-red-500/10 text-red-300"
        : "border-amber-400/20 bg-amber-500/10 text-amber-300";

  return (
    <span className={`rounded-full border px-3 py-1 text-[7px] font-black uppercase tracking-[0.08em] ${tone}`}>
      {statusLabel(status)}
    </span>
  );
}

function Detail({
  label,
  value,
  large = false,
}: {
  label: string;
  value: string;
  large?: boolean;
}) {
  return (
    <div className={`rounded-2xl border border-white/8 bg-black/20 p-4 ${large ? "min-h-[110px]" : ""}`}>
      <p className="text-[7px] font-black uppercase tracking-[0.12em] text-white/25">
        {label}
      </p>

      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/55">
        {value}
      </p>
    </div>
  );
}

function PreviewStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-black/20 p-4 text-center">
      <p className="text-xl font-black text-white">
        {value}
      </p>

      <p className="mt-1 text-[7px] font-black uppercase tracking-[0.1em] text-white/25">
        {label}
      </p>
    </div>
  );
}

function SectionLabel({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <p className="text-[8px] font-black uppercase tracking-[0.16em] text-primary">
      {children}
    </p>
  );
}

function Feedback({
  tone,
  message,
  onClose,
}: {
  tone: "error" | "success";
  message: string;
  onClose: () => void;
}) {
  const success =
    tone === "success";

  return (
    <div className={`flex items-start justify-between gap-4 rounded-2xl border p-4 text-sm ${
      success
        ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
        : "border-red-400/20 bg-red-500/10 text-red-200"
    }`}>
      <div className="flex items-start gap-3">
        {success ? (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
        ) : (
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        )}

        <p>{message}</p>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="opacity-50 transition hover:opacity-100"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center rounded-[2rem] border border-white/8 bg-[#06100c]/70">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="mt-4 text-[8px] font-black uppercase tracking-[0.15em] text-white/25">
        A sincronizar avaliações
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-[2rem] border border-dashed border-white/10 bg-[#06100c]/60 p-14 text-center">
      <FileText className="mx-auto h-10 w-10 text-white/15" />

      <h2 className="mt-5 text-xl font-black text-white">
        Sem avaliações nesta categoria
      </h2>

      <p className="mt-2 text-sm text-white/30">
        Os registos aparecerão aqui automaticamente.
      </p>
    </div>
  );
}

function RejectModal({
  item,
  reason,
  onReasonChange,
  onCancel,
  onConfirm,
}: {
  item: any;
  reason: string;
  onReasonChange: (
    value: string,
  ) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
      <div className="w-full max-w-xl overflow-hidden rounded-[2.2rem] border border-red-400/20 bg-[#06100c] shadow-2xl">
        <div className="border-b border-white/8 bg-red-500/[0.06] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.15em] text-red-300">
                Decisão do CSO
              </p>

              <h2 className="mt-2 text-2xl font-black text-white">
                Reprovar avaliação
              </h2>
            </div>

            <button
              type="button"
              onClick={onCancel}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-white/35 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="mt-3 text-sm text-white/35">
            Avaliação de{" "}
            <strong className="text-white">
              {item.evaluatedName}
            </strong>
          </p>
        </div>

        <div className="p-6">
          <textarea
            value={reason}
            onChange={(event) =>
              onReasonChange(
                event.target.value,
              )
            }
            rows={6}
            maxLength={1200}
            placeholder="Indica de forma objetiva o motivo da reprovação..."
            className="w-full resize-none rounded-2xl border border-white/10 bg-black/25 p-4 text-sm leading-6 text-white outline-none focus:border-red-400/30"
          />

          <div className="mt-2 text-right text-[8px] text-white/20">
            {reason.length}/1200
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[8px] font-black uppercase text-white/45"
            >
              Cancelar
            </button>

            <button
              type="button"
              disabled={
                reason.trim()
                  .length < 3
              }
              onClick={onConfirm}
              className="rounded-2xl bg-red-500 px-4 py-3 text-[8px] font-black uppercase text-white disabled:opacity-35"
            >
              Confirmar reprovação
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
