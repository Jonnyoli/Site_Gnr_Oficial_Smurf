import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Disc3,
  Fingerprint,
  Lock,
  Radar,
  Server,
  ShieldCheck,
  Sparkles,
  Wifi,
} from "lucide-react";

type ApiStatus = "checking" | "online" | "offline";

const LOGO_PATH = "/gnr_logo.png";
const API_LABEL = import.meta.env.VITE_API_URL || "proxy local /api";

export default function Login() {
  const [apiStatus, setApiStatus] = useState<ApiStatus>("checking");

  useEffect(() => {
    async function checkApi() {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || "";

        const response = await fetch(`${apiUrl}/api/auth/me`, {
          credentials: "include",
        });

        if (response.ok || response.status === 401) {
          setApiStatus("online");
        } else {
          setApiStatus("offline");
        }
      } catch {
        setApiStatus("offline");
      }
    }

    checkApi();
  }, []);

  function handleDiscordLogin() {
    const apiUrl = import.meta.env.VITE_API_URL || "";
    window.location.href = `${apiUrl}/api/auth/discord`;
  }

  const apiLabel =
    apiStatus === "checking"
      ? "A verificar"
      : apiStatus === "online"
        ? "Online"
        : "Offline";

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#020403] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_20%,rgba(16,185,129,0.28),transparent_28%),radial-gradient(circle_at_80%_80%,rgba(234,179,8,0.16),transparent_32%),linear-gradient(135deg,#020403_0%,#06140d_45%,#010201_100%)]" />

      <div className="absolute inset-0 opacity-[0.06] bg-[linear-gradient(rgba(255,255,255,0.10)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.10)_1px,transparent_1px)] bg-[size:60px_60px]" />

      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.04),rgba(0,0,0,0.88))]" />

      <div className="absolute -left-40 top-0 h-[600px] w-[600px] rounded-full bg-emerald-500/10 blur-[170px]" />
      <div className="absolute -right-40 bottom-0 h-[620px] w-[620px] rounded-full bg-yellow-400/10 blur-[180px]" />

      <motion.div
        initial={{ opacity: 0.08, y: "-20%" }}
        animate={{ opacity: [0.05, 0.2, 0.05], y: ["-20%", "120%"] }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        className="pointer-events-none absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-300/70 to-transparent shadow-[0_0_60px_rgba(16,185,129,0.65)]"
      />

      <div className="absolute left-8 top-8 hidden h-32 w-32 xl:block">
        <div className="absolute left-0 top-0 h-px w-full bg-gradient-to-r from-emerald-300/80 to-transparent" />
        <div className="absolute left-0 top-0 h-full w-px bg-gradient-to-b from-emerald-300/80 to-transparent" />
      </div>

      <div className="absolute bottom-8 right-8 hidden h-32 w-32 xl:block">
        <div className="absolute bottom-0 right-0 h-px w-full bg-gradient-to-l from-yellow-300/70 to-transparent" />
        <div className="absolute bottom-0 right-0 h-full w-px bg-gradient-to-t from-yellow-300/70 to-transparent" />
      </div>

      <main className="relative z-10 grid h-full w-full grid-cols-1 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="relative hidden items-center justify-center overflow-hidden lg:flex">
          <div className="absolute h-[560px] w-[560px] rounded-full border border-emerald-400/10" />
          <div className="absolute h-[430px] w-[430px] rounded-full border border-dashed border-white/10" />
          <div className="absolute h-[320px] w-[320px] rounded-full border border-yellow-300/10" />

          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 32, repeat: Infinity, ease: "linear" }}
            className="absolute h-[500px] w-[500px] rounded-full border border-emerald-400/10"
          />

          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 46, repeat: Infinity, ease: "linear" }}
            className="absolute h-[390px] w-[390px] rounded-full border border-dashed border-white/10"
          />

          <Radar className="absolute h-[520px] w-[520px] text-emerald-400/10" />

          <motion.div
            initial={{ opacity: 0, scale: 0.86, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative flex h-72 w-72 items-center justify-center rounded-[4rem] border border-emerald-300/35 bg-emerald-500/10 p-10 shadow-[0_0_160px_rgba(16,185,129,0.38)]"
          >
            <div className="absolute inset-0 rounded-[4rem] bg-gradient-to-br from-white/16 via-transparent to-emerald-300/14" />
            <div className="absolute -inset-8 rounded-[5rem] border border-emerald-300/10" />
            <div className="absolute -inset-20 rounded-full bg-emerald-400/5 blur-3xl" />

            <img
              src={LOGO_PATH}
              alt="Brasão GNR"
              className="relative h-full w-full object-contain drop-shadow-[0_0_42px_rgba(16,185,129,0.52)]"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.75 }}
            className="absolute bottom-16 left-16 max-w-2xl"
          >
            <p className="text-[11px] font-black uppercase tracking-[0.55em] text-emerald-400">
              Guarda Nacional
            </p>

            <h1 className="mt-5 text-7xl font-black uppercase leading-[0.95] tracking-tight text-white xl:text-8xl">
              Central
              <span className="block bg-gradient-to-r from-emerald-300 via-emerald-100 to-yellow-200 bg-clip-text text-transparent">
                GNR
              </span>
            </h1>

            <p className="mt-6 text-sm font-medium uppercase tracking-[0.22em] text-slate-500">
              Terminal seguro · Operação do futuro
            </p>
          </motion.div>
        </section>

        <section className="relative flex h-full items-center justify-center p-6 lg:p-10">
          <motion.div
            initial={{ opacity: 0, x: 28, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="relative w-full max-w-[520px]"
          >
            <div className="absolute -inset-[1px] rounded-[3rem] bg-gradient-to-br from-emerald-300/35 via-white/5 to-yellow-300/25 blur-2xl" />

            <div className="relative overflow-hidden rounded-[3rem] border border-white/10 bg-black/55 p-8 shadow-[0_45px_160px_rgba(0,0,0,0.82)] backdrop-blur-2xl xl:p-10">
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.09] via-transparent to-emerald-400/[0.04]" />
              <div className="absolute -right-28 -top-28 h-72 w-72 rounded-full bg-yellow-400/10 blur-[110px]" />
              <div className="absolute -bottom-28 -left-28 h-72 w-72 rounded-full bg-emerald-400/10 blur-[110px]" />

              <div className="relative">
                <div className="mb-8 flex flex-col items-center text-center">
                  <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-[2rem] border border-yellow-300/25 bg-yellow-400/10 p-5 shadow-[0_0_80px_rgba(234,179,8,0.18)] lg:hidden">
                    <img
                      src={LOGO_PATH}
                      alt="Brasão GNR"
                      className="h-full w-full object-contain"
                    />
                  </div>

                  <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                    </span>
                    Sistema Ativo
                  </div>

                  <h2 className="text-4xl font-black uppercase tracking-tight text-white">
                    Acesso Restrito
                  </h2>

                  <p className="mt-3 max-w-sm text-sm leading-6 text-slate-400">
                    Entrada autorizada através de autenticação institucional.
                  </p>
                </div>

                <div className="mb-7 grid grid-cols-3 gap-3">
                  <StatusCard
                    icon={<Server className="h-4 w-4" />}
                    label="API"
                    value={apiLabel}
                    tone={
                      apiStatus === "checking"
                        ? "warning"
                        : apiStatus === "online"
                          ? "success"
                          : "danger"
                    }
                  />

                  <StatusCard
                    icon={<Lock className="h-4 w-4" />}
                    label="Rede"
                    value="Segura"
                    tone="success"
                  />

                  <StatusCard
                    icon={<ShieldCheck className="h-4 w-4" />}
                    label="OAuth"
                    value="Ativo"
                    tone="success"
                  />
                </div>

                <button
                  onClick={handleDiscordLogin}
                  className="group relative flex h-16 w-full items-center justify-center gap-3 overflow-hidden rounded-2xl border border-violet-300/40 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 px-6 text-sm font-black uppercase tracking-[0.18em] text-white shadow-[0_30px_90px_rgba(99,102,241,0.45)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_40px_120px_rgba(99,102,241,0.68)] active:translate-y-0"
                >
                  <span className="absolute inset-0 translate-x-[-120%] bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-[120%]" />

                  <Disc3 className="relative h-5 w-5" />
                  <span className="relative">Entrar com Discord</span>
                  <ArrowRight className="relative h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5" />
                </button>

                <div className="mt-8 grid grid-cols-3 gap-3">
                  <MiniBox
                    icon={<Fingerprint className="h-4 w-4" />}
                    label="ID"
                  />
                  <MiniBox
                    icon={<Wifi className="h-4 w-4" />}
                    label="SYNC"
                  />
                  <MiniBox
                    icon={<CheckCircle2 className="h-4 w-4" />}
                    label="OK"
                  />
                </div>

                <div className="mt-8 rounded-3xl border border-emerald-400/15 bg-emerald-400/[0.045] p-5">
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
                      <ShieldCheck className="h-5 w-5" />
                    </div>

                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-300">
                        Permissões verificadas
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-400">
                        Validação automática por cargos autorizados.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 border-t border-white/10 pt-6 text-center">
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-600">
                    GNR Central · Terminal Seguro
                  </p>

                  {import.meta.env.DEV && (
                    <p className="mt-2 text-[10px] text-slate-700">
                      API configurada: {API_LABEL}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </section>
      </main>
    </div>
  );
}

function StatusCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "success" | "warning" | "danger";
}) {
  const styles = {
    success: {
      icon: "bg-emerald-500/10 text-emerald-400",
      value: "text-emerald-400",
    },
    warning: {
      icon: "bg-yellow-500/10 text-yellow-400",
      value: "text-yellow-400",
    },
    danger: {
      icon: "bg-red-500/10 text-red-400",
      value: "text-red-400",
    },
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-3 text-center">
      <div
        className={`mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-xl ${styles[tone].icon}`}
      >
        {icon}
      </div>

      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>

      <p className={`mt-1 truncate text-[10px] font-black uppercase ${styles[tone].value}`}>
        {value}
      </p>
    </div>
  );
}

function MiniBox({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center text-slate-500">
      <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04]">
        {icon}
      </div>

      <p className="text-[8px] font-black uppercase tracking-[0.18em]">
        {label}
      </p>
    </div>
  );
}