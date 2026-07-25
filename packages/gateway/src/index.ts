import express from "express";
import { pinoHttp } from "pino-http";
import logger from "./logger.js";
import router from "./routes/index.js";

const port = parseInt(process.env.GATEWAY_PORT ?? "3001", 10);

const app = express();
app.use(express.json());

app.use(
  pinoHttp({
    logger,
    customSuccessMessage: (req, res, responseTime) =>
      `${req.method} ${req.url} ${res.statusCode} (${Math.round(responseTime)}ms)`,
    customErrorMessage: (req, res, error) =>
      `${req.method} ${req.url} ${res.statusCode} - ${error.message}`,
    serializers: {
      req: (req) => ({ method: req.method, url: req.url }),
      res: (res) => ({ statusCode: res.statusCode }),
    },
  })
);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "pixport-gateway" });
});

app.use("/", router);

if (!process.env.VERCEL) {
  app.listen(port, () => {
    logger.info(`PIXPORT gateway listening on port ${port}`);
  });
}

export default app;
