/**
 * Core Cryptographic Utilities
 *
 * Low-level encryption/decryption functions using Web Crypto API
 * All operations are performed client-side in the browser
 */

import { sha256 } from '@noble/hashes/sha256';
import { argon2id } from '@noble/hashes/argon2';
import { ENCRYPTION_CONFIG, ENCRYPTION_ERRORS } from './constants';

/**
 * Check if Web Crypto API is available
 */
export function checkCryptoSupport(): void {
  if (!window.crypto || !window.crypto.subtle) {
    throw new Error(ENCRYPTION_ERRORS.NO_CRYPTO_SUPPORT);
  }
}

/**
 * Generate cryptographically secure random bytes
 */
export function generateRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  window.crypto.getRandomValues(bytes);
  return bytes;
}

/**
 * Convert Uint8Array to Base64 string
 */
export function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert Base64 string to Uint8Array
 */
export function base64ToArrayBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Convert ArrayBuffer to hex string (for display/debugging)
 */
export function arrayBufferToHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Calculate SHA-256 hash of data
 */
export async function calculateSHA256(data: Uint8Array): Promise<string> {
  const hash = sha256(data);
  return arrayBufferToHex(hash);
}

/**
 * Derive master key from password using Argon2id
 *
 * @param password User's password
 * @param salt Unique salt (should be random, stored separately)
 * @returns 256-bit master key
 */
export async function deriveMasterKey(
  password: string,
  salt: Uint8Array
): Promise<Uint8Array> {
  try {
    const passwordBytes = new TextEncoder().encode(password);

    const masterKey = argon2id(passwordBytes, salt, {
      m: ENCRYPTION_CONFIG.ARGON2.MEMORY,
      t: ENCRYPTION_CONFIG.ARGON2.ITERATIONS,
      p: ENCRYPTION_CONFIG.ARGON2.PARALLELISM,
      dkLen: ENCRYPTION_CONFIG.ARGON2.OUTPUT_SIZE,
    });

    return masterKey;
  } catch (error) {
    console.error('Master key derivation failed:', error);
    throw new Error('Failed to derive encryption key from password');
  }
}

/**
 * Generate AES-256-GCM key for document encryption
 *
 * @returns CryptoKey for AES-GCM encryption
 */
export async function generateAESKey(): Promise<CryptoKey> {
  checkCryptoSupport();

  return await window.crypto.subtle.generateKey(
    {
      name: ENCRYPTION_CONFIG.AES.ALGORITHM,
      length: ENCRYPTION_CONFIG.AES.KEY_SIZE,
    },
    true, // extractable (needed for key wrapping)
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt data using AES-256-GCM
 *
 * @param data Data to encrypt
 * @param key AES key
 * @param iv Initialization vector (96-bit)
 * @returns Encrypted data with authentication tag
 */
export async function encryptAESGCM(
  data: Uint8Array,
  key: CryptoKey,
  iv: Uint8Array
): Promise<ArrayBuffer> {
  checkCryptoSupport();

  try {
    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: ENCRYPTION_CONFIG.AES.ALGORITHM,
        iv: iv,
        tagLength: ENCRYPTION_CONFIG.AES.TAG_SIZE,
      },
      key,
      data
    );

    return encrypted;
  } catch (error) {
    console.error('AES-GCM encryption failed:', error);
    throw new Error(ENCRYPTION_ERRORS.ENCRYPTION_FAILED);
  }
}

/**
 * Decrypt data using AES-256-GCM
 *
 * @param encryptedData Encrypted data (includes auth tag)
 * @param key AES key
 * @param iv Initialization vector
 * @returns Decrypted data
 */
export async function decryptAESGCM(
  encryptedData: ArrayBuffer,
  key: CryptoKey,
  iv: Uint8Array
): Promise<ArrayBuffer> {
  checkCryptoSupport();

  try {
    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: ENCRYPTION_CONFIG.AES.ALGORITHM,
        iv: iv,
        tagLength: ENCRYPTION_CONFIG.AES.TAG_SIZE,
      },
      key,
      encryptedData
    );

    return decrypted;
  } catch (error) {
    console.error('AES-GCM decryption failed:', error);
    throw new Error(ENCRYPTION_ERRORS.DECRYPTION_FAILED);
  }
}

/**
 * Generate RSA-4096 key pair for key wrapping
 *
 * @returns RSA key pair (public/private)
 */
export async function generateRSAKeyPair(): Promise<CryptoKeyPair> {
  checkCryptoSupport();

  try {
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: ENCRYPTION_CONFIG.RSA.ALGORITHM,
        modulusLength: ENCRYPTION_CONFIG.RSA.MODULUS_LENGTH,
        publicExponent: ENCRYPTION_CONFIG.RSA.PUBLIC_EXPONENT,
        hash: ENCRYPTION_CONFIG.RSA.HASH,
      },
      true, // extractable
      ['wrapKey', 'unwrapKey']
    );

    return keyPair;
  } catch (error) {
    console.error('RSA key pair generation failed:', error);
    throw new Error('Failed to generate RSA key pair');
  }
}

