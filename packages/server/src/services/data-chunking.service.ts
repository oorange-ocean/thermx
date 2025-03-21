import { Injectable, Logger } from '@nestjs/common';
import { createReadStream, createWriteStream, promises as fs } from 'fs';
import * as path from 'path';
import * as csv from 'csv-parser';

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
      this.logger.error(`创建分片目录失败: ${error.message}`);
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

    // 获取源文件信息
    const stats = await fs.stat(sourceFilePath);
    const totalSize = stats.size;

    // 首先读取并解析文件，计算记录总数和分片信息
    const records: any[] = [];
    await new Promise<void>((resolve, reject) => {
      createReadStream(sourceFilePath)
        .pipe(csv())
        .on('data', (data) => records.push(data))
        .on('end', () => resolve())
        .on('error', (error) => reject(error));
    });

    const totalRecords = records.length;
    const totalChunks = Math.ceil(totalRecords / this.CHUNK_SIZE);

    this.logger.log(
      `文件大小: ${totalSize}字节, 总记录数: ${totalRecords}, 分片数: ${totalChunks}`,
    );

    // 生成元数据
    const metadata = {
      fileType,
      totalSize,
      totalRecords,
      totalChunks,
      chunkSize: this.CHUNK_SIZE,
      lastModified: new Date().toISOString(),
      chunks: [] as any[],
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
  async getDataMetadata(fileType: 'steady-state' | 'clustering'): Promise<any> {
    try {
      const metadataPath = path.join(
        this.chunksDir,
        `${fileType}-metadata.json`,
      );
      const metadataContent = await fs.readFile(metadataPath, 'utf8');
      return JSON.parse(metadataContent);
    } catch (error) {
      this.logger.error(`获取 ${fileType} 元数据失败: ${error.message}`);
      throw new Error(`元数据不可用: ${error.message}`);
    }
  }

  /**
   * 获取特定的数据分片
   */
  async getDataChunk(
    fileType: 'steady-state' | 'clustering',
    chunkIndex: number,
  ): Promise<any> {
    try {
      const chunkPath = path.join(
        this.chunksDir,
        `${fileType}-chunk-${chunkIndex}.json`,
      );
      const chunkContent = await fs.readFile(chunkPath, 'utf8');
      return JSON.parse(chunkContent);
    } catch (error) {
      this.logger.error(
        `获取 ${fileType} 数据分片 ${chunkIndex} 失败: ${error.message}`,
      );
      throw new Error(`分片不可用: ${error.message}`);
    }
  }
}
