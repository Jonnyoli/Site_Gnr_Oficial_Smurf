import { useMemo, useState } from "react";
import {
  Shield,
  Book,
  Scale,
  AlertTriangle,
  Search,
  Gavel,
  FileText,
  BadgeCheck,
  ScrollText,
  Loader2,
  Database,
  Copy,
  CheckCircle2,
  Filter,
  ChevronLeft,
  ChevronRight,
  ListChecks,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import tabelaDisciplinar from "../data/tabelaDisciplinar.json";

type GravidadeInterna = "Leve" | "Grave" | "Crítica";
type FiltroInterno = "todos" | GravidadeInterna;
type Separador = "regras" | "tabela";

type ArtigoInterno = {
  id: string;
  titulo: string;
  descricao: string;
  gravidade: GravidadeInterna;
  categoria: string;
  baseLegal: string;
};

type RegraDisciplinar = {
  id?: string;
  section?: string;
  article?: string;
  title?: string;
  category?: string;
  keywords?: string;
  severity?: string;
  sanction?: string;
  days?: string;
  directDismissal?: string;
  botText?: string;
};

const PAGE_SIZE = 12;

const regrasInternas: ArtigoInterno[] = [
  {
    id: "Sec. A · Art. 1º",
    titulo: "A Guarda",
    descricao:
      "A Guarda Nacional Republicana foi restabelecida após o fim das operações do Departamento do Xerife, reassumindo as suas atribuições institucionais na cidade.",
    gravidade: "Leve",
    categoria: "Lei Estrutural",
    baseLegal: "Leis Orgânicas GNR · 25/01/2026",
  },
  {
    id: "Sec. A · Art. 2º",
    titulo: "Funções",
    descricao:
      "As competências da GNR resumem-se à prevenção e combate à criminalidade, defesa dos interesses da cidade, manutenção da segurança dos cidadãos e promoção do contacto de proximidade.",
    gravidade: "Leve",
    categoria: "Lei Estrutural",
    baseLegal: "Leis Orgânicas GNR · 25/01/2026",
  },
  {
    id: "Sec. A · Art. 3º",
    titulo: "Comandante-Geral",
    descricao:
      "O Tenente-General Comandante-Geral é o mais elevado posto hierárquico da GNR, sendo a denominação atribuída ao oficial-general que comanda toda a Guarda.",
    gravidade: "Leve",
    categoria: "Hierarquia",
    baseLegal: "Leis Orgânicas GNR · 25/01/2026",
  },
  {
    id: "Sec. A · Art. 4º",
    titulo: "Hierarquia",
    descricao:
      "A hierarquia da GNR é um elemento determinante da estrutura institucional e deve ser respeitada por todos os elementos.",
    gravidade: "Grave",
    categoria: "Hierarquia",
    baseLegal: "Leis Orgânicas GNR · 25/01/2026",
  },
  {
    id: "Sec. A · Art. 5º",
    titulo: "Estrutura",
    descricao:
      "A estrutura da Guarda é assegurada pelas suas ramificações e organograma institucional.",
    gravidade: "Leve",
    categoria: "Organização",
    baseLegal: "Leis Orgânicas GNR · 25/01/2026",
  },
  {
    id: "Sec. A · Art. 6º",
    titulo: "Unidades Operacionais",
    descricao:
      "A GNR integra unidades como GIOE, DI, GSA, UNT e NIC, podendo algumas unidades operacionais ou administrativas estar desativadas por decisão do Comando-Geral.",
    gravidade: "Leve",
    categoria: "Unidades",
    baseLegal: "Leis Orgânicas GNR · 25/01/2026",
  },
  {
    id: "Sec. A · Art. 7º",
    titulo: "Ativações de Unidades Operacionais",
    descricao:
      "As unidades operacionais só podem ser ativadas quando estejam reunidas as condições exigidas e exista autorização ou presença dos comandos competentes, respeitando mínimos operacionais por unidade.",
    gravidade: "Grave",
    categoria: "Unidades",
    baseLegal: "Leis Orgânicas GNR · 25/01/2026",
  },
  {
    id: "Sec. A · Art. 8º",
    titulo: "Escola da Guarda",
    descricao:
      "A Escola da Guarda é responsável pela formação contínua, administração dos guardas provisórios, recrutamentos, CFG, CFO, CFS e formações técnicas, operacionais ou comportamentais.",
    gravidade: "Leve",
    categoria: "Escola da Guarda",
    baseLegal: "Leis Orgânicas GNR · 25/01/2026",
  },

  {
    id: "Sec. B · Art. 1º",
    titulo: "Indumentária",
    descricao:
      "Sempre que um guarda se encontra de serviço, deve estar fardado com a farda atribuída ao seu posto ou unidade operacional. Fora de serviço, é proibido usar indumentária da Guarda.",
    gravidade: "Grave",
    categoria: "Código de Vestuário",
    baseLegal: "Leis Orgânicas GNR · 25/01/2026",
  },
  {
    id: "Sec. B · Art. 2º",
    titulo: "Modificações à Farda",
    descricao:
      "Apenas são autorizados óculos apropriados, relógios e luvas pretas. É proibido alterar peças da farda, divisas, coletes ou acessórios não autorizados. Máscaras ou acessórios que impeçam identificação são proibidos, exceto em unidades.",
    gravidade: "Grave",
    categoria: "Código de Vestuário",
    baseLegal: "Leis Orgânicas GNR · 25/01/2026",
  },
  {
    id: "Sec. B · Art. 3º",
    titulo: "Uso de Boina",
    descricao:
      "Todos os guardas, exceto provisórios e sub-unidades, devem usar boina durante o serviço. Quem não esteja com boina deve apenas pôr-se em sentido e não bater continência.",
    gravidade: "Leve",
    categoria: "Código de Vestuário",
    baseLegal: "Leis Orgânicas GNR · 25/01/2026",
  },

  {
    id: "Sec. C · Art. 1º",
    titulo: "Patrulhas",
    descricao:
      "As patrulhas são iniciadas em CP com dois ou três guardas, incluindo obrigatoriamente um Guarda ou superior. Guardas Provisórios não podem patrulhar entre si e subordinados não podem patrulhar sozinhos, salvo oficiais-generais em situações excecionais.",
    gravidade: "Grave",
    categoria: "Patrulhas",
    baseLegal: "Leis Orgânicas GNR · 25/01/2026",
  },
  {
    id: "Sec. C · Art. 2º",
    titulo: "Direitos do Detento",
    descricao:
      "Em caso de detenção devem ser lidos os Direitos de Miranda quando aplicável. Guardas detidos ou interrogados são submetidos aos Direitos de Garrity/Lybarger. É proibido negar transporte prisional.",
    gravidade: "Grave",
    categoria: "Procedimento Policial",
    baseLegal: "Leis Orgânicas GNR · 25/01/2026",
  },
  {
    id: "Sec. C · Art. 3º",
    titulo: "Rádio",
    descricao:
      "Todos os guardas de serviço devem permanecer na rádio destacada à operação ou ordem vigente, normalmente 6MHz. Quem permanecer na rádio conta como efetivo em serviço e responde por infrações decorrentes de falta de apoio.",
    gravidade: "Grave",
    categoria: "Comunicações",
    baseLegal: "Leis Orgânicas GNR · 25/01/2026",
  },
  {
    id: "Sec. C · Art. 4º",
    titulo: "Armas de Fogo",
    descricao:
      "É proibido usar arma de fogo contra alguém que não a tenha utilizado, incluindo disparos contra veículos, salvo permissão superior no local. A arma de fogo só deve ser usada perante ameaça iminente à vida.",
    gravidade: "Crítica",
    categoria: "Uso da Força",
    baseLegal: "Leis Orgânicas GNR · 25/01/2026",
  },
  {
    id: "Sec. C · Art. 5º",
    titulo: "Corrupção",
    descricao:
      "É proibido qualquer ato de corrupção, sob pena de aplicação do Art. 41.º do Código Penal.",
    gravidade: "Crítica",
    categoria: "Ética",
    baseLegal: "Leis Orgânicas GNR · 25/01/2026",
  },
  {
    id: "Sec. C · Art. 6º",
    titulo: "Manobras PIT",
    descricao:
      "A manobra PIT só pode ser efetuada após dois minutos de fuga em zona verde e deve ser autorizada via rádio por Furriel ou superior. Disparos contra veículos só após três minutos e respeitando a proporcionalidade.",
    gravidade: "Grave",
    categoria: "Perseguições",
    baseLegal: "Leis Orgânicas GNR · 25/01/2026",
  },
  {
    id: "Sec. C · Art. 7º",
    titulo: "Invasões de Base",
    descricao:
      "É proibida a entrada em bases de organizações sem consultar um Oficial de serviço. A operação deve ser presidida por um Oficial e apenas ocorre com autorização.",
    gravidade: "Crítica",
    categoria: "Operações",
    baseLegal: "Leis Orgânicas GNR · 25/01/2026",
  },
  {
    id: "Sec. C · Art. 8º",
    titulo: "Situação de Reféns",
    descricao:
      "Perante reféns, as forças de segurança devem preservar a integridade física e psicológica destes. A desvalorização da vida de reféns constitui corrupção.",
    gravidade: "Crítica",
    categoria: "Reféns",
    baseLegal: "Leis Orgânicas GNR · 25/01/2026",
  },
  {
    id: "Sec. C · Art. 9º",
    titulo: "Imagem e Prestígio da GNR",
    descricao:
      "É proibida qualquer repreensão, insulto ou correção pública perante civis. Qualquer ato que aparente falta de profissionalismo e denigra a imagem da GNR é punível.",
    gravidade: "Grave",
    categoria: "Imagem Institucional",
    baseLegal: "Leis Orgânicas GNR · 25/01/2026",
  },
  {
    id: "Sec. C · Art. 10º",
    titulo: "Rusgas",
    descricao:
      "As rusgas são organizadas, planeadas e executadas pelo GIOE, podendo contar com outras unidades. São presididas pelo Comandante do GIOE ou, na sua ausência, pelo 2º Comandante.",
    gravidade: "Grave",
    categoria: "Operações",
    baseLegal: "Leis Orgânicas GNR · 25/01/2026",
  },
  {
    id: "Sec. C · Art. 11º",
    titulo: "Ordem de Desfardamento",
    descricao:
      "Apenas Aspirantes a Oficial ou superiores podem ordenar o desfardamento ou cessação imediata de serviço. É proibido ordenar desfardamento fora de serviço.",
    gravidade: "Grave",
    categoria: "Hierarquia",
    baseLegal: "Leis Orgânicas GNR · 25/01/2026",
  },
  {
    id: "Sec. C · Art. 12º",
    titulo: "Invasão de Estabelecimento com Reféns",
    descricao:
      "Não é permitido invadir estabelecimento sob tomada de reféns sem autorização expressa de Capitão ou superior.",
    gravidade: "Crítica",
    categoria: "Reféns",
    baseLegal: "Leis Orgânicas GNR · 25/01/2026",
  },
  {
    id: "Sec. C · Art. 13º",
    titulo: "Transporte e Permanência de Civis em CPs",
    descricao:
      "Um CP não pode deslocar-se a ocorrências nem estar operacional se transportar civil ou funcionário do Estado não pertencente à força, exceto PSP equipado ou casos necessários como feridos, vítimas, resgates, detenções ou escoltas.",
    gravidade: "Grave",
    categoria: "Patrulhas",
    baseLegal: "Leis Orgânicas GNR · 25/01/2026",
  },
  {
    id: "Sec. C · Art. 14º",
    titulo: "Harmonia Interna",
    descricao:
      "Todos os colaboradores devem promover respeito, civismo e bem-estar interno. Conflitos devem ser resolvidos entre envolvidos e apenas em último caso mediados pelo Comando-Geral.",
    gravidade: "Leve",
    categoria: "Disciplina Interna",
    baseLegal: "Leis Orgânicas GNR · 25/01/2026",
  },
  {
    id: "Sec. C · Art. 16º",
    titulo: "Consumo de Itens Ilegais",
    descricao:
      "É proibido o consumo ou utilização de qualquer item ou substância ilegal dentro ou fora de serviço.",
    gravidade: "Crítica",
    categoria: "Conduta",
    baseLegal: "Leis Orgânicas GNR · 25/01/2026",
  },
  {
    id: "Sec. C · Art. 17º",
    titulo: "Revista a Veículos",
    descricao:
      "É proibido revistar veículos sem motivo ou causa válida, como local perigoso, detenção do proprietário ou outra fundamentação operacional.",
    gravidade: "Grave",
    categoria: "Procedimento Policial",
    baseLegal: "Leis Orgânicas GNR · 25/01/2026",
  },
  {
    id: "Sec. C · Art. 18º",
    titulo: "Quantidade de Patrulhas numa Perseguição",
    descricao:
      "É proibido exceder quatro CPs no mesmo 10-80, exceto por ordem específica do superior em serviço ou perante veículo com ocupantes potencialmente armados.",
    gravidade: "Grave",
    categoria: "Perseguições",
    baseLegal: "Leis Orgânicas GNR · 25/01/2026",
  },
  {
    id: "Sec. C · Art. 19º",
    titulo: "CPs Descaracterizados",
    descricao:
      "É proibida a ativação de CP descaracterizado sem autorização presencial de oficial-general. Apenas dois guardas podem integrar o CP e ambos devem estar com farda descaracterizada identificável. O artigo não se aplica ao NIC.",
    gravidade: "Grave",
    categoria: "Patrulhas",
    baseLegal: "Leis Orgânicas GNR · 25/01/2026",
  },
  {
    id: "Sec. C · Art. 20º",
    titulo: "Tatuagens e Cabelos",
    descricao:
      "São proibidas tatuagens na cabeça ou mãos, salvo uso permanente de luvas em serviço. São proibidos símbolos extremistas, partidários, racistas ou violentos. Cores de cabelo não naturais são proibidas em serviço.",
    gravidade: "Leve",
    categoria: "Imagem e Apresentação",
    baseLegal: "Leis Orgânicas GNR · 25/01/2026",
  },
  {
    id: "Sec. C · Art. 21º",
    titulo: "Ausências",
    descricao:
      "Não são autorizadas ausências iguais ou superiores a 30 dias. Ausências não podem ser prolongadas sem forte justificação e só podem ser abertas após sete dias da última ausência. A ausência deve ter pelo menos cinco dias.",
    gravidade: "Leve",
    categoria: "Recursos Humanos",
    baseLegal: "Leis Orgânicas GNR · 25/01/2026",
  },
  {
    id: "Sec. C · Art. 22º",
    titulo: "Estatuto de Reserva",
    descricao:
      "O estatuto de Reserva aplica-se a colaboradores de posto igual ou superior a Guarda com ausência superior a 30 dias aceite, limitado a 60 dias. O incumprimento pode resultar em despedimento.",
    gravidade: "Grave",
    categoria: "Recursos Humanos",
    baseLegal: "Leis Orgânicas GNR · 25/01/2026",
  },
  {
    id: "Sec. C · Art. 23º",
    titulo: "Veículos",
    descricao:
      "É proibido retirar ou utilizar veículos não atribuídos à patente, salvo autorização excecional de oficiais-generais. A infração é considerada grave e pode originar repreensão escrita.",
    gravidade: "Grave",
    categoria: "Veículos",
    baseLegal: "Leis Orgânicas GNR · 25/01/2026",
  },
  {
    id: "Sec. C · Art. 24º",
    titulo: "Procedimentos em Assaltos de Alto Risco",
    descricao:
      "Em assaltos a iate com fogo cruzado ou assaltos a Artes com barricada e PvP constante, torna-se obrigatória a retirada das unidades, salvo autorização expressa do Comando-Geral. O incumprimento é grave.",
    gravidade: "Crítica",
    categoria: "Assaltos de Alto Risco",
    baseLegal: "Leis Orgânicas GNR · 25/01/2026",
  },

  {
    id: "Sec. D · Regra 1",
    titulo: "Shotgun de Borracha em Fights",
    descricao:
      "É proibido utilizar shotgun de borracha em fights. A fight começa após o primeiro disparo efetuado pelo inimigo.",
    gravidade: "Grave",
    categoria: "Regulamento Geral",
    baseLegal: "Regras da Cidade · PSP e GNR",
  },
  {
    id: "Sec. D · Regra 2",
    titulo: "Multas Repetidas",
    descricao:
      "É proibido passar a mesma multa mais do que uma vez.",
    gravidade: "Leve",
    categoria: "Regulamento Geral",
    baseLegal: "Regras da Cidade · PSP e GNR",
  },
  {
    id: "Sec. D · Regra 3",
    titulo: "Revista em Garagem",
    descricao:
      "É proibido revistar veículos dentro de uma garagem, exceto se o RP com esse veículo tiver começado fora.",
    gravidade: "Grave",
    categoria: "Regulamento Geral",
    baseLegal: "Regras da Cidade · PSP e GNR",
  },
  {
    id: "Sec. D · Regra 4",
    titulo: "Custódia sem Interação",
    descricao:
      "É proibido manter um indivíduo sob custódia para investigação ou detenção por mais de 10 minutos sem interação.",
    gravidade: "Grave",
    categoria: "Regulamento Geral",
    baseLegal: "Regras da Cidade · PSP e GNR",
  },
  {
    id: "Sec. D · Regra 5",
    titulo: "Intervenção em Redzones",
    descricao:
      "É proibido intervir em redzones sem ser GIOE, salvo quando os suspeitos fogem para dentro das mesmas.",
    gravidade: "Crítica",
    categoria: "Regulamento Geral",
    baseLegal: "Regras da Cidade · PSP e GNR",
  },
  {
    id: "Sec. D · Regra 6",
    titulo: "Apreensão de Comida ou Bebida",
    descricao:
      "É proibido apreender comida ou bebida. Café também é considerado bebida.",
    gravidade: "Leve",
    categoria: "Regulamento Geral",
    baseLegal: "Regras da Cidade · PSP e GNR",
  },
  {
    id: "Sec. D · Regra 7",
    titulo: "Capacetes Blindados",
    descricao:
      "É proibido usar capacetes blindados fora das unidades de intervenção GIOE ou DI.",
    gravidade: "Grave",
    categoria: "Regulamento Geral",
    baseLegal: "Regras da Cidade · PSP e GNR",
  },
  {
    id: "Sec. D · Regra 8",
    titulo: "Territórios",
    descricao:
      "É proibido ir a territórios para confrontar outra organização. Só é permitido se não estiver lá nenhuma organização ou se não estiver em cooldown.",
    gravidade: "Grave",
    categoria: "Regulamento Geral",
    baseLegal: "Regras da Cidade · PSP e GNR",
  },
  {
    id: "Sec. D · Regra 9",
    titulo: "Limite de Blindados",
    descricao:
      "É proibido possuir mais do que dois blindados em qualquer RP, considerando ambas as polícias em conjunto.",
    gravidade: "Grave",
    categoria: "Regulamento Geral",
    baseLegal: "Regras da Cidade · PSP e GNR",
  },
  {
    id: "Sec. D · Regra 10",
    titulo: "Abordagem a Organização Identificada",
    descricao:
      "É proibido abordar uma organização devidamente identificada, salvo se estiver a cometer uma infração no mínimo grave e existirem pelo menos cinco guardas presentes.",
    gravidade: "Crítica",
    categoria: "Regulamento Geral",
    baseLegal: "Regras da Cidade · PSP e GNR",
  },
  {
    id: "Sec. D · Regra 11",
    titulo: "Perseguir Organização Identificada",
    descricao:
      "É proibido seguir uma organização identificada à espera que cometa uma infração.",
    gravidade: "Grave",
    categoria: "Regulamento Geral",
    baseLegal: "Regras da Cidade · PSP e GNR",
  },
];

const FILTROS_INTERNOS: { value: FiltroInterno; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "Leve", label: "Leves" },
  { value: "Grave", label: "Graves" },
  { value: "Crítica", label: "Críticas" },
];

