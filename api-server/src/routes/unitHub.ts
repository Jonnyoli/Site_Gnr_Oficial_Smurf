import { Router, type Request, type Response, type NextFunction } from "express";
import crypto from "node:crypto";
import Unit from "../models/Unit.js";
import UnitEvent from "../models/UnitEvent.js";
import UnitRecruitment from "../models/UnitRecruitment.js";
import UnitApplication from "../models/UnitApplication.js";
import { OperationalUser } from "../models/OperationalUser.js";
import { AuditLog } from "../models/index.js";
import {
  ATTENDANCE_EMOJIS,
  sendUnitEventDiscord,
  setDiscordAttendanceReaction,
} from "../services/unitDiscordService.js";
import { startUnitEventReminderWorker } from "../services/unitEventReminderWorker.js";

const router = Router();
startUnitEventReminderWorker();

const COMMAND_ROLE_ID = "1147878942099906672";
const DEV_USER_ID = "713719718091030599";

const DEFAULT_UNITS = [
  {
    code: "UNT", name: "Unidade Nacional de Trânsito", shortName: "UNT",
    memberRoleId: "1147878941885988929",
    directorRoleIds: [process.env.UNIT_UNT_DIRECTOR_ROLE_ID].filter(Boolean),
    motto: "Segurança, fiscalização e responsabilidade no trânsito.",
  },
  {
    code: "NIC", name: "Núcleo de Investigação Criminal", shortName: "NIC",
    memberRoleId: "1296910359994564700",
    directorRoleIds: ["1296910327879045130", process.env.UNIT_NIC_DIRECTOR_ROLE_ID].filter(Boolean),
    motto: "Sigilo, prova e precisão operacional.",
  },
  {
    code: "USHE", name: "Unidade de Segurança e Honras de Estado", shortName: "USHE",
    memberRoleId: "1332075102879219793",
    directorRoleIds: [process.env.UNIT_USHE_DIRECTOR_ROLE_ID].filter(Boolean),
    motto: "Honra, Disciplina e Excelência.",
  },
  {
    code: "GIOE", name: "Grupo de Intervenção de Operações Especiais", shortName: "GIOE",
    memberRoleId: "1147878941974077473",
    directorRoleIds: [process.env.UNIT_GIOE_DIRECTOR_ROLE_ID].filter(Boolean),
    motto: "Prontidão Zero minutos.",
  },
  {
    code: "GSA", name: "Grupo de Suporte Aéreo", shortName: "GSA",
    memberRoleId: "1147878941927952470",
    directorRoleIds: ["1147878941927952472", process.env.UNIT_GSA_DIRECTOR_ROLE_ID].filter(Boolean),
    description: "Subunidade responsável pelas operações aéreas, vigilância, mobilidade rápida, resgate e apoio tático especializado.",
    mission: "Patrulhamento e vigilância aérea, apoio às subunidades, resgate, evacuação, perseguições, formação e reconhecimento aéreo.",
    motto: "Olhos no céu, segurança no terreno.",
  },
  {
    code: "DI", name: "Destacamento de Intervenção", shortName: "DI",
    memberRoleId: "1187379939708780544",
    directorRoleIds: [process.env.UNIT_DI_DIRECTOR_ROLE_ID].filter(Boolean),
    motto: "Por todo o lado céleres sempre firmes.",
  },
];

function sessionUser(req: Request) { return req.session?.user || null; }
function userId(req: Request) { return String(sessionUser(req)?.id || ""); }
function userName(req: Request) {
  const user = sessionUser(req);
  return user?.displayName || user?.global_name || user?.username || userId(req) || "Sistema";
}
function roles(req: Request): string[] {
  const value = sessionUser(req)?.roles;
  return Array.isArray(value) ? value.map(String) : [];
}
function isCommand(req: Request) {
  return userId(req) === DEV_USER_ID || roles(req).includes(COMMAND_ROLE_ID);
}
async function ensureUnits() {
  for (const item of DEFAULT_UNITS) {
    await Unit.findOneAndUpdate(
      { code: item.code },
      { $setOnInsert: item },
      { upsert: true, new: true },
    );
  }
}
async function unitByCode(code: string) {
  await ensureUnits();
  return Unit.findOne({ code: code.toUpperCase(), active: true });
}
async function hasUnitAccess(req: Request, code: string) {
  if (isCommand(req)) return true;
  const unit = await unitByCode(code);
  return Boolean(unit && roles(req).includes(unit.memberRoleId));
}

const GNR_MILITARY_ROLE_ID =
  process.env.GNR_MILITARY_ROLE_ID ||
  "1147878941974077478";

