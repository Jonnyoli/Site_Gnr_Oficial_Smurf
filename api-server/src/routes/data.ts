import { Router } from "express";
import { User, Ponto, CP, Ticket, SystemData } from "../models";
import path from "path";
import fs from "fs";
import express from "express";
import { getHighestRankMeta } from "../lib/ranks";
import { createAuditLog } from "../lib/audit";

const router = Router();

const GNR_ROLE_ID = "1147878941974077478";

const PROMOCOES_CHANNEL_ID =
  process.env["DISCORD_PROMOCOES_CHANNEL_ID"] || "1229940972134207498";

const REGISTO_INTERNO_CHANNEL_ID =
  process.env["DISCORD_REGISTO_INTERNO_CHANNEL_ID"] || "1229284521963290716";

const CAREER_CHANNELS = [
  {
    id: PROMOCOES_CHANNEL_ID,
    name: "Canal de promoções",
    sourceType: "PROMOCOES" as const,
  },
  {
    id: REGISTO_INTERNO_CHANNEL_ID,
    name: "Canal de registo interno",
    sourceType: "REGISTO_INTERNO" as const,
  },
];

const AUDIT_LOG_MEMBER_ROLE_UPDATE = 25;

const TRANSCRIPTS_PATH = path.join(process.cwd(), "../public/transcripts");
const LEGACY_TRANSCRIPTS_PATH = path.join(
  process.cwd(),
  "../../public/transcripts",
);

type DiscordRole = {
  id: string;
  name: string;
  color?: number;
};

type DiscordMember = {
  user?: {
    id: string;
    username?: string;
    global_name?: string | null;
    avatar?: string | null;
  };
  nick?: string | null;
  roles?: string[];
  joined_at?: string;
};

type DiscordMessage = {
  id: string;
  content: string;
  timestamp: string;
  author?: {
    id: string;
    username?: string;
  };
};

type CareerSourceType = "PROMOCOES" | "REGISTO_INTERNO" | "AUDIT_LOG";

type CarreiraTipo =
  | "PROMOCAO"
  | "DESPROMOCAO"
  | "MEDALHA"
  | "ENTRADA_UNIDADE"
  | "SAIDA_UNIDADE"
  | "CARGO_ADICIONADO"
  | "CARGO_REMOVIDO"
  | "CARGO";

type CarreiraEvent = {
  id: string;
  userId: string;
  roleId: string;
  roleName: string;
  tipo: CarreiraTipo;
  categoria: string;
  data: string;
  messageId?: string;
  channelId?: string;
  auditLogId?: string;
  origem: string;
  sourceType: CareerSourceType;
  actorId?: string | null;
  actorName?: string | null;
};

let discordRolesCache: DiscordRole[] = [];
let discordRolesCacheAt = 0;

let discordMembersCache: DiscordMember[] = [];
let discordMembersCacheAt = 0;
let lastMembersFetchSucceeded = false;

/*
 * A carreira é uma das rotas mais pesadas:
 * lê mensagens de canais e Audit Log do Discord.
 * Guardamos o resultado durante 2 minutos.
 */
let careerResponseCache: CarreiraEvent[] = [];
let careerResponseCacheAt = 0;
const CAREER_RESPONSE_TTL_MS =
  2 * 60 * 1000;

function getDiscordToken() {
  return process.env["DISCORD_TOKEN"] || process.env["TOKEN"];
}

function getDiscordGuildId() {
  return (
    process.env["DISCORD_GUILD_ID"] ||
    process.env["GUILD_ID"] ||
    process.env["GUILD_IDS"]?.split(",")[0]?.trim()
  );
}

function getDiscordAvatarUrl(userId?: string, avatar?: string | null) {
  if (!userId || !avatar) return null;

  const extension = avatar.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${userId}/${avatar}.${extension}`;
}

function ensureTranscriptsFolder() {
  if (!fs.existsSync(TRANSCRIPTS_PATH)) {
    fs.mkdirSync(TRANSCRIPTS_PATH, { recursive: true });
  }
}

function sanitizeFileName(fileName: string) {
  return path
    .basename(fileName)
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "-")
    .replace(/\s+/g, "_")
    .trim();
}

function isAllowedArchiveFileName(fileName: string) {
  return /\.(html?|txt|md|json|pdf)$/i.test(fileName);
}

function getTranscriptUrl(transcriptPath?: string | null) {
  if (!transcriptPath) return null;

  const safeFileName = sanitizeFileName(transcriptPath);
  const baseUrl = process.env["API_URL"] || "http://localhost:3000";

  return `${baseUrl}/transcripts/${encodeURIComponent(safeFileName)}`;
}

async function getDiscordRoles(): Promise<DiscordRole[]> {
  const now = Date.now();

  if (
    discordRolesCache.length > 0 &&
    now - discordRolesCacheAt < 5 * 60 * 1000
  ) {
    return discordRolesCache;
  }

  const token = getDiscordToken();
  const guildId = getDiscordGuildId();

  if (!token || !guildId) {
    console.warn(
      "[DISCORD ROLES] TOKEN/DISCORD_TOKEN ou GUILD_ID/DISCORD_GUILD_ID em falta no .env.",
    );
    return [];
  }

  try {
    const response = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/roles`,
      {
        headers: {
          Authorization: `Bot ${token}`,
        },
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(
        "[DISCORD ROLES] Erro ao buscar cargos:",
        response.status,
        errorText,
      );
      return [];
    }

    const roles = await response.json();

    discordRolesCache = Array.isArray(roles) ? roles : [];
    discordRolesCacheAt = now;

    console.log(`[DISCORD ROLES] ${discordRolesCache.length} cargos carregados.`);

    return discordRolesCache;
  } catch (error: any) {
    console.warn("[DISCORD ROLES] Falha ao buscar cargos:", error.message);
    return [];
  }
}

