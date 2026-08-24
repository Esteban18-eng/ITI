import { createClient } from '@supabase/supabase-js'

export type Database = {
  public: {
    Tables: {
      students: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      follow_ups: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      reasonable_adjustments: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
    }
  }
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null
