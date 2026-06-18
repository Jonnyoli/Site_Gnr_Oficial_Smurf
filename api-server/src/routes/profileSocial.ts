import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from "express";

import ProfileComment from "../models/ProfileComment.js";
import ProfileRecognition from "../models/ProfileRecognition.js";
import ProfileVisit from "../models/ProfileVisit.js";
import ProfileSocialCustomization from "../models/ProfileSocialCustomization.js";
import { findSocialCosmetic } from "../data/socialCosmeticsCatalog.js";

const router = Router();

const MODERATOR_ROLE_IDS = new Set([
  "1147878942099906672",
  "1417907622270599189",
  "1147878941885988926",
]);

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

function currentUserRoles(req: Request) {
  const roles = currentUser(req)?.roles;

  return Array.isArray(roles)
    ? roles.map(String)
    : [];
}

function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!currentUserId(req)) {
    res.status(401).json({
      error: "É necessário iniciar sessão.",
    });
    return;
  }

  next();
}

function isModerator(req: Request) {
  return currentUserRoles(req).some(
    (role) => MODERATOR_ROLE_IDS.has(role),
  );
}

function recognitionSummary(items: any[]) {
  const counts: Record<string, number> = {};

  for (const item of items) {
    counts[item.type] =
      (counts[item.type] || 0) + 1;
  }

  return counts;
}

router.get(
  "/:discordId",
  requireAuth,
  async (req, res) => {
    const profileDiscordId =
      String(req.params.discordId);

    const now = new Date();
    const weekAgo =
      new Date(
        now.getTime() -
          7 * 86_400_000,
      );

    const [
      comments,
      recognitions,
      totalVisits,
      weeklyVisits,
      profileCustomization,
    ] = await Promise.all([
      ProfileComment.find({
        profileDiscordId,
        hidden: false,
      })
        .sort({
          pinned: -1,
          createdAt: -1,
        })
        .limit(100)
        .lean(),

      ProfileRecognition.find({
        profileDiscordId,
      })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean(),

      ProfileVisit.countDocuments({
        profileDiscordId,
      }),

      ProfileVisit.countDocuments({
        profileDiscordId,
        visitedAt: {
          $gte: weekAgo,
        },
      }),

      ProfileSocialCustomization.findOne({
        discordId: profileDiscordId,
      }).lean(),
    ]);

    const authorIds = [
      ...new Set(
        comments.map(
          (comment: any) =>
            comment.authorDiscordId,
        ),
      ),
    ];

    const authorCustomizations =
      await ProfileSocialCustomization.find({
        discordId: {
          $in: authorIds,
        },
      }).lean();

    const customizationById =
      new Map(
        authorCustomizations.map(
          (customization: any) => [
            customization.discordId,
            customization,
          ],
        ),
      );

    const enrichedComments =
      comments.map((comment: any) => {
        const customization =
          customizationById.get(
            comment.authorDiscordId,
          );

        const commentStyle =
          findSocialCosmetic(
            customization?.equipped
              ?.commentStyle,
          );

        const signature =
          findSocialCosmetic(
            customization?.equipped
              ?.signature,
          );

        const badges =
          (
            customization?.equipped
              ?.socialBadges || []
          )
            .map(findSocialCosmetic)
            .filter(Boolean);

        const reactionPack =
          findSocialCosmetic(
            customization?.equipped
              ?.reactionPack,
          );

        return {
          ...comment,
          socialStyle: {
            commentStyle,
            signature,
            badges,
            reactionPack,
          },
        };
      });

    const muralBackground =
      findSocialCosmetic(
        profileCustomization?.equipped
          ?.muralBackground,
      );

    const highlightedCommentStyle =
      findSocialCosmetic(
        profileCustomization?.equipped
          ?.highlightedCommentStyle,
      );

    return res.json({
      comments:
        enrichedComments,
      recognitions,
      recognitionSummary:
        recognitionSummary(recognitions),
      visits: {
        total: totalVisits,
        week: weeklyVisits,
      },
      customization: {
        equipped:
          profileCustomization?.equipped ||
          {},
        muralSettings:
          profileCustomization?.muralSettings ||
          {
            overlayOpacity: 0.72,
            blur: 0,
            position: "center",
          },
        privacy:
          profileCustomization?.privacy ||
          {},
        featuredCommentId:
          profileCustomization?.featuredCommentId ||
          null,
        muralBackground,
        highlightedCommentStyle,
      },
      permissions: {
        canModerate:
          isModerator(req),
        isOwnProfile:
          currentUserId(req) ===
          profileDiscordId,
      },
    });
  },
);

