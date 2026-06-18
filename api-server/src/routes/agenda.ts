import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";

import AgendaNotification from "../models/AgendaNotification.js";
import {
  getAgendaEvents,
  getGuildMembers,
  sendDirectMessage,
  UNIT_ROLE_IDS,
} from "../services/discordFeedService.js";

const router = Router();

const COMMAND_ROLE_ID = "1147878942099906672";
const DEV_USER_ID = "713719718091030599";

function currentUser(req: Request) {
  return req.session?.user || null;
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!currentUser(req)) {
    res.status(401).json({ error: "É necessário iniciar sessão." });
    return;
  }

  next();
}

function requireCommand(req: Request, res: Response, next: NextFunction) {
  const user = currentUser(req);
  const roles = Array.isArray(user?.roles) ? user.roles.map(String) : [];

  if (
    String(user?.id || "") !== DEV_USER_ID &&
    !roles.includes(COMMAND_ROLE_ID)
  ) {
    res.status(403).json({
      error: "Apenas o Comando-Geral pode enviar notificações.",
    });
    return;
  }

  next();
}

router.get("/", requireAuth, async (_req, res) => {
  try {
    return res.json({ events: await getAgendaEvents() });
  } catch (error) {
    return res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Não foi possível carregar a agenda.",
    });
  }
});

router.post(
  "/:eventId/notify",
  requireAuth,
  requireCommand,
  async (req, res) => {
    try {
      const events = await getAgendaEvents();
      const event = events.find((item) => item.id === req.params.eventId);

      if (!event) {
        return res.status(404).json({ error: "Evento não encontrado." });
      }

      if (event.unit === "GERAL") {
        return res.status(400).json({
          error: "O evento não indica uma unidade reconhecida.",
        });
      }

      const roleId = UNIT_ROLE_IDS[event.unit];
      const members = await getGuildMembers();
      const targets = members.filter((member) =>
        (member.roles || []).map(String).includes(roleId),
      );

      let sent = 0;
      let failed = 0;

      for (const member of targets) {
        const discordId = String(member?.user?.id || "");
        if (!discordId || member?.user?.bot) continue;

        const exists = await AgendaNotification.findOne({
          eventKey: event.eventKey,
          discordId,
        }).lean();

        if (exists?.status === "SENT") continue;

        const content = [
          `📅 **Agenda da ${event.unit}**`,
          `**${event.title}**`,
          `🕒 ${new Date(event.startsAt).toLocaleString("pt-PT")}`,
          event.description.slice(0, 900),
          event.jumpUrl ? `🔗 ${event.jumpUrl}` : "",
        ]
          .filter(Boolean)
          .join("\n");

        try {
          await sendDirectMessage(discordId, content);

          await AgendaNotification.findOneAndUpdate(
            { eventKey: event.eventKey, discordId },
            {
              eventKey: event.eventKey,
              discordId,
              unit: event.unit,
              sentAt: new Date(),
              status: "SENT",
              error: null,
            },
            { upsert: true, new: true },
          );

          sent += 1;
        } catch (error) {
          await AgendaNotification.findOneAndUpdate(
            { eventKey: event.eventKey, discordId },
            {
              eventKey: event.eventKey,
              discordId,
              unit: event.unit,
              sentAt: new Date(),
              status: "FAILED",
              error:
                error instanceof Error
                  ? error.message
                  : "Erro desconhecido",
            },
            { upsert: true, new: true },
          );

          failed += 1;
        }
      }

      return res.json({
        ok: true,
        unit: event.unit,
        total: targets.length,
        sent,
        failed,
      });
    } catch (error) {
      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível notificar a unidade.",
      });
    }
  },
);

export default router;
