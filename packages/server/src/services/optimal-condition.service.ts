import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OptimalConditionPoint } from '../schemas/optimal-condition.schema';

@Injectable()
export class OptimalConditionService {
  constructor(
    @InjectModel('OptimalConditionPoint')
    private optimalConditionModel: Model<OptimalConditionPoint>,
  ) {}

  // 获取所有最佳工况点
  async findAll(): Promise<OptimalConditionPoint[]> {
    return this.optimalConditionModel.find().exec();
  }

  // 根据聚类编号获取最佳工况点
  async findByCluster(cluster: number): Promise<OptimalConditionPoint[]> {
    return this.optimalConditionModel.find({ cluster }).exec();
  }

  // 根据语义标签获取最佳工况点
  async findBySemanticLabel(label: string): Promise<OptimalConditionPoint[]> {
    return this.optimalConditionModel.find({ semantic_label: label }).exec();
  }

  // 获取所有不同的语义标签
  async getDistinctSemanticLabels(): Promise<string[]> {
    return this.optimalConditionModel.distinct('semantic_label').exec();
  }

  // 根据综合评分范围查询
  async findByScoreRange(
    minScore: number,
    maxScore: number,
  ): Promise<OptimalConditionPoint[]> {
    return this.optimalConditionModel
      .find({
        comprehensive_score: { $gte: minScore, $lte: maxScore },
      })
      .exec();
  }
}
