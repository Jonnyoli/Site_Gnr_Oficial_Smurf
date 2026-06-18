import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from "express";

import mongoose from "mongoose";

import {
  ForumNotification,
  ForumPost,
} from "../models/Forum";

const router = Router();

const COMMAND_GENERAL_ROLE_ID =
  "1147878942099906672";

const SERGEANT_ROLE_ID =
  "1147891694260461688";

const DEV_USER_ID =
  "713719718091030599";

const FORUM_DISCORD_CHANNEL_ID =
  process.env.FORUM_DISCORD_CHANNEL_ID || "";

const DISCORD_TOKEN =
  process.env.TOKEN ||
  process.env.DISCORD_TOKEN ||
  "";

const CENTRAL_BASE_URL = (
  process.env.CENTRAL_BASE_URL ||
  "http://localhost:5173"
).replace(/\/$/, "");

const CATEGORY_LABELS: Record<string, string> = {
  GENERAL: "Informações gerais",
  OPERATIONAL: "Operacional",
  TRAINING: "Formação e Escola da Guarda",
  PATROL: "Patrulhamento",
  SUGGESTIONS: "Sugestões e melhorias",
  PROCEDURES: "Procedimentos e regulamentos",
  ACHIEVEMENTS: "Conquistas e eventos",
  COMMAND: "Área reservada ao Comando",
};

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

function currentUserAvatar(req: Request) {
  const user = currentUser(req);

  return (
    user?.avatarUrl ||
    user?.avatar ||
    user?.image ||
    null
  );
}

function currentUserRoles(req: Request) {
  const roles = currentUser(req)?.roles;

  return Array.isArray(roles)
    ? roles.map(String)
    : [];
}

function currentUserRank(req: Request) {
  const user = currentUser(req);

  return (
    user?.rank ||
    user?.posto ||
    user?.hierarchyGroupLabel ||
    "Guarda"
  );
}

function currentUserUnit(req: Request) {
  const user = currentUser(req);

  return (
    user?.unit ||
    user?.unidade ||
    user?.currentUnit ||
    "Patrulha"
  );
}

