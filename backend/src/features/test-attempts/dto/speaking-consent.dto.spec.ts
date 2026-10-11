import { validate } from 'class-validator';
import { SpeakingConsentDto } from './speaking-consent.dto';
describe('Speaking explicit adult consent', () => {
  it('requires both true confirmations and exact policy', async () => {
    const dto = Object.assign(new SpeakingConsentDto(), { confirmedAdult: true, accepted: true, policyVersion: 'speaking-ai-v1' });
    expect(await validate(dto)).toHaveLength(0);
    dto.confirmedAdult = false; expect((await validate(dto)).length).toBeGreaterThan(0);
    dto.confirmedAdult = true; dto.accepted = false; expect((await validate(dto)).length).toBeGreaterThan(0);
    dto.accepted = true; dto.policyVersion = 'other'; expect((await validate(dto)).length).toBeGreaterThan(0);
  });
});
