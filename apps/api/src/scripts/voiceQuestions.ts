/**
 * `pnpm voice-questions` from the repo root.
 *
 * Records the interview questions once with ElevenLabs and saves them as
 * MP3s in the user app (apps/user-web/public/voice/questions/), to commit
 * with the code. After that, nobody needs an ElevenLabs key to hear them,
 * and nothing about any child is ever sent to ElevenLabs: the recorded
 * questions say "your child", and the screen shows the name.
 *
 * - No voice chosen yet? It lists your ElevenLabs voices; put one's id in
 *   .env as ELEVENLABS_VOICE_ID (or pass --voice <id>).
 * - Only questions whose wording or voice changed are recorded again.
 *   --all re-records everything.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { PROFILE_QUESTIONS, allEventQuestions } from "@socialstory/core";
import { config } from "../config.js";

const { values } = parseArgs({ options: { voice: { type: "string" }, all: { type: "boolean", default: false } } });
const key = config.ELEVENLABS_API_KEY;
if (!key) {
  console.error("\nAdd ELEVENLABS_API_KEY to your .env first.\n");
  process.exit(1);
}

const API = "https://api.elevenlabs.io/v1";
// The steadiest model, with high stability: the same calm read every time.
const MODEL = "eleven_multilingual_v2";
const SETTINGS = { stability: 0.75, similarity_boost: 0.75, style: 0, use_speaker_boost: true };

const voice = values.voice ?? config.ELEVENLABS_VOICE_ID;
if (!voice) {
  const res = await fetch(`${API}/voices`, { headers: { "xi-api-key": key } });
  if (!res.ok) {
    console.error(`\nElevenLabs said ${res.status}: ${await res.text()}\n`);
    process.exit(1);
  }
  const { voices } = (await res.json()) as { voices: Array<{ voice_id: string; name: string; labels?: Record<string, string> }> };
  console.log("\nYour ElevenLabs voices (pick a calm, warm one):\n");
  for (const v of voices) {
    const labels = Object.values(v.labels ?? {}).join(", ");
    console.log(`  ${v.voice_id}  ${v.name}${labels ? `  (${labels})` : ""}`);
  }
  console.log("\nThen add it to .env:  ELEVENLABS_VOICE_ID=<the id>   and run  pnpm voice-questions  again.\n");
  process.exit(0);
}

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, "../../../user-web/public/voice/questions");
mkdirSync(outDir, { recursive: true });
const manifestFile = resolve(outDir, "manifest.json");
type Manifest = { voice: string; model: string; clips: Record<string, string> };
const manifest: Manifest = existsSync(manifestFile)
  ? (JSON.parse(readFileSync(manifestFile, "utf8")) as Manifest)
  : { voice, model: MODEL, clips: {} };
const sameVoice = manifest.voice === voice && manifest.model === MODEL;

let made = 0;
let chars = 0;
// Profile questions plus every event question (general ones and each template's own).
for (const q of [...PROFILE_QUESTIONS, ...allEventQuestions()]) {
  const file = resolve(outDir, `${q.id}.mp3`);
  if (!values.all && sameVoice && manifest.clips[q.id] === q.spoken && existsSync(file)) continue;
  process.stdout.write(`  Recording ${q.id}… `);
  const res = await fetch(`${API}/text-to-speech/${encodeURIComponent(voice)}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": key, "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({ text: q.spoken, model_id: MODEL, voice_settings: SETTINGS }),
  });
  if (!res.ok) {
    console.error(`\n\nElevenLabs said ${res.status}: ${await res.text()}\n`);
    process.exit(1);
  }
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  manifest.clips[q.id] = q.spoken;
  made++;
  chars += q.spoken.length;
  console.log("done");
}
writeFileSync(manifestFile, JSON.stringify({ ...manifest, voice, model: MODEL }, null, 2));

console.log(
  made
    ? `\n  Recorded ${made} question(s), ${chars} characters, into apps/user-web/public/voice/questions/.\n  Commit them in GitHub Desktop so they're part of the app.\n`
    : "\n  All questions are already recorded with this voice. (--all re-records them.)\n",
);
