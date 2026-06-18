import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Archive,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  ExternalLink,
  Filter,
  GraduationCap,
  Loader2,
  Play,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  XCircle,
} from "lucide-react";

import {
  schoolRequest,
} from "../data/schoolApi";

type Criterion = {
  key: string;
  label: string;
  score: number;
  weight: number;
  notes?: string;
};

type Exam = {
  _id: string;
  studentId: string;
  studentName: string;
  status: string;
  attempt: number;
  requestedAt?: string;
  scheduledAt?: string | null;
  examinerId?: string | null;
  examinerName?: string | null;
  patrolCallsign?: string | null;
  patrolVehicle?: string | null;
  score?: number | null;
  criteria?: Criterion[];
  notes?: string;
  failureReason?: string;
  discordJumpUrl?: string | null;
  deletedAt?: string | null;
  deletionReason?: string;
};

const DEFAULT_CRITERIA: Criterion[] = [
  {
    key: "procedures",
    label: "Conhecimento dos procedimentos",
    score: 0,
    weight: 20,
  },
  {
    key: "communication",
    label: "Comunicação operacional",
    score: 0,
    weight: 15,
  },
  {
    key: "safety",
    label: "Segurança e controlo",
    score: 0,
    weight: 20,
  },
  {
    key: "decision",
    label: "Tomada de decisão",
    score: 0,
    weight: 20,
  },
  {
    key: "posture",
    label: "Postura e disciplina",
    score: 0,
    weight: 15,
  },
  {
    key: "execution",
    label: "Execução prática",
    score: 0,
    weight: 10,
  },
];

const STATUS_LABELS: Record<string, string> = {
  REQUESTED: "Pendente",
  SCHEDULED: "Agendado",
  IN_PROGRESS: "Em curso",
  APPROVED: "Aprovado",
  FAILED: "Reprovado",
  CANCELLED: "Cancelado",
  ARCHIVED: "Arquivado",
  DELETED: "Removido",
};

function statusClass(status: string) {
  if (status === "APPROVED") {
    return "border-emerald-400/25 bg-emerald-500/10 text-emerald-300";
  }

  if (
    status === "FAILED" ||
    status === "CANCELLED" ||
    status === "DELETED"
  ) {
    return "border-red-400/25 bg-red-500/10 text-red-300";
  }

  if (status === "IN_PROGRESS") {
    return "border-blue-400/25 bg-blue-500/10 text-blue-300";
  }

  if (status === "SCHEDULED") {
    return "border-cyan-400/25 bg-cyan-500/10 text-cyan-300";
  }

  return "border-amber-400/25 bg-amber-500/10 text-amber-300";
}

function classification(score: number) {
  if (score >= 18) return "Excecional";
  if (score >= 16) return "Muito Bom";
  if (score >= 14) return "Bom";
  if (score >= 10) return "Apto";
  return "Não Apto";
}

