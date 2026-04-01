# Quick Start Guide

## Prerequisites

Bạn cần có PostgreSQL database đang chạy. Nếu chưa có, có thể dùng Docker:

```bash
docker run --name k6-postgres \
  -e POSTGRES_USER=testuser \
  -e POSTGRES_PASSWORD=testpass \
  -e POSTGRES_DB=k6testdb \
  -p 5432:5432 \
  -d postgres:16-alpine
```

## Setup Steps

### 1. Configure Database

Sửa file `.env` với connection string của bạn:

```env
DATABASE_URL="postgresql://testuser:testpass@localhost:5432/k6testdb?schema=public"
```

### 2. Run Setup Script

```bash
./setup.sh
```

Hoặc manual:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

### 3. Start Server

```bash
npm run dev
```

Server sẽ chạy tại `http://localhost:3000`

## Quick Test

### Test với curl

**1. Login:**

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpassword"}'
```

Response:

```json
{ "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
```

**2. Create Item:**

```bash
TOKEN="your-token-here"

curl -X POST http://localhost:3000/api/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Test Item","description":"Test description","status":"active"}'
```

**3. Get All Items:**

```bash
curl http://localhost:3000/api/items \
  -H "Authorization: Bearer $TOKEN"
```

**4. Get Item by ID:**

```bash
curl http://localhost:3000/api/items/1 \
  -H "Authorization: Bearer $TOKEN"
```

**5. Update Item:**

```bash
curl -X PUT http://localhost:3000/api/items/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Updated Item","description":"Updated description","status":"updated"}'
```

**6. Delete Item:**

```bash
curl -X DELETE http://localhost:3000/api/items/1 \
  -H "Authorization: Bearer $TOKEN"
```

## Run K6 Performance Test

Đảm bảo server đang chạy, sau đó:

```bash
k6 run k6-test.js
```

Kết quả sẽ hiển thị:

- Total requests
- Response times (avg, p95, p99)
- Error rate
- CRUD success count

## Troubleshooting

### Database connection error

Kiểm tra:

1. PostgreSQL đang chạy: `docker ps` hoặc `systemctl status postgresql`
2. DATABASE_URL trong `.env` đúng
3. Database đã được tạo: `psql -U testuser -d k6testdb -c "\dt"`

### Port 3000 already in use

Sửa PORT trong `.env`:

```env
PORT=3001
```

Và update BASE_URL khi chạy k6:

```bash
k6 run -e BASE_URL=http://localhost:3001/api k6-test.js
```

### Prisma migration error

Reset database:

```bash
npx prisma migrate reset
npm run prisma:seed
```

## Next Steps

- Xem Prisma Studio: `npx prisma studio`
- Xem logs: Server sẽ log tất cả requests
- Customize k6 scenarios trong `k6-test.js`
- Deploy lên K3s với Paketo Buildpack (xem README.md)
