import React, { useState } from 'react';
import {
  Box,
  Typography,
  Chip,
  Stack,
  Collapse,
  IconButton,
  Paper,
  Divider
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { PROMO_EVENT_COLORS, CHANNEL_COLORS, PROMO_KINDS } from '../constants/promoTypes';

const ColorLegend: React.FC = () => {
  const [expanded, setExpanded] = useState(false);

  const handleToggle = () => {
    setExpanded(!expanded);
  };

  // Группируем цвета промо-событий по типам
  const groupedPromoColors = Object.entries(PROMO_EVENT_COLORS).reduce((acc, [key, color]) => {
    if (key.includes('-')) {
      const [type, kind] = key.split('-');
      if (!acc[type]) acc[type] = [];
      acc[type].push({ kind, color, key });
    } else {
      // Для типов без видов
      if (!acc[key]) acc[key] = [];
      acc[key].push({ kind: '', color, key });
    }
    return acc;
  }, {} as { [type: string]: { kind: string; color: string; key: string }[] });

  return (
    <Paper 
      sx={{ 
        position: 'absolute',
        top: 0,
        right: 0,
        zIndex: 10,
        bgcolor: '#333a56',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        maxWidth: 350,
        minWidth: 200
      }}
    >
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          p: 1,
          cursor: 'pointer'
        }}
        onClick={handleToggle}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
          Легенда цветов
        </Typography>
        <IconButton size="small" sx={{ color: 'inherit' }}>
          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>
      
      <Collapse in={expanded}>
        <Box sx={{ p: 2, pt: 0 }}>
          {/* Промо-события */}
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
            Промо-события
          </Typography>
          
          <Stack spacing={1.5} sx={{ mb: 2 }}>
            {Object.entries(groupedPromoColors).map(([type, items]) => (
              <Box key={type}>
                <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 'medium', fontSize: '0.8rem' }}>
                  {type}
                </Typography>
                <Stack spacing={0.5}>
                  {items.map(({ kind, color, key }) => (
                    <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        size="small"
                        sx={{
                          backgroundColor: color,
                          color: '#000',
                          fontSize: '0.65rem',
                          height: 18,
                          minWidth: 60,
                          '& .MuiChip-label': {
                            px: 0.5,
                          }
                        }}
                        label={kind || type}
                      />
                      <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                        {kind ? `${type} - ${kind}` : type}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>
            ))}
          </Stack>

          <Divider sx={{ my: 1.5, bgcolor: 'rgba(255, 255, 255, 0.12)' }} />

          {/* Каналы информирования */}
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
            Каналы информирования
          </Typography>
          
          <Stack spacing={0.5}>
            {Object.entries(CHANNEL_COLORS).map(([channel, color]) => (
              <Box key={channel} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  size="small"
                  sx={{
                    backgroundColor: color,
                    color: '#000',
                    fontSize: '0.65rem',
                    height: 18,
                    minWidth: 60,
                    '& .MuiChip-label': {
                      px: 0.5,
                    }
                  }}
                  label={channel}
                />
                <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                  {channel}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      </Collapse>
    </Paper>
  );
};

export default ColorLegend; 