import { Tab } from '@mui/material';
import { styled } from '@mui/material/styles';

export const StyledTab = styled(Tab)({
  '&.Mui-selected': {
    outline: 'none',
  },
  '&.Mui-focusVisible': {
    outline: 'none',
  },
  '&:focus': {
    outline: 'none',
  },
  '&:active': {
    outline: 'none',
  },
  '& .MuiTouchRipple-root': {
    display: 'none',
  },
});
