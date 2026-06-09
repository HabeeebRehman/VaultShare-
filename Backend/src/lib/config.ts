import dotenv from "dotenv";

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    // In dev we warn rather than crash, so the app still boots for partial setups.
    console.warn(`[config] Missing env var: ${name}`);
    return "";
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  frontendUrl: required("FRONTEND_URL", "http://localhost:5173"),

  redisUrl: required("REDIS_URL", "redis://localhost:6379"),

  supabaseUrl: required("SUPABASE_URL"),
  supabaseServiceKey: required("SUPABASE_SERVICE_KEY"),
  supabaseJwtSecret: required("SUPABASE_JWT_SECRET"),

  resendApiKey: required("RESEND_API_KEY"),
  emailFrom: required("EMAIL_FROM", "VaultShare <onboarding@resend.dev>"),
  contactInbox: required("CONTACT_INBOX"),
} as const;
