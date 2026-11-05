'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const router = useRouter();

const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted! The function is running."); 
    setLoading(true);


    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
            console.log("Supabase response:", data, error);

        if (error) {
            // If Supabase rejects it (like that 400 error), capture the message
            setErrorMsg(error.message);
        } else {
            // 1. Manually set a cookie so the Next.js Middleware bouncer can see you are logged in
            document.cookie = `sb-auth-token=${data.session.access_token}; path=/; max-age=86400; SameSite=Lax; secure`;
            
            // 2. Now route to the Admin dashboard!
            router.push('/Admin');
            router.refresh();
        }
    } catch (err) {
        // If the network completely fails, catch it here
        if (err instanceof Error) {
            setErrorMsg(err.message);
        } else {
            setErrorMsg("An unexpected error occurred.");
        }
    } finally { 
        // ALWAYS turn off the loading state, whether it succeeded or failed!
        setLoading(false);
    }
};

    return (
        <div className="min-h-screen bg-[#101820] text-[#e6edf3] flex items-center justify-center px-4 font-sans">
            <div className="max-w-md w-full bg-[#17212b] border border-[#35434f] rounded-3xl p-8 shadow-xl space-y-6">
                <div>
                    <p className="text-[10px] tracking-widest text-[#aab8c4] uppercase mb-2">
                        RESTRICTED AREA
                    </p>
                    <h1 className="font-serif text-3xl text-[#e6edf3]">
                        Admin Login
                    </h1>
                    <p className="text-xs text-[#c1cdd7] mt-1">
                        Sign in to review pending community stories and manage the 3D map.
                    </p>
                </div>

                {errorMsg && (
                    <div className="p-3 bg-red-950/50 border border-red-500/50 rounded-xl text-xs text-red-300">
                        {errorMsg}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-[#e6edf3] mb-2">
                            Admin Email
                        </label>
                        <input
                            type="email"
                            
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="admin@eindhoven.nl"
                            className="w-full bg-[#101820] border border-[#35434f] rounded-xl p-3 text-xs text-[#e6edf3] focus:outline-none focus:border-[#7ee0d1] transition"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-[#e6edf3] mb-2">
                            Password
                        </label>
                        <input
                            type="password"
                           
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full bg-[#101820] border border-[#35434f] rounded-xl p-3 text-xs text-[#e6edf3] focus:outline-none focus:border-[#7ee0d1] transition"
                        />
                    </div>

                    <button
                        type="submit"
                        onClick={handleLogin}
                        disabled={loading}
                        className="w-full bg-[#7ee0d1] hover:bg-[#66d4c5] disabled:bg-[#35434f] text-[#102029] font-medium text-xs py-3 rounded-xl transition shadow-sm mt-2"
                    >
                        {loading ? 'Authenticating...' : 'Sign In to Dashboard'}
                    </button>
                </form>
            </div>
        </div>
    );
}