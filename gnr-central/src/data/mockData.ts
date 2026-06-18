export type Estado = "Em serviço" | "Folga" | "Ausente";

export type Posto =
  | "Comandante Geral"
  | "Tenente General"
  | "Major General"
  | "Brigadeiro General"
  | "Coronel"
  | "Tenente Coronel"
  | "Major"
  | "Capitão"
  | "Tenente"
  | "Alferes"
  | "Aspirante a Oficial"
  | "Sargento Mor"
  | "Sargento Chefe"
  | "Primeiro Sargento"
  | "Segundo Sargento"
  | "Furriel"
  | "Cabo Mor"
  | "Cabo Chefe"
  | "Cabo"
  | "Guarda Principal"
  | "Guarda"
  | "Guarda Provisório"
  | "Sem Posto";

export type Unidade = "Patrulha" | "Investigação" | "Trânsito" | "Operações";

export type HierarchyGroup =
  | "COMANDO_GERAL"
  | "OFICIAIS"
  | "SARGENTOS"
  | "GUARDAS"
  | "CFG"
  | "SEM_POSTO";

export interface Guarda {
  id: string;
  nome: string;
  numero: string;
  posto: Posto | string;
  unidade: Unidade;
  horasDiarias: number;
  horasSemanais: number;
  horasMensais: number;
  horasTotal: number;
  estado: Estado;
  dataIngresso: string;

  discordId?: string | null;
  avatar?: string | null;
  discordStatus?: "online" | "idle" | "dnd" | "offline" | string;
  isDiscordOnline?: boolean;
  isOnDuty?: boolean;

  hierarchyGroup?: HierarchyGroup | string;
  hierarchyGroupLabel?: string;
  hierarchyGroupOrder?: number;
  hierarchyOrder?: number;
  rankRoleId?: string;
  groupRoleId?: string;

  roles?: string[];
  discordRoles?: string[];
  savedTags?: string[];
}

export interface Arquivo {
  id: string;
  nome: string;
  tipo: string;
  dataCriacao: string;
  responsavel: string;
  tamanho: string;
  url?: string;
}

export interface HoraServico {
  id: string;
  guardaId: string;
  guardaNome: string;
  data: string;
  horasRegistadas: number;
  tipo: "Normal" | "Extra" | "Noturno";
  descricao: string;
  aprovado: boolean;
}

