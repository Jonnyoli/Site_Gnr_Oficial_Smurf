const AGENDA_CHANNEL_ID =
  process.env.DISCORD_AGENDA_CHANNEL_ID ||
  "1235760967476969553";

const ANNOUNCEMENTS_CHANNEL_ID =
  process.env.DISCORD_ANNOUNCEMENTS_CHANNEL_ID ||
  "1229940972134207498";

export const UNIT_ROLE_IDS = {
  GIOE: "1147878941974077473",
  DI: "1187379939708780544",
  NIC: "1296910359994564700",
  UNT: "1147878941885988929",
  USHE: "1332075102879219793",
  GSA: "1147878941927952470",
};

export const UNIT_LABELS = {
  GIOE: "Grupo de Intervenção de Operações Especiais",
  DI: "Destacamento de Intervenção",
  NIC: "Núcleo de Investigação Criminal",
  UNT: "Unidade Nacional de Trânsito",
  USHE: "Unidade de Segurança e Honras de Estado",
  GSA: "Grupo de Suporte Aéreo",
};

const UNIT_BY_ROLE_ID = Object.fromEntries(
  Object.entries(UNIT_ROLE_IDS).map(
    ([unit, roleId]) => [roleId, unit],
  ),
);

function token() {
  return process.env.DISCORD_TOKEN || process.env.TOKEN || "";
}

function guildId() {
  return String(
    process.env.DISCORD_GUILD_ID ||
      process.env.GUILD_IDS ||
      "",
  ).split(",")[0].trim();
}

