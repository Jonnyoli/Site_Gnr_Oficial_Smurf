import { useEffect, useState } from "react";
import {
  Award,
  Download,
  Loader2,
  Printer,
  QrCode,
  ShieldCheck,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";

async function api(path: string) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  const raw = await response.text();
  const payload = raw.trim() ? JSON.parse(raw) : null;
  if (!response.ok) throw new Error(payload?.error || `Pedido falhou (${response.status}).`);
  return payload;
}

export default function AcademyCertificates() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/api/academy/certificates")
      .then((payload) => setItems(payload.items || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      <section className="rounded-[2.8rem] border border-amber-400/20 bg-[#06100c] p-8">
        <p className="text-[8px] font-black uppercase tracking-[0.16em] text-amber-300">
          Escola da Guarda
        </p>
        <h1 className="mt-3 text-4xl font-black text-white md:text-6xl">
          Certificados Digitais
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-white/40">
          Certificados verificáveis emitidos automaticamente após a conclusão dos cursos.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {items.map((item) => (
          <article
            key={item.certificateCode}
            className="relative overflow-hidden rounded-[2rem] border border-amber-400/20 bg-gradient-to-br from-[#10150d] to-[#06100c] p-7"
          >
            <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full border border-amber-300/10" />
            <div className="relative">
              <div className="flex items-start justify-between">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-500/10 text-amber-300">
                  <Award className="h-7 w-7" />
                </span>
                <ShieldCheck className="h-7 w-7 text-primary" />
              </div>

              <p className="mt-7 text-[8px] font-black uppercase tracking-[0.16em] text-amber-300">
                Certificado de conclusão
              </p>
              <h2 className="mt-3 text-2xl font-black text-white">
                {item.courseSlug.replace(/-/g, " ")}
              </h2>
              <p className="mt-5 text-sm text-white/45">
                Emitido a <strong className="text-white">{item.holderName}</strong>,{" "}
                {item.holderRank}.
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                  <p className="text-[7px] font-black uppercase text-white/25">Código</p>
                  <p className="mt-2 font-mono text-sm font-black text-primary">
                    {item.certificateCode}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                  <p className="text-[7px] font-black uppercase text-white/25">Média</p>
                  <p className="mt-2 text-xl font-black text-white">
                    {item.averageScore ?? "—"}%
                  </p>
                </div>
              </div>

              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-[8px] font-black uppercase text-white/40"
                >
                  <Printer className="h-4 w-4" />
                  Imprimir
                </button>
                <button
                  type="button"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-amber-400/20 bg-amber-500/[0.05] px-4 py-3 text-[8px] font-black uppercase text-amber-300"
                >
                  <QrCode className="h-4 w-4" />
                  Verificar
                </button>
              </div>
            </div>
          </article>
        ))}

        {!items.length && (
          <div className="rounded-[2rem] border border-dashed border-white/10 p-12 text-center text-white/25 xl:col-span-2">
            Ainda não tens certificados. Conclui o primeiro curso da Academia.
          </div>
        )}
      </section>
    </div>
  );
}
