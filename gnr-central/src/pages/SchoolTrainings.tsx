import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  Loader2,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import {
  SCHOOL_TRAININGS,
} from "../data/schoolContent";

import {
  schoolRequest,
} from "../data/schoolApi";

type Attempt = {
  _id: string;
  studentName: string;
  trainingCode: string;
  trainingTitle: string;
  attempt: number;
  status:
    | "IN_PROGRESS"
    | "SUBMITTED"
    | "APPROVED"
    | "REJECTED";
  score?: number | null;
  reviewNotes?: string;
  answers?: {
    questionId: string;
    question: string;
    answer: string;
    maxPoints: number;
  }[];
};

export default function SchoolTrainings() {
  const [search, setSearch] =
    useState("");

  const [selected, setSelected] =
    useState(
      SCHOOL_TRAININGS[0],
    );

  const [overview, setOverview] =
    useState<any>({
      trainings: [],
      canReview:
        false,
    });

  const [activeAttempt, setActiveAttempt] =
    useState<Attempt | null>(
      null,
    );

  const [answers, setAnswers] =
    useState<
      Record<
        string,
        string
      >
    >({});

  const [reviewItems, setReviewItems] =
    useState<Attempt[]>(
      [],
    );

  const [reviewing, setReviewing] =
    useState<Attempt | null>(
      null,
    );

  const [reviewScore, setReviewScore] =
    useState("");

  const [reviewNotes, setReviewNotes] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [busy, setBusy] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const items =
    useMemo(() => {
      const term =
        search.trim().toLowerCase();

      return SCHOOL_TRAININGS.filter(
        (item) =>
          !term ||
          [
            item.title,
            item.description,
            item.shortTitle,
          ].some(
            (value) =>
              value
                .toLowerCase()
                .includes(term),
          ),
      );
    }, [search]);

  function latestAttempt(
    code: string,
  ) {
    return overview.trainings.find(
      (item: any) =>
        item.code === code,
    )?.latestAttempt as
      | Attempt
      | null;
  }

  async function load() {
    setLoading(true);

    try {
      const response =
        await schoolRequest(
          "/assessments/trainings",
        );

      setOverview(response);

      if (
        response.canReview
      ) {
        const review =
          await schoolRequest(
            "/assessments/review?status=SUBMITTED",
          );

        setReviewItems(
          review.items || [],
        );
      }
    } catch (error: any) {
      setMessage(
        error.message,
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function startTest() {
    setBusy(true);
    setMessage("");

    try {
      const response =
        await schoolRequest(
          `/assessments/trainings/${selected.code}/start`,
          {
            method:
              "POST",
            body:
              JSON.stringify({}),
          },
        );

      setActiveAttempt(
        response.attempt,
      );

      const initial:
        Record<
          string,
          string
        > = {};

      for (
        const answer
        of response.attempt
          .answers || []
      ) {
        initial[
          answer.questionId
        ] =
          answer.answer || "";
      }

      setAnswers(initial);
    } catch (error: any) {
      setMessage(
        error.message,
      );
    } finally {
      setBusy(false);
    }
  }

  async function submitTest() {
    if (!activeAttempt) {
      return;
    }

    const payload =
      (
        activeAttempt.answers ||
        []
      ).map(
        (question) => ({
          questionId:
            question.questionId,
          answer:
            answers[
              question.questionId
            ] || "",
        }),
      );

    if (
      payload.some(
        (item) =>
          item.answer.trim()
            .length <
          3,
      )
    ) {
      setMessage(
        "Responde a todas as perguntas.",
      );
      return;
    }

    setBusy(true);

    try {
      const response =
        await schoolRequest(
          `/assessments/attempts/${activeAttempt._id}/submit`,
          {
            method:
              "POST",
            body:
              JSON.stringify({
                answers:
                  payload,
              }),
          },
        );

      setActiveAttempt(
        null,
      );

      setAnswers({});

      setMessage(
        response.discord?.sent
          ? "Teste submetido. Os Examinadores foram avisados no Discord."
          : "Teste submetido com sucesso. Aguarda avaliação.",
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

  async function reviewAttempt(
    decision:
      | "APPROVED"
      | "REJECTED",
  ) {
    if (!reviewing) {
      return;
    }

    const score =
      Number(
        reviewScore,
      );

    if (
      !Number.isFinite(
        score,
      ) ||
      score < 0 ||
      score > 20
    ) {
      setMessage(
        "A nota deve estar entre 0 e 20.",
      );
      return;
    }

    if (
      decision ===
        "REJECTED" &&
      reviewNotes.trim()
        .length <
        5
    ) {
      setMessage(
        "Indica o motivo da reprovação.",
      );
      return;
    }

    setBusy(true);

    try {
      await schoolRequest(
        `/assessments/attempts/${reviewing._id}/review`,
        {
          method:
            "POST",
          body:
            JSON.stringify({
              decision,
              score,
              reviewNotes,
            }),
        },
      );

      setReviewing(
        null,
      );

      setReviewScore("");
      setReviewNotes("");

      await load();
    } catch (error: any) {
      setMessage(
        error.message,
      );
    } finally {
      setBusy(false);
    }
  }

  const current =
    latestAttempt(
      selected.code,
    );

  return (
    <div className="space-y-6">
      <section className="rounded-[2.2rem] border border-white/10 bg-black/20 p-6">
        <div className="flex items-center gap-3 text-emerald-300">
          <BookOpen />

          <span className="text-xs font-black uppercase tracking-[.2em]">
            Escola da Guarda
          </span>
        </div>

        <h1 className="mt-3 text-4xl font-black text-white">
          Formação e Testes
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/50">
          Consulta os conteúdos, realiza o teste escrito de cada formação
          e aguarda a avaliação dos Formadores ou Examinadores.
        </p>

        <div className="relative mt-5 max-w-xl">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />

          <input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
            placeholder="Pesquisar formação..."
            className="h-12 w-full rounded-2xl border border-white/10 bg-black/30 pl-11 pr-4 text-white outline-none focus:border-emerald-400/30"
          />
        </div>

        {message && (
          <p className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/65">
            {message}
          </p>
        )}
      </section>

      {overview.canReview &&
        reviewItems.length >
          0 && (
          <section className="rounded-[2rem] border border-amber-400/20 bg-amber-500/[0.04] p-5 md:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 text-amber-300">
                  <ClipboardCheck className="h-5 w-5" />

                  <span className="text-xs font-black uppercase tracking-[.18em]">
                    Avaliações pendentes
                  </span>
                </div>

                <h2 className="mt-2 text-2xl font-black text-white">
                  Testes para avaliar
                </h2>
              </div>

              <button
                onClick={() =>
                  void load()
                }
                className="rounded-2xl border border-white/10 p-3 text-white"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              {reviewItems.map(
                (attempt) => (
                  <button
                    key={
                      attempt._id
                    }
                    onClick={() => {
                      setReviewing(
                        attempt,
                      );
                      setReviewScore("");
                      setReviewNotes("");
                    }}
                    className="rounded-2xl border border-white/10 bg-black/20 p-5 text-left hover:border-amber-400/25"
                  >
                    <p className="font-black text-white">
                      {
                        attempt.studentName
                      }
                    </p>

                    <p className="mt-1 text-sm text-white/45">
                      {
                        attempt.trainingTitle
                      }{" "}
                      · Tentativa{" "}
                      {
                        attempt.attempt
                      }
                    </p>
                  </button>
                ),
              )}
            </div>
          </section>
        )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-300" />
        </div>
      ) : (
        <section className="grid gap-5 xl:grid-cols-[360px_1fr]">
          <div className="space-y-3">
            {items.map(
              (item) => {
                const attempt =
                  latestAttempt(
                    item.code,
                  );

                return (
                  <button
                    type="button"
                    key={
                      item.code
                    }
                    onClick={() =>
                      setSelected(
                        item,
                      )
                    }
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      selected.code ===
                      item.code
                        ? "border-emerald-400/30 bg-emerald-500/10"
                        : "border-white/10 bg-black/20 hover:border-white/20"
                    }`}
                  >
                    <div className="flex gap-3">
                      <span className="text-2xl">
                        {
                          item.icon
                        }
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="font-black text-white">
                          {
                            item.shortTitle
                          }
                        </p>

                        <p className="mt-1 text-xs text-white/40">
                          {item.mandatory
                            ? "Obrigatória"
                            : "Recomendada"}
                        </p>
                      </div>

                      {attempt?.status ===
                        "APPROVED" && (
                        <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                      )}

                      {attempt?.status ===
                        "REJECTED" && (
                        <XCircle className="h-5 w-5 text-red-300" />
                      )}
                    </div>
                  </button>
                );
              },
            )}
          </div>

          <article className="rounded-3xl border border-white/10 bg-black/20 p-6 md:p-8">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-4xl">
                {
                  selected.icon
                }
              </span>

              <div>
                <h2 className="text-2xl font-black text-white">
                  {
                    selected.title
                  }
                </h2>

                <span
                  className={`mt-2 inline-block rounded-full px-3 py-1 text-[10px] font-black uppercase ${
                    selected.mandatory
                      ? "bg-red-500/10 text-red-300"
                      : "bg-amber-500/10 text-amber-300"
                  }`}
                >
                  {selected.mandatory
                    ? "Obrigatória"
                    : "Recomendada"}
                </span>
              </div>
            </div>

            <p className="mt-5 text-sm leading-7 text-white/55">
              {
                selected.description
              }
            </p>

            {current && (
              <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs font-black uppercase tracking-[.14em] text-white/40">
                  Estado do teste
                </p>

                <p className="mt-2 font-black text-white">
                  {
                    current.status
                  }
                  {current.score !==
                    null &&
                    current.score !==
                      undefined &&
                    ` · ${current.score}/20`}
                </p>

                {current.reviewNotes && (
                  <p className="mt-2 text-sm text-white/50">
                    {
                      current.reviewNotes
                    }
                  </p>
                )}
              </div>
            )}

            <button
              onClick={() =>
                void startTest()
              }
              disabled={
                busy ||
                current?.status ===
                  "SUBMITTED" ||
                current?.status ===
                  "APPROVED"
              }
              className="mt-5 inline-flex h-12 items-center gap-2 rounded-2xl bg-emerald-500 px-5 font-black text-black disabled:cursor-not-allowed disabled:opacity-40"
            >
              <GraduationCap className="h-5 w-5" />
              {current?.status ===
              "IN_PROGRESS"
                ? "Continuar teste"
                : current?.status ===
                    "REJECTED"
                  ? "Repetir teste"
                  : "Iniciar teste"}
            </button>

            <Section
              title="Objetivos"
              items={
                selected.objectives
              }
            />

            {selected.contents.map(
              (section) => (
                <Section
                  key={
                    section.title
                  }
                  title={
                    section.title
                  }
                  items={
                    section.items
                  }
                />
              ),
            )}

            <Section
              title="Critérios de avaliação"
              items={
                selected.criteria
              }
            />
          </article>
        </section>
      )}

      {activeAttempt && (
        <div
          className="fixed inset-0 z-[100] overflow-y-auto bg-black/85 p-3 backdrop-blur-md"
          onClick={() =>
            setActiveAttempt(
              null,
            )
          }
        >
          <div
            className="mx-auto my-5 max-w-4xl rounded-[2rem] border border-white/10 bg-[#06100c] p-5 md:p-7"
            onClick={(
              event,
            ) =>
              event.stopPropagation()
            }
          >
            <div className="flex items-center gap-3">
              <GraduationCap className="h-7 w-7 text-emerald-300" />

              <div>
                <h2 className="text-2xl font-black text-white">
                  {
                    activeAttempt.trainingTitle
                  }
                </h2>

                <p className="text-sm text-white/40">
                  Tentativa{" "}
                  {
                    activeAttempt.attempt
                  }
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-5">
              {(
                activeAttempt.answers ||
                []
              ).map(
                (
                  question,
                  index,
                ) => (
                  <label
                    key={
                      question.questionId
                    }
                    className="block rounded-2xl border border-white/10 bg-black/20 p-5"
                  >
                    <span className="font-black text-white">
                      {index +
                        1}
                      .{" "}
                      {
                        question.question
                      }
                    </span>

                    <textarea
                      value={
                        answers[
                          question
                            .questionId
                        ] || ""
                      }
                      onChange={(
                        event,
                      ) =>
                        setAnswers(
                          (
                            current,
                          ) => ({
                            ...current,
                            [question.questionId]:
                              event
                                .target
                                .value,
                          }),
                        )
                      }
                      rows={5}
                      className="mt-4 w-full rounded-2xl border border-white/10 bg-black/30 p-4 text-white outline-none focus:border-emerald-400/30"
                      placeholder="Escreve uma resposta completa..."
                    />
                  </label>
                ),
              )}
            </div>

            <button
              onClick={() =>
                void submitTest()
              }
              disabled={busy}
              className="mt-6 inline-flex h-12 items-center gap-2 rounded-2xl bg-emerald-500 px-5 font-black text-black"
            >
              <Send className="h-4 w-4" />
              Submeter para avaliação
            </button>
          </div>
        </div>
      )}

      {reviewing && (
        <div
          className="fixed inset-0 z-[100] overflow-y-auto bg-black/85 p-3 backdrop-blur-md"
          onClick={() =>
            setReviewing(
              null,
            )
          }
        >
          <div
            className="mx-auto my-5 max-w-4xl rounded-[2rem] border border-white/10 bg-[#06100c] p-5 md:p-7"
            onClick={(
              event,
            ) =>
              event.stopPropagation()
            }
          >
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-7 w-7 text-amber-300" />

              <div>
                <h2 className="text-2xl font-black text-white">
                  Avaliar teste
                </h2>

                <p className="text-sm text-white/40">
                  {
                    reviewing.studentName
                  }{" "}
                  ·{" "}
                  {
                    reviewing.trainingTitle
                  }
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {(
                reviewing.answers ||
                []
              ).map(
                (
                  answer,
                  index,
                ) => (
                  <article
                    key={
                      answer.questionId
                    }
                    className="rounded-2xl border border-white/10 bg-black/20 p-5"
                  >
                    <p className="font-black text-white">
                      {index +
                        1}
                      .{" "}
                      {
                        answer.question
                      }
                    </p>

                    <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-white/60">
                      {
                        answer.answer
                      }
                    </p>
                  </article>
                ),
              )}
            </div>

            <label className="mt-5 block">
              <span className="text-xs font-black uppercase tracking-[.14em] text-white/40">
                Nota final
              </span>

              <input
                type="number"
                min={0}
                max={20}
                step={0.5}
                value={
                  reviewScore
                }
                onChange={(
                  event,
                ) =>
                  setReviewScore(
                    event.target
                      .value,
                  )
                }
                className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-white"
              />
            </label>

            <label className="mt-4 block">
              <span className="text-xs font-black uppercase tracking-[.14em] text-white/40">
                Observações
              </span>

              <textarea
                value={
                  reviewNotes
                }
                onChange={(
                  event,
                ) =>
                  setReviewNotes(
                    event.target
                      .value,
                  )
                }
                rows={4}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 p-4 text-white"
              />
            </label>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                onClick={() =>
                  void reviewAttempt(
                    "APPROVED",
                  )
                }
                disabled={busy}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-500 font-black text-black"
              >
                <CheckCircle2 className="h-5 w-5" />
                Aprovar
              </button>

              <button
                onClick={() =>
                  void reviewAttempt(
                    "REJECTED",
                  )
                }
                disabled={busy}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-red-500 font-black text-white"
              >
                <XCircle className="h-5 w-5" />
                Reprovar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <section className="mt-7">
      <h3 className="text-sm font-black uppercase tracking-[.14em] text-white">
        {title}
      </h3>

      <div className="mt-3 space-y-2">
        {items.map(
          (item) => (
            <div
              key={item}
              className="flex gap-3 rounded-xl border border-white/10 bg-black/20 p-3 text-sm leading-6 text-white/60"
            >
              <span className="font-black text-emerald-300">
                •
              </span>

              {item}
            </div>
          ),
        )}
      </div>
    </section>
  );
}
