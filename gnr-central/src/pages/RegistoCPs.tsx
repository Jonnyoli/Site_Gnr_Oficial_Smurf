import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Check, ChevronDown, ExternalLink, History, Pencil, Plus, RefreshCw, Route, Search, Trash2, UserCog, UserPlus, UserRound, Users, XCircle } from "lucide-react";
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

type CPMember = {
  userId: string;
  user?: UserSummary | null;
  active: boolean;
  joinedAt?: string;
  leftAt?: string | null;
  role?: "MEMBER" | "COMMANDER_PATROL";
};
type CP = {
  _id: string;
  number: string;
  commanderId?: string | null;
  commander?: UserSummary | null;
  commanderPatrols?: boolean;
  vehicle: string;
  zone?: string | null;
  status: "ABERTO" | "FECHADO" | "CANCELADO";
  startTime: string;
  endTime?: string | null;
  members?: CPMember[];
  source?: string;
  permissions?: { canManage?: boolean; canClose?: boolean; canCancel?: boolean; canViewAudit?: boolean };
  discord?: { jumpUrl?: string | null; syncError?: string | null; lastSyncedAt?: string | null };
};
type Militar = { id: string; discordId: string; name: string; avatarUrl?: string | null };
type Vehicle = { id: string; nome: string; categoria?: string | null; matricula?: string | null; unidade?: string | null };
type FormState = {
  number: string;
  commanderId: string;
  memberIds: string[];
  vehicle: string;
  zone: string;
};

type ConfirmAction = { cpId: string; cancel: boolean } | null;

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

const initialForm = (): FormState => ({
  number: "",
  commanderId: "",
  memberIds: [],
  vehicle: "",
  zone: "",
});
const formatDate = (value?: string | null) => value ? new Date(value).toLocaleString("pt-PT") : "—";
const actionLabel = (action: string) => ({
  CP_CREATED: "CP criada",
  CP_CLOSED: "CP fechada",
  CP_CANCELLED: "CP cancelada",
  CP_MEMBER_ADDED: "Participante adicionado",
  CP_MEMBER_REMOVED: "Participante removido",
  CP_COMMANDER_CHANGED: "Comandante alterado",
  CP_VEHICLE_CHANGED: "Viatura alterada",
  CP_ZONE_CHANGED: "Zona alterada",
  CP_SYNCED: "Sincronizada com Discord",
  CP_SYNC_FAILED: "Falha na sincronização",
  POINT_STARTED: "Ponto iniciado pela CP",
  POINT_CLOSED: "Ponto encerrado pela CP",
}[action] || action);

