import {
  Link,
  useLocation } from "wouter";
import {
  Home,
  LayoutDashboard,
  Command,
  Trophy,
  ShoppingBag,
  BellRing,
  Shield,
  Clock,
  MapPin,
  Route,
  ClipboardCheck,
  FileText,
  FolderOpen,
  BarChart3,
  ShieldCheck,
  Scale,
  Building2,
  Search,
  Radio,
  Crosshair,
  Landmark,
  Newspaper,
  Megaphone,
  Mail,
  MessagesSquare,
  Settings,
  Bot,
  DatabaseBackup,
  LogOut,
  ChevronRight,
  UserCircle,
  Database,
  PanelLeftClose,
  PanelLeftOpen,
  UserRound,
  WalletCards,
  Package,
  Heart,
  Medal,
  Copy,
  Check,
  CreditCard,
  SlidersHorizontal,
  CircleUserRound,
  Crown,
  ExternalLink,
  FileCheck2,
  CheckCheck,
  X,
  AlertCircle,
  FileClock,
  FileWarning,
  ShieldAlert,
  Fingerprint,
  Archive,
  Smartphone,
  Activity,
  UsersRound,
  Paintbrush,
  Star,
  GraduationCap,
  ChevronDown,
  ListFilter,
  CalendarDays,
  ClipboardPenLine,
  Award,
  Headphones,
  Presentation,
  BookOpenCheck,
  BookMarked,
  Sparkles,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  useRef,
  type FormEvent,
  type ReactNode,
} from "react";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import DigitalGridBackground from "./DigitalGridBackground";
import GlobalAudioPlayer from "./audio/GlobalAudioPlayer";
import SiteThemeProvider from "./theme/SiteThemeProvider";

interface LayoutProps {
  children: ReactNode;
}

type UnitTone = "base" | "blue" | "cyan" | "red" | "gold";

type NavItem = {
  href: string;
  label: string;
  shortLabel?: string;
  icon: any;
  restricted?: boolean;
  badge?: string;
  description?: string;
  unitTone?: UnitTone;
  moduleKey?: string;
  commandOnly?: boolean;
  approvalAccess?: boolean;
  sergeantOnly?: boolean;
  careerEvaluationsOnly?: boolean;
};

type ModulePermission = {
  key: string;
  enabled: boolean;
  viewRoleIds: string[];
  permissions?: {
    view: boolean;
    manage: boolean;
    delete: boolean;
  };
};

type SettingsAccessResponse = {
  modules: ModulePermission[];
  canManageSettings: boolean;
};

type StoreMeResponse = {
  credits?: number;
  ownedItems?: string[];
  favoriteItemIds?: string[];
};

type NavSection = {
  title: string;
  items: NavItem[];
};

type OperationalNotification = {
  _id: string;
  operationId: string;
  operationTitle: string;
  caseNumber?: string | null;
  type:
    | "REPORT_PENDING_DIRECTOR"
    | "REPORT_PENDING_COMMAND"
    | "CHANGES_REQUESTED"
    | "READY_FOR_DOCUMENT"
    | "DOCUMENT_ISSUED"
    | "INVESTIGATION_UPDATED";
  priority: "NORMAL" | "ATTENTION" | "URGENT";
  title: string;
  message: string;
  actionUrl?: string | null;
  readAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  metadata?: Record<string, unknown>;
};

type OperationalNotificationsResponse = {
  items: OperationalNotification[];
  unread: number;
};

const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";

