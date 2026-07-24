/**
 * Crypto primitives — security-critical, so tested directly. Covers password
 * hashing round-trips + rejection, secret encryption round-trips + tamper
 * rejection, and token/hash properties.
 */
import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  encryptSecret,
  decryptSecret,
  randomToken,
  sha256,
} from './crypto.util';

describe('passwords', () => {
  it('verifies a correct password and rejects a wrong one', () => {
    const hash = hashPassword('correct horse battery staple');
    expect(verifyPassword('correct horse battery staple', hash)).toBe(true);
    expect(verifyPassword('wrong password', hash)).toBe(false);
  });

  it('salts: the same password hashes differently each time', () => {
    expect(hashPassword('same')).not.toBe(hashPassword('same'));
  });

  it('rejects a malformed stored hash instead of throwing', () => {
    expect(verifyPassword('x', 'not-a-valid-hash')).toBe(false);
    expect(verifyPassword('x', '')).toBe(false);
  });
});

describe('secret encryption', () => {
  const key = 'a-test-app-secret-value';

  it('round-trips a secret', () => {
    const enc = encryptSecret('JBSWY3DPEHPK3PXP', key);
    expect(enc).not.toContain('JBSWY3DPEHPK3PXP');
    expect(decryptSecret(enc, key)).toBe('JBSWY3DPEHPK3PXP');
  });

  it('fails to decrypt with the wrong key (authenticated encryption)', () => {
    const enc = encryptSecret('topsecret', key);
    expect(() => decryptSecret(enc, 'different-key')).toThrow();
  });

  it('fails to decrypt if the ciphertext is tampered with', () => {
    const enc = encryptSecret('topsecret', key);
    const tampered = enc.slice(0, -2) + (enc.endsWith('00') ? '11' : '00');
    expect(() => decryptSecret(tampered, key)).toThrow();
  });
});

describe('tokens & hashing', () => {
  it('randomToken is URL-safe and unique', () => {
    const a = randomToken();
    const b = randomToken();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('sha256 is stable and hex', () => {
    expect(sha256('abc')).toBe(sha256('abc'));
    expect(sha256('abc')).toMatch(/^[0-9a-f]{64}$/);
    expect(sha256('abc')).not.toBe(sha256('abd'));
  });
});
