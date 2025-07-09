import React from 'react';
import { Tabs, Tab, Box } from '@mui/material';
import { Link, useLocation } from 'react-router-dom';

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
          to="/tasks"
          component={Link}
        />
      </Tabs>
    </Box>
  );
};

export default Navigation; 