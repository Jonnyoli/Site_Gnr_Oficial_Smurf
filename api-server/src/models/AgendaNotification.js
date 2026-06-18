import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    eventKey: { type: String, required: true, index: true },
    discordId: { type: String, required: true, index: true },
    unit: { type: String, required: true, index: true },
    sentAt: { type: Date, default: Date.now },
    status: { type: String, enum: ["SENT", "FAILED"], default: "SENT" },
    error: { type: String, default: null },
  },
  { timestamps: true },
);

schema.index({ eventKey: 1, discordId: 1 }, { unique: true });

const AgendaNotification =
  mongoose.models.AgendaNotification ||
  mongoose.model("AgendaNotification", schema);

export default AgendaNotification;