async function getCurrentUnitMembers(
  roleId: string,
) {
  const users =
    await OperationalUser.find({
      isInGuild: true,
      savedTags: {
        $all: [
          GNR_MILITARY_ROLE_ID,
          roleId,
        ],
      },
    })
      .select({
        discordId: 1,
        warName: 1,
        displayName: 1,
        username: 1,
        avatarUrl: 1,
        rank: 1,
        posto: 1,
        estado: 1,
        status: 1,
        isOnDuty: 1,
        isDiscordOnline: 1,
        hierarchyOrder: 1,
        savedTags: 1,
        isInGuild: 1,
      })
      .sort({
        hierarchyOrder: 1,
        warName: 1,
        displayName: 1,
        username: 1,
      })
      .lean();

  return users
    .filter(
      (user: any) =>
        user?.isInGuild === true &&
        Array.isArray(
          user?.savedTags,
        ) &&
        user.savedTags.includes(
          GNR_MILITARY_ROLE_ID,
        ) &&
        user.savedTags.includes(
          roleId,
        ),
    )
    .map(
      (user: any) => ({
        id:
          String(
            user.discordId ||
            user._id ||
            "",
          ),
        discordId:
          String(
            user.discordId ||
            "",
          ),
        nome:
          user.warName ||
          user.displayName ||
          user.username ||
          "Militar",
        warName:
          user.warName ||
          null,
        displayName:
          user.displayName ||
          null,
        username:
          user.username ||
          null,
        avatarUrl:
          user.avatarUrl ||
          null,
        posto:
          user.posto ||
          user.rank ||
          "Operacional",
        rank:
          user.rank ||
          user.posto ||
          null,
        estado:
          user.estado ||
          user.status ||
          null,
        isOnDuty:
          user.isOnDuty === true,
        isDiscordOnline:
          user.isDiscordOnline === true,
        hierarchyOrder:
          Number(
            user.hierarchyOrder ||
            999,
          ),
        isInGuild: true,
        savedTags:
          user.savedTags,
        roles:
          user.savedTags,
        roleIds:
          user.savedTags,
      }),
    );
}

async function canManage(req: Request, code: string) {
  if (isCommand(req)) return true;
  const unit = await unitByCode(code);
  return Boolean(unit && unit.directorRoleIds.some((id: string) => roles(req).includes(id)));
}
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!sessionUser(req)) return void res.status(401).json({ error: "É necessário iniciar sessão." });
  next();
}
async function audit(req: Request, action: string, severity: string, description: string, targetId?: string, targetName?: string, metadata: any = {}) {
  try {
    await AuditLog.create({
      actorId: userId(req), actorName: userName(req), action,
      module: "Unidades", severity, description,
      targetId: targetId || null, targetName: targetName || null,
      metadata, ip: req.ip || null, userAgent: req.get("user-agent") || null,
    });
  } catch (error) {
    console.error("[UNIT HUB AUDIT]", error);
  }
}

router.use(requireAuth);


router.get(
  "/summary",
  async (_req, res) => {
    await ensureUnits();

    const units =
      await Unit.find({
        active: true,
      })
        .sort({
          code: 1,
        })
        .lean();

    const entries =
      await Promise.all(
        units.map(
          async (unit: any) => {
            const members =
              await getCurrentUnitMembers(
                String(
                  unit.memberRoleId,
                ),
              );

            return [
              String(
                unit.code,
              ).toUpperCase(),
              {
                roleId:
                  String(
                    unit.memberRoleId,
                  ),
                members,
                memberCount:
                  members.length,
                activeCount:
                  members.filter(
                    (member: any) =>
                      member.isOnDuty === true ||
                      member.isDiscordOnline === true ||
                      /servi|patrulha|ativo|online/i.test(
                        String(
                          member.estado ||
                          "",
                        ),
                      ),
                  ).length,
              },
            ];
          },
        ),
      );

    res.json({
      militaryRoleId:
        GNR_MILITARY_ROLE_ID,
      units:
        Object.fromEntries(
          entries,
        ),
      generatedAt:
        new Date(),
    });
  },
);