export const mockGuardas: Guarda[] = [
  {
    id: "1",
    nome: "Comando Demo",
    numero: "GNR-001",
    posto: "Comandante Geral",
    unidade: "Operações",
    horasDiarias: 8,
    horasSemanais: 40,
    horasMensais: 160,
    horasTotal: 3500,
    estado: "Em serviço",
    dataIngresso: "2005-08-14",
    avatar: null,
    discordStatus: "online",
    isDiscordOnline: true,
    isOnDuty: true,
    hierarchyGroup: "COMANDO_GERAL",
    hierarchyGroupLabel: "Comando Geral",
    hierarchyGroupOrder: 1,
    hierarchyOrder: 1,
    rankRoleId: "1147878942099906675",
    groupRoleId: "1147878942099906672",
    roles: ["1147878942099906672", "1147878942099906675"],
    discordRoles: ["1147878942099906672", "1147878942099906675"],
    savedTags: ["1147878942099906672", "1147878942099906675"]
  },
  {
    id: "2",
    nome: "José Ferreira",
    numero: "GNR-010",
    posto: "Capitão",
    unidade: "Operações",
    horasDiarias: 8,
    horasSemanais: 40,
    horasMensais: 160,
    horasTotal: 2800,
    estado: "Em serviço",
    dataIngresso: "2010-09-01",
    avatar: null,
    discordStatus: "online",
    isDiscordOnline: true,
    isOnDuty: true,
    hierarchyGroup: "OFICIAIS",
    hierarchyGroupLabel: "Oficiais",
    hierarchyGroupOrder: 2,
    hierarchyOrder: 13,
    rankRoleId: "1223666812068040778",
    groupRoleId: "1147878942066364488",
    roles: ["1147878942066364488", "1223666812068040778"],
    discordRoles: ["1147878942066364488", "1223666812068040778"],
    savedTags: ["1147878942066364488", "1223666812068040778"]
  },
  {
    id: "3",
    nome: "Maria Santos",
    numero: "GNR-003",
    posto: "Tenente",
    unidade: "Investigação",
    horasDiarias: 8,
    horasSemanais: 40,
    horasMensais: 160,
    horasTotal: 2100,
    estado: "Em serviço",
    dataIngresso: "2012-02-20",
    avatar: null,
    discordStatus: "online",
    isDiscordOnline: true,
    isOnDuty: true,
    hierarchyGroup: "OFICIAIS",
    hierarchyGroupLabel: "Oficiais",
    hierarchyGroupOrder: 2,
    hierarchyOrder: 14,
    rankRoleId: "1147878942066364490",
    groupRoleId: "1147878942066364488",
    roles: ["1147878942066364488", "1147878942066364490"],
    discordRoles: ["1147878942066364488", "1147878942066364490"],
    savedTags: ["1147878942066364488", "1147878942066364490"]
  },
  {
    id: "4",
    nome: "Rui Fernandes",
    numero: "GNR-006",
    posto: "Alferes",
    unidade: "Operações",
    horasDiarias: 8,
    horasSemanais: 45,
    horasMensais: 180,
    horasTotal: 1500,
    estado: "Folga",
    dataIngresso: "2016-07-22",
    avatar: null,
    discordStatus: "offline",
    isDiscordOnline: false,
    isOnDuty: false,
    hierarchyGroup: "OFICIAIS",
    hierarchyGroupLabel: "Oficiais",
    hierarchyGroupOrder: 2,
    hierarchyOrder: 15,
    rankRoleId: "1328323809648054313",
    groupRoleId: "1147878942066364488",
    roles: ["1147878942066364488", "1328323809648054313"],
    discordRoles: ["1147878942066364488", "1328323809648054313"],
    savedTags: ["1147878942066364488", "1328323809648054313"]
  },
  {
    id: "5",
    nome: "João Silva",
    numero: "GNR-001",
    posto: "Primeiro Sargento",
    unidade: "Operações",
    horasDiarias: 8,
    horasSemanais: 40,
    horasMensais: 160,
    horasTotal: 1900,
    estado: "Em serviço",
    dataIngresso: "2015-05-12",
    avatar: null,
    discordStatus: "online",
    isDiscordOnline: true,
    isOnDuty: true,
    hierarchyGroup: "SARGENTOS",
    hierarchyGroupLabel: "Sargentos",
    hierarchyGroupOrder: 3,
    hierarchyOrder: 22,
    rankRoleId: "1147878942024400984",
    groupRoleId: "1147891694260461688",
    roles: ["1147891694260461688", "1147878942024400984"],
    discordRoles: ["1147891694260461688", "1147878942024400984"],
    savedTags: ["1147891694260461688", "1147878942024400984"]
  },
  {
    id: "6",
    nome: "Pedro Martins",
    numero: "GNR-007",
    posto: "Segundo Sargento",
    unidade: "Investigação",
    horasDiarias: 8,
    horasSemanais: 40,
    horasMensais: 160,
    horasTotal: 1800,
    estado: "Folga",
    dataIngresso: "2017-10-05",
    avatar: null,
    discordStatus: "offline",
    isDiscordOnline: false,
    isOnDuty: false,
    hierarchyGroup: "SARGENTOS",
    hierarchyGroupLabel: "Sargentos",
    hierarchyGroupOrder: 3,
    hierarchyOrder: 23,
    rankRoleId: "1147878942024400982",
    groupRoleId: "1147891694260461688",
    roles: ["1147891694260461688", "1147878942024400982"],
    discordRoles: ["1147891694260461688", "1147878942024400982"],
    savedTags: ["1147891694260461688", "1147878942024400982"]
  },
  {
    id: "7",
    nome: "António Costa",
    numero: "GNR-002",
    posto: "Cabo",
    unidade: "Patrulha",
    horasDiarias: 8,
    horasSemanais: 42,
    horasMensais: 168,
    horasTotal: 950,
    estado: "Folga",
    dataIngresso: "2018-02-20",
    avatar: null,
    discordStatus: "offline",
    isDiscordOnline: false,
    isOnDuty: false,
    hierarchyGroup: "GUARDAS",
    hierarchyGroupLabel: "Guardas",
    hierarchyGroupOrder: 4,
    hierarchyOrder: 32,
    rankRoleId: "1192168841162264586",
    groupRoleId: "1147878942024400978",
    roles: ["1147878942024400978", "1192168841162264586"],
    discordRoles: ["1147878942024400978", "1192168841162264586"],
    savedTags: ["1147878942024400978", "1192168841162264586"]
  },
  {
    id: "8",
    nome: "Marta Sousa",
    numero: "GNR-008",
    posto: "Cabo",
    unidade: "Trânsito",
    horasDiarias: 8,
    horasSemanais: 40,
    horasMensais: 160,
    horasTotal: 850,
    estado: "Em serviço",
    dataIngresso: "2019-01-18",
    avatar: null,
    discordStatus: "online",
    isDiscordOnline: true,
    isOnDuty: true,
    hierarchyGroup: "GUARDAS",
    hierarchyGroupLabel: "Guardas",
    hierarchyGroupOrder: 4,
    hierarchyOrder: 32,
    rankRoleId: "1192168841162264586",
    groupRoleId: "1147878942024400978",
    roles: ["1147878942024400978", "1192168841162264586"],
    discordRoles: ["1147878942024400978", "1192168841162264586"],
    savedTags: ["1147878942024400978", "1192168841162264586"]
  },
  {
    id: "9",
    nome: "Ana Rodrigues",
    numero: "GNR-005",
    posto: "Guarda Principal",
    unidade: "Patrulha",
    horasDiarias: 8,
    horasSemanais: 40,
    horasMensais: 160,
    horasTotal: 600,
    estado: "Em serviço",
    dataIngresso: "2020-03-10",
    avatar: null,
    discordStatus: "online",
    isDiscordOnline: true,
    isOnDuty: true,
    hierarchyGroup: "GUARDAS",
    hierarchyGroupLabel: "Guardas",
    hierarchyGroupOrder: 4,
    hierarchyOrder: 33,
    rankRoleId: "1147891354253406273",
    groupRoleId: "1147878942024400978",
    roles: ["1147878942024400978", "1147891354253406273"],
    discordRoles: ["1147878942024400978", "1147891354253406273"],
    savedTags: ["1147878942024400978", "1147891354253406273"]
  },
  {
    id: "10",
    nome: "Luís Alves",
    numero: "GNR-009",
    posto: "Guarda",
    unidade: "Patrulha",
    horasDiarias: 8,
    horasSemanais: 40,
    horasMensais: 160,
    horasTotal: 300,
    estado: "Em serviço",
    dataIngresso: "2022-04-30",
    avatar: null,
    discordStatus: "online",
    isDiscordOnline: true,
    isOnDuty: true,
    hierarchyGroup: "GUARDAS",
    hierarchyGroupLabel: "Guardas",
    hierarchyGroupOrder: 4,
    hierarchyOrder: 34,
    rankRoleId: "1147878942024400980",
    groupRoleId: "1147878942024400978",
    roles: ["1147878942024400978", "1147878942024400980"],
    discordRoles: ["1147878942024400978", "1147878942024400980"],
    savedTags: ["1147878942024400978", "1147878942024400980"]
  },
  {
    id: "11",
    nome: "Sofia Ribeiro",
    numero: "GNR-011",
    posto: "Guarda",
    unidade: "Investigação",
    horasDiarias: 8,
    horasSemanais: 40,
    horasMensais: 160,
    horasTotal: 450,
    estado: "Folga",
    dataIngresso: "2021-06-08",
    avatar: null,
    discordStatus: "offline",
    isDiscordOnline: false,
    isOnDuty: false,
    hierarchyGroup: "GUARDAS",
    hierarchyGroupLabel: "Guardas",
    hierarchyGroupOrder: 4,
    hierarchyOrder: 34,
    rankRoleId: "1147878942024400980",
    groupRoleId: "1147878942024400978",
    roles: ["1147878942024400978", "1147878942024400980"],
    discordRoles: ["1147878942024400978", "1147878942024400980"],
    savedTags: ["1147878942024400978", "1147878942024400980"]
  },
  {
    id: "12",
    nome: "Hugo Carvalho",
    numero: "GNR-012",
    posto: "Guarda Provisório",
    unidade: "Patrulha",
    horasDiarias: 12,
    horasSemanais: 60,
    horasMensais: 240,
    horasTotal: 1100,
    estado: "Ausente",
    dataIngresso: "2023-12-01",
    avatar: null,
    discordStatus: "offline",
    isDiscordOnline: false,
    isOnDuty: false,
    hierarchyGroup: "CFG",
    hierarchyGroupLabel: "CFG",
    hierarchyGroupOrder: 5,
    hierarchyOrder: 40,
    rankRoleId: "1220872536938643547",
    groupRoleId: "1372304263807631430",
    roles: ["1372304263807631430", "1220872536938643547"],
    discordRoles: ["1372304263807631430", "1220872536938643547"],
    savedTags: ["1372304263807631430", "1220872536938643547"]
  }
];

