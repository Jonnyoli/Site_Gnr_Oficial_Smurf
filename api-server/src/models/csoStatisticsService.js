import mongoose from "mongoose";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asNumber(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function normalizeId(value) {
  return String(value || "").trim();
}

function getCollection(name) {
  const db = mongoose.connection.db;

  if (!db) {
    throw new Error("A ligação ao MongoDB ainda não está disponível.");
  }

  return db.collection(name);
}

async function findFirstExistingCollection(names) {
  const db = mongoose.connection.db;

  if (!db) return null;

  const existing = await db
    .listCollections({}, { nameOnly: true })
    .toArray();

  const namesSet = new Set(existing.map((item) => item.name));

  return names.find((name) => namesSet.has(name)) || null;
}

function getRecordDiscordId(record) {
  return normalizeId(
    record?.discordId ||
      record?.userId ||
      record?.guardaId ||
      record?.guardDiscordId ||
      record?.memberId ||
      record?.id,
  );
}

function getHoursValue(record) {
  return asNumber(
    record?.horasRegistadas ||
      record?.horas ||
      record?.hours ||
      record?.durationHours ||
      record?.totalHours,
  );
}

function getDate(record) {
  const raw =
    record?.date ||
    record?.data ||
    record?.createdAt ||
    record?.startedAt ||
    record?.inicio ||
    record?.startTime;

  const date = raw ? new Date(raw) : null;

  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function getPatrolParticipants(record) {
  const direct = [
    ...asArray(record?.participants),
    ...asArray(record?.participantes),
    ...asArray(record?.members),
    ...asArray(record?.guardas),
  ];

  const commander = record?.commander || record?.comandante;

  if (commander) {
    direct.push(commander);
  }

  return direct
    .map((participant) => ({
      discordId: normalizeId(
        participant?.discordId ||
          participant?.userId ||
          participant?.guardaId ||
          participant?.id,
      ),
      name:
        participant?.name ||
        participant?.nome ||
        participant?.displayName ||
        participant?.username ||
        "Militar",
    }))
    .filter((participant) => participant.discordId);
}

function getPatrolDurationHours(record) {
  const direct = asNumber(
    record?.patrolHours ||
      record?.durationHours ||
      record?.horas ||
      record?.hours,
  );

  if (direct > 0) return direct;

  const startRaw =
    record?.startedAt ||
    record?.inicio ||
    record?.startTime;

  const endRaw =
    record?.completedAt ||
    record?.fim ||
    record?.endTime;

  if (!startRaw || !endRaw) return 0;

  const start = new Date(startRaw);
  const end = new Date(endRaw);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    end <= start
  ) {
    return 0;
  }

  return (end.getTime() - start.getTime()) / 3_600_000;
}

async function loadGuard(discordId) {
  const collectionName = await findFirstExistingCollection([
    "guardas",
    "guards",
    "officers",
    "members",
  ]);

  if (!collectionName) return null;

  return getCollection(collectionName).findOne({
    $or: [
      { discordId },
      { id: discordId },
      { userId: discordId },
      { _id: discordId },
    ],
  });
}

async function loadHourRecords(discordId) {
  const collectionName = await findFirstExistingCollection([
    "horas",
    "hours",
    "hourrecords",
    "timerecords",
    "pontos",
  ]);

  if (!collectionName) return [];

  return getCollection(collectionName)
    .find({
      $or: [
        { discordId },
        { userId: discordId },
        { guardaId: discordId },
        { guardDiscordId: discordId },
      ],
    })
    .toArray();
}

async function loadPatrolRecords(discordId) {
  const collectionName = await findFirstExistingCollection([
    "patrulhas",
    "patrols",
    "patrolrecords",
  ]);

  if (!collectionName) return [];

  return getCollection(collectionName)
    .find({
      $or: [
        { discordId },
        { userId: discordId },
        { guardaId: discordId },
        { guardDiscordId: discordId },
        { "participants.discordId": discordId },
        { "participantes.discordId": discordId },
        { "members.discordId": discordId },
        { "guardas.discordId": discordId },
        { "commander.discordId": discordId },
        { "comandante.discordId": discordId },
      ],
    })
    .toArray();
}

async function loadEvaluationRecords(discordId) {
  const collectionName = await findFirstExistingCollection([
    "avaliacoes",
    "evaluations",
    "sergeantevaluations",
  ]);

  if (!collectionName) return [];

  return getCollection(collectionName)
    .find({
      $or: [
        { discordId },
        { userId: discordId },
        { guardaId: discordId },
        { targetDiscordId: discordId },
        { evaluatedDiscordId: discordId },
      ],
    })
    .toArray();
}

async function loadAbsenceRecords(discordId) {
  const collectionName = await findFirstExistingCollection([
    "ausencias",
    "absences",
  ]);

  if (!collectionName) return [];

  return getCollection(collectionName)
    .find({
      $and: [
        {
          $or: [
            { discordId },
            { userId: discordId },
            { guardaId: discordId },
            { targetDiscordId: discordId },
          ],
        },
        {
          $or: [
            { active: true },
            { status: "ACTIVE" },
            { status: "APPROVED" },
          ],
        },
      ],
    })
    .toArray();
}

async function loadDisciplinaryRecords(discordId) {
  const collectionName = await findFirstExistingCollection([
    "disciplinaryrecords",
    "disciplinary",
    "disciplinar",
  ]);

  if (!collectionName) return [];

  return getCollection(collectionName)
    .find({
      $and: [
        {
          $or: [
            { discordId },
            { userId: discordId },
            { guardaId: discordId },
            { targetDiscordId: discordId },
          ],
        },
        {
          $or: [
            { active: true },
            { status: "ACTIVE" },
            { status: "APPLIED" },
          ],
        },
      ],
    })
    .toArray();
}

export async function buildGuardSnapshot(
  discordId,
  weekStart,
  weekEnd,
) {
  const id = normalizeId(discordId);

  if (!id) {
    throw new Error("Discord ID do guarda é obrigatório.");
  }

  const start = new Date(weekStart);
  const end = new Date(weekEnd);

  const monthStart = new Date(end);
  monthStart.setDate(monthStart.getDate() - 30);

  const [
    guard,
    hourRecords,
    patrolRecords,
    evaluationRecords,
    absenceRecords,
    disciplinaryRecords,
  ] = await Promise.all([
    loadGuard(id),
    loadHourRecords(id),
    loadPatrolRecords(id),
    loadEvaluationRecords(id),
    loadAbsenceRecords(id),
    loadDisciplinaryRecords(id),
  ]);

  const totalHours = hourRecords.reduce(
    (sum, record) => sum + getHoursValue(record),
    0,
  );

  const weeklyHours = hourRecords.reduce((sum, record) => {
    const date = getDate(record);

    if (!date || date < start || date > end) return sum;

    return sum + getHoursValue(record);
  }, 0);

  const monthlyHours = hourRecords.reduce((sum, record) => {
    const date = getDate(record);

    if (!date || date < monthStart || date > end) return sum;

    return sum + getHoursValue(record);
  }, 0);

  const partnerMap = new Map();
  let patrolHours = 0;
  let patrolCount = 0;
  let soloPatrols = 0;
  let jointPatrols = 0;

  for (const patrol of patrolRecords) {
    const participants = getPatrolParticipants(patrol);
    const includesGuard = participants.some(
      (participant) => participant.discordId === id,
    );

    if (!includesGuard && getRecordDiscordId(patrol) !== id) {
      continue;
    }

    patrolCount += 1;

    const duration = getPatrolDurationHours(patrol);
    patrolHours += duration;

    const partners = participants.filter(
      (participant) => participant.discordId !== id,
    );

    if (partners.length === 0) {
      soloPatrols += 1;
    } else {
      jointPatrols += 1;
    }

    for (const partner of partners) {
      const existing = partnerMap.get(partner.discordId) || {
        discordId: partner.discordId,
        name: partner.name,
        count: 0,
        patrolHours: 0,
      };

      existing.count += 1;
      existing.patrolHours += duration;
      partnerMap.set(partner.discordId, existing);
    }
  }

  const evaluationValues = evaluationRecords
    .map((record) =>
      asNumber(
        record?.score ||
          record?.nota ||
          record?.value ||
          record?.average,
      ),
    )
    .filter((value) => value > 0);

  const evaluationAverage =
    evaluationValues.length > 0
      ? evaluationValues.reduce((sum, value) => sum + value, 0) /
        evaluationValues.length
      : 0;

  const points = asNumber(
    guard?.pontos ||
      guard?.points ||
      guard?.score ||
      guard?.pontuacao,
  );

  return {
    guard: {
      discordId: id,
      name:
        guard?.nome ||
        guard?.name ||
        guard?.displayName ||
        guard?.username ||
        `Guarda ${id}`,
      rank: guard?.posto || guard?.rank || null,
      unit: guard?.unidade || guard?.unit || null,
    },

    snapshot: {
      capturedAt: new Date(),
      totalHours,
      weeklyHours,
      monthlyHours,
      points,
      patrolHours,
      patrolCount,
      soloPatrols,
      jointPatrols,
      evaluationCount: evaluationRecords.length,
      evaluationAverage,
      activeAbsences: absenceRecords.length,
      activeSanctions: disciplinaryRecords.length,
      patrolPartners: [...partnerMap.values()].sort(
        (a, b) => b.count - a.count,
      ),
      sourceSummary: {
        hoursCollectionRecords: hourRecords.length,
        patrolCollectionRecords: patrolRecords.length,
        evaluationCollectionRecords: evaluationRecords.length,
      },
    },
  };
}
