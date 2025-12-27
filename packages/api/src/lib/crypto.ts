import { encrypt, decrypt } from "@valspec/security";
import { env } from "@valspec/env/server";

export interface SecretEncryptedFields {
  encryptedValue: string;
  iv: string;
  authTag: string;
}

/**
 * Encrypts a secret value for database storage.
 * Uses the VALSPEC_MASTER_KEY from environment.
 */
export async function encryptSecret(value: string): Promise<SecretEncryptedFields> {
  const encrypted = await encrypt(value, env.VALSPEC_MASTER_KEY);
  return {
    encryptedValue: encrypted.encryptedValue,
    iv: encrypted.iv,
    authTag: encrypted.authTag,
  };
}

/**
 * Decrypts a secret from database fields.
 * Uses the VALSPEC_MASTER_KEY from environment.
 */
export async function decryptSecret(fields: SecretEncryptedFields): Promise<string> {
  return decrypt(
    {
      encryptedValue: fields.encryptedValue,
      iv: fields.iv,
      authTag: fields.authTag,
    },
    env.VALSPEC_MASTER_KEY,
  );
}