/**
 * Wrap (encrypt) an AES key using RSA public key
 *
 * @param aesKey AES key to wrap
 * @param publicKey RSA public key
 * @returns Wrapped key (encrypted)
 */
export async function wrapAESKey(
  aesKey: CryptoKey,
  publicKey: CryptoKey
): Promise<ArrayBuffer> {
  checkCryptoSupport();

  try {
    const wrappedKey = await window.crypto.subtle.wrapKey(
      'raw',
      aesKey,
      publicKey,
      {
        name: ENCRYPTION_CONFIG.RSA.ALGORITHM,
      }
    );

    return wrappedKey;
  } catch (error) {
    console.error('AES key wrapping failed:', error);
    throw new Error('Failed to wrap encryption key');
  }
}

/**
 * Unwrap (decrypt) an AES key using RSA private key
 *
 * @param wrappedKey Wrapped key
 * @param privateKey RSA private key
 * @returns Unwrapped AES key
 */
export async function unwrapAESKey(
  wrappedKey: ArrayBuffer,
  privateKey: CryptoKey
): Promise<CryptoKey> {
  checkCryptoSupport();

  try {
    const aesKey = await window.crypto.subtle.unwrapKey(
      'raw',
      wrappedKey,
      privateKey,
      {
        name: ENCRYPTION_CONFIG.RSA.ALGORITHM,
      },
      {
        name: ENCRYPTION_CONFIG.AES.ALGORITHM,
        length: ENCRYPTION_CONFIG.AES.KEY_SIZE,
      },
      true, // extractable
      ['decrypt']
    );

    return aesKey;
  } catch (error) {
    console.error('AES key unwrapping failed:', error);
    throw new Error(ENCRYPTION_ERRORS.KEY_UNWRAP_FAILED);
  }
}

/**
 * Export CryptoKey to JWK (JSON Web Key) format
 */
export async function exportKeyToJWK(key: CryptoKey): Promise<JsonWebKey> {
  checkCryptoSupport();
  return await window.crypto.subtle.exportKey('jwk', key);
}

/**
 * Import RSA public key from JWK
 */
export async function importRSAPublicKey(jwk: JsonWebKey): Promise<CryptoKey> {
  checkCryptoSupport();

  return await window.crypto.subtle.importKey(
    'jwk',
    jwk,
    {
      name: ENCRYPTION_CONFIG.RSA.ALGORITHM,
      hash: ENCRYPTION_CONFIG.RSA.HASH,
    },
    true,
    ['wrapKey']
  );
}

/**
 * Import RSA private key from JWK
 */
export async function importRSAPrivateKey(jwk: JsonWebKey): Promise<CryptoKey> {
  checkCryptoSupport();

  return await window.crypto.subtle.importKey(
    'jwk',
    jwk,
    {
      name: ENCRYPTION_CONFIG.RSA.ALGORITHM,
      hash: ENCRYPTION_CONFIG.RSA.HASH,
    },
    true,
    ['unwrapKey']
  );
}

/**
 * Import raw AES key
 */
export async function importAESKey(rawKey: Uint8Array): Promise<CryptoKey> {
  checkCryptoSupport();

  return await window.crypto.subtle.importKey(
    'raw',
    rawKey,
    {
      name: ENCRYPTION_CONFIG.AES.ALGORITHM,
      length: ENCRYPTION_CONFIG.AES.KEY_SIZE,
    },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt data with master key (for encrypting private keys)
 */
export async function encryptWithMasterKey(
  data: string,
  masterKey: Uint8Array
): Promise<{ ciphertext: string; iv: string }> {
  const dataBytes = new TextEncoder().encode(data);
  const iv = generateRandomBytes(ENCRYPTION_CONFIG.AES.IV_SIZE);

  // Import master key as AES key
  const aesKey = await importAESKey(masterKey);

  // Encrypt
  const encrypted = await encryptAESGCM(dataBytes, aesKey, iv);

  return {
    ciphertext: arrayBufferToBase64(encrypted),
    iv: arrayBufferToBase64(iv),
  };
}

/**
 * Decrypt data with master key
 */
export async function decryptWithMasterKey(
  ciphertext: string,
  iv: string,
  masterKey: Uint8Array
): Promise<string> {
  const encryptedBytes = base64ToArrayBuffer(ciphertext);
  const ivBytes = base64ToArrayBuffer(iv);

  // Import master key as AES key
  const aesKey = await importAESKey(masterKey);

  // Decrypt
  const decrypted = await decryptAESGCM(encryptedBytes, aesKey, ivBytes);

  return new TextDecoder().decode(decrypted);
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 12) {
    errors.push('Password must be at least 12 characters long');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain lowercase letters');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain uppercase letters');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain numbers');
  }

  if (!/[^a-zA-Z0-9]/.test(password)) {
    errors.push('Password must contain special characters');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
