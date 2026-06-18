import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    guildId: { type: String, required: true, index: true },
    discordId: { type: String, required: true, index: true },
    username: { type: String, default: "" },
    displayName: { type: String, default: "" },
    avatarUrl: { type: String, default: null },
    roleIds: { type: [String], default: [] },
    isInGuild: { type: Boolean, default: true, index: true },
    trainerKey: { type: String, default: null, index: true },
    assignedTrainerKey: { type: String, default: null, index: true },
    syncedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

schema.index({ guildId: 1, discordId: 1 }, { unique: true });

export default mongoose.models.SchoolDiscordMember ||
  mongoose.model("SchoolDiscordMember", schema);
