'use client';
import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function CourageSurvey({ onClose }: { onClose: () => void }) {
    const [helped, setHelped] = useState<string | null>(null);
    const [howItHelped, setHowItHelped] = useState('');
    const [tryGoingOut, setTryGoingOut] = useState<string | null>(null);
    const [feedback, setFeedback] = useState('');
    
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setErrorMsg('');

        try {
            const { error } = await supabase
                .from('survey_responses')
                .insert([
                    {
                        helped: helped,
                        how_it_helped: howItHelped,
                        try_going_out: tryGoingOut,
                        feedback: feedback
                    }
                ]);

            if (error) throw new Error(error.message);

            setSubmitted(true);
        } catch (err) {
            if (err instanceof Error) setErrorMsg(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 font-sans text-slate-200">
            <div className="max-w-lg w-full bg-[#17212b] border border-[#35434f] rounded-3xl p-8 shadow-2xl relative">
                
                {/* Close Button */}
                <button 
                    onClick={onClose}
                    className="absolute top-6 right-6 text-slate-400 hover:text-white text-lg !bg-transparent !border-none"
                >
                    ✕
                </button>

                {!submitted ? (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <h2 className="text-2xl font-serif text-white mb-2">You’ve Reached the End of the Loop</h2>
                            <p className="text-xs text-slate-400">
                                Your thoughts help us understand how this space supports our community.
                            </p>
                        </div>

                        {errorMsg && (
                            <div className="p-3 bg-red-950/50 border border-red-500/50 rounded-xl text-xs text-red-300">
                                {errorMsg}
                            </div>
                        )}

                        {/* Question 1: Did it help? */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-[#7ee0d1]">
                                Did walking through this loop help you feel more at ease?
                            </label>
                            <div className="flex gap-4">
                                {['Yes', 'Somewhat', 'No'].map((option) => (
                                    <button
                                        type="button"
                                        key={option}
                                        onClick={() => setHelped(option)}
                                        className={`flex-1 py-3 rounded-xl text-xs font-bold border-2 transition-all ${
                                            helped === option 
                                                ? '!bg-[#7ee0d1] !text-[#102029] !border-white shadow-[0_0_15px_rgba(126,224,209,0.8)] scale-105' 
                                                : '!bg-slate-800 !border-[#35434f] !text-slate-300 hover:!border-[#7ee0d1]/50'
                                        }`}
                                    >
                                        {option}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Question 2: How did it help? */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-[#7ee0d1]">
                                How did it help you? (Optional)
                            </label>
                            <textarea
                                rows={3}
                                value={howItHelped}
                                onChange={(e) => setHowItHelped(e.target.value)}
                                placeholder="Share a few words..."
                                className="w-full bg-[#101820] border border-[#35434f] rounded-xl p-3 text-xs focus:outline-none focus:border-[#7ee0d1]"
                            />
                        </div>

                        {/* Question 3: Will you try going out now? */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-[#7ee0d1]">
                                Do you feel more inclined to try going out now?
                            </label>
                            <div className="flex gap-4">
                                {['Yes', 'Maybe', 'Not really'].map((option) => (
                                    <button
                                        type="button"
                                        key={option}
                                        onClick={() => setTryGoingOut(option)}
                                        className={`flex-1 py-3 rounded-xl text-xs font-bold border-2 transition-all ${
                                            tryGoingOut === option 
                                                ? '!bg-[#7ee0d1] !text-[#102029] !border-white shadow-[0_0_15px_rgba(126,224,209,0.8)] scale-105' 
                                                : '!bg-slate-800 !border-[#35434f] !text-slate-300 hover:!border-[#7ee0d1]/50'
                                        }`}
                                    >
                                        {option}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Question 4: Website feedback */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-[#7ee0d1]">
                                Any feedback about the website or experience?
                            </label>
                            <input
                                type="text"
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                placeholder="Tell us what you think..."
                                className="w-full bg-[#101820] border border-[#35434f] rounded-xl p-3 text-xs focus:outline-none focus:border-[#7ee0d1]"
                            />
                        </div>

                        {/* Submit Survey Button */}
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full py-3 !bg-[#7ee0d1] hover:!bg-[#66d4c5] disabled:opacity-50 !text-[#102029] font-bold rounded-xl text-xs tracking-wider uppercase transition shadow-md !border-none"
                        >
                            {submitting ? 'Submitting...' : 'Submit Feedback'}
                        </button>
                    </form>
                ) : (
                    /* Thank You View + Share Your Story CTA */
                    <div className="text-center py-6 space-y-6">
                        <div>
                            <h2 className="text-2xl font-serif text-white mb-2">Thank You!</h2>
                            <p className="text-sm text-slate-300">
                                Your voice matters to us and helps make our community safer and more connected.
                            </p>
                        </div>

                        <div className="pt-4 border-t border-[#35434f] space-y-3">
                            <p className="text-xs text-slate-400">Have your own experience to add to the loop?</p>
                            <Link 
                                href="/share" 
                                className="inline-block w-full py-3 !bg-slate-800 hover:!bg-slate-700 border !border-slate-600 !text-white font-medium rounded-xl text-xs uppercase tracking-wider transition text-center"
                            >
                                Share Your Own Story
                            </Link>
                        </div>

                        <button 
                            onClick={onClose}
                            className="text-xs text-slate-500 hover:text-slate-300 underline underline-offset-4 !bg-transparent !border-none"
                        >
                            Close and return
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}