import DRHAlert from "../models/DRHAlert.js";
import DRHProcess from "../models/DRHProcess.js";

function hoursBetween(start, end = new Date()) {
  if (!start) return 0;

  const date = new Date(start);

  if (Number.isNaN(date.getTime())) return 0;

  return Math.max(
    0,
    (end.getTime() - date.getTime()) /
      3_600_000,
  );
}

function daysBetween(start, end = new Date()) {
  return Math.floor(
    hoursBetween(start, end) / 24,
  );
}

function alertKey(type, discordId, extra = "") {
  return [
    type,
    discordId,
    extra,
  ]
    .filter(Boolean)
    .join(":");
}

function severityForInactivity(daysInactive) {
  if (daysInactive === null) return "CRITICAL";
  if (daysInactive >= 15) return "CRITICAL";
  if (daysInactive >= 8) return "HIGH";
  return "MEDIUM";
}

async function upsertAlert(payload) {
  return DRHAlert.findOneAndUpdate(
    { alertKey: payload.alertKey },
    {
      ...payload,
      lastDetectedAt: new Date(),
      $setOnInsert: {
        firstDetectedAt: new Date(),
      },
    },
    {
      upsert: true,
      new: true,
      runValidators: true,
    },
  );
}

export async function recalculateDRHAlerts(snapshot) {
  const now = new Date();
  const detectedKeys = new Set();

  for (const member of snapshot.roster || []) {
    const id = String(member.discordId);

    for (const openShift of member.openShiftDetails || []) {
      const openHours = hoursBetween(
        openShift.startTime,
        now,
      );

      if (openHours < 12) continue;

      const key = alertKey(
        "OPEN_SHIFT",
        id,
        openShift._id,
      );

      detectedKeys.add(key);

      await upsertAlert({
        alertKey: key,
        type: "OPEN_SHIFT",
        severity:
          openHours >= 48
            ? "CRITICAL"
            : openHours >= 24
              ? "HIGH"
              : "MEDIUM",
        subjectDiscordId: id,
        subjectName: member.name,
        title: "Folha de ponto aberta há demasiado tempo",
        description:
          `A folha está aberta há ${openHours.toFixed(1)} horas.`,
        metadata: {
          pointId: openShift._id,
          startedAt: openShift.startTime,
          openHours,
        },
      });
    }

    if (
      !member.hasAbsenceRole &&
      (
        member.daysInactive === null ||
        member.daysInactive >= 5
      )
    ) {
      const key = alertKey(
        "INACTIVITY",
        id,
      );

      detectedKeys.add(key);

      await upsertAlert({
        alertKey: key,
        type: "INACTIVITY",
        severity: severityForInactivity(
          member.daysInactive,
        ),
        subjectDiscordId: id,
        subjectName: member.name,
        title: "Militar com inatividade superior ao permitido",
        description:
          member.daysInactive === null
            ? "Não existe atividade registada."
            : `Sem atividade há ${member.daysInactive} dias.`,
        metadata: {
          daysInactive: member.daysInactive,
          lastActivityAt: member.lastActivityAt,
        },
      });
    }

    if (
      member.hasAbsenceRole &&
      !member.hasAbsenceTicket
    ) {
      const key = alertKey(
        "ABSENCE_WITHOUT_PROCESS",
        id,
      );

      detectedKeys.add(key);

      await upsertAlert({
        alertKey: key,
        type: "ABSENCE_WITHOUT_PROCESS",
        severity: "HIGH",
        subjectDiscordId: id,
        subjectName: member.name,
        title: "Ausência sem ticket encontrado",
        description:
          "O militar tem a role de ausência no Discord, mas não foi encontrado ticket no canal oficial.",
        metadata: {},
      });
    }

    if (
      member.hasAbsenceRole &&
      member.hasAbsenceTicket &&
      member.absence?.periodEnd &&
      new Date(member.absence.periodEnd) < now
    ) {
      const key = alertKey(
        "EXPIRED_ABSENCE_ROLE",
        id,
      );

      detectedKeys.add(key);

      await upsertAlert({
        alertKey: key,
        type: "EXPIRED_ABSENCE_ROLE",
        severity: "HIGH",
        subjectDiscordId: id,
        subjectName: member.name,
        title: "Ausência terminada com role ainda ativa",
        description:
          "A data prevista de regresso já passou, mas a role de ausência continua atribuída.",
        metadata: {
          periodEnd: member.absence.periodEnd,
          processId: member.absence.processId,
        },
      });
    }

    if (
      member.hasAbsenceTicket &&
      !member.hasAbsenceRole &&
      member.absence?.status === "OPEN"
    ) {
      const key = alertKey(
        "ABSENCE_WITHOUT_PROCESS",
        id,
        "TICKET_WITHOUT_ROLE",
      );

      detectedKeys.add(key);

      await upsertAlert({
        alertKey: key,
        type: "ABSENCE_WITHOUT_PROCESS",
        severity: "HIGH",
        subjectDiscordId: id,
        subjectName: member.name,
        title: "Ticket de ausência sem role atribuída",
        description:
          "Existe ticket de ausência ativo, mas o militar não tem a role oficial de ausência.",
        metadata: {
          ticketUrl:
            member.absence?.ticketUrl,
          ticketChannelId:
            member.absence?.ticketChannelId,
        },
      });
    }

    if (
      member.hasAbsenceTicket &&
      member.absence?.missingFields?.length
    ) {
      const key = alertKey(
        "ABSENCE_WITHOUT_PROCESS",
        id,
        "MISSING_TICKET_FIELDS",
      );

      detectedKeys.add(key);

      await upsertAlert({
        alertKey: key,
        type: "ABSENCE_WITHOUT_PROCESS",
        severity: "MEDIUM",
        subjectDiscordId: id,
        subjectName: member.name,
        title: "Ticket de ausência incompleto",
        description:
          `Faltam campos no ticket: ${member.absence.missingFields.join(", ")}.`,
        metadata: {
          missingFields:
            member.absence.missingFields,
          ticketUrl:
            member.absence?.ticketUrl,
        },
      });
    }

    if (
      member.hasAbsenceTicket &&
      member.absence?.status === "CLOSED" &&
      member.hasAbsenceRole
    ) {
      const key = alertKey(
        "EXPIRED_ABSENCE_ROLE",
        id,
        "CLOSED_TICKET_ROLE_ACTIVE",
      );

      detectedKeys.add(key);

      await upsertAlert({
        alertKey: key,
        type: "EXPIRED_ABSENCE_ROLE",
        severity: "HIGH",
        subjectDiscordId: id,
        subjectName: member.name,
        title: "Ticket fechado com role ainda ativa",
        description:
          "O ticket de ausência está fechado, mas a role oficial continua atribuída.",
        metadata: {
          ticketUrl:
            member.absence?.ticketUrl,
        },
      });
    }

    if (
      !member.rank ||
      member.rank === "Sem patente"
    ) {
      const key = alertKey(
        "MISSING_RANK",
        id,
      );

      detectedKeys.add(key);

      await upsertAlert({
        alertKey: key,
        type: "MISSING_RANK",
        severity: "MEDIUM",
        subjectDiscordId: id,
        subjectName: member.name,
        title: "Patente não reconhecida",
        description:
          "O sistema não conseguiu identificar a patente atual deste militar.",
        metadata: {
          rankSource: member.rankSource,
        },
      });
    }

    if (
      !member.unit ||
      member.unit === "Sem unidade" ||
      member.unit === "Patrulha"
    ) {
      const key = alertKey(
        "MISSING_UNIT",
        id,
      );

      detectedKeys.add(key);

      await upsertAlert({
        alertKey: key,
        type: "MISSING_UNIT",
        severity: "LOW",
        subjectDiscordId: id,
        subjectName: member.name,
        title: "Unidade não confirmada",
        description:
          "A unidade atual não está definida ou foi substituída pelo valor genérico.",
        metadata: {
          unit: member.unit,
        },
      });
    }

    const storedHours = Number(
      member.storedTotalHours || 0,
    );

    const calculatedHours = Number(
      member.calculatedPointHours || 0,
    );

    const difference = Math.abs(
      storedHours - calculatedHours,
    );

    if (
      storedHours > 0 &&
      calculatedHours > 0 &&
      difference >= 5
    ) {
      const key = alertKey(
        "HOURS_MISMATCH",
        id,
      );

      detectedKeys.add(key);

      await upsertAlert({
        alertKey: key,
        type: "HOURS_MISMATCH",
        severity:
          difference >= 20
            ? "HIGH"
            : "MEDIUM",
        subjectDiscordId: id,
        subjectName: member.name,
        title: "Diferença nas horas acumuladas",
        description:
          `Existe uma diferença de ${difference.toFixed(1)} horas entre o perfil e as folhas de ponto.`,
        metadata: {
          storedHours,
          calculatedHours,
          difference,
        },
      });
    }
  }

  const processes = await DRHProcess.find({
    status: {
      $in: [
        "OPEN",
        "AWAITING_COMMAND",
        "APPROVED",
      ],
    },
  }).lean();

  for (const process of processes) {
    const staleDays = daysBetween(
      process.updatedAt || process.createdAt,
      now,
    );

    if (staleDays < 5) continue;

    const key = alertKey(
      "STALE_PROCESS",
      process.subjectDiscordId,
      String(process._id),
    );

    detectedKeys.add(key);

    await upsertAlert({
      alertKey: key,
      type: "STALE_PROCESS",
      severity:
        staleDays >= 15
          ? "CRITICAL"
          : staleDays >= 8
            ? "HIGH"
            : "MEDIUM",
      subjectDiscordId:
        process.subjectDiscordId,
      subjectName:
        process.subjectName,
      title: "Processo DRH sem atualização",
      description:
        `O processo ${process.processNumber} está sem alterações há ${staleDays} dias.`,
      sourceType: "DRH_PROCESS",
      sourceId: process._id,
      metadata: {
        processNumber:
          process.processNumber,
        processType: process.type,
        staleDays,
      },
    });
  }

  await DRHAlert.updateMany(
    {
      alertKey: {
        $nin: [...detectedKeys],
      },
      "resolution.resolved": false,
    },
    {
      $set: {
        "resolution.resolved": true,
        "resolution.resolvedAt": new Date(),
        "resolution.note":
          "Resolvido automaticamente após nova sincronização.",
      },
    },
  );

  return DRHAlert.find({
    "resolution.resolved": false,
  })
    .sort({
      severity: -1,
      lastDetectedAt: -1,
    })
    .lean();
}

export async function resolveDRHAlert(
  alertId,
  actor,
  note = "",
) {
  const alert = await DRHAlert.findById(
    alertId,
  );

  if (!alert) {
    throw new Error("Alerta não encontrado.");
  }

  alert.resolution = {
    resolved: true,
    resolvedAt: new Date(),
    resolvedByDiscordId:
      actor?.discordId || null,
    resolvedByName:
      actor?.name || null,
    note,
  };

  await alert.save();

  return alert;
}
