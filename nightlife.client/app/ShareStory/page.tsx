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
        <div className="min-h-screen bg-[#f4f4f4] flex flex-col justify-between">
            {/* Main Content Container */}
            <main className="w-full flex-1 py-12 px-4 flex items-center justify-center">
                {/* Single Form Card (Adjust max-w-3xl to change size) */}
                <div className="w-full max-w-3xl bg-white rounded-3xl p-8 border border-neutral-200 shadow-sm">
                    <div className="flex items-center justify-between mb-6 pb-2">
                        <h2 className="font-serif text-2xl text-neutral-900">
                            Share your story
                        </h2>

                    </div>

                    {submitted && (
                        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
                            Thank you. Your story has been submitted for review.
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Story Field */}
                        <div>
                            <label className="block text-xs font-bold text-neutral-800 mb-2">
                                Your story <span className="text-neutral-500">*</span>
                            </label>
                            <textarea
                                name="story"
                                rows={6}
                                required
                                value={formData.story}
                                onChange={handleChange}
                                className="w-full bg-white border border-neutral-200 rounded-xl p-3.5 text-xs text-neutral-800 leading-relaxed focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition resize-y"
                            />
                            <p className="text-[10px] text-neutral-400 mt-1.5">
                                Only share what feels okay. All content in this filled example is fictional.
                            </p>
                        </div>

                        {/* Email & Location Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-neutral-800 mb-2">
                                    Private contact email <span className="text-neutral-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    name="privateContactEmail"
                                    required
                                    value={formData.privateContactEmail}
                                    onChange={handleChange}
                                    className="w-full bg-white border border-neutral-200 rounded-xl p-3 text-xs text-neutral-800 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition"
                                />
                                <p className="text-[10px] text-neutral-400 mt-1.5">
                                    Only for review updates. Never shown publicly.
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-neutral-800 mb-2">
                                    Where in Eindhoven did it happen? <span className="text-neutral-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="location"
                                    required
                                    value={formData.location}
                                    onChange={handleChange}
                                    className="w-full bg-white border border-neutral-200 rounded-xl p-3 text-xs text-neutral-800 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition"
                                />
                                <p className="text-[10px] text-neutral-400 mt-1.5">
                                    Publicly shown as Stratumseind · approximate location.
                                </p>
                            </div>
                        </div>

                        {/* Date & Time Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-neutral-800 mb-2">
                                    Incident date <span className="text-neutral-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="incidentDate"
                                    required
                                    value={formData.incidentDate}
                                    onChange={handleChange}
                                    className="w-full bg-white border border-neutral-200 rounded-xl p-3 text-xs text-neutral-800 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition"
                                />
                                <p className="text-[10px] text-neutral-400 mt-1.5">
                                    An approximate date is okay if you are unsure.
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-neutral-800 mb-2">
                                    Incident time
                                </label>
                                <input
                                    type="text"
                                    name="incidentTime"
                                    value={formData.incidentTime}
                                    onChange={handleChange}
                                    className="w-full bg-white border border-neutral-200 rounded-xl p-3 text-xs text-neutral-800 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition"
                                />
                                {/* Time Radio Precision */}
                                <div className="flex items-center gap-4 mt-2 text-[10px] text-neutral-600">
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
                                                className="accent-neutral-900 w-3 h-3"
                                            />
                                            <span>{option}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Anonymity Options */}
                        <div className="space-y-3 pt-2">
                            <label className="block text-xs font-bold text-neutral-800">
                                How should your story be credited? <span className="text-neutral-500">*</span>
                            </label>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {/* Anonymous Option */}
                                <label
                                    onClick={() =>
                                        setFormData((prev) => ({ ...prev, anonymityOption: 'anonymous' }))
                                    }
                                    className={`border rounded-2xl p-4 cursor-pointer transition ${formData.anonymityOption === 'anonymous'
                                        ? 'bg-[#f8f8f8] border-neutral-400'
                                        : 'border-neutral-200 hover:border-neutral-300'
                                        }`}
                                >
                                    <div className="flex items-center gap-2.5 mb-1">
                                        <input
                                            type="radio"
                                            name="anonymityOption"
                                            value="anonymous"
                                            checked={formData.anonymityOption === 'anonymous'}
                                            onChange={() => { }}
                                            className="accent-neutral-900"
                                        />
                                        <span className="text-xs font-bold text-neutral-900">
                                            Publish anonymously
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-neutral-500 pl-5 leading-normal">
                                        Selected by default. Your story is credited to &quot;Anonymous&quot;.
                                    </p>
                                </label>

                                {/* Named Option */}
                                <label
                                    onClick={() =>
                                        setFormData((prev) => ({ ...prev, anonymityOption: 'named' }))
                                    }
                                    className={`border rounded-2xl p-4 cursor-pointer transition ${formData.anonymityOption === 'named'
                                        ? 'bg-[#f8f8f8] border-neutral-400'
                                        : 'border-neutral-200 hover:border-neutral-300'
                                        }`}
                                >
                                    <div className="flex items-center gap-2.5 mb-1">
                                        <input
                                            type="radio"
                                            name="anonymityOption"
                                            value="named"
                                            checked={formData.anonymityOption === 'named'}
                                            onChange={() => { }}
                                            className="accent-neutral-900"
                                        />
                                        <span className="text-xs font-bold text-neutral-900">
                                            Use a public display name
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-neutral-500 pl-5 leading-normal">
                                        A first name or pseudonym is enough. You do not need to share your full legal name.
                                    </p>
                                </label>
                            </div>
                        </div>

                        {/* Public Display Name Input */}
                        <div>
                            <label className="block text-xs font-bold text-neutral-800 mb-2">
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
                                className="w-full bg-[#f8f8f8] border border-neutral-200 rounded-xl p-3 text-xs text-neutral-700 disabled:bg-[#f4f4f4] disabled:text-neutral-400 disabled:cursor-not-allowed focus:outline-none focus:border-neutral-900 transition"
                            />
                            <p className="text-[10px] text-neutral-400 mt-1.5">
                                Your private email will never be used as your public name.
                            </p>
                        </div>

                        {/* Consent Checkbox */}
                        <div className="pt-2">
                            <label className="flex items-start gap-3 cursor-pointer text-xs text-neutral-600 leading-relaxed">
                                <input
                                    type="checkbox"
                                    name="hasConsented"
                                    required
                                    checked={formData.hasConsented}
                                    onChange={handleChange}
                                    className="mt-0.5 accent-neutral-900 rounded"
                                />
                                <span>
                                    I consent to public publication of my story after admin review,
                                    with my selected attribution and an approximate location. I
                                    understand my contact email stays private. <span className="text-neutral-500">*</span>
                                </span>
                            </label>
                        </div>

                        {/* Card Footer Actions */}
                        <div className="pt-4 border-t border-neutral-100 flex items-center justify-end">
                            <button
                                type="submit"
                                disabled={submitting || !formData.hasConsented}
                                className="bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-300 text-white font-medium text-xs px-6 py-2.5 rounded-full transition flex items-center gap-1.5 shadow-sm"
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