import { PromoEvent } from '../types';

// Простая функция мемоизации для функций с одним аргументом
export function memoize<T, R>(fn: (arg: T) => R): (arg: T) => R {
  const cache = new Map<T, R>();
  
  return (arg: T): R => {
    const cached = cache.get(arg);
    if (cached !== undefined) {
      return cached;
    }
    
    const result = fn(arg);
    
    // Ограничиваем размер кэша для предотвращения утечек памяти
    if (cache.size > 100) {
      const firstKey = cache.keys().next().value;
      if (firstKey !== undefined) {
        cache.delete(firstKey);
      }
    }
    
    cache.set(arg, result);
    return result;
  };
}

// Мемоизация с составным ключом
export function memoizeWithKey<T, R>(
  fn: (arg: T) => R, 
  keyFn: (arg: T) => string
): (arg: T) => R {
  const cache = new Map<string, R>();
  
  return (arg: T): R => {
    const key = keyFn(arg);
    
    const cached = cache.get(key);
    if (cached !== undefined) {
      return cached;
    }
    
    const result = fn(arg);
    
    // Ограничиваем размер кэша
    if (cache.size > 100) {
      const firstKey = cache.keys().next().value;
      if (firstKey !== undefined) {
        cache.delete(firstKey);
      }
    }
    
    cache.set(key, result);
    return result;
  };
}

// Специальная мемоизация для generateRecurringEvents
export const memoizeRecurringEvents = memoizeWithKey(
  (event: PromoEvent) => event,
  (event: PromoEvent) => `${event.id}-${event.promo_type}-${event.promo_kind}-${event.start_date}-${event.end_date}`
);

// Функция для сравнения массивов объектов (для React.memo)
export function shallowCompareArrays<T>(
  arr1: T[], 
  arr2: T[], 
  keyFn: (item: T) => string = (item) => JSON.stringify(item)
): boolean {
  if (arr1.length !== arr2.length) return false;
  
  // Оптимизация: сравниваем только первые и последние элементы для больших массивов
  if (arr1.length > 10) {
    // Проверяем первые 3 элемента
    for (let i = 0; i < Math.min(3, arr1.length); i++) {
      if (keyFn(arr1[i]) !== keyFn(arr2[i])) {
        return false;
      }
    }
    
    // Проверяем последние 3 элемента
    for (let i = Math.max(0, arr1.length - 3); i < arr1.length; i++) {
      if (keyFn(arr1[i]) !== keyFn(arr2[i])) {
        return false;
      }
    }
    
    // Проверяем средние элементы с шагом
    const step = Math.max(1, Math.floor(arr1.length / 10));
    for (let i = 3; i < arr1.length - 3; i += step) {
      if (keyFn(arr1[i]) !== keyFn(arr2[i])) {
        return false;
      }
    }
  } else {
    // Для небольших массивов проверяем все элементы
    for (let i = 0; i < arr1.length; i++) {
      if (keyFn(arr1[i]) !== keyFn(arr2[i])) {
        return false;
      }
    }
  }
  
  return true;
}

// Функция для создания стабильных ключей для событий
export function createEventKey(event: PromoEvent): string {
  return `${event.id}-${event.start_date}-${event.end_date}-${event.promo_type}-${event.promo_kind}`;
} 