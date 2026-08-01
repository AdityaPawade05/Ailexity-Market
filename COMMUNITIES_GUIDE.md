# Ailexity Membership Communities System

A complete membership community platform with subscription tiers, wallet-based payments, and Discord/Telegram bot integrations.

## Features Implemented

### Core Community System
- ✅ Create communities with name, description, avatar, cover image
- ✅ Browse and discover communities by category
- ✅ Create unlimited subscription tiers per community
- ✅ Manage tier pricing, features, and intervals
- ✅ Member tracking and analytics dashboard

### Subscription Management
- ✅ Subscribe to communities and tiers
- ✅ Free tiers (no payment required)
- ✅ Paid tiers (deducted from user wallet with 90/10 split)
- ✅ Cancel subscriptions
- ✅ View subscription history

### Wallet Integration
- Uses existing wallet system (src/lib/commission.ts)
- Buyer wallet debited on subscription
- Seller wallet credited 90% (SALE_CREDIT transaction)
- Platform wallet credited 10% (PlatformWallet)
- Atomic transactions prevent race conditions

### Bot Integrations (Ready for Use)
- **Discord**: Assign roles on subscription, remove on cancellation
- **Telegram**: Generate single-use invite links, ban/unban members
- Webhook system for automating member access
- Easy setup UI for creators

### Creator Dashboard
- View total members and active subscriptions
- Track churn rate and cancelled subscriptions
- See revenue per tier and member counts
- View recent members
- Create and manage subscription tiers

## Database Schema

### New Models Added

```prisma
Community
  - id, name, description, avatarUrl, coverImageUrl, category
  - createrId (User)
  - Relations: tiers, members, subscriptions, discordConfig, telegramConfig

SubscriptionTier
  - id, name, description, price, interval ("month"/"year"/"lifetime")
  - features (JSON string), memberLimit
  - communityId (Community)
  - Relations: subscriptions

CommunitySubscription
  - id, memberId, tierId, communityId
  - status ("active"/"cancelled"/"expired")
  - startedAt, expiresAt, cancelledAt
  - Relations: member (User), tier, community

CommunityMember
  - id, memberId, communityId
  - joinedAt (tracks when user joined)
  - Relations: member (User), community

DiscordIntegration
  - communityId (unique), serverId, botToken, managedRoleId, managedChannelId
  - Relations: community

TelegramIntegration
  - communityId (unique), groupId, botToken, managedChannelId
  - Relations: community
```

## API Endpoints

### Communities

**GET /api/communities**
- List all communities with pagination and category filtering
- Query params: `page`, `limit`, `category`
- Returns: communities array with creator and tier info

**POST /api/communities**
- Create new community (requires auth)
- Body: `{ name, description, category, avatarUrl, coverImageUrl }`
- Returns: created community

**GET /api/communities/[id]**
- Get specific community details with members count

**PUT /api/communities/[id]**
- Update community (creator only)
- Body: any fields to update

**DELETE /api/communities/[id]**
- Delete community (creator only)

### Subscription Tiers

**GET /api/communities/[id]/tiers**
- List tiers for a community

**POST /api/communities/[id]/tiers**
- Create new tier (creator only)
- Body: `{ name, description, price (in dollars), interval, features[], memberLimit }`

**PUT /api/communities/[id]/tiers/[tierId]**
- Update tier (creator only)

**DELETE /api/communities/[id]/tiers/[tierId]**
- Delete tier (no active subscriptions allowed)

### Subscriptions

**POST /api/communities/[id]/subscribe**
- Subscribe user to a tier
- Body: `{ tierId }`
- Returns 402 if insufficient wallet balance
- Free tiers: instant access
- Paid tiers: wallet deduction + webhook trigger for bots

**GET /api/communities/subscriptions**
- Get user's all subscriptions

**GET /api/communities/subscriptions/[subscriptionId]**
- Get specific subscription details

**PUT /api/communities/subscriptions/[subscriptionId]**
- Cancel subscription (triggers bot removal webhooks)

### Dashboard & Members

**GET /api/communities/[id]/dashboard**
- Creator dashboard with stats
- Returns: stats, tier breakdown, recent members, churn rate
- Creator only

**GET /api/communities/[id]/members**
- List community members with subscription info
- Query params: `page`, `limit`
- Creator only

### Bot Integrations

