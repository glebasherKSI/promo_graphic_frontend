import React, { useState, useEffect } from 'react';
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
import Navigation from './components/Navigation';
import Calendar from './pages/Calendar';
import Tasks from './pages/Tasks';
import { LoginForm } from './components/LoginForm';
import { AuthState, User, PromoEvent, PromoEventCreate, InfoChannel } from './types';
import axios from 'axios';
import EventDialog from './components/EventDialog';
import PromoEventDialog from './components/PromoEventDialog';
import InfoChannelDialog from './components/InfoChannelDialog';
import { CHANNEL_TYPES } from './constants/promoTypes';
import dayjs from 'dayjs';

// Настройка темы
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#24243e',
      paper: '#333a56',
    },
    primary: {
      main: '#5A7684',
    },
    text: {
      primary: '#eff0f1',
    },
  },
});

// Настройка axios
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
axios.defaults.baseURL = API_URL;
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
  const [editingEvent, setEditingEvent] = useState<PromoEvent | null>(null);
  const [editingChannel, setEditingChannel] = useState<InfoChannel | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(6);
  const [selectedYear, setSelectedYear] = useState(2025);
  const [selectedProjects, setSelectedProjects] = useState(PROJECTS);
  const [auth, setAuth] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    isLoading: true
  });

  // Загрузка событий
  const loadEvents = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/events');
      setEvents(response.data.events);
    } catch (error) {
      console.error('Ошибка загрузки событий:', error);
    } finally {
      setLoading(false);
    }
  };

  // Обработчик обновления событий
  const handleEventsUpdate = (updatedEvents: PromoEvent[]) => {
    setEvents(updatedEvents);
  };

  // Проверка авторизации при загрузке
  useEffect(() => {
    const checkAuth = async () => {
    try {
        const response = await axios.get('/api/auth/check');
        if (response.data.user) {
          setAuth({
            isAuthenticated: true,
            user: response.data.user,
            isLoading: false
          });
          loadEvents(); // Загружаем события после успешной авторизации
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
      }
    };

    checkAuth();
  }, []);

  // Загрузка событий при изменении авторизации
  useEffect(() => {
    if (auth.isAuthenticated) {
      loadEvents();
    }
  }, [auth.isAuthenticated]);

  const handleLogin = (user: User) => {
    setAuth({
      isAuthenticated: true,
      user,
      isLoading: false
    });
    loadEvents(); // Загружаем события после успешного входа
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

  const handleEventSave = async (eventData: PromoEventCreate): Promise<void> => {
    try {
      let response;
      if (editingEvent) {
        response = await axios.put(`/api/events/${editingEvent.id}`, eventData);
      } else {
        response = await axios.post('/api/events', eventData);
      }
      
      if (response.status === 200 || response.status === 201) {
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
          start_date: channelData.start_date || dayjs().format('YYYY-MM-DDTHH:mm:ss')
        });
      } else {
        response = await axios.post('/api/channels', {
          ...channelData,
          start_date: channelData.start_date || dayjs().format('YYYY-MM-DDTHH:mm:ss')
        });
      }
      
      if (response.status === 200 || response.status === 201) {
        await loadEvents();
        handleChannelDialogClose();
      }
    } catch (error) {
      console.error('Ошибка при сохранении канала:', error);
      throw error;
    }
  };

  const handleEventDelete = async (eventId: string): Promise<void> => {
    try {
      const response = await axios.delete(`/api/events/${eventId}`);
      if (response.status === 200) {
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
              <Typography variant="h4" component="h1">
            Промо-календарь
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
            />
        </Container>
        </Router>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default App; 