import { motion } from "framer-motion";
import {
  Trophy,
  Star,
  Award,
  Medal,
  Loader2,
  CalendarDays,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

const AUTO_REFRESH_MS = 15000;

const POS_STYLES = [
  {
    color: "from-yellow-400 to-yellow-600",
    glow: "shadow-[0_0_45px_rgba(234,179,8,0.18)]",
    border: "border-yellow-400/25",
    badge: "bg-yellow-400/10 text-yellow-300 border-yellow-400/25",
    medal: <Trophy className="h-8 w-8 text-yellow-400" />,
  },
  {
    color: "from-slate-300 to-slate-500",
    glow: "shadow-[0_0_45px_rgba(203,213,225,0.12)]",
    border: "border-slate-300/20",
    badge: "bg-slate-300/10 text-slate-300 border-slate-300/20",
    medal: <Medal className="h-8 w-8 text-slate-300" />,
  },
  {
    color: "from-amber-600 to-amber-800",
    glow: "shadow-[0_0_45px_rgba(245,158,11,0.12)]",
    border: "border-amber-600/20",
    badge: "bg-amber-600/10 text-amber-400 border-amber-600/20",
    medal: <Award className="h-8 w-8 text-amber-500" />,
  },
];

type RankedOfficer = {
  id: string;
  name: string;
  rank: string;
  numero?: string;
  avatar?: string | null;
  hours: number;
  pos: number;
};

function getMonthRange() {
  const now = new Date();

  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    1,
    0,
    0,
    0,
    0
  );

  const end = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );

  const label = start.toLocaleDateString("pt-PT", {
    month: "long",
    year: "numeric",
  });

  return { start, end, label };
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function normalizeOfficer(officer: any, index: number): RankedOfficer {
  return {
    id: String(officer?.id || `officer-${index}`),
    name: officer?.name || "Desconhecido",
    rank: officer?.rank || "Operacional",
    numero: officer?.numero || "N/A",
    avatar: officer?.avatar || null,
    hours: Number(officer?.hours || 0),
    pos: Number(officer?.pos || index + 1),
  };
}

