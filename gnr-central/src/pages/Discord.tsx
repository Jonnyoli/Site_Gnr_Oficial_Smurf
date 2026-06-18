import {
  useMemo,
  useState,
  type ComponentType,
} from "react";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  motion,
} from "framer-motion";

import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  Command,
  Gauge,
  History,
  Loader2,
  LockKeyhole,
  MessageSquareText,
  Play,
  RefreshCw,
  Save,
  Search,
  Server,
  Settings2,
  ShieldCheck,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Wifi,
  WifiOff,
  Workflow,
  XCircle,
  Zap,
} from "lucide-react";

const API =
  import.meta.env.VITE_API_URL?.replace(
    /\/$/,
    "",
  ) || "";

const LAST_KNOWN_COMMAND_COUNT =
  73;

type TabId =
  | "DASHBOARD"
  | "COMMANDS"
  | "TEMPLATES"
  | "REMOTE"
  | "LOGS";

type CommandConfig = {
  _id?: string;
  name: string;
  description: string;
  category: string;
  enabled: boolean;
  hidden?: boolean;
  guildScope: string;

  source?: {
    file?: string | null;
    hash?: string | null;
    version?: string | null;
    lastSyncedAt?: string | null;
  };

  access: {
    requireMilitaryRole: boolean;
    requirePointOpen: boolean;
    requireUnitRole?: boolean;
    blockDuringMaintenance?: boolean;
    allowedRoleIds: string[];
    deniedRoleIds: string[];
    allowedChannelIds: string[];
    deniedChannelIds: string[];
    allowedGuildIds?: string[];
    cooldownSeconds: number;
  };

  audit: {
    enabled: boolean;
    logSuccess: boolean;
    logFailure: boolean;
    includeOptions: boolean;
  };

  settings?: Record<string, unknown>;
  templateKeys?: string[];

  stats?: {
    totalExecutions?: number;
    successExecutions?: number;
    failedExecutions?: number;
    blockedExecutions?: number;
    averageDurationMs?: number;
    lastExecutedAt?: string | null;
    lastError?: string | null;
  };
};

type MessageTemplate = {
  _id?: string;
  key: string;
  label: string;
  category: string;
  enabled: boolean;
  guildScope: string;
  mentionRoleId?: string | null;
  channelId?: string | null;

  payload: {
    content: string;

    embed: {
      title: string;
      description: string;
      color: string;
      imageUrl: string;
      thumbnailUrl: string;
      footer: string;
    };

    buttons: unknown[];
  };
};

type RemoteAction = {
  _id: string;
  type: string;
  status: string;
  reason: string;
  createdAt: string;
  attempts?: number;
  lastError?: string | null;

  requestedBy?: {
    name?: string;
  };
};

type ExecutionItem = {
  _id: string;
  commandName: string;
  status: string;
  userName?: string;
  userId?: string;
  durationMs: number;
  reason?: string;
  error?: string;
  createdAt: string;
};

type DashboardPayload = {
  commands?: {
    active?: number;
    disabled?: number;
  };

  executionsToday?: {
    total?: number;
    success?: number;
    failed?: number;
    blocked?: number;
    successRate?: number;
    averageDurationMs?: number;
  };

  templates?: number;
  pendingRemoteActions?: number;
  recentFailures?: Array<{
    _id: string;
    commandName: string;
    userName?: string;
    userId?: string;
    createdAt: string;
    error?: string;
    reason?: string;
  }>;
};

const tabs: Array<{
  id: TabId;
  label: string;
  icon: ComponentType<{
    className?: string;
  }>;
}> = [
  {
    id: "DASHBOARD",
    label: "Painel",
    icon: Activity,
  },
  {
    id: "COMMANDS",
    label: "Comandos",
    icon: Command,
  },
  {
    id: "TEMPLATES",
    label: "Mensagens",
    icon: MessageSquareText,
  },
  {
    id: "REMOTE",
    label: "Execução",
    icon: Play,
  },
  {
    id: "LOGS",
    label: "Logs",
    icon: History,
  },
];

const actions = [
  {
    type: "SYNC_COMMANDS",
    label: "Sincronizar comandos",
    description:
      "Atualiza o catálogo com os comandos carregados no bot.",
  },
  {
    type: "RELOAD_COMMANDS",
    label: "Preparar recarregamento",
    description:
      "Assinala a necessidade de reiniciar o bot em segurança.",
  },
  {
    type: "SYNC_MAIN_GUILD",
    label: "Sincronizar Discord principal",
    description:
      "Pede nova sincronização da guild principal.",
  },
  {
    type: "SYNC_SCHOOL_GUILD",
    label: "Sincronizar Escola",
    description:
      "Pede nova sincronização da Escola da Guarda.",
  },
  {
    type: "SYNC_EFFECTIVE",
    label: "Sincronizar Efetivo",
    description:
      "Atualiza nomes, avatares e roles dos militares.",
  },
  {
    type: "REPROCESS_OUTBOX",
    label: "Reprocessar outbox",
    description:
      "Tenta novamente as tarefas operacionais pendentes.",
  },
  {
    type: "TEST_CONNECTIONS",
    label: "Testar ligações",
    description:
      "Confirma a ligação entre site, API, bot e Discord.",
  },
] as const;

async function requestJson<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response =
    await fetch(
      `${API}${path}`,
      {
        credentials:
          "include",

        headers: {
          Accept:
            "application/json",

          "Content-Type":
            "application/json",

          ...(options.headers ||
            {}),
        },

        ...options,
      },
    );

  const payload =
    await response
      .json()
      .catch(
        () => null,
      );

  if (!response.ok) {
    throw new Error(
      payload?.error ||
      `A API respondeu ${response.status}.`,
    );
  }

  return payload;
}

