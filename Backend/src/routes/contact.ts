import { Router } from "express";
import { z } from "zod";
import { supabase } from "../lib/supabase.js";
import { sendContactAck, sendContactNotification } from "../lib/email.js";

export const contactRouter = Router();

const contactSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  message: z.string().min(1).max(5000),
});

/**
 * POST /api/contact  (Mandate 2 + Mandate 3)
 * Persists the submission to the DB AND sends two emails:
 *  - acknowledgement to the sender
 *  - notification to the team inbox
 * Returns a confirmation the frontend can show as a toast.
 */
contactRouter.post("/", async (req, res) => {
  const parsed = contactSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid submission", details: parsed.error.flatten() });
    return;
  }

  const { name, email, message } = parsed.data;

  const { data, error } = await supabase
    .from("contact_submissions")
    .insert({ name, email, message })
    .select("id")
    .single();

  if (error) {
    res.status(500).json({ error: "Could not save your message" });
    return;
  }

  // Fire-and-forget emails so the user gets a fast confirmation.
  void sendContactAck(email);
  void sendContactNotification(email, name, message);

  res.status(201).json({ ok: true, id: data.id, message: "Message received" });
});
