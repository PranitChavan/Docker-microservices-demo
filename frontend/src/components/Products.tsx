import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { productsAPI } from '../services/api';
import './Products.css';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
}

export const Products = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    loadProducts();
  }, [category, search]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (category) params.category = category;
      if (search) params.search = search;
      
      const response = await productsAPI.getAll(params);
      setProducts(response.products || []);
      
      // Extract unique categories
      const uniqueCategories = Array.from(
        new Set(response.products?.map((p: Product) => p.category) || [])
      ) as string[];
      setCategories(uniqueCategories);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadProducts();
  };

  if (loading && products.length === 0) {
    return <div className="loading">Loading products...</div>;
  }

  return (
    <div className="products-container">
      <div className="products-header">
        <h1>Products</h1>
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="btn-secondary">Search</button>
        </form>
      </div>

      <div className="filters">
        <button
          className={category === '' ? 'filter-btn active' : 'filter-btn'}
          onClick={() => setCategory('')}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            className={category === cat ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="products-grid">
        {products.map((product) => (
          <Link key={product.id} to={`/products/${product.id}`} className="product-card">
            <div className="product-image-placeholder">
              <span>📦</span>
            </div>
            <div className="product-info">
              <h3>{product.name}</h3>
              <p className="product-category">{product.category}</p>
              <p className="product-description">{product.description}</p>
              <div className="product-footer">
                <span className="product-price">₹{product.price.toFixed(2)}</span>
                <span className={`product-stock ${product.stock > 0 ? 'in-stock' : 'out-of-stock'}`}>
                  {product.stock > 0 ? `In Stock (${product.stock})` : 'Out of Stock'}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {products.length === 0 && !loading && (
        <div className="no-products">No products found</div>
      )}
    </div>
  );
};

