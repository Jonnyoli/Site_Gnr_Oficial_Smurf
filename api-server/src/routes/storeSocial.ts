import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from "express";

import mongoose from "mongoose";

import StoreWishlist from "../models/StoreWishlist.js";
import StoreGift from "../models/StoreGift.js";

import {
  StoreInventory,
  StoreTransaction,
  StorePurchaseLog,
} from "../models/index.js";

const router = Router();

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

router.get(
  "/me",
  requireAuth,
  async (req, res) => {
    const userId =
      currentUserId(req);

    const [wishlist, sent, received] =
      await Promise.all([
        StoreWishlist.findOne({
          userId,
        }).lean(),

        StoreGift.find({
          senderDiscordId:
            userId,
        })
          .sort({
            createdAt: -1,
          })
          .limit(50)
          .lean(),

        StoreGift.find({
          recipientDiscordId:
            userId,
        })
          .sort({
            createdAt: -1,
          })
          .limit(50)
          .lean(),
      ]);

    return res.json({
      wishlist:
        wishlist?.itemIds || [],
      sent,
      received,
    });
  },
);

router.post(
  "/wishlist/:itemId",
  requireAuth,
  async (req, res) => {
    const userId =
      currentUserId(req);

    const itemId =
      String(req.params.itemId);

    const wishlist =
      await StoreWishlist.findOneAndUpdate(
        { userId },
        {
          $addToSet: {
            itemIds: itemId,
          },
        },
        {
          upsert: true,
          new: true,
        },
      );

    return res.json({
      wishlist:
        wishlist.itemIds,
    });
  },
);

router.delete(
  "/wishlist/:itemId",
  requireAuth,
  async (req, res) => {
    const userId =
      currentUserId(req);

    const itemId =
      String(req.params.itemId);

    const wishlist =
      await StoreWishlist.findOneAndUpdate(
        { userId },
        {
          $pull: {
            itemIds: itemId,
          },
        },
        {
          upsert: true,
          new: true,
        },
      );

    return res.json({
      wishlist:
        wishlist.itemIds,
    });
  },
);

router.post(
  "/gifts",
  requireAuth,
  async (req, res) => {
    const senderDiscordId =
      currentUserId(req);

    const recipientDiscordId =
      String(
        req.body.recipientDiscordId ||
          "",
      ).trim();

    const itemId =
      String(
        req.body.itemId || "",
      ).trim();

    if (
      !recipientDiscordId ||
      !itemId
    ) {
      return res.status(400).json({
        error:
          "Indica o destinatário e o item.",
      });
    }

    if (
      recipientDiscordId ===
      senderDiscordId
    ) {
      return res.status(400).json({
        error:
          "Não podes oferecer um item a ti próprio.",
      });
    }

    const senderInventory =
      await StoreInventory.findOne({
        userId: senderDiscordId,
      });

    if (!senderInventory) {
      return res.status(404).json({
        error:
          "Inventário do remetente não encontrado.",
      });
    }

    const ownedItems =
      Array.isArray(
        senderInventory.ownedItems,
      )
        ? senderInventory.ownedItems
        : [];

    if (
      !ownedItems.includes(itemId)
    ) {
      return res.status(400).json({
        error:
          "Só podes oferecer itens que possuis.",
      });
    }

    const equipped =
      senderInventory.equipped || {};

    const equippedIds =
      [
        equipped.frame,
        equipped.background,
        equipped.title,
        equipped.theme,
        ...(Array.isArray(
          equipped.badges,
        )
          ? equipped.badges
          : []),
      ].filter(Boolean);

    if (
      equippedIds.includes(itemId)
    ) {
      return res.status(400).json({
        error:
          "Desequipa o item antes de o oferecer.",
      });
    }

    const recipientInventory =
      await StoreInventory.findOne({
        userId:
          recipientDiscordId,
      });

    if (
      recipientInventory?.ownedItems?.includes(
        itemId,
      )
    ) {
      return res.status(400).json({
        error:
          "O destinatário já possui este item.",
      });
    }

    const gift =
      await StoreGift.create({
        senderDiscordId,
        senderName:
          currentUserName(req),
        recipientDiscordId,
        recipientName:
          String(
            req.body.recipientName ||
              "",
          ).trim(),
        itemId,
        message:
          String(
            req.body.message ||
              "",
          ).trim(),
      });

    return res.status(201).json({
      gift,
    });
  },
);

