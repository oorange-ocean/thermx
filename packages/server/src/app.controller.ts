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
    try {
      // 添加日志
      console.log('开始读取聚类数据文件...');
      const data = await fs.readFile('/home/data/clustering_data.csv', 'utf-8');
      console.log(`成功读取数据，数据长度: ${data.length}`);
      return data;
    } catch (error) {
      console.error('读取聚类数据文件失败:', error);
      throw error;
    }
  }

  @Get('steady-state-data')
  async getSteadyStateData() {
    try {
      console.log('开始读取稳态数据文件...');
      const data = await fs.readFile(
        '/home/data/steady_state_data.csv',
        'utf-8',
      );
      console.log(`成功读取数据，数据长度: ${data.length}`);
      return data;
    } catch (error) {
      console.error('读取稳态数据文件失败:', error);
      throw error;
    }
  }
}