export default function Layout({ children }: LayoutProps) {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const { guardas, storeInventory } = useData() as any;

  const [time, setTime] = useState(() => new Date());
  const [collapsed, setCollapsed] = useState(() => {
    return window.localStorage.getItem("gnr-sidebar-collapsed") === "true";
  });
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [favoriteHrefs, setFavoriteHrefs] = useState<string[]>(() => {
    try {
      const stored = window.localStorage.getItem("gnr-sidebar-favorites");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    try {
      const stored = window.localStorage.getItem("gnr-sidebar-sections");
      return stored
        ? JSON.parse(stored)
        : {
            Principal: true,
            "Escola da Guarda": false,
            Operacional: false,
            Administração: false,
            Unidades: false,
            Departamentos: false,
            Comunicação: false,
            Sistema: false,
          };
    } catch {
      return {
        Principal: true,
        "Escola da Guarda": false,
        Operacional: false,
        Administração: false,
        Unidades: false,
        Departamentos: false,
        Comunicação: false,
        Sistema: false,
      };
    }
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [modulePermissions, setModulePermissions] = useState<
    Record<string, ModulePermission>
  >({});
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const [permissionsError, setPermissionsError] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [storeSummary, setStoreSummary] =
    useState<StoreMeResponse | null>(null);
  const [copiedDiscordId, setCopiedDiscordId] = useState(false);
  const [operationalNotifications, setOperationalNotifications] = useState<
    OperationalNotification[]
  >([]);
  const [operationalUnread, setOperationalUnread] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(
    null,
  );
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const notificationsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      "gnr-sidebar-collapsed",
      String(collapsed),
    );
  }, [collapsed]);

  useEffect(() => {
    window.localStorage.setItem(
      "gnr-sidebar-favorites",
      JSON.stringify(favoriteHrefs),
    );
  }, [favoriteHrefs]);

  useEffect(() => {
    window.localStorage.setItem(
      "gnr-sidebar-sections",
      JSON.stringify(openSections),
    );
  }, [openSections]);

  useEffect(() => {
    let cancelled = false;

    async function loadModulePermissions() {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/settings`,
          {
            credentials: "include",
            headers: {
              Accept: "application/json",
            },
          },
        );

        if (!response.ok) {
          throw new Error(
            `Falha ao carregar permissões (${response.status}).`,
          );
        }

        const data =
          (await response.json()) as SettingsAccessResponse;

        if (cancelled) return;

        const permissionsMap = Object.fromEntries(
          (data.modules || []).map((module) => [
            module.key,
            module,
          ]),
        );

        setModulePermissions(permissionsMap);
        setPermissionsError(false);
      } catch (error) {
        console.error(
          "[LAYOUT] Erro ao carregar permissões:",
          error,
        );

        if (!cancelled) {
          setPermissionsError(true);
        }
      } finally {
        if (!cancelled) {
          setPermissionsLoaded(true);
        }
      }
    }

    void loadModulePermissions();

    const interval = window.setInterval(
      () => void loadModulePermissions(),
      60_000,
    );

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    setStoreSummary(
      storeInventory
        ? {
            credits:
              Number(
                storeInventory.credits ||
                0,
              ),
            ownedItems:
              Array.isArray(
                storeInventory.ownedItems,
              )
                ? storeInventory.ownedItems
                : [],
            favoriteItemIds:
              Array.isArray(
                storeInventory.favoriteItemIds,
              )
                ? storeInventory.favoriteItemIds
                : [],
          }
        : null,
    );
  }, [storeInventory]);

  useEffect(() => {
    if (!user) {
      setOperationalNotifications([]);
      setOperationalUnread(0);
      return;
    }

    let cancelled = false;

    async function loadOperationalNotifications(
      showLoading = false,
    ) {
      if (showLoading) {
        setNotificationsLoading(true);
      }

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/operational-notifications`,
          {
            credentials: "include",
            headers: {
              Accept: "application/json",
            },
          },
        );

        if (response.status === 403 || response.status === 404) {
          if (!cancelled) {
            setOperationalNotifications([]);
            setOperationalUnread(0);
          }
          return;
        }

        if (!response.ok) {
          throw new Error(
            `Falha ao carregar notificações (${response.status}).`,
          );
        }

        const data =
          (await response.json()) as OperationalNotificationsResponse;

        if (!cancelled) {
          setOperationalNotifications(
            Array.isArray(data.items) ? data.items : [],
          );
          setOperationalUnread(Number(data.unread || 0));
          setNotificationsError(null);
        }
      } catch (error) {
        console.error(
          "[LAYOUT] Erro ao carregar notificações operacionais:",
          error,
        );

        if (!cancelled) {
          setNotificationsError(
            "Não foi possível atualizar as notificações.",
          );
        }
      } finally {
        if (!cancelled && showLoading) {
          setNotificationsLoading(false);
        }
      }
    }

    void loadOperationalNotifications(true);

    const interval = window.setInterval(
      () => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          void loadOperationalNotifications(
            false,
          );
        }
      },
      45_000,
    );

    function handleOperationalRefresh() {
      void loadOperationalNotifications(false);
    }

    window.addEventListener(
      "operational-notifications:refresh",
      handleOperationalRefresh,
    );

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener(
        "operational-notifications:refresh",
        handleOperationalRefresh,
      );
    };
  }, [user?.id]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(
          event.target as Node,
        )
      ) {
        setUserMenuOpen(false);
      }

      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(
          event.target as Node,
        )
      ) {
        setNotificationsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setUserMenuOpen(false);
        setNotificationsOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handlePointerDown,
    );
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener(
        "mousedown",
        handlePointerDown,
      );
      window.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, []);

  const isComandoGeral =
    user?.roles?.includes("1147878942099906672") ||
    user?.id === "713719718091030599";

  const isSargento =
    user?.roles?.includes(
      "1147891694260461688",
    ) ||
    isComandoGeral;

  const isOficialAvaliador =
    user?.roles?.includes(
      "1147878942066364488",
    ) ||
    isComandoGeral;

  const hasCareerEvaluationsAccess =
    isOficialAvaliador ||
    isComandoGeral;

  const isDiretorNic =
    user?.roles?.includes("1296910327879045130") || false;

  const hasApprovalAccess =
    isComandoGeral || isDiretorNic;

  const navSections: NavSection[] = useMemo(
    () => [
      {
        title: "Principal",
        items: [
          {
            href: "/integracao",
            label: "Integração Operacional",
            shortLabel: "Integração",
            icon: Sparkles,
            badge: "Novo",
            description: "Introdução cinematográfica e tutorial da Central",
          },
          { href: "/", label: "Início", icon: Home },
          {
            href: "/dashboard",
            label: "Dashboard",
            icon: LayoutDashboard,
            moduleKey: "dashboard",
          },
          { href: "/dashboard-executivo", label: "Dashboard Executivo", shortLabel: "Executivo", icon: Activity, commandOnly: true },
          {
            href: "/comando",
            label: "Centro de Comando",
            shortLabel: "Comando",
            icon: Command,
            badge: "Novo",
            commandOnly: true,
          },
          {
            href: "/comando/aprovacoes",
            label: "Centro de Aprovações",
            shortLabel: "Aprovações",
            icon: FileCheck2,
            badge:
              operationalUnread > 0
                ? String(Math.min(operationalUnread, 99))
                : "Restrito",
            approvalAccess: true,
          },
          {
            href: "/honra",
            label: "Quadro de Honra",
            shortLabel: "Honra",
            icon: Trophy,
          },
          {
            href: "/loja",
            label: "Loja da Guarda",
            shortLabel: "Loja",
            icon: ShoppingBag,
            badge: "Novo",
          },
          { href: "/alertas", label: "Alertas", icon: BellRing },

        ],
      },
      {
        title: "Escola da Guarda",
        items: [
          {
            href: "/escola",
            label: "Centro de Formação",
            shortLabel: "Escola",
            icon: GraduationCap,
            badge: "Novo",
            description:
              "Formação inicial e acompanhamento",
          },
          {
            href: "/escola/formacoes",
            label: "Formações Iniciais",
            shortLabel: "Formações",
            icon: BookOpenCheck,
            description:
              "Obrigatórias e recomendadas",
          },
          {
            href: "/escola/manuais",
            label: "Manuais",
            icon: BookMarked,
            description:
              "Guarda Provisório e Formador",
          },
          {
            href: "/escola/formadores",
            label: "Formadores",
            icon: Presentation,
            description:
              "Candidaturas e corpo pedagógico",
          },
          {
            href: "/escola/exames",
            label: "Exames Finais",
            shortLabel: "Exames",
            icon: ClipboardCheck,
            description:
              "Patrulha LINCOLN e resultados",
          },
          {
            href: "/escola/gestao",
            label: "Gestão da Escola",
            shortLabel: "Gestão",
            icon: ShieldCheck,
            badge: "Restrito",
            description:
              "Administração pedagógica e exames",
          },
          {
            href: "/escola/certificados",
            label: "Certificados",
            icon: Award,
            description:
              "Formações e Exame Final",
          },
        ],
      },

      {
        title: "Operacional",
        items: [
          { href: "/guardas", label: "Efetivo", icon: Shield, moduleKey: "guards" },
          { href: "/gestao-efetivo", label: "Gestão do Efetivo", shortLabel: "Gestão", icon: UsersRound, moduleKey: "guards" },
          {
            href: "/avaliacoes-sargentos",
            label: "Avaliações dos Sargentos",
            shortLabel: "Avaliações",
            icon: ClipboardPenLine,
            badge: "Sargentos",
            sergeantOnly: true,
          },
          {
            href: "/avaliacoes-carreira",
            label: "Avaliações de Carreira",
            shortLabel: "Carreira",
            icon: ShieldCheck,
            badge: "Novo",
            description: "Oficiais → Sargentos · Comando → Oficiais",
            careerEvaluationsOnly: true,
          },
          {
            href: "/horas",
            label: "Horas de Serviço",
            moduleKey: "hours",
            shortLabel: "Horas",
            icon: Clock,
          },
          { href: "/patrulhas", label: "Patrulhas", icon: MapPin, moduleKey: "patrols" },
          {
            href: "/cps",
            label: "Registo de CPs",
            shortLabel: "CPs",
            icon: Route,
          },
          {
            href: "/ponto",
            label: "Folha de Ponto",
            shortLabel: "Ponto",
            icon: ClipboardCheck,
          },
          {
            href: "/pontos/admin",
            label: "Gestão de Pontos",
            shortLabel: "Pontos Admin",
            icon: Clock,
            moduleKey: "hours",
            restricted: true,
          },
        ],
      },
      {
        title: "Administração",
        items: [
          { href: "/arquivos", label: "Arquivos", icon: FileText },
          { href: "/documentos", label: "Documentos", icon: FolderOpen },
          {
            href: "/documentos-oficiais",
            label: "Documentos Oficiais",
            shortLabel: "Docs. Oficiais",
            icon: Archive,
            approvalAccess: true,
            restricted: true,
          },
          {
            href: "/verificar-documento",
            label: "Verificar Documento",
            shortLabel: "Verificar",
            icon: Fingerprint,
          },
          {
            href: "/relatorios",
            label: "Relatórios",
            moduleKey: "reports",
            icon: BarChart3,
            restricted: true,
          },
          {
            href: "/auditoria",
            label: "Auditoria",
            moduleKey: "audit",
            icon: ShieldCheck,
            restricted: true,
          },
          { href: "/legislacao", label: "Legislação", icon: Scale },
          { href: "/estatisticas-unidades", label: "Estatísticas das Unidades", shortLabel: "Estatísticas", icon: BarChart3, moduleKey: "units" },
        ],
      },
      {
        title: "Unidades",
        items: [
          {
            href: "/unidades",
            label: "Todas as Unidades",
            moduleKey: "units",
            shortLabel: "Unidades",
            icon: Building2,
            description: "Visão geral",
            unitTone: "base",
          },
          {
            href: "/nic",
            label: "NIC",
            moduleKey: "units",
            icon: Search,
            description: "Investigação criminal",
            unitTone: "blue",
          },
          {
            href: "/unt",
            label: "UNT",
            moduleKey: "units",
            icon: Radio,
            description: "Trânsito e fiscalização",
            unitTone: "cyan",
          },
          {
            href: "/gioe",
            label: "GIOE",
            moduleKey: "units",
            icon: Crosshair,
            description: "Operações especiais",
            unitTone: "red",
          },
          {
            href: "/ushe",
            label: "USHE",
            moduleKey: "units",
            icon: Landmark,
            description: "Honras de Estado",
            unitTone: "gold",
          },
        ],
      },
      {
        title: "Departamentos",
        items: [
          {
            href: "/departamentos",
            label: "Visão Geral",
            icon: Building2,
          },
          {
            href: "/departamentos/ceg",
            label: "Conselho de Elite",
            shortLabel: "CEG",
            icon: Crown,
          },
          {
            href: "/departamentos/cso",
            label: "Conselho Superior",
            shortLabel: "CSO",
            icon: Scale,
          },
          {
            href: "/departamentos/drh",
            label: "Recursos Humanos",
            shortLabel: "DRH",
            icon: UsersRound,
          },
        ],
      },
      {
        title: "Comunicação",
        items: [
          { href: "/noticias", label: "Notícias", icon: Newspaper },
          { href: "/avisos", label: "Avisos", icon: Megaphone, moduleKey: "disciplinary" },
          { href: "/agenda", label: "Agenda", icon: CalendarDays },
          { href: "/comunicacoes", label: "Comunicados", icon: Mail },
          {
            href: "/forum",
            label: "Fórum Interno",
            shortLabel: "Fórum",
            icon: MessagesSquare,
          },
        ],
      },
      {
        title: "Sistema",
        items: [
          {
            href: "/definicoes/personalizacao-social",
            label: "Personalização Social",
            shortLabel: "Personalização",
            icon: Paintbrush,
          },
          {
            href: "/definicoes",
            label: "Definições",
            icon: Settings,
            description: "Preferências e configuração da Central",
          },
          {
            href: "/discord",
            label: "Discord",
            moduleKey: "discord",
            icon: Bot,
            restricted: true,
          },
          {
            href: "/discord/sincronizacao",
            label: "Painel de Erros",
            shortLabel: "Sync",
            icon: DatabaseBackup,
            moduleKey: "discord",
            restricted: true,
          },
          {
            href: "/aplicacao",
            label: "Aplicação Mobile",
            shortLabel: "Aplicação",
            icon: Smartphone,
          },
          {
            href: "/backup",
            label: "Backup",
            moduleKey: "backup",
            icon: DatabaseBackup,
            restricted: true,
          },
        ],
      },
    ],
    [operationalUnread]
  );

  const visibleSections = useMemo(() => {
    return navSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => {
          if (item.commandOnly && !isComandoGeral) {
            return false;
          }

          if (item.approvalAccess && !hasApprovalAccess) {
            return false;
          }

          if (item.sergeantOnly && !isSargento) {
            return false;
          }

          if (
            item.careerEvaluationsOnly &&
            !hasCareerEvaluationsAccess
          ) {
            return false;
          }

          if (item.moduleKey) {
            const module = modulePermissions[item.moduleKey];

            if (module) {
              return (
                module.enabled === true &&
                module.permissions?.view === true
              );
            }

            if (permissionsLoaded && !permissionsError) {
              return false;
            }
          }

          if (
            item.restricted &&
            !item.approvalAccess
          ) {
            return isComandoGeral;
          }

          return true;
        }),
      }))
      .filter((section) => section.items.length > 0);
  }, [
    navSections,
    modulePermissions,
    permissionsLoaded,
    permissionsError,
    isComandoGeral,
    hasApprovalAccess,
    isSargento,
    hasCareerEvaluationsAccess,
  ]);

  const flatNavItems = visibleSections.flatMap((section) => section.items);

  const favoriteItems = useMemo(
    () =>
      favoriteHrefs
        .map((href) => flatNavItems.find((item) => item.href === href))
        .filter(Boolean) as NavItem[],
    [favoriteHrefs, flatNavItems],
  );

  const filteredSections = useMemo(() => {
    const term = sidebarSearch.trim().toLowerCase();

    if (!term) return visibleSections;

    return visibleSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) =>
          [
            item.label,
            item.shortLabel,
            item.description,
            section.title,
          ]
            .filter(Boolean)
            .some((value) =>
              String(value).toLowerCase().includes(term),
            ),
        ),
      }))
      .filter((section) => section.items.length > 0);
  }, [visibleSections, sidebarSearch]);

  const currentNav =
    flatNavItems.find((item) => item.href === location) ||
    flatNavItems.find(
      (item) => item.href !== "/" && location.startsWith(item.href)
    );

  const currentSection = visibleSections.find((section) =>
    section.items.some((item) => {
      if (item.href === "/") return location === "/";
      return location === item.href || location.startsWith(`${item.href}/`);
    })
  );

  useEffect(() => {
    if (!currentSection?.title || sidebarSearch.trim()) return;

    setOpenSections(
      Object.fromEntries(
        visibleSections.map((section) => [
          section.title,
          section.title === currentSection.title,
        ]),
      ),
    );
  }, [
    currentSection?.title,
    sidebarSearch,
    visibleSections,
  ]);

  function toggleSection(sectionTitle: string) {
    setOpenSections((current) => {
      const shouldOpen = current[sectionTitle] === false;

      return Object.fromEntries(
        visibleSections.map((section) => [
          section.title,
          section.title === sectionTitle
            ? shouldOpen
            : false,
        ]),
      );
    });
  }

  function toggleFavorite(href: string) {
    setFavoriteHrefs((current) =>
      current.includes(href)
        ? current.filter((item) => item !== href)
        : [...current, href],
    );
  }

  const getGuardaId = (guarda: any) => {
    return String(guarda?.discordId || guarda?.id || guarda?._id || "");
  };

  const getGuardaNome = (guarda: any) => {
    return (
      guarda?.nome ||
      guarda?.warName ||
      guarda?.displayName ||
      guarda?.username ||
      "Militar"
    );
  };

  const getGuardaPosto = (guarda: any) => {
    return (
      guarda?.posto ||
      guarda?.rank ||
      guarda?.hierarchyGroupLabel ||
      "Operacional"
    );
  };

  const searchResults = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (term.length < 2) return [];

    return ((guardas || []) as any[])
      .filter((guarda) => {
        const nome = getGuardaNome(guarda).toLowerCase();
        const posto = getGuardaPosto(guarda).toLowerCase();
        const numero = String(
          guarda?.numero || guarda?.callsignNumber || ""
        ).toLowerCase();
        const id = getGuardaId(guarda).toLowerCase();
        const unidade = String(guarda?.unidade || "").toLowerCase();

        return (
          nome.includes(term) ||
          posto.includes(term) ||
          numero.includes(term) ||
          id.includes(term) ||
          unidade.includes(term)
        );
      })
      .slice(0, 7);
  }, [guardas, searchTerm]);

  function openGuarda(guarda: any) {
    const id = getGuardaId(guarda);

    if (!id) return;

    setSearchTerm("");
    setSearchOpen(false);
    setLocation(`/guardas/${id}`);
  }

  function handleGlobalSearchSubmit(e: FormEvent) {
    e.preventDefault();

    const term = searchTerm.trim();

    if (term.length < 2) return;

    setSearchOpen(false);
    setLocation(`/pesquisa?q=${encodeURIComponent(term)}`);
  }

  const avatarUrl = user?.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
    : null;

  const ownedItemsCount = Array.isArray(
    storeSummary?.ownedItems,
  )
    ? storeSummary!.ownedItems!.length
    : 0;

  const favoriteItemsCount = Array.isArray(
    storeSummary?.favoriteItemIds,
  )
    ? storeSummary!.favoriteItemIds!.length
    : 0;

  async function copyDiscordId() {
    const discordId = String(user?.id || "");

    if (!discordId) return;

    try {
      await navigator.clipboard.writeText(discordId);
      setCopiedDiscordId(true);

      window.setTimeout(() => {
        setCopiedDiscordId(false);
      }, 1800);
    } catch (error) {
      console.error(
        "[LAYOUT] Não foi possível copiar o Discord ID:",
        error,
      );
    }
  }

  async function markOperationalNotificationRead(
    notification: OperationalNotification,
  ) {
    if (notification.readAt) {
      openOperationalNotification(notification);
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/operational-notifications/${notification._id}/read`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        },
      );

      if (!response.ok) {
        throw new Error(
          `Falha ao marcar notificação (${response.status}).`,
        );
      }

      setOperationalNotifications((current) =>
        current.map((item) =>
          item._id === notification._id
            ? {
                ...item,
                readAt: new Date().toISOString(),
              }
            : item,
        ),
      );

      setOperationalUnread((current) =>
        Math.max(0, current - 1),
      );

      openOperationalNotification(notification);
    } catch (error) {
      console.error(
        "[LAYOUT] Não foi possível marcar a notificação:",
        error,
      );
      setNotificationsError(
        "Não foi possível atualizar a notificação.",
      );
    }
  }

  async function markAllOperationalNotificationsRead() {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/operational-notifications/read-all`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        },
      );

      if (!response.ok) {
        throw new Error(
          `Falha ao marcar todas (${response.status}).`,
        );
      }

      const readAt = new Date().toISOString();

      setOperationalNotifications((current) =>
        current.map((item) => ({
          ...item,
          readAt: item.readAt || readAt,
        })),
      );
      setOperationalUnread(0);
    } catch (error) {
      console.error(
        "[LAYOUT] Não foi possível marcar todas:",
        error,
      );
      setNotificationsError(
        "Não foi possível marcar todas como lidas.",
      );
    }
  }

  function openOperationalNotification(
    notification: OperationalNotification,
  ) {
    setNotificationsOpen(false);

    const target =
      notification.actionUrl ||
      `/comando/aprovacoes?operation=${notification.operationId}`;

    setLocation(target);
  }

  async function handleLogout() {
    setUserMenuOpen(false);
    await logout();
  }

  return (
    <SiteThemeProvider>
      <div className="layout-v6-shell relative flex h-screen w-full overflow-hidden bg-background text-foreground">
      <DigitalGridBackground />

      <aside
        className={`layout-v6-sidebar theme-sidebar relative z-20 flex h-screen shrink-0 flex-col border-r border-white/10 shadow-[6px_0_34px_rgba(0,0,0,0.45)] backdrop-blur-2xl transition-all duration-300 ${
          collapsed ? "w-[82px]" : "w-[296px]"
        }`}
      >
        <div className="layout-v6-brand relative overflow-hidden border-b border-white/10 px-4 py-4">
          <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />

          <div
            className={`relative flex items-center ${
              collapsed ? "justify-center" : "gap-4"
            }`}
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-primary/25 bg-primary/10 p-1.5 shadow-[0_0_28px_hsl(var(--primary)/0.18)]">
              <img
                src="/gnr_logo.png"
                alt="GNR Central"
                className="h-full w-full object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
              <Shield className="hidden h-7 w-7 text-primary" />
            </div>

            {!collapsed && (
              <>
                <div className="min-w-0">
                  <h1 className="text-xl font-black uppercase leading-tight tracking-[0.16em] text-white">
                    GNR
                  </h1>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-accent">
                    Central
                  </p>
                </div>

                <button
                  onClick={() => setCollapsed(true)}
                  className="ml-auto flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] text-muted-foreground transition-all hover:bg-white/[0.06] hover:text-white"
                  title="Recolher menu"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </button>
              </>
            )}

            {collapsed && (
              <button
                onClick={() => setCollapsed(false)}
                className="theme-button-surface absolute -right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl border border-white/10 text-muted-foreground shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition-all hover:bg-white/[0.06] hover:text-white"
                title="Expandir menu"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <nav className="layout-v6-nav flex-1 overflow-y-auto overflow-x-hidden px-3 py-4">
          {!collapsed && (
            <div className="mb-4">
              <div className="flex h-11 items-center rounded-2xl border border-white/10 bg-black/25 px-3 transition focus-within:border-primary/30">
                <ListFilter className="mr-2 h-4 w-4 text-muted-foreground" />
                <input
                  value={sidebarSearch}
                  onChange={(event) =>
                    setSidebarSearch(event.target.value)
                  }
                  placeholder="Pesquisar módulo..."
                  className="h-full min-w-0 flex-1 bg-transparent text-xs font-semibold text-white outline-none placeholder:text-white/25"
                />

                {sidebarSearch && (
                  <button
                    type="button"
                    onClick={() => setSidebarSearch("")}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-white/30 hover:bg-white/[0.05] hover:text-white"
                    title="Limpar pesquisa"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          <div className={collapsed ? "space-y-3" : "space-y-3"}>
            {!collapsed &&
              !sidebarSearch &&
              favoriteItems.length > 0 && (
                <div className="rounded-[1.35rem] border border-yellow-400/10 bg-yellow-500/[0.025] p-2">
                  <div className="mb-1.5 flex items-center gap-2 px-2 py-1">
                    <Star className="h-3.5 w-3.5 fill-yellow-300 text-yellow-300" />
                    <p className="text-[8px] font-black uppercase tracking-[0.22em] text-yellow-300/75">
                      Favoritos
                    </p>
                  </div>

                  <div className="space-y-1">
                    {favoriteItems.map((item) => (
                      <SidebarNavLink
                        key={`favorite-${item.href}`}
                        item={item}
                        location={location}
                        collapsed={false}
                        isFavorite
                        onToggleFavorite={() =>
                          toggleFavorite(item.href)
                        }
                        modulePermissions={modulePermissions}
                      />
                    ))}
                  </div>
                </div>
              )}

            {filteredSections.map((section) => {
              const SectionIcon =
                section.items[0]?.icon || FolderOpen;

              const isActiveSection =
                section.items.some((item) =>
                  item.href === "/"
                    ? location === "/"
                    : location === item.href ||
                      location.startsWith(`${item.href}/`),
                );

              const isOpen =
                collapsed ||
                Boolean(sidebarSearch) ||
                openSections[section.title] !== false;

              return (
                <div
                  key={section.title}
                  className={
                    collapsed
                      ? ""
                      : "overflow-hidden rounded-[1.35rem] border border-white/[0.055] bg-white/[0.012]"
                  }
                >
                  {!collapsed && (
                    <button
                      type="button"
                      onClick={() => toggleSection(section.title)}
                      className={`layout-v6-section group flex w-full items-center gap-3 px-3 py-3 text-left transition ${
                        isActiveSection
                          ? "bg-primary/[0.055]"
                          : "hover:bg-white/[0.025]"
                      }`}
                    >
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${
                        isActiveSection
                          ? "border-primary/25 bg-primary/10 text-primary"
                          : "border-white/10 bg-black/20 text-white/35"
                      }`}>
                        <SectionIcon className="h-4 w-4" />
                      </span>

                      <span className={`min-w-0 flex-1 text-[9px] font-black uppercase tracking-[0.20em] ${
                        isActiveSection
                          ? "text-primary"
                          : "text-muted-foreground/75 group-hover:text-white/65"
                      }`}>
                        {section.title}
                      </span>

                      <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[8px] font-black text-white/25">
                        {section.items.length}
                      </span>

                      <ChevronDown
                        className={`h-4 w-4 text-white/25 transition-transform duration-300 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  )}

                  <div
                    className={`grid transition-[grid-template-rows,opacity] duration-300 ${
                      isOpen
                        ? "grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <div
                        className={
                          collapsed
                            ? "space-y-1.5"
                            : "space-y-1 px-2 pb-2"
                        }
                      >
                        {section.items.map((item) => (
                          <SidebarNavLink
                            key={item.href}
                            item={item}
                            location={location}
                            collapsed={collapsed}
                            isFavorite={favoriteHrefs.includes(
                              item.href,
                            )}
                            onToggleFavorite={() =>
                              toggleFavorite(item.href)
                            }
                            modulePermissions={modulePermissions}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {!collapsed &&
              sidebarSearch &&
              filteredSections.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center">
                  <Search className="mx-auto h-6 w-6 text-white/15" />
                  <p className="mt-3 text-sm font-black text-white/55">
                    Nenhum módulo encontrado
                  </p>
                  <p className="mt-1 text-xs text-white/25">
                    Experimenta outro nome ou categoria.
                  </p>
                </div>
              )}
          </div>
        </nav>

        <div className="border-t border-white/10 p-4">
          <div
            className={`relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] ${
              collapsed ? "p-2" : "p-3"
            }`}
          >
            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />

            <div
              className={`relative flex items-center ${
                collapsed ? "justify-center" : "gap-3"
              }`}
            >
              {user?.avatar ? (
                <img
                  src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`}
                  alt="Avatar"
                  className="h-10 w-10 rounded-full border border-primary/30 object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/30 bg-primary/20 font-black text-primary">
                  {user?.username?.charAt(0).toUpperCase() || "U"}
                </div>
              )}

              {!collapsed && (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-white">
                      {user?.displayName || user?.username || "Utilizador"}
                    </p>
                    <p className="truncate text-[10px] font-black uppercase tracking-[0.16em] text-primary">
                      {user?.rank || "Operacional"}
                    </p>
                  </div>

                  <button
                    onClick={() => void handleLogout()}
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    title="Terminar Sessão"
                    data-testid="button-logout"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </aside>

      <main className="relative flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        <div className="pointer-events-none absolute inset-0 opacity-20 cyber-grid" />
        <div className="pointer-events-none absolute right-0 top-0 h-1/3 w-1/3 rounded-full bg-primary/5 blur-[130px]" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-1/3 w-1/3 rounded-full bg-accent/5 blur-[130px]" />
        <div className="scanline pointer-events-none" />

        <header className="theme-topbar relative z-20 flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-6 backdrop-blur-2xl">
          <div className="flex min-w-0 items-center gap-5">
            <div className="hidden items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 md:flex">
              <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary))]" />
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">
                Sistema Operativo v4.0
              </span>
            </div>

            <div className="hidden h-5 w-px bg-white/10 md:block" />

            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Shield className="h-4 w-4" />
                <ChevronRight className="h-4 w-4" />
                <span>{currentSection?.title || "Principal"}</span>
              </div>

              <h2 className="truncate text-sm font-black uppercase tracking-[0.18em] text-white">
                {currentNav?.label || "Início"}
              </h2>

              {permissionsError && (
                <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-amber-300/70">
                  Permissões em modo de segurança
                </p>
              )}
            </div>
          </div>

          <form
            onSubmit={handleGlobalSearchSubmit}
            className="relative hidden w-full max-w-md lg:block"
          >
            <div className="flex items-center rounded-2xl border border-white/10 bg-black/25 px-4 py-2 transition-all focus-within:border-primary/30 focus-within:bg-black/35">
              <Search className="mr-3 h-4 w-4 text-muted-foreground" />

              <input
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setSearchOpen(false);
                  }
                }}
                placeholder="Pesquisar guarda por nome, NIM ou posto..."
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-muted-foreground"
              />
            </div>

            {searchOpen && searchTerm.trim().length >= 2 && (
              <div className="theme-popover absolute left-0 right-0 top-[calc(100%+10px)] z-50 overflow-hidden rounded-2xl border border-white/10 shadow-[0_24px_90px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
                {searchResults.length > 0 ? (
                  <div className="max-h-[360px] overflow-y-auto p-2">
                    {searchResults.map((guarda) => {
                      const id = getGuardaId(guarda);

                      return (
                        <button
                          key={id}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            openGuarda(guarda);
                          }}
                          className="group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-all hover:bg-primary/10"
                        >
                          {guarda?.avatar ? (
                            <img
                              src={guarda.avatar}
                              alt={getGuardaNome(guarda)}
                              className="h-11 w-11 rounded-xl border border-white/10 object-cover"
                            />
                          ) : (
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                              <Shield className="h-5 w-5" />
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-black text-white">
                              {getGuardaNome(guarda)}
                            </p>
                            <p className="mt-1 truncate text-[10px] font-black uppercase tracking-[0.14em] text-primary">
                              {getGuardaPosto(guarda)}
                              {guarda?.numero ? ` · ${guarda.numero}` : ""}
                            </p>
                          </div>

                          <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-5 text-center">
                    <p className="text-sm font-bold text-white">
                      Nenhum guarda encontrado
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Pesquisa por nome, posto, NIM ou ID Discord.
                    </p>
                  </div>
                )}
              </div>
            )}
          </form>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest text-muted-foreground xl:flex">
              <Database className="h-3.5 w-3.5 text-primary" />
              <span>GNR-TRANSCRIPT-SERVER:</span>
              <span className="text-white">ONLINE</span>
            </div>

            <div className="hidden text-[10px] font-mono uppercase tracking-widest text-muted-foreground md:block">
              {time.toLocaleTimeString("pt-PT")}
            </div>

            <div
              ref={notificationsRef}
              className="relative"
            >
              <button
                type="button"
                onClick={() => {
                  setNotificationsOpen((current) => !current);
                  setUserMenuOpen(false);
                }}
                className={`relative flex h-10 w-10 items-center justify-center rounded-2xl border transition-colors ${
                  notificationsOpen
                    ? "border-primary/35 bg-primary/20 text-primary"
                    : "border-primary/20 bg-primary/10 text-primary hover:bg-primary/20"
                }`}
                title="Notificações operacionais"
                aria-expanded={notificationsOpen}
              >
                <BellRing className="h-4 w-4" />

                {operationalUnread > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-[#0b1110] bg-red-500 px-1 text-[8px] font-black text-white shadow-[0_0_12px_rgba(239,68,68,0.9)]">
                    {operationalUnread > 99
                      ? "99+"
                      : operationalUnread}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <OperationalNotificationsDropdown
                  items={operationalNotifications}
                  unread={operationalUnread}
                  loading={notificationsLoading}
                  error={notificationsError}
                  onClose={() => setNotificationsOpen(false)}
                  onOpen={(notification) =>
                    void markOperationalNotificationRead(notification)
                  }
                  onMarkAll={() =>
                    void markAllOperationalNotificationsRead()
                  }
                  onOpenCenter={() => {
                    setNotificationsOpen(false);
                    setLocation("/comando/aprovacoes");
                  }}
                  onOpenCalendar={() => {
                    setNotificationsOpen(false);
                    setLocation("/agenda");
                  }}
                />
              )}
            </div>

            <div
              ref={userMenuRef}
              className="relative hidden md:block"
            >
              <button
                type="button"
                onClick={() =>
                  setUserMenuOpen((current) => !current)
                }
                className={`relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl border transition-all ${
                  userMenuOpen
                    ? "border-primary/35 bg-primary/15 text-primary shadow-[0_0_24px_hsl(var(--primary)/0.18)]"
                    : "border-white/10 bg-white/[0.035] text-muted-foreground hover:border-primary/25 hover:bg-primary/10 hover:text-primary"
                }`}
                title="Menu do utilizador"
                aria-expanded={userMenuOpen}
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={user?.displayName || user?.username || "Utilizador"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <UserCircle className="h-5 w-5" />
                )}

                <span className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full border-2 border-[#0b1110] bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]" />
              </button>

              {userMenuOpen && (
                <UserMenu
                  user={user}
                  avatarUrl={avatarUrl}
                  credits={Number(storeSummary?.credits || 0)}
                  ownedItemsCount={ownedItemsCount}
                  favoriteItemsCount={favoriteItemsCount}
                  operationalUnread={operationalUnread}
                  hasApprovalAccess={hasApprovalAccess}
                  isComandoGeral={isComandoGeral}
                  copiedDiscordId={copiedDiscordId}
                  onCopyDiscordId={() =>
                    void copyDiscordId()
                  }
                  onNavigate={() =>
                    setUserMenuOpen(false)
                  }
                  onLogout={() =>
                    void handleLogout()
                  }
                />
              )}
            </div>
          </div>
        </header>

        <div
          className="relative z-10 flex-1 overflow-auto"
          onClick={() => {
            if (searchOpen) setSearchOpen(false);
          }}
        >
          <div className="mx-auto w-full max-w-[1540px] px-6 py-7">
            {children}
          </div>
        </div>
      </main>

      <GlobalAudioPlayer />
    </div>
    </SiteThemeProvider>
  );
}

function formatOperationalNotificationTime(
  value: string,
) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Agora";
  }

  const diff = Date.now() - date.getTime();
  const minutes = Math.max(0, Math.floor(diff / 60_000));

  if (minutes < 1) return "Agora";
  if (minutes < 60) return `Há ${minutes} min`;

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `Há ${hours}h`;
  }

  const days = Math.floor(hours / 24);

  return `Há ${days}d`;
}

function getOperationalNotificationIcon(
  type: OperationalNotification["type"],
) {
  switch (type) {
    case "REPORT_PENDING_DIRECTOR":
      return UserRound;
    case "REPORT_PENDING_COMMAND":
      return ShieldAlert;
    case "CHANGES_REQUESTED":
      return FileWarning;
    case "READY_FOR_DOCUMENT":
      return FileClock;
    case "DOCUMENT_ISSUED":
      return FileCheck2;
    default:
      return BellRing;
  }
}

function getOperationalNotificationTone(
  item: OperationalNotification,
) {
  if (item.priority === "URGENT") {
    return {
      border: "border-red-400/20",
      background: "bg-red-500/[0.07]",
      icon: "border-red-400/20 bg-red-500/10 text-red-300",
      dot: "bg-red-400",
    };
  }

  if (item.priority === "ATTENTION") {
    return {
      border: "border-yellow-400/20",
      background: "bg-yellow-500/[0.06]",
      icon: "border-yellow-400/20 bg-yellow-500/10 text-yellow-300",
      dot: "bg-yellow-400",
    };
  }

  return {
    border: "border-primary/20",
    background: "bg-primary/[0.05]",
    icon: "border-primary/20 bg-primary/10 text-primary",
    dot: "bg-primary",
  };
}

function OperationalNotificationsDropdown({
  items,
  unread,
  loading,
  error,
  onClose,
  onOpen,
  onMarkAll,
  onOpenCenter,
  onOpenCalendar,
}: {
  items: OperationalNotification[];
  unread: number;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onOpen: (notification: OperationalNotification) => void;
  onMarkAll: () => void;
  onOpenCenter: () => void;
  onOpenCalendar: () => void;
}) {
  return (
    <div className="theme-popover absolute right-0 top-[calc(100%+12px)] z-[160] w-[420px] overflow-hidden rounded-[1.8rem] border border-white/10 shadow-[0_34px_130px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
      <div className="relative overflow-hidden border-b border-white/10 p-5">
        <div className="pointer-events-none absolute -right-14 -top-16 h-40 w-40 rounded-full bg-primary/15 blur-3xl" />

        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <BellRing className="h-4 w-4 text-primary" />
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-primary">
                Central de notificações
              </p>
            </div>

            <h3 className="mt-2 text-xl font-black text-white">
              Operacional
            </h3>

            <p className="mt-1 text-xs text-white/35">
              {unread > 0
                ? `${unread} notificação${
                    unread === 1 ? "" : "ões"
                  } por consultar`
                : "Não existem notificações por consultar"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] text-white/35 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {unread > 0 && (
          <button
            type="button"
            onClick={onMarkAll}
            className="relative mt-4 inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-[8px] font-black uppercase tracking-[0.12em] text-primary hover:bg-primary/15"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Marcar todas como lidas
          </button>
        )}
      </div>

      <div className="max-h-[520px] overflow-y-auto p-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <p>{error}</p>
            </div>
          </div>
        ) : items.length > 0 ? (
          <div className="space-y-2">
            {items.slice(0, 12).map((item) => {
              const Icon = getOperationalNotificationIcon(
                item.type,
              );
              const tone = getOperationalNotificationTone(item);
              const isUnread = !item.readAt;

              return (
                <button
                  key={item._id}
                  type="button"
                  onClick={() => onOpen(item)}
                  className={`group relative flex w-full gap-3 rounded-2xl border p-3 text-left transition-all hover:-translate-y-0.5 ${tone.border} ${tone.background}`}
                >
                  {isUnread && (
                    <span
                      className={`absolute right-3 top-3 h-2.5 w-2.5 rounded-full ${tone.dot} shadow-[0_0_10px_currentColor]`}
                    />
                  )}

                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${tone.icon}`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>

                  <span className="min-w-0 flex-1 pr-4">
                    <span className="block truncate text-sm font-black text-white">
                      {item.title}
                    </span>

                    <span className="mt-1 block line-clamp-2 text-[11px] leading-5 text-white/40">
                      {item.message}
                    </span>

                    <span className="mt-2 flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.1em] text-white/25">
                      <span>
                        {item.caseNumber ||
                          item.operationTitle}
                      </span>
                      <span>•</span>
                      <span>
                        {formatOperationalNotificationTime(
                          item.createdAt,
                        )}
                      </span>
                    </span>
                  </span>

                  <ChevronRight className="mt-3 h-4 w-4 shrink-0 text-white/15 transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                </button>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-500/10 text-emerald-300">
              <CheckCheck className="h-6 w-6" />
            </div>

            <p className="mt-4 text-sm font-black text-white">
              Tudo tratado
            </p>

            <p className="mt-2 text-xs text-white/30">
              Não existem notificações operacionais pendentes.
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 border-t border-white/10 p-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={onOpenCalendar}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-[9px] font-black uppercase tracking-[0.12em] text-primary hover:bg-primary/15"
        >
          <CalendarDays className="h-4 w-4" />
          Agenda / Calendário
        </button>

        <button
          type="button"
          onClick={onOpenCenter}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 text-[9px] font-black uppercase tracking-[0.12em] text-white/50 hover:bg-white/[0.06] hover:text-white"
        >
          <FileCheck2 className="h-4 w-4" />
          Aprovações
        </button>
      </div>
    </div>
  );
}

function UserMenu({
  user,
  avatarUrl,
  credits,
  ownedItemsCount,
  favoriteItemsCount,
  operationalUnread,
  hasApprovalAccess,
  isComandoGeral,
  copiedDiscordId,
  onCopyDiscordId,
  onNavigate,
  onLogout,
}: {
  user: any;
  avatarUrl: string | null;
  credits: number;
  ownedItemsCount: number;
  favoriteItemsCount: number;
  operationalUnread: number;
  hasApprovalAccess: boolean;
  isComandoGeral: boolean;
  copiedDiscordId: boolean;
  onCopyDiscordId: () => void;
  onNavigate: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="theme-popover absolute right-0 top-[calc(100%+12px)] z-[120] w-[360px] overflow-hidden rounded-[1.8rem] border border-white/10 shadow-[0_30px_110px_rgba(0,0,0,0.75)] backdrop-blur-2xl">
      <div className="relative overflow-hidden border-b border-white/10 p-5">
        <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 cyber-grid-soft opacity-[0.08]" />

        <div className="relative flex items-center gap-4">
          <div className="relative">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={user?.displayName || user?.username || "Utilizador"}
                className="h-14 w-14 rounded-2xl border border-primary/30 object-cover shadow-[0_0_24px_hsl(var(--primary)/0.18)]"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary">
                <CircleUserRound className="h-7 w-7" />
              </div>
            )}

            <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-[#06100d] bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-black text-white">
              {user?.displayName ||
                user?.username ||
                "Utilizador"}
            </p>
            <p className="mt-1 truncate text-[10px] font-black uppercase tracking-[0.16em] text-primary">
              {user?.rank || "Operacional"}
            </p>

            <div className="mt-2 flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.12em] text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Discord ligado
            </div>
          </div>

          {isComandoGeral && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-yellow-400/20 bg-yellow-500/10 text-yellow-300">
              <Crown className="h-4 w-4" />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 border-b border-white/10 p-4">
        <UserMenuMetric
          icon={<WalletCards className="h-4 w-4" />}
          label="Créditos"
          value={credits.toLocaleString("pt-PT")}
          tone="gold"
        />
        <UserMenuMetric
          icon={<Package className="h-4 w-4" />}
          label="Itens"
          value={ownedItemsCount}
          tone="green"
        />
        <UserMenuMetric
          icon={<Heart className="h-4 w-4" />}
          label="Favoritos"
          value={favoriteItemsCount}
          tone="red"
        />
      </div>

      <div className="p-3">
        <p className="mb-2 px-2 text-[8px] font-black uppercase tracking-[0.2em] text-white/25">
          Área pessoal
        </p>

        <UserMenuLink
          href={`/guardas/${user?.id || ""}`}
          icon={<UserRound className="h-4 w-4" />}
          label="O meu perfil"
          description="Perfil, carreira e informação pessoal"
          onNavigate={onNavigate}
        />

        <UserMenuLink
          href="/horas"
          icon={<Clock className="h-4 w-4" />}
          label="Horas de serviço"
          description="Consulta o teu registo de horas"
          onNavigate={onNavigate}
        />

        <UserMenuLink
          href="/loja"
          icon={<ShoppingBag className="h-4 w-4" />}
          label="Loja e inventário"
          description={`${credits.toLocaleString("pt-PT")} créditos disponíveis`}
          onNavigate={onNavigate}
          badge="Loja"
        />

        <UserMenuLink
          href="/honra"
          icon={<Medal className="h-4 w-4" />}
          label="Carreira e medalhas"
          description="Mérito, distinções e quadro de honra"
          onNavigate={onNavigate}
        />

        <UserMenuLink
          href={
            hasApprovalAccess
              ? "/comando/aprovacoes"
              : "/alertas"
          }
          icon={<BellRing className="h-4 w-4" />}
          label="Notificações"
          description={
            operationalUnread > 0
              ? `${operationalUnread} notificação${
                  operationalUnread === 1 ? "" : "ões"
                } por consultar`
              : "Sem notificações operacionais pendentes"
          }
          onNavigate={onNavigate}
          badge={
            operationalUnread > 0
              ? String(Math.min(operationalUnread, 99))
              : undefined
          }
          showDot={operationalUnread > 0}
        />
      </div>

      {isComandoGeral && (
        <div className="border-t border-white/10 p-3">
          <p className="mb-2 px-2 text-[8px] font-black uppercase tracking-[0.2em] text-yellow-300/60">
            Comando-Geral
          </p>

          <UserMenuLink
            href="/definicoes"
            icon={<SlidersHorizontal className="h-4 w-4" />}
            label="Administração"
            description="Definições, acessos e permissões"
            onNavigate={onNavigate}
            admin
          />

          <UserMenuLink
            href="/comando/aprovacoes"
            icon={<FileCheck2 className="h-4 w-4" />}
            label="Centro de Aprovações"
            description="Relatórios, validações e documentos oficiais"
            onNavigate={onNavigate}
            admin
          />

          <UserMenuLink
            href="/auditoria"
            icon={<ShieldCheck className="h-4 w-4" />}
            label="Auditoria"
            description="Ações sensíveis e histórico do sistema"
            onNavigate={onNavigate}
            admin
          />
        </div>
      )}

      <div className="border-t border-white/10 p-3">
        <button
          type="button"
          onClick={onCopyDiscordId}
          className="group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-white/[0.04]"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] text-white/35 transition group-hover:border-primary/20 group-hover:text-primary">
            {copiedDiscordId ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </span>

          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-white/75">
              {copiedDiscordId
                ? "Discord ID copiado"
                : "Copiar Discord ID"}
            </span>
            <span className="mt-0.5 block truncate font-mono text-[9px] text-white/25">
              {user?.id || "Sem ID disponível"}
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={onLogout}
          className="group mt-1 flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-red-500/10"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-red-400/15 bg-red-500/10 text-red-300">
            <LogOut className="h-4 w-4" />
          </span>

          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-red-200">
              Terminar sessão
            </span>
            <span className="mt-0.5 block text-[9px] text-red-200/35">
              Sair da Central em segurança
            </span>
          </span>
        </button>
      </div>
    </div>
  );
}

function UserMenuLink({
  href,
  icon,
  label,
  description,
  onNavigate,
  badge,
  showDot = false,
  admin = false,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  description: string;
  onNavigate: () => void;
  badge?: string;
  showDot?: boolean;
  admin?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`group flex items-center gap-3 rounded-2xl px-3 py-3 transition ${
        admin
          ? "hover:bg-yellow-500/10"
          : "hover:bg-primary/10"
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition ${
          admin
            ? "border-yellow-400/15 bg-yellow-500/10 text-yellow-300"
            : "border-white/10 bg-white/[0.035] text-white/35 group-hover:border-primary/20 group-hover:text-primary"
        }`}
      >
        {icon}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-sm font-bold text-white/80">
          {label}
          {showDot && (
            <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_8px_hsl(var(--accent)/0.8)]" />
          )}
        </span>
        <span className="mt-0.5 block truncate text-[9px] text-white/28">
          {description}
        </span>
      </span>

      {badge ? (
        <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-[8px] font-black uppercase tracking-[0.1em] text-primary">
          {badge}
        </span>
      ) : (
        <ChevronRight className="h-4 w-4 text-white/15 transition group-hover:translate-x-1 group-hover:text-primary" />
      )}
    </Link>
  );
}

function UserMenuMetric({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  tone: "green" | "gold" | "red";
}) {
  const styles = {
    green:
      "border-emerald-400/15 bg-emerald-500/[0.07] text-emerald-300",
    gold: "border-yellow-400/15 bg-yellow-500/[0.07] text-yellow-300",
    red: "border-red-400/15 bg-red-500/[0.07] text-red-300",
  };

  return (
    <div
      className={`rounded-xl border p-3 ${styles[tone]}`}
    >
      <div className="flex items-center justify-between gap-2">
        {icon}
        <span className="text-base font-black text-white">
          {value}
        </span>
      </div>
      <p className="mt-2 truncate text-[8px] font-black uppercase tracking-[0.13em] opacity-65">
        {label}
      </p>
    </div>
  );
}

function SidebarNavLink({
  item,
  location,
  collapsed,
  isFavorite,
  onToggleFavorite,
  modulePermissions,
}: {
  item: NavItem;
  location: string;
  collapsed: boolean;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  modulePermissions: Record<string, ModulePermission>;
}) {
  const Icon = item.icon;

  const isActive =
    item.href === "/"
      ? location === "/"
      : location === item.href ||
        location.startsWith(`${item.href}/`);

  const displayLabel = item.shortLabel || item.label;

  const permissionRestricted =
    Boolean(item.moduleKey) &&
    Boolean(
      modulePermissions[item.moduleKey!]?.viewRoleIds?.length,
    );

  const badgeTone =
    item.badge &&
    /^\d+$/.test(item.badge)
      ? "border-red-400/20 bg-red-500/10 text-red-300"
      : "border-accent/30 bg-accent/10 text-accent";

  return (
    <div className="group/nav relative">
      <Link
        href={item.href}
        title={item.label}
        className={`group relative flex items-center rounded-xl transition-all duration-200 ${
          collapsed
            ? "justify-center px-2 py-3"
            : "gap-3 px-3 py-2.5 pr-9"
        } ${
          isActive
            ? "bg-primary/10 text-primary shadow-[0_0_20px_hsl(var(--primary)/0.09)]"
            : "text-muted-foreground hover:bg-white/[0.045] hover:text-white"
        }`}
      >
        {isActive && (
          <div className="absolute left-0 top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-r-full bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.8)]" />
        )}

        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border transition-all ${
            isActive
              ? "border-primary/25 bg-primary/10 text-primary"
              : "border-white/10 bg-white/[0.025] text-muted-foreground group-hover:text-white"
          }`}
        >
          <Icon className="h-4 w-4" />
        </span>

        {!collapsed && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold tracking-wide">
                {displayLabel}
              </span>

              {item.description && (
                <span className="mt-0.5 block truncate text-[9px] font-semibold text-white/25">
                  {item.description}
                </span>
              )}
            </span>

            {item.badge && (
              <span
                className={`shrink-0 rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.1em] ${badgeTone}`}
              >
                {item.badge}
              </span>
            )}

            {!item.badge && permissionRestricted && (
              <span className="shrink-0 rounded-full border border-amber-400/20 bg-amber-500/10 px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.1em] text-amber-300">
                Restrito
              </span>
            )}

            {!item.badge &&
              !item.moduleKey &&
              item.restricted && (
                <span className="shrink-0 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.1em] text-primary">
                  CMD
                </span>
              )}
          </>
        )}

        {collapsed && item.badge && (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent shadow-[0_0_8px_hsl(var(--accent)/0.8)]" />
        )}
      </Link>

      {!collapsed && (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onToggleFavorite();
          }}
          className={`absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg transition ${
            isFavorite
              ? "text-yellow-300 opacity-100"
              : "text-white/20 opacity-0 hover:bg-white/[0.05] hover:text-yellow-300 group-hover/nav:opacity-100"
          }`}
          title={
            isFavorite
              ? "Remover dos favoritos"
              : "Adicionar aos favoritos"
          }
        >
          <Star
            className={`h-3.5 w-3.5 ${
              isFavorite ? "fill-current" : ""
            }`}
          />
        </button>
      )}
    </div>
  );
}

function getUnitToneClasses(tone: UnitTone | undefined, isActive: boolean) {
  const unitTone = tone || "base";

  const tones: Record<
    UnitTone,
    {
      active: string;
      inactive: string;
      iconActive: string;
      iconInactive: string;
      glow: string;
      dot: string;
    }
  > = {
    base: {
      active:
        "border-primary/30 bg-primary/10 text-primary shadow-[0_0_28px_hsl(var(--primary)/0.14)]",
      inactive:
        "border-white/10 bg-white/[0.025] text-muted-foreground hover:border-primary/25 hover:bg-primary/10 hover:text-white",
      iconActive: "border-primary/25 bg-primary/15 text-primary",
      iconInactive:
        "border-white/10 bg-white/[0.035] text-muted-foreground group-hover:border-primary/25 group-hover:text-primary",
      glow: "bg-primary/20",
      dot: "bg-primary",
    },
    blue: {
      active:
        "border-blue-400/35 bg-blue-500/10 text-blue-300 shadow-[0_0_28px_rgba(96,165,250,0.16)]",
      inactive:
        "border-white/10 bg-white/[0.025] text-muted-foreground hover:border-blue-400/25 hover:bg-blue-500/10 hover:text-blue-200",
      iconActive: "border-blue-400/25 bg-blue-500/15 text-blue-300",
      iconInactive:
        "border-white/10 bg-white/[0.035] text-muted-foreground group-hover:border-blue-400/25 group-hover:text-blue-300",
      glow: "bg-blue-500/20",
      dot: "bg-blue-400",
    },
    cyan: {
      active:
        "border-cyan-400/35 bg-cyan-500/10 text-cyan-300 shadow-[0_0_28px_rgba(34,211,238,0.16)]",
      inactive:
        "border-white/10 bg-white/[0.025] text-muted-foreground hover:border-cyan-400/25 hover:bg-cyan-500/10 hover:text-cyan-200",
      iconActive: "border-cyan-400/25 bg-cyan-500/15 text-cyan-300",
      iconInactive:
        "border-white/10 bg-white/[0.035] text-muted-foreground group-hover:border-cyan-400/25 group-hover:text-cyan-300",
      glow: "bg-cyan-500/20",
      dot: "bg-cyan-400",
    },
    red: {
      active:
        "border-red-400/35 bg-red-500/10 text-red-300 shadow-[0_0_28px_rgba(248,113,113,0.16)]",
      inactive:
        "border-white/10 bg-white/[0.025] text-muted-foreground hover:border-red-400/25 hover:bg-red-500/10 hover:text-red-200",
      iconActive: "border-red-400/25 bg-red-500/15 text-red-300",
      iconInactive:
        "border-white/10 bg-white/[0.035] text-muted-foreground group-hover:border-red-400/25 group-hover:text-red-300",
      glow: "bg-red-500/20",
      dot: "bg-red-400",
    },
    gold: {
      active:
        "border-yellow-400/35 bg-yellow-500/10 text-yellow-300 shadow-[0_0_28px_rgba(250,204,21,0.16)]",
      inactive:
        "border-white/10 bg-white/[0.025] text-muted-foreground hover:border-yellow-400/25 hover:bg-yellow-500/10 hover:text-yellow-200",
      iconActive: "border-yellow-400/25 bg-yellow-500/15 text-yellow-300",
      iconInactive:
        "border-white/10 bg-white/[0.035] text-muted-foreground group-hover:border-yellow-400/25 group-hover:text-yellow-300",
      glow: "bg-yellow-500/20",
      dot: "bg-yellow-400",
    },
  };

  const selected = tones[unitTone];

  return {
    container: isActive ? selected.active : selected.inactive,
    icon: isActive ? selected.iconActive : selected.iconInactive,
    glow: selected.glow,
    dot: selected.dot,
  };
}

function UnitNavLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const Icon = item.icon;
  const theme = getUnitToneClasses(item.unitTone, isActive);

  return (
    <Link
      href={item.href}
      title={item.label}
      className={`group relative flex items-center gap-3 overflow-hidden rounded-2xl border px-3 py-3 transition-all duration-300 hover:-translate-y-0.5 ${theme.container}`}
    >
      <div
        className={`pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full blur-3xl transition-opacity ${
          isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        } ${theme.glow}`}
      />

      {isActive && (
        <div className={`absolute left-0 top-1/2 h-8 w-[3px] -translate-y-1/2 rounded-r-full ${theme.dot}`} />
      )}

      <span
        className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition-all ${theme.icon}`}
      >
        <Icon className="h-4.5 w-4.5" />
      </span>

      <span className="relative min-w-0 flex-1">
        <span className="block truncate text-sm font-black tracking-wide text-white">
          {item.shortLabel || item.label}
        </span>

        {item.description && (
          <span className="mt-0.5 block truncate text-[10px] font-semibold text-muted-foreground">
            {item.description}
          </span>
        )}
      </span>

      {item.badge && (
        <span className="relative shrink-0 rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] text-accent">
          {item.badge}
        </span>
      )}

      <ChevronRight className="relative h-4 w-4 shrink-0 text-muted-foreground transition-all group-hover:translate-x-1 group-hover:text-white" />
    </Link>
  );
}