router.post(
  "/gifts/:giftId/accept",
  requireAuth,
  async (req, res) => {
    const session =
      await mongoose.startSession();

    try {
      let resultGift: any = null;

      await session.withTransaction(
        async () => {
          const gift =
            await StoreGift.findById(
              req.params.giftId,
            ).session(session);

          if (!gift) {
            throw new Error(
              "Presente não encontrado.",
            );
          }

          if (
            gift.recipientDiscordId !==
            currentUserId(req)
          ) {
            throw new Error(
              "Este presente não te pertence.",
            );
          }

          if (
            gift.status !== "SENT"
          ) {
            throw new Error(
              "Este presente já foi processado.",
            );
          }

          const sender =
            await StoreInventory.findOne({
              userId:
                gift.senderDiscordId,
            }).session(session);

          if (
            !sender ||
            !sender.ownedItems?.includes(
              gift.itemId,
            )
          ) {
            throw new Error(
              "O remetente já não possui este item.",
            );
          }

          let recipient =
            await StoreInventory.findOne({
              userId:
                gift.recipientDiscordId,
            }).session(session);

          if (!recipient) {
            recipient =
              new StoreInventory({
                userId:
                  gift.recipientDiscordId,
                credits: 500,
                ownedItems: [],
                equipped: {
                  frame: null,
                  background: null,
                  title: null,
                  theme: null,
                  badges: [],
                },
              });
          }

          if (
            recipient.ownedItems?.includes(
              gift.itemId,
            )
          ) {
            throw new Error(
              "Já possuis este item.",
            );
          }

          sender.ownedItems =
            sender.ownedItems.filter(
              (item: string) =>
                item !== gift.itemId,
            );

          recipient.ownedItems = [
            ...(recipient.ownedItems || []),
            gift.itemId,
          ];

          await sender.save({
            session,
          });

          await recipient.save({
            session,
          });

          gift.status =
            "ACCEPTED";
          gift.respondedAt =
            new Date();

          await gift.save({
            session,
          });

          await StoreTransaction.create(
            [
              {
                userId:
                  gift.senderDiscordId,
                type: "UNEQUIP",
                itemId:
                  gift.itemId,
                amount: 0,
                beforeCredits:
                  sender.credits || 0,
                afterCredits:
                  sender.credits || 0,
                reason:
                  `Item oferecido a ${gift.recipientDiscordId}`,
                createdBy:
                  gift.senderDiscordId,
              },
            ],
            { session },
          );

          await StorePurchaseLog.create(
            [
              {
                userId:
                  gift.recipientDiscordId,
                itemId:
                  gift.itemId,
                action:
                  "BOUGHT",
                metadata: {
                  gifted: true,
                  senderDiscordId:
                    gift.senderDiscordId,
                },
              },
            ],
            { session },
          );

          resultGift = gift;
        },
      );

      return res.json({
        gift: resultGift,
      });
    } catch (error) {
      return res.status(400).json({
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível aceitar o presente.",
      });
    } finally {
      await session.endSession();
    }
  },
);

router.post(
  "/gifts/:giftId/decline",
  requireAuth,
  async (req, res) => {
    const gift =
      await StoreGift.findById(
        req.params.giftId,
      );

    if (!gift) {
      return res.status(404).json({
        error:
          "Presente não encontrado.",
      });
    }

    if (
      gift.recipientDiscordId !==
      currentUserId(req)
    ) {
      return res.status(403).json({
        error:
          "Este presente não te pertence.",
      });
    }

    if (gift.status !== "SENT") {
      return res.status(400).json({
        error:
          "Este presente já foi processado.",
      });
    }

    gift.status =
      "DECLINED";
    gift.respondedAt =
      new Date();

    await gift.save();

    return res.json({
      gift,
    });
  },
);

export default router;
