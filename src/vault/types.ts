export interface Secret {
  name: string;
  value: string;
  description: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface SecretMetadata {
  name: string;
  description: string;
  tags: string[];
}

export interface VaultData {
  secrets: Secret[];
}

export interface EncryptedPayload {
  salt: Buffer;
  iv: Buffer;
  authTag: Buffer;
  encrypted: Buffer;
}

export const SECRET_NAME_REGEX = /^[A-Z][A-Z0-9_]*$/;

export function isValidSecretName(name: string): boolean {
  return SECRET_NAME_REGEX.test(name);
}
