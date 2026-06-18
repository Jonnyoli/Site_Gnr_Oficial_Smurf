import SchoolDiscordMember from "../models/SchoolDiscordMember";
import {
  SCHOOL_DISCORD,
  assignedTrainerForStudentRoles,
  trainerProfileForRoles,
} from "../config/schoolDiscord";

const API = "https://discord.com/api/v10";
const CACHE_MS = 5 * 60 * 1000;
const memory = new Map<string, { roleIds: string[]; expiresAt: number }>();

function token() {
  return process.env.SCHOOL_DISCORD_BOT_TOKEN || process.env.DISCORD_BOT_TOKEN || "";
}

function headers() {
  const value = token();
  if (!value) throw new Error("SCHOOL_DISCORD_BOT_TOKEN/DISCORD_BOT_TOKEN não definido.");
  return { Authorization: `Bot ${value}`, "Content-Type": "application/json" };
}

function avatarUrl(user: any) {
  if (!user?.avatar) return null;
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=256`;
}

async function discord(path: string) {
  const response = await fetch(`${API}${path}`, { headers: headers() });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Discord API ${response.status}: ${body.slice(0, 300)}`);
  }
  return response.json();
}

export async function fetchSchoolMember(discordId: string) {
  const member = await discord(`/guilds/${SCHOOL_DISCORD.guildId}/members/${discordId}`);
  const roleIds = Array.isArray(member.roles) ? member.roles.map(String) : [];
  const trainer = trainerProfileForRoles(roleIds);
  const assignedTrainer = assignedTrainerForStudentRoles(roleIds);

  const saved = await SchoolDiscordMember.findOneAndUpdate(
    { guildId: SCHOOL_DISCORD.guildId, discordId },
    {
      $set: {
        username: member.user?.username || "",
        displayName: member.nick || member.user?.global_name || member.user?.username || discordId,
        avatarUrl: avatarUrl(member.user),
        roleIds,
        isInGuild: true,
        trainerKey: trainer?.key || null,
        assignedTrainerKey: assignedTrainer?.key || null,
        syncedAt: new Date(),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();

  memory.set(discordId, { roleIds, expiresAt: Date.now() + CACHE_MS });
  return saved;
}

export async function getSchoolRoleIds(discordId: string) {
  const cached = memory.get(discordId);
  if (cached && cached.expiresAt > Date.now()) return cached.roleIds;

  try {
    const member: any = await fetchSchoolMember(discordId);
    return member?.roleIds || [];
  } catch (error: any) {
    if (error?.message?.includes("Discord API 404")) {
      await SchoolDiscordMember.findOneAndUpdate(
        { guildId: SCHOOL_DISCORD.guildId, discordId },
        { $set: { isInGuild: false, roleIds: [], syncedAt: new Date() } },
      );
      return [];
    }

    const stored: any = await SchoolDiscordMember.findOne({
      guildId: SCHOOL_DISCORD.guildId,
      discordId,
      isInGuild: true,
    }).lean();

    if (stored) return stored.roleIds || [];
    throw error;
  }
}

export async function attachSchoolDiscordContext(req: any, _res: any, next: any) {
  try {
    const id = String(req.session?.user?.id || "");
    req.schoolRoles = id ? await getSchoolRoleIds(id) : [];
    req.schoolDiscordConnected = true;
  } catch (error: any) {
    req.schoolRoles = [];
    req.schoolDiscordConnected = false;
    req.schoolDiscordError = error?.message || String(error);
  }
  next();
}

export async function syncSchoolGuildMembers() {
  let after = "0";
  let processed = 0;
  const currentIds = new Set<string>();

  while (true) {
    const members = await discord(
      `/guilds/${SCHOOL_DISCORD.guildId}/members?limit=1000&after=${after}`,
    );

    if (!Array.isArray(members) || !members.length) break;

    const operations = members
      .filter((member: any) => !member.user?.bot)
      .map((member: any) => {
        const discordId = String(member.user.id);
        const roleIds = Array.isArray(member.roles) ? member.roles.map(String) : [];
        const trainer = trainerProfileForRoles(roleIds);
        const assignedTrainer = assignedTrainerForStudentRoles(roleIds);
        currentIds.add(discordId);

        return {
          updateOne: {
            filter: { guildId: SCHOOL_DISCORD.guildId, discordId },
            update: {
              $set: {
                username: member.user?.username || "",
                displayName: member.nick || member.user?.global_name || member.user?.username || discordId,
                avatarUrl: avatarUrl(member.user),
                roleIds,
                isInGuild: true,
                trainerKey: trainer?.key || null,
                assignedTrainerKey: assignedTrainer?.key || null,
                syncedAt: new Date(),
              },
            },
            upsert: true,
          },
        };
      });

    if (operations.length) await SchoolDiscordMember.bulkWrite(operations);
    processed += operations.length;
    after = String(members[members.length - 1].user.id);
    if (members.length < 1000) break;
  }

  await SchoolDiscordMember.updateMany(
    { guildId: SCHOOL_DISCORD.guildId, discordId: { $nin: [...currentIds] } },
    { $set: { isInGuild: false, roleIds: [], syncedAt: new Date() } },
  );

  memory.clear();
  return { processed };
}

export async function sendSchoolMessage(
  channelId: string,
  content: string,
  roleIds: string[] = [],
) {
  const response = await fetch(`${API}/channels/${channelId}/messages`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      content,
      allowed_mentions: { roles: roleIds, users: [], parse: [] },
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Discord API ${response.status}: ${body.slice(0, 300)}`);
  }

  const message: any = await response.json();
  return {
    sent: true,
    channelId,
    messageId: message.id,
    jumpUrl: `https://discord.com/channels/${SCHOOL_DISCORD.guildId}/${channelId}/${message.id}`,
  };
}
