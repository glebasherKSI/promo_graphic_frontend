import React from 'react';
import { Box, TextField, FormControl, Select, MenuItem, Typography } from '@mui/material';

const SngDepositFields: React.FC = () => {
  return (
    <Box sx={{ mt: 3, p: 2, border: '1px solid', borderColor: 'grey.600', borderRadius: 1 }}>
      <Typography variant="h6" sx={{ mb: 2, color: 'text.primary' }}>
        Параметры СНГ-депозитки
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
        <TextField
          label="Сумма депозита"
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
        <TextField
          label="Бонус (%)"
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
        <TextField
          label="Валюта (рубли)"
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
      </Box>
    </Box>
  );
};

export default SngDepositFields; 