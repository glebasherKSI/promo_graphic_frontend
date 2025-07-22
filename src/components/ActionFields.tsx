import React from 'react';
import { Box, TextField, FormControl, Select, MenuItem, Typography } from '@mui/material';

const ActionFields: React.FC = () => {
  return (
    <Box sx={{ mt: 3, p: 2, border: '1px solid', borderColor: 'grey.600', borderRadius: 1 }}>
      <Typography variant="h6" sx={{ mb: 2, color: 'text.primary' }}>
        Параметры акции
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          label="Название акции"
          fullWidth
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: 'grey.800',
              '& fieldset': {
                borderColor: 'grey.600',
              },
            },
          }}
        />
        <FormControl fullWidth>
          <Typography variant="body2" sx={{ mb: 1, color: 'text.primary' }}>
            Масштаб акции
          </Typography>
          <Select
            displayEmpty
            sx={{
              backgroundColor: 'grey.800',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'grey.600',
              },
            }}
          >
            <MenuItem value="">
              <em>Выберите масштаб</em>
            </MenuItem>
            <MenuItem value="global">Глобальные</MenuItem>
            <MenuItem value="network">Сетевые</MenuItem>
            <MenuItem value="local">Локальные</MenuItem>
          </Select>
        </FormControl>
        <TextField
          label="Скидка (%)"
          fullWidth
          type="number"
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: 'grey.800',
              '& fieldset': {
                borderColor: 'grey.600',
              },
            },
          }}
        />
      </Box>
    </Box>
  );
};

export default ActionFields; 