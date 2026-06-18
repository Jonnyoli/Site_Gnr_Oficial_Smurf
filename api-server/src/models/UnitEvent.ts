import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    status: {
      type: String,
      enum: ["PRESENT", "MAYBE", "ABSENT"],
      required: true,
    },
    note: { type: String, default: "" },
    respondedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const schema = new mongoose.Schema(
  {
    unitCode: { type: String, required: true, uppercase: true, index: true },
    type: {
      type: String,
      enum: ["RECRUITMENT", "TRAINING", "FORMATION", "OPERATION", "MEETING", "JOINT_PATROL", "CEREMONY", "OTHER"],
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    location: { type: String, default: "" },
    startsAt: { type: Date, required: true, index: true },
    endsAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ["SCHEDULED", "CANCELLED", "COMPLETED"],
      default: "SCHEDULED",
      index: true,
    },
    visibility: {
      type: String,
      enum: ["UNIT", "PUBLIC"],
      default: "UNIT",
    },
    responsibleId: { type: String, default: null },
    responsibleName: { type: String, default: null },
    attendanceEnabled: { type: Boolean, default: true },
    attendance: { type: [attendanceSchema], default: [] },
    discord: {
      notifiedAt: { type: Date, default: null },
      notificationError: { type: String, default: null },
      channelId: { type: String, default: null, index: true },
      messageId: { type: String, default: null, index: true },
      jumpUrl: { type: String, default: null },
      reactionsReady: { type: Boolean, default: false },
      reactionErrors: {
        type: [
          {
            emoji: { type: String, required: true },
            error: { type: String, required: true },
          },
        ],
        default: [],
      },
      reminder24hAt: { type: Date, default: null },
      reminder1hAt: { type: Date, default: null },
    },
    createdById: { type: String, required: true },
    createdByName: { type: String, required: true },
    updatedById: { type: String, default: null },
  },
  { timestamps: true },
);

schema.index({ unitCode: 1, startsAt: 1 });
export default mongoose.models.UnitEvent || mongoose.model("UnitEvent", schema);
