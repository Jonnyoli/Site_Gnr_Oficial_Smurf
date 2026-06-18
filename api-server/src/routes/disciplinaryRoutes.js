
import express from "express";
import mongoose from "mongoose";
import DisciplinaryRecord from "../models/DisciplinaryRecord.js";

const router = express.Router();

const DEV_USER_ID = "713719718091030599";

const DISCIPLINARY_PERMISSION_ROLES = {
  VIEW: [
    // Comando-Geral
    "1147878942099906672",

    // Outras roles que podem apenas consultar
    "1147878942066364488",
    "1147878941974077478",
  ],

  MANAGE: [
    // Apenas Comando-Geral
    "1147878942099906672",
  ],

  DELETE: [
    // Apenas Comando-Geral
    "1147878942099906672",
  ],
};

const DISCIPLINARY_ROLE_CONFIG = {
  FIRST_WARNING: {
    roleId: "1147878941684682878",
    title: "1.ª REPREENSÃO ESCRITA",
    sanction: "1 - REPREENSÃO ESCRITA",
    label: "1.ª Repreensão",
  },

  SECOND_WARNING: {
    roleId: "1147878941684682877",
    title: "2.ª REPREENSÃO ESCRITA",
    sanction: "2 - REPREENSÃO ESCRITA",
    label: "2.ª Repreensão",
  },

  SUSPENSION: {
    roleId: "1147878941684682875",
    title: "SUSPENSÃO DE SERVIÇO",
    sanction: "SUSPENSÃO DE SERVIÇO",
    label: "Suspensão de Serviço",
  },
};

const DEFAULT_DISCIPLINARY_CHANNEL_ID =
  process.env.DISCIPLINARY_CHANNEL_ID ||
  "1326660033005486090";

/**
 * ============================================================
 * UTILIZADOR E PERMISSÕES
 * ============================================================
 */

function getRequestUser(req) {
  return (
    req.user ||
    req.discordUser ||
    req.authUser ||
    req.session?.user ||
    req.session?.discordUser ||
    null
  );
}

function getUserDiscordId(req) {
  const user = getRequestUser(req);

  return String(
    user?.id ||
      user?.discordId ||
      user?.discord_id ||
      req.session?.userId ||
      "",
  );
}

function getUserDisplayName(req) {
  const user = getRequestUser(req);

  return (
    user?.displayName ||
    user?.global_name ||
    user?.globalName ||
    user?.username ||
    user?.name ||
    "Utilizador do site"
  );
}

function normalizeRoleIds(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((role) => {
      if (typeof role === "string") {
        return role;
      }

      return role?.id || role?.roleId || role?.role_id || null;
    })
    .filter(Boolean)
    .map(String);
}

function getUserRoleIds(req) {
  const user = getRequestUser(req);

  const possibleRoleSources = [
    user?.roles,
    user?.roleIds,
    user?.discordRoles,
    req.discordRoles,
    req.roles,
    req.session?.roles,
    req.session?.user?.roles,
  ];

  const allRoles = possibleRoleSources.flatMap((source) =>
    normalizeRoleIds(source),
  );

  return [...new Set(allRoles)];
}

function userHasAnyRole(req, allowedRoles) {
  const userId = getUserDiscordId(req);

  if (userId === DEV_USER_ID) {
    return true;
  }

  const userRoles = getUserRoleIds(req);

  return allowedRoles.some((roleId) =>
    userRoles.includes(String(roleId)),
  );
}

function canView(req) {
  return userHasAnyRole(
    req,
    DISCIPLINARY_PERMISSION_ROLES.VIEW,
  );
}

function canManage(req) {
  return userHasAnyRole(
    req,
    DISCIPLINARY_PERMISSION_ROLES.MANAGE,
  );
}

function canDelete(req) {
  return userHasAnyRole(
    req,
    DISCIPLINARY_PERMISSION_ROLES.DELETE,
  );
}

function requireViewPermission(req, res, next) {
  if (!canView(req)) {
    return res.status(403).json({
      error:
        "Não tens permissão para consultar a área disciplinar.",
    });
  }

  next();
}

function requireManagePermission(req, res, next) {
  if (!canManage(req)) {
    return res.status(403).json({
      error:
        "Não tens permissão para gerir processos disciplinares.",
    });
  }

  next();
}

