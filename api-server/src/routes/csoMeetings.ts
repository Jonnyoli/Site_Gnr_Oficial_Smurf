import { Router, type Request, type Response, type NextFunction } from "express";
import CSOMeeting from "../models/CSOMeeting.js";
import CSOEvaluation from "../models/CSOEvaluation.js";
import { buildGuardSnapshot, listEligibleCSOGuards } from "../services/csoStatisticsService.js";

const router = Router();

const ROLE_IDS = {
  CSO: "1417908597949595681",
  CEG: "1417907622270599189",
  COMMAND: "1147878942099906672",
};

const DEV_USER_ID = "713719718091030599";

function currentUser(req: Request) {
  return req.session?.user || null;
}

function currentUserId(req: Request) {
  return String(currentUser(req)?.id || "");
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

function currentRoles(req: Request) {
  return Array.isArray(currentUser(req)?.roles)
    ? currentUser(req).roles.map(String)
    : [];
}

function isCommand(req: Request) {
  return (
    currentUserId(req) === DEV_USER_ID ||
    currentRoles(req).includes(ROLE_IDS.COMMAND)
  );
}

function isCSO(req: Request) {
  return (
    isCommand(req) ||
    currentRoles(req).includes(ROLE_IDS.CSO)
  );
}

function isCEG(req: Request) {
  return (
    isCommand(req) ||
    currentRoles(req).includes(ROLE_IDS.CEG)
  );
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

function requireCSO(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!isCSO(req)) {
    res.status(403).json({
      error:
        "Esta área está reservada ao CSO e ao Comando-Geral.",
    });
    return;
  }

  next();
}

function requireCEG(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!isCEG(req)) {
    res.status(403).json({
      error:
        "Esta ação está reservada ao CEG e ao Comando-Geral.",
    });
    return;
  }

  next();
}

function requireCommand(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!isCommand(req)) {
    res.status(403).json({
      error:
        "Esta ação está reservada ao Comando-Geral.",
    });
    return;
  }

  next();
}

async function nextMeetingNumber() {
  const year = new Date().getFullYear();

  const count = await CSOMeeting.countDocuments({
    meetingNumber: new RegExp(`^CSO-${year}-`),
  });

  return `CSO-${year}-${String(count + 1).padStart(4, "0")}`;
}

function sameDate(value, expected) {
  if (!value || !expected) return false;

  const first = new Date(value);
  const second = new Date(expected);

  return (
    !Number.isNaN(first.getTime()) &&
    !Number.isNaN(second.getTime()) &&
    first.getTime() === second.getTime()
  );
}

function snapshotNeedsRefresh(candidate, meeting) {
  const snapshot = candidate?.snapshot || {};

  return (
    Number(snapshot.snapshotVersion || 0) < 2 ||
    !sameDate(
      snapshot.periodStart,
      meeting.weekStart,
    ) ||
    !sameDate(
      snapshot.periodEnd,
      meeting.weekEnd,
    ) ||
    (
      Number(snapshot.patrolCount || 0) === 0 &&
      Array.isArray(snapshot.patrolPartners) &&
      snapshot.patrolPartners.length > 0
    )
  );
}


function snapshotFromEligibleGuard(guard, meeting) {
  return {
    capturedAt: new Date(),
    snapshotVersion: 3,

    periodStart:
      guard.periodStart ||
      meeting.weekStart,
    periodEnd:
      guard.periodEnd ||
      meeting.weekEnd,

    totalHours: Number(
      guard.periodHours ??
        guard.totalHours ??
        0,
    ),
    periodHours: Number(
      guard.periodHours ??
        guard.totalHours ??
        0,
    ),
    accumulatedHours: Number(
      guard.accumulatedHours ?? 0,
    ),
    weeklyHours: Number(
      guard.periodHours ??
        guard.weeklyHours ??
        0,
    ),
    monthlyHours: Number(
      guard.periodHours ??
        guard.monthlyHours ??
        0,
    ),

    points: Number(guard.points || 0),

    patrolHours: Number(
      guard.patrolHours || 0,
    ),
    patrolCount: Number(
      guard.patrolCount || 0,
    ),
    soloPatrols: Number(
      guard.soloPatrols || 0,
    ),
    jointPatrols: Number(
      guard.jointPatrols || 0,
    ),

    evaluationCount: Number(
      guard.evaluationCount || 0,
    ),
    evaluationAverage: Number(
      guard.evaluationAverage || 0,
    ),

    sergeantEvaluationCount: Number(
      guard.sergeantEvaluationCount || 0,
    ),
    sergeantEvaluationAverage: Number(
      guard.sergeantEvaluationAverage || 0,
    ),
    sergeantEvaluations:
      guard.sergeantEvaluations || [],

    activeAbsences: 0,
    activeSanctions: 0,

    lastPromotionAt:
      guard.lastPromotionAt || null,
    lastPromotionType:
      guard.lastPromotionType || null,

    patrolPartners:
      Number(guard.patrolCount || 0) > 0
        ? guard.patrolPartners || []
        : [],

    sourceSummary: {
      source:
        "OFFICIAL_DISCORD_ROLES_USER_PONTO_CP_EVALUATIONS",
      scope:
        "SELECTED_MEETING_PERIOD",
    },
  };
}

