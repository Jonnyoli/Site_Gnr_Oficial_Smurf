import { Router, type Request, type Response, type NextFunction } from "express";
import CEGInspection from "../models/CEGInspection.js";
import { nextReference, createExecutiveDecision, createDeadline } from "../services/departmentWorkflowService.js";

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


function requireCEG(req: Request, res: Response, next: NextFunction) {
  if (!hasRole(req, ROLE_IDS.CEG) && !hasRole(req, ROLE_IDS.COMMAND)) {
    res.status(403).json({ error: "Área reservada ao CEG e Comando-Geral." });
    return;
  }

  next();
}

router.get("/", requireAuth, requireCEG, async (req, res) => {
  const inspections = await CEGInspection.find()
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  return res.json({
    inspections,
    summary: {
      total: inspections.length,
      critical: inspections.filter((item) => item.risk === "CRITICAL").length,
      attention: inspections.filter((item) => item.risk === "ATTENTION").length,
      pendingCommand: inspections.filter((item) => item.status === "AWAITING_COMMAND").length,
    },
  });
});

router.post("/", requireAuth, requireCEG, async (req, res) => {
  const periodStart = new Date(req.body.periodStart);
  const periodEnd = new Date(req.body.periodEnd);

  if (!req.body.unit || !req.body.title || Number.isNaN(periodStart.getTime()) || Number.isNaN(periodEnd.getTime())) {
    return res.status(400).json({ error: "Unidade, título e período são obrigatórios." });
  }

  const inspection = await CEGInspection.create({
    inspectionNumber: nextReference("FISC"),
    unit: req.body.unit,
    title: req.body.title,
    periodStart,
    periodEnd,
    dueAt: req.body.dueAt ? new Date(req.body.dueAt) : null,
    inspectorDiscordId: userId(req),
    inspectorName: userName(req),
    auditEvents: [{
      type: "CREATED",
      actorDiscordId: userId(req),
      actorName: userName(req),
      note: "Fiscalização criada.",
    }],
  });

  if (inspection.dueAt) {
    await createDeadline({
      department: "CEG",
      sourceType: "CEGInspection",
      sourceId: inspection._id,
      title: inspection.title,
      dueAt: inspection.dueAt,
      assignedDiscordId: userId(req),
      assignedName: userName(req),
    });
  }

  return res.status(201).json({ inspection });
});

router.get("/:id", requireAuth, requireCEG, async (req, res) => {
  const inspection = await CEGInspection.findById(req.params.id).lean();

  if (!inspection) {
    return res.status(404).json({ error: "Fiscalização não encontrada." });
  }

  return res.json({ inspection });
});

router.patch("/:id", requireAuth, requireCEG, async (req, res) => {
  const inspection = await CEGInspection.findById(req.params.id);

  if (!inspection) {
    return res.status(404).json({ error: "Fiscalização não encontrada." });
  }

  const allowed = [
    "title", "status", "risk", "summary", "unitResponse",
    "commandDecision", "metrics", "findings", "evidence", "dueAt",
  ];

  for (const key of allowed) {
    if (req.body[key] !== undefined) inspection[key] = req.body[key];
  }

  inspection.auditEvents.push({
    type: "UPDATED",
    actorDiscordId: userId(req),
    actorName: userName(req),
    note: req.body.note || "Fiscalização atualizada.",
  });

  await inspection.save();

  return res.json({ inspection });
});

router.post("/:id/submit-command", requireAuth, requireCEG, async (req, res) => {
  const inspection = await CEGInspection.findById(req.params.id);

  if (!inspection) {
    return res.status(404).json({ error: "Fiscalização não encontrada." });
  }

  inspection.status = "AWAITING_COMMAND";
  inspection.submittedAt = new Date();
  inspection.auditEvents.push({
    type: "SUBMITTED_COMMAND",
    actorDiscordId: userId(req),
    actorName: userName(req),
    note: "Fiscalização enviada ao Comando-Geral.",
  });

  await inspection.save();

  await createExecutiveDecision({
    sourceDepartment: "CEG",
    sourceType: "CEGInspection",
    sourceId: inspection._id,
    title: `Fiscalização ${inspection.inspectionNumber} — ${inspection.unit}`,
    summary: inspection.summary,
    priority: inspection.risk === "CRITICAL" ? "URGENT" : inspection.risk === "ATTENTION" ? "HIGH" : "NORMAL",
    dueAt: inspection.dueAt,
    actor: actor(req),
  });

  return res.json({ inspection });
});

export default router;
