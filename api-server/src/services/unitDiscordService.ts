import Unit from "../models/Unit.js";

const TYPE_LABELS: Record<string, string> = {
  RECRUITMENT: "Recrutamento",
  TRAINING: "Treino",
  FORMATION: "Formação",
  OPERATION: "Operação",
  MEETING: "Reunião",
  JOINT_PATROL: "Patrulha conjunta",
  CEREMONY: "Cerimónia",
  OTHER: "Evento",
};

export const ATTENDANCE_EMOJIS = {
  PRESENT: "✅",
  MAYBE: "❓",
  ABSENT: "❌",
} as const;

function webhookForUnit(unitCode: string) {
  return (
    process.env[`UNIT_${unitCode}_WEBHOOK_URL`] ||
    process.env.UNIT_EVENTS_WEBHOOK_URL ||
    ""
  );
}

function withWait(webhookUrl: string) {
  const url = new URL(webhookUrl);
  url.searchParams.set("wait", "true");
  return url.toString();
}

function discordHeaders() {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) throw new Error("DISCORD_BOT_TOKEN não definido no backend.");
  return {
    Authorization: `Bot ${token}`,
    "Content-Type": "application/json",
  };
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function discordRequest(
  path: string,
  init: RequestInit = {},
  attempt = 1,
): Promise<Response> {
  const response = await fetch(`https://discord.com/api/v10${path}`, {
    ...init,
    headers: {
      ...discordHeaders(),
      ...(init.headers || {}),
    },
  });

  if (response.status === 429 && attempt <= 5) {
    const data: any = await response.json().catch(() => ({}));
    const retryAfterMs = Math.max(
      250,
      Math.ceil(Number(data?.retry_after || 1) * 1000),
    );

    await wait(retryAfterMs);

    return discordRequest(path, init, attempt + 1);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Discord API ${response.status}: ${body.slice(0, 250)}`);
  }

  return response;
}

export async function addAttendanceReactions(
  channelId: string,
  messageId: string,
) {
  const failures: { emoji: string; error: string }[] = [];

  for (const emoji of Object.values(ATTENDANCE_EMOJIS)) {
    try {
      await discordRequest(
        `/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}/@me`,
        { method: "PUT" },
      );
    } catch (error: any) {
      failures.push({
        emoji,
        error: error?.message || String(error),
      });
    }

    // Evita que o Discord limite as três reações consecutivas.
    await wait(400);
  }

  return {
    ok: failures.length === 0,
    failures,
  };
}

export async function setDiscordAttendanceReaction(
  channelId: string,
  messageId: string,
  userId: string,
  status: keyof typeof ATTENDANCE_EMOJIS | null,
) {
  for (const [key, emoji] of Object.entries(ATTENDANCE_EMOJIS)) {
    const path = `/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}/${userId}`;

    if (status === key) {
      // O backend não consegue adicionar uma reação "como" o utilizador.
      // A reação escolhida pelo site é representada pela base de dados;
      // removemos apenas as reações Discord incompatíveis.
      continue;
    }

    await discordRequest(path, { method: "DELETE" }).catch(() => null);
  }
}

export async function sendUnitEventDiscord(event: any, reminderLabel?: string) {
  const unit = await Unit.findOne({ code: event.unitCode }).lean();
  if (!unit) throw new Error(`Unidade ${event.unitCode} não configurada.`);

  const webhookUrl = webhookForUnit(event.unitCode);
  if (!webhookUrl) return { sent: false, reason: "Webhook não configurado." };

  const roleMention = unit.memberRoleId ? `<@&${unit.memberRoleId}>` : "";
  const title = reminderLabel
    ? `⏰ ${reminderLabel} — ${unit.shortName}`
    : `📅 ${unit.shortName} — ${TYPE_LABELS[event.type] || "Evento"}`;

  const lines = [
    roleMention,
    `## ${title}`,
    `**${event.title}**`,
    event.description || null,
    `📅 **Data:** <t:${Math.floor(new Date(event.startsAt).getTime() / 1000)}:F>`,
    event.location ? `📍 **Local:** ${event.location}` : null,
    event.responsibleName ? `👤 **Responsável:** ${event.responsibleName}` : null,
    event.attendanceEnabled
      ? "\nReage para confirmar:\n✅ Presente · ❓ Talvez · ❌ Ausente"
      : null,
  ].filter(Boolean);

  const response = await fetch(withWait(webhookUrl), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: lines.join("\n"),
      allowed_mentions: { roles: unit.memberRoleId ? [unit.memberRoleId] : [] },
    }),
  });

  if (!response.ok) throw new Error(`Discord respondeu ${response.status}.`);

  const message: any = await response.json();
  const channelId = String(message.channel_id || "");
  const messageId = String(message.id || "");

  let reactionResult: any = {
    ok: false,
    failures: [],
  };

  if (!reminderLabel && event.attendanceEnabled && channelId && messageId) {
    reactionResult = await addAttendanceReactions(
      channelId,
      messageId,
    );

    if (!reactionResult.ok) {
      console.warn(
        "[UNIT DISCORD] Algumas reações não foram adicionadas:",
        reactionResult.failures,
      );
    }
  }

  return {
    sent: true,
    channelId,
    messageId,
    jumpUrl:
      message.guild_id && channelId && messageId
        ? `https://discord.com/channels/${message.guild_id}/${channelId}/${messageId}`
        : null,
    reactionsReady:
      Boolean(
        !reminderLabel &&
        event.attendanceEnabled &&
        reactionResult.ok,
      ),
    reactionErrors:
      reactionResult.failures || [],
  };
}
