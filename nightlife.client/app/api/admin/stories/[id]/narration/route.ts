import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import {
  generateNarration,
  hasNarrationConsent,
  isNarrationAdmin,
  narrationConfig,
  NarrationError,
  type NarrationStore,
  type Story,
} from "@/lib/narration";

// This runs on the server, where the private API key can safely be used.
export const runtime = "nodejs";
export const maxDuration = 60;
type Context = { params: Promise<{ id: string }> };

// Prepare each request: validate the story ID, verify the login with Supabase,
// and check that this user is an allowed administrator. A cookie alone is not enough.
async function contextFor(request: Request, context: Context) {
  const { id } = await context.params;
  if (!/^[a-zA-Z0-9-]+$/.test(id))
    throw new NarrationError("Invalid story ID.");
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer (.+)$/)?.[1];
  if (!token) throw new NarrationError("Sign in to the admin page first.", 401);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key)
    throw new NarrationError("Supabase is not configured on the server.", 503);
  const db = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user)
    throw new NarrationError("Your login expired. Please sign in again.", 401);
  if (
    !isNarrationAdmin(data.user, process.env.NARRATION_ADMIN_USER_IDS || "")
  ) {
    throw new NarrationError(
      "Your account is not enabled for narration. Ask the project owner to add your Supabase user ID to NARRATION_ADMIN_USER_IDS.",
      403,
    );
  }
  const config = narrationConfig(process.env);
  // Translate the generation service’s storage operations into Supabase calls.
  // Use the logged-in admin’s permissions; do not bypass database security rules.
  const store: NarrationStore = {
    // Read the latest story, including its text, permission and existing audio.
    async get(storyId) {
      const { data, error } = await db
        .from("stories")
        .select("*")
        .eq("id", storyId)
        .single();
      if (error || !data)
        throw new NarrationError(
          "Could not read this story. Check its ID and database access.",
          404,
        );
      return data as Story;
    },
    // Claim only an unchanged, approved, consented story with no audio.
    // Comparing the previous status prevents two clicks from generating twice.
    async claim(story, voiceId, consentColumn) {
      let query = db
        .from("stories")
        .update({ audio_status: "generating", voice_id: voiceId })
        .eq("id", story.id)
        .eq("status", "approved")
        .eq(consentColumn, true)
        .eq("narrative_text", story.narrative_text)
        .eq("id", story.id);
      query =
        story.audio_status == null
          ? query.is("audio_status", null)
          : query.eq("audio_status", story.audio_status);
      const { data, error } = await query.select("id");
      if (error)
        throw new NarrationError(
          "Could not start narration. Check the voice_id, audio_status and permission columns and admin database policies.",
          503,
        );
      return data?.length === 1;
    },
    // Save the MP3 bytes to Storage and return the playback URL.
    async upload(path, audio) {
      const { error } = await db.storage
        .from("stories-media")
        .upload(path, audio, { contentType: "audio/mpeg", upsert: false });
      if (error)
        throw new NarrationError(
          "Audio was generated but could not be saved. Check stories-media storage permissions before retrying.",
          502,
        );
      return db.storage.from("stories-media").getPublicUrl(path).data.publicUrl;
    },
    // Attach the URL only if the story and permission still match our starting data.
      async finish(story, voiceId, consentColumn, audio) {
          const { data, error } = await db
              .from("stories")
              .update({ audio, audio_status: "ready" })
              .eq("id", story.id)
              .eq("status", "approved")
              .eq(consentColumn, true)
              .eq("narrative_text", story.narrative_text)
              .eq("voice_id", voiceId)
              .eq("audio_status", "generating")
              .select("id");
      if (error) throw new Error("Audio attachment failed");
      return data?.length === 1;
    },
    // Record a failed or uncertain attempt so the admin knows what happened.
    async mark(storyId, status) {
      const { error } = await db
        .from("stories")
        .update({ audio_status: status })
        .eq("id", storyId)
        .eq("audio_status", "generating")
        .or("audio.is.null,audio.eq.");
      if (error) throw new Error("Status update failed");
    },
    // Clean up an uploaded file that could not be linked to the story.
    async remove(path) {
      const { error } = await db.storage.from("stories-media").remove([path]);
      if (error) throw new Error("Audio cleanup failed");
    },
  };
  return { id, store, config };
}
// Return a useful message without exposing provider responses or private data.
function failure(error: unknown) {
  return Response.json(
    {
      error:
        error instanceof NarrationError
          ? error.message
          : "Narration is temporarily unavailable.",
    },
    {
      status: error instanceof NarrationError ? error.status : 500,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
// Read-only endpoint used when the admin opens or refreshes the narration panel.
export async function GET(request: Request, context: Context) {
  try {
    const { id, store, config } = await contextFor(request, context);
    const story = await store.get(id);
    return Response.json(
      {
        voices: config.voices,
        model: config.model,
        consent: hasNarrationConsent(story, config.consentColumn),
        permissionConfigured: config.consentColumn in story,
        audio: story.audio || null,
        status: story.audio_status || "pending",
        voiceId: story.voice_id || "",
        storyStatus: story.status,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}
// Generation endpoint: validate the chosen voice, run the service, refresh page data.
export async function POST(request: Request, context: Context) {
  try {
    const { id, store, config } = await contextFor(request, context);
    const body = await request.json().catch(() => null);
    if (!body || typeof body.voiceId !== "string")
      throw new NarrationError("Choose a narrator.");
    const result = await generateNarration(id, body.voiceId, config, store);
    revalidatePath("/Admin");
    revalidatePath("/street-view");
    return Response.json(result);
  } catch (error) {
    return failure(error);
  }
}
