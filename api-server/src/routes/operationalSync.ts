import { Router, type NextFunction, type Request, type Response } from "express";
import { DiscordOutbox, OperationalCP, OperationalPoint } from "../models/OperationalSync";
import { OperationalUser } from "../models/OperationalUser";
import { OperationalVehicle } from "../models/OperationalVehicle";
import { AuditLog } from "../models";

const router = Router();
const GUILD_ID = process.env.DISCORD_GUILD_ID || "";
const MILITAR_ROLE_ID = "1147878941974077478";
const COMMAND_GENERAL_ROLE_ID = "1147878942099906672";
const DRH_ROLE_ID =
  process.env.DRH_ROLE_ID ||
  process.env.ROLE_DRH_ID ||
  "";
const DEV_USER_ID = "713719718091030599";
const ADMIN_ROLE_IDS = [
  process.env.ROLE_ADMIN_PONTO_ID,
  COMMAND_GENERAL_ROLE_ID,
].filter(Boolean) as string[];

const POINT_SUPERVISOR_ROLE_IDS = [
  COMMAND_GENERAL_ROLE_ID,
  DRH_ROLE_ID,
].filter(Boolean) as string[];

const sessionUser = (req: Request): any => req.session?.user || null;
const userId = (req: Request) => String(sessionUser(req)?.id || "");

function roleIds(req: Request) {
  const current = sessionUser(req);
  const candidates = [current?.roles, current?.roleIds, current?.guildRoles, current?.member?.roles];
  for (const value of candidates) {
    if (!Array.isArray(value)) continue;
    return value.map((role: any) => typeof role === "string" ? role : String(role?.id || role?.roleId || "")).filter(Boolean);
  }
  return [];
}

function isAdmin(req: Request) {
  return (
    userId(req) === DEV_USER_ID ||
    ADMIN_ROLE_IDS.some(
      (roleId) =>
        roleIds(req).includes(roleId),
    )
  );
}

function canSupervisePoints(req: Request) {
  return (
    userId(req) === DEV_USER_ID ||
    POINT_SUPERVISOR_ROLE_IDS.some(
      (roleId) =>
        roleIds(req).includes(roleId),
    )
  );
}

function sessionUserName(req: Request) {
  const current = sessionUser(req);

  return (
    current?.displayName ||
    current?.global_name ||
    current?.username ||
    current?.name ||
    userId(req) ||
    "Sistema"
  );
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!userId(req)) return void res.status(401).json({ error: "É necessário iniciar sessão." });
  next();
}

function audit(
  action: string,
  byUserId: string,
  source: string,
  metadata: any = {},
) {
  return {
    action,
    byUserId:
      byUserId || "SYSTEM",
    source,
    metadata,
    createdAt:
      new Date(),
  };
}

function requestAuditMetadata(
  req: Request,
  extra: any = {},
) {
  return {
    actorName:
      sessionUserName(req),
    actorRoles:
      roleIds(req),
    ip:
      req.ip ||
      req.socket?.remoteAddress ||
      null,
    userAgent:
      req.get("user-agent") ||
      null,
    ...extra,
  };
}

type GlobalAuditInput = {
  action: string;
  module: "Ponto" | "CP" | "Discord";
  severity?: "info" | "success" | "warning" | "critical";
  description: string;
  targetId?: string | null;
  targetName?: string | null;
  metadata?: Record<string, any>;
  actorId?: string;
  actorName?: string;
  actorRank?: string | null;
  actorAvatar?: string | null;
};

async function resolveAuditActor(
  req: Request | null,
  explicitActorId?: string,
) {
  const actorId =
    String(
      explicitActorId ||
      (req ? userId(req) : "") ||
      "SYSTEM",
    );

  const operationalUser =
    actorId !== "SYSTEM"
      ? await OperationalUser.findOne({
          discordId: actorId,
        })
          .select({
            discordId: 1,
            warName: 1,
            displayName: 1,
            username: 1,
            avatarUrl: 1,
            rank: 1,
            posto: 1,
          })
          .lean()
      : null;

  const current =
    req
      ? sessionUser(req)
      : null;

  return {
    actorId,
    actorName:
      operationalUser?.warName ||
      operationalUser?.displayName ||
      current?.displayName ||
      current?.global_name ||
      current?.username ||
      operationalUser?.username ||
      (
        actorId === "SYSTEM"
          ? "Sistema"
          : actorId
      ),
    actorRank:
      operationalUser?.rank ||
      operationalUser?.posto ||
      current?.rank ||
      current?.posto ||
      current?.cargo ||
      null,
    actorAvatar:
      operationalUser?.avatarUrl ||
      null,
  };
}

async function createGlobalAudit(
  req: Request | null,
  data: GlobalAuditInput,
) {
  try {
    const actor =
      await resolveAuditActor(
        req,
        data.actorId,
      );

    await AuditLog.create({
      actorId:
        data.actorId ||
        actor.actorId,

      actorName:
        data.actorName ||
        actor.actorName,

      actorRank:
        data.actorRank ??
        actor.actorRank,

      actorAvatar:
        data.actorAvatar ??
        actor.actorAvatar,

      action:
        data.action,

      module:
        data.module,

      severity:
        data.severity ||
        "info",

      description:
        data.description,

      targetId:
        data.targetId ||
        null,

      targetName:
        data.targetName ||
        null,

      metadata: {
        ...(data.metadata ||
          {}),
      },

      ip:
        req?.ip ||
        req?.socket
          ?.remoteAddress ||
        null,

      userAgent:
        req?.get(
          "user-agent",
        ) ||
        null,
    });
  } catch (error) {
    /*
     * A auditoria global nunca pode bloquear
     * a operação principal.
     */
    console.error(
      "[GLOBAL AUDIT]",
      error,
    );
  }
}

async function getOperationalUserName(
  discordId: string,
) {
  const current =
    await OperationalUser.findOne({
      discordId:
        String(discordId),
    })
      .select({
        warName: 1,
        displayName: 1,
        username: 1,
      })
      .lean();

  return (
    current?.warName ||
    current?.displayName ||
    current?.username ||
    String(discordId)
  );
}

async function queueSync(aggregateType: "POINT" | "CP", aggregateId: any, requestedBy: string) {
  await DiscordOutbox.create({
    type: aggregateType === "POINT" ? "POINT_SYNC" : "CP_SYNC",
    aggregateType,
    aggregateId,
    guildId: GUILD_ID,
    requestedBy,
    status: "PENDING",
    attempts: 0,
    availableAt: new Date(),
  });
}

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const activeMemberIds = (cp: any) => Array.isArray(cp.members)
  ? cp.members.filter((member: any) => member.active).map((member: any) => String(member.userId))
  : [];
const allCPUserIds = (cp: any) => [...new Set([String(cp.commanderId || ""), ...activeMemberIds(cp)])].filter(Boolean);

async function currentMilitaryIds() {
  const users = await OperationalUser.find({
    isInGuild: true,
    savedTags: { $in: [MILITAR_ROLE_ID] },
  }).select({ discordId: 1, savedTags: 1 }).lean();

  return users
    .filter((item: any) => Array.isArray(item.savedTags) && item.savedTags.includes(MILITAR_ROLE_ID))
    .map((item: any) => String(item.discordId || ""))
    .filter(Boolean);
}

async function isCurrentMilitary(discordId: string) {
  if (!discordId) return false;
  const current = await OperationalUser.findOne({
    discordId: String(discordId),
    isInGuild: true,
    savedTags: { $in: [MILITAR_ROLE_ID] },
  }).select({ discordId: 1, savedTags: 1 }).lean();

  return Boolean(current && Array.isArray((current as any).savedTags) && (current as any).savedTags.includes(MILITAR_ROLE_ID));
}

