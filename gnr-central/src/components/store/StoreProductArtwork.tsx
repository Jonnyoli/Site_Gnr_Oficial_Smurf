import { useMemo, useState } from "react";
import {
  Crown,
  FileSearch,
  GraduationCap,
  Image as ImageIcon,
  Landmark,
  Medal,
  Paintbrush,
  Plane,
  Radar,
  Shield,
  Sparkles,
  Tag,
  Target,
  Package,
} from "lucide-react";

type StoreArtworkItem = {
  id: string;
  name: string;
  description?: string;
  category?: string;
  collection?: string;
  rarity?: string;
  image?: string;
  tags?: string[];
};

type StoreArtworkProps = {
  item: StoreArtworkItem;
  className?: string;
  compact?: boolean;
  showMiniLabel?: boolean;
};

type UnitVisual = {
  key: string;
  short: string;
  icon: any;
  gradient: string;
  ring: string;
  badge: string;
  accent: string;
};

const UNIT_VISUALS: UnitVisual[] = [
  {
    key: "COMANDO",
    short: "COMANDO",
    icon: Crown,
    gradient: "from-yellow-500/35 via-amber-950/55 to-black",
    ring: "border-yellow-400/25",
    badge: "bg-yellow-500/15 text-yellow-300 border-yellow-400/25",
    accent: "bg-yellow-400/20",
  },
  {
    key: "NIC",
    short: "NIC",
    icon: FileSearch,
    gradient: "from-blue-500/30 via-slate-950/60 to-black",
    ring: "border-blue-400/25",
    badge: "bg-blue-500/15 text-blue-300 border-blue-400/25",
    accent: "bg-blue-400/20",
  },
  {
    key: "GIOE",
    short: "GIOE",
    icon: Target,
    gradient: "from-red-500/30 via-rose-950/60 to-black",
    ring: "border-red-400/25",
    badge: "bg-red-500/15 text-red-300 border-red-400/25",
    accent: "bg-red-400/20",
  },
  {
    key: "GSA",
    short: "GSA",
    icon: Plane,
    gradient: "from-sky-500/30 via-cyan-950/60 to-black",
    ring: "border-sky-400/25",
    badge: "bg-sky-500/15 text-sky-300 border-sky-400/25",
    accent: "bg-sky-400/20",
  },
  {
    key: "UNT",
    short: "UNT",
    icon: Radar,
    gradient: "from-cyan-500/30 via-slate-950/60 to-black",
    ring: "border-cyan-400/25",
    badge: "bg-cyan-500/15 text-cyan-300 border-cyan-400/25",
    accent: "bg-cyan-400/20",
  },
  {
    key: "USHE",
    short: "USHE",
    icon: Landmark,
    gradient: "from-yellow-400/30 via-emerald-950/60 to-black",
    ring: "border-yellow-300/25",
    badge: "bg-yellow-400/15 text-yellow-200 border-yellow-300/25",
    accent: "bg-yellow-300/20",
  },
  {
    key: "ESCOLA",
    short: "ESCOLA",
    icon: GraduationCap,
    gradient: "from-orange-500/30 via-green-950/60 to-black",
    ring: "border-orange-400/25",
    badge: "bg-orange-500/15 text-orange-300 border-orange-400/25",
    accent: "bg-orange-400/20",
  },
  {
    key: "GNR",
    short: "GNR",
    icon: Shield,
    gradient: "from-emerald-500/28 via-green-950/60 to-black",
    ring: "border-emerald-400/25",
    badge: "bg-emerald-500/15 text-emerald-300 border-emerald-400/25",
    accent: "bg-emerald-400/20",
  },
];

