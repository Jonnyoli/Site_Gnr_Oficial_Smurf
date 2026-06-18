import {
  Schema,
  model,
  models,
} from "mongoose";

const OperationalUserSchema =
  new Schema(
    {
      discordId: {
        type: String,
        required: true,
        index: true,
      },

      activePontoId: {
        type:
          Schema.Types.ObjectId,
        ref: "Ponto",
        default: null,
      },

      activePatrulhaId: {
        type:
          Schema.Types.ObjectId,
        ref: "Patrulha",
        default: null,
      },

      warName: {
        type: String,
        default: null,
      },

      callsignNumber: {
        type: String,
        default: null,
      },

      badgeNumber: {
        type: String,
        default: null,
      },

      lastPromotionDate: {
        type: Date,
        default: null,
      },

      callsignCount: {
        type: Number,
        default: 0,
      },

      cfsCount: {
        type: Number,
        default: 0,
      },

      cfoCount: {
        type: Number,
        default: 0,
      },

      callsignPrefix: {
        type: String,
        default: null,
      },

      savedTags: {
        type: [String],
        default: [],
        index: true,
      },

      isInGuild: {
        type: Boolean,
        default: true,
        index: true,
      },

      isMilitar: {
        type: Boolean,
        default: false,
        index: true,
      },

      username: {
        type: String,
        default: null,
      },

      displayName: {
        type: String,
        default: null,
      },

      avatarUrl: {
        type: String,
        default: null,
      },

      rolesSyncedAt: {
        type: Date,
        default: null,
      },
    },
    {
      collection: "users",
      timestamps: true,
    },
  );

export const OperationalUser =
  models.OperationalUser ||
  model(
    "OperationalUser",
    OperationalUserSchema,
  );