async function assertMilitary(discordId: string) {
  if (await isCurrentMilitary(discordId)) return;
  const error: any = new Error("O elemento selecionado não possui atualmente a tag Guarda Nacional Republicana.");
  error.status = 400;
  throw error;
}

async function findVehicle(vehicleName: string) {
  const normalized = String(vehicleName || "").trim();
  if (!normalized) return null;
  return OperationalVehicle.findOne({
    nome: { $regex: `^${escapeRegex(normalized)}$`, $options: "i" },
    $or: [{ ativo: true }, { ativo: { $exists: false } }],
  }).lean();
}

async function findActiveCPForUser(discordId: string, ignoreCPId?: string) {
  const query: any = {
    status: "ABERTO",
    $or: [
      { commanderId: discordId },
      { members: { $elemMatch: { userId: discordId, active: true } } },
      { participants: { $regex: discordId } },
    ],
  };
  if (ignoreCPId) query._id = { $ne: ignoreCPId };
  return OperationalCP.findOne(query).lean();
}

async function ensurePointForCPUser(
  cp: any,
  targetUserId: string,
  requestedBy: string,
  req?: Request,
) {
  let point = await OperationalPoint.findOne({ userId: targetUserId, status: "ABERTO" });
  if (!point) {
    point = await OperationalPoint.create({
      userId: targetUserId,
      guildId: GUILD_ID,
      startTime: new Date(),
      status: "ABERTO",
      isPaused: false,
      totalPauseTime: 0,
      source: "CP",
      cpId: cp._id,
      descricao: `Iniciado automaticamente pela CP ${cp.number}`,
      audit: [audit("POINT_STARTED", requestedBy, "CP", { cpId: String(cp._id) })],
    });

    const targetName =
      await getOperationalUserName(
        targetUserId,
      );

    await createGlobalAudit(
      req || null,
      {
        actorId:
          requestedBy,
        action:
          "POINT_STARTED",
        module:
          "Ponto",
        severity:
          "success",
        description:
          `${targetName} iniciou o ponto automaticamente através da CP ${cp.number}.`,
        targetId:
          String(
            point._id,
          ),
        targetName,
        metadata: {
          pointId:
            String(
              point._id,
            ),
          userId:
            targetUserId,
          cpId:
            String(
              cp._id,
            ),
          cpNumber:
            cp.number,
          source:
            "CP",
          automatic:
            true,
        },
      },
    );
  } else {
    point.cpId = cp._id;
    point.audit.push(audit("POINT_LINKED_TO_CP", requestedBy, "CP", { cpId: String(cp._id) }));
    await point.save();

    const targetName =
      await getOperationalUserName(
        targetUserId,
      );

    await createGlobalAudit(
      req || null,
      {
        actorId:
          requestedBy,
        action:
          "POINT_LINKED_TO_CP",
        module:
          "Ponto",
        severity:
          "info",
        description:
          `O ponto de ${targetName} foi associado à CP ${cp.number}.`,
        targetId:
          String(
            point._id,
          ),
        targetName,
        metadata: {
          pointId:
            String(
              point._id,
            ),
          userId:
            targetUserId,
          cpId:
            String(
              cp._id,
            ),
          cpNumber:
            cp.number,
          source:
            "CP",
        },
      },
    );
  }
  await queueSync("POINT", point._id, requestedBy);
  return point;
}

async function closePointDocument(
  point: any,
  by: string,
  reason: string,
  req?: Request,
  source:
    | "SITE"
    | "CP"
    | "ADMIN" =
    "SITE",
) {
  const now = new Date();
  if (point.isPaused && point.lastPauseTime) {
    point.totalPauseTime = Number(point.totalPauseTime || 0) + now.getTime() - new Date(point.lastPauseTime).getTime();
  }
  point.status = "FECHADO";
  point.endTime = now;
  point.isPaused = false;
  point.lastPauseTime = null;
  point.closedBy = `SITE:${by}`;
  point.closeReason = reason;
  point.audit.push(audit("POINT_CLOSED", by, source, { reason }));
  await point.save();

  const targetName =
    await getOperationalUserName(
      String(
        point.userId,
      ),
    );

  await createGlobalAudit(
    req || null,
    {
      actorId:
        by,
      action:
        source === "ADMIN"
          ? "POINT_ADMIN_CLOSED"
          : "POINT_CLOSED",
      module:
        "Ponto",
      severity:
        source === "ADMIN"
          ? "warning"
          : "success",
      description:
        source === "ADMIN"
          ? `O ponto de ${targetName} foi encerrado administrativamente.`
          : `O ponto de ${targetName} foi terminado.`,
      targetId:
        String(
          point._id,
        ),
      targetName,
      metadata: {
        pointId:
          String(
            point._id,
          ),
        userId:
          String(
            point.userId,
          ),
        reason,
        source,
        startTime:
          point.startTime,
        endTime:
          point.endTime,
        totalPauseTime:
          point.totalPauseTime ||
          0,
        cpId:
          point.cpId
            ? String(
                point.cpId,
              )
            : null,
      },
    },
  );

  await queueSync("POINT", point._id, by);
  return point;
}

const canManageCP = (req: Request, cp: any) => isAdmin(req) || String(cp.commanderId || "") === userId(req);
const canCloseCP = (req: Request, cp: any) => canManageCP(req, cp) || activeMemberIds(cp).includes(userId(req));

function sendError(res: Response, error: any, fallback: string) {
  console.error("[OPERATIONAL SYNC]", error);
  res.status(Number(error?.status || 500)).json({ error: error?.message || fallback });
}


function userSummary(user: any) {
  if (!user) return null;

  return {
    id: String(user.discordId || ""),
    discordId: String(user.discordId || ""),
    name:
      user.warName ||
      user.displayName ||
      user.username ||
      String(user.discordId || ""),
    warName: user.warName || null,
    displayName: user.displayName || null,
    username: user.username || null,
    avatarUrl: user.avatarUrl || null,
    badgeNumber: user.badgeNumber || null,
    callsignNumber: user.callsignNumber || null,
  };
}

async function userMapByIds(ids: string[]) {
  const uniqueIds = [
    ...new Set(
      ids
        .map(String)
        .filter(Boolean),
    ),
  ];

  if (!uniqueIds.length) {
    return new Map<string, any>();
  }

  const users = await OperationalUser.find({
    discordId: {
      $in: uniqueIds,
    },
  })
    .select({
      discordId: 1,
      warName: 1,
      displayName: 1,
      username: 1,
      avatarUrl: 1,
      badgeNumber: 1,
      callsignNumber: 1,
    })
    .lean();

  return new Map(
    users.map((current: any) => [
      String(current.discordId),
      userSummary(current),
    ]),
  );
}


function effectivePointDurationMs(point: any, now = new Date()) {
  if (!point) return 0;
  const end = point.endTime ? new Date(point.endTime) : now;
  let paused = Number(point.totalPauseTime || 0);
  if (point.isPaused && point.lastPauseTime) {
    paused += now.getTime() - new Date(point.lastPauseTime).getTime();
  }
  return Math.max(0, end.getTime() - new Date(point.startTime).getTime() - paused);
}

function requirePointSupervisor(req: Request, res: Response, next: NextFunction) {
  if (!canSupervisePoints(req)) {
    res.status(403).json({ error: "Apenas o Comando-Geral ou o DRH pode executar esta ação." });
    return;
  }
  next();
}

async function pointWithUser(point: any) {
  const users = await userMapByIds([String(point.userId || "")]);
  return {
    ...point,
    durationMs: effectivePointDurationMs(point),
    user: users.get(String(point.userId || "")) || null,
  };
}

