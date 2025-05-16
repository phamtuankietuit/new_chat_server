import { NextFunction, Request, Response } from 'express';
import Controller from '../decorators/controller';
import { Delete, Get, Post, Put } from '../decorators/handlers';
import { BadRequestError } from '../utils/errors';
import { FastMessage } from '../database/entities/FastMessage';
import { ILike, Not } from 'typeorm';

@Controller('/fast-messages')
export default class FastMessageController {
  @Post('/')
  public async createFastMessage(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { dataSource } = req.app.locals;
      const { shorthand, body } = req.body;

      const fastMessageRepository = dataSource.getRepository(FastMessage);

      const existingFastMessage = await fastMessageRepository.findOne({
        where: { shorthand },
      });
      if (existingFastMessage) {
        throw new BadRequestError(
          'Fast message with this shorthand already exists.'
        );
      }

      const fastMessage: FastMessage = fastMessageRepository.create({
        shorthand,
        body,
        createdBy: 'system',
      });
      await fastMessageRepository.save(fastMessage);

      res.locals.message = 'Fast message created successfully.';
      res.locals.data = {
        fastMessage,
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Get('/')
  public async getFastMessages(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { dataSource } = req.app.locals;
      const {
        pageNumber = 1,
        pageSize = 20,
        searchQuery,
        sortBy = 'shorthand',
        sortDirection = 'asc',
      } = req.query;

      const fastMessageRepository = dataSource.getRepository(FastMessage);

      const [fastMessages, count] = await fastMessageRepository.findAndCount({
        where: {
          shorthand: searchQuery ? ILike(`%${searchQuery}%`) : undefined,
        },
        order: {
          [sortBy as keyof FastMessage]:
            sortDirection === 'asc' ? 'ASC' : 'DESC',
        },
        skip: (Number(pageNumber) - 1) * Number(pageSize),
        take: Number(pageSize),
      });

      res.locals.message = 'Fast messages retrieved successfully.';
      res.locals.data = {
        pageNumber: Number(pageNumber),
        pageSize: Number(pageSize),
        itemsCount: fastMessages.length,
        count,
        fastMessages,
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Put('/:id')
  public async updateFastMessage(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { dataSource } = req.app.locals;
      const { id } = req.params;
      const { shorthand, body } = req.body;

      const fastMessageRepository = dataSource.getRepository(FastMessage);

      const existingFastMessage: FastMessage | null =
        await fastMessageRepository.findOne({
          where: { id: Not(id), shorthand },
        });
      if (existingFastMessage) {
        throw new BadRequestError(
          'Fast message with this shorthand already exists.'
        );
      }

      const fastMessage: FastMessage | null =
        await fastMessageRepository.findOne({
          where: { id },
        });
      if (!fastMessage) {
        throw new BadRequestError('Fast message not found.');
      }

      fastMessageRepository.merge(fastMessage, {
        shorthand,
        body,
      });
      await fastMessageRepository.save(fastMessage);

      res.locals.message = 'Fast message updated successfully.';
      res.locals.data = {
        fastMessage: fastMessage,
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Delete('/:id')
  public async deleteFastMessage(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { dataSource } = req.app.locals;
      const { id } = req.params;

      const fastMessageRepository = dataSource.getRepository(FastMessage);

      const fastMessage: FastMessage | null =
        await fastMessageRepository.findOne({
          where: { id },
        });
      if (!fastMessage) {
        throw new BadRequestError('Fast message not found.');
      }

      await fastMessageRepository.remove(fastMessage);

      res.locals.message = 'Fast message deleted successfully.';
      res.locals.data = {
        fastMessage,
      };

      next();
    } catch (error) {
      next(error);
    }
  }
}
