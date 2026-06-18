import { DISCIPLINARY_ROLES } from "./disciplinaryConfig.js";

function normalize(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

export function detectDisciplinaryType(content) {
  const text = normalize(content);

  if (text.includes("SUSPENSAO DE SERVICO")) return "SUSPENSION";
  if (text.includes("2º REPREENSAO") || text.includes("2ª REPREENSAO") || text.includes("2.ª REPREENSAO")) return "SECOND_WARNING";
  if (text.includes("1º REPREENSAO") || text.includes("1ª REPREENSAO") || text.includes("1.ª REPREENSAO")) return "FIRST_WARNING";

  return null;
}

export function parseDisciplinaryMessage(message) {
  const type = detectDisciplinaryType(message?.content);
  if (!type) return null;

  const mentionId =
    message?.mentions?.[0]?.id ||
    String(message?.content || "").match(/<@!?(\d{15,25})>/)?.[1];

  if (!mentionId) return null;

  const role = DISCIPLINARY_ROLES[type];
  const content = String(message.content || "");

  const personMatch =
    content.match(/\*\*Guarda visado\*\*\s*:\s*`([^`]+)`/i) ||
    content.match(/Guarda visado\s*:\s*`([^`]+)`/i);

  const [targetName, ...rankParts] = personMatch
    ? personMatch[1].replace(/;$/, "").split(",").map((v) => v.trim())
    : [null];

  const sanction =
    content.match(/\*\*Sanção Aplicada:\*\*\s*`([^`]+)`/i)?.[1]?.trim() ||
    content.match(/Sanção Aplicada\s*:\s*`([^`]+)`/i)?.[1]?.trim() ||
    null;

  const facts = content.match(
    /\*\*Factos Apurados\*\*([\s\S]*?)(?:\*\*Sanção Aplicada:\*\*|$)/i
  )?.[1];

  return {
    targetDiscordId: String(mentionId),
    targetName: targetName || null,
    targetRank: rankParts?.join(", ") || null,
    type,
    title: role.title,
    reason: facts ? facts.replace(/---/g, " ").replace(/\s+/g, " ").trim().slice(0, 1000) : null,
    sanction,
    fullContent: content,
    discordMessageId: String(message.id),
    discordChannelId: String(message.channel_id),
    roleId: role.roleId,
    responsibleDiscordId: message?.author?.id ? String(message.author.id) : null,
    responsibleName: message?.author?.global_name || message?.author?.username || null,
    appliedAt: message?.timestamp ? new Date(message.timestamp) : new Date(),
  };
}
