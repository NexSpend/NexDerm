import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'https://ufvvkgpdemnspfrnqmlt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmdnZrZ3BkZW1uc3Bmcm5xbWx0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2ODIxNTAsImV4cCI6MjA3NzI1ODE1MH0.wonc_jCMoLcJ8kNzMLL8qDxRtPemThy0GEHqcP7t_WE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});