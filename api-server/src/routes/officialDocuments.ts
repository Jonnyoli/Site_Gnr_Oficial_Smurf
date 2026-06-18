import crypto from "node:crypto";
import { Router, type Request, type Response, type NextFunction } from "express";

import UnitOperation from "../models/UnitOperation.js";
import OfficialDocumentVerification from "../models/OfficialDocumentVerification.js";

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

  return Array.isArray(roles)
    ? roles.map(String)
    : [];
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
    res.status(401).json({
      error: "É necessário iniciar sessão.",
    });
    return;
  }

  next();
}

function requireArchiveAccess(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!isCommand(req) && !isDirector(req)) {
    res.status(403).json({
      error:
        "Apenas o Diretor do NIC e o Comando-Geral podem consultar o arquivo oficial.",
    });
    return;
  }

  next();
}

function normalizeVerificationCode(value: unknown) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function clientIp(req: Request) {
  return (
    String(req.headers["x-forwarded-for"] || "")
      .split(",")[0]
      .trim() ||
    req.socket.remoteAddress ||
    null
  );
}

function computeCurrentDocumentHash(operation: any) {
  const officialDocument = operation.officialDocument || {};

  const source = JSON.stringify({
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
    verificationCode: officialDocument.verificationCode,
    version: officialDocument.version || 1,
  });

  return crypto
    .createHash("sha256")
    .update(source)
    .digest("hex");
}

function publicDocumentPayload(operation: any) {
  const official = operation.officialDocument || {};

  return {
    valid:
      official.issued === true &&
      official.status !== "REVOKED",
    revoked: official.status === "REVOKED",
    caseNumber: operation.caseNumber || null,
    title: operation.title,
    unit: operation.primaryUnit,
    category: operation.category,
    issuedAt: official.issuedAt || null,
    issuedByName: official.issuedByName || null,
    verificationCode:
      official.verificationCode || null,
    version: Number(official.version || 1),
    documentHash:
      official.documentHash || null,
    currentHash: computeCurrentDocumentHash(operation),
    hashMatches:
      Boolean(official.documentHash) &&
      official.documentHash ===
        computeCurrentDocumentHash(operation),
    directorApproval: {
      status:
        operation.directorApproval?.status || "PENDING",
      actorName:
        operation.directorApproval?.actorName || null,
      at: operation.directorApproval?.at || null,
      code: operation.directorApproval?.code || null,
    },
    commandApproval: {
      status:
        operation.commandApproval?.status || "PENDING",
      actorName:
        operation.commandApproval?.actorName || null,
      at: operation.commandApproval?.at || null,
      code: operation.commandApproval?.code || null,
    },
    revokedAt: official.revokedAt || null,
    revokedByName:
      official.revokedByName || null,
    revocationReason:
      official.revocationReason || "",
  };
}

router.post(
  "/verify",
  requireAuthentication,
  async (req, res) => {
    try {
      const verificationCode =
        normalizeVerificationCode(
          req.body.verificationCode,
        );

      if (verificationCode.length < 6) {
        res.status(400).json({
          error:
            "Introduz um código de verificação válido.",
        });
        return;
      }

      const operation = await UnitOperation.findOne({
        "officialDocument.verificationCode":
          verificationCode,
      }).lean();

      if (!operation) {
        await OfficialDocumentVerification.create({
          verificationCode,
          result: "NOT_FOUND",
          verifiedByDiscordId: userId(req) || null,
          verifiedByName: userName(req),
          requestIp: clientIp(req),
          userAgent:
            String(req.headers["user-agent"] || "") ||
            null,
        });

        res.status(404).json({
          valid: false,
          result: "NOT_FOUND",
          error:
            "Não existe nenhum documento oficial com esse código.",
        });
        return;
      }

      const revoked =
        operation.officialDocument?.status ===
        "REVOKED";

      const payload =
        publicDocumentPayload(operation);

      await OfficialDocumentVerification.create({
        operationId: operation._id,
        verificationCode,
        result: revoked ? "REVOKED" : "VALID",
        verifiedByDiscordId: userId(req) || null,
        verifiedByName: userName(req),
        requestIp: clientIp(req),
        userAgent:
          String(req.headers["user-agent"] || "") ||
          null,
        metadata: {
          caseNumber: operation.caseNumber,
          version:
            operation.officialDocument?.version || 1,
          hashMatches: payload.hashMatches,
        },
      });

      res.json({
        result: revoked ? "REVOKED" : "VALID",
        document: payload,
      });
    } catch (error) {
      console.error(
        "[official-documents] Erro na verificação:",
        error,
      );

      res.status(500).json({
        error:
          "Não foi possível verificar o documento.",
      });
    }
  },
);

