import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    profileDiscordId: {
      type: String,
      required: true,
      index: true,
    },
    awardedByDiscordId: {
      type: String,
      required: true,
      index: true,
    },
    awardedByName: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: [
        "LEADERSHIP",
        "TEAMWORK",
        "PROFESSIONALISM",
        "ACTIVITY",
        "COMMUNICATION",
        "DISCIPLINE",
        "OPERATIONAL_MERIT",
        "TRAINING",
      ],
      required: true,
      index: true,
    },
    note: {
      type: String,
      default: "",
      trim: true,
      maxlength: 300,
    },
    official: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true },
);

schema.index(
  {
    profileDiscordId: 1,
    awardedByDiscordId: 1,
    type: 1,
  },
  { unique: true },
);

const ProfileRecognition =
  mongoose.models.ProfileRecognition ||
  mongoose.model(
    "ProfileRecognition",
    schema,
  );

export default ProfileRecognition;
