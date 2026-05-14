# Руководство по развёртыванию Boost Hive

## Требования
- Ноутбук с Ubuntu 20.04+
- Домен: boost-hive.online
- Статический IP или DDNS (или используй Cloudflare Tunnel)

---

## Шаг 1: Подготовка сервера

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Проверка
node -v  # должен показать v20.x.x
npm -v
```

---

## Шаг 2: Установка PostgreSQL (рекомендуется для продакшена)

```bash
# Установка PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Запуск
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Создание БД
sudo -u postgres psql
CREATE DATABASE boosthive;
CREATE USER boostuser WITH PASSWORD 'твой_надежный_пароль';
GRANT ALL PRIVILEGES ON DATABASE boosthive TO boostuser;
\q
```

---

## Шаг 3: Клонирование и настройка проекта

```bash
# Клонируй проект (или скопируй с компа)
cd ~
git clone твой_репозиторий boost-hive
cd boost-hive

# Установка зависимостей
npm install

# Создай .env файл
cat > .env << 'EOF'
NODE_ENV=production
PORT=3000
JWT_SECRET=генерируй_сложный_случайный_ключ
HIVE_DATABASE_URL=postgresql://boostuser:твой_надежный_пароль@localhost:5432/boosthive
PROFI_LIKE_API_KEY=твой_api_ключ
PROFI_LIKE_API_URL=https://api.profi-like.ru/v1
PROFI_LIKE_MARKUP_PERCENT=10
ALLOWED_ORIGINS=https://boost-hive.online
EOF

# Генерируй случайный JWT_SECRET:
openssl rand -base64 32
```

---

## Шаг 4: Сборка проекта

```bash
npm run build
```

---

## Шаг 5: Запуск с PM2 (менеджер процессов)

```bash
# Установка PM2
sudo npm install -g pm2

# Запуск приложения
pm2 start npm --name "boost-hive" -- start

# Автозапуск при перезагрузке
pm2 startup
pm2 save
```

---

## Шаг 6: Настройка Nginx как прокси

```bash
# Установка Nginx
sudo apt install -y nginx

# Создание конфига
sudo nano /etc/nginx/sites-available/boost-hive
```

Содержимое:
```nginx
server {
    listen 80;
    server_name boost-hive.online www.boost-hive.online;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }
}
```

```bash
# Активация
sudo ln -s /etc/nginx/sites-available/boost-hive /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## Шаг 7: SSL сертификат (Let's Encrypt)

```bash
# Установка Certbot
sudo apt install -y certbot python3-certbot-nginx

# Получение сертификата
sudo certbot --nginx -d boost-hive.online -d www.boost-hive.online

# Автообновление
sudo certbot renew --dry-run
```

---

## Шаг 8: Настройка DNS

В панели управления доменом добавь записи:

| Тип | Имя | Значение |
|-----|-----|----------|
| A | @ | IP_твоего_ноутбука |
| A | www | IP_твоего_ноутбука |

**Важно:** Если у тебя динамический IP (обычно у домашнего интернета), используй:
- **Cloudflare Tunnel** (бесплатно)
- Или **DDNS** сервис

---

## Шаг 9: Открытие портов

```bash
# Открыть порты в firewall
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

---

## Команды управления

```bash
# Просмотр логов
pm2 logs boost-hive

# Перезапуск
pm2 restart boost-hive

# Остановка
pm2 stop boost-hive

# Статус
pm2 status
```

---

## Cloudflare Tunnel (без статического IP)

Если у тебя динамический IP (домашний интернет), используй Cloudflare Tunnel — это бесплатно и обходит блокировки.

### Шаг 1: Установка cloudflared

```bash
# Скачать
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared

# Сделать исполняемым
chmod +x cloudflared

# Переместить в PATH
sudo mv cloudflared /usr/local/bin/
```

### Шаг 2: Авторизация

```bash
cloudflared tunnel login
```

Откроется браузер — войди в аккаунт Cloudflare и выбери домен `boost-hive.online`.

### Шаг 3: Создание туннеля

```bash
# Создать туннель
cloudflared tunnel create boosthive

# Сохрани Tunnel ID (выведет что-то like: a1b2c3d4-...)
```

### Шаг 4: Настройка DNS

```bash
# Добавить домен к туннелю
cloudflared tunnel route dns boosthive boost-hive.online
```

### Шаг 5: Запуск туннеля

```bash
# Запуск (замени a1b2c3d4-... на твой Tunnel ID)
cloudflared tunnel run --url http://localhost:3000 a1b2c3d4-...
```

Или создай конфиг:

```bash
mkdir -p ~/.cloudflared
nano ~/.cloudflared/config.yml
```

Содержимое:
```yaml
tunnel: a1b2c3d4-...
credentials-file: /home/твой_пользователь/.cloudflared/a1b2c3d4-...json

ingress:
  - hostname: boost-hive.online
    service: http://localhost:3000
  - service: http_status:404
```

Запуск:
```bash
cloudflared tunnel --config ~/.cloudflared/config.yml run
```

### Шаг 6: Автозапуск

```bash
# Создать systemd сервис
sudo nano /etc/systemd/system/cloudflared.service
```

Содержимое:
```ini
[Unit]
Description=Cloudflare Tunnel
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/cloudflared tunnel --config /home/твой_пользователь/.cloudflared/config.yml run
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
# Запуск
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

---

## Для России (особенности)

1. **Банковские карты**: Для приёма платежей в России нужна интеграция с российскими платёжными системами (ЮKassa, Robokassa)

2. **VPN**: Cloudflare Tunnel уже обходит блокировки

3. **Хостинг в России**: Для соответствия законодательству (ФЗ-152) можно использовать российские VPS (Reg.ru, Timeweb, Yandex Cloud)

---

## Быстрая проверка

После настройки открой в браузере: https://boost-hive.online

Должен открыться сайт!
