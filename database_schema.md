# Frem Application Database Schema

## Overview
This document outlines the SQLite database schema for the Frem personal finance management application, hosted on **Turso** (libSQL). The schema supports user authentication via NextAuth.js, financial tracking, goal management, recurring expenses, side projects, and AI-powered insights.

---

## Database: Turso (libSQL/SQLite)

This application uses [Turso](https://turso.tech/) as its database, which provides:
- Edge-compatible SQLite database
- Global replication
- Built-in branching for development
- Excellent performance for read-heavy workloads

---

## Core Tables

### 1. Users Table (NextAuth Compatible)
Manages user authentication and basic profile information.

```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT,
    email TEXT UNIQUE,
    email_verified TEXT,
    image TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
```

### 2. Accounts Table (OAuth Providers)
Links OAuth provider accounts to users.

```sql
CREATE TABLE accounts (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    provider TEXT NOT NULL,
    provider_account_id TEXT NOT NULL,
    refresh_token TEXT,
    access_token TEXT,
    expires_at INTEGER,
    token_type TEXT,
    scope TEXT,
    id_token TEXT,
    session_state TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(provider, provider_account_id)
);
```

### 3. Sessions Table
Manages user sessions.

```sql
CREATE TABLE sessions (
    id TEXT PRIMARY KEY NOT NULL,
    session_token TEXT UNIQUE NOT NULL,
    user_id TEXT NOT NULL,
    expires TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### 4. User Settings Table
Stores user preferences and configuration settings.

```sql
CREATE TABLE user_settings (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT UNIQUE NOT NULL,
    daily_budget_target REAL DEFAULT 150.00,
    currency TEXT DEFAULT 'USD',
    preferred_language TEXT DEFAULT 'en',
    notifications_enabled INTEGER DEFAULT 1,
    dark_mode INTEGER DEFAULT 0,
    weekly_summary_email INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

## Financial Tracking Tables

### 5. Daily Transactions Table
Records all daily income and expense entries.

```sql
CREATE TABLE daily_transactions (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    amount REAL NOT NULL CHECK (amount > 0),
    description TEXT NOT NULL,
    category TEXT,
    transaction_date TEXT NOT NULL DEFAULT (date('now')),
    transaction_time TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### 6. Transaction Categories Table
Predefined and custom categories for transactions.

```sql
CREATE TABLE transaction_categories (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'both')),
    color TEXT DEFAULT '#6366f1',
    icon TEXT,
    is_system INTEGER DEFAULT 0,
    user_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(name, user_id)
);
```

---

## Goals Management Tables

### 7. Financial Goals Table
Stores user-defined financial goals and targets.

```sql
CREATE TABLE financial_goals (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    target_amount REAL NOT NULL CHECK (target_amount > 0),
    current_amount REAL DEFAULT 0 CHECK (current_amount >= 0),
    category TEXT NOT NULL CHECK (category IN ('emergency', 'vacation', 'car', 'house', 'debt', 'investment', 'other')),
    start_date TEXT,
    deadline TEXT NOT NULL,
    interest_rate REAL,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### 8. Goal Contributions Table
Tracks contributions made toward specific goals.

```sql
CREATE TABLE goal_contributions (
    id TEXT PRIMARY KEY NOT NULL,
    goal_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    amount REAL NOT NULL CHECK (amount > 0),
    contribution_date TEXT NOT NULL DEFAULT (date('now')),
    description TEXT,
    transaction_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (goal_id) REFERENCES financial_goals(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (transaction_id) REFERENCES daily_transactions(id)
);
```

---

## Recurring Expenses Tables

### 9. Recurring Expenses Table
Manages monthly subscriptions and recurring payments.

```sql
CREATE TABLE recurring_expenses (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    amount REAL NOT NULL CHECK (amount > 0),
    category TEXT NOT NULL CHECK (category IN ('housing', 'utilities', 'entertainment', 'health', 'transportation', 'food', 'subscriptions', 'insurance', 'other')),
    due_date INTEGER NOT NULL CHECK (due_date >= 1 AND due_date <= 31),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
    auto_pay INTEGER DEFAULT 0,
    reminder_enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

## Side Projects & Income Streams

### 10. Side Projects Table
Manages additional income streams and projects.

```sql
CREATE TABLE side_projects (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'paused', 'completed', 'cancelled')),
    current_monthly_earnings REAL DEFAULT 0 CHECK (current_monthly_earnings >= 0),
    projected_monthly_earnings REAL DEFAULT 0 CHECK (projected_monthly_earnings >= 0),
    time_invested_weekly REAL DEFAULT 0 CHECK (time_invested_weekly >= 0),
    start_date TEXT,
    end_date TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### 11. Income Sources Table
