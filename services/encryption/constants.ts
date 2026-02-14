/**
 * End-to-End Encryption Constants
 *
 * Based on military-grade security standards:
 * - AES-256-GCM for document encryption
 * - RSA-4096 for key wrapping (Web Crypto uses RSA-OAEP with SHA-256)
 * - Argon2id for key derivation
 */

export const ENCRYPTION_CONFIG = {
  // AES-256-GCM Configuration
  AES: {
    ALGORITHM: 'AES-GCM' as const,
    KEY_SIZE: 256, // bits
    IV_SIZE: 12, // 96 bits (12 bytes) - recommended for GCM
    TAG_SIZE: 128, // bits (16 bytes) - authentication tag
  },

  // RSA-OAEP Configuration (Key Wrapping)
  RSA: {
    ALGORITHM: 'RSA-OAEP' as const,
    MODULUS_LENGTH: 4096, // bits
    HASH: 'SHA-256' as const,
    PUBLIC_EXPONENT: new Uint8Array([0x01, 0x00, 0x01]), // 65537
  },

  // Argon2id Configuration (Key Derivation)
  ARGON2: {
    ALGORITHM: 'argon2id' as const,
    MEMORY: 64 * 1024, // 64 MB (in KB)
    ITERATIONS: 3,
    PARALLELISM: 4,
    SALT_SIZE: 16, // 128 bits (16 bytes)
    OUTPUT_SIZE: 32, // 256 bits (32 bytes)
  },

  // Recovery Phrase (BIP-39)
  RECOVERY: {
    MNEMONIC_STRENGTH: 256, // 24 words
    PBKDF2_ITERATIONS: 2048,
  },

  // Encryption Version (for future migrations)
  VERSION: '1.0' as const,
} as const;

export const STORAGE_KEYS = {
  // IndexedDB stores (for encrypted keys)
  DB_NAME: 'seafarer_secure_storage',
  DB_VERSION: 1,
  STORE_NAME: 'encryption_keys',

  // localStorage keys (metadata only, never keys!)
  PUBLIC_KEY_ID: 'seafarer_public_key_id',
  SALT: 'seafarer_key_salt',
  ENCRYPTION_VERSION: 'seafarer_encryption_version',
  KEY_INITIALIZED: 'seafarer_keys_initialized',

  // Session storage (cleared on tab close)
  SESSION_MASTER_KEY: 'seafarer_session_master_key',
  SESSION_UNLOCKED: 'seafarer_session_unlocked',
} as const;

export const ENCRYPTION_ERRORS = {
  NO_CRYPTO_SUPPORT: 'Browser does not support Web Crypto API',
  NO_INDEXEDDB_SUPPORT: 'Browser does not support IndexedDB',
  KEYS_NOT_INITIALIZED: 'Encryption keys not initialized. Please set up encryption first.',
  DECRYPTION_FAILED: 'Failed to decrypt document. Key may be incorrect or document corrupted.',
  ENCRYPTION_FAILED: 'Failed to encrypt document.',
  INVALID_RECOVERY_PHRASE: 'Invalid recovery phrase. Please check and try again.',
  KEY_UNWRAP_FAILED: 'Failed to unwrap document encryption key.',
  CORRUPTED_DATA: 'Document data is corrupted or tampered with.',
  WEAK_PASSWORD: 'Password too weak. Use at least 12 characters with mixed case, numbers, and symbols.',
} as const;

/**
 * Document Encryption Bundle Structure
 *
 * This is what gets stored in Supabase Storage after encryption
 */
export interface EncryptedDocumentBundle {
  version: string; // Encryption version (e.g., "1.0")
  ciphertext: string; // Base64-encoded encrypted document
  wrappedDEK: string; // Base64-encoded wrapped Document Encryption Key
  iv: string; // Base64-encoded initialization vector (96-bit)
  authTag: string; // Base64-encoded authentication tag (128-bit)
  encryptedMetadata: {
    hash: string; // SHA-256 hash of original document (for integrity)
    originalSize: number; // Original file size in bytes
    mimeType: string; // Original MIME type
    timestamp: string; // ISO 8601 timestamp
  };
}

/**
 * User Key Pair Structure
 *
 * Stored in IndexedDB (encrypted private key) and localStorage (public key ID)
 */
export interface UserKeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
  publicKeyJWK: JsonWebKey; // For storage
  encryptedPrivateKeyJWK: string; // Encrypted with master key
}

/**
 * Master Key Derivation Input
 */
export interface KeyDerivationInput {
  password: string; // User password/PIN
  salt: Uint8Array; // Random salt (unique per user)
}

/**
 * Recovery Kit (for account recovery)
 */
export interface RecoveryKit {
  mnemonic: string; // 24-word BIP-39 phrase
  salt: string; // Base64-encoded salt
  publicKeyJWK: JsonWebKey; // Public key for verification
  timestamp: string; // ISO 8601 creation timestamp
}
