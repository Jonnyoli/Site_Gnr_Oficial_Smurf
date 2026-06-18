import mongoose, { Schema } from "mongoose";

const AuditLogSchema = new Schema(
  {
    actorId: {
      type: String,
      default: "Sistema",
      index: true,
    },

    actorName: {
      type: String,
      default: "Sistema",
    },

    actorRank: {
      type: String,
      default: "N/A",
    },

    action: {
      type: String,
      required: true,
      index: true,
    },

    module: {
      type: String,
      required: true,
      index: true,
    },

    severity: {
      type: String,
      enum: ["info", "success", "warning", "critical"],
      default: "info",
      index: true,
    },

    description: {
      type: String,
      required: true,
    },

    targetId: {
      type: String,
      default: null,
      index: true,
    },

    targetName: {
      type: String,
      default: null,
    },

    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },

    ip: {
      type: String,
      default: null,
    },

    userAgent: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ module: 1, createdAt: -1 });
AuditLogSchema.index({ severity: 1, createdAt: -1 });

export const AuditLog = mongoose.model("AuditLog", AuditLogSchema);