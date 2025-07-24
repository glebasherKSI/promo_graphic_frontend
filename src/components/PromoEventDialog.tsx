import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  CircularProgress,
  Divider,
  Stack,
  Chip,
  IconButton,
  Snackbar,
  Alert,
  Backdrop,
  DialogContentText,
  OutlinedInput,
  Checkbox,
  ListItemText
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { PromoEvent, PromoEventCreate, PromoEventFormData, InfoChannel, InfoChannelCreate } from '../types';
import { PROMO_TYPES, PROMO_KINDS, CHANNEL_TYPES, ChannelType } from '../constants/promoTypes';
import dayjs from '../utils/dayjs';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';

interface PromoEventDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (eventData: PromoEventCreate) => Promise<void>;
  onDelete: (eventId: string) => Promise<void>;
  event: PromoEvent | null;
  projects: string[];
}

const PromoEventDialog: React.FC<PromoEventDialogProps> = ({
  open,
  onClose,
  onSave,
  onDelete,
  event,
  projects
}) => {
  const [formData, setFormData] = useState<PromoEventFormData>({
    project: '',
    promo_type: '',
    promo_kind: '',
    name: '',
    comment: '',
    segments: 'СНГ',
    start_date: '',
    end_date: '',
    link: ''
  });

  const [infoChannels, setInfoChannels] = useState<InfoChannelCreate[]>([]);
  const [editingChannelIndex, setEditingChannelIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const [selectedChannelTypes, setSelectedChannelTypes] = useState<string[]>([]);
  const [channelData, setChannelData] = useState<{[key: string]: Partial<InfoChannel>}>({});

  useEffect(() => {
    if (event) {
      setFormData({
        id: event.id,
        project: event.project,
        promo_type: event.promo_type,
        promo_kind: event.promo_kind,
        name: event.name,
        comment: event.comment,
        segments: event.segments,
        start_date: dayjs.utc(event.start_date).format('YYYY-MM-DDTHH:mm:ss'),
        end_date: dayjs.utc(event.end_date).format('YYYY-MM-DDTHH:mm:ss'),
        link: event.link || ''
      });

      // Инициализация каналов информирования
      if (event.info_channels) {
        const channelTypes = Array.from(new Set(event.info_channels.map(ch => ch.type)));
        setSelectedChannelTypes(channelTypes);

        const channelObj = event.info_channels.reduce((acc, channel) => {
          acc[channel.type] = {
            type: channel.type,
            start_date: dayjs.utc(channel.start_date).format('YYYY-MM-DDTHH:mm:ss'),
            name: channel.name || '',
            segments: channel.segments,
            comment: channel.comment || '',
            link: channel.link || '',
            project: channel.project
          };
          return acc;
        }, {} as {[key: string]: Partial<InfoChannel>});
        setChannelData(channelObj);
      }
    } else {
      setFormData({
        project: '',
        promo_type: '',
        promo_kind: '',
        name: '',
        comment: '',
        segments: 'СНГ',
        start_date: '',
        end_date: '',
        link: ''
      });
      setSelectedChannelTypes([]);
      setChannelData({});
    }
    setEditingChannelIndex(null);
  }, [event]);

  

  const handleChange = (field: keyof PromoEventCreate, value: any) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Если меняется тип промо, сбрасываем вид промо
      if (field === 'promo_type') {
        newData.promo_kind = '';
      }
      
      return newData;
    });
  };

  const handleChannelChange = (index: number, field: keyof InfoChannelCreate, value: any) => {
    setInfoChannels(prev => {
      const newChannels = [...prev];
      newChannels[index] = {
        ...newChannels[index],
        [field]: value
      };
      return newChannels;
    });
  };

  const handleAddChannel = () => {
    const newChannel: InfoChannelCreate = {
      type: CHANNEL_TYPES[0],
      project: formData.project || '',
      start_date: formData.start_date || dayjs.utc().format('YYYY-MM-DDTHH:mm:ss'),
      name: formData.name || '',
      segments: formData.segments || 'СНГ',
      comment: '',
      link: '',
      promo_id: event?.id || ''
    };
    setInfoChannels(prev => [...prev, newChannel]);
    setEditingChannelIndex(infoChannels.length);
  };

  const handleDeleteChannel = (index: number) => {
    setInfoChannels(prev => prev.filter((_, i) => i !== index));
    if (editingChannelIndex === index) {
      setEditingChannelIndex(null);
    }
  };

  const handleInfoChannelChange = (index: number, field: keyof InfoChannel, value: any) => {
    setInfoChannels(prev => {
      const newChannels = [...prev];
      newChannels[index] = {
        ...newChannels[index],
        [field]: value
      };
      return newChannels;
    });
  };

  const handleAddInfoChannel = () => {
    setInfoChannels(prev => [
      ...prev,
      {
        type: CHANNEL_TYPES[0] as ChannelType,
        project: formData.project || '',
        start_date: formData.start_date || '',
        name: formData.name || '',
        segments: formData.segments || 'СНГ',
        comment: '',
        link: '',
        promo_id: event?.id || ''
      }
    ]);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      // Преобразуем каналы в формат массива для API
      const channelsArray: InfoChannelCreate[] = [];
      
      // Если есть выбранные типы каналов, добавляем их в массив
      if (selectedChannelTypes && selectedChannelTypes.length > 0) {
        selectedChannelTypes.forEach(type => {
          const channel = channelData[type];
          if (channel) {
            channelsArray.push({
              type: (channel.type || CHANNEL_TYPES[0]) as ChannelType,
              project: formData.project,
              start_date: channel.start_date || formData.start_date || dayjs.utc().format('YYYY-MM-DDTHH:mm:ss'),
              name: channel.name || formData.name,
              segments: channel.segments || formData.segments || 'СНГ',
              comment: channel.comment || '',
              link: channel.link || '',
              promo_id: formData.id || ''
            });
          }
        });
      }

      // Для отладки
      console.log('Отправляемые данные:', JSON.stringify({
        channelsArray,
        selectedChannelTypes,
        channelData
      }, null, 2));

      const eventData: PromoEventCreate = {
        project: formData.project,
        promo_type: formData.promo_type,
        promo_kind: formData.promo_kind,
        name: formData.name,
        comment: formData.comment || '',
        segments: formData.segments || 'СНГ',
        start_date: formData.start_date || dayjs.utc().format('YYYY-MM-DDTHH:mm:ss'),
        end_date: formData.end_date || dayjs.utc().add(1, 'day').format('YYYY-MM-DDTHH:mm:ss'),
        link: formData.link || '',
        info_channels: channelsArray
      };

      await onSave(eventData);
      setSuccessMessage(true);
      setTimeout(() => {
        setSuccessMessage(false);
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Ошибка при сохранении:', err);
      console.error('Данные ответа:', err.response?.data);
      setError(err instanceof Error ? err.message : 'Произошла ошибка при сохранении');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSuccessMessage(false);
  };

  const getAvailableKinds = (type: string): string[] => {
    return PROMO_KINDS[type] || [];
  };

  // Функция для форматирования даты
  const formatDate = (date: string) => {
    return dayjs.utc(date).format('DD.MM.YYYY HH:mm');
  };

  const handleDelete = async () => {
    if (!event?.id) return;
    
    try {
      setLoading(true);
      setError(null);
      await onDelete(event.id);
      setSuccessMessage(true);
      setDeleteConfirmOpen(false);
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка при удалении');
    } finally {
      setLoading(false);
    }
  };

  const handleChannelTypesChange = (event: any) => {
    const newTypes = event.target.value as string[];
    setSelectedChannelTypes(newTypes);
    
    // Добавляем новые типы в channelData
    const newChannelData = { ...channelData };
    newTypes.forEach(type => {
      if (!newChannelData[type]) {
        newChannelData[type] = {
          type,
          start_date: '',
          name: '',
          segments: 'СНГ',
          comment: '',
          link: '',
          project: formData.project || ''
        };
      }
    });
    
    // Удаляем типы, которые были убраны из выбора
    Object.keys(newChannelData).forEach(type => {
      if (!newTypes.includes(type)) {
        delete newChannelData[type];
      }
    });
    
    setChannelData(newChannelData);
  };

  return (
    <>
      <Dialog 
        open={open} 
        onClose={onClose} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>
          {event ? 'Редактировать промо-событие' : 'Новое промо-событие'}
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            {/* ID */}
            {event?.id && (
              <TextField
                label="ID"
                value={event.id}
                disabled
                fullWidth
              />
            )}

            {/* Проект */}
            <FormControl fullWidth>
              <InputLabel>Проект *</InputLabel>
              <Select
                value={formData.project || ''}
                onChange={(e) => handleChange('project', e.target.value)}
                required
              >
                {projects.map(project => (
                  <MenuItem key={project} value={project}>{project}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Тип промо */}
            <FormControl fullWidth>
              <InputLabel>Тип промо *</InputLabel>
              <Select
                value={formData.promo_type || ''}
                onChange={(e) => handleChange('promo_type', e.target.value)}
                required
              >
                {PROMO_TYPES.map(type => (
                  <MenuItem key={type} value={type}>{type}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Вид промо */}
            <FormControl fullWidth>
              <InputLabel>Вид промо *</InputLabel>
              <Select
                value={formData.promo_kind || ''}
                onChange={(e) => handleChange('promo_kind', e.target.value)}
                required
              >
                {getAvailableKinds(formData.promo_type || '').map(kind => (
                  <MenuItem key={kind} value={kind}>{kind}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Название */}
            <TextField
              fullWidth
              label="Название *"
              value={formData.name || ''}
              onChange={(e) => handleChange('name', e.target.value)}
              required
            />

            {/* Комментарий */}
            <TextField
              fullWidth
              label="Комментарий"
              value={formData.comment || ''}
              onChange={(e) => handleChange('comment', e.target.value)}
              multiline
              rows={4}
            />

            {/* Сегменты */}
            <TextField
              label="Сегменты"
              value={formData.segments || ''}
              onChange={(e) => handleChange('segments', e.target.value)}
              fullWidth
              helperText="Введите сегменты через запятую"
            />

            {/* Даты */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <DateTimePicker
                label="Дата начала *"
                value={formData.start_date ? dayjs.utc(formData.start_date) : null}
                onChange={(value) => handleChange('start_date', value ? value.format('YYYY-MM-DDTHH:mm:ss') : null)}
                format="DD-MM-YYYY HH:mm"
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true
                  },
                  actionBar: {
                    // Меняем цвет кнопки "OK" на желаемый (например, основной цвет темы)
                    sx: {
                      '& .MuiButton-root': {
                        color: 'secondary.contrastText',
                        backgroundColor: 'secondary.main', // основной синий MUI, замените на нужный
                        '&:hover': {
                          backgroundColor: 'secondary.dark',
                        },
                      }
                    }
                  }
                }}
              />
              <DateTimePicker
                label="Дата окончания *"
                value={formData.end_date ? dayjs.utc(formData.end_date) : null}
                onChange={(value) => handleChange('end_date', value ? value.format('YYYY-MM-DDTHH:mm:ss') : null)}
                format="DD-MM-YYYY HH:mm"
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true
                  },
                  actionBar: {
                    // Меняем цвет кнопки "OK" на желаемый (например, основной цвет темы)
                    sx: {
                      '& .MuiButton-root': {
                        color: 'secondary.contrastText',
                        backgroundColor: 'secondary.main', // основной синий MUI, замените на нужный
                        '&:hover': {
                          backgroundColor: 'secondary.dark',
                        },
                      }
                    }
                  }
                }}
              />
            </Box>

            {/* Ссылка */}
            <TextField
              fullWidth
              label="Ссылка"
              value={formData.link || ''}
              onChange={(e) => handleChange('link', e.target.value)}
            />

            {/* Информирование */}
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">
                Информирование
              </Typography>
            </Box>



            {/* Существующие каналы информирования (только для чтения) */}
            {event && event.info_channels && event.info_channels.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.primary', fontWeight: 500 }}>
                  Связанные каналы информирования:
                </Typography>
                <Stack spacing={2}>
                  {event.info_channels.map((channel, index) => (
                    <Box
                      key={`existing-${index}`}
                      sx={{
                        p: 2,
                        bgcolor: 'background.paper',
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                      }}
                    >
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Chip 
                          label={channel.type}
                          size="medium"
                          color="info"
                          variant="outlined"
                          sx={{ 
                            fontWeight: 500,
                            minWidth: '80px'
                          }}
                        />
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          Дата старта: <strong>{formatDate(channel.start_date)}</strong>
                        </Typography>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              </Box>
            )}

            <Stack spacing={2}>
              {infoChannels.map((channel, index) => (
                <Box
                  key={index}
                  sx={{
                    p: 2,
                    bgcolor: 'background.paper',
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: editingChannelIndex === index ? 'primary.main' : 'divider',
                  }}
                >
                  {editingChannelIndex === index ? (
                    <Stack spacing={2}>
                      <FormControl fullWidth>
                        <InputLabel>Тип канала</InputLabel>
                        <Select
                          value={channel.type}
                          onChange={(e) => handleChannelChange(index, 'type', e.target.value)}
                        >
                          {CHANNEL_TYPES.map(type => (
                            <MenuItem key={type} value={type}>{type}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <DateTimePicker
                        label="Дата старта"
                        value={channel.start_date ? dayjs.utc(channel.start_date) : null}
                        onChange={(value) => handleChannelChange(index, 'start_date', value ? value.format('YYYY-MM-DDTHH:mm:ss') : null)}
                        format="DD-MM-YYYY HH:mm"
                        slotProps={{
                          textField: {
                            fullWidth: true
                          }
                        }}
                      />
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                        <Button onClick={() => setEditingChannelIndex(null)}>
                          Готово
                        </Button>
                      </Box>
                    </Stack>
                  ) : (
                    <Stack spacing={1}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Chip 
                            label={channel.type}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                          <Typography variant="body2">
                            Дата старта: {formatDate(channel.start_date)}
                          </Typography>
                        </Stack>
                        <Stack direction="row" spacing={1}>
                          <IconButton
                            size="small"
                            onClick={() => setEditingChannelIndex(index)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteChannel(index)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      </Box>
                    </Stack>
                  )}
                </Box>
              ))}
            </Stack>

            {/* Отображение ошибки */}
            {error && (
              <Typography color="error" variant="body2">
                {error}
              </Typography>
            )}
          </Box>
        </DialogContent>

        <DialogActions>
          {event && (
            <Button 
              onClick={() => setDeleteConfirmOpen(true)} 
              color="error" 
              disabled={loading}
              sx={{ mr: 'auto' }}
            >
              Удалить
            </Button>
          )}
          <Button onClick={onClose} color="secondary" disabled={loading}>
            Отмена
          </Button>
          <Box sx={{ position: 'relative', minWidth: 100 }}>
            <Button 
              onClick={handleSubmit} 
              variant="contained" 
              disabled={loading}
              sx={{ 
                width: '100%',
                visibility: loading ? 'hidden' : 'visible'
              }}
            >
              Сохранить
            </Button>
            {loading && (
              <CircularProgress
                size={24}
                sx={{
                  color: '#fff',
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  marginTop: '-12px',
                  marginLeft: '-12px',
                }}
              />
            )}
          </Box>
        </DialogActions>
      </Dialog>

      {/* Диалог подтверждения удаления */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          Подтверждение удаления
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Вы действительно хотите удалить это промо-событие? Это действие нельзя будет отменить.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteConfirmOpen(false)} 
            disabled={loading}
          >
            Отмена
          </Button>
          <Box sx={{ position: 'relative', minWidth: 100 }}>
            <Button
              onClick={handleDelete}
              color="error"
              variant="contained"
              disabled={loading}
              sx={{ 
                width: '100%',
                visibility: loading ? 'hidden' : 'visible'
              }}
            >
              Удалить
            </Button>
            {loading && (
              <CircularProgress
                size={24}
                sx={{
                  color: '#fff',
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  marginTop: '-12px',
                  marginLeft: '-12px',
                }}
              />
            )}
          </Box>
        </DialogActions>
      </Dialog>

      <Backdrop
        sx={{ 
          color: '#fff', 
          zIndex: (theme) => theme.zIndex.drawer + 1,
          flexDirection: 'column',
          gap: 2
        }}
        open={loading}
      >
        <CircularProgress color="inherit" size={60} />
        <Typography variant="h6" sx={{ color: '#fff' }}>
          {deleteConfirmOpen ? 'Удаление...' : 'Сохранение изменений...'}
        </Typography>
      </Backdrop>

      <Snackbar
        open={successMessage}
        autoHideDuration={2000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="success" variant="filled">
          {deleteConfirmOpen ? 'Запись успешно удалена' : 'Запись успешно изменена'}
        </Alert>
      </Snackbar>
    </>
  );
};

export default PromoEventDialog; 