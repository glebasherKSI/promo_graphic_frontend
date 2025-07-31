import { Dayjs } from 'dayjs';
import { ChannelType } from '../constants/promoTypes';

export interface User {
  id: string;
  username: string;
  role: 'admin' | 'user';
}

// Новый интерфейс для пользователей из API
export interface ApiUser {
  id: number;
  login: string;
  mail: string | null;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
}

export interface PromoEvent {
  id: string;
  project: string; // оставляем для совместимости, не трогаем
  start_date: string;
  end_date: string;
  name: string;
  promo_type: string;
  promo_kind: string;
  comment: string;
  segments: string;
  link: string;
  info_channels: InfoChannel[];
  responsible_id?: number; // Добавляем поле для ответственного
  responsible_name?: string; // Добавляем поле для имени ответственного
}

export interface PromoEventCreate extends Omit<PromoEvent, 'id' | 'info_channels' | 'project'> {
  id?: string;
  project: string[];
  info_channels: InfoChannelCreate[];
  responsible_id?: number; // Добавляем поле для ответственного
}

export interface InfoChannel {
  id: string;
  type: string;
  project: string;
  start_date: string;
  name: string;
  segments: string;
  comment: string;
  link: string;
  promo_id: string;
}

// Обновленный интерфейс для создания каналов - совместим с бэкендом
export interface InfoChannelCreate {
  type: ChannelType;
  project: string;
  start_date: string;
  name: string;
  comment?: string;
  segments?: string;
  link?: string;
  promo_id?: string;
}

export interface InfoChannelFormData {
  id?: string;
  type: string;
  project: string;
  start_date: string | null;
  name: string;
  segments: string;
  comment: string;
  link: string;
  promo_id: string;
}

export interface DisplayPromoEvent extends PromoEvent {
  _isMain: boolean;
  _channel?: InfoChannel;
  type: string;
  subtype?: string;
  segment?: string;
}

export interface PromoEventFormData {
  id?: string;
  project: string[];
  start_date: string | null;
  end_date: string | null;
  name: string;
  promo_type: string;
  promo_kind: string;
  comment: string;
  segments: string;
  link: string;
  responsible_id?: number; // Добавляем поле для ответственного
} 