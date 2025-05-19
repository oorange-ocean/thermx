import {
  Controller,
  Get,
  Header,
  StreamableFile,
  Logger,
  Param,
  Headers,
  Res,
  OnModuleInit,
} from '@nestjs/common';
import { AppService } from './app.service';
import { createReadStream } from 'fs';
import { join } from 'path';
import { createGzip } from 'zlib';
import { DataChunkingService } from './services/data-chunking.service';
import { Readable } from 'stream';
import { Response } from 'express';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OptimalConditionPoint } from './schemas/optimal-condition.schema';
import { exec } from 'child_process';
import { promisify } from 'util';

@Controller()
export class AppController implements OnModuleInit {
  private readonly logger = new Logger(AppController.name);
  private readonly execAsync = promisify(exec);

  constructor(
    private readonly appService: AppService,
    private readonly dataChunkingService: DataChunkingService,
    @InjectModel('OptimalConditionPoint')
    private readonly optimalConditionPointModel: Model<OptimalConditionPoint>,
  ) {}

  async onModuleInit() {
    try {
      this.logger.log('开始初始化数据...');

      // 检查最优条件点数据是否存在
      const optimalPointsCount =
        await this.optimalConditionPointModel.countDocuments();
      if (optimalPointsCount === 0) {
        this.logger.log('未检测到最优条件点数据，开始导入...');
        try {
          await this.execAsync(
            'pnpm --filter server run import-optimal-points',
          );
          this.logger.log('最优条件点数据导入完成');
        } catch (error) {
          const err = error as Error;
          this.logger.error(`最优条件点数据导入失败: ${err.message}`);
        }
      }

      // 初始化数据分片
      this.logger.log('开始初始化数据分片...');
      await this.initializeDataChunks();
      this.logger.log('数据分片初始化完成');
    } catch (error) {
      const err = error as Error;
      this.logger.error(`初始化失败: ${err.message}`);
    }
  }

  private async initializeDataChunks() {
    try {
      // 处理稳态数据
      const steadyStatePath = this.getDataFilePath('steady_state_data.csv');
      this.logger.log(`开始处理稳态数据: ${steadyStatePath}`);
      await this.dataChunkingService.chunkDataFile(
        steadyStatePath,
        'steady-state',
      );
      this.logger.log('稳态数据处理完成');

      // 处理聚类数据
      const clusteringPath = this.getDataFilePath('clustering_data.csv');
      this.logger.log(`开始处理聚类数据: ${clusteringPath}`);
      await this.dataChunkingService.chunkDataFile(
        clusteringPath,
        'clustering',
      );
      this.logger.log('聚类数据处理完成');
    } catch (error) {
      const err = error as Error;
      this.logger.error(`数据处理失败: ${err.message}`);
      throw error;
    }
  }

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
  async getSteadyStateDataMetadata(): Promise<Record<string, unknown>> {
    this.logger.log('获取稳态数据元信息');
    return this.dataChunkingService.getDataMetadata('steady-state');
  }

  @Get('/clustering-data-metadata')
  async getClusteringDataMetadata(): Promise<Record<string, unknown>> {
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
  ): Promise<StreamableFile> {
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
      const err = error as Error;
      this.logger.error(`获取分片 ${chunkId} 失败: ${err.message}`);
      throw new Error(`分片获取失败: ${err.message}`);
    }
  }

  @Get('/clustering-data/:chunkId')
  @Header('Content-Type', 'application/json')
  @Header('Content-Encoding', 'gzip')
  async getClusteringDataChunk(
    @Param('chunkId') chunkId: string,
  ): Promise<StreamableFile> {
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
