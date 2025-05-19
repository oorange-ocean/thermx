import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { LocalViewToolbar } from '../components/LocalViewToolbar';
import { ClusterActivityByTimeChart } from '../components/ClusterActivityByTimeChart';
import { ClusterParameterDistributionChart } from '../components/ClusterParameterDistributionChart';
import {
  InteractiveScatterPlot,
  ParameterSelectionOption,
} from '../components/InteractiveScatterPlot';
import { useLocalViewData, ClusteringData } from '../hooks/useLocalViewData';

export const LocalView = () => {
  const { data, loading, loadingProgress, error } = useLocalViewData();

  const availableParameters: ParameterSelectionOption[] = [
    { value: 'avg_unit_load', label: '平均机组负荷' },
    { value: 'avg_boiler_efficiency', label: '平均锅炉效率' },
    { value: 'avg_heat_consumption_rate', label: '平均热耗率' },
    { value: '汽轮机热耗率q', label: '汽轮机热耗率q' },
  ];
  const typedAvailableParameters = availableParameters.map((p) => ({
    ...p,
    value: p.value as keyof ClusteringData,
  }));

  // State for the parameter distribution chart (violin/box)
  const [selectedDistParam, setSelectedDistParam] = useState<keyof ClusteringData>(
    typedAvailableParameters[2].value
  );

  // State for time granularity (shared by some charts)
  const [timeGranularity, setTimeGranularity] = useState<'hour' | 'day'>('hour');

  // States for InteractiveScatterPlot axes
  const defaultScatterX =
    typedAvailableParameters.length > 0 ? typedAvailableParameters[0].value : undefined;
  const defaultScatterY =
    typedAvailableParameters.length > 1 ? typedAvailableParameters[1].value : defaultScatterX;

  const [scatterXAxisParam, setScatterXAxisParam] = useState<keyof ClusteringData | undefined>(
    defaultScatterX
  );
  const [scatterYAxisParam, setScatterYAxisParam] = useState<keyof ClusteringData | undefined>(
    defaultScatterY
  );

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

  const currentSelectedDistParamLabel =
    typedAvailableParameters.find((p) => p.value === selectedDistParam)?.label || selectedDistParam;

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
        // Props for Distribution Chart Parameter Selector
        selectedParameter={selectedDistParam} // Renamed for clarity
        onParameterChange={(paramValue) => setSelectedDistParam(paramValue as keyof ClusteringData)}
        // Props for Time Granularity Selector
        timeGranularity={timeGranularity}
        onTimeGranularityChange={setTimeGranularity}
        // Props for Scatter Plot Axis Selectors
        scatterXAxisParam={scatterXAxisParam}
        onScatterXAxisParamChange={setScatterXAxisParam}
        scatterYAxisParam={scatterYAxisParam}
        onScatterYAxisParamChange={setScatterYAxisParam}
        parameters={typedAvailableParameters} // Common list of parameters for all dropdowns
      />

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, overflow: 'hidden' }}>
        <Box
          sx={{
            display: 'flex',
            flexGrow: 2,
            flexBasis: '40%',
            flexShrink: 1,
            gap: 2,
            minHeight: '300px',
            maxHeight: '45%',
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <ClusterActivityByTimeChart data={data} timeGranularity={timeGranularity} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <ClusterParameterDistributionChart
              data={data}
              selectedParameter={selectedDistParam}
              parameterLabel={currentSelectedDistParamLabel}
            />
          </Box>
        </Box>
        <Box
          sx={{ flexGrow: 3, flexBasis: '60%', flexShrink: 1, minHeight: '350px', marginTop: 1 }}
        >
          <InteractiveScatterPlot
            data={data}
            availableParameters={typedAvailableParameters} // Still needed for axis labels in plot layout
            xAxisParam={scatterXAxisParam} // Pass down the selected X-axis
            yAxisParam={scatterYAxisParam} // Pass down the selected Y-axis
          />
        </Box>
      </Box>
    </Box>
  );
};
