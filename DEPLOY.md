# Deploying to a Hostinger VPS

This assumes a Hostinger KVM/VPS plan with root SSH access running Ubuntu.

## 1. Server setup (one-time)

```bash
# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib

# PM2 (process manager) and Nginx
sudo npm install -g pm2
sudo apt-get install -y nginx certbot python3-certbot-nginx
```

## 2. Database

```bash
sudo -u postgres psql
CREATE DATABASE ailexity_market;
CREATE USER ailexity WITH ENCRYPTED PASSWORD 'choose-a-strong-password';
GRANT ALL PRIVILEGES ON DATABASE ailexity_market TO ailexity;
\q
```

Point `DATABASE_URL` / `DIRECT_URL` in `.env` at this database (`localhost:5432` if Postgres runs on the same VPS).

## 3. Deploy the app

```bash
git clone <your-repo-url> /var/www/ailexity-market
cd /var/www/ailexity-market
npm install
```

Create `.env` on the server (copy `.env.example`, fill in real values — **do not** commit or `scp` your local `.env`, set values fresh on the server).

### Production configuration checklist

The server **refuses to boot** in production (`NODE_ENV=production`) if any of the first three items below is left at a dev/placeholder value — the boot error tells you exactly which one.

| Variable | What to do |
|---|---|
| `JWT_SECRET` | Generate fresh: `openssl rand -hex 32`. Never reuse the dev value — the boot check rejects it by hash. |
| `ENCRYPTION_KEY` | Same: `openssl rand -hex 32`, fresh, not the dev value. Note: changing it later invalidates already-stored bot tokens (they're encrypted at rest with this key). |
| `NEXT_PUBLIC_APP_URL` | Your real `https://` domain. `localhost` and plain `http://` are rejected at boot. |
| `DATABASE_URL` / `DIRECT_URL` | From step 2 (add `sslmode=require` for a remote DB). |
| SMTP (`SMTP_HOST/PORT/SECURE/USER/PASS/FROM`) | Use a transactional provider — **not personal Gmail** (low limits, poor deliverability; the server logs a warning if it sees `smtp.gmail.com`). `.env.example` has copy-paste settings for Resend, Brevo, and Amazon SES. All of them need you to (1) create an account, (2) verify your sending domain (add their DNS records), (3) create an API key/SMTP credential, and (4) set `SMTP_FROM` to an address on that verified domain. Resend is the quickest to set up. |
| `GOOGLE_CLIENT_ID/SECRET` | In [Google Cloud Console](https://console.cloud.google.com/apis/credentials), add the production redirect URI: `https://your-domain.com/api/auth/google/callback`. |
| `DISCORD_CLIENT_ID/SECRET` | In the [Discord developer portal](https://discord.com/developers/applications): your app → OAuth2 tab → **Reset Secret** → copy it (shown once). Add redirect `https://your-domain.com/api/integrations/discord/callback`. Optional — Discord linking stays disabled (with a startup warning) if unset. |
| `TELEGRAM_BOT_TOKEN` + `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` | Optional — create a bot with @BotFather, then `/setdomain` to your production domain. |
| `GEMINI_API_KEY` (or `OPENAI_API_KEY`) | Optional — powers the AI chat widget and description generator. |
| `AILEXITY_COMMISSION_RATE` | Optional — defaults to `0.10` (10%). |

Then build and apply migrations:

```bash
npm run build
npx prisma migrate deploy
npm run db:seed   # optional — only for first-time setup, creates the demo/admin accounts
```

## 4. Run with PM2

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup   # follow the printed instructions to enable PM2 on boot
```

`ecosystem.config.js` runs a single instance (fork mode, not cluster) — the API rate limiter in `src/proxy.ts` keeps its counters in memory per-process, so running multiple instances would multiply the effective rate limits. If you need to scale beyond one instance later, move the rate limiter to Redis/Postgres first.

## 5. Nginx reverse proxy + SSL

```bash
sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/ailexity-market
sudo nano /etc/nginx/sites-available/ailexity-market   # replace your-domain.com
sudo ln -s /etc/nginx/sites-available/ailexity-market /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

## 6. Redeploying updates

```bash
cd /var/www/ailexity-market
git pull
npm install
npm run build
npx prisma migrate deploy
pm2 restart ailexity-market
```

## Before going live — checklist

- [ ] Rotate every credential that ever sat in a local `.env` on a dev machine (Gemini key, SMTP app password, Google/Discord OAuth secrets) — treat anything used during development as burned.
- [ ] Fill in `DISCORD_CLIENT_SECRET` if the Discord OAuth "Connect Discord" feature is enabled.
- [ ] Confirm `.env` on the server has unique, production-only `JWT_SECRET` and `ENCRYPTION_KEY` values.
- [ ] Update OAuth redirect URIs in Google Cloud Console / Discord Developer Portal to the production domain.
- [ ] Point DNS (A record) at the VPS IP before running certbot.
- [ ] Confirm `sslmode=require` on `DATABASE_URL`/`DIRECT_URL` if Postgres isn't on localhost.
