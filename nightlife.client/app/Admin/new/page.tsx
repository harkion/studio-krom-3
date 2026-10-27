import db from "@/lib/stories";
import { redirect } from "next/navigation";
import Link from "next/link";
import { writeFile } from "fs/promises";
import path from "path";

export default function AddNewStoryPage() {
    // 1. Next.js Server Action to handle form submission
    async function createStory(formData: FormData) {
        "use server";

        try {
            const title = formData.get("title");
            const location_name = formData.get("location_name");
            const category = formData.get("category");
            const narrative_text = formData.get("narrative_text");
            const author_name = formData.get("author_name") || "Admin";
            const x = parseFloat(formData.get("x") as string) || 0;
            const z = parseFloat(formData.get("z") as string) || 0;

            const file = formData.get("media_file") as File;
            let fileUrl = "";

            if (file && file.size > 0) {
                const buffer = Buffer.from(await file.arrayBuffer());
                const uniqueFilename = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
                const savePath = path.join(process.cwd(), "public/uploads", uniqueFilename);
                await writeFile(savePath, buffer);
                fileUrl = `/uploads/${uniqueFilename}`;
            }

            db.prepare(`
              INSERT INTO stories (
                title, location_name, category, narrative_text, author_name, 
                x, z, audio, color, status
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved')
            `).run(
                title, location_name, category, narrative_text, author_name,
                x, z, fileUrl, 0x6bd5ff
            );

        } catch (error) {
            console.error("Server Action Failed:", error);
            throw new Error("Story submission failed.");
        }

        // Redirect back to the admin overview page
        redirect("/Admin");
    }
    return (
        <div className="w-full min-h-screen flex flex-col justify-start pt-24 px-8 pb-12 max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-serif text-white tracking-tight">Add Curated Story</h1>
                <p className="text-sm text-slate-400 mt-2">
                    Publish a new story directly to the 3D loop. It will be live immediately.
                </p>
            </div>

            {/* 5. The form calls our createStory server action */}
            <form action={createStory} className="bg-[#151c24] border border-slate-700/80 rounded-2xl shadow-lg p-8 space-y-6">

                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Story Title</label>
                        <input type="text" name="title" required className="w-full p-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-slate-500" placeholder="e.g. A safe walk home" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Author (Optional)</label>
                        <input type="text" name="author_name" className="w-full p-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-slate-500" placeholder="Defaults to 'Admin'" />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Location Area</label>
                        <input type="text" name="location_name" required className="w-full p-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-slate-500" placeholder="e.g. Stratumseind" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Category</label>
                        <select name="category" className="w-full p-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-slate-500">
                            <option value="Safe Haven">Safe Haven</option>
                            <option value="Staff Support">Staff Support</option>
                            <option value="Community Kindness">Community Kindness</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Narrative Text</label>
                    <textarea name="narrative_text" rows={5} required className="w-full p-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-slate-500" placeholder="The story details..."></textarea>
                </div>

                <div className="border-t border-slate-700/80 pt-6">
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-3">3D Spatial Position (X, Z)</label>
                    <div className="grid grid-cols-2 gap-4">
                        <input type="number" step="0.1" name="x" defaultValue="0" className="p-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200" />
                        <input type="number" step="0.1" name="z" defaultValue="0" className="p-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200" />
                    </div>
                </div>

                {/* 4. New Media Upload Input */}
                <div className="border-t border-slate-700/80 pt-6">
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-3">
                        Upload Media (Audio, Photo, or Video)
                    </label>
                    <input
                        type="file"
                        name="media_file"
                        accept="audio/*,video/*,image/*"
                        className="w-full text-slate-200 text-sm file:mr-4 file:py-2.5 file:px-5 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-slate-700 file:text-white hover:file:bg-slate-600 transition"
                    />
                </div>

                <div className="flex justify-end gap-4 pt-4">
                    <Link href="/admin" className="px-5 py-2.5 text-sm font-medium text-slate-300 hover:text-white transition">
                        Cancel
                    </Link>
                    <button type="submit" className="bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white text-sm font-medium px-6 py-2.5 rounded-full transition">
                        Publish Story
                    </button>
                </div>
            </form>
        </div>
    );
}
