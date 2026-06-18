import { Link } from "wouter";
import {
  Building2,
  ChevronRight,
  ClipboardCheck,
  FileSearch,
  Gavel,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

const modules = [
  {
    title: "Conselho de Elite da Guarda",
    description:
      "Fiscalizações, acompanhamento das unidades, desafios e pareceres ao Comando.",
    href: "/departamentos/ceg/fiscalizacoes",
    icon: ShieldCheck,
    accent: "text-amber-300",
  },
  {
    title: "Conselho Superior de Oficiais",
    description:
      "Reuniões, análise integral do efetivo, avaliações, votação e atas oficiais.",
    href: "/departamentos/cso/reunioes",
    icon: UsersRound,
    accent: "text-violet-300",
  },
  {
    title: "Departamento de Recursos Humanos",
    description:
      "Ausências, despedimentos, folhas de ponto, portes e limpezas de cadastro.",
    href: "/departamentos/drh",
    icon: ClipboardCheck,
    accent: "text-emerald-300",
  },
  {
    title: "Centro Executivo do Comando",
    description:
      "Decisões pendentes, documentos para assinatura, prazos e alertas.",
    href: "/departamentos/comando/decisoes",
    icon: Gavel,
    accent: "text-primary",
  },
  {
    title: "Pesquisa Administrativa",
    description:
      "Pesquisa transversal por militar, processo, documento e código de verificação.",
    href: "/departamentos/pesquisa",
    icon: FileSearch,
    accent: "text-sky-300",
  },
];

export default function DepartamentosSuite() {
  return (
    <div className="space-y-6 pb-14">
      <section className="rounded-[2.6rem] border border-primary/15 bg-[#06100c]/95 p-7">
        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-primary">
          Administração integrada
        </p>
        <h1 className="mt-3 text-4xl font-black text-white">
          Suite dos Departamentos
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/35">
          Processos, fiscalizações, reuniões, decisões, documentos e auditoria
          num único fluxo institucional.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {modules.map((module) => {
          const Icon = module.icon;

          return (
            <Link
              key={module.href}
              href={module.href}
              className="group rounded-[2rem] border border-white/10 bg-[#06100c]/90 p-6 transition hover:border-primary/25"
            >
              <div className="flex items-start justify-between gap-5">
                <div className="flex gap-4">
                  <span className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/20">
                    <Icon className={`h-6 w-6 ${module.accent}`} />
                  </span>
                  <div>
                    <h2 className="text-xl font-black text-white">
                      {module.title}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-white/35">
                      {module.description}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-white/20 transition group-hover:translate-x-1 group-hover:text-primary" />
              </div>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
