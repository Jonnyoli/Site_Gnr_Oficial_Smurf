import { User, Ponto, CP, SystemData } from "../models/index.js";
import DRHProcess from "../models/DRHProcess.js";

const ROLE_IDS = {
  EFETIVO_GNR: "1147878941974077478",
  AUSENCIAS: "1147878941630136362",
};

const ABSENCE_TICKETS_CHANNEL_ID =
  process.env["DISCORD_ABSENCE_TICKETS_CHANNEL_ID"] ||
  "1313098325645590539";

const workforceCache = new Map();
const CACHE_TTL_MS = 60_000;

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


const RANK_PRIORITY = [
  {
    canonical: "Comandante-Geral",
    aliases: ["COMANDANTE-GERAL", "COMANDANTE GERAL"],
  },
  {
    canonical: "Tenente-General",
    aliases: ["TENENTE-GENERAL", "TENENTE GENERAL"],
  },
  {
    canonical: "Major-General",
    aliases: ["MAJOR-GENERAL", "MAJOR GENERAL"],
  },
  {
    canonical: "Brigadeiro-General",
    aliases: ["BRIGADEIRO-GENERAL", "BRIGADEIRO GENERAL"],
  },
  {
    canonical: "Coronel",
    aliases: ["CORONEL"],
  },
  {
    canonical: "Tenente-Coronel",
    aliases: ["TENENTE-CORONEL", "TENENTE CORONEL"],
  },
  {
    canonical: "Major",
    aliases: ["MAJOR"],
  },
  {
    canonical: "Capitão",
    aliases: ["CAPITÃO", "CAPITAO"],
  },
  {
    canonical: "Tenente",
    aliases: ["TENENTE"],
  },
  {
    canonical: "Alferes",
    aliases: ["ALFERES"],
  },
  {
    canonical: "Aspirante a Oficial",
    aliases: ["ASPIRANTE A OFICIAL", "ASPIRANTE"],
  },
  {
    canonical: "Sargento-Mor",
    aliases: ["SARGENTO-MOR", "SARGENTO MOR"],
  },
  {
    canonical: "Sargento-Chefe",
    aliases: ["SARGENTO-CHEFE", "SARGENTO CHEFE"],
  },
  {
    canonical: "Sargento-Ajudante",
    aliases: ["SARGENTO-AJUDANTE", "SARGENTO AJUDANTE"],
  },
  {
    canonical: "Primeiro-Sargento",
    aliases: ["PRIMEIRO-SARGENTO", "1º SARGENTO", "1 SARGENTO"],
  },
  {
    canonical: "Segundo-Sargento",
    aliases: ["SEGUNDO-SARGENTO", "2º SARGENTO", "2 SARGENTO"],
  },
  {
    canonical: "Furriel",
    aliases: ["FURRIEL"],
  },
  {
    canonical: "Cabo-Mor",
    aliases: ["CABO-MOR", "CABO MOR"],
  },
  {
    canonical: "Cabo-Chefe",
    aliases: ["CABO-CHEFE", "CABO CHEFE"],
  },
  {
    canonical: "Cabo",
    aliases: ["CABO"],
  },
  {
    canonical: "Guarda Principal",
    aliases: ["GUARDA PRINCIPAL"],
  },
  {
    canonical: "Guarda",
    aliases: ["GUARDA"],
  },
  {
    canonical: "Recruta",
    aliases: ["RECRUTA"],
  },
];

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

function rankWeight(rank) {
  const normalized = normalizeText(rank);

  const index = RANK_PRIORITY.findIndex(
    (entry) =>
      entry.aliases.some((alias) =>
        normalized.includes(
          normalizeText(alias),
        ),
      ),
  );

  return index === -1
    ? RANK_PRIORITY.length + 100
    : index;
}

function canonicalRankFromText(value) {
  const normalized = normalizeText(value);

  for (const entry of RANK_PRIORITY) {
    if (
      entry.aliases.some((alias) =>
        normalized.includes(
          normalizeText(alias),
        ),
      )
    ) {
      return entry.canonical;
    }
  }

  return "";
}

function flattenSystemGuards(documents) {
  const result = [];

  for (const document of documents || []) {
    const data = document?.data;

    const candidates = Array.isArray(data)
      ? data
      : Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.guardas)
            ? data.guardas
            : Array.isArray(data?.users)
              ? data.users
              : [];

    result.push(...candidates);
  }

  return result;
}

