const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(
    /\/$/,
    "",
  ) || "";

export type GuardMedal = {
  id: string;
  emoji: string;
  name: string;
  shortName: string;
  points: number;
  order: number;
};

export type FullGuardProfile = {
  generatedAt: string;
  discordId: string;

  guard: any;

  profile: {
    biography: string;
    motto: string;
    updatedAt?: string | null;
  };

  cosmetics: {
    ownedItems: string[];
    equipped: {
      frame?: string | null;
      background?: string | null;
      title?: string | null;
      theme?: string | null;
      badges?: string[];
    };
  };

  career: {
    events: any[];
    promotions: any[];
    demotions: any[];
    medals: any[];
    unitChanges: any[];
    roleChanges: any[];
  };

  awards: {
    current: GuardMedal[];
    historical: any[];
    medals: GuardMedal[];
    total: number;
    points: number;
    roleIds: string[];
    topMedal: GuardMedal | null;
  };

  hours: {
    summary: {
      total: number;
      normal: number;
      night: number;
      records: number;
    };
    records: any[];
    latest: any[];
  };

  operational: {
    activePoint: any | null;
    activeCP: any | null;
    points: any[];
    cps: any[];
    commandedCPs: any[];
  };

  disciplinary: {
    items: any[];
    active: any[];
    total: number;
  };

  school: {
    trainings: any[];
    quizAttempts: any[];
    legacyTrainings: any[];
    exams: any[];
    certificates: any[];
    stats: {
      completedTrainings: number;
      approvedExams: number;
      certificates: number;
    };
  };

  evaluations: {
    sergeant: any[];
    hierarchical: any[];
    approvedAverage: number | null;
  };
};

export async function fetchFullGuardProfile(
  discordId: string,
): Promise<FullGuardProfile> {
  const response =
    await fetch(
      `${API_BASE_URL}/api/guard-profiles/${encodeURIComponent(
        discordId,
      )}/full`,
      {
        credentials:
          "include",
        cache:
          "no-store",
        headers: {
          Accept:
            "application/json",
        },
      },
    );

  const payload =
    await response
      .json()
      .catch(
        () => null,
      );

  if (!response.ok) {
    throw new Error(
      payload?.error ||
      `Não foi possível carregar o dossier completo. Código ${response.status}.`,
    );
  }

  return payload;
}
