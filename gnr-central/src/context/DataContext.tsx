import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useMemo,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Guarda, Arquivo, HoraServico } from "../data/mockData";

const API_URL = "/api/data";
const STORE_API_URL = "/api/store";
const AUTO_REFRESH_MS = 60_000;
const GNR_ROLE_ID = "1147878941974077478";

function hasCurrentGnrRole(guard: any) {
  const roleSources = [
    guard?.roles,
    guard?.discordRoles,
    guard?.savedTags,
    guard?.roleIds,
  ];

  return roleSources.some(
    (value) =>
      Array.isArray(value) &&
      value.map(String).includes(GNR_ROLE_ID),
  );
}

export type PeriodType = "diario" | "semanal" | "mensal" | "personalizado";

export type CarreiraEventTipo =
  | "PROMOCAO"
  | "DESPROMOCAO"
  | "MEDALHA"
  | "ENTRADA_UNIDADE"
  | "SAIDA_UNIDADE"
  | "CARGO_ADICIONADO"
  | "CARGO_REMOVIDO"
  | "CARGO";

export type CarreiraEvent = {
  id: string;
  userId: string;
  roleId: string;
  roleName: string;
  tipo: CarreiraEventTipo;
  categoria: string;
  data: string;
  messageId: string;
  channelId: string;
  origem: string;

  executorId?: string;
  executorName?: string;
  reason?: string | null;
  sourceType?: string;
};

export type StoreInventory = {
  userId: string;
  credits: number;
  ownedItems: string[];
  equipped: {
    frame: string | null;
    background: string | null;
    title: string | null;
    theme: string | null;
    badges: string[];
  };
  lastCalculatedAt?: string | null;
  updatedAt?: string | null;
};

interface DataContextType {
  guardas: Guarda[];
  arquivos: Arquivo[];
  horas: HoraServico[];
  patrulhas: any[];
  carreira: CarreiraEvent[];

  storeInventory: StoreInventory | null;
  isLoadingStore: boolean;
  isFetchingStore: boolean;
  refreshStore: () => Promise<void>;
  buyStoreItem: (itemId: string) => Promise<any>;
  equipStoreItem: (itemId: string) => Promise<any>;

  isLoading: boolean;
  isFetching: boolean;

  isLoadingGuardas: boolean;
  isLoadingArquivos: boolean;
  isLoadingHoras: boolean;
  isLoadingPatrulhas: boolean;
  isLoadingCarreira: boolean;

  isFetchingGuardas: boolean;
  isFetchingArquivos: boolean;
  isFetchingHoras: boolean;
  isFetchingPatrulhas: boolean;
  isFetchingCarreira: boolean;

  lastUpdated: Date | null;
  refreshData: () => Promise<void>;

  period: PeriodType;
  setPeriod: (p: PeriodType) => void;
  customRange: { start: string; end: string };
  setCustomRange: (r: { start: string; end: string }) => void;

  ranges: {
    currentStart: Date;
    currentEnd: Date;
    prevStart: Date;
    prevEnd: Date;
  };

  currentHoras: HoraServico[];
  prevHoras: HoraServico[];
  currentArquivos: Arquivo[];
  prevArquivos: Arquivo[];
  currentPatrulhas: any[];
  prevPatrulhas: any[];

  addGuarda: (guarda: Omit<Guarda, "id">) => void;
  updateGuarda: (id: string, guarda: Partial<Guarda>) => void;
  removeGuarda: (id: string) => void;
  addHora: (hora: Omit<HoraServico, "id">) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

function buildNoCacheUrl(url: string) {
  /*
   * Mantemos o nome para não alterar todos os pedidos,
   * mas deixamos de adicionar force=Date.now().
   *
   * O React Query passa a gerir cache e invalidação.
   */
  return url;
}

async function readJsonResponse(res: Response) {
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.error || data?.message || "Erro no pedido.");
  }

  return data;
}

