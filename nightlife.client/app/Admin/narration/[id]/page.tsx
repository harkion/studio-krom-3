"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { NarrationPanel, useNarration } from "../../NarrationControls";

// This is the separate narration screen for a story that already exists.
// The [id] in the folder name becomes the story ID in the URL.
export default function StoryNarrationPage() {
  const params = useParams<{ id: string }>();
  // The shared hook loads the voices, permission and saved audio for this story.
  const narration = useNarration(params.id);
  return (
    <main className="mx-auto min-h-screen max-w-3xl space-y-6 px-6 py-24 text-[#e6edf3]">
      <Link href="/Admin" className="text-sm text-[#7ee0d1]">
        ← Back to stories
      </Link>
      <h1 className="font-serif text-3xl">Narration for story #{params.id}</h1>
      {/* Reuse the same controls as the review page, with a Generate button. */}
      <NarrationPanel narration={narration} />
    </main>
  );
}
