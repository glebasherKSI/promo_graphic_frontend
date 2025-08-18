import React from 'react';
import { Box, Tooltip, Typography } from '@mui/material';
import dayjs from '../../utils/dayjs';
import { PromoEvent, InfoChannel } from '../../types';
import { shallowCompareArrays, createEventKey } from '../../utils/memoization';

interface EventBarsLayerProps {
  project: string;
  events: PromoEvent[];
  standaloneChannels: InfoChannel[];
  days: Array<{ dayOfMonth: number; date: any; dayOfWeek: string; isWeekend: boolean }>;
  selectedMonth: number;
  selectedYear: number;
  PROMO_TYPES: readonly string[];
  getEventColor: (promoType: string, promoKind?: string) => string;
  handleContextMenu: (event: React.MouseEvent, promoEvent: PromoEvent | InfoChannel, isChannel?: boolean) => void;
  highlightedEventId: string | null;
  setHighlightedEventId: (id: string | null) => void;
  getEventTooltipContent: (event: PromoEvent | InfoChannel, isChannel?: boolean) => React.ReactNode;
  pulseAnimation: any;
  tableRef: React.RefObject<HTMLTableElement>;
  projectIndex: number;
  collapsedPromoTypes: {[projectType: string]: boolean};
  forcePositionUpdate: number;
}

