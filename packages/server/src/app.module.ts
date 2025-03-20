import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';

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
    ServeStaticModule.forRoot({
      rootPath: getStaticFilePath(),
      serveRoot: '/public',
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
