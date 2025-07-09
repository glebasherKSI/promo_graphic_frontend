import React from 'react';
import { Typography, Container, Box } from '@mui/material';

const Tasks: React.FC = () => {
  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: 'calc(100vh - 200px)'
      }}>
        <Typography variant="h2" component="h1">
          Задачи
        </Typography>
      </Box>
    </Container>
  );
};

export default Tasks; 