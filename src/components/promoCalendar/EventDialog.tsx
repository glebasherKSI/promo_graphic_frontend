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
  Stack,
  Chip,
  OutlinedInput,
  Checkbox,
  ListItemText,
  Divider,
  CircularProgress,
  Paper
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import dayjs from '../../utils/dayjs';
import { PromoEvent, PromoEventCreate, PromoEventFormData, InfoChannel, InfoChannelCreate, ApiUser } from '../../types';
import { PROMO_TYPES, PROMO_KINDS, CHANNEL_TYPES, ChannelType } from '../../constants/promoTypes';
import WarningIcon from '@mui/icons-material/Warning';
import axios from 'axios';

interface EventDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (eventData: PromoEventCreate) => Promise<void>;
  event: PromoEvent | null;
  projects: string[];
  users: ApiUser[];
  usersLoading: boolean;
}

const EventDialog: React.FC<EventDialogProps> = ({
  open,
  onClose,
  onSave,
  event,
  projects,
  users,
  usersLoading
}) => {
  const [formData, setFormData] = useState<PromoEventFormData>({
    project: [],
    promo_type: '',
    promo_kind: '',
    name: '',
    comment: '',
    segments: 'СНГ',
    start_date: null,
    end_date: null,
    link: '',
    responsible_id: undefined
  });

  const [selectedChannelTypes, setSelectedChannelTypes] = useState<string[]>([]);
  const [channelData, setChannelData] = useState<{[key: string]: Partial<InfoChannel>}>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);



  useEffect(() => {
    if (event) {
      setFormData({
        id: event.id,
        project: Array.isArray(event.project) ? event.project : [event.project],
        promo_type: event.promo_type,
        promo_kind: event.promo_kind,
        name: event.name,
        comment: event.comment,
        segments: event.segments,
        start_date: event.start_date,
        end_date: event.end_date,
        link: event.link || '',
        responsible_id: event.responsible_id
      });

      // Инициализация каналов информирования
      if (event.info_channels) {
        const channelTypes = Array.from(new Set(event.info_channels.map(ch => ch.type)));
        setSelectedChannelTypes(channelTypes);

        const channelObj = event.info_channels.reduce((acc, channel) => {
          acc[channel.type] = {
            type: channel.type,
            start_date: channel.start_date,
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
        project: [],
        promo_type: '',
        promo_kind: '',
        name: '',
        comment: '',
        segments: 'СНГ',
        start_date: null,
        end_date: null,
        link: '',
        responsible_id: undefined
      });
      setSelectedChannelTypes([]);
      setChannelData({});
    }
  }, [event]);

  // Автоматическое обновление дат каналов при изменении даты начала
  useEffect(() => {
    if (formData.start_date && selectedChannelTypes.length > 0) {
      console.log('Обновляем даты каналов для новой даты начала:', formData.start_date);
      
      setChannelData(prev => {
        const updated = { ...prev };
        selectedChannelTypes.forEach(channelType => {
          if (updated[channelType]) {
            const newDate = getChannelStartDate(channelType, formData.start_date);
            updated[channelType] = {
              ...updated[channelType],
              start_date: newDate
            };
            console.log(`Обновлен канал ${channelType} с новой датой:`, newDate);
          }
        });
        return updated;
      });
    }
  }, [formData.start_date, selectedChannelTypes]);

  const handleChange = (field: keyof PromoEventFormData, value: any) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Если меняется тип промо, сбрасываем вид промо
      if (field === 'promo_type') {
        newData.promo_kind = '';
      }
      
      return newData;
    });
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);
      if (!formData.project || formData.project.length === 0) {
        setError('Выберите хотя бы один проект');
        setLoading(false);
        return;
      }

      // Преобразуем каналы в формат для API
      const channelsArray: InfoChannelCreate[] = [];
      Object.values(channelData).forEach(channel => {
        if (channel.type && CHANNEL_TYPES.includes(channel.type as ChannelType)) {
          channelsArray.push({
            type: channel.type as ChannelType,
            project: Array.isArray(formData.project) ? (formData.project[0] || '') : formData.project || '',
            start_date: channel.start_date || formData.start_date || dayjs.utc().format('YYYY-MM-DDTHH:mm:ss'),
            name: channel.name || formData.name,
            segments: channel.segments || formData.segments || 'СНГ',
            comment: channel.comment || '',
            link: channel.link || '',
            promo_id: ''
          });
        }
      });

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
        info_channels: channelsArray,
        responsible_id: formData.responsible_id
      };

      await onSave(eventData);
      // Добавляем небольшую задержку для обновления UI
      await new Promise(resolve => setTimeout(resolve, 50));
      onClose();
    } catch (err) {
      console.error('Ошибка при сохранении:', err);
      setError(err instanceof Error ? err.message : 'Произошла ошибка при сохранении');
    } finally {
      setLoading(false);
    }
  };

  const getAvailableKinds = (type: string): string[] => {
    return PROMO_KINDS[type] || [];
  };

  // Функция для автоматического расчета даты старта канала
  const getChannelStartDate = (channelType: string, eventStartDate: string | null): string => {
    if (!eventStartDate) return '';
    
    const baseDate = dayjs.utc(eventStartDate).startOf('day');
    
    const channelRules: { [key: string]: { offset: number; hour: number } } = {
      'E-mail': { offset: 0, hour: 9 },
      'MSGR': { offset: 1, hour: 17 },
      'BPS': { offset: 1, hour: 17 },
      'PUSH': { offset: 2, hour: 19 },
      'SMM': { offset: 0, hour: 12 },
      'Страница': { offset: -1, hour: 10 },
      'Баннер': { offset: 0, hour: 10 }
    };

    const rule = channelRules[channelType];
    if (!rule) return eventStartDate;

    return baseDate
      .add(rule.offset, 'day')
      .hour(rule.hour)
      .minute(0)
      .second(0)
      .format('YYYY-MM-DDTHH:mm:ss');
  };

  const handleChannelTypesChange = (event: any) => {
    const newTypes = event.target.value as string[];
    setSelectedChannelTypes(newTypes);
    
    // Добавляем новые типы в channelData
    const newChannelData = { ...channelData };
    newTypes.forEach(type => {
      if (!newChannelData[type]) {
        const calculatedDate = getChannelStartDate(type, formData.start_date);
        newChannelData[type] = {
          type,
          start_date: calculatedDate || '',
          name: formData.name || '',
          segments: formData.segments || 'СНГ',
          project: Array.isArray(formData.project) ? (formData.project[0] || '') : formData.project || ''
        };
        console.log(`Создан канал ${type} с автоматической датой:`, calculatedDate);
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

  const handleChannelDataChange = (type: string, field: keyof InfoChannel, value: any) => {
    setChannelData(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value
      }
    }));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {event ? 'Редактировать промо-событие' : 'Новое промо-событие'}
      </DialogTitle>
      
      <DialogContent>
        {/* Предупреждение для рекуррентных событий */}
        {event?.is_recurring && (
          <Paper 
            sx={{ 
              p: 2, 
              mb: 2, 
              backgroundColor: 'warning.light', 
              color: 'warning.contrastText',
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}
          >
            <WarningIcon />
            <Typography variant="body2">
              Это рекуррентное событие. Его нельзя редактировать.
            </Typography>
          </Paper>
        )}
        
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
              multiple
              value={formData.project}
              onChange={e => handleChange('project', typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
              required
              disabled={event?.is_recurring}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as string[]).map((value) => (
                    <Chip key={value} label={value} size="small" />
                  ))}
                </Box>
              )}
            >
              {projects.map(project => (
                <MenuItem key={project} value={project}>
                  <Checkbox checked={formData.project.indexOf(project) > -1} />
                  <ListItemText primary={project} />
                </MenuItem>
              ))}
            </Select>
            <Typography variant="caption" color="textSecondary">Можно выбрать несколько проектов</Typography>
          </FormControl>

                      {/* Ответственный */}
            <FormControl fullWidth>
              <InputLabel>Ответственный</InputLabel>
              <Select
                value={formData.responsible_id || ''}
                onChange={(e) => handleChange('responsible_id', e.target.value)}
                disabled={usersLoading || event?.is_recurring}
              >
                <MenuItem value="">
                  <em>Не выбран</em>
                </MenuItem>
                {users.map(user => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.login}
                  </MenuItem>
                ))}
              </Select>
              {usersLoading && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                  <CircularProgress size={16} />
                  <Typography variant="caption" color="textSecondary">
                    Загрузка пользователей...
                  </Typography>
                </Box>
              )}
              {event?.responsible_name && !formData.responsible_id && (
                <Typography variant="caption" color="textSecondary" sx={{ mt: 1 }}>
                  Текущий ответственный: {event.responsible_name}
                </Typography>
              )}
            </FormControl>

          {/* Тип промо */}
          <FormControl fullWidth>
            <InputLabel>Тип промо *</InputLabel>
            <Select
              value={formData.promo_type || ''}
              onChange={(e) => handleChange('promo_type', e.target.value)}
              required
              disabled={event?.is_recurring}
            >
              {PROMO_TYPES.map(type => (
                <MenuItem key={type} value={type}>{type}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Вид промо */}
          {formData.promo_type && getAvailableKinds(formData.promo_type).length > 0 && (
            <FormControl fullWidth>
              <InputLabel>Вид промо</InputLabel>
              <Select
                value={formData.promo_kind || ''}
                onChange={(e) => handleChange('promo_kind', e.target.value)}
                disabled={event?.is_recurring}
              >
                {getAvailableKinds(formData.promo_type).map(kind => (
                  <MenuItem key={kind} value={kind}>{kind}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {/* Название */}
          <TextField
            fullWidth
            label="Название "
            value={formData.name || ''}
            onChange={(e) => handleChange('name', e.target.value)}
            required
            disabled={event?.is_recurring}
          />

          {/* Комментарий */}
          <TextField
            fullWidth
            label="Комментарий"
            value={formData.comment || ''}
            onChange={(e) => handleChange('comment', e.target.value)}
            multiline
            rows={4}
            disabled={event?.is_recurring}
          />

          {/* Сегменты */}
          <TextField
            fullWidth
            label="Сегменты"
            value={Array.isArray(formData.segments) ? formData.segments.join(', ') : formData.segments || ''}
            onChange={(e) => handleChange('segments', e.target.value)}
            helperText="Введите сегменты через запятую"
            disabled={event?.is_recurring}
          />

          {/* Даты */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <DateTimePicker
              label="Дата начала "
              value={formData.start_date ? dayjs(formData.start_date) : null}
              onChange={(value) => handleChange('start_date', value ? value.format('YYYY-MM-DDTHH:mm:ss') : null)}
              disabled={event?.is_recurring}
              slotProps={{
                textField: {
                  fullWidth: true,
                  required: true
                }
              }}
            />
            <DateTimePicker
              label="Дата окончания "
              value={formData.end_date ? dayjs(formData.end_date) : null}
              onChange={(value) => handleChange('end_date', value ? value.format('YYYY-MM-DDTHH:mm:ss') : null)}
              disabled={event?.is_recurring}
              slotProps={{
                textField: {
                  fullWidth: true,
                  required: true
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
            disabled={event?.is_recurring}
          />

          <Divider sx={{ my: 2 }} />

          {/* Информирование */}
          <Typography variant="h6" gutterBottom>
            Информирование
          </Typography>

          {/* Мультивыбор типов каналов */}
          <FormControl fullWidth>
            <InputLabel>Типы информирования</InputLabel>
            <Select
              multiple
              value={selectedChannelTypes}
              onChange={handleChannelTypesChange}
              input={<OutlinedInput label="Типы информирования" />}
              disabled={event?.is_recurring}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={value} size="small" />
                  ))}
                </Box>
              )}
            >
              {CHANNEL_TYPES.map((type) => (
                <MenuItem key={type} value={type}>
                  <Checkbox checked={selectedChannelTypes.indexOf(type) > -1} />
                  <ListItemText primary={type} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Поля для выбранных каналов */}
          {selectedChannelTypes.length > 0 && (
            <Stack spacing={2}>
              {selectedChannelTypes.map((type) => (
                <Box
                  key={type}
                  sx={{
                    p: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="subtitle2" gutterBottom>
                    {type}
                  </Typography>
                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    <DateTimePicker
                      label="Дата старта"
                      value={channelData[type]?.start_date ? dayjs(channelData[type].start_date) : null}
                      onChange={(date) => handleChannelDataChange(type, 'start_date', date?.format('YYYY-MM-DDTHH:mm:ss'))}
                      disabled={event?.is_recurring}
                      slotProps={{ textField: { size: 'small', fullWidth: true } }}
                    />
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}

          {/* Отображение ошибки */}
          {error && (
            <Typography color="error" variant="body2">
              {error}
            </Typography>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="secondary" disabled={loading}>
          Отмена
        </Button>
        {/* Кнопка сохранения - скрываем для рекуррентных событий */}
        {!event?.is_recurring && (
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Сохранить'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default EventDialog;