export const mockArquivos: Arquivo[] = [
  {
    id: "1",
    nome: "Relatório de Ocorrências - Nov",
    tipo: "Relatório",
    dataCriacao: "2023-11-30",
    responsavel: "Capitão José Ferreira",
    tamanho: "2.4 MB"
  },
  {
    id: "2",
    nome: "Decreto Lei 45/2023",
    tipo: "Decreto",
    dataCriacao: "2023-10-15",
    responsavel: "Ministério da Administração Interna",
    tamanho: "1.2 MB"
  },
  {
    id: "3",
    nome: "Circular Interna - Fardamento",
    tipo: "Circular",
    dataCriacao: "2023-12-05",
    responsavel: "Comando Geral",
    tamanho: "0.8 MB"
  },
  {
    id: "4",
    nome: "Ordem de Serviço 112/2023",
    tipo: "Ordem de Serviço",
    dataCriacao: "2023-12-10",
    responsavel: "Comando Territorial",
    tamanho: "1.5 MB"
  },
  {
    id: "5",
    nome: "Escala de Serviço - Dezembro",
    tipo: "Documento",
    dataCriacao: "2023-11-25",
    responsavel: "Primeiro Sargento João Silva",
    tamanho: "3.1 MB"
  },
  {
    id: "6",
    nome: "Relatório Anual 2022",
    tipo: "Relatório",
    dataCriacao: "2023-01-15",
    responsavel: "Capitão José Ferreira",
    tamanho: "5.6 MB"
  }
];

