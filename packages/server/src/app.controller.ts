import {
  Controller,
  Get,
  Header,
  StreamableFile,
  Logger,
} from '@nestjs/common';
import { AppService } from './app.service';
import { createReadStream } from 'fs';
import { join } from 'path';
import { createGzip } from 'zlib';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  /**
   * 根据环境获取数据文件路径
   * 开发环境: 项目的public目录
   * 生产环境: 服务器的/home/data目录
   */
  private getDataFilePath(fileName: string): string {
    // 优先使用DATA_DIR环境变量，方便PM2启动时配置
    const dataDir = process.env.DATA_DIR;

    if (dataDir) {
      return join(dataDir, fileName);
    }

    // 如果没有设置DATA_DIR，则根据NODE_ENV环境变量判断
    const env = process.env.NODE_ENV || 'development';
    if (env === 'production') {
      return join('/home/data', fileName);
    } else {
      return join(process.cwd(), 'public', fileName);
    }
  }

  @Get('clustering-data')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Encoding', 'gzip')
  getClusteringData(): StreamableFile {
    this.logger.log('收到聚类数据请求');
    const filePath = this.getDataFilePath('clustering_data.csv');
    this.logger.log(`读取文件路径: ${filePath}`);

    const file = createReadStream(filePath);
    const gzip = createGzip();
    file.pipe(gzip);

    return new StreamableFile(gzip);
  }

  @Get('steady-state-data')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Encoding', 'gzip')
  getSteadyStateData(): StreamableFile {
    this.logger.log('收到稳态数据请求');
    const filePath = this.getDataFilePath('steady_state_data.csv');
    this.logger.log(`读取文件路径: ${filePath}`);

    const file = createReadStream(filePath);
    const gzip = createGzip();
    file.pipe(gzip);

    return new StreamableFile(gzip);
  }
}
