import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Bell,
  ChevronDown,
  ChevronUp,
  Clock,
  Database,
  Eye,
  KeyRound,
  Loader2,
  Lock,
  Plus,
  Radio,
  RotateCcw,
  Save,
  Server,
  Settings,
  Shield,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import StoreCatalogSettings from "@/components/settings/StoreCatalogSettings";
import StoreAdminSettings from "@/components/settings/StoreAdminSettings";

type GeneralSettings = {
  excessoHoras: boolean;
  novosDocumentos: boolean;
  resumoDiario: boolean;
  alertasPatrulhas: boolean;
  auditoriaAcessos: boolean;
  mfaObrigatoria: boolean;
  bloquearSessaoInativa: boolean;
  modoManutencao: boolean;
  timeoutMinutos: number;
  limiteHorasSemanais: number;
  horaResumo: string;
};

type ModulePermissions = {
  view: boolean;
  manage: boolean;
  delete: boolean;
};

type ModuleSetting = {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  viewRoleIds: string[];
  manageRoleIds: string[];
  deleteRoleIds: string[];
  permissions?: ModulePermissions;
};

type SettingsResponse = {
  general: GeneralSettings;
  modules: ModuleSetting[];
  canManageSettings: boolean;
  updatedAt?: string | null;
  updatedByName?: string | null;
};

type RoleField = "viewRoleIds" | "manageRoleIds" | "deleteRoleIds";

const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") ||
  (import.meta.env.DEV ? "http://localhost:3000" : "");

const COMMAND_GENERAL_ROLE_ID = "1147878942099906672";

const DEFAULT_GENERAL: GeneralSettings = {
  excessoHoras: true,
  novosDocumentos: true,
  resumoDiario: false,
  alertasPatrulhas: true,
  auditoriaAcessos: true,
  mfaObrigatoria: true,
  bloquearSessaoInativa: true,
  modoManutencao: false,
  timeoutMinutos: 15,
  limiteHorasSemanais: 40,
  horaResumo: "00:00",
};

async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(options?.body ? { "Content-Type": "application/json" } : {}),
      ...(options?.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || `O pedido falhou com o código ${response.status}.`);
  }

  return data as T;
}

function normalizeRoleId(value: string) {
  return value.replace(/\D/g, "").trim();
}

function uniqueRoleIds(value: string[]) {
  return [...new Set(value.map(normalizeRoleId).filter(Boolean))];
}

