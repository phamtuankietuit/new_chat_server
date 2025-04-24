import crypto from 'crypto';
import configuration from '../configuration';

const deriveKey = (inputKey: string | undefined): Buffer => {
  if (!inputKey) {
    throw new Error('Encryption key is not defined in environment variables.');
  }

  return crypto.createHash('sha256').update(inputKey).digest();
};

const algorithm = 'aes-256-gcm';
const key = deriveKey(configuration.encryptionKey);
const ivLength = 16;

export const encrypt = (text: string): string => {
  try {
    if (!key) {
      throw new Error('Encryption key is not defined.');
    }

    const iv = crypto.randomBytes(ivLength);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    const encrypted = Buffer.concat([
      cipher.update(text, 'utf8'),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return (
      iv.toString('hex') +
      ':' +
      encrypted.toString('hex') +
      ':' +
      authTag.toString('hex')
    );
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error(
      'Failed to encrypt the text. Please check the encryption configuration.'
    );
  }
};

export const decrypt = (encrypted: string): string => {
  try {
    if (!key) {
      throw new Error('Encryption key is not defined.');
    }

    const [ivHex, dataHex, authTagHex] = encrypted.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const encryptedText = Buffer.from(dataHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(algorithm, key, iv);

    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encryptedText),
      decipher.final(),
    ]);

    return decrypted.toString();
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error(
      'Failed to decrypt the text. Please check the encryption configuration or the encrypted data might be tampered with.'
    );
  }
};
