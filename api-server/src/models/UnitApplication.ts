import mongoose from "mongoose";

const answerSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true },
    question: { type: String, required: true },
    answer: { type: String, default: "" },
  },
  { _id: false },
);

const schema = new mongoose.Schema(
  {
    recruitmentId: { type: mongoose.Schema.Types.ObjectId, ref: "UnitRecruitment", required: true, index: true },
    unitCode: { type: String, required: true, uppercase: true, index: true },
    applicantId: { type: String, required: true, index: true },
    applicantName: { type: String, required: true },
    motivation: { type: String, required: true },
    answers: { type: [answerSchema], default: [] },
    status: {
      type: String,
      enum: ["PENDING", "INTERVIEW", "APPROVED", "REJECTED", "WITHDRAWN"],
      default: "PENDING",
      index: true,
    },
    reviewedById: { type: String, default: null },
    reviewedByName: { type: String, default: null },
    reviewReason: { type: String, default: "" },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

schema.index({ recruitmentId: 1, applicantId: 1 }, { unique: true });
export default mongoose.models.UnitApplication || mongoose.model("UnitApplication", schema);
