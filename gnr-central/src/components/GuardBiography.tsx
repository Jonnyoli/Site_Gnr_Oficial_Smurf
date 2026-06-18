import { useState } from "react";
import {
  BookOpenText,
  LoaderCircle,
  Pencil,
  Save,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";

export default function GuardBiography({
  profile,
  isOwnProfile,
  loading,
  onSaved,
}: {
  profile: any;
  isOwnProfile: boolean;
  loading: boolean;
  onSaved: () => Promise<unknown> | unknown;
}) {
  const [editing, setEditing] = useState(false);
  const [biography, setBiography] = useState(
    String(profile?.biography || ""),
  );
  const [motto, setMotto] = useState(
    String(profile?.motto || ""),
  );
  const [saving, setSaving] = useState(false);

  function beginEditing() {
    setBiography(String(profile?.biography || ""));
    setMotto(String(profile?.motto || ""));
    setEditing(true);
  }

  async function save() {
    setSaving(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/guard-profiles/me`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            biography,
            motto,
          }),
        },
      );

      const payload =
        await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          payload?.error ||
            "Não foi possível guardar a biografia.",
        );
      }

      await onSaved();
      setEditing(false);
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Não foi possível guardar a biografia.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#06100c]/92 p-6 shadow-[0_26px_90px_rgba(0,0,0,0.30)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(16,185,129,0.12),transparent_34%),radial-gradient(circle_at_92%_80%,rgba(34,211,238,0.07),transparent_30%)]" />

      <div className="relative">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
              <BookOpenText className="h-5 w-5" />
            </span>

            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.17em] text-primary">
                Perfil pessoal
              </p>
              <h2 className="mt-1 text-xl font-black text-white">
                Biografia
              </h2>
            </div>
          </div>

          {isOwnProfile && !editing && (
            <Button
              type="button"
              variant="outline"
              onClick={beginEditing}
              className="gap-2 border-white/10 bg-white/[0.03]"
            >
              <Pencil className="h-4 w-4" />
              Editar biografia
            </Button>
          )}

          {isOwnProfile && editing && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditing(false)}
              className="gap-2 border-white/10 bg-white/[0.03]"
            >
              <X className="h-4 w-4" />
              Cancelar
            </Button>
          )}
        </div>

        {loading ? (
          <div className="mt-6 flex items-center gap-3 text-sm text-white/35">
            <LoaderCircle className="h-5 w-5 animate-spin text-primary" />
            A carregar biografia...
          </div>
        ) : editing ? (
          <div className="mt-6 space-y-4">
            <input
              value={motto}
              onChange={(event) => setMotto(event.target.value)}
              maxLength={180}
              placeholder="Lema pessoal..."
              className="h-12 w-full rounded-xl border border-white/10 bg-black/25 px-4 text-sm text-white outline-none focus:border-primary/40"
            />

            <textarea
              value={biography}
              onChange={(event) => setBiography(event.target.value)}
              rows={6}
              maxLength={1200}
              placeholder="Percurso na Guarda, especialidades, experiência e objetivos..."
              className="w-full resize-none rounded-xl border border-white/10 bg-black/25 p-4 text-sm leading-7 text-white outline-none focus:border-primary/40"
            />

            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-white/25">
                {biography.length}/1200
              </span>

              <Button
                type="button"
                disabled={saving}
                onClick={() => void save()}
                className="gap-2"
              >
                {saving ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Guardar biografia
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-6">
            {profile?.motto && (
              <p className="text-lg font-black italic text-white/85">
                “{profile.motto}”
              </p>
            )}

            <p className="mt-4 whitespace-pre-line text-sm leading-7 text-white/50">
              {profile?.biography ||
                "Este militar ainda não adicionou uma biografia ao perfil."}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
