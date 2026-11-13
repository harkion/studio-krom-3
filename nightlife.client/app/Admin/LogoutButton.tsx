'use client'; // This tells Next.js this specific button runs on the client

import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function LogoutButton() {
    const router = useRouter();

   const handleLogout = async () => {
        // 1. Tell Supabase to end the session
        await supabase.auth.signOut();
        
        // 2. Destroy the manual middleware cookie by expiring it immediately
        document.cookie = "sb-auth-token=; path=/; max-age=0;";
        
        // 3. Send the user back to the login screen
        router.push('/Admin/login');
        router.refresh();
    };

    return (
        <button 
            onClick={handleLogout}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg transition shadow-sm"
        >
            Sign Out
        </button>
    );
}