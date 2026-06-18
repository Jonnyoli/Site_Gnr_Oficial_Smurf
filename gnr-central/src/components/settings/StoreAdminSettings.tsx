import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  BadgeEuro,
  CheckCircle2,
  Coins,
  History,
  Loader2,
  Lock,
  LockOpen,
  Minus,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import {
  Button,
} from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Input,
} from "@/components/ui/input";

import {
  Label,
} from "@/components/ui/label";

import {
  useToast,
} from "@/hooks/use-toast";

const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(
    /\/$/,
    "",
  ) ||
  (
    import.meta.env.DEV
      ? "http://localhost:3000"
      : ""
  );

type StoreUserSummary = {
  userId: string;
  name: string;
  avatarUrl?: string | null;
  badgeNumber?: string | null;
  callsignNumber?: string | null;
  credits: number;
  ownedItems: number;
  purchasesLocked: boolean;
  purchasesLockedReason?: string | null;
  reconciliationStatus:
    | "OK"
    | "MISMATCH"
    | "NOT_CHECKED";
  reconciliationDifference: number;
  updatedAt?: string | null;
};

type StoreTransaction = {
  _id: string;
  type: string;
  itemId?: string | null;
  amount: number;
  beforeCredits: number;
  afterCredits: number;
  reason: string;
  createdBy: string;
  createdAt: string;
};

type StoreUserDetail = {
  user: {
    userId: string;
    name: string;
    avatarUrl?: string | null;
    badgeNumber?: string | null;
    callsignNumber?: string | null;
  };

  inventory: {
    userId: string;
    credits: number;
    ownedItems: string[];
    updatedAt?: string | null;
  };

  security: {
    purchasesLocked: boolean;
    purchasesLockedReason?: string | null;
    purchasesLockedAt?: string | null;
    purchasesLockedBy?: string | null;
  };

  reconciliation: {
    status:
      | "OK"
      | "MISMATCH";
    currentCredits: number;
    expectedCredits: number;
    difference: number;
    transactionCount: number;
    chainErrors: unknown[];
  };

  history: StoreTransaction[];
};

type CreditOperation =
  | "ADD"
  | "REMOVE";

async function apiRequest<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const response =
    await fetch(
      `${API_BASE_URL}${path}`,
      {
        credentials:
          "include",

        headers: {
          Accept:
            "application/json",

          ...(
            options?.body
              ? {
                  "Content-Type":
                    "application/json",
                }
              : {}
          ),

          ...(
            options?.headers ||
            {}
          ),
        },

        ...options,
      },
    );

  const payload =
    await response
      .json()
      .catch(
        () => null,
      );

  if (!response.ok) {
    throw new Error(
      payload?.error ||
      `O pedido falhou com o código ${response.status}.`,
    );
  }

  return payload as T;
}

function formatCredits(
  value: number,
) {
  return new Intl.NumberFormat(
    "pt-PT",
  ).format(
    Number(
      value ||
      0,
    ),
  );
}

function formatDate(
  value?: string | null,
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(
      value,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "—";
  }

  return date.toLocaleString(
    "pt-PT",
  );
}

function transactionLabel(
  type: string,
) {
  const labels:
    Record<
      string,
      string
    > = {
      BUY:
        "Compra",
      EQUIP:
        "Equipado",
      UNEQUIP:
        "Removido",
      CREDITS_ADD:
        "Créditos adicionados",
      CREDITS_REMOVE:
        "Créditos removidos",
      GIFT:
        "Presente",
      MISSION_REWARD:
        "Recompensa",
      REFUND:
        "Reembolso",
    };

  return (
    labels[type] ||
    type
  );
}

