import {
  Switch,
  Route,
  Router as WouterRouter,
  useLocation,
  } from "wouter";

import {
  QueryClientProvider,
  } from "@tanstack/react-query";

import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import {
  Bot,
  ClipboardCheck,
  DatabaseBackup,
  Loader2,
  Lock,
  Mail,
  Newspaper,
  Route as RouteIcon,
  ShieldAlert,
  } from "lucide-react";

import {
  useEffect,
} from "react";

import type {
  ReactNode,
} from "react";

import NotFound from "@/pages/not-found";

import Layout from "./components/Layout";

import queryClient from "./lib/queryClient";

import {
  DataProvider,
} from "./context/DataContext";

import {
  AuthProvider,
  useAuth,
} from "./context/AuthContext";

import SchoolDashboard from "./pages/SchoolDashboard";
import SchoolTrainings from "./pages/SchoolTrainings";
import SchoolManuals from "./pages/SchoolManuals";
import SchoolTrainers from "./pages/SchoolTrainers";
import SchoolExams from "./pages/SchoolExams";
import SchoolCertificates from "./pages/SchoolCertificates";
import IntegracaoInicial from "./pages/IntegracaoInicial";
import { mustCompleteOnboarding } from "./config/onboarding";

/**
 * ============================================================
 * PÁGINAS PRINCIPAIS
 * ============================================================
 */

import Inicio from "./pages/Inicio";
import Dashboard from "./pages/Dashboard";
import Comando from "./pages/Comando";
import Honra from "./pages/Honra";
import Loja from "./pages/Loja";
import Alertas from "./pages/Alertas";

/**
 * ============================================================
 * EFETIVO E OPERAÇÃO
 * ============================================================
 */

import Guardas from "./pages/Guardas";
import GuardaPerfil from "./pages/GuardaPerfil";
import Horas from "./pages/Horas";
import Patrulhas from "./pages/Patrulhas";
import RegistoCPs from "./pages/RegistoCPs";
import FolhaPonto from "./pages/FolhaPonto";
import GestaoPontosAdmin from "./pages/GestaoPontosAdmin";

/**
 * ============================================================
 * ADMINISTRAÇÃO
 * ============================================================
 */

import Arquivos from "./pages/Arquivos";
import Documentos from "./pages/Documentos";
import Relatorios from "./pages/Relatorios";
import Auditoria from "./pages/Auditoria";
import Legislacao from "./pages/Legislacao";

/**
 * ============================================================
 * UNIDADES
 * ============================================================
 */

import Unidades from "./pages/Unidades";
import CentroAprovacoes from "./pages/CentroAprovacoes";
import InvestigacaoDetalhe from "./pages/InvestigacaoDetalhe";
import VerificarDocumento from "./pages/VerificarDocumento";
import DocumentosOficiais from "./pages/DocumentosOficiais";
import PesquisaGlobal from "./pages/PesquisaGlobal";
import DashboardExecutivo from "./pages/DashboardExecutivo";
import GestaoEfetivo from "./pages/GestaoEfetivo";
import EstatisticasUnidades from "./pages/EstatisticasUnidades";
import AplicacaoMobile from "./pages/AplicacaoMobile";
import Departamentos from "./pages/Departamentos";
import DepartamentoDetalhe from "./pages/DepartamentoDetalhe";
import CSOReunioes from "./pages/CSOReunioes";
import CSOReuniaoDetalhe from "./pages/CSOReuniaoDetalhe";
import CSOAta from "./pages/CSOAta";
import DepartamentosSuite from "./pages/DepartamentosSuite";
import CEGFiscalizacoes from "./pages/CEGFiscalizacoes";
import DRHCentro from "./pages/DRHCentro";
import ComandoDecisoes from "./pages/ComandoDecisoes";
import PesquisaDepartamentos from "./pages/PesquisaDepartamentos";

/**
 * ============================================================
 * COMUNICAÇÃO
 * ============================================================
 */

import Avisos from "./pages/Avisos";
import Agenda from "./pages/Agenda";
import Comunicados from "./pages/Comunicados";
import Forum from "./pages/Forum";

/**
 * ============================================================
 * SISTEMA
 * ============================================================
 */

import Definicoes from "./pages/Definicoes";
import PainelSincronizacaoDiscord from "./pages/PainelSincronizacaoDiscord";
import SocialCustomizationSettings from "./pages/SocialCustomizationSettings";
import SergeantEvaluations from "./pages/SergeantEvaluations";
import CareerEvaluations from "./pages/CareerEvaluations";
import Login from "./pages/Login";
import SchoolManagement from "./pages/SchoolManagement";
import GuardaPerfilPreview from "./pages/GuardaPerfilPreview";

