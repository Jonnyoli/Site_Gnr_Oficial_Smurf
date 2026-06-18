import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from "express";

import mongoose from "mongoose";

import {
  DiscordOutbox,
  OperationalCP,
  OperationalPoint,
} from "../models/OperationalSync";

import {
  OperationalUser,
} from "../models/OperationalUser";

import SchoolDiscordMember from "../models/SchoolDiscordMember";
import SchoolExam from "../models/SchoolExam";

const router =
  Router();

const COMMAND_GENERAL_ROLE_ID =
  "1147878942099906672";

const DEV_USER_ID =
  "713719718091030599";

const SCHOOL_GUILD_ID =
  process.env.SCHOOL_GUILD_ID ||
  "1262916006980878468";

const MAIN_GUILD_ID =
  process.env.DISCORD_GUILD_ID ||
  process.env.GUILD_ID ||
  "";

const MILITARY_ROLE_ID =
  process.env.GNR_MILITARY_ROLE_ID ||
  "1147878941974077478";

const UNIT_ROLE_IDS = [
  "1147878941885988929", // UNT
  "1147878941927952470", // GSA
  "1147878941948923924", // NIC / ajustar se necessário
  "1147878941902893087", // GIOE / ajustar se necessário
  "1147878941919670363", // USHE / ajustar se necessário
  "1147878941915471993", // DI / ajustar se necessário
].filter(Boolean);

const BOT_HEARTBEAT_SECRET =
  process.env.BOT_HEARTBEAT_SECRET ||
  "";

function sessionUser(
  req: Request,
): any {
  return (
    req.session?.user ||
    null
  );
}

function sessionUserId(
  req: Request,
) {
  return String(
    sessionUser(req)?.id ||
    "",
  );
}

function sessionRoleIds(
  req: Request,
) {
  const current =
    sessionUser(req);

  const sources = [
    current?.roles,
    current?.roleIds,
    current?.guildRoles,
    current?.member?.roles,
  ];

  for (
    const source
    of sources
  ) {
    if (
      !Array.isArray(
        source,
      )
    ) {
      continue;
    }

    return source
      .map(
        (role: any) =>
          typeof role ===
          "string"
            ? role
            : String(
                role?.id ||
                role?.roleId ||
                "",
              ),
      )
      .filter(Boolean);
  }

  return [];
}

function requireCommand(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const userId =
    sessionUserId(req);

  const roles =
    sessionRoleIds(req);

  if (
    !userId
  ) {
    return void res.status(401).json({
      error:
        "É necessário iniciar sessão.",
    });
  }

  if (
    userId !==
      DEV_USER_ID &&
    !roles.includes(
      COMMAND_GENERAL_ROLE_ID,
    )
  ) {
    return void res.status(403).json({
      error:
        "Apenas o Comando-Geral pode aceder ao Centro de Estado.",
    });
  }

  next();
}

function nowIso() {
  return new Date()
    .toISOString();
}

function ageMs(
  value: unknown,
) {
  if (!value) {
    return null;
  }

  const date =
    new Date(
      String(value),
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return null;
  }

  return (
    Date.now() -
    date.getTime()
  );
}

function healthStatus(
  ok: boolean,
  degraded = false,
) {
  if (ok) {
    return "ONLINE";
  }

  return degraded
    ? "DEGRADED"
    : "OFFLINE";
}

async function collectionExists(
  name: string,
) {
  const db =
    mongoose.connection.db;

  if (!db) {
    return false;
  }

  const result =
    await db
      .listCollections(
        {
          name,
        },
        {
          nameOnly:
            true,
        },
      )
      .toArray();

  return result.length >
    0;
}

async function safeCollection(
  names: string[],
) {
  const db =
    mongoose.connection.db;

  if (!db) {
    return null;
  }

  for (
    const name
    of names
  ) {
    if (
      await collectionExists(
        name,
      )
    ) {
      return db.collection(
        name,
      );
    }
  }

  return null;
}

