import { useEffect, useMemo, useState } from "react";
import { Link, useRoute } from "wouter";
import {
  ArrowLeft,
  BadgeCheck,
  BarChart3,
  BookOpenCheck,
  CalendarDays,
  CalendarRange,
  Check,
  CheckCircle2,
  Clock3,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Users,
  UsersRound,
  Vote,
  X,
} from "lucide-react";

const VOTE_OPTIONS = [
  {
    value: "PROMOTE",
    label: "Subir",
    description: "Recomendar subida de patente.",
    icon: TrendingUp,
  },
  {
    value: "KEEP_RANK",
    label: "Manter",
    description: "Manter na patente atual.",
    icon: Minus,
  },
  {
    value: "DEMOTE",
    label: "Descer",
    description: "Recomendar descida de patente.",
    icon: TrendingDown,
  },
  {
    value: "ABSTAIN",
    label: "Abstenção",
    description: "Não emitir recomendação.",
    icon: Vote,
  },
] as const;

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(path, {
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(options.body
        ? { "Content-Type": "application/json" }
        : {}),
      "Cache-Control": "no-cache",
      ...(options.headers || {}),
    },
    ...options,
  });

  const raw = await response.text();
  const payload = raw
    ? (() => {
        try {
          return JSON.parse(raw);
        } catch {
          return null;
        }
      })()
    : null;

  if (!response.ok) {
    throw new Error(
      payload?.error ||
        `O pedido falhou com o código ${response.status}.`,
    );
  }

  if (!payload) {
    throw new Error(
      "A API respondeu sem conteúdo válido.",
    );
  }

  return payload as T;
}

function formatHours(value?: number) {
  return `${Number(value || 0).toFixed(1)}h`;
}

function formatDate(value?: string | null) {
  if (!value) return "Sem registo";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Sem registo";
  }

  return date.toLocaleDateString("pt-PT");
}

function formatPeriod(start?: string | null, end?: string | null) {
  return `${formatDate(start)} a ${formatDate(end)}`;
}

function periodDays(start?: string | null, end?: string | null) {
  if (!start || !end) return 0;

  const first = new Date(start);
  const last = new Date(end);

  if (
    Number.isNaN(first.getTime()) ||
    Number.isNaN(last.getTime())
  ) {
    return 0;
  }

  return Math.max(
    1,
    Math.floor(
      (last.getTime() - first.getTime()) /
        86_400_000,
    ) + 1,
  );
}

function formatStatus(value?: string | null) {
  const normalized = String(value || "").toLowerCase();

  if (
    normalized.includes("serviço") ||
    normalized.includes("servico") ||
    normalized.includes("ativo")
  ) {
    return {
      label: value || "Em serviço",
      tone:
        "border-emerald-400/20 bg-emerald-500/10 text-emerald-300",
    };
  }

  return {
    label: value || "Folga",
    tone:
      "border-white/10 bg-white/[0.04] text-white/40",
  };
}

