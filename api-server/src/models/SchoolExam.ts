import mongoose from "mongoose";

const criterionSchema =
  new mongoose.Schema(
    {
      key: { type: String, required: true },
      label: { type: String, required: true },
      score: { type: Number, default: 0, min: 0, max: 20 },
      weight: { type: Number, default: 1, min: 0 },
      notes: { type: String, default: "" },
    },
    { _id: false },
  );

const schema =
  new mongoose.Schema(
    {
      studentId: { type: String, required: true, index: true },
      studentName: { type: String, required: true },

      status: {
        type: String,
        enum: [
          "REQUESTED",
          "SCHEDULED",
          "IN_PROGRESS",
          "APPROVED",
          "FAILED",
          "CANCELLED",
          "ARCHIVED",
        ],
        default: "REQUESTED",
        index: true,
      },

      attempt: { type: Number, default: 1, min: 1 },
      requestedAt: { type: Date, default: Date.now },
      scheduledAt: { type: Date, default: null },
      startedAt: { type: Date, default: null },
      acceptedAt: { type: Date, default: null },
      decidedAt: { type: Date, default: null },

      examinerId: { type: String, default: null },
      examinerName: { type: String, default: null },
      assignedById: { type: String, default: null },
      assignedByName: { type: String, default: null },

      patrolCallsign: { type: String, default: "LINCOLN" },
      patrolVehicle: { type: String, default: null },
      patrolCpId: { type: mongoose.Schema.Types.ObjectId, default: null },

      score: { type: Number, default: null, min: 0, max: 20 },
      criteria: { type: [criterionSchema], default: [] },
      notes: { type: String, default: "" },
      failureReason: { type: String, default: "" },

      trainerRecommendation: { type: String, default: "" },
      practicalEvaluationCompleted: { type: Boolean, default: false },
      disciplinaryBlock: { type: Boolean, default: false },

      secondFailureAction: {
        type: String,
        enum: ["NONE", "EXCLUSION_RECOMMENDED", "SUPERIOR_REVIEW"],
        default: "NONE",
      },

      resultRecordedBy: { type: String, default: null },
      resultRecordedByName: { type: String, default: null },

      discordChannelId: { type: String, default: null },
      discordMessageId: { type: String, default: null },
      discordJumpUrl: { type: String, default: null },

      archivedAt: { type: Date, default: null },
      archivedById: { type: String, default: null },
      archivedByName: { type: String, default: null },

      deletedAt: { type: Date, default: null, index: true },
      deletedById: { type: String, default: null },
      deletedByName: { type: String, default: null },
      deletionReason: { type: String, default: "" },
    },
    { timestamps: true },
  );

schema.index({ studentId: 1, status: 1 });
schema.index({ deletedAt: 1, createdAt: -1 });

export default
  mongoose.models.SchoolExam ||
  mongoose.model("SchoolExam", schema);
