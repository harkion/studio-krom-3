import test from 'node:test';
import assert from 'node:assert/strict';
import { generateNarration, narrationConfig, isNarrationAdmin } from '../lib/narration.ts';

// These tests use a fake key, database and audio response: no network or credits.
const config = narrationConfig({ ELEVENLABS_API_KEY: 'test-only' });
const voice = config.voices[0].id;
// Create a fresh pretend story and counters for each test so failures stay isolated.
function fixture(overrides = {}) {
  let row = { id: 1, status: 'approved', narrative_text: 'Fictional test.', ai_narration_consent: true, audio: null, audio_status: null, ...overrides };
  const calls = { requests: 0, uploads: 0, removed: 0 };
  const store = {
    async get() { return { ...row }; },
    async claim(snapshot, voiceId) {
      if (row.audio_status !== snapshot.audio_status || row.audio) return false;
      row = { ...row, audio_status: 'generating', voice_id: voiceId };
      return true;
    },
    async upload(path) { calls.uploads++; return `https://storage.example/${path}`; },
    async finish(snapshot, voiceId, column, audio) { row = { ...row, audio, audio_status: 'ready' }; return true; },
    async mark(id, status) { row.audio_status = status; },
    async remove() { calls.removed++; },
  };
  const request = async (_url, init) => {
    calls.requests++;
    assert.equal(JSON.parse(init.body).model_id, 'eleven_v4');
    return new Response(new Uint8Array([73, 68, 51, 1]), { headers: { 'Content-Type': 'audio/mpeg' } });
  };
  return { store, request, calls, row: () => row };
}
// Check configuration, access, consent, duplicate requests and recovery behaviour.
test('defaults to v4 and allows explicit v3', () => {
  assert.equal(config.model, 'eleven_v4');
  assert.equal(narrationConfig({ ELEVENLABS_MODEL_ID: 'eleven_v3' }).model, 'eleven_v3');
});
test('only trusted admin metadata or explicit user ID grants access', () => {
  assert.equal(isNarrationAdmin({ id: 'one', app_metadata: { role: 'user' } }, ''), false);
  assert.equal(isNarrationAdmin({ id: 'one', app_metadata: { role: 'admin' } }, ''), true);
  assert.equal(isNarrationAdmin({ id: 'one' }, 'two, one'), true);
});
for (const consent of [undefined, false, 'true', 'false', 1]) {
  test(`does not spend credits without explicit boolean consent (${consent})`, async () => {
    const f = fixture({ ai_narration_consent: consent });
    await assert.rejects(generateNarration('1', voice, config, f.store, f.request), /permission/);
    assert.equal(f.calls.requests, 0);
  });
}
test('rejects unapproved stories and unlisted voices', async () => {
  const f = fixture({ status: 'pending' });
  await assert.rejects(generateNarration('1', voice, config, f.store, f.request), /Approve/);
  await assert.rejects(generateNarration('1', 'arbitrary', config, f.store, f.request), /Choose/);
  assert.equal(f.calls.requests, 0);
});
test('existing audio is kept without another charge', async () => {
  const f = fixture({ audio: 'https://example/audio.mp3' });
  assert.equal((await generateNarration('1', voice, config, f.store, f.request)).existing, true);
  assert.equal(f.calls.requests, 0);
});
test('two simultaneous requests generate only one recording', async () => {
  const f = fixture();
  const results = await Promise.allSettled([generateNarration('1', voice, config, f.store, f.request), generateNarration('1', voice, config, f.store, f.request)]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(f.calls.requests, 1);
  assert.equal(f.row().audio_status, 'ready');
});
test('explicit provider rejection is retryable', async () => {
  const f = fixture();
  await assert.rejects(generateNarration('1', voice, config, f.store, async () => new Response('', { status: 402 })), /plan or more credits/);
  assert.equal(f.row().audio_status, 'failed');
});
test('ambiguous network failure blocks repeat spending', async () => {
  const f = fixture();
  await assert.rejects(generateNarration('1', voice, config, f.store, async () => { throw new Error('network'); }), /credits may/);
  assert.equal(f.row().audio_status, 'needs_review');
  await assert.rejects(generateNarration('1', voice, config, f.store, f.request), /earlier attempt/);
  assert.equal(f.calls.requests, 0);
});
test('revoked consent during generation prevents upload', async () => {
  const f = fixture();
  const request = async (...args) => { f.row().ai_narration_consent = false; return f.request(...args); };
  await assert.rejects(generateNarration('1', voice, config, f.store, request), /permission changed/);
  assert.equal(f.calls.uploads, 0);
});
test('storage failure is not retried as a new generation automatically', async () => {
  const f = fixture();
  f.store.upload = async () => { throw new Error('storage'); };
  await assert.rejects(generateNarration('1', voice, config, f.store, f.request));
  assert.equal(f.row().audio_status, 'needs_review');
});
test('concurrent edit before attachment removes the unlinked upload', async () => {
  const f = fixture();
  f.store.finish = async () => false;
  await assert.rejects(generateNarration('1', voice, config, f.store, f.request), /story changed/);
  assert.equal(f.calls.removed, 1);
});
