/**
 * Key Management Service
 *
 * Handles:
 * - RSA key pair generation and storage
 * - Master key derivation from password
 * - Secure key storage in IndexedDB
 * - Session key caching
 * - Recovery phrase generation
 */

import * as bip39 from 'bip39';
import {
  generateRandomBytes,
  arrayBufferToBase64,
  base64ToArrayBuffer,
  deriveMasterKey,
  generateRSAKeyPair,
  exportKeyToJWK,
  importRSAPublicKey,
  importRSAPrivateKey,
  encryptWithMasterKey,
  decryptWithMasterKey,
  validatePasswordStrength,
} from './crypto-utils';
import {
  ENCRYPTION_CONFIG,
  STORAGE_KEYS,
  ENCRYPTION_ERRORS,
  UserKeyPair,
  RecoveryKit,
} from './constants';

/**
 * IndexedDB helper for secure key storage
 */
class SecureStorage {
  private dbName = STORAGE_KEYS.DB_NAME;
  private version = STORAGE_KEYS.DB_VERSION;
  private storeName = STORAGE_KEYS.STORE_NAME;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (!window.indexedDB) {
      throw new Error(ENCRYPTION_ERRORS.NO_INDEXEDDB_SUPPORT);
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store for encryption keys
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      };
    });
  }

  async set(key: string, value: any): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put({ id: key, value });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result?.value || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async delete(key: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clear(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

const secureStorage = new SecureStorage();

/**
 * Key Manager Service
 */
export class KeyManager {
  private static instance: KeyManager;
  private masterKey: Uint8Array | null = null;
  private privateKey: CryptoKey | null = null;
  private publicKey: CryptoKey | null = null;

  private constructor() {}

  static getInstance(): KeyManager {
    if (!KeyManager.instance) {
      KeyManager.instance = new KeyManager();
    }
    return KeyManager.instance;
  }

  /**
   * Check if encryption keys are initialized for this user
   */
  async isInitialized(): Promise<boolean> {
    const initialized = localStorage.getItem(STORAGE_KEYS.KEY_INITIALIZED);
    return initialized === 'true';
  }

  /**
   * Initialize encryption for a new user
   *
   * Steps:
   * 1. Generate random salt
   * 2. Derive master key from password
   * 3. Generate RSA key pair
   * 4. Encrypt private key with master key
   * 5. Store encrypted private key and public key
   * 6. Generate recovery phrase
   *
   * @param password User's master password
   * @returns Recovery kit (MUST be saved by user!)
   */
  async initializeEncryption(password: string): Promise<RecoveryKit> {
    // Validate password strength
    const validation = validatePasswordStrength(password);
    if (!validation.isValid) {
      throw new Error(
        `${ENCRYPTION_ERRORS.WEAK_PASSWORD}\n${validation.errors.join('\n')}`
      );
    }

    try {
      // Generate random salt
      const salt = generateRandomBytes(ENCRYPTION_CONFIG.ARGON2.SALT_SIZE);
      const saltBase64 = arrayBufferToBase64(salt);

      // Derive master key from password
      this.masterKey = await deriveMasterKey(password, salt);

      // Generate RSA key pair
      const keyPair = await generateRSAKeyPair();
      this.publicKey = keyPair.publicKey;
      this.privateKey = keyPair.privateKey;

      // Export keys to JWK
      const publicKeyJWK = await exportKeyToJWK(keyPair.publicKey);
      const privateKeyJWK = await exportKeyToJWK(keyPair.privateKey);

      // Encrypt private key with master key
      const encryptedPrivateKey = await encryptWithMasterKey(
        JSON.stringify(privateKeyJWK),
        this.masterKey
      );

      // Store keys in IndexedDB
      await secureStorage.set('encrypted_private_key', {
        ciphertext: encryptedPrivateKey.ciphertext,
        iv: encryptedPrivateKey.iv,
      });

      await secureStorage.set('public_key', publicKeyJWK);

      // Store metadata in localStorage (no secrets!)
      localStorage.setItem(STORAGE_KEYS.SALT, saltBase64);
      localStorage.setItem(
        STORAGE_KEYS.ENCRYPTION_VERSION,
        ENCRYPTION_CONFIG.VERSION
      );
      localStorage.setItem(STORAGE_KEYS.KEY_INITIALIZED, 'true');

      // Cache master key in session storage (cleared on tab close)
      sessionStorage.setItem(
        STORAGE_KEYS.SESSION_MASTER_KEY,
        arrayBufferToBase64(this.masterKey)
      );
      sessionStorage.setItem(STORAGE_KEYS.SESSION_UNLOCKED, 'true');

      // Generate recovery phrase (BIP-39)
      const mnemonic = bip39.generateMnemonic(
        ENCRYPTION_CONFIG.RECOVERY.MNEMONIC_STRENGTH
      );

      const recoveryKit: RecoveryKit = {
        mnemonic,
        salt: saltBase64,
        publicKeyJWK,
        timestamp: new Date().toISOString(),
      };

      console.log('✅ Encryption initialized successfully');
      return recoveryKit;
    } catch (error) {
      console.error('❌ Encryption initialization failed:', error);
      // Clean up on failure
      await this.clearAllKeys();
      throw error;
    }
  }

  /**
   * Unlock encryption with password (login)
   *
   * @param password User's master password
   * @returns true if unlock successful
   */
  async unlockWithPassword(password: string): Promise<boolean> {
    try {
      // Check if initialized
      if (!(await this.isInitialized())) {
        throw new Error(ENCRYPTION_ERRORS.KEYS_NOT_INITIALIZED);
      }

      // Get salt from localStorage
      const saltBase64 = localStorage.getItem(STORAGE_KEYS.SALT);
      if (!saltBase64) {
        throw new Error('Salt not found. Encryption may not be initialized.');
      }

      const salt = base64ToArrayBuffer(saltBase64);

      // Derive master key from password
      this.masterKey = await deriveMasterKey(password, salt);

      // Get encrypted private key from IndexedDB
      const encryptedPrivateKey = await secureStorage.get<{
        ciphertext: string;
        iv: string;
      }>('encrypted_private_key');

      if (!encryptedPrivateKey) {
        throw new Error('Private key not found in storage');
      }

      // Decrypt private key
      const privateKeyJWKString = await decryptWithMasterKey(
        encryptedPrivateKey.ciphertext,
        encryptedPrivateKey.iv,
        this.masterKey
      );

      const privateKeyJWK = JSON.parse(privateKeyJWKString);

      // Import private key
      this.privateKey = await importRSAPrivateKey(privateKeyJWK);

      // Get public key
      const publicKeyJWK = await secureStorage.get<JsonWebKey>('public_key');
      if (!publicKeyJWK) {
        throw new Error('Public key not found in storage');
      }

      this.publicKey = await importRSAPublicKey(publicKeyJWK);

      // Cache master key in session storage
      sessionStorage.setItem(
        STORAGE_KEYS.SESSION_MASTER_KEY,
        arrayBufferToBase64(this.masterKey)
      );
      sessionStorage.setItem(STORAGE_KEYS.SESSION_UNLOCKED, 'true');

      console.log('✅ Encryption unlocked successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to unlock encryption:', error);
      this.clearSession();
      return false;
    }
  }

  /**
   * Recover account with recovery phrase
   *
   * @param mnemonic 24-word recovery phrase
   * @param newPassword New password to set
   */
  async recoverWithPhrase(
    mnemonic: string,
    newPassword: string
  ): Promise<boolean> {
    try {
      // Validate mnemonic
      if (!bip39.validateMnemonic(mnemonic)) {
        throw new Error(ENCRYPTION_ERRORS.INVALID_RECOVERY_PHRASE);
      }

      // Validate new password
      const validation = validatePasswordStrength(newPassword);
      if (!validation.isValid) {
        throw new Error(
          `${ENCRYPTION_ERRORS.WEAK_PASSWORD}\n${validation.errors.join('\n')}`
        );
      }

      // Derive seed from mnemonic
      const seed = await bip39.mnemonicToSeed(mnemonic);

      // Use first 32 bytes as master key (deterministic recovery)
      const recoveredMasterKey = new Uint8Array(seed.slice(0, 32));

      // Get encrypted private key
      const encryptedPrivateKey = await secureStorage.get<{
        ciphertext: string;
        iv: string;
      }>('encrypted_private_key');

      if (!encryptedPrivateKey) {
        throw new Error(
          'No encrypted keys found. Cannot recover without original keys.'
        );
      }

      // Try to decrypt with recovered master key
      const privateKeyJWKString = await decryptWithMasterKey(
        encryptedPrivateKey.ciphertext,
        encryptedPrivateKey.iv,
        recoveredMasterKey
      );

      const privateKeyJWK = JSON.parse(privateKeyJWKString);
      const privateKey = await importRSAPrivateKey(privateKeyJWK);

      // Re-encrypt with new password
      const newSalt = generateRandomBytes(ENCRYPTION_CONFIG.ARGON2.SALT_SIZE);
      const newMasterKey = await deriveMasterKey(newPassword, newSalt);

      const newEncryptedPrivateKey = await encryptWithMasterKey(
        JSON.stringify(privateKeyJWK),
        newMasterKey
      );

      // Update stored keys
      await secureStorage.set('encrypted_private_key', {
        ciphertext: newEncryptedPrivateKey.ciphertext,
        iv: newEncryptedPrivateKey.iv,
      });

      localStorage.setItem(STORAGE_KEYS.SALT, arrayBufferToBase64(newSalt));

      // Update session
      this.masterKey = newMasterKey;
      this.privateKey = privateKey;

      sessionStorage.setItem(
        STORAGE_KEYS.SESSION_MASTER_KEY,
        arrayBufferToBase64(newMasterKey)
      );
      sessionStorage.setItem(STORAGE_KEYS.SESSION_UNLOCKED, 'true');

      console.log('✅ Account recovered successfully with new password');
      return true;
    } catch (error) {
      console.error('❌ Account recovery failed:', error);
      return false;
    }
  }

  /**
   * Check if session is unlocked
   */
  isUnlocked(): boolean {
    return sessionStorage.getItem(STORAGE_KEYS.SESSION_UNLOCKED) === 'true';
  }

  /**
   * Get public key (for encrypting)
   */
  getPublicKey(): CryptoKey {
    if (!this.publicKey) {
      throw new Error('Encryption not unlocked. Please unlock first.');
    }
    return this.publicKey;
  }

  /**
   * Get private key (for decrypting)
   */
  getPrivateKey(): CryptoKey {
    if (!this.privateKey) {
      throw new Error('Encryption not unlocked. Please unlock first.');
    }
    return this.privateKey;
  }

  /**
   * Clear session keys (logout)
   */
  clearSession(): void {
    this.masterKey = null;
    this.privateKey = null;
    this.publicKey = null;
    sessionStorage.removeItem(STORAGE_KEYS.SESSION_MASTER_KEY);
    sessionStorage.removeItem(STORAGE_KEYS.SESSION_UNLOCKED);
    console.log('🔒 Encryption session cleared');
  }

  /**
   * Clear all encryption keys (reset - DANGEROUS!)
   */
  async clearAllKeys(): Promise<void> {
    this.clearSession();
    await secureStorage.clear();
    localStorage.removeItem(STORAGE_KEYS.SALT);
    localStorage.removeItem(STORAGE_KEYS.ENCRYPTION_VERSION);
    localStorage.removeItem(STORAGE_KEYS.KEY_INITIALIZED);
    console.log('⚠️ All encryption keys cleared');
  }

  /**
   * Export public key as JWK (for sharing/display)
   */
  async exportPublicKey(): Promise<JsonWebKey> {
    const publicKeyJWK = await secureStorage.get<JsonWebKey>('public_key');
    if (!publicKeyJWK) {
      throw new Error('Public key not found');
    }
    return publicKeyJWK;
  }

  /**
   * Change password
   */
  async changePassword(
    oldPassword: string,
    newPassword: string
  ): Promise<boolean> {
    try {
      // Unlock with old password
      const unlocked = await this.unlockWithPassword(oldPassword);
      if (!unlocked) {
        throw new Error('Incorrect current password');
      }

      // Validate new password
      const validation = validatePasswordStrength(newPassword);
      if (!validation.isValid) {
        throw new Error(
          `${ENCRYPTION_ERRORS.WEAK_PASSWORD}\n${validation.errors.join('\n')}`
        );
      }

      // Get private key JWK
      const encryptedPrivateKey = await secureStorage.get<{
        ciphertext: string;
        iv: string;
      }>('encrypted_private_key');

      if (!encryptedPrivateKey || !this.masterKey) {
        throw new Error('Cannot access private key');
      }

      const privateKeyJWKString = await decryptWithMasterKey(
        encryptedPrivateKey.ciphertext,
        encryptedPrivateKey.iv,
        this.masterKey
      );

      // Generate new salt and master key
      const newSalt = generateRandomBytes(ENCRYPTION_CONFIG.ARGON2.SALT_SIZE);
      const newMasterKey = await deriveMasterKey(newPassword, newSalt);

      // Re-encrypt private key with new master key
      const newEncryptedPrivateKey = await encryptWithMasterKey(
        privateKeyJWKString,
        newMasterKey
      );

      // Update storage
      await secureStorage.set('encrypted_private_key', {
        ciphertext: newEncryptedPrivateKey.ciphertext,
        iv: newEncryptedPrivateKey.iv,
      });

      localStorage.setItem(STORAGE_KEYS.SALT, arrayBufferToBase64(newSalt));

      // Update session
      this.masterKey = newMasterKey;
      sessionStorage.setItem(
        STORAGE_KEYS.SESSION_MASTER_KEY,
        arrayBufferToBase64(newMasterKey)
      );

      console.log('✅ Password changed successfully');
      return true;
    } catch (error) {
      console.error('❌ Password change failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const keyManager = KeyManager.getInstance();
