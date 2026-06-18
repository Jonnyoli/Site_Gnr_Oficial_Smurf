import { useState } from "react";
import { BookMarked, Presentation, Shield } from "lucide-react";
import {
  GUARD_PROVISIONAL_MANUAL,
  TRAINER_MANUAL,
} from "../data/schoolContent";

export default function SchoolManuals() {
  const [tab, setTab] = useState<"GUARD" | "TRAINER">("GUARD");
  const sections =
    tab === "GUARD" ? GUARD_PROVISIONAL_MANUAL : TRAINER_MANUAL;

  return (
    <div className="space-y-6">
      <section className="rounded-[2.2rem] border border-white/10 bg-black/20 p-6">
        <div className="flex items-center gap-3 text-emerald-300">
          <BookMarked />
          <span className="text-xs font-black uppercase tracking-[.2em]">
            Documentação oficial
          </span>
        </div>
        <h1 className="mt-3 text-4xl font-black text-white">Manuais da Escola</h1>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            onClick={() => setTab("GUARD")}
            className={`rounded-2xl border px-5 py-3 font-bold ${
              tab === "GUARD"
                ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
                : "border-white/10 text-white/50"
            }`}
          >
            Manual do Guarda Provisório
          </button>
          <button
            onClick={() => setTab("TRAINER")}
            className={`rounded-2xl border px-5 py-3 font-bold ${
              tab === "TRAINER"
                ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
                : "border-white/10 text-white/50"
            }`}
          >
            Manual do Formador
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-black/20 p-6 md:p-8">
        <div className="flex items-center gap-4">
          {tab === "GUARD" ? (
            <Shield className="h-10 w-10 text-emerald-300" />
          ) : (
            <Presentation className="h-10 w-10 text-emerald-300" />
          )}
          <div>
            <p className="text-xs font-black uppercase tracking-[.18em] text-emerald-300">
              Escola da Guarda — Guarda Nacional Republicana
            </p>
            <h2 className="mt-1 text-2xl font-black text-white">
              {tab === "GUARD"
                ? "Manual do Guarda Provisório"
                : "Manual do Formador"}
            </h2>
          </div>
        </div>

        <div className="mt-8 space-y-5">
          {sections.map((section, index) => (
            <article
              key={section.title}
              className="rounded-2xl border border-white/10 bg-black/20 p-5"
            >
              <h3 className="font-black text-white">
                {index + 1}. {section.title}
              </h3>
              <div className="mt-3 space-y-2">
                {section.items.map((item) => (
                  <p key={item} className="flex gap-3 text-sm leading-6 text-white/55">
                    <span className="text-emerald-300">•</span>
                    {item}
                  </p>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
