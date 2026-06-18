import { useEffect, useState } from "react";
import { Award, Download } from "lucide-react";
import { schoolRequest } from "../data/schoolApi";

export default function SchoolCertificates() {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    void schoolRequest("/certificates")
      .then((data) => setItems(data.items || []))
      .catch(() => null);
  }, []);

  return (
    <div className="space-y-6">
      <section className="rounded-[2.2rem] border border-white/10 bg-black/20 p-6">
        <div className="flex items-center gap-3 text-emerald-300">
          <Award />
          <span className="text-xs font-black uppercase tracking-[.2em]">
            Escola da Guarda
          </span>
        </div>
        <h1 className="mt-3 text-4xl font-black text-white">Certificados</h1>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <article
            key={item._id}
            className="rounded-3xl border border-white/10 bg-black/20 p-6"
          >
            <Award className="h-8 w-8 text-amber-300" />
            <h2 className="mt-4 text-xl font-black text-white">{item.title}</h2>
            <p className="mt-2 text-sm text-white/45">
              Emitido em {new Date(item.issuedAt).toLocaleDateString("pt-PT")}
            </p>
            <p className="mt-1 font-mono text-xs text-white/30">
              {item.certificateNumber}
            </p>
            {item.downloadUrl && (
              <a
                href={item.downloadUrl}
                className="mt-5 inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 font-bold text-white"
              >
                <Download className="h-4 w-4" />
                Abrir
              </a>
            )}
          </article>
        ))}

        {!items.length && (
          <div className="rounded-3xl border border-dashed border-white/10 p-10 text-center text-white/35">
            Ainda não existem certificados emitidos.
          </div>
        )}
      </section>
    </div>
  );
}
