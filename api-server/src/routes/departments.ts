import { Router, type Request, type Response, type NextFunction } from "express";
import DepartmentRecord from "../models/DepartmentRecord.js";
import {
  DEPARTMENT_CONFIG,
  DEPARTMENT_ROLES,
  calculateClearanceAmount,
  canAccessDepartment,
  canManageDepartment,
  hasRole,
  isCommand,
  nextReferenceNumber,
} from "../services/departmentService.js";

const router = Router();

const DISCORD_TOKEN =
  process.env.DISCORD_TOKEN ||
  process.env.TOKEN ||
  "";

const GUILD_ID = (
  process.env.DISCORD_GUILD_ID ||
  process.env.GUILD_IDS ||
  ""
)
  .split(",")[0]
  .trim();

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

function requireDepartmentAccess(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const department = String(req.params.department || "").toUpperCase();

  if (!canAccessDepartment(sessionUser(req), department)) {
    res.status(403).json({
      error: "Não tens acesso a este departamento.",
    });
    return;
  }

  (req as any).department = department;
  next();
}

function requireDepartmentManage(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const department = String(req.params.department || "").toUpperCase();

  if (!canManageDepartment(sessionUser(req), department)) {
    res.status(403).json({
      error: "Não tens permissões para gerir este departamento.",
    });
    return;
  }

  (req as any).department = department;
  next();
}

async function fetchRoleMembers(roleId: string) {
  if (!DISCORD_TOKEN || !GUILD_ID) return [];

  const response = await fetch(
    `https://discord.com/api/v10/guilds/${GUILD_ID}/members?limit=1000`,
    {
      headers: {
        Authorization: `Bot ${DISCORD_TOKEN}`,
      },
    },
  );

  if (!response.ok) return [];

  const members = (await response.json()) as any[];

  return members
    .filter((member) =>
      Array.isArray(member.roles) &&
      member.roles.map(String).includes(roleId),
    )
    .map((member) => ({
      discordId: String(member.user?.id || ""),
      name:
        member.nick ||
        member.user?.global_name ||
        member.user?.username ||
        "Utilizador Discord",
      username: member.user?.username || null,
      avatar:
        member.user?.avatar && member.user?.id
          ? `https://cdn.discordapp.com/avatars/${member.user.id}/${member.user.avatar}.png`
          : null,
      joinedAt: member.joined_at || null,
      roles: member.roles || [],
    }));
}

router.get(
  "/overview",
  requireAuthentication,
  async (req, res) => {
    try {
      const user = sessionUser(req);

      const departments = await Promise.all(
        Object.entries(DEPARTMENT_CONFIG).map(
          async ([key, config]) => {
            const accessible = canAccessDepartment(user, key);

            if (!accessible) {
              return {
                key,
                ...config,
                accessible: false,
              };
            }

            const [
              members,
              open,
              awaitingCommand,
              completed,
              critical,
            ] = await Promise.all([
              fetchRoleMembers(config.roleId),
              DepartmentRecord.countDocuments({
                department: key,
                status: {
                  $nin: ["COMPLETED", "ARCHIVED", "REJECTED"],
                },
              }),
              DepartmentRecord.countDocuments({
                department: key,
                status: "AWAITING_COMMAND",
              }),
              DepartmentRecord.countDocuments({
                department: key,
                status: "COMPLETED",
              }),
              DepartmentRecord.countDocuments({
                department: key,
                priority: "CRITICAL",
                status: {
                  $nin: ["COMPLETED", "ARCHIVED"],
                },
              }),
            ]);

            return {
              key,
              ...config,
              accessible: true,
              members: members.length,
              counts: {
                open,
                awaitingCommand,
                completed,
                critical,
              },
            };
          },
        ),
      );

      res.json({
        departments,
        permissions: {
          command: isCommand(user),
        },
      });
    } catch (error) {
      console.error("[departments] Overview error:", error);

      res.status(500).json({
        error: "Não foi possível carregar os departamentos.",
      });
    }
  },
);

