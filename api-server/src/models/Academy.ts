import mongoose from "mongoose";

const quizOptionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true, maxlength: 500 },
    isCorrect: { type: Boolean, default: false },
    explanation: { type: String, default: "", maxlength: 2500 },
  },
  { _id: false },
);

const quizQuestionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    type: {
      type: String,
      enum: ["SINGLE", "TRUE_FALSE", "SCENARIO"],
      default: "SINGLE",
    },
    prompt: { type: String, required: true, maxlength: 1600 },
    options: { type: [quizOptionSchema], default: [] },
    regulationReference: { type: String, default: "", maxlength: 500 },
    remediationLessonId: { type: String, default: null },
    points: { type: Number, default: 10, min: 1, max: 100 },
  },
  { _id: false },
);

const videoChapterSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, maxlength: 150 },
    seconds: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const videoCheckpointSchema = new mongoose.Schema(
  {
    seconds: { type: Number, required: true, min: 0 },
    questionId: { type: String, required: true },
  },
  { _id: false },
);

const lessonSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true, maxlength: 180 },
    description: { type: String, default: "", maxlength: 3000 },
    type: {
      type: String,
      enum: ["VIDEO", "ARTICLE", "SCENARIO", "QUIZ", "RADIO"],
      default: "VIDEO",
    },
    videoUrl: { type: String, default: null },
    thumbnailUrl: { type: String, default: null },
    durationMinutes: { type: Number, default: 5, min: 1, max: 300 },
    content: { type: String, default: "", maxlength: 30000 },
    regulationReference: { type: String, default: "", maxlength: 500 },
    chapters: { type: [videoChapterSchema], default: [] },
    checkpoints: { type: [videoCheckpointSchema], default: [] },
    questions: { type: [quizQuestionSchema], default: [] },
    xpReward: { type: Number, default: 50, min: 0, max: 5000 },
    creditsReward: { type: Number, default: 0, min: 0, max: 10000 },
    passingScore: { type: Number, default: 70, min: 0, max: 100 },
    maxAttempts: { type: Number, default: 3, min: 1, max: 20 },
    order: { type: Number, default: 0 },
    published: { type: Boolean, default: true },
  },
  { _id: false },
);

const AcademyCourseSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, maxlength: 180 },
    subtitle: { type: String, default: "", maxlength: 300 },
    description: { type: String, default: "", maxlength: 5000 },
    category: {
      type: String,
      enum: [
        "INTEGRATION",
        "RADIO",
        "PATROL",
        "DETENTION",
        "CODE_E",
        "PURSUIT",
        "HIGH_RISK",
        "LEADERSHIP",
      ],
      required: true,
      index: true,
    },
    careerTrack: {
      type: String,
      enum: ["PROVISIONAL", "GUARD", "SERGEANT", "OFFICER", "COMMAND", "ALL"],
      default: "ALL",
      index: true,
    },
    level: {
      type: String,
      enum: ["BEGINNER", "INTERMEDIATE", "ADVANCED"],
      default: "BEGINNER",
    },
    coverUrl: { type: String, default: null },
    requiredRoleIds: { type: [String], default: [] },
    prerequisiteCourseSlugs: { type: [String], default: [] },
    lessons: { type: [lessonSchema], default: [] },
    totalXp: { type: Number, default: 0 },
    totalCredits: { type: Number, default: 0 },
    certificateTitle: { type: String, default: "" },
    published: { type: Boolean, default: true, index: true },
    createdBy: { type: String, default: "SYSTEM" },
  },
  { timestamps: true, collection: "academycourses" },
);

const answerFeedbackSchema = new mongoose.Schema(
  {
    questionId: String,
    selectedOptionId: String,
    correct: Boolean,
    explanation: String,
    regulationReference: String,
  },
  { _id: false },
);

const lessonProgressSchema = new mongoose.Schema(
  {
    lessonId: { type: String, required: true },
    completed: { type: Boolean, default: false },
    watchedSeconds: { type: Number, default: 0 },
    score: { type: Number, default: null },
    attempts: { type: Number, default: 0 },
    answers: { type: mongoose.Schema.Types.Mixed, default: {} },
    feedback: { type: [answerFeedbackSchema], default: [] },
    completedAt: { type: Date, default: null },
  },
  { _id: false },
);

