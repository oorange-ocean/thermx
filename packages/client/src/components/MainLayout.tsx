import { ReactNode, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useTheme,
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Timeline as TimelineIcon,
  Analytics as AnalyticsIcon,
  Dashboard as DashboardIcon,
} from '@mui/icons-material';

const DRAWER_WIDTH = 150;
const DRAWER_COLLAPSED_WIDTH = 60;

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [open, setOpen] = useState(true);
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const handleDrawerToggle = () => {
    setOpen(!open);
  };

  const menuItems = [
    { text: '整合视图', icon: <DashboardIcon />, path: '/integrated' },
    { text: '全局视图', icon: <TimelineIcon />, path: '/global' },
    { text: '局部视图', icon: <AnalyticsIcon />, path: '/local' },
  ];

  return (
    <Box sx={{ display: 'flex', width: '100%', height: '100%', overflow: 'hidden' }}>
      <Drawer
        variant="permanent"
        open={open}
        sx={{
          width: open ? DRAWER_WIDTH : DRAWER_COLLAPSED_WIDTH,
          flexShrink: 0,
          whiteSpace: 'nowrap',
          boxSizing: 'border-box',
          '& .MuiDrawer-paper': {
            width: open ? DRAWER_WIDTH : DRAWER_COLLAPSED_WIDTH,
            transition: theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
            overflowX: 'hidden',
            backgroundColor: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
          },
        }}
      >
        <Box
          sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Logo区域 */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              p: 2,
              minHeight: 64,
            }}
          >
            <Typography variant="h6" noWrap component="div">
              {open ? 'THERMX' : 'T'}
            </Typography>
          </Box>

          <Divider sx={{ backgroundColor: 'rgba(255,255,255,0.12)' }} />

          {/* 菜单列表 */}
          <List sx={{ flexGrow: 1 }}>
            {menuItems.map((item) => (
              <ListItem key={item.text} disablePadding sx={{ display: 'block' }}>
                <ListItemButton
                  selected={location.pathname === item.path}
                  onClick={() => navigate(item.path)}
                  sx={{
                    minHeight: 48,
                    justifyContent: open ? 'initial' : 'center',
                    px: 2.5,
                    '&.Mui-selected': {
                      backgroundColor: 'rgba(255,255,255,0.08)',
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      mr: open ? 3 : 'auto',
                      justifyContent: 'center',
                      color: 'inherit',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    sx={{
                      opacity: open ? 1 : 0,
                      color: 'inherit',
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>

          {/* 展开/收缩按钮 */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-end',
              p: 1,
            }}
          >
            <IconButton onClick={handleDrawerToggle} sx={{ color: 'inherit' }}>
              {open ? <ChevronLeftIcon /> : <ChevronRightIcon />}
            </IconButton>
          </Box>
        </Box>
      </Drawer>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <Toolbar />
        <Box
          sx={{
            flexGrow: 1,
            width: '100%',
            overflow: 'auto',
            p: 3,
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
};