async function getDiscordMembers(): Promise<DiscordMember[]> {
  const now = Date.now();

  if (
    discordMembersCache.length > 0 &&
    now - discordMembersCacheAt < 60 * 1000
  ) {
    lastMembersFetchSucceeded = true;
    return discordMembersCache;
  }

  const token = getDiscordToken();
  const guildId = getDiscordGuildId();

  if (!token || !guildId) {
    console.warn(
      "[DISCORD MEMBERS] TOKEN/DISCORD_TOKEN ou GUILD_ID/DISCORD_GUILD_ID em falta no .env.",
    );
    lastMembersFetchSucceeded = false;
    return [];
  }

  try {
    const allMembers: DiscordMember[] = [];
    let after = "0";

    while (true) {
      const url = new URL(
        `https://discord.com/api/v10/guilds/${guildId}/members`,
      );
      url.searchParams.set("limit", "1000");
      url.searchParams.set("after", after);

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bot ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(
          "[DISCORD MEMBERS] Erro ao buscar membros:",
          response.status,
          errorText,
        );
        lastMembersFetchSucceeded = false;
        return [];
      }

      const batch = await response.json();

      if (!Array.isArray(batch) || batch.length === 0) break;

      allMembers.push(...batch);

      const last = batch[batch.length - 1];
      const lastId = last?.user?.id;

      if (!lastId || batch.length < 1000) break;

      after = lastId;
    }

    discordMembersCache = allMembers;
    discordMembersCacheAt = now;
    lastMembersFetchSucceeded = true;

    console.log(
      `[DISCORD MEMBERS] ${discordMembersCache.length} membros carregados em tempo real.`,
    );

    return discordMembersCache;
  } catch (error: any) {
    console.warn("[DISCORD MEMBERS] Falha ao buscar membros:", error.message);
    lastMembersFetchSucceeded = false;
    return [];
  }
}


async function getDiscordChannelMessages(channelId: string, maxPages = 10) {
  const token = getDiscordToken();

  if (!token) {
    console.warn("[CARREIRA] DISCORD_TOKEN/TOKEN em falta no .env.");
    return [];
  }

  const allMessages: DiscordMessage[] = [];
  let before: string | null = null;

  for (let page = 0; page < maxPages; page++) {
    const url = new URL(
      `https://discord.com/api/v10/channels/${channelId}/messages`,
    );

    url.searchParams.set("limit", "100");

    if (before) {
      url.searchParams.set("before", before);
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bot ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(
        "[CARREIRA] Erro ao buscar mensagens:",
        response.status,
        errorText,
      );
      break;
    }

    const batch = await response.json();

    if (!Array.isArray(batch) || batch.length === 0) break;

    allMessages.push(...batch);

    const last = batch[batch.length - 1];

    if (!last?.id || batch.length < 100) break;

    before = last.id;
  }

  return allMessages;
}

function isUnitRole(roleName: string) {
  const normalizedRoleName = roleName.toLowerCase();

  return (
    normalizedRoleName.includes("unidade") ||
    normalizedRoleName.includes("subunidade") ||
    normalizedRoleName.includes("gioe") ||
    normalizedRoleName.includes("unt") ||
    normalizedRoleName.includes("nic") ||
    normalizedRoleName.includes("ushe") ||
    normalizedRoleName.includes("di") ||
    normalizedRoleName.includes("gsa") ||
    normalizedRoleName.includes("ueps") ||
    normalizedRoleName.includes("giop") ||
    normalizedRoleName.includes("gic") ||
    normalizedRoleName.includes("ucc")
  );
}

function isMedalRole(roleName: string) {
  const normalizedRoleName = roleName.toLowerCase();

  return (
    normalizedRoleName.includes("medalha") ||
    normalizedRoleName.includes("ordem militar") ||
    normalizedRoleName.includes("serviços distintos") ||
    normalizedRoleName.includes("servicos distintos") ||
    normalizedRoleName.includes("torre e espada") ||
    normalizedRoleName.includes("ordem de cristo") ||
    normalizedRoleName.includes("ordem militar de cristo") ||
    normalizedRoleName.includes("ordem militar de avis") ||
    normalizedRoleName.includes("infante d. henrique") ||
    normalizedRoleName.includes("ordem da liberdade")
  );
}

