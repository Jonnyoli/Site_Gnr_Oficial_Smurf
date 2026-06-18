import { Router } from "express";
import { logger } from "../lib/logger";
import { getHighestRank } from "../lib/ranks";
import { createAuditLog } from "../lib/audit";

declare module "express-session" {
  interface SessionData {
    user?: any;
    lastSessionAuditAt?: number;
  }
}

const router = Router();

const FRONTEND_URL = process.env["FRONTEND_URL"] || "http://localhost:5173";

function frontendRedirect(path = "/") {
  return `${FRONTEND_URL}${path}`;
}

function getAuthConfig() {
  return {
    clientId: process.env["DISCORD_CLIENT_ID"] || process.env["CLIENT_ID"] || "",
    clientSecret: process.env["DISCORD_CLIENT_SECRET"] ?? "",
  };
}

function getRedirectUri(req: import("express").Request): string {
  if (process.env["REDIRECT_URI"]) return process.env["REDIRECT_URI"];

  const domains = process.env["REPLIT_DOMAINS"];
  const host = domains ? domains.split(",")[0] : req.get("host") ?? "localhost";
  const protocol =
    host.includes("localhost") || host.includes("127.0.0.1")
      ? "http"
      : "https";

  return `${protocol}://${host}/api/auth/discord/callback`;
}

function getSessionName(user?: any) {
  return (
    user?.displayName ||
    user?.username ||
    user?.name ||
    user?.id ||
    "Utilizador"
  );
}

router.get("/discord", async (req, res) => {
  const { clientId, clientSecret } = getAuthConfig();

  if (process.env["NODE_ENV"] !== "production") {
    console.log("[AUTH] clientId:", clientId ? "SET" : "MISSING");
    console.log("[AUTH] clientSecret:", clientSecret ? "SET" : "MISSING");
  }

  if (!clientId || !clientSecret) {
    await createAuditLog(req, {
      action: "LOGIN_FAILED",
      module: "Autenticação",
      severity: "critical",
      description:
        "Tentativa de login falhou porque o Discord OAuth não está configurado.",
      metadata: {
        hasClientId: !!clientId,
        hasClientSecret: !!clientSecret,
      },
    });

    res.status(503).json({
      error:
        process.env["NODE_ENV"] === "production"
          ? "Autenticação Discord indisponível."
          : "Discord OAuth not configured. Set DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET.",
      ...(process.env["NODE_ENV"] === "production"
        ? {}
        : { debug: { id: !!clientId, secret: !!clientSecret } }),
    });

    return;
  }

  const redirectUri = getRedirectUri(req);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "identify",
  });

  res.redirect(`https://discord.com/oauth2/authorize?${params.toString()}`);
});

