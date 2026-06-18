import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";

import GuardProfile from "../models/GuardProfile.js";
import {
  StoreInventory,
  SergeantEvaluation,
} from "../models/index.js";

import {
  OperationalUser,
} from "../models/OperationalUser.js";

import {
  OperationalPoint,
  OperationalCP,
} from "../models/OperationalSync.js";

import SchoolQuizAttempt from "../models/SchoolQuizAttempt.js";
import SchoolTrainingRecord from "../models/SchoolTrainingRecord.js";
import SchoolExam from "../models/SchoolExam.js";
import SchoolCertificate from "../models/SchoolCertificate.js";
import HierarchicalEvaluation from "../models/HierarchicalEvaluation.js";

const router = Router();

const DISCORD_MEDALS = [
  {
    id: "1168345896405184654",
    emoji: "🏆",
    name:
      "Medalha da Ordem Militar da Torre e Espada, do Valor, Lealdade e Mérito",
    shortName:
      "Torre e Espada",
    points: 600,
    order: 1,
  },
  {
    id: "1168346129214214214",
    emoji: "🏅",
    name:
      "Medalha da Ordem Militar de Cristo",
    shortName:
      "Cristo",
    points: 500,
    order: 2,
  },
  {
    id: "1168346179298410576",
    emoji: "🏅",
    name:
      "Medalha da Ordem Militar de Avis",
    shortName:
      "Avis",
    points: 400,
    order: 3,
  },
  {
    id: "1168346223388917882",
    emoji: "🥇",
    name:
      "Medalha da Ordem do Infante D. Henrique",
    shortName:
      "Infante D. Henrique",
    points: 300,
    order: 4,
  },
  {
    id: "1168346580387115048",
    emoji: "🥈",
    name:
      "Medalha da Ordem da Liberdade",
    shortName:
      "Liberdade",
    points: 200,
    order: 5,
  },
  {
    id: "1370560745368060045",
    emoji: "🥉",
    name:
      "Medalha por Serviços Distintos de Segurança Pública",
    shortName:
      "Serviços Distintos",
    points: 100,
    order: 6,
  },
] as const;

function currentUser(req: Request) {
  return req.session?.user || null;
}

function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!currentUser(req)) {
    res.status(401).json({
      error:
        "É necessário iniciar sessão.",
    });

    return;
  }

  next();
}

function internalBaseUrl() {
  const explicit =
    String(
      process.env.API_INTERNAL_URL ||
      "",
    ).replace(/\/$/, "");

  if (explicit) {
    return explicit;
  }

  const port =
    process.env.PORT ||
    "3000";

  return `http://127.0.0.1:${port}`;
}

async function internalJson(
  req: Request,
  path: string,
) {
  const response =
    await fetch(
      `${internalBaseUrl()}${path}`,
      {
        headers: {
          Accept:
            "application/json",
          Cookie:
            req.headers.cookie ||
            "",
        },
      },
    );

  const payload =
    await response
      .json()
      .catch(
        () => null,
      );

  if (!response.ok) {
    const error: any =
      new Error(
        payload?.error ||
        `Pedido interno ${path} respondeu ${response.status}.`,
      );

    error.status =
      response.status;

    throw error;
  }

  return payload;
}

function normalizeRoleId(
  value: any,
): string | null {
  if (!value) {
    return null;
  }

  if (
    typeof value ===
      "string" ||
    typeof value ===
      "number"
  ) {
    return String(value);
  }

  if (
    typeof value ===
    "object"
  ) {
    const id =
      value.id ||
      value.roleId ||
      value._id ||
      value.value;

    return id
      ? String(id)
      : null;
  }

  return null;
}

function collectCurrentRoleIds(
  guard: any,
  operationalUser: any,
) {
  const sources = [
    operationalUser?.savedTags,
    guard?.roles,
    guard?.roleIds,
    guard?.savedTags,
    guard?.discordRoles,
    guard?.discordTags,
  ];

  return [
    ...new Set(
      sources
        .flatMap(
          (source) =>
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
            Boolean(roleId),
        ),
    ),
  ];
}

