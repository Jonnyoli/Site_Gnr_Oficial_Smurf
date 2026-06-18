import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardCheck, ExternalLink, History, Pause, Play, RefreshCw, Square } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

const API = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";

type AuditActor = {
  discordId: string;
  name: string;
  avatarUrl?: string | null;
};

type AuditItem = {
  action: string;
  byUserId: string;
  source: string;
  metadata?: Record<string, any>;
  createdAt: string;
  actor?: AuditActor | null;
};
type UserSummary = {
  id: string;
  discordId: string;
  name: string;
  avatarUrl?: string | null;
};

type Point = {
  _id: string;
  userId: string;
  user?: UserSummary | null;
  startTime: string;
  endTime?: string | null;
  status: "ABERTO" | "FECHADO";
  isPaused: boolean;
  lastPauseTime?: string | null;
  totalPauseTime?: number;
  tipo?: string;
  descricao?: string | null;
  source?: string;
  closedBy?: string | null;
  closeReason?: string | null;
  discord?: { publicJumpUrl?: string | null; syncError?: string | null; lastSyncedAt?: string | null };
};
type MeResponse = {
  point?: Point | null;
  isMilitar?: boolean;
  permissions?: { canViewAllPoints?: boolean; canCloseOtherPoints?: boolean; canViewFullAudit?: boolean };
};

async function request<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(`${API}/api/operational-sync${path}`, {
    method,
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || `Erro ${response.status}`);
  return data as T;
}

function effectiveDuration(point: Point | null, now: number) {
  if (!point) return 0;
  const end = point.endTime ? new Date(point.endTime).getTime() : now;
  let paused = Number(point.totalPauseTime || 0);
  if (point.isPaused && point.lastPauseTime) paused += now - new Date(point.lastPauseTime).getTime();
  return Math.max(0, end - new Date(point.startTime).getTime() - paused);
}

