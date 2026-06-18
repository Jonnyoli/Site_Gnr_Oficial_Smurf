import {
  Download,
  Smartphone,
  WifiOff,
  BellRing,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";

export default function AplicacaoMobile() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [installed, setInstalled] = useState(
    window.matchMedia("(display-mode: standalone)").matches,
  );

  useEffect(() => {
    function onPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event);
    }

    window.addEventListener("beforeinstallprompt", onPrompt as EventListener);
    return () =>
      window.removeEventListener("beforeinstallprompt", onPrompt as EventListener);
  }, []);

  async function install() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result.outcome === "accepted") setInstalled(true);
    setInstallPrompt(null);
  }

  return (
    <div className="space-y-6 pb-12">
      <section className="rounded-[2.8rem] border border-primary/15 bg-[#06100c]/95 p-8">
        <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">
              Progressive Web App
            </p>
            <h1 className="mt-3 text-4xl font-black text-white md:text-6xl">
              GNR Central no telemóvel
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-white/45">
              Instala a Central como aplicação, abre em ecrã inteiro e mantém os recursos essenciais disponíveis.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void install()}
            disabled={!installPrompt || installed}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 text-xs font-black uppercase tracking-[0.12em] text-primary-foreground disabled:opacity-40"
          >
            <Download className="h-5 w-5" />
            {installed ? "Aplicação instalada" : "Instalar aplicação"}
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Feature icon={Smartphone} title="Ecrã inteiro" text="Experiência semelhante a uma aplicação nativa." />
        <Feature icon={WifiOff} title="Base offline" text="Interface principal disponível mesmo com ligação instável." />
        <Feature icon={BellRing} title="Notificações" text="Preparada para notificações push numa fase posterior." />
        <Feature icon={ShieldCheck} title="Sessão protegida" text="Mantém as permissões e autenticação da Central." />
      </section>
    </div>
  );
}

function Feature({ icon: Icon, title, text }: any) {
  return (
    <article className="rounded-[1.8rem] border border-white/10 bg-[#06100c]/90 p-5">
      <Icon className="h-6 w-6 text-primary" />
      <h2 className="mt-4 text-lg font-black text-white">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-white/35">{text}</p>
    </article>
  );
}
