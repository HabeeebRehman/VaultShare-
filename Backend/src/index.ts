import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { config } from "./lib/config.js";
import { secretsRouter } from "./routes/secrets.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { contactRouter } from "./routes/contact.js";
import { authRouter } from "./routes/auth.js";

const app = express();

app.use(
  cors({
    origin: config.frontendUrl,
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));

// Basic rate limiting protects the create/consume endpoints from abuse.
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120, // per IP per minute; generous enough for the load test demo
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", limiter);

// Health check — also used as the load-test target for raw throughput.
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "vaultshare", time: Date.now() });
});

app.use("/api/secrets", secretsRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/contact", contactRouter);
app.use("/api/auth", authRouter);

app.listen(config.port, () => {
  console.log(`[vaultshare] backend listening on :${config.port}`);
});
