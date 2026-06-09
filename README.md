# VaultShare

Zero-knowledge, self-destructing secret sharing. Encrypt passwords, API keys,
and private notes **in your browser** — the server only ever stores ciphertext.
Secrets open once, then vanish forever.

> **The pitch:** Even we can't read your secrets. The decryption key lives in
> the URL fragment (`#...`), which browsers never transmit to the server.

---

## Architecture

```
┌─────────────┐   ciphertext only    ┌──────────────┐    TTL / GETDEL   ┌────────┐
│   Browser   │ ───────────────────► │  Express API │ ────────────────► │ Redis  │
│ (Web Crypto)│   key stays in URL # │  (TypeScript)│   self-destruct   └────────┘
└─────────────┘                      └──────┬───────┘
      │                                     │ metadata only (no secrets)
      │ Supabase Auth (JWT)                 ▼
      │                              ┌──────────────┐
      └────────────────────────────►│   Supabase   │  + Resend (email)
                                     │  (Postgres)  │
                                     └──────────────┘
```

- **Frontend:** React + TypeScript + Vite. AES-GCM 256 via the Web Crypto API.
- **Backend:** Express + TypeScript. Stores ciphertext in Redis with a TTL.
- **Auth:** Supabase (email/password + Google OAuth).
- **Email:** Resend (welcome, secret-viewed, contact ack/notify).
- **DB:** Supabase Postgres — secret *metadata* and contact submissions only.

## The 6 mandates — where they live

1. **Authentication** — `src/context/AuthContext.tsx`, `ProtectedRoute` in `components/ui.tsx`, backend `middleware/auth.ts`. `/dashboard` is inaccessible without a valid session.
2. **Contact page** — `pages/ContactPage.tsx` → `routes/contact.ts` (saves to DB + emails).
3. **Automated email** — `lib/email.ts`: welcome on signup, "secret viewed" notification, contact acknowledgement.
4. **Load handling** — `backend/loadtest/script.js` (k6, ramps to 1,200 VUs).
5. **Open source repo** — this repo + labelled issues (see `.github/`).
6. **Cross-team PR** — track in your team log.

---

## Local setup

### Prerequisites
- Node 18+
- A Redis instance (local, or free [Upstash](https://upstash.com))
- A [Supabase](https://supabase.com) project
- A [Resend](https://resend.com) API key

### 1. Database
Run `backend/schema.sql` in the Supabase SQL editor.

In Supabase **Auth → Providers**, enable Email and (optionally) Google.
For the easiest demo, disable "Confirm email" so signups get a session instantly.

### 2. Backend
```bash
cd backend
cp .env.example .env   # fill in Redis, Supabase, Resend values
npm install
npm run dev            # http://localhost:4000
```

### 3. Frontend
```bash
cd frontend
cp .env.example .env   # fill in Supabase URL/anon key + API URL
npm install
npm run dev            # http://localhost:5173
```

### 4. Load test (Mandate 4)
Install [k6](https://k6.io/docs/get-started/installation/), then:
```bash
cd backend
BASE_URL=http://localhost:4000 k6 run loadtest/script.js
```
Screenshot the summary for the demo.

---

## Demo script (hit all 6 mandates in order)

1. **Auth** — sign up live, then visit `/dashboard` in an incognito window to show it redirects to login.
2. **Core product** — create a secret, open the link, copy it, refresh → "this secret is gone."
3. **Email** — show the "your secret was accessed" email in your inbox.
4. **Contact** — submit the form, show the confirmation + DB row + email.
5. **Load** — show the k6 report (>1,000 VUs).
6. **Open source / cross-team** — show your Issues tab and the merged cross-team PR.

## Security notes
- The server never receives plaintext or keys. Encryption is client-side.
- One-time read uses Redis `GETDEL` (atomic) so a secret can't be read twice.
- Password-protected secrets derive the key via PBKDF2 (150k iterations) and
  keep nothing in the URL.
- Metadata stored for logged-in users contains no secret content.
