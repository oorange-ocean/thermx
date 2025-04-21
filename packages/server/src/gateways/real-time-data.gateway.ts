import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RealTimeDataService } from '../services/real-time-data.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class RealTimeDataGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private intervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(private readonly realTimeDataService: RealTimeDataService) {}

  handleConnection(client: Socket) {
    console.log(`客户端连接: ${client.id}`);
    this.startSendingData(client);
  }

  handleDisconnect(client: Socket) {
    console.log(`客户端断开: ${client.id}`);
    const interval = this.intervals.get(client.id);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(client.id);
    }
  }

  private async startSendingData(client: Socket) {
    try {
      const mockData = await this.realTimeDataService.getLatestDayData();

      if (mockData.length === 0) {
        client.emit('error', { message: '无可用数据' });
        return;
      }

      let dataIndex = 0;
      const interval = setInterval(() => {
        const data = mockData[dataIndex];
        client.emit('realTimeData', data);

        // 循环发送数据
        dataIndex = (dataIndex + 1) % mockData.length;
      }, 1000); // 每秒发送一次数据

      this.intervals.set(client.id, interval);
    } catch (error) {
      console.error('获取数据失败:', error);
      client.emit('error', { message: '获取数据失败' });
    }
  }
}
