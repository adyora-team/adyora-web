# ADYORA E-Commerce Platform

Complete production implementation of the **ADYORA** contemporary streetwear & fashion e-commerce storefront and Admin CMS.

## Tech Stack
- **Framework**: Next.js 15 (App Router) + React 19 + TypeScript
- **Styling**: Tailwind CSS
- **Database & Auth**: Supabase PostgreSQL + Supabase Auth (`@supabase/ssr`) + Row Level Security (RLS)
- **Image Management & CDN**: Cloudinary (`oykw0nwc`) with signed server-side uploads & standardized responsive transformations
- **Payments**: Razorpay Orders API, HMAC-SHA256 signature verification, and idempotent Webhook processing
- **Transactional Emails**: Brevo REST API with ADYORA branded templates, retry logic, and `email_logs` persistence

## Setup & Deployment Instructions

1. **Database Migration**:
   Open your Supabase project SQL Editor (`https://iqclxfyxewcliabborgd.supabase.co`) and run the complete schema migration located at:
   `supabase/migrations/001_initial_schema.sql`

2. **Promote Initial Admin Account**:
   Sign up at `/register`, then run the following SQL in the Supabase SQL Editor to grant your account Admin privileges:
   ```sql
   UPDATE public.user_roles
   SET role = 'admin'
   WHERE user_id = (SELECT id FROM public.profiles WHERE email = 'your-admin-email@domain.com');
   ```

3. **Environment Variables**:
   Configure `.env.local` (or Vercel Project Environment Variables) using `.env.example` as a reference.

4. **Development & Production**:
   ```bash
   npm run dev
   npm run build
   npm start
   ```