function relativeTime(
  value?: string | null,
) {
  if (!value) {
    return "Nunca";
  }

  const timestamp =
    new Date(
      value,
    ).getTime();

  if (
    Number.isNaN(
      timestamp,
    )
  ) {
    return "Sem data";
  }

  const seconds =
    Math.max(
      0,
      Math.floor(
        (
          Date.now() -
          timestamp
        ) /
        1000,
      ),
    );

  if (
    seconds <
    60
  ) {
    return `há ${seconds}s`;
  }

  if (
    seconds <
    3600
  ) {
    return `há ${Math.floor(
      seconds /
        60,
    )} min`;
  }

  if (
    seconds <
    86400
  ) {
    return `há ${Math.floor(
      seconds /
        3600,
    )} h`;
  }

  return `há ${Math.floor(
    seconds /
      86400,
  )} d`;
}

function splitIds(
  value: string,
) {
  return value
    .split(
      /[\s,;]+/,
    )
    .map(
      (item) =>
        item.trim(),
    )
    .filter(Boolean);
}

function isConnectionError(
  error: unknown,
) {
  if (
    !(error instanceof Error)
  ) {
    return false;
  }

  return /fetch|network|failed|load|connection|ECONNREFUSED|404/i.test(
    error.message,
  );
}

export default function Discord() {
  const queryClient =
    useQueryClient();

  const [
    tab,
    setTab,
  ] =
    useState<TabId>(
      "DASHBOARD",
    );

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    selected,
    setSelected,
  ] =
    useState<CommandConfig | null>(
      null,
    );

  const [
    template,
    setTemplate,
  ] =
    useState<MessageTemplate | null>(
      null,
    );

  const [
    reason,
    setReason,
  ] =
    useState(
      "Operação administrativa através da Central.",
    );

  const dashboard =
    useQuery({
      queryKey: [
        "dcc-dashboard",
      ],

      queryFn: () =>
        requestJson<DashboardPayload>(
          "/api/discord-command-center/dashboard",
        ),

      staleTime:
        15_000,

      refetchInterval:
        30_000,

      refetchIntervalInBackground:
        false,

      retry: 1,
    });

  const commands =
    useQuery({
      queryKey: [
        "dcc-commands",
        search,
      ],

      queryFn: () =>
        requestJson<{
          items: CommandConfig[];
          total: number;
        }>(
          `/api/discord-command-center/commands?search=${encodeURIComponent(
            search,
          )}`,
        ),

      staleTime:
        20_000,

      retry: 1,
    });

  const templates =
    useQuery({
      queryKey: [
        "dcc-templates",
      ],

      queryFn: () =>
        requestJson<{
          items: MessageTemplate[];
        }>(
          "/api/discord-command-center/templates",
        ),

      staleTime:
        30_000,

      retry: 1,
    });

  const remote =
    useQuery({
      queryKey: [
        "dcc-remote",
      ],

      queryFn: () =>
        requestJson<{
          items: RemoteAction[];
        }>(
          "/api/discord-command-center/remote-actions",
        ),

      refetchInterval:
        tab ===
        "REMOTE"
          ? 15_000
          : false,

      refetchIntervalInBackground:
        false,

      staleTime:
        8_000,

      retry: 1,
    });

  const logs =
    useQuery({
      queryKey: [
        "dcc-logs",
      ],

      queryFn: () =>
        requestJson<{
          items: ExecutionItem[];
        }>(
          "/api/discord-command-center/executions?limit=200",
        ),

      refetchInterval:
        tab ===
        "LOGS"
          ? 15_000
          : false,

      refetchIntervalInBackground:
        false,

      staleTime:
        8_000,

      retry: 1,
    });

  const save =
    useMutation({
      mutationFn:
        (
          item: CommandConfig,
        ) =>
          requestJson<{
            item: CommandConfig;
          }>(
            `/api/discord-command-center/commands/${encodeURIComponent(
              item.name,
            )}`,
            {
              method:
                "PUT",

              body:
                JSON.stringify(
                  item,
                ),
            },
          ),

      onSuccess:
        (
          payload,
        ) => {
          setSelected(
            payload.item,
          );

          void queryClient.invalidateQueries({
            queryKey: [
              "dcc-commands",
            ],
          });

          void queryClient.invalidateQueries({
            queryKey: [
              "dcc-dashboard",
            ],
          });
        },
    });

  const toggle =
    useMutation({
      mutationFn:
        (
          name: string,
        ) =>
          requestJson(
            `/api/discord-command-center/commands/${encodeURIComponent(
              name,
            )}/toggle`,
            {
              method:
                "POST",

              body:
                "{}",
            },
          ),

      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: [
            "dcc-commands",
          ],
        });

        void queryClient.invalidateQueries({
          queryKey: [
            "dcc-dashboard",
          ],
        });
      },
    });

  const saveTemplate =
    useMutation({
      mutationFn:
        (
          item: MessageTemplate,
        ) =>
          requestJson<{
            item: MessageTemplate;
          }>(
            `/api/discord-command-center/templates/${encodeURIComponent(
              item.key,
            )}`,
            {
              method:
                "PUT",

              body:
                JSON.stringify(
                  item,
                ),
            },
          ),

      onSuccess:
        (
          payload,
        ) => {
          setTemplate(
            payload.item,
          );

          void queryClient.invalidateQueries({
            queryKey: [
              "dcc-templates",
            ],
          });

          void queryClient.invalidateQueries({
            queryKey: [
              "dcc-dashboard",
            ],
          });
        },
    });

  const createAction =
    useMutation({
      mutationFn:
        (
          type: string,
        ) =>
          requestJson(
            "/api/discord-command-center/remote-actions",
            {
              method:
                "POST",

              body:
                JSON.stringify({
                  type,
                  reason,
                }),
            },
          ),

      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: [
            "dcc-remote",
          ],
        });

        void queryClient.invalidateQueries({
          queryKey: [
            "dcc-dashboard",
          ],
        });
      },
    });

  const dashboardData =
    dashboard.data ||
    {};

  const commandItems =
    commands.data
      ?.items ||
    [];

  const categoryCount =
    useMemo(
      () =>
        new Set(
          commandItems.map(
            (
              item,
            ) =>
              item.category,
          ),
        ).size,
      [
        commandItems,
      ],
    );

  const apiConnected =
    !dashboard.isError &&
    Boolean(
      dashboard.data,
    );

  const connectionError =
    dashboard.error instanceof
    Error
      ? dashboard.error.message
      : null;

  const connectionMode =
    apiConnected
      ? "ONLINE"
      : dashboard.isLoading
        ? "CONNECTING"
        : "OFFLINE";

  function refreshAll() {
    void dashboard.refetch();
    void commands.refetch();
    void templates.refetch();
    void remote.refetch();
    void logs.refetch();
  }

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 14,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      className="space-y-6 pb-10"
    >
      <section className="relative overflow-hidden rounded-[2.6rem] border border-primary/20 bg-black/30 p-6 shadow-[0_38px_140px_rgba(0,0,0,.40)] md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_15%,hsl(var(--primary)/.23),transparent_35%),radial-gradient(circle_at_85%_80%,rgba(59,130,246,.10),transparent_30%)]" />

        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-2 text-[9px] font-black uppercase tracking-[.2em] text-primary">
              <Bot className="h-4 w-4" />
              Central de Comando Discord
            </div>

            <h1 className="mt-5 text-4xl font-black tracking-[-.04em] text-white md:text-6xl">
              Bot, comandos e automações
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/45">
              Gere permissões, mensagens, logs, execução remota e sincronização a partir de uma única central.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <HeroMetric
              label="Ativos"
              value={
                dashboardData
                  .commands
                  ?.active ||
                0
              }
            />

            <HeroMetric
              label="Desativados"
              value={
                dashboardData
                  .commands
                  ?.disabled ||
                0
              }
            />

            <HeroMetric
              label="Execuções"
              value={
                dashboardData
                  .executionsToday
                  ?.total ||
                0
              }
            />

            <HeroMetric
              label="Sucesso"
              value={`${dashboardData.executionsToday?.successRate || 100}%`}
            />
          </div>
        </div>
      </section>

      <ConnectionBanner
        mode={
          connectionMode
        }
        error={
          connectionError
        }
        onRefresh={
          refreshAll
        }
        refreshing={
          dashboard.isFetching
        }
      />

      <div className="flex gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-black/20 p-2">
        {tabs.map(
          ({
            id,
            label,
            icon: Icon,
          }) => (
            <button
              key={id}
              type="button"
              onClick={() =>
                setTab(
                  id,
                )
              }
              className={`inline-flex min-w-max items-center gap-2 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-[.12em] transition ${
                tab ===
                id
                  ? "bg-primary text-primary-foreground"
                  : "text-white/40 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ),
        )}
      </div>

      {tab ===
        "DASHBOARD" && (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <MetricCard
              label="Categorias"
              value={
                categoryCount
              }
              icon={
                Settings2
              }
            />

            <MetricCard
              label="Modelos"
              value={
                dashboardData
                  .templates ||
                0
              }
              icon={
                MessageSquareText
              }
            />

            <MetricCard
              label="Ações pendentes"
              value={
                dashboardData
                  .pendingRemoteActions ||
                0
              }
              icon={
                Workflow
              }
            />

            <MetricCard
              label="Falhas"
              value={
                dashboardData
                  .executionsToday
                  ?.failed ||
                0
              }
              icon={
                XCircle
              }
              critical={
                Boolean(
                  dashboardData
                    .executionsToday
                    ?.failed,
                )
              }
            />

            <MetricCard
              label="Bloqueados"
              value={
                dashboardData
                  .executionsToday
                  ?.blocked ||
                0
              }
              icon={
                LockKeyhole
              }
            />

            <MetricCard
              label="Média"
              value={`${dashboardData.executionsToday?.averageDurationMs || 0} ms`}
              icon={
                Gauge
              }
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
            <section className="rounded-[2rem] border border-white/10 bg-black/25 p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[.18em] text-primary">
                    Ações rápidas
                  </p>

                  <h2 className="mt-2 text-2xl font-black text-white">
                    Operações do bot
                  </h2>
                </div>

                <Zap className="h-7 w-7 text-primary" />
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-2">
                {actions
                  .slice(
                    0,
                    6,
                  )
                  .map(
                    (
                      action,
                    ) => (
                      <ActionButton
                        key={
                          action.type
                        }
                        label={
                          action.label
                        }
                        description={
                          action.description
                        }
                        disabled={
                          !apiConnected ||
                          createAction.isPending
                        }
                        loading={
                          createAction.isPending &&
                          createAction.variables ===
                            action.type
                        }
                        onClick={() => {
                          if (
                            window.confirm(
                              `Confirmar "${action.label}"?`,
                            )
                          ) {
                            createAction.mutate(
                              action.type,
                            );
                          }
                        }}
                      />
                    ),
                  )}
              </div>
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-black/25 p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[.18em] text-primary">
                    Estado da integração
                  </p>

                  <h2 className="mt-2 text-2xl font-black text-white">
                    Preparado para produção
                  </h2>
                </div>

                <ShieldCheck className="h-7 w-7 text-primary" />
              </div>

              <div className="mt-6 space-y-3">
                <StatusRow
                  label="API pública"
                  value={
                    apiConnected
                      ? "Ligada"
                      : "Por ligar"
                  }
                  ok={
                    apiConnected
                  }
                />

                <StatusRow
                  label="Comandos conhecidos"
                  value={
                    commandItems.length ||
                    LAST_KNOWN_COMMAND_COUNT
                  }
                  ok={
                    commandItems.length >
                    0
                  }
                />

                <StatusRow
                  label="Gestão de permissões"
                  value="Preparada"
                  ok
                />

                <StatusRow
                  label="Modo seguro"
                  value="Ações bloqueadas offline"
                  ok
                />

                <StatusRow
                  label="Última atualização"
                  value={
                    dashboard.dataUpdatedAt
                      ? relativeTime(
                          new Date(
                            dashboard.dataUpdatedAt,
                          ).toISOString(),
                        )
                      : "Sem ligação"
                  }
                  ok={
                    apiConnected
                  }
                />
              </div>

              <p className="mt-5 rounded-2xl border border-white/10 bg-white/[.025] p-4 text-xs leading-5 text-white/35">
                Esta página pode ser publicada já. Quando o Railway estiver ligado, os dados reais aparecem automaticamente sem nova alteração visual.
              </p>
            </section>
          </div>

          <section className="rounded-[2rem] border border-white/10 bg-black/25 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[.18em] text-primary">
                  Erros recentes
                </p>

                <h2 className="mt-2 text-2xl font-black text-white">
                  Execuções falhadas
                </h2>
              </div>

              <AlertTriangle className="h-7 w-7 text-amber-300" />
            </div>

            <div className="mt-6 grid gap-3 lg:grid-cols-2">
              {(dashboardData
                .recentFailures ||
                []).map(
                (
                  item,
                ) => (
                  <article
                    key={
                      item._id
                    }
                    className="rounded-2xl border border-red-400/15 bg-red-500/[.06] p-4"
                  >
                    <p className="font-black text-white">
                      /{item.commandName}
                    </p>

                    <p className="mt-1 text-xs text-white/35">
                      {item.userName ||
                        item.userId ||
                        "Utilizador"}{" "}
                      ·{" "}
                      {relativeTime(
                        item.createdAt,
                      )}
                    </p>

                    <p className="mt-3 line-clamp-3 text-xs leading-5 text-red-200/60">
                      {item.error ||
                        item.reason ||
                        "Erro sem detalhe"}
                    </p>
                  </article>
                ),
              )}

              {!dashboardData
                .recentFailures
                ?.length && (
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/[.07] p-5 text-emerald-300">
                  <CheckCircle2 className="h-6 w-6" />

                  <p className="mt-3 font-black">
                    Sem falhas registadas.
                  </p>

                  <p className="mt-1 text-xs text-emerald-100/45">
                    Os erros reais aparecerão quando o bot começar a enviar logs para a API pública.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {tab ===
        "COMMANDS" && (
        <div className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
          <section className="rounded-[2rem] border border-white/10 bg-black/25 p-5">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />

              <input
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
                className="h-12 w-full rounded-2xl border border-white/10 bg-black/30 pl-11 pr-4 text-white outline-none transition focus:border-primary/35"
                placeholder="Pesquisar comando..."
              />
            </div>

            <div className="mt-5 space-y-2">
              {commandItems.map(
                (
                  item,
                ) => (
                  <button
                    key={
                      item.name
                    }
                    type="button"
                    onClick={() =>
                      setSelected({
                        ...item,
                      })
                    }
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      selected?.name ===
                      item.name
                        ? "border-primary/35 bg-primary/[.08]"
                        : "border-white/10 bg-white/[.025] hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-black text-white">
                            /{item.name}
                          </p>

                          <span className="rounded-full border border-white/10 bg-black/25 px-2 py-1 text-[8px] font-black uppercase tracking-[.12em] text-white/30">
                            {item.category}
                          </span>
                        </div>

                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-white/35">
                          {item.description ||
                            "Sem descrição"}
                        </p>
                      </div>

                      {item.enabled ? (
                        <ToggleRight className="h-6 w-6 shrink-0 text-emerald-300" />
                      ) : (
                        <ToggleLeft className="h-6 w-6 shrink-0 text-red-300" />
                      )}
                    </div>
                  </button>
                ),
              )}

              {!commandItems.length && (
                <EmptyList
                  icon={
                    Command
                  }
                  title={
                    apiConnected
                      ? "Ainda não existem comandos sincronizados"
                      : "Comandos aguardam ligação à API"
                  }
                  description={
                    apiConnected
                      ? "Quando o bot enviar o catálogo, os comandos aparecem aqui."
                      : `O último deploy conhecido tinha ${LAST_KNOWN_COMMAND_COUNT} comandos. Publica o backend e liga o bot para preencher esta lista.`
                  }
                />
              )}
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-black/25 p-6">
            {selected ? (
              <CommandEditor
                item={
                  selected
                }
                setItem={
                  setSelected
                }
                onSave={() =>
                  save.mutate(
                    selected,
                  )
                }
                onToggle={() =>
                  toggle.mutate(
                    selected.name,
                  )
                }
                saving={
                  save.isPending
                }
                disabled={
                  !apiConnected
                }
              />
            ) : (
              <Empty />
            )}
          </section>
        </div>
      )}

      {tab ===
        "TEMPLATES" && (
        <div className="grid gap-6 xl:grid-cols-[.75fr_1.25fr]">
          <section className="rounded-[2rem] border border-white/10 bg-black/25 p-5">
            <button
              type="button"
              disabled={
                !apiConnected
              }
              onClick={() =>
                setTemplate(
                  blankTemplate(),
                )
              }
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 font-black text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Sparkles className="h-4 w-4" />
              Novo modelo
            </button>

            <div className="mt-4 space-y-2">
              {(templates.data
                ?.items ||
                []).map(
                (
                  item,
                ) => (
                  <button
                    key={
                      item.key
                    }
                    type="button"
                    onClick={() =>
                      setTemplate({
                        ...item,
                      })
                    }
                    className="w-full rounded-2xl border border-white/10 p-4 text-left transition hover:border-primary/25"
                  >
                    <p className="font-black text-white">
                      {item.label}
                    </p>

                    <p className="mt-1 text-xs text-primary">
                      {item.key}
                    </p>
                  </button>
                ),
              )}

              {!templates.data
                ?.items
                ?.length && (
                <EmptyList
                  icon={
                    MessageSquareText
                  }
                  title="Sem modelos guardados"
                  description="Depois da API estar online, podes criar mensagens e embeds sem mexer no código."
                />
              )}
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-black/25 p-6">
            {template ? (
              <TemplateEditor
                item={
                  template
                }
                setItem={
                  setTemplate
                }
                onSave={() =>
                  saveTemplate.mutate(
                    template,
                  )
                }
                saving={
                  saveTemplate.isPending
                }
                disabled={
                  !apiConnected
                }
              />
            ) : (
              <Empty />
            )}
          </section>
        </div>
      )}

      {tab ===
        "REMOTE" && (
        <div className="space-y-6">
          <section className="rounded-[2rem] border border-white/10 bg-black/25 p-6">
            <label className="text-xs font-black uppercase tracking-[.12em] text-white/30">
              Motivo obrigatório
            </label>

            <input
              value={
                reason
              }
              onChange={(
                event,
              ) =>
                setReason(
                  event.target
                    .value,
                )
              }
              className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-white outline-none transition focus:border-primary/35"
            />

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {actions.map(
                (
                  action,
                ) => (
                  <ActionButton
                    key={
                      action.type
                    }
                    label={
                      action.label
                    }
                    description={
                      action.description
                    }
                    disabled={
                      !apiConnected ||
                      createAction.isPending ||
                      reason.trim().length <
                        4
                    }
                    loading={
                      createAction.isPending &&
                      createAction.variables ===
                        action.type
                    }
                    onClick={() => {
                      if (
                        window.confirm(
                          `Confirmar "${action.label}"?`,
                        )
                      ) {
                        createAction.mutate(
                          action.type,
                        );
                      }
                    }}
                  />
                ),
              )}
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-black/25 p-6">
            <h2 className="text-2xl font-black text-white">
              Histórico de ações
            </h2>

            <div className="mt-5 space-y-3">
              {(remote.data
                ?.items ||
                []).map(
                (
                  item,
                ) => (
                  <article
                    key={
                      item._id
                    }
                    className="rounded-2xl border border-white/10 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-black text-white">
                        {item.type}
                      </p>

                      <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[9px] font-black uppercase tracking-[.12em] text-primary">
                        {item.status}
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-white/35">
                      {item.requestedBy
                        ?.name ||
                        "Sistema"}{" "}
                      ·{" "}
                      {relativeTime(
                        item.createdAt,
                      )}
                    </p>

                    <p className="mt-2 text-sm text-white/50">
                      {item.reason}
                    </p>

                    {item.lastError && (
                      <p className="mt-3 text-xs text-red-200/65">
                        {item.lastError}
                      </p>
                    )}
                  </article>
                ),
              )}

              {!remote.data
                ?.items
                ?.length && (
                <EmptyList
                  icon={
                    Workflow
                  }
                  title="Sem ações remotas"
                  description="As operações enviadas para o bot aparecerão aqui com o respetivo resultado."
                />
              )}
            </div>
          </section>
        </div>
      )}

      {tab ===
        "LOGS" && (
        <section className="rounded-[2rem] border border-white/10 bg-black/25 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[.18em] text-primary">
                Auditoria de comandos
              </p>

              <h2 className="mt-2 text-2xl font-black text-white">
                Execuções recentes
              </h2>
            </div>

            <button
              type="button"
              onClick={() =>
                void logs.refetch()
              }
              className="rounded-xl border border-white/10 bg-black/25 p-3 text-white/45 transition hover:text-primary"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  logs.isFetching
                    ? "animate-spin"
                    : ""
                }`}
              />
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {(logs.data
              ?.items ||
                []).map(
              (
                item,
              ) => (
                <article
                  key={
                    item._id
                  }
                  className="rounded-2xl border border-white/10 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-black text-white">
                      /{item.commandName}
                    </p>

                    <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[9px] font-black uppercase tracking-[.12em] text-primary">
                      {item.status}
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-white/35">
                    {item.userName ||
                      item.userId ||
                      "Utilizador"}{" "}
                    ·{" "}
                    {relativeTime(
                      item.createdAt,
                    )}{" "}
                    ·{" "}
                    {item.durationMs} ms
                  </p>

                  {(item.error ||
                    item.reason) && (
                    <p className="mt-3 whitespace-pre-wrap text-xs leading-5 text-red-200/60">
                      {item.error ||
                        item.reason}
                    </p>
                  )}
                </article>
              ),
            )}

            {!logs.data
              ?.items
              ?.length && (
              <EmptyList
                icon={
                  History
                }
                title="Sem execuções registadas"
                description="Os logs reais aparecem depois de o bot comunicar com o backend público."
              />
            )}
          </div>
        </section>
      )}

      {(save.error ||
        toggle.error ||
        saveTemplate.error ||
        createAction.error) && (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">
          {[
            save.error,
            toggle.error,
            saveTemplate.error,
            createAction.error,
          ]
            .find(
              (
                error,
              ) =>
                error instanceof
                Error,
            )
            ?.message ||
            "A operação não foi concluída."}
        </div>
      )}
    </motion.div>
  );
}

