import { Router, type NextFunction, type Request, type Response } from "express";
import crypto from "node:crypto";

import {
  AcademyClass,
  AcademyCourse,
  AcademyMission,
  AcademyNotification,
  AcademyProfile,
  RadioExercise,
} from "../models/Academy";

const router = Router();

const ACADEMY_STAFF_ROLE_IDS = [
  "1147878942099906672",
  "1147878941974077478",
];

function currentUser(req: Request) {
  return req.session?.user || null;
}
function currentUserId(req: Request) {
  return String(currentUser(req)?.id || "");
}
function currentUserName(req: Request) {
  const user = currentUser(req);
  return user?.displayName || user?.global_name || user?.username || "Militar";
}
function currentUserRank(req: Request) {
  const user = currentUser(req);
  return user?.rank || user?.posto || user?.hierarchyGroupLabel || "Guarda";
}
function currentUserUnit(req: Request) {
  const user = currentUser(req);
  return user?.unit || user?.unidade || user?.currentUnit || "Patrulha";
}
function currentUserAvatar(req: Request) {
  const user = currentUser(req);
  return user?.avatarUrl || user?.avatar || user?.image || null;
}
function currentUserRoles(req: Request) {
  const user: any = currentUser(req);
  const possible = [
    user?.roles,
    user?.roleIds,
    user?.guildRoles,
    user?.member?.roles,
    user?.discordRoles,
  ];

  for (const value of possible) {
    if (Array.isArray(value)) {
      return value
        .map((role: any) =>
          typeof role === "string"
            ? role
            : String(role?.id || role?.roleId || role?.value || ""),
        )
        .filter(Boolean);
    }
  }

  return [];
}
function isAcademyStaff(req: Request) {
  const roles = currentUserRoles(req);
  return ACADEMY_STAFF_ROLE_IDS.some((roleId) => roles.includes(roleId));
}
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!currentUserId(req)) {
    res.status(401).json({ error: "É necessário iniciar sessão." });
    return;
  }
  next();
}
function requireStaff(req: Request, res: Response, next: NextFunction) {
  if (!isAcademyStaff(req)) {
    res.status(403).json({ error: "Sem permissões de formador." });
    return;
  }
  next();
}
function calculateLevel(xp: number) {
  return Math.max(1, Math.floor(xp / 500) + 1);
}
function lessonIds(course: any) {
  return (course.lessons || []).map((lesson: any) => lesson.id);
}
function computeCourseProgress(course: any, progress: any) {
  const ids = lessonIds(course);
  const completed = (progress?.lessons || []).filter(
    (lesson: any) => lesson.completed && ids.includes(lesson.lessonId),
  );
  const scores = completed
    .map((lesson: any) => lesson.score)
    .filter((value: any) => Number.isFinite(value));

  return {
    progressPercent: ids.length ? Math.round((completed.length / ids.length) * 100) : 0,
    averageScore: scores.length
      ? Number((scores.reduce((a: number, b: number) => a + b, 0) / scores.length).toFixed(2))
      : null,
  };
}
async function ensureProfile(req: Request) {
  const userId = currentUserId(req);
  let profile = await AcademyProfile.findOne({ userId });

  if (!profile) {
    profile = await AcademyProfile.create({
      userId,
      displayName: currentUserName(req),
      rank: currentUserRank(req),
      unit: currentUserUnit(req),
      avatarUrl: currentUserAvatar(req),
    });
  } else {
    profile.displayName = currentUserName(req);
    profile.rank = currentUserRank(req);
    profile.unit = currentUserUnit(req);
    profile.avatarUrl = currentUserAvatar(req);
    await profile.save();
  }

  return profile;
}
function careerTrackForRank(rank: string) {
  if (/provis[oó]rio|recruta/i.test(rank)) return "PROVISIONAL";
  if (/sargento/i.test(rank)) return "SERGEANT";
  if (/alferes|tenente|capit[aã]o|major|coronel|general/i.test(rank)) return "OFFICER";
  return "GUARD";
}
async function seedUltraData() {
  if ((await AcademyMission.countDocuments()) === 0) {
    const now = new Date();
    const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    await AcademyMission.insertMany([
      {
        title: "Semana da Comunicação",
        description: "Conclui duas aulas e obtém pelo menos 80% num teste de rádio.",
        startsAt: now,
        endsAt: end,
        targetType: "LESSONS",
        targetValue: 2,
        xpReward: 200,
        creditsReward: 100,
        badgeReward: "comunicador-semanal",
      },
      {
        title: "Formando consistente",
        description: "Ganha 300 XP durante a semana.",
        startsAt: now,
        endsAt: end,
        targetType: "XP",
        targetValue: 300,
        xpReward: 150,
        creditsReward: 75,
      },
    ]);
  }

  if ((await RadioExercise.countDocuments()) === 0) {
    await RadioExercise.insertMany([
      {
        slug: "acompanhamento-sultan",
        title: "Início de acompanhamento",
        scenario:
          "Sultan preto, matrícula 45XZ91, dois ocupantes, fuga para norte após ordem de paragem.",
        requiredElements: [
          { key: "central", label: "Chamada à Central", keywords: ["central"], weight: 1 },
          { key: "action", label: "Início de acompanhamento", keywords: ["acompanhamento", "perseguição"], weight: 2 },
          { key: "vehicle", label: "Modelo e cor", keywords: ["sultan", "preto", "preta"], weight: 2 },
          { key: "plate", label: "Matrícula", keywords: ["45xz91"], weight: 2 },
          { key: "direction", label: "Direção", keywords: ["norte"], weight: 1 },
          { key: "occupants", label: "Ocupantes", keywords: ["dois ocupantes", "2 ocupantes"], weight: 1 },
          { key: "support", label: "Pedido de apoio", keywords: ["apoio", "reforço"], weight: 1 },
        ],
        modelAnswer:
          "Central, início de acompanhamento a Sultan preto, matrícula 45XZ91, direção norte, dois ocupantes. Solicito apoio.",
        passingScore: 75,
      },
      {
        slug: "abordagem-rodoviaria",
        title: "Comunicação de abordagem",
        scenario:
          "Veículo Elegy azul, matrícula 91AB22, parado na Avenida Central, com um ocupante.",
        requiredElements: [
          { key: "central", label: "Chamada à Central", keywords: ["central"], weight: 1 },
          { key: "action", label: "Informação de abordagem", keywords: ["abordagem", "fiscalização"], weight: 2 },
          { key: "vehicle", label: "Veículo", keywords: ["elegy", "azul"], weight: 2 },
          { key: "plate", label: "Matrícula", keywords: ["91ab22"], weight: 2 },
          { key: "location", label: "Localização", keywords: ["avenida central"], weight: 2 },
          { key: "occupants", label: "Ocupantes", keywords: ["um ocupante", "1 ocupante"], weight: 1 },
        ],
        modelAnswer:
          "Central, início de abordagem a Elegy azul, matrícula 91AB22, na Avenida Central, um ocupante.",
        passingScore: 75,
      },
    ]);
  }
}

