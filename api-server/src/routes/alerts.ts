import { Router } from "express";
import { AuditLog, Ponto, User, Ticket, CP } from "../models";

const router = Router();

function mapAuditToAlert(log: any) {
  let color = "blue";
  let title = "Informação do Sistema";

  if (log.severity === "critical") {
    color = "red";
    title = "Alerta Crítico";
  }

  if (log.severity === "warning") {
    color = "yellow";
    title = "Aviso Operacional";
  }

  if (log.severity === "success") {
    color = "green";
    title = "Evento Confirmado";
  }

  return {
    id: log._id.toString(),
    type: log.severity,
    color,
    title,
    module: log.module,
    action: log.action,
    description: log.description,
    actorName: log.actorName,
    targetName: log.targetName,
    createdAt: log.createdAt,
    metadata: log.metadata || {},
  };
}

router.get("/", async (req, res) => {
  try {
    const auditAlerts = await AuditLog.find({
      severity: { $in: ["warning", "critical", "success"] },
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const alerts = auditAlerts.map(mapAuditToAlert);

    res.json(alerts);
  } catch (error: any) {
    console.error("[ALERTS GET] Erro:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/live", async (req, res) => {
  try {
    const now = new Date();

    const startOfWeek = new Date(now);
    const currentDay = now.getDay();
    const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
    startOfWeek.setDate(now.getDate() - distanceToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const pontos = await Ponto.find({
      status: "FECHADO",
      endTime: { $gte: startOfWeek },
    }).lean();

    const users = await User.find().lean();
    const userMap = new Map(users.map((u: any) => [String(u.discordId), u]));

    const hoursByUser = new Map<string, number>();

    for (const ponto of pontos as any[]) {
      if (!ponto.userId || !ponto.startTime || !ponto.endTime) continue;

      const durationMs =
        new Date(ponto.endTime).getTime() -
        new Date(ponto.startTime).getTime() -
        (ponto.totalPauseTime || 0);

      const hours = Math.max(0, durationMs / 3600000);

      hoursByUser.set(
        String(ponto.userId),
        (hoursByUser.get(String(ponto.userId)) || 0) + hours,
      );
    }

    const excessoHoras = [...hoursByUser.entries()]
      .filter(([, hours]) => hours >= 40)
      .map(([userId, hours]) => {
        const user = userMap.get(userId) as any;

        return {
          id: `weekly-hours-${userId}`,
          type: "warning",
          color: "yellow",
          title: "Excesso de Horas Semanais",
          module: "Horas",
          action: "WEEKLY_HOURS_LIMIT",
          description: `${user?.warName || user?.name || userId} atingiu ${hours.toFixed(
            1,
          )}h esta semana.`,
          actorName: "Sistema",
          targetName: user?.warName || user?.name || userId,
          createdAt: now,
          metadata: {
            userId,
            hours: Number(hours.toFixed(1)),
          },
        };
      });

    const patrulhasCanceladas = await CP.find({
      status: { $in: ["CANCELADA", "CANCELADO", "CANCELED"] },
    })
      .sort({ updatedAt: -1 })
      .limit(10)
      .lean();

    const patrolAlerts = patrulhasCanceladas.map((cp: any) => ({
      id: `patrol-cancelled-${cp._id}`,
      type: "warning",
      color: "yellow",
      title: "Patrulha Cancelada",
      module: "Patrulhas",
      action: "PATROL_CANCELLED",
      description: `A patrulha ${cp.number || cp._id} foi cancelada.`,
      actorName: "Sistema",
      targetName: cp.number || cp._id.toString(),
      createdAt: cp.updatedAt || cp.startTime || now,
      metadata: {
        patrolId: cp._id.toString(),
      },
    }));

    const recentDocs = await Ticket.find({
      status: { $in: ["ARCHIVED", "CLOSED"] },
      closedAt: {
        $gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    })
      .sort({ closedAt: -1 })
      .limit(10)
      .lean();

    const docAlerts = recentDocs.map((doc: any) => ({
      id: `document-${doc._id}`,
      type: "success",
      color: "green",
      title: "Novo Documento Arquivado",
      module: "Arquivos",
      action: "DOCUMENT_ARCHIVED",
      description: `Documento ${doc.type || "Geral"} foi arquivado.`,
      actorName: "Sistema",
      targetName: doc.channelId || doc._id.toString(),
      createdAt: doc.closedAt || now,
      metadata: {
        ticketId: doc._id.toString(),
      },
    }));

    res.json([...excessoHoras, ...patrolAlerts, ...docAlerts]);
  } catch (error: any) {
    console.error("[ALERTS LIVE] Erro:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;