function requireDeletePermission(req, res, next) {
  if (!canDelete(req)) {
    return res.status(403).json({
      error:
        "Apenas o Comando-Geral pode apagar definitivamente um processo disciplinar.",
    });
  }

  next();
}

/**
 * ============================================================
 * VALIDAÇÃO
 * ============================================================
 */

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value));
}

function normalizeString(value, fallback = null) {
  if (value === undefined || value === null) {
    return fallback;
  }

  const normalized = String(value).trim();

  return normalized || fallback;
}

function normalizeType(value) {
  const type = String(value || "").toUpperCase();

  const validTypes = [
    "FIRST_WARNING",
    "SECOND_WARNING",
    "SUSPENSION",
  ];

  if (!validTypes.includes(type)) {
    return null;
  }

  return type;
}

function normalizeStatus(value) {
  const status = String(value || "").toUpperCase();

  const validStatuses = [
    "DRAFT",
    "ACTIVE",
    "REMOVED",
    "REPLACED",
  ];

  if (!validStatuses.includes(status)) {
    return null;
  }

  return status;
}

function normalizeVisibility(value) {
  const visibility = String(
    value || "COMMAND_ONLY",
  ).toUpperCase();

  const validVisibility = [
    "PUBLIC",
    "COMMAND_ONLY",
    "PRIVATE",
  ];

  if (!validVisibility.includes(visibility)) {
    return null;
  }

  return visibility;
}

function normalizeAttachments(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (attachment) =>
        attachment &&
        attachment.filename &&
        attachment.url,
    )
    .map((attachment) => {
      const sourceValue = String(
        attachment.source || "",
      ).toUpperCase();

      const allowedSources = [
        "SITE",
        "DISCORD",
        "EXTERNAL",
      ];

      return {
        id: normalizeString(attachment.id),

        filename: normalizeString(
          attachment.filename,
          "ficheiro",
        ),

        url: normalizeString(attachment.url),

        proxyUrl: normalizeString(
          attachment.proxyUrl ||
            attachment.proxy_url,
        ),

        contentType: normalizeString(
          attachment.contentType ||
            attachment.content_type,
        ),

        size:
          Number.isFinite(Number(attachment.size)) &&
          Number(attachment.size) >= 0
            ? Number(attachment.size)
            : null,

        width:
          Number.isFinite(Number(attachment.width)) &&
          Number(attachment.width) >= 0
            ? Number(attachment.width)
            : null,

        height:
          Number.isFinite(Number(attachment.height)) &&
          Number(attachment.height) >= 0
            ? Number(attachment.height)
            : null,

        source: allowedSources.includes(sourceValue)
          ? sourceValue
          : "SITE",

        uploadedAt: attachment.uploadedAt
          ? new Date(attachment.uploadedAt)
          : new Date(),
      };
    });
}

function buildEvent({
  type,
  label,
  roleId = null,
  req,
  source = "SITE",
  metadata = {},
}) {
  return {
    type,
    roleId,
    label,
    at: new Date(),
    source,
    actorDiscordId: getUserDiscordId(req) || null,
    actorName: getUserDisplayName(req),
    metadata,
  };
}

function getTypeConfig(type) {
  return DISCIPLINARY_ROLE_CONFIG[type] || null;
}

function getPermissions(req) {
  return {
    view: canView(req),
    manage: canManage(req),
    delete: canDelete(req),
  };
}

/**
 * ============================================================
 * PERMISSÕES DO UTILIZADOR
 * ============================================================
 */

router.get("/permissions", (req, res) => {
  res.json({
    authenticated: Boolean(getUserDiscordId(req)),
    discordId: getUserDiscordId(req) || null,
    roles: getUserRoleIds(req),
    permissions: getPermissions(req),
  });
});

/**
 * ============================================================
 * LISTAR PROCESSOS
 * ============================================================
 */

