"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { supabase } from "@/lib/supabase";

// Settings returned by our own server. The ElevenLabs secret never comes to this page.
type Info = {
  voices: { id: string; name: string }[];
  model: string;
  consent: boolean;
  permissionConfigured: boolean;
  audio: string | null;
  status: string;
  voiceId: string;
  storyStatus: string;
};
// GET reads the current status. POST asks the server to generate the selected voice.
// Send the signed-in user’s token so the server can verify their admin access.
async function narrationRequest(storyId: string, voiceId?: string) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sign in to the admin page to manage narration.");
  const response = await fetch(
    `/api/admin/stories/${encodeURIComponent(storyId)}/narration`,
    {
      method: voiceId === undefined ? "GET" : "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      ...(voiceId === undefined ? {} : { body: JSON.stringify({ voiceId }) }),
      cache: "no-store",
    },
  );
  const result = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(
      result?.error ||
        "Could not finish narration. Refresh to check its status before retrying.",
    );
  return result;
}
// A hook is shared state and behaviour that more than one page can use.
// Both admin screens use this to keep their narration controls consistent.
export function useNarration(storyId: string) {
  // info = server settings; voiceId = selection; error = message; busy = request running.
  const [info, setInfo] = useState<Info | null>(null);
  const [voiceId, setVoiceId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  // Reload saved status after generation instead of assuming that saving succeeded.
  const refresh = useCallback(async () => {
    const result: Info = await narrationRequest(storyId);
    setInfo(result);
    setVoiceId(
      (current) => current || result.voiceId || result.voices[0]?.id || "",
    );
  }, [storyId]);
  // Load when the story changes. Ignore late replies after leaving this screen.
  useEffect(() => {
    let active = true;
    if (storyId)
      narrationRequest(storyId)
        .then((result: Info) => {
          if (!active) return;
          setInfo(result);
          setVoiceId(result.voiceId || result.voices[0]?.id || "");
        })
        .catch((error) => {
          if (active) setError(error.message);
        });
    return () => {
      active = false;
    };
  }, [storyId]);
  // Show progress, request generation once, then update the preview or error message.
  const generate = async () => {
    setBusy(true);
    setError("");
    try {
      await narrationRequest(storyId, voiceId);
      await refresh();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not generate narration.";
      setError(message);
      await refresh().catch(() => undefined);
      throw new Error(message);
    } finally {
      setBusy(false);
    }
  };
  return { info, voiceId, setVoiceId, error, busy, generate };
}
// The visible controls. onApproval means publishing will trigger generation;
// otherwise this panel shows its own Generate button for an approved story.
export function NarrationPanel({
  narration,
  onApproval = false,
  disabled = false,
}: {
  narration: ReturnType<typeof useNarration>;
  onApproval?: boolean;
  disabled?: boolean;
}) {
  const selectId = useId();
  const { info, voiceId, setVoiceId, error, busy, generate } = narration;
  // Block another attempt if a previous request may already have used credits.
  const locked =
    info?.status === "generating" || info?.status === "needs_review";
  return (
    <section className="space-y-3 rounded-xl border border-[#35434f] bg-[#101820] p-4 text-[#e6edf3]">
      <h2 className="text-base font-semibold">Story narration</h2>
      {error && (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      )}
      {!info && !error && (
        <p className="text-sm text-slate-300">Checking narration settings…</p>
      )}
      {info && (
        <>
          <label htmlFor={selectId} className="block text-sm">
            Narrator
          </label>
          <select
            id={selectId}
            value={voiceId}
            onChange={(event) => setVoiceId(event.target.value)}
            disabled={busy || disabled || !!info.audio || locked}
            className="w-full rounded-lg border border-[#35434f] bg-[#17212b] p-3 text-sm disabled:opacity-60"
          >
            {info.voices.map((voice) => (
              <option key={voice.id} value={voice.id}>
                {voice.name}
              </option>
            ))}
          </select>
          <p
            role="status"
            aria-live="polite"
            className="text-sm text-slate-300"
          >
            {busy
              ? "Generating and saving narration…"
              : info.audio
                ? "Audio ready. The existing recording will be kept."
                : locked
                  ? "Generation is running or needs checking before another attempt."
                  : info.status === "failed"
                    ? "The last attempt failed. Fix the reported issue, then retry."
                    : "No narration has been generated yet."}
          </p>
          {/* Explain why generation is unavailable when permission is missing. */}
      {!info.consent && (
            <p className="text-sm text-amber-200">
              {info.permissionConfigured
                ? "AI narration permission has not been given. This story can remain written only."
                : "The AI narration permission field is not connected yet. Audio generation is disabled."}
            </p>
          )}
          {/* Play the stored MP3; listening does not call ElevenLabs again. */}
      {info.audio && (
            <audio
              controls
              preload="none"
              src={info.audio}
              aria-label="Story narration preview"
              className="w-full"
            />
          )}
          {!info.audio &&
            info.consent &&
            !locked &&
            (onApproval ? (
              <p className="text-sm text-slate-300">
                Narration will be generated automatically when you publish,
                unless you attach your own recording.
              </p>
            ) : (
              <button
                type="button"
                disabled={busy || disabled || info.storyStatus !== "approved"}
                onClick={() => {
                  void generate().catch(() => undefined);
                }}
                className="rounded-lg bg-[#7ee0d1] px-4 py-2 text-sm font-medium text-[#102029] disabled:opacity-50"
              >
                {busy
                  ? "Generating…"
                  : info.status === "failed"
                    ? "Retry narration"
                    : "Generate narration"}
              </button>
            ))}
          <p className="text-xs text-slate-400">
            AI narration uses generation credits. Listening to the saved
            recording does not generate it again.
          </p>
        </>
      )}
    </section>
  );
}
