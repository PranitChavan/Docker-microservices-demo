import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3002;

// Temporary in-memory storage (we'll add PostgreSQL later)
interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  createdAt: Date;
  updatedAt: Date;
}

let products: Product[] = [
  {
    id: '1',
    name: 'Laptop',
    description: 'High-performance laptop',
    price: 999.99,
    category: 'Electronics',
    stock: 50,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    name: 'Smartphone',
    description: 'Latest model smartphone',
    price: 699.99,
    category: 'Electronics',
    stock: 100,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'product-service', timestamp: new Date() });
});

// Get all products
app.get('/products', (req: Request, res: Response) => {
  const { category, search } = req.query;
  
  let filteredProducts = products;
  
  // Filter by category
  if (category) {
    filteredProducts = filteredProducts.filter(p => 
      p.category.toLowerCase() === (category as string).toLowerCase()
    );
  }
  
  // Search by name
  if (search) {
    filteredProducts = filteredProducts.filter(p =>
      p.name.toLowerCase().includes((search as string).toLowerCase())
    );
  }
  
  res.json({
    total: filteredProducts.length,
    products: filteredProducts
  });
});

// Get product by ID
app.get('/products/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const product = products.find(p => p.id === id);
  
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }
  
  res.json(product);
});

// Create product
app.post('/products', (req: Request, res: Response) => {
  try {
    const { name, description, price, category, stock } = req.body;
    
    // Validate input
    if (!name || !price || !category) {
      return res.status(400).json({ error: 'Name, price, and category are required' });
    }
    
    if (price < 0 || (stock && stock < 0)) {
      return res.status(400).json({ error: 'Price and stock must be positive' });
    }
    
    const newProduct: Product = {
      id: (products.length + 1).toString(),
      name,
      description: description || '',
      price: parseFloat(price),
      category,
      stock: stock || 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    products.push(newProduct);
    
    res.status(201).json({
      message: 'Product created successfully',
      product: newProduct
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update product
app.put('/products/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, price, category, stock } = req.body;
    
    const productIndex = products.findIndex(p => p.id === id);
    
    if (productIndex === -1) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Update fields
    if (name) products[productIndex].name = name;
    if (description) products[productIndex].description = description;
    if (price) products[productIndex].price = parseFloat(price);
    if (category) products[productIndex].category = category;
    if (stock !== undefined) products[productIndex].stock = stock;
    products[productIndex].updatedAt = new Date();
    
    res.json({
      message: 'Product updated successfully',
      product: products[productIndex]
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete product
app.delete('/products/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const productIndex = products.findIndex(p => p.id === id);
  
  if (productIndex === -1) {
    return res.status(404).json({ error: 'Product not found' });
  }
  
  products.splice(productIndex, 1);
  
  res.json({ message: 'Product deleted successfully' });
});

// Check stock
app.get('/products/:id/stock', (req: Request, res: Response) => {
  const { id } = req.params;
  const product = products.find(p => p.id === id);
  
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }
  
  res.json({
    productId: product.id,
    name: product.name,
    stock: product.stock,
    available: product.stock > 0
  });
});

app.listen(PORT, () => {
  console.log(`✅ Product service running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
});