import mongoose from "mongoose";

const auditSchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    byUserId: { type: String, default: "SYSTEM" },
    source: { type: String, default: "SYSTEM" },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const memberSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    joinedAt: { type: Date, default: Date.now },
    leftAt: { type: Date, default: null },
    active: { type: Boolean, default: true },
    role: {
      type: String,
      enum: ["MEMBER", "COMMANDER_PATROL"],
      default: "MEMBER",
    },
    pointId: { type: mongoose.Schema.Types.ObjectId, ref: "OperationalPoint", default: null },
  },
  { _id: false },
);

const PointSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    guildId: { type: String, default: null, index: true },
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date, default: null },
    status: { type: String, enum: ["ABERTO", "FECHADO"], default: "ABERTO", index: true },
    isPaused: { type: Boolean, default: false },
    lastPauseTime: { type: Date, default: null },
    totalPauseTime: { type: Number, default: 0 },
    tipo: { type: String, default: "Normal" },
    descricao: { type: String, default: null },
    source: { type: String, default: "DISCORD" },
    closedBy: { type: String, default: null },
    closeReason: { type: String, default: null },
    cpId: { type: mongoose.Schema.Types.ObjectId, ref: "OperationalCP", default: null, index: true },
    discord: {
      publicChannelId: { type: String, default: null },
      publicMessageId: { type: String, default: null },
      publicJumpUrl: { type: String, default: null },
      dmChannelId: { type: String, default: null },
      dmMessageId: { type: String, default: null },
      lastSyncedAt: { type: Date, default: null },
      syncError: { type: String, default: null },
    },
    channelId: { type: String, default: null },
    messageId: { type: String, default: null },
    audit: { type: [auditSchema], default: [] },
  },
  { timestamps: true, collection: "pontos" },
);

const CPSchema = new mongoose.Schema(
  {
    number: { type: String, required: true },
    guildId: { type: String, required: true, index: true },
    commanderId: { type: String, default: null, index: true },
    commanderPatrols: { type: Boolean, default: false },
    members: { type: [memberSchema], default: [] },
    participants: { type: String, default: "" },
    vehicle: { type: String, required: true },
    zone: { type: String, default: null },
    patrolType: { type: String, default: "Patrulha" },
    observations: { type: String, default: null },
    status: { type: String, enum: ["ABERTO", "FECHADO", "CANCELADO"], default: "ABERTO", index: true },
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date, default: null },
    source: { type: String, default: "DISCORD" },
    discord: {
      channelId: { type: String, default: null },
      messageId: { type: String, default: null },
      jumpUrl: { type: String, default: null },
      lastSyncedAt: { type: Date, default: null },
      syncError: { type: String, default: null },
    },
    channelId: { type: String, default: null },
    messageId: { type: String, default: null },
    audit: { type: [auditSchema], default: [] },
  },
  { timestamps: true, collection: "cps" },
);

const OutboxSchema = new mongoose.Schema(
  {
    type: String,
    aggregateType: String,
    aggregateId: { type: mongoose.Schema.Types.ObjectId, index: true },
    guildId: String,
    requestedBy: String,
    status: { type: String, default: "PENDING", index: true },
    attempts: { type: Number, default: 0 },
    availableAt: { type: Date, default: Date.now },
    lockedAt: { type: Date, default: null },
    processedAt: { type: Date, default: null },
    lastError: { type: String, default: null },
  },
  { timestamps: true, collection: "discordoutboxes" },
);

export const OperationalPoint =
  mongoose.models.OperationalPoint || mongoose.model("OperationalPoint", PointSchema);
export const OperationalCP =
  mongoose.models.OperationalCP || mongoose.model("OperationalCP", CPSchema);
export const DiscordOutbox =
  mongoose.models.DiscordOutbox || mongoose.model("DiscordOutbox", OutboxSchema);
