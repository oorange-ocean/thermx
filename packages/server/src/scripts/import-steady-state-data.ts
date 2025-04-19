import { parse } from 'csv-parse/sync';
import * as fs from 'fs';
import { join } from 'path';
import { connect, model } from 'mongoose';
import {
  SteadyStatePeriod,
  SteadyStateDetail,
  SteadyStatePeriodSchema,
  SteadyStateDetailSchema,
} from '../schemas/steady-state.schema';

type CsvRow = Record<string, string>;

const SteadyStatePeriodModel = model<SteadyStatePeriod>(
  'SteadyStatePeriod',
  SteadyStatePeriodSchema,
);
const SteadyStateDetailModel = model<SteadyStateDetail>(
  'SteadyStateDetail',
  SteadyStateDetailSchema,
);

// 安全的数值解析函数
function safeParseFloat(value: string): number | null {
  if (!value || value.trim() === '') return null;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
}

async function importData() {
  try {
    // 连接数据库
    await connect('mongodb://localhost:27017/thermx');
    console.log('数据库连接成功');

    // 清除旧数据
    await SteadyStatePeriodModel.deleteMany({});
    await SteadyStateDetailModel.deleteMany({});
    console.log('旧数据清除完成');

    const csvFilePath = join(__dirname, '../../public/steady_state_data.csv');
    const fileContent = fs.readFileSync(csvFilePath, 'utf-8');

    // 创建CSV解析器
    const parseSync = parse as (input: string, options?: any) => any;
    const rows = parseSync(fileContent, {
      columns: true,
      skip_empty_lines: true,
    }) as CsvRow[];

    // 用于跟踪已处理的稳态区间
    const processedPeriods = new Set<number>();

    // 处理每一行数据
    for (const row of rows) {
      const periodId = parseInt(row['稳态区间编号']);
      const periodLength = parseInt(row['稳态区间长度']);

      // 如果是新的稳态区间，创建 SteadyStatePeriod 记录
      if (!processedPeriods.has(periodId)) {
        const timestamp = new Date(row['时间']);
        await SteadyStatePeriodModel.create({
          period_id: periodId,
          period_length: periodLength,
          start_time: timestamp,
          end_time: new Date(timestamp.getTime() + (periodLength - 1) * 60000), // 假设数据间隔为1分钟
        });
        processedPeriods.add(periodId);
      }

      // 创建 SteadyStateDetail 记录
      await SteadyStateDetailModel.create({
        period_id: periodId,
        timestamp: new Date(row['时间']),
        performance_metrics: {
          unit_load: safeParseFloat(row['机组负荷']),
          heat_consumption_rate: safeParseFloat(row['汽轮机热耗率q']),
          corrected_heat_rate: safeParseFloat(row['修正后热耗率q']),
          correction_factor: safeParseFloat(row['修正系数']),
          hp_efficiency: safeParseFloat(row['高压缸效率']),
          ip_efficiency: safeParseFloat(row['中压缸效率']),
          lp_exhaust_pressure: safeParseFloat(row['低压缸排汽压力']),
        },
        flow_data: {
          main_feedwater_flow: safeParseFloat(row['主给水流量c']),
          dms: safeParseFloat(row['Dms']),
          dgp: safeParseFloat(row['Dgp']),
          drh: safeParseFloat(row['Drh']),
          dmfs: safeParseFloat(row['Dmfs']),
          d1: safeParseFloat(row['D1']),
          d2: safeParseFloat(row['D2']),
          d3: safeParseFloat(row['D3']),
          d4: safeParseFloat(row['D4']),
        },
        temperature_data: {
          heater1_outlet_temp: safeParseFloat(row['1号高加出水温度']),
          heater1_drain_temp: safeParseFloat(row['1号高加疏水温度']),
          heater2_outlet_temp: safeParseFloat(row['2号高加出水温度']),
          heater2_drain_temp: safeParseFloat(row['2号高加疏水温度']),
          heater3_outlet_temp: safeParseFloat(row['3号高加出水温度']),
          heater3_drain_temp: safeParseFloat(row['3号高加疏水温度']),
          heater3_inlet_temp: safeParseFloat(row['3号高加进水温度']),
          heater3_steam_temp: safeParseFloat(row['3号高加进汽温度']),
        },
        valve_data: {
          pump_a_seal_valve: safeParseFloat(row['A汽泵密封水阀位']),
          pump_b_seal_valve: safeParseFloat(row['B汽泵密封水阀位']),
          gv1_position: safeParseFloat(row['GV1阀位']),
          gv2_position: safeParseFloat(row['GV2阀位']),
          gv3_position: safeParseFloat(row['GV3阀位']),
          gv4_position: safeParseFloat(row['GV4阀位']),
        },
        pressure_temperature_data: {
          extraction_pressure_1: safeParseFloat(row['一段抽汽压力']),
          extraction_temp_1: safeParseFloat(row['一段抽汽温度']),
          extraction_pressure_3: safeParseFloat(row['三段抽汽压力']),
          extraction_temp_3: safeParseFloat(row['三段抽汽温度']),
          ip_exhaust_pressure: safeParseFloat(row['中压缸排汽压力']),
          main_condensate_pressure: safeParseFloat(row['主凝结水压力']),
          main_steam_pressure: safeParseFloat(row['主汽压力']),
          main_feedwater_flow_2: safeParseFloat(row['主给水流量']),
          main_steam_temp: safeParseFloat(row['主蒸汽母管温度']),
          main_steam_flow: safeParseFloat(row['主蒸汽流量']),
          extraction_pressure_2: safeParseFloat(row['二段抽汽压力']),
          extraction_temp_2: safeParseFloat(row['二段抽汽温度']),
          lp_exhaust_pressure_a: safeParseFloat(row['低压缸排汽压力A']),
          lp_exhaust_pressure_b: safeParseFloat(row['低压缸排汽压力B']),
          reheat_flow: safeParseFloat(row['再减流量']),
          reheat_water_pressure: safeParseFloat(row['再热减温水总管压力']),
          reheat_water_temp: safeParseFloat(row['再热减温水总管温度']),
          reheat_steam_pressure: safeParseFloat(row['再热汽压力']),
          reheat_steam_temp: safeParseFloat(row['再热汽母管温度']),
          cooling_water_flow: safeParseFloat(row['减温水流量']),
          condensate_flow: safeParseFloat(row['凝结水流量']),
          makeup_water_flow: safeParseFloat(row['凝结水补水流量']),
          plant_power_rate: safeParseFloat(row['厂用电率']),
          soot_blowing_pressure: safeParseFloat(row['吹灰蒸汽压力']),
          extraction_pressure_4: safeParseFloat(row['四段抽汽压力']),
          economizer_inlet_pressure: safeParseFloat(row['省煤器进口给水压力']),
          economizer_inlet_temp: safeParseFloat(row['省煤器进口给水温度']),
          feed_pump_outlet_pressure: safeParseFloat(row['给泵出口母管压力']),
          boiler_efficiency: safeParseFloat(row['锅炉效率']),
          deaerator_water_temp_1: safeParseFloat(row['除氧器下水温度1']),
          deaerator_water_temp_2: safeParseFloat(row['除氧器下水温度2']),
          deaerator_inlet_water_temp: safeParseFloat(row['除氧器进水温度']),
          deaerator_steam_temp: safeParseFloat(row['除氧器进汽温度']),
          hp_exhaust_pressure: safeParseFloat(row['高压缸排汽压力']),
          hp_exhaust_temp: safeParseFloat(row['高压缸排汽温度']),
        },
      });
    }

    console.log('数据导入完成');
    process.exit(0);
  } catch (error) {
    console.error('数据导入失败:', error);
    process.exit(1);
  }
}

importData();
