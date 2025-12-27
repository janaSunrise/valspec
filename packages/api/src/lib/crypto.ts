import { encrypt, decrypt } from "@valspec/security";
import { env } from "@valspec/env/server";

/**
 * Database-friendly field names for encrypted secrets.
 * Uses snake_case to match Prisma schema conventions.
 */
export interface SecretEncryptedFields {
  encrypted_value: string;
  iv: string;
  auth_tag: string;
}

/**
 * Encrypts a secret value for database storage.
 * Uses the VALSPEC_MASTER_KEY from environment.
 *
 * @param value - The secret value to encrypt
 * @returns Database-ready encrypted fields
 */
export async function encryptSecret(value: string): Promise<SecretEncryptedFields> {
  const encrypted = await encrypt(value, env.VALSPEC_MASTER_KEY);
  return {
    encrypted_value: encrypted.encryptedValue,
    iv: encrypted.iv,
    auth_tag: encrypted.authTag,
  };
}

/**
 * Decrypts a secret from database fields.
 * Uses the VALSPEC_MASTER_KEY from environment.
 *
 * @param fields - Database fields with encrypted data
 * @returns Decrypted secret value
 */
export async function decryptSecret(fields: SecretEncryptedFields): Promise<string> {
  return decrypt(
    {
      encryptedValue: fields.encrypted_value,
      iv: fields.iv,
      authTag: fields.auth_tag,
    },
    env.VALSPEC_MASTER_KEY,
  );
}
