import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from "express";

import ProfileSocialCustomization from "../models/ProfileSocialCustomization.js";
import ProfileComment from "../models/ProfileComment.js";

import {
  StoreInventory,
} from "../models/index.js";

import {
  SOCIAL_COSMETICS_CATALOG,
  findSocialCosmetic,
} from "../data/socialCosmeticsCatalog.js";

const router = Router();

function currentUser(req: Request) {
  return req.session?.user || null;
}

function currentUserId(req: Request) {
  return String(
    currentUser(req)?.id || "",
  );
}

function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!currentUserId(req)) {
    res.status(401).json({
      error:
        "É necessário iniciar sessão.",
    });
    return;
  }

  next();
}

function publicCustomization(
  customization: any,
) {
  return {
    equipped:
      customization?.equipped || {
        muralBackground: null,
        commentStyle: null,
        signature: null,
        reactionPack: null,
        socialBadges: [],
        highlightedCommentStyle: null,
        entryEffect: null,
      },
    muralSettings:
      customization?.muralSettings || {
        overlayOpacity: 0.72,
        blur: 0,
        position: "center",
      },
    featuredCommentId:
      customization?.featuredCommentId ||
      null,
    privacy:
      customization?.privacy || {
        comments: "EVERYONE",
        showCollection: true,
        showVisits: true,
      },
  };
}

router.get(
  "/catalog",
  requireAuth,
  async (_req, res) => {
    return res.json({
      items:
        SOCIAL_COSMETICS_CATALOG,
    });
  },
);

router.get(
  "/me",
  requireAuth,
  async (req, res) => {
    const discordId =
      currentUserId(req);

    const [
      customization,
      inventory,
    ] = await Promise.all([
      ProfileSocialCustomization.findOne({
        discordId,
      }).lean(),

      StoreInventory.findOne({
        userId: discordId,
      }).lean(),
    ]);

    return res.json({
      ...publicCustomization(
        customization,
      ),
      ownedItems:
        inventory?.ownedItems || [],
    });
  },
);

router.get(
  "/:discordId",
  requireAuth,
  async (req, res) => {
    const customization =
      await ProfileSocialCustomization.findOne({
        discordId:
          String(
            req.params.discordId,
          ),
      }).lean();

    return res.json(
      publicCustomization(
        customization,
      ),
    );
  },
);


