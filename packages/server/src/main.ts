import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { join } from 'path';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const env = process.env.NODE_ENV || 'development';
  const dataDir = process.env.DATA_DIR;

  logger.log(`当前环境: ${env}`);

  if (dataDir) {
    logger.log(`数据文件目录(来自环境变量): ${dataDir}`);
  } else if (env === 'production') {
    logger.log('数据文件目录: /home/data');
  } else {
    logger.log(`数据文件目录: ${join(process.cwd(), 'public')}`);
  }

  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT ?? 5001;
  await app.listen(port);
  logger.log(`应用已启动，监听端口: ${port}`);
}
bootstrap();
