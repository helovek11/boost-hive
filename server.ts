import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import { rateLimit } from 'express-rate-limit';
import pino from 'pino';
import jwt from 'jsonwebtoken';
import { PrismaClient, UserRole, OrderStatus } from '@prisma/client';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import axios from 'axios';
import * as dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

// --- Env validation at startup ---
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is required');
}
if (!process.env.HIVE_DATABASE_URL && process.env.NODE_ENV === 'production') {
  throw new Error('HIVE_DATABASE_URL is required in production');
}
if (!process.env.PROFI_LIKE_API_KEY) {
  throw new Error('PROFI_LIKE_API_KEY is required');
}
if (!process.env.SEXY_SMM_API_KEY) {
  throw new Error('SEXY_SMM_API_KEY is required');
}
process.env.DATABASE_URL ||= process.env.HIVE_DATABASE_URL!;

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  ...(process.env.NODE_ENV !== 'production' && {
    transport: { target: 'pino-pretty', options: { colorize: true } },
  }),
});

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// --- Extend Express Request ---
declare global {
  namespace Express {
    interface Request {
      id: string;
      log: pino.Logger;
      user?: {
        id: string;
        email: string;
        name: string | null;
        role: UserRole;
        balance: number;
      };
    }
  }
}

// --- Category normalization ---
const CATEGORY_ALIASES: [string, string][] = [
  ['Vkontakte', 'VK'], ['вконтакте', 'VK'],
  ['Linkedin', 'LinkedIn'], ['linkedin', 'LinkedIn'],
  ['Youtube', 'YouTube'], ['youtube', 'YouTube'],
  ['Twiter', 'X (Twitter)'], ['twiter', 'X (Twitter)'],
  ['Tik Tok', 'TikTok'], ['Tick Tock', 'TikTok'],
  ['FB', 'Facebook'],
];

const normalizeCategory = (cat: string): string => {
  for (const [from, to] of CATEGORY_ALIASES) {
    if (cat.toLowerCase() === from.toLowerCase()) return to;
  }
  return cat;
};

// --- Russian-to-English translation (SMM boosting terms) ---
const RU_TO_EN: [string, string][] = [
  // Full phrases first (longer = higher priority)
  ['Повторная активность для бота Premium RU', 'Premium Bot Repeat Activity RU'],
  ['Повторная активность для бота Premium', 'Premium Bot Repeat Activity'],
  ['Повторная активность от подписчиков для бота RU', 'RU Subscriber Repeat Activity for Bot'],
  ['Повторная активность для бота', 'Bot Repeat Activity'],
  ['Премиум звезды на личный аккаунт', 'Premium Personal Account Stars'],
  ['Премиум звезды на пост', 'Premium Post Stars'],
  ['Подписчики Premium для бота', 'Premium Bot Followers'],
  ['Подписчики Premium RU', 'Premium RU Followers'],
  ['Подписчики для бота RU', 'RU Bot Followers'],
  ['Подписчики для бота', 'Bot Followers'],
  ['Просмотры для вывода в топ RU', 'RU Top Promotion Views'],
  ['Просмотры для статистики', 'Stats Views'],
  ['Просмотры из поиска', 'Search Views'],
  ['Просмотры на последних', 'Last Views'],
  ['Просмотры на один пост', 'Post Views'],
  ['Для вывода в топ', 'Top Promotion'],
  ['Голосование в опросах', 'Poll Voting'],
  ['Подарки за 15 звезд', '15 Stars Gifts'],
  ['Бусты на 25-30 дней', '25-30 Days Boosts'],
  ['Бусты на 15-25 дней', '15-25 Days Boosts'],
  ['Бусты на 7 дней', '7 Days Boosts'],
  ['Бусты на 1 день', '1 Day Boosts'],
  ['Премиум звезды', 'Premium Stars'],
  ['Реакция на пост', 'Post Reaction'],
  ['Реакции на пост', 'Post Reactions'],
  ['Позитивные реакции на пост', 'Positive Post Reactions'],
  ['Негативные реакции на пост', 'Negative Post Reactions'],
  ['для статистики', 'Stats'],
  ['из поиска', 'Search'],
  ['на последних', 'Last'],
  ['на один', 'Single'],
  // Individual words
  ['Лайки', 'Likes'], ['лайки', 'Likes'],
  ['Подписчики', 'Followers'], ['подписчики', 'Followers'],
  ['подписчик', 'Subscriber'],
  ['Просмотры', 'Views'], ['просмотры', 'Views'],
  ['Комментарии', 'Comments'], ['комментарии', 'Comments'],
  ['Репосты', 'Reposts'], ['репосты', 'Reposts'],
  ['репост', 'Repost'],
  ['Отзывы', 'Reviews'], ['отзывы', 'Reviews'],
  ['Сохранения', 'Saves'], ['сохранения', 'Saves'],
  ['Упоминания', 'Mentions'], ['упоминания', 'Mentions'],
  ['Голоса', 'Votes'], ['голоса', 'Votes'],
  ['голосование', 'Voting'],
  ['Трансляции', 'Live Stream'], ['трансляции', 'Live Stream'],
  ['Показы', 'Impressions'], ['показы', 'Impressions'],
  ['Дизлайки', 'Dislikes'], ['дизлайки', 'Dislikes'],
  ['Быстрые', 'Fast'], ['быстрые', 'Fast'],
  ['Медленные', 'Slow'], ['медленные', 'Slow'],
  ['Дешевые', 'Budget'], ['дешевые', 'Budget'],
  ['Качественные', 'Premium'], ['качественные', 'Premium'],
  ['VIP', 'VIP'], ['Турбо', 'Turbo'], ['турбо', 'Turbo'],
  ['Vkontakte', 'VK'], ['вконтакте', 'VK'],
  ['Яндекс', 'Yandex'], ['яндекс', 'Yandex'],
  ['Услуги', 'Services'], ['услуги', 'Services'],
  ['Avito', 'Avito'], ['Одноклассники', 'OK'], ['одноклассники', 'OK'],
  ['Другое', 'Other'], ['другое', 'Other'], ['Юла', 'Yula'], ['юла', 'Yula'],
  ['Под видео', 'Video'], ['под видео', 'Video'],
  ['Накрутка', 'Boost'], ['накрутка', 'Boost'],
  ['Опросы', 'Polls'], ['опросы', 'Polls'],
  ['опросах', 'Polls'],
  ['Ретвиты', 'Retweets'], ['ретвиты', 'Retweets'],
  ['пост', 'Post'], ['поста', 'Post'], ['постов', 'Posts'],
  ['последних', 'Last'], ['дней', 'Days'], ['дня', 'Days'],
  ['вывода', 'Promotion'], ['в топ', 'to Top'], ['топ', 'Top'],
  ['статистики', 'Stats'], ['поиска', 'Search'],
  ['бота', 'Bot'], ['бот', 'Bot'],
  ['активность', 'Activity'],
  ['онлайн', 'Online'], ['премиум', 'Premium'],
  ['звезды', 'Stars'], ['звёзды', 'Stars'],
  ['звезд', 'Stars'], ['звёзд', 'Stars'],
  ['подарки', 'Gifts'],
  ['бусты', 'Boosts'], ['буст', 'Boosts'],
  ['рефералы', 'Referrals'],
  ['реакции', 'Reactions'], ['реакция', 'Reaction'], ['реакций', 'Reactions'],
  ['повторная', 'Repeat'],
  ['страниц', 'Pages'], ['страница', 'Page'],
  ['личный', 'Personal'], ['аккаунт', 'Account'],
];

const translateName = (name: string): string => {
  let result = name;
  for (const [ru, en] of RU_TO_EN) {
    result = result.replace(new RegExp(ru, 'g'), en);
  }
  return result;
};

// --- Provider Registry (scalable: add new providers here) ---
interface ProviderDefinition {
  id: string;
  speedLabel: string;
  priceTier: 'premium' | 'standard' | 'budget';
  rateIsPerUnit?: boolean; // multiply rate by 1000 when true
  fetchServices(): Promise<unknown[]>;
  fetchBalance(): Promise<any>;
  createOrder(serviceId: string, link: string, qty: number): Promise<any>;
  checkOrderStatus(orderId: number): Promise<any>;
  mockServices: unknown[];
}