router.get("/", requireViewPermission, async (req, res) => {
  try {
    const filter = {};

    if (req.query.status) {
      const status = normalizeStatus(req.query.status);

      if (!status) {
        return res.status(400).json({
          error: "Estado disciplinar inválido.",
        });
      }

      filter.status = status;
    }

    if (req.query.type) {
      const type = normalizeType(req.query.type);

      if (!type) {
        return res.status(400).json({
          error: "Tipo disciplinar inválido.",
        });
      }

      filter.type = type;
    }

    if (req.query.visibility) {
      const visibility = normalizeVisibility(
        req.query.visibility,
      );

      if (!visibility) {
        return res.status(400).json({
          error: "Visibilidade inválida.",
        });
      }

      filter.visibility = visibility;
    }

    if (req.query.targetDiscordId) {
      filter.targetDiscordId = String(
        req.query.targetDiscordId,
      ).trim();
    }

    if (req.query.managedBySite !== undefined) {
      filter.managedBySite =
        String(req.query.managedBySite).toLowerCase() ===
        "true";
    }

    const limit = Math.min(
      Math.max(Number(req.query.limit) || 100, 1),
      250,
    );

    const page = Math.max(
      Number(req.query.page) || 1,
      1,
    );

    const [items, total] = await Promise.all([
      DisciplinaryRecord.find(filter)
        .sort({
          appliedAt: -1,
          createdAt: -1,
        })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      DisciplinaryRecord.countDocuments(filter),
    ]);

    res.json({
      items,
      total,
      page,
      limit,
      permissions: getPermissions(req),
    });
  } catch (error) {
    console.error(
      "[disciplinary] Erro ao carregar registos:",
      error,
    );

    res.status(500).json({
      error:
        "Não foi possível carregar os registos disciplinares.",
    });
  }
});

/**
 * ============================================================
 * HISTÓRICO DE UM GUARDA
 * ============================================================
 */

router.get(
  "/guard/:discordId",
  requireViewPermission,
  async (req, res) => {
    try {
      const discordId = String(
        req.params.discordId,
      ).trim();

      if (!discordId) {
        return res.status(400).json({
          error: "Discord ID inválido.",
        });
      }

      const filter = {
        targetDiscordId: discordId,
      };

      if (req.query.status) {
        const status = normalizeStatus(req.query.status);

        if (!status) {
          return res.status(400).json({
            error: "Estado disciplinar inválido.",
          });
        }

        filter.status = status;
      }

      const items = await DisciplinaryRecord.find(filter)
        .sort({
          appliedAt: -1,
          createdAt: -1,
        })
        .lean();

      res.json({
        items,
        total: items.length,
        permissions: getPermissions(req),
      });
    } catch (error) {
      console.error(
        "[disciplinary] Erro ao carregar histórico:",
        error,
      );

      res.status(500).json({
        error:
          "Não foi possível carregar o histórico disciplinar.",
      });
    }
  },
);

/**
 * ============================================================
 * CRIAR PROCESSO
 * ============================================================
 */

