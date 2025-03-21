import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataChunkingService } from '../services/data-chunking.service';
import * as path from 'path';

@Injectable()
export class DataChunkingTask {
  private readonly logger = new Logger(DataChunkingTask.name);

  constructor(private readonly dataChunkingService: DataChunkingService) {}

  // 每天凌晨3点执行
  @Cron('0 0 3 * * *')
  async rebuildDataChunks() {
    this.logger.log('开始定期重建数据分片...');

    try {
      // 获取数据目录
      const dataDir =
        process.env.DATA_DIR || path.join(process.cwd(), 'public');

      // 重新分片稳态数据
      const steadyStateFilePath = path.join(dataDir, 'steady_state_data.csv');
      await this.dataChunkingService.chunkDataFile(
        steadyStateFilePath,
        'steady-state',
      );

      // 重新分片聚类数据
      const clusteringFilePath = path.join(dataDir, 'clustering_data.csv');
      await this.dataChunkingService.chunkDataFile(
        clusteringFilePath,
        'clustering',
      );

      this.logger.log('数据分片重建完成');
    } catch (error) {
      this.logger.error(`数据分片重建失败: ${error.message}`);
    }
  }
}
