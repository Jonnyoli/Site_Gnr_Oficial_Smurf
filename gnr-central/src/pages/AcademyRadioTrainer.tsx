import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Headphones,
  Loader2,
  Mic2,
  Radio,
  RefreshCw,
  Send,
  ShieldCheck,
  XCircle,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";

async function api(path: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
    ...options,
  });
  const raw = await response.text();
  const payload = raw.trim() ? JSON.parse(raw) : null;
  if (!response.ok) throw new Error(payload?.error || `Pedido falhou (${response.status}).`);
  return payload;
}

export default function AcademyRadioTrainer() {
  const [items, setItems] = useState<any[]>([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [responseText, setResponseText] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const payload = await api("/api/academy/radio/exercises");
      setItems(payload.items || []);
      setSelectedSlug((current) => current || payload.items?.[0]?.slug || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const selected = useMemo(
    () => items.find((item) => item.slug === selectedSlug),
    [items, selectedSlug],
  );

  async function evaluate() {
    if (!selected) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const payload = await api(`/api/academy/radio/${selected.slug}/evaluate`, {
        method: "POST",
        body: JSON.stringify({ response: responseText }),
      });
      setResult(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro na avaliação.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 pb-16">
      <section className="relative overflow-hidden rounded-[2.8rem] border border-blue-400/20 bg-[#04110c] p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(59,130,246,0.22),transparent_35%),radial-gradient(circle_at_90%_20%,rgba(34,197,94,0.14),transparent_35%)]" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.16em] text-blue-300">
            <Headphones className="h-4 w-4" />
            Simulador operacional
          </div>
          <h1 className="mt-5 text-4xl font-black text-white md:text-6xl">
            Treinador de Rádio
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/45">
            Lê a ocorrência, escreve a comunicação e recebe uma análise imediata aos elementos operacionais obrigatórios.
          </p>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[420px] items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-2 rounded-[2rem] border border-white/10 bg-[#06100c] p-4">
            {items.map((item) => (
              <button
                key={item.slug}
                type="button"
                onClick={() => {
                  setSelectedSlug(item.slug);
                  setResponseText("");
                  setResult(null);
                }}
                className={`w-full rounded-2xl border p-4 text-left ${
                  selectedSlug === item.slug
                    ? "border-blue-400/30 bg-blue-500/10"
                    : "border-white/8 bg-black/20"
                }`}
              >
                <Radio className="h-4 w-4 text-blue-300" />
                <p className="mt-3 font-black text-white">{item.title}</p>
                <p className="mt-2 line-clamp-3 text-xs leading-5 text-white/35">
                  {item.scenario}
                </p>
              </button>
            ))}
          </aside>

          <main className="rounded-[2rem] border border-white/10 bg-[#06100c] p-6">
            {selected && (
              <>
                <p className="text-[8px] font-black uppercase tracking-[0.14em] text-blue-300">
                  Ocorrência
                </p>
                <h2 className="mt-3 text-3xl font-black text-white">{selected.title}</h2>
                <div className="mt-5 rounded-2xl border border-blue-400/15 bg-blue-500/[0.04] p-5 text-sm leading-7 text-white/60">
                  {selected.scenario}
                </div>

                <label className="mt-6 block">
                  <span className="text-[8px] font-black uppercase text-white/30">
                    A tua comunicação
                  </span>
                  <textarea
                    value={responseText}
                    onChange={(event) => setResponseText(event.target.value)}
                    rows={7}
                    placeholder="Central, início de..."
                    className="mt-3 w-full rounded-2xl border border-white/10 bg-black/25 p-4 text-sm leading-7 text-white outline-none focus:border-blue-400/30"
                  />
                </label>

                <button
                  type="button"
                  disabled={busy || responseText.trim().length < 5}
                  onClick={() => void evaluate()}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-400 px-5 py-4 text-[9px] font-black uppercase text-[#03111e] disabled:opacity-35"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Avaliar comunicação
                </button>

                {result && (
                  <section className="mt-6 rounded-[1.8rem] border border-white/10 bg-black/20 p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[8px] font-black uppercase text-white/25">
                          Resultado
                        </p>
                        <p className="mt-2 text-4xl font-black text-white">{result.score}%</p>
                      </div>
                      {result.passed ? (
                        <ShieldCheck className="h-10 w-10 text-emerald-300" />
                      ) : (
                        <XCircle className="h-10 w-10 text-amber-300" />
                      )}
                    </div>

                    <div className="mt-5 grid grid-cols-1 gap-2 md:grid-cols-2">
                      {result.elements.map((element: any) => (
                        <div
                          key={element.key}
                          className={`flex items-center gap-3 rounded-xl border p-3 ${
                            element.present
                              ? "border-emerald-400/15 bg-emerald-500/[0.04] text-emerald-200"
                              : "border-red-400/15 bg-red-500/[0.04] text-red-200"
                          }`}
                        >
                          {element.present ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <XCircle className="h-4 w-4" />
                          )}
                          <span className="text-sm font-black">{element.label}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.025] p-4">
                      <p className="text-[8px] font-black uppercase text-primary">
                        Exemplo recomendado
                      </p>
                      <p className="mt-3 text-sm leading-7 text-white/55">
                        {result.modelAnswer}
                      </p>
                    </div>
                  </section>
                )}
              </>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
