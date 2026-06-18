import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  BarChart3,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Star,
  Target,
  UserRound,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  UsersRound,
  Vote,
  X,
  Activity,
} from "lucide-react";

type MeetingStatus =
  | "PREPARATION"
  | "VOTING_OPEN"
  | "VOTING_CLOSED"
  | "AWAITING_CEG"
  | "AWAITING_COMMAND"
  | "APPROVED"
  | "REJECTED"
  | "RETURNED"
  | "COMPLETED";

type Meeting = {
  _id: string;
  meetingNumber?: string;
  title: string;
  status: MeetingStatus;
  weekStart?: string;
  weekEnd?: string;
  openedByName?: string;
  cegRepresentative?: {
    discordId?: string;
    name?: string;
    confirmed?: boolean;
  } | null;
  attendees?: Array<{
    discordId: string;
    name: string;
    present?: boolean;
    hasVoted?: boolean;
  }>;
  candidates?: Array<{
    guardDiscordId: string;
    guardName: string;
    currentRank?: string;
    currentUnit?: string;
    voteCount?: number;
    snapshot?: {
      totalHours?: number;
      weeklyHours?: number;
      patrolHours?: number;
      patrolCount?: number;
      points?: number;
      patrolPartners?: Array<{
        discordId?: string;
        name: string;
        count: number;
      }>;
    };
  }>;
  createdAt?: string;
  updatedAt?: string;
};

const STATUS_LABELS: Record<MeetingStatus, string> = {
  PREPARATION: "Em preparação",
  VOTING_OPEN: "Votação aberta",
  VOTING_CLOSED: "Votação encerrada",
  AWAITING_CEG: "Aguarda CEG",
  AWAITING_COMMAND: "Aguarda Comando",
  APPROVED: "Aprovada",
  REJECTED: "Rejeitada",
  RETURNED: "Devolvida",
  COMPLETED: "Concluída",
};

const STATUS_TONES: Record<MeetingStatus, string> = {
  PREPARATION: "border-white/10 bg-white/[0.04] text-white/45",
  VOTING_OPEN: "border-blue-400/20 bg-blue-500/10 text-blue-300",
  VOTING_CLOSED: "border-violet-400/20 bg-violet-500/10 text-violet-300",
  AWAITING_CEG: "border-amber-400/20 bg-amber-500/10 text-amber-300",
  AWAITING_COMMAND: "border-orange-400/20 bg-orange-500/10 text-orange-300",
  APPROVED: "border-emerald-400/20 bg-emerald-500/10 text-emerald-300",
  REJECTED: "border-red-400/20 bg-red-500/10 text-red-300",
  RETURNED: "border-yellow-400/20 bg-yellow-500/10 text-yellow-300",
  COMPLETED: "border-primary/20 bg-primary/10 text-primary",
};

async function readJsonResponse(response: Response) {
  const raw = await response.text();

  if (!raw.trim()) {
    return {
      payload: null,
      raw: "",
    };
  }

  try {
    return {
      payload: JSON.parse(raw),
      raw,
    };
  } catch {
    return {
      payload: null,
      raw,
    };
  }
}

function responseErrorMessage(
  response: Response,
  payload: any,
  raw: string,
  fallback: string,
) {
  if (payload?.error) return String(payload.error);
  if (payload?.message) return String(payload.message);

  if (raw.trim()) {
    return `${fallback} Resposta ${response.status}: ${raw.slice(0, 240)}`;
  }

  return `${fallback} A API respondeu ${response.status} sem conteúdo. Confirma se o api-server foi reiniciado e se a rota /api/cso/meetings está montada.`;
}

function defaultWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const distanceToMonday = day === 0 ? 6 : day - 1;

  const start = new Date(now);
  start.setDate(now.getDate() - distanceToMonday);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return {
    weekStart: start.toISOString().slice(0, 10),
    weekEnd: end.toISOString().slice(0, 10),
  };
}

