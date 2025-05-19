import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { LocalViewToolbar } from '../components/LocalViewToolbar';
import { ClusterActivityByTimeChart } from '../components/ClusterActivityByTimeChart';
import { ClusterParameterDistributionChart } from '../components/ClusterParameterDistributionChart';
import { useLocalViewData, ClusteringData } from '../hooks/useLocalViewData';

export const LocalView = () => {
  const { data, loading, loadingProgress, error } = useLocalViewData();

  // Define the new set of parameters available for selection
  const availableParameters = [
    { value: 'avg_unit_load' as keyof ClusteringData, label: '平均机组负荷' },
    { value: 'avg_boiler_efficiency' as keyof ClusteringData, label: '平均锅炉效率' },
    { value: 'avg_heat_consumption_rate' as keyof ClusteringData, label: '平均热耗率' }, // This is the raw value
    { value: '汽轮机热耗率q' as keyof ClusteringData, label: '汽轮机热耗率q' }, // This is an alias, effectively same as avg_heat_consumption_rate
  ];

  // Ensure selectedParameter is one of the new available parameter values
  const [selectedParameter, setSelectedParameter] = useState<keyof ClusteringData>(
    availableParameters[2].value
  ); // Default to avg_heat_consumption_rate
  const [timeGranularity, setTimeGranularity] = useState<'hour' | 'day'>('hour');

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-progress">
          <div className="progress-bar" style={{ width: `${loadingProgress}%` }}></div>
        </div>
        <div className="loading-text">正在加载数据 ({loadingProgress}%)...</div>
      </div>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="error">
          数据加载失败
        </Typography>
        <Typography color="error">{error.message}</Typography>
      </Box>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6">暂无数据或数据仍在加载中...</Typography>
      </Box>
    );
  }

  // Prepare parameters for the toolbar (value and label for display)
  const toolbarParameters = availableParameters.map((p) => ({ value: p.value, label: p.label }));
  const currentSelectedParameterLabel =
    availableParameters.find((p) => p.value === selectedParameter)?.label || selectedParameter;

  return (
    <Box
      sx={{
        width: '100%',
        height: 'calc(100vh - 88px)',
        display: 'flex',
        flexDirection: 'column',
        p: 2,
        gap: 2,
      }}
    >
      <Typography variant="h5" gutterBottom>
        工况局部视图
      </Typography>

      <LocalViewToolbar
        selectedParameter={selectedParameter}
        onParameterChange={(paramValue) => setSelectedParameter(paramValue as keyof ClusteringData)}
        timeGranularity={timeGranularity}
        onTimeGranularityChange={setTimeGranularity}
        parameters={toolbarParameters}
      />

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'flex', flex: 1, gap: 2 }}>
          <Box sx={{ flex: 1 }}>
            <ClusterActivityByTimeChart data={data} timeGranularity={timeGranularity} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <ClusterParameterDistributionChart
              data={data}
              selectedParameter={selectedParameter}
              parameterLabel={currentSelectedParameterLabel}
            />
          </Box>
        </Box>
        <Box sx={{ flex: 1, border: '1px dashed grey', p: 1 }}>
          <Typography variant="subtitle2" align="center">
            交互式散点图区域
          </Typography>
          {/* Placeholder for InteractiveScatterPlot */}
        </Box>
      </Box>
    </Box>
  );
};