const EventBarsLayer: React.FC<EventBarsLayerProps> = ({
  project,
  events,
  standaloneChannels,
  days,
  selectedMonth,
  selectedYear,
  PROMO_TYPES,
  getEventColor,
  handleContextMenu,
  highlightedEventId,
  setHighlightedEventId,
  getEventTooltipContent,
  pulseAnimation,
  tableRef,
  projectIndex,
  collapsedPromoTypes,
  forcePositionUpdate
}) => {
  // Константы для размеров
  const CHIP_HEIGHT = 20;
  
  // Состояние для принудительного ререндера после изменения таблицы
  const [renderKey, setRenderKey] = React.useState(0);
  
  // Кэш для DOM измерений
  const domCache = React.useRef<Map<string, {
    tableRect: DOMRect;
    cellRects: Map<string, DOMRect>;
    timestamp: number;
  } | null>>(new Map());
  
  // Функция для получения кэшированных DOM измерений
  const getCachedDOMData = React.useCallback((cacheKey: string) => {
    const cached = domCache.current.get(cacheKey);
    const now = Date.now();
    
    // Увеличиваем время жизни кэша до 500ms для снижения частоты пересчетов
    if (cached && (now - cached.timestamp) < 500) {
      return cached;
    }
    
    // Если кэш устарел или отсутствует, вычисляем заново
    if (!tableRef.current) return null;
    
    const tableRect = tableRef.current.getBoundingClientRect();
    const cellRects = new Map<string, DOMRect>();
    
    // Кэшируем позиции всех ячеек для текущего проекта
    PROMO_TYPES.forEach(promoType => {
      for (let day = 1; day <= 31; day++) { // Максимальное количество дней
        const cellSelector = `[data-cell-key="${project}-${promoType}-${day}"]`;
        const cell = tableRef.current!.querySelector(cellSelector) as HTMLElement;
        if (cell) {
          cellRects.set(`${promoType}-${day}`, cell.getBoundingClientRect());
        }
      }
    });
    
    const newData = {
      tableRect,
      cellRects,
      timestamp: now
    };
    
    domCache.current.set(cacheKey, newData);
    
    // Увеличиваем размер кэша для лучшей производительности
    if (domCache.current.size > 20) {
      const firstKey = domCache.current.keys().next().value;
      if (firstKey) {
        domCache.current.delete(firstKey);
      }
    }
    
    return newData;
  }, [tableRef, project, PROMO_TYPES]);
  
  // Очищаем кэш при изменении ключевых параметров
  React.useEffect(() => {
    domCache.current.clear();
  }, [events, selectedMonth, selectedYear, collapsedPromoTypes, forcePositionUpdate]);
  
  // Дополнительная очистка кэша при изменении событий (для обновления каналов)
  React.useEffect(() => {
    const timer = setTimeout(() => {
      domCache.current.clear();
      setRenderKey(prev => prev + 1);
    }, 50);
    
    return () => clearTimeout(timer);
  }, [events]);
  
  // Пересчитываем позиции после рендера таблицы и изменения состояния сворачивания
  React.useEffect(() => {
    const timer = setTimeout(() => {
      domCache.current.clear(); // Очищаем кэш
      setRenderKey(prev => prev + 1);
    }, 100); // Небольшая задержка для завершения рендера таблицы
    
    return () => clearTimeout(timer);
  }, [events, selectedMonth, selectedYear]);
  
  // Принудительное обновление при изменении событий (для каналов)
  React.useEffect(() => {
    const timer = setTimeout(() => {
      domCache.current.clear();
      setRenderKey(prev => prev + 1);
    }, 150); // Увеличенная задержка для обновления каналов
    
    return () => clearTimeout(timer);
  }, [events]);

  // Дополнительный пересчет при изменении состояния сворачивания (с учетом анимации)
  React.useEffect(() => {
    const timer = setTimeout(() => {
      domCache.current.clear(); // Очищаем кэш
      setRenderKey(prev => prev + 1);
    }, 350); // 350ms = 300ms анимация + 50ms буфер
    
    return () => clearTimeout(timer);
  }, [collapsedPromoTypes]);

  // Мгновенный пересчет позиций при принудительном обновлении
  React.useEffect(() => {
    if (forcePositionUpdate > 0) {
      domCache.current.clear(); // Очищаем кэш
      setRenderKey(prev => prev + 1);
    }
  }, [forcePositionUpdate]);

  // Рендерим полосы для каждого типа промо
  const renderEventBars = () => {
    const allBars: React.ReactNode[] = [];

    PROMO_TYPES.forEach((promoType, promoTypeIdx) => {
      // Проверяем, свернут ли этот тип промо
      const isCollapsed = collapsedPromoTypes[`${project}-${promoType}`] || false;
      if (isCollapsed) {
        return; // Пропускаем рендер полос для свернутых типов
      }

      // Получаем все события данного типа для проекта (та же логика)
      const typeEvents = events.filter(event =>
        event.project === project &&
        event.promo_type === promoType
      );

      // Определяем количество необходимых строк для этого типа (та же логика)
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

      // Создаем полосы для каждого события
      rows.forEach((rowEvents, rowIndex) => {
        rowEvents.forEach(event => {
          const bar = renderEventBar(event, rowIndex);
          if (bar) allBars.push(bar);
        });
      });
    });

    return allBars;
  };

  // Функция для рендера одной полосы события (оптимизированная)
  const renderEventBar = React.useCallback((event: PromoEvent, rowIndex: number) => {
    const eventStart = dayjs.utc(event.start_date);
    const eventEnd = dayjs.utc(event.end_date);
    
    // Начало и конец текущего месяца в UTC
    const monthStart = dayjs.utc().year(selectedYear).month(selectedMonth - 1).startOf('month');
    const monthEnd = monthStart.endOf('month');

    // Вычисляем видимый период события в рамках месяца
    const visibleStart = eventStart.isBefore(monthStart) ? monthStart : eventStart;
    const visibleEnd = eventEnd.isAfter(monthEnd) ? monthEnd : eventEnd;

    // Если событие не пересекается с месяцем, не рендерим
    if (visibleEnd.isBefore(monthStart) || visibleStart.isAfter(monthEnd)) {
      return null;
    }

    const startDay = visibleStart.date();
    const endDay = visibleEnd.date();
    
    // Создаем ключ для кэша DOM данных (добавляем ID события для уникальности)
    const cacheKey = `${project}-${event.promo_type}-${selectedMonth}-${selectedYear}-${renderKey}-${event.id}`;
    
    // Получаем кэшированные DOM данные
    const domData = getCachedDOMData(cacheKey);
    if (!domData) return null;
    
    // Получаем позиции ячеек из кэша
    const startCellRect = domData.cellRects.get(`${event.promo_type}-${startDay}`);
    const endCellRect = domData.cellRects.get(`${event.promo_type}-${endDay}`);
    
    if (!startCellRect || !endCellRect) {
      // Если ячейки не найдены в кэше, возможно строка свернута
      return null;
    }
    
    // Вычисляем позицию X и ширину используя кэшированные данные
    const leftOffset = startCellRect.left - domData.tableRect.left;
    const rightOffset = endCellRect.right - domData.tableRect.left;
    const barWidth = rightOffset - leftOffset;
    
    // Позиция Y - используем позицию ячейки + смещение для строки события
    const topOffset = startCellRect.top - domData.tableRect.top + (rowIndex * 24) + 6;

    return (
      <Tooltip
        key={`bar-${event.id}-${rowIndex}-${event.start_date}-${event.end_date}`}
        title={getEventTooltipContent(event, false)}
        placement="top"
        arrow
        enterDelay={200}
        leaveDelay={0}
        enterNextDelay={100}
        PopperProps={{
          modifiers: [
            { name: 'flip', enabled: true, options: { altBoundary: true, rootBoundary: 'viewport', padding: 8 } },
            { name: 'preventOverflow', options: { altAxis: true, tether: true, rootBoundary: 'viewport', padding: 8 } }
          ],
          sx: {
            '& .MuiTooltip-tooltip': {
              bgcolor: 'rgba(51, 58, 86, 0.65)',
              color: '#eff0f1',
              p: 0,
              maxWidth: 'none',
              maxHeight: '70vh',
              overflowY: 'auto',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              fontSize: '0.85rem',
              lineHeight: 1.4
            },
            '& .MuiTooltip-arrow': {
              color: 'rgba(51, 58, 86, 0.65)'
            }
          }
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            left: `${leftOffset}px`,
            top: `${topOffset}px`,
            width: `${barWidth}px`,
            height: `${CHIP_HEIGHT}px`,
            backgroundColor: getEventColor(event.promo_type, event.promo_kind),
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 10,
            border: '1px solid rgba(0,0,0,0.2)',
            boxSizing: 'border-box',
            contain: 'layout style paint',
            willChange: 'transform',
            transition: 'transform 0.15s ease-in-out, box-shadow 0.15s ease-in-out',
            '&:hover': {
              transform: 'scale(1.02)',
              zIndex: 15,
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
            },
            ...(highlightedEventId === event.id && {
              ...pulseAnimation,
              zIndex: 20
            }),
          }}
          className={highlightedEventId === event.id ? 'highlighted-element' : ''}
          onContextMenu={(e: React.MouseEvent) => handleContextMenu(e, event, false)}
          onClick={(e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onMouseEnter={() => setHighlightedEventId(event.id)}
          onMouseLeave={() => setHighlightedEventId(null)}
        >
          <Typography
            variant="caption"
            sx={{
              color: '#000',
              fontWeight: 500,
              fontSize: '0.7rem',
              textAlign: 'center',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              px: 1
            }}
          >
            {event.name || event.promo_type}
            {eventStart.isBefore(monthStart) && ' ←'}
            {eventEnd.isAfter(monthEnd) && ' →'}
          </Typography>
        </Box>
      </Tooltip>
    );
  }, [selectedMonth, selectedYear, getCachedDOMData, getEventColor, handleContextMenu, 
      highlightedEventId, setHighlightedEventId, getEventTooltipContent, 
      pulseAnimation, project, renderKey]);

  // Функция для рендера standalone-каналов
  const renderStandaloneChannels = React.useCallback(() => {
    const allChannelBars: React.ReactNode[] = [];
    
    // Группируем каналы по типам для правильного позиционирования
    const channelsByType = new Map<string, InfoChannel[]>();
    
    standaloneChannels
      .filter(channel => channel.project === project)
      .forEach(channel => {
        if (!channelsByType.has(channel.type)) {
          channelsByType.set(channel.type, []);
        }
        channelsByType.get(channel.type)!.push(channel);
      });

    // Рендерим каналы для каждого типа
    channelsByType.forEach((channels, channelType) => {
      // Находим соответствующий тип промо для позиционирования
      const promoType = PROMO_TYPES.find(type => type === channelType) || channelType;
      
      for (let index = 0; index < channels.length; index++) {
        const channel = channels[index];
        const channelDate = dayjs.utc(channel.start_date);
        const monthStart = dayjs.utc().year(selectedYear).month(selectedMonth - 1).startOf('month');
        const monthEnd = monthStart.endOf('month');

        // Если канал не попадает в месяц, не рендерим
        if (!channelDate.isBetween(monthStart, monthEnd, 'day', '[]')) {
          continue;
        }

        const day = channelDate.date();
        
        // Создаем ключ для кэша DOM данных
        const cacheKey = `${project}-${promoType}-${selectedMonth}-${selectedYear}-${renderKey}-channel-${channel.id}`;
        
        // Получаем кэшированные DOM данные
        const domData = getCachedDOMData(cacheKey);
        if (!domData) continue;
        
        // Получаем позицию ячейки из кэша
        const cellRect = domData.cellRects.get(`${promoType}-${day}`);
        
        if (!cellRect) {
          continue;
        }
        
        // Вычисляем позицию X
        const leftOffset = cellRect.left - domData.tableRect.left;
        
        // Позиция Y - используем позицию ячейки + смещение для канала
        const topOffset = cellRect.top - domData.tableRect.top + 6;

        const bar = (
          <Tooltip
            key={`channel-${channel.id}-${index}`}
            title={getEventTooltipContent(channel, true)}
            placement="top"
            arrow
            enterDelay={200}
            leaveDelay={0}
            enterNextDelay={100}
            PopperProps={{
              modifiers: [
                { name: 'flip', enabled: true, options: { altBoundary: true, rootBoundary: 'viewport', padding: 8 } },
                { name: 'preventOverflow', options: { altAxis: true, tether: true, rootBoundary: 'viewport', padding: 8 } }
              ],
              sx: {
                '& .MuiTooltip-tooltip': {
                  bgcolor: 'rgba(51, 58, 86, 0.65)',
                  color: '#eff0f1',
                  p: 0,
                  maxWidth: 'none',
                  maxHeight: '70vh',
                  overflowY: 'auto',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                  fontSize: '0.85rem',
                  lineHeight: 1.4
                },
                '& .MuiTooltip-arrow': {
                  color: 'rgba(51, 58, 86, 0.65)'
                }
              }
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                left: `${leftOffset}px`,
                top: `${topOffset}px`,
                width: '24px',
                height: `${CHIP_HEIGHT}px`,
                backgroundColor: '#FFA586', // Цвет для standalone-каналов
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                pointerEvents: 'auto',
                border: '2px solid #B51A2B',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  transform: 'scale(1.05)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)'
                }
                // Убираем pulseAnimation для standalone-каналов
              }}
              onContextMenu={(e) => handleContextMenu(e, channel, true)}
              // Убираем onMouseEnter и onMouseLeave для standalone-каналов
            >
              <Typography
                variant="caption"
                sx={{
                  color: '#000',
                  fontWeight: 'bold',
                  fontSize: '0.7rem',
                  lineHeight: 1,
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  px: 0.5
                }}
              >
                {channel.type}*
              </Typography>
            </Box>
          </Tooltip>
        );
        
        allChannelBars.push(bar);
      }
    });

    return allChannelBars;
  }, [standaloneChannels, project, selectedMonth, selectedYear, PROMO_TYPES, 
      getCachedDOMData, getEventTooltipContent, handleContextMenu, 
      renderKey]);

  return (
    <Box
      key={renderKey} // Принудительный ререндер при изменении таблицы
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        zIndex: 5,
        contain: 'layout style paint',
        willChange: 'transform',
        '& > *': {
          pointerEvents: 'auto'
        }
      }}
    >
      {renderEventBars()}
      {renderStandaloneChannels()}
    </Box>
  );
};

