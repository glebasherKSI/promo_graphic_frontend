import * as React from 'react';
import {
  Box,
  Button,
  Drawer,
  Typography,
  Divider,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { PROMO_EVENT_COLORS } from '../../constants/promoTypes';

export default function ColorLegend() {
  const [open, setOpen] = React.useState(false);

  // Функция для группировки событий по категориям
  const groupedEvents = React.useMemo(() => {
    const groups: { [key: string]: Array<{ name: string; color: string }> } = {};
    
    Object.entries(PROMO_EVENT_COLORS).forEach(([eventName, color]) => {
      const [category] = eventName.split('-');
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push({ name: eventName, color });
    });
    
    return groups;
  }, []);

  return (
    <>
      <Button
        variant="contained"
        onClick={() => setOpen(true)}
        sx={{ 
          whiteSpace: 'nowrap',
          minWidth: 120,
          height: 40,
          borderRadius: 2
        }}
      >
        Легенда цветов
      </Button>

      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: '92vw', sm: 420 },
            maxWidth: '92vw',
            bgcolor: 'background.paper',
            borderTopLeftRadius: 12,
            borderBottomLeftRadius: 12,
          },
        }}
      >
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">Легенда цветов</Typography>
          <IconButton onClick={() => setOpen(false)} aria-label="Закрыть">
            <CloseIcon />
          </IconButton>
        </Box>
        <Divider />

        <Box sx={{ p: 2, overflow: 'auto', height: '100%' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {Object.entries(groupedEvents).map(([category, events]) => (
              <Box key={category}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: 'text.primary' }}>
                  {category}
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {events.map((event) => (
                    <Box key={event.name} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          backgroundColor: event.color,
                          border: '1px solid',
                          borderColor: 'divider',
                        }}
                      />
                      <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                        {event.name.replace(`${category}-`, '')}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Drawer>
    </>
  );
}