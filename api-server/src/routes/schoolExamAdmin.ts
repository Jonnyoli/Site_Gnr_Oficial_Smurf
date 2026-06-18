import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";

import SchoolExam from "../models/SchoolExam";
import { AuditLog } from "../models";
import {
  sendFinalExamResultEmbed,
} from "../services/schoolDiscordEmbeds";

const router = Router();

const COMMAND_GENERAL_ROLE_ID =
  "1147878942099906672";

const SCHOOL_DIRECTOR_ROLE_ID =
  "1281057403512557629";

const SCHOOL_SUBDIRECTOR_ROLE_ID =
  "1370108936237224167";

const SCHOOL_SUPERVISOR_ROLE_ID =
  "1262916007106711660";

const SCHOOL_EXAMINER_MANAGER_ROLE_ID =
  "1503041584613163088";

const SCHOOL_CFG_EXAMINER_ROLE_ID =
  "1374862493125443664";

const MANAGEMENT_ROLES = [
  COMMAND_GENERAL_ROLE_ID,
  SCHOOL_DIRECTOR_ROLE_ID,
  SCHOOL_SUBDIRECTOR_ROLE_ID,
  SCHOOL_SUPERVISOR_ROLE_ID,
  SCHOOL_EXAMINER_MANAGER_ROLE_ID,
];

const EXAMINER_ROLES = [
  ...MANAGEMENT_ROLES,
  SCHOOL_CFG_EXAMINER_ROLE_ID,
];

function currentUser(req: Request) {
  return (req as any).session?.user || null;
}

function userId(req: Request) {
  return String(currentUser(req)?.id || "");
}

function userName(req: Request) {
  const user = currentUser(req);

  return (
    user?.displayName ||
    user?.global_name ||
    user?.username ||
    userId(req) ||
    "Sistema"
  );
}

function roleIds(req: Request) {
  const roles = currentUser(req)?.roles;

  return Array.isArray(roles)
    ? roles.map(String)
    : [];
}

function hasRole(
  req: Request,
  values: string[],
) {
  return values.some(
    (roleId) =>
      roleIds(req).includes(roleId),
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
        error: "É necessário iniciar sessão.",
      });
  }

  next();
}

function requireManagement(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!hasRole(req, MANAGEMENT_ROLES)) {
    return void res
      .status(403)
      .json({
        error:
          "Apenas Direção e Responsável de Examinadores podem gerir todos os exames.",
      });
  }

  next();
}

function requireExaminer(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!hasRole(req, EXAMINER_ROLES)) {
    return void res
      .status(403)
      .json({
        error:
          "Apenas Examinadores e Direção podem executar esta ação.",
      });
  }

  next();
}

async function audit(
  req: Request,
  action: string,
  severity: string,
  description: string,
  targetId: string,
  targetName: string,
  metadata: Record<string, any> = {},
) {
  try {
    await AuditLog.create({
      actorId: userId(req),
      actorName: userName(req),
      action,
      module: "Escola da Guarda",
      severity,
      description,
      targetId,
      targetName,
      metadata,
      ip: req.ip || null,
      userAgent:
        req.get("user-agent") || null,
    });
  } catch (error) {
    console.error("[SCHOOL EXAM ADMIN AUDIT]", error);
  }
}

router.use(requireAuth);

router.get(
  "/permissions",
  async (req, res) => {
    res.json({
      canManage:
        hasRole(req, MANAGEMENT_ROLES),
      canExamine:
        hasRole(req, EXAMINER_ROLES),
      currentUserId:
        userId(req),
    });
  },
);

