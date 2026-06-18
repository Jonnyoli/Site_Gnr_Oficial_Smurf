import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import {
  AlertTriangle,
  Archive,
  BadgeCheck,
  Ban,
  CheckCircle2,
  FileCheck2,
  Fingerprint,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";

type ArchiveItem = {
  _id: string;
  valid: boolean;
  revoked: boolean;
  caseNumber?: string | null;
  title: string;
  unit: string;
  category: string;
  issuedAt?: string | null;
  issuedByName?: string | null;
  verificationCode?: string | null;
  version: number;
  documentHash?: string | null;
  hashMatches: boolean;
  responsibleName?: string | null;
  revokedAt?: string | null;
  revocationReason?: string;
};

type ArchiveResponse = {
  items: ArchiveItem[];
  counts: {
    total: number;
    active: number;
    revoked: number;
  };
  permissions: {
    command: boolean;
    director: boolean;
    revoke: boolean;
  };
};

const EMPTY: ArchiveResponse = {
  items: [],
  counts: {
    total: 0,
    active: 0,
    revoked: 0,
  },
  permissions: {
    command: false,
    director: false,
    revoke: false,
  },
};

function formatDate(value?: string | null) {
  if (!value) return "Sem data";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Sem data";

  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export default function DocumentosOficiais() {
  const [data, setData] =
    useState<ArchiveResponse>(EMPTY);
  const [search, setSearch] = useState("");
  const [status, setStatus] =
    useState<"ALL" | "ACTIVE" | "REVOKED">("ALL");
  const [isLoading, setIsLoading] =
    useState(true);
  const [busyId, setBusyId] =
    useState<string | null>(null);
  const [error, setError] =
    useState<string | null>(null);

  async function loadArchive() {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();

      if (search.trim()) {
        params.set("search", search.trim());
      }

      params.set("status", status);

      const response = await fetch(
        `/api/official-documents/archive?${params.toString()}`,
        {
          credentials: "include",
        },
      );

      const payload = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.error ||
            "Não foi possível carregar o arquivo.",
        );
      }

      setData(payload);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Não foi possível carregar o arquivo.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(
      () => void loadArchive(),
      250,
    );

    return () => window.clearTimeout(timer);
  }, [search, status]);

  async function revokeDocument(item: ArchiveItem) {
    const reason = window.prompt(
      `Motivo para revogar ${item.verificationCode || item.caseNumber}:`,
    );

    if (!reason || reason.trim().length < 8) {
      return;
    }

    setBusyId(item._id);
    setError(null);

    try {
      const response = await fetch(
        `/api/official-documents/${item._id}/revoke`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reason: reason.trim(),
          }),
        },
      );

      const payload = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.error ||
            "Não foi possível revogar o documento.",
        );
      }

      await loadArchive();
    } catch (revokeError) {
      setError(
        revokeError instanceof Error
          ? revokeError.message
          : "Não foi possível revogar o documento.",
      );
    } finally {
      setBusyId(null);
    }
  }

  const filtered = useMemo(
    () => data.items,
    [data.items],
  );

  return (
    <div className="space-y-6 pb-12">
      <section className="relative overflow-hidden rounded-[2.8rem] border border-primary/15 bg-[#06100c]/95 p-8 shadow-[0_40px_150px_rgba(0,0,0,0.5)]">
        <div className="absolute inset-0 cyber-grid-soft opacity-10" />
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-primary/10 blur-[130px]" />

        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-primary">
              <Archive className="h-4 w-4" />
              Arquivo institucional
            </div>

            <h1 className="mt-5 text-4xl font-black tracking-tight text-white md:text-6xl">
              Documentos oficiais
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-white/45">
              Arquivo central de documentos emitidos, códigos de
              verificação, versões, integridade e revogações.
            </p>
          </div>

          <Link
            href="/verificar-documento"
            className="inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-5 py-3 text-[9px] font-black uppercase tracking-[0.12em] text-primary"
          >
            <Fingerprint className="h-4 w-4" />
            Verificar código
          </Link>
        </div>
      </section>

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          ["Total emitidos", data.counts.total, FileCheck2],
          ["Ativos", data.counts.active, CheckCircle2],
          ["Revogados", data.counts.revoked, Ban],
        ].map(([label, value, Icon]: any) => (
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

      <section className="flex flex-col gap-3 rounded-[1.8rem] border border-white/10 bg-[#06100c]/85 p-4 lg:flex-row">
        <div className="flex h-12 flex-1 items-center rounded-xl border border-white/10 bg-black/25 px-4">
          <Search className="mr-3 h-4 w-4 text-white/30" />
          <input
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Pesquisar processo, responsável, emissor ou código..."
            className="h-full flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/25"
          />
        </div>

        <select
          value={status}
          onChange={(event) =>
            setStatus(
              event.target.value as
                | "ALL"
                | "ACTIVE"
                | "REVOKED",
            )
          }
          className="h-12 rounded-xl border border-white/10 bg-black/25 px-4 text-sm text-white outline-none"
        >
          <option value="ALL">Todos</option>
          <option value="ACTIVE">Ativos</option>
          <option value="REVOKED">Revogados</option>
        </select>

        <button
          type="button"
          onClick={() => void loadArchive()}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-[9px] font-black uppercase tracking-[0.12em] text-white/55"
        >
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </button>
      </section>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      ) : filtered.length > 0 ? (
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {filtered.map((item) => (
            <article
              key={item._id}
              className={`rounded-[1.9rem] border p-5 ${
                item.revoked
                  ? "border-red-400/20 bg-red-500/[0.06]"
                  : "border-emerald-400/20 bg-emerald-500/[0.05]"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-3 py-1 text-[8px] font-black uppercase tracking-[0.12em] ${
                        item.revoked
                          ? "border-red-400/20 bg-red-500/10 text-red-300"
                          : "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
                      }`}
                    >
                      {item.revoked
                        ? "Revogado"
                        : "Ativo"}
                    </span>

                    <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-white/40">
                      Versão {item.version}
                    </span>
                  </div>

                  <h2 className="mt-3 text-xl font-black text-white">
                    {item.caseNumber || item.title}
                  </h2>

                  <p className="mt-1 truncate text-xs text-white/35">
                    {item.title}
                  </p>
                </div>

                {item.revoked ? (
                  <Ban className="h-6 w-6 text-red-300" />
                ) : (
                  <BadgeCheck className="h-6 w-6 text-emerald-300" />
                )}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <p className="text-[8px] font-black uppercase tracking-[0.1em] text-white/25">
                    Código
                  </p>
                  <p className="mt-1 truncate font-mono text-xs font-black text-white">
                    {item.verificationCode || "—"}
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <p className="text-[8px] font-black uppercase tracking-[0.1em] text-white/25">
                    Emissão
                  </p>
                  <p className="mt-1 truncate text-xs font-black text-white">
                    {formatDate(item.issuedAt)}
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <p className="text-[8px] font-black uppercase tracking-[0.1em] text-white/25">
                    Responsável
                  </p>
                  <p className="mt-1 truncate text-xs font-black text-white">
                    {item.responsibleName || "—"}
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <p className="text-[8px] font-black uppercase tracking-[0.1em] text-white/25">
                    Integridade
                  </p>
                  <p
                    className={`mt-1 truncate text-xs font-black ${
                      item.hashMatches
                        ? "text-emerald-300"
                        : "text-red-300"
                    }`}
                  >
                    {item.hashMatches
                      ? "Confirmada"
                      : "Divergente"}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2 border-t border-white/10 pt-4">
                <Link
                  href={`/unidades/nic/investigacoes/${item._id}`}
                  className="rounded-xl border border-blue-400/20 bg-blue-500/10 px-4 py-2 text-[8px] font-black uppercase tracking-[0.11em] text-blue-300"
                >
                  Abrir dossier
                </Link>

                <Link
                  href={`/verificar-documento?code=${encodeURIComponent(
                    item.verificationCode || "",
                  )}`}
                  className="rounded-xl border border-violet-400/20 bg-violet-500/10 px-4 py-2 text-[8px] font-black uppercase tracking-[0.11em] text-violet-300"
                >
                  Verificar
                </Link>

                {data.permissions.revoke &&
                  !item.revoked && (
                    <button
                      type="button"
                      disabled={busyId === item._id}
                      onClick={() =>
                        void revokeDocument(item)
                      }
                      className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-2 text-[8px] font-black uppercase tracking-[0.11em] text-red-300 disabled:opacity-40"
                    >
                      Revogar
                    </button>
                  )}
              </div>
            </article>
          ))}
        </section>
      ) : (
        <div className="rounded-[2rem] border border-dashed border-white/10 p-12 text-center">
          <Archive className="mx-auto h-10 w-10 text-white/20" />
          <p className="mt-4 font-black text-white">
            Nenhum documento encontrado
          </p>
        </div>
      )}
    </div>
  );
}
