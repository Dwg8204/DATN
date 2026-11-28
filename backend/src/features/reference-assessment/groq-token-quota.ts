/** Estimates are scheduling hints, not the provider tokenizer. Never truncate answers. */
export function estimateGroqTokens(system: string, input: string, schema: object, output: number): number {
  return Math.ceil(Buffer.byteLength(system + input + JSON.stringify(schema), 'utf8') / 3) + output + 128;
}
export function durationMs(value: string | null): number {
  if (!value) return 0;
  if (/^\d+(\.\d+)?$/.test(value)) return Number(value) * 1000;
  const matches = [...value.matchAll(/(\d+(?:\.\d+)?)(ms|s|m|h|d)/g)];
  return matches.reduce((sum, m) => sum + Number(m[1]) * ({ms:1,s:1000,m:60000,h:3600000,d:86400000}[m[2]] ?? 0), 0);
}
export function quotaHeaders(headers: Headers, now = Date.now()) {
  const number = (key: string) => { const v = headers.get(key); return v !== null && Number.isFinite(Number(v)) ? Number(v) : undefined; };
  return { observedAt: now, remainingTokens: number('x-ratelimit-remaining-tokens'),
    limitTokens: number('x-ratelimit-limit-tokens'), remainingRequests: number('x-ratelimit-remaining-requests'),
    tokenResetAt: now + durationMs(headers.get('x-ratelimit-reset-tokens')),
    requestResetAt: now + durationMs(headers.get('x-ratelimit-reset-requests')) };
}
export function groqWait(rows: Array<{model:string;created_at:Date|string;usage?:any}>, model: string, estimated: number, now: number, capacity: number): number {
  const own = rows.filter(r => r.model === model);
  let until = now;
  for (const row of own) {
    const retryAt = Date.parse(row.usage?.diagnostic?.retryAt ?? '');
    if (Number.isFinite(retryAt)) until = Math.max(until, retryAt);
  }
  const recent = own.filter(r => now - new Date(r.created_at).getTime() < 65000);
  if (recent.length >= 30) until = Math.max(until, ...recent.map(r => new Date(r.created_at).getTime() + 65000));
  const used = recent.reduce((sum, r) => sum + Number(r.usage?.reservationTokens ?? r.usage?.total_tokens ?? capacity), 0);
  // A request estimated above the limit gets one isolated attempt; estimates must not reject valid work.
  if (recent.length && used + estimated > capacity)
    until = Math.max(until, ...recent.map(r => new Date(r.created_at).getTime() + 65000));
  const latest = own.filter(r => r.usage?.quota).sort((a,b) => b.usage.quota.observedAt-a.usage.quota.observedAt)[0]?.usage.quota;
  if (latest?.remainingTokens !== undefined && latest.remainingTokens < estimated && latest.tokenResetAt > now)
    until = Math.max(until, latest.tokenResetAt + 1000);
  if (latest?.remainingRequests === 0 && latest.requestResetAt > now)
    until = Math.max(until, latest.requestResetAt + 1000);
  return Math.max(0, until - now);
}
export function retryDelay(headers: Headers, message: string, now=Date.now()): number {
  const raw=headers.get('retry-after');
  const delay=raw ? (/^\d+(\.\d+)?$/.test(raw) ? Number(raw)*1000 : Date.parse(raw)-now) : 0;
  const q=quotaHeaders(headers,now);
  const daily=/per day|tokens per day|requests per day|\bTPD\b|\bRPD\b/i.test(message);
  return Math.min(86400000,Math.max(1000,Number.isFinite(delay)&&delay>0?delay:daily?3600000:65000,
    q.remainingTokens===0?q.tokenResetAt-now:0,q.remainingRequests===0?q.requestResetAt-now:0));
}
