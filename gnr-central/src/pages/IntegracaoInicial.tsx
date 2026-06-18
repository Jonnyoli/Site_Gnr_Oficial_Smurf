import {
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  Award,
  BadgeCheck,
  BellRing,
  BookOpenCheck,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Command,
  Copy,
  Database,
  FileText,
  GraduationCap,
  HelpCircle,
  Home,
  Layers3,
  LockKeyhole,
  MapPinned,
  Medal,
  MessageSquareText,
  Music2,
  Radio,
  Route,
  ScrollText,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  Ticket,
  Trophy,
  Users,
  Wifi,
  X,
  Zap,
} from "lucide-react";

import {
  Link,
} from "wouter";

type SectionKey =
  | "inicio"
  | "site"
  | "discord"
  | "regras"
  | "comandos"
  | "nic"
  | "loja"
  | "faq";

type ChecklistItem = {
  id: string;
  title: string;
  description: string;
  reward?: string;
};

const STORAGE_KEY =
  "gnr-integracao-v10-progress";

const CHECKLIST: ChecklistItem[] = [
  {
    id: "conta",
    title: "Confirmar conta e identidade",
    description:
      "Entra com Discord, confirma o teu nome, posto, cargos e unidade.",
    reward:
      "+50 créditos",
  },
  {
    id: "perfil",
    title: "Ver o Perfil do Guarda",
    description:
      "Confirma o teu dossier, horas, CPs, cargos, medalhas, formações e atividade.",
    reward:
      "Emblema Recruta Integrado",
  },
  {
    id: "site",
    title: "Aprender os módulos do site",
    description:
      "Lê o tutorial da Central, entende Início, Loja, Ponto, CPs, EG e NIC.",
    reward:
      "+100 créditos",
  },
  {
    id: "discord",
    title: "Aprender o Discord",
    description:
      "Consulta canais, comandos, tickets, regras e forma correta de comunicar.",
    reward:
      "Título Novo Elemento",
  },
  {
    id: "regras",
    title: "Ler o regulamento essencial",
    description:
      "Serviço, patrulhas, NIC, conduta, Discord e imagem institucional.",
    reward:
      "+150 créditos",
  },
  {
    id: "final",
    title: "Concluir integração",
    description:
      "Confirma que compreendeste o funcionamento da Guarda e da Central.",
    reward:
      "Integração concluída",
  },
];

const SITE_MODULES = [
  {
    title: "Início",
    icon: Home,
    href: "/",
    description:
      "Resumo diário da Guarda com pontos ativos, CPs, alertas, atalhos e atividade recente.",
    who:
      "Todos os elementos.",
    rules: [
      "Consulta antes de iniciar serviço.",
      "Usa os atalhos para entrar rapidamente no módulo certo.",
      "Confirma alertas pendentes antes de patrulhar.",
    ],
  },
  {
    title: "Perfil do Guarda",
    icon: ShieldCheck,
    href: "/perfil",
    description:
      "Dossier individual com identificação, carreira, horas, CPs, cargos, medalhas, formações e atividade.",
    who:
      "Todos os elementos autenticados.",
    rules: [
      "Confirma se o teu posto e unidade estão corretos.",
      "Usa o perfil como resumo do teu percurso.",
      "Reporta divergências ao DRH ou Comando.",
    ],
  },
  {
    title: "Folha de Ponto",
    icon: Clock3,
    href: "/folha-ponto",
    description:
      "Registo de entrada, pausa, retoma e fecho do serviço.",
    who:
      "Guardas, sargentos, oficiais e comando.",
    rules: [
      "Inicia ponto ao entrar em serviço.",
      "Fecha ponto quando terminares.",
      "Não mantenhas ponto aberto sem atividade operacional.",
    ],
  },
  {
    title: "Registo de CPs",
    icon: Route,
    href: "/registo-cps",
    description:
      "Gestão de patrulhas, comandante, membros, viatura, zona e histórico.",
    who:
      "Elementos em serviço e chefias com permissões.",
    rules: [
      "Toda CP deve ter comandante identificado.",
      "Evita CP simultânea sem autorização.",
      "Regista entradas e saídas de membros corretamente.",
    ],
  },
  {
    title: "Escola da Guarda",
    icon: GraduationCap,
    href: "/escola/gestao",
    description:
      "Manuais, formações, formadores, exames, certificados e evolução formativa.",
    who:
      "Formandos, formadores, Direção EG e comando.",
    rules: [
      "Lê os manuais antes das avaliações.",
      "Cumpre etapas de formação obrigatórias.",
      "Respeita critérios de aprovação e reprovação.",
    ],
  },
  {
    title: "NIC",
    icon: Search,
    href: "/investigacoes",
    description:
      "Investigações, provas, tickets, histórico e comunicação operacional com a Direção NIC.",
    who:
      "NIC, Direção NIC, Comando e elementos autorizados.",
    rules: [
      "Comunica crimes sem detenção ao NIC.",
      "Anexa provas sempre que existam.",
      "Mantém descrições claras e objetivas.",
    ],
  },
  {
    title: "Loja",
    icon: Sparkles,
    href: "/loja",
    description:
      "Créditos, temas, fundos, molduras, emblemas, efeitos e personalização social.",
    who:
      "Todos os elementos.",
    rules: [
      "Compra apenas itens que pretendes usar.",
      "Testa temas em preview antes de equipar.",
      "A loja é estética e não substitui cargos reais.",
    ],
  },
  {
    title: "Auditoria e Administração",
    icon: Database,
    href: "/auditoria",
    description:
      "Histórico de ações, acessos, loja, ponto, CPs e eventos importantes.",
    who:
      "Comando, DRH e cargos autorizados.",
    rules: [
      "Não apagues informação operacional relevante.",
      "Usa auditoria para confirmar alterações.",
      "Ações administrativas devem ter motivo.",
    ],
  },
];

