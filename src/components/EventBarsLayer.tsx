import React from 'react';
import { Box, Tooltip, Typography } from '@mui/material';
import dayjs from '../utils/dayjs';
import { PromoEvent, InfoChannel } from '../types';

interface EventBarsLayerProps {
  project: string;
  events: PromoEvent[];
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
  
  // Пересчитываем позиции после рендера таблицы и изменения состояния сворачивания
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setRenderKey(prev => prev + 1);
    }, 100); // Небольшая задержка для завершения рендера таблицы
    
    return () => clearTimeout(timer);
  }, [events, selectedMonth, selectedYear]);

  // Дополнительный пересчет при изменении состояния сворачивания (с учетом анимации)
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setRenderKey(prev => prev + 1);
    }, 350); // 350ms = 300ms анимация + 50ms буфер
    
    return () => clearTimeout(timer);
  }, [collapsedPromoTypes]);

  // Мгновенный пересчет позиций при принудительном обновлении
  React.useEffect(() => {
    if (forcePositionUpdate > 0) {
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

  // Функция для рендера одной полосы события
  const renderEventBar = (event: PromoEvent, rowIndex: number) => {
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

    // Вычисляем позицию и размеры полосы на основе реальных ячеек таблицы
    if (!tableRef.current) return null;

    const startDay = visibleStart.date();
    const endDay = visibleEnd.date();
    
    // Находим ячейки начального и конечного дня
    const startCellSelector = `[data-cell-key="${project}-${event.promo_type}-${startDay}"]`;
    const endCellSelector = `[data-cell-key="${project}-${event.promo_type}-${endDay}"]`;
    
    const startCell = tableRef.current.querySelector(startCellSelector) as HTMLElement;
    const endCell = tableRef.current.querySelector(endCellSelector) as HTMLElement;
    
    if (!startCell || !endCell) {
      // Если ячейки не найдены, возможно строка свернута или еще не отрендерена
      return null;
    }

    // Получаем позиции ячеек относительно таблицы
    const tableRect = tableRef.current.getBoundingClientRect();
    const startCellRect = startCell.getBoundingClientRect();
    const endCellRect = endCell.getBoundingClientRect();
    
    // Вычисляем позицию X и ширину
    const leftOffset = startCellRect.left - tableRect.left;
    const rightOffset = endCellRect.right - tableRect.left;
    const barWidth = rightOffset - leftOffset;
    
    // Позиция Y - используем позицию ячейки + смещение для строки события
    const topOffset = startCellRect.top - tableRect.top + (rowIndex * 24) + 6;

    return (
      <Tooltip
        key={`bar-${event.id}-${rowIndex}-${event.start_date}-${event.end_date}`}
        title={getEventTooltipContent(event, false)}
        placement="top"
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
  };

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
        '& > *': {
          pointerEvents: 'auto'
        }
      }}
    >
      {renderEventBars()}
    </Box>
  );
};

export default EventBarsLayer; 