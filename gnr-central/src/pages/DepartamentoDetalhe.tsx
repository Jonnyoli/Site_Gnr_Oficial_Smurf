import { useEffect, useMemo, useState } from "react";
import { Link, useRoute } from "wouter";
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  ClipboardList,
  Crown,
  FileCheck2,
  Loader2,
  Plus,
  RefreshCw,
  Scale,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
  WalletCards,
  X,
  Vote,
  UsersRound,
  ArrowRight,
  CalendarCheck,
} from "lucide-react";

type DepartmentKey = "CEG" | "CSO" | "DRH";

type DepartmentRecord = {
  _id: string;
  referenceNumber: string;
  department: DepartmentKey;
  type: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  targetName?: string | null;
  targetUnit?: string | null;
  targetRank?: string | null;
  incidents?: number;
  calculatedAmount?: number;
  cegMemberPresent?: boolean;
  commandConsent?: boolean;
  participants?: Array<{
    discordId: string;
    name: string;
    role: string;
    vote: string;
    note?: string;
  }>;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
};

const TYPES: Record<DepartmentKey, Array<[string, string]>> = {
  CEG: [
    ["SUPERVISION", "Supervisão de unidade"],
    ["COMPLAINT", "Queixa sensível"],
    ["MEETING", "Reunião"],
    ["OTHER", "Outro"],
  ],
  CSO: [
    ["SERGEANT_EVALUATION", "Avaliação de Sargento"],
    ["OTHER", "Registo administrativo"],
  ],
  DRH: [
    ["TIMESHEET_REVIEW", "Folha de ponto"],
    ["DISMISSAL", "Despedimento"],
    ["ABSENCE", "Ausência"],
    ["ONBOARDING", "Novo guarda"],
    ["SUGGESTION", "Sugestão"],
    ["CRIMINAL_RECORD_CLEARANCE", "Limpeza de cadastro"],
    ["WEAPON_LICENSE", "Porte de arma"],
    ["TICKET", "Ticket"],
  ],
};

const NAMES: Record<DepartmentKey, string> = {
  CEG: "Conselho de Elite da Guarda",
  CSO: "Conselho Superior de Oficiais",
  DRH: "Departamento de Recursos Humanos",
};

const ICONS = {
  CEG: Crown,
  CSO: Scale,
  DRH: Users,
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Rascunho",
  OPEN: "Aberto",
  IN_REVIEW: "Em análise",
  AWAITING_CEG: "Aguarda CEG",
  AWAITING_COMMAND: "Aguarda Comando",
  APPROVED: "Aprovado",
  REJECTED: "Rejeitado",
  COMPLETED: "Concluído",
  ARCHIVED: "Arquivado",
  REVOKED: "Revogado",
};

const STATUS_OPTIONS: Record<
  DepartmentKey,
  Array<[string, string]>
> = {
  CEG: [
    ["DRAFT", "Rascunho"],
    ["OPEN", "Aberto"],
    ["IN_REVIEW", "Em análise"],
    ["AWAITING_COMMAND", "Aguarda Comando"],
    ["APPROVED", "Aprovado"],
    ["REJECTED", "Rejeitado"],
    ["COMPLETED", "Concluído"],
    ["ARCHIVED", "Arquivado"],
  ],
  CSO: [
    ["DRAFT", "Rascunho"],
    ["OPEN", "Aberto"],
    ["IN_REVIEW", "Em análise"],
    ["AWAITING_CEG", "Aguarda CEG"],
    ["AWAITING_COMMAND", "Aguarda Comando"],
    ["APPROVED", "Aprovado"],
    ["REJECTED", "Rejeitado"],
    ["COMPLETED", "Concluído"],
    ["ARCHIVED", "Arquivado"],
  ],
  DRH: [
    ["DRAFT", "Rascunho"],
    ["OPEN", "Aberto"],
    ["IN_REVIEW", "Em análise"],
    ["AWAITING_COMMAND", "Aguarda Comando"],
    ["APPROVED", "Aprovado"],
    ["REJECTED", "Rejeitado"],
    ["COMPLETED", "Concluído"],
    ["ARCHIVED", "Arquivado"],
    ["REVOKED", "Revogado"],
  ],
};