router.use(requireAuth);

router.get("/access", async (req, res) => {
  res.json({
    userId: currentUserId(req),
    canManage: isAcademyStaff(req),
    roles: currentUserRoles(req),
  });
});

router.get("/dashboard", async (req, res) => {
  await seedUltraData();
  const profile = await ensureProfile(req);
  const track = careerTrackForRank(profile.rank);
  const courses = await AcademyCourse.find({
    published: true,
    careerTrack: { $in: ["ALL", track] },
  })
    .sort({ createdAt: 1 })
    .lean();

  const missions = await AcademyMission.find({
    active: true,
    startsAt: { $lte: new Date() },
    endsAt: { $gte: new Date() },
  })
    .sort({ endsAt: 1 })
    .lean();

  const courseCards = courses.map((course: any) => {
    const progress = profile.courseProgress.find(
      (item: any) => item.courseSlug === course.slug,
    );
    const prerequisitesCompleted = (course.prerequisiteCourseSlugs || []).every(
      (slug: string) =>
        profile.courseProgress.some(
          (item: any) => item.courseSlug === slug && item.progressPercent === 100,
        ),
    );

    return {
      ...course,
      progressPercent: progress?.progressPercent || 0,
      averageScore: progress?.averageScore ?? null,
      completed: progress?.progressPercent === 100,
      locked: !prerequisitesCompleted,
    };
  });

  const leaderboard = await AcademyProfile.find()
    .sort({ xp: -1, completedCourses: -1 })
    .limit(10)
    .lean();

  const notifications = await AcademyNotification.find({
    userId: profile.userId,
  })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  const weakest = profile.courseProgress
    .flatMap((course: any) =>
      (course.lessons || [])
        .filter((lesson: any) => Number.isFinite(lesson.score))
        .map((lesson: any) => ({
          courseSlug: course.courseSlug,
          lessonId: lesson.lessonId,
          score: lesson.score,
        })),
    )
    .sort((a: any, b: any) => a.score - b.score)[0] || null;

  res.json({
    profile,
    track,
    courses: courseCards,
    missions,
    leaderboard,
    notifications,
    unreadNotifications: notifications.filter((item: any) => !item.readAt).length,
    recommendation: weakest,
    stats: {
      totalCourses: courses.length,
      completedCourses: profile.completedCourses,
      completedLessons: profile.completedLessons,
      certificates: profile.certificates.length,
    },
  });
});

