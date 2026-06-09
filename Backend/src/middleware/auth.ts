import type { Request, Response, NextFunction } from "express";
import { supabase } from "../lib/supabase.js";

export interface AuthedRequest extends Request {
  user?: { id: string; email: string };
}

/**
 * Verifies the Bearer token sent by the frontend (a Supabase access token).
 * We ask Supabase to resolve the token to a user; if it fails, 401.
 * This is what makes a route "inaccessible without auth" (Mandate 1).
 */
export async function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const token = header.slice("Bearer ".length);

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      res.status(401).json({ error: "Invalid or expired session" });
      return;
    }
    req.user = {
      id: data.user.id,
      email: data.user.email ?? "",
    };
    next();
  } catch {
    res.status(401).json({ error: "Authentication failed" });
  }
}

/**
 * Optional auth: attaches the user if a valid token is present, but never
 * blocks the request. Used on secret-create so anonymous users can still
 * share, while logged-in users get their secret tracked on the dashboard.
 */
export async function optionalAuth(
  req: AuthedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    const token = header.slice("Bearer ".length);
    try {
      const { data } = await supabase.auth.getUser(token);
      if (data.user) {
        req.user = { id: data.user.id, email: data.user.email ?? "" };
      }
    } catch {
      // ignore — treat as anonymous
    }
  }
  next();
}
