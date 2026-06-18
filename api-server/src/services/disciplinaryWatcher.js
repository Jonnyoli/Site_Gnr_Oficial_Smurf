import DisciplinaryRecord from "../models/DisciplinaryRecord.js";
import DisciplinaryRoleState from "../models/DisciplinaryRoleState.js";
import {
  DISCIPLINARY_CHANNEL_ID,
  DISCIPLINARY_ROLE_LIST,
  getRoleConfigByRoleId,
} from "./disciplinaryConfig.js";
import {
  fetchGuildMembers,
  fetchRecentChannelMessages,
} from "./discordRest.js";
import { parseDisciplinaryMessage } from "./disciplinaryParser.js";

let messageTimer = null;
let roleTimer = null;
let syncingMessages = false;
let syncingRoles = false;

export async function syncDisciplinaryMessages() {
  if (syncingMessages) return;
  syncingMessages = true;

  try {
    const messages = await fetchRecentChannelMessages(DISCIPLINARY_CHANNEL_ID, 100);

    for (const message of [...messages].reverse()) {
      const parsed = parseDisciplinaryMessage(message);
      if (!parsed) continue;

      const record = await DisciplinaryRecord.findOne({
        discordMessageId: parsed.discordMessageId,
      });

      if (record) {
        Object.assign(record, {
          fullContent: parsed.fullContent,
          reason: parsed.reason,
          sanction: parsed.sanction,
          targetName: parsed.targetName || record.targetName,
          targetRank: parsed.targetRank || record.targetRank,
          responsibleDiscordId: parsed.responsibleDiscordId || record.responsibleDiscordId,
          responsibleName: parsed.responsibleName || record.responsibleName,
        });

        if (!record.events.some((event) => event.type === "MESSAGE_SYNCED")) {
          record.events.push({
            type: "MESSAGE_SYNCED",
            roleId: parsed.roleId,
            label: "Mensagem disciplinar sincronizada",
            source: "DISCORD_MESSAGE",
            metadata: { discordMessageId: parsed.discordMessageId },
          });
        }

        await record.save();
      } else {
        await DisciplinaryRecord.create({
          ...parsed,
          status: "ACTIVE",
          events: [
            {
              type: "MESSAGE_SYNCED",
              roleId: parsed.roleId,
              label: "Mensagem disciplinar sincronizada",
              source: "DISCORD_MESSAGE",
              at: parsed.appliedAt,
              metadata: { discordMessageId: parsed.discordMessageId },
            },
          ],
        });
      }
    }
  } catch (error) {
    console.error("[disciplinary] Erro ao sincronizar mensagens:", error);
  } finally {
    syncingMessages = false;
  }
}

async function applyRole(member, roleConfig) {
  const userId = String(member.user.id);
  const displayName =
    member.nick ||
    member.user.global_name ||
    member.user.username ||
    userId;

  let record = await DisciplinaryRecord.findOne({
    targetDiscordId: userId,
    roleId: roleConfig.roleId,
    status: "ACTIVE",
  }).sort({ createdAt: -1 });

  if (!record) {
    record = await DisciplinaryRecord.create({
      targetDiscordId: userId,
      targetName: displayName,
      targetRank: null,
      type: roleConfig.type,
      status: "ACTIVE",
      title: roleConfig.title,
      reason: null,
      sanction: roleConfig.label,
      fullContent: "",
      discordMessageId: null,
      discordChannelId: DISCIPLINARY_CHANNEL_ID,
      roleId: roleConfig.roleId,
      responsibleDiscordId: null,
      responsibleName: "Sincronização automática",
      appliedAt: new Date(),
      events: [],
    });
  }

  if (!record.events.some((event) => event.type === "APPLIED" && event.roleId === roleConfig.roleId)) {
    record.events.push({
      type: "APPLIED",
      roleId: roleConfig.roleId,
      label: `${roleConfig.label} aplicada`,
      source: "ROLE_SYNC",
    });
    await record.save();
  }
}

async function removeRole(userId, roleConfig) {
  const record = await DisciplinaryRecord.findOne({
    targetDiscordId: userId,
    roleId: roleConfig.roleId,
    status: "ACTIVE",
  }).sort({ createdAt: -1 });

  if (!record) return;

  record.status = "REMOVED";
  record.removedAt = new Date();
  record.events.push({
    type: "REMOVED",
    roleId: roleConfig.roleId,
    label:
      roleConfig.type === "SUSPENSION"
        ? "Suspensão de Serviço levantada"
        : `${roleConfig.label} removida`,
    source: "ROLE_SYNC",
  });

  await record.save();
}

export async function syncDisciplinaryRoles() {
  if (syncingRoles) return;
  syncingRoles = true;

  try {
    const guildId = process.env.DISCORD_GUILD_ID;
    if (!guildId) throw new Error("DISCORD_GUILD_ID não está definido no .env");

    const members = await fetchGuildMembers(guildId);

    for (const member of members) {
      const userId = String(member.user.id);

      const current = DISCIPLINARY_ROLE_LIST
        .filter((role) => member.roles.includes(role.roleId))
        .map((role) => role.roleId);

      const state = await DisciplinaryRoleState.findOne({ discordUserId: userId });
      const previous = state?.activeRoleIds || [];

      for (const roleId of current.filter((id) => !previous.includes(id))) {
        const role = getRoleConfigByRoleId(roleId);
        if (role) await applyRole(member, role);
      }

      for (const roleId of previous.filter((id) => !current.includes(id))) {
        const role = getRoleConfigByRoleId(roleId);
        if (role) await removeRole(userId, role);
      }

      await DisciplinaryRoleState.findOneAndUpdate(
        { discordUserId: userId },
        {
          discordUserId: userId,
          displayName:
            member.nick ||
            member.user.global_name ||
            member.user.username ||
            userId,
          activeRoleIds: current,
          lastCheckedAt: new Date(),
        },
        { upsert: true, new: true }
      );
    }
  } catch (error) {
    console.error("[disciplinary] Erro ao sincronizar roles:", error);
  } finally {
    syncingRoles = false;
  }
}

export function startDisciplinaryWatcher() {
  if (process.env.DISCIPLINARY_WATCHER_ENABLED === "false") {
    console.log("[disciplinary] Watcher desativado");
    return;
  }

  console.log("[disciplinary] Watcher iniciado");

  void syncDisciplinaryMessages();
  void syncDisciplinaryRoles();

  messageTimer = setInterval(
    () => void syncDisciplinaryMessages(),
    Number(process.env.DISCIPLINARY_MESSAGE_SYNC_MS || 60000)
  );

  roleTimer = setInterval(
    () => void syncDisciplinaryRoles(),
    Number(process.env.DISCIPLINARY_ROLE_SYNC_MS || 120000)
  );
}

export function stopDisciplinaryWatcher() {
  if (messageTimer) clearInterval(messageTimer);
  if (roleTimer) clearInterval(roleTimer);

  messageTimer = null;
  roleTimer = null;
}
