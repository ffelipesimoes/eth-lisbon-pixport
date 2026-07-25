import express from "express";
import { pinoHttp } from "pino-http";
import logger from "./logger.js";
import router from "./routes/index.js";

const port = parseInt(process.env.GATEWAY_PORT ?? "3001", 10);

const app = express();
app.use(express.json({ limit: "1mb" }));

// Security headers middleware
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

app.use(
  pinoHttp({
    logger: logger as any,
    customSuccessMessage: (req: any, res: any, responseTime: number) =>
      `${req.method} ${req.url} ${res.statusCode} (${Math.round(responseTime)}ms)`,
    customErrorMessage: (req: any, res: any, error: Error) =>
      `${req.method} ${req.url} ${res.statusCode} - ${error.message}`,
    serializers: {
      req: (req: any) => ({ method: req.method, url: req.url }),
      res: (res: any) => ({ statusCode: res.statusCode }),
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