export default function HallOfFame() {
  const monthRange = getMonthRange();

  const {
    data: officers = [],
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery<RankedOfficer[]>({
    queryKey: [
      "ranking-mensal-v2",
      monthRange.start.toISOString(),
      monthRange.end.toISOString(),
    ],
    queryFn: async () => {
      const apiUrl = import.meta.env.VITE_API_URL || "";

      const url =
        `${apiUrl}/api/data/ranking-mensal` +
        `?startDate=${encodeURIComponent(monthRange.start.toISOString())}` +
        `&endDate=${encodeURIComponent(monthRange.end.toISOString())}` +
        `&force=${Date.now()}`;

      const response = await fetch(url, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch monthly ranking: ${response.status}`);
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        return [];
      }

      return data
        .map(normalizeOfficer)
        .filter((officer) => officer.hours > 0)
        .sort((a, b) => {
          if (b.hours !== a.hours) return b.hours - a.hours;
          return a.name.localeCompare(b.name);
        })
        .slice(0, 3)
        .map((officer, index) => ({
          ...officer,
          pos: index + 1,
        }));
    },
    refetchInterval: AUTO_REFRESH_MS,
    refetchIntervalInBackground: true,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  if (isLoading) {
    return (
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#050b09]/70 p-8 shadow-[0_24px_90px_rgba(0,0,0,0.32)] backdrop-blur-xl">
        <div className="flex justify-center p-8">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-9 w-9 animate-spin text-yellow-400" />
            <p className="text-xs font-black uppercase tracking-[0.22em] text-muted-foreground">
              A calcular quadro de honra mensal...
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <section className="relative overflow-hidden rounded-[2rem] border border-red-500/20 bg-red-950/20 p-8 shadow-[0_24px_90px_rgba(0,0,0,0.32)] backdrop-blur-xl">
        <div className="flex flex-col items-center gap-4 text-center">
          <AlertTriangle className="h-10 w-10 text-red-400" />

          <div>
            <h3 className="text-sm font-black uppercase tracking-[0.22em] text-red-300">
              Erro no Quadro de Honra
            </h3>

            <p className="mt-2 text-xs text-red-200/70">
              Não foi possível carregar o ranking mensal.
            </p>

            <p className="mt-2 text-[10px] text-red-200/50">
              {error instanceof Error ? error.message : "Erro desconhecido"}
            </p>
          </div>

          <button
            onClick={() => refetch()}
            className="rounded-full border border-red-400/20 bg-red-400/10 px-5 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-red-300 transition hover:bg-red-400/20"
          >
            Tentar novamente
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="relative space-y-6 overflow-hidden rounded-[2rem] border border-white/10 bg-[#050b09]/70 p-6 shadow-[0_24px_90px_rgba(0,0,0,0.32)] backdrop-blur-xl">
      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-yellow-500/10 blur-[110px]" />
      <div className="absolute -bottom-28 left-1/4 h-72 w-72 rounded-full bg-emerald-500/10 blur-[110px]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-yellow-400/35 to-transparent" />

      <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 animate-pulse text-yellow-400" />

            <h3 className="text-sm font-black uppercase tracking-[0.24em] text-white">
              Quadro de Honra Mensal
            </h3>
          </div>

          <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
            {monthRange.label} · apenas pontos fechados
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-full border border-yellow-400/15 bg-yellow-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-yellow-300">
            <CalendarDays className="h-4 w-4" />
            Ranking mensal real
          </div>

          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground transition hover:bg-white/[0.06] hover:text-white"
          >
            <RefreshCw
              className={`h-4 w-4 text-primary ${
                isFetching ? "animate-spin" : ""
              }`}
            />
            Auto 15s
          </button>
        </div>
      </div>

      {officers.length === 0 ? (
        <div className="relative rounded-3xl border border-white/10 bg-white/[0.025] p-10 text-center">
          <Trophy className="mx-auto h-10 w-10 text-slate-600" />

          <p className="mt-4 text-sm font-black uppercase tracking-[0.18em] text-slate-500">
            Ainda não existem horas fechadas neste mês
          </p>
        </div>
      ) : (
        <div className="relative grid grid-cols-1 gap-6 md:grid-cols-3">
          {officers.map((officer, index) => {
            const style = POS_STYLES[index] || POS_STYLES[2];

            return (
              <motion.div
                key={officer.id || index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.02, y: -5 }}
                className="group relative cursor-default"
              >
                <div
                  className={`absolute -inset-0.5 rounded-3xl bg-gradient-to-r ${style.color} opacity-20 blur-lg transition-opacity group-hover:opacity-40`}
                />

                <div
                  className={`glass relative flex flex-col items-center overflow-hidden rounded-3xl border ${style.border} ${style.glow} p-6 text-center`}
                >
                  <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-white/5 blur-[60px]" />

                  <div
                    className={`absolute left-4 top-4 rounded-xl border px-2 py-1 text-[10px] font-black ${style.badge}`}
                  >
                    #{officer.pos}
                  </div>

                  <div className="relative mb-4">
                    <div
                      className={`h-24 w-24 rounded-full bg-gradient-to-br ${style.color} p-1`}
                    >
                      <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-card">
                        {officer.avatar ? (
                          <img
                            src={officer.avatar}
                            alt={officer.name}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <span className="text-2xl font-black text-white">
                            {getInitials(officer.name)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="absolute -bottom-2 -right-2 rounded-full border border-white/10 bg-card p-1">
                      {style.medal}
                    </div>
                  </div>

                  <h4 className="line-clamp-1 text-xl font-black uppercase tracking-tight text-white">
                    {officer.name}
                  </h4>

                  <p className="mt-1 text-xs font-black uppercase tracking-widest text-primary">
                    {officer.numero || "N/A"}
                  </p>

                  <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                    {officer.rank}
                  </p>

                  <div className="mt-5 w-full border-t border-white/10 pt-5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Total mensal
                    </p>

                    <p className="mt-2 text-4xl font-black text-white">
                      {Number(officer.hours || 0).toFixed(1)}
                      <span className="ml-1 text-lg text-muted-foreground">
                        h
                      </span>
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </section>
  );
}