function createAxiosClient(baseUrl: string): ReturnType<typeof axios.create> {
  return axios.create({ baseURL: baseUrl, timeout: 5000 });
}

const providerRegistry: ProviderDefinition[] = [];
let envWarningsShown = false;

function registerProvider(def: ProviderDefinition) {
  providerRegistry.push(def);
}

// -- Provider: Profi-like --
if (process.env.PROFI_LIKE_API_KEY) {
  const api = createAxiosClient(process.env.PROFI_LIKE_API_URL || 'https://api.profi-like.ru/v1');
  const key = process.env.PROFI_LIKE_API_KEY!;
  registerProvider({
    id: 'profi',
    speedLabel: 'Fast',
    priceTier: 'premium',
    async fetchServices() {
      const res = await api.get('', { params: { action: 'services', key } });
      return Array.isArray(res.data) ? res.data : [];
    },
    async fetchBalance() {
      const res = await api.get('', { params: { action: 'balance', key } });
      return res.data;
    },
    async createOrder(serviceId, link, qty) {
      const res = await api.post('', null, { params: { action: 'add', key, service: serviceId, link, quantity: qty } });
      return res.data;
    },
    async checkOrderStatus(orderId) {
      const res = await api.get('', { params: { action: 'status', key, order: orderId } });
      return res.data;
    },
    mockServices: [
      { service: '1', name: 'Instagram Likes', category: 'Instagram', type: 'Standard', rate: '0.5', min: 10, max: 10000 },
      { service: '2', name: 'Instagram Followers', category: 'Instagram', type: 'Premium', rate: '1.2', min: 10, max: 5000 },
      { service: '5', name: 'TikTok Likes', category: 'TikTok', type: 'Standard', rate: '0.6', min: 10, max: 20000 },
      { service: '9', name: 'YouTube Likes', category: 'YouTube', type: 'Standard', rate: '0.8', min: 10, max: 20000 },
      { service: '11', name: 'Telegram Members', category: 'Telegram', type: 'Premium', rate: '2.5', min: 10, max: 5000 },
    ],
  });
}

// -- Provider: Sexy-SMM --
if (process.env.SEXY_SMM_API_KEY) {
  const api = createAxiosClient(process.env.SEXY_SMM_API_URL || 'https://sexy-smm.ru/api/index.php');
  const key = process.env.SEXY_SMM_API_KEY!;
  registerProvider({
    id: 'sexy',
    speedLabel: 'Standard',
    priceTier: 'budget',
    rateIsPerUnit: true,
    async fetchServices() {
      const res = await api.get('', { params: { r: 'v1/service/index', key } });
      return Array.isArray(res.data) ? res.data : [];
    },
    async fetchBalance() {
      const res = await api.get('', { params: { r: 'v1/user/balance', key } });
      return res.data;
    },
    async createOrder(serviceId, link, qty) {
      const res = await api.get('', { params: { r: 'v1/order/create', key, service: serviceId, link, quantity: qty } });
      return res.data;
    },
    async checkOrderStatus(orderId) {
      const res = await api.get('', { params: { r: 'v1/order/view', key, order: orderId } });
      return res.data;
    },
    mockServices: [
      { service: '101', name: 'Лайки - Быстрые', category: 'Instagram', group: 'Лайки', rate: '0.3', min: 20, max: 20000 },
      { service: '102', name: 'Просмотры', category: 'Instagram', group: 'Просмотры', rate: '0.0005', min: 200, max: 100000 },
      { service: '103', name: 'Подписчики', category: 'Instagram', group: 'Подписчики', rate: '0.8', min: 10, max: 5000 },
      { service: '104', name: 'Лайки под видео', category: 'YouTube', group: 'Лайки/Дизлайки', rate: '0.55', min: 5, max: 5000 },
      { service: '105', name: 'Просмотры', category: 'YouTube', group: 'Просмотры', rate: '0.02', min: 1000, max: 100000 },
      { service: '106', name: 'Подписчики Telegram', category: 'Telegram', group: 'Подписчики', rate: '1.5', min: 10, max: 3000 },
    ],
  });
}

// Derived tier labels from registered providers
const SPEED_TIERS = [...new Set(providerRegistry.map(p => p.speedLabel))];
const PRICE_TIERS = [...new Set(providerRegistry.map(p => p.priceTier))];

const hasCyrillic = (text: string): boolean => /[а-яА-ЯёЁ]/.test(text);

