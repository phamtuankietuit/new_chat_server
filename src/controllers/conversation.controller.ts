import { NextFunction, Request, Response } from 'express';
import Controller from '../decorators/controller';
import { Get, Post } from '../decorators/handlers';
import { Conversation } from '../database/entities/Conversation';
import { BadRequestError } from '../utils/errors';
import { ConversationRead } from '../database/entities/ConversationRead';
import { Message } from '../database/entities/Message';
import { SelectQueryBuilder } from 'typeorm';

@Controller('/conversations')
export default class ConversationController {
  @Post('/')
  public async createConversation(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { dataSource } = req.app.locals;
      const { customerId } = req.body;

      const conversationRepository = dataSource.getRepository(Conversation);
      const conversationReadRepository =
        dataSource.getRepository(ConversationRead);

      if (!customerId) {
        throw new BadRequestError('Customer ID is required.');
      }

      const conversationExist: Conversation | null =
        await conversationRepository.findOne({
          where: { customerId },
        });
      if (conversationExist) {
        throw new BadRequestError('Conversation already exists.');
      }

      let queryRunner = null;

      try {
        queryRunner = dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        const conversation: Conversation = conversationRepository.create({
          customerId,
          createdBy: 'system',
        });
        await queryRunner.manager.save(conversation);

        const CRCustomer: ConversationRead = conversationReadRepository.create({
          conversation: conversation,
          createdBy: 'system',
        });

        const CRAdmin: ConversationRead = conversationReadRepository.create({
          isAdmin: true,
          conversation: conversation,
          createdBy: 'system',
        });

        await queryRunner.manager.save(CRCustomer);
        await queryRunner.manager.save(CRAdmin);

        await queryRunner.commitTransaction();

        res.locals.message = 'Conversation created successfully.';
        res.locals.data = {
          conversation,
        };

        next();
      } catch (error) {
        if (queryRunner) {
          await queryRunner.rollbackTransaction();
        }
        throw error;
      } finally {
        if (queryRunner) {
          await queryRunner.release();
        }
      }
    } catch (error) {
      next(error);
    }
  }

  @Get('/')
  public async getConversationsByAdmin(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { dataSource } = req.app.locals;
      const { pageNumber = 1, pageSize = 20 } = req.query;

      const conversationRepository = dataSource.getRepository(Conversation);
      const messageRepository = dataSource.getRepository(Message);

      const conversationsAndLatestMessage = await conversationRepository
        .createQueryBuilder('c')
        .innerJoinAndSelect(
          (qb: SelectQueryBuilder<Message>) =>
            qb
              .from(Message, 'm')
              .select('DISTINCT ON (m.conversationId) m.*')
              .where('m.deletedAt IS NULL')
              .orderBy('m.conversationId')
              .addOrderBy('m.createdAt', 'DESC'),
          'latest',
          '"latest"."conversationId" = c.id'
        )
        .orderBy('"latest"."createdAt"', 'DESC')
        .leftJoinAndSelect('c.conversationReads', 'cr', 'cr.isAdmin = true')
        .leftJoinAndSelect('cr.lastReadMessage', 'lastReadMessage')
        .getMany();

      const count = conversationsAndLatestMessage.length;

      const paginatedConversations = conversationsAndLatestMessage.slice(
        (Number(pageNumber) - 1) * Number(pageSize),
        (Number(pageNumber) - 1) * Number(pageSize) + Number(pageSize)
      );

      const result = await Promise.all(
        paginatedConversations.map(async (conversation: Conversation) => {
          const lastReadTime =
            conversation.conversationReads[0]?.lastReadMessage?.createdAt ??
            conversation.conversationReads[0].updatedAt;

          const [unreadMessages, unreadCount] = await messageRepository
            .createQueryBuilder('message')
            .where('message.customerId IS NOT NULL')
            .andWhere('message.conversationId = :conversationId', {
              conversationId: conversation.id,
            })
            .andWhere('message.createdAt > :lastReadTime', { lastReadTime })
            .getManyAndCount();

          const latestMessage: Message | null = await messageRepository.findOne(
            {
              where: {
                conversation: {
                  id: conversation.id,
                },
              },
              order: {
                createdAt: 'DESC',
              },
            }
          );

          let newUnreadCount = unreadCount;
          if (
            unreadCount === 1 &&
            unreadMessages[0].createdAt.toISOString() ===
              lastReadTime.toISOString()
          ) {
            newUnreadCount = 0;
          }

          return {
            id: conversation.id,
            conversationReadId: conversation?.conversationReads[0]?.id,
            customerId: conversation.customerId,
            unreadCount: newUnreadCount,
            latestMessage,
          };
        })
      );

      res.locals.message = 'Conversations retrieved successfully.';
      res.locals.data = {
        pageNumber: Number(pageNumber),
        pageSize: Number(pageSize),
        itemsCount: paginatedConversations.length,
        count,
        conversations: result,
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Get('/customer/:customerId')
  public async getConversationByCustomer(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { dataSource } = req.app.locals;
      const { customerId } = req.params;

      if (!customerId) {
        throw new BadRequestError('Customer ID is required.');
      }

      const customerIdNumber = Number(customerId);

      const conversationRepository = dataSource.getRepository(Conversation);
      const messageRepository = dataSource.getRepository(Message);

      const conversation: Conversation | null =
        await conversationRepository.findOne({
          where: {
            customerId: customerIdNumber,
            conversationReads: { isAdmin: false },
          },
          relations: {
            conversationReads: {
              lastReadMessage: true,
            },
          },
        });

      if (!conversation) {
        throw new BadRequestError('Conversation does not exist.');
      }

      const lastReadTime =
        conversation.conversationReads[0]?.lastReadMessage?.createdAt ??
        conversation.conversationReads[0].updatedAt;

      const [unreadMessages, unreadCount] = await messageRepository
        .createQueryBuilder('message')
        .where('message.customerId IS NULL')
        .andWhere('message.conversationId = :conversationId', {
          conversationId: conversation.id,
        })
        .andWhere('message.createdAt > :lastReadTime', { lastReadTime })
        .getManyAndCount();

      let newUnreadCount = unreadCount;
      if (
        unreadCount === 1 &&
        unreadMessages[0].createdAt.toISOString() === lastReadTime.toISOString()
      ) {
        newUnreadCount = 0;
      }

      res.locals.message = 'Conversation retrieved successfully.';
      res.locals.data = {
        id: conversation.id,
        conversationReadId: conversation?.conversationReads[0]?.id,
        unreadCount: newUnreadCount,
      };

      next();
    } catch (error) {
      next(error);
    }
  }
}