const DISCORD_GUIDE = [
  {
    title: "Canais oficiais",
    icon: Radio,
    items: [
      "Comunicados — decisões, cerimónias e informação oficial.",
      "Avisos — alertas operacionais e instruções imediatas.",
      "Regras — regulamento, código ético, vestuário e procedimentos.",
      "Agenda — eventos, reuniões, formações e atividades.",
    ],
  },
  {
    title: "Como comunicar",
    icon: MessageSquareText,
    items: [
      "Usa linguagem profissional.",
      "Evita spam e mensagens fora do canal correto.",
      "Respeita a hierarquia e a cadeia de comando.",
      "Quando houver dúvida operacional, pergunta antes de agir.",
    ],
  },
  {
    title: "Tickets e apoio",
    icon: Ticket,
    items: [
      "Usa tickets para assuntos administrativos ou operacionais sensíveis.",
      "Descreve sempre o caso com clareza.",
      "Anexa imagens, vídeos, links ou contexto quando necessário.",
      "Não abras múltiplos tickets para o mesmo assunto.",
    ],
  },
  {
    title: "Integração com o site",
    icon: Wifi,
    items: [
      "O Discord e o site trabalham juntos em ponto, CPs, tickets e provas.",
      "Algumas ações no Discord podem aparecer no site.",
      "Algumas ações no site podem gerar mensagem ou registo no Discord.",
      "Confirma sempre se estás autenticado com a conta certa.",
    ],
  },
];

const COMMANDS = [
  {
    group: "Serviço",
    icon: Clock3,
    commands: [
      ["/ponto iniciar", "Inicia o teu serviço."],
      ["/ponto status", "Consulta o estado do teu ponto."],
      ["/ponto fechar", "Fecha o serviço quando terminares."],
      ["/cp iniciar", "Cria uma patrulha/CP."],
      ["/cp adicionar", "Adiciona elemento à CP."],
      ["/cp remover", "Remove elemento da CP."],
      ["/cp fechar", "Fecha a CP com registo final."],
    ],
  },
  {
    group: "NIC",
    icon: Search,
    commands: [
      ["/central_nic", "Cria ticket/caso para investigação NIC."],
      ["/anexar_prova", "Anexa prova a uma investigação."],
      ["Comunicação NIC", "Usa sempre quando houver crime sem detenção."],
    ],
  },
  {
    group: "Gestão",
    icon: Command,
    commands: [
      ["/painel_tags", "Gestão de tags/cargos."],
      ["/controlar_acessos", "Controlo de permissões."],
      ["/dashboard_setup", "Configura painel operacional em canal."],
    ],
  },
];

