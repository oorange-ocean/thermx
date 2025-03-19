import { Box, Typography, Slider } from '@mui/material';

interface GlobalViewToolbarProps {
  heatRateRange: [number, number];
  onHeatRateRangeChange: (newRange: [number, number]) => void;
  filteredCount?: number;
  totalCount?: number;
}

export const GlobalViewToolbar: React.FC<GlobalViewToolbarProps> = ({
  heatRateRange,
  onHeatRateRangeChange,
  filteredCount = 0,
  totalCount = 0,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 3,
        mb: 2,
        backgroundColor: 'background.paper',
        p: 1,
        borderRadius: 1,
      }}
    >
      <Typography variant="subtitle1" sx={{ minWidth: '120px' }}>
        热耗率范围
      </Typography>

      <Box sx={{ width: '200px' }}>
        {' '}
        {/* 限制滑块宽度 */}
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
        显示 {filteredCount}/{totalCount} 个数据点
      </Typography>

      {/* 这里可以添加更多的控制项，比如：*/}
      {/* - 时间范围选择器 */}
      {/* - 负荷范围筛选 */}
      {/* - 稳态区间筛选 */}
      {/* - 视图切换按钮 */}
      {/* - 导出数据按钮 */}
    </Box>
  );
};