router.use(requireAuth);

router.get("/militares", async (_req, res) => {
  try {
    const users = await OperationalUser.find({
      isInGuild: true,
      savedTags: { $in: [MILITAR_ROLE_ID] },
    }).select({
      discordId: 1,
      warName: 1,
      displayName: 1,
      username: 1,
      avatarUrl: 1,
      badgeNumber: 1,
      callsignNumber: 1,
      savedTags: 1,
    }).sort({ warName: 1, displayName: 1, username: 1 }).lean();

    const items = users
      .filter((item: any) => item.discordId && Array.isArray(item.savedTags) && item.savedTags.includes(MILITAR_ROLE_ID))
      .map((item: any) => ({
        id: String(item.discordId),
        discordId: String(item.discordId),
        name: item.warName || item.displayName || item.username || String(item.discordId),
        warName: item.warName || null,
        displayName: item.displayName || null,
        username: item.username || null,
        avatarUrl: item.avatarUrl || null,
        badgeNumber: item.badgeNumber || null,
        callsignNumber: item.callsignNumber || null,
      }));

    res.json({ items, total: items.length, roleId: MILITAR_ROLE_ID });
  } catch (error) {
    sendError(res, error, "Não foi possível carregar os militares.");
  }
});

router.get("/vehicles", async (_req, res) => {
  try {
    const vehicles = await OperationalVehicle.find({
      $or: [{ ativo: true }, { ativo: { $exists: false } }],
    }).select({ nome: 1, categoria: 1, matricula: 1, unidade: 1 }).sort({ nome: 1 }).lean();

    const items = vehicles.map((vehicle: any) => ({
      id: String(vehicle._id),
      nome: String(vehicle.nome || "").trim(),
      categoria: vehicle.categoria || null,
      matricula: vehicle.matricula || null,
      unidade: vehicle.unidade || null,
    })).filter((vehicle) => vehicle.nome);

    res.json({ items, total: items.length });
  } catch (error) {
    sendError(res, error, "Não foi possível carregar as viaturas.");
  }
});

router.get("/me", async (req, res) => {
  try {
    const requesterId = userId(req);
    const isMilitar = await isCurrentMilitary(requesterId);
    const point = isMilitar ? await OperationalPoint.findOne({ userId: requesterId, status: "ABERTO" }).lean() : null;
    const cp = isMilitar ? await OperationalCP.findOne({
      status: "ABERTO",
      $or: [
        { commanderId: requesterId },
        { members: { $elemMatch: { userId: requesterId, active: true } } },
      ],
    }).lean() : null;

    res.json({
      point,
      cp,
      isMilitar,
      permissions: {
        canViewAllPoints:
          canSupervisePoints(req),
        canCloseOtherPoints:
          canSupervisePoints(req),
        canCreateCP:
          isMilitar,
        canCancelAnyCP:
          isAdmin(req),
        canViewFullAudit:
          canSupervisePoints(req),
      },
    });
  } catch (error) {
    sendError(res, error, "Não foi possível carregar os dados operacionais.");
  }
});

router.post("/points/start", async (req, res) => {
  try {
    const requesterId = userId(req);
    await assertMilitary(requesterId);
    const existing = await OperationalPoint.findOne({ userId: requesterId, status: "ABERTO" });
    if (existing) return void res.status(409).json({ error: "Já tens um ponto aberto.", point: existing });

    const point = await OperationalPoint.create({
      userId: requesterId,
      guildId: GUILD_ID,
      startTime: new Date(),
      status: "ABERTO",
      isPaused: false,
      totalPauseTime: 0,
      tipo: req.body?.tipo || "Normal",
      descricao: req.body?.descricao || null,
      source: "SITE",
      audit: [
        audit(
          "POINT_STARTED",
          requesterId,
          "SITE",
          requestAuditMetadata(
            req,
            {
              tipo:
                req.body?.tipo ||
                "Normal",
              descricao:
                req.body?.descricao ||
                null,
            },
          ),
        ),
      ],
    });

    const requesterName =
      await getOperationalUserName(
        requesterId,
      );

    await createGlobalAudit(
      req,
      {
        action:
          "POINT_STARTED",
        module:
          "Ponto",
        severity:
          "success",
        description:
          `${requesterName} iniciou o ponto.`,
        targetId:
          String(
            point._id,
          ),
        targetName:
          requesterName,
        metadata: {
          pointId:
            String(
              point._id,
            ),
          userId:
            requesterId,
          startTime:
            point.startTime,
          source:
            "SITE",
          tipo:
            point.tipo,
          descricao:
            point.descricao ||
            null,
        },
      },
    );

    await queueSync("POINT", point._id, requesterId);
    res.status(201).json({ point });
  } catch (error) {
    sendError(res, error, "Não foi possível iniciar o ponto.");
  }
});

router.post("/points/pause", async (req, res) => {
  try {
    const requesterId = userId(req);
    await assertMilitary(requesterId);
    const point = await OperationalPoint.findOne({ userId: requesterId, status: "ABERTO" });
    if (!point) return void res.status(404).json({ error: "Não existe ponto ativo." });
    if (point.isPaused) return void res.status(409).json({ error: "O ponto já está em pausa." });
    point.isPaused = true;
    point.lastPauseTime = new Date();
    point.audit.push(
      audit(
        "POINT_PAUSED",
        requesterId,
        "SITE",
        requestAuditMetadata(
          req,
          {
            pausedAt:
              new Date(),
          },
        ),
      ),
    );
    await point.save();

    const requesterName =
      await getOperationalUserName(
        requesterId,
      );

    await createGlobalAudit(
      req,
      {
        action:
          "POINT_PAUSED",
        module:
          "Ponto",
        severity:
          "warning",
        description:
          `${requesterName} pausou o ponto.`,
        targetId:
          String(
            point._id,
          ),
        targetName:
          requesterName,
        metadata: {
          pointId:
            String(
              point._id,
            ),
          userId:
            requesterId,
          pausedAt:
            point.lastPauseTime,
          source:
            "SITE",
        },
      },
    );

    await queueSync("POINT", point._id, requesterId);
    res.json({ point });
  } catch (error) {
    sendError(res, error, "Não foi possível pausar o ponto.");
  }
});

router.post("/points/resume", async (req, res) => {
  try {
    const requesterId = userId(req);
    await assertMilitary(requesterId);
    const point = await OperationalPoint.findOne({ userId: requesterId, status: "ABERTO" });
    if (!point || !point.isPaused || !point.lastPauseTime) return void res.status(409).json({ error: "O ponto não está em pausa." });
    point.totalPauseTime = Number(point.totalPauseTime || 0) + Date.now() - point.lastPauseTime.getTime();
    point.isPaused = false;
    point.lastPauseTime = null;
    point.audit.push(
      audit(
        "POINT_RESUMED",
        requesterId,
        "SITE",
        requestAuditMetadata(
          req,
          {
            resumedAt:
              new Date(),
          },
        ),
      ),
    );
    await point.save();

    const requesterName =
      await getOperationalUserName(
        requesterId,
      );

    await createGlobalAudit(
      req,
      {
        action:
          "POINT_RESUMED",
        module:
          "Ponto",
        severity:
          "success",
        description:
          `${requesterName} retomou o ponto.`,
        targetId:
          String(
            point._id,
          ),
        targetName:
          requesterName,
        metadata: {
          pointId:
            String(
              point._id,
            ),
          userId:
            requesterId,
          totalPauseTime:
            point.totalPauseTime ||
            0,
          source:
            "SITE",
        },
      },
    );

    await queueSync("POINT", point._id, requesterId);
    res.json({ point });
  } catch (error) {
    sendError(res, error, "Não foi possível retomar o ponto.");
  }
});

