import React from 'react';
import { Box, Grid, Paper, Typography } from '@mui/material';
import { RealTimeData } from '../../types/realTimeData';
import { DataCard } from '../../components/DataCard';
import BoilerIcon from '../../assets/icons/boiler.svg';

interface BoilerViewProps {
  data: RealTimeData;
}

export const BoilerView: React.FC<BoilerViewProps> = ({ data }) => {
  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, height: '100%' }} elevation={2}>
            <Typography variant="h6" gutterBottom>
              锅炉系统示意图
            </Typography>
            <Box
              sx={{ height: 400, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
            >
              <img src={BoilerIcon} alt="锅炉示意图" style={{ height: '100%', width: 'auto' }} />
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%' }} elevation={2}>
            <Typography variant="h6" gutterBottom>
              关键参数
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <DataCard title="锅炉效率" value={data.锅炉效率} unit="%" color="#2e7d32" />
              </Grid>
              <Grid item xs={12}>
                <DataCard title="主蒸汽流量" value={data.主蒸汽流量} unit="t/h" />
              </Grid>
              <Grid item xs={12}>
                <DataCard title="主蒸汽母管温度" value={data.主蒸汽母管温度} unit="°C" />
              </Grid>
              <Grid item xs={12}>
                <DataCard title="主汽压力" value={data.主汽压力} unit="MPa" />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 3 }} elevation={2}>
            <Typography variant="h6" gutterBottom>
              详细参数
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <DataCard title="给水流量" value={data.主给水流量} unit="t/h" />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <DataCard title="减温水流量" value={data.减温水流量} unit="t/h" />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <DataCard title="省煤器进口给水温度" value={data.省煤器进口给水温度} unit="°C" />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <DataCard title="省煤器进口给水压力" value={data.省煤器进口给水压力} unit="MPa" />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <DataCard title="再热汽压力" value={data.再热汽压力} unit="MPa" />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <DataCard title="再热汽母管温度" value={data.再热汽母管温度} unit="°C" />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <DataCard title="再热减温水总管压力" value={data.再热减温水总管压力} unit="MPa" />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <DataCard title="再热减温水总管温度" value={data.再热减温水总管温度} unit="°C" />
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};
