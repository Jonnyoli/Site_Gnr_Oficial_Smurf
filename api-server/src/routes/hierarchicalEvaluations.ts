import { Router, type NextFunction, type Request, type Response } from "express";
import HierarchicalEvaluation from "../models/HierarchicalEvaluation";
import { User } from "../models";

const router = Router();

const GNR_ROLE_ID = "1147878941974077478";
const OFFICER_EVALUATOR_ROLE_ID = "1147878942066364488";
const COMMAND_GENERAL_ROLE_ID = "1147878942099906672";
const DISCORD_TOKEN = process.env.TOKEN || process.env.DISCORD_TOKEN || "";
const DISCORD_CHANNEL_ID = process.env.HIERARCHICAL_EVALUATIONS_CHANNEL_ID || "";
const CENTRAL_BASE_URL = (process.env.CENTRAL_BASE_URL || "http://localhost:5173").replace(/\/$/, "");

type EvalType = "OFFICER_SERGEANT" | "COMMAND_OFFICER";
type EvalStatus = "DRAFT" | "SUBMITTED" | "IN_REVIEW" | "CHANGES_REQUESTED" | "APPROVED" | "REJECTED" | "ARCHIVED";

const OFFICER_SERGEANT_FIELDS = [
  "radioCommunication",
  "codeEResponsibility",
  "subordinateSupport",
  "emotionalControl",
  "pressureDecision",
  "operationalCoordination",
] as const;

const COMMAND_OFFICER_FIELDS = [
  "radioCommunication",
  "supervisionDecision",
  "disciplinaryApplication",
  "commandSupport",
  "meetingParticipation",
  "emotionalControl",
] as const;

const user = (req: Request) => req.session?.user || null;
const userId = (req: Request) => String(user(req)?.id || "");
const userName = (req: Request) => user(req)?.displayName || user(req)?.global_name || user(req)?.username || "Utilizador da Central";
const userRank = (req: Request) => user(req)?.rank || user(req)?.posto || user(req)?.hierarchyGroupLabel || "";
const userAvatar = (req: Request) => user(req)?.avatarUrl || user(req)?.avatar || user(req)?.image || null;
const userRoles = (req: Request) => Array.isArray(user(req)?.roles) ? user(req).roles.map(String) : [];
const hasRole = (req: Request, roleId: string) => userRoles(req).includes(roleId);
const isCommand = (req: Request) => hasRole(req, COMMAND_GENERAL_ROLE_ID);
const canEvaluateSergeants = (req: Request) => hasRole(req, OFFICER_EVALUATOR_ROLE_ID) || isCommand(req);

async function isCurrentGnrMember(discordId: string) {
  if (!discordId) return false;

  return Boolean(
    await User.exists({
      discordId: String(discordId),
      isInGuild: true,
      savedTags: { $in: [GNR_ROLE_ID] },
    }),
  );
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!userId(req)) return void res.status(401).json({ error: "É necessário iniciar sessão." });
  next();
}

function fieldsFor(type: EvalType) {
  return type === "OFFICER_SERGEANT" ? OFFICER_SERGEANT_FIELDS : COMMAND_OFFICER_FIELDS;
}

function normalizeScore(input: any) {
  if (input?.notApplicable === true || String(input?.value).toUpperCase() === "N/A") {
    return { value: null, notApplicable: true, note: String(input?.note || "").trim().slice(0, 1500) };
  }
  const n = Number(input?.value);
  return {
    value: Number.isFinite(n) ? Math.max(0, Math.min(10, n)) : 0,
    notApplicable: false,
    note: String(input?.note || "").trim().slice(0, 1500),
  };
}

function normalizeScores(type: EvalType, input: any) {
  return Object.fromEntries(fieldsFor(type).map((field) => [field, normalizeScore(input?.[field])]));
}

function averageFor(type: EvalType, scores: any) {
  const values = fieldsFor(type)
    .map((field) => scores?.[field])
    .filter((score) => score && !score.notApplicable && Number.isFinite(score.value))
    .map((score) => Number(score.value));
  if (!values.length) return null;
  return Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2));
}

