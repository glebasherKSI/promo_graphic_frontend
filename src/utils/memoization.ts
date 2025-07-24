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
  
  for (let i = 0; i < arr1.length; i++) {
    if (keyFn(arr1[i]) !== keyFn(arr2[i])) {
      return false;
    }
  }
  
  return true;
}

// Функция для создания стабильных ключей для событий
export function createEventKey(event: PromoEvent): string {
  return `${event.id}-${event.start_date}-${event.end_date}-${event.promo_type}-${event.promo_kind}`;
} 