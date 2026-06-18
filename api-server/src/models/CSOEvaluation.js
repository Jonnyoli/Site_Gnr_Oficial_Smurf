import mongoose from "mongoose";

const CSOEvaluationSchema = new mongoose.Schema(
  {
    evaluatedDiscordId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },

    evaluatedName: {
      type: String,
      required: true,
      trim: true,
    },

    evaluatorDiscordId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },

    evaluatorName: {
      type: String,
      required: true,
      trim: true,
    },

    score: {
      type: Number,
      required: true,
      min: 0,
      max: 20,
    },

    points: {
      type: Number,
      default: 0,
      min: 0,
    },

    opinion: {
      type: String,
      required: true,
      trim: true,
      minlength: 20,
      maxlength: 3000,
    },

    weekStart: {
      type: Date,
      required: true,
      index: true,
    },

    weekEnd: {
      type: Date,
      required: true,
      index: true,
    },

    meetingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CSOMeeting",
      default: null,
      index: true,
    },
  },
  { timestamps: true },
);

CSOEvaluationSchema.index({
  evaluatedDiscordId: 1,
  weekStart: 1,
  weekEnd: 1,
});

const CSOEvaluation =
  mongoose.models.CSOEvaluation ||
  mongoose.model("CSOEvaluation", CSOEvaluationSchema);

export default CSOEvaluation;
