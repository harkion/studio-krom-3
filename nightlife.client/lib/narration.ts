import { createHash } from "node:crypto";

// The database fields this feature needs. Other story fields can still be present.
export type Story = Record<string, unknown> & {
  id: string | number;
  status?: string;
  narrative_text?: string;
  audio?: string | null;
  audio_status?: string | null;
  voice_id?: string | null;
};
export type Narrator = { id: string; name: string };
// An expected problem with a message and HTTP status that the admin can understand.
export class NarrationError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
// The service needs these storage operations, but does not depend on Supabase itself.
// Tests can provide a pretend store instead of touching real stories.
export interface NarrationStore {
  get(id: string): Promise<Story>;
  claim(story: Story, voiceId: string, consentColumn: string): Promise<boolean>;
  upload(path: string, audio: Uint8Array): Promise<string>;
  finish(
    story: Story,
    voiceId: string,
    consentColumn: string,
    url: string,
  ): Promise<boolean>;
  mark(id: string, status: "failed" | "needs_review"): Promise<void>;
  remove(path: string): Promise<void>;
}
export type NarrationConfig = {
  apiKey: string;
  model: string;
  consentColumn: string;
  voices: Narrator[];
};
export function hasNarrationConsent(story: Story, column: string) {
  // Strings such as "false" or "yes" must never be treated as consent.
  return story[column] === true;
}
// Trust only server-managed roles or explicitly configured user IDs.
export function isNarrationAdmin(
  user: { id: string; app_metadata?: Record<string, unknown> },
  ids: string,
) {
  return (
    user.app_metadata?.role === "admin" ||
    ids
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
      .includes(user.id)
  );
}
// Read server environment settings. Voice IDs identify narrators; the API key is secret.
// v4 is the default, and ELEVENLABS_MODEL_ID can select v3 instead.
export function narrationConfig(
  env: Record<string, string | undefined>,
): NarrationConfig {
  const model = env.ELEVENLABS_MODEL_ID || "eleven_v4";
  if (!["eleven_v4", "eleven_v3"].includes(model))
    throw new NarrationError(
      "Use eleven_v4 or eleven_v3 for ELEVENLABS_MODEL_ID.",
      503,
    );
  const consentColumn =
    env.AI_NARRATION_CONSENT_COLUMN || "ai_narration_consent";
  if (!/^[a-z_][a-z0-9_]*$/.test(consentColumn))
    throw new NarrationError(
      "The narration permission column setting is invalid.",
      503,
    );
  const voices = [
    {
      id: env.ELEVENLABS_VOICE_ID_JESSICA || "cgSgspJ2msm6clMCkdW9",
      name: "Jessica",
    },
    {
      id: env.ELEVENLABS_VOICE_ID_ROGER || "CwhRBWXzGAHq8TQ4Fs17",
      name: "Roger",
    },
  ];
  return { apiKey: env.ELEVENLABS_API_KEY || "", model, consentColumn, voices };
}

