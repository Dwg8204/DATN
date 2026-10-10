import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
const { chromium } = process.env.READING_LAYOUT_PLAYWRIGHT
  ? createRequire(import.meta.url)(process.env.READING_LAYOUT_PLAYWRIGHT) : await import('playwright');

// Render the real exam components with an isolated attempt, never a live account/DB.
const root = fileURLToPath(new URL('..', import.meta.url));
const fixture = `
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ReadingAttemptPage from './src/features/module-reading/pages/ReadingAttemptPage.jsx';
import TestLayout from './src/components/layout/TestLayout.jsx';
import { TestAttemptContext } from './src/features/test-attempts/context/testAttemptContextStore.js';
const questions = Array.from({length:5}, (_,i) => ({ key:'p1:q'+(i+1), position:i+1,
 options:['happy','on','bring','our','join'].map((text,j) => ({id:'o'+j,text})) }));
const paper = { title:'Reading · Tests · Full Test', mode:'full', parts:{1:{
 passage:'Hi Alex, I am [1] to invite you to our club meeting. It takes place [2] Saturday. Please [3] a notebook. We will talk about [4] new project. I hope you can [5] us.', questions }} };
function App() {
 const [answers,setAnswers] = useState({});
 const value = { attemptId:'layout-test', paper, answers, isPractice:false, saveStatus:'saved',
  setAnswer:(key,answer)=>setAnswers(previous=>({...previous,[key]:answer})),
  flush:async()=>{}, submit:async()=>null, approveNavigation:()=>{} };
 window.layoutAnswers = answers;
 return <MemoryRouter initialEntries={['/reading/test/part1?attemptId=layout-test']}>
  <TestAttemptContext.Provider value={value}><Routes>
   <Route element={<TestLayout headerProps={{controlledTimer:true,timeRemaining:'34:36'}}/>}>
    <Route path='/reading/test/:part' element={<ReadingAttemptPage/>}/>
   </Route>
  </Routes></TestAttemptContext.Provider>
 </MemoryRouter>;
}
createRoot(document.getElementById('root')).render(<App/>);
`;

test('Part 1 exam fits its footer to the viewport on desktop/mobile and retains answer selection', async () => {
  const bundle = await build({ stdin: { contents: fixture, resolveDir: root, loader: 'jsx' },
    bundle: true, write: false, outfile: 'reading-layout.js', jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"', 'import.meta.env': '{}' } });
  const script = bundle.outputFiles.find(file => file.path.endsWith('.js')).text;
  const css = bundle.outputFiles.find(file => file.path.endsWith('.css')).text;
  const browser = await chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: 'msedge' } : {}) });
  try {
    for (const viewport of [{ width: 1280, height: 720 }, { width: 390, height: 844 }, { width: 1280, height: 520 }]) {
      const page = await browser.newPage({ viewport });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/*', route => route.request().url() === 'http://reading-layout.test/'
        ? route.fulfill({ contentType: 'text/html', body: '<html><head><style>body{margin:0;font-family:Arial,sans-serif}*{box-sizing:border-box}</style></head><body><div id="root"></div></body></html>' }) : route.abort());
      await page.goto('http://reading-layout.test/');
      await page.addStyleTag({ content: css });
      await page.addScriptTag({ content: script });
      await page.getByRole('heading', { name: 'Reading passage' }).waitFor({ timeout: 10000 })
        .catch(error => { throw new Error(errors.join('\n') || error.message); });
      const gap = page.getByRole('button', { name: 'Answer for gap 3', exact: true });
      await gap.click();
      await page.getByRole('option', { name: 'bring', exact: true }).click();
      assert.equal(await gap.textContent(), 'bring');
      assert.equal(await page.evaluate(() => window.layoutAnswers['p1:q3'].optionId), 'o2');
      const layout = await page.evaluate(() => {
        const passage = document.querySelector('[class*="passage"] [class*="passage"]');
        const card = document.querySelector('[class*="passageWrap"]');
        const button = document.querySelector('[aria-label="Answer for gap 3"]');
        const footer = document.querySelector('[class*="testFooter"]').getBoundingClientRect();
        return { font: parseFloat(getComputedStyle(passage).fontSize), buttonHeight: button.getBoundingClientRect().height,
          cardWidth: card.getBoundingClientRect().width, overflow: document.documentElement.scrollWidth > innerWidth,
          footerBottom: footer.bottom, viewportHeight: innerHeight };
      });
      assert.equal(layout.overflow, false);
      assert.ok(layout.font >= 16);
      assert.ok(layout.buttonHeight >= 40);
      assert.ok(Math.abs(layout.footerBottom - layout.viewportHeight) <= 1, 'no empty strip below the footer');
      if (viewport.width > 700) assert.ok(layout.cardWidth >= 1000);
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      const bottomGap = await page.evaluate(() => {
        const footer = document.querySelector('[class*="testFooter"]').getBoundingClientRect();
        return document.documentElement.scrollHeight - (footer.bottom + scrollY);
      });
      assert.ok(Math.abs(bottomGap) <= 1, 'scrolling to the end exposes no trailing page space');
      assert.deepEqual(errors, []);
      if (process.env.READING_LAYOUT_SCREENSHOTS) {
        await page.screenshot({ path: `${process.env.READING_LAYOUT_SCREENSHOTS}/reading-part1-${viewport.width}-${viewport.height}.png`, fullPage: true });
      }
      await page.close();
    }
  } finally { await browser.close(); }
});
