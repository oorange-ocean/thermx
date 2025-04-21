import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RealTimeData } from '../schemas/real-time-data.schema';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as csv from 'csv-parse/sync';
import * as iconv from 'iconv-lite';

type CsvRecord = Record<keyof RealTimeData, string>;

@Injectable()
export class RealTimeDataService implements OnModuleInit {
  constructor(
    @InjectModel(RealTimeData.name)
    private readonly realTimeDataModel: Model<RealTimeData>,
  ) {}

  async onModuleInit() {
    try {
      console.log('正在检查数据库中的数据...');
      const count = await this.realTimeDataModel.countDocuments();
      console.log(`当前数据库中有 ${count} 条记录`);

      if (count === 0) {
        console.log('数据库为空，开始导入CSV数据...');
        await this.importDataFromCsv();
      } else {
        console.log('数据库中已有数据，跳过导入步骤');
      }
    } catch (error) {
      console.error('初始化过程出错:', error);
      throw error;
    }
  }

  private async importDataFromCsv() {
    try {
      const filePath = join(__dirname, '..', '..', 'public', '蚌埠电厂.csv');
      console.log('CSV文件路径:', filePath);

      const buffer = readFileSync(filePath);
      console.log('成功读取CSV文件');

      const fileContent = iconv.decode(buffer, 'gb2312');
      console.log('成功解码CSV文件内容');

      const records = csv.parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }) as CsvRecord[];

      console.log(`成功解析CSV文件，共有 ${records.length} 条记录`);

      // 批量处理数据
      const batchSize = 1000; // 每批处理1000条记录
      const totalBatches = Math.ceil(records.length / batchSize);

      for (let i = 0; i < totalBatches; i++) {
        const start = i * batchSize;
        const end = Math.min((i + 1) * batchSize, records.length);
        const batch = records.slice(start, end);

        // 转换当前批次的数据
        const convertedBatch = batch.map((record) => {
          const converted = { ...record };
          for (const [key, value] of Object.entries(converted)) {
            if (key !== '时间' && typeof value === 'string') {
              converted[key] = Number(value);
            }
          }
          return converted;
        });

        // 导入当前批次
        await this.realTimeDataModel.insertMany(convertedBatch);
        console.log(
          `成功导入第 ${i + 1}/${totalBatches} 批数据（${start + 1} - ${end}）`,
        );
      }

      console.log(`所有数据导入完成，共导入 ${records.length} 条记录`);
    } catch (error) {
      console.error('导入CSV数据失败:', error);
      if (error instanceof Error) {
        console.error('错误详情:', error.message);
        console.error('错误堆栈:', error.stack);
      }
      throw error;
    }
  }

  async getLatestDayData(): Promise<RealTimeData[]> {
    // 获取最后一天的数据
    const lastRecord = await this.realTimeDataModel
      .findOne()
      .sort({ 时间: -1 })
      .exec();

    if (!lastRecord) {
      return [];
    }

    const lastDate = lastRecord.时间.split(' ')[0];
    return this.realTimeDataModel
      .find({
        时间: { $regex: new RegExp(`^${lastDate}`) },
      })
      .sort({ 时间: 1 })
      .exec();
  }
}