const RULES = [
  {
    title: "Serviço",
    icon: Clock3,
    rules: [
      "O ponto deve ser iniciado quando o guarda entra em serviço.",
      "O ponto deve ser fechado quando termina o serviço.",
      "Não é permitido ficar em serviço sem atividade operacional.",
      "Ausências, pausas e fechos devem ser registados corretamente.",
    ],
  },
  {
    title: "Patrulhas",
    icon: Route,
    rules: [
      "Patrulhas devem ocorrer preferencialmente com 2 a 3 elementos.",
      "Patrulhar sozinho só deve acontecer quando autorizado ou por oficiais-generais.",
      "Toda CP deve ter comandante identificado.",
      "Alterações de membros devem ficar registadas.",
    ],
  },
  {
    title: "NIC",
    icon: Search,
    rules: [
      "Sempre que um crime for observado e não houver detenção, comunica ao NIC.",
      "Anexa provas quando existirem: imagem, vídeo, link, descrição e hora.",
      "O ticket deve conter descrição objetiva da ocorrência.",
      "A Direção NIC pode solicitar informação adicional.",
    ],
  },
  {
    title: "Discord",
    icon: MessageSquareText,
    rules: [
      "Usa os canais corretos.",
      "Evita spam, abuso de menções e conversas fora do local certo.",
      "Não apagues informação operacional relevante.",
      "Não abuses de comandos ou painéis.",
    ],
  },
  {
    title: "Conduta",
    icon: ShieldAlert,
    rules: [
      "Respeito entre todos os elementos.",
      "Comunicação profissional.",
      "Cumprimento das ordens superiores.",
      "Proteção da imagem e prestígio da Guarda.",
    ],
  },
];

const NIC_FLOW = [
  "Crime observado",
  "Não houve detenção no local",
  "Criar comunicação/ticket NIC",
  "Anexar provas disponíveis",
  "Direção NIC avalia",
  "Seguimento operacional",
];

const FAQ = [
  [
    "Sou novo, por onde começo?",
    "Começa pela checklist desta página. Depois confirma o teu perfil, lê regras, aprende ponto/CP e só depois entra em serviço operacional.",
  ],
  [
    "Quando uso o NIC?",
    "Sempre que exista crime observado, fuga, suspeito não detido ou informação que possa originar investigação.",
  ],
  [
    "O site substitui o Discord?",
    "Não. O site centraliza registos e consulta; o Discord continua a ser usado para comunicação, tickets e ações rápidas.",
  ],
  [
    "A loja dá cargos reais?",
    "Não. A loja é estética/social. Cargos, permissões e hierarquia continuam a ser definidos pela instituição.",
  ],
];

const GLOSSARY = [
  ["CP", "Companhia/Composição de Patrulha."],
  ["Ponto", "Registo de tempo de serviço."],
  ["NIC", "Núcleo de Investigação Criminal."],
  ["DRH", "Direção de Recursos Humanos."],
  ["EG", "Escola da Guarda."],
  ["Ticket", "Canal/processo de apoio ou investigação no Discord."],
];

function readProgress(): string[] {
  try {
    return JSON.parse(
      localStorage.getItem(STORAGE_KEY) ||
        "[]",
    );
  } catch {
    return [];
  }
}