Manages income streams with support for contract-based/scheduled income.

```sql
CREATE TABLE income_sources (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    income_type TEXT NOT NULL CHECK (income_type IN ('salary', 'hourly', 'commission', 'freelance', 'other')),
    pay_frequency TEXT NOT NULL CHECK (pay_frequency IN ('weekly', 'biweekly', 'semimonthly', 'monthly', 'variable')),
    base_amount REAL DEFAULT 0 CHECK (base_amount >= 0),
    hours_per_week REAL DEFAULT 0 CHECK (hours_per_week >= 0),
    is_commission_based INTEGER DEFAULT 0,
    commission_high REAL DEFAULT 0 CHECK (commission_high >= 0),
    commission_low REAL DEFAULT 0 CHECK (commission_low >= 0),
    commission_frequency_per_period REAL DEFAULT 0 CHECK (commission_frequency_per_period >= 0),
    estimated_monthly_low REAL DEFAULT 0,
    estimated_monthly_mid REAL DEFAULT 0,
    estimated_monthly_high REAL DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended')),
    -- Contract/Schedule fields
    start_date TEXT,                -- When income begins (for contracts)
    end_date TEXT,                  -- When income ends (for contracts)
    initial_payment REAL DEFAULT 0, -- Down payment / signing bonus
    final_payment REAL DEFAULT 0,   -- Completion bonus / final payment
    final_payment_date TEXT,        -- When final payment is expected (if different from end_date)
    is_primary INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**Contract/Schedule Features:**
- `start_date` / `end_date`: Define contract duration (e.g., 6-month freelance project)
- `initial_payment`: Down payment or signing bonus received at start
- `final_payment`: Completion bonus or milestone payment at end
- `final_payment_date`: Specific date for final payment (useful if different from contract end)

These fields enable tracking of various contract scenarios:
- Fixed-term contracts (e.g., $500/month for 6 months)
- Contracts with signing bonuses (e.g., $1000 upfront + $400/month)
- Milestone-based work (e.g., monthly payments + final delivery payment)

---

## Milestones & Progress Tracking

### 12. Financial Milestones Table
Tracks major financial achievements and roadmap items.

```sql
CREATE TABLE financial_milestones (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    target_amount REAL,
    current_amount REAL DEFAULT 0,
    category TEXT NOT NULL CHECK (category IN ('security', 'debt', 'lifestyle', 'transportation', 'growth', 'investment', 'other')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'in-progress', 'completed', 'cancelled')),
    impact_level TEXT DEFAULT 'medium' CHECK (impact_level IN ('low', 'medium', 'high')),
    deadline TEXT,
    completed_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

## Migration

To set up the database schema, run:

```bash
npm run db:migrate
```

This will execute the migration script at `scripts/migrate-turso.ts` which creates all tables and seeds default categories.

---

## Key Differences from PostgreSQL

| PostgreSQL | SQLite/Turso |
|------------|--------------|
| `UUID` | `TEXT` (with app-generated UUIDs) |
| `TIMESTAMP WITH TIME ZONE` | `TEXT` (ISO 8601 format) |
| `DECIMAL(10,2)` | `REAL` |
| `BOOLEAN` | `INTEGER` (0 or 1) |
| `gen_random_uuid()` | Generated in application code |
| Row Level Security (RLS) | Implemented in application layer |
| Database triggers | Handled in application code |

---

## Security Considerations

Since SQLite doesn't support Row Level Security (RLS), data isolation is enforced at the application layer:

1. All queries include `user_id` filtering
2. The custom NextAuth adapter ensures users can only access their own data
3. Session validation is performed on every authenticated request