async function discordGuildCheck(
  guildId: string,
) {
  const startedAt =
    Date.now();

  const token =
    process.env.DISCORD_TOKEN ||
    process.env.TOKEN ||
    "";

  if (
    !token ||
    !guildId
  ) {
    return {
      status:
        "DEGRADED",
      latencyMs:
        null,
      detail:
        "TOKEN ou Guild ID não configurado.",
      checkedAt:
        nowIso(),
    };
  }

  try {
    const response =
      await fetch(
        `https://discord.com/api/v10/guilds/${guildId}`,
        {
          headers: {
            Authorization:
              `Bot ${token}`,
          },
        },
      );

    const latencyMs =
      Date.now() -
      startedAt;

    if (
      !response.ok
    ) {
      return {
        status:
          "OFFLINE",
        latencyMs,
        detail:
          `Discord respondeu ${response.status}.`,
        checkedAt:
          nowIso(),
      };
    }

    const guild =
      await response
        .json()
        .catch(
          () => null,
        );

    return {
      status:
        "ONLINE",
      latencyMs,
      detail:
        guild?.name ||
        `Guild ${guildId}`,
      checkedAt:
        nowIso(),
    };
  } catch (
    error: any
  ) {
    return {
      status:
        "OFFLINE",
      latencyMs:
        Date.now() -
        startedAt,
      detail:
        error?.message ||
        "Falha ao contactar o Discord.",
      checkedAt:
        nowIso(),
    };
  }
}

async function latestHeartbeat() {
  const collection =
    await safeCollection([
      "system_health_heartbeats",
      "systemhealthheartbeats",
    ]);

  if (!collection) {
    return null;
  }

  return collection.findOne(
    {
      service:
        "discord-bot",
    },
    {
      sort: {
        updatedAt:
          -1,
      },
    },
  );
}

async function writeHeartbeat(
  payload: any,
) {
  const db =
    mongoose.connection.db;

  if (!db) {
    throw new Error(
      "MongoDB indisponível.",
    );
  }

  const collection =
    db.collection(
      "system_health_heartbeats",
    );

  await collection.updateOne(
    {
      service:
        "discord-bot",
    },
    {
      $set: {
        service:
          "discord-bot",
        botUserId:
          payload?.botUserId ||
          null,
        botName:
          payload?.botName ||
          null,
        guildCount:
          Number(
            payload?.guildCount ||
            0,
          ),
        ping:
          Number(
            payload?.ping ||
            0,
          ),
        ready:
          payload?.ready ===
          true,
        metadata:
          payload?.metadata ||
          {},
        updatedAt:
          new Date(),
      },
      $setOnInsert: {
        createdAt:
          new Date(),
      },
    },
    {
      upsert:
        true,
    },
  );
}

function alertItem(
  data: {
    key: string;
    severity:
      | "INFO"
      | "WARNING"
      | "CRITICAL";
    title: string;
    description: string;
    count?: number;
    target?: string | null;
    action?: string | null;
    metadata?: Record<
      string,
      any
    >;
  },
) {
  return {
    key:
      data.key,
    severity:
      data.severity,
    title:
      data.title,
    description:
      data.description,
    count:
      Number(
        data.count ||
        0,
      ),
    target:
      data.target ||
      null,
    action:
      data.action ||
      null,
    metadata:
      data.metadata ||
      {},
  };
}

router.post(
  "/bot-heartbeat",
  async (
    req,
    res,
  ) => {
    if (
      !BOT_HEARTBEAT_SECRET ||
      String(
        req.get(
          "x-bot-heartbeat-secret",
        ) ||
        "",
      ) !==
        BOT_HEARTBEAT_SECRET
    ) {
      return res
        .status(401)
        .json({
          error:
            "Heartbeat não autorizado.",
        });
    }

    try {
      await writeHeartbeat(
        req.body ||
        {},
      );

      res.json({
        ok: true,
        receivedAt:
          nowIso(),
      });
    } catch (
      error: any
    ) {
      res.status(500).json({
        error:
          error?.message ||
          "Não foi possível guardar o heartbeat.",
      });
    }
  },
);

