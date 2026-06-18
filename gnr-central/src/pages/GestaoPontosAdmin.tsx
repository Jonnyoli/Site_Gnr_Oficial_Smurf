import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Clock, Edit3, Loader2, RefreshCw, Search, ShieldCheck, Square, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

type Point = {
  _id: string;
  userId: string;
  status: "ABERTO" | "FECHADO";
  isPaused?: boolean;
  startTime: string;
  endTime?: string | null;
  durationMs?: number;
  source?: string;
  closeReason?: string | null;
  discord?: { publicJumpUrl?: string | null; sheetJumpUrl?: string | null; syncError?: string | null };
  user?: { name?: string; avatarUrl?: string | null; discordId?: string } | null;
};

const mobilePanel = "rounded-[1.6rem] border border-white/10 bg-black/25 p-4 sm:rounded-[2rem] sm:p-6";
function fmtDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-PT");
}
function fmtDuration(ms?: number) {
  const sec = Math.max(0, Math.floor(Number(ms || 0) / 1000));
  return [Math.floor(sec / 3600), Math.floor((sec % 3600) / 60), sec % 60].map((n) => String(n).padStart(2, "0")).join(":");
}
async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const base = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";
  const response = await fetch(`${base}/api/operational-sync${path}`, {
    credentials: "include",
    headers: { Accept: "application/json", ...(options?.body ? { "Content-Type": "application/json" } : {}) },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Erro ${response.status}`);
  return data;
}


export default function GestaoPontosAdmin() {
  const { toast } = useToast();
  const [items, setItems] = useState<Point[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");
  const [selected, setSelected] = useState<Point | null>(null);
  const [reason, setReason] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");

  async function load() {
    setLoading(true);
    try {
      const data = await api<{ items: Point[] }>(`/admin/points?status=${status}&q=${encodeURIComponent(q)}`);
      setItems(data.items || []);
    } catch (error) {
      toast({ title: "Erro ao carregar pontos", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); const id = window.setInterval(() => void load(), 15000); return () => window.clearInterval(id); }, [status]);

  function openEdit(point: Point) {
    setSelected(point);
    setReason("");
    setEditStart(point.startTime ? new Date(point.startTime).toISOString().slice(0,16) : "");
    setEditEnd(point.endTime ? new Date(point.endTime).toISOString().slice(0,16) : "");
  }

  async function closePoint(point: Point) {
    const motive = window.prompt(`Motivo para fechar o ponto de ${point.user?.name || point.userId}:`);
    if (!motive || motive.trim().length < 3) return;
    setBusy(true);
    try {
      await api(`/admin/points/${point._id}/close`, { method: "POST", body: JSON.stringify({ reason: motive.trim() }) });
      toast({ title: "Ponto fechado", description: "O encerramento ficou registado na auditoria." });
      await load();
    } catch (error) {
      toast({ title: "Erro ao fechar ponto", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
    } finally { setBusy(false); }
  }

  async function saveCorrection() {
    if (!selected) return;
    if (reason.trim().length < 3) {
      toast({ title: "Motivo obrigatório", description: "Indica o motivo da correção.", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      await api(`/admin/points/${selected._id}/times`, {
        method: "PATCH",
        body: JSON.stringify({ startTime: editStart ? new Date(editStart).toISOString() : undefined, endTime: editEnd ? new Date(editEnd).toISOString() : null, reason: reason.trim() }),
      });
      toast({ title: "Ponto corrigido", description: "A alteração ficou registada na auditoria." });
      setSelected(null);
      await load();
    } catch (error) {
      toast({ title: "Erro ao corrigir ponto", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
    } finally { setBusy(false); }
  }

  const stats = useMemo(() => ({ open: items.filter(i=>i.status==='ABERTO' && !i.isPaused).length, paused: items.filter(i=>i.status==='ABERTO' && i.isPaused).length, closed: items.filter(i=>i.status==='FECHADO').length }), [items]);

  return <div className="mx-auto max-w-7xl space-y-5 pb-[calc(env(safe-area-inset-bottom)+2rem)]">
    <section className={`${mobilePanel} bg-[#050b09]/80`}>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div><p className="text-xs font-black uppercase tracking-[.2em] text-primary">Comando / DRH</p><h1 className="mt-2 text-3xl font-black text-white sm:text-5xl">Gestão administrativa de pontos</h1><p className="mt-3 text-sm text-muted-foreground">Pesquisa, filtros, correções e fechos com auditoria obrigatória.</p></div>
        <Button onClick={() => void load()} disabled={loading} className="min-h-11 rounded-2xl"><RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin':''}`} />Atualizar</Button>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs sm:text-sm"><b className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-emerald-200">Abertos<br />{stats.open}</b><b className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-3 text-yellow-200">Pausados<br />{stats.paused}</b><b className="rounded-2xl border border-white/10 bg-white/5 p-3 text-white">Fechados<br />{stats.closed}</b></div>
    </section>

    <section className={mobilePanel}>
      <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]"><div className="relative"><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void load()}} placeholder="Procurar por militar, ID, posto..." className="min-h-11 rounded-2xl pl-11 text-base" /></div><select value={status} onChange={e=>setStatus(e.target.value)} className="min-h-11 rounded-2xl border border-white/10 bg-black/50 px-4 text-white"><option value="ALL">Todos</option><option value="ABERTO">Abertos</option><option value="PAUSADO">Pausados</option><option value="FECHADO">Fechados</option></select><Button onClick={() => void load()} className="min-h-11 rounded-2xl">Pesquisar</Button></div>
    </section>

    <section className="grid gap-3">
      {loading ? <div className={mobilePanel}><Loader2 className="mx-auto h-7 w-7 animate-spin text-primary" /></div> : items.map(point => <article key={point._id} className={`${mobilePanel} border-l-4 ${point.status==='ABERTO' ? point.isPaused ? 'border-l-yellow-400':'border-l-emerald-400':'border-l-white/30'}`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">{point.user?.avatarUrl ? <img src={point.user.avatarUrl} className="h-12 w-12 rounded-2xl object-cover" /> : <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5"><UserRound /></div>}<div className="min-w-0"><h3 className="truncate text-lg font-black text-white">{point.user?.name || point.userId}</h3><p className="truncate text-xs text-muted-foreground">{point.userId} · {point.source || '—'}</p></div></div>
          <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4 lg:min-w-[520px]"><Info label="Estado" value={point.isPaused ? 'Pausado' : point.status} /><Info label="Duração" value={fmtDuration(point.durationMs)} /><Info label="Entrada" value={fmtDate(point.startTime)} /><Info label="Saída" value={fmtDate(point.endTime)} /></div>
          <div className="flex flex-wrap gap-2"><Button onClick={()=>openEdit(point)} variant="outline" className="min-h-11 rounded-xl"><Edit3 className="mr-2 h-4 w-4" />Corrigir</Button>{point.status==='ABERTO' && <Button disabled={busy} onClick={()=>void closePoint(point)} variant="destructive" className="min-h-11 rounded-xl"><Square className="mr-2 h-4 w-4" />Fechar</Button>}</div>
        </div>
        {point.discord?.syncError && <p className="mt-3 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-xs text-red-200">Erro Discord: {point.discord.syncError}</p>}
      </article>)}
      {!loading && items.length===0 && <div className={`${mobilePanel} text-center text-muted-foreground`}>Sem resultados.</div>}
    </section>

    {selected && <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/80 p-3 backdrop-blur-md sm:p-6" onClick={()=>setSelected(null)}><div className="mx-auto flex min-h-[calc(100dvh-1.5rem)] max-w-2xl flex-col rounded-[1.5rem] border border-white/10 bg-[#07110d] p-4 shadow-2xl sm:min-h-0 sm:rounded-[2rem] sm:p-6" onClick={e=>e.stopPropagation()}><h2 className="text-2xl font-black text-white">Corrigir ponto</h2><p className="mt-1 text-sm text-muted-foreground">{selected.user?.name || selected.userId}</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="space-y-2 text-sm font-bold text-white">Entrada<Input type="datetime-local" value={editStart} onChange={e=>setEditStart(e.target.value)} className="text-base" /></label><label className="space-y-2 text-sm font-bold text-white">Saída<Input type="datetime-local" value={editEnd} onChange={e=>setEditEnd(e.target.value)} className="text-base" /></label></div><label className="mt-4 space-y-2 text-sm font-bold text-white">Motivo obrigatório<Input value={reason} onChange={e=>setReason(e.target.value)} placeholder="Ex.: erro no registo inicial" className="text-base" /></label><div className="mt-auto flex flex-col-reverse gap-2 pt-6 sm:flex-row sm:justify-end"><Button variant="outline" className="min-h-11 rounded-xl" onClick={()=>setSelected(null)}>Cancelar</Button><Button disabled={busy} className="min-h-11 rounded-xl" onClick={()=>void saveCorrection()}>Guardar correção</Button></div></div></div>}
  </div>;
}
function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-1 truncate font-bold text-white">{value}</p></div>; }
