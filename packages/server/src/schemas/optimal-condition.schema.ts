import { Schema } from 'mongoose';

export interface OptimalConditionPoint {
  period_id: number;
  cluster: number;
  avg_unit_load: number;
  avg_heat_rate: number;
  boiler_efficiency: number;
  semantic_label: string;
  comprehensive_score: number;
}

export const OptimalConditionPointSchema = new Schema<OptimalConditionPoint>(
  {
    period_id: { type: Number, required: true, unique: true },
    cluster: { type: Number, required: true },
    avg_unit_load: { type: Number, required: true },
    avg_heat_rate: { type: Number, required: true },
    boiler_efficiency: { type: Number, required: true },
    semantic_label: { type: String, required: true },
    comprehensive_score: { type: Number, required: true },
  },
  {
    timestamps: true,
  },
);