router.get(
  "/summary",
  requireCommand,
  async (
    _req,
    res,
  ) => {
    const requestStartedAt =
      Date.now();

    try {
      const dbReady =
        mongoose.connection
          .readyState ===
        1;

      const [
        mainDiscord,
        schoolDiscord,
        heartbeat,
        outboxCounts,
        openPoints,
        openCps,
        failedPointSyncs,
        failedCpSyncs,
        lastPointSync,
        lastCpSync,
        lastSchoolSync,
        activeUsers,
      ] =
        await Promise.all([
          discordGuildCheck(
            MAIN_GUILD_ID,
          ),

          discordGuildCheck(
            SCHOOL_GUILD_ID,
          ),

          latestHeartbeat(),

          DiscordOutbox.aggregate([
            {
              $group: {
                _id:
                  "$status",
                count: {
                  $sum: 1,
                },
              },
            },
          ]),

          OperationalPoint.countDocuments({
            status:
              "ABERTO",
          }),

          OperationalCP.countDocuments({
            status:
              "ABERTO",
          }),

          OperationalPoint.countDocuments({
            "discord.syncError": {
              $nin: [
                null,
                "",
              ],
            },
          }),

          OperationalCP.countDocuments({
            "discord.syncError": {
              $nin: [
                null,
                "",
              ],
            },
          }),

          OperationalPoint.findOne({
            "discord.lastSyncedAt": {
              $ne:
                null,
            },
          })
            .sort({
              "discord.lastSyncedAt":
                -1,
            })
            .select({
              "discord.lastSyncedAt":
                1,
            })
            .lean(),

          OperationalCP.findOne({
            "discord.lastSyncedAt": {
              $ne:
                null,
            },
          })
            .sort({
              "discord.lastSyncedAt":
                -1,
            })
            .select({
              "discord.lastSyncedAt":
                1,
            })
            .lean(),

          SchoolDiscordMember.findOne({
            guildId:
              SCHOOL_GUILD_ID,
            isInGuild:
              true,
          })
            .sort({
              syncedAt:
                -1,
            })
            .select({
              syncedAt:
                1,
            })
            .lean(),

          OperationalUser.countDocuments({
            isInGuild:
              true,
            isMilitar:
              true,
            $or: [
              {
                activePontoId: {
                  $ne:
                    null,
                },
              },
              {
                activePatrulhaId: {
                  $ne:
                    null,
                },
              },
            ],
          }),
        ]);

      const outbox =
        Object.fromEntries(
          outboxCounts.map(
            (
              item: any,
            ) => [
              String(
                item._id ||
                "UNKNOWN",
              ),
              Number(
                item.count ||
                0,
              ),
            ],
          ),
        );

      const pendingOutbox =
        Number(
          outbox.PENDING ||
          0,
        );

      const processingOutbox =
        Number(
          outbox.PROCESSING ||
          0,
        );

      const failedOutbox =
        Number(
          outbox.FAILED ||
          0,
        );

      const heartbeatAge =
        ageMs(
          heartbeat?.updatedAt,
        );

      const botOnline =
        heartbeat?.ready ===
          true &&
        heartbeatAge !==
          null &&
        heartbeatAge <
          90_000;

      const lastSyncCandidates = [
        lastPointSync
          ?.discord
          ?.lastSyncedAt,
        lastCpSync
          ?.discord
          ?.lastSyncedAt,
        lastSchoolSync
          ?.syncedAt,
      ]
        .filter(Boolean)
        .map(
          (value) =>
            new Date(
              value as any,
            ),
        )
        .filter(
          (value) =>
            !Number.isNaN(
              value.getTime(),
            ),
        )
        .sort(
          (
            a,
            b,
          ) =>
            b.getTime() -
            a.getTime(),
        );

      const responseTimeMs =
        Date.now() -
        requestStartedAt;

      res.setHeader(
        "Cache-Control",
        "private, no-store, max-age=0",
      );

      return res.json({
        generatedAt:
          nowIso(),

        overall:
          failedOutbox >
            0 ||
          !dbReady ||
          mainDiscord.status ===
            "OFFLINE"
            ? "ATTENTION"
            : "HEALTHY",

        services: {
          mongodb: {
            status:
              healthStatus(
                dbReady,
              ),
            detail:
              dbReady
                ? mongoose.connection
                    .name ||
                  "Ligação ativa"
                : `readyState=${mongoose.connection.readyState}`,
            latencyMs:
              null,
          },

          discordMain:
            mainDiscord,

          discordSchool:
            schoolDiscord,

          bot: {
            status:
              botOnline
                ? "ONLINE"
                : heartbeat
                  ? "DEGRADED"
                  : "UNKNOWN",
            detail:
              botOnline
                ? heartbeat
                    ?.botName ||
                  "Heartbeat ativo"
                : heartbeat
                  ? "Heartbeat atrasado."
                  : "Heartbeat ainda não configurado.",
            latencyMs:
              Number(
                heartbeat
                  ?.ping ||
                0,
              ),
            lastSeenAt:
              heartbeat
                ?.updatedAt ||
              null,
            guildCount:
              Number(
                heartbeat
                  ?.guildCount ||
                0,
              ),
          },

          api: {
            status:
              "ONLINE",
            detail:
              "API operacional",
            latencyMs:
              responseTimeMs,
            checkedAt:
              nowIso(),
          },
        },

        metrics: {
          pendingOutbox,
          processingOutbox,
          failedOutbox,
          syncFailures:
            Number(
              failedPointSyncs ||
              0,
            ) +
            Number(
              failedCpSyncs ||
              0,
            ),
          openPoints:
            Number(
              openPoints ||
              0,
            ),
          openCps:
            Number(
              openCps ||
              0,
            ),
          activeUsers:
            Number(
              activeUsers ||
              0,
            ),
          apiResponseMs:
            responseTimeMs,
          lastSyncAt:
            lastSyncCandidates[0]
              ?.toISOString() ||
            null,
          lastSchoolSyncAt:
            lastSchoolSync
              ?.syncedAt ||
            null,
        },
      });
    } catch (
      error: any
    ) {
      console.error(
        "[SYSTEM HEALTH SUMMARY]",
        error,
      );

      return res
        .status(500)
        .json({
          error:
            error?.message ||
            "Não foi possível calcular o estado da Central.",
        });
    }
  },
);

