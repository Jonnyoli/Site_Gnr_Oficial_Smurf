import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    senderDiscordId: {
      type: String,
      required: true,
      index: true,
    },
    senderName: {
      type: String,
      required: true,
      trim: true,
    },
    recipientDiscordId: {
      type: String,
      required: true,
      index: true,
    },
    recipientName: {
      type: String,
      default: "",
      trim: true,
    },
    itemId: {
      type: String,
      required: true,
      index: true,
    },
    message: {
      type: String,
      default: "",
      maxlength: 250,
      trim: true,
    },
    status: {
      type: String,
      enum: ["SENT", "ACCEPTED", "DECLINED"],
      default: "SENT",
      index: true,
    },
    respondedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

schema.index({
  recipientDiscordId: 1,
  status: 1,
  createdAt: -1,
});

const StoreGift =
  mongoose.models.StoreGift ||
  mongoose.model("StoreGift", schema);

export default StoreGift;
