import express from "express";

const router = express.Router();

const COMPLETION_CHANNEL_ID =
  process.env.ONBOARDING_COMPLETION_CHANNEL_ID ||
  "1455702643560153160";

function getAuthenticatedUser(req: any) {
  return (
    req.user ||
    req.session?.user ||
    req.session?.passport?.user ||
    null
  );
}

function cleanText(
  value: unknown,
  maxLength: number,
) {
  return String(value || "")
    .trim()
    .slice(0, maxLength);
}

router.post(
  "/complete",
  async (req, res) => {
    try {
      const token =
        process.env.DISCORD_BOT_TOKEN ||
        process.env.DISCORD_TOKEN ||
        process.env.BOT_TOKEN;

      if (!token) {
        res.status(500).json({
          error:
            "O token do bot Discord não está configurado no backend.",
        });
        return;
      }

      const authenticatedUser =
        getAuthenticatedUser(req);

      const discordId =
        cleanText(
          authenticatedUser?.id ||
          authenticatedUser?.discordId ||
          req.body?.discordId,
          32,
        );

      const displayName =
        cleanText(
          authenticatedUser?.displayName ||
          authenticatedUser?.globalName ||
          authenticatedUser?.username ||
          req.body?.displayName ||
          "Guarda",
          100,
        );

      if (
        !/^\d{16,22}$/.test(
          discordId,
        )
      ) {
        res.status(400).json({
          error:
            "Não foi possível identificar o Discord ID do guarda.",
        });
        return;
      }

      const score =
        Math.max(
          0,
          Number(
            req.body?.score ||
            0,
          ),
        );

      const totalQuestions =
        Math.max(
          1,
          Number(
            req.body?.totalQuestions ||
            1,
          ),
        );

      const completedAt =
        req.body?.completedAt
          ? new Date(
              req.body.completedAt,
            )
          : new Date();

      const unix =
        Math.floor(
          completedAt.getTime() /
          1000,
        );

      const discordResponse =
        await fetch(
          `https://discord.com/api/v10/channels/${COMPLETION_CHANNEL_ID}/messages`,
          {
            method:
              "POST",
            headers: {
              Authorization:
                `Bot ${token}`,
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                content:
                  `<@${discordId}>`,
                allowed_mentions: {
                  users: [
                    discordId,
                  ],
                },
                embeds: [
                  {
                    title:
                      "✅ INTEGRAÇÃO CONCLUÍDA",
                    description:
                      "Um novo elemento concluiu com sucesso a integração inicial da Guarda Nacional Republicana.",
                    color:
                      0x10b981,
                    thumbnail: {
                      url:
                        "https://cdn.discordapp.com/embed/avatars/0.png",
                    },
                    fields: [
                      {
                        name:
                          "👤 Guarda",
                        value:
                          `${displayName}\n<@${discordId}>`,
                        inline:
                          true,
                      },
                      {
                        name:
                          "🆔 Discord ID",
                        value:
                          `\`${discordId}\``,
                        inline:
                          true,
                      },
                      {
                        name:
                          "🎓 Resultado",
                        value:
                          `**${score}/${totalQuestions}** respostas corretas`,
                        inline:
                          true,
                      },
                      {
                        name:
                          "🕒 Conclusão",
                        value:
                          `<t:${unix}:F>\n<t:${unix}:R>`,
                        inline:
                          false,
                      },
                      {
                        name:
                          "🛡️ Estado",
                        value:
                          "Integração concluída e acesso à Central desbloqueado.",
                        inline:
                          false,
                      },
                    ],
                    footer: {
                      text:
                        "Central GNR • Sistema de Integração",
                    },
                    timestamp:
                      completedAt.toISOString(),
                  },
                ],
              }),
          },
        );

      if (!discordResponse.ok) {
        const discordError =
          await discordResponse
            .text()
            .catch(
              () => "",
            );

        console.error(
          "[ONBOARDING-DISCORD]",
          discordResponse.status,
          discordError,
        );

        res.status(502).json({
          error:
            "A integração foi concluída, mas não foi possível enviar o registo para o Discord.",
        });
        return;
      }

      const message =
        await discordResponse.json();

      res.json({
        ok: true,
        channelId:
          COMPLETION_CHANNEL_ID,
        messageId:
          message.id,
      });
    } catch (error) {
      console.error(
        "[ONBOARDING-COMPLETE]",
        error,
      );

      res.status(500).json({
        error:
          "Não foi possível registar a conclusão da integração.",
      });
    }
  },
);

export default router;
