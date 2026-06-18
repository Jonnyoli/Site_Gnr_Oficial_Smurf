import "dotenv/config";

import DocumentRecord from "../models/DocumentRecord.js";

export const DOCUMENTS_CHANNEL_ID =
  process.env.DOCUMENTS_CHANNEL_ID ||
  "1345539134160244776";

const FORUM_CHANNEL_TYPES = new Set([15, 16]);

/**
 * ============================================================
 * CONFIGURAÇÃO
 * ============================================================
 */

function getDiscordToken() {
  return (
    process.env.DISCORD_TOKEN ||
    process.env.TOKEN ||
    ""
  ).trim();
}

function getDiscordGuildId() {
  return (
    process.env.DISCORD_GUILD_ID ||
    process.env.GUILD_IDS ||
    ""
  )
    .split(",")[0]
    .trim();
}

/**
 * ============================================================
 * CATEGORIAS
 * ============================================================
 */

const CATEGORY_RULES = [
  {
    category: "REGULAMENTOS",
    keys: [
      "#regulamento",
      "#regulamentos",
      "regulamento",
    ],
  },

  {
    category: "GUIAS",
    keys: [
      "#guia",
      "#manual",
      "#guias",
      "manual",
    ],
  },

  {
    category: "MODELOS",
    keys: [
      "#modelo",
      "#template",
      "#minuta",
      "modelo",
    ],
  },

  {
    category: "FORMACAO",
    keys: [
      "#formacao",
      "#formação",
      "#curso",
      "formação",
    ],
  },

  {
    category: "PROCEDIMENTOS",
    keys: [
      "#procedimento",
      "#procedimentos",
      "procedimento",
    ],
  },

  {
    category: "LEGISLACAO",
    keys: [
      "#legislacao",
      "#legislação",
      "#lei",
      "legislação",
    ],
  },

  {
    category: "COMUNICADOS",
    keys: [
      "#comunicado",
      "#ordem",
      "#informacao",
      "#informação",
      "comunicado",
    ],
  },

  {
    category: "RELATORIOS",
    keys: [
      "#relatorio",
      "#relatório",
      "#relatorios",
      "#relatórios",
      "relatório",
    ],
  },
];

/**
 * ============================================================
 * FUNÇÕES DE TEXTO
 * ============================================================
 */