// --- English→Russian dictionary for service names ---
const EN_TO_RU: [string, string][] = [
  ['Quick', 'Быстрые'], ['Fast', 'Быстрые'], ['Slow', 'Медленные'],
  ['Likes', 'Лайки'], ['Dislikes', 'Дизлайки'],
  ['Followers', 'Подписчики'], ['Subscribers', 'Подписчики'], ['Subs', 'Подписчики'],
  ['Views', 'Просмотры'], ['Impressions', 'Показы'],
  ['Comments', 'Комментарии'], ['Shares', 'Репосты'], ['Repost', 'Репост'],
  ['Reviews', 'Отзывы'], ['Saves', 'Сохранения'],
  ['Mentions', 'Упоминания'], ['Tags', 'Теги'],
  ['Votes', 'Голоса'], ['Polls', 'Опросы'],
  ['Live', 'Трансляции'], ['Stream', 'Трансляции'], ['Livestream', 'Прямой эфир'], ['LiveStream', 'Прямой эфир'],
  ['Premium', 'Премиум'], ['Standard', 'Стандартные'],
  ['Budget', 'Бюджетные'], ['Cheap', 'Дешёвые'],
  ['Guaranteed', 'Гарантированные'], ['Guarantee', 'Гарантия'],
  ['Promo', 'Промо'], ['Stable', 'Стабильные'],
  ['Post', 'Пост'], ['Posts', 'Посты'],
  ['Story', 'История'], ['Stories', 'Истории'],
  ['Reaction', 'Реакция'], ['Reactions', 'Реакции'],
  ['Channel', 'Канал'], ['Group', 'Группа'], ['Chat', 'Чат'],
  ['Private', 'Приватный'], ['Public', 'Публичный'],
  ['Russian', 'Русские'], ['Russia', 'Россия'],
  ['Ukrainian', 'Украинские'], ['Ukraine', 'Украина'],
  ['Belarus', 'Беларусь'], ['Kazakhstan', 'Казахстан'],
  ['Arabic', 'Арабские'], ['Arab', 'Арабские'],
  ['Chinese', 'Китайские'], ['China', 'Китай'],
  ['Indian', 'Индийские'], ['India', 'Индия'],
  ['Turkish', 'Турецкие'], ['Turkey', 'Турция'],
  ['German', 'Немецкие'], ['Germany', 'Германия'],
  ['Italian', 'Итальянские'], ['Italy', 'Италия'],
  ['French', 'Французские'], ['France', 'Франция'],
  ['Brazil', 'Бразилия'], ['Israel', 'Израиль'],
  ['Indonesian', 'Индонезийские'], ['Indonesia', 'Индонезия'],
  ['USA', 'США'], ['US', 'США'], ['World', 'Мир'],
  ['UK', 'Великобритания'], ['EU', 'ЕС'],
  ['CIS', 'СНГ'],
  ['Online', 'Онлайн'], ['Offline', 'Офлайн'],
  ['Active', 'Активные'], ['Real', 'Реальные'],
  ['High', 'Высокие'], ['Low', 'Низкие'],
  ['Quality', 'Качество'], ['Top', 'Топ'],
  ['New', 'Новые'], ['Old', 'Старые'],
  ['Verified', 'Верифицированные'], ['Fake', 'Фейковые'],
  ['Bot', 'Бот'], ['Bots', 'Боты'],
  ['Auto', 'Авто'], ['Manual', 'Ручные'],
  ['Day', 'День'], ['Days', 'Дней'],
  ['Week', 'Неделя'], ['Month', 'Месяц'],
  ['Star', 'Звезда'], ['Stars', 'Звёзды'],
  ['Gift', 'Подарок'], ['Gifts', 'Подарки'],
  ['Boost', 'Буст'], ['Boosts', 'Бусты'],
  ['Referral', 'Реферал'], ['Referrals', 'Рефералы'],
  ['Custom', 'Кастомные'], ['Personal', 'Личные'],
  ['Heart', 'Сердце'], ['Fire', 'Огонь'], ['Smile', 'Улыбка'],
  ['Clown', 'Клоун'], ['Devil', 'Дьявол'],
  ['Ghost', 'Призрак'], ['Unicorn', 'Единорог'],
  ['Banana', 'Банан'], ['Pizza', 'Пицца'],
  ['Party', 'Вечеринка'], ['Confetti', 'Конфетти'],
  ['Applause', 'Аплодисменты'], ['Hug', 'Объятие'],
  ['Kiss', 'Поцелуй'], ['Angry', 'Злой'],
  ['Crying', 'Плачет'], ['Sleeping', 'Спит'],
  ['Nerd', 'Ботаник'], ['Woozy', 'Пьяный'],
  ['Yawning', 'Зевает'], ['Vomiting', 'Блюёт'],
  ['Poo', 'Какашка'], ['Face', 'Лицо'],
  ['Eye', 'Глаз'], ['Eyes', 'Глаза'],
  ['Hand', 'Рука'], ['Finger', 'Палец'],
  ['StarStruck', 'Восторг'], ['Hot Dog', 'Хот-дог'],
  ['Cup', 'Кубок'], ['Trophy', 'Трофей'],
  ['Whale', 'Кит'], ['Bird', 'Птица'],
  ['Moai', 'Моаи'], ['Pill', 'Таблетка'],
  ['Search', 'Поиск'], ['Stats', 'Статистика'],
  ['Report', 'Репорт'], ['Reports', 'Репорты'],
  ['Vote', 'Голос'], ['Voting', 'Голосование'],
  ['Set', 'Набор'], ['Pack', 'Пакет'],
  ['Last', 'Последние'], ['Next', 'Следующие'],
  ['Future', 'Будущие'], ['Random', 'Случайные'],
  ['Target', 'Цель'], ['Link', 'Ссылка'],
  ['Account', 'Аккаунт'], ['Profile', 'Профиль'],
  ['Package', 'Пакет'], ['Page', 'Страница'], ['Pages', 'Страницы'],
  ['Photo', 'Фото'], ['Video', 'Видео'],
  ['Story Views', 'Просмотры историй'],
  ['Post Views', 'Просмотры поста'],
  ['Channel Views', 'Просмотры канала'],
  ['Story Reactions', 'Реакции на истории'],
  ['Post Reactions', 'Реакции на пост'],
  ['Auto Post Views', 'Автопросмотры постов'],
  ['Quick Views', 'Быстрые просмотры'],
  ['Guaranteed Views', 'Гарантированные просмотры'],
  ['Standard Views', 'Стандартные просмотры'],
  ['Promo Views', 'Промо просмотры'],
  ['World Shares', 'Репосты мира'],
  ['USA Shares', 'Репосты США'],
  ['Russia Shares', 'Репосты РФ'],
  ['Promo Shares', 'Промо репосты'],
  ['Premium Russian', 'Премиум русские'],
  ['Premium EN', 'Премиум EN'],
  ['Cool Subscribers', 'Крутые подписчики'],
  ['Russian Subscribers', 'Русские подписчики'],
  ['Online Subscribers', 'Онлайн подписчики'],
  ['Private Channel', 'Приватный канал'],
  ['Private Group', 'Приватная группа'],
  ['English Comments', 'Английские комментарии'],
  ['Russian Comments', 'Русские комментарии'],
  ['Custom Comments', 'Кастомные комментарии'],
  ['Reliable Votes', 'Надёжные голоса'],
  ['Set of positive reactions', 'Набор позитивных реакций'],
  ['Set of negative reactions', 'Набор негативных реакций'],
  ['Positive reactions', 'Позитивные реакции'],
  ['Negative reactions', 'Негативные реакции'],
  ['Follow', 'Подписка'], ['Follower', 'Подписчик'],
  ['Subscribe', 'Подписаться'], ['Subscribers', 'Подписчики'],
];

const translateEnToRu = (text: string): string => {
  if (hasCyrillic(text)) return text;
  let result = text;
  const sorted = [...EN_TO_RU].sort((a, b) => b[0].length - a[0].length);
  for (const [en, ru] of sorted) {
    const idx = result.toLowerCase().indexOf(en.toLowerCase());
    if (idx !== -1) {
      result = result.slice(0, idx) + ru + result.slice(idx + en.length);
    }
  }
  if (text !== result) { /* translated */ }
  return result;
};

// --- Services fetch from all providers ---
const SERVICES_CACHE_TTL = 5 * 60 * 1000;

interface CachedServicesEntry {
  providerId: string;
  data: unknown[];
}
let servicesCache: { entries: CachedServicesEntry[]; timestamp: number } | null = null;
let servicesCacheLock: Promise<CachedServicesEntry[]> | null = null;

const fetchAllServices = async (): Promise<CachedServicesEntry[]> => {
  // Read active provider IDs from DB
  const dbProviders = await prisma.provider.findMany({ select: { name: true, isActive: true } });
  const activeNames = new Set(dbProviders.filter(p => p.isActive).map(p => p.name.toLowerCase()));

  const activeDefs = providerRegistry.filter(p => {
    const name = p.id === 'profi' ? 'profi-like' : (p.id === 'sexy' ? 'sexy-smm' : p.id);
    return activeNames.has(name);
  });

  if (activeDefs.length === 0) {
    logger.warn('No active providers found, using all from registry');
    activeDefs.push(...providerRegistry);
  }

  const results = await Promise.allSettled(activeDefs.map(p => fetchSingleProvider(p)));
  const entries: CachedServicesEntry[] = [];
  for (const [i, result] of results.entries()) {
    const def = activeDefs[i];
    if (result.status === 'fulfilled' && result.value.length > 0) {
      entries.push({ providerId: def.id, data: result.value });
    } else {
      entries.push({ providerId: def.id, data: def.mockServices });
      logger.warn({ provider: def.id }, `Provider ${def.id} unavailable, using mock`);
    }
  }
  return entries;
};

const fetchSingleProvider = async (def: ProviderDefinition): Promise<unknown[]> => {
  try {
    return await def.fetchServices();
  } catch {
    return [];
  }
};

const getCachedServices = async (): Promise<CachedServicesEntry[]> => {
  const now = Date.now();
  if (servicesCache && now - servicesCache.timestamp < SERVICES_CACHE_TTL) {
    return servicesCache.entries;
  }
  if (servicesCacheLock) {
    return servicesCacheLock;
  }
  servicesCacheLock = (async () => {
    try {
      const entries = await fetchAllServices();
      servicesCache = { entries, timestamp: Date.now() };
      for (const e of entries) {
        logger.info(`Cached ${e.data.length} services from ${e.providerId}`);
      }
      return entries;
    } catch (error) {
      logger.error(error, 'Failed to fetch services from all providers');
      const fallback = providerRegistry.map(p => ({ providerId: p.id, data: p.mockServices }));
      servicesCache = { entries: fallback, timestamp: Date.now() };
      return fallback;
    } finally {
      servicesCacheLock = null;
    }
  })();
  return servicesCacheLock;
};

const getProviderBalance = async (providerId: string) => {
  const def = providerRegistry.find(p => p.id === providerId);
  return def ? await def.fetchBalance() : { balance: '0' };
};
const getProviderOrderStatus = async (providerId: string, orderId: number) => {
  const def = providerRegistry.find(p => p.id === providerId);
  return def ? await def.checkOrderStatus(orderId) : null;
};

// --- DB connection ---
let dbConnected = false;
prisma.$connect()
  .then(() => { dbConnected = true; logger.info('Database connected'); })
  .catch((err) => {
    logger.error(err, 'Database connection failed');
    if (process.env.NODE_ENV === 'production') process.exit(1);
  });

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.set('trust proxy', 1);
app.use(compression());
const isDev = process.env.NODE_ENV !== 'production';
const connectSrc = ["'self'", 'https://api.exchangerate.host'];
const styleSrc = ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'];
const fontSrc = ["'self'", 'https://fonts.gstatic.com'];
const imgSrc = ["'self'", 'data:', 'https:', 'https://images.unsplash.com'];

