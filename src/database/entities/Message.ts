import { Column, Entity, ManyToOne } from 'typeorm';
import { AppBaseEntity } from './AppBase';
import { Conversation } from './Conversation';
import { encryptionTransformer } from '../../transformers/encryption.transformer';

export enum MessageContentTypes {
  TEXT = 'text',
  IMAGE = 'image',
}

@Entity('messages')
export class Message extends AppBaseEntity {
  @Column({ nullable: true })
  customerId: number;

  @Column({
    type: 'enum',
    enum: MessageContentTypes,
    default: MessageContentTypes.TEXT,
  })
  contentType: string;

  @Column({
    type: 'text',
    transformer: encryptionTransformer,
  })
  body: string;

  @ManyToOne(() => Conversation, (conversation) => conversation.messages)
  conversation: Conversation;
}
