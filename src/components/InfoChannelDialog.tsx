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
  Typography
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers';
import { InfoChannel, InfoChannelFormData, PromoEvent } from '../types';
import dayjs from '../utils/dayjs';
import { CHANNEL_TYPES, ChannelType } from '../constants/promoTypes';

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
        promo_id: channel.promo_id
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
        [field]: value
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

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      const channelData: Partial<InfoChannel> = {
        ...formData,
        segments: formData.segments || 'СНГ',
        comment: formData.comment || '',
        link: formData.link || '',
        start_date: formData.start_date || dayjs().format('YYYY-MM-DDTHH:mm:ss')
      };

      await onSave(channelData);
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
            <InputLabel>Тип информирования</InputLabel>
            <Select
              value={formData.type || ''}
              onChange={(e) => handleChange('type', e.target.value)}
              label="Тип информирования"
            >
              {CHANNEL_TYPES.map(type => (
                <MenuItem key={type} value={type}>{type}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Проект */}
          <FormControl fullWidth>
            <InputLabel>Проект</InputLabel>
            <Select
              value={formData.project || ''}
              onChange={(e) => handleChange('project', e.target.value)}
              label="Проект"
            >
              {projects.map(project => (
                <MenuItem key={project} value={project}>{project}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Идентификатор промо */}
          <FormControl fullWidth>
            <InputLabel>Идентификатор промо</InputLabel>
            <Select
              value={formData.promo_id || ''}
              onChange={(e) => handleChange('promo_id', e.target.value)}
              label="Идентификатор промо"
              disabled={!formData.project}
            >
              <MenuItem value="">
                <em>Не выбрано</em>
              </MenuItem>
              {filteredPromoEvents.map(event => (
                <MenuItem key={event.id} value={event.id}>
                  {event.name} ({event.promo_type} - {dayjs(event.start_date).format('DD.MM.YYYY')})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Дата */}
          <DateTimePicker
            label="Дата"
            value={formData.start_date ? dayjs(formData.start_date) : null}
            onChange={(value) => handleChange('start_date', value ? value.format('YYYY-MM-DDTHH:mm:ss') : null)}
            slotProps={{
              textField: {
                fullWidth: true,
                error: false
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
        <Button onClick={onClose} disabled={loading}>
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