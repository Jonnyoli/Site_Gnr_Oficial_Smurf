import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, Pause, Square, FilePlus, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function QuickActions() {
  return (
    <Card className="glass border-t-2 border-t-primary h-full">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
          <Play className="w-4 h-4 text-primary" />
          Ações Rápidas
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-3">
        <Button variant="outline" className="justify-start gap-3 h-11 border-primary/20 hover:bg-primary/10 hover:text-primary transition-all group">
          <Play className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
          <span className="font-semibold uppercase tracking-wider text-xs">Entrar em Serviço</span>
        </Button>
        <Button variant="outline" className="justify-start gap-3 h-11 border-accent/20 hover:bg-accent/10 hover:text-accent transition-all group">
          <Pause className="w-4 h-4 text-accent group-hover:scale-110 transition-transform" />
          <span className="font-semibold uppercase tracking-wider text-xs">Pausa Técnica</span>
        </Button>
        <Button variant="outline" className="justify-start gap-3 h-11 border-destructive/20 hover:bg-destructive/10 hover:text-destructive transition-all group">
          <Square className="w-4 h-4 text-destructive group-hover:scale-110 transition-transform" />
          <span className="font-semibold uppercase tracking-wider text-xs">Sair de Serviço</span>
        </Button>
        <div className="h-px bg-white/5 my-1" />
        <Button variant="outline" className="justify-start gap-3 h-11 border-white/10 hover:bg-white/5 transition-all group">
          <FilePlus className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
          <span className="font-semibold uppercase tracking-wider text-xs">Novo Relatório</span>
        </Button>
        <Button variant="outline" className="justify-start gap-3 h-11 border-white/10 hover:bg-white/5 transition-all group">
          <AlertTriangle className="w-4 h-4 text-red-500 group-hover:scale-110 transition-transform" />
          <span className="font-semibold uppercase tracking-wider text-xs">Reportar Ocorrência</span>
        </Button>
      </CardContent>
    </Card>
  );
}
