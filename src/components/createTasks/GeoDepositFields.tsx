import React, { useState, useEffect } from 'react';
import { Box, TextField, FormControl, Select, MenuItem, Typography } from '@mui/material';
import { GEO_DEPOSIT_FIELDS } from '../../constants/promoTypes';

interface GeoDepositFieldsProps {
  onFieldsChange: (fields: { [key: string]: string }) => void;
}

const GeoDepositFields: React.FC<GeoDepositFieldsProps> = ({ onFieldsChange }) => {
  const [depositType, setDepositType] = useState<string>('');
  const [fieldValues, setFieldValues] = useState<{ [key: string]: string }>({});

  const commonFieldStyle = {
    '& .MuiOutlinedInput-root': {
      backgroundColor: 'grey.800',
      '& fieldset': {
        borderColor: 'grey.600',
      },
    },
  };

  // Обновляем значения и всегда включаем depositType
  const handleFieldChange = (fieldName: string, value: string) => {
    const newFieldValues = {
      ...fieldValues,
      [fieldName]: value,
    };
    setFieldValues(newFieldValues);
    onFieldsChange({ ...newFieldValues, depositType });
  };

  // Следим за изменением типа депозитки и всегда включаем его в объект
  useEffect(() => {
    onFieldsChange({ ...fieldValues, depositType });
  }, [depositType, fieldValues, onFieldsChange]);

  return (
    <Box sx={{ mt: 3, p: 2, border: '1px solid', borderColor: 'grey.600', borderRadius: 1 }}>
      <Typography variant="h6" sx={{ mb: 2, color: 'text.primary' }}>
        Параметры ГЕО-депозитки
      </Typography>
      {/* Дропдаун выбора типа */}
      <FormControl fullWidth sx={{ mb: 3 }}>
        <Typography variant="body2" sx={{ mb: 1, color: 'text.primary' }}>
          Тип депозитки
        </Typography>
        <Select
          value={depositType}
          onChange={(e) => setDepositType(e.target.value)}
          displayEmpty
          sx={{
            backgroundColor: 'grey.800',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: 'grey.600',
            },
          }}
        >
          <MenuItem value="">
            <em>Выберите тип депозитки</em>
          </MenuItem>
          <MenuItem value="common">Общая</MenuItem>
          <MenuItem value="segmented">Сегментированная</MenuItem>
        </Select>
      </FormControl>
      {/* Поля для общей депозитки */}
      {depositType === 'common' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {GEO_DEPOSIT_FIELDS.common.map((field) => (
            <TextField
              key={field}
              label={field}
              fullWidth
              value={fieldValues[field] || ''}
              onChange={(e) => handleFieldChange(field, e.target.value)}
              sx={commonFieldStyle}
            />
          ))}
        </Box>
      )}
      {/* Поля для сегментированной депозитки */}
      {depositType === 'segmented' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {GEO_DEPOSIT_FIELDS.segmented.map((field) => (
            <TextField
              key={field}
              label={field}
              fullWidth
              value={fieldValues[field] || ''}
              onChange={(e) => handleFieldChange(field, e.target.value)}
              sx={commonFieldStyle}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

export default GeoDepositFields; 