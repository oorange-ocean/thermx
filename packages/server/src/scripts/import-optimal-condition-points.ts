import { parse } from 'csv-parse/sync';
import * as fs from 'fs';
import { join } from 'path';
import { connect, model } from 'mongoose';
import {
  OptimalConditionPoint,
  OptimalConditionPointSchema,
} from '../schemas/optimal-condition.schema';

interface CsvRow {
  稳态区间编号: string;
  Cluster: string;
  平均机组负荷: string;
  平均热耗率: string;
  锅炉效率: string;
  语义标签: string;
  综合评分: string;
}

const OptimalConditionPointModel = model<OptimalConditionPoint>(
  'OptimalConditionPoint',
  OptimalConditionPointSchema,
);

async function importData() {
  try {
    // 连接数据库
    await connect('mongodb://localhost:27017/thermx');
    console.log('数据库连接成功');

    // 清除旧数据
    await OptimalConditionPointModel.deleteMany({});
    console.log('旧数据清除完成');

    const csvFilePath = join(
      __dirname,
      '../../public/optimal_condition_points.csv',
    );
    const fileContent = fs.readFileSync(csvFilePath, 'utf-8');

    // 创建CSV解析器
    const parseSync = parse as (input: string, options?: any) => CsvRow[];
    const rows = parseSync(fileContent, {
      columns: true,
      skip_empty_lines: true,
    });

    // 处理每一行数据
    for (const row of rows) {
      await OptimalConditionPointModel.create({
        period_id: parseInt(row['稳态区间编号']),
        cluster: parseInt(row['Cluster']),
        avg_unit_load: parseFloat(row['平均机组负荷']),
        avg_heat_rate: parseFloat(row['平均热耗率']),
        boiler_efficiency: parseFloat(row['锅炉效率']),
        semantic_label: row['语义标签'],
        comprehensive_score: parseFloat(row['综合评分']),
      });
    }

    console.log('数据导入完成');
    process.exit(0);
  } catch (error) {
    console.error('数据导入失败:', error);
    process.exit(1);
  }
}

importData().catch((error) => {
  console.error('程序执行失败:', error);
  process.exit(1);
});
