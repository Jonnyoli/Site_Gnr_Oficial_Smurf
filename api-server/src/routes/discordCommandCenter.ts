import { Router, type Request, type Response, type NextFunction } from "express";
import crypto from "crypto";
import { DiscordCommandConfig, DiscordCommandExecution, DiscordMessageTemplate, DiscordRemoteAction } from "../models/DiscordCommandCenter";
import { OperationalPoint } from "../models/OperationalSync";
import { AuditLog } from "../models";

const router = Router();
const COMMAND_GENERAL_ROLE_ID = "1147878942099906672";
const DEV_USER_ID = "713719718091030599";
const MILITARY_ROLE_ID = "1147878941974077478";
const BOT_SECRET = process.env.DISCORD_COMMAND_CENTER_SECRET || "";

const user = (req: Request): any => req.session?.user || null;
const userId = (req: Request) => String(user(req)?.id || "");
const userName = (req: Request) => user(req)?.displayName || user(req)?.global_name || user(req)?.username || userId(req) || "Sistema";
function roles(req: Request) {
  const current = user(req);
  for (const value of [current?.roles,current?.roleIds,current?.guildRoles,current?.member?.roles]) {
    if (Array.isArray(value)) return value.map((r:any)=>typeof r==="string"?r:String(r?.id||r?.roleId||"")).filter(Boolean);
  }
  return [];
}
function requireCommand(req: Request,res: Response,next: NextFunction) {
  if (!userId(req)) return void res.status(401).json({error:"É necessário iniciar sessão."});
  if (userId(req)!==DEV_USER_ID && !roles(req).includes(COMMAND_GENERAL_ROLE_ID)) return void res.status(403).json({error:"Apenas o Comando-Geral pode gerir o Discord."});
  next();
}
function requireBot(req: Request,res: Response,next: NextFunction) {
  if (!BOT_SECRET || String(req.get("x-discord-command-secret")||"")!==BOT_SECRET) return void res.status(401).json({error:"Bot não autorizado."});
  next();
}
async function audit(req: Request, action: string, description: string, metadata:any={}) {
  try { await AuditLog.create({ userId:userId(req)||"SYSTEM", userName:userName(req), action, module:"Discord", severity:"success", description, metadata, timestamp:new Date() }); } catch {}
}
router.get("/dashboard", requireCommand, async (_req,res)=>{
  const [commands, today, templates, pending] = await Promise.all([
    DiscordCommandConfig.find().lean(),
    DiscordCommandExecution.find({createdAt:{$gte:new Date(new Date().setHours(0,0,0,0))}}).lean(),
    DiscordMessageTemplate.countDocuments(),
    DiscordRemoteAction.countDocuments({status:{$in:["PENDING","PROCESSING"]}}),
  ]);
  const success=today.filter((x:any)=>x.status==="SUCCESS").length, failed=today.filter((x:any)=>x.status==="FAILED").length, blocked=today.filter((x:any)=>x.status==="BLOCKED").length;
  res.json({
    commands:{active:commands.filter((x:any)=>x.enabled).length,disabled:commands.filter((x:any)=>!x.enabled).length},
    executionsToday:{total:today.length,success,failed,blocked,successRate:today.length?Number((success/today.length*100).toFixed(1)):100,averageDurationMs:today.length?Math.round(today.reduce((a:any,b:any)=>a+Number(b.durationMs||0),0)/today.length):0},
    templates,pendingRemoteActions:pending,
    recentFailures:today.filter((x:any)=>x.status==="FAILED").slice(-8).reverse(),
  });
});
router.get("/commands", requireCommand, async (req,res)=>{
  const search=String(req.query.search||"").trim(); const q:any={};
  if(search) q.$or=[{name:{$regex:search,$options:"i"}},{description:{$regex:search,$options:"i"}}];
  const items=await DiscordCommandConfig.find(q).sort({category:1,name:1}).lean(); res.json({items,total:items.length});
});
router.put("/commands/:name", requireCommand, async (req,res)=>{
  const name=String(req.params.name).toLowerCase(), b=req.body||{};
  const item=await DiscordCommandConfig.findOneAndUpdate({name},{$set:{
    description:String(b.description||""),category:String(b.category||"GERAL").toUpperCase(),enabled:b.enabled!==false,guildScope:b.guildScope||"MAIN",
    access:{
      requireMilitaryRole:b.access?.requireMilitaryRole===true,requirePointOpen:b.access?.requirePointOpen===true,
      allowedRoleIds:Array.isArray(b.access?.allowedRoleIds)?b.access.allowedRoleIds.map(String):[],
      deniedRoleIds:Array.isArray(b.access?.deniedRoleIds)?b.access.deniedRoleIds.map(String):[],
      allowedChannelIds:Array.isArray(b.access?.allowedChannelIds)?b.access.allowedChannelIds.map(String):[],
      deniedChannelIds:Array.isArray(b.access?.deniedChannelIds)?b.access.deniedChannelIds.map(String):[],
      allowedGuildIds:Array.isArray(b.access?.allowedGuildIds)?b.access.allowedGuildIds.map(String):[],
      cooldownSeconds:Math.max(0,Math.min(86400,Number(b.access?.cooldownSeconds||0))),
    },
    audit:{enabled:b.audit?.enabled!==false,logSuccess:b.audit?.logSuccess!==false,logFailure:b.audit?.logFailure!==false,includeOptions:b.audit?.includeOptions===true},
    settings:typeof b.settings==="object"&&b.settings?b.settings:{},updatedBy:{discordId:userId(req),name:userName(req)}
  },$setOnInsert:{name}}, {new:true,upsert:true,runValidators:true});
  await audit(req,"DISCORD_COMMAND_UPDATED",`${userName(req)} atualizou /${name}.`,{command:name,enabled:item.enabled}); res.json({item});
});
router.post("/commands/:name/toggle", requireCommand, async (req,res)=>{
  const item=await DiscordCommandConfig.findOne({name:String(req.params.name).toLowerCase()}); if(!item) return void res.status(404).json({error:"Comando não encontrado."});
  item.enabled=!item.enabled; item.updatedBy={discordId:userId(req),name:userName(req)}; await item.save(); await audit(req,item.enabled?"DISCORD_COMMAND_ENABLED":"DISCORD_COMMAND_DISABLED",`${userName(req)} alterou /${item.name}.`); res.json({item});
});
router.get("/executions", requireCommand, async (req,res)=>{
  const q:any={}; if(req.query.command) q.commandName=String(req.query.command); if(req.query.status) q.status=String(req.query.status);
  const items=await DiscordCommandExecution.find(q).sort({createdAt:-1}).limit(Math.min(500,Number(req.query.limit||200))).lean(); res.json({items,total:items.length});
});
router.get("/templates", requireCommand, async (_req,res)=>res.json({items:await DiscordMessageTemplate.find().sort({category:1,label:1}).lean()}));
router.put("/templates/:key", requireCommand, async (req,res)=>{
  const key=String(req.params.key), b=req.body||{};
  const item=await DiscordMessageTemplate.findOneAndUpdate({key},{$set:{
    label:String(b.label||key),category:String(b.category||"GERAL").toUpperCase(),enabled:b.enabled!==false,guildScope:b.guildScope||"MAIN",
    mentionRoleId:b.mentionRoleId||null,channelId:b.channelId||null,
    payload:{content:String(b.payload?.content||""),embed:{title:String(b.payload?.embed?.title||""),description:String(b.payload?.embed?.description||""),color:String(b.payload?.embed?.color||"#7c3aed"),imageUrl:String(b.payload?.embed?.imageUrl||""),thumbnailUrl:String(b.payload?.embed?.thumbnailUrl||""),footer:String(b.payload?.embed?.footer||"")},buttons:Array.isArray(b.payload?.buttons)?b.payload.buttons:[]},
    updatedBy:{discordId:userId(req),name:userName(req)}
  },$setOnInsert:{key}}, {new:true,upsert:true,runValidators:true});
  await audit(req,"DISCORD_TEMPLATE_UPDATED",`${userName(req)} atualizou ${key}.`); res.json({item});
});
router.get("/remote-actions", requireCommand, async (_req,res)=>res.json({items:await DiscordRemoteAction.find().sort({createdAt:-1}).limit(200).lean()}));
router.post("/remote-actions", requireCommand, async (req,res)=>{
  const type=String(req.body.type||"").toUpperCase(), reason=String(req.body.reason||"").trim();
  const allowed=["SYNC_COMMANDS","RELOAD_COMMANDS","SYNC_MAIN_GUILD","SYNC_SCHOOL_GUILD","SYNC_EFFECTIVE","REPROCESS_OUTBOX","TEST_CONNECTIONS"];
  if(!allowed.includes(type)) return void res.status(400).json({error:"Ação inválida."}); if(reason.length<4) return void res.status(400).json({error:"Motivo obrigatório."});
  const item=await DiscordRemoteAction.create({type,requestedBy:{discordId:userId(req),name:userName(req)},reason,payload:req.body.payload||{}});
  await audit(req,"DISCORD_REMOTE_ACTION_CREATED",`${userName(req)} agendou ${type}.`,{id:String(item._id)}); res.status(201).json({item});
});

