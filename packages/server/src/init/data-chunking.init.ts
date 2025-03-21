import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataChunkingService } from '../services/data-chunking.service';
import * as path from 'path';

@Injectable()
export class DataChunkingInitializer implements OnModuleInit {
  private readonly logger = new Logger(DataChunkingInitializer.name);

  constructor(private readonly dataChunkingService: DataChunkingService) {}

  async onModuleInit() {
    this.logger.log('开始初始化数据分片...');

    try {
      // 获取数据目录
      const dataDir =
        process.env.DATA_DIR || path.join(process.cwd(), 'public');

      // 分片稳态数据
      const steadyStateFilePath = path.join(dataDir, 'steady_state_data.csv');
      await this.dataChunkingService.chunkDataFile(
        steadyStateFilePath,
        'steady-state',
      );

      // 分片聚类数据
      const clusteringFilePath = path.join(dataDir, 'clustering_data.csv');
      await this.dataChunkingService.chunkDataFile(
        clusteringFilePath,
        'clustering',
      );

      this.logger.log('数据分片初始化完成');
    } catch (error) {
      this.logger.error(`数据分片初始化失败: ${error.message}`);
    }
  }
}
