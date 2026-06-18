import { Router } from "express";
import DocumentRecord from "../models/DocumentRecord.js";
import {
  DOCUMENTS_CHANNEL_ID,
  syncDiscordDocuments,
} from "../services/documentSync.js";

const router = Router();

const COMMAND_GENERAL_ROLE_ID = "1147878942099906672";
const DEV_USER_ID = "713719718091030599";

function getSessionUser(req) {
  return req.session?.user || null;
}

function getUserId(req) {
  return String(getSessionUser(req)?.id || "");
}

function getUserRoles(req) {
  const roles = getSessionUser(req)?.roles;

  return Array.isArray(roles) ? roles.map(String) : [];
}

function isCommandGeneral(req) {
  return (
    getUserId(req) === DEV_USER_ID ||
    getUserRoles(req).includes(COMMAND_GENERAL_ROLE_ID)
  );
}

function requireAuth(req, res, next) {
  if (!getSessionUser(req)) {
    res.status(401).json({
      error: "É necessário iniciar sessão.",
    });
    return;
  }

  next();
}

function requireCommandGeneral(req, res, next) {
  if (!isCommandGeneral(req)) {
    res.status(403).json({
      error:
        "Apenas o Comando-Geral pode executar esta ação.",
    });
    return;
  }

  next();
}

function buildVisibilityFilter(req) {
  if (isCommandGeneral(req)) {
    return {};
  }

  const roles = getUserRoles(req);

  return {
    $or: [
      { visibility: "PUBLIC" },
      {
        visibility: "RESTRICTED",
        allowedRoleIds: { $in: roles },
      },
    ],
  };
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const query = String(req.query.q || "").trim();
    const category = String(req.query.category || "")
      .trim()
      .toUpperCase();
    const featured = String(req.query.featured || "") === "true";
    const includeArchived =
      String(req.query.archived || "") === "true" &&
      isCommandGeneral(req);

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(
      Math.max(Number(req.query.limit) || 60, 1),
      200,
    );

    const filters = [
      buildVisibilityFilter(req),
      includeArchived ? {} : { archived: false },
    ];

    if (category && category !== "ALL") {
      filters.push({ category });
    }

    if (featured) {
      filters.push({ featured: true });
    }

    if (query) {
      filters.push({
        $or: [
          { title: { $regex: query, $options: "i" } },
          {
            description: {
              $regex: query,
              $options: "i",
            },
          },
          { tags: { $regex: query, $options: "i" } },
          {
            authorName: {
              $regex: query,
              $options: "i",
            },
          },
        ],
      });
    }

    const filter = { $and: filters };

    const [items, total, categoryStats] =
      await Promise.all([
        DocumentRecord.find(filter)
          .sort({
            pinned: -1,
            featured: -1,
            publishedAt: -1,
          })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),

        DocumentRecord.countDocuments(filter),

        DocumentRecord.aggregate([
          {
            $match: {
              ...buildVisibilityFilter(req),
              archived: false,
            },
          },
          {
            $group: {
              _id: "$category",
              count: { $sum: 1 },
            },
          },
        ]),
      ]);

    res.json({
      items,
      total,
      page,
      limit,
      categoryStats,
      canManage: isCommandGeneral(req),
      channelId: DOCUMENTS_CHANNEL_ID,
    });
  } catch (error) {
    console.error("[documents] Erro ao listar:", error);

    res.status(500).json({
      error: "Não foi possível carregar os documentos.",
    });
  }
});

router.get("/stats", requireAuth, async (req, res) => {
  try {
    const filter = {
      ...buildVisibilityFilter(req),
      archived: false,
    };

    const [
      total,
      featured,
      attachments,
      recent,
      categories,
    ] = await Promise.all([
      DocumentRecord.countDocuments(filter),
      DocumentRecord.countDocuments({
        ...filter,
        featured: true,
      }),
      DocumentRecord.aggregate([
        { $match: filter },
        {
          $project: {
            attachmentCount: {
              $size: { $ifNull: ["$attachments", []] },
            },
          },
        },
        {
          $group: {
            _id: null,
            count: { $sum: "$attachmentCount" },
          },
        },
      ]),
      DocumentRecord.countDocuments({
        ...filter,
        publishedAt: {
          $gte: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000,
          ),
        },
      }),
      DocumentRecord.distinct("category", filter),
    ]);

    res.json({
      total,
      featured,
      attachments: attachments[0]?.count || 0,
      recent,
      categories: categories.length,
    });
  } catch (error) {
    console.error("[documents] Erro nas estatísticas:", error);

    res.status(500).json({
      error:
        "Não foi possível carregar as estatísticas.",
    });
  }
});

router.post(
  "/sync",
  requireAuth,
  requireCommandGeneral,
  async (_req, res) => {
    try {
      const result = await syncDiscordDocuments();

      res.json({
        ...result,
        message: "Documentos sincronizados com o Discord.",
      });
    } catch (error) {
      console.error("[documents] Erro ao sincronizar:", error);

      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível sincronizar o canal.",
      });
    }
  },
);

router.patch(
  "/:id",
  requireAuth,
  requireCommandGeneral,
  async (req, res) => {
    try {
      const allowed = [
        "title",
        "description",
        "category",
        "tags",
        "visibility",
        "allowedRoleIds",
        "featured",
        "pinned",
        "archived",
      ];

      const updates = {};

      for (const key of allowed) {
        if (key in req.body) {
          updates[key] = req.body[key];
        }
      }

      const item =
        await DocumentRecord.findByIdAndUpdate(
          req.params.id,
          updates,
          {
            new: true,
            runValidators: true,
          },
        ).lean();

      if (!item) {
        res.status(404).json({
          error: "Documento não encontrado.",
        });
        return;
      }

      res.json({
        ok: true,
        item,
        message: "Documento atualizado.",
      });
    } catch (error) {
      console.error("[documents] Erro ao atualizar:", error);

      res.status(500).json({
        error: "Não foi possível atualizar o documento.",
      });
    }
  },
);

router.delete(
  "/:id",
  requireAuth,
  requireCommandGeneral,
  async (req, res) => {
    try {
      const item =
        await DocumentRecord.findByIdAndDelete(
          req.params.id,
        );

      if (!item) {
        res.status(404).json({
          error: "Documento não encontrado.",
        });
        return;
      }

      res.json({
        ok: true,
        message: "Documento apagado definitivamente.",
      });
    } catch (error) {
      console.error("[documents] Erro ao apagar:", error);

      res.status(500).json({
        error: "Não foi possível apagar o documento.",
      });
    }
  },
);

export default router;
