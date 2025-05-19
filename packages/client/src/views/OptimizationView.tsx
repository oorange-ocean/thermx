import { useState, useEffect, useMemo } from 'react';
import { Box, Paper, Tabs } from '@mui/material';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
  Line,
  ComposedChart,
  Scatter,
} from 'recharts';
import { API_BASE_URL } from '../config';
import { StyledTab } from '../components/StyledTab';
import { DetailView } from './DetailView';

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

interface OptimalConditionPoint {
  period_id: number;
  cluster: number;
  avg_unit_load: number;
  avg_heat_rate: number;
  boiler_efficiency: number;
  semantic_label: string;
  comprehensive_score: number;
}

interface ChartClickEvent {
  payload: SteadyStatePeriod;
}

const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
  if (!active || !payload || !payload[0]) return null;

  const data = payload[0].payload;
  if ('start_time' in data) {
    // 运行工况点的tooltip
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
  } else {
    // 最优工况点的tooltip
    return (
      <Paper sx={{ p: 1.5, backgroundColor: 'rgba(255, 255, 255, 0.9)' }}>
        <Box sx={{ mb: 1 }}>
          <strong>机组负荷：</strong> {data.avg_unit_load.toFixed(2)} MW
        </Box>
        <Box sx={{ mb: 1 }}>
          <strong>锅炉效率：</strong> {data.boiler_efficiency.toFixed(2)} %
        </Box>
        <Box sx={{ mb: 1 }}>
          <strong>热耗率：</strong> {data.avg_heat_rate.toFixed(2)} kJ/kWh
        </Box>
        <Box sx={{ mb: 1 }}>
          <strong>语义标签：</strong> {data.semantic_label}
        </Box>
        <Box>
          <strong>综合评分：</strong> {data.comprehensive_score.toFixed(3)}
        </Box>
      </Paper>
    );
  }
};

export const OptimizationView = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [steadyStateData, setSteadyStateData] = useState<SteadyStatePeriod[]>([]);
  const [optimalPoints, setOptimalPoints] = useState<OptimalConditionPoint[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null);

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
        const [steadyStateResponse, optimalPointsResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/steady-state/periods`),
          fetch(`${API_BASE_URL}/api/optimal-conditions`),
        ]);

        const steadyStateData = await steadyStateResponse.json();
        const optimalPointsData = await optimalPointsResponse.json();

        const filteredData = filterData(steadyStateData);
        setSteadyStateData(filteredData);
        setOptimalPoints(optimalPointsData);

        // 设置默认选中第一个点
        if (filteredData.length > 0) {
          setSelectedPeriodId(filteredData[0].period_id);
        }
      } catch (error) {
        console.error('获取数据失败:', error);
      }
    };
    fetchData();
  }, []);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  // 使用 useMemo 缓存计算结果
  const chartData = useMemo(() => {
    console.log('处理图表数据:', steadyStateData);
    return steadyStateData.map((item) => ({
      ...item,
      value: currentTab === 0 ? item.avg_boiler_efficiency : item.avg_heat_consumption_rate,
    }));
  }, [steadyStateData, currentTab]);

  // 处理最优工况点数据
  const optimalChartData = useMemo(() => {
    return optimalPoints
      .sort((a, b) => a.avg_unit_load - b.avg_unit_load)
      .map((item) => ({
        ...item,
        value: currentTab === 0 ? item.boiler_efficiency : item.avg_heat_rate,
      }));
  }, [optimalPoints, currentTab]);

  const getYAxisLabel = () => {
    return currentTab === 0 ? '锅炉效率 (%)' : '热耗率 (kJ/kWh)';
  };

  const handleScatterClick = (props: any) => {
    console.log('散点图点击事件:', props);
    const { payload } = props;
    if (payload) {
      console.log('点击的数据:', payload);
      setSelectedPeriodId(payload.period_id);
    }
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

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {/* 运行工况散点图 */}
          <Paper sx={{ p: 2, height: '400px', flex: 1 }}>
            <Box sx={{ mb: 1, fontWeight: 'bold', textAlign: 'center' }}>运行工况分布</Box>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="avg_unit_load"
                  name="机组负荷"
                  unit="MW"
                  domain={[200, 700]}
                />
                <YAxis
                  type="number"
                  dataKey="value"
                  name={getYAxisLabel()}
                  unit={currentTab === 0 ? '%' : 'kJ/kWh'}
                  domain={currentTab === 0 ? [93, 95] : [7000, 9000]}
                  width={80}
                  tickFormatter={(value) => value.toFixed(0)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Scatter
                  name="运行工况"
                  data={chartData}
                  fill="#1a237e"
                  shape="circle"
                  r={3}
                  isAnimationActive={false}
                  cursor="pointer"
                  onClick={handleScatterClick}
                  onMouseDown={(e) => {
                    console.log('鼠标按下事件:', e);
                  }}
                  onMouseUp={(e) => {
                    console.log('鼠标释放事件:', e);
                  }}
                  onMouseEnter={(e) => {
                    console.log('鼠标进入事件:', e);
                  }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </Paper>

          {/* 最优工况图 */}
          <Paper sx={{ p: 2, height: '400px', flex: 1 }}>
            <Box sx={{ mb: 1, fontWeight: 'bold', textAlign: 'center' }}>最优工况曲线</Box>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="avg_unit_load"
                  name="机组负荷"
                  unit="MW"
                  domain={[330, 620]}
                />
                <YAxis
                  type="number"
                  dataKey="value"
                  name={getYAxisLabel()}
                  unit={currentTab === 0 ? '%' : 'kJ/kWh'}
                  domain={currentTab === 0 ? [93, 95] : [7000, 9000]}
                  width={80}
                  tickFormatter={(value) => value.toFixed(0)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Scatter
                  name="最优工况"
                  data={optimalChartData}
                  fill="#90caf9"
                  shape="circle"
                  r={4}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  data={optimalChartData}
                  stroke="#42a5f5"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </Paper>
        </Box>

        {/* 稳态区间详情 */}
        {selectedPeriodId && (
          <Paper sx={{ p: 2 }}>
            <Box sx={{ mb: 1, fontWeight: 'bold' }}>稳态区间 {selectedPeriodId} 详情</Box>
            <Box sx={{ height: '600px' }}>
              <DetailView steadyStateId={selectedPeriodId.toString()} isEmbedded={true} />
            </Box>
          </Paper>
        )}
      </Box>
    </Box>
  );
};
