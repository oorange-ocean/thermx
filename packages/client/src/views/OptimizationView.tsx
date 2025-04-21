import { useState, useEffect, useMemo } from 'react';
import { Box, Paper, Tabs } from '@mui/material';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts';
import { API_BASE_URL } from '../config';
import { StyledTab } from '../components/StyledTab';

interface SteadyStatePeriod {
  _id: string;
  period_id: number;
  period_length: number;
  start_time: string;
  end_time: string;
  avg_unit_load: number;
  avg_boiler_efficiency: number;
  avg_heat_consumption_rate: number;
}

const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
  if (!active || !payload || !payload[0]) return null;

  const data = payload[0].payload as SteadyStatePeriod;
  const startTime = new Date(data.start_time).toLocaleString();
  const endTime = new Date(data.end_time).toLocaleString();

  return (
    <Paper sx={{ p: 1.5, backgroundColor: 'rgba(255, 255, 255, 0.9)' }}>
      <Box sx={{ mb: 1 }}>
        <strong>稳态区间编号：</strong> {data.period_id}
      </Box>
      <Box sx={{ mb: 1 }}>
        <strong>机组负荷：</strong> {data.avg_unit_load.toFixed(2)} MW
      </Box>
      <Box sx={{ mb: 1 }}>
        <strong>锅炉效率：</strong> {data.avg_boiler_efficiency.toFixed(2)} %
      </Box>
      <Box sx={{ mb: 1 }}>
        <strong>热耗率：</strong> {data.avg_heat_consumption_rate.toFixed(2)} kJ/kWh
      </Box>
      <Box sx={{ mb: 1 }}>
        <strong>开始时间：</strong> {startTime}
      </Box>
      <Box>
        <strong>结束时间：</strong> {endTime}
      </Box>
    </Paper>
  );
};

export const OptimizationView = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [steadyStateData, setSteadyStateData] = useState<SteadyStatePeriod[]>([]);

  // 数据过滤条件
  const filterData = (data: SteadyStatePeriod[]) => {
    return data.filter((item) => {
      const isValidLoad = item.avg_unit_load >= 200 && item.avg_unit_load <= 700;
      const isValidEfficiency =
        item.avg_boiler_efficiency >= 92 && item.avg_boiler_efficiency <= 100;
      const isValidHeatRate =
        item.avg_heat_consumption_rate >= 7000 && item.avg_heat_consumption_rate <= 9000;

      return isValidLoad && isValidEfficiency && isValidHeatRate;
    });
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/steady-state/periods`);
        const data = await response.json();
        setSteadyStateData(filterData(data));
      } catch (error) {
        console.error('获取稳态数据失败:', error);
      }
    };
    fetchData();
  }, []);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  // 使用 useMemo 缓存计算结果
  const chartData = useMemo(() => {
    return steadyStateData.map((item) => ({
      ...item,
      value: currentTab === 0 ? item.avg_boiler_efficiency : item.avg_heat_consumption_rate,
    }));
  }, [steadyStateData, currentTab]);

  const getYAxisLabel = () => {
    return currentTab === 0 ? '锅炉效率 (%)' : '热耗率 (kJ/kWh)';
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ width: '100%', mb: 2 }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          centered
        >
          <StyledTab label="锅炉效率" />
          <StyledTab label="热耗率" />
        </Tabs>
      </Paper>

      <Paper sx={{ p: 2, height: '400px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="avg_unit_load"
              name="机组负荷"
              unit="MW"
              domain={['auto', 'auto']}
            />
            <YAxis
              type="number"
              dataKey="value"
              name={getYAxisLabel()}
              unit={currentTab === 0 ? '%' : 'kJ/kWh'}
              domain={['auto', 'auto']}
              width={80}
              tickFormatter={(value) => value.toFixed(0)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Scatter
              name={currentTab === 0 ? '锅炉效率' : '热耗率'}
              data={chartData}
              fill="#8884d8"
              shape="circle"
              r={3}
              isAnimationActive={false}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </Paper>
    </Box>
  );
};