/* BOT */
router.post("/bot/sync-commands", requireBot, async (req,res)=>{
  const commands=Array.isArray(req.body.commands)?req.body.commands:[], botInstanceId=String(req.body.botInstanceId||"default");
  const ops=commands.map((raw:any)=>{
    const name=String(raw.name||raw.data?.name||"").toLowerCase().trim(); if(!name) return null;
    const description=String(raw.description||raw.data?.description||""); const file=raw.file||null;
    const hash=crypto.createHash("sha256").update(JSON.stringify({name,description,file,options:raw.options||[]})).digest("hex");
    return {updateOne:{filter:{name},update:{$set:{description,"source.file":file,"source.hash":hash,"source.version":String(raw.version||"1"),"source.botInstanceId":botInstanceId,"source.lastSyncedAt":new Date()},$setOnInsert:{name,category:String(raw.category||"GERAL").toUpperCase(),enabled:true}},upsert:true}};
  }).filter(Boolean);
  if(ops.length) await DiscordCommandConfig.bulkWrite(ops as any); res.json({ok:true,synced:ops.length});
});
router.get("/bot/config/:name", requireBot, async (req,res)=>{
  const name=String(req.params.name).toLowerCase(); let config=await DiscordCommandConfig.findOne({name}).lean();
  if(!config) config=await DiscordCommandConfig.create({name,enabled:true}).then((x:any)=>x.toObject());
  res.json({config});
});
router.post("/bot/check-context", requireBot, async (req,res)=>{
  const name=String(req.body.commandName||"").toLowerCase(), rids=Array.isArray(req.body.roleIds)?req.body.roleIds.map(String):[], guildId=String(req.body.guildId||""), channelId=String(req.body.channelId||""), uid=String(req.body.userId||"");
  let config:any=await DiscordCommandConfig.findOne({name}).lean(); if(!config) config=await DiscordCommandConfig.create({name,enabled:true}).then((x:any)=>x.toObject());
  const a=config.access||{}; let allowed=true, reason="";
  if(config.enabled===false){allowed=false;reason="Comando desativado na Central."}
  else if(a.allowedGuildIds?.length && !a.allowedGuildIds.includes(guildId)){allowed=false;reason="Servidor não autorizado."}
  else if(a.allowedChannelIds?.length && !a.allowedChannelIds.includes(channelId)){allowed=false;reason="Canal não autorizado."}
  else if(a.deniedChannelIds?.includes(channelId)){allowed=false;reason="Canal bloqueado."}
  else if(a.deniedRoleIds?.some((x:string)=>rids.includes(x))){allowed=false;reason="Role bloqueada."}
  else if(a.allowedRoleIds?.length && !a.allowedRoleIds.some((x:string)=>rids.includes(x))){allowed=false;reason="Sem role autorizada."}
  else if(a.requireMilitaryRole && !rids.includes(MILITARY_ROLE_ID)){allowed=false;reason="É necessária a role militar."}
  else if(a.requirePointOpen && !(await OperationalPoint.exists({userId:uid,status:"ABERTO"}))){allowed=false;reason="É necessário ter ponto aberto."}
  res.json({allowed,reason,config});
});
router.post("/bot/executions", requireBot, async (req,res)=>{
  const b=req.body||{}, name=String(b.commandName||"").toLowerCase(), status=["SUCCESS","FAILED","BLOCKED"].includes(b.status)?b.status:"FAILED", id=String(b.executionId||crypto.randomUUID()), duration=Math.max(0,Number(b.durationMs||0));
  await DiscordCommandExecution.findOneAndUpdate({executionId:id},{$setOnInsert:{executionId:id,commandName:name,status,guildId:b.guildId||null,channelId:b.channelId||null,userId:b.userId||null,userName:b.userName||null,durationMs:duration,reason:b.reason||null,error:b.error||null,options:b.options||null,botInstanceId:b.botInstanceId||null,createdAt:new Date()}},{upsert:true});
  const c:any=await DiscordCommandConfig.findOne({name}); if(c){const n=Number(c.stats.totalExecutions||0),avg=Number(c.stats.averageDurationMs||0);c.stats.totalExecutions=n+1;c.stats.averageDurationMs=Math.round(n?(avg*n+duration)/(n+1):duration);c.stats.lastExecutedAt=new Date();if(status==="SUCCESS")c.stats.successExecutions+=1;else if(status==="BLOCKED")c.stats.blockedExecutions+=1;else{c.stats.failedExecutions+=1;c.stats.lastError=String(b.error||b.reason||"Erro").slice(0,2000)}await c.save();}
  res.json({ok:true});
});
router.get("/bot/remote-actions/next", requireBot, async (_req,res)=>{
  const now=new Date(); const item=await DiscordRemoteAction.findOneAndUpdate({status:"PENDING",availableAt:{$lte:now}},{$set:{status:"PROCESSING",lockedAt:now},$inc:{attempts:1}},{new:true,sort:{createdAt:1}}).lean(); res.json({item:item||null});
});
router.post("/bot/remote-actions/:id/result", requireBot, async (req,res)=>{
  const success=req.body.success===true; const item=await DiscordRemoteAction.findByIdAndUpdate(req.params.id,{$set:{status:success?"SUCCESS":"FAILED",result:req.body.result||null,lastError:success?null:String(req.body.error||"Falha"),completedAt:new Date(),lockedAt:null}},{new:true});res.json({item});
});
export default router;