router.put(
  "/me",
  requireAuth,
  async (req, res) => {
    const discordId =
      currentUserId(req);

    const inventory =
      await StoreInventory.findOne({
        userId: discordId,
      }).lean();

    const owned =
      new Set(
        inventory?.ownedItems || [],
      );

    const current =
      await ProfileSocialCustomization.findOne({
        discordId,
      }).lean();

    const incomingEquipped =
      req.body.equipped || {};

    const slotTypes = {
      muralBackground:
        "MURAL_BACKGROUND",
      commentStyle:
        "COMMENT_STYLE",
      signature:
        "SIGNATURE",
      reactionPack:
        "REACTION_PACK",
      highlightedCommentStyle:
        "HIGHLIGHT_STYLE",
      entryEffect:
        "ENTRY_EFFECT",
    };

    const equipped = {
      ...(current?.equipped || {}),
    };

    for (
      const [slot, expectedType]
      of Object.entries(slotTypes)
    ) {
      const itemId =
        incomingEquipped?.[slot]
          ? String(
              incomingEquipped[
                slot
              ],
            )
          : null;

      if (!itemId) {
        equipped[slot] = null;
        continue;
      }

      const item =
        findSocialCosmetic(itemId);

      if (
        !item ||
        item.type !==
          expectedType
      ) {
        return res.status(400).json({
          error:
            `Item inválido para ${slot}.`,
        });
      }

      if (!owned.has(itemId)) {
        return res.status(403).json({
          error:
            `Ainda não possuis ${item.name}.`,
        });
      }

      equipped[slot] = itemId;
    }

    const socialBadges =
      Array.isArray(
        incomingEquipped
          ?.socialBadges,
      )
        ? incomingEquipped
            .socialBadges
            .map(String)
            .slice(0, 2)
        : [];

    for (
      const badgeId
      of socialBadges
    ) {
      const badge =
        findSocialCosmetic(
          badgeId,
        );

      if (
        !badge ||
        badge.type !==
          "SOCIAL_BADGE" ||
        !owned.has(badgeId)
      ) {
        return res.status(403).json({
          error:
            "Um dos emblemas sociais não está disponível no teu inventário.",
        });
      }
    }

    equipped.socialBadges =
      socialBadges;

    const overlayOpacity =
      Math.min(
        1,
        Math.max(
          0,
          Number(
            req.body
              ?.muralSettings
              ?.overlayOpacity ??
              current
                ?.muralSettings
                ?.overlayOpacity ??
              0.72,
          ),
        ),
      );

    const blur =
      Math.min(
        16,
        Math.max(
          0,
          Number(
            req.body
              ?.muralSettings
              ?.blur ??
              current
                ?.muralSettings
                ?.blur ??
              0,
          ),
        ),
      );

    const allowedPositions =
      new Set([
        "center",
        "top",
        "bottom",
        "left",
        "right",
      ]);

    const requestedPosition =
      String(
        req.body
          ?.muralSettings
          ?.position ||
          current
            ?.muralSettings
            ?.position ||
          "center",
      );

    const commentsPrivacy =
      new Set([
        "EVERYONE",
        "UNIT",
        "PATROL_PARTNERS",
        "DISABLED",
      ]).has(
        String(
          req.body
            ?.privacy
            ?.comments,
        ),
      )
        ? String(
            req.body
              .privacy
              .comments,
          )
        : current
            ?.privacy
            ?.comments ||
          "EVERYONE";

    const customization =
      await ProfileSocialCustomization.findOneAndUpdate(
        { discordId },
        {
          $set: {
            equipped,
            muralSettings: {
              overlayOpacity,
              blur,
              position:
                allowedPositions.has(
                  requestedPosition,
                )
                  ? requestedPosition
                  : "center",
            },
            privacy: {
              comments:
                commentsPrivacy,
              showCollection:
                req.body
                  ?.privacy
                  ?.showCollection !==
                false,
              showVisits:
                req.body
                  ?.privacy
                  ?.showVisits !==
                false,
            },
          },
        },
        {
          upsert: true,
          new: true,
          runValidators: true,
        },
      );

    return res.json({
      customization:
        publicCustomization(
          customization,
        ),
    });
  },
);

router.put(
  "/me/equipped",
  requireAuth,
  async (req, res) => {
    const discordId =
      currentUserId(req);

    const slot =
      String(req.body.slot || "");

    const itemId =
      req.body.itemId
        ? String(req.body.itemId)
        : null;

    const allowedSlots =
      new Set([
        "muralBackground",
        "commentStyle",
        "signature",
        "reactionPack",
        "highlightedCommentStyle",
        "entryEffect",
      ]);

    if (!allowedSlots.has(slot)) {
      return res.status(400).json({
        error:
          "Espaço de personalização inválido.",
      });
    }

    if (itemId) {
      const item =
        findSocialCosmetic(itemId);

      if (!item) {
        return res.status(404).json({
          error:
            "Item social não encontrado.",
        });
      }

      const inventory =
        await StoreInventory.findOne({
          userId: discordId,
        }).lean();

      if (
        !inventory?.ownedItems?.includes(
          itemId,
        )
      ) {
        return res.status(403).json({
          error:
            "Ainda não possuis este item.",
        });
      }
    }

    const customization =
      await ProfileSocialCustomization.findOneAndUpdate(
        { discordId },
        {
          $set: {
            [`equipped.${slot}`]:
              itemId,
          },
        },
        {
          upsert: true,
          new: true,
          runValidators: true,
        },
      );

    return res.json({
      customization:
        publicCustomization(
          customization,
        ),
    });
  },
);

