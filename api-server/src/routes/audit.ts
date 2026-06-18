import { Router } from "express";
import { AuditLog } from "../models";
import { createAuditLog } from "../lib/audit";

const router = Router();

function buildDateQuery(startDate?: any, endDate?: any) {
  const query: any = {};

  if (startDate || endDate) {
    query.createdAt = {};

    if (startDate) {
      query.createdAt.$gte = new Date(String(startDate));
    }

    if (endDate) {
      query.createdAt.$lte = new Date(String(endDate));
    }
  }

  return query;
}

router.get("/", async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      module,
      severity,
      action,
      actorId,
      search,
      limit = "200",
    } = req.query;

    const query: any = buildDateQuery(startDate, endDate);

    if (module && module !== "all") {
      query.module = String(module);
    }

    if (severity && severity !== "all") {
      query.severity = String(severity);
    }

    if (action && action !== "all") {
      query.action = String(action);
    }

    if (actorId) {
      query.actorId = String(actorId);
    }

    if (search) {
      const regex = new RegExp(String(search), "i");

      query.$or = [
        { actorName: regex },
        { actorRank: regex },
        { action: regex },
        { module: regex },
        { description: regex },
        { targetName: regex },
      ];
    }

    const safeLimit = Math.min(Number(limit) || 200, 1000);

    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .limit(safeLimit)
      .lean();

    res.json(logs);
  } catch (error: any) {
    console.error("[AUDIT GET] Erro:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/stats", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = buildDateQuery(startDate, endDate);

    const [total, info, success, warning, critical, modules] = await Promise.all([
      AuditLog.countDocuments(query),
      AuditLog.countDocuments({ ...query, severity: "info" }),
      AuditLog.countDocuments({ ...query, severity: "success" }),
      AuditLog.countDocuments({ ...query, severity: "warning" }),
      AuditLog.countDocuments({ ...query, severity: "critical" }),
      AuditLog.aggregate([
        { $match: query },
        {
          $group: {
            _id: "$module",
            total: { $sum: 1 },
          },
        },
        { $sort: { total: -1 } },
      ]),
    ]);

    res.json({
      total,
      info,
      success,
      warning,
      critical,
      modules,
    });
  } catch (error: any) {
    console.error("[AUDIT STATS] Erro:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/recent", async (req, res) => {
  try {
    const logs = await AuditLog.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    res.json(logs);
  } catch (error: any) {
    console.error("[AUDIT RECENT] Erro:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/log", async (req, res) => {
  try {
    const {
      action,
      module,
      severity,
      description,
      targetId,
      targetName,
      metadata,
    } = req.body || {};

    if (!action || !module || !description) {
      return res.status(400).json({
        error: "action, module e description são obrigatórios.",
      });
    }

    await createAuditLog(req, {
      action,
      module,
      severity,
      description,
      targetId,
      targetName,
      metadata,
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error("[AUDIT LOG] Erro:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;