**GET /api/communities/[id]/integrations/discord**
- Get Discord config status

**POST /api/communities/[id]/integrations/discord**
- Setup Discord integration
- Body: `{ serverId, botToken, managedRoleId, managedChannelId }`

**DELETE /api/communities/[id]/integrations/discord**
- Remove Discord integration

**GET /api/communities/[id]/integrations/telegram**
- Get Telegram config status

**POST /api/communities/[id]/integrations/telegram**
- Setup Telegram integration
- Body: `{ groupId, botToken, managedChannelId }`

**DELETE /api/communities/[id]/integrations/telegram**
- Remove Telegram integration

### Webhooks

**POST /api/webhooks/subscription**
- Internal webhook for subscription events
- Body: `{ event: "subscription.created" | "subscription.cancelled", subscriptionId }`
- Auto-triggered on subscribe/cancel if bot integrations exist

## Frontend Pages

### Public Pages
- `/communities` - Browse communities by category
- `/communities/[id]` - View community details and pricing tiers
- `/communities/[id]/page.tsx` - Subscribe to community

### Creator Pages
- `/communities/create` - Create new community
- `/communities/[id]/manage` - Dashboard with stats and tier management
- `/communities/[id]/integrations` - Setup Discord/Telegram bots

## How to Use

### For Users

1. **Browse Communities**
   ```
   GET /communities (page)
   Browse by category: Trading, Fitness, Business, AI Tools, Gaming, Development
   ```

2. **View Community**
   ```
   Click on community → see pricing tiers and features
   ```

3. **Subscribe**
   ```
   Click "Subscribe" on desired tier
   - Free tier: instant access
   - Paid tier: deducted from wallet
   ```

4. **Manage Subscriptions**
   ```
   Account → My Subscriptions
   Cancel anytime
   ```

### For Creators

1. **Create Community**
   ```
   /communities/create
   Fill in name, description, category, images
   ```

2. **Setup Tiers**
   ```
   /communities/[id]/manage
   Create multiple tiers (Free, Basic, Premium, VIP)
   Set pricing, features, descriptions
   ```

3. **Connect Bots** (Optional)
   ```
   /communities/[id]/integrations
   
   Discord:
   - Get bot token from Discord Developer Portal
   - Get server ID from Discord
   - Create role in Discord
   - Set managedRoleId
   
   Telegram:
   - Create bot with @BotFather
   - Get group ID with @userinfobot
   - Set groupId
   ```

4. **View Analytics**
   ```
   /communities/[id]/manage
   - See member count per tier
   - Track revenue ($X per month per tier, after 10% platform fee)
   - Monitor churn rate
   - View recent members
   ```

## Pricing Model

### For Members
- Free tiers: always free
- Paid tiers: monthly/yearly/lifetime subscription

### For Creators (90% of tier price)
Example: $10/month tier
- Ailexity takes: $1 (10%)
- Creator receives: $9 (90%)
- Charged to buyer's wallet (not external payment processor)

## Discord Integration Details

### Prerequisites
1. Create Discord bot at https://discord.com/developers/applications
2. Give bot permissions: "Manage Roles", "Create Instant Invite"
3. Add bot to your server

### Setup Flow
```
Creator fills in:
- Discord Server ID (right-click server, copy ID)
- Bot Token (from Developer Portal)
- Managed Role ID (role to assign to paid members)

When user subscribes:
- Bot assigns role to user → unlocks #paid-members channel
- User sees new role in server

When user cancels:
- Bot removes role → access revoked
```

## Telegram Integration Details

### Prerequisites
1. Create bot via @BotFather in Telegram
2. Add bot as admin to your private group/channel
3. Get group ID using @userinfobot

### Setup Flow
```
Creator fills in:
- Telegram Group ID (from @userinfobot)
- Bot Token (from @BotFather)

When user subscribes:
- Bot generates single-use invite link
- Link sent to user (via email or in-app message)
- User joins group with link

When user cancels:
- Bot bans then unbans user → removes them without permanent block
```

## Example Workflow

### Scenario: Creator launches a Trading Community

1. Create community
   - Name: "Advanced Trading Strategies"
   - Category: Trading
   - Description: "Learn insider trading techniques"

