import UnitEvent from "../models/UnitEvent.js";
import { sendUnitEventDiscord } from "./unitDiscordService.js";

let timer: NodeJS.Timeout | null = null;
let running = false;

async function tick() {
  if (running) return;
  running = true;

  try {
    const now = new Date();
    const maxFuture = new Date(
      now.getTime() + 25 * 60 * 60 * 1000,
    );

    const events = await UnitEvent.find({
      status: "SCHEDULED",
      startsAt: {
        $gt: now,
        $lte: maxFuture,
      },
    }).limit(100);

    for (const event of events) {
      const diffMs =
        new Date(event.startsAt).getTime() -
        now.getTime();

      const ageMs =
        now.getTime() -
        new Date(event.createdAt).getTime();

      /*
       * Não enviar lembretes imediatamente depois de criar o evento.
       * O aviso inicial já foi publicado no Discord.
       */
      if (ageMs < 10 * 60 * 1000) {
        continue;
      }

      const isIn24HourWindow =
        diffMs >= 23.5 * 60 * 60 * 1000 &&
        diffMs <= 24.5 * 60 * 60 * 1000;

      const isIn1HourWindow =
        diffMs >= 45 * 60 * 1000 &&
        diffMs <= 75 * 60 * 1000;

      try {
        if (
          isIn1HourWindow &&
          !event.discord?.reminder1hAt
        ) {
          await sendUnitEventDiscord(
            event,
            "Evento dentro de 1 hora",
          );

          event.discord = {
            ...(event.discord as any),
            reminder1hAt: new Date(),
          } as any;

          await event.save();
        } else if (
          isIn24HourWindow &&
          !event.discord?.reminder24hAt
        ) {
          await sendUnitEventDiscord(
            event,
            "Evento amanhã",
          );

          event.discord = {
            ...(event.discord as any),
            reminder24hAt: new Date(),
          } as any;

          await event.save();
        }
      } catch (error: any) {
        console.error(
          "[UNIT REMINDER]",
          event._id,
          error?.message || error,
        );
      }
    }
  } finally {
    running = false;
  }
}

export function startUnitEventReminderWorker() {
  if (timer) return;
  timer = setInterval(() => void tick(), 60_000);
  timer.unref?.();
  void tick();
  console.log("[UNIT REMINDER] Worker iniciado.");
}
