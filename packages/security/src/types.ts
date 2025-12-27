/**
 * Encrypted data structure returned by AES-GCM encryption.
 * All values are base64 encoded.
 */
export interface EncryptedData {
  /** Base64 encoded ciphertext (without auth tag) */
  encryptedValue: string;
  /** Base64 encoded initialization vector (12 bytes) */
  iv: string;
  /** Base64 encoded authentication tag (16 bytes) */
  authTag: string;
}