function classificationFor(avg: number | null) {
  if (avg === null) return null;
  if (avg >= 9) return "S — Excelente";
  if (avg >= 8) return "A — Muito Bom";
  if (avg >= 7) return "B — Bom";
  if (avg >= 6) return "C — Satisfatório";
  if (avg >= 5) return "D — A melhorar";
  return "E — Insuficiente";
}

function validRank(type: EvalType, rank: string) {
  if (type === "OFFICER_SERGEANT") return /sargento/i.test(rank);
  return /(alferes|tenente|capit[aã]o|major|coronel|brigadeiro|general)/i.test(rank);
}

function canCreate(req: Request, type: EvalType) {
  return type === "OFFICER_SERGEANT" ? canEvaluateSergeants(req) : isCommand(req);
}

function canApprove(req: Request, item: any) {
  return isCommand(req) && ["SUBMITTED", "IN_REVIEW"].includes(item.status);
}

function serialize(item: any, req: Request) {
  const plain = typeof item.toObject === "function" ? item.toObject() : item;
  return {
    ...plain,
    permissions: {
      canEdit: plain.evaluatorDiscordId === userId(req) && ["DRAFT", "CHANGES_REQUESTED"].includes(plain.status),
      canSubmit: plain.evaluatorDiscordId === userId(req) && ["DRAFT", "CHANGES_REQUESTED"].includes(plain.status),
      canApprove: canApprove(req, plain),
    },
  };
}

async function publishDiscord(item: any) {
  if (!DISCORD_TOKEN || !DISCORD_CHANNEL_ID) return null;
  const response = await fetch(`https://discord.com/api/v10/channels/${DISCORD_CHANNEL_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bot ${DISCORD_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      embeds: [{
        title: item.type === "OFFICER_SERGEANT" ? "Avaliação Oficial → Sargento" : "Avaliação Comando-Geral → Oficial",
        description: [
          `**Avaliador:** ${item.evaluatorName}`,
          `**Avaliado:** ${item.evaluatedName}`,
          `**Patente:** ${item.evaluatedRank}`,
          `**Média:** ${item.average ?? "N/A"}/10`,
          `**Classificação:** ${item.classification || "N/A"}`,
          `**Estado:** ${item.status}`,
        ].join("\n"),
        color: item.type === "COMMAND_OFFICER" ? 0x8e44ad : 0x3498db,
        footer: { text: "GNR Central • Avaliações de Carreira" },
        timestamp: new Date().toISOString(),
      }],
      components: [{ type: 1, components: [{ type: 2, style: 5, label: "Abrir no site", url: `${CENTRAL_BASE_URL}/avaliacoes-carreira?evaluation=${item._id}` }] }],
    }),
  });
  if (!response.ok) throw new Error(`Discord HTTP ${response.status}`);
  const message = await response.json();
  return {
    channelId: DISCORD_CHANNEL_ID,
    messageId: message.id,
    jumpUrl: `https://discord.com/channels/${message.guild_id || "@me"}/${DISCORD_CHANNEL_ID}/${message.id}`,
    publishedAt: new Date(),
  };
}

router.get("/access", requireAuth, (req, res) => {
  res.json({
    userId: userId(req),
    canEvaluateSergeants: canEvaluateSergeants(req),
    canEvaluateOfficers: isCommand(req),
    canApprove: isCommand(req),
    roles: userRoles(req),
  });
});

router.get("/", requireAuth, async (req, res) => {
  const filter: any = {};
  const status = String(req.query.status || "ALL");
  const type = String(req.query.type || "ALL");
  const search = String(req.query.search || "").trim().slice(0, 100);
  if (status !== "ALL") filter.status = status;
  if (type !== "ALL") filter.type = type;
  if (search) filter.$or = ["evaluatedName", "evaluatorName", "evaluatedRank"].map((field) => ({ [field]: { $regex: search, $options: "i" } }));
  if (!isCommand(req)) filter.evaluatorDiscordId = userId(req);
  const items = await HierarchicalEvaluation.find(filter).sort({ createdAt: -1 }).limit(500);
  res.json({ items: items.map((item) => serialize(item, req)) });
});