if (isDev) {
  connectSrc.push('ws://localhost:24678', 'ws://127.0.0.1:24678');
}

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc,
      styleSrcElem: styleSrc,
      imgSrc,
      connectSrc,
      fontSrc,
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: isDev ? false : { maxAge: 31536000, includeSubDomains: true, preload: true },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});

const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// --- Request correlation ID & per-request logger ---
app.use((req, _res, next) => {
  req.id = crypto.randomUUID();
  req.log = logger.child({ reqId: req.id });
  next();
});

// --- Per-user rate limiter (token bucket) ---
const userBuckets = new Map<string, { tokens: number; refillAt: number }>();
const USER_MAX_TOKENS = 15;
const USER_REFILL_MS = 1000;

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of userBuckets) {
    if (bucket.refillAt < now) userBuckets.delete(key);
  }
}, 60000);

app.use('/api/', (req, res, next) => {
  const key = req.user?.id || req.ip;
  const now = Date.now();
  let bucket = userBuckets.get(key);

  if (!bucket || bucket.refillAt < now) {
    bucket = { tokens: USER_MAX_TOKENS - 1, refillAt: now + USER_REFILL_MS };
    userBuckets.set(key, bucket);
    return next();
  }

  if (bucket.tokens <= 0) {
    return res.status(429).json({ error: 'Too many requests. Slow down.' });
  }

  bucket.tokens--;
  next();
});

// --- Rate limiters ---
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later' },
});
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many registration attempts, please try again later' },
});
const servicesLimiter = rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: 'draft-7', legacyHeaders: false });
const ordersLimiter = rateLimit({ windowMs: 60 * 1000, limit: 60, standardHeaders: 'draft-7', legacyHeaders: false });
const adminLimiter = rateLimit({ windowMs: 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false });

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', registerLimiter);
app.use('/api/services', servicesLimiter);
app.use('/api/orders', ordersLimiter);
app.use('/api/admin', adminLimiter);

// --- Account lockout ---
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000;

const checkAccountLockout = (email: string): string | null => {
  const attempt = loginAttempts.get(email.toLowerCase());
  if (attempt && attempt.lockedUntil > Date.now()) {
    const remaining = Math.ceil((attempt.lockedUntil - Date.now()) / 1000 / 60);
    return `Account locked. Try again in ${remaining} minutes`;
  }
  return null;
};

const recordFailedAttempt = (email: string) => {
  const key = email.toLowerCase();
  const attempt = loginAttempts.get(key) || { count: 0, lockedUntil: 0 };
  attempt.count += 1;
  if (attempt.count >= MAX_LOGIN_ATTEMPTS) {
    attempt.lockedUntil = Date.now() + LOCKOUT_DURATION;
    logger.warn({ email: key, attempts: attempt.count }, 'Account locked due to failed attempts');
  }
  loginAttempts.set(key, attempt);
};

const recordSuccessfulLogin = (email: string) => {
  loginAttempts.delete(email.toLowerCase());
};

// --- JWT ---
const JWT_SECRET = process.env.JWT_SECRET;
const generateToken = (userId: string) => jwt.sign({ userId }, JWT_SECRET!, { expiresIn: '24h' });

