/**
 * Document Encryption Service
 *
 * High-level API for encrypting/decrypting seafarer documents
 * Handles the complete encryption pipeline:
 * 1. Generate random DEK (Document Encryption Key)
 * 2. Encrypt document with AES-256-GCM
 * 3. Wrap DEK with user's RSA public key
 * 4. Bundle everything for storage
 */

import {
  generateRandomBytes,
  arrayBufferToBase64,
  base64ToArrayBuffer,
  calculateSHA256,
  generateAESKey,
  encryptAESGCM,
  decryptAESGCM,
  wrapAESKey,
  unwrapAESKey,
  exportKeyToJWK,
  checkCryptoSupport,
} from './crypto-utils';
import { keyManager } from './keyManager';
import {
  ENCRYPTION_CONFIG,
  ENCRYPTION_ERRORS,
  EncryptedDocumentBundle,
} from './constants';

/**
 * Document Encryption Service
 */
export class DocumentEncryptionService {
  private static instance: DocumentEncryptionService;

  private constructor() {
    checkCryptoSupport();
  }

  static getInstance(): DocumentEncryptionService {
    if (!DocumentEncryptionService.instance) {
      DocumentEncryptionService.instance = new DocumentEncryptionService();
    }
    return DocumentEncryptionService.instance;
  }

  /**
   * Encrypt a document for upload
   *
   * @param documentData Document as Uint8Array or Blob
   * @param mimeType MIME type of document
   * @returns Encrypted bundle ready for upload
   */
  async encryptDocument(
    documentData: Uint8Array | Blob,
    mimeType: string
  ): Promise<EncryptedDocumentBundle> {
    try {
      console.log('🔐 Starting document encryption...');

      // Ensure session is unlocked
      if (!keyManager.isUnlocked()) {
        throw new Error('Encryption session not unlocked. Please login first.');
      }

      // Convert Blob to Uint8Array if needed
      let dataBytes: Uint8Array;
      if (documentData instanceof Blob) {
        const arrayBuffer = await documentData.arrayBuffer();
        dataBytes = new Uint8Array(arrayBuffer);
      } else {
        dataBytes = documentData;
      }

      const originalSize = dataBytes.byteLength;
      console.log(`📄 Document size: ${(originalSize / 1024).toFixed(2)} KB`);

      // Calculate SHA-256 hash for integrity verification
      const documentHash = await calculateSHA256(dataBytes);
      console.log(`🔍 Document hash: ${documentHash.substring(0, 16)}...`);

      // Generate random Document Encryption Key (DEK)
      const dek = await generateAESKey();
      console.log('🔑 Generated DEK');

      // Generate random IV (96-bit for GCM)
      const iv = generateRandomBytes(ENCRYPTION_CONFIG.AES.IV_SIZE);

      // Encrypt document with AES-256-GCM
      const encryptedData = await encryptAESGCM(dataBytes, dek, iv);
      console.log(
        `🔒 Document encrypted: ${(encryptedData.byteLength / 1024).toFixed(2)} KB`
      );

      // Wrap DEK with user's RSA public key
      const publicKey = keyManager.getPublicKey();
      const wrappedDEK = await wrapAESKey(dek, publicKey);
      console.log('🔐 DEK wrapped with RSA public key');

      // Extract authentication tag (last 16 bytes of encrypted data)
      const ciphertextWithTag = new Uint8Array(encryptedData);
      const tagSize = ENCRYPTION_CONFIG.AES.TAG_SIZE / 8; // 16 bytes
      const ciphertext = ciphertextWithTag.slice(
        0,
        ciphertextWithTag.length - tagSize
      );
      const authTag = ciphertextWithTag.slice(ciphertextWithTag.length - tagSize);

      // Create encrypted bundle
      const bundle: EncryptedDocumentBundle = {
        version: ENCRYPTION_CONFIG.VERSION,
        ciphertext: arrayBufferToBase64(ciphertext),
        wrappedDEK: arrayBufferToBase64(wrappedDEK),
        iv: arrayBufferToBase64(iv),
        authTag: arrayBufferToBase64(authTag),
        encryptedMetadata: {
          hash: documentHash,
          originalSize,
          mimeType,
          timestamp: new Date().toISOString(),
        },
      };

      console.log('✅ Document encryption completed successfully');
      console.log(
        `📦 Bundle size: ${(JSON.stringify(bundle).length / 1024).toFixed(2)} KB`
      );

      return bundle;
    } catch (error) {
      console.error('❌ Document encryption failed:', error);
      throw new Error(
        `${ENCRYPTION_ERRORS.ENCRYPTION_FAILED}: ${(error as Error).message}`
      );
    }
  }

