import { NextFunction, Request, Response } from 'express';
import Controller from '../decorators/controller';
import { Put } from '../decorators/handlers';
import { BadRequestError } from '../utils/errors';
import { ConversationRead } from '../database/entities/ConversationRead';
import { Message } from '../database/entities/Message';

@Controller('/conversation-reads')
export default class ConversationReadController {
  @Put('/')
  public async updateConversationRead(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { dataSource } = req.app.locals;
      const { conversationReadId, lastReadMessageId } = req.body;

      if (!conversationReadId) {
        throw new BadRequestError('Conversation Read ID is required.');
      }

      if (!lastReadMessageId) {
        throw new BadRequestError('Last read message ID is required.');
      }

      const conversationReadRepository =
        dataSource.getRepository(ConversationRead);
      const messageRepository = dataSource.getRepository(Message);

      const conversationRead: ConversationRead | null =
        await conversationReadRepository.findOne({
          where: { id: conversationReadId },
          relations: ['conversation'],
        });
      if (!conversationRead) {
        throw new BadRequestError('Conversation read does not exist.');
      }

      const message: Message | null = await messageRepository.findOne({
        where: { id: lastReadMessageId },
        relations: ['conversation'],
      });
      if (!message) {
        throw new BadRequestError('Message does not exist.');
      }

      if (message.conversation.id !== conversationRead.conversation.id) {
        throw new BadRequestError(
          'Message does not belong to the conversation read.'
        );
      }

      conversationReadRepository.merge(conversationRead, {
        lastReadMessageId: message.id,
      });
      await conversationReadRepository.save(conversationRead);

      res.locals.message = 'Conversation Read updated successfully.';
      res.locals.data = {
        conversationRead,
      };

      next();
    } catch (error) {
      next(error);
    }
  }
}
