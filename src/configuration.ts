import 'dotenv/config';

interface ConfigValues {
  env: string;
  port: number;
  dbHost: string;
  dbPort: number;
  dbUsername: string;
  dbPassword: string;
  dbDatabase: string;
  dbSynchronize: boolean;
  dbLogging: boolean;
  dbEntitiesDir: string;
  dbSubscribersDir: string;
  dbMigrationsDir: string;
  jwtAccessKey: string;
  jwtRefreshKey: string;
  clientSites: string[];
  encryptionKey: string | undefined;
}

class Config implements ConfigValues {
  env = process.env.NODE_ENV ?? 'development';
  port = parseInt(process.env.PORT ?? '4000', 10);
  dbHost = process.env.DB_HOST ?? 'localhost';
  dbPort = parseInt(process.env.DB_PORT ?? '5432', 10);
  dbUsername = process.env.DB_USERNAME ?? 'postgres';
  dbPassword = process.env.DB_PASSWORD ?? 'postgres';
  dbDatabase = process.env.DB_DATABASE ?? 'erp-redesign';
  dbSynchronize = process.env.DB_SYNCHRONIZE
    ? process.env.DB_SYNCHRONIZE === 'true'
    : true;
  dbLogging = process.env.DB_LOGGING ? process.env.DB_LOGGING === 'true' : true;
  dbEntitiesDir = process.env.DB_ENTITIES_DIR ?? 'src/database/entities/*.ts';
  dbSubscribersDir =
    process.env.DB_SUBSCRIBERS_DIR ?? 'src/database/subscribers/*.ts';
  dbMigrationsDir =
    process.env.DB_MIGRATIONS_DIR ?? 'src/database/migrations/*.ts';
  jwtAccessKey = process.env.JWT_ACCESS_KEY ?? 'THIS IS ACCESS KEY';
  jwtRefreshKey = process.env.JWT_REFRESH_KEY ?? 'THIS IS REFRESH KEY';
  clientSites = (process.env.CLIENT_SITES ?? 'http://localhost:3030')?.split(
    ','
  );
  encryptionKey = process.env.ENCRYPTION_KEY;
}

export default new Config();