async function refreshStaleSnapshots(meeting) {
  const staleCandidates = (
    meeting.candidates || []
  ).filter((candidate) =>
    snapshotNeedsRefresh(candidate, meeting),
  );

  if (staleCandidates.length === 0) {
    return false;
  }

  const eligible =
    await listEligibleCSOGuards(
      meeting.weekStart,
      meeting.weekEnd,
    );

  const eligibleById = new Map(
    eligible.map((guard) => [
      String(guard.discordId),
      guard,
    ]),
  );

  let changed = false;

  for (const candidate of staleCandidates) {
    const guard = eligibleById.get(
      String(candidate.guardDiscordId),
    );

    if (!guard) continue;

    candidate.guardName = guard.name;
    candidate.currentRank = guard.rank;
    candidate.currentUnit = guard.unit;
    candidate.snapshot =
      snapshotFromEligibleGuard(
        guard,
        meeting,
      );

    changed = true;
  }

  if (changed) {
    meeting.markModified("candidates");
    await meeting.save();
  }

  return changed;
}

async function syncAllEligibleCandidates(
  meeting,
  actor = null,
) {
  const startedAt = Date.now();

  const eligible =
    await listEligibleCSOGuards(
      meeting.weekStart,
      meeting.weekEnd,
    );

  const existingById = new Map(
    (meeting.candidates || []).map(
      (candidate) => [
        String(candidate.guardDiscordId),
        candidate,
      ],
    ),
  );

  const officialIds = new Set(
    eligible.map((guard) =>
      String(guard.discordId),
    ),
  );

  let added = 0;
  let refreshed = 0;

  for (const guard of eligible) {
    const id = String(guard.discordId);
    const existing = existingById.get(id);

    const snapshot =
      snapshotFromEligibleGuard(
        guard,
        meeting,
      );

    if (existing) {
      existing.guardName = guard.name;
      existing.currentRank = guard.rank;
      existing.currentUnit = guard.unit;
      existing.snapshot = snapshot;

      refreshed += 1;
      continue;
    }

    meeting.candidates.push({
      guardDiscordId: id,
      guardName: guard.name,
      currentRank: guard.rank,
      currentUnit: guard.unit,
      reason:
        "Análise integral obrigatória do CSO",
      snapshot,
    });

    added += 1;
  }

  const beforeRemoval =
    meeting.candidates.length;

  meeting.candidates =
    meeting.candidates.filter(
      (candidate) =>
        officialIds.has(
          String(
            candidate.guardDiscordId,
          ),
        ),
    );

  const removed = Math.max(
    0,
    beforeRemoval -
      meeting.candidates.length,
  );

  meeting.markModified("candidates");

  meeting.auditEvents.push({
    type: "FULL_ROSTER_SYNCED",
    actorDiscordId:
      actor?.discordId || null,
    actorName:
      actor?.name || "Sistema CSO",
    note:
      "Efetivo oficial sincronizado em lote.",
    metadata: {
      total:
        meeting.candidates.length,
      added,
      refreshed,
      removed,
      durationMs:
        Date.now() - startedAt,
    },
  });

  await meeting.save();

  return {
    total:
      meeting.candidates.length,
    added,
    refreshed,
    removed,
    durationMs:
      Date.now() - startedAt,
  };
}