export default function CSOReuniaoDetalhe() {
  const [, params] = useRoute(
    "/departamentos/cso/reunioes/:meetingId",
  );

  const meetingId = String(params?.meetingId || "");

  const [meeting, setMeeting] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [initializingRoster, setInitializingRoster] =
    useState(false);

  const [error, setError] = useState("");


  const [selectedCandidate, setSelectedCandidate] =
    useState<any>(null);
  const [voteChoice, setVoteChoice] =
    useState("KEEP_RANK");
  const [voteOpinion, setVoteOpinion] =
    useState("");

  const [evaluationCandidate, setEvaluationCandidate] =
    useState<any>(null);
  const [evaluationScore, setEvaluationScore] =
    useState("10");
  const [evaluationPoints, setEvaluationPoints] =
    useState("0");
  const [evaluationOpinion, setEvaluationOpinion] =
    useState("");
  const [activeCandidateIndex, setActiveCandidateIndex] =
    useState(0);

  async function loadMeeting() {
    const payload = await apiRequest<any>(
      `/api/cso/meetings/${meetingId}?force=${Date.now()}`,
    );

    setMeeting(payload.meeting);
  }



  async function initializeRoster(currentMeeting: any) {
    if (
      !currentMeeting ||
      !["PREPARATION", "RETURNED"].includes(
        currentMeeting.status,
      ) ||
      currentMeeting.candidates?.length
    ) {
      return currentMeeting;
    }

    setInitializingRoster(true);
    setError("");

    const controller = new AbortController();
    const timeout = window.setTimeout(
      () => controller.abort(),
      45000,
    );

    try {
      const response = await fetch(
        `/api/cso/meetings/${currentMeeting._id}/initialize`,
        {
          method: "POST",
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        },
      );

      const raw = await response.text();

      let payload: any = null;

      try {
        payload = raw ? JSON.parse(raw) : null;
      } catch {
        payload = null;
      }

      if (!response.ok || !payload?.meeting) {
        throw new Error(
          payload?.error ||
            `Não foi possível sincronizar o efetivo. Código ${response.status}.`,
        );
      }

      setMeeting(payload.meeting);
      return payload.meeting;
    } catch (initializeError: any) {
      if (initializeError?.name === "AbortError") {
        setError(
          "A sincronização do efetivo demorou mais de 60 segundos. Usa o botão “Sincronizar efetivo” para tentar novamente.",
        );
      } else {
        setError(
          initializeError instanceof Error
            ? initializeError.message
            : "Não foi possível sincronizar o efetivo.",
        );
      }

      return currentMeeting;
    } finally {
      window.clearTimeout(timeout);
      setInitializingRoster(false);
    }
  }

  async function loadAll() {
    setLoading(true);
    setError("");

    try {
      const payload = await apiRequest<any>(
        `/api/cso/meetings/${meetingId}?force=${Date.now()}`,
      );

      setMeeting(payload.meeting);

      await initializeRoster(payload.meeting);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Não foi possível carregar a reunião.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (meetingId) {
      void loadAll();
    }
  }, [meetingId]);

  const voteProgress = useMemo(() => {
    const present = (
      meeting?.attendees || []
    ).filter((item: any) => item.present).length;

    const candidates =
      meeting?.candidates?.length || 0;

    const expected = present * candidates;

    const submitted = (
      meeting?.candidates || []
    ).reduce(
      (sum: number, candidate: any) =>
        sum +
        Number(
          candidate.voteCount ||
            candidate.votes?.length ||
            0,
        ),
      0,
    );

    return {
      submitted,
      expected,
      percentage:
        expected > 0
          ? Math.min(
              100,
              Math.round(
                (submitted / expected) * 100,
              ),
            )
          : 0,
    };
  }, [meeting]);

  const reviewSummary = useMemo(() => {
    const candidates = meeting?.candidates || [];

    const reviewed = candidates.filter(
      (candidate: any) =>
        Number(
          candidate.voteCount ||
            candidate.votes?.length ||
            0,
        ) > 0 ||
        Number(
          candidate.snapshot?.evaluationCount ||
            0,
        ) > 0,
    ).length;

    return {
      total: candidates.length,
      reviewed,
      pending: Math.max(
        0,
        candidates.length - reviewed,
      ),
      percentage:
        candidates.length > 0
          ? Math.round(
              (reviewed / candidates.length) *
                100,
            )
          : 0,
    };
  }, [meeting?.candidates]);



  const activeCandidate = useMemo(() => {
    const candidates = meeting?.candidates || [];

    if (candidates.length === 0) return null;

    const safeIndex = Math.min(
      activeCandidateIndex,
      candidates.length - 1,
    );

    return candidates[safeIndex];
  }, [
    meeting?.candidates,
    activeCandidateIndex,
  ]);

  useEffect(() => {
    const candidates = meeting?.candidates || [];

    if (
      activeCandidateIndex >
      Math.max(0, candidates.length - 1)
    ) {
      setActiveCandidateIndex(
        Math.max(0, candidates.length - 1),
      );
    }
  }, [
    meeting?.candidates?.length,
    activeCandidateIndex,
  ]);


  async function mutation(
    path: string,
    options: RequestInit = {},
  ) {
    setWorking(true);
    setError("");

    try {
      const payload = await apiRequest<any>(
        path,
        options,
      );

      if (payload.meeting) {
        setMeeting(payload.meeting);
      } else {
        await loadMeeting();
      }

      return payload;
    } catch (mutationError) {
      const message =
        mutationError instanceof Error
          ? mutationError.message
          : "Não foi possível concluir a ação.";

      setError(message);
      throw mutationError;
    } finally {
      setWorking(false);
    }
  }



  async function refreshCandidate(
    candidate: any,
  ) {
    await mutation(
      `/api/cso/meetings/${meetingId}/candidates/${candidate.guardDiscordId}/refresh`,
      {
        method: "POST",
      },
    );
  }

  async function syncRoster() {
    setInitializingRoster(true);

    try {
      const endpoint = meeting?.candidates?.length
        ? `/api/cso/meetings/${meetingId}/sync-roster`
        : `/api/cso/meetings/${meetingId}/initialize`;

      await mutation(endpoint, {
        method: "POST",
      });
    } finally {
      setInitializingRoster(false);
    }
  }

  async function submitVote() {
    if (!selectedCandidate) return;

    await mutation(
      `/api/cso/meetings/${meetingId}/candidates/${selectedCandidate.guardDiscordId}/vote`,
      {
        method: "POST",
        body: JSON.stringify({
          choice: voteChoice,
          opinion: voteOpinion,
        }),
      },
    );

    setSelectedCandidate(null);
    setVoteOpinion("");
  }

  async function submitEvaluation() {
    if (!evaluationCandidate || !meeting) return;

    await mutation("/api/cso/evaluations", {
      method: "POST",
      body: JSON.stringify({
        evaluatedDiscordId:
          evaluationCandidate.guardDiscordId,
        evaluatedName:
          evaluationCandidate.guardName,
        score: Number(evaluationScore),
        points: Number(evaluationPoints),
        opinion: evaluationOpinion,
        weekStart: meeting.weekStart,
        weekEnd: meeting.weekEnd,
        meetingId: meeting._id,
      }),
    });

    await refreshCandidate(evaluationCandidate);

    setEvaluationCandidate(null);
    setEvaluationOpinion("");
  }

  if (loading) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-violet-300" />
          <p className="mt-4 text-sm font-black text-white">
            A preparar a reunião do CSO
          </p>
        </div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-5 text-red-200">
        {error || "Reunião não encontrada."}
      </div>
    );
  }

  const canPrepare =
    meeting.permissions?.canManage &&
    ["PREPARATION", "RETURNED"].includes(
      meeting.status,
    );

  return (
    <div className="space-y-6 pb-14">
      <section className="relative overflow-hidden rounded-[2.5rem] border border-violet-400/20 bg-[#090713]/95 p-7">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(139,92,246,0.16),transparent_34%),radial-gradient(circle_at_90%_80%,rgba(34,197,94,0.07),transparent_32%)]" />

        <div className="relative">
          <Link
            href="/departamentos/cso/reunioes"
            className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.14em] text-white/35 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar às reuniões
          </Link>

          <div className="mt-6 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-violet-300">
                {meeting.meetingNumber}
              </p>

              <h1 className="mt-2 text-3xl font-black text-white md:text-5xl">
                {meeting.title}
              </h1>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/45">
                  Responsável:{" "}
                  <strong className="text-white/75">
                    {meeting.openedByName}
                  </strong>
                </span>

                <span className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-2 text-xs font-black text-violet-300">
                  <CalendarRange className="h-4 w-4" />
                  {formatPeriod(
                    meeting.weekStart,
                    meeting.weekEnd,
                  )}
                </span>

                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/40">
                  {periodDays(
                    meeting.weekStart,
                    meeting.weekEnd,
                  )} dias analisados
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href={`/departamentos/cso/reunioes/${meetingId}/ata`}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-500 px-5 py-3 text-[9px] font-black uppercase text-white"
              >
                Ata oficial
              </Link>

              <button
                type="button"
                onClick={() => void loadAll()}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-[9px] font-black uppercase text-white/45 transition hover:text-white"
              >
                <RefreshCw className="h-4 w-4" />
                Atualizar tudo
              </button>
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {initializingRoster && (
        <div className="flex items-center gap-3 rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4 text-sm text-violet-200">
          <Loader2 className="h-5 w-5 animate-spin" />
          <div>
            <p className="font-black">
              A preparar a ordem de trabalhos
            </p>
            <p className="mt-1 text-xs text-violet-100/55">
              A cruzar as tags oficiais do Discord com horas, CPs e avaliações.
              Esta operação é feita em lote e não repete os cálculos por militar.
            </p>
          </div>
        </div>
      )}

      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <SummaryCard
          label="Em análise"
          value={meeting.candidates?.length || 0}
          icon={UsersRound}
        />
        <SummaryCard
          label="Presentes"
          value={
            meeting.attendees?.filter(
              (item: any) => item.present,
            ).length || 0
          }
          icon={UserCheck}
        />
        <SummaryCard
          label="Votos submetidos"
          value={voteProgress.submitted}
          icon={Vote}
        />
        <SummaryCard
          label="Progresso"
          value={`${voteProgress.percentage}%`}
          icon={CheckCircle2}
        />
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-[#06100c]/92 p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <BookOpenCheck className="h-5 w-5 text-violet-300" />
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-violet-300">
                Ordem de trabalhos
              </p>
            </div>

            <h2 className="mt-3 text-2xl font-black text-white">
              Todo o efetivo é analisado
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/35">
              A reunião inclui automaticamente todos os Guardas e Sargentos
              com as tags oficiais. Ninguém é inserido manualmente e ninguém
              fica esquecido.
            </p>
          </div>

          {canPrepare && (
            <button
              type="button"
              disabled={working || initializingRoster}
              onClick={() => void syncRoster()}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-400/20 bg-violet-500/10 px-5 py-4 text-[8px] font-black uppercase text-violet-300 disabled:opacity-40"
            >
              <RefreshCw className="h-4 w-4" />
              Sincronizar efetivo
            </button>
          )}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <AgendaMetric
            label="Efetivo total"
            value={reviewSummary.total}
            icon={UsersRound}
          />
          <AgendaMetric
            label="Já analisados"
            value={reviewSummary.reviewed}
            icon={CheckCircle2}
          />
          <AgendaMetric
            label="Por analisar"
            value={reviewSummary.pending}
            icon={Clock3}
          />
          <AgendaMetric
            label="Conclusão"
            value={`${reviewSummary.percentage}%`}
            icon={BarChart3}
          />
        </div>

        <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-400 transition-all duration-500"
            style={{
              width: `${reviewSummary.percentage}%`,
            }}
          />
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {(meeting.candidates || []).map(
            (candidate: any, index: number) => {
              const reviewed =
                Number(
                  candidate.voteCount ||
                    candidate.votes?.length ||
                    0,
                ) > 0 ||
                Number(
                  candidate.snapshot
                    ?.evaluationCount || 0,
                ) > 0;

              return (
                <button
                  type="button"
                  key={candidate.guardDiscordId}
                  onClick={() =>
                    setActiveCandidateIndex(index)
                  }
                  className={`rounded-xl border px-3 py-2 text-[8px] font-black uppercase transition ${
                    index === activeCandidateIndex
                      ? "border-violet-400/35 bg-violet-500/15 text-violet-200"
                      : reviewed
                        ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
                        : "border-white/10 bg-white/[0.03] text-white/35 hover:text-white"
                  }`}
                >
                  {index + 1}. {candidate.guardName}
                </button>
              );
            },
          )}
        </div>
      </section>


      <section className="rounded-[2rem] border border-white/10 bg-[#06100c]/92 p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-violet-300">
              Análise individual
            </p>
            <h2 className="mt-2 text-2xl font-black text-white">
              Guarda a guarda
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/35">
              O CSO analisa um militar de cada vez. Horas, CPs,
              companheiros, avaliações e pontos são calculados apenas
              entre{" "}
              <strong className="text-violet-300">
                {formatDate(meeting.weekStart)}
              </strong>{" "}
              e{" "}
              <strong className="text-violet-300">
                {formatDate(meeting.weekEnd)}
              </strong>.
            </p>
          </div>

          {meeting.candidates?.length > 0 && (
            <div className="rounded-xl border border-violet-400/20 bg-violet-500/10 px-4 py-3 text-[9px] font-black uppercase text-violet-300">
              {activeCandidateIndex + 1} de{" "}
              {meeting.candidates.length}
            </div>
          )}
        </div>

        {activeCandidate ? (
          <div className="mt-6">
            <CandidateCard
              candidate={activeCandidate}
              meeting={meeting}
              working={working}
              onRefresh={() =>
                void refreshCandidate(
                  activeCandidate,
                )
              }
              onEvaluate={() =>
                setEvaluationCandidate(
                  activeCandidate,
                )
              }
              onVote={() =>
                setSelectedCandidate(
                  activeCandidate,
                )
              }
            />

            <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                disabled={
                  activeCandidateIndex === 0
                }
                onClick={() =>
                  setActiveCandidateIndex(
                    (current) =>
                      Math.max(0, current - 1),
                  )
                }
                className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-[8px] font-black uppercase text-white/45 disabled:opacity-25"
              >
                Militar anterior
              </button>

              <div className="flex flex-wrap justify-center gap-2">
                {meeting.candidates.map(
                  (candidate: any, index: number) => {
                    const hasVote =
                      Number(
                        candidate.voteCount ||
                          candidate.votes?.length ||
                          0,
                      ) > 0;

                    return (
                      <button
                        type="button"
                        key={
                          candidate.guardDiscordId
                        }
                        onClick={() =>
                          setActiveCandidateIndex(
                            index,
                          )
                        }
                        title={
                          candidate.guardName
                        }
                        className={`h-3 w-3 rounded-full transition ${
                          index ===
                          activeCandidateIndex
                            ? "scale-125 bg-violet-400"
                            : hasVote
                              ? "bg-emerald-400/70"
                              : "bg-white/15"
                        }`}
                      />
                    );
                  },
                )}
              </div>

              <button
                type="button"
                disabled={
                  activeCandidateIndex >=
                  meeting.candidates.length - 1
                }
                onClick={() =>
                  setActiveCandidateIndex(
                    (current) =>
                      Math.min(
                        meeting.candidates.length -
                          1,
                        current + 1,
                      ),
                  )
                }
                className="rounded-xl bg-violet-500 px-5 py-3 text-[8px] font-black uppercase text-white disabled:opacity-25"
              >
                Próximo militar
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-white/10 p-12 text-center">
            <UsersRound className="mx-auto h-10 w-10 text-white/15" />
            <p className="mt-4 font-black text-white">
              A ordem de trabalhos ainda está vazia
            </p>
            <p className="mt-2 text-sm text-white/30">
              Carrega todos os Guardas e Sargentos oficiais numa única sincronização.
            </p>
            <button
              type="button"
              disabled={initializingRoster || working}
              onClick={() => void syncRoster()}
              className="mt-5 rounded-xl bg-violet-500 px-5 py-4 text-[8px] font-black uppercase text-white disabled:opacity-35"
            >
              {initializingRoster
                ? "A preparar a reunião..."
                : "Carregar ordem de trabalhos"}
            </button>
          </div>
        )}
      </section>

      {meeting.permissions?.canManage && (
        <section className="flex flex-wrap gap-3 rounded-[1.7rem] border border-white/10 bg-[#06100c]/90 p-5">
          {meeting.status === "PREPARATION" && (
            <PrimaryAction
              label="Abrir votação"
              disabled={
                working ||
                !meeting.candidates?.length
              }
              onClick={() =>
                void mutation(
                  `/api/cso/meetings/${meetingId}/open-voting`,
                  { method: "POST" },
                )
              }
            />
          )}

          {meeting.status === "VOTING_OPEN" && (
            <PrimaryAction
              label="Encerrar votação"
              disabled={working}
              onClick={() =>
                void mutation(
                  `/api/cso/meetings/${meetingId}/close-voting`,
                  { method: "POST" },
                )
              }
            />
          )}
        </section>
      )}

      {meeting.permissions?.ceg &&
        ["VOTING_CLOSED", "AWAITING_CEG"].includes(
          meeting.status,
        ) && (
          <section className="flex flex-wrap gap-3 rounded-[1.7rem] border border-amber-400/20 bg-amber-500/[0.06] p-5">
            <PrimaryAction
              label="CEG validar reunião"
              onClick={() =>
                void mutation(
                  `/api/cso/meetings/${meetingId}/ceg-validation`,
                  {
                    method: "POST",
                    body: JSON.stringify({
                      approved: true,
                    }),
                  },
                )
              }
            />

            <SecondaryAction
              label="CEG devolver"
              onClick={() =>
                void mutation(
                  `/api/cso/meetings/${meetingId}/ceg-validation`,
                  {
                    method: "POST",
                    body: JSON.stringify({
                      approved: false,
                    }),
                  },
                )
              }
            />
          </section>
        )}

      {meeting.permissions?.command &&
        meeting.status ===
          "AWAITING_COMMAND" && (
          <section className="flex flex-wrap gap-3 rounded-[1.7rem] border border-primary/20 bg-primary/[0.06] p-5">
            <PrimaryAction
              label="Comando aprovar"
              onClick={() =>
                void mutation(
                  `/api/cso/meetings/${meetingId}/command-decision`,
                  {
                    method: "POST",
                    body: JSON.stringify({
                      decision: "APPROVED",
                    }),
                  },
                )
              }
            />

            <SecondaryAction
              label="Comando devolver"
              onClick={() =>
                void mutation(
                  `/api/cso/meetings/${meetingId}/command-decision`,
                  {
                    method: "POST",
                    body: JSON.stringify({
                      decision: "RETURNED",
                    }),
                  },
                )
              }
            />

            <SecondaryAction
              label="Comando rejeitar"
              onClick={() =>
                void mutation(
                  `/api/cso/meetings/${meetingId}/command-decision`,
                  {
                    method: "POST",
                    body: JSON.stringify({
                      decision: "REJECTED",
                    }),
                  },
                )
              }
            />
          </section>
        )}

      {evaluationCandidate && (
        <Modal
          title={`Avaliação — ${evaluationCandidate.guardName}`}
          onClose={() =>
            setEvaluationCandidate(null)
          }
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField label="Nota de 0 a 20">
              <input
                type="number"
                min="0"
                max="20"
                step="0.1"
                value={evaluationScore}
                onChange={(event) =>
                  setEvaluationScore(
                    event.target.value,
                  )
                }
                className="input"
              />
            </FormField>

            <FormField label="Pontos">
              <input
                type="number"
                min="0"
                step="1"
                value={evaluationPoints}
                onChange={(event) =>
                  setEvaluationPoints(
                    event.target.value,
                  )
                }
                className="input"
              />
            </FormField>
          </div>

          <FormField label="Opinião sobre o trabalho">
            <textarea
              rows={6}
              value={evaluationOpinion}
              onChange={(event) =>
                setEvaluationOpinion(
                  event.target.value,
                )
              }
              placeholder="Regista uma análise curta, objetiva e fundamentada..."
              className="input"
            />
          </FormField>

          <PrimaryAction
            label="Guardar avaliação"
            disabled={
              working ||
              evaluationOpinion.trim().length < 20
            }
            onClick={() =>
              void submitEvaluation()
            }
            full
          />
        </Modal>
      )}

      {selectedCandidate && (
        <Modal
          title={`Votação — ${selectedCandidate.guardName}`}
          onClose={() =>
            setSelectedCandidate(null)
          }
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {VOTE_OPTIONS.map((option) => {
              const Icon = option.icon;
              const active =
                voteChoice === option.value;

              return (
                <button
                  type="button"
                  key={option.value}
                  onClick={() =>
                    setVoteChoice(option.value)
                  }
                  className={`rounded-2xl border p-4 text-left transition ${
                    active
                      ? "border-violet-400/35 bg-violet-500/12"
                      : "border-white/10 bg-black/20 hover:border-white/20"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 ${
                      active
                        ? "text-violet-300"
                        : "text-white/30"
                    }`}
                  />
                  <p className="mt-3 font-black text-white">
                    {option.label}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-white/30">
                    {option.description}
                  </p>
                </button>
              );
            })}
          </div>

          <FormField label="Opinião do membro do CSO">
            <textarea
              rows={6}
              value={voteOpinion}
              onChange={(event) =>
                setVoteOpinion(
                  event.target.value,
                )
              }
              placeholder="Fundamenta a decisão com base na atividade e conduta do militar..."
              className="input"
            />
          </FormField>

          <p className="mt-2 text-xs text-white/25">
            O voto permanece privado até ao encerramento da votação.
          </p>

          <PrimaryAction
            label="Submeter voto"
            disabled={
              working ||
              voteOpinion.trim().length < 20
            }
            onClick={() => void submitVote()}
            full
          />
        </Modal>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
}: any) {
  return (
    <article className="rounded-[1.6rem] border border-white/10 bg-[#06100c]/90 p-5">
      <Icon className="h-5 w-5 text-violet-300" />
      <p className="mt-4 text-3xl font-black text-white">
        {value}
      </p>
      <p className="mt-1 text-[8px] font-black uppercase tracking-[0.12em] text-white/30">
        {label}
      </p>
    </article>
  );
}

function CandidateCard({
  candidate,
  meeting,
  working,
  onRefresh,
  onEvaluate,
  onVote,
}: any) {
  const snapshot = candidate.snapshot || {};
  return (
    <article className="overflow-hidden rounded-[2rem] border border-white/10 bg-black/20">
      <div className="border-b border-white/10 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-violet-300">
                {candidate.currentRank || "Sem patente"}
                {candidate.currentUnit
                  ? ` · ${candidate.currentUnit}`
                  : ""}
              </p>

              <span
                className={`rounded-full border px-2.5 py-1 text-[7px] font-black uppercase ${
                  Number(
                    candidate.voteCount ||
                      candidate.votes?.length ||
                      0,
                  ) > 0
                    ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
                    : "border-amber-400/20 bg-amber-500/10 text-amber-300"
                }`}
              >
                {Number(
                  candidate.voteCount ||
                    candidate.votes?.length ||
                    0,
                ) > 0
                  ? "Analisado"
                  : "Pendente"}
              </span>
            </div>

            <h3 className="mt-2 text-2xl font-black text-white">
              {candidate.guardName}
            </h3>

            <p className="mt-1 text-xs text-white/25">
              {candidate.guardDiscordId}
            </p>

            <span className="mt-3 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-2 text-[8px] font-black uppercase tracking-[0.1em] text-violet-300">
              <CalendarRange className="h-4 w-4" />
              Dados de{" "}
              {formatDate(
                candidate.snapshot?.periodStart ??
                  meeting.weekStart,
              )}{" "}
              a{" "}
              {formatDate(
                candidate.snapshot?.periodEnd ??
                  meeting.weekEnd,
              )}
            </span>

            <p className="mt-3 text-xs text-white/30">
              Snapshot atualizado automaticamente com base nas folhas de ponto
              e CPs que cruzam este período.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onRefresh}
              disabled={working}
              title="Atualizar dados"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-white/35 hover:text-white"
            >
              <RefreshCw className="h-4 w-4" />
            </button>

          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 p-6 md:grid-cols-4">
        <DossierStat
          label="Horas no período"
          value={formatHours(
            snapshot.periodHours ??
              snapshot.totalHours,
          )}
          icon={CalendarRange}
        />
        <DossierStat
          label="Horas acumuladas"
          value={formatHours(
            snapshot.accumulatedHours,
          )}
          icon={Clock3}
        />
        <DossierStat
          label="Patrulhas"
          value={snapshot.patrolCount || 0}
          icon={Users}
        />
        <DossierStat
          label="Horas patrulha"
          value={formatHours(
            snapshot.patrolHours,
          )}
          icon={BarChart3}
        />
        <DossierStat
          label="CPs conjuntas"
          value={snapshot.jointPatrols || 0}
          icon={UsersRound}
        />
        <DossierStat
          label="CPs sozinho"
          value={snapshot.soloPatrols || 0}
          icon={UserCheck}
        />
        <DossierStat
          label="Pontos"
          value={snapshot.points || 0}
          icon={BadgeCheck}
        />
        <DossierStat
          label="Avaliações"
          value={
            snapshot.evaluationCount || 0
          }
          icon={ShieldCheck}
        />
        <DossierStat
          label="Média"
          value={Number(
            snapshot.evaluationAverage || 0,
          ).toFixed(1)}
          icon={CheckCircle2}
        />
        <DossierStat
          label="Última subida"
          value={formatDate(
            snapshot.lastPromotionAt,
          )}
          icon={TrendingUp}
        />
      </div>

      <div className="mx-6 mb-6 rounded-2xl border border-violet-400/15 bg-violet-500/[0.05] p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[8px] font-black uppercase tracking-[0.12em] text-violet-300">
              Avaliações oficiais dos Sargentos
            </p>
            <p className="mt-1 text-xs text-white/30">
              Canal 1416453368678842368 · apenas mensagens dentro do período.
            </p>
          </div>

          <div className="flex gap-2">
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[8px] font-black uppercase text-white/45">
              {snapshot.sergeantEvaluationCount || 0} avaliações
            </span>
            <span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-2 text-[8px] font-black uppercase text-violet-300">
              Média {Number(
                snapshot.sergeantEvaluationAverage || 0,
              ).toFixed(1)}
            </span>
          </div>
        </div>

        {snapshot.sergeantEvaluations?.length ? (
          <div className="mt-4 space-y-3">
            {snapshot.sergeantEvaluations.map(
              (evaluation: any) => (
                <article
                  key={evaluation.messageId}
                  className="rounded-xl border border-white/10 bg-black/20 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-black text-white">
                      {evaluation.evaluatorName || "Sargento"}
                    </p>
                    <span className="text-xs font-black text-violet-300">
                      {evaluation.score !== null &&
                      evaluation.score !== undefined
                        ? `${Number(evaluation.score).toFixed(1)}/20`
                        : "Sem nota identificada"}
                    </span>
                  </div>

                  <p className="mt-3 whitespace-pre-line text-sm leading-6 text-white/45">
                    {evaluation.content}
                  </p>

                  {evaluation.jumpUrl && (
                    <a
                      href={evaluation.jumpUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex text-[8px] font-black uppercase text-violet-300 hover:text-violet-200"
                    >
                      Abrir mensagem no Discord
                    </a>
                  )}
                </article>
              ),
            )}
          </div>
        ) : (
          <p className="mt-4 text-sm text-white/25">
            Sem avaliações publicadas no canal oficial durante este período.
          </p>
        )}
      </div>

      <div className="mx-6 mb-6 rounded-2xl border border-white/10 bg-black/25 p-4">
        <p className="text-[8px] font-black uppercase tracking-[0.12em] text-white/30">
          Com quem patrulhou no período
        </p>

        {Number(snapshot.patrolCount || 0) > 0 &&
        snapshot.patrolPartners?.length ? (
          <div className="mt-3 space-y-2">
            {snapshot.patrolPartners
              .slice(0, 6)
              .map((partner: any) => (
                <div
                  key={
                    partner.discordId ||
                    partner.name
                  }
                  className="flex items-center justify-between gap-4 text-sm"
                >
                  <span className="truncate text-white/55">
                    {partner.name}
                  </span>
                  <span className="shrink-0 font-black text-violet-300">
                    {partner.count} CP
                    {partner.count === 1 ? "" : "s"} ·{" "}
                    {formatHours(
                      partner.patrolHours,
                    )}
                  </span>
                </div>
              ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-white/25">
            {Number(snapshot.patrolCount || 0) === 0
              ? "Sem CPs registadas neste período."
              : "As CPs deste período não têm outros participantes identificados."}
          </p>
        )}
      </div>

      <div className="mx-6 mb-6 grid grid-cols-2 gap-3 rounded-2xl border border-violet-400/15 bg-violet-500/[0.05] p-4 md:grid-cols-4">
        {[
          ["SUBIR", TrendingUp],
          ["MANTER", Minus],
          ["DESCER", TrendingDown],
          ["ABSTER", Vote],
        ].map(([label, Icon]: any) => (
          <div
            key={label}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-3"
          >
            <Icon className="h-4 w-4 text-violet-300" />
            <span className="text-[8px] font-black uppercase tracking-[0.1em] text-white/45">
              {label}
            </span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 border-t border-white/10 p-6 md:grid-cols-2">
        <button
          type="button"
          onClick={onEvaluate}
          className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-4 text-[8px] font-black uppercase text-emerald-300"
        >
          Registar avaliação
        </button>

        {meeting.status === "VOTING_OPEN" &&
          meeting.permissions?.cso && (
            <button
              type="button"
              onClick={onVote}
              className="rounded-xl bg-violet-500 px-4 py-4 text-[8px] font-black uppercase text-white"
            >
              Votar neste militar
            </button>
          )}
      </div>
    </article>
  );
}

function AgendaMetric({
  label,
  value,
  icon: Icon,
}: any) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <Icon className="h-5 w-5 text-violet-300" />
      <p className="mt-3 text-2xl font-black text-white">
        {value}
      </p>
      <p className="mt-1 text-[7px] font-black uppercase tracking-[0.1em] text-white/25">
        {label}
      </p>
    </div>
  );
}

function SmallStat({ label, value }: any) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <p className="text-[7px] font-black uppercase text-white/25">
        {label}
      </p>
      <p className="mt-1 truncate text-xs font-black text-white">
        {value}
      </p>
    </div>
  );
}

function DossierStat({
  label,
  value,
  icon: Icon,
}: any) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <Icon className="h-4 w-4 text-violet-300" />
      <p className="mt-3 text-lg font-black text-white">
        {value}
      </p>
      <p className="mt-1 text-[7px] font-black uppercase tracking-[0.08em] text-white/25">
        {label}
      </p>
    </div>
  );
}

function FormField({
  label,
  children,
}: any) {
  return (
    <label className="mt-4 block">
      <span className="mb-2 block text-[8px] font-black uppercase tracking-[0.12em] text-white/30">
        {label}
      </span>
      {children}
    </label>
  );
}

function PrimaryAction({
  label,
  disabled,
  onClick,
  full = false,
}: any) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-xl bg-violet-500 px-5 py-4 text-[8px] font-black uppercase text-white disabled:cursor-not-allowed disabled:opacity-35 ${
        full ? "mt-5 w-full" : ""
      }`}
    >
      {label}
    </button>
  );
}

function SecondaryAction({
  label,
  onClick,
}: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-4 text-[8px] font-black uppercase text-white/50"
    >
      {label}
    </button>
  );
}

function Modal({
  title,
  onClose,
  children,
}: any) {
  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] border border-white/10 bg-[#06100c] p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-black text-white">
            {title}
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-white/35 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}