router.get("/:unit", async (req, res) => {
  const code = String(req.params.unit).toUpperCase();
  if (!(await hasUnitAccess(req, code))) return void res.status(403).json({ error: "Sem acesso a esta unidade." });

  const now = new Date();
  const [unit, events, recruitments, applications] = await Promise.all([
    unitByCode(code),
    UnitEvent.find({ unitCode: code, startsAt: { $gte: new Date(now.getTime() - 30 * 86400000) } }).sort({ startsAt: 1 }).lean(),
    UnitRecruitment.find({ unitCode: code }).sort({ createdAt: -1 }).lean(),
    canManage(req, code)
      ? UnitApplication.find({ unitCode: code }).sort({ createdAt: -1 }).lean()
      : UnitApplication.find({ unitCode: code, applicantId: userId(req) }).sort({ createdAt: -1 }).lean(),
  ]);

  res.json({
    unit,
    events,
    recruitments,
    applications,
    currentUserId: userId(req),
    permissions: {
      manage: await canManage(req, code),
      attend: true,
      apply: true,
    },
  });
});

router.post("/:unit/events", async (req, res) => {
  const code = String(req.params.unit).toUpperCase();
  if (!(await canManage(req, code))) return void res.status(403).json({ error: "Apenas a Direção da unidade pode criar eventos." });

  const startsAt = new Date(req.body?.startsAt);
  if (!req.body?.title?.trim() || Number.isNaN(startsAt.getTime())) {
    return void res.status(400).json({ error: "Título e data são obrigatórios." });
  }

  const event = await UnitEvent.create({
    unitCode: code,
    type: String(req.body?.type || "OTHER").toUpperCase(),
    title: String(req.body.title).trim(),
    description: String(req.body?.description || "").trim(),
    location: String(req.body?.location || "").trim(),
    startsAt,
    endsAt: req.body?.endsAt ? new Date(req.body.endsAt) : null,
    visibility: req.body?.visibility === "PUBLIC" ? "PUBLIC" : "UNIT",
    responsibleId: req.body?.responsibleId || userId(req),
    responsibleName: req.body?.responsibleName || userName(req),
    attendanceEnabled: req.body?.attendanceEnabled !== false,
    createdById: userId(req),
    createdByName: userName(req),
  });

  let discord: any = { sent: false };
  try {
    discord = await sendUnitEventDiscord(event);
    event.discord = {
      ...(event.discord as any),
      notifiedAt: discord.sent ? new Date() : null,
      notificationError: discord.reason || null,
      channelId: discord.channelId || null,
      messageId: discord.messageId || null,
      jumpUrl: discord.jumpUrl || null,
      reactionsReady: discord.reactionsReady === true,
      reactionErrors: Array.isArray(discord.reactionErrors)
        ? discord.reactionErrors
        : [],
    } as any;
    await event.save();
  } catch (error: any) {
    event.discord = { ...(event.discord as any), notificationError: error.message } as any;
    await event.save();
    discord = { sent: false, reason: error.message };
  }

  await audit(req, "UNIT_EVENT_CREATED", "success", `${userName(req)} criou o evento ${event.title} na ${code}.`, String(event._id), event.title, { unitCode: code, type: event.type, startsAt, discord });
  res.status(201).json({ event, discord });
});

router.patch("/events/:id", async (req, res) => {
  const event = await UnitEvent.findById(req.params.id);
  if (!event) return void res.status(404).json({ error: "Evento não encontrado." });
  if (!(await canManage(req, event.unitCode))) return void res.status(403).json({ error: "Sem permissão." });

  const allowed = ["title", "description", "location", "startsAt", "endsAt", "status", "visibility", "attendanceEnabled"];
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(req.body || {}, key)) (event as any)[key] = req.body[key];
  }
  event.updatedById = userId(req);
  await event.save();

  await audit(req, "UNIT_EVENT_UPDATED", "info", `${userName(req)} atualizou o evento ${event.title}.`, String(event._id), event.title, { unitCode: event.unitCode });
  res.json({ event });
});

router.post("/events/:id/attendance", async (req, res) => {
  const event = await UnitEvent.findById(req.params.id);
  if (!event) return void res.status(404).json({ error: "Evento não encontrado." });
  if (!(await hasUnitAccess(req, event.unitCode))) return void res.status(403).json({ error: "Sem acesso." });
  if (!event.attendanceEnabled) return void res.status(409).json({ error: "Confirmação de presença desativada." });

  const status = String(req.body?.status || "").toUpperCase();
  if (!["PRESENT", "MAYBE", "ABSENT"].includes(status)) return void res.status(400).json({ error: "Estado inválido." });

  event.attendance = (event.attendance || []).filter((item: any) => item.userId !== userId(req)) as any;
  event.attendance.push({
    userId: userId(req),
    userName: userName(req),
    status,
    note: String(req.body?.note || "").trim(),
    respondedAt: new Date(),
  } as any);
  await event.save();

  if (event.discord?.channelId && event.discord?.messageId) {
    await setDiscordAttendanceReaction(
      event.discord.channelId,
      event.discord.messageId,
      userId(req),
      status as keyof typeof ATTENDANCE_EMOJIS,
    ).catch((error) =>
      console.warn("[UNIT ATTENDANCE DISCORD SYNC]", error?.message || error),
    );
  }

  await audit(req, "UNIT_EVENT_ATTENDANCE_UPDATED", "info", `${userName(req)} respondeu ao evento ${event.title}.`, String(event._id), event.title, { unitCode: event.unitCode, status });
  res.json({ event });
});

