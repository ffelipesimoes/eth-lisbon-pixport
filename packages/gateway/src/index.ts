import express from "express";
import router from "./routes/index.js";

const port = parseInt(process.env.GATEWAY_PORT ?? "3001", 10);

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "pixport-gateway" });
});

app.use("/", router);

app.listen(port, () => {
  console.log(`PIXPORT gateway listening on port ${port}`);
});

export default app;
