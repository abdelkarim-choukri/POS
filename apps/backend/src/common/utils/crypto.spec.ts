import { encrypt, decrypt } from './crypto';

describe('crypto utils', () => {
  beforeAll(() => {
    process.env.CREDENTIAL_ENCRYPTION_KEY = 'a'.repeat(64);
  });

  it('encrypt produces a 3-part colon-separated string', () => {
    const result = encrypt('hello');
    expect(result.split(':').length).toBe(3);
  });

  it('decrypt recovers the original plaintext', () => {
    const plaintext = JSON.stringify({ api_key: 'secret123' });
    expect(decrypt(encrypt(plaintext))).toBe(plaintext);
  });

  it('decrypt falls back on non-envelope input', () => {
    expect(decrypt('not-encrypted')).toBe('not-encrypted');
  });

  it('throws when a valid envelope has a tampered payload', () => {
    const envelope = encrypt('sensitive');
    const parts = envelope.split(':');
    // Flip one byte in the ciphertext part
    const buf = Buffer.from(parts[2], 'base64');
    buf[0] ^= 0xff;
    parts[2] = buf.toString('base64');
    expect(() => decrypt(parts.join(':'))).toThrow();
  });
});