function detectCareerType(
  roleName: string,
  mode: string,
  sourceType: CareerSourceType = "PROMOCOES",
  auditAction?: "ADD" | "REMOVE",
): CarreiraTipo {
  const normalizedMode = mode.toLowerCase();

  if (isMedalRole(roleName)) {
    return "MEDALHA";
  }

  if (sourceType === "AUDIT_LOG") {
    if (auditAction === "REMOVE") {
      return isUnitRole(roleName) ? "SAIDA_UNIDADE" : "CARGO_REMOVIDO";
    }

    if (auditAction === "ADD") {
      return isUnitRole(roleName) ? "ENTRADA_UNIDADE" : "CARGO_ADICIONADO";
    }
  }

  if (
    normalizedMode.includes("despromo") ||
    normalizedMode.includes("descida") ||
    normalizedMode.includes("rebaix")
  ) {
    return "DESPROMOCAO";
  }

  if (
    normalizedMode.includes("saída") ||
    normalizedMode.includes("saida") ||
    normalizedMode.includes("saiu") ||
    normalizedMode.includes("remove") ||
    normalizedMode.includes("removido") ||
    normalizedMode.includes("retirado")
  ) {
    return isUnitRole(roleName) ? "SAIDA_UNIDADE" : "CARGO_REMOVIDO";
  }

  if (
    sourceType === "REGISTO_INTERNO" &&
    (normalizedMode.includes("ingresso") ||
      normalizedMode.includes("entrada") ||
      normalizedMode.includes("entrou") ||
      normalizedMode.includes("integra") ||
      normalizedMode.includes("unidade") ||
      normalizedMode.includes("subunidade") ||
      isUnitRole(roleName))
  ) {
    return "ENTRADA_UNIDADE";
  }

  if (
    normalizedMode.includes("promo") ||
    normalizedMode.includes("sargento") ||
    normalizedMode.includes("guarda") ||
    normalizedMode.includes("oficial")
  ) {
    return "PROMOCAO";
  }

  return "CARGO";
}

function detectMessageMode(line: string, currentMode: string) {
  const normalizedLine = line.toLowerCase();

  if (normalizedLine.includes("despromo")) {
    return "Despromoção";
  }

  if (
    normalizedLine.includes("medalha") ||
    normalizedLine.includes("condecor") ||
    normalizedLine.includes("distinção") ||
    normalizedLine.includes("distincao")
  ) {
    return "Medalhas";
  }

  if (
    normalizedLine.includes("saída") ||
    normalizedLine.includes("saida") ||
    normalizedLine.includes("saiu") ||
    normalizedLine.includes("removido") ||
    normalizedLine.includes("retirado")
  ) {
    return "Saída de unidade";
  }

  if (
    normalizedLine.includes("ingresso") ||
    normalizedLine.includes("entrada") ||
    normalizedLine.includes("entrou") ||
    normalizedLine.includes("integra") ||
    normalizedLine.includes("unidade")
  ) {
    return "Entrada em unidade";
  }

  if (normalizedLine.includes("promo")) {
    return "Promoção";
  }

  return currentMode;
}

function normalizeCategory(value: string) {
  return value
    .replace(/^#{1,6}\s*/, "")
    .replace(/\*/g, "")
    .trim();
}

function parseCareerEventsFromMessage(
  message: DiscordMessage,
  roleNameMap: Map<string, string>,
  channelConfig: {
    id: string;
    name: string;
    sourceType: Exclude<CareerSourceType, "AUDIT_LOG">;
  },
): CarreiraEvent[] {
  const events: CarreiraEvent[] = [];
  const lines = String(message.content || "").split(/\r?\n/);

  let mode = channelConfig.sourceType === "REGISTO_INTERNO" ? "Registo interno" : "Promoção";
  let categoria = channelConfig.sourceType === "REGISTO_INTERNO" ? "Registo interno" : "Geral";

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) continue;

    mode = detectMessageMode(line, mode);

    if (/^#{1,6}\s*/.test(line)) {
      const cleanHeader = normalizeCategory(line);

      if (cleanHeader) {
        categoria = cleanHeader;
        mode = detectMessageMode(cleanHeader, mode);
      }
    }

    const regex = /<@!?(\d+)>\s*[-–—:|>]*\s*<@&(\d+)>/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(line)) !== null) {
      const userId = match[1];
      const roleId = match[2];
      const roleName = roleNameMap.get(roleId) || `Cargo ${roleId}`;
      const tipo = detectCareerType(roleName, mode, channelConfig.sourceType);

      events.push({
        id: `${message.id}-${userId}-${roleId}-${events.length}`,
        userId,
        roleId,
        roleName,
        tipo,
        categoria,
        data: message.timestamp,
        messageId: message.id,
        channelId: channelConfig.id,
        origem: channelConfig.name,
        sourceType: channelConfig.sourceType,
      });
    }
  }

  return events;
}

function snowflakeToIsoDate(id: string) {
  try {
    const discordEpoch = 1420070400000n;
    const timestamp = Number((BigInt(id) >> 22n) + discordEpoch);

    return new Date(timestamp).toISOString();
  } catch {
    return new Date().toISOString();
  }
}

type DiscordAuditLogChange = {
  key: string;
  new_value?: any;
  old_value?: any;
};

type DiscordAuditLogEntry = {
  id: string;
  action_type: number;
  target_id?: string;
  user_id?: string;
  changes?: DiscordAuditLogChange[];
};

type DiscordAuditUser = {
  id: string;
  username?: string;
  global_name?: string | null;
};

