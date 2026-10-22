import { parseRetryAfter, speakingRetryDelay } from './speaking-retry';

describe('Speaking transient retries', () => {
  it('backs off at 30 then 60 seconds with bounded jitter', () => {
    expect(speakingRetryDelay(1, 0, () => 0)).toBe(30000);
    expect(speakingRetryDelay(2, 0, () => 0.5)).toBe(62500);
  });
  it('respects provider Retry-After seconds or HTTP date', () => {
    expect(parseRetryAfter('120')).toBe(120000);
    expect(parseRetryAfter('Thu, 01 Jan 1970 00:02:00 GMT', 0)).toBe(120000);
    expect(parseRetryAfter('bad')).toBeUndefined();
    expect(speakingRetryDelay(1, 120000, () => 0)).toBe(120000);
  });
});
