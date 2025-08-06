import React, { useState } from 'react';
import { 
  Typography, 
  Container, 
  Box, 
  TextField, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem,
  Grid,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Link,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Alert
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import { TASK_PROMO_TYPES, TASK_PROJECTS, TASK_NAME_MAPPING } from '../constants/promoTypes';
import TournamentFields from '../components/createTasks/TournamentFields';
import ActionFields from '../components/createTasks/ActionFields';
import SngDepositFields from '../components/createTasks/DepositFields';
import GeoDepositFields from '../components/createTasks/GeoDepositFields';
import InfoFields from '../components/general/InfoFields';
import NoDepositFields from '../components/createTasks/NoDepositFields';
import PromoCheckboxes from '../components/createTasks/PromoCheckboxes';
import axios from 'axios';

interface TaskResponse {
  success: boolean;
  error: string | null;
  main_link?: string;
  all_links?: {
    [key: string]: {
      link: string;
      key: string;
    };
  };
  message: string;
}

const Tasks: React.FC = () => {
  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs('2025-07-17T00:00'));
  const [endDate, setEndDate] = useState<Dayjs | null>(dayjs('2025-07-17T00:00'));
  const [promoType, setPromoType] = useState<string>('');
  const [project, setProject] = useState<string>('');
  const [checkedTasks, setCheckedTasks] = useState<string[]>([]);
  const [promoFields, setPromoFields] = useState<{ [key: string]: string }>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [taskResponse, setTaskResponse] = useState<TaskResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Функция для извлечения чистой ссылки из формата Atlassian
  const extractCleanLink = (atlassianLink: string): string => {
    const match = atlassianLink.match(/\[(https:\/\/[^\|]+)/);
    return match ? match[1] : atlassianLink;
  };

  const handleCreateTask = async () => {
    // Валидация обязательных полей
    const validationErrors: string[] = [];
    
    if (!promoType) {
      validationErrors.push('Выберите тип промо');
    }
    
    if (!project) {
      validationErrors.push('Выберите проект');
    }
    
    if (validationErrors.length > 0) {
      setTaskResponse({
        success: false,
        error: validationErrors.join(', '),
        message: 'Заполните все обязательные поля'
      });
      setModalOpen(true);
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Конвертируем русские названия задач в английские
      const convertedTasks = checkedTasks.map(task => 
        TASK_NAME_MAPPING[task as keyof typeof TASK_NAME_MAPPING] || task
      );

      // Выносим depositType из promoFields на верхний уровень
      const { depositType, ...fieldsWithoutDepositType } = promoFields;
      
      const taskData = {
        startDate: startDate?.format('YYYY-MM-DD HH:mm:ss'),
        endDate: endDate?.format('YYYY-MM-DD HH:mm:ss'),
        promoType,
        project,
        checkedTasks: convertedTasks,
        depositType,
        promoFields: fieldsWithoutDepositType
      };

      console.log('Отправляем данные на бэкенд:', taskData);
      
      try {
        const response = await axios.post('/api/promo-fields/geodep', taskData);
        const result: TaskResponse = response.data;
        console.log('Задача успешно создана:', result);
        setTaskResponse(result);
        setModalOpen(true);
      } catch (error: any) {
        console.error('Ошибка при создании задачи:', error);
        const errorData = error.response?.data || {};
        setTaskResponse({
          success: false,
          error: errorData.error || 'Ошибка при создании задачи',
          message: errorData.message || 'Произошла ошибка при создании задачи'
        });
        setModalOpen(true);
      }
    } catch (error) {
      console.error('Ошибка при отправке данных:', error);
      setTaskResponse({
        success: false,
        error: 'Ошибка сети',
        message: 'Не удалось отправить данные на сервер'
      });
      setModalOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setTaskResponse(null);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h2" component="h1" sx={{ mb: 3 }}>
          Задачи
        </Typography>
      </Box>
      
      <Paper sx={{ p: 3, backgroundColor: 'background.paper' }}>
        <Grid container spacing={3}>
          {/* Левая колонка */}
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Поле выбора даты начала */}
              <Box>
                <Typography variant="body2" sx={{ mb: 1, color: 'text.primary' }}>
                  Выберите дату начала
                </Typography>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DateTimePicker
                    value={startDate}
                    onChange={(newValue) => setStartDate(newValue)}
                    ampm={false}
                    format="DD-MM-YYYY HH:mm"
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        sx: {
                          '& .MuiOutlinedInput-root': {
                            backgroundColor: 'grey.800',
                            '& fieldset': {
                              borderColor: 'grey.600',
                            },
                            '&:hover fieldset': {
                              borderColor: 'grey.500',
                            },
                          },
                        }
                      }
                    }}
                  />
                </LocalizationProvider>
              </Box>

              {/* Дропдаун типа промо */}
              <Box>
                <Typography variant="body2" sx={{ mb: 1, color: 'text.primary' }}>
                  Укажите тип промо <span style={{ color: '#f44336' }}>*</span>
                </Typography>
                <FormControl fullWidth>
                  <Select
                    value={promoType}
                    onChange={(e) => setPromoType(e.target.value)}
                    displayEmpty
                    sx={{
                      backgroundColor: 'grey.800',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: !promoType ? '#f44336' : 'grey.600',
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: !promoType ? '#f44336' : 'grey.500',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: !promoType ? '#f44336' : 'primary.main',
                      },
                    }}
                  >
                    <MenuItem value="">
                      <em>Выберите тип промо</em>
                    </MenuItem>
                    {TASK_PROMO_TYPES.map((type) => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Box>
          </Grid>

          {/* Правая колонка */}
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Поле выбора даты окончания */}
              <Box>
                <Typography variant="body2" sx={{ mb: 1, color: 'text.primary' }}>
                  Выберите дату окончания
                </Typography>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DateTimePicker
                    value={endDate}
                    onChange={(newValue) => setEndDate(newValue)}
                    ampm={false}
                    format="DD-MM-YYYY HH:mm"
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        sx: {
                          '& .MuiOutlinedInput-root': {
                            backgroundColor: 'grey.800',
                            '& fieldset': {
                              borderColor: 'grey.600',
                            },
                            '&:hover fieldset': {
                              borderColor: 'grey.500',
                            },
                          },
                        }
                      }
                    }}
                  />
                </LocalizationProvider>
              </Box>

              {/* Дропдаун выбора проекта */}
              <Box>
                <Typography variant="body2" sx={{ mb: 1, color: 'text.primary' }}>
                  Выберите проект <span style={{ color: '#f44336' }}>*</span>
                </Typography>
                <FormControl fullWidth>
                  <Select
                    value={project}
                    onChange={(e) => setProject(e.target.value)}
                    displayEmpty
                    sx={{
                      backgroundColor: 'grey.800',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: !project ? '#f44336' : 'grey.600',
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: !project ? '#f44336' : 'grey.500',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: !project ? '#f44336' : 'primary.main',
                      },
                    }}
                  >
                    <MenuItem value="">
                      <em>Выберите проект</em>
                    </MenuItem>
                    {TASK_PROJECTS.map((project) => (
                      <MenuItem key={project} value={project}>
                        {project}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Box>
          </Grid>
        </Grid>

        {/* Кнопка создания в том же блоке */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 3 }}>
          <Button
            variant="contained"
            size="large"
            onClick={handleCreateTask}
            disabled={isLoading}
            sx={{
              px: 4,
              py: 1.5,
              fontSize: '1.1rem',
              backgroundColor: 'primary.main',
              '&:hover': {
                backgroundColor: 'primary.dark',
              },
              '&:disabled': {
                backgroundColor: 'grey.600',
                color: 'grey.400'
              }
            }}
          >
            {isLoading ? 'Создание...' : 'Создать'}
          </Button>
          
          {/* Лоадер */}
          {isLoading && (
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <CircularProgress 
                size={40} 
                sx={{ 
                  color: 'primary.main',
                  mb: 1
                }} 
              />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Создаем задачи...
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>

      {/* Условное отображение полей и чекбоксов в зависимости от выбранного типа промо */}
      {promoType && (
        <Box sx={{ display: 'flex', gap: 3, mt: 3 }}>
          {/* Левая колонка с полями */}
          <Box sx={{ flex: 1 }}>
            {promoType === 'Турнир' && <TournamentFields />}
            {promoType === 'Акция' && <ActionFields />}
            {promoType === 'ГЕО-депозитка' && <GeoDepositFields onFieldsChange={setPromoFields} />}
            {promoType === 'СНГ-депозитка' && <SngDepositFields />}
            {promoType === 'Информирование' && <InfoFields />}
            {promoType === 'Бездеп' && <NoDepositFields />}
          </Box>
          
          {/* Правая колонка с чекбоксами */}
          <Box sx={{ width: 300 }}>
            <PromoCheckboxes promoType={promoType} onCheckboxChange={setCheckedTasks} />
          </Box>
        </Box>
      )}

      {/* Модальное окно с результатами создания задач */}
      <Dialog 
        open={modalOpen} 
        onClose={handleCloseModal}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: 'background.paper',
            color: 'text.primary'
          }
        }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h5" component="h2">
            {taskResponse?.success ? 'Задачи успешно созданы' : 'Ошибка создания задач'}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {taskResponse && (
            <Box>
              {taskResponse.success ? (
                <>
                  <Typography variant="body1" sx={{ mb: 3, color: '#4caf50', fontWeight: 500 }}>
                    {taskResponse.message}
                  </Typography>
                  
                  {/* Основная ссылка */}
                  {taskResponse.main_link && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="h6" sx={{ mb: 1, color: '#ffffff', fontWeight: 500 }}>
                        Основная задача:
                      </Typography>
                      <Link 
                        href={taskResponse.main_link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        sx={{ 
                          fontSize: '1.1rem',
                          color: '#90caf9',
                          textDecoration: 'none',
                          '&:hover': {
                            textDecoration: 'underline',
                            color: '#bbdefb'
                          }
                        }}
                      >
                        {taskResponse.main_link}
                      </Link>
                    </Box>
                  )}

                  {/* Все ссылки */}
                  {taskResponse.all_links && Object.keys(taskResponse.all_links).length > 0 && (
                    <Box>
                      <Typography variant="h6" sx={{ mb: 2, color: '#ffffff', fontWeight: 500 }}>
                        Все созданные задачи:
                      </Typography>
                      <List sx={{ bgcolor: 'grey.800', borderRadius: 1, p: 1, border: '1px solid', borderColor: 'grey.600' }}>
                        {Object.entries(taskResponse.all_links).map(([taskType, taskInfo]) => (
                          <ListItem key={taskType} sx={{ py: 1 }}>
                            <ListItemText
                              primary={
                                <Box>
                                  <Typography variant="body2" sx={{ color: '#e0e0e0', mb: 0.5, fontWeight: 500 }}>
                                    {taskType === 'main_task' ? 'Основная задача' : 
                                     taskType === 'task_translate_link' ? 'Задача перевода' : taskType}
                                  </Typography>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Typography variant="body2" sx={{ color: '#bdbdbd' }}>
                                      Ключ: {taskInfo.key}
                                    </Typography>
                                    <Link 
                                      href={extractCleanLink(taskInfo.link)} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      sx={{ 
                                        color: '#90caf9',
                                        textDecoration: 'none',
                                        fontWeight: 500,
                                        '&:hover': {
                                          textDecoration: 'underline',
                                          color: '#bbdefb'
                                        }
                                      }}
                                    >
                                      Открыть задачу
                                    </Link>
                                  </Box>
                                </Box>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}
                </>
              ) : (
                <>
                  {/* Ошибка создания */}
                  <Alert 
                    severity="error" 
                    sx={{ 
                      mb: 3,
                      backgroundColor: '#f44336',
                      color: '#ffffff',
                      '& .MuiAlert-icon': {
                        color: '#ffffff'
                      }
                    }}
                  >
                    {taskResponse.message}
                  </Alert>
                  
                  {taskResponse.error && (
                    <Box sx={{ 
                      p: 2, 
                      bgcolor: 'grey.800', 
                      borderRadius: 1, 
                      border: '1px solid', 
                      borderColor: 'error.main' 
                    }}>
                      <Typography variant="h6" sx={{ mb: 1, color: '#ffffff', fontWeight: 500 }}>
                        Детали ошибки:
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#ffcdd2', fontFamily: 'monospace' }}>
                        {taskResponse.error}
                      </Typography>
                    </Box>
                  )}
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button 
            onClick={handleCloseModal}
            variant="contained"
            sx={{
              backgroundColor: 'primary.main',
              '&:hover': {
                backgroundColor: 'primary.dark',
              },
            }}
          >
            Закрыть
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Tasks; 