router.post(
  "/:discordId/visit",
  requireAuth,
  async (req, res) => {
    const profileDiscordId =
      String(req.params.discordId);

    const visitorDiscordId =
      currentUserId(req);

    if (
      profileDiscordId ===
      visitorDiscordId
    ) {
      return res.json({
        ok: true,
        counted: false,
      });
    }

    const lastHour =
      new Date(
        Date.now() -
          60 * 60 * 1000,
      );

    const recent =
      await ProfileVisit.findOne({
        profileDiscordId,
        visitorDiscordId,
        visitedAt: {
          $gte: lastHour,
        },
      }).lean();

    if (recent) {
      return res.json({
        ok: true,
        counted: false,
      });
    }

    await ProfileVisit.create({
      profileDiscordId,
      visitorDiscordId,
      visitorName:
        currentUserName(req),
    });

    return res.status(201).json({
      ok: true,
      counted: true,
    });
  },
);

router.post(
  "/:discordId/comments",
  requireAuth,
  async (req, res) => {
    const profileDiscordId =
      String(req.params.discordId);

    const content =
      String(
        req.body.content || "",
      ).trim();

    const category =
      String(
        req.body.category ||
          "COMMENT",
      );

    if (
      content.length < 2 ||
      content.length > 500
    ) {
      return res.status(400).json({
        error:
          "O comentário deve ter entre 2 e 500 caracteres.",
      });
    }

    const allowedCategories =
      new Set([
        "COMMENT",
        "PRAISE",
        "THANKS",
        "TEAM",
        "OPERATION",
      ]);

    const comment =
      await ProfileComment.create({
        profileDiscordId,
        authorDiscordId:
          currentUserId(req),
        authorName:
          currentUserName(req),
        authorRank:
          String(
            currentUser(req)?.rank ||
              "",
          ),
        content,
        category:
          allowedCategories.has(
            category,
          )
            ? category
            : "COMMENT",
      });

    return res.status(201).json({
      comment,
    });
  },
);

router.put(
  "/comments/:commentId",
  requireAuth,
  async (req, res) => {
    const comment =
      await ProfileComment.findById(
        req.params.commentId,
      );

    if (!comment) {
      return res.status(404).json({
        error:
          "Comentário não encontrado.",
      });
    }

    if (
      comment.authorDiscordId !==
        currentUserId(req) &&
      !isModerator(req)
    ) {
      return res.status(403).json({
        error:
          "Não tens permissão para editar este comentário.",
      });
    }

    const content =
      String(
        req.body.content || "",
      ).trim();

    if (
      content.length < 2 ||
      content.length > 500
    ) {
      return res.status(400).json({
        error:
          "O comentário deve ter entre 2 e 500 caracteres.",
      });
    }

    comment.content = content;
    comment.editedAt =
      new Date();

    await comment.save();

    return res.json({
      comment,
    });
  },
);

router.delete(
  "/comments/:commentId",
  requireAuth,
  async (req, res) => {
    const comment =
      await ProfileComment.findById(
        req.params.commentId,
      );

    if (!comment) {
      return res.status(404).json({
        error:
          "Comentário não encontrado.",
      });
    }

    if (
      comment.authorDiscordId !==
        currentUserId(req) &&
      !isModerator(req)
    ) {
      return res.status(403).json({
        error:
          "Não tens permissão para remover este comentário.",
      });
    }

    if (isModerator(req)) {
      comment.hidden = true;
      comment.hiddenReason =
        String(
          req.body.reason ||
            "Moderado.",
        );
      comment.moderatedByDiscordId =
        currentUserId(req);
      comment.moderatedByName =
        currentUserName(req);

      await comment.save();
    } else {
      await comment.deleteOne();
    }

    return res.json({
      ok: true,
    });
  },
);

