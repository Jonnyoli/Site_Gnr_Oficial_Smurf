import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from "express";

import mongoose from "mongoose";

import SergeantEvaluation from "../models/SergeantEvaluation";
import { User } from "../models";

const router = Router();

const GNR_ROLE_ID =
  "1147878941974077478";

const SERGEANT_ROLE_ID =
  "1147891694260461688";

const COMMAND_GENERAL_ROLE_ID =
  "1147878942099906672";

const DEV_USER_ID =
  "713719718091030599";

const EVALUATION_CHANNEL_ID =
  "1416453368678842368";

const DISCORD_TOKEN =
  process.env.TOKEN ||
  process.env.DISCORD_TOKEN ||
  "";

const DISCORD_GUILD_ID = (
  process.env.GUILD_IDS ||
  process.env.DISCORD_GUILD_ID ||
  ""
)
  .split(",")[0]
  .trim();

const CENTRAL_BASE_URL =
  (
    process.env.CENTRAL_BASE_URL ||
    "http://localhost:5173"
  ).replace(/\/$/, "");

const EXTRA_APPROVER_ROLE_IDS =
  String(
    process.env
      .EVALUATION_APPROVER_ROLE_IDS ||
      "",
  )
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

const SCORE_FIELDS_STANDARD = [
  "radio",
  "conduct",
  "detention",
  "incident",
];

const SCORE_FIELDS_ADVANCED = [
  "offensiveDriving",
  "shootingWeapons",
  "tacticalPositioning",
  "radioCommunications",
  "postureConduct",
  "leadershipInitiative",
  "stressManagement",
  "argumentationLegislation",
];

function currentUser(req: Request) {
  return req.session?.user || null;
}

function currentUserId(req: Request) {
  return String(
    currentUser(req)?.id || "",
  );
}

function currentUserName(req: Request) {
  const user = currentUser(req);

  return (
    user?.displayName ||
    user?.global_name ||
    user?.username ||
    "Utilizador da Central"
  );
}

function currentUserRoles(req: Request) {
  const roles =
    currentUser(req)?.roles;

  return Array.isArray(roles)
    ? roles.map(String)
    : [];
}

function isSergeant(req: Request) {
  const roles =
    currentUserRoles(req);

  return (
    currentUserId(req) ===
      DEV_USER_ID ||
    roles.includes(
      SERGEANT_ROLE_ID,
    ) ||
    roles.includes(
      COMMAND_GENERAL_ROLE_ID,
    )
  );
}

function canApprove(req: Request) {
  const roles =
    currentUserRoles(req);

  return (
    currentUserId(req) ===
      DEV_USER_ID ||
    roles.includes(
      COMMAND_GENERAL_ROLE_ID,
    ) ||
    EXTRA_APPROVER_ROLE_IDS.some(
      (roleId) =>
        roles.includes(roleId),
    )
  );
}

function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!currentUserId(req)) {
    res.status(401).json({
      error:
        "É necessário iniciar sessão.",
    });
    return;
  }

  next();
}

function requireSergeant(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!isSergeant(req)) {
    res.status(403).json({
      error:
        "Esta área é exclusiva da classe de Sargentos.",
    });
    return;
  }

  next();
}

function requireApprover(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!canApprove(req)) {
    res.status(403).json({
      error:
        "Não tens permissão para decidir avaliações.",
    });
    return;
  }

  next();
}

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

function normalizeScore(value: any) {
  if (
    value === "N/A" ||
    value?.notApplicable === true
  ) {
    return {
      value: null,
      notApplicable: true,
    };
  }

  const number =
    Number(
      value?.value ?? value,
    );

  if (
    !Number.isFinite(number) ||
    number < 0 ||
    number > 10
  ) {
    throw new Error(
      "Todas as notas devem estar entre 0 e 10 ou N/A.",
    );
  }

  return {
    value: number,
    notApplicable: false,
  };
}

function calculateAverage(
  type: string,
  payload: any,
) {
  const source =
    type === "ADVANCED_360"
      ? payload.advanced
      : payload.standard;

  const fields =
    type === "ADVANCED_360"
      ? SCORE_FIELDS_ADVANCED
      : SCORE_FIELDS_STANDARD;

  const scores =
    fields
      .map((field) =>
        normalizeScore(
          source?.[field],
        ),
      )
      .filter(
        (score) =>
          !score.notApplicable &&
          score.value !== null,
      )
      .map((score) =>
        Number(score.value),
      );

  if (!scores.length) {
    return null;
  }

  return Number(
    (
      scores.reduce(
        (total, score) =>
          total + score,
        0,
      ) / scores.length
    ).toFixed(2),
  );
}

function classificationFor(
  average: number | null,
) {
  if (average === null) {
    return "Não classificada";
  }

  if (average >= 9) {
    return "Excecional";
  }

  if (average >= 8) {
    return "Muito Bom";
  }

  if (average >= 7) {
    return "Bom";
  }

  if (average >= 5) {
    return "Suficiente";
  }

  return "Insuficiente";
}

