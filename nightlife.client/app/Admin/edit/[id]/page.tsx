<<<<<<< HEAD
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { updateStory } from "../../actions";
import { notFound } from "next/navigation";

export default async function EditStoryPage({
=======
'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from "next/link";
import { NarrationPanel, useNarration } from '../../NarrationControls';

export default function EditStoryPage({
>>>>>>> fix-file-size-limit
    params
}: {
    params: Promise<{ id: string }>
}) {
<<<<<<< HEAD
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
=======
    const resolvedParams = use(params);
    const storyId = resolvedParams.id;
    const router = useRouter();

    // Hook for managing ElevenLabs narration settings and preview audio
    const narration = useNarration(storyId);

    // Form States
    const [title, setTitle] = useState('');
    const [authorName, setAuthorName] = useState('');
    const [locationName, setLocationName] = useState('');
    const [category, setCategory] = useState('Community Kindness');
    const [storyText, setStoryText] = useState('');
    const [xCoord, setXCoord] = useState('');
    const [zCoord, setZCoord] = useState('');
    const [orbColor, setOrbColor] = useState('#7ee0d1');
    const [aiConsent, setAiConsent] = useState(true);
    const [mediaFile, setMediaFile] = useState<File | null>(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        const fetchStory = async () => {
            const { data, error } = await supabase
                .from('stories')
                .select('*')
                .eq('id', storyId)
                .single();

            if (error || !data) {
                setErrorMsg("Could not load story data.");
            } else {
                setTitle(data.title || '');
                setAuthorName(data.author_name || '');
                setLocationName(data.location_name || '');
                setCategory(data.category || 'Community Kindness');
                setStoryText(data.narrative_text || '');
                setAiConsent(data.ai_narration_consent ?? true);

                if (data.color) {
                    const hexString = `#${Number(data.color).toString(16).padStart(6, '0')}`;
                    setOrbColor(hexString);
                }

                if (data.x !== null && data.x !== undefined) setXCoord(data.x.toString());
                if (data.z !== null && data.z !== undefined) setZCoord(data.z.toString());
            }
            setLoading(false);
        };

        if (storyId) fetchStory();
    }, [storyId]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
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

                if (uploadError) throw new Error("Media upload failed: " + uploadError.message);

                const { data: publicUrlData } = supabase.storage
                    .from('stories-media')
                    .getPublicUrl(filePath);

                mediaUrl = publicUrlData.publicUrl;
            }

            // Convert hex string to integer for DB
            let colorInt = 7067135;
            if (orbColor) {
                const cleanHex = orbColor.replace('#', '');
                colorInt = parseInt(cleanHex, 16);
            }

            // Update the story details in Supabase, including the current voice selection from the hook
            const { error: updateError } = await supabase
                .from('stories')
                .update({
                    title,
                    author_name: authorName,
                    location_name: locationName,
                    category,
                    narrative_text: storyText,
                    x: parseFloat(xCoord) || 0,
                    z: parseFloat(zCoord) || 0,
                    color: colorInt,
                    ai_narration_consent: aiConsent,
                    voice_id: narration.voiceId,
                    audio: mediaUrl ? mediaUrl : undefined
                })
                .eq('id', storyId);

            if (updateError) throw new Error("Failed to update story: " + updateError.message);

            router.push('/Admin');
            router.refresh();

        } catch (err) {
            if (err instanceof Error) setErrorMsg(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="min-h-screen bg-[#101820] text-[#e6edf3] p-8">Loading story data...</div>;

    return (
        <div className="w-full min-h-screen flex flex-col justify-start pt-24 px-8 pb-12 max-w-4xl mx-auto font-sans text-slate-200">
            <div className="mb-8">
                <h1 className="text-3xl font-serif text-white tracking-tight">Edit Story #{storyId}</h1>
                <p className="text-sm text-slate-400 mt-2">
                    Update the details, coordinates, or change the AI narration voice for this story.
                </p>
            </div>

            <form onSubmit={handleSave} className="bg-[#151c24] border border-slate-700/80 rounded-2xl shadow-lg p-8 space-y-6">

                {errorMsg && (
                    <div className="p-3 bg-red-950/50 border border-red-500/50 rounded-xl text-xs text-red-300">
                        {errorMsg}
                    </div>
                )}
>>>>>>> fix-file-size-limit

                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Story Title</label>
<<<<<<< HEAD
                        <input type="text" name="title" defaultValue={story.title} required className="w-full p-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-slate-500" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Author (Optional)</label>
                        <input type="text" name="author_name" defaultValue={story.author_name} className="w-full p-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-slate-500" />
=======
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                            className="w-full p-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-slate-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Author (Optional)</label>
                        <input
                            type="text"
                            value={authorName}
                            onChange={(e) => setAuthorName(e.target.value)}
                            className="w-full p-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-slate-500"
                        />
>>>>>>> fix-file-size-limit
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Location Area</label>
<<<<<<< HEAD
                        <input type="text" name="location_name" defaultValue={story.location_name} required className="w-full p-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-slate-500" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Category</label>
                        <select name="category" defaultValue={story.category} className="w-full p-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-slate-500">
=======
                        <input
                            type="text"
                            value={locationName}
                            onChange={(e) => setLocationName(e.target.value)}
                            required
                            className="w-full p-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-slate-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Category</label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full p-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-slate-500"
                        >
>>>>>>> fix-file-size-limit
                            <option value="Safe Haven">Safe Haven</option>
                            <option value="Staff Support">Staff Support</option>
                            <option value="Community Kindness">Community Kindness</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Narrative Text</label>
<<<<<<< HEAD
                    <textarea name="narrative_text" rows={5} defaultValue={story.narrative_text} required className="w-full p-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-slate-500"></textarea>
=======
                    <textarea
                        rows={5}
                        value={storyText}
                        onChange={(e) => setStoryText(e.target.value)}
                        required
                        className="w-full p-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-slate-500"
                    ></textarea>
>>>>>>> fix-file-size-limit
                </div>

                <div className="border-t border-slate-700/80 pt-6">
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-3">3D Spatial Position (X, Z)</label>
                    <div className="grid grid-cols-2 gap-4">
<<<<<<< HEAD
                        <input type="number" step="0.1" name="x" defaultValue={story.x} className="p-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200" />
                        <input type="number" step="0.1" name="z" defaultValue={story.z} className="p-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200" />
                    </div>
                </div>
                                       <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Story Color (Hex)</label>
                        <input 
                            type="text" 
                            name="color" 
                            defaultValue={story.color ? `#${Number(story.color).toString(16)}` : '#7ee0d1'} 
                            placeholder="#7ee0d1"
                            className="w-full p-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-slate-500" 
                        />
                        <p className="text-[10px] text-slate-500 mt-1">Enter a hex code like #7ee0d1</p>
                    </div>

=======
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

                {/* AI Narration Consent & Voice Controls */}
                <div className="space-y-4 p-4 bg-slate-900/50 border border-slate-700 rounded-xl">
                    <div className="flex items-start gap-3">
                        <input
                            type="checkbox"
                            checked={aiConsent}
                            onChange={(e) => setAiConsent(e.target.checked)}
                            className="mt-1 w-4 h-4 accent-[#7ee0d1] cursor-pointer"
                        />
                        <label className="text-xs text-slate-300 cursor-pointer" onClick={() => setAiConsent(!aiConsent)}>
                            <span className="block font-bold text-white mb-1">Enable AI Audio Narration</span>
                            Allow ElevenLabs to automatically generate or update an AI voiceover using the selected narrator.
                        </label>
                    </div>

                    {/* 
                      Use the NarrationPanel here! 
                      Admins can pick a new voice from the dropdown and click "Generate narration" 
                      (or "Retry narration") directly in this panel to render the new voice.
                    */}
                    <NarrationPanel narration={narration} disabled={saving} />
                </div>

                <div className="border-t border-slate-700/80 pt-6">
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-3">
                        Attach Custom Media (Optional - overrides AI audio)
                    </label>
                    <input
                        type="file"
                        accept="audio/*,video/*,image/*"
                        onChange={(e) => setMediaFile(e.target.files?.[0] || null)}
                        className="w-full text-slate-200 text-sm file:mr-4 file:py-2.5 file:px-5 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-slate-700 file:text-white hover:file:bg-slate-600 transition"
                    />
                </div>

>>>>>>> fix-file-size-limit
                <div className="flex justify-end gap-4 pt-4">
                    <Link href="/Admin" className="px-5 py-2.5 text-sm font-medium text-slate-300 hover:text-white transition">
                        Cancel
                    </Link>
<<<<<<< HEAD
                    <button type="submit" className="bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white text-sm font-medium px-6 py-2.5 rounded-full transition">
                        Save Changes
=======
                    <button
                        type="submit"
                        disabled={saving}
                        className="bg-[#7ee0d1] hover:bg-[#66d4c5] disabled:bg-[#35434f] text-[#102029] disabled:text-slate-400 text-sm font-medium px-6 py-2.5 rounded-full transition shadow-md"
                    >
                        {saving ? 'Saving Changes...' : 'Save Changes'}
>>>>>>> fix-file-size-limit
                    </button>
                </div>
            </form>
        </div>
    );
}