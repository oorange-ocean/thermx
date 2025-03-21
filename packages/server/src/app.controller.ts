import {
  Controller,
  Get,
  Header,
  StreamableFile,
  Logger,
  Param,
  Headers,
  Res,
} from '@nestjs/common';
import { AppService } from './app.service';
import { createReadStream } from 'fs';
import { join } from 'path';
import { createGzip } from 'zlib';
import { DataChunkingService } from './services/data-chunking.service';
import { Readable } from 'stream';
import { Response } from 'express';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    private readonly appService: AppService,
    private readonly dataChunkingService: DataChunkingService,
  ) {}

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

  @Get('/steady-state-data-metadata')
  async getSteadyStateDataMetadata() {
    this.logger.log('获取稳态数据元信息');
    return this.dataChunkingService.getDataMetadata('steady-state');
  }

  @Get('/clustering-data-metadata')
  async getClusteringDataMetadata() {
    this.logger.log('获取聚类数据元信息');
    return this.dataChunkingService.getDataMetadata('clustering');
  }

  @Get('/steady-state-data/:chunkId')
  @Header('Content-Type', 'application/json')
  @Header('Content-Encoding', 'gzip')
  async getSteadyStateDataChunk(
    @Param('chunkId') chunkId: string,
    @Headers('Range') range: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.logger.log(
      `获取稳态数据分片 ${chunkId}${range ? ` 带范围: ${range}` : ''}`,
    );

    try {
      const chunkData = await this.dataChunkingService.getDataChunk(
        'steady-state',
        parseInt(chunkId, 10),
      );

      const jsonData = JSON.stringify(chunkData);

      // 如果有Range头，处理部分内容请求
      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : jsonData.length - 1;

        response.statusCode = 206;
        response.setHeader(
          'Content-Range',
          `bytes ${start}-${end}/${jsonData.length}`,
        );
        response.setHeader('Accept-Ranges', 'bytes');

        const partialData = jsonData.slice(start, end + 1);

        const gzip = createGzip();
        const jsonStream = new Readable();
        jsonStream._read = () => {};
        jsonStream.push(partialData);
        jsonStream.push(null);

        jsonStream.pipe(gzip);
        return new StreamableFile(gzip);
      }

      // 常规响应
      response.setHeader('Accept-Ranges', 'bytes');

      const gzip = createGzip();
      const jsonStream = new Readable();
      jsonStream._read = () => {};
      jsonStream.push(jsonData);
      jsonStream.push(null);

      jsonStream.pipe(gzip);
      return new StreamableFile(gzip);
    } catch (error) {
      this.logger.error(`获取分片 ${chunkId} 失败: ${error.message}`);
      throw new Error(`分片获取失败: ${error.message}`);
    }
  }

  @Get('/clustering-data/:chunkId')
  @Header('Content-Type', 'application/json')
  @Header('Content-Encoding', 'gzip')
  async getClusteringDataChunk(@Param('chunkId') chunkId: string) {
    this.logger.log(`获取聚类数据分片 ${chunkId}`);

    const chunkData = await this.dataChunkingService.getDataChunk(
      'clustering',
      parseInt(chunkId, 10),
    );

    // 使用gzip压缩
    const gzip = createGzip();
    const jsonStream = new Readable();
    jsonStream._read = () => {}; // 实现_read方法
    jsonStream.push(JSON.stringify(chunkData));
    jsonStream.push(null);

    jsonStream.pipe(gzip);
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
}
