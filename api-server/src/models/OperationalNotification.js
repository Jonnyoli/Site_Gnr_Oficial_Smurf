import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    recipientDiscordId: {
      type: String,
      default: null,
      index: true,
    },

    recipientRoleId: {
      type: String,
      default: null,
      index: true,
    },

    operationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UnitOperation",
      required: true,
      index: true,
    },

    operationTitle: {
      type: String,
      required: true,
      trim: true,
    },

    caseNumber: {
      type: String,
      default: null,
      index: true,
    },

    type: {
      type: String,
      enum: [
        "REPORT_PENDING_DIRECTOR",
        "REPORT_PENDING_COMMAND",
        "CHANGES_REQUESTED",
        "READY_FOR_DOCUMENT",
        "DOCUMENT_ISSUED",
        "INVESTIGATION_UPDATED",
      ],
      required: true,
      index: true,
    },

    priority: {
      type: String,
      enum: ["NORMAL", "ATTENTION", "URGENT"],
      default: "NORMAL",
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    actionUrl: {
      type: String,
      default: null,
      trim: true,
    },

    readAt: {
      type: Date,
      default: null,
      index: true,
    },

    completedAt: {
      type: Date,
      default: null,
      index: true,
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

schema.index({
  recipientDiscordId: 1,
  recipientRoleId: 1,
  completedAt: 1,
  createdAt: -1,
});

schema.index(
  {
    operationId: 1,
    type: 1,
    recipientDiscordId: 1,
    recipientRoleId: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      completedAt: null,
    },
  },
);

const OperationalNotification =
  mongoose.models.OperationalNotification ||
  mongoose.model("OperationalNotification", schema);

export default OperationalNotification;