router.get("/courses/:slug", async (req, res) => {
  const profile = await ensureProfile(req);
  const course = await AcademyCourse.findOne({
    slug: req.params.slug,
    published: true,
  }).lean();

  if (!course) {
    res.status(404).json({ error: "Curso não encontrado." });
    return;
  }

  const prerequisitesCompleted = (course.prerequisiteCourseSlugs || []).every(
    (slug: string) =>
      profile.courseProgress.some(
        (item: any) => item.courseSlug === slug && item.progressPercent === 100,
      ),
  );

  if (!prerequisitesCompleted) {
    res.status(403).json({ error: "Tens de concluir os cursos anteriores primeiro." });
    return;
  }

  const progress = profile.courseProgress.find(
    (item: any) => item.courseSlug === course.slug,
  );

  res.json({
    course,
    progress: progress || {
      courseSlug: course.slug,
      progressPercent: 0,
      averageScore: null,
      lessons: [],
    },
  });
});

router.post("/courses/:slug/lessons/:lessonId/complete", async (req, res) => {
  const profile = await ensureProfile(req);
  const course = await AcademyCourse.findOne({
    slug: req.params.slug,
    published: true,
  });

  if (!course) {
    res.status(404).json({ error: "Curso não encontrado." });
    return;
  }

  const lesson: any = course.lessons.find(
    (item: any) => item.id === req.params.lessonId,
  );

  if (!lesson) {
    res.status(404).json({ error: "Aula não encontrada." });
    return;
  }

  let courseProgress: any = profile.courseProgress.find(
    (item: any) => item.courseSlug === course.slug,
  );

  if (!courseProgress) {
    profile.courseProgress.push({
      courseSlug: course.slug,
      startedAt: new Date(),
      lessons: [],
    } as any);
    courseProgress = profile.courseProgress.find(
      (item: any) => item.courseSlug === course.slug,
    );
  }

  let lessonProgress: any = courseProgress.lessons.find(
    (item: any) => item.lessonId === lesson.id,
  );

  if (!lessonProgress) {
    courseProgress.lessons.push({
      lessonId: lesson.id,
      completed: false,
      attempts: 0,
    } as any);
    lessonProgress = courseProgress.lessons.find(
      (item: any) => item.lessonId === lesson.id,
    );
  }

  if (lessonProgress.attempts >= (lesson.maxAttempts || 3) && !lessonProgress.completed) {
    res.status(409).json({
      error: "Esgotaste as tentativas. Revê a aula e pede desbloqueio ao formador.",
    });
    return;
  }

  let score: number | null = null;
  let passed = true;
  const answers = req.body?.answers || {};
  const feedback: any[] = [];

  if (["QUIZ", "SCENARIO"].includes(lesson.type)) {
    let earned = 0;
    let total = 0;

    for (const question of lesson.questions || []) {
      total += question.points || 0;
      const selectedOptionId = answers[question.id];
      const selected = question.options.find(
        (option: any) => option.id === selectedOptionId,
      );

      const correct = Boolean(selected?.isCorrect);
      if (correct) earned += question.points || 0;

      feedback.push({
        questionId: question.id,
        selectedOptionId,
        correct,
        explanation:
          selected?.explanation ||
          (correct ? "Resposta correta." : "Resposta incorreta."),
        regulationReference: question.regulationReference || "",
      });
    }

    score = total ? Math.round((earned / total) * 100) : 0;
    passed = score >= (lesson.passingScore || 70);
  }

  lessonProgress.attempts += 1;
  lessonProgress.answers = answers;
  lessonProgress.feedback = feedback;
  lessonProgress.score = score;
  lessonProgress.watchedSeconds = Math.max(
    Number(req.body?.watchedSeconds) || 0,
    lessonProgress.watchedSeconds || 0,
  );

  const wasCompleted = lessonProgress.completed;

  if (passed) {
    lessonProgress.completed = true;
    lessonProgress.completedAt = new Date();

    if (!wasCompleted) {
      profile.xp += lesson.xpReward || 0;
      profile.completedLessons += 1;
    }
  }

  const summary = computeCourseProgress(course, courseProgress);
  courseProgress.progressPercent = summary.progressPercent;
  courseProgress.averageScore = summary.averageScore;

  let certificateCode = courseProgress.certificateCode || null;

  if (summary.progressPercent === 100 && !courseProgress.completedAt) {
    courseProgress.completedAt = new Date();
    certificateCode = `GNR-${course.slug.toUpperCase().slice(0, 8)}-${crypto
      .randomBytes(3)
      .toString("hex")
      .toUpperCase()}`;
    courseProgress.certificateCode = certificateCode;
    profile.completedCourses += 1;
    profile.certificates.push(certificateCode);

    await AcademyNotification.create({
      userId: profile.userId,
      type: "CERTIFICATE",
      title: "Novo certificado emitido",
      message: `Concluíste ${course.title}. Certificado ${certificateCode}.`,
      courseSlug: course.slug,
    });
  }

  profile.level = calculateLevel(profile.xp);
  profile.lastActivityDate = new Date();
  await profile.save();

  res.json({
    passed,
    score,
    feedback,
    remainingAttempts: Math.max(
      0,
      (lesson.maxAttempts || 3) - lessonProgress.attempts,
    ),
    profile,
    courseProgress,
    certificateCode,
  });
});

