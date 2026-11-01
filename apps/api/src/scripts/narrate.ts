/**
 * `pnpm narrate [event]` from the repo root.
 *
 * Records the read-along for a written story: ElevenLabs reads each page and
 * says when each letter is spoken (which becomes when each word is spoken),
 * and Spark picks the words on each page the reader may not know and explains
 * them plainly. Then `pnpm publish-kit [event]` puts it in the player app.
 *
 * What's sent where: each page's words (which include the child's name) go to
 * ElevenLabs; the story's words go to Meta, as when the story was written.
 *
 * Only pages whose words changed since the last recording are read again, so
 * running it twice costs nothing. --redo records every page again.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import {
  Story,
  WordHelpReply,
  buildWordHelpPrompt,
  cleanWordHelp,
  wordsFromAlignment,
  type CharacterAlignment,
  type NarrationFile,
} from "@socialstory/core";
import { config } from "../config.js";
import { runStructuredTask } from "../meta.js";
import { ELEVEN_MODEL, ELEVEN_SETTINGS, loadNarration, narrationKey, recordingFor, saveNarration, storySpeech, storySpeechWithPauses } from "../narration.js";
import { imagesDir, storiesDir } from "../paths.js";
import { pickEvent, pickPlayer, printRequestError } from "./report.js";

const { values, positionals } = parseArgs({ allowPositionals: true, options: { redo: { type: "boolean", default: false } } });
const name = positionals[0] ?? "doctor";

const key = config.ELEVENLABS_API_KEY;
const voice = config.ELEVENLABS_VOICE_ID;
if (!key || !voice) {
  console.error("\nAdd ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID to your .env first (pnpm voice-questions lists your voices).\n");
  process.exit(1);
}

const event = pickEvent(name);
const player = pickPlayer(event);
const storyFile = resolve(storiesDir(), `${name}.json`);
if (!existsSync(storyFile)) {
  console.error(`\nNo story found for "${name}". Write it first:  pnpm write-story ${name}\n`);
  process.exit(1);
}
const story = Story.parse(JSON.parse(readFileSync(storyFile, "utf8")).story);
const speech = storySpeech(story, event);
const sent = storySpeechWithPauses(story, event);
const dir = imagesDir(name);
mkdirSync(dir, { recursive: true });

// A different voice starts a fresh set; old recordings stay on disk but aren't used.
const old = loadNarration(name);
const narration: NarrationFile = old && old.voice === voice && old.model === ELEVEN_MODEL ? old : { voice, model: ELEVEN_MODEL, pages: {} };

console.log(`\nRead-along for "${story.title}" (${story.pages.length} pages)\n`);
const recorded: number[] = [];
let chars = 0;
const started = Date.now();

for (const [i, text] of speech.entries()) {
  if (!values.redo && recordingFor(narration, text) && existsSync(resolve(dir, recordingFor(narration, text)!.audio))) {
    console.log(`  Page ${i + 1}: already recorded`);
    continue;
  }
  process.stdout.write(`  Page ${i + 1}: recording… `);
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}/with-timestamps?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        text: sent[i],
        model_id: ELEVEN_MODEL,
        voice_settings: ELEVEN_SETTINGS,
        // The pages around this one keep the reading even from page to page.
        previous_text: speech[i - 1],
        next_text: speech[i + 1],
      }),
    },
  );
  if (!res.ok) {
    console.error(`\n\nElevenLabs said ${res.status}: ${await res.text()}\n`);
    process.exit(1);
  }
  const body = (await res.json()) as { audio_base64: string; alignment: CharacterAlignment | null };
  if (!body.alignment) {
    console.error("\n\nElevenLabs sent the audio without word timings; can't highlight words. Try again.\n");
    process.exit(1);
  }
  const k = narrationKey(text, voice);
  const audio = `say-${k}.mp3`;
  writeFileSync(resolve(dir, audio), Buffer.from(body.audio_base64, "base64"));
  const words = wordsFromAlignment(text, body.alignment);
  narration.pages[k] = { text, audio, words, help: [] };
  saveNarration(name, narration); // after every page, so a failure keeps what's done
  recorded.push(i);
  chars += text.length;
  console.log(`done (${words.length} words, ${words[words.length - 1]?.end.toFixed(1)}s)`);
}

// Word help, in one Spark call for the pages just recorded.
if (recorded.length) {
  process.stdout.write("\n  Word help from Spark… ");
  try {
    const pageTexts = recorded.map((i) => story.pages[i]!.sentences.map((s) => s.text).join(" "));
    const { data } = await runStructuredTask("wordHelp", WordHelpReply, "word_help", buildWordHelpPrompt(pageTexts, player.readingLevel));
    let count = 0;
    for (const [n, i] of recorded.entries()) {
      const rec = recordingFor(narration, speech[i]!)!;
      const reply = data.pages.find((p) => p.page === n + 1);
      rec.help = cleanWordHelp(pageTexts[n]!, reply?.words ?? []);
      count += rec.help.length;
    }
    saveNarration(name, narration);
    console.log(`${count} word(s) explained`);
    for (const i of recorded) {
      const help = recordingFor(narration, speech[i]!)!.help;
      if (help.length) console.log(`    Page ${i + 1}: ${help.map((h) => `${h.word} (${h.means})`).join("; ")}`);
    }
  } catch (err) {
    // Word help is a bonus: the recordings are saved either way.
    console.log("skipped");
    printRequestError(err);
  }
}

const secs = ((Date.now() - started) / 1000).toFixed(1);
console.log(
  recorded.length
    ? `\n  Recorded ${recorded.length} page(s), ${chars} characters, in ${secs}s.`
    : "\n  Nothing new to record.",
);
console.log(`  Next:  pnpm publish-kit ${name}   then open the player app.\n`);
