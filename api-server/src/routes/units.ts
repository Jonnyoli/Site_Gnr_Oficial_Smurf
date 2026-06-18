import crypto from "node:crypto";
import { Router, type Request, type Response, type NextFunction } from "express";

import UnitOperation from "../models/UnitOperation.js";
import {
  WEEKLY_GOALS,
  getWeekRange,
  recalculateAllUnits,
  recalculateUnitWeek,
} from "../services/unitGoalsService.js";
import {
  notifyChangesRequested,
  notifyDocumentIssued,
  notifyReadyForDocument,
  notifyReportPendingCommand,
  notifyReportPendingDirector,
} from "../services/operationalNotificationService.js";

const router = Router();

const COMMAND_GENERAL_ROLE_ID = "1147878942099906672";
const NIC_DIRECTOR_ROLE_ID = "1296910327879045130";
const NIC_MEMBER_ROLE_ID = "1296910359994564700";
const DEV_USER_ID = "713719718091030599";

const UNIT_ROLE_IDS = {
  UNT: "1147878941885988929",
  NIC: NIC_MEMBER_ROLE_ID,
  USHE: "1332075102879219793",
  GIOE: "1147878941974077473",
  GSA: "1147878941927952470",
  DI: "1187379939708780544",
};

function sessionUser(req: Request) {
  return req.session?.user || null;
}

function userId(req: Request) {
  return String(sessionUser(req)?.id || "");
}

function userName(req: Request) {
  const user = sessionUser(req);

  return (
    user?.displayName ||
    user?.global_name ||
    user?.username ||
    "Utilizador da Central"
  );
}

function userRoles(req: Request): string[] {
  const roles = sessionUser(req)?.roles;
  return Array.isArray(roles) ? roles.map(String) : [];
}

function hasRole(req: Request, roleId: string) {
  return userRoles(req).includes(roleId);
}

function isCommandGeneral(req: Request) {
  return userId(req) === DEV_USER_ID || hasRole(req, COMMAND_GENERAL_ROLE_ID);
}

function isNicDirector(req: Request) {
  return hasRole(req, NIC_DIRECTOR_ROLE_ID);
}

function hasUnitRole(req: Request, unit: string) {
  if (isCommandGeneral(req)) return true;

  const roleId = UNIT_ROLE_IDS[unit as keyof typeof UNIT_ROLE_IDS];

  return Boolean(roleId && hasRole(req, roleId));
}

function requireAuthentication(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!sessionUser(req)) {
    res.status(401).json({ error: "É necessário iniciar sessão." });
    return;
  }

  next();
}

function requireUnitAccess(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const unit = String(
    req.params.unit ||
    req.body.primaryUnit ||
    "",
  ).toUpperCase();

  if (!hasUnitRole(req, unit)) {
    res.status(403).json({
      error: "Não tens permissão para aceder aos dados desta unidade.",
    });
    return;
  }

  next();
}

function requireCommandGeneral(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!isCommandGeneral(req)) {
    res.status(403).json({
      error: "Apenas o Comando-Geral pode executar esta ação.",
    });
    return;
  }

  next();
}

function actor(req: Request) {
  return {
    discordId: userId(req),
    name: userName(req),
  };
}

function createApprovalCode(prefix: string) {
  return `${prefix}-${new Date().getFullYear()}-${crypto
    .randomBytes(4)
    .toString("hex")
    .toUpperCase()}`;
}

function createCaseNumber() {
  return `NIC-${new Date().getFullYear()}-${crypto
    .randomBytes(3)
    .toString("hex")
    .toUpperCase()}`;
}

function normalizeSupportUnits(value: unknown) {
  if (!Array.isArray(value)) return [];

  return [
    ...new Set(
      value
        .map((item) => String(item).toUpperCase())
        .filter(Boolean),
    ),
  ];
}

function normalizeParticipants(value: unknown, req: Request) {
  if (!Array.isArray(value)) return [];

  return value
    .map((participant: any) => ({
      discordId: String(participant?.discordId || "").trim(),
      name: String(participant?.name || "").trim(),
      rank: participant?.rank ? String(participant.rank).trim() : null,
      role: participant?.role
        ? String(participant.role).trim()
        : "OPERACIONAL",
      canContribute: participant?.canContribute === true,
      addedAt: new Date(),
      addedByDiscordId: userId(req) || null,
    }))
    .filter((participant) => participant.discordId && participant.name);
}