function ConnectionBanner({
  mode,
  error,
  onRefresh,
  refreshing,
}: {
  mode:
    | "ONLINE"
    | "CONNECTING"
    | "OFFLINE";
  error:
    string | null;
  onRefresh:
    () => void;
  refreshing:
    boolean;
}) {
  const online =
    mode ===
    "ONLINE";

  const connecting =
    mode ===
    "CONNECTING";

  return (
    <section
      className={`rounded-[1.8rem] border p-5 ${
        online
          ? "border-emerald-400/20 bg-emerald-500/[.07]"
          : connecting
            ? "border-amber-400/20 bg-amber-500/[.07]"
            : "border-red-400/20 bg-red-500/[.07]"
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${
              online
                ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
                : connecting
                  ? "border-amber-400/20 bg-amber-500/10 text-amber-300"
                  : "border-red-400/20 bg-red-500/10 text-red-300"
            }`}
          >
            {online ? (
              <Wifi className="h-5 w-5" />
            ) : connecting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <WifiOff className="h-5 w-5" />
            )}
          </div>

          <div>
            <p className="font-black text-white">
              {online
                ? "Central ligada à API"
                : connecting
                  ? "A testar ligação à API"
                  : "Central em modo de configuração"}
            </p>

            <p className="mt-1 text-xs leading-5 text-white/40">
              {online
                ? "Os dados apresentados são reais e podem ser administrados."
                : "A página está pronta para publicação, mas as ações ficam bloqueadas até o backend público responder."}
            </p>

            {!online &&
              error && (
              <p className="mt-2 text-[11px] text-red-200/55">
                {error}
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={
            onRefresh
          }
          disabled={
            refreshing
          }
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-xs font-black text-white/60 transition hover:border-primary/30 hover:text-primary disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              refreshing
                ? "animate-spin"
                : ""
            }`}
          />
          Testar novamente
        </button>
      </div>
    </section>
  );
}

function HeroMetric({
  label,
  value,
}: {
  label: string;
  value:
    | string
    | number;
}) {
  return (
    <div className="min-w-[110px] rounded-2xl border border-white/10 bg-black/30 p-4 backdrop-blur-xl">
      <p className="text-2xl font-black text-white">
        {value}
      </p>

      <p className="mt-1 text-[8px] font-black uppercase tracking-[.14em] text-white/30">
        {label}
      </p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  critical = false,
}: {
  label: string;
  value:
    | string
    | number;
  icon:
    ComponentType<{
      className?: string;
    }>;
  critical?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        critical
          ? "border-red-400/20 bg-red-500/[.07]"
          : "border-white/10 bg-black/25"
      }`}
    >
      <Icon
        className={`h-5 w-5 ${
          critical
            ? "text-red-300"
            : "text-primary"
        }`}
      />

      <p className="mt-4 text-2xl font-black text-white">
        {value}
      </p>

      <p className="mt-1 text-[8px] font-black uppercase tracking-[.13em] text-white/30">
        {label}
      </p>
    </div>
  );
}