function profileDiscordId(profile) {
  return normalizeId(
    profile?.discordId ||
      profile?.userId ||
      profile?.id ||
      profile?._id,
  );
}

function pickProfileValue(...values) {
  for (const value of values) {
    const text = asText(value, "");

    if (text) return text;
  }

  return "";
}

function asNumber(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function asText(value, fallback = "") {
  if (value === null || value === undefined) return fallback;

  const result = String(value).trim();
  return result || fallback;
}

function normalizeId(value) {
  return asText(value, "");
}

function normalizeDate(value) {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfWeek(reference = new Date()) {
  const date = new Date(reference);
  const day = date.getDay();
  const distance = day === 0 ? 6 : day - 1;

  date.setDate(date.getDate() - distance);
  date.setHours(0, 0, 0, 0);

  return date;
}

function startOfMonth(reference = new Date()) {
  const date = new Date(reference);
  date.setDate(1);
  date.setHours(0, 0, 0, 0);

  return date;
}

function pointHours(record) {
  const start = normalizeDate(record?.startTime);
  const end = normalizeDate(record?.endTime);

  if (!start || !end || end <= start) return 0;

  const pause = Math.max(0, asNumber(record?.totalPauseTime));
  const pauseMs = pause > 0 && pause <= 86_400 ? pause * 1000 : pause;

  return Math.max(
    0,
    (end.getTime() - start.getTime() - pauseMs) / 3_600_000,
  );
}

function parseParticipantIds(value) {
  const raw = String(value || "");
  return [...new Set(raw.match(/\d{15,22}/g) || [])];
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

function daysSince(value, now = new Date()) {
  const date = normalizeDate(value);

  if (!date) return null;

  return Math.max(
    0,
    Math.floor(
      (now.getTime() - date.getTime()) /
        86_400_000,
    ),
  );
}

async function discordFetch(url, options = {}, timeoutMs = 12_000) {
  const controller = new AbortController();
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


async function fetchGuildRoles() {
  const token = getDiscordToken();
  const guildId = getGuildId();

  if (!token || !guildId) {
    return [];
  }

  const response = await discordFetch(
    `https://discord.com/api/v10/guilds/${guildId}/roles`,
    {
      headers: {
        Authorization: `Bot ${token}`,
      },
    },
  );

  if (!response.ok) {
    const raw = await response.text();

    console.warn(
      `[DRH WORKFORCE] Não foi possível carregar as roles: ${response.status} ${raw.slice(0, 160)}`,
    );

    return [];
  }

  const roles = await response.json();

  return Array.isArray(roles)
    ? roles
    : [];
}

function detectRankFromDiscordRoles(
  memberRoleIds,
  guildRolesById,
) {
  const candidateRanks = [];

  for (const roleId of memberRoleIds || []) {
    const role = guildRolesById.get(
      String(roleId),
    );

    if (!role?.name) continue;

    const canonical =
      canonicalRankFromText(role.name);

    if (!canonical) continue;

    candidateRanks.push({
      rank: canonical,
      weight: rankWeight(canonical),
      rolePosition: Number(
        role.position || 0,
      ),
    });
  }

  candidateRanks.sort((a, b) => {
    if (a.weight !== b.weight) {
      return a.weight - b.weight;
    }

    return b.rolePosition - a.rolePosition;
  });

  return candidateRanks[0]?.rank || "";
}


function messageText(message) {
  const parts = [
    String(message?.content || ""),
  ];

  for (const embed of message?.embeds || []) {
    parts.push(String(embed?.title || ""));
    parts.push(String(embed?.description || ""));

    for (const field of embed?.fields || []) {
      parts.push(String(field?.name || ""));
      parts.push(String(field?.value || ""));
    }
  }

  return parts.filter(Boolean).join("\n");
}

function channelText(channel) {
  return [
    channel?.name,
    channel?.topic,
  ]
    .filter(Boolean)
    .join("\n");
}

function extractDateFromText(text, labels) {
  const escapedLabels = labels
    .map((label) =>
      label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    )
    .join("|");

  const patterns = [
    new RegExp(
      `(?:${escapedLabels})\\s*[:\\-]?\\s*(\\d{1,2}[\\/\\-.]\\d{1,2}[\\/\\-.]\\d{2,4})`,
      "i",
    ),
    new RegExp(
      `(?:${escapedLabels})\\s*[:\\-]?\\s*(\\d{4}[\\/\\-.]\\d{1,2}[\\/\\-.]\\d{1,2})`,
      "i",
    ),
  ];

  for (const pattern of patterns) {
    const match = String(text || "").match(pattern);

    if (!match) continue;

    const raw = match[1].replace(/\./g, "/").replace(/-/g, "/");
    const parts = raw.split("/").map(Number);

    let date;

    if (parts[0] > 1900) {
      date = new Date(parts[0], parts[1] - 1, parts[2]);
    } else {
      const year = parts[2] < 100 ? 2000 + parts[2] : parts[2];
      date = new Date(year, parts[1] - 1, parts[0]);
    }

    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  return null;
}

function extractReasonFromText(text) {
  const patterns = [
    /(?:motivo|raz[aã]o|justifica[cç][aã]o)\s*[:\-]\s*([^\n\r]+)/i,
    /(?:aus[eê]ncia)\s*[:\-]\s*([^\n\r]+)/i,
  ];

  for (const pattern of patterns) {
    const match = String(text || "").match(pattern);

    if (match?.[1]) {
      return match[1].trim().slice(0, 500);
    }
  }

  return "";
}

function extractDiscordIds(text) {
  return [
    ...new Set(
      String(text || "").match(/\d{15,22}/g) || [],
    ),
  ];
}

function normalizeComparableName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function ticketStatusFromChannel(channel) {
  const normalized = normalizeComparableName(
    [
      channel?.name,
      channel?.topic,
      ...(channel?.applied_tags || []),
    ].join(" "),
  );

  if (
    normalized.includes("fechado") ||
    normalized.includes("encerrado") ||
    normalized.includes("closed") ||
    channel?.archived
  ) {
    return "CLOSED";
  }

  return "OPEN";
}

async function fetchJson(url, options = {}) {
  const token = getDiscordToken();

  const response = await discordFetch(url, {
    ...options,
    headers: {
      Authorization: `Bot ${token}`,
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const raw = await response.text();

    throw new Error(
      `Discord respondeu ${response.status}: ${raw.slice(0, 200)}`,
    );
  }

  return response.json();
}

async function fetchChannelMessages(channelId, limitPages = 3) {
  const messages = [];
  let before = null;

  for (let page = 0; page < limitPages; page += 1) {
    const url = new URL(
      `https://discord.com/api/v10/channels/${channelId}/messages`,
    );

    url.searchParams.set("limit", "100");

    if (before) {
      url.searchParams.set("before", before);
    }

    let batch;

    try {
      batch = await fetchJson(url.toString());
    } catch (error) {
      console.warn(
        `[DRH ABSENCES] Não foi possível ler mensagens do canal ${channelId}:`,
        error instanceof Error ? error.message : error,
      );
      break;
    }

    if (!Array.isArray(batch) || batch.length === 0) break;

    messages.push(...batch);

    if (batch.length < 100) break;

    before = String(batch[batch.length - 1]?.id || "");

    if (!before) break;
  }

  return messages;
}

async function discoverAbsenceTicketChannels() {
  const guildId = getGuildId();

  if (!guildId) return [];

  const allChannels = await fetchJson(
    `https://discord.com/api/v10/guilds/${guildId}/channels`,
  );

  const target = allChannels.find(
    (channel) =>
      String(channel.id) ===
      ABSENCE_TICKETS_CHANNEL_ID,
  );

  const channels = [];

  if (target) {
    channels.push(target);

    // Category: include all child ticket channels.
    if (target.type === 4) {
      channels.push(
        ...allChannels.filter(
          (channel) =>
            String(channel.parent_id || "") ===
            ABSENCE_TICKETS_CHANNEL_ID,
        ),
      );
    }
  }

  // Forum/media: include active threads from the guild.
  try {
    const activeThreads = await fetchJson(
      `https://discord.com/api/v10/guilds/${guildId}/threads/active`,
    );

    for (const thread of activeThreads?.threads || []) {
      if (
        String(thread.parent_id || "") ===
        ABSENCE_TICKETS_CHANNEL_ID
      ) {
        channels.push(thread);
      }
    }
  } catch (error) {
    console.warn(
      "[DRH ABSENCES] Não foi possível carregar threads ativas:",
      error instanceof Error ? error.message : error,
    );
  }

  // Forum archived threads.
  if (target && [15, 16].includes(Number(target.type))) {
    for (const endpoint of [
      "archived/public",
      "archived/private",
    ]) {
      try {
        const archived = await fetchJson(
          `https://discord.com/api/v10/channels/${ABSENCE_TICKETS_CHANNEL_ID}/threads/${endpoint}?limit=100`,
        );

        channels.push(
          ...(archived?.threads || []),
        );
      } catch (error) {
        console.warn(
          `[DRH ABSENCES] Não foi possível carregar ${endpoint}:`,
          error instanceof Error ? error.message : error,
        );
      }
    }
  }

  const unique = new Map();

  for (const channel of channels) {
    if (!channel?.id) continue;
    unique.set(String(channel.id), channel);
  }

  return [...unique.values()];
}

async function fetchAbsenceTickets(officialMembers) {
  const guildId = getGuildId();
  const channels = await discoverAbsenceTicketChannels();
  const tickets = [];

  const officialById = new Map(
    officialMembers.map((member) => [
      String(member.discordId),
      member,
    ]),
  );

  for (const channel of channels) {
    // Skip the category container itself.
    if (Number(channel.type) === 4) continue;

    const messages = await fetchChannelMessages(
      channel.id,
      3,
    );

    const combined = [
      channelText(channel),
      ...messages.map(messageText),
    ]
      .filter(Boolean)
      .join("\n");

    const ids = extractDiscordIds(combined);

    let matchedMember = ids
      .map((id) => officialById.get(String(id)))
      .find(Boolean);

    if (!matchedMember) {
      const authorIds = messages
        .map((message) =>
          String(message?.author?.id || ""),
        )
        .filter(Boolean);

      matchedMember = authorIds
        .map((id) => officialById.get(id))
        .find(Boolean);
    }

    if (!matchedMember) {
      const normalizedTicketText =
        normalizeComparableName(combined);

      matchedMember = officialMembers.find((member) => {
        const normalizedName =
          normalizeComparableName(member.displayName);

        return (
          normalizedName.length >= 4 &&
          normalizedTicketText.includes(normalizedName)
        );
      });
    }

    const startDate = extractDateFromText(
      combined,
      [
        "data de início",
        "data inicio",
        "início",
        "inicio",
        "desde",
      ],
    );

    const endDate = extractDateFromText(
      combined,
      [
        "data de fim",
        "fim",
        "regresso",
        "retorno",
        "até",
        "ate",
      ],
    );

    const reason = extractReasonFromText(
      combined,
    );

    const firstMessage = [...messages].sort(
      (a, b) =>
        new Date(a.timestamp || 0) -
        new Date(b.timestamp || 0),
    )[0];

    const lastMessage = [...messages].sort(
      (a, b) =>
        new Date(b.timestamp || 0) -
        new Date(a.timestamp || 0),
    )[0];

    tickets.push({
      ticketChannelId: String(channel.id),
      ticketName:
        channel.name ||
        `ticket-${channel.id}`,
      parentChannelId:
        String(channel.parent_id || "") || null,
      guildId,
      jumpUrl:
        guildId
          ? `https://discord.com/channels/${guildId}/${channel.id}`
          : null,
      status: ticketStatusFromChannel(channel),
      archived: Boolean(channel.archived),
      matchedDiscordId:
        matchedMember?.discordId || null,
      matchedName:
        matchedMember?.displayName || null,
      reason,
      periodStart:
        startDate?.toISOString() || null,
      periodEnd:
        endDate?.toISOString() || null,
      openedByDiscordId:
        String(firstMessage?.author?.id || "") || null,
      openedByName:
        firstMessage?.author?.global_name ||
        firstMessage?.author?.username ||
        null,
      openedAt:
        firstMessage?.timestamp || null,
      updatedAt:
        lastMessage?.edited_timestamp ||
        lastMessage?.timestamp ||
        firstMessage?.timestamp ||
        null,
      contentPreview:
        combined.slice(0, 3000),
      missingFields: [
        !matchedMember ? "MILITAR" : null,
        !reason ? "MOTIVO" : null,
        !startDate ? "DATA_INICIO" : null,
        !endDate ? "DATA_FIM" : null,
      ].filter(Boolean),
    });
  }

  return tickets;
}

function daysUntil(value, now = new Date()) {
  const date = normalizeDate(value);

  if (!date) return null;

  return Math.ceil(
    (date.getTime() - now.getTime()) /
      86_400_000,
  );
}

function absenceState({
  hasRole,
  ticket,
  now = new Date(),
}) {
  if (!ticket) {
    return hasRole
      ? "ROLE_WITHOUT_TICKET"
      : "NO_ABSENCE";
  }

  const end = normalizeDate(ticket.periodEnd);

  if (
    ticket.status === "CLOSED" &&
    hasRole
  ) {
    return "CLOSED_TICKET_ROLE_ACTIVE";
  }

  if (
    end &&
    end < now &&
    hasRole
  ) {
    return "ENDED_ROLE_ACTIVE";
  }

  if (
    ticket.status === "OPEN" &&
    !hasRole
  ) {
    return "TICKET_WITHOUT_ROLE";
  }

  if (
    ticket.status === "OPEN" &&
    hasRole
  ) {
    return "ACTIVE";
  }

  return "REVIEW";
}

async function fetchGuildMembers() {
  const token = getDiscordToken();
  const guildId = getGuildId();

  if (!token || !guildId) {
    throw new Error(
      "DISCORD_TOKEN e DISCORD_GUILD_ID são obrigatórios para carregar o efetivo.",
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
        `Discord respondeu ${response.status}: ${raw.slice(0, 180)}`,
      );
    }

    const batch = await response.json();

    if (!Array.isArray(batch) || batch.length === 0) break;

    members.push(...batch);

    if (batch.length < 1000) break;

    after = String(
      batch[batch.length - 1]?.user?.id || "",
    );

    if (!after) break;
  }

  return members;
}

function memberName(member) {
  return (
    member?.nick ||
    member?.user?.global_name ||
    member?.user?.username ||
    `Militar ${member?.user?.id || ""}`
  );
}

function memberRoleGroup(roles) {
  if (roles.includes(ROLE_IDS.EFETIVO_GNR)) {
    return "EFETIVO_GNR";
  }

  return null;
}

function activityStatus(daysInactive, hasAbsence) {
  if (hasAbsence) {
    return {
      code: "JUSTIFIED_ABSENCE",
      label: "Ausência justificada",
      severity: "INFO",
    };
  }

  if (daysInactive === null) {
    return {
      code: "NO_ACTIVITY",
      label: "Sem atividade registada",
      severity: "CRITICAL",
    };
  }

  if (daysInactive >= 15) {
    return {
      code: "CRITICAL_INACTIVITY",
      label: "Inatividade crítica",
      severity: "CRITICAL",
    };
  }

  if (daysInactive >= 8) {
    return {
      code: "HIGH_INACTIVITY",
      label: "Inatividade elevada",
      severity: "HIGH",
    };
  }

  if (daysInactive >= 5) {
    return {
      code: "ATTENTION",
      label: "Atenção",
      severity: "MEDIUM",
    };
  }

  return {
    code: "ACTIVE",
    label: "Ativo",
    severity: "LOW",
  };
}

export async function buildDRHWorkforceSnapshot(force = false) {
  const cacheKey = "workforce";

  if (!force) {
    const cached = workforceCache.get(cacheKey);

    if (
      cached &&
      Date.now() - cached.createdAt < CACHE_TTL_MS
    ) {
      return structuredClone(cached.data);
    }
  }

  const now = new Date();
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);

  const [members, guildRoles] =
    await Promise.all([
      fetchGuildMembers(),
      fetchGuildRoles(),
    ]);

  const guildRolesById = new Map(
    guildRoles.map((role) => [
      String(role.id),
      role,
    ]),
  );

  const officialMembers = members
    .map((member) => {
      const roles = Array.isArray(member?.roles)
        ? member.roles.map(String)
        : [];

      const roleGroup = memberRoleGroup(roles);

      if (!roleGroup) return null;

      const discordId = normalizeId(member?.user?.id);

      if (!discordId) return null;

      return {
        discordId,
        displayName: memberName(member),
        roleGroup,
        roleIds: roles,
        discordRank:
          detectRankFromDiscordRoles(
            roles,
            guildRolesById,
          ),
        hasAbsenceRole: roles.includes(
          ROLE_IDS.AUSENCIAS,
        ),
      };
    })
    .filter(Boolean);

  const officialIds = officialMembers.map(
    (item) => item.discordId,
  );

  const absenceTickets =
    await fetchAbsenceTickets(
      officialMembers,
    );

  const ticketsByDiscordId = new Map();

  for (const ticket of absenceTickets) {
    if (!ticket.matchedDiscordId) continue;

    const id = String(
      ticket.matchedDiscordId,
    );

    if (!ticketsByDiscordId.has(id)) {
      ticketsByDiscordId.set(id, []);
    }

    ticketsByDiscordId.get(id).push(
      ticket,
    );
  }

  const [
    users,
    systemGuardDocuments,
    points,
    cps,
    absenceProcesses,
    allDRHProcesses,
  ] = await Promise.all([
    User.find({
      discordId: { $in: officialIds },
    }).lean(),

    SystemData.find({
      type: {
        $in: [
          "guardas",
          "guards",
          "users",
          "efetivo",
          "members",
        ],
      },
    }).lean(),

    Ponto.find({
      userId: { $in: officialIds },
    })
      .sort({ startTime: -1 })
      .lean(),

    CP.find({
      status: "FECHADO",
      $or: [
        { commanderId: { $in: officialIds } },
        {
          participants: {
            $regex: officialIds.join("|"),
          },
        },
      ],
    })
      .sort({ startTime: -1 })
      .lean(),

    DRHProcess.find({
      type: "ABSENCE",
      subjectDiscordId: { $in: officialIds },
      status: {
        $in: ["OPEN", "AWAITING_COMMAND", "APPROVED"],
      },
    })
      .sort({ createdAt: -1 })
      .lean(),

    DRHProcess.find({
      subjectDiscordId: {
        $in: officialIds,
      },
    })
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  const userById = new Map(
    users.map((user) => [
      normalizeId(user?.discordId),
      user,
    ]),
  );

  const systemProfiles =
    flattenSystemGuards(
      systemGuardDocuments,
    );

  const systemProfileById = new Map(
    systemProfiles
      .map((profile) => [
        profileDiscordId(profile),
        profile,
      ])
      .filter(([id]) => Boolean(id)),
  );

  const pointsById = new Map();

  for (const point of points) {
    const id = normalizeId(point?.userId);

    if (!pointsById.has(id)) {
      pointsById.set(id, []);
    }

    pointsById.get(id).push(point);
  }

  const cpsById = new Map();

  for (const cp of cps) {
    for (const id of patrolMemberIds(cp)) {
      if (!officialIds.includes(id)) continue;

      if (!cpsById.has(id)) {
        cpsById.set(id, []);
      }

      cpsById.get(id).push(cp);
    }
  }

  const absenceProcessById = new Map();

  for (const process of absenceProcesses) {
    const id = normalizeId(
      process?.subjectDiscordId,
    );

    if (!absenceProcessById.has(id)) {
      absenceProcessById.set(id, process);
    }
  }

  const allProcessesById = new Map();

  for (const process of allDRHProcesses) {
    const id = normalizeId(
      process?.subjectDiscordId,
    );

    if (!allProcessesById.has(id)) {
      allProcessesById.set(id, []);
    }

    allProcessesById.get(id).push(
      process,
    );
  }

  const roster = officialMembers.map((member) => {
    const user = userById.get(member.discordId);
    const systemProfile =
      systemProfileById.get(member.discordId);

    const userPoints = pointsById.get(member.discordId) || [];
    const userCps = cpsById.get(member.discordId) || [];
    const absenceProcess =
      absenceProcessById.get(member.discordId) || null;

    const memberTickets =
      ticketsByDiscordId.get(member.discordId) || [];

    const primaryTicket = memberTickets
      .slice()
      .sort((a, b) => {
        const aOpen =
          a.status === "OPEN" ? 1 : 0;
        const bOpen =
          b.status === "OPEN" ? 1 : 0;

        if (aOpen !== bOpen) {
          return bOpen - aOpen;
        }

        return (
          new Date(b.updatedAt || 0) -
          new Date(a.updatedAt || 0)
        );
      })[0] || null;

    const memberProcesses =
      allProcessesById.get(member.discordId) || [];

    const closedPoints = userPoints.filter(
      (point) =>
        point?.status === "FECHADO" &&
        point?.endTime,
    );

    const openPoints = userPoints.filter(
      (point) => point?.status === "ABERTO",
    );

    const totalHoursFromPoints =
      closedPoints.reduce(
        (sum, point) => sum + pointHours(point),
        0,
      );

    const weekHours = closedPoints
      .filter(
        (point) =>
          normalizeDate(point?.endTime) >= weekStart,
      )
      .reduce(
        (sum, point) => sum + pointHours(point),
        0,
      );

    const monthHours = closedPoints
      .filter(
        (point) =>
          normalizeDate(point?.endTime) >= monthStart,
      )
      .reduce(
        (sum, point) => sum + pointHours(point),
        0,
      );

    const lastPointDate = normalizeDate(
      closedPoints[0]?.endTime ||
        closedPoints[0]?.startTime,
    );

    const lastCpDate = normalizeDate(
      userCps[0]?.endTime ||
        userCps[0]?.startTime,
    );

    const activityDates = [
      lastPointDate,
      lastCpDate,
    ].filter(Boolean);

    const lastActivityAt =
      activityDates.length > 0
        ? new Date(
            Math.max(
              ...activityDates.map((date) =>
                date.getTime(),
              ),
            ),
          )
        : null;

    const daysInactive = daysSince(
      lastActivityAt,
      now,
    );

    const hasAbsence =
      member.hasAbsenceRole ||
      Boolean(absenceProcess);

    const status = activityStatus(
      daysInactive,
      hasAbsence,
    );

    return {
      discordId: member.discordId,
      name:
        pickProfileValue(
          user?.warName,
          systemProfile?.warName,
          systemProfile?.nome,
          systemProfile?.displayName,
          systemProfile?.username,
          member.displayName,
        ),
      rank:
        pickProfileValue(
          member.discordRank,
          canonicalRankFromText(
            user?.rank,
          ),
          canonicalRankFromText(
            systemProfile?.rank,
          ),
          canonicalRankFromText(
            systemProfile?.posto,
          ),
          canonicalRankFromText(
            systemProfile?.patente,
          ),
          user?.rank,
          systemProfile?.rank,
          systemProfile?.posto,
          systemProfile?.patente,
          "Sem patente",
        ),
      unit:
        pickProfileValue(
          user?.unidade,
          systemProfile?.unidade,
          systemProfile?.unit,
          systemProfile?.departamento,
          "Patrulha",
        ),
      state:
        pickProfileValue(
          user?.estado,
          systemProfile?.estado,
          systemProfile?.status,
          "Folga",
        ),
      roleGroup: member.roleGroup,

      totalHours: Math.max(
        asNumber(user?.totalHours),
        asNumber(systemProfile?.totalHours),
        asNumber(systemProfile?.horas),
        asNumber(systemProfile?.hours),
        totalHoursFromPoints,
      ),
      storedTotalHours: Math.max(
        asNumber(user?.totalHours),
        asNumber(systemProfile?.totalHours),
        asNumber(systemProfile?.horas),
        asNumber(systemProfile?.hours),
      ),
      calculatedPointHours:
        totalHoursFromPoints,
      weekHours,
      monthHours,
      shifts: closedPoints.length,
      openShifts: openPoints.length,
      openShiftDetails: openPoints.map(
        (point) => ({
          _id: String(point._id),
          startTime: point.startTime,
          tipo: point.tipo,
          descricao: point.descricao,
        }),
      ),

      lastPointAt:
        lastPointDate?.toISOString() || null,
      lastPatrolAt:
        lastCpDate?.toISOString() || null,
      lastActivityAt:
        lastActivityAt?.toISOString() || null,
      daysInactive,

      hasAbsenceRole:
        member.hasAbsenceRole,
      hasAbsenceProcess:
        Boolean(absenceProcess),
      hasAbsenceTicket:
        Boolean(primaryTicket),
      absenceTickets:
        memberTickets,
      absenceState:
        absenceState({
          hasRole:
            member.hasAbsenceRole,
          ticket:
            primaryTicket,
          now,
        }),
      absence: primaryTicket
        ? {
            source: "DISCORD_TICKET",
            ticketChannelId:
              primaryTicket.ticketChannelId,
            ticketName:
              primaryTicket.ticketName,
            ticketUrl:
              primaryTicket.jumpUrl,
            reason:
              primaryTicket.reason,
            description:
              primaryTicket.reason ||
              primaryTicket.contentPreview,
            periodStart:
              primaryTicket.periodStart,
            periodEnd:
              primaryTicket.periodEnd,
            status:
              primaryTicket.status,
            openedByDiscordId:
              primaryTicket.openedByDiscordId,
            openedByName:
              primaryTicket.openedByName,
            openedAt:
              primaryTicket.openedAt,
            updatedAt:
              primaryTicket.updatedAt,
            missingFields:
              primaryTicket.missingFields,
            daysRemaining:
              daysUntil(
                primaryTicket.periodEnd,
                now,
              ),
          }
        : absenceProcess
          ? {
              source: "DRH_PROCESS",
              processId:
                String(absenceProcess._id),
              processNumber:
                absenceProcess.processNumber,
              title:
                absenceProcess.title,
              description:
                absenceProcess.description,
              reason:
                absenceProcess.description,
              periodStart:
                absenceProcess.periodStart,
              periodEnd:
                absenceProcess.periodEnd,
              status:
                absenceProcess.status,
              daysRemaining:
                daysUntil(
                  absenceProcess.periodEnd,
                  now,
                ),
            }
          : null,

      processes: memberProcesses.map(
        (process) => ({
          _id: String(process._id),
          processNumber:
            process.processNumber,
          type: process.type,
          status: process.status,
          title: process.title,
          description:
            process.description,
          createdAt: process.createdAt,
          updatedAt: process.updatedAt,
          periodStart:
            process.periodStart,
          periodEnd:
            process.periodEnd,
          weaponsPermit:
            process.weaponsPermit,
          dismissal:
            process.dismissal,
        }),
      ),
      recentPoints: closedPoints
        .slice(0, 10)
        .map((point) => ({
          _id: String(point._id),
          startTime: point.startTime,
          endTime: point.endTime,
          hours: pointHours(point),
          tipo: point.tipo,
          descricao: point.descricao,
        })),
      recentPatrols: userCps
        .slice(0, 10)
        .map((cp) => ({
          _id: String(cp._id),
          number: cp.number,
          startTime: cp.startTime,
          endTime: cp.endTime,
          vehicle: cp.vehicle,
          commanderId: cp.commanderId,
          participants: cp.participants,
        })),
      activityStatus: status,
      rankOrder: rankWeight(
        pickProfileValue(
          member.discordRank,
          canonicalRankFromText(
            user?.rank,
          ),
          canonicalRankFromText(
            systemProfile?.rank,
          ),
          canonicalRankFromText(
            systemProfile?.posto,
          ),
          canonicalRankFromText(
            systemProfile?.patente,
          ),
          user?.rank,
          systemProfile?.rank,
          systemProfile?.posto,
          systemProfile?.patente,
          "Sem patente",
        ),
      ),
      profileSource: user
        ? "USER"
        : systemProfile
          ? "SYSTEM_DATA"
          : "DISCORD",
      rankSource: member.discordRank
        ? "DISCORD_ROLE"
        : user?.rank
          ? "USER"
          : (
              systemProfile?.rank ||
              systemProfile?.posto ||
              systemProfile?.patente
            )
            ? "SYSTEM_DATA"
            : "UNKNOWN",
    };
  });

  roster.sort((a, b) => {
    const rankDifference =
      rankWeight(a.rank) -
      rankWeight(b.rank);

    if (rankDifference !== 0) {
      return rankDifference;
    }

    return a.name.localeCompare(
      b.name,
      "pt-PT",
    );
  });

  const inactive = roster.filter(
    (item) =>
      item.hasAbsenceRole ||
      item.daysInactive === null ||
      item.daysInactive >= 5,
  );

  const absences = roster.filter(
    (item) =>
      item.hasAbsenceRole ||
      item.hasAbsenceTicket,
  );

  const unmatchedAbsenceTickets =
    absenceTickets.filter(
      (ticket) =>
        !ticket.matchedDiscordId,
    );

  const result = {
    generatedAt: now.toISOString(),
    roles: ROLE_IDS,
    roster,
    inactive,
    absences,
    absenceTickets,
    unmatchedAbsenceTickets,
    summary: {
      total: roster.length,
      guards: roster.length,
      sergeants: roster.filter(
        (item) =>
          String(item.rank || "")
            .toLowerCase()
            .includes("sargento"),
      ).length,
      weekHours: roster.reduce(
        (sum, item) =>
          sum + item.weekHours,
        0,
      ),
      monthHours: roster.reduce(
        (sum, item) =>
          sum + item.monthHours,
        0,
      ),
      openShifts: roster.reduce(
        (sum, item) =>
          sum + item.openShifts,
        0,
      ),
      inactiveOverFiveDays:
        inactive.filter(
          (item) =>
            !item.hasAbsenceRole &&
            (
              item.daysInactive === null ||
              item.daysInactive >= 5
            ),
        ).length,
      activeAbsences:
        absences.filter(
          (item) =>
            item.absenceState === "ACTIVE",
        ).length,
      ticketAbsences:
        absenceTickets.length,
      unmatchedAbsenceTickets:
        unmatchedAbsenceTickets.length,
    },
  };

  workforceCache.set(cacheKey, {
    createdAt: Date.now(),
    data: result,
  });

  return structuredClone(result);
}
