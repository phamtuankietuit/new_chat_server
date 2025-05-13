import { NextFunction, Request, Response } from 'express';
import Controller from '../decorators/controller';
import { Get, Post } from '../decorators/handlers';
import { Message } from '../database/entities/Message';
import { Conversation } from '../database/entities/Conversation';
import { BadRequestError } from '../utils/errors';
import { omit } from '../utils';
import { LessThan } from 'typeorm';

@Controller('/messages')
export default class MessageController {
  @Post('/')
  public async createMessage(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { dataSource, ioSocket } = req.app.locals;
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
        message: {
          ...omit(message, ['conversation']),
          conversationId: conversation.id,
        },
      };

      if (ioSocket) {
        ioSocket.emit('message', {
          ...omit(message, ['conversation']),
          conversationId: conversation.id,
          assignee: {
            id: message.customerId ? 'admin' : conversation.customerId,
          },
        });
      }

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
      const { conversationId, fromId, pageSize = 20 } = req.query;

      if (!conversationId || typeof conversationId !== 'string') {
        throw new BadRequestError(
          'Conversation ID is required and must be a string.'
        );
      }
      const messageRepository = dataSource.getRepository(Message);

      let whereCondition: any = {
        conversation: {
          id: conversationId,
        },
      };

      if (fromId && typeof fromId === 'string') {
        const fromMessage: Message | null = await messageRepository.findOne({
          where: { id: fromId },
        });

        if (fromMessage) {
          whereCondition = {
            ...whereCondition,
            createdAt: LessThan(fromMessage.createdAt),
          };
        }
      }

      const [messages, count] = await messageRepository.findAndCount({
        where: whereCondition,
        order: {
          createdAt: 'DESC',
        },
        take: Number(pageSize),
      });

      res.locals.message = 'Messages retrieved successfully.';
      res.locals.data = {
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