router.get("/discord/callback", async (req, res) => {
  const code = req.query["code"] as string | undefined;

  if (!code) {
    await createAuditLog(req, {
      action: "LOGIN_FAILED",
      module: "Autenticação",
      severity: "warning",
      description: "Tentativa de login Discord falhou por falta de código OAuth.",
      metadata: {
        reason: "missing_code",
      },
    });

    res.redirect(frontendRedirect("/login?error=missing_code"));
    return;
  }

  try {
    const { clientId, clientSecret } = getAuthConfig();
    const redirectUri = getRedirectUri(req);

    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();

      req.log.error({ err }, "Discord token exchange failed");

      await createAuditLog(req, {
        action: "LOGIN_FAILED",
        module: "Autenticação",
        severity: "critical",
        description: "Falha na troca do token OAuth do Discord.",
        metadata: {
          reason: "token_exchange_failed",
          error: err,
        },
      });

      res.redirect(frontendRedirect("/login?error=token_exchange_failed"));
      return;
    }

    const tokenData = (await tokenRes.json()) as {
      access_token: string;
      token_type: string;
    };

    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userRes.ok) {
      req.log.error("Discord user fetch failed");

      await createAuditLog(req, {
        action: "LOGIN_FAILED",
        module: "Autenticação",
        severity: "critical",
        description: "Falha ao obter os dados do utilizador Discord.",
        metadata: {
          reason: "user_fetch_failed",
        },
      });

      res.redirect(frontendRedirect("/login?error=user_fetch_failed"));
      return;
    }

    const discordUser = (await userRes.json()) as {
      id: string;
      username: string;
      avatar: string | null;
      discriminator: string;
    };

    const GUILD_ID = (
      process.env["GUILD_IDS"] ||
      process.env["DISCORD_GUILD_ID"] ||
      ""
    ).split(",")[0];

    const BOT_TOKEN = process.env["TOKEN"] || process.env["DISCORD_TOKEN"];

    if (!GUILD_ID || !BOT_TOKEN) {
      req.log.error("Missing GUILD_ID or BOT_TOKEN");

      await createAuditLog(req, {
        action: "LOGIN_FAILED",
        module: "Autenticação",
        severity: "critical",
        description: `${discordUser.username} tentou entrar, mas falta configuração do servidor ou bot.`,
        targetId: discordUser.id,
        targetName: discordUser.username,
        metadata: {
          reason: "server_config",
          hasGuildId: !!GUILD_ID,
          hasBotToken: !!BOT_TOKEN,
        },
      });

      res.redirect(frontendRedirect("/login?error=server_config"));
      return;
    }

    const memberRes = await fetch(
      `https://discord.com/api/v10/guilds/${GUILD_ID}/members/${discordUser.id}`,
      {
        headers: { Authorization: `Bot ${BOT_TOKEN}` },
      },
    );

    if (!memberRes.ok) {
      await createAuditLog(req, {
        action: "LOGIN_DENIED",
        module: "Autenticação",
        severity: "warning",
        description: `${discordUser.username} tentou entrar, mas não pertence ao servidor autorizado.`,
        targetId: discordUser.id,
        targetName: discordUser.username,
        metadata: {
          reason: "not_a_member",
          guildId: GUILD_ID,
        },
      });

      res.redirect(frontendRedirect("/login?error=not_a_member"));
      return;
    }

    const memberData = (await memberRes.json()) as {
      roles: string[];
      nick?: string;
    };

    const requiredRoles = [
      process.env["ROLE_ID_COMANDO"],
      process.env["ROLE_ID_OFICIAIS"],
      process.env["ROLE_ID_SARGENTOS"],
      process.env["ROLE_ID_GUARDAS"],
      process.env["ROLE_ID_CFG"],
      process.env["DISCORD_ROLE_ID"],
    ].filter(Boolean);

    const hasAccess =
      requiredRoles.length === 0 ||
      memberData.roles.some((roleId) => requiredRoles.includes(roleId));

    if (!hasAccess && discordUser.id !== process.env["ADMIN_ID"]) {
      await createAuditLog(req, {
        action: "LOGIN_DENIED",
        module: "Autenticação",
        severity: "warning",
        description: `${discordUser.username} tentou entrar sem cargo autorizado.`,
        targetId: discordUser.id,
        targetName: discordUser.username,
        metadata: {
          reason: "unauthorized_role",
          roles: memberData.roles,
          requiredRoles,
        },
      });

      res.redirect(frontendRedirect("/login?error=unauthorized_role"));
      return;
    }

    const rank = getHighestRank(memberData.roles);
    const displayName = memberData.nick || discordUser.username;

    req.session.user = {
      ...discordUser,
      displayName,
      rank,
      roles: memberData.roles,
    };

    req.session.lastSessionAuditAt = Date.now();

    req.log.info(
      { userId: discordUser.id, username: discordUser.username, rank },
      "User logged in with GNR access",
    );

    await createAuditLog(req, {
      action: "LOGIN_SUCCESS",
      module: "Autenticação",
      severity: "success",
      description: `${displayName} entrou na Central.`,
      targetId: discordUser.id,
      targetName: displayName,
      metadata: {
        loginMethod: "Discord",
        rank,
        roles: memberData.roles,
      },
    });

    res.redirect(frontendRedirect("/"));
  } catch (err: any) {
    logger.error({ err }, "Discord OAuth callback error");

    await createAuditLog(req, {
      action: "LOGIN_FAILED",
      module: "Autenticação",
      severity: "critical",
      description: "Erro inesperado no callback OAuth do Discord.",
      metadata: {
        reason: "oauth_error",
        error: err?.message || String(err),
      },
    });

    res.redirect(frontendRedirect("/login?error=oauth_error"));
  }
});

router.get("/me", async (req, res) => {
  if (req.session.user) {
    const now = Date.now();
    const lastAudit = req.session.lastSessionAuditAt || 0;

    /**
     * Evita spam:
     * só regista SESSION_CHECK uma vez a cada 5 minutos por sessão.
     */
    if (now - lastAudit > 5 * 60 * 1000) {
      req.session.lastSessionAuditAt = now;

      await createAuditLog(req, {
        action: "SESSION_CHECK",
        module: "Autenticação",
        severity: "info",
        description: `${getSessionName(
          req.session.user,
        )} acedeu à Central com sessão ativa.`,
        targetId: req.session.user?.id,
        targetName: getSessionName(req.session.user),
        metadata: {
          route: "/api/auth/me",
          rank: req.session.user?.rank,
        },
      });
    }

    res.json(req.session.user);
    return;
  }

  if (
    process.env["NODE_ENV"] !== "production" &&
    !process.env["DISCORD_CLIENT_ID"] &&
    !process.env["CLIENT_ID"]
  ) {
    const demoUser = {
      id: "dev",
      username: "Utilizador Demo",
      displayName: "Comandante Demo",
      avatar: null,
      discriminator: "0000",
      rank: "Comando Geral",
      roles: ["1147878942099906672"],
    };

    req.session.user = demoUser;

    await createAuditLog(req, {
      action: "LOGIN_SUCCESS",
      module: "Autenticação",
      severity: "success",
      description: "Comandante Demo entrou na Central em modo desenvolvimento.",
      targetId: demoUser.id,
      targetName: demoUser.displayName,
      metadata: {
        loginMethod: "Demo",
        rank: demoUser.rank,
      },
    });

    res.json(demoUser);
    return;
  }

  res.status(401).json({ user: null });
});

router.post("/logout", async (req, res) => {
  const sessionUser = req.session.user;

  if (sessionUser) {
    await createAuditLog(req, {
      action: "LOGOUT",
      module: "Autenticação",
      severity: "info",
      description: `${getSessionName(sessionUser)} terminou sessão na Central.`,
      targetId: sessionUser?.id,
      targetName: getSessionName(sessionUser),
      metadata: {
        logoutMethod: "Manual",
        rank: sessionUser?.rank,
      },
    });
  }

  req.session.destroy((err) => {
    if (err) {
      req.log.error({ err }, "Session destroy failed");

      res.status(500).json({ error: "Logout failed" });
      return;
    }

    res.clearCookie("gnr.sid");
    res.json({ ok: true });
  });
});

export default router;