const DEV_USER_ID =
  "713719718091030599";

type UnitKey =
  | "GIOE"
  | "DI"
  | "NIC"
  | "UNT"
  | "USHE"
  | "GSA";

const UNIT_ROLE_IDS: Record<
  UnitKey,
  string[]
> = {
  GIOE: [
    "1147878941974077473",
  ],

  DI: [
    "1187379939708780544",
  ],

  NIC: [
    "1296910359994564700",
  ],

  UNT: [
    "1147878941885988929",
  ],

  USHE: [
    "1332075102879219793",
  ],

  GSA: [
    "1147878941927952470",
  ],
};

const UNIT_NAMES: Record<
  UnitKey,
  string
> = {
  GIOE:
    "Grupo de Intervenção de Operações Especiais",

  DI:
    "Destacamento de Intervenção",

  NIC:
    "Núcleo de Investigação Criminal",

  UNT:
    "Unidade Nacional de Trânsito",

  USHE:
    "Unidade de Segurança e Honras de Estado",

  GSA:
    "Grupo de Suporte Aéreo",
};

/**
 * ============================================================
 * PERMISSÕES DAS UNIDADES
 * ============================================================
 */

function userHasUnitAccess(
  user: any,
  unit: UnitKey,
) {
  if (!user) {
    return false;
  }

  const userId =
    String(user?.id || "");

  const roles =
    Array.isArray(user?.roles)
      ? user.roles.map(String)
      : [];

  const isDev =
    userId === DEV_USER_ID;

  const isComandoGeral =
    roles.includes(
      "1147878942099906672",
    );

  const isComandoLegacy =
    roles.includes(
      "1147878942066364488",
    );

  if (
    isDev ||
    isComandoGeral ||
    isComandoLegacy
  ) {
    return true;
  }

  return UNIT_ROLE_IDS[
    unit
  ].some((roleId) =>
    roles.includes(roleId),
  );
}

function UnitAccessGuard({
  unit,
  children,
}: {
  unit: UnitKey;
  children: ReactNode;
}) {
  const { user } = useAuth();

  if (
    userHasUnitAccess(
      user,
      unit,
    )
  ) {
    return <>{children}</>;
  }

  return (
    <AccessDenied unit={unit} />
  );
}

function AccessDenied({
  unit,
}: {
  unit: UnitKey;
}) {
  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[2.7rem] border border-red-500/20 bg-[#160606]/90 p-8 shadow-[0_34px_140px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(248,113,113,0.22),transparent_34%),radial-gradient(circle_at_88%_78%,rgba(234,179,8,0.10),transparent_36%)]" />

        <div className="absolute inset-0 cyber-grid-soft opacity-20" />

        <div className="absolute -right-28 -top-28 h-96 w-96 rounded-full bg-red-500/10 blur-[130px]" />

        <div className="relative flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-5 inline-flex items-center gap-3 rounded-full border border-red-400/25 bg-red-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.25em] text-red-300">
              <Lock className="h-4 w-4" />

              Acesso Restrito
            </div>

            <h1 className="text-4xl font-black uppercase tracking-tight text-white md:text-5xl">
              Área reservada —{" "}
              {unit}
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-red-100/75">
              Esta página pertence à
              unidade{" "}
              {UNIT_NAMES[unit]}.
              Para acederes, tens de
              ter a role
              correspondente no
              Discord. Caso consideres
              que existe um erro,
              contacta o
              Comando-Geral ou o
              comando da unidade.
            </p>

            <div className="mt-6 rounded-2xl border border-red-400/20 bg-black/25 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-300">
                Role necessária
              </p>

              <p className="mt-2 font-mono text-sm text-white">
                {UNIT_ROLE_IDS[
                  unit
                ].join(" / ")}
              </p>
            </div>
          </div>

          <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-[2rem] border border-red-400/25 bg-red-500/10 text-red-300 shadow-[0_0_70px_rgba(248,113,113,0.18)]">
            <ShieldAlert className="h-14 w-14" />
          </div>
        </div>
      </section>
    </div>
  );
}


