import { Injectable } from '@nestjs/common';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SpeakingAiConfig } from './speaking-ai-config.service';

const execute = promisify(execFile);
@Injectable()
export class SpeakingAudioService {
  constructor(private readonly config: SpeakingAiConfig) {}

  async download(url: string, image = false): Promise<Buffer> {
    const max = image ? 2 * 1024 * 1024 : 10 * 1024 * 1024;
    // Published Speaking prompts may contain inline JPEG/PNG/WebP images. Accept these
    // only on the image path; candidate audio must always remain a verified Cloudinary URL.
    if (image && /^data:image\/(?:jpeg|png|webp);base64,/i.test(url)) {
      const comma = url.indexOf(',');
      const encoded = url.slice(comma + 1);
      if (!encoded || encoded.length > Math.ceil(max / 3) * 4 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) {
        throw new Error('AUDIO_TOO_LARGE');
      }
      const bytes = Buffer.from(encoded, 'base64');
      if (!bytes.length || bytes.length > max || bytes.toString('base64') !== encoded) throw new Error('AUDIO_TOO_LARGE');
      return bytes;
    }
    let parsed: URL;
    try { parsed = new URL(url); } catch { throw new Error('AUDIO_SOURCE_NOT_ALLOWED'); }
    const prefix = `/${this.config.cloud}/${image ? 'image' : 'video'}/upload/`;
    if (parsed.protocol !== 'https:' || parsed.hostname !== 'res.cloudinary.com' || parsed.port || parsed.username || parsed.password ||
      !parsed.pathname.startsWith(prefix) || !image && !parsed.pathname.includes(`/${this.config.folder}/candidate-recordings/`) ||
      parsed.search || parsed.hash) throw new Error('AUDIO_SOURCE_NOT_ALLOWED');
    const response = await fetch(parsed, { redirect: 'error', signal: AbortSignal.timeout(30_000) });
    if (!response.ok || !response.body) throw new Error('AUDIO_DOWNLOAD_FAILED');
    const chunks: Buffer[] = [];
    let bytes = 0;
    const reader = response.body.getReader();
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        bytes += chunk.value.length;
        if (bytes > max) throw new Error('AUDIO_TOO_LARGE');
        chunks.push(Buffer.from(chunk.value));
      }
    } finally { await reader.cancel(); }
    return Buffer.concat(chunks);
  }

  async normalize(url: string): Promise<Buffer> {
    const bytes = await this.download(url);
    const validHeader = bytes.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3])) ||
      ['OggS','RIFF'].includes(bytes.subarray(0,4).toString()) || bytes.subarray(0,3).toString() === 'ID3' ||
      bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0 || bytes.subarray(4,8).toString() === 'ftyp';
    if (!validHeader) throw new Error('AUDIO_FORMAT_INVALID');
    const directory = await mkdtemp(join(tmpdir(), 'aptimate-speaking-'));
    const input = join(directory, 'input.audio');
    const output = join(directory, 'output.mp3');
    try {
      await writeFile(input, bytes, { flag: 'wx' });
      await execute(this.config.ffmpeg, ['-nostdin','-v','error','-protocol_whitelist','file,pipe','-i',input,
        '-t','181','-vn','-ac','1','-ar','16000','-codec:a','libmp3lame','-b:a','64k',output],
        { timeout: 30_000, maxBuffer: 32_768, windowsHide: true });
      // MediaRecorder WEBM may lack source duration metadata; measure the decoded MP3 instead.
      const probe = await execute(this.config.ffprobe, ['-v','error','-protocol_whitelist','file,pipe',
        '-show_entries','format=duration','-of','json',output], { timeout: 15_000, maxBuffer: 32_768, windowsHide: true });
      const duration = Number(JSON.parse(probe.stdout).format?.duration);
      if (!Number.isFinite(duration) || duration <= 0 || duration > 180.2) throw new Error('AUDIO_DURATION_INVALID');
      return await readFile(output);
    } catch (error) {
      if (error instanceof Error && ['AUDIO_DURATION_INVALID'].includes(error.message)) throw error;
      throw new Error('AUDIO_PROCESSING_FAILED');
    } finally { await rm(directory, { recursive: true, force: true }); }
  }
}