  /**
   * Decrypt a document after download
   *
   * @param bundle Encrypted document bundle
   * @returns Decrypted document data
   */
  async decryptDocument(
    bundle: EncryptedDocumentBundle
  ): Promise<{
    data: Uint8Array;
    mimeType: string;
    originalSize: number;
    verified: boolean;
  }> {
    try {
      console.log('🔓 Starting document decryption...');

      // Ensure session is unlocked
      if (!keyManager.isUnlocked()) {
        throw new Error('Encryption session not unlocked. Please login first.');
      }

      // Validate bundle version
      if (bundle.version !== ENCRYPTION_CONFIG.VERSION) {
        console.warn(
          `⚠️ Bundle version mismatch: ${bundle.version} vs ${ENCRYPTION_CONFIG.VERSION}`
        );
      }

      // Decode Base64 data
      const ciphertext = base64ToArrayBuffer(bundle.ciphertext);
      const wrappedDEK = base64ToArrayBuffer(bundle.wrappedDEK);
      const iv = base64ToArrayBuffer(bundle.iv);
      const authTag = base64ToArrayBuffer(bundle.authTag);

      // Reconstruct ciphertext with auth tag
      const ciphertextWithTag = new Uint8Array(
        ciphertext.length + authTag.length
      );
      ciphertextWithTag.set(ciphertext, 0);
      ciphertextWithTag.set(authTag, ciphertext.length);

      // Unwrap DEK using user's private key
      const privateKey = keyManager.getPrivateKey();
      const dek = await unwrapAESKey(wrappedDEK.buffer, privateKey);
      console.log('🔑 DEK unwrapped successfully');

      // Decrypt document
      const decryptedData = await decryptAESGCM(
        ciphertextWithTag.buffer,
        dek,
        iv
      );
      console.log(
        `🔓 Document decrypted: ${(decryptedData.byteLength / 1024).toFixed(2)} KB`
      );

      const decryptedBytes = new Uint8Array(decryptedData);

      // Verify integrity with SHA-256 hash
      const calculatedHash = await calculateSHA256(decryptedBytes);
      const verified = calculatedHash === bundle.encryptedMetadata.hash;

      if (!verified) {
        console.error('❌ Document integrity verification FAILED!');
        console.error(`Expected: ${bundle.encryptedMetadata.hash}`);
        console.error(`Got: ${calculatedHash}`);
        throw new Error(ENCRYPTION_ERRORS.CORRUPTED_DATA);
      }

      console.log('✅ Document integrity verified');
      console.log('✅ Document decryption completed successfully');

      return {
        data: decryptedBytes,
        mimeType: bundle.encryptedMetadata.mimeType,
        originalSize: bundle.encryptedMetadata.originalSize,
        verified,
      };
    } catch (error) {
      console.error('❌ Document decryption failed:', error);
      throw new Error(
        `${ENCRYPTION_ERRORS.DECRYPTION_FAILED}: ${(error as Error).message}`
      );
    }
  }

  /**
   * Encrypt a Base64 data URL (for backward compatibility with existing code)
   *
   * @param dataUrl Base64 data URL (data:image/jpeg;base64,...)
   * @returns Encrypted bundle
   */
  async encryptDataURL(dataUrl: string): Promise<EncryptedDocumentBundle> {
    try {
      // Parse data URL
      const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) {
        throw new Error('Invalid data URL format');
      }

      const mimeType = matches[1];
      const base64Data = matches[2];

      // Decode Base64 to binary
      const binaryData = base64ToArrayBuffer(base64Data);

      // Encrypt
      return await this.encryptDocument(binaryData, mimeType);
    } catch (error) {
      console.error('❌ Data URL encryption failed:', error);
      throw error;
    }
  }

  /**
   * Decrypt and convert to Base64 data URL (for backward compatibility)
   *
   * @param bundle Encrypted document bundle
   * @returns Base64 data URL
   */
  async decryptToDataURL(bundle: EncryptedDocumentBundle): Promise<string> {
    try {
      const { data, mimeType } = await this.decryptDocument(bundle);

      // Convert to Base64
      const base64Data = arrayBufferToBase64(data);

      // Create data URL
      return `data:${mimeType};base64,${base64Data}`;
    } catch (error) {
      console.error('❌ Data URL decryption failed:', error);
      throw error;
    }
  }

  /**
   * Encrypt a Blob and convert to uploadable Blob
   *
   * @param blob Document as Blob
   * @returns Encrypted Blob (JSON bundle)
   */
  async encryptBlob(blob: Blob): Promise<Blob> {
    const arrayBuffer = await blob.arrayBuffer();
    const dataBytes = new Uint8Array(arrayBuffer);

    const bundle = await this.encryptDocument(dataBytes, blob.type);

    // Convert bundle to JSON Blob
    const jsonString = JSON.stringify(bundle);
    return new Blob([jsonString], { type: 'application/json' });
  }

  /**
   * Download and decrypt a Blob
   *
   * @param encryptedBlob Encrypted Blob (JSON bundle)
   * @returns Decrypted Blob
   */
  async decryptBlob(encryptedBlob: Blob): Promise<Blob> {
    const jsonString = await encryptedBlob.text();
    const bundle: EncryptedDocumentBundle = JSON.parse(jsonString);

    const { data, mimeType } = await this.decryptDocument(bundle);

    return new Blob([data], { type: mimeType });
  }

  /**
   * Check if document is encrypted (has bundle structure)
   */
  isEncrypted(data: any): boolean {
    if (typeof data !== 'object') return false;

    return (
      'version' in data &&
      'ciphertext' in data &&
      'wrappedDEK' in data &&
      'iv' in data &&
      'authTag' in data &&
      'encryptedMetadata' in data
    );
  }

  /**
   * Get encryption status info
   */
  async getEncryptionStatus(): Promise<{
    initialized: boolean;
    unlocked: boolean;
    version: string;
  }> {
    return {
      initialized: await keyManager.isInitialized(),
      unlocked: keyManager.isUnlocked(),
      version: ENCRYPTION_CONFIG.VERSION,
    };
  }
}

// Export singleton instance
export const documentEncryption = DocumentEncryptionService.getInstance();
