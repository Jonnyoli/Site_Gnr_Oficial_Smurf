import { Router, type Request, type Response, type NextFunction } from "express";
import CEGInspection from "../models/CEGInspection.js";
import DRHProcess from "../models/DRHProcess.js";
import ExecutiveDecision from "../models/ExecutiveDecision.js";
import DepartmentOfficialDocument from "../models/DepartmentOfficialDocument.js";

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


router.get("/", requireAuth, async (req, res) => {
  const query = String(req.query.q || "").trim();

  if (query.length < 2) {
    return res.json({ results: [] });
  }

  const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

  const [inspections, processes, decisions, documents] = await Promise.all([
    CEGInspection.find({
      $or: [
        { inspectionNumber: regex },
        { title: regex },
        { unit: regex },
        { summary: regex },
      ],
    }).limit(20).lean(),

    DRHProcess.find({
      $or: [
        { processNumber: regex },
        { title: regex },
        { subjectName: regex },
        { subjectDiscordId: regex },
      ],
    }).limit(20).lean(),

    ExecutiveDecision.find({
      $or: [
        { title: regex },
        { summary: regex },
        { sourceDepartment: regex },
      ],
    }).limit(20).lean(),

    DepartmentOfficialDocument.find({
      $or: [
        { documentNumber: regex },
        { title: regex },
        { verificationCode: regex },
      ],
    }).limit(20).lean(),
  ]);

  return res.json({
    results: [
      ...inspections.map((item) => ({
        type: "CEG_INSPECTION",
        id: item._id,
        title: item.title,
        subtitle: `${item.inspectionNumber} · ${item.unit}`,
        status: item.status,
      })),
      ...processes.map((item) => ({
        type: "DRH_PROCESS",
        id: item._id,
        title: item.title,
        subtitle: `${item.processNumber} · ${item.subjectName}`,
        status: item.status,
      })),
      ...decisions.map((item) => ({
        type: "EXECUTIVE_DECISION",
        id: item._id,
        title: item.title,
        subtitle: item.sourceDepartment,
        status: item.status,
      })),
      ...documents.map((item) => ({
        type: "OFFICIAL_DOCUMENT",
        id: item._id,
        title: item.title,
        subtitle: `${item.documentNumber} · ${item.verificationCode}`,
        status: item.status,
      })),
    ],
  });
});

export default router;
