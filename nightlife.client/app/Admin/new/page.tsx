'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from "next/link";
<<<<<<< HEAD
import { NarrationPanel, useNarration } from '../NarrationControls';
=======
>>>>>>> fix-file-size-limit

export default function AddNewStoryPage({
    searchParams
}: {
    searchParams: Promise<{ x?: string; z?: string }>
}) {
<<<<<<< HEAD
    // In Next.js 15 Client Components, we use React.use() to unwrap the promise
    const resolvedParams = use(searchParams);
    const router = useRouter();

    // Initialize the narration hook with an empty string since the story doesn't exist in the DB yet
    const narration = useNarration('');

=======
    const resolvedParams = use(searchParams);
    const router = useRouter();

>>>>>>> fix-file-size-limit
    // Form State
    const [title, setTitle] = useState('');
    const [authorName, setAuthorName] = useState('');
    const [locationName, setLocationName] = useState('');
    const [category, setCategory] = useState('Community Kindness');
    const [storyText, setStoryText] = useState('');

    const [xCoord, setXCoord] = useState(resolvedParams.x || "0");
    const [zCoord, setZCoord] = useState(resolvedParams.z || "0");
    const [orbColor, setOrbColor] = useState('#7ee0d1');

    const [aiConsent, setAiConsent] = useState(true);
<<<<<<< HEAD
=======
    const [selectedVoice, setSelectedVoice] = useState('EXAVITQu4vr4xnSDxMaL');
>>>>>>> fix-file-size-limit
    const [mediaFile, setMediaFile] = useState<File | null>(null);

    const [publishing, setPublishing] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const handlePublish = async (e: React.FormEvent) => {
        e.preventDefault();
        setPublishing(true);
        setErrorMsg('');
        let mediaUrl = null;

        try {
            if (mediaFile) {
                const fileExt = mediaFile.name.split('.').pop();
                const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
                const filePath = `media/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('stories-media')
                    .upload(filePath, mediaFile);

                if (uploadError) throw new Error("Media upload failed.");

                const { data: publicUrlData } = supabase.storage
                    .from('stories-media')
                    .getPublicUrl(filePath);

                mediaUrl = publicUrlData.publicUrl;
            }

            // Convert Hex string to int8 for database
            let colorInt = 7067135;
            if (orbColor) {
                const cleanHex = orbColor.replace('#', '');
                colorInt = parseInt(cleanHex, 16);
            }

<<<<<<< HEAD
            // Insert into the database
            const { data: newStory, error: insertError } = await supabase.from('stories').insert({
=======
            // Insert into the database with status 'pending' so it goes to the review queue
            const { error: insertError } = await supabase.from('stories').insert({
>>>>>>> fix-file-size-limit
                title,
                location_name: locationName,
                category,
                narrative_text: storyText,
                author_name: authorName || "Admin",
                x: parseFloat(xCoord) || 0,
                z: parseFloat(zCoord) || 0,
                audio: mediaUrl,
                color: colorInt,
<<<<<<< HEAD
                status: 'approved', // Goes live immediately
                ai_narration_consent: aiConsent
            }).select('id').single();

            if (insertError) throw new Error(insertError.message);

            // If generating narration, attempt to generate it for the newly created story
            if (!mediaFile && aiConsent && newStory?.id) {
                try {

                    await narration.generate();
                } catch (err) {
                    console.warn("Narration generation will continue in background or can be retried from the review page.");
                }
            }

=======
                status: 'pending', // Sent to review queue instead of going live instantly
                ai_narration_consent: aiConsent,
                voice_id: selectedVoice,
            });

            if (insertError) throw new Error(insertError.message);

>>>>>>> fix-file-size-limit
            router.push('/Admin');
            router.refresh();

        } catch (error) {
            if (error instanceof Error) setErrorMsg(error.message);
        } finally {
            setPublishing(false);
        }
    };

    return (
<<<<<<< HEAD
        <div className="w-full min-h-screen flex flex-col justify-start pt-24 px-8 pb-12 max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-serif text-white tracking-tight">Add Curated Story</h1>
                <p className="text-sm text-slate-400 mt-2">
                    Publish a new story directly to the 3D loop. It will be live immediately.
=======
        <div className="w-full min-h-screen flex flex-col justify-start pt-24 px-8 pb-12 max-w-4xl mx-auto font-sans text-slate-200">
            <div className="mb-8">
                <h1 className="text-3xl font-serif text-white tracking-tight">Add Curated Story</h1>
                <p className="text-sm text-slate-400 mt-2">
                    Submit a new curated story to the review queue where narration can be generated.
>>>>>>> fix-file-size-limit
                </p>
            </div>

            <form onSubmit={handlePublish} className="bg-[#151c24] border border-slate-700/80 rounded-2xl shadow-lg p-8 space-y-6">

                {errorMsg && (
                    <div className="p-3 bg-red-950/50 border border-red-500/50 rounded-xl text-xs text-red-300">
                        {errorMsg}
                    </div>
                )}

                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Story Title</label>
                        <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-slate-500" placeholder="e.g. A safe walk home" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Author (Optional)</label>
                        <input type="text" value={authorName} onChange={(e) => setAuthorName(e.target.value)} className="w-full p-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-slate-500" placeholder="Defaults to 'Admin'" />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Location Area</label>
                        <input type="text" required value={locationName} onChange={(e) => setLocationName(e.target.value)} className="w-full p-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-slate-500" placeholder="e.g. Stratumseind" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Category</label>
                        <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-slate-500">
                            <option value="Safe Haven">Safe Haven</option>
                            <option value="Staff Support">Staff Support</option>
                            <option value="Community Kindness">Community Kindness</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Narrative Text</label>
                    <textarea rows={5} required value={storyText} onChange={(e) => setStoryText(e.target.value)} className="w-full p-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-slate-500" placeholder="The story details..."></textarea>
                </div>

                <div className="border-t border-slate-700/80 pt-6">
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-3">3D Spatial Position (X, Z)</label>
                    <div className="grid grid-cols-2 gap-4">
                        <input
                            type="number"
                            step="0.1"
                            value={xCoord}
                            onChange={(e) => setXCoord(e.target.value)}
                            className="p-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200"
                        />
                        <input
                            type="number"
                            step="0.1"
                            value={zCoord}
                            onChange={(e) => setZCoord(e.target.value)}
                            className="p-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Story Color (Hex)</label>
                    <input
                        type="text"
                        value={orbColor}
                        onChange={(e) => setOrbColor(e.target.value)}
                        placeholder="#7ee0d1"
                        className="w-full p-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-slate-500"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">Enter a hex code like #7ee0d1</p>
                </div>

<<<<<<< HEAD
                {/* Admin AI Narration Toggle */}
                <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Audio Generation</label>
                    <div className="flex items-start gap-3 p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
=======
                {/* Admin AI Narration & Voice Choice */}
                <div className="space-y-4 p-4 bg-slate-900/50 border border-slate-700 rounded-xl">
                    <label className="block text-xs font-semibold text-[#7ee0d1] uppercase tracking-wider">AI Audio Settings</label>

                    <div className="flex items-start gap-3">
>>>>>>> fix-file-size-limit
                        <input
                            type="checkbox"
                            checked={aiConsent}
                            onChange={(e) => setAiConsent(e.target.checked)}
                            className="mt-1 w-4 h-4 accent-[#7ee0d1] cursor-pointer"
                        />
                        <label className="text-xs text-slate-300 cursor-pointer" onClick={() => setAiConsent(!aiConsent)}>
                            <span className="block font-bold text-white mb-1">Enable AI Audio Narration</span>
<<<<<<< HEAD
                            Allow ElevenLabs to automatically generate an AI voiceover for this curated story.
                        </label>
                    </div>
                </div>

                {/* Choose the narrator here; Accept & Publish starts generation. */}
                <NarrationPanel narration={narration} onApproval disabled={publishing} />

                <div className="border-t border-slate-700/80 pt-6">
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-3">
                        Upload Media (Audio, Photo, or Video)
=======
                            Allow ElevenLabs to automatically generate an AI voiceover for this curated story during review.
                        </label>
                    </div>

                    {aiConsent && (
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Preferred Narrator</label>
                            <select
                                value={selectedVoice}
                                onChange={(e) => setSelectedVoice(e.target.value)}
                                className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-[#7ee0d1]"
                            >
                                <option value="EXAVITQu4vr4xnSDxMaL">Jessica</option>
                                <option value="21m00Tcm4TlvDq8ikWAM">Roger</option>
                            </select>
                        </div>
                    )}
                </div>

                <div className="border-t border-slate-700/80 pt-6">
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-3">
                        Upload Custom Media (Optional - overrides AI audio)
>>>>>>> fix-file-size-limit
                    </label>
                    <input
                        type="file"
                        accept="audio/*,video/*,image/*"
                        onChange={(e) => setMediaFile(e.target.files?.[0] || null)}
                        className="w-full text-slate-200 text-sm file:mr-4 file:py-2.5 file:px-5 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-slate-700 file:text-white hover:file:bg-slate-600 transition"
                    />
                </div>

                <div className="flex justify-end gap-4 pt-4">
                    <Link href="/Admin" className="px-5 py-2.5 text-sm font-medium text-slate-300 hover:text-white transition">
                        Cancel
                    </Link>
<<<<<<< HEAD
                    <button type="submit" disabled={publishing} className="bg-[#7ee0d1] hover:bg-[#66d4c5] disabled:bg-[#35434f] border border-transparent disabled:border-slate-600 text-[#102029] disabled:text-slate-400 text-sm font-medium px-6 py-2.5 rounded-full transition">
                        {narration.busy ? 'Generating narration...' : publishing ? 'Publishing...' : 'Publish Story'}
=======
                    <button type="submit" disabled={publishing} className="bg-[#7ee0d1] hover:bg-[#66d4c5] disabled:bg-[#35434f] text-[#102029] disabled:text-slate-400 text-sm font-medium px-6 py-2.5 rounded-full transition shadow-md">
                        {publishing ? 'Submitting to Review...' : 'Save & Send to Review'}
>>>>>>> fix-file-size-limit
                    </button>
                </div>
            </form>
        </div>
    );
}