router.get(
  "/alerts",
  requireCommand,
  async (
    _req,
    res,
  ) => {
    try {
      const now =
        new Date();

      const blockedBefore =
        new Date(
          Date.now() -
          5 * 60 * 1000,
        );

      const longPointBefore =
        new Date(
          Date.now() -
          12 *
            60 *
            60 *
            1000,
        );

      const examBefore =
        new Date(
          Date.now() -
          3 *
            24 *
            60 *
            60 *
            1000,
        );

      const [
        blockedOutbox,
        failedOutbox,
        staleSchoolSync,
        membersWithoutName,
        membersWithoutAvatar,
        longOpenPoints,
        cpsWithoutCommander,
        pendingExams,
        invalidUnitMembers,
      ] =
        await Promise.all([
          DiscordOutbox.countDocuments({
            status: {
              $in: [
                "PENDING",
                "PROCESSING",
              ],
            },
            updatedAt: {
              $lt:
                blockedBefore,
            },
          }),

          DiscordOutbox.countDocuments({
            status:
              "FAILED",
          }),

          SchoolDiscordMember.findOne({
            guildId:
              SCHOOL_GUILD_ID,
            isInGuild:
              true,
          })
            .sort({
              syncedAt:
                -1,
            })
            .select({
              syncedAt:
                1,
            })
            .lean(),

          OperationalUser.countDocuments({
            isInGuild:
              true,
            isMilitar:
              true,
            $or: [
              {
                warName:
                  null,
              },
              {
                warName:
                  "",
              },
              {
                displayName:
                  null,
              },
              {
                displayName:
                  "",
              },
            ],
          }),

          OperationalUser.countDocuments({
            isInGuild:
              true,
            isMilitar:
              true,
            $or: [
              {
                avatarUrl:
                  null,
              },
              {
                avatarUrl:
                  "",
              },
            ],
          }),

          OperationalPoint.countDocuments({
            status:
              "ABERTO",
            startTime: {
              $lt:
                longPointBefore,
            },
          }),

          OperationalCP.countDocuments({
            status:
              "ABERTO",
            $or: [
              {
                commanderId:
                  null,
              },
              {
                commanderId:
                  "",
              },
            ],
          }),

          SchoolExam.countDocuments({
            status: {
              $in: [
                "REQUESTED",
                "SCHEDULED",
              ],
            },
            requestedAt: {
              $lt:
                examBefore,
            },
          }),

          OperationalUser.countDocuments({
            isInGuild:
              true,
            isMilitar: {
              $ne:
                true,
            },
            savedTags: {
              $in:
                UNIT_ROLE_IDS,
            },
          }),
        ]);

      const alerts: any[] =
        [];

      if (
        blockedOutbox >
        0
      ) {
        alerts.push(
          alertItem({
            key:
              "OUTBOX_BLOCKED",
            severity:
              "CRITICAL",
            title:
              "Outbox bloqueada",
            description:
              "Existem tarefas pendentes ou em processamento há mais de 5 minutos.",
            count:
              blockedOutbox,
            target:
              "/discord/sincronizacao",
            action:
              "Ver tarefas",
          }),
        );
      }

      if (
        failedOutbox >
        0
      ) {
        alerts.push(
          alertItem({
            key:
              "OUTBOX_FAILED",
            severity:
              "CRITICAL",
            title:
              "Jobs de sincronização falhados",
            description:
              "Existem tarefas que atingiram o limite de tentativas.",
            count:
              failedOutbox,
            target:
              "/discord",
            action:
              "Tentar novamente",
          }),
        );
      }

      const schoolSyncAge =
        ageMs(
          staleSchoolSync
            ?.syncedAt,
        );

      if (
        schoolSyncAge ===
          null ||
        schoolSyncAge >
          10 *
            60 *
            1000
      ) {
        alerts.push(
          alertItem({
            key:
              "SCHOOL_SYNC_STALE",
            severity:
              "WARNING",
            title:
              "Sincronização da Escola atrasada",
            description:
              staleSchoolSync
                ?.syncedAt
                ? "A guild da Escola não sincroniza há mais de 10 minutos."
                : "Ainda não existe uma sincronização válida da Escola.",
            count: 1,
            target:
              "/escola/gestao",
            action:
              "Ver Escola",
            metadata: {
              lastSyncedAt:
                staleSchoolSync
                  ?.syncedAt ||
                null,
            },
          }),
        );
      }

      if (
        membersWithoutName >
        0
      ) {
        alerts.push(
          alertItem({
            key:
              "MEMBERS_WITHOUT_NAME",
            severity:
              "WARNING",
            title:
              "Militares sem nome sincronizado",
            description:
              "Existem elementos ativos sem nome de guerra ou nome visível.",
            count:
              membersWithoutName,
            target:
              "/gestao-efetivo",
            action:
              "Abrir Efetivo",
          }),
        );
      }

      if (
        membersWithoutAvatar >
        0
      ) {
        alerts.push(
          alertItem({
            key:
              "MEMBERS_WITHOUT_AVATAR",
            severity:
              "INFO",
            title:
              "Militares sem avatar",
            description:
              "Alguns elementos não têm avatar guardado na Central.",
            count:
              membersWithoutAvatar,
            target:
              "/gestao-efetivo",
            action:
              "Ver elementos",
          }),
        );
      }

      if (
        longOpenPoints >
        0
      ) {
        alerts.push(
          alertItem({
            key:
              "POINTS_TOO_LONG",
            severity:
              "CRITICAL",
            title:
              "Pontos abertos há demasiado tempo",
            description:
              "Existem pontos em serviço há mais de 12 horas.",
            count:
              longOpenPoints,
            target:
              "/pontos/admin",
            action:
              "Gerir pontos",
          }),
        );
      }

      if (
        cpsWithoutCommander >
        0
      ) {
        alerts.push(
          alertItem({
            key:
              "CP_WITHOUT_COMMANDER",
            severity:
              "CRITICAL",
            title:
              "CP sem comandante",
            description:
              "Existem companhias abertas sem comandante associado.",
            count:
              cpsWithoutCommander,
            target:
              "/cps",
            action:
              "Abrir CPs",
          }),
        );
      }

      if (
        pendingExams >
        0
      ) {
        alerts.push(
          alertItem({
            key:
              "SCHOOL_EXAMS_PENDING",
            severity:
              "WARNING",
            title:
              "Exames pendentes há vários dias",
            description:
              "Existem pedidos de Exame Final sem decisão há mais de 3 dias.",
            count:
              pendingExams,
            target:
              "/escola/gestao",
            action:
              "Gerir exames",
          }),
        );
      }

      if (
        invalidUnitMembers >
        0
      ) {
        alerts.push(
          alertItem({
            key:
              "UNIT_ROLE_OUTSIDE_EFFECTIVE",
            severity:
              "WARNING",
            title:
              "Role de unidade fora do Efetivo",
            description:
              "Existem utilizadores com role de unidade que não estão marcados como militares atuais.",
            count:
              invalidUnitMembers,
            target:
              "/unidades",
            action:
              "Ver unidades",
          }),
        );
      }

      const productCollection =
        await safeCollection([
          "storeproducts",
          "store_products",
        ]);

      if (
        productCollection
      ) {
        const [
          noImage,
          noCategory,
        ] =
          await Promise.all([
            productCollection.countDocuments({
              active: {
                $ne:
                  false,
              },
              $or: [
                {
                  image:
                    null,
                },
                {
                  image:
                    "",
                },
                {
                  image: {
                    $exists:
                      false,
                  },
                },
              ],
            }),

            productCollection.countDocuments({
              active: {
                $ne:
                  false,
              },
              $or: [
                {
                  category:
                    null,
                },
                {
                  category:
                    "",
                },
                {
                  category: {
                    $exists:
                      false,
                  },
                },
              ],
            }),
          ]);

        if (
          noImage >
          0
        ) {
          alerts.push(
            alertItem({
              key:
                "STORE_PRODUCTS_NO_IMAGE",
              severity:
                "WARNING",
              title:
                "Produtos sem imagem",
              description:
                "Existem produtos ativos sem imagem configurada.",
              count:
                noImage,
              target:
                "/definicoes",
              action:
                "Gerir catálogo",
            }),
          );
        }

        if (
          noCategory >
          0
        ) {
          alerts.push(
            alertItem({
              key:
                "STORE_PRODUCTS_NO_CATEGORY",
              severity:
                "WARNING",
              title:
                "Produtos sem categoria",
              description:
                "Existem produtos ativos sem categoria definida.",
              count:
                noCategory,
              target:
                "/definicoes",
              action:
                "Gerir catálogo",
            }),
          );
        }
      }

      const inventoryCollection =
        await safeCollection([
          "storeinventories",
          "store_inventories",
        ]);

      if (
        inventoryCollection
      ) {
        const creditMismatches =
          await inventoryCollection.countDocuments({
            lastReconciliationStatus:
              "MISMATCH",
          });

        if (
          creditMismatches >
          0
        ) {
          alerts.push(
            alertItem({
              key:
                "STORE_CREDIT_MISMATCH",
              severity:
                "CRITICAL",
              title:
                "Créditos inconsistentes",
              description:
                "A reconciliação detetou contas cujo saldo não coincide com o histórico.",
              count:
                creditMismatches,
              target:
                "/definicoes",
              action:
                "Abrir gestão de créditos",
            }),
          );
        }
      }

      alerts.sort(
        (
          a,
          b,
        ) => {
          const weight: any = {
            CRITICAL:
              3,
            WARNING:
              2,
            INFO:
              1,
          };

          return (
            weight[
              b.severity
            ] -
            weight[
              a.severity
            ]
          );
        },
      );

      res.json({
        generatedAt:
          now.toISOString(),
        items:
          alerts,
        totals: {
          critical:
            alerts.filter(
              (item) =>
                item.severity ===
                "CRITICAL",
            ).length,
          warning:
            alerts.filter(
              (item) =>
                item.severity ===
                "WARNING",
            ).length,
          info:
            alerts.filter(
              (item) =>
                item.severity ===
                "INFO",
            ).length,
        },
      });
    } catch (
      error: any
    ) {
      console.error(
        "[SYSTEM HEALTH ALERTS]",
        error,
      );

      res.status(500).json({
        error:
          error?.message ||
          "Não foi possível calcular os alertas.",
      });
    }
  },
);