function userHasApprovalAccess(user: any) {
  if (!user) return false;

  const userId = String(user?.id || "");
  const roles = Array.isArray(user?.roles)
    ? user.roles.map(String)
    : [];

  return (
    userId === DEV_USER_ID ||
    roles.includes("1147878942099906672") ||
    roles.includes("1296910327879045130")
  );
}

function ApprovalAccessGuard({
  children,
}: {
  children: ReactNode;
}) {
  const { user } = useAuth();

  if (userHasApprovalAccess(user)) {
    return <>{children}</>;
  }

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[2.7rem] border border-red-500/20 bg-[#160606]/90 p-8">
        <div className="relative">
          <div className="inline-flex items-center gap-3 rounded-full border border-red-400/25 bg-red-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.25em] text-red-300">
            <Lock className="h-4 w-4" />
            Acesso Restrito
          </div>

          <h1 className="mt-5 text-4xl font-black text-white">
            Centro de Aprovações
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-7 text-red-100/75">
            Esta área está reservada ao Diretor do NIC e ao
            Comando-Geral.
          </p>
        </div>
      </section>
    </div>
  );
}

function CommandOnlyGuard({
  children,
}: {
  children: ReactNode;
}) {
  const { user } = useAuth();

  const userId = String(user?.id || "");
  const roles = Array.isArray(user?.roles)
    ? user.roles.map(String)
    : [];

  const hasAccess =
    userId === DEV_USER_ID ||
    roles.includes("1147878942099906672");

  if (hasAccess) {
    return <>{children}</>;
  }

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[2.7rem] border border-red-500/20 bg-[#160606]/90 p-8">
        <div className="relative">
          <div className="inline-flex items-center gap-3 rounded-full border border-red-400/25 bg-red-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.25em] text-red-300">
            <Lock className="h-4 w-4" />
            Comando-Geral
          </div>

          <h1 className="mt-5 text-4xl font-black text-white">
            Centro de Comando restrito
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-7 text-red-100/75">
            Esta área está reservada exclusivamente aos membros do
            Comando-Geral.
          </p>
        </div>
      </section>
    </div>
  );
}


const SERGEANT_ROLE_ID =
  "1147891694260461688";

function SergeantAccessGuard({
  children,
}: {
  children: ReactNode;
}) {
  const { user } = useAuth();

  const userId =
    String(user?.id || "");

  const roles =
    Array.isArray(user?.roles)
      ? user.roles.map(String)
      : [];

  const hasAccess =
    userId === DEV_USER_ID ||
    roles.includes(
      SERGEANT_ROLE_ID,
    ) ||
    roles.includes(
      "1147878942099906672",
    );

  if (hasAccess) {
    return <>{children}</>;
  }

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[2.7rem] border border-red-500/20 bg-[#160606]/90 p-8">
        <div className="relative">
          <div className="inline-flex items-center gap-3 rounded-full border border-red-400/25 bg-red-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.25em] text-red-300">
            <Lock className="h-4 w-4" />
            Classe de Sargentos
          </div>

          <h1 className="mt-5 text-4xl font-black text-white">
            Avaliações restritas
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-7 text-red-100/75">
            Esta área exige a role de Sargentos no Discord.
          </p>
        </div>
      </section>
    </div>
  );
}

function SergeantEvaluationsProtected() {
  return (
    <SergeantAccessGuard>
      <SergeantEvaluations />
    </SergeantAccessGuard>
  );
}


const OFFICER_EVALUATOR_ROLE_ID =
  "1147878942066364488";

const COMMAND_GENERAL_ROLE_ID =
  "1147878942099906672";

