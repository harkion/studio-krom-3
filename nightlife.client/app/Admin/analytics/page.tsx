"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { isNarrationAdmin } from "@/lib/narration";

type StoryListenStat = {
    storyId: string;
    title: string;
    listens: number;
};

type AnalyticsData = {
    completedLoopCount: number;
    storyListens: StoryListenStat[];
    survey: {
        yes: number;
        somewhat: number;
        no: number;
        total: number;
    };
};

export default function AdminAnalyticsPage() {
    const router = useRouter();
    const [authorized, setAuthorized] = useState<boolean | null>(null);
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;

        const load = async () => {
            try {
                const { data: sessionData } = await supabase.auth.getSession();
                const session = sessionData.session;

                if (!session?.access_token || !session.user) {
                    router.replace("/Admin/login");
                    return;
                }

                // Optional client-side guard; server route enforces isNarrationAdmin strictly
                const adminIds = process.env.NEXT_PUBLIC_NARRATION_ADMIN_USER_IDS || "";
                if (adminIds && !isNarrationAdmin(session.user, adminIds)) {
                    if (active) {
                        setAuthorized(false);
                        setLoading(false);
                    }
                    return;
                }

                if (active) setAuthorized(true);

                const res = await fetch("/api/admin/analytics", {
                    headers: {
                        Authorization: `Bearer ${session.access_token}`,
                    },
                    cache: "no-store",
                });

                const payload = await res.json().catch(() => null);
                if (!res.ok) {
                    if (res.status === 403 && active) {
                        setAuthorized(false);
                        setLoading(false);
                        return;
                    }
                    throw new Error(payload?.error || "Could not load analytics.");
                }

                if (active) {
                    setData(payload);
                }
            } catch (err) {
                if (active) {
                    setError(err instanceof Error ? err.message : "Failed to load analytics.");
                }
            } finally {
                if (active) setLoading(false);
            }
        };

        void load();
        return () => {
            active = false;
        };
    }, [router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#101820] text-[#e6edf3] pt-24 px-8">
                Loading analytics…
            </div>
        );
    }

    if (authorized === false) {
        return (
            <div className="min-h-screen bg-[#101820] text-[#e6edf3] pt-24 px-8 max-w-2xl mx-auto space-y-4">
                <h1 className="text-2xl font-serif text-white">Admin Access Only</h1>
                <p className="text-sm text-slate-300">
                    Your account does not have permission to view loop analytics.
                </p>
                <Link
                    href="/Admin"
                    className="inline-block rounded-lg bg-[#7ee0d1] px-4 py-2 text-sm font-medium text-[#102029]"
                >
                    Back to Admin
                </Link>
            </div>
        );
    }

    const totalListens =
        data?.storyListens.reduce((sum, item) => sum + item.listens, 0) ?? 0;

    return (
        <div className="w-full min-h-screen flex flex-col justify-start pt-24 px-8 pb-12 max-w-5xl mx-auto font-sans text-slate-200">
            <div className="flex items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-serif text-white tracking-tight">
                        Loop &amp; Story Analytics
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">
                        Admin overview of loop completions, story listens, and courage survey responses.
                    </p>
                </div>
                <Link
                    href="/Admin"
                    className="px-4 py-2 rounded-lg border border-slate-700 text-sm text-slate-200 hover:bg-slate-800 transition"
                >
                    ← Back to Admin
                </Link>
            </div>

            {error && (
                <div
                    role="alert"
                    className="mb-6 p-4 bg-red-950/50 border border-red-500/50 rounded-xl text-sm text-red-300"
                >
                    {error}
                </div>
            )}

            {data && (
                <div className="space-y-8">
                    {/* Top Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-[#151c24] border border-slate-700/80 rounded-2xl p-5">
                            <p className="text-xs font-semibold uppercase text-slate-400">
                                Finished the Loop
                            </p>
                            <p className="text-3xl font-bold text-[#7ee0d1] mt-2">
                                {data.completedLoopCount}
                            </p>
                        </div>

                        <div className="bg-[#151c24] border border-slate-700/80 rounded-2xl p-5">
                            <p className="text-xs font-semibold uppercase text-slate-400">
                                Courage Survey: Yes
                            </p>
                            <p className="text-3xl font-bold text-emerald-300 mt-2">
                                {data.survey.yes}
                            </p>
                        </div>

                        <div className="bg-[#151c24] border border-slate-700/80 rounded-2xl p-5">
                            <p className="text-xs font-semibold uppercase text-slate-400">
                                Courage Survey: somewhat
                            </p>
                            <p className="text-3xl font-bold text-amber-300 mt-2">
                                {data.survey.somewhat}
                            </p>
                        </div>

                        <div className="bg-[#151c24] border border-slate-700/80 rounded-2xl p-5">
                            <p className="text-xs font-semibold uppercase text-slate-400">
                                Courage Survey: No
                            </p>
                            <p className="text-3xl font-bold text-rose-300 mt-2">
                                {data.survey.no}
                            </p>
                        </div>
                    </div>

                    {/* Story Listen Breakdown */}
                    <div className="bg-[#151c24] border border-slate-700/80 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-white">
                                Stops to Listen by Story
                            </h2>
                            <span className="text-xs text-slate-400">
                                Total listens: {totalListens}
                            </span>
                        </div>

                        {data.storyListens.length === 0 ? (
                            <p className="text-sm text-slate-400">No stories or listen events found yet.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-700/80 text-xs uppercase text-slate-400">
                                            <th className="py-3 pr-4">Story</th>
                                            <th className="py-3 px-4">ID</th>
                                            <th className="py-3 pl-4 text-right">Listens</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {data.storyListens.map((item) => (
                                            <tr key={item.storyId}>
                                                <td className="py-3 pr-4 font-medium text-white">
                                                    {item.title}
                                                </td>
                                                <td className="py-3 px-4 text-slate-400">
                                                    #{item.storyId}
                                                </td>
                                                <td className="py-3 pl-4 text-right font-semibold text-[#7ee0d1]">
                                                    {item.listens}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}