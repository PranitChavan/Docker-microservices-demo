import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ordersAPI } from '../services/api';
import './OrderDetail.css';

interface OrderItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

interface Order {
  id: string;
  userId: string;
  total: number;
  status: string;
  shippingAddress: {
    street: string;
    city: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  paymentMethod: string;
  createdAt: string;
  items: OrderItem[];
}

export const OrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (id) {
      loadOrder();
    }
  }, [id]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      const data = await ordersAPI.getById(id!);
      setOrder(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this order?')) {
      return;
    }

    try {
      setCancelling(true);
      setError('');
      const response = await ordersAPI.cancel(id!);
      setOrder(response.order);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to cancel order');
    } finally {
      setCancelling(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'status-pending';
      case 'PROCESSING':
        return 'status-processing';
      case 'SHIPPED':
        return 'status-shipped';
      case 'DELIVERED':
        return 'status-delivered';
      case 'CANCELLED':
        return 'status-cancelled';
      default:
        return '';
    }
  };

  if (loading) {
    return <div className="loading">Loading order...</div>;
  }

  if (!order) {
    return <div className="error-message">Order not found</div>;
  }

  const canCancel = order.status === 'PENDING' || order.status === 'PROCESSING';

  return (
    <div className="order-detail-container">
      <button onClick={() => navigate('/orders')} className="back-button">
        ← Back to Orders
      </button>

      <div className="order-detail">
        <div className="order-detail-header">
          <div>
            <h1>Order #{order.id.slice(0, 8)}</h1>
            <p className="order-date">
              Placed on {new Date(order.createdAt).toLocaleString()}
            </p>
          </div>
          <div className={`order-status-large ${getStatusColor(order.status)}`}>
            {order.status}
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="order-detail-content">
          <div className="order-items-section">
            <h2>Order Items</h2>
            <div className="order-items-list">
              {order.items.map((item) => (
                <div key={item.id} className="order-item-detail">
                  <div className="order-item-info">
                    <h3>{item.name}</h3>
                    <p>Quantity: {item.quantity}</p>
                  </div>
                  <div className="order-item-price">
                    ${(item.price * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="order-info-section">
            <div className="info-card">
              <h2>Shipping Address</h2>
              <p>{order.shippingAddress.street}</p>
              <p>
                {order.shippingAddress.city}
                {order.shippingAddress.state && `, ${order.shippingAddress.state}`}
                {order.shippingAddress.zipCode && ` ${order.shippingAddress.zipCode}`}
              </p>
              {order.shippingAddress.country && <p>{order.shippingAddress.country}</p>}
            </div>

            <div className="info-card">
              <h2>Payment Method</h2>
              <p>{order.paymentMethod.replace('_', ' ').toUpperCase()}</p>
            </div>

            <div className="info-card">
              <h2>Order Summary</h2>
              <div className="summary-row">
                <span>Subtotal:</span>
                <span>${order.total.toFixed(2)}</span>
              </div>
              <div className="summary-row total">
                <span>Total:</span>
                <span>${order.total.toFixed(2)}</span>
              </div>
            </div>

            {canCancel && (
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="btn-secondary btn-large"
              >
                {cancelling ? 'Cancelling...' : 'Cancel Order'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