function durationMs(
  point: any,
  now =
    new Date(),
) {
  if (
    !point?.startTime
  ) {
    return 0;
  }

  const start =
    new Date(
      point.startTime,
    );

  const end =
    point.endTime
      ? new Date(
          point.endTime,
        )
      : now;

  if (
    Number.isNaN(
      start.getTime(),
    ) ||
    Number.isNaN(
      end.getTime(),
    )
  ) {
    return 0;
  }

  let paused =
    Number(
      point.totalPauseTime ||
      0,
    );

  if (
    point.isPaused &&
    point.lastPauseTime
  ) {
    paused +=
      now.getTime() -
      new Date(
        point.lastPauseTime,
      ).getTime();
  }

  return Math.max(
    0,
    end.getTime() -
      start.getTime() -
      paused,
  );
}

function summarizeHours(
  records: any[],
) {
  const total =
    records.reduce(
      (
        value,
        record,
      ) =>
        value +
        Number(
          record.horasRegistadas ||
          0,
        ),
      0,
    );

  const normal =
    records.reduce(
      (
        value,
        record,
      ) =>
        value +
        Number(
          record.horasNormais ||
          0,
        ),
      0,
    );

  const night =
    records.reduce(
      (
        value,
        record,
      ) =>
        value +
        Number(
          record.horasNoturnas ||
          0,
        ),
      0,
    );

  return {
    total:
      Number(
        total.toFixed(2),
      ),
    normal:
      Number(
        normal.toFixed(2),
      ),
    night:
      Number(
        night.toFixed(2),
      ),
    records:
      records.length,
  };
}

function careerGroups(
  events: any[],
) {
  const sorted =
    [...events].sort(
      (
        a,
        b,
      ) =>
        new Date(
          b.data ||
          0,
        ).getTime() -
        new Date(
          a.data ||
          0,
        ).getTime(),
    );

  return {
    events:
      sorted,
    promotions:
      sorted.filter(
        (item) =>
          item.tipo ===
          "PROMOCAO",
      ),
    demotions:
      sorted.filter(
        (item) =>
          item.tipo ===
          "DESPROMOCAO",
      ),
    medals:
      sorted.filter(
        (item) =>
          item.tipo ===
          "MEDALHA",
      ),
    unitChanges:
      sorted.filter(
        (item) =>
          [
            "ENTRADA_UNIDADE",
            "SAIDA_UNIDADE",
          ].includes(
            item.tipo,
          ),
      ),
    roleChanges:
      sorted.filter(
        (item) =>
          [
            "CARGO_ADICIONADO",
            "CARGO_REMOVIDO",
            "CARGO",
          ].includes(
            item.tipo,
          ),
      ),
  };
}

function cpIncludesUser(
  cp: any,
  discordId: string,
) {
  if (
    String(
      cp?.commanderId ||
      "",
    ) ===
    discordId
  ) {
    return true;
  }

  if (
    Array.isArray(
      cp?.members,
    ) &&
    cp.members.some(
      (member: any) =>
        String(
          member?.userId ||
          "",
        ) ===
        discordId,
    )
  ) {
    return true;
  }

  return String(
    cp?.participants ||
    "",
  ).includes(
    discordId,
  );
}

function serializePoint(
  point: any,
) {
  return {
    ...point,
    id:
      String(
        point?._id ||
        point?.id ||
        "",
      ),
    durationMs:
      durationMs(
        point,
      ),
  };
}

function serializeCP(
  cp: any,
  discordId: string,
) {
  const members =
    Array.isArray(
      cp?.members,
    )
      ? cp.members
      : [];

  return {
    ...cp,
    id:
      String(
        cp?._id ||
        cp?.id ||
        "",
      ),
    isCommander:
      String(
        cp?.commanderId ||
        "",
      ) ===
      discordId,
    memberRecord:
      members.find(
        (member: any) =>
          String(
            member?.userId ||
            "",
          ) ===
          discordId,
      ) ||
      null,
  };
}

