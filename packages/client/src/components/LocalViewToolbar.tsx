import { Select, MenuItem, FormControl, InputLabel, Grid } from '@mui/material';
import type { ClusteringData } from '../hooks/useLocalViewData'; // For keyof ClusteringData

// This type is also used by LocalView for defining the available parameters
export interface ParameterOption {
  value: string; // Will be cast to keyof ClusteringData where needed
  label: string;
}

interface LocalViewToolbarProps {
  // For Distribution Chart Parameter
  selectedParameter: keyof ClusteringData;
  onParameterChange: (parameter: keyof ClusteringData) => void;

  // For Time Granularity
  timeGranularity: 'hour' | 'day';
  onTimeGranularityChange: (granularity: 'hour' | 'day') => void;

  // For Scatter Plot X Axis
  scatterXAxisParam: keyof ClusteringData | undefined;
  onScatterXAxisParamChange: (parameter: keyof ClusteringData) => void;

  // For Scatter Plot Y Axis
  scatterYAxisParam: keyof ClusteringData | undefined;
  onScatterYAxisParamChange: (parameter: keyof ClusteringData) => void;

  // Common list of available parameters for all dropdowns
  parameters: ParameterOption[];
}

export const LocalViewToolbar = ({
  selectedParameter,
  onParameterChange,
  timeGranularity,
  onTimeGranularityChange,
  scatterXAxisParam,
  onScatterXAxisParamChange,
  scatterYAxisParam,
  onScatterYAxisParamChange,
  parameters,
}: LocalViewToolbarProps) => {
  return (
    // Using Grid container to manage layout of multiple FormControls
    <Grid container spacing={2} alignItems="center">
      <Grid item xs={12} sm={6} md={3}>
        {' '}
        {/* Adjust xs, sm, md for responsiveness */}
        <FormControl fullWidth>
          <InputLabel>参数分布图参数</InputLabel>
          <Select
            value={selectedParameter}
            onChange={(e) => onParameterChange(e.target.value as keyof ClusteringData)}
            label="参数分布图参数"
          >
            {parameters.map((param) => (
              <MenuItem key={`dist-${param.value}`} value={param.value}>
                {param.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <FormControl fullWidth>
          <InputLabel>时间粒度</InputLabel>
          <Select
            value={timeGranularity}
            onChange={(e) => onTimeGranularityChange(e.target.value as 'hour' | 'day')}
            label="时间粒度"
          >
            <MenuItem value="hour">小时</MenuItem>
            <MenuItem value="day">天</MenuItem>
          </Select>
        </FormControl>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <FormControl fullWidth>
          <InputLabel>散点图 X轴</InputLabel>
          <Select
            value={scatterXAxisParam || ''} // Handle undefined case
            onChange={(e) => onScatterXAxisParamChange(e.target.value as keyof ClusteringData)}
            label="散点图 X轴"
          >
            {parameters.map((param) => (
              <MenuItem key={`scatterX-${param.value}`} value={param.value}>
                {param.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <FormControl fullWidth>
          <InputLabel>散点图 Y轴</InputLabel>
          <Select
            value={scatterYAxisParam || ''} // Handle undefined case
            onChange={(e) => onScatterYAxisParamChange(e.target.value as keyof ClusteringData)}
            label="散点图 Y轴"
          >
            {parameters.map((param) => (
              <MenuItem key={`scatterY-${param.value}`} value={param.value}>
                {param.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
    </Grid>
  );
};
