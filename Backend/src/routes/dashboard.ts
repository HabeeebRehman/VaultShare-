import { Router, type Response } from "express";
import { supabase } from "../lib/supabase.js";
import { secretExists } from "../lib/redis.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

export const dashboardRouter = Router();

/**
 * GET /api/dashboard/secrets  (PROTECTED — Mandate 1 proof)
 * Returns the logged-in user's secret metadata. Reconciles status with
 * Redis so expired secrets show as "expired" even if not yet viewed.
 */
dashboardRouter.get("/secrets", requireAuth, async (req: AuthedRequest, res: Response) => {
  const { data, error } = await supabase
    .from("secrets_metadata")
    .select("*")
    .eq("owner_id", req.user!.id)
    .order("created_at", { ascending: false });

  if (error) {
    res.status(500).json({ error: "Could not load secrets" });
    return;
  }

  // Reconcile: if metadata says active but Redis key is gone, it expired.
  const reconciled = await Promise.all(
    (data ?? []).map(async (row) => {
      if (row.status === "active") {
        const live = await secretExists(row.secret_id);
        if (!live) return { ...row, status: "expired" };
      }
      return row;
    })
  );

  res.json({ secrets: reconciled });
});
