import React from 'react';
import { Box, TextField, FormControl, Select, MenuItem, Typography, Checkbox, FormControlLabel } from '@mui/material';

const InfoFields: React.FC = () => {
  return (
    <Box sx={{ mt: 3, p: 2, border: '1px solid', borderColor: 'grey.600', borderRadius: 1 }}>
      <Typography variant="h6" sx={{ mb: 2, color: 'text.primary' }}>
        Параметры информирования
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          label="Тема сообщения"
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
          label="Текст сообщения"
          fullWidth
          multiline
          rows={4}
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
            Каналы отправки
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <FormControlLabel
              control={<Checkbox />}
              label="E-mail"
              sx={{ color: 'text.primary' }}
            />
            <FormControlLabel
              control={<Checkbox />}
              label="MSGR"
              sx={{ color: 'text.primary' }}
            />
            <FormControlLabel
              control={<Checkbox />}
              label="PUSH"
              sx={{ color: 'text.primary' }}
            />
            <FormControlLabel
              control={<Checkbox />}
              label="SMM"
              sx={{ color: 'text.primary' }}
            />
          </Box>
        </FormControl>
      </Box>
    </Box>
  );
};

export default InfoFields; 