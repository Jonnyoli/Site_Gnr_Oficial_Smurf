import { Router } from "express";
import SchoolDiscordMember from "../models/SchoolDiscordMember";
import {
  SCHOOL_DISCORD,
  SCHOOL_EXAMINER_ROLE_IDS,
  SCHOOL_LEADERSHIP_ROLE_IDS,
  SCHOOL_RECRUITMENT_ROLE_IDS,
  SCHOOL_TRAINER_ROLE_IDS,
} from "../config/schoolDiscord";
import {
  attachSchoolDiscordContext,
  syncSchoolGuildMembers,
} from "../services/schoolDiscordService";

const router = Router();

function currentUser(req: any) { return req.session?.user || null; }
function userId(req: any) { return String(currentUser(req)?.id || ""); }
function allRoles(req: any) {
  const main = Array.isArray(currentUser(req)?.roles) ? currentUser(req).roles.map(String) : [];
  const school = Array.isArray(req.schoolRoles) ? req.schoolRoles.map(String) : [];
  return [...new Set([...main, ...school])];
}
function hasAny(req: any, roles: string[]) {
  return roles.some((id) => allRoles(req).includes(id));
}
function canManage(req: any) {
  return hasAny(req, SCHOOL_LEADERSHIP_ROLE_IDS) || userId(req) === "713719718091030599";
}


router.post("/internal/sync", async (req, res) => {
  const secret = String(req.get("x-school-sync-secret") || "");
  const expected = String(process.env.SCHOOL_SYNC_SECRET || process.env.UNIT_DISCORD_SYNC_SECRET || "");
  if (!expected || secret !== expected) {
    return void res.status(401).json({ error: "Segredo de sincronização inválido." });
  }
  const result = await syncSchoolGuildMembers();
  res.json({ ok: true, ...result });
});

router.use((req, res, next) => {
  if (!userId(req)) return void res.status(401).json({ error: "É necessário iniciar sessão." });
  next();
});
router.use(attachSchoolDiscordContext);

router.get("/status", async (req: any, res) => {
  const member = await SchoolDiscordMember.findOne({
    guildId: SCHOOL_DISCORD.guildId,
    discordId: userId(req),
  }).lean();

  res.json({
    connected: Boolean(req.schoolDiscordConnected && member?.isInGuild),
    guildId: SCHOOL_DISCORD.guildId,
    member,
    permissions: {
      leadership: hasAny(req, SCHOOL_LEADERSHIP_ROLE_IDS),
      trainer: hasAny(req, SCHOOL_TRAINER_ROLE_IDS),
      examiner: hasAny(req, SCHOOL_EXAMINER_ROLE_IDS),
      recruitment: hasAny(req, SCHOOL_RECRUITMENT_ROLE_IDS),
      manage: canManage(req),
    },
    error: req.schoolDiscordError || null,
  });
});

router.get("/members", async (req: any, res) => {
  if (!canManage(req)) return void res.status(403).json({ error: "Sem permissão." });
  const group = String(req.query.group || "ALL").toUpperCase();
  const roleMap: Record<string, string[]> = {
    LEADERSHIP: SCHOOL_LEADERSHIP_ROLE_IDS,
    TRAINERS: SCHOOL_TRAINER_ROLE_IDS,
    EXAMINERS: SCHOOL_EXAMINER_ROLE_IDS,
    RECRUITMENT: SCHOOL_RECRUITMENT_ROLE_IDS,
  };
  const filter: any = { guildId: SCHOOL_DISCORD.guildId, isInGuild: true };
  if (roleMap[group]) filter.roleIds = { $in: roleMap[group] };
  const items = await SchoolDiscordMember.find(filter).sort({ displayName: 1 }).lean();
  res.json({ items });
});

router.post("/sync", async (req: any, res) => {
  if (!canManage(req)) return void res.status(403).json({ error: "Sem permissão." });
  const result = await syncSchoolGuildMembers();
  res.json({ ok: true, ...result });
});

export default router;
