import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    operationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UnitOperation",
      default: null,
      index: true,
    },

    verificationCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },

    result: {
      type: String,
      enum: ["VALID", "REVOKED", "NOT_FOUND"],
      required: true,
      index: true,
    },

    verifiedByDiscordId: {
      type: String,
      default: null,
      index: true,
    },

    verifiedByName: {
      type: String,
      default: null,
      trim: true,
    },

    requestIp: {
      type: String,
      default: null,
      trim: true,
    },

    userAgent: {
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
    timestamps: true,
  },
);

schema.index({
  verificationCode: 1,
  createdAt: -1,
});

const OfficialDocumentVerification =
  mongoose.models.OfficialDocumentVerification ||
  mongoose.model(
    "OfficialDocumentVerification",
    schema,
  );

export default OfficialDocumentVerification;