function normalizeText(value: any) {
  return String(value || "").toLowerCase().trim();
}

function safeText(value: any, fallback = "N/A") {
  const text = String(value || "").trim();
  return text || fallback;
}

function getSeverityStyle(severity?: string) {
  const value = normalizeText(severity);

  if (
    value.includes("crítica") ||
    value.includes("critica") ||
    value.includes("critical") ||
    value.includes("muito grave")
  ) {
    return {
      label: "Crítica",
      badge: "border-red-500/25 bg-red-500/10 text-red-400",
      stripe: "bg-red-500",
      icon: <Shield className="h-4 w-4" />,
      glow: "hover:shadow-[0_0_35px_rgba(239,68,68,0.18)]",
      tone: "red" as const,
    };
  }

  if (value.includes("grave") || value.includes("alta") || value.includes("high")) {
    return {
      label: "Grave",
      badge: "border-amber-500/25 bg-amber-500/10 text-amber-400",
      stripe: "bg-amber-500",
      icon: <AlertTriangle className="h-4 w-4" />,
      glow: "hover:shadow-[0_0_35px_rgba(245,158,11,0.16)]",
      tone: "yellow" as const,
    };
  }

  if (value.includes("média") || value.includes("media") || value.includes("moderada")) {
    return {
      label: "Média",
      badge: "border-blue-500/25 bg-blue-500/10 text-blue-400",
      stripe: "bg-blue-500",
      icon: <Scale className="h-4 w-4" />,
      glow: "hover:shadow-[0_0_35px_rgba(59,130,246,0.16)]",
      tone: "blue" as const,
    };
  }

  return {
    label: severity || "Leve",
    badge: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400",
    stripe: "bg-emerald-500",
    icon: <BadgeCheck className="h-4 w-4" />,
    glow: "hover:shadow-[0_0_35px_rgba(16,185,129,0.16)]",
    tone: "green" as const,
  };
}

