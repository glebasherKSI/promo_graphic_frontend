import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Grid,
  IconButton,
  Typography,
  CircularProgress
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { User } from '../../types';
import axios from 'axios';

interface ProfileEditDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (profileData: Partial<User>, userId: string) => Promise<void>;
  user: User | null;
}

interface ProfileFormData {
  username: string;
  password: string;
  token: string;
  mail: string;
  server: string;
  accountId: string;
  api_key: string;
  token_trello: string;
}

const ProfileEditDialog: React.FC<ProfileEditDialogProps> = ({
  open,
  onClose,
  onSave,
  user
}) => {
  const [formData, setFormData] = useState<ProfileFormData>({
    username: '',
    password: '',
    token: '',
    mail: '',
    server: '',
    accountId: '',
    api_key: '',
    token_trello: ''
  });
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [userData, setUserData] = useState<any>(null);

  // Загружаем данные пользователя при открытии диалога
  useEffect(() => {
    if (open && user?.username) {
      loadUserData();
    }
  }, [open, user]);

  const loadUserData = async () => {
    if (!user?.username) return;
    
    setDataLoading(true);
    setErrors({});
    
    try {
      const response = await axios.get(`/api/users/${user.username}`);
      const userData = response.data;
      setUserData(userData);
      
      setFormData({
        username: userData.username || '',
        password: '', // Пароль не заполняем для безопасности
        token: userData.token || '',
        mail: userData.mail || '',
        server: userData.server || '',
        accountId: userData.accountId || '',
        api_key: userData.api_key || '',
        token_trello: userData.token_trello || ''
      });
    } catch (error) {
      console.error('Ошибка загрузки данных пользователя:', error);
      setErrors({ general: 'Ошибка загрузки данных пользователя' });
      
      // Заполняем форму базовыми данными из auth.user
      setFormData({
        username: user.username || '',
        password: '',
        token: '',
        mail: '',
        server: '',
        accountId: '',
        api_key: '',
        token_trello: ''
      });
    } finally {
      setDataLoading(false);
    }
  };

  const handleInputChange = (field: keyof ProfileFormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    // Очищаем ошибку для этого поля
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Логин обязателен';
    }

    if (formData.mail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.mail)) {
      newErrors.mail = 'Неверный формат email';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Подготавливаем данные для отправки (исключаем пустой пароль)
      const dataToSave = { ...formData };
      if (!dataToSave.password) {
        delete (dataToSave as any).password;
      }

      await onSave(dataToSave, userData?.id || user?.id || '');
      onClose();
    } catch (error) {
      console.error('Ошибка при сохранении профиля:', error);
      setErrors({ general: 'Ошибка при сохранении профиля' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading && !dataLoading) {
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          minHeight: '500px'
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Typography variant="h6" component="div">
          Редактирование профиля
        </Typography>
        <IconButton onClick={handleClose} disabled={loading || dataLoading}>
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {errors.general && (
            <Typography color="error" sx={{ mb: 2 }}>
              {errors.general}
            </Typography>
          )}

          {dataLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
              <CircularProgress />
            </Box>
          ) : (
            <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Логин"
                value={formData.username}
                onChange={handleInputChange('username')}
                error={!!errors.username}
                helperText={errors.username}
                disabled={loading}
                required
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Пароль"
                type="password"
                value={formData.password}
                onChange={handleInputChange('password')}
                error={!!errors.password}
                helperText={errors.password || 'Оставьте пустым, если не хотите менять'}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Токен"
                value={formData.token}
                onChange={handleInputChange('token')}
                error={!!errors.token}
                helperText={errors.token}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.mail}
                onChange={handleInputChange('mail')}
                error={!!errors.mail}
                helperText={errors.mail}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Сервер"
                value={formData.server}
                onChange={handleInputChange('server')}
                error={!!errors.server}
                helperText={errors.server}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Account ID"
                value={formData.accountId}
                onChange={handleInputChange('accountId')}
                error={!!errors.accountId}
                helperText={errors.accountId}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="API Key"
                value={formData.api_key}
                onChange={handleInputChange('api_key')}
                error={!!errors.api_key}
                helperText={errors.api_key}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Token Trello"
                value={formData.token_trello}
                onChange={handleInputChange('token_trello')}
                error={!!errors.token_trello}
                helperText={errors.token_trello}
                disabled={loading}
              />
            </Grid>
          </Grid>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button 
          onClick={handleClose} 
          disabled={loading || dataLoading}
          variant="outlined"
          color="inherit"
        >
          Отмена
        </Button>
        <Button 
          onClick={handleSubmit} 
          disabled={loading || dataLoading}
          variant="contained"
          color="secondary"
        >
          Сохранить
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProfileEditDialog; 