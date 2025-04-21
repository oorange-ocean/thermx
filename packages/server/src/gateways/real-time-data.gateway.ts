import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { CsvReaderService } from '../services/csv-reader.service';

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

  constructor(private readonly csvReaderService: CsvReaderService) {}

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

  private startSendingData(client: Socket) {
    const mockData = this.csvReaderService.getMockData();

    if (mockData.length === 0) {
      client.emit('error', { message: '无可用模拟数据' });
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
  }
}
