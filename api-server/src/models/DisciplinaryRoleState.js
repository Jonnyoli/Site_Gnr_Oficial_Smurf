import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    discordUserId: { type: String, required: true, unique: true, index: true },
    displayName: { type: String, default: null },
    activeRoleIds: { type: [String], default: [] },
    lastCheckedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.models.DisciplinaryRoleState ||
  mongoose.model("DisciplinaryRoleState", schema);
