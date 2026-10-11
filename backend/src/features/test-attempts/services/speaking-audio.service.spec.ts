import { SpeakingAiConfig } from './speaking-ai-config.service';
import { SpeakingAudioService } from './speaking-audio.service';

describe('Speaking audio source safety', () => {
  const service = new SpeakingAudioService({ cloud: 'demo', folder: 'aptimate/test-covers' } as SpeakingAiConfig);
  const original = global.fetch;
  afterEach(() => { global.fetch = original; });
  it.each(['http://res.cloudinary.com/demo/video/upload/v1/aptimate/test-covers/candidate-recordings/test.webm',
    'https://example.com/demo/video/upload/v1/aptimate/test-covers/candidate-recordings/test.webm',
    'https://res.cloudinary.com/other/video/upload/v1/aptimate/test-covers/candidate-recordings/test.webm',
    'https://res.cloudinary.com/demo/video/upload/v1/admin/test.webm',
    'https://res.cloudinary.com/demo/video/upload/v1/aptimate/test-covers/candidate-recordings/test.webm?redirect=http://localhost',
    'file:///C:/secret', 'not-a-url'])( 'rejects untrusted source %s', async url => {
      const request = jest.fn(); global.fetch = request;
      await expect(service.download(url)).rejects.toThrow('AUDIO_SOURCE_NOT_ALLOWED');
      expect(request).not.toHaveBeenCalled();
    });
  it('downloads only the allowed cloud/folder without following redirects', async () => {
    const request = jest.fn(async () => new Response(new Uint8Array([1,2,3])));
    global.fetch = request as unknown as typeof fetch;
    await expect(service.download('https://res.cloudinary.com/demo/video/upload/v1/aptimate/test-covers/candidate-recordings/test.webm'))
      .resolves.toEqual(Buffer.from([1,2,3]));
    expect(request).toHaveBeenCalledWith(expect.any(URL), expect.objectContaining({ redirect: 'error' }));
  });
});
