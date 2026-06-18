import mongoose from "mongoose";

const storePurchaseLogSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    itemId: { type: String, required: true, index: true },
    action: {
      type: String,
      required: true,
      enum: ["BOUGHT", "EQUIPPED", "UNEQUIPPED", "GIFTED", "REFUNDED"],
      index: true,
    },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

storePurchaseLogSchema.index({ userId: 1, createdAt: -1 });

const StorePurchaseLog =
  mongoose.models.StorePurchaseLog ||
  mongoose.model("StorePurchaseLog", storePurchaseLogSchema);

export default StorePurchaseLog;
