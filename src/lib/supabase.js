import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
	// Provide a clear message in development so the user knows how to configure the app
	// (The actual keys should live in a local `.env` file or in your deployment env.)
	// We still create the client with empty strings to avoid hard crashes during import,
	// but actions will fail until proper keys are provided.
	// eslint-disable-next-line no-console
	console.warn('[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.\nPlease create a `.env` file with the values from your Supabase project or copy `.env.example` and fill in the keys.');
}

export const supabase = createClient(supabaseUrl ?? '', supabaseKey ?? '')
