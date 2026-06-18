import { Router, type Request, type Response, type NextFunction } from "express";

import UnitOperation from "../models/UnitOperation.js";
import DocumentRecord from "../models/DocumentRecord.js";

const router = Router();

const COMMAND_GENERAL_ROLE_ID = "1147878942099906672";
const NIC_DIRECTOR_ROLE_ID = "1296910327879045130";
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

router.get("/", requireAuthentication, async (req, res) => {
  try {
    const query = String(req.query.q || "").trim();

    if (query.length < 2) {
      res.json({ operations: [], documents: [] });
      return;
    }

    const safe = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(safe, "i");

    const operationFilter: any = {
      $or: [
        { title: regex },
        { caseNumber: regex },
        { location: regex },
        { createdByName: regex },
        { commanderName: regex },
      ],
    };

    if (!isCommand(req) && !isDirector(req)) {
      operationFilter.$and = [
        {
          $or: [
            { createdByDiscordId: userId(req) },
            { commanderDiscordId: userId(req) },
            { "participants.discordId": userId(req) },
            { isPrivateInvestigation: false },
          ],
        },
      ];
    }

    const documentFilter: any = {
      archived: false,
      $or: [
        { title: regex },
        { description: regex },
        { content: regex },
        { tags: regex },
      ],
    };

    if (!isCommand(req)) {
      documentFilter.$and = [
        {
          $or: [
            { visibility: "PUBLIC" },
            {
              visibility: "RESTRICTED",
              allowedRoleIds: { $in: userRoles(req) },
            },
          ],
        },
      ];
    }

    const [operations, documents] = await Promise.all([
      UnitOperation.find(operationFilter)
        .select(
          "title caseNumber primaryUnit category status reportStatus location scheduledAt isPrivateInvestigation",
        )
        .sort({ updatedAt: -1 })
        .limit(20)
        .lean(),
      DocumentRecord.find(documentFilter)
        .select("title category description publishedAt visibility attachments")
        .sort({ featured: -1, publishedAt: -1 })
        .limit(20)
        .lean(),
    ]);

    res.json({ operations, documents });
  } catch (error) {
    console.error("[global-search] Erro:", error);
    res.status(500).json({
      error: "Não foi possível realizar a pesquisa global.",
    });
  }
});

export default router;
