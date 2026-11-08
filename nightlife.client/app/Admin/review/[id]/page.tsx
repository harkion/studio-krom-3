'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { NarrationPanel, useNarration } from '../../NarrationControls';

export default function ReviewStoryPage() {
    const params = useParams();
    const router = useRouter();
    const storyId = Array.isArray(params.id) ? params.id[0] : params.id || '';
    // Load the shared narrator selection, saved audio and AI permission for this story.
    const narration = useNarration(storyId);

    const [title, setTitle] = useState('');
    const [storyText, setStoryText] = useState('');
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    
    const [loading, setLoading] = useState(true);
    const [publishing, setPublishing] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const [xCoord, setXCoord] = useState('');
    const [zCoord, setZCoord] = useState('');
    const [orbColor, setOrbColor] = useState('#7ee0d1');

    const [locationName, setLocationName] = useState('');
    const [authorName, setAuthorName] = useState('');
    const [category, setCategory] = useState('');
    const [age, setAge] = useState('');
    const [gender, setGender] = useState('');

    useEffect(() => {
        const fetchPendingStory = async () => {
            const { data, error } = await supabase
                .from('stories') 
                .select('*')
                .eq('id', storyId)
                .single();

            if (error) {
                setErrorMsg("Could not load story data.");
            } else if (data) {
                setTitle(data.title || '');
                setStoryText(data.narrative_text || '');
                setLocationName(data.location_name || '');
                setAuthorName(data.author_name || '');
                setCategory(data.category || '');
                setAge(data.age?.toString() || '');
                setGender(data.gender || '');
                
                // Safely convert database integer color back to a Hex string for the input
                if (data.color) {
                    const hexString = `#${Number(data.color).toString(16).padStart(6, '0')}`;
                    setOrbColor(hexString);
                }

                if (data.x !== null && data.x !== undefined) setXCoord(data.x.toString());
                if (data.z !== null && data.z !== undefined) setZCoord(data.z.toString());
            }
            setLoading(false);
        };

        if (storyId) fetchPendingStory();
    }, [storyId]);

    const handlePublish = async () => {
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

                if (uploadError) throw new Error("Media upload failed: " + uploadError.message);

                const { data: publicUrlData } = supabase.storage
                    .from('stories-media')
                    .getPublicUrl(filePath);
                
                mediaUrl = publicUrlData.publicUrl;
            }

            // Convert the Hex string (e.g. "#7ee0d1") to an integer for the int8 database column
            let colorInt = 7067135;
            if (orbColor) {
                const cleanHex = orbColor.replace('#', '');
                colorInt = parseInt(cleanHex, 16);
            }
// 2. Safely parse age (send null if the box is empty)
            const parsedAge = age ? parseInt(age, 10) : null;

            // UPDATE the existing row
            const { error: updateError } = await supabase
                .from('stories') 
                .update({
                    title: title,
                    narrative_text: storyText, 
                    audio: mediaUrl ? mediaUrl : undefined, // keeps old audio if no new file chosen
                    x: parseFloat(xCoord) || 0,
                    z: parseFloat(zCoord) || 0,
                    color: colorInt,           
                    status: 'approved',
                    location_name: locationName,
                    author_name: authorName,
                    category: category,
                    age: parsedAge,
                    gender: gender
                })
                .eq('id', storyId);

            if (updateError) throw new Error("Failed to publish to map: " + updateError.message);

            // Only request AI narration after publishing succeeds. Keep uploaded/existing audio,
            // and generate only when the separate AI permission is explicitly recorded.
            if (!mediaFile && !narration.info?.audio && narration.info?.consent) {
                try {
                    await narration.generate();
                } catch {
                    setErrorMsg('The written story was published, but its narration is not ready. See the narration message below. You can return to the dashboard and retry from Narration.');
                    return;
                }
            }

            router.push('/Admin');
            router.refresh();

        } catch (err) {
            if (err instanceof Error) setErrorMsg(err.message);
        } finally {
            setPublishing(false);
        }
    };

    const [declining, setDeclining] = useState(false);

    const handleDecline = async () => {
        const confirmDecline = window.confirm("Are you sure you want to decline and permanently delete this story?");
        if (!confirmDecline) return;

        setDeclining(true);
        setErrorMsg('');

        try {
            const { error: deleteError } = await supabase
                .from('stories')
                .delete()
                .eq('id', storyId);

            if (deleteError) throw new Error("Failed to decline story: " + deleteError.message);

            router.push('/Admin');
            router.refresh();
        } catch (err) {
            if (err instanceof Error) setErrorMsg(err.message);
        } finally {
            setDeclining(false);
        }
    };

    if (loading) return <div className="min-h-screen bg-[#101820] text-[#e6edf3] p-8">Loading story data...</div>;

    return (
        <div className="min-h-screen bg-[#101820] text-[#e6edf3] p-8 font-sans">
            <div className="max-w-3xl mx-auto bg-[#17212b] border border-[#35434f] rounded-3xl p-8 shadow-xl">
                <h1 className="font-serif text-3xl mb-6">Review & Publish Story #{storyId}</h1>
                
                {errorMsg && (
                    <div className="mb-6 p-3 bg-red-950/50 border border-red-500/50 rounded-xl text-xs text-red-300">
                        {errorMsg}
                    </div>
                )}

                {/* User Demographics & Location Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-[#101820] border border-[#35434f] rounded-xl mb-6">
                    <div>
                        <label className="block text-[10px] uppercase tracking-wider text-[#aab8c4] font-bold mb-1">Author Name</label>
                        <input
                            type="text"
                            value={authorName}
                            onChange={(e) => setAuthorName(e.target.value)}
                            className="w-full bg-transparent border-b border-[#35434f] p-1 text-sm focus:outline-none focus:border-[#7ee0d1]"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] uppercase tracking-wider text-[#aab8c4] font-bold mb-1">Age</label>
                        <input
                            type="text"
                            value={age}
                            onChange={(e) => setAge(e.target.value)}
                            className="w-full bg-transparent border-b border-[#35434f] p-1 text-sm focus:outline-none focus:border-[#7ee0d1]"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] uppercase tracking-wider text-[#aab8c4] font-bold mb-1">Gender</label>
                        <input
                            type="text"
                            value={gender}
                            onChange={(e) => setGender(e.target.value)}
                            className="w-full bg-transparent border-b border-[#35434f] p-1 text-sm focus:outline-none focus:border-[#7ee0d1]"
                        />
                    </div>
                    <div className="col-span-2 md:col-span-2">
                        <label className="block text-[10px] uppercase tracking-wider text-[#aab8c4] font-bold mb-1">Location Name</label>
                        <input
                            type="text"
                            value={locationName}
                            onChange={(e) => setLocationName(e.target.value)}
                            className="w-full bg-transparent border-b border-[#35434f] p-1 text-sm focus:outline-none focus:border-[#7ee0d1]"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] uppercase tracking-wider text-[#aab8c4] font-bold mb-1">Category</label>
                        <input
                            type="text"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full bg-transparent border-b border-[#35434f] p-1 text-sm focus:outline-none focus:border-[#7ee0d1]"
                        />
                    </div>
                </div>

                <form className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold mb-2">Story Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-[#101820] border border-[#35434f] rounded-xl p-3 text-sm focus:outline-none focus:border-[#7ee0d1]"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold mb-2">Story Content</label>
                        <textarea
                            rows={6}
                            value={storyText}
                            onChange={(e) => setStoryText(e.target.value)}
                            className="w-full bg-[#101820] border border-[#35434f] rounded-xl p-3 text-sm focus:outline-none focus:border-[#7ee0d1]"
                        />
                    </div>

                    {/* Coordinates X and Z */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold mb-2">X Coordinate</label>
                            <input
                                type="number"
                                step="any"
                                value={xCoord}
                                onChange={(e) => setXCoord(e.target.value)}
                                className="w-full bg-[#101820] border border-[#35434f] rounded-xl p-3 text-sm focus:outline-none focus:border-[#7ee0d1]"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-2">Z Coordinate</label>
                            <input
                                type="number"
                                step="any"
                                value={zCoord}
                                onChange={(e) => setZCoord(e.target.value)}
                                className="w-full bg-[#101820] border border-[#35434f] rounded-xl p-3 text-sm focus:outline-none focus:border-[#7ee0d1]"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold mb-2">Story Color (Hex)</label>
                        <input
                            type="text"
                            value={orbColor}
                            onChange={(e) => setOrbColor(e.target.value)}
                            placeholder="#7ee0d1"
                            className="w-full bg-[#101820] border border-[#35434f] rounded-xl p-3 text-sm focus:outline-none focus:border-[#7ee0d1]"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">Enter a hex code like #7ee0d1</p>
                    </div>

                    {/* Choose the narrator here; Accept & Publish starts generation. */}
                    <NarrationPanel narration={narration} onApproval disabled={publishing || declining} />

                    {/* Audio/Video File Input */}
                    <div>
                        <label className="block text-xs font-bold mb-2">Attach Media Narration (Optional)</label>
                        <input
                            type="file"
                            accept="audio/*, video/*"
                            onChange={(e) => setMediaFile(e.target.files?.[0] || null)}
                            className="w-full text-sm text-[#aab8c4] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#35434f] file:text-[#e6edf3] hover:file:bg-[#4a5a6a] transition"
                        />
                    </div>

                   <div className="flex justify-between items-center mt-8 pt-6 border-t border-[#35434f]">
                        {/* LEFT SIDE: Decline */}
                        <button 
                            type="button"
                            onClick={handleDecline}
                            disabled={publishing || declining}
                            className="px-6 py-3 bg-red-950/40 hover:bg-red-900/60 border border-red-900/50 text-red-400 font-medium rounded-xl text-sm transition disabled:opacity-50"
                        >
                            {declining ? 'Declining...' : 'Decline Story'}
                        </button>

                        {/* RIGHT SIDE: Cancel and Accept */}
                        <div className="flex gap-4">
                            <button 
                                type="button"
                                disabled={publishing || declining}
                                onClick={() => router.push('/Admin')}
                                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded-xl text-sm transition"
                            >
                                Cancel
                            </button>
                            <button 
                                type="button"
                                onClick={handlePublish}
                                disabled={publishing || declining}
                                className="px-6 py-3 bg-[#7ee0d1] hover:bg-[#66d4c5] disabled:bg-[#35434f] text-[#102029] font-medium rounded-xl text-sm transition"
                            >
                                {narration.busy ? 'Generating narration...' : publishing ? 'Publishing...' : 'Accept & Publish'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}