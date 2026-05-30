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

   - `DATABASE_URL` - MongoDB connection string (MongoDB Atlas recommended for easy setup)
   - `JWT_SECRET` - Change in production!

   **MongoDB Atlas Setup (Recommended):**
   1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas) and create a free account
   2. Create a new cluster (M0 free tier)
   3. In Network Access, add IP `0.0.0.0/0` for development
   4. In Database Access, create a user with read/write permissions
   5. Get your connection string from "Connect" > "Connect your application"
   6. Update `DATABASE_URL` in `.env` with your Atlas connection string

3. **Initialize database**

   ```bash
   npm run db:push
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
- `prisma/` - Database schema and seed

## Tech Stack

- Next.js 16 (App Router)
- Prisma + MongoDB
- Tailwind CSS
- JWT (jose) for auth
- bcryptjs for passwords
