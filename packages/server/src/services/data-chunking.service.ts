import { Injectable, Logger } from '@nestjs/common';
import { createReadStream, promises as fs } from 'fs';
import * as path from 'path';
import * as csv from 'csv-parser';

// Define interfaces for structured data
interface BaseRecord {
  [key: string]: string; // CSVs are initially parsed as strings
}

// Specific structure for steady_state_data.csv records (adjust fields as necessary)
export interface SteadyStateCsvRecord extends BaseRecord {
  稳态区间编号: string;
  时间: string;
  主汽压力: string;
  主汽温度: string;
  再热温度: string;
  汽轮机热耗率q: string;
  // Add other fields if they exist in steady_state_data.csv
}

// Specific structure for clustering_data.csv records (adjust fields as necessary)
export interface ClusteringCsvRecord extends BaseRecord {
  Cluster: string;
  稳态区间编号: string;
  // feature_0 ... feature_63 are implicitly covered by BaseRecord
  // Add other specific fields if they exist in clustering_data.csv
}

export type CsvRecord = SteadyStateCsvRecord | ClusteringCsvRecord;

export interface ChunkInfo {
  index: number;
  fileName: string;
  recordCount: number;
  startRecord: number;
  endRecord: number;
}

export interface ChunkMetadata {
  fileType: 'steady-state' | 'clustering';
  totalSize: number;
  totalRecords: number;
  totalChunks: number;
  chunkSize: number;
  lastModified: string;
  chunks: ChunkInfo[];
}

@Injectable()
export class DataChunkingService {
  private readonly logger = new Logger(DataChunkingService.name);
  private readonly chunksDir: string;
  private readonly CHUNK_SIZE = 5000; // 每个分片的记录数

  constructor() {
    // 从环境变量获取数据目录
    const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'public');
    this.chunksDir = path.join(dataDir, 'chunks');
    this.ensureChunksDirExists();
  }

  private async ensureChunksDirExists() {
    try {
      await fs.mkdir(this.chunksDir, { recursive: true });
    } catch (error) {
      const err = error as Error;
      this.logger.error(`创建分片目录失败: ${err.message}`);
    }
  }

  /**
   * 清理指定类型的分片文件
   */
  private async cleanupChunks(
    fileType: 'steady-state' | 'clustering',
  ): Promise<void> {
    try {
      const files = await fs.readdir(this.chunksDir);
      const pattern = new RegExp(
        `^${fileType}-(chunk-\\d+\\.json|metadata\\.json)$`,
      );

      for (const file of files) {
        if (pattern.test(file)) {
          const filePath = path.join(this.chunksDir, file);
          await fs.unlink(filePath);
          this.logger.log(`已删除旧分片文件: ${file}`);
        }
      }
    } catch (error) {
      const err = error as Error;
      this.logger.error(`清理分片文件失败: ${err.message}`);
      throw err;
    }
  }

  /**
   * 预处理和分片CSV文件
   * @param sourceFilePath 源CSV文件路径
   * @param fileType 文件类型标识 ('steady-state' 或 'clustering')
   */
  async chunkDataFile(
    sourceFilePath: string,
    fileType: 'steady-state' | 'clustering',
  ): Promise<void> {
    this.logger.log(`开始对 ${fileType} 数据进行分片处理...`);

    // 首先清理旧的分片文件
    await this.cleanupChunks(fileType);

    // 获取源文件信息
    const stats = await fs.stat(sourceFilePath);
    const totalSize = stats.size;

    // 首先读取并解析文件，计算记录总数和分片信息
    const records: CsvRecord[] = [];
    await new Promise<void>((resolve, reject) => {
      createReadStream(sourceFilePath)
        .pipe(csv())
        .on('data', (data) => records.push(data as CsvRecord))
        .on('end', () => resolve())
        .on('error', (error) => reject(error));
    });

    const totalRecords = records.length;
    const totalChunks = Math.ceil(totalRecords / this.CHUNK_SIZE);

    this.logger.log(
      `文件大小: ${totalSize}字节, 总记录数: ${totalRecords}, 分片数: ${totalChunks}`,
    );

    // 生成元数据
    const metadata: ChunkMetadata = {
      fileType,
      totalSize,
      totalRecords,
      totalChunks,
      chunkSize: this.CHUNK_SIZE,
      lastModified: new Date().toISOString(),
      chunks: [],
    };

    // 创建分片文件
    for (let i = 0; i < totalChunks; i++) {
      const start = i * this.CHUNK_SIZE;
      const end = Math.min(start + this.CHUNK_SIZE, totalRecords);
      const chunkRecords = records.slice(start, end);

      const chunkFileName = `${fileType}-chunk-${i}.json`;
      const chunkFilePath = path.join(this.chunksDir, chunkFileName);

      // 保存为JSON格式，更高效
      await fs.writeFile(chunkFilePath, JSON.stringify(chunkRecords));

      // 记录分片信息
      metadata.chunks.push({
        index: i,
        fileName: chunkFileName,
        recordCount: chunkRecords.length,
        startRecord: start,
        endRecord: end - 1,
      });
    }

    // 保存元数据
    const metadataPath = path.join(this.chunksDir, `${fileType}-metadata.json`);
    await fs.writeFile(metadataPath, JSON.stringify(metadata));

    this.logger.log(`${fileType} 数据分片完成. 元数据已保存到 ${metadataPath}`);
  }

  /**
   * 获取数据文件的元数据
   */
  async getDataMetadata(
    fileType: 'steady-state' | 'clustering',
  ): Promise<ChunkMetadata> {
    try {
      const metadataPath = path.join(
        this.chunksDir,
        `${fileType}-metadata.json`,
      );
      const metadataContent = await fs.readFile(metadataPath, 'utf8');
      return JSON.parse(metadataContent) as ChunkMetadata;
    } catch (error) {
      const err = error as Error; // Type assertion
      this.logger.error(`获取 ${fileType} 元数据失败: ${err.message}`);
      throw new Error(`元数据不可用: ${err.message}`);
    }
  }

  /**
   * 获取特定的数据分片
   */
  async getDataChunk(
    fileType: 'steady-state' | 'clustering',
    chunkIndex: number,
  ): Promise<CsvRecord[]> {
    try {
      const chunkPath = path.join(
        this.chunksDir,
        `${fileType}-chunk-${chunkIndex}.json`,
      );
      const chunkContent = await fs.readFile(chunkPath, 'utf8');
      return JSON.parse(chunkContent) as CsvRecord[];
    } catch (error) {
      const err = error as Error; // Type assertion
      this.logger.error(
        `获取 ${fileType} 数据分片 ${chunkIndex} 失败: ${err.message}`,
      );
      throw new Error(`分片不可用: ${err.message}`);
    }
  }
}