2. Setup tiers
   - **Free**: "Preview Access"
     - Price: $0
     - Features: ["Access to intro videos", "Community chat"]
   
   - **Basic**: "Monthly Pass"
     - Price: $9.99/month
     - Features: ["Weekly trading signals", "Discord access", "Live Q&A sessions"]
   
   - **Premium**: "All-Access"
     - Price: $29.99/month
     - Features: ["Everything in Basic", "1-on-1 coaching", "Private Discord channel", "Trading templates"]

3. Setup Discord
   - Create role "Trading Subscriber"
   - Create private channel #trading-signals
   - Add role to channel permissions
   - Set managedRoleId in integration

4. Launch
   - Share community link: ailexity.com/communities/[id]
   - Users join, subscribe to tier
   - Free tier members: instant access
   - Paid members: wallet debited, Discord role assigned

5. Monitor
   - Dashboard shows 50 free members, 20 basic, 5 premium
   - Monthly revenue: (20 × $9 + 5 × $27) = $315 (creator gets $283.50)
   - Churn rate: 10% (2 cancelled)

## Known Limitations & Future Enhancements

### Current Limitations
- Bot token stored as base64 encoded (should be encrypted with AES-256 in production)
- Discord invite links not fully implemented (role assignment is primary method)
- No automatic subscription renewal (manual setup per subscription)
- No free trial period support yet (easy to add: expiresAt logic)

### Future Features (Not Yet Implemented)
1. **Affiliate/Referral System**
   - Members earn % of referral subscriptions
   - Tracking and payouts

2. **Content Drops**
   - Creators post exclusive files/videos
   - Tiered visibility (which tiers see what)
   - Analytics on content engagement

3. **In-Platform Chat**
   - Native Discord alternative
   - Reduce dependence on external platforms

4. **Free Trial Periods**
   - Creators offer 3-7 day trials
   - Auto-cancel after trial expires

5. **Advanced Analytics**
   - Lifetime value per member
   - Conversion funnels (free → paid)
   - Member activity tracking

6. **Stripe Integration**
   - When needed (currently using wallet system)
   - Recurring billing setup
   - Dunning for failed payments

## Troubleshooting

### Subscription Creation Fails
- Check user has sufficient wallet balance
- Verify tier exists and belongs to community
- Check user doesn't already have active subscription

### Bot Integration Not Working
- Verify bot token is correct
- Ensure bot has required permissions
- Check bot is added to server/group
- For Discord: role must exist and not be higher than bot's role

### Members Not Removed on Cancel
- Check integration is still configured
- Verify Discord role/Telegram group still exists
- Check bot still has admin/permissions

## Files Modified/Created

### Database
- `prisma/schema.prisma` - Added Community, SubscriptionTier, CommunitySubscription, CommunityMember, DiscordIntegration, TelegramIntegration models

### API Routes
- `/api/communities/` - CRUD communities
- `/api/communities/[id]/` - Get/update/delete
- `/api/communities/[id]/tiers/` - Manage subscription tiers
- `/api/communities/[id]/subscribe/` - Subscribe to tier
- `/api/communities/subscriptions/` - User subscriptions
- `/api/communities/subscriptions/[id]/` - Manage individual subscription
- `/api/communities/[id]/dashboard/` - Creator analytics
- `/api/communities/[id]/members/` - List community members
- `/api/communities/[id]/integrations/discord/` - Discord setup
- `/api/communities/[id]/integrations/telegram/` - Telegram setup
- `/api/webhooks/subscription/` - Bot integration webhook

### Frontend
- `/communities/page.tsx` - Browse communities (updated to show new community data)
- `/communities/create/page.tsx` - Create community
- `/communities/[id]/page.tsx` - View community & subscribe
- `/communities/[id]/manage/page.tsx` - Creator dashboard
- `/communities/[id]/integrations/page.tsx` - Bot integration setup

### Utilities
- `src/lib/bot-integrations.ts` - Discord & Telegram API helpers

## Next Steps

1. **Test the flow end-to-end**
   - Create a test community
   - Setup tiers
   - Subscribe with test user
   - Verify wallet deduction

2. **Setup actual Discord/Telegram bots**
   - Create bots in their developer portals
   - Configure integrations
   - Test member add/remove

3. **Add more features as needed**
   - Content drops
   - In-platform chat
   - Referral system

4. **Production hardening**
   - Encrypt bot tokens in database
   - Add rate limiting to APIs
   - Add audit logging for financial transactions
   - Setup error monitoring