router.post(
  "/",
  requireManagePermission,
  async (req, res) => {
    try {
      const type = normalizeType(req.body.type);

      if (!type) {
        return res.status(400).json({
          error:
            "O tipo deve ser FIRST_WARNING, SECOND_WARNING ou SUSPENSION.",
        });
      }

      const targetDiscordId = normalizeString(
        req.body.targetDiscordId,
      );

      if (!targetDiscordId) {
        return res.status(400).json({
          error:
            "O Discord ID do militar visado é obrigatório.",
        });
      }

      const visibility = normalizeVisibility(
        req.body.visibility,
      );

      if (!visibility) {
        return res.status(400).json({
          error: "Visibilidade inválida.",
        });
      }

      const requestedStatus =
        normalizeStatus(req.body.status) || "DRAFT";

      if (
        !["DRAFT", "ACTIVE"].includes(requestedStatus)
      ) {
        return res.status(400).json({
          error:
            "Um processo novo só pode ser criado como DRAFT ou ACTIVE.",
        });
      }

      const config = getTypeConfig(type);

      const actorDiscordId =
        getUserDiscordId(req) || null;

      const actorName = getUserDisplayName(req);

      if (requestedStatus === "ACTIVE") {
        const existingActive =
          await DisciplinaryRecord.findOne({
            targetDiscordId,
            type,
            status: "ACTIVE",
          }).lean();

        if (existingActive) {
          return res.status(409).json({
            error:
              "Este militar já possui uma sanção ativa deste tipo.",
            existingRecordId: existingActive._id,
          });
        }
      }

      const events = [
        buildEvent({
          type: "CREATED",
          label: "Processo disciplinar criado no site",
          roleId: config.roleId,
          req,
          metadata: {
            initialStatus: requestedStatus,
            disciplinaryType: type,
          },
        }),
      ];

      if (requestedStatus === "ACTIVE") {
        events.push(
          buildEvent({
            type: "APPLIED",
            label: config.label + " aplicada",
            roleId: config.roleId,
            req,
            metadata: {
              disciplinaryType: type,
            },
          }),
        );
      }

      const record = await DisciplinaryRecord.create({
        targetDiscordId,

        targetName: normalizeString(
          req.body.targetName,
        ),

        targetRank: normalizeString(
          req.body.targetRank,
        ),

        type,
        status: requestedStatus,

        title:
          normalizeString(req.body.title) ||
          config.title,

        reason: normalizeString(req.body.reason),

        sanction:
          normalizeString(req.body.sanction) ||
          config.sanction,

        fullContent:
          typeof req.body.fullContent === "string"
            ? req.body.fullContent
            : "",

        managedBySite: true,
        visibility,

        attachments: normalizeAttachments(
          req.body.attachments,
        ),

        discordMessageId: normalizeString(
          req.body.discordMessageId,
        ),

        discordChannelId:
          normalizeString(
            req.body.discordChannelId,
          ) || DEFAULT_DISCIPLINARY_CHANNEL_ID,

        roleId:
          normalizeString(req.body.roleId) ||
          config.roleId,

        responsibleDiscordId:
          normalizeString(
            req.body.responsibleDiscordId,
          ) || actorDiscordId,

        responsibleName:
          normalizeString(req.body.responsibleName) ||
          actorName,

        createdByDiscordId: actorDiscordId,
        createdByName: actorName,

        appliedAt:
          requestedStatus === "ACTIVE"
            ? req.body.appliedAt
              ? new Date(req.body.appliedAt)
              : new Date()
            : null,

        removedAt: null,

        events,
      });

      res.status(201).json({
        ok: true,
        message:
          requestedStatus === "ACTIVE"
            ? "Sanção disciplinar criada e aplicada no site."
            : "Rascunho disciplinar criado.",
        item: record,
      });
    } catch (error) {
      console.error(
        "[disciplinary] Erro ao criar processo:",
        error,
      );

      if (error?.code === 11000) {
        return res.status(409).json({
          error:
            "Já existe um processo associado a essa mensagem do Discord.",
        });
      }

      res.status(500).json({
        error:
          "Não foi possível criar o processo disciplinar.",
      });
    }
  },
);

/**
 * ============================================================
 * RETIRAR SANÇÃO
 * ============================================================
 */

router.post(
  "/:id/remove",
  requireManagePermission,
  async (req, res) => {
    try {
      if (!isValidObjectId(req.params.id)) {
        return res.status(400).json({
          error: "ID de processo inválido.",
        });
      }

      const record =
        await DisciplinaryRecord.findById(
          req.params.id,
        );

      if (!record) {
        return res.status(404).json({
          error:
            "Registo disciplinar não encontrado.",
        });
      }

      if (record.status === "REMOVED") {
        return res.status(409).json({
          error:
            "Esta sanção já se encontra retirada.",
        });
      }

      if (record.status === "REPLACED") {
        return res.status(409).json({
          error:
            "Esta sanção foi substituída e não pode ser retirada novamente.",
        });
      }

      if (record.status === "DRAFT") {
        return res.status(409).json({
          error:
            "Um rascunho não possui uma sanção ativa para retirar.",
        });
      }

      const config = getTypeConfig(record.type);

      const actorDiscordId =
        getUserDiscordId(req) || null;

      const actorName = getUserDisplayName(req);

      record.status = "REMOVED";
      record.removedAt = new Date();

      record.removedByDiscordId =
        actorDiscordId;

      record.removedByName = actorName;

      record.updatedByDiscordId =
        actorDiscordId;

      record.updatedByName = actorName;

      const removedLabel =
        record.type === "SUSPENSION"
          ? "Suspensão de Serviço levantada"
          : (config?.label || record.title) +
            " retirada";

      record.events.push(
        buildEvent({
          type: "REMOVED",
          label: removedLabel,
          roleId: record.roleId,
          req,
          metadata: {
            reason:
              normalizeString(
                req.body.reason,
              ) || null,
          },
        }),
      );

      await record.save();

      res.json({
        ok: true,
        message:
          "Sanção retirada e mantida no histórico.",
        item: record,
      });
    } catch (error) {
      console.error(
        "[disciplinary] Erro ao retirar sanção:",
        error,
      );

      res.status(500).json({
        error:
          "Não foi possível retirar a sanção disciplinar.",
      });
    }
  },
);

