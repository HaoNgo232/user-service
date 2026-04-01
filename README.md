# Express Microservice Template

Template để tạo nhanh Express microservice với TypeScript + Prisma + PostgreSQL.

## 🚀 Quick Start

### 1. Clone template

```bash
cp -r express-api my-new-service
cd my-new-service
```

### 2. Customize service

```bash
# Update package.json name
# Update .env với DATABASE_URL và SERVICE_NAME của bạn
cp .env.example .env
```

### 3. Setup

```bash
npm install
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

## 📋 Requirements

- Node.js >= 18
- PostgreSQL database

## 🔧 Configuration

File `.env`:

```env
SERVICE_NAME=my-service
PORT=3000
NODE_ENV=development
DATABASE_URL="postgresql://user:password@localhost:5432/mydb?schema=public"
JWT_SECRET="your-secret-key"
```

## 📡 API Endpoints

### Health Check

```
GET /health
```

### Authentication

```
POST /api/auth/login
Body: { "username": "testuser", "password": "testpassword" }
```

### Items CRUD

```
POST   /api/items          # Create
GET    /api/items          # List (pagination)
GET    /api/items/:id      # Get by ID
PUT    /api/items/:id      # Update
DELETE /api/items/:id      # Delete
```

## 🏗️ Project Structure

```
src/
├── modules/
│   ├── auth/              # Auth module
│   └── items/             # Items CRUD module
├── prisma/                # Prisma service
├── middleware/            # Middlewares
├── config/                # Configuration
├── app.ts                 # Express app
└── server.ts              # Entry point
```

## 🔄 Tạo Service Mới

1. Clone folder này
2. Đổi tên trong `package.json`
3. Update `SERVICE_NAME` và `DATABASE_URL` trong `.env`
4. Customize Prisma schema nếu cần
5. Run migrations
6. Deploy độc lập

Mỗi service có database riêng và chạy độc lập!

## 📝 Development

```bash
npm run dev              # Development mode
npm run build            # Build production
npm start                # Run production
npm run prisma:migrate   # Run migrations
npm run prisma:seed      # Seed database
```

## 🎯 Template Features

- ✅ TypeScript
- ✅ Express.js
- ✅ Prisma ORM
- ✅ PostgreSQL
- ✅ JWT Authentication
- ✅ CRUD boilerplate
- ✅ Error handling
- ✅ Environment-based config
- ✅ Ready to clone & customize
