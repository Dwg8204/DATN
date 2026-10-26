import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('..', import.meta.url));
const fixture = `
import React from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter,Routes,Route} from 'react-router-dom';
import i18n from './src/i18n/index.js';
import Summary from './src/features/writing/pages/WritingResultPage.jsx';
import Detail from './src/features/writing/pages/WritingResultDetailPage.jsx';
import Speaking from './src/features/module-speaking/pages/SpeakingAttemptResultPage.jsx';
import SpeakingDetail from './src/features/module-speaking/pages/SpeakingAttemptDetailPage.jsx';
import ModelView from './src/features/test-attempts/components/AssessmentModelView.jsx';
i18n.changeLanguage(window.speakingOptions?.language || 'vi');
const question={questionKey:'p2:q1',responseStatus:'ANSWERED',comment:'Bạn diễn đạt rõ hoạt động nhưng cần sửa thì động từ.',
criteria:[{criterion:'GRAMMAR',judgment:'NEEDS_IMPROVEMENT',comment:'Dùng thì quá khứ đơn.',evidenceQuotes:['Yesterday I go to the club.']}],
strengths:[{criterion:'TASK',comment:'Trả lời đúng chủ đề.',evidence:[]}],weaknesses:[],
corrections:[{kind:'ERROR',criterion:'GRAMMAR',original:'I go',replacement:'I went',explanation:'Hành động đã xảy ra trong quá khứ.'}],
taskIssues:[],suggestions:['Luyện động từ bất quy tắc.'],suggestedRevision:'Yesterday I went to the club.'};
const part={partNumber:2,overview:'Nội dung phù hợp với yêu cầu.',strengths:[],weaknesses:[],suggestions:['Luyện thì quá khứ.'],questions:[question]};
window.writingSummary={attemptId:'test-writing',component:'WRITING',purpose:'EXAM',scope:'FULL_SKILL',title:'Writing demo',
gradingStatus:'COMPLETED',assessmentRevision:1,score:null,maxScore:null,estimatedCefr:'B1',startedAt:'2026-10-11T10:00:00Z',submittedAt:'2026-10-11T10:30:00Z',
assessment:{enabled:true,retryable:false},result:{method:'AI',items:[{key:'p2:q1',outcome:'ASSESSED',selectedAnswer:{kind:'TEXT',text:'Yesterday I go to the club.'}}],
writing:{scope:'FULL_SKILL',feedbackLocale:'vi',cefr:{level:'B1',rationale:'Bạn truyền đạt được các ý quen thuộc.',limitations:[]},
summary:{overallComment:'Bài làm có nội dung rõ ràng.',partSummaries:[{partNumber:2,comment:'Cần chú ý thì động từ.'}],priorities:['Ôn thì quá khứ.']}}}};
window.writingDetail={attemptId:'test-writing',component:'WRITING',partNumber:2,paper:{instruction:'Describe a visit.',prompt:'What happened yesterday?',key:'p2:q1'},
items:[{key:'p2:q1',selectedAnswer:{kind:'TEXT',text:'Yesterday I go to the club.'},sampleAnswer:'Yesterday I visited a friend.'}],writing:{part,feedbackLocale:'vi',assessmentRevision:1}};
window.writingCalls=0;
if(window.writingOptions){
  const options=window.writingOptions;
  if(options.status){window.writingSummary.gradingStatus=options.status;window.writingSummary.result.method='PENDING_AI';
    window.writingSummary.result.writing=null;window.writingDetail.writing=null;}

  window.writingSummary.purpose=options.practice?'PRACTICE':'EXAM';
  window.writingSummary.result.assistance={revealedKeys:options.assisted?['p2:q1']:[]};
  if(options.part){window.writingSummary.scope='PART';window.writingSummary.partNumber=2;
    window.writingSummary.result.writing.scope='PART';window.writingSummary.result.writing.cefr.level=null;}
}
window.speakingSummary={attemptId:'speaking',component:'SPEAKING',scope:'PART',partNumber:1,gradingStatus:'PROCESSING',assessmentRevision:0,
result:{method:'PENDING_AI',items:[{key:'p1:q1',partNumber:1,selectedAnswer:null}],parts:[{partNumber:1}],speaking:null}};
window.speakingDetail={component:'SPEAKING',partNumber:1,paper:{questions:[{key:'p1:q1',text:'What do you enjoy?'}]},items:[{key:'p1:q1',selectedAnswer:null}]};
if (window.speakingOptions) {
  Object.assign(window.speakingSummary, {scope: window.speakingOptions.scope, gradingStatus:'COMPLETED', score:37.5, maxScore:50, estimatedCefr:'B2'});
  window.speakingSummary.result = {method:'AI', gradingNotice:'Legacy B2 notice', parts:[{partNumber:1}], items:[],
    speaking:{provider:'LLM',estimatedCefr:'B2',cefrReason:'Legacy B2 rationale',
      criteria:{grammarVocabulary:75,pronunciation:75,fluency:75,taskFulfillment:75}}};
}
window.referenceWriting={...window.writingSummary.result.writing,details:{parts:[{...part,overview:'Nhận xét Groq cho Part 2.',questions:[{...question,comment:'GROQ: Hãy sửa thì động từ.'}]}]}};
window.referenceSpeaking={summary:'GROQ: Nhận xét từ transcript.',inputs:[{key:'p1:q1',partNumber:1,recorded:true,transcript:'I enjoy reading.'}],responses:[{
key:'p1:q1',grammarVocabulary:60,taskFulfillment:70,comment:'GROQ: Bạn diễn đạt rõ ý.',coherenceComment:'Các ý có liên kết.',strengths:[],weaknesses:[],suggestions:[],suggestedAnswer:'I enjoy reading books.'}]};
createRoot(document.getElementById('root')).render(<MemoryRouter initialEntries={[window.writingRoute||'/writing/result?attemptId=test-writing']}>
<Routes><Route path='/writing/result' element={<ModelView><Summary/></ModelView>}/><Route path='/writing/result-detail' element={<ModelView><Detail/></ModelView>}/><Route path='/speaking/result' element={<ModelView><Speaking/></ModelView>}/><Route path='/speaking/detail-result' element={<ModelView><SpeakingDetail/></ModelView>}/></Routes></MemoryRouter>);
`;
async function bundle() {
  const result = await build({
    stdin: { contents: fixture, resolveDir: root, loader: 'jsx' },
    bundle: true,
    write: false,
    outfile: 'writing-assessment.js',
    jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"', 'import.meta.env': '{}' },
    plugins: [
      {
        name: 'isolated-writing-api',
        setup(builder) {
          builder.onResolve({ filter: /services\/api(?:\.js)?$/ }, () => ({path:'consent-api',namespace:'consent-fixture'}));
          builder.onLoad({filter:/.*/,namespace:'consent-fixture'},()=>({contents:`export default {
            get:async(url)=>({data:url.startsWith('/reference-assessments/')?{
              component:url.includes('speaking')?'SPEAKING':'WRITING',enabled:true,status:window.referenceStatus||'COMPLETED',revision:window.referenceStatus||'complete',model:'openai/gpt-oss-120b',
              ...window.referenceInfo,
              result:url.includes('speaking')?{speaking:window.referenceSpeaking}:{writing:window.referenceWriting}
            }:{enabled:true,consent:true}}),post:async()=>({data:{}})}`,loader:'js'}));
          builder.onResolve({ filter: /(?:testAttemptsApi|practiceAttemptsApi)(?:\.js)?$/ }, () => ({
            path: 'attempt-api',
            namespace: 'writing-fixture',
          }));
          builder.onLoad({ filter: /.*/, namespace: 'writing-fixture' }, () => ({
            contents: `
        const api={result:async(id)=>{window.writingCalls++;return structuredClone(id==='speaking'?window.speakingSummary:window.writingSummary)},partResult:async(id,part)=>{if(!Number.isInteger(part)||part<1||part>4)throw new Error('PART_404');return structuredClone(id==='speaking'?window.speakingDetail:window.writingDetail)}};
        export const testAttemptsApi=api; export const practiceAttemptsApi=api;`,
            loader: 'js',
          }));
        },
      },
    ],
  });
  return {
    script: result.outputFiles.find((file) => file.path.endsWith('.js')).text,
    css: result.outputFiles.find((file) => file.path.endsWith('.css')).text,
  };
}
test('Gemini and Groq share result layouts with independent progress on desktop and mobile',async()=>{
  const {script,css}=await bundle();
  const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'msedge'}:{})});
  try {
    for(const width of [1280,390]) for(const skill of ['writing','speaking']) {
      const page=await browser.newPage({viewport:{width,height:900}}),errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      await page.route('**/*',route=>route.request().url()==='http://writing-ui.test/'?route.fulfill({contentType:'text/html',body:'<html><body><div id="root"></div></body></html>'}):route.abort());
      await page.goto('http://writing-ui.test/');
      await page.evaluate(skill=>{window.writingRoute=skill==='writing'?'/writing/result?attemptId=test-writing&part=part2':'/speaking/result?attemptId=speaking&part=1';window.speakingOptions={scope:'FULL_SKILL'};},skill);
      await page.addStyleTag({content:css});await page.addScriptTag({content:script});
      await page.getByRole('progressbar').waitFor();
      await page.waitForFunction(()=>document.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')==='100');
      assert.equal(await page.getByRole('progressbar').getAttribute('aria-valuenow'),'100');
      const layout=page.locator(skill==='writing'?'main':'#root > div').first();
      const classBefore=await layout.getAttribute('class');
      const widthBefore=await layout.evaluate(element=>element.getBoundingClientRect().width);
      await page.evaluate(()=>{window.referenceStatus='PROCESSING';});
      await page.getByRole('button',{name:'Groq · Tham khảo',exact:true}).click();
      await page.locator('section[aria-label^="Groq"]') .waitFor();
      assert.ok(Number(await page.getByRole('progressbar').getAttribute('aria-valuenow'))<100);
      if(skill==='writing') {
        await page.getByRole('button',{name:'Gemini · Kết quả chính',exact:true}).click();
        await page.evaluate(()=>{window.referenceStatus='QUEUED';window.referenceInfo={errorCode:'GROQ_RATE_WAIT',nextRetryAt:new Date(Date.now()+30000).toISOString(),stage:'part_2',completedParts:[1]};});
        await page.getByRole('button',{name:'Groq · Tham khảo',exact:true}).click();
        await page.getByText('Groq · Bài viết đang được chấm bởi AI',{exact:true}).waitFor();
        assert.equal(await page.getByRole('progressbar').getAttribute('aria-valuenow'),'25');
        assert.equal(await page.getByText('Đã lưu kết quả Part: 1',{exact:true}).count(),0);
        assert.equal(await page.getByText('Bước đang chờ: Part 2',{exact:true}).count(),0);
        assert.equal(await page.getByText('GROQ_RATE_WAIT',{exact:true}).count(),0);
        const panel=page.locator('section[aria-label^="Groq"]');
        assert.equal(await panel.locator('p, small').count(),0);
        await page.getByRole('button',{name:'Gemini · Kết quả chính',exact:true}).click();
        await page.evaluate(()=>{window.referenceStatus='FAILED';window.referenceInfo={errorCode:'GROQ_JSON_GENERATION_FAILED',completedParts:[1,2,3]};});
        await page.getByRole('button',{name:'Groq · Tham khảo',exact:true}).click();
        await page.getByText('Groq · Bài viết không thể chấm xong do AI trả về kết quả chưa hợp lệ sau các lần thử lại.',{exact:true}).waitFor();
        assert.equal(await page.getByRole('progressbar').getAttribute('aria-valuenow'),'67');
        assert.equal(await panel.getByText('GROQ_JSON_GENERATION_FAILED',{exact:true}).count(),0);
        await page.evaluate(()=>{window.referenceInfo={};});
      }
      await page.getByRole('button',{name:'Gemini · Kết quả chính',exact:true}).click();
      assert.equal(await page.getByRole('progressbar').getAttribute('aria-valuenow'),'100');
      await page.evaluate(()=>{window.referenceStatus='COMPLETED';});
      await page.getByRole('button',{name:'Groq · Tham khảo',exact:true}).click();
      await page.getByRole('region',{name:/Groq/}).waitFor();
      await page.waitForFunction(()=>document.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')==='100');
      assert.equal(await layout.getAttribute('class'),classBefore);
      assert.equal(await layout.evaluate(element=>element.getBoundingClientRect().width),widthBefore);
      if(skill==='speaking') assert.equal(await page.locator('svg[viewBox="0 0 100 100"]').count(),4);
      await page.getByRole('button',{name:skill==='writing'?'Xem kết quả chi tiết':'Xem kết quả chi tiết',exact:true}).click();
      await page.getByRole('button',{name:'Groq · Tham khảo',exact:true}).waitFor();
      assert.equal(await page.getByRole('button',{name:'Groq · Tham khảo',exact:true}).getAttribute('aria-pressed'),'true');
      if(skill==='writing') {
        await page.getByRole('button',{name:'Phần 2',exact:true}).click();
        await page.getByText('Nhận xét Groq cho Part 2.',{exact:true}).waitFor();
        assert.equal(await page.getByRole('heading',{name:'AI feedback',exact:true}).count(),1);
        await page.getByRole('button',{name:'Bản sửa gợi ý',exact:true}).click();
        await page.getByText('Yesterday I went to the club.',{exact:true}).waitFor();
      } else {
        await page.getByText('What do you enjoy?',{exact:true}).waitFor();
        assert.equal(await page.getByRole('button',{name:/^(Part|Phần) 4$/}).count(),1);
      }
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      assert.deepEqual(errors,[]);await page.close();
    }
  } finally {await browser.close();}
});

