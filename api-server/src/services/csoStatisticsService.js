import { User, Ponto, CP } from "../models/index.js";
import CSOEvaluation from "../models/CSOEvaluation.js";


const rosterCache = new Map();
const ROSTER_CACHE_TTL_MS = 60_000;

function rosterCacheKey(start, end) {
  return [
    new Date(start).toISOString(),
    new Date(end).toISOString(),
  ].join(":");
}

function getCachedRoster(key) {
  const cached = rosterCache.get(key);

  if (!cached) return null;

  if (
    Date.now() - cached.createdAt >
    ROSTER_CACHE_TTL_MS
  ) {
    rosterCache.delete(key);
    return null;
  }

  return cached.items;
}

function setCachedRoster(key, items) {
  rosterCache.set(key, {
    createdAt: Date.now(),
    items,
  });
}

async function discordFetch(
  url,
  options = {},
  timeoutMs = 12_000,
) {
  const controller =
    new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    timeoutMs,
  );

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

const OFFICIAL_ROLES = {
  SARGENTOS: "1147891694260461688",
  GUARDAS: "1147878942024400978",
};


const SERGEANT_EVALUATIONS_CHANNEL_ID =
  process.env["DISCORD_SERGEANT_EVALUATIONS_CHANNEL_ID"] ||
  "1416453368678842368";

function messageFullText(message) {
  const pieces = [String(message?.content || "")];

  for (const embed of message?.embeds || []) {
    pieces.push(String(embed?.title || ""));
    pieces.push(String(embed?.description || ""));

    for (const field of embed?.fields || []) {
      pieces.push(String(field?.name || ""));
      pieces.push(String(field?.value || ""));
    }
  }

  return pieces.filter(Boolean).join("\n");
}

function extractEvaluationScore(text) {
  const normalized = String(text || "");

  const explicitPatterns = [
    /(?:nota|avalia[cç][aã]o|pontua[cç][aã]o|classifica[cç][aã]o)\s*[:\-]?\s*(20|1\d|[0-9])(?:[.,]\d+)?\s*\/\s*20/i,
    /(?:nota|avalia[cç][aã]o|pontua[cç][aã]o|classifica[cç][aã]o)\s*[:\-]?\s*(20|1\d|[0-9])(?:[.,]\d+)?/i,
    /\b(20|1\d|[0-9])(?:[.,]\d+)?\s*\/\s*20\b/i,
  ];

  for (const pattern of explicitPatterns) {
    const match = normalized.match(pattern);

    if (match) {
      const score = Number(String(match[1]).replace(",", "."));

      if (Number.isFinite(score) && score >= 0 && score <= 20) {
        return score;
      }
    }
  }

  return null;
}

async function fetchSergeantEvaluationMessages(periodStart, periodEnd) {
  const token = getDiscordToken();
  const guildId = getGuildId();

  if (!token || !guildId) return [];

  const start = normalizeDate(periodStart);
  const end = normalizeDate(periodEnd);

  const messages = [];
  let before = null;

  for (let page = 0; page < 30; page += 1) {
    const url = new URL(
      `https://discord.com/api/v10/channels/${SERGEANT_EVALUATIONS_CHANNEL_ID}/messages`,
    );

    url.searchParams.set("limit", "100");
    if (before) url.searchParams.set("before", before);

    const response = await discordFetch(url.toString(), {
      headers: {
        Authorization: `Bot ${token}`,
      },
    });

    if (!response.ok) {
      const raw = await response.text();

      console.warn(
        `[CSO] Canal de avaliações respondeu ${response.status}: ${raw.slice(0, 160)}`,
      );
      break;
    }

    const batch = await response.json();

    if (!Array.isArray(batch) || batch.length === 0) break;

    let reachedBeforeStart = false;

    for (const message of batch) {
      const createdAt = normalizeDate(message?.timestamp);

      if (!createdAt) continue;

      if (start && createdAt < start) {
        reachedBeforeStart = true;
        continue;
      }

      if (end && createdAt > end) continue;

      messages.push(message);
    }

    if (reachedBeforeStart || batch.length < 100) break;

    before = String(batch[batch.length - 1]?.id || "");
    if (!before) break;
  }

  return messages;
}

