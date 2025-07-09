# 🚀 Деплой фронтенда Promo Calendar

## Подготовка к деплою

### 1. Настройка API URL
Обновите файл `.env.production` с URL вашего бекенда:
```bash
REACT_APP_API_URL=https://your-backend-domain.com
```

### 2. Сборка проекта
```bash
npm run build
```

## Варианты деплоя

### 🔥 Netlify (Рекомендуется)
```bash
# Установка CLI
npm install -g netlify-cli

# Логин
netlify login

# Деплой
netlify deploy --prod --dir=build

# Или через GitHub
# 1. Загрузите код на GitHub
# 2. Подключите репозиторий в Netlify
# 3. Установите переменную окружения: REACT_APP_API_URL
```

### ⚡ Vercel
```bash
# Установка CLI
npm install -g vercel

# Деплой
vercel --prod

# Установка переменных окружения:
vercel env add REACT_APP_API_URL
```

### 🛠 GitHub Pages
```bash
# Установка gh-pages
npm install --save-dev gh-pages

# Добавьте в package.json:
"homepage": "https://yourusername.github.io/promo-calendar-frontend",
"scripts": {
  "predeploy": "npm run build",
  "deploy": "gh-pages -d build"
}

# Деплой
npm run deploy
```

### 🖥 VPS с Nginx

1. **Загрузите build папку на сервер:**
```bash
scp -r build/ user@your-server:/var/www/promo-calendar/
```

2. **Настройте Nginx:**
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/promo-calendar;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

3. **Перезапустите Nginx:**
```bash
sudo systemctl reload nginx
```

## ⚠️ Важные замечания

### CORS настройки
Убедитесь что ваш бекенд настроен для работы с новым доменом:

```python
# В Django settings.py или FastAPI
CORS_ALLOWED_ORIGINS = [
    "https://your-frontend-domain.com",
    "http://localhost:3000",  # для разработки
]
```

### SSL сертификат
Для production обязательно используйте HTTPS:
```bash
# С помощью Let's Encrypt
sudo certbot --nginx -d your-domain.com
```

### Переменные окружения
Не забудьте обновить:
- `.env.production` - для локальной сборки
- `netlify.toml` - для Netlify
- `vercel.json` - для Vercel
- Или настройки хостинга - для других платформ

## 🔧 Отладка

### Проверка API соединения
```javascript
// В браузере Console
console.log('API URL:', process.env.REACT_APP_API_URL);
```

### Логи сети
Откройте DevTools → Network и проверьте запросы к API

### Проблемы с CORS
Если видите ошибки CORS, проверьте настройки бекенда и убедитесь что домен фронтенда добавлен в CORS_ALLOWED_ORIGINS. 