// --- Middleware ---
const authenticateToken: express.RequestHandler = async (req, res, next) => {
  const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET!) as { userId: string };
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true, role: true, balance: true },
    });
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const adminOnly: express.RequestHandler = (req, res, next) => {
  if (req.user?.role !== UserRole.ADMIN && req.user?.role !== UserRole.ELITE) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// --- Helpers ---
const CATEGORY_MAP: [string[], string][] = [
  [['instagram', 'ig '], 'Instagram'],
  [['tiktok', 'tok'], 'TikTok'],
  [['youtube', 'yt '], 'YouTube'],
  [['telegram', 'tg '], 'Telegram'],
  [['twitter', 'x.com'], 'X (Twitter)'],
  [['facebook', 'fb '], 'Facebook'],
  [['twitch'], 'Twitch'],
  [['vk', 'vkontakte'], 'VK'],
  [['quora'], 'Quora'],
  [['linkedin'], 'LinkedIn'],
  [['discord'], 'Discord'],
  [['spotify'], 'Spotify'],
  [['soundcloud'], 'SoundCloud'],
  [['periscope'], 'Periscope'],
  [['askfm'], 'AskFM'],
  [['tinder'], 'Tinder'],
  [['pinterest'], 'Pinterest'],
];

const inferCategory = (name: string, existingCat: string): string => {
  const n = name.toLowerCase();
  if (existingCat && existingCat.trim()) return existingCat;
  for (const [keywords, category] of CATEGORY_MAP) {
    if (keywords.some(kw => n.includes(kw))) return category;
  }
  return 'Other';
};

const SERVICE_TYPE_MAP: [string[], string][] = [
  [['like'], 'Likes'],
  [['follow', 'follower', 'subscriber', 'subs'], 'Followers'],
  [['view', 'play'], 'Views'],
  [['comment'], 'Comments'],
  [['share', 'repost', 'retweet'], 'Shares'],
  [['review', 'rating'], 'Reviews'],
  [['save'], 'Saves'],
  [['mention', 'tag'], 'Mentions'],
  [['poll', 'vote'], 'Votes'],
  [['live', 'stream'], 'Live'],
  [['impression'], 'Impressions'],
];

const inferServiceType = (name: string): string => {
  const n = name.toLowerCase();
  for (const [keywords, type] of SERVICE_TYPE_MAP) {
    if (keywords.some(kw => n.includes(kw))) return type;
  }
  return 'Other';
};

// --- Description generator ---
const genDescription = (name: string, category: string, type: string, speed: string, priceTier: string, min: number, max: number): string => {
  const c = category.toLowerCase();
  const t = type.toLowerCase();
  const n = name.toLowerCase();
  const isPremium = priceTier === 'premium';
  const isFast = speed === 'Fast';
  const acc = isPremium ? 'реальными' : 'качественными';
  const launch = isFast ? 'Мгновенный запуск.' : 'Плавный запуск.';

  // Telegram-specific
  if (c.includes('telegram')) {
    if (n.includes('звезд') || n.includes('star')) return `Покупка звёзд Telegram. Зачисление мгновенное. Минимум ${min.toLocaleString()}, максимум ${max.toLocaleString()}. Списаний нет.`;
    if (n.includes('буст')) return `Комплексное продвижение Telegram канала. Подписчики + активность. Объём: ${min.toLocaleString()}–${max.toLocaleString()}.`;
    if (n.includes('подарк') || n.includes('gift')) return `Подарки за звёзды Telegram. Выбор получателя. Количество: ${min.toLocaleString()}–${max.toLocaleString()}.`;
    if (n.includes('реферал') || n.includes('referral')) return `Привлечение рефералов для Telegram бота. Целевая аудитория. ${min.toLocaleString()}–${max.toLocaleString()} рефералов.`;
    if (t.includes('vote') || t.includes('poll')) return `Голоса для Telegram опросов от ${acc} пользователей. Объём: ${min.toLocaleString()}–${max.toLocaleString()}.`;
    if (t.includes('reaction') || n.includes('реакц')) return `Реакции на Telegram посты. Эмодзи на выбор. Количество: ${min.toLocaleString()}–${max.toLocaleString()}.`;
    if (t.includes('comment')) return `Комментарии в Telegram каналах и группах. ${acc} аккаунты. ${launch} ${min.toLocaleString()}–${max.toLocaleString()} шт.`;
    if (t.includes('share') || t.includes('repost')) return `Репосты Telegram записей. ${acc} подписчики. Объём: ${min.toLocaleString()}–${max.toLocaleString()}. ${launch}`;
    if (t.includes('view')) return `Просмотры Telegram постов. Подходит для каналов и групп. ${acc} аккаунты. ${min.toLocaleString()}–${max.toLocaleString()} просмотров.`;
    if (t.includes('follow') || t.includes('member') || t.includes('subscriber')) return `Подписчики Telegram канала или группы. ${acc} аккаунты с аватарками. Объём: ${min.toLocaleString()}–${max.toLocaleString()}.`;
  }

  // Instagram
  if (c.includes('instagram')) {
    if (t.includes('view') && n.includes('story')) return `Просмотры Instagram Stories. ${acc} аккаунты. Досмотр до конца. ${min.toLocaleString()}–${max.toLocaleString()} просмотров.`;
    if (t.includes('view')) return `Просмотры Instagram Reels и постов. ${acc} профили. ${min.toLocaleString()}–${max.toLocaleString()} просмотров. ${launch}`;
    if (t.includes('follow')) return `Подписчики Instagram. ${acc} аккаунты с аватарками и постами. Постепенная доливка. ${min.toLocaleString()}–${max.toLocaleString()}.`;
    if (t.includes('like')) return `Лайки Instagram постов. Равномерное распределение. ${acc} профили. ${min.toLocaleString()}–${max.toLocaleString()} лайков.`;
    if (t.includes('comment')) return `Комментарии под Instagram постами. ${acc} пользователи. Текст на выбор. ${min.toLocaleString()}–${max.toLocaleString()} шт.`;
    if (t.includes('save')) return `Сохранения Instagram постов. ${acc} аккаунты. ${min.toLocaleString()}–${max.toLocaleString()} сохранений.`;
    if (t.includes('mention') || t.includes('tag')) return `Упоминания в Instagram. ${acc} профили. Количество: ${min.toLocaleString()}–${max.toLocaleString()}.`;
    if (t.includes('impression')) return `Охват Instagram постов. Показы от ${acc} пользователей. ${min.toLocaleString()}–${max.toLocaleString()} показов.`;
    if (n.includes('igtv')) return `Просмотры IGTV видео. ${acc} аккаунты. Досмотр не менее 30 секунд. ${min.toLocaleString()}–${max.toLocaleString()}.`;
    if (n.includes('reels')) return `Просмотры Instagram Reels. ${acc} профили. ${min.toLocaleString()}–${max.toLocaleString()} просмотров. ${launch}`;
  }

  // TikTok
  if (c.includes('tiktok')) {
    if (t.includes('view')) return `Просмотры TikTok видео. ${acc} аккаунты. Запуск в течение 5 минут. ${min.toLocaleString()}–${max.toLocaleString()} просмотров.`;
    if (t.includes('follow')) return `Подписчики TikTok. ${acc} пользователи с активностью. Плавный прирост. ${min.toLocaleString()}–${max.toLocaleString()}.`;
    if (t.includes('like')) return `Лайки TikTok видео. ${acc} аккаунты. ${min.toLocaleString()}–${max.toLocaleString()} лайков. ${launch}`;
    if (t.includes('share')) return `Репосты TikTok видео. ${acc} пользователи. ${min.toLocaleString()}–${max.toLocaleString()} репостов.`;
    if (t.includes('comment')) return `Комментарии под TikTok видео. ${acc} аккаунты. ${min.toLocaleString()}–${max.toLocaleString()} комментариев.`;
  }

  // YouTube
  if (c.includes('youtube')) {
    if (t.includes('view')) return `Просмотры YouTube видео. Подходит для Shorts и обычных видео. ${acc} аккаунты. ${min.toLocaleString()}–${max.toLocaleString()} просмотров.`;
    if (t.includes('subscriber')) return `Подписчики YouTube канала. ${acc} аккаунты с историей. ${min.toLocaleString()}–${max.toLocaleString()} подписчиков. Постепенное добавление.`;
    if (t.includes('like')) return `Лайки YouTube видео. ${acc} профили. ${min.toLocaleString()}–${max.toLocaleString()} лайков.`;
    if (t.includes('comment')) return `Комментарии под YouTube видео. ${acc} пользователи. ${min.toLocaleString()}–${max.toLocaleString()} комментариев.`;
    if (n.includes('shorts')) return `Просмотры YouTube Shorts. ${acc} аккаунты. ${min.toLocaleString()}–${max.toLocaleString()} просмотров.`;
    if (n.includes('livestream') || n.includes('live')) return `Зрители YouTube трансляции. ${acc} аккаунты онлайн. Длительность на выбор. ${min.toLocaleString()}–${max.toLocaleString()}.`;
    if (t.includes('share')) return `Репосты YouTube видео. ${acc} пользователи. ${min.toLocaleString()}–${max.toLocaleString()} репостов.`;
  }

  // Twitter/X
  if (c.includes('twitter') || c.includes('x')) {
    if (t.includes('view')) return `Просмотры Twitter/X твитов. ${acc} аккаунты. ${min.toLocaleString()}–${max.toLocaleString()} просмотров.`;
    if (t.includes('follow')) return `Подписчики Twitter/X. ${acc} профили с активностью. ${min.toLocaleString()}–${max.toLocaleString()} подписчиков.`;
    if (t.includes('like')) return `Лайки Twitter/X твитов. ${acc} пользователи. ${min.toLocaleString()}–${max.toLocaleString()} лайков.`;
    if (t.includes('retweet') || t.includes('share')) return `Ретвиты Twitter/X. ${acc} аккаунты. ${min.toLocaleString()}–${max.toLocaleString()} ретвитов.`;
    if (t.includes('comment')) return `Комментарии под Twitter/X твитами. ${acc} пользователи. ${min.toLocaleString()}–${max.toLocaleString()} шт.`;
    if (n.includes('poll') || n.includes('vote')) return `Голоса в Twitter/X опросах. ${acc} пользователи. ${min.toLocaleString()}–${max.toLocaleString()} голосов.`;
  }

  // Facebook
  if (c.includes('facebook')) {
    if (t.includes('view')) return `Просмотры Facebook видео. ${acc} аккаунты. ${min.toLocaleString()}–${max.toLocaleString()} просмотров.`;
    if (t.includes('follow')) return `Подписчики Facebook страницы. ${acc} профили. ${min.toLocaleString()}–${max.toLocaleString()} подписчиков.`;
    if (t.includes('like')) return `Лайки Facebook постов и страниц. ${acc} пользователи. ${min.toLocaleString()}–${max.toLocaleString()} лайков.`;
    if (t.includes('share')) return `Репосты Facebook записей. ${acc} аккаунты. ${min.toLocaleString()}–${max.toLocaleString()} репостов.`;
    if (n.includes('reels')) return `Просмотры Facebook Reels. ${acc} профили. ${min.toLocaleString()}–${max.toLocaleString()} просмотров.`;
  }

  // Twitch
  if (c.includes('twitch')) {
    if (t.includes('follow')) return `Подписчики Twitch канала. ${acc} аккаунты с активностью. ${min.toLocaleString()}–${max.toLocaleString()}.`;
    if (t.includes('view')) return `Зрители Twitch стримов. ${acc} аккаунты онлайн. ${min.toLocaleString()}–${max.toLocaleString()} зрителей.`;
    if (n.includes('live')) return `Зрители на Twitch трансляциях. Разные длительности. ${min.toLocaleString()}–${max.toLocaleString()} зрителей.`;
    if (t.includes('share')) return `Репосты Twitch клипов. ${acc} пользователи. ${min.toLocaleString()}–${max.toLocaleString()} репостов.`;
  }

  // VK
  if (c.includes('vk')) {
    if (t.includes('view')) return `Просмотры VK записей. ${acc} аккаунты. ${min.toLocaleString()}–${max.toLocaleString()} просмотров.`;
    if (t.includes('follow')) return `Подписчики VK страницы или группы. ${acc} профили. ${min.toLocaleString()}–${max.toLocaleString()}.`;
    if (t.includes('like')) return `Лайки VK записей. ${acc} пользователи. ${min.toLocaleString()}–${max.toLocaleString()} лайков.`;
    if (t.includes('share') || n.includes('repost')) return `Репосты VK записей. ${acc} аккаунты. ${min.toLocaleString()}–${max.toLocaleString()} репостов.`;
    if (n.includes('clip')) return `Просмотры VK Клипов. ${acc} профили. ${min.toLocaleString()}–${max.toLocaleString()} просмотров.`;
  }

  // Discord
  if (c.includes('discord')) {
    if (t.includes('member') || t.includes('follow')) return `Участники Discord сервера. ${acc} аккаунты. ${min.toLocaleString()}–${max.toLocaleString()} участников.`;
    if (t.includes('view') || n.includes('stream')) return `Зрители Discord трансляций. ${acc} пользователи. ${min.toLocaleString()}–${max.toLocaleString()} зрителей.`;
  }

  // Spotify
  if (c.includes('spotify')) {
    if (t.includes('follow')) return `Подписчики Spotify профиля. ${acc} аккаунты. ${min.toLocaleString()}–${max.toLocaleString()} подписчиков.`;
    if (n.includes('stream') || t.includes('play')) return `Стримы Spotify треков. ${acc} пользователи. ${min.toLocaleString()}–${max.toLocaleString()} прослушиваний.`;
    if (n.includes('sav')) return `Сохранения Spotify треков в библиотеку. ${acc} аккаунты. ${min.toLocaleString()}–${max.toLocaleString()} сохранений.`;
  }

  // Pinterest
  if (c.includes('pinterest')) {
    if (t.includes('follow')) return `Подписчики Pinterest профиля. ${acc} аккаунты. ${min.toLocaleString()}–${max.toLocaleString()} подписчиков.`;
    if (t.includes('save')) return `Сохранения Pinterest пинов. ${acc} пользователи. ${min.toLocaleString()}–${max.toLocaleString()} сохранений.`;
    if (t.includes('view')) return `Просмотры Pinterest пинов. ${acc} аккаунты. ${min.toLocaleString()}–${max.toLocaleString()} просмотров.`;
  }

  // Linkedin
  if (c.includes('linkedin')) {
    if (t.includes('follow') || t.includes('connect')) return `Подписчики LinkedIn профиля. ${acc} аккаунты. ${min.toLocaleString()}–${max.toLocaleString()} подписчиков.`;
    if (t.includes('like')) return `Лайки LinkedIn записей. ${acc} пользователи. ${min.toLocaleString()}–${max.toLocaleString()} лайков.`;
  }

  // SoundCloud
  if (c.includes('soundcloud')) {
    if (t.includes('play') || t.includes('view')) return `Прослушивания SoundCloud треков. ${acc} аккаунты. ${min.toLocaleString()}–${max.toLocaleString()} прослушиваний.`;
    if (t.includes('follow')) return `Подписчики SoundCloud профиля. ${acc} пользователи. ${min.toLocaleString()}–${max.toLocaleString()} подписчиков.`;
    if (t.includes('like')) return `Лайки SoundCloud треков. ${acc} аккаунты. ${min.toLocaleString()}–${max.toLocaleString()} лайков.`;
  }

  // Generic / Other
  if (t.includes('vote') || t.includes('poll')) return `Голосование в опросах. ${acc} пользователи. Объём: ${min.toLocaleString()}–${max.toLocaleString()} голосов. ${launch}`;
  if (t.includes('reaction') || n.includes('реакц')) return `Реакции на публикации. Выбор эмодзи. Количество: ${min.toLocaleString()}–${max.toLocaleString()}.`;
  if (t.includes('view')) return `Просмотры контента. ${acc} аккаунты. ${min.toLocaleString()}–${max.toLocaleString()} просмотров. ${launch}`;
  if (t.includes('follow') || t.includes('subscriber')) return `Подписчики на профиль. ${acc} пользователи. Объём: ${min.toLocaleString()}–${max.toLocaleString()}. ${launch}`;
  if (t.includes('like')) return `Лайки контента. ${acc} профили. ${min.toLocaleString()}–${max.toLocaleString()} лайков. ${launch}`;
  if (t.includes('comment')) return `Комментарии к публикациям. ${acc} пользователи. ${min.toLocaleString()}–${max.toLocaleString()} комментариев.`;
  if (t.includes('share')) return `Репосты контента. ${acc} аккаунты. ${min.toLocaleString()}–${max.toLocaleString()} репостов. ${launch}`;
  if (t.includes('review') || t.includes('rating')) return `Отзывы и оценки. ${acc} пользователи. ${min.toLocaleString()}–${max.toLocaleString()} отзывов.`;
  if (t.includes('save')) return `Сохранения контента. ${acc} аккаунты. ${min.toLocaleString()}–${max.toLocaleString()} сохранений.`;
  if (t.includes('mention')) return `Упоминания профиля. ${acc} пользователи. ${min.toLocaleString()}–${max.toLocaleString()} упоминаний.`;
  if (t.includes('impression')) return `Показы контента. ${acc} аккаунты. ${min.toLocaleString()}–${max.toLocaleString()} показов.`;
  if (t.includes('live')) return `Зрители трансляции. Онлайн просмотр. ${min.toLocaleString()}–${max.toLocaleString()} зрителей.`;
  if (n.includes('report')) return `Жалобы на контент или аккаунт. Количество: ${min.toLocaleString()}–${max.toLocaleString()}.`;
  if (n.includes('boost')) return `Комплексный буст активности. ${acc} пользователи. Объём: ${min.toLocaleString()}–${max.toLocaleString()}. ${launch}`;

  return `${type} услуга. ${acc} аккаунты. Объём заказа: ${min.toLocaleString()}–${max.toLocaleString()}. ${launch}`;
};

// --- Idempotency store ---
const idempotencyStore = new Map<string, { response: unknown; timestamp: number }>();
const IDEMPOTENCY_TTL = 24 * 60 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [key, val] of idempotencyStore) {
    if (val.timestamp < now) idempotencyStore.delete(key);
  }
}, 3600000);