export default function StoreAdminSettings() {
  const {
    toast,
  } =
    useToast();

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    users,
    setUsers,
  ] =
    useState<
      StoreUserSummary[]
    >([]);

  const [
    selectedUserId,
    setSelectedUserId,
  ] =
    useState<
      string | null
    >(null);

  const [
    detail,
    setDetail,
  ] =
    useState<
      StoreUserDetail | null
    >(null);

  const [
    operation,
    setOperation,
  ] =
    useState<CreditOperation>(
      "ADD",
    );

  const [
    amount,
    setAmount,
  ] =
    useState(
      "5000",
    );

  const [
    reason,
    setReason,
  ] =
    useState(
      "Créditos de teste para validar compras da loja",
    );

  const [
    loadingUsers,
    setLoadingUsers,
  ] =
    useState(
      false,
    );

  const [
    loadingDetail,
    setLoadingDetail,
  ] =
    useState(
      false,
    );

  const [
    submitting,
    setSubmitting,
  ] =
    useState(
      false,
    );

  const [
    changingLock,
    setChangingLock,
  ] =
    useState(
      false,
    );

  const [
    reconciling,
    setReconciling,
  ] =
    useState(
      false,
    );

  const selectedSummary =
    useMemo(
      () =>
        users.find(
          (
            user,
          ) =>
            user.userId ===
            selectedUserId,
        ) ||
        null,
      [
        users,
        selectedUserId,
      ],
    );

  const numericAmount =
    Number(
      amount,
    );

  const validAdjustment =
    Number.isSafeInteger(
      numericAmount,
    ) &&
    numericAmount >
      0 &&
    numericAmount <=
      100000 &&
    reason.trim().length >=
      5 &&
    Boolean(
      selectedUserId,
    );

  async function loadUsers(
    query =
      search,
  ) {
    setLoadingUsers(
      true,
    );

    try {
      const response =
        await apiRequest<{
          items:
            StoreUserSummary[];
        }>(
          `/api/store/admin/users?q=${encodeURIComponent(
            query.trim(),
          )}&limit=50`,
        );

      setUsers(
        response.items ||
        [],
      );

      if (
        selectedUserId &&
        !response.items.some(
          (
            item,
          ) =>
            item.userId ===
            selectedUserId,
        )
      ) {
        setUsers(
          (
            current,
          ) => [
            ...current,
            ...(
              selectedSummary
                ? [
                    selectedSummary,
                  ]
                : []
            ),
          ],
        );
      }
    } catch (
      error
    ) {
      toast({
        title:
          "Erro ao pesquisar militares",

        description:
          error instanceof
          Error
            ? error.message
            : "Não foi possível carregar as contas da loja.",

        variant:
          "destructive",
      });
    } finally {
      setLoadingUsers(
        false,
      );
    }
  }

  async function loadDetail(
    userId: string,
  ) {
    setLoadingDetail(
      true,
    );

    try {
      const response =
        await apiRequest<StoreUserDetail>(
          `/api/store/admin/users/${encodeURIComponent(
            userId,
          )}`,
        );

      setDetail(
        response,
      );
    } catch (
      error
    ) {
      setDetail(
        null,
      );

      toast({
        title:
          "Erro ao carregar a conta",

        description:
          error instanceof
          Error
            ? error.message
            : "Não foi possível carregar o histórico da loja.",

        variant:
          "destructive",
      });
    } finally {
      setLoadingDetail(
        false,
      );
    }
  }

  useEffect(
    () => {
      void loadUsers(
        "",
      );
    },
    [],
  );

  useEffect(
    () => {
      if (
        !selectedUserId
      ) {
        setDetail(
          null,
        );

        return;
      }

      void loadDetail(
        selectedUserId,
      );
    },
    [
      selectedUserId,
    ],
  );

  async function submitCredits() {
    if (
      !selectedUserId ||
      !validAdjustment
    ) {
      return;
    }

    const action =
      operation ===
      "ADD"
        ? "adicionar"
        : "remover";

    const targetName =
      detail?.user.name ||
      selectedSummary
        ?.name ||
      selectedUserId;

    const confirmed =
      window.confirm(
        `Confirmas ${action} ${formatCredits(
          numericAmount,
        )} créditos à conta de ${targetName}?`,
      );

    if (
      !confirmed
    ) {
      return;
    }

    setSubmitting(
      true,
    );

    try {
      const response =
        await apiRequest<{
          ok: boolean;
          inventory: {
            credits: number;
          };
          reconciliation: {
            status:
              | "OK"
              | "MISMATCH";
            difference:
              number;
          };
        }>(
          `/api/store/admin/users/${encodeURIComponent(
            selectedUserId,
          )}/credits`,
          {
            method:
              "POST",

            body:
              JSON.stringify({
                operation,
                amount:
                  numericAmount,
                reason:
                  reason.trim(),
              }),
          },
        );

      toast({
        title:
          operation ===
          "ADD"
            ? "Créditos adicionados"
            : "Créditos removidos",

        description:
          `Novo saldo: ${formatCredits(
            response.inventory.credits,
          )} créditos.`,
      });

      await Promise.all([
        loadDetail(
          selectedUserId,
        ),

        loadUsers(
          search,
        ),
      ]);
    } catch (
      error
    ) {
      toast({
        title:
          "Erro ao ajustar créditos",

        description:
          error instanceof
          Error
            ? error.message
            : "Não foi possível alterar o saldo.",

        variant:
          "destructive",
      });
    } finally {
      setSubmitting(
        false,
      );
    }
  }

  async function toggleLock() {
    if (
      !selectedUserId ||
      !detail
    ) {
      return;
    }

    const nextLocked =
      !detail.security
        .purchasesLocked;

    const lockReason =
      nextLocked
        ? window.prompt(
            "Indica o motivo do bloqueio das compras:",
            "Conta bloqueada temporariamente para verificação administrativa",
          )
        : "";

    if (
      nextLocked &&
      (
        !lockReason ||
        lockReason.trim().length <
          5
      )
    ) {
      return;
    }

    setChangingLock(
      true,
    );

    try {
      await apiRequest(
        `/api/store/admin/users/${encodeURIComponent(
          selectedUserId,
        )}/lock`,
        {
          method:
            "POST",

          body:
            JSON.stringify({
              locked:
                nextLocked,

              reason:
                nextLocked
                  ? lockReason
                      ?.trim()
                  : "",
            }),
        },
      );

      toast({
        title:
          nextLocked
            ? "Compras bloqueadas"
            : "Compras desbloqueadas",
      });

      await Promise.all([
        loadDetail(
          selectedUserId,
        ),

        loadUsers(
          search,
        ),
      ]);
    } catch (
      error
    ) {
      toast({
        title:
          "Erro ao alterar o bloqueio",

        description:
          error instanceof
          Error
            ? error.message
            : "Não foi possível alterar a conta.",

        variant:
          "destructive",
      });
    } finally {
      setChangingLock(
        false,
      );
    }
  }

  async function reconcile() {
    if (
      !selectedUserId
    ) {
      return;
    }

    setReconciling(
      true,
    );

    try {
      const response =
        await apiRequest<{
          reconciliation: {
            status:
              | "OK"
              | "MISMATCH";
            difference:
              number;
          };
        }>(
          `/api/store/admin/users/${encodeURIComponent(
            selectedUserId,
          )}/reconcile`,
          {
            method:
              "POST",

            body:
              "{}",
          },
        );

      toast({
        title:
          response.reconciliation
            .status ===
          "OK"
            ? "Conta reconciliada"
            : "Discrepância detetada",

        description:
          response.reconciliation
            .status ===
          "OK"
            ? "O saldo coincide com o histórico."
            : `Diferença encontrada: ${response.reconciliation.difference} créditos.`,

        variant:
          response.reconciliation
            .status ===
          "OK"
            ? "default"
            : "destructive",
      });

      await loadDetail(
        selectedUserId,
      );
    } catch (
      error
    ) {
      toast({
        title:
          "Erro na reconciliação",

        description:
          error instanceof
          Error
            ? error.message
            : "Não foi possível reconciliar a conta.",

        variant:
          "destructive",
      });
    } finally {
      setReconciling(
        false,
      );
    }
  }

  return (
    <Card className="glass overflow-hidden rounded-3xl border-white/10">
      <CardHeader className="border-b border-white/10 bg-white/[0.025]">
        <CardTitle className="flex items-center gap-3 text-xl font-black text-white">
          <Coins className="h-5 w-5 text-yellow-300" />

          Gestão de créditos
        </CardTitle>

        <CardDescription>
          Adiciona créditos de teste, remove saldos, consulta o histórico e valida a integridade da conta. Todas as operações ficam registadas na Auditoria.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 p-6">
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="space-y-4">
            <div>
              <Label className="text-xs font-black uppercase tracking-[0.14em] text-white/40">
                Procurar militar
              </Label>

              <div className="mt-2 flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />

                  <Input
                    value={
                      search
                    }
                    onChange={(
                      event,
                    ) =>
                      setSearch(
                        event.target
                          .value,
                      )
                    }
                    onKeyDown={(
                      event,
                    ) => {
                      if (
                        event.key ===
                        "Enter"
                      ) {
                        void loadUsers();
                      }
                    }}
                    placeholder="Nome, Discord ID ou número..."
                    className="h-12 rounded-xl border-white/10 bg-black/20 pl-11"
                  />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    void loadUsers()
                  }
                  disabled={
                    loadingUsers
                  }
                  className="h-12 rounded-xl border-white/10"
                >
                  {loadingUsers ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
              {users.map(
                (
                  user,
                ) => (
                  <button
                    key={
                      user.userId
                    }
                    type="button"
                    onClick={() =>
                      setSelectedUserId(
                        user.userId,
                      )
                    }
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      selectedUserId ===
                      user.userId
                        ? "border-primary/35 bg-primary/[0.08]"
                        : "border-white/10 bg-white/[0.025] hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {user.avatarUrl ? (
                        <img
                          src={
                            user.avatarUrl
                          }
                          alt=""
                          className="h-11 w-11 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-black/20">
                          <UserRound className="h-5 w-5 text-white/30" />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="truncate font-black text-white">
                          {user.name}
                        </p>

                        <p className="mt-1 truncate text-[10px] text-white/30">
                          {user.userId}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="font-black text-yellow-300">
                          {formatCredits(
                            user.credits,
                          )}
                        </p>

                        <p className="text-[9px] uppercase tracking-[0.12em] text-white/25">
                          créditos
                        </p>
                      </div>
                    </div>
                  </button>
                ),
              )}

              {!loadingUsers &&
                users.length ===
                  0 && (
                  <div className="rounded-2xl border border-dashed border-white/10 p-7 text-center">
                    <UserRound className="mx-auto h-7 w-7 text-white/15" />

                    <p className="mt-3 text-sm font-bold text-white/40">
                      Nenhuma conta encontrada.
                    </p>
                  </div>
                )}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-black/20 p-5">
            {!selectedUserId ? (
              <div className="flex min-h-[430px] items-center justify-center text-center">
                <div>
                  <BadgeEuro className="mx-auto h-10 w-10 text-white/15" />

                  <p className="mt-4 font-black text-white/60">
                    Seleciona um militar
                  </p>

                  <p className="mt-2 text-sm text-white/30">
                    Depois podes adicionar moedas de teste à conta.
                  </p>
                </div>
              </div>
            ) : loadingDetail ? (
              <div className="flex min-h-[430px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : detail ? (
              <div className="space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">
                      Conta da loja
                    </p>

                    <h3 className="mt-2 text-2xl font-black text-white">
                      {detail.user.name}
                    </h3>

                    <p className="mt-1 text-xs text-white/30">
                      {detail.user.userId}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-yellow-400/20 bg-yellow-500/[0.07] px-5 py-4 text-right">
                    <p className="text-3xl font-black text-yellow-300">
                      {formatCredits(
                        detail.inventory
                          .credits,
                      )}
                    </p>

                    <p className="text-[9px] font-black uppercase tracking-[0.14em] text-white/30">
                      saldo atual
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setOperation(
                        "ADD",
                      )
                    }
                    className={`rounded-2xl border p-4 text-left transition ${
                      operation ===
                      "ADD"
                        ? "border-emerald-400/30 bg-emerald-500/[0.08]"
                        : "border-white/10 bg-white/[0.025]"
                    }`}
                  >
                    <Plus className="h-5 w-5 text-emerald-300" />

                    <p className="mt-3 font-black text-white">
                      Adicionar
                    </p>

                    <p className="mt-1 text-xs text-white/30">
                      Créditos de teste
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setOperation(
                        "REMOVE",
                      )
                    }
                    className={`rounded-2xl border p-4 text-left transition ${
                      operation ===
                      "REMOVE"
                        ? "border-red-400/30 bg-red-500/[0.08]"
                        : "border-white/10 bg-white/[0.025]"
                    }`}
                  >
                    <Minus className="h-5 w-5 text-red-300" />

                    <p className="mt-3 font-black text-white">
                      Remover
                    </p>

                    <p className="mt-1 text-xs text-white/30">
                      Corrigir saldo
                    </p>
                  </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>
                      Quantidade
                    </Label>

                    <Input
                      type="number"
                      min="1"
                      max="100000"
                      step="1"
                      value={
                        amount
                      }
                      onChange={(
                        event,
                      ) =>
                        setAmount(
                          event.target
                            .value,
                        )
                      }
                      className="mt-2 h-12 rounded-xl border-white/10 bg-black/20"
                    />
                  </div>

                  <div>
                    <Label>
                      Saldo previsto
                    </Label>

                    <div className="mt-2 flex h-12 items-center rounded-xl border border-white/10 bg-black/20 px-4 font-black text-white">
                      {formatCredits(
                        Math.max(
                          0,
                          detail.inventory
                            .credits +
                            (
                              operation ===
                              "ADD"
                                ? Number(
                                    numericAmount ||
                                    0,
                                  )
                                : -Number(
                                    numericAmount ||
                                    0,
                                  )
                            ),
                        ),
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <Label>
                    Motivo obrigatório
                  </Label>

                  <Input
                    value={
                      reason
                    }
                    onChange={(
                      event,
                    ) =>
                      setReason(
                        event.target
                          .value,
                      )
                    }
                    className="mt-2 h-12 rounded-xl border-white/10 bg-black/20"
                    placeholder="Ex.: Créditos de teste da loja"
                  />
                </div>

                <Button
                  type="button"
                  onClick={() =>
                    void submitCredits()
                  }
                  disabled={
                    submitting ||
                    !validAdjustment
                  }
                  className={`h-12 w-full rounded-xl font-black ${
                    operation ===
                    "ADD"
                      ? "bg-emerald-500 text-black hover:bg-emerald-400"
                      : "bg-red-500 text-white hover:bg-red-400"
                  }`}
                >
                  {submitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : operation ===
                    "ADD" ? (
                    <Plus className="mr-2 h-4 w-4" />
                  ) : (
                    <Minus className="mr-2 h-4 w-4" />
                  )}

                  {operation ===
                  "ADD"
                    ? "Adicionar créditos"
                    : "Remover créditos"}
                </Button>

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() =>
                      void reconcile()
                    }
                    disabled={
                      reconciling
                    }
                    className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 text-left transition hover:border-primary/25 disabled:opacity-50"
                  >
                    <div className="flex items-center gap-3">
                      {reconciling ? (
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      ) : detail.reconciliation
                          .status ===
                        "OK" ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-red-300" />
                      )}

                      <div>
                        <p className="font-black text-white">
                          Reconciliação
                        </p>

                        <p className="text-xs text-white/30">
                          {detail.reconciliation
                            .status ===
                          "OK"
                            ? "Saldo correto"
                            : `Diferença: ${detail.reconciliation.difference}`}
                        </p>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      void toggleLock()
                    }
                    disabled={
                      changingLock
                    }
                    className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 text-left transition hover:border-primary/25 disabled:opacity-50"
                  >
                    <div className="flex items-center gap-3">
                      {changingLock ? (
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      ) : detail.security
                          .purchasesLocked ? (
                        <Lock className="h-5 w-5 text-red-300" />
                      ) : (
                        <LockOpen className="h-5 w-5 text-emerald-300" />
                      )}

                      <div>
                        <p className="font-black text-white">
                          Compras
                        </p>

                        <p className="text-xs text-white/30">
                          {detail.security
                            .purchasesLocked
                            ? "Bloqueadas"
                            : "Permitidas"}
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        </div>

        {detail && (
          <section className="rounded-3xl border border-white/10 bg-black/20 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">
                  Histórico completo
                </p>

                <h3 className="mt-2 text-xl font-black text-white">
                  Movimentos de créditos
                </h3>
              </div>

              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() =>
                  void loadDetail(
                    detail.user
                      .userId,
                  )
                }
                disabled={
                  loadingDetail
                }
                className="rounded-xl border-white/10"
              >
                <RefreshCw
                  className={`h-4 w-4 ${
                    loadingDetail
                      ? "animate-spin"
                      : ""
                  }`}
                />
              </Button>
            </div>

            <div className="mt-5 space-y-2">
              {detail.history.map(
                (
                  transaction,
                ) => (
                  <article
                    key={
                      transaction._id
                    }
                    className="rounded-2xl border border-white/10 bg-white/[0.025] p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <History className="h-4 w-4 text-primary" />

                          <p className="font-black text-white">
                            {transactionLabel(
                              transaction.type,
                            )}
                          </p>
                        </div>

                        <p className="mt-2 text-sm text-white/45">
                          {transaction.reason}
                        </p>

                        <p className="mt-1 text-[10px] text-white/25">
                          {formatDate(
                            transaction.createdAt,
                          )}{" "}
                          · por{" "}
                          {transaction.createdBy}
                        </p>
                      </div>

                      <div className="text-right">
                        <p
                          className={`text-lg font-black ${
                            transaction.amount >=
                            0
                              ? "text-emerald-300"
                              : "text-red-300"
                          }`}
                        >
                          {transaction.amount >=
                          0
                            ? "+"
                            : ""}
                          {formatCredits(
                            transaction.amount,
                          )}
                        </p>

                        <p className="text-[10px] text-white/25">
                          {formatCredits(
                            transaction.beforeCredits,
                          )}{" "}
                          →{" "}
                          {formatCredits(
                            transaction.afterCredits,
                          )}
                        </p>
                      </div>
                    </div>
                  </article>
                ),
              )}

              {detail.history.length ===
                0 && (
                <div className="rounded-2xl border border-dashed border-white/10 p-7 text-center text-sm text-white/35">
                  Ainda não existem movimentos nesta conta.
                </div>
              )}
            </div>
          </section>
        )}

        <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/[0.05] p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />

            <div>
              <p className="font-black text-emerald-200">
                Proteção administrativa ativa
              </p>

              <p className="mt-1 text-xs leading-5 text-emerald-100/45">
                O saldo nunca é editado diretamente no frontend. O backend valida o Comando-Geral, exige motivo, limita cada operação a 100.000 créditos, guarda saldo anterior e novo, cria uma transação e regista tudo na Auditoria.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
