/**
 * Backup Codes Utility for 2FA Recovery
 * Generates and validates secure backup codes
 * Uses bcrypt for hashing (one-way, secure)
 */

import crypto from 'crypto';
import bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 12; // Strong hashing (can increase for more security)
const CODE_LENGTH = 10; // 10 characters: XXXX-XXXX format
const CODE_COUNT = 8; // Generate 8 backup codes by default

/**
 * Generate a single random backup code
 * Format: XXXX-XXXXXX (alphanumeric, uppercase)
 * Example: A3F2-K8L9M0
 * @returns Formatted backup code
 */
function generateSingleCode(): string {
  // Use crypto.randomBytes for cryptographically secure random generation
  const bytes = crypto.randomBytes(CODE_LENGTH);
  
  // Convert to alphanumeric (A-Z, 0-9)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude ambiguous: 0, O, I, 1
  let code = '';
  
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += chars[bytes[i] % chars.length];
  }
  
  // Format: XXXX-XXXXXX
  return `${code.substring(0, 4)}-${code.substring(4)}`;
}

/**
 * Generate multiple backup codes
 * @param count - Number of codes to generate (default: 8)
 * @returns Array of backup codes
 * @example
 * const codes = generateBackupCodes(8);
 * // Returns: ['A3F2-K8L9M0', 'B7G3-N4P5Q6', ...]
 */
export function generateBackupCodes(count: number = CODE_COUNT): string[] {
  const codes: string[] = [];
  const uniqueCodes = new Set<string>();
  
  while (uniqueCodes.size < count) {
    const code = generateSingleCode();
    uniqueCodes.add(code);
  }
  
  return Array.from(uniqueCodes);
}

/**
 * Hash a backup code using bcrypt
 * @param code - Plain backup code
 * @returns Hashed code (bcrypt hash)
 * @example
 * const hash = await hashBackupCode('A3F2-K8L9M0');
 * // Returns: '$2b$12$...' (bcrypt hash)
 */
export async function hashBackupCode(code: string): Promise<string> {
  try {
    // Normalize: uppercase, remove hyphens
    const normalized = code.toUpperCase().replace(/-/g, '');
    
    // Hash with bcrypt
    const hash = await bcrypt.hash(normalized, BCRYPT_ROUNDS);
    
    return hash;
  } catch (error: any) {
    console.error('Failed to hash backup code:', error);
    throw new Error(`Failed to hash backup code: ${error.message}`);
  }
}

/**
 * Verify a backup code against a hash
 * @param code - Plain backup code to verify
 * @param hash - Stored bcrypt hash
 * @returns true if code matches hash, false otherwise
 * @example
 * const isValid = await verifyBackupCode('A3F2-K8L9M0', storedHash);
 * // Returns: true or false
 */
export async function verifyBackupCode(
  code: string,
  hash: string
): Promise<boolean> {
  try {
    // Normalize: uppercase, remove hyphens
    const normalized = code.toUpperCase().replace(/-/g, '');
    
    // Verify with bcrypt
    const isValid = await bcrypt.compare(normalized, hash);
    
    return isValid;
  } catch (error: any) {
    console.error('Failed to verify backup code:', error);
    return false;
  }
}

/**
 * Generate backup codes with hashes (ready for database storage)
 * @param count - Number of codes to generate (default: 8)
 * @returns Object with plain codes (to show user) and hashes (to store in DB)
 * @example
 * const { codes, hashes } = await generateBackupCodesWithHashes(8);
 * // codes: ['A3F2-K8L9M0', 'B7G3-N4P5Q6', ...]
 * // hashes: ['$2b$12$...', '$2b$12$...', ...]
 */
export async function generateBackupCodesWithHashes(
  count: number = CODE_COUNT
): Promise<{
  codes: string[];
  hashes: string[];
}> {
  try {
    // Generate plain codes
    const codes = generateBackupCodes(count);
    
    // Hash all codes
    const hashes = await Promise.all(
      codes.map(code => hashBackupCode(code))
    );
    
    return { codes, hashes };
  } catch (error: any) {
    console.error('Failed to generate backup codes with hashes:', error);
    throw new Error(`Failed to generate backup codes: ${error.message}`);
  }
}

/**
 * Validate backup code format
 * @param code - Code to validate
 * @returns true if format is valid, false otherwise
 * @example
 * isValidBackupCodeFormat('A3F2-K8L9M0') // true
 * isValidBackupCodeFormat('invalid') // false
 */
export function isValidBackupCodeFormat(code: string): boolean {
  // Expected format: XXXX-XXXXXX (alphanumeric, 10 chars + 1 hyphen)
  const regex = /^[A-Z2-9]{4}-[A-Z2-9]{6}$/i;
  return regex.test(code);
}

/**
 * Format a backup code (normalize and add hyphen)
 * @param code - Raw code (may be missing hyphen or lowercase)
 * @returns Formatted code
 * @example
 * formatBackupCode('a3f2k8l9m0') // 'A3F2-K8L9M0'
 * formatBackupCode('A3F2K8L9M0') // 'A3F2-K8L9M0'
 */
export function formatBackupCode(code: string): string {
  // Remove any existing hyphens and spaces
  const clean = code.toUpperCase().replace(/[-\s]/g, '');
  
  // Validate length
  if (clean.length !== CODE_LENGTH) {
    throw new Error(`Invalid backup code length: ${clean.length} (expected ${CODE_LENGTH})`);
  }
  
  // Add hyphen: XXXX-XXXXXX
  return `${clean.substring(0, 4)}-${clean.substring(4)}`;
}

/**
 * Test backup code generation and verification
 * @returns true if test passes
 */
export async function testBackupCodes(): Promise<boolean> {
  try {
    console.log('🔐 Testing backup code generation...');
    
    // Generate codes
    const { codes, hashes } = await generateBackupCodesWithHashes(3);
    console.log('✅ Generated codes:', codes);
    console.log('✅ Generated hashes (first 50 chars):', hashes.map(h => h.substring(0, 50) + '...'));
    
    // Verify first code
    const isValid = await verifyBackupCode(codes[0], hashes[0]);
    if (!isValid) {
      throw new Error('Failed to verify backup code');
    }
    console.log('✅ Code verification successful');
    
    // Test wrong code
    const isInvalid = await verifyBackupCode('WRONG-CODE123', hashes[0]);
    if (isInvalid) {
      throw new Error('Invalid code was accepted');
    }
    console.log('✅ Invalid code correctly rejected');
    
    // Test format validation
    if (!isValidBackupCodeFormat(codes[0])) {
      throw new Error('Valid code format rejected');
    }
    console.log('✅ Format validation successful');
    
    console.log('✅ All backup code tests passed!');
    return true;
    
  } catch (error: any) {
    console.error('❌ Backup code test failed:', error.message);
    throw error;
  }
}

// Type exports
export type BackupCode = string; // Format: "XXXX-XXXXXX"
export type BackupCodeHash = string; // bcrypt hash

