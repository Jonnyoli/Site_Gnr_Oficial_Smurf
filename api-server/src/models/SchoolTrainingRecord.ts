import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    studentId: { type: String, required: true, index: true },
    studentName: { type: String, required: true },
    trainingCode: { type: String, required: true, index: true },
    trainingTitle: { type: String, required: true },
    mandatory: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["COMPLETED", "FAILED", "REINFORCEMENT_REQUIRED"],
      required: true,
    },
    trainerId: { type: String, required: true },
    trainerName: { type: String, required: true },
    score: { type: Number, default: null, min: 0, max: 20 },
    notes: { type: String, default: "" },
    completedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

schema.index(
  { studentId: 1, trainingCode: 1 },
  { unique: true },
);

export default
  mongoose.models.SchoolTrainingRecord ||
  mongoose.model("SchoolTrainingRecord", schema);
