# Wedding Planner — Setup Guide

## Step 1: Create a Supabase project (free)

1. Go to [supabase.com](https://supabase.com) and sign up for a free account
2. Click **New project**, name it "wedding-planner", pick a region close to you
3. Set a database password (save it somewhere safe) and click **Create new project**
4. Wait ~2 minutes for it to spin up

## Step 2: Set up the database

1. In your Supabase project, click **SQL Editor** in the left sidebar
2. Click **New query**
3. Open the file `supabase-schema.sql` from this project, copy all the contents, paste it into the SQL editor
4. Click **Run** — you should see "Success"

## Step 3: Get your API keys

1. In Supabase, go to **Project Settings → API**
2. Copy the **Project URL** (looks like `https://xxxx.supabase.co`)
3. Copy the **anon/public** key (long string starting with `eyJ...`)

## Step 4: Add your keys to the app

1. Open the file `.env.local` in the wedding-planner folder
2. Replace the placeholder values:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-actual-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key
```

## Step 5: Run the app locally

Open Terminal, navigate to the project folder, and run:

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

## Step 6: Create your accounts

1. Go to `/login`, click **Sign up**, and create an account for yourself
2. Check your email and click the confirmation link
3. Share the URL with your fiancée and have her sign up too

## Step 7: Deploy to Vercel (free, permanent hosting)

1. Push this project to a GitHub repository:
   - Create a new repo at [github.com](https://github.com) (can be private)
   - In Terminal: `git remote add origin YOUR_GITHUB_URL && git push -u origin main`

2. Go to [vercel.com](https://vercel.com) and sign up with GitHub

3. Click **New Project** → import your GitHub repo → click **Deploy**

4. **Add your environment variables** in Vercel:
   - Go to your project → **Settings → Environment Variables**
   - Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` with your real values
   - Click **Redeploy** from the Deployments tab

5. Vercel gives you a free `.vercel.app` URL that both of you can use from anywhere

## Updating the app later

Make changes locally → `git push` → Vercel auto-deploys. Done.
