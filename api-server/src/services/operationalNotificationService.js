import OperationalNotification from "../models/OperationalNotification.js";

export const COMMAND_GENERAL_ROLE_ID = "1147878942099906672";
export const NIC_DIRECTOR_ROLE_ID = "1296910327879045130";

function buildActionUrl(operationId) {
  return `/comando/aprovacoes?operation=${operationId}`;
}

export async function createOperationalNotification({
  operation,
  type,
  recipientDiscordId = null,
  recipientRoleId = null,
  priority = "NORMAL",
  title,
  message,
  metadata = {},
}) {
  return OperationalNotification.findOneAndUpdate(
    {
      operationId: operation._id,
      type,
      recipientDiscordId,
      recipientRoleId,
      completedAt: null,
    },
    {
      operationId: operation._id,
      operationTitle: operation.title,
      caseNumber: operation.caseNumber || null,
      type,
      recipientDiscordId,
      recipientRoleId,
      priority,
      title,
      message,
      actionUrl: buildActionUrl(operation._id),
      metadata,
      readAt: null,
      completedAt: null,
    },
    {
      upsert: true,
      new: true,
      runValidators: true,
    },
  );
}

export async function completeOperationalNotifications(
  operationId,
  types = [],
) {
  const filter = {
    operationId,
    completedAt: null,
  };

  if (types.length > 0) {
    filter.type = { $in: types };
  }

  await OperationalNotification.updateMany(filter, {
    completedAt: new Date(),
  });
}

export async function notifyReportPendingDirector(operation) {
  await completeOperationalNotifications(operation._id, [
    "CHANGES_REQUESTED",
  ]);

  return createOperationalNotification({
    operation,
    type: "REPORT_PENDING_DIRECTOR",
    recipientRoleId: NIC_DIRECTOR_ROLE_ID,
    priority: "ATTENTION",
    title: "Relatório aguarda o Diretor do NIC",
    message: `${operation.caseNumber || operation.title} está pronto para a primeira validação.`,
    metadata: {
      reportStatus: operation.reportStatus,
      responsibleDiscordId: operation.createdByDiscordId,
    },
  });
}

export async function notifyReportPendingCommand(operation) {
  await completeOperationalNotifications(operation._id, [
    "REPORT_PENDING_DIRECTOR",
  ]);

  return createOperationalNotification({
    operation,
    type: "REPORT_PENDING_COMMAND",
    recipientRoleId: COMMAND_GENERAL_ROLE_ID,
    priority: "URGENT",
    title: "Relatório aguarda o Comando-Geral",
    message: `${operation.caseNumber || operation.title} foi aprovado pelo Diretor do NIC.`,
    metadata: {
      directorName: operation.directorApproval?.actorName || null,
      directorCode: operation.directorApproval?.code || null,
    },
  });
}

export async function notifyChangesRequested(
  operation,
  requestedBy,
  note,
) {
  await completeOperationalNotifications(operation._id, [
    "REPORT_PENDING_DIRECTOR",
    "REPORT_PENDING_COMMAND",
  ]);

  return createOperationalNotification({
    operation,
    type: "CHANGES_REQUESTED",
    recipientDiscordId: operation.createdByDiscordId,
    priority: "URGENT",
    title: "Foram pedidas correções",
    message: `${requestedBy} pediu alterações ao processo ${operation.caseNumber || operation.title}.`,
    metadata: {
      note,
      requestedBy,
    },
  });
}

export async function notifyReadyForDocument(operation) {
  await completeOperationalNotifications(operation._id, [
    "REPORT_PENDING_COMMAND",
    "CHANGES_REQUESTED",
  ]);

  return createOperationalNotification({
    operation,
    type: "READY_FOR_DOCUMENT",
    recipientRoleId: COMMAND_GENERAL_ROLE_ID,
    priority: "ATTENTION",
    title: "Documento oficial pronto para emissão",
    message: `${operation.caseNumber || operation.title} concluiu a dupla validação.`,
    metadata: {
      commandCode: operation.commandApproval?.code || null,
      directorCode: operation.directorApproval?.code || null,
    },
  });
}

export async function notifyDocumentIssued(operation) {
  await completeOperationalNotifications(operation._id, [
    "READY_FOR_DOCUMENT",
  ]);

  const recipients = [
    operation.createdByDiscordId,
    operation.directorApproval?.actorDiscordId,
    operation.commandApproval?.actorDiscordId,
  ].filter(Boolean);

  for (const recipientDiscordId of [...new Set(recipients)]) {
    await createOperationalNotification({
      operation,
      type: "DOCUMENT_ISSUED",
      recipientDiscordId,
      priority: "NORMAL",
      title: "Documento oficial emitido",
      message: `${operation.caseNumber || operation.title} foi emitido e bloqueado como documento oficial.`,
      metadata: {
        verificationCode:
          operation.officialDocument?.verificationCode || null,
      },
    });
  }
}