router.get(
  "/:department",
  requireAuthentication,
  requireDepartmentAccess,
  async (req, res) => {
    try {
      const department = (req as any).department;
      const config = DEPARTMENT_CONFIG[department];

      const [
        members,
        records,
        grouped,
      ] = await Promise.all([
        fetchRoleMembers(config.roleId),
        DepartmentRecord.find({ department })
          .sort({ updatedAt: -1 })
          .limit(150)
          .lean(),
        DepartmentRecord.aggregate([
          { $match: { department } },
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
            },
          },
        ]),
      ]);

      res.json({
        department: {
          key: department,
          ...config,
        },
        members,
        records,
        counts: Object.fromEntries(
          grouped.map((item) => [item._id, item.count]),
        ),
        permissions: {
          manage: canManageDepartment(
            sessionUser(req),
            department,
          ),
          command: isCommand(sessionUser(req)),
        },
      });
    } catch (error) {
      console.error("[departments] Detail error:", error);

      res.status(500).json({
        error: "Não foi possível carregar o departamento.",
      });
    }
  },
);

router.get(
  "/:department/records",
  requireAuthentication,
  requireDepartmentAccess,
  async (req, res) => {
    try {
      const department = (req as any).department;
      const filter: any = { department };

      if (req.query.type) {
        filter.type = String(req.query.type).toUpperCase();
      }

      if (req.query.status) {
        filter.status = String(req.query.status).toUpperCase();
      }

      const search = String(req.query.search || "").trim();

      if (search) {
        const safe = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(safe, "i");

        filter.$or = [
          { title: regex },
          { description: regex },
          { targetName: regex },
          { referenceNumber: regex },
        ];
      }

      const records = await DepartmentRecord.find(filter)
        .sort({ priority: -1, updatedAt: -1 })
        .limit(250)
        .lean();

      res.json({ records });
    } catch (error) {
      console.error("[departments] List error:", error);

      res.status(500).json({
        error: "Não foi possível carregar os registos.",
      });
    }
  },
);

router.post(
  "/:department/records",
  requireAuthentication,
  requireDepartmentManage,
  async (req, res) => {
    try {
      const department = (req as any).department;
      const type = String(req.body.type || "OTHER").toUpperCase();

      const referenceNumber = await nextReferenceNumber(
        department,
        type,
      );

      const incidents = Math.max(
        0,
        Number(req.body.incidents || 0),
      );

      const record = await DepartmentRecord.create({
        department,
        type,
        referenceNumber,
        title: String(req.body.title || "").trim(),
        description: String(req.body.description || "").trim(),
        status: String(req.body.status || "OPEN").toUpperCase(),
        priority: String(req.body.priority || "NORMAL").toUpperCase(),
        targetDiscordId: req.body.targetDiscordId || null,
        targetName: req.body.targetName || null,
        targetUnit: req.body.targetUnit || null,
        targetRank: req.body.targetRank || null,
        participants: Array.isArray(req.body.participants)
          ? req.body.participants
          : [],
        meetingDate: req.body.meetingDate || null,
        cegMemberPresent: Boolean(req.body.cegMemberPresent),
        commandConsent: Boolean(req.body.commandConsent),
        incidents,
        calculatedAmount:
          type === "CRIMINAL_RECORD_CLEARANCE"
            ? calculateClearanceAmount(incidents)
            : Number(req.body.calculatedAmount || 0),
        validFrom: req.body.validFrom || null,
        validUntil: req.body.validUntil || null,
        metadata: req.body.metadata || {},
        attachments: Array.isArray(req.body.attachments)
          ? req.body.attachments
          : [],
        createdByDiscordId: userId(req),
        createdByName: userName(req),
        assignedToDiscordId: req.body.assignedToDiscordId || null,
        assignedToName: req.body.assignedToName || null,
        history: [
          {
            type: "CREATED",
            actorDiscordId: userId(req),
            actorName: userName(req),
            note: "Registo criado.",
          },
        ],
      });

      res.status(201).json({
        ok: true,
        record,
      });
    } catch (error) {
      console.error("[departments] Create error:", error);

      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível criar o registo.",
      });
    }
  },
);

