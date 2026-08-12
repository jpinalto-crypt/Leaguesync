# Madden League HQ

A NeonSportz-style platform for Madden Connected Franchise Mode (CFM) leagues.

- Users create leagues and pay **$10 one-time** to activate import
- Admins can create free leagues
- Import via Madden Companion App (unique export URL per league)
- Teams, standings, players, basic trade structure
- Discord OAuth login
- Stripe payments

## Quick Start (Local)

### 1. Install dependencies

```bash
cd madden-league-hq
npm install
npm install prisma @prisma/client next-auth@beta @auth/prisma-adapter stripe @stripe/stripe-js lucide-react clsx tailwind-merge class-variance-authority zod
```

### 2. Environment

```bash
cp .env.example .env
```

Edit `.env`:

```
DATABASE_URL="file:./dev.db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-a-long-random-string"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Discord App (https://discord.com/developers/applications)
DISCORD_CLIENT_ID=...
DISCORD_CLIENT_SECRET=...

# Optional: your Discord user ID becomes ADMIN automatically
ADMIN_DISCORD_IDS=your_discord_user_id

# Stripe (https://dashboard.stripe.com)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...   # Create a $10 one-time Price
```

### 3. Database

```bash
npx prisma generate
npx prisma db push
```

### 4. Run

```bash
npm run dev
```

Open http://localhost:3000

## How the $10 flow works

1. User signs in with Discord
2. Creates a league → status `PENDING_PAYMENT`
3. Clicks "Pay $10 & Activate" → Stripe Checkout
4. On success webhook (or demo mode) sets status to `ACTIVE`
5. Owner sees unique **Export URL**
6. In Madden Companion App → Export → paste the URL
   - First: League Info
   - Then: Rosters
   - Then: Weekly Stats for each week

## Admin free leagues

1. Add your Discord ID to `ADMIN_DISCORD_IDS` in `.env`
2. Sign in → you become ADMIN
3. Go to `/admin` → "Create Free League"
4. Instantly ACTIVE with export URL

## Production on your Namecheap domain

1. Push this repo to GitHub
2. Deploy to **Vercel** (recommended for Next.js)
3. Add all environment variables in Vercel dashboard
4. Switch Prisma to PostgreSQL (Neon.tech free tier works great):

   In `prisma/schema.prisma`:
   ```
   provider = "postgresql"
   ```

   Set `DATABASE_URL` to your Postgres connection string.

5. In Namecheap:
   - Domain List → Manage → Advanced DNS
   - Add CNAME: `www` → `cname.vercel-dns.com`
   - Add A record or use Vercel nameservers / CNAME for root
6. Add domain in Vercel project settings

## Stripe Webhook (production)

In Stripe Dashboard → Webhooks → Add endpoint:

`https://yourdomain.com/api/stripe/webhook`

Event: `checkout.session.completed`

Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.

## Project Structure

```
src/
  app/
    page.tsx                 # Landing
    login/                   # Discord login
    dashboard/               # User leagues
    admin/                   # Admin free league creator
    leagues/[slug]/          # League home + standings + export URL
    api/
      auth/[...nextauth]/
      leagues/create/
      admin/create-league/
      stripe/create-checkout/
      stripe/webhook/
      import/[token]/        # ← Madden Companion App posts here
  components/
  lib/
    auth.ts
    prisma.ts
    utils.ts
prisma/
  schema.prisma
```

## Next features you can add

- Player search / detail pages
- Trade proposal + voting UI
- Discord bot (`discord.js`) for `/ps`, `/standings`, etc.
- Better roster merge (currently creates new players on each roster export)
- Mobile-friendly tables
- Public league browser

## Notes

- The import parser is resilient but Madden export JSON shape can change slightly year to year. Check `/api/import/[token]` and adjust field names if needed.
- Demo mode: if Stripe keys are missing, clicking Activate auto-activates the league (good for local testing).

Built to be a solid foundation for a NeonSportz alternative under your own domain.
