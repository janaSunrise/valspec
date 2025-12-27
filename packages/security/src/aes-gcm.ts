import type { EncryptedData } from "./types";

const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 128;

export class CryptoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CryptoError";
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
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

let cachedMasterKey: CryptoKey | null = null;
let cachedKeyString: string | null = null;

async function getMasterKey(masterKeyBase64: string): Promise<CryptoKey> {
  // Return cached key if the key string hasn't changed
  if (cachedMasterKey && cachedKeyString === masterKeyBase64) {
    return cachedMasterKey;
  }

  const keyBytes = base64ToUint8Array(masterKeyBase64);
  if (keyBytes.length !== 32) {
    throw new CryptoError(
      `Master key must be 32 bytes. Got ${keyBytes.length}. Generate with: openssl rand -base64 32`,
    );
  }

  cachedMasterKey = await crypto.subtle.importKey(
    "raw",
    keyBytes.buffer as ArrayBuffer,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
  cachedKeyString = masterKeyBase64;

  return cachedMasterKey;
}

/**
 * Encrypts a plaintext string using AES-GCM.
 *
 * @param plaintext - The string to encrypt
 * @param masterKeyBase64 - Base64 encoded 32-byte master key
 * @returns Encrypted data with ciphertext, IV, and auth tag (all base64 encoded)
 */
export async function encrypt(plaintext: string, masterKeyBase64: string): Promise<EncryptedData> {
  const masterKey = await getMasterKey(masterKeyBase64);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv.buffer as ArrayBuffer, tagLength: AUTH_TAG_LENGTH },
    masterKey,
    data.buffer as ArrayBuffer,
  );

  const encryptedBytes = new Uint8Array(encrypted);
  // AES-GCM appends the auth tag to the ciphertext
  const ciphertext = encryptedBytes.slice(0, -16);
  const authTag = encryptedBytes.slice(-16);

  return {
    encryptedValue: uint8ArrayToBase64(ciphertext),
    iv: uint8ArrayToBase64(iv),
    authTag: uint8ArrayToBase64(authTag),
  };
}

/**
 * Decrypts AES-GCM encrypted data.
 *
 * @param data - Encrypted data with ciphertext, IV, and auth tag
 * @param masterKeyBase64 - Base64 encoded 32-byte master key
 * @returns Decrypted plaintext string
 * @throws CryptoError if decryption fails (auth tag mismatch)
 */
export async function decrypt(data: EncryptedData, masterKeyBase64: string): Promise<string> {
  const masterKey = await getMasterKey(masterKeyBase64);
  const iv = base64ToUint8Array(data.iv);
  const authTag = base64ToUint8Array(data.authTag);
  const ciphertext = base64ToUint8Array(data.encryptedValue);

  if (iv.length !== IV_LENGTH) {
    throw new CryptoError(`Invalid IV length: expected ${IV_LENGTH}, got ${iv.length}`);
  }

  if (authTag.length !== 16) {
    throw new CryptoError(`Invalid auth tag length: expected 16, got ${authTag.length}`);
  }

  // Reconstruct the encrypted data with auth tag appended
  const encryptedWithTag = new Uint8Array(ciphertext.length + authTag.length);
  encryptedWithTag.set(ciphertext);
  encryptedWithTag.set(authTag, ciphertext.length);

  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv.buffer as ArrayBuffer, tagLength: AUTH_TAG_LENGTH },
      masterKey,
      encryptedWithTag.buffer as ArrayBuffer,
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch {
    throw new CryptoError("Decryption failed: authentication tag mismatch");
  }
}

/**
 * Validates that a master key is properly formatted.
 *
 * @param key - Base64 encoded key to validate
 * @returns true if key is valid (32 bytes when decoded)
 */
export function validateMasterKey(key: string): boolean {
  try {
    const bytes = base64ToUint8Array(key);
    return bytes.length === 32;
  } catch {
    return false;
  }
}
