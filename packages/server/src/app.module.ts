import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DataChunkingService } from './services/data-chunking.service';
import { DataChunkingInitializer } from './services/data-chunking-initializer.service';
import { ScheduleModule } from '@nestjs/schedule';
import { DataChunkingTask } from './tasks/data-chunking.task';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import databaseConfig from './config/database.config';
import {
  SteadyStatePeriodSchema,
  SteadyStateDetailSchema,
} from './schemas/steady-state.schema';
import { SteadyStateController } from './controllers/steady-state.controller';
import { SteadyStateService } from './services/steady-state.service';

// 为了解决 @nestjs/schedule 中的 crypto.randomUUID 错误
import * as crypto from 'crypto';
// @ts-ignore
global.crypto = global.crypto || {};
// @ts-ignore
global.crypto.randomUUID = global.crypto.randomUUID || crypto.randomUUID;

// 根据环境确定静态文件路径
const getStaticFilePath = () => {
  // 优先使用DATA_DIR环境变量，方便PM2启动时配置
  const dataDir = process.env.DATA_DIR;

  if (dataDir) {
    return dataDir;
  }

  // 如果没有设置DATA_DIR，则根据NODE_ENV环境变量判断
  const env = process.env.NODE_ENV || 'development';
  if (env === 'production') {
    return '/home/data';
  } else {
    return join(__dirname, '..', 'public');
  }
};

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('database.uri'),
        ...configService.get<Record<string, any>>('database.options'),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: 'SteadyStatePeriod', schema: SteadyStatePeriodSchema },
      { name: 'SteadyStateDetail', schema: SteadyStateDetailSchema },
    ]),
    ServeStaticModule.forRoot({
      rootPath: getStaticFilePath(),
      serveRoot: '/public',
    }),
    ScheduleModule.forRoot(),
  ],
  controllers: [AppController, SteadyStateController],
  providers: [
    AppService,
    DataChunkingService,
    DataChunkingInitializer,
    DataChunkingTask,
    SteadyStateService,
  ],
})
export class AppModule {}
