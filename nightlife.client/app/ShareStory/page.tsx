'use client';

import React, { useState } from 'react';

export default function ShareStoryPage() {
    const [formData, setFormData] = useState({
        story:
            'I left a venue with two friends, then split off near the bridge. Someone kept the same pace behind me and crossed whenever I crossed. I called a friend and stepped into a late-night café, where a staff member let me wait until the person moved on.\n\nWhat stayed with me was how quickly a familiar street stopped feeling familiar. I wish someone nearby had simply asked if I was okay.',
        privateContactEmail: 'alex.demo@example.com',
        location: 'Stratumseind, near the bridge',
        incidentDate: '19 September 2026',
        incidentTime: 'Around 00:30',
        timePrecision: 'Approximate',
        anonymityOption: 'anonymous', // 'anonymous' | 'named'
        publicDisplayName: '',
        hasConsented: true,
    });

    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;

        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setTimeout(() => {
            setSubmitting(false);
            setSubmitted(true);
        }, 600);
    };

    return (
        <div className="min-h-screen bg-[#101820] text-[#e6edf3] flex flex-col justify-between">
            {/* Main Content Container */}
            <main className="w-full flex-1 py-12 px-4 flex items-center justify-center">
                {/* Single Form Card (Adjust max-w-3xl to change size) */}
                <div className="w-full max-w-3xl bg-[#17212b] rounded-3xl p-8 border border-[#35434f] shadow-sm">
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
                                placeholder="Share your experience..."
                                className="w-full bg-[#17212b] border border-[#35434f] rounded-xl p-3.5 text-xs text-[#e6edf3] placeholder-[#9cabb8] leading-relaxed focus:outline-none focus:border-[#7ee0d1] focus:ring-1 focus:ring-[#7ee0d1] transition resize-y"
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
                                    className="w-full bg-[#17212b] border border-[#35434f] rounded-xl p-3 text-xs text-[#e6edf3] focus:outline-none focus:border-[#7ee0d1] focus:ring-1 focus:ring-[#7ee0d1] transition"
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
                                    className="w-full bg-[#17212b] border border-[#35434f] rounded-xl p-3 text-xs text-[#e6edf3] focus:outline-none focus:border-[#7ee0d1] focus:ring-1 focus:ring-[#7ee0d1] transition"
                                />
                                <p className="text-[10px] text-[#aab8c4] mt-1.5">
                                    Publicly shown as Stratumseind · approximate location.
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
                                    className="w-full bg-[#17212b] border border-[#35434f] rounded-xl p-3 text-xs text-[#e6edf3] focus:outline-none focus:border-[#7ee0d1] focus:ring-1 focus:ring-[#7ee0d1] transition"
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
                                    className="w-full bg-[#17212b] border border-[#35434f] rounded-xl p-3 text-xs text-[#e6edf3] focus:outline-none focus:border-[#7ee0d1] focus:ring-1 focus:ring-[#7ee0d1] transition"
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
                                className="w-full bg-[#17212b] border border-[#35434f] rounded-xl p-3 text-xs text-[#e6edf3] placeholder-[#9cabb8] disabled:bg-[#101820] disabled:text-[#aab8c4] disabled:cursor-not-allowed focus:outline-none focus:border-[#7ee0d1] transition"
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
                        <div className="pt-4 border-t border-[#2d3b47] flex items-center justify-end">
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
        </div>
    );
}