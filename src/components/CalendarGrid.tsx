import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Tooltip,
  Menu,
  MenuItem,
  IconButton,
  Chip,
  Box,
  Stack,
  Collapse,
  Divider,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Snackbar,
  Alert
} from '@mui/material';
import dayjs from '../utils/dayjs';
import { PromoEvent, InfoChannel, AuthState, DisplayPromoEvent } from '../types';
import axios from 'axios';
import EditIcon from '@mui/icons-material/Edit';
import {
  PROMO_TYPES,
  CHANNEL_TYPES
} from '../constants/promoTypes';

// Праздничные дни РФ (ежегодные)
const HOLIDAYS = [
  { month: 1, days: [1, 2, 3, 4, 5, 6, 7, 8] },
  { month: 2, days: [23] },
  { month: 3, days: [8] },
  { month: 5, days: [1, 9] },
  { month: 6, days: [12, 13] },
  { month: 11, days: [4] },
];

// Цвета для событий
const EVENT_COLORS: { [key: string]: string } = {
  'Акции': "#F3A712",
  'Турниры': "#A8E6CF",
  'Лотереи': "#FF8A5B",
  'Кэшбек': "#E6A8D7",
  'MSGR': "#C4A7E7",
  'BPS': "#FFB6C1",
  'PUSH': "#8EDCE6",
  'SMM': "#FFD166",
  'Депозитки': "#98FF98",
  'E-mail': "#79addc",
  'Спорт рассылка': "#f4a261",
  'Спорт размещение': "#e76f51",
  'Страница': "#8ab17d",
  'Баннер': "#2a9d8f",
  'Новости': "#fcca46"
};

interface CalendarGridProps {
  events: PromoEvent[];
  selectedMonth: number;
  selectedYear: number;
  onEventsUpdate: (events: PromoEvent[]) => void;
  selectedProjects: string[];
  isAdmin: boolean;
  onEventEdit: (event: PromoEvent) => void;
  onChannelEdit: (channel: InfoChannel) => void;
  auth: AuthState;
  loading: boolean;
  loadEvents: () => Promise<void>;
}

