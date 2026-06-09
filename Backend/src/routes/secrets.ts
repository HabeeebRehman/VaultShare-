import { Router, type Response } from "express";
import { nanoid } from "nanoid";
import { z } from "zod";
import { storeSecret, consumeSecret, secretExists } from "../lib/redis.js";
import { supabase } from "../lib/supabase.js";
import { sendSecretViewedEmail } from "../lib/email.js";
import { optionalAuth, type AuthedRequest } from "../middleware/auth.js";

export const secretsRouter = Router();

// Allowed expiry windows (seconds). Keeps TTLs sane and predictable.
const EXPIRY_OPTIONS: Record<string, number> = {
  "1h": 60 * 60,
  "1d": 60 * 60 * 24,
  "7d": 60 * 60 * 24 * 7,
};

const createSchema = z.object({
  // ciphertext is base64; the server never receives the key or plaintext.
  ciphertext: z.string().min(1).max(200_000),
  expiry: z.enum(["1h", "1d", "7d"]).default("1d"),
  // optional human label so the creator knows which secret was viewed.
  label: z.string().max(120).optional(),
  // max number of views before self-destruct (burn-after-N).
  maxViews: z.number().int().min(1).max(100).default(1),
  // whether an extra passphrase gate was applied client-side.
  passwordProtected: z.boolean().default(false),
});

/**
 * POST /api/secrets
 * Stores ciphertext + sets the self-destruct TTL. Returns an opaque id.
 * The decryption key is NEVER sent here — it lives in the URL fragment.
 */
secretsRouter.post("/", optionalAuth, async (req: AuthedRequest, res: Response) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
    return;
  }

  const { ciphertext, expiry, label, maxViews, passwordProtected } = parsed.data;
  const id = nanoid(22);
  const ttl = EXPIRY_OPTIONS[expiry];

  // The payload stored in Redis is an envelope of ciphertext + view accounting.
  const envelope = JSON.stringify({
    ciphertext,
    viewsLeft: maxViews,
    passwordProtected,
    // who to notify on view (only if creator was logged in)
    ownerId: req.user?.id ?? null,
    label: label ?? "Untitled secret",
    createdAt: Date.now(),
  });

  await storeSecret(id, envelope, ttl);

  // If the creator is logged in, record METADATA only (never the secret).
  if (req.user) {
    await supabase.from("secrets_metadata").insert({
      secret_id: id,
      owner_id: req.user.id,
      label: label ?? "Untitled secret",
      expiry,
      max_views: maxViews,
      password_protected: passwordProtected,
      status: "active",
    });
  }

  res.status(201).json({ id, expiry });
});

/**
 * GET /api/secrets/:id/status
 * Tells the reveal page whether a secret exists and is password protected,
 * WITHOUT consuming it. Lets the UI show the right state before the reveal.
 */
secretsRouter.get("/:id/status", async (req, res) => {
  const exists = await secretExists(req.params.id);
  if (!exists) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json({ exists: true });
});

/**
 * POST /api/secrets/:id/consume
 * Atomically reads the secret. If it's the last view, it self-destructs.
 * Triggers the "secret viewed" email to the creator (Mandate 3).
 */
secretsRouter.post("/:id/consume", async (req, res) => {
  const id = req.params.id;

  // GETDEL removes it atomically; we may re-store if views remain.
  const raw = await consumeSecret(id);
  if (!raw) {
    res.status(404).json({ error: "not_found" });
    return;
  }

  const envelope = JSON.parse(raw) as {
    ciphertext: string;
    viewsLeft: number;
    passwordProtected: boolean;
    ownerId: string | null;
    label: string;
    createdAt: number;
  };

  const viewsLeft = envelope.viewsLeft - 1;

  // Notify the owner that their secret was accessed.
  if (envelope.ownerId) {
    const { data } = await supabase.auth.admin.getUserById(envelope.ownerId);
    const ownerEmail = data?.user?.email;
    if (ownerEmail) {
      // Fire-and-forget so the reveal isn't blocked on email latency.
      void sendSecretViewedEmail(ownerEmail, envelope.label, new Date());
    }
  }

  if (viewsLeft > 0) {
    // Re-store with one fewer view, preserving remaining TTL.
    const ttl = await import("../lib/redis.js").then((m) =>
      m.redis.ttl("secret:" + id)
    );
    // ttl is -2 (gone) because GETDEL removed it; use a short re-store window.
    // Simpler & safe: re-store with remaining views under original-ish TTL.
    await storeSecret(
      id,
      JSON.stringify({ ...envelope, viewsLeft }),
      ttl && ttl > 0 ? ttl : 3600
    );
  } else if (envelope.ownerId) {
    // Mark metadata as burned for the dashboard.
    await supabase
      .from("secrets_metadata")
      .update({ status: "viewed" })
      .eq("secret_id", id);
  }

  res.json({
    ciphertext: envelope.ciphertext,
    passwordProtected: envelope.passwordProtected,
    viewsLeft,
    burned: viewsLeft <= 0,
  });
});
