-- Database Setup Script for Frem Application
-- Fix RLS policies and authentication issues

-- Enable Row Level Security on all user tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE side_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_milestones ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can access their own profile" ON users;
DROP POLICY IF EXISTS "Users can access their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can access their own transactions" ON daily_transactions;
DROP POLICY IF EXISTS "Users can access their own goals" ON financial_goals;
DROP POLICY IF EXISTS "Users can access their own recurring expenses" ON recurring_expenses;
DROP POLICY IF EXISTS "Users can access their own side projects" ON side_projects;
DROP POLICY IF EXISTS "Users can access their own milestones" ON financial_milestones;

-- Create RLS policies for users table
CREATE POLICY "Users can access their own profile" ON users
    FOR ALL USING (auth.uid() = id);

-- Create RLS policies for user_settings table
CREATE POLICY "Users can access their own settings" ON user_settings
    FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for daily_transactions table
CREATE POLICY "Users can access their own transactions" ON daily_transactions
    FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for financial_goals table
CREATE POLICY "Users can access their own goals" ON financial_goals
    FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for recurring_expenses table
CREATE POLICY "Users can access their own recurring expenses" ON recurring_expenses
    FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for side_projects table
CREATE POLICY "Users can access their own side projects" ON side_projects
    FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for financial_milestones table
CREATE POLICY "Users can access their own milestones" ON financial_milestones
    FOR ALL USING (auth.uid() = user_id);

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, first_name, last_name, profile_image_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL)
    )
    ON CONFLICT (id) DO NOTHING;
    
    INSERT INTO public.user_settings (user_id, daily_budget_target, currency, notifications_enabled, dark_mode)
    VALUES (
        NEW.id,
        150.00,
        'USD',
        TRUE,
        FALSE
    )
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it exists and recreate it
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Ensure the user_settings table has proper unique constraint on user_id
-- This will fail silently if the constraint already exists
DO $$
BEGIN
    BEGIN
        ALTER TABLE user_settings ADD CONSTRAINT user_settings_user_id_unique UNIQUE(user_id);
    EXCEPTION
        WHEN duplicate_table THEN
            -- Constraint already exists, do nothing
            NULL;
    END;
END $$;

-- Add some helpful comments
COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates user profile and settings when a new user signs up via Supabase Auth'; 

-- Transaction Allocations Table
-- Tracks how income transactions are allocated to specific goals or recurring expenses
CREATE TABLE transaction_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES daily_transactions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    allocation_type VARCHAR(20) NOT NULL CHECK (allocation_type IN ('goal', 'expense', 'general')),
    target_id UUID, -- References financial_goals.id or recurring_expenses.id
    allocated_amount DECIMAL(10,2) NOT NULL CHECK (allocated_amount > 0),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for transaction_allocations
CREATE INDEX idx_transaction_allocations_transaction ON transaction_allocations(transaction_id);
CREATE INDEX idx_transaction_allocations_user ON transaction_allocations(user_id);
CREATE INDEX idx_transaction_allocations_type ON transaction_allocations(allocation_type);
CREATE INDEX idx_transaction_allocations_target ON transaction_allocations(target_id);

-- RLS for transaction_allocations
ALTER TABLE transaction_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own allocations" ON transaction_allocations
    FOR ALL USING (user_id = auth.uid());

-- Updated at trigger for transaction_allocations
CREATE TRIGGER update_transaction_allocations_updated_at BEFORE UPDATE ON transaction_allocations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 