// --- Routes ---
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', timestamp: new Date().toISOString(), database: 'connected' });
  } catch {
    res.status(503).json({ status: 'unhealthy', timestamp: new Date().toISOString(), database: 'disconnected' });
  }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  const { id, email, name, role, balance } = req.user!;
  res.json({ id, email, name, role, balance });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const lockoutMsg = checkAccountLockout(email);
  if (lockoutMsg) return res.status(429).json({ error: lockoutMsg });

  try {
    z.string().email().parse(email);
  } catch {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, role: true, balance: true, passwordHash: true },
  });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    req.log.warn({ email, ip: req.ip }, 'Failed login attempt');
    recordFailedAttempt(email);
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  recordSuccessfulLogin(email);
  const token = generateToken(user.id);

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 86400000,
    path: '/',
  });

  req.log.info({ email: user.email, userId: user.id }, 'Successful login');
  res.json({
    success: true,
    user: { id: user.id, email: user.email, name: user.name, role: user.role, balance: user.balance },
    token,
  });
});

app.post('/api/auth/logout', authenticateToken, (_req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

app.post('/api/auth/register', async (req, res) => {
  const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6).max(100),
    name: z.string().min(1).max(100).optional(),
  });

  try {
    const data = registerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        name: data.name,
        role: UserRole.USER,
        balance: 0,
      },
    });

    const token = generateToken(user.id);
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 86400000,
    });

    res.status(201).json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, balance: user.balance },
      token,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid registration data', details: error.issues });
    }
    req.log.error(error, 'Registration failed');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/services', async (req, res) => {
  try {
    let page = parseInt(req.query.page as string) || 1;
    let limit = parseInt(req.query.limit as string) || 1000;
    page = Math.max(1, Math.min(page, 1000));
    limit = Math.max(1, Math.min(limit, 1000));

    const entries = await getCachedServices();
    if (!entries || entries.length === 0) {
      return res.json({
        data: [], tiers: { speed: SPEED_TIERS, price: PRICE_TIERS },
        pagination: { page, limit, total: 0, pages: 0 },
      });
    }

    let markup = parseFloat(process.env.PROFI_LIKE_MARKUP_PERCENT || '10');
    if (isNaN(markup)) markup = 10;

    const allItems: any[] = [];

    for (const entry of entries) {
      const providerDef = providerRegistry.find(p => p.id === entry.providerId);
      if (!providerDef) continue;
      for (const s of entry.data as any[]) {
        const name = translateName(s.name);
        const nameOriginal = hasCyrillic(s.name) ? s.name : translateEnToRu(name);
        let rate = parseFloat(s.rate);
        if (providerDef.rateIsPerUnit) rate *= 1000;

        // Filter out free/promo services
        if (rate <= 0 || /free|promo|бесплат|промо/i.test(nameOriginal)) continue;

        const category = normalizeCategory(inferCategory(name, s.category));
        const serviceType = inferServiceType(name);
        const description = genDescription(nameOriginal || name, category, serviceType, providerDef.speedLabel, providerDef.priceTier, s.min, s.max);
        allItems.push({
          id: `${entry.providerId}_${s.service}`,
          name,
          nameOriginal,
          description,
          category,
          serviceType,
          pricePer1k: rate * (1 + markup / 100),
          minOrder: s.min,
          maxOrder: s.max,
          speedLabel: providerDef.speedLabel,
          priceTier: providerDef.priceTier,
          group: s.group || serviceType,
          providerServiceId: String(s.service),
        });
      }
    }

    const total = allItems.length;
    const skip = (page - 1) * limit;
    const items = allItems.slice(skip, skip + limit);

    res.json({
      data: items,
      tiers: { speed: SPEED_TIERS, price: PRICE_TIERS },
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    req.log.error(error, 'Error fetching services');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/balance', authenticateToken, async (req, res) => {
  try {
    const results = await Promise.allSettled(providerRegistry.map(p => p.fetchBalance()));
    let totalBalance = 0;
    for (const r of results) {
      if (r.status === 'fulfilled') totalBalance += parseFloat(r.value.balance || '0');
    }
    res.json({ balance: totalBalance, currency: 'RUB' });
  } catch (error) {
    req.log.error(error, 'Error fetching balance');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/orders', authenticateToken, async (req, res) => {
  const orderSchema = z.object({
    serviceId: z.string().min(1),
    target: z.string().min(3).max(500),
    quantity: z.coerce.number().min(10),
  });

  try {
    // Idempotency check
    const idempotencyKey = req.headers['idempotency-key'] as string;
    if (idempotencyKey) {
      const cached = idempotencyStore.get(idempotencyKey);
      if (cached && Date.now() - cached.timestamp < IDEMPOTENCY_TTL) {
        return res.json(cached.response);
      }
    }

    const data = orderSchema.parse(req.body);

    // Parse serviceId: format is "providerId_serviceNumber"
    const [providerId, rawServiceId] = data.serviceId.split('_');
    const providerServiceId = parseInt(rawServiceId || data.serviceId);
    if (isNaN(providerServiceId)) return res.status(400).json({ error: 'Invalid service ID' });

    const providerDef = providerRegistry.find(p => p.id === providerId);
    if (!providerDef) {
      req.log.error({ providerId }, 'Unknown provider for order');
      return res.status(400).json({ error: 'Invalid provider' });
    }

    const providerResponse = await providerDef.createOrder(String(providerServiceId), data.target, data.quantity);
    if (!providerResponse.order) {
      req.log.error(providerResponse, 'Provider order creation failed');
      return res.status(500).json({ error: 'Failed to create order with provider' });
    }

    // Calculate price from service rate (provider may not return price)
    let orderPrice = parseFloat(providerResponse.price);
    if (isNaN(orderPrice)) {
      // Find service rate from cache
      const cachedEntries = await getCachedServices();
      for (const ce of cachedEntries) {
        if (ce.providerId !== providerId) continue;
        const svc = (ce.data as any[]).find((s: any) => String(s.service) === String(providerServiceId));
        if (svc) {
          let rate = parseFloat(svc.rate);
          if (providerDef.rateIsPerUnit) rate *= 1000;
          orderPrice = rate * data.quantity;
          break;
        }
      }
      if (isNaN(orderPrice)) {
        req.log.error({ providerResponse, providerServiceId }, 'Could not calculate order price');
        return res.status(502).json({ error: 'Could not calculate order price' });
      }
    }

    let markup = parseFloat(process.env.PROFI_LIKE_MARKUP_PERCENT || '10');
    if (isNaN(markup)) markup = 10;
    const finalPrice = orderPrice * (1 + markup / 100);

    const user = req.user!;
    if (user.balance < finalPrice) {
      return res.status(402).json({ error: 'Insufficient balance' });
    }

    const [order] = await prisma.$transaction([
      prisma.order.create({
        data: {
          userId: user.id,
          serviceId: data.serviceId,
          target: data.target,
          quantity: data.quantity,
          price: finalPrice,
          status: OrderStatus.PENDING,
          externalId: `${providerId}:${providerResponse.order}`,
        },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { balance: { decrement: finalPrice } },
      }),
    ]);

    const responseBody = { success: true, orderId: order.id, externalId: providerResponse.order, status: 'PENDING' };

    if (idempotencyKey) {
      idempotencyStore.set(idempotencyKey, { response: responseBody, timestamp: Date.now() });
    }

    req.log.info({ orderId: order.id, externalId: providerResponse.order, userId: user.id }, 'Order created');
    res.json(responseBody);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid order data', details: error.issues });
    }
    req.log.error(error, 'Order creation failed');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
    let take = parseInt(req.query.limit as string) || 50;
    take = Math.max(1, Math.min(take, 100));

    const orders = await prisma.order.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take,
    });

    const ordersWithStatus = await Promise.all(
      orders.map(async (order) => {
        let providerStatus = null;
        if (order.externalId) {
          try {
            const [pid, eid] = order.externalId.split(':');
            providerStatus = await getProviderOrderStatus(pid, parseInt(eid || order.externalId));
          } catch {
            req.log.warn({ externalId: order.externalId }, 'Failed to get provider status');
          }
        }
        return { ...order, providerStatus };
      }),
    );

    res.json(ordersWithStatus);
  } catch (error) {
    req.log.error(error, 'Failed to fetch orders');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/orders/:id/status', authenticateToken, async (req, res) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (!order.externalId) {
      return res.json({ status: order.status, progress: order.progress });
    }

    const [pid, eid] = order.externalId.split(':');
    const providerStatus = await getProviderOrderStatus(pid, parseInt(eid || order.externalId));
    res.json({ status: order.status, progress: order.progress, provider: providerStatus });
  } catch (error) {
    req.log.error(error, 'Failed to fetch order status');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/tiers', (_req, res) => {
  res.json({ speed: SPEED_TIERS, price: PRICE_TIERS });
});