function money(value: number) {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function DepartamentoDetalhe() {
  const [, params] = useRoute("/departamentos/:department");
  const department = String(
    params?.department || "",
  ).toUpperCase() as DepartmentKey;

  const [data, setData] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] =
    useState<DepartmentRecord | null>(null);
  const [form, setForm] = useState({
    type: TYPES[department]?.[0]?.[0] || "OTHER",
    title: "",
    description: "",
    priority: "NORMAL",
    targetName: "",
    targetUnit: "",
    targetRank: "",
    incidents: 0,
    cegMemberPresent: false,
  });

  async function load() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/departments/${department}`,
        {
          credentials: "include",
        },
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload?.error ||
            "Não foi possível carregar o departamento.",
        );
      }

      setData(payload);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Não foi possível carregar o departamento.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (department) {
      setForm((current) => ({
        ...current,
        type: TYPES[department]?.[0]?.[0] || "OTHER",
      }));
      void load();
    }
  }, [department]);

  const records = useMemo(() => {
    const term = search.trim().toLowerCase();

    return (data?.records || []).filter(
      (record: DepartmentRecord) => {
        const matchesSearch =
          !term ||
          [
            record.referenceNumber,
            record.title,
            record.description,
            record.targetName,
            record.targetUnit,
          ]
            .filter(Boolean)
            .some((value) =>
              String(value).toLowerCase().includes(term),
            );

        return (
          matchesSearch &&
          (type === "ALL" || record.type === type) &&
          (status === "ALL" || record.status === status)
        );
      },
    );
  }, [data?.records, search, type, status]);

  async function createRecord() {
    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        `/api/departments/${department}/records`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        },
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload?.error ||
            "Não foi possível criar o registo.",
        );
      }

      setShowCreate(false);
      setForm({
        type: TYPES[department]?.[0]?.[0] || "OTHER",
        title: "",
        description: "",
        priority: "NORMAL",
        targetName: "",
        targetUnit: "",
        targetRank: "",
        incidents: 0,
        cegMemberPresent: false,
      });

      await load();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Não foi possível criar o registo.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function updateRecord(
    record: DepartmentRecord,
    patch: Record<string, unknown>,
  ) {
    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        `/api/departments/${department}/records/${record._id}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(patch),
        },
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload?.error ||
            "Não foi possível atualizar o registo.",
        );
      }

      setSelected(payload.record);
      await load();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Não foi possível atualizar o registo.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const DepartmentIcon = ICONS[department] || ShieldCheck;

  return (
    <div className="space-y-6 pb-12">
      <section className="rounded-[2.8rem] border border-primary/15 bg-[#06100c]/95 p-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-primary">
              Departamento · {department}
            </p>
            <h1 className="mt-3 text-4xl font-black text-white">
              {NAMES[department]}
            </h1>
            <p className="mt-3 text-sm text-white/40">
              {department === "CSO"
                ? "Membros, avaliações, reuniões, votações e propostas diretamente ligadas ao CEG e ao Comando-Geral."
                : "Membros sincronizados, processos, tarefas, autorizações e histórico administrativo."}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {department === "CSO" && (
              <Link
                href="/departamentos/cso/reunioes"
                className="inline-flex items-center gap-2 rounded-2xl border border-violet-400/20 bg-violet-500/10 px-5 py-4 text-[9px] font-black uppercase tracking-[0.12em] text-violet-300 transition hover:border-violet-400/35 hover:bg-violet-500/15"
              >
                <Vote className="h-4 w-4" />
                Centro de Reuniões
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}

            {data?.permissions?.manage && (
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-4 text-[9px] font-black uppercase tracking-[0.12em] text-primary-foreground"
              >
                <Plus className="h-4 w-4" />
                Novo registo
              </button>
            )}
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-red-200">
          {error}
        </div>
      )}

      {department === "CSO" && (
        <section className="rounded-[2rem] border border-violet-400/20 bg-violet-500/[0.06] p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-500/10 text-violet-300">
                <UsersRound className="h-7 w-7" />
              </span>

              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-violet-300">
                  Funcionamento do CSO
                </p>
                <h2 className="mt-2 text-2xl font-black text-white">
                  Reuniões e votações num espaço dedicado
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-white/40">
                  As propostas do CSO não seguem para o DRH. Os membros
                  analisam os guardas, consultam horas, pontos, patrulhas
                  e companheiros, votam e deixam uma opinião. Depois da
                  validação do CEG, a proposta segue diretamente para o
                  Comando-Geral.
                </p>
              </div>
            </div>

            <Link
              href="/departamentos/cso/reunioes"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-violet-500 px-5 py-4 text-[9px] font-black uppercase tracking-[0.12em] text-white"
            >
              <CalendarCheck className="h-4 w-4" />
              Abrir reuniões
            </Link>
          </div>
        </section>
      )}

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Metric
          label="Membros"
          value={data?.members?.length || 0}
          icon={Users}
        />
        <Metric
          label="Em aberto"
          value={
            (data?.records || []).filter(
              (item: DepartmentRecord) =>
                !["COMPLETED", "ARCHIVED", "REJECTED"].includes(
                  item.status,
                ),
            ).length
          }
          icon={ClipboardList}
        />
        <Metric
          label="Aguarda Comando"
          value={data?.counts?.AWAITING_COMMAND || 0}
          icon={AlertTriangle}
        />
        <Metric
          label="Concluídos"
          value={data?.counts?.COMPLETED || 0}
          icon={CheckCircle2}
        />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="rounded-[2rem] border border-white/10 bg-[#06100c]/90 p-5">
          <div className="flex items-center gap-3">
            <DepartmentIcon className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-black text-white">
              Membros
            </h2>
          </div>

          <div className="mt-5 space-y-3">
            {(data?.members || []).map((member: any) => (
              <div
                key={member.discordId}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-3"
              >
                <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-primary/20 bg-primary/10 text-primary">
                  {member.avatar ? (
                    <img
                      src={member.avatar}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <UserCheck className="h-4 w-4" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-white">
                    {member.name}
                  </p>
                  <p className="mt-1 text-[9px] text-white/30">
                    {member.discordId}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <div className="space-y-4">
          <section className="grid grid-cols-1 gap-3 rounded-[1.8rem] border border-white/10 bg-[#06100c]/90 p-4 lg:grid-cols-[1fr_210px_210px_auto]">
            <div className="flex h-12 items-center rounded-xl border border-white/10 bg-black/25 px-4">
              <Search className="mr-3 h-4 w-4 text-primary" />
              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Processo, alvo, unidade ou referência..."
                className="h-full min-w-0 flex-1 bg-transparent text-sm text-white outline-none"
              />
            </div>

            <select
              value={type}
              onChange={(event) => setType(event.target.value)}
              className="h-12 rounded-xl border border-white/10 bg-black/25 px-3 text-sm text-white"
            >
              <option value="ALL">Todos os tipos</option>
              {TYPES[department].map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="h-12 rounded-xl border border-white/10 bg-black/25 px-3 text-sm text-white"
            >
              <option value="ALL">Todos os estados</option>
              {STATUS_OPTIONS[department].map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ),
              )}
            </select>

            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-[9px] font-black uppercase text-white/45"
            >
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </button>
          </section>

          <section className="space-y-3">
            {records.length > 0 ? (
              records.map((record: DepartmentRecord) => (
                <button
                  type="button"
                  key={record._id}
                  onClick={() => setSelected(record)}
                  className="w-full rounded-[1.7rem] border border-white/10 bg-[#06100c]/90 p-5 text-left transition hover:border-primary/25"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap gap-2">
                        <Badge value={record.referenceNumber} />
                        <Badge
                          value={
                            STATUS_LABELS[record.status] ||
                            record.status
                          }
                        />
                        <Badge value={record.priority} />
                      </div>
                      <h3 className="mt-3 text-lg font-black text-white">
                        {record.title}
                      </h3>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/35">
                        {record.description || "Sem descrição."}
                      </p>
                    </div>

                    {record.type ===
                      "CRIMINAL_RECORD_CLEARANCE" && (
                      <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-right">
                        <p className="text-[8px] font-black uppercase text-emerald-300">
                          Valor
                        </p>
                        <p className="mt-1 text-lg font-black text-white">
                          {money(record.calculatedAmount || 0)}
                        </p>
                      </div>
                    )}
                  </div>
                </button>
              ))
            ) : (
              <div className="rounded-[2rem] border border-dashed border-white/10 p-12 text-center">
                <ClipboardList className="mx-auto h-9 w-9 text-white/15" />
                <p className="mt-4 font-black text-white">
                  Sem registos
                </p>
              </div>
            )}
          </section>
        </div>
      </section>

      {showCreate && (
        <Modal
          title={`Novo registo — ${department}`}
          onClose={() => setShowCreate(false)}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Tipo">
              <select
                value={form.type}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    type: event.target.value,
                  }))
                }
                className="input"
              >
                {TYPES[department].map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Prioridade">
              <select
                value={form.priority}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    priority: event.target.value,
                  }))
                }
                className="input"
              >
                <option value="LOW">Baixa</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">Alta</option>
                <option value="CRITICAL">Crítica</option>
              </select>
            </Field>
          </div>

          <Field label="Título">
            <input
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              className="input"
            />
          </Field>

          <Field label="Descrição">
            <textarea
              rows={5}
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              className="input"
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="Pessoa / alvo">
              <input
                value={form.targetName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    targetName: event.target.value,
                  }))
                }
                className="input"
              />
            </Field>
            <Field label="Unidade">
              <input
                value={form.targetUnit}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    targetUnit: event.target.value,
                  }))
                }
                className="input"
              />
            </Field>
            <Field label="Posto">
              <input
                value={form.targetRank}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    targetRank: event.target.value,
                  }))
                }
                className="input"
              />
            </Field>
          </div>

          {form.type === "CRIMINAL_RECORD_CLEARANCE" && (
            <Field label="Número de incidentes">
              <input
                type="number"
                min={0}
                value={form.incidents}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    incidents: Number(event.target.value),
                  }))
                }
                className="input"
              />
              <p className="mt-2 text-xs text-emerald-300">
                Total automático:{" "}
                {money(
                  Math.min(
                    500000,
                    150000 +
                      Number(form.incidents || 0) * 50000,
                  ),
                )}
              </p>
            </Field>
          )}


          <button
            type="button"
            disabled={saving || !form.title.trim()}
            onClick={() => void createRecord()}
            className="mt-5 w-full rounded-xl bg-primary px-5 py-4 text-[10px] font-black uppercase text-primary-foreground disabled:opacity-40"
          >
            Criar registo
          </button>
        </Modal>
      )}

      {selected && (
        <Modal
          title={selected.referenceNumber}
          onClose={() => setSelected(null)}
        >
          <div className="flex flex-wrap gap-2">
            <Badge value={selected.type} />
            <Badge
              value={
                STATUS_LABELS[selected.status] ||
                selected.status
              }
            />
            <Badge value={selected.priority} />
          </div>

          <h2 className="mt-4 text-2xl font-black text-white">
            {selected.title}
          </h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-white/45">
            {selected.description || "Sem descrição."}
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <Info label="Alvo" value={selected.targetName || "—"} />
            <Info label="Unidade" value={selected.targetUnit || "—"} />
            <Info label="Criado por" value={selected.createdByName} />
            <Info
              label="Atualizado"
              value={new Date(
                selected.updatedAt,
              ).toLocaleString("pt-PT")}
            />
          </div>

          {selected.type === "CRIMINAL_RECORD_CLEARANCE" && (
            <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-5">
              <div className="flex items-center gap-3">
                <Calculator className="h-5 w-5 text-emerald-300" />
                <div>
                  <p className="text-[8px] font-black uppercase text-emerald-300">
                    Limpeza de cadastro
                  </p>
                  <p className="mt-1 text-2xl font-black text-white">
                    {money(selected.calculatedAmount || 0)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {data?.permissions?.manage && (
            <div className="mt-6 grid grid-cols-2 gap-2 md:grid-cols-4">
              <Action
                label="Em análise"
                onClick={() =>
                  void updateRecord(selected, {
                    status: "IN_REVIEW",
                  })
                }
              />

              {department === "CSO" && (
                <Action
                  label="Aguarda CEG"
                  onClick={() =>
                    void updateRecord(selected, {
                      status: "AWAITING_CEG",
                      note: "Registo encaminhado para validação do CEG.",
                    })
                  }
                />
              )}

              <Action
                label="Aguarda CMD"
                onClick={() =>
                  void updateRecord(selected, {
                    status: "AWAITING_COMMAND",
                    note:
                      department === "CSO"
                        ? "Proposta encaminhada diretamente ao Comando-Geral."
                        : "Registo encaminhado ao Comando-Geral.",
                  })
                }
              />

              {department === "DRH" &&
                data?.permissions?.command && (
                  <Action
                    label="Dar consentimento"
                    onClick={() =>
                      void updateRecord(selected, {
                        commandConsent: true,
                        note: "Consentimento do Comando-Geral.",
                      })
                    }
                  />
                )}

              <Action
                label="Concluir"
                onClick={() =>
                  void updateRecord(selected, {
                    status: "COMPLETED",
                  })
                }
              />
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

function Metric({ label, value, icon: Icon }: any) {
  return (
    <article className="rounded-[1.6rem] border border-white/10 bg-[#06100c]/90 p-5">
      <Icon className="h-5 w-5 text-primary" />
      <p className="mt-4 text-3xl font-black text-white">
        {value}
      </p>
      <p className="mt-1 text-[8px] font-black uppercase tracking-[0.12em] text-white/30">
        {label}
      </p>
    </article>
  );
}

function Badge({ value }: { value: string }) {
  return (
    <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-[8px] font-black uppercase tracking-[0.1em] text-white/45">
      {value}
    </span>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <p className="text-[8px] font-black uppercase text-white/25">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-black text-white">
        {value}
      </p>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="mt-4 block">
      <span className="mb-2 block text-[8px] font-black uppercase tracking-[0.12em] text-white/30">
        {label}
      </span>
      {children}
    </label>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] border border-white/10 bg-[#06100c] p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-black text-white">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-white/40 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}

function Action({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-primary/20 bg-primary/10 px-3 py-3 text-[8px] font-black uppercase text-primary"
    >
      {label}
    </button>
  );
}
