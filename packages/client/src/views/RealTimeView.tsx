import { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, Alert, Tabs } from '@mui/material';
import { io } from 'socket.io-client';
import { API_BASE_URL } from '../config';
import { RealTimeData } from '../types/realTimeData';
import { PerformanceView } from './realtime/PerformanceView';
import { BoilerView } from './realtime/BoilerView';
import { TurbineView } from './realtime/TurbineView';
import { AuxiliaryView } from './realtime/AuxiliaryView';
import { StyledTab } from '../components/StyledTab';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
      style={{ height: '100%' }}
    >
      {value === index && <Box sx={{ p: 3, height: '100%' }}>{children}</Box>}
    </div>
  );
}

export const RealTimeView: React.FC = () => {
  const [data, setData] = useState<RealTimeData | null>(null);
  const [historicalData, setHistoricalData] = useState<Array<{ time: string; value: number }>>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [currentTab, setCurrentTab] = useState(0);

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

      // 更新历史数据，保留最近30个数据点
      setHistoricalData((prev) => {
        const newPoint = { time: newData.时间, value: newData.汽轮机热耗率q };
        const updatedData = [...prev, newPoint].slice(-30);
        return updatedData;
      });
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
    <Box sx={{ height: 'calc(100vh - 64px)' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2 }}>
          <Tabs value={currentTab} onChange={(_, newValue) => setCurrentTab(newValue)}>
            <StyledTab label="总体性能" />
            <StyledTab label="锅炉系统" />
            <StyledTab label="汽轮机系统" />
            <StyledTab label="辅机系统" />
          </Tabs>
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
      </Box>

      <Box sx={{ height: 'calc(100% - 49px)' }}>
        <TabPanel value={currentTab} index={0}>
          <PerformanceView data={data} historicalData={historicalData} />
        </TabPanel>
        <TabPanel value={currentTab} index={1}>
          <BoilerView data={data} />
        </TabPanel>
        <TabPanel value={currentTab} index={2}>
          <TurbineView data={data} />
        </TabPanel>
        <TabPanel value={currentTab} index={3}>
          <AuxiliaryView data={data} />
        </TabPanel>
      </Box>
    </Box>
  );
};
