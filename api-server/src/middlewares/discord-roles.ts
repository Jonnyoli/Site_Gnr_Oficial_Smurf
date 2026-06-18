import { Request, Response, NextFunction } from "express";

const DISCORD_TOKEN = process.env["TOKEN"] || process.env["DISCORD_TOKEN"];
const GUILD_ID = (
  process.env["GUILD_IDS"] ||
  process.env["DISCORD_GUILD_ID"] ||
  ""
).split(",")[0];

export async function fetchDiscordRoles(req: Request, res: Response, next: NextFunction) {
  if (!req.session.user || !DISCORD_TOKEN || !GUILD_ID) {
    return next();
  }

  try {
    const userId = req.session.user.id;
    
    const response = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/members/${userId}`, {
      headers: {
        Authorization: `Bot ${DISCORD_TOKEN}`,
      },
    });

    if (response.ok) {
      const data = await response.json() as { roles: string[] };
      req.session.user.roles = data.roles;
    }
  } catch (error) {
    console.error("[DISCORD-ROLES] Error fetching roles:", error);
  }

  next();
}
