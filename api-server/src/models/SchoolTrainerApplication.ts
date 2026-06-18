import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    applicantId: { type: String, required: true, index: true },
    applicantName: { type: String, required: true },
    motivation: { type: String, required: true, minlength: 20 },
    experience: { type: String, default: "" },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
      index: true,
    },
    decisionBy: { type: String, default: null },
    decisionByName: { type: String, default: null },
    decisionReason: { type: String, default: "" },
    decidedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

schema.index(
  { applicantId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "PENDING" } },
);

export default
  mongoose.models.SchoolTrainerApplication ||
  mongoose.model("SchoolTrainerApplication", schema);
