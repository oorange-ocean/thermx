import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  flexRender,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  CircularProgress,
  Box,
} from '@mui/material';
import { API_BASE_URL } from '../config';

interface SteadyStatePeriod {
  period_id: number;
  start_time: string;
  end_time: string;
  period_length: number;
}

const columnHelper = createColumnHelper<SteadyStatePeriod>();

const columns = [
  columnHelper.accessor('period_id', {
    header: 'ID',
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor('start_time', {
    header: '开始时间',
    cell: (info) => new Date(info.getValue()).toLocaleString(),
  }),
  columnHelper.accessor('end_time', {
    header: '结束时间',
    cell: (info) => new Date(info.getValue()).toLocaleString(),
  }),
  columnHelper.accessor('period_length', {
    header: '持续时间 (秒)',
    cell: (info) => {
      const value = info.getValue();
      return value != null ? value.toFixed(2) : '-';
    },
  }),
];

export const SteadyStatePeriodsView = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<SteadyStatePeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // 注意: 这里的 '/api' 前缀取决于你的代理设置或后端部署方式
        // 如果你的后端直接在根路径提供服务，则不需要 /api
        // 假设后端服务在 /api 路径下
        const response = await fetch(`${API_BASE_URL}/steady-state/periods`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        console.log('Fetched steady state periods:', result);
        setData(result);
      } catch (e: unknown) {
        console.error('Failed to fetch steady state periods:', e);
        if (e instanceof Error) {
          setError(`获取数据失败: ${e.message}`);
        } else {
          setError('获取数据失败: 未知错误');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const handleRowClick = (periodId: number) => {
    navigate(`/detail/${periodId}`);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Typography color="error">{error}</Typography>;
  }

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <Typography variant="h5" sx={{ p: 2 }}>
        稳态区间数据
      </Typography>
      <TableContainer sx={{ maxHeight: 'calc(100vh - 200px)' }}>
        <Table stickyHeader aria-label="steady state periods table">
          <TableHead>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableCell key={header.id} sx={{ fontWeight: 'bold' }}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableHead>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow
                hover
                key={row.id}
                onClick={() => handleRowClick(row.original.period_id)}
                sx={{
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                  },
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};
