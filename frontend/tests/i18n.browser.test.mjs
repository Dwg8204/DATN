import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';

test('switching language updates UI, admin filters and progress without resetting English answers', async () => {
  const result = await build({ stdin: { resolveDir: fileURLToPath(new URL('..', import.meta.url)), loader: 'jsx', contents: `
import React,{useState} from 'react'; import {createRoot} from 'react-dom/client';
import i18n from './src/i18n/index.js'; import {useUiTranslation} from './src/i18n/useUiTranslation.jsx';
import AnswerSelect from './src/components/common/AnswerSelect.jsx';
import DashboardPeriodFilter from './src/features/admin/dashboard/components/DashboardPeriodFilter.jsx';
import AssessmentProgress from './src/features/test-attempts/components/AssessmentProgress.jsx';
import CustomInput from './src/components/common/CustomInput.jsx';
i18n.changeLanguage('en');window.changeUiLanguage=lang=>i18n.changeLanguage(lang);
function App(){const ui=useUiTranslation(),[answer,setAnswer]=useState('I close the door.'),[choice,setChoice]=useState('close'),[period,setPeriod]=useState('this-year');return <main>
<label>English learner answer<input aria-label='English learner answer' value={answer} onChange={e=>setAnswer(e.target.value)}/></label>
<button>{ui('Close')}</button>
<AnswerSelect value={choice} onChange={e=>setChoice(e.target.value)} options={[{value:'close',label:'Close'},{value:'open',label:'Open'}]} />
<CustomInput label='Password' placeholder='New password' error='Password must contain at least 8 characters.' />
<DashboardPeriodFilter value={period} onChange={setPeriod}/>
<AssessmentProgress data={{component:'WRITING',gradingStatus:'PROCESSING',result:{method:'PENDING_AI'}}}/>
</main>};createRoot(document.getElementById('root')).render(<App/>);` },
    bundle: true, write: false, outfile: 'i18n.js', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' },
  });
  const browser = await chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: 'msedge' } : {}) });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 850 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => route.request().url() === 'http://i18n-ui.test/' ? route.fulfill({ contentType: 'text/html', body: '<html><body><div id="root"></div></body></html>' }) : route.abort());
    await page.goto('http://i18n-ui.test/');
    await page.addStyleTag({ content: result.outputFiles.find(file => file.path.endsWith('.css')).text });
    await page.addScriptTag({ content: result.outputFiles.find(file => file.path.endsWith('.js')).text });
    await page.getByRole('button', { name: 'This year', exact: true }).waitFor();
    await page.getByLabel('English learner answer').fill('Yesterday I went to school.');
    await page.evaluate(() => window.changeUiLanguage('vi'));
    await page.getByRole('button', { name: 'Năm nay', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'This year', exact: true }).count(), 0);
    assert.equal(await page.getByRole('button', { name: 'Đóng', exact: true }).count(), 1);
    assert.equal(await page.getByText('Close', { exact: true }).count(), 1);
    assert.equal(await page.getByPlaceholder('Mật khẩu mới').count(), 1);
    assert.equal(await page.getByText('Mật khẩu phải có ít nhất 8 ký tự.', { exact: true }).count(), 1);
    assert.equal(await page.getByRole('progressbar').getAttribute('aria-label'), 'AI đang chấm bài');
    assert.equal(await page.getByLabel('English learner answer').inputValue(), 'Yesterday I went to school.');
    await page.evaluate(() => window.changeUiLanguage('en'));
    await page.getByRole('button', { name: 'This year', exact: true }).waitFor();
    assert.equal(await page.getByRole('progressbar').getAttribute('aria-label'), 'AI assessment in progress');
    assert.equal(await page.getByLabel('English learner answer').inputValue(), 'Yesterday I went to school.');
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});

