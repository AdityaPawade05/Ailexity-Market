# Ailexity Market

A digital marketplace for ebooks and courses, similar to Whop. Buy and sell digital content with a full admin panel.

## Features

- **Marketplace**: Browse ebooks and courses with filtering
- **Authentication**: Register, login, logout with JWT sessions
- **Roles**: Admin, Seller, Buyer
- **Sellers**: Create, edit, publish/unpublish products
- **Buyers**: Purchase products, access My Library
- **Admin Panel**: Full access to all users, products, and purchases

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment**

   Copy `.env.example` to `.env` and set:

   - `DATABASE_URL` / `DIRECT_URL` - PostgreSQL connection strings
   - `JWT_SECRET` - change in production!
   - `ENCRYPTION_KEY` - change in production!

   **Local Postgres setup:**
   1. Install PostgreSQL and create a database: `createdb ailexity_market`
   2. Update `DATABASE_URL` and `DIRECT_URL` in `.env` if your credentials differ from the defaults

3. **Initialize database**

   ```bash
   npx prisma migrate deploy
   ```

4. **Seed sample data (creates admin + sample products)**

   ```bash
   npm run db:seed
   ```

5. **Run development server**

   ```bash
   npm run dev
   ```

## Demo Accounts (after seed)

| Role   | Email              | Password   |
|--------|--------------------|------------|
| Admin  | admin@ailexity.com | admin123   |
| Seller | seller@ailexity.com| seller123  |
| Buyer  | buyer@ailexity.com | buyer123   |

## Creating Your Admin Account

The seed creates an admin user. To make yourself the admin:

1. Run the seed once
2. Log in as admin@ailexity.com / admin123
3. Or change the seed to use your email and run `npm run db:seed` (it will update existing user)

To add yourself as admin manually, you can use Prisma Studio:

```bash
npx prisma studio
```

Then create a user with `role: "admin"` and a bcrypt-hashed password.

## Project Structure

- `src/app/` - Next.js App Router pages
- `src/app/api/` - API routes (auth, products, purchases, admin)
- `src/components/` - Shared UI components
- `src/context/` - Auth context
- `src/lib/` - Prisma client, auth utilities
- `prisma/` - Database schema and migrations

## Tech Stack

- Next.js 16 (App Router)
- Prisma + PostgreSQL
- Tailwind CSS
- JWT (jose) for auth
- bcryptjs for passwords

## Deployment

See [DEPLOY.md](./DEPLOY.md) for deploying to a Hostinger VPS (Node.js + PM2 + Nginx + PostgreSQL).
