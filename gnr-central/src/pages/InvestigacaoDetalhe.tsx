import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useLocation, useRoute } from "wouter";
import NicIntelligencePanel from "../components/NicIntelligencePanel";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Download,
  Eye,
  FileCheck2,
  FileText,
  Fingerprint,
  Gavel,
  History,
  KeyRound,
  Link2,
  Loader2,
  Lock,
  MapPin,
  Paperclip,
  Printer,
  RefreshCw,
  Search,
  Send,
  Shield,
  ShieldCheck,
  Stamp,
  Target,
  UserCheck,
  Users,
  X,
  FileUp,
  Image as ImageIcon,
  Video,
  Music,
  Trash2,
  Plus,
  ExternalLink,
  Copy,
  Database,
} from "lucide-react";

type ApprovalRecord = {
  status: "PENDING" | "APPROVED" | "CHANGES_REQUESTED" | "REJECTED";
  actorDiscordId?: string | null;
  actorName?: string | null;
  actorRoleId?: string | null;
  note?: string;
  at?: string | null;
  code?: string | null;
};

type OperationAttachment = {
  filename: string;
  url: string;
  contentType?: string | null;
  size?: number;
};

type InvestigationEvidence = {
  _id: string;
  operationId: string;
  caseNumber?: string | null;
  title: string;
  description?: string;
  category: string;
  sourceType: "UPLOAD" | "EXTERNAL_LINK";
  originalFilename?: string | null;
  externalUrl?: string | null;
  mimeType?: string | null;
  size?: number;
  sha256?: string | null;
  addedByDiscordId: string;
  addedByName: string;
  custodyEvents?: Array<{
    type: string;
    actorName?: string | null;
    at?: string;
  }>;
  previewUrl?: string | null;
  downloadUrl?: string | null;
  createdAt: string;
};

type EvidenceResponse = {
  items: InvestigationEvidence[];
  permissions: {
    view: boolean;
    manage: boolean;
    remove: boolean;
    locked: boolean;
  };
};

type OperationParticipant = {
  discordId: string;
  name: string;
  rank?: string | null;
  role?: string | null;
  canContribute?: boolean;
};

type AuditEvent = {
  type: string;
  actorDiscordId?: string | null;
  actorName?: string | null;
  at?: string;
  metadata?: Record<string, unknown>;
};

type OperationPermissions = {
  view: boolean;
  edit: boolean;
  submitReport: boolean;
  directorApprove: boolean;
  commandApprove: boolean;
  delete: boolean;
  issueDocument: boolean;
};

type Investigation = {
  _id: string;
  caseNumber?: string | null;
  title: string;
  category: string;
  primaryUnit: string;
  supportUnits?: string[];
  isPrivateInvestigation?: boolean;
  status: string;
  reportStatus?: string;
  commanderDiscordId?: string | null;
  commanderName?: string | null;
  participants?: OperationParticipant[];
  location?: string | null;
  briefing?: string;
  objective?: string;
  result?: string;
  finalReport?: string;
  reportRejectionReason?: string;
  resultMetrics?: {
    arrests?: number;
    seizures?: number;
    injured?: number;
    seizedVehicles?: number;
    fines?: number;
  };
  attachments?: OperationAttachment[];
  reportAttachments?: OperationAttachment[];
  scheduledAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  createdByDiscordId?: string;
  createdByName?: string;
  reportSubmittedByDiscordId?: string | null;
  reportSubmittedByName?: string | null;
  reportSubmittedAt?: string | null;
  directorApproval?: ApprovalRecord;
  commandApproval?: ApprovalRecord;
  officialDocument?: {
    issued?: boolean;
    issuedAt?: string | null;
    issuedByDiscordId?: string | null;
    issuedByName?: string | null;
    verificationCode?: string | null;
    documentHash?: string | null;
    fileUrl?: string | null;
    version?: number;
  };
  auditEvents?: AuditEvent[];
  suspects?: Array<any>;
  warrants?: Array<any>;
  interrogations?: Array<any>;
  relatedInvestigations?: Array<any>;
};

type OperationResponse = {
  operation: Investigation;
  permissions: OperationPermissions;
};

type TabKey =
  | "OVERVIEW"
  | "PARTICIPANTS"
  | "PROCEDURES"
  | "INTELLIGENCE"
  | "EVIDENCE"
  | "TIMELINE"
  | "REPORT"
  | "APPROVALS"
  | "DOCUMENT";

const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Rascunho",
  SUBMITTED: "Submetida",
  APPROVED: "Aprovada",
  IN_PROGRESS: "Em investigação",
  COMPLETED: "Concluída",
  CANCELLED: "Cancelada",
  OFFICIAL_DOCUMENT_ISSUED: "Documento oficial emitido",
};

const REPORT_LABELS: Record<string, string> = {
  NOT_REQUIRED: "Sem relatório",
  DRAFT: "Relatório em rascunho",
  PENDING_DIRECTOR: "Aguarda Diretor do NIC",
  CHANGES_REQUESTED: "Correções solicitadas",
  DIRECTOR_APPROVED: "Diretor aprovou",
  PENDING_COMMAND: "Aguarda Comando-Geral",
  VALIDATED: "Dupla validação concluída",
  REJECTED: "Relatório rejeitado",
};

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data?.error || `O pedido falhou com o código ${response.status}.`,
    );
  }

  return data as T;
}