function StatusRow({
  label,
  value,
  ok,
}: {
  label: string;
  value:
    | string
    | number;
  ok: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[.025] p-4">
      <div className="flex items-center gap-3">
        {ok ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-300" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-amber-300" />
        )}

        <p className="text-sm font-bold text-white/50">
          {label}
        </p>
      </div>

      <p className="text-sm font-black text-white">
        {value}
      </p>
    </div>
  );
}

function ActionButton({
  label,
  description,
  disabled,
  loading,
  onClick,
}: {
  label: string;
  description: string;
  disabled: boolean;
  loading: boolean;
  onClick:
    () => void;
}) {
  return (
    <button
      type="button"
      disabled={
        disabled
      }
      onClick={
        onClick
      }
      className="group rounded-2xl border border-white/10 bg-white/[.025] p-4 text-left transition hover:border-primary/30 hover:bg-primary/[.06] disabled:cursor-not-allowed disabled:opacity-35"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Zap className="h-5 w-5" />
          )}
        </div>

        <div>
          <p className="font-black text-white">
            {label}
          </p>

          <p className="mt-1 text-xs leading-5 text-white/35">
            {description}
          </p>
        </div>
      </div>
    </button>
  );
}

function Empty() {
  return (
    <div className="flex min-h-[400px] items-center justify-center text-center">
      <div>
        <Settings2 className="mx-auto h-8 w-8 text-white/15" />

        <p className="mt-4 text-sm text-white/35">
          Seleciona um item para começar.
        </p>
      </div>
    </div>
  );
}