router.post("/points/close", async (req, res) => {
  try {
    const requesterId = userId(req);
    const point = await OperationalPoint.findOne({ userId: requesterId, status: "ABERTO" });
    if (!point) return void res.status(404).json({ error: "Não existe ponto ativo." });
    point.audit.push(
      audit(
        "POINT_CLOSE_REQUESTED",
        requesterId,
        "SITE",
        requestAuditMetadata(
          req,
          {
            reason:
              req.body?.reason ||
              "Terminado pelo utilizador no site",
          },
        ),
      ),
    );

    await closePointDocument(
      point,
      requesterId,
      req.body?.reason ||
        "Terminado pelo utilizador no site",
      req,
      "SITE",
    );
    res.json({ point });
  } catch (error) {
    sendError(res, error, "Não foi possível terminar o ponto.");
  }
});

router.post("/points/:id/admin-close", async (req, res) => {
  try {
    if (!canSupervisePoints(req)) {
      return void res.status(403).json({
        error:
          "Apenas o Comando-Geral ou o DRH pode fechar pontos de terceiros.",
      });
    }
    const point = await OperationalPoint.findById(req.params.id);
    if (!point || point.status !== "ABERTO") return void res.status(404).json({ error: "Ponto aberto não encontrado." });
    const reason =
      req.body?.reason ||
      "Encerrado administrativamente pelo Comando-Geral/DRH";

    point.audit.push(
      audit(
        "POINT_ADMIN_CLOSE_REQUESTED",
        userId(req),
        "ADMIN",
        requestAuditMetadata(
          req,
          {
            reason,
            targetUserId:
              String(
                point.userId,
              ),
          },
        ),
      ),
    );

    await closePointDocument(
      point,
      userId(req),
      reason,
      req,
      "ADMIN",
    );

    point.audit.push(
      audit(
        "POINT_ADMIN_CLOSED",
        userId(req),
        "ADMIN",
        requestAuditMetadata(
          req,
          {
            reason,
            targetUserId:
              String(
                point.userId,
              ),
          },
        ),
      ),
    );

    await point.save();
    res.json({ point });
  } catch (error) {
    sendError(res, error, "Não foi possível fechar o ponto.");
  }
});

router.get("/points/history", async (req, res) => {
  try {
    const items = await OperationalPoint.find({ userId: userId(req) }).sort({ startTime: -1 }).limit(100).lean();
    res.json({ items });
  } catch (error) {
    sendError(res, error, "Não foi possível carregar o histórico.");
  }
});

router.get("/points/open", async (req, res) => {
  try {
    if (!canSupervisePoints(req)) {
      return void res.status(403).json({
        error:
          "Apenas o Comando-Geral ou o DRH pode consultar todos os pontos abertos.",
      });
    }
    const militaryIds = await currentMilitaryIds();
    const points = await OperationalPoint.find({
      status: "ABERTO",
      userId: {
        $in: militaryIds,
      },
    })
      .sort({
        startTime: 1,
      })
      .lean();

    const users = await userMapByIds(
      points.map((point: any) =>
        String(point.userId),
      ),
    );

    const items = points.map((point: any) => ({
      ...point,
      user:
        users.get(
          String(point.userId),
        ) || null,
    }));

    res.json({ items });
  } catch (error) {
    sendError(res, error, "Não foi possível carregar os pontos abertos.");
  }
});

router.get("/points/:id/audit", async (req, res) => {
  try {
    const point = await OperationalPoint.findById(req.params.id).lean();
    if (!point) return void res.status(404).json({ error: "Ponto não encontrado." });
    if (
      String(point.userId) !==
        userId(req) &&
      !canSupervisePoints(req)
    ) {
      return void res.status(403).json({
        error:
          "Sem permissão para consultar esta auditoria.",
      });
    }

    const actorIds = [
      ...new Set(
        (point.audit || [])
          .map(
            (item: any) =>
              String(
                item.byUserId ||
                "",
              ),
          )
          .filter(Boolean),
      ),
    ];

    const actors =
      await userMapByIds(
        actorIds,
      );

    const items =
      (point.audit || []).map(
        (item: any) => ({
          ...item,
          actor:
            actors.get(
              String(
                item.byUserId ||
                "",
              ),
            ) || {
              discordId:
                String(
                  item.byUserId ||
                  "SYSTEM",
                ),
              name:
                item.metadata
                  ?.actorName ||
                (
                  item.byUserId ===
                  "SYSTEM"
                    ? "Sistema"
                    : String(
                        item.byUserId ||
                        "Sistema",
                      )
                ),
              avatarUrl:
                null,
            },
        }),
      );

    res.json({
      items,
      point: {
        id:
          String(
            point._id,
          ),
        userId:
          String(
            point.userId,
          ),
        status:
          point.status,
        startTime:
          point.startTime,
        endTime:
          point.endTime,
        source:
          point.source,
        closeReason:
          point.closeReason ||
          null,
        closedBy:
          point.closedBy ||
          null,
      },
      discord:
        point.discord || {},
    });
  } catch (error) {
    sendError(res, error, "Não foi possível carregar a auditoria.");
  }
});

router.get("/cps", async (req, res) => {
  try {
    const militaryIds = await currentMilitaryIds();
    const militarySet = new Set(militaryIds);
    const cps = await OperationalCP.find().sort({ startTime: -1 }).limit(200).lean();
    const referencedUserIds = cps.flatMap(
      (cp: any) => [
        String(cp.commanderId || ""),
        ...(Array.isArray(cp.members)
          ? cp.members.map((member: any) =>
              String(member.userId || ""),
            )
          : []),
      ],
    );

    const userDetails = await userMapByIds(
      referencedUserIds,
    );

    const items = cps
      .map((cp: any) => {
        const commanderId =
          cp.commanderId &&
          militarySet.has(
            String(cp.commanderId),
          )
            ? String(cp.commanderId)
            : null;

        const members = Array.isArray(cp.members)
          ? cp.members
              .filter((member: any) =>
                militarySet.has(
                  String(member.userId),
                ),
              )
              .map((member: any) => ({
                ...member,
                user:
                  userDetails.get(
                    String(member.userId),
                  ) || null,
              }))
          : [];

        return {
          ...cp,
          commanderId,
          commander:
            commanderId
              ? userDetails.get(
                  commanderId,
                ) || null
              : null,
          members,
          permissions: {
            canManage:
              canManageCP(req, cp),
            canClose:
              canCloseCP(req, cp),
            canCancel:
              isAdmin(req) ||
              String(cp.commanderId || "") ===
                userId(req),
            canViewAudit:
              isAdmin(req) ||
              allCPUserIds(cp).includes(
                userId(req),
              ),
          },
        };
      })
      .filter(
        (cp: any) =>
          Boolean(cp.commanderId) ||
          cp.members.length > 0,
      );
    res.json({ items });
  } catch (error) {
    sendError(res, error, "Não foi possível carregar as CPs.");
  }
});