function publicMeeting(meeting, req) {
  const plain =
    typeof meeting?.toObject === "function"
      ? meeting.toObject()
      : meeting;

  const userId = currentUserId(req);
  const canSeeVotes =
    isCommand(req) ||
    ["VOTING_CLOSED", "AWAITING_CEG", "AWAITING_COMMAND", "APPROVED", "REJECTED", "RETURNED", "COMPLETED"].includes(
      plain.status,
    );

  return {
    ...plain,
    permissions: {
      cso: isCSO(req),
      ceg: isCEG(req),
      command: isCommand(req),
      canManage:
        isCSO(req) &&
        plain.openedByDiscordId === userId,
    },
    candidates: (plain.candidates || []).map((candidate) => ({
      ...candidate,
      votes: canSeeVotes
        ? candidate.votes
        : candidate.votes
            .filter((vote) => vote.voterDiscordId === userId)
            .map((vote) => ({
              voterDiscordId: vote.voterDiscordId,
              voterName: vote.voterName,
              choice: vote.choice,
              opinion: vote.opinion,
              submittedAt: vote.submittedAt,
              updatedAt: vote.updatedAt,
            })),
      voteCount: candidate.votes?.length || 0,
    })),
  };
}


router.get(
  "/eligible-guards",
  requireAuth,
  requireCSO,
  async (req, res) => {
    try {
      res.setHeader(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, proxy-revalidate",
      );
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.removeHeader("ETag");

      const weekStart = req.query.weekStart
        ? new Date(String(req.query.weekStart))
        : new Date(Date.now() - 6 * 86_400_000);

      const weekEnd = req.query.weekEnd
        ? new Date(String(req.query.weekEnd))
        : new Date();

      const guards = await listEligibleCSOGuards(
        weekStart,
        weekEnd,
      );

      return res.status(200).json({
        ok: true,
        guards,
        total: guards.length,
        period: {
          weekStart,
          weekEnd,
        },
      });
    } catch (error) {
      console.error("[cso] Eligible guards error:", error);

      return res.status(500).json({
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível carregar o efetivo.",
      });
    }
  },
);


router.get(
  "/meetings",
  requireAuth,
  requireCSO,
  async (req, res) => {
    try {
      const meetings = await CSOMeeting.find()
        .sort({ createdAt: -1 })
        .limit(100);

      res.json({
        meetings: meetings.map((meeting) =>
          publicMeeting(meeting, req),
        ),
      });
    } catch (error) {
      console.error("[cso] List meetings error:", error);

      res.status(500).json({
        error: "Não foi possível carregar as reuniões.",
      });
    }
  },
);

router.post(
  "/meetings",
  requireAuth,
  requireCSO,
  async (req, res) => {
    try {
      const title = String(req.body.title || "").trim();
      const weekStart = new Date(req.body.weekStart);
      const weekEnd = new Date(req.body.weekEnd);

      if (!title) {
        res.status(400).json({
          error: "O título da reunião é obrigatório.",
        });
        return;
      }

      if (
        Number.isNaN(weekStart.getTime()) ||
        Number.isNaN(weekEnd.getTime()) ||
        weekEnd < weekStart
      ) {
        res.status(400).json({
          error: "O intervalo semanal não é válido.",
        });
        return;
      }

      const meeting = await CSOMeeting.create({
        meetingNumber: await nextMeetingNumber(),
        title,
        status: "PREPARATION",
        weekStart,
        weekEnd,
        openedByDiscordId: currentUserId(req),
        openedByName: currentUserName(req),
        attendees: [
          {
            discordId: currentUserId(req),
            name: currentUserName(req),
            present: true,
            role: "CSO",
            confirmedAt: new Date(),
          },
        ],
        candidates: [],
        auditEvents: [
          {
            type: "MEETING_CREATED",
            actorDiscordId: currentUserId(req),
            actorName: currentUserName(req),
            note:
              "Reunião do CSO criada. O efetivo será sincronizado ao abrir a reunião.",
          },
        ],
      });

      return res.status(201).json({
        ok: true,
        meeting: publicMeeting(meeting, req),
        rosterSyncPending: true,
      });
    } catch (error) {
      console.error("[cso] Create meeting error:", error);

      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível criar a reunião.",
      });
    }
  },
);

router.get(
  "/meetings/:meetingId",
  requireAuth,
  requireCSO,
  async (req, res) => {
    try {
      const meeting = await CSOMeeting.findById(
        req.params.meetingId,
      );

      if (!meeting) {
        res.status(404).json({
          error: "Reunião não encontrada.",
        });
        return;
      }

      if (
        !["PREPARATION", "RETURNED"].includes(
          meeting.status,
        )
      ) {
        await refreshStaleSnapshots(meeting);
      }

      return res.json({
        meeting: publicMeeting(meeting, req),
        rosterSyncPending:
          ["PREPARATION", "RETURNED"].includes(
            meeting.status,
          ) &&
          !meeting.candidates?.length,
      });
    } catch (error) {
      console.error("[cso] Read meeting error:", error);

      res.status(500).json({
        error: "Não foi possível carregar a reunião.",
      });
    }
  },
);

