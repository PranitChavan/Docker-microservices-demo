import express, { Request, Response, NextFunction } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import cors from 'cors';

dotenv.config();

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3001';
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002';

// Logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  console.log(`→ ${req.method} ${req.path}`);
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`← ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'healthy', 
    service: 'api-gateway',
    timestamp: new Date()
  });
});

// Authentication middleware
const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    (req as any).user = user;
    next();
  });
};

// ============================================
// USER SERVICE PROXY
// ============================================

app.use('/api/users', createProxyMiddleware({
  target: USER_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api/users/register': '/register',
    '^/api/users/login': '/login',
    '^/api/users/profile': '/profile',
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[USER-PROXY] ${req.method} ${req.url} -> ${USER_SERVICE_URL}`);
  },

}));

// ============================================
// PRODUCT SERVICE PROXY
// ============================================

// ============================================
// PRODUCT SERVICE PROXY
// ============================================

// Public: GET products (anyone can view)
app.get('/api/products*', createProxyMiddleware({
  target: PRODUCT_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api/products': '/products'
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[PRODUCT-PROXY] ${req.method} ${req.url} -> ${PRODUCT_SERVICE_URL}`);
  }
}));

// Protected: POST, PUT, DELETE products (require auth)
app.post('/api/products*', authenticateToken, createProxyMiddleware({
  target: PRODUCT_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api/products': '/products'
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[PRODUCT-PROXY-AUTH] ${req.method} ${req.url} -> ${PRODUCT_SERVICE_URL}`);
  }
}));

app.put('/api/products*', authenticateToken, createProxyMiddleware({
  target: PRODUCT_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api/products': '/products'
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[PRODUCT-PROXY-AUTH] ${req.method} ${req.url} -> ${PRODUCT_SERVICE_URL}`);
  }
}));

app.delete('/api/products*', authenticateToken, createProxyMiddleware({
  target: PRODUCT_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api/products': '/products'
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[PRODUCT-PROXY-AUTH] ${req.method} ${req.url} -> ${PRODUCT_SERVICE_URL}`);
  }
}));

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.path
  });
});

app.listen(PORT, () => {
  console.log(`✅ API Gateway running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 User Service: ${USER_SERVICE_URL}`);
  console.log(`🔗 Product Service: ${PRODUCT_SERVICE_URL}`);
});