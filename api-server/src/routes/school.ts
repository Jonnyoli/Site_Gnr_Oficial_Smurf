import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";

import {
  randomUUID,
} from "crypto";

import SchoolTrainingRecord from "../models/SchoolTrainingRecord";
import SchoolTrainerApplication from "../models/SchoolTrainerApplication";
import SchoolExam from "../models/SchoolExam";
import SchoolCertificate from "../models/SchoolCertificate";
import schoolAssessmentRoutes from "./schoolAssessments";
import schoolDiscordRoutes from "./schoolDiscord";
import SchoolDiscordMember from "../models/SchoolDiscordMember";
import { attachSchoolDiscordContext } from "../services/schoolDiscordService";
import { SCHOOL_DISCORD, SCHOOL_LEADERSHIP_ROLE_IDS, SCHOOL_TRAINER_ROLE_IDS, SCHOOL_EXAMINER_ROLE_IDS } from "../config/schoolDiscord";
import schoolExamAdminRoutes from "./schoolExamAdmin";
import SchoolQuizAttempt from "../models/SchoolQuizAttempt";

import {
  AuditLog,
  User,
} from "../models";

const router =
  Router();

const COMMAND_ROLE_ID =
  "1147878942099906672";

const DEV_USER_ID =
  "713719718091030599";

const TRAINER_ROLE_IDS = SCHOOL_TRAINER_ROLE_IDS;

const SCHOOL_MANAGEMENT_ROLE_IDS = [COMMAND_ROLE_ID, ...SCHOOL_LEADERSHIP_ROLE_IDS];

const EXAMINER_ROLE_IDS = [COMMAND_ROLE_ID, ...SCHOOL_EXAMINER_ROLE_IDS];

const MANDATORY_CODES = [
  "DETENCAO_MDT",
  "COMUNICACAO",
  "APREENSAO_VIATURAS",
];

const EXAM_CRITERIA = [
  {
    key:
      "procedures",
    label:
      "Procedimentos operacionais",
    weight:
      3,
  },
  {
    key:
      "communication",
    label:
      "Comunicação e rádio",
    weight:
      2,
  },
  {
    key:
      "decision",
    label:
      "Tomada de decisão",
    weight:
      2,
  },
  {
    key:
      "safety",
    label:
      "Segurança na atuação",
    weight:
      2,
  },
  {
    key:
      "posture",
    label:
      "Postura profissional",
    weight:
      1,
  },
];

const MINIMUM_APPROVAL_SCORE =
  Number(
    process.env
      .SCHOOL_FINAL_EXAM_MIN_SCORE ||
      10,
  );

function sessionUser(
  req: Request,
) {
  return (
    (req as any)
      .session?.user ||
    null
  );
}

function userId(
  req: Request,
) {
  return String(
    sessionUser(req)?.id ||
      "",
  );
}

function userName(
  req: Request,
) {
  const current =
    sessionUser(req);

  return (
    current?.displayName ||
    current?.global_name ||
    current?.username ||
    current?.name ||
    userId(req) ||
    "Sistema"
  );
}

function roles(req: Request) {
  const mainRoles = Array.isArray(sessionUser(req)?.roles)
    ? sessionUser(req).roles.map(String)
    : [];
  const schoolRoles = Array.isArray((req as any).schoolRoles)
    ? (req as any).schoolRoles.map(String)
    : [];
  return [...new Set([...mainRoles, ...schoolRoles])];
}

function hasAnyRole(
  req: Request,
  roleIds: string[],
) {
  return (
    userId(req) ===
      DEV_USER_ID ||
    roleIds.some(
      (roleId) =>
        roles(req).includes(
          roleId,
        ),
    )
  );
}

function isManagement(
  req: Request,
) {
  return hasAnyRole(
    req,
    SCHOOL_MANAGEMENT_ROLE_IDS,
  );
}

function isExaminer(
  req: Request,
) {
  return hasAnyRole(
    req,
    EXAMINER_ROLE_IDS,
  );
}

function isTrainer(
  req: Request,
) {
  return (
    isManagement(req) ||
    TRAINER_ROLE_IDS.some(
      (roleId) =>
        roles(req).includes(
          roleId,
        ),
    )
  );
}

function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!userId(req)) {
    return void res
      .status(401)
      .json({
        error:
          "É necessário iniciar sessão.",
      });
  }

  next();
}

function requireTrainer(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!isTrainer(req)) {
    return void res
      .status(403)
      .json({
        error:
          "Apenas Formadores autorizados podem executar esta ação.",
      });
  }

  next();
}