router.post("/cps", async (req, res) => {
  try {
    const requesterId = userId(req);
    await assertMilitary(requesterId);

    const commanderId = String(req.body?.commanderId || requesterId);
    const memberIds = [
      ...new Set(
        (
          Array.isArray(req.body?.memberIds)
            ? req.body.memberIds
            : []
        )
          .map(String)
          .filter(Boolean),
      ),
    ];

    const commanderPatrols =
      memberIds.includes(commanderId);

    await assertMilitary(commanderId);

    for (const memberId of memberIds) {
      await assertMilitary(memberId);
    }

    if (memberIds.length < 2) {
      return void res.status(400).json({
        error: "Seleciona pelo menos dois participantes.",
      });
    }

    /*
     * O comandante ocupa a CP mesmo quando está apenas a comandar,
     * mas só abre ponto e conta horas quando commanderPatrols = true.
     */
    for (const cpUserId of [
      ...new Set([
        commanderId,
        ...memberIds,
      ]),
    ]) {
      const occupied = await findActiveCPForUser(cpUserId);

      if (occupied) {
        return void res.status(409).json({
          error: `O elemento ${cpUserId} já está na CP ${occupied.number}.`,
        });
      }
    }

    let number = String(req.body?.number || "").trim();

    if (!number) {
      const active = await OperationalCP.find({
        status: "ABERTO",
      }).select("number");

      const used = new Set(
        active.map((cp) =>
          String(cp.number).toLowerCase(),
        ),
      );

      for (let index = 1; index <= 11; index += 1) {
        if (!used.has(String(index))) {
          number = String(index);
          break;
        }
      }
    }

    if (!number) {
      return void res.status(409).json({
        error: "Todas as CP automáticas estão ocupadas.",
      });
    }

    const duplicate = await OperationalCP.findOne({
      guildId: GUILD_ID,
      number: {
        $regex: `^${escapeRegex(number)}$`,
        $options: "i",
      },
      status: "ABERTO",
    }).lean();

    if (duplicate) {
      return void res.status(409).json({
        error: `A CP ${number} já está em uso.`,
      });
    }

    const selectedVehicle = await findVehicle(
      req.body?.vehicle,
    );

    if (!selectedVehicle) {
      return void res.status(400).json({
        error: "A viatura selecionada não existe ou está desativada.",
      });
    }

    const patrolMemberIds = [
      ...new Set(memberIds),
    ];

    const cp = await OperationalCP.create({
      number,
      guildId: GUILD_ID,
      commanderId,
      commanderPatrols,

      members: patrolMemberIds.map((memberId) => ({
        userId: memberId,
        joinedAt: new Date(),
        active: true,
        role:
          memberId === commanderId
            ? "COMMANDER_PATROL"
            : "MEMBER",
      })),

      participants: patrolMemberIds
        .map((memberId) => `<@${memberId}>`)
        .join(" "),

      vehicle: selectedVehicle.nome,
      zone: String(req.body?.zone || "").trim() || null,
      patrolType: String(req.body?.patrolType || "Patrulha").trim(),
      observations: String(req.body?.observations || "").trim() || null,
      status: "ABERTO",
      startTime: new Date(),
      source: "SITE",

      audit: [
        audit(
          "CP_CREATED",
          requesterId,
          "SITE",
          {
            commanderId,
            commanderPatrols,
            memberIds,
            patrolMemberIds,
            vehicle: selectedVehicle.nome,
          },
        ),
      ],
    });

    /*
     * Só os patrulheiros recebem ponto.
     * Comandante sem patrulhar não entra em cp.members e não conta horas.
     */
    for (const member of cp.members) {
      const point = await ensurePointForCPUser(
        cp,
        String(member.userId),
        requesterId,
        req,
      );

      member.pointId = point._id;
    }

    await cp.save();

    const commanderName =
      await getOperationalUserName(
        commanderId,
      );

    await createGlobalAudit(
      req,
      {
        action:
          "CP_CREATED",
        module:
          "CP",
        severity:
          "success",
        description:
          `A CP ${cp.number} foi criada com ${commanderName} como comandante.`,
        targetId:
          String(
            cp._id,
          ),
        targetName:
          `CP ${cp.number}`,
        metadata: {
          cpId:
            String(
              cp._id,
            ),
          cpNumber:
            cp.number,
          commanderId,
          commanderName,
          commanderPatrols,
          memberIds:
            patrolMemberIds,
          vehicle:
            cp.vehicle,
          zone:
            cp.zone,
          source:
            "SITE",
        },
      },
    );

    await queueSync("CP", cp._id, requesterId);

    res.status(201).json({
      cp,
    });
  } catch (error) {
    sendError(
      res,
      error,
      "Não foi possível criar a CP.",
    );
  }
});

router.patch("/cps/:id/vehicle", async (req, res) => {
  try {
    const cp = await OperationalCP.findById(req.params.id);
    if (!cp || cp.status !== "ABERTO") return void res.status(404).json({ error: "CP aberta não encontrada." });
    if (!canManageCP(req, cp)) return void res.status(403).json({ error: "Apenas o comandante da CP ou o Comando-Geral pode alterar a viatura." });
    const vehicle = await findVehicle(req.body?.vehicle);
    if (!vehicle) return void res.status(400).json({ error: "A viatura selecionada não existe ou está desativada." });
    const previous = cp.vehicle;
    cp.vehicle = vehicle.nome;
    cp.audit.push(
      audit(
        "CP_VEHICLE_CHANGED",
        userId(req),
        "SITE",
        requestAuditMetadata(
          req,
          {
            previous,
            next:
              vehicle.nome,
          },
        ),
      ),
    );
    await cp.save();

    await createGlobalAudit(
      req,
      {
        action:
          "CP_VEHICLE_CHANGED",
        module:
          "CP",
        severity:
          "info",
        description:
          `A viatura da CP ${cp.number} foi alterada de ${previous} para ${vehicle.nome}.`,
        targetId:
          String(
            cp._id,
          ),
        targetName:
          `CP ${cp.number}`,
        metadata: {
          cpId:
            String(
              cp._id,
            ),
          cpNumber:
            cp.number,
          previous,
          next:
            vehicle.nome,
          source:
            "SITE",
        },
      },
    );

    await queueSync("CP", cp._id, userId(req));
    res.json({ cp });
  } catch (error) {
    sendError(res, error, "Não foi possível alterar a viatura.");
  }
});

router.patch("/cps/:id/zone", async (req, res) => {
  try {
    const cp = await OperationalCP.findById(req.params.id);
    if (!cp || cp.status !== "ABERTO") return void res.status(404).json({ error: "CP aberta não encontrada." });
    if (!canManageCP(req, cp)) return void res.status(403).json({ error: "Apenas o comandante da CP ou o Comando-Geral pode alterar a zona." });
    const previous = cp.zone || null;
    cp.zone = String(req.body?.zone || "").trim() || null;
    cp.audit.push(
      audit(
        "CP_ZONE_CHANGED",
        userId(req),
        "SITE",
        requestAuditMetadata(
          req,
          {
            previous,
            next:
              cp.zone,
          },
        ),
      ),
    );
    await cp.save();

    await createGlobalAudit(
      req,
      {
        action:
          "CP_ZONE_CHANGED",
        module:
          "CP",
        severity:
          "info",
        description:
          `A zona da CP ${cp.number} foi alterada.`,
        targetId:
          String(
            cp._id,
          ),
        targetName:
          `CP ${cp.number}`,
        metadata: {
          cpId:
            String(
              cp._id,
            ),
          cpNumber:
            cp.number,
          previous,
          next:
            cp.zone,
          source:
            "SITE",
        },
      },
    );

    await queueSync("CP", cp._id, userId(req));
    res.json({ cp });
  } catch (error) {
    sendError(res, error, "Não foi possível alterar a zona.");
  }
});