function CareerEvaluationsAccessGuard({
  children,
}: {
  children: ReactNode;
}) {
  const { user } = useAuth();

  const userId =
    String(user?.id || "");

  const roles =
    Array.isArray(user?.roles)
      ? user.roles.map(String)
      : [];

  const hasAccess =
    userId === DEV_USER_ID ||
    roles.includes(
      OFFICER_EVALUATOR_ROLE_ID,
    ) ||
    roles.includes(
      COMMAND_GENERAL_ROLE_ID,
    );

  if (hasAccess) {
    return <>{children}</>;
  }

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[2.7rem] border border-red-500/20 bg-[#160606]/90 p-8 shadow-[0_34px_140px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(248,113,113,0.22),transparent_34%),radial-gradient(circle_at_88%_78%,rgba(139,92,246,0.12),transparent_36%)]" />

        <div className="relative">
          <div className="inline-flex items-center gap-3 rounded-full border border-red-400/25 bg-red-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.25em] text-red-300">
            <Lock className="h-4 w-4" />
            Avaliações de Carreira
          </div>

          <h1 className="mt-5 text-4xl font-black text-white">
            Acesso restrito
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-7 text-red-100/75">
            Esta área está reservada à classe de Oficiais autorizada
            e ao Comando-Geral.
          </p>

          <div className="mt-6 grid max-w-3xl grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-blue-400/20 bg-blue-500/[0.06] p-4">
              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-blue-300">
                Oficiais → Sargentos
              </p>
              <p className="mt-2 font-mono text-xs text-white/70">
                {OFFICER_EVALUATOR_ROLE_ID}
              </p>
            </div>

            <div className="rounded-2xl border border-violet-400/20 bg-violet-500/[0.06] p-4">
              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-violet-300">
                Comando-Geral → Oficiais
              </p>
              <p className="mt-2 font-mono text-xs text-white/70">
                {COMMAND_GENERAL_ROLE_ID}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function CareerEvaluationsProtected() {
  return (
    <CareerEvaluationsAccessGuard>
      <CareerEvaluations />
    </CareerEvaluationsAccessGuard>
  );
}

function ComandoProtegido() {
  return (
    <CommandOnlyGuard>
      <Comando />
    </CommandOnlyGuard>
  );
}

function DashboardExecutivoProtegido() {
  return (
    <CommandOnlyGuard>
      <DashboardExecutivo />
    </CommandOnlyGuard>
  );
}

function CentroAprovacoesProtegido() {
  return (
    <ApprovalAccessGuard>
      <CentroAprovacoes />
    </ApprovalAccessGuard>
  );
}

function InvestigacaoDetalheProtegida() {
  return (
    <UnitAccessGuard unit="NIC">
      <InvestigacaoDetalhe />
    </UnitAccessGuard>
  );
}

function DocumentosOficiaisProtegidos() {
  return (
    <ApprovalAccessGuard>
      <DocumentosOficiais />
    </ApprovalAccessGuard>
  );
}

/**
 * ============================================================
 * PLACEHOLDERS TEMPORÁRIOS
 * ============================================================
 */

function PlaceholderPage({
  title,
  subtitle,
  icon: Icon,
}: {
  title: string;
  subtitle: string;
  icon: any;
}) {
  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#050b09]/80 p-8 shadow-[0_28px_120px_rgba(0,0,0,0.42)] backdrop-blur-xl">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-primary/10 blur-[110px]" />

        <div className="absolute -bottom-28 left-1/3 h-80 w-80 rounded-full bg-accent/10 blur-[120px]" />

        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-5 inline-flex items-center gap-3 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.25em] text-primary">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />

                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
              </span>

              Módulo preparado
            </div>

            <h1 className="flex flex-wrap items-center gap-4 text-4xl font-black tracking-tight text-white md:text-5xl">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                <Icon className="h-8 w-8" />
              </span>

              {title}
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">
              {subtitle}
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <div className="glass rounded-3xl border border-white/10 p-6">
          <p className="text-sm font-bold text-muted-foreground">
            Estado
          </p>

          <p className="mt-4 text-3xl font-black text-white">
            Em construção
          </p>

          <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">
            Base criada
          </p>
        </div>

        <div className="glass rounded-3xl border border-white/10 p-6">
          <p className="text-sm font-bold text-muted-foreground">
            Integração
          </p>

          <p className="mt-4 text-3xl font-black text-white">
            Frontend
          </p>

          <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">
            Rota ativa
          </p>
        </div>

        <div className="glass rounded-3xl border border-white/10 p-6">
          <p className="text-sm font-bold text-muted-foreground">
            Próximo passo
          </p>

          <p className="mt-4 text-3xl font-black text-white">
            Design
          </p>

          <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">
            Vamos melhorar
          </p>
        </div>
      </section>
    </div>
  );
}

/**
 * ============================================================
 * MÓDULOS AINDA EM CONSTRUÇÃO
 * ============================================================
 */

function Noticias() {
  return (
    <PlaceholderPage
      title="Notícias"
      subtitle="Publicações internas, atualizações, novidades operacionais e informação institucional."
      icon={Newspaper}
    />
  );
}

function Comunicacoes() {
  return (
    <PlaceholderPage
      title="Comunicados"
      subtitle="Comunicados oficiais, ordens, informações do comando e mensagens institucionais."
      icon={Mail}
    />
  );
}

