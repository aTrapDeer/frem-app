/**
 * Turso Database Setup Script
 * 
 * This script creates a fresh database schema in your Turso database.
 * It will create all necessary tables for the Frem application.
 * 
 * Usage: npm run db:setup
 */

import { createClient } from '@libsql/client'
import * as dotenv from 'dotenv'

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' })

// Validate environment variables
if (!process.env.TURSO_DATABASE_URL) {
  console.error('❌ Error: TURSO_DATABASE_URL is not set in .env.local')
  console.log('\nPlease create a .env.local file with:')
  console.log('  TURSO_DATABASE_URL=libsql://your-database.turso.io')
  console.log('  TURSO_AUTH_TOKEN=your-auth-token')
  process.exit(1)
}

if (!process.env.TURSO_AUTH_TOKEN) {
  console.error('❌ Error: TURSO_AUTH_TOKEN is not set in .env.local')
  process.exit(1)
}

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

// SQL statements to create all tables
const createTableStatements = [
  // =============================================
  // NextAuth.js Required Tables
  // =============================================
  {
    name: 'users',
    sql: `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT,
      email TEXT UNIQUE,
      email_verified TEXT,
      image TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`
  },
  {
    name: 'accounts',
    sql: `CREATE TABLE IF NOT EXISTS accounts (
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
    )`
  },
  {
    name: 'sessions',
    sql: `CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY NOT NULL,
      session_token TEXT UNIQUE NOT NULL,
      user_id TEXT NOT NULL,
      expires TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`
  },
  {
    name: 'verification_tokens',
    sql: `CREATE TABLE IF NOT EXISTS verification_tokens (
      identifier TEXT NOT NULL,
      token TEXT NOT NULL,
      expires TEXT NOT NULL,
      PRIMARY KEY (identifier, token)
    )`
  },

  // =============================================
  // Application Tables
  // =============================================
  {
    name: 'user_settings',
    sql: `CREATE TABLE IF NOT EXISTS user_settings (
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
    )`
  },
  {
    name: 'daily_transactions',
    sql: `CREATE TABLE IF NOT EXISTS daily_transactions (
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
    )`
  },
  {
    name: 'transaction_categories',
    sql: `CREATE TABLE IF NOT EXISTS transaction_categories (
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
    )`
  },
  {
    name: 'financial_goals',
    sql: `CREATE TABLE IF NOT EXISTS financial_goals (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      target_amount REAL NOT NULL CHECK (target_amount > 0),
      current_amount REAL DEFAULT 0 CHECK (current_amount >= 0),
      category TEXT NOT NULL CHECK (category IN ('emergency', 'vacation', 'car', 'house', 'debt', 'investment', 'other')),
      deadline TEXT NOT NULL,
      priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
      status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`
  },
  {
    name: 'goal_contributions',
    sql: `CREATE TABLE IF NOT EXISTS goal_contributions (
      id TEXT PRIMARY KEY NOT NULL,
      goal_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      amount REAL NOT NULL CHECK (amount > 0),
      contribution_date TEXT NOT NULL DEFAULT (date('now')),
      description TEXT,
      source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'one_time_income', 'auto_allocation')),
      source_id TEXT,
      transaction_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (goal_id) REFERENCES financial_goals(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (transaction_id) REFERENCES daily_transactions(id)
    )`
  },
  {
    name: 'recurring_expenses',
    sql: `CREATE TABLE IF NOT EXISTS recurring_expenses (
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
    )`
  },
  {
    name: 'recurring_expense_payments',
    sql: `CREATE TABLE IF NOT EXISTS recurring_expense_payments (
      id TEXT PRIMARY KEY NOT NULL,
      recurring_expense_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      amount_paid REAL NOT NULL CHECK (amount_paid > 0),
      payment_date TEXT NOT NULL,
      payment_method TEXT,
      transaction_id TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (recurring_expense_id) REFERENCES recurring_expenses(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (transaction_id) REFERENCES daily_transactions(id)
    )`
  },
  {
    name: 'side_projects',
    sql: `CREATE TABLE IF NOT EXISTS side_projects (
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
    )`
  },
  {
    name: 'income_sources',
    sql: `CREATE TABLE IF NOT EXISTS income_sources (
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
      start_date TEXT,
      end_date TEXT,
      is_primary INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`
  },
  {
    name: 'side_project_earnings',
    sql: `CREATE TABLE IF NOT EXISTS side_project_earnings (
      id TEXT PRIMARY KEY NOT NULL,
      side_project_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      amount REAL NOT NULL CHECK (amount > 0),
      earnings_date TEXT NOT NULL DEFAULT (date('now')),
      description TEXT,
      client_name TEXT,
      transaction_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (side_project_id) REFERENCES side_projects(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (transaction_id) REFERENCES daily_transactions(id)
    )`
  },
  {
    name: 'financial_milestones',
    sql: `CREATE TABLE IF NOT EXISTS financial_milestones (
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
    )`
  },
  {
    name: 'ai_insights',
    sql: `CREATE TABLE IF NOT EXISTS ai_insights (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      insight_type TEXT NOT NULL CHECK (insight_type IN ('spending_pattern', 'saving_opportunity', 'goal_optimization', 'income_boost', 'expense_reduction', 'investment_suggestion')),
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      impact_level TEXT DEFAULT 'medium' CHECK (impact_level IN ('low', 'medium', 'high')),
      effort_level TEXT DEFAULT 'medium' CHECK (effort_level IN ('low', 'medium', 'high')),
      potential_savings REAL,
      potential_earnings REAL,
      confidence_score REAL CHECK (confidence_score >= 0 AND confidence_score <= 1),
      is_dismissed INTEGER DEFAULT 0,
      is_applied INTEGER DEFAULT 0,
      valid_until TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`
  },
  {
    name: 'budget_analysis',
    sql: `CREATE TABLE IF NOT EXISTS budget_analysis (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      analysis_period TEXT NOT NULL CHECK (analysis_period IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      total_income REAL DEFAULT 0,
      total_expenses REAL DEFAULT 0,
      net_amount REAL DEFAULT 0,
      budget_target REAL,
      budget_variance REAL,
      largest_expense_category TEXT,
      largest_income_source TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, analysis_period, period_start)
    )`
  },
  {
    name: 'notifications',
    sql: `CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('goal_reminder', 'bill_due', 'milestone_achieved', 'insight_available', 'budget_alert', 'system_update')),
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      is_dismissed INTEGER DEFAULT 0,
      action_url TEXT,
      scheduled_for TEXT,
      sent_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`
  },
  {
    name: 'transaction_allocations',
    sql: `CREATE TABLE IF NOT EXISTS transaction_allocations (
      id TEXT PRIMARY KEY NOT NULL,
      transaction_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      allocation_type TEXT NOT NULL CHECK (allocation_type IN ('goal', 'expense', 'general')),
      target_id TEXT,
      allocated_amount REAL NOT NULL CHECK (allocated_amount > 0),
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (transaction_id) REFERENCES daily_transactions(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`
  },
  {
    name: 'ai_financial_reports',
    sql: `CREATE TABLE IF NOT EXISTS ai_financial_reports (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT UNIQUE NOT NULL,
      report_content TEXT NOT NULL,
      financial_health_score INTEGER CHECK (financial_health_score >= 0 AND financial_health_score <= 100),
      context_hash TEXT NOT NULL,
      model_used TEXT NOT NULL,
      total_monthly_income REAL DEFAULT 0,
      total_monthly_expenses REAL DEFAULT 0,
      total_goals_amount REAL DEFAULT 0,
      active_goals_count INTEGER DEFAULT 0,
      generated_at TEXT DEFAULT (datetime('now')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`
  },
  {
    name: 'financial_accounts',
    sql: `CREATE TABLE IF NOT EXISTS financial_accounts (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      account_type TEXT NOT NULL CHECK (account_type IN ('checking', 'savings')),
      name TEXT NOT NULL,
      balance REAL DEFAULT 0 CHECK (balance >= 0),
      institution TEXT,
      notes TEXT,
      is_primary INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`
  },
  {
    name: 'one_time_income',
    sql: `CREATE TABLE IF NOT EXISTS one_time_income (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      amount REAL NOT NULL CHECK (amount > 0),
      description TEXT NOT NULL,
      source TEXT NOT NULL CHECK (source IN ('sale', 'gift', 'bonus', 'refund', 'cashback', 'settlement', 'inheritance', 'other')),
      income_date TEXT NOT NULL DEFAULT (date('now')),
      applied_to_goals INTEGER DEFAULT 0,
      goal_id TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (goal_id) REFERENCES financial_goals(id) ON DELETE SET NULL
    )`
  }
]