test('Speaking retains Gemini progress across model changes and reload, and freezes while waiting for retry', async () => {
  const {script,css}=await bundle();
  const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'msedge'}:{})});
  try {
    const page=await browser.newPage(), errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/*',route=>route.request().url()==='http://writing-ui.test/'?route.fulfill({contentType:'text/html',body:'<html><body><div id="root"></div></body></html>'}):route.abort());
    const mount=async()=>{
      await page.evaluate(()=>{
        window.writingRoute='/speaking/result?attemptId=speaking&part=1';
        window.referenceStatus='PROCESSING';
      });
      await page.addStyleTag({content:css}); await page.addScriptTag({content:script});
      await page.getByRole('progressbar').waitFor();
    };
    await page.goto('http://writing-ui.test/');
    await page.evaluate(()=>sessionStorage.setItem('aptimate.assessment-progress:anonymous:speaking:gemini:0',JSON.stringify({value:52,at:Date.now()})));
    await mount();
    assert.ok(Number(await page.getByRole('progressbar').getAttribute('aria-valuenow'))>=52);
    await page.getByRole('button',{name:'Groq · Tham khảo',exact:true}).click();
    await page.locator('section[aria-label^="Groq"]').waitFor();
    await page.getByRole('button',{name:'Gemini · Kết quả chính',exact:true}).click();
    await page.locator('section[aria-label^="Gemini"]').waitFor();
    assert.ok(Number(await page.getByRole('progressbar').getAttribute('aria-valuenow'))>=52);
    await page.reload(); await mount();
    assert.ok(Number(await page.getByRole('progressbar').getAttribute('aria-valuenow'))>=52);
    await page.evaluate(()=>{
      window.speakingSummary.gradingStatus='QUEUED';
      window.speakingSummary.assessment={enabled:true,errorCode:'GEMINI_HTTP_503',nextRetryAt:new Date(Date.now()+120000).toISOString()};
    });
    await page.getByRole('button',{name:'Kiểm tra lại',exact:true}).click();
    await page.getByText(/Thử lại sau khoảng/).waitFor();
    const value=await page.getByRole('progressbar').getAttribute('aria-valuenow');
    await page.waitForTimeout(1100);
    assert.equal(await page.getByRole('progressbar').getAttribute('aria-valuenow'),value);
    assert.deepEqual(errors,[]);
  } finally {await browser.close();}
});

test('Writing pages show saved feedback with null scores, preserve answers and fit mobile', async () => {
  const { script, css } = await bundle();
  const browser = await chromium.launch({
    headless: true,
    ...(process.platform === 'win32' ? { channel: 'msedge' } : {}),
  });
  try {
    for (const width of [1280, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 850 } }),
        errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.route('**/*', (route) =>
        route.request().url() === 'http://writing-ui.test/'
          ? route.fulfill({
              contentType: 'text/html',
              body: '<html><head><style>body{margin:0;font-family:Arial}*{box-sizing:border-box}</style></head><body><div id="root"></div></body></html>',
            })
          : route.abort(),
      );
      await page.goto('http://writing-ui.test/');
      await page.addStyleTag({ content: css });
      await page.addScriptTag({ content: script });
      await page.getByRole('heading', { name: 'Đánh giá chung của AI' }).waitFor();
      assert.equal(await page.getByText('B1', { exact: true }).count(), 1);
      assert.equal(await page.getByRole('link',{name:'Quay lại',exact:true}).getAttribute('href'),'/writing/tests');
      assert.equal(await page.getByText('Cần chú ý thì động từ.', {exact:true}).count(),0);
      assert.equal(await page.getByRole('progressbar').getAttribute('aria-valuenow'),'100');
      assert.equal(await page.getByText('0/0', { exact: true }).count(), 0);
      await page.getByRole('button', { name: 'Xem kết quả chi tiết' }).click();
      await page.getByRole('button', { name: 'Phần 2', exact: true }).click();
      assert.equal(await page.getByRole('link',{name:'Quay lại',exact:true}).getAttribute('href'),'/writing/result?attemptId=test-writing');
      await page.getByRole('heading', { name: 'AI feedback' }).waitFor();
      assert.equal(await page.getByText('Cần chú ý thì động từ.', {exact:true}).count(),1);
      const questionFeedback = page.locator('details').filter({has:page.getByRole('heading',{name:'AI feedback'})});
      assert.equal(await questionFeedback.getAttribute('open'),null);
      assert.equal(await page.getByText('Bạn diễn đạt rõ hoạt động nhưng cần sửa thì động từ.',{exact:true}).isVisible(),false);
      await questionFeedback.locator(':scope > summary').click();
      assert.equal(await questionFeedback.getAttribute('open'),'');
      assert.equal(await page.getByText('Bạn diễn đạt rõ hoạt động nhưng cần sửa thì động từ.',{exact:true}).isVisible(),true);
      await questionFeedback.locator(':scope > summary').click();
      assert.equal(await questionFeedback.getAttribute('open'),null);

      assert.ok(await page.getByText('Yesterday I go to the club.', { exact: true }).count());
      await page.getByRole('button', { name: 'Bản sửa gợi ý', exact: true }).click();
      assert.equal(await page.getByText('Yesterday I went to the club.', { exact: true }).count(), 1);
      assert.equal(await page.getByRole('heading', { name: 'AI feedback' }).count(), 0);
      await page.getByRole('button', { name: 'Bài tham khảo', exact: true }).click();
      assert.equal(await page.getByText('Yesterday I visited a friend.', { exact: true }).count(), 1);
      assert.equal(await page.getByRole('heading', { name: 'AI feedback' }).count(), 0);
      await page.getByRole('button', { name: 'Bài làm của bạn', exact: true }).click();
      assert.equal(await questionFeedback.getAttribute('open'),null);
      await questionFeedback.locator(':scope > summary').click();
      assert.equal(await page.getByText('Yesterday I go to the club.', { exact: true }).count(), 2);
      assert.equal(await page.getByRole('heading', { name: 'AI feedback' }).count(), 1);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.deepEqual(errors, []);
      await page.close();
    }
    for (const width of [1280, 390]) {
      for (const options of [
        { practice: true, assisted: true, part: false },
        { practice: true, assisted: true, part: true },
        { practice: true, assisted: false, part: false },
        { practice: false, assisted: true, part: false },
      ]) {
        const page = await browser.newPage({
          viewport: { width, height: 850 },
        });
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.route('**/*', (route) =>
          route.request().url() === 'http://writing-ui.test/'
            ? route.fulfill({
                contentType: 'text/html',
                body: '<html><body><div id="root"></div></body></html>',
              })
            : route.abort(),
        );
        await page.goto('http://writing-ui.test/');
        await page.evaluate((options) => {
          window.writingOptions = options;
          window.writingRoute = `/writing/result-detail?attemptId=test-writing&part=part2${options.practice ? '&practice=true' : ''}`;
        }, options);
        await page.addStyleTag({ content: css });
        await page.addScriptTag({ content: script });
        await page.getByRole('heading', { name: 'AI feedback' }).waitFor();
        assert.equal(
          await page
            .getByText('Bạn đã xem bài tham khảo hoặc gợi ý trong lần luyện tập này.', { exact: true })
            .count(),
          options.practice && options.assisted ? 1 : 0,
        );
        assert.equal(await page.getByText('Ngôn ngữ nhận xét: Tiếng Việt', { exact: true }).count(), 1);
        await page.getByRole('button', { name: 'Bài tham khảo', exact: true }).click();
        assert.equal(
          await page
            .getByText('Bạn đã xem bài tham khảo hoặc gợi ý trong lần luyện tập này.', { exact: true })
            .count(),
          options.practice && options.assisted ? 1 : 0,
        );
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        assert.deepEqual(errors, []);
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
});


