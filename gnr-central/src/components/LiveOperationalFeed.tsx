import { motion, AnimatePresence } from "framer-motion";
import { Terminal, Activity, Shield, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";

interface FeedEvent {
  id: string;
  type: "ponto" | "cp" | "warning" | "system";
  message: string;
  timestamp: string;
}

export default function LiveOperationalFeed() {
  const [events, setEvents] = useState<FeedEvent[]>([
    { id: "1", type: "system", message: "Sistema C2 GNR Inicializado", timestamp: "Agora" },
    { id: "2", type: "ponto", message: "GNR #429 entrou em serviço", timestamp: "1m" },
    { id: "3", type: "cp", message: "CP 202 iniciada - Patrulha Local", timestamp: "5m" },
  ]);

  // Simulate new events for "WOW" effect
  useEffect(() => {
    const messages = [
      "Verificação de inatividade concluída",
      "Novo relatório de patrulha submetido",
      "GNR #712 em pausa técnica",
      "CP 101 finalizou patrulha",
      "Atualização de base de dados efetuada",
    ];

    const interval = setInterval(() => {
      const newEvent: FeedEvent = {
        id: Math.random().toString(36).substr(2, 9),
        type: Math.random() > 0.7 ? "warning" : "system",
        message: messages[Math.floor(Math.random() * messages.length)],
        timestamp: "Agora",
      };
      setEvents((prev) => [newEvent, ...prev.slice(0, 4)]);
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="glass rounded-xl overflow-hidden border border-white/5 flex flex-col h-full min-h-[350px]">
      <div className="bg-white/5 px-4 py-3 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-primary" />
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-white">Live Operational Feed</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[10px] text-red-500 font-bold uppercase">REC</span>
        </div>
      </div>
      <div className="p-4 space-y-4 overflow-y-auto flex-1 font-mono">
        <AnimatePresence initial={false}>
          {events.map((event) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex items-start gap-3 text-[11px]"
            >
              <span className="text-muted-foreground whitespace-nowrap">[{event.timestamp}]</span>
              <div className="flex items-center gap-2">
                {event.type === "ponto" && <Shield className="w-3 h-3 text-primary" />}
                {event.type === "cp" && <Activity className="w-3 h-3 text-blue-500" />}
                {event.type === "warning" && <AlertCircle className="w-3 h-3 text-accent" />}
                {event.type === "system" && <Terminal className="w-3 h-3 text-white/40" />}
                <span className={event.type === "warning" ? "text-accent font-bold" : "text-white/80"}>
                  {event.message}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <div className="p-3 bg-primary/5 border-t border-primary/10">
        <div className="flex items-center gap-2">
          <div className="h-1 flex-1 bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-primary"
              animate={{ width: ["0%", "100%"] }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            />
          </div>
          <span className="text-[9px] text-primary font-bold uppercase tracking-tighter">Sync</span>
        </div>
      </div>
    </div>
  );
}