router.get(
  "/:discordId/full",
  requireAuth,
  async (
    req,
    res,
  ) => {
    const discordId =
      String(
        req.params.discordId ||
        "",
      ).trim();

    if (
      !/^\d{17,20}$/.test(
        discordId,
      )
    ) {
      return res
        .status(400)
        .json({
          error:
            "Discord ID inválido.",
        });
    }

    try {
      const [
        guardsResult,
        hoursResult,
        careerResult,
        disciplinaryResult,
        profile,
        inventory,
        operationalUser,
        points,
        cps,
        quizAttempts,
        legacyTrainings,
        exams,
        certificates,
        sergeantEvaluations,
        hierarchicalEvaluations,
      ] =
        await Promise.all([
          internalJson(
            req,
            "/api/data/guardas",
          ).catch(
            () => [],
          ),

          internalJson(
            req,
            "/api/data/horas",
          ).catch(
            () => [],
          ),

          internalJson(
            req,
            "/api/data/carreira",
          ).catch(
            () => [],
          ),

          internalJson(
            req,
            `/api/disciplinary/guard/${encodeURIComponent(
              discordId,
            )}`,
          ).catch(
            () => ({
              items: [],
            }),
          ),

          GuardProfile.findOne({
            discordId,
          }).lean(),

          StoreInventory.findOne({
            userId:
              discordId,
          }).lean(),

          OperationalUser.findOne({
            discordId,
          }).lean(),

          OperationalPoint.find({
            userId:
              discordId,
          })
            .sort({
              startTime:
                -1,
            })
            .limit(
              1000,
            )
            .lean(),

          OperationalCP.find({
            $or: [
              {
                commanderId:
                  discordId,
              },
              {
                members: {
                  $elemMatch: {
                    userId:
                      discordId,
                  },
                },
              },
              {
                participants: {
                  $regex:
                    discordId,
                },
              },
            ],
          })
            .sort({
              startTime:
                -1,
            })
            .limit(
              500,
            )
            .lean(),

          SchoolQuizAttempt.find({
            studentId:
              discordId,
          })
            .sort({
              createdAt:
                -1,
            })
            .lean(),

          SchoolTrainingRecord.find({
            studentId:
              discordId,
          })
            .sort({
              completedAt:
                -1,
              createdAt:
                -1,
            })
            .lean(),

          SchoolExam.find({
            studentId:
              discordId,
          })
            .sort({
              createdAt:
                -1,
            })
            .lean(),

          SchoolCertificate.find({
            studentId:
              discordId,
          })
            .sort({
              issuedAt:
                -1,
              createdAt:
                -1,
            })
            .lean(),

          SergeantEvaluation.find({
            evaluatedDiscordId:
              discordId,
            status:
              "APPROVED",
          })
            .sort({
              createdAt:
                -1,
            })
            .limit(
              250,
            )
            .lean(),

          HierarchicalEvaluation.find({
            evaluatedDiscordId:
              discordId,
          })
            .sort({
              createdAt:
                -1,
            })
            .limit(
              250,
            )
            .lean(),
        ]);

      const guards =
        Array.isArray(
          guardsResult,
        )
          ? guardsResult
          : [];

      const guard =
        guards.find(
          (item: any) =>
            String(
              item?.discordId ||
              item?.id ||
              "",
            ) ===
            discordId,
        ) ||
        null;

      const currentRoleIds =
        collectCurrentRoleIds(
          guard,
          operationalUser,
        );

      const currentMedals =
        DISCORD_MEDALS
          .filter(
            (medal) =>
              currentRoleIds.includes(
                medal.id,
              ),
          )
          .sort(
            (
              a,
              b,
            ) =>
              a.order -
              b.order,
          );

      const medalPoints =
        currentMedals.reduce(
          (
            total,
            medal,
          ) =>
            total +
            medal.points,
          0,
        );

      const allHours =
        (
          Array.isArray(
            hoursResult,
          )
            ? hoursResult
            : []
        ).filter(
          (item: any) =>
            String(
              item?.guardaId ||
              "",
            ) ===
            discordId,
        );

      const allCareer =
        (
          Array.isArray(
            careerResult,
          )
            ? careerResult
            : []
        ).filter(
          (item: any) =>
            String(
              item?.userId ||
              "",
            ) ===
            discordId,
        );

      const disciplinaryItems =
        Array.isArray(
          disciplinaryResult,
        )
          ? disciplinaryResult
          : Array.isArray(
                disciplinaryResult
                  ?.items,
              )
            ? disciplinaryResult.items
            : [];

      const openPoint =
        points.find(
          (point: any) =>
            point.status ===
            "ABERTO",
        ) ||
        null;

      const activeCP =
        cps.find(
          (cp: any) =>
            cp.status ===
              "ABERTO" &&
            cpIncludesUser(
              cp,
              discordId,
            ),
        ) ||
        null;

      const approvedTrainings =
        quizAttempts.filter(
          (item: any) =>
            item.status ===
            "APPROVED",
        );

      const completedLegacy =
        legacyTrainings.filter(
          (item: any) =>
            item.status ===
            "COMPLETED",
        );

      const trainingMap =
        new Map<
          string,
          any
        >();

      for (
        const item of [
          ...approvedTrainings,
          ...completedLegacy,
        ]
      ) {
        const code =
          String(
            item.trainingCode ||
            item.code ||
            item.trainingTitle ||
            item._id,
          );

        if (
          !trainingMap.has(
            code,
          )
        ) {
          trainingMap.set(
            code,
            item,
          );
        }
      }

      const scores =
        sergeantEvaluations
          .map(
            (item: any) =>
              Number(
                item.average,
              ),
          )
          .filter(
            Number.isFinite,
          );

      const career =
        careerGroups(
          allCareer,
        );

      const response = {
        generatedAt:
          new Date(),
        discordId,

        guard: {
          ...(guard ||
            {}),
          discordId,
          warName:
            operationalUser
              ?.warName ||
            guard?.nome ||
            null,
          callsignNumber:
            operationalUser
              ?.callsignNumber ||
            guard?.numero ||
            null,
          avatarUrl:
            operationalUser
              ?.avatarUrl ||
            guard?.avatar ||
            null,
          username:
            operationalUser
              ?.username ||
            null,
          displayName:
            operationalUser
              ?.displayName ||
            null,
          roleIds:
            currentRoleIds,
          roles:
            currentRoleIds,
          isInGuild:
            operationalUser
              ?.isInGuild ??
            true,
          isMilitar:
            operationalUser
              ?.isMilitar ??
            true,
          activePointId:
            operationalUser
              ?.activePontoId ||
            null,
          activePatrolId:
            operationalUser
              ?.activePatrulhaId ||
            null,
          lastPromotionDate:
            operationalUser
              ?.lastPromotionDate ||
            career.promotions[0]
              ?.data ||
            null,
          cfsCount:
            Number(
              operationalUser
                ?.cfsCount ||
              0,
            ),
          cfoCount:
            Number(
              operationalUser
                ?.cfoCount ||
              0,
            ),
        },

        profile: {
          biography:
            profile?.biography ||
            "",
          motto:
            profile?.motto ||
            "",
          updatedAt:
            profile?.updatedAt ||
            null,
        },

        cosmetics: {
          ownedItems:
            inventory
              ?.ownedItems ||
            [],
          equipped:
            inventory
              ?.equipped || {
              frame: null,
              background:
                null,
              title: null,
              theme: null,
              badges: [],
            },
        },

        career,

        awards: {
          current:
            currentMedals,
          historical:
            career.medals,
          medals:
            currentMedals,
          total:
            currentMedals.length,
          points:
            medalPoints,
          roleIds:
            currentMedals.map(
              (medal) =>
                medal.id,
            ),
          topMedal:
            currentMedals[0] ||
            null,
        },

        hours: {
          summary:
            summarizeHours(
              allHours,
            ),
          records:
            allHours,
          latest:
            allHours.slice(
              0,
              20,
            ),
        },

        operational: {
          activePoint:
            openPoint
              ? serializePoint(
                  openPoint,
                )
              : null,
          activeCP:
            activeCP
              ? serializeCP(
                  activeCP,
                  discordId,
                )
              : null,
          points:
            points.map(
              serializePoint,
            ),
          cps:
            cps.map(
              (cp: any) =>
                serializeCP(
                  cp,
                  discordId,
                ),
            ),
          commandedCPs:
            cps
              .filter(
                (cp: any) =>
                  String(
                    cp.commanderId ||
                    "",
                  ) ===
                  discordId,
              )
              .map(
                (cp: any) =>
                  serializeCP(
                    cp,
                    discordId,
                  ),
              ),
        },

        disciplinary: {
          items:
            disciplinaryItems,
          active:
            disciplinaryItems.filter(
              (item: any) =>
                item.status ===
                "ACTIVE",
            ),
          total:
            disciplinaryItems
              .length,
        },

        school: {
          trainings:
            [
              ...trainingMap.values(),
            ],
          quizAttempts,
          legacyTrainings,
          exams,
          certificates,
          stats: {
            completedTrainings:
              trainingMap.size,
            approvedExams:
              exams.filter(
                (item: any) =>
                  item.status ===
                  "APPROVED",
              ).length,
            certificates:
              certificates.length,
          },
        },

        evaluations: {
          sergeant:
            sergeantEvaluations,
          hierarchical:
            hierarchicalEvaluations,
          approvedAverage:
            scores.length
              ? Number(
                  (
                    scores.reduce(
                      (
                        total,
                        score,
                      ) =>
                        total +
                        score,
                      0,
                    ) /
                    scores.length
                  ).toFixed(
                    2,
                  ),
                )
              : null,
        },
      };

      res.setHeader(
        "Cache-Control",
        "private, no-store, max-age=0",
      );

      return res.json(
        response,
      );
    } catch (
      error: any
    ) {
      console.error(
        "[GUARD FULL PROFILE]",
        error,
      );

      return res
        .status(
          Number(
            error?.status ||
            500,
          ),
        )
        .json({
          error:
            error?.message ||
            "Não foi possível carregar o dossier completo do militar.",
        });
    }
  },
);

