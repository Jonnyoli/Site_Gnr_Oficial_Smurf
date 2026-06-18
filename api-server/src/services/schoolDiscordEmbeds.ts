const SCHOOL_GUILD_ID =
  process.env.SCHOOL_GUILD_ID ||
  "1262916006980878468";

const SCHOOL_TEST_REVIEW_CHANNEL_ID =
  process.env.SCHOOL_TEST_REVIEW_CHANNEL_ID ||
  "";

const SCHOOL_FINAL_EXAM_CHANNEL_ID =
  process.env.SCHOOL_FINAL_EXAM_CHANNEL_ID ||
  SCHOOL_TEST_REVIEW_CHANNEL_ID;

const TOKEN =
  process.env.SCHOOL_DISCORD_BOT_TOKEN ||
  process.env.DISCORD_BOT_TOKEN ||
  process.env.DISCORD_TOKEN ||
  process.env.TOKEN ||
  "";

const EXAMINER_MANAGER_ROLE_ID =
  process.env.SCHOOL_EXAMINER_MANAGER_ROLE_ID ||
  "1503041584613163088";

const CFG_EXAMINER_ROLE_ID =
  process.env.SCHOOL_CFG_EXAMINER_ROLE_ID ||
  "1374862493125443664";

function discordHeaders() {
  if (!TOKEN) {
    throw new Error("Token do bot da Escola não configurado.");
  }

  return {
    Authorization: `Bot ${TOKEN}`,
    "Content-Type": "application/json",
  };
}

async function discordRequest(
  path: string,
  init: RequestInit,
) {
  const response = await fetch(
    `https://discord.com/api/v10${path}`,
    {
      ...init,
      headers: {
        ...discordHeaders(),
        ...(init.headers || {}),
      },
    },
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Discord API ${response.status}: ${body.slice(0, 300)}`,
    );
  }

  return response;
}

function resultColor(decision: string) {
  return decision === "APPROVED"
    ? 0x22c55e
    : 0xef4444;
}

function resultLabel(decision: string) {
  return decision === "APPROVED"
    ? "APROVADO"
    : "REPROVADO";
}

export async function sendTrainingReviewEmbed(
  attempt: any,
) {
  if (!SCHOOL_TEST_REVIEW_CHANNEL_ID) {
    return {
      sent: false,
      reason: "SCHOOL_TEST_REVIEW_CHANNEL_ID não configurado.",
    };
  }

  const embed = {
    title: "🏫 Resultado de Formação",
    description:
      `A avaliação do teste de **${attempt.trainingTitle}** foi concluída.`,
    color: resultColor(attempt.status),
    fields: [
      {
        name: "👤 Formando",
        value: attempt.studentName || attempt.studentId,
        inline: true,
      },
      {
        name: "📚 Formação",
        value: attempt.trainingTitle,
        inline: true,
      },
      {
        name: "🔁 Tentativa",
        value: String(attempt.attempt || 1),
        inline: true,
      },
      {
        name: "📊 Resultado",
        value:
          `**${resultLabel(attempt.status)}**\n` +
          `Classificação: **${Number(attempt.score || 0).toFixed(1)}/20**`,
        inline: true,
      },
      {
        name: "🧑‍🏫 Avaliador",
        value: attempt.reviewerName || "Não identificado",
        inline: true,
      },
      {
        name: "📝 Observações",
        value:
          attempt.reviewNotes?.trim() ||
          "Sem observações adicionais.",
        inline: false,
      },
    ],
    footer: {
      text: "Escola da Guarda — Avaliação de Formação",
    },
    timestamp: new Date().toISOString(),
  };

  const response = await discordRequest(
    `/channels/${SCHOOL_TEST_REVIEW_CHANNEL_ID}/messages`,
    {
      method: "POST",
      body: JSON.stringify({
        content:
          `<@${attempt.studentId}>`,
        embeds: [embed],
        allowed_mentions: {
          users: [String(attempt.studentId)],
        },
      }),
    },
  );

  const message: any = await response.json();

  return {
    sent: true,
    channelId: SCHOOL_TEST_REVIEW_CHANNEL_ID,
    messageId: message.id,
    jumpUrl:
      `https://discord.com/channels/${SCHOOL_GUILD_ID}/${SCHOOL_TEST_REVIEW_CHANNEL_ID}/${message.id}`,
  };
}

