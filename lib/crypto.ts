import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits

export interface EncryptedData {
  encryptedValue: string; // Base64
  iv: string; // Base64
  authTag: string; // Base64
}

export class CryptoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CryptoError';
  }
}

function getMasterKey(): Buffer {
  const key = process.env.SHADE_MASTER_KEY;

  if (!key) {
    throw new CryptoError(
      '`SHADE_MASTER_KEY` environment variable is not set. Generate one with: openssl rand -base64 32'
    );
  }

  const buffer = Buffer.from(key, 'base64');

  if (buffer.length !== 32) {
    throw new CryptoError(
      `\`SHADE_MASTER_KEY\` must be exactly 32 bytes (256 bits). Current length: ${buffer.length} bytes. Generate a valid key with: \`openssl rand -base64 32\``
    );
  }

  return buffer;
}

export function encrypt(plaintext: string): EncryptedData {
  const masterKey = getMasterKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, masterKey, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  return {
    encryptedValue: encrypted,
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  };
}

export function decrypt(data: EncryptedData): string {
  const masterKey = getMasterKey();
  const iv = Buffer.from(data.iv, 'base64');
  const authTag = Buffer.from(data.authTag, 'base64');

  if (iv.length !== IV_LENGTH) {
    throw new CryptoError(`Invalid IV length: expected ${IV_LENGTH}, got ${iv.length}`);
  }

  if (authTag.length !== AUTH_TAG_LENGTH) {
    throw new CryptoError(
      `Invalid auth tag length: expected ${AUTH_TAG_LENGTH}, got ${authTag.length}`
    );
  }

  const decipher = createDecipheriv(ALGORITHM, masterKey, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  try {
    let decrypted = decipher.update(data.encryptedValue, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    if (error instanceof Error && error.message.includes('auth')) {
      throw new CryptoError('Decryption failed: authentication tag mismatch');
    }
    throw error;
  }
}

export function validateMasterKey(key: string): boolean {
  try {
    const buffer = Buffer.from(key, 'base64');
    return buffer.length === 32;
  } catch {
    return false;
  }
}
