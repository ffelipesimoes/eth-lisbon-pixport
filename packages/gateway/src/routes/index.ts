import { Router } from "express";
import mandatesRouter from "./mandates.js";
import payRouter from "./pay.js";

const router = Router();

router.use("/mandates", mandatesRouter);
router.use("/pay", payRouter);

export default router;
