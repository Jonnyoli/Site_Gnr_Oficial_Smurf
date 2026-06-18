import mongoose from "mongoose";

const scoreSchema = new mongoose.Schema(
  {
    value: {
      type: Number,
      min: 0,
      max: 10,
      default: null,
    },
    notApplicable: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false },
);

const SergeantEvaluationSchema =
  new mongoose.Schema(
    {
      type: {
        type: String,
        enum: ["STANDARD", "ADVANCED_360"],
        required: true,
        index: true,
      },

      source: {
        type: String,
        enum: ["SITE", "DISCORD", "MIGRATED"],
        default: "SITE",
        index: true,
      },

      legacy: {
        collection: {
          type: String,
          enum: ["Avaliacao", "AvaliacaoAvancada", null],
          default: null,
        },
        id: {
          type: String,
          default: null,
        },
      },

      status: {
        type: String,
        enum: [
          "DRAFT",
          "PENDING",
          "APPROVED",
          "REJECTED",
        ],
        default: "PENDING",
        index: true,
      },

      evaluatorDiscordId: {
        type: String,
        required: true,
        index: true,
      },

      evaluatorName: {
        type: String,
        required: true,
        trim: true,
      },

      evaluatorRank: {
        type: String,
        default: "Sargento",
        trim: true,
      },

      evaluatedDiscordId: {
        type: String,
        required: true,
        index: true,
      },

      evaluatedName: {
        type: String,
        required: true,
        trim: true,
      },

      evaluatedRank: {
        type: String,
        default: "Guarda",
        trim: true,
      },

      evaluatedAvatarUrl: {
        type: String,
        default: null,
      },

      theme: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200,
      },

      standard: {
        radio: {
          type: scoreSchema,
          default: null,
        },
        conduct: {
          type: scoreSchema,
          default: null,
        },
        detention: {
          type: scoreSchema,
          default: null,
        },
        incident: {
          type: scoreSchema,
          default: null,
        },
        detentionsSummary: {
          type: String,
          default: "",
          maxlength: 1500,
        },
        incidentSummary: {
          type: String,
          default: "",
          maxlength: 1500,
        },
        observations: {
          type: String,
          default: "",
          maxlength: 2500,
        },
        finalOpinion: {
          type: String,
          default: "",
          maxlength: 1500,
        },
      },

      advanced: {
        offensiveDriving: {
          type: scoreSchema,
          default: null,
        },
        shootingWeapons: {
          type: scoreSchema,
          default: null,
        },
        tacticalPositioning: {
          type: scoreSchema,
          default: null,
        },
        radioCommunications: {
          type: scoreSchema,
          default: null,
        },
        postureConduct: {
          type: scoreSchema,
          default: null,
        },
        leadershipInitiative: {
          type: scoreSchema,
          default: null,
        },
        stressManagement: {
          type: scoreSchema,
          default: null,
        },
        argumentationLegislation: {
          type: scoreSchema,
          default: null,
        },

        patrolSummary: {
          type: String,
          default: "",
          maxlength: 2500,
        },
        behavioralAnalysis: {
          type: String,
          default: "",
          maxlength: 2500,
        },
        strengths: {
          type: String,
          default: "",
          maxlength: 1800,
        },
        improvements: {
          type: String,
          default: "",
          maxlength: 1800,
        },
        promotionOpinion: {
          type: String,
          default: "",
          maxlength: 1800,
        },
        occurrences: {
          type: String,
          default: "",
          maxlength: 1800,
        },
        approaches: {
          type: String,
          default: "",
          maxlength: 1800,
        },
      },

      average: {
        type: Number,
        default: null,
        min: 0,
        max: 10,
      },

      classification: {
        type: String,
        default: null,
      },

      discord: {
        channelId: {
          type: String,
          default: null,
        },
        messageId: {
          type: String,
          default: null,
          index: true,
        },
        jumpUrl: {
          type: String,
          default: null,
        },
        publishedAt: {
          type: Date,
          default: null,
        },
        publishError: {
          type: String,
          default: null,
        },
      },

      decision: {
        byDiscordId: {
          type: String,
          default: null,
        },
        byName: {
          type: String,
          default: null,
        },
        at: {
          type: Date,
          default: null,
        },
        source: {
          type: String,
          enum: ["SITE", "DISCORD", "LEGACY", null],
          default: null,
        },
        reason: {
          type: String,
          default: "",
          maxlength: 1200,
        },
      },
    },
    {
      timestamps: true,
      collection: "sergeantevaluations",
    },
  );

SergeantEvaluationSchema.index({
  status: 1,
  createdAt: -1,
});

SergeantEvaluationSchema.index({
  evaluatedDiscordId: 1,
  status: 1,
  createdAt: -1,
});

SergeantEvaluationSchema.index({
  evaluatorDiscordId: 1,
  createdAt: -1,
});

SergeantEvaluationSchema.index(
  {
    "legacy.collection": 1,
    "legacy.id": 1,
  },
  {
    unique: true,
    sparse: true,
  },
);

const SergeantEvaluation =
  mongoose.models.SergeantEvaluation ||
  mongoose.model(
    "SergeantEvaluation",
    SergeantEvaluationSchema,
  );

export default SergeantEvaluation;
