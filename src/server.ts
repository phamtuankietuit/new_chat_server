import { createServer } from 'http';
import 'reflect-metadata';
import { Server } from 'socket.io';

import application from './application';
import Logger from './utils/logger';
import { AppDataSource } from './database/data-source';
import configuration from './configuration';

const { instance: app } = application;

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || configuration.clientSites.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  },
});

io.on('connection', (socket) => {
  app.locals.socket = socket;

  Logger.info(`Socket.IO start with id: ${socket.id}`);
  socket.on('disconnect', (reason) => {
    Logger.info(`Socket.IO end by ${reason}`);
  });
});

app.locals.ioSocket = io;

httpServer.listen(configuration.port, () => {
  Logger.info(`Server is listening on :${configuration.port}`);
});

AppDataSource.initialize()
  .then(() => {
    Logger.info('Data Source has been initialized!');
  })
  .catch((error) => {
    Logger.error('Error during Data Source initialization:', error);
  });

app.locals.dataSource = AppDataSource;