// Мемоизированная версия компонента с кастомной функцией сравнения
export default React.memo(EventBarsLayer, (prevProps, nextProps) => {
  // Проверяем основные скалярные значения
  if (
    prevProps.project !== nextProps.project ||
    prevProps.selectedMonth !== nextProps.selectedMonth ||
    prevProps.selectedYear !== nextProps.selectedYear ||
    prevProps.projectIndex !== nextProps.projectIndex ||
    prevProps.highlightedEventId !== nextProps.highlightedEventId ||
    prevProps.forcePositionUpdate !== nextProps.forcePositionUpdate
  ) {
    return false;
  }

  // Проверяем события - сравниваем по ключам и количеству
  if (prevProps.events.length !== nextProps.events.length) {
    return false;
  }
  
  if (!shallowCompareArrays(prevProps.events, nextProps.events, createEventKey)) {
    return false;
  }

  // Проверяем standalone-каналы
  if (prevProps.standaloneChannels.length !== nextProps.standaloneChannels.length) {
    return false;
  }
  
  const prevStandaloneChannelKeys = prevProps.standaloneChannels.map(channel => `${channel.id}-${channel.start_date}`);
  const nextStandaloneChannelKeys = nextProps.standaloneChannels.map(channel => `${channel.id}-${channel.start_date}`);
  
  if (!shallowCompareArrays(prevStandaloneChannelKeys, nextStandaloneChannelKeys)) {
    return false;
  }

  // Дополнительная проверка для каналов информирования
  const prevChannelsCount = prevProps.events.reduce((count, event) => 
    count + (event.info_channels?.length || 0), 0);
  const nextChannelsCount = nextProps.events.reduce((count, event) => 
    count + (event.info_channels?.length || 0), 0);
  
  if (prevChannelsCount !== nextChannelsCount) {
    return false;
  }

  // Проверяем дни
  if (!shallowCompareArrays(
    prevProps.days, 
    nextProps.days, 
    (day) => `${day.dayOfMonth}-${day.dayOfWeek}-${day.isWeekend}`
  )) {
    return false;
  }

  // Проверяем PROMO_TYPES (должен быть стабильным)
  if (prevProps.PROMO_TYPES !== nextProps.PROMO_TYPES) {
    return false;
  }

  // Проверяем объект collapsedPromoTypes
  const prevCollapsed = JSON.stringify(prevProps.collapsedPromoTypes);
  const nextCollapsed = JSON.stringify(nextProps.collapsedPromoTypes);
  if (prevCollapsed !== nextCollapsed) {
    return false;
  }

  // Проверяем ref объекты
  if (prevProps.tableRef !== nextProps.tableRef) {
    return false;
  }

  // Функции-колбэки предполагаются стабильными
  return true; // Компоненты равны, ререндер не нужен
}); 