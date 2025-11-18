/**
 * Encryption Utility for 2FA Secrets
 * Uses AES-256-GCM for secure encryption/decryption
 * 
 * Environment Variable Required:
 * TOTP_ENCRYPTION_KEY - 64-character hex string (32 bytes)
 * Generate with: openssl rand -hex 32
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // For GCM, 16 bytes is recommended
const AUTH_TAG_LENGTH = 16;

/**
 * Get encryption key from environment
 * @throws Error if key is not configured or invalid
 */
function getEncryptionKey(): Buffer {
  const keyHex = process.env.TOTP_ENCRYPTION_KEY;
  
  if (!keyHex) {
    throw new Error(
      'TOTP_ENCRYPTION_KEY environment variable is not set. ' +
      'Generate with: openssl rand -hex 32'
    );
  }
  
  if (keyHex.length !== 64) {
    throw new Error(
      'TOTP_ENCRYPTION_KEY must be 64 characters (32 bytes in hex). ' +
      `Current length: ${keyHex.length}`
    );
  }
  
  try {
    return Buffer.from(keyHex, 'hex');
  } catch (error) {
    throw new Error('TOTP_ENCRYPTION_KEY must be a valid hex string');
  }
}

/**
 * Encrypt a plaintext string using AES-256-GCM
 * @param plaintext - The text to encrypt
 * @returns Encrypted string in format: iv:authTag:encrypted
 * @example
 * const encrypted = encryptSecret('MY_SECRET_KEY');
 * // Returns: "5f9b2c3d4e5f6a7b8c9d0e1f:a1b2c3d4e5f6a7b8c9d0e1f2:6a7b8c9d0e1f..."
 */
export function encryptSecret(plaintext: string): string {
  try {
    // Get encryption key
    const key = getEncryptionKey();
    
    // Generate random IV (Initialization Vector)
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    // Encrypt the plaintext
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get authentication tag (for GCM mode integrity verification)
    const authTag = cipher.getAuthTag();
    
    // Return in format: iv:authTag:encrypted
    return [
      iv.toString('hex'),
      authTag.toString('hex'),
      encrypted
    ].join(':');
    
  } catch (error: any) {
    console.error('Encryption error:', error);
    throw new Error(`Failed to encrypt secret: ${error.message}`);
  }
}

/**
 * Decrypt an encrypted string using AES-256-GCM
 * @param encrypted - Encrypted string in format: iv:authTag:encrypted
 * @returns Decrypted plaintext string
 * @throws Error if decryption fails or format is invalid
 * @example
 * const decrypted = decryptSecret('5f9b2c3d4e5f6a7b8c9d0e1f:a1b2c3d4e5f6a7b8c9d0e1f2:6a7b8c9d0e1f...');
 * // Returns: "MY_SECRET_KEY"
 */
export function decryptSecret(encrypted: string): string {
  try {
    // Parse the encrypted string
    const parts = encrypted.split(':');
    
    if (parts.length !== 3) {
      throw new Error(
        'Invalid encrypted format. Expected: iv:authTag:encrypted'
      );
    }
    
    const [ivHex, authTagHex, encryptedHex] = parts;
    
    // Convert hex strings to buffers
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encryptedData = encryptedHex;
    
    // Validate lengths
    if (iv.length !== IV_LENGTH) {
      throw new Error(`Invalid IV length: ${iv.length} (expected ${IV_LENGTH})`);
    }
    
    if (authTag.length !== AUTH_TAG_LENGTH) {
      throw new Error(`Invalid auth tag length: ${authTag.length} (expected ${AUTH_TAG_LENGTH})`);
    }
    
    // Get encryption key
    const key = getEncryptionKey();
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    
    // Set authentication tag (must be set before decrypting)
    decipher.setAuthTag(authTag);
    
    // Decrypt
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
    
  } catch (error: any) {
    console.error('Decryption error:', error);
    
    // Provide more helpful error messages
    if (error.message.includes('Unsupported state or unable to authenticate data')) {
      throw new Error('Decryption failed: Data may be corrupted or key is incorrect');
    }
    
    throw new Error(`Failed to decrypt secret: ${error.message}`);
  }
}

/**
 * Test encryption/decryption (for development only)
 * @returns true if test passes, throws error if fails
 */
export function testEncryption(): boolean {
  const testData = 'TEST_SECRET_123';
  
  try {
    console.log('🔐 Testing encryption...');
    
    const encrypted = encryptSecret(testData);
    console.log('✅ Encryption successful');
    console.log('   Encrypted:', encrypted.substring(0, 50) + '...');
    
    const decrypted = decryptSecret(encrypted);
    console.log('✅ Decryption successful');
    
    if (decrypted !== testData) {
      throw new Error(`Decrypted value doesn't match: "${decrypted}" !== "${testData}"`);
    }
    
    console.log('✅ Encryption test passed!');
    return true;
    
  } catch (error: any) {
    console.error('❌ Encryption test failed:', error.message);
    throw error;
  }
}

/**
 * Check if encryption is properly configured
 * @returns Object with configuration status
 */
export function checkEncryptionConfig(): {
  configured: boolean;
  keyLength: number | null;
  error: string | null;
} {
  try {
    const keyHex = process.env.TOTP_ENCRYPTION_KEY;
    
    if (!keyHex) {
      return {
        configured: false,
        keyLength: null,
        error: 'TOTP_ENCRYPTION_KEY environment variable not set',
      };
    }
    
    if (keyHex.length !== 64) {
      return {
        configured: false,
        keyLength: keyHex.length,
        error: `Key length is ${keyHex.length}, expected 64`,
      };
    }
    
    // Try to parse as hex
    Buffer.from(keyHex, 'hex');
    
    return {
      configured: true,
      keyLength: 64,
      error: null,
    };
    
  } catch (error: any) {
    return {
      configured: false,
      keyLength: null,
      error: error.message,
    };
  }
}

// Type exports for TypeScript
export type EncryptedSecret = string; // Format: "iv:authTag:encrypted"
export type PlaintextSecret = string;

