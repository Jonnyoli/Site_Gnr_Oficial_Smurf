import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Award,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  ExternalLink,
  FileText,
  History,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  UserRound,
  UsersRound,
  X,
  XCircle,
} from "lucide-react";
import { useData } from "../context/DataContext";


const GNR_ROLE_ID = "1147878941974077478";

function hasCurrentGnrRole(item: any) {
  return [
    item?.roles,
    item?.discordRoles,
    item?.savedTags,
    item?.roleIds,
  ].some(
    (roles) =>
      Array.isArray(roles) &&
      roles.map(String).includes(GNR_ROLE_ID),
  );
}

type EvaluationType = "OFFICER_SERGEANT" | "COMMAND_OFFICER";
type EvaluationStatus = "DRAFT" | "SUBMITTED" | "IN_REVIEW" | "CHANGES_REQUESTED" | "APPROVED" | "REJECTED" | "ARCHIVED";
type ScoreValue = { value: number | null; notApplicable: boolean; note: string };

const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";

const OFFICER_SERGEANT_CRITERIA = [
  ["radioCommunication", "Comunicação rádio", "Autoridade, liderança, clareza e objetividade."],
  ["codeEResponsibility", "Responsabilidade por Código E", "Postura, coordenação e controlo enquanto responsável."],
  ["subordinateSupport", "Apoio aos subordinados", "Acompanhamento, correção e transmissão de conhecimento."],
  ["emotionalControl", "Controlo emocional", "Calma e profissionalismo perante conflito ou desrespeito."],
  ["pressureDecision", "Decisão sob pressão", "Rapidez, segurança, proporcionalidade e eficácia."],
  ["operationalCoordination", "Coordenação operacional", "Planeamento, distribuição de funções e controlo no terreno."],
] as const;

const COMMAND_OFFICER_CRITERIA = [
  ["radioCommunication", "Comunicação rádio", "Autoridade, liderança, clareza e transmissão de ordens."],
  ["supervisionDecision", "Supervisão e decisão", "Postura de supervisão em rádio ou no terreno."],
  ["disciplinaryApplication", "Aplicação disciplinar", "Repreensões e ordens de desfardar adequadas e proporcionais."],
  ["commandSupport", "Apoio ao Comando", "Colaboração nas tarefas e processos institucionais."],
  ["meetingParticipation", "Participação em reuniões", "Presença, interesse e contributos no CSO/CEG."],
  ["emotionalControl", "Temperamento e controlo emocional", "Equilíbrio, autoridade e imparcialidade sob pressão."],
] as const;

const OFFICER_SERGEANT_RECOMMENDATIONS = [
  "Manter funções",
  "Acompanhamento por Oficial",
  "Reforçar liderança",
  "Apto para maior responsabilidade",
  "Recomendado para progressão",
  "Não recomendado para progressão",
];

const COMMAND_OFFICER_RECOMMENDATIONS = [
  "Manter funções",
  "Acompanhamento necessário",
  "Reforçar competências de liderança",
  "Apto para maior responsabilidade",
  "Recomendado para progressão",
  "Não recomendado para progressão",
];

async function api(path: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "application/json", ...(options.body ? { "Content-Type": "application/json" } : {}) },
    ...options,
  });
  const raw = await response.text();
  let payload: any = null;
  if (raw.trim()) try { payload = JSON.parse(raw); } catch { payload = null; }
  if (!response.ok) throw new Error(payload?.error || `O pedido falhou (${response.status}).`);
  return payload;
}

const guardId = (g: any) => String(g?.discordId || g?.id || g?._id || "");
const guardName = (g: any) => g?.nome || g?.warName || g?.displayName || g?.username || "Militar";
const guardRank = (g: any) => g?.posto || g?.rank || g?.hierarchyGroupLabel || "Guarda";
const guardUnit = (g: any) => g?.unidade || g?.unit || g?.currentUnit || "Patrulha";
const guardAvatar = (g: any) => g?.avatar || g?.avatarUrl || null;
const isSergeant = (g: any) => /sargento/i.test(guardRank(g));
const isOfficer = (g: any) => /(alferes|tenente|capit[aã]o|major|coronel|brigadeiro|general)/i.test(guardRank(g));

function emptyScores(criteria: readonly (readonly [string, string, string])[]) {
  return Object.fromEntries(criteria.map(([key]) => [key, { value: 0, notApplicable: false, note: "" }]));
}

