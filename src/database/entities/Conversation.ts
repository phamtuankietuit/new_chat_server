import { Column, Entity, OneToMany } from 'typeorm';
import { AppBaseEntity } from './AppBase';
import { Message } from './Message';
import { ConversationRead } from './ConversationRead';

@Entity('conversations')
export class Conversation extends AppBaseEntity {
  @Column()
  customerId: number;

  @OneToMany(() => Message, (message) => message.conversation)
  messages: Message[];

  @OneToMany(
    () => ConversationRead,
    (conversationRead) => conversationRead.conversation
  )
  conversationReads: ConversationRead[];
}
