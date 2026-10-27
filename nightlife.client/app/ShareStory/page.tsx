'use client';

import React, { useState } from 'react';

export default function ShareStoryPage() {
    const [formData, setFormData] = useState({
        story: '',
        privateContactEmail: '',
        location: '',
        incidentDate: '',
        incidentTime: '',
        timePrecision: 'Approximate',
        anonymityOption: 'anonymous',
        publicDisplayName: '',
        hasConsented: false,
        age: '',
        gender: '',
    });

    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;

        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const response = await fetch('/api/stories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: `Story at ${formData.location}`, // SQLite title field
                    summary: formData.story,                 // Maps to summary column
                    category: 'Unwanted attention',          // Default category
                    age: Number(formData.age),                        // Demographics default
                    gender: formData.gender,                         // Demographics default
                    newPlaceName: formData.location.trim(),  // Creates/links location in `places`
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to save story');
            }

            setSubmitted(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (error) {
            console.error('Error submitting story:', error);
            alert('Failed to submit story to database.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#101820] text-[#e6edf3] flex flex-col justify-between font-sans">
            

            {/* Main Content Layout */}
            <main className="w-full max-w-7xl mx-auto px-6 py-12 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">

                {/* Left Sidebar Content */}
                <div className="lg:col-span-5 space-y-8 pr-0 lg:pr-4">
                    <div>
                        <p className="text-[10px] tracking-widest text-[#aab8c4] uppercase mb-3">
                            01 / 05 &nbsp;·&nbsp; YOUR VOICE, YOUR CHOICE
                        </p>
                        <h1 className="font-serif text-4xl lg:text-5xl text-[#e6edf3] leading-tight mb-4">
                            Tell your story.<br />On your terms.
                        </h1>
                        <p className="text-sm text-[#c1cdd7] leading-relaxed">
                            Share what happened in Eindhoven. Write only what you feel comfortable sharing. You do not have to justify your experience.
                        </p>
                    </div>

                    {/* Review Badge Card */}
                    <div className="bg-[#17212b] border border-[#35434f] rounded-2xl p-5 flex items-start gap-3">
                        <svg className="w-5 h-5 text-[#7ee0d1] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                            <h4 className="text-xs font-bold text-[#e6edf3] mb-1">
                                Reviewed before it appears
                            </h4>
                            <p className="text-[11px] text-[#aab8c4] leading-normal">
                                Your submission goes to the project admin, not straight onto the map. Only an approved story is published.
                            </p>
                        </div>
                    </div>

                    {/* Highlight Box */}
                    <div className="bg-[#17212b] border border-[#35434f] rounded-2xl p-8 relative overflow-hidden">
                        <p className="text-[10px] tracking-widest text-[#aab8c4] uppercase mb-2">
                            STRATUMSEIND · EINDHOVEN
                        </p>
                        <h2 className="font-serif text-2xl lg:text-3xl text-[#e6edf3] leading-snug">
                            The harm was never your fault.
                        </h2>
                    </div>

                    {/* DISTINCT WARNING CARD: Amber tone to prevent conflict with selection UI */}
                    <div className="bg-[#282219] border border-[#f59e0b]/40 rounded-2xl p-6 shadow-sm space-y-3">
                        <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-[#f59e0b]/20 flex items-center justify-center shrink-0">
                                <svg className="w-4 h-4 text-[#f59e0b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h3 className="font-serif text-xl text-[#fef3c7] font-medium">
                                Keep identifying details out
                            </h3>
                        </div>
                        <p className="text-xs text-[#fde68a]/90 leading-relaxed pl-0.5">
                            Please leave out other people&apos;s names, phone numbers, exact addresses, and personal details. An approximate street or general area is enough.
                        </p>
                        <div className="pt-2 border-t border-[#f59e0b]/20 text-[11px] text-[#fcd34d]/70">
                            This is not an emergency service. Immediate danger: call <span className="text-[#f59e0b] font-bold">112</span>.
                        </div>
                    </div>
                </div>

                {/* Right Form Card */}
                <div className="lg:col-span-7 bg-[#17212b] rounded-3xl p-8 border border-[#35434f] shadow-lg">
                    <div className="flex items-center justify-between mb-6 pb-2">
                        <h2 className="font-serif text-2xl text-[#e6edf3]">
                            Share your story
                        </h2>

                    </div>

                    {submitted && (
                        <div className="mb-6 p-4 bg-[#243b45] border border-[#7ee0d1] rounded-xl text-xs text-[#7ee0d1]">
                            Thank you. Your story has been submitted for review.
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Non-button style banner with left border accent */}
                        <div className="p-3.5 bg-[#101820] border-l-4 border-[#f59e0b] rounded-r-xl flex items-center gap-3">
                            <svg className="w-4 h-4 text-[#f59e0b] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-[11px] text-[#c1cdd7]">
                                <strong className="text-[#e6edf3]">Important rule:</strong> Do not include real names, phone numbers, or exact addresses in your story.
                            </p>
                        </div>

                        {/* Story Field */}
                        <div>
                            <label className="block text-xs font-bold text-[#e6edf3] mb-2">
                                Your story <span className="text-[#aab8c4]">*</span>
                            </label>
                            <textarea
                                name="story"
                                rows={6}
                                required
                                value={formData.story}
                                onChange={handleChange}
                                className="w-full bg-[#101820] border border-[#35434f] rounded-xl p-3.5 text-xs text-[#e6edf3] placeholder-[#9cabb8] leading-relaxed focus:outline-none focus:border-[#7ee0d1] focus:ring-1 focus:ring-[#7ee0d1] transition resize-y"
                            />
                            <p className="text-[10px] text-[#aab8c4] mt-1.5">
                                Only share what feels okay. All content in this filled example is fictional.
                            </p>
                        </div>

                        {/* Email & Location Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-[#e6edf3] mb-2">
                                    Private contact email <span className="text-[#aab8c4]">*</span>
                                </label>
                                <input
                                    type="email"
                                    name="privateContactEmail"
                                    required
                                    value={formData.privateContactEmail}
                                    onChange={handleChange}
                                    className="w-full bg-[#101820] border border-[#35434f] rounded-xl p-3 text-xs text-[#e6edf3] focus:outline-none focus:border-[#7ee0d1] focus:ring-1 focus:ring-[#7ee0d1] transition"
                                />
                                <p className="text-[10px] text-[#aab8c4] mt-1.5">
                                    Only for review updates. Never shown publicly.
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-[#e6edf3] mb-2">
                                    Where in Eindhoven did it happen? <span className="text-[#aab8c4]">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="location"
                                    required
                                    value={formData.location}
                                    onChange={handleChange}
                                    className="w-full bg-[#101820] border border-[#35434f] rounded-xl p-3 text-xs text-[#e6edf3] focus:outline-none focus:border-[#7ee0d1] focus:ring-1 focus:ring-[#7ee0d1] transition"
                                />
                                <p className="text-[10px] text-[#aab8c4] mt-1.5">
                                    Publicly shown as Stratumseind · approximate location.
                                </p>
                            </div>
                        </div>

                        {/* Age & Gender Input Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-[#e6edf3] mb-2">
                                    Age <span className="text-[#aab8c4]">*</span>
                                </label>
                                <input
                                    type="number"
                                    name="age"
                                    required
                                    min={12}
                                    max={100}
                                    placeholder="e.g. 22"
                                    value={formData.age}
                                    onChange={handleChange}
                                    className="w-full bg-[#101820] border border-[#35434f] rounded-xl p-3 text-xs text-[#e6edf3] focus:outline-none focus:border-[#7ee0d1] focus:ring-1 focus:ring-[#7ee0d1] transition"
                                />
                                <p className="text-[10px] text-[#aab8c4] mt-1.5">
                                    Used for anonymous demographic mapping.
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-[#e6edf3] mb-2">
                                    Gender Identity <span className="text-[#aab8c4]">*</span>
                                </label>
                                <select
                                    name="gender"
                                    value={formData.gender}
                                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                        setFormData((prev) => ({
                                            ...prev,
                                            gender: e.target.value,
                                        }));
                                    }}
                                    className="w-full bg-[#101820] border border-[#35434f] rounded-xl p-3 text-xs text-[#e6edf3] focus:outline-none focus:border-[#7ee0d1] focus:ring-1 focus:ring-[#7ee0d1] transition cursor-pointer"
                                >
                                    <option value="female">Female</option>
                                    <option value="male">Male</option>
                                    <option value="non-binary">Non-binary</option>
                                    <option value="other">Other / Prefer not to say</option>
                                </select>
                                <p className="text-[10px] text-[#aab8c4] mt-1.5">
                                    Select the option you identify with.
                                </p>
                            </div>
                        </div>

                        {/* Date & Time Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-[#e6edf3] mb-2">
                                    Incident date <span className="text-[#aab8c4]">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="incidentDate"
                                    required
                                    value={formData.incidentDate}
                                    onChange={handleChange}
                                    className="w-full bg-[#101820] border border-[#35434f] rounded-xl p-3 text-xs text-[#e6edf3] focus:outline-none focus:border-[#7ee0d1] focus:ring-1 focus:ring-[#7ee0d1] transition"
                                />
                                <p className="text-[10px] text-[#aab8c4] mt-1.5">
                                    An approximate date is okay if you are unsure.
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-[#e6edf3] mb-2">
                                    Incident time
                                </label>
                                <input
                                    type="text"
                                    name="incidentTime"
                                    value={formData.incidentTime}
                                    onChange={handleChange}
                                    className="w-full bg-[#101820] border border-[#35434f] rounded-xl p-3 text-xs text-[#e6edf3] focus:outline-none focus:border-[#7ee0d1] focus:ring-1 focus:ring-[#7ee0d1] transition"
                                />
                                {/* Time Radio Precision */}
                                <div className="flex items-center gap-4 mt-2 text-[10px] text-[#c1cdd7]">
                                    {['Approximate', 'Exact', 'Unknown'].map((option) => (
                                        <label key={option} className="flex items-center gap-1.5 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="timePrecision"
                                                value={option}
                                                checked={formData.timePrecision === option}
                                                onChange={(e) =>
                                                    setFormData((prev) => ({ ...prev, timePrecision: e.target.value }))
                                                }
                                                className="accent-[#7ee0d1] w-3 h-3"
                                            />
                                            <span>{option}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Anonymity Options */}
                        <div className="space-y-3 pt-2">
                            <label className="block text-xs font-bold text-[#e6edf3]">
                                How should your story be credited? <span className="text-[#aab8c4]">*</span>
                            </label>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {/* Anonymous Option */}
                                <label
                                    onClick={() =>
                                        setFormData((prev) => ({ ...prev, anonymityOption: 'anonymous' }))
                                    }
                                    className={`border rounded-2xl p-4 cursor-pointer transition ${formData.anonymityOption === 'anonymous'
                                        ? 'bg-[#243b45] border-[#7ee0d1]'
                                        : 'border-[#35434f] hover:border-[#aab8c4]'
                                        }`}
                                >
                                    <div className="flex items-center gap-2.5 mb-1">
                                        <input
                                            type="radio"
                                            name="anonymityOption"
                                            value="anonymous"
                                            checked={formData.anonymityOption === 'anonymous'}
                                            onChange={() => { }}
                                            className="accent-[#7ee0d1]"
                                        />
                                        <span className="text-xs font-bold text-[#e6edf3]">
                                            Publish anonymously
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-[#aab8c4] pl-5 leading-normal">
                                        Selected by default. Your story is credited to &quot;Anonymous&quot;.
                                    </p>
                                </label>

                                {/* Named Option */}
                                <label
                                    onClick={() =>
                                        setFormData((prev) => ({ ...prev, anonymityOption: 'named' }))
                                    }
                                    className={`border rounded-2xl p-4 cursor-pointer transition ${formData.anonymityOption === 'named'
                                        ? 'bg-[#243b45] border-[#7ee0d1]'
                                        : 'border-[#35434f] hover:border-[#aab8c4]'
                                        }`}
                                >
                                    <div className="flex items-center gap-2.5 mb-1">
                                        <input
                                            type="radio"
                                            name="anonymityOption"
                                            value="named"
                                            checked={formData.anonymityOption === 'named'}
                                            onChange={() => { }}
                                            className="accent-[#7ee0d1]"
                                        />
                                        <span className="text-xs font-bold text-[#e6edf3]">
                                            Use a public display name
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-[#aab8c4] pl-5 leading-normal">
                                        A first name or pseudonym is enough. You do not need to share your full legal name.
                                    </p>
                                </label>
                            </div>
                        </div>

                        {/* Public Display Name Input */}
                        <div>
                            <label className="block text-xs font-bold text-[#e6edf3] mb-2">
                                Public display name · only if you choose named publication
                            </label>
                            <input
                                type="text"
                                name="publicDisplayName"
                                disabled={formData.anonymityOption === 'anonymous'}
                                value={
                                    formData.anonymityOption === 'anonymous'
                                        ? ''
                                        : formData.publicDisplayName
                                }
                                onChange={handleChange}
                                placeholder="Not used — publishing anonymously"
                                className="w-full bg-[#101820] border border-[#35434f] rounded-xl p-3 text-xs text-[#e6edf3] placeholder-[#9cabb8] disabled:bg-[#101820]/50 disabled:text-[#aab8c4] disabled:cursor-not-allowed focus:outline-none focus:border-[#7ee0d1] transition"
                            />
                            <p className="text-[10px] text-[#aab8c4] mt-1.5">
                                Your private email will never be used as your public name.
                            </p>
                        </div>

                        {/* Consent Checkbox */}
                        <div className="pt-2">
                            <label className="flex items-start gap-3 cursor-pointer text-xs text-[#c1cdd7] leading-relaxed">
                                <input
                                    type="checkbox"
                                    name="hasConsented"
                                    required
                                    checked={formData.hasConsented}
                                    onChange={handleChange}
                                    className="mt-0.5 accent-[#7ee0d1] rounded"
                                />
                                <span>
                                    I consent to public publication of my story after admin review,
                                    with my selected attribution and an approximate location. I
                                    understand my contact email stays private. <span className="text-[#aab8c4]">*</span>
                                </span>
                            </label>
                        </div>

                        {/* Card Footer Actions */}
                        <div className="pt-4 border-t border-[#2d3b47] flex items-center justify-between">
                            <span className="text-[10px] text-[#aab8c4]">
                                Nothing is published when you submit.<br />
                                * Required 
                            </span>
                            <button
                                type="submit"
                                disabled={submitting || !formData.hasConsented}
                                className="bg-[#7ee0d1] hover:bg-[#66d4c5] disabled:bg-[#35434f] disabled:text-[#aab8c4] text-[#102029] font-medium text-xs px-6 py-2.5 rounded-full transition flex items-center gap-1.5 shadow-sm"
                            >
                                {submitting ? 'Submitting...' : 'Submit for review ↗'}
                            </button>
                        </div>
                    </form>
                </div>


            </main>

            {/* Footer */}
            <footer className="border-t border-[#35434f] bg-[#17212b] py-4 px-8 text-[11px] text-[#aab8c4] flex items-center justify-between">
                <span>School project prototype - fictional demo content - no live submissions</span>
                <span>Harm is never the target&apos;s fault.</span>
            </footer>
        </div>
    );
}