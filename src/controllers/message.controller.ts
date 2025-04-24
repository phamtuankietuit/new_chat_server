import { NextFunction, Request, Response } from 'express';
import Controller from '../decorators/controller';
import { Get, Post } from '../decorators/handlers';
import { Message } from '../database/entities/Message';
import { Conversation } from '../database/entities/Conversation';
import { BadRequestError } from '../utils/errors';
import { omit } from '../utils';

@Controller('/messages')
export default class MessageController {
  @Post('/')
  public async createMessage(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { dataSource } = req.app.locals;
      const { conversationId, customerId, contentType, body } = req.body;

      if (!conversationId) {
        throw new BadRequestError('Conversation ID is required.');
      }

      const conversationRepository = dataSource.getRepository(Conversation);
      const messageRepository = dataSource.getRepository(Message);

      const conversation: Conversation | null =
        await conversationRepository.findOne({
          where: { id: conversationId },
        });
      if (!conversation) {
        throw new BadRequestError('Conversation does not exist.');
      }

      const message: Message = messageRepository.create({
        customerId,
        contentType,
        body,
        conversation,
        createdBy: 'system',
      });
      await messageRepository.save(message);

      res.locals.message = 'Message created successfully.';
      res.locals.data = {
        message: omit(message, ['conversation']),
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Get('/')
  public async getMessages(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { dataSource } = req.app.locals;
      const { conversationId, pageNumber = 1, pageSize = 10 } = req.query;

      if (!conversationId || typeof conversationId !== 'string') {
        throw new BadRequestError(
          'Conversation ID is required and must be a string.'
        );
      }

      const messageRepository = dataSource.getRepository(Message);
      const [messages, count] = await messageRepository.findAndCount({
        where: {
          conversation: {
            id: conversationId,
          },
        },
        order: {
          createdAt: 'DESC',
        },
        skip: (Number(pageNumber) - 1) * Number(pageSize),
        take: Number(pageSize),
      });

      res.locals.message = 'Messages retrieved successfully.';
      res.locals.data = {
        pageNumber: Number(pageNumber),
        pageSize: Number(pageSize),
        itemsCount: messages.length,
        count,
        messages: messages.slice().reverse(),
      };

      next();
    } catch (error) {
      next(error);
    }
  }
}
