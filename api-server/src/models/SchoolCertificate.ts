import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    userName: { type: String, required: true },
    title: { type: String, required: true },
    type: {
      type: String,
      enum: ["TRAINING", "FINAL_EXAM", "TRAINER"],
      required: true,
    },
    referenceId: { type: mongoose.Schema.Types.ObjectId, default: null },
    certificateNumber: { type: String, required: true, unique: true },
    issuedBy: { type: String, required: true },
    issuedByName: { type: String, required: true },
    issuedAt: { type: Date, default: Date.now },
    downloadUrl: { type: String, default: null },
  },
  { timestamps: true },
);

export default
  mongoose.models.SchoolCertificate ||
  mongoose.model("SchoolCertificate", schema);
