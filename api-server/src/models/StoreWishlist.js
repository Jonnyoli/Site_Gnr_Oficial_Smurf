import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    itemIds: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true },
);

const StoreWishlist =
  mongoose.models.StoreWishlist ||
  mongoose.model("StoreWishlist", schema);

export default StoreWishlist;