function formatDate(value?: string | null) {
  if (!value) return "Sem registo";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Sem registo";

  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatBytes(value?: number) {
  const size = Number(value || 0);

  if (!size) return "Tamanho não indicado";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function DetailCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: ReactNode;
  icon: any;
}) {
  return (
    <article className="rounded-[1.5rem] border border-white/10 bg-black/25 p-4">
      <div className="flex items-center gap-2 text-blue-300">
        <Icon className="h-4 w-4" />
        <p className="text-[9px] font-black uppercase tracking-[0.14em]">
          {label}
        </p>
      </div>

      <div className="mt-3 text-sm font-black text-white">
        {value}
      </div>
    </article>
  );
}

function Section({
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: any;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#06100d]/90 p-5 shadow-[0_24px_100px_rgba(0,0,0,0.34)]">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/10 text-blue-300">
          <Icon className="h-5 w-5" />
        </div>

        <div>
          <h2 className="text-xl font-black text-white">{title}</h2>
          {subtitle && (
            <p className="mt-1 text-xs leading-6 text-white/35">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="mt-5">{children}</div>
    </section>
  );
}

function ApprovalCard({
  title,
  approval,
  icon: Icon,
  tone,
}: {
  title: string;
  approval?: ApprovalRecord;
  icon: any;
  tone: "blue" | "yellow";
}) {
  const approved = approval?.status === "APPROVED";

  const styles =
    tone === "blue"
      ? {
          border: "border-blue-400/20",
          bg: "bg-blue-500/[0.06]",
          text: "text-blue-300",
        }
      : {
          border: "border-yellow-400/20",
          bg: "bg-yellow-500/[0.06]",
          text: "text-yellow-300",
        };

  return (
    <article
      className={`rounded-[1.6rem] border p-5 ${styles.border} ${styles.bg}`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl border ${styles.border} ${styles.text}`}
        >
          {approved ? (
            <Check className="h-5 w-5" />
          ) : (
            <Icon className="h-5 w-5" />
          )}
        </div>

        <div>
          <p className="font-black text-white">{title}</p>
          <p
            className={`mt-1 text-[9px] font-black uppercase tracking-[0.13em] ${styles.text}`}
          >
            {approval?.status || "PENDING"}
          </p>
        </div>
      </div>

      {approval?.actorName && (
        <p className="mt-5 text-base font-black text-white">
          {approval.actorName}
        </p>
      )}

      <p className="mt-1 text-xs text-white/35">
        {formatDate(approval?.at)}
      </p>

      {approval?.code && (
        <p className="mt-4 break-all rounded-xl border border-white/10 bg-black/25 px-3 py-2 font-mono text-[10px] text-white/45">
          {approval.code}
        </p>
      )}

      {approval?.note && (
        <p className="mt-4 whitespace-pre-wrap text-xs leading-6 text-white/45">
          {approval.note}
        </p>
      )}
    </article>
  );
}

export default function InvestigacaoDetalhe() {
  const [, params] = useRoute(
    "/unidades/nic/investigacoes/:id",
  );
  const [, navigate] = useLocation();

  const operationId = params?.id || "";

  const [data, setData] = useState<OperationResponse | null>(null);
  const [activeTab, setActiveTab] =
    useState<TabKey>("OVERVIEW");
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evidenceData, setEvidenceData] =
    useState<EvidenceResponse | null>(null);
  const [isEvidenceLoading, setIsEvidenceLoading] = useState(false);
  const [isEvidenceSaving, setIsEvidenceSaving] = useState(false);
  const [showEvidenceForm, setShowEvidenceForm] = useState(false);
  const [evidenceMode, setEvidenceMode] =
    useState<"UPLOAD" | "LINK">("UPLOAD");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidenceForm, setEvidenceForm] = useState({
    title: "",
    description: "",
    category: "OTHER",
    externalUrl: "",
  });

  async function loadOperation() {
    if (!operationId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiRequest<OperationResponse>(
        `/api/units/operations/${operationId}`,
      );

      setData(response);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Não foi possível carregar a investigação.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function loadEvidence() {
    if (!operationId) return;

    setIsEvidenceLoading(true);

    try {
      const response = await apiRequest<EvidenceResponse>(
        `/api/investigation-evidence/operation/${operationId}`,
      );

      setEvidenceData(response);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Não foi possível carregar as provas.",
      );
    } finally {
      setIsEvidenceLoading(false);
    }
  }

  useEffect(() => {
    void loadOperation();
    void loadEvidence();
  }, [operationId]);

  async function mutate(
    path: string,
    options: RequestInit = {},
  ) {
    setIsMutating(true);
    setError(null);

    try {
      await apiRequest(path, options);
      await loadOperation();

      window.dispatchEvent(
        new Event("operational-notifications:refresh"),
      );
    } catch (mutationError) {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : "Não foi possível concluir a ação.",
      );
    } finally {
      setIsMutating(false);
    }
  }

  async function approve(
    phase: "director" | "command",
  ) {
    const note =
      window.prompt("Observação da validação (opcional):") || "";

    await mutate(
      `/api/units/operations/${operationId}/${phase}/approve`,
      {
        method: "PATCH",
        body: JSON.stringify({ note: note.trim() }),
      },
    );
  }

  async function requestChanges(
    phase: "director" | "command",
  ) {
    const note = window.prompt(
      "Indica claramente as correções necessárias:",
    );

    if (!note || note.trim().length < 5) return;

    await mutate(
      `/api/units/operations/${operationId}/${phase}/request-changes`,
      {
        method: "PATCH",
        body: JSON.stringify({ note: note.trim() }),
      },
    );
  }

  async function issueDocument() {
    if (
      !window.confirm(
        "Emitir e bloquear este documento como oficial?",
      )
    ) {
      return;
    }

    await mutate(
      `/api/units/operations/${operationId}/official-document/issue`,
      {
        method: "PATCH",
        body: JSON.stringify({}),
      },
    );
  }

  async function submitEvidence() {
    setIsEvidenceSaving(true);
    setError(null);

    try {
      if (evidenceMode === "UPLOAD") {
        if (!evidenceFile) {
          throw new Error("Seleciona um ficheiro.");
        }

        const formData = new FormData();
        formData.append("file", evidenceFile);
        formData.append("title", evidenceForm.title.trim());
        formData.append("description", evidenceForm.description.trim());
        formData.append("category", evidenceForm.category);

        const response = await fetch(
          `${API_BASE_URL}/api/investigation-evidence/operation/${operationId}/upload`,
          {
            method: "POST",
            credentials: "include",
            body: formData,
          },
        );

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            payload?.error || "Não foi possível carregar a prova.",
          );
        }
      } else {
        await apiRequest(
          `/api/investigation-evidence/operation/${operationId}/link`,
          {
            method: "POST",
            body: JSON.stringify({
              title: evidenceForm.title.trim(),
              description: evidenceForm.description.trim(),
              category:
                evidenceForm.category === "OTHER"
                  ? "EXTERNAL_LINK"
                  : evidenceForm.category,
              externalUrl: evidenceForm.externalUrl.trim(),
            }),
          },
        );
      }

      setEvidenceFile(null);
      setEvidenceForm({
        title: "",
        description: "",
        category: "OTHER",
        externalUrl: "",
      });
      setShowEvidenceForm(false);

      await Promise.all([loadEvidence(), loadOperation()]);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Não foi possível adicionar a prova.",
      );
    } finally {
      setIsEvidenceSaving(false);
    }
  }

  async function removeEvidence(evidence: InvestigationEvidence) {
    const reason = window.prompt(
      "Indica o motivo da remoção desta prova:",
    );

    if (!reason || reason.trim().length < 5) return;

    setIsEvidenceSaving(true);

    try {
      await apiRequest(
        `/api/investigation-evidence/operation/${operationId}/${evidence._id}`,
        {
          method: "DELETE",
          body: JSON.stringify({ reason: reason.trim() }),
        },
      );

      await Promise.all([loadEvidence(), loadOperation()]);
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Não foi possível remover a prova.",
      );
    } finally {
      setIsEvidenceSaving(false);
    }
  }

  async function copyEvidenceHash(evidence: InvestigationEvidence) {
    if (!evidence.sha256) return;
    await navigator.clipboard.writeText(evidence.sha256);
  }

  const operation = data?.operation;
  const permissions = data?.permissions;

  const attachments = useMemo(
    () => [
      ...(operation?.attachments || []),
      ...(operation?.reportAttachments || []),
    ],
    [operation],
  );

  const evidenceItems = evidenceData?.items || [];
  const evidencePermissions = evidenceData?.permissions || {
    view: true,
    manage: false,
    remove: false,
    locked: false,
  };

  const tabs: Array<{
    id: TabKey;
    label: string;
    icon: any;
  }> = [
    { id: "OVERVIEW", label: "Visão geral", icon: Eye },
    { id: "PARTICIPANTS", label: "Participantes", icon: Users },
    { id: "PROCEDURES", label: "Procedimentos", icon: ClipboardCheck },
    { id: "INTELLIGENCE", label: "Intelligence", icon: Fingerprint },
    { id: "EVIDENCE", label: "Provas", icon: Paperclip },
    { id: "TIMELINE", label: "Timeline", icon: History },
    { id: "REPORT", label: "Relatório", icon: FileText },
    { id: "APPROVALS", label: "Validações", icon: ShieldCheck },
    { id: "DOCUMENT", label: "Documento", icon: FileCheck2 },
  ];

  if (isLoading) {
    return (
      <div className="flex min-h-[72vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-blue-300" />
          <p className="mt-4 text-sm font-black text-white">
            A abrir o dossier classificado
          </p>
        </div>
      </div>
    );
  }

  if (!operation || error) {
    return (
      <div className="space-y-5">
        <Link
          href="/unidades/nic"
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao NIC
        </Link>

        <section className="rounded-[2rem] border border-red-400/20 bg-red-500/10 p-7 text-red-200">
          <AlertTriangle className="h-8 w-8" />
          <h1 className="mt-4 text-2xl font-black">
            Não foi possível abrir o processo
          </h1>
          <p className="mt-3 text-sm leading-7">
            {error || "Investigação não encontrada."}
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/unidades/nic"
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[9px] font-black uppercase tracking-[0.13em] text-white/65 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao NIC
        </Link>

        <button
          type="button"
          onClick={() => void loadOperation()}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[9px] font-black uppercase tracking-[0.13em] text-white/65 hover:text-white"
        >
          <RefreshCw className="h-4 w-4" />
          Atualizar dossier
        </button>
      </div>

      <section className="relative overflow-hidden rounded-[2.8rem] border border-blue-400/20 bg-[#050b12]/95 p-7 shadow-[0_42px_170px_rgba(0,0,0,0.62)]">
        <div className="absolute inset-0 cyber-grid-soft opacity-10" />
        <div className="absolute -right-28 -top-28 h-96 w-96 rounded-full bg-blue-500/15 blur-[130px]" />

        <div className="relative">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-4xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-4 py-2 text-[9px] font-black uppercase tracking-[0.17em] text-blue-300">
                  <Fingerprint className="h-4 w-4" />
                  {operation.caseNumber || "Processo NIC"}
                </span>

                {operation.isPrivateInvestigation && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-4 py-2 text-[9px] font-black uppercase tracking-[0.17em] text-violet-300">
                    <Lock className="h-4 w-4" />
                    Investigação privada
                  </span>
                )}
              </div>

              <h1 className="mt-5 text-4xl font-black tracking-tight text-white md:text-6xl">
                {operation.title}
              </h1>

              <p className="mt-4 max-w-3xl text-sm leading-7 text-white/45">
                Dossier operacional reservado, com procedimentos,
                intervenientes, provas, relatório, validações e documento
                oficial.
              </p>
            </div>

            <div className="grid min-w-[280px] grid-cols-1 gap-3">
              <div className="rounded-2xl border border-yellow-400/20 bg-yellow-500/10 p-4">
                <p className="text-[8px] font-black uppercase tracking-[0.13em] text-yellow-300">
                  Estado operacional
                </p>
                <p className="mt-2 font-black text-white">
                  {STATUS_LABELS[operation.status] || operation.status}
                </p>
              </div>

              <div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 p-4">
                <p className="text-[8px] font-black uppercase tracking-[0.13em] text-blue-300">
                  Estado do relatório
                </p>
                <p className="mt-2 font-black text-white">
                  {REPORT_LABELS[operation.reportStatus || "NOT_REQUIRED"] ||
                    operation.reportStatus}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <DetailCard
              label="Responsável"
              value={operation.createdByName || "Por identificar"}
              icon={UserCheck}
            />
            <DetailCard
              label="Comandante"
              value={operation.commanderName || "Por definir"}
              icon={Shield}
            />
            <DetailCard
              label="Data prevista"
              value={formatDate(operation.scheduledAt)}
              icon={CalendarDays}
            />
            <DetailCard
              label="Local"
              value={operation.location || "Por definir"}
              icon={MapPin}
            />
            <DetailCard
              label="Participantes"
              value={operation.participants?.length || 0}
              icon={Users}
            />
            <DetailCard
              label="Última alteração"
              value={formatDate(operation.updatedAt)}
              icon={Clock3}
            />
          </div>
        </div>
      </section>

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setError(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2 rounded-[1.7rem] border border-white/10 bg-[#06100d]/85 p-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-[9px] font-black uppercase tracking-[0.12em] transition ${
                active
                  ? "border-blue-400/25 bg-blue-500/10 text-blue-300"
                  : "border-white/10 bg-black/20 text-white/35 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "OVERVIEW" && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_380px]">
          <Section
            title="Resumo do processo"
            subtitle="Informação principal da investigação."
            icon={Search}
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <DetailCard
                label="Categoria"
                value={operation.category}
                icon={Fingerprint}
              />
              <DetailCard
                label="Unidade principal"
                value={operation.primaryUnit}
                icon={ShieldCheck}
              />
              <DetailCard
                label="Unidades de apoio"
                value={
                  operation.supportUnits?.length
                    ? operation.supportUnits.join(", ")
                    : "Nenhuma"
                }
                icon={Users}
              />
              <DetailCard
                label="Abertura"
                value={formatDate(operation.createdAt)}
                icon={CalendarDays}
              />
            </div>
          </Section>

          <Section
            title="Ações disponíveis"
            subtitle="Dependem das tuas permissões."
            icon={Gavel}
          >
            <div className="space-y-2">
              {permissions?.directorApprove && (
                <>
                  <button
                    type="button"
                    disabled={isMutating}
                    onClick={() => void approve("director")}
                    className="w-full rounded-xl border border-blue-400/20 bg-blue-500/10 px-4 py-3 text-[9px] font-black uppercase tracking-[0.12em] text-blue-300 disabled:opacity-40"
                  >
                    Aprovar como Diretor do NIC
                  </button>
                  <button
                    type="button"
                    disabled={isMutating}
                    onClick={() => void requestChanges("director")}
                    className="w-full rounded-xl border border-orange-400/20 bg-orange-500/10 px-4 py-3 text-[9px] font-black uppercase tracking-[0.12em] text-orange-300 disabled:opacity-40"
                  >
                    Pedir correções
                  </button>
                </>
              )}

              {permissions?.commandApprove && (
                <>
                  <button
                    type="button"
                    disabled={isMutating}
                    onClick={() => void approve("command")}
                    className="w-full rounded-xl border border-yellow-400/20 bg-yellow-500/10 px-4 py-3 text-[9px] font-black uppercase tracking-[0.12em] text-yellow-300 disabled:opacity-40"
                  >
                    Validar pelo Comando-Geral
                  </button>
                  <button
                    type="button"
                    disabled={isMutating}
                    onClick={() => void requestChanges("command")}
                    className="w-full rounded-xl border border-orange-400/20 bg-orange-500/10 px-4 py-3 text-[9px] font-black uppercase tracking-[0.12em] text-orange-300 disabled:opacity-40"
                  >
                    Pedir correções
                  </button>
                </>
              )}

              {permissions?.issueDocument &&
                !operation.officialDocument?.issued && (
                  <button
                    type="button"
                    disabled={isMutating}
                    onClick={() => void issueDocument()}
                    className="w-full rounded-xl border border-violet-400/20 bg-violet-500/10 px-4 py-3 text-[9px] font-black uppercase tracking-[0.12em] text-violet-300 disabled:opacity-40"
                  >
                    Emitir documento oficial
                  </button>
                )}

              {!permissions?.directorApprove &&
                !permissions?.commandApprove &&
                !permissions?.issueDocument && (
                  <p className="rounded-xl border border-white/10 bg-black/20 p-4 text-xs leading-6 text-white/35">
                    Neste momento não tens ações pendentes neste processo.
                  </p>
                )}
            </div>
          </Section>
        </div>
      )}

      {activeTab === "PARTICIPANTS" && (
        <Section
          title="Participantes autorizados"
          subtitle="Apenas os intervenientes adicionados recebem acesso ao processo."
          icon={Users}
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {(operation.participants || []).length > 0 ? (
              (operation.participants || []).map((participant) => (
                <article
                  key={participant.discordId}
                  className="rounded-[1.5rem] border border-white/10 bg-black/25 p-4"
                >
                  <p className="font-black text-white">
                    {participant.name}
                  </p>
                  <p className="mt-1 text-[9px] font-black uppercase tracking-[0.12em] text-blue-300">
                    {participant.rank || "Operacional"}
                  </p>
                  <p className="mt-3 text-xs text-white/35">
                    {participant.role || "Participante"}
                  </p>
                  <p className="mt-1 text-[10px] text-white/25">
                    {participant.canContribute
                      ? "Autorizado a contribuir"
                      : "Acesso de consulta"}
                  </p>
                </article>
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-white/30 md:col-span-2 xl:col-span-3">
                Não existem participantes adicionais.
              </p>
            )}
          </div>
        </Section>
      )}

      {activeTab === "PROCEDURES" && (
        <div className="space-y-5">
          <Section
            title="Briefing e procedimentos"
            subtitle="Planeamento e procedimentos definidos para a investigação."
            icon={ClipboardCheck}
          >
            <p className="whitespace-pre-wrap text-sm leading-8 text-white/55">
              {operation.briefing || "Sem briefing registado."}
            </p>
          </Section>

          <Section
            title="Objetivo operacional"
            subtitle="Finalidade e resultado pretendido."
            icon={Target}
          >
            <p className="whitespace-pre-wrap text-sm leading-8 text-white/55">
              {operation.objective || "Sem objetivo registado."}
            </p>
          </Section>
        </div>
      )}

      {activeTab === "INTELLIGENCE" && (
        <NicIntelligencePanel
          operationId={operationId}
          suspects={operation.suspects || []}
          warrants={operation.warrants || []}
          interrogations={operation.interrogations || []}
          relatedInvestigations={operation.relatedInvestigations || []}
          canManage={Boolean(permissions?.edit)}
        />
      )}

      {activeTab === "EVIDENCE" && (
        <div className="space-y-5">
          <Section
            title="Cofre de provas"
            subtitle="Ficheiros, ligações e cadeia de custódia associados ao processo."
            icon={Database}
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-black text-white">
                  {evidenceItems.length} prova
                  {evidenceItems.length === 1 ? "" : "s"} registada
                  {evidenceItems.length === 1 ? "" : "s"}
                </p>
                <p className="mt-1 text-xs text-white/30">
                  {evidencePermissions.locked
                    ? "Cofre bloqueado após emissão oficial."
                    : "Visualizações, downloads e remoções ficam registados."}
                </p>
              </div>

              {evidencePermissions.manage &&
                !evidencePermissions.locked && (
                  <button
                    type="button"
                    onClick={() => setShowEvidenceForm((current) => !current)}
                    className="inline-flex items-center gap-2 rounded-xl border border-blue-400/20 bg-blue-500/10 px-4 py-3 text-[9px] font-black uppercase tracking-[0.12em] text-blue-300"
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar prova
                  </button>
                )}
            </div>

            {showEvidenceForm && (
              <div className="mt-5 rounded-[1.7rem] border border-blue-400/20 bg-blue-500/[0.05] p-5">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setEvidenceMode("UPLOAD")}
                    className={`rounded-xl border px-4 py-2 text-[8px] font-black uppercase tracking-[0.12em] ${
                      evidenceMode === "UPLOAD"
                        ? "border-blue-400/25 bg-blue-500/10 text-blue-300"
                        : "border-white/10 bg-black/20 text-white/35"
                    }`}
                  >
                    Carregar ficheiro
                  </button>

                  <button
                    type="button"
                    onClick={() => setEvidenceMode("LINK")}
                    className={`rounded-xl border px-4 py-2 text-[8px] font-black uppercase tracking-[0.12em] ${
                      evidenceMode === "LINK"
                        ? "border-blue-400/25 bg-blue-500/10 text-blue-300"
                        : "border-white/10 bg-black/20 text-white/35"
                    }`}
                  >
                    Ligação externa
                  </button>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <input
                    value={evidenceForm.title}
                    onChange={(event) =>
                      setEvidenceForm((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    placeholder="Título da prova"
                    className="h-12 rounded-xl border border-white/10 bg-black/30 px-4 text-sm text-white outline-none"
                  />

                  <select
                    value={evidenceForm.category}
                    onChange={(event) =>
                      setEvidenceForm((current) => ({
                        ...current,
                        category: event.target.value,
                      }))
                    }
                    className="h-12 rounded-xl border border-white/10 bg-black/30 px-4 text-sm text-white outline-none"
                  >
                    <option value="IMAGE">Imagem</option>
                    <option value="VIDEO">Vídeo</option>
                    <option value="AUDIO">Áudio</option>
                    <option value="PDF">PDF</option>
                    <option value="DOCUMENT">Documento</option>
                    <option value="TESTIMONY">Testemunho</option>
                    <option value="INTERROGATION">Interrogatório</option>
                    <option value="SEIZURE">Apreensão</option>
                    <option value="LOCATION">Localização</option>
                    <option value="EXTERNAL_LINK">Ligação externa</option>
                    <option value="OTHER">Outro</option>
                  </select>
                </div>

                <textarea
                  value={evidenceForm.description}
                  onChange={(event) =>
                    setEvidenceForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  rows={4}
                  placeholder="Descrição e relevância da prova..."
                  className="mt-4 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                />

                {evidenceMode === "UPLOAD" ? (
                  <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-blue-400/25 bg-black/20 p-8 text-center">
                    <FileUp className="h-9 w-9 text-blue-300" />
                    <span className="mt-3 font-black text-white">
                      {evidenceFile
                        ? evidenceFile.name
                        : "Selecionar ficheiro"}
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(event) =>
                        setEvidenceFile(
                          event.target.files?.[0] || null,
                        )
                      }
                    />
                  </label>
                ) : (
                  <input
                    value={evidenceForm.externalUrl}
                    onChange={(event) =>
                      setEvidenceForm((current) => ({
                        ...current,
                        externalUrl: event.target.value,
                      }))
                    }
                    placeholder="https://..."
                    className="mt-4 h-12 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-sm text-white outline-none"
                  />
                )}

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void submitEvidence()}
                    disabled={
                      isEvidenceSaving ||
                      (evidenceMode === "UPLOAD"
                        ? !evidenceFile
                        : !/^https?:\/\//i.test(
                            evidenceForm.externalUrl,
                          ))
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-400 px-5 py-3 text-[9px] font-black uppercase tracking-[0.12em] text-black disabled:opacity-40"
                  >
                    {isEvidenceSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileUp className="h-4 w-4" />
                    )}
                    Guardar no cofre
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowEvidenceForm(false)}
                    className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-[9px] font-black uppercase tracking-[0.12em] text-white/45"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            <div className="mt-5">
              {isEvidenceLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-300" />
                </div>
              ) : evidenceItems.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  {evidenceItems.map((evidence) => {
                    const EvidenceIcon =
                      evidence.category === "IMAGE"
                        ? ImageIcon
                        : evidence.category === "VIDEO"
                          ? Video
                          : evidence.category === "AUDIO"
                            ? Music
                            : FileText;

                    return (
                      <article
                        key={evidence._id}
                        className="rounded-[1.6rem] border border-white/10 bg-black/25 p-5"
                      >
                        <div className="flex items-start gap-4">
                          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/10 text-blue-300">
                            <EvidenceIcon className="h-5 w-5" />
                          </span>

                          <div className="min-w-0 flex-1">
                            <p className="truncate font-black text-white">
                              {evidence.title}
                            </p>
                            <p className="mt-1 text-[10px] text-white/30">
                              {evidence.originalFilename ||
                                evidence.externalUrl ||
                                "Registo interno"}{" "}
                              · {formatBytes(evidence.size)}
                            </p>
                          </div>
                        </div>

                        {evidence.description && (
                          <p className="mt-4 text-xs leading-6 text-white/45">
                            {evidence.description}
                          </p>
                        )}

                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <DetailCard
                            label="Adicionada por"
                            value={evidence.addedByName}
                            icon={UserCheck}
                          />
                          <DetailCard
                            label="Data"
                            value={formatDate(evidence.createdAt)}
                            icon={CalendarDays}
                          />
                        </div>

                        {evidence.sha256 && (
                          <div className="mt-4 rounded-xl border border-violet-400/20 bg-violet-500/10 p-3">
                            <div className="flex items-center justify-between gap-3">
                              <p className="truncate font-mono text-[9px] text-white/40">
                                {evidence.sha256}
                              </p>
                              <button
                                type="button"
                                onClick={() =>
                                  void copyEvidenceHash(evidence)
                                }
                                className="flex h-9 w-9 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-500/10 text-violet-300"
                              >
                                <Copy className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="mt-4 flex flex-wrap gap-2">
                          {evidence.previewUrl && (
                            <a
                              href={`${API_BASE_URL}${evidence.previewUrl}`}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-xl border border-blue-400/20 bg-blue-500/10 px-4 py-2 text-[8px] font-black uppercase text-blue-300"
                            >
                              Pré-visualizar
                            </a>
                          )}

                          {evidence.downloadUrl && (
                            <a
                              href={`${API_BASE_URL}${evidence.downloadUrl}`}
                              className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-[8px] font-black uppercase text-emerald-300"
                            >
                              Descarregar
                            </a>
                          )}

                          {evidencePermissions.remove &&
                            !evidencePermissions.locked && (
                              <button
                                type="button"
                                onClick={() =>
                                  void removeEvidence(evidence)
                                }
                                className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-2 text-[8px] font-black uppercase text-red-300"
                              >
                                Remover
                              </button>
                            )}
                        </div>

                        <details className="mt-4 rounded-xl border border-white/10 bg-black/20">
                          <summary className="cursor-pointer px-4 py-3 text-[8px] font-black uppercase tracking-[0.12em] text-white/40">
                            Cadeia de custódia ·{" "}
                            {evidence.custodyEvents?.length || 0}
                          </summary>

                          <div className="space-y-2 border-t border-white/10 p-3">
                            {(evidence.custodyEvents || [])
                              .slice()
                              .reverse()
                              .map((event, index) => (
                                <div
                                  key={`${event.type}-${event.at}-${index}`}
                                  className="rounded-lg border border-white/10 bg-white/[0.025] p-3"
                                >
                                  <p className="text-[9px] font-black uppercase text-white">
                                    {event.type}
                                  </p>
                                  <p className="mt-1 text-[10px] text-white/30">
                                    {event.actorName || "Sistema"} ·{" "}
                                    {formatDate(event.at)}
                                  </p>
                                </div>
                              ))}
                          </div>
                        </details>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-[1.6rem] border border-dashed border-white/10 p-10 text-center">
                  <Database className="mx-auto h-10 w-10 text-white/20" />
                  <p className="mt-4 font-black text-white">
                    Cofre sem provas
                  </p>
                </div>
              )}
            </div>
          </Section>

          {attachments.length > 0 && (
            <Section
              title="Anexos antigos"
              subtitle="Ligações guardadas anteriormente."
              icon={Paperclip}
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {attachments.map((attachment, index) => (
                  <a
                    key={`${attachment.url}-${index}`}
                    href={attachment.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-4 rounded-[1.4rem] border border-white/10 bg-black/25 p-4"
                  >
                    <FileText className="h-5 w-5 text-blue-300" />
                    <span className="min-w-0 flex-1 truncate font-black text-white">
                      {attachment.filename}
                    </span>
                    <ExternalLink className="h-4 w-4 text-white/20" />
                  </a>
                ))}
              </div>
            </Section>
          )}
        </div>
      )}

      {activeTab === "TIMELINE" && (
        <Section
          title="Timeline do processo"
          subtitle="Histórico cronológico das ações registadas."
          icon={History}
        >
          <div className="space-y-3">
            {(operation.auditEvents || []).length > 0 ? (
              (operation.auditEvents || [])
                .slice()
                .reverse()
                .map((event, index) => (
                  <article
                    key={`${event.type}-${event.at}-${index}`}
                    className="flex gap-4 rounded-[1.4rem] border border-white/10 bg-black/25 p-4"
                  >
                    <span className="mt-1 h-3 w-3 shrink-0 rounded-full bg-blue-400 shadow-[0_0_14px_rgba(96,165,250,0.8)]" />

                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.12em] text-white">
                        {event.type.replaceAll("_", " ")}
                      </p>
                      <p className="mt-1 text-xs text-white/35">
                        {event.actorName || "Sistema"} ·{" "}
                        {formatDate(event.at)}
                      </p>
                    </div>
                  </article>
                ))
            ) : (
              <p className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-white/30">
                Não existe histórico disponível.
              </p>
            )}
          </div>
        </Section>
      )}

      {activeTab === "REPORT" && (
        <div className="space-y-5">
          <Section
            title="Resultado resumido"
            subtitle="Síntese da conclusão operacional."
            icon={CheckCircle2}
          >
            <p className="whitespace-pre-wrap text-sm leading-8 text-white/55">
              {operation.result || "Sem resultado registado."}
            </p>
          </Section>

          <Section
            title="Relatório integral"
            subtitle="Conteúdo submetido pelo responsável."
            icon={FileText}
          >
            <p className="whitespace-pre-wrap text-sm leading-8 text-white/55">
              {operation.finalReport || "Sem relatório submetido."}
            </p>
          </Section>

          {operation.reportRejectionReason && (
            <section className="rounded-[2rem] border border-orange-400/20 bg-orange-500/10 p-5">
              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-orange-300">
                Correções solicitadas
              </p>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-8 text-orange-100/70">
                {operation.reportRejectionReason}
              </p>
            </section>
          )}

          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {[
              ["Detenções", operation.resultMetrics?.arrests || 0],
              ["Apreensões", operation.resultMetrics?.seizures || 0],
              ["Feridos", operation.resultMetrics?.injured || 0],
              ["Viaturas", operation.resultMetrics?.seizedVehicles || 0],
              ["Coimas", operation.resultMetrics?.fines || 0],
            ].map(([label, value]) => (
              <article
                key={String(label)}
                className="rounded-2xl border border-white/10 bg-black/25 p-4"
              >
                <p className="text-[8px] font-black uppercase tracking-[0.12em] text-white/30">
                  {label}
                </p>
                <p className="mt-2 text-2xl font-black text-white">
                  {value}
                </p>
              </article>
            ))}
          </div>
        </div>
      )}

      {activeTab === "APPROVALS" && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <ApprovalCard
            title="Diretor do NIC"
            approval={operation.directorApproval}
            icon={UserCheck}
            tone="blue"
          />
          <ApprovalCard
            title="Comando-Geral"
            approval={operation.commandApproval}
            icon={Stamp}
            tone="yellow"
          />
        </div>
      )}

      {activeTab === "DOCUMENT" && (
        <Section
          title="Documento oficial"
          subtitle="Autenticidade, emissão e verificação interna."
          icon={FileCheck2}
        >
          {operation.officialDocument?.issued ? (
            <div className="space-y-5">
              <div className="rounded-[1.6rem] border border-emerald-400/20 bg-emerald-500/[0.06] p-5">
                <div className="flex items-center gap-3 text-emerald-300">
                  <BadgeCheck className="h-6 w-6" />
                  <p className="font-black">
                    Documento oficial emitido e bloqueado
                  </p>
                </div>

                <p className="mt-4 text-sm text-white/45">
                  Emitido por{" "}
                  <strong className="text-white">
                    {operation.officialDocument.issuedByName ||
                      "Comando-Geral"}
                  </strong>{" "}
                  em {formatDate(operation.officialDocument.issuedAt)}.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <DetailCard
                  label="Código de verificação"
                  value={
                    <span className="break-all font-mono">
                      {operation.officialDocument.verificationCode ||
                        "Sem código"}
                    </span>
                  }
                  icon={KeyRound}
                />
                <DetailCard
                  label="Versão"
                  value={operation.officialDocument.version || 1}
                  icon={FileCheck2}
                />
              </div>

              <div className="rounded-[1.5rem] border border-violet-400/20 bg-violet-500/10 p-5">
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-violet-300">
                  Hash SHA-256
                </p>
                <p className="mt-3 break-all font-mono text-[10px] leading-6 text-white/45">
                  {operation.officialDocument.documentHash ||
                    "Hash não disponível."}
                </p>
              </div>

              {operation.officialDocument.fileUrl && (
                <a
                  href={operation.officialDocument.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-violet-400/20 bg-violet-500/10 px-4 py-3 text-[9px] font-black uppercase tracking-[0.12em] text-violet-300"
                >
                  <Download className="h-4 w-4" />
                  Descarregar documento
                </a>
              )}
            </div>
          ) : (
            <div className="rounded-[1.6rem] border border-dashed border-white/10 p-8 text-center">
              <FileCheck2 className="mx-auto h-10 w-10 text-white/20" />
              <p className="mt-4 font-black text-white">
                Documento ainda não emitido
              </p>
              <p className="mt-2 text-sm text-white/30">
                A emissão fica disponível depois das duas validações.
              </p>

              {permissions?.issueDocument && (
                <button
                  type="button"
                  disabled={isMutating}
                  onClick={() => void issueDocument()}
                  className="mt-5 rounded-xl border border-violet-400/20 bg-violet-500/10 px-5 py-3 text-[9px] font-black uppercase tracking-[0.12em] text-violet-300 disabled:opacity-40"
                >
                  Emitir documento oficial
                </button>
              )}
            </div>
          )}
        </Section>
      )}
    </div>
  );
}
