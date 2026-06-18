import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    profileDiscordId: {
      type: String,
      required: true,
      index: true,
    },
    visitorDiscordId: {
      type: String,
      required: true,
      index: true,
    },
    visitorName: {
      type: String,
      default: "",
      trim: true,
    },
    visitedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true },
);

schema.index({
  profileDiscordId: 1,
  visitedAt: -1,
});

const ProfileVisit =
  mongoose.models.ProfileVisit ||
  mongoose.model("ProfileVisit", schema);

export default ProfileVisit;
