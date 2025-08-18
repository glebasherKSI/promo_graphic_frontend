import React, { useState, useEffect, useMemo } from 'react';
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
  Typography
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import { DateTimePicker } from '@mui/x-date-pickers';
import { InfoChannel, InfoChannelFormData, PromoEvent } from '../../types';
import dayjs from '../../utils/dayjs';
import { CHANNEL_TYPES, ChannelType } from '../../constants/promoTypes';

interface InfoChannelDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (channel: Partial<InfoChannel>) => Promise<void>;
  channel: InfoChannel | null;
  projects: string[];
  events: PromoEvent[];
}

const InfoChannelDialog: React.FC<InfoChannelDialogProps> = ({
  open,
  onClose,
  onSave,
  channel,
  projects,
  events
}) => {
  const [formData, setFormData] = useState<InfoChannelFormData>({
    type: '',
    project: '',
    start_date: null,
    name: '',
    segments: 'СНГ',
    comment: '',
    link: '',
    promo_id: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (channel) {
      setFormData({
        id: channel.id,
        type: channel.type,
        project: channel.project,
        start_date: channel.start_date,
        name: channel.name,
        segments: channel.segments,
        comment: channel.comment,
        link: channel.link,
        promo_id: channel.promo_id ? String(channel.promo_id) : ''
      });
    } else {
      setFormData({
        type: '',
        project: '',
        start_date: null,
        name: '',
        segments: 'СНГ',
        comment: '',
        link: '',
        promo_id: ''
      });
    }
  }, [channel]);

  const handleChange = (field: keyof InfoChannelFormData, value: any) => {
    setFormData(prev => {
      const updatedData = {
        ...prev,
        [field]: field === 'promo_id' && value ? String(value) : value
      };

      // Если изменяется promo_id, автоматически заполняем название, комментарий и ссылку из промо события
      if (field === 'promo_id' && value) {
        const selectedPromoEvent = events.find(event => event.id === value);
        if (selectedPromoEvent) {
          // Заполняем название, комментарий и ссылку, если они есть в промо событии
          if (selectedPromoEvent.name) {
            updatedData.name = selectedPromoEvent.name;
          }
          if (selectedPromoEvent.comment) {
            updatedData.comment = selectedPromoEvent.comment;
          }
          if (selectedPromoEvent.link) {
            updatedData.link = selectedPromoEvent.link;
          }
        }
      }

      return updatedData;
    });
  };

  // Фильтруем промо события по выбранному проекту
  const filteredPromoEvents = events.filter(event => 
    formData.project ? event.project === formData.project : false
  );

  type PromoOption = { id: number | string; label: string };
  const promoOptions = useMemo<PromoOption[]>(() => (
    filteredPromoEvents.map(ev => ({
      id: ev.id,
      label: `${ev.name} (${ev.promo_type} - ${dayjs.utc(ev.start_date).format('DD.MM.YYYY')})`
    }))
  ), [filteredPromoEvents]);

  const selectedPromoOption = useMemo<PromoOption | null>(() => {
    if (!formData.promo_id) return null;
    return promoOptions.find(opt => String(opt.id) === String(formData.promo_id)) || null;
  }, [promoOptions, formData.promo_id]);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      const channelData: Partial<InfoChannel> = {
        ...formData,
        segments: formData.segments || 'СНГ',
        comment: formData.comment || '',
        link: formData.link || '',
        start_date: formData.start_date || dayjs.utc().format('YYYY-MM-DDTHH:mm:ss'),
        // Оставляем promo_id как строку, если оно задано, иначе не включаем поле
        ...(formData.promo_id && { promo_id: formData.promo_id })
      };

      console.log('Отправляемые данные канала:', channelData);
      await onSave(channelData);
      // Добавляем небольшую задержку для обновления UI
      await new Promise(resolve => setTimeout(resolve, 50));
      onClose();
    } catch (err) {
      console.error('Ошибка при сохранении канала:', err);
      setError(err instanceof Error ? err.message : 'Произошла ошибка при сохранении');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {channel ? 'Редактировать канал информирования' : 'Новый канал информирования'}
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          {/* ID */}
          {channel?.id && (
            <TextField
              label="ID"
              value={channel.id}
              disabled
              fullWidth
            />
          )}

          {/* Тип информирования */}
          <FormControl fullWidth>
            <InputLabel>Тип информирования *</InputLabel>
            <Select
              value={formData.type || ''}
              onChange={(e) => handleChange('type', e.target.value)}
              label="Тип информирования *"
              required
            >
              {CHANNEL_TYPES.map(type => (
                <MenuItem key={type} value={type}>{type}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Проект */}
          <FormControl fullWidth>
            <InputLabel>Проект *</InputLabel>
            <Select
              value={formData.project || ''}
              onChange={(e) => handleChange('project', e.target.value)}
              label="Проект *"
              required
            >
              {projects.map(project => (
                <MenuItem key={project} value={project}>{project}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Идентификатор промо (с поиском) */}
          <Autocomplete
            fullWidth
            options={promoOptions}
            value={selectedPromoOption}
            onChange={(_, option) => handleChange('promo_id', option ? option.id : '')}
            getOptionLabel={(option) => option.label}
            isOptionEqualToValue={(option, value) => String(option.id) === String(value.id)}
            disabled={!formData.project}
            noOptionsText="Ничего не найдено"
            renderInput={(params) => (
              <TextField {...params} label="Идентификатор промо" placeholder="Начните вводить название..." />
            )}
          />

          {/* Дата */}
          <DateTimePicker
            label="Дата"
            value={formData.start_date ? dayjs.utc(formData.start_date) : null}
            onChange={(value) => handleChange('start_date', value ? value.utc().format('YYYY-MM-DDTHH:mm:ss') : null)}
            slotProps={{
              textField: {
                fullWidth: true,
                error: false
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

          {/* Название */}
          <TextField
            label="Название"
            value={formData.name || ''}
            onChange={(e) => handleChange('name', e.target.value)}
            fullWidth
          />

          {/* Сегменты */}
          <TextField
            label="Сегменты"
            value={formData.segments || ''}
            onChange={(e) => handleChange('segments', e.target.value)}
            fullWidth
            helperText="Введите сегменты через запятую"
          />

          {/* Комментарий */}
          <TextField
            label="Комментарий"
            value={formData.comment || ''}
            onChange={(e) => handleChange('comment', e.target.value)}
            multiline
            rows={4}
            fullWidth
          />

          {/* Ссылка */}
          <TextField
            label="Ссылка"
            value={formData.link || ''}
            onChange={(e) => handleChange('link', e.target.value)}
            fullWidth
          />

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
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={loading}
        >
          {loading ? 'Сохранение...' : 'Сохранить'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InfoChannelDialog; 