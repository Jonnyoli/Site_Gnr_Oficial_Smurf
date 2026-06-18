import type {
  NextFunction,
  Request,
  Response,
} from "express";

declare module "express-session" {
  interface SessionData {
    user?: any;
    lastSessionAuditAt?: number;
  }
}

export function getSessionUser(
  req: Request,
) {
  return (
    req.session?.user ||
    null
  );
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!getSessionUser(req)) {
    res.status(401).json({
      error:
        "É necessário iniciar sessão.",
    });
    return;
  }

  next();
}

export function roleIds(
  req: Request,
) {
  const current =
    getSessionUser(req);

  const candidates = [
    current?.roles,
    current?.roleIds,
    current?.guildRoles,
    current?.member?.roles,
  ];

  for (const value of candidates) {
    if (!Array.isArray(value)) {
      continue;
    }

    return value
      .map((role: any) =>
        typeof role === "string"
          ? role
          : String(
              role?.id ||
                role?.roleId ||
                "",
            ),
      )
      .filter(Boolean);
  }

  return [];
}

export function requireAnyRole(
  allowedRoleIds: string[],
) {
  return (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    const roles =
      roleIds(req);

    const allowed =
      allowedRoleIds.some(
        (roleId) =>
          roles.includes(roleId),
      );

    const adminId =
      process.env.ADMIN_ID ||
      process.env.DEV_USER_ID ||
      "";

    const userId =
      String(
        getSessionUser(req)?.id ||
          "",
      );

    if (
      allowed ||
      (
        adminId &&
        userId === adminId
      )
    ) {
      next();
      return;
    }

    res.status(403).json({
      error:
        "Sem permissão.",
    });
  };
}

export function requireHeaderSecret(
  options: {
    envNames: string[];
    headerNames: string[];
    errorMessage?: string;
  },
) {
  return (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    const expected =
      options.envNames
        .map((name) =>
          process.env[name],
        )
        .find(Boolean) || "";

    const supplied =
      options.headerNames
        .map((name) =>
          String(
            req.get(name) ||
              "",
          ),
        )
        .find(Boolean) || "";

    if (
      !expected ||
      supplied !== expected
    ) {
      res.status(401).json({
        error:
          options.errorMessage ||
          "Credencial interna inválida.",
      });
      return;
    }

    next();
  };
}