function durationLabel(milliseconds: number) {
  const seconds = Math.floor(milliseconds / 1000);
  return [Math.floor(seconds / 3600), Math.floor((seconds % 3600) / 60), seconds % 60]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

const formatDate = (value?: string | null) => value ? new Date(value).toLocaleString("pt-PT") : "—";
const actionLabel = (action: string) => ({
  POINT_STARTED: "Ponto iniciado",
  POINT_PAUSED: "Ponto pausado",
  POINT_RESUMED: "Ponto retomado",
  POINT_CLOSE_REQUESTED: "Encerramento solicitado",
  POINT_CLOSED: "Ponto terminado",
  POINT_ADMIN_CLOSE_REQUESTED: "Encerramento administrativo solicitado",
  POINT_ADMIN_CLOSED: "Ponto encerrado pelo Comando/DRH",
  POINT_LINKED_TO_CP: "Ponto associado a CP",
  POINT_UNLINKED_FROM_CP: "Ponto removido da CP",
  POINT_SYNCED: "Sincronizado com Discord",
  POINT_SYNC_FAILED: "Falha na sincronização",
}[action] || action);

export default function FolhaPonto() {
  const { toast } = useToast();
  const [point, setPoint] = useState<Point | null>(null);
  const [history, setHistory] = useState<Point[]>([]);
  const [openPoints, setOpenPoints] = useState<Point[]>([]);
  const [auditItems, setAuditItems] = useState<AuditItem[]>([]);
  const [permissions, setPermissions] = useState<MeResponse["permissions"]>({});
  const [isMilitar, setIsMilitar] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [confirmClose, setConfirmClose] = useState(false);

  const load = useCallback(async () => {
    try {
      const [me, previous] = await Promise.all([
        request<MeResponse>("/me"),
        request<{ items: Point[] }>("/points/history"),
      ]);
      setPoint(me.point || null);
      setHistory(previous.items || []);
      setPermissions(me.permissions || {});
      setIsMilitar(me.isMilitar !== false);
      if (me.permissions?.canViewAllPoints) {
        const admin = await request<{ items: Point[] }>("/points/open");
        setOpenPoints(admin.items || []);
      } else setOpenPoints([]);
    } catch (error) {
      toast({ title: "Erro ao carregar o ponto", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
    const refresh = window.setInterval(() => document.visibilityState === "visible" && void load(), 10_000);
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    return () => { window.clearInterval(refresh); window.clearInterval(clock); };
  }, [load]);

  useEffect(() => {
    async function loadAudit() {
      if (!point) return void setAuditItems([]);
      try {
        const data = await request<{ items: AuditItem[] }>(`/points/${point._id}/audit`);
        setAuditItems(data.items || []);
      } catch {
        setAuditItems([]);
      }
    }
    void loadAudit();
  }, [point?._id]);

  async function action(path: string, body?: unknown, success = "Ação concluída") {
    setBusy(true);
    try {
      await request(path, "POST", body || {});
      toast({ title: success });
      await load();
    } catch (error) {
      toast({ title: "Não foi possível concluir", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  const state = useMemo(() => !point ? "Fora de serviço" : point.isPaused ? "Em pausa" : "Em serviço", [point]);
  const stateTone = !point ? "border-white/10 bg-black/20" : point.isPaused ? "border-yellow-400/20 bg-yellow-500/[0.06]" : "border-emerald-400/20 bg-emerald-500/[0.06]";
  const effective = durationLabel(effectiveDuration(point, now));

  return (
    <div className="space-y-6 pb-10">
      <section className={["rounded-[2.5rem] border p-7 shadow-2xl backdrop-blur-xl", stateTone].join(" ")}>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3 text-primary"><ClipboardCheck /><span className="text-xs font-black uppercase tracking-[.22em]">Folha de ponto</span></div>
            <h1 className="mt-3 text-4xl font-black text-white">{state}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">O site altera o mesmo registo e a mesma mensagem do Discord. A integração não cria um segundo ponto.</p>
            {!isMilitar && <div className="mt-5 flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-200"><AlertTriangle className="h-5 w-5" />Já não possuis a tag Guarda Nacional Republicana.</div>}
          </div>
          <div className="grid grid-cols-2 gap-3"><Stat label="Tempo efetivo" value={effective} /><Stat label="Pausas" value={durationLabel(Number(point?.totalPauseTime || 0))} /></div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {!point && <button disabled={busy || loading || !isMilitar} onClick={() => void action("/points/start", {}, "Ponto iniciado")} className="action-primary"><Play className="h-4 w-4" />Iniciar ponto</button>}
          {point && !point.isPaused && <button disabled={busy} onClick={() => void action("/points/pause", {}, "Ponto pausado")} className="action-yellow"><Pause className="h-4 w-4" />Pausar</button>}
          {point?.isPaused && <button disabled={busy} onClick={() => void action("/points/resume", {}, "Ponto retomado")} className="action-green"><Play className="h-4 w-4" />Retomar</button>}
          {point && <button disabled={busy} onClick={() => setConfirmClose(true)} className="action-red"><Square className="h-4 w-4" />Terminar</button>}
          <button disabled={busy} onClick={() => void load()} className="action-neutral"><RefreshCw className="h-4 w-4" />Atualizar</button>
          {point?.discord?.publicJumpUrl && <a href={point.discord.publicJumpUrl} target="_blank" rel="noreferrer" className="action-neutral"><ExternalLink className="h-4 w-4" />Discord</a>}
        </div>

        {point?.discord?.syncError && <div className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200">Erro de sincronização com o Discord: {point.discord.syncError}</div>}
      </section>

      {point && (
        <section className="rounded-[2rem] border border-white/10 bg-black/25 p-6">
          <div className="flex items-center gap-2"><History className="h-5 w-5 text-primary" /><h2 className="text-xl font-black text-white">Auditoria do ponto atual</h2></div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {auditItems
              .slice()
              .reverse()
              .map((item, index) => (
                <article
                  key={`${item.createdAt}-${index}`}
                  className="rounded-2xl border border-white/10 bg-black/20 p-4"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />

                    <p className="font-bold text-white">
                      {actionLabel(
                        item.action,
                      )}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center gap-3">
                    {item.actor?.avatarUrl ? (
                      <img
                        src={
                          item.actor.avatarUrl
                        }
                        alt=""
                        className="h-9 w-9 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-xs font-black text-primary">
                        {(item.actor?.name ||
                          "SI")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                    )}

                    <div>
                      <p className="text-sm font-bold text-white">
                        {item.actor?.name ||
                          item.metadata?.actorName ||
                          item.byUserId ||
                          "Sistema"}
                      </p>

                      <p className="text-xs text-muted-foreground">
                        {formatDate(
                          item.createdAt,
                        )}{" "}
                        · {item.source}
                      </p>
                    </div>
                  </div>

                  {item.metadata?.reason && (
                    <p className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-muted-foreground">
                      Motivo:{" "}
                      <span className="text-white">
                        {String(
                          item.metadata.reason,
                        )}
                      </span>
                    </p>
                  )}

                  {item.metadata &&
                    Object.keys(
                      item.metadata,
                    ).some(
                      (key) =>
                        ![
                          "actorName",
                          "actorRoles",
                          "ip",
                          "userAgent",
                          "reason",
                        ].includes(key),
                    ) && (
                    <details className="mt-3 text-xs text-muted-foreground">
                      <summary className="cursor-pointer font-bold text-white/70">
                        Ver detalhes
                      </summary>

                      <pre className="mt-2 overflow-x-auto rounded-xl border border-white/10 bg-black/30 p-3 text-[11px]">
                        {JSON.stringify(
                          item.metadata,
                          null,
                          2,
                        )}
                      </pre>
                    </details>
                  )}
                </article>
              ))}
          </div>
        </section>
      )}

      {permissions?.canViewAllPoints && openPoints.length > 0 && (
        <section className="rounded-[2rem] border border-white/10 bg-black/25 p-6">
          <h2 className="text-xl font-black text-white">
              Pontos abertos
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Encerramento administrativo reservado ao Comando-Geral e DRH.
            </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{openPoints.map((openPoint) => <article key={openPoint._id} className="rounded-2xl border border-white/10 p-4"><div className="flex items-center gap-3">
                    {openPoint.user?.avatarUrl ? (
                      <img
                        src={openPoint.user.avatarUrl}
                        alt=""
                        className="h-11 w-11 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/5 text-sm font-black text-primary">
                        {(openPoint.user?.name ||
                          openPoint.userId)
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                    )}

                    <div className="min-w-0">
                      <p className="truncate font-bold text-white">
                        {openPoint.user?.name ||
                          openPoint.userId}
                      </p>

                      {openPoint.user?.name && (
                        <p className="truncate text-xs text-muted-foreground">
                          {openPoint.userId}
                        </p>
                      )}
                    </div>
                  </div>

                  <p className="mt-3 font-mono text-2xl font-black text-primary">
                    {durationLabel(
                      effectiveDuration(
                        openPoint,
                        now,
                      ),
                    )}
                  </p><p className="mt-2 text-xs text-muted-foreground">{openPoint.isPaused ? "Em pausa" : "Em serviço"}</p>{permissions?.canCloseOtherPoints && <button type="button" onClick={() => void action(`/points/${openPoint._id}/admin-close`, { reason: "Encerrado pelo Comando-Geral no site" }, "Ponto encerrado")} className="mt-4 action-red">Terminar</button>}</article>)}</div>
        </section>
      )}

      <section className="rounded-[2rem] border border-white/10 bg-black/25 p-6">
        <h2 className="text-xl font-black text-white">Histórico pessoal</h2>
        <div className="mt-4 space-y-3">{history.map((item) => <article key={item._id} className="grid gap-4 rounded-2xl border border-white/10 bg-black/20 p-4 md:grid-cols-5"><Info label="Estado" value={item.status} /><Info label="Início" value={formatDate(item.startTime)} /><Info label="Fim" value={formatDate(item.endTime)} /><Info label="Tempo" value={durationLabel(effectiveDuration(item, now))} /><Info label="Origem" value={item.source || "—"} />{item.closeReason && <div className="md:col-span-5"><Info label="Motivo" value={item.closeReason} /></div>}</article>)}{!history.length && <p className="text-sm text-muted-foreground">Ainda não existem registos de ponto.</p>}</div>
      </section>

      <AlertDialog open={confirmClose} onOpenChange={setConfirmClose}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Terminar o ponto?</AlertDialogTitle><AlertDialogDescription>O tempo será fechado e a mensagem original do Discord ficará atualizada.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Voltar</AlertDialogCancel><AlertDialogAction onClick={() => void action("/points/close", { reason: "Terminado pelo utilizador no site" }, "Ponto terminado")} className="bg-red-600 hover:bg-red-700">Terminar ponto</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <style>{`.action-primary,.action-yellow,.action-green,.action-red,.action-neutral{display:inline-flex;align-items:center;gap:.5rem;border-radius:1rem;padding:.75rem 1.25rem;font-weight:800;transition:.2s ease}.action-primary{background:hsl(var(--primary));color:hsl(var(--primary-foreground))}.action-yellow{border:1px solid rgba(250,204,21,.30);background:rgba(250,204,21,.10);color:rgb(254,240,138)}.action-green{border:1px solid rgba(52,211,153,.30);background:rgba(52,211,153,.10);color:rgb(167,243,208)}.action-red{border:1px solid rgba(248,113,113,.30);background:rgba(248,113,113,.10);color:rgb(254,202,202)}.action-neutral{border:1px solid rgba(255,255,255,.10);color:white}button:disabled{opacity:.5;cursor:not-allowed}`}</style>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) { return <div className="min-w-[180px] rounded-3xl border border-white/10 bg-black/25 px-6 py-5 text-center"><p className="text-xs font-black uppercase tracking-[.2em] text-muted-foreground">{label}</p><p className="mt-2 font-mono text-3xl font-black text-white">{value}</p></div>; }
function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-xs font-black uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-1 text-sm font-bold text-white">{value}</p></div>; }
