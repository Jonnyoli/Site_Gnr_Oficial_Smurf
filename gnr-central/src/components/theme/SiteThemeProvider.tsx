import {
  useEffect,
  useRef,
  type ReactNode,
} from "react";

import {
  useData,
} from "../../context/DataContext";

import {
  DEFAULT_SITE_THEME_ID,
  getSiteTheme,
} from "./premiumThemes";

function applyTheme(
  themeId: string,
) {
  const theme =
    getSiteTheme(themeId);

  const root =
    document.documentElement;

  root.dataset.requestedSiteTheme =
    String(themeId || "");

  root.dataset.siteTheme =
    theme.id;

  root.dataset.siteLayout =
    theme.layout;

  root.dataset.sitePattern =
    theme.pattern;

  root.dataset.themeMode =
    theme.light
      ? "light"
      : "dark";

  const variables:
    Record<string, string> = {
      "--primary":
        theme.colors.primary,
      "--primary-foreground":
        theme.colors.primaryForeground,
      "--accent":
        theme.colors.accent,
      "--accent-foreground":
        theme.colors.accentForeground,
      "--ring":
        theme.colors.primary,
      "--background":
        theme.colors.background,
      "--foreground":
        theme.colors.foreground,
      "--card":
        theme.colors.card,
      "--card-foreground":
        theme.colors.cardForeground,
      "--card-border":
        theme.colors.border,
      "--popover":
        theme.colors.card,
      "--popover-foreground":
        theme.colors.cardForeground,
      "--popover-border":
        theme.colors.border,
      "--border":
        theme.colors.border,
      "--input":
        theme.colors.border,
      "--muted":
        theme.colors.muted,
      "--muted-foreground":
        theme.colors.mutedForeground,
      "--secondary":
        theme.colors.muted,
      "--secondary-foreground":
        theme.colors.foreground,
      "--sidebar":
        theme.colors.sidebar,
      "--sidebar-foreground":
        theme.colors.foreground,
      "--sidebar-border":
        theme.colors.border,
      "--sidebar-primary":
        theme.colors.primary,
      "--sidebar-primary-foreground":
        theme.colors.primaryForeground,
      "--sidebar-accent":
        theme.colors.sidebarAccent,
      "--sidebar-accent-foreground":
        theme.colors.foreground,
      "--sidebar-ring":
        theme.colors.primary,
      "--site-theme-glow":
        theme.colors.glow,
      "--site-theme-surface":
        theme.colors.surface,
      "--site-theme-surface-strong":
        theme.colors.surfaceStrong,
      "--site-theme-border":
        theme.colors.line,
      "--site-theme-preview":
        `url("${theme.image}")`,
      "--site-theme-page-background":
        theme.backgrounds?.page ||
        `radial-gradient(circle at 14% 8%, hsl(${theme.colors.primary} / .18), transparent 34%), radial-gradient(circle at 88% 86%, hsl(${theme.colors.accent} / .12), transparent 32%), linear-gradient(145deg, hsl(${theme.colors.background}), color-mix(in srgb, hsl(${theme.colors.background}) 84%, black))`,
      "--site-theme-main-background":
        theme.backgrounds?.main ||
        `radial-gradient(circle at 72% 0%, hsl(${theme.colors.primary} / .10), transparent 34%), linear-gradient(145deg, hsl(${theme.colors.background}), color-mix(in srgb, hsl(${theme.colors.card}) 72%, hsl(${theme.colors.background})))`,
      "--site-theme-sidebar-background":
        theme.backgrounds?.sidebar ||
        `linear-gradient(180deg, color-mix(in srgb, hsl(${theme.colors.sidebar}) 96%, black), color-mix(in srgb, hsl(${theme.colors.sidebarAccent}) 82%, black))`,
      "--site-theme-topbar-background":
        theme.backgrounds?.topbar ||
        `linear-gradient(90deg, color-mix(in srgb, hsl(${theme.colors.sidebarAccent}) 90%, black), color-mix(in srgb, hsl(${theme.colors.card}) 88%, black))`,
      "--site-theme-panel-background":
        theme.backgrounds?.panel ||
        `linear-gradient(145deg, color-mix(in srgb, hsl(${theme.colors.card}) 92%, transparent), color-mix(in srgb, hsl(${theme.colors.background}) 92%, transparent))`,
      "--site-theme-player-background":
        theme.backgrounds?.player ||
        `linear-gradient(145deg, color-mix(in srgb, hsl(${theme.colors.sidebar}) 96%, black), color-mix(in srgb, hsl(${theme.colors.card}) 90%, black))`,
      "--site-theme-decoration":
        theme.backgrounds?.decoration ||
        `radial-gradient(circle at 18% 18%, hsl(${theme.colors.primary} / .18), transparent 28%), radial-gradient(circle at 82% 76%, hsl(${theme.colors.accent} / .12), transparent 30%)`,
    };

  Object.entries(
    variables,
  ).forEach(
    ([key, value]) => {
      root.style.setProperty(
        key,
        value,
      );
    },
  );

  root.style.colorScheme =
    theme.light
      ? "light"
      : "dark";

  document.body.style.backgroundColor =
    `hsl(${theme.colors.background})`;
}

export default function SiteThemeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const {
    storeInventory,
  } =
    useData() as any;

  const equippedThemeId =
    storeInventory
      ?.equipped
      ?.theme ||
    window.localStorage.getItem(
      "gnr-site-theme",
    ) ||
    DEFAULT_SITE_THEME_ID;

  const activeThemeRef =
    useRef(
      equippedThemeId,
    );

  useEffect(() => {
    activeThemeRef.current =
      equippedThemeId;

    applyTheme(
      equippedThemeId,
    );

    window.localStorage.setItem(
      "gnr-site-theme",
      equippedThemeId,
    );
  }, [
    equippedThemeId,
  ]);

  useEffect(() => {
    function previewTheme(
      event: Event,
    ) {
      const customEvent =
        event as CustomEvent<{
          themeId?: string;
        }>;

      const previewId =
        customEvent.detail
          ?.themeId;

      if (!previewId) {
        return;
      }

      applyTheme(
        previewId,
      );

      document.documentElement
        .dataset
        .siteThemePreview =
        "true";
    }

    function restoreTheme() {
      applyTheme(
        activeThemeRef.current,
      );

      delete document
        .documentElement
        .dataset
        .siteThemePreview;
    }

    window.addEventListener(
      "gnr:theme-preview",
      previewTheme,
    );

    window.addEventListener(
      "gnr:theme-preview-clear",
      restoreTheme,
    );

    return () => {
      window.removeEventListener(
        "gnr:theme-preview",
        previewTheme,
      );

      window.removeEventListener(
        "gnr:theme-preview-clear",
        restoreTheme,
      );

      restoreTheme();
    };
  }, []);

  return (
    <div
      data-site-theme={
        equippedThemeId
      }
      className="site-theme-root min-h-screen"
    >
      {children}
    </div>
  );
}
