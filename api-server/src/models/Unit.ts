import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true },
    shortName: { type: String, required: true },
    memberRoleId: { type: String, required: true },
    directorRoleIds: { type: [String], default: [] },
    discordChannelId: { type: String, default: null },
    description: { type: String, default: "" },
    mission: { type: String, default: "" },
    motto: { type: String, default: "" },
    active: { type: Boolean, default: true },
    updatedBy: { type: String, default: null },
  },
  { timestamps: true },
);

export default mongoose.models.Unit || mongoose.model("Unit", schema);
