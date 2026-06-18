import { useEffect, useState } from "react";
import {
  BookOpenCheck,
  ClipboardCheck,
  GraduationCap,
  Loader2,
  Presentation,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Link } from "wouter";
import { schoolRequest } from "../data/schoolApi";

export default function SchoolManagement() {
  const [permissions, setPermissions] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      schoolRequest("/exam-admin/permissions"),
      schoolRequest("/stats"),
    ])
      .then(([nextPermissions, nextStats]) => {
        setPermissions(nextPermissions);
        setStats(nextStats);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-80 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!permissions?.canManage && !permissions?.canExamine) {
    return (
      <section className="rounded-3xl border border-red-400/20 bg-red-500/10 p-8">
        <ShieldCheck className="h-8 w-8 text-red-300" />
        <h1 className="mt-4 text-3xl font-black text-white">Acesso restrito</h1>
        <p className="mt-2 text-white/55">
          Esta área é exclusiva da Direção da Escola, Responsável de Examinadores e Examinadores autorizados.
        </p>
      </section>
    );
  }

  const cards = [
    {
      href: "/escola/formacoes",
      title: "Avaliações de Formação",
      description: "Corrigir testes, consultar tentativas e acompanhar o progresso dos provisórios.",
      icon: BookOpenCheck,
    },
    {
      href: "/escola/formadores",
      title: "Gestão de Formadores",
      description: "Consultar formadores, candidaturas e organização do corpo pedagógico.",
      icon: Presentation,
    },
    {
      href: "/escola/exames",
      title: "Centro de Exames Finais",
      description: "Gerir pedidos, atribuir examinadores, agendar, avaliar, arquivar e restaurar exames.",
      icon: ClipboardCheck,
    },
    {
      href: "/escola/certificados",
      title: "Certificação",
      description: "Consultar certificados de formações e resultados finais emitidos.",
      icon: GraduationCap,
    },
  ];

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2.4rem] border border-primary/20 bg-black/30 p-7 md:p-9">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/15 blur-[100px]" />
        <div className="relative">
          <div className="flex items-center gap-3 text-primary">
            <ShieldCheck className="h-6 w-6" />
            <span className="text-xs font-black uppercase tracking-[.2em]">
              Administração pedagógica
            </span>
          </div>
          <h1 className="mt-4 text-4xl font-black text-white">
            Gestão da Escola da Guarda
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/50">
            Centro administrativo para formação, formadores, exames finais, certificação e acompanhamento dos Guardas Provisórios.
          </p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-3xl border border-white/10 bg-black/20 p-5">
          <Users className="h-5 w-5 text-primary" />
          <p className="mt-4 text-3xl font-black text-white">{stats?.activeTrainers || 0}</p>
          <p className="mt-1 text-sm text-white/40">Formadores ativos</p>
        </article>
        <article className="rounded-3xl border border-white/10 bg-black/20 p-5">
          <ClipboardCheck className="h-5 w-5 text-primary" />
          <p className="mt-4 text-3xl font-black text-white">{stats?.pendingExams || 0}</p>
          <p className="mt-1 text-sm text-white/40">Exames pendentes</p>
        </article>
        <article className="rounded-3xl border border-white/10 bg-black/20 p-5">
          <GraduationCap className="h-5 w-5 text-primary" />
          <p className="mt-4 text-3xl font-black text-white">{stats?.provisionalStudents || 0}</p>
          <p className="mt-1 text-sm text-white/40">Guardas Provisórios</p>
        </article>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        {cards.map(({ href, title, description, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group rounded-3xl border border-white/10 bg-black/20 p-6 transition hover:border-primary/35 hover:bg-primary/5"
          >
            <Icon className="h-7 w-7 text-primary" />
            <h2 className="mt-5 text-2xl font-black text-white">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-white/45">{description}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
