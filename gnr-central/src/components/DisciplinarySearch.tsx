import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Scale, AlertCircle, ChevronRight, Gavel } from "lucide-react";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";

const MOCK_RULES = [
  { id: 1, art: "Art. 12", desc: "Desobediência a ordens diretas de superior hierárquico.", penalty: "Suspensão 2-5 dias", gravity: "Grave" },
  { id: 2, art: "Art. 45", desc: "Uso indevido de equipamento policial ou viatura.", penalty: "Advertência escrita", gravity: "Leve" },
  { id: 3, art: "Art. 8", desc: "Abandono de posto sem autorização prévia.", penalty: "Suspensão 10-30 dias", gravity: "Muito Grave" },
  { id: 4, art: "Art. 102", desc: "Não preenchimento de relatório operacional diário.", penalty: "Advertência verbal", gravity: "Leve" },
  { id: 5, art: "Art. 67", desc: "Conduta imprópria perante civis ou insultos.", penalty: "Suspensão 1-3 dias", gravity: "Moderada" },
];

export default function DisciplinarySearch() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredRules = MOCK_RULES.filter(r => 
    r.desc.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.art.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card className="glass border-white/5 h-full flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
            <Scale className="w-5 h-5 text-accent" />
            Explorador do Regulamento Disciplinar
          </CardTitle>
          <Gavel className="w-8 h-8 text-white/5" />
        </div>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Pesquisar por Artigo ou Descrição (ex: Desobediência)..." 
            className="pl-10 bg-white/5 border-white/10 text-sm h-11 focus:ring-primary"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto space-y-3">
        <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2 flex justify-between">
          <span>Resultados: {filteredRules.length}</span>
          <span>Regulamento V4.2</span>
        </div>
        
        <AnimatePresence mode="popLayout">
          {filteredRules.length > 0 ? filteredRules.map((rule) => (
            <motion.div
              key={rule.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="group p-4 rounded-xl bg-white/5 border border-white/5 hover:border-accent/30 hover:bg-accent/5 transition-all cursor-default"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-accent font-mono uppercase">{rule.art}</span>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      rule.gravity === 'Muito Grave' ? 'bg-red-500/20 text-red-500' :
                      rule.gravity === 'Grave' ? 'bg-orange-500/20 text-orange-500' :
                      'bg-primary/20 text-primary'
                    }`}>
                      {rule.gravity}
                    </span>
                  </div>
                  <p className="text-sm text-white/90 leading-relaxed">{rule.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-accent group-hover:translate-x-1 transition-all shrink-0 mt-1" />
              </div>
              <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2">
                <AlertCircle className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Pena sugerida:</span>
                <span className="text-[11px] font-bold text-white">{rule.penalty}</span>
              </div>
            </motion.div>
          )) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="w-12 h-12 text-white/5 mb-4" />
              <p className="text-sm text-muted-foreground">Nenhum artigo encontrado para "{searchTerm}"</p>
            </div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
