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
i18n.changeLanguage('vi');
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
  window.writingSummary.purpose=options.practice?'PRACTICE':'EXAM';
  window.writingSummary.result.assistance={revealedKeys:options.assisted?['p2:q1']:[]};
  if(options.part){window.writingSummary.scope='PART';window.writingSummary.partNumber=2;
    window.writingSummary.result.writing.scope='PART';window.writingSummary.result.writing.cefr.level=null;}
}
createRoot(document.getElementById('root')).render(<MemoryRouter initialEntries={[window.writingRoute||'/writing/result?attemptId=test-writing']}>
<Routes><Route path='/writing/result' element={<Summary/>}/><Route path='/writing/result-detail' element={<Detail/>}/></Routes></MemoryRouter>);
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
          builder.onResolve({ filter: /(?:testAttemptsApi|practiceAttemptsApi)(?:\.js)?$/ }, () => ({
            path: 'attempt-api',
            namespace: 'writing-fixture',
          }));
          builder.onLoad({ filter: /.*/, namespace: 'writing-fixture' }, () => ({
            contents: `
        const api={result:async()=>{window.writingCalls++;return structuredClone(window.writingSummary)},partResult:async()=>structuredClone(window.writingDetail)};
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
      assert.equal(await page.getByText('0/0', { exact: true }).count(), 0);
      await page.getByRole('button', { name: 'Xem kết quả chi tiết' }).click();
      await page.getByRole('button', { name: 'Part 2', exact: true }).click();
      await page.getByRole('heading', { name: 'Đánh giá câu trả lời' }).waitFor();
      assert.ok(await page.getByText('Yesterday I go to the club.', { exact: true }).count());
      await page.getByRole('button', { name: 'Bản sửa gợi ý', exact: true }).click();
      assert.equal(await page.getByText('Yesterday I went to the club.', { exact: true }).count(), 1);
      await page.getByRole('button', { name: 'Bài làm của bạn', exact: true }).click();
      assert.equal(await page.getByText('Yesterday I go to the club.', { exact: true }).count(), 2);
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
        await page.getByRole('heading', { name: 'Đánh giá câu trả lời' }).waitFor();
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
