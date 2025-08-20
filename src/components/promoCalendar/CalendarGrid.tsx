import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
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
import { FormControl, FormControlLabel, RadioGroup, Radio, Checkbox, Select, InputLabel } from '@mui/material';
import dayjs from '../../utils/dayjs';
import { PromoEvent, InfoChannel, AuthState, DisplayPromoEvent } from '../../types';
import axios from 'axios';
import EditIcon from '@mui/icons-material/Edit';
import {
  PROMO_TYPES,
  CHANNEL_TYPES,
  PROMO_EVENT_COLORS,
  CHANNEL_COLORS
} from '../../constants/promoTypes';
import ProjectCalendarTable from './ProjectCalendarTable';
import EventBarsLayer from './EventBarsLayer';
import { memoizeWithKey, createEventKey } from '../../utils/memoization';

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
  standaloneChannels: InfoChannel[];
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
  standaloneChannels,
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
  
  // Принудительное обновление позиций при изменении событий
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setForcePositionUpdate(prev => prev + 1);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [events]);


  
  // Ref для отслеживания выделенных ячеек без ререндера
  const selectedCellsRef = useRef<Set<string>>(new Set());
  const tableRef = useRef<HTMLTableElement>(null);
  
  // Создаем refs для каждого проекта
  const projectTableRefs = useRef<{[key: string]: React.RefObject<HTMLTableElement>}>({});
  
  // === УЛУЧШЕННАЯ ВИРТУАЛИЗАЦИЯ С ЛОАДЕРАМИ ===
  // Состояние для виртуализации
  const [visibleProjects, setVisibleProjects] = useState<Set<string>>(new Set());
  const [projectVisibility, setProjectVisibility] = useState<{[key: string]: boolean}>({});
  const [loadingProjects, setLoadingProjects] = useState<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const projectElementRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const loadingTimeoutRef = useRef<{[key: string]: NodeJS.Timeout}>({});
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrollTimeRef = useRef<number>(0);
  const observerThrottleRef = useRef<NodeJS.Timeout | null>(null);
  const pendingObserverUpdates = useRef<Set<string>>(new Set());

  // Сбалансированная оптимизация
  const bufferSize = 2; // Увеличиваем буфер
  const maxVisibleProjects = 6; // Увеличиваем лимит видимых проектов
  const renderBatchSize = 2; // Увеличиваем размер пакета рендера

  // Исправленная функция для определения проектов к рендеру
  const getProjectsToRender = useCallback(() => {
    if (visibleProjects.size === 0) {
      // Если ничего не видно, показываем первые 2 проекта
      return new Set(selectedProjects.slice(0, Math.min(2, selectedProjects.length)));
    }

    const visibleIndices = Array.from(visibleProjects)
      .map(project => selectedProjects.indexOf(project))
      .filter(index => index !== -1)
      .sort((a, b) => a - b);

    if (visibleIndices.length === 0) {
      return new Set(selectedProjects.slice(0, Math.min(2, selectedProjects.length)));
    }

    const projectsToRender = new Set<string>();
    
    // Добавляем видимые проекты
    visibleIndices.forEach(index => {
      projectsToRender.add(selectedProjects[index]);
    });

    // Добавляем буфер проектов
    const minIndex = Math.max(0, visibleIndices[0] - bufferSize);
    const maxIndex = Math.min(selectedProjects.length - 1, visibleIndices[visibleIndices.length - 1] + bufferSize);
    
    for (let i = minIndex; i <= maxIndex; i++) {
      projectsToRender.add(selectedProjects[i]);
    }

    // Всегда добавляем последний проект, если он есть
    if (selectedProjects.length > 0) {
      const lastProject = selectedProjects[selectedProjects.length - 1];
      projectsToRender.add(lastProject);
    }

    // Ограничиваем количество, но всегда включаем последний проект
    if (projectsToRender.size > maxVisibleProjects) {
      const projectsArray = Array.from(projectsToRender);
      const lastProject = selectedProjects[selectedProjects.length - 1];
      
      // Убираем последний проект из ограничения, если он есть
      const filteredArray = projectsArray.filter(project => project !== lastProject);
      const limitedArray = filteredArray.slice(0, maxVisibleProjects - 1);
      
      // Добавляем последний проект обратно
      if (lastProject) {
        limitedArray.push(lastProject);
      }
      
      return new Set(limitedArray);
    }

    return projectsToRender;
  }, [visibleProjects, selectedProjects, bufferSize, maxVisibleProjects]);

  const projectsToRender = useMemo(() => getProjectsToRender(), [getProjectsToRender]);

  // Принудительная загрузка последнего проекта через 1 секунду после инициализации
  React.useEffect(() => {
    if (selectedProjects.length > 0) {
      const timer = setTimeout(() => {
        const lastProject = selectedProjects[selectedProjects.length - 1];
        if (!visibleProjects.has(lastProject)) {
          setVisibleProjects(prev => {
            const newSet = new Set(prev);
            newSet.add(lastProject);
            return newSet;
          });
        }
      }, 1000); // Уменьшаем время ожидания
      
      return () => clearTimeout(timer);
    }
  }, [selectedProjects, visibleProjects]);

  // Функция для регистрации ref проекта с лоадером
  const registerProjectRef = useCallback((project: string, element: HTMLDivElement | null) => {
    if (element) {
      projectElementRefs.current.set(project, element);
      // Добавляем к наблюдению
      if (observerRef.current) {
        observerRef.current.observe(element);
      }
    } else {
      projectElementRefs.current.delete(project);
      // Очищаем таймаут при удалении элемента
      if (loadingTimeoutRef.current[project]) {
        clearTimeout(loadingTimeoutRef.current[project]);
        delete loadingTimeoutRef.current[project];
      }
    }
  }, []);

  // Функция для запуска лоадера проекта
  const startProjectLoading = useCallback((project: string) => {
    setLoadingProjects(prev => new Set(prev).add(project));
    
    // Очищаем предыдущий таймаут для этого проекта
    if (loadingTimeoutRef.current[project]) {
      clearTimeout(loadingTimeoutRef.current[project]);
    }
    
    // Устанавливаем таймаут для имитации загрузки
    loadingTimeoutRef.current[project] = setTimeout(() => {
      setLoadingProjects(prev => {
        const newSet = new Set(prev);
        newSet.delete(project);
        return newSet;
      });
      delete loadingTimeoutRef.current[project];
    }, 150); // Уменьшаем время загрузки для более быстрой отзывчивости
  }, []);

  // Инициализация Intersection Observer с оптимизированной логикой
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // Используем requestAnimationFrame для синхронизации с браузером
        requestAnimationFrame(() => {
          setProjectVisibility(prev => {
            const updated = { ...prev };
            entries.forEach(entry => {
              const projectId = entry.target.getAttribute('data-project-id');
              if (projectId) {
                updated[projectId] = entry.isIntersecting;
              }
            });
            return updated;
          });

          setVisibleProjects(prev => {
            const newVisible = new Set(prev);
            let hasChanges = false;
            
            entries.forEach(entry => {
              const projectId = entry.target.getAttribute('data-project-id');
              if (projectId) {
                if (entry.isIntersecting) {
                  if (!prev.has(projectId)) {
                    newVisible.add(projectId);
                    hasChanges = true;
                    startProjectLoading(projectId);
                  }
                } else {
                  if (prev.has(projectId)) {
                    newVisible.delete(projectId);
                    hasChanges = true;
                  }
                }
              }
            });
            
            return hasChanges ? newVisible : prev;
          });
        });
      },
      {
        root: null, // viewport
        rootMargin: '600px 0px', // Увеличиваем margin для более ранней загрузки
        threshold: [0, 0.25, 0.5, 0.75, 1] // Оптимизированные пороги
      }
    );

    observerRef.current = observer;

    return () => {
      observer.disconnect();
      // Очищаем все таймауты при размонтировании
      Object.values(loadingTimeoutRef.current).forEach(timeout => {
        clearTimeout(timeout);
      });
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      if (observerThrottleRef.current) {
        clearTimeout(observerThrottleRef.current);
      }
    };
  }, [selectedProjects]);

  // Принудительная инициализация первых проектов и проверка последнего
  useEffect(() => {
    if (selectedProjects.length > 0 && visibleProjects.size === 0) {
      const initialProjects = selectedProjects.slice(0, 4); // Увеличиваем до 4 проектов
      setVisibleProjects(new Set(initialProjects));
    }
    
    // Специальная проверка для последнего проекта
    if (selectedProjects.length > 0) {
      const lastProject = selectedProjects[selectedProjects.length - 1];
      if (!visibleProjects.has(lastProject)) {
        // Добавляем последний проект, если он еще не видим
        setVisibleProjects(prev => {
          const newSet = new Set(prev);
          newSet.add(lastProject);
          return newSet;
        });
      }
    }
  }, [selectedProjects, visibleProjects.size]);

  // Дополнительная логика для загрузки верхних и нижних проектов
  useEffect(() => {
    if (visibleProjects.size > 0) {
      const visibleArray = Array.from(visibleProjects);
      const visibleIndices = visibleArray.map(project => selectedProjects.indexOf(project)).filter(i => i !== -1);
      
      if (visibleIndices.length > 0) {
        const minVisibleIndex = Math.min(...visibleIndices);
        const maxVisibleIndex = Math.max(...visibleIndices);
        
        // Если самый верхний видимый проект не первый, добавляем проекты выше
        if (minVisibleIndex > 0) {
          const projectsToAdd: string[] = [];
          for (let i = Math.max(0, minVisibleIndex - 3); i < minVisibleIndex; i++) { // Увеличиваем до 3 проектов
            if (!visibleProjects.has(selectedProjects[i])) {
              projectsToAdd.push(selectedProjects[i]);
            }
          }
          
          if (projectsToAdd.length > 0) {
            setVisibleProjects(prev => {
              const newSet = new Set(prev);
              projectsToAdd.forEach(project => newSet.add(project));
              return newSet;
            });
          }
        }
        
        // Проверяем, загружен ли последний проект
        const lastProjectIndex = selectedProjects.length - 1;
        if (lastProjectIndex >= 0 && !visibleProjects.has(selectedProjects[lastProjectIndex])) {
          // Если последний проект не загружен, добавляем его
          setVisibleProjects(prev => {
            const newSet = new Set(prev);
            newSet.add(selectedProjects[lastProjectIndex]);
            return newSet;
          });
        }
      }
    }
  }, [visibleProjects, selectedProjects]);

  // Обработчик скролла для загрузки верхних и нижних проектов
  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout | null = null;
    let lastScrollTime = 0;
    const throttleDelay = 150; // Увеличиваем throttle для лучшей производительности
    
    const handleScroll = () => {
      const now = Date.now();
      
      // Throttling для предотвращения перегрузки
      if (now - lastScrollTime < throttleDelay) {
        return;
      }
      
      lastScrollTime = now;
      
      // Используем requestAnimationFrame для синхронизации с браузером
      requestAnimationFrame(() => {
        const scrollTop = window.scrollY;
        const viewportHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        
        // Если скролл близко к верху, загружаем верхние проекты
        if (scrollTop < 200) {
          const currentVisible = Array.from(visibleProjects);
          const currentIndices = currentVisible.map(project => selectedProjects.indexOf(project)).filter(i => i !== -1);
          
          if (currentIndices.length > 0) {
            const minVisibleIndex = Math.min(...currentIndices);
            const projectsToAdd: string[] = [];
            
            // Добавляем проекты выше текущих видимых
            for (let i = Math.max(0, minVisibleIndex - 4); i < minVisibleIndex; i++) { // Увеличиваем до 4 проектов
              if (!visibleProjects.has(selectedProjects[i])) {
                projectsToAdd.push(selectedProjects[i]);
              }
            }
            
            if (projectsToAdd.length > 0) {
              setVisibleProjects(prev => {
                const newSet = new Set(prev);
                projectsToAdd.forEach(project => newSet.add(project));
                return newSet;
              });
            }
          }
        }
        
              // Если скролл близко к низу, загружаем нижние проекты
      if (scrollTop + viewportHeight > documentHeight - 200) {
        const currentVisible = Array.from(visibleProjects);
        const currentIndices = currentVisible.map(project => selectedProjects.indexOf(project)).filter(i => i !== -1);
        
        if (currentIndices.length > 0) {
          const maxVisibleIndex = Math.max(...currentIndices);
          const projectsToAdd: string[] = [];
          
          // Добавляем проекты ниже текущих видимых
          for (let i = maxVisibleIndex + 1; i < Math.min(selectedProjects.length, maxVisibleIndex + 5); i++) { // Увеличиваем до 5 проектов
            if (!visibleProjects.has(selectedProjects[i])) {
              projectsToAdd.push(selectedProjects[i]);
            }
          }
          
          // Специальная проверка для последнего проекта
          const lastProjectIndex = selectedProjects.length - 1;
          if (lastProjectIndex >= 0 && !visibleProjects.has(selectedProjects[lastProjectIndex])) {
            projectsToAdd.push(selectedProjects[lastProjectIndex]);
          }
          
          if (projectsToAdd.length > 0) {
            setVisibleProjects(prev => {
              const newSet = new Set(prev);
              projectsToAdd.forEach(project => newSet.add(project));
              return newSet;
            });
          }
        }
      }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
    };
  }, [visibleProjects, selectedProjects]);
  
  // Инициализируем refs для выбранных проектов
  selectedProjects.forEach(project => {
    if (!projectTableRefs.current[project]) {
      projectTableRefs.current[project] = React.createRef<HTMLTableElement>();
    }
  });

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // Уведомление
  const [copyStatus, setCopyStatus] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({ open: false, message: '', severity: 'success' });

  // Буфер для вставки (локальный клипборд данных)
  const [clipboardData, setClipboardData] = useState<{
    project: string;
    startDate: string; // ISO
    endDate: string;   // ISO
    includeChannels: boolean;
    items: Array<Record<string, any>>; // события и каналы с исходными ISO-датами
  } | null>(null);
  const [isPasting, setIsPasting] = useState(false);
  const [pasteDialogOpen, setPasteDialogOpen] = useState(false);
  const [pasteTargetProject, setPasteTargetProject] = useState<string | null>(null);

  // CSS стили для выделенных ячеек (добавляем в head)
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .calendar-cell-selected {
        background-color: rgba(33, 150, 243, 0.3) !important;
        outline: 2px solid #2196f3 !important;
        outline-offset: -1px !important;
        position: relative;
        z-index: 1;
        contain: layout style paint;
        will-change: background-color;
      }
      .calendar-cell-selected:hover {
        background-color: rgba(33, 150, 243, 0.4) !important;
      }
      .calendar-cell-selectable {
        cursor: pointer;
        user-select: none;
        transition: background-color 0.15s ease-in-out;
        position: relative;
        contain: layout style paint;
        will-change: background-color;
      }
      .calendar-cell-selectable:hover {
        background-color: rgba(255, 255, 255, 0.1) !important;
      }
      .calendar-cell-selectable:active {
        background-color: rgba(33, 150, 243, 0.2) !important;
      }
      @keyframes pulse {
        0% {
          opacity: 1;
          transform: scale(1);
        }
        50% {
          opacity: 0.7;
          transform: scale(1.05);
        }
        100% {
          opacity: 1;
          transform: scale(1);
        }
      }
      .calendar-table-container {
        contain: layout style;
        will-change: scroll-position;
      }
      .calendar-project-container {
        contain: layout style paint;
        will-change: transform;
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
        <Box sx={{ p: 1, maxWidth: 300, maxHeight: '60vh', overflowY: 'auto' }}>
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
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
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
        <Box sx={{ p: 1, maxWidth: 300, maxHeight: '60vh', overflowY: 'auto' }}>
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
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {promoEvent.comment}
                </Typography>
              </Box>
            )}

            {promoEvent.responsible_name && (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Ответственный
                </Typography>
                <Typography variant="body2">
                  {promoEvent.responsible_name}
                </Typography>
              </Box>
            )}
          </Stack>
        </Box>
      );
    }
  };

  // Функция для проверки выходных и праздников
  const isWeekend = (date: dayjs.Dayjs) => {
    const dayOfWeek = date.day();
    return dayOfWeek === 0 || dayOfWeek === 6 || isHoliday(date.date(), date.month() + 1);
  };

  const isHoliday = (day: number, month: number): boolean => {
    const holiday = HOLIDAYS.find(h => h.month === month);
    return holiday ? holiday.days.includes(day) : false;
  };

  // Получаем первый день месяца
  const firstDay = dayjs().year(selectedYear).month(selectedMonth - 1).startOf('month');
  const daysInMonth = firstDay.daysInMonth();

  // Мемоизированная функция для получения дней месяца с их датами
  const days = useMemo(() => {
    const result = [];
    for (let i = 0; i < daysInMonth; i++) {
      // Используем dayjs.utc() для создания дат в UTC
      const utcDate = dayjs.utc()
        .year(selectedYear)
        .month(selectedMonth - 1)
        .date(i + 1)
        .startOf('day');
      result.push({
        dayOfMonth: i + 1,
        date: utcDate,
        dayOfWeek: utcDate.format('dd').toUpperCase(),
        isWeekend: isWeekend(utcDate)
      });
    }
    return result;
  }, [selectedMonth, selectedYear, daysInMonth]);

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
        // Проверяем, является ли событие рекуррентным
        if (selectedEvent.is_recurring) {
          // Для рекуррентных событий показываем предупреждение вместо редактирования
          console.warn('Рекуррентное событие нельзя редактировать');
          return;
        }
        onEventEdit(selectedEvent);
      }
    }
    handleCloseMenu();
  }, [selectedEvent, onChannelEdit, onEventEdit]);

  // Добавляем функцию для перехода по ссылке
  const handleGoToLink = useCallback(() => {
    if (selectedEvent) {
      let link = '';
      
      if (selectedEvent._channel) {
        // Для канала информирования
        link = selectedEvent._channel.link;
      } else {
        // Для промо-события
        link = selectedEvent.link;
      }
      
      // Проверяем что ссылка существует и не пустая
      if (link && link.trim() !== '') {
        window.open(link, '_blank', 'noopener,noreferrer');
      }
    }
    handleCloseMenu();
  }, [selectedEvent, handleCloseMenu]);

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
          // Добавляем небольшую задержку для обновления связанных данных на сервере
          await new Promise(resolve => setTimeout(resolve, 100));
        } else {
          // Для рекуррентных событий используем occurrence_id, иначе обычный id
          const deleteId = selectedEvent.is_recurring && selectedEvent.occurrence_id 
            ? selectedEvent.occurrence_id.toString() 
            : selectedEvent.id;
          
          console.log('🔍 CalendarGrid handleConfirmDelete - Отладка:', {
            selectedEvent,
            isRecurring: selectedEvent.is_recurring,
            occurrenceId: selectedEvent.occurrence_id,
            deleteId,
            payload: { is_recurring: selectedEvent.is_recurring || false }
          });
          
          // Явно преобразуем в boolean, чтобы избежать undefined
          const isRecurringFlag = Boolean(selectedEvent.is_recurring);
          
          await axios.delete(`/api/events/${deleteId}`, {
            data: { is_recurring: isRecurringFlag }
          });
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

  // Вспомогательный парсер сегментов в массив
  const splitSegmentsToArray = useCallback((seg: any) => {
    if (Array.isArray(seg)) return seg;
    if (!seg) return [];
    return String(seg)
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean);
  }, []);

  // Копирование из контекстного меню события
  const handleCopyEventFromContext = useCallback((includeChannels: boolean) => {
    if (!selectedEvent || selectedEvent._channel) return;
    const sourceEvent = events.find(ev => ev.id === selectedEvent.id);
    if (!sourceEvent) return;

    const items: Array<Record<string, any>> = [];
    items.push({
      kind: 'event',
      id: sourceEvent.id,
      project: sourceEvent.project,
      name: sourceEvent.name || '',
      promo_type: sourceEvent.promo_type || '',
      promo_kind: sourceEvent.promo_kind || '',
      comment: sourceEvent.comment || '',
      segments: splitSegmentsToArray(sourceEvent.segments),
      responsible_name: sourceEvent.responsible_name || '',
      link: sourceEvent.link || '',
      start_date: sourceEvent.start_date,
      end_date: sourceEvent.end_date
    });

    if (includeChannels) {
      (sourceEvent.info_channels || []).forEach(ch => {
        items.push({
          kind: 'channel',
          id: ch.id,
          parent_event_id: sourceEvent.id,
          project: sourceEvent.project,
          name: ch.name || '',
          type: ch.type || '',
          comment: ch.comment || '',
          segments: splitSegmentsToArray(ch.segments),
          link: ch.link || '',
          start_date: ch.start_date
        });
      });
    }

    setClipboardData({
      project: sourceEvent.project,
      startDate: sourceEvent.start_date,
      endDate: sourceEvent.end_date,
      includeChannels,
      items
    });
    setCopyStatus({ open: true, message: includeChannels ? 'Событие (с каналами) скопировано' : 'Событие скопировано', severity: 'success' });
    handleCloseMenu();
  }, [selectedEvent, events, splitSegmentsToArray, handleCloseMenu]);

  // Копирование из контекстного меню канала
  const handleCopyChannelFromContext = useCallback((copyAllForEvent: boolean) => {
    if (!selectedEvent || !selectedEvent._channel) return;
    const ch = selectedEvent._channel;
    const items: Array<Record<string, any>> = [];

    if (copyAllForEvent && ch.promo_id) {
      const parent = events.find(ev => ev.id === ch.promo_id);
      const channels = parent?.info_channels || [];
      channels.forEach(c => {
        items.push({
          kind: 'channel',
          id: c.id,
          parent_event_id: c.promo_id || parent?.id || '',
          project: parent?.project || c.project,
          name: c.name || '',
          type: c.type || '',
          comment: c.comment || '',
          segments: splitSegmentsToArray(c.segments),
          link: c.link || '',
          start_date: c.start_date
        });
      });
    } else {
      items.push({
        kind: 'channel',
        id: ch.id,
        parent_event_id: ch.promo_id || '',
        project: ch.project,
        name: ch.name || '',
        type: ch.type || '',
        comment: ch.comment || '',
        segments: splitSegmentsToArray(ch.segments),
        link: ch.link || '',
        start_date: ch.start_date
      });
    }

    // базовая дата — минимальная дата каналов
    const minStart = items.reduce((min, it) => {
      const d = dayjs.utc(it.start_date);
      return !min || d.isBefore(min) ? d : min;
    }, null as any);

    setClipboardData({
      project: (selectedEvent._channel.project),
      startDate: (minStart ? minStart.startOf('day').format('YYYY-MM-DDTHH:mm:ss') : dayjs.utc().format('YYYY-MM-DDTHH:mm:ss')),
      endDate: (minStart ? minStart.endOf('day').format('YYYY-MM-DDTHH:mm:ss') : dayjs.utc().format('YYYY-MM-DDTHH:mm:ss')),
      includeChannels: true,
      items
    });
    setCopyStatus({ open: true, message: copyAllForEvent ? 'Каналы события скопированы' : 'Канал скопирован', severity: 'success' });
    handleCloseMenu();
  }, [selectedEvent, events, splitSegmentsToArray, handleCloseMenu]);

  // days уже определен выше как useMemo

  // Оптимизированная функция для обновления выделения в DOM без ререндера
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

  // Централизованная функция обработки событий ячеек (Event Delegation)
  const handleCellEvent = useCallback((event: React.MouseEvent, eventType: 'click' | 'rightClick' | 'mouseDown' | 'mouseEnter') => {
    const target = event.target as HTMLElement;
    const cell = target.closest('.calendar-cell-selectable') as HTMLElement;
    
    if (!cell) return;
    
    const cellKey = cell.getAttribute('data-cell-key');
    if (!cellKey) return;

    switch (eventType) {
      case 'click':
        handleCellClick(cellKey, event);
        break;
      case 'rightClick':
        handleCellRightClick(cellKey, event);
        break;
      case 'mouseDown':
        handleCellMouseDown(cellKey, event);
        break;
      case 'mouseEnter':
        handleCellMouseEnter(cellKey, event);
                 break;
     }
   }, []);

  // Обработчик клавиатуры для отмены выделения по Escape
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && selectedCellsRef.current.size > 0) {
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

    // Если мы в процессе drag selection, не обрабатываем клик
    if (isDragging) {
      return;
    }

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
  }, [selectionStart, updateCellSelection, isDragging]);

  // Восстановление выделения после ререндера
  React.useEffect(() => {
    // Восстанавливаем CSS классы выделения для всех выделенных ячеек
    selectedCellsRef.current.forEach(cellKey => {
      const cell = document.querySelector(`[data-cell-key="${cellKey}"]`);
      if (cell && !cell.classList.contains('calendar-cell-selected')) {
        cell.classList.add('calendar-cell-selected');
      }
    });
  });

  // Отдельный обработчик для правого клика (контекстное меню)
  const handleCellRightClick = useCallback((cellKey: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    // Если кликнули ПКМ по выделенной ячейке или есть выделенные ячейки
    if (selectedCellsRef.current.has(cellKey) || selectedCellsRef.current.size > 0) {
      // Если кликнули по не выделенной ячейке, но есть другие выделенные - добавляем эту ячейку к выделению
      if (!selectedCellsRef.current.has(cellKey)) {
        selectedCellsRef.current.add(cellKey);
        updateCellSelection(cellKey, true);
      }
      
      handleCellContextMenu(event);
    } else {
      // Если нет выделенных ячеек, выделяем эту и показываем меню
      selectedCellsRef.current.add(cellKey);
      updateCellSelection(cellKey, true);
      setSelectionStart(cellKey);
      handleCellContextMenu(event);
    }
  }, [updateCellSelection, handleCellContextMenu]);

  const handleCellMouseDown = useCallback((cellKey: string, event: React.MouseEvent) => {
    if (event.button === 0) { // Левая кнопка мыши
      event.preventDefault();
      event.stopPropagation();
      setIsSelecting(true);
      
      if (!event.ctrlKey && !event.metaKey && !event.shiftKey) {
        // Очищаем предыдущее выделение при начале drag
        selectedCellsRef.current.forEach(key => updateCellSelection(key, false));
        selectedCellsRef.current.clear();
        
        setSelectionStart(cellKey);
        // Начинаем drag selection
        setIsDragging(true);
        setDragStartCell(cellKey);
        
        // Сразу выделяем начальную ячейку
        selectedCellsRef.current.add(cellKey);
        updateCellSelection(cellKey, true);
      }
    }
  }, [updateCellSelection]);

  // Обработчик для drag selection при наведении мыши
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
  }, [isDragging, dragStartCell, updateCellSelection, getCellKey]);

  // Обработчик завершения drag selection
  const handleMouseUp = useCallback((event: MouseEvent) => {
    if (isDragging) {
      setIsDragging(false);
      setDragStartCell(null);
      setIsSelecting(false);
    }
  }, [isDragging]);

  // Глобальный обработчик mousemove для drag selection с throttling
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (isDragging && dragStartCell && event.buttons === 1) {
      // Используем requestAnimationFrame для оптимизации
      requestAnimationFrame(() => {
        // Находим элемент под курсором
        const target = event.target as HTMLElement;
        const cell = target.closest('.calendar-cell-selectable') as HTMLElement;
        
        if (cell) {
          const cellKey = cell.getAttribute('data-cell-key');
          if (cellKey && cellKey !== dragStartCell) {
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
        }
      });
    }
  }, [isDragging, dragStartCell, updateCellSelection, getCellKey]);

  // Добавляем глобальные обработчики
  React.useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousemove', handleMouseMove);
    
    // Предотвращаем выделение текста во время drag
    const preventSelection = (e: Event) => {
      if (isDragging) {
        e.preventDefault();
      }
    };
    
    document.addEventListener('selectstart', preventSelection);
    document.addEventListener('dragstart', preventSelection);
    
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('selectstart', preventSelection);
      document.removeEventListener('dragstart', preventSelection);
    };
  }, [handleMouseUp, handleMouseMove, isDragging]);

  const isCellSelected = useCallback((cellKey: string) => {
    return selectedCellsRef.current.has(cellKey);
  }, []);

  

  // Очистка выделения при клике вне ячеек
  const handleTableClick = useCallback((event: React.MouseEvent) => {
    // Обрабатываем только левый клик
    if (event.button !== 0) return;
    
    // Если мы в процессе drag selection, не очищаем выделение
    if (isDragging) {
      return;
    }
    
    // Очищаем выделение только если клик был не по ячейке и не по контекстному меню
    const target = event.target as HTMLElement;
    if (!target.closest('.calendar-cell-selectable') && 
        !target.closest('[role="menu"]') && 
        !target.closest('.MuiPaper-root')) {
      selectedCellsRef.current.forEach(key => updateCellSelection(key, false));
      selectedCellsRef.current.clear();
      setSelectionStart(null);
    }
  }, [updateCellSelection, isDragging]);

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

  // Построение исходных элементов (сырых) для копирования и последующей вставки
  const buildIntervalCopyItems = useCallback((
    project: string,
    rowType: string,
    startDate: string,
    endDate: string,
    includeChannels: boolean,
    isChannelRow: boolean
  ) => {
    const start = dayjs.utc(startDate);
    const end = dayjs.utc(endDate);

    const inInterval = (s: string, e?: string) => {
      const startDt = dayjs.utc(s);
      const endDt = e ? dayjs.utc(e) : startDt;
      return !(endDt.isBefore(start) || startDt.isAfter(end));
    };

    const normalizeSegments = (seg: any) => Array.isArray(seg) ? seg : (seg ? [seg] : []);

    const eventItems = events
      .filter(ev => !isChannelRow && ev.project === project && ev.promo_type === rowType && inInterval(ev.start_date, ev.end_date))
      .map(ev => ({
        kind: 'event',
        id: ev.id,
        project: ev.project,
        name: ev.name || '',
        promo_type: ev.promo_type || '',
        promo_kind: ev.promo_kind || '',
        comment: ev.comment || '',
        segments: normalizeSegments(ev.segments),
        responsible_name: ev.responsible_name || '',
        link: ev.link || '',
        start_date: ev.start_date, // ISO
        end_date: ev.end_date     // ISO
      }));

    const items: Array<Record<string, any>> = [...eventItems];

    if (!isChannelRow && includeChannels) {
      // Только каналы, связанные с выбранными событиями
      events
        .filter(ev => ev.project === project && ev.promo_type === rowType && inInterval(ev.start_date, ev.end_date))
        .forEach(ev => {
          (ev.info_channels || []).forEach(ch => {
            if (inInterval(ch.start_date)) {
              items.push({
                kind: 'channel',
                id: ch.id,
                parent_event_id: ev.id,
                project: ev.project,
                name: ch.name || '',
                type: ch.type || '',
                comment: ch.comment || '',
                segments: normalizeSegments(ch.segments),
                link: ch.link || '',
                start_date: ch.start_date // ISO
              });
            }
          });
        });
    }

    // Копирование из строки каналов: берём только каналы выбранного типа в интервале
    if (isChannelRow) {
      // Каналы у событий соответствующего типа
      events
        .filter(ev => ev.project === project)
        .forEach(ev => {
          (ev.info_channels || [])
            .filter(ch => ch.type === rowType && inInterval(ch.start_date))
            .forEach(ch => {
              items.push({
                kind: 'channel',
                id: ch.id,
                parent_event_id: ev.id,
                project: ev.project,
                name: ch.name || '',
                type: ch.type || '',
                comment: ch.comment || '',
                segments: normalizeSegments(ch.segments),
                link: ch.link || '',
                start_date: ch.start_date
              });
            });
        });
      // Плюс standalone-каналы соответствующего типа
      standaloneChannels
        .filter(ch => ch.project === project && ch.type === rowType && inInterval(ch.start_date))
        .forEach(ch => {
          items.push({
            kind: 'channel',
            id: ch.id,
            parent_event_id: '',
            project: ch.project,
            name: ch.name || '',
            type: ch.type || '',
            comment: ch.comment || '',
            segments: normalizeSegments(ch.segments),
            link: ch.link || '',
            start_date: ch.start_date
          });
        });
    }

    return items;
  }, [events, standaloneChannels]);

  // Копирование элементов в локальный буфер для последующей вставки
  const deriveSelectionDataFromRef = useCallback(() => {
    if (selectedCellsRef.current.size === 0) return null;
    const cellKeys = Array.from(selectedCellsRef.current);
    const firstCellKey = cellKeys[0];
    const parts = firstCellKey.split('-');
    const project = parts[0];
    const rowType = parts.slice(1, -1).join('-');
    const { startDate, endDate } = getSelectedCellsDates(cellKeys);
    const isChannelRow = CHANNEL_TYPES.some(type => type === rowType);
    return { project, rowType, startDate, endDate, isChannelRow };
  }, [getSelectedCellsDates]);

  const handleCopyForPaste = useCallback((withChannels: boolean) => {
    const base = selectedCellsData || deriveSelectionDataFromRef();
    if (!base) return;
    const items = buildIntervalCopyItems(
      base.project,
      base.rowType,
      base.startDate,
      base.endDate,
      withChannels,
      base.isChannelRow
    );
    setClipboardData({
      project: base.project,
      startDate: base.startDate,
      endDate: base.endDate,
      includeChannels: withChannels,
      items
    });
    setCopyStatus({ open: true, message: withChannels ? 'Диапазон (с каналами) скопирован' : 'Диапазон (без каналов) скопирован', severity: 'success' });
    handleCloseCellMenu();
  }, [selectedCellsData, deriveSelectionDataFromRef, buildIntervalCopyItems, handleCloseCellMenu]);

  // Вставка (создание новых сущностей) со сдвигом дат
  const handlePasteInterval = useCallback(async (overrideProject?: string) => {
    const base = selectedCellsData || deriveSelectionDataFromRef();
    if (!base || !clipboardData) return;
    try {
      setIsPasting(true);
      const sourceStart = dayjs.utc(clipboardData.startDate).startOf('day');
      const targetStart = dayjs.utc(base.startDate).startOf('day');
      const deltaDays = targetStart.diff(sourceStart, 'day');

      // 1) Создаем события и собираем маппинг старыйId->новыйId
      const idMap = new Map<string, string>();

      for (const item of clipboardData.items) {
        if (item.kind !== 'event') continue;
        const newStart = dayjs.utc(item.start_date).add(deltaDays, 'day').format('YYYY-MM-DDTHH:mm:ss');
        const newEnd = dayjs.utc(item.end_date).add(deltaDays, 'day').format('YYYY-MM-DDTHH:mm:ss');
        
        // Собираем каналы для этого события
        const eventChannels = clipboardData.items
          .filter(ch => ch.kind === 'channel' && ch.parent_event_id === item.id)
          .map(ch => ({
            type: ch.type,
            name: ch.name,
            comment: ch.comment || '',
            segments: Array.isArray(ch.segments) && ch.segments.length
              ? ch.segments.join(', ')
              : (ch.segments || 'СНГ'),
            link: ch.link || '',
            start_date: dayjs.utc(ch.start_date).add(deltaDays, 'day').format('YYYY-MM-DDTHH:mm:ss')
          }));

        const payload: any = {
          project: [overrideProject || base.project],
          name: item.name,
          promo_type: item.promo_type,
          promo_kind: item.promo_kind || '',
          comment: item.comment || '',
          segments: Array.isArray(item.segments) && item.segments.length
            ? item.segments.join(', ')
            : (item.segments || 'СНГ'),
          start_date: newStart,
          end_date: newEnd,
          link: item.link || '',
          info_channels: eventChannels
        };

        try {
          const res = await axios.post('/api/events', payload);
          const newId = res?.data?.id || res?.data?.event?.id || '';
          if (newId) {
            idMap.set(item.id, newId);
          }
        } catch (e) {
          console.error('Ошибка создания события при вставке', e, payload);
        }
      }

      // 2) Каналы уже созданы вместе с событиями через info_channels

      await new Promise(r => setTimeout(r, 100));
      await loadEvents();
      setCopyStatus({ open: true, message: 'Вставка завершена', severity: 'success' });
    } catch (err) {
      console.error(err);
      setCopyStatus({ open: true, message: 'Ошибка при вставке', severity: 'error' });
    } finally {
      setIsPasting(false);
      handleCloseCellMenu();
    }
  }, [selectedCellsData, deriveSelectionDataFromRef, clipboardData, loadEvents, handleCloseCellMenu]);

  // Диалог выбора проекта для вставки
  const handleOpenPasteDialog = useCallback(() => {
    const base = selectedCellsData || deriveSelectionDataFromRef();
    if (!base || !clipboardData) return;
    setPasteTargetProject(base.project);
    setPasteDialogOpen(true);
    handleCloseCellMenu();
  }, [selectedCellsData, deriveSelectionDataFromRef, clipboardData, handleCloseCellMenu]);

  const processedEvents = useMemo(() => {
    // Просто возвращаем события как есть, без генерации рекуррентных событий
    const monthStart = dayjs.utc().year(selectedYear).month(selectedMonth - 1).startOf('month');
    const monthEnd = monthStart.endOf('month');
    
    return events.map(ev => {
      // Теперь выводим все каналы события, не фильтруем по месяцу
      if (ev.info_channels && ev.info_channels.length > 0) {
        return {
          ...ev,
          info_channels: ev.info_channels
        };
      }
      
      return ev;
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
        className="calendar-table-container"
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
        {selectedProjects.map((project: string, projectIndex: number) => {
          const currentTableRef = projectTableRefs.current[project];
          const shouldRender = projectsToRender.has(project);
          const isLoading = loadingProjects.has(project);
          const isVisible = visibleProjects.has(project);
          

          
          return (
            <div
              key={project}
              data-project-id={project}
              ref={(el: HTMLDivElement | null) => registerProjectRef(project, el)}
              className="calendar-project-container"
              style={{ 
                minHeight: shouldRender ? 'auto' : '400px', // Placeholder высота для невидимых
                position: 'relative'
              }}
            >
              {shouldRender ? (
                <Box sx={{ position: 'relative' }}>
                  <ProjectCalendarTable
                    project={project}
                    projectIndex={projectIndex}
                    events={processedEvents}
                    standaloneChannels={standaloneChannels}
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
                    standaloneChannels={standaloneChannels}
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
              ) : (
                // Упрощенный placeholder для максимальной производительности
                <Box 
                  sx={{ 
                    height: '400px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    backgroundColor: '#1a2332',
                    borderRadius: 2,
                    border: '1px solid #333a56',
                    opacity: 0.3
                  }}
                >
                  {isLoading ? (
                    <CircularProgress size={30} sx={{ color: '#2196f3' }} />
                  ) : (
                    <Typography variant="body2" sx={{ color: '#666' }}>
                      {project}
                      {project === selectedProjects[selectedProjects.length - 1] && (
                        <Box sx={{ mt: 1 }}>
                          <CircularProgress size={20} sx={{ color: '#2196f3' }} />
                        </Box>
                      )}
                    </Typography>
                  )}
                </Box>
              )}
            </div>
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
            <MenuItem 
              onClick={handleEdit} 
              sx={{ mt: 1 }}
              disabled={selectedEvent.is_recurring}
            >
              {selectedEvent.is_recurring ? 'Редактировать (недоступно для рекуррентных событий)' : 'Редактировать'}
            </MenuItem>
            
            {/* Копирование из контекстного меню */}
            {!selectedEvent._channel && (
              <>
                <MenuItem onClick={() => handleCopyEventFromContext(true)}>Копировать событие (с каналами)</MenuItem>
                <MenuItem onClick={() => handleCopyEventFromContext(false)}>Копировать событие</MenuItem>
              </>
            )}
            {selectedEvent._channel && (
              <>
                <MenuItem onClick={() => handleCopyChannelFromContext(false)}>Копировать канал</MenuItem>
                <MenuItem onClick={() => handleCopyChannelFromContext(true)}>Копировать все каналы этого события</MenuItem>
              </>
            )}

            {/* Добавляем пункт "Перейти по ссылке" */}
            <MenuItem 
              onClick={handleGoToLink}
              disabled={
                selectedEvent._channel 
                  ? !selectedEvent._channel.link || selectedEvent._channel.link.trim() === ''
                  : !selectedEvent.link || selectedEvent.link.trim() === ''
              }
              sx={{ 
                opacity: (
                  selectedEvent._channel 
                    ? !selectedEvent._channel.link || selectedEvent._channel.link.trim() === ''
                    : !selectedEvent.link || selectedEvent.link.trim() === ''
                ) ? 0.5 : 1
              }}
            >
              Перейти по ссылке
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
            <Divider sx={{ my: 0.5 }} />
            
            <MenuItem onClick={() => handlePasteInterval()} disabled={!clipboardData || isPasting}>
              {isPasting ? 'Вставка...' : 'Вставить сюда'}
            </MenuItem>
            
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

      {/* Диалог вставки в другой проект */}
      <Dialog open={pasteDialogOpen} onClose={() => setPasteDialogOpen(false)}>
        <DialogTitle>Вставить в проект</DialogTitle>
        <DialogContent sx={{ minWidth: 360 }}>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel id="paste-project-label">Проект</InputLabel>
            <Select
              labelId="paste-project-label"
              label="Проект"
              native
              value={pasteTargetProject || ''}
              onChange={(e) => setPasteTargetProject((e.target as HTMLSelectElement).value)}
            >
              {/* @ts-ignore native select */}
              <option value="" disabled>Выберите проект</option>
              {selectedProjects.map((p) => (
                // @ts-ignore native option
                <option key={p} value={p}>{p}</option>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasteDialogOpen(false)}>Отмена</Button>
          <Button
            variant="contained"
            disabled={!pasteTargetProject || isPasting}
            onClick={async () => {
              if (!pasteTargetProject) return;
              await handlePasteInterval(pasteTargetProject);
              setPasteDialogOpen(false);
            }}
          >
            {isPasting ? 'Вставка...' : 'Вставить'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Уведомление о результате копирования */}
      <Snackbar
        open={copyStatus.open}
        autoHideDuration={3000}
        onClose={() => setCopyStatus({ ...copyStatus, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setCopyStatus({ ...copyStatus, open: false })} severity={copyStatus.severity} sx={{ width: '100%' }}>
          {copyStatus.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default CalendarGrid; 