function scoreText(
  score: any,
) {
  if (
    !score ||
    score.notApplicable
  ) {
    return "N/A";
  }

  return `${score.value}/10`;
}

function truncate(
  value: unknown,
  max = 1000,
) {
  const text =
    String(value || "").trim();

  if (!text) {
    return "Não indicado";
  }

  return text.length > max
    ? `${text.slice(0, max - 1)}…`
    : text;
}

function buildDiscordPayload(
  evaluation: any,
) {
  const approved =
    evaluation.status ===
    "APPROVED";

  const rejected =
    evaluation.status ===
    "REJECTED";

  const pending =
    evaluation.status ===
    "PENDING";

  const color = approved
    ? 0x22c55e
    : rejected
      ? 0xef4444
      : evaluation.type ===
          "ADVANCED_360"
        ? 0x8e44ad
        : 0x2563eb;

  const fields: any[] = [
    {
      name: "👮 Sargento Avaliador",
      value:
        `<@${evaluation.evaluatorDiscordId}>`,
      inline: true,
    },
    {
      name: "🎯 Militar Avaliado",
      value:
        `<@${evaluation.evaluatedDiscordId}>`,
      inline: true,
    },
    {
      name: "📋 Modelo",
      value:
        evaluation.type ===
        "ADVANCED_360"
          ? "Avaliação Avançada 360.º"
          : "Avaliação Operacional",
      inline: true,
    },
    {
      name: "📌 Tema",
      value: truncate(
        evaluation.theme,
        1000,
      ),
      inline: false,
    },
    {
      name: "📊 Média Final",
      value:
        evaluation.average ===
        null
          ? "N/A"
          : `${evaluation.average.toFixed(
              2,
            )}/10`,
      inline: true,
    },
    {
      name: "🏅 Classificação",
      value:
        evaluation.classification ||
        "Não classificada",
      inline: true,
    },
    {
      name: "📍 Estado",
      value: approved
        ? "✅ APROVADA"
        : rejected
          ? "❌ REPROVADA"
          : "🟡 PENDENTE DE APROVAÇÃO",
      inline: true,
    },
  ];

  if (
    evaluation.type ===
    "ADVANCED_360"
  ) {
    fields.push(
      {
        name: "🚘 Condução",
        value: scoreText(
          evaluation.advanced
            ?.offensiveDriving,
        ),
        inline: true,
      },
      {
        name: "🔫 Tiro/Armamento",
        value: scoreText(
          evaluation.advanced
            ?.shootingWeapons,
        ),
        inline: true,
      },
      {
        name: "🛡️ Tático/Posição",
        value: scoreText(
          evaluation.advanced
            ?.tacticalPositioning,
        ),
        inline: true,
      },
      {
        name: "📡 Rádio",
        value: scoreText(
          evaluation.advanced
            ?.radioCommunications,
        ),
        inline: true,
      },
      {
        name: "👮 Conduta",
        value: scoreText(
          evaluation.advanced
            ?.postureConduct,
        ),
        inline: true,
      },
      {
        name: "👑 Liderança",
        value: scoreText(
          evaluation.advanced
            ?.leadershipInitiative,
        ),
        inline: true,
      },
      {
        name: "🧘 Stress",
        value: scoreText(
          evaluation.advanced
            ?.stressManagement,
        ),
        inline: true,
      },
      {
        name: "⚖️ Legislação",
        value: scoreText(
          evaluation.advanced
            ?.argumentationLegislation,
        ),
        inline: true,
      },
      {
        name: "📝 Resumo da Patrulha",
        value: truncate(
          evaluation.advanced
            ?.patrolSummary,
          1000,
        ),
        inline: false,
      },
      {
        name: "✅ Pontos Fortes",
        value: truncate(
          evaluation.advanced
            ?.strengths,
          1000,
        ),
        inline: true,
      },
      {
        name: "⚠️ A Melhorar",
        value: truncate(
          evaluation.advanced
            ?.improvements,
          1000,
        ),
        inline: true,
      },
      {
        name: "📈 Parecer",
        value: truncate(
          evaluation.advanced
            ?.promotionOpinion,
          1000,
        ),
        inline: false,
      },
    );
  } else {
    fields.push(
      {
        name: "📡 Rádio",
        value: scoreText(
          evaluation.standard
            ?.radio,
        ),
        inline: true,
      },
      {
        name: "👮 Conduta",
        value: scoreText(
          evaluation.standard
            ?.conduct,
        ),
        inline: true,
      },
      {
        name: "⚖️ Detenções",
        value: scoreText(
          evaluation.standard
            ?.detention,
        ),
        inline: true,
      },
      {
        name: "⚠️ Incidente",
        value: scoreText(
          evaluation.standard
            ?.incident,
        ),
        inline: true,
      },
      {
        name: "📝 Observações",
        value: truncate(
          evaluation.standard
            ?.observations,
          1000,
        ),
        inline: false,
      },
      {
        name: "📈 Parecer Final",
        value: truncate(
          evaluation.standard
            ?.finalOpinion,
          1000,
        ),
        inline: false,
      },
    );
  }

  if (!pending) {
    fields.push({
      name: approved
        ? "✅ Decisão"
        : "❌ Decisão",
      value: [
        `**Responsável:** ${
          evaluation.decision
            ?.byDiscordId
            ? `<@${evaluation.decision.byDiscordId}>`
            : evaluation.decision
                ?.byName ||
              "Desconhecido"
        }`,
        `**Origem:** ${
          evaluation.decision
            ?.source ||
          "Desconhecida"
        }`,
        `**Data:** ${
          evaluation.decision?.at
            ? new Date(
                evaluation.decision.at,
              ).toLocaleString(
                "pt-PT",
              )
            : "Desconhecida"
        }`,
        rejected
          ? `**Motivo:** ${truncate(
              evaluation.decision
                ?.reason,
              900,
            )}`
          : null,
      ]
        .filter(Boolean)
        .join("\n"),
      inline: false,
    });
  }

  const components = pending
    ? [
        {
          type: 1,
          components: [
            {
              type: 2,
              style: 3,
              label: "Aprovar",
              emoji: {
                name: "✅",
              },
              custom_id:
                `sgeval_approve_${evaluation._id}`,
            },
            {
              type: 2,
              style: 4,
              label: "Reprovar",
              emoji: {
                name: "❌",
              },
              custom_id:
                `sgeval_reject_${evaluation._id}`,
            },
            {
              type: 2,
              style: 5,
              label:
                "Abrir no site",
              emoji: {
                name: "🌐",
              },
              url:
                `${CENTRAL_BASE_URL}/avaliacoes-sargentos?evaluation=${evaluation._id}`,
            },
          ],
        },
      ]
    : [
        {
          type: 1,
          components: [
            {
              type: 2,
              style: 5,
              label:
                "Consultar no site",
              emoji: {
                name: "🌐",
              },
              url:
                `${CENTRAL_BASE_URL}/avaliacoes-sargentos?evaluation=${evaluation._id}`,
            },
          ],
        },
      ];

  return {
    embeds: [
      {
        title:
          evaluation.type ===
          "ADVANCED_360"
            ? "🛡️ AVALIAÇÃO AVANÇADA 360.º"
            : "🛡️ AVALIAÇÃO OPERACIONAL",
        description:
          pending
            ? "Avaliação submetida por um Sargento e a aguardar decisão."
            : approved
              ? "Avaliação validada e integrada no histórico oficial."
              : "Avaliação reprovada e excluída das estatísticas oficiais.",
        color,
        thumbnail:
          evaluation
            .evaluatedAvatarUrl
            ? {
                url:
                  evaluation
                    .evaluatedAvatarUrl,
              }
            : undefined,
        fields:
          fields.slice(0, 25),
        footer: {
          text:
            `GNR Central · ID ${evaluation._id}`,
        },
        timestamp:
          new Date(
            evaluation.createdAt ||
              Date.now(),
          ).toISOString(),
      },
    ],
    components,
  };
}

