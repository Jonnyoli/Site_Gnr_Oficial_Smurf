import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Gauge,
  Loader2,
  Pause,
  Play,
  Plus,
  Radio,
  RefreshCw,
  Shield,
  Square,
  UsersRound,
  X,
} from "lucide-react";

const API_BASE =
  import.meta.env.VITE_API_URL?.replace(
    /\/$/,
    "",
  ) || "";

async function api(
  path: string,
  options: RequestInit = {},
) {
  const response = await fetch(
    `${API_BASE}${path}`,
    {
      credentials: "include",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(options.body
          ? {
              "Content-Type":
                "application/json",
            }
          : {}),
      },
      ...options,
    },
  );

  const raw = await response.text();
  const payload = raw.trim()
    ? JSON.parse(raw)
    : null;

  if (!response.ok) {
    throw new Error(
      payload?.error ||
        `O pedido falhou (${response.status}).`,
    );
  }

  return payload;
}

function elapsed(point: any) {
  if (!point) return 0;

  const end = point.endTime
    ? new Date(
        point.endTime,
      ).getTime()
    : Date.now();

  let pause =
    Number(
      point.totalPauseTime || 0,
    );

  if (
    point.isPaused &&
    point.lastPauseTime
  ) {
    pause +=
      Date.now() -
      new Date(
        point.lastPauseTime,
      ).getTime();
  }

  return Math.max(
    0,
    end -
      new Date(
        point.startTime,
      ).getTime() -
      pause,
  );
}

function duration(milliseconds: number) {
  const seconds = Math.floor(
    milliseconds / 1000,
  );

  const hours = Math.floor(
    seconds / 3600,
  );

  const minutes = Math.floor(
    (seconds % 3600) / 60,
  );

  const rest = seconds % 60;

  return [
    hours,
    minutes,
    rest,
  ]
    .map((value) =>
      String(value).padStart(2, "0"),
    )
    .join(":");
}