router.get("/radio/exercises", async (_req, res) => {
  await seedUltraData();
  const items = await RadioExercise.find({ active: true }).sort({ createdAt: 1 }).lean();
  res.json({ items });
});

router.post("/radio/:slug/evaluate", async (req, res) => {
  const exercise = await RadioExercise.findOne({
    slug: req.params.slug,
    active: true,
  }).lean();

  if (!exercise) {
    res.status(404).json({ error: "Exercício não encontrado." });
    return;
  }

  const responseText = String(req.body?.response || "").trim().toLowerCase();
  if (responseText.length < 5) {
    res.status(400).json({ error: "Escreve uma comunicação completa." });
    return;
  }

  const totalWeight = exercise.requiredElements.reduce(
    (sum: number, item: any) => sum + (item.weight || 1),
    0,
  );
  let earnedWeight = 0;

  const elements = exercise.requiredElements.map((item: any) => {
    const present = (item.keywords || []).some((keyword: string) =>
      responseText.includes(keyword.toLowerCase()),
    );
    if (present) earnedWeight += item.weight || 1;
    return {
      key: item.key,
      label: item.label,
      present,
    };
  });

  const score = totalWeight
    ? Math.round((earnedWeight / totalWeight) * 100)
    : 0;

  res.json({
    score,
    passed: score >= exercise.passingScore,
    elements,
    modelAnswer: exercise.modelAnswer,
    passingScore: exercise.passingScore,
  });
});