const courseProgressSchema = new mongoose.Schema(
  {
    courseSlug: { type: String, required: true },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
    progressPercent: { type: Number, default: 0, min: 0, max: 100 },
    averageScore: { type: Number, default: null },
    lessons: { type: [lessonProgressSchema], default: [] },
    certificateCode: { type: String, default: null },
  },
  { _id: false },
);

const AcademyProfileSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    displayName: { type: String, default: "" },
    rank: { type: String, default: "" },
    unit: { type: String, default: "" },
    avatarUrl: { type: String, default: null },
    xp: { type: Number, default: 0, min: 0 },
    level: { type: Number, default: 1, min: 1 },
    streakDays: { type: Number, default: 0 },
    lastActivityDate: { type: Date, default: null },
    completedLessons: { type: Number, default: 0 },
    completedCourses: { type: Number, default: 0 },
    certificates: { type: [String], default: [] },
    courseProgress: { type: [courseProgressSchema], default: [] },
    badges: { type: [String], default: [] },
    missionClaims: { type: [String], default: [] },
    notificationPreferences: {
      newLesson: { type: Boolean, default: true },
      deadline: { type: Boolean, default: true },
      certificate: { type: Boolean, default: true },
    },
  },
  { timestamps: true, collection: "academyprofiles" },
);

const AcademyMissionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, maxlength: 180 },
    description: { type: String, default: "", maxlength: 2000 },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    targetType: {
      type: String,
      enum: ["LESSONS", "COURSE", "SCORE", "XP"],
      required: true,
    },
    targetValue: { type: Number, required: true },
    courseSlug: { type: String, default: null },
    xpReward: { type: Number, default: 100 },
    creditsReward: { type: Number, default: 0 },
    badgeReward: { type: String, default: null },
    active: { type: Boolean, default: true },
  },
  { timestamps: true, collection: "academymissions" },
);

const AcademyClassSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, maxlength: 150 },
    code: { type: String, required: true, unique: true, index: true },
    instructorIds: { type: [String], default: [] },
    studentIds: { type: [String], default: [] },
    assignedCourseSlugs: { type: [String], default: [] },
    startsAt: { type: Date, default: null },
    deadlineAt: { type: Date, default: null },
    active: { type: Boolean, default: true },
    createdBy: { type: String, required: true },
  },
  { timestamps: true, collection: "academyclasses" },
);

const AcademyNotificationSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ["COURSE_UNLOCKED", "NEW_LESSON", "DEADLINE", "CERTIFICATE", "MISSION", "INSTRUCTOR"],
      required: true,
    },
    title: { type: String, required: true, maxlength: 180 },
    message: { type: String, required: true, maxlength: 1000 },
    courseSlug: { type: String, default: null },
    readAt: { type: Date, default: null, index: true },
  },
  { timestamps: true, collection: "academynotifications" },
);

const RadioExerciseSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    scenario: { type: String, required: true, maxlength: 3000 },
    requiredElements: {
      type: [
        {
          key: String,
          label: String,
          keywords: [String],
          weight: { type: Number, default: 1 },
        },
      ],
      default: [],
    },
    modelAnswer: { type: String, required: true, maxlength: 3000 },
    passingScore: { type: Number, default: 75 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true, collection: "academyradioexercises" },
);

const AcademyCourse =
  mongoose.models.AcademyCourse ||
  mongoose.model("AcademyCourse", AcademyCourseSchema);
const AcademyProfile =
  mongoose.models.AcademyProfile ||
  mongoose.model("AcademyProfile", AcademyProfileSchema);
const AcademyMission =
  mongoose.models.AcademyMission ||
  mongoose.model("AcademyMission", AcademyMissionSchema);
const AcademyClass =
  mongoose.models.AcademyClass ||
  mongoose.model("AcademyClass", AcademyClassSchema);
const AcademyNotification =
  mongoose.models.AcademyNotification ||
  mongoose.model("AcademyNotification", AcademyNotificationSchema);
const RadioExercise =
  mongoose.models.RadioExercise ||
  mongoose.model("RadioExercise", RadioExerciseSchema);

export {
  AcademyCourse,
  AcademyProfile,
  AcademyMission,
  AcademyClass,
  AcademyNotification,
  RadioExercise,
};
