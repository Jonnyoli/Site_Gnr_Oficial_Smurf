import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileCheck2,
  FileWarning,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Stamp,
  UserCheck,
} from "lucide-react";

type Operation = {
  _id: string;
  caseNumber?: string | null;
  title: string;
  category: string;
  createdByName?: string;
  reportSubmittedByName?: string;
  reportSubmittedAt?: string;
  completedAt?: string;
  reportStatus?: string;
  directorApproval?: {
    actorName?: string | null;
    at?: string | null;
    code?: string | null;
  };
  commandApproval?: {
    actorName?: string | null;
    at?: string | null;
    code?: string | null;
  };
  officialDocument?: {
    issued?: boolean;
    issuedAt?: string | null;
    verificationCode?: string | null;
  };
};

type ApprovalResponse = {
  permissions: {
    director: boolean;
    command: boolean;
  };
  pendingDirector: Operation[];
  pendingCommand: Operation[];
  readyForDocument: Operation[];
  corrections: Operation[];
  issued: Operation[];
  counts: {
    pendingDirector: number;
    pendingCommand: number;
    readyForDocument: number;
    corrections: number;
    issued: number;
  };
};

const EMPTY_DATA: ApprovalResponse = {
  permissions: {
    director: false,
    command: false,
  },
  pendingDirector: [],
  pendingCommand: [],
  readyForDocument: [],
  corrections: [],
  issued: [],
  counts: {
    pendingDirector: 0,
    pendingCommand: 0,
    readyForDocument: 0,
    corrections: 0,
    issued: 0,
  },
};

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(path, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data?.error || "Não foi possível concluir o pedido.",
    );
  }

  return data as T;
}