router.get("/certificates", async (req, res) => {
  const profile = await ensureProfile(req);
  const items = profile.courseProgress
    .filter((item: any) => item.certificateCode)
    .map((item: any) => ({
      courseSlug: item.courseSlug,
      certificateCode: item.certificateCode,
      issuedAt: item.completedAt,
      averageScore: item.averageScore,
      holderName: profile.displayName,
      holderRank: profile.rank,
    }));

  res.json({ items });
});

router.get("/leaderboard", async (_req, res) => {
  const items = await AcademyProfile.find()
    .sort({ xp: -1, completedCourses: -1 })
    .limit(50)
    .lean();
  res.json({ items });
});

router.get("/notifications", async (req, res) => {
  const items = await AcademyNotification.find({
    userId: currentUserId(req),
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  res.json({
    items,
    unread: items.filter((item: any) => !item.readAt).length,
  });
});

router.post("/notifications/read", async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
  const filter: any = {
    userId: currentUserId(req),
    readAt: null,
  };
  if (ids.length) filter._id = { $in: ids };

  await AcademyNotification.updateMany(filter, {
    $set: { readAt: new Date() },
  });

  res.json({ ok: true });
});

router.get("/trainer/analytics", requireStaff, async (_req, res) => {
  const [profiles, courses, classes] = await Promise.all([
    AcademyProfile.find().lean(),
    AcademyCourse.find().lean(),
    AcademyClass.find({ active: true }).lean(),
  ]);

  const attempts = profiles.flatMap((profile: any) =>
    (profile.courseProgress || []).flatMap((course: any) =>
      (course.lessons || []).map((lesson: any) => ({
        userId: profile.userId,
        courseSlug: course.courseSlug,
        lessonId: lesson.lessonId,
        score: lesson.score,
        attempts: lesson.attempts,
        completed: lesson.completed,
      })),
    ),
  );

  const failed = attempts
    .filter((item: any) => Number.isFinite(item.score) && item.score < 70)
    .sort((a: any, b: any) => a.score - b.score);

  res.json({
    totals: {
      students: profiles.length,
      courses: courses.length,
      classes: classes.length,
      completedCourses: profiles.reduce(
        (sum: number, item: any) => sum + (item.completedCourses || 0),
        0,
      ),
    },
    failed: failed.slice(0, 50),
    topStudents: profiles
      .sort((a: any, b: any) => b.xp - a.xp)
      .slice(0, 10),
  });
});

router.get("/trainer/classes", requireStaff, async (_req, res) => {
  const items = await AcademyClass.find().sort({ createdAt: -1 }).lean();
  res.json({ items });
});

router.post("/trainer/classes", requireStaff, async (req, res) => {
  const item = await AcademyClass.create({
    ...req.body,
    createdBy: currentUserId(req),
  });
  res.status(201).json({ item });
});

router.patch("/trainer/classes/:id", requireStaff, async (req, res) => {
  const item = await AcademyClass.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true },
  );
  if (!item) {
    res.status(404).json({ error: "Turma não encontrada." });
    return;
  }
  res.json({ item });
});

router.post("/trainer/notify", requireStaff, async (req, res) => {
  const userIds = Array.isArray(req.body?.userIds) ? req.body.userIds : [];
  const title = String(req.body?.title || "").trim().slice(0, 180);
  const message = String(req.body?.message || "").trim().slice(0, 1000);

  if (!userIds.length || !title || !message) {
    res.status(400).json({ error: "Destinatários, título e mensagem são obrigatórios." });
    return;
  }

  await AcademyNotification.insertMany(
    userIds.map((userId: string) => ({
      userId,
      type: "INSTRUCTOR",
      title,
      message,
    })),
  );

  res.json({ ok: true, sent: userIds.length });
});

router.post("/courses", requireStaff, async (req, res) => {
  const item = await AcademyCourse.create({
    ...req.body,
    createdBy: currentUserId(req),
  });
  res.status(201).json({ item });
});

router.patch("/courses/:slug", requireStaff, async (req, res) => {
  const item = await AcademyCourse.findOneAndUpdate(
    { slug: req.params.slug },
    { $set: req.body },
    { new: true },
  );

  if (!item) {
    res.status(404).json({ error: "Curso não encontrado." });
    return;
  }

  res.json({ item });
});

export default router;
