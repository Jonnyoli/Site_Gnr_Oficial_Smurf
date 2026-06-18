import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";

import {
  buildDRHWorkforceSnapshot,
} from "../services/drhWorkforceService.js";

import {
  recalculateDRHAlerts,
  resolveDRHAlert,
} from "../services/drhAlertsService.js";

import DRHAlert from "../models/DRHAlert.js";
import DRHInternalNote from "../models/DRHInternalNote.js";
import DRHProcess from "../models/DRHProcess.js";

const router = Router();

const ROLE_IDS = {
  DRH: "1147878941885988926",
  COMMAND: "1147878942099906672",
};

const DEV_USER_ID = "713719718091030599";

function currentUser(req: Request) {
  return req.session?.user || null;
}

function currentUserId(req: Request) {
  return String(
    currentUser(req)?.id || "",
  );
}

function currentRoles(req: Request) {
  return Array.isArray(
    currentUser(req)?.roles,
  )
    ? currentUser(req).roles.map(String)
    : [];
}

function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!currentUser(req)) {
    res.status(401).json({
      error: "É necessário iniciar sessão.",
    });
    return;
  }

  next();
}

function currentUserName(req: Request) {
  const current = currentUser(req);

  return (
    current?.displayName ||
    current?.global_name ||
    current?.username ||
    "Utilizador da Central"
  );
}

function actor(req: Request) {
  return {
    discordId: currentUserId(req),
    name: currentUserName(req),
  };
}

function requireDRH(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const allowed =
    currentUserId(req) === DEV_USER_ID ||
    currentRoles(req).includes(
      ROLE_IDS.DRH,
    ) ||
    currentRoles(req).includes(
      ROLE_IDS.COMMAND,
    );

  if (!allowed) {
    res.status(403).json({
      error:
        "Área reservada ao DRH e Comando-Geral.",
    });
    return;
  }

  next();
}

router.get(
  "/snapshot",
  requireAuth,
  requireDRH,
  async (req, res) => {
    try {
      res.setHeader(
        "Cache-Control",
        "no-store, no-cache, must-revalidate",
      );

      const force =
        String(req.query.force || "") !== "";

      const data =
        await buildDRHWorkforceSnapshot(
          force,
        );

      const alerts =
        await recalculateDRHAlerts(
          data,
        );

      return res.json({
        ok: true,
        ...data,
        alerts,
        alertsSummary: {
          total: alerts.length,
          critical: alerts.filter(
            (item) =>
              item.severity === "CRITICAL",
          ).length,
          high: alerts.filter(
            (item) =>
              item.severity === "HIGH",
          ).length,
          medium: alerts.filter(
            (item) =>
              item.severity === "MEDIUM",
          ).length,
        },
      });
    } catch (error) {
      console.error(
        "[DRH WORKFORCE] Snapshot error:",
        error,
      );

      return res.status(500).json({
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível carregar a gestão do efetivo.",
      });
    }
  },
);


router.get(
  "/member/:discordId",
  requireAuth,
  requireDRH,
  async (req, res) => {
    try {
      const data =
        await buildDRHWorkforceSnapshot(
          false,
        );

      const member = data.roster.find(
        (item) =>
          String(item.discordId) ===
          String(req.params.discordId),
      );

      if (!member) {
        return res.status(404).json({
          error: "Militar não encontrado.",
        });
      }

      const [notes, alerts] =
        await Promise.all([
          DRHInternalNote.find({
            subjectDiscordId:
              member.discordId,
          })
            .sort({ createdAt: -1 })
            .lean(),

          DRHAlert.find({
            subjectDiscordId:
              member.discordId,
            "resolution.resolved": false,
          })
            .sort({
              severity: -1,
              lastDetectedAt: -1,
            })
            .lean(),
        ]);

      return res.json({
        member,
        notes,
        alerts,
      });
    } catch (error) {
      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível carregar o militar.",
      });
    }
  },
);