function getInternalStyle(gravidade: GravidadeInterna) {
  return getSeverityStyle(gravidade);
}

function getUniqueCategories(rows: RegraDisciplinar[]) {
  const categories = rows
    .map((row) => safeText(row.category || row.section, "Sem categoria"))
    .filter(Boolean);

  return ["Todas", ...Array.from(new Set(categories)).sort()];
}

function getUniqueSeverities(rows: RegraDisciplinar[]) {
  const severities = rows
    .map((row) => safeText(row.severity, "N/A"))
    .filter(Boolean);

  return ["Todas", ...Array.from(new Set(severities)).sort()];
}

function createBotText(regra: RegraDisciplinar) {
  return (
    regra.botText ||
    `${safeText(regra.article, "Sem artigo")} — ${safeText(regra.title, "Infração disciplinar")}\n` +
      `Categoria: ${safeText(regra.category || regra.section)}\n` +
      `Gravidade: ${safeText(regra.severity)}\n` +
      `Sanção: ${safeText(regra.sanction)}\n` +
      `Dias: ${safeText(regra.days)}\n` +
      `Despedimento direto: ${safeText(regra.directDismissal)}`
  );
}

export default function Legislacao() {
  const { toast } = useToast();

  const [separador, setSeparador] = useState<Separador>("regras");

  const [searchInterno, setSearchInterno] = useState("");
  const [gravidadeInterna, setGravidadeInterna] = useState<FiltroInterno>("todos");

  const [searchTabela, setSearchTabela] = useState("");
  const [categoriaTabela, setCategoriaTabela] = useState("Todas");
  const [gravidadeTabela, setGravidadeTabela] = useState("Todas");
  const [page, setPage] = useState(1);

  const tabela = tabelaDisciplinar as RegraDisciplinar[];

  const categoriasTabela = useMemo(() => getUniqueCategories(tabela), [tabela]);
  const gravidadesTabela = useMemo(() => getUniqueSeverities(tabela), [tabela]);

  const filteredRegrasInternas = useMemo(() => {
    const normalizedSearch = normalizeText(searchInterno);

    return regrasInternas.filter((artigo) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        normalizeText(artigo.id).includes(normalizedSearch) ||
        normalizeText(artigo.titulo).includes(normalizedSearch) ||
        normalizeText(artigo.descricao).includes(normalizedSearch) ||
        normalizeText(artigo.categoria).includes(normalizedSearch);

      const matchesGravidade =
        gravidadeInterna === "todos" || artigo.gravidade === gravidadeInterna;

      return matchesSearch && matchesGravidade;
    });
  }, [searchInterno, gravidadeInterna]);

  const filteredTabela = useMemo(() => {
    const normalizedSearch = normalizeText(searchTabela);

    const result = tabela.filter((regra) => {
      const category = safeText(regra.category || regra.section, "Sem categoria");
      const severity = safeText(regra.severity, "N/A");

      const matchesSearch =
        normalizedSearch.length === 0 ||
        normalizeText(regra.id).includes(normalizedSearch) ||
        normalizeText(regra.section).includes(normalizedSearch) ||
        normalizeText(regra.article).includes(normalizedSearch) ||
        normalizeText(regra.title).includes(normalizedSearch) ||
        normalizeText(regra.category).includes(normalizedSearch) ||
        normalizeText(regra.keywords).includes(normalizedSearch) ||
        normalizeText(regra.sanction).includes(normalizedSearch) ||
        normalizeText(regra.botText).includes(normalizedSearch);

      const matchesCategory =
        categoriaTabela === "Todas" || category === categoriaTabela;

      const matchesSeverity =
        gravidadeTabela === "Todas" || severity === gravidadeTabela;

      return matchesSearch && matchesCategory && matchesSeverity;
    });

    return result;
  }, [tabela, searchTabela, categoriaTabela, gravidadeTabela]);

  const totalPages = Math.max(1, Math.ceil(filteredTabela.length / PAGE_SIZE));

  const paginatedTabela = useMemo(() => {
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredTabela.slice(start, start + PAGE_SIZE);
  }, [filteredTabela, page, totalPages]);

  const metrics = useMemo(() => {
    return {
      regrasInternas: regrasInternas.length,
      tabelaTotal: tabela.length,
      tabelaFiltrada: filteredTabela.length,
      criticas: tabela.filter((row) => getSeverityStyle(row.severity).tone === "red").length,
      graves: tabela.filter((row) => getSeverityStyle(row.severity).tone === "yellow").length,
    };
  }, [tabela, filteredTabela]);

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);

      toast({
        title: "Texto copiado",
        description: "O texto foi copiado para a área de transferência.",
      });
    } catch {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o texto.",
        variant: "destructive",
      });
    }
  };

  const resetTabelaPage = () => {
    setPage(1);
  };

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
            <div className="mb-5 inline-flex items-center gap-3 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.25em] text-primary">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
              </span>
              Consulta Jurídico-Disciplinar
            </div>

            <h1 className="flex flex-wrap items-center gap-4 text-4xl font-black tracking-tight text-white md:text-5xl">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-[0_0_40px_rgba(16,185,129,0.16)]">
                <Book className="h-8 w-8" />
              </span>
              Legislação e Disciplina
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">
              Consulta rápida das regras internas e da tabela disciplinar completa,
              com pesquisa, filtros, paginação e texto pronto para utilização em bot.
            </p>
          </div>

          <div className="grid w-full grid-cols-2 gap-3 xl:w-[420px]">
            <MiniMetric
              label="Regras Internas"
              value={metrics.regrasInternas}
              icon={<ListChecks className="h-4 w-4" />}
              tone="primary"
            />
            <MiniMetric
              label="Tabela"
              value={metrics.tabelaTotal}
              icon={<Database className="h-4 w-4" />}
              tone="blue"
            />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-4">
        <MetricCard
          title="Regras Internas"
          value={metrics.regrasInternas}
          subtitle="Normas principais"
          icon={<ScrollText className="h-5 w-5" />}
          tone="green"
          delay={0.05}
        />

        <MetricCard
          title="Tabela Disciplinar"
          value={metrics.tabelaTotal}
          subtitle="Registos importados"
          icon={<Database className="h-5 w-5" />}
          tone="blue"
          delay={0.1}
        />

        <MetricCard
          title="Graves"
          value={metrics.graves}
          subtitle="Sanções relevantes"
          icon={<AlertTriangle className="h-5 w-5" />}
          tone="yellow"
          delay={0.15}
        />

        <MetricCard
          title="Críticas"
          value={metrics.criticas}
          subtitle="Risco máximo"
          icon={<Shield className="h-5 w-5" />}
          tone="red"
          delay={0.2}
        />
      </section>

      <section className="glass rounded-3xl border border-white/10 p-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSeparador("regras")}
            className={`rounded-full px-5 py-2.5 text-xs font-black uppercase tracking-[0.14em] transition-all ${
              separador === "regras"
                ? "bg-primary text-primary-foreground shadow-[0_0_18px_rgba(16,185,129,0.22)]"
                : "border border-white/10 bg-white/[0.035] text-muted-foreground hover:border-white/20 hover:text-white"
            }`}
          >
            Regras Internas
          </button>

          <button
            onClick={() => setSeparador("tabela")}
            className={`rounded-full px-5 py-2.5 text-xs font-black uppercase tracking-[0.14em] transition-all ${
              separador === "tabela"
                ? "bg-primary text-primary-foreground shadow-[0_0_18px_rgba(16,185,129,0.22)]"
                : "border border-white/10 bg-white/[0.035] text-muted-foreground hover:border-white/20 hover:text-white"
            }`}
          >
            Tabela Disciplinar
          </button>
        </div>
      </section>

      {separador === "regras" ? (
        <>
          <section className="glass rounded-3xl border border-white/10 p-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="relative w-full xl:max-w-md">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchInterno}
                  onChange={(e) => setSearchInterno(e.target.value)}
                  placeholder="Pesquisar por artigo, título, categoria ou descrição..."
                  className="h-11 rounded-2xl border-white/10 bg-background/60 pl-11 text-sm"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {FILTROS_INTERNOS.map((filtro) => (
                  <button
                    key={filtro.value}
                    onClick={() => setGravidadeInterna(filtro.value)}
                    className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.14em] transition-all ${
                      gravidadeInterna === filtro.value
                        ? "bg-primary text-primary-foreground shadow-[0_0_18px_rgba(16,185,129,0.22)]"
                        : "border border-white/10 bg-white/[0.035] text-muted-foreground hover:border-white/20 hover:text-white"
                    }`}
                  >
                    {filtro.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {filteredRegrasInternas.length > 0 ? (
            <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {filteredRegrasInternas.map((artigo, index) => {
                const style = getInternalStyle(artigo.gravidade);

                return (
                  <motion.div
                    key={artigo.id}
                    initial={{ opacity: 0, y: 16, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card
                      className={`glass group relative h-full overflow-hidden rounded-3xl border border-white/10 transition-all duration-300 hover:-translate-y-1.5 ${style.glow}`}
                    >
                      <div className={`absolute inset-x-0 top-0 h-1 ${style.stripe}`} />
                      <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/5 blur-[80px]" />

                      <CardHeader className="relative border-b border-white/10 bg-white/[0.02]">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-primary">
                              <Scale className="h-4 w-4" />
                              {artigo.id}
                            </div>

                            <CardTitle className="text-2xl font-black tracking-tight text-white transition-colors group-hover:text-primary">
                              {artigo.titulo}
                            </CardTitle>

                            <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                              {artigo.categoria}
                            </p>
                          </div>

                          <span
                            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.13em] ${style.badge}`}
                          >
                            {style.icon}
                            {artigo.gravidade}
                          </span>
                        </div>
                      </CardHeader>

                      <CardContent className="relative space-y-5 p-6">
                        <blockquote className="border-l-2 border-primary/40 pl-4 text-sm leading-7 text-slate-300">
                          “{artigo.descricao}”
                        </blockquote>

                        <div className="flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
                          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                            <Gavel className="h-3.5 w-3.5 text-primary" />
                            Base Legal: {artigo.baseLegal}
                          </div>

                          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                            <FileText className="h-3.5 w-3.5 text-primary" />
                            Consulta Rápida
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </section>
          ) : (
            <EmptyState text="Nenhuma regra interna encontrada." />
          )}
        </>
      ) : (
        <>
          <section className="glass rounded-3xl border border-white/10 p-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="relative w-full xl:max-w-md">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchTabela}
                  onChange={(e) => {
                    setSearchTabela(e.target.value);
                    resetTabelaPage();
                  }}
                  placeholder="Pesquisar na tabela disciplinar..."
                  className="h-11 rounded-2xl border-white/10 bg-background/60 pl-11 text-sm"
                />
              </div>

              <div className="flex flex-col gap-3 xl:flex-row">
                <select
                  value={categoriaTabela}
                  onChange={(e) => {
                    setCategoriaTabela(e.target.value);
                    resetTabelaPage();
                  }}
                  className="h-11 rounded-2xl border border-white/10 bg-background/80 px-4 text-xs font-bold uppercase tracking-[0.12em] text-white outline-none"
                >
                  {categoriasTabela.map((categoria) => (
                    <option key={categoria} value={categoria}>
                      {categoria}
                    </option>
                  ))}
                </select>

                <select
                  value={gravidadeTabela}
                  onChange={(e) => {
                    setGravidadeTabela(e.target.value);
                    resetTabelaPage();
                  }}
                  className="h-11 rounded-2xl border border-white/10 bg-background/80 px-4 text-xs font-bold uppercase tracking-[0.12em] text-white outline-none"
                >
                  {gravidadesTabela.map((gravidade) => (
                    <option key={gravidade} value={gravidade}>
                      {gravidade}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                <Filter className="h-4 w-4 text-primary" />
                {filteredTabela.length} resultados encontrados
              </div>

              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                Página <span className="text-primary">{page}</span> de{" "}
                <span className="text-primary">{totalPages}</span>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-5">
            {paginatedTabela.length > 0 ? (
              paginatedTabela.map((regra, index) => {
                const style = getSeverityStyle(regra.severity);

                return (
                  <motion.div
                    key={`${regra.id}-${index}`}
                    initial={{ opacity: 0, y: 14, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <Card
                      className={`glass group relative overflow-hidden rounded-3xl border border-white/10 transition-all duration-300 hover:-translate-y-1 ${style.glow}`}
                    >
                      <div className={`absolute inset-y-0 left-0 w-1 ${style.stripe}`} />

                      <CardContent className="p-5">
                        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_270px]">
                          <div>
                            <div className="mb-3 flex flex-wrap items-center gap-2">
                              <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-primary">
                                {safeText(regra.id)}
                              </span>

                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.13em] ${style.badge}`}
                              >
                                {style.icon}
                                {style.label}
                              </span>

                              <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                                {safeText(regra.category || regra.section)}
                              </span>
                            </div>

                            <h3 className="text-xl font-black tracking-tight text-white transition-colors group-hover:text-primary">
                              {safeText(regra.article, "Sem artigo")} —{" "}
                              {safeText(regra.title, "Sem título")}
                            </h3>

                            {regra.keywords && (
                              <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                                Palavras-chave: {regra.keywords}
                              </p>
                            )}

                            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                              <InfoBox label="Sanção" value={safeText(regra.sanction)} />
                              <InfoBox label="Dias" value={safeText(regra.days)} />
                              <InfoBox
                                label="Despedimento direto"
                                value={safeText(regra.directDismissal)}
                              />
                            </div>
                          </div>

                          <div className="flex flex-col justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                                Texto para bot
                              </p>
                              <p className="mt-2 line-clamp-5 text-sm leading-6 text-slate-300">
                                {createBotText(regra)}
                              </p>
                            </div>

                            <Button
                              onClick={() => copyText(createBotText(regra))}
                              className="h-10 rounded-xl bg-primary text-xs font-black uppercase tracking-[0.14em] text-primary-foreground hover:bg-primary/90"
                            >
                              <Copy className="mr-2 h-4 w-4" />
                              Copiar
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })
            ) : (
              <EmptyState text="Nenhuma regra disciplinar encontrada." />
            )}
          </section>

          <section className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/10 bg-white/[0.025] p-4">
            <Button
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              className="rounded-2xl border-white/10"
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Anterior
            </Button>

            <div className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
              Página <span className="text-primary">{page}</span> de{" "}
              <span className="text-primary">{totalPages}</span>
            </div>

            <Button
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              className="rounded-2xl border-white/10"
            >
              Seguinte
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </section>
        </>
      )}

      <Card className="glass relative overflow-hidden rounded-3xl border border-white/10 border-l-4 border-l-red-500 shadow-[0_24px_90px_rgba(0,0,0,0.30)]">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-red-500/10 blur-[90px]" />

        <CardHeader className="relative border-b border-white/10 bg-red-500/[0.035]">
          <CardTitle className="flex items-center gap-3 text-lg font-black tracking-wide text-white">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-400">
              <AlertTriangle className="h-5 w-5" />
            </span>
            Aviso de Conformidade
          </CardTitle>
        </CardHeader>

        <CardContent className="relative p-6">
          <p className="text-sm leading-7 text-muted-foreground">
            Este painel serve apenas para consulta rápida e apoio à decisão
            interna. Em caso de dúvida jurídica, conflito disciplinar ou processo
            formal, deve ser consultado o documento oficial{" "}
            <span className="font-black text-white">
              tabela_disciplinar_gnr_profissional_5000_linhas.xlsx
            </span>{" "}
            disponível no repositório central.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-3">
      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 line-clamp-2 text-sm font-bold text-white">{value}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.025] py-16 text-center text-muted-foreground">
      <Loader2 className="mx-auto mb-4 h-10 w-10 opacity-20" />
      <p className="text-lg font-black uppercase tracking-[0.18em]">{text}</p>
      <p className="mt-2 text-sm">Altera a pesquisa ou os filtros selecionados.</p>
    </div>
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
  tone: "green" | "yellow" | "red" | "blue";
  delay: number;
}) {
  const toneMap = {
    green: "border-t-emerald-500 bg-emerald-500/10 text-emerald-400",
    yellow: "border-t-amber-500 bg-amber-500/10 text-amber-400",
    red: "border-t-red-500 bg-red-500/10 text-red-400",
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

function MiniMetric({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  tone: "primary" | "blue";
}) {
  const toneMap = {
    primary: "border-primary/20 bg-primary/10 text-primary",
    blue: "border-blue-500/20 bg-blue-500/10 text-blue-400",
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