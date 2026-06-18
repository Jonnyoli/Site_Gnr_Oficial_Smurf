import type { Request } from "express";
import { AuditLog } from "../models";

type AuditSeverity = "info" | "success" | "warning" | "critical";

type AuditPayload = {
  action: string;
  module: string;
  severity?: AuditSeverity;
  description: string;
  targetId?: string | null;
  targetName?: string | null;
  metadata?: Record<string, any>;
};

function getRequestIp(req?: Request) {
  if (!req) return null;

  const forwardedFor = req.headers["x-forwarded-for"];

  if (typeof forwardedFor === "string") {
    return forwardedFor.split(",")[0]?.trim() || null;
  }

  return req.ip || req.socket?.remoteAddress || null;
}

function getSessionUser(req?: Request) {
  const sessionUser = req?.session?.user as any;

  if (!sessionUser) {
    return {
      actorId: "Sistema",
      actorName: "Sistema",
      actorRank: "N/A",
    };
  }

  return {
    actorId: String(sessionUser.id || sessionUser.discordId || "Sistema"),
    actorName:
      sessionUser.displayName ||
      sessionUser.username ||
      sessionUser.name ||
      "Utilizador",
    actorRank: sessionUser.rank || sessionUser.posto || "N/A",
  };
}

export async function createAuditLog(req: Request | undefined, payload: AuditPayload) {
  try {
    const actor = getSessionUser(req);

    await AuditLog.create({
      actorId: actor.actorId,
      actorName: actor.actorName,
      actorRank: actor.actorRank,

      action: payload.action,
      module: payload.module,
      severity: payload.severity || "info",
      description: payload.description,

      targetId: payload.targetId || null,
      targetName: payload.targetName || null,
      metadata: payload.metadata || {},

      ip: getRequestIp(req),
      userAgent: req?.headers["user-agent"] || null,
    });
  } catch (error) {
    console.error("[AUDIT] Falha ao criar log:", error);
  }
}