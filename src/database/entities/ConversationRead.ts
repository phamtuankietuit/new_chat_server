import { Column, Entity, ManyToOne } from 'typeorm';
import { AppBaseEntity } from './AppBase';
import { Conversation } from './Conversation';

@Entity('conversation_reads')
export class ConversationRead extends AppBaseEntity {
  @Column({ default: false })
  isAdmin: boolean;

  @Column({ nullable: true })
  lastReadMessageId: string;

  @ManyToOne(
    () => Conversation,
    (conversation) => conversation.conversationReads,
    { nullable: false, onDelete: 'CASCADE' }
  )
  conversation: Conversation;
}
