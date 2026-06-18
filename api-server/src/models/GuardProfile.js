import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    discordId: { type: String, required: true, unique: true, index: true },
    biography: { type: String, default: "", maxlength: 1200, trim: true },
    motto: { type: String, default: "", maxlength: 180, trim: true },
    updatedByDiscordId: { type: String, default: null },
    updatedByName: { type: String, default: null },
  },
  { timestamps: true },
);

const GuardProfile =
  mongoose.models.GuardProfile ||
  mongoose.model("GuardProfile", schema);

export default GuardProfile;
