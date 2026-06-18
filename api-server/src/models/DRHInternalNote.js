import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    subjectDiscordId: {
      type: String,
      required: true,
      index: true,
    },

    subjectName: {
      type: String,
      required: true,
      trim: true,
    },

    note: {
      type: String,
      required: true,
      trim: true,
    },

    visibility: {
      type: String,
      enum: ["DRH", "COMMAND"],
      default: "DRH",
      index: true,
    },

    createdByDiscordId: {
      type: String,
      required: true,
    },

    createdByName: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
);

schema.index({
  subjectDiscordId: 1,
  createdAt: -1,
});

const DRHInternalNote =
  mongoose.models.DRHInternalNote ||
  mongoose.model("DRHInternalNote", schema);

export default DRHInternalNote;
