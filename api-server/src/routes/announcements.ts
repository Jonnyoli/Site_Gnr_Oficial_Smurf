import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";

import { getAnnouncements } from "../services/discordFeedService.js";

const router = Router();

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.user) {
    res.status(401).json({ error: "É necessário iniciar sessão." });
    return;
  }

  next();
}

router.get("/", requireAuth, async (_req, res) => {
  try {
    return res.json({ announcements: await getAnnouncements() });
  } catch (error) {
    return res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os comunicados.",
    });
  }
});

export default router;