export async function sendFinalExamRequestEmbed(
  exam: any,
) {
  if (!SCHOOL_FINAL_EXAM_CHANNEL_ID) {
    return {
      sent: false,
      reason: "SCHOOL_FINAL_EXAM_CHANNEL_ID não configurado.",
    };
  }

  const embed = {
    title: "🎓 Novo Pedido de Exame Final",
    description:
      "Um Guarda Provisório concluiu os requisitos e pediu abertura do Exame Final.",
    color: 0xf59e0b,
    fields: [
      {
        name: "👤 Guarda Provisório",
        value: exam.studentName || exam.studentId,
        inline: true,
      },
      {
        name: "🔁 Tentativa",
        value: String(exam.attempt || 1),
        inline: true,
      },
      {
        name: "🚓 Patrulha",
        value: exam.patrolCallsign || "LINCOLN",
        inline: true,
      },
      {
        name: "📌 Estado",
        value: "Aguardar atribuição e agendamento",
        inline: false,
      },
    ],
    footer: {
      text: "Escola da Guarda — Centro de Exames",
    },
    timestamp: new Date().toISOString(),
  };

  const response = await discordRequest(
    `/channels/${SCHOOL_FINAL_EXAM_CHANNEL_ID}/messages`,
    {
      method: "POST",
      body: JSON.stringify({
        content:
          `<@&${EXAMINER_MANAGER_ROLE_ID}> <@&${CFG_EXAMINER_ROLE_ID}>`,
        embeds: [embed],
        allowed_mentions: {
          roles: [
            EXAMINER_MANAGER_ROLE_ID,
            CFG_EXAMINER_ROLE_ID,
          ],
        },
      }),
    },
  );

  const message: any = await response.json();

  return {
    sent: true,
    channelId: SCHOOL_FINAL_EXAM_CHANNEL_ID,
    messageId: message.id,
    jumpUrl:
      `https://discord.com/channels/${SCHOOL_GUILD_ID}/${SCHOOL_FINAL_EXAM_CHANNEL_ID}/${message.id}`,
  };
}

export async function sendFinalExamResultEmbed(
  exam: any,
) {
  if (!SCHOOL_FINAL_EXAM_CHANNEL_ID) {
    return {
      sent: false,
      reason: "SCHOOL_FINAL_EXAM_CHANNEL_ID não configurado.",
    };
  }

  const approved =
    exam.status === "APPROVED";

  const embed = {
    title:
      approved
        ? "🏆 Exame Final — Aprovado"
        : "📕 Exame Final — Reprovado",
    description:
      approved
        ? "O Guarda Provisório concluiu com sucesso o Exame Final."
        : "O Guarda Provisório não obteve aprovação no Exame Final.",
    color:
      approved
        ? 0x22c55e
        : 0xef4444,
    fields: [
      {
        name: "👤 Guarda Provisório",
        value: exam.studentName || exam.studentId,
        inline: true,
      },
      {
        name: "🛡️ Examinador",
        value: exam.examinerName || "Não identificado",
        inline: true,
      },
      {
        name: "📊 Classificação",
        value: `${Number(exam.score || 0).toFixed(1)}/20`,
        inline: true,
      },
      {
        name: "🚓 Patrulha",
        value:
          `${exam.patrolCallsign || "LINCOLN"}` +
          (exam.patrolVehicle
            ? ` — ${exam.patrolVehicle}`
            : ""),
        inline: true,
      },
      {
        name: "📝 Observações",
        value:
          exam.notes?.trim() ||
          exam.failureReason?.trim() ||
          "Sem observações adicionais.",
        inline: false,
      },
    ],
    footer: {
      text: "Escola da Guarda — Relatório Final",
    },
    timestamp: new Date().toISOString(),
  };

  const response = await discordRequest(
    `/channels/${SCHOOL_FINAL_EXAM_CHANNEL_ID}/messages`,
    {
      method: "POST",
      body: JSON.stringify({
        content: `<@${exam.studentId}>`,
        embeds: [embed],
        allowed_mentions: {
          users: [String(exam.studentId)],
        },
      }),
    },
  );

  const message: any = await response.json();

  return {
    sent: true,
    channelId: SCHOOL_FINAL_EXAM_CHANNEL_ID,
    messageId: message.id,
    jumpUrl:
      `https://discord.com/channels/${SCHOOL_GUILD_ID}/${SCHOOL_FINAL_EXAM_CHANNEL_ID}/${message.id}`,
  };
}