/**
 * ============================================================
 * REATIVAR SANÇÃO
 * ============================================================
 */

router.post(
  "/:id/reactivate",
  requireManagePermission,
  async (req, res) => {
    try {
      if (!isValidObjectId(req.params.id)) {
        return res.status(400).json({
          error: "ID de processo inválido.",
        });
      }

      const record =
        await DisciplinaryRecord.findById(
          req.params.id,
        );

      if (!record) {
        return res.status(404).json({
          error:
            "Registo disciplinar não encontrado.",
        });
      }

      if (record.status === "ACTIVE") {
        return res.status(409).json({
          error:
            "Esta sanção já se encontra ativa.",
        });
      }

      if (record.status === "REPLACED") {
        return res.status(409).json({
          error:
            "Uma sanção substituída não pode ser reativada diretamente.",
        });
      }

      const existingActive =
        await DisciplinaryRecord.findOne({
          _id: {
            $ne: record._id,
          },
          targetDiscordId:
            record.targetDiscordId,
          type: record.type,
          status: "ACTIVE",
        }).lean();

      if (existingActive) {
        return res.status(409).json({
          error:
            "Já existe outra sanção ativa deste tipo para o mesmo militar.",
          existingRecordId: existingActive._id,
        });
      }

      const config = getTypeConfig(record.type);

      const actorDiscordId =
        getUserDiscordId(req) || null;

      const actorName = getUserDisplayName(req);

      record.status = "ACTIVE";
      record.appliedAt = new Date();
      record.removedAt = null;

      record.removedByDiscordId = null;
      record.removedByName = null;

      record.updatedByDiscordId =
        actorDiscordId;

      record.updatedByName = actorName;

      record.events.push(
        buildEvent({
          type: "REACTIVATED",
          label:
            (config?.label || record.title) +
            " reativada",
          roleId: record.roleId,
          req,
          metadata: {
            reason:
              normalizeString(
                req.body.reason,
              ) || null,
          },
        }),
      );

      await record.save();

      res.json({
        ok: true,
        message: "Sanção reativada.",
        item: record,
      });
    } catch (error) {
      console.error(
        "[disciplinary] Erro ao reativar sanção:",
        error,
      );

      res.status(500).json({
        error:
          "Não foi possível reativar a sanção disciplinar.",
      });
    }
  },
);

/**
 * ============================================================
 * SUBSTITUIR SANÇÃO
 * ============================================================
 */

