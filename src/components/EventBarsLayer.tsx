import React from 'react';
import { Box, Tooltip, Typography } from '@mui/material';
import dayjs from '../utils/dayjs';
import { PromoEvent, InfoChannel } from '../types';
import { shallowCompareArrays, createEventKey } from '../utils/memoization';

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
  
  // Кэш для DOM измерений
  const domCache = React.useRef<Map<string, {
    tableRect: DOMRect;
    cellRects: Map<string, DOMRect>;
    timestamp: number;
  }>>(new Map());
  
  // Функция для получения кэшированных DOM измерений
  const getCachedDOMData = React.useCallback((cacheKey: string) => {
    const cached = domCache.current.get(cacheKey);
    const now = Date.now();
    
    // Кэш действителен 200мс
    if (cached && (now - cached.timestamp) < 200) {
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
    
    // Ограничиваем размер кэша
    if (domCache.current.size > 10) {
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
  
  // Пересчитываем позиции после рендера таблицы и изменения состояния сворачивания
  React.useEffect(() => {
    const timer = setTimeout(() => {
      domCache.current.clear(); // Очищаем кэш
      setRenderKey(prev => prev + 1);
    }, 100); // Небольшая задержка для завершения рендера таблицы
    
    return () => clearTimeout(timer);
  }, [events, selectedMonth, selectedYear]);

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
    
    // Создаем ключ для кэша DOM данных
    const cacheKey = `${project}-${event.promo_type}-${selectedMonth}-${selectedYear}-${renderKey}`;
    
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
  }, [selectedMonth, selectedYear, getCachedDOMData, getEventColor, handleContextMenu, 
      highlightedEventId, setHighlightedEventId, getEventTooltipContent, 
      pulseAnimation, project, renderKey]);

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

  // Проверяем события - сравниваем по ключам
  if (!shallowCompareArrays(prevProps.events, nextProps.events, createEventKey)) {
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