async function discordRequest(
  path: string,
  options: RequestInit = {},
) {
  if (!DISCORD_TOKEN) {
    throw new Error(
      "TOKEN/DISCORD_TOKEN não configurado.",
    );
  }

  const response = await fetch(
    `https://discord.com/api/v10${path}`,
    {
      ...options,
      headers: {
        Authorization:
          `Bot ${DISCORD_TOKEN}`,
        "Content-Type":
          "application/json",
        ...(options.headers || {}),
      },
    },
  );

  const payload =
    await response
      .json()
      .catch(() => null);

  if (!response.ok) {
    throw new Error(
      payload?.message ||
        `Discord ${response.status}`,
    );
  }

  return payload;
}

async function publishEvaluation(
  evaluation: any,
) {
  const payload =
    buildDiscordPayload(
      evaluation,
    );

  const message =
    await discordRequest(
      `/channels/${EVALUATION_CHANNEL_ID}/messages`,
      {
        method: "POST",
        body:
          JSON.stringify(payload),
      },
    );

  const jumpUrl =
    DISCORD_GUILD_ID
      ? `https://discord.com/channels/${DISCORD_GUILD_ID}/${EVALUATION_CHANNEL_ID}/${message.id}`
      : null;

  evaluation.discord = {
    channelId:
      EVALUATION_CHANNEL_ID,
    messageId:
      String(message.id),
    jumpUrl,
    publishedAt:
      new Date(),
    publishError: null,
  };

  await evaluation.save();

  return evaluation;
}

