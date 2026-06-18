import { Schema, model, models } from "mongoose";

const CommandSchema = new Schema({
  name: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
  description: { type: String, default: "" },
  category: { type: String, default: "GERAL", index: true },
  enabled: { type: Boolean, default: true, index: true },
  guildScope: { type: String, enum: ["MAIN","SCHOOL","BOTH","GLOBAL"], default: "MAIN" },
  source: {
    file: { type: String, default: null },
    hash: { type: String, default: null },
    version: { type: String, default: "1" },
    botInstanceId: { type: String, default: null },
    lastSyncedAt: { type: Date, default: null },
  },
  access: {
    requireMilitaryRole: { type: Boolean, default: false },
    requirePointOpen: { type: Boolean, default: false },
    allowedRoleIds: { type: [String], default: [] },
    deniedRoleIds: { type: [String], default: [] },
    allowedChannelIds: { type: [String], default: [] },
    deniedChannelIds: { type: [String], default: [] },
    allowedGuildIds: { type: [String], default: [] },
    cooldownSeconds: { type: Number, default: 0, min: 0, max: 86400 },
  },
  audit: {
    enabled: { type: Boolean, default: true },
    logSuccess: { type: Boolean, default: true },
    logFailure: { type: Boolean, default: true },
    includeOptions: { type: Boolean, default: false },
  },
  settings: { type: Schema.Types.Mixed, default: {} },
  stats: {
    totalExecutions: { type: Number, default: 0 },
    successExecutions: { type: Number, default: 0 },
    failedExecutions: { type: Number, default: 0 },
    blockedExecutions: { type: Number, default: 0 },
    averageDurationMs: { type: Number, default: 0 },
    lastExecutedAt: { type: Date, default: null },
    lastError: { type: String, default: null },
  },
  updatedBy: { discordId: String, name: String },
}, { timestamps: true, collection: "discord_command_configs" });

const ExecutionSchema = new Schema({
  commandName: { type: String, required: true, index: true },
  executionId: { type: String, required: true, unique: true, index: true },
  status: { type: String, enum: ["SUCCESS","FAILED","BLOCKED"], required: true, index: true },
  guildId: String, channelId: String, userId: { type: String, index: true }, userName: String,
  durationMs: { type: Number, default: 0 }, reason: String, error: String,
  options: { type: Schema.Types.Mixed, default: null },
  botInstanceId: String,
  createdAt: { type: Date, default: Date.now, index: true },
}, { collection: "discord_command_executions" });

const TemplateSchema = new Schema({
  key: { type: String, required: true, unique: true, index: true },
  label: { type: String, required: true },
  category: { type: String, default: "GERAL" },
  enabled: { type: Boolean, default: true },
  guildScope: { type: String, enum: ["MAIN","SCHOOL","BOTH"], default: "MAIN" },
  mentionRoleId: String, channelId: String,
  payload: {
    content: { type: String, default: "" },
    embed: {
      title: { type: String, default: "" },
      description: { type: String, default: "" },
      color: { type: String, default: "#7c3aed" },
      imageUrl: { type: String, default: "" },
      thumbnailUrl: { type: String, default: "" },
      footer: { type: String, default: "" },
    },
    buttons: { type: [Schema.Types.Mixed], default: [] },
  },
  updatedBy: { discordId: String, name: String },
}, { timestamps: true, collection: "discord_message_templates" });

const RemoteActionSchema = new Schema({
  type: { type: String, required: true, index: true },
  status: { type: String, enum: ["PENDING","PROCESSING","SUCCESS","FAILED","CANCELLED"], default: "PENDING", index: true },
  guildId: String,
  requestedBy: { discordId: String, name: String },
  reason: { type: String, required: true },
  payload: { type: Schema.Types.Mixed, default: {} },
  attempts: { type: Number, default: 0 },
  lockedAt: Date, availableAt: { type: Date, default: Date.now }, completedAt: Date,
  result: { type: Schema.Types.Mixed, default: null }, lastError: String,
}, { timestamps: true, collection: "discord_remote_actions" });

export const DiscordCommandConfig = models.DiscordCommandConfig || model("DiscordCommandConfig", CommandSchema);
export const DiscordCommandExecution = models.DiscordCommandExecution || model("DiscordCommandExecution", ExecutionSchema);
export const DiscordMessageTemplate = models.DiscordMessageTemplate || model("DiscordMessageTemplate", TemplateSchema);
export const DiscordRemoteAction = models.DiscordRemoteAction || model("DiscordRemoteAction", RemoteActionSchema);
