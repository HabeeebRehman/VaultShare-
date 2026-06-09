import { Resend } from "resend";
import { config } from "./config.js";

const resend = config.resendApiKey ? new Resend(config.resendApiKey) : null;

interface SendArgs {
  to: string;
  subject: string;
  html: string;
}

/**
 * Send an email via Resend. If no API key is configured (e.g. local dev),
 * it logs the email instead of failing — so the app stays usable.
 */
export async function sendEmail({ to, subject, html }: SendArgs): Promise<void> {
  if (!resend) {
    console.log(`[email:dev] To: ${to} | Subject: ${subject}`);
    return;
  }
  try {
    await resend.emails.send({ from: config.emailFrom, to, subject, html });
    console.log(`[email] sent "${subject}" to ${to}`);
  } catch (err) {
    console.error("[email] send failed:", err);
  }
}

const wrap = (title: string, body: string) => `
  <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; color: #1a1a1a;">
    <div style="font-size: 20px; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 16px;">
      🔒 VaultShare
    </div>
    <h1 style="font-size: 18px; margin: 0 0 12px;">${title}</h1>
    <div style="font-size: 14px; line-height: 1.6; color: #444;">${body}</div>
    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
    <div style="font-size: 12px; color: #999;">
      VaultShare — secrets that self-destruct. We never see your data.
    </div>
  </div>
`;

/** Triggered when a user signs up (welcome email — Mandate 3 trigger A). */
export async function sendWelcomeEmail(to: string): Promise<void> {
  await sendEmail({
    to,
    subject: "Welcome to VaultShare",
    html: wrap(
      "You're in.",
      `Your account is ready. You can now create end-to-end encrypted secrets
       that self-destruct after they're viewed. The encryption happens in your
       browser — <strong>even we can't read what you share.</strong>`
    ),
  });
}

/** Triggered when someone views a creator's secret (Mandate 3 trigger B). */
export async function sendSecretViewedEmail(
  to: string,
  label: string,
  when: Date
): Promise<void> {
  await sendEmail({
    to,
    subject: "Your secret was accessed",
    html: wrap(
      "Your secret was just viewed",
      `The secret <strong>"${label}"</strong> was accessed on
       ${when.toUTCString()}. It has now self-destructed and can no longer be
       opened. If this wasn't expected, consider rotating the credential you shared.`
    ),
  });
}

/** Confirmation that a contact submission was received. */
export async function sendContactAck(to: string): Promise<void> {
  await sendEmail({
    to,
    subject: "We received your message",
    html: wrap(
      "Thanks for reaching out",
      `We've received your message and will get back to you soon.`
    ),
  });
}

/** Internal notification to the team inbox for a new contact submission. */
export async function sendContactNotification(
  fromEmail: string,
  name: string,
  message: string
): Promise<void> {
  await sendEmail({
    to: config.contactInbox,
    subject: `New contact submission from ${name}`,
    html: wrap(
      "New contact form submission",
      `<strong>From:</strong> ${name} (${fromEmail})<br/><br/>
       <strong>Message:</strong><br/>${message.replace(/\n/g, "<br/>")}`
    ),
  });
}
