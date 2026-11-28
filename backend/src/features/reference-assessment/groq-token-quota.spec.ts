import { groqWait, durationMs, quotaHeaders, retryDelay } from './groq-token-quota';
describe('Token reservations shared by Groq workers', () => {
  const now=1700000000000;
  const row=(model:string,tokens:number,age=0)=>({model,created_at:new Date(now-age),usage:{reservationTokens:tokens}});
  it('reserves output too and waits until tokens expire',()=>{
    expect(groqWait([row('a',5000,30000)],'a',4000,now,8000)).toBe(35000);
    expect(groqWait([row('a',5000,65000)],'a',4000,now,8000)).toBe(0);
  });
  it('does not block another model with a model-specific reservation',()=>{
    expect(groqWait([row('a',8000)],'b',4000,now,8000)).toBe(0);
  });
  it('honors provider remaining tokens and reset even when the local budget is empty',()=>{
    const quota=quotaHeaders(new Headers({'x-ratelimit-remaining-tokens':'100','x-ratelimit-reset-tokens':'1m2.5s'}),now);
    expect(groqWait([{...row('a',1,70000),usage:{quota}}],'a',2000,now,8000)).toBe(63500);
    expect(durationMs('250ms')).toBe(250);
    expect(retryDelay(new Headers({'retry-after':'90'}),'',now)).toBe(90000);
  });
  it('gives an isolated attempt to an estimated oversized request instead of an infinite wait',()=>{
    expect(groqWait([],'a',9000,now,8000)).toBe(0);
  });
});
