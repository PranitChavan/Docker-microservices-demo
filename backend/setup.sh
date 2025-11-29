#!/bin/bash
# File: setup.sh

echo "🚀 Setting up E-commerce Microservices..."

# Check if .env files already exist
for service in user-service product-service cart-service order-service api-gateway; do
  if [ -f "services/$service/.env" ]; then
    echo "⚠️  services/$service/.env already exists (skipping)"
  else
    cp "services/$service/.env.example" "services/$service/.env"
    echo "✅ Created services/$service/.env"
  fi
done

echo ""
echo "⚠️  IMPORTANT: Update JWT_SECRET in these files:"
echo "   - services/user-service/.env"
echo "   - services/api-gateway/.env"
echo ""
echo "💡 Generate secret with: openssl rand -base64 32"
echo ""
echo "🎉 Setup complete! Run 'docker-compose up' to start."