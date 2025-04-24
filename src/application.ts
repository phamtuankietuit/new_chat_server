import express, {
  Application as ExApplication,
  Handler,
  NextFunction,
  Request,
  Response,
} from 'express';
import cors from 'cors';
import morgan from './middlewares/morgan';
import { appRouters } from './routers';
import {
  BadRequestError,
  ForbiddenError,
  GoneError,
  InternalServerError,
  MethodNotAllowedError,
  NotAcceptableError,
  NotFoundError,
  UnauthorizedError,
} from './utils/errors';
import { MetadataKeys } from './utils/enums';
import config from './configuration';
import { IRouter } from './decorators/handlers';

class Application {
  private readonly _instance: ExApplication;

  get instance(): ExApplication {
    return this._instance;
  }

  constructor() {
    this._instance = express();
    this._instance.use(morgan);
    this._instance.use(express.json());
    this._instance.use(express.urlencoded({ extended: false }));
    this._instance.use(
      cors({
        origin: config.clientSite,
        credentials: true,
      })
    );
    this.middleware();
    this.registerRouters();
    this.handleErrors();
  }

  private middleware(): void {
    this._instance.use(
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          next();
        } catch (error) {
          console.log(error);

          next(error);
        }
      }
    );
  }

  private registerRouters(): void {
    for (const appRouter of appRouters) {
      const { rootPath, controllers } = appRouter;

      for (const controller of controllers) {
        const controllerClass = controller;
        const controllerInstance: { [handleName: string]: Handler } =
          new controllerClass() as any;

        const basePath: string = Reflect.getMetadata(
          MetadataKeys.BASE_PATH,
          controllerClass
        );

        const routers: IRouter[] = Reflect.getMetadata(
          MetadataKeys.ROUTERS,
          controllerClass
        );

        const exRouter = express.Router();

        for (const { method, path, handlerName } of routers) {
          exRouter[method](
            path,
            controllerInstance[String(handlerName)].bind(controllerInstance),
            (req: Request, res: Response) => {
              res.json({
                status: 200,
                success: true,
                message: res.locals.message ?? 'Success',
                data: res.locals.data ?? null,
                session: res.locals.session,
              });
            }
          );
        }

        this._instance.use(`${rootPath}${basePath}`, exRouter);
      }
    }
  }

  private handleErrors(): void {
    this._instance.use(
      (err: Error, req: Request, res: Response, next: NextFunction) => {
        let statusCode = 503;
        if (err instanceof BadRequestError) {
          statusCode = 400;
        } else if (err instanceof UnauthorizedError) {
          statusCode = 401;
        } else if (err instanceof ForbiddenError) {
          statusCode = 403;
        } else if (err instanceof NotFoundError) {
          statusCode = 404;
        } else if (err instanceof MethodNotAllowedError) {
          statusCode = 405;
        } else if (err instanceof NotAcceptableError) {
          statusCode = 406;
        } else if (err instanceof GoneError) {
          statusCode = 410;
        } else if (err instanceof InternalServerError) {
          statusCode = 500;
        }

        res.status(statusCode).json({
          status: statusCode,
          success: false,
          message: err.message || 'Failure',
          data: null,
        });
      }
    );
  }
}

export default new Application();
