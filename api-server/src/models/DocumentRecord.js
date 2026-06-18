import mongoose from "mongoose";

/**
 * ============================================================
 * ANEXOS
 * ============================================================
 */

const attachmentSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: null,
    },

    filename: {
      type: String,
      required: true,
      trim: true,
    },

    url: {
      type: String,
      required: true,
      trim: true,
    },

    proxyUrl: {
      type: String,
      default: null,
      trim: true,
    },

    contentType: {
      type: String,
      default: null,
      trim: true,
    },

    size: {
      type: Number,
      default: 0,
      min: 0,
    },

    width: {
      type: Number,
      default: null,
    },

    height: {
      type: Number,
      default: null,
    },
  },
  {
    _id: false,
  },
);

/**
 * ============================================================
 * EMBEDS DO DISCORD
 * ============================================================
 */

const embedFieldSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: "",
    },

    value: {
      type: String,
      default: "",
    },

    inline: {
      type: Boolean,
      default: false,
    },
  },
  {
    _id: false,
  },
);

const embedSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: null,
    },

    description: {
      type: String,
      default: null,
    },

    url: {
      type: String,
      default: null,
    },

    color: {
      type: Number,
      default: null,
    },

    timestamp: {
      type: Date,
      default: null,
    },

    authorName: {
      type: String,
      default: null,
    },

    authorIconUrl: {
      type: String,
      default: null,
    },

    thumbnailUrl: {
      type: String,
      default: null,
    },

    imageUrl: {
      type: String,
      default: null,
    },

    footerText: {
      type: String,
      default: null,
    },

    footerIconUrl: {
      type: String,
      default: null,
    },

    fields: {
      type: [embedFieldSchema],
      default: [],
    },
  },
  {
    _id: false,
  },
);

/**
 * ============================================================
 * MENSAGENS COMPLETAS DA THREAD
 * ============================================================
 */

const threadMessageSchema = new mongoose.Schema(
  {
    discordMessageId: {
      type: String,
      required: true,
    },

    discordChannelId: {
      type: String,
      required: true,
    },

    authorDiscordId: {
      type: String,
      default: null,
    },

    authorName: {
      type: String,
      default: "Utilizador Discord",
      trim: true,
    },

    authorAvatarUrl: {
      type: String,
      default: null,
    },

    content: {
      type: String,
      default: "",
    },

    cleanContent: {
      type: String,
      default: "",
    },

    attachments: {
      type: [attachmentSchema],
      default: [],
    },

    embeds: {
      type: [embedSchema],
      default: [],
    },

    publishedAt: {
      type: Date,
      default: Date.now,
    },

    editedAt: {
      type: Date,
      default: null,
    },

    pinned: {
      type: Boolean,
      default: false,
    },

    isStarterMessage: {
      type: Boolean,
      default: false,
    },

    isBot: {
      type: Boolean,
      default: false,
    },

    isWebhook: {
      type: Boolean,
      default: false,
    },

    webhookId: {
      type: String,
      default: null,
    },

    discordUrl: {
      type: String,
      default: null,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    _id: false,
  },
);

/**
 * ============================================================
 * DOCUMENTO
 * ============================================================
 */

const documentRecordSchema = new mongoose.Schema(
  {
    discordMessageId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    discordChannelId: {
      type: String,
      required: true,
      index: true,
    },

    guildId: {
      type: String,
      default: null,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    category: {
      type: String,

      enum: [
        "REGULAMENTOS",
        "GUIAS",
        "MODELOS",
        "FORMACAO",
        "PROCEDIMENTOS",
        "LEGISLACAO",
        "COMUNICADOS",
        "RELATORIOS",
        "OUTROS",
      ],

      default: "OUTROS",
      index: true,
    },

    tags: {
      type: [String],
      default: [],
      index: true,
    },

    visibility: {
      type: String,

      enum: [
        "PUBLIC",
        "RESTRICTED",
        "COMMAND_ONLY",
      ],

      default: "PUBLIC",
      index: true,
    },

    allowedRoleIds: {
      type: [String],
      default: [],
    },

    featured: {
      type: Boolean,
      default: false,
      index: true,
    },

    pinned: {
      type: Boolean,
      default: false,
      index: true,
    },

    archived: {
      type: Boolean,
      default: false,
      index: true,
    },

    authorDiscordId: {
      type: String,
      default: null,
      index: true,
    },

    authorName: {
      type: String,
      default: "Utilizador Discord",
      trim: true,
    },

    /**
     * Conteúdo da mensagem inicial.
     */
    content: {
      type: String,
      default: "",
    },

    /**
     * Anexos da mensagem inicial.
     *
     * Mantemos isto para compatibilidade com o frontend
     * e registos que já existem na base de dados.
     */
    attachments: {
      type: [attachmentSchema],
      default: [],
    },

    /**
     * Todas as mensagens da publicação Discord.
     *
     * Inclui:
     * - mensagem inicial;
     * - respostas;
     * - imagens;
     * - vídeos;
     * - PDFs;
     * - outros anexos;
     * - embeds;
     * - autores;
     * - datas.
     */
    messages: {
      type: [threadMessageSchema],
      default: [],
    },

    /**
     * Número total de mensagens encontradas na thread.
     */
    messageCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    /**
     * Número total de anexos de toda a publicação.
     */
    totalAttachmentCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    /**
     * Data da última mensagem da publicação.
     */
    lastMessageAt: {
      type: Date,
      default: null,
      index: true,
    },

    discordUrl: {
      type: String,
      default: null,
    },

    publishedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    lastSyncedAt: {
      type: Date,
      default: Date.now,
    },

    editedAt: {
      type: Date,
      default: null,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

/**
 * ============================================================
 * ÍNDICES
 * ============================================================
 */

documentRecordSchema.index({
  title: "text",
  description: "text",
  content: "text",
  tags: "text",
  "messages.content": "text",
  "messages.cleanContent": "text",
});

documentRecordSchema.index({
  discordChannelId: 1,
  publishedAt: -1,
});

documentRecordSchema.index({
  category: 1,
  archived: 1,
  publishedAt: -1,
});

documentRecordSchema.index({
  visibility: 1,
  allowedRoleIds: 1,
});

documentRecordSchema.index({
  featured: 1,
  pinned: 1,
  publishedAt: -1,
});

/**
 * ============================================================
 * MODELO
 * ============================================================
 */

const DocumentRecord =
  mongoose.models.DocumentRecord ||
  mongoose.model(
    "DocumentRecord",
    documentRecordSchema,
  );

export default DocumentRecord;