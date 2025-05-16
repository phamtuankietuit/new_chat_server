import { Column, Entity } from 'typeorm';
import { AppBaseEntity } from './AppBase';
import { encryptionTransformer } from '../../transformers/encryption.transformer';

@Entity('fast_messages')
export class FastMessage extends AppBaseEntity {
  @Column({ unique: true })
  shorthand: string;

  @Column({
    type: 'text',
    transformer: encryptionTransformer,
  })
  body: string;
}