async function getDiscordRoleAuditEvents(
  roleNameMap: Map<string, string>,
  maxPages = 3,
): Promise<CarreiraEvent[]> {
  const token = getDiscordToken();
  const guildId = getDiscordGuildId();

  if (!token || !guildId) {
    console.warn("[AUDIT LOG] TOKEN/DISCORD_TOKEN ou GUILD_ID/DISCORD_GUILD_ID em falta no .env.");
    return [];
  }

  const events: CarreiraEvent[] = [];
  let before: string | null = null;

  for (let page = 0; page < maxPages; page++) {
    const url = new URL(
      `https://discord.com/api/v10/guilds/${guildId}/audit-logs`,
    );

    url.searchParams.set("limit", "100");
    url.searchParams.set("action_type", String(AUDIT_LOG_MEMBER_ROLE_UPDATE));

    if (before) {
      url.searchParams.set("before", before);
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bot ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn("[AUDIT LOG] Erro ao buscar audit logs:", response.status, errorText);
      break;
    }

    const payload = await response.json();
    const entries: DiscordAuditLogEntry[] = Array.isArray(payload?.audit_log_entries)
      ? payload.audit_log_entries
      : [];
    const auditUsers: DiscordAuditUser[] = Array.isArray(payload?.users)
      ? payload.users
      : [];
    const auditUserMap = new Map(auditUsers.map((user) => [String(user.id), user]));

    if (entries.length === 0) break;

    for (const entry of entries) {
      const targetUserId = String(entry.target_id || "");

      if (!targetUserId || !Array.isArray(entry.changes)) continue;

      for (const change of entry.changes) {
        const action =
          change.key === "$add" ? "ADD" : change.key === "$remove" ? "REMOVE" : null;

        if (!action) continue;

        const rolesChanged = Array.isArray(change.new_value)
          ? change.new_value
          : Array.isArray(change.old_value)
            ? change.old_value
            : [];

        for (const role of rolesChanged) {
          const roleId = String(role?.id || "");
          if (!roleId) continue;

          const roleName = String(
            role?.name || roleNameMap.get(roleId) || `Cargo ${roleId}`,
          );

          const actor = entry.user_id ? auditUserMap.get(String(entry.user_id)) : null;

          events.push({
            id: `audit-${entry.id}-${targetUserId}-${roleId}-${action}`,
            userId: targetUserId,
            roleId,
            roleName,
            tipo: detectCareerType(roleName, "Audit Log", "AUDIT_LOG", action),
            categoria: action === "ADD" ? "Cargo adicionado" : "Cargo removido",
            data: snowflakeToIsoDate(entry.id),
            auditLogId: entry.id,
            origem: "Audit Log do Discord",
            sourceType: "AUDIT_LOG",
            actorId: entry.user_id || null,
            actorName:
              actor?.global_name ||
              actor?.username ||
              (entry.user_id ? String(entry.user_id) : null),
          });
        }
      }
    }

    const last = entries[entries.length - 1];

    if (!last?.id || entries.length < 100) break;

    before = last.id;
  }

  return events;
}

function dedupeCareerEvents(events: CarreiraEvent[]) {
  const map = new Map<string, CarreiraEvent>();

  for (const event of events) {
    const key = [
      event.userId,
      event.roleId,
      event.tipo,
      event.messageId || event.auditLogId || "",
      event.data,
    ].join(":");

    if (!map.has(key)) {
      map.set(key, event);
    }
  }

  return [...map.values()];
}

function decimalToHexColor(color?: number) {
  if (!color || color === 0) return null;
  return `#${color.toString(16).padStart(6, "0")}`;
}

/**
 * Normal: 10:00 até 19:00
 * Noturno: 19:01 até 09:59
 *
 * Se o ponto atravessar os dois períodos, fica "Misto".
 * Se houver pausa, a pausa é distribuída proporcionalmente.
 */
