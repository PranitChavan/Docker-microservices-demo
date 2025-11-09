import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { createClient } from 'redis';
import axios from 'axios';

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3003;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002';

// Redis client
const redisClient = createClient({ url: REDIS_URL });

redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisClient.on('connect', () => console.log('✅ Connected to Redis'));

// Connect to Redis
(async () => {
  await redisClient.connect();
})();

// Types
interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
}

interface Cart {
  userId: string;
  items: CartItem[];
  total: number;
  itemCount: number;
}

// Helper: Get cart key for user
function getCartKey(userId: string): string {
  return `cart:${userId}`;
}

// Helper: Get cart from Redis
async function getCart(userId: string): Promise<Cart> {
  try {
    const cartData = await redisClient.get(getCartKey(userId));
    
    if (!cartData) {
      return {
        userId,
        items: [],
        total: 0,
        itemCount: 0
      };
    }
    
    return JSON.parse(cartData);
  } catch (error) {
    console.error('Error getting cart:', error);
    throw error;
  }
}

// Helper: Save cart to Redis
async function saveCart(cart: Cart): Promise<void> {
  try {
    await redisClient.set(
      getCartKey(cart.userId),
      JSON.stringify(cart),
      { EX: 86400 } // Expire in 24 hours
    );
  } catch (error) {
    console.error('Error saving cart:', error);
    throw error;
  }
}

// Helper: Calculate cart totals
function calculateCartTotals(cart: Cart): Cart {
  cart.total = cart.items.reduce((sum, item) => sum + item.subtotal, 0);
  cart.itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  return cart;
}

// Helper: Get product details from Product Service
async function getProductDetails(productId: string): Promise<any> {
  try {
    const response = await axios.get(`${PRODUCT_SERVICE_URL}/products/${productId}`);
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      throw new Error('Product not found');
    }
    throw new Error('Failed to fetch product details');
  }
}

// Middleware: Extract user from request (mock - in real app, decode from JWT)
const getUserId = (req: Request, res: Response, next: NextFunction) => {
  // In real implementation, extract from JWT token
  // For now, use a header or default value
  const userId = req.headers['x-user-id'] as string || 'user123';
  (req as any).userId = userId;
  next();
};

// Health check
app.get('/health', async (req: Request, res: Response) => {
  try {
    await redisClient.ping();
    res.json({ 
      status: 'healthy', 
      service: 'cart-service',
      redis: 'connected',
      timestamp: new Date()
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'unhealthy', 
      service: 'cart-service',
      redis: 'disconnected'
    });
  }
});

// Get cart
app.get('/cart', getUserId, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const cart = await getCart(userId);
    res.json(cart);
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ error: 'Failed to get cart' });
  }
});

// Add item to cart
app.post('/cart/items', getUserId, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { productId, quantity } = req.body;

    // Validate input
    if (!productId || !quantity || quantity < 1) {
      return res.status(400).json({ error: 'Valid productId and quantity are required' });
    }

    // Get product details
    const product = await getProductDetails(productId);

    // Check stock
    if (product.stock < quantity) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }

    // Get current cart
    const cart = await getCart(userId);

    // Check if product already in cart
    const existingItem = cart.items.find(item => item.productId === productId);

    if (existingItem) {
      // Update quantity
      existingItem.quantity += quantity;
      existingItem.subtotal = existingItem.price * existingItem.quantity;
    } else {
      // Add new item
      cart.items.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity,
        subtotal: product.price * quantity
      });
    }

    // Recalculate totals
    calculateCartTotals(cart);

    // Save cart
    await saveCart(cart);

    res.json({
      message: 'Item added to cart',
      cart
    });
  } catch (error: any) {
    console.error('Add to cart error:', error);
    if (error.message === 'Product not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to add item to cart' });
  }
});

// Update cart item quantity
app.put('/cart/items/:productId', getUserId, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { productId } = req.params;
    const { quantity } = req.body;

    if (quantity < 0) {
      return res.status(400).json({ error: 'Quantity must be non-negative' });
    }

    const cart = await getCart(userId);
    const itemIndex = cart.items.findIndex(item => item.productId === productId);

    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Item not found in cart' });
    }

    if (quantity === 0) {
      // Remove item
      cart.items.splice(itemIndex, 1);
    } else {
      // Get product to check stock
      const product = await getProductDetails(productId);
      
      if (product.stock < quantity) {
        return res.status(400).json({ error: 'Insufficient stock' });
      }

      // Update quantity
      cart.items[itemIndex].quantity = quantity;
      cart.items[itemIndex].subtotal = cart.items[itemIndex].price * quantity;
    }

    // Recalculate totals
    calculateCartTotals(cart);

    // Save cart
    await saveCart(cart);

    res.json({
      message: 'Cart item updated',
      cart
    });
  } catch (error) {
    console.error('Update cart item error:', error);
    res.status(500).json({ error: 'Failed to update cart item' });
  }
});

// Remove item from cart
app.delete('/cart/items/:productId', getUserId, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { productId } = req.params;

    const cart = await getCart(userId);
    const itemIndex = cart.items.findIndex(item => item.productId === productId);

    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Item not found in cart' });
    }

    // Remove item
    cart.items.splice(itemIndex, 1);

    // Recalculate totals
    calculateCartTotals(cart);

    // Save cart
    await saveCart(cart);

    res.json({
      message: 'Item removed from cart',
      cart
    });
  } catch (error) {
    console.error('Remove cart item error:', error);
    res.status(500).json({ error: 'Failed to remove item from cart' });
  }
});

// Clear cart
app.delete('/cart', getUserId, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    
    const emptyCart: Cart = {
      userId,
      items: [],
      total: 0,
      itemCount: 0
    };

    await saveCart(emptyCart);

    res.json({
      message: 'Cart cleared',
      cart: emptyCart
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ error: 'Failed to clear cart' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Cart service running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 Product Service: ${PRODUCT_SERVICE_URL}`);
});