function Discord() {
  return (
    <PlaceholderPage
      title="Discord"
      subtitle="Estado do bot, guild ligada, cargos carregados, sincronização, permissões e logs do Discord."
      icon={Bot}
    />
  );
}

function Backup() {
  return (
    <PlaceholderPage
      title="Backup"
      subtitle="Cópias de segurança, base de dados, exportações administrativas e recuperação do sistema."
      icon={DatabaseBackup}
    />
  );
}

/**
 * ============================================================
 * COMPONENTES DAS UNIDADES
 * ============================================================
 */

function UnidadeNIC() {
  return (
    <UnitAccessGuard unit="NIC">
      <Unidades />
    </UnitAccessGuard>
  );
}

function UnidadeUNT() {
  return (
    <UnitAccessGuard unit="UNT">
      <Unidades />
    </UnitAccessGuard>
  );
}

function UnidadeGIOE() {
  return (
    <UnitAccessGuard unit="GIOE">
      <Unidades />
    </UnitAccessGuard>
  );
}

function UnidadeUSHE() {
  return (
    <UnitAccessGuard unit="USHE">
      <Unidades />
    </UnitAccessGuard>
  );
}

function UnidadeGSA() {
  return (
    <UnitAccessGuard unit="GSA">
      <Unidades />
    </UnitAccessGuard>
  );
}

function UnidadeDI() {
  return (
    <UnitAccessGuard unit="DI">
      <Unidades />
    </UnitAccessGuard>
  );
}

/**
 * ============================================================
 * ROUTER PRINCIPAL
 * ============================================================
 */

