import ConversationController from '../controllers/conversation.controller';
import ConversationReadController from '../controllers/conversationRead.controller';
import FastMessageController from '../controllers/fastMessage.controller';
import MessageController from '../controllers/message.controller';

export const appRouters = [
  {
    rootPath: '/api/v1',
    controllers: [
      ConversationController,
      MessageController,
      ConversationReadController,
      FastMessageController,
    ],
  },
];
