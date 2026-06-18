import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Award,
  BadgeCheck,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  CirclePlay,
  Clock3,
  Flame,
  GraduationCap,
  HelpCircle,
  Loader2,
  Lock,
  Medal,
  Play,
  Radio,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  Star,
  Target,
  Trophy,
  UserRound,
  UsersRound,
  Video,
  X,
  Zap,
} from "lucide-react";

const API_BASE =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";

async function api(path: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
    ...options,
  });

  const raw = await response.text();
  let payload: any = null;

  if (raw.trim()) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    throw new Error(
      payload?.error || payload?.message || `O pedido falhou (${response.status}).`,
    );
  }

  return payload;
}

function categoryMeta(category: string) {
  const map: Record<string, any> = {
    INTEGRATION: {
      label: "Integração",
      icon: Shield,
      tone: "from-emerald-500/20 to-emerald-400/5 text-emerald-300",
    },
    RADIO: {
      label: "Rádio",
      icon: Radio,
      tone: "from-blue-500/20 to-blue-400/5 text-blue-300",
    },
    PATROL: {
      label: "Patrulhamento",
      icon: Target,
      tone: "from-cyan-500/20 to-cyan-400/5 text-cyan-300",
    },
    DETENTION: {
      label: "Detenções",
      icon: BadgeCheck,
      tone: "from-orange-500/20 to-orange-400/5 text-orange-300",
    },
    CODE_E: {
      label: "Código E",
      icon: Zap,
      tone: "from-violet-500/20 to-violet-400/5 text-violet-300",
    },
    PURSUIT: {
      label: "Perseguições",
      icon: Flame,
      tone: "from-red-500/20 to-red-400/5 text-red-300",
    },
    HIGH_RISK: {
      label: "Alto risco",
      icon: Shield,
      tone: "from-fuchsia-500/20 to-fuchsia-400/5 text-fuchsia-300",
    },
    LEADERSHIP: {
      label: "Liderança",
      icon: Award,
      tone: "from-amber-500/20 to-amber-400/5 text-amber-300",
    },
  };

  return map[category] || map.INTEGRATION;
}

function lessonIcon(type: string) {
  if (type === "VIDEO") return Video;
  if (type === "SCENARIO") return Target;
  if (type === "QUIZ") return HelpCircle;
  return BookOpen;
}

