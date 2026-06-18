import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  ImagePlus,
  Loader2,
  PackagePlus,
  Pencil,
  RefreshCw,
  Save,
  Search,
  Trash2,
  ArchiveRestore,
  Boxes,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

type StoreCategory =
  | "MOLDURAS"
  | "EMBLEMAS"
  | "FUNDOS"
  | "TITULOS"
  | "TEMAS"
  | "COLECOES"
  | "SOCIAL"
  | "EXCLUSIVOS";

type StoreRarity =
  | "COMUM"
  | "RARO"
  | "EPICO"
  | "LENDARIO"
  | "EXCLUSIVO"
  | "INSTITUCIONAL";

type StoreProduct = {
  id: string;
  name: string;
  description: string;
  category: StoreCategory;
  rarity: StoreRarity;
  price: number;
  image?: string | null;
  collection?: string | null;
  equipSlot?: string | null;
  requiredRoleKeys?: string[];
  purchasable?: boolean;
  stock?: number | null;
  soldCount?: number;
  limited?: boolean;
  featured?: boolean;
  active?: boolean;
  discount?: number;
  sortOrder?: number;
};

const API =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";

const EMPTY: StoreProduct = {
  id: "",
  name: "",
  description: "",
  category: "MOLDURAS",
  rarity: "COMUM",
  price: 0,
  image: "",
  collection: "",
  equipSlot: null,
  requiredRoleKeys: [],
  purchasable: true,
  stock: null,
  soldCount: 0,
  limited: false,
  featured: false,
  active: true,
  discount: 0,
  sortOrder: 0,
};

const CATEGORIES: StoreCategory[] = [
  "MOLDURAS",
  "EMBLEMAS",
  "FUNDOS",
  "TITULOS",
  "TEMAS",
  "COLECOES",
  "SOCIAL",
  "EXCLUSIVOS",
];

const RARITIES: StoreRarity[] = [
  "COMUM",
  "RARO",
  "EPICO",
  "LENDARIO",
  "EXCLUSIVO",
  "INSTITUCIONAL",
];

const ROLE_KEYS = [
  "NIC",
  "UNT",
  "GIOE",
  "USHE",
  "DI",
  "FOUNDER",
  "COMMAND_GENERAL",
];

