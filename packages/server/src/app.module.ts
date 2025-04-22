import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DataChunkingService } from './services/data-chunking.service';
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
import { RealTimeDataService } from './services/real-time-data.service';
import { RealTimeDataGateway } from './gateways/real-time-data.gateway';
import {
  RealTimeData,
  RealTimeDataSchema,
} from './schemas/real-time-data.schema';
import { OptimalConditionController } from './controllers/optimal-condition.controller';
import { OptimalConditionService } from './services/optimal-condition.service';
import { OptimalConditionPointSchema } from './schemas/optimal-condition.schema';

// 为了解决 @nestjs/schedule 中的 crypto.randomUUID 错误
import * as crypto from 'crypto';

declare global {
  interface Crypto {
    randomUUID(): string;
  }
}

global.crypto = global.crypto || {};
if (!global.crypto.randomUUID) {
  global.crypto.randomUUID = () => crypto.randomUUID();
}

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
      { name: RealTimeData.name, schema: RealTimeDataSchema },
      { name: 'OptimalConditionPoint', schema: OptimalConditionPointSchema },
    ]),
    ServeStaticModule.forRoot({
      rootPath: getStaticFilePath(),
      serveRoot: '/public',
    }),
    ScheduleModule.forRoot(),
  ],
  controllers: [
    AppController,
    SteadyStateController,
    OptimalConditionController,
  ],
  providers: [
    AppService,
    DataChunkingService,
    DataChunkingTask,
    SteadyStateService,
    RealTimeDataService,
    RealTimeDataGateway,
    OptimalConditionService,
  ],
})
export class AppModule {}
