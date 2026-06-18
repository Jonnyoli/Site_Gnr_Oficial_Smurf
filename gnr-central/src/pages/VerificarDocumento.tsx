import { useState, type FormEvent } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  FileCheck2,
  Fingerprint,
  Hash,
  Loader2,
  Search,
  ShieldCheck,
  Stamp,
  XCircle,
} from "lucide-react";

type VerificationDocument = {
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
  currentHash?: string | null;
  hashMatches: boolean;
  directorApproval: {
    status: string;
    actorName?: string | null;
    at?: string | null;
    code?: string | null;
  };
  commandApproval: {
    status: string;
    actorName?: string | null;
    at?: string | null;
    code?: string | null;
  };
  revokedAt?: string | null;
  revokedByName?: string | null;
  revocationReason?: string;
};

type VerificationResponse = {
  result: "VALID" | "REVOKED";
  document: VerificationDocument;
};

function formatDate(value?: string | null) {
  if (!value) return "Sem registo";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Sem registo";

  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(date);
}

export default function VerificarDocumento() {
  const [code, setCode] = useState("");
  const [result, setResult] =
    useState<VerificationResponse | null>(null);
  const [error, setError] =
    useState<string | null>(null);
  const [isLoading, setIsLoading] =
    useState(false);

  async function verify(event: FormEvent) {
    event.preventDefault();

    const verificationCode = code
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "");

    if (verificationCode.length < 6) {
      setError(
        "Introduz um código de verificação válido.",
      );
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(
        "/api/official-documents/verify",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            verificationCode,
          }),
        },
      );

      const payload = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.error ||
            "Não foi possível verificar o documento.",
        );
      }

      setResult(payload);
    } catch (verifyError) {
      setError(
        verifyError instanceof Error
          ? verifyError.message
          : "Não foi possível verificar o documento.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  const document = result?.document;

  return (
    <div className="space-y-6 pb-12">
      <section className="relative overflow-hidden rounded-[2.8rem] border border-primary/15 bg-[#06100c]/95 p-8 shadow-[0_40px_150px_rgba(0,0,0,0.5)]">
        <div className="absolute inset-0 cyber-grid-soft opacity-10" />
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-primary/10 blur-[130px]" />

        <div className="relative max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-primary">
            <ShieldCheck className="h-4 w-4" />
            Autenticidade documental
          </div>

          <h1 className="mt-5 text-4xl font-black tracking-tight text-white md:text-6xl">
            Verificar documento oficial
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/45">
            Introduz o código inscrito no documento para confirmar
            a emissão, as validações institucionais, a versão e o
            respetivo hash.
          </p>
        </div>
      </section>

      <form
        onSubmit={verify}
        className="rounded-[2rem] border border-white/10 bg-[#06100d]/90 p-5"
      >
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="flex h-14 flex-1 items-center rounded-2xl border border-white/10 bg-black/25 px-4 focus-within:border-primary/30">
            <Fingerprint className="mr-3 h-5 w-5 text-primary" />
            <input
              value={code}
              onChange={(event) =>
                setCode(event.target.value)
              }
              placeholder="DOC-2026-XXXXXXXXXX"
              className="h-full flex-1 bg-transparent font-mono text-sm uppercase text-white outline-none placeholder:text-white/20"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-[10px] font-black uppercase tracking-[0.14em] text-primary-foreground disabled:opacity-40"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Verificar
          </button>
        </div>
      </form>

      {error && (
        <section className="rounded-[2rem] border border-red-400/20 bg-red-500/10 p-6">
          <div className="flex items-start gap-4">
            <XCircle className="mt-0.5 h-7 w-7 shrink-0 text-red-300" />
            <div>
              <h2 className="text-xl font-black text-white">
                Documento não confirmado
              </h2>
              <p className="mt-2 text-sm leading-7 text-red-100/70">
                {error}
              </p>
            </div>
          </div>
        </section>
      )}

      {document && (
        <section
          className={`rounded-[2.4rem] border p-6 ${
            document.revoked
              ? "border-red-400/25 bg-red-500/[0.07]"
              : "border-emerald-400/25 bg-emerald-500/[0.06]"
          }`}
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <span
                className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border ${
                  document.revoked
                    ? "border-red-400/25 bg-red-500/10 text-red-300"
                    : "border-emerald-400/25 bg-emerald-500/10 text-emerald-300"
                }`}
              >
                {document.revoked ? (
                  <AlertTriangle className="h-8 w-8" />
                ) : (
                  <BadgeCheck className="h-8 w-8" />
                )}
              </span>

              <div>
                <p
                  className={`text-[10px] font-black uppercase tracking-[0.18em] ${
                    document.revoked
                      ? "text-red-300"
                      : "text-emerald-300"
                  }`}
                >
                  {document.revoked
                    ? "Documento revogado"
                    : "Documento autêntico"}
                </p>

                <h2 className="mt-2 text-3xl font-black text-white">
                  {document.caseNumber ||
                    document.title}
                </h2>

                <p className="mt-2 text-sm text-white/45">
                  {document.title}
                </p>
              </div>
            </div>

            <span className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 font-mono text-xs font-black text-white">
              Versão {document.version}
            </span>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              ["Unidade", document.unit],
              ["Categoria", document.category],
              ["Emitido em", formatDate(document.issuedAt)],
              ["Emitido por", document.issuedByName || "Comando-Geral"],
            ].map(([label, value]) => (
              <article
                key={String(label)}
                className="rounded-2xl border border-white/10 bg-black/20 p-4"
              >
                <p className="text-[8px] font-black uppercase tracking-[0.13em] text-white/30">
                  {label}
                </p>
                <p className="mt-2 text-sm font-black text-white">
                  {value}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <article className="rounded-[1.6rem] border border-blue-400/20 bg-blue-500/[0.06] p-5">
              <div className="flex items-center gap-3 text-blue-300">
                <ShieldCheck className="h-5 w-5" />
                <p className="text-[9px] font-black uppercase tracking-[0.14em]">
                  Diretor do NIC
                </p>
              </div>
              <p className="mt-4 font-black text-white">
                {document.directorApproval.actorName ||
                  "Não identificado"}
              </p>
              <p className="mt-1 text-xs text-white/35">
                {formatDate(
                  document.directorApproval.at,
                )}
              </p>
            </article>

            <article className="rounded-[1.6rem] border border-yellow-400/20 bg-yellow-500/[0.06] p-5">
              <div className="flex items-center gap-3 text-yellow-300">
                <Stamp className="h-5 w-5" />
                <p className="text-[9px] font-black uppercase tracking-[0.14em]">
                  Comando-Geral
                </p>
              </div>
              <p className="mt-4 font-black text-white">
                {document.commandApproval.actorName ||
                  "Não identificado"}
              </p>
              <p className="mt-1 text-xs text-white/35">
                {formatDate(
                  document.commandApproval.at,
                )}
              </p>
            </article>
          </div>

          <div className="mt-6 rounded-[1.6rem] border border-violet-400/20 bg-violet-500/10 p-5">
            <div className="flex items-center gap-2 text-violet-300">
              <Hash className="h-5 w-5" />
              <p className="text-[9px] font-black uppercase tracking-[0.14em]">
                Integridade SHA-256
              </p>
            </div>

            <p className="mt-4 break-all font-mono text-[10px] leading-6 text-white/45">
              {document.documentHash ||
                "Hash não disponível."}
            </p>

            <div className="mt-4 flex items-center gap-2">
              {document.hashMatches ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                  <span className="text-xs font-black text-emerald-300">
                    Hash confirmado
                  </span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 text-red-300" />
                  <span className="text-xs font-black text-red-300">
                    O hash atual não corresponde ao hash emitido
                  </span>
                </>
              )}
            </div>
          </div>

          {document.revoked && (
            <div className="mt-6 rounded-[1.6rem] border border-red-400/20 bg-red-500/10 p-5">
              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-red-300">
                Motivo da revogação
              </p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-red-100/70">
                {document.revocationReason ||
                  "Motivo não registado."}
              </p>
              <p className="mt-3 text-xs text-red-100/40">
                {document.revokedByName || "Comando-Geral"} ·{" "}
                {formatDate(document.revokedAt)}
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
