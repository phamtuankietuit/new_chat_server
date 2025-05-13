import 'express';
import { Server, Socket } from 'socket.io';
import { DataSource } from 'typeorm';

declare global {
  namespace Express {
    interface Locals {
      dataSource: DataSource;
      socket: Socket;
      ioSocket: Server;
    }
  }
}
