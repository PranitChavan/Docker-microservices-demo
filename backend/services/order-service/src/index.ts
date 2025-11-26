import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import axios from 'axios';
import amqp from 'amqplib';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const OrderStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
} as const;

type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3004;
const CART_SERVICE_URL = process.env.CART_SERVICE_URL || 'http://localhost:3003';
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002';
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://admin:admin@localhost:5672';

// Initialize Prisma Client
const prisma = new PrismaClient();

// Connect to database
prisma
  .$connect()
  .then(() => console.log('✅ Connected to PostgreSQL'))
  .catch((err: any) => console.error('❌ Database connection error:', err));

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

// RabbitMQ connection
let rabbitmqChannel: amqp.Channel | null = null;

// Connect to RabbitMQ
async function connectRabbitMQ() {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    rabbitmqChannel = await connection.createChannel();
    await rabbitmqChannel.assertQueue('order_notifications', { durable: true });
    console.log('✅ Connected to RabbitMQ');
  } catch (error) {
    console.error('❌ RabbitMQ connection error:', error);
    console.log('⏳ Retrying in 5 seconds...');
    setTimeout(connectRabbitMQ, 5000);
  }
}

connectRabbitMQ();

// Middleware: Extract user ID
const getUserId = (req: Request, res: Response, next: NextFunction) => {
  const userId = (req.headers['x-user-id'] as string) || 'user123';
  (req as any).userId = userId;
  next();
};

// Helper: Publish event to RabbitMQ
async function publishEvent(eventType: string, data: any) {
  if (rabbitmqChannel) {
    try {
      const message = JSON.stringify({ eventType, data, timestamp: new Date() });
      rabbitmqChannel.sendToQueue('order_notifications', Buffer.from(message), {
        persistent: true,
      });
      console.log(`📤 Published event: ${eventType}`);
    } catch (error) {
      console.error('Error publishing event:', error);
    }
  }
}

// Health check
app.get('/health', async (req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'healthy',
      service: 'order-service',
      database: 'connected',
      rabbitmq: rabbitmqChannel ? 'connected' : 'disconnected',
      timestamp: new Date(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      service: 'order-service',
      database: 'disconnected',
    });
  }
});

// Create order (checkout)
app.post('/orders', getUserId, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { shippingAddress, paymentMethod } = req.body;

    // Validate shipping address
    if (!shippingAddress || !shippingAddress.street || !shippingAddress.city) {
      return res.status(400).json({ error: 'Valid shipping address is required' });
    }

    if (!paymentMethod) {
      return res.status(400).json({ error: 'Payment method is required' });
    }

    // Get cart from Cart Service
    const cartResponse = await axios.get(`${CART_SERVICE_URL}/cart`, {
      headers: { 'x-user-id': userId },
    });

    const cart = cartResponse.data;

    // Check if cart is empty
    if (!cart.items || cart.items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // Verify stock for all items
    for (const item of cart.items) {
      const stockResponse = await axios.get(`${PRODUCT_SERVICE_URL}/products/${item.productId}/stock`);

      if (!stockResponse.data.available || stockResponse.data.stock < item.quantity) {
        return res.status(400).json({
          error: `Insufficient stock for ${item.name}`,
          product: item.name,
          requested: item.quantity,
          available: stockResponse.data.stock,
        });
      }
    }

    // Create order with items in database
    const newOrder = await prisma.order.create({
      data: {
        userId,
        total: cart.total,
        status: OrderStatus.PENDING,
        shippingAddress: shippingAddress,
        paymentMethod,
        items: {
          create: cart.items.map((item: any) => ({
            productId: item.productId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    // Clear cart
    await axios.delete(`${CART_SERVICE_URL}/cart`, {
      headers: { 'x-user-id': userId },
    });

    // Publish order created event
    await publishEvent('order_created', {
      orderId: newOrder.id,
      userId: newOrder.userId,
      total: newOrder.total,
      items: newOrder.items,
    });

    res.status(201).json({
      message: 'Order created successfully',
      order: newOrder,
    });
  } catch (error: any) {
    console.error('Create order error:', error);

    if (error.response?.status === 404) {
      return res.status(404).json({ error: 'Cart or product not found' });
    }

    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Get user orders
app.get('/orders', getUserId, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const userOrders = await prisma.order.findMany({
      where: { userId },
      include: {
        items: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      total: userOrders.length,
      orders: userOrders,
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Failed to get orders' });
  }
});

// Get order by ID
app.get('/orders/:id', getUserId, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check if order belongs to user
    if (order.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(order);
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Failed to get order' });
  }
});

// Update order status (admin functionality)
app.put('/orders/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = Object.values(OrderStatus);
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const order = await prisma.order.update({
      where: { id },
      data: {
        status: status as OrderStatus,
        updatedAt: new Date(),
      },
      include: {
        items: true,
      },
    });

    // Publish status update event
    await publishEvent('order_status_updated', {
      orderId: order.id,
      userId: order.userId,
      status: order.status,
    });

    res.json({
      message: 'Order status updated',
      order,
    });
  } catch (error: any) {
    console.error('Update order status error:', error);

    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// Cancel order
app.post('/orders/:id/cancel', getUserId, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (order.status === OrderStatus.SHIPPED || order.status === OrderStatus.DELIVERED) {
      return res.status(400).json({ error: 'Cannot cancel shipped or delivered orders' });
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.CANCELLED,
        updatedAt: new Date(),
      },
      include: {
        items: true,
      },
    });

    // Publish cancellation event
    await publishEvent('order_cancelled', {
      orderId: updatedOrder.id,
      userId: updatedOrder.userId,
    });

    res.json({
      message: 'Order cancelled successfully',
      order: updatedOrder,
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Order service running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 Cart Service: ${CART_SERVICE_URL}`);
  console.log(`🔗 Product Service: ${PRODUCT_SERVICE_URL}`);
});
