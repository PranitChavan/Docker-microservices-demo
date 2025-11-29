import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3002;

// Initialize Prisma Client
const prisma = new PrismaClient();

// Connect to database
prisma
  .$connect()
  .then(() => console.log('✅ Connected to PostgreSQL'))
  .catch((err) => console.error('❌ Database connection error:', err));

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

// Seed initial products if database is empty
async function seedProducts() {
  try {
    const count = await prisma.product.count();

    if (count === 0) {
      console.log('📦 Seeding initial products...');

      await prisma.product.createMany({
        data: [
          {
            name: 'Laptop',
            description: 'High-performance laptop',
            price: 999.99,
            category: 'Electronics',
            stock: 50,
          },
          {
            name: 'Smartphone',
            description: 'Latest model smartphone',
            price: 699.99,
            category: 'Electronics',
            stock: 100,
          },
          {
            name: 'Wireless Mouse',
            description: 'Ergonomic wireless mouse',
            price: 29.99,
            category: 'Accessories',
            stock: 200,
          },
        ],
      });

      console.log('✅ Initial products seeded');
    }
  } catch (error) {
    console.error('Error seeding products:', error);
  }
}

// Seed on startup
seedProducts();

// Health check
app.get('/health', async (req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'healthy',
      service: 'product-service',
      database: 'connected',
      timestamp: new Date(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      service: 'product-service',
      database: 'disconnected',
    });
  }
});

// Get all products
app.get('/products', async (req: Request, res: Response) => {
  try {
    const { category, search } = req.query;

    const where: any = {};

    // Filter by category
    if (category) {
      where.category = {
        equals: category as string,
        mode: 'insensitive',
      };
    }

    // Search by name
    if (search) {
      where.name = {
        contains: search as string,
        mode: 'insensitive',
      };
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      total: products.length,
      products,
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Failed to get products' });
  }
});

// Get product by ID
app.get('/products/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Failed to get product' });
  }
});

// Create product
app.post('/products', async (req: Request, res: Response) => {
  try {
    const { name, description, price, category, stock } = req.body;

    // Validate input
    if (!name || !price || !category) {
      return res.status(400).json({ error: 'Name, price, and category are required' });
    }

    if (price < 0 || (stock && stock < 0)) {
      return res.status(400).json({ error: 'Price and stock must be positive' });
    }

    const newProduct = await prisma.product.create({
      data: {
        name,
        description: description || '',
        price: parseFloat(price),
        category,
        stock: stock || 0,
      },
    });

    res.status(201).json({
      message: 'Product created successfully',
      product: newProduct,
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Update product
app.put('/products/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, price, category, stock } = req.body;

    const updateData: any = {};

    if (name) updateData.name = name;
    if (description) updateData.description = description;
    if (price) updateData.price = parseFloat(price);
    if (category) updateData.category = category;
    if (stock !== undefined) updateData.stock = stock;

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: updateData,
    });

    res.json({
      message: 'Product updated successfully',
      product: updatedProduct,
    });
  } catch (error: any) {
    console.error('Update product error:', error);

    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete product
app.delete('/products/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.product.delete({
      where: { id },
    });

    res.json({ message: 'Product deleted successfully' });
  } catch (error: any) {
    console.error('Delete product error:', error);

    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Check stock
app.get('/products/:id/stock', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        stock: true,
      },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({
      productId: product.id,
      name: product.name,
      stock: product.stock,
      available: product.stock > 0,
    });
  } catch (error) {
    console.error('Check stock error:', error);
    res.status(500).json({ error: 'Failed to check stock' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Product service running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
});
