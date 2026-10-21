import 'dotenv/config';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { v2 as cloudinary } from 'cloudinary';
import { AudioManifest, buildAudioScripts } from '../src/database/seeds/expanded-listening';
import { AUDIO_MANIFEST_PATH } from '../src/database/seeds/seed-expanded-tests';

async function main() {
  const scripts = buildAudioScripts();
  const folder = resolve(__dirname, '../uploads/seed-expansion');
  mkdirSync(folder, { recursive: true });
  const manifest: AudioManifest = existsSync(AUDIO_MANIFEST_PATH) ? JSON.parse(readFileSync(AUDIO_MANIFEST_PATH, 'utf8')) : {};
  const pending = scripts.filter(script => manifest[script.key]?.sha256 !== script.sha256);
  const inputPath = resolve(folder, 'scripts.json');
  const jobs = pending.map(script => ({ ...script, path: resolve(folder, `${script.key}-${script.sha256.slice(0, 12)}.wav`) }));
  writeFileSync(inputPath, JSON.stringify(jobs, null, 2));
  if (!process.argv.includes('--upload')) {
    console.info(`Prepared ${scripts.length} scripts; ${pending.length} audio files need generation. Use --upload to synthesize and upload.`);
    return;
  }
  if (pending.length && process.platform !== 'win32') throw new Error('Audio generation requires Windows David and Zira voices. Existing manifests work on any platform.');
  for (const name of ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']) {
    if (!process.env[name]) throw new Error(`Missing ${name}`);
  }
  cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET, secure: true });
  if (jobs.length) {
    const synthesis = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-File', resolve(__dirname, 'synthesize-expanded-audio.ps1'), '-InputJson', inputPath], { stdio: 'inherit' });
    if (synthesis.status !== 0) throw new Error('Windows speech synthesis failed.');
  }
  const ffmpeg = require('ffmpeg-static') as string;
  const ffprobe = (require('ffprobe-static') as { path: string }).path;
  for (const job of jobs) {
    const mp3 = job.path.replace(/\.wav$/, '.mp3');
    const encoded = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-i', job.path, '-codec:a', 'libmp3lame', '-b:a', '96k', mp3], { encoding: 'utf8' });
    if (encoded.status !== 0) throw new Error(`Encoding failed: ${job.key}`);
    const probe = spawnSync(ffprobe, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'json', mp3], { encoding: 'utf8' });
    if (probe.status !== 0) throw new Error(`Audio probe failed: ${job.key}`);
    const duration = Number(JSON.parse(probe.stdout).format.duration);
    if (!Number.isFinite(duration) || duration < 2) throw new Error(`Invalid audio duration: ${job.key}`);
    const result = await cloudinary.uploader.upload(mp3, { resource_type: 'video', public_id: `aptimate/seed-expansion-v1/${job.key}-${job.sha256.slice(0, 16)}`, overwrite: false });
    manifest[job.key] = { url: result.secure_url, sha256: job.sha256, duration };
    // Checkpoint after every asset; retries reuse deterministic Cloudinary IDs.
    writeFileSync(`${AUDIO_MANIFEST_PATH}.tmp`, JSON.stringify(manifest, null, 2) + '\n');
    renameSync(`${AUDIO_MANIFEST_PATH}.tmp`, AUDIO_MANIFEST_PATH);
    console.info(`Uploaded ${job.key} (${duration.toFixed(1)}s)`);
  }
  console.info(`Ready: ${Object.keys(manifest).length} audio assets.`);
}
main().catch(error => {
  // Never print SDK request objects, which can contain credentials.
  console.error(error instanceof Error ? error.message : 'Audio preparation failed.');
  process.exitCode = 1;
});
