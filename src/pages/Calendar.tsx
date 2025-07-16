import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Button, 
  Chip, 
  Stack,
  Alert,
  ListSubheader,
  Checkbox,
  ListItemText,
  Divider,
  CircularProgress,
  SelectChangeEvent
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import dayjs from '../utils/dayjs';
import CalendarGrid from '../components/CalendarGrid';
import ColorLegend from '../components/ColorLegend';
import { PromoEvent, InfoChannel, AuthState } from '../types';

interface CalendarProps {
  events: PromoEvent[];
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
  handleChannelCreate
}) => {
  // Инициализируем текущую дату при монтировании компонента
  useEffect(() => {
    const now = dayjs();
    setSelectedMonth(now.month() + 1); // dayjs возвращает месяц от 0 до 11
    setSelectedYear(now.year());
  }, []);

  // Фильтрация событий по выбранным проектам и месяцу
  const filteredEvents = events.filter(event => {
    // Для регулярных турниров и кешбэка всегда возвращаем true
    
    if (
      (event.promo_type === 'Турниры' && event.promo_kind === 'Регулярные') ||
      event.promo_type === 'Кэшбек'
    ) {
      return true;
    }
    const eventStartDate = dayjs(event.start_date);
    const eventEndDate = dayjs(event.end_date);
    const startOfMonth = dayjs().year(selectedYear).month(selectedMonth - 1).startOf('month');
    const endOfMonth = startOfMonth.endOf('month');

    // Проверяем попадает ли само событие в месяц
    const eventInMonth = (
      selectedProjects.includes(event.project) &&
      ((eventStartDate.isSameOrBefore(endOfMonth) && eventEndDate.isSameOrAfter(startOfMonth)) ||
        (eventStartDate.isSameOrBefore(endOfMonth) && eventStartDate.isSameOrAfter(startOfMonth)) ||
        (eventEndDate.isSameOrBefore(endOfMonth) && eventEndDate.isSameOrAfter(startOfMonth)))
    );

    // Проверяем есть ли каналы информирования в текущем месяце
    const hasChannelsInMonth = selectedProjects.includes(event.project) &&
      event.info_channels && 
      event.info_channels.some(channel => {
        const channelDate = dayjs(channel.start_date);
        return channelDate.isBetween(startOfMonth, endOfMonth, 'day', '[]');
      });

    return eventInMonth || hasChannelsInMonth;
  });

  const handleMonthChange = (date: dayjs.Dayjs | null) => {
    if (date) {
      setSelectedMonth(date.month() + 1); // Прибавляем 1, так как dayjs возвращает месяц от 0 до 11
      setSelectedYear(date.year());
    }
  };

  const handleProjectsChange = (event: SelectChangeEvent<string[]>) => {
    const selectedValues = event.target.value as string[];
    // Сортируем выбранные проекты в соответствии с порядком в оригинальном массиве
    const sortedProjects = PROJECTS.filter(project => selectedValues.includes(project));
    setSelectedProjects(sortedProjects);
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
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
          <FormControl sx={{ minWidth: 200 }}>
            <DatePicker
              views={['month', 'year']}
              label="Месяц"
              value={dayjs().year(selectedYear).month(selectedMonth - 1)}
              onChange={handleMonthChange}
            />
          </FormControl>

          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Проекты</InputLabel>
            <Select
              multiple
              value={selectedProjects}
              onChange={handleProjectsChange}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as string[]).map((value) => (
                    <Chip key={value} label={value} size="small" />
                  ))}
                </Box>
              )}
            >
              <ListSubheader>
                <Box sx={{ display: 'flex', gap: 1, p: 1 }}>
                  <Button size="small" onClick={(e) => { e.stopPropagation(); setSelectedProjects([]); }}>
                    Снять все
                  </Button>
                  <Button size="small" onClick={(e) => { e.stopPropagation(); setSelectedProjects(PROJECTS); }}>
                    Выделить все
                  </Button>
                </Box>
              </ListSubheader>
              <Divider />
              {PROJECTS.map((project) => (
                <MenuItem key={project} value={project}>
                  {project}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            variant="contained"
            onClick={loadEvents}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            Обновить
          </Button>
        </Box>

        {/* Легенда цветов */}
        <Box sx={{ position: 'relative' }}>
          <ColorLegend />
        </Box>
      </Box>

      {/* Отображение количества событий */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1" color="text.secondary">
          Найдено событий: {filteredEvents.length}
        </Typography>
      </Box>

      {/* Календарь */}
      <CalendarGrid
        events={filteredEvents}
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