router.post(
  "/:id/replace",
  requireManagePermission,
  async (req, res) => {
    const session = await mongoose.startSession();

    try {
      if (!isValidObjectId(req.params.id)) {
        return res.status(400).json({
          error: "ID de processo inválido.",
        });
      }

      const newType = normalizeType(
        req.body.type,
      );

      if (!newType) {
        return res.status(400).json({
          error:
            "O novo tipo disciplinar é inválido.",
        });
      }

      let oldRecord = null;
      let newRecord = null;

      await session.withTransaction(async () => {
        oldRecord =
          await DisciplinaryRecord.findById(
            req.params.id,
          ).session(session);

        if (!oldRecord) {
          throw new Error("RECORD_NOT_FOUND");
        }

        if (oldRecord.status !== "ACTIVE") {
          throw new Error("RECORD_NOT_ACTIVE");
        }

        if (oldRecord.type === newType) {
          throw new Error(
            "SAME_DISCIPLINARY_TYPE",
          );
        }

        const newConfig =
          getTypeConfig(newType);

        const actorDiscordId =
          getUserDiscordId(req) || null;

        const actorName =
          getUserDisplayName(req);

        const newEvents = [
          buildEvent({
            type: "CREATED",
            label:
              "Processo disciplinar criado por substituição",
            roleId: newConfig.roleId,
            req,
            metadata: {
              replacesRecordId:
                String(oldRecord._id),
            },
          }),

          buildEvent({
            type: "APPLIED",
            label:
              newConfig.label + " aplicada",
            roleId: newConfig.roleId,
            req,
            metadata: {
              replacesRecordId:
                String(oldRecord._id),
            },
          }),
        ];

        newRecord = new DisciplinaryRecord({
          targetDiscordId:
            oldRecord.targetDiscordId,

          targetName:
            normalizeString(
              req.body.targetName,
            ) || oldRecord.targetName,

          targetRank:
            normalizeString(
              req.body.targetRank,
            ) || oldRecord.targetRank,

          type: newType,
          status: "ACTIVE",

          title:
            normalizeString(req.body.title) ||
            newConfig.title,

          reason:
            normalizeString(req.body.reason) ||
            oldRecord.reason,

          sanction:
            normalizeString(
              req.body.sanction,
            ) || newConfig.sanction,

          fullContent:
            typeof req.body.fullContent ===
            "string"
              ? req.body.fullContent
              : oldRecord.fullContent,

          managedBySite: true,

          visibility:
            normalizeVisibility(
              req.body.visibility,
            ) || oldRecord.visibility,

          attachments:
            req.body.attachments !==
            undefined
              ? normalizeAttachments(
                  req.body.attachments,
                )
              : oldRecord.attachments,

          discordChannelId:
            oldRecord.discordChannelId ||
            DEFAULT_DISCIPLINARY_CHANNEL_ID,

          roleId: newConfig.roleId,

          responsibleDiscordId:
            actorDiscordId,

          responsibleName:
            actorName,

          createdByDiscordId:
            actorDiscordId,

          createdByName: actorName,

          appliedAt: new Date(),

          replacesRecordId:
            oldRecord._id,

          events: newEvents,
        });

        await newRecord.save({
          session,
        });

        oldRecord.status = "REPLACED";
        oldRecord.replacedAt = new Date();

        oldRecord.replacedByRecordId =
          newRecord._id;

        oldRecord.updatedByDiscordId =
          actorDiscordId;

        oldRecord.updatedByName =
          actorName;

        const oldConfig = getTypeConfig(
          oldRecord.type,
        );

        oldRecord.events.push(
          buildEvent({
            type: "REPLACED",
            label:
              (oldConfig?.label ||
                oldRecord.title) +
              " substituída por " +
              newConfig.label,
            roleId: oldRecord.roleId,
            req,
            metadata: {
              newRecordId:
                String(newRecord._id),
              newType,
            },
          }),
        );

        await oldRecord.save({
          session,
        });
      });

      res.status(201).json({
        ok: true,
        message:
          "Sanção substituída com sucesso.",
        previousItem: oldRecord,
        item: newRecord,
      });
    } catch (error) {
      console.error(
        "[disciplinary] Erro ao substituir sanção:",
        error,
      );

      if (
        error?.message ===
        "RECORD_NOT_FOUND"
      ) {
        return res.status(404).json({
          error:
            "Registo disciplinar não encontrado.",
        });
      }

      if (
        error?.message ===
        "RECORD_NOT_ACTIVE"
      ) {
        return res.status(409).json({
          error:
            "Apenas uma sanção ativa pode ser substituída.",
        });
      }

      if (
        error?.message ===
        "SAME_DISCIPLINARY_TYPE"
      ) {
        return res.status(409).json({
          error:
            "O novo tipo de sanção é igual ao atual.",
        });
      }

      res.status(500).json({
        error:
          "Não foi possível substituir a sanção disciplinar.",
      });
    } finally {
      await session.endSession();
    }
  },
);

/**
 * ============================================================
 * EDITAR PROCESSO
 * ============================================================
 */

