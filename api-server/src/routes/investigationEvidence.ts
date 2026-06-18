import fs from "node:fs";
import path from "node:path";
import { Router, type Request, type Response, type NextFunction } from "express";
import multer from "multer";

import InvestigationEvidence from "../models/InvestigationEvidence.js";
import UnitOperation from "../models/UnitOperation.js";
import {
  buildStoredFilename,
  calculateFileSha256,
  ensureOperationDirectory,
  fileExists,
  resolveEvidencePath,
} from "../services/evidenceStorageService.js";

const router = Router();

const COMMAND_GENERAL_ROLE_ID = "1147878942099906672";
const NIC_DIRECTOR_ROLE_ID = "1296910327879045130";
const DEV_USER_ID = "713719718091030599";

const MAX_FILE_SIZE =
  Math.max(Number(process.env.INVESTIGATION_MAX_FILE_MB || 50), 1) *
  1024 *
  1024;

const ALLOWED_MIME_PREFIXES = ["image/", "video/", "audio/", "text/"];
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "application/x-zip-compressed",
  "application/octet-stream",
]);

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

function isCommand(req: Request) {
  return (
    userId(req) === DEV_USER_ID ||
    userRoles(req).includes(COMMAND_GENERAL_ROLE_ID)
  );
}

function isDirector(req: Request) {
  return userRoles(req).includes(NIC_DIRECTOR_ROLE_ID);
}

function isOwner(operation: any, req: Request) {
  return String(operation.createdByDiscordId || "") === userId(req);
}

function isParticipant(operation: any, req: Request) {
  return (operation.participants || []).some(
    (participant: any) =>
      String(participant.discordId || "") === userId(req),
  );
}

function canView(operation: any, req: Request) {
  return (
    isCommand(req) ||
    isDirector(req) ||
    isOwner(operation, req) ||
    isParticipant(operation, req)
  );
}

function isLocked(operation: any) {
  return (
    operation.status === "OFFICIAL_DOCUMENT_ISSUED" ||
    operation.officialDocument?.issued === true
  );
}

function canManage(operation: any, req: Request) {
  if (isLocked(operation)) return false;

  return isCommand(req) || isDirector(req) || isOwner(operation, req);
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

async function loadOperation(operationId: string) {
  return UnitOperation.findById(operationId);
}

async function requireOperationView(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const operation = await loadOperation(String(req.params.operationId || ""));

    if (!operation) {
      res.status(404).json({ error: "Investigação não encontrada." });
      return;
    }

    if (!canView(operation, req)) {
      res.status(403).json({
        error: "Não tens autorização para consultar as provas desta investigação.",
      });
      return;
    }

    (req as any).investigationOperation = operation;
    next();
  } catch (error) {
    console.error("[investigation-evidence] Erro ao validar acesso:", error);
    res.status(500).json({
      error: "Não foi possível validar o acesso à investigação.",
    });
  }
}

async function requireOperationManage(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const operation = await loadOperation(String(req.params.operationId || ""));

    if (!operation) {
      res.status(404).json({ error: "Investigação não encontrada." });
      return;
    }

    if (!canManage(operation, req)) {
      res.status(403).json({
        error: isLocked(operation)
          ? "O processo está bloqueado depois da emissão oficial."
          : "Não tens autorização para gerir provas desta investigação.",
      });
      return;
    }

    (req as any).investigationOperation = operation;
    next();
  } catch (error) {
    console.error("[investigation-evidence] Erro ao validar gestão:", error);
    res.status(500).json({
      error: "Não foi possível validar a gestão da investigação.",
    });
  }
}

