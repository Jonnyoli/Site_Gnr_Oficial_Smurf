import { Router, type Request, type Response, type NextFunction } from "express";
import DRHProcess from "../models/DRHProcess.js";
import { nextReference, calculateRecordCleanupAmount, createExecutiveDecision } from "../services/departmentWorkflowService.js";

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


function requireDRH(req: Request, res: Response, next: NextFunction) {
  if (!hasRole(req, ROLE_IDS.DRH) && !hasRole(req, ROLE_IDS.COMMAND)) {
    res.status(403).json({ error: "Área reservada ao DRH e Comando-Geral." });
    return;
  }

  next();
}

router.get("/", requireAuth, requireDRH, async (req, res) => {
  const processes = await DRHProcess.find()
    .sort({ createdAt: -1 })
    .limit(300)
    .lean();

  return res.json({
    processes,
    summary: {
      total: processes.length,
      absences: processes.filter((item) => item.type === "ABSENCE" && !["COMPLETED", "ARCHIVED"].includes(item.status)).length,
      dismissals: processes.filter((item) => item.type === "DISMISSAL" && !["COMPLETED", "ARCHIVED"].includes(item.status)).length,
      permits: processes.filter((item) => item.type.includes("WEAPONS_PERMIT") && !["COMPLETED", "ARCHIVED"].includes(item.status)).length,
      awaitingCommand: processes.filter((item) => item.status === "AWAITING_COMMAND").length,
    },
  });
});

router.post("/", requireAuth, requireDRH, async (req, res) => {
  if (!req.body.type || !req.body.subjectDiscordId || !req.body.subjectName || !req.body.title) {
    return res.status(400).json({ error: "Tipo, militar e título são obrigatórios." });
  }

  const incidents = Number(req.body.recordCleanup?.incidents || 0);

  const process = await DRHProcess.create({
    processNumber: nextReference("DRH"),
    type: req.body.type,
    subjectDiscordId: req.body.subjectDiscordId,
    subjectName: req.body.subjectName,
    subjectRank: req.body.subjectRank || null,
    subjectUnit: req.body.subjectUnit || null,
    title: req.body.title,
    description: req.body.description || "",
    requestedByDiscordId: userId(req),
    requestedByName: userName(req),
    periodStart: req.body.periodStart ? new Date(req.body.periodStart) : null,
    periodEnd: req.body.periodEnd ? new Date(req.body.periodEnd) : null,
    recordCleanup: {
      incidents,
      calculatedAmount: calculateRecordCleanupAmount(incidents),
    },
    auditEvents: [{
      type: "CREATED",
      actorDiscordId: userId(req),
      actorName: userName(req),
      note: "Processo DRH criado.",
    }],
  });

  return res.status(201).json({ process });
});

router.get("/:id", requireAuth, requireDRH, async (req, res) => {
  const process = await DRHProcess.findById(req.params.id).lean();

  if (!process) {
    return res.status(404).json({ error: "Processo não encontrado." });
  }

  return res.json({ process });
});

router.patch("/:id", requireAuth, requireDRH, async (req, res) => {
  const process = await DRHProcess.findById(req.params.id);

  if (!process) {
    return res.status(404).json({ error: "Processo não encontrado." });
  }

  const allowed = [
    "status", "title", "description", "assignedToDiscordId", "assignedToName",
    "periodStart", "periodEnd", "weaponsPermit", "dismissal", "attachments",
  ];

  for (const key of allowed) {
    if (req.body[key] !== undefined) process[key] = req.body[key];
  }

  if (req.body.recordCleanup?.incidents !== undefined) {
    const incidents = Number(req.body.recordCleanup.incidents || 0);
    process.recordCleanup.incidents = incidents;
    process.recordCleanup.calculatedAmount = calculateRecordCleanupAmount(incidents);
  }

  process.auditEvents.push({
    type: "UPDATED",
    actorDiscordId: userId(req),
    actorName: userName(req),
    note: req.body.note || "Processo atualizado.",
  });

  await process.save();

  return res.json({ process });
});

router.post("/:id/submit-command", requireAuth, requireDRH, async (req, res) => {
  const process = await DRHProcess.findById(req.params.id);

  if (!process) {
    return res.status(404).json({ error: "Processo não encontrado." });
  }

  process.status = "AWAITING_COMMAND";
  process.auditEvents.push({
    type: "SUBMITTED_COMMAND",
    actorDiscordId: userId(req),
    actorName: userName(req),
    note: "Processo enviado ao Comando-Geral.",
  });

  await process.save();

  await createExecutiveDecision({
    sourceDepartment: "DRH",
    sourceType: "DRHProcess",
    sourceId: process._id,
    title: `${process.processNumber} — ${process.title}`,
    summary: process.description,
    priority: process.type === "DISMISSAL" ? "HIGH" : "NORMAL",
    actor: actor(req),
  });

  return res.json({ process });
});

export default router;