function calculateNormalNightHours(
  startTime: Date,
  endTime: Date,
  totalPauseTime = 0,
) {
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    end <= start
  ) {
    return {
      totalHours: 0,
      normalHours: 0,
      nightHours: 0,
      tipoCalculado: "Normal" as "Normal" | "Noturno" | "Misto",
    };
  }

  const totalMsRaw = end.getTime() - start.getTime();
  let normalMs = 0;

  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);

  const lastDay = new Date(end);
  lastDay.setHours(0, 0, 0, 0);

  while (cursor <= lastDay) {
    const normalStart = new Date(cursor);
    normalStart.setHours(10, 0, 0, 0);

    const normalEnd = new Date(cursor);
    normalEnd.setHours(19, 1, 0, 0);

    const overlapStart = Math.max(start.getTime(), normalStart.getTime());
    const overlapEnd = Math.min(end.getTime(), normalEnd.getTime());

    if (overlapEnd > overlapStart) {
      normalMs += overlapEnd - overlapStart;
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  const pauseMs = Math.max(0, Number(totalPauseTime || 0));
  const pauseRatio = totalMsRaw > 0 ? Math.min(pauseMs / totalMsRaw, 1) : 0;

  const adjustedTotalMs = Math.max(0, totalMsRaw - pauseMs);
  const adjustedNormalMs = Math.max(0, normalMs * (1 - pauseRatio));
  const adjustedNightMs = Math.max(0, adjustedTotalMs - adjustedNormalMs);

  const totalHours = Number((adjustedTotalMs / 3600000).toFixed(1));
  const normalHours = Number((adjustedNormalMs / 3600000).toFixed(1));
  const nightHours = Number((adjustedNightMs / 3600000).toFixed(1));

  let tipoCalculado: "Normal" | "Noturno" | "Misto" = "Normal";

  if (normalHours > 0 && nightHours > 0) {
    tipoCalculado = "Misto";
  } else if (nightHours > 0 && normalHours <= 0) {
    tipoCalculado = "Noturno";
  }

  return {
    totalHours,
    normalHours,
    nightHours,
    tipoCalculado,
  };
}

router.get("/stats", async (req, res) => {
  try {
    const currentMilitaryUsers = await User.find({
      isInGuild: true,
      savedTags: { $in: [GNR_ROLE_ID] },
    })
      .select({ discordId: 1 })
      .lean();

    const currentMilitaryIds = currentMilitaryUsers
      .map((item: any) => String(item.discordId || ""))
      .filter(Boolean);

    const emServicoCount = await Ponto.countDocuments({
      status: "ABERTO",
      userId: { $in: currentMilitaryIds },
    });

    const totalGuardas = currentMilitaryIds.length;
    const totalArquivos = await Ticket.countDocuments({
      status: { $in: ["ARCHIVED", "CLOSED"] },
    });

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayPontos = await Ponto.find({
      status: "FECHADO",
      endTime: { $gte: startOfDay },
    });

    const totalMs = todayPontos.reduce((acc, p) => {
      if (p.startTime && p.endTime) {
        return (
          acc +
          (p.endTime.getTime() -
            p.startTime.getTime() -
            (p.totalPauseTime || 0))
        );
      }

      return acc;
    }, 0);

    const totalHoursToday = (totalMs / 3600000).toFixed(1);

    res.json({
      emServicoCount,
      totalGuardas,
      totalArquivos,
      totalHoursToday,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/guardas", async (req, res) => {
  try {
    res.setHeader(
      "Cache-Control",
      "private, max-age=15, stale-while-revalidate=45",
    );

    const users = await User.find().lean();
    const activePontos = await Ponto.find({ status: "ABERTO" }).lean();

    /*
     * Semana operacional:
     * domingo 00:00 até domingo seguinte 00:00.
     * Na interface isto representa domingo a sábado.
     */
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(
      weekStart.getDate() -
      weekStart.getDay(),
    );

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(
      weekEnd.getDate() + 7,
    );

    const weeklyClosedPontos =
      await Ponto.find({
        status: "FECHADO",
        endTime: {
          $gte: weekStart,
          $lt: weekEnd,
        },
      }).lean();

    const weeklyHoursByUser =
      new Map<string, number>();

    for (
      const ponto of
      weeklyClosedPontos as any[]
    ) {
      const userId =
        String(
          ponto.userId ||
          "",
        );

      if (
        !userId ||
        !ponto.startTime ||
        !ponto.endTime
      ) {
        continue;
      }

      const calculated =
        calculateNormalNightHours(
          new Date(
            ponto.startTime,
          ),
          new Date(
            ponto.endTime,
          ),
          ponto.totalPauseTime ||
          0,
        );

      weeklyHoursByUser.set(
        userId,
        Number(
          (
            (
              weeklyHoursByUser.get(
                userId,
              ) ||
              0
            ) +
            calculated.totalHours
          ).toFixed(1),
        ),
      );
    }

    const discordRolesList = await getDiscordRoles();
    const discordRoleMap = new Map(
      discordRolesList.map((role) => [role.id, role]),
    );

    const discordMembers = await getDiscordMembers();
    const discordMemberMap = new Map(
      discordMembers
        .filter((member) => member?.user?.id)
        .map((member) => [member.user!.id, member]),
    );

    console.log("[DISCORD LIVE MAP]", {
      roles: discordRoleMap.size,
      members: discordMemberMap.size,
      liveMembersOk: lastMembersFetchSucceeded,
    });

    const cacheDoc = (await SystemData.findOne({
      type: "OFFICER_CACHE",
    }).lean()) as any;

    const officerMap = new Map(
      (cacheDoc?.data?.officers || []).map((o: any) => [o.id, o]),
    );

    const data = users.map((u: any) => {
      const userId = String(u.discordId || "");
      const isOnDuty = activePontos.some(
        (p: any) => String(p.userId) === userId,
      );

      const officer = officerMap.get(userId) as any;
      const liveMember = discordMemberMap.get(userId) as
        | DiscordMember
        | undefined;

      const liveRoles =
        Array.isArray(liveMember?.roles) && liveMember.roles.length > 0
          ? liveMember.roles
          : [];

      const cacheRoles =
        Array.isArray(officer?.roles) && officer.roles.length > 0
          ? officer.roles
          : [];

      const savedRoles =
        Array.isArray(u.savedTags) && u.savedTags.length > 0 ? u.savedTags : [];

      let roles: string[] = [];

      if (lastMembersFetchSucceeded) {
        roles = liveRoles;
      } else if (cacheRoles.length > 0) {
        roles = cacheRoles;
      } else {
        roles = savedRoles;
      }

      /*
       * A fonte mais recente disponível define se o utilizador
       * pertence atualmente à Guarda Nacional Republicana.
       */
      if (!roles.includes(GNR_ROLE_ID)) {
        return null;
      }

      const rankMeta = getHighestRankMeta(roles);

      const posto =
        rankMeta.name !== "Sem Posto"
          ? rankMeta.name
          : u.rank || officer?.rank || "Guarda";

      const nome =
        u.warName ||
        liveMember?.nick ||
        liveMember?.user?.global_name ||
        liveMember?.user?.username ||
        officer?.name ||
        officer?.discordUsername ||
        "Desconhecido";

      const avatar =
        getDiscordAvatarUrl(liveMember?.user?.id, liveMember?.user?.avatar) ||
        officer?.avatar ||
        null;

      const discordStatus = officer?.discordStatus || officer?.status || "offline";
      const isDiscordOnline = ["online", "idle", "dnd"].includes(discordStatus);

      const discordTags = roles
        .map((roleId: string) => discordRoleMap.get(String(roleId)))
        .filter(Boolean)
        .map((role: any) => ({
          id: role.id,
          name: role.name,
          color: decimalToHexColor(role.color),
        }));

      return {
        id: userId || u._id.toString(),
        discordId: userId || null,

        nome,
        numero: u.callsignNumber || officer?.nip || "N/A",

        avatar,
        discordStatus,
        isDiscordOnline,
        isOnDuty,

        posto,
        unidade: u.unidade || "Patrulha",

        hierarchyGroup: rankMeta.group,
        hierarchyGroupLabel: rankMeta.groupLabel,
        hierarchyGroupOrder: rankMeta.groupOrder,
        hierarchyOrder: rankMeta.order,
        rankRoleId: rankMeta.roleId,
        groupRoleId: rankMeta.groupRoleId,

        horasDiarias: 0,

        /*
         * Total da semana atual, de domingo a sábado.
         */
        horasSemanais:
          weeklyHoursByUser.get(
            userId,
          ) || 0,
        horasSemanaAtual:
          weeklyHoursByUser.get(
            userId,
          ) || 0,

        horasMensais: 0,
        horasTotal: u.totalHours || 0,

        semanaAtual: {
          inicio:
            weekStart.toISOString(),
          fim:
            weekEnd.toISOString(),
        },

        estado: isOnDuty ? "Em serviço" : "Folga",
        dataIngresso: liveMember?.joined_at
          ? new Date(liveMember.joined_at).toISOString().split("T")[0]
          : u.joinedAt
            ? new Date(u.joinedAt).toISOString().split("T")[0]
            : "N/A",

        roles,
        savedTags: u.savedTags || [],
        discordRoles: liveRoles,
        discordTags,

        /**
         * O frontend usa este campo para saber se o militar ainda
         * pertence ao servidor principal. Como este registo só chega
         * aqui depois de validar a role GNR, o valor é verdadeiro.
         */
        isInGuild: true,
        isMilitar: true,

        rolesSource: lastMembersFetchSucceeded
          ? "discord_live"
          : cacheRoles.length > 0
            ? "officer_cache"
            : "saved_tags",
      };
    });

    const filteredData = data.filter(Boolean) as any[];

    filteredData.sort((a, b) => {
      if (a.hierarchyOrder !== b.hierarchyOrder) {
        return a.hierarchyOrder - b.hierarchyOrder;
      }

      return String(a.nome || "").localeCompare(String(b.nome || ""));
    });

    res.json(filteredData);
  } catch (error: any) {
    console.error("[DATA /guardas] Erro:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/horas", async (req, res) => {
  try {
    res.setHeader(
      "Cache-Control",
      "private, max-age=15, stale-while-revalidate=45",
    );

    const { startDate, endDate } = req.query;

    const query: any = { status: "FECHADO" };

    if (startDate || endDate) {
      query.endTime = {};

      if (startDate) {
        query.endTime.$gte = new Date(startDate as string);
      }

      if (endDate) {
        query.endTime.$lte = new Date(endDate as string);
      }
    }

    const pontos = await Ponto.find(query).sort({ endTime: -1 }).lean();

    const users = await User.find().lean();
    const userMap = new Map(users.map((u: any) => [String(u.discordId), u]));

    const data = pontos.map((p: any) => {
      const start = p.startTime ? new Date(p.startTime) : null;
      const end = p.endTime ? new Date(p.endTime) : null;

      const calculated =
        start && end
          ? calculateNormalNightHours(start, end, p.totalPauseTime || 0)
          : {
              totalHours: 0,
              normalHours: 0,
              nightHours: 0,
              tipoCalculado: "Normal",
            };

      const user = userMap.get(String(p.userId));

      return {
        id: p._id.toString(),
        guardaId: String(p.userId || ""),
        guardaNome: user?.warName || user?.name || "Desconhecido",

        data: end ? end.toISOString().split("T")[0] : "N/A",
        dataRaw: end ? end.toISOString() : null,

        horaInicio: start
          ? start.toLocaleTimeString("pt-PT", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "N/A",

        horaFim: end
          ? end.toLocaleTimeString("pt-PT", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "N/A",

        horasRegistadas: calculated.totalHours,
        horasNormais: calculated.normalHours,
        horasNoturnas: calculated.nightHours,

        tipo: calculated.tipoCalculado,
        descricao: p.descricao || "Serviço regular",
        aprovado: true,
      };
    });

    res.json(data);
  } catch (error: any) {
    console.error("[DATA /horas] Erro:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/arquivos", async (req, res) => {
  try {
    res.setHeader(
      "Cache-Control",
      "private, max-age=15, stale-while-revalidate=45",
    );

    const { startDate, endDate } = req.query;
    const query: any = { status: { $in: ["ARCHIVED", "CLOSED"] } };

    if (startDate || endDate) {
      query.closedAt = {};

      if (startDate) {
        query.closedAt.$gte = new Date(startDate as string);
      }

      if (endDate) {
        query.closedAt.$lte = new Date(endDate as string);
      }
    }

    let cursor = Ticket.find(query).sort({ closedAt: -1 });

    if (!startDate && !endDate) {
      cursor = cursor.limit(50);
    }

    const tickets = await cursor.lean();
    const users = await User.find().lean();
    const userMap = new Map(users.map((u: any) => [u.discordId, u.warName]));

    const data = tickets.map((t: any) => {
      const transcriptPath = t.transcriptPath || t["transcriptPath"];
      const hasTranscript = !!transcriptPath;
      const transcriptUrl = hasTranscript ? getTranscriptUrl(transcriptPath) : null;

      console.log(
        `[ARCHIVES] Ticket ${t.channelId}: hasTranscript=${hasTranscript}, path=${transcriptPath}`,
      );

      return {
        id: t._id.toString(),
        nome: `Ticket #${t.channelId?.slice(-5) || "N/A"} - ${
          t.type || "Geral"
        }`,
        tipo: t.type || "Relatório",
        dataCriacao: t.closedAt
          ? new Date(t.closedAt).toLocaleDateString("pt-PT")
          : "N/A",
        dataRaw: t.closedAt ? new Date(t.closedAt).toISOString() : null,
        responsavel: userMap.get(t.closedBy || "") || "Sistema",
        tamanho: "N/A",
        url: transcriptUrl,
      };
    });

    res.json(data);
  } catch (error: any) {
    console.error("[DATA /arquivos] Erro:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/patrulhas", async (req, res) => {
  try {
    res.setHeader(
      "Cache-Control",
      "private, max-age=15, stale-while-revalidate=45",
    );

    const { startDate, endDate } = req.query;
    const query: any = {};

    if (startDate || endDate) {
      query.startTime = {};

      if (startDate) {
        query.startTime.$gte = new Date(startDate as string);
      }

      if (endDate) {
        query.startTime.$lte = new Date(endDate as string);
      }
    }

    let cursor = CP.find(query).sort({ startTime: -1 });

    if (!startDate && !endDate) {
      cursor = cursor.limit(100);
    }

    const cps = await cursor.lean();
    const users = await User.find().lean();
    const userMap = new Map(users.map((u: any) => [u.discordId, u.warName]));

    const data = cps.map((cp: any) => ({
      id: cp._id.toString(),
      numero: cp.number || "N/A",
      comandante: userMap.get(cp.commanderId || "") || "Desconhecido",
      viatura: cp.vehicle || "N/A",
      estado:
        cp.status === "ABERTO"
          ? "Ativa"
          : cp.status === "FECHADO"
            ? "Concluída"
            : "Cancelada",
      data: cp.startTime
        ? new Date(cp.startTime).toLocaleDateString("pt-PT")
        : "N/A",
      dataRaw: cp.startTime ? new Date(cp.startTime).toISOString() : null,
      horaInicio: cp.startTime
        ? new Date(cp.startTime).toLocaleTimeString("pt-PT", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "N/A",
      participantes: String(cp.participants || "")
        .split(" ")
        .filter(Boolean).length,
    }));

    res.json(data);
  } catch (error: any) {
    console.error("[DATA /patrulhas] Erro:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post(
  "/arquivos/upload",
  express.raw({ type: "*/*", limit: "10mb" }),
  async (req, res) => {
    try {
      const originalFileName =
        (req.headers["x-file-name"] as string) || `upload-${Date.now()}.html`;

      const safeFileName = sanitizeFileName(originalFileName);

      if (!isAllowedArchiveFileName(safeFileName)) {
        res.status(400).json({
          error:
            "Tipo de ficheiro não permitido para arquivo.",
        });
        return;
      }

      if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
        res.status(400).json({
          error:
            "Ficheiro vazio ou inválido.",
        });
        return;
      }

      ensureTranscriptsFolder();

      const filePath = path.join(TRANSCRIPTS_PATH, safeFileName);
      fs.writeFileSync(filePath, req.body);

      const newTicket = new Ticket({
        channelId: `upload-${Date.now()}`,
        type: "DOCUMENTO",
        status: "ARCHIVED",
        closedAt: new Date(),
        closedBy: req.session.user?.id || "Sistema",
        transcriptPath: safeFileName,
      });

      await newTicket.save();

      await createAuditLog(req, {
        action: "DOCUMENT_UPLOADED",
        module: "Arquivos",
        severity: "success",
        description: `Documento ${safeFileName} foi arquivado.`,
        targetId: newTicket._id.toString(),
        targetName: safeFileName,
        metadata: {
          fileName: safeFileName,
          url: getTranscriptUrl(safeFileName),
        },
      });

      res.json({
        success: true,
        fileName: safeFileName,
        url: getTranscriptUrl(safeFileName),
      });
    } catch (error: any) {
      console.error("[ARQUIVOS UPLOAD] Erro:", error);

      await createAuditLog(req, {
        action: "DOCUMENT_UPLOAD_FAILED",
        module: "Arquivos",
        severity: "critical",
        description: "Falha ao arquivar documento.",
        metadata: {
          error: error.message,
        },
      });

      res.status(500).json({ error: error.message });
    }
  },
);


router.get("/carreira", async (req, res) => {
  try {
    res.setHeader(
      "Cache-Control",
      "private, max-age=30, stale-while-revalidate=90",
    );

    const now =
      Date.now();

    if (
      careerResponseCache.length > 0 &&
      now -
        careerResponseCacheAt <
        CAREER_RESPONSE_TTL_MS
    ) {
      return res.json(
        careerResponseCache,
      );
    }

    const discordRolesList = await getDiscordRoles();
    const roleNameMap = new Map(
      discordRolesList.map((role) => [String(role.id), role.name]),
    );

    const channelEvents: CarreiraEvent[] = [];

    for (const channelConfig of CAREER_CHANNELS) {
      const messages = await getDiscordChannelMessages(channelConfig.id, 20);

      channelEvents.push(
        ...messages.flatMap((message) =>
          parseCareerEventsFromMessage(message, roleNameMap, channelConfig),
        ),
      );
    }

    const auditEvents = await getDiscordRoleAuditEvents(roleNameMap, 3);

    const carreira = dedupeCareerEvents([
      ...channelEvents,
      ...auditEvents,
    ]).sort(
      (a, b) =>
        new Date(
          b.data,
        ).getTime() -
        new Date(
          a.data,
        ).getTime(),
    );

    careerResponseCache =
      carreira;

    careerResponseCacheAt =
      Date.now();

    res.json(
      carreira,
    );
  } catch (error: any) {
    console.error("[DATA /carreira] Erro:", error);
    res.status(500).json({ error: error.message });
  }
});


/**
 * RANKING MENSAL REAL
 */
router.get("/ranking-mensal", async (req, res) => {
  try {
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate",
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    const now = new Date();

    const startDate = req.query.startDate
      ? new Date(String(req.query.startDate))
      : new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

    const endDate = req.query.endDate
      ? new Date(String(req.query.endDate))
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const discordMembers = await getDiscordMembers();

    if (
      !lastMembersFetchSucceeded ||
      !Array.isArray(discordMembers) ||
      discordMembers.length === 0
    ) {
      return res.status(503).json({
        error: "Não foi possível carregar membros atuais do Discord.",
      });
    }

    const gnrMembers = discordMembers.filter(
      (member: any) =>
        Array.isArray(member.roles) && member.roles.includes(GNR_ROLE_ID),
    );

    const gnrIds = gnrMembers
      .map((member: any) => member.user?.id)
      .filter(Boolean);

    const memberMap = new Map(
      gnrMembers.map((member: any) => [member.user.id, member]),
    );

    const users = await User.find({
      discordId: { $in: gnrIds },
    }).lean();

    const userMap = new Map(users.map((user: any) => [user.discordId, user]));

    const pontos = await Ponto.find({
      status: "FECHADO",
      userId: { $in: gnrIds },
      endTime: {
        $gte: startDate,
        $lte: endDate,
      },
    }).lean();

    const hoursByUser = new Map<string, number>();

    for (const ponto of pontos as any[]) {
      if (!ponto.userId || !ponto.startTime || !ponto.endTime) continue;

      const durationMs =
        new Date(ponto.endTime).getTime() -
        new Date(ponto.startTime).getTime() -
        (ponto.totalPauseTime || 0);

      const hours = Math.max(0, durationMs / 3600000);

      hoursByUser.set(
        String(ponto.userId),
        (hoursByUser.get(String(ponto.userId)) || 0) + hours,
      );
    }

    const ranking = [...hoursByUser.entries()]
      .map(([discordId, hours]) => {
        const user = userMap.get(discordId) as any;
        const member = memberMap.get(discordId) as any;

        const rankMeta = getHighestRankMeta(member?.roles || []);

        const avatar =
          getDiscordAvatarUrl(member?.user?.id, member?.user?.avatar) || null;

        return {
          id: discordId,
          name:
            user?.warName ||
            member?.nick ||
            member?.user?.global_name ||
            member?.user?.username ||
            "Desconhecido",
          rank:
            rankMeta.name !== "Sem Posto"
              ? rankMeta.name
              : user?.rank || "Operacional",
          numero: user?.callsignNumber || "N/A",
          avatar,
          hours: Number(hours.toFixed(1)),
        };
      })
      .filter((item) => item.hours > 0)
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 3)
      .map((item, index) => ({
        ...item,
        pos: index + 1,
      }));

    res.json(ranking);
  } catch (error: any) {
    console.error("[RANKING MENSAL] Erro:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/ranking", async (req, res) => {
  try {
    const cacheDoc = (await SystemData.findOne({
      type: "OFFICER_CACHE",
    }).lean()) as any;

    if (!cacheDoc || !cacheDoc.data || !cacheDoc.data.officers) {
      return res.json([]);
    }

    const officers = cacheDoc.data.officers;

    officers.sort(
      (a: any, b: any) =>
        parseFloat(b.totalHours || "0") - parseFloat(a.totalHours || "0"),
    );

    const top3 = officers.slice(0, 3).map((o: any, index: number) => ({
      id: o.id,
      name: o.name,
      rank: o.rank || "Militar",
      hours: o.totalHours,
      avatar:
        o.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${o.name}`,
      pos: index + 1,
    }));

    res.json(top3);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;