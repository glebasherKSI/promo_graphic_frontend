// src/pages/Calendar.tsx
import React, { useState, useMemo, useRef } from 'react';
import {
  Box,
  Button,
  Stack,
  Alert,
  CircularProgress,
  Paper,
} from '@mui/material';
import dayjs from 'dayjs';

import { CalendarGrid } from '../components/promoCalendar';
import ColorLegend from '../components/general/ColorLegend';
import FilterDrawer from '../components/general/FilterDrawer';

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
  
  // Ref для элемента привязки кнопки фильтра
  const filterAnchorRef = useRef<HTMLDivElement>(null);

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

  const handleProjectsChange = (event: any) => {
    const selectedValues = event.target.value as string[];
    const sorted = PROJECTS.filter((p) => selectedValues.includes(p)); // сохранить порядок
    setSelectedProjects(sorted);
  };

  return (
    <Box>
      {/* Компонент фильтра с левым drawer */}
      <FilterDrawer
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        selectedProjects={selectedProjects}
        hideSport={hideSport}
        PROJECTS={PROJECTS}
        onMonthChange={handleMonthChange}
        onProjectsChange={handleProjectsChange}
        onHideSportChange={(checked) => setHideSport(checked)}
        anchorElementRef={filterAnchorRef}
        loadEvents={loadEvents}
        loading={loading}
      />

      {/* Информация для обычных пользователей */}
      {auth.user?.role !== 'admin' && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Вы находитесь в режиме просмотра. Для внесения изменений обратитесь к администратору.
        </Alert>
      )}

      {/* Упрощенные действия */}
      <Paper
        ref={filterAnchorRef}
        variant="outlined"
        sx={{
          mb: 3,
          p: 2.5,
          borderRadius: 3,
          borderColor: 'divider',
          bgcolor: 'background.default',
        }}
      >
        <Stack
          direction="row"
          spacing={2}
          alignItems="center"
          justifyContent="flex-end"
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

          <ColorLegend />
        </Stack>
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