test('Writing and Speaking show estimated progress while grading on summary and detail, including mobile and dark mode', async () => {
  const { script, css } = await bundle();
  const browser = await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'msedge'}:{})});
  try {
    for (const route of ['/writing/result','/writing/result-detail','/speaking/result','/speaking/detail-result']) {
      for (const width of [1280,390]) {
        const page=await browser.newPage({viewport:{width,height:850}}), errors=[];
        page.on('pageerror', e=>errors.push(e.message));
        await page.route('**/*',r=>r.request().url()==='http://writing-ui.test/'?r.fulfill({contentType:'text/html',body:'<html data-theme="dark"><head><style>body{margin:0;font-family:Arial}*{box-sizing:border-box}</style></head><body><div id="root"></div></body></html>'}):r.abort());
        await page.goto('http://writing-ui.test/');
        await page.evaluate(route=>{window.writingRoute=route+'?attemptId='+(route.includes('speaking')?'speaking':'test-writing')+'&part=part2';window.writingOptions={status:'PROCESSING'};},route);
        await page.addStyleTag({content:css}); await page.addScriptTag({content:script});
        const progress=page.getByRole('progressbar'); await progress.waitFor();
        assert.ok(Number(await progress.getAttribute('aria-valuenow'))<100);
        assert.ok(await page.getByText(/Tiến độ ước lượng/).count());
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,route+' width='+width);
        if (width===390 && route==='/writing/result') await page.screenshot({path:process.env.TEMP+'/aptimate-writing-progress.png',fullPage:true});
        if (route==='/writing/result') {
          await page.evaluate(()=>{window.writingSummary.gradingStatus='COMPLETED';window.writingSummary.result.method='AI';window.writingSummary.result.writing={scope:'FULL_SKILL',feedbackLocale:'vi',cefr:{level:'B1',rationale:'Có thể diễn đạt các ý quen thuộc.',limitations:[]},summary:{overallComment:'Bạn có nội dung rõ ràng.',partSummaries:[],priorities:[]}};});
          await page.getByRole('button',{name:'Kiểm tra lại',exact:true}).click();
          await page.getByRole('heading',{name:'Đánh giá chung của AI'}).waitFor();
          assert.equal(await progress.getAttribute('aria-valuenow'),'100');
          if(width===390) await page.screenshot({path:process.env.TEMP+'/aptimate-writing-summary.png',fullPage:true});
        }
        assert.deepEqual(errors,[]);await page.close();
      }
    }
  } finally { await browser.close(); }
});


