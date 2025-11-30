import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cartAPI, ordersAPI } from '../services/api';
import './Checkout.css';

interface Cart {
  items: any[];
  total: number;
}

export const Checkout = () => {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'India',
    paymentMethod: 'credit_card',
  });
  const navigate = useNavigate();

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    try {
      setLoading(true);
      const data = await cartAPI.get();
      setCart(data);
      
      if (!data.items || data.items.length === 0) {
        navigate('/cart');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load cart');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    if (!formData.street || !formData.city) {
      setError('Street and city are required');
      setSubmitting(false);
      return;
    }

    try {
      const orderData = {
        shippingAddress: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
          country: formData.country,
        },
        paymentMethod: formData.paymentMethod,
      };

      const response = await ordersAPI.create(orderData);
      navigate(`/orders/${response.order.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!cart || cart.items.length === 0) {
    return null;
  }

  return (
    <div className="checkout-container">
      <h1>Checkout</h1>
      {error && <div className="error-message">{error}</div>}

      <div className="checkout-content">
        <form onSubmit={handleSubmit} className="checkout-form">
          <div className="form-section">
            <h2>Shipping Address</h2>
            <div className="form-group">
              <label htmlFor="street">Street Address *</label>
              <input
                type="text"
                id="street"
                value={formData.street}
                onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                required
                disabled={submitting}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="city">City *</label>
                <input
                  type="text"
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  required
                  disabled={submitting}
                />
              </div>
              <div className="form-group">
                <label htmlFor="state">State</label>
                <input
                  type="text"
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  disabled={submitting}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="zipCode">Zip Code</label>
                <input
                  type="text"
                  id="zipCode"
                  value={formData.zipCode}
                  onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                  disabled={submitting}
                />
              </div>
              <div className="form-group">
                <label htmlFor="country">Country</label>
                <input
                  type="text"
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  disabled={submitting}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h2>Payment Method</h2>
            <div className="form-group">
              <label htmlFor="paymentMethod">Payment Method *</label>
              <select
                id="paymentMethod"
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                required
                disabled={submitting}
              >
                <option value="credit_card">Credit Card</option>
                <option value="debit_card">Debit Card</option>
                <option value="paypal">PayPal</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>
          </div>

          <button type="submit" disabled={submitting} className="btn-primary btn-large">
            {submitting ? 'Placing Order...' : 'Place Order'}
          </button>
        </form>

        <div className="checkout-summary">
          <h2>Order Summary</h2>
          <div className="summary-items">
            {cart.items.map((item) => (
              <div key={item.productId} className="summary-item">
                <span>{item.name} x {item.quantity}</span>
                <span>₹{item.subtotal.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="summary-row total">
            <span>Total:</span>
            <span>₹{cart.total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

