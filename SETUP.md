# FREM App - Fresh Setup Guide

Complete setup guide for the Frem personal finance app with **Turso** database and **NextAuth.js** authentication.

---

## 📋 Step-by-Step Setup

### Step 1: Create Your `.env.local` File

Create a new file called `.env.local` in the project root folder with your Turso credentials:

```env
# Turso Database (your credentials)
TURSO_DATABASE_URL=libsql://frem-atrapdeer.aws-us-east-2.turso.io
TURSO_AUTH_TOKEN=eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NjcwNjgzNjQsImlkIjoiOTYwOGE4ZTYtZDY3OS00NGRlLWIxNzYtZWMyYzg0OTUzMDMzIiwicmlkIjoiY2ZmNjkyNTQtMzQyMC00YzI3LThkNjctNzRkYjU4MzY2NWQ5In0.w4tfDl9T9ZAii1F1_xb9z7N0k3kM_hmmjeinPGywkMSeSR6_93dKhef2TLjjuvknmcOspY-_FYMr-cWCymNSBQ

# NextAuth Secret (generate your own or use this for testing)
AUTH_SECRET=your-secret-key-at-least-32-characters-long
NEXTAUTH_URL=http://localhost:3000

# Google OAuth (you need to set these up - see Step 3)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

---

### Step 2: Run Database Setup

This will create all the tables in your Turso database:

```powershell
npm run db:setup
```

You should see output like:
```
╔════════════════════════════════════════════════════════════╗
║           FREM Database Setup - Fresh Install              ║
╚════════════════════════════════════════════════════════════╝

📡 Connecting to: libsql://frem-atrapdeer.aws-us-east-2.turso.io

✅ Database connection successful!

📦 Creating tables...
   ✅ users
   ✅ accounts
   ✅ sessions
   ... (more tables)

✨ Setup Complete! ✨
```

---

### Step 3: Set Up Google OAuth

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/

2. **Create a Project** (or select existing one)
   - Click the project dropdown at the top
   - Click "New Project"
   - Name it something like "Frem App"

3. **Enable OAuth Consent Screen**
   - Go to "APIs & Services" → "OAuth consent screen"
   - Choose "External" user type
   - Fill in the required fields:
     - App name: `Frem`
     - User support email: (your email)
     - Developer contact: (your email)
   - Click "Save and Continue" through the rest

4. **Create OAuth Credentials**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth 2.0 Client ID"
   - Application type: "Web application"
   - Name: "Frem Web App"
   - **Authorized redirect URIs**: Add this exactly:
     ```
     http://localhost:3000/api/auth/callback/google
     ```
   - Click "Create"

5. **Copy Your Credentials**
   - Copy the **Client ID** and **Client Secret**
   - Paste them into your `.env.local` file

---

### Step 4: Generate AUTH_SECRET

Run this in PowerShell to generate a secure secret:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Copy the output and paste it as your `AUTH_SECRET` in `.env.local`.

---

### Step 5: Start the App

```powershell
npm run dev
```

Open http://localhost:3000 in your browser.

---

## 🎉 You're Done!

Your complete `.env.local` should look like this:

```env
# Turso Database
TURSO_DATABASE_URL=libsql://frem-atrapdeer.aws-us-east-2.turso.io
TURSO_AUTH_TOKEN=eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NjcwNjgzNjQsImlkIjoiOTYwOGE4ZTYtZDY3OS00NGRlLWIxNzYtZWMyYzg0OTUzMDMzIiwicmlkIjoiY2ZmNjkyNTQtMzQyMC00YzI3LThkNjctNzRkYjU4MzY2NWQ5In0.w4tfDl9T9ZAii1F1_xb9z7N0k3kM_hmmjeinPGywkMSeSR6_93dKhef2TLjjuvknmcOspY-_FYMr-cWCymNSBQ

# NextAuth
AUTH_SECRET=YourGeneratedSecretHere==
NEXTAUTH_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-secret-here
```

---

## 🔧 Troubleshooting

### "TURSO_DATABASE_URL is not set"
- Make sure `.env.local` exists in the project root (same folder as `package.json`)
- Make sure there are no typos in the variable names
- Restart your terminal after creating the file

### "Failed to connect to database"
- Check your Turso URL is correct (should start with `libsql://`)
- Verify your auth token is valid and complete

### "Google OAuth Error"
- Make sure the redirect URI is exactly: `http://localhost:3000/api/auth/callback/google`
- Check that Client ID and Secret are copied correctly (no extra spaces)
- Ensure OAuth consent screen is configured

### "AUTH_SECRET is required"
- Generate a secret using the PowerShell command in Step 4
- Make sure it's at least 32 characters long

---

## 📁 Project Structure

```
frem-app/
├── .env.local          ← Your environment variables (create this!)
├── auth.ts             ← NextAuth configuration
├── app/
│   ├── api/auth/       ← NextAuth API routes
│   ├── dashboard/      ← Main dashboard
│   ├── daily/          ← Daily transactions
│   ├── goals/          ← Financial goals
│   └── ...
├── lib/
│   ├── turso.ts        ← Database client
│   ├── database.ts     ← Database operations
│   └── auth-adapter.ts ← NextAuth Turso adapter
└── scripts/
    └── setup-database.ts ← Database setup script
```

---

## 🚀 Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run db:setup` | Create database tables |
| `npm run lint` | Run linter |
