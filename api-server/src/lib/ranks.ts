export type RankGroup =
  | "COMANDO_GERAL"
  | "OFICIAIS"
  | "SARGENTOS"
  | "GUARDAS"
  | "CFG"
  | "SEM_POSTO";

export type RankMeta = {
  roleId: string;
  name: string;
  group: RankGroup;
  groupLabel: string;
  groupRoleId: string;
  order: number;
  groupOrder: number;
};

export const DISCORD_RANKS: RankMeta[] = [
  // COMANDO GERAL
  {
    roleId: "1147878942099906675",
    name: "Comandante Geral",
    group: "COMANDO_GERAL",
    groupLabel: "Comando Geral",
    groupRoleId: "1147878942099906672",
    order: 1,
    groupOrder: 1
  },
  {
    roleId: "1295137039645282314",
    name: "Tenente General",
    group: "COMANDO_GERAL",
    groupLabel: "Comando Geral",
    groupRoleId: "1147878942099906672",
    order: 2,
    groupOrder: 1
  },
  {
    roleId: "1147878942099906674",
    name: "Major General",
    group: "COMANDO_GERAL",
    groupLabel: "Comando Geral",
    groupRoleId: "1147878942099906672",
    order: 3,
    groupOrder: 1
  },
  {
    roleId: "1371979085768691792",
    name: "Brigadeiro General",
    group: "COMANDO_GERAL",
    groupLabel: "Comando Geral",
    groupRoleId: "1147878942099906672",
    order: 4,
    groupOrder: 1
  },

  // OFICIAIS
  {
    roleId: "1328275784879570964",
    name: "Coronel",
    group: "OFICIAIS",
    groupLabel: "Oficiais",
    groupRoleId: "1147878942066364488",
    order: 10,
    groupOrder: 2
  },
  {
    roleId: "1147878942066364495",
    name: "Tenente Coronel",
    group: "OFICIAIS",
    groupLabel: "Oficiais",
    groupRoleId: "1147878942066364488",
    order: 11,
    groupOrder: 2
  },
  {
    roleId: "1147878942066364493",
    name: "Major",
    group: "OFICIAIS",
    groupLabel: "Oficiais",
    groupRoleId: "1147878942066364488",
    order: 12,
    groupOrder: 2
  },
  {
    roleId: "1223666812068040778",
    name: "Capitão",
    group: "OFICIAIS",
    groupLabel: "Oficiais",
    groupRoleId: "1147878942066364488",
    order: 13,
    groupOrder: 2
  },
  {
    roleId: "1147878942066364490",
    name: "Tenente",
    group: "OFICIAIS",
    groupLabel: "Oficiais",
    groupRoleId: "1147878942066364488",
    order: 14,
    groupOrder: 2
  },
  {
    roleId: "1328323809648054313",
    name: "Alferes",
    group: "OFICIAIS",
    groupLabel: "Oficiais",
    groupRoleId: "1147878942066364488",
    order: 15,
    groupOrder: 2
  },
  {
    roleId: "1273223192340598885",
    name: "Aspirante a Oficial",
    group: "OFICIAIS",
    groupLabel: "Oficiais",
    groupRoleId: "1147878942066364488",
    order: 16,
    groupOrder: 2
  },

  // SARGENTOS
  {
    roleId: "1263884839237718088",
    name: "Sargento Mor",
    group: "SARGENTOS",
    groupLabel: "Sargentos",
    groupRoleId: "1147891694260461688",
    order: 20,
    groupOrder: 3
  },
  {
    roleId: "1263884687340732466",
    name: "Sargento Chefe",
    group: "SARGENTOS",
    groupLabel: "Sargentos",
    groupRoleId: "1147891694260461688",
    order: 21,
    groupOrder: 3
  },
  {
    roleId: "1147878942024400984",
    name: "Primeiro Sargento",
    group: "SARGENTOS",
    groupLabel: "Sargentos",
    groupRoleId: "1147891694260461688",
    order: 22,
    groupOrder: 3
  },
  {
    roleId: "1147878942024400982",
    name: "Segundo Sargento",
    group: "SARGENTOS",
    groupLabel: "Sargentos",
    groupRoleId: "1147891694260461688",
    order: 23,
    groupOrder: 3
  },
  {
    roleId: "1366111180246093956",
    name: "Furriel",
    group: "SARGENTOS",
    groupLabel: "Sargentos",
    groupRoleId: "1147891694260461688",
    order: 24,
    groupOrder: 3
  },

  // GUARDAS
  {
    roleId: "1366110811692728350",
    name: "Cabo Mor",
    group: "GUARDAS",
    groupLabel: "Guardas",
    groupRoleId: "1147878942024400978",
    order: 30,
    groupOrder: 4
  },
  {
    roleId: "1282815824092205066",
    name: "Cabo Chefe",
    group: "GUARDAS",
    groupLabel: "Guardas",
    groupRoleId: "1147878942024400978",
    order: 31,
    groupOrder: 4
  },
  {
    roleId: "1192168841162264586",
    name: "Cabo",
    group: "GUARDAS",
    groupLabel: "Guardas",
    groupRoleId: "1147878942024400978",
    order: 32,
    groupOrder: 4
  },
  {
    roleId: "1147891354253406273",
    name: "Guarda Principal",
    group: "GUARDAS",
    groupLabel: "Guardas",
    groupRoleId: "1147878942024400978",
    order: 33,
    groupOrder: 4
  },
  {
    roleId: "1147878942024400980",
    name: "Guarda",
    group: "GUARDAS",
    groupLabel: "Guardas",
    groupRoleId: "1147878942024400978",
    order: 34,
    groupOrder: 4
  },

  // CFG
  {
    roleId: "1220872536938643547",
    name: "Guarda Provisório",
    group: "CFG",
    groupLabel: "CFG",
    groupRoleId: "1372304263807631430",
    order: 40,
    groupOrder: 5
  }
];

export function getHighestRankMeta(roleIds: string[] = []) {
  const ranks = DISCORD_RANKS
    .filter((rank) => roleIds.includes(rank.roleId))
    .sort((a, b) => a.order - b.order);

  if (ranks.length > 0) {
    return ranks[0];
  }

  return {
    roleId: "",
    name: "Sem Posto",
    group: "SEM_POSTO" as RankGroup,
    groupLabel: "Sem Posto",
    groupRoleId: "",
    order: 999,
    groupOrder: 999
  };
}

export function getHighestRank(roleIds: string[] = []) {
  return getHighestRankMeta(roleIds).name;
}