export const mockHorasServico: HoraServico[] = [
  {
    id: "1",
    guardaId: "1",
    guardaNome: "Comando Demo",
    data: "2023-12-10",
    horasRegistadas: 8,
    tipo: "Normal",
    descricao: "Gestão operacional",
    aprovado: true
  },
  {
    id: "2",
    guardaId: "2",
    guardaNome: "José Ferreira",
    data: "2023-12-10",
    horasRegistadas: 8,
    tipo: "Normal",
    descricao: "Coordenação operacional",
    aprovado: true
  },
  {
    id: "3",
    guardaId: "3",
    guardaNome: "Maria Santos",
    data: "2023-12-09",
    horasRegistadas: 4,
    tipo: "Extra",
    descricao: "Investigação processo 453",
    aprovado: true
  },
  {
    id: "4",
    guardaId: "4",
    guardaNome: "Rui Fernandes",
    data: "2023-12-08",
    horasRegistadas: 10,
    tipo: "Extra",
    descricao: "Operação especial",
    aprovado: false
  },
  {
    id: "5",
    guardaId: "5",
    guardaNome: "João Silva",
    data: "2023-12-11",
    horasRegistadas: 8,
    tipo: "Normal",
    descricao: "Gestão de equipa",
    aprovado: false
  },
  {
    id: "6",
    guardaId: "6",
    guardaNome: "Pedro Martins",
    data: "2023-12-07",
    horasRegistadas: 8,
    tipo: "Normal",
    descricao: "Investigação local",
    aprovado: true
  },
  {
    id: "7",
    guardaId: "7",
    guardaNome: "António Costa",
    data: "2023-12-11",
    horasRegistadas: 8,
    tipo: "Normal",
    descricao: "Patrulha",
    aprovado: true
  },
  {
    id: "8",
    guardaId: "8",
    guardaNome: "Marta Sousa",
    data: "2023-12-07",
    horasRegistadas: 8,
    tipo: "Normal",
    descricao: "Fiscalização rodoviária",
    aprovado: true
  },
  {
    id: "9",
    guardaId: "9",
    guardaNome: "Ana Rodrigues",
    data: "2023-12-08",
    horasRegistadas: 8,
    tipo: "Normal",
    descricao: "Patrulha zona norte",
    aprovado: true
  },
  {
    id: "10",
    guardaId: "10",
    guardaNome: "Luís Alves",
    data: "2023-12-06",
    horasRegistadas: 8,
    tipo: "Normal",
    descricao: "Patrulha zona sul",
    aprovado: true
  },
  {
    id: "11",
    guardaId: "11",
    guardaNome: "Sofia Ribeiro",
    data: "2023-12-10",
    horasRegistadas: 8,
    tipo: "Normal",
    descricao: "Análise de processos",
    aprovado: true
  },
  {
    id: "12",
    guardaId: "12",
    guardaNome: "Hugo Carvalho",
    data: "2023-12-10",
    horasRegistadas: 12,
    tipo: "Noturno",
    descricao: "Turno noturno estendido",
    aprovado: true
  }
];