router.get(
  "/archive",
  requireAuthentication,
  requireArchiveAccess,
  async (req, res) => {
    try {
      const search = String(
        req.query.search || "",
      ).trim();

      const status = String(
        req.query.status || "ALL",
      ).toUpperCase();

      const filter: any = {
        "officialDocument.issued": true,
      };

      if (status === "ACTIVE") {
        filter["officialDocument.status"] = {
          $ne: "REVOKED",
        };
      }

      if (status === "REVOKED") {
        filter["officialDocument.status"] =
          "REVOKED";
      }

      if (search) {
        const escaped = search.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&",
        );

        const regex = new RegExp(escaped, "i");

        filter.$or = [
          { caseNumber: regex },
          { title: regex },
          { createdByName: regex },
          {
            "officialDocument.verificationCode":
              regex,
          },
          {
            "officialDocument.issuedByName":
              regex,
          },
        ];
      }

      const items = await UnitOperation.find(filter)
        .sort({
          "officialDocument.issuedAt": -1,
        })
        .limit(200)
        .lean();

      const [total, active, revoked] =
        await Promise.all([
          UnitOperation.countDocuments({
            "officialDocument.issued": true,
          }),
          UnitOperation.countDocuments({
            "officialDocument.issued": true,
            "officialDocument.status": {
              $ne: "REVOKED",
            },
          }),
          UnitOperation.countDocuments({
            "officialDocument.issued": true,
            "officialDocument.status": "REVOKED",
          }),
        ]);

      res.json({
        items: items.map((operation) => ({
          _id: operation._id,
          ...publicDocumentPayload(operation),
          responsibleName:
            operation.createdByName || null,
          completedAt:
            operation.completedAt || null,
        })),
        counts: {
          total,
          active,
          revoked,
        },
        permissions: {
          command: isCommand(req),
          director: isDirector(req),
          revoke: isCommand(req),
        },
      });
    } catch (error) {
      console.error(
        "[official-documents] Erro no arquivo:",
        error,
      );

      res.status(500).json({
        error:
          "Não foi possível carregar o arquivo oficial.",
      });
    }
  },
);

router.get(
  "/:operationId",
  requireAuthentication,
  requireArchiveAccess,
  async (req, res) => {
    try {
      const operation =
        await UnitOperation.findById(
          req.params.operationId,
        ).lean();

      if (
        !operation ||
        !operation.officialDocument?.issued
      ) {
        res.status(404).json({
          error:
            "Documento oficial não encontrado.",
        });
        return;
      }

      res.json({
        operation,
        document:
          publicDocumentPayload(operation),
        permissions: {
          revoke: isCommand(req),
        },
      });
    } catch (error) {
      console.error(
        "[official-documents] Erro ao abrir:",
        error,
      );

      res.status(500).json({
        error:
          "Não foi possível abrir o documento.",
      });
    }
  },
);

router.patch(
  "/:operationId/revoke",
  requireAuthentication,
  async (req, res) => {
    try {
      if (!isCommand(req)) {
        res.status(403).json({
          error:
            "Apenas o Comando-Geral pode revogar um documento oficial.",
        });
        return;
      }

      const operation =
        await UnitOperation.findById(
          req.params.operationId,
        );

      if (
        !operation ||
        !operation.officialDocument?.issued
      ) {
        res.status(404).json({
          error:
            "Documento oficial não encontrado.",
        });
        return;
      }

      if (
        operation.officialDocument.status ===
        "REVOKED"
      ) {
        res.status(400).json({
          error:
            "Este documento já está revogado.",
        });
        return;
      }

      const reason = String(
        req.body.reason || "",
      ).trim();

      if (reason.length < 8) {
        res.status(400).json({
          error:
            "Indica um motivo de revogação com pelo menos 8 caracteres.",
        });
        return;
      }

      operation.officialDocument.status =
        "REVOKED";
      operation.officialDocument.revokedAt =
        new Date();
      operation.officialDocument.revokedByDiscordId =
        userId(req);
      operation.officialDocument.revokedByName =
        userName(req);
      operation.officialDocument.revocationReason =
        reason;

      operation.auditEvents.push({
        type: "OFFICIAL_DOCUMENT_REVOKED",
        actorDiscordId: userId(req),
        actorName: userName(req),
        metadata: {
          verificationCode:
            operation.officialDocument
              .verificationCode,
          reason,
        },
      });

      await operation.save();

      res.json({
        ok: true,
        document:
          publicDocumentPayload(operation),
        message:
          "Documento oficial revogado.",
      });
    } catch (error) {
      console.error(
        "[official-documents] Erro ao revogar:",
        error,
      );

      res.status(500).json({
        error:
          "Não foi possível revogar o documento.",
      });
    }
  },
);

router.get(
  "/:operationId/verifications",
  requireAuthentication,
  requireArchiveAccess,
  async (req, res) => {
    try {
      const items =
        await OfficialDocumentVerification.find({
          operationId:
            req.params.operationId,
        })
          .sort({ createdAt: -1 })
          .limit(100)
          .lean();

      res.json({ items });
    } catch (error) {
      console.error(
        "[official-documents] Erro no histórico:",
        error,
      );

      res.status(500).json({
        error:
          "Não foi possível carregar o histórico de verificações.",
      });
    }
  },
);

export default router;
