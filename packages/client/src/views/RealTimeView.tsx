import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Paper,
} from '@mui/material';
import { io } from 'socket.io-client';
import { API_BASE_URL } from '../config';

// 从RealTimeDataDisplay导入RealTimeData类型
interface RealTimeData {
  时间: string;
  机组负荷: number;
  汽轮机热耗率q: number;
  修正后热耗率q: number;
  修正系数: number;
  高压缸效率: number;
  中压缸效率: number;
  锅炉效率: number;
  厂用电率: number;
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
  主给水流量c: number;
  主给水流量: number;
  主蒸汽流量: number;
  再减流量: number;
  减温水流量: number;
  凝结水流量: number;
  凝结水补水流量: number;
  Dms: number;
  Dgp: number;
  Drh: number;
  Dmfs: number;
  D1: number;
  D2: number;
  D3: number;
  D4: number;
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
  A汽泵密封水阀位: number;
  B汽泵密封水阀位: number;
  GV1阀位: number;
  GV2阀位: number;
  GV3阀位: number;
  GV4阀位: number;
}

// 数据卡片组件
interface DataCardProps {
  title: string;
  value: string | number;
  unit?: string;
  color?: string;
}

const DataCard: React.FC<DataCardProps> = ({ title, value, unit, color = '#1976d2' }) => {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          {title}
        </Typography>
        <Typography variant="h5" component="div" sx={{ color }}>
          {typeof value === 'number' ? value.toFixed(2) : value}
          {unit && (
            <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
              {unit}
            </Typography>
          )}
        </Typography>
      </CardContent>
    </Card>
  );
};

// 数据分组组件
interface DataGroupProps {
  title: string;
  children: React.ReactNode;
}

const DataGroup: React.FC<DataGroupProps> = ({ title, children }) => {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        {title}
      </Typography>
      <Grid container spacing={2}>
        {children}
      </Grid>
    </Box>
  );
};

export const RealTimeView: React.FC = () => {
  const [data, setData] = useState<RealTimeData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    // 确保 API_BASE_URL 正确
    const socketUrl = API_BASE_URL.replace(/^http/, 'ws');
    console.log('尝试连接到 WebSocket:', socketUrl);

    // 创建 Socket 连接，明确指定后端地址
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'], // 优先使用 WebSocket，失败则回退到轮询
      reconnection: true, // 自动重连
      reconnectionAttempts: 5, // 重连尝试次数
      reconnectionDelay: 1000, // 重连延迟
    });

    newSocket.on('connect', () => {
      console.log('成功连接到实时数据服务器');
      setIsConnected(true);
      setError(null);
    });

    newSocket.on('disconnect', () => {
      console.log('与实时数据服务器断开连接');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (err) => {
      console.error('连接错误:', err.message);
      setError(`连接服务器失败: ${err.message}`);
    });

    newSocket.on('error', (err) => {
      console.error('服务器错误:', err);
      setError(err.message || '发生未知错误');
    });

    newSocket.on('realTimeData', (newData: RealTimeData) => {
      console.log('接收到实时数据:', newData);
      setData(newData);
      setLastUpdated(new Date());
    });

    // 组件卸载时清理
    return () => {
      newSocket.disconnect();
      console.log('WebSocket 已断开');
    };
  }, []);

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '50vh',
        }}
      >
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          正在等待实时数据...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Typography variant="h5">电厂实时运行数据</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              bgcolor: isConnected ? 'success.main' : 'error.main',
              mr: 1,
            }}
          />
          <Typography variant="body2" color="text.secondary">
            {isConnected ? '已连接' : '未连接'}
            {lastUpdated && ` · 最后更新: ${lastUpdated.toLocaleTimeString()}`}
          </Typography>
        </Box>
      </Box>

      <Paper sx={{ p: 3, mb: 4 }} elevation={2}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            <DataCard title="机组负荷" value={data.机组负荷} unit="MW" color="#2e7d32" />
          </Grid>
          <Grid item xs={12} md={3}>
            <DataCard title="汽轮机热耗率" value={data.汽轮机热耗率q} unit="kJ/kWh" />
          </Grid>
          <Grid item xs={12} md={3}>
            <DataCard title="修正后热耗率" value={data.修正后热耗率q} unit="kJ/kWh" />
          </Grid>
          <Grid item xs={12} md={3}>
            <DataCard title="当前时间" value={data.时间} />
          </Grid>
        </Grid>
      </Paper>

      <DataGroup title="效率指标">
        <Grid item xs={6} md={3}>
          <DataCard title="高压缸效率" value={data.高压缸效率} unit="%" />
        </Grid>
        <Grid item xs={6} md={3}>
          <DataCard title="中压缸效率" value={data.中压缸效率} unit="%" />
        </Grid>
        <Grid item xs={6} md={3}>
          <DataCard title="锅炉效率" value={data.锅炉效率} unit="%" />
        </Grid>
        <Grid item xs={6} md={3}>
          <DataCard title="厂用电率" value={data.厂用电率} unit="%" />
        </Grid>
      </DataGroup>

      <DataGroup title="压力参数">
        <Grid item xs={6} md={3}>
          <DataCard title="主汽压力" value={data.主汽压力} unit="MPa" />
        </Grid>
        <Grid item xs={6} md={3}>
          <DataCard title="再热汽压力" value={data.再热汽压力} unit="MPa" />
        </Grid>
        <Grid item xs={6} md={3}>
          <DataCard title="高压缸排汽压力" value={data.高压缸排汽压力} unit="MPa" />
        </Grid>
        <Grid item xs={6} md={3}>
          <DataCard title="低压缸排汽压力" value={data.低压缸排汽压力} unit="MPa" />
        </Grid>
      </DataGroup>

      <DataGroup title="流量参数">
        <Grid item xs={6} md={3}>
          <DataCard title="主给水流量" value={data.主给水流量} unit="t/h" />
        </Grid>
        <Grid item xs={6} md={3}>
          <DataCard title="主蒸汽流量" value={data.主蒸汽流量} unit="t/h" />
        </Grid>
        <Grid item xs={6} md={3}>
          <DataCard title="凝结水流量" value={data.凝结水流量} unit="t/h" />
        </Grid>
        <Grid item xs={6} md={3}>
          <DataCard title="减温水流量" value={data.减温水流量} unit="t/h" />
        </Grid>
      </DataGroup>

      <DataGroup title="温度参数">
        <Grid item xs={6} md={3}>
          <DataCard title="主蒸汽母管温度" value={data.主蒸汽母管温度} unit="°C" />
        </Grid>
        <Grid item xs={6} md={3}>
          <DataCard title="再热汽母管温度" value={data.再热汽母管温度} unit="°C" />
        </Grid>
        <Grid item xs={6} md={3}>
          <DataCard title="高压缸排汽温度" value={data.高压缸排汽温度} unit="°C" />
        </Grid>
        <Grid item xs={6} md={3}>
          <DataCard title="1号高加出水温度" value={data['1号高加出水温度']} unit="°C" />
        </Grid>
      </DataGroup>
    </Box>
  );
};