export default function CSOReunioes() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<MeetingStatus | "ALL">("ALL");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [creatingStep, setCreatingStep] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [backendMissing, setBackendMissing] = useState(false);
  const [error, setError] = useState("");

  const week = defaultWeekRange();

  const [form, setForm] = useState({
    title: `Reunião semanal do CSO — ${new Date().toLocaleDateString("pt-PT")}`,
    weekStart: week.weekStart,
    weekEnd: week.weekEnd,
  });

  async function loadMeetings() {
    setLoading(true);
    setError("");
    setBackendMissing(false);

    try {
      const response = await fetch("/api/cso/meetings", {
        credentials: "include",
      });

      if (response.status === 404) {
        setBackendMissing(true);
        setMeetings([]);
        return;
      }

      const { payload, raw } = await readJsonResponse(response);

      if (!response.ok || !payload) {
        throw new Error(
          responseErrorMessage(
            response,
            payload,
            raw,
            "Não foi possível carregar as reuniões do CSO.",
          ),
        );
      }

      setMeetings(
        Array.isArray(payload?.meetings)
          ? payload.meetings
          : Array.isArray(payload?.items)
            ? payload.items
            : [],
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Não foi possível carregar as reuniões do CSO.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadMeetings();
  }, []);

  const filteredMeetings = useMemo(() => {
    const term = query.trim().toLowerCase();

    return meetings.filter((meeting) => {
      const matchesSearch =
        !term ||
        [
          meeting.meetingNumber,
          meeting.title,
          meeting.openedByName,
          ...(meeting.candidates || []).map((candidate) => candidate.guardName),
        ]
          .filter(Boolean)
          .some((value) =>
            String(value).toLowerCase().includes(term),
          );

      return (
        matchesSearch &&
        (status === "ALL" || meeting.status === status)
      );
    });
  }, [meetings, query, status]);

  const counts = useMemo(
    () => ({
      total: meetings.length,
      open: meetings.filter((meeting) =>
        ["PREPARATION", "VOTING_OPEN", "VOTING_CLOSED"].includes(
          meeting.status,
        ),
      ).length,
      awaiting: meetings.filter((meeting) =>
        ["AWAITING_CEG", "AWAITING_COMMAND"].includes(meeting.status),
      ).length,
      completed: meetings.filter((meeting) =>
        ["APPROVED", "COMPLETED"].includes(meeting.status),
      ).length,
    }),
    [meetings],
  );

  async function createMeeting() {
    if (!form.title.trim()) {
      setError("Indica um título para a reunião.");
      return;
    }

    setCreating(true);
    setCreatingStep("A criar a reunião...");
    setError("");

    const controller = new AbortController();
    const timeout = window.setTimeout(
      () => controller.abort(),
      15000,
    );

    try {
      const response = await fetch(
        "/api/cso/meetings",
        {
          method: "POST",
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(form),
        },
      );

      if (response.status === 404) {
        setBackendMissing(true);
        throw new Error(
          "A página está instalada, mas falta a API das reuniões do CSO.",
        );
      }

      const { payload, raw } =
        await readJsonResponse(response);

      if (
        !response.ok ||
        !payload?.meeting?._id
      ) {
        throw new Error(
          responseErrorMessage(
            response,
            payload,
            raw,
            "Não foi possível criar a reunião.",
          ),
        );
      }

      setCreatingStep(
        "Reunião criada. A abrir e sincronizar o efetivo...",
      );

      window.location.assign(
        `/departamentos/cso/reunioes/${payload.meeting._id}`,
      );
    } catch (createError: any) {
      if (createError?.name === "AbortError") {
        setError(
          "O servidor demorou demasiado a responder. Atualiza a lista para confirmar se a reunião foi criada antes de tentar novamente.",
        );
      } else {
        setError(
          createError instanceof Error
            ? createError.message
            : "Não foi possível criar a reunião.",
        );
      }
    } finally {
      window.clearTimeout(timeout);
      setCreating(false);
      setCreatingStep("");
    }
  }

  return (
    <div className="space-y-6 pb-12">
      <section className="relative overflow-hidden rounded-[2.8rem] border border-violet-400/20 bg-[#080712]/95 p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_15%,rgba(139,92,246,0.18),transparent_34%),radial-gradient(circle_at_88%_80%,rgba(34,197,94,0.10),transparent_36%)]" />

        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <Link
              href="/departamentos/cso"
              className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.16em] text-white/35 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar ao CSO
            </Link>

            <p className="mt-6 text-[9px] font-black uppercase tracking-[0.22em] text-violet-300">
              Conselho Superior de Oficiais
            </p>

            <h1 className="mt-3 text-4xl font-black text-white md:text-6xl">
              Centro de Reuniões
            </h1>

            <p className="mt-4 max-w-4xl text-sm leading-7 text-white/40">
              Análise de guardas, horas, pontos, patrulhas, companheiros,
              votação privada e encaminhamento direto ao CEG e ao
              Comando-Geral. O DRH não participa neste processo.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-500 px-6 py-4 text-[9px] font-black uppercase tracking-[0.12em] text-white shadow-[0_0_35px_rgba(139,92,246,0.25)]"
          >
            <Plus className="h-4 w-4" />
            Iniciar reunião
          </button>
        </div>
      </section>

      <CSOSergeantEvaluations />

      {error && (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {backendMissing && (
        <section className="rounded-[1.8rem] border border-amber-400/20 bg-amber-500/[0.07] p-5">
          <div className="flex items-start gap-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
            <div>
              <h2 className="font-black text-white">
                Falta instalar a API das reuniões
              </h2>
              <p className="mt-2 text-sm leading-6 text-white/40">
                A rota da página está correta e já não dará 404. Para criar,
                guardar candidatos e votar, ainda tens de instalar o backend
                dedicado em <code className="text-amber-300">/api/cso/meetings</code>.
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Metric
          label="Reuniões"
          value={counts.total}
          icon={CalendarCheck}
        />
        <Metric
          label="Em curso"
          value={counts.open}
          icon={Clock3}
        />
        <Metric
          label="Em validação"
          value={counts.awaiting}
          icon={ShieldCheck}
        />
        <Metric
          label="Concluídas"
          value={counts.completed}
          icon={CheckCircle2}
        />
      </section>

      <section className="grid grid-cols-1 gap-3 rounded-[1.8rem] border border-white/10 bg-[#06100c]/90 p-4 lg:grid-cols-[1fr_240px_auto]">
        <div className="flex h-12 items-center rounded-xl border border-white/10 bg-black/25 px-4">
          <Search className="mr-3 h-4 w-4 text-violet-300" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Reunião, número, responsável ou guarda..."
            className="h-full min-w-0 flex-1 bg-transparent text-sm text-white outline-none"
          />
        </div>

        <select
          value={status}
          onChange={(event) =>
            setStatus(event.target.value as MeetingStatus | "ALL")
          }
          className="h-12 rounded-xl border border-white/10 bg-black/25 px-3 text-sm text-white outline-none"
        >
          <option value="ALL">Todos os estados</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => void loadMeetings()}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-[9px] font-black uppercase tracking-[0.12em] text-white/45"
        >
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </button>
      </section>

      {loading ? (
        <div className="flex min-h-[320px] items-center justify-center">
          <Loader2 className="h-9 w-9 animate-spin text-violet-300" />
        </div>
      ) : filteredMeetings.length > 0 ? (
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {filteredMeetings.map((meeting) => (
            <Link
              key={meeting._id}
              href={`/departamentos/cso/reunioes/${meeting._id}`}
              className="group rounded-[2rem] border border-white/10 bg-[#06100c]/90 p-6 transition hover:-translate-y-1 hover:border-violet-400/25"
            >
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={meeting.status} />

                {meeting.meetingNumber && (
                  <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-[8px] font-black uppercase tracking-[0.1em] text-white/35">
                    {meeting.meetingNumber}
                  </span>
                )}
              </div>

              <h2 className="mt-4 text-2xl font-black text-white transition group-hover:text-violet-300">
                {meeting.title}
              </h2>

              <p className="mt-2 text-xs text-white/30">
                Responsável: {meeting.openedByName || "Por definir"}
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                <Info
                  label="Candidatos"
                  value={String(meeting.candidates?.length || 0)}
                />
                <Info
                  label="Presentes"
                  value={String(
                    meeting.attendees?.filter((item) => item.present).length || 0,
                  )}
                />
                <Info
                  label="Votos"
                  value={String(
                    meeting.attendees?.filter((item) => item.hasVoted).length || 0,
                  )}
                />
                <Info
                  label="CEG"
                  value={
                    meeting.cegRepresentative?.confirmed ? "Confirmado" : "Pendente"
                  }
                />
              </div>
            </Link>
          ))}
        </section>
      ) : (
        <section className="rounded-[2rem] border border-dashed border-white/10 bg-[#06100c]/60 p-14 text-center">
          <Vote className="mx-auto h-10 w-10 text-white/15" />
          <h2 className="mt-5 text-xl font-black text-white">
            Nenhuma reunião encontrada
          </h2>
          <p className="mt-2 text-sm text-white/30">
            Inicia a primeira reunião semanal do CSO.
          </p>
        </section>
      )}

      {showCreate && (
        <Modal
          title="Iniciar reunião do CSO"
          onClose={() => setShowCreate(false)}
        >
          <Field label="Título">
            <input
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              className="input"
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Início da semana">
              <input
                type="date"
                value={form.weekStart}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    weekStart: event.target.value,
                  }))
                }
                className="input"
              />
            </Field>

            <Field label="Fim da semana">
              <input
                type="date"
                value={form.weekEnd}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    weekEnd: event.target.value,
                  }))
                }
                className="input"
              />
            </Field>
          </div>

          <div className="mt-5 rounded-2xl border border-violet-400/15 bg-violet-500/[0.05] p-4">
            <p className="text-sm leading-6 text-white/40">
              A reunião é criada de imediato. Ao abrir, o efetivo oficial
              de Guardas e Sargentos é sincronizado automaticamente, sem
              bloquear este ecrã.
            </p>
          </div>

          <button
            type="button"
            disabled={creating || !form.title.trim()}
            onClick={() => void createMeeting()}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500 px-5 py-4 text-[10px] font-black uppercase tracking-[0.12em] text-white disabled:opacity-40"
          >
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {creating
              ? creatingStep || "A criar..."
              : "Criar reunião"}
          </button>
        </Modal>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: MeetingStatus }) {
  return (
    <span
      className={`rounded-full border px-3 py-1 text-[8px] font-black uppercase tracking-[0.1em] ${STATUS_TONES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: any;
}) {
  return (
    <article className="rounded-[1.6rem] border border-white/10 bg-[#06100c]/90 p-5">
      <Icon className="h-5 w-5 text-violet-300" />
      <p className="mt-4 text-3xl font-black text-white">{value}</p>
      <p className="mt-1 text-[8px] font-black uppercase tracking-[0.12em] text-white/30">
        {label}
      </p>
    </article>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <p className="text-[8px] font-black uppercase tracking-[0.1em] text-white/25">
        {label}
      </p>
      <p className="mt-1 truncate text-xs font-black text-white">{value}</p>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="mt-4 block">
      <span className="mb-2 block text-[8px] font-black uppercase tracking-[0.12em] text-white/30">
        {label}
      </span>
      {children}
    </label>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] border border-white/10 bg-[#06100c] p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-black text-white">{title}</h2>

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


type EvaluationStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED";

type SergeantEvaluationSummary = {
  discordId: string;
  name: string;
  rank?: string;
  avatarUrl?: string | null;
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  normal: number;
  advanced: number;
  average: number | null;
  latestAt?: string | null;
  strengths: string[];
  improvements: string[];
  evaluations: any[];
};

function CSOSergeantEvaluations() {
  const [data, setData] =
    useState<any>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [query, setQuery] =
    useState("");

  const [status, setStatus] =
    useState<
      EvaluationStatus | "ALL"
    >("ALL");

  const [view, setView] =
    useState<
      "OVERVIEW" | "GUARDS" | "QUEUE"
    >("OVERVIEW");

  const [expanded, setExpanded] =
    useState<string | null>(
      null,
    );

  const [selectedEvaluation, setSelectedEvaluation] =
    useState<any>(null);

  const [decisionBusy, setDecisionBusy] =
    useState("");

  const [rejectReason, setRejectReason] =
    useState("");

  async function load(
    silent = false,
  ) {
    if (!silent) {
      setLoading(true);
    }

    setError("");

    try {
      const response =
        await fetch(
          "/api/sergeant-evaluations/cso-summary",
          {
            credentials:
              "include",
            cache: "no-store",
          },
        );

      const raw =
        await response.text();

      let payload: any = null;

      if (raw.trim()) {
        try {
          payload =
            JSON.parse(raw);
        } catch {
          payload = null;
        }
      }

      if (!response.ok) {
        throw new Error(
          payload?.error ||
            `Não foi possível carregar as avaliações (${response.status}).`,
        );
      }

      setData(payload || {});
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Não foi possível carregar as avaliações.",
      );
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    void load();

    const interval =
      window.setInterval(() => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          void load(true);
        }
      }, 15_000);

    return () =>
      window.clearInterval(
        interval,
      );
  }, []);

  const guards =
    useMemo(() => {
      const term =
        query
          .trim()
          .toLowerCase();

      return (
        data?.guards || []
      ).filter(
        (
          guard:
            SergeantEvaluationSummary,
        ) => {
          const matchesSearch =
            !term ||
            [
              guard.name,
              guard.rank,
              guard.discordId,
            ]
              .filter(Boolean)
              .some((value) =>
                String(value)
                  .toLowerCase()
                  .includes(term),
              );

          const matchesStatus =
            status === "ALL" ||
            guard.evaluations.some(
              (evaluation) =>
                evaluation.status ===
                status,
            );

          return (
            matchesSearch &&
            matchesStatus
          );
        },
      );
    }, [
      data,
      query,
      status,
    ]);

  const pending =
    useMemo(
      () =>
        (data?.evaluations || [])
          .filter(
            (item: any) =>
              item.status ===
              "PENDING",
          )
          .filter((item: any) => {
            const term =
              query
                .trim()
                .toLowerCase();

            if (!term) return true;

            return [
              item.evaluatedName,
              item.evaluatorName,
              item.theme,
            ]
              .filter(Boolean)
              .some((value) =>
                String(value)
                  .toLowerCase()
                  .includes(term),
              );
          }),
      [data, query],
    );

  const totals =
    data?.totals || {};

  const topGuards =
    guards
      .filter(
        (guard: any) =>
          guard.average !== null,
      )
      .slice(0, 3);

  async function decide(
    evaluation: any,
    action: "approve" | "reject",
  ) {
    setDecisionBusy(
      evaluation._id,
    );
    setError("");

    try {
      const response =
        await fetch(
          `/api/sergeant-evaluations/${evaluation._id}/${action}`,
          {
            method: "POST",
            credentials:
              "include",
            headers: {
              "Content-Type":
                "application/json",
              Accept:
                "application/json",
            },
            body:
              action === "reject"
                ? JSON.stringify({
                    reason:
                      rejectReason,
                  })
                : undefined,
          },
        );

      const payload =
        await response
          .json()
          .catch(() => null);

      if (!response.ok) {
        throw new Error(
          payload?.error ||
            "Não foi possível concluir a decisão.",
        );
      }

      setSelectedEvaluation(null);
      setRejectReason("");
      await load();
    } catch (decisionError) {
      setError(
        decisionError instanceof Error
          ? decisionError.message
          : "Não foi possível concluir a decisão.",
      );
    } finally {
      setDecisionBusy("");
    }
  }

  return (
    <section className="relative overflow-hidden rounded-[2.6rem] border border-violet-400/20 bg-[#080712]/95 p-5 shadow-[0_28px_90px_rgba(0,0,0,0.28)] md:p-7">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(139,92,246,0.18),transparent_34%),radial-gradient(circle_at_90%_100%,rgba(34,197,94,0.10),transparent_36%)]" />

      <div className="relative">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.16em] text-violet-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              Supervisão institucional
            </div>

            <h2 className="mt-4 text-3xl font-black tracking-[-0.03em] text-white md:text-4xl">
              Avaliações dos Sargentos
            </h2>

            <p className="mt-3 max-w-4xl text-sm leading-7 text-white/40">
              Centro de análise do CSO com avaliações do site, Discord e arquivo histórico, agrupadas por guarda e prontas para decisão.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              void load()
            }
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-violet-400/20 bg-violet-500/10 px-5 py-3 text-[8px] font-black uppercase tracking-[0.1em] text-violet-300 transition hover:-translate-y-0.5"
          >
            <RefreshCw className="h-4 w-4" />
            Sincronizar
          </button>
        </div>

        {error && (
          <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {loading && !data ? (
          <div className="flex min-h-[280px] items-center justify-center">
            <Loader2 className="h-9 w-9 animate-spin text-violet-300" />
          </div>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
              <EvaluationMetric label="Avaliações" value={totals.evaluations || 0} icon={FileText} tone="violet" />
              <EvaluationMetric label="Guardas" value={totals.guards || 0} icon={UsersRound} tone="blue" />
              <EvaluationMetric label="Pendentes" value={totals.pending || 0} icon={Clock3} tone="amber" />
              <EvaluationMetric label="Aprovadas" value={totals.approved || 0} icon={CheckCircle2} tone="emerald" />
              <EvaluationMetric label="Reprovadas" value={totals.rejected || 0} icon={AlertTriangle} tone="red" />
              <EvaluationMetric label="Site" value={totals.site || 0} icon={Target} tone="green" />
              <EvaluationMetric label="Discord" value={totals.discord || 0} icon={ExternalLink} tone="blue" />
              <EvaluationMetric label="Média" value={totals.officialAverage ?? "—"} icon={Star} tone="violet" />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto]">
              <div className="flex h-12 items-center rounded-2xl border border-white/10 bg-black/25 px-4 focus-within:border-violet-400/30">
                <Search className="mr-3 h-4 w-4 text-violet-300" />
                <input
                  value={query}
                  onChange={(event) =>
                    setQuery(event.target.value)
                  }
                  placeholder="Pesquisar guarda, patente, avaliador ou tema..."
                  className="h-full flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/20"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-black/20 p-1.5">
                {[
                  ["OVERVIEW", "Visão geral"],
                  ["GUARDS", "Por guarda"],
                  ["QUEUE", `Fila (${pending.length})`],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() =>
                      setView(key as any)
                    }
                    className={`rounded-xl px-4 py-3 text-[8px] font-black uppercase tracking-[0.08em] transition ${
                      view === key
                        ? "bg-violet-500/15 text-violet-300"
                        : "text-white/30 hover:bg-white/[0.04] hover:text-white/60"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {view === "OVERVIEW" && (
              <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[1.25fr_0.75fr]">
                <section className="rounded-[1.8rem] border border-white/10 bg-black/20 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-[0.14em] text-violet-300">
                        Melhor desempenho
                      </p>
                      <h3 className="mt-2 text-xl font-black text-white">
                        Guardas em destaque
                      </h3>
                    </div>

                    <BarChart3 className="h-5 w-5 text-violet-300" />
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                    {topGuards.length ? (
                      topGuards.map((guard: any, index: number) => (
                        <article key={guard.discordId} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                          <div className="flex items-center justify-between">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-500/10 text-sm font-black text-violet-300">
                              {index + 1}
                            </span>
                            <Star className="h-4 w-4 text-amber-300" />
                          </div>
                          <p className="mt-4 truncate font-black text-white">
                            {guard.name}
                          </p>
                          <p className="mt-1 truncate text-[8px] font-black uppercase text-violet-300">
                            {guard.rank || "Guarda"}
                          </p>
                          <p className="mt-5 text-3xl font-black text-white">
                            {guard.average}
                          </p>
                          <p className="text-[7px] font-black uppercase text-white/25">
                            Média oficial
                          </p>
                        </article>
                      ))
                    ) : (
                      <div className="col-span-full rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-white/25">
                        Sem médias oficiais disponíveis.
                      </div>
                    )}
                  </div>
                </section>

                <section className="rounded-[1.8rem] border border-amber-400/15 bg-amber-500/[0.04] p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-[0.14em] text-amber-300">
                        Prioridade do CSO
                      </p>
                      <h3 className="mt-2 text-xl font-black text-white">
                        Fila de validação
                      </h3>
                    </div>

                    <Clock3 className="h-5 w-5 text-amber-300" />
                  </div>

                  <div className="mt-5 space-y-2">
                    {pending.slice(0, 5).map((evaluation: any) => (
                      <button
                        key={evaluation._id}
                        type="button"
                        onClick={() =>
                          setSelectedEvaluation(evaluation)
                        }
                        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/8 bg-black/20 p-3 text-left transition hover:border-amber-400/20"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-white">
                            {evaluation.evaluatedName}
                          </p>
                          <p className="mt-1 truncate text-[8px] text-white/25">
                            {evaluation.evaluatorName} · {new Date(evaluation.createdAt).toLocaleDateString("pt-PT")}
                          </p>
                        </div>
                        <span className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs font-black text-amber-300">
                          {evaluation.average ?? "N/A"}
                        </span>
                      </button>
                    ))}

                    {!pending.length && (
                      <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-white/25">
                        Nenhuma avaliação pendente.
                      </div>
                    )}
                  </div>
                </section>
              </div>
            )}

            {view === "GUARDS" && (
              <div className="mt-6 space-y-3">
                <div className="flex justify-end">
                  <select
                    value={status}
                    onChange={(event) =>
                      setStatus(event.target.value as any)
                    }
                    className="h-11 rounded-xl border border-white/10 bg-black/25 px-4 text-sm text-white outline-none"
                  >
                    <option value="ALL">Todos os estados</option>
                    <option value="PENDING">Pendentes</option>
                    <option value="APPROVED">Aprovadas</option>
                    <option value="REJECTED">Reprovadas</option>
                  </select>
                </div>

                {guards.length ? (
                  guards.map((guard: SergeantEvaluationSummary) => {
                    const open =
                      expanded === guard.discordId;

                    return (
                      <article
                        key={guard.discordId}
                        className="overflow-hidden rounded-[1.7rem] border border-white/10 bg-black/20"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setExpanded(open ? null : guard.discordId)
                          }
                          className="grid w-full grid-cols-1 gap-4 p-5 text-left lg:grid-cols-[minmax(0,1fr)_repeat(5,104px)_40px] lg:items-center"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            {guard.avatarUrl ? (
                              <img
                                src={guard.avatarUrl}
                                alt=""
                                className="h-12 w-12 rounded-2xl border border-white/10 object-cover"
                              />
                            ) : (
                              <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-500/10 text-violet-300">
                                <UserRound className="h-5 w-5" />
                              </span>
                            )}

                            <span className="min-w-0">
                              <span className="block truncate font-black text-white">
                                {guard.name}
                              </span>
                              <span className="mt-1 block truncate text-[8px] font-black uppercase text-violet-300">
                                {guard.rank || "Guarda"}
                              </span>
                            </span>
                          </div>

                          <MiniStat label="Total" value={guard.total} />
                          <MiniStat label="Aprovadas" value={guard.approved} />
                          <MiniStat label="Pendentes" value={guard.pending} />
                          <MiniStat label="360.º" value={guard.advanced} />
                          <MiniStat label="Média" value={guard.average ?? "—"} />

                          {open ? (
                            <ChevronUp className="h-5 w-5 text-violet-300" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-white/30" />
                          )}
                        </button>

                        {open && (
                          <div className="border-t border-white/10 p-5">
                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                              <SummaryText title="Pontos fortes registados" values={guard.strengths} />
                              <SummaryText title="Aspetos a melhorar" values={guard.improvements} />
                            </div>

                            <div className="mt-5 space-y-2">
                              {guard.evaluations.map((evaluation) => (
                                <button
                                  key={evaluation._id}
                                  type="button"
                                  onClick={() =>
                                    setSelectedEvaluation(evaluation)
                                  }
                                  className="flex w-full flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-violet-400/20 md:flex-row md:items-center md:justify-between"
                                >
                                  <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <EvaluationStatusBadge status={evaluation.status} />
                                      <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[7px] font-black uppercase text-white/35">
                                        {evaluation.type === "ADVANCED_360" ? "360.º" : "Normal"}
                                      </span>
                                      <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[7px] font-black uppercase text-white/35">
                                        {evaluation.source === "SITE" ? "Site" : "Discord"}
                                      </span>
                                    </div>
                                    <p className="mt-3 font-black text-white">
                                      {evaluation.theme}
                                    </p>
                                    <p className="mt-1 text-xs text-white/30">
                                      Avaliador: {evaluation.evaluatorName} · {new Date(evaluation.createdAt).toLocaleDateString("pt-PT")}
                                    </p>
                                  </div>

                                  <span className="rounded-xl border border-violet-400/20 bg-violet-500/10 px-4 py-3 text-sm font-black text-violet-200">
                                    {evaluation.average ?? "N/A"}/10
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-white/30">
                    Nenhum guarda encontrado.
                  </div>
                )}
              </div>
            )}

            {view === "QUEUE" && (
              <div className="mt-6 grid grid-cols-1 gap-3 xl:grid-cols-2">
                {pending.length ? (
                  pending.map((evaluation: any) => (
                    <button
                      key={evaluation._id}
                      type="button"
                      onClick={() =>
                        setSelectedEvaluation(evaluation)
                      }
                      className="rounded-[1.7rem] border border-amber-400/15 bg-amber-500/[0.035] p-5 text-left transition hover:-translate-y-0.5 hover:border-amber-400/25"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <EvaluationStatusBadge status={evaluation.status} />
                          <h3 className="mt-3 text-xl font-black text-white">
                            {evaluation.evaluatedName}
                          </h3>
                          <p className="mt-1 text-[8px] font-black uppercase text-violet-300">
                            {evaluation.evaluatedRank || "Guarda"}
                          </p>
                        </div>
                        <span className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xl font-black text-white">
                          {evaluation.average ?? "N/A"}
                        </span>
                      </div>

                      <p className="mt-4 line-clamp-2 text-sm leading-6 text-white/40">
                        {evaluation.theme}
                      </p>

                      <p className="mt-4 text-xs text-white/25">
                        {evaluation.evaluatorName} · {new Date(evaluation.createdAt).toLocaleString("pt-PT")}
                      </p>
                    </button>
                  ))
                ) : (
                  <div className="col-span-full rounded-2xl border border-dashed border-white/10 p-12 text-center text-sm text-white/30">
                    A fila de validação está vazia.
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {selectedEvaluation && (
        <div className="fixed inset-0 z-[260] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[2.2rem] border border-violet-400/20 bg-[#080712] shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-white/10 bg-[#080712]/95 p-6 backdrop-blur-xl">
              <div>
                <EvaluationStatusBadge status={selectedEvaluation.status} />
                <h3 className="mt-3 text-2xl font-black text-white">
                  {selectedEvaluation.evaluatedName}
                </h3>
                <p className="mt-1 text-sm text-violet-300">
                  {selectedEvaluation.theme}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedEvaluation(null);
                  setRejectReason("");
                }}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-white/35 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5 p-6">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <MiniStat label="Média" value={selectedEvaluation.average ?? "N/A"} />
                <MiniStat label="Modelo" value={selectedEvaluation.type === "ADVANCED_360" ? "360.º" : "Normal"} />
                <MiniStat label="Origem" value={selectedEvaluation.source === "SITE" ? "Site" : "Discord"} />
                <MiniStat label="Estado" value={selectedEvaluation.status} />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <SummaryText
                  title="Avaliador"
                  values={[
                    selectedEvaluation.evaluatorName || "Desconhecido",
                    new Date(selectedEvaluation.createdAt).toLocaleString("pt-PT"),
                  ]}
                />
                <SummaryText
                  title="Classificação"
                  values={[
                    selectedEvaluation.classification || "Sem classificação",
                    selectedEvaluation.evaluatedRank || "Guarda",
                  ]}
                />
              </div>

              {selectedEvaluation.status === "PENDING" && (
                <div className="rounded-2xl border border-amber-400/15 bg-amber-500/[0.04] p-5">
                  <p className="text-[8px] font-black uppercase tracking-[0.14em] text-amber-300">
                    Decisão do CSO
                  </p>

                  <textarea
                    value={rejectReason}
                    onChange={(event) =>
                      setRejectReason(event.target.value)
                    }
                    rows={4}
                    placeholder="Motivo apenas necessário em caso de reprovação..."
                    className="mt-4 w-full resize-none rounded-2xl border border-white/10 bg-black/25 p-4 text-sm text-white outline-none"
                  />

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      disabled={decisionBusy === selectedEvaluation._id}
                      onClick={() =>
                        void decide(selectedEvaluation, "approve")
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-[8px] font-black uppercase text-white disabled:opacity-40"
                    >
                      {decisionBusy === selectedEvaluation._id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      Aprovar
                    </button>

                    <button
                      type="button"
                      disabled={
                        decisionBusy === selectedEvaluation._id ||
                        rejectReason.trim().length < 3
                      }
                      onClick={() =>
                        void decide(selectedEvaluation, "reject")
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-500 px-4 py-3 text-[8px] font-black uppercase text-white disabled:opacity-40"
                    >
                      <AlertTriangle className="h-4 w-4" />
                      Reprovar
                    </button>
                  </div>
                </div>
              )}

              {selectedEvaluation.discord?.jumpUrl && (
                <a
                  href={selectedEvaluation.discord.jumpUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[8px] font-black uppercase text-white/45 hover:text-white"
                >
                  <ExternalLink className="h-4 w-4" />
                  Abrir publicação no Discord
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function EvaluationMetric({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number | string;
  icon: any;
  tone: "violet" | "blue" | "amber" | "emerald" | "red" | "green";
}) {
  const tones = {
    violet: "border-violet-400/15 bg-violet-500/[0.05] text-violet-300",
    blue: "border-blue-400/15 bg-blue-500/[0.05] text-blue-300",
    amber: "border-amber-400/15 bg-amber-500/[0.05] text-amber-300",
    emerald: "border-emerald-400/15 bg-emerald-500/[0.05] text-emerald-300",
    red: "border-red-400/15 bg-red-500/[0.05] text-red-300",
    green: "border-green-400/15 bg-green-500/[0.05] text-green-300",
  };

  return (
    <article className={`rounded-2xl border p-4 transition hover:-translate-y-0.5 ${tones[tone]}`}>
      <div className="flex items-center justify-between">
        <Icon className="h-4 w-4" />
        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-50" />
      </div>

      <p className="mt-4 text-2xl font-black text-white">
        {value}
      </p>

      <p className="mt-1 text-[7px] font-black uppercase tracking-[0.12em] text-white/25">
        {label}
      </p>
    </article>
  );
}


function MiniStat({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <span className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-center">
      <span className="block text-lg font-black text-white">
        {value}
      </span>

      <span className="mt-1 block text-[7px] font-black uppercase text-white/25">
        {label}
      </span>
    </span>
  );
}

function SummaryText({
  title,
  values,
}: {
  title: string;
  values: string[];
}) {
  return (
    <section className="rounded-xl border border-white/10 bg-black/20 p-4">
      <p className="text-[8px] font-black uppercase tracking-[0.12em] text-violet-300">
        {title}
      </p>

      <div className="mt-3 space-y-2">
        {values.length ? (
          values.slice(0, 6).map(
            (value, index) => (
              <p
                key={`${index}-${value}`}
                className="text-sm leading-6 text-white/45"
              >
                • {value}
              </p>
            ),
          )
        ) : (
          <p className="text-sm text-white/25">
            Sem registos.
          </p>
        )}
      </div>
    </section>
  );
}

function EvaluationStatusBadge({
  status,
}: {
  status: EvaluationStatus;
}) {
  const tone =
    status === "APPROVED"
      ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
      : status === "REJECTED"
        ? "border-red-400/20 bg-red-500/10 text-red-300"
        : "border-amber-400/20 bg-amber-500/10 text-amber-300";

  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[7px] font-black uppercase ${tone}`}
    >
      {status}
    </span>
  );
}
