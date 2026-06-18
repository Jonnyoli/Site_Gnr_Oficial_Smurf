import { useMemo, useState } from "react";
import { useData } from "../context/DataContext";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  FileText,
  Download,
  Eye,
  Calendar,
  User,
  FileArchive,
  FileCheck,
  Upload,
  Loader2,
  RefreshCw,
  Archive,
  ShieldCheck,
  Database,
  FileSearch,
  AlertTriangle,
  FolderOpen,
  Clock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "../context/AuthContext";
import { motion } from "framer-motion";
import PeriodSelector from "../components/PeriodSelector";

type ArquivoFiltro = "todos" | "transcript" | "sem_transcript";

const FILTROS: { value: ArquivoFiltro; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "transcript", label: "Com Transcript" },
  { value: "sem_transcript", label: "Sem Transcript" },
];

function formatLastUpdated(date?: Date | null) {
  if (!date) return "A aguardar";

  return date.toLocaleTimeString("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function getTipoStyling(tipo?: string) {
  switch (tipo) {
    case "Relatório":
      return {
        color: "text-blue-400",
        bg: "bg-blue-500/10",
        border: "border-blue-500/30",
        topStripe: "bg-blue-500",
        icon: FileText,
      };

    case "Decreto":
      return {
        color: "text-purple-400",
        bg: "bg-purple-500/10",
        border: "border-purple-500/30",
        topStripe: "bg-purple-500",
        icon: FileArchive,
      };

    case "Circular":
      return {
        color: "text-amber-400",
        bg: "bg-amber-500/10",
        border: "border-amber-500/30",
        topStripe: "bg-amber-500",
        icon: FileText,
      };

    case "Ordem de Serviço":
      return {
        color: "text-primary",
        bg: "bg-primary/10",
        border: "border-primary/30",
        topStripe: "bg-primary",
        icon: FileCheck,
      };

    case "DOCUMENTO":
      return {
        color: "text-emerald-400",
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/30",
        topStripe: "bg-emerald-500",
        icon: FolderOpen,
      };

    default:
      return {
        color: "text-slate-400",
        bg: "bg-slate-500/10",
        border: "border-slate-500/30",
        topStripe: "bg-slate-500",
        icon: FileText,
      };
  }
}

export default function Arquivos() {
  const {
    arquivos,
    currentArquivos,
    isLoading,
    isFetching,
    lastUpdated,
    refreshData,
  } = useData();

  const { user } = useAuth();
  const { toast } = useToast();

  const isComando =
    user?.roles?.includes("1147878942099906672") ||
    user?.roles?.includes("1147878942066364488");

  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<ArquivoFiltro>("todos");
  const [isUploading, setIsUploading] = useState(false);

  const filteredArquivos = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return (currentArquivos || [])
      .filter((arquivo: any) => {
        if (!arquivo) return false;

        const nome = String(arquivo.nome || "").toLowerCase();
        const tipo = String(arquivo.tipo || "").toLowerCase();
        const responsavel = String(arquivo.responsavel || "").toLowerCase();

        const matchesSearch =
          search.length === 0 ||
          nome.includes(search) ||
          tipo.includes(search) ||
          responsavel.includes(search);

        const hasTranscript = Boolean(arquivo.url);

        const matchesFilter =
          filter === "todos" ||
          (filter === "transcript" && hasTranscript) ||
          (filter === "sem_transcript" && !hasTranscript);

        return matchesSearch && matchesFilter;
      })
      .sort((a: any, b: any) => {
        const timeA = a.dataRaw
          ? new Date(a.dataRaw).getTime()
          : a.dataCriacao
            ? new Date(a.dataCriacao).getTime()
            : 0;

        const timeB = b.dataRaw
          ? new Date(b.dataRaw).getTime()
          : b.dataCriacao
            ? new Date(b.dataCriacao).getTime()
            : 0;

        return (
          (Number.isNaN(timeB) ? 0 : timeB) -
          (Number.isNaN(timeA) ? 0 : timeA)
        );
      });
  }, [currentArquivos, searchTerm, filter]);

  const metrics = useMemo(() => {
    const current = currentArquivos || [];
    const all = arquivos || [];

    const transcript = current.filter((arquivo: any) => Boolean(arquivo.url)).length;
    const semTranscript = current.filter((arquivo: any) => !arquivo.url).length;

    const relatorios = current.filter(
      (arquivo: any) => arquivo.tipo === "Relatório"
    ).length;

    return {
      totalPeriodo: current.length,
      totalGeral: all.length,
      transcript,
      semTranscript,
      relatorios,
    };
  }, [currentArquivos, arquivos]);

  const registerAudit = async ({
    action,
    severity = "info",
    description,
    arquivo,
    metadata,
  }: {
    action: string;
    severity?: "info" | "success" | "warning" | "critical";
    description: string;
    arquivo?: any;
    metadata?: Record<string, any>;
  }) => {
    const apiUrl = import.meta.env.VITE_API_URL || "";

    try {
      await fetch(`${apiUrl}/api/audit/log`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          action,
          module: "Arquivos",
          severity,
          description,
          targetId: arquivo?.id,
          targetName: arquivo?.nome,
          metadata: {
            tipo: arquivo?.tipo,
            url: arquivo?.url,
            ...metadata,
          },
        }),
      });
    } catch (error) {
      console.warn("[AUDIT] Falha ao registar ação de arquivo:", error);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setIsUploading(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || "";

      const response = await fetch(`${apiUrl}/api/data/arquivos/upload`, {
        method: "POST",
        headers: {
          "x-file-name": file.name,
        },
        credentials: "include",
        body: file,
      });

      if (!response.ok) {
        throw new Error("Falha no upload");
      }

      const result = await response.json().catch(() => null);

      await registerAudit({
        action: "DOCUMENT_UPLOAD_REQUESTED",
        severity: "success",
        description: `Upload do documento ${file.name} concluído pela interface.`,
        metadata: {
          fileName: file.name,
          returnedUrl: result?.url,
          returnedFileName: result?.fileName,
        },
      });

      toast({
        title: "Upload concluído",
        description: `O ficheiro ${file.name} foi arquivado com sucesso.`,
      });

      refreshData?.();
    } catch (error) {
      await registerAudit({
        action: "DOCUMENT_UPLOAD_FAILED_FRONTEND",
        severity: "critical",
        description: `Falha ao carregar documento ${file.name}.`,
        metadata: {
          fileName: file.name,
        },
      });

      toast({
        title: "Erro no upload",
        description: "Não foi possível carregar o ficheiro.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleAction = async (action: "view" | "download", arquivo: any) => {
    if (!arquivo.url) {
      toast({
        title: "Documento não disponível",
        description: "Este documento ainda não possui transcript gerado.",
        variant: "destructive",
      });

      await registerAudit({
        action: "DOCUMENT_ACCESS_FAILED",
        severity: "warning",
        description: `Tentativa de acesso a documento sem transcript: ${arquivo.nome}.`,
        arquivo,
      });

      return;
    }

    await registerAudit({
      action: action === "view" ? "DOCUMENT_VIEWED" : "DOCUMENT_DOWNLOADED",
      module: "Arquivos",
      severity: "info",
      description:
        action === "view"
          ? `Documento ${arquivo.nome} foi consultado.`
          : `Documento ${arquivo.nome} foi descarregado.`,
      arquivo,
    });

    if (action === "view") {
      window.open(arquivo.url, "_blank", "noopener,noreferrer");
      return;
    }

    const link = document.createElement("a");
    link.href = arquivo.url;
    link.download = arquivo.nome || "documento";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.click();
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="relative flex flex-col items-center gap-5 rounded-[2rem] border border-white/10 bg-[#050b09]/80 px-12 py-10 shadow-[0_24px_90px_rgba(0,0,0,0.38)] backdrop-blur-xl">
          <div className="absolute inset-0 rounded-[2rem] bg-primary/5 blur-2xl" />
          <Loader2 className="relative h-11 w-11 animate-spin text-primary" />

          <div className="relative text-center">
            <p className="text-sm font-black uppercase tracking-[0.25em] text-white">
              Arquivo Central
            </p>
            <p className="mt-2 text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">
              A carregar documentação arquivada...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-8"
    >
      <section className="relative overflow-hidden rounded-[2.25rem] border border-white/10 bg-[#050b09]/80 p-8 shadow-[0_28px_120px_rgba(0,0,0,0.42)] backdrop-blur-xl">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-primary/10 blur-[110px]" />
        <div className="absolute -bottom-28 left-1/3 h-80 w-80 rounded-full bg-emerald-500/10 blur-[120px]" />
        <div className="absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-primary/45 to-transparent" />

        <div className="relative flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-3 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.25em] text-primary">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                </span>
                Arquivo Operacional
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                <RefreshCw
                  className={`h-3.5 w-3.5 text-primary ${
                    isFetching ? "animate-spin" : ""
                  }`}
                />
                Atualizado {formatLastUpdated(lastUpdated)}
              </div>
            </div>

            <h1 className="flex flex-wrap items-center gap-4 text-4xl font-black tracking-tight text-white md:text-5xl">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-[0_0_40px_rgba(16,185,129,0.16)]">
                <Archive className="h-8 w-8" />
              </span>
              Arquivo Central
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">
              Consulta, organização e gestão de documentos arquivados,
              relatórios, transcripts, circulares e ordens de serviço.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 xl:w-[420px]">
            <PeriodSelector />

            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => refreshData?.()}
                disabled={isFetching}
                variant="outline"
                className="h-11 rounded-2xl border border-primary/20 bg-primary/10 text-xs font-black uppercase tracking-[0.16em] text-primary hover:bg-primary/20"
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
                />
                Atualizar
              </Button>

              {isComando ? (
                <div className="relative">
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    onChange={handleUpload}
                    accept=".html,.pdf,.txt"
                    disabled={isUploading}
                  />

                  <Button
                    asChild
                    disabled={isUploading}
                    className="h-11 w-full rounded-2xl bg-primary text-xs font-black uppercase tracking-[0.16em] text-primary-foreground shadow-[0_0_28px_rgba(16,185,129,0.22)] hover:bg-primary/90"
                  >
                    <label
                      htmlFor="file-upload"
                      className="flex cursor-pointer items-center justify-center"
                    >
                      {isUploading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="mr-2 h-4 w-4" />
                      )}
                      Upload
                    </label>
                  </Button>
                </div>
              ) : (
                <div className="flex h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.035] text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                  Apenas Comando
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Documentos no Período"
          value={metrics.totalPeriodo}
          subtitle={`${metrics.totalGeral} no arquivo geral`}
          icon={<Archive className="h-5 w-5" />}
          tone="primary"
          delay={0.05}
        />

        <MetricCard
          title="Com Transcript"
          value={metrics.transcript}
          subtitle="Disponíveis para consulta"
          icon={<FileCheck className="h-5 w-5" />}
          tone="green"
          delay={0.1}
        />

        <MetricCard
          title="Sem Transcript"
          value={metrics.semTranscript}
          subtitle="A aguardar documento"
          icon={<AlertTriangle className="h-5 w-5" />}
          tone="yellow"
          delay={0.15}
        />

        <MetricCard
          title="Relatórios"
          value={metrics.relatorios}
          subtitle="Registos classificados"
          icon={<FileSearch className="h-5 w-5" />}
          tone="blue"
          delay={0.2}
        />
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
        <div className="glass rounded-3xl border border-white/10 p-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-md">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por documento, tipo ou responsável..."
                className="h-11 rounded-2xl border-white/10 bg-background/60 pl-11 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {FILTROS.map((item) => (
                <button
                  key={item.value}
                  onClick={() => setFilter(item.value)}
                  className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.14em] transition-all ${
                    filter === item.value
                      ? "bg-primary text-primary-foreground shadow-[0_0_18px_rgba(16,185,129,0.22)]"
                      : "border border-white/10 bg-white/[0.035] text-muted-foreground hover:border-white/20 hover:text-white"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <SmallStateCard
            label="Visíveis"
            value={filteredArquivos.length}
            icon={<Eye className="h-4 w-4" />}
            tone="green"
          />

          <SmallStateCard
            label="Período"
            value={currentArquivos.length}
            icon={<Clock className="h-4 w-4" />}
            tone="yellow"
          />
        </div>
      </section>

      {filteredArquivos.length > 0 ? (
        <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredArquivos.map((arquivo: any, index: number) => {
            const style = getTipoStyling(arquivo.tipo);
            const Icon = style.icon;

            return (
              <motion.div
                key={arquivo.id || index}
                initial={{ opacity: 0, y: 18, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: index * 0.04 }}
              >
                <Card className="glass group relative flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_70px_rgba(0,0,0,0.38)]">
                  <div className={`absolute inset-x-0 top-0 h-1 ${style.topStripe}`} />
                  <div className="absolute -right-14 -top-14 h-40 w-40 rounded-full bg-white/5 blur-[70px]" />

                  <CardHeader className="relative pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div
                        className={`rounded-2xl border p-3 ${style.bg} ${style.border}`}
                      >
                        <Icon className={`h-6 w-6 ${style.color}`} />
                      </div>

                      <div className="flex flex-col items-end gap-1.5">
                        <Badge
                          variant="outline"
                          className={`${style.color} border-current bg-transparent text-[10px] font-black uppercase tracking-[0.12em]`}
                        >
                          {arquivo.tipo || "Documento"}
                        </Badge>

                        {arquivo.url ? (
                          <Badge className="border border-primary/30 bg-primary/20 text-[9px] font-black uppercase tracking-[0.1em] text-primary">
                            Transcript
                          </Badge>
                        ) : (
                          <Badge className="border border-yellow-500/30 bg-yellow-500/10 text-[9px] font-black uppercase tracking-[0.1em] text-yellow-400">
                            Sem transcript
                          </Badge>
                        )}
                      </div>
                    </div>

                    <h3
                      className="mt-5 line-clamp-2 text-lg font-black leading-snug text-white transition-colors group-hover:text-primary"
                      title={arquivo.nome}
                    >
                      {arquivo.nome || "Documento sem título"}
                    </h3>
                  </CardHeader>

                  <CardContent className="relative flex-1 py-4">
                    <div className="space-y-3 text-sm font-medium text-muted-foreground">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-primary/80" />
                        <span className="font-mono text-xs">
                          {arquivo.dataCriacao || "N/A"}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <User className="h-4 w-4 text-primary/80" />
                        <span
                          className="truncate"
                          title={arquivo.responsavel}
                        >
                          {arquivo.responsavel || "Sistema"}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <Database className="h-4 w-4 text-primary/80" />
                        <span className="font-mono text-xs">
                          {arquivo.tamanho || "N/A"}
                        </span>
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="relative mt-4 flex items-center justify-between border-t border-white/10 bg-white/[0.02] px-6 py-4">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                      <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                      Arquivado
                    </div>

                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-white/10 hover:text-white"
                        onClick={() => handleAction("view", arquivo)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-white/10 hover:text-white"
                        onClick={() => handleAction("download", arquivo)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              </motion.div>
            );
          })}
        </section>
      ) : (
        <div className="rounded-3xl border border-white/10 bg-white/[0.025] py-16 text-center text-muted-foreground">
          <FileText className="mx-auto mb-4 h-12 w-12 opacity-20" />
          <p className="text-lg font-black uppercase tracking-[0.18em]">
            Nenhum documento encontrado
          </p>
          <p className="mt-2 text-sm">
            Altera o período, pesquisa ou filtro selecionado.
          </p>
        </div>
      )}
    </motion.div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  tone,
  delay,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  tone: "primary" | "green" | "yellow" | "blue";
  delay: number;
}) {
  const toneMap = {
    primary: "border-t-primary bg-primary/10 text-primary",
    green: "border-t-emerald-500 bg-emerald-500/10 text-emerald-400",
    yellow: "border-t-yellow-500 bg-yellow-500/10 text-yellow-400",
    blue: "border-t-blue-500 bg-blue-500/10 text-blue-400",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay }}
    >
      <div
        className={`glass rounded-3xl border border-white/10 border-t-2 p-5 ${toneMap[tone]}`}
      >
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-bold text-muted-foreground">{title}</p>

          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-current/10">
            {icon}
          </div>
        </div>

        <p className="text-3xl font-black tracking-tight text-white">{value}</p>
        <p className="mt-2 text-xs font-bold">{subtitle}</p>
      </div>
    </motion.div>
  );
}

function SmallStateCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "green" | "yellow";
}) {
  const toneMap = {
    green: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
    yellow: "border-yellow-500/20 bg-yellow-500/10 text-yellow-400",
  };

  return (
    <div className={`rounded-3xl border p-4 ${toneMap[tone]}`}>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] opacity-80">
          {label}
        </p>

        {icon}
      </div>

      <p className="text-3xl font-black text-white">{value}</p>
    </div>
  );
}