export default function SchoolExams() {
  const [permissions, setPermissions] =
    useState<any>({
      canManage: false,
      canExamine: false,
    });

  const [studentData, setStudentData] =
    useState<any>({
      eligible: false,
      missing: [],
      exams: [],
    });

  const [items, setItems] =
    useState<Exam[]>([]);

  const [stats, setStats] =
    useState<Record<string, number>>({});

  const [status, setStatus] =
    useState("ALL");

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [busy, setBusy] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [selected, setSelected] =
    useState<Exam | null>(null);

  const [mode, setMode] =
    useState<
      | "DETAIL"
      | "SCHEDULE"
      | "EVALUATE"
      | "ASSIGN"
    >("DETAIL");

  const [scheduledAt, setScheduledAt] =
    useState("");

  const [vehicle, setVehicle] =
    useState("");

  const [examinerId, setExaminerId] =
    useState("");

  const [examinerName, setExaminerName] =
    useState("");

  const [criteria, setCriteria] =
    useState<Criterion[]>(
      DEFAULT_CRITERIA,
    );

  const [notes, setNotes] =
    useState("");

  const [failureReason, setFailureReason] =
    useState("");

  const weightedScore =
    useMemo(() => {
      const weight =
        criteria.reduce(
          (sum, item) =>
            sum +
            Number(
              item.weight || 0,
            ),
          0,
        );

      if (!weight) return 0;

      const total =
        criteria.reduce(
          (sum, item) =>
            sum +
            Number(
              item.score || 0,
            ) *
              Number(
                item.weight || 0,
              ),
          0,
        );

      return Number(
        (
          total /
          weight
        ).toFixed(2),
      );
    }, [criteria]);

  async function load() {
    setLoading(true);

    try {
      const perm =
        await schoolRequest(
          "/exam-admin/permissions",
        );

      setPermissions(perm);

      if (
        perm.canExamine ||
        perm.canManage
      ) {
        const admin =
          await schoolRequest(
            `/exam-admin?status=${encodeURIComponent(
              status,
            )}&search=${encodeURIComponent(
              search,
            )}`,
          );

        setItems(
          admin.items || [],
        );

        setStats(
          admin.stats || {},
        );
      } else {
        const me =
          await schoolRequest(
            "/assessments/final/status",
          );

        setStudentData(me);
      }

      setMessage("");
    } catch (error: any) {
      setMessage(
        error?.message ||
        "Não foi possível carregar os exames.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [status]);

  async function requestFinal() {
    setBusy(true);

    try {
      const response =
        await schoolRequest(
          "/assessments/final/request",
          {
            method: "POST",
            body: JSON.stringify({}),
          },
        );

      setMessage(
        response?.discord?.sent
          ? "Pedido criado e Examinadores mencionados no Discord."
          : "Pedido criado. Confirma a configuração do canal do Discord.",
      );

      await load();
    } catch (error: any) {
      setMessage(
        error.message,
      );
    } finally {
      setBusy(false);
    }
  }

  async function action(
    path: string,
    body: any = {},
  ) {
    setBusy(true);

    try {
      await schoolRequest(
        `/exam-admin${path}`,
        {
          method: "POST",
          body:
            JSON.stringify(
              body,
            ),
        },
      );

      setSelected(null);
      setMode("DETAIL");
      await load();
    } catch (error: any) {
      setMessage(
        error.message,
      );
    } finally {
      setBusy(false);
    }
  }

  function openEvaluation(
    exam: Exam,
  ) {
    setSelected(exam);
    setMode("EVALUATE");
    setCriteria(
      exam.criteria?.length
        ? exam.criteria
        : DEFAULT_CRITERIA,
    );
    setNotes(
      exam.notes || "",
    );
    setFailureReason(
      exam.failureReason || "",
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-80 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isAdmin =
    permissions.canExamine ||
    permissions.canManage;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2.3rem] border border-white/10 bg-black/20 p-6 md:p-8">
        <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative flex items-center gap-3 text-primary">
          <GraduationCap className="h-6 w-6" />
          <span className="text-xs font-black uppercase tracking-[.2em]">
            Escola da Guarda
          </span>
        </div>

        <h1 className="relative mt-3 text-4xl font-black text-white">
          Centro de Exames Finais
        </h1>

        <p className="relative mt-3 max-w-3xl text-sm leading-6 text-white/50">
          Gestão premium dos pedidos, atribuição de Examinadores,
          patrulhas LINCOLN, avaliação prática e relatório final.
        </p>

        {message && (
          <p className="relative mt-5 rounded-2xl border border-white/10 bg-black/25 p-4 text-sm text-white/60">
            {message}
          </p>
        )}
      </section>

      {!isAdmin ? (
        <>
          <section
            className={`rounded-3xl border p-6 ${
              studentData.eligible
                ? "border-emerald-400/25 bg-emerald-500/10"
                : "border-amber-400/25 bg-amber-500/10"
            }`}
          >
            <div className="flex items-start gap-4">
              {studentData.eligible ? (
                <CheckCircle2 className="h-8 w-8 text-emerald-300" />
              ) : (
                <Clock3 className="h-8 w-8 text-amber-300" />
              )}

              <div>
                <h2 className="text-xl font-black text-white">
                  {studentData.eligible
                    ? "Requisitos concluídos"
                    : "Formações obrigatórias por concluir"}
                </h2>

                <p className="mt-2 text-sm text-white/50">
                  {studentData.eligible
                    ? "Podes pedir o Exame Final. Os Examinadores serão mencionados no Discord."
                    : "Conclui os testes obrigatórios antes de pedir o Exame Final."}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    void requestFinal()
                  }
                  disabled={
                    busy ||
                    !studentData.eligible
                  }
                  className="mt-5 rounded-2xl bg-primary px-5 py-3 font-black text-primary-foreground disabled:opacity-40"
                >
                  Pedir Exame Final
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-black/20 p-6">
            <h2 className="text-xl font-black text-white">
              O meu histórico
            </h2>

            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              {(studentData.exams || []).map(
                (exam: Exam) => (
                  <ExamCard
                    key={exam._id}
                    exam={exam}
                    onOpen={() =>
                      setSelected(exam)
                    }
                  />
                ),
              )}
            </div>
          </section>
        </>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            {[
              ["REQUESTED", "Pendentes"],
              ["SCHEDULED", "Agendados"],
              ["IN_PROGRESS", "Em curso"],
              ["APPROVED", "Aprovados"],
              ["FAILED", "Reprovados"],
              ["ARCHIVED", "Arquivo"],
            ].map(
              ([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() =>
                    setStatus(key)
                  }
                  className={`rounded-2xl border p-4 text-left transition ${
                    status === key
                      ? "border-primary/35 bg-primary/10"
                      : "border-white/10 bg-black/20"
                  }`}
                >
                  <p className="text-3xl font-black text-white">
                    {stats[key] || 0}
                  </p>
                  <p className="mt-1 text-xs font-black uppercase tracking-[.12em] text-white/35">
                    {label}
                  </p>
                </button>
              ),
            )}
          </section>

          <section className="rounded-3xl border border-white/10 bg-black/20 p-5">
            <div className="flex flex-col gap-3 md:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value,
                    )
                  }
                  onKeyDown={(event) =>
                    event.key === "Enter" &&
                    void load()
                  }
                  placeholder="Pesquisar formando, ID ou examinador..."
                  className="h-12 w-full rounded-2xl border border-white/10 bg-black/30 pl-11 pr-4 text-white"
                />
              </div>

              <select
                value={status}
                onChange={(event) =>
                  setStatus(
                    event.target.value,
                  )
                }
                className="h-12 rounded-2xl border border-white/10 bg-black/30 px-4 text-white"
              >
                <option value="ALL">
                  Todos
                </option>
                {Object.entries(
                  STATUS_LABELS,
                ).map(
                  ([value, label]) => (
                    <option
                      key={value}
                      value={value}
                    >
                      {label}
                    </option>
                  ),
                )}
              </select>

              <button
                type="button"
                onClick={() =>
                  void load()
                }
                className="rounded-2xl border border-white/10 p-3 text-white"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            {items.map(
              (exam) => (
                <ExamCard
                  key={exam._id}
                  exam={exam}
                  admin
                  canManage={
                    permissions.canManage
                  }
                  onOpen={() => {
                    setSelected(exam);
                    setMode("DETAIL");
                  }}
                  onSchedule={() => {
                    setSelected(exam);
                    setMode("SCHEDULE");
                  }}
                  onAssign={() => {
                    setSelected(exam);
                    setMode("ASSIGN");
                  }}
                  onStart={() =>
                    void action(
                      `/${exam._id}/start`,
                    )
                  }
                  onEvaluate={() =>
                    openEvaluation(
                      exam,
                    )
                  }
                  onArchive={() =>
                    void action(
                      `/${exam._id}/archive`,
                    )
                  }
                  onDelete={() => {
                    const reason =
                      window.prompt(
                        "Motivo da remoção:",
                      );

                    if (
                      reason?.trim()
                    ) {
                      void action(
                        `/${exam._id}/delete`,
                        { reason },
                      );
                    }
                  }}
                  onRestore={() =>
                    void action(
                      `/${exam._id}/restore`,
                    )
                  }
                />
              ),
            )}
          </section>
        </>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-[120] overflow-y-auto bg-black/85 p-3 backdrop-blur-md"
          onClick={() =>
            setSelected(null)
          }
        >
          <div
            className="mx-auto my-6 max-w-4xl rounded-[2rem] border border-white/10 bg-[#06100c] p-5 md:p-7"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            {mode === "SCHEDULE" && (
              <>
                <h2 className="text-2xl font-black text-white">
                  Agendar Exame Final
                </h2>

                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(event) =>
                    setScheduledAt(
                      event.target.value,
                    )
                  }
                  className="mt-5 h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-white"
                />

                <input
                  value={vehicle}
                  onChange={(event) =>
                    setVehicle(
                      event.target.value,
                    )
                  }
                  placeholder="Viatura da patrulha LINCOLN"
                  className="mt-3 h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-white"
                />

                <button
                  type="button"
                  onClick={() =>
                    void action(
                      `/${selected._id}/schedule`,
                      {
                        scheduledAt:
                          new Date(
                            scheduledAt,
                          ).toISOString(),
                        patrolVehicle:
                          vehicle,
                      },
                    )
                  }
                  className="mt-5 w-full rounded-2xl bg-primary px-5 py-3 font-black text-primary-foreground"
                >
                  Confirmar agendamento
                </button>
              </>
            )}

            {mode === "ASSIGN" && (
              <>
                <h2 className="text-2xl font-black text-white">
                  Atribuir Examinador
                </h2>

                <input
                  value={examinerName}
                  onChange={(event) =>
                    setExaminerName(
                      event.target.value,
                    )
                  }
                  placeholder="Nome do Examinador"
                  className="mt-5 h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-white"
                />

                <input
                  value={examinerId}
                  onChange={(event) =>
                    setExaminerId(
                      event.target.value.replace(
                        /\D/g,
                        "",
                      ),
                    )
                  }
                  placeholder="Discord ID do Examinador"
                  className="mt-3 h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-white"
                />

                <button
                  type="button"
                  onClick={() =>
                    void action(
                      `/${selected._id}/assign`,
                      {
                        examinerId,
                        examinerName,
                      },
                    )
                  }
                  className="mt-5 w-full rounded-2xl bg-primary px-5 py-3 font-black text-primary-foreground"
                >
                  Confirmar atribuição
                </button>
              </>
            )}

            {mode === "EVALUATE" && (
              <>
                <h2 className="text-2xl font-black text-white">
                  Avaliação prática premium
                </h2>

                <p className="mt-2 text-sm text-white/40">
                  {selected.studentName} · Patrulha LINCOLN
                </p>

                <div className="mt-6 space-y-4">
                  {criteria.map(
                    (
                      criterion,
                      index,
                    ) => (
                      <div
                        key={criterion.key}
                        className="rounded-2xl border border-white/10 bg-black/20 p-4"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="font-black text-white">
                              {
                                criterion.label
                              }
                            </p>
                            <p className="mt-1 text-xs text-white/35">
                              Peso{" "}
                              {
                                criterion.weight
                              }
                              %
                            </p>
                          </div>

                          <input
                            type="number"
                            min={0}
                            max={20}
                            step={0.5}
                            value={
                              criterion.score
                            }
                            onChange={(event) => {
                              const next =
                                [...criteria];

                              next[index] = {
                                ...criterion,
                                score:
                                  Math.min(
                                    20,
                                    Math.max(
                                      0,
                                      Number(
                                        event.target.value,
                                      ),
                                    ),
                                  ),
                              };

                              setCriteria(next);
                            }}
                            className="h-11 w-24 rounded-xl border border-white/10 bg-black/30 px-3 text-center font-black text-white"
                          />
                        </div>
                      </div>
                    ),
                  )}
                </div>

                <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/10 p-5">
                  <p className="text-xs font-black uppercase tracking-[.14em] text-primary">
                    Classificação final
                  </p>
                  <p className="mt-2 text-4xl font-black text-white">
                    {weightedScore}/20
                  </p>
                  <p className="mt-1 font-bold text-primary">
                    {classification(
                      weightedScore,
                    )}
                  </p>
                </div>

                <textarea
                  value={notes}
                  onChange={(event) =>
                    setNotes(
                      event.target.value,
                    )
                  }
                  rows={4}
                  placeholder="Pontos fortes, aspetos a melhorar e recomendação..."
                  className="mt-5 w-full rounded-2xl border border-white/10 bg-black/30 p-4 text-white"
                />

                <textarea
                  value={failureReason}
                  onChange={(event) =>
                    setFailureReason(
                      event.target.value,
                    )
                  }
                  rows={3}
                  placeholder="Motivo da reprovação, quando aplicável"
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-black/30 p-4 text-white"
                />

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() =>
                      void action(
                        `/${selected._id}/result`,
                        {
                          result:
                            "APPROVED",
                          score:
                            weightedScore,
                          criteria,
                          notes,
                        },
                      )
                    }
                    className="rounded-2xl bg-emerald-500 px-5 py-3 font-black text-black"
                  >
                    Aprovar
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      void action(
                        `/${selected._id}/result`,
                        {
                          result:
                            "FAILED",
                          score:
                            weightedScore,
                          criteria,
                          notes,
                          failureReason,
                          attempt:
                            selected.attempt,
                        },
                      )
                    }
                    className="rounded-2xl bg-red-500 px-5 py-3 font-black text-white"
                  >
                    Reprovar
                  </button>
                </div>
              </>
            )}

            {mode === "DETAIL" && (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[.16em] text-primary">
                      Tentativa{" "}
                      {selected.attempt}
                    </p>
                    <h2 className="mt-2 text-3xl font-black text-white">
                      {selected.studentName}
                    </h2>
                  </div>

                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${statusClass(
                      selected.deletedAt
                        ? "DELETED"
                        : selected.status,
                    )}`}
                  >
                    {
                      STATUS_LABELS[
                        selected.deletedAt
                          ? "DELETED"
                          : selected.status
                      ]
                    }
                  </span>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <Detail
                    label="Examinador"
                    value={
                      selected.examinerName ||
                      "Por atribuir"
                    }
                  />
                  <Detail
                    label="Patrulha"
                    value={
                      selected.patrolCallsign ||
                      "LINCOLN"
                    }
                  />
                  <Detail
                    label="Viatura"
                    value={
                      selected.patrolVehicle ||
                      "Por definir"
                    }
                  />
                  <Detail
                    label="Classificação"
                    value={
                      selected.score ===
                        null ||
                      selected.score ===
                        undefined
                        ? "Sem resultado"
                        : `${selected.score}/20`
                    }
                  />
                </div>

                {selected.notes && (
                  <p className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-white/60">
                    {selected.notes}
                  </p>
                )}

                {selected.discordJumpUrl && (
                  <a
                    href={
                      selected.discordJumpUrl
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="mt-5 inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 font-bold text-white"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Abrir no Discord
                  </a>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ExamCard({
  exam,
  admin = false,
  canManage = false,
  onOpen,
  onSchedule,
  onAssign,
  onStart,
  onEvaluate,
  onArchive,
  onDelete,
  onRestore,
}: any) {
  const currentStatus =
    exam.deletedAt
      ? "DELETED"
      : exam.status;

  return (
    <article className="rounded-3xl border border-white/10 bg-black/20 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[.15em] text-primary">
            Tentativa {exam.attempt}
          </p>
          <h3 className="mt-2 text-2xl font-black text-white">
            {exam.studentName}
          </h3>
          <p className="mt-1 text-sm text-white/40">
            {exam.examinerName ||
              "Examinador por atribuir"}
          </p>
        </div>

        <span
          className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase ${statusClass(
            currentStatus,
          )}`}
        >
          {STATUS_LABELS[currentStatus]}
        </span>
      </div>

      <div className="mt-4 space-y-2 text-sm text-white/45">
        <p>
          Patrulha:{" "}
          <span className="font-bold text-white">
            {exam.patrolCallsign ||
              "LINCOLN"}
          </span>
        </p>

        {exam.scheduledAt && (
          <p>
            Data:{" "}
            <span className="text-white">
              {new Date(
                exam.scheduledAt,
              ).toLocaleString(
                "pt-PT",
              )}
            </span>
          </p>
        )}

        {exam.score !==
          null &&
          exam.score !==
            undefined && (
          <p>
            Nota:{" "}
            <span className="font-black text-white">
              {exam.score}/20
            </span>
          </p>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onOpen}
          className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-white"
        >
          Ver
        </button>

        {admin &&
          !exam.deletedAt &&
          exam.status ===
            "REQUESTED" && (
            <>
              {canManage && (
                <button
                  type="button"
                  onClick={onAssign}
                  className="rounded-xl bg-purple-500/10 px-3 py-2 text-xs font-bold text-purple-300"
                >
                  Atribuir
                </button>
              )}

              <button
                type="button"
                onClick={onSchedule}
                className="rounded-xl bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-300"
              >
                Agendar
              </button>
            </>
          )}

        {admin &&
          !exam.deletedAt &&
          [
            "REQUESTED",
            "SCHEDULED",
          ].includes(
            exam.status,
          ) && (
            <button
              type="button"
              onClick={onStart}
              className="rounded-xl bg-blue-500/10 px-3 py-2 text-xs font-bold text-blue-300"
            >
              Iniciar
            </button>
          )}

        {admin &&
          !exam.deletedAt &&
          exam.status ===
            "IN_PROGRESS" && (
            <button
              type="button"
              onClick={onEvaluate}
              className="rounded-xl bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-300"
            >
              Avaliar
            </button>
          )}

        {canManage &&
          !exam.deletedAt &&
          [
            "APPROVED",
            "FAILED",
            "CANCELLED",
          ].includes(
            exam.status,
          ) && (
            <button
              type="button"
              onClick={onArchive}
              className="rounded-xl bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-300"
            >
              Arquivar
            </button>
          )}

        {canManage &&
          !exam.deletedAt && (
            <button
              type="button"
              onClick={onDelete}
              className="rounded-xl bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300"
            >
              Remover
            </button>
          )}

        {canManage &&
          exam.deletedAt && (
            <button
              type="button"
              onClick={onRestore}
              className="rounded-xl bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-300"
            >
              Restaurar
            </button>
          )}
      </div>
    </article>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-[10px] font-black uppercase tracking-[.14em] text-white/30">
        {label}
      </p>
      <p className="mt-2 font-bold text-white">
        {value}
      </p>
    </div>
  );
}
