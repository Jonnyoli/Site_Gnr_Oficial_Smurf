import mongoose from "mongoose";

const equippedSchema = new mongoose.Schema(
  {
    frame: { type: String, default: null },
    background: { type: String, default: null },
    title: { type: String, default: null },
    theme: { type: String, default: null },
    badges: { type: [String], default: [] },
  },
  { _id: false },
);

const storeInventorySchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    credits: { type: Number, default: 500, min: 0, max: 10000000 },
    ownedItems: { type: [String], default: [] },
    favoriteItemIds: { type: [String], default: [] },
    equipped: { type: equippedSchema, default: () => ({}) },
    lastCalculatedAt: { type: Date, default: null },
    purchasesLocked: { type: Boolean, default: false },
    purchasesLockedReason: { type: String, default: null },
    purchasesLockedAt: { type: Date, default: null },
    purchasesLockedBy: { type: String, default: null },
    lastReconciledAt: { type: Date, default: null },
    lastReconciliationStatus: {
      type: String,
      enum: ["OK", "MISMATCH", "NOT_CHECKED"],
      default: "NOT_CHECKED",
    },
    lastReconciliationDifference: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const StoreInventory =
  mongoose.models.StoreInventory ||
  mongoose.model("StoreInventory", storeInventorySchema);

export default StoreInventory;
