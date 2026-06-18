import crypto from "crypto";
import DepartmentOfficialDocument from "../models/DepartmentOfficialDocument.js";
import ExecutiveDecision from "../models/ExecutiveDecision.js";
import DepartmentDeadline from "../models/DepartmentDeadline.js";

export function nextReference(prefix) {
  const year = new Date().getFullYear();
  const token = crypto.randomBytes(3).toString("hex").toUpperCase();

  return `${prefix}-${year}-${token}`;
}

export function calculateRecordCleanupAmount(incidents) {
  const safeIncidents = Math.max(0, Number(incidents || 0));
  return Math.min(500000, 150000 + safeIncidents * 50000);
}

export async function createExecutiveDecision({
  sourceDepartment,
  sourceType,
  sourceId,
  title,
  summary,
  priority = "NORMAL",
  dueAt = null,
  actor = null,
}) {
  const existing = await ExecutiveDecision.findOne({
    sourceDepartment,
    sourceType,
    sourceId,
    status: "PENDING",
  });

  if (existing) return existing;

  return ExecutiveDecision.create({
    sourceDepartment,
    sourceType,
    sourceId,
    title,
    summary,
    priority,
    dueAt,
    requestedByDiscordId: actor?.discordId || null,
    requestedByName: actor?.name || null,
  });
}

export async function createDeadline({
  department,
  sourceType,
  sourceId,
  title,
  dueAt,
  assignedDiscordId = null,
  assignedName = null,
}) {
  if (!dueAt) return null;

  return DepartmentDeadline.create({
    department,
    sourceType,
    sourceId,
    title,
    dueAt,
    assignedDiscordId,
    assignedName,
  });
}

export async function issueDepartmentDocument({
  department,
  documentType,
  title,
  sourceModel,
  sourceId,
  payload,
  html,
  actor,
  confidentiality = "RESTRICTED",
}) {
  const documentNumber = nextReference(department);
  const verificationCode = nextReference("VER");
  const documentHash = crypto
    .createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");

  return DepartmentOfficialDocument.create({
    department,
    documentType,
    documentNumber,
    title,
    status: "ISSUED",
    sourceModel,
    sourceId,
    verificationCode,
    documentHash,
    version: 1,
    confidentiality,
    payload,
    html,
    signatures: [
      {
        role: "DEPARTMENT_DIRECTOR",
        discordId: actor?.discordId || null,
        name: actor?.name || department,
        title: `Responsável do ${department}`,
        signedAt: new Date(),
        signatureCode: nextReference("SIG"),
      },
    ],
    versions: [
      {
        version: 1,
        generatedAt: new Date(),
        generatedByDiscordId: actor?.discordId || null,
        generatedByName: actor?.name || null,
        documentHash,
        reason: "Emissão inicial",
      },
    ],
    issuedAt: new Date(),
    issuedByDiscordId: actor?.discordId || null,
    issuedByName: actor?.name || null,
  });
}