function buildSergeantEvaluationMap(messages, officialIds) {
  const guildId = getGuildId();
  const officialSet = new Set(officialIds.map(String));
  const map = new Map();

  for (const message of messages) {
    const text = messageFullText(message);
    const mentionedIds = [
      ...new Set(text.match(/\d{15,22}/g) || []),
    ].filter((id) => officialSet.has(String(id)));

    for (const evaluatedDiscordId of mentionedIds) {
      if (!map.has(evaluatedDiscordId)) {
        map.set(evaluatedDiscordId, []);
      }

      map.get(evaluatedDiscordId).push({
        messageId: String(message?.id || ""),
        channelId: SERGEANT_EVALUATIONS_CHANNEL_ID,
        evaluatorDiscordId: String(message?.author?.id || "") || null,
        evaluatorName:
          message?.author?.global_name ||
          message?.author?.username ||
          "Sargento",
        score: extractEvaluationScore(text),
        content: text.slice(0, 3000),
        createdAt: message?.timestamp || null,
        jumpUrl:
          message?.id && guildId
            ? `https://discord.com/channels/${guildId}/${SERGEANT_EVALUATIONS_CHANNEL_ID}/${message.id}`
            : null,
      });
    }
  }

  return map;
}


function getDiscordToken() {
  return (
    process.env["DISCORD_TOKEN"] ||
    process.env["TOKEN"] ||
    ""
  );
}

function getGuildId() {
  return String(
    process.env["DISCORD_GUILD_ID"] ||
      process.env["GUILD_IDS"] ||
      "",
  )
    .split(",")[0]
    .trim();
}

async function fetchOfficialGuardMembers() {
  const token = getDiscordToken();
  const guildId = getGuildId();

  if (!token || !guildId) {
    throw new Error(
      "DISCORD_TOKEN e DISCORD_GUILD_ID são obrigatórios para sincronizar Guardas e Sargentos.",
    );
  }

  const members = [];
  let after = "0";

  for (let page = 0; page < 20; page += 1) {
    const response = await discordFetch(
      `https://discord.com/api/v10/guilds/${guildId}/members?limit=1000&after=${after}`,
      {
        headers: {
          Authorization: `Bot ${token}`,
        },
      },
    );

    if (!response.ok) {
      const raw = await response.text();

      throw new Error(
        `Discord respondeu ${response.status} ao carregar o efetivo: ${raw.slice(0, 180)}`,
      );
    }

    const batch = await response.json();

    if (!Array.isArray(batch) || batch.length === 0) {
      break;
    }

    members.push(...batch);

    if (batch.length < 1000) {
      break;
    }

    after = String(batch[batch.length - 1]?.user?.id || "");

    if (!after) break;
  }

  return members
    .map((member) => {
      const roles = Array.isArray(member?.roles)
        ? member.roles.map(String)
        : [];

      const isSergeant = roles.includes(
        OFFICIAL_ROLES.SARGENTOS,
      );

      const isGuard = roles.includes(
        OFFICIAL_ROLES.GUARDAS,
      );

      if (!isSergeant && !isGuard) return null;

      const discordId = String(
        member?.user?.id || "",
      ).trim();

      if (!discordId) return null;

      return {
        discordId,
        discordName:
          member?.nick ||
          member?.user?.global_name ||
          member?.user?.username ||
          `Militar ${discordId}`,
        rankGroup: isSergeant
          ? "SARGENTOS"
          : "GUARDAS",
        officialRoleId: isSergeant
          ? OFFICIAL_ROLES.SARGENTOS
          : OFFICIAL_ROLES.GUARDAS,
      };
    })
    .filter(Boolean);
}

