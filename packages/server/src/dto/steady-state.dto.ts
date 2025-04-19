import {
  IsNumber,
  IsDate,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PerformanceMetricsDto {
  @IsOptional()
  @IsNumber()
  unit_load?: number;

  @IsOptional()
  @IsNumber()
  heat_consumption_rate?: number;

  @IsOptional()
  @IsNumber()
  corrected_heat_rate?: number;

  @IsOptional()
  @IsNumber()
  correction_factor?: number;

  @IsOptional()
  @IsNumber()
  hp_efficiency?: number;

  @IsOptional()
  @IsNumber()
  ip_efficiency?: number;

  @IsOptional()
  @IsNumber()
  lp_exhaust_pressure?: number;
}

export class FlowDataDto {
  @IsOptional()
  @IsNumber()
  main_feedwater_flow?: number;

  @IsOptional()
  @IsNumber()
  dms?: number;

  @IsOptional()
  @IsNumber()
  dgp?: number;

  @IsOptional()
  @IsNumber()
  drh?: number;

  @IsOptional()
  @IsNumber()
  dmfs?: number;

  @IsOptional()
  @IsNumber()
  d1?: number;

  @IsOptional()
  @IsNumber()
  d2?: number;

  @IsOptional()
  @IsNumber()
  d3?: number;

  @IsOptional()
  @IsNumber()
  d4?: number;
}

export class CreateSteadyStateDetailDto {
  @IsNumber()
  period_id: number;

  @IsDate()
  @Type(() => Date)
  timestamp: Date;

  @IsOptional()
  @ValidateNested()
  @Type(() => PerformanceMetricsDto)
  performance_metrics?: PerformanceMetricsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => FlowDataDto)
  flow_data?: FlowDataDto;
}

export class UpdateSteadyStateDetailDto extends CreateSteadyStateDetailDto {}

export class SteadyStateQueryDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  period_id?: number;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  start_date?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  end_date?: Date;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsString()
  sort_by?: string;

  @IsOptional()
  @IsString()
  sort_order?: 'asc' | 'desc';
}
