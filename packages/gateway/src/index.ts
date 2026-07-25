import express from "express";
import { pinoHttp } from "pino-http";
import logger from "./logger.js";
import router from "./routes/index.js";

const port = parseInt(process.env.GATEWAY_PORT ?? "3001", 10);

const app = express();
app.use(express.json());
app.use(pinoHttp({ logger }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "pixport-gateway" });
});

app.use("/", router);

app.listen(port, () => {
  logger.info(`PIXPORT gateway listening on port ${port}`);
});

export default app;
