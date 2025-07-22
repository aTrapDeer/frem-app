# Frem Application Database Schema

## Overview
This document outlines the PostgreSQL database schema for the Frem personal finance management application. The schema supports user authentication, financial tracking, goal management, recurring expenses, side projects, and AI-powered insights.

---

## Core Tables

### 1. Users Table
Manages user authentication and basic profile information.

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    profile_image_url TEXT,
    timezone VARCHAR(50) DEFAULT 'UTC'
);
```

### 2. User Settings Table
Stores user preferences and configuration settings.

```sql
CREATE TABLE user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    daily_budget_target DECIMAL(10,2) DEFAULT 150.00,
    currency VARCHAR(3) DEFAULT 'USD',
    preferred_language VARCHAR(5) DEFAULT 'en',
    notifications_enabled BOOLEAN DEFAULT TRUE,
    dark_mode BOOLEAN DEFAULT FALSE,
    weekly_summary_email BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## Financial Tracking Tables

### 3. Daily Transactions Table
Records all daily income and expense entries.

```sql
CREATE TABLE daily_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    description TEXT NOT NULL,
    category VARCHAR(50),
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    transaction_time TIME WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_daily_transactions_user_date (user_id, transaction_date),
    INDEX idx_daily_transactions_type (type),
    INDEX idx_daily_transactions_category (category)
);
```

### 4. Transaction Categories Table
Predefined and custom categories for transactions.

```sql
CREATE TABLE transaction_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense', 'both')),
    color VARCHAR(7) DEFAULT '#6366f1', -- Hex color code
    icon VARCHAR(50),
    is_system BOOLEAN DEFAULT FALSE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(name, user_id)
);
```

---

## Goals Management Tables

### 5. Financial Goals Table
Stores user-defined financial goals and targets.

```sql
CREATE TABLE financial_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    target_amount DECIMAL(12,2) NOT NULL CHECK (target_amount > 0),
    current_amount DECIMAL(12,2) DEFAULT 0 CHECK (current_amount >= 0),
    category VARCHAR(50) NOT NULL CHECK (category IN ('emergency', 'vacation', 'car', 'house', 'debt', 'investment', 'other')),
    deadline DATE NOT NULL,
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    INDEX idx_financial_goals_user_status (user_id, status),
    INDEX idx_financial_goals_deadline (deadline),
    INDEX idx_financial_goals_category (category)
);
```

### 6. Goal Contributions Table
Tracks contributions made toward specific goals.

```sql
CREATE TABLE goal_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID REFERENCES financial_goals(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    contribution_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT,
    transaction_id UUID REFERENCES daily_transactions(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_goal_contributions_goal_date (goal_id, contribution_date),
    INDEX idx_goal_contributions_user (user_id)
);
```

---

## Recurring Expenses Tables

### 7. Recurring Expenses Table
Manages monthly subscriptions and recurring payments.

```sql
CREATE TABLE recurring_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    category VARCHAR(50) NOT NULL CHECK (category IN ('housing', 'utilities', 'entertainment', 'health', 'transportation', 'food', 'subscriptions', 'insurance', 'other')),
    due_date INTEGER NOT NULL CHECK (due_date >= 1 AND due_date <= 31),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
    auto_pay BOOLEAN DEFAULT FALSE,
    reminder_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_recurring_expenses_user_status (user_id, status),
    INDEX idx_recurring_expenses_due_date (due_date),
    INDEX idx_recurring_expenses_category (category)
);
```

### 8. Recurring Expense Payments Table
Tracks actual payments for recurring expenses.

```sql
CREATE TABLE recurring_expense_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recurring_expense_id UUID REFERENCES recurring_expenses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    amount_paid DECIMAL(10,2) NOT NULL CHECK (amount_paid > 0),
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50),
    transaction_id UUID REFERENCES daily_transactions(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_recurring_payments_expense_date (recurring_expense_id, payment_date),
    INDEX idx_recurring_payments_user_date (user_id, payment_date)
);
```

---

## Side Projects & Income Streams

### 9. Side Projects Table
Manages additional income streams and projects.

```sql
CREATE TABLE side_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    status VARCHAR(20) DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'paused', 'completed', 'cancelled')),
    current_monthly_earnings DECIMAL(10,2) DEFAULT 0 CHECK (current_monthly_earnings >= 0),
    projected_monthly_earnings DECIMAL(10,2) DEFAULT 0 CHECK (projected_monthly_earnings >= 0),
    time_invested_weekly DECIMAL(4,1) DEFAULT 0 CHECK (time_invested_weekly >= 0),
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_side_projects_user_status (user_id, status),
    INDEX idx_side_projects_category (category)
);
```

