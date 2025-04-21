import React from 'react';
import { Card, CardContent, Typography } from '@mui/material';

interface DataCardProps {
  title: string;
  value: string | number;
  unit?: string;
  color?: string;
}

export const DataCard: React.FC<DataCardProps> = ({ title, value, unit, color = '#1976d2' }) => {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          {title}
        </Typography>
        <Typography variant="h5" component="div" sx={{ color }}>
          {typeof value === 'number' ? value.toFixed(2) : value}
          {unit && (
            <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
              {unit}
            </Typography>
          )}
        </Typography>
      </CardContent>
    </Card>
  );
};
