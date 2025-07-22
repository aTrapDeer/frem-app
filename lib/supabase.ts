import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_URL environment variable. ' +
    'Please check your .env.local file and make sure it includes your Supabase project URL.'
  )
}

if (!supabaseAnonKey) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable. ' +
    'Please check your .env.local file and make sure it includes your Supabase anon key.'
  )
}

// Client-side Supabase client for browser usage with proper auth config
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'implicit'
  }
})

// Create a Supabase client for client components
export const createClientSupabase = () => createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'implicit'
  }
})

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          first_name: string | null
          last_name: string | null
          created_at: string
          updated_at: string
          is_active: boolean
          profile_image_url: string | null
        }
        Insert: {
          id?: string
          email: string
          first_name?: string | null
          last_name?: string | null
          created_at?: string
          updated_at?: string
          is_active?: boolean
          profile_image_url?: string | null
        }
        Update: {
          id?: string
          email?: string
          first_name?: string | null
          last_name?: string | null
          updated_at?: string
          is_active?: boolean
          profile_image_url?: string | null
        }
      }
      user_settings: {
        Row: {
          id: string
          user_id: string
          daily_budget_target: number
          currency: string
          notifications_enabled: boolean
          dark_mode: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          daily_budget_target?: number
          currency?: string
          notifications_enabled?: boolean
          dark_mode?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          daily_budget_target?: number
          currency?: string
          notifications_enabled?: boolean
          dark_mode?: boolean
          updated_at?: string
        }
      }
      daily_transactions: {
        Row: {
          id: string
          user_id: string
          type: 'income' | 'expense'
          amount: number
          description: string
          category: string | null
          transaction_date: string
          transaction_time: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'income' | 'expense'
          amount: number
          description: string
          category?: string | null
          transaction_date?: string
          transaction_time?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'income' | 'expense'
          amount?: number
          description?: string
          category?: string | null
          transaction_date?: string
          transaction_time?: string
          updated_at?: string
        }
      }
      financial_goals: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          target_amount: number
          current_amount: number
          category: 'emergency' | 'vacation' | 'car' | 'house' | 'debt' | 'investment' | 'other'
          deadline: string
          priority: 'low' | 'medium' | 'high'
          status: 'active' | 'completed' | 'paused' | 'cancelled'
          created_at: string
          updated_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          target_amount: number
          current_amount?: number
          category: 'emergency' | 'vacation' | 'car' | 'house' | 'debt' | 'investment' | 'other'
          deadline: string
          priority?: 'low' | 'medium' | 'high'
          status?: 'active' | 'completed' | 'paused' | 'cancelled'
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          target_amount?: number
          current_amount?: number
          category?: 'emergency' | 'vacation' | 'car' | 'house' | 'debt' | 'investment' | 'other'
          deadline?: string
          priority?: 'low' | 'medium' | 'high'
          status?: 'active' | 'completed' | 'paused' | 'cancelled'
          updated_at?: string
          completed_at?: string | null
        }
      }
      recurring_expenses: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          amount: number
          category: 'housing' | 'utilities' | 'entertainment' | 'health' | 'transportation' | 'food' | 'subscriptions' | 'insurance' | 'other'
          due_date: number
          status: 'active' | 'paused' | 'cancelled'
          auto_pay: boolean
          reminder_enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          amount: number
          category: 'housing' | 'utilities' | 'entertainment' | 'health' | 'transportation' | 'food' | 'subscriptions' | 'insurance' | 'other'
          due_date: number
          status?: 'active' | 'paused' | 'cancelled'
          auto_pay?: boolean
          reminder_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          amount?: number
          category?: 'housing' | 'utilities' | 'entertainment' | 'health' | 'transportation' | 'food' | 'subscriptions' | 'insurance' | 'other'
          due_date?: number
          status?: 'active' | 'paused' | 'cancelled'
          auto_pay?: boolean
          reminder_enabled?: boolean
          updated_at?: string
        }
      }
      side_projects: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          category: string | null
          status: 'planning' | 'active' | 'paused' | 'completed' | 'cancelled'
          current_monthly_earnings: number
          projected_monthly_earnings: number
          time_invested_weekly: number
          start_date: string | null
          end_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          category?: string | null
          status?: 'planning' | 'active' | 'paused' | 'completed' | 'cancelled'
          current_monthly_earnings?: number
          projected_monthly_earnings?: number
          time_invested_weekly?: number
          start_date?: string | null
          end_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          category?: string | null
          status?: 'planning' | 'active' | 'paused' | 'completed' | 'cancelled'
          current_monthly_earnings?: number
          projected_monthly_earnings?: number
          time_invested_weekly?: number
          start_date?: string | null
          end_date?: string | null
          updated_at?: string
        }
      }
      financial_milestones: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          target_amount: number | null
          current_amount: number
          category: 'security' | 'debt' | 'lifestyle' | 'transportation' | 'growth' | 'investment' | 'other'
          priority: 'low' | 'medium' | 'high'
          status: 'planned' | 'in-progress' | 'completed' | 'cancelled'
          impact_level: 'low' | 'medium' | 'high'
          deadline: string | null
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          target_amount?: number | null
          current_amount?: number
          category: 'security' | 'debt' | 'lifestyle' | 'transportation' | 'growth' | 'investment' | 'other'
          priority?: 'low' | 'medium' | 'high'
          status?: 'planned' | 'in-progress' | 'completed' | 'cancelled'
          impact_level?: 'low' | 'medium' | 'high'
          deadline?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          target_amount?: number | null
          current_amount?: number
          category?: 'security' | 'debt' | 'lifestyle' | 'transportation' | 'growth' | 'investment' | 'other'
          priority?: 'low' | 'medium' | 'high'
          status?: 'planned' | 'in-progress' | 'completed' | 'cancelled'
          impact_level?: 'low' | 'medium' | 'high'
          deadline?: string | null
          completed_at?: string | null
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 