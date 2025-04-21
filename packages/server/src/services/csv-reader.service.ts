import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as csv from 'csv-parse/sync';
import { RealTimeData, CsvRecord } from '../types/real-time-data.types';
import * as iconv from 'iconv-lite';

@Injectable()
export class CsvReaderService {
  private mockData: RealTimeData[] = [];

  constructor() {
    this.loadMockData();
  }

  private loadMockData() {
    try {
      const filePath = join(__dirname, '..', '..', 'public', '蚌埠电厂.csv');
      const buffer = readFileSync(filePath);
      const fileContent = iconv.decode(buffer, 'gb2312');

      // 解析 CSV 文件
      const records = csv.parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }) as CsvRecord[];

      // 获取最后一天的数据
      const lastDate = records[records.length - 1]['时间'].split(' ')[0];
      const lastDayRecords = records.filter((record) =>
        record['时间'].startsWith(lastDate),
      );

      // 转换为强类型数据
      this.mockData = lastDayRecords.map((record) => ({
        时间: record.时间,
        机组负荷: Number(record.机组负荷),
        汽轮机热耗率q: Number(record.汽轮机热耗率q),
        修正后热耗率q: Number(record.修正后热耗率q),
        修正系数: Number(record.修正系数),
        高压缸效率: Number(record.高压缸效率),
        中压缸效率: Number(record.中压缸效率),
        锅炉效率: Number(record.锅炉效率),
        厂用电率: Number(record.厂用电率),
        低压缸排汽压力: Number(record.低压缸排汽压力),
        一段抽汽压力: Number(record.一段抽汽压力),
        二段抽汽压力: Number(record.二段抽汽压力),
        三段抽汽压力: Number(record.三段抽汽压力),
        四段抽汽压力: Number(record.四段抽汽压力),
        中压缸排汽压力: Number(record.中压缸排汽压力),
        主凝结水压力: Number(record.主凝结水压力),
        主汽压力: Number(record.主汽压力),
        高压缸排汽压力: Number(record.高压缸排汽压力),
        再热减温水总管压力: Number(record.再热减温水总管压力),
        再热汽压力: Number(record.再热汽压力),
        吹灰蒸汽压力: Number(record.吹灰蒸汽压力),
        省煤器进口给水压力: Number(record.省煤器进口给水压力),
        给泵出口母管压力: Number(record.给泵出口母管压力),
        主给水流量c: Number(record.主给水流量c),
        主给水流量: Number(record.主给水流量),
        主蒸汽流量: Number(record.主蒸汽流量),
        再减流量: Number(record.再减流量),
        减温水流量: Number(record.减温水流量),
        凝结水流量: Number(record.凝结水流量),
        凝结水补水流量: Number(record.凝结水补水流量),
        Dms: Number(record.Dms),
        Dgp: Number(record.Dgp),
        Drh: Number(record.Drh),
        Dmfs: Number(record.Dmfs),
        D1: Number(record.D1),
        D2: Number(record.D2),
        D3: Number(record.D3),
        D4: Number(record.D4),
        '1号高加出水温度': Number(record['1号高加出水温度']),
        '1号高加疏水温度': Number(record['1号高加疏水温度']),
        '2号高加出水温度': Number(record['2号高加出水温度']),
        '2号高加疏水温度': Number(record['2号高加疏水温度']),
        '3号高加出水温度': Number(record['3号高加出水温度']),
        '3号高加疏水温度': Number(record['3号高加疏水温度']),
        '3号高加进水温度': Number(record['3号高加进水温度']),
        '3号高加进汽温度': Number(record['3号高加进汽温度']),
        一段抽汽温度: Number(record.一段抽汽温度),
        二段抽汽温度: Number(record.二段抽汽温度),
        三段抽汽温度: Number(record.三段抽汽温度),
        主蒸汽母管温度: Number(record.主蒸汽母管温度),
        再热减温水总管温度: Number(record.再热减温水总管温度),
        再热汽母管温度: Number(record.再热汽母管温度),
        省煤器进口给水温度: Number(record.省煤器进口给水温度),
        除氧器下水温度1: Number(record.除氧器下水温度1),
        除氧器下水温度2: Number(record.除氧器下水温度2),
        除氧器进水温度: Number(record.除氧器进水温度),
        除氧器进汽温度: Number(record.除氧器进汽温度),
        高压缸排汽温度: Number(record.高压缸排汽温度),
        A汽泵密封水阀位: Number(record.A汽泵密封水阀位),
        B汽泵密封水阀位: Number(record.B汽泵密封水阀位),
        GV1阀位: Number(record.GV1阀位),
        GV2阀位: Number(record.GV2阀位),
        GV3阀位: Number(record.GV3阀位),
        GV4阀位: Number(record.GV4阀位),
      }));

      console.log(`成功加载了 ${this.mockData.length} 条模拟数据`);
      if (this.mockData.length === 0) {
        console.warn(
          '警告：模拟数据为空，这可能导致前端显示"无可用模拟数据"错误',
        );
      }
    } catch (error: unknown) {
      console.error('读取 CSV 文件失败:', error);
      if (error instanceof Error) {
        console.error('错误详情:', error.message);
        console.error('错误堆栈:', error.stack);
      }
      this.mockData = [];
    }
  }

  getMockData(): RealTimeData[] {
    return this.mockData;
  }
}