function requireManagement(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!isManagement(req)) {
    return void res
      .status(403)
      .json({
        error:
          "Apenas a Direção da Escola ou o Comando-Geral pode executar esta ação.",
      });
  }

  next();
}

function requireExaminer(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!isExaminer(req)) {
    return void res
      .status(403)
      .json({
        error:
          "Apenas Examinadores autorizados podem executar esta ação.",
      });
  }

  next();
}

async function audit(
  req: Request,
  action: string,
  severity:
    | "info"
    | "success"
    | "warning"
    | "critical",
  description: string,
  targetId?: string,
  targetName?: string,
  metadata:
    Record<
      string,
      any
    > = {},
) {
  try {
    await AuditLog.create({
      actorId:
        userId(req),
      actorName:
        userName(req),
      action,
      module:
        "Escola da Guarda",
      severity,
      description,
      targetId:
        targetId || null,
      targetName:
        targetName || null,
      metadata,
      ip:
        req.ip ||
        req.socket
          ?.remoteAddress ||
        null,
      userAgent:
        req.get(
          "user-agent",
        ) || null,
    });
  } catch (error) {
    console.error(
      "[SCHOOL AUDIT]",
      error,
    );
  }
}

async function resolveName(
  discordId: string,
) {
  const schoolMember: any = await SchoolDiscordMember.findOne({
    guildId: SCHOOL_DISCORD.guildId,
    discordId,
    isInGuild: true,
  }).lean();

  if (schoolMember) {
    return schoolMember.displayName || schoolMember.username || discordId;
  }

  const user =
    await User.findOne({
      discordId,
    })
      .select({
        warName: 1,
        displayName: 1,
        username: 1,
      })
      .lean();

  return (
    (user as any)
      ?.warName ||
    (user as any)
      ?.displayName ||
    (user as any)
      ?.username ||
    discordId
  );
}

function normalizeCriteria(
  raw: any[],
) {
  const rawMap =
    new Map(
      (
        Array.isArray(raw)
          ? raw
          : []
      ).map(
        (item) => [
          String(
            item?.key ||
              "",
          ),
          item,
        ],
      ),
    );

  return EXAM_CRITERIA.map(
    (definition) => {
      const current =
        rawMap.get(
          definition.key,
        ) || {};

      const score =
        Number(
          current.score,
        );

      return {
        key:
          definition.key,
        label:
          definition.label,
        weight:
          definition.weight,
        score:
          Number.isFinite(
            score,
          )
            ? Math.min(
                20,
                Math.max(
                  0,
                  score,
                ),
              )
            : 0,
        notes:
          String(
            current.notes ||
              "",
          ).trim(),
      };
    },
  );
}

function calculateWeightedScore(
  criteria: any[],
) {
  const totalWeight =
    criteria.reduce(
      (
        total,
        criterion,
      ) =>
        total +
        Number(
          criterion.weight ||
            0,
        ),
      0,
    );

  const total =
    criteria.reduce(
      (
        sum,
        criterion,
      ) =>
        sum +
        Number(
          criterion.score ||
            0,
        ) *
          Number(
            criterion.weight ||
              0,
          ),
      0,
    );

  return totalWeight
    ? Number(
        (
          total /
          totalWeight
        ).toFixed(2),
      )
    : 0;
}

router.use(
  requireAuth,
);

router.use(attachSchoolDiscordContext);

router.get(
  "/me",
  async (
    req,
    res,
  ) => {
    const id =
      userId(req);

    const [
      legacyRecords,
      approvedAttempts,
      exams,
    ] =
      await Promise.all([
        SchoolTrainingRecord.find({
          studentId: id,
          status: "COMPLETED",
        })
          .sort({ completedAt: -1 })
          .lean(),

        SchoolQuizAttempt.find({
          studentId: id,
          status: "APPROVED",
        })
          .sort({ reviewedAt: -1, createdAt: -1 })
          .lean(),

        SchoolExam.find({
          studentId: id,
          deletedAt: null,
        })
          .sort({ createdAt: -1 })
          .lean(),
      ]);

    const byCode =
      new Map<string, any>();

    for (const record of legacyRecords) {
      const code =
        String(
          (record as any).trainingCode ||
          "",
        );

      if (code && !byCode.has(code)) {
        byCode.set(code, {
          ...(record as any),
          code,
          source: "TRAINING_RECORD",
        });
      }
    }

    for (const attempt of approvedAttempts) {
      const code =
        String(
          (attempt as any).trainingCode ||
          "",
        );

      if (code) {
        byCode.set(code, {
          ...(attempt as any),
          code,
          completedAt:
            (attempt as any).reviewedAt ||
            (attempt as any).updatedAt ||
            (attempt as any).createdAt,
          source: "QUIZ_ATTEMPT",
        });
      }
    }

    const completedTrainings =
      [...byCode.values()];

    const completedCodes =
      new Set(
        completedTrainings.map(
          (item: any) => item.code,
        ),
      );

    res.json({
      completedTrainings,
      completedCodes:
        [...completedCodes],
      exams,
      eligibleForFinalExam:
        MANDATORY_CODES.every(
          (code) => completedCodes.has(code),
        ),
    });
  },
);

