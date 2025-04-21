import { connect, model } from 'mongoose';
import {
  SteadyStatePeriod,
  SteadyStateDetail,
  SteadyStatePeriodSchema,
  SteadyStateDetailSchema,
} from '../schemas/steady-state.schema';

// 创建 Model
const SteadyStatePeriodModel = model<SteadyStatePeriod>(
  'SteadyStatePeriod',
  SteadyStatePeriodSchema,
);
const SteadyStateDetailModel = model<SteadyStateDetail>(
  'SteadyStateDetail',
  SteadyStateDetailSchema,
);

async function calculateAverages() {
  try {
    // 连接数据库
    await connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/thermx',
    );
    console.log('数据库连接成功');

    // 获取所有稳态区间
    const periods = await SteadyStatePeriodModel.find().sort({ period_id: 1 });
    console.log(`找到 ${periods.length} 个稳态区间`);

    for (const period of periods) {
      // 获取该区间的所有详细数据
      const details = await SteadyStateDetailModel.find({
        period_id: period.period_id,
      });

      if (details.length === 0) {
        console.log(`稳态区间 ${period.period_id} 没有详细数据，跳过`);
        continue;
      }

      // 计算平均值
      const avgHeatConsumptionRate =
        details.reduce(
          (sum, detail) =>
            sum + (detail.performance_metrics?.heat_consumption_rate || 0),
          0,
        ) / details.length;

      const avgUnitLoad =
        details.reduce(
          (sum, detail) => sum + (detail.performance_metrics?.unit_load || 0),
          0,
        ) / details.length;

      const avgBoilerEfficiency =
        details.reduce(
          (sum, detail) =>
            sum + (detail.pressure_temperature_data?.boiler_efficiency || 0),
          0,
        ) / details.length;

      // 更新稳态区间记录
      await SteadyStatePeriodModel.updateOne(
        { period_id: period.period_id },
        {
          $set: {
            avg_heat_consumption_rate: avgHeatConsumptionRate,
            avg_unit_load: avgUnitLoad,
            avg_boiler_efficiency: avgBoilerEfficiency,
          },
        },
      );

      console.log(`已更新稳态区间 ${period.period_id} 的平均值：`);
      console.log(`- 平均热耗率: ${avgHeatConsumptionRate.toFixed(2)} kJ/kWh`);
      console.log(`- 平均机组负荷: ${avgUnitLoad.toFixed(2)} MW`);
      console.log(`- 平均锅炉效率: ${avgBoilerEfficiency.toFixed(2)} %`);
    }

    console.log('所有稳态区间的平均值计算完成');
    process.exit(0);
  } catch (error) {
    console.error('计算平均值时出错:', error);
    process.exit(1);
  }
}

void calculateAverages();
