import React, { useState, useEffect, useRef } from 'react';
import { 
  ThemeProvider, 
  createTheme,
  CssBaseline,
  Container,
  Typography,
  Box,
  Button,
  Chip,
  Stack,
  CircularProgress
} from '@mui/material';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import 'dayjs/locale/ru';
import Navigation from './components/general/Navigation';
import Calendar from './pages/Calendar';
import Tasks from './pages/Tasks';
import { LoginForm } from './components/general/LoginForm';
import { AuthState, User, PromoEvent, PromoEventCreate, InfoChannel } from './types';
import axios from 'axios';
import { EventDialog, PromoEventDialog, InfoChannelDialog } from './components/promoCalendar';
import ProfileEditDialog from './components/general/ProfileEditDialog';
import { CHANNEL_TYPES } from './constants/promoTypes';
import dayjs from 'dayjs';

// Настройка темы
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#161E2F', // основной фон
      paper: '#242F49', // фон карточек/контейнеров
    },
    primary: {
      main: '#384358', // header/nav/выделения
      contrastText: '#fff',
    },
    secondary: {
      main: '#FFA586', // акцент/кнопки
      contrastText: '#161E2F',
    },
    error: {
      main: '#B51A2B', // красный акцент
      contrastText: '#fff',
    },
    warning: {
      main: '#FFA586',
      contrastText: '#161E2F',
    },
    info: {
      main: '#384358',
      contrastText: '#fff',
    },
    success: {
      main: '#161E2F',
      contrastText: '#fff',
    },
    text: {
      primary: '#fff',
      secondary: '#FFA586',
      disabled: '#bdbdbd',
    },
    divider: '#FFA586',
  },
  typography: {
    fontFamily: 'Raleway, Arial, sans-serif',
    h1: { fontFamily: 'Raleway Semibold, Raleway, Arial, sans-serif' },
    h2: { fontFamily: 'Raleway Semibold, Raleway, Arial, sans-serif' },
    h3: { fontFamily: 'Raleway Semibold, Raleway, Arial, sans-serif' },
    h4: { fontFamily: 'Raleway Semibold, Raleway, Arial, sans-serif' },
    h5: { fontFamily: 'Raleway Semibold, Raleway, Arial, sans-serif' },
    h6: { fontFamily: 'Raleway Semibold, Raleway, Arial, sans-serif' },
    button: { fontFamily: 'Raleway Semibold, Raleway, Arial, sans-serif' },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
          fontFamily: 'Raleway Semibold, Raleway, Arial, sans-serif',
        },
        containedPrimary: {
          backgroundColor: '#384358',
          color: '#fff',
          '&:hover': { backgroundColor: '#242F49' },
        },
        containedSecondary: {
          backgroundColor: '#FFA586',
          color: '#161E2F',
          '&:hover': { backgroundColor: '#B51A2B' },
        },
        outlinedError: {
          backgroundColor: '#B51A2B',
          color: '#fff',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: '#242F49',
          borderRadius: 16,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: '#384358',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          background: '#FFA586',
          color: '#161E2F',
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: '#FFA586',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          background: '#161E2F',
          color: '#fff',
          borderRadius: 8,
        },
        notchedOutline: {
          borderColor: '#FFA586',
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        icon: {
          color: '#FFA586',
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          background: '#242F49',
          color: '#fff',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          background: '#242F49',
          color: '#fff',
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        root: {
          color: '#fff',
        },
      },
    },
    MuiFormLabel: {
      styleOverrides: {
        root: {
          color: '#FFA586',
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          color: '#B51A2B',
        },
      },
    },
    MuiCircularProgress: {
      styleOverrides: {
        root: {
          color: '#FFA586',
        },
      },
    },
  },
});

// Настройка axios
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
console.log('API_URL:', API_URL); // Для отладки
console.log('NODE_ENV:', process.env.NODE_ENV); // Для отладки

// В продакшене используем полный URL, в разработке - относительный
if (process.env.NODE_ENV === 'production') {
  axios.defaults.baseURL = API_URL;
} else {
  // В разработке используем proxy
  axios.defaults.baseURL = '';
}

axios.defaults.headers.common['Content-Type'] = 'application/json';
axios.defaults.withCredentials = true;

// Константы
export const PROJECTS = ['ROX', 'FRESH', 'SOL', 'JET', 'IZZI', 'VOLNA', 'Legzo', 'STARDA', 'DRIP', 'Monro', '1GO', 'LEX', 'Gizbo', 'Irwin', 'FLAGMAN', 'MARTIN'];