async function request(path: string, init?: RequestInit) {
  const response = await fetch(`${API}/api/store${path}`, {
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers || {}),
    },
    ...init,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Erro ${response.status}`);
  }

  return data;
}

export default function StoreCatalogSettings() {
  const { toast } = useToast();
  const [items, setItems] = useState<StoreProduct[]>([]);
  const [form, setForm] = useState<StoreProduct>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "ACTIVE" | "HIDDEN" | "SOLD_OUT"
  >("ALL");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);

    try {
      const data = await request("/catalog/admin");
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (error: any) {
      toast({
        title: "Erro no catálogo",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return items.filter((item) => {
      const matchesSearch =
        !term ||
        [item.name, item.id, item.category, item.collection]
          .filter(Boolean)
          .some((value) =>
            String(value).toLowerCase().includes(term),
          );

      const soldOut =
        item.stock !== null &&
        item.stock !== undefined &&
        item.stock <= 0;

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" &&
          item.active !== false &&
          !soldOut) ||
        (statusFilter === "HIDDEN" &&
          item.active === false) ||
        (statusFilter === "SOLD_OUT" &&
          soldOut);

      return matchesSearch && matchesStatus;
    });
  }, [items, search, statusFilter]);

  function reset() {
    setForm(EMPTY);
    setEditingId(null);
  }

  function edit(item: StoreProduct) {
    setEditingId(item.id);
    setForm({
      ...EMPTY,
      ...item,
      requiredRoleKeys: item.requiredRoleKeys || [],
    });
  }

  async function uploadImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      toast({
        title: "Imagem inválida",
        description: "Seleciona PNG, JPG ou WEBP.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Imagem demasiado grande",
        description: "O limite é 5 MB.",
        variant: "destructive",
      });
      return;
    }

    setBusy(true);

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
        reader.readAsDataURL(file);
      });

      const data = await request("/catalog/upload-image", {
        method: "POST",
        body: JSON.stringify({
          dataUrl,
          fileName: file.name,
        }),
      });

      setForm((current) => ({
        ...current,
        image: data.image,
      }));

      toast({
        title: "Imagem carregada",
        description: "A imagem ficou pronta para o produto.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao carregar imagem",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();

    if (!form.name.trim()) {
      toast({
        title: "Nome obrigatório",
        variant: "destructive",
      });
      return;
    }

    setBusy(true);

    try {
      const path = editingId ? `/catalog/${editingId}` : "/catalog";
      const method = editingId ? "PATCH" : "POST";

      await request(path, {
        method,
        body: JSON.stringify(form),
      });

      toast({
        title: editingId ? "Produto atualizado" : "Produto criado",
        description: "O catálogo público foi atualizado.",
      });

      reset();
      await load();
    } catch (error: any) {
      toast({
        title: "Erro ao guardar produto",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  async function disable(item: StoreProduct) {
    const confirmed = window.confirm(
      `Retirar "${item.name}" do catálogo? O item não será apagado dos inventários existentes.`,
    );

    if (!confirmed) return;

    setBusy(true);

    try {
      await request(`/catalog/${item.id}`, {
        method: "DELETE",
      });

      toast({
        title: "Produto retirado",
        description: "O produto deixou de estar disponível para compra.",
      });

      await load();
    } catch (error: any) {
      toast({
        title: "Erro ao retirar produto",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  async function restore(item: StoreProduct) {
    const confirmed = window.confirm(
      `Reativar "${item.name}" no catálogo?`,
    );

    if (!confirmed) return;

    setBusy(true);

    try {
      await request(`/catalog/${item.id}/restore`, {
        method: "POST",
        body: JSON.stringify({
          purchasable: true,
        }),
      });

      toast({
        title: "Produto reativado",
        description:
          "O produto voltou a ficar visível na loja.",
      });

      await load();
    } catch (error: any) {
      toast({
        title: "Erro ao reativar produto",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  function toggleRole(role: string) {
    setForm((current) => {
      const roles = current.requiredRoleKeys || [];

      return {
        ...current,
        requiredRoleKeys: roles.includes(role)
          ? roles.filter((value) => value !== role)
          : [...roles, role],
      };
    });
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-black/20 p-5 md:p-7">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="flex items-center gap-3 text-primary">
            <PackagePlus className="h-5 w-5" />
            <span className="text-xs font-black uppercase tracking-[.18em]">
              Gestão da Loja
            </span>
          </div>

          <h2 className="mt-2 text-2xl font-black text-white">
            Catálogo de produtos
          </h2>

          <p className="mt-2 text-sm text-muted-foreground">
            Adiciona produtos, imagens, categorias, preços, stock e restrições sem editar código.
            Esta gestão é exclusiva do Comando-Geral.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => void load()}
          disabled={loading || busy}
          className="rounded-xl border-white/10"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      <form onSubmit={submit} className="mt-6 grid gap-5 rounded-3xl border border-white/10 bg-black/20 p-4 md:p-6 xl:grid-cols-[1.15fr_.85fr]">
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nome">
              <Input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                className="rounded-xl border-white/10 bg-black/20"
              />
            </Field>

            <Field label="ID (opcional ao criar)">
              <Input
                value={form.id}
                disabled={Boolean(editingId)}
                onChange={(event) => setForm({ ...form, id: event.target.value })}
                placeholder="gerado pelo nome"
                className="rounded-xl border-white/10 bg-black/20"
              />
            </Field>

            <Field label="Categoria">
              <select
                value={form.category}
                onChange={(event) =>
                  setForm({ ...form, category: event.target.value as StoreCategory })
                }
                className="h-10 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white"
              >
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Raridade">
              <select
                value={form.rarity}
                onChange={(event) =>
                  setForm({ ...form, rarity: event.target.value as StoreRarity })
                }
                className="h-10 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white"
              >
                {RARITIES.map((rarity) => (
                  <option key={rarity} value={rarity}>
                    {rarity}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Preço">
              <Input
                type="number"
                min={0}
                max={1000000}
                value={form.price}
                onChange={(event) =>
                  setForm({ ...form, price: Number(event.target.value) })
                }
                className="rounded-xl border-white/10 bg-black/20"
              />
            </Field>

            <Field label="Stock">
              <Input
                type="number"
                min={0}
                max={1000000}
                value={
                  form.stock === null ||
                  form.stock === undefined
                    ? ""
                    : form.stock
                }
                onChange={(event) =>
                  setForm({
                    ...form,
                    stock:
                      event.target.value === ""
                        ? null
                        : Math.max(
                            0,
                            Number(event.target.value),
                          ),
                  })
                }
                placeholder="Vazio = ilimitado"
                className="rounded-xl border-white/10 bg-black/20"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Deixa vazio para stock ilimitado.
              </p>
            </Field>

            <Field label="Unidades vendidas">
              <Input
                value={form.soldCount || 0}
                disabled
                className="rounded-xl border-white/10 bg-black/20"
              />
            </Field>

            <Field label="Coleção">
              <Input
                value={form.collection || ""}
                onChange={(event) =>
                  setForm({ ...form, collection: event.target.value })
                }
                className="rounded-xl border-white/10 bg-black/20"
              />
            </Field>

            <Field label="Slot de equipamento">
              <select
                value={form.equipSlot || ""}
                onChange={(event) =>
                  setForm({ ...form, equipSlot: event.target.value || null })
                }
                className="h-10 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white"
              >
                <option value="">Não equipável</option>
                <option value="frame">Moldura</option>
                <option value="background">Fundo</option>
                <option value="title">Título</option>
                <option value="theme">Tema</option>
                <option value="badges">Emblema</option>
              </select>
            </Field>

            <Field label="Ordem">
              <Input
                type="number"
                value={form.sortOrder || 0}
                onChange={(event) =>
                  setForm({ ...form, sortOrder: Number(event.target.value) })
                }
                className="rounded-xl border-white/10 bg-black/20"
              />
            </Field>
          </div>

          <Field label="Descrição">
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
              rows={4}
              className="w-full rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white outline-none"
            />
          </Field>

          <div>
            <Label className="font-black text-white">Roles necessárias</Label>
            <div className="mt-3 flex flex-wrap gap-2">
              {ROLE_KEYS.map((role) => {
                const active = (form.requiredRoleKeys || []).includes(role);

                return (
                  <button
                    type="button"
                    key={role}
                    onClick={() => toggleRole(role)}
                    className={`rounded-full border px-3 py-2 text-xs font-black ${
                      active
                        ? "border-primary/40 bg-primary/15 text-primary"
                        : "border-white/10 bg-white/[.03] text-muted-foreground"
                    }`}
                  >
                    {role}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Toggle
              label="Ativo"
              checked={form.active !== false}
              onChange={(active) => setForm({ ...form, active })}
            />
            <Toggle
              label="Comprável"
              checked={form.purchasable !== false}
              onChange={(purchasable) => setForm({ ...form, purchasable })}
            />
            <Toggle
              label="Destaque"
              checked={form.featured === true}
              onChange={(featured) => setForm({ ...form, featured })}
            />
            <Toggle
              label="Limitado"
              checked={form.limited === true}
              onChange={(limited) => setForm({ ...form, limited })}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button disabled={busy} className="rounded-xl">
              {busy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {editingId ? "Guardar alterações" : "Adicionar produto"}
            </Button>

            {editingId && (
              <Button
                type="button"
                variant="outline"
                onClick={reset}
                className="rounded-xl border-white/10"
              >
                <X className="mr-2 h-4 w-4" />
                Cancelar edição
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/30">
            <div className="aspect-video bg-black/40">
              {form.image ? (
                <img
                  src={form.image}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <ImagePlus className="h-12 w-12" />
                </div>
              )}
            </div>

            <div className="space-y-3 p-4">
              <Label className="font-black text-white">Imagem</Label>

              <Input
                value={form.image || ""}
                onChange={(event) => setForm({ ...form, image: event.target.value })}
                placeholder="/Store/catalog/produto.png ou URL"
                className="rounded-xl border-white/10 bg-black/20"
              />

              <label className="flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-dashed border-primary/30 bg-primary/10 px-4 text-sm font-black text-primary">
                <ImagePlus className="mr-2 h-4 w-4" />
                Carregar imagem
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={uploadImage}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      </form>

      <div className="mt-6">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Pesquisar produto..."
              className="rounded-xl border-white/10 bg-black/20 pl-11"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value as
                  | "ALL"
                  | "ACTIVE"
                  | "HIDDEN"
                  | "SOLD_OUT",
              )
            }
            className="h-10 rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white"
          >
            <option value="ALL">Todos os produtos</option>
            <option value="ACTIVE">Ativos</option>
            <option value="HIDDEN">Ocultos</option>
            <option value="SOLD_OUT">Esgotados</option>
          </select>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => (
            <article
              key={item.id}
              className="overflow-hidden rounded-2xl border border-white/10 bg-black/20"
            >
              <div className="aspect-[16/7] bg-black/30">
                {item.image ? (
                  <>
                    <img
                      src={item.image}
                      alt={item.name}
                      loading="lazy"
                      className="h-full w-full object-contain p-4"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";

                        const fallback =
                          event.currentTarget.nextElementSibling as HTMLElement | null;

                        if (fallback) {
                          fallback.style.display = "flex";
                        }
                      }}
                    />

                    <div
                      style={{ display: "none" }}
                      className="h-full items-center justify-center text-muted-foreground"
                    >
                      <PackagePlus className="h-8 w-8" />
                    </div>
                  </>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    <PackagePlus className="h-8 w-8" />
                  </div>
                )}
              </div>

              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-white">{item.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.category} · {item.price} créditos
                    </p>

                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <Boxes className="h-3.5 w-3.5" />
                      {item.stock === null ||
                      item.stock === undefined
                        ? "Stock ilimitado"
                        : `${item.stock} em stock · ${item.soldCount || 0} vendidos`}
                    </p>
                  </div>

                  <span
                    className={`rounded-full border px-2 py-1 text-[10px] font-black ${
                      item.active === false
                        ? "border-red-400/30 bg-red-500/10 text-red-300"
                        : "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
                    }`}
                  >
                    {item.active === false
                      ? "OCULTO"
                      : item.stock !== null &&
                          item.stock !== undefined &&
                          item.stock <= 0
                        ? "ESGOTADO"
                        : "ATIVO"}
                  </span>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => edit(item)}
                    className="flex-1 rounded-xl border-white/10"
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </Button>

                  {item.active !== false ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void disable(item)}
                      disabled={busy}
                      title="Ocultar produto"
                      className="rounded-xl border-red-400/20 text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void restore(item)}
                      disabled={busy}
                      title="Reativar produto"
                      className="rounded-xl border-emerald-400/20 text-emerald-300"
                    >
                      <ArchiveRestore className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="font-black text-white">{label}</Label>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3">
      <span className="text-sm font-bold text-white">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}