export default function Definicoes() {
  const { toast } = useToast();

  const [general, setGeneral] = useState<GeneralSettings>(DEFAULT_GENERAL);
  const [modules, setModules] = useState<ModuleSetting[]>([]);
  const [originalGeneral, setOriginalGeneral] =
    useState<GeneralSettings>(DEFAULT_GENERAL);
  const [originalModules, setOriginalModules] = useState<ModuleSetting[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [updatedByName, setUpdatedByName] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await apiRequest<SettingsResponse>("/api/settings");
      const nextGeneral = { ...DEFAULT_GENERAL, ...data.general };
      const nextModules = (data.modules || []).map((module) => ({
        ...module,
        viewRoleIds: uniqueRoleIds(module.viewRoleIds || []),
        manageRoleIds: uniqueRoleIds(module.manageRoleIds || []),
        deleteRoleIds: uniqueRoleIds(module.deleteRoleIds || []),
      }));

      setGeneral(nextGeneral);
      setModules(nextModules);
      setOriginalGeneral(nextGeneral);
      setOriginalModules(nextModules);
      setCanManage(data.canManageSettings === true);
      setUpdatedAt(data.updatedAt || null);
      setUpdatedByName(data.updatedByName || null);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Não foi possível carregar as definições.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadSettings();
  }, []);

  const enabledModules = useMemo(
    () => modules.filter((module) => module.enabled).length,
    [modules],
  );

  const restrictedModules = useMemo(
    () => modules.filter((module) => module.viewRoleIds.length > 0).length,
    [modules],
  );

  const activeAlerts = useMemo(
    () =>
      [
        general.excessoHoras,
        general.novosDocumentos,
        general.resumoDiario,
        general.alertasPatrulhas,
      ].filter(Boolean).length,
    [general],
  );

  const hasChanges = useMemo(() => {
    const stripPermissions = (items: ModuleSetting[]) =>
      items.map(({ permissions: _permissions, ...item }) => item);

    return (
      JSON.stringify(general) !== JSON.stringify(originalGeneral) ||
      JSON.stringify(stripPermissions(modules)) !==
        JSON.stringify(stripPermissions(originalModules))
    );
  }, [general, modules, originalGeneral, originalModules]);

  const updateGeneral = <K extends keyof GeneralSettings>(
    key: K,
    value: GeneralSettings[K],
  ) => {
    if (!canManage) return;
    setGeneral((current) => ({ ...current, [key]: value }));
  };

  const updateModule = (
    moduleKey: string,
    updater: (module: ModuleSetting) => ModuleSetting,
  ) => {
    if (!canManage) return;
    setModules((current) =>
      current.map((module) =>
        module.key === moduleKey ? updater(module) : module,
      ),
    );
  };

  const addRole = (moduleKey: string, field: RoleField, rawRoleId: string) => {
    const roleId = normalizeRoleId(rawRoleId);
    if (!roleId) return;

    updateModule(moduleKey, (module) => ({
      ...module,
      [field]: uniqueRoleIds([...module[field], roleId]),
    }));
  };

  const removeRole = (moduleKey: string, field: RoleField, roleId: string) => {
    updateModule(moduleKey, (module) => ({
      ...module,
      [field]: module[field].filter((current) => current !== roleId),
    }));
  };

  const saveSettings = async () => {
    if (!canManage || !hasChanges) return;
    setIsSaving(true);

    try {
      const payload = {
        general,
        modules: modules.map(({ permissions: _permissions, ...module }) => ({
          ...module,
          viewRoleIds: uniqueRoleIds(module.viewRoleIds),
          manageRoleIds: uniqueRoleIds(module.manageRoleIds),
          deleteRoleIds: uniqueRoleIds(module.deleteRoleIds),
        })),
      };

      const data = await apiRequest<{
        message: string;
        general: GeneralSettings;
        modules: ModuleSetting[];
        updatedAt?: string;
        updatedByName?: string | null;
      }>("/api/settings", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      const nextModules = data.modules.map((module) => ({
        ...module,
        viewRoleIds: uniqueRoleIds(module.viewRoleIds || []),
        manageRoleIds: uniqueRoleIds(module.manageRoleIds || []),
        deleteRoleIds: uniqueRoleIds(module.deleteRoleIds || []),
      }));

      setGeneral(data.general);
      setModules(nextModules);
      setOriginalGeneral(data.general);
      setOriginalModules(nextModules);
      setUpdatedAt(data.updatedAt || new Date().toISOString());
      setUpdatedByName(data.updatedByName || null);

      toast({
        title: "Definições atualizadas",
        description: data.message || "As permissões foram guardadas.",
      });
    } catch (saveError) {
      toast({
        title: "Erro ao guardar definições",
        description:
          saveError instanceof Error
            ? saveError.message
            : "Não foi possível guardar as alterações.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const resetChanges = () => {
    setGeneral(originalGeneral);
    setModules(originalModules);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[520px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 font-black text-white">A carregar definições...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl rounded-3xl border border-red-400/20 bg-red-500/[0.06] p-7">
        <div className="flex items-start gap-4">
          <AlertTriangle className="h-6 w-6 shrink-0 text-red-300" />
          <div>
            <h2 className="text-lg font-black text-white">
              Não foi possível carregar as definições
            </h2>
            <p className="mt-2 text-sm text-red-100/60">{error}</p>
            <Button
              onClick={() => void loadSettings()}
              variant="outline"
              className="mt-5 rounded-xl border-red-400/20"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Tentar novamente
            </Button>
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
      className="portal-v7-settings mx-auto max-w-7xl space-y-8"
    >
      <section className="relative overflow-hidden rounded-[2.25rem] border border-white/10 bg-[#050b09]/80 p-8 shadow-[0_28px_120px_rgba(0,0,0,0.42)] backdrop-blur-xl">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-primary/10 blur-[110px]" />
        <div className="absolute -bottom-28 left-1/3 h-80 w-80 rounded-full bg-emerald-500/10 blur-[120px]" />

        <div className="relative flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                <Settings className="h-3.5 w-3.5" />
                Configuração da Central
              </span>
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] ${
                  canManage
                    ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
                    : "border-white/10 bg-white/[0.04] text-white/40"
                }`}
              >
                {canManage ? (
                  <ShieldCheck className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
                {canManage ? "Comando-Geral" : "Só consulta"}
              </span>
            </div>

            <h1 className="text-4xl font-black tracking-tight text-white md:text-5xl">
              Definições e Acessos
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">
              Controla as categorias disponíveis e as roles que podem ver,
              gerir ou apagar informação em cada módulo.
            </p>
            {(updatedAt || updatedByName) && (
              <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-white/25">
                Última alteração: {updatedAt ? new Date(updatedAt).toLocaleString("pt-PT") : "—"}
                {updatedByName ? ` · ${updatedByName}` : ""}
              </p>
            )}
          </div>

          <div className="grid w-full grid-cols-2 gap-3 xl:w-[500px]">
            <Metric label="Módulos ativos" value={`${enabledModules}/${modules.length}`} icon={<Server className="h-4 w-4" />} />
            <Metric label="Módulos restritos" value={restrictedModules} icon={<Lock className="h-4 w-4" />} />
          </div>
        </div>
      </section>

      <Card className="glass overflow-hidden rounded-3xl border-white/10">
        <CardHeader className="border-b border-white/10 bg-white/[0.025]">
          <CardTitle className="flex items-center gap-3 text-xl font-black text-white">
            <Users className="h-5 w-5 text-primary" />
            Acessos por categoria
          </CardTitle>
          <CardDescription>
            Uma lista de visualização vazia significa acesso para todos os
            utilizadores autenticados.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 p-6">
          {modules.map((module) => (
            <ModuleCard
              key={module.key}
              module={module}
              expanded={expanded === module.key}
              canManage={canManage}
              onToggle={() =>
                setExpanded((current) =>
                  current === module.key ? null : module.key,
                )
              }
              onEnabledChange={(enabled) =>
                updateModule(module.key, (current) => ({ ...current, enabled }))
              }
              onAddRole={(field, roleId) => addRole(module.key, field, roleId)}
              onRemoveRole={(field, roleId) =>
                removeRole(module.key, field, roleId)
              }
            />
          ))}
        </CardContent>
      </Card>

      {canManage && (
        <div className="space-y-8">
          <StoreAdminSettings />
          <StoreCatalogSettings />
        </div>
      )}

      <section className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        <Card className="glass rounded-3xl border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-white">
              <Bell className="h-5 w-5 text-primary" />
              Alertas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ToggleRow label="Excesso de horas" checked={general.excessoHoras} disabled={!canManage} onChange={(value) => updateGeneral("excessoHoras", value)} />
            <ToggleRow label="Novos documentos" checked={general.novosDocumentos} disabled={!canManage} onChange={(value) => updateGeneral("novosDocumentos", value)} />
            <ToggleRow label="Resumo diário" checked={general.resumoDiario} disabled={!canManage} onChange={(value) => updateGeneral("resumoDiario", value)} />
            <ToggleRow label="Alertas de patrulhas" checked={general.alertasPatrulhas} disabled={!canManage} onChange={(value) => updateGeneral("alertasPatrulhas", value)} />

            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
              <Label className="font-black text-white">Hora do resumo</Label>
              <Input
                type="time"
                value={general.horaResumo}
                disabled={!canManage}
                onChange={(event) => updateGeneral("horaResumo", event.target.value)}
                className="mt-3 max-w-[170px] rounded-xl border-white/10 bg-black/20"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="glass rounded-3xl border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-white">
              <Shield className="h-5 w-5 text-primary" />
              Segurança
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ToggleRow label="Auditoria de acessos" checked={general.auditoriaAcessos} disabled={!canManage} onChange={(value) => updateGeneral("auditoriaAcessos", value)} />
            <ToggleRow label="MFA obrigatória" checked={general.mfaObrigatoria} disabled />
            <ToggleRow label="Bloqueio por inatividade" checked={general.bloquearSessaoInativa} disabled={!canManage} onChange={(value) => updateGeneral("bloquearSessaoInativa", value)} />
            <ToggleRow label="Modo de manutenção" checked={general.modoManutencao} disabled={!canManage} danger onChange={(value) => updateGeneral("modoManutencao", value)} />

            <div className="grid grid-cols-2 gap-4">
              <NumberField label="Timeout" value={general.timeoutMinutos} suffix="min" disabled={!canManage} onChange={(value) => updateGeneral("timeoutMinutos", value)} />
              <NumberField label="Limite semanal" value={general.limiteHorasSemanais} suffix="h" disabled={!canManage} onChange={(value) => updateGeneral("limiteHorasSemanais", value)} />
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="sticky bottom-4 z-20 rounded-3xl border border-white/10 bg-[#050b09]/95 p-4 shadow-[0_24px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-white">
              {hasChanges ? "Alterações por guardar" : "Tudo sincronizado"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {canManage
                ? "As alterações são guardadas no MongoDB."
                : "Apenas o Comando-Geral pode alterar as definições."}
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={resetChanges}
              disabled={!canManage || !hasChanges || isSaving}
              className="rounded-xl border-white/10"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Descartar
            </Button>
            <Button
              onClick={() => void saveSettings()}
              disabled={!canManage || !hasChanges || isSaving}
              className="rounded-xl bg-primary px-6 font-black uppercase tracking-[0.12em] text-primary-foreground"
            >
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Guardar
            </Button>
          </div>
        </div>
      </section>
    </motion.div>
  );
}

function ModuleCard({
  module,
  expanded,
  canManage,
  onToggle,
  onEnabledChange,
  onAddRole,
  onRemoveRole,
}: {
  module: ModuleSetting;
  expanded: boolean;
  canManage: boolean;
  onToggle: () => void;
  onEnabledChange: (value: boolean) => void;
  onAddRole: (field: RoleField, roleId: string) => void;
  onRemoveRole: (field: RoleField, roleId: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">
      <div className="flex flex-col gap-4 p-4 md:flex-row md:items-center">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-black text-white">{module.label}</p>
            <span className={`rounded-full border px-2.5 py-1 text-[8px] font-black uppercase ${module.enabled ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300" : "border-red-400/20 bg-red-500/10 text-red-300"}`}>
              {module.enabled ? "Ativo" : "Desativado"}
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[8px] font-black uppercase text-white/40">
              {module.viewRoleIds.length ? "Restrito" : "Todos"}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{module.description}</p>
          <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.12em] text-white/25">
            Ver {module.viewRoleIds.length} · Gerir {module.manageRoleIds.length} · Apagar {module.deleteRoleIds.length}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Switch checked={module.enabled} disabled={!canManage} onCheckedChange={onEnabledChange} />
          <button type="button" onClick={onToggle} className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 px-4 text-[9px] font-black uppercase text-white/45">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            Permissões
          </button>
        </div>
      </div>

      {expanded && (
        <div className="grid grid-cols-1 gap-4 border-t border-white/10 p-4 xl:grid-cols-3">
          <RoleEditor title="Pode visualizar" description="Vazio = todos os autenticados" roleIds={module.viewRoleIds} canManage={canManage} onAdd={(roleId) => onAddRole("viewRoleIds", roleId)} onRemove={(roleId) => onRemoveRole("viewRoleIds", roleId)} />
          <RoleEditor title="Pode gerir" description="Criar e editar" roleIds={module.manageRoleIds} canManage={canManage} onAdd={(roleId) => onAddRole("manageRoleIds", roleId)} onRemove={(roleId) => onRemoveRole("manageRoleIds", roleId)} />
          <RoleEditor title="Pode apagar" description="Eliminar definitivamente" roleIds={module.deleteRoleIds} canManage={canManage} onAdd={(roleId) => onAddRole("deleteRoleIds", roleId)} onRemove={(roleId) => onRemoveRole("deleteRoleIds", roleId)} />
        </div>
      )}
    </div>
  );
}

function RoleEditor({
  title,
  description,
  roleIds,
  canManage,
  onAdd,
  onRemove,
}: {
  title: string;
  description: string;
  roleIds: string[];
  canManage: boolean;
  onAdd: (roleId: string) => void;
  onRemove: (roleId: string) => void;
}) {
  const [value, setValue] = useState("");

  const submit = () => {
    const roleId = normalizeRoleId(value);
    if (!roleId) return;
    onAdd(roleId);
    setValue("");
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="font-black text-white">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>

      <div className="mt-4 space-y-2">
        {roleIds.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 p-3 text-center text-xs text-white/30">Nenhuma role</div>
        ) : (
          roleIds.map((roleId) => (
            <div key={roleId} className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] p-2">
              <span className="min-w-0 flex-1 truncate font-mono text-xs text-white/60">{roleId}</span>
              {roleId === COMMAND_GENERAL_ROLE_ID && (
                <span className="rounded-md border border-primary/20 bg-primary/10 px-2 py-1 text-[8px] font-black uppercase text-primary">Comando</span>
              )}
              {canManage && (
                <button type="button" onClick={() => onRemove(roleId)} className="flex h-8 w-8 items-center justify-center rounded-lg text-white/25 hover:bg-red-500/10 hover:text-red-300">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {canManage && (
        <div className="mt-4 flex gap-2">
          <Input
            value={value}
            onChange={(event) => setValue(event.target.value.replace(/\D/g, ""))}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                submit();
              }
            }}
            placeholder="ID da role Discord"
            className="h-10 rounded-xl border-white/10 bg-black/20 font-mono text-xs"
          />
          <Button type="button" variant="outline" onClick={submit} disabled={!normalizeRoleId(value)} className="h-10 rounded-xl border-white/10">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  disabled,
  danger,
  onChange = () => {},
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  danger?: boolean;
  onChange?: (value: boolean) => void;
}) {
  return (
    <div className={`flex items-center justify-between rounded-2xl border p-4 ${danger ? "border-red-500/20 bg-red-500/10" : "border-white/10 bg-white/[0.025]"}`}>
      <Label className="font-black text-white">{label}</Label>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </div>
  );
}

function NumberField({
  label,
  value,
  suffix,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  suffix: string;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
      <Label className="font-black text-white">{label}</Label>
      <div className="mt-3 flex items-center gap-2">
        <Input type="number" value={value} disabled={disabled} onChange={(event) => onChange(Number(event.target.value))} className="rounded-xl border-white/10 bg-black/20" />
        <span className="text-xs font-black text-white/35">{suffix}</span>
      </div>
    </div>
  );
}

function Metric({ label, value, icon }: { label: string; value: string | number; icon: ReactNode }) {
  return (
    <div className="rounded-3xl border border-primary/20 bg-primary/10 p-4 text-primary">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-[0.15em]">{label}</p>
        {icon}
      </div>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
    </div>
  );
}
