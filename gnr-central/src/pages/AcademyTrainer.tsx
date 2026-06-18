import { useEffect, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  GraduationCap,
  Loader2,
  Plus,
  RefreshCw,
  Send,
  UsersRound,
  X,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";

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
  const payload = raw.trim() ? JSON.parse(raw) : null;
  if (!response.ok) throw new Error(payload?.error || `Pedido falhou (${response.status}).`);
  return payload;
}

export default function AcademyTrainer() {
  const [access, setAccess] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [className, setClassName] = useState("");
  const [classCode, setClassCode] = useState("");
  const [deadlineAt, setDeadlineAt] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const accessPayload = await api("/api/academy/access");
      setAccess(accessPayload);

      if (!accessPayload.canManage) {
        setLoading(false);
        return;
      }

      const [analyticsPayload, classesPayload] = await Promise.all([
        api("/api/academy/trainer/analytics"),
        api("/api/academy/trainer/classes"),
      ]);

      setAnalytics(analyticsPayload);
      setClasses(classesPayload.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createClass() {
    try {
      await api("/api/academy/trainer/classes", {
        method: "POST",
        body: JSON.stringify({
          name: className,
          code: classCode,
          deadlineAt: deadlineAt || null,
          instructorIds: [access.userId],
          studentIds: [],
          assignedCourseSlugs: [],
        }),
      });
      setFormOpen(false);
      setClassName("");
      setClassCode("");
      setDeadlineAt("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar turma.");
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!access?.canManage) {
    return (
      <div className="rounded-[2rem] border border-red-400/20 bg-red-500/[0.05] p-12 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-red-300" />
        <h1 className="mt-4 text-3xl font-black text-white">Área de formadores</h1>
        <p className="mt-3 text-white/35">Não tens permissões para gerir a Academia.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      <section className="rounded-[2.8rem] border border-violet-400/20 bg-[#06100c] p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[8px] font-black uppercase tracking-[0.16em] text-violet-300">
              Escola da Guarda
            </p>
            <h1 className="mt-3 text-4xl font-black text-white md:text-6xl">
              Centro de Formadores
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/40">
              Gere turmas, acompanha resultados e identifica dificuldades dos formandos.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-5 py-4 text-[8px] font-black uppercase text-white/40"
            >
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </button>
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-violet-400 px-5 py-4 text-[8px] font-black uppercase text-[#160522]"
            >
              <Plus className="h-4 w-4" />
              Criar turma
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-red-200">
          {error}
        </div>
      )}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric label="Formandos" value={analytics?.totals?.students || 0} icon={UsersRound} />
        <Metric label="Cursos" value={analytics?.totals?.courses || 0} icon={BookOpen} />
        <Metric label="Turmas" value={analytics?.totals?.classes || 0} icon={GraduationCap} />
        <Metric label="Conclusões" value={analytics?.totals?.completedCourses || 0} icon={BarChart3} />
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-[2rem] border border-white/10 bg-[#06100c] p-5">
          <h2 className="text-2xl font-black text-white">Turmas</h2>
          <div className="mt-5 space-y-3">
            {classes.map((item) => (
              <article key={item._id} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-black text-white">{item.name}</p>
                    <p className="mt-1 text-[8px] font-black uppercase text-primary">{item.code}</p>
                  </div>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-[7px] font-black text-white/30">
                    {item.studentIds?.length || 0} formandos
                  </span>
                </div>
                <p className="mt-3 text-xs text-white/30">
                  Prazo: {item.deadlineAt ? new Date(item.deadlineAt).toLocaleDateString("pt-PT") : "Sem prazo"}
                </p>
              </article>
            ))}

            {!classes.length && (
              <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-white/25">
                Ainda não existem turmas.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-[#06100c] p-5">
          <h2 className="text-2xl font-black text-white">Dificuldades detetadas</h2>
          <div className="mt-5 space-y-3">
            {(analytics?.failed || []).slice(0, 12).map((item: any, index: number) => (
              <article key={`${item.userId}-${item.lessonId}-${index}`} className="rounded-2xl border border-amber-400/10 bg-amber-500/[0.03] p-4">
                <p className="font-black text-white">{item.lessonId}</p>
                <p className="mt-2 text-xs text-white/35">
                  Curso: {item.courseSlug} · Nota: {item.score}% · Tentativas: {item.attempts}
                </p>
              </article>
            ))}

            {!analytics?.failed?.length && (
              <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-white/25">
                Sem dificuldades críticas registadas.
              </div>
            )}
          </div>
        </section>
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-[260] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <div className="w-full max-w-xl rounded-[2rem] border border-violet-400/20 bg-[#06100c] p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-white">Nova turma</h2>
              <button type="button" onClick={() => setFormOpen(false)} className="text-white/30">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <input
                value={className}
                onChange={(event) => setClassName(event.target.value)}
                placeholder="Nome da turma"
                className="h-12 w-full rounded-2xl border border-white/10 bg-black/25 px-4 text-white outline-none"
              />
              <input
                value={classCode}
                onChange={(event) => setClassCode(event.target.value.toUpperCase())}
                placeholder="Código, ex.: CFG-12"
                className="h-12 w-full rounded-2xl border border-white/10 bg-black/25 px-4 text-white outline-none"
              />
              <input
                type="date"
                value={deadlineAt}
                onChange={(event) => setDeadlineAt(event.target.value)}
                className="h-12 w-full rounded-2xl border border-white/10 bg-black/25 px-4 text-white outline-none"
              />
            </div>

            <button
              type="button"
              disabled={!className.trim() || !classCode.trim()}
              onClick={() => void createClass()}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-400 px-5 py-4 text-[8px] font-black uppercase text-[#160522] disabled:opacity-35"
            >
              <Send className="h-4 w-4" />
              Criar turma
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, icon: Icon }: any) {
  return (
    <article className="rounded-[1.7rem] border border-violet-400/15 bg-violet-500/[0.04] p-5 text-violet-300">
      <Icon className="h-5 w-5" />
      <p className="mt-4 text-3xl font-black text-white">{value}</p>
      <p className="mt-1 text-[8px] font-black uppercase text-white/25">{label}</p>
    </article>
  );
}
