import { Router } from "express";
import mandatesRouter from "./mandates.js";
import payRouter from "./pay.js";
import auditRouter from "./audit.js";

const router = Router();

router.use("/mandates", mandatesRouter);
router.use("/pay", payRouter);
router.use("/audit", auditRouter);

export default router;