function normalizeText(value = "") {
  return String(value)
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function extractTags(content = "") {
  const matches =
    String(content).match(
      /#[\p{L}\p{N}_-]+/gu,
    ) || [];

  return [
    ...new Set(
      matches.map((tag) =>
        tag.toLowerCase(),
      ),
    ),
  ];
}

function detectCategory(
  content = "",
  threadName = "",
) {
  const normalized =
    `${String(threadName)} ${String(content)}`.toLowerCase();

  for (const rule of CATEGORY_RULES) {
    if (
      rule.keys.some((key) =>
        normalized.includes(key),
      )
    ) {
      return rule.category;
    }
  }

  return "OUTROS";
}

function detectVisibility(content = "") {
  const normalized =
    String(content).toLowerCase();

  if (
    normalized.includes("#comando") ||
    normalized.includes("#command_only") ||
    normalized.includes("#reservado")
  ) {
    return "COMMAND_ONLY";
  }

  if (
    normalized.includes("#restrito") ||
    normalized.includes("#restricted")
  ) {
    return "RESTRICTED";
  }

  return "PUBLIC";
}

function detectFeatured(content = "") {
  const normalized =
    String(content).toLowerCase();

  return (
    normalized.includes("#destaque") ||
    normalized.includes("#featured")
  );
}

function extractAllowedRoleIds(
  content = "",
) {
  const roleMentions =
    String(content).match(
      /<@&(\d+)>/g,
    ) || [];

  return [
    ...new Set(
      roleMentions
        .map(
          (mention) =>
            mention.match(/\d+/)?.[0],
        )
        .filter(Boolean),
    ),
  ];
}

function removeControlTokens(value = "") {
  return String(value)
    .replace(/<@&\d+>/g, "")
    .replace(
      /#(regulamento|regulamentos|guia|guias|manual|modelo|template|minuta|formacao|formação|curso|procedimento|procedimentos|legislacao|legislação|lei|comunicado|ordem|informacao|informação|relatorio|relatório|relatorios|relatórios|destaque|featured|comando|command_only|reservado|restrito|restricted)\b/giu,
      "",
    )
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractTitleAndDescription(
  message,
  threadName = "",
) {
  const raw = normalizeText(
    message?.content || "",
  );

  const clean =
    removeControlTokens(raw);

  const lines = clean
    .split("\n")
    .map((line) =>
      line
        .replace(/^#{1,6}\s*/, "")
        .replace(/^[>*-]\s*/, "")
        .replace(/[*_`]/g, "")
        .trim(),
    )
    .filter(Boolean);

  const firstAttachment =
    message?.attachments?.[0];

  const fallbackName =
    threadName ||
    (firstAttachment?.filename
      ? firstAttachment.filename.replace(
          /\.[^.]+$/,
          "",
        )
      : "Documento sem título");

  const title = (
    threadName ||
    lines[0] ||
    fallbackName
  ).slice(0, 180);

  const descriptionLines =
    threadName &&
    lines[0] === threadName
      ? lines.slice(1)
      : lines;

  const description =
    descriptionLines
      .join("\n")
      .slice(0, 4000);

  return {
    title,
    description,
    cleanContent: clean,
  };
}

/**
 * ============================================================
 * ANEXOS
 * ============================================================
 */

function normalizeAttachments(
  attachments = [],
) {
  if (!Array.isArray(attachments)) {
    return [];
  }

  return attachments
    .filter(
      (attachment) =>
        attachment?.url &&
        attachment?.filename,
    )
    .map((attachment) => ({
      id:
        attachment.id ||
        null,

      filename:
        attachment.filename ||
        "ficheiro",

      url:
        attachment.url,

      proxyUrl:
        attachment.proxy_url ||
        null,

      contentType:
        attachment.content_type ||
        null,

      size:
        Number(
          attachment.size || 0,
        ),

      width:
        typeof attachment.width ===
        "number"
          ? attachment.width
          : null,

      height:
        typeof attachment.height ===
        "number"
          ? attachment.height
          : null,
    }));
}

/**
 * ============================================================
 * EMBEDS
 * ============================================================
 */

function normalizeEmbedFields(
  fields = [],
) {
  if (!Array.isArray(fields)) {
    return [];
  }

  return fields.map((field) => ({
    name:
      String(field?.name || ""),

    value:
      String(field?.value || ""),

    inline:
      Boolean(field?.inline),
  }));
}

function normalizeEmbeds(
  embeds = [],
) {
  if (!Array.isArray(embeds)) {
    return [];
  }

  return embeds.map((embed) => ({
    title:
      embed?.title ||
      null,

    description:
      embed?.description ||
      null,

    url:
      embed?.url ||
      null,

    color:
      typeof embed?.color ===
      "number"
        ? embed.color
        : null,

    timestamp:
      embed?.timestamp
        ? new Date(
            embed.timestamp,
          )
        : null,

    authorName:
      embed?.author?.name ||
      null,

    authorIconUrl:
      embed?.author?.icon_url ||
      embed?.author?.proxy_icon_url ||
      null,

    thumbnailUrl:
      embed?.thumbnail?.url ||
      embed?.thumbnail?.proxy_url ||
      null,

    imageUrl:
      embed?.image?.url ||
      embed?.image?.proxy_url ||
      null,

    footerText:
      embed?.footer?.text ||
      null,

    footerIconUrl:
      embed?.footer?.icon_url ||
      embed?.footer?.proxy_icon_url ||
      null,

    fields:
      normalizeEmbedFields(
        embed?.fields ||
          [],
      ),
  }));
}

/**
 * ============================================================
 * AVATAR
 * ============================================================
 */

function buildDiscordAvatarUrl(
  author,
) {
  if (
    !author?.id ||
    !author?.avatar
  ) {
    return null;
  }

  const extension =
    String(author.avatar).startsWith(
      "a_",
    )
      ? "gif"
      : "png";

  return (
    `https://cdn.discordapp.com/avatars/` +
    `${author.id}/${author.avatar}.${extension}?size=256`
  );
}

/**
 * ============================================================
 * LINKS DISCORD
 * ============================================================
 */

function buildDiscordUrl(
  channelId,
  messageId,
) {
  const guildId =
    getDiscordGuildId();

  if (
    !guildId ||
    !channelId ||
    !messageId
  ) {
    return null;
  }

  return (
    `https://discord.com/channels/` +
    `${guildId}/${channelId}/${messageId}`
  );
}

/**
 * ============================================================
 * API DISCORD
 * ============================================================
 */

async function discordFetch(path) {
  const discordToken =
    getDiscordToken();

  if (!discordToken) {
    throw new Error(
      "TOKEN ou DISCORD_TOKEN não está definido no .env.",
    );
  }

  const response = await fetch(
    `https://discord.com/api/v10${path}`,
    {
      headers: {
        Authorization:
          `Bot ${discordToken}`,

        Accept:
          "application/json",
      },
    },
  );

  if (!response.ok) {
    const body =
      await response.text();

    if (response.status === 401) {
      throw new Error(
        "O token do bot Discord é inválido ou expirou.",
      );
    }

    if (response.status === 403) {
      throw new Error(
        `O bot não tem permissão para aceder ao recurso ${path}.`,
      );
    }

    if (response.status === 404) {
      throw new Error(
        `O recurso Discord ${path} não foi encontrado.`,
      );
    }

    if (response.status === 429) {
      throw new Error(
        "A API do Discord aplicou um limite temporário de pedidos.",
      );
    }

    throw new Error(
      `Discord respondeu ${response.status}: ${body.slice(
        0,
        300,
      )}`,
    );
  }

  return response.json();
}

async function fetchChannel() {
  return discordFetch(
    `/channels/${DOCUMENTS_CHANNEL_ID}`,
  );
}

/**
 * ============================================================
 * MENSAGENS DE CANAL NORMAL
 * ============================================================
 */

async function fetchNormalChannelMessages(
  channelId,
  limit = 100,
) {
  const safeLimit = Math.min(
    Math.max(
      Number(limit) || 100,
      1,
    ),
    100,
  );

  const result =
    await discordFetch(
      `/channels/${channelId}/messages?limit=${safeLimit}`,
    );

  return Array.isArray(result)
    ? result
    : [];
}

/**
 * ============================================================
 * TODAS AS MENSAGENS DE UMA THREAD
 * ============================================================
 */

async function fetchAllThreadMessages(
  threadId,
) {
  const allMessages = [];

  let before = null;
  let keepFetching = true;

  while (keepFetching) {
    const query =
      new URLSearchParams({
        limit: "100",
      });

    if (before) {
      query.set(
        "before",
        before,
      );
    }

    const result =
      await discordFetch(
        `/channels/${threadId}/messages?${query.toString()}`,
      );

    const messages =
      Array.isArray(result)
        ? result
        : [];

    if (
      messages.length === 0
    ) {
      break;
    }

    allMessages.push(
      ...messages,
    );

    if (
      messages.length < 100
    ) {
      keepFetching = false;
      continue;
    }

    before =
      messages[
        messages.length - 1
      ]?.id ||
      null;

    if (!before) {
      keepFetching = false;
    }
  }

  const uniqueMessages =
    new Map();

  for (
    const message of allMessages
  ) {
    uniqueMessages.set(
      String(message.id),
      message,
    );
  }

  return [
    ...uniqueMessages.values(),
  ].sort((a, b) => {
    const dateA =
      new Date(
        a?.timestamp || 0,
      ).getTime();

    const dateB =
      new Date(
        b?.timestamp || 0,
      ).getTime();

    return dateA - dateB;
  });
}

/**
 * ============================================================
 * THREADS DO FÓRUM
 * ============================================================
 */

async function fetchActiveForumThreads() {
  const guildId =
    getDiscordGuildId();

  if (!guildId) {
    throw new Error(
      "DISCORD_GUILD_ID ou GUILD_IDS não está definido no .env.",
    );
  }

  const result =
    await discordFetch(
      `/guilds/${guildId}/threads/active`,
    );

  const threads =
    Array.isArray(
      result?.threads,
    )
      ? result.threads
      : [];

  return threads.filter(
    (thread) =>
      String(
        thread.parent_id,
      ) ===
      String(
        DOCUMENTS_CHANNEL_ID,
      ),
  );
}

async function fetchArchivedForumThreads() {
  const allThreads = [];

  let before = null;
  let hasMore = true;

  while (hasMore) {
    const query =
      new URLSearchParams({
        limit: "100",
      });

    if (before) {
      query.set(
        "before",
        before,
      );
    }

    const result =
      await discordFetch(
        `/channels/${DOCUMENTS_CHANNEL_ID}/threads/archived/public?${query.toString()}`,
      );

    const threads =
      Array.isArray(
        result?.threads,
      )
        ? result.threads
        : [];

    allThreads.push(
      ...threads,
    );

    hasMore =
      result?.has_more ===
        true &&
      threads.length > 0;

    before =
      threads.at(-1)
        ?.thread_metadata
        ?.archive_timestamp ||
      null;
  }

  return allThreads;
}

async function fetchForumThreads() {
  const [
    activeThreads,
    archivedThreads,
  ] = await Promise.all([
    fetchActiveForumThreads(),
    fetchArchivedForumThreads(),
  ]);

  const threadMap =
    new Map();

  for (const thread of [
    ...activeThreads,
    ...archivedThreads,
  ]) {
    threadMap.set(
      String(thread.id),
      thread,
    );
  }

  return [
    ...threadMap.values(),
  ];
}

/**
 * ============================================================
 * TAGS DO FÓRUM
 * ============================================================
 */

function getForumTagNames(
  thread,
  channel,
) {
  const availableTags =
    Array.isArray(
      channel?.available_tags,
    )
      ? channel.available_tags
      : [];

  const appliedTags =
    Array.isArray(
      thread?.applied_tags,
    )
      ? thread.applied_tags
      : [];

  return appliedTags
    .map((tagId) =>
      availableTags.find(
        (tag) =>
          String(tag.id) ===
          String(tagId),
      ),
    )
    .filter(Boolean)
    .map((tag) =>
      String(tag.name),
    );
}

/**
 * ============================================================
 * NORMALIZAÇÃO DE CADA MENSAGEM DA THREAD
 * ============================================================
 */

function normalizeThreadMessage(
  message,
  threadId,
  starterMessageId,
) {
  const channelId =
    String(
      message?.channel_id ||
      threadId,
    );

  const messageId =
    String(
      message?.id ||
      "",
    );

  return {
    discordMessageId:
      messageId,

    discordChannelId:
      channelId,

    authorDiscordId:
      message?.author?.id ||
      null,

    authorName:
      message?.member?.nick ||
      message?.author?.global_name ||
      message?.author?.username ||
      (message?.webhook_id
        ? "Publicação automática"
        : "Utilizador Discord"),

    authorAvatarUrl:
      buildDiscordAvatarUrl(
        message?.author,
      ),

    content:
      String(
        message?.content ||
        "",
      ),

    cleanContent:
      removeControlTokens(
        String(
          message?.content ||
          "",
        ),
      ),

    attachments:
      normalizeAttachments(
        message?.attachments ||
          [],
      ),

    embeds:
      normalizeEmbeds(
        message?.embeds ||
          [],
      ),

    publishedAt:
      new Date(
        message?.timestamp ||
        Date.now(),
      ),

    editedAt:
      message
        ?.edited_timestamp
        ? new Date(
            message
              .edited_timestamp,
          )
        : null,

    pinned:
      Boolean(
        message?.pinned,
      ),

    isStarterMessage:
      String(messageId) ===
      String(
        starterMessageId,
      ),

    isBot:
      message?.author?.bot ===
      true,

    isWebhook:
      Boolean(
        message?.webhook_id,
      ),

    webhookId:
      message?.webhook_id ||
      null,

    discordUrl:
      buildDiscordUrl(
        channelId,
        messageId,
      ),

    metadata: {
      type:
        message?.type ||
        0,

      flags:
        message?.flags ||
        0,

      referencedMessageId:
        message
          ?.referenced_message
          ?.id ||
        null,

      replyToMessageId:
        message
          ?.message_reference
          ?.message_id ||
        null,

      mentions:
        Array.isArray(
          message?.mentions,
        )
          ? message.mentions.map(
              (mention) => ({
                id:
                  mention?.id ||
                  null,

                username:
                  mention?.username ||
                  null,

                globalName:
                  mention?.global_name ||
                  null,
              }),
            )
          : [],
    },
  };
}

/**
 * ============================================================
 * CRIAÇÃO DO DOCUMENTO COMPLETO DO FÓRUM
 * ============================================================
 */

function createForumPayload({
  thread,
  channel,
  messages,
}) {
  const threadName =
    thread?.name ||
    "Documento sem título";

  const starterMessage =
    messages.find(
      (message) =>
        String(message.id) ===
        String(thread.id),
    ) ||
    messages[0] ||
    null;

  if (!starterMessage) {
    return null;
  }

  const forumTagNames =
    getForumTagNames(
      thread,
      channel,
    );

  const syntheticTags =
    forumTagNames.map(
      (tag) =>
        `#${tag
          .toLowerCase()
          .replace(/\s+/g, "_")}`,
    );

  const combinedContent = [
    ...syntheticTags,
    starterMessage?.content ||
      "",
  ]
    .filter(Boolean)
    .join("\n");

  const {
    title,
    description,
    cleanContent,
  } =
    extractTitleAndDescription(
      {
        ...starterMessage,

        content:
          combinedContent,
      },

      threadName,
    );

  const normalizedMessages =
    messages.map((message) =>
      normalizeThreadMessage(
        message,
        thread.id,
        starterMessage.id,
      ),
    );

  const allAttachments =
    normalizedMessages.flatMap(
      (message) =>
        message.attachments ||
        [],
    );

  const lastMessage =
    normalizedMessages.at(-1) ||
    null;

  const starterAttachments =
    normalizeAttachments(
      starterMessage?.attachments ||
        [],
    );

  return {
    discordMessageId:
      String(
        starterMessage.id,
      ),

    discordChannelId:
      String(
        thread.id,
      ),

    guildId:
      getDiscordGuildId() ||
      null,

    title,

    description,

    category:
      detectCategory(
        combinedContent,
        threadName,
      ),

    tags: [
      ...new Set([
        ...extractTags(
          combinedContent,
        ),

        ...forumTagNames.map(
          (tag) =>
            tag.toLowerCase(),
        ),
      ]),
    ],

    visibility:
      detectVisibility(
        combinedContent,
      ),

    allowedRoleIds:
      extractAllowedRoleIds(
        combinedContent,
      ),

    featured:
      detectFeatured(
        combinedContent,
      ),

    pinned:
      Boolean(
        starterMessage?.pinned,
      ),

    archived:
      false,

    authorDiscordId:
      starterMessage
        ?.author?.id ||
      null,

    authorName:
      starterMessage
        ?.member?.nick ||
      starterMessage
        ?.author
        ?.global_name ||
      starterMessage
        ?.author
        ?.username ||
      (starterMessage
        ?.webhook_id
        ? "Publicação automática"
        : "Utilizador Discord"),

    content:
      cleanContent,

    attachments:
      starterAttachments,

    messages:
      normalizedMessages,

    messageCount:
      normalizedMessages.length,

    totalAttachmentCount:
      allAttachments.length,

    lastMessageAt:
      lastMessage
        ?.publishedAt ||
      null,

    discordUrl:
      buildDiscordUrl(
        thread.id,
        starterMessage.id,
      ),

    publishedAt:
      new Date(
        starterMessage
          ?.timestamp ||
        thread
          ?.thread_metadata
          ?.create_timestamp ||
        Date.now(),
      ),

    editedAt:
      starterMessage
        ?.edited_timestamp
        ? new Date(
            starterMessage
              .edited_timestamp,
          )
        : null,

    lastSyncedAt:
      new Date(),

    metadata: {
      sourceType:
        "DISCORD_FORUM_THREAD",

      forumChannelId:
        DOCUMENTS_CHANNEL_ID,

      forumThreadId:
        thread?.id ||
        null,

      forumThreadName:
        threadName,

      forumArchived:
        Boolean(
          thread
            ?.thread_metadata
            ?.archived,
        ),

      forumLocked:
        Boolean(
          thread
            ?.thread_metadata
            ?.locked,
        ),

      forumAutoArchiveDuration:
        thread
          ?.thread_metadata
          ?.auto_archive_duration ||
        null,

      forumTagNames,

      ownerId:
        thread?.owner_id ||
        null,

      messageCount:
        normalizedMessages.length,

      totalAttachmentCount:
        allAttachments.length,
    },
  };
}

/**
 * ============================================================
 * CANAL DE TEXTO NORMAL
 * ============================================================
 */

function createNormalMessagePayload(
  message,
  channel,
) {
  const attachments =
    normalizeAttachments(
      message?.attachments ||
        [],
    );

  const normalizedMessage =
    normalizeThreadMessage(
      message,
      message?.channel_id ||
        DOCUMENTS_CHANNEL_ID,
      message?.id,
    );

  const {
    title,
    description,
    cleanContent,
  } =
    extractTitleAndDescription(
      message,
      "",
    );

  return {
    discordMessageId:
      String(
        message.id,
      ),

    discordChannelId:
      String(
        message.channel_id ||
        DOCUMENTS_CHANNEL_ID,
      ),

    guildId:
      getDiscordGuildId() ||
      null,

    title,

    description,

    category:
      detectCategory(
        message?.content ||
          "",
        "",
      ),

    tags:
      extractTags(
        message?.content ||
          "",
      ),

    visibility:
      detectVisibility(
        message?.content ||
          "",
      ),

    allowedRoleIds:
      extractAllowedRoleIds(
        message?.content ||
          "",
      ),

    featured:
      detectFeatured(
        message?.content ||
          "",
      ),

    pinned:
      Boolean(
        message?.pinned,
      ),

    archived:
      false,

    authorDiscordId:
      message?.author?.id ||
      null,

    authorName:
      message?.member?.nick ||
      message?.author?.global_name ||
      message?.author?.username ||
      (message?.webhook_id
        ? "Publicação automática"
        : "Utilizador Discord"),

    content:
      cleanContent,

    attachments,

    messages: [
      normalizedMessage,
    ],

    messageCount:
      1,

    totalAttachmentCount:
      attachments.length,

    lastMessageAt:
      new Date(
        message?.timestamp ||
        Date.now(),
      ),

    discordUrl:
      buildDiscordUrl(
        message.channel_id ||
          DOCUMENTS_CHANNEL_ID,
        message.id,
      ),

    publishedAt:
      new Date(
        message?.timestamp ||
        Date.now(),
      ),

    editedAt:
      message
        ?.edited_timestamp
        ? new Date(
            message
              .edited_timestamp,
          )
        : null,

    lastSyncedAt:
      new Date(),

    metadata: {
      sourceType:
        "DISCORD_CHANNEL_MESSAGE",

      channelName:
        channel?.name ||
        null,

      flags:
        message?.flags ||
        0,

      type:
        message?.type ||
        0,

      webhookId:
        message?.webhook_id ||
        null,

      botAuthor:
        message?.author?.bot ===
        true,
    },
  };
}

/**
 * ============================================================
 * BASE DE DADOS
 * ============================================================
 */

async function upsertDocument(
  payload,
) {
  const existing =
    await DocumentRecord.findOne({
      discordMessageId:
        payload.discordMessageId,
    });

  if (existing) {
    Object.assign(
      existing,
      payload,
    );

    await existing.save();

    return "updated";
  }

  await DocumentRecord.create(
    payload,
  );

  return "created";
}

/**
 * ============================================================
 * SINCRONIZAÇÃO
 * ============================================================
 */

export async function syncDiscordDocuments() {
  const channel =
    await fetchChannel();

  const channelType =
    Number(
      channel?.type,
    );

  let created = 0;
  let updated = 0;
  let ignored = 0;
  let failed = 0;
  let totalFetched = 0;
  let totalMessages = 0;
  let totalAttachments = 0;

  if (
    FORUM_CHANNEL_TYPES.has(
      channelType,
    )
  ) {
    console.log(
      `[documents] Fórum detetado: ${
        channel.name ||
        DOCUMENTS_CHANNEL_ID
      }`,
    );

    const threads =
      await fetchForumThreads();

    console.log(
      `[documents] Publicações encontradas: ${threads.length}`,
    );

    totalFetched =
      threads.length;

    for (const thread of threads) {
      try {
        const messages =
          await fetchAllThreadMessages(
            thread.id,
          );

        if (
          messages.length === 0
        ) {
          ignored += 1;

          console.log(
            `[documents] Thread sem mensagens: ${thread.name || thread.id}`,
          );

          continue;
        }

        const payload =
          createForumPayload({
            thread,
            channel,
            messages,
          });

        if (!payload) {
          ignored += 1;
          continue;
        }

        totalMessages +=
          payload.messageCount ||
          0;

        totalAttachments +=
          payload.totalAttachmentCount ||
          0;

        const result =
          await upsertDocument(
            payload,
          );

        if (
          result === "created"
        ) {
          created += 1;
        } else {
          updated += 1;
        }

        console.log(
          `[documents] ${result === "created" ? "Criado" : "Atualizado"}: ${payload.title} (${payload.messageCount} mensagens, ${payload.totalAttachmentCount} anexos)`,
        );
      } catch (error) {
        failed += 1;

        console.error(
          `[documents] Erro ao processar a thread ${
            thread?.id ||
            "desconhecida"
          }:`,
          error,
        );
      }
    }
  } else {
    const messages =
      await fetchNormalChannelMessages(
        DOCUMENTS_CHANNEL_ID,
        100,
      );

    totalFetched =
      messages.length;

    for (
      const message of [
        ...messages,
      ].reverse()
    ) {
      try {
        const attachments =
          normalizeAttachments(
            message?.attachments ||
              [],
          );

        const embeds =
          normalizeEmbeds(
            message?.embeds ||
              [],
          );

        const hasUsefulContent =
          normalizeText(
            message?.content ||
              "",
          ).length > 0 ||
          attachments.length > 0 ||
          embeds.length > 0;

        if (
          !hasUsefulContent
        ) {
          ignored += 1;
          continue;
        }

        const payload =
          createNormalMessagePayload(
            message,
            channel,
          );

        totalMessages +=
          1;

        totalAttachments +=
          payload.totalAttachmentCount ||
          0;

        const result =
          await upsertDocument(
            payload,
          );

        if (
          result === "created"
        ) {
          created += 1;
        } else {
          updated += 1;
        }
      } catch (error) {
        failed += 1;

        console.error(
          `[documents] Erro ao processar a mensagem ${
            message?.id ||
            "desconhecida"
          }:`,
          error,
        );
      }
    }
  }

  const result = {
    ok:
      failed === 0,

    source:
      FORUM_CHANNEL_TYPES.has(
        channelType,
      )
        ? "FORUM"
        : "TEXT_CHANNEL",

    channelName:
      channel?.name ||
      DOCUMENTS_CHANNEL_ID,

    channelType,

    created,

    updated,

    ignored,

    failed,

    totalFetched,

    totalMessages,

    totalAttachments,

    syncedAt:
      new Date(),
  };

  console.log(
    "[documents] Sincronização concluída:",
    result,
  );

  return result;
}

/**
 * ============================================================
 * WATCHER
 * ============================================================
 */

let timer = null;
let syncing = false;

async function runDocumentsSync(
  source = "watcher",
) {
  if (syncing) {
    console.log(
      `[documents] Sincronização ignorada porque já existe outra em execução (${source}).`,
    );

    return null;
  }

  syncing = true;

  try {
    return await syncDiscordDocuments();
  } catch (error) {
    console.error(
      `[documents] Erro na sincronização (${source}):`,
      error,
    );

    throw error;
  } finally {
    syncing = false;
  }
}

export function startDocumentsWatcher() {
  if (
    process.env
      .DOCUMENTS_WATCHER_ENABLED ===
    "false"
  ) {
    console.log(
      "[documents] Watcher desativado",
    );

    return;
  }

  if (timer) {
    console.log(
      "[documents] Watcher já se encontra iniciado.",
    );

    return;
  }

  const configuredInterval =
    Number(
      process.env
        .DOCUMENTS_SYNC_MS ||
        120000,
    );

  const interval =
    Math.max(
      Number.isFinite(
        configuredInterval,
      )
        ? configuredInterval
        : 120000,
      30000,
    );

  console.log(
    `[documents] Watcher iniciado para o canal ${DOCUMENTS_CHANNEL_ID}`,
  );

  console.log(
    `[documents] Intervalo de sincronização: ${interval}ms`,
  );

  void runDocumentsSync(
    "inicial",
  ).catch((error) => {
    console.error(
      "[documents] Erro na sincronização inicial:",
      error,
    );
  });

  timer =
    setInterval(() => {
      void runDocumentsSync(
        "automática",
      ).catch((error) => {
        console.error(
          "[documents] Erro na sincronização automática:",
          error,
        );
      });
    }, interval);

  timer.unref?.();
}

export function stopDocumentsWatcher() {
  if (timer) {
    clearInterval(timer);

    timer = null;
  }

  syncing = false;

  console.log(
    "[documents] Watcher parado",
  );
}