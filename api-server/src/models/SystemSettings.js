import mongoose from "mongoose";

const modulePermissionSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,
    },

    label: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    enabled: {
      type: Boolean,
      default: true,
    },

    /**
     * Roles que podem abrir e consultar o módulo.
     */
    viewRoleIds: {
      type: [String],
      default: [],
    },

    /**
     * Roles que podem criar ou editar informação.
     */
    manageRoleIds: {
      type: [String],
      default: [],
    },

    /**
     * Roles que podem eliminar definitivamente.
     */
    deleteRoleIds: {
      type: [String],
      default: [],
    },
  },
  {
    _id: false,
  },
);

const settingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: "global",
    },

    general: {
      excessoHoras: {
        type: Boolean,
        default: true,
      },

      novosDocumentos: {
        type: Boolean,
        default: true,
      },

      resumoDiario: {
        type: Boolean,
        default: false,
      },

      alertasPatrulhas: {
        type: Boolean,
        default: true,
      },

      auditoriaAcessos: {
        type: Boolean,
        default: true,
      },

      mfaObrigatoria: {
        type: Boolean,
        default: true,
      },

      bloquearSessaoInativa: {
        type: Boolean,
        default: true,
      },

      modoManutencao: {
        type: Boolean,
        default: false,
      },

      timeoutMinutos: {
        type: Number,
        default: 15,
        min: 5,
        max: 120,
      },

      limiteHorasSemanais: {
        type: Number,
        default: 40,
        min: 1,
        max: 168,
      },

      horaResumo: {
        type: String,
        default: "00:00",
      },
    },

    modules: {
      type: [modulePermissionSchema],
      default: [],
    },

    updatedByDiscordId: {
      type: String,
      default: null,
    },

    updatedByName: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

const SystemSettings =
  mongoose.models.SystemSettings ||
  mongoose.model("SystemSettings", settingsSchema);

export default SystemSettings;