async function syncDiscordMessage(
  evaluation: any,
) {
  const channelId =
    evaluation.discord
      ?.channelId;

  const messageId =
    evaluation.discord
      ?.messageId;

  if (
    !channelId ||
    !messageId
  ) {
    return;
  }

  await discordRequest(
    `/channels/${channelId}/messages/${messageId}`,
    {
      method: "PATCH",
      body: JSON.stringify(
        buildDiscordPayload(
          evaluation,
        ),
      ),
    },
  );
}


const legacyScoreSchema =
  new mongoose.Schema(
    {},
    {
      strict: false,
      _id: false,
    },
  );

const LegacyNormalEvaluation =
  mongoose.models.LegacyNormalEvaluation ||
  mongoose.model(
    "LegacyNormalEvaluation",
    new mongoose.Schema(
      {},
      {
        strict: false,
        collection: "avaliacaos",
      },
    ),
  );

const LegacyAdvancedEvaluation =
  mongoose.models.LegacyAdvancedEvaluation ||
  mongoose.model(
    "LegacyAdvancedEvaluation",
    new mongoose.Schema(
      {},
      {
        strict: false,
        collection: "avaliacaoavancadas",
      },
    ),
  );

function legacyScore(
  value: any,
) {
  if (
    value === "N/A" ||
    value?.notApplicable === true
  ) {
    return {
      value: null,
      notApplicable: true,
    };
  }

  const number =
    Number(
      value?.value ?? value,
    );

  return {
    value:
      Number.isFinite(number)
        ? Math.max(
            0,
            Math.min(10, number),
          )
        : 0,
    notApplicable: false,
  };
}

function legacyStatus(
  value: any,
) {
  return [
    "PENDING",
    "APPROVED",
    "REJECTED",
  ].includes(String(value))
    ? String(value)
    : "PENDING";
}

function legacyDecision(
  item: any,
) {
  if (
    legacyStatus(
      item.validationStatus,
    ) === "PENDING"
  ) {
    return undefined;
  }

  return {
    byDiscordId:
      item.validatedBy || null,
    byName: null,
    at:
      item.updatedAt ||
      item.timestamp ||
      new Date(),
    source: "LEGACY",
    reason:
      item.validationReason ||
      "",
  };
}

function legacyClassification(
  average: number | null,
  rank?: string,
) {
  if (rank) return rank;
  return classificationFor(
    average,
  );
}

