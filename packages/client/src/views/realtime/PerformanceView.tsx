import React from 'react';
import { Box, Grid, Paper, Typography } from '@mui/material';
import { RealTimeData } from '../../types/realTimeData';
import { DataCard } from '../../components/DataCard';
import { LineChart } from '../../components/LineChart';

interface PerformanceViewProps {
  data: RealTimeData;
  historicalData: Array<{ time: string; value: number }>;
}

export const PerformanceView: React.FC<PerformanceViewProps> = ({ data, historicalData }) => {
  return (
    <Box>
      <Paper sx={{ p: 3, mb: 4 }} elevation={2}>
        <Typography variant="h6" gutterBottom>
          关键性能指标
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            <DataCard title="机组负荷" value={data.机组负荷} unit="MW" color="#2e7d32" />
          </Grid>
          <Grid item xs={12} md={3}>
            <DataCard title="汽轮机热耗率" value={data.汽轮机热耗率q} unit="kJ/kWh" />
          </Grid>
          <Grid item xs={12} md={3}>
            <DataCard title="修正后热耗率" value={data.修正后热耗率q} unit="kJ/kWh" />
          </Grid>
          <Grid item xs={12} md={3}>
            <DataCard title="修正系数" value={data.修正系数} />
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }} elevation={2}>
            <Typography variant="h6" gutterBottom>
              效率指标
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <DataCard title="高压缸效率" value={data.高压缸效率} unit="%" />
              </Grid>
              <Grid item xs={6}>
                <DataCard title="中压缸效率" value={data.中压缸效率} unit="%" />
              </Grid>
              <Grid item xs={6}>
                <DataCard title="锅炉效率" value={data.锅炉效率} unit="%" />
              </Grid>
              <Grid item xs={6}>
                <DataCard title="厂用电率" value={data.厂用电率} unit="%" />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }} elevation={2}>
            <Typography variant="h6" gutterBottom>
              热耗率趋势
            </Typography>
            <Box sx={{ height: 300 }}>
              <LineChart data={historicalData} xKey="time" yKey="value" yAxisLabel="kJ/kWh" />
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};
