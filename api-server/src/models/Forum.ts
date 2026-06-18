import mongoose from "mongoose";

const reactionSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      enum: ["LIKE", "SHIELD", "CHECK", "FIRE"],
      required: true,
    },
    userIds: {
      type: [String],
      default: [],
    },
  },
  { _id: false },
);

const commentSchema = new mongoose.Schema(
  {
    authorId: {
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
      default: "Guarda",
      trim: true,
    },
    authorUnit: {
      type: String,
      default: "Patrulha",
      trim: true,
    },
    authorAvatarUrl: {
      type: String,
      default: null,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000,
    },
    mentionUserIds: {
      type: [String],
      default: [],
      index: true,
    },
    parentCommentId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    reactions: {
      type: [reactionSchema],
      default: [],
    },
    isSolution: {
      type: Boolean,
      default: false,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
      default: null,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

const ForumPostSchema = new mongoose.Schema(
  {
    authorId: {
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
      default: "Guarda",
      trim: true,
    },
    authorUnit: {
      type: String,
      default: "Patrulha",
      trim: true,
    },
    authorAvatarUrl: {
      type: String,
      default: null,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
      index: "text",
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 12000,
      index: "text",
    },
    category: {
      type: String,
      enum: [
        "GENERAL",
        "OPERATIONAL",
        "TRAINING",
        "PATROL",
        "SUGGESTIONS",
        "PROCEDURES",
        "ACHIEVEMENTS",
        "COMMAND",
      ],
      default: "GENERAL",
      index: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    mentionUserIds: {
      type: [String],
      default: [],
      index: true,
    },
    mentionRoleIds: {
      type: [String],
      default: [],
    },

    visibility: {
      type: String,
      enum: ["ALL", "UNIT", "COMMAND"],
      default: "ALL",
      index: true,
    },
    allowedRoleIds: {
      type: [String],
      default: [],
    },

    status: {
      type: String,
      enum: ["OPEN", "RESOLVED", "LOCKED", "ARCHIVED"],
      default: "OPEN",
      index: true,
    },
    isOfficial: {
      type: Boolean,
      default: false,
      index: true,
    },
    isPinned: {
      type: Boolean,
      default: false,
      index: true,
    },
    isHighlighted: {
      type: Boolean,
      default: false,
    },
    commentsEnabled: {
      type: Boolean,
      default: true,
    },

    views: {
      type: Number,
      default: 0,
      min: 0,
    },
    viewedBy: {
      type: [String],
      default: [],
    },
    reactions: {
      type: [reactionSchema],
      default: [],
    },
    bookmarks: {
      type: [String],
      default: [],
    },
    followers: {
      type: [String],
      default: [],
    },
    comments: {
      type: [commentSchema],
      default: [],
    },

    discord: {
      channelId: {
        type: String,
        default: null,
      },
      messageId: {
        type: String,
        default: null,
      },
      jumpUrl: {
        type: String,
        default: null,
      },
      publishedAt: {
        type: Date,
        default: null,
      },
    },

    lastActivityAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    moderatedBy: {
      type: String,
      default: null,
    },
    moderationReason: {
      type: String,
      default: null,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
    collection: "forumposts",
  },
);

ForumPostSchema.index({
  isPinned: -1,
  lastActivityAt: -1,
});

ForumPostSchema.index({
  category: 1,
  status: 1,
  lastActivityAt: -1,
});

ForumPostSchema.index({
  authorId: 1,
  createdAt: -1,
});

const ForumNotificationSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "MENTION_POST",
        "MENTION_COMMENT",
        "REPLY",
        "REACTION",
        "SOLUTION",
        "MODERATION",
      ],
      required: true,
    },
    actorId: {
      type: String,
      required: true,
    },
    actorName: {
      type: String,
      required: true,
    },
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ForumPost",
      required: true,
      index: true,
    },
    commentId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    title: {
      type: String,
      required: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      maxlength: 500,
    },
    readAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "forumnotifications",
  },
);

ForumNotificationSchema.index({
  userId: 1,
  readAt: 1,
  createdAt: -1,
});

const ForumPost =
  mongoose.models.ForumPost ||
  mongoose.model("ForumPost", ForumPostSchema);

const ForumNotification =
  mongoose.models.ForumNotification ||
  mongoose.model(
    "ForumNotification",
    ForumNotificationSchema,
  );

export {
  ForumPost,
  ForumNotification,
};

export default ForumPost;
