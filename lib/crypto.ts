const IV_LENGTH = 12; // 96 bits for GCM
const AUTH_TAG_LENGTH = 128; // 128 bits (in bits for Web Crypto)

export interface EncryptedData {
  encryptedValue: string;
  iv: string;
  authTag: string;
}

export class CryptoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CryptoError';
  }
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function getMasterKey(): Promise<CryptoKey> {
  const key = process.env.SHADE_MASTER_KEY;

  if (!key) {
    throw new CryptoError(
      '`SHADE_MASTER_KEY` environment variable is not set. Generate one with: openssl rand -base64 32'
    );
  }

  const keyBytes = base64ToUint8Array(key);

  if (keyBytes.length !== 32) {
    throw new CryptoError(
      `\`SHADE_MASTER_KEY\` must be exactly 32 bytes (256 bits). Current length: ${keyBytes.length} bytes. Generate a valid key with: \`openssl rand -base64 32\``
    );
  }

  return crypto.subtle.importKey(
    'raw',
    keyBytes.buffer as ArrayBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encrypt(plaintext: string): Promise<EncryptedData> {
  const masterKey = await getMasterKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer, tagLength: AUTH_TAG_LENGTH },
    masterKey,
    data.buffer as ArrayBuffer
  );

  // Web Crypto API appends auth tag to ciphertext
  const encryptedBytes = new Uint8Array(encrypted);
  const ciphertext = encryptedBytes.slice(0, -16);
  const authTag = encryptedBytes.slice(-16);

  return {
    encryptedValue: uint8ArrayToBase64(ciphertext),
    iv: uint8ArrayToBase64(iv),
    authTag: uint8ArrayToBase64(authTag),
  };
}

export async function decrypt(data: EncryptedData): Promise<string> {
  const masterKey = await getMasterKey();
  const iv = base64ToUint8Array(data.iv);
  const authTag = base64ToUint8Array(data.authTag);
  const ciphertext = base64ToUint8Array(data.encryptedValue);

  if (iv.length !== IV_LENGTH) {
    throw new CryptoError(`Invalid IV length: expected ${IV_LENGTH}, got ${iv.length}`);
  }

  if (authTag.length !== 16) {
    throw new CryptoError(`Invalid auth tag length: expected 16, got ${authTag.length}`);
  }

  // Web Crypto API expects auth tag appended to ciphertext
  const encryptedWithTag = new Uint8Array(ciphertext.length + authTag.length);
  encryptedWithTag.set(ciphertext);
  encryptedWithTag.set(authTag, ciphertext.length);

  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer, tagLength: AUTH_TAG_LENGTH },
      masterKey,
      encryptedWithTag.buffer as ArrayBuffer
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch {
    throw new CryptoError('Decryption failed: authentication tag mismatch');
  }
}

export function validateMasterKey(key: string): boolean {
  try {
    const bytes = base64ToUint8Array(key);
    return bytes.length === 32;
  } catch {
    return false;
  }
}
