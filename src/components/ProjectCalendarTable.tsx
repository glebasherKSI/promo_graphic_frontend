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
  Chip
} from '@mui/material';
import dayjs from '../utils/dayjs';
import { PromoEvent, InfoChannel } from '../types';

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
  isAdmin
}) => {
  return (
    <Table
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
                  const startDate = dayjs(event.start_date).utc();
                  const endDate = dayjs(event.end_date).utc();
                  const currentDate = date.utc ? date.utc() : dayjs(date).utc();
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
                    onClick={(e) => handleCellClick(cellKey, e)}
                    onContextMenu={(e) => handleCellRightClick(cellKey, e)}
                    onMouseDown={(e) => handleCellMouseDown(cellKey, e)}
                    onMouseEnter={(e) => handleCellMouseEnter(cellKey, e)}
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
                            top: `${event.rowIndex * 32}px`,
                            left: 1,
                            right: 1,
                            padding: '4px 0'
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
                                backgroundColor: getEventColor(event.promo_type, event.promo_kind),
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
                    eventName: event.name,
                    parentPromoType: event.promo_type,
                    parentPromoKind: event.promo_kind
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
                  onContextMenu={(e) => handleCellRightClick(cellKey, e)}
                  onMouseDown={(e) => handleCellMouseDown(cellKey, e)}
                  onMouseEnter={(e) => handleCellMouseEnter(cellKey, e)}
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

export default ProjectCalendarTable; 