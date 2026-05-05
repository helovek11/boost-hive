<div align="center">
<img width="1200" height="475" alt="Boost Hive" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Boost Hive 💰

Сервис для заказа услуг продвижения в социальных сетях (Instagram, TikTok, YouTube, Telegram и др.).

## Возможности

- 📊 Каталог услуг с ценами в рублях
- 💳 Пополнение баланса (Банковские карты, Криптовалюта, YooMoney)
- 📈 Отслеживание заказов
- 🌐 Мультиязычность (EN, RU, ES)
- 🌙 Тёмная тема

## Технологии

- **Frontend:** React + TypeScript + Vite
- **Backend:** Express + Prisma
- **База данных:** SQLite (dev) / PostgreSQL (prod)
- **Стили:** TailwindCSS

## Быстрый старт

### Установка

```bash
# Клонирование
git clone https://github.com/helovek11/boost-hive.git
cd boost-hive

# Установка зависимостей
npm install
```

### Настройка

Создай файл `.env`:

```env
NODE_ENV=development
PORT=3000
JWT_SECRET=твой_секретный_ключ
HIVE_DATABASE_URL=file:./prisma/dev.db
PROFI_LIKE_API_KEY=твой_api_ключ
PROFI_LIKE_API_URL=https://api.profi-like.ru/v1
PROFI_LIKE_MARKUP_PERCENT=10
```

### Запуск

```bash
# Режим разработки
npm run dev

# Продакшен
npm run build
npm start
```

## Развёртывание

Подробная инструкция: [DEPLOY_GUIDE.md](DEPLOY_GUIDE.md)

## Безопасность

Рекомендации: [SECURITY_PLAN.md](SECURITY_PLAN.md)

## Лицензия

MIT
