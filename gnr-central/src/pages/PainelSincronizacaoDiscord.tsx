import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Database, ExternalLink, Loader2, RefreshCw, RotateCcw, Trash2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type Job = { _id: string; type: "POINT_SYNC" | "CP_SYNC"; aggregateType: "POINT" | "CP"; aggregateId: string; status: string; attempts?: number; availableAt?: string; lockedAt?: string | null; lastError?: string | null; createdAt?: string; updatedAt?: string; aggregate?: { label?: string; status?: string; jumpUrl?: string | null } | null };

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

const statusTone: Record<string,string> = { PENDING: "border-yellow-400/20 bg-yellow-500/10 text-yellow-200", PROCESSING: "border-blue-400/20 bg-blue-500/10 text-blue-200", DONE: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200", FAILED: "border-red-400/20 bg-red-500/10 text-red-200", CANCELLED: "border-white/10 bg-white/5 text-muted-foreground" };
export default function PainelSincronizacaoDiscord() {
  const { toast } = useToast();
  const [items,setItems]=useState<Job[]>([]); const [status,setStatus]=useState("ALL"); const [type,setType]=useState("ALL"); const [loading,setLoading]=useState(true); const [busy,setBusy]=useState(false);
  async function load(){setLoading(true); try{const data=await api<{items:Job[]}>(`/admin/outbox?status=${status}&type=${type}`); setItems(data.items||[]);}catch(e){toast({title:"Erro ao carregar sincronização",description:e instanceof Error?e.message:undefined,variant:"destructive"});}finally{setLoading(false)}}
  useEffect(()=>{void load(); const id=window.setInterval(()=>void load(),10000); return()=>window.clearInterval(id)},[status,type]);
  async function retry(job:Job){setBusy(true); try{await api(`/admin/outbox/${job._id}/retry`,{method:"POST",body:JSON.stringify({})}); toast({title:"Tarefa reenviada para fila"}); await load();}catch(e){toast({title:"Erro ao tentar novamente",description:e instanceof Error?e.message:undefined,variant:"destructive"});}finally{setBusy(false)}}
  async function cancel(job:Job){const reason=window.prompt("Motivo para cancelar a tarefa:"); if(!reason)return; setBusy(true); try{await api(`/admin/outbox/${job._id}/cancel`,{method:"POST",body:JSON.stringify({reason})}); toast({title:"Tarefa cancelada"}); await load();}catch(e){toast({title:"Erro ao cancelar",description:e instanceof Error?e.message:undefined,variant:"destructive"});}finally{setBusy(false)}}
  async function clean(){if(!window.confirm("Limpar tarefas concluídas com mais de 7 dias?"))return; setBusy(true); try{const data=await api<{deletedCount:number}>(`/admin/outbox/clean`,{method:"POST",body:JSON.stringify({days:7})}); toast({title:"Limpeza concluída",description:`${data.deletedCount||0} tarefas removidas.`}); await load();}catch(e){toast({title:"Erro na limpeza",description:e instanceof Error?e.message:undefined,variant:"destructive"});}finally{setBusy(false)}}
  const counts=useMemo(()=>items.reduce((acc:any,j)=>{acc[j.status]=(acc[j.status]||0)+1;return acc},{}),[items]);
  return <div className="mx-auto max-w-7xl space-y-5 pb-[calc(env(safe-area-inset-bottom)+2rem)]"><section className={`${mobilePanel} bg-[#050b09]/80`}><div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p className="text-xs font-black uppercase tracking-[.2em] text-primary">Discord Sync</p><h1 className="mt-2 text-3xl font-black text-white sm:text-5xl">Painel de erros</h1><p className="mt-3 text-sm text-muted-foreground">Outbox, tentativas, erros e ações manuais de sincronização.</p></div><div className="flex flex-wrap gap-2"><Button onClick={()=>void load()} disabled={loading} className="min-h-11 rounded-2xl"><RefreshCw className={`mr-2 h-4 w-4 ${loading?'animate-spin':''}`} />Atualizar</Button><Button onClick={()=>void clean()} disabled={busy} variant="outline" className="min-h-11 rounded-2xl"><Trash2 className="mr-2 h-4 w-4" />Limpar DONE</Button></div></div><div className="mt-5 grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-5">{['PENDING','PROCESSING','FAILED','DONE','CANCELLED'].map(s=><b key={s} className={`rounded-2xl border p-3 ${statusTone[s]||statusTone.CANCELLED}`}>{s}<br />{counts[s]||0}</b>)}</div></section><section className={mobilePanel}><div className="grid gap-3 sm:grid-cols-2"><select value={status} onChange={e=>setStatus(e.target.value)} className="min-h-11 rounded-2xl border border-white/10 bg-black/50 px-4 text-white"><option value="ALL">Todos os estados</option><option>PENDING</option><option>PROCESSING</option><option>FAILED</option><option>DONE</option><option>CANCELLED</option></select><select value={type} onChange={e=>setType(e.target.value)} className="min-h-11 rounded-2xl border border-white/10 bg-black/50 px-4 text-white"><option value="ALL">Todos os tipos</option><option>POINT_SYNC</option><option>CP_SYNC</option></select></div></section><section className="grid gap-3">{loading?<div className={mobilePanel}><Loader2 className="mx-auto h-7 w-7 animate-spin text-primary" /></div>:items.map(job=><article key={job._id} className={`${mobilePanel} border-l-4 ${job.status==='FAILED'?'border-l-red-500':job.status==='DONE'?'border-l-emerald-500':'border-l-yellow-500'}`}><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap gap-2"><span className={`rounded-full border px-3 py-1 text-[10px] font-black ${statusTone[job.status]||statusTone.CANCELLED}`}>{job.status}</span><span className="rounded-full border border-white/10 px-3 py-1 text-[10px] font-black text-white">{job.type}</span></div><h3 className="mt-3 truncate text-lg font-black text-white">{job.aggregate?.label || `${job.aggregateType} ${job.aggregateId}`}</h3><p className="mt-1 text-xs text-muted-foreground">Tentativas: {job.attempts || 0} · Próxima: {fmtDate(job.availableAt)}</p></div><div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={()=>void retry(job)} className="min-h-11 rounded-xl"><RotateCcw className="mr-2 h-4 w-4" />Tentar</Button>{job.status!=='CANCELLED'&&job.status!=='DONE'&&<Button disabled={busy} onClick={()=>void cancel(job)} variant="destructive" className="min-h-11 rounded-xl"><XCircle className="mr-2 h-4 w-4" />Cancelar</Button>}{job.aggregate?.jumpUrl&&<a href={job.aggregate.jumpUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-xl border border-white/10 px-4 font-bold text-white"><ExternalLink className="mr-2 h-4 w-4" />Discord</a>}</div></div>{job.lastError&&<pre className="mt-4 overflow-x-auto rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-xs text-red-100">{job.lastError}</pre>}</article>)}{!loading&&items.length===0&&<div className={`${mobilePanel} text-center text-muted-foreground`}>Sem tarefas.</div>}</section></div>
}
