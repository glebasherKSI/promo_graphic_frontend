import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Stack,
  Box,
  Tooltip,
  Chip,
  IconButton,
  Collapse
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import dayjs from '../utils/dayjs';
import { PromoEvent, InfoChannel } from '../types';
import { shallowCompareArrays, createEventKey } from '../utils/memoization';

interface ProjectCalendarTableProps {
  project: string;
  projectIndex: number;
  events: PromoEvent[];
  days: Array<{ dayOfMonth: number; date: any; dayOfWeek: string; isWeekend: boolean }>;
  daysInMonth: number;
  PROMO_TYPES: readonly string[];
  CHANNEL_TYPES: readonly string[];
  getEventColor: (promoType: string, promoKind?: string) => string;
  getChannelColor: (channelType: string) => string;
  isCellSelected: (cellKey: string) => boolean;
  handleCellClick: (cellKey: string, event: React.MouseEvent) => void;
  handleCellRightClick: (cellKey: string, event: React.MouseEvent) => void;
  handleCellMouseDown: (cellKey: string, event: React.MouseEvent) => void;
  handleCellMouseEnter: (cellKey: string, event: React.MouseEvent) => void;
  getCellKey: (project: string, rowType: string, dayOfMonth: number) => string;
  handleContextMenu: (event: React.MouseEvent, promoEvent: PromoEvent | InfoChannel, isChannel?: boolean) => void;
  highlightedEventId: string | null;
  setHighlightedEventId: (id: string | null) => void;
  getEventTooltipContent: (event: PromoEvent | InfoChannel, isChannel?: boolean) => React.ReactNode;
  pulseAnimation: any;
  isAdmin: boolean;
  tableRef: React.RefObject<HTMLTableElement>;
  collapsedPromoTypes: {[projectType: string]: boolean};
  togglePromoTypeCollapse: (project: string, promoType: string) => void;

}