test('Speaking Part hides legacy CEFR while full skill retains its band in both languages and viewport sizes', async () => {
  const { script, css } = await bundle();
  const browser = await chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: 'msedge' } : {}) });
  try {
    for (const route of ['/speaking/result', '/speaking/detail-result']) {
      for (const scope of ['PART', 'FULL_SKILL']) {
        for (const language of ['vi', 'en']) {
          for (const width of [1280, 390]) {
            const page = await browser.newPage({ viewport: { width, height: 850 } });
            const errors = [];
            page.on('pageerror', error => errors.push(error.message));
            await page.route('**/*', request => request.request().url() === 'http://writing-ui.test/'
              ? request.fulfill({ contentType: 'text/html', body: '<html><head><style>body{margin:0;font-family:Arial}*{box-sizing:border-box}</style></head><body><div id="root"></div></body></html>' })
              : request.abort());
            await page.goto('http://writing-ui.test/');
            await page.evaluate(({ route, scope, language }) => {
              window.writingRoute = route + '?attemptId=speaking&practice=true';
              window.speakingOptions = { scope, language };
            }, { route, scope, language });
            await page.addStyleTag({ content: css });
            await page.addScriptTag({ content: script });
            if (scope === 'PART') {
              await page.getByText(language === 'vi' ? 'Đánh giá Speaking theo Part' : 'Speaking Part assessment', { exact: true }).waitFor();
              assert.doesNotMatch(await page.locator('body').innerText(), /B2|Legacy B2/);
              await page.getByText(language === 'vi'
                ? 'Bài luyện một Part không đủ để ước lượng CEFR toàn kỹ năng Speaking. Điểm /50 chỉ dùng luyện tập nội bộ.'
                : 'A single Part cannot establish an overall Speaking CEFR level. The /50 score is for practice only.', { exact: true }).waitFor();
            } else {
              await page.getByText('B2', { exact: true }).waitFor();
              assert.equal(await page.getByText('Legacy B2 rationale', { exact: true }).count(), 1);
            }
            if (route === '/speaking/result') {
              assert.match(await page.locator('body').innerText(), /37[.,]50/);
              assert.equal(await page.locator('svg circle').count(), 8);
            }
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false,
              [route, scope, language, width].join(' '));
            assert.deepEqual(errors, []);
            await page.close();
          }
        }
      }
    }
  } finally { await browser.close(); }
});