router.get("/stats", requireAuth, async (req, res) => {
  const filter = isCommand(req) ? {} : { evaluatorDiscordId: userId(req) };
  const items = await HierarchicalEvaluation.find(filter).lean();
  const approved = items.filter((item: any) => item.status === "APPROVED");
  const scores = approved.map((item: any) => item.average).filter(Number.isFinite) as number[];
  res.json({
    total: items.length,
    drafts: items.filter((i: any) => i.status === "DRAFT").length,
    submitted: items.filter((i: any) => i.status === "SUBMITTED").length,
    changesRequested: items.filter((i: any) => i.status === "CHANGES_REQUESTED").length,
    approved: approved.length,
    rejected: items.filter((i: any) => i.status === "REJECTED").length,
    officerSergeant: items.filter((i: any) => i.type === "OFFICER_SERGEANT").length,
    commandOfficer: items.filter((i: any) => i.type === "COMMAND_OFFICER").length,
    officialAverage: scores.length ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)) : null,
  });
});

router.get("/profile/:discordId", requireAuth, async (req, res) => {
  const items = await HierarchicalEvaluation.find({ evaluatedDiscordId: req.params.discordId, status: "APPROVED" }).sort({ createdAt: -1 }).lean();
  const scores = items.map((item: any) => item.average).filter(Number.isFinite) as number[];
  res.json({ items, total: items.length, average: scores.length ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)) : null });
});

router.post("/", requireAuth, async (req, res) => {
  const type = String(req.body?.type) as EvalType;
  if (!["OFFICER_SERGEANT", "COMMAND_OFFICER"].includes(type)) return void res.status(400).json({ error: "Tipo de avaliação inválido." });
  if (!canCreate(req, type)) return void res.status(403).json({ error: "Não tens a role necessária para esta avaliação." });

  const evaluatedDiscordId = String(
    req.body?.evaluatedDiscordId || "",
  ).trim();

  if (!(await isCurrentGnrMember(evaluatedDiscordId))) {
    return void res.status(400).json({
      error:
        "O elemento selecionado não possui atualmente a tag Guarda Nacional Republicana.",
    });
  }

  const evaluatedRank = String(req.body?.evaluatedRank || "").trim();
  if (!validRank(type, evaluatedRank)) {
    return void res.status(400).json({ error: type === "OFFICER_SERGEANT" ? "Apenas podes avaliar Sargentos." : "Apenas podes avaliar Oficiais." });
  }

  const scores = normalizeScores(type, req.body?.scores);
  const average = averageFor(type, scores);
  const submit = req.body?.submit === true;
  const status: EvalStatus = type === "COMMAND_OFFICER" && submit ? "APPROVED" : submit ? "SUBMITTED" : "DRAFT";

  const item = await HierarchicalEvaluation.create({
    type,
    evaluatorDiscordId: userId(req), evaluatorName: userName(req), evaluatorRank: userRank(req), evaluatorAvatarUrl: userAvatar(req),
    evaluatedDiscordId,
    evaluatedName: String(req.body?.evaluatedName || "").trim().slice(0, 200),
    evaluatedRank,
    evaluatedUnit: String(req.body?.evaluatedUnit || "Patrulha").trim().slice(0, 200),
    evaluatedAvatarUrl: req.body?.evaluatedAvatarUrl || null,
    periodStart: req.body?.periodStart || null,
    periodEnd: req.body?.periodEnd || null,
    scores,
    strengths: String(req.body?.strengths || "").trim().slice(0, 4000),
    improvements: String(req.body?.improvements || "").trim().slice(0, 4000),
    relevantOccurrences: String(req.body?.relevantOccurrences || "").trim().slice(0, 4000),
    finalOpinion: String(req.body?.finalOpinion || "").trim().slice(0, 4000),
    recommendation: String(req.body?.recommendation || "").trim().slice(0, 500),
    average,
    classification: classificationFor(average),
    status,
    decision: status === "APPROVED" ? { byDiscordId: userId(req), byName: userName(req), at: new Date(), reason: "Avaliação oficial emitida pelo Comando-Geral." } : undefined,
    audit: [{ action: status === "APPROVED" ? "CREATED_AND_APPROVED" : status === "SUBMITTED" ? "CREATED_AND_SUBMITTED" : "DRAFT_CREATED", byDiscordId: userId(req), byName: userName(req), at: new Date() }],
  });

  if (status !== "DRAFT") {
    try {
      const discord = await publishDiscord(item);
      if (discord) { item.discord = discord; await item.save(); }
    } catch (error) { console.error("[HIERARCHICAL-EVALUATION-DISCORD]", error); }
  }

  res.status(201).json({ item: serialize(item, req) });
});

