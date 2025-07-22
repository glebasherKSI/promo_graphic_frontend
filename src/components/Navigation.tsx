import React from 'react';
import { Tabs, Tab, Box } from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import { FEATURE_FLAGS } from '../constants/promoTypes';

const Navigation: React.FC = () => {
  const location = useLocation();
  
  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
      <Tabs 
        value={location.pathname} 
        textColor="inherit"
        indicatorColor="primary"
        sx={{
          '& .MuiTab-root': {
            color: 'text.primary',
            '&.Mui-selected': {
              color: 'primary.main',
            },
          },
        }}
      >
        <Tab 
          label="График" 
          value="/" 
          to="/"
          component={Link}
        />
        <Tab 
          label="Задачи" 
          value="/tasks" 
          to={FEATURE_FLAGS.TASKS_ENABLED ? "/tasks" : "#"}
          component={FEATURE_FLAGS.TASKS_ENABLED ? Link : "span"}
          disabled={!FEATURE_FLAGS.TASKS_ENABLED}
          sx={{
            opacity: FEATURE_FLAGS.TASKS_ENABLED ? 1 : 0.5,
            cursor: FEATURE_FLAGS.TASKS_ENABLED ? 'pointer' : 'not-allowed',
            '&.Mui-disabled': {
              color: 'text.disabled',
            }
          }}
        />
      </Tabs>
    </Box>
  );
};

export default Navigation; 