# Pivot Deployment Guide: Local to Live

Follow these steps to put Pivot into perpetual operation on Vercel's free tier.

## 1. Push to GitHub
If you haven't already, push your local code to a new GitHub repository:
1. Create a new repository on [GitHub](https://github.com/new).
2. Run these commands in your terminal:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/pivot.git
   git branch -M main
   git push -u origin main
   ```

## 2. Import to Vercel
1. Go to [Vercel](https://vercel.com/new).
2. Import your `pivot` repository.

## 3. Configure Database (Vercel Postgres)
1. In your Vercel Project Dashboard, go to the **Storage** tab.
2. Click **Create Database** and select **Postgres**.
3. Choose the **Free** tier.
4. Once created, click **Connect** to attach it to your Project.
   *Vercel will automatically add the necessary database environment variables.*

## 4. Set Environment Variables
Go to **Settings > Environment Variables** in Vercel and add:
- `GEMINI_API_KEY`: Your Google Gemini API Key.
- `CRON_SECRET`: `pivot_intel_2026` (or your preferred secret).

## 5. First Migration & Data Fetch
To initialize the database schema and fetch the first batch of news:
1. Run this command locally (after installing [Vercel CLI](https://vercel.com/download)):
   ```bash
   vercel env pull .env.production
   npx prisma db push
   ```
2. Trigger the manual fetch by visiting:
   `https://your-project-url.vercel.app/api/cron`

## 6. Daily Automation (Cron)
Pivot is already configured with a `vercel.json` to run daily. Vercel will detect this and automatically schedule the news scraping every 24 hours.

**Congratulations! Your intelligent news platform is now live.**
