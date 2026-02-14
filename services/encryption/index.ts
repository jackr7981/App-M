/**
 * End-to-End Encryption Module
 *
 * Main entry point for all encryption-related functionality
 *
 * Usage:
 *
 * // Initialize encryption for new user
 * import { keyManager, documentEncryption } from './services/encryption';
 *
 * const recoveryKit = await keyManager.initializeEncryption('my-strong-password');
 * // IMPORTANT: Save recoveryKit.mnemonic securely!
 *
 * // Unlock encryption (on login)
 * await keyManager.unlockWithPassword('my-strong-password');
 *
 * // Encrypt document before upload
 * const encryptedBundle = await documentEncryption.encryptDocument(documentBytes, 'image/jpeg');
 * // Upload encryptedBundle to Supabase
 *
 * // Decrypt document after download
 * const { data, mimeType } = await documentEncryption.decryptDocument(encryptedBundle);
 * // Use decrypted data
 */

export * from './constants';
export * from './crypto-utils';
export { keyManager } from './keyManager';
export { documentEncryption } from './documentEncryption';

// Re-export key types for convenience
export type {
  EncryptedDocumentBundle,
  UserKeyPair,
  RecoveryKit,
} from './constants';