async function discordFetch(url, options = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        Authorization: `Bot ${token()}`,
        ...(options.headers || {}),
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function json(url) {
  const response = await discordFetch(url);

  if (!response.ok) {
    const raw = await response.text();
    throw new Error(`Discord ${response.status}: ${raw.slice(0, 200)}`);
  }

  return response.json();
}

async function getGuildRoleMap() {
  const gid = guildId();

  if (!gid) return new Map();

  try {
    const roles = await json(
      `https://discord.com/api/v10/guilds/${gid}/roles`,
    );

    return new Map(
      (Array.isArray(roles) ? roles : []).map(
        (role) => [
          String(role.id),
          String(role.name || "Unidade"),
        ],
      ),
    );
  } catch (error) {
    console.warn(
      "[DISCORD FEEDS] Não foi possível carregar as roles:",
      error instanceof Error ? error.message : error,
    );

    return new Map();
  }
}

function stripMarkdown(value) {
  return String(value || "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/~~(.*?)~~/g, "$1")
    .replace(/`{1,3}(.*?)`{1,3}/g, "$1")
    .replace(/^#+\s*/gm, "")
    .trim();
}

function replaceRoleMentions(value, roleMap) {
  return stripMarkdown(
    String(value || "").replace(
      /<@&(\d{15,22})>/g,
      (_match, roleId) =>
        roleMap.get(String(roleId)) ||
        UNIT_LABELS[UNIT_BY_ROLE_ID[String(roleId)]] ||
        "Unidade",
    ),
  );
}

function extractFieldValue(text, labels) {
  const escaped = labels
    .map((label) =>
      label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    )
    .join("|");

  const match = String(text || "").match(
    new RegExp(
      `(?:^|\\n)\\s*(?:${escaped})\\s*:\\s*([^\\n\\r]+)`,
      "i",
    ),
  );

  return match?.[1]
    ? stripMarkdown(match[1].trim())
    : "";
}

function resolveUnitName(text, detectedUnits, roleMap) {
  const roleMention = String(text || "").match(
    /<@&(\d{15,22})>/,
  );

  if (roleMention) {
    const roleName = roleMap.get(roleMention[1]);

    if (roleName) return roleName;
  }

  const explicitUnit = extractFieldValue(
    replaceRoleMentions(text, roleMap),
    ["Unidade", "Unit"],
  );

  if (explicitUnit) return explicitUnit;

  const primary = detectedUnits[0];

  if (primary) {
    return UNIT_LABELS[primary] || primary;
  }

  return "Toda a Guarda";
}

function extractActivityTitle(text, roleMap) {
  const cleaned = replaceRoleMentions(text, roleMap);

  const activity = extractFieldValue(
    cleaned,
    ["Atividade", "Actividade", "Evento", "Ação", "Acao"],
  );

  if (activity) return activity;

  const firstUsefulLine = cleaned
    .split("\n")
    .map((line) => line.trim())
    .find(
      (line) =>
        line &&
        !/^unidade\s*:/i.test(line) &&
        !/^data\s*:/i.test(line) &&
        !/^hora\s*:/i.test(line) &&
        !/^local\s*:/i.test(line),
    );

  return firstUsefulLine?.slice(0, 160) || "Evento da agenda";
}

function fullText(message) {
  const parts = [message?.content || ""];

  for (const embed of message?.embeds || []) {
    parts.push(embed?.title || "");
    parts.push(embed?.description || "");

    for (const field of embed?.fields || []) {
      parts.push(field?.name || "");
      parts.push(field?.value || "");
    }
  }

  return parts.filter(Boolean).join("\n");
}

function parseDate(text, fallback) {
  const patterns = [
    /(?:data|dia)\s*[:\-]?\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i,
    /\b(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})\b/,
    /\b(\d{4}[\/\-.]\d{1,2}[\/\-.]\d{1,2})\b/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;

    const raw = match[1].replace(/[.-]/g, "/");
    const parts = raw.split("/").map(Number);
    let date;

    if (parts[0] > 1900) {
      date = new Date(parts[0], parts[1] - 1, parts[2]);
    } else {
      const year = parts[2] < 100 ? 2000 + parts[2] : parts[2];
      date = new Date(year, parts[1] - 1, parts[0]);
    }

    if (!Number.isNaN(date.getTime())) return date;
  }

  return new Date(fallback);
}

function parseTime(text) {
  const match =
    text.match(/(?:hora|horário|horario)\s*[:\-]?\s*(\d{1,2})[:h](\d{2})/i) ||
    text.match(/\b(\d{1,2}):(\d{2})\b/);

  if (!match) return { hours: 21, minutes: 0 };

  return { hours: Number(match[1]), minutes: Number(match[2]) };
}

function detectUnits(text) {
  const raw = String(text || "");
  const upper = raw.toUpperCase();
  const units = new Set();

  for (const [roleId, unit] of Object.entries(
    UNIT_BY_ROLE_ID,
  )) {
    if (
      raw.includes(`<@&${roleId}>`) ||
      raw.includes(roleId)
    ) {
      units.add(unit);
    }
  }

  for (const [unit, label] of Object.entries(
    UNIT_LABELS,
  )) {
    const aliases = [
      unit,
      label,
      `@${unit}`,
    ];

    if (
      aliases.some((alias) =>
        upper.includes(
          String(alias).toUpperCase(),
        ),
      )
    ) {
      units.add(unit);
    }
  }

  return [...units];
}

function unitDisplay(unit) {
  if (!unit || unit === "GERAL") {
    return {
      key: "GERAL",
      name: "Toda a Guarda",
      mention: "@Todos",
      roleId: null,
    };
  }

  return {
    key: unit,
    name: UNIT_LABELS[unit] || unit,
    mention: `@${unit}`,
    roleId: UNIT_ROLE_IDS[unit] || null,
  };
}

function extractTitle(message, text) {
  const embedTitle = message?.embeds?.find((embed) => embed?.title)?.title;
  if (embedTitle) return embedTitle;

  const line = String(text)
    .split("\n")
    .map((item) => item.trim())
    .find(Boolean);

  return line?.slice(0, 160) || "Evento da agenda";
}

async function readChannelMessages(channelId, limit = 100) {
  const messages = await json(
    `https://discord.com/api/v10/channels/${channelId}/messages?limit=${limit}`,
  );

  return Array.isArray(messages) ? messages : [];
}

export async function getAgendaEvents() {
  const [messages, roleMap] = await Promise.all([
    readChannelMessages(AGENDA_CHANNEL_ID, 100),
    getGuildRoleMap(),
  ]);

  const gid = guildId();

  return messages
    .map((message) => {
      const rawText = fullText(message);
      const text = replaceRoleMentions(
        rawText,
        roleMap,
      );
      const date = parseDate(text, message.timestamp);
      const time = parseTime(text);
      date.setHours(time.hours, time.minutes, 0, 0);

      const detectedUnits =
        detectUnits(rawText);

      const primaryUnit =
        detectedUnits[0] || "GERAL";

      const resolvedUnitName =
        resolveUnitName(
          rawText,
          detectedUnits,
          roleMap,
        );

      return {
        id: String(message.id),
        eventKey: `agenda:${message.id}`,
        title: extractActivityTitle(
          rawText,
          roleMap,
        ),
        description: text,
        unit: primaryUnit,
        unitInfo: {
          ...unitDisplay(primaryUnit),
          name: resolvedUnitName,
          mention: resolvedUnitName,
        },
        units:
          detectedUnits.length > 0
            ? detectedUnits.map((unit) => ({
                ...unitDisplay(unit),
                name:
                  unit === primaryUnit
                    ? resolvedUnitName
                    : UNIT_LABELS[unit] || unit,
                mention:
                  unit === primaryUnit
                    ? resolvedUnitName
                    : UNIT_LABELS[unit] || unit,
              }))
            : [
                {
                  ...unitDisplay("GERAL"),
                  name: resolvedUnitName,
                  mention: resolvedUnitName,
                },
              ],
        startsAt: date.toISOString(),
        authorName:
          message?.author?.global_name ||
          message?.author?.username ||
          "Comando",
        createdAt: message.timestamp,
        jumpUrl: gid
          ? `https://discord.com/channels/${gid}/${AGENDA_CHANNEL_ID}/${message.id}`
          : null,
        attachments: (message.attachments || []).map((item) => ({
          id: item.id,
          filename: item.filename,
          url: item.url,
          contentType: item.content_type,
        })),
      };
    })
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime(),
    );
}

export async function getAnnouncements() {
  const [messages, roleMap] = await Promise.all([
    readChannelMessages(
      ANNOUNCEMENTS_CHANNEL_ID,
      100,
    ),
    getGuildRoleMap(),
  ]);

  const gid = guildId();

  return messages
    .map((message) => {
      const rawText = fullText(message);
      const text = replaceRoleMentions(
        rawText,
        roleMap,
      );
      const detectedUnits =
        detectUnits(rawText);

      const resolvedUnits =
        detectedUnits.length > 0
          ? detectedUnits.map((unit) => {
              const roleId =
                UNIT_ROLE_IDS[unit];

              return {
                ...unitDisplay(unit),
                name:
                  roleMap.get(roleId) ||
                  UNIT_LABELS[unit] ||
                  unit,
                mention:
                  roleMap.get(roleId) ||
                  UNIT_LABELS[unit] ||
                  unit,
              };
            })
          : [
              {
                ...unitDisplay("GERAL"),
                name: "Toda a Guarda",
                mention: "Toda a Guarda",
              },
            ];

      return {
      id: String(message.id),
      title: stripMarkdown(
        extractTitle(message, text),
      ),
      content: text,
      units: resolvedUnits,
      authorName:
        message?.author?.global_name ||
        message?.author?.username ||
        "Comando-Geral",
      publishedAt: message.timestamp,
      editedAt: message.edited_timestamp,
      pinned: Boolean(message.pinned),
      jumpUrl: gid
        ? `https://discord.com/channels/${gid}/${ANNOUNCEMENTS_CHANNEL_ID}/${message.id}`
        : null,
      attachments: (message.attachments || []).map((item) => ({
        id: item.id,
        filename: item.filename,
        url: item.url,
        contentType: item.content_type,
      })),
    };
    })
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() -
        new Date(a.publishedAt).getTime(),
    );
}

export async function getGuildMembers() {
  const gid = guildId();
  const members = [];
  let after = "0";

  for (let page = 0; page < 20; page += 1) {
    const batch = await json(
      `https://discord.com/api/v10/guilds/${gid}/members?limit=1000&after=${after}`,
    );

    if (!Array.isArray(batch) || batch.length === 0) break;

    members.push(...batch);

    if (batch.length < 1000) break;

    after = String(batch[batch.length - 1]?.user?.id || "");
    if (!after) break;
  }

  return members;
}

export async function sendDirectMessage(discordId, content) {
  const dmResponse = await discordFetch(
    "https://discord.com/api/v10/users/@me/channels",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipient_id: discordId }),
    },
  );

  if (!dmResponse.ok) {
    throw new Error(`Não foi possível abrir DM (${dmResponse.status}).`);
  }

  const dm = await dmResponse.json();

  const sendResponse = await discordFetch(
    `https://discord.com/api/v10/channels/${dm.id}/messages`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    },
  );

  if (!sendResponse.ok) {
    throw new Error(`Não foi possível enviar DM (${sendResponse.status}).`);
  }
}
