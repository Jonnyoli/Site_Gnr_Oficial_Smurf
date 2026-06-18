import mongoose from "mongoose";

const answerSchema =
  new mongoose.Schema(
    {
      questionId: {
        type: String,
        required: true,
      },

      question:
        {
          type: String,
          required: true,
        },

      answer: {
        type: String,
        default: "",
      },

      maxPoints: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    {
      _id: false,
    },
  );

const schema =
  new mongoose.Schema(
    {
      studentId: {
        type: String,
        required: true,
        index: true,
      },

      studentName: {
        type: String,
        required: true,
      },

      trainingCode: {
        type: String,
        required: true,
        index: true,
      },

      trainingTitle: {
        type: String,
        required: true,
      },

      mandatory: {
        type: Boolean,
        default: false,
      },

      status: {
        type: String,
        enum: [
          "IN_PROGRESS",
          "SUBMITTED",
          "APPROVED",
          "REJECTED",
          "CANCELLED",
        ],
        default: "IN_PROGRESS",
        index: true,
      },

      attempt: {
        type: Number,
        default: 1,
        min: 1,
      },

      answers: {
        type: [answerSchema],
        default: [],
      },

      submittedAt: {
        type: Date,
        default: null,
      },

      reviewedAt: {
        type: Date,
        default: null,
      },

      reviewerId: {
        type: String,
        default: null,
      },

      reviewerName: {
        type: String,
        default: null,
      },

      score: {
        type: Number,
        default: null,
        min: 0,
        max: 20,
      },

      reviewNotes: {
        type: String,
        default: "",
      },
    },
    {
      timestamps: true,
    },
  );

schema.index({
  studentId: 1,
  trainingCode: 1,
  createdAt: -1,
});

export default
  mongoose.models
    .SchoolQuizAttempt ||
  mongoose.model(
    "SchoolQuizAttempt",
    schema,
  );