const ProjectCalendarTable: React.FC<ProjectCalendarTableProps> = ({
  project,
  projectIndex,
  events,
  days,
  daysInMonth,
  PROMO_TYPES,
  CHANNEL_TYPES,
  getEventColor,
  getChannelColor,
  isCellSelected,
  handleCellClick,
  handleCellRightClick,
  handleCellMouseDown,
  handleCellMouseEnter,
  getCellKey,
  handleContextMenu,
  highlightedEventId,
  setHighlightedEventId,
  getEventTooltipContent,
  pulseAnimation,
  isAdmin,
  tableRef,
  collapsedPromoTypes,
  togglePromoTypeCollapse
}) => {
  return (
    <Table
      ref={tableRef}
      stickyHeader
      size="small"
      sx={{ tableLayout: 'fixed', mb: 3 }}
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
              borderBottom: '2px solid rgba(255, 255, 255, 0.3)',
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
                borderLeft: '1px solid rgba(255, 255, 255, 0.25)',
                borderBottom: '2px solid rgba(255, 255, 255, 0.3)',
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
        {projectIndex > 0 && (
          <TableRow>
            <TableCell
              colSpan={daysInMonth + 1}
              sx={{
                height: '8px',
                bgcolor: '#232B45',
                borderBottom: '2px solid #232B45',
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
              borderBottom: '2px solid rgba(255, 255, 255, 0.3)',
              fontSize: '0.9rem',
              py: 1,
              height: '32px'
            }}
          >
            <Typography variant="body2">{project}</Typography>
          </TableCell>
          {days.map(({ dayOfMonth, isWeekend }) => (
            <TableCell
              key={dayOfMonth}
              sx={{
                bgcolor: isWeekend ? '#444a66' : '#333a56',
                borderLeft: '1px solid rgba(255, 255, 255, 0.25)',
                borderBottom: '2px solid rgba(255, 255, 255, 0.3)',
                p: 0,
                height: '32px'
              }}
            />
          ))}
        </TableRow>
        {/* Строки с типами промо */}
        {PROMO_TYPES.map((promoType, promoTypeIdx) => {
          // Получаем все события данного типа для проекта
          const typeEvents = events.filter(event =>
            event.project === project &&
            event.promo_type === promoType
          );

          // Определяем количество необходимых строк для этого типа
          const rows: PromoEvent[][] = [];
          typeEvents.forEach(event => {
            const eventStart = dayjs.utc(event.start_date);
            const eventEnd = dayjs.utc(event.end_date);

            let foundRow = false;
            for (let i = 0; i < rows.length; i++) {
              const hasIntersection = rows[i].some(existingEvent => {
                const existingStart = dayjs.utc(existingEvent.start_date);
                const existingEnd = dayjs.utc(existingEvent.end_date);
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
          const blockHeight = rowCount * 24 + (rowCount > 1 ? (rowCount - 1) * 8 : 0) + 8;
          const isCollapsed = collapsedPromoTypes[`${project}-${promoType}`] || false;
          const displayHeight = isCollapsed ? 32 : blockHeight;

          return (
            <TableRow key={`${project}-${promoType}`}
              sx={{ bgcolor: promoTypeIdx % 2 === 0 ? '#161E2F' : '#242F49' }}
            >
              <TableCell
                sx={{
                  position: 'sticky',
                  left: 0,
                  zIndex: 1,
                  bgcolor: '#333a56',
                  pl: 1,
                  fontSize: '0.8rem',
                  borderBottom: '2px solid rgba(255, 255, 255, 0.3)',
                  height: `${displayHeight}px`,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  cursor: 'pointer',
                  transition: 'height 0.3s ease-in-out',
                  '&:hover': {
                    bgcolor: '#3a4066'
                  }
                }}
                onClick={() => togglePromoTypeCollapse(project, promoType)}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <IconButton
                    size="small"
                    sx={{ 
                      color: '#fff', 
                      p: 0.25,
                      transition: 'transform 0.2s ease-in-out'
                    }}
                  >
                    {isCollapsed ? <ChevronRightIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                  </IconButton>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                    {promoType}
                  </Typography>
                </Box>
              </TableCell>
              {days.map(({ dayOfMonth, date, isWeekend }, dayIdx) => {
                // Находим все события для текущего дня
                const dayEvents = events.filter(event => {
                  if (event.project !== project || event.promo_type !== promoType) return false;
                  const startDate = dayjs.utc(event.start_date);
                  const endDate = dayjs.utc(event.end_date);
                  const currentDate = date.utc ? date.utc() : dayjs.utc(date);
                  if (event.promo_type === 'Кешбэк' && startDate.isSame(endDate, 'day')) {
                    // Только в ячейке даты начала
                    return currentDate.isSame(startDate, 'day');
                  }
                  // Для кешбэка на несколько дней — только если дата совпадает с началом или концом периода
                  if (event.promo_type === 'Кешбэк') {
                    return currentDate.isSame(startDate, 'day') || currentDate.isSame(endDate, 'day');
                  }
                  // Стандартная логика для остальных событий
                  return currentDate.isBetween(startDate, endDate, 'day', '[]');
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

                return (
                  <TableCell
                    key={dayOfMonth}
                    data-cell-key={cellKey}
                    onClick={(e) => {
                      console.log('📱 ProjectCalendarTable onClick:', cellKey);
                      handleCellClick(cellKey, e);
                    }}
                    onContextMenu={(e) => handleCellRightClick(cellKey, e)}
                    onMouseDown={(e) => {
                      console.log('📱 ProjectCalendarTable onMouseDown:', cellKey, 'button:', e.button);
                      handleCellMouseDown(cellKey, e);
                    }}
                    onMouseEnter={(e) => {
                      console.log('📱 ProjectCalendarTable onMouseEnter:', cellKey, 'buttons:', e.buttons);
                      handleCellMouseEnter(cellKey, e);
                    }}
                    className={`calendar-cell-selectable ${isCellSelected(cellKey) ? 'calendar-cell-selected' : ''}`}
                    sx={{
                      height: `${displayHeight}px`,
                      p: 0.25,
                      bgcolor: isWeekend ? '#444a66' : '#333a56',
                      borderLeft: '1px solid rgba(255, 255, 255, 0.25)',
                      borderBottom: '2px solid rgba(255, 255, 255, 0.3)',
                      verticalAlign: 'top',
                      position: 'relative',
                      transition: 'height 0.3s ease-in-out',
                      overflow: 'hidden',
                      '&:hover': {
                        bgcolor: isWeekend ? '#4a5066' : '#3a4066'
                      }
                    }}
                  >
                    {/* Промо события теперь отображаются как полосы в EventBarsLayer, 
                         здесь оставляем только пустое пространство для взаимодействия */}
                  </TableCell>
                );
              })}
            </TableRow>
          );
        })}
        {/* Строки с каналами информирования */}
        {CHANNEL_TYPES.map((channelType, channelTypeIdx) => (
          <TableRow key={`${project}-${channelType}`} sx={{ height: '32px', bgcolor: channelTypeIdx % 2 === 0 ? '#161E2F' : '#242F49' }}>
            <TableCell
              sx={{
                position: 'sticky',
                left: 0,
                zIndex: 1,
                bgcolor: '#333a56',
                color: '#fff',
                pl: 2,
                fontSize: '0.8rem',
                borderBottom: '2px solid rgba(255, 255, 255, 0.3)',
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
                    eventName: event.name,
                    parentPromoType: event.promo_type,
                    parentPromoKind: event.promo_kind
                  }))
                )
                .filter(channel => {
                  if (!channel || channel.type !== channelType) return false;
                  const channelDate = dayjs.utc(channel.start_date);
                  return channelDate.isSame(date, 'day');
                });

              const cellKey = getCellKey(project, channelType, dayOfMonth);

              return (
                <TableCell
                  key={dayOfMonth}
                  data-cell-key={cellKey}
                  onClick={(e) => {
                    console.log('📱 ProjectCalendarTable onClick (channel):', cellKey);
                    handleCellClick(cellKey, e);
                  }}
                  onContextMenu={(e) => handleCellRightClick(cellKey, e)}
                  onMouseDown={(e) => {
                    console.log('📱 ProjectCalendarTable onMouseDown (channel):', cellKey, 'button:', e.button);
                    handleCellMouseDown(cellKey, e);
                  }}
                  onMouseEnter={(e) => {
                    console.log('📱 ProjectCalendarTable onMouseEnter (channel):', cellKey, 'buttons:', e.buttons);
                    handleCellMouseEnter(cellKey, e);
                  }}
                  className={`calendar-cell-selectable ${isCellSelected(cellKey) ? 'calendar-cell-selected' : ''}`}
                  sx={{
                    height: '32px',
                    p: 0.25,
                    bgcolor: isWeekend ? '#444a66' : '#333a56',
                    borderLeft: '1px solid rgba(255, 255, 255, 0.25)',
                    borderBottom: '2px solid rgba(255, 255, 255, 0.3)',
                    verticalAlign: 'top',
                    '&:hover': {
                      bgcolor: isWeekend ? '#4a5066' : '#3a4066'
                    }
                  }}
                >
                  <Stack spacing={0.25}>
                    {channels.map((channel, index) => {
                      // Если есть родительское промо, используем его цвет
                      const promoColor = channel.parentPromoType
                        ? getEventColor(channel.parentPromoType, channel.parentPromoKind)
                        : getChannelColor(channel.type);
                      return (
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
                              backgroundColor: promoColor,
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
                      );
                    })}
                  </Stack>
                </TableCell>
              );
            })}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

// Мемоизированная версия компонента с кастомной функцией сравнения
export default React.memo(ProjectCalendarTable, (prevProps, nextProps) => {
  // Проверяем основные скалярные значения
  if (
    prevProps.project !== nextProps.project ||
    prevProps.projectIndex !== nextProps.projectIndex ||
    prevProps.daysInMonth !== nextProps.daysInMonth ||
    prevProps.highlightedEventId !== nextProps.highlightedEventId ||
    prevProps.isAdmin !== nextProps.isAdmin
  ) {
    return false;
  }

  // Проверяем массивы PROMO_TYPES и CHANNEL_TYPES (они readonly, поэтому должны быть стабильными)
  if (
    prevProps.PROMO_TYPES !== nextProps.PROMO_TYPES ||
    prevProps.CHANNEL_TYPES !== nextProps.CHANNEL_TYPES
  ) {
    return false;
  }

  // Проверяем события - сравниваем по ключам для оптимизации
  if (!shallowCompareArrays(prevProps.events, nextProps.events, createEventKey)) {
    return false;
  }

  // Проверяем дни - поверхностное сравнение
  if (!shallowCompareArrays(
    prevProps.days, 
    nextProps.days, 
    (day) => `${day.dayOfMonth}-${day.dayOfWeek}-${day.isWeekend}`
  )) {
    return false;
  }

  // Проверяем объект collapsedPromoTypes
  const prevCollapsed = JSON.stringify(prevProps.collapsedPromoTypes);
  const nextCollapsed = JSON.stringify(nextProps.collapsedPromoTypes);
  if (prevCollapsed !== nextCollapsed) {
    return false;
  }

  // Проверяем ref объекты (они должны быть стабильными между рендерами)
  if (prevProps.tableRef !== nextProps.tableRef) {
    return false;
  }



  // Все функции-колбэки предполагаются стабильными (обернутые в useCallback в родителе)
  // Если они не стабильные, компонент будет ререндериться, но это ожидаемое поведение

  return true; // Компоненты равны, ререндер не нужен
}); 