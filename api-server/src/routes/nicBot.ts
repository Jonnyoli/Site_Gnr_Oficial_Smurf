import crypto from "node:crypto";
import { Router, type Request, type Response, type NextFunction } from "express";

import UnitOperation from "../models/UnitOperation.js";
import InvestigationEvidence from "../models/InvestigationEvidence.js";

const router = Router();

const NIC_BOT_SECRET =
  process.env.NIC_BOT_API_SECRET ||
  process.env.INTERNAL_API_SECRET ||
  "";

function requireBotSecret(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const supplied =
    String(req.headers["x-nic-bot-secret"] || "");

  if (!NIC_BOT_SECRET || supplied !== NIC_BOT_SECRET) {
    res.status(401).json({
      error: "Credencial interna inválida.",
    });
    return;
  }

  next();
}

router.use(requireBotSecret);

function actor(req: Request) {
  return {
    discordId:
      String(req.body?.actorDiscordId || req.query?.actorDiscordId || "SYSTEM"),
    name:
      String(req.body?.actorName || req.query?.actorName || "Bot NIC"),
  };
}

function createCaseNumber() {
  return `NIC-${new Date().getFullYear()}-${crypto
    .randomBytes(3)
    .toString("hex")
    .toUpperCase()}`;
}

function operationSummary(operation: any) {
  return {
    _id: operation._id,
    caseNumber: operation.caseNumber,
    title: operation.title,
    status: operation.status,
    reportStatus: operation.reportStatus,
    commanderDiscordId: operation.commanderDiscordId,
    commanderName: operation.commanderName,
    participants: operation.participants,
    suspects: operation.suspects,
    warrants: operation.warrants,
    interrogations: operation.interrogations,
    relatedInvestigations: operation.relatedInvestigations,
    discordSync: operation.discordSync,
    location: operation.location,
    objective: operation.objective,
    briefing: operation.briefing,
    scheduledAt: operation.scheduledAt,
    updatedAt: operation.updatedAt,
  };
}