function isModerator(req: Request) {
  const roles = currentUserRoles(req);

  return (
    currentUserId(req) === DEV_USER_ID ||
    roles.includes(COMMAND_GENERAL_ROLE_ID) ||
    roles.includes(SERGEANT_ROLE_ID)
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

function asObjectId(value: string) {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return null;
  }

  return new mongoose.Types.ObjectId(value);
}

function uniqueStrings(values: unknown) {
  if (!Array.isArray(values)) return [];

  return [
    ...new Set(
      values
        .map(String)
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ];
}

function cleanTags(values: unknown) {
  return uniqueStrings(values)
    .map((value) =>
      value
        .replace(/^#/, "")
        .replace(/[^\p{L}\p{N}_-]/gu, "")
        .slice(0, 24),
    )
    .filter(Boolean)
    .slice(0, 8);
}

function parseMentionIds(content: string) {
  const matches = [
    ...String(content || "").matchAll(
      /@\[([^\]]+)\]\((\d{15,25})\)/g,
    ),
  ];

  return [
    ...new Set(
      matches.map((match) => match[2]),
    ),
  ];
}

function reactionCounts(reactions: any[]) {
  return Object.fromEntries(
    (reactions || []).map((reaction) => [
      reaction.key,
      reaction.userIds?.length || 0,
    ]),
  );
}

function serializePost(
  post: any,
  userId: string,
) {
  const plain =
    typeof post.toObject === "function"
      ? post.toObject()
      : post;

  return {
    ...plain,
    reactionCounts: reactionCounts(
      plain.reactions,
    ),
    commentCount: (
      plain.comments || []
    ).filter(
      (comment: any) =>
        !comment.deletedAt,
    ).length,
    bookmarked:
      plain.bookmarks?.includes(userId) ||
      false,
    followed:
      plain.followers?.includes(userId) ||
      false,
    reacted: Object.fromEntries(
      (plain.reactions || []).map(
        (reaction: any) => [
          reaction.key,
          reaction.userIds?.includes(userId) ||
            false,
        ],
      ),
    ),
  };
}

async function notifyUsers({
  userIds,
  type,
  actorId,
  actorName,
  postId,
  commentId,
  title,
  message,
}: {
  userIds: string[];
  type:
    | "MENTION_POST"
    | "MENTION_COMMENT"
    | "REPLY"
    | "REACTION"
    | "SOLUTION"
    | "MODERATION";
  actorId: string;
  actorName: string;
  postId: any;
  commentId?: any;
  title: string;
  message: string;
}) {
  const targets = [
    ...new Set(userIds),
  ].filter(
    (userId) =>
      userId &&
      userId !== actorId,
  );

  if (!targets.length) return;

  await ForumNotification.insertMany(
    targets.map((userId) => ({
      userId,
      type,
      actorId,
      actorName,
      postId,
      commentId: commentId || null,
      title,
      message,
    })),
    {
      ordered: false,
    },
  ).catch(() => null);
}

async function publishToDiscord(post: any) {
  if (
    !DISCORD_TOKEN ||
    !FORUM_DISCORD_CHANNEL_ID
  ) {
    return null;
  }

  const response = await fetch(
    `https://discord.com/api/v10/channels/${FORUM_DISCORD_CHANNEL_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bot ${DISCORD_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        embeds: [
          {
            title: post.title,
            description:
              String(post.content).slice(0, 3900),
            color: post.isOfficial
              ? 0xd4af37
              : 0x22c55e,
            fields: [
              {
                name: "Categoria",
                value:
                  CATEGORY_LABELS[
                    post.category
                  ] || post.category,
                inline: true,
              },
              {
                name: "Autor",
                value: `${post.authorName} · ${post.authorRank}`,
                inline: true,
              },
            ],
            footer: {
              text:
                "Fórum Interno · GNR Central",
            },
            timestamp:
              new Date().toISOString(),
          },
        ],
        components: [
          {
            type: 1,
            components: [
              {
                type: 2,
                style: 5,
                label: "Abrir no site",
                emoji: {
                  name: "🌐",
                },
                url: `${CENTRAL_BASE_URL}/forum?post=${post._id}`,
              },
            ],
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Discord HTTP ${response.status}`,
    );
  }

  const message = await response.json();

  return {
    channelId:
      FORUM_DISCORD_CHANNEL_ID,
    messageId: message.id,
    jumpUrl: `https://discord.com/channels/${message.guild_id || "@me"}/${FORUM_DISCORD_CHANNEL_ID}/${message.id}`,
    publishedAt: new Date(),
  };
}

router.get(
  "/access",
  requireAuth,
  (req, res) => {
    res.json({
      userId: currentUserId(req),
      canModerate: isModerator(req),
      rank: currentUserRank(req),
      unit: currentUserUnit(req),
    });
  },
);

router.get(
  "/feed",
  requireAuth,
  async (req, res) => {
    const userId = currentUserId(req);

    const category =
      String(req.query.category || "ALL");

    const tab =
      String(req.query.tab || "RECENT");

    const search =
      String(req.query.search || "")
        .trim()
        .slice(0, 100);

    const page = Math.max(
      1,
      Number(req.query.page) || 1,
    );

    const limit = Math.min(
      40,
      Math.max(
        5,
        Number(req.query.limit) || 20,
      ),
    );

    const filter: any = {
      status: {
        $ne: "ARCHIVED",
      },
    };

    if (category !== "ALL") {
      filter.category = category;
    }

    if (search) {
      filter.$text = {
        $search: search,
      };
    }

    if (tab === "OFFICIAL") {
      filter.isOfficial = true;
    }

    if (tab === "UNANSWERED") {
      filter["comments.0"] = {
        $exists: false,
      };
    }

    if (tab === "BOOKMARKED") {
      filter.bookmarks = userId;
    }

    if (tab === "MINE") {
      filter.authorId = userId;
    }

    if (tab === "MENTIONS") {
      filter.mentionUserIds = userId;
    }

    const sort =
      tab === "POPULAR"
        ? {
            isPinned: -1,
            views: -1,
            lastActivityAt: -1,
          }
        : {
            isPinned: -1,
            lastActivityAt: -1,
          };

    const [
      items,
      total,
      categoryStats,
      unreadNotifications,
    ] = await Promise.all([
      ForumPost.find(filter)
        .sort(sort as any)
        .skip((page - 1) * limit)
        .limit(limit),
      ForumPost.countDocuments(filter),
      ForumPost.aggregate([
        {
          $match: {
            status: {
              $ne: "ARCHIVED",
            },
          },
        },
        {
          $group: {
            _id: "$category",
            posts: {
              $sum: 1,
            },
            comments: {
              $sum: {
                $size: "$comments",
              },
            },
          },
        },
      ]),
      ForumNotification.countDocuments({
        userId,
        readAt: null,
      }),
    ]);

    res.json({
      items: items.map((item) =>
        serializePost(item, userId),
      ),
      total,
      page,
      pages: Math.ceil(total / limit),
      categoryStats,
      unreadNotifications,
      permissions: {
        canModerate: isModerator(req),
      },
    });
  },
);

router.get(
  "/posts/:id",
  requireAuth,
  async (req, res) => {
    const objectId = asObjectId(
      req.params.id,
    );

    if (!objectId) {
      res.status(400).json({
        error: "Publicação inválida.",
      });
      return;
    }

    const userId = currentUserId(req);

    const post =
      await ForumPost.findById(objectId);

    if (!post) {
      res.status(404).json({
        error:
          "A publicação não existe.",
      });
      return;
    }

    if (
      !post.viewedBy.includes(userId)
    ) {
      post.viewedBy.push(userId);
      post.views += 1;
      await post.save();
    }

    res.json({
      item: serializePost(
        post,
        userId,
      ),
      permissions: {
        canModerate: isModerator(req),
        canEdit:
          post.authorId === userId ||
          isModerator(req),
      },
    });
  },
);

router.post(
  "/posts",
  requireAuth,
  async (req, res) => {
    const title =
      String(req.body?.title || "")
        .trim()
        .slice(0, 160);

    const content =
      String(req.body?.content || "")
        .trim()
        .slice(0, 12000);

    if (title.length < 4) {
      res.status(400).json({
        error:
          "O título deve ter pelo menos quatro caracteres.",
      });
      return;
    }

    if (content.length < 5) {
      res.status(400).json({
        error:
          "O conteúdo está demasiado curto.",
      });
      return;
    }

    const category =
      CATEGORY_LABELS[
        String(req.body?.category)
      ]
        ? String(req.body.category)
        : "GENERAL";

    if (
      category === "COMMAND" &&
      !isModerator(req)
    ) {
      res.status(403).json({
        error:
          "Não tens acesso à categoria reservada ao Comando.",
      });
      return;
    }

    const mentionUserIds = [
      ...new Set([
        ...uniqueStrings(
          req.body?.mentionUserIds,
        ),
        ...parseMentionIds(content),
      ]),
    ];

    const post =
      await ForumPost.create({
        authorId:
          currentUserId(req),
        authorName:
          currentUserName(req),
        authorRank:
          currentUserRank(req),
        authorUnit:
          currentUserUnit(req),
        authorAvatarUrl:
          currentUserAvatar(req),
        title,
        content,
        category,
        tags: cleanTags(
          req.body?.tags,
        ),
        mentionUserIds,
        mentionRoleIds:
          uniqueStrings(
            req.body?.mentionRoleIds,
          ),
        visibility: [
          "ALL",
          "UNIT",
          "COMMAND",
        ].includes(
          String(req.body?.visibility),
        )
          ? String(
              req.body.visibility,
            )
          : "ALL",
        commentsEnabled:
          req.body?.commentsEnabled !==
          false,
        isOfficial:
          isModerator(req) &&
          req.body?.isOfficial ===
            true,
        isPinned:
          isModerator(req) &&
          req.body?.isPinned === true,
        isHighlighted:
          isModerator(req) &&
          req.body?.isHighlighted ===
            true,
        followers: [
          currentUserId(req),
        ],
        lastActivityAt: new Date(),
      });

    await notifyUsers({
      userIds: mentionUserIds,
      type: "MENTION_POST",
      actorId: currentUserId(req),
      actorName:
        currentUserName(req),
      postId: post._id,
      title:
        "Foste mencionado numa publicação",
      message: `${currentUserName(req)} mencionou-te em “${title}”.`,
    });

    if (
      req.body?.publishDiscord === true
    ) {
      try {
        const discord =
          await publishToDiscord(post);

        if (discord) {
          post.discord = discord;
          await post.save();
        }
      } catch (error: any) {
        // A publicação no site não falha caso o Discord esteja indisponível.
        console.error(
          "[FORUM-DISCORD-PUBLISH]",
          error?.message || error,
        );
      }
    }

    res.status(201).json({
      item: serializePost(
        post,
        currentUserId(req),
      ),
    });
  },
);

router.patch(
  "/posts/:id",
  requireAuth,
  async (req, res) => {
    const post =
      await ForumPost.findById(
        req.params.id,
      );

    if (!post) {
      res.status(404).json({
        error:
          "A publicação não existe.",
      });
      return;
    }

    const userId = currentUserId(req);

    if (
      post.authorId !== userId &&
      !isModerator(req)
    ) {
      res.status(403).json({
        error:
          "Não podes editar esta publicação.",
      });
      return;
    }

    if (
      post.status === "LOCKED" &&
      !isModerator(req)
    ) {
      res.status(409).json({
        error:
          "A publicação encontra-se bloqueada.",
      });
      return;
    }

    if (
      typeof req.body?.title ===
      "string"
    ) {
      post.title = req.body.title
        .trim()
        .slice(0, 160);
    }

    if (
      typeof req.body?.content ===
      "string"
    ) {
      post.content =
        req.body.content
          .trim()
          .slice(0, 12000);

      post.mentionUserIds = [
        ...new Set([
          ...uniqueStrings(
            req.body?.mentionUserIds,
          ),
          ...parseMentionIds(
            post.content,
          ),
        ]),
      ];
    }

    if (
      Array.isArray(
        req.body?.tags,
      )
    ) {
      post.tags = cleanTags(
        req.body.tags,
      );
    }

    post.lastActivityAt =
      new Date();

    await post.save();

    res.json({
      item: serializePost(
        post,
        userId,
      ),
    });
  },
);

router.post(
  "/posts/:id/comments",
  requireAuth,
  async (req, res) => {
    const post =
      await ForumPost.findById(
        req.params.id,
      );

    if (!post) {
      res.status(404).json({
        error:
          "A publicação não existe.",
      });
      return;
    }

    if (
      !post.commentsEnabled ||
      post.status === "LOCKED" ||
      post.status === "ARCHIVED"
    ) {
      res.status(409).json({
        error:
          "Os comentários estão fechados.",
      });
      return;
    }

    const content =
      String(req.body?.content || "")
        .trim()
        .slice(0, 3000);

    if (content.length < 2) {
      res.status(400).json({
        error:
          "O comentário está vazio.",
      });
      return;
    }

    let parentComment: any = null;

    if (
      req.body?.parentCommentId
    ) {
      parentComment =
        post.comments.id(
          req.body.parentCommentId,
        );

      if (!parentComment) {
        res.status(404).json({
          error:
            "O comentário original não existe.",
        });
        return;
      }
    }

    const mentionUserIds = [
      ...new Set([
        ...uniqueStrings(
          req.body?.mentionUserIds,
        ),
        ...parseMentionIds(content),
      ]),
    ];

    const comment: any = {
      authorId:
        currentUserId(req),
      authorName:
        currentUserName(req),
      authorRank:
        currentUserRank(req),
      authorUnit:
        currentUserUnit(req),
      authorAvatarUrl:
        currentUserAvatar(req),
      content,
      mentionUserIds,
      parentCommentId:
        parentComment?._id ||
        null,
    };

    post.comments.push(comment);
    post.lastActivityAt =
      new Date();

    if (
      !post.followers.includes(
        currentUserId(req),
      )
    ) {
      post.followers.push(
        currentUserId(req),
      );
    }

    await post.save();

    const createdComment =
      post.comments[
        post.comments.length - 1
      ];

    await notifyUsers({
      userIds: mentionUserIds,
      type: "MENTION_COMMENT",
      actorId: currentUserId(req),
      actorName:
        currentUserName(req),
      postId: post._id,
      commentId:
        createdComment._id,
      title:
        "Foste mencionado num comentário",
      message: `${currentUserName(req)} mencionou-te em “${post.title}”.`,
    });

    if (
      parentComment?.authorId
    ) {
      await notifyUsers({
        userIds: [
          parentComment.authorId,
        ],
        type: "REPLY",
        actorId:
          currentUserId(req),
        actorName:
          currentUserName(req),
        postId: post._id,
        commentId:
          createdComment._id,
        title:
          "Responderam ao teu comentário",
        message: `${currentUserName(req)} respondeu em “${post.title}”.`,
      });
    } else if (
      post.authorId !==
      currentUserId(req)
    ) {
      await notifyUsers({
        userIds: [post.authorId],
        type: "REPLY",
        actorId:
          currentUserId(req),
        actorName:
          currentUserName(req),
        postId: post._id,
        commentId:
          createdComment._id,
        title:
          "Nova resposta à tua publicação",
        message: `${currentUserName(req)} comentou em “${post.title}”.`,
      });
    }

    res.status(201).json({
      item: serializePost(
        post,
        currentUserId(req),
      ),
    });
  },
);

router.post(
  "/posts/:id/reactions",
  requireAuth,
  async (req, res) => {
    const post =
      await ForumPost.findById(
        req.params.id,
      );

    if (!post) {
      res.status(404).json({
        error:
          "A publicação não existe.",
      });
      return;
    }

    const key =
      String(req.body?.key);

    if (
      ![
        "LIKE",
        "SHIELD",
        "CHECK",
        "FIRE",
      ].includes(key)
    ) {
      res.status(400).json({
        error: "Reação inválida.",
      });
      return;
    }

    const userId =
      currentUserId(req);

    let reaction =
      post.reactions.find(
        (item: any) =>
          item.key === key,
      );

    if (!reaction) {
      post.reactions.push({
        key,
        userIds: [userId],
      } as any);
    } else if (
      reaction.userIds.includes(
        userId,
      )
    ) {
      reaction.userIds =
        reaction.userIds.filter(
          (id: string) =>
            id !== userId,
        );
    } else {
      reaction.userIds.push(
        userId,
      );
    }

    post.lastActivityAt =
      new Date();

    await post.save();

    res.json({
      item: serializePost(
        post,
        userId,
      ),
    });
  },
);

router.post(
  "/posts/:id/bookmark",
  requireAuth,
  async (req, res) => {
    const post =
      await ForumPost.findById(
        req.params.id,
      );

    if (!post) {
      res.status(404).json({
        error:
          "A publicação não existe.",
      });
      return;
    }

    const userId =
      currentUserId(req);

    if (
      post.bookmarks.includes(
        userId,
      )
    ) {
      post.bookmarks =
        post.bookmarks.filter(
          (id) => id !== userId,
        );
    } else {
      post.bookmarks.push(userId);
    }

    await post.save();

    res.json({
      bookmarked:
        post.bookmarks.includes(
          userId,
        ),
    });
  },
);

router.post(
  "/posts/:id/follow",
  requireAuth,
  async (req, res) => {
    const post =
      await ForumPost.findById(
        req.params.id,
      );

    if (!post) {
      res.status(404).json({
        error:
          "A publicação não existe.",
      });
      return;
    }

    const userId =
      currentUserId(req);

    if (
      post.followers.includes(
        userId,
      )
    ) {
      post.followers =
        post.followers.filter(
          (id) => id !== userId,
        );
    } else {
      post.followers.push(userId);
    }

    await post.save();

    res.json({
      followed:
        post.followers.includes(
          userId,
        ),
    });
  },
);

router.post(
  "/posts/:postId/comments/:commentId/solution",
  requireAuth,
  async (req, res) => {
    const post =
      await ForumPost.findById(
        req.params.postId,
      );

    if (!post) {
      res.status(404).json({
        error:
          "A publicação não existe.",
      });
      return;
    }

    if (
      post.authorId !==
        currentUserId(req) &&
      !isModerator(req)
    ) {
      res.status(403).json({
        error:
          "Apenas o autor ou a moderação pode marcar a solução.",
      });
      return;
    }

    const comment: any =
      post.comments.id(
        req.params.commentId,
      );

    if (!comment) {
      res.status(404).json({
        error:
          "O comentário não existe.",
      });
      return;
    }

    for (
      const item of post.comments
    ) {
      item.isSolution =
        String(item._id) ===
        String(comment._id);
    }

    post.status = "RESOLVED";
    post.lastActivityAt =
      new Date();

    await post.save();

    await notifyUsers({
      userIds: [
        comment.authorId,
      ],
      type: "SOLUTION",
      actorId:
        currentUserId(req),
      actorName:
        currentUserName(req),
      postId: post._id,
      commentId: comment._id,
      title:
        "A tua resposta foi marcada como solução",
      message: `A tua resposta em “${post.title}” foi reconhecida como solução.`,
    });

    res.json({
      item: serializePost(
        post,
        currentUserId(req),
      ),
    });
  },
);

router.patch(
  "/posts/:id/moderate",
  requireAuth,
  async (req, res) => {
    if (!isModerator(req)) {
      res.status(403).json({
        error:
          "Não tens permissões de moderação.",
      });
      return;
    }

    const post =
      await ForumPost.findById(
        req.params.id,
      );

    if (!post) {
      res.status(404).json({
        error:
          "A publicação não existe.",
      });
      return;
    }

    const action =
      String(req.body?.action);

    if (action === "PIN") {
      post.isPinned =
        !post.isPinned;
    } else if (
      action === "OFFICIAL"
    ) {
      post.isOfficial =
        !post.isOfficial;
    } else if (
      action === "HIGHLIGHT"
    ) {
      post.isHighlighted =
        !post.isHighlighted;
    } else if (
      action === "LOCK"
    ) {
      post.status =
        post.status === "LOCKED"
          ? "OPEN"
          : "LOCKED";
    } else if (
      action === "ARCHIVE"
    ) {
      post.status = "ARCHIVED";
    } else if (
      action === "RESOLVE"
    ) {
      post.status =
        post.status === "RESOLVED"
          ? "OPEN"
          : "RESOLVED";
    } else {
      res.status(400).json({
        error:
          "Ação de moderação inválida.",
      });
      return;
    }

    post.moderatedBy =
      currentUserId(req);

    post.moderationReason =
      String(
        req.body?.reason || "",
      )
        .trim()
        .slice(0, 1000);

    post.lastActivityAt =
      new Date();

    await post.save();

    res.json({
      item: serializePost(
        post,
        currentUserId(req),
      ),
    });
  },
);

router.get(
  "/notifications",
  requireAuth,
  async (req, res) => {
    const userId =
      currentUserId(req);

    const items =
      await ForumNotification.find({
        userId,
      })
        .sort({
          createdAt: -1,
        })
        .limit(50)
        .lean();

    res.json({
      items,
      unread: items.filter(
        (item) => !item.readAt,
      ).length,
    });
  },
);

router.post(
  "/notifications/read",
  requireAuth,
  async (req, res) => {
    const userId =
      currentUserId(req);

    const ids =
      uniqueStrings(
        req.body?.ids,
      )
        .map(asObjectId)
        .filter(Boolean);

    const filter: any = {
      userId,
      readAt: null,
    };

    if (ids.length) {
      filter._id = {
        $in: ids,
      };
    }

    await ForumNotification.updateMany(
      filter,
      {
        $set: {
          readAt: new Date(),
        },
      },
    );

    res.json({
      ok: true,
    });
  },
);

export default router;
