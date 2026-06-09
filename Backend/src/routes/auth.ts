import { Router, type Response } from "express";
import { sendWelcomeEmail } from "../lib/email.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

export const authRouter = Router();

/**
 * POST /api/auth/welcome  (Mandate 3 trigger A)
 * Called by the frontend right after a successful sign-up. Sends the
 * welcome email to the authenticated user. Protected so only a real,
 * logged-in user can trigger it for their own address.
 */
authRouter.post("/welcome", requireAuth, async (req: AuthedRequest, res: Response) => {
  if (req.user?.email) {
    void sendWelcomeEmail(req.user.email);
  }
  res.json({ ok: true });
});
