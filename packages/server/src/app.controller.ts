import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import * as fs from 'fs/promises';

@Controller('api')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('clustering-data')
  async getClusteringData() {
    // 在服务器端读取 /home/data/clustering_data.csv
    const data = await fs.readFile('/home/data/clustering_data.csv', 'utf-8');
    return data;
  }

  @Get('steady-state-data')
  async getSteadyStateData() {
    // 在服务器端读取 /home/data/steady_state_data.csv
    const data = await fs.readFile('/home/data/steady_state_data.csv', 'utf-8');
    return data;
  }
}