router.patch(
  "/:id",
  requireManagePermission,
  async (req, res) => {
    try {
      if (!isValidObjectId(req.params.id)) {
        return res.status(400).json({
          error: "ID de processo inválido.",
        });
      }

      const record =
        await DisciplinaryRecord.findById(
          req.params.id,
        );

      if (!record) {
        return res.status(404).json({
          error:
            "Registo disciplinar não encontrado.",
        });
      }

      const previousValues = {
        targetName: record.targetName,
        targetRank: record.targetRank,
        title: record.title,
        reason: record.reason,
        sanction: record.sanction,
        visibility: record.visibility,
      };

      if (
        req.body.targetName !== undefined
      ) {
        record.targetName =
          normalizeString(
            req.body.targetName,
          );
      }

      if (
        req.body.targetRank !== undefined
      ) {
        record.targetRank =
          normalizeString(
            req.body.targetRank,
          );
      }

      if (req.body.title !== undefined) {
        const title = normalizeString(
          req.body.title,
        );

        if (!title) {
          return res.status(400).json({
            error:
              "O título não pode ficar vazio.",
          });
        }

        record.title = title;
      }

      if (req.body.reason !== undefined) {
        record.reason =
          normalizeString(req.body.reason);
      }

      if (
        req.body.sanction !== undefined
      ) {
        record.sanction =
          normalizeString(
            req.body.sanction,
          );
      }

      if (
        req.body.fullContent !== undefined
      ) {
        record.fullContent = String(
          req.body.fullContent || "",
        );
      }

      if (
        req.body.visibility !== undefined
      ) {
        const visibility =
          normalizeVisibility(
            req.body.visibility,
          );

        if (!visibility) {
          return res.status(400).json({
            error: "Visibilidade inválida.",
          });
        }

        record.visibility = visibility;
      }

      if (
        req.body.attachments !== undefined
      ) {
        record.attachments =
          normalizeAttachments(
            req.body.attachments,
          );
      }

      record.updatedByDiscordId =
        getUserDiscordId(req) || null;

      record.updatedByName =
        getUserDisplayName(req);

      record.events.push(
        buildEvent({
          type: "UPDATED",
          label:
            "Processo disciplinar atualizado",
          roleId: record.roleId,
          req,
          metadata: {
            previousValues,
          },
        }),
      );

      await record.save();

      res.json({
        ok: true,
        message:
          "Processo disciplinar atualizado.",
        item: record,
      });
    } catch (error) {
      console.error(
        "[disciplinary] Erro ao atualizar processo:",
        error,
      );

      res.status(500).json({
        error:
          "Não foi possível atualizar o processo disciplinar.",
      });
    }
  },
);

/**
 * ============================================================
 * APAGAR DEFINITIVAMENTE
 * ============================================================
 */

router.delete(
  "/:id",
  requireDeletePermission,
  async (req, res) => {
    try {
      if (!isValidObjectId(req.params.id)) {
        return res.status(400).json({
          error: "ID de processo inválido.",
        });
      }

      const record =
        await DisciplinaryRecord.findById(
          req.params.id,
        );

      if (!record) {
        return res.status(404).json({
          error:
            "Registo disciplinar não encontrado.",
        });
      }

      const deletedRecord = {
        id: record._id,
        targetDiscordId:
          record.targetDiscordId,
        targetName: record.targetName,
        type: record.type,
        status: record.status,
        title: record.title,
        discordMessageId:
          record.discordMessageId,
        roleId: record.roleId,
      };

      await record.deleteOne();

      console.info(
        "[disciplinary] Processo apagado definitivamente:",
        {
          ...deletedRecord,
          deletedBy:
            getUserDiscordId(req) ||
            getUserDisplayName(req),
        },
      );

      res.json({
        ok: true,
        message:
          "Processo disciplinar apagado definitivamente.",
        deletedItem: deletedRecord,
      });
    } catch (error) {
      console.error(
        "[disciplinary] Erro ao apagar processo:",
        error,
      );

      res.status(500).json({
        error:
          "Não foi possível apagar definitivamente o processo disciplinar.",
      });
    }
  },
);

/**
 * ============================================================
 * CARREGAR PROCESSO INDIVIDUAL
 * ============================================================
 */

router.get(
  "/:id",
  requireViewPermission,
  async (req, res) => {
    try {
      if (!isValidObjectId(req.params.id)) {
        return res.status(400).json({
          error: "ID de processo inválido.",
        });
      }

      const item =
        await DisciplinaryRecord.findById(
          req.params.id,
        ).lean();

      if (!item) {
        return res.status(404).json({
          error:
            "Registo disciplinar não encontrado.",
        });
      }

      res.json({
        item,
        permissions: getPermissions(req),
      });
    } catch (error) {
      console.error(
        "[disciplinary] Erro ao carregar processo:",
        error,
      );

      res.status(500).json({
        error:
          "Não foi possível carregar o registo disciplinar.",
      });
    }
  },
);

export default router;

