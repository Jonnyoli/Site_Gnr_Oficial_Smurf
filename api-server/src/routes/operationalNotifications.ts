import { Router, type Request, type Response, type NextFunction } from "express";

import OperationalNotification from "../models/OperationalNotification.js";
import UnitOperation from "../models/UnitOperation.js";
import {
  COMMAND_GENERAL_ROLE_ID,
  NIC_DIRECTOR_ROLE_ID,
} from "../services/operationalNotificationService.js";

const router = Router();

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

function isCommand(req: Request) {
  return (
    userId(req) === DEV_USER_ID ||
    userRoles(req).includes(COMMAND_GENERAL_ROLE_ID)
  );
}

function isDirector(req: Request) {
  return userRoles(req).includes(NIC_DIRECTOR_ROLE_ID);
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

function requireApprovalAccess(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!isCommand(req) && !isDirector(req)) {
    res.status(403).json({
      error:
        "Apenas o Diretor do NIC e o Comando-Geral podem consultar este centro.",
    });
    return;
  }

  next();
}

function visibleNotificationFilter(req: Request) {
  return {
    $or: [
      { recipientDiscordId: userId(req) },
      { recipientRoleId: { $in: userRoles(req) } },
    ],
  };
}

router.get(
  "/",
  requireAuthentication,
  async (req, res) => {
    try {
      const includeCompleted =
        String(req.query.includeCompleted || "false") === "true";

      const filter: any = visibleNotificationFilter(req);

      if (!includeCompleted) {
        filter.completedAt = null;
      }

      const items = await OperationalNotification.find(filter)
        .sort({ readAt: 1, createdAt: -1 })
        .limit(100)
        .lean();

      const unread = await OperationalNotification.countDocuments({
        ...visibleNotificationFilter(req),
        completedAt: null,
        readAt: null,
      });

      res.json({
        items,
        unread,
      });
    } catch (error) {
      console.error("[operational-notifications] Erro:", error);

      res.status(500).json({
        error: "Não foi possível carregar as notificações.",
      });
    }
  },
);

router.get(
  "/approvals",
  requireAuthentication,
  requireApprovalAccess,
  async (req, res) => {
    try {
      const directorFilter = {
        reportStatus: "PENDING_DIRECTOR",
        "directorApproval.status": "PENDING",
      };

      const commandFilter = {
        reportStatus: "PENDING_COMMAND",
        "directorApproval.status": "APPROVED",
      };

      const readyFilter = {
        reportStatus: "VALIDATED",
        "directorApproval.status": "APPROVED",
        "commandApproval.status": "APPROVED",
        "officialDocument.issued": { $ne: true },
      };

      const correctionFilter = {
        reportStatus: "CHANGES_REQUESTED",
      };

      const issuedFilter = {
        "officialDocument.issued": true,
      };

      const [
        pendingDirector,
        pendingCommand,
        readyForDocument,
        corrections,
        issued,
      ] = await Promise.all([
        isDirector(req) || isCommand(req)
          ? UnitOperation.find(directorFilter)
              .sort({ reportSubmittedAt: 1 })
              .lean()
          : [],
        isCommand(req)
          ? UnitOperation.find(commandFilter)
              .sort({ reportSubmittedAt: 1 })
              .lean()
          : [],
        isCommand(req)
          ? UnitOperation.find(readyFilter)
              .sort({ completedAt: 1 })
              .lean()
          : [],
        UnitOperation.find(correctionFilter)
          .sort({ updatedAt: -1 })
          .lean(),
        UnitOperation.find(issuedFilter)
          .sort({ "officialDocument.issuedAt": -1 })
          .limit(30)
          .lean(),
      ]);

      res.json({
        permissions: {
          director: isDirector(req),
          command: isCommand(req),
        },
        pendingDirector,
        pendingCommand,
        readyForDocument,
        corrections,
        issued,
        counts: {
          pendingDirector: pendingDirector.length,
          pendingCommand: pendingCommand.length,
          readyForDocument: readyForDocument.length,
          corrections: corrections.length,
          issued: issued.length,
        },
      });
    } catch (error) {
      console.error("[operational-approvals] Erro:", error);

      res.status(500).json({
        error: "Não foi possível carregar o centro de aprovações.",
      });
    }
  },
);

router.patch(
  "/:id/read",
  requireAuthentication,
  async (req, res) => {
    try {
      const item = await OperationalNotification.findOneAndUpdate(
        {
          _id: req.params.id,
          ...visibleNotificationFilter(req),
        },
        {
          readAt: new Date(),
        },
        {
          new: true,
        },
      );

      if (!item) {
        res.status(404).json({ error: "Notificação não encontrada." });
        return;
      }

      res.json({ ok: true, item });
    } catch (error) {
      console.error("[operational-notifications] Erro ao marcar:", error);

      res.status(500).json({
        error: "Não foi possível atualizar a notificação.",
      });
    }
  },
);

router.patch(
  "/read-all",
  requireAuthentication,
  async (req, res) => {
    try {
      await OperationalNotification.updateMany(
        {
          ...visibleNotificationFilter(req),
          completedAt: null,
          readAt: null,
        },
        {
          readAt: new Date(),
        },
      );

      res.json({ ok: true });
    } catch (error) {
      console.error("[operational-notifications] Erro ao marcar todas:", error);

      res.status(500).json({
        error: "Não foi possível atualizar as notificações.",
      });
    }
  },
);

export default router;
