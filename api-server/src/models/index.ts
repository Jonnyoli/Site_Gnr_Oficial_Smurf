import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  discordId: { type: String, required: true, unique: true },
  warName: String,
  callsignNumber: String,
  rank: String,
  unidade: { type: String, default: "Patrulha" },
  estado: { type: String, default: "Folga" },
  totalHours: { type: Number, default: 0 },
  joinedAt: { type: Date, default: Date.now },
  savedTags: { type: [String], default: [] },
});

const PontoSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  startTime: { type: Date, required: true },
  endTime: Date,
  totalPauseTime: { type: Number, default: 0 },
  status: { type: String, enum: ["ABERTO", "FECHADO"], default: "ABERTO" },
  tipo: { type: String, default: "Normal" },
  descricao: String,
});

const CPSchema = new mongoose.Schema({
  number: String,
  commanderId: String,
  participants: String,
  status: { type: String, enum: ["ABERTO", "FECHADO", "CANCELADO"], default: "ABERTO" },
  startTime: { type: Date, default: Date.now },
  endTime: Date,
  vehicle: String,
});

const TicketSchema = new mongoose.Schema({
  ownerId: String,
  channelId: String,
  status: { type: String, default: "OPEN" },
  type: String,
  closedAt: Date,
  closedBy: String,
  transcriptPath: String,
});

const GenericDataSchema = new mongoose.Schema(
  {
    type: { type: String, required: true, index: true },
    data: { type: mongoose.Schema.Types.Mixed, required: true },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const StoreInventorySchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    credits: { type: Number, default: 500, min: 0 },
    ownedItems: { type: [String], default: [] },
    equipped: {
      frame: { type: String, default: null },
      background: { type: String, default: null },
      title: { type: String, default: null },
      theme: { type: String, default: null },
      badges: { type: [String], default: [] },
    },
    lastCalculatedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const StoreTransactionSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ["BUY", "EQUIP", "UNEQUIP", "CREDITS_ADD", "CREDITS_REMOVE"],
      required: true,
    },
    itemId: { type: String, default: null },
    amount: { type: Number, default: 0 },
    beforeCredits: { type: Number, default: 0 },
    afterCredits: { type: Number, default: 0 },
    reason: { type: String, default: null },
    createdBy: { type: String, default: "SYSTEM" },
  },
  { timestamps: true }
);

const StorePurchaseLogSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    itemId: { type: String, required: true },
    action: {
      type: String,
      enum: ["BOUGHT", "EQUIPPED", "UNEQUIPPED"],
      required: true,
    },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export const User = mongoose.models.User || mongoose.model("User", UserSchema);
export const Ponto = mongoose.models.Ponto || mongoose.model("Ponto", PontoSchema);
export const CP = mongoose.models.CP || mongoose.model("CP", CPSchema);
export const Ticket = mongoose.models.Ticket || mongoose.model("Ticket", TicketSchema);
export const SystemData =
  mongoose.models.SystemData || mongoose.model("SystemData", GenericDataSchema);
export const StoreInventory =
  mongoose.models.StoreInventory || mongoose.model("StoreInventory", StoreInventorySchema);
export const StoreTransaction =
  mongoose.models.StoreTransaction || mongoose.model("StoreTransaction", StoreTransactionSchema);
export const StorePurchaseLog =
  mongoose.models.StorePurchaseLog || mongoose.model("StorePurchaseLog", StorePurchaseLogSchema);

export { AuditLog } from "./AuditLog";
export { default as SergeantEvaluation } from "./SergeantEvaluation";
