import mongoose from "mongoose";

const reactionSchema = new mongoose.Schema(
  {
    userDiscordId: {
      type: String,
      required: true,
    },
    userName: {
      type: String,
      required: true,
      trim: true,
    },
    emoji: {
      type: String,
      enum: ["LIKE", "SALUTE", "SHIELD", "STAR"],
      required: true,
    },
    at: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const schema = new mongoose.Schema(
  {
    profileDiscordId: {
      type: String,
      required: true,
      index: true,
    },
    authorDiscordId: {
      type: String,
      required: true,
      index: true,
    },
    authorName: {
      type: String,
      required: true,
      trim: true,
    },
    authorRank: {
      type: String,
      default: "",
      trim: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    category: {
      type: String,
      enum: [
        "COMMENT",
        "PRAISE",
        "THANKS",
        "TEAM",
        "OPERATION",
      ],
      default: "COMMENT",
      index: true,
    },
    pinned: {
      type: Boolean,
      default: false,
      index: true,
    },
    hidden: {
      type: Boolean,
      default: false,
      index: true,
    },
    hiddenReason: {
      type: String,
      default: "",
      trim: true,
    },
    moderatedByDiscordId: {
      type: String,
      default: null,
    },
    moderatedByName: {
      type: String,
      default: null,
    },
    reactions: {
      type: [reactionSchema],
      default: [],
    },
    editedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

schema.index({
  profileDiscordId: 1,
  pinned: -1,
  createdAt: -1,
});

const ProfileComment =
  mongoose.models.ProfileComment ||
  mongoose.model("ProfileComment", schema);

export default ProfileComment;
