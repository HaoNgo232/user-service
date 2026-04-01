# Setup Guide - Microservice Template

## 🎯 Mục đích

Template này giúp bạn tạo nhanh các Express microservice độc lập với:

- Database PostgreSQL riêng cho mỗi service
- TypeScript + Prisma ORM
- JWT Authentication
- CRUD boilerplate sẵn có

## 🚀 Cách sử dụng

### Option 1: Script tự động (Recommended)

```bash
cd /path/to/templates
./create-service.sh user-service
cd user-service
```

### Option 2: Manual

```bash
cp -r express-api my-service
cd my-service
```

## ⚙️ Configuration

### 1. Update package.json

```json
{
  "name": "your-service-name"
}
```

### 2. Setup .env

```bash
cp .env.example .env
```

Edit `.env`:

```env
SERVICE_NAME=user-service
PORT=3001
DATABASE_URL="postgresql://postgres:password@localhost:5432/user_service_db?schema=public"
JWT_SECRET="your-unique-secret-key"
```

### 3. Customize Prisma Schema (Optional)

Edit `prisma/schema.prisma` để thêm models của bạn:

```prisma
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String
  createdAt DateTime @default(now())
}
```

### 4. Install & Run

```bash
npm install
npm run prisma:migrate    # Tạo database schema
npm run prisma:seed       # Seed data mẫu
npm run dev               # Start development
```

## 🗄️ Database Setup

Mỗi microservice cần 1 PostgreSQL database riêng:

```sql
-- Service 1
CREATE DATABASE user_service_db;

-- Service 2
CREATE DATABASE order_service_db;

-- Service 3
CREATE DATABASE product_service_db;
```

## 🔄 Tạo nhiều services

```bash
# Service 1 - Users
./create-service.sh user-service
cd user-service
# Update .env: PORT=3001, DATABASE_URL=...user_service_db

# Service 2 - Orders
./create-service.sh order-service
cd order-service
# Update .env: PORT=3002, DATABASE_URL=...order_service_db

# Service 3 - Products
./create-service.sh product-service
cd product-service
# Update .env: PORT=3003, DATABASE_URL=...product_service_db
```

## 📦 Deployment

Mỗi service deploy độc lập:

1. Build: `npm run build`
2. Set environment variables
3. Run: `npm start`
4. Mỗi service có database riêng
5. Mỗi service có port riêng

## 🧪 Testing

```bash
# Health check
curl http://localhost:3001/health

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpassword"}'

# Get items (với JWT token)
curl http://localhost:3001/api/items \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 📝 Customize Template

### Thêm module mới

1. Tạo folder trong `src/modules/`
2. Tạo router, controller, service
3. Register router trong `src/app.ts`

### Thêm Prisma model

1. Edit `prisma/schema.prisma`
2. Run `npm run prisma:migrate`
3. Prisma Client tự động update

### Thêm middleware

1. Tạo file trong `src/middleware/`
2. Apply trong router hoặc app-level

## 🎯 Best Practices

- ✅ Mỗi service có database riêng
- ✅ Mỗi service có PORT riêng
- ✅ Mỗi service có SERVICE_NAME riêng
- ✅ Không share database giữa các services
- ✅ Services communicate qua HTTP/REST APIs
- ✅ Mỗi service có thể scale độc lập