async function importLegacyNormal(
  item: any,
) {
  const average =
    Number.isFinite(
      Number(item.mediaFinal),
    )
      ? Number(item.mediaFinal)
      : null;

  return SergeantEvaluation.findOneAndUpdate(
    {
      "legacy.collection":
        "Avaliacao",
      "legacy.id":
        String(item._id),
    },
    {
      $set: {
        type: "STANDARD",
        source: "MIGRATED",
        legacy: {
          collection:
            "Avaliacao",
          id: String(item._id),
        },
        status:
          legacyStatus(
            item.validationStatus,
          ),
        evaluatorDiscordId:
          String(
            item.avaliadorId,
          ),
        evaluatorName:
          item.evaluatorName ||
          `Sargento ${item.avaliadorId}`,
        evaluatorRank:
          "Sargento",
        evaluatedDiscordId:
          String(
            item.avaliadoId,
          ),
        evaluatedName:
          item.evaluatedName ||
          `Militar ${item.avaliadoId}`,
        evaluatedRank:
          item.rank ||
          "Guarda",
        theme:
          item.tema ||
          "Avaliação operacional",
        standard: {
          radio:
            legacyScore(
              item.notas?.radio,
            ),
          conduct:
            legacyScore(
              item.notas?.conduta,
            ),
          detention:
            legacyScore(
              item.notas
                ?.detencao,
            ),
          incident:
            legacyScore(
              item.notas
                ?.incidente,
            ),
          detentionsSummary:
            item.detalhes
              ?.detencao || "",
          incidentSummary:
            item.detalhes
              ?.incidente || "",
          observations:
            item.detalhes
              ?.geral || "",
          finalOpinion:
            item.detalhes
              ?.performance ||
            "",
        },
        average,
        classification:
          legacyClassification(
            average,
            item.rank,
          ),
        decision:
          legacyDecision(item),
        createdAt:
          item.timestamp ||
          item.createdAt ||
          new Date(),
        updatedAt:
          item.updatedAt ||
          item.timestamp ||
          new Date(),
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    },
  );
}

async function importLegacyAdvanced(
  item: any,
) {
  const average =
    Number.isFinite(
      Number(item.mediaFinal),
    )
      ? Number(item.mediaFinal)
      : null;

  return SergeantEvaluation.findOneAndUpdate(
    {
      "legacy.collection":
        "AvaliacaoAvancada",
      "legacy.id":
        String(item._id),
    },
    {
      $set: {
        type:
          "ADVANCED_360",
        source: "MIGRATED",
        legacy: {
          collection:
            "AvaliacaoAvancada",
          id: String(item._id),
        },
        status:
          legacyStatus(
            item.validationStatus,
          ),
        evaluatorDiscordId:
          String(
            item.avaliadorId,
          ),
        evaluatorName:
          item.evaluatorName ||
          `Sargento ${item.avaliadorId}`,
        evaluatorRank:
          "Sargento",
        evaluatedDiscordId:
          String(
            item.avaliadoId,
          ),
        evaluatedName:
          item.evaluatedName ||
          `Militar ${item.avaliadoId}`,
        evaluatedRank:
          item.rank ||
          "Guarda",
        theme:
          item.tema ||
          "Avaliação avançada 360.º",
        advanced: {
          offensiveDriving:
            legacyScore(
              item.notas
                ?.conducao,
            ),
          shootingWeapons:
            legacyScore(
              item.notas?.tiro,
            ),
          tacticalPositioning:
            legacyScore(
              item.notas
                ?.tatico,
            ),
          radioCommunications:
            legacyScore(
              item.notas?.radio,
            ),
          postureConduct:
            legacyScore(
              item.notas
                ?.conduta,
            ),
          leadershipInitiative:
            legacyScore(
              item.notas
                ?.lideranca,
            ),
          stressManagement:
            legacyScore(
              item.notas
                ?.stress,
            ),
          argumentationLegislation:
            legacyScore(
              item.notas
                ?.argumentacao,
            ),
          patrolSummary:
            item.detalhes
              ?.resumoPatrulha ||
            "",
          behavioralAnalysis:
            item.detalhes
              ?.analiseComportamental ||
            "",
          strengths:
            item.detalhes
              ?.pontosFortes ||
            "",
          improvements:
            item.detalhes
              ?.pontosMelhoria ||
            "",
          promotionOpinion:
            item.detalhes
              ?.parecerFinal ||
            "",
          occurrences: [
            item.ocorrencias
              ?.detencoes
              ? `Detenções: ${item.ocorrencias.detencoes}`
              : "",
            item.ocorrencias
              ?.incidentes
              ? `Incidentes: ${item.ocorrencias.incidentes}`
              : "",
          ]
            .filter(Boolean)
            .join("\n"),
          approaches: [
            item.abordagens
              ?.normais
              ? `Normais: ${item.abordagens.normais.quantidade || 0} · Nota ${item.abordagens.normais.nota ?? "N/A"}`
              : "",
            item.abordagens
              ?.risco
              ? `Risco: ${item.abordagens.risco.quantidade || 0} · Nota ${item.abordagens.risco.nota ?? "N/A"}`
              : "",
          ]
            .filter(Boolean)
            .join("\n"),
        },
        average,
        classification:
          legacyClassification(
            average,
            item.rank,
          ),
        decision:
          legacyDecision(item),
        createdAt:
          item.timestamp ||
          item.createdAt ||
          new Date(),
        updatedAt:
          item.updatedAt ||
          item.timestamp ||
          new Date(),
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    },
  );
}

async function syncLegacyEvaluations() {
  const [
    normal,
    advanced,
  ] = await Promise.all([
    LegacyNormalEvaluation.find(
      {},
    ).lean(),
    LegacyAdvancedEvaluation.find(
      {},
    ).lean(),
  ]);

  for (const item of normal) {
    await importLegacyNormal(item);
  }

  for (
    const item of advanced
  ) {
    await importLegacyAdvanced(
      item,
    );
  }

  return {
    normal:
      normal.length,
    advanced:
      advanced.length,
    total:
      normal.length +
      advanced.length,
  };
}

async function updateLegacyDecision(
  evaluation: any,
) {
  const collection =
    evaluation.legacy
      ?.collection;

  const legacyId =
    evaluation.legacy?.id;

  if (
    !collection ||
    !legacyId
  ) {
    return;
  }

  const model =
    collection ===
    "AvaliacaoAvancada"
      ? LegacyAdvancedEvaluation
      : LegacyNormalEvaluation;

  await model.updateOne(
    {
      _id: legacyId,
    },
    {
      $set: {
        validationStatus:
          evaluation.status,
        validatedBy:
          evaluation.decision
            ?.byDiscordId ||
          null,
        validationReason:
          evaluation.decision
            ?.reason ||
          null,
      },
    },
  );
}

function guardSummary(
  evaluations: any[],
) {
  const map =
    new Map<string, any>();

  for (
    const item of evaluations
  ) {
    const key =
      item.evaluatedDiscordId;

    if (!map.has(key)) {
      map.set(key, {
        discordId: key,
        name:
          item.evaluatedName,
        rank:
          item.evaluatedRank,
        avatarUrl:
          item.evaluatedAvatarUrl,
        total: 0,
        approved: 0,
        pending: 0,
        rejected: 0,
        normal: 0,
        advanced: 0,
        average: null,
        latestAt: null,
        strengths: [],
        improvements: [],
        evaluations: [],
      });
    }

    const summary =
      map.get(key);

    summary.total += 1;
    summary[
      item.status ===
      "APPROVED"
        ? "approved"
        : item.status ===
            "REJECTED"
          ? "rejected"
          : "pending"
    ] += 1;

    summary[
      item.type ===
      "ADVANCED_360"
        ? "advanced"
        : "normal"
    ] += 1;

    summary.evaluations.push(
      item,
    );

    if (
      !summary.latestAt ||
      new Date(
        item.createdAt,
      ).getTime() >
        new Date(
          summary.latestAt,
        ).getTime()
    ) {
      summary.latestAt =
        item.createdAt;
    }

    if (
      item.status ===
        "APPROVED" &&
      Number.isFinite(
        item.average,
      )
    ) {
      summary._scores =
        summary._scores || [];

      summary._scores.push(
        item.average,
      );
    }

    const strengths =
      item.advanced
        ?.strengths;

    const improvements =
      item.advanced
        ?.improvements;

    if (strengths) {
      summary.strengths.push(
        strengths,
      );
    }

    if (improvements) {
      summary.improvements.push(
        improvements,
      );
    }
  }

  return [...map.values()]
    .map((summary) => {
      const scores =
        summary._scores || [];

      summary.average =
        scores.length
          ? Number(
              (
                scores.reduce(
                  (
                    total: number,
                    value: number,
                  ) =>
                    total +
                    value,
                  0,
                ) /
                scores.length
              ).toFixed(2),
            )
          : null;

      delete summary._scores;

      summary.evaluations.sort(
        (a: any, b: any) =>
          new Date(
            b.createdAt,
          ).getTime() -
          new Date(
            a.createdAt,
          ).getTime(),
      );

      return summary;
    })
    .sort((a, b) => {
      if (
        a.average !== null &&
        b.average !== null
      ) {
        return (
          b.average -
          a.average
        );
      }

      if (a.average !== null) {
        return -1;
      }

      if (b.average !== null) {
        return 1;
      }

      return a.name.localeCompare(
        b.name,
        "pt-PT",
      );
    });
}



router.post(
  "/sync-legacy",
  requireAuth,
  requireApprover,
  async (_req, res) => {
    const result =
      await syncLegacyEvaluations();

    return res.json({
      ok: true,
      ...result,
    });
  },
);

router.get(
  "/cso-summary",
  requireAuth,
  requireSergeant,
  async (_req, res) => {
    const migration =
      await syncLegacyEvaluations();

    const evaluations =
      await SergeantEvaluation.find(
        {},
      )
        .sort({
          createdAt: -1,
        })
        .limit(1000)
        .lean();

    const summaries =
      guardSummary(evaluations);

    const approvedScores =
      evaluations
        .filter(
          (item: any) =>
            item.status ===
              "APPROVED" &&
            Number.isFinite(
              item.average,
            ),
        )
        .map(
          (item: any) =>
            item.average,
        );

    return res.json({
      migration,
      totals: {
        evaluations:
          evaluations.length,
        guards:
          summaries.length,
        pending:
          evaluations.filter(
            (item: any) =>
              item.status ===
              "PENDING",
          ).length,
        approved:
          evaluations.filter(
            (item: any) =>
              item.status ===
              "APPROVED",
          ).length,
        rejected:
          evaluations.filter(
            (item: any) =>
              item.status ===
              "REJECTED",
          ).length,
        normal:
          evaluations.filter(
            (item: any) =>
              item.type ===
              "STANDARD",
          ).length,
        advanced:
          evaluations.filter(
            (item: any) =>
              item.type ===
              "ADVANCED_360",
          ).length,
        site:
          evaluations.filter(
            (item: any) =>
              item.source ===
              "SITE",
          ).length,
        discord:
          evaluations.filter(
            (item: any) =>
              item.source !==
              "SITE",
          ).length,
        officialAverage:
          approvedScores.length
            ? Number(
                (
                  approvedScores.reduce(
                    (
                      total: number,
                      value: number,
                    ) =>
                      total +
                      value,
                    0,
                  ) /
                  approvedScores.length
                ).toFixed(2),
              )
            : null,
      },
      guards: summaries,
      evaluations,
    });
  },
);

router.get(
  "/access",
  requireAuth,
  (req, res) => {
    return res.json({
      canCreate:
        isSergeant(req),
      canApprove:
        canApprove(req),
      roleIds: {
        sergeant:
          SERGEANT_ROLE_ID,
        command:
          COMMAND_GENERAL_ROLE_ID,
      },
    });
  },
);

router.get(
  "/",
  requireAuth,
  requireSergeant,
  async (req, res) => {
    const status =
      req.query.status
        ? String(
            req.query.status,
          )
        : null;

    const mine =
      String(
        req.query.mine ||
          "",
      ) === "true";

    const query: any = {};

    if (
      status &&
      [
        "DRAFT",
        "PENDING",
        "APPROVED",
        "REJECTED",
      ].includes(status)
    ) {
      query.status = status;
    }

    if (mine) {
      query.evaluatorDiscordId =
        currentUserId(req);
    }

    const items =
      await SergeantEvaluation.find(
        query,
      )
        .sort({
          createdAt: -1,
        })
        .limit(250)
        .lean();

    return res.json({
      items,
      permissions: {
        canCreate:
          isSergeant(req),
        canApprove:
          canApprove(req),
      },
    });
  },
);

router.get(
  "/stats",
  requireAuth,
  requireSergeant,
  async (req, res) => {
    const [
      total,
      pending,
      approved,
      rejected,
      mine,
    ] = await Promise.all([
      SergeantEvaluation.countDocuments(),
      SergeantEvaluation.countDocuments({
        status: "PENDING",
      }),
      SergeantEvaluation.countDocuments({
        status: "APPROVED",
      }),
      SergeantEvaluation.countDocuments({
        status: "REJECTED",
      }),
      SergeantEvaluation.countDocuments({
        evaluatorDiscordId:
          currentUserId(req),
      }),
    ]);

    const averages =
      await SergeantEvaluation.aggregate([
        {
          $match: {
            status: "APPROVED",
            average: {
              $ne: null,
            },
          },
        },
        {
          $group: {
            _id: null,
            average: {
              $avg: "$average",
            },
          },
        },
      ]);

    return res.json({
      total,
      pending,
      approved,
      rejected,
      mine,
      officialAverage:
        averages[0]?.average
          ? Number(
              averages[0].average.toFixed(
                2,
              ),
            )
          : null,
    });
  },
);

router.get(
  "/profile/:discordId",
  requireAuth,
  async (req, res) => {
    const items =
      await SergeantEvaluation.find({
        evaluatedDiscordId:
          String(
            req.params.discordId,
          ),
        status: "APPROVED",
      })
        .sort({
          createdAt: -1,
        })
        .limit(100)
        .lean();

    const scores =
      items
        .map((item: any) =>
          item.average,
        )
        .filter(
          (value: any) =>
            Number.isFinite(value),
        );

    return res.json({
      items,
      average:
        scores.length > 0
          ? Number(
              (
                scores.reduce(
                  (
                    total: number,
                    score: number,
                  ) =>
                    total +
                    score,
                  0,
                ) /
                scores.length
              ).toFixed(2),
            )
          : null,
    });
  },
);

router.get(
  "/:id",
  requireAuth,
  requireSergeant,
  async (req, res) => {
    const evaluation =
      await SergeantEvaluation.findById(
        req.params.id,
      ).lean();

    if (!evaluation) {
      return res.status(404).json({
        error:
          "Avaliação não encontrada.",
      });
    }

    return res.json({
      evaluation,
      permissions: {
        canApprove:
          canApprove(req),
      },
    });
  },
);

router.post(
  "/",
  requireAuth,
  requireSergeant,
  async (req, res) => {
    try {
      const type =
        String(
          req.body.type ||
            "STANDARD",
        );

      if (
        ![
          "STANDARD",
          "ADVANCED_360",
        ].includes(type)
      ) {
        return res.status(400).json({
          error:
            "Tipo de avaliação inválido.",
        });
      }

      const evaluatedDiscordId =
        String(
          req.body
            .evaluatedDiscordId ||
            "",
        ).trim();

      const evaluatedName =
        String(
          req.body
            .evaluatedName ||
            "",
        ).trim();

      if (
        !evaluatedDiscordId ||
        !evaluatedName
      ) {
        return res.status(400).json({
          error:
            "Seleciona o militar a avaliar.",
        });
      }

      if (
        evaluatedDiscordId ===
        currentUserId(req)
      ) {
        return res.status(400).json({
          error:
            "Não podes avaliar o teu próprio utilizador.",
        });
      }

      if (
        !(await isCurrentGnrMember(
          evaluatedDiscordId,
        ))
      ) {
        return res.status(400).json({
          error:
            "O elemento selecionado não possui atualmente a tag Guarda Nacional Republicana.",
        });
      }

      const theme =
        String(
          req.body.theme || "",
        ).trim();

      if (!theme) {
        return res.status(400).json({
          error:
            "Indica o tema da avaliação.",
        });
      }

      const payload: any = {
        ...req.body,
        type,
      };

      const average =
        calculateAverage(
          type,
          payload,
        );

      const normalizedStandard =
        type === "STANDARD"
          ? Object.fromEntries(
              SCORE_FIELDS_STANDARD.map(
                (field) => [
                  field,
                  normalizeScore(
                    req.body
                      ?.standard?.[
                      field
                    ],
                  ),
                ],
              ),
            )
          : undefined;

      const normalizedAdvanced =
        type === "ADVANCED_360"
          ? Object.fromEntries(
              SCORE_FIELDS_ADVANCED.map(
                (field) => [
                  field,
                  normalizeScore(
                    req.body
                      ?.advanced?.[
                      field
                    ],
                  ),
                ],
              ),
            )
          : undefined;

      const evaluation =
        await SergeantEvaluation.create({
          type,
          status: "PENDING",
          evaluatorDiscordId:
            currentUserId(req),
          evaluatorName:
            currentUserName(req),
          evaluatorRank:
            String(
              currentUser(req)
                ?.rank ||
                "Sargento",
            ),
          evaluatedDiscordId,
          evaluatedName,
          evaluatedRank:
            String(
              req.body
                .evaluatedRank ||
                "Guarda",
            ),
          evaluatedAvatarUrl:
            req.body
              .evaluatedAvatarUrl ||
            null,
          theme,
          standard:
            type === "STANDARD"
              ? {
                  ...req.body
                    .standard,
                  ...normalizedStandard,
                }
              : undefined,
          advanced:
            type === "ADVANCED_360"
              ? {
                  ...req.body
                    .advanced,
                  ...normalizedAdvanced,
                }
              : undefined,
          average,
          classification:
            classificationFor(
              average,
            ),
        });

      try {
        await publishEvaluation(
          evaluation,
        );
      } catch (publishError: any) {
        evaluation.discord = {
          channelId:
            EVALUATION_CHANNEL_ID,
          messageId: null,
          jumpUrl: null,
          publishedAt: null,
          publishError:
            publishError?.message ||
            "Erro ao publicar.",
        };

        await evaluation.save();
      }

      return res.status(201).json({
        evaluation,
        discordPublished:
          Boolean(
            evaluation.discord
              ?.messageId,
          ),
        warning:
          evaluation.discord
            ?.publishError ||
          null,
      });
    } catch (error: any) {
      return res.status(400).json({
        error:
          error?.message ||
          "Não foi possível criar a avaliação.",
      });
    }
  },
);

router.post(
  "/:id/retry-discord",
  requireAuth,
  requireSergeant,
  async (req, res) => {
    const evaluation =
      await SergeantEvaluation.findById(
        req.params.id,
      );

    if (!evaluation) {
      return res.status(404).json({
        error:
          "Avaliação não encontrada.",
      });
    }

    if (
      evaluation.discord
        ?.messageId
    ) {
      return res.status(400).json({
        error:
          "A avaliação já foi publicada.",
      });
    }

    try {
      await publishEvaluation(
        evaluation,
      );

      return res.json({
        evaluation,
      });
    } catch (error: any) {
      return res.status(400).json({
        error:
          error?.message ||
          "Não foi possível publicar no Discord.",
      });
    }
  },
);

router.post(
  "/:id/approve",
  requireAuth,
  requireApprover,
  async (req, res) => {
    const evaluation =
      await SergeantEvaluation.findOneAndUpdate(
        {
          _id: req.params.id,
          status: "PENDING",
        },
        {
          $set: {
            status:
              "APPROVED",
            decision: {
              byDiscordId:
                currentUserId(req),
              byName:
                currentUserName(req),
              at: new Date(),
              source: "SITE",
              reason: "",
            },
          },
        },
        {
          new: true,
        },
      );

    if (!evaluation) {
      return res.status(409).json({
        error:
          "Esta avaliação já foi processada.",
      });
    }

    await updateLegacyDecision(
      evaluation,
    );

    await updateLegacyDecision(
      evaluation,
    );

    try {
      await syncDiscordMessage(
        evaluation,
      );
    } catch (error) {
      console.error(
        "[SERGEANT EVALUATIONS] Falha ao sincronizar aprovação:",
        error,
      );
    }

    return res.json({
      evaluation,
    });
  },
);

router.post(
  "/:id/reject",
  requireAuth,
  requireApprover,
  async (req, res) => {
    const reason =
      String(
        req.body.reason || "",
      ).trim();

    if (
      reason.length < 3
    ) {
      return res.status(400).json({
        error:
          "Indica o motivo da reprovação.",
      });
    }

    const evaluation =
      await SergeantEvaluation.findOneAndUpdate(
        {
          _id: req.params.id,
          status: "PENDING",
        },
        {
          $set: {
            status:
              "REJECTED",
            decision: {
              byDiscordId:
                currentUserId(req),
              byName:
                currentUserName(req),
              at: new Date(),
              source: "SITE",
              reason,
            },
          },
        },
        {
          new: true,
        },
      );

    if (!evaluation) {
      return res.status(409).json({
        error:
          "Esta avaliação já foi processada.",
      });
    }

    try {
      await syncDiscordMessage(
        evaluation,
      );
    } catch (error) {
      console.error(
        "[SERGEANT EVALUATIONS] Falha ao sincronizar reprovação:",
        error,
      );
    }

    return res.json({
      evaluation,
    });
  },
);

export default router;
