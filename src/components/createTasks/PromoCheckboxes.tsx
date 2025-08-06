import React, { useState, useEffect } from 'react';
import { Box, Typography, Checkbox, FormControlLabel } from '@mui/material';
import { PROMO_CHECKBOXES } from '../../constants/promoTypes';

interface PromoCheckboxesProps {
  promoType: string;
  onCheckboxChange: (checkedItems: string[]) => void;
}

const PromoCheckboxes: React.FC<PromoCheckboxesProps> = ({ promoType, onCheckboxChange }) => {
  const checkboxes = PROMO_CHECKBOXES[promoType as keyof typeof PROMO_CHECKBOXES] || [];
  
  // Инициализируем все чекбоксы как отмеченные
  const [checkedItems, setCheckedItems] = useState<{ [key: string]: boolean }>(() => {
    const initialState: { [key: string]: boolean } = {};
    checkboxes.forEach(item => {
      initialState[item] = true;
    });
    return initialState;
  });

  // При первом рендере передаем все чекбоксы как отмеченные
  useEffect(() => {
    onCheckboxChange([...checkboxes]);
  }, [promoType]); // Запускаем при смене типа промо

  const handleCheckboxChange = (item: string) => {
    const newCheckedItems = {
      ...checkedItems,
      [item]: !checkedItems[item]
    };
    setCheckedItems(newCheckedItems);
    
    // Передаем только отмеченные чекбоксы наверх
    const checkedItemsList = Object.keys(newCheckedItems).filter(key => newCheckedItems[key]);
    onCheckboxChange(checkedItemsList);
  };

  if (!checkboxes.length) {
    return null;
  }

  return (
    <Box sx={{ 
      mt: 3, 
      p: 2, 
      border: '1px solid', 
      borderColor: 'grey.600', 
      borderRadius: 1,
      backgroundColor: 'background.paper'
    }}>
      <Typography variant="h6" sx={{ mb: 2, color: 'text.primary' }}>
        Задачи
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {checkboxes.map((item) => (
          <FormControlLabel
            key={item}
            control={
              <Checkbox
                checked={checkedItems[item] || false}
                onChange={() => handleCheckboxChange(item)}
                sx={{
                  color: 'grey.400',
                  '&.Mui-checked': {
                    color: '#00e676',
                  },
                  '&.Mui-checked:hover': {
                    color: '#69f0ae',
                  },
                }}
              />
            }
            label={item}
            sx={{ 
              color: 'text.primary',
              '& .MuiFormControlLabel-label': {
                fontSize: '0.875rem',
              }
            }}
          />
        ))}
      </Box>
    </Box>
  );
};

export default PromoCheckboxes; 