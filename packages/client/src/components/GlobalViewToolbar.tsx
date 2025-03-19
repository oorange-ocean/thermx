import { Box, Typography, Slider } from '@mui/material';

interface GlobalViewToolbarProps {
  heatRateRange: [number, number];
  onHeatRateRangeChange: (newRange: [number, number]) => void;
  timeScale: number; // 像素/小时
  onTimeScaleChange: (scale: number) => void;
  filteredCount?: number;
  totalCount?: number;
}

export const GlobalViewToolbar: React.FC<GlobalViewToolbarProps> = ({
  heatRateRange,
  onHeatRateRangeChange,
  timeScale,
  onTimeScaleChange,
  filteredCount = 0,
  totalCount = 0,
}) => {
  // 修改时间刻度选项
  const timeScaleOptions = [
    { value: 4, label: '4px = 1小时' }, // 最小刻度
    { value: 12, label: '12px = 1小时' },
    { value: 24, label: '24px = 1小时' },
    { value: 48, label: '48px = 1小时' }, // 最大刻度
  ];

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 2, p: 1 }}>
      <Typography variant="subtitle1" sx={{ minWidth: '120px' }}>
        时间刻度
      </Typography>
      <Box sx={{ width: '200px' }}>
        <Slider
          value={timeScale}
          onChange={(_, newValue) => onTimeScaleChange(newValue as number)}
          min={4} // 最小 4px/小时
          max={48} // 最大 48px/小时
          step={null}
          marks={timeScaleOptions}
          valueLabelDisplay="auto"
          valueLabelFormat={(value) => {
            const option = timeScaleOptions.find((opt) => opt.value === value);
            return option ? option.label : value;
          }}
        />
      </Box>

      <Typography variant="subtitle1" sx={{ minWidth: '120px', ml: 2 }}>
        热耗率范围
      </Typography>
      <Box sx={{ width: '200px' }}>
        <Slider
          value={heatRateRange}
          onChange={(_, newValue) => onHeatRateRangeChange(newValue as [number, number])}
          min={8000}
          max={10000}
          step={100}
          valueLabelDisplay="auto"
          valueLabelFormat={(value) => `${value} kJ/kWh`}
        />
      </Box>

      <Typography variant="body2" color="text.secondary">
        显示 {filteredCount}/{totalCount} 个稳态区间
      </Typography>
    </Box>
  );
};
