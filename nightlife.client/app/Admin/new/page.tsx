import db from "@/lib/stories";
import { redirect } from "next/navigation";
import Link from "next/link";
import { writeFile } from "fs/promises";
import path from "path";

export default function AddNewStoryPage() {
    // 1. Next.js Server Action to handle form submission
    async function createStory(formData: FormData) {
        "use server"; // tells Next.js to run this function only on the backend

        // 2. Extract values from the form data
        const title = formData.get("title");
        const location_name = formData.get("location_name");
        const category = formData.get("category");
        const narrative_text = formData.get("narrative_text");
        const author_name = formData.get("author_name") || "Admin"; // Default to Admin
        const pos_x = parseFloat(formData.get("pos_x") as string) || 0;
        const pos_y = parseFloat(formData.get("pos_y") as string) || 0;
        const pos_z = parseFloat(formData.get("pos_z") as string) || 0;

        // 2. Handle the file upload
        const file = formData.get("media_file") as File;
        let fileUrl = "";

        if (file && file.size > 0) {
            // Convert the file into a readable format for Node.js
            const buffer = Buffer.from(await file.arrayBuffer());

            // Create a unique file name so uploads don't overwrite each other
            const uniqueFilename = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;

            // Save it into the "public/uploads" folder
            const savePath = path.join(process.cwd(), "public/uploads", uniqueFilename);
            await writeFile(savePath, buffer);

            // This is the URL we save to the database so the frontend can load it
            fileUrl = `/uploads/${uniqueFilename}`;
        }
        // 3. Insert directly into SQLite as 'approved'
        db.prepare(`
      INSERT INTO stories (
        title, location_name, category, narrative_text, author_name, 
        pos_x, pos_y, pos_z,audio_voice_url, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'approved')
     
    `).run(// run the insert statement with the extracted values
            title, location_name, category, narrative_text, author_name,
            pos_x, pos_y, pos_z, fileUrl
        );


        // 4. Redirect back to the admin overview page
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
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-3">3D Spatial Position (X, Y, Z)</label>
                    <div className="grid grid-cols-3 gap-4">
                        <input type="number" step="0.1" name="pos_x" defaultValue="0" className="p-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200" />
                        <input type="number" step="0.1" name="pos_y" defaultValue="0" className="p-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200" />
                        <input type="number" step="0.1" name="pos_z" defaultValue="0" className="p-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200" />
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