### 10. Side Project Earnings Table
Tracks earnings from side projects over time.

```sql
CREATE TABLE side_project_earnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    side_project_id UUID REFERENCES side_projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    earnings_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT,
    client_name VARCHAR(200),
    transaction_id UUID REFERENCES daily_transactions(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_side_project_earnings_project_date (side_project_id, earnings_date),
    INDEX idx_side_project_earnings_user_date (user_id, earnings_date)
);
```

---

## Milestones & Progress Tracking

### 11. Financial Milestones Table
Tracks major financial achievements and roadmap items.

```sql
CREATE TABLE financial_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    target_amount DECIMAL(12,2),
    current_amount DECIMAL(12,2) DEFAULT 0,
    category VARCHAR(50) NOT NULL CHECK (category IN ('security', 'debt', 'lifestyle', 'transportation', 'growth', 'investment', 'other')),
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    status VARCHAR(20) DEFAULT 'planned' CHECK (status IN ('planned', 'in-progress', 'completed', 'cancelled')),
    impact_level VARCHAR(10) DEFAULT 'medium' CHECK (impact_level IN ('low', 'medium', 'high')),
    deadline DATE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_financial_milestones_user_status (user_id, status),
    INDEX idx_financial_milestones_deadline (deadline),
    INDEX idx_financial_milestones_category (category)
);
```

---

## AI Insights & Analytics

### 12. AI Insights Table
Stores AI-generated financial insights and recommendations.

```sql
CREATE TABLE ai_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    insight_type VARCHAR(50) NOT NULL CHECK (insight_type IN ('spending_pattern', 'saving_opportunity', 'goal_optimization', 'income_boost', 'expense_reduction', 'investment_suggestion')),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    impact_level VARCHAR(10) DEFAULT 'medium' CHECK (impact_level IN ('low', 'medium', 'high')),
    effort_level VARCHAR(10) DEFAULT 'medium' CHECK (effort_level IN ('low', 'medium', 'high')),
    potential_savings DECIMAL(10,2),
    potential_earnings DECIMAL(10,2),
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    is_dismissed BOOLEAN DEFAULT FALSE,
    is_applied BOOLEAN DEFAULT FALSE,
    valid_until DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_ai_insights_user_type (user_id, insight_type),
    INDEX idx_ai_insights_impact (impact_level),
    INDEX idx_ai_insights_valid (valid_until)
);
```

### 13. Budget Analysis Table
Stores periodic budget analysis and trends.

```sql
CREATE TABLE budget_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    analysis_period VARCHAR(20) NOT NULL CHECK (analysis_period IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_income DECIMAL(12,2) DEFAULT 0,
    total_expenses DECIMAL(12,2) DEFAULT 0,
    net_amount DECIMAL(12,2) DEFAULT 0,
    budget_target DECIMAL(12,2),
    budget_variance DECIMAL(12,2),
    largest_expense_category VARCHAR(50),
    largest_income_source VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_budget_analysis_user_period (user_id, analysis_period, period_start),
    UNIQUE(user_id, analysis_period, period_start)
);
```

---

## Notification & Communication Tables

### 14. Notifications Table
Manages in-app notifications and alerts.

```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('goal_reminder', 'bill_due', 'milestone_achieved', 'insight_available', 'budget_alert', 'system_update')),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    is_dismissed BOOLEAN DEFAULT FALSE,
    action_url TEXT,
    scheduled_for TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_notifications_user_read (user_id, is_read),
    INDEX idx_notifications_type (type),
    INDEX idx_notifications_scheduled (scheduled_for)
);
```

---

## Database Views for Common Queries

### 15. User Dashboard Summary View
Provides quick access to key dashboard metrics.

```sql
CREATE VIEW user_dashboard_summary AS
SELECT 
    u.id as user_id,
    us.daily_budget_target,
    COALESCE(daily_total.total, 0) as today_total,
    COALESCE(goal_progress.total_progress, 0) as total_goal_progress,
    COALESCE(recurring_monthly.total, 0) as monthly_recurring_total,
    COALESCE(side_income.total, 0) as monthly_side_income
FROM users u
LEFT JOIN user_settings us ON u.id = us.user_id
LEFT JOIN (
    SELECT 
        user_id,
        SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as total
    FROM daily_transactions 
    WHERE transaction_date = CURRENT_DATE
    GROUP BY user_id
) daily_total ON u.id = daily_total.user_id
LEFT JOIN (
    SELECT 
        user_id,
        AVG((current_amount / NULLIF(target_amount, 0)) * 100) as total_progress
    FROM financial_goals 
    WHERE status = 'active'
    GROUP BY user_id
) goal_progress ON u.id = goal_progress.user_id
LEFT JOIN (
    SELECT 
        user_id,
        SUM(amount) as total
    FROM recurring_expenses 
    WHERE status = 'active'
    GROUP BY user_id
) recurring_monthly ON u.id = recurring_monthly.user_id
LEFT JOIN (
    SELECT 
        user_id,
        SUM(current_monthly_earnings) as total
    FROM side_projects 
    WHERE status = 'active'
    GROUP BY user_id
) side_income ON u.id = side_income.user_id;
```

