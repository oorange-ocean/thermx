import { Box, Typography, Slider } from '@mui/material';

interface GlobalViewToolbarProps {
  heatRateRange: [number, number];
  onHeatRateRangeChange: (newRange: [number, number]) => void;
  timeScale: number; // 像素/小时
  onTimeScaleChange: (scale: number) => void;
  filteredCount?: number;
  totalCount?: number;
  heatRateExtent: [number, number];
}

export const GlobalViewToolbar: React.FC<GlobalViewToolbarProps> = ({
  heatRateRange,
  onHeatRateRangeChange,
  timeScale,
  onTimeScaleChange,
  filteredCount = 0,
  totalCount = 0,
  heatRateExtent,
}) => {
  // 修改时间刻度选项，只保留刻度点，不显示标签
  const timeScaleOptions = [{ value: 4 }, { value: 12 }, { value: 24 }, { value: 48 }];

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 2, p: 1 }}>
      <Typography variant="subtitle1" sx={{ minWidth: '120px' }}>
        时间刻度
      </Typography>
      <Box sx={{ width: '200px' }}>
        <Slider
          value={timeScale}
          onChange={(_, newValue) => onTimeScaleChange(newValue as number)}
          min={4}
          max={48}
          step={null}
          marks={timeScaleOptions} // 只有刻度点，没有标签
          valueLabelDisplay="auto"
          valueLabelFormat={(value) => `${value}px = 1小时`}
        />
      </Box>

      <Typography variant="subtitle1" sx={{ minWidth: '120px', ml: 2 }}>
        热耗率范围
      </Typography>
      <Box sx={{ width: '200px' }}>
        <Slider
          value={heatRateRange}
          onChange={(_, newValue) => onHeatRateRangeChange(newValue as [number, number])}
          min={heatRateExtent[0]}
          max={heatRateExtent[1]}
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