router.put(
  "/me/social-badges",
  requireAuth,
  async (req, res) => {
    const discordId =
      currentUserId(req);

    const badgeIds =
      Array.isArray(
        req.body.badgeIds,
      )
        ? req.body.badgeIds
            .map(String)
            .slice(0, 2)
        : [];

    const inventory =
      await StoreInventory.findOne({
        userId: discordId,
      }).lean();

    const owned =
      new Set(
        inventory?.ownedItems || [],
      );

    const validBadges =
      badgeIds.filter((itemId) => {
        const item =
          findSocialCosmetic(itemId);

        return (
          item?.type ===
            "SOCIAL_BADGE" &&
          owned.has(itemId)
        );
      });

    const customization =
      await ProfileSocialCustomization.findOneAndUpdate(
        { discordId },
        {
          $set: {
            "equipped.socialBadges":
              validBadges,
          },
        },
        {
          upsert: true,
          new: true,
        },
      );

    return res.json({
      customization:
        publicCustomization(
          customization,
        ),
    });
  },
);

router.put(
  "/me/mural-settings",
  requireAuth,
  async (req, res) => {
    const discordId =
      currentUserId(req);

    const overlayOpacity =
      Math.min(
        1,
        Math.max(
          0,
          Number(
            req.body.overlayOpacity ??
              0.72,
          ),
        ),
      );

    const blur =
      Math.min(
        16,
        Math.max(
          0,
          Number(
            req.body.blur || 0,
          ),
        ),
      );

    const position =
      new Set([
        "center",
        "top",
        "bottom",
        "left",
        "right",
      ]).has(
        String(
          req.body.position,
        ),
      )
        ? String(
            req.body.position,
          )
        : "center";

    const customization =
      await ProfileSocialCustomization.findOneAndUpdate(
        { discordId },
        {
          $set: {
            muralSettings: {
              overlayOpacity,
              blur,
              position,
            },
          },
        },
        {
          upsert: true,
          new: true,
          runValidators: true,
        },
      );

    return res.json({
      customization:
        publicCustomization(
          customization,
        ),
    });
  },
);

router.put(
  "/me/privacy",
  requireAuth,
  async (req, res) => {
    const discordId =
      currentUserId(req);

    const comments =
      new Set([
        "EVERYONE",
        "UNIT",
        "PATROL_PARTNERS",
        "DISABLED",
      ]).has(
        String(
          req.body.comments,
        ),
      )
        ? String(
            req.body.comments,
          )
        : "EVERYONE";

    const customization =
      await ProfileSocialCustomization.findOneAndUpdate(
        { discordId },
        {
          $set: {
            privacy: {
              comments,
              showCollection:
                req.body.showCollection !==
                false,
              showVisits:
                req.body.showVisits !==
                false,
            },
          },
        },
        {
          upsert: true,
          new: true,
          runValidators: true,
        },
      );

    return res.json({
      customization:
        publicCustomization(
          customization,
        ),
    });
  },
);

router.put(
  "/me/featured-comment",
  requireAuth,
  async (req, res) => {
    const discordId =
      currentUserId(req);

    const commentId =
      req.body.commentId
        ? String(
            req.body.commentId,
          )
        : null;

    if (commentId) {
      const comment =
        await ProfileComment.findOne({
          _id: commentId,
          profileDiscordId:
            discordId,
          hidden: false,
        }).lean();

      if (!comment) {
        return res.status(404).json({
          error:
            "Comentário não encontrado neste perfil.",
        });
      }
    }

    const customization =
      await ProfileSocialCustomization.findOneAndUpdate(
        { discordId },
        {
          $set: {
            featuredCommentId:
              commentId,
          },
        },
        {
          upsert: true,
          new: true,
        },
      );

    return res.json({
      customization:
        publicCustomization(
          customization,
        ),
    });
  },
);

export default router;
