import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, SortOrder } from 'mongoose';
import {
  SteadyStatePeriod,
  SteadyStateDetail,
} from '../schemas/steady-state.schema';
import {
  CreateSteadyStateDetailDto,
  UpdateSteadyStateDetailDto,
  SteadyStateQueryDto,
} from '../dto/steady-state.dto';

@Injectable()
export class SteadyStateService {
  constructor(
    @InjectModel('SteadyStatePeriod')
    private readonly periodModel: Model<SteadyStatePeriod>,
    @InjectModel('SteadyStateDetail')
    private readonly detailModel: Model<SteadyStateDetail>,
  ) {}

  async findAllPeriods(): Promise<SteadyStatePeriod[]> {
    return this.periodModel.find().sort({ period_id: 1 }).exec();
  }

  async findAllPeriodsWithClusterData(): Promise<SteadyStatePeriod[]> {
    return this.periodModel.find().sort({ period_id: 1 }).exec();
  }

  async findPeriodById(periodId: number): Promise<SteadyStatePeriod> {
    const period = await this.periodModel.findOne({ period_id: periodId });
    if (!period) {
      throw new NotFoundException(`稳态区间 ${periodId} 未找到`);
    }
    return period;
  }

  async findDetails(query: SteadyStateQueryDto) {
    const {
      period_id,
      start_date,
      end_date,
      page = 1,
      limit = 10,
      sort_by = 'timestamp',
      sort_order = 'asc',
    } = query;

    const filter: {
      period_id?: number;
      timestamp?: {
        $gte?: Date;
        $lte?: Date;
      };
    } = {};
    if (period_id) {
      filter.period_id = period_id;
    }
    if (start_date || end_date) {
      filter.timestamp = {};
      if (start_date) {
        filter.timestamp.$gte = new Date(start_date);
      }
      if (end_date) {
        filter.timestamp.$lte = new Date(end_date);
      }
    }

    const skip = (page - 1) * limit;
    const sort: { [key: string]: SortOrder } = {
      [sort_by]: sort_order === 'asc' ? 1 : -1,
    };

    const [data, total] = await Promise.all([
      this.detailModel.find(filter).sort(sort).skip(skip).limit(limit),
      this.detailModel.countDocuments(filter),
    ]);

    return {
      data,
      pagination: {
        current_page: page,
        total_pages: Math.ceil(total / limit),
        total_items: total,
        items_per_page: limit,
      },
    };
  }

  async findDetailById(id: string) {
    const detail = await this.detailModel.findById(id);
    if (!detail) {
      throw new NotFoundException(`稳态数据记录 ${id} 未找到`);
    }
    return detail;
  }

  async createDetail(createDto: CreateSteadyStateDetailDto) {
    const period = await this.findPeriodById(createDto.period_id);
    if (!period) {
      throw new NotFoundException(`稳态区间 ${createDto.period_id} 未找到`);
    }
    const detail = new this.detailModel(createDto);
    return detail.save();
  }

  async updateDetail(id: string, updateDto: UpdateSteadyStateDetailDto) {
    const detail = await this.detailModel.findByIdAndUpdate(id, updateDto, {
      new: true,
    });
    if (!detail) {
      throw new NotFoundException(`稳态数据记录 ${id} 未找到`);
    }
    return detail;
  }

  async deleteDetail(id: string) {
    const detail = await this.detailModel.findByIdAndDelete(id);
    if (!detail) {
      throw new NotFoundException(`稳态数据记录 ${id} 未找到`);
    }
    return detail;
  }

  async getPeriodStatistics(periodId: number) {
    const details = await this.detailModel.find({ period_id: periodId });
    if (!details.length) {
      throw new NotFoundException(`稳态区间 ${periodId} 没有数据记录`);
    }

    // 计算性能指标的统计数据
    const performanceStats = {
      unit_load: this.calculateMetricStats(
        details.map((d) => d.performance_metrics?.unit_load),
      ),
      heat_consumption_rate: this.calculateMetricStats(
        details.map((d) => d.performance_metrics?.heat_consumption_rate),
      ),
      corrected_heat_rate: this.calculateMetricStats(
        details.map((d) => d.performance_metrics?.corrected_heat_rate),
      ),
      hp_efficiency: this.calculateMetricStats(
        details.map((d) => d.performance_metrics?.hp_efficiency),
      ),
      ip_efficiency: this.calculateMetricStats(
        details.map((d) => d.performance_metrics?.ip_efficiency),
      ),
    };

    return {
      period_id: periodId,
      total_records: details.length,
      start_time: details[0].timestamp,
      end_time: details[details.length - 1].timestamp,
      performance_statistics: performanceStats,
    };
  }

  private calculateMetricStats(values: (number | null | undefined)[]) {
    const validValues = values.filter((v): v is number => v != null);
    if (!validValues.length) return null;

    return {
      min: Math.min(...validValues),
      max: Math.max(...validValues),
      avg: validValues.reduce((a, b) => a + b, 0) / validValues.length,
      std: this.calculateStandardDeviation(validValues),
    };
  }

  private calculateStandardDeviation(values: number[]) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squareDiffs = values.map((value) => Math.pow(value - mean, 2));
    const variance = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(variance);
  }
}