router.get(
  "/stats",
  async (_req, res) => {
    const [activeTrainers, pendingExams, provisionalStudents] = await Promise.all([
      SchoolDiscordMember.countDocuments({
        guildId: SCHOOL_DISCORD.guildId,
        isInGuild: true,
        roleIds: { $in: SCHOOL_TRAINER_ROLE_IDS },
      }),
      SchoolExam.countDocuments({
        status: { $in: ["REQUESTED", "SCHEDULED", "IN_PROGRESS"] },
      }),
      SchoolDiscordMember.countDocuments({
        guildId: SCHOOL_DISCORD.guildId,
        isInGuild: true,
        assignedTrainerKey: { $ne: null },
      }),
    ]);

    res.json({ activeTrainers, pendingExams, provisionalStudents });
  },
);

router.get(
  "/trainers",
  async (req, res) => {
    const trainerUsers: any[] = await SchoolDiscordMember.find({
      guildId: SCHOOL_DISCORD.guildId,
      isInGuild: true,
      roleIds: { $in: SCHOOL_TRAINER_ROLE_IDS },
    }).sort({ displayName: 1 }).lean();

    const applications = isManagement(req)
      ? await SchoolTrainerApplication.find({ status: "PENDING" })
          .sort({ createdAt: 1 })
          .lean()
      : [];

    res.json({
      canManage: isManagement(req),
      trainers: trainerUsers.map((item: any) => ({
        userId: String(item.discordId),
        name: item.displayName || item.username || item.discordId,
        avatarUrl: item.avatarUrl || null,
        trainerKey: item.trainerKey || null,
        roleIds: item.roleIds || [],
      })),
      applications,
    });
  },
);

router.post(
  "/trainer-applications",
  async (
    req,
    res,
  ) => {
    const motivation =
      String(
        req.body
          ?.motivation ||
          "",
      ).trim();

    const experience =
      String(
        req.body
          ?.experience ||
          "",
      ).trim();

    if (
      motivation.length <
      20
    ) {
      return void res
        .status(400)
        .json({
          error:
            "A motivação deve ter pelo menos 20 caracteres.",
        });
    }

    const application =
      await SchoolTrainerApplication.create({
        applicantId:
          userId(req),
        applicantName:
          userName(req),
        motivation,
        experience,
      }).catch(
        (
          error: any,
        ) => {
          if (
            error?.code ===
            11000
          ) {
            return null;
          }

          throw error;
        },
      );

    if (!application) {
      return void res
        .status(409)
        .json({
          error:
            "Já tens uma candidatura pendente.",
        });
    }

    await audit(
      req,
      "SCHOOL_TRAINER_APPLICATION_CREATED",
      "info",
      `${userName(req)} candidatou-se a Formador.`,
      String(
        application._id,
      ),
      userName(req),
    );

    res.status(201)
      .json({
        application,
      });
  },
);

router.post(
  "/trainer-applications/:id/decision",
  requireManagement,
  async (
    req,
    res,
  ) => {
    const decision =
      String(
        req.body
          ?.decision ||
          "",
      );

    if (
      ![
        "APPROVED",
        "REJECTED",
      ].includes(
        decision,
      )
    ) {
      return void res
        .status(400)
        .json({
          error:
            "Decisão inválida.",
        });
    }

    const application =
      await SchoolTrainerApplication.findOneAndUpdate(
        {
          _id:
            req.params.id,
          status:
            "PENDING",
        },
        {
          $set: {
            status:
              decision,
            decisionBy:
              userId(req),
            decisionByName:
              userName(req),
            decisionReason:
              String(
                req.body
                  ?.reason ||
                  "",
              ).trim(),
            decidedAt:
              new Date(),
          },
        },
        {
          new: true,
        },
      );

    if (!application) {
      return void res
        .status(404)
        .json({
          error:
            "Candidatura não encontrada ou já processada.",
        });
    }

    await audit(
      req,
      decision ===
        "APPROVED"
        ? "SCHOOL_TRAINER_APPLICATION_APPROVED"
        : "SCHOOL_TRAINER_APPLICATION_REJECTED",
      decision ===
        "APPROVED"
        ? "success"
        : "warning",
      `${userName(req)} ${
        decision ===
        "APPROVED"
          ? "aprovou"
          : "recusou"
      } a candidatura de ${application.applicantName}.`,
      String(
        application._id,
      ),
      application.applicantName,
      {
        reason:
          application.decisionReason,
      },
    );

    res.json({
      application,
    });
  },
);

