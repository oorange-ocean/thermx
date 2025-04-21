import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

// 实时数据类型接口
export interface RealTimeData {
  // 基础信息
  时间: string;

  // 性能指标
  机组负荷: number;
  汽轮机热耗率q: number;
  修正后热耗率q: number;
  修正系数: number;

  // 效率相关
  高压缸效率: number;
  中压缸效率: number;
  锅炉效率: number;
  厂用电率: number;

  // 压力相关
  低压缸排汽压力: number;
  一段抽汽压力: number;
  二段抽汽压力: number;
  三段抽汽压力: number;
  四段抽汽压力: number;
  中压缸排汽压力: number;
  主凝结水压力: number;
  主汽压力: number;
  高压缸排汽压力: number;
  再热减温水总管压力: number;
  再热汽压力: number;
  吹灰蒸汽压力: number;
  省煤器进口给水压力: number;
  给泵出口母管压力: number;

  // 流量相关
  主给水流量c: number;
  主给水流量: number;
  主蒸汽流量: number;
  再减流量: number;
  减温水流量: number;
  凝结水流量: number;
  凝结水补水流量: number;

  // Dms系列
  Dms: number;
  Dgp: number;
  Drh: number;
  Dmfs: number;
  D1: number;
  D2: number;
  D3: number;
  D4: number;

  // 温度相关
  '1号高加出水温度': number;
  '1号高加疏水温度': number;
  '2号高加出水温度': number;
  '2号高加疏水温度': number;
  '3号高加出水温度': number;
  '3号高加疏水温度': number;
  '3号高加进水温度': number;
  '3号高加进汽温度': number;
  一段抽汽温度: number;
  二段抽汽温度: number;
  三段抽汽温度: number;
  主蒸汽母管温度: number;
  再热减温水总管温度: number;
  再热汽母管温度: number;
  省煤器进口给水温度: number;
  除氧器下水温度1: number;
  除氧器下水温度2: number;
  除氧器进水温度: number;
  除氧器进汽温度: number;
  高压缸排汽温度: number;

  // 阀位相关
  A汽泵密封水阀位: number;
  B汽泵密封水阀位: number;
  GV1阀位: number;
  GV2阀位: number;
  GV3阀位: number;
  GV4阀位: number;
}

const RealTimeDataDisplay: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [data, setData] = useState<RealTimeData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 创建 Socket 连接
    const newSocket = io('http://localhost:3000', {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      console.log('连接到服务器');
      setIsConnected(true);
      setError(null);
    });

    newSocket.on('disconnect', () => {
      console.log('与服务器断开连接');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (err) => {
      console.error('连接错误:', err);
      setError('连接服务器失败，请检查服务器是否运行');
    });

    newSocket.on('error', (err) => {
      console.error('服务器错误:', err);
      setError(err.message || '发生未知错误');
    });

    newSocket.on('realTimeData', (newData: RealTimeData) => {
      console.log('接收到实时数据:', newData);
      setData(newData);
    });

    setSocket(newSocket);

    // 组件卸载时清理
    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, []);

  // 选取一些重要指标显示
  const renderDataGrid = () => {
    if (!data) return <div className="text-center py-4">等待数据...</div>;

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <DataCard label="时间" value={data.时间} />
        <DataCard label="机组负荷" value={`${data.机组负荷.toFixed(2)}`} unit="MW" />
        <DataCard label="汽轮机热耗率" value={`${data.汽轮机热耗率q.toFixed(2)}`} unit="kJ/kWh" />
        <DataCard label="修正后热耗率" value={`${data.修正后热耗率q.toFixed(2)}`} unit="kJ/kWh" />
        <DataCard label="高压缸效率" value={`${data.高压缸效率.toFixed(2)}`} unit="%" />
        <DataCard label="中压缸效率" value={`${data.中压缸效率.toFixed(2)}`} unit="%" />
        <DataCard label="锅炉效率" value={`${data.锅炉效率.toFixed(2)}`} unit="%" />
        <DataCard label="厂用电率" value={`${data.厂用电率.toFixed(2)}`} unit="%" />
      </div>
    );
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">实时运行数据</h2>
        <div className="flex items-center">
          <span
            className={`w-3 h-3 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
          ></span>
          <span>{isConnected ? '已连接' : '未连接'}</span>
        </div>
      </div>

      {error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      ) : (
        renderDataGrid()
      )}
    </div>
  );
};

// 数据卡片组件
const DataCard: React.FC<{ label: string; value: string; unit?: string }> = ({
  label,
  value,
  unit,
}) => {
  return (
    <div className="bg-white p-4 rounded shadow">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-lg font-semibold">
        {value} {unit && <span className="text-sm text-gray-500">{unit}</span>}
      </div>
    </div>
  );
};

export default RealTimeDataDisplay;