function App() {
  const [events, setEvents] = useState<PromoEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openChannelDialog, setOpenChannelDialog] = useState(false);
  const [openProfileDialog, setOpenProfileDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<PromoEvent | null>(null);
  const [editingChannel, setEditingChannel] = useState<InfoChannel | null>(null);
  
  // Диалоги создания из календаря
  const [openCalendarEventDialog, setOpenCalendarEventDialog] = useState(false);
  const [openCalendarChannelDialog, setOpenCalendarChannelDialog] = useState(false);
  const [calendarEventData, setCalendarEventData] = useState<{
    project: string;
    promo_type: string;
    start_date: string;
    end_date: string;
  } | null>(null);
  const [calendarChannelData, setCalendarChannelData] = useState<{
    project: string;
    type: string;
    start_date: string;
  } | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(6);
  const [selectedYear, setSelectedYear] = useState(2025);
  const [selectedProjects, setSelectedProjects] = useState(PROJECTS);
  const [auth, setAuth] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    isLoading: true
  });

  // Добавляем refs для предотвращения дублирующих запросов
  const authCheckRef = useRef(false);
  const eventsLoadRef = useRef(false);

  // Загрузка событий
  const loadEvents = async (month?: number, year?: number) => {
    // Предотвращаем дублирующие запросы
    if (eventsLoadRef.current) {
      console.log('Запрос loadEvents уже выполняется, пропускаем');
      return;
    }
    
    try {
      eventsLoadRef.current = true;
      setLoading(true);
      
      // Используем переданные параметры или текущие значения состояния
      const targetMonth = month ?? selectedMonth;
      const targetYear = year ?? selectedYear;
      
      // Форматируем месяц в формат YYYY-MM
      const monthStr = `${targetYear}-${targetMonth.toString().padStart(2, '0')}`;
      
      const response = await axios.get(`/api/events?month=${monthStr}`);
      console.log('App: Загружено событий:', response.data.events.length);
      const totalChannels = response.data.events.reduce((count: number, event: any) => 
        count + (event.info_channels?.length || 0), 0);
      console.log('App: Общее количество каналов:', totalChannels);
      setEvents(response.data.events);
    } catch (error) {
      console.error('Ошибка загрузки событий:', error);
    } finally {
      setLoading(false);
      eventsLoadRef.current = false;
    }
  };

  // Обработчик обновления событий
  const handleEventsUpdate = (updatedEvents: PromoEvent[]) => {
    setEvents(updatedEvents);
  };

  // Проверка авторизации при загрузке
  useEffect(() => {
    const checkAuth = async () => {
      // Предотвращаем дублирующие запросы
      if (authCheckRef.current) {
        console.log('Запрос checkAuth уже выполняется, пропускаем');
        return;
      }
      
      try {
        authCheckRef.current = true;
        
        const response = await axios.get('/api/auth/check');
        if (response.data.user) {
          setAuth({
            isAuthenticated: true,
            user: response.data.user,
            isLoading: false
          });
          // Загружаем события только здесь, убираем дублирование
          loadEvents();
        } else {
          setAuth({
            isAuthenticated: false,
            user: null,
            isLoading: false
          });
        }
      } catch (error) {
        console.error('Ошибка проверки авторизации:', error);
        setAuth({
          isAuthenticated: false,
          user: null,
          isLoading: false
        });
      } finally {
        authCheckRef.current = false;
      }
    };

    checkAuth();

    // Cleanup функция для отмены запросов при размонтировании
    return () => {
      // Cleanup не нужен, так как убрали AbortController
    };
  }, []);

  // Загружаем события при изменении месяца или года
  useEffect(() => {
    if (auth.isAuthenticated) {
      loadEvents();
    }
  }, [selectedMonth, selectedYear, auth.isAuthenticated]);

  const handleLogin = (user: User) => {
    setAuth({
      isAuthenticated: true,
      user,
      isLoading: false
    });
    // Загружаем события только здесь, убираем дублирование
    loadEvents();
  };

  const handleLogout = async () => {
    try {
      await axios.post('/api/auth/logout');
      setAuth({
        isAuthenticated: false,
        user: null,
        isLoading: false
      });
    } catch (error) {
      console.error('Ошибка при выходе:', error);
    }
  };

  const handleCreateDialogClose = () => {
    setOpenCreateDialog(false);
  };

  const handleEditDialogClose = () => {
    setOpenEditDialog(false);
    setEditingEvent(null);
  };

  const handleChannelDialogClose = () => {
    setOpenChannelDialog(false);
    setEditingChannel(null);
  };

  const handleProfileDialogClose = () => {
    setOpenProfileDialog(false);
  };

  const handleCalendarEventDialogClose = () => {
    setOpenCalendarEventDialog(false);
    setCalendarEventData(null);
  };

  const handleCalendarChannelDialogClose = () => {
    setOpenCalendarChannelDialog(false);
    setCalendarChannelData(null);
  };

  const handleEventEdit = (event: PromoEvent) => {
    setEditingEvent(event);
    setOpenEditDialog(true);
  };

  const handleEventCreate = () => {
    setOpenCreateDialog(true);
  };

  const handleChannelEdit = (channel: InfoChannel) => {
    setEditingChannel(channel);
    setOpenChannelDialog(true);
  };

  // Обработчики создания из календаря
  const handleCalendarEventCreate = (eventData: any, project: string, startDate: string, endDate: string) => {
    setCalendarEventData({
      project,
      promo_type: eventData.promo_type,
      start_date: startDate,
      end_date: endDate
    });
    setOpenCalendarEventDialog(true);
  };

  const handleCalendarChannelCreate = (channelData: any, project: string, startDate: string) => {
    setCalendarChannelData({
      project,
      type: channelData.type,
      start_date: startDate
    });
    setOpenCalendarChannelDialog(true);
  };

  const handleEventSave = async (eventData: PromoEventCreate): Promise<void> => {
    try {
      let response;
      if (editingEvent) {
        response = await axios.put(`/api/events/${editingEvent.id}`, eventData);
      } else {
        response = await axios.post('/api/events', eventData);
      }
      
      if (response.status === 200 || response.status === 201) {
        // Добавляем небольшую задержку для обновления связанных данных на сервере
        await new Promise(resolve => setTimeout(resolve, 100));
        await loadEvents();
        if (editingEvent) {
          handleEditDialogClose();
        } else {
          handleCreateDialogClose();
        }
      }
    } catch (error) {
      console.error('Ошибка при сохранении события:', error);
      throw error;
    }
  };

  const handleChannelSave = async (channelData: Partial<InfoChannel>): Promise<void> => {
    try {
      let response;
      if (editingChannel) {
        response = await axios.put(`/api/channels/${editingChannel.id}`, {
          ...channelData,
          start_date: channelData.start_date || dayjs.utc().format('YYYY-MM-DDTHH:mm:ss')
        });
      } else {
        response = await axios.post('/api/channels', {
          ...channelData,
          start_date: channelData.start_date || dayjs.utc().format('YYYY-MM-DDTHH:mm:ss')
        });
      }
      
      if (response.status === 200 || response.status === 201) {
        console.log('App: Канал успешно сохранен, обновляем данные...');
        // Добавляем небольшую задержку для обновления связанных данных на сервере
        await new Promise(resolve => setTimeout(resolve, 100));
        await loadEvents();
        handleChannelDialogClose();
      }
    } catch (error) {
      console.error('Ошибка при сохранении канала:', error);
      throw error;
    }
  };

  const handleProfileSave = async (profileData: Partial<User>, userId: string): Promise<void> => {
    try {
      const response = await axios.put(`/api/users/${userId}`, profileData);
      
      if (response.status === 200) {
        // Обновляем информацию о пользователе в состоянии
        setAuth(prev => ({
          ...prev,
          user: { ...prev.user!, ...profileData }
        }));
        handleProfileDialogClose();
      }
    } catch (error) {
      console.error('Ошибка при сохранении профиля:', error);
      throw error;
    }
  };

  const handleEventDelete = async (eventId: string): Promise<void> => {
    try {
      const response = await axios.delete(`/api/events/${eventId}`);
      if (response.status === 200) {
        // Добавляем небольшую задержку для обновления связанных данных на сервере
        await new Promise(resolve => setTimeout(resolve, 100));
        await loadEvents();
      }
    } catch (error) {
      console.error('Ошибка при удалении события:', error);
      throw error;
    }
  };

  // Если проверяем авторизацию, показываем загрузку
  if (auth.isLoading) {
    return (
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <Box
          sx={{
            height: '100vh',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <CircularProgress size={60} />
        </Box>
      </ThemeProvider>
    );
  }

  // Если не авторизован, показываем форму входа
  if (!auth.isAuthenticated) {
    return (
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <LoginForm onLogin={handleLogin} />
      </ThemeProvider>
    );
  }

  // Основной интерфейс приложения
  return (
    <ThemeProvider theme={darkTheme}>
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ru">
      <CssBaseline />
        <Router>
          <Container maxWidth={false} sx={{ py: 1, px: 2 }}>
            {/* Информация о пользователе */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h4" component="h1" >
            График промо
          </Typography>
              <Stack direction="row" spacing={2} alignItems="center">
                <Chip
                  label={`${auth.user?.username} (${auth.user?.role === 'admin' ? 'Администратор' : 'Пользователь'})`}
                  color={auth.user?.role === 'admin' ? 'primary' : 'default'}
                  variant="outlined"
                  size="small"
                />
                <Button
                  variant="outlined" 
                  color="inherit" 
                  onClick={() => setOpenProfileDialog(true)}
                  size="small"
                >
                  Профиль
                </Button>
                <Button
                  variant="outlined" 
                  color="inherit" 
                  onClick={handleLogout}
                  size="small"
                >
                  Выйти
                </Button>
              </Stack>
            </Box>

            {/* Навигационное меню */}
            <Navigation />

            {/* Маршруты */}
            <Routes>
              <Route 
                path="/" 
                element={
                  <Calendar 
                    events={events}
                    loading={loading}
                selectedMonth={selectedMonth} 
                selectedYear={selectedYear} 
                    selectedProjects={selectedProjects}
                    auth={auth}
                    onEventsUpdate={handleEventsUpdate}
                    loadEvents={loadEvents}
                    setSelectedMonth={setSelectedMonth}
                    setSelectedYear={setSelectedYear}
                    setSelectedProjects={setSelectedProjects}
                    setOpenDialog={setOpenCreateDialog}
                    PROJECTS={PROJECTS}
                    handleEventEdit={handleEventEdit}
                    handleChannelEdit={handleChannelEdit}
                    handleEventCreate={handleCalendarEventCreate}
                    handleChannelCreate={handleCalendarChannelCreate}
                  />
                } 
              />
              <Route path="/tasks" element={<Tasks />} />
            </Routes>

            {/* Диалог создания нового события */}
            <EventDialog
              open={openCreateDialog}
              onClose={handleCreateDialogClose}
              onSave={handleEventSave}
              event={null}
              projects={PROJECTS}
            />

            {/* Диалог редактирования события */}
            <PromoEventDialog
              open={openEditDialog}
              onClose={handleEditDialogClose}
              onSave={handleEventSave}
              onDelete={handleEventDelete}
              event={editingEvent}
              projects={PROJECTS}
            />

            {/* Диалог редактирования канала */}
            <InfoChannelDialog
              open={openChannelDialog}
              onClose={handleChannelDialogClose}
              onSave={handleChannelSave}
              channel={editingChannel}
              projects={PROJECTS}
              events={events}
            />

            {/* Диалог создания события из календаря */}
            <EventDialog
              open={openCalendarEventDialog}
              onClose={handleCalendarEventDialogClose}
              onSave={async (eventData) => {
                await handleEventSave(eventData);
                handleCalendarEventDialogClose();
              }}
              event={calendarEventData ? {
                id: '',
                project: calendarEventData.project,
                promo_type: calendarEventData.promo_type,
                promo_kind: '',
                name: '',
                comment: '',
                segments: 'СНГ',
                start_date: calendarEventData.start_date,
                end_date: calendarEventData.end_date,
                link: '',
                info_channels: []
              } as PromoEvent : null}
              projects={PROJECTS}
            />

            {/* Диалог создания канала из календаря */}
            <InfoChannelDialog
              open={openCalendarChannelDialog}
              onClose={handleCalendarChannelDialogClose}
              onSave={async (channelData) => {
                await handleChannelSave(channelData);
                handleCalendarChannelDialogClose();
              }}
              channel={calendarChannelData ? {
                id: '',
                type: calendarChannelData.type,
                project: calendarChannelData.project,
                start_date: calendarChannelData.start_date,
                name: '',
                segments: 'СНГ',
                comment: '',
                link: '',
                promo_id: ''
              } as InfoChannel : null}
              projects={PROJECTS}
              events={events}
            />

            {/* Диалог редактирования профиля */}
            <ProfileEditDialog
              open={openProfileDialog}
              onClose={handleProfileDialogClose}
              onSave={handleProfileSave}
              user={auth.user}
            />
        </Container>
        </Router>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default App; 