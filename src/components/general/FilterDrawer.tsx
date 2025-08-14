import * as React from 'react';
import {
  Box,
  Button,
  Drawer,
  Typography,
  Divider,
  IconButton,
  FormControl,
  Select,
  MenuItem,
  Chip,
  Stack,
  Checkbox,
  FormControlLabel,
  FormLabel,
  ListSubheader,
  CircularProgress,
} from '@mui/material';
import { SelectChangeEvent } from '@mui/material/Select';
import { DatePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import FilterListIcon from '@mui/icons-material/FilterList';

interface FilterDrawerProps {
  selectedMonth: number;
  selectedYear: number;
  selectedProjects: string[];
  hideSport: boolean;
  PROJECTS: string[];
  onMonthChange: (date: dayjs.Dayjs | null) => void;
  onProjectsChange: (event: SelectChangeEvent<string[]>) => void;
  onHideSportChange: (checked: boolean) => void;
  anchorElementRef?: React.RefObject<HTMLElement>; // Ref для элемента привязки
  loadEvents?: () => Promise<void>;
  loading?: boolean;
}

export default function FilterDrawer({
  selectedMonth,
  selectedYear,
  selectedProjects,
  hideSport,
  PROJECTS,
  onMonthChange,
  onProjectsChange,
  onHideSportChange,
  anchorElementRef,
  loadEvents,
  loading,
}: FilterDrawerProps) {
    const [isOpen, setIsOpen] = React.useState(false);
   
  // Состояние для отслеживания позиции скролла
  const [scrollY, setScrollY] = React.useState(0);
  
  // Состояние для отслеживания готовности элемента привязки
  const [isAnchorReady, setIsAnchorReady] = React.useState(false);
  
  // Обработчик скролла с throttling для производительности
  React.useEffect(() => {
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setScrollY(window.scrollY);
          ticking = false;
        });
        ticking = true;
      }
    };
    
    // Инициализируем позицию сразу при монтировании
    setScrollY(window.scrollY);
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Отслеживаем готовность элемента привязки
  React.useEffect(() => {
    if (anchorElementRef?.current) {
      setIsAnchorReady(true);
      setScrollY(window.scrollY);
    }
  }, [anchorElementRef]);

  // Принудительно обновляем позицию после монтирования
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (anchorElementRef?.current) {
        setIsAnchorReady(true);
        setScrollY(window.scrollY);
      }
    }, 0);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Вычисляем позицию кнопки относительно элемента привязки
  const buttonPosition = React.useMemo(() => {
    if (!anchorElementRef?.current || !isAnchorReady) {
      // Если нет элемента привязки или он еще не готов, используем стандартное поведение
      const maxScroll = 100;
      const minTop = 16;
      const maxTop = 100;
      
      if (scrollY <= maxScroll) {
        return {
          top: minTop + (scrollY / maxScroll) * (maxTop - minTop),
          left: 16
        };
      } else {
        return { top: maxTop, left: 16 };
      }
    }
    
    const anchorElement = anchorElementRef.current;
    const rect = anchorElement.getBoundingClientRect();
    const anchorTop = rect.top + window.scrollY;
    const anchorLeft = rect.left;
    
    // Если элемент привязки видим (выше верха экрана)
    if (rect.top > 0) {
      // Кнопка следует за элементом
      return {
        top: Math.max(16, anchorTop - scrollY + 16), // 16px от верха элемента
        left: anchorLeft + 16 // 16px от левого края элемента
      };
    } else {
      // Элемент скрылся, кнопка в левом верхнем углу
      return { top: 16, left: 16 };
    }
  }, [scrollY, anchorElementRef, isAnchorReady]);

  return (
    <>
             {/* Кнопка открытия фильтра - следует за элементом привязки */}
               <Box
          sx={{
            position: 'fixed',
            top: buttonPosition.top,
            left: buttonPosition.left,
            zIndex: 1000,
          }}
        >
        <Button
          variant="contained"
          onClick={() => setIsOpen(true)}
          size="small"
          sx={{
            minWidth: 'auto',
            width: 48,
            height: 48,
            borderRadius: '50%',
            boxShadow: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            '&:hover': {
              boxShadow: 6,
            },
          }}
          aria-label="Открыть фильтры"
        >
          <FilterListIcon sx={{ fontSize: 20 }} />
        </Button>
      </Box>

      <Drawer
        anchor="left"
        open={isOpen}
        onClose={() => setIsOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: '92vw', sm: 420 },
            maxWidth: '92vw',
            bgcolor: 'background.paper',
            borderTopRightRadius: 12,
            borderBottomRightRadius: 12,
          },
        }}
      >
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">Фильтры</Typography>
          <IconButton onClick={() => setIsOpen(false)} aria-label="Закрыть">
            <ChevronLeftIcon />
          </IconButton>
        </Box>
        <Divider />

        <Box
          sx={{
            p: 2,
            overflow: 'auto',
            height: '100%',
            bgcolor: (theme) => theme.palette.background.paper, // Цвет фона как на скриншоте
            borderRadius: 3,
          }}
        >
          <Stack spacing={3}>
            {/* Месяц */}
            <Box>
              <FormLabel sx={{ fontSize: 12, color: 'text.secondary', mb: 1, display: 'block' }}>
                Месяц
              </FormLabel>
              <Stack direction="row" alignItems="center" spacing={1}>
                <IconButton
                  onClick={() => {
                    if (selectedMonth === 1) {
                      onMonthChange(dayjs().year(selectedYear - 1).month(11));
                    } else {
                      onMonthChange(dayjs().year(selectedYear).month(selectedMonth - 2));
                    }
                  }}
                  size="small"
                  sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}
                >
                  <ChevronLeftIcon fontSize="small" />
                </IconButton>

                <DatePicker
                  views={['month', 'year']}
                  value={dayjs().year(selectedYear).month(selectedMonth - 1)}
                  onChange={onMonthChange}
                  slotProps={{
                    textField: {
                      size: 'small',
                      fullWidth: true,
                      placeholder: 'Выберите месяц',
                    },
                    field: { clearable: false },
                  }}
                  sx={{
                    bgcolor: 'background.paper',
                    '& .MuiInputBase-input': {
                      bgcolor: 'background.paper',
                    },
                    '& .MuiInputAdornment-root': {
                      bgcolor: 'background.paper',
                      borderTopRightRadius: 8,
                      borderBottomRightRadius: 8,
                    },
                    '& .MuiIconButton-root': {
                      bgcolor: 'background.paper',
                      borderTopRightRadius: 8,
                      borderBottomRightRadius: 8,
                    },
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'background.paper',
                      borderRadius: 2,
                    },
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'secondary.main',
                    }
                  }}
                />

                <IconButton
                  onClick={() => {
                    if (selectedMonth === 12) {
                      onMonthChange(dayjs().year(selectedYear + 1).month(0));
                    } else {
                      onMonthChange(dayjs().year(selectedYear).month(selectedMonth));
                    }
                  }}
                  size="small"
                  sx={{ border: 1, borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper' }}
                >
                  <ChevronRightIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Box>

            {/* Проекты */}
            <Box>
              <FormLabel sx={{ fontSize: 12, color: 'text.secondary', mb: 1, display: 'block' }}>
                Проекты
              </FormLabel>
              <FormControl fullWidth>
                <Select
                  multiple
                  size="small"
                  fullWidth
                  value={selectedProjects}
                  onChange={onProjectsChange}
                  displayEmpty
                  sx={{
                    bgcolor: 'background.paper', // более нейтральный фон
                    borderRadius: 2,
                    '& .MuiSelect-select': {
                      bgcolor: 'background.paper',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'primary.main',
                    },
                  }}
                  renderValue={(selected) => {
                    const sel = selected as string[];
                    if (!sel.length) return <Box sx={{ opacity: 0.6 }}>Не выбрано</Box>;
                    const max = 5;
                    const visible = sel.slice(0, max);
                    const rest = sel.length - visible.length;
                    return (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, overflow: 'hidden' }}>
                        <Box sx={{ display: 'flex', gap: 0.5, overflowX: 'auto', pr: 0.5 }}>
                          {visible.map((v) => (
                            <Chip
                              key={v}
                              label={v}
                              size="small"
                              sx={{
                                height: 24,
                                '& .MuiChip-label': { px: 1 },
                                bgcolor: 'secondary.main',
                                color: 'secondary.contrastText',
                                opacity: 0.85, // чуть менее ярко
                              }}
                            />
                          ))}
                        </Box>
                        {rest > 0 && (
                          <Chip
                            size="small"
                            label={`+${rest}`}
                            sx={{
                              height: 24,
                              '& .MuiChip-label': { px: 1 },
                              bgcolor: 'secondary.main',
                              color: 'secondary.contrastText',
                              opacity: 0.85,
                            }}
                          />
                        )}
                      </Box>
                    );
                  }}
                  MenuProps={{ PaperProps: { sx: { maxHeight: 360 } } }}
                >
                  <ListSubheader disableSticky>
                    <Box sx={{ display: 'flex', gap: 1, p: 1 }}>
                      <Button
                        size="small"
                        color="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          onProjectsChange({ target: { value: [] } } as any);
                        }}
                      >
                        Снять все
                      </Button>
                      <Button
                        size="small"
                        color="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          onProjectsChange({ target: { value: PROJECTS } } as any);
                        }}
                      >
                        Выделить все
                      </Button>
                    </Box>
                  </ListSubheader>
                  <Divider />
                  {PROJECTS.map((project) => (
                    <MenuItem
                      key={project}
                      value={project}
                      sx={{
                        '&.Mui-selected': {
                          bgcolor: 'primary.light',
                          '&:hover': { bgcolor: 'primary.main' },
                        },
                      }}
                    >
                      {project}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Скрыть спорт */}
            <Box>
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={hideSport} 
                    onChange={(e) => onHideSportChange(e.target.checked)} 
                  />
                }
                label="Скрыть спорт"
                sx={{ m: 0, '.MuiFormControlLabel-label': { fontSize: 14 } }}
              />
            </Box>

            {/* Кнопка обновить */}
            {loadEvents && (
              <Box>
                <Button
                  variant="contained"
                  onClick={() => loadEvents()}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={18} /> : null}
                  fullWidth
                  sx={{ height: 40, borderRadius: 2 }}
                >
                  Обновить
                </Button>
              </Box>
            )}
          </Stack>
        </Box>
      </Drawer>
    </>
  );
}