function Router() {
  return (
    <Switch>
      {/* Principal */}

      <Route
        path="/"
        component={Inicio}
      />

      <Route
        path="/pesquisa"
        component={PesquisaGlobal}
      />

      <Route path="/integracao" component={IntegracaoInicial} />

      {/* Escola da Guarda */}

      <Route
        path="/escola/gestao"
        component={SchoolManagement}
      />

      <Route
        path="/escola/formacoes"
        component={SchoolTrainings}
      />

      <Route
        path="/escola/manuais"
        component={SchoolManuals}
      />

      <Route
        path="/escola/formadores"
        component={SchoolTrainers}
      />

      <Route
        path="/escola/exames"
        component={SchoolExams}
      />

      <Route
        path="/escola/certificados"
        component={SchoolCertificates}
      />

      <Route
        path="/escola"
        component={SchoolDashboard}
      />
<Route
        path="/dashboard-executivo"
        component={DashboardExecutivoProtegido}
      />

      <Route
        path="/gestao-efetivo"
        component={GestaoEfetivo}
      />

      <Route
        path="/estatisticas-unidades"
        component={EstatisticasUnidades}
      />

      <Route
        path="/aplicacao"
        component={AplicacaoMobile}
      />

      <Route
        path="/departamentos/cso/reunioes/:meetingId/ata"
        component={CSOAta}
      />

      <Route
        path="/departamentos/cso/reunioes/:meetingId"
        component={CSOReuniaoDetalhe}
      />

      <Route
        path="/departamentos/cso/reunioes"
        component={CSOReunioes}
      />
<Route
        path="/departamentos/suite"
        component={DepartamentosSuite}
      />

      <Route
        path="/departamentos/ceg/fiscalizacoes"
        component={CEGFiscalizacoes}
      />

      <Route
        path="/departamentos/drh"
        component={DRHCentro}
      />

      <Route
        path="/departamentos/comando/decisoes"
        component={ComandoDecisoes}
      />

      <Route
        path="/departamentos/pesquisa"
        component={PesquisaDepartamentos}
      />

      <Route
        path="/departamentos/:department"
        component={DepartamentoDetalhe}
      />

      <Route
        path="/departamentos"
        component={Departamentos}
      />

      <Route
        path="/dashboard"
        component={Dashboard}
      />

      <Route
        path="/comando/aprovacoes"
        component={CentroAprovacoesProtegido}
      />

      <Route
        path="/comando"
        component={ComandoProtegido}
      />

      <Route
        path="/honra"
        component={Honra}
      />

      <Route
        path="/loja"
        component={Loja}
      />

      <Route
        path="/alertas"
        component={Alertas}
      />

      {/* Efetivo */}

            <Route
        path="/guardas/:id/preview"
        component={GuardaPerfilPreview}
      />

<Route
        path="/guardas/:id"
        component={GuardaPerfil}
      />

      <Route
        path="/guardas"
        component={Guardas}
      />

      {/* Operacional */}

      <Route
        path="/horas"
        component={Horas}
      />

      <Route
        path="/patrulhas"
        component={Patrulhas}
      />

      <Route
        path="/cps"
        component={RegistoCPs}
      />

      <Route
        path="/ponto"
        component={FolhaPonto}
      />

      <Route
        path="/pontos/admin"
        component={GestaoPontosAdmin}
      />

      <Route
        path="/avaliacoes-sargentos"
        component={SergeantEvaluationsProtected}
      />

      <Route
        path="/avaliacoes-carreira"
        component={CareerEvaluationsProtected}
      />

      {/* Administração */}

      <Route
        path="/arquivos"
        component={Arquivos}
      />

      <Route
        path="/documentos-oficiais"
        component={DocumentosOficiaisProtegidos}
      />

      <Route
        path="/verificar-documento"
        component={VerificarDocumento}
      />

      <Route
        path="/documentos"
        component={Documentos}
      />

      <Route
        path="/relatorios"
        component={Relatorios}
      />

      <Route
        path="/auditoria"
        component={Auditoria}
      />

      <Route
        path="/legislacao"
        component={Legislacao}
      />

      {/* Unidades */}

      <Route
        path="/unidades/gioe"
        component={UnidadeGIOE}
      />

      <Route
        path="/unidades/di"
        component={UnidadeDI}
      />

      <Route
        path="/unidades/nic/investigacoes/:id"
        component={InvestigacaoDetalheProtegida}
      />

      <Route
        path="/unidades/nic"
        component={UnidadeNIC}
      />

      <Route
        path="/unidades/unt"
        component={UnidadeUNT}
      />

      <Route
        path="/unidades/ushe"
        component={UnidadeUSHE}
      />

      <Route
        path="/unidades/gsa"
        component={UnidadeGSA}
      />

      <Route
        path="/unidades"
        component={Unidades}
      />

      {/* Rotas antigas */}

      <Route
        path="/gioe"
        component={UnidadeGIOE}
      />

      <Route
        path="/di"
        component={UnidadeDI}
      />

      <Route
        path="/nic"
        component={UnidadeNIC}
      />

      <Route
        path="/unt"
        component={UnidadeUNT}
      />

      <Route
        path="/ushe"
        component={UnidadeUSHE}
      />

      <Route
        path="/gsa"
        component={UnidadeGSA}
      />

      {/* Comunicação */}

      <Route
        path="/noticias"
        component={Noticias}
      />

      <Route
        path="/avisos"
        component={Avisos}
      />

      <Route
        path="/comunicacoes"
        component={Comunicados}
      />

      <Route
        path="/agenda"
        component={Agenda}
      />

      <Route
        path="/forum"
        component={Forum}
      />

      {/* Sistema */}

      <Route
        path="/definicoes/personalizacao-social"
        component={SocialCustomizationSettings}
      />

      <Route
        path="/definicoes"
        component={Definicoes}
      />

      <Route
        path="/discord"
        component={Discord}
      />

      <Route
        path="/discord/sincronizacao"
        component={PainelSincronizacaoDiscord}
      />

      <Route
        path="/backup"
        component={Backup}
      />

      {/* 404 */}

      <Route
        component={NotFound}
      />
    
            
            
            
            
            

          </Switch>
  );
}

/**
 * ============================================================
 * AUTENTICAÇÃO DA APLICAÇÃO
 * ============================================================
 */

function AppGuard() {
  const {
    user,
    isLoading,
    isAuthenticated,
  } = useAuth();

  const [location, navigate] =
    useLocation();

  useEffect(() => {
    if (
      !isLoading &&
      isAuthenticated &&
      mustCompleteOnboarding(user) &&
      location !== "/integracao"
    ) {
      navigate("/integracao", {
        replace: true,
      });
    }
  }, [
    user,
    isLoading,
    isAuthenticated,
    location,
    navigate,
  ]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <Layout>
      <Router />
    </Layout>
  );
}

/**
 * ============================================================
 * APLICAÇÃO
 * ============================================================
 */

function App() {
  const base =
    import.meta.env.BASE_URL?.replace(
      /\/$/,
      "",
    ) || "";

  return (
    <QueryClientProvider
      client={queryClient}
    >
      <TooltipProvider>
        <AuthProvider>
          <DataProvider>
            <WouterRouter
              base={base}
            >
              <AppGuard />
            </WouterRouter>
          </DataProvider>
        </AuthProvider>

        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;