router.post(
  "/comments/:commentId/pin",
  requireAuth,
  async (req, res) => {
    const comment =
      await ProfileComment.findById(
        req.params.commentId,
      );

    if (!comment) {
      return res.status(404).json({
        error:
          "Comentário não encontrado.",
      });
    }

    const canPin =
      currentUserId(req) ===
        comment.profileDiscordId ||
      isModerator(req);

    if (!canPin) {
      return res.status(403).json({
        error:
          "Não tens permissão para fixar este comentário.",
      });
    }

    comment.pinned =
      !comment.pinned;

    await comment.save();

    return res.json({
      comment,
    });
  },
);

router.post(
  "/comments/:commentId/react",
  requireAuth,
  async (req, res) => {
    const comment =
      await ProfileComment.findById(
        req.params.commentId,
      );

    if (!comment) {
      return res.status(404).json({
        error:
          "Comentário não encontrado.",
      });
    }

    const emoji =
      String(
        req.body.emoji ||
          "LIKE",
      );

    const allowed =
      new Set([
        "LIKE",
        "SALUTE",
        "SHIELD",
        "STAR",
      ]);

    if (!allowed.has(emoji)) {
      return res.status(400).json({
        error:
          "Reação inválida.",
      });
    }

    const userId =
      currentUserId(req);

    const existingIndex =
      comment.reactions.findIndex(
        (item: any) =>
          item.userDiscordId ===
            userId &&
          item.emoji === emoji,
      );

    if (existingIndex >= 0) {
      comment.reactions.splice(
        existingIndex,
        1,
      );
    } else {
      comment.reactions.push({
        userDiscordId: userId,
        userName:
          currentUserName(req),
        emoji,
        at: new Date(),
      });
    }

    await comment.save();

    return res.json({
      comment,
    });
  },
);

router.post(
  "/:discordId/recognitions",
  requireAuth,
  async (req, res) => {
    const profileDiscordId =
      String(req.params.discordId);

    const awardedByDiscordId =
      currentUserId(req);

    if (
      profileDiscordId ===
      awardedByDiscordId
    ) {
      return res.status(400).json({
        error:
          "Não podes reconhecer o teu próprio perfil.",
      });
    }

    const type =
      String(req.body.type || "");

    const allowed =
      new Set([
        "LEADERSHIP",
        "TEAMWORK",
        "PROFESSIONALISM",
        "ACTIVITY",
        "COMMUNICATION",
        "DISCIPLINE",
        "OPERATIONAL_MERIT",
        "TRAINING",
      ]);

    if (!allowed.has(type)) {
      return res.status(400).json({
        error:
          "Categoria de reconhecimento inválida.",
      });
    }

    const recognition =
      await ProfileRecognition.findOneAndUpdate(
        {
          profileDiscordId,
          awardedByDiscordId,
          type,
        },
        {
          profileDiscordId,
          awardedByDiscordId,
          awardedByName:
            currentUserName(req),
          type,
          note:
            String(
              req.body.note || "",
            ).trim(),
          official:
            isModerator(req),
        },
        {
          upsert: true,
          new: true,
          runValidators: true,
        },
      );

    return res.status(201).json({
      recognition,
    });
  },
);

router.delete(
  "/recognitions/:recognitionId",
  requireAuth,
  async (req, res) => {
    const recognition =
      await ProfileRecognition.findById(
        req.params.recognitionId,
      );

    if (!recognition) {
      return res.status(404).json({
        error:
          "Reconhecimento não encontrado.",
      });
    }

    if (
      recognition.awardedByDiscordId !==
        currentUserId(req) &&
      !isModerator(req)
    ) {
      return res.status(403).json({
        error:
          "Não tens permissão para remover este reconhecimento.",
      });
    }

    await recognition.deleteOne();

    return res.json({
      ok: true,
    });
  },
);

export default router;
