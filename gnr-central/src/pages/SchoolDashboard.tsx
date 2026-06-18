import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  Settings2,
  ShieldCheck,
  UserRoundCheck,
  Users,
} from "lucide-react";
import { Link } from "wouter";
import { SCHOOL_TRAININGS, MANDATORY_TRAINING_CODES } from "../data/schoolContent";
import { schoolRequest } from "../data/schoolApi";

export default function SchoolDashboard() {
  const [progress, setProgress] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [permissions, setPermissions] = useState<any>({
    canManage: false,
    canExamine: false,
  });

  useEffect(() => {
    void schoolRequest("/me").then(setProgress).catch(() => null);
    void schoolRequest("/stats").then(setStats).catch(() => null);
    void schoolRequest("/exam-admin/permissions")
      .then(setPermissions)
      .catch(() => null);
  }, []);

  const completedCodes = useMemo(
    () =>
      new Set(
        (progress?.completedTrainings || []).map(
          (item: any) => item.code || item.trainingCode,
        ),
      ),
    [progress],
  );

  const mandatoryCompleted = MANDATORY_TRAINING_CODES.filter(
    (code) => completedCodes.has(code),
  ).length;

  const eligible =
    progress?.eligibleForFinalExam === true ||
    mandatoryCompleted === MANDATORY_TRAINING_CODES.length;

  const cards = [
    {
      label: "Formações concluídas",
      value: completedCodes.size,
      icon: CheckCircle2,
    },
    {
      label: "Obrigatórias",
      value: `${mandatoryCompleted}/${MANDATORY_TRAINING_CODES.length}`,
      icon: ShieldCheck,
    },
    {
      label: "Formadores ativos",
      value: stats?.activeTrainers || 0,
      icon: Users,
    },
    {
      label: "Exames pendentes",
      value: stats?.pendingExams || 0,
      icon: ClipboardCheck,
    },
  ];

  const canManageSchool =
    permissions?.canManage ||
    permissions?.canExamine;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2.5rem] border border-primary/20 bg-black/30 p-7 md:p-10">
        <div className="absolute -right-28 -top-28 h-80 w-80 rounded-full bg-primary/15 blur-[110px]" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-[10px] font-black uppercase tracking-[.22em] text-primary">
            <GraduationCap className="h-4 w-4" />
            Escola da Guarda
          </div>

          <h1 className="mt-5 text-4xl font-black text-white md:text-5xl">
            Centro de Formação
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/55">
            Formação inicial, acompanhamento dos Guardas Provisórios,
            recrutamento de Formadores, Exame Final e certificação.
          </p>

          {canManageSchool && (
            <Link
              href="/escola/gestao"
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 font-black text-primary-foreground shadow-[0_0_30px_var(--site-theme-glow)]"
            >
              <Settings2 className="h-5 w-5" />
              Entrar na Gestão da Escola
            </Link>
          )}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <article
            key={label}
            className="rounded-3xl border border-white/10 bg-black/20 p-5"
          >
            <Icon className="h-5 w-5 text-primary" />
            <p className="mt-4 text-3xl font-black text-white">{value}</p>
            <p className="mt-1 text-sm text-white/45">{label}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <article className="rounded-3xl border border-white/10 bg-black/20 p-6">
          <h2 className="text-xl font-black text-white">Percurso inicial</h2>
          <div className="mt-5 space-y-3">
            {SCHOOL_TRAININGS.map((training) => {
              const done = completedCodes.has(training.code);

              return (
                <div
                  key={training.code}
                  className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/20 p-4"
                >
                  <span className="text-2xl">{training.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-white">{training.shortTitle}</p>
                    <p className="text-xs text-white/40">
                      {training.mandatory ? "Obrigatória" : "Recomendada"}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${
                      done
                        ? "bg-primary/10 text-primary"
                        : "bg-white/5 text-white/35"
                    }`}
                  >
                    {done ? "Concluída" : "Pendente"}
                  </span>
                </div>
              );
            })}
          </div>
        </article>

        <article className="rounded-3xl border border-white/10 bg-black/20 p-6">
          <h2 className="text-xl font-black text-white">Exame Final</h2>

          <div
            className={`mt-5 rounded-3xl border p-6 ${
              eligible
                ? "border-primary/20 bg-primary/10"
                : "border-amber-400/20 bg-amber-500/10"
            }`}
          >
            <p className="font-black text-white">
              {eligible
                ? "Requisitos formativos concluídos"
                : "Formações obrigatórias em falta"}
            </p>
            <p className="mt-2 text-sm leading-6 text-white/55">
              O Exame Final é realizado numa patrulha LINCOLN e o Guarda
              Provisório assume o comando durante a avaliação.
            </p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Link
              href="/escola/formacoes"
              className="flex items-center gap-3 rounded-2xl border border-white/10 p-4 font-bold text-white hover:border-primary/30"
            >
              <BookOpen className="h-5 w-5 text-primary" />
              Ver formações
            </Link>
            <Link
              href="/escola/formadores"
              className="flex items-center gap-3 rounded-2xl border border-white/10 p-4 font-bold text-white hover:border-primary/30"
            >
              <UserRoundCheck className="h-5 w-5 text-primary" />
              Formadores
            </Link>
          </div>
        </article>
      </section>
    </div>
  );
}
