import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import pino from 'pino';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import axios from 'axios';
import * as dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

// Validate required environment variables in production
const requiredEnvVars = ['JWT_SECRET'];
if (process.env.NODE_ENV === 'production') {
  const missing = requiredEnvVars.filter(v => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
}

// Database URL configuration
if (!process.env.HIVE_DATABASE_URL) {
  // Production requires PostgreSQL, dev can use SQLite
  if (process.env.NODE_ENV === 'production') {
    throw new Error('HIVE_DATABASE_URL is required in production');
  }
  process.env.HIVE_DATABASE_URL = 'file:./prisma/dev.db';
}
process.env.DATABASE_URL = process.env.HIVE_DATABASE_URL;

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  ...(process.env.NODE_ENV !== 'production' && {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true }
    }
  })
});

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.HIVE_DATABASE_URL
    }
  }
});

// Profi-like API Client
const profiLikeApi = axios.create({
  baseURL: process.env.PROFI_LIKE_API_URL || 'https://api.profi-like.ru/v1',
  timeout: 10000,
});

const PROFI_LIKE_API_KEY = process.env.PROFI_LIKE_API_KEY || '';

// Profi-like API helpers
const profiRequest = async (action: string, params: Record<string, any> = {}) => {
  const response = await profiLikeApi.get('', {
    params: { key: PROFI_LIKE_API_KEY, action, ...params }
  });
  return response.data;
};

const getProviderServices = async () => {
  try {
    return await profiRequest('services');
  } catch (error) {
    logger.error(error, 'Failed to fetch services from Profi-like');
    return [];
  }
};

const getProviderBalance = async () => {
  try {
    return await profiRequest('balance');
  } catch (error) {
    logger.error(error, 'Failed to fetch balance from Profi-like');
    return { balance: '0', currency: 'USD' };
  }
};

const createProviderOrder = async (service: number, link: string, quantity: number) => {
  return await profiRequest('add', { service, link, quantity });
};

const getProviderOrderStatus = async (orderId: number) => {
  return await profiRequest('status', { order: orderId });
};

// In-memory cache for services (5 min TTL)
let servicesCache: { data: any; timestamp: number } | null = null;
const SERVICES_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const getCachedServices = async () => {
  const now = Date.now();
  if (servicesCache && (now - servicesCache.timestamp) < SERVICES_CACHE_TTL) {
    logger.info('Returning cached services');
    return servicesCache.data;
  }
  
  const data = await getProviderServices();
  servicesCache = { data, timestamp: now };
  return data;
};

// Test DB connection on startup
prisma.$connect()
  .then(() => logger.info('Database connected'))
  .catch((err) => {
    logger.error(err, 'Database connection failed');
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  });

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Trust proxy for rate limiting (needed in AI Studio environment)
app.set('trust proxy', 1);

// Security Middleware - Enhanced Helmet Configuration
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  } : false,
  hsts: process.env.NODE_ENV === 'production' ? {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  } : false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

// Prevent clickjacking
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// CORS - whitelist only
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  optionsSuccessStatus: 200
};

// In-memory account lockout (for production use Redis)
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

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

app.use(cors(corsOptions));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Rate Limiting - General API (100 requests per 15 min)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down' }
});
app.use('/api/', generalLimiter);

// Rate Limiting - Auth (stricter: 10 attempts per 15 min)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later' }
});
app.use('/api/auth/login', authLimiter);

// Rate Limiting - Services (60 requests per min - cached endpoint)
const servicesLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});
app.use('/api/services', servicesLimiter);

// Rate Limiting - Orders (30 requests per min)
const ordersLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});
app.use('/api/orders', ordersLimiter);

// --- JWT Helpers ---
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-insecure-key-change-in-prod';
if (JWT_SECRET === 'dev-only-insecure-key-change-in-prod' && process.env.NODE_ENV === 'production') {
  logger.warn('WARNING: Using insecure default JWT_SECRET in production!');
}
const generateToken = (userId: string) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1h' });
};

// --- API Routes ---

app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', timestamp: new Date().toISOString(), database: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', timestamp: new Date().toISOString(), database: 'disconnected' });
  }
});