router.get(
  "/:discordId",
  requireAuth,
  async (
    req,
    res,
  ) => {
    const discordId =
      String(
        req.params.discordId,
      );

    const [
      profile,
      inventory,
    ] =
      await Promise.all([
        GuardProfile.findOne({
          discordId,
        }).lean(),

        StoreInventory.findOne({
          userId:
            discordId,
        }).lean(),
      ]);

    return res.json({
      discordId,
      biography:
        profile?.biography ||
        "",
      motto:
        profile?.motto ||
        "",
      equipped:
        inventory?.equipped || {
          frame: null,
          background:
            null,
          title: null,
          theme: null,
          badges: [],
        },
      updatedAt:
        profile?.updatedAt ||
        null,
    });
  },
);

router.put(
  "/me",
  requireAuth,
  async (
    req,
    res,
  ) => {
    const user =
      currentUser(req);

    const biography =
      String(
        req.body.biography ||
        "",
      ).trim();

    const motto =
      String(
        req.body.motto ||
        "",
      ).trim();

    if (
      biography.length >
        1200 ||
      motto.length >
        180
    ) {
      return res
        .status(400)
        .json({
          error:
            "A biografia ou o lema ultrapassa o limite permitido.",
        });
    }

    const profile =
      await GuardProfile.findOneAndUpdate(
        {
          discordId:
            String(
              user.id,
            ),
        },
        {
          discordId:
            String(
              user.id,
            ),
          biography,
          motto,
          updatedByDiscordId:
            String(
              user.id,
            ),
          updatedByName:
            user.displayName ||
            user.global_name ||
            user.username ||
            "Utilizador",
        },
        {
          upsert: true,
          new: true,
          runValidators:
            true,
        },
      );

    return res.json({
      profile,
    });
  },
);

export default router;