export default function Academy() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  const [courseProgress, setCourseProgress] = useState<any>(null);

  async function load(silent = false) {
    if (!silent) setLoading(true);
    setError("");

    try {
      const payload = await api("/api/academy/dashboard");
      setData(payload);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Não foi possível carregar a Academia.",
      );
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    void load();

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void load(true);
      }
    }, 20000);

    return () => window.clearInterval(interval);
  }, []);

  const filteredCourses = useMemo(() => {
    const term = search.trim().toLowerCase();
    const courses = data?.courses || [];

    if (!term) return courses;

    return courses.filter((course: any) =>
      [course.title, course.subtitle, course.description, categoryMeta(course.category).label]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [data, search]);

  async function openCourse(course: any) {
    if (course.locked) return;

    try {
      const payload = await api(`/api/academy/courses/${course.slug}`);
      setSelectedCourse(payload.course);
      setCourseProgress(payload.progress);
      setSelectedLesson(payload.course.lessons?.[0] || null);
    } catch (openError) {
      setError(
        openError instanceof Error
          ? openError.message
          : "Não foi possível abrir o curso.",
      );
    }
  }

  if (loading && !data) {
    return <LoadingState />;
  }

  const profile = data?.profile || {};
  const courses = data?.courses || [];
  const nextCourse =
    courses.find((course: any) => !course.locked && course.progressPercent < 100) ||
    courses[0];

  return (
    <div className="space-y-6 pb-20">
      <section className="relative overflow-hidden rounded-[3rem] border border-primary/20 bg-[#04110c]/95 p-7 md:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_20%,rgba(34,197,94,0.22),transparent_30%),radial-gradient(circle_at_88%_10%,rgba(59,130,246,0.16),transparent_34%),radial-gradient(circle_at_60%_100%,rgba(139,92,246,0.12),transparent_35%)]" />
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full border border-primary/10" />
        <div className="absolute right-8 top-8 h-56 w-56 rounded-full border border-blue-400/10" />

        <div className="relative grid grid-cols-1 gap-8 xl:grid-cols-[1fr_390px] xl:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.18em] text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Escola da Guarda · Plataforma de Formação
            </div>

            <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-[-0.05em] text-white md:text-7xl">
              Academia
              <span className="block bg-gradient-to-r from-primary via-cyan-300 to-violet-300 bg-clip-text text-transparent">
                Digital da Guarda
              </span>
            </h1>

            <p className="mt-5 max-w-3xl text-sm leading-7 text-white/45">
              Vídeos, cenários interativos, testes, missões e certificados para
              preparar Guardas Provisórios de forma prática, moderna e progressiva.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              {nextCourse && (
                <button
                  type="button"
                  onClick={() => void openCourse(nextCourse)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-emerald-400 px-6 py-4 text-[9px] font-black uppercase tracking-[0.12em] text-[#02140c] shadow-[0_0_35px_rgba(34,197,94,0.18)]"
                >
                  <Play className="h-4 w-4" />
                  Continuar formação
                </button>
              )}

              <button
                type="button"
                onClick={() => void load()}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/25 px-5 py-4 text-[8px] font-black uppercase text-white/45"
              >
                <RefreshCw className="h-4 w-4" />
                Atualizar progresso
              </button>
              <a
                href="/academia/radio"
                className="inline-flex items-center gap-2 rounded-2xl border border-blue-400/20 bg-blue-500/[0.05] px-5 py-4 text-[8px] font-black uppercase text-blue-300"
              >
                <Radio className="h-4 w-4" />
                Treinador de Rádio
              </a>
              <a
                href="/academia/certificados"
                className="inline-flex items-center gap-2 rounded-2xl border border-amber-400/20 bg-amber-500/[0.05] px-5 py-4 text-[8px] font-black uppercase text-amber-300"
              >
                <Award className="h-4 w-4" />
                Certificados
              </a>
            </div>
          </div>

          <section className="rounded-[2rem] border border-white/10 bg-black/25 p-5 backdrop-blur-xl">
            <div className="flex items-center gap-4">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt=""
                  className="h-16 w-16 rounded-2xl border border-primary/25 object-cover"
                />
              ) : (
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
                  <UserRound className="h-7 w-7" />
                </span>
              )}

              <div className="min-w-0">
                <p className="truncate text-xl font-black text-white">
                  {profile.displayName || "Formando"}
                </p>
                <p className="mt-1 truncate text-[8px] font-black uppercase tracking-[0.1em] text-primary">
                  {profile.rank || "Guarda Provisório"}
                </p>
                <p className="mt-1 text-xs text-white/25">
                  Nível {profile.level || 1} · {profile.xp || 0} XP
                </p>
              </div>
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between">
                <p className="text-[8px] font-black uppercase tracking-[0.12em] text-white/25">
                  Progresso para o próximo nível
                </p>
                <p className="text-xs font-black text-primary">
                  {(profile.xp || 0) % 500}/500 XP
                </p>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-cyan-300"
                  style={{ width: `${((profile.xp || 0) % 500) / 5}%` }}
                />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <MiniStat label="Sequência" value={`${profile.streakDays || 0} dias`} />
              <MiniStat label="Cursos" value={profile.completedCourses || 0} />
              <MiniStat label="Certificados" value={profile.certificates?.length || 0} />
            </div>
          </section>
        </div>
      </section>

      {error && (
        <div className="flex items-start justify-between gap-4 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">
          <p>{error}</p>
          <button type="button" onClick={() => setError("")}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <TopMetric label="XP total" value={profile.xp || 0} icon={Zap} tone="green" />
        <TopMetric
          label="Aulas concluídas"
          value={profile.completedLessons || 0}
          icon={CheckCircle2}
          tone="blue"
        />
        <TopMetric
          label="Cursos concluídos"
          value={profile.completedCourses || 0}
          icon={GraduationCap}
          tone="violet"
        />
        <TopMetric
          label="Certificados"
          value={profile.certificates?.length || 0}
          icon={Award}
          tone="amber"
        />
      </section>

      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1fr)_330px]">
        <main className="space-y-6">
          <section className="rounded-[1.8rem] border border-white/10 bg-[#06100c]/92 p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.15em] text-primary">
                  Percurso formativo
                </p>
                <h2 className="mt-2 text-2xl font-black text-white">
                  Cursos disponíveis
                </h2>
              </div>

              <div className="flex h-12 w-full items-center rounded-2xl border border-white/10 bg-black/25 px-4 lg:max-w-sm">
                <Search className="mr-3 h-4 w-4 text-primary" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Pesquisar curso..."
                  className="h-full min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/20"
                />
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {filteredCourses.map((course: any) => (
              <CourseCard
                key={course.slug}
                course={course}
                onOpen={() => void openCourse(course)}
              />
            ))}
          </section>
        </main>

        <aside className="space-y-4 2xl:sticky 2xl:top-5 2xl:self-start">
          <section className="rounded-[2rem] border border-white/10 bg-[#06100c]/92 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.15em] text-primary">
                  Missões
                </p>
                <h2 className="mt-2 text-xl font-black text-white">
                  Desafios da semana
                </h2>
              </div>
              <Target className="h-5 w-5 text-primary" />
            </div>

            <div className="mt-5 space-y-3">
              {(data?.missions || []).length ? (
                data.missions.map((mission: any) => (
                  <MissionCard key={mission._id} mission={mission} />
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 p-7 text-center text-sm text-white/25">
                  Novas missões serão publicadas em breve.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-[#06100c]/92 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.15em] text-primary">
                  Ranking
                </p>
                <h2 className="mt-2 text-xl font-black text-white">
                  Top formandos
                </h2>
              </div>
              <Trophy className="h-5 w-5 text-amber-300" />
            </div>

            <div className="mt-5 space-y-2">
              {(data?.leaderboard || []).slice(0, 6).map((item: any, index: number) => (
                <div
                  key={item.userId}
                  className="flex items-center gap-3 rounded-2xl border border-white/8 bg-black/20 p-3"
                >
                  <span className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-black ${
                    index === 0
                      ? "bg-amber-500/15 text-amber-300"
                      : index === 1
                        ? "bg-slate-400/15 text-slate-300"
                        : index === 2
                          ? "bg-orange-500/15 text-orange-300"
                          : "bg-white/[0.04] text-white/35"
                  }`}>
                    {index + 1}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-white">
                      {item.displayName}
                    </p>
                    <p className="mt-1 truncate text-[7px] font-black uppercase text-primary">
                      {item.rank || "Guarda"}
                    </p>
                  </div>

                  <span className="text-xs font-black text-white/60">
                    {item.xp} XP
                  </span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>

      {selectedCourse && (
        <CourseModal
          course={selectedCourse}
          progress={courseProgress}
          selectedLesson={selectedLesson}
          onSelectLesson={setSelectedLesson}
          onClose={() => {
            setSelectedCourse(null);
            setSelectedLesson(null);
            setCourseProgress(null);
          }}
          onCompleted={async (payload: any) => {
            setCourseProgress(payload.courseProgress);
            await load(true);
          }}
        />
      )}
    </div>
  );
}

function CourseCard({ course, onOpen }: any) {
  const meta = categoryMeta(course.category);
  const Icon = meta.icon;

  return (
    <article className="group overflow-hidden rounded-[2rem] border border-white/10 bg-[#06100c]/94 shadow-[0_24px_80px_rgba(0,0,0,0.18)] transition hover:-translate-y-1 hover:border-primary/20">
      <div className={`relative overflow-hidden border-b border-white/8 bg-gradient-to-br ${meta.tone} p-6`}>
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full border border-current/10" />
        <div className="absolute right-6 top-6 h-20 w-20 rounded-full border border-current/10" />

        <div className="relative flex items-start justify-between gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-current/20 bg-black/15">
            <Icon className="h-6 w-6" />
          </span>

          {course.locked ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[7px] font-black uppercase text-white/35">
              <Lock className="h-3 w-3" />
              Bloqueado
            </span>
          ) : course.completed ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1.5 text-[7px] font-black uppercase text-emerald-300">
              <CheckCircle2 className="h-3 w-3" />
              Concluído
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[7px] font-black uppercase text-white/35">
              {course.level}
            </span>
          )}
        </div>

        <h3 className="relative mt-6 text-2xl font-black text-white">
          {course.title}
        </h3>
        <p className="relative mt-2 text-sm text-white/45">{course.subtitle}</p>
      </div>

      <div className="p-5">
        <p className="line-clamp-3 text-sm leading-6 text-white/40">
          {course.description}
        </p>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <MiniStat label="Aulas" value={course.lessons?.length || 0} />
          <MiniStat label="XP" value={course.totalXp || 0} />
          <MiniStat label="Créditos" value={course.totalCredits || 0} />
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between">
            <p className="text-[8px] font-black uppercase text-white/25">
              Progresso
            </p>
            <p className="text-xs font-black text-primary">
              {course.progressPercent || 0}%
            </p>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-cyan-300"
              style={{ width: `${course.progressPercent || 0}%` }}
            />
          </div>
        </div>

        <button
          type="button"
          disabled={course.locked}
          onClick={onOpen}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-primary/[0.06] px-4 py-3 text-[8px] font-black uppercase text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-30"
        >
          {course.locked ? (
            <>
              <Lock className="h-4 w-4" />
              Concluir pré-requisitos
            </>
          ) : (
            <>
              <CirclePlay className="h-4 w-4" />
              {course.progressPercent ? "Continuar curso" : "Iniciar curso"}
            </>
          )}
        </button>
      </div>
    </article>
  );
}

function CourseModal({
  course,
  progress,
  selectedLesson,
  onSelectLesson,
  onClose,
  onCompleted,
}: any) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);

  const completedIds = new Set(
    (progress?.lessons || [])
      .filter((lesson: any) => lesson.completed)
      .map((lesson: any) => lesson.lessonId),
  );

  async function completeLesson() {
    if (!selectedLesson) return;

    setBusy(true);
    setResult(null);

    try {
      const payload = await api(
        `/api/academy/courses/${course.slug}/lessons/${selectedLesson.id}/complete`,
        {
          method: "POST",
          body: JSON.stringify({ answers }),
        },
      );

      setResult(payload);
      await onCompleted(payload);

      if (payload.passed) {
        const index = course.lessons.findIndex(
          (lesson: any) => lesson.id === selectedLesson.id,
        );
        const next = course.lessons[index + 1];
        if (next) onSelectLesson(next);
      }
    } catch (error) {
      setResult({
        error: error instanceof Error ? error.message : "Não foi possível concluir.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[260] flex justify-end bg-black/85 backdrop-blur-md">
      <div className="h-full w-full max-w-7xl overflow-y-auto border-l border-white/10 bg-[#04100b]">
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-white/8 bg-[#04100b]/95 px-5 py-4 backdrop-blur-xl">
          <div>
            <p className="text-[8px] font-black uppercase tracking-[0.14em] text-primary">
              Curso em progresso
            </p>
            <h2 className="mt-1 text-xl font-black text-white">{course.title}</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-white/35"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 p-5 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="space-y-2">
            {(course.lessons || []).map((lesson: any, index: number) => {
              const Icon = lessonIcon(lesson.type);
              const completed = completedIds.has(lesson.id);
              const active = selectedLesson?.id === lesson.id;

              return (
                <button
                  key={lesson.id}
                  type="button"
                  onClick={() => {
                    setAnswers({});
                    setResult(null);
                    onSelectLesson(lesson);
                  }}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${
                    active
                      ? "border-primary/30 bg-primary/10"
                      : "border-white/8 bg-black/20 hover:border-white/15"
                  }`}
                >
                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
                    completed
                      ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
                      : active
                        ? "border-primary/20 bg-primary/10 text-primary"
                        : "border-white/8 bg-white/[0.03] text-white/25"
                  }`}>
                    {completed ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-[7px] font-black uppercase text-white/20">
                      Aula {index + 1}
                    </span>
                    <span className="mt-1 block truncate text-sm font-black text-white">
                      {lesson.title}
                    </span>
                  </span>
                </button>
              );
            })}
          </aside>

          <main className="rounded-[2rem] border border-white/10 bg-[#06100c]/92 p-5 md:p-7">
            {selectedLesson ? (
              <>
                <div className="flex flex-col gap-4 border-b border-white/8 pb-5 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-[0.14em] text-primary">
                      {selectedLesson.type}
                    </p>
                    <h3 className="mt-2 text-3xl font-black text-white">
                      {selectedLesson.title}
                    </h3>
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-white/40">
                      {selectedLesson.description}
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <MiniStat label="Duração" value={`${selectedLesson.durationMinutes} min`} />
                    <MiniStat label="XP" value={selectedLesson.xpReward || 0} />
                  </div>
                </div>

                {selectedLesson.type === "VIDEO" && (
                  <div className="mt-6 overflow-hidden rounded-[1.7rem] border border-white/10 bg-black">
                    <div className="aspect-video">
                      <video
                        controls
                        className="h-full w-full"
                        poster={selectedLesson.thumbnailUrl || undefined}
                      >
                        <source src={selectedLesson.videoUrl} />
                      </video>
                    </div>
                  </div>
                )}

                {selectedLesson.type === "ARTICLE" && (
                  <div className="mt-6 whitespace-pre-wrap rounded-[1.7rem] border border-white/10 bg-black/20 p-6 text-sm leading-8 text-white/60">
                    {selectedLesson.content}
                  </div>
                )}

                {["QUIZ", "SCENARIO"].includes(selectedLesson.type) && (
                  <div className="mt-6 space-y-5">
                    {(selectedLesson.questions || []).map((question: any, index: number) => (
                      <article
                        key={question.id}
                        className="rounded-[1.7rem] border border-white/10 bg-black/20 p-5"
                      >
                        <div className="flex items-start gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-sm font-black text-primary">
                            {index + 1}
                          </span>
                          <div>
                            <p className="font-black leading-6 text-white">
                              {question.prompt}
                            </p>
                            {question.regulationReference && (
                              <p className="mt-2 text-[8px] font-black uppercase text-primary">
                                {question.regulationReference}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="mt-4 space-y-2">
                          {(question.options || []).map((option: any) => (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() =>
                                setAnswers((current) => ({
                                  ...current,
                                  [question.id]: option.id,
                                }))
                              }
                              className={`w-full rounded-2xl border p-4 text-left text-sm transition ${
                                answers[question.id] === option.id
                                  ? "border-primary/30 bg-primary/10 text-white"
                                  : "border-white/8 bg-white/[0.025] text-white/45 hover:border-white/15"
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                )}

                {selectedLesson.regulationReference && (
                  <div className="mt-5 rounded-2xl border border-blue-400/15 bg-blue-500/[0.04] p-4">
                    <p className="text-[8px] font-black uppercase tracking-[0.12em] text-blue-300">
                      Referência
                    </p>
                    <p className="mt-2 text-sm text-white/45">
                      {selectedLesson.regulationReference}
                    </p>
                  </div>
                )}

                {result && (
                  <div className={`mt-5 rounded-2xl border p-4 ${
                    result.error
                      ? "border-red-400/20 bg-red-500/10 text-red-200"
                      : result.passed
                        ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                        : "border-amber-400/20 bg-amber-500/10 text-amber-200"
                  }`}>
                    {result.error ? (
                      <p>{result.error}</p>
                    ) : (
                      <>
                        <p className="font-black">
                          {result.passed ? "Aula concluída!" : "Ainda não atingiste a nota mínima."}
                        </p>
                        {result.score !== null && (
                          <p className="mt-2 text-sm">Resultado: {result.score}%</p>
                        )}
                        {result.certificateCode && (
                          <p className="mt-2 text-sm">
                            Certificado: <strong>{result.certificateCode}</strong>
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  disabled={
                    busy ||
                    (["QUIZ", "SCENARIO"].includes(selectedLesson.type) &&
                      Object.keys(answers).length < (selectedLesson.questions || []).length)
                  }
                  onClick={() => void completeLesson()}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-emerald-400 px-5 py-4 text-[9px] font-black uppercase tracking-[0.12em] text-[#02140c] disabled:opacity-35"
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Concluir aula
                </button>
              </>
            ) : (
              <div className="flex min-h-[420px] items-center justify-center text-white/25">
                Seleciona uma aula.
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function MissionCard({ mission }: any) {
  return (
    <article className="rounded-2xl border border-white/8 bg-black/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <Target className="h-5 w-5 text-primary" />
        <span className="rounded-full border border-primary/15 bg-primary/[0.05] px-2.5 py-1 text-[7px] font-black uppercase text-primary">
          +{mission.xpReward} XP
        </span>
      </div>
      <p className="mt-4 font-black text-white">{mission.title}</p>
      <p className="mt-2 text-xs leading-5 text-white/35">
        {mission.description}
      </p>
      <p className="mt-3 text-[7px] font-black uppercase text-white/20">
        Termina em {new Date(mission.endsAt).toLocaleDateString("pt-PT")}
      </p>
    </article>
  );
}

function TopMetric({ label, value, icon: Icon, tone }: any) {
  const tones: any = {
    green: "border-primary/15 bg-primary/[0.045] text-primary",
    blue: "border-blue-400/15 bg-blue-500/[0.045] text-blue-300",
    violet: "border-violet-400/15 bg-violet-500/[0.045] text-violet-300",
    amber: "border-amber-400/15 bg-amber-500/[0.045] text-amber-300",
  };

  return (
    <article className={`rounded-[1.7rem] border p-5 ${tones[tone]}`}>
      <div className="flex items-center justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-current/15 bg-black/15">
          <Icon className="h-5 w-5" />
        </span>
        <Star className="h-4 w-4 opacity-20" />
      </div>
      <p className="mt-5 text-3xl font-black text-white">{value}</p>
      <p className="mt-1 text-[8px] font-black uppercase tracking-[0.12em] text-white/25">
        {label}
      </p>
    </article>
  );
}

function MiniStat({ label, value }: any) {
  return (
    <div className="rounded-2xl border border-white/8 bg-black/20 p-3 text-center">
      <p className="truncate text-sm font-black text-white">{value}</p>
      <p className="mt-1 text-[7px] font-black uppercase text-white/25">
        {label}
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-[520px] flex-col items-center justify-center rounded-[2rem] border border-white/8 bg-[#06100c]/70">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="mt-4 text-[8px] font-black uppercase tracking-[0.15em] text-white/25">
        A carregar a Academia
      </p>
    </div>
  );
}
