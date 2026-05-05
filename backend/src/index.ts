import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const app = express();
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const prisma = new PrismaClient();

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Readiness probe: checks DB connectivity
app.get('/readiness', async (_req, res) => {
  try {
    await (prisma as any).$queryRaw`SELECT 1`;
    res.json({ ready: true });
  } catch (e) {
    console.error('Readiness check failed', e);
    res.status(503).json({ ready: false, error: String(e) });
  }
});

// List services (from DB, with simple fallback if needed)
app.get('/api/services', async (_req, res) => {
  try {
    const services = await prisma.service.findMany();
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch services', details: String(err) });
  }
});

// Create an order (very basic) and calculate price
app.post('/api/orders', async (req, res) => {
  const { serviceId, target, quantity } = req.body;
  if (!serviceId || !quantity) {
    return res.status(400).json({ error: 'serviceId and quantity are required' });
  }
  try {
    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    const price = (quantity / 1000) * (service.pricePer1k ?? 0);
    const order = await prisma.order.create({
      data: {
        serviceId,
        target,
        quantity,
        price,
        status: 'PENDING'
      }
    });
    res.json({ id: order.id, status: order.status, price: order.price });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create order', details: String(err) });
  }
});

app.get('/api/orders/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch order', details: String(err) });
  }
});

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});

export default app;
