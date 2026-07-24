/**
 * Low-level crypto primitives, using ONLY Node's built-in `crypto` — no native
 * addons to compile, no third-party hashing library to trust.
 *
 *  - Passwords: scrypt (memory-hard KDF) with a per-password random salt.
 *  - Secrets at rest (e.g. TOTP seeds): AES-256-GCM, key derived from AUTH_SECRET.
 *  - Tokens: cryptographically random, URL-safe strings for sessions/reset links.
 *
 * Constant-time comparison is used everywhere a secret is checked, to avoid
 * timing side-channels (Architecture §6).
 */
import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createCipheriv,
  createDecipheriv,
  createHash,
} from 'node:crypto';

const SCRYPT_KEYLEN = 64;

/** Hash a password. Format: `scrypt$<saltHex>$<hashHex>` (self-describing). */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, SCRYPT_KEYLEN);
  return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`;
}

/** Verify a password against a stored hash in constant time. */
export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltHex, hashHex] = stored.split('$');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
  const derived = scryptSync(password, Buffer.from(saltHex, 'hex'), SCRYPT_KEYLEN);
  const expected = Buffer.from(hashHex, 'hex');
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

/** Random URL-safe token (default 32 bytes) for sessions, reset links, etc. */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/** Stable SHA-256 hash (hex) — used to store lookup tokens without the plaintext. */
export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/** Derive a 32-byte AES key from the app secret. */
function keyFromSecret(secret: string): Buffer {
  return scryptSync(secret, 'aicreatorhub.enc.v1', 32);
}

/** Encrypt a secret string for storage. Output: `<ivHex>:<tagHex>:<cipherHex>`. */
export function encryptSecret(plaintext: string, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyFromSecret(secret), iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
}

/** Decrypt a value produced by encryptSecret. */
export function decryptSecret(payload: string, secret: string): string {
  const [ivHex, tagHex, dataHex] = payload.split(':');
  if (!ivHex || !tagHex || !dataHex) throw new Error('Malformed encrypted payload');
  const decipher = createDecipheriv(
    'aes-256-gcm',
    keyFromSecret(secret),
    Buffer.from(ivHex, 'hex'),
  );
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]).toString(
    'utf8',
  );
}