// Pure orchestration with injected storage/fetch so failure paths can be tested without spending credits.
export async function generateNarration(
  id: string,
  voiceId: string,
  config: NarrationConfig,
  store: NarrationStore,
  request: typeof fetch = fetch,
) {
  if (!config.voices.some((v) => v.id === voiceId))
    throw new NarrationError("Choose Jessica or Roger.");
  // Check eligibility before making a paid request; keep any recording already saved.
  const story = await store.get(id);
  if (story.audio)
    return { status: "ready", audio: story.audio, existing: true };
  if (story.status !== "approved")
    throw new NarrationError(
      "Approve this story before generating audio.",
      409,
    );
  if (!hasNarrationConsent(story, config.consentColumn))
    throw new NarrationError(
      "AI narration permission has not been recorded for this story.",
      409,
    );
  if (["generating", "needs_review"].includes(story.audio_status || "")) {
    throw new NarrationError(
      "An earlier attempt is running or needs checking. Check its request and storage before retrying to avoid another charge.",
      409,
    );
  }
  const text = story.narrative_text?.trim() || "";
  if (!text) throw new NarrationError("This story has no text to narrate.");
  const limit = config.model === "eleven_v3" ? 5000 : 10000;
  if (text.length > limit)
    throw new NarrationError(
      `This model accepts up to ${limit} characters per story.`,
    );
  if (!config.apiKey || /\s/.test(config.apiKey))
    throw new NarrationError("Check ELEVENLABS_API_KEY on the server.", 503);
  if (!(await store.claim(story, voiceId, config.consentColumn)))
    throw new NarrationError(
      "This story changed or another generation is already running. Refresh the page.",
      409,
    );

  // Once the request starts, network errors may still mean ElevenLabs consumed credits.
  // Never automatically retry ambiguous failures.
  let failureStatus: "failed" | "needs_review" = "needs_review";
  let uploaded = false;
  let attached = false;
  // Build a repeatable filename from the text, narrator and model, without using the text as a filename.
  const fingerprint = createHash("sha256")
    .update(JSON.stringify([text, voiceId, config.model]))
    .digest("hex")
    .slice(0, 24);
  const path = `narration/${id}/${fingerprint}.mp3`;
  try {
    // Send the story text to ElevenLabs and ask for MP3 audio. Stop waiting after 45 seconds.
    const response = await request(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": config.apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({ text, model_id: config.model }),
        signal: AbortSignal.timeout(45000),
        cache: "no-store",
      },
    );
    if (!response.ok) {
      failureStatus =
        response.status >= 400 && response.status < 500
          ? "failed"
          : "needs_review";
      const messages: Record<number, string> = {
        401: "ElevenLabs rejected the API key. Check the server environment variable.",
        402: "ElevenLabs requires a different plan or more credits for this request.",
        403: "This key or voice does not have permission for this generation.",
        429: "ElevenLabs is busy or the usage limit has been reached. Try again later.",
      };
      // Do not forward provider bodies: they may contain submitted text or account details.
      throw new NarrationError(
        messages[response.status] ||
          `ElevenLabs could not generate audio (HTTP ${response.status}).`,
        502,
      );
    }
    if (!response.headers.get("content-type")?.includes("audio/"))
      throw new NarrationError(
        "ElevenLabs returned an unexpected audio response.",
        502,
      );
    const audio = new Uint8Array(await response.arrayBuffer());
    if (audio.byteLength === 0)
      throw new NarrationError("ElevenLabs returned an empty recording.", 502);
    // Recheck after generation, before uploading to a publicly readable bucket.
    const latest = await store.get(id);
    if (
      latest.status !== "approved" ||
      !hasNarrationConsent(latest, config.consentColumn) ||
      latest.narrative_text !== story.narrative_text ||
      latest.audio ||
      latest.voice_id !== voiceId
    ) {
      throw new NarrationError(
        "The story or permission changed during generation. Audio was not published.",
        409,
      );
    }
    // Save the recording first, then connect its URL to the story and mark it ready.
    const url = await store.upload(path, audio);
    uploaded = true;
    if (!(await store.finish(story, voiceId, config.consentColumn, url))) {
      throw new NarrationError(
        "The story changed before audio could be linked. Check the story before another attempt.",
        409,
      );
    }
    attached = true;
    return { status: "ready", audio: url, existing: false };
  } catch (error) {
    if (uploaded && !attached) {
      // A database network error could hide a successful update; retain audio if it is linked.
      try {
        const latest = await store.get(id);
        if (latest.audio && latest.audio.includes(path))
          return { status: "ready", audio: latest.audio, existing: true };
        await store.remove(path);
      } catch {
        /* Leave for manual recovery rather than risking deletion of linked audio. */
      }
    }
    // Save the failure state. An uncertain result needs checking before spending credits again.
    await store.mark(id, failureStatus).catch(() => undefined);
    if (error instanceof NarrationError) throw error;
    throw new NarrationError(
      "Generation could not finish. Check the request and storage before retrying; credits may have been used.",
      502,
    );
  }
}
