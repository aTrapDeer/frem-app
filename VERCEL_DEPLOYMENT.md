# 🚀 Vercel Deployment Guide

This guide explains how to configure your environment variables and Google OAuth for Vercel deployment.

---

## 📋 Step-by-Step Deployment

### Step 1: Deploy to Vercel

1. **Push your code to GitHub** (if not already done)
2. **Import your project to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your GitHub repository
   - Vercel will auto-detect Next.js settings

3. **Note your Vercel URL**
   - After deployment, you'll get a URL like: `https://your-app-name.vercel.app`
   - This is your production URL

---

### Step 2: Configure Environment Variables in Vercel

Go to your Vercel project dashboard → **Settings** → **Environment Variables** and add:

#### Required Variables:

```env
# Database (same as local)
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your-turso-auth-token

# NextAuth
AUTH_SECRET=your-nextauth-secret-key
NEXTAUTH_URL=https://your-app-name.vercel.app

# Google OAuth (same Client ID/Secret, but you'll need to add production redirect URI)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

**Important Notes:**
- `NEXTAUTH_URL` should be your **production Vercel URL** (e.g., `https://your-app-name.vercel.app`)
- **NO trailing slash** at the end
- Use **HTTPS** (not HTTP)
- You can use the **same** `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` for both local and production
- Make sure to set these for **Production**, **Preview**, and **Development** environments (or at least Production)

---

### Step 3: Update Google OAuth Redirect URI

You need to add your production callback URL to Google Cloud Console:

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Select your project

2. **Navigate to OAuth Credentials**
   - Go to **APIs & Services** → **Credentials**
   - Find your OAuth 2.0 Client ID (the one you're using)
   - Click the **pencil icon** to edit

3. **Add Production Redirect URI**
   - Under **Authorized redirect URIs**, click **+ ADD URI**
   - Add your production callback URL:
     ```
     https://your-app-name.vercel.app/api/auth/callback/google
     ```
   - **Keep** your local development URI:
     ```
     http://localhost:3000/api/auth/callback/google
     ```
   - You should now have **both** URIs listed

4. **Save** the changes

---

### Step 4: Redeploy (if needed)

After updating environment variables:
- Vercel will automatically redeploy, OR
- Go to **Deployments** tab → Click **⋯** → **Redeploy**

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] Environment variables are set in Vercel dashboard
- [ ] `NEXTAUTH_URL` matches your Vercel production URL (with HTTPS)
- [ ] Google OAuth redirect URI includes production URL
- [ ] App is accessible at your Vercel URL
- [ ] Google sign-in works on production

---

## 🔧 Troubleshooting

### "Invalid redirect_uri" Error

- **Problem**: Google OAuth redirect URI mismatch
- **Solution**: 
  - Double-check the redirect URI in Google Cloud Console matches exactly: `https://your-app-name.vercel.app/api/auth/callback/google`
  - Make sure there's no trailing slash
  - Wait a few minutes after updating (Google may cache changes)

### "NEXTAUTH_URL is not set" Error

- **Problem**: Environment variable not configured in Vercel
- **Solution**: 
  - Go to Vercel dashboard → Settings → Environment Variables
  - Add `NEXTAUTH_URL` with your production URL
  - Redeploy the application

### OAuth Works Locally but Not on Vercel

- **Problem**: Production redirect URI not added to Google Console
- **Solution**: 
  - Add the production callback URL to Google Cloud Console (Step 3 above)
  - Make sure you're using the same Client ID/Secret in Vercel env vars

---

## 📝 Environment Variable Summary

| Variable | Local Development | Vercel Production |
|----------|------------------|-------------------|
| `NEXTAUTH_URL` | `http://localhost:3000` | `https://your-app.vercel.app` |
| `GOOGLE_CLIENT_ID` | Same | Same |
| `GOOGLE_CLIENT_SECRET` | Same | Same |
| Google Redirect URI | `http://localhost:3000/api/auth/callback/google` | `https://your-app.vercel.app/api/auth/callback/google` |

**Note**: You can use the same Google OAuth credentials for both environments, just make sure both redirect URIs are added in Google Cloud Console.

---

## 🎉 You're Done!

Your app should now work on Vercel with Google authentication! 🚀


