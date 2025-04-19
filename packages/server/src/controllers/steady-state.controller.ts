import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Logger,
} from '@nestjs/common';
import { SteadyStateService } from '../services/steady-state.service';
import {
  CreateSteadyStateDetailDto,
  UpdateSteadyStateDetailDto,
  SteadyStateQueryDto,
} from '../dto/steady-state.dto';

@Controller('steady-state')
export class SteadyStateController {
  private readonly logger = new Logger(SteadyStateController.name);

  constructor(private readonly steadyStateService: SteadyStateService) {}

  @Get('periods')
  async getAllPeriods() {
    return this.steadyStateService.findAllPeriods();
  }

  @Get('periods/:id')
  async getPeriodById(@Param('id') id: number) {
    return this.steadyStateService.findPeriodById(id);
  }

  @Get('details')
  async getDetails(@Query() query: SteadyStateQueryDto) {
    return this.steadyStateService.findDetails(query);
  }

  @Get('details/:id')
  async getDetailById(@Param('id') id: string) {
    return this.steadyStateService.findDetailById(id);
  }

  @Post('details')
  async createDetail(@Body() createDto: CreateSteadyStateDetailDto) {
    return this.steadyStateService.createDetail(createDto);
  }

  @Put('details/:id')
  async updateDetail(
    @Param('id') id: string,
    @Body() updateDto: UpdateSteadyStateDetailDto,
  ) {
    return this.steadyStateService.updateDetail(id, updateDto);
  }

  @Delete('details/:id')
  async deleteDetail(@Param('id') id: string) {
    return this.steadyStateService.deleteDetail(id);
  }

  @Get('statistics/period/:periodId')
  async getPeriodStatistics(@Param('periodId') periodId: number) {
    return this.steadyStateService.getPeriodStatistics(periodId);
  }
}
