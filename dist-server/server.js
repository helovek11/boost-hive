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
process.env.DATABASE_URL ||= process.env.HIVE_DATABASE_URL;
const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    ...(process.env.NODE_ENV !== 'production' && {
        transport: { target: 'pino-pretty', options: { colorize: true } },
    }),
});
const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});
// --- Provider API ---
const profiLikeApi = axios.create({
    baseURL: process.env.PROFI_LIKE_API_URL || 'https://api.profi-like.ru/v1',
    timeout: 5000,
});
const PROFI_LIKE_API_KEY = process.env.PROFI_LIKE_API_KEY;
const profiRequest = async (action, params = {}) => {
    const response = await profiLikeApi.get('', {
        params: { action, ...params },
        headers: { 'X-API-Key': PROFI_LIKE_API_KEY },
    });
    return response.data;
};
const getProviderBalance = () => profiRequest('balance');
const getProviderOrderStatus = (orderId) => profiRequest('status', { order: orderId });
// --- Services cache with lock ---
let servicesCache = null;
let servicesCacheLock = null;
const SERVICES_CACHE_TTL = 5 * 60 * 1000;
const getCachedServices = async () => {
    const now = Date.now();
    if (servicesCache && now - servicesCache.timestamp < SERVICES_CACHE_TTL) {
        return servicesCache.data;
    }
    if (servicesCacheLock) {
        return servicesCacheLock;
    }
    servicesCacheLock = (async () => {
        try {
            const response = await profiRequest('services');
            servicesCache = { data: Array.isArray(response) ? response : [], timestamp: Date.now() };
            return servicesCache.data;
        }
        finally {
            servicesCacheLock = null;
        }
    })();
    return servicesCacheLock;
};
// --- DB connection ---
let dbConnected = false;
prisma.$connect()
    .then(() => { dbConnected = true; logger.info('Database connected'); })
    .catch((err) => {
    logger.error(err, 'Database connection failed');
    if (process.env.NODE_ENV === 'production')
        process.exit(1);
});
const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
app.set('trust proxy', 1);
app.use(compression());
app.use(helmet({
    contentSecurityPolicy: {
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
    },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
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
const userBuckets = new Map();
const USER_MAX_TOKENS = 3;
const USER_REFILL_MS = 1000;
setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of userBuckets) {
        if (bucket.refillAt < now)
            userBuckets.delete(key);
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
const loginAttempts = new Map();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000;
const checkAccountLockout = (email) => {
    const attempt = loginAttempts.get(email.toLowerCase());
    if (attempt && attempt.lockedUntil > Date.now()) {
        const remaining = Math.ceil((attempt.lockedUntil - Date.now()) / 1000 / 60);
        return `Account locked. Try again in ${remaining} minutes`;
    }
    return null;
};
const recordFailedAttempt = (email) => {
    const key = email.toLowerCase();
    const attempt = loginAttempts.get(key) || { count: 0, lockedUntil: 0 };
    attempt.count += 1;
    if (attempt.count >= MAX_LOGIN_ATTEMPTS) {
        attempt.lockedUntil = Date.now() + LOCKOUT_DURATION;
        logger.warn({ email: key, attempts: attempt.count }, 'Account locked due to failed attempts');
    }
    loginAttempts.set(key, attempt);
};
const recordSuccessfulLogin = (email) => {
    loginAttempts.delete(email.toLowerCase());
};
// --- JWT ---
const JWT_SECRET = process.env.JWT_SECRET;
const generateToken = (userId) => jwt.sign({ userId }, JWT_SECRET, { expiresIn: '24h' });
// --- Middleware ---
const authenticateToken = async (req, res, next) => {
    const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
    if (!token)
        return res.status(401).json({ error: 'Authentication required' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, email: true, name: true, role: true, balance: true },
        });
        if (!user)
            return res.status(401).json({ error: 'User not found' });
        req.user = user;
        next();
    }
    catch {
        res.status(401).json({ error: 'Invalid token' });
    }
};
const adminOnly = (req, res, next) => {
    if (req.user?.role !== UserRole.ADMIN && req.user?.role !== UserRole.ELITE) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};
// --- Helpers ---
const CATEGORY_MAP = [
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
const inferCategory = (name, existingCat) => {
    const n = name.toLowerCase();
    if (existingCat && existingCat.trim())
        return existingCat;
    for (const [keywords, category] of CATEGORY_MAP) {
        if (keywords.some(kw => n.includes(kw)))
            return category;
    }
    return 'Other';
};
const SERVICE_TYPE_MAP = [
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
const inferServiceType = (name) => {
    const n = name.toLowerCase();
    for (const [keywords, type] of SERVICE_TYPE_MAP) {
        if (keywords.some(kw => n.includes(kw)))
            return type;
    }
    return 'Other';
};
// --- Idempotency store ---
const idempotencyStore = new Map();
const IDEMPOTENCY_TTL = 24 * 60 * 60 * 1000;
setInterval(() => {
    const now = Date.now();
    for (const [key, val] of idempotencyStore) {
        if (val.timestamp < now)
            idempotencyStore.delete(key);
    }
}, 3600000);
// --- Routes ---
app.get('/health', async (req, res) => {
    try {
        await prisma.$queryRaw `SELECT 1`;
        res.json({ status: 'ok', timestamp: new Date().toISOString(), database: 'connected' });
    }
    catch {
        res.status(503).json({ status: 'unhealthy', timestamp: new Date().toISOString(), database: 'disconnected' });
    }
});
app.get('/api/auth/me', authenticateToken, (req, res) => {
    const { id, email, name, role, balance } = req.user;
    res.json({ id, email, name, role, balance });
});
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ error: 'Email and password required' });
    const lockoutMsg = checkAccountLockout(email);
    if (lockoutMsg)
        return res.status(429).json({ error: lockoutMsg });
    try {
        z.string().email().parse(email);
    }
    catch {
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
        if (existing)
            return res.status(409).json({ error: 'Email already registered' });
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
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid registration data', details: error.issues });
        }
        req.log.error(error, 'Registration failed');
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.get('/api/services', async (req, res) => {
    try {
        let page = parseInt(req.query.page) || 1;
        let limit = parseInt(req.query.limit) || 200;
        page = Math.max(1, Math.min(page, 1000));
        limit = Math.max(1, Math.min(limit, 500));
        const providerServices = await getCachedServices();
        if (!Array.isArray(providerServices) || providerServices.length === 0) {
            return res.json({ data: [], pagination: { page, limit, total: 0, pages: 0 } });
        }
        let markup = parseFloat(process.env.PROFI_LIKE_MARKUP_PERCENT || '10');
        if (isNaN(markup))
            markup = 10;
        const total = providerServices.length;
        const skip = (page - 1) * limit;
        const items = providerServices.slice(skip, skip + limit).map((s) => {
            const category = inferCategory(s.name, s.category);
            const serviceType = inferServiceType(s.name);
            return {
                id: String(s.service),
                name: s.name,
                category,
                serviceType,
                description: `${category} ${serviceType} — ${s.type || 'Standard'} quality`,
                pricePer1k: parseFloat(s.rate) * (1 + markup / 100),
                minOrder: s.min,
                maxOrder: s.max,
                speed: 'Instant',
                retention: 'High',
                quality: s.type || 'Default',
                badge: null,
                isActive: true,
                providerServiceId: s.service,
            };
        });
        res.json({ data: items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
    }
    catch (error) {
        req.log.error(error, 'Error fetching services');
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.get('/api/balance', authenticateToken, async (req, res) => {
    try {
        const balance = await getProviderBalance();
        res.json({ balance: parseFloat(balance.balance || '0'), currency: balance.currency || 'USD' });
    }
    catch (error) {
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
        const idempotencyKey = req.headers['idempotency-key'];
        if (idempotencyKey) {
            const cached = idempotencyStore.get(idempotencyKey);
            if (cached && Date.now() - cached.timestamp < IDEMPOTENCY_TTL) {
                return res.json(cached.response);
            }
        }
        const data = orderSchema.parse(req.body);
        const providerServiceId = parseInt(data.serviceId);
        if (isNaN(providerServiceId))
            return res.status(400).json({ error: 'Invalid service ID' });
        const providerResponse = await profiRequest('add', { service: providerServiceId, link: data.target, quantity: data.quantity });
        if (!providerResponse.order) {
            req.log.error(providerResponse, 'Provider order creation failed');
            return res.status(500).json({ error: 'Failed to create order with provider' });
        }
        const orderPrice = parseFloat(providerResponse.price);
        if (isNaN(orderPrice)) {
            req.log.error({ providerResponse }, 'Provider did not return a valid price');
            return res.status(502).json({ error: 'Provider returned invalid price' });
        }
        let markup = parseFloat(process.env.PROFI_LIKE_MARKUP_PERCENT || '10');
        if (isNaN(markup))
            markup = 10;
        const finalPrice = orderPrice * (1 + markup / 100);
        const user = req.user;
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
                    externalId: String(providerResponse.order),
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
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid order data', details: error.issues });
        }
        req.log.error(error, 'Order creation failed');
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.get('/api/orders', authenticateToken, async (req, res) => {
    try {
        let take = parseInt(req.query.limit) || 50;
        take = Math.max(1, Math.min(take, 100));
        const orders = await prisma.order.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' },
            take,
        });
        const ordersWithStatus = await Promise.all(orders.map(async (order) => {
            let providerStatus = null;
            if (order.externalId) {
                try {
                    providerStatus = await getProviderOrderStatus(parseInt(order.externalId));
                }
                catch {
                    req.log.warn({ externalId: order.externalId }, 'Failed to get provider status');
                }
            }
            return { ...order, providerStatus };
        }));
        res.json(ordersWithStatus);
    }
    catch (error) {
        req.log.error(error, 'Failed to fetch orders');
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.get('/api/orders/:id/status', authenticateToken, async (req, res) => {
    try {
        const order = await prisma.order.findFirst({
            where: { id: req.params.id, userId: req.user.id },
        });
        if (!order)
            return res.status(404).json({ error: 'Order not found' });
        if (!order.externalId) {
            return res.json({ status: order.status, progress: order.progress });
        }
        const providerStatus = await getProviderOrderStatus(parseInt(order.externalId));
        res.json({ status: order.status, progress: order.progress, provider: providerStatus });
    }
    catch (error) {
        req.log.error(error, 'Failed to fetch order status');
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.get('/api/cache-status', authenticateToken, adminOnly, async (req, res) => {
    res.json({ redis: req.headers['x-forwarded-for'] ? 'behind-proxy' : 'direct', uptime: process.uptime() });
});
// --- Admin ---
app.get('/api/admin/users', authenticateToken, adminOnly, async (req, res) => {
    try {
        let page = parseInt(req.query.page) || 1;
        let limit = parseInt(req.query.limit) || 50;
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
    }
    catch (error) {
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
    }
    catch (error) {
        if (error instanceof z.ZodError)
            return res.status(400).json({ error: 'Invalid role' });
        req.log.error(error, 'Failed to update user role');
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.get('/api/admin/orders', authenticateToken, adminOnly, async (req, res) => {
    try {
        let page = parseInt(req.query.page) || 1;
        let limit = parseInt(req.query.limit) || 100;
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
    }
    catch (error) {
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
    }
    catch (error) {
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
    }
    catch (error) {
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
    }
    catch (error) {
        if (error instanceof z.ZodError)
            return res.status(400).json({ error: 'Invalid provider data', details: error.issues });
        req.log.error(error, 'Failed to create provider');
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.patch('/api/admin/providers/:id', authenticateToken, adminOnly, async (req, res) => {
    try {
        const data = providerUpdateSchema.parse(req.body);
        const provider = await prisma.provider.update({ where: { id: req.params.id }, data });
        res.json(provider);
    }
    catch (error) {
        if (error instanceof z.ZodError)
            return res.status(400).json({ error: 'Invalid provider data', details: error.issues });
        req.log.error(error, 'Failed to update provider');
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.delete('/api/admin/providers/:id', authenticateToken, adminOnly, async (req, res) => {
    try {
        await prisma.provider.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    }
    catch (error) {
        req.log.error(error, 'Failed to delete provider');
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.post('/api/admin/providers/:id/check-balance', authenticateToken, adminOnly, async (req, res) => {
    try {
        const provider = await prisma.provider.findUnique({ where: { id: req.params.id } });
        if (!provider)
            return res.status(404).json({ error: 'Provider not found' });
        const api = axios.create({ baseURL: provider.apiUrl, timeout: 10000 });
        const response = await api.get('', {
            params: { action: 'balance' },
            headers: { 'X-API-Key': provider.apiKey },
        });
        const balance = parseFloat(response.data?.balance || '0');
        await prisma.provider.update({
            where: { id: provider.id },
            data: { balance, lastChecked: new Date() },
        });
        res.json({ balance, currency: provider.balanceCurrency, lastChecked: new Date() });
    }
    catch (error) {
        req.log.error(error, 'Failed to check provider balance');
        res.status(502).json({ error: 'Failed to connect to provider' });
    }
});
app.post('/api/admin/providers/check-all-balances', authenticateToken, adminOnly, async (req, res) => {
    try {
        const providers = await prisma.provider.findMany({ where: { isActive: true } });
        const results = await Promise.all(providers.map(async (provider) => {
            try {
                const api = axios.create({ baseURL: provider.apiUrl, timeout: 10000 });
                const response = await api.get('', {
                    params: { action: 'balance' },
                    headers: { 'X-API-Key': provider.apiKey },
                });
                const balance = parseFloat(response.data?.balance || '0');
                await prisma.provider.update({
                    where: { id: provider.id },
                    data: { balance, lastChecked: new Date() },
                });
                if (balance < provider.minBalanceAlert) {
                    req.log.warn({ provider: provider.name, balance, minAlert: provider.minBalanceAlert }, 'Low balance on provider');
                }
                return { id: provider.id, name: provider.name, balance, status: 'ok' };
            }
            catch {
                req.log.error({ provider: provider.name }, 'Balance check failed');
                return { id: provider.id, name: provider.name, status: 'error' };
            }
        }));
        res.json({ results, checkedAt: new Date() });
    }
    catch (error) {
        req.log.error(error, 'Failed to check all balances');
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
// --- Auto balance check (recursive setTimeout) ---
const checkAllBalances = async () => {
    try {
        const providers = await prisma.provider.findMany({ where: { isActive: true } });
        await Promise.all(providers.map(async (provider) => {
            try {
                const api = axios.create({ baseURL: provider.apiUrl, timeout: 10000 });
                const response = await api.get('', {
                    params: { action: 'balance' },
                    headers: { 'X-API-Key': provider.apiKey },
                });
                const balance = parseFloat(response.data?.balance || '0');
                await prisma.provider.update({
                    where: { id: provider.id },
                    data: { balance, lastChecked: new Date() },
                });
                if (balance < provider.minBalanceAlert) {
                    logger.warn({ provider: provider.name, balance, minAlert: provider.minBalanceAlert }, 'Low provider balance!');
                }
            }
            catch {
                logger.error({ provider: provider.name }, 'Auto balance check failed');
            }
        }));
    }
    catch (error) {
        logger.error(error, 'Auto balance check error');
    }
    finally {
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
    }
    else {
        app.use(express.static(path.join(__dirname, 'dist')));
        app.get('*', (_req, res) => {
            res.sendFile(path.join(__dirname, 'dist', 'index.html'));
        });
    }
    app.use((err, req, res, _next) => {
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
    const shutdown = async (signal) => {
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
    const apiKey = process.env.PROFI_LIKE_API_KEY;
    const apiUrl = process.env.PROFI_LIKE_API_URL;
    if (!apiKey || !apiUrl)
        return;
    const existing = await prisma.provider.findFirst({ where: { apiUrl } });
    if (existing)
        return;
    await prisma.provider.create({
        data: {
            name: 'Profi-like',
            apiUrl,
            apiKey,
            priority: 0,
            minBalanceAlert: 500,
            balanceCurrency: 'RUB',
            topUpUrl: 'https://profi-like.ru/deposit',
        },
    });
    logger.info('Default provider seeded from env vars');
};
startServer();
