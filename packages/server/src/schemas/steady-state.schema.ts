import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class SteadyStatePeriod extends Document {
  @Prop({ required: true, unique: true })
  period_id: number;

  @Prop({ required: true })
  period_length: number;

  @Prop({ required: true })
  start_time: Date;

  @Prop({ required: true })
  end_time: Date;
}

@Schema()
class PerformanceMetrics {
  @Prop()
  unit_load: number;

  @Prop()
  heat_consumption_rate: number;

  @Prop()
  corrected_heat_rate: number;

  @Prop()
  correction_factor: number;

  @Prop()
  hp_efficiency: number;

  @Prop()
  ip_efficiency: number;

  @Prop()
  lp_exhaust_pressure: number;
}

@Schema()
class FlowData {
  @Prop()
  main_feedwater_flow: number;

  @Prop()
  dms: number;

  @Prop()
  dgp: number;

  @Prop()
  drh: number;

  @Prop()
  dmfs: number;

  @Prop()
  d1: number;

  @Prop()
  d2: number;

  @Prop()
  d3: number;

  @Prop()
  d4: number;
}

@Schema()
class TemperatureData {
  @Prop()
  heater1_outlet_temp: number;

  @Prop()
  heater1_drain_temp: number;

  @Prop()
  heater2_outlet_temp: number;

  @Prop()
  heater2_drain_temp: number;

  @Prop()
  heater3_outlet_temp: number;

  @Prop()
  heater3_drain_temp: number;

  @Prop()
  heater3_inlet_temp: number;

  @Prop()
  heater3_steam_temp: number;
}

@Schema()
class ValveData {
  @Prop()
  pump_a_seal_valve: number;

  @Prop()
  pump_b_seal_valve: number;

  @Prop()
  gv1_position: number;

  @Prop()
  gv2_position: number;

  @Prop()
  gv3_position: number;

  @Prop()
  gv4_position: number;
}

@Schema()
class PressureTemperatureData {
  @Prop()
  extraction_pressure_1: number;

  @Prop()
  extraction_temp_1: number;

  @Prop()
  extraction_pressure_3: number;

  @Prop()
  extraction_temp_3: number;

  @Prop()
  ip_exhaust_pressure: number;

  @Prop()
  main_condensate_pressure: number;

  @Prop()
  main_steam_pressure: number;

  @Prop()
  main_feedwater_flow_2: number;

  @Prop()
  main_steam_temp: number;

  @Prop()
  main_steam_flow: number;

  @Prop()
  extraction_pressure_2: number;

  @Prop()
  extraction_temp_2: number;

  @Prop()
  lp_exhaust_pressure_a: number;

  @Prop()
  lp_exhaust_pressure_b: number;

  @Prop()
  reheat_flow: number;

  @Prop()
  reheat_water_pressure: number;

  @Prop()
  reheat_water_temp: number;

  @Prop()
  reheat_steam_pressure: number;

  @Prop()
  reheat_steam_temp: number;

  @Prop()
  cooling_water_flow: number;

  @Prop()
  condensate_flow: number;

  @Prop()
  makeup_water_flow: number;

  @Prop()
  plant_power_rate: number;

  @Prop()
  soot_blowing_pressure: number;

  @Prop()
  extraction_pressure_4: number;

  @Prop()
  economizer_inlet_pressure: number;

  @Prop()
  economizer_inlet_temp: number;

  @Prop()
  feed_pump_outlet_pressure: number;

  @Prop()
  boiler_efficiency: number;

  @Prop()
  deaerator_water_temp_1: number;

  @Prop()
  deaerator_water_temp_2: number;

  @Prop()
  deaerator_inlet_water_temp: number;

  @Prop()
  deaerator_steam_temp: number;

  @Prop()
  hp_exhaust_pressure: number;

  @Prop()
  hp_exhaust_temp: number;
}

@Schema({ timestamps: true })
export class SteadyStateDetail extends Document {
  @Prop({ required: true })
  period_id: number;

  @Prop({ required: true })
  timestamp: Date;

  @Prop({ type: PerformanceMetrics })
  performance_metrics: PerformanceMetrics;

  @Prop({ type: FlowData })
  flow_data: FlowData;

  @Prop({ type: TemperatureData })
  temperature_data: TemperatureData;

  @Prop({ type: ValveData })
  valve_data: ValveData;

  @Prop({ type: PressureTemperatureData })
  pressure_temperature_data: PressureTemperatureData;
}

export const SteadyStatePeriodSchema =
  SchemaFactory.createForClass(SteadyStatePeriod);
export const SteadyStateDetailSchema =
  SchemaFactory.createForClass(SteadyStateDetail);

// 添加索引
SteadyStatePeriodSchema.index({ period_id: 1 }, { unique: true });
SteadyStateDetailSchema.index({ period_id: 1, timestamp: 1 });
