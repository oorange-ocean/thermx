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
      trim: true,
      skipRecordsWithError: true,
    });

    console.log('CSV解析完成，总行数:', rows.length);
    if (rows.length > 0) {
      console.log('第一行数据示例:', JSON.stringify(rows[0], null, 2));
      console.log('第一行数据的键:', Object.keys(rows[0]));
    }

    // 处理每一行数据
    for (const row of rows) {
      // 添加调试日志
      console.log('正在处理行:', JSON.stringify(row, null, 2));
      console.log('行数据的键:', Object.keys(row));

      // 检查字段名是否存在
      const fieldNames = [
        '稳态区间编号',
        'Cluster',
        '平均机组负荷',
        '平均热耗率',
        '锅炉效率',
        '综合评分',
        '语义标签',
      ];
      const rowKeys = Object.keys(row);

      // 打印每个字段的详细信息
      fieldNames.forEach((field) => {
        const matchingKey = rowKeys.find((key) => key.trim() === field.trim());
        console.log(`检查字段 "${field}":`, {
          exists: !!matchingKey,
          matchingKey,
          value: matchingKey ? row[matchingKey] : undefined,
        });
      });

      // 使用更宽松的字段匹配
      const missingFields = fieldNames.filter(
        (field) => !rowKeys.some((key) => key.trim() === field.trim()),
      );

      if (missingFields.length > 0) {
        console.warn(`行数据缺少以下字段: ${missingFields.join(', ')}`);
        continue;
      }

      // 使用trim后的键来获取值
      const getValue = (field: string) => {
        const key = rowKeys.find((k) => k.trim() === field.trim());
        return key ? row[key] : undefined;
      };

      const periodIdStr = getValue('稳态区间编号');
      console.log('稳态区间编号值:', periodIdStr, typeof periodIdStr);
      if (!periodIdStr) {
        console.warn('稳态区间编号为空，跳过该行');
        continue;
      }
      const period_id = parseInt(periodIdStr);

      const clusterStr = getValue('Cluster');
      console.log('Cluster值:', clusterStr, typeof clusterStr);
      if (!clusterStr) {
        console.warn('Cluster为空，跳过该行');
        continue;
      }
      const cluster = parseInt(clusterStr);

      const avgUnitLoadStr = getValue('平均机组负荷');
      console.log('平均机组负荷值:', avgUnitLoadStr, typeof avgUnitLoadStr);
      if (!avgUnitLoadStr) {
        console.warn('平均机组负荷为空，跳过该行');
        continue;
      }
      const avg_unit_load = parseFloat(avgUnitLoadStr);

      const avgHeatRateStr = getValue('平均热耗率');
      console.log('平均热耗率值:', avgHeatRateStr, typeof avgHeatRateStr);
      if (!avgHeatRateStr) {
        console.warn('平均热耗率为空，跳过该行');
        continue;
      }
      const avg_heat_rate = parseFloat(avgHeatRateStr);

      const boilerEfficiencyStr = getValue('锅炉效率');
      console.log(
        '锅炉效率值:',
        boilerEfficiencyStr,
        typeof boilerEfficiencyStr,
      );
      if (!boilerEfficiencyStr) {
        console.warn('锅炉效率为空，跳过该行');
        continue;
      }
      const boiler_efficiency = parseFloat(boilerEfficiencyStr);

      const comprehensiveScoreStr = getValue('综合评分');
      console.log(
        '综合评分值:',
        comprehensiveScoreStr,
        typeof comprehensiveScoreStr,
      );
      if (!comprehensiveScoreStr) {
        console.warn('综合评分为空，跳过该行');
        continue;
      }
      const comprehensive_score = parseFloat(comprehensiveScoreStr);

      // Validate all numeric fields
      if (
        isNaN(period_id) ||
        isNaN(cluster) ||
        isNaN(avg_unit_load) ||
        isNaN(avg_heat_rate) ||
        isNaN(boiler_efficiency) ||
        isNaN(comprehensive_score)
      ) {
        console.warn(`跳过无效数值的行。行数据: ${JSON.stringify(row)}`);
        if (isNaN(period_id)) {
          console.warn(`  - 无效的'稳态区间编号': ${periodIdStr}`);
        }
        if (isNaN(cluster)) {
          console.warn(`  - 无效的'Cluster': ${clusterStr}`);
        }
        if (isNaN(avg_unit_load)) {
          console.warn(`  - 无效的'平均机组负荷': ${avgUnitLoadStr}`);
        }
        if (isNaN(avg_heat_rate)) {
          console.warn(`  - 无效的'平均热耗率': ${avgHeatRateStr}`);
        }
        if (isNaN(boiler_efficiency)) {
          console.warn(`  - 无效的'锅炉效率': ${boilerEfficiencyStr}`);
        }
        if (isNaN(comprehensive_score)) {
          console.warn(`  - 无效的'综合评分': ${comprehensiveScoreStr}`);
        }
        continue;
      }

      const semantic_label = getValue('语义标签');
      console.log('语义标签值:', semantic_label, typeof semantic_label);
      if (!semantic_label) {
        console.warn('语义标签为空，跳过该行');
        continue;
      }

      try {
        await OptimalConditionPointModel.create({
          period_id,
          cluster,
          avg_unit_load,
          avg_heat_rate,
          boiler_efficiency,
          semantic_label,
          comprehensive_score,
        });
        console.log(`成功导入行 ${period_id}`);
      } catch (error) {
        console.error(`导入行 ${period_id} 时出错:`, error);
      }
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
