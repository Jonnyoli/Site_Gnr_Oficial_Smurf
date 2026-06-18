import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Copy,
  Download,
  FileCheck2,
  FileText,
  Loader2,
  Printer,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

async function request(path: string, options: RequestInit = {}) {
  const response = await fetch(path, {
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
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
    const error = new Error(
      payload?.error || `O pedido falhou com o código ${response.status}.`,
    ) as Error & { details?: string[] };

    error.details = payload?.details || [];
    throw error;
  }

  return payload;
}

export default function CSOAta() {
  const [, params] = useRoute(
    "/departamentos/cso/reunioes/:meetingId/ata",
  );

  const meetingId = String(params?.meetingId || "");

  const [preview, setPreview] = useState<any>(null);
  const [document, setDocument] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [details, setDetails] = useState<string[]>([]);

  async function load() {
    setLoading(true);
    setError("");
    setDetails([]);

    try {
      const [previewResult, latestResult] = await Promise.allSettled([
        request(`/api/cso-minutes/meetings/${meetingId}/preview`),
        request(`/api/cso-minutes/meetings/${meetingId}/latest`),
      ]);

      if (previewResult.status === "fulfilled") {
        setPreview(previewResult.value);
      } else {
        throw previewResult.reason;
      }

      if (latestResult.status === "fulfilled") {
        setDocument(latestResult.value?.document || null);
      } else {
        setDocument(null);
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Não foi possível preparar a ata.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (meetingId) void load();
  }, [meetingId]);

  async function issue() {
    setWorking(true);
    setError("");
    setDetails([]);

    try {
      const result = await request(
        `/api/cso-minutes/meetings/${meetingId}/issue`,
        { method: "POST" },
      );

      setDocument(result.document);
      await load();
    } catch (issueError: any) {
      setError(
        issueError instanceof Error
          ? issueError.message
          : "Não foi possível emitir a ata.",
      );
      setDetails(issueError?.details || []);
    } finally {
      setWorking(false);
    }
  }

  async function copyVerificationCode() {
    const code =
      document?.verificationCode ||
      preview?.metadata?.verificationCode;

    if (code) {
      await navigator.clipboard.writeText(code);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-violet-300" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-14">
      <section className="rounded-[2.4rem] border border-violet-400/20 bg-[#090713]/95 p-7">
        <Link
          href={`/departamentos/cso/reunioes/${meetingId}`}
          className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.14em] text-white/35 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar à reunião
        </Link>

        <div className="mt-6 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-violet-300">
              Documento institucional
            </p>
            <h1 className="mt-2 text-4xl font-black text-white">
              Ata Oficial do CSO
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/35">
              Pré-visualização, validação, emissão, assinaturas digitais e
              código de verificação da reunião.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-[8px] font-black uppercase text-white/45"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </button>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-5 text-red-200">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-black">{error}</p>
              {details.length > 0 && (
                <ul className="mt-3 space-y-2 text-sm text-red-100/70">
                  {details.map((detail) => (
                    <li key={detail}>• {detail}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatusCard
          title="Pré-visualização"
          value={preview ? "Disponível" : "Indisponível"}
          icon={FileText}
          active={Boolean(preview)}
        />
        <StatusCard
          title="Condições de emissão"
          value={
            preview?.validation?.valid
              ? "Cumpridas"
              : preview?.validation?.approvals?.command
                ? "Comando aprovado"
                : "Pendentes"
          }
          icon={ShieldCheck}
          active={Boolean(preview?.validation?.valid)}
        />
        <StatusCard
          title="Ata oficial"
          value={document ? `Versão ${document.version}` : "Não emitida"}
          icon={FileCheck2}
          active={Boolean(document)}
        />
      </section>

      {preview && !preview.validation?.valid && (
        <section className="rounded-[1.7rem] border border-amber-400/20 bg-amber-500/[0.06] p-5">
          <h2 className="font-black text-white">Falta concluir estes pontos</h2>
          <ul className="mt-3 space-y-2 text-sm text-amber-100/65">
            {(preview.validation?.errors || []).map((item: string) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </section>
      )}


      {preview?.validation?.warnings?.length > 0 && (
        <section className="rounded-[1.7rem] border border-blue-400/20 bg-blue-500/[0.06] p-5">
          <h2 className="font-black text-white">
            Advertências registadas na ata
          </h2>
          <p className="mt-2 text-sm text-white/35">
            A decisão final do Comando-Geral foi detetada. Estes pontos
            históricos não bloqueiam a emissão, mas ficam registados.
          </p>
          <ul className="mt-3 space-y-2 text-sm text-blue-100/65">
            {preview.validation.warnings.map((item: string) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-wrap gap-3 rounded-[1.7rem] border border-white/10 bg-[#06100c]/90 p-5">
        <button
          type="button"
          disabled={working || !preview?.validation?.valid}
          onClick={() => void issue()}
          className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-5 py-4 text-[8px] font-black uppercase text-white disabled:opacity-35"
        >
          <FileCheck2 className="h-4 w-4" />
          {document ? "Emitir nova versão" : "Emitir ata oficial"}
        </button>

        {document && (
          <>
            <a
              href={`/api/cso-minutes/documents/${document._id}/pdf`}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-5 py-4 text-[8px] font-black uppercase text-emerald-300"
            >
              <Download className="h-4 w-4" />
              Descarregar PDF
            </a>

            <a
              href={`/api/cso-minutes/documents/${document._id}/html`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-4 text-[8px] font-black uppercase text-white/50"
            >
              <Printer className="h-4 w-4" />
              Abrir para imprimir
            </a>
          </>
        )}

        <button
          type="button"
          onClick={() => void copyVerificationCode()}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-4 text-[8px] font-black uppercase text-white/50"
        >
          <Copy className="h-4 w-4" />
          Copiar código
        </button>
      </section>

      {document && (
        <section className="grid grid-cols-1 gap-3 rounded-[1.7rem] border border-emerald-400/20 bg-emerald-500/[0.05] p-5 md:grid-cols-4">
          <Info label="Documento" value={document.documentNumber} />
          <Info label="Versão" value={String(document.version)} />
          <Info label="Verificação" value={document.verificationCode} />
          <Info
            label="Emitida em"
            value={new Date(document.issuedAt).toLocaleString("pt-PT")}
          />
        </section>
      )}

      {preview?.html && (
        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white">
          <iframe
            title="Pré-visualização da ata"
            srcDoc={document?.html || preview.html}
            className="h-[1100px] w-full bg-white"
          />
        </section>
      )}
    </div>
  );
}

function StatusCard({ title, value, icon: Icon, active }: any) {
  return (
    <article className="rounded-[1.6rem] border border-white/10 bg-[#06100c]/90 p-5">
      <Icon className={`h-5 w-5 ${active ? "text-emerald-300" : "text-white/25"}`} />
      <p className="mt-4 text-lg font-black text-white">{value}</p>
      <p className="mt-1 text-[8px] font-black uppercase tracking-[0.1em] text-white/30">
        {title}
      </p>
    </article>
  );
}

function Info({ label, value }: any) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <p className="text-[7px] font-black uppercase text-white/25">{label}</p>
      <p className="mt-1 truncate text-xs font-black text-white">{value}</p>
    </div>
  );
}