router.patch(
  "/meetings/:meetingId",
  requireAuth,
  requireCSO,
  async (req, res) => {
    try {
      const meeting = await CSOMeeting.findById(
        req.params.meetingId,
      );

      if (!meeting) {
        res.status(404).json({
          error: "Reunião não encontrada.",
        });
        return;
      }

      if (
        meeting.openedByDiscordId !== currentUserId(req) &&
        !isCommand(req)
      ) {
        res.status(403).json({
          error:
            "Apenas o responsável da reunião ou o Comando-Geral pode alterar estes dados.",
        });
        return;
      }

      if (
        !["PREPARATION", "RETURNED"].includes(meeting.status)
      ) {
        res.status(400).json({
          error:
            "A reunião já não pode ser editada nesta fase.",
        });
        return;
      }

      if (typeof req.body.title === "string") {
        meeting.title = req.body.title.trim();
      }

      if (req.body.weekStart) {
        meeting.weekStart = new Date(req.body.weekStart);
      }

      if (req.body.weekEnd) {
        meeting.weekEnd = new Date(req.body.weekEnd);
      }

      meeting.auditEvents.push({
        type: "MEETING_UPDATED",
        actorDiscordId: currentUserId(req),
        actorName: currentUserName(req),
        note: String(req.body.note || "Reunião atualizada."),
      });

      await meeting.save();

      res.json({
        ok: true,
        meeting: publicMeeting(meeting, req),
      });
    } catch (error) {
      console.error("[cso] Update meeting error:", error);

      res.status(500).json({
        error: "Não foi possível atualizar a reunião.",
      });
    }
  },
);

router.post(
  "/meetings/:meetingId/attendees",
  requireAuth,
  requireCSO,
  async (req, res) => {
    try {
      const meeting = await CSOMeeting.findById(
        req.params.meetingId,
      );

      if (!meeting) {
        res.status(404).json({
          error: "Reunião não encontrada.",
        });
        return;
      }

      if (
        meeting.openedByDiscordId !== currentUserId(req) &&
        !isCommand(req)
      ) {
        res.status(403).json({
          error:
            "Apenas o responsável da reunião pode gerir presenças.",
        });
        return;
      }

      const discordId = String(req.body.discordId || "").trim();
      const name = String(req.body.name || "").trim();

      if (!discordId || !name) {
        res.status(400).json({
          error: "Discord ID e nome são obrigatórios.",
        });
        return;
      }

      const existing = meeting.attendees.find(
        (attendee) => attendee.discordId === discordId,
      );

      if (existing) {
        existing.present = req.body.present !== false;
        existing.confirmedAt = new Date();
      } else {
        meeting.attendees.push({
          discordId,
          name,
          present: req.body.present !== false,
          role: "CSO",
          confirmedAt: new Date(),
        });
      }

      await meeting.save();

      res.json({
        ok: true,
        meeting: publicMeeting(meeting, req),
      });
    } catch (error) {
      console.error("[cso] Attendee error:", error);

      res.status(500).json({
        error: "Não foi possível atualizar as presenças.",
      });
    }
  },
);

router.post(
  "/meetings/:meetingId/candidates",
  requireAuth,
  requireCSO,
  async (req, res) => {
    try {
      const meeting = await CSOMeeting.findById(
        req.params.meetingId,
      );

      if (!meeting) {
        res.status(404).json({
          error: "Reunião não encontrada.",
        });
        return;
      }

      return res.status(400).json({
        error:
          "Os candidatos são sincronizados automaticamente. Não é necessário adicionar militares manualmente.",
      });

      if (
        !["PREPARATION", "RETURNED"].includes(meeting.status)
      ) {
        res.status(400).json({
          error:
            "Não é possível adicionar candidatos nesta fase.",
        });
        return;
      }

      const discordId = String(
        req.body.guardDiscordId || "",
      ).trim();

      if (!discordId) {
        res.status(400).json({
          error: "O Discord ID do guarda é obrigatório.",
        });
        return;
      }

      if (
        meeting.candidates.some(
          (candidate) =>
            candidate.guardDiscordId === discordId,
        )
      ) {
        res.status(409).json({
          error: "Este guarda já está na reunião.",
        });
        return;
      }

      const result = await buildGuardSnapshot(
        discordId,
        meeting.weekStart,
        meeting.weekEnd,
      );

      meeting.candidates.push({
        guardDiscordId: discordId,
        guardName: result.guard.name,
        currentRank: result.guard.rank,
        currentUnit: result.guard.unit,
        reason: String(req.body.reason || ""),
        snapshot: result.snapshot,
      });

      meeting.auditEvents.push({
        type: "CANDIDATE_ADDED",
        actorDiscordId: currentUserId(req),
        actorName: currentUserName(req),
        note: `${result.guard.name} adicionado à reunião.`,
        metadata: {
          guardDiscordId: discordId,
        },
      });

      await meeting.save();

      res.json({
        ok: true,
        meeting: publicMeeting(meeting, req),
      });
    } catch (error) {
      console.error("[cso] Add candidate error:", error);

      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível adicionar o guarda.",
      });
    }
  },
);

