import mongoose from "mongoose";

const storeProductSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    category: {
      type: String,
      required: true,
      enum: [
        "MOLDURAS",
        "EMBLEMAS",
        "FUNDOS",
        "TITULOS",
        "TEMAS",
        "COLECOES",
        "SOCIAL",
        "EXCLUSIVOS",
      ],
      index: true,
    },
    rarity: {
      type: String,
      enum: [
        "COMUM",
        "RARO",
        "EPICO",
        "LENDARIO",
        "EXCLUSIVO",
        "INSTITUCIONAL",
      ],
      default: "COMUM",
    },
    price: { type: Number, required: true, min: 0, max: 1000000 },
    image: { type: String, default: null },
    collection: { type: String, default: null, trim: true },
    unitKey: {
      type: String,
      enum: [
        "GNR",
        "COMANDO",
        "NIC",
        "GIOE",
        "GSA",
        "UNT",
        "USHE",
        "DI",
        "ESCOLA",
      ],
      default: "GNR",
      index: true,
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },
    equipSlot: {
      type: String,
      enum: ["frame", "background", "title", "theme", "badges", null],
      default: null,
    },
    maxEquipped: { type: Number, min: 1, max: 10, default: null },
    requiredRoleKeys: {
      type: [String],
      enum: [
        "NIC",
        "UNT",
        "GIOE",
        "USHE",
        "DI",
        "FOUNDER",
        "COMMAND_GENERAL",
      ],
      default: [],
    },
    purchasable: { type: Boolean, default: true },

    // null = stock ilimitado
    stock: {
      type: Number,
      default: null,
      min: 0,
      max: 1000000,
      index: true,
    },

    soldCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    limited: { type: Boolean, default: false },
    featured: { type: Boolean, default: false },
    active: { type: Boolean, default: true, index: true },
    discount: { type: Number, min: 0, max: 100, default: 0 },
    socialType: {
      type: String,
      enum: [
        "MURAL_BACKGROUND",
        "COMMENT_STYLE",
        "SIGNATURE",
        "REACTION_PACK",
        "SOCIAL_BADGE",
        "HIGHLIGHT_STYLE",
        "ENTRY_EFFECT",
        null,
      ],
      default: null,
    },
    previewRoute: { type: String, default: null },
    sortOrder: { type: Number, default: 0, index: true },
    createdBy: { type: String, default: null },
    updatedBy: { type: String, default: null },

    archivedAt: {
      type: Date,
      default: null,
    },

    archivedBy: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

const StoreProduct =
  mongoose.models.StoreProduct ||
  mongoose.model("StoreProduct", storeProductSchema);

export default StoreProduct;