---

## Indexes for Performance

### Additional Performance Indexes

```sql
-- Daily transactions performance
CREATE INDEX idx_daily_transactions_amount ON daily_transactions(amount);
CREATE INDEX idx_daily_transactions_created_at ON daily_transactions(created_at);

-- Goals performance
CREATE INDEX idx_financial_goals_progress ON financial_goals((current_amount / target_amount));
CREATE INDEX idx_financial_goals_user_deadline ON financial_goals(user_id, deadline);

-- Milestones performance
CREATE INDEX idx_financial_milestones_progress ON financial_milestones((current_amount / target_amount));

-- Side projects performance
CREATE INDEX idx_side_projects_earnings_ratio ON side_projects((current_monthly_earnings / NULLIF(projected_monthly_earnings, 0)));

-- AI insights performance
CREATE INDEX idx_ai_insights_user_active ON ai_insights(user_id) WHERE is_dismissed = FALSE AND valid_until > CURRENT_DATE;
```

---

## Security Considerations

### Row Level Security (RLS) Policies

```sql
-- Enable RLS on all user-specific tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE side_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Example RLS policy for daily_transactions
CREATE POLICY "Users can only access their own transactions" ON daily_transactions
    FOR ALL USING (auth.uid() = user_id);

-- Apply similar policies to all user-specific tables
```

---

## Triggers for Data Integrity

### Auto-update Timestamps

```sql
-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_transactions_updated_at BEFORE UPDATE ON daily_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add similar triggers for other tables with updated_at columns
```

### Goal Progress Auto-calculation

```sql
-- Function to update goal progress when contributions are added
CREATE OR REPLACE FUNCTION update_goal_progress()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE financial_goals 
    SET current_amount = (
        SELECT COALESCE(SUM(amount), 0) 
        FROM goal_contributions 
        WHERE goal_id = NEW.goal_id
    )
    WHERE id = NEW.goal_id;
    
    -- Mark goal as completed if target is reached
    UPDATE financial_goals 
    SET status = 'completed', completed_at = NOW()
    WHERE id = NEW.goal_id 
      AND current_amount >= target_amount 
      AND status = 'active';
      
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_goal_progress_trigger 
    AFTER INSERT OR UPDATE OR DELETE ON goal_contributions
    FOR EACH ROW EXECUTE FUNCTION update_goal_progress();
```

---

## Sample Data Migration Scripts

### Initial Categories Setup

```sql
-- Insert default transaction categories
INSERT INTO transaction_categories (name, type, color, icon, is_system) VALUES
('Salary', 'income', '#10b981', 'briefcase', true),
('Freelance', 'income', '#3b82f6', 'laptop', true),
('Investment', 'income', '#8b5cf6', 'trending-up', true),
('Food & Dining', 'expense', '#ef4444', 'utensils', true),
('Transportation', 'expense', '#f59e0b', 'car', true),
('Shopping', 'expense', '#ec4899', 'shopping-bag', true),
('Entertainment', 'expense', '#06b6d4', 'film', true),
('Bills & Utilities', 'expense', '#6366f1', 'receipt', true),
('Healthcare', 'expense', '#84cc16', 'heart', true),
('Education', 'expense', '#14b8a6', 'book', true);
```

---

## Deployment Notes for Supabase

### Environment Setup

1. **Enable Required Extensions**:
   ```sql
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   CREATE EXTENSION IF NOT EXISTS "pgcrypto";
   ```

2. **Configure Authentication**:
   - Enable email/password authentication in Supabase dashboard
   - Configure email templates for verification
   - Set up proper redirect URLs

3. **Storage Setup**:
   - Create bucket for profile images: `profile-images`
   - Set appropriate storage policies

4. **API Configuration**:
   - Configure CORS settings for your domain
   - Set up proper API rate limiting
   - Enable real-time subscriptions for dashboard updates

5. **Backup Strategy**:
   - Enable point-in-time recovery
   - Set up automated daily backups
   - Configure backup retention policy

This schema provides a robust foundation for the Frem application with proper relationships, constraints, and performance optimizations. The structure supports all the features I observed in your codebase while maintaining data integrity and scalability. 