router.patch("/cps/:id/commander", async (req, res) => {
  try {
    const cp = await OperationalCP.findById(
      req.params.id,
    );

    if (!cp || cp.status !== "ABERTO") {
      return void res.status(404).json({
        error: "CP aberta não encontrada.",
      });
    }

    if (!canManageCP(req, cp)) {
      return void res.status(403).json({
        error: "Sem permissão para trocar o comandante.",
      });
    }

    const nextCommanderId = String(
      req.body?.commanderId || "",
    );

    const nextCommanderPatrols =
      cp.members.some(
        (member: any) =>
          String(member.userId) ===
            nextCommanderId &&
          member.active,
      );

    await assertMilitary(nextCommanderId);

    const occupied = await findActiveCPForUser(
      nextCommanderId,
      String(cp._id),
    );

    if (occupied) {
      return void res.status(409).json({
        error: `O novo comandante já está na CP ${occupied.number}.`,
      });
    }

    const previousCommanderId = String(
      cp.commanderId || "",
    );

    const previousCommanderPatrols = Boolean(
      cp.commanderPatrols,
    );

    /*
     * O comandante anterior só continua a patrulhar se já estava
     * efetivamente como patrulheiro. Caso contrário, deixa apenas
     * a função de comandante sem ser transformado em participante.
     */
    const previousMember = cp.members.find(
      (member: any) =>
        String(member.userId) === previousCommanderId &&
        member.active,
    );

    if (
      previousMember &&
      previousCommanderId !== nextCommanderId
    ) {
      previousMember.role = "MEMBER";
    }

    /*
     * Remove o novo comandante da lista de patrulheiros quando
     * ficará apenas em comando.
     */
    const nextMember = cp.members.find(
      (member: any) =>
        String(member.userId) === nextCommanderId &&
        member.active,
    );

    if (nextCommanderPatrols) {
      if (nextMember) {
        nextMember.role = "COMMANDER_PATROL";
      } else {
        const point = await ensurePointForCPUser(
          cp,
          nextCommanderId,
          userId(req),
          req,
        );

        cp.members.push({
          userId: nextCommanderId,
          joinedAt: new Date(),
          leftAt: null,
          active: true,
          role: "COMMANDER_PATROL",
          pointId: point._id,
        });
      }
    } else if (nextMember) {
      nextMember.active = false;
      nextMember.leftAt = new Date();

      const point = await OperationalPoint.findOne({
        userId: nextCommanderId,
        status: "ABERTO",
        cpId: cp._id,
      });

      if (point) {
        await closePointDocument(
          point,
          userId(req),
          `Assumiu apenas o comando da CP ${cp.number}`,
          req,
          "CP",
        );
      }
    }

    cp.commanderId = nextCommanderId;
    cp.commanderPatrols = nextCommanderPatrols;

    cp.participants = activeMemberIds(cp)
      .map((memberId) => `<@${memberId}>`)
      .join(" ");

    cp.audit.push(
      audit(
        "CP_COMMANDER_CHANGED",
        userId(req),
        "SITE",
        {
          previous: previousCommanderId,
          next: nextCommanderId,
          previousCommanderPatrols,
          nextCommanderPatrols,
        },
      ),
    );

    await cp.save();

    const previousCommanderName =
      previousCommanderId
        ? await getOperationalUserName(
            previousCommanderId,
          )
        : "Sem comandante";

    const nextCommanderName =
      await getOperationalUserName(
        nextCommanderId,
      );

    await createGlobalAudit(
      req,
      {
        action:
          "CP_COMMANDER_CHANGED",
        module:
          "CP",
        severity:
          "warning",
        description:
          `O comandante da CP ${cp.number} foi alterado de ${previousCommanderName} para ${nextCommanderName}.`,
        targetId:
          String(
            cp._id,
          ),
        targetName:
          `CP ${cp.number}`,
        metadata: {
          cpId:
            String(
              cp._id,
            ),
          cpNumber:
            cp.number,
          previousCommanderId,
          previousCommanderName,
          nextCommanderId,
          nextCommanderName,
          previousCommanderPatrols,
          nextCommanderPatrols,
          source:
            "SITE",
        },
      },
    );

    await queueSync(
      "CP",
      cp._id,
      userId(req),
    );

    res.json({
      cp,
    });
  } catch (error) {
    sendError(
      res,
      error,
      "Não foi possível trocar o comandante.",
    );
  }
});

router.post("/cps/:id/members", async (req, res) => {
  try {
    const cp = await OperationalCP.findById(req.params.id);
    if (!cp || cp.status !== "ABERTO") return void res.status(404).json({ error: "CP aberta não encontrada." });
    if (!canManageCP(req, cp)) return void res.status(403).json({ error: "Sem permissão para adicionar participantes." });
    const memberId = String(req.body?.memberId || "");
    await assertMilitary(memberId);
    if (memberId === String(cp.commanderId || "")) return void res.status(400).json({ error: "O comandante já pertence à CP." });
    const occupied = await findActiveCPForUser(memberId, String(cp._id));
    if (occupied) return void res.status(409).json({ error: `O militar já está na CP ${occupied.number}.` });

    const point = await ensurePointForCPUser(cp, memberId, userId(req), req);
    const existing = cp.members.find((member: any) => String(member.userId) === memberId);
    if (existing) { existing.active = true; existing.joinedAt = new Date(); existing.leftAt = null; existing.pointId = point._id; }
    else cp.members.push({ userId: memberId, joinedAt: new Date(), leftAt: null, active: true, pointId: point._id });

    cp.participants = activeMemberIds(cp).map((id) => `<@${id}>`).join(" ");
    cp.audit.push(
      audit(
        "CP_MEMBER_ADDED",
        userId(req),
        "SITE",
        requestAuditMetadata(
          req,
          {
            memberId,
          },
        ),
      ),
    );
    await cp.save();

    const memberName =
      await getOperationalUserName(
        memberId,
      );

    await createGlobalAudit(
      req,
      {
        action:
          "CP_MEMBER_ADDED",
        module:
          "CP",
        severity:
          "success",
        description:
          `${memberName} foi adicionado à CP ${cp.number}.`,
        targetId:
          String(
            cp._id,
          ),
        targetName:
          `CP ${cp.number}`,
        metadata: {
          cpId:
            String(
              cp._id,
            ),
          cpNumber:
            cp.number,
          memberId,
          memberName,
          source:
            "SITE",
        },
      },
    );

    await queueSync("CP", cp._id, userId(req));
    res.json({ cp });
  } catch (error) {
    sendError(res, error, "Não foi possível adicionar o participante.");
  }
});

router.delete("/cps/:id/members/:memberId", async (req, res) => {
  try {
    const cp = await OperationalCP.findById(req.params.id);
    if (!cp || cp.status !== "ABERTO") return void res.status(404).json({ error: "CP aberta não encontrada." });
    if (!canManageCP(req, cp)) return void res.status(403).json({ error: "Sem permissão para remover participantes." });
    const memberId = String(req.params.memberId);
    const member = cp.members.find((item: any) => String(item.userId) === memberId && item.active);
    if (!member) return void res.status(404).json({ error: "Participante ativo não encontrado." });

    member.active = false;
    member.leftAt = new Date();
    const point = await OperationalPoint.findOne({ userId: memberId, status: "ABERTO", cpId: cp._id });
    if (point) {
      await closePointDocument(
        point,
        userId(req),
        `Removido da CP ${cp.number}`,
        req,
        "CP",
      );
    }
    cp.participants = activeMemberIds(cp).map((id) => `<@${id}>`).join(" ");
    cp.audit.push(
      audit(
        "CP_MEMBER_REMOVED",
        userId(req),
        "SITE",
        requestAuditMetadata(
          req,
          {
            memberId,
          },
        ),
      ),
    );
    await cp.save();

    const memberName =
      await getOperationalUserName(
        memberId,
      );

    await createGlobalAudit(
      req,
      {
        action:
          "CP_MEMBER_REMOVED",
        module:
          "CP",
        severity:
          "warning",
        description:
          `${memberName} foi removido da CP ${cp.number}.`,
        targetId:
          String(
            cp._id,
          ),
        targetName:
          `CP ${cp.number}`,
        metadata: {
          cpId:
            String(
              cp._id,
            ),
          cpNumber:
            cp.number,
          memberId,
          memberName,
          source:
            "SITE",
        },
      },
    );

    await queueSync("CP", cp._id, userId(req));
    res.json({ cp });
  } catch (error) {
    sendError(res, error, "Não foi possível remover o participante.");
  }
});

