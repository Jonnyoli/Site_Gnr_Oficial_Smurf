
import mongoose from "mongoose";

/**
 * Anexos associados ao processo disciplinar.
 *
 * Permite guardar clips, imagens, PDFs e outros ficheiros
 * sincronizados do Discord ou adicionados através do site.
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
      default: null,
      min: 0,
    },

    width: {
      type: Number,
      default: null,
      min: 0,
    },

    height: {
      type: Number,
      default: null,
      min: 0,
    },

    source: {
      type: String,
      enum: ["SITE", "DISCORD", "EXTERNAL"],
      default: "SITE",
    },

    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  },
);

/**
 * Histórico de alterações do processo disciplinar.
 *
 * Estes eventos permanecem no processo mesmo quando uma sanção
 * é retirada ou substituída.
 *
 * Quando o processo é apagado definitivamente, o documento e
 * todo este histórico deixam de existir.
 */
const eventSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "CREATED",
        "APPLIED",
        "REMOVED",
        "REACTIVATED",
        "REPLACED",
        "UPDATED",
        "MESSAGE_PUBLISHED",
        "MESSAGE_UPDATED",
        "MESSAGE_DELETED",
        "MESSAGE_SYNCED",
        "ROLE_APPLIED",
        "ROLE_REMOVED",
        "ATTACHMENT_ADDED",
        "ATTACHMENT_REMOVED",
      ],
      required: true,
    },

    roleId: {
      type: String,
      default: null,
    },

    label: {
      type: String,
      required: true,
      trim: true,
    },

    at: {
      type: Date,
      default: Date.now,
      index: true,
    },

    source: {
      type: String,
      enum: [
        "SITE",
        "DISCORD_MESSAGE",
        "ROLE_SYNC",
        "MANUAL",
        "SYSTEM",
      ],
      default: "SITE",
    },

    actorDiscordId: {
      type: String,
      default: null,
      trim: true,
    },

    actorName: {
      type: String,
      default: null,
      trim: true,
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

const disciplinaryRecordSchema = new mongoose.Schema(
  {
    /**
     * Militar visado.
     */
    targetDiscordId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },

    targetName: {
      type: String,
      default: null,
      trim: true,
    },

    targetRank: {
      type: String,
      default: null,
      trim: true,
    },

    /**
     * Tipo de sanção disciplinar.
     */
    type: {
      type: String,
      enum: [
        "FIRST_WARNING",
        "SECOND_WARNING",
        "SUSPENSION",
      ],
      required: true,
      index: true,
    },

    /**
     * Estado atual do processo.
     *
     * ACTIVE:
     * A sanção está atualmente aplicada.
     *
     * REMOVED:
     * A sanção foi retirada, mas permanece no histórico.
     *
     * REPLACED:
     * A sanção foi substituída por outra.
     *
     * DRAFT:
     * O processo foi criado no site, mas ainda não foi aplicado.
     */
    status: {
      type: String,
      enum: [
        "DRAFT",
        "ACTIVE",
        "REMOVED",
        "REPLACED",
      ],
      default: "DRAFT",
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    reason: {
      type: String,
      default: null,
      trim: true,
    },

    sanction: {
      type: String,
      default: null,
      trim: true,
    },

    fullContent: {
      type: String,
      default: "",
    },

    /**
     * Define se o processo é gerido pelo site.
     *
     * Os registos geridos pelo site não devem ser recriados
     * automaticamente através do watcher do Discord.
     */
    managedBySite: {
      type: Boolean,
      default: true,
      index: true,
    },

    /**
     * Controlo de visibilidade.
     */
    visibility: {
      type: String,
      enum: [
        "PUBLIC",
        "COMMAND_ONLY",
        "PRIVATE",
      ],
      default: "COMMAND_ONLY",
      index: true,
    },

    /**
     * Anexos, clips e provas.
     */
    attachments: {
      type: [attachmentSchema],
      default: [],
    },

    /**
     * Dados da publicação no Discord.
     *
     * Estes campos são opcionais porque o processo pode ser
     * criado primeiro no site.
     */
    discordMessageId: {
      type: String,
      default: null,
      unique: true,
      sparse: true,
      index: true,
    },

    discordChannelId: {
      type: String,
      default: null,
      trim: true,
    },

    roleId: {
      type: String,
      default: null,
      index: true,
      trim: true,
    },

    /**
     * Responsável pela aplicação da sanção.
     */
    responsibleDiscordId: {
      type: String,
      default: null,
      trim: true,
    },

    responsibleName: {
      type: String,
      default: null,
      trim: true,
    },

    /**
     * Dados de gestão do processo no site.
     */
    createdByDiscordId: {
      type: String,
      default: null,
      trim: true,
    },

    createdByName: {
      type: String,
      default: null,
      trim: true,
    },

    updatedByDiscordId: {
      type: String,
      default: null,
      trim: true,
    },

    updatedByName: {
      type: String,
      default: null,
      trim: true,
    },

    removedByDiscordId: {
      type: String,
      default: null,
      trim: true,
    },

    removedByName: {
      type: String,
      default: null,
      trim: true,
    },

    /**
     * Datas do processo.
     */
    appliedAt: {
      type: Date,
      default: null,
      index: true,
    },

    removedAt: {
      type: Date,
      default: null,
      index: true,
    },

    replacedAt: {
      type: Date,
      default: null,
    },

    replacedByRecordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DisciplinaryRecord",
      default: null,
    },

    replacesRecordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DisciplinaryRecord",
      default: null,
    },

    /**
     * Histórico completo do processo.
     */
    events: {
      type: [eventSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

/**
 * Índices para acelerar as consultas mais frequentes.
 */
disciplinaryRecordSchema.index({
  targetDiscordId: 1,
  status: 1,
  appliedAt: -1,
});

disciplinaryRecordSchema.index({
  targetDiscordId: 1,
  type: 1,
  status: 1,
});

disciplinaryRecordSchema.index({
  roleId: 1,
  status: 1,
});

disciplinaryRecordSchema.index({
  managedBySite: 1,
  status: 1,
});

disciplinaryRecordSchema.index({
  visibility: 1,
  status: 1,
});

/**
 * Remove espaços desnecessários antes de guardar.
 */
disciplinaryRecordSchema.pre("save", function normalizeFields(next) {
  if (typeof this.targetDiscordId === "string") {
    this.targetDiscordId = this.targetDiscordId.trim();
  }

  if (typeof this.targetName === "string") {
    this.targetName = this.targetName.trim() || null;
  }

  if (typeof this.targetRank === "string") {
    this.targetRank = this.targetRank.trim() || null;
  }

  if (typeof this.title === "string") {
    this.title = this.title.trim();
  }

  if (typeof this.reason === "string") {
    this.reason = this.reason.trim() || null;
  }

  if (typeof this.sanction === "string") {
    this.sanction = this.sanction.trim() || null;
  }

  next();
});

const DisciplinaryRecord =
  mongoose.models.DisciplinaryRecord ||
  mongoose.model(
    "DisciplinaryRecord",
    disciplinaryRecordSchema,
  );

export default DisciplinaryRecord;