function normalizeAttachments(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((attachment: any) => ({
      filename: String(attachment?.filename || "Anexo").trim(),
      url: String(attachment?.url || "").trim(),
      contentType: attachment?.contentType || null,
      size: Number(attachment?.size || 0),
    }))
    .filter((attachment) => /^https?:\/\//i.test(attachment.url));
}

function isOperationOwner(operation: any, req: Request) {
  return String(operation.createdByDiscordId || "") === userId(req);
}

function isOperationParticipant(operation: any, req: Request) {
  return (operation.participants || []).some(
    (participant: any) =>
      String(participant.discordId || "") === userId(req),
  );
}

function canViewOperation(operation: any, req: Request) {
  if (isCommandGeneral(req) || isNicDirector(req)) return true;

  if (!operation.isPrivateInvestigation) {
    return hasUnitRole(req, operation.primaryUnit);
  }

  return isOperationOwner(operation, req) || isOperationParticipant(operation, req);
}

function canEditOperation(operation: any, req: Request) {
  if (isCommandGeneral(req) || isNicDirector(req)) return true;

  if (
    operation.status === "OFFICIAL_DOCUMENT_ISSUED" ||
    operation.officialDocument?.issued
  ) {
    return false;
  }

  return isOperationOwner(operation, req);
}

function canSubmitReport(operation: any, req: Request) {
  return isCommandGeneral(req) || isNicDirector(req) || isOperationOwner(operation, req);
}

function operationPermissions(operation: any, req: Request) {
  return {
    view: canViewOperation(operation, req),
    edit: canEditOperation(operation, req),
    submitReport: canSubmitReport(operation, req),
    directorApprove:
      isNicDirector(req) &&
      operation.reportStatus === "PENDING_DIRECTOR",
    commandApprove:
      isCommandGeneral(req) &&
      operation.reportStatus === "PENDING_COMMAND" &&
      operation.directorApproval?.status === "APPROVED",
    delete: isCommandGeneral(req),
    issueDocument:
      isCommandGeneral(req) &&
      operation.reportStatus === "VALIDATED" &&
      operation.directorApproval?.status === "APPROVED" &&
      operation.commandApproval?.status === "APPROVED",
  };
}

async function recalculateImpacted(operation: any, req: Request) {
  const impacted = [
    operation.primaryUnit,
    ...(operation.supportUnits || []),
  ];

  for (const unit of [...new Set(impacted)]) {
    await recalculateUnitWeek(
      unit,
      operation.completedAt || operation.scheduledAt || new Date(),
      actor(req),
    );
  }
}

function buildVisibleOperationFilter(req: Request, baseFilter: any = {}) {
  if (isCommandGeneral(req) || isNicDirector(req)) {
    return baseFilter;
  }

  return {
    ...baseFilter,
    $and: [
      ...(baseFilter.$and || []),
      {
        $or: [
          { isPrivateInvestigation: false },
          { createdByDiscordId: userId(req) },
          { "participants.discordId": userId(req) },
        ],
      },
    ],
  };
}

router.get("/summary", requireAuthentication, async (req, res) => {
  try {
    const date = req.query.date ? new Date(String(req.query.date)) : new Date();
    const items = await recalculateAllUnits(date, actor(req));

    res.json({
      items,
      canManage: isCommandGeneral(req),
    });
  } catch (error) {
    console.error("[units] Erro no resumo:", error);
    res.status(500).json({ error: "Não foi possível carregar o resumo das unidades." });
  }
});

router.get("/operations/:id", requireAuthentication, async (req, res) => {
  try {
    const operation = await UnitOperation.findById(req.params.id).lean();

    if (!operation) {
      res.status(404).json({ error: "Operação não encontrada." });
      return;
    }

    if (!canViewOperation(operation, req)) {
      res.status(403).json({
        error: "Não tens autorização para consultar esta investigação.",
      });
      return;
    }

    res.json({
      operation,
      permissions: operationPermissions(operation, req),
    });
  } catch (error) {
    console.error("[units] Erro ao carregar operação:", error);
    res.status(500).json({ error: "Não foi possível carregar a operação." });
  }
});

router.get("/:unit", requireAuthentication, requireUnitAccess, async (req, res) => {
  try {
    const unit = String(req.params.unit).toUpperCase();
    const date = req.query.date ? new Date(String(req.query.date)) : new Date();
    const { start, end } = getWeekRange(date);

    const baseFilter = {
      $or: [{ primaryUnit: unit }, { supportUnits: unit }],
      scheduledAt: {
        $gte: new Date(start.getTime() - 14 * 24 * 60 * 60 * 1000),
        $lte: new Date(end.getTime() + 30 * 24 * 60 * 60 * 1000),
      },
    };

    const [progress, operations] = await Promise.all([
      recalculateUnitWeek(unit, date, actor(req)),
      UnitOperation.find(buildVisibleOperationFilter(req, baseFilter))
        .sort({ scheduledAt: -1, createdAt: -1 })
        .lean(),
    ]);

    res.json({
      unit,
      progress,
      operations: operations.map((operation) => ({
        ...operation,
        permissions: operationPermissions(operation, req),
      })),
      goals: WEEKLY_GOALS[unit] || [],
      permissions: {
        view: true,
        create: hasUnitRole(req, unit),
        manageAll: isCommandGeneral(req) || isNicDirector(req),
        delete: isCommandGeneral(req),
        director: isNicDirector(req),
        command: isCommandGeneral(req),
      },
    });
  } catch (error) {
    console.error("[units] Erro ao carregar unidade:", error);
    res.status(500).json({ error: "Não foi possível carregar a unidade." });
  }
});

router.post("/:unit/operations", requireAuthentication, requireUnitAccess, async (req, res) => {
  try {
    const unit = String(req.params.unit).toUpperCase();
    const category = String(req.body.category || "OTHER").toUpperCase();
    const participants = normalizeParticipants(req.body.participants, req);

    const isPrivateInvestigation =
      unit === "NIC" &&
      ["INVESTIGATION", "INTELLIGENCE"].includes(category);

    const operation = await UnitOperation.create({
      caseNumber: isPrivateInvestigation ? createCaseNumber() : null,
      title: String(req.body.title || "").trim(),
      category,
      primaryUnit: unit,
      supportUnits: normalizeSupportUnits(req.body.supportUnits),
      isPrivateInvestigation,
      status: "DRAFT",
      reportStatus: "NOT_REQUIRED",
      commanderDiscordId: req.body.commanderDiscordId || userId(req),
      commanderName: req.body.commanderName || userName(req),
      participants,
      location: req.body.location || null,
      briefing: req.body.briefing || "",
      objective: req.body.objective || "",
      scheduledAt: new Date(req.body.scheduledAt || Date.now()),
      attachments: normalizeAttachments(req.body.attachments),
      createdByDiscordId: userId(req),
      createdByName: userName(req),
      directorApproval: { status: "PENDING" },
      commandApproval: { status: "PENDING" },
      auditEvents: [
        {
          type: "CREATED",
          actorDiscordId: userId(req),
          actorName: userName(req),
          metadata: {
            participantCount: participants.length,
            privateInvestigation: isPrivateInvestigation,
          },
        },
      ],
    });

    res.status(201).json({
      ok: true,
      operation,
      permissions: operationPermissions(operation, req),
      message: isPrivateInvestigation
        ? "Investigação privada aberta com sucesso."
        : "Operação criada com sucesso.",
    });
  } catch (error) {
    console.error("[units] Erro ao criar operação:", error);
    res.status(500).json({ error: "Não foi possível criar a operação." });
  }
});

router.patch("/operations/:id/status", requireAuthentication, async (req, res) => {
  try {
    const operation = await UnitOperation.findById(req.params.id);

    if (!operation) {
      res.status(404).json({ error: "Operação não encontrada." });
      return;
    }

    if (!canEditOperation(operation, req)) {
      res.status(403).json({
        error: "Não tens permissão para alterar esta investigação.",
      });
      return;
    }

    const status = String(req.body.status || "").toUpperCase();
    const ownerAllowed = ["DRAFT", "SUBMITTED", "IN_PROGRESS"];
    const elevatedAllowed = ["DRAFT", "SUBMITTED", "APPROVED", "IN_PROGRESS", "CANCELLED"];
    const allowed = isCommandGeneral(req) || isNicDirector(req)
      ? elevatedAllowed
      : ownerAllowed;

    if (!allowed.includes(status)) {
      res.status(400).json({ error: "Não tens permissão para aplicar esse estado." });
      return;
    }

    operation.status = status;

    if (status === "APPROVED") {
      operation.approvedByDiscordId = userId(req);
      operation.approvedByName = userName(req);
      operation.approvedAt = new Date();
    }

    if (status === "IN_PROGRESS" && !operation.startedAt) {
      operation.startedAt = new Date();
    }

    if (status === "CANCELLED") {
      operation.completedAt = null;
      operation.reportStatus = "NOT_REQUIRED";
    }

    operation.auditEvents.push({
      type: status === "APPROVED"
        ? "APPROVED"
        : status === "CANCELLED"
          ? "CANCELLED"
          : "STATUS_CHANGED",
      actorDiscordId: userId(req),
      actorName: userName(req),
      metadata: { status },
    });

    await operation.save();
    await recalculateImpacted(operation, req);

    res.json({
      ok: true,
      operation,
      permissions: operationPermissions(operation, req),
      message: "Estado atualizado.",
    });
  } catch (error) {
    console.error("[units] Erro ao alterar estado:", error);
    res.status(500).json({ error: "Não foi possível alterar o estado." });
  }
});

router.post("/operations/:id/report", requireAuthentication, async (req, res) => {
  try {
    const operation = await UnitOperation.findById(req.params.id);

    if (!operation) {
      res.status(404).json({ error: "Operação não encontrada." });
      return;
    }

    if (!canSubmitReport(operation, req)) {
      res.status(403).json({
        error: "Só o responsável pela investigação pode submeter o relatório.",
      });
      return;
    }

    const finalReport = String(req.body.finalReport || "").trim();
    const result = String(req.body.result || "").trim();

    if (finalReport.length < 20 || result.length < 5) {
      res.status(400).json({
        error: "Preenche o resultado e um relatório final com pelo menos 20 caracteres.",
      });
      return;
    }

    operation.result = result;
    operation.finalReport = finalReport;
    operation.resultMetrics = {
      arrests: Number(req.body.resultMetrics?.arrests || 0),
      seizures: Number(req.body.resultMetrics?.seizures || 0),
      injured: Number(req.body.resultMetrics?.injured || 0),
      seizedVehicles: Number(req.body.resultMetrics?.seizedVehicles || 0),
      fines: Number(req.body.resultMetrics?.fines || 0),
    } as any;
    operation.reportAttachments = normalizeAttachments(req.body.attachments) as any;

    operation.status = "COMPLETED";
    operation.completedAt = new Date();
    operation.reportStatus = "PENDING_DIRECTOR";
    operation.reportSubmittedByDiscordId = userId(req);
    operation.reportSubmittedByName = userName(req);
    operation.reportSubmittedAt = new Date();
    operation.reportRejectionReason = "";
    operation.directorApproval = { status: "PENDING" } as any;
    operation.commandApproval = { status: "PENDING" } as any;

    operation.auditEvents.push({
      type: "REPORT_SUBMITTED",
      actorDiscordId: userId(req),
      actorName: userName(req),
    });

    await operation.save();
    await recalculateImpacted(operation, req);
    await notifyReportPendingDirector(operation);

    res.json({
      ok: true,
      operation,
      permissions: operationPermissions(operation, req),
      message: "Relatório submetido e a aguardar validação do Diretor do NIC.",
    });
  } catch (error) {
    console.error("[units] Erro ao submeter relatório:", error);
    res.status(500).json({ error: "Não foi possível submeter o relatório." });
  }
});

router.patch("/operations/:id/director/approve", requireAuthentication, async (req, res) => {
  try {
    const operation = await UnitOperation.findById(req.params.id);

    if (!operation) {
      res.status(404).json({ error: "Operação não encontrada." });
      return;
    }

    if (!isNicDirector(req)) {
      res.status(403).json({ error: "Apenas o Diretor do NIC pode executar esta validação." });
      return;
    }

    if (operation.reportStatus !== "PENDING_DIRECTOR") {
      res.status(400).json({ error: "Este relatório não aguarda validação do Diretor." });
      return;
    }

    operation.directorApproval = {
      status: "APPROVED",
      actorDiscordId: userId(req),
      actorName: userName(req),
      actorRoleId: NIC_DIRECTOR_ROLE_ID,
      note: String(req.body.note || "").trim(),
      at: new Date(),
      code: createApprovalCode("NIC"),
    } as any;
    operation.reportStatus = "PENDING_COMMAND";

    operation.auditEvents.push({
      type: "DIRECTOR_APPROVED",
      actorDiscordId: userId(req),
      actorName: userName(req),
      metadata: {
        approvedOwnInvestigation: isOperationOwner(operation, req),
        nextStage: "PENDING_COMMAND",
      },
    });

    await operation.save();
    await notifyReportPendingCommand(operation);

    res.json({
      ok: true,
      operation,
      permissions: operationPermissions(operation, req),
      message: "Relatório aprovado pelo Diretor e enviado ao Comando-Geral.",
    });
  } catch (error) {
    console.error("[units] Erro na validação do Diretor:", error);
    res.status(500).json({ error: "Não foi possível validar o relatório." });
  }
});

router.patch("/operations/:id/director/request-changes", requireAuthentication, async (req, res) => {
  try {
    const operation = await UnitOperation.findById(req.params.id);

    if (!operation) {
      res.status(404).json({ error: "Operação não encontrada." });
      return;
    }

    if (!isNicDirector(req)) {
      res.status(403).json({ error: "Apenas o Diretor do NIC pode pedir correções." });
      return;
    }

    const note = String(req.body.note || "").trim();

    if (note.length < 5) {
      res.status(400).json({ error: "Indica as correções necessárias." });
      return;
    }

    operation.directorApproval = {
      status: "CHANGES_REQUESTED",
      actorDiscordId: userId(req),
      actorName: userName(req),
      actorRoleId: NIC_DIRECTOR_ROLE_ID,
      note,
      at: new Date(),
      code: null,
    } as any;
    operation.reportStatus = "CHANGES_REQUESTED";
    operation.reportRejectionReason = note;

    operation.auditEvents.push({
      type: "DIRECTOR_CHANGES_REQUESTED",
      actorDiscordId: userId(req),
      actorName: userName(req),
      metadata: { note },
    });

    await operation.save();
    await recalculateImpacted(operation, req);
    await notifyChangesRequested(
      operation,
      "Diretor do NIC",
      note,
    );

    res.json({
      ok: true,
      operation,
      permissions: operationPermissions(operation, req),
      message: "Relatório devolvido ao responsável para correções.",
    });
  } catch (error) {
    console.error("[units] Erro ao pedir correções:", error);
    res.status(500).json({ error: "Não foi possível pedir correções." });
  }
});

router.patch("/operations/:id/command/approve", requireAuthentication, requireCommandGeneral, async (req, res) => {
  try {
    const operation = await UnitOperation.findById(req.params.id);

    if (!operation) {
      res.status(404).json({ error: "Operação não encontrada." });
      return;
    }

    if (
      operation.reportStatus !== "PENDING_COMMAND" ||
      operation.directorApproval?.status !== "APPROVED"
    ) {
      res.status(400).json({
        error: "O relatório ainda não foi aprovado pelo Diretor do NIC.",
      });
      return;
    }

    operation.commandApproval = {
      status: "APPROVED",
      actorDiscordId: userId(req),
      actorName: userName(req),
      actorRoleId: COMMAND_GENERAL_ROLE_ID,
      note: String(req.body.note || "").trim(),
      at: new Date(),
      code: createApprovalCode("CG"),
    } as any;
    operation.reportStatus = "VALIDATED";

    operation.auditEvents.push({
      type: "COMMAND_APPROVED",
      actorDiscordId: userId(req),
      actorName: userName(req),
    });

    await operation.save();
    await recalculateImpacted(operation, req);
    await notifyReadyForDocument(operation);

    res.json({
      ok: true,
      operation,
      permissions: operationPermissions(operation, req),
      message: "Relatório validado pelo Comando-Geral. Já conta para as metas.",
    });
  } catch (error) {
    console.error("[units] Erro na validação do Comando:", error);
    res.status(500).json({ error: "Não foi possível validar o relatório." });
  }
});

router.patch("/operations/:id/command/request-changes", requireAuthentication, requireCommandGeneral, async (req, res) => {
  try {
    const operation = await UnitOperation.findById(req.params.id);

    if (!operation) {
      res.status(404).json({ error: "Operação não encontrada." });
      return;
    }

    const note = String(req.body.note || "").trim();

    if (note.length < 5) {
      res.status(400).json({ error: "Indica as correções necessárias." });
      return;
    }

    operation.commandApproval = {
      status: "CHANGES_REQUESTED",
      actorDiscordId: userId(req),
      actorName: userName(req),
      actorRoleId: COMMAND_GENERAL_ROLE_ID,
      note,
      at: new Date(),
      code: null,
    } as any;
    operation.reportStatus = "CHANGES_REQUESTED";
    operation.reportRejectionReason = note;

    operation.auditEvents.push({
      type: "COMMAND_CHANGES_REQUESTED",
      actorDiscordId: userId(req),
      actorName: userName(req),
      metadata: { note },
    });

    await operation.save();
    await recalculateImpacted(operation, req);
    await notifyChangesRequested(
      operation,
      "Comando-Geral",
      note,
    );

    res.json({
      ok: true,
      operation,
      permissions: operationPermissions(operation, req),
      message: "Relatório devolvido para correções.",
    });
  } catch (error) {
    console.error("[units] Erro ao pedir correções:", error);
    res.status(500).json({ error: "Não foi possível pedir correções." });
  }
});


router.patch(
  "/operations/:id/official-document/issue",
  requireAuthentication,
  requireCommandGeneral,
  async (req, res) => {
    try {
      const operation = await UnitOperation.findById(req.params.id);

      if (!operation) {
        res.status(404).json({ error: "Operação não encontrada." });
        return;
      }

      if (
        operation.reportStatus !== "VALIDATED" ||
        operation.directorApproval?.status !== "APPROVED" ||
        operation.commandApproval?.status !== "APPROVED"
      ) {
        res.status(400).json({
          error:
            "O documento só pode ser emitido depois das validações do Diretor do NIC e do Comando-Geral.",
        });
        return;
      }

      const verificationCode =
        operation.officialDocument?.verificationCode ||
        `DOC-${new Date().getFullYear()}-${crypto
          .randomBytes(5)
          .toString("hex")
          .toUpperCase()}`;

      const sourceForHash = JSON.stringify({
        id: String(operation._id),
        caseNumber: operation.caseNumber,
        title: operation.title,
        category: operation.category,
        primaryUnit: operation.primaryUnit,
        supportUnits: operation.supportUnits,
        createdByDiscordId: operation.createdByDiscordId,
        result: operation.result,
        finalReport: operation.finalReport,
        resultMetrics: operation.resultMetrics,
        directorApproval: operation.directorApproval,
        commandApproval: operation.commandApproval,
        completedAt: operation.completedAt,
        verificationCode,
      });

      const documentHash = crypto
        .createHash("sha256")
        .update(sourceForHash)
        .digest("hex");

      operation.officialDocument = {
        issued: true,
        issuedAt: new Date(),
        issuedByDiscordId: userId(req),
        issuedByName: userName(req),
        verificationCode,
        documentHash,
        fileUrl: null,
        version: Number(operation.officialDocument?.version || 1),
      } as any;

      operation.status = "OFFICIAL_DOCUMENT_ISSUED";

      operation.auditEvents.push({
        type: "OFFICIAL_DOCUMENT_ISSUED",
        actorDiscordId: userId(req),
        actorName: userName(req),
        metadata: {
          verificationCode,
          documentHash,
          version: operation.officialDocument.version,
        },
      });

      await operation.save();
      await notifyDocumentIssued(operation);

      res.json({
        ok: true,
        operation,
        permissions: operationPermissions(operation, req),
        message: "Documento oficial emitido com sucesso.",
      });
    } catch (error) {
      console.error("[units] Erro ao emitir documento oficial:", error);

      res.status(500).json({
        error: "Não foi possível emitir o documento oficial.",
      });
    }
  },
);

router.patch("/:unit/goals/:goalId/adjust", requireAuthentication, requireCommandGeneral, async (req, res) => {
  try {
    const unit = String(req.params.unit).toUpperCase();
    const date = req.body.date ? new Date(req.body.date) : new Date();
    const progress = await recalculateUnitWeek(unit, date, actor(req));
    const goal = progress.goals.find(
      (item: any) => item.goalId === req.params.goalId,
    );

    if (!goal) {
      res.status(404).json({ error: "Meta não encontrada." });
      return;
    }

    goal.manualAdjustment = Number(req.body.adjustment || 0);
    await progress.save();

    const recalculated = await recalculateUnitWeek(unit, date, actor(req));

    res.json({
      ok: true,
      progress: recalculated,
      message: "Correção aplicada.",
    });
  } catch (error) {
    console.error("[units] Erro ao ajustar meta:", error);
    res.status(500).json({ error: "Não foi possível ajustar a meta." });
  }
});

router.delete("/operations/:id", requireAuthentication, requireCommandGeneral, async (req, res) => {
  try {
    const operation = await UnitOperation.findByIdAndDelete(req.params.id);

    if (!operation) {
      res.status(404).json({ error: "Operação não encontrada." });
      return;
    }

    await recalculateImpacted(operation, req);

    res.json({ ok: true, message: "Operação apagada." });
  } catch (error) {
    console.error("[units] Erro ao apagar operação:", error);
    res.status(500).json({ error: "Não foi possível apagar a operação." });
  }
});

export default router;
