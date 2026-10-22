import { ReportJob, reportPromptInput, validateWeeklyContent, WeeklyContent } from './report.contract';
import { buildLearnerSnapshot } from '../policies/learner-snapshot';
import { reportSnapshot } from './report.contract';

const snapshot = buildLearnerSnapshot('private-user', null, { kind: 'GOAL' }, new Date('2026-10-01T00:00:00Z'), {
  attempts: [], scoredAttempts: [], reviewDates: [], learningCount: 20, mistakes: [], planItems: [],
}, 'Asia/Bangkok');
export const fixtureJob = (): ReportJob => ({
  snapshotVersion: 1, learner: reportSnapshot({ ...snapshot, inputHash: 'fixture' }, 0), promptVersion: 'test',
  plan: { weekIndex: 1, startsOn: '2026-10-01', endsOn: '2026-10-03', days: 3, requiredPace: 2, remainingTests: 6 },
  candidates: [
    { candidateId: 'c1', activityType: 'TEST', testId: 'private-test', component: 'READING', purpose: 'PRACTICE', title: 'private-title' },
    { candidateId: 'c4', activityType: 'TEST', testId: 'private-test-2', component: 'READING', purpose: 'PRACTICE', title: 'private-title' },
    { candidateId: 'c2', activityType: 'VOCAB_REVIEW', targetCount: 20 },
    { candidateId: 'c3', activityType: 'MISTAKE_REVIEW', sourceAttemptId: 'private-attempt', component: 'READING', questionKeys: ['p1:q1', 'p1:q2', 'p1:q3'] },
  ],
});
const good = (): WeeklyContent => ({
  report: { headline: 'Tiếp tục luyện tập', narrative: 'Hãy duy trì thói quen học tập.', wins: [], nextSteps: ['Ôn lại các phần còn yếu.'] },
  plan: { items: [1, 2, 3].flatMap(dayIndex => ['c1','c4'].map(candidateId => ({ dayIndex, candidateId, targetCount: 1, reason: 'Duy trì tiến độ học tập.' }))) },
});

describe('weekly AI contract', () => {
  it('accepts a combined report and bounded plan', () => {
    expect(validateWeeklyContent(good(), 'WEEKLY', fixtureJob())).toEqual(good());
  });
  it('accepts PLAN_START without report and requires cumulative text for MIDTERM', () => {
    expect(validateWeeklyContent({ plan: good().plan }, 'PLAN_START', fixtureJob())).toBeDefined();
    expect(() => validateWeeklyContent(good(), 'MIDTERM', fixtureJob())).toThrow();
    const content = good();
    content.report!.progressSoFar = 'Tiếp tục học để có thêm dữ liệu.';
    expect(validateWeeklyContent(content, 'MIDTERM', fixtureJob())).toBeDefined();
  });
  it.each([
    (c: WeeklyContent) => { c.plan.items[0].candidateId = 'invented'; },
    (c: WeeklyContent) => { c.plan.items[0].dayIndex = 4; },
    (c: WeeklyContent) => { c.plan.items.push(...Array.from({ length: 3 }, () => ({ ...c.plan.items[0] }))); },
    (c: WeeklyContent) => { c.plan.items[0].targetCount = 2; },
    (c: WeeklyContent) => { c.report!.narrative = 'Bạn đã hoàn thành 999 bài.'; },
    (c: WeeklyContent) => { c.report!.narrative = 'từ '.repeat(121); },
    (c: WeeklyContent) => { c.plan.items[0].reason = 'từ '.repeat(21); },
    (c: WeeklyContent) => { c.plan.items.push({ dayIndex: 1, candidateId: 'c2', targetCount: 10, reason: 'Ôn từ vựng.' }); },
    (c: WeeklyContent) => { c.plan.items.push({ dayIndex: 1, candidateId: 'c3', targetCount: 2, reason: 'Ôn câu sai.' }); },
  ])('rejects invalid output %#', change => {
    const content = good(); change(content);
    expect(() => validateWeeklyContent(content, 'WEEKLY', fixtureJob())).toThrow();
  });
  it('sends short candidate references, never titles, database IDs or question keys', () => {
    const prompt = JSON.stringify(reportPromptInput('MIDTERM', fixtureJob()));
    expect(prompt).not.toMatch(/private|testId|sourceAttemptId|questionKeys|p1:q1/);
    expect(prompt).toContain('"isMidterm":true');
  });
  it('requires practice after reaching the test target', () => {
    const job = fixtureJob(); job.plan.remainingTests = 0; job.plan.requiredPace = 0;
    expect(() => validateWeeklyContent({ plan: { items: [] } }, 'PLAN_START', job)).toThrow();
  });
});

it('rejects repeating a test before exhausting available tests',()=>{
 const value=good();value.plan.items[1].candidateId='c1';expect(()=>validateWeeklyContent(value,'WEEKLY',fixtureJob())).toThrow();
});
it('accepts a feasible pace when the catalog has only one test',()=>{
 const job=fixtureJob();job.candidates=job.candidates.filter(c=>c.candidateId!=='c4');
 const value=good();value.plan.items=value.plan.items.filter(c=>c.candidateId==='c1');expect(()=>validateWeeklyContent(value,'WEEKLY',job)).not.toThrow();
});

it('allows a nearly finished goal without forcing every skill', () => {
  const job = fixtureJob();
  job.plan.remainingTests = 1;
  job.candidates.push({ candidateId: 'c5', activityType: 'TEST', testId: 'listening-test', component: 'LISTENING', purpose: 'PRACTICE', title: '' });
  const value = good(); value.plan.items = value.plan.items.slice(0, 1);
  expect(() => validateWeeklyContent(value, 'WEEKLY', job)).not.toThrow();
});

it('preserves each placement on its own first day, without reserving regular repetition slots',()=>{
 const job=fixtureJob();job.plan.requiredPace=1;job.plan.remainingTests=3;
 job.candidates=['GRAMMAR_VOCAB','READING','LISTENING'].map((component,i)=>({candidateId:'p'+i,activityType:'TEST',testId:'placement'+i,component:component as 'READING',purpose:'PLACEMENT',title:''}));
 const value:WeeklyContent={plan:{items:job.candidates.map((c,i)=>({candidateId:c.candidateId,dayIndex:i+1,targetCount:1,reason:'PLACEMENT'}))}};
 expect(()=>validateWeeklyContent(value,'PLAN_START',job)).not.toThrow();
 for(const change of [(v:WeeklyContent)=>{v.plan.items.pop()},(v:WeeklyContent)=>{v.plan.items[1].dayIndex=1},(v:WeeklyContent)=>{v.plan.items[0].reason='Practice'},(v:WeeklyContent)=>{v.plan.items.push({...v.plan.items[0],dayIndex:3})}]){
 const bad=structuredClone(value);change(bad);expect(()=>validateWeeklyContent(bad,'PLAN_START',job)).toThrow();
 }
 expect(JSON.stringify(reportPromptInput('PLAN_START',job))).toContain('PLACEMENT');
});
