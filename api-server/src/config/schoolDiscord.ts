export const SCHOOL_DISCORD = {
  guildId: "1262916006980878468",

  roles: {
    director: "1281057403512557629",
    deputyDirector: "1370108936237224167",
    supervisor: "1262916007106711660",

    recruitmentManager: "1262916007106711659",
    recruiter: "1262916007073288209",
    traineeRecruiter: "1373646116276670524",

    trainerManager: "1262916007106711658",
    trainerTeam: "1262916007090192412",
    trainerCFO: "1272543272253915148",
    trainerNegotiation: "1327811003471101972",
    trainerCFS: "1293358732251762749",

    examinerManager: "1503041584613163088",
    examinerCFG: "1374862493125443664",
  },

  trainers: [
    {
      key: "DIOGO_SILVA",
      name: "Diogo Silva",
      trainerRoleId: "1262916007090192410",
      studentRoleId: "1471547882388721674",
      categoryId: "1471546206541844658",
      chatChannelId: "1471548752186703992",
      trainingLogChannelId: "1471548962879180903",
    },
    {
      key: "SMURF_OLIVEIRA",
      name: "Smurf Oliveira",
      trainerRoleId: "1319708935707430963",
      studentRoleId: "1471547997778346198",
      categoryId: "1471546424847241329",
      chatChannelId: "1471549144140087431",
      trainingLogChannelId: "1471549185936326870",
    },
    {
      key: "JOHNNY_ED",
      name: "Johnny Ed",
      trainerRoleId: "1262916007090192409",
      studentRoleId: "1471548070968823949",
      categoryId: "1471546328881434706",
      chatChannelId: "1471549167598829691",
      trainingLogChannelId: "1471549210489782273",
    },
    {
      key: "CARLOS_FONSECA",
      name: "Carlos Fonseca",
      trainerRoleId: "1482504126406459452",
      studentRoleId: "1482504302311243936",
      categoryId: "1482503994378031187",
      chatChannelId: "1482504667756892341",
      trainingLogChannelId: "1482504887119122664",
    },
    {
      key: "DUARTE_PETINGA",
      name: "Duarte Petinga",
      trainerRoleId: "1482759793654370344",
      studentRoleId: "1482760090392985710",
      categoryId: "1482760308236746833",
      chatChannelId: "1482760369779904533",
      trainingLogChannelId: "1482760416382947478",
    },
    {
      key: "ANDRE_BIFANAS",
      name: "André Bifanas",
      trainerRoleId: "1491780046812348496",
      studentRoleId: "1491780176298639511",
      categoryId: "1491779713792737432",
      chatChannelId: "1491779591143030984",
      trainingLogChannelId: "1491779610340491417",
    },
  ],
} as const;

export const SCHOOL_LEADERSHIP_ROLE_IDS = [
  SCHOOL_DISCORD.roles.director,
  SCHOOL_DISCORD.roles.deputyDirector,
  SCHOOL_DISCORD.roles.supervisor,
];

export const SCHOOL_TRAINER_ROLE_IDS = [
  SCHOOL_DISCORD.roles.trainerManager,
  SCHOOL_DISCORD.roles.trainerTeam,
  SCHOOL_DISCORD.roles.trainerCFO,
  SCHOOL_DISCORD.roles.trainerNegotiation,
  SCHOOL_DISCORD.roles.trainerCFS,
  ...SCHOOL_DISCORD.trainers.map((item) => item.trainerRoleId),
];

export const SCHOOL_EXAMINER_ROLE_IDS = [
  SCHOOL_DISCORD.roles.examinerManager,
  SCHOOL_DISCORD.roles.examinerCFG,
];

export const SCHOOL_RECRUITMENT_ROLE_IDS = [
  SCHOOL_DISCORD.roles.recruitmentManager,
  SCHOOL_DISCORD.roles.recruiter,
  SCHOOL_DISCORD.roles.traineeRecruiter,
];

export function trainerProfileForRoles(roleIds: string[]) {
  return SCHOOL_DISCORD.trainers.find((trainer) =>
    roleIds.includes(trainer.trainerRoleId),
  ) || null;
}

export function assignedTrainerForStudentRoles(roleIds: string[]) {
  return SCHOOL_DISCORD.trainers.find((trainer) =>
    roleIds.includes(trainer.studentRoleId),
  ) || null;
}