router.delete("/events/:id", async (req, res) => {
  const event = await UnitEvent.findById(req.params.id);
  if (!event) return void res.status(404).json({ error: "Evento não encontrado." });
  if (!(await canManage(req, event.unitCode))) return void res.status(403).json({ error: "Sem permissão." });

  event.status = "CANCELLED";
  event.updatedById = userId(req);
  await event.save();
  await audit(req, "UNIT_EVENT_CANCELLED", "warning", `${userName(req)} cancelou o evento ${event.title}.`, String(event._id), event.title, { unitCode: event.unitCode });
  res.json({ event });
});

router.post("/:unit/recruitments", async (req, res) => {
  const code = String(req.params.unit).toUpperCase();
  if (!(await canManage(req, code))) return void res.status(403).json({ error: "Apenas a Direção pode abrir recrutamentos." });

  const opensAt = new Date(req.body?.opensAt || Date.now());
  const closesAt = new Date(req.body?.closesAt);
  if (!req.body?.title?.trim() || Number.isNaN(closesAt.getTime()) || closesAt <= opensAt) {
    return void res.status(400).json({ error: "Título e datas válidas são obrigatórios." });
  }

  const questions = (Array.isArray(req.body?.questions) ? req.body.questions : [])
    .map((label: any) => String(label).trim())
    .filter(Boolean)
    .map((label: string) => ({ id: crypto.randomUUID(), label, required: true }));

  const recruitment = await UnitRecruitment.create({
    unitCode: code,
    title: String(req.body.title).trim(),
    description: String(req.body?.description || "").trim(),
    requirements: Array.isArray(req.body?.requirements) ? req.body.requirements.map(String).map((v: string) => v.trim()).filter(Boolean) : [],
    vacancies: req.body?.vacancies ? Number(req.body.vacancies) : null,
    opensAt,
    closesAt,
    status: "OPEN",
    questions,
    createdById: userId(req),
    createdByName: userName(req),
  });

  await audit(req, "UNIT_RECRUITMENT_OPENED", "success", `${userName(req)} abriu recrutamento na ${code}.`, String(recruitment._id), recruitment.title, { unitCode: code, closesAt });
  res.status(201).json({ recruitment });
});

router.post("/recruitments/:id/apply", async (req, res) => {
  const recruitment = await UnitRecruitment.findById(req.params.id);
  if (!recruitment) return void res.status(404).json({ error: "Recrutamento não encontrado." });
  const now = new Date();
  if (recruitment.status !== "OPEN" || now < recruitment.opensAt || now > recruitment.closesAt) {
    return void res.status(409).json({ error: "Este recrutamento não está aberto." });
  }

  const motivation = String(req.body?.motivation || "").trim();
  if (motivation.length < 20) return void res.status(400).json({ error: "A motivação deve ter pelo menos 20 caracteres." });

  const supplied = Array.isArray(req.body?.answers) ? req.body.answers : [];
  const map = new Map(supplied.map((item: any) => [String(item.questionId), String(item.answer || "").trim()]));
  const answers = recruitment.questions.map((q: any) => ({
    questionId: q.id,
    question: q.label,
    answer: map.get(q.id) || "",
  }));
  if (recruitment.questions.some((q: any) => q.required && !(map.get(q.id) || "").trim())) {
    return void res.status(400).json({ error: "Responde a todas as perguntas obrigatórias." });
  }

  try {
    const application = await UnitApplication.create({
      recruitmentId: recruitment._id,
      unitCode: recruitment.unitCode,
      applicantId: userId(req),
      applicantName: userName(req),
      motivation,
      answers,
    });
    await audit(req, "UNIT_APPLICATION_CREATED", "info", `${userName(req)} candidatou-se à ${recruitment.unitCode}.`, String(application._id), userName(req), { recruitmentId: recruitment._id });
    res.status(201).json({ application });
  } catch (error: any) {
    if (error?.code === 11000) return void res.status(409).json({ error: "Já te candidataste a este recrutamento." });
    throw error;
  }
});

