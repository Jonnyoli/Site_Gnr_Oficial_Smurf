
import express, { type Express, type NextFunction, type Request, type Response } from "express";
import path from "path";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import router from "./routes";
import { logger } from "./lib/logger";
import { fetchDiscordRoles } from "./middlewares/discord-roles";
import disciplinaryRoutes from "./routes/disciplinaryRoutes.js";
import {
  createRateLimiter,
  securityHeaders,
  validateProductionEnvironment,
} from "./middlewares/security";

validateProductionEnvironment();

const SESSION_SECRET =
  process.env["SESSION_SECRET"] ||
  "gnr-dev-secret-change-in-prod";

const isProduction =
  process.env["NODE_ENV"] === "production";

const isHttps =
  process.env["APP_URL"]?.startsWith("https://") ||
  process.env["FRONTEND_URL"]?.startsWith("https://");

const useSecureCookies =
  isProduction && Boolean(isHttps);

const app: Express = express();

app.disable("x-powered-by");

app.use(securityHeaders);

app.use(
  "/api",
  createRateLimiter({
    windowMs: 60_000,
    max: Number(process.env.API_RATE_LIMIT_PER_MINUTE || 240),
    name: "api",
  }),
);

app.use(
  "/api/auth",
  createRateLimiter({
    windowMs: 60_000,
    max: Number(process.env.AUTH_RATE_LIMIT_PER_MINUTE || 60),
    name: "auth",
  }),
);

app.use(
  "/api/youtube",
  createRateLimiter({
    windowMs: 60_000,
    max: Number(process.env.YOUTUBE_RATE_LIMIT_PER_MINUTE || 45),
    name: "youtube",
  }),
);

if (useSecureCookies) {
  app.set("trust proxy", 1);
}

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(
  cors({
    origin: (
      origin,
      callback,
    ) => {
      const allowedOrigins = [
        process.env["FRONTEND_URL"],
        process.env["EXTRA_CORS_ORIGINS"],
        ...(
          process.env["ALLOW_LOCALHOST_CORS"] === "true" ||
          process.env["NODE_ENV"] !== "production"
            ? [
                "http://localhost:5173",
                "http://127.0.0.1:5173",
              ]
            : []
        ),
      ]
        .filter(Boolean)
        .flatMap((value) =>
          String(value)
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        );

      if (
        !origin ||
        allowedOrigins.includes(origin)
      ) {
        callback(null, true);
        return;
      }

      callback(
        new Error(
          "Origem não autorizada pelo CORS.",
        ),
      );
    },
    credentials: true,
  }),
);

app.use(
  session({
    secret: SESSION_SECRET,
    name: "gnr.sid",
    resave: false,
    saveUninitialized: false,
    proxy: useSecureCookies,
    cookie: {
      httpOnly: true,
      secure: useSecureCookies,
      sameSite: "lax",
      maxAge:
        7 * 24 * 60 * 60 * 1000,
    },
  }),
);

/**
 * As imagens do catálogo são enviadas em Base64 dentro de JSON.
 * O limite padrão do Express é demasiado baixo e provocava:
 * 413 Payload Too Large.
 */
app.use(
  express.json({
    limit: "25mb",
  }),
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "25mb",
  }),
);

const transcriptsPath = path.join(
  process.cwd(),
  "../public/transcripts",
);

const legacyTranscriptsPath = path.join(
  process.cwd(),
  "../../public/transcripts",
);

function requireTranscriptAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (req.session?.user) {
    next();
    return;
  }

  res.status(401).json({
    error:
      "É necessário iniciar sessão para consultar arquivos.",
  });
}

app.use(
  "/transcripts",
  requireTranscriptAuth,
  express.static(transcriptsPath),
);

app.use(
  "/transcripts",
  requireTranscriptAuth,
  express.static(legacyTranscriptsPath),
);

/**
 * Atualiza as roles do utilizador autenticado
 * antes de entrar nas rotas.
 */
app.use(fetchDiscordRoles);

/**
 * Sistema disciplinar.
 */
app.use(
  "/api/disciplinary",
  disciplinaryRoutes,
);

/**
 * Restantes rotas da API.
 */
app.use("/api", router);

export default app;



/* PUBLICATION_READY_ERROR_HANDLER */
app.use(
  (
    error: Error,
    _req: Request,
    res: Response,
    _next: NextFunction,
  ) => {
    logger.error(
      { error },
      "Erro não tratado na API.",
    );

    res.status(500).json({
      error:
        process.env.NODE_ENV === "production"
          ? "Erro interno da Central."
          : error.message,
    });
  },
);
