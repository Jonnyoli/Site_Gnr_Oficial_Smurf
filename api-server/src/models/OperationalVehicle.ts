import { Schema, model, models } from "mongoose";

const OperationalVehicleSchema = new Schema(
  {
    nome: { type: String, required: true, trim: true, index: true },
    ativo: { type: Boolean, default: true, index: true },
    categoria: { type: String, default: null },
    matricula: { type: String, default: null },
    unidade: { type: String, default: null },
  },
  { collection: "viaturas", timestamps: true },
);

export const OperationalVehicle =
  models.OperationalVehicle ||
  model("OperationalVehicle", OperationalVehicleSchema);
