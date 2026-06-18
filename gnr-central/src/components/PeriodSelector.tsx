import { useData, PeriodType } from "../context/DataContext";
import { Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function PeriodSelector() {
  const { period, setPeriod, customRange, setCustomRange } = useData();

  const presets: { value: PeriodType; label: string }[] = [
    { value: "diario", label: "Diário" },
    { value: "semanal", label: "Semanal" },
    { value: "mensal", label: "Mensal" },
    { value: "personalizado", label: "Personalizado" },
  ];

  return (
    <div className="glass rounded-2xl p-6 border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden group">
      {/* Background soft glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[50px] rounded-full pointer-events-none" />
      
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-[0_0_15px_rgba(var(--primary),0.15)]">
          <Calendar className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-widest">Filtro de Período</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Ajuste o intervalo de dados no centro operacional</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 self-stretch md:self-auto">
        <div className="flex flex-wrap gap-2 bg-background/50 border border-white/5 p-1 rounded-xl w-fit">
          {presets.map((preset) => {
            const isActive = period === preset.value;
            return (
              <button
                key={preset.value}
                onClick={() => setPeriod(preset.value)}
                className={`relative px-4 py-2 rounded-lg text-xs font-semibold tracking-wider uppercase transition-all duration-300 cursor-pointer
                  ${isActive 
                    ? "bg-primary text-black font-extrabold shadow-[0_0_15px_hsla(var(--primary)/0.4)]" 
                    : "text-muted-foreground hover:text-white hover:bg-white/5"
                  }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        <AnimatePresence>
          {period === "personalizado" && (
            <motion.div
              initial={{ opacity: 0, width: 0, scale: 0.95 }}
              animate={{ opacity: 1, width: "auto", scale: 1 }}
              exit={{ opacity: 0, width: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2 overflow-hidden bg-background/50 border border-white/5 p-2 rounded-xl"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold pl-1">De</span>
                <input
                  type="date"
                  value={customRange.start}
                  onChange={(e) => setCustomRange({ ...customRange, start: e.target.value })}
                  className="bg-card border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-primary/50 font-mono"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">A</span>
                <input
                  type="date"
                  value={customRange.end}
                  onChange={(e) => setCustomRange({ ...customRange, end: e.target.value })}
                  className="bg-card border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-primary/50 font-mono"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
