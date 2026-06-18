import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Presentation,
  Send,
  UserPlus,
  XCircle,
} from "lucide-react";
import { schoolRequest } from "../data/schoolApi";

export default function SchoolTrainers() {
  const [data, setData] = useState<any>({ trainers: [], applications: [], canManage: false });
  const [motivation, setMotivation] = useState("");
  const [experience, setExperience] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    const response = await schoolRequest("/trainers");
    setData(response);
  }

  useEffect(() => {
    void load().catch(() => null);
  }, []);

  async function apply() {
    if (motivation.trim().length < 20) {
      setMessage("Explica melhor a tua motivação.");
      return;
    }

    setBusy(true);
    try {
      await schoolRequest("/trainer-applications", {
        method: "POST",
        body: JSON.stringify({ motivation, experience }),
      });
      setMessage("Candidatura enviada com sucesso.");
      setMotivation("");
      setExperience("");
      await load();
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function decide(id: string, decision: "APPROVED" | "REJECTED") {
    const reason =
      decision === "REJECTED"
        ? window.prompt("Motivo da recusa:") || ""
        : "";

    await schoolRequest(`/trainer-applications/${id}/decision`, {
      method: "POST",
      body: JSON.stringify({ decision, reason }),
    });

    await load();
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2.2rem] border border-white/10 bg-black/20 p-6">
        <div className="flex items-center gap-3 text-emerald-300">
          <Presentation />
          <span className="text-xs font-black uppercase tracking-[.2em]">
            Corpo de Formação
          </span>
        </div>
        <h1 className="mt-3 text-4xl font-black text-white">Formadores</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/50">
          Candidaturas, acompanhamento dos Formadores e gestão do corpo
          pedagógico da Escola da Guarda.
        </p>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <article className="rounded-3xl border border-white/10 bg-black/20 p-6">
          <div className="flex items-center gap-3">
            <UserPlus className="text-emerald-300" />
            <h2 className="text-xl font-black text-white">
              Candidatar-me a Formador
            </h2>
          </div>

          <label className="mt-5 block text-xs font-black uppercase tracking-[.14em] text-white/45">
            Motivação
          </label>
          <textarea
            value={motivation}
            onChange={(event) => setMotivation(event.target.value)}
            rows={5}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 p-4 text-white outline-none focus:border-emerald-400/30"
            placeholder="Porque queres integrar o corpo de Formadores?"
          />

          <label className="mt-4 block text-xs font-black uppercase tracking-[.14em] text-white/45">
            Experiência
          </label>
          <textarea
            value={experience}
            onChange={(event) => setExperience(event.target.value)}
            rows={3}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 p-4 text-white outline-none focus:border-emerald-400/30"
            placeholder="Experiência relevante, disponibilidade e áreas fortes."
          />

          {message && (
            <p className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white/65">
              {message}
            </p>
          )}

          <button
            onClick={() => void apply()}
            disabled={busy}
            className="mt-5 inline-flex h-12 items-center gap-2 rounded-2xl bg-emerald-500 px-5 font-black text-black disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            Enviar candidatura
          </button>
        </article>

        <article className="rounded-3xl border border-white/10 bg-black/20 p-6">
          <h2 className="text-xl font-black text-white">Formadores ativos</h2>
          <div className="mt-5 space-y-3">
            {(data.trainers || []).map((trainer: any) => (
              <div
                key={trainer.userId}
                className="flex items-center gap-4 rounded-2xl border border-white/10 p-4"
              >
                {trainer.avatarUrl ? (
                  <img
                    src={trainer.avatarUrl}
                    alt=""
                    className="h-11 w-11 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/10 font-black text-emerald-300">
                    {String(trainer.name || "F").slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-white">{trainer.name}</p>
                  <p className="text-xs text-white/40">
                    {trainer.trainee ? "Formador Estagiário" : "Formador"}
                  </p>
                </div>
              </div>
            ))}

            {!data.trainers?.length && (
              <p className="text-sm text-white/40">
                Nenhum Formador sincronizado.
              </p>
            )}
          </div>
        </article>
      </section>

      {data.canManage && (
        <section className="rounded-3xl border border-white/10 bg-black/20 p-6">
          <h2 className="text-xl font-black text-white">Candidaturas pendentes</h2>

          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {(data.applications || []).map((application: any) => (
              <article
                key={application._id}
                className="rounded-2xl border border-white/10 p-5"
              >
                <div className="flex items-center gap-3">
                  <Clock3 className="h-5 w-5 text-amber-300" />
                  <div>
                    <p className="font-black text-white">
                      {application.applicantName}
                    </p>
                    <p className="text-xs text-white/35">
                      {application.applicantId}
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-6 text-white/60">
                  {application.motivation}
                </p>

                {application.experience && (
                  <p className="mt-3 text-sm leading-6 text-white/40">
                    Experiência: {application.experience}
                  </p>
                )}

                <div className="mt-5 flex gap-3">
                  <button
                    onClick={() => void decide(application._id, "APPROVED")}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/10 px-4 py-2 font-bold text-emerald-300"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Aprovar
                  </button>
                  <button
                    onClick={() => void decide(application._id, "REJECTED")}
                    className="inline-flex items-center gap-2 rounded-xl bg-red-500/10 px-4 py-2 font-bold text-red-300"
                  >
                    <XCircle className="h-4 w-4" />
                    Recusar
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
