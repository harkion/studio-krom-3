import db from "@/lib/stories";
import Link from "next/link";

export default function AdminOverviewPage() {
    // 1. Fetch all active/approved stories from SQLite
    const stories = db
        .prepare("SELECT * FROM stories WHERE status = 'approved' ORDER BY created_at DESC")
        .all() as Array<{
            id: number;
            title: string;
            location_name: string;
            category: string;
            narrative_text: string;
            author_name: string;
            pos_x: number;
            pos_y: number;
            pos_z: number;
            created_at: string;
        }>;

    return (
        <div className="w-full min-h-screen flex flex-col justify-start pt-24 px-8 pb-12 max-w-6xl mx-auto">
            {/* Header section */}
            <div className="flex justify-between items-end mb-8">
                <div>
                    {/* Using font-serif to match the "Tell your story." typography */}
                    <h1 className="text-3xl font-serif text-white tracking-tight">
                        3D Street Active Stories
                    </h1>
                    <p className="text-sm text-slate-400 mt-2">
                        Stories currently published and visible on the 3D Eindhoven loop.
                    </p>
                </div>

                {/* Updated button styling to match the dark theme, moving away from the bright purple */}
                <Link
                    href="/Admin/new"
                    className="bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white text-sm font-medium px-5 py-2.5 rounded-full transition"
                >
                    + Add New Story
                </Link>
            </div>

            {/* Stories Table Container - Updated to dark card styling */}
            <div className="bg-[#151c24] border border-slate-700/80 rounded-2xl shadow-lg overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-[#0f151b] border-b border-slate-700/80 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        <tr>
                            <th className="px-6 py-4">Title & Location</th>
                            <th className="px-6 py-4">Category</th>
                            <th className="px-6 py-4">3D Coordinates (X, Y, Z)</th>
                            <th className="px-6 py-4">Author</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50 text-sm">
                        {stories.map((story) => (
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
                                    [{story.pos_x}, {story.pos_y}, {story.pos_z}]
                                </td>
                                <td className="px-6 py-4 text-slate-400">{story.author_name}</td>
                            </tr>
                        ))}

                        {/* Empty state styling updated for dark mode */}
                        {stories.length === 0 && (
                            <tr>
                                <td colSpan={4} className="text-center py-12 text-slate-400 text-sm">
                                    No active stories found on the 3D street. Click <strong className="text-slate-200">&quot;+ Add New Story&quot;</strong> to create your first story!
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}