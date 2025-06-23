import { NextFunction, Request, Response } from 'express';
import Controller from '../decorators/controller';
import { Get, Post } from '../decorators/handlers';
import { Message, MessageContentTypes } from '../database/entities/Message';
import { Conversation } from '../database/entities/Conversation';
import { BadRequestError } from '../utils/errors';
import { omit } from '../utils';
import { LessThan } from 'typeorm';
import axios from 'axios';
import configuration from '../configuration';

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
      const {
        conversationId,
        customerId,
        contentType,
        body,
        isBranchAddressQuery = false,
        isProductQuery = false,
        productId,
        token,
      } = req.body;

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

      if (isBranchAddressQuery && token) {
        try {
          const response = await axios.get(
            `${configuration.mainBEUrl}/api/branches?sortBy=Name&sortDirection=asc&pageNumber=1&pageSize=10000`,
            {
              headers: {
                Authorization: 'Bearer ' + token,
              },
            }
          );

          if (response.data.items.length > 0) {
            const content: string = response.data.items
              .map(
                (item: any) =>
                  `<li><strong>${item.name}</strong>: ${item.address.formattedAddress}</li>`
              )
              .join('');

            const newBody = `
                        <span style="font-size: 14px;">
                            <strong>Các chi nhánh của KKBooks:</strong>
                        </span>
                        <ul>${content}</ul>`;

            const systemMessage: Message = messageRepository.create({
              contentType: MessageContentTypes.TEXT,
              body: newBody,
              conversation,
              markdown: true,
              createdBy: 'auto-system',
            });

            await messageRepository.save(systemMessage);

            if (ioSocket) {
              ioSocket.emit('message', {
                ...omit(systemMessage, ['conversation']),
                conversationId: conversation.id,
                assignee: {
                  id: 'auto-system',
                },
              });
            }
          }
        } catch (error: any) {
          console.error(
            error.response?.data || error.message || 'Unknown error'
          );
        }
      }

      if (isProductQuery && token && productId) {
        try {
          const response = await axios.get(
            `${configuration.mainBEUrl}/api/products/${productId}`,
            {
              headers: {
                Authorization: 'Bearer ' + token,
              },
            }
          );

          if (response.data) {
            const product = response.data;            // Generate product variants content
            let variantsContent = '';
            if (product.productVariants && product.productVariants.length > 0) {
              variantsContent = product.productVariants
                .map((variant: any) => {
                  // Generate variant label based on all option values
                  let variantLabel = '';
                  if (variant.optionValues && variant.optionValues.length > 0) {
                    const optionTexts = variant.optionValues.map(
                      (opt: any) => `${opt.name}: ${opt.value}`
                    );
                    variantLabel = optionTexts.join(', ');
                  } else {
                    variantLabel = 'Phiên bản mặc định';
                  }

                  let stockContent = '';
                  if (
                    variant.stockBreakdowns &&
                    variant.stockBreakdowns.length > 0
                  ) {
                    stockContent = variant.stockBreakdowns
                      .map(
                        (stock: any) =>
                          `<li>${stock.branchName}: ${stock.stockQuantity}</li>`
                      )
                      .join('');
                  }
                  return `
                  <div style="margin-bottom: 6px;">
                    <div style="font-weight: bold; color: #333; margin-bottom: 2px;">${variantLabel}:</div>
                    <ul style="margin: 0; padding-left: 16px; font-size: 12px; color: #666;">
                      ${stockContent}
                    </ul>
                  </div>`;
                })
                .join('');
            }
            const newBody = `
              <div style="display: flex; flex-direction: column; max-width: 100%; text-align: left;">                <div style="display: flex; justify-content: center; margin-bottom: 10px;">
                  <img
                    src="${
                      product.thumbnailImageUrls?.[0] ||
                      product.largeImageUrls?.[0] ||
                      ''
                    }"
                    alt="${product.name || ''}"
                    width="100"
                    height="50"
                    style="border-radius: 4px; object-fit: cover;" />
                </div>

                <div style="text-align: left;">
                  <div style="font-weight: bold; font-size: 14px; margin-bottom: 8px; line-height: 1.3;">
                    ${product.name || 'Tên sản phẩm không xác định'}
                  </div>
                  <div style="font-size: 13px;">
                    ${variantsContent}
                  </div>
                </div>
              </div>`;

            const systemMessage: Message = messageRepository.create({
              contentType: MessageContentTypes.TEXT,
              body: newBody,
              conversation,
              markdown: true,
              createdBy: 'auto-system',
            });

            await messageRepository.save(systemMessage);

            if (ioSocket) {
              ioSocket.emit('message', {
                ...omit(systemMessage, ['conversation']),
                conversationId: conversation.id,
                assignee: {
                  id: 'auto-system',
                },
              });
            }
          }
        } catch (error: any) {
          console.error(
            error.response?.data || error.message || 'Unknown error'
          );
        }
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
