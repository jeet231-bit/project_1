import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

console.log('DEBUG: Supabase Config:', {
    url: supabaseUrl,
    hasKey: !!supabaseAnonKey,
    allEnv: import.meta.env
});

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'spndwisee-auth',
    },
});

// ── Explicit sign-out gate ──────────────────────────────────────
// Only user-initiated sign-outs should navigate away from the app.
// Supabase can fire SIGNED_OUT internally (token refresh failure,
// background tab throttling, etc.) — we must ignore those.
let _explicitSignOut = false;
export const signOutExplicitly = async () => {
    _explicitSignOut = true;
    await supabase.auth.signOut();
};
export const wasExplicitSignOut = () => {
    const val = _explicitSignOut;
    _explicitSignOut = false;
    return val;
};

export const api = {
    fetch: async (endpoint: string, options: RequestInit = {}) => {
        // Get current session. Supabase v2 handles background refreshes automatically.
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        };

        const finalUrl = `http://localhost:8000${endpoint}`;
        console.log(`DEBUG: API Fetching from ${finalUrl}`, { hasToken: !!token });

        try {
            const response = await fetch(finalUrl, {
                ...options,
                headers,
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`DEBUG: API Error Response for ${finalUrl}:`, errorText);
                try {
                    const errorJson = JSON.parse(errorText);
                    throw new Error(errorJson.detail || response.statusText);
                } catch {
                    throw new Error(response.statusText + ": " + errorText);
                }
            }

            return response.json();
        } catch (err: any) {
            console.error(`DEBUG: Fetch Error for ${finalUrl}:`, err);
            throw err;
        }
    },

    get: (endpoint: string) => api.fetch(endpoint, { method: 'GET' }),

    post: (endpoint: string, body: any) => api.fetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
    }),

    put: (endpoint: string, body: any) => api.fetch(endpoint, {
        method: 'PUT',
        body: JSON.stringify(body),
    }),

    delete: (endpoint: string) => api.fetch(endpoint, { method: 'DELETE' }),
};