function EmptyList({
  icon: Icon,
  title,
  description,
}: {
  icon:
    ComponentType<{
      className?: string;
    }>;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 p-7 text-center">
      <Icon className="mx-auto h-8 w-8 text-white/15" />

      <p className="mt-4 font-black text-white/60">
        {title}
      </p>

      <p className="mx-auto mt-2 max-w-lg text-xs leading-5 text-white/30">
        {description}
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type =
    "text",
}: {
  label: string;
  value: string;
  onChange:
    (
      value: string,
    ) => void;
  type?: string;
}) {
  return (
    <label>
      <span className="text-[9px] font-black uppercase tracking-[.12em] text-white/30">
        {label}
      </span>

      <input
        type={
          type
        }
        value={
          value
        }
        onChange={(
          event,
        ) =>
          onChange(
            event.target
              .value,
          )
        }
        className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-white outline-none transition focus:border-primary/35"
      />
    </label>
  );
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange:
    (
      value: boolean,
    ) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-white/10 p-4 text-white/60">
      <span>
        {label}
      </span>

      <input
        type="checkbox"
        checked={
          checked
        }
        onChange={(
          event,
        ) =>
          onChange(
            event.target
              .checked,
          )
        }
        className="h-5 w-5 accent-primary"
      />
    </label>
  );
}

