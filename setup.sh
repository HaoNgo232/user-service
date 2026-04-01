#!/bin/bash

echo "🚀 K6 Test API - Quick Start"
echo "=============================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "📝 Please copy .env.example to .env and configure your DATABASE_URL"
    echo ""
    echo "Example:"
    echo "  cp .env.example .env"
    echo "  # Then edit .env with your database credentials"
    exit 1
fi

echo "✅ .env file found"
echo ""

# Generate Prisma Client
echo "📦 Generating Prisma Client..."
npm run prisma:generate

if [ $? -ne 0 ]; then
    echo "❌ Failed to generate Prisma Client"
    exit 1
fi

echo ""
echo "🗄️  Running database migrations..."
npm run prisma:migrate

if [ $? -ne 0 ]; then
    echo "❌ Failed to run migrations"
    echo "⚠️  Make sure your PostgreSQL database is running and DATABASE_URL is correct"
    exit 1
fi

echo ""
echo "🌱 Seeding database with test user..."
npm run prisma:seed

if [ $? -ne 0 ]; then
    echo "⚠️  Seeding failed, but you can continue"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the server, run:"
echo "  npm run dev"
echo ""
echo "Test credentials:"
echo "  Username: testuser"
echo "  Password: testpassword"
echo ""
