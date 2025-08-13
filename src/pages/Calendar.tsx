// src/pages/Calendar.tsx
import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  FormControl,
  Select,
  MenuItem,
  Button,
  Chip,
  Stack,
  Alert,
  ListSubheader,
  Checkbox,
  Divider,
  CircularProgress,
  IconButton,
  FormControlLabel,
  Paper,
  Grid,
  FormLabel,
} from '@mui/material';
import { SelectChangeEvent } from '@mui/material/Select';
import { DatePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

import { CalendarGrid } from '../components/promoCalendar';
import ColorLegend from '../components/general/ColorLegend';

import { PromoEvent, InfoChannel, AuthState } from '../types';
import { SPORT_PROMO_TYPES, SPORT_CHANNEL_TYPES } from '../constants/promoTypes';

export interface CalendarProps {
  events: PromoEvent[];
  standaloneChannels: InfoChannel[];
  loading: boolean;

  selectedMonth: number;
  selectedYear: number;
  selectedProjects: string[];

  auth: AuthState;

  onEventsUpdate: (events: PromoEvent[]) => void;
  loadEvents: () => Promise<void>;

  setSelectedMonth: (month: number) => void;
  setSelectedYear: (year: number) => void;
  setSelectedProjects: (projects: string[]) => void;
  setOpenDialog: (open: boolean) => void;

  PROJECTS: string[];

  handleEventEdit: (event: PromoEvent) => void;
  handleChannelEdit: (channel: InfoChannel) => void;
  handleEventCreate?: (eventData: any, project: string, startDate: string, endDate: string) => void;
  handleChannelCreate?: (channelData: any, project: string, startDate: string) => void;
}

const Calendar: React.FC<CalendarProps> = ({
  events,
  standaloneChannels,
  loading,
  selectedMonth,
  selectedYear,
  selectedProjects,
  auth,
  onEventsUpdate,
  loadEvents,
  setSelectedMonth,
  setSelectedYear,
  setSelectedProjects,
  setOpenDialog,
  PROJECTS,
  handleEventEdit,
  handleChannelEdit,
  handleEventCreate,
  handleChannelCreate,
}) => {
  const [hideSport, setHideSport] = useState(false);

  const startOfMonth = useMemo(
    () => dayjs().year(selectedYear).month(selectedMonth - 1).startOf('month'),
    [selectedMonth, selectedYear]
  );
  const endOfMonth = useMemo(() => startOfMonth.endOf('month'), [startOfMonth]);

  // События по фильтрам
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (!selectedProjects.includes(event.project)) return false;

      if (hideSport && SPORT_PROMO_TYPES.includes(event.promo_type as any)) return false;

      const evStart = dayjs(event.start_date);
      const evEnd = dayjs(event.end_date);

      const overlapsMonth =
        evStart.isSameOrBefore(endOfMonth) && evEnd.isSameOrAfter(startOfMonth);

      const hasChannelsInMonth =
        event.info_channels &&
        event.info_channels.some((channel) => {
          if (hideSport && SPORT_CHANNEL_TYPES.includes(channel.type as any)) return false;
          const chDate = dayjs(channel.start_date);
          // включительно
          return chDate.isBetween(startOfMonth, endOfMonth, 'day', '[]');
        });

      return overlapsMonth || hasChannelsInMonth;
    });
  }, [events, selectedProjects, hideSport, startOfMonth, endOfMonth]);

  // Одиночные каналы по фильтрам
  const filteredStandaloneChannels = useMemo(() => {
    return standaloneChannels.filter((channel) => {
      if (!selectedProjects.includes(channel.project)) return false;
      if (hideSport && SPORT_CHANNEL_TYPES.includes(channel.type as any)) return false;

      const chDate = dayjs(channel.start_date);
      return chDate.isBetween(startOfMonth, endOfMonth, 'day', '[]');
    });
  }, [standaloneChannels, selectedProjects, hideSport, startOfMonth, endOfMonth]);

  const handleMonthChange = (date: dayjs.Dayjs | null) => {
    if (!date) return;
    setSelectedMonth(date.month() + 1);
    setSelectedYear(date.year());
  };

  const handleProjectsChange = (event: SelectChangeEvent<string[]>) => {
    const selectedValues = event.target.value as string[];
    const sorted = PROJECTS.filter((p) => selectedValues.includes(p)); // сохранить порядок
    setSelectedProjects(sorted);
  };

  return (
    <Box>
      {/* Информация для обычных пользователей */}
      {auth.user?.role !== 'admin' && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Вы находитесь в режиме просмотра. Для внесения изменений обратитесь к администратору.
        </Alert>
      )}

      {/* Фильтры */}
      <Paper
        variant="outlined"
        sx={{
          mb: 3,
          p: 2.5,
          borderRadius: 3,
          borderColor: 'divider',
          bgcolor: 'background.default',
        }}
      >
       

        <Grid container spacing={2} alignItems="center" wrap="wrap" sx={{ rowGap: 2 }}>
          {/* Месяц */}
          <Grid item xs={12} md="auto">
            <Stack direction="column" spacing={0.5} sx={{ minWidth: 220 }}>
              <FormLabel sx={{ fontSize: 12, color: 'text.secondary' }}>Месяц</FormLabel>
              <Stack direction="row" alignItems="center" spacing={1}>
                <IconButton
                  onClick={() => {
                    if (selectedMonth === 1) {
                      setSelectedMonth(12);
                      setSelectedYear(selectedYear - 1);
                    } else {
                      setSelectedMonth(selectedMonth - 1);
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
                  onChange={handleMonthChange}
                  slotProps={{
                    textField: {
                      size: 'small',
                      fullWidth: true,
                      placeholder: 'Выберите месяц',
                    },
                    field: { clearable: false },
                  }}
                />

                <IconButton
                  onClick={() => {
                    if (selectedMonth === 12) {
                      setSelectedMonth(1);
                      setSelectedYear(selectedYear + 1);
                    } else {
                      setSelectedMonth(selectedMonth + 1);
                    }
                  }}
                  size="small"
                  sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}
                >
                  <ChevronRightIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Stack>
          </Grid>

          {/* Проекты */}
          <Grid item xs={12} md>
            <Stack direction="column" spacing={0.5}>
              <FormLabel sx={{ fontSize: 12, color: 'text.secondary' }}>Проекты</FormLabel>
              <FormControl fullWidth>
                <Select
                  multiple
                  size="small"
                  fullWidth
                  value={selectedProjects}
                  onChange={handleProjectsChange}
                  displayEmpty
                  renderValue={(selected) => {
                    const sel = selected as string[];
                    if (!sel.length) return <Box sx={{ opacity: 0.6 }}>Не выбрано</Box>;
                    const max = 8;
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
                              }}
                            />
                          ))}
                        </Box>
                        {rest > 0 && (
                          <Chip size="small" label={`+${rest}`} sx={{ height: 24, '& .MuiChip-label': { px: 1 } }} />
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
                          setSelectedProjects([]);
                        }}
                      >
                        Снять все
                      </Button>
                      <Button
                        size="small"
                        color="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProjects(PROJECTS);
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
            </Stack>
          </Grid>

          {/* Действия */}
          <Grid item xs={12} md="auto">
            <Stack
              direction="row"
              spacing={2}
              alignItems="center"
              justifyContent={{ xs: 'flex-start', md: 'flex-end' }}
              sx={{ minWidth: { md: 360 } }}
            >
              <Button
                variant="contained"
                onClick={() => loadEvents()}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={18} /> : null}
                sx={{ minWidth: 120, height: 40, borderRadius: 2 }}
              >
                Обновить
              </Button>

              <FormControlLabel
                control={<Checkbox checked={hideSport} onChange={(e) => setHideSport(e.target.checked)} />}
                label="Скрыть спорт"
                sx={{ m: 0, '.MuiFormControlLabel-label': { fontSize: 14 } }}
              />

              <ColorLegend />
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {/* Календарь */}
      <CalendarGrid
        events={filteredEvents}
        standaloneChannels={filteredStandaloneChannels}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onEventsUpdate={onEventsUpdate}
        selectedProjects={selectedProjects}
        isAdmin={auth.user?.role === 'admin'}
        onEventEdit={handleEventEdit}
        onChannelEdit={handleChannelEdit}
        auth={auth}
        loading={loading}
        loadEvents={loadEvents}
        onEventCreate={handleEventCreate}
        onChannelCreate={handleChannelCreate}
      />
    </Box>
  );
};

export default Calendar;
