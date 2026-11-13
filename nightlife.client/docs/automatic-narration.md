# Night Light automatic narration

## What is implemented

The review page offers Jessica and Roger. After publishing an approved story with recorded AI narration consent and no attached recording, it requests speech, saves an MP3 in the existing `stories-media` bucket and writes its URL to `stories.audio`. Existing approved stories have a Narration link for generating missing audio or retrying a rejected request. Existing audio is preserved. This is a request initiated by the admin page, not a database trigger or a background queue: keep the page open until it finishes. Direct changes in Supabase do not trigger generation.

The server uses fetch; an ElevenLabs SDK package is not needed. Model defaults to `eleven_v4`. No automatic emotion tagging or changes to the submitted text. The source column is `narrative_text`, matching the application. `narration_text`, if present, is not used.

## Environment settings for teammates and deployment

Set these locally in nightlife.client/.env.local and in Vercel project environment variables, then restart locally / redeploy Vercel:

```dotenv
ELEVENLABS_API_KEY=private-key
ELEVENLABS_VOICE_ID_JESSICA=cgSgspJ2msm6clMCkdW9
ELEVENLABS_VOICE_ID_ROGER=CwhRBWXzGAHq8TQ4Fs17
ELEVENLABS_MODEL_ID=eleven_v4
NARRATION_ADMIN_USER_IDS=supabase-auth-user-id
AI_NARRATION_CONSENT_COLUMN=ai_narration_consent
```

Keep all these server settings without NEXT_PUBLIC_. Copy your admin user ID from Supabase > Authentication > Users. Multiple trusted IDs may be comma-separated. A verified Supabase user whose server-controlled app_metadata.role is `admin` is also accepted. Merely having a cookie or being a registered user is not sufficient. The new endpoint verifies the login token with Supabase on each request; it does not rely on the existing middleware's cookie-presence check.

The AI_NARRATION_CONSENT_COLUMN setting identifies the story column containing explicit AI narration permission. Its default is ai_narration_consent. Only boolean true permits generation; null, absent, false and strings are denied. Written-story permission alone does not grant AI narration permission. Keep the setting aligned with the submission form’s database field. The narration feature reads permission; it does not grant it.

`voice_id` stores the selected voice ID as text. The integration uses these `audio_status` values: pending, generating, ready, failed and needs_review; an empty/null status is also supported. Database enum/check constraints must allow these values. The app never writes a true permission value itself. Existing `audio` is a URL string; `narrative_text` is the existing source text.

The `stories-media` bucket must already be public for permanent playback links. Its policies must permit your authenticated admins to upload/remove under narration/, and stories policies must let admins read/update their stories. Do not enable public writes just to make this work. No service-role key is used. Existing table/storage policies remain unchanged by this code and must be reviewed by the project owner: narration status, voice and audio fields should not be writable by anonymous visitors. The server explicitly checks story status, consent and current text before spending credits and again before publishing audio.

## How to use

1. Sign in to /Admin with an enabled administrator.
2. Review a pending story and select its narrator. Missing AI permission is shown and no audio is generated.
3. Click Accept & Publish. If permission is true, the selected voice is generated automatically. Attaching a recording bypasses AI generation.
4. For an already approved story, open its Narration link and choose Generate narration.
5. Listen to the saved preview and test the associated street bubble. Generated recordings are labelled AI-narrated in the street interaction.

Curated stories created directly via Add New Curated Story can use the Narration link after their separate permission has been recorded. They do not gain permission automatically.

## Failure / recovery

A conditional database update claims each story before generation so concurrent requests cannot both start. Existing audio is never overwritten. A clear 4xx provider rejection marks failed and permits a manual retry after fixing the cause. No automatic retries or silent model fallback spend extra credits.

A network timeout, server crash, or storage/attachment failure can occur after credits were spent. These remain generating or needs_review and block another request. Check ElevenLabs request history and Supabase Storage before resetting a state. If the generated file exists, an administrator can attach its URL to the matching unchanged story and set ready after confirming consent. If there is no usable recording and no request still running, an administrator may set failed to allow another attempt, understanding that it may cost credits again. Uploaded files that cannot be attached after a concurrent edit are removed where possible. Interrupted cleanup may require a manual Storage check.

Audio is not automatically replaced when story text is edited. Review existing recordings alongside text changes; regeneration/replacement is a separate action to avoid unwanted charges. This initial integration intentionally keeps previous recordings.

## Validation

Run `node --experimental-strip-types --test tests/narration.test.mjs` (use a current Node version supporting TypeScript stripping). Tests mock external services: explicit consent, admin checks, duplicate requests, existing audio, provider rejection, ambiguous failures, withdrawal during generation and cleanup. Run the project typecheck and lint on changed files as well.

On 8 November 2026, Fahri reported that the ElevenLabs integration worked on localhost without problems. This is the current user-reported local test result; it does not confirm the deployed Vercel flow. Earlier automated checks passed: 15 mocked narration tests, TypeScript, lint for the new UI/API files and a production build. Direct fictional-sample requests also succeeded for Jessica and Roger with v4.

## Group test after pushing

1. Each teammate running locally keeps the existing Supabase connection settings and adds the server variables above to their own nightlife.client/.env.local. Do not commit this file. Teammates sharing the same website admin login can use that account’s same UUID.
2. For the hosted site, add the same variables to the relevant Vercel environment and redeploy. This implementation does not need the ElevenLabs key stored in Supabase.
3. Sign in, select a narrator and generate a short fictional test story with permission recorded. This uses ElevenLabs credits.
4. Check that the audio preview plays, the story status becomes ready, and the associated street bubble plays the saved audio.
5. Refresh and listen again to confirm the saved recording is reused. Record any errors from the group test before treating the hosted version as verified.