router.post("/applications/:id/decision", async (req, res) => {
  const application = await UnitApplication.findById(req.params.id);
  if (!application) return void res.status(404).json({ error: "Candidatura não encontrada." });
  if (!(await canManage(req, application.unitCode))) return void res.status(403).json({ error: "Sem permissão." });

  const status = String(req.body?.status || "").toUpperCase();
  if (!["INTERVIEW", "APPROVED", "REJECTED"].includes(status)) return void res.status(400).json({ error: "Decisão inválida." });
  const reason = String(req.body?.reason || "").trim();
  if (status === "REJECTED" && reason.length < 5) return void res.status(400).json({ error: "Motivo obrigatório na recusa." });

  application.status = status as any;
  application.reviewedById = userId(req);
  application.reviewedByName = userName(req);
  application.reviewReason = reason;
  application.reviewedAt = new Date();
  await application.save();

  await audit(req, "UNIT_APPLICATION_DECIDED", status === "APPROVED" ? "success" : "warning", `${userName(req)} atualizou a candidatura de ${application.applicantName}.`, String(application._id), application.applicantName, { unitCode: application.unitCode, status, reason });
  res.json({ application });
});



router.get("/internal/health", async (req, res) => {
  const secret = String(req.get("x-unit-sync-secret") || "");
  const expected = String(process.env.UNIT_DISCORD_SYNC_SECRET || "");

  if (!expected || secret !== expected) {
    return void res.status(401).json({
      ok: false,
      error: "Segredo interno inválido.",
    });
  }

  const lastEvents = await UnitEvent.find({
    "discord.messageId": {
      $ne: null,
    },
  })
    .sort({
      createdAt: -1,
    })
    .limit(5)
    .select({
      unitCode: 1,
      title: 1,
      "discord.channelId": 1,
      "discord.messageId": 1,
      "discord.reactionsReady": 1,
      "discord.reactionErrors": 1,
    })
    .lean();

  res.json({
    ok: true,
    service: "unit-discord-reaction-sync",
    eventsWithDiscordMessage: lastEvents,
  });
});

router.post("/internal/discord-reaction", async (req, res) => {
  const secret = String(req.get("x-unit-sync-secret") || "");
  const expected = String(process.env.UNIT_DISCORD_SYNC_SECRET || "");

  if (!expected || secret !== expected) {
    return void res.status(401).json({ error: "Segredo interno inválido." });
  }

  const messageId = String(req.body?.messageId || "");
  const discordUserId = String(req.body?.userId || "");
  const discordUserName = String(req.body?.userName || discordUserId);
  const emoji = String(req.body?.emoji || "");
  const action = String(req.body?.action || "ADD").toUpperCase();

  const statusByEmoji: Record<string, "PRESENT" | "MAYBE" | "ABSENT"> = {
    "✅": "PRESENT",
    "❓": "MAYBE",
    "❌": "ABSENT",
  };

  const status = statusByEmoji[emoji];
  if (!messageId || !discordUserId || !status) {
    return void res.status(400).json({ error: "Payload inválido." });
  }

  const channelId = String(req.body?.channelId || "");

  const event = await UnitEvent.findOne({
    "discord.messageId": messageId,
    ...(channelId
      ? { "discord.channelId": channelId }
      : {}),
  });
  if (!event) return void res.status(404).json({ error: "Evento não encontrado." });

  const previous = (event.attendance || []).find(
    (item: any) => String(item.userId) === discordUserId,
  );

  event.attendance = (event.attendance || []).filter(
    (item: any) => String(item.userId) !== discordUserId,
  ) as any;

  if (action === "ADD") {
    event.attendance.push({
      userId: discordUserId,
      userName: discordUserName,
      status,
      note: "Resposta efetuada através do Discord.",
      respondedAt: new Date(),
    } as any);
  } else if (previous?.status !== status) {
    // Se removeu uma reação que já não era a seleção atual, preserva a atual.
    if (previous) event.attendance.push(previous as any);
  }

  await event.save();

  await AuditLog.create({
    actorId: discordUserId,
    actorName: discordUserName,
    action: action === "ADD" ? "UNIT_EVENT_ATTENDANCE_DISCORD_ADDED" : "UNIT_EVENT_ATTENDANCE_DISCORD_REMOVED",
    module: "Unidades",
    severity: "info",
    description: `${discordUserName} atualizou a presença de ${event.title} pelo Discord.`,
    targetId: String(event._id),
    targetName: event.title,
    metadata: { unitCode: event.unitCode, status, emoji, action, source: "DISCORD" },
  });

  res.json({ ok: true, eventId: event._id, status: action === "ADD" ? status : null });
});

export default router;
