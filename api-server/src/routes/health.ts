import { Router } from "express";

const router = Router();

router.get("/healthz", (_req, res) => {
  const data = { status: "ok" };
  res.json(data);
});

export default router;