router.patch("/:id", requireAuth, async (req, res) => {
  const item = await HierarchicalEvaluation.findById(req.params.id);
  if (!item) return void res.status(404).json({ error: "A avaliação não existe." });
  if (item.evaluatorDiscordId !== userId(req)) return void res.status(403).json({ error: "Não podes editar esta avaliação." });
  if (!["DRAFT", "CHANGES_REQUESTED"].includes(item.status)) return void res.status(409).json({ error: "A avaliação já não pode ser editada." });

  item.scores = normalizeScores(item.type as EvalType, req.body?.scores) as any;
  for (const field of ["strengths", "improvements", "relevantOccurrences", "finalOpinion", "recommendation"] as const) {
    if (typeof req.body?.[field] === "string") (item as any)[field] = req.body[field].trim().slice(0, field === "recommendation" ? 500 : 4000);
  }
  item.average = averageFor(item.type as EvalType, item.scores) as any;
  item.classification = classificationFor(item.average as any) as any;
  item.audit.push({ action: "UPDATED", byDiscordId: userId(req), byName: userName(req), at: new Date() } as any);
  await item.save();
  res.json({ item: serialize(item, req) });
});

router.post("/:id/submit", requireAuth, async (req, res) => {
  const item = await HierarchicalEvaluation.findById(req.params.id);
  if (!item) return void res.status(404).json({ error: "A avaliação não existe." });
  if (item.evaluatorDiscordId !== userId(req)) return void res.status(403).json({ error: "Não podes submeter esta avaliação." });
  if (!["DRAFT", "CHANGES_REQUESTED"].includes(item.status)) return void res.status(409).json({ error: "Estado inválido para submissão." });

  item.status = item.type === "COMMAND_OFFICER" ? "APPROVED" : "SUBMITTED";
  if (item.status === "APPROVED") item.decision = { byDiscordId: userId(req), byName: userName(req), at: new Date(), reason: "Avaliação oficial emitida pelo Comando-Geral." } as any;
  item.audit.push({ action: item.status === "APPROVED" ? "SUBMITTED_AND_APPROVED" : "SUBMITTED", byDiscordId: userId(req), byName: userName(req), at: new Date() } as any);
  await item.save();
  try { const discord = await publishDiscord(item); if (discord) { item.discord = discord; await item.save(); } } catch (error) { console.error(error); }
  res.json({ item: serialize(item, req) });
});

router.post("/:id/decision", requireAuth, async (req, res) => {
  const item = await HierarchicalEvaluation.findById(req.params.id);
  if (!item) return void res.status(404).json({ error: "A avaliação não existe." });
  if (!canApprove(req, item)) return void res.status(403).json({ error: "Não tens permissões para validar esta avaliação." });

  const action = String(req.body?.action);
  const next = action === "APPROVE" ? "APPROVED" : action === "REJECT" ? "REJECTED" : action === "REQUEST_CHANGES" ? "CHANGES_REQUESTED" : null;
  if (!next) return void res.status(400).json({ error: "Decisão inválida." });
  const reason = String(req.body?.reason || "").trim().slice(0, 1500);
  if (next !== "APPROVED" && reason.length < 3) return void res.status(400).json({ error: "É necessário indicar um motivo." });

  item.status = next as any;
  item.decision = { byDiscordId: userId(req), byName: userName(req), at: new Date(), reason } as any;
  item.audit.push({ action: next, byDiscordId: userId(req), byName: userName(req), reason, at: new Date() } as any);
  await item.save();
  res.json({ item: serialize(item, req) });
});

export default router;
