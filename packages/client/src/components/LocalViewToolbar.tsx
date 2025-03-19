import { Box, Select, MenuItem, FormControl, InputLabel } from '@mui/material';

interface LocalViewToolbarProps {
  selectedParameter: string;
  onParameterChange: (parameter: string) => void;
  timeGranularity: 'hour' | 'day';
  onTimeGranularityChange: (granularity: 'hour' | 'day') => void;
  parameters: string[];
}

export const LocalViewToolbar = ({
  selectedParameter,
  onParameterChange,
  timeGranularity,
  onTimeGranularityChange,
  parameters,
}: LocalViewToolbarProps) => {
  return (
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      <FormControl sx={{ minWidth: 200 }}>
        <InputLabel>参数选择</InputLabel>
        <Select
          value={selectedParameter}
          onChange={(e) => onParameterChange(e.target.value as string)}
          label="参数选择"
        >
          {parameters.map((param) => (
            <MenuItem key={param} value={param}>
              {param}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl sx={{ minWidth: 120 }}>
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
    </Box>
  );
};
