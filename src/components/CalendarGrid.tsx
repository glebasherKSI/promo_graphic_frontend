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
  CHANNEL_TYPES,
  PROMO_EVENT_COLORS,
  CHANNEL_COLORS
} from '../constants/promoTypes';
import ProjectCalendarTable from './ProjectCalendarTable';
import EventBarsLayer from './EventBarsLayer';

// Праздничные дни РФ (ежегодные)
const HOLIDAYS = [
  { month: 1, days: [1, 2, 3, 4, 5, 6, 7, 8] },
  { month: 2, days: [23] },
  { month: 3, days: [8] },
  { month: 5, days: [1, 9] },
  { month: 6, days: [12, 13] },
  { month: 11, days: [4] },
];

// Функция для получения цвета события
const getEventColor = (promoType: string, promoKind?: string): string => {
  // Если есть вид промо, используем комбинацию тип-вид
  if (promoKind) {
    const colorKey = `${promoType}-${promoKind}`;
    return PROMO_EVENT_COLORS[colorKey] || PROMO_EVENT_COLORS[promoType] || '#666';
  }
  // Иначе используем только тип
  return PROMO_EVENT_COLORS[promoType] || '#666';
};

// Функция для получения цвета канала
const getChannelColor = (channelType: string): string => {
  return CHANNEL_COLORS[channelType] || '#666';
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
  onEventCreate?: (eventData: any, project: string, startDate: string, endDate: string) => void;
  onChannelCreate?: (channelData: any, project: string, startDate: string) => void;
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
  loadEvents,
  onEventCreate,
  onChannelCreate
}) => {
  const [contextMenu, setContextMenu] = useState<{ mouseX: number; mouseY: number } | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<DisplayPromoEvent | null>(null);
  const [highlightedEventId, setHighlightedEventId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Контекстное меню для выделенных ячеек
  const [cellContextMenu, setCellContextMenu] = useState<{ mouseX: number; mouseY: number } | null>(null);
  const [selectedCellsData, setSelectedCellsData] = useState<{
    project: string;
    rowType: string;
    startDate: string;
    endDate: string;
    isChannelRow: boolean;
  } | null>(null);
  
  // Убираем состояние для выделенных ячеек - будем работать напрямую с DOM
  // const [selectedCells, setSelectedCells] = useState<{[key: string]: boolean}>({});
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<string | null>(null);
  
  // Новое состояние для drag selection
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartCell, setDragStartCell] = useState<string | null>(null);
  
  // Состояние для отслеживания свернутых типов промо по проектам
  const [collapsedPromoTypes, setCollapsedPromoTypes] = useState<{[projectType: string]: boolean}>({});
  
  // Состояние для принудительного обновления позиций полос
  const [forcePositionUpdate, setForcePositionUpdate] = useState(0);
  
  // Ref для отслеживания выделенных ячеек без ререндера
  const selectedCellsRef = useRef<Set<string>>(new Set());
  const tableRef = useRef<HTMLTableElement>(null);
  
  // Создаем refs для каждого проекта
  const projectTableRefs = useRef<{[key: string]: React.RefObject<HTMLTableElement>}>({});
  
  // Инициализируем refs для выбранных проектов
  selectedProjects.forEach(project => {
    if (!projectTableRefs.current[project]) {
      projectTableRefs.current[project] = React.createRef<HTMLTableElement>();
    }
  });

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

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

  // Функция для переключения сворачивания типа промо
  const togglePromoTypeCollapse = useCallback((project: string, promoType: string) => {
    const key = `${project}-${promoType}`;
    setCollapsedPromoTypes(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
    
    // Принудительно обновляем позиции полос
    setTimeout(() => {
      setForcePositionUpdate(prev => prev + 1);
    }, 50);
  }, []);

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
                {dayjs.utc(channel.start_date).format('DD.MM.YYYY HH:mm')}
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
                {`${dayjs.utc(promoEvent.start_date).format('DD.MM.YYYY HH:mm')} - ${dayjs.utc(promoEvent.end_date).format('DD.MM.YYYY HH:mm')}`}
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
      // Используем dayjs.utc() для создания дат в UTC
      const utcDate = dayjs.utc()
        .year(selectedYear)
        .month(selectedMonth - 1)
        .date(i + 1)
        .startOf('day');
      days.push({
        dayOfMonth: i + 1,
        date: utcDate,
        dayOfWeek: utcDate.format('dd').toUpperCase(),
        isWeekend: isWeekend(utcDate)
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

  const handleCloseCellMenu = useCallback(() => {
    setCellContextMenu(null);
    setSelectedCellsData(null);
    // НЕ очищаем выделение при закрытии меню
  }, []);

  // Функция для получения дат из выделенных ячеек
  const getSelectedCellsDates = useCallback((cellKeys: string[]) => {
    const days = cellKeys.map(key => {
      const parts = key.split('-');
      return parseInt(parts[parts.length - 1]); // Последняя часть - день месяца
    }).sort((a, b) => a - b);

    const startDay = days[0];
    const endDay = days[days.length - 1];

    const startDate = dayjs.utc()
      .year(selectedYear)
      .month(selectedMonth - 1)
      .date(startDay)
      .startOf('day')
      .format('YYYY-MM-DDTHH:mm:ss');

    const endDate = dayjs.utc()
      .year(selectedYear)
      .month(selectedMonth - 1)
      .date(endDay)
      .endOf('day')
      .format('YYYY-MM-DDTHH:mm:ss');

    return { startDate, endDate };
  }, [selectedMonth, selectedYear]);

  // Обработчик ПКМ на выделенных ячейках
  const handleCellContextMenu = useCallback((event: React.MouseEvent) => {
    if (selectedCellsRef.current.size === 0) return;

    event.preventDefault();
    event.stopPropagation();

    const cellKeys = Array.from(selectedCellsRef.current);
    const firstCellKey = cellKeys[0];
    const parts = firstCellKey.split('-');
    const dayOfMonth = parts[parts.length - 1]; // Последняя часть - день месяца
    const project = parts[0]; // Первая часть - проект
    const rowType = parts.slice(1, -1).join('-'); // Средние части - тип строки
    
    const { startDate, endDate } = getSelectedCellsDates(cellKeys);
    const isChannelRow = CHANNEL_TYPES.some(type => type === rowType);

    setSelectedCellsData({
      project,
      rowType,
      startDate,
      endDate,
      isChannelRow
    });

    setCellContextMenu({
      mouseX: event.clientX,
      mouseY: event.clientY
    });
  }, [getSelectedCellsDates]);

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

  const handleDeleteClick = useCallback(() => {
    setConfirmDeleteOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    setConfirmDeleteOpen(false);
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
  }, [selectedEvent, loadEvents, handleCloseMenu]);

  const handleCancelDelete = useCallback(() => {
    setConfirmDeleteOpen(false);
  }, []);

  const days = getDaysArray();

  // Функция для обновления выделения в DOM без ререндера
  const updateCellSelection = useCallback((cellKey: string, selected: boolean) => {
    const cell = document.querySelector(`[data-cell-key="${cellKey}"]`);
    if (cell) {
      if (selected) {
        cell.classList.add('calendar-cell-selected');
        console.log('Выделена ячейка:', cellKey);
      } else {
        cell.classList.remove('calendar-cell-selected');
        console.log('Снято выделение ячейки:', cellKey);
      }
    }
  }, []);

  // Обработчик клавиатуры для отмены выделения по Escape
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && selectedCellsRef.current.size > 0) {
        console.log('Очистка выделения по Escape');
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

  const handleCellClick = useCallback((cellKey: string, event: React.MouseEvent) => {
    // Только для левого клика (выделение ячеек)
    if (event.button !== 0) return; // Обрабатываем только ЛКМ

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

  // Восстановление выделения после ререндера
  React.useEffect(() => {
    // Восстанавливаем CSS классы выделения для всех выделенных ячеек
    selectedCellsRef.current.forEach(cellKey => {
      const cell = document.querySelector(`[data-cell-key="${cellKey}"]`);
      if (cell && !cell.classList.contains('calendar-cell-selected')) {
        cell.classList.add('calendar-cell-selected');
        console.log('Восстановлено выделение ячейки после ререндера:', cellKey);
      }
    });
  });

  // Отдельный обработчик для правого клика (контекстное меню)
  const handleCellRightClick = useCallback((cellKey: string, event: React.MouseEvent) => {
    console.log('ПКМ по ячейке:', cellKey, 'Выделенных ячеек:', selectedCellsRef.current.size);
    event.preventDefault();
    event.stopPropagation();

    // Если кликнули ПКМ по выделенной ячейке или есть выделенные ячейки
    if (selectedCellsRef.current.has(cellKey) || selectedCellsRef.current.size > 0) {
      // Если кликнули по не выделенной ячейке, но есть другие выделенные - добавляем эту ячейку к выделению
      if (!selectedCellsRef.current.has(cellKey)) {
        selectedCellsRef.current.add(cellKey);
        updateCellSelection(cellKey, true);
        console.log('Добавлена ячейка к выделению при ПКМ:', cellKey);
      }
      
      handleCellContextMenu(event);
    } else {
      // Если нет выделенных ячеек, выделяем эту и показываем меню
      selectedCellsRef.current.add(cellKey);
      updateCellSelection(cellKey, true);
      setSelectionStart(cellKey);
      console.log('Выделена новая ячейка при ПКМ:', cellKey);
      handleCellContextMenu(event);
    }
  }, [updateCellSelection, handleCellContextMenu]);

  const handleCellMouseDown = useCallback((cellKey: string, event: React.MouseEvent) => {
    if (event.button === 0) { // Левая кнопка мыши
      event.preventDefault();
      event.stopPropagation();
      setIsSelecting(true);
      
      if (!event.ctrlKey && !event.metaKey && !event.shiftKey) {
        setSelectionStart(cellKey);
        // Начинаем drag selection
        setIsDragging(true);
        setDragStartCell(cellKey);
      }
    }
  }, []);

  // Новый обработчик для drag selection при наведении мыши
  const handleCellMouseEnter = useCallback((cellKey: string, event: React.MouseEvent) => {
    if (isDragging && dragStartCell && event.buttons === 1) { // Проверяем что ЛКМ всё еще зажата
      // Получаем все ячейки между начальной и текущей
      const startParts = dragStartCell.split('-');
      const currentParts = cellKey.split('-');
      
      // Проверяем что это ячейки из одной строки (одинаковый проект и тип)
      const startProject = startParts[0];
      const startRowType = startParts.slice(1, -1).join('-');
      const currentProject = currentParts[0];
      const currentRowType = currentParts.slice(1, -1).join('-');
      
      if (startProject === currentProject && startRowType === currentRowType) {
        const startDay = parseInt(startParts[startParts.length - 1]);
        const currentDay = parseInt(currentParts[currentParts.length - 1]);
        
        // Очищаем предыдущее выделение
        selectedCellsRef.current.forEach(key => updateCellSelection(key, false));
        selectedCellsRef.current.clear();
        
        // Выделяем диапазон от startDay до currentDay
        const minDay = Math.min(startDay, currentDay);
        const maxDay = Math.max(startDay, currentDay);
        
        for (let day = minDay; day <= maxDay; day++) {
          const rangeCellKey = getCellKey(startProject, startRowType, day);
          selectedCellsRef.current.add(rangeCellKey);
          updateCellSelection(rangeCellKey, true);
        }
      }
    }
  }, [isDragging, dragStartCell, updateCellSelection]);

  // Обработчик завершения drag selection
  const handleMouseUp = useCallback((event: MouseEvent) => {
    if (isDragging) {
      setIsDragging(false);
      setDragStartCell(null);
      setIsSelecting(false);
    }
  }, [isDragging]);

  // Добавляем глобальный обработчик mouseup
  React.useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseUp]);

  const isCellSelected = useCallback((cellKey: string) => {
    return selectedCellsRef.current.has(cellKey);
  }, []);

  // Очистка выделения при клике вне ячеек
  const handleTableClick = useCallback((event: React.MouseEvent) => {
    // Обрабатываем только левый клик
    if (event.button !== 0) return;
    
    // Очищаем выделение только если клик был не по ячейке и не по контекстному меню
    const target = event.target as HTMLElement;
    if (!target.closest('.calendar-cell-selectable') && 
        !target.closest('[role="menu"]') && 
        !target.closest('.MuiPaper-root')) {
      console.log('Очистка выделения через handleTableClick');
      selectedCellsRef.current.forEach(key => updateCellSelection(key, false));
      selectedCellsRef.current.clear();
      setSelectionStart(null);
    }
  }, [updateCellSelection]);

  // Обработчики создания событий и каналов
  const handleCreatePromoEvent = useCallback(() => {
    if (selectedCellsData && onEventCreate) {
      onEventCreate(
        { promo_type: selectedCellsData.rowType },
        selectedCellsData.project,
        selectedCellsData.startDate,
        selectedCellsData.endDate
      );
    }
    handleCloseCellMenu();
  }, [selectedCellsData, onEventCreate, handleCloseCellMenu]);

  const handleCreateChannel = useCallback(() => {
    if (selectedCellsData && onChannelCreate) {
      onChannelCreate(
        { type: selectedCellsData.rowType },
        selectedCellsData.project,
        selectedCellsData.startDate
      );
    }
    handleCloseCellMenu();
  }, [selectedCellsData, onChannelCreate, handleCloseCellMenu]);

  // Функция для генерации рекуррентных турниров
  function generateRecurringEvents(event: PromoEvent) {
    // Проверяем валидность дат
    if (!event.start_date || !event.end_date) {
      console.warn('Событие с невалидными датами:', event);
      return [event];
    }

    try {
      if (event.promo_type === 'Кэшбек') {
        // Кэшбек: каждую неделю в тот же день недели и время, на год вперёд
        const result: PromoEvent[] = [];
        let currentStart = dayjs.utc(event.start_date);
        let currentEnd = dayjs.utc(event.end_date);
        
        // Проверяем валидность парсинга дат
        if (!currentStart.isValid() || !currentEnd.isValid()) {
          console.warn('Невалидные даты для кэшбека:', event);
          return [event];
        }
        
        const yearEnd = currentStart.add(1, 'year');
        let iterationCount = 0;
        const maxIterations = 60; // Ограничиваем количество итераций
        
        while (currentStart.isBefore(yearEnd) && iterationCount < maxIterations) {
          result.push({
            ...event,
            start_date: currentStart.toISOString(),
            end_date: currentEnd.toISOString()
          });
          currentStart = currentStart.add(1, 'week');
          currentEnd = currentEnd.add(1, 'week');
          iterationCount++;
        }
        return result;
      }
      
      // Турниры и Лотереи: регулярные — логика одинаковая (подряд без перерывов)
      const start = dayjs.utc(event.start_date);
      const end = dayjs.utc(event.end_date);
      
      // Проверяем валидность парсинга дат
      if (!start.isValid() || !end.isValid()) {
        console.warn('Невалидные даты для турнира/лотереи:', event);
        return [event];
      }
      
      // Вычисляем точную длительность в миллисекундах
      const durationMs = end.diff(start, 'millisecond');
      
      // Проверяем разумность длительности
      if (durationMs <= 0 || durationMs > 365 * 24 * 60 * 60 * 1000) {
        console.warn('Неразумная длительность события:', durationMs, event);
        return [event];
      }
      
      let currentStart = start;
      const yearEnd = start.add(1, 'year');
      const result: PromoEvent[] = [];
      let iterationCount = 0;
      const maxIterations = 100; // Ограничиваем количество итераций
      
      while (currentStart.isBefore(yearEnd) && iterationCount < maxIterations) {
        // Рассчитываем конец события, добавляя точную длительность в миллисекундах
        const currentEnd = currentStart.add(durationMs, 'millisecond');
        
        // Проверяем валидность получившихся дат
        if (!currentStart.isValid() || !currentEnd.isValid()) {
          console.warn('Невалидные даты при генерации рекуррентного события:', currentStart, currentEnd);
          break;
        }
        
        result.push({
          ...event,
          start_date: currentStart.toISOString(),
          end_date: currentEnd.toISOString()
        });
        
        // Следующий турнир начинается сразу после окончания предыдущего (подряд без перерывов)
        currentStart = currentEnd;
        iterationCount++;
      }
      
      return result.length > 0 ? result : [event];
    } catch (error) {
      console.error('Ошибка при генерации рекуррентных событий:', error, event);
      return [event];
    }
  }

  const processedEvents = useMemo(() => {
    let allEvents: PromoEvent[] = [];
    for (const event of events) {
      // Проверяем валидность события перед обработкой
      if (!event || !event.start_date || !event.end_date) {
        console.warn('Пропускаем событие с невалидными данными:', event);
        continue;
      }
      
      // Генерируем рекуррентные события только для основных промо-событий
      // Каналы информирования (info_channels) обрабатываются отдельно и не должны дублироваться
      if (
        (event.promo_type === 'Турниры' && event.promo_kind === 'Регулярные') ||
        (event.promo_type === 'Лотереи' && event.promo_kind === 'Регулярные') ||
        event.promo_type === 'Кэшбек'
      ) {
        // Генерируем рекуррентные события
        const recurringEvents = generateRecurringEvents(event);
        
        // Для каждого рекуррентного события сохраняем каналы только у оригинального события
        recurringEvents.forEach((recurringEvent, index) => {
          if (index === 0) {
            // Первое событие (оригинальное) - сохраняем все каналы
            allEvents.push(recurringEvent);
          } else {
            // Остальные рекуррентные события - убираем каналы информирования
            allEvents.push({
              ...recurringEvent,
              info_channels: []
            });
          }
        });
      } else {
        allEvents.push(event);
      }
    }
    // Фильтруем только события, которые попадают в выбранный месяц
    const monthStart = dayjs.utc().year(selectedYear).month(selectedMonth - 1).startOf('month');
    const monthEnd = monthStart.endOf('month');
    return allEvents.filter(ev => {
      try {
        const evStart = dayjs.utc(ev.start_date);
        const evEnd = dayjs.utc(ev.end_date);
        
        // Проверяем валидность дат
        if (!evStart.isValid() || !evEnd.isValid()) {
          console.warn('Пропускаем событие с невалидными датами при фильтрации:', ev);
          return false;
        }
        
        // Событие попадает в месяц, если оно хотя бы частично пересекается с выбранным месяцем
        return evEnd.isSameOrAfter(monthStart) && evStart.isSameOrBefore(monthEnd);
      } catch (error) {
        console.warn('Ошибка при фильтрации события:', error, ev);
        return false;
      }
    });
  }, [events, selectedMonth, selectedYear]);

  return (
    <>
      <TableContainer 
        component={Paper} 
        onClick={handleTableClick}
        onContextMenu={(e) => {
          const target = e.target as HTMLElement;
          if (!target.closest('.calendar-cell-selectable')) {
            e.preventDefault();
          }
        }}
        sx={{ position: 'relative', backgroundColor: '#161e2f' }}
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
        {selectedProjects.map((project, projectIndex) => {
          const currentTableRef = projectTableRefs.current[project];
          return (
            <Box key={project} sx={{ position: 'relative' }}>
              <ProjectCalendarTable
                project={project}
                projectIndex={projectIndex}
                events={processedEvents}
                days={days}
                daysInMonth={daysInMonth}
                PROMO_TYPES={PROMO_TYPES}
                CHANNEL_TYPES={CHANNEL_TYPES}
                getEventColor={getEventColor}
                getChannelColor={getChannelColor}
                isCellSelected={isCellSelected}
                handleCellClick={handleCellClick}
                handleCellRightClick={handleCellRightClick}
                handleCellMouseDown={handleCellMouseDown}
                handleCellMouseEnter={handleCellMouseEnter}
                getCellKey={getCellKey}
                handleContextMenu={handleContextMenu}
                highlightedEventId={highlightedEventId}
                setHighlightedEventId={setHighlightedEventId}
                getEventTooltipContent={getEventTooltipContent}
                pulseAnimation={pulseAnimation}
                isAdmin={isAdmin}
                tableRef={currentTableRef}
                collapsedPromoTypes={collapsedPromoTypes}
                togglePromoTypeCollapse={togglePromoTypeCollapse}
              />
              <EventBarsLayer
                project={project}
                events={processedEvents}
                days={days}
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
                PROMO_TYPES={PROMO_TYPES}
                getEventColor={getEventColor}
                handleContextMenu={handleContextMenu}
                highlightedEventId={highlightedEventId}
                setHighlightedEventId={setHighlightedEventId}
                getEventTooltipContent={getEventTooltipContent}
                pulseAnimation={pulseAnimation}
                tableRef={currentTableRef}
                projectIndex={projectIndex}
                collapsedPromoTypes={collapsedPromoTypes}
                forcePositionUpdate={forcePositionUpdate}
              />
            </Box>
          );
        })}
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
                onClick={handleDeleteClick} 
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

      {/* Контекстное меню для выделенных ячеек */}
      <Menu
        open={cellContextMenu !== null}
        onClose={handleCloseCellMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          cellContextMenu !== null
            ? { top: cellContextMenu.mouseY, left: cellContextMenu.mouseX }
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
        {selectedCellsData && (
          <>
            {!selectedCellsData.isChannelRow && (
              <MenuItem onClick={handleCreatePromoEvent} sx={{ mt: 1 }}>
                Создать промо-событие
              </MenuItem>
            )}
            {selectedCellsData.isChannelRow && (
              <MenuItem onClick={handleCreateChannel} sx={{ mt: 1 }}>
                Создать информирование
              </MenuItem>
            )}
          </>
        )}
      </Menu>

      {/* Диалог подтверждения удаления */}
      <Dialog open={confirmDeleteOpen} onClose={handleCancelDelete}>
        <DialogTitle>Подтвердите удаление</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Вы уверены, что хотите удалить это событие? Это действие необратимо.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete} disabled={isDeleting}>Отмена</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained" disabled={isDeleting}>
            {isDeleting ? <CircularProgress size={20} sx={{ ml: 1 }} /> : 'Удалить'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CalendarGrid; 