router.get(
  "/",
  requireExaminer,
  async (req, res) => {
    const status =
      String(req.query.status || "ALL")
        .toUpperCase();

    const search =
      String(req.query.search || "")
        .trim();

    const includeDeleted =
      req.query.deleted === "true" &&
      hasRole(req, MANAGEMENT_ROLES);

    const filter: any = {};

    if (!includeDeleted) {
      filter.deletedAt = null;
    }

    if (
      status !== "ALL" &&
      status !== "DELETED"
    ) {
      filter.status = status;
    }

    if (status === "DELETED") {
      filter.deletedAt = {
        $ne: null,
      };
    }

    if (search) {
      filter.$or = [
        {
          studentName: {
            $regex: search,
            $options: "i",
          },
        },
        {
          studentId: {
            $regex: search,
            $options: "i",
          },
        },
        {
          examinerName: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    const items =
      await SchoolExam.find(filter)
        .sort({
          createdAt: -1,
        })
        .limit(300)
        .lean();

    const statsRaw =
      await SchoolExam.aggregate([
        {
          $match: {
            deletedAt: null,
          },
        },
        {
          $group: {
            _id: "$status",
            total: {
              $sum: 1,
            },
          },
        },
      ]);

    const stats =
      Object.fromEntries(
        statsRaw.map(
          (item: any) => [
            item._id,
            item.total,
          ],
        ),
      );

    res.json({
      items,
      stats,
      permissions: {
        canManage:
          hasRole(req, MANAGEMENT_ROLES),
        canExamine:
          hasRole(req, EXAMINER_ROLES),
        currentUserId:
          userId(req),
      },
    });
  },
);

router.post(
  "/:id/assign",
  requireManagement,
  async (req, res) => {
    const examinerId =
      String(req.body?.examinerId || "")
        .trim();

    const examinerName =
      String(req.body?.examinerName || "")
        .trim();

    if (!examinerId || !examinerName) {
      return void res
        .status(400)
        .json({
          error:
            "Examinador e nome são obrigatórios.",
        });
    }

    const exam =
      await SchoolExam.findOneAndUpdate(
        {
          _id: req.params.id,
          deletedAt: null,
        },
        {
          $set: {
            examinerId,
            examinerName,
            assignedById:
              userId(req),
            assignedByName:
              userName(req),
            acceptedAt:
              new Date(),
          },
        },
        {
          new: true,
        },
      );

    if (!exam) {
      return void res
        .status(404)
        .json({
          error: "Exame não encontrado.",
        });
    }

    await audit(
      req,
      "SCHOOL_EXAM_ASSIGNED",
      "info",
      `${userName(req)} atribuiu o Exame Final de ${exam.studentName} a ${examinerName}.`,
      String(exam._id),
      exam.studentName,
      {
        examinerId,
        examinerName,
      },
    );

    res.json({ exam });
  },
);

router.post(
  "/:id/schedule",
  requireExaminer,
  async (req, res) => {
    const scheduledAt =
      new Date(req.body?.scheduledAt);

    if (
      Number.isNaN(
        scheduledAt.getTime(),
      )
    ) {
      return void res
        .status(400)
        .json({
          error: "Data inválida.",
        });
    }

    const exam =
      await SchoolExam.findOneAndUpdate(
        {
          _id: req.params.id,
          deletedAt: null,
        },
        {
          $set: {
            status: "SCHEDULED",
            scheduledAt,
            examinerId:
              String(
                req.body?.examinerId ||
                userId(req),
              ),
            examinerName:
              String(
                req.body?.examinerName ||
                userName(req),
              ),
            patrolCallsign:
              "LINCOLN",
            patrolVehicle:
              String(
                req.body?.patrolVehicle ||
                "",
              ).trim() ||
              null,
          },
        },
        {
          new: true,
        },
      );

    if (!exam) {
      return void res
        .status(404)
        .json({
          error: "Exame não encontrado.",
        });
    }

    await audit(
      req,
      "SCHOOL_EXAM_SCHEDULED",
      "info",
      `${userName(req)} agendou o Exame Final de ${exam.studentName}.`,
      String(exam._id),
      exam.studentName,
      {
        scheduledAt,
        patrolVehicle:
          exam.patrolVehicle,
      },
    );

    res.json({ exam });
  },
);

router.post(
  "/:id/start",
  requireExaminer,
  async (req, res) => {
    const exam =
      await SchoolExam.findOneAndUpdate(
        {
          _id: req.params.id,
          deletedAt: null,
          status: {
            $in: [
              "REQUESTED",
              "SCHEDULED",
            ],
          },
        },
        {
          $set: {
            status: "IN_PROGRESS",
            startedAt: new Date(),
            examinerId:
              userId(req),
            examinerName:
              userName(req),
          },
        },
        {
          new: true,
        },
      );

    if (!exam) {
      return void res
        .status(404)
        .json({
          error:
            "Exame não encontrado ou não pode ser iniciado.",
        });
    }

    await audit(
      req,
      "SCHOOL_EXAM_STARTED",
      "info",
      `${userName(req)} iniciou o Exame Final de ${exam.studentName}.`,
      String(exam._id),
      exam.studentName,
    );

    res.json({ exam });
  },
);

router.post(
  "/:id/result",
  requireExaminer,
  async (req, res) => {
    const result =
      String(req.body?.result || "")
        .toUpperCase();

    if (
      ![
        "APPROVED",
        "FAILED",
      ].includes(result)
    ) {
      return void res
        .status(400)
        .json({
          error: "Resultado inválido.",
        });
    }

    const score =
      Number(req.body?.score);

    if (
      !Number.isFinite(score) ||
      score < 0 ||
      score > 20
    ) {
      return void res
        .status(400)
        .json({
          error:
            "A classificação deve estar entre 0 e 20.",
        });
    }

    const criteria =
      Array.isArray(req.body?.criteria)
        ? req.body.criteria
        : [];

    const failureReason =
      String(
        req.body?.failureReason || "",
      ).trim();

    if (
      result === "FAILED" &&
      failureReason.length < 5
    ) {
      return void res
        .status(400)
        .json({
          error:
            "O motivo da reprovação é obrigatório.",
        });
    }

    const exam =
      await SchoolExam.findOneAndUpdate(
        {
          _id: req.params.id,
          deletedAt: null,
        },
        {
          $set: {
            status: result,
            score,
            criteria,
            notes:
              String(
                req.body?.notes || "",
              ).trim(),
            failureReason:
              result === "FAILED"
                ? failureReason
                : "",
            practicalEvaluationCompleted:
              true,
            decidedAt:
              new Date(),
            resultRecordedBy:
              userId(req),
            resultRecordedByName:
              userName(req),
            secondFailureAction:
              result === "FAILED" &&
              Number(
                req.body?.attempt ||
                1,
              ) >= 2
                ? "EXCLUSION_RECOMMENDED"
                : "NONE",
          },
        },
        {
          new: true,
          runValidators: true,
        },
      );

    if (!exam) {
      return void res
        .status(404)
        .json({
          error: "Exame não encontrado.",
        });
    }

    const discord =
      await sendFinalExamResultEmbed(
        exam,
      ).catch(
        (error) => ({
          sent: false,
          reason:
            error?.message ||
            String(error),
        }),
      );

    await audit(
      req,
      result === "APPROVED"
        ? "SCHOOL_EXAM_APPROVED"
        : "SCHOOL_EXAM_FAILED",
      result === "APPROVED"
        ? "success"
        : "warning",
      `${userName(req)} ${result === "APPROVED" ? "aprovou" : "reprovou"} ${exam.studentName} no Exame Final.`,
      String(exam._id),
      exam.studentName,
      {
        score,
        criteria,
        discord,
      },
    );

    res.json({
      exam,
      discord,
    });
  },
);

router.post(
  "/:id/archive",
  requireManagement,
  async (req, res) => {
    const exam =
      await SchoolExam.findOneAndUpdate(
        {
          _id: req.params.id,
          deletedAt: null,
        },
        {
          $set: {
            status: "ARCHIVED",
            archivedAt:
              new Date(),
            archivedById:
              userId(req),
            archivedByName:
              userName(req),
          },
        },
        {
          new: true,
        },
      );

    if (!exam) {
      return void res
        .status(404)
        .json({
          error: "Exame não encontrado.",
        });
    }

    await audit(
      req,
      "SCHOOL_EXAM_ARCHIVED",
      "info",
      `${userName(req)} arquivou o Exame Final de ${exam.studentName}.`,
      String(exam._id),
      exam.studentName,
    );

    res.json({ exam });
  },
);

router.post(
  "/:id/delete",
  requireManagement,
  async (req, res) => {
    const reason =
      String(
        req.body?.reason || "",
      ).trim();

    if (reason.length < 5) {
      return void res
        .status(400)
        .json({
          error:
            "Indica o motivo da remoção.",
        });
    }

    const exam =
      await SchoolExam.findOneAndUpdate(
        {
          _id: req.params.id,
          deletedAt: null,
        },
        {
          $set: {
            deletedAt:
              new Date(),
            deletedById:
              userId(req),
            deletedByName:
              userName(req),
            deletionReason:
              reason,
          },
        },
        {
          new: true,
        },
      );

    if (!exam) {
      return void res
        .status(404)
        .json({
          error: "Exame não encontrado.",
        });
    }

    await audit(
      req,
      "SCHOOL_EXAM_DELETED",
      "warning",
      `${userName(req)} removeu logicamente o Exame Final de ${exam.studentName}.`,
      String(exam._id),
      exam.studentName,
      { reason },
    );

    res.json({ exam });
  },
);

router.post(
  "/:id/restore",
  requireManagement,
  async (req, res) => {
    const exam =
      await SchoolExam.findOneAndUpdate(
        {
          _id: req.params.id,
          deletedAt: {
            $ne: null,
          },
        },
        {
          $set: {
            deletedAt: null,
            deletedById: null,
            deletedByName: null,
            deletionReason: "",
          },
        },
        {
          new: true,
        },
      );

    if (!exam) {
      return void res
        .status(404)
        .json({
          error:
            "Exame eliminado não encontrado.",
        });
    }

    await audit(
      req,
      "SCHOOL_EXAM_RESTORED",
      "success",
      `${userName(req)} restaurou o Exame Final de ${exam.studentName}.`,
      String(exam._id),
      exam.studentName,
    );

    res.json({ exam });
  },
);

export default router;