router.patch(
  "/:department/records/:recordId",
  requireAuthentication,
  requireDepartmentManage,
  async (req, res) => {
    try {
      const department = (req as any).department;

      const record = await DepartmentRecord.findOne({
        _id: req.params.recordId,
        department,
      });

      if (!record) {
        res.status(404).json({
          error: "Registo não encontrado.",
        });
        return;
      }

      const allowed = [
        "title",
        "description",
        "status",
        "priority",
        "targetDiscordId",
        "targetName",
        "targetUnit",
        "targetRank",
        "participants",
        "meetingDate",
        "cegMemberPresent",
        "assignedToDiscordId",
        "assignedToName",
        "validFrom",
        "validUntil",
        "metadata",
      ];

      for (const field of allowed) {
        if (field in req.body) {
          (record as any)[field] = req.body[field];
        }
      }

      if ("incidents" in req.body) {
        record.incidents = Math.max(
          0,
          Number(req.body.incidents || 0),
        );

        if (record.type === "CRIMINAL_RECORD_CLEARANCE") {
          record.calculatedAmount =
            calculateClearanceAmount(record.incidents);
        }
      }

      if (
        req.body.commandConsent === true &&
        !isCommand(sessionUser(req))
      ) {
        res.status(403).json({
          error:
            "Apenas o Comando-Geral pode conceder consentimento.",
        });
        return;
      }

      if ("commandConsent" in req.body) {
        record.commandConsent = Boolean(req.body.commandConsent);

        if (record.commandConsent) {
          record.commandConsentByDiscordId = userId(req);
          record.commandConsentByName = userName(req);
        } else {
          record.commandConsentByDiscordId = null;
          record.commandConsentByName = null;
        }
      }

      if (
        record.type === "MEETING" &&
        record.department === "CSO" &&
        req.body.status === "COMPLETED" &&
        !record.cegMemberPresent
      ) {
        res.status(400).json({
          error:
            "Uma reunião do CSO não pode ser concluída sem a presença de pelo menos um membro do CEG.",
        });
        return;
      }

      if (
        record.department === "DRH" &&
        record.type === "DISMISSAL" &&
        ["APPROVED", "COMPLETED"].includes(String(req.body.status)) &&
        !record.commandConsent
      ) {
        res.status(400).json({
          error:
            "O despedimento necessita do consentimento do Comando-Geral.",
        });
        return;
      }

      if (
        ["COMPLETED", "ARCHIVED"].includes(record.status)
      ) {
        record.completedAt = record.completedAt || new Date();
      }

      record.history.push({
        type: "UPDATED",
        actorDiscordId: userId(req),
        actorName: userName(req),
        note: String(req.body.note || "Registo atualizado."),
        metadata: {
          status: record.status,
        },
      });

      await record.save();

      res.json({
        ok: true,
        record,
      });
    } catch (error) {
      console.error("[departments] Update error:", error);

      res.status(500).json({
        error: "Não foi possível atualizar o registo.",
      });
    }
  },
);

router.post(
  "/:department/records/:recordId/vote",
  requireAuthentication,
  requireDepartmentManage,
  async (req, res) => {
    try {
      const department = (req as any).department;
      const record = await DepartmentRecord.findOne({
        _id: req.params.recordId,
        department,
      });

      if (!record) {
        res.status(404).json({
          error: "Registo não encontrado.",
        });
        return;
      }

      const vote = String(req.body.vote || "NONE").toUpperCase();
      const participant = record.participants.find(
        (item) => item.discordId === userId(req),
      );

      if (participant) {
        participant.vote = vote as any;
        participant.note = String(req.body.note || "");
      } else {
        record.participants.push({
          discordId: userId(req),
          name: userName(req),
          role: department,
          vote: vote as any,
          note: String(req.body.note || ""),
        });
      }

      record.history.push({
        type: "VOTE",
        actorDiscordId: userId(req),
        actorName: userName(req),
        note: String(req.body.note || ""),
        metadata: { vote },
      });

      await record.save();

      res.json({
        ok: true,
        record,
      });
    } catch (error) {
      console.error("[departments] Vote error:", error);

      res.status(500).json({
        error: "Não foi possível registar o voto.",
      });
    }
  },
);

router.get(
  "/tools/clearance-price",
  requireAuthentication,
  async (req, res) => {
    const incidents = Math.max(
      0,
      Number(req.query.incidents || 0),
    );

    res.json({
      incidents,
      baseAmount: 150000,
      amountPerIncident: 50000,
      maximumAmount: 500000,
      total: calculateClearanceAmount(incidents),
    });
  },
);

export default router;
