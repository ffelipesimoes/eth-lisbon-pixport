import { Router, Request, Response } from "express";
import { fetchHcsMessages } from "../hedera/index.js";

const router = Router();

/**
 * GET /audit?limit=N
 *
 * Proxy the last N HCS messages from the Mirror Node for the console.
 */
router.get("/", async (req: Request, res: Response) => {
  const limit = Math.min(parseInt((req.query.limit as string) ?? "10", 10) || 10, 50);
  const entries = await fetchHcsMessages(limit);
  res.json(entries);
});

export default router;