const CalendarGrid: React.FC<CalendarGridProps> = ({
  events,
  selectedMonth,
  selectedYear,
  onEventsUpdate,
  selectedProjects,
  isAdmin,
  onEventEdit,
  onChannelEdit,
  auth,
  loading,
  loadEvents
}) => {
  const [contextMenu, setContextMenu] = useState<{ mouseX: number; mouseY: number } | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<DisplayPromoEvent | null>(null);
  const [highlightedEventId, setHighlightedEventId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Убираем состояние для выделенных ячеек - будем работать напрямую с DOM
  // const [selectedCells, setSelectedCells] = useState<{[key: string]: boolean}>({});
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<string | null>(null);
  
  // Ref для отслеживания выделенных ячеек без ререндера
  const selectedCellsRef = useRef<Set<string>>(new Set());
  const tableRef = useRef<HTMLTableElement>(null);

  // CSS стили для выделенных ячеек (добавляем в head)
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .calendar-cell-selected {
        background-color: rgba(33, 150, 243, 0.3) !important;
        outline: 2px solid #2196f3 !important;
        outline-offset: -1px !important;
      }
      .calendar-cell-selected:hover {
        background-color: rgba(33, 150, 243, 0.4) !important;
      }
      .calendar-cell-selectable {
        cursor: pointer;
        user-select: none;
        transition: background-color 0.1s ease-in-out;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Общие стили анимации
  const pulseAnimation = {
    animation: 'pulseBorder 1s infinite',
    '@keyframes pulseBorder': {
      '0%': {
        boxShadow: '0 0 0 0px rgba(255, 0, 0, 0.8)',
      },
      '50%': {
        boxShadow: '0 0 0 3px rgba(255, 0, 0, 0.8)',
      },
      '100%': {
        boxShadow: '0 0 0 0px rgba(255, 0, 0, 0.8)',
      },
    },
  };

  // Мемоизируем функцию преобразования события
  const transformEventForDisplay = useCallback((event: PromoEvent): DisplayPromoEvent => ({
    ...event,
    _isMain: true,
    type: event.promo_type,
    subtype: event.promo_kind,
    segment: Array.isArray(event.segments) ? event.segments.join(', ') : event.segments
  }), []);

  // Мемоизируем функцию преобразования канала
  const transformChannelForDisplay = useCallback((channel: InfoChannel, parentEvent: PromoEvent): DisplayPromoEvent => ({
    ...parentEvent,
    _isMain: false,
    _channel: channel,
    type: channel.type,
    segment: Array.isArray(channel.segments) ? channel.segments.join(', ') : channel.segments
  }), []);

  // Функция для форматирования информации о событии
  const getEventTooltipContent = (event: PromoEvent | InfoChannel, isChannel = false) => {
    if (isChannel) {
      const channel = event as InfoChannel;
      return (
        <Box sx={{ p: 1, maxWidth: 300 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
            {channel.type}
          </Typography>
          
          <Stack spacing={1}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Проект
              </Typography>
              <Typography variant="body2">
                {channel.project}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary">
                Дата старта
              </Typography>
              <Typography variant="body2">
                {dayjs(channel.start_date).format('DD.MM.YYYY HH:mm')}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary">
                Название
              </Typography>
              <Typography variant="body2">
                {channel.name}
              </Typography>
            </Box>

            {channel.comment && (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Комментарий
                </Typography>
                <Typography variant="body2">
                  {channel.comment}
                </Typography>
              </Box>
            )}

            <Box>
              <Typography variant="caption" color="text.secondary">
                Сегмент
              </Typography>
              <Typography variant="body2">
                {Array.isArray(channel.segments) ? channel.segments.join(', ') : channel.segments || 'Не указан'}
              </Typography>
            </Box>
          </Stack>
        </Box>
      );
    } else {
      const promoEvent = event as PromoEvent;
      return (
        <Box sx={{ p: 1, maxWidth: 300 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
            {promoEvent.name || 'Без названия'}
          </Typography>
          
          <Stack spacing={1}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Проект
              </Typography>
              <Typography variant="body2">
                {promoEvent.project}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary">
                Тип промо
              </Typography>
              <Typography variant="body2">
                {promoEvent.promo_type}
              </Typography>
            </Box>

            {promoEvent.promo_kind && (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Вид промо
                </Typography>
                <Typography variant="body2">
                  {promoEvent.promo_kind}
                </Typography>
              </Box>
            )}

            <Box>
              <Typography variant="caption" color="text.secondary">
                Сегмент
              </Typography>
              <Typography variant="body2">
                {Array.isArray(promoEvent.segments) ? promoEvent.segments.join(', ') : promoEvent.segments || 'Не указан'}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary">
                Даты проведения
              </Typography>
              <Typography variant="body2">
                {`${dayjs(promoEvent.start_date).format('DD.MM.YYYY HH:mm')} - ${dayjs(promoEvent.end_date).format('DD.MM.YYYY HH:mm')}`}
              </Typography>
            </Box>

            {promoEvent.comment && (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Комментарий
                </Typography>
                <Typography variant="body2">
                  {promoEvent.comment}
                </Typography>
              </Box>
            )}
          </Stack>
        </Box>
      );
    }
  };

  // Получаем первый день месяца
  const firstDay = dayjs().year(selectedYear).month(selectedMonth - 1).startOf('month');
  const daysInMonth = firstDay.daysInMonth();

  // Функция для проверки выходных и праздников
  const isWeekend = (date: dayjs.Dayjs) => {
    const dayOfWeek = date.day();
    return dayOfWeek === 0 || dayOfWeek === 6 || isHoliday(date.date(), date.month() + 1);
  };

  const isHoliday = (day: number, month: number): boolean => {
    const holiday = HOLIDAYS.find(h => h.month === month);
    return holiday ? holiday.days.includes(day) : false;
  };

  // Функция для получения дней месяца с их датами
  const getDaysArray = () => {
    const days = [];
    for (let i = 0; i < daysInMonth; i++) {
      const date = firstDay.add(i, 'day');
      days.push({
        dayOfMonth: i + 1,
        date: date,
        dayOfWeek: date.format('dd').toUpperCase(),
        isWeekend: isWeekend(date)
      });
    }
    return days;
  };

  // Оптимизированный обработчик контекстного меню
  const handleContextMenu = useCallback((event: React.MouseEvent, promoEvent: PromoEvent | InfoChannel, isChannel = false) => {
    event.preventDefault();
    event.stopPropagation();
    
    requestAnimationFrame(() => {
      const displayEvent = isChannel 
        ? transformChannelForDisplay(promoEvent as InfoChannel, events.find(e => e.id === (promoEvent as InfoChannel).promo_id)!)
        : transformEventForDisplay(promoEvent as PromoEvent);
      
      setSelectedEvent(displayEvent);
      setContextMenu({
        mouseX: event.clientX,
        mouseY: event.clientY
      });
    });
  }, [events, transformEventForDisplay, transformChannelForDisplay]);

  const handleCloseMenu = useCallback(() => {
    setContextMenu(null);
    setSelectedEvent(null);
  }, []);

  const handleEdit = useCallback(() => {
    if (selectedEvent) {
      if (selectedEvent._channel) {
        onChannelEdit(selectedEvent._channel);
      } else {
        onEventEdit(selectedEvent);
      }
    }
    handleCloseMenu();
  }, [selectedEvent, onChannelEdit, onEventEdit]);

  const handleDelete = useCallback(async () => {
    if (selectedEvent) {
      try {
        setIsDeleting(true);
        if (selectedEvent._channel) {
          await axios.delete(`/api/channels/${selectedEvent._channel.id}`);
        } else {
          await axios.delete(`/api/events/${selectedEvent.id}`);
        }
        await loadEvents();
      } catch (error) {
        console.error('Ошибка при удалении:', error);
      } finally {
        setIsDeleting(false);
        handleCloseMenu();
      }
    }
  }, [selectedEvent, loadEvents]);

  const days = getDaysArray();

  // Обработчик клавиатуры для отмены выделения по Escape
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && selectedCellsRef.current.size > 0) {
        // Убираем классы выделения с DOM элементов
        selectedCellsRef.current.forEach(cellKey => {
          const cell = document.querySelector(`[data-cell-key="${cellKey}"]`);
          if (cell) {
            cell.classList.remove('calendar-cell-selected');
          }
        });
        selectedCellsRef.current.clear();
        setSelectionStart(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Функции для работы с выделением ячеек
  const getCellKey = (project: string, rowType: string, dayOfMonth: number) => {
    return `${project}-${rowType}-${dayOfMonth}`;
  };

  // Функция для обновления выделения в DOM без ререндера
  const updateCellSelection = useCallback((cellKey: string, selected: boolean) => {
    const cell = document.querySelector(`[data-cell-key="${cellKey}"]`);
    if (cell) {
      if (selected) {
        cell.classList.add('calendar-cell-selected');
      } else {
        cell.classList.remove('calendar-cell-selected');
      }
    }
  }, []);

  const handleCellClick = useCallback((cellKey: string, event: React.MouseEvent) => {
    // Останавливаем всплытие и поведение по умолчанию
    event.preventDefault();
    event.stopPropagation();
    
    if (event.ctrlKey || event.metaKey) {
      // Ctrl+click - переключаем выделение ячейки
      if (selectedCellsRef.current.has(cellKey)) {
        selectedCellsRef.current.delete(cellKey);
        updateCellSelection(cellKey, false);
      } else {
        selectedCellsRef.current.add(cellKey);
        updateCellSelection(cellKey, true);
      }
    } else if (event.shiftKey && selectionStart) {
      // Shift+click - выделяем диапазон (упрощенная версия)
      selectedCellsRef.current.add(selectionStart);
      selectedCellsRef.current.add(cellKey);
      updateCellSelection(selectionStart, true);
      updateCellSelection(cellKey, true);
    } else {
      // Обычный клик - убираем все выделение и выделяем только эту ячейку
      selectedCellsRef.current.forEach(key => updateCellSelection(key, false));
      selectedCellsRef.current.clear();
      selectedCellsRef.current.add(cellKey);
      updateCellSelection(cellKey, true);
      setSelectionStart(cellKey);
    }
  }, [selectionStart, updateCellSelection]);

  const handleCellMouseDown = useCallback((cellKey: string, event: React.MouseEvent) => {
    if (event.button === 0) { // Левая кнопка мыши
      event.preventDefault();
      event.stopPropagation();
      setIsSelecting(true);
      if (!event.ctrlKey && !event.metaKey && !event.shiftKey) {
        setSelectionStart(cellKey);
      }
    }
  }, []);

  const isCellSelected = useCallback((cellKey: string) => {
    return selectedCellsRef.current.has(cellKey);
  }, []);

  // Очистка выделения при клике вне ячеек
  const handleTableClick = useCallback((event: React.MouseEvent) => {
    // Очищаем выделение только если клик был не по ячейке
    const target = event.target as HTMLElement;
    if (!target.closest('.calendar-cell-selectable')) {
      selectedCellsRef.current.forEach(key => updateCellSelection(key, false));
      selectedCellsRef.current.clear();
      setSelectionStart(null);
    }
  }, [updateCellSelection]);

  return (
    <>
      <TableContainer 
        component={Paper} 
        onClick={handleTableClick}
        sx={{ position: 'relative' }}
      >
        {loading && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 1,
            }}
          >
            <CircularProgress />
          </Box>
        )}
        <Table 
          ref={tableRef}
          stickyHeader 
          size="small" 
          sx={{ tableLayout: 'fixed' }}
        >
          <TableHead>
            <TableRow>
              <TableCell 
                sx={{ 
                  width: '160px', 
                  bgcolor: '#333a56',
                  position: 'sticky',
                  left: 0,
                  zIndex: 2,
                  borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
                  p: 1
                }}
              >
                Проект / Тип
              </TableCell>
              {days.map(({ dayOfMonth, dayOfWeek, isWeekend }) => (
                <TableCell
                  key={dayOfMonth}
                  align="center"
                  sx={{
                    width: '35px',
                    minWidth: '35px',
                    maxWidth: '35px',
                    bgcolor: isWeekend ? '#444a66' : '#333a56',
                    color: isWeekend ? '#ff6b6b' : 'inherit',
                    borderLeft: '1px solid rgba(255, 255, 255, 0.12)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
                    p: 0.25
                  }}
                >
                  <Typography variant="body2" sx={{ fontSize: '0.7rem', lineHeight: 1 }}>{dayOfMonth}</Typography>
                  <Typography variant="caption" sx={{ fontSize: '0.65rem', lineHeight: 1 }}>{dayOfWeek}</Typography>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {selectedProjects.map((project, projectIndex) => (
              <React.Fragment key={project}>
                {projectIndex > 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={daysInMonth + 1}
                      sx={{
                        height: '8px',
                        bgcolor: '#1a1f35',
                        borderBottom: '2px solid #1a1f35',
                        p: 0
                      }}
                    />
                  </TableRow>
                )}
                
                {/* Строка с названием проекта */}
                <TableRow>
                  <TableCell
                    component="th"
                    scope="row"
                    sx={{
                      bgcolor: '#333a56',
                      position: 'sticky',
                      left: 0,
                      zIndex: 1,
                      fontWeight: 'bold',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
                      fontSize: '0.9rem',
                      py: 1,
                      height: '32px'
                    }}
                  >
                    {project}
                  </TableCell>
                  {days.map(({ dayOfMonth, isWeekend }) => (
                    <TableCell
                      key={dayOfMonth}
                      sx={{
                        bgcolor: isWeekend ? '#444a66' : '#333a56',
                        borderLeft: '1px solid rgba(255, 255, 255, 0.12)',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
                        p: 0,
                        height: '32px'
                      }}
                    />
                  ))}
                </TableRow>
                
                {/* Строки с типами промо */}
                {PROMO_TYPES.map(promoType => {
                  // Получаем все события данного типа для проекта
                  const typeEvents = events.filter(event => 
                    event.project === project && 
                    event.promo_type === promoType
                  );

                  // Определяем количество необходимых строк для этого типа
                  const rows: PromoEvent[][] = [];
                  typeEvents.forEach(event => {
                    const eventStart = dayjs(event.start_date);
                    const eventEnd = dayjs(event.end_date);
                    
                    let foundRow = false;
                    for (let i = 0; i < rows.length; i++) {
                      const hasIntersection = rows[i].some(existingEvent => {
                        const existingStart = dayjs(existingEvent.start_date);
                        const existingEnd = dayjs(existingEvent.end_date);
                        return (
                          (eventStart.isBefore(existingEnd) || eventStart.isSame(existingEnd)) &&
                          (eventEnd.isAfter(existingStart) || eventEnd.isSame(existingStart))
                        );
                      });

                      if (!hasIntersection) {
                        rows[i].push(event);
                        foundRow = true;
                        break;
                      }
                    }

                    if (!foundRow) {
                      rows.push([event]);
                    }
                  });

                  const rowCount = Math.max(1, rows.length);
                  // Добавляем дополнительную высоту для отступов
                  const blockHeight = rowCount * 24 + (rowCount > 1 ? (rowCount - 1) * 8 : 0) + 8;

                  return (
                    <TableRow key={`${project}-${promoType}`}>
                      <TableCell
                        sx={{
                          position: 'sticky',
                          left: 0,
                          zIndex: 1,
                          bgcolor: '#333a56',
                          pl: 2,
                          fontSize: '0.8rem',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
                          height: `${blockHeight}px`,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {promoType}
                      </TableCell>
                      {days.map(({ dayOfMonth, date, isWeekend }) => {
                        // Находим все события для текущего дня
                        const dayEvents = events.filter(event => {
                          if (event.project !== project || event.promo_type !== promoType) return false;
                          const startDate = dayjs(event.start_date);
                          const endDate = dayjs(event.end_date);
                          return date.isBetween(startDate, endDate, 'day', '[]');
                        });

                        // Определяем строку для каждого события
                        const eventsWithRows = dayEvents.map(event => {
                          const rowIndex = rows.findIndex(row => row.includes(event));
                          return {
                            ...event,
                            rowIndex: rowIndex !== -1 ? rowIndex : 0
                          };
                        });

                        const cellKey = getCellKey(project, promoType, dayOfMonth);
                        const isSelected = isCellSelected(cellKey);

                        return (
                          <TableCell
                            key={dayOfMonth}
                            data-cell-key={cellKey}
                            onClick={(e) => handleCellClick(cellKey, e)}
                            onMouseDown={(e) => handleCellMouseDown(cellKey, e)}
                            className={`calendar-cell-selectable ${isCellSelected(cellKey) ? 'calendar-cell-selected' : ''}`}
                            sx={{
                              height: `${blockHeight}px`,
                              p: 0.25,
                              bgcolor: isWeekend ? '#444a66' : '#333a56',
                              borderLeft: '1px solid rgba(255, 255, 255, 0.12)',
                              borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
                              verticalAlign: 'top',
                              position: 'relative',
                              '&:hover': {
                                bgcolor: isWeekend ? '#4a5066' : '#3a4066'
                              }
                            }}
                          >
                            <Stack spacing={0.25}>
                              {eventsWithRows.map((event, index) => (
                                <Box
                                  key={`${event.id}-${index}`}
                                  sx={{
                                    position: 'absolute',
                                    top: `${event.rowIndex * 32}px`, // Увеличиваем расстояние между событиями
                                    left: 1,
                                    right: 1,
                                    padding: '4px 0' // Добавляем вертикальные отступы
                                  }}
                                >
                                  <Tooltip
                                    title={getEventTooltipContent(event, false)}
                                    placement="right"
                                    arrow
                                    PopperProps={{
                                      sx: {
                                        '& .MuiTooltip-tooltip': {
                                          bgcolor: '#333a56',
                                          color: '#eff0f1',
                                          p: 0,
                                          maxWidth: 'none'
                                        },
                                        '& .MuiTooltip-arrow': {
                                          color: '#333a56'
                                        }
                                      }
                                    }}
                                  >
                                    <Chip
                                      label={event.promo_type}
                                      size="small"
                                      sx={{
                                        backgroundColor: EVENT_COLORS[event.promo_type] || '#666',
                                        color: '#000',
                                        fontSize: '0.7rem',
                                        height: 20,
                                        width: '100%',
                                        '& .MuiChip-label': {
                                          px: 1,
                                        },
                                        ...(highlightedEventId === event.id && pulseAnimation),
                                      }}
                                      onContextMenu={(e: React.MouseEvent) => handleContextMenu(e, event, false)}
                                      onClick={(e: React.MouseEvent) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                      }}
                                      onMouseEnter={() => setHighlightedEventId(event.id)}
                                      onMouseLeave={() => setHighlightedEventId(null)}
                                    />
                                  </Tooltip>
                                </Box>
                              ))}
                            </Stack>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
                
                {/* Строки с каналами информирования */}
                {CHANNEL_TYPES.map(channelType => (
                  <TableRow key={`${project}-${channelType}`} sx={{ height: '32px' }}>
                    <TableCell
                      sx={{
                        position: 'sticky',
                        left: 0,
                        zIndex: 1,
                        bgcolor: '#333a56',
                        pl: 2,
                        fontSize: '0.8rem',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
                        height: '32px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {channelType}
                    </TableCell>
                    {days.map(({ dayOfMonth, date, isWeekend }) => {
                      const channels = events
                        .filter(event => event.project === project)
                        .flatMap(event => 
                          (event.info_channels || []).map(channel => ({
                            ...channel,
                            eventId: event.id,
                            eventName: event.name
                          }))
                        )
                        .filter(channel => {
                          if (!channel || channel.type !== channelType) return false;
                          const channelDate = dayjs(channel.start_date);
                          return channelDate.isSame(date, 'day');
                        });

                      const cellKey = getCellKey(project, channelType, dayOfMonth);

                      return (
                        <TableCell
                          key={dayOfMonth}
                          data-cell-key={cellKey}
                          onClick={(e) => handleCellClick(cellKey, e)}
                          onMouseDown={(e) => handleCellMouseDown(cellKey, e)}
                          className={`calendar-cell-selectable ${isCellSelected(cellKey) ? 'calendar-cell-selected' : ''}`}
                          sx={{
                            height: '32px',
                            p: 0.25,
                            bgcolor: isWeekend ? '#444a66' : '#333a56',
                            borderLeft: '1px solid rgba(255, 255, 255, 0.12)',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
                            verticalAlign: 'top',
                            '&:hover': {
                              bgcolor: isWeekend ? '#4a5066' : '#3a4066'
                            }
                          }}
                        >
                          <Stack spacing={0.25}>
                            {channels.map((channel, index) => (
                              <Tooltip
                                key={`${channel.id}-${index}`}
                                title={getEventTooltipContent(channel, true)}
                                placement="right"
                                arrow
                                PopperProps={{
                                  sx: {
                                    '& .MuiTooltip-tooltip': {
                                      bgcolor: '#333a56',
                                      color: '#eff0f1',
                                      p: 0,
                                      maxWidth: 'none'
                                    },
                                    '& .MuiTooltip-arrow': {
                                      color: '#333a56'
                                    }
                                  }
                                }}
                              >
                                <Chip
                                  label={channel.type}
                                  size="small"
                                  sx={{
                                    backgroundColor: EVENT_COLORS[channel.type] || '#666',
                                    color: '#000',
                                    fontSize: '0.7rem',
                                    height: 20,
                                    '& .MuiChip-label': {
                                      px: 1,
                                    },
                                    ...(highlightedEventId === channel.eventId && pulseAnimation),
                                  }}
                                  onContextMenu={(e: React.MouseEvent) => handleContextMenu(e, channel, true)}
                                  onClick={(e: React.MouseEvent) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }}
                                  onMouseEnter={() => setHighlightedEventId(channel.eventId)}
                                  onMouseLeave={() => setHighlightedEventId(null)}
                                />
                              </Tooltip>
                            ))}
                          </Stack>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Menu
        open={contextMenu !== null}
        onClose={handleCloseMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
        transitionDuration={0}
        sx={{
          '& .MuiPaper-root': {
            backgroundColor: '#333a56',
            color: '#eff0f1',
            minWidth: '200px'
          }
        }}
      >
        {selectedEvent && (
          <>
            <MenuItem onClick={handleEdit} sx={{ mt: 1 }}>
              Редактировать
            </MenuItem>
            {auth.user?.role === 'admin' && (
              <MenuItem 
                onClick={handleDelete} 
                sx={{ 
                  color: '#ff6b6b',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
                disabled={isDeleting}
              >
                Удалить
                {isDeleting && <CircularProgress size={20} sx={{ ml: 1 }} />}
              </MenuItem>
            )}
          </>
        )}
      </Menu>
    </>
  );
};

export default CalendarGrid; 