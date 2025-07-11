import { Dayjs } from 'dayjs';
import { ChannelType } from '../constants/promoTypes';

export interface User {
  id: string;
  username: string;
  role: 'admin' | 'user';
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
}

export interface PromoEvent {
  id: string;
  project: string;
  start_date: string;
  end_date: string;
  name: string;
  promo_type: string;
  promo_kind: string;
  comment: string;
  segments: string;
  link: string;
  info_channels: InfoChannel[];
}

export interface PromoEventCreate extends Omit<PromoEvent, 'id' | 'info_channels'> {
  id?: string;
  info_channels: InfoChannelCreate[];
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
  project: string;
  start_date: string | null;
  end_date: string | null;
  name: string;
  promo_type: string;
  promo_kind: string;
  comment: string;
  segments: string;
  link: string;
} 