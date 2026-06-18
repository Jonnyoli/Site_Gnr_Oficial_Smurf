import { motion } from "framer-motion";
import { MapPin, Search } from "lucide-react";

export default function OperationalRadar() {
  return (
    <div className="glass rounded-xl overflow-hidden border border-white/5 h-full min-h-[350px] relative flex flex-col">
      <div className="bg-white/5 px-4 py-3 border-b border-white/5 flex items-center gap-2">
        <Search className="w-4 h-4 text-accent" />
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-white">Radar Tático de Patrulhas</h3>
      </div>
      
      <div className="flex-1 relative flex items-center justify-center overflow-hidden p-8">
        {/* Radar Background */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
          <div className="w-[80%] aspect-square rounded-full border border-primary/40 flex items-center justify-center">
            <div className="w-[70%] aspect-square rounded-full border border-primary/30 flex items-center justify-center">
              <div className="w-[60%] aspect-square rounded-full border border-primary/20 flex items-center justify-center">
                <div className="w-[40%] aspect-square rounded-full border border-primary/10" />
              </div>
            </div>
          </div>
          <div className="absolute h-full w-[1px] bg-primary/20" />
          <div className="absolute w-full h-[1px] bg-primary/20" />
        </div>

        {/* Radar Sweep */}
        <motion.div 
          className="absolute w-[45%] h-[45%] origin-bottom-right"
          style={{ 
            top: '5%', 
            left: '5%',
            background: 'conic-gradient(from 0deg, rgba(16, 185, 129, 0) 0deg, rgba(16, 185, 129, 0.2) 90deg, rgba(16, 185, 129, 0) 90deg)'
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        />

        {/* Patrol Points (Mocked but animated) */}
        <PatrolPoint x="20%" y="30%" id="CP 101" />
        <PatrolPoint x="70%" y="25%" id="CP 202" />
        <PatrolPoint x="40%" y="70%" id="CP 105" />
        <PatrolPoint x="60%" y="55%" id="CP 301" />

        <div className="z-10 bg-background/80 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-[10px] text-white font-mono uppercase tracking-widest flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          4 Unidades em Movimento
        </div>
      </div>
    </div>
  );
}

function PatrolPoint({ x, y, id }: { x: string, y: string, id: string }) {
  return (
    <motion.div 
      className="absolute group z-20"
      style={{ left: x, top: y }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div className="relative">
        <div className="absolute inset-0 bg-primary/40 blur-md rounded-full animate-pulse" />
        <div className="w-3 h-3 bg-primary rounded-full border-2 border-white relative">
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-card border border-white/10 px-2 py-0.5 rounded text-[9px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
            {id}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