router.delete(
  "/meetings/:meetingId/candidates/:discordId",
  requireAuth,
  requireCSO,
  async (req, res) => {
    try {
      const meeting = await CSOMeeting.findById(
        req.params.meetingId,
      );

      if (!meeting) {
        res.status(404).json({
          error: "Reunião não encontrada.",
        });
        return;
      }

      return res.status(400).json({
        error:
          "Os militares oficiais não podem ser removidos manualmente da reunião.",
      });

      if (meeting.status !== "PREPARATION") {
        res.status(400).json({
          error:
            "Só podes remover candidatos durante a preparação.",
        });
        return;
      }

      meeting.candidates = meeting.candidates.filter(
        (candidate) =>
          candidate.guardDiscordId !== req.params.discordId,
      );

      await meeting.save();

      res.json({
        ok: true,
        meeting: publicMeeting(meeting, req),
      });
    } catch (error) {
      console.error("[cso] Remove candidate error:", error);

      res.status(500).json({
        error: "Não foi possível remover o candidato.",
      });
    }
  },
);


router.post(
  "/meetings/:meetingId/candidates/:discordId/refresh",
  requireAuth,
  requireCSO,
  async (req, res) => {
    try {
      const meeting = await CSOMeeting.findById(
        req.params.meetingId,
      );

      if (!meeting) {
        return res.status(404).json({
          error: "Reunião não encontrada.",
        });
      }

      const candidate = meeting.candidates.find(
        (item) =>
          item.guardDiscordId === req.params.discordId,
      );

      if (!candidate) {
        return res.status(404).json({
          error: "Candidato não encontrado.",
        });
      }

      const result = await buildGuardSnapshot(
        candidate.guardDiscordId,
        meeting.weekStart,
        meeting.weekEnd,
      );

      candidate.guardName = result.guard.name;
      candidate.currentRank = result.guard.rank;
      candidate.currentUnit = result.guard.unit;
      candidate.snapshot = result.snapshot as any;
      meeting.markModified("candidates");

      meeting.auditEvents.push({
        type: "CANDIDATE_SNAPSHOT_REFRESHED",
        actorDiscordId: currentUserId(req),
        actorName: currentUserName(req),
        note: `Dados de ${candidate.guardName} atualizados.`,
      });

      await meeting.save();

      return res.json({
        ok: true,
        meeting: publicMeeting(meeting, req),
      });
    } catch (error) {
      console.error("[cso] Refresh candidate error:", error);

      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível atualizar os dados.",
      });
    }
  },
);



router.post(
  "/meetings/:meetingId/initialize",
  requireAuth,
  requireCSO,
  async (req, res) => {
    try {
      const meeting = await CSOMeeting.findById(
        req.params.meetingId,
      );

      if (!meeting) {
        return res.status(404).json({
          error: "Reunião não encontrada.",
        });
      }

      if (
        !["PREPARATION", "RETURNED"].includes(
          meeting.status,
        )
      ) {
        return res.status(400).json({
          error:
            "A reunião já não está em preparação.",
        });
      }

      const result = await syncAllEligibleCandidates(
        meeting,
        {
          discordId: currentUserId(req),
          name: currentUserName(req),
        },
      );

      return res.json({
        ok: true,
        result,
        meeting: publicMeeting(meeting, req),
      });
    } catch (error) {
      console.error(
        "[cso] Meeting initialization error:",
        error,
      );

      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível preparar a reunião.",
      });
    }
  },
);