const storage = multer.diskStorage({
  destination(req, _file, callback) {
    try {
      callback(
        null,
        ensureOperationDirectory(String(req.params.operationId)),
      );
    } catch (error) {
      callback(error as Error, "");
    }
  },

  filename(_req, file, callback) {
    callback(null, buildStoredFilename(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
  fileFilter(_req, file, callback) {
    const allowed =
      ALLOWED_MIME_PREFIXES.some((prefix) =>
        file.mimetype.startsWith(prefix),
      ) || ALLOWED_MIME_TYPES.has(file.mimetype);

    if (!allowed) {
      callback(
        new Error(`Tipo de ficheiro não permitido: ${file.mimetype}`),
      );
      return;
    }

    callback(null, true);
  },
});

function evidenceResponse(item: any) {
  const isStored =
    item.sourceType === "UPLOAD" ||
    item.sourceType === "DISCORD_ATTACHMENT";

  return {
    ...item,
    previewUrl:
      isStored
        ? `/api/investigation-evidence/${item._id}/preview`
        : item.externalUrl,
    downloadUrl:
      isStored
        ? `/api/investigation-evidence/${item._id}/download`
        : item.externalUrl,
  };
}

router.get(
  "/operation/:operationId",
  requireAuthentication,
  requireOperationView,
  async (req, res) => {
    try {
      const operation = (req as any).investigationOperation;
      const includeRemoved =
        String(req.query.includeRemoved || "false") === "true" &&
        (isCommand(req) || isDirector(req));

      const filter: any = { operationId: operation._id };

      if (!includeRemoved) {
        filter.removed = false;
      }

      const items = await InvestigationEvidence.find(filter)
        .sort({ removed: 1, createdAt: -1 })
        .lean();

      res.json({
        items: items.map(evidenceResponse),
        permissions: {
          view: true,
          manage: canManage(operation, req),
          remove: canManage(operation, req),
          locked: isLocked(operation),
        },
      });
    } catch (error) {
      console.error("[investigation-evidence] Erro ao listar:", error);
      res.status(500).json({
        error: "Não foi possível carregar as provas.",
      });
    }
  },
);

router.post(
  "/operation/:operationId/upload",
  requireAuthentication,
  requireOperationManage,
  upload.single("file"),
  async (req, res) => {
    try {
      const operation = (req as any).investigationOperation;
      const file = req.file;

      if (!file) {
        res.status(400).json({ error: "Seleciona um ficheiro." });
        return;
      }

      const relativePath = path.join(
        String(operation._id),
        path.basename(file.path),
      );

      const sha256 = await calculateFileSha256(file.path);

      const item = await InvestigationEvidence.create({
        operationId: operation._id,
        caseNumber: operation.caseNumber || null,
        title: String(req.body.title || "").trim() || file.originalname,
        description: String(req.body.description || "").trim(),
        category: String(req.body.category || "OTHER").toUpperCase(),
        sourceType: "UPLOAD",
        originalFilename: file.originalname,
        storedFilename: file.filename,
        relativePath,
        mimeType: file.mimetype,
        size: file.size,
        sha256,
        addedByDiscordId: userId(req),
        addedByName: userName(req),
        custodyEvents: [
          {
            type: "ADDED",
            actorDiscordId: userId(req),
            actorName: userName(req),
            metadata: {
              originalFilename: file.originalname,
              mimeType: file.mimetype,
              size: file.size,
              sha256,
            },
          },
        ],
      });

      operation.auditEvents.push({
        type: "UPDATED",
        actorDiscordId: userId(req),
        actorName: userName(req),
        metadata: {
          action: "EVIDENCE_ADDED",
          evidenceId: String(item._id),
          title: item.title,
          sha256,
        },
      });

      await operation.save();

      res.status(201).json({
        ok: true,
        item: evidenceResponse(item.toObject()),
        message: "Prova adicionada ao cofre.",
      });
    } catch (error) {
      console.error("[investigation-evidence] Erro no upload:", error);
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível carregar a prova.",
      });
    }
  },
);

router.post(
  "/operation/:operationId/link",
  requireAuthentication,
  requireOperationManage,
  async (req, res) => {
    try {
      const operation = (req as any).investigationOperation;
      const externalUrl = String(req.body.externalUrl || "").trim();

      if (!/^https?:\/\//i.test(externalUrl)) {
        res.status(400).json({ error: "Indica uma ligação válida." });
        return;
      }

      const item = await InvestigationEvidence.create({
        operationId: operation._id,
        caseNumber: operation.caseNumber || null,
        title: String(req.body.title || "").trim() || "Ligação externa",
        description: String(req.body.description || "").trim(),
        category: String(
          req.body.category || "EXTERNAL_LINK",
        ).toUpperCase(),
        sourceType: "EXTERNAL_LINK",
        externalUrl,
        addedByDiscordId: userId(req),
        addedByName: userName(req),
        custodyEvents: [
          {
            type: "ADDED",
            actorDiscordId: userId(req),
            actorName: userName(req),
            metadata: { externalUrl },
          },
        ],
      });

      operation.auditEvents.push({
        type: "UPDATED",
        actorDiscordId: userId(req),
        actorName: userName(req),
        metadata: {
          action: "EVIDENCE_LINK_ADDED",
          evidenceId: String(item._id),
          title: item.title,
        },
      });

      await operation.save();

      res.status(201).json({
        ok: true,
        item: evidenceResponse(item.toObject()),
        message: "Ligação adicionada ao cofre.",
      });
    } catch (error) {
      console.error("[investigation-evidence] Erro na ligação:", error);
      res.status(500).json({
        error: "Não foi possível adicionar a ligação.",
      });
    }
  },
);

router.patch(
  "/operation/:operationId/:evidenceId",
  requireAuthentication,
  requireOperationManage,
  async (req, res) => {
    try {
      const item = await InvestigationEvidence.findOne({
        _id: req.params.evidenceId,
        operationId: req.params.operationId,
        removed: false,
      });

      if (!item) {
        res.status(404).json({ error: "Prova não encontrada." });
        return;
      }

      if ("title" in req.body) item.title = String(req.body.title).trim();
      if ("description" in req.body) {
        item.description = String(req.body.description).trim();
      }
      if ("category" in req.body) {
        item.category = String(req.body.category).toUpperCase() as any;
      }

      item.custodyEvents.push({
        type: "UPDATED",
        actorDiscordId: userId(req),
        actorName: userName(req),
        metadata: {
          title: item.title,
          category: item.category,
        },
      });

      await item.save();

      res.json({
        ok: true,
        item: evidenceResponse(item.toObject()),
        message: "Prova atualizada.",
      });
    } catch (error) {
      console.error("[investigation-evidence] Erro ao atualizar:", error);
      res.status(500).json({
        error: "Não foi possível atualizar a prova.",
      });
    }
  },
);

router.delete(
  "/operation/:operationId/:evidenceId",
  requireAuthentication,
  requireOperationManage,
  async (req, res) => {
    try {
      const operation = (req as any).investigationOperation;
      const item = await InvestigationEvidence.findOne({
        _id: req.params.evidenceId,
        operationId: req.params.operationId,
        removed: false,
      });

      if (!item) {
        res.status(404).json({ error: "Prova não encontrada." });
        return;
      }

      const reason = String(req.body.reason || "").trim();

      if (reason.length < 5) {
        res.status(400).json({
          error: "Indica o motivo da remoção.",
        });
        return;
      }

      item.removed = true;
      item.removedAt = new Date();
      item.removedByDiscordId = userId(req);
      item.removedByName = userName(req);
      item.removalReason = reason;
      item.custodyEvents.push({
        type: "REMOVED",
        actorDiscordId: userId(req),
        actorName: userName(req),
        metadata: { reason },
      });

      await item.save();

      operation.auditEvents.push({
        type: "UPDATED",
        actorDiscordId: userId(req),
        actorName: userName(req),
        metadata: {
          action: "EVIDENCE_REMOVED",
          evidenceId: String(item._id),
          title: item.title,
          reason,
        },
      });

      await operation.save();

      res.json({
        ok: true,
        message:
          "Prova removida do processo e preservada na auditoria.",
      });
    } catch (error) {
      console.error("[investigation-evidence] Erro ao remover:", error);
      res.status(500).json({
        error: "Não foi possível remover a prova.",
      });
    }
  },
);


async function resolveDiscordAttachment(item: any) {
  const botToken =
    process.env.DISCORD_BOT_TOKEN ||
    process.env.DISCORD_TOKEN ||
    "";

  if (!botToken) {
    throw new Error(
      "DISCORD_BOT_TOKEN não está configurado no backend.",
    );
  }

  if (
    !item.discordChannelId ||
    !item.discordMessageId ||
    !item.discordAttachmentId
  ) {
    throw new Error(
      "A prova não contém referências completas do Discord.",
    );
  }

  const response =
    await fetch(
      `https://discord.com/api/v10/channels/${item.discordChannelId}/messages/${item.discordMessageId}`,
      {
        headers: {
          Authorization:
            `Bot ${botToken}`,
        },
      },
    );

  if (!response.ok) {
    throw new Error(
      `Discord devolveu HTTP ${response.status}.`,
    );
  }

  const message =
    await response.json();

  const attachment =
    Array.isArray(message.attachments)
      ? message.attachments.find(
          (entry: any) =>
            String(entry.id) ===
            String(item.discordAttachmentId),
        )
      : null;

  if (!attachment?.url) {
    throw new Error(
      "O anexo já não existe na mensagem do Cofre.",
    );
  }

  item.discordAttachmentUrl =
    attachment.url;

  if (attachment.filename) {
    item.originalFilename =
      attachment.filename;
  }

  if (attachment.content_type) {
    item.mimeType =
      attachment.content_type;
  }

  if (attachment.size) {
    item.size =
      Number(attachment.size);
  }

  return attachment;
}

async function loadEvidenceForAccess(req: Request, res: Response) {
  const item = await InvestigationEvidence.findById(
    req.params.evidenceId,
  );

  if (!item || item.removed) {
    res.status(404).json({ error: "Prova não encontrada." });
    return null;
  }

  const operation = await UnitOperation.findById(item.operationId);

  if (!operation || !canView(operation, req)) {
    res.status(403).json({
      error: "Não tens autorização para consultar esta prova.",
    });
    return null;
  }

  return { item, operation };
}

router.get(
  "/:evidenceId/preview",
  requireAuthentication,
  async (req, res) => {
    try {
      const loaded = await loadEvidenceForAccess(req, res);
      if (!loaded) return;

      const { item } = loaded;

      if (item.sourceType === "EXTERNAL_LINK" && item.externalUrl) {
        res.redirect(item.externalUrl);
        return;
      }

      if (item.sourceType === "DISCORD_ATTACHMENT") {
        const attachment =
          await resolveDiscordAttachment(item);

        item.custodyEvents.push({
          type:
            "VIEWED",
          actorDiscordId:
            userId(req),
          actorName:
            userName(req),
          metadata: {
            source:
              "DISCORD_EVIDENCE_VAULT",
          },
        });

        await item.save();

        res.redirect(attachment.url);
        return;
      }

      if (!item.relativePath) {
        res.status(404).json({ error: "Ficheiro não disponível." });
        return;
      }

      const absolutePath = resolveEvidencePath(item.relativePath);

      if (!fileExists(absolutePath)) {
        res.status(404).json({
          error: "Ficheiro não encontrado no armazenamento.",
        });
        return;
      }

      item.custodyEvents.push({
        type: "VIEWED",
        actorDiscordId: userId(req),
        actorName: userName(req),
      });

      await item.save();

      res.setHeader(
        "Content-Type",
        item.mimeType || "application/octet-stream",
      );
      res.setHeader(
        "Content-Disposition",
        `inline; filename*=UTF-8''${encodeURIComponent(
          item.originalFilename || item.title,
        )}`,
      );

      fs.createReadStream(absolutePath).pipe(res);
    } catch (error) {
      console.error(
        "[investigation-evidence] Erro na pré-visualização:",
        error,
      );

      if (!res.headersSent) {
        res.status(500).json({
          error: "Não foi possível abrir a prova.",
        });
      }
    }
  },
);

router.get(
  "/:evidenceId/download",
  requireAuthentication,
  async (req, res) => {
    try {
      const loaded = await loadEvidenceForAccess(req, res);
      if (!loaded) return;

      const { item } = loaded;

      if (item.sourceType === "EXTERNAL_LINK" && item.externalUrl) {
        res.redirect(item.externalUrl);
        return;
      }

      if (item.sourceType === "DISCORD_ATTACHMENT") {
        const attachment =
          await resolveDiscordAttachment(item);

        item.custodyEvents.push({
          type:
            "DOWNLOADED",
          actorDiscordId:
            userId(req),
          actorName:
            userName(req),
          metadata: {
            source:
              "DISCORD_EVIDENCE_VAULT",
          },
        });

        await item.save();

        res.redirect(attachment.url);
        return;
      }

      if (!item.relativePath) {
        res.status(404).json({ error: "Ficheiro não disponível." });
        return;
      }

      const absolutePath = resolveEvidencePath(item.relativePath);

      if (!fileExists(absolutePath)) {
        res.status(404).json({
          error: "Ficheiro não encontrado no armazenamento.",
        });
        return;
      }

      item.custodyEvents.push({
        type: "DOWNLOADED",
        actorDiscordId: userId(req),
        actorName: userName(req),
      });

      await item.save();

      res.download(
        absolutePath,
        item.originalFilename || item.title,
      );
    } catch (error) {
      console.error(
        "[investigation-evidence] Erro no download:",
        error,
      );

      if (!res.headersSent) {
        res.status(500).json({
          error: "Não foi possível descarregar a prova.",
        });
      }
    }
  },
);

export default router;