function average(scores: Record<string, ScoreValue>, criteria: readonly (readonly [string, string, string])[]) {
  const values = criteria.map(([key]) => scores[key]).filter((v) => v && !v.notApplicable && Number.isFinite(v.value)).map((v) => Number(v.value));
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

function statusLabel(status: EvaluationStatus) {
  return ({ DRAFT: "Rascunho", SUBMITTED: "Submetida", IN_REVIEW: "Em análise", CHANGES_REQUESTED: "Correção solicitada", APPROVED: "Aprovada", REJECTED: "Reprovada", ARCHIVED: "Arquivada" } as const)[status];
}

export default function CareerEvaluations() {
  const { guardas } = useData() as any;
  const [access, setAccess] = useState<any>({});
  const [items, setItems] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [view, setView] = useState<"NEW" | "HISTORY" | "QUEUE">("NEW");
  const [type, setType] = useState<EvaluationType>("OFFICER_SERGEANT");
  const [search, setSearch] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [scores, setScores] = useState<Record<string, ScoreValue>>(emptyScores(OFFICER_SERGEANT_CRITERIA));
  const [strengths, setStrengths] = useState("");
  const [improvements, setImprovements] = useState("");
  const [relevantOccurrences, setRelevantOccurrences] = useState("");
  const [finalOpinion, setFinalOpinion] = useState("");
  const [recommendation, setRecommendation] = useState("");
  const [selectedEvaluation, setSelectedEvaluation] = useState<any>(null);
  const [decisionReason, setDecisionReason] = useState("");

  async function load(silent = false) {
    if (!silent) setLoading(true);
    setError("");
    try {
      const [a, l, s] = await Promise.all([
        api("/api/hierarchical-evaluations/access"),
        api("/api/hierarchical-evaluations"),
        api("/api/hierarchical-evaluations/stats"),
      ]);
      setAccess(a || {});
      setItems(l?.items || []);
      setStats(s || {});
      if (!a?.canEvaluateSergeants && a?.canEvaluateOfficers) setType("COMMAND_OFFICER");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível carregar as avaliações.");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    const id = window.setInterval(() => document.visibilityState === "visible" && void load(true), 15000);
    return () => window.clearInterval(id);
  }, []);

  const criteria = type === "OFFICER_SERGEANT" ? OFFICER_SERGEANT_CRITERIA : COMMAND_OFFICER_CRITERIA;
  const recommendations = type === "OFFICER_SERGEANT" ? OFFICER_SERGEANT_RECOMMENDATIONS : COMMAND_OFFICER_RECOMMENDATIONS;

  const eligibleGuards = useMemo(() => {
    const term = search.trim().toLowerCase();
    return ((guardas || []) as any[])
      .filter((g) => guardId(g) && g?.bot !== true && hasCurrentGnrRole(g))
      .filter((g) => type === "OFFICER_SERGEANT" ? isSergeant(g) : isOfficer(g))
      .filter((g) => !term || [guardName(g), guardRank(g), guardUnit(g), guardId(g)].some((v) => String(v).toLowerCase().includes(term)))
      .sort((a, b) => guardName(a).localeCompare(guardName(b), "pt-PT"));
  }, [guardas, search, type]);

  const selectedGuard = eligibleGuards.find((g) => guardId(g) === selectedId);
  const liveAverage = useMemo(() => average(scores, criteria), [scores, criteria]);
  const filteredItems = useMemo(() => {
    const term = historySearch.trim().toLowerCase();
    const source = view === "QUEUE" ? items.filter((i) => ["SUBMITTED", "IN_REVIEW"].includes(i.status)) : items;
    return !term ? source : source.filter((i) => [i.evaluatedName, i.evaluatorName, i.evaluatedRank, i.recommendation].filter(Boolean).some((v) => String(v).toLowerCase().includes(term)));
  }, [items, historySearch, view]);

  function changeType(next: EvaluationType) {
    setType(next);
    setSelectedId("");
    setScores(emptyScores(next === "OFFICER_SERGEANT" ? OFFICER_SERGEANT_CRITERIA : COMMAND_OFFICER_CRITERIA));
    setRecommendation("");
  }

  function changeScore(key: string, value: string) {
    setScores((current) => ({
      ...current,
      [key]: value === "N/A" ? { ...current[key], value: null, notApplicable: true } : { ...current[key], value: Number(value), notApplicable: false },
    }));
  }

  function changeNote(key: string, note: string) {
    setScores((current) => ({ ...current, [key]: { ...current[key], note } }));
  }

  function resetForm() {
    setSelectedId(""); setPeriodStart(""); setPeriodEnd(""); setScores(emptyScores(criteria));
    setStrengths(""); setImprovements(""); setRelevantOccurrences(""); setFinalOpinion(""); setRecommendation("");
  }

  async function create(submit: boolean) {
    if (!selectedGuard) return setError("Seleciona o militar a avaliar.");
    if (finalOpinion.trim().length < 3) return setError("Preenche o parecer final.");
    setSaving(true); setError("");
    try {
      await api("/api/hierarchical-evaluations", {
        method: "POST",
        body: JSON.stringify({
          type,
          evaluatedDiscordId: guardId(selectedGuard), evaluatedName: guardName(selectedGuard), evaluatedRank: guardRank(selectedGuard), evaluatedUnit: guardUnit(selectedGuard), evaluatedAvatarUrl: guardAvatar(selectedGuard),
          periodStart: periodStart || null, periodEnd: periodEnd || null,
          scores, strengths, improvements, relevantOccurrences, finalOpinion, recommendation, submit,
        }),
      });
      setSuccess(submit ? (type === "COMMAND_OFFICER" ? "Avaliação oficial emitida e aprovada." : "Avaliação submetida ao Comando-Geral.") : "Rascunho guardado.");
      resetForm(); setView("HISTORY"); await load(true);
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível guardar."); }
    finally { setSaving(false); }
  }

  async function decide(action: "APPROVE" | "REJECT" | "REQUEST_CHANGES") {
    if (!selectedEvaluation) return;
    try {
      await api(`/api/hierarchical-evaluations/${selectedEvaluation._id}/decision`, { method: "POST", body: JSON.stringify({ action, reason: decisionReason }) });
      setSuccess(action === "APPROVE" ? "Avaliação aprovada." : action === "REJECT" ? "Avaliação reprovada." : "Correções solicitadas.");
      setSelectedEvaluation(null); setDecisionReason(""); await load(true);
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível concluir a decisão."); }
  }

  if (!loading && !access.canEvaluateSergeants && !access.canEvaluateOfficers && !access.canApprove) {
    return <div className="rounded-[2.2rem] border border-red-400/20 bg-red-500/[0.05] p-10 text-center"><AlertTriangle className="mx-auto h-10 w-10 text-red-300"/><h1 className="mt-5 text-3xl font-black text-white">Acesso restrito</h1><p className="mt-3 text-sm text-white/40">Este módulo está disponível apenas para Oficiais autorizados e Comando-Geral.</p></div>;
  }

  return <div className="space-y-6 pb-16">
    <section className="relative overflow-hidden rounded-[2.8rem] border border-violet-400/20 bg-[#07100d]/95 p-7 md:p-9">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(34,197,94,0.18),transparent_32%),radial-gradient(circle_at_90%_10%,rgba(139,92,246,0.18),transparent_34%)]"/>
      <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div><div className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.16em] text-violet-300"><Sparkles className="h-3.5 w-3.5"/>Sistema hierárquico</div><h1 className="mt-5 text-4xl font-black tracking-[-0.04em] text-white md:text-6xl">Avaliações de<span className="block bg-gradient-to-r from-primary via-blue-300 to-violet-300 bg-clip-text text-transparent">Carreira</span></h1><p className="mt-5 max-w-3xl text-sm leading-7 text-white/45">Oficiais avaliam Sargentos e o Comando-Geral avalia Oficiais, com critérios próprios, média oficial e validação institucional.</p></div>
        <button onClick={() => void load()} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-black/25 px-5 py-4 text-[8px] font-black uppercase text-white/45"><RefreshCw className="h-4 w-4"/>Atualizar</button>
      </div>
    </section>

    {error && <Feedback tone="error" message={error} onClose={() => setError("")}/>} {success && <Feedback tone="success" message={success} onClose={() => setSuccess("")}/>} 

    <section className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
      <Metric label="Total" value={stats.total || 0} icon={BarChart3} tone="violet"/><Metric label="Rascunhos" value={stats.drafts || 0} icon={FileText} tone="blue"/><Metric label="Submetidas" value={stats.submitted || 0} icon={Clock3} tone="amber"/><Metric label="Correções" value={stats.changesRequested || 0} icon={AlertTriangle} tone="orange"/><Metric label="Aprovadas" value={stats.approved || 0} icon={CheckCircle2} tone="green"/><Metric label="Reprovadas" value={stats.rejected || 0} icon={XCircle} tone="red"/><Metric label="Média oficial" value={stats.officialAverage ?? "—"} icon={Star} tone="yellow"/>
    </section>

    <section className="rounded-[1.8rem] border border-white/10 bg-[#06100c]/92 p-2"><div className="grid grid-cols-3 gap-2">
      {[["NEW","Nova avaliação",Target],["HISTORY","Histórico",History],["QUEUE","Fila de validação",ShieldCheck]].map(([key,label,Icon]: any) => <button key={key} onClick={() => setView(key)} className={`flex min-h-[58px] items-center justify-center gap-2 rounded-2xl border text-[8px] font-black uppercase ${view === key ? "border-primary/25 bg-primary/10 text-primary" : "border-transparent text-white/30 hover:bg-white/[0.03]"}`}><Icon className="h-4 w-4"/>{label}</button>)}
    </div></section>

    {loading ? <LoadingState/> : view === "NEW" ? <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[360px_minmax(0,1fr)_300px]">
      <section className="rounded-[2rem] border border-white/10 bg-[#06100c]/92 p-5"><p className="text-[8px] font-black uppercase tracking-[0.14em] text-primary">Militar a avaliar</p><div className="mt-4 flex h-12 items-center rounded-2xl border border-white/10 bg-black/25 px-4"><Search className="mr-3 h-4 w-4 text-primary"/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nome, patente ou unidade..." className="h-full flex-1 bg-transparent text-sm text-white outline-none"/></div><div className="mt-4 max-h-[720px] space-y-2 overflow-y-auto">{eligibleGuards.map((g) => <button key={guardId(g)} onClick={() => setSelectedId(guardId(g))} className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left ${guardId(g) === selectedId ? "border-primary/30 bg-primary/10" : "border-white/8 bg-black/20"}`}><Avatar src={guardAvatar(g)}/><span className="min-w-0 flex-1"><span className="block truncate text-sm font-black text-white">{guardName(g)}</span><span className="mt-1 block truncate text-[8px] font-black uppercase text-primary">{guardRank(g)}</span><span className="mt-1 block truncate text-[8px] text-white/25">{guardUnit(g)}</span></span><ChevronRight className="h-4 w-4 text-white/20"/></button>)}</div></section>

      <section className="space-y-5 rounded-[2rem] border border-white/10 bg-[#06100c]/92 p-5 md:p-7">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{access.canEvaluateSergeants && <TypeCard active={type === "OFFICER_SERGEANT"} icon={UsersRound} title="Oficial → Sargento" description="Liderança, Código E e coordenação operacional." tone="blue" onClick={() => changeType("OFFICER_SERGEANT")}/>} {access.canEvaluateOfficers && <TypeCard active={type === "COMMAND_OFFICER"} icon={Award} title="Comando → Oficial" description="Supervisão, disciplina e apoio ao Comando." tone="violet" onClick={() => changeType("COMMAND_OFFICER")}/>}</div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2"><DateInput label="Início do período" value={periodStart} onChange={setPeriodStart}/><DateInput label="Fim do período" value={periodEnd} onChange={setPeriodEnd}/></div>
        <div className="space-y-3">{criteria.map(([key,label,description]) => <CriterionCard key={key} label={label} description={description} value={scores[key]} onScore={(v: string) => changeScore(key,v)} onNote={(n: string) => changeNote(key,n)}/>)}</div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2"><TextArea label="Pontos fortes" value={strengths} onChange={setStrengths}/><TextArea label="Aspetos a melhorar" value={improvements} onChange={setImprovements}/><TextArea label="Ocorrências relevantes" value={relevantOccurrences} onChange={setRelevantOccurrences}/><TextArea label="Parecer final" value={finalOpinion} onChange={setFinalOpinion}/></div>
        <label className="block"><span className="text-[8px] font-black uppercase text-white/30">Recomendação</span><select value={recommendation} onChange={(e) => setRecommendation(e.target.value)} className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-black/25 px-4 text-sm text-white outline-none"><option value="">Selecionar recomendação</option>{recommendations.map((r) => <option key={r} value={r}>{r}</option>)}</select></label>
      </section>

      <aside className="2xl:sticky 2xl:top-5 2xl:self-start"><section className="rounded-[2rem] border border-primary/20 bg-[#06100c]/95 p-5"><p className="text-[8px] font-black uppercase tracking-[0.14em] text-primary">Pré-visualização</p>{selectedGuard ? <div className="mt-4 flex items-center gap-3"><Avatar src={guardAvatar(selectedGuard)}/><div className="min-w-0"><p className="truncate font-black text-white">{guardName(selectedGuard)}</p><p className="mt-1 truncate text-[8px] font-black uppercase text-primary">{guardRank(selectedGuard)}</p></div></div> : <div className="mt-4 rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-white/25">Seleciona um militar.</div>}<div className="mt-5 grid grid-cols-2 gap-3"><PreviewStat label="Média" value={liveAverage === null ? "—" : liveAverage.toFixed(2)}/><PreviewStat label="Critérios" value={criteria.length}/></div><div className="mt-4 rounded-2xl border border-white/8 bg-black/20 p-4"><p className="text-[7px] font-black uppercase text-white/25">Fluxo</p><p className="mt-2 text-sm leading-6 text-white/45">{type === "OFFICER_SERGEANT" ? "Submetida ao Comando-Geral para validação." : "Emitida diretamente como avaliação oficial do Comando-Geral."}</p></div><button disabled={saving || !selectedGuard} onClick={() => void create(true)} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-emerald-400 px-5 py-4 text-[8px] font-black uppercase text-[#02140c] disabled:opacity-35">{saving ? <Loader2 className="h-4 w-4 animate-spin"/> : <ShieldCheck className="h-4 w-4"/>}{type === "COMMAND_OFFICER" ? "Emitir avaliação oficial" : "Submeter ao Comando"}</button><button disabled={saving || !selectedGuard} onClick={() => void create(false)} className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3 text-[8px] font-black uppercase text-white/45 disabled:opacity-35"><FileText className="h-4 w-4"/>Guardar rascunho</button></section></aside>
    </div> : <section className="space-y-4"><div className="flex h-12 items-center rounded-2xl border border-white/10 bg-black/25 px-4"><Search className="mr-3 h-4 w-4 text-primary"/><input value={historySearch} onChange={(e) => setHistorySearch(e.target.value)} placeholder="Pesquisar avaliado, avaliador ou patente..." className="h-full flex-1 bg-transparent text-sm text-white outline-none"/></div>{filteredItems.length ? filteredItems.map((item) => <EvaluationCard key={item._id} item={item} onOpen={() => setSelectedEvaluation(item)}/>) : <EmptyState/>}</section>}

    {selectedEvaluation && <EvaluationModal item={selectedEvaluation} reason={decisionReason} onReason={setDecisionReason} onClose={() => { setSelectedEvaluation(null); setDecisionReason(""); }} onApprove={() => void decide("APPROVE")} onReject={() => void decide("REJECT")} onChanges={() => void decide("REQUEST_CHANGES")}/>} 
  </div>;
}

function CriterionCard({ label, description, value, onScore, onNote }: any) {
  const selected = value?.notApplicable ? "N/A" : String(value?.value ?? 0);
  return <article className="rounded-2xl border border-white/10 bg-black/20 p-4"><p className="font-black text-white">{label}</p><p className="mt-1 text-xs leading-5 text-white/35">{description}</p><div className="mt-4 grid grid-cols-6 gap-1.5">{Array.from({ length: 11 }, (_, i) => <button key={i} onClick={() => onScore(String(i))} className={`h-9 rounded-lg border text-[8px] font-black ${selected === String(i) ? "border-primary/30 bg-primary/10 text-primary" : "border-white/8 bg-white/[0.02] text-white/30"}`}>{i}</button>)}<button onClick={() => onScore("N/A")} className={`h-9 rounded-lg border text-[8px] font-black ${selected === "N/A" ? "border-violet-400/30 bg-violet-500/10 text-violet-300" : "border-white/8 bg-white/[0.02] text-white/30"}`}>N/A</button></div><textarea value={value?.note || ""} onChange={(e) => onNote(e.target.value)} rows={3} maxLength={1500} placeholder="Justificação deste critério..." className="mt-3 w-full resize-y rounded-xl border border-white/8 bg-black/20 p-3 text-sm text-white outline-none"/></article>;
}

function EvaluationCard({ item, onOpen }: any) { return <button onClick={onOpen} className="flex w-full flex-col gap-4 rounded-[1.8rem] border border-white/10 bg-[#06100c]/92 p-5 text-left hover:border-primary/20 lg:flex-row lg:items-center lg:justify-between"><div className="flex min-w-0 items-center gap-4"><Avatar src={item.evaluatedAvatarUrl}/><div className="min-w-0"><StatusBadge status={item.status}/><h2 className="mt-3 truncate text-xl font-black text-white">{item.evaluatedName}</h2><p className="mt-1 text-[8px] font-black uppercase text-primary">{item.evaluatedRank}</p><p className="mt-2 text-xs text-white/25">{item.type === "OFFICER_SERGEANT" ? "Oficial → Sargento" : "Comando → Oficial"}</p></div></div><div className="flex items-center gap-3"><PreviewStat label="Média" value={item.average ?? "—"}/><PreviewStat label="Classificação" value={item.classification || "—"}/><ChevronRight className="h-5 w-5 text-white/20"/></div></button>; }

function EvaluationModal({ item, reason, onReason, onClose, onApprove, onReject, onChanges }: any) { return <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"><div className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-[2.2rem] border border-violet-400/20 bg-[#06100c]"><div className="sticky top-0 z-10 flex items-start justify-between border-b border-white/8 bg-[#06100c]/95 p-6"><div><StatusBadge status={item.status}/><h2 className="mt-3 text-3xl font-black text-white">{item.evaluatedName}</h2><p className="mt-1 text-sm text-primary">{item.evaluatedRank}</p></div><button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-white/35"><X className="h-4 w-4"/></button></div><div className="space-y-5 p-6"><div className="grid grid-cols-2 gap-3 md:grid-cols-4"><PreviewStat label="Média" value={item.average ?? "—"}/><PreviewStat label="Tipo" value={item.type === "OFFICER_SERGEANT" ? "Oficial → Sargento" : "Comando → Oficial"}/><PreviewStat label="Avaliador" value={item.evaluatorName}/><PreviewStat label="Estado" value={statusLabel(item.status)}/></div><div className="grid grid-cols-1 gap-3 md:grid-cols-2"><TextBlock label="Pontos fortes" value={item.strengths}/><TextBlock label="Aspetos a melhorar" value={item.improvements}/><TextBlock label="Ocorrências relevantes" value={item.relevantOccurrences}/><TextBlock label="Parecer final" value={item.finalOpinion}/></div><TextBlock label="Recomendação" value={item.recommendation}/>{item.discord?.jumpUrl && <a href={item.discord.jumpUrl} target="_blank" rel="noreferrer" className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-[8px] font-black uppercase text-white/45"><ExternalLink className="h-4 w-4"/>Abrir no Discord</a>}{item.permissions?.canApprove && <section className="rounded-2xl border border-amber-400/15 bg-amber-500/[0.04] p-5"><textarea value={reason} onChange={(e) => onReason(e.target.value)} rows={4} placeholder="Motivo obrigatório para reprovar ou pedir correções..." className="w-full rounded-2xl border border-white/10 bg-black/25 p-4 text-sm text-white outline-none"/><div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3"><button onClick={onApprove} className="rounded-2xl bg-emerald-500 px-4 py-3 text-[8px] font-black uppercase text-white">Aprovar</button><button disabled={reason.trim().length < 3} onClick={onChanges} className="rounded-2xl bg-amber-500 px-4 py-3 text-[8px] font-black uppercase text-white disabled:opacity-35">Pedir correções</button><button disabled={reason.trim().length < 3} onClick={onReject} className="rounded-2xl bg-red-500 px-4 py-3 text-[8px] font-black uppercase text-white disabled:opacity-35">Reprovar</button></div></section>}</div></div></div>; }

function TypeCard({ active, icon: Icon, title, description, tone, onClick }: any) { return <button onClick={onClick} className={`rounded-2xl border p-5 text-left ${active ? tone === "violet" ? "border-violet-400/30 bg-violet-500/10" : "border-blue-400/30 bg-blue-500/10" : "border-white/10 bg-black/20"}`}><Icon className={`h-5 w-5 ${tone === "violet" ? "text-violet-300" : "text-blue-300"}`}/><p className="mt-4 font-black text-white">{title}</p><p className="mt-2 text-xs leading-5 text-white/35">{description}</p></button>; }
function Metric({ label, value, icon: Icon, tone }: any) { const tones: any = { violet:"border-violet-400/15 bg-violet-500/[0.04] text-violet-300",blue:"border-blue-400/15 bg-blue-500/[0.04] text-blue-300",amber:"border-amber-400/15 bg-amber-500/[0.04] text-amber-300",orange:"border-orange-400/15 bg-orange-500/[0.04] text-orange-300",green:"border-emerald-400/15 bg-emerald-500/[0.04] text-emerald-300",red:"border-red-400/15 bg-red-500/[0.04] text-red-300",yellow:"border-yellow-400/15 bg-yellow-500/[0.04] text-yellow-300"}; return <article className={`rounded-[1.6rem] border p-4 ${tones[tone]}`}><Icon className="h-5 w-5"/><p className="mt-4 text-2xl font-black text-white">{value}</p><p className="mt-1 text-[7px] font-black uppercase text-white/25">{label}</p></article>; }
function Avatar({ src }: any) { return src ? <img src={src} alt="" className="h-12 w-12 shrink-0 rounded-2xl border border-primary/20 object-cover"/> : <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary"><UserRound className="h-5 w-5"/></span>; }
function DateInput({ label, value, onChange }: any) { return <label><span className="text-[8px] font-black uppercase text-white/30">{label}</span><input type="date" value={value} onChange={(e) => onChange(e.target.value)} className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-black/25 px-4 text-sm text-white outline-none"/></label>; }
function TextArea({ label, value, onChange }: any) { return <label className="block rounded-2xl border border-white/8 bg-black/15 p-4"><span className="text-[8px] font-black uppercase text-white/30">{label}</span><textarea value={value} onChange={(e) => onChange(e.target.value)} rows={5} maxLength={4000} className="mt-3 w-full resize-y bg-transparent text-sm leading-6 text-white outline-none"/></label>; }
function TextBlock({ label, value }: any) { return <div className="rounded-2xl border border-white/8 bg-black/20 p-4"><p className="text-[7px] font-black uppercase text-white/25">{label}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/50">{value || "Sem registo."}</p></div>; }
function PreviewStat({ label, value }: any) { return <div className="min-w-[105px] rounded-2xl border border-white/8 bg-black/20 p-4 text-center"><p className="truncate text-lg font-black text-white">{value}</p><p className="mt-1 text-[7px] font-black uppercase text-white/25">{label}</p></div>; }
function StatusBadge({ status }: { status: EvaluationStatus }) { const tone = status === "APPROVED" ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300" : status === "REJECTED" ? "border-red-400/20 bg-red-500/10 text-red-300" : status === "CHANGES_REQUESTED" ? "border-orange-400/20 bg-orange-500/10 text-orange-300" : status === "DRAFT" ? "border-blue-400/20 bg-blue-500/10 text-blue-300" : "border-amber-400/20 bg-amber-500/10 text-amber-300"; return <span className={`inline-flex rounded-full border px-3 py-1 text-[7px] font-black uppercase ${tone}`}>{statusLabel(status)}</span>; }
function Feedback({ tone, message, onClose }: any) { const ok = tone === "success"; return <div className={`flex items-start justify-between gap-4 rounded-2xl border p-4 text-sm ${ok ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200" : "border-red-400/20 bg-red-500/10 text-red-200"}`}><div className="flex gap-3">{ok ? <CheckCircle2 className="h-5 w-5"/> : <AlertTriangle className="h-5 w-5"/>}<p>{message}</p></div><button onClick={onClose}><X className="h-4 w-4"/></button></div>; }
function LoadingState() { return <div className="flex min-h-[380px] items-center justify-center rounded-[2rem] border border-white/8 bg-[#06100c]/70"><Loader2 className="h-10 w-10 animate-spin text-primary"/></div>; }
function EmptyState() { return <div className="rounded-[2rem] border border-dashed border-white/10 p-12 text-center"><ClipboardCheck className="mx-auto h-10 w-10 text-white/15"/><h2 className="mt-4 text-xl font-black text-white">Sem avaliações</h2><p className="mt-2 text-sm text-white/30">Os registos aparecerão aqui automaticamente.</p></div>; }