router.post(
  "/meetings/:meetingId/sync-roster",
  requireAuth,
  requireCSO,
  async (req, res) => {
    try {
      const meeting = await CSOMeeting.findById(
        req.params.meetingId,
      );

      if (!meeting) {
        return res.status(404).json({
          error: "Reunião não encontrada.",
        });
      }

      if (
        !["PREPARATION", "RETURNED"].includes(
          meeting.status,
        ) &&
        !isCommand(req)
      ) {
        return res.status(400).json({
          error:
            "O efetivo só pode ser sincronizado durante a preparação ou após devolução.",
        });
      }

      const result = await syncAllEligibleCandidates(
        meeting,
        {
          discordId: currentUserId(req),
          name: currentUserName(req),
        },
      );

      return res.json({
        ok: true,
        result,
        meeting: publicMeeting(meeting, req),
      });
    } catch (error) {
      console.error("[cso] Sync roster error:", error);

      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível sincronizar o efetivo.",
      });
    }
  },
);

router.post(
  "/meetings/:meetingId/open-voting",
  requireAuth,
  requireCSO,
  async (req, res) => {
    try {
      const meeting = await CSOMeeting.findById(
        req.params.meetingId,
      );

      if (!meeting) {
        res.status(404).json({
          error: "Reunião não encontrada.",
        });
        return;
      }

      if (
        meeting.openedByDiscordId !== currentUserId(req) &&
        !isCommand(req)
      ) {
        res.status(403).json({
          error:
            "Apenas o responsável da reunião pode abrir a votação.",
        });
        return;
      }

      if (meeting.candidates.length === 0) {
        res.status(400).json({
          error:
            "Adiciona pelo menos um guarda antes de abrir a votação.",
        });
        return;
      }

      if (meeting.attendees.filter((item) => item.present).length === 0) {
        res.status(400).json({
          error:
            "Regista pelo menos um membro presente.",
        });
        return;
      }

      meeting.status = "VOTING_OPEN";
      meeting.votingOpenedAt = new Date();

      meeting.auditEvents.push({
        type: "VOTING_OPENED",
        actorDiscordId: currentUserId(req),
        actorName: currentUserName(req),
        note: "Votação aberta.",
      });

      await meeting.save();

      res.json({
        ok: true,
        meeting: publicMeeting(meeting, req),
      });
    } catch (error) {
      console.error("[cso] Open voting error:", error);

      res.status(500).json({
        error: "Não foi possível abrir a votação.",
      });
    }
  },
);

router.post(
  "/meetings/:meetingId/candidates/:discordId/vote",
  requireAuth,
  requireCSO,
  async (req, res) => {
    try {
      const meeting = await CSOMeeting.findById(
        req.params.meetingId,
      );

      if (!meeting) {
        res.status(404).json({
          error: "Reunião não encontrada.",
        });
        return;
      }

      if (meeting.status !== "VOTING_OPEN") {
        res.status(400).json({
          error: "A votação não está aberta.",
        });
        return;
      }

      const attendee = meeting.attendees.find(
        (item) =>
          item.discordId === currentUserId(req) &&
          item.present,
      );

      if (!attendee && !isCommand(req)) {
        res.status(403).json({
          error:
            "Apenas membros presentes podem votar.",
        });
        return;
      }

      const candidate = meeting.candidates.find(
        (item) =>
          item.guardDiscordId === req.params.discordId,
      );

      if (!candidate) {
        res.status(404).json({
          error: "Candidato não encontrado.",
        });
        return;
      }

      const choice = String(req.body.choice || "").toUpperCase();
      const opinion = String(req.body.opinion || "").trim();

      if (opinion.length < 20) {
        res.status(400).json({
          error:
            "A opinião deve ter pelo menos 20 caracteres.",
        });
        return;
      }

      const existing = candidate.votes.find(
        (vote) =>
          vote.voterDiscordId === currentUserId(req),
      );

      if (existing) {
        existing.choice = choice as any;
        existing.opinion = opinion;
        existing.updatedAt = new Date();
      } else {
        candidate.votes.push({
          voterDiscordId: currentUserId(req),
          voterName: currentUserName(req),
          choice: choice as any,
          opinion,
          submittedAt: new Date(),
          updatedAt: new Date(),
        });
      }

      meeting.auditEvents.push({
        type: "VOTE_SUBMITTED",
        actorDiscordId: currentUserId(req),
        actorName: currentUserName(req),
        note: "Voto registado.",
        metadata: {
          guardDiscordId: candidate.guardDiscordId,
        },
      });

      await meeting.save();

      res.json({
        ok: true,
        meeting: publicMeeting(meeting, req),
      });
    } catch (error) {
      console.error("[cso] Vote error:", error);

      res.status(500).json({
        error: "Não foi possível registar o voto.",
      });
    }
  },
);