router.get("/cps/:id/audit", async (req, res) => {
  try {
    const cp = await OperationalCP.findById(req.params.id).lean();
    if (!cp) return void res.status(404).json({ error: "CP não encontrada." });
    if (!isAdmin(req) && !allCPUserIds(cp).includes(userId(req))) return void res.status(403).json({ error: "Sem permissão para consultar esta auditoria." });
    const actorIds = [
      ...new Set(
        (cp.audit || [])
          .map(
            (item: any) =>
              String(
                item.byUserId ||
                "",
              ),
          )
          .filter(Boolean),
      ),
    ];

    const actors =
      await userMapByIds(
        actorIds,
      );

    const items =
      (cp.audit || []).map(
        (item: any) => ({
          ...item,
          actor:
            actors.get(
              String(
                item.byUserId ||
                "",
              ),
            ) || {
              discordId:
                String(
                  item.byUserId ||
                  "SYSTEM",
                ),
              name:
                item.metadata
                  ?.actorName ||
                (
                  item.byUserId ===
                  "SYSTEM"
                    ? "Sistema"
                    : String(
                        item.byUserId ||
                        "Sistema",
                      )
                ),
              avatarUrl:
                null,
            },
        }),
      );

    res.json({
      items,
      members:
        cp.members || [],
      cp: {
        id:
          String(
            cp._id,
          ),
        number:
          cp.number,
        status:
          cp.status,
        commanderId:
          cp.commanderId,
        vehicle:
          cp.vehicle,
        zone:
          cp.zone,
        startTime:
          cp.startTime,
        endTime:
          cp.endTime,
        source:
          cp.source,
      },
      discord:
        cp.discord || {},
    });
  } catch (error) {
    sendError(res, error, "Não foi possível carregar a auditoria da CP.");
  }
});

router.post("/cps/:id/close", async (req, res) => {
  try {
    const cp = await OperationalCP.findById(req.params.id);
    if (!cp || cp.status !== "ABERTO") return void res.status(404).json({ error: "CP aberta não encontrada." });
    if (!canCloseCP(req, cp)) return void res.status(403).json({ error: "Sem permissão para fechar esta CP." });
    const cancel = Boolean(req.body?.cancel);
    if (cancel && !isAdmin(req) && String(cp.commanderId || "") !== userId(req)) return void res.status(403).json({ error: "Apenas o comandante da CP ou o Comando-Geral pode cancelar a CP." });

    const now = new Date();
    for (const targetUserId of allCPUserIds(cp)) {
      const point = await OperationalPoint.findOne({ userId: targetUserId, status: "ABERTO", cpId: cp._id });
      if (point) {
        await closePointDocument(
          point,
          userId(req),
          `CP ${cp.number} ${cancel ? "cancelada" : "fechada"}`,
          req,
          "CP",
        );
      }
    }
    for (const member of cp.members.filter((item: any) => item.active)) { member.active = false; member.leftAt = now; }
    cp.status = cancel ? "CANCELADO" : "FECHADO";
    cp.endTime = now;
    cp.participants = "";
    cp.audit.push(
      audit(
        cancel
          ? "CP_CANCELLED"
          : "CP_CLOSED",
        userId(req),
        "SITE",
        requestAuditMetadata(
          req,
          {
            reason:
              req.body?.reason ||
              null,
            cancel,
          },
        ),
      ),
    );
    await cp.save();

    await createGlobalAudit(
      req,
      {
        action:
          cancel
            ? "CP_CANCELLED"
            : "CP_CLOSED",
        module:
          "CP",
        severity:
          cancel
            ? "warning"
            : "success",
        description:
          cancel
            ? `A CP ${cp.number} foi cancelada.`
            : `A CP ${cp.number} foi fechada.`,
        targetId:
          String(
            cp._id,
          ),
        targetName:
          `CP ${cp.number}`,
        metadata: {
          cpId:
            String(
              cp._id,
            ),
          cpNumber:
            cp.number,
          cancel,
          reason:
            req.body?.reason ||
            null,
          vehicle:
            cp.vehicle,
          zone:
            cp.zone,
          endTime:
            cp.endTime,
          source:
            "SITE",
        },
      },
    );

    await queueSync("CP", cp._id, userId(req));
    res.json({ cp });
  } catch (error) {
    sendError(res, error, "Não foi possível encerrar a CP.");
  }
});


/* ============================================================
 * GESTÃO ADMINISTRATIVA DE PONTOS E PAINEL DE ERROS
 * Reservado ao Comando-Geral e DRH.
 * ============================================================ */

router.get("/admin/points", requirePointSupervisor, async (req, res) => {
  try {
    const status = String(req.query.status || "ALL").toUpperCase();
    const queryText = String(req.query.q || "").trim().toLowerCase();
    const limit = Math.min(Number(req.query.limit || 200), 500);

    const mongoQuery: any = {};
    if (status === "ABERTO") mongoQuery.status = "ABERTO";
    if (status === "FECHADO") mongoQuery.status = "FECHADO";
    if (status === "PAUSADO") {
      mongoQuery.status = "ABERTO";
      mongoQuery.isPaused = true;
    }

    const points = await OperationalPoint.find(mongoQuery)
      .sort({ status: 1, startTime: -1 })
      .limit(limit)
      .lean();

    const userIds = points.map((point: any) => String(point.userId || ""));
    const users = await userMapByIds(userIds);

    const items = points
      .map((point: any) => {
        const user = users.get(String(point.userId || "")) || null;
        return {
          ...point,
          user,
          durationMs: effectivePointDurationMs(point),
          canAdminClose: point.status === "ABERTO",
        };
      })
      .filter((point: any) => {
        if (!queryText) return true;
        const searchable = [
          point.userId,
          point.user?.name,
          point.user?.warName,
          point.user?.displayName,
          point.user?.username,
          point.user?.badgeNumber,
          point.user?.callsignNumber,
          point.status,
          point.source,
          point.closeReason,
        ].filter(Boolean).join(" ").toLowerCase();
        return searchable.includes(queryText);
      });

    res.json({ items, total: items.length });
  } catch (error) {
    sendError(res, error, "Não foi possível carregar os pontos administrativos.");
  }
});

router.get("/admin/points/:id", requirePointSupervisor, async (req, res) => {
  try {
    const point = await OperationalPoint.findById(req.params.id).lean();
    if (!point) return void res.status(404).json({ error: "Ponto não encontrado." });
    res.json({ point: await pointWithUser(point) });
  } catch (error) {
    sendError(res, error, "Não foi possível carregar o ponto.");
  }
});

router.post("/admin/points/:id/close", requirePointSupervisor, async (req, res) => {
  try {
    const reason = String(req.body?.reason || "").trim();
    if (reason.length < 3) {
      return void res.status(400).json({ error: "Indica um motivo para fechar o ponto." });
    }

    const point = await OperationalPoint.findById(req.params.id);
    if (!point || point.status !== "ABERTO") {
      return void res.status(404).json({ error: "Ponto aberto não encontrado." });
    }

    point.audit.push(
      audit("POINT_ADMIN_CLOSE_REQUESTED", userId(req), "ADMIN", requestAuditMetadata(req, {
        reason,
        targetUserId: String(point.userId),
      })),
    );

    await closePointDocument(point, userId(req), reason, req, "ADMIN");

    res.json({ point: await pointWithUser(point.toObject ? point.toObject() : point) });
  } catch (error) {
    sendError(res, error, "Não foi possível fechar o ponto.");
  }
});

