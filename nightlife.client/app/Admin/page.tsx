import Link from "next/link";
import { deleteStory, approveStory } from "./actions";
import { supabase } from "@/lib/supabase";

export default async function AdminOverviewPage() {
    // 1. Fetch approved stories for the 3D loop
    const { data: approvedStories, error: approvedError } = await supabase
        .from('stories')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

    // 2. Fetch pending stories submitted by users
    const { data: pendingStories, error: pendingError } = await supabase
        .from('stories')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

    if (approvedError || pendingError) {
        console.error("Error fetching stories:", approvedError || pendingError);
        throw new Error("Failed to load stories from Supabase.");
    }

    return (
        <div className="w-full min-h-screen flex flex-col justify-start pt-24 px-8 pb-12 max-w-6xl mx-auto space-y-12">

            {/* Header section */}
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-serif text-white tracking-tight">
                        Admin Story Dashboard
                    </h1>
                    <p className="text-sm text-slate-400 mt-2">
                        Manage live 3D stories and review community submissions.
                    </p>
                </div>

                <Link
                    href="/Admin/new"
                    className="bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white text-sm font-medium px-5 py-2.5 rounded-full transition"
                >
                    + Add Curated Story
                </Link>
            </div>

            {/* SECTION 1: PENDING SUBMISSIONS (Waiting for review) */}
            <div className="space-y-4">
                <div>
                    <h2 className="text-xl font-serif text-amber-400 tracking-tight">
                        Pending Community Submissions ({pendingStories?.length || 0})
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                        Stories submitted via the public form. Approve them to send them live onto the 3D map.
                    </p>
                </div>

                <div className="bg-[#151c24] border border-amber-500/30 rounded-2xl shadow-lg overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-[#0f151b] border-b border-slate-700/80 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Title & Location</th>
                                <th className="px-6 py-4">Story Narrative</th>
                                <th className="px-6 py-4">Author</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50 text-sm">
                            {pendingStories?.map((story) => (
                                <tr key={story.id} className="hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-4 align-top">
                                        <div className="font-medium text-slate-200">{story.title}</div>
                                        <div className="text-xs text-slate-400 mt-0.5">{story.location_name}</div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-300 text-xs max-w-md truncate">
                                        {story.narrative_text}
                                    </td>
                                    <td className="px-6 py-4 text-slate-400 align-top">{story.author_name}</td>
                                    <td className="px-6 py-4 text-right space-x-3 align-top">
                                        <form action={approveStory.bind(null, story.id)} className="inline">
                                            <button type="submit" className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 text-xs font-medium px-3 py-1.5 rounded-lg transition">
                                                Approve ✓
                                            </button>
                                        </form>
                                        <form action={deleteStory.bind(null, story.id)} className="inline">
                                            <button type="submit" className="text-red-400 hover:text-red-300 text-xs font-medium">
                                                Reject/Delete
                                            </button>
                                        </form>
                                    </td>
                                </tr>
                            ))}

                            {pendingStories?.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="text-center py-8 text-slate-500 text-xs">
                                        No pending stories waiting for review.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* SECTION 2: ACTIVE APPROVED STORIES */}
            <div className="space-y-4">
                <div>
                    <h2 className="text-xl font-serif text-white tracking-tight">
                        Active 3D Street Stories ({approvedStories?.length || 0})
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                        Stories currently published and visible on the 3D Eindhoven loop.
                    </p>
                </div>

                <div className="bg-[#151c24] border border-slate-700/80 rounded-2xl shadow-lg overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-[#0f151b] border-b border-slate-700/80 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Title & Location</th>
                                <th className="px-6 py-4">Category</th>
                                <th className="px-6 py-4">3D Coordinates (X, Z)</th>
                                <th className="px-6 py-4">Author</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50 text-sm">
                            {approvedStories?.map((story) => (
                                <tr key={story.id} className="hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-slate-200">{story.title}</div>
                                        <div className="text-xs text-slate-500 mt-0.5">{story.location_name}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-block bg-slate-800 border border-slate-700 text-slate-300 text-xs px-2.5 py-1 rounded-full font-medium">
                                            {story.category}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-xs text-slate-400">
                                        [{story.x}, {story.z}]
                                    </td>
                                    <td className="px-6 py-4 text-slate-400">{story.author_name}</td>
                                    <td className="px-6 py-4 text-right space-x-4">
                                        <Link href={`/Admin/edit/${story.id}`} className="text-blue-400 hover:text-blue-300 text-sm font-medium">
                                            Edit
                                        </Link>
                                        <form action={deleteStory.bind(null, story.id)} className="inline">
                                            <button type="submit" className="text-red-400 hover:text-red-300 text-sm font-medium">
                                                Delete
                                            </button>
                                        </form>
                                    </td>
                                </tr>
                            ))}

                            {approvedStories?.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="text-center py-12 text-slate-400 text-sm">
                                        No active stories found on the 3D street.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
}