function formatDate(value?: string | null) {
  if (!value) return "Sem data";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Sem data";

  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function ApprovalCard({
  operation,
  tone,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  isBusy,
}: {
  operation: Operation;
  tone: "blue" | "yellow" | "violet" | "orange" | "emerald";
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  isBusy?: boolean;
}) {
  const tones = {
    blue: "border-blue-400/20 bg-blue-500/[0.06] text-blue-300",
    yellow:
      "border-yellow-400/20 bg-yellow-500/[0.06] text-yellow-300",
    violet:
      "border-violet-400/20 bg-violet-500/[0.06] text-violet-300",
    orange:
      "border-orange-400/20 bg-orange-500/[0.06] text-orange-300",
    emerald:
      "border-emerald-400/20 bg-emerald-500/[0.06] text-emerald-300",
  };

  return (
    <article
      className={`rounded-[1.8rem] border p-5 ${tones[tone]}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-mono text-[9px] font-black uppercase tracking-[0.16em] opacity-70">
            {operation.caseNumber || operation._id}
          </p>

          <h3 className="mt-2 text-xl font-black text-white">
            {operation.title}
          </h3>

          <p className="mt-1 text-[9px] font-black uppercase tracking-[0.14em] opacity-80">
            {operation.category}
          </p>
        </div>

        <span className="rounded-xl border border-current/20 bg-black/20 px-3 py-2 text-[8px] font-black uppercase tracking-[0.12em]">
          {operation.reportStatus || "PROCESSO"}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <p className="text-[8px] font-black uppercase tracking-[0.12em] text-white/30">
            Responsável
          </p>
          <p className="mt-1 truncate text-xs font-black text-white">
            {operation.createdByName || "Por identificar"}
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <p className="text-[8px] font-black uppercase tracking-[0.12em] text-white/30">
            Última referência
          </p>
          <p className="mt-1 truncate text-xs font-black text-white">
            {formatDate(
              operation.officialDocument?.issuedAt ||
                operation.commandApproval?.at ||
                operation.directorApproval?.at ||
                operation.reportSubmittedAt ||
                operation.completedAt,
            )}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-4">
        <button
          type="button"
          onClick={() =>
            window.location.assign(
              `/unidades/nic?operation=${operation._id}`,
            )
          }
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-4 py-2 text-[8px] font-black uppercase tracking-[0.11em] text-white/55 hover:text-white"
        >
          Abrir dossier
          <ChevronRight className="h-3.5 w-3.5" />
        </button>

        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            disabled={isBusy}
            className="rounded-xl border border-current/20 bg-current/10 px-4 py-2 text-[8px] font-black uppercase tracking-[0.11em] disabled:opacity-40"
          >
            {actionLabel}
          </button>
        )}

        {secondaryLabel && onSecondary && (
          <button
            type="button"
            onClick={onSecondary}
            disabled={isBusy}
            className="rounded-xl border border-orange-400/20 bg-orange-500/10 px-4 py-2 text-[8px] font-black uppercase tracking-[0.11em] text-orange-300 disabled:opacity-40"
          >
            {secondaryLabel}
          </button>
        )}
      </div>
    </article>
  );
}

function ApprovalSection({
  title,
  subtitle,
  icon: Icon,
  count,
  children,
}: {
  title: string;
  subtitle: string;
  icon: any;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[2.3rem] border border-white/10 bg-[#06100c]/85 p-5 shadow-[0_28px_120px_rgba(0,0,0,0.4)]">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </span>

          <div>
            <h2 className="text-xl font-black text-white">
              {title}
            </h2>
            <p className="mt-1 text-xs text-white/35">
              {subtitle}
            </p>
          </div>
        </div>

        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-black text-white">
          {count}
        </span>
      </div>

      {children}
    </section>
  );
}

export default function CentroAprovacoes() {
  const [, navigate] = useLocation();
  const [data, setData] =
    useState<ApprovalResponse>(EMPTY_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  async function loadData() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiRequest<ApprovalResponse>(
        "/api/operational-notifications/approvals",
      );

      setData(response);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Não foi possível carregar o centro.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function runAction(
    operationId: string,
    path: string,
    noteRequired = false,
  ) {
    const note = noteRequired
      ? window.prompt("Indica as correções necessárias:")
      : window.prompt("Observação da validação (opcional):") || "";

    if (
      noteRequired &&
      (!note || note.trim().length < 5)
    ) {
      return;
    }

    setBusyId(operationId);
    setError(null);

    try {
      await apiRequest(path, {
        method: "PATCH",
        body: JSON.stringify({
          note: note?.trim() || "",
        }),
      });

      await loadData();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Não foi possível concluir a ação.",
      );
    } finally {
      setBusyId(null);
    }
  }

  const normalizedQuery = query.trim().toLowerCase();

  function filterItems(items: Operation[]) {
    if (!normalizedQuery) return items;

    return items.filter((operation) =>
      [
        operation.title,
        operation.caseNumber,
        operation.createdByName,
        operation.category,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLowerCase()
            .includes(normalizedQuery),
        ),
    );
  }

  const pendingDirector = useMemo(
    () => filterItems(data.pendingDirector),
    [data.pendingDirector, normalizedQuery],
  );

  const pendingCommand = useMemo(
    () => filterItems(data.pendingCommand),
    [data.pendingCommand, normalizedQuery],
  );

  const readyForDocument = useMemo(
    () => filterItems(data.readyForDocument),
    [data.readyForDocument, normalizedQuery],
  );

  const corrections = useMemo(
    () => filterItems(data.corrections),
    [data.corrections, normalizedQuery],
  );

  const issued = useMemo(
    () => filterItems(data.issued),
    [data.issued, normalizedQuery],
  );

  if (isLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <section className="relative overflow-hidden rounded-[2.7rem] border border-primary/15 bg-[#06100c]/92 p-7 shadow-[0_40px_150px_rgba(0,0,0,0.5)]">
        <div className="absolute inset-0 cyber-grid-soft opacity-10" />
        <div className="absolute -right-20 -top-28 h-96 w-96 rounded-full bg-primary/10 blur-[130px]" />

        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-primary">
              <ShieldCheck className="h-4 w-4" />
              Comando e validação
            </div>

            <h1 className="mt-5 text-4xl font-black tracking-tight text-white md:text-5xl">
              Centro de Aprovações
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-white/45">
              Relatórios pendentes, correções solicitadas,
              documentos prontos para emissão e arquivo oficial.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadData()}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[9px] font-black uppercase tracking-[0.12em] text-white/55 hover:text-white"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </button>
        </div>
      </section>

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      <section className="grid grid-cols-2 gap-4 xl:grid-cols-5">
        {[
          {
            label: "Diretor NIC",
            value: data.counts.pendingDirector,
            icon: UserCheck,
          },
          {
            label: "Comando-Geral",
            value: data.counts.pendingCommand,
            icon: Stamp,
          },
          {
            label: "Por emitir",
            value: data.counts.readyForDocument,
            icon: FileCheck2,
          },
          {
            label: "Correções",
            value: data.counts.corrections,
            icon: FileWarning,
          },
          {
            label: "Emitidos",
            value: data.counts.issued,
            icon: CheckCircle2,
          },
        ].map(({ label, value, icon: Icon }) => (
          <article
            key={label}
            className="rounded-[1.7rem] border border-white/10 bg-[#06100c]/85 p-5"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.13em] text-white/30">
                  {label}
                </p>
                <p className="mt-3 text-3xl font-black text-white">
                  {value}
                </p>
              </div>

              <Icon className="h-5 w-5 text-primary" />
            </div>
          </article>
        ))}
      </section>

      <section className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#06100c]/80 px-4">
        <Search className="h-5 w-5 text-white/30" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Pesquisar processo, responsável ou categoria..."
          className="h-14 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/25"
        />
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {(data.permissions.director ||
          data.permissions.command) && (
          <ApprovalSection
            title="Aguarda Diretor do NIC"
            subtitle="Primeira validação institucional."
            icon={UserCheck}
            count={pendingDirector.length}
          >
            <div className="space-y-4">
              {pendingDirector.length > 0 ? (
                pendingDirector.map((operation) => (
                  <ApprovalCard
                    key={operation._id}
                    operation={operation}
                    tone="blue"
                    isBusy={busyId === operation._id}
                    actionLabel={
                      data.permissions.director
                        ? "Aprovar"
                        : undefined
                    }
                    onAction={
                      data.permissions.director
                        ? () =>
                            runAction(
                              operation._id,
                              `/api/units/operations/${operation._id}/director/approve`,
                            )
                        : undefined
                    }
                    secondaryLabel={
                      data.permissions.director
                        ? "Pedir correções"
                        : undefined
                    }
                    onSecondary={
                      data.permissions.director
                        ? () =>
                            runAction(
                              operation._id,
                              `/api/units/operations/${operation._id}/director/request-changes`,
                              true,
                            )
                        : undefined
                    }
                  />
                ))
              ) : (
                <p className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-white/30">
                  Não existem relatórios nesta fase.
                </p>
              )}
            </div>
          </ApprovalSection>
        )}

        {data.permissions.command && (
          <ApprovalSection
            title="Aguarda Comando-Geral"
            subtitle="Validação final antes da emissão."
            icon={Stamp}
            count={pendingCommand.length}
          >
            <div className="space-y-4">
              {pendingCommand.length > 0 ? (
                pendingCommand.map((operation) => (
                  <ApprovalCard
                    key={operation._id}
                    operation={operation}
                    tone="yellow"
                    isBusy={busyId === operation._id}
                    actionLabel="Validar"
                    onAction={() =>
                      runAction(
                        operation._id,
                        `/api/units/operations/${operation._id}/command/approve`,
                      )
                    }
                    secondaryLabel="Pedir correções"
                    onSecondary={() =>
                      runAction(
                        operation._id,
                        `/api/units/operations/${operation._id}/command/request-changes`,
                        true,
                      )
                    }
                  />
                ))
              ) : (
                <p className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-white/30">
                  Não existem relatórios nesta fase.
                </p>
              )}
            </div>
          </ApprovalSection>
        )}

        {data.permissions.command && (
          <ApprovalSection
            title="Prontos para emissão"
            subtitle="Dupla validação concluída."
            icon={FileCheck2}
            count={readyForDocument.length}
          >
            <div className="space-y-4">
              {readyForDocument.length > 0 ? (
                readyForDocument.map((operation) => (
                  <ApprovalCard
                    key={operation._id}
                    operation={operation}
                    tone="violet"
                    isBusy={busyId === operation._id}
                    actionLabel="Emitir documento"
                    onAction={() =>
                      runAction(
                        operation._id,
                        `/api/units/operations/${operation._id}/official-document/issue`,
                      )
                    }
                  />
                ))
              ) : (
                <p className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-white/30">
                  Não existem documentos por emitir.
                </p>
              )}
            </div>
          </ApprovalSection>
        )}

        <ApprovalSection
          title="Correções solicitadas"
          subtitle="Processos devolvidos ao responsável."
          icon={FileWarning}
          count={corrections.length}
        >
          <div className="space-y-4">
            {corrections.length > 0 ? (
              corrections.map((operation) => (
                <ApprovalCard
                  key={operation._id}
                  operation={operation}
                  tone="orange"
                />
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-white/30">
                Não existem processos em correção.
              </p>
            )}
          </div>
        </ApprovalSection>

        <div className="xl:col-span-2">
          <ApprovalSection
            title="Documentos emitidos"
            subtitle="Arquivo recente de documentos oficiais."
            icon={CheckCircle2}
            count={issued.length}
          >
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {issued.length > 0 ? (
                issued.map((operation) => (
                  <ApprovalCard
                    key={operation._id}
                    operation={operation}
                    tone="emerald"
                  />
                ))
              ) : (
                <p className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-white/30 xl:col-span-2">
                  Ainda não existem documentos emitidos.
                </p>
              )}
            </div>
          </ApprovalSection>
        </div>
      </div>
    </div>
  );
}