router.post(
  "/member/:discordId/notes",
  requireAuth,
  requireDRH,
  async (req, res) => {
    const note = String(
      req.body.note || "",
    ).trim();

    if (!note) {
      return res.status(400).json({
        error: "A nota não pode ficar vazia.",
      });
    }

    const data =
      await buildDRHWorkforceSnapshot(
        false,
      );

    const member = data.roster.find(
      (item) =>
        String(item.discordId) ===
        String(req.params.discordId),
    );

    if (!member) {
      return res.status(404).json({
        error: "Militar não encontrado.",
      });
    }

    const created =
      await DRHInternalNote.create({
        subjectDiscordId:
          member.discordId,
        subjectName:
          member.name,
        note,
        visibility:
          req.body.visibility === "COMMAND"
            ? "COMMAND"
            : "DRH",
        createdByDiscordId:
          currentUserId(req),
        createdByName:
          currentUserName(req),
      });

    return res.status(201).json({
      note: created,
    });
  },
);

router.post(
  "/alerts/:alertId/resolve",
  requireAuth,
  requireDRH,
  async (req, res) => {
    try {
      const alert =
        await resolveDRHAlert(
          req.params.alertId,
          actor(req),
          String(req.body.note || ""),
        );

      return res.json({
        alert,
      });
    } catch (error) {
      return res.status(404).json({
        error:
          error instanceof Error
            ? error.message
            : "Alerta não encontrado.",
      });
    }
  },
);

router.post(
  "/member/:discordId/process",
  requireAuth,
  requireDRH,
  async (req, res) => {
    const data =
      await buildDRHWorkforceSnapshot(
        false,
      );

    const member = data.roster.find(
      (item) =>
        String(item.discordId) ===
        String(req.params.discordId),
    );

    if (!member) {
      return res.status(404).json({
        error: "Militar não encontrado.",
      });
    }

    const type = String(
      req.body.type || "OTHER",
    );

    const process = await DRHProcess.create({
      processNumber:
        `DRH-${new Date().getFullYear()}-${Date.now()
          .toString()
          .slice(-6)}`,
      type,
      status: "OPEN",
      subjectDiscordId:
        member.discordId,
      subjectName:
        member.name,
      subjectRank:
        member.rank,
      subjectUnit:
        member.unit,
      title:
        String(req.body.title || "").trim() ||
        `Processo ${type} — ${member.name}`,
      description:
        String(req.body.description || "").trim(),
      requestedByDiscordId:
        currentUserId(req),
      requestedByName:
        currentUserName(req),
      periodStart:
        req.body.periodStart
          ? new Date(req.body.periodStart)
          : null,
      periodEnd:
        req.body.periodEnd
          ? new Date(req.body.periodEnd)
          : null,
      auditEvents: [
        {
          type: "CREATED",
          actorDiscordId:
            currentUserId(req),
          actorName:
            currentUserName(req),
          note:
            "Processo criado a partir da ficha individual do militar.",
        },
      ],
    });

    return res.status(201).json({
      process,
    });
  },
);

router.get(
  "/report",
  requireAuth,
  requireDRH,
  async (req, res) => {
    const data =
      await buildDRHWorkforceSnapshot(
        false,
      );

    const lines = [
      "RELATÓRIO SEMANAL DO DRH",
      `Gerado em: ${new Date().toLocaleString("pt-PT")}`,
      "",
      `Efetivo: ${data.summary.total}`,
      `Horas da semana: ${Number(data.summary.weekHours || 0).toFixed(1)}h`,
      `Inativos +5 dias: ${data.summary.inactiveOverFiveDays}`,
      `Ausências ativas: ${data.summary.activeAbsences}`,
      `Folhas abertas: ${data.summary.openShifts}`,
      "",
      "INATIVOS",
      ...(data.inactive || []).map(
        (item) =>
          `${item.rank} | ${item.name} | ${
            item.hasAbsenceRole
              ? "Ausência justificada"
              : item.daysInactive === null
                ? "Sem atividade"
                : `${item.daysInactive} dias`
          }`,
      ),
      "",
      "AUSÊNCIAS",
      ...(data.absences || []).map(
        (item) =>
          `${item.rank} | ${item.name} | ${
            item.absence?.processNumber ||
            "Sem processo"
          }`,
      ),
    ];

    res.setHeader(
      "Content-Type",
      "text/plain; charset=utf-8",
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="relatorio-drh.txt"',
    );

    return res.send(lines.join("\n"));
  },
);


export default router;
