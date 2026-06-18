import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays, Check, CircleHelp, ClipboardList, Loader2,
  Megaphone, Plus, RefreshCw, Send, Trash2, UserPlus, Users, X,
} from "lucide-react";

const API = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";

async function request(path: string, init: RequestInit = {}) {
  const response = await fetch(`${API}/api/unit-hub${path}`, {
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    ...init,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Erro ${response.status}`);
  return data;
}

const EVENT_TYPES = [
  ["RECRUITMENT", "Recrutamento"],
  ["TRAINING", "Treino"],
  ["FORMATION", "Formação"],
  ["OPERATION", "Operação"],
  ["MEETING", "Reunião"],
  ["JOINT_PATROL", "Patrulha conjunta"],
  ["CEREMONY", "Cerimónia"],
  ["OTHER", "Outro"],
];

export default function UnitHubPanel({ unit }: { unit: { id: string; short: string; text: string; button: string; softTone: string } }) {
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState<"MEMBERS" | "EVENTS" | "RECRUITMENTS" | "APPLICATIONS">("MEMBERS");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showEvent, setShowEvent] = useState(false);
  const [showRecruitment, setShowRecruitment] = useState(false);
  const [eventForm, setEventForm] = useState({
    type: "TRAINING", title: "", description: "", location: "",
    startsAt: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
    endsAt: "", visibility: "UNIT", attendanceEnabled: true,
  });
  const [recruitmentForm, setRecruitmentForm] = useState({
    title: "", description: "", requirements: "", vacancies: "",
    opensAt: new Date().toISOString().slice(0, 16),
    closesAt: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16),
    questions: "",
  });

  const load = useCallback(async () => {
    try {
      setData(await request(`/${unit.id}`));
      setError("");
    } catch (e: any) {
      setError(e.message || "Não foi possível carregar.");
    }
  }, [unit.id]);

  useEffect(() => { void load(); }, [load]);

  async function mutate(action: () => Promise<any>) {
    setBusy(true);
    setError("");
    try { await action(); await load(); }
    catch (e: any) { setError(e.message || "A ação falhou."); }
    finally { setBusy(false); }
  }

  async function createEvent() {
    await mutate(() => request(`/${unit.id}/events`, {
      method: "POST",
      body: JSON.stringify({
        ...eventForm,
        startsAt: new Date(eventForm.startsAt).toISOString(),
        endsAt: eventForm.endsAt ? new Date(eventForm.endsAt).toISOString() : null,
      }),
    }));
    setShowEvent(false);
  }

  async function attendance(id: string, status: string) {
    await mutate(() => request(`/events/${id}/attendance`, {
      method: "POST", body: JSON.stringify({ status }),
    }));
  }

  async function cancelEvent(id: string) {
    if (!window.confirm("Cancelar este evento?")) return;
    await mutate(() => request(`/events/${id}`, { method: "DELETE" }));
  }

  async function createRecruitment() {
    await mutate(() => request(`/${unit.id}/recruitments`, {
      method: "POST",
      body: JSON.stringify({
        ...recruitmentForm,
        requirements: recruitmentForm.requirements.split(/\r?\n/).map(v => v.trim()).filter(Boolean),
        questions: recruitmentForm.questions.split(/\r?\n/).map(v => v.trim()).filter(Boolean),
        vacancies: recruitmentForm.vacancies ? Number(recruitmentForm.vacancies) : null,
        opensAt: new Date(recruitmentForm.opensAt).toISOString(),
        closesAt: new Date(recruitmentForm.closesAt).toISOString(),
      }),
    }));
    setShowRecruitment(false);
  }

  async function apply(recruitment: any) {
    const motivation = window.prompt("Explica a tua motivação (mínimo 20 caracteres):") || "";
    if (motivation.trim().length < 20) return;
    const answers = [];
    for (const question of recruitment.questions || []) {
      const answer = window.prompt(question.label) || "";
      if (question.required && !answer.trim()) return;
      answers.push({ questionId: question.id, answer });
    }
    await mutate(() => request(`/recruitments/${recruitment._id}/apply`, {
      method: "POST", body: JSON.stringify({ motivation, answers }),
    }));
  }

  async function decide(id: string, status: string) {
    const reason = status === "REJECTED" ? window.prompt("Motivo da recusa:") || "" : "";
    if (status === "REJECTED" && reason.trim().length < 5) return;
    await mutate(() => request(`/applications/${id}/decision`, {
      method: "POST", body: JSON.stringify({ status, reason }),
    }));
  }

  if (!data) {
    return <div className="flex min-h-56 items-center justify-center"><Loader2 className={`h-7 w-7 animate-spin ${unit.text}`} /></div>;
  }

  const upcoming = (data.events || []).filter((e: any) => e.status === "SCHEDULED");
  const myId = data.currentUserId;

  return (
    <div className="space-y-5">
      {error && <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className={`text-[10px] font-black uppercase tracking-[.2em] ${unit.text}`}>Centro da unidade</p>
          <h3 className="mt-2 text-2xl font-black text-white">Agenda, recrutamentos e presenças</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setTab("MEMBERS")}
            className={`rounded-xl border px-4 py-2 text-xs font-black ${
              tab === "MEMBERS"
                ? unit.softTone + " " + unit.text
                : "border-white/10 text-white/45"
            }`}
          >
            Elementos ({data.members?.length || 0})
          </button>
          <button onClick={() => setTab("EVENTS")} className={`rounded-xl border px-4 py-2 text-xs font-black ${tab === "EVENTS" ? unit.softTone + " " + unit.text : "border-white/10 text-white/45"}`}>Agenda</button>
          <button onClick={() => setTab("RECRUITMENTS")} className={`rounded-xl border px-4 py-2 text-xs font-black ${tab === "RECRUITMENTS" ? unit.softTone + " " + unit.text : "border-white/10 text-white/45"}`}>Recrutamentos</button>
          {data.permissions.manage && <button onClick={() => setTab("APPLICATIONS")} className={`rounded-xl border px-4 py-2 text-xs font-black ${tab === "APPLICATIONS" ? unit.softTone + " " + unit.text : "border-white/10 text-white/45"}`}>Candidaturas</button>}
          <button onClick={() => void load()} className="rounded-xl border border-white/10 p-2 text-white"><RefreshCw className="h-4 w-4" /></button>
        </div>
      </div>

      {tab === "MEMBERS" && (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className={`text-[10px] font-black uppercase tracking-[.18em] ${unit.text}`}>
                Efetivo atual
              </p>
              <h4 className="mt-2 text-xl font-black text-white">
                Elementos com a role atual da unidade
              </h4>
            </div>

            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-black text-white/55">
              {data.members?.length || 0}
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {(data.members || []).map((member: any) => (
              <article
                key={member.discordId || member.id}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-4"
              >
                {member.avatarUrl ? (
                  <img
                    src={member.avatarUrl}
                    alt=""
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <span className={`flex h-12 w-12 items-center justify-center rounded-full border ${unit.softTone}`}>
                    <Users className="h-5 w-5" />
                  </span>
                )}

                <div className="min-w-0">
                  <p className="truncate font-black text-white">
                    {member.nome ||
                      member.warName ||
                      member.displayName ||
                      member.username ||
                      "Militar"}
                  </p>
                  <p className={`mt-1 truncate text-xs ${unit.text}`}>
                    {member.posto ||
                      member.rank ||
                      "Operacional"}
                  </p>
                </div>
              </article>
            ))}
          </div>

          {!data.members?.length && (
            <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-white/35">
              Nenhum elemento atual encontrado com a role desta unidade.
            </div>
          )}
        </section>
      )}

      {tab === "EVENTS" && (
        <div className="space-y-4">
          {data.permissions.manage && (
            <button onClick={() => setShowEvent(v => !v)} className={`inline-flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-black ${unit.button}`}>
              <Plus className="h-4 w-4" /> Marcar evento
            </button>
          )}
          {showEvent && (
            <div className="grid gap-3 rounded-3xl border border-white/10 bg-black/25 p-5 md:grid-cols-2">
              <select value={eventForm.type} onChange={e => setEventForm({ ...eventForm, type: e.target.value })} className="rounded-xl border border-white/10 bg-black/40 p-3 text-white">
                {EVENT_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <input value={eventForm.title} onChange={e => setEventForm({ ...eventForm, title: e.target.value })} placeholder="Título" className="rounded-xl border border-white/10 bg-black/30 p-3 text-white" />
              <input type="datetime-local" value={eventForm.startsAt} onChange={e => setEventForm({ ...eventForm, startsAt: e.target.value })} className="rounded-xl border border-white/10 bg-black/30 p-3 text-white" />
              <input value={eventForm.location} onChange={e => setEventForm({ ...eventForm, location: e.target.value })} placeholder="Local" className="rounded-xl border border-white/10 bg-black/30 p-3 text-white" />
              <textarea value={eventForm.description} onChange={e => setEventForm({ ...eventForm, description: e.target.value })} placeholder="Descrição" className="min-h-28 rounded-xl border border-white/10 bg-black/30 p-3 text-white md:col-span-2" />
              <button disabled={busy || !eventForm.title.trim()} onClick={() => void createEvent()} className={`rounded-xl p-3 font-black ${unit.button}`}>Criar e notificar Discord</button>
            </div>
          )}
          <div className="grid gap-4 xl:grid-cols-2">
            {upcoming.map((event: any) => {
              const mine = (event.attendance || []).find((a: any) => a.userId === myId);
              return (
                <article key={event._id} className="rounded-3xl border border-white/10 bg-black/20 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div><p className={`text-xs font-black uppercase ${unit.text}`}>{event.type}</p><h4 className="mt-2 text-xl font-black text-white">{event.title}</h4></div>
                    {data.permissions.manage && <button onClick={() => void cancelEvent(event._id)} className="text-red-300"><Trash2 className="h-4 w-4" /></button>}
                  </div>
                  <p className="mt-3 text-sm text-white/50">{new Date(event.startsAt).toLocaleString("pt-PT")} · {event.location || "Local por definir"}</p>
                  {event.description && <p className="mt-3 text-sm leading-6 text-white/55">{event.description}</p>}
                  {event.attendanceEnabled && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button onClick={() => void attendance(event._id, "PRESENT")} className={`rounded-xl px-3 py-2 text-xs font-bold ${mine?.status === "PRESENT" ? "bg-emerald-500 text-black" : "bg-emerald-500/10 text-emerald-300"}`}>Presente</button>
                      <button onClick={() => void attendance(event._id, "MAYBE")} className={`rounded-xl px-3 py-2 text-xs font-bold ${mine?.status === "MAYBE" ? "bg-amber-500 text-black" : "bg-amber-500/10 text-amber-300"}`}>Talvez</button>
                      <button onClick={() => void attendance(event._id, "ABSENT")} className={`rounded-xl px-3 py-2 text-xs font-bold ${mine?.status === "ABSENT" ? "bg-red-500 text-white" : "bg-red-500/10 text-red-300"}`}>Ausente</button>
                    </div>
                  )}
                  {data.permissions.manage && <p className="mt-4 text-xs text-white/35">{(event.attendance || []).filter((a:any)=>a.status==="PRESENT").length} presentes · {(event.attendance || []).filter((a:any)=>a.status==="MAYBE").length} talvez · {(event.attendance || []).filter((a:any)=>a.status==="ABSENT").length} ausentes</p>}
                </article>
              );
            })}
          </div>
        </div>
      )}

      {tab === "RECRUITMENTS" && (
        <div className="space-y-4">
          {data.permissions.manage && <button onClick={() => setShowRecruitment(v => !v)} className={`inline-flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-black ${unit.button}`}><UserPlus className="h-4 w-4" /> Abrir recrutamento</button>}
          {showRecruitment && (
            <div className="grid gap-3 rounded-3xl border border-white/10 bg-black/25 p-5 md:grid-cols-2">
              <input value={recruitmentForm.title} onChange={e => setRecruitmentForm({ ...recruitmentForm, title: e.target.value })} placeholder="Título" className="rounded-xl border border-white/10 bg-black/30 p-3 text-white" />
              <input type="number" min="1" value={recruitmentForm.vacancies} onChange={e => setRecruitmentForm({ ...recruitmentForm, vacancies: e.target.value })} placeholder="Vagas" className="rounded-xl border border-white/10 bg-black/30 p-3 text-white" />
              <input type="datetime-local" value={recruitmentForm.opensAt} onChange={e => setRecruitmentForm({ ...recruitmentForm, opensAt: e.target.value })} className="rounded-xl border border-white/10 bg-black/30 p-3 text-white" />
              <input type="datetime-local" value={recruitmentForm.closesAt} onChange={e => setRecruitmentForm({ ...recruitmentForm, closesAt: e.target.value })} className="rounded-xl border border-white/10 bg-black/30 p-3 text-white" />
              <textarea value={recruitmentForm.description} onChange={e => setRecruitmentForm({ ...recruitmentForm, description: e.target.value })} placeholder="Descrição" className="rounded-xl border border-white/10 bg-black/30 p-3 text-white md:col-span-2" />
              <textarea value={recruitmentForm.requirements} onChange={e => setRecruitmentForm({ ...recruitmentForm, requirements: e.target.value })} placeholder="Requisitos — um por linha" className="rounded-xl border border-white/10 bg-black/30 p-3 text-white" />
              <textarea value={recruitmentForm.questions} onChange={e => setRecruitmentForm({ ...recruitmentForm, questions: e.target.value })} placeholder="Perguntas — uma por linha" className="rounded-xl border border-white/10 bg-black/30 p-3 text-white" />
              <button disabled={busy || !recruitmentForm.title.trim()} onClick={() => void createRecruitment()} className={`rounded-xl p-3 font-black ${unit.button}`}>Publicar recrutamento</button>
            </div>
          )}
          <div className="grid gap-4 xl:grid-cols-2">
            {(data.recruitments || []).map((r: any) => (
              <article key={r._id} className="rounded-3xl border border-white/10 bg-black/20 p-5">
                <p className={`text-xs font-black uppercase ${unit.text}`}>{r.status}</p>
                <h4 className="mt-2 text-xl font-black text-white">{r.title}</h4>
                <p className="mt-3 text-sm text-white/50">Fecha em {new Date(r.closesAt).toLocaleString("pt-PT")}</p>
                <p className="mt-3 text-sm leading-6 text-white/55">{r.description}</p>
                {!data.permissions.manage && r.status === "OPEN" && <button onClick={() => void apply(r)} className={`mt-4 rounded-xl px-4 py-2 text-xs font-black ${unit.button}`}>Candidatar-me</button>}
              </article>
            ))}
          </div>
        </div>
      )}

      {tab === "APPLICATIONS" && data.permissions.manage && (
        <div className="grid gap-4 xl:grid-cols-2">
          {(data.applications || []).map((a: any) => (
            <article key={a._id} className="rounded-3xl border border-white/10 bg-black/20 p-5">
              <p className="font-black text-white">{a.applicantName}</p>
              <p className="mt-1 text-xs text-white/35">{a.status}</p>
              <p className="mt-4 text-sm leading-6 text-white/55">{a.motivation}</p>
              {(a.answers || []).map((answer: any) => <div key={answer.questionId} className="mt-3 rounded-xl border border-white/10 p-3"><p className="text-xs font-bold text-white/45">{answer.question}</p><p className="mt-1 text-sm text-white/70">{answer.answer}</p></div>)}
              {a.status === "PENDING" && <div className="mt-4 flex flex-wrap gap-2"><button onClick={() => void decide(a._id, "INTERVIEW")} className="rounded-xl bg-blue-500/10 px-3 py-2 text-xs font-bold text-blue-300">Entrevista</button><button onClick={() => void decide(a._id, "APPROVED")} className="rounded-xl bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-300">Aprovar</button><button onClick={() => void decide(a._id, "REJECTED")} className="rounded-xl bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300">Recusar</button></div>}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