// Index creation statements
const createIndexStatements = [
  'CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token)',
  'CREATE INDEX IF NOT EXISTS idx_daily_transactions_user_date ON daily_transactions(user_id, transaction_date)',
  'CREATE INDEX IF NOT EXISTS idx_daily_transactions_type ON daily_transactions(type)',
  'CREATE INDEX IF NOT EXISTS idx_daily_transactions_category ON daily_transactions(category)',
  'CREATE INDEX IF NOT EXISTS idx_financial_goals_user_status ON financial_goals(user_id, status)',
  'CREATE INDEX IF NOT EXISTS idx_financial_goals_deadline ON financial_goals(deadline)',
  'CREATE INDEX IF NOT EXISTS idx_financial_goals_category ON financial_goals(category)',
  'CREATE INDEX IF NOT EXISTS idx_recurring_expenses_user_status ON recurring_expenses(user_id, status)',
  'CREATE INDEX IF NOT EXISTS idx_recurring_expenses_due_date ON recurring_expenses(due_date)',
  'CREATE INDEX IF NOT EXISTS idx_side_projects_user_status ON side_projects(user_id, status)',
  'CREATE INDEX IF NOT EXISTS idx_income_sources_user_status ON income_sources(user_id, status)',
  'CREATE INDEX IF NOT EXISTS idx_financial_milestones_user_status ON financial_milestones(user_id, status)',
  'CREATE INDEX IF NOT EXISTS idx_financial_milestones_deadline ON financial_milestones(deadline)',
  'CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read)',
  'CREATE INDEX IF NOT EXISTS idx_transaction_allocations_transaction ON transaction_allocations(transaction_id)',
  'CREATE INDEX IF NOT EXISTS idx_transaction_allocations_user ON transaction_allocations(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_ai_financial_reports_user ON ai_financial_reports(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_financial_accounts_user ON financial_accounts(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_financial_accounts_type ON financial_accounts(account_type)',
  'CREATE INDEX IF NOT EXISTS idx_one_time_income_user ON one_time_income(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_one_time_income_date ON one_time_income(income_date)',
]

