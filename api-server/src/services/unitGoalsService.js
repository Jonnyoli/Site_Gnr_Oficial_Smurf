import UnitOperation from "../models/UnitOperation.js";
import UnitWeeklyProgress from "../models/UnitWeeklyProgress.js";

export const WEEKLY_GOALS = {
  UNT: [
    { goalId: "unt-stop", label: "Operação STOP", target: 1 },
    { goalId: "unt-cp", label: "CPs motorizadas ou patrulhas rodoviárias", target: 2 },
    { goalId: "unt-recruit-training", label: "Recrutamento / Treino / Formação", target: 1 },
  ],
  DI: [
    { goalId: "di-recruit", label: "Recrutamento", target: 1 },
    { goalId: "di-training", label: "Treino / Formação", target: 1 },
    { goalId: "di-civil-control", label: "Operações de controlo e segurança civil", target: 3 },
    { goalId: "di-ushe", label: "Patrulha conjunta com a USHE", target: 1 },
  ],
  USHE: [
    { goalId: "ushe-recruit", label: "Recrutamento", target: 1 },
    { goalId: "ushe-training", label: "Formação / Treino", target: 1 },
    { goalId: "ushe-urban", label: "Patrulhas urbanas", target: 2 },
    { goalId: "ushe-joint", label: "Operação conjunta com DI ou outra unidade", target: 1 },
  ],
  GIOE: [
    { goalId: "gioe-raids", label: "Rusgas obrigatórias", target: 2 },
    { goalId: "gioe-training", label: "Treino tático", target: 1 },
    { goalId: "gioe-high-risk", label: "Operação de alto risco ou apoio especial", target: 1 },
  ],
  NIC: [
    { goalId: "nic-recruit", label: "Recrutamento", target: 1 },
    { goalId: "nic-investigations", label: "Investigações ativas ou acompanhamentos criminais", target: 2 },
    { goalId: "nic-joint", label: "Operação conjunta com outra unidade", target: 1 },
    { goalId: "nic-intel", label: "Ações de recolha de informação/provas", target: 2 },
  ],
  GSA: [
    { goalId: "gsa-recruit", label: "Recrutamento", target: 1 },
    { goalId: "gsa-eagles", label: "Unidades Eagles obrigatórias", target: 4 },
    { goalId: "gsa-training", label: "Treino semanal", target: 1 },
    { goalId: "gsa-preventive", label: "Patrulha preventiva em zonas críticas", target: 1 },
  ],
  EG: [
    { goalId: "eg-recruitments", label: "Recrutamentos semanais mínimos", target: 2 },
  ],
};

export function getWeekRange(date = new Date()) {
  const start = new Date(date);
  const day = start.getDay();
  const distanceToMonday = day === 0 ? 6 : day - 1;

  start.setDate(start.getDate() - distanceToMonday);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function countCategory(operations, category) {
  return operations.filter((operation) => operation.category === category).length;
}

function countJoint(operations, otherUnit = null) {
  return operations.filter((operation) => {
    const units = [operation.primaryUnit, ...(operation.supportUnits || [])];

    if (new Set(units).size < 2) return false;

    return otherUnit ? units.includes(otherUnit) : true;
  }).length;
}

function calculateAutomaticValue(goalId, operations) {
  switch (goalId) {
    case "unt-stop": return countCategory(operations, "STOP");
    case "unt-cp": return countCategory(operations, "MOTORIZED_PATROL");
    case "unt-recruit-training":
      return countCategory(operations, "RECRUITMENT") + countCategory(operations, "TRAINING");
    case "di-recruit": return countCategory(operations, "RECRUITMENT");
    case "di-training": return countCategory(operations, "TRAINING");
    case "di-civil-control": return countCategory(operations, "CIVIL_SECURITY");
    case "di-ushe": return countJoint(operations, "USHE");
    case "ushe-recruit": return countCategory(operations, "RECRUITMENT");
    case "ushe-training": return countCategory(operations, "TRAINING");
    case "ushe-urban": return countCategory(operations, "URBAN_PATROL");
    case "ushe-joint": return countJoint(operations);
    case "gioe-raids": return countCategory(operations, "RAID");
    case "gioe-training": return countCategory(operations, "TRAINING");
    case "gioe-high-risk": return countCategory(operations, "HIGH_RISK");
    case "nic-recruit": return countCategory(operations, "RECRUITMENT");
    case "nic-investigations": return countCategory(operations, "INVESTIGATION");
    case "nic-joint": return countJoint(operations);
    case "nic-intel": return countCategory(operations, "INTELLIGENCE");
    case "gsa-recruit": return countCategory(operations, "RECRUITMENT");
    case "gsa-eagles": return countCategory(operations, "EAGLE");
    case "gsa-training": return countCategory(operations, "TRAINING");
    case "gsa-preventive": return countCategory(operations, "PREVENTIVE_PATROL");
    case "eg-recruitments": return countCategory(operations, "RECRUITMENT");
    default: return 0;
  }
}

export async function recalculateUnitWeek(unit, date = new Date(), actor = null) {
  const { start, end } = getWeekRange(date);
  const goalDefinitions = WEEKLY_GOALS[unit] || [];

  const operations = await UnitOperation.find({
    status: { $in: ["COMPLETED", "OFFICIAL_DOCUMENT_ISSUED"] },
    reportStatus: "VALIDATED",
    "directorApproval.status": "APPROVED",
    "commandApproval.status": "APPROVED",
    completedAt: { $gte: start, $lte: end },
    $or: [{ primaryUnit: unit }, { supportUnits: unit }],
  }).lean();

  let progress = await UnitWeeklyProgress.findOne({ unit, weekStart: start });

  const manualAdjustments = Object.fromEntries(
    (progress?.goals || []).map((goal) => [
      goal.goalId,
      Number(goal.manualAdjustment || 0),
    ]),
  );

  const goals = goalDefinitions.map((definition) => {
    const automaticValue = calculateAutomaticValue(definition.goalId, operations);
    const manualAdjustment = Number(manualAdjustments[definition.goalId] || 0);
    const current = Math.max(0, automaticValue + manualAdjustment);

    return {
      ...definition,
      automaticValue,
      manualAdjustment,
      current,
      completed: current >= definition.target,
    };
  });

  const targetActions = goals.reduce((sum, goal) => sum + goal.target, 0);
  const completedActions = goals.reduce(
    (sum, goal) => sum + Math.min(goal.current, goal.target),
    0,
  );

  const percentage =
    targetActions > 0
      ? Math.min(100, Math.round((completedActions / targetActions) * 100))
      : 0;

  return UnitWeeklyProgress.findOneAndUpdate(
    { unit, weekStart: start },
    {
      unit,
      weekStart: start,
      weekEnd: end,
      goals,
      targetActions,
      completedActions,
      percentage,
      lastCalculatedAt: new Date(),
      updatedByDiscordId: actor?.discordId || null,
      updatedByName: actor?.name || null,
    },
    { upsert: true, new: true, runValidators: true },
  );
}

export async function recalculateAllUnits(date = new Date(), actor = null) {
  const results = [];

  for (const unit of Object.keys(WEEKLY_GOALS)) {
    results.push(await recalculateUnitWeek(unit, date, actor));
  }

  return results;
}