router.post(
  "/meetings/:meetingId/close-voting",
  requireAuth,
  requireCSO,
  async (req, res) => {
    try {
      const meeting = await CSOMeeting.findById(
        req.params.meetingId,
      );

      if (!meeting) {
        res.status(404).json({
          error: "Reunião não encontrada.",
        });
        return;
      }

      if (
        meeting.openedByDiscordId !== currentUserId(req) &&
        !isCommand(req)
      ) {
        res.status(403).json({
          error:
            "Apenas o responsável da reunião pode encerrar a votação.",
        });
        return;
      }

      if (meeting.status !== "VOTING_OPEN") {
        res.status(400).json({
          error: "A votação não está aberta.",
        });
        return;
      }

      meeting.status = "VOTING_CLOSED";
      meeting.votingClosedAt = new Date();

      meeting.auditEvents.push({
        type: "VOTING_CLOSED",
        actorDiscordId: currentUserId(req),
        actorName: currentUserName(req),
        note: "Votação encerrada.",
      });

      await meeting.save();

      res.json({
        ok: true,
        meeting: publicMeeting(meeting, req),
      });
    } catch (error) {
      console.error("[cso] Close voting error:", error);

      res.status(500).json({
        error: "Não foi possível encerrar a votação.",
      });
    }
  },
);

router.post(
  "/meetings/:meetingId/ceg-validation",
  requireAuth,
  requireCEG,
  async (req, res) => {
    try {
      const meeting = await CSOMeeting.findById(
        req.params.meetingId,
      );

      if (!meeting) {
        res.status(404).json({
          error: "Reunião não encontrada.",
        });
        return;
      }

      if (
        !["VOTING_CLOSED", "AWAITING_CEG"].includes(
          meeting.status,
        )
      ) {
        res.status(400).json({
          error:
            "A reunião ainda não está pronta para validação do CEG.",
        });
        return;
      }

      const approved = req.body.approved !== false;

      meeting.cegRepresentative = {
        discordId: currentUserId(req),
        name: currentUserName(req),
        confirmed: approved,
        confirmedAt: new Date(),
        validationNote: String(req.body.note || ""),
      } as any;

      meeting.status = approved
        ? "AWAITING_COMMAND"
        : "RETURNED";

      meeting.auditEvents.push({
        type: approved
          ? "CEG_VALIDATED"
          : "CEG_RETURNED",
        actorDiscordId: currentUserId(req),
        actorName: currentUserName(req),
        note: String(req.body.note || ""),
      });

      await meeting.save();

      res.json({
        ok: true,
        meeting: publicMeeting(meeting, req),
      });
    } catch (error) {
      console.error("[cso] CEG validation error:", error);

      res.status(500).json({
        error: "Não foi possível validar a reunião.",
      });
    }
  },
);

router.post(
  "/meetings/:meetingId/command-decision",
  requireAuth,
  requireCommand,
  async (req, res) => {
    try {
      const meeting = await CSOMeeting.findById(
        req.params.meetingId,
      );

      if (!meeting) {
        res.status(404).json({
          error: "Reunião não encontrada.",
        });
        return;
      }

      if (meeting.status !== "AWAITING_COMMAND") {
        res.status(400).json({
          error:
            "A reunião ainda não aguarda decisão do Comando.",
        });
        return;
      }

      const decision = String(
        req.body.decision || "",
      ).toUpperCase();

      if (
        !["APPROVED", "REJECTED", "RETURNED"].includes(
          decision,
        )
      ) {
        res.status(400).json({
          error: "Decisão inválida.",
        });
        return;
      }

      meeting.status = decision as any;

      for (const candidate of meeting.candidates) {
        candidate.commandDecision =
          decision === "APPROVED"
            ? "APPROVED"
            : decision === "REJECTED"
              ? "REJECTED"
              : "RETURNED";

        candidate.commandDecisionNote = String(
          req.body.note || "",
        );
      }

      if (decision !== "RETURNED") {
        meeting.completedAt = new Date();
      }

      meeting.auditEvents.push({
        type: `COMMAND_${decision}`,
        actorDiscordId: currentUserId(req),
        actorName: currentUserName(req),
        note: String(req.body.note || ""),
      });

      await meeting.save();

      res.json({
        ok: true,
        meeting: publicMeeting(meeting, req),
      });
    } catch (error) {
      console.error("[cso] Command decision error:", error);

      res.status(500).json({
        error: "Não foi possível registar a decisão.",
      });
    }
  },
);

