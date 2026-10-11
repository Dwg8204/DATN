import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { ConfigService } from '@nestjs/config';
import { SpeakingAiConfig } from './speaking-ai-config.service';
import { SpeakingAudioService } from './speaking-audio.service';

const execute = promisify(execFile);
describe('Speaking audio native smoke tests (offline, no paid API)', () => {
  const config = new SpeakingAiConfig(new ConfigService());
  const service = new SpeakingAudioService(config);
  afterEach(() => jest.restoreAllMocks());
  it('decodes browser-style WEBM lacking duration metadata into an MP3', async () => {
    const generated = await execute(config.ffmpeg, ['-nostdin','-v','error','-f','lavfi','-i','sine=frequency=440:duration=1',
      '-c:a','libopus','-f','webm','pipe:1'], { encoding: 'buffer', windowsHide: true, timeout: 15_000 });
    jest.spyOn(service, 'download').mockResolvedValue(Buffer.from(generated.stdout));
    const normalized = await service.normalize('offline-fixture');
    expect(normalized.length).toBeGreaterThan(1000);
    expect(normalized.subarray(0,3).toString()).toBe('ID3');
  }, 30_000);
  it('rejects a recording exceeding the configured duration limit', async () => {
    const generated = await execute(config.ffmpeg, ['-nostdin','-v','error','-f','lavfi','-i','sine=frequency=440:duration=182',
      '-c:a','libopus','-f','webm','pipe:1'], { encoding: 'buffer', windowsHide: true, timeout: 15_000, maxBuffer: 10 * 1024 * 1024 });
    jest.spyOn(service, 'download').mockResolvedValue(Buffer.from(generated.stdout));
    await expect(service.normalize('offline-fixture')).rejects.toThrow('AUDIO_DURATION_INVALID');
  }, 45_000);
});