router.get(
  "/outbox",
  requireCommand,
  async (
    req,
    res,
  ) => {
    try {
      const status =
        String(
          req.query.status ||
          "ALL",
        ).toUpperCase();

      const query: any =
        {};

      if (
        status !==
        "ALL"
      ) {
        query.status =
          status;
      }

      const jobs =
        await DiscordOutbox.find(
          query,
        )
          .sort({
            status: 1,
            updatedAt:
              -1,
          })
          .limit(200)
          .lean();

      const pointIds =
        jobs
          .filter(
            (job: any) =>
              job.aggregateType ===
              "POINT",
          )
          .map(
            (job: any) =>
              job.aggregateId,
          );

      const cpIds =
        jobs
          .filter(
            (job: any) =>
              job.aggregateType ===
              "CP",
          )
          .map(
            (job: any) =>
              job.aggregateId,
          );

      const [
        points,
        cps,
      ] =
        await Promise.all([
          OperationalPoint.find({
            _id: {
              $in:
                pointIds,
            },
          })
            .select({
              userId: 1,
              status: 1,
              discord: 1,
            })
            .lean(),

          OperationalCP.find({
            _id: {
              $in:
                cpIds,
            },
          })
            .select({
              number: 1,
              status: 1,
              discord: 1,
            })
            .lean(),
        ]);

      const pointMap =
        new Map(
          points.map(
            (item: any) => [
              String(
                item._id,
              ),
              item,
            ],
          ),
        );

      const cpMap =
        new Map(
          cps.map(
            (item: any) => [
              String(
                item._id,
              ),
              item,
            ],
          ),
        );

      const userIds =
        points
          .map(
            (item: any) =>
              String(
                item.userId ||
                "",
              ),
          )
          .filter(Boolean);

      const users =
        await OperationalUser.find({
          discordId: {
            $in:
              userIds,
          },
        })
          .select({
            discordId: 1,
            warName: 1,
            displayName: 1,
            username: 1,
          })
          .lean();

      const userMap =
        new Map(
          users.map(
            (item: any) => [
              String(
                item.discordId,
              ),
              item.warName ||
              item.displayName ||
              item.username ||
              item.discordId,
            ],
          ),
        );

      const items =
        jobs.map(
          (job: any) => {
            const aggregate =
              job.aggregateType ===
              "POINT"
                ? pointMap.get(
                    String(
                      job.aggregateId,
                    ),
                  )
                : cpMap.get(
                    String(
                      job.aggregateId,
                    ),
                  );

            return {
              ...job,
              id:
                String(
                  job._id,
                ),
              label:
                job.aggregateType ===
                "POINT"
                  ? `Ponto de ${
                      userMap.get(
                        String(
                          aggregate
                            ?.userId ||
                          "",
                        ),
                      ) ||
                      aggregate
                        ?.userId ||
                      job.aggregateId
                    }`
                  : `CP ${
                      aggregate
                        ?.number ||
                      job.aggregateId
                    }`,
              aggregateStatus:
                aggregate
                  ?.status ||
                null,
              jumpUrl:
                aggregate
                  ?.discord
                  ?.publicJumpUrl ||
                aggregate
                  ?.discord
                  ?.jumpUrl ||
                null,
            };
          },
        );

      res.json({
        items,
        total:
          items.length,
      });
    } catch (
      error: any
    ) {
      res.status(500).json({
        error:
          error?.message ||
          "Não foi possível carregar a outbox.",
      });
    }
  },
);