export default function OperationalService() {
  const [data, setData] =
    useState<any>(null);

  const [cps, setCps] =
    useState<any[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState("");

  const [now, setNow] =
    useState(Date.now());

  const [createOpen, setCreateOpen] =
    useState(false);

  const [form, setForm] =
    useState({
      number: "",
      commanderId: "",
      memberIds: "",
      vehicle: "",
      zone: "",
      patrolType: "Patrulha",
      observations: "",
    });

  async function load(
    silent = false,
  ) {
    if (!silent) setLoading(true);

    try {
      const [me, cpPayload] =
        await Promise.all([
          api(
            "/api/operational-sync/me",
          ),
          api(
            "/api/operational-sync/cps",
          ),
        ]);

      setData(me);
      setCps(cpPayload.items || []);
      setError("");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Erro ao carregar.",
      );
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    void load();

    const refresh =
      window.setInterval(() => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          void load(true);
        }
      }, 3000);

    const timer =
      window.setInterval(
        () => setNow(Date.now()),
        1000,
      );

    return () => {
      clearInterval(refresh);
      clearInterval(timer);
    };
  }, []);

  const point = data?.point;
  const myCP = data?.cp;

  const activeCPs = useMemo(
    () =>
      cps.filter(
        (cp) =>
          cp.status === "ABERTO",
      ),
    [cps],
  );

  async function pointAction(
    action:
      | "start"
      | "pause"
      | "resume"
      | "close",
  ) {
    setBusy(true);
    setError("");

    try {
      await api(
        `/api/operational-sync/points/${action}`,
        {
          method: "POST",
          body: JSON.stringify({}),
        },
      );

      await load(true);
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Erro no ponto.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function createCP() {
    setBusy(true);
    setError("");

    try {
      const memberIds = [
        ...new Set(
          form.memberIds.match(
            /\d{17,20}/g,
          ) || [],
        ),
      ];

      await api(
        "/api/operational-sync/cps",
        {
          method: "POST",
          body: JSON.stringify({
            ...form,
            memberIds,
          }),
        },
      );

      setCreateOpen(false);
      setForm({
        number: "",
        commanderId: "",
        memberIds: "",
        vehicle: "",
        zone: "",
        patrolType:
          "Patrulha",
        observations: "",
      });

      await load(true);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Erro ao criar CP.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function closeCP(
    cp: any,
    cancel = false,
  ) {
    setBusy(true);

    try {
      await api(
        `/api/operational-sync/cps/${cp._id}/close`,
        {
          method: "POST",
          body: JSON.stringify({
            cancel,
          }),
        },
      );

      await load(true);
    } catch (closeError) {
      setError(
        closeError instanceof Error
          ? closeError.message
          : "Erro ao fechar CP.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading && !data) {
    return (
      <div className="flex min-h-[520px] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <section className="relative overflow-hidden rounded-[3rem] border border-primary/20 bg-[#04110c] p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_15%,rgba(34,197,94,0.22),transparent_35%),radial-gradient(circle_at_90%_20%,rgba(59,130,246,0.16),transparent_35%)]" />

        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.16em] text-primary">
              <Radio className="h-4 w-4" />
              Discord ↔ GNR Central
            </div>

            <h1 className="mt-5 text-4xl font-black text-white md:text-7xl">
              Serviço
              <span className="block bg-gradient-to-r from-primary to-cyan-300 bg-clip-text text-transparent">
                Operacional
              </span>
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-white/45">
              Gere o ponto e as CPs diretamente no site. As alterações são publicadas no Discord e as ações feitas no Discord aparecem aqui automaticamente.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              void load()
            }
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-5 py-4 text-[8px] font-black uppercase text-white/40"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </button>
        </div>
      </section>

      {error && (
        <div className="flex items-start justify-between rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-red-200">
          <span>{error}</span>
          <button
            type="button"
            onClick={() =>
              setError("")
            }
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <article className="rounded-[2.2rem] border border-white/10 bg-[#06100c] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.14em] text-primary">
                Folha de ponto
              </p>
              <h2 className="mt-2 text-2xl font-black text-white">
                Estado atual
              </h2>
            </div>

            <span
              className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${
                point
                  ? point.isPaused
                    ? "border-amber-400/20 bg-amber-500/10 text-amber-300"
                    : "border-primary/20 bg-primary/10 text-primary"
                  : "border-white/10 bg-white/[0.03] text-white/25"
              }`}
            >
              <Clock3 className="h-5 w-5" />
            </span>
          </div>

          {point ? (
            <>
              <div className="mt-7 rounded-[1.8rem] border border-white/10 bg-black/25 p-6 text-center">
                <p className="text-[8px] font-black uppercase tracking-[0.14em] text-white/25">
                  {point.isPaused
                    ? "Ponto em pausa"
                    : "Em serviço"}
                </p>

                <p className="mt-3 font-mono text-5xl font-black tracking-tight text-white">
                  {duration(
                    elapsed(point),
                  )}
                </p>

                <p className="mt-3 text-xs text-white/30">
                  Iniciado em{" "}
                  {new Date(
                    point.startTime,
                  ).toLocaleString(
                    "pt-PT",
                  )}
                </p>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void pointAction(
                      point.isPaused
                        ? "resume"
                        : "pause",
                    )
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-400/20 bg-amber-500/[0.05] px-4 py-4 text-[8px] font-black uppercase text-amber-300 disabled:opacity-40"
                >
                  {point.isPaused ? (
                    <Play className="h-4 w-4" />
                  ) : (
                    <Pause className="h-4 w-4" />
                  )}
                  {point.isPaused
                    ? "Retomar"
                    : "Pausar"}
                </button>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void pointAction(
                      "close",
                    )
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/[0.05] px-4 py-4 text-[8px] font-black uppercase text-red-300 disabled:opacity-40"
                >
                  <Square className="h-4 w-4" />
                  Terminar
                </button>
              </div>

              {point.discord
                ?.publicJumpUrl && (
                <a
                  href={
                    point.discord
                      .publicJumpUrl
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-400/15 bg-blue-500/[0.04] px-4 py-3 text-[8px] font-black uppercase text-blue-300"
                >
                  <ExternalLink className="h-4 w-4" />
                  Abrir no Discord
                </a>
              )}
            </>
          ) : (
            <div className="mt-7">
              <div className="rounded-[1.8rem] border border-dashed border-white/10 p-9 text-center">
                <Shield className="mx-auto h-9 w-9 text-white/20" />
                <p className="mt-4 font-black text-white">
                  Fora de serviço
                </p>
                <p className="mt-2 text-sm text-white/30">
                  Ainda não tens uma folha de ponto aberta.
                </p>
              </div>

              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void pointAction(
                    "start",
                  )
                }
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-emerald-400 px-5 py-4 text-[9px] font-black uppercase text-[#02140c] disabled:opacity-40"
              >
                <Play className="h-4 w-4" />
                Iniciar serviço
              </button>
            </div>
          )}
        </article>

        <article className="rounded-[2.2rem] border border-white/10 bg-[#06100c] p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.14em] text-cyan-300">
                Patrulhas
              </p>
              <h2 className="mt-2 text-2xl font-black text-white">
                CPs ativas
              </h2>
            </div>

            <button
              type="button"
              onClick={() =>
                setCreateOpen(true)
              }
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-5 py-3 text-[8px] font-black uppercase text-[#031518]"
            >
              <Plus className="h-4 w-4" />
              Criar CP
            </button>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 2xl:grid-cols-2">
            {activeCPs.map((cp) => {
              const members =
                Array.isArray(
                  cp.members,
                ) &&
                cp.members.length
                  ? cp.members
                      .filter(
                        (member: any) =>
                          member.active,
                      )
                      .map(
                        (member: any) =>
                          member.userId,
                      )
                  : String(
                      cp.participants ||
                        "",
                    ).match(
                      /\d{17,20}/g,
                    ) || [];

              return (
                <section
                  key={cp._id}
                  className="rounded-[1.8rem] border border-white/10 bg-black/20 p-5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-2xl font-black text-white">
                        CP {cp.number}
                      </p>
                      <p className="mt-1 text-[8px] font-black uppercase text-primary">
                        {cp.patrolType ||
                          "Patrulha"}
                      </p>
                    </div>

                    <span className="rounded-full border border-primary/15 bg-primary/[0.05] px-3 py-1 text-[7px] font-black uppercase text-primary">
                      Ativa
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <Mini
                      label="Viatura"
                      value={
                        cp.vehicle ||
                        "—"
                      }
                    />
                    <Mini
                      label="Zona"
                      value={
                        cp.zone || "—"
                      }
                    />
                  </div>

                  <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                    <p className="text-[7px] font-black uppercase text-white/25">
                      Participantes
                    </p>
                    <p className="mt-2 text-sm font-black text-white">
                      {members.length} militares
                    </p>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void closeCP(
                          cp,
                          false,
                        )
                      }
                      className="flex-1 rounded-xl border border-primary/15 bg-primary/[0.04] px-3 py-3 text-[7px] font-black uppercase text-primary disabled:opacity-40"
                    >
                      Fechar
                    </button>

                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void closeCP(
                          cp,
                          true,
                        )
                      }
                      className="flex-1 rounded-xl border border-red-400/15 bg-red-500/[0.04] px-3 py-3 text-[7px] font-black uppercase text-red-300 disabled:opacity-40"
                    >
                      Cancelar
                    </button>
                  </div>

                  {cp.discord?.jumpUrl && (
                    <a
                      href={
                        cp.discord
                          .jumpUrl
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-blue-400/15 px-3 py-3 text-[7px] font-black uppercase text-blue-300"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Discord
                    </a>
                  )}
                </section>
              );
            })}

            {!activeCPs.length && (
              <div className="rounded-[1.8rem] border border-dashed border-white/10 p-12 text-center text-white/25 2xl:col-span-2">
                <UsersRound className="mx-auto h-9 w-9" />
                <p className="mt-4">
                  Não existem CPs ativas.
                </p>
              </div>
            )}
          </div>
        </article>
      </section>

      {myCP && (
        <section className="rounded-[2rem] border border-blue-400/15 bg-blue-500/[0.035] p-5">
          <div className="flex items-center gap-3">
            <Gauge className="h-5 w-5 text-blue-300" />
            <div>
              <p className="font-black text-white">
                Estás associado à CP{" "}
                {myCP.number}
              </p>
              <p className="mt-1 text-xs text-white/35">
                Viatura:{" "}
                {myCP.vehicle || "—"} ·
                Zona:{" "}
                {myCP.zone || "—"}
              </p>
            </div>
          </div>
        </section>
      )}

      {createOpen && (
        <div className="fixed inset-0 z-[280] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] border border-cyan-400/20 bg-[#06100c] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[8px] font-black uppercase text-cyan-300">
                  Nova patrulha
                </p>
                <h2 className="mt-2 text-2xl font-black text-white">
                  Criar CP
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setCreateOpen(false)
                }
                className="text-white/30"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field
                label="Número opcional"
                value={form.number}
                onChange={(value) =>
                  setForm({
                    ...form,
                    number: value,
                  })
                }
              />
              <Field
                label="Viatura"
                value={form.vehicle}
                onChange={(value) =>
                  setForm({
                    ...form,
                    vehicle: value,
                  })
                }
              />
              <Field
                label="Comandante — Discord ID"
                value={
                  form.commanderId
                }
                onChange={(value) =>
                  setForm({
                    ...form,
                    commanderId:
                      value,
                  })
                }
              />
              <Field
                label="Zona"
                value={form.zone}
                onChange={(value) =>
                  setForm({
                    ...form,
                    zone: value,
                  })
                }
              />
            </div>

            <label className="mt-4 block">
              <span className="text-[8px] font-black uppercase text-white/25">
                Participantes — menções ou IDs
              </span>
              <textarea
                value={
                  form.memberIds
                }
                onChange={(event) =>
                  setForm({
                    ...form,
                    memberIds:
                      event.target
                        .value,
                  })
                }
                rows={4}
                placeholder="@Guarda1 @Guarda2"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 p-4 text-sm text-white outline-none"
              />
            </label>

            <label className="mt-4 block">
              <span className="text-[8px] font-black uppercase text-white/25">
                Observações
              </span>
              <textarea
                value={
                  form.observations
                }
                onChange={(event) =>
                  setForm({
                    ...form,
                    observations:
                      event.target
                        .value,
                  })
                }
                rows={3}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 p-4 text-sm text-white outline-none"
              />
            </label>

            <button
              type="button"
              disabled={
                busy ||
                !form.vehicle.trim()
              }
              onClick={() =>
                void createCP()
              }
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-5 py-4 text-[9px] font-black uppercase text-[#031518] disabled:opacity-35"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Criar e publicar no Discord
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Mini({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-3">
      <p className="text-[7px] font-black uppercase text-white/20">
        {label}
      </p>
      <p className="mt-2 truncate text-sm font-black text-white">
        {value}
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="text-[8px] font-black uppercase text-white/25">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value,
          )
        }
        className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-black/25 px-4 text-sm text-white outline-none"
      />
    </label>
  );
}
