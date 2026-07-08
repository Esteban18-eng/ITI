type SupabaseClient = {
  url: string
  key: string
}

const createClient = (url: string, key: string): SupabaseClient => ({
  url,
  key,
})

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null