export default function IntegracaoInicial() {
  const [
    activeSection,
    setActiveSection,
  ] =
    useState<SectionKey>("inicio");

  const [
    completed,
    setCompleted,
  ] =
    useState<string[]>(
      typeof window === "undefined"
        ? []
        : readProgress(),
    );

  const [
    accepted,
    setAccepted,
  ] =
    useState(
      completed.includes("final"),
    );

  const completedSet =
    useMemo(
      () => new Set(completed),
      [completed],
    );

  const percent =
    Math.round(
      (completed.length /
        CHECKLIST.length) *
        100,
    );

  function toggleChecklist(id: string) {
    setCompleted((previous) => {
      const next =
        previous.includes(id)
          ? previous.filter(
              (item) => item !== id,
            )
          : [...previous, id];

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(next),
      );

      return next;
    });
  }

  function acceptRules() {
    setAccepted(true);

    setCompleted((previous) => {
      const next =
        previous.includes("final")
          ? previous
          : [...previous, "final"];

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(next),
      );

      return next;
    });
  }

  const sections: Array<{
    id: SectionKey;
    label: string;
    icon: any;
  }> = [
    {
      id: "inicio",
      label: "Começar",
      icon: Home,
    },
    {
      id: "site",
      label: "Site",
      icon: Layers3,
    },
    {
      id: "discord",
      label: "Discord",
      icon: MessageSquareText,
    },
    {
      id: "regras",
      label: "Regras",
      icon: BookOpenCheck,
    },
    {
      id: "comandos",
      label: "Comandos",
      icon: Command,
    },
    {
      id: "nic",
      label: "NIC",
      icon: Search,
    },
    {
      id: "loja",
      label: "Loja/Spotify",
      icon: Music2,
    },
    {
      id: "faq",
      label: "FAQ",
      icon: HelpCircle,
    },
  ];

  return (
    <main className="portal-page integration-v10 space-y-6 pb-12">
      <section className="relative overflow-hidden rounded-[2.4rem] border border-white/10 bg-black/30 p-6 shadow-[0_32px_120px_rgba(0,0,0,.38)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(16,185,129,.18),transparent_34%),radial-gradient(circle_at_82%_18%,rgba(59,130,246,.12),transparent_30%)]" />

        <div className="relative grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[.08] px-4 py-2 text-[9px] font-black uppercase tracking-[.18em] text-primary">
              <ShieldCheck className="h-4 w-4" />
              Central de Integração V10
            </div>

            <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-tight text-white md:text-6xl">
              Tutorial completo do site, Discord e regras da Guarda.
            </h1>

            <p className="mt-5 max-w-3xl text-sm leading-7 text-white/48 md:text-base">
              Esta página é o guia oficial para novos elementos e também uma base de consulta para guardas, sargentos, oficiais, formadores, NIC e Comando.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setActiveSection("site")}
                className="rounded-2xl bg-primary px-5 py-3 text-[10px] font-black uppercase tracking-[.14em] text-primary-foreground"
              >
                Começar tutorial
              </button>

              <button
                type="button"
                onClick={acceptRules}
                className="rounded-2xl border border-white/10 bg-white/[.035] px-5 py-3 text-[10px] font-black uppercase tracking-[.14em] text-white/60 hover:text-white"
              >
                Aceito o regulamento
              </button>

              <Link
                href="/loja"
                className="rounded-2xl border border-primary/20 bg-primary/[.06] px-5 py-3 text-[10px] font-black uppercase tracking-[.14em] text-primary"
              >
                Abrir loja
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-black/24 p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[8px] font-black uppercase tracking-[.20em] text-white/32">
                  Progresso de integração
                </p>
                <p className="mt-1 text-4xl font-black text-white">
                  {percent}%
                </p>
              </div>

              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/[.08] text-primary">
                {accepted ? (
                  <Trophy className="h-8 w-8" />
                ) : (
                  <ClipboardCheck className="h-8 w-8" />
                )}
              </div>
            </div>

            <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/[.06]">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{
                  width: `${percent}%`,
                }}
              />
            </div>

            <div className="mt-5 space-y-2">
              {CHECKLIST.map((item) => {
                const done =
                  completedSet.has(item.id);

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      toggleChecklist(item.id)
                    }
                    className={`flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition ${
                      done
                        ? "border-primary/25 bg-primary/[.08]"
                        : "border-white/10 bg-white/[.025] hover:border-white/20"
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                        done
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-white/15 text-white/25"
                      }`}
                    >
                      {done ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : null}
                    </span>

                    <span className="min-w-0">
                      <span className="block text-xs font-black text-white/80">
                        {item.title}
                      </span>
                      <span className="mt-1 block text-[11px] leading-5 text-white/35">
                        {item.description}
                      </span>
                      {item.reward && (
                        <span className="mt-2 inline-flex rounded-full border border-yellow-300/15 bg-yellow-400/[.06] px-2.5 py-1 text-[8px] font-black uppercase tracking-[.12em] text-yellow-200/70">
                          {item.reward}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <nav className="sticky top-20 z-20 rounded-[1.6rem] border border-white/10 bg-black/45 p-2 backdrop-blur-2xl">
        <div className="flex gap-2 overflow-x-auto">
          {sections.map((section) => {
            const Icon =
              section.icon;
            const active =
              activeSection ===
              section.id;

            return (
              <button
                key={section.id}
                type="button"
                onClick={() =>
                  setActiveSection(section.id)
                }
                className={`flex shrink-0 items-center gap-2 rounded-2xl px-4 py-3 text-[9px] font-black uppercase tracking-[.14em] transition ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-white/36 hover:bg-white/[.04] hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                {section.label}
              </button>
            );
          })}
        </div>
      </nav>

      {activeSection === "inicio" && (
        <section className="grid gap-5 xl:grid-cols-[.85fr_1.15fr]">
          <InfoPanel
            title="Sou novo, por onde começo?"
            icon={MapPinned}
            items={[
              "Confirma conta e perfil.",
              "Lê o tutorial do site.",
              "Aprende /ponto e /cp.",
              "Lê regras de serviço e conduta.",
              "Percebe quando comunicar ao NIC.",
              "Aceita o regulamento e conclui a checklist.",
            ]}
          />

          <div className="grid gap-5 md:grid-cols-3">
            <QuickCard
              icon={Shield}
              title="Site"
              text="Central, perfil, ponto, CPs, escola, loja e NIC."
            />
            <QuickCard
              icon={MessageSquareText}
              title="Discord"
              text="Canais, comandos, tickets, comunicação e hierarquia."
            />
            <QuickCard
              icon={BookOpenCheck}
              title="Regras"
              text="Serviço, patrulhas, NIC, Discord e conduta."
            />
          </div>
        </section>
      )}

      {activeSection === "site" && (
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {SITE_MODULES.map((module) => {
            const Icon =
              module.icon;

            return (
              <article
                key={module.title}
                className="rounded-[1.8rem] border border-white/10 bg-white/[.025] p-5"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/[.08] text-primary">
                  <Icon className="h-6 w-6" />
                </div>

                <h3 className="mt-4 text-lg font-black text-white">
                  {module.title}
                </h3>

                <p className="mt-2 text-xs leading-6 text-white/42">
                  {module.description}
                </p>

                <p className="mt-4 text-[8px] font-black uppercase tracking-[.18em] text-primary">
                  Quem usa
                </p>
                <p className="mt-1 text-xs text-white/38">
                  {module.who}
                </p>

                <ul className="mt-4 space-y-2">
                  {module.rules.map((rule) => (
                    <li
                      key={rule}
                      className="flex gap-2 text-xs leading-5 text-white/40"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {rule}
                    </li>
                  ))}
                </ul>

                <Link
                  href={module.href}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.035] px-3 py-2 text-[9px] font-black uppercase tracking-[.12em] text-white/45 hover:text-white"
                >
                  Abrir módulo
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </article>
            );
          })}
        </section>
      )}

      {activeSection === "discord" && (
        <section className="grid gap-5 lg:grid-cols-2">
          {DISCORD_GUIDE.map((guide) => (
            <InfoPanel
              key={guide.title}
              title={guide.title}
              icon={guide.icon}
              items={guide.items}
            />
          ))}
        </section>
      )}

      {activeSection === "regras" && (
        <section className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {RULES.map((block) => (
            <InfoPanel
              key={block.title}
              title={block.title}
              icon={block.icon}
              items={block.rules}
              warning={
                block.title === "NIC" ||
                block.title === "Conduta"
              }
            />
          ))}
        </section>
      )}

      {activeSection === "comandos" && (
        <section className="grid gap-5 xl:grid-cols-3">
          {COMMANDS.map((group) => {
            const Icon =
              group.icon;

            return (
              <article
                key={group.group}
                className="rounded-[1.8rem] border border-white/10 bg-white/[.025] p-5"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/[.08] text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-black text-white">
                    {group.group}
                  </h3>
                </div>

                <div className="mt-5 space-y-3">
                  {group.commands.map(([command, text]) => (
                    <div
                      key={command}
                      className="rounded-2xl border border-white/10 bg-black/20 p-4"
                    >
                      <code className="rounded-lg border border-primary/20 bg-primary/[.08] px-2.5 py-1 text-xs font-black text-primary">
                        {command}
                      </code>
                      <p className="mt-3 text-xs leading-5 text-white/42">
                        {text}
                      </p>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </section>
      )}

      {activeSection === "nic" && (
        <section className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
          <article className="rounded-[1.8rem] border border-white/10 bg-white/[.025] p-5">
            <div className="flex items-center gap-3">
              <Search className="h-6 w-6 text-primary" />
              <h3 className="text-2xl font-black text-white">
                Quando comunicar ao NIC?
              </h3>
            </div>

            <p className="mt-3 text-sm leading-7 text-white/44">
              Sempre que for visto um crime e não existir detenção, o NIC deve receber comunicação para avaliar investigação, mandados, recolha de prova e seguimento.
            </p>

            <div className="mt-5 grid gap-3">
              {NIC_FLOW.map((step, index) => (
                <div
                  key={step}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-4"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-xs font-black text-primary-foreground">
                    {index + 1}
                  </span>
                  <span className="text-sm font-bold text-white/62">
                    {step}
                  </span>
                </div>
              ))}
            </div>
          </article>

          <InfoPanel
            title="O que anexar como prova"
            icon={FileText}
            items={[
              "Imagem ou vídeo da ocorrência.",
              "Link externo quando o ficheiro for pesado.",
              "Nome do suspeito quando conhecido.",
              "Hora aproximada e local.",
              "Descrição curta e objetiva.",
              "Elementos GNR envolvidos.",
            ]}
            warning
          />
        </section>
      )}

      {activeSection === "loja" && (
        <section className="grid gap-5 xl:grid-cols-3">
          <InfoPanel
            title="Loja e temas"
            icon={Sparkles}
            items={[
              "Usa preview antes de equipar tema.",
              "Temas alteram fundo, sidebar, topbar, cards, player e botões.",
              "Packs completos juntam tema, fundo, moldura, emblema e efeito.",
              "Itens da loja são estéticos e sociais.",
            ]}
          />

          <InfoPanel
            title="Spotify no player"
            icon={Music2}
            items={[
              "O player passa a aceitar Spotify por embed.",
              "Playlists oficiais podem ficar na biblioteca.",
              "Cada guarda pode ouvir pelo player incorporado.",
              "Conectar Spotify com login real pode ser a próxima fase.",
            ]}
          />

          <article className="rounded-[1.8rem] border border-white/10 bg-white/[.025] p-5">
            <p className="text-[8px] font-black uppercase tracking-[.20em] text-primary">
              Playlists sugeridas
            </p>
            <div className="mt-4 space-y-3">
              {[
                "Patrulha Noturna",
                "Sala de Comando",
                "Operação NIC",
                "Treino GIOE",
                "Cerimónia da Guarda",
                "Modo Relax",
              ].map((playlist) => (
                <div
                  key={playlist}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-3"
                >
                  <Music2 className="h-4 w-4 text-primary" />
                  <span className="text-sm font-bold text-white/60">
                    {playlist}
                  </span>
                </div>
              ))}
            </div>
          </article>
        </section>
      )}

      {activeSection === "faq" && (
        <section className="grid gap-5 xl:grid-cols-[1fr_.8fr]">
          <div className="space-y-4">
            {FAQ.map(([question, answer]) => (
              <article
                key={question}
                className="rounded-[1.5rem] border border-white/10 bg-white/[.025] p-5"
              >
                <h3 className="text-lg font-black text-white">
                  {question}
                </h3>
                <p className="mt-2 text-sm leading-7 text-white/44">
                  {answer}
                </p>
              </article>
            ))}
          </div>

          <article className="rounded-[1.8rem] border border-white/10 bg-white/[.025] p-5">
            <p className="text-[8px] font-black uppercase tracking-[.20em] text-primary">
              Glossário rápido
            </p>

            <div className="mt-4 space-y-3">
              {GLOSSARY.map(([term, desc]) => (
                <div
                  key={term}
                  className="rounded-2xl border border-white/10 bg-black/20 p-4"
                >
                  <p className="text-sm font-black text-white">
                    {term}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-white/42">
                    {desc}
                  </p>
                </div>
              ))}
            </div>
          </article>
        </section>
      )}
    </main>
  );
}

function QuickCard({
  icon: Icon,
  title,
  text,
}: {
  icon: any;
  title: string;
  text: string;
}) {
  return (
    <article className="rounded-[1.8rem] border border-white/10 bg-white/[.025] p-5">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/[.08] text-primary">
        <Icon className="h-6 w-6" />
      </div>

      <h3 className="mt-4 text-lg font-black text-white">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-white/42">
        {text}
      </p>
    </article>
  );
}

function InfoPanel({
  title,
  icon: Icon,
  items,
  warning,
}: {
  title: string;
  icon: any;
  items: string[];
  warning?: boolean;
}) {
  return (
    <article
      className={`rounded-[1.8rem] border p-5 ${
        warning
          ? "border-amber-300/15 bg-amber-400/[.045]"
          : "border-white/10 bg-white/[.025]"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${
            warning
              ? "border-amber-300/20 bg-amber-300/[.08] text-amber-200"
              : "border-primary/20 bg-primary/[.08] text-primary"
          }`}
        >
          <Icon className="h-6 w-6" />
        </div>

        <h3 className="text-xl font-black text-white">
          {title}
        </h3>
      </div>

      <ul className="mt-5 space-y-3">
        {items.map((item) => (
          <li
            key={item}
            className="flex gap-3 text-sm leading-6 text-white/46"
          >
            {warning ? (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-200/70" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            )}
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
