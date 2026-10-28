import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { updateStory } from "../../actions";
import { notFound } from "next/navigation";

export default async function EditStoryPage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id, 10);

    // 1. Fetch the existing story from Supabase
    const { data: story, error } = await supabase
        .from('stories')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !story) {
        notFound();
    }

    // 2. Bind the ID to our update action
    const updateAction = updateStory.bind(null, id);

    return (
        <div className="w-full min-h-screen flex flex-col justify-start pt-24 px-8 pb-12 max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-serif text-white tracking-tight">Edit Story</h1>
                <p className="text-sm text-slate-400 mt-2">
                    Update the details or coordinates for this story.
                </p>
            </div>

            {/* 3. The form calls our bound updateAction */}
            <form action={updateAction} className="bg-[#151c24] border border-slate-700/80 rounded-2xl shadow-lg p-8 space-y-6">

                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Story Title</label>
                        <input type="text" name="title" defaultValue={story.title} required className="w-full p-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-slate-500" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Author (Optional)</label>
                        <input type="text" name="author_name" defaultValue={story.author_name} className="w-full p-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-slate-500" />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Location Area</label>
                        <input type="text" name="location_name" defaultValue={story.location_name} required className="w-full p-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-slate-500" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Category</label>
                        <select name="category" defaultValue={story.category} className="w-full p-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-slate-500">
                            <option value="Safe Haven">Safe Haven</option>
                            <option value="Staff Support">Staff Support</option>
                            <option value="Community Kindness">Community Kindness</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Narrative Text</label>
                    <textarea name="narrative_text" rows={5} defaultValue={story.narrative_text} required className="w-full p-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-slate-500"></textarea>
                </div>

                <div className="border-t border-slate-700/80 pt-6">
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-3">3D Spatial Position (X, Z)</label>
                    <div className="grid grid-cols-2 gap-4">
                        <input type="number" step="0.1" name="x" defaultValue={story.x} className="p-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200" />
                        <input type="number" step="0.1" name="z" defaultValue={story.z} className="p-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200" />
                    </div>
                </div>

                <div className="flex justify-end gap-4 pt-4">
                    <Link href="/Admin" className="px-5 py-2.5 text-sm font-medium text-slate-300 hover:text-white transition">
                        Cancel
                    </Link>
                    <button type="submit" className="bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white text-sm font-medium px-6 py-2.5 rounded-full transition">
                        Save Changes
                    </button>
                </div>
            </form>
        </div>
    );
}