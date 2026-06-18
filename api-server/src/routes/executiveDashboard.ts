import { Router, type Request, type Response, type NextFunction } from "express";

import UnitOperation from "../models/UnitOperation.js";
import UnitWeeklyProgress from "../models/UnitWeeklyProgress.js";
import OperationalNotification from "../models/OperationalNotification.js";

const router = Router();

const COMMAND_GENERAL_ROLE_ID = "1147878942099906672";
const DEV_USER_ID = "713719718091030599";

function sessionUser(req: Request) {
  return req.session?.user || null;
}

function userId(req: Request) {
  return String(sessionUser(req)?.id || "");
}

function userRoles(req: Request): string[] {
  const roles = sessionUser(req)?.roles;
  return Array.isArray(roles) ? roles.map(String) : [];
}

function requireCommand(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (
    userId(req) !== DEV_USER_ID &&
    !userRoles(req).includes(COMMAND_GENERAL_ROLE_ID)
  ) {
    res.status(403).json({
      error: "Apenas o Comando-Geral pode consultar este painel.",
    });
    return;
  }

  next();
}

router.get("/", requireCommand, async (_req, res) => {
  try {
    const now = new Date();
    const staleLimit = new Date(now.getTime() - 72 * 60 * 60 * 1000);

    const [
      operationsInProgress,
      pendingDirector,
      pendingCommand,
      readyForDocument,
      staleInvestigations,
      recentOperations,
      weeklyProgress,
      urgentNotifications,
    ] = await Promise.all([
      UnitOperation.countDocuments({ status: "IN_PROGRESS" }),
      UnitOperation.countDocuments({ reportStatus: "PENDING_DIRECTOR" }),
      UnitOperation.countDocuments({ reportStatus: "PENDING_COMMAND" }),
      UnitOperation.countDocuments({
        reportStatus: "VALIDATED",
        "officialDocument.issued": { $ne: true },
      }),
      UnitOperation.countDocuments({
        isPrivateInvestigation: true,
        updatedAt: { $lte: staleLimit },
        status: { $in: ["DRAFT", "SUBMITTED", "IN_PROGRESS", "COMPLETED"] },
      }),
      UnitOperation.find()
        .select("title caseNumber primaryUnit status reportStatus scheduledAt updatedAt")
        .sort({ updatedAt: -1 })
        .limit(10)
        .lean(),
      UnitWeeklyProgress.find()
        .sort({ weekStart: -1, percentage: 1 })
        .limit(20)
        .lean(),
      OperationalNotification.countDocuments({
        completedAt: null,
        priority: "URGENT",
      }),
    ]);

    const latestWeek = weeklyProgress.reduce(
      (latest: Date | null, item: any) => {
        const date = new Date(item.weekStart);
        return !latest || date > latest ? date : latest;
      },
      null,
    );

    const units =
      latestWeek === null
        ? []
        : weeklyProgress.filter(
            (item: any) =>
              new Date(item.weekStart).getTime() === latestWeek.getTime(),
          );

    res.json({
      counts: {
        operationsInProgress,
        pendingDirector,
        pendingCommand,
        readyForDocument,
        staleInvestigations,
        urgentNotifications,
      },
      units,
      recentOperations,
      generatedAt: now,
    });
  } catch (error) {
    console.error("[executive-dashboard] Erro:", error);
    res.status(500).json({
      error: "Não foi possível carregar o painel executivo.",
    });
  }
});

export default router;
