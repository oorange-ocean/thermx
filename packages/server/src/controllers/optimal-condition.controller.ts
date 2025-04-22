import { Controller, Get, Query, ParseIntPipe } from '@nestjs/common';
import { OptimalConditionService } from '../services/optimal-condition.service';
import { OptimalConditionPoint } from '../schemas/optimal-condition.schema';

@Controller('api/optimal-conditions')
export class OptimalConditionController {
  constructor(
    private readonly optimalConditionService: OptimalConditionService,
  ) {}

  @Get()
  async findAll(): Promise<OptimalConditionPoint[]> {
    return this.optimalConditionService.findAll();
  }

  @Get('cluster')
  async findByCluster(
    @Query('cluster', ParseIntPipe) cluster: number,
  ): Promise<OptimalConditionPoint[]> {
    return this.optimalConditionService.findByCluster(cluster);
  }

  @Get('semantic-label')
  async findBySemanticLabel(
    @Query('label') label: string,
  ): Promise<OptimalConditionPoint[]> {
    return this.optimalConditionService.findBySemanticLabel(label);
  }

  @Get('semantic-labels')
  async getDistinctSemanticLabels(): Promise<string[]> {
    return this.optimalConditionService.getDistinctSemanticLabels();
  }

  @Get('score-range')
  async findByScoreRange(
    @Query('minScore', ParseIntPipe) minScore: number,
    @Query('maxScore', ParseIntPipe) maxScore: number,
  ): Promise<OptimalConditionPoint[]> {
    return this.optimalConditionService.findByScoreRange(minScore, maxScore);
  }
}
