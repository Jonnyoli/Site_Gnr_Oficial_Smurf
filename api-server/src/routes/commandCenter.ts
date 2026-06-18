import { Router, type Request, type Response, type NextFunction } from "express";
import ExecutiveDecision from "../models/ExecutiveDecision.js";
import DepartmentDeadline from "../models/DepartmentDeadline.js";
import CEGInspection from "../models/CEGInspection.js";
import DRHProcess from "../models/DRHProcess.js";

const router = Router();

const ROLE_IDS = {
  CEG: "1417907622270599189",
  CSO: "1417908597949595681",
  DRH: "1147878941885988926",
  COMMAND: "1147878942099906672",
};

const DEV_USER_ID = "713719718091030599";

function user(req: Request) {
  return req.session?.user || null;
}

function userId(req: Request) {
  return String(user(req)?.id || "");
}

function userName(req: Request) {
  const current = user(req);

  return (
    current?.displayName ||
    current?.global_name ||
    current?.username ||
    "Utilizador da Central"
  );
}

function roles(req: Request) {
  return Array.isArray(user(req)?.roles)
    ? user(req).roles.map(String)
    : [];
}

function hasRole(req: Request, roleId: string) {
  return userId(req) === DEV_USER_ID || roles(req).includes(roleId);
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!user(req)) {
    res.status(401).json({ error: "É necessário iniciar sessão." });
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


function requireCommand(req: Request, res: Response, next: NextFunction) {
  if (!hasRole(req, ROLE_IDS.COMMAND)) {
    res.status(403).json({ error: "Área reservada ao Comando-Geral." });
    return;
  }

  next();
}

router.get("/", requireAuth, requireCommand, async (req, res) => {
  const decisions = await ExecutiveDecision.find()
    .sort({
      status: 1,
      priority: -1,
      createdAt: -1,
    })
    .limit(300)
    .lean();

  const deadlines = await DepartmentDeadline.find({ status: "OPEN" })
    .sort({ dueAt: 1 })
    .limit(100)
    .lean();

  return res.json({
    decisions,
    deadlines,
    summary: {
      pending: decisions.filter((item) => item.status === "PENDING").length,
      urgent: decisions.filter((item) => item.status === "PENDING" && item.priority === "URGENT").length,
      clarification: decisions.filter((item) => item.status === "CLARIFICATION").length,
      overdue: deadlines.filter((item) => new Date(item.dueAt) < new Date()).length,
    },
  });
});

router.post("/:id/decide", requireAuth, requireCommand, async (req, res) => {
  const decision = await ExecutiveDecision.findById(req.params.id);

  if (!decision) {
    return res.status(404).json({ error: "Decisão não encontrada." });
  }

  const action = String(req.body.action || "");

  if (!["APPROVED", "RETURNED", "REJECTED", "CLARIFICATION_REQUESTED"].includes(action)) {
    return res.status(400).json({ error: "Ação inválida." });
  }

  decision.actions.push({
    type: action,
    actorDiscordId: userId(req),
    actorName: userName(req),
    note: req.body.note || "",
  });

  decision.status =
    action === "APPROVED"
      ? "APPROVED"
      : action === "RETURNED"
        ? "RETURNED"
        : action === "REJECTED"
          ? "REJECTED"
          : "CLARIFICATION";

  if (["APPROVED", "RETURNED", "REJECTED"].includes(action)) {
    decision.resolvedAt = new Date();
  }

  await decision.save();

  if (decision.sourceType === "CEGInspection") {
    const inspection = await CEGInspection.findById(decision.sourceId);

    if (inspection) {
      inspection.status =
        action === "APPROVED"
          ? "APPROVED"
          : action === "REJECTED"
            ? "ARCHIVED"
            : "RETURNED";
      inspection.commandDecision = req.body.note || action;
      if (action === "APPROVED") inspection.approvedAt = new Date();
      await inspection.save();
    }
  }

  if (decision.sourceType === "DRHProcess") {
    const process = await DRHProcess.findById(decision.sourceId);

    if (process) {
      process.status =
        action === "APPROVED"
          ? "APPROVED"
          : action === "REJECTED"
            ? "REJECTED"
            : "OPEN";
      process.commandDecision = req.body.note || action;
      process.commandDecisionAt = new Date();
      process.commandDecisionByDiscordId = userId(req);
      process.commandDecisionByName = userName(req);
      await process.save();
    }
  }

  return res.json({ decision });
});

export default router;
