import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
// Ensure CREDENTIAL_ENCRYPTION_KEY is a 64-character hex string (32 bytes)
const ENCRYPTION_KEY_HEX = process.env.CREDENTIAL_ENCRYPTION_KEY;
const IV_LENGTH = 16; // AES block size is 128 bits / 16 bytes
const AUTH_TAG_LENGTH = 16; // GCM standard auth tag length

let encryptionKeyBuffer;
if (ENCRYPTION_KEY_HEX && /^[a-fA-F0-9]{64}$/.test(ENCRYPTION_KEY_HEX)) {
  encryptionKeyBuffer = Buffer.from(ENCRYPTION_KEY_HEX, 'hex');
} else {
  console.error('FATAL: CREDENTIAL_ENCRYPTION_KEY environment variable is missing, invalid, or not a 64-character hex string.');
  // In a real app, you might throw an error or prevent startup
  // For Vercel functions, logging the error might be the primary action.
}

/**
 * Encrypts a JSON-serializable object using AES-256-GCM.
 * @param {object} data The object to encrypt.
 * @returns {string|null} The encrypted string in format "iv:authTag:encryptedData" (hex encoded), or null if encryption failed or key is invalid.
 */
export function encrypt(data) {
  if (!encryptionKeyBuffer) {
    console.error('Encryption key is not configured properly.');
    return null; // Or throw new Error('Encryption key not configured');
  }
  if (data == null) return null; // Allow encrypting null/undefined as null

  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, encryptionKeyBuffer, iv);

    const dataString = JSON.stringify(data);
    let encrypted = cipher.update(dataString, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    // Return IV, authTag, and data, separated by colons
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption failed:', error);
    return null; // Or re-throw error
  }
}

/**
 * Decrypts a string encrypted with the encrypt function.
 * @param {string} encryptedString The encrypted string ("iv:authTag:encryptedData").
 * @returns {object|null} The original decrypted object, or null if decryption failed, key is invalid, or input is null/invalid.
 */
export function decrypt(encryptedString) {
  if (!encryptionKeyBuffer) {
    console.error('Encryption key is not configured properly.');
    return null; // Or throw new Error('Encryption key not configured');
  }
  if (!encryptedString || typeof encryptedString !== 'string') return null;

  try {
    const parts = encryptedString.split(':');
    if (parts.length !== 3) {
      console.error('Invalid encrypted format. Expected iv:authTag:encryptedData');
      return null; // Or throw new Error('Invalid encrypted format');
    }
    const [ivHex, authTagHex, encryptedDataHex] = parts;

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    // Check lengths to prevent potential issues
    if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) {
         console.error('Invalid IV or authTag length during decryption.');
         return null;
    }

    const decipher = crypto.createDecipheriv(ALGORITHM, encryptionKeyBuffer, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedDataHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8'); // Will throw an error if authTag is invalid

    return JSON.parse(decrypted);
  } catch (error) {
    // Log different errors for debugging: tag mismatch vs parsing error
    if (error.message && error.message.includes('Unsupported state')) {
       console.error('Decryption failed: Authentication tag mismatch.');
    } else if (error instanceof SyntaxError) {
       console.error('Decryption failed: Could not parse decrypted JSON.');
    }
     else {
       console.error('Decryption failed:', error);
    }
    return null; // Return null on any decryption error
  }
} 