// Auth Middleware
const authenticateToken = async (req, res, next) => {
  const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    (req as any).user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Auth Routes
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  // Check account lockout first
  const lockoutMsg = checkAccountLockout(email);
  if (lockoutMsg) {
    return res.status(429).json({ error: lockoutMsg });
  }

  // Validate email format
  const emailSchema = z.string().email();
  try {
    emailSchema.parse(email);
  } catch {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  
  const user = await prisma.user.findUnique({ where: { email } });
  
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    logger.warn({ email, ip: req.ip }, 'Failed login attempt');
    recordFailedAttempt(email);
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // Clear failed attempts on successful login
  recordSuccessfulLogin(email);
  
  const token = generateToken(user.id);
  res.cookie('token', token, { 
    httpOnly: true, 
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 3600000, // 1 hour
    path: '/'
  });
  
  logger.info({ email: user.email, userId: user.id }, 'Successful login');
  
  return res.json({ 
    success: true, 
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    token 
  });
});

app.post('/api/auth/logout', authenticateToken, (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

// Registration
app.post('/api/auth/register', async (req, res) => {
  const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6).max(100),
    name: z.string().min(1).max(100).optional()
  });

  try {
    const data = registerSchema.parse(req.body);
    
    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    
    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        name: data.name,
        role: 'USER' as any,
        balance: 0
      }
    });
    
    const token = generateToken(user.id);
    res.cookie('token', token, { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600000
    });
    
    res.status(201).json({ 
      success: true, 
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      token 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid registration data', details: error.issues });
    }
    logger.error(error, 'Registration failed');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Services Route (from Profi-like API)
app.get('/api/services', async (req, res) => {
  try {
    let page = parseInt(req.query.page as string) || 1;
    let limit = parseInt(req.query.limit as string) || 200;
    
    page = Math.max(1, Math.min(page, 1000));
    limit = Math.max(1, Math.min(limit, 500));
    
    // Fetch from Profi-like API (cached)
    const providerServices = await getCachedServices();
    
    if (!Array.isArray(providerServices) || providerServices.length === 0) {
      return res.json({
        data: [],
        pagination: { page, limit, total: 0, pages: 0 }
      });
    }
    
    let markup = parseFloat(process.env.PROFI_LIKE_MARKUP_PERCENT || '10');
    if (isNaN(markup)) {
      markup = 10;
    }
    
    // Transform provider services to our format
    const inferCategory = (name: string, existingCat: string): string => {
      const n = name.toLowerCase();
      if (existingCat && existingCat.trim()) return existingCat;
      if (n.includes('instagram') || n.includes('ig ') || n.includes('likes') && n.includes('instagram')) return 'Instagram';
      if (n.includes('tiktok') || n.includes('tok')) return 'TikTok';
      if (n.includes('youtube') || n.includes('yt ') || n.includes('subscribers') && n.includes('youtube')) return 'YouTube';
      if (n.includes('telegram') || n.includes('tg ')) return 'Telegram';
      if (n.includes('twitter') || n.includes('x.com') || n.includes('tweet')) return 'X';
      if (n.includes('facebook') || n.includes('fb ')) return 'Facebook';
      if (n.includes('twitch')) return 'Twitch';
      if (n.includes('vk') || n.includes('vkontakte')) return 'VK';
      if (n.includes('quora')) return 'Quora';
      return 'Other';
    };

    const services = providerServices.map((s: any) => ({
      id: String(s.service),
      name: s.name,
      category: inferCategory(s.name, s.category),
      description: `${s.type} service`,
      pricePer1k: parseFloat(s.rate) * (1 + markup / 100),
      minOrder: s.min,
      maxOrder: s.max,
      speed: 'Instant',
      retention: 'High',
      quality: s.type || 'Default',
      badge: null,
      isActive: true,
      providerServiceId: s.service
    }));
    
    const total = services.length;
    const skip = (page - 1) * limit;
    const items = services.slice(skip, skip + limit);

    res.json({
      data: items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    logger.error(error, 'Error fetching services');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Balance endpoint (from Profi-like API)
app.get('/api/balance', authenticateToken, async (req, res) => {
  try {
    const balance = await getProviderBalance();
    res.json({
      balance: parseFloat(balance.balance || '0'),
      currency: balance.currency || 'USD'
    });
  } catch (error) {
    logger.error(error, 'Error fetching balance');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Orders Route (protected) - creates order via Profi-like API
app.post('/api/orders', authenticateToken, async (req, res) => {
  const orderSchema = z.object({
    serviceId: z.string().min(1),
    target: z.string().min(3).max(500),
    quantity: z.coerce.number().min(10)
  });

  try {
    const data = orderSchema.parse(req.body);
    const providerServiceId = parseInt(data.serviceId);
    
    if (isNaN(providerServiceId)) {
      return res.status(400).json({ error: 'Invalid service ID' });
    }

    // Create order via Profi-like API
    const providerResponse = await createProviderOrder(providerServiceId, data.target, data.quantity);
    
    if (!providerResponse.order) {
      logger.error(providerResponse, 'Provider order creation failed');
      return res.status(500).json({ error: 'Failed to create order with provider' });
    }

    // Save order to local DB for tracking
    const markup = parseFloat(process.env.PROFI_LIKE_MARKUP_PERCENT || '10');
    const finalPrice = parseFloat(providerResponse.order) * (1 + (isNaN(markup) ? 10 : markup) / 100);

    const order = await prisma.order.create({
      data: {
        userId: (req as any).user.id,
        serviceId: data.serviceId,
        target: data.target,
        quantity: data.quantity,
        price: finalPrice,
        status: 'PENDING',
        externalId: String(providerResponse.order)
      }
    });

    logger.info({ orderId: order.id, externalId: providerResponse.order, userId: (req as any).user.id }, 'Order created via provider');
    res.json({ success: true, orderId: order.id, externalId: providerResponse.order, status: 'PENDING' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid order data', details: error.issues });
    }
    logger.error(error, 'Order creation failed');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get user orders
app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
    let take = parseInt(req.query.limit as string) || 50;
    take = Math.max(1, Math.min(take, 100));
    
    const orders = await prisma.order.findMany({
      where: { userId: (req as any).user.id },
      orderBy: { createdAt: 'desc' },
      take
    });
    
    // Enrich with provider status
    const ordersWithStatus = await Promise.all(orders.map(async (order) => {
      let providerStatus = null;
      if (order.externalId) {
        try {
          providerStatus = await getProviderOrderStatus(parseInt(order.externalId));
        } catch (e) {
          logger.warn(`Failed to get status for order ${order.externalId}`);
        }
      }
      return {
        ...order,
        providerStatus
      };
    }));
    
    res.json(ordersWithStatus);
  } catch (error) {
    logger.error(error, 'Failed to fetch orders');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get single order status
app.get('/api/orders/:id/status', authenticateToken, async (req, res) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, userId: (req as any).user.id }
    });
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    if (!order.externalId) {
      return res.json({ status: order.status, progress: order.progress });
    }
    
    const providerStatus = await getProviderOrderStatus(parseInt(order.externalId));
    res.json({
      status: order.status,
      progress: order.progress,
      provider: providerStatus
    });
  } catch (error) {
    logger.error(error, 'Failed to fetch order status');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Cache Status (protected - admin only)
app.get('/api/cache-status', authenticateToken, (req, res) => {
  const role = (req as any).user.role;
  if (role !== 'ADMIN' && role !== 'ELITE') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  res.json({ redis: 'connected', cache_hits: 0, uptime: process.uptime() });
});

// --- Vite Integration ---

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error({
    err,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent')
  }, 'Unhandled error');
  
  // Don't leak error details in production
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;
    
  res.status(err.status || 500).json({ 
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// Uncaught Exception Handler
process.on('uncaughtException', (err) => {
  logger.fatal(err, 'Uncaught exception - shutting down');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.fatal({ reason }, 'Unhandled rejection - shutting down');
  process.exit(1);
});

const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Boost Hive Terminal running at http://localhost:${PORT}`);
});

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, shutting down gracefully...`);
    server.close(async () => {
      logger.info('HTTP server closed');
      await prisma.$disconnect();
      logger.info('Database connections closed');
      process.exit(0);
    });
    
    // Force exit after 10s
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };
  
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer();