router.get(
  "/guards/:discordId/statistics",
  requireAuth,
  requireCSO,
  async (req, res) => {
    try {
      const weekStart = req.query.weekStart
        ? new Date(String(req.query.weekStart))
        : new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);

      const weekEnd = req.query.weekEnd
        ? new Date(String(req.query.weekEnd))
        : new Date();

      const data = await buildGuardSnapshot(
        req.params.discordId,
        weekStart,
        weekEnd,
      );

      res.json(data);
    } catch (error) {
      console.error("[cso] Guard statistics error:", error);

      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível calcular as estatísticas.",
      });
    }
  },
);


router.get(
  "/health",
  requireAuth,
  async (req, res) => {
    res.status(200).json({
      ok: true,
      module: "cso-meetings",
      userId: currentUserId(req),
      permissions: {
        cso: isCSO(req),
        ceg: isCEG(req),
        command: isCommand(req),
      },
      timestamp: new Date().toISOString(),
    });
  },
);


router.get(
  "/evaluations",
  requireAuth,
  requireCSO,
  async (req, res) => {
    try {
      const filter: any = {};

      if (req.query.discordId) {
        filter.evaluatedDiscordId = String(
          req.query.discordId,
        );
      }

      if (req.query.meetingId) {
        filter.meetingId = String(req.query.meetingId);
      }

      const evaluations = await CSOEvaluation.find(filter)
        .sort({ createdAt: -1 })
        .limit(500)
        .lean();

      return res.json({
        evaluations,
        total: evaluations.length,
      });
    } catch (error) {
      console.error("[cso] Evaluation list error:", error);

      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível carregar as avaliações.",
      });
    }
  },
);

router.post(
  "/evaluations",
  requireAuth,
  requireCSO,
  async (req, res) => {
    try {
      const evaluatedDiscordId = String(
        req.body.evaluatedDiscordId || "",
      ).trim();

      const evaluatedName = String(
        req.body.evaluatedName || "",
      ).trim();

      const score = Number(req.body.score);
      const points = Number(req.body.points || 0);
      const opinion = String(
        req.body.opinion || "",
      ).trim();

      if (!evaluatedDiscordId || !evaluatedName) {
        return res.status(400).json({
          error: "O guarda avaliado é obrigatório.",
        });
      }

      if (!Number.isFinite(score) || score < 0 || score > 20) {
        return res.status(400).json({
          error: "A nota deve estar entre 0 e 20.",
        });
      }

      if (!Number.isFinite(points) || points < 0) {
        return res.status(400).json({
          error: "Os pontos não são válidos.",
        });
      }

      if (opinion.length < 20) {
        return res.status(400).json({
          error:
            "A opinião deve ter pelo menos 20 caracteres.",
        });
      }

      const weekStart = new Date(req.body.weekStart);
      const weekEnd = new Date(req.body.weekEnd);

      if (
        Number.isNaN(weekStart.getTime()) ||
        Number.isNaN(weekEnd.getTime())
      ) {
        return res.status(400).json({
          error: "O intervalo da avaliação não é válido.",
        });
      }

      const evaluation = await CSOEvaluation.create({
        evaluatedDiscordId,
        evaluatedName,
        evaluatorDiscordId: currentUserId(req),
        evaluatorName: currentUserName(req),
        score,
        points,
        opinion,
        weekStart,
        weekEnd,
        meetingId: req.body.meetingId || null,
      });

      return res.status(201).json({
        ok: true,
        evaluation,
      });
    } catch (error) {
      console.error("[cso] Evaluation create error:", error);

      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível registar a avaliação.",
      });
    }
  },
);

router.get(
  "/evaluations/:discordId/summary",
  requireAuth,
  requireCSO,
  async (req, res) => {
    try {
      const evaluations = await CSOEvaluation.find({
        evaluatedDiscordId: req.params.discordId,
      }).lean();

      const total = evaluations.length;

      const average =
        total > 0
          ? evaluations.reduce(
              (sum, item) => sum + Number(item.score || 0),
              0,
            ) / total
          : 0;

      const points = evaluations.reduce(
        (sum, item) => sum + Number(item.points || 0),
        0,
      );

      return res.json({
        total,
        average,
        points,
      });
    } catch (error) {
      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível calcular o resumo.",
      });
    }
  },
);

export default router;