function asNumber(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function asText(value, fallback = "") {
  if (value === null || value === undefined) return fallback;

  const text = String(value).trim();
  return text || fallback;
}

function normalizeId(value) {
  return asText(value, "");
}

function normalizeDate(value) {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * O campo CP.participants é String.
 * Extrai IDs tanto de:
 * 123 456
 * <@123> <@!456>
 * JSON, vírgulas ou texto livre.
 */
function parseParticipantIds(value) {
  const raw = String(value || "");
  const ids = raw.match(/\d{15,22}/g) || [];

  return [...new Set(ids.map(String))];
}

function patrolMemberIds(cp) {
  return [
    ...new Set(
      [
        normalizeId(cp?.commanderId),
        ...parseParticipantIds(cp?.participants),
      ].filter(Boolean),
    ),
  ];
}

function durationHoursWithinPeriod(
  startTime,
  endTime,
  periodStart,
  periodEnd,
) {
  const start = normalizeDate(startTime);
  const end = normalizeDate(endTime);
  const rangeStart = normalizeDate(periodStart);
  const rangeEnd = normalizeDate(periodEnd);

  if (
    !start ||
    !end ||
    !rangeStart ||
    !rangeEnd ||
    end <= start
  ) {
    return 0;
  }

  const clippedStart = new Date(
    Math.max(start.getTime(), rangeStart.getTime()),
  );

  const clippedEnd = new Date(
    Math.min(end.getTime(), rangeEnd.getTime()),
  );

  if (clippedEnd <= clippedStart) return 0;

  return (
    clippedEnd.getTime() - clippedStart.getTime()
  ) / 3_600_000;
}

/**
 * totalPauseTime já é usado pelo sistema como duração.
 * Aceita milissegundos e também segundos, caso existam registos antigos.
 */
function normalizePauseMilliseconds(value) {
  const pause = Math.max(0, asNumber(value));

  // Um valor inferior a 24h em segundos é provavelmente segundos.
  // Valores maiores são tratados como milissegundos.
  if (pause > 0 && pause <= 86_400) {
    return pause * 1000;
  }

  return pause;
}

function pointHoursWithinPeriod(
  record,
  periodStart,
  periodEnd,
) {
  const start = normalizeDate(record?.startTime);
  const end = normalizeDate(record?.endTime);
  const rangeStart = normalizeDate(periodStart);
  const rangeEnd = normalizeDate(periodEnd);

  if (
    !start ||
    !end ||
    !rangeStart ||
    !rangeEnd ||
    end <= start
  ) {
    return 0;
  }

  const clippedStart = new Date(
    Math.max(start.getTime(), rangeStart.getTime()),
  );

  const clippedEnd = new Date(
    Math.min(end.getTime(), rangeEnd.getTime()),
  );

  if (clippedEnd <= clippedStart) return 0;

  const originalDuration =
    end.getTime() - start.getTime();

  const clippedDuration =
    clippedEnd.getTime() - clippedStart.getTime();

  const pauseMs =
    normalizePauseMilliseconds(
      record?.totalPauseTime,
    );

  const proportionalPause =
    originalDuration > 0
      ? pauseMs *
        (clippedDuration / originalDuration)
      : 0;

  return Math.max(
    0,
    (clippedDuration - proportionalPause) /
      3_600_000,
  );
}

function inferRank(user) {
  const stored = asText(user?.rank, "");

  if (stored) return stored;

  const warName = asText(user?.warName, "");
  const prefix = warName.split("|")[0]?.trim().toUpperCase() || "";

  if (prefix.startsWith("S-")) return "Sargento";
  if (prefix.startsWith("C-")) return "Cabo";
  if (prefix.startsWith("G-")) return "Guarda";

  return "Guarda";
}

function rankGroup(rank) {
  const normalized = String(rank || "").toLowerCase();

  if (normalized.includes("sargento")) return "SARGENTOS";
  if (
    normalized.includes("guarda") ||
    normalized.includes("cabo")
  ) {
    return "GUARDAS";
  }

  return "OUTROS";
}

function createRosterRecord(user) {
  const rank = inferRank(user);

  return {
    discordId: normalizeId(user?.discordId),
    name: asText(
      user?.warName,
      `Militar ${normalizeId(user?.discordId)}`,
    ),
    rank,
    rankGroup: rankGroup(rank),
    unit: asText(user?.unidade, "Patrulha"),
    status: asText(user?.estado, "Folga"),
    joinedAt: user?.joinedAt || null,

    totalHours: asNumber(user?.totalHours),
    weeklyHours: 0,
    monthlyHours: 0,

    patrolCount: 0,
    patrolHours: 0,
    jointPatrols: 0,
    soloPatrols: 0,

    evaluationCount: 0,
    evaluationAverage: 0,
    points: 0,

    lastPromotionAt: null,
    lastPromotionType: null,

    patrolPartners: [],
  };
}

function addPartner(map, ownerId, partnerId, partnerUser, hours) {
  if (!ownerId || !partnerId || ownerId === partnerId) return;

  if (!map.has(ownerId)) {
    map.set(ownerId, new Map());
  }

  const ownerPartners = map.get(ownerId);
  const existing = ownerPartners.get(partnerId) || {
    discordId: partnerId,
    name: asText(
      partnerUser?.warName,
      `Militar ${partnerId}`,
    ),
    count: 0,
    patrolHours: 0,
  };

  existing.count += 1;
  existing.patrolHours += hours;

  ownerPartners.set(partnerId, existing);
}

/**
 * Lista completa e profissional para a seleção da reunião.
 * Não aplica um filtro rígido ao campo rank, porque existem utilizadores
 * antigos sem rank preenchido ou com abreviaturas no nome de guerra.
 */
export async function listEligibleCSOGuards(
  weekStart = new Date(Date.now() - 6 * 86_400_000),
  weekEnd = new Date(),
) {
  const cacheKey = rosterCacheKey(
    weekStart,
    weekEnd,
  );

  const cached =
    getCachedRoster(cacheKey);

  if (cached) {
    return structuredClone(cached);
  }

  const start =
    normalizeDate(weekStart) ||
    new Date(Date.now() - 6 * 86_400_000);

  const end = normalizeDate(weekEnd) || new Date();

  const officialMembers =
    await fetchOfficialGuardMembers();

  const officialIds = officialMembers.map(
    (member) => member.discordId,
  );

  if (officialIds.length === 0) {
    return [];
  }

  const [
    users,
    points,
    cps,
    evaluations,
    sergeantEvaluationMessages,
  ] = await Promise.all([
      User.find({
        discordId: { $in: officialIds },
      }).lean(),

      Ponto.find({
        userId: { $in: officialIds },
        status: "FECHADO",
        startTime: { $lte: end },
        endTime: { $gte: start },
      }).lean(),

      CP.find({
        status: "FECHADO",
        startTime: { $lte: end },
        endTime: { $gte: start },
      }).lean(),

      CSOEvaluation.find({
        evaluatedDiscordId: {
          $in: officialIds,
        },
        weekStart: { $lte: end },
        weekEnd: { $gte: start },
      }).lean(),

      fetchSergeantEvaluationMessages(start, end),
    ]);

  const userById = new Map(
    users.map((user) => [
      normalizeId(user?.discordId),
      user,
    ]),
  );

  const roster = new Map();

  for (const member of officialMembers) {
    const user = userById.get(member.discordId);

    const rank =
      member.rankGroup === "SARGENTOS"
        ? asText(user?.rank, "Sargento")
        : asText(user?.rank, "Guarda");

    roster.set(member.discordId, {
      discordId: member.discordId,
      name: asText(
        user?.warName,
        member.discordName,
      ),
      rank,
      rankGroup: member.rankGroup,
      officialRoleId: member.officialRoleId,
      unit: asText(user?.unidade, "Patrulha"),
      status: asText(user?.estado, "Folga"),
      joinedAt: user?.joinedAt || null,

      accumulatedHours: asNumber(user?.totalHours),
      periodHours: 0,
      totalHours: 0,
      weeklyHours: 0,
      monthlyHours: 0,

      patrolCount: 0,
      patrolHours: 0,
      jointPatrols: 0,
      soloPatrols: 0,

      evaluationCount: 0,
      evaluationAverage: 0,
      points: 0,

      sergeantEvaluationCount: 0,
      sergeantEvaluationAverage: 0,
      sergeantEvaluations: [],

      periodStart: start.toISOString(),
      periodEnd: end.toISOString(),

      lastPromotionAt: null,
      lastPromotionType: null,

      patrolPartners: [],
    });
  }

  for (const point of points) {
    const id = normalizeId(point?.userId);
    const record = roster.get(id);

    if (!record) continue;

    const hours = pointHoursWithinPeriod(
      point,
      start,
      end,
    );
    const endDate = normalizeDate(
      point?.endTime,
    );

    if (hours > 0) {
      record.periodHours += hours;
      record.totalHours += hours;
      record.weeklyHours += hours;
      record.monthlyHours += hours;
    }
  }

  const partnerMaps = new Map();

  for (const cp of cps) {
    const ids = patrolMemberIds(cp).filter(
      (id) => roster.has(id),
    );

    if (ids.length === 0) continue;

    const hours = durationHoursWithinPeriod(
      cp?.startTime,
      cp?.endTime,
      start,
      end,
    );

    if (hours <= 0) continue;

    for (const ownerId of ids) {
      const record = roster.get(ownerId);

      if (!record) continue;

      record.patrolCount += 1;
      record.patrolHours += hours;

      if (ids.length > 1) {
        record.jointPatrols += 1;
      } else {
        record.soloPatrols += 1;
      }

      for (const partnerId of ids) {
        if (
          partnerId === ownerId ||
          !roster.has(partnerId)
        ) {
          continue;
        }

        if (!partnerMaps.has(ownerId)) {
          partnerMaps.set(
            ownerId,
            new Map(),
          );
        }

        const partners =
          partnerMaps.get(ownerId);

        const partnerRecord =
          roster.get(partnerId);

        const existing =
          partners.get(partnerId) || {
            discordId: partnerId,
            name: partnerRecord.name,
            count: 0,
            patrolHours: 0,
          };

        existing.count += 1;
        existing.patrolHours += hours;

        partners.set(partnerId, existing);
      }
    }
  }

  const evaluationAccumulator = new Map();

  for (const evaluation of evaluations) {
    const id = normalizeId(
      evaluation?.evaluatedDiscordId,
    );

    if (!roster.has(id)) continue;

    const current =
      evaluationAccumulator.get(id) || {
        count: 0,
        scoreTotal: 0,
        points: 0,
      };

    current.count += 1;
    current.scoreTotal += asNumber(
      evaluation?.score,
    );
    current.points += asNumber(
      evaluation?.points,
    );

    evaluationAccumulator.set(id, current);
  }

  const sergeantEvaluationMap =
    buildSergeantEvaluationMap(
      sergeantEvaluationMessages,
      officialIds,
    );

  for (const [id, record] of roster.entries()) {
    const evaluation =
      evaluationAccumulator.get(id);

    if (evaluation) {
      record.evaluationCount =
        evaluation.count;

      record.evaluationAverage =
        evaluation.count > 0
          ? evaluation.scoreTotal /
            evaluation.count
          : 0;

      record.points = evaluation.points;
    }

    const officialEvaluations =
      sergeantEvaluationMap.get(id) || [];

    const scoredOfficialEvaluations =
      officialEvaluations.filter(
        (item) => Number.isFinite(item.score),
      );

    record.sergeantEvaluationCount =
      officialEvaluations.length;

    record.sergeantEvaluationAverage =
      scoredOfficialEvaluations.length > 0
        ? scoredOfficialEvaluations.reduce(
            (sum, item) => sum + Number(item.score || 0),
            0,
          ) / scoredOfficialEvaluations.length
        : 0;

    record.sergeantEvaluations =
      officialEvaluations;

    const partners = partnerMaps.get(id);

    record.patrolPartners = partners
      ? [...partners.values()].sort(
          (a, b) =>
            b.count - a.count ||
            b.patrolHours -
              a.patrolHours,
        )
      : [];
  }

  const result = [...roster.values()].sort(
    (a, b) => {
      const groupOrder = {
        SARGENTOS: 0,
        GUARDAS: 1,
      };

      return (
        groupOrder[a.rankGroup] -
          groupOrder[b.rankGroup] ||
        a.name.localeCompare(
          b.name,
          "pt-PT",
        )
      );
    },
  );

  setCachedRoster(
    cacheKey,
    result,
  );

  return structuredClone(result);
}

export async function buildGuardSnapshot(
  discordId,
  weekStart,
  weekEnd,
) {
  const id = normalizeId(discordId);

  if (!id) {
    throw new Error(
      "O Discord ID do militar é obrigatório.",
    );
  }

  const start = normalizeDate(weekStart);
  const end = normalizeDate(weekEnd);

  if (!start || !end || end < start) {
    throw new Error(
      "O intervalo da reunião não é válido.",
    );
  }

  const roster = await listEligibleCSOGuards(
    start,
    end,
  );

  const record = roster.find(
    (item) => item.discordId === id,
  );

  if (!record) {
    throw new Error(
      "O militar não foi encontrado na base de dados.",
    );
  }

  return {
    guard: {
      discordId: record.discordId,
      name: record.name,
      rank: record.rank,
      unit: record.unit,
    },

    snapshot: {
      capturedAt: new Date(),
      snapshotVersion: 2,

      periodStart: start.toISOString(),
      periodEnd: end.toISOString(),

      totalHours: record.periodHours,
      periodHours: record.periodHours,
      accumulatedHours: record.accumulatedHours,

      weeklyHours: record.periodHours,
      monthlyHours: record.periodHours,

      points: record.points,

      patrolHours: record.patrolHours,
      patrolCount: record.patrolCount,
      soloPatrols: record.soloPatrols,
      jointPatrols: record.jointPatrols,

      evaluationCount: record.evaluationCount,
      evaluationAverage: record.evaluationAverage,

      sergeantEvaluationCount:
        record.sergeantEvaluationCount,
      sergeantEvaluationAverage:
        record.sergeantEvaluationAverage,
      sergeantEvaluations:
        record.sergeantEvaluations,

      activeAbsences: 0,
      activeSanctions: 0,

      lastPromotionAt: record.lastPromotionAt,
      lastPromotionType: record.lastPromotionType,

      patrolPartners:
        record.patrolCount > 0
          ? record.patrolPartners
          : [],

      sourceSummary: {
        source: "USER_PONTO_CP_CSO_EVALUATION",
        periodStart: start.toISOString(),
        periodEnd: end.toISOString(),
        scope: "SELECTED_MEETING_PERIOD",
        sergeantEvaluationsChannelId:
          SERGEANT_EVALUATIONS_CHANNEL_ID,
      },
    },
  };
}
