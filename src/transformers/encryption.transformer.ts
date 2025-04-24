import { encrypt, decrypt } from '../utils/crypto';
import { ValueTransformer } from 'typeorm';

export const encryptionTransformer: ValueTransformer = {
  to: (value: string) => (value ? encrypt(value) : value),
  from: (value: string) => (value ? decrypt(value) : value),
};
