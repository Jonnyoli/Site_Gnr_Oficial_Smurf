import mongoose from "mongoose";

const custodyEventSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["ADDED", "VIEWED", "DOWNLOADED", "UPDATED", "REMOVED"],
      required: true,
    },
    actorDiscordId: { type: String, default: null },
    actorName: { type: String, default: "Utilizador da Central", trim: true },
    at: { type: Date, default: Date.now },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false },
);

const schema = new mongoose.Schema(
  {
    operationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UnitOperation",
      required: true,
      index: true,
    },
    caseNumber: { type: String, default: null, index: true, trim: true },
    title: { type: String, required: true, trim: true, index: true },
    description: { type: String, default: "", trim: true },
    category: {
      type: String,
      enum: [
        "IMAGE", "VIDEO", "AUDIO", "PDF", "DOCUMENT",
        "TESTIMONY", "INTERROGATION", "SEIZURE",
        "LOCATION", "EXTERNAL_LINK", "OTHER",
      ],
      default: "OTHER",
      index: true,
    },
    sourceType: {
      type: String,
      enum: ["UPLOAD", "EXTERNAL_LINK", "DISCORD_ATTACHMENT"],
      required: true,
      index: true,
    },
    originalFilename: { type: String, default: null, trim: true },
    storedFilename: { type: String, default: null, trim: true },
    relativePath: { type: String, default: null, trim: true },
    externalUrl: { type: String, default: null, trim: true },

    discordGuildId: { type: String, default: null, index: true },
    discordChannelId: { type: String, default: null, index: true },
    discordMessageId: { type: String, default: null, index: true },
    discordAttachmentId: { type: String, default: null, index: true },
    discordAttachmentUrl: { type: String, default: null, trim: true },
    discordJumpUrl: { type: String, default: null, trim: true },

    sourceGuildId: { type: String, default: null },
    sourceChannelId: { type: String, default: null },
    sourceMessageId: { type: String, default: null },
    sourceJumpUrl: { type: String, default: null, trim: true },
    mimeType: { type: String, default: null, trim: true },
    size: { type: Number, default: 0, min: 0 },
    sha256: { type: String, default: null, index: true, trim: true },
    addedByDiscordId: { type: String, required: true, index: true },
    addedByName: { type: String, required: true, trim: true },
    removed: { type: Boolean, default: false, index: true },
    removedAt: { type: Date, default: null },
    removedByDiscordId: { type: String, default: null },
    removedByName: { type: String, default: null },
    removalReason: { type: String, default: "", trim: true },
    custodyEvents: { type: [custodyEventSchema], default: [] },
  },
  { timestamps: true },
);

schema.index({ operationId: 1, removed: 1, createdAt: -1 });
schema.index({
  discordChannelId: 1,
  discordMessageId: 1,
  discordAttachmentId: 1,
});
schema.index({ title: "text", description: "text", originalFilename: "text" });

const InvestigationEvidence =
  mongoose.models.InvestigationEvidence ||
  mongoose.model("InvestigationEvidence", schema);

export default InvestigationEvidence;
