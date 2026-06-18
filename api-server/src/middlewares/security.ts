import type {
  NextFunction,
  Request,
  Response,
} from "express";

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets =
  new Map<string, Bucket>();

function cleanupBuckets() {
  const now =
    Date.now();

  for (const [
    key,
    bucket,
  ] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

export function securityHeaders(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  res.setHeader(
    "X-Content-Type-Options",
    "nosniff",
  );

  res.setHeader(
    "X-Frame-Options",
    "SAMEORIGIN",
  );

  res.setHeader(
    "Referrer-Policy",
    "strict-origin-when-cross-origin",
  );

  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );

  res.setHeader(
    "Cross-Origin-Resource-Policy",
    "same-site",
  );

  next();
}

export function createRateLimiter(
  options: {
    windowMs: number;
    max: number;
    name?: string;
  },
) {
  return (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    const now =
      Date.now();

    if (
      buckets.size >
      10_000
    ) {
      cleanupBuckets();
    }

    const key = [
      options.name || "global",
      req.ip ||
        req.socket.remoteAddress ||
        "unknown",
    ].join(":");

    const existing =
      buckets.get(key);

    if (
      !existing ||
      existing.resetAt <= now
    ) {
      buckets.set(key, {
        count: 1,
        resetAt:
          now + options.windowMs,
      });

      next();
      return;
    }

    existing.count += 1;

    if (
      existing.count >
      options.max
    ) {
      const retryAfter =
        Math.max(
          1,
          Math.ceil(
            (existing.resetAt - now) /
              1000,
          ),
        );

      res.setHeader(
        "Retry-After",
        String(retryAfter),
      );

      res.status(429).json({
        error:
          "Demasiados pedidos. Tenta novamente dentro de momentos.",
      });
      return;
    }

    next();
  };
}

export function validateProductionEnvironment() {
  if (
    process.env.NODE_ENV !==
    "production"
  ) {
    return;
  }

  const required = [
    "PORT",
    "FRONTEND_URL",
    "SESSION_SECRET",
    "MONGO_URI",
    "DISCORD_CLIENT_ID",
    "DISCORD_CLIENT_SECRET",
    "DISCORD_TOKEN",
    "DISCORD_GUILD_ID",
  ];

  const missing =
    required.filter(
      (name) =>
        !process.env[name],
    );

  if (
    process.env.SESSION_SECRET ===
    "gnr-dev-secret-change-in-prod"
  ) {
    missing.push(
      "SESSION_SECRET seguro",
    );
  }

  if (missing.length) {
    throw new Error(
      `Variáveis obrigatórias em produção em falta: ${missing.join(", ")}`,
    );
  }
}
