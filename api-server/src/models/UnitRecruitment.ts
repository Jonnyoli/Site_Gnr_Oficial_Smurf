import mongoose from "mongoose";

const questionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    required: { type: Boolean, default: true },
  },
  { _id: false },
);

const schema = new mongoose.Schema(
  {
    unitCode: { type: String, required: true, uppercase: true, index: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    requirements: { type: [String], default: [] },
    vacancies: { type: Number, default: null, min: 1 },
    opensAt: { type: Date, required: true },
    closesAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ["DRAFT", "OPEN", "CLOSED", "CANCELLED"],
      default: "OPEN",
      index: true,
    },
    questions: { type: [questionSchema], default: [] },
    createdById: { type: String, required: true },
    createdByName: { type: String, required: true },
  },
  { timestamps: true },
);

schema.index({ unitCode: 1, status: 1, closesAt: 1 });
export default mongoose.models.UnitRecruitment || mongoose.model("UnitRecruitment", schema);