router.patch("/admin/points/:id/times", requirePointSupervisor, async (req, res) => {
  try {
    const reason = String(req.body?.reason || "").trim();
    if (reason.length < 3) {
      return void res.status(400).json({ error: "Indica o motivo da correção." });
    }

    const point = await OperationalPoint.findById(req.params.id);
    if (!point) return void res.status(404).json({ error: "Ponto não encontrado." });

    const previous = {
      startTime: point.startTime,
      endTime: point.endTime,
      status: point.status,
      isPaused: point.isPaused,
      totalPauseTime: point.totalPauseTime,
    };

    const nextStart = req.body?.startTime ? new Date(req.body.startTime) : null;
    const nextEnd = req.body?.endTime ? new Date(req.body.endTime) : null;

    if (nextStart && Number.isNaN(nextStart.getTime())) {
      return void res.status(400).json({ error: "Data de entrada inválida." });
    }
    if (nextEnd && Number.isNaN(nextEnd.getTime())) {
      return void res.status(400).json({ error: "Data de saída inválida." });
    }
    if (nextStart && nextEnd && nextEnd.getTime() <= nextStart.getTime()) {
      return void res.status(400).json({ error: "A saída tem de ser posterior à entrada." });
    }

    if (nextStart) point.startTime = nextStart;
    if ("endTime" in (req.body || {})) {
      point.endTime = nextEnd;
      if (nextEnd) {
        point.status = "FECHADO";
        point.isPaused = false;
        point.lastPauseTime = null;
        point.closedBy = `ADMIN:${userId(req)}`;
        point.closeReason = reason;
      } else {
        point.status = "ABERTO";
      }
    }

    point.audit.push(audit("POINT_TIME_CORRECTED", userId(req), "ADMIN", requestAuditMetadata(req, {
      reason,
      previous,
      next: {
        startTime: point.startTime,
        endTime: point.endTime,
        status: point.status,
        isPaused: point.isPaused,
        totalPauseTime: point.totalPauseTime,
      },
    })));

    await point.save();

    const targetName = await getOperationalUserName(String(point.userId));
    await createGlobalAudit(req, {
      action: "POINT_TIME_CORRECTED",
      module: "Ponto",
      severity: "warning",
      description: `${sessionUserName(req)} corrigiu os horários do ponto de ${targetName}.`,
      targetId: String(point._id),
      targetName,
      metadata: {
        pointId: String(point._id),
        userId: String(point.userId),
        reason,
        previous,
        next: {
          startTime: point.startTime,
          endTime: point.endTime,
          status: point.status,
        },
      },
    });

    await queueSync("POINT", point._id, userId(req));
    res.json({ point: await pointWithUser(point.toObject ? point.toObject() : point) });
  } catch (error) {
    sendError(res, error, "Não foi possível corrigir o ponto.");
  }
});

router.get("/admin/outbox", requirePointSupervisor, async (req, res) => {
  try {
    const status = String(req.query.status || "ALL").toUpperCase();
    const type = String(req.query.type || "ALL").toUpperCase();
    const query: any = {};
    if (status !== "ALL") query.status = status;
    if (["POINT_SYNC", "CP_SYNC"].includes(type)) query.type = type;

    const jobs = await DiscordOutbox.find(query)
      .sort({ status: 1, availableAt: 1, createdAt: -1 })
      .limit(250)
      .lean();

    const pointIds = jobs.filter((job: any) => job.aggregateType === "POINT").map((job: any) => job.aggregateId);
    const cpIds = jobs.filter((job: any) => job.aggregateType === "CP").map((job: any) => job.aggregateId);

    const points = await OperationalPoint.find({ _id: { $in: pointIds } }).lean();
    const cps = await OperationalCP.find({ _id: { $in: cpIds } }).lean();
    const pointMap = new Map(points.map((point: any) => [String(point._id), point]));
    const cpMap = new Map(cps.map((cp: any) => [String(cp._id), cp]));

    const users = await userMapByIds(points.map((point: any) => String(point.userId || "")));

    const items = jobs.map((job: any) => {
      const aggregate = job.aggregateType === "POINT"
        ? pointMap.get(String(job.aggregateId))
        : cpMap.get(String(job.aggregateId));
      const user = aggregate?.userId ? users.get(String(aggregate.userId)) || null : null;
      return {
        ...job,
        aggregate: aggregate ? {
          id: String(aggregate._id),
          type: job.aggregateType,
          label: job.aggregateType === "POINT"
            ? `Ponto de ${user?.name || aggregate.userId}`
            : `CP ${aggregate.number}`,
          status: aggregate.status,
          jumpUrl: aggregate.discord?.publicJumpUrl || aggregate.discord?.jumpUrl || null,
        } : null,
      };
    });

    res.json({ items, total: items.length });
  } catch (error) {
    sendError(res, error, "Não foi possível carregar o painel de erros.");
  }
});

router.post("/admin/outbox/:id/retry", requirePointSupervisor, async (req, res) => {
  try {
    const job = await DiscordOutbox.findById(req.params.id);
    if (!job) return void res.status(404).json({ error: "Tarefa não encontrada." });

    const previous = { status: job.status, attempts: job.attempts, lastError: job.lastError };
    job.status = "PENDING";
    job.lockedAt = null;
    job.availableAt = new Date();
    job.lastError = null;
    await job.save();

    await createGlobalAudit(req, {
      action: "OUTBOX_RETRIED",
      module: "Discord",
      severity: "warning",
      description: `${sessionUserName(req)} colocou uma tarefa de sincronização novamente em fila.`,
      targetId: String(job._id),
      targetName: `${job.type} ${job.aggregateId}`,
      metadata: { previous, next: { status: job.status, attempts: job.attempts }, jobId: String(job._id) },
    });

    res.json({ job });
  } catch (error) {
    sendError(res, error, "Não foi possível tentar novamente.");
  }
});

router.post("/admin/outbox/:id/cancel", requirePointSupervisor, async (req, res) => {
  try {
    const job = await DiscordOutbox.findById(req.params.id);
    if (!job) return void res.status(404).json({ error: "Tarefa não encontrada." });
    job.status = "CANCELLED";
    job.lockedAt = null;
    job.lastError = req.body?.reason || "Cancelada manualmente";
    await job.save();

    await createGlobalAudit(req, {
      action: "OUTBOX_CANCELLED",
      module: "Discord",
      severity: "critical",
      description: `${sessionUserName(req)} cancelou uma tarefa de sincronização.`,
      targetId: String(job._id),
      targetName: `${job.type} ${job.aggregateId}`,
      metadata: { jobId: String(job._id), reason: job.lastError },
    });

    res.json({ job });
  } catch (error) {
    sendError(res, error, "Não foi possível cancelar a tarefa.");
  }
});

router.post("/admin/outbox/clean", requirePointSupervisor, async (req, res) => {
  try {
    const days = Math.max(Number(req.body?.days || 7), 1);
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const result = await DiscordOutbox.deleteMany({ status: "DONE", updatedAt: { $lt: cutoff } });

    await createGlobalAudit(req, {
      action: "OUTBOX_DONE_CLEANED",
      module: "Discord",
      severity: "info",
      description: `${sessionUserName(req)} limpou tarefas concluídas antigas.`,
      metadata: { deletedCount: result.deletedCount || 0, cutoff, days },
    });

    res.json({ ok: true, deletedCount: result.deletedCount || 0 });
  } catch (error) {
    sendError(res, error, "Não foi possível limpar tarefas concluídas.");
  }
});

export default router;
