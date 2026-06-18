export const ONBOARDING_CONFIG = {
  /**
   * Preenche estes IDs depois de os copiares do Discord.
   * Enquanto estiverem vazios, a integração pode ser aberta manualmente
   * em /integracao, mas não bloqueia automaticamente ninguém.
   */
  guardaProvisorioRoleId:
    import.meta.env.VITE_GUARDA_PROVISORIO_ROLE_ID || "",

  guardaRoleId:
    import.meta.env.VITE_GUARDA_ROLE_ID || "",

  /**
   * Versão do percurso. Aumenta este número para obrigar os provisórios
   * a rever uma nova edição do tutorial.
   */
  version: 2,

  storageKey:
    "gnr-first-entry-v2",

  passScore:
    5,
} as const;

export function hasAnyRole(
  roles: string[] | undefined,
  roleIds: string[],
) {
  if (!Array.isArray(roles)) {
    return false;
  }

  return roleIds
    .filter(Boolean)
    .some((roleId) =>
      roles.includes(roleId),
    );
}

export function isOnboardingCompleted(
  discordId?: string,
) {
  if (!discordId) {
    return false;
  }

  try {
    const raw =
      window.localStorage.getItem(
        `${ONBOARDING_CONFIG.storageKey}:${discordId}`,
      );

    if (!raw) {
      return false;
    }

    const parsed =
      JSON.parse(raw);

    return (
      parsed?.completed === true &&
      parsed?.version ===
        ONBOARDING_CONFIG.version
    );
  } catch {
    return false;
  }
}

export function mustCompleteOnboarding(
  user:
    | {
        id?: string;
        roles?: string[];
      }
    | null
    | undefined,
) {
  if (
    !user ||
    !ONBOARDING_CONFIG.guardaProvisorioRoleId
  ) {
    return false;
  }

  const roles =
    user.roles || [];

  const isProvisional =
    roles.includes(
      ONBOARDING_CONFIG.guardaProvisorioRoleId,
    );

  const isGuardOrHigher =
    Boolean(
      ONBOARDING_CONFIG.guardaRoleId &&
      roles.includes(
        ONBOARDING_CONFIG.guardaRoleId,
      ),
    );

  return (
    isProvisional &&
    !isGuardOrHigher &&
    !isOnboardingCompleted(
      user.id,
    )
  );
}