router.get(
  "/trainings/workspace",
  async (
    req,
    res,
  ) => {
    const canTrain =
      isTrainer(req);

    if (!canTrain) {
      return void res.json({
        canTrain: false,
        students: [],
      });
    }

    const provisionalRoleId =
      String(
        process.env
          .SCHOOL_PROVISIONAL_ROLE_ID ||
          "",
      ).trim();

    if (!provisionalRoleId) {
      return void res.status(503).json({
        error:
          "SCHOOL_PROVISIONAL_ROLE_ID não está configurado no backend.",
      });
    }

    const search =
      String(
        req.query.search ||
          "",
      ).trim();

    const filter: any = {
      isInGuild: true,
      savedTags:
        provisionalRoleId,
    };

    if (search) {
      filter.$or = [
        {
          warName: {
            $regex: search,
            $options: "i",
          },
        },
        {
          displayName: {
            $regex: search,
            $options: "i",
          },
        },
        {
          username: {
            $regex: search,
            $options: "i",
          },
        },
        {
          discordId: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    const users =
      await User.find(filter)
        .select({
          discordId: 1,
          warName: 1,
          displayName: 1,
          username: 1,
          avatarUrl: 1,
        })
        .sort({
          warName: 1,
          displayName: 1,
          username: 1,
        })
        .limit(200)
        .lean();

    const studentIds =
      users.map(
        (item: any) =>
          String(
            item.discordId,
          ),
      );

    const records =
      studentIds.length
        ? await SchoolTrainingRecord.find({
            studentId: {
              $in: studentIds,
            },
          })
            .sort({
              completedAt: -1,
            })
            .lean()
        : [];

    const recordsByStudent =
      new Map<string, any[]>();

    for (const record of records) {
      const key =
        String(
          (record as any).studentId,
        );

      const current =
        recordsByStudent.get(key) ||
        [];

      current.push(record);
      recordsByStudent.set(
        key,
        current,
      );
    }

    const students =
      users.map(
        (item: any) => {
          const id =
            String(
              item.discordId,
            );

          const studentRecords =
            recordsByStudent.get(id) ||
            [];

          const completedMandatory =
            new Set(
              studentRecords
                .filter(
                  (record: any) =>
                    record.status ===
                      "COMPLETED" &&
                    record.mandatory,
                )
                .map(
                  (record: any) =>
                    record.trainingCode,
                ),
            );

          return {
            userId: id,
            name:
              item.warName ||
              item.displayName ||
              item.username ||
              id,
            username:
              item.username ||
              null,
            avatarUrl:
              item.avatarUrl ||
              null,
            records:
              studentRecords,
            completedCount:
              studentRecords.filter(
                (record: any) =>
                  record.status ===
                  "COMPLETED",
              ).length,
            mandatoryCompleted:
              completedMandatory.size,
            mandatoryTotal:
              MANDATORY_CODES.length,
            eligibleForFinalExam:
              MANDATORY_CODES.every(
                (code) =>
                  completedMandatory.has(
                    code,
                  ),
              ),
          };
        },
      );

    res.json({
      canTrain: true,
      students,
      mandatoryCodes:
        MANDATORY_CODES,
    });
  },
);

router.get(
  "/trainings/students/:studentId",
  requireTrainer,
  async (
    req,
    res,
  ) => {
    const studentId =
      String(
        req.params.studentId ||
          "",
      );

    const provisionalRoleId =
      String(
        process.env
          .SCHOOL_PROVISIONAL_ROLE_ID ||
          "",
      ).trim();

    const student =
      await User.findOne({
        discordId: studentId,
        isInGuild: true,
        ...(provisionalRoleId
          ? {
              savedTags:
                provisionalRoleId,
            }
          : {}),
      })
        .select({
          discordId: 1,
          warName: 1,
          displayName: 1,
          username: 1,
          avatarUrl: 1,
        })
        .lean();

    if (!student) {
      return void res.status(404).json({
        error:
          "Guarda Provisório não encontrado ou já não possui a role necessária.",
      });
    }

    const records =
      await SchoolTrainingRecord.find({
        studentId,
      })
        .sort({
          completedAt: -1,
        })
        .lean();

    const completedMandatory =
      new Set(
        records
          .filter(
            (record: any) =>
              record.status ===
                "COMPLETED" &&
              record.mandatory,
          )
          .map(
            (record: any) =>
              record.trainingCode,
          ),
      );

    res.json({
      student: {
        userId:
          String(
            (student as any).discordId,
          ),
        name:
          (student as any).warName ||
          (student as any).displayName ||
          (student as any).username ||
          studentId,
        avatarUrl:
          (student as any).avatarUrl ||
          null,
      },
      records,
      mandatoryCompleted:
        completedMandatory.size,
      mandatoryTotal:
        MANDATORY_CODES.length,
      eligibleForFinalExam:
        MANDATORY_CODES.every(
          (code) =>
            completedMandatory.has(
              code,
            ),
        ),
    });
  },
);

router.post(
  "/trainings/record",
  requireTrainer,
  async (
    req,
    res,
  ) => {
    const studentId =
      String(
        req.body
          ?.studentId ||
          "",
      ).trim();

    const trainingCode =
      String(
        req.body
          ?.trainingCode ||
          "",
      ).trim();

    const trainingDefinition =
      [
        {
          code: "DETENCAO_MDT",
          title: "Formação de Detenção & MDT",
        },
        {
          code: "COMUNICACAO",
          title: "Formação de Comunicação",
        },
        {
          code: "APREENSAO_VIATURAS",
          title: "Formação de Apreensão de Viaturas",
        },
        {
          code: "ABORDAGEM_TRANSITO",
          title: "Formação de Abordagem de Trânsito & Abordagem Agressiva",
        },
        {
          code: "FUGA_AUTORIDADES",
          title: "Formação de Fuga às Autoridades",
        },
      ].find(
        (item) =>
          item.code ===
          trainingCode,
      );

    const trainingTitle =
      trainingDefinition?.title ||
      "";

    const status =
      String(
        req.body
          ?.status ||
          "COMPLETED",
      );

    if (
      !studentId ||
      !trainingDefinition
    ) {
      return void res
        .status(400)
        .json({
          error:
            "Formando e formação válida são obrigatórios.",
        });
    }

    if (
      ![
        "COMPLETED",
        "FAILED",
        "REINFORCEMENT_REQUIRED",
      ].includes(
        status,
      )
    ) {
      return void res
        .status(400)
        .json({
          error:
            "Estado inválido.",
        });
    }

    const provisionalRoleId =
      String(
        process.env
          .SCHOOL_PROVISIONAL_ROLE_ID ||
          "",
      ).trim();

    if (!provisionalRoleId) {
      return void res.status(503).json({
        error:
          "SCHOOL_PROVISIONAL_ROLE_ID não está configurado.",
      });
    }

    const studentUser =
      await User.findOne({
        discordId: studentId,
        isInGuild: true,
        savedTags:
          provisionalRoleId,
      })
        .select({
          warName: 1,
          displayName: 1,
          username: 1,
        })
        .lean();

    if (!studentUser) {
      return void res.status(404).json({
        error:
          "O utilizador não é um Guarda Provisório atual.",
      });
    }

    const scoreValue =
      req.body?.score === null ||
      req.body?.score === undefined ||
      req.body?.score === ""
        ? null
        : Number(req.body.score);

    if (
      scoreValue !== null &&
      (
        !Number.isFinite(scoreValue) ||
        scoreValue < 0 ||
        scoreValue > 20
      )
    ) {
      return void res.status(400).json({
        error:
          "A classificação deve estar entre 0 e 20.",
      });
    }

    const studentName =
      (studentUser as any).warName ||
      (studentUser as any).displayName ||
      (studentUser as any).username ||
      studentId;

    const previousRecord =
      await SchoolTrainingRecord.findOne({
        studentId,
        trainingCode,
      }).lean();

    const record =
      await SchoolTrainingRecord.findOneAndUpdate(
        {
          studentId,
          trainingCode,
        },
        {
          $set: {
            studentId,
            studentName,
            trainingCode,
            trainingTitle,
            mandatory:
              MANDATORY_CODES.includes(
                trainingCode,
              ),
            status,
            trainerId:
              userId(req),
            trainerName:
              userName(req),
            score:
              scoreValue,
            notes:
              String(
                req.body
                  ?.notes ||
                  "",
              ).trim(),
            completedAt:
              new Date(),
          },
        },
        {
          upsert:
            true,
          new:
            true,
          runValidators:
            true,
        },
      );

    await audit(
      req,
      "SCHOOL_TRAINING_RECORDED",
      status ===
        "COMPLETED"
        ? "success"
        : "warning",
      `${userName(req)} registou ${trainingTitle} para ${studentName}.`,
      String(
        record._id,
      ),
      studentName,
      {
        trainingCode,
        status,
        score:
          record.score,
        notes:
          record.notes,
        previous:
          previousRecord
            ? {
                status:
                  (previousRecord as any).status,
                score:
                  (previousRecord as any).score,
                notes:
                  (previousRecord as any).notes,
                trainerId:
                  (previousRecord as any).trainerId,
                trainerName:
                  (previousRecord as any).trainerName,
              }
            : null,
        next: {
          status:
            record.status,
          score:
            record.score,
          notes:
            record.notes,
          trainerId:
            record.trainerId,
          trainerName:
            record.trainerName,
        },
      },
    );

    res.json({
      record,
    });
  },
);

router.post(
  "/exams/request",
  async (
    req,
    res,
  ) => {
    const id =
      userId(req);

    const name =
      userName(req);

    const records =
      await SchoolTrainingRecord.find({
        studentId:
          id,
        status:
          "COMPLETED",
        trainingCode: {
          $in:
            MANDATORY_CODES,
        },
      }).lean();

    const completed =
      new Set(
        records.map(
          (
            item: any,
          ) =>
            item.trainingCode,
        ),
      );

    const missing =
      MANDATORY_CODES.filter(
        (code) =>
          !completed.has(
            code,
          ),
      );

    if (
      missing.length
    ) {
      return void res
        .status(409)
        .json({
          error:
            "Ainda existem formações obrigatórias em falta.",
          missing,
        });
    }

    const active =
      await SchoolExam.findOne({
        studentId:
          id,
        status: {
          $in: [
            "REQUESTED",
            "SCHEDULED",
            "IN_PROGRESS",
          ],
        },
      });

    if (active) {
      return void res
        .status(409)
        .json({
          error:
            "Já existe um Exame Final pendente.",
        });
    }

    const previousAttempts =
      await SchoolExam.countDocuments({
        studentId:
          id,
        status: {
          $in: [
            "APPROVED",
            "FAILED",
          ],
        },
      });

    const previousApproval =
      await SchoolExam.exists({
        studentId:
          id,
        status:
          "APPROVED",
      });

    if (previousApproval) {
      return void res
        .status(409)
        .json({
          error:
            "O Exame Final já foi concluído com aprovação.",
        });
    }

    if (
      previousAttempts >=
      2
    ) {
      return void res
        .status(409)
        .json({
          error:
            "O limite de duas tentativas foi atingido. É necessária decisão superior.",
        });
    }

    const exam =
      await SchoolExam.create({
        studentId:
          id,
        studentName:
          name,
        attempt:
          previousAttempts +
          1,
        patrolCallsign:
          "LINCOLN",
        criteria:
          EXAM_CRITERIA.map(
            (
              criterion,
            ) => ({
              ...criterion,
              score:
                0,
              notes:
                "",
            }),
          ),
      });

    await audit(
      req,
      "SCHOOL_FINAL_EXAM_REQUESTED",
      "info",
      `${name} pediu a abertura do Exame Final.`,
      String(
        exam._id,
      ),
      name,
      {
        attempt:
          exam.attempt,
        patrolCallsign:
          "LINCOLN",
      },
    );

    res.status(201)
      .json({
        exam,
      });
  },
);

router.get(
  "/exams",
  async (
    req,
    res,
  ) => {
    if (
      !isManagement(req) &&
      !isExaminer(req)
    ) {
      const items =
        await SchoolExam.find({
          studentId:
            userId(req),
        })
          .sort({
            createdAt:
              -1,
          })
          .lean();

      return void res.json({
        items,
        canManage:
          false,
        canExamine:
          false,
        currentUserId:
          userId(req),
      });
    }

    const search =
      String(
        req.query
          .search ||
          "",
      ).trim();

    const filter: any =
      {};

    if (search) {
      filter.$or = [
        {
          studentName: {
            $regex:
              search,
            $options:
              "i",
          },
        },
        {
          studentId: {
            $regex:
              search,
            $options:
              "i",
          },
        },
      ];
    }

    const items =
      await SchoolExam.find(
        filter,
      )
        .sort({
          createdAt:
            -1,
        })
        .limit(200)
        .lean();

    res.json({
      items,
      canManage:
        isManagement(req),
      canExamine:
        isExaminer(req),
      currentUserId:
        userId(req),
    });
  },
);

router.post(
  "/exams/:id/schedule",
  requireExaminer,
  async (
    req,
    res,
  ) => {
    const scheduledAt =
      new Date(
        req.body
          ?.scheduledAt,
      );

    if (
      Number.isNaN(
        scheduledAt.getTime(),
      )
    ) {
      return void res
        .status(400)
        .json({
          error:
            "Data de agendamento inválida.",
        });
    }

    const exam =
      await SchoolExam.findOneAndUpdate(
        {
          _id:
            req.params.id,
          status:
            "REQUESTED",
        },
        {
          $set: {
            status:
              "SCHEDULED",
            scheduledAt,
            examinerId:
              userId(req),
            examinerName:
              userName(req),
            patrolCallsign:
              "LINCOLN",
            patrolVehicle:
              String(
                req.body
                  ?.patrolVehicle ||
                  "",
              ).trim() ||
              null,
          },
        },
        {
          new:
            true,
          runValidators:
            true,
        },
      );

    if (!exam) {
      return void res
        .status(404)
        .json({
          error:
            "Pedido de exame não encontrado ou já processado.",
        });
    }

    await audit(
      req,
      "SCHOOL_FINAL_EXAM_SCHEDULED",
      "info",
      `${userName(req)} agendou o Exame Final de ${exam.studentName}.`,
      String(
        exam._id,
      ),
      exam.studentName,
      {
        scheduledAt:
          exam.scheduledAt,
        examinerId:
          exam.examinerId,
        examinerName:
          exam.examinerName,
        patrolCallsign:
          "LINCOLN",
        patrolVehicle:
          exam.patrolVehicle,
        attempt:
          exam.attempt,
      },
    );

    res.json({
      exam,
    });
  },
);

router.post(
  "/exams/:id/start",
  requireExaminer,
  async (
    req,
    res,
  ) => {
    const exam =
      await SchoolExam.findOneAndUpdate(
        {
          _id:
            req.params.id,
          status:
            "SCHEDULED",
        },
        {
          $set: {
            status:
              "IN_PROGRESS",
            startedAt:
              new Date(),
            examinerId:
              userId(req),
            examinerName:
              userName(req),
          },
        },
        {
          new:
            true,
        },
      );

    if (!exam) {
      return void res
        .status(404)
        .json({
          error:
            "Exame não encontrado ou não está agendado.",
        });
    }

    await audit(
      req,
      "SCHOOL_FINAL_EXAM_STARTED",
      "info",
      `${userName(req)} iniciou o Exame Final de ${exam.studentName}.`,
      String(
        exam._id,
      ),
      exam.studentName,
      {
        patrolCallsign:
          exam.patrolCallsign,
        patrolVehicle:
          exam.patrolVehicle,
        attempt:
          exam.attempt,
      },
    );

    res.json({
      exam,
    });
  },
);

router.post(
  "/exams/:id/result",
  requireExaminer,
  async (
    req,
    res,
  ) => {
    const requestedResult =
      String(
        req.body
          ?.result ||
          "",
      );

    if (
      ![
        "APPROVED",
        "FAILED",
      ].includes(
        requestedResult,
      )
    ) {
      return void res
        .status(400)
        .json({
          error:
            "Resultado inválido.",
        });
    }

    const criteria =
      normalizeCriteria(
        req.body
          ?.criteria,
      );

    const score =
      calculateWeightedScore(
        criteria,
      );

    const result =
      requestedResult ===
        "APPROVED" &&
      score >=
        MINIMUM_APPROVAL_SCORE
        ? "APPROVED"
        : "FAILED";

    const failureReason =
      String(
        req.body
          ?.failureReason ||
          "",
      ).trim();

    if (
      result ===
        "FAILED" &&
      failureReason.length <
        5
    ) {
      return void res
        .status(400)
        .json({
          error:
            "O motivo da reprovação é obrigatório.",
        });
    }

    const currentExam =
      await SchoolExam.findOne({
        _id:
          req.params.id,
        status:
          "IN_PROGRESS",
      });

    if (!currentExam) {
      return void res
        .status(404)
        .json({
          error:
            "Exame não encontrado ou não está em avaliação.",
        });
    }

    const secondFailureAction =
      result ===
        "FAILED" &&
      currentExam.attempt >=
        2
        ? "EXCLUSION_RECOMMENDED"
        : "NONE";

    currentExam.status =
      result as any;

    currentExam.score =
      score;

    currentExam.criteria =
      criteria as any;

    currentExam.notes =
      String(
        req.body
          ?.notes ||
          "",
      ).trim();

    currentExam.failureReason =
      result ===
        "FAILED"
        ? failureReason
        : "";

    currentExam.secondFailureAction =
      secondFailureAction as any;

    currentExam.examinerId =
      userId(req);

    currentExam.examinerName =
      userName(req);

    currentExam.resultRecordedBy =
      userId(req);

    currentExam.resultRecordedByName =
      userName(req);

    currentExam.decidedAt =
      new Date();

    await currentExam.save();

    if (
      result ===
      "APPROVED"
    ) {
      const existing =
        await SchoolCertificate.exists({
          type:
            "FINAL_EXAM",
          referenceId:
            currentExam._id,
        });

      if (!existing) {
        await SchoolCertificate.create({
          userId:
            currentExam.studentId,
          userName:
            currentExam.studentName,
          title:
            "Conclusão do Exame Final — Escola da Guarda",
          type:
            "FINAL_EXAM",
          referenceId:
            currentExam._id,
          certificateNumber:
            `EG-${new Date().getFullYear()}-${randomUUID()
              .replace(
                /-/g,
                "",
              )
              .slice(
                0,
                10,
              )
              .toUpperCase()}`,
          issuedBy:
            userId(req),
          issuedByName:
            userName(req),
        });
      }
    }

    await audit(
      req,
      result ===
        "APPROVED"
        ? "SCHOOL_FINAL_EXAM_APPROVED"
        : "SCHOOL_FINAL_EXAM_FAILED",
      result ===
        "APPROVED"
        ? "success"
        : currentExam.attempt >=
            2
          ? "critical"
          : "warning",
      `${userName(req)} ${
        result ===
        "APPROVED"
          ? "aprovou"
          : "reprovou"
      } ${currentExam.studentName} no Exame Final.`,
      String(
        currentExam._id,
      ),
      currentExam.studentName,
      {
        score,
        criteria,
        notes:
          currentExam.notes,
        failureReason:
          currentExam.failureReason,
        attempt:
          currentExam.attempt,
        secondFailureAction,
        minimumApprovalScore:
          MINIMUM_APPROVAL_SCORE,
        patrolCallsign:
          currentExam.patrolCallsign,
        patrolVehicle:
          currentExam.patrolVehicle,
      },
    );

    res.json({
      exam:
        currentExam,
    });
  },
);

router.post(
  "/exams/:id/cancel",
  requireExaminer,
  async (
    req,
    res,
  ) => {
    const reason =
      String(
        req.body
          ?.reason ||
          "",
      ).trim();

    if (
      reason.length <
      3
    ) {
      return void res
        .status(400)
        .json({
          error:
            "Indica o motivo do cancelamento.",
        });
    }

    const exam =
      await SchoolExam.findOneAndUpdate(
        {
          _id:
            req.params.id,
          status: {
            $in: [
              "REQUESTED",
              "SCHEDULED",
              "IN_PROGRESS",
            ],
          },
        },
        {
          $set: {
            status:
              "CANCELLED",
            notes:
              reason,
            decidedAt:
              new Date(),
            resultRecordedBy:
              userId(req),
            resultRecordedByName:
              userName(req),
          },
        },
        {
          new:
            true,
        },
      );

    if (!exam) {
      return void res
        .status(404)
        .json({
          error:
            "Exame não encontrado ou já concluído.",
        });
    }

    await audit(
      req,
      "SCHOOL_FINAL_EXAM_CANCELLED",
      "warning",
      `${userName(req)} cancelou o Exame Final de ${exam.studentName}.`,
      String(
        exam._id,
      ),
      exam.studentName,
      {
        reason,
        attempt:
          exam.attempt,
      },
    );

    res.json({
      exam,
    });
  },
);

router.get(
  "/certificates",
  async (
    req,
    res,
  ) => {
    const filter =
      isManagement(req)
        ? {}
        : {
            userId:
              userId(req),
          };

    const items =
      await SchoolCertificate.find(
        filter,
      )
        .sort({
          issuedAt:
            -1,
        })
        .limit(200)
        .lean();

    res.json({
      items,
    });
  },
);

router.use(
  "/discord",
  schoolDiscordRoutes,
);

router.use(
  "/assessments",
  schoolAssessmentRoutes,
);

router.use(
  "/exam-admin",
  schoolExamAdminRoutes,
);

export default router;
