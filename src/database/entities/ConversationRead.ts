import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { AppBaseEntity } from './AppBase';
import { Message } from './Message';
import { Conversation } from './Conversation';

@Entity('conversation_reads')
export class ConversationRead extends AppBaseEntity {
  @Column({ default: false })
  isAdmin: boolean;

  @OneToOne(() => Message)
  @JoinColumn()
  lastReadMessage: Message;

  @ManyToOne(
    () => Conversation,
    (conversation) => conversation.conversationReads,
    { nullable: false, onDelete: 'CASCADE' }
  )
  conversation: Conversation;
}
