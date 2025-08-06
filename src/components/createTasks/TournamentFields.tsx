import React from 'react';
import { Box, TextField, FormControl, Select, MenuItem, Typography } from '@mui/material';

const TournamentFields: React.FC = () => {
  return (
    <Box sx={{ mt: 3, p: 2, border: '1px solid', borderColor: 'grey.600', borderRadius: 1 }}>
      <Typography variant="h6" sx={{ mb: 2, color: 'text.primary' }}>
        Параметры турнира
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          label="Название турнира"
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
            Тип турнира
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
              <em>Выберите тип турнира</em>
            </MenuItem>
            <MenuItem value="regular">Регулярные</MenuItem>
            <MenuItem value="local">Локальные</MenuItem>
            <MenuItem value="network">Сетевые</MenuItem>
            <MenuItem value="geo">Гео</MenuItem>
          </Select>
        </FormControl>
        <TextField
          label="Призовой фонд"
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

export default TournamentFields; 