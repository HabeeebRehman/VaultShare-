/**
 * Zero-knowledge encryption layer.
 *
 * All encryption/decryption happens in the browser using the Web Crypto API.
 * The decryption key is generated client-side and is placed in the URL
 * fragment (after #), which browsers NEVER send to the server. The backend
 * therefore only ever stores ciphertext — it physically cannot read secrets.
 *
 * Algorithm: AES-GCM 256-bit. GCM gives us authenticated encryption, so
 * tampering with the ciphertext is detected on decrypt.
 */

const enc = new TextEncoder();
const dec = new TextDecoder();

// TextEncoder.encode() is typed as ArrayBufferLike-backed; copy into a fresh
// ArrayBuffer-backed array to satisfy Web Crypto's BufferSource under strict TS.
function encode(s: string): Uint8Array<ArrayBuffer> {
  const src = enc.encode(s);
  const out = new Uint8Array(new ArrayBuffer(src.length));
  out.set(src);
  return out;
}

// Allocate an ArrayBuffer-backed Uint8Array (not SharedArrayBuffer) so the
// Web Crypto BufferSource types are satisfied under strict TS settings.
function bytes(length: number): Uint8Array<ArrayBuffer> {
  return new Uint8Array(new ArrayBuffer(length));
}

function randomBytes(length: number): Uint8Array<ArrayBuffer> {
  const b = bytes(length);
  crypto.getRandomValues(b);
  return b;
}

function toBase64(arr: Uint8Array): string {
  let bin = "";
  for (const b of arr) bin += String.fromCharCode(b);
  return btoa(bin);
}

function fromBase64(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const arr = bytes(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

// base64url (safe for URL fragments)
function toBase64Url(arr: Uint8Array): string {
  return toBase64(arr).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromBase64Url(s: string): Uint8Array<ArrayBuffer> {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  return fromBase64(b64);
}

async function deriveKeyFromPassword(
  password: string,
  salt: Uint8Array<ArrayBuffer>
): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 150_000, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export interface EncryptResult {
  /** base64 ciphertext to send to the server */
  ciphertext: string;
  /** base64url key material to place in the URL fragment (omitted if password mode) */
  keyFragment: string;
}

/**
 * Encrypt plaintext. If a password is provided, the key is derived from it
 * (PBKDF2) and NOT placed in the URL — the recipient must enter the password.
 * Otherwise a random key is generated and returned for the URL fragment.
 */
export async function encryptSecret(
  plaintext: string,
  password?: string
): Promise<EncryptResult> {
  const iv = randomBytes(12);

  let key: CryptoKey;
  let keyFragment = "";
  let salt = bytes(0);

  if (password && password.length > 0) {
    salt = randomBytes(16);
    key = await deriveKeyFromPassword(password, salt);
  } else {
    key = await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
    const rawKey = new Uint8Array(await crypto.subtle.exportKey("raw", key));
    keyFragment = toBase64Url(rawKey);
  }

  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encode(plaintext))
  );

  // Envelope: iv + salt + ciphertext, all base64, joined by '.'
  const ciphertext = [toBase64(iv), toBase64(salt), toBase64(ct)].join(".");

  return { ciphertext, keyFragment };
}

/**
 * Decrypt. Provide either the keyFragment (from the URL) OR a password,
 * matching how it was encrypted.
 */
export async function decryptSecret(
  ciphertext: string,
  opts: { keyFragment?: string; password?: string }
): Promise<string> {
  const [ivB64, saltB64, ctB64] = ciphertext.split(".");
  const iv = fromBase64(ivB64);
  const salt = fromBase64(saltB64);
  const ct = fromBase64(ctB64);

  let key: CryptoKey;
  if (opts.password && opts.password.length > 0) {
    key = await deriveKeyFromPassword(opts.password, salt);
  } else if (opts.keyFragment) {
    const rawKey = fromBase64Url(opts.keyFragment);
    key = await crypto.subtle.importKey(
      "raw",
      rawKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"]
    );
  } else {
    throw new Error("No key or password provided");
  }

  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return dec.decode(plain);
}