function inferUnit(item: StoreArtworkItem) {
  const text = [
    item.id,
    item.name,
    item.description,
    item.collection,
    ...(Array.isArray(item.tags) ? item.tags : []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (text.includes("comando")) return "COMANDO";
  if (text.includes("nic") || text.includes("investiga")) return "NIC";
  if (text.includes("gioe") || text.includes("especial")) return "GIOE";
  if (text.includes("gsa") || text.includes("aéreo") || text.includes("aereo") || text.includes("hangar")) return "GSA";
  if (text.includes("unt") || text.includes("trânsito") || text.includes("transito") || text.includes("estrada") || text.includes("autoestrada")) return "UNT";
  if (text.includes("ushe") || text.includes("honra") || text.includes("cerim") || text.includes("protocolo")) return "USHE";
  if (text.includes("escola") || text.includes("formaç") || text.includes("academ")) return "ESCOLA";
  return "GNR";
}

function categoryIcon(category?: string) {
  const value = String(category || "").toUpperCase();
  if (value === "MOLDURAS") return Shield;
  if (value === "EMBLEMAS") return Medal;
  if (value === "FUNDOS") return ImageIcon;
  if (value === "TITULOS") return Tag;
  if (value === "TEMAS") return Paintbrush;
  if (value === "SOCIAL") return Sparkles;
  if (value === "EXCLUSIVOS") return Crown;
  return Package;
}

function rarityTone(rarity?: string) {
  const value = String(rarity || "COMUM").toUpperCase();
  if (value === "LENDARIO") return "shadow-[0_0_55px_rgba(250,204,21,.10)]";
  if (value === "EPICO") return "shadow-[0_0_55px_rgba(168,85,247,.10)]";
  if (value === "RARO") return "shadow-[0_0_55px_rgba(59,130,246,.10)]";
  if (value === "EXCLUSIVO") return "shadow-[0_0_55px_rgba(248,113,113,.10)]";
  return "shadow-[0_0_55px_rgba(16,185,129,.08)]";
}

export default function StoreProductArtwork({
  item,
  className = "",
  compact = false,
  showMiniLabel = true,
}: StoreArtworkProps) {
  const [failed, setFailed] = useState(false);

  const unit = useMemo(() => {
    const key = inferUnit(item);
    return UNIT_VISUALS.find((entry) => entry.key === key) || UNIT_VISUALS[UNIT_VISUALS.length - 1];
  }, [item]);

  const Icon = categoryIcon(item.category);
  const UnitIcon = unit.icon;
  const title = String(item.name || "Produto");
  const categoryLabel = String(item.category || "CATÁLOGO").replace(/_/g, " ");
  const rarity = String(item.rarity || "COMUM").replace(/_/g, " ");

  if (item.image && !failed) {
    return (
      <div className={`relative h-full w-full overflow-hidden ${className}`}>
        <img
          src={item.image}
          alt={title}
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  return (
    <div className={`relative h-full w-full overflow-hidden bg-gradient-to-br ${unit.gradient} ${rarityTone(item.rarity)} ${className}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,.08),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,.04),transparent_25%)]" />
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full border border-white/10" />
      <div className="absolute right-6 top-6 h-14 w-14 rounded-full border border-white/10" />
      <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/55 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-10 bg-[radial-gradient(70%_180%_at_50%_100%,rgba(0,0,0,.85),transparent)]" />

      <div className="relative flex h-full flex-col justify-between p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {showMiniLabel && (
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/35 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.18em] text-white/70 backdrop-blur-md">
                <span className={"h-1.5 w-1.5 rounded-full " + unit.accent} />
                GNR Central
              </div>
            )}

            {!compact && (
              <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[8px] font-black uppercase tracking-[0.14em] ${unit.badge}`}>
                <UnitIcon className="h-3 w-3" />
                {unit.short}
              </div>
            )}
          </div>

          <div className="flex h-14 w-14 items-center justify-center rounded-[1.2rem] border border-white/10 bg-black/35 text-white shadow-[0_0_30px_rgba(0,0,0,.25)] backdrop-blur-md">
            <Icon className={compact ? "h-6 w-6" : "h-7 w-7"} />
          </div>
        </div>

        <div className="min-w-0">
          {!compact && (
            <>
              <p className="line-clamp-1 text-xl font-black text-white drop-shadow-[0_2px_10px_rgba(0,0,0,.35)]">
                {title}
              </p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/55">
                {categoryLabel} · {rarity}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