export function DataProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const [period, setPeriod] = useState<PeriodType>("mensal");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [customRange, setCustomRange] = useState<{
    start: string;
    end: string;
  }>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });

  const liveQueryOptions = {
    refetchInterval:
      AUTO_REFRESH_MS,
    refetchIntervalInBackground:
      false,
    staleTime:
      45_000,
    gcTime:
      15 * 60_000,
    refetchOnWindowFocus:
      false,
    refetchOnReconnect:
      true,
    refetchOnMount:
      false,
    placeholderData:
      (previousData: unknown) =>
        previousData,
  };

  const ranges = useMemo(() => {
    const now = new Date();
    let currentStart = new Date();
    let currentEnd = new Date();
    let prevStart = new Date();
    let prevEnd = new Date();

    if (period === "diario") {
      currentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      currentEnd = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
        999
      );

      prevStart = new Date(currentStart);
      prevStart.setDate(prevStart.getDate() - 1);

      prevEnd = new Date(currentEnd);
      prevEnd.setDate(prevEnd.getDate() - 1);
    } else if (period === "semanal") {
      const currentDay = now.getDay();
      const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;

      currentStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - distanceToMonday
      );
      currentStart.setHours(0, 0, 0, 0);

      currentEnd = new Date(currentStart);
      currentEnd.setDate(currentEnd.getDate() + 6);
      currentEnd.setHours(23, 59, 59, 999);

      prevStart = new Date(currentStart);
      prevStart.setDate(prevStart.getDate() - 7);

      prevEnd = new Date(currentEnd);
      prevEnd.setDate(prevEnd.getDate() - 7);
    } else if (period === "mensal") {
      currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
      currentEnd = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
      );

      prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      prevEnd = new Date(
        now.getFullYear(),
        now.getMonth(),
        0,
        23,
        59,
        59,
        999
      );
    } else if (
      period === "personalizado" &&
      customRange.start &&
      customRange.end
    ) {
      currentStart = new Date(customRange.start + "T00:00:00");
      currentEnd = new Date(customRange.end + "T23:59:59");

      const durationMs = currentEnd.getTime() - currentStart.getTime() + 1;

      prevStart = new Date(currentStart.getTime() - durationMs);
      prevEnd = new Date(currentStart.getTime() - 1);
    } else {
      currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
      currentEnd = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
      );

      prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      prevEnd = new Date(
        now.getFullYear(),
        now.getMonth(),
        0,
        23,
        59,
        59,
        999
      );
    }

    return { currentStart, currentEnd, prevStart, prevEnd };
  }, [period, customRange]);

  const startParam = ranges.prevStart.toISOString();
  const endParam = ranges.currentEnd.toISOString();

  const {
    data: guardas = [],
    isLoading: isLoadingGuardas,
    isFetching: isFetchingGuardas,
  } = useQuery<Guarda[]>({
    queryKey: ["guardas"],
    queryFn: async () => {
      const res = await fetch(buildNoCacheUrl(`${API_URL}/guardas`));

      if (!res.ok) throw new Error("Failed to fetch guardas");

      const data = await res.json();
      setLastUpdated(new Date());

      return Array.isArray(data)
        ? data.filter(hasCurrentGnrRole)
        : [];
    },
    ...liveQueryOptions,
  });

  const {
    data: arquivos = [],
    isLoading: isLoadingArquivos,
    isFetching: isFetchingArquivos,
  } = useQuery<Arquivo[]>({
    queryKey: ["arquivos", startParam, endParam],
    queryFn: async () => {
      const res = await fetch(
        buildNoCacheUrl(
          `${API_URL}/arquivos?startDate=${startParam}&endDate=${endParam}`
        )
      );

      if (!res.ok) throw new Error("Failed to fetch arquivos");

      const data = await res.json();
      setLastUpdated(new Date());

      return data;
    },
    ...liveQueryOptions,
  });

  const {
    data: horas = [],
    isLoading: isLoadingHoras,
    isFetching: isFetchingHoras,
  } = useQuery<HoraServico[]>({
    queryKey: ["horas", startParam, endParam],
    queryFn: async () => {
      const res = await fetch(
        buildNoCacheUrl(
          `${API_URL}/horas?startDate=${startParam}&endDate=${endParam}`
        )
      );

      if (!res.ok) throw new Error("Failed to fetch horas");

      const data = await res.json();
      setLastUpdated(new Date());

      return data;
    },
    ...liveQueryOptions,
  });

  const {
    data: patrulhas = [],
    isLoading: isLoadingPatrulhas,
    isFetching: isFetchingPatrulhas,
  } = useQuery<any[]>({
    queryKey: ["patrulhas", startParam, endParam],
    queryFn: async () => {
      const res = await fetch(
        buildNoCacheUrl(
          `${API_URL}/patrulhas?startDate=${startParam}&endDate=${endParam}`
        )
      );

      if (!res.ok) throw new Error("Failed to fetch patrulhas");

      const data = await res.json();
      setLastUpdated(new Date());

      return data;
    },
    ...liveQueryOptions,
  });

  const {
    data: carreira = [],
    isLoading: isLoadingCarreira,
    isFetching: isFetchingCarreira,
  } = useQuery<CarreiraEvent[]>({
    queryKey: ["carreira"],
    queryFn: async () => {
      const res = await fetch(buildNoCacheUrl(`${API_URL}/carreira`));

      if (!res.ok) throw new Error("Failed to fetch carreira");

      const data = await res.json();
      setLastUpdated(new Date());

      return Array.isArray(data) ? data : [];
    },
    ...liveQueryOptions,
  });

  const {
    data: storeInventory = null,
    isLoading: isLoadingStore,
    isFetching: isFetchingStore,
  } = useQuery<StoreInventory | null>({
    queryKey: ["storeInventory"],
    queryFn: async () => {
      const res = await fetch(buildNoCacheUrl(`${STORE_API_URL}/me`), {
        credentials: "include",
      });

      if (res.status === 401) return null;

      const data = await readJsonResponse(res);
      setLastUpdated(new Date());

      return data as StoreInventory;
    },
    ...liveQueryOptions,
  });

  const refreshStore = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["storeInventory"],
      }),
      queryClient.invalidateQueries({
        queryKey: ["guard-public-profile"],
      }),
      queryClient.invalidateQueries({
        queryKey: ["guard-full-profile"],
      }),
    ]);

    setLastUpdated(new Date());
  };

  const buyStoreItem = async (itemId: string) => {
    const res = await fetch(`${STORE_API_URL}/buy`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ itemId }),
    });

    const data = await readJsonResponse(res);

    await refreshStore();

    return data;
  };

  const equipStoreItem = async (itemId: string) => {
    const res = await fetch(`${STORE_API_URL}/equip`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ itemId }),
    });

    const data = await readJsonResponse(res);

    if (data?.inventory) {
      queryClient.setQueryData(
        ["storeInventory"],
        data.inventory,
      );
    }

    await refreshStore();

    return data;
  };

  const refreshData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["guardas"] }),
      queryClient.invalidateQueries({ queryKey: ["arquivos"] }),
      queryClient.invalidateQueries({ queryKey: ["horas"] }),
      queryClient.invalidateQueries({ queryKey: ["patrulhas"] }),
      queryClient.invalidateQueries({ queryKey: ["carreira"] }),
      queryClient.invalidateQueries({ queryKey: ["storeInventory"] }),
    ]);

    setLastUpdated(new Date());
  };

  const currentHoras = useMemo(() => {
    if (!Array.isArray(horas)) return [];

    return horas.filter((h) => {
      if (!h || !h.data || h.data === "N/A") return false;

      const d = new Date(h.data + "T12:00:00");

      return (
        !isNaN(d.getTime()) &&
        d >= ranges.currentStart &&
        d <= ranges.currentEnd
      );
    });
  }, [horas, ranges]);

  const prevHoras = useMemo(() => {
    if (!Array.isArray(horas)) return [];

    return horas.filter((h) => {
      if (!h || !h.data || h.data === "N/A") return false;

      const d = new Date(h.data + "T12:00:00");

      return (
        !isNaN(d.getTime()) &&
        d >= ranges.prevStart &&
        d <= ranges.prevEnd
      );
    });
  }, [horas, ranges]);

  const currentArquivos = useMemo(() => {
    if (!Array.isArray(arquivos)) return [];

    return arquivos.filter((a) => {
      if (!a) return false;
      if (!a.dataRaw) return true;

      const d = new Date(a.dataRaw);

      return (
        !isNaN(d.getTime()) &&
        d >= ranges.currentStart &&
        d <= ranges.currentEnd
      );
    });
  }, [arquivos, ranges]);

  const prevArquivos = useMemo(() => {
    if (!Array.isArray(arquivos)) return [];

    return arquivos.filter((a) => {
      if (!a) return false;
      if (!a.dataRaw) return false;

      const d = new Date(a.dataRaw);

      return (
        !isNaN(d.getTime()) &&
        d >= ranges.prevStart &&
        d <= ranges.prevEnd
      );
    });
  }, [arquivos, ranges]);

  const currentPatrulhas = useMemo(() => {
    if (!Array.isArray(patrulhas)) return [];

    return patrulhas.filter((p) => {
      if (!p) return false;
      if (!p.dataRaw) return true;

      const d = new Date(p.dataRaw);

      return (
        !isNaN(d.getTime()) &&
        d >= ranges.currentStart &&
        d <= ranges.currentEnd
      );
    });
  }, [patrulhas, ranges]);

  const prevPatrulhas = useMemo(() => {
    if (!Array.isArray(patrulhas)) return [];

    return patrulhas.filter((p) => {
      if (!p) return false;
      if (!p.dataRaw) return false;

      const d = new Date(p.dataRaw);

      return (
        !isNaN(d.getTime()) &&
        d >= ranges.prevStart &&
        d <= ranges.prevEnd
      );
    });
  }, [patrulhas, ranges]);

  const addGuarda = (guarda: any) => {
    console.log("Add requested", guarda);
  };

  const updateGuarda = (id: string, updatedGuarda: any) => {
    console.log("Update requested", id, updatedGuarda);
  };

  const removeGuarda = (id: string) => {
    console.log("Remove requested", id);
  };

  const addHora = (hora: any) => {
    console.log("Add hour requested", hora);
  };

  /*
   * Compatibilidade:
   * isLoading deixa de bloquear a Central à espera de todos os módulos.
   * A lista do Efetivo é o núcleo mínimo necessário.
   *
   * Cada página pode usar os estados individuais abaixo.
   */
  const isLoading =
    isLoadingGuardas &&
    guardas.length === 0;

  const isFetching =
    isFetchingGuardas ||
    isFetchingArquivos ||
    isFetchingHoras ||
    isFetchingPatrulhas ||
    isFetchingCarreira ||
    isFetchingStore;

  return (
    <DataContext.Provider
      value={{
        guardas,
        arquivos,
        horas,
        patrulhas,
        carreira,

        storeInventory,
        isLoadingStore,
        isFetchingStore,
        refreshStore,
        buyStoreItem,
        equipStoreItem,

        isLoading,
        isFetching,

        isLoadingGuardas,
        isLoadingArquivos,
        isLoadingHoras,
        isLoadingPatrulhas,
        isLoadingCarreira,

        isFetchingGuardas,
        isFetchingArquivos,
        isFetchingHoras,
        isFetchingPatrulhas,
        isFetchingCarreira,

        lastUpdated,
        refreshData,

        period,
        setPeriod,
        customRange,
        setCustomRange,
        ranges,

        currentHoras,
        prevHoras,
        currentArquivos,
        prevArquivos,
        currentPatrulhas,
        prevPatrulhas,

        addGuarda,
        updateGuarda,
        removeGuarda,
        addHora,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);

  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider");
  }

  return context;
}