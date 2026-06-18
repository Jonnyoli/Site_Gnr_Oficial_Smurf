import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    discordId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    equipped: {
      muralBackground: {
        type: String,
        default: null,
      },
      commentStyle: {
        type: String,
        default: null,
      },
      signature: {
        type: String,
        default: null,
      },
      reactionPack: {
        type: String,
        default: null,
      },
      socialBadges: {
        type: [String],
        default: [],
      },
      highlightedCommentStyle: {
        type: String,
        default: null,
      },
      entryEffect: {
        type: String,
        default: null,
      },
    },

    muralSettings: {
      overlayOpacity: {
        type: Number,
        default: 0.72,
        min: 0,
        max: 1,
      },
      blur: {
        type: Number,
        default: 0,
        min: 0,
        max: 16,
      },
      position: {
        type: String,
        enum: [
          "center",
          "top",
          "bottom",
          "left",
          "right",
        ],
        default: "center",
      },
    },

    featuredCommentId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },

    privacy: {
      comments: {
        type: String,
        enum: [
          "EVERYONE",
          "UNIT",
          "PATROL_PARTNERS",
          "DISABLED",
        ],
        default: "EVERYONE",
      },
      showCollection: {
        type: Boolean,
        default: true,
      },
      showVisits: {
        type: Boolean,
        default: true,
      },
    },
  },
  { timestamps: true },
);

const ProfileSocialCustomization =
  mongoose.models.ProfileSocialCustomization ||
  mongoose.model(
    "ProfileSocialCustomization",
    schema,
  );

export default ProfileSocialCustomization;
