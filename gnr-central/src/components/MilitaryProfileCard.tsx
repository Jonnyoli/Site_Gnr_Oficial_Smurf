import { useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import {
  Shield,
  Award,
  MapPin,
  Hash,
  UserCheck,
  Tags,
  Wifi,
  WifiOff,
  BadgeCheck,
} from "lucide-react";
import { motion } from "framer-motion";

type DiscordTag = {
  id: string;
  name: string;
  color?: string | null;
};

type GuardaProfile = {
  id?: string;
  discordId?: string;
  nome?: string;
  name?: string;
  numero?: string;
  posto?: string;
  rank?: string;
  unidade?: string;
  estado?: string;
  avatar?: string | null;
  discordStatus?: string;
  isDiscordOnline?: boolean;
  isOnDuty?: boolean;
  roles?: any[];
  discordRoles?: any[];
  discordTags?: DiscordTag[];
  rolesSource?: string;
  hierarchyGroupLabel?: string;
};

function normalizeRoleId(value: any): string | null {
  if (!value) return null;

  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);

  if (typeof value === "object") {
    if (value.id) return String(value.id);
    if (value.roleId) return String(value.roleId);
    if (value._id) return String(value._id);
  }

  return null;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function getAvatarFromAuthUser(user: any) {
  if (!user?.id || !user?.avatar) return null;

  const extension = String(user.avatar).startsWith("a_") ? "gif" : "png";

  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${extension}`;
}

function getAvatar(profile?: GuardaProfile | null, user?: any) {
  if (profile?.avatar) return profile.avatar;

  return getAvatarFromAuthUser(user);
}

function getRoleTags(profile?: GuardaProfile | null, user?: any): DiscordTag[] {
  if (!profile && !user) return [];

  const namedTags = Array.isArray(profile?.discordTags)
    ? profile!.discordTags!
        .filter((tag) => tag && tag.id && tag.name)
        .filter((tag) => tag.name !== "@everyone")
    : [];

  if (namedTags.length > 0) {
    return namedTags;
  }

  const rawRoleIds = [
    ...(Array.isArray(profile?.roles) ? profile!.roles! : []),
    ...(Array.isArray(profile?.discordRoles) ? profile!.discordRoles! : []),
    ...(Array.isArray(user?.roles) ? user.roles : []),
  ];

  const ids = rawRoleIds
    .map(normalizeRoleId)
    .filter((id): id is string => Boolean(id));

  return [...new Set(ids)].map((id) => ({
    id,
    name: `ROLE_${id.slice(-4)}`,
    color: null,
  }));
}

function getDiscordLabel(profile?: GuardaProfile | null) {
  if (profile?.discordStatus === "online" || profile?.isDiscordOnline) {
    return "Online";
  }

  if (profile?.discordStatus === "idle") {
    return "Ausente";
  }

  if (profile?.discordStatus === "dnd") {
    return "Ocupado";
  }

  return "Offline";
}

function getServiceLabel(profile?: GuardaProfile | null) {
  if (profile?.isOnDuty || profile?.estado === "Em serviço") {
    return "Em serviço";
  }

  if (profile?.estado) {
    return profile.estado;
  }

  return "Fora de serviço";
}

function RolePill({ role }: { role: DiscordTag }) {
  const color = role.color || "#10b981";

  return (
    <span
      title={`${role.name} · ${role.id}`}
      className="flex max-w-[190px] items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.12em]"
      style={{
        borderColor: `${color}55`,
        backgroundColor: `${color}14`,
        color,
      }}
    >
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{
          backgroundColor: color,
          boxShadow: `0 0 10px ${color}`,
        }}
      />

      <span className="truncate">{role.name}</span>
    </span>
  );
}

export default function MilitaryProfileCard() {
  const { user } = useAuth();
  const { guardas } = useData();

  const profile = useMemo<GuardaProfile | null>(() => {
    if (!user) return null;

    const list = (guardas || []) as GuardaProfile[];

    const possibleIds = [
      user.id,
      user.discordId,
      user.userId,
      user.user?.id,
      user.user?.discordId,
    ]
      .filter(Boolean)
      .map(String);

    const found = list.find((guarda) =>
      possibleIds.includes(String(guarda.discordId || guarda.id || ""))
    );

    return found || null;
  }, [user, guardas]);

  const roles = useMemo(() => getRoleTags(profile, user), [profile, user]);

  if (!user) return null;

  const displayName =
    profile?.nome ||
    profile?.name ||
    user.displayName ||
    user.username ||
    "Operacional";

  const rank =
    profile?.posto ||
    profile?.rank ||
    user.rank ||
    "Operacional";

  const numero =
    profile?.numero ||
    user.numero ||
    user.callsignNumber ||
    "N/A";

  const unidade =
    profile?.unidade ||
    user.unidade ||
    "Comando Territorial";

  const escalao =
    profile?.hierarchyGroupLabel ||
    rank ||
    "Operacional";

  const avatar = getAvatar(profile, user);
  const initials = getInitials(displayName);
  const discordLabel = getDiscordLabel(profile);
  const serviceLabel = getServiceLabel(profile);

  const isDiscordOnline =
    profile?.discordStatus === "online" || profile?.isDiscordOnline;

  const isOnDuty =
    profile?.isOnDuty || profile?.estado === "Em serviço";

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="glass relative overflow-hidden rounded-2xl border border-white/10 border-l-4 border-l-primary p-6 shadow-[0_20px_70px_rgba(0,0,0,0.25)]"
    >
      <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-primary/10 blur-[90px]" />

      <div className="absolute right-0 top-0 p-4 opacity-10 transition-opacity group-hover:opacity-20">
        <Shield className="h-24 w-24 text-primary" />
      </div>

      <div className="relative z-10 flex flex-col gap-6">
        <div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
          <div className="relative shrink-0">
            <div className="h-24 w-24 overflow-hidden rounded-2xl border-2 border-primary/30 bg-background/50 p-1 shadow-[0_0_35px_rgba(16,185,129,0.18)]">
              {avatar ? (
                <img
                  src={avatar}
                  alt={displayName}
                  className="h-full w-full rounded-xl object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-xl bg-primary/10">
                  {initials ? (
                    <span className="text-2xl font-black text-primary">
                      {initials}
                    </span>
                  ) : (
                    <UserCheck className="h-10 w-10 text-primary" />
                  )}
                </div>
              )}
            </div>

            <div
              className={`absolute -bottom-2 -right-2 rounded-md border border-black px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] ${
                isDiscordOnline
                  ? "bg-primary text-black"
                  : "bg-slate-700 text-slate-300"
              }`}
            >
              {discordLabel}
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-3 text-center md:text-left">
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <h2 className="truncate text-2xl font-black tracking-tight text-white">
                {numero !== "N/A" ? `${numero} | ` : ""}
                {displayName}
              </h2>

              <div className="mx-auto flex w-fit items-center gap-1 rounded-lg border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-primary md:mx-0">
                <BadgeCheck className="h-3 w-3" />
                {rank}
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-2 md:justify-start">
              <div
                className={`rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-[0.14em] ${
                  isOnDuty
                    ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                    : "border-yellow-400/20 bg-yellow-400/10 text-yellow-300"
                }`}
              >
                {serviceLabel}
              </div>

              <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.035] px-3 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
                {isDiscordOnline ? (
                  <Wifi className="h-3 w-3 text-emerald-400" />
                ) : (
                  <WifiOff className="h-3 w-3 text-slate-500" />
                )}
                Discord {discordLabel}
              </div>

              <div className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
                {profile?.rolesSource === "discord_live"
                  ? "Discord Live"
                  : profile
                    ? "Cache"
                    : "Auth"}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 md:grid-cols-4">
              <div className="space-y-1">
                <p className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground md:justify-start">
                  <Hash className="h-3 w-3" />
                  ID Militar
                </p>
                <p className="truncate text-sm font-mono text-white">
                  {profile?.discordId || user.id
                    ? `GNR-${String(profile?.discordId || user.id).slice(-6)}`
                    : "N/A"}
                </p>
              </div>

              <div className="space-y-1">
                <p className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground md:justify-start">
                  <MapPin className="h-3 w-3" />
                  Unidade
                </p>
                <p className="truncate text-sm text-white">{unidade}</p>
              </div>

              <div className="space-y-1">
                <p className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground md:justify-start">
                  <Shield className="h-3 w-3" />
                  Escalão
                </p>
                <p className="truncate text-sm text-white">{escalao}</p>
              </div>

              <div className="space-y-1">
                <p className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground md:justify-start">
                  <Award className="h-3 w-3" />
                  Mérito
                </p>
                <p className="text-sm font-bold text-primary">Nível A+</p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary">
              <Tags className="h-4 w-4" />
              Roles Discord
            </div>

            <div className="rounded-lg border border-white/10 bg-white/[0.035] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
              {roles.length} roles
            </div>
          </div>

          {roles.length > 0 ? (
            <div className="flex max-h-20 flex-wrap gap-2 overflow-y-auto pr-1">
              {roles.slice(0, 12).map((role) => (
                <RolePill key={role.id} role={role} />
              ))}

              {roles.length > 12 && (
                <span className="rounded-lg border border-white/10 bg-white/[0.035] px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
                  +{roles.length - 12} roles
                </span>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
              Nenhuma role recebida do Discord.
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}