test('exam options and reading content that collide with UI translations stay unchanged across languages', async () => {
  const result = await build({ stdin: { resolveDir: fileURLToPath(new URL('..', import.meta.url)), loader: 'jsx', contents: `
import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
import i18n from './src/i18n/index.js';import {useUiTranslation} from './src/i18n/useUiTranslation.jsx';
import MultipleChoice from './src/components/common/MultipleChoice.jsx';
import AnswerSelect from './src/components/common/AnswerSelect.jsx';
import RichTextContent from './src/components/common/RichTextContent.jsx';
import {AnswerRadioGroup} from './src/features/admin/shared-test-builder/AnswerOptionsEditor.jsx';
import ReadingAnswerPreview from './src/features/module-reading/components/ReadingAnswerPreview.jsx';
i18n.changeLanguage('vi');window.changeExamLanguage=lang=>i18n.changeLanguage(lang);
const options=['Close','Next','Reading'];
const reading={part4:{title:'Reading',headings:[{id:'h1',text:'Next',correctParagraph:'p1'}],paragraphs:[{id:'p1',label:'Close',content:'<p>Next</p>'}]}};
function App(){const ui=useUiTranslation(),[choice,setChoice]=useState(0),[select,setSelect]=useState('Close'),[admin,setAdmin]=useState('Next'),[answer,setAnswer]=useState('');return <main>
<button data-testid='ui-label'>{ui('Next')}</button>
<section data-testid='radio'><MultipleChoice name='answer' options={options} value={choice} onChange={setChoice}/></section>
<section data-testid='select'><AnswerSelect options={options} value={select} onChange={e=>setSelect(e.target.value)}/></section>
<section data-testid='admin'><AnswerRadioGroup options={options} value={admin} onChange={setAdmin}/></section>
<section data-testid='reading'><ReadingAnswerPreview test={reading} part={4}/></section>
<section data-testid='prompt'><RichTextContent value='<p>Close</p><p>Next</p>'/></section>
<textarea aria-label='Written answer' value={answer} onChange={e=>setAnswer(e.target.value)}/>
</main>};createRoot(document.getElementById('root')).render(<App/>);` }, bundle: true, write: false, outfile: 'exam-i18n.js', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' } });
  const browser = await chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: 'msedge' } : {}) });
  try {
    const page = await browser.newPage();
    await page.route('**/*', route => route.fulfill({contentType:'text/html',body:'<html><body><div id="root"></div></body></html>'}));
    await page.goto('http://exam-i18n.test/');
    await page.addStyleTag({content:result.outputFiles.find(file=>file.path.endsWith('.css')).text});
    await page.addScriptTag({content:result.outputFiles.find(file=>file.path.endsWith('.js')).text});
    await page.getByTestId('radio').getByRole('radio',{name:'Close',exact:true}).check();
    await page.getByTestId('radio').getByText('Next',{exact:true}).click();
    await page.getByLabel('Written answer').fill('Close the door.');
    for (const language of ['vi','en','vi']) {
      await page.evaluate(lang=>window.changeExamLanguage(lang),language);
      await page.getByTestId('ui-label').getByText(language==='vi'?'Tiếp':'Next',{exact:true}).waitFor();
      assert.deepEqual(await page.getByTestId('radio').locator('label').allTextContents(),['Close','Next','Reading']);
      assert.equal(await page.getByTestId('radio').getByRole('radio',{name:'Next',exact:true}).isChecked(),true);
      assert.equal(await page.getByTestId('admin').getByRole('radio').nth(1).isChecked(),true);
      assert.equal(await page.getByTestId('reading').getByRole('heading',{name:'Reading',exact:true}).count(),1);
      assert.equal(await page.getByTestId('reading').getByRole('heading',{name:'23. Close',exact:true}).count(),1);
      assert.equal(await page.getByTestId('prompt').textContent(),'CloseNext');
      assert.equal(await page.getByLabel('Written answer').inputValue(),'Close the door.');
      await page.getByTestId('select').getByRole('button').click();
      assert.deepEqual(await page.getByRole('option').allTextContents(),['Close','Next','Reading']);
      await page.getByRole('option',{name:'Reading',exact:true}).click();
      assert.equal(await page.getByTestId('select').getByRole('button').textContent(),'Reading');
    }
  } finally { await browser.close(); }
});
