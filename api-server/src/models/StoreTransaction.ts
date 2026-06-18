import mongoose from "mongoose";

const storeTransactionSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    type: {
      type: String,
      required: true,
      enum: [
        "BUY",
        "EQUIP",
        "UNEQUIP",
        "CREDITS_ADD",
        "CREDITS_REMOVE",
        "GIFT",
        "MISSION_REWARD",
        "REFUND",
      ],
      index: true,
    },
    itemId: { type: String, default: null, index: true },
    amount: { type: Number, required: true },
    beforeCredits: { type: Number, required: true },
    afterCredits: { type: Number, required: true },
    reason: { type: String, required: true },
    createdBy: { type: String, required: true },
    idempotencyKey: { type: String, default: null, sparse: true, unique: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

storeTransactionSchema.index({ userId: 1, createdAt: -1 });

const StoreTransaction =
  mongoose.models.StoreTransaction ||
  mongoose.model("StoreTransaction", storeTransactionSchema);

export default StoreTransaction;