function CommandEditor({
  item,
  setItem,
  onSave,
  onToggle,
  saving,
  disabled,
}: {
  item:
    CommandConfig;
  setItem:
    (
      item:
        CommandConfig,
    ) => void;
  onSave:
    () => void;
  onToggle:
    () => void;
  saving:
    boolean;
  disabled:
    boolean;
}) {
  const access =
    item.access || {
      requireMilitaryRole:
        false,
      requirePointOpen:
        false,
      allowedRoleIds: [],
      deniedRoleIds: [],
      allowedChannelIds: [],
      deniedChannelIds: [],
      cooldownSeconds:
        0,
    };

  function updateAccess(
    key:
      keyof CommandConfig["access"],
    value: unknown,
  ) {
    setItem({
      ...item,

      access: {
        ...access,

        [key]:
          value,
      },
    });
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[.14em] text-primary">
            Configuração
          </p>

          <h2 className="mt-2 text-3xl font-black text-white">
            /{item.name}
          </h2>

          <p className="mt-2 text-xs text-white/30">
            {item.source
              ?.file ||
              "Ficheiro não comunicado pelo bot."}
          </p>
        </div>

        <button
          type="button"
          onClick={
            onToggle
          }
          disabled={
            disabled
          }
          className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-xs font-black disabled:opacity-40 ${
            item.enabled
              ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
              : "border-red-400/20 bg-red-500/10 text-red-300"
          }`}
        >
          {item.enabled ? (
            <ToggleRight className="h-5 w-5" />
          ) : (
            <ToggleLeft className="h-5 w-5" />
          )}

          {item.enabled
            ? "Ativo"
            : "Desativado"}
        </button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Field
          label="Descrição"
          value={
            item.description ||
            ""
          }
          onChange={(
            value,
          ) =>
            setItem({
              ...item,
              description:
                value,
            })
          }
        />

        <Field
          label="Categoria"
          value={
            item.category ||
            "GERAL"
          }
          onChange={(
            value,
          ) =>
            setItem({
              ...item,
              category:
                value.toUpperCase(),
            })
          }
        />

        <Field
          label="Roles autorizadas"
          value={
            (
              access.allowedRoleIds ||
              []
            ).join(
              ", ",
            )
          }
          onChange={(
            value,
          ) =>
            updateAccess(
              "allowedRoleIds",
              splitIds(
                value,
              ),
            )
          }
        />

        <Field
          label="Roles bloqueadas"
          value={
            (
              access.deniedRoleIds ||
              []
            ).join(
              ", ",
            )
          }
          onChange={(
            value,
          ) =>
            updateAccess(
              "deniedRoleIds",
              splitIds(
                value,
              ),
            )
          }
        />

        <Field
          label="Canais autorizados"
          value={
            (
              access.allowedChannelIds ||
              []
            ).join(
              ", ",
            )
          }
          onChange={(
            value,
          ) =>
            updateAccess(
              "allowedChannelIds",
              splitIds(
                value,
              ),
            )
          }
        />

        <Field
          label="Canais bloqueados"
          value={
            (
              access.deniedChannelIds ||
              []
            ).join(
              ", ",
            )
          }
          onChange={(
            value,
          ) =>
            updateAccess(
              "deniedChannelIds",
              splitIds(
                value,
              ),
            )
          }
        />

        <Field
          label="Cooldown em segundos"
          value={
            String(
              access.cooldownSeconds ||
              0,
            )
          }
          type="number"
          onChange={(
            value,
          ) =>
            updateAccess(
              "cooldownSeconds",
              Number(
                value ||
                0,
              ),
            )
          }
        />

        <label>
          <span className="text-[9px] font-black uppercase tracking-[.12em] text-white/30">
            Servidor
          </span>

          <select
            value={
              item.guildScope ||
              "MAIN"
            }
            onChange={(
              event,
            ) =>
              setItem({
                ...item,
                guildScope:
                  event.target
                    .value,
              })
            }
            className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-white outline-none transition focus:border-primary/35"
          >
            <option value="MAIN">
              Discord principal
            </option>

            <option value="SCHOOL">
              Escola da Guarda
            </option>

            <option value="BOTH">
              Ambos
            </option>

            <option value="GLOBAL">
              Global
            </option>
          </select>
        </label>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <Check
          label="Exigir role militar"
          checked={
            Boolean(
              access.requireMilitaryRole,
            )
          }
          onChange={(
            value,
          ) =>
            updateAccess(
              "requireMilitaryRole",
              value,
            )
          }
        />

        <Check
          label="Exigir ponto aberto"
          checked={
            Boolean(
              access.requirePointOpen,
            )
          }
          onChange={(
            value,
          ) =>
            updateAccess(
              "requirePointOpen",
              value,
            )
          }
        />

        <Check
          label="Auditoria ativa"
          checked={
            item.audit
              ?.enabled !==
            false
          }
          onChange={(
            value,
          ) =>
            setItem({
              ...item,

              audit: {
                ...item.audit,

                enabled:
                  value,

                logSuccess:
                  item.audit
                    ?.logSuccess !==
                  false,

                logFailure:
                  item.audit
                    ?.logFailure !==
                  false,

                includeOptions:
                  Boolean(
                    item.audit
                      ?.includeOptions,
                  ),
              },
            })
          }
        />

        <Check
          label="Registar opções utilizadas"
          checked={
            Boolean(
              item.audit
                ?.includeOptions,
            )
          }
          onChange={(
            value,
          ) =>
            setItem({
              ...item,

              audit: {
                ...item.audit,

                enabled:
                  item.audit
                    ?.enabled !==
                  false,

                logSuccess:
                  item.audit
                    ?.logSuccess !==
                  false,

                logFailure:
                  item.audit
                    ?.logFailure !==
                  false,

                includeOptions:
                  value,
              },
            })
          }
        />
      </div>

      <button
        type="button"
        onClick={
          onSave
        }
        disabled={
          saving ||
          disabled
        }
        className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 font-black text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40"
      >
        {saving ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Save className="h-5 w-5" />
        )}

        Guardar configuração
      </button>
    </div>
  );
}

function blankTemplate(): MessageTemplate {
  return {
    key: "",
    label:
      "Novo modelo",
    category:
      "GERAL",
    enabled:
      true,
    guildScope:
      "MAIN",
    mentionRoleId:
      null,
    channelId:
      null,

    payload: {
      content: "",

      embed: {
        title: "",
        description: "",
        color:
          "#7c3aed",
        imageUrl: "",
        thumbnailUrl:
          "",
        footer: "",
      },

      buttons: [],
    },
  };
}

function TemplateEditor({
  item,
  setItem,
  onSave,
  saving,
  disabled,
}: {
  item:
    MessageTemplate;
  setItem:
    (
      item:
        MessageTemplate,
    ) => void;
  onSave:
    () => void;
  saving:
    boolean;
  disabled:
    boolean;
}) {
  const embed =
    item.payload.embed;

  function updateEmbed(
    key:
      keyof MessageTemplate["payload"]["embed"],
    value: string,
  ) {
    setItem({
      ...item,

      payload: {
        ...item.payload,

        embed: {
          ...embed,

          [key]:
            value,
        },
      },
    });
  }

  return (
    <div>
      <h2 className="text-3xl font-black text-white">
        {item.label}
      </h2>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Field
          label="Chave"
          value={
            item.key
          }
          onChange={(
            value,
          ) =>
            setItem({
              ...item,

              key:
                value
                  .trim()
                  .toLowerCase()
                  .replace(
                    /\s+/g,
                    "_",
                  ),
            })
          }
        />

        <Field
          label="Nome"
          value={
            item.label
          }
          onChange={(
            value,
          ) =>
            setItem({
              ...item,
              label:
                value,
            })
          }
        />

        <Field
          label="Canal"
          value={
            item.channelId ||
            ""
          }
          onChange={(
            value,
          ) =>
            setItem({
              ...item,

              channelId:
                value ||
                null,
            })
          }
        />

        <Field
          label="Role mencionada"
          value={
            item.mentionRoleId ||
            ""
          }
          onChange={(
            value,
          ) =>
            setItem({
              ...item,

              mentionRoleId:
                value ||
                null,
            })
          }
        />

        <Field
          label="Título do embed"
          value={
            embed.title
          }
          onChange={(
            value,
          ) =>
            updateEmbed(
              "title",
              value,
            )
          }
        />

        <Field
          label="Cor"
          value={
            embed.color
          }
          onChange={(
            value,
          ) =>
            updateEmbed(
              "color",
              value,
            )
          }
        />
      </div>

      <textarea
        value={
          item.payload
            .content
        }
        onChange={(
          event,
        ) =>
          setItem({
            ...item,

            payload: {
              ...item.payload,

              content:
                event.target
                  .value,
            },
          })
        }
        className="mt-5 min-h-24 w-full rounded-2xl border border-white/10 bg-black/30 p-4 text-white outline-none transition focus:border-primary/35"
        placeholder="Conteúdo normal da mensagem"
      />

      <textarea
        value={
          embed.description
        }
        onChange={(
          event,
        ) =>
          updateEmbed(
            "description",
            event.target
              .value,
          )
        }
        className="mt-4 min-h-40 w-full rounded-2xl border border-white/10 bg-black/30 p-4 text-white outline-none transition focus:border-primary/35"
        placeholder="Descrição do embed"
      />

      <div
        className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-5"
        style={{
          borderLeftColor:
            embed.color,

          borderLeftWidth:
            4,
        }}
      >
        <p className="font-black text-white">
          {embed.title ||
            "Título"}
        </p>

        <p className="mt-2 whitespace-pre-wrap text-sm text-white/55">
          {embed.description ||
            "Descrição"}
        </p>
      </div>

      <button
        type="button"
        onClick={
          onSave
        }
        disabled={
          saving ||
          disabled ||
          !item.key
        }
        className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 font-black text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40"
      >
        {saving ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Save className="h-5 w-5" />
        )}

        Guardar modelo
      </button>
    </div>
  );
}