app.get('/api/cache-status', authenticateToken, adminOnly, async (req, res) => {
  res.json({ redis: req.headers['x-forwarded-for'] ? 'behind-proxy' : 'direct', uptime: process.uptime() });
});

// --- Admin ---
app.get('/api/admin/users', authenticateToken, adminOnly, async (req, res) => {
  try {
    let page = parseInt(req.query.page as string) || 1;
    let limit = parseInt(req.query.limit as string) || 50;
    page = Math.max(1, page);
    limit = Math.max(1, Math.min(limit, 200));

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        select: { id: true, email: true, name: true, role: true, balance: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count(),
    ]);

    res.json({
      data: users,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    req.log.error(error, 'Failed to fetch users');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.patch('/api/admin/users/:id/role', authenticateToken, adminOnly, async (req, res) => {
  const schema = z.object({ role: z.nativeEnum(UserRole) });
  try {
    const { role } = schema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role },
      select: { id: true, email: true, name: true, role: true },
    });
    res.json(user);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Invalid role' });
    req.log.error(error, 'Failed to update user role');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/admin/orders', authenticateToken, adminOnly, async (req, res) => {
  try {
    let page = parseInt(req.query.page as string) || 1;
    let limit = parseInt(req.query.limit as string) || 100;
    page = Math.max(1, page);
    limit = Math.max(1, Math.min(limit, 500));

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { user: { select: { email: true, name: true } } },
      }),
      prisma.order.count(),
    ]);

    res.json({ data: orders, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    req.log.error(error, 'Failed to fetch all orders');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/admin/stats', authenticateToken, adminOnly, async (req, res) => {
  try {
    const [userCount, orderCount, activeOrders] = await Promise.all([
      prisma.user.count(),
      prisma.order.count(),
      prisma.order.count({ where: { status: OrderStatus.RUNNING } }),
    ]);
    res.json({ users: userCount, totalOrders: orderCount, activeOrders, uptime: process.uptime() });
  } catch (error) {
    req.log.error(error, 'Failed to fetch admin stats');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/admin/providers', authenticateToken, adminOnly, async (req, res) => {
  try {
    const providers = await prisma.provider.findMany({
      orderBy: { priority: 'asc' },
      select: {
        id: true, name: true, apiUrl: true, isActive: true, priority: true,
        balance: true, minBalanceAlert: true, balanceCurrency: true,
        topUpUrl: true, lastChecked: true, createdAt: true, updatedAt: true,
      },
    });
    res.json(providers);
  } catch (error) {
    req.log.error(error, 'Failed to fetch providers');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

const providerSchema = z.object({
  name: z.string().min(1),
  apiUrl: z.string().url(),
  apiKey: z.string().min(1),
  priority: z.number().int().min(0).optional().default(0),
  minBalanceAlert: z.number().min(0).optional().default(500),
  topUpUrl: z.string().url().optional(),
});

const providerUpdateSchema = providerSchema.partial();

app.post('/api/admin/providers', authenticateToken, adminOnly, async (req, res) => {
  try {
    const data = providerSchema.parse(req.body);
    const provider = await prisma.provider.create({ data });
    res.json(provider);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Invalid provider data', details: error.issues });
    req.log.error(error, 'Failed to create provider');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.patch('/api/admin/providers/:id', authenticateToken, adminOnly, async (req, res) => {
  try {
    const data = providerUpdateSchema.parse(req.body);
    const provider = await prisma.provider.update({ where: { id: req.params.id }, data });
    res.json(provider);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Invalid provider data', details: error.issues });
    req.log.error(error, 'Failed to update provider');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.delete('/api/admin/providers/:id', authenticateToken, adminOnly, async (req, res) => {
  try {
    await prisma.provider.delete({ where: { id: req.params.id } });
    servicesCache = null; // invalidate services cache
    res.json({ success: true });
  } catch (error) {
    req.log.error(error, 'Failed to delete provider');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.patch('/api/admin/providers/:id/toggle', authenticateToken, adminOnly, async (req, res) => {
  try {
    const provider = await prisma.provider.findUnique({ where: { id: req.params.id } });
    if (!provider) return res.status(404).json({ error: 'Provider not found' });

    const updated = await prisma.provider.update({
      where: { id: req.params.id },
      data: { isActive: !provider.isActive },
    });
    servicesCache = null; // invalidate services cache
    res.json({ id: updated.id, name: updated.name, isActive: updated.isActive });
  } catch (error) {
    req.log.error(error, 'Failed to toggle provider');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/admin/providers/:id/check-balance', authenticateToken, adminOnly, async (req, res) => {
  try {
    const provider = await prisma.provider.findUnique({ where: { id: req.params.id } });
    if (!provider) return res.status(404).json({ error: 'Provider not found' });

    const api = axios.create({ baseURL: provider.apiUrl, timeout: 10000 });
    const isIndex = provider.apiUrl.includes('index.php');
    const params = isIndex ? { r: 'v1/user/balance', key: provider.apiKey } : { action: 'balance', key: provider.apiKey };
    const response = await api.get('', { params });
    const balance = parseFloat(response.data?.balance || '0');

    await prisma.provider.update({
      where: { id: provider.id },
      data: { balance, lastChecked: new Date() },
    });

    res.json({ balance, currency: provider.balanceCurrency, lastChecked: new Date() });
  } catch (error) {
    req.log.error(error, 'Failed to check provider balance');
    res.status(502).json({ error: 'Failed to connect to provider' });
  }
});

app.post('/api/admin/providers/check-all-balances', authenticateToken, adminOnly, async (req, res) => {
  try {
    const providers = await prisma.provider.findMany({ where: { isActive: true } });
    const results = await Promise.all(
      providers.map(async (provider) => {
        try {
          const api = axios.create({ baseURL: provider.apiUrl, timeout: 10000 });
          const isIndex = provider.apiUrl.includes('index.php');
          const params = isIndex ? { r: 'v1/user/balance', key: provider.apiKey } : { action: 'balance', key: provider.apiKey };
          const response = await api.get('', { params });
          const balance = parseFloat(response.data?.balance || '0');

          await prisma.provider.update({
            where: { id: provider.id },
            data: { balance, lastChecked: new Date() },
          });

          if (balance < provider.minBalanceAlert) {
            req.log.warn({ provider: provider.name, balance, minAlert: provider.minBalanceAlert }, 'Low balance on provider');
          }

          return { id: provider.id, name: provider.name, balance, status: 'ok' };
        } catch {
          req.log.error({ provider: provider.name }, 'Balance check failed');
          return { id: provider.id, name: provider.name, status: 'error' };
        }
      }),
    );

    res.json({ results, checkedAt: new Date() });
  } catch (error) {
    req.log.error(error, 'Failed to check all balances');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// --- Auto balance check (recursive setTimeout) ---
const checkAllBalances = async () => {
  try {
    const providers = await prisma.provider.findMany({ where: { isActive: true } });
    await Promise.all(
      providers.map(async (provider) => {
        try {
          const api = axios.create({ baseURL: provider.apiUrl, timeout: 10000 });
          const isIndex = provider.apiUrl.includes('index.php');
          const params = isIndex ? { r: 'v1/user/balance', key: provider.apiKey } : { action: 'balance', key: provider.apiKey };
          const response = await api.get('', { params });
          const balance = parseFloat(response.data?.balance || '0');

          await prisma.provider.update({
            where: { id: provider.id },
            data: { balance, lastChecked: new Date() },
          });

          if (balance < provider.minBalanceAlert) {
            logger.warn({ provider: provider.name, balance, minAlert: provider.minBalanceAlert }, 'Low provider balance!');
          }
        } catch {
          logger.error({ provider: provider.name }, 'Auto balance check failed');
        }
      }),
    );
  } catch (error) {
    logger.error(error, 'Auto balance check error');
  } finally {
    setTimeout(checkAllBalances, 10 * 60 * 1000);
  }
};

// --- Vite / Static ---
async function startServer() {
  // Seed inside startServer, not as module side-effect
  await seedDefaultProvider();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    req.log.error({ err, method: req.method, path: req.path, ip: req.ip, userAgent: req.get('user-agent') }, 'Unhandled error');
    const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message;
    res.status(err.status || 500).json({
      error: message,
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    });
  });

  process.on('uncaughtException', (err) => {
    logger.fatal(err, 'Uncaught exception - shutting down');
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    logger.fatal({ reason }, 'Unhandled rejection - shutting down');
    process.exit(1);
  });

  const server = app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Boost Hive Terminal running at http://localhost:${PORT}`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, shutting down gracefully...`);
    server.close(async () => {
      logger.info('HTTP server closed');
      await prisma.$disconnect();
      logger.info('Database connections closed');
      process.exit(0);
    });
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Start auto balance checks after server is ready
  setTimeout(checkAllBalances, 10 * 60 * 1000);
}

// --- Seed default provider ---
const seedDefaultProvider = async () => {
  for (const def of providerRegistry) {
    const existing = await prisma.provider.findFirst({ where: { apiUrl: { contains: def.id === 'profi' ? 'profi-like' : def.id } } });
    if (existing) continue;

    await prisma.provider.create({
      data: {
        name: def.id === 'profi' ? 'Profi-like' : 'Sexy-SMM',
        apiUrl: def.id === 'profi'
          ? (process.env.PROFI_LIKE_API_URL || 'https://api.profi-like.ru/v1')
          : (process.env.SEXY_SMM_API_URL || 'https://sexy-smm.ru/api/index.php'),
        apiKey: def.id === 'profi' ? process.env.PROFI_LIKE_API_KEY! : process.env.SEXY_SMM_API_KEY!,
        priority: def.id === 'profi' ? 0 : 1,
        minBalanceAlert: 500,
        balanceCurrency: def.id === 'profi' ? 'USD' : 'RUB',
        topUpUrl: def.id === 'profi' ? 'https://profi-like.ru/deposit' : null,
      },
    });
    logger.info(`Provider ${def.id} seeded from env vars`);
  }
};

startServer();