// Default categories to seed
const defaultCategories = [
  { id: 'cat_salary', name: 'Salary', type: 'income', color: '#10b981', icon: 'briefcase' },
  { id: 'cat_freelance', name: 'Freelance', type: 'income', color: '#3b82f6', icon: 'laptop' },
  { id: 'cat_investment', name: 'Investment', type: 'income', color: '#8b5cf6', icon: 'trending-up' },
  { id: 'cat_bonus', name: 'Bonus', type: 'income', color: '#f59e0b', icon: 'gift' },
  { id: 'cat_gift', name: 'Gift', type: 'income', color: '#ec4899', icon: 'heart' },
  { id: 'cat_other_income', name: 'Other Income', type: 'income', color: '#6b7280', icon: 'plus-circle' },
  { id: 'cat_food', name: 'Food & Dining', type: 'expense', color: '#ef4444', icon: 'utensils' },
  { id: 'cat_transport', name: 'Transportation', type: 'expense', color: '#f59e0b', icon: 'car' },
  { id: 'cat_shopping', name: 'Shopping', type: 'expense', color: '#ec4899', icon: 'shopping-bag' },
  { id: 'cat_entertainment', name: 'Entertainment', type: 'expense', color: '#06b6d4', icon: 'film' },
  { id: 'cat_bills', name: 'Bills & Utilities', type: 'expense', color: '#6366f1', icon: 'receipt' },
  { id: 'cat_healthcare', name: 'Healthcare', type: 'expense', color: '#84cc16', icon: 'heart-pulse' },
  { id: 'cat_education', name: 'Education', type: 'expense', color: '#14b8a6', icon: 'book' },
  { id: 'cat_other_expense', name: 'Other Expense', type: 'expense', color: '#6b7280', icon: 'minus-circle' },
]

async function setup() {
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║           FREM Database Setup - Fresh Install              ║')
  console.log('╚════════════════════════════════════════════════════════════╝')
  console.log('')
  console.log(`📡 Connecting to: ${process.env.TURSO_DATABASE_URL}`)
  console.log('')

  // Test connection
  try {
    await db.execute({ sql: 'SELECT 1' })
    console.log('✅ Database connection successful!\n')
  } catch (error) {
    console.error('❌ Failed to connect to database:', error)
    process.exit(1)
  }

  // Create tables
  console.log('📦 Creating tables...\n')
  
  for (const table of createTableStatements) {
    try {
      await db.execute({ sql: table.sql })
      console.log(`   ✅ ${table.name}`)
    } catch (error) {
      console.error(`   ❌ ${table.name}:`, error)
    }
  }

  // Create indexes
  console.log('\n📇 Creating indexes...\n')
  
  for (const indexSql of createIndexStatements) {
    try {
      await db.execute({ sql: indexSql })
      const indexName = indexSql.match(/idx_\w+/)?.[0] || 'index'
      console.log(`   ✅ ${indexName}`)
    } catch (error) {
      console.error(`   ❌ Error creating index:`, error)
    }
  }

  // Seed default categories
  console.log('\n🌱 Seeding default categories...\n')
  
  for (const cat of defaultCategories) {
    try {
      await db.execute({
        sql: `INSERT OR IGNORE INTO transaction_categories (id, name, type, color, icon, is_system) 
              VALUES (?, ?, ?, ?, ?, 1)`,
        args: [cat.id, cat.name, cat.type, cat.color, cat.icon]
      })
      console.log(`   ✅ ${cat.name}`)
    } catch (error) {
      console.error(`   ❌ ${cat.name}:`, error)
    }
  }

  // Verify setup
  console.log('\n📋 Verifying setup...\n')
  
  const tables = await db.execute({
    sql: `SELECT name FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name`
  })
  
  console.log(`   Found ${tables.rows.length} tables:`)
  tables.rows.forEach(row => {
    console.log(`   • ${row.name}`)
  })

  console.log('\n╔════════════════════════════════════════════════════════════╗')
  console.log('║                  ✨ Setup Complete! ✨                     ║')
  console.log('╚════════════════════════════════════════════════════════════╝')
  console.log('\nYour database is ready. Next steps:')
  console.log('  1. Set up Google OAuth credentials')
  console.log('  2. Run: npm run dev')
  console.log('  3. Visit: http://localhost:3000')
  console.log('')
}

setup()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n💥 Setup failed:', error)
    process.exit(1)
  })