export default function RegistoCPs() {
  const { toast } = useToast();
  const [items, setItems] = useState<CP[]>([]);
  const [militares, setMilitares] = useState<Militar[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [form, setForm] = useState<FormState>(initialForm());
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [participantSearch, setParticipantSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ABERTO");
  const [selectedCP, setSelectedCP] = useState<CP | null>(null);
  const [auditItems, setAuditItems] = useState<AuditItem[]>([]);
  const [newMemberId, setNewMemberId] = useState("");
  const [editVehicle, setEditVehicle] = useState("");
  const [editZone, setEditZone] = useState("");
  const [editCommander, setEditCommander] = useState("");
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

  const load = useCallback(async () => {
    try {
      const [cpData, militaryData, vehicleData] = await Promise.all([
        request<{ items: CP[] }>("/cps"),
        request<{ items: Militar[] }>("/militares"),
        request<{ items: Vehicle[] }>("/vehicles"),
      ]);
      setItems(Array.isArray(cpData.items) ? cpData.items : []);
      setMilitares(Array.isArray(militaryData.items) ? militaryData.items : []);
      setVehicles(Array.isArray(vehicleData.items) ? vehicleData.items : []);
    } catch (error) {
      toast({ title: "Erro ao carregar", description: error instanceof Error ? error.message : "Não foi possível carregar as CPs.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => document.visibilityState === "visible" && void load(), 10_000);
    return () => window.clearInterval(interval);
  }, [load]);

  const militaryMap = useMemo(() => new Map(militares.map((militar) => [militar.discordId, militar])), [militares]);
  const militaryName = (
    discordId?: string | null,
    embedded?: UserSummary | null,
  ) =>
    embedded?.name ||
    (
      discordId
        ? militaryMap.get(discordId)?.name ||
          discordId
        : "—"
    );

  const militaryAvatar = (
    discordId?: string | null,
    embedded?: UserSummary | null,
  ) =>
    embedded?.avatarUrl ||
    (
      discordId
        ? militaryMap.get(discordId)?.avatarUrl ||
          null
        : null
    );

  const availableParticipants = useMemo(() => {
    const term = participantSearch.trim().toLowerCase();

    return militares
      .filter((militar) => {
        if (!term) return true;

        return [
          militar.name,
          militar.discordId,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value)
              .toLowerCase()
              .includes(term),
          );
      });
  }, [
    militares,
    participantSearch,
  ]);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((cp) => {
      const matchesStatus = statusFilter === "TODOS" || cp.status === statusFilter;
      const searchable = [
        cp.number,
        cp.vehicle,
        cp.zone,
        cp.status,
        militaryName(cp.commanderId),
        ...(cp.members || []).map((member) => militaryName(member.userId)),
      ].filter(Boolean).join(" ").toLowerCase();
      return matchesStatus && (!term || searchable.includes(term));
    });
  }, [items, search, statusFilter, militaryMap]);

  function toggleMember(discordId: string) {
    setForm((current) => ({
      ...current,
      memberIds: current.memberIds.includes(discordId)
        ? current.memberIds.filter((id) => id !== discordId)
        : [...current.memberIds, discordId],
    }));
  }

  async function createCP(event: FormEvent) {
    event.preventDefault();
    if (!form.commanderId) return void toast({ title: "Seleciona o comandante", variant: "destructive" });
    if (form.memberIds.length < 2) return void toast({ title: "Participantes insuficientes", description: "Seleciona pelo menos dois participantes.", variant: "destructive" });
    if (!form.vehicle) return void toast({ title: "Seleciona a viatura", variant: "destructive" });

    setBusy(true);
    try {
      const data = await request<{ cp: CP }>("/cps", "POST", {
        number: form.number || undefined,
        commanderId: form.commanderId,
        memberIds: form.memberIds,
        vehicle: form.vehicle,
        zone: form.zone || undefined,
      });
      toast({ title: `CP ${data.cp.number} criada`, description: "A sincronização com o Discord foi colocada em fila." });
      setForm(initialForm());
      setParticipantSearch("");
      await load();
    } catch (error) {
      toast({ title: "Não foi possível criar a CP", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function mutate(path: string, method: "POST" | "PATCH" | "DELETE", body?: unknown, success = "Alteração concluída") {
    setBusy(true);
    try {
      await request(path, method, body);
      toast({ title: success });
      await load();
      if (selectedCP) {
        const fresh = await request<{ items: CP[] }>("/cps");
        const updated = fresh.items.find((cp) => cp._id === selectedCP._id);
        if (updated) setSelectedCP(updated);
      }
    } catch (error) {
      toast({ title: "Não foi possível concluir", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function openManage(cp: CP) {
    setSelectedCP(cp);
    setNewMemberId("");
    setEditVehicle(cp.vehicle);
    setEditZone(cp.zone || "");
    setEditCommander(cp.commanderId || "");
    setAuditItems([]);
    if (cp.permissions?.canViewAudit) {
      try {
        const data = await request<{ items: AuditItem[] }>(`/cps/${cp._id}/audit`);
        setAuditItems(data.items || []);
      } catch {
        setAuditItems([]);
      }
    }
  }

  async function confirmClose() {
    if (!confirmAction) return;
    const { cpId, cancel } = confirmAction;
    setConfirmAction(null);
    await mutate(`/cps/${cpId}/close`, "POST", { cancel }, cancel ? "CP cancelada" : "CP fechada");
    setSelectedCP(null);
  }

  const activeCount = items.filter((cp) => cp.status === "ABERTO").length;

  return (
    <div className="space-y-6 pb-10">
      <section className="rounded-[2.5rem] border border-primary/15 bg-black/35 p-7 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-3 text-primary"><Route /><span className="text-xs font-black uppercase tracking-[.22em]">Central de patrulhamento</span></div>
            <h1 className="mt-3 text-4xl font-black text-white">Companhias de patrulha</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">Viaturas oficiais, participantes, comandantes, auditoria e sincronização com a mensagem original do Discord.</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Metric label="Ativas" value={activeCount} />
            <Metric label="Militares" value={militares.length} />
            <Metric label="Viaturas" value={vehicles.length} />
          </div>
        </div>

        <form onSubmit={createCP} className="mt-7 space-y-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Número"><input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} placeholder="Automático" className="field" /></Field>
            <Field label="Comandante">
              <div className="space-y-2">
                <SearchableMilitarySelect
                  value={form.commanderId}
                  militares={militares}
                  placeholder="Procurar comandante..."
                  onChange={(commanderId) =>
                    setForm((current) => ({
                      ...current,
                      commanderId,
                    }))
                  }
                />

              </div>
            </Field>
            <Field label="Viatura">
              <select required value={form.vehicle} onChange={(e) => setForm({ ...form, vehicle: e.target.value })} className="field bg-black/80">
                <option value="">Selecionar</option>
                {vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.nome}>{vehicle.nome}</option>)}
              </select>
            </Field>
            <Field label="Zona"><input value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })} placeholder="Zona de patrulhamento" className="field" /></Field>
          </div>

          <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
            <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />

                  <h2 className="font-black text-white">
                    Participantes
                  </h2>
                </div>

                <p className="mt-1 text-sm text-muted-foreground">
                  {form.memberIds.length} selecionados · seleciona também o comandante aqui para contar horas
                </p>
              </div>

              <div className="relative w-full md:max-w-md">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <input
                  value={participantSearch}
                  onChange={(event) =>
                    setParticipantSearch(
                      event.target.value,
                    )
                  }
                  placeholder="Procurar participante por nome ou ID..."
                  className="field py-3 pl-11 pr-4"
                />
              </div>
            </div>

            <div className="grid max-h-[320px] gap-3 overflow-y-auto md:grid-cols-2 xl:grid-cols-3">
              {availableParticipants.map((militar) => {
                const selected =
                  form.memberIds.includes(
                    militar.discordId,
                  );

                return (
                  <button
                    type="button"
                    key={militar.discordId}
                    onClick={() =>
                      toggleMember(
                        militar.discordId,
                      )
                    }
                    className={[
                      "flex items-center gap-3 rounded-2xl border p-3 text-left transition",
                      selected
                        ? "border-primary/50 bg-primary/15"
                        : "border-white/10 bg-black/20 hover:border-white/20",
                    ].join(" ")}
                  >
                    <Avatar
                      src={militar.avatarUrl}
                    />

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-white">
                        {militar.name}
                      </p>

                      <p className="truncate text-xs text-muted-foreground">
                        {militar.discordId}
                      </p>
                    </div>

                    {selected && (
                      <Check className="h-5 w-5 text-primary" />
                    )}
                  </button>
                );
              })}

              {availableParticipants.length === 0 && (
                <div className="col-span-full rounded-2xl border border-dashed border-white/10 p-8 text-center">
                  <Search className="mx-auto h-6 w-6 text-muted-foreground" />

                  <p className="mt-3 text-sm font-bold text-white">
                    Nenhum militar encontrado
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Pesquisa por outro nome ou ID.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end"><button disabled={busy || loading} className="inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 font-black text-primary-foreground disabled:opacity-50"><Plus className="h-5 w-5" />Criar CP</button></div>
        </form>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-black/25 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div><h2 className="text-xl font-black text-white">Registo operacional</h2><p className="mt-1 text-sm text-muted-foreground">Pesquisa, filtros e gestão completa.</p></div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar..." className="field pl-10" /></div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="field bg-black/80"><option value="ABERTO">Ativas</option><option value="FECHADO">Fechadas</option><option value="CANCELADO">Canceladas</option><option value="TODOS">Todas</option></select>
            <button type="button" onClick={() => void load()} className="rounded-2xl border border-white/10 p-3 text-white"><RefreshCw className={["h-4 w-4", loading ? "animate-spin" : ""].join(" ")} /></button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {filteredItems.map((cp) => {
            const activeMembers = (cp.members || []).filter(
              (member) => member.active,
            );

            const commanderIsPatrolling =
              activeMembers.some(
                (member) =>
                  member.userId === cp.commanderId,
              );

            return (
              <article key={cp._id} className={["rounded-3xl border p-5", cp.status === "ABERTO" ? "border-emerald-400/20 bg-emerald-500/[0.04]" : "border-white/10 bg-black/20"].join(" ")}>
                <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.2em] text-primary">CP {cp.number}</p><h3 className="mt-2 text-2xl font-black text-white">{cp.vehicle}</h3><p className="mt-1 text-sm text-muted-foreground">{cp.zone || "Zona não definida"}</p></div><span className="rounded-full border border-white/10 px-3 py-1 text-xs font-black text-white">{cp.status}</span></div>
                <div className="mt-5 space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <PersonLine
                      avatar={militaryAvatar(
                        cp.commanderId,
                        cp.commander,
                      )}
                      title="Comandante"
                      name={militaryName(
                        cp.commanderId,
                        cp.commander,
                      )}
                    />

                    <span
                      className={[
                        "rounded-full border px-3 py-1 text-[10px] font-black uppercase",
                        commanderIsPatrolling
                          ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                          : "border-blue-400/30 bg-blue-400/10 text-blue-200",
                      ].join(" ")}
                    >
                      {commanderIsPatrolling
                        ? "A patrulhar"
                        : "Apenas comando"}
                    </span>
                  </div>
                  <div><p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Participantes ativos</p><div className="mt-2 flex flex-wrap gap-2">{activeMembers.map((member) => <span key={member.userId} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white">{militaryName(
                                member.userId,
                                member.user,
                              )}</span>)}{!activeMembers.length && <span className="text-sm text-muted-foreground">Sem participantes ativos.</span>}</div></div>
                  <p className="text-sm text-muted-foreground">Início: <span className="text-white">{formatDate(cp.startTime)}</span></p>
                  {cp.discord?.syncError && <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-200">Erro de sincronização: {cp.discord.syncError}</div>}
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  {(cp.permissions?.canManage || cp.permissions?.canViewAudit) && <button type="button" onClick={() => void openManage(cp)} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 font-bold text-white"><Pencil className="h-4 w-4" />Gerir</button>}
                  {cp.status === "ABERTO" && cp.permissions?.canClose && <button type="button" onClick={() => setConfirmAction({ cpId: cp._id, cancel: false })} className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 font-bold text-emerald-200">Fechar</button>}
                  {cp.status === "ABERTO" && cp.permissions?.canCancel && <button type="button" onClick={() => setConfirmAction({ cpId: cp._id, cancel: true })} className="inline-flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-2 font-bold text-red-200"><XCircle className="h-4 w-4" />Cancelar</button>}
                  {cp.discord?.jumpUrl && <a href={cp.discord.jumpUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 font-bold text-white"><ExternalLink className="h-4 w-4" />Discord</a>}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {selectedCP && (
        <div className="fixed inset-0 z-40 overflow-y-auto bg-black/80 p-4 backdrop-blur-sm">
          <div className="mx-auto my-8 max-w-5xl rounded-[2rem] border border-white/10 bg-[#07110d] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.2em] text-primary">Gestão da CP</p><h2 className="mt-2 text-3xl font-black text-white">CP {selectedCP.number}</h2></div><button type="button" onClick={() => setSelectedCP(null)} className="rounded-xl border border-white/10 p-2 text-white"><XCircle className="h-5 w-5" /></button></div>

            {selectedCP.permissions?.canManage && (
              <div className="mt-6 grid gap-5 lg:grid-cols-2">
                <ManageCard title="Trocar comandante" icon={UserCog}>
                  <SearchableMilitarySelect
                    value={editCommander}
                    militares={militares}
                    placeholder="Procurar novo comandante..."
                    onChange={setEditCommander}
                  />


                  <ActionButton
                    disabled={busy}
                    onClick={() =>
                      void mutate(
                        `/cps/${selectedCP._id}/commander`,
                        "PATCH",
                        {
                          commanderId: editCommander,
                        },
                        "Comandante alterado",
                      )
                    }
                  >
                    Guardar comandante
                  </ActionButton>
                </ManageCard>

                <ManageCard title="Viatura e zona" icon={Route}>
                  <select value={editVehicle} onChange={(e) => setEditVehicle(e.target.value)} className="field bg-black/80">{vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.nome}>{vehicle.nome}</option>)}</select>
                  <input value={editZone} onChange={(e) => setEditZone(e.target.value)} placeholder="Zona" className="field" />
                  <div className="flex flex-wrap gap-2"><ActionButton disabled={busy} onClick={() => void mutate(`/cps/${selectedCP._id}/vehicle`, "PATCH", { vehicle: editVehicle }, "Viatura alterada")}>Guardar viatura</ActionButton><ActionButton disabled={busy} onClick={() => void mutate(`/cps/${selectedCP._id}/zone`, "PATCH", { zone: editZone }, "Zona alterada")}>Guardar zona</ActionButton></div>
                </ManageCard>

                <ManageCard title="Adicionar participante" icon={UserPlus}>
                  <select value={newMemberId} onChange={(e) => setNewMemberId(e.target.value)} className="field bg-black/80"><option value="">Selecionar militar</option>{militares.filter((militar) => militar.discordId !== selectedCP.commanderId && !(selectedCP.members || []).some((member) => member.active && member.userId === militar.discordId)).map((militar) => <option key={militar.discordId} value={militar.discordId}>{militar.name}</option>)}</select>
                  <ActionButton disabled={busy || !newMemberId} onClick={() => void mutate(`/cps/${selectedCP._id}/members`, "POST", { memberId: newMemberId }, "Participante adicionado")}>Adicionar</ActionButton>
                </ManageCard>

                <ManageCard title="Participantes" icon={Users}>
                  <div className="space-y-2">{(selectedCP.members || []).filter((member) => member.active).map((member) => <div key={member.userId} className="flex items-center gap-3 rounded-2xl border border-white/10 p-3"><Avatar src={militaryAvatar(
                                  member.userId,
                                  member.user,
                                )} /><div className="min-w-0 flex-1"><p className="truncate font-bold text-white">{militaryName(
                                member.userId,
                                member.user,
                              )}</p><p className="text-xs text-muted-foreground">Entrada: {formatDate(member.joinedAt)}</p></div><button type="button" disabled={busy} onClick={() => void mutate(`/cps/${selectedCP._id}/members/${member.userId}`, "DELETE", undefined, "Participante removido")} className="rounded-xl border border-red-400/20 p-2 text-red-300"><Trash2 className="h-4 w-4" /></button></div>)}</div>
                </ManageCard>
              </div>
            )}

            {selectedCP.permissions?.canViewAudit && (
              <div className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-5">
                <div className="flex items-center gap-2"><History className="h-5 w-5 text-primary" /><h3 className="font-black text-white">Histórico e auditoria</h3></div>
                <div className="mt-4 space-y-3">
                  {auditItems
                    .slice()
                    .reverse()
                    .map(
                      (
                        item,
                        index,
                      ) => (
                        <div
                          key={`${item.createdAt}-${index}`}
                          className="rounded-2xl border border-white/10 p-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-bold text-white">
                              {actionLabel(
                                item.action,
                              )}
                            </p>

                            <span className="text-xs text-muted-foreground">
                              {formatDate(
                                item.createdAt,
                              )}
                            </span>
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
                                  militaryName(
                                    item.byUserId,
                                  )}
                              </p>

                              <p className="text-xs text-muted-foreground">
                                {item.source}
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
                        </div>
                      ),
                    )}

                  {!auditItems.length && (
                    <p className="text-sm text-muted-foreground">
                      Sem eventos de auditoria.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <AlertDialog open={Boolean(confirmAction)} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{confirmAction?.cancel ? "Cancelar esta CP?" : "Fechar esta CP?"}</AlertDialogTitle><AlertDialogDescription>Os pontos associados serão encerrados e a mensagem original do Discord será atualizada.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Voltar</AlertDialogCancel><AlertDialogAction onClick={() => void confirmClose()} className={confirmAction?.cancel ? "bg-red-600 hover:bg-red-700" : ""}>Confirmar</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <style>{`.field{width:100%;border-radius:1rem;border:1px solid rgba(255,255,255,.10);background:rgba(0,0,0,.30);padding:.75rem 1rem;color:white;outline:none}.field:focus{border-color:hsl(var(--primary)/.55)}`}</style>
    </div>
  );
}


function SearchableMilitarySelect({
  value,
  militares,
  placeholder,
  onChange,
}: {
  value: string;
  militares: Militar[];
  placeholder: string;
  onChange: (discordId: string) => void;
}) {
  const wrapperRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const [open, setOpen] =
    useState(false);

  const [query, setQuery] =
    useState("");

  const selected =
    militares.find(
      (militar) =>
        militar.discordId ===
        value,
    );

  useEffect(() => {
    if (!open) {
      setQuery(
        selected?.name || "",
      );
    }
  }, [
    selected?.name,
    open,
  ]);

  useEffect(() => {
    function handleOutside(
      event: MouseEvent,
    ) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(
          event.target as Node,
        )
      ) {
        setOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutside,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutside,
      );
    };
  }, []);

  const results =
    useMemo(() => {
      const term =
        query
          .trim()
          .toLowerCase();

      if (
        !term ||
        term ===
          selected?.name
            ?.toLowerCase()
      ) {
        return militares;
      }

      return militares.filter(
        (militar) =>
          [
            militar.name,
            militar.discordId,
          ]
            .filter(Boolean)
            .some((candidate) =>
              String(candidate)
                .toLowerCase()
                .includes(term),
            ),
      );
    }, [
      militares,
      query,
      selected?.name,
    ]);

  return (
    <div
      ref={wrapperRef}
      className="relative"
    >
      <Search className="pointer-events-none absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

      <input
        value={query}
        onFocus={() => {
          setOpen(true);

          if (selected) {
            setQuery("");
          }
        }}
        onChange={(event) => {
          setQuery(
            event.target.value,
          );
          setOpen(true);

          if (
            value &&
            event.target.value !==
              selected?.name
          ) {
            onChange("");
          }
        }}
        placeholder={placeholder}
        autoComplete="off"
        className="field py-3 pl-11 pr-11"
      />

      <button
        type="button"
        onClick={() =>
          setOpen(
            (current) =>
              !current,
          )
        }
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-muted-foreground hover:text-white"
      >
        <ChevronDown className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute z-50 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-white/10 bg-[#07110d] p-2 shadow-2xl">
          {results.map(
            (militar) => (
              <button
                type="button"
                key={
                  militar.discordId
                }
                onClick={() => {
                  onChange(
                    militar.discordId,
                  );
                  setQuery(
                    militar.name,
                  );
                  setOpen(false);
                }}
                className={[
                  "flex w-full items-center gap-3 rounded-xl p-3 text-left transition hover:bg-white/5",
                  militar.discordId ===
                    value
                    ? "bg-primary/10"
                    : "",
                ].join(" ")}
              >
                <Avatar
                  src={
                    militar.avatarUrl
                  }
                />

                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-white">
                    {militar.name}
                  </p>

                  <p className="truncate text-xs text-muted-foreground">
                    {
                      militar.discordId
                    }
                  </p>
                </div>

                {militar.discordId ===
                  value && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </button>
            ),
          )}

          {results.length === 0 && (
            <div className="p-5 text-center text-sm text-muted-foreground">
              Nenhum militar encontrado.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) { return <div className="min-w-[110px] rounded-2xl border border-white/10 bg-black/20 p-3"><p className="text-2xl font-black text-white">{value}</p><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="space-y-2"><span className="text-xs font-black uppercase tracking-wider text-muted-foreground">{label}</span>{children}</label>; }
function Avatar({ src }: { src?: string | null }) { return src ? <img src={src} alt="" className="h-11 w-11 rounded-full object-cover" /> : <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/5"><UserRound className="h-5 w-5 text-muted-foreground" /></div>; }
function PersonLine({ avatar, title, name }: { avatar?: string | null; title: string; name: string }) { return <div className="flex items-center gap-3"><Avatar src={avatar} /><div><p className="text-xs font-black uppercase tracking-wider text-muted-foreground">{title}</p><p className="font-bold text-white">{name}</p></div></div>; }
function ManageCard({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) { return <section className="space-y-3 rounded-3xl border border-white/10 bg-black/20 p-5"><div className="flex items-center gap-2"><Icon className="h-5 w-5 text-primary" /><h3 className="font-black text-white">{title}</h3></div>{children}</section>; }
function ActionButton({ children, disabled, onClick }: { children: React.ReactNode; disabled?: boolean; onClick: () => void }) { return <button type="button" disabled={disabled} onClick={onClick} className="rounded-xl bg-primary px-4 py-2 font-bold text-primary-foreground disabled:opacity-50">{children}</button>; }