router.post(
  "/outbox/:id/retry",
  requireCommand,
  async (
    req,
    res,
  ) => {
    try {
      const job =
        await DiscordOutbox.findById(
          req.params.id,
        );

      if (!job) {
        return void res.status(404).json({
          error:
            "Tarefa não encontrada.",
        });
      }

      job.status =
        "PENDING";
      job.lockedAt =
        null;
      job.availableAt =
        new Date();
      job.lastError =
        null;

      /*
       * Mantemos tentativas para auditoria.
       * O worker incrementa novamente ao reclamar a tarefa.
       */
      await job.save();

      res.json({
        ok: true,
        job,
      });
    } catch (
      error: any
    ) {
      res.status(500).json({
        error:
          error?.message ||
          "Não foi possível tentar novamente.",
      });
    }
  },
);

router.post(
  "/outbox/retry-all",
  requireCommand,
  async (
    _req,
    res,
  ) => {
    try {
      const result =
        await DiscordOutbox.updateMany(
          {
            status: {
              $in: [
                "FAILED",
                "PENDING",
              ],
            },
          },
          {
            $set: {
              status:
                "PENDING",
              lockedAt:
                null,
              availableAt:
                new Date(),
              lastError:
                null,
            },
          },
        );

      res.json({
        ok: true,
        modifiedCount:
          result.modifiedCount ||
          0,
      });
    } catch (
      error: any
    ) {
      res.status(500).json({
        error:
          error?.message ||
          "Não foi possível reenviar as tarefas.",
      });
    }
  },
);

export default router;