async function findOperation(reference: string) {
  const raw = String(reference || "").trim();

  if (!raw) return null;

  if (/^[a-f0-9]{24}$/i.test(raw)) {
    const byId = await UnitOperation.findById(raw);
    if (byId) return byId;
  }

  return UnitOperation.findOne({
    primaryUnit: "NIC",
    $or: [
      { caseNumber: raw.toUpperCase() },
      { "discordSync.channelId": raw },
      { title: new RegExp(raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
    ],
  }).sort({ createdAt: -1 });
}

router.get("/operations/search", async (req, res) => {
  try {
    const query = String(req.query.q || "").trim();

    const filter: any = {
      primaryUnit: "NIC",
    };

    if (query) {
      filter.$or = [
        { caseNumber: new RegExp(query, "i") },
        { title: new RegExp(query, "i") },
        { "suspects.reference": new RegExp(query, "i") },
        { "suspects.name": new RegExp(query, "i") },
      ];
    }

    const items = await UnitOperation.find(filter)
      .sort({ updatedAt: -1 })
      .limit(20)
      .lean();

    res.json({
      items: items.map(operationSummary),
    });
  } catch (error) {
    console.error("[nic-bot] Pesquisa:", error);
    res.status(500).json({ error: "Não foi possível pesquisar processos." });
  }
});

router.get("/operations/:reference", async (req, res) => {
  try {
    const operation = await findOperation(req.params.reference);

    if (!operation) {
      res.status(404).json({ error: "Processo não encontrado." });
      return;
    }

    const evidenceCount = await InvestigationEvidence.countDocuments({
      operationId: operation._id,
      removed: false,
    });

    res.json({
      operation: operationSummary(operation.toObject()),
      evidenceCount,
    });
  } catch (error) {
    console.error("[nic-bot] Carregar processo:", error);
    res.status(500).json({ error: "Não foi possível carregar o processo." });
  }
});

router.post("/operations", async (req, res) => {
  try {
    const who = actor(req);

    const operation = await UnitOperation.create({
      caseNumber: createCaseNumber(),
      title: String(req.body.title || "").trim(),
      category: "INVESTIGATION",
      primaryUnit: "NIC",
      supportUnits: Array.isArray(req.body.supportUnits)
        ? req.body.supportUnits
        : [],
      isPrivateInvestigation: true,
      status: "IN_PROGRESS",
      reportStatus: "NOT_REQUIRED",
      commanderDiscordId:
        String(req.body.commanderDiscordId || who.discordId),
      commanderName:
        String(req.body.commanderName || who.name),
      participants: [
        {
          discordId: who.discordId,
          name: who.name,
          role: "RESPONSAVEL",
          canContribute: true,
          addedByDiscordId: who.discordId,
        },
      ],
      location: String(req.body.location || "").trim() || null,
      briefing: String(req.body.briefing || "").trim(),
      objective: String(req.body.objective || "").trim(),
      scheduledAt: new Date(),
      createdByDiscordId: who.discordId,
      createdByName: who.name,
      directorApproval: { status: "PENDING" },
      commandApproval: { status: "PENDING" },
      discordSync: {
        guildId: req.body.guildId || null,
        channelId: req.body.channelId || null,
        messageId: req.body.messageId || null,
        jumpUrl: req.body.jumpUrl || null,
        lastSyncedAt: new Date(),
      },
      auditEvents: [
        {
          type: "CREATED",
          actorDiscordId: who.discordId,
          actorName: who.name,
          metadata: {
            source: "DISCORD_NIC",
          },
        },
      ],
    });

    res.status(201).json({
      operation: operationSummary(operation.toObject()),
    });
  } catch (error) {
    console.error("[nic-bot] Criar processo:", error);
    res.status(500).json({ error: "Não foi possível criar o processo." });
  }
});

router.patch("/operations/:reference/discord-sync", async (req, res) => {
  try {
    const operation = await findOperation(req.params.reference);

    if (!operation) {
      res.status(404).json({ error: "Processo não encontrado." });
      return;
    }

    operation.discordSync = {
      guildId: req.body.guildId || operation.discordSync?.guildId || null,
      channelId: req.body.channelId || operation.discordSync?.channelId || null,
      messageId: req.body.messageId || operation.discordSync?.messageId || null,
      jumpUrl: req.body.jumpUrl || operation.discordSync?.jumpUrl || null,
      lastSyncedAt: new Date(),
    } as any;

    operation.auditEvents.push({
      type: "DISCORD_SYNC_UPDATED",
      ...actor(req),
      actorDiscordId: actor(req).discordId,
      actorName: actor(req).name,
      metadata: {
        channelId: operation.discordSync?.channelId,
      },
    });

    await operation.save();

    res.json({ operation: operationSummary(operation.toObject()) });
  } catch (error) {
    console.error("[nic-bot] Discord sync:", error);
    res.status(500).json({ error: "Não foi possível atualizar a sincronização." });
  }
});

router.post("/operations/:reference/participants", async (req, res) => {
  try {
    const operation = await findOperation(req.params.reference);

    if (!operation) {
      res.status(404).json({ error: "Processo não encontrado." });
      return;
    }

    const discordId = String(req.body.discordId || "").trim();

    if (!discordId) {
      res.status(400).json({ error: "discordId obrigatório." });
      return;
    }

    const existing = operation.participants.some(
      (item: any) => String(item.discordId) === discordId,
    );

    if (!existing) {
      operation.participants.push({
        discordId,
        name: String(req.body.name || "Inspetor").trim(),
        rank: req.body.rank || null,
        role: req.body.role || "INSPETOR",
        canContribute: req.body.canContribute !== false,
        addedByDiscordId: actor(req).discordId,
      } as any);

      operation.auditEvents.push({
        type: "PARTICIPANT_ADDED",
        actorDiscordId: actor(req).discordId,
        actorName: actor(req).name,
        metadata: { discordId },
      });
    }

    await operation.save();

    res.json({ operation: operationSummary(operation.toObject()) });
  } catch (error) {
    console.error("[nic-bot] Adicionar participante:", error);
    res.status(500).json({ error: "Não foi possível adicionar o inspetor." });
  }
});

router.delete("/operations/:reference/participants/:discordId", async (req, res) => {
  try {
    const operation = await findOperation(req.params.reference);

    if (!operation) {
      res.status(404).json({ error: "Processo não encontrado." });
      return;
    }

    operation.participants = operation.participants.filter(
      (item: any) =>
        String(item.discordId) !== String(req.params.discordId),
    ) as any;

    operation.auditEvents.push({
      type: "PARTICIPANT_REMOVED",
      actorDiscordId: actor(req).discordId,
      actorName: actor(req).name,
      metadata: { discordId: req.params.discordId },
    });

    await operation.save();

    res.json({ operation: operationSummary(operation.toObject()) });
  } catch (error) {
    console.error("[nic-bot] Remover participante:", error);
    res.status(500).json({ error: "Não foi possível remover o inspetor." });
  }
});

router.post("/operations/:reference/timeline", async (req, res) => {
  try {
    const operation = await findOperation(req.params.reference);

    if (!operation) {
      res.status(404).json({ error: "Processo não encontrado." });
      return;
    }

    const note = String(req.body.note || "").trim();

    if (note.length < 3) {
      res.status(400).json({ error: "A nota é demasiado curta." });
      return;
    }

    operation.auditEvents.push({
      type: "TIMELINE_NOTE_ADDED",
      actorDiscordId: actor(req).discordId,
      actorName: actor(req).name,
      metadata: {
        note,
        source: "DISCORD_NIC",
      },
    });

    await operation.save();

    res.json({ operation: operationSummary(operation.toObject()) });
  } catch (error) {
    console.error("[nic-bot] Timeline:", error);
    res.status(500).json({ error: "Não foi possível atualizar a timeline." });
  }
});

router.post("/operations/:reference/suspects", async (req, res) => {
  try {
    const operation = await findOperation(req.params.reference);

    if (!operation) {
      res.status(404).json({ error: "Processo não encontrado." });
      return;
    }

    const reference = String(req.body.reference || "").trim();

    if (!reference) {
      res.status(400).json({ error: "Referência do suspeito obrigatória." });
      return;
    }

    operation.suspects.push({
      reference,
      name: req.body.name || null,
      aliases: Array.isArray(req.body.aliases) ? req.body.aliases : [],
      description: req.body.description || "",
      status: req.body.status || "UNKNOWN",
      discordId: req.body.discordId || null,
      vehicles: Array.isArray(req.body.vehicles) ? req.body.vehicles : [],
      notes: req.body.notes || "",
      addedByDiscordId: actor(req).discordId,
      addedByName: actor(req).name,
    } as any);

    operation.auditEvents.push({
      type: "SUSPECT_ADDED",
      actorDiscordId: actor(req).discordId,
      actorName: actor(req).name,
      metadata: { reference },
    });

    await operation.save();

    res.json({ operation: operationSummary(operation.toObject()) });
  } catch (error) {
    console.error("[nic-bot] Suspeito:", error);
    res.status(500).json({ error: "Não foi possível adicionar o suspeito." });
  }
});

router.post("/operations/:reference/warrants", async (req, res) => {
  try {
    const operation = await findOperation(req.params.reference);

    if (!operation) {
      res.status(404).json({ error: "Processo não encontrado." });
      return;
    }

    operation.warrants.push({
      targetReference: String(req.body.targetReference || "").trim(),
      targetDiscordId: req.body.targetDiscordId || null,
      type: req.body.type || "DETENTION",
      reason: String(req.body.reason || "").trim(),
      status: "ACTIVE",
      issuedByDiscordId: actor(req).discordId,
      issuedByName: actor(req).name,
      expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : null,
      notes: req.body.notes || "",
    } as any);

    operation.auditEvents.push({
      type: "WARRANT_ADDED",
      actorDiscordId: actor(req).discordId,
      actorName: actor(req).name,
      metadata: {
        targetReference: req.body.targetReference,
        type: req.body.type || "DETENTION",
      },
    });

    await operation.save();

    res.json({ operation: operationSummary(operation.toObject()) });
  } catch (error) {
    console.error("[nic-bot] Mandado:", error);
    res.status(500).json({ error: "Não foi possível criar o mandado." });
  }
});

router.post("/operations/:reference/interrogations", async (req, res) => {
  try {
    const operation = await findOperation(req.params.reference);

    if (!operation) {
      res.status(404).json({ error: "Processo não encontrado." });
      return;
    }

    operation.interrogations.push({
      subjectReference: String(req.body.subjectReference || "").trim(),
      subjectDiscordId: req.body.subjectDiscordId || null,
      conductedByDiscordId: actor(req).discordId,
      conductedByName: actor(req).name,
      summary: String(req.body.summary || "").trim(),
      statements: req.body.statements || "",
      outcome: req.body.outcome || "",
      completedAt: new Date(),
      attachments: Array.isArray(req.body.attachments)
        ? req.body.attachments
        : [],
    } as any);

    operation.auditEvents.push({
      type: "INTERROGATION_ADDED",
      actorDiscordId: actor(req).discordId,
      actorName: actor(req).name,
      metadata: {
        subjectReference: req.body.subjectReference,
      },
    });

    await operation.save();

    res.json({ operation: operationSummary(operation.toObject()) });
  } catch (error) {
    console.error("[nic-bot] Interrogatório:", error);
    res.status(500).json({ error: "Não foi possível registar o interrogatório." });
  }
});

router.post("/operations/:reference/links", async (req, res) => {
  try {
    const operation = await findOperation(req.params.reference);
    const target = await findOperation(String(req.body.targetReference || ""));

    if (!operation || !target) {
      res.status(404).json({ error: "Um dos processos não foi encontrado." });
      return;
    }

    const relationType = req.body.relationType || "OTHER";
    const reason = String(req.body.reason || "").trim();
    const who = actor(req);

    const addLink = (source: any, destination: any) => {
      const exists = source.relatedInvestigations.some(
        (item: any) =>
          String(item.operationId) === String(destination._id),
      );

      if (!exists) {
        source.relatedInvestigations.push({
          operationId: destination._id,
          caseNumber: destination.caseNumber,
          title: destination.title,
          relationType,
          reason,
          linkedByDiscordId: who.discordId,
          linkedByName: who.name,
        } as any);
      }
    };

    addLink(operation, target);
    addLink(target, operation);

    operation.auditEvents.push({
      type: "CASE_LINKED",
      actorDiscordId: who.discordId,
      actorName: who.name,
      metadata: {
        targetOperationId: String(target._id),
        targetCaseNumber: target.caseNumber,
        relationType,
        reason,
      },
    });

    target.auditEvents.push({
      type: "CASE_LINKED",
      actorDiscordId: who.discordId,
      actorName: who.name,
      metadata: {
        targetOperationId: String(operation._id),
        targetCaseNumber: operation.caseNumber,
        relationType,
        reason,
      },
    });

    await Promise.all([operation.save(), target.save()]);

    res.json({
      operation: operationSummary(operation.toObject()),
      linkedOperation: operationSummary(target.toObject()),
    });
  } catch (error) {
    console.error("[nic-bot] Ligar caso:", error);
    res.status(500).json({ error: "Não foi possível ligar os processos." });
  }
});


router.post("/operations/:reference/evidence-discord", async (req, res) => {
  try {
    const operation = await findOperation(req.params.reference);

    if (!operation) {
      res.status(404).json({ error: "Processo não encontrado." });
      return;
    }

    const discordChannelId =
      String(req.body.discordChannelId || "").trim();

    const discordMessageId =
      String(req.body.discordMessageId || "").trim();

    const discordAttachmentId =
      String(req.body.discordAttachmentId || "").trim();

    if (
      !discordChannelId ||
      !discordMessageId ||
      !discordAttachmentId
    ) {
      res.status(400).json({
        error:
          "IDs do canal, mensagem e anexo são obrigatórios.",
      });
      return;
    }

    const duplicate =
      await InvestigationEvidence.findOne({
        operationId:
          operation._id,
        discordChannelId,
        discordMessageId,
        discordAttachmentId,
        removed:
          false,
      });

    if (duplicate) {
      res.json({
        ok:
          true,
        duplicate:
          true,
        item:
          duplicate,
      });
      return;
    }

    const who =
      actor(req);

    const item =
      await InvestigationEvidence.create({
        operationId:
          operation._id,
        caseNumber:
          operation.caseNumber ||
          null,
        title:
          String(
            req.body.title ||
            "Prova Discord",
          ).trim(),
        description:
          String(
            req.body.description ||
            "",
          ).trim(),
        category:
          String(
            req.body.category ||
            "OTHER",
          ).toUpperCase(),
        sourceType:
          "DISCORD_ATTACHMENT",

        originalFilename:
          req.body.originalFilename ||
          null,
        mimeType:
          req.body.mimeType ||
          null,
        size:
          Number(
            req.body.size ||
            0,
          ),

        discordGuildId:
          req.body.discordGuildId ||
          null,
        discordChannelId,
        discordMessageId,
        discordAttachmentId,
        discordAttachmentUrl:
          req.body.discordAttachmentUrl ||
          null,
        discordJumpUrl:
          req.body.discordJumpUrl ||
          null,

        sourceGuildId:
          req.body.sourceGuildId ||
          null,
        sourceChannelId:
          req.body.sourceChannelId ||
          null,
        sourceMessageId:
          req.body.sourceMessageId ||
          null,
        sourceJumpUrl:
          req.body.sourceJumpUrl ||
          null,

        addedByDiscordId:
          who.discordId,
        addedByName:
          who.name,

        custodyEvents: [
          {
            type:
              "ADDED",
            actorDiscordId:
              who.discordId,
            actorName:
              who.name,
            metadata: {
              source:
                "DISCORD_EVIDENCE_VAULT",
              discordChannelId,
              discordMessageId,
              discordAttachmentId,
            },
          },
        ],
      });

    operation.auditEvents.push({
      type:
        "UPDATED",
      actorDiscordId:
        who.discordId,
      actorName:
        who.name,
      metadata: {
        action:
          "DISCORD_EVIDENCE_ADDED",
        evidenceId:
          String(item._id),
        title:
          item.title,
        discordMessageId,
        discordAttachmentId,
      },
    });

    await operation.save();

    res.status(201).json({
      ok:
        true,
      duplicate:
        false,
      item,
    });
  } catch (error) {
    console.error(
      "[nic-bot] Prova Discord:",
      error,
    );

    res.status(500).json({
      error:
        "Não foi possível registar a prova do Discord.",
    });
  }
});

router.post("/operations/:reference/evidence-link", async (req, res) => {
  try {
    const operation = await findOperation(req.params.reference);

    if (!operation) {
      res.status(404).json({ error: "Processo não encontrado." });
      return;
    }

    const externalUrl = String(req.body.externalUrl || "").trim();

    if (!/^https?:\/\//i.test(externalUrl)) {
      res.status(400).json({ error: "Ligação inválida." });
      return;
    }

    const who = actor(req);

    const item = await InvestigationEvidence.create({
      operationId: operation._id,
      caseNumber: operation.caseNumber || null,
      title: String(req.body.title || "Prova externa").trim(),
      description: String(req.body.description || "").trim(),
      category: String(req.body.category || "EXTERNAL_LINK").toUpperCase(),
      sourceType: "EXTERNAL_LINK",
      externalUrl,
      addedByDiscordId: who.discordId,
      addedByName: who.name,
      custodyEvents: [
        {
          type: "ADDED",
          actorDiscordId: who.discordId,
          actorName: who.name,
          metadata: {
            externalUrl,
            source: "DISCORD_NIC",
          },
        },
      ],
    });

    operation.auditEvents.push({
      type: "UPDATED",
      actorDiscordId: who.discordId,
      actorName: who.name,
      metadata: {
        action: "EVIDENCE_LINK_ADDED",
        evidenceId: String(item._id),
        title: item.title,
      },
    });

    await operation.save();

    res.status(201).json({ item });
  } catch (error) {
    console.error("[nic-bot] Prova:", error);
    res.status(500).json({ error: "Não foi possível anexar a prova." });
  }
});

router.patch("/operations/:reference/status", async (req, res) => {
  try {
    const operation = await findOperation(req.params.reference);

    if (!operation) {
      res.status(404).json({ error: "Processo não encontrado." });
      return;
    }

    const status = String(req.body.status || "").toUpperCase();

    if (!["DRAFT", "SUBMITTED", "APPROVED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].includes(status)) {
      res.status(400).json({ error: "Estado inválido." });
      return;
    }

    operation.status = status as any;

    if (status === "IN_PROGRESS" && !operation.startedAt) {
      operation.startedAt = new Date();
    }

    if (status === "COMPLETED") {
      operation.completedAt = new Date();
    }

    operation.auditEvents.push({
      type: "STATUS_CHANGED",
      actorDiscordId: actor(req).discordId,
      actorName: actor(req).name,
      metadata: { status, source: "DISCORD_NIC" },
    });

    await operation.save();

    res.json({ operation: operationSummary(operation.toObject()) });
  } catch (error) {
    console.error("[nic-bot] Estado:", error);
    res.status(500).json({ error: "Não foi possível alterar o estado." });
  }
});

router.get("/dashboard", async (_req, res) => {
  try {
    const [
      activeCases,
      urgentWarrants,
      pendingDirector,
      recentCases,
    ] = await Promise.all([
      UnitOperation.countDocuments({
        primaryUnit: "NIC",
        status: { $in: ["DRAFT", "SUBMITTED", "APPROVED", "IN_PROGRESS"] },
      }),
      UnitOperation.countDocuments({
        primaryUnit: "NIC",
        "warrants.status": "ACTIVE",
      }),
      UnitOperation.countDocuments({
        primaryUnit: "NIC",
        reportStatus: "PENDING_DIRECTOR",
      }),
      UnitOperation.find({ primaryUnit: "NIC" })
        .sort({ updatedAt: -1 })
        .limit(5)
        .lean(),
    ]);

    res.json({
      activeCases,
      urgentWarrants,
      pendingDirector,
      recentCases: recentCases.map(operationSummary),
    });
  } catch (error) {
    console.error("[nic-bot] Dashboard:", error);
    res.status(500).json({ error: "Não